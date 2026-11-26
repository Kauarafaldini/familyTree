// ============================================================================
// SERVER.JS - Servidor Node.js / Express & MongoDB Atlas para FamilyTree
// Suporte Multi-Usuário (Login, Cadastro, Troca de Senha no 1º Acesso)
// e Isolamento Completo de Histórias por Usuário.
// ============================================================================

try {
  require("dotenv").config();
} catch (_) {}
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { MongoClient } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 8000;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://kauarsamtos0_db_user:vM8h0GYWkFoy4H6L@familytree.lhbb3e2.mongodb.net/familytree?retryWrites=true&w=majority";
const DB_NAME = process.env.MONGO_DB_NAME || "familytree";

// Chave de assinatura de tokens (determinística se AUTH_SECRET não estiver no ambiente, sobrevivendo a restarts no Render)
const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  crypto.createHash("sha256").update(`familytree_royal_codex_secret_v1::${MONGODB_URI}`).digest("hex");

// Dados da autora principal para portabilidade automática da história existente
const SEED_MARIA_USER = {
  id: "user_maria_zafalon",
  name: "Maria Zafalon",
  email: "dudazafalonferreira@gmail.com",
  initialPassword: process.env.INITIAL_ADMIN_PASSWORD || "123456"
};

// Configurações do Express
app.use(cors());
app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ extended: true, limit: "150mb" }));

// Servir arquivos estáticos do frontend (bloqueando acesso direto a arquivos sensíveis de servidor)
app.use((req, res, next) => {
  const lower = req.path.toLowerCase();
  if (
    lower === "/server.js" ||
    lower === "/.env" ||
    lower === "/render.yaml" ||
    lower === "/codice.json" ||
    lower === "/codice.json.gz"
  ) {
    return res.status(403).json({ status: "error", message: "Acesso restrito." });
  }
  next();
});

app.use(
  express.static(path.join(__dirname), {
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html") || filePath.endsWith(".js") || filePath.endsWith(".css")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    }
  })
);

// ----------------------------------------------------------------------------
// Utilitários Criptográficos (Scrypt + JWT HMAC-SHA256 nativos, zero RAM extra)
// ----------------------------------------------------------------------------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== "string" || !storedHash.includes(":")) return false;
  const [salt, keyHex] = storedHash.split(":");
  if (!salt || !keyHex) return false;
  try {
    const keyBuf = Buffer.from(keyHex, "hex");
    const derivedBuf = crypto.scryptSync(String(password), salt, 64);
    if (keyBuf.length !== derivedBuf.length) return false;
    return crypto.timingSafeEqual(keyBuf, derivedBuf);
  } catch (e) {
    return false;
  }
}

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str) {
  let base64 = String(str).replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) base64 += "=";
  return Buffer.from(base64, "base64").toString("utf8");
}

function signAuthToken(user) {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: user._id || user.id,
      email: user.email,
      pwdVer: Number(user.passwordVersion) || 1,
      iat: nowSec,
      exp: nowSec + 60 * 60 * 24 * 30 // 30 dias
    })
  );
  const signature = base64UrlEncode(
    crypto.createHmac("sha256", AUTH_SECRET).update(`${header}.${payload}`).digest()
  );
  return `${header}.${payload}.${signature}`;
}

function verifyAuthToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.trim().split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expectedSig = base64UrlEncode(
    crypto.createHmac("sha256", AUTH_SECRET).update(`${header}.${payload}`).digest()
  );
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const decoded = JSON.parse(base64UrlDecode(payload));
    const nowSec = Math.floor(Date.now() / 1000);
    if (!decoded.sub || (decoded.exp && decoded.exp < nowSec)) {
      return null;
    }
    return decoded;
  } catch (e) {
    return null;
  }
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user._id || user.id,
    name: user.name,
    email: user.email,
    mustChangePassword: Boolean(user.mustChangePassword),
    createdAt: user.createdAt || null
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeId(worldId) {
  const clean = String(worldId || "").replace(/[^a-zA-Z0-9_\-]/g, "");
  return clean || "";
}

function generateUniqueWorldId() {
  return `world_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

// Estrutura padrão para nova história
function getDefaultCleanData(worldId, title = "Crônicas & Linhagens", currentYear = 1000) {
  return {
    meta: {
      worldId,
      worldTitle: title,
      currentYear: Number(currentYear) || 1000,
      treeColorMode: "linhagem",
      selectedHouseFilter: "all",
      selectedRaceFilter: "all"
    },
    customPresets: {
      socialRanks: [],
      genders: [],
      races: [],
      creationCategories: [],
      powerLevels: [],
      timelineCategories: [],
      timelineImportances: [],
      territoryTypes: [],
      settlementTypes: [],
      successionLaws: []
    },
    races: [
      "Humano",
      "Elfo",
      "Anão",
      "Orc",
      "Bruxo / Feiticeiro",
      "Sereia / Tritão",
      "Draconiano",
      "Vampiro",
      "Fada / Silfo"
    ],
    houses: [],
    territories: [],
    mapStrokes: [],
    settlements: [],
    houseEvents: [],
    timelineMilestones: [],
    characters: [],
    creations: [],
    creationCategories: [
      "Magia",
      "Poção",
      "Encantamento",
      "Artefato / Relíquia",
      "Maldição",
      "Ritual",
      "Erva / Ingrediente",
      "Criatura Mítica (Bestiário)"
    ],
    auditLogs: []
  };
}

function stripInternalWorldFields(doc) {
  if (!doc || typeof doc !== "object") return doc;
  const clean = { ...doc };
  delete clean._id;
  delete clean.world_id;
  delete clean.ownerId;
  delete clean.owner_id;
  delete clean.updated_at;
  return clean;
}

// ----------------------------------------------------------------------------
// Conexão com MongoDB Atlas & Migração Automática de Esquema e Dados
// ----------------------------------------------------------------------------
let client = null;
let db = null;
let isConnecting = false;
let schemaMigrated = false;

async function ensureDatabaseSchemaAndMigration(database) {
  if (schemaMigrated) return;
  try {
    // 1. Criação de Índices Compatíveis com Multi-Usuário
    await database.collection("users").createIndex({ email: 1 }, { unique: true }).catch(() => {});
    await database.collection("worlds_index").createIndex({ ownerId: 1, updatedAt: -1 }).catch(() => {});
    await database.collection("world_state").createIndex({ ownerId: 1 }).catch(() => {});

    const structuredCollections = [
      "worlds",
      "characters",
      "houses",
      "territories",
      "settlements",
      "timeline_events",
      "creations",
      "map_strokes",
      "audit_logs"
    ];
    for (const colName of structuredCollections) {
      await database.collection(colName).createIndex({ owner_id: 1, world_id: 1 }).catch(() => {});
    }

    // 2. Garantir a existência do usuário Maria Zafalon
    const usersColl = database.collection("users");
    const targetEmail = normalizeEmail(SEED_MARIA_USER.email);
    let mariaUser = await usersColl.findOne({ email: targetEmail });
    const nowIso = new Date().toISOString();

    if (!mariaUser) {
      mariaUser = {
        _id: SEED_MARIA_USER.id,
        id: SEED_MARIA_USER.id,
        name: SEED_MARIA_USER.name,
        email: targetEmail,
        passwordHash: hashPassword(SEED_MARIA_USER.initialPassword),
        passwordVersion: 1,
        mustChangePassword: true, // Obriga troca de senha no primeiro login
        createdAt: nowIso,
        updatedAt: nowIso,
        lastLoginAt: null
      };
      await usersColl.insertOne(mariaUser);
      console.log(`[Auth Migration] Usuária criada: ${mariaUser.name} (${mariaUser.email}) com troca de senha no 1º login.`);
    }

    const mariaId = mariaUser._id || mariaUser.id;
    const stateColl = database.collection("world_state");
    const indexColl = database.collection("worlds_index");

    // 3. Portar todas as histórias existentes no banco (sem ownerId) para Maria Zafalon
    const unownedFilter = {
      $or: [{ ownerId: { $exists: false } }, { ownerId: null }, { ownerId: "" }]
    };

    const unownedStates = await stateColl.find(unownedFilter).toArray();
    for (const st of unownedStates) {
      const wId = st._id;
      const title = (st.meta?.worldTitle || "Crônicas & Linhagens").trim();
      const currentYear = Number(st.meta?.currentYear) || 1000;
      const charsCount = Array.isArray(st.characters) ? st.characters.length : 0;
      const housesCount = Array.isArray(st.houses) ? st.houses.length : 0;

      await stateColl.updateOne(
        { _id: wId },
        { $set: { ownerId: mariaId, updated_at: st.updated_at || nowIso } }
      );

      await indexColl.updateOne(
        { _id: wId },
        {
          $set: {
            id: wId,
            ownerId: mariaId,
            title,
            currentYear,
            charactersCount: charsCount,
            housesCount: housesCount,
            updatedAt: st.updated_at || nowIso
          }
        },
        { upsert: true }
      );
      console.log(`[Auth Migration] História "${title}" (${wId}) portada para ${mariaUser.name}.`);
    }

    // Também portar eventuais registros órfãos em worlds_index
    const orphanIndexRes = await indexColl.updateMany(unownedFilter, {
      $set: { ownerId: mariaId }
    });
    if (orphanIndexRes.modifiedCount > 0) {
      console.log(`[Auth Migration] ${orphanIndexRes.modifiedCount} índice(s) de histórias vinculados a ${mariaUser.name}.`);
    }

    // Caso o banco esteja completamente vazio ou só tenha um main_world zerado sem personagens/territórios,
    // verifica se há backup local em codice.json para garantir que a história da autora esteja lá
    const mariaStates = await stateColl.find({ ownerId: mariaId }).toArray();
    const hasPopulatedStory = mariaStates.some(
      (s) =>
        (Array.isArray(s.characters) && s.characters.length > 0) ||
        (Array.isArray(s.houses) && s.houses.length > 0) ||
        (Array.isArray(s.territories) && s.territories.length > 0) ||
        (Array.isArray(s.timelineMilestones) && s.timelineMilestones.length > 0)
    );

    if (!hasPopulatedStory) {
      const codicePath = path.join(__dirname, "codice.json");
      if (fs.existsSync(codicePath)) {
        try {
          const rawCodice = JSON.parse(fs.readFileSync(codicePath, "utf8"));
          if (rawCodice && typeof rawCodice === "object") {
            const wId = "main_world";
            rawCodice.meta = rawCodice.meta || {};
            rawCodice.meta.worldId = wId;
            const title = (rawCodice.meta.worldTitle || "Crônicas & Linhagens").trim();
            const currentYear = Number(rawCodice.meta.currentYear) || 1000;
            const charsCount = Array.isArray(rawCodice.characters) ? rawCodice.characters.length : 0;
            const housesCount = Array.isArray(rawCodice.houses) ? rawCodice.houses.length : 0;

            await stateColl.replaceOne(
              { _id: wId },
              { ...stripInternalWorldFields(rawCodice), ownerId: mariaId, updated_at: nowIso },
              { upsert: true }
            );
            await indexColl.updateOne(
              { _id: wId },
              {
                $set: {
                  id: wId,
                  ownerId: mariaId,
                  title,
                  currentYear,
                  charactersCount: charsCount,
                  housesCount: housesCount,
                  updatedAt: nowIso
                }
              },
              { upsert: true }
            );
            await syncIndividualCollections(database, wId, mariaId, rawCodice);
            console.log(`[Auth Migration] História base do codice.json (${charsCount} personagens) importada para ${mariaUser.name}.`);
          }
        } catch (seedErr) {
          console.warn("[Auth Migration] Aviso ao ler codice.json de fallback:", seedErr.message);
        }
      } else if (mariaStates.length === 0) {
        // Se nem codice.json existir, garante ao menos um mundo inicial para Maria
        const wId = "main_world";
        const cleanData = getDefaultCleanData(wId);
        await stateColl.replaceOne(
          { _id: wId },
          { ...cleanData, ownerId: mariaId, updated_at: nowIso },
          { upsert: true }
        );
        await indexColl.updateOne(
          { _id: wId },
          {
            $set: {
              id: wId,
              ownerId: mariaId,
              title: cleanData.meta.worldTitle,
              currentYear: cleanData.meta.currentYear,
              charactersCount: 0,
              housesCount: 0,
              updatedAt: nowIso
            }
          },
          { upsert: true }
        );
      }
    }

    // 4. Vincular registros legados nas coleções individuais ao owner_id de Maria Zafalon
    const unownedSubFilter = {
      $or: [{ owner_id: { $exists: false } }, { owner_id: null }, { owner_id: "" }]
    };
    for (const colName of structuredCollections) {
      await database
        .collection(colName)
        .updateMany(unownedSubFilter, { $set: { owner_id: mariaId } })
        .catch(() => {});
    }

    schemaMigrated = true;
  } catch (err) {
    console.error("[Auth Migration] Erro ao verificar/migrar esquema:", err.message);
  }
}

async function getDb() {
  if (db) {
    if (!schemaMigrated) await ensureDatabaseSchemaAndMigration(db);
    return db;
  }
  if (isConnecting) {
    while (isConnecting) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (db) {
      if (!schemaMigrated) await ensureDatabaseSchemaAndMigration(db);
      return db;
    }
  }

  isConnecting = true;
  try {
    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 1,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
      retryWrites: true
    });
    await client.connect();
    db = client.db(DB_NAME);
    console.log(`[MongoDB] Conectado com sucesso ao Atlas (DB: ${DB_NAME})`);
    await ensureDatabaseSchemaAndMigration(db);
    return db;
  } catch (err) {
    console.error("[MongoDB] Erro ao conectar ao cluster Atlas:", err.message);
    throw err;
  } finally {
    isConnecting = false;
  }
}

// ----------------------------------------------------------------------------
// Autenticação de Requisições
// ----------------------------------------------------------------------------
function extractTokenFromRequest(req) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  if (req.query?.auth_token) return String(req.query.auth_token).trim();
  if (req.body?.auth_token) return String(req.body.auth_token).trim();
  return null;
}

async function authenticateRequest(req, database) {
  const token = extractTokenFromRequest(req);
  if (!token) return null;
  const decoded = verifyAuthToken(token);
  if (!decoded || !decoded.sub) return null;

  const user = await database.collection("users").findOne({ _id: decoded.sub });
  if (!user) return null;

  const currentVer = Number(user.passwordVersion) || 1;
  const tokenVer = Number(decoded.pwdVer) || 1;
  if (currentVer !== tokenVer) return null;

  return user;
}

// Garante que o usuário tenha ao menos 1 história própria e retorna a lista ordenada
async function ensureUserWorldsList(database, userId) {
  const indexColl = database.collection("worlds_index");
  let worlds = await indexColl.find({ ownerId: userId }).sort({ updatedAt: -1 }).toArray();

  if (!worlds || worlds.length === 0) {
    const newWorldId = generateUniqueWorldId();
    const nowIso = new Date().toISOString();
    const cleanData = getDefaultCleanData(newWorldId, "Crônicas & Linhagens", 1000);

    await database.collection("world_state").replaceOne(
      { _id: newWorldId },
      { ...cleanData, ownerId: userId, updated_at: nowIso },
      { upsert: true }
    );

    const newIndex = {
      _id: newWorldId,
      id: newWorldId,
      ownerId: userId,
      title: cleanData.meta.worldTitle,
      currentYear: cleanData.meta.currentYear,
      charactersCount: 0,
      housesCount: 0,
      updatedAt: nowIso
    };
    await indexColl.replaceOne({ _id: newWorldId }, newIndex, { upsert: true });
    worlds = [newIndex];
  }

  return worlds;
}

// ----------------------------------------------------------------------------
// Sincronização Assíncrona de Coleções Estruturadas (com owner_id)
// ----------------------------------------------------------------------------
async function syncIndividualCollections(database, worldId, ownerId, data) {
  if (!data || typeof data !== "object") return;
  try {
    const meta = data.meta || {};
    const chars = Array.isArray(data.characters) ? data.characters : [];
    const houses = Array.isArray(data.houses) ? data.houses : [];
    const territories = Array.isArray(data.territories) ? data.territories : [];
    const settlements = Array.isArray(data.settlements) ? data.settlements : [];
    const timelineEvents = Array.isArray(data.timelineMilestones) ? data.timelineMilestones : [];
    const creations = Array.isArray(data.creations) ? data.creations : [];

    // 1. Coleção 'worlds'
    await database.collection("worlds").updateOne(
      { _id: worldId },
      {
        $set: {
          id: worldId,
          owner_id: ownerId,
          title: meta.worldTitle || "Crônicas & Linhagens",
          currentYear: Number(meta.currentYear) || 1000,
          charactersCount: chars.length,
          housesCount: houses.length,
          territoriesCount: territories.length,
          settlementsCount: settlements.length,
          updatedAt: new Date().toISOString()
        }
      },
      { upsert: true }
    );

    // 2. Coleção 'characters'
    await database.collection("characters").deleteMany({ world_id: worldId });
    if (chars.length > 0) {
      const docs = chars.map((c) => ({
        ...c,
        _id: `${worldId}_${c.id || Math.random().toString(36).substring(2)}`,
        world_id: worldId,
        owner_id: ownerId
      }));
      await database.collection("characters").insertMany(docs, { ordered: false });
    }

    // 3. Coleção 'houses'
    await database.collection("houses").deleteMany({ world_id: worldId });
    if (houses.length > 0) {
      const docs = houses.map((h) => ({
        ...h,
        _id: `${worldId}_${h.id || Math.random().toString(36).substring(2)}`,
        world_id: worldId,
        owner_id: ownerId
      }));
      await database.collection("houses").insertMany(docs, { ordered: false });
    }

    // 4. Coleção 'territories'
    await database.collection("territories").deleteMany({ world_id: worldId });
    if (territories.length > 0) {
      const docs = territories.map((t) => ({
        ...t,
        _id: `${worldId}_${t.id || Math.random().toString(36).substring(2)}`,
        world_id: worldId,
        owner_id: ownerId
      }));
      await database.collection("territories").insertMany(docs, { ordered: false });
    }

    // 5. Coleção 'settlements'
    await database.collection("settlements").deleteMany({ world_id: worldId });
    if (settlements.length > 0) {
      const docs = settlements.map((s) => ({
        ...s,
        _id: `${worldId}_${s.id || Math.random().toString(36).substring(2)}`,
        world_id: worldId,
        owner_id: ownerId
      }));
      await database.collection("settlements").insertMany(docs, { ordered: false });
    }

    // 6. Coleção 'timeline_events'
    await database.collection("timeline_events").deleteMany({ world_id: worldId });
    if (timelineEvents.length > 0) {
      const docs = timelineEvents.map((ev) => ({
        ...ev,
        _id: `${worldId}_${ev.id || Math.random().toString(36).substring(2)}`,
        world_id: worldId,
        owner_id: ownerId
      }));
      await database.collection("timeline_events").insertMany(docs, { ordered: false });
    }

    // 7. Coleção 'creations' (Grimório)
    await database.collection("creations").deleteMany({ world_id: worldId });
    if (creations.length > 0) {
      const docs = creations.map((cr) => ({
        ...cr,
        _id: `${worldId}_${cr.id || Math.random().toString(36).substring(2)}`,
        world_id: worldId,
        owner_id: ownerId
      }));
      await database.collection("creations").insertMany(docs, { ordered: false });
    }
  } catch (err) {
    console.warn("[MongoDB] Aviso na sincronização de coleções individuais:", err.message);
  }
}

// ----------------------------------------------------------------------------
// Handler Central de Ações da API (Compatível com GET/POST e ?action=...)
// ----------------------------------------------------------------------------
async function handleApiRequest(req, res) {
  const method = req.method;
  let action = String(req.query.action || req.body?.action || "").trim();
  if (!action && method === "POST") action = "save";

  // Informações da API na raiz
  if (!action) {
    return res.json({
      status: "success",
      message: "API Node.js de Árvore Genealógica (Autenticação Multi-Usuário & MongoDB Atlas)",
      endpoints: [
        "GET ?action=ping",
        "POST ?action=register",
        "POST ?action=login",
        "GET ?action=me",
        "POST ?action=change_password",
        "GET ?action=list_worlds",
        "GET ?action=load&world_id=X",
        "POST ?action=save&world_id=X",
        "POST ?action=create_world",
        "POST ?action=delete_world&world_id=X",
        "POST ?action=rename_world&world_id=X",
        "POST ?action=reset&world_id=X",
        "GET ?action=stats&world_id=X"
      ]
    });
  }

  try {
    const database = await getDb();

    // ========================================================================
    // 1. ROTAS PÚBLICAS (PING, CADASTRO, LOGIN)
    // ========================================================================
    if (action === "ping" || action === "test") {
      let isOk = false;
      try {
        const pingRes = await database.command({ ping: 1 });
        isOk = pingRes && pingRes.ok === 1;
      } catch (e) {
        isOk = false;
      }
      return res.json({
        status: isOk ? "success" : "error",
        connected: isOk,
        driver: `Node.js ${process.version} (mongodb driver)`,
        database: DB_NAME,
        message: isOk
          ? "Conectado ao MongoDB Atlas com sucesso!"
          : "Falha ao responder ao ping no MongoDB."
      });
    }

    if (action === "register") {
      if (method !== "POST") {
        return res.status(405).json({ status: "error", message: "Use POST para realizar o cadastro." });
      }

      const name = String(req.body?.name || "").trim();
      const email = normalizeEmail(req.body?.email);
      const password = String(req.body?.password || "");

      if (name.length < 2) {
        return res.status(400).json({ status: "error", message: "Informe seu nome (mínimo de 2 caracteres)." });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ status: "error", message: "Informe um endereço de e-mail válido." });
      }
      if (password.length < 6) {
        return res.status(400).json({ status: "error", message: "A senha deve ter pelo menos 6 caracteres." });
      }

      const usersColl = database.collection("users");
      const existingUser = await usersColl.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          status: "error",
          message: "Este e-mail já possui cadastro. Faça login para acessar suas histórias."
        });
      }

      const nowIso = new Date().toISOString();
      const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const newUser = {
        _id: userId,
        id: userId,
        name,
        email,
        passwordHash: hashPassword(password),
        passwordVersion: 1,
        mustChangePassword: false,
        createdAt: nowIso,
        updatedAt: nowIso,
        lastLoginAt: nowIso
      };

      await usersColl.insertOne(newUser);
      const worlds = await ensureUserWorldsList(database, userId);
      const token = signAuthToken(newUser);

      return res.status(201).json({
        status: "success",
        message: "Conta criada com sucesso!",
        token,
        user: sanitizeUser(newUser),
        worlds,
        activeWorldId: worlds[0]?.id || null
      });
    }

    if (action === "login") {
      if (method !== "POST") {
        return res.status(405).json({ status: "error", message: "Use POST para fazer login." });
      }

      const email = normalizeEmail(req.body?.email);
      const password = String(req.body?.password || "");

      if (!email || !password) {
        return res.status(400).json({ status: "error", message: "Informe seu e-mail e sua senha." });
      }

      const usersColl = database.collection("users");
      const user = await usersColl.findOne({ email });
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ status: "error", message: "E-mail ou senha incorretos." });
      }

      const nowIso = new Date().toISOString();
      await usersColl.updateOne({ _id: user._id }, { $set: { lastLoginAt: nowIso } });

      const worlds = await ensureUserWorldsList(database, user._id);
      const token = signAuthToken(user);

      return res.json({
        status: "success",
        message: user.mustChangePassword
          ? "Primeiro acesso detectado. Por favor, defina sua nova senha."
          : "Login realizado com sucesso!",
        token,
        user: sanitizeUser(user),
        worlds,
        activeWorldId: worlds[0]?.id || null
      });
    }

    // ========================================================================
    // 2. ROTAS AUTENTICADAS (EXIGEM TOKEN VÁLIDO DO USUÁRIO)
    // ========================================================================
    const user = await authenticateRequest(req, database);
    if (!user) {
      return res.status(401).json({
        status: "error",
        code: "UNAUTHORIZED",
        message: "Sessão não autenticada ou expirada. Faça login para acessar seu códice."
      });
    }

    const userId = user._id || user.id;

    if (action === "me") {
      const worlds = await ensureUserWorldsList(database, userId);
      return res.json({
        status: "success",
        user: sanitizeUser(user),
        worlds,
        activeWorldId: worlds[0]?.id || null
      });
    }

    if (action === "change_password") {
      if (method !== "POST") {
        return res.status(405).json({ status: "error", message: "Use POST para alterar a senha." });
      }

      const currentPassword = String(req.body?.currentPassword || "");
      const newPassword = String(req.body?.newPassword || "");

      if (newPassword.length < 6) {
        return res.status(400).json({
          status: "error",
          message: "A nova senha deve ter pelo menos 6 caracteres."
        });
      }

      if (user.mustChangePassword) {
        // No primeiro login obrigatório, impede manter a mesma senha provisória (ex: 123456)
        if (verifyPassword(newPassword, user.passwordHash)) {
          return res.status(400).json({
            status: "error",
            message: "Por segurança, escolha uma nova senha diferente da senha provisória inicial."
          });
        }
      } else {
        // Em trocas posteriores voluntárias, exige confirmar a senha atual
        if (!currentPassword || !verifyPassword(currentPassword, user.passwordHash)) {
          return res.status(400).json({
            status: "error",
            message: "A senha atual informada está incorreta."
          });
        }
        if (verifyPassword(newPassword, user.passwordHash)) {
          return res.status(400).json({
            status: "error",
            message: "A nova senha deve ser diferente da senha atual."
          });
        }
      }

      const nowIso = new Date().toISOString();
      const nextPwdVer = (Number(user.passwordVersion) || 1) + 1;
      const newHash = hashPassword(newPassword);

      await database.collection("users").updateOne(
        { _id: userId },
        {
          $set: {
            passwordHash: newHash,
            mustChangePassword: false,
            passwordVersion: nextPwdVer,
            updatedAt: nowIso
          }
        }
      );

      const updatedUser = {
        ...user,
        passwordHash: newHash,
        mustChangePassword: false,
        passwordVersion: nextPwdVer,
        updatedAt: nowIso
      };

      const newToken = signAuthToken(updatedUser);
      const worlds = await ensureUserWorldsList(database, userId);

      return res.json({
        status: "success",
        message: "Sua nova senha foi salva com sucesso!",
        token: newToken,
        user: sanitizeUser(updatedUser),
        worlds,
        activeWorldId: worlds[0]?.id || null
      });
    }

    // Bloqueia acesso aos dados do mundo enquanto o usuário não concluir a troca de senha do 1º acesso
    if (user.mustChangePassword) {
      return res.status(403).json({
        status: "error",
        code: "MUST_CHANGE_PASSWORD",
        message: "Você precisa alterar sua senha provisória de primeiro acesso antes de abrir o códice."
      });
    }

    const requestedWorldId = sanitizeId(req.query.world_id || req.body?.world_id || "");

    // ========================================================================
    // 3. OPERAÇÕES DE MUNDOS / HISTÓRIAS ISOLADAS POR USUÁRIO
    // ========================================================================
    switch (action) {
      case "list_worlds": {
        const worlds = await ensureUserWorldsList(database, userId);
        return res.json({ status: "success", worlds });
      }

      case "load": {
        const userWorlds = await ensureUserWorldsList(database, userId);
        let targetWorldId = requestedWorldId;

        // Verifica se o worldId solicitado realmente pertence a este usuário
        const ownsRequested = targetWorldId && userWorlds.some((w) => (w.id || w._id) === targetWorldId);
        if (!ownsRequested) {
          targetWorldId = userWorlds[0].id || userWorlds[0]._id;
        }

        const stateColl = database.collection("world_state");
        let rawDoc = await stateColl.findOne({ _id: targetWorldId, ownerId: userId });

        if (!rawDoc) {
          const worldMeta = userWorlds.find((w) => (w.id || w._id) === targetWorldId);
          const cleanData = getDefaultCleanData(
            targetWorldId,
            worldMeta?.title || "Crônicas & Linhagens",
            worldMeta?.currentYear || 1000
          );
          const nowIso = new Date().toISOString();
          await stateColl.replaceOne(
            { _id: targetWorldId },
            { ...cleanData, ownerId: userId, updated_at: nowIso },
            { upsert: true }
          );
          rawDoc = cleanData;
        }

        const doc = stripInternalWorldFields(rawDoc);
        if (!doc.meta) doc.meta = {};
        doc.meta.worldId = targetWorldId;

        // Validação de ETag por usuário + mundo
        const jsonStr = JSON.stringify(doc);
        const etag = `W/"${userId}-${targetWorldId}-${crypto.createHash("md5").update(jsonStr).digest("hex")}"`;
        res.setHeader("ETag", etag);
        res.setHeader("Cache-Control", "private, no-cache");

        const ifNoneMatch = req.headers["if-none-match"];
        if (ifNoneMatch && ifNoneMatch.trim() === etag) {
          return res.status(304).end();
        }

        return res.json({
          status: "success",
          connected: true,
          world_id: targetWorldId,
          worlds: userWorlds,
          data: doc
        });
      }

      case "save": {
        if (method !== "POST") {
          return res.status(405).json({ status: "error", message: "Use POST para salvar." });
        }

        if (!requestedWorldId) {
          return res.status(400).json({ status: "error", message: "world_id é obrigatório." });
        }

        // Verifica propriedade para impedir sobrescrita entre usuários
        const existingIndex = await database.collection("worlds_index").findOne({ _id: requestedWorldId });
        const existingState = existingIndex
          ? null
          : await database.collection("world_state").findOne({ _id: requestedWorldId }, { projection: { ownerId: 1 } });
        const existingOwner = existingIndex?.ownerId || existingState?.ownerId;

        if (existingOwner && existingOwner !== userId) {
          return res.status(403).json({
            status: "error",
            message: "Acesso negado: esta história pertence a outro usuário."
          });
        }

        let payload = req.body;
        if (!payload || typeof payload !== "object") {
          return res.status(400).json({ status: "error", message: "Payload inválido." });
        }

        if (!payload.meta && payload.data && typeof payload.data === "object") {
          payload = payload.data;
        }

        const cleanPayload = stripInternalWorldFields(payload);
        if (!cleanPayload.meta) cleanPayload.meta = {};
        cleanPayload.meta.worldId = requestedWorldId;

        const title = (cleanPayload.meta?.worldTitle || "Mundo Sem Título").trim();
        const year = Number(cleanPayload.meta?.currentYear) || 1000;
        const charsCount = Array.isArray(cleanPayload.characters) ? cleanPayload.characters.length : 0;
        const housesCount = Array.isArray(cleanPayload.houses) ? cleanPayload.houses.length : 0;

        // Mantém no máximo 15 snapshots completos nos logs de auditoria
        if (Array.isArray(cleanPayload.auditLogs)) {
          let countWithSnapshot = 0;
          for (let i = 0; i < cleanPayload.auditLogs.length; i++) {
            const log = cleanPayload.auditLogs[i];
            if (log && log.snapshot) {
              countWithSnapshot++;
              if (countWithSnapshot > 15) {
                log.snapshot = null;
                log.canRevert = false;
              }
            }
          }
        }

        const nowIso = new Date().toISOString();

        // Atualização atômica preservando ownerId
        await database.collection("world_state").replaceOne(
          { _id: requestedWorldId },
          { ...cleanPayload, ownerId: userId, updated_at: nowIso },
          { upsert: true }
        );

        await database.collection("worlds_index").updateOne(
          { _id: requestedWorldId },
          {
            $set: {
              id: requestedWorldId,
              ownerId: userId,
              title,
              currentYear: year,
              charactersCount: charsCount,
              housesCount: housesCount,
              updatedAt: nowIso
            }
          },
          { upsert: true }
        );

        syncIndividualCollections(database, requestedWorldId, userId, cleanPayload).catch((err) =>
          console.warn("[Sync Error]", err.message)
        );

        return res.json({
          status: "success",
          world_id: requestedWorldId,
          charactersCount: charsCount,
          housesCount: housesCount,
          savedAt: nowIso
        });
      }

      case "create_world": {
        if (method !== "POST") {
          return res.status(405).json({ status: "error", message: "Use POST para criar história." });
        }

        const title = String(req.body.title || req.query.title || "Nova História").trim();
        const year = Number(req.body.currentYear || req.query.year) || 1000;
        const newWorldId = generateUniqueWorldId();
        const nowIso = new Date().toISOString();
        const cleanData = getDefaultCleanData(newWorldId, title, year);

        await database.collection("world_state").replaceOne(
          { _id: newWorldId },
          { ...cleanData, ownerId: userId, updated_at: nowIso },
          { upsert: true }
        );

        await database.collection("worlds_index").replaceOne(
          { _id: newWorldId },
          {
            _id: newWorldId,
            id: newWorldId,
            ownerId: userId,
            title,
            currentYear: year,
            charactersCount: 0,
            housesCount: 0,
            updatedAt: nowIso
          },
          { upsert: true }
        );

        const allWorlds = await database
          .collection("worlds_index")
          .find({ ownerId: userId })
          .sort({ updatedAt: -1 })
          .toArray();

        return res.json({
          status: "success",
          message: "Nova história criada com sucesso!",
          world: { id: newWorldId, title, data: cleanData },
          worlds: allWorlds
        });
      }

      case "delete_world": {
        if (method !== "POST" && method !== "DELETE") {
          return res.status(405).json({ status: "error", message: "Use POST ou DELETE." });
        }

        const worldsColl = database.collection("worlds_index");
        const targetDoc = await worldsColl.findOne({ _id: requestedWorldId, ownerId: userId });
        if (!targetDoc) {
          return res.status(404).json({
            status: "error",
            message: "História não encontrada ou sem permissão para exclusão."
          });
        }

        const totalWorlds = await worldsColl.countDocuments({ ownerId: userId });
        if (totalWorlds <= 1) {
          return res.status(400).json({
            status: "error",
            message: "Não é permitido excluir a única história existente na sua conta."
          });
        }

        await database.collection("world_state").deleteOne({ _id: requestedWorldId, ownerId: userId });
        await worldsColl.deleteOne({ _id: requestedWorldId, ownerId: userId });

        const colls = ["characters", "houses", "territories", "settlements", "timeline_events", "creations", "worlds"];
        for (const c of colls) {
          await database.collection(c).deleteMany({ world_id: requestedWorldId, owner_id: userId }).catch(() => {});
        }

        const remainingWorlds = await worldsColl.find({ ownerId: userId }).sort({ updatedAt: -1 }).toArray();
        return res.json({
          status: "success",
          message: "História excluída com sucesso.",
          worlds: remainingWorlds
        });
      }

      case "rename_world": {
        if (method !== "POST") {
          return res.status(405).json({ status: "error", message: "Use POST." });
        }

        const newTitle = String(req.body.title || req.query.title || "").trim();
        if (!newTitle) {
          return res.status(400).json({ status: "error", message: "O título não pode ser vazio." });
        }

        const targetDoc = await database.collection("worlds_index").findOne({ _id: requestedWorldId, ownerId: userId });
        if (!targetDoc) {
          return res.status(404).json({ status: "error", message: "História não encontrada." });
        }

        const nowIso = new Date().toISOString();
        await database.collection("world_state").updateOne(
          { _id: requestedWorldId, ownerId: userId },
          { $set: { "meta.worldTitle": newTitle, updated_at: nowIso } }
        );

        await database.collection("worlds_index").updateOne(
          { _id: requestedWorldId, ownerId: userId },
          { $set: { title: newTitle, updatedAt: nowIso } }
        );

        const worlds = await database
          .collection("worlds_index")
          .find({ ownerId: userId })
          .sort({ updatedAt: -1 })
          .toArray();

        return res.json({
          status: "success",
          message: "História renomeada com sucesso.",
          worlds
        });
      }

      case "reset": {
        if (method !== "POST") {
          return res.status(405).json({ status: "error", message: "Use POST." });
        }

        const targetDoc = await database.collection("worlds_index").findOne({ _id: requestedWorldId, ownerId: userId });
        if (!targetDoc) {
          return res.status(404).json({ status: "error", message: "História não encontrada." });
        }

        const nowIso = new Date().toISOString();
        const cleanData = getDefaultCleanData(requestedWorldId, targetDoc.title || "Crônicas & Linhagens", 1000);
        await database.collection("world_state").replaceOne(
          { _id: requestedWorldId, ownerId: userId },
          { ...cleanData, ownerId: userId, updated_at: nowIso },
          { upsert: true }
        );

        await database.collection("worlds_index").updateOne(
          { _id: requestedWorldId, ownerId: userId },
          {
            $set: {
              title: cleanData.meta.worldTitle,
              currentYear: cleanData.meta.currentYear,
              charactersCount: 0,
              housesCount: 0,
              updatedAt: nowIso
            }
          }
        );

        await syncIndividualCollections(database, requestedWorldId, userId, cleanData);

        return res.json({
          status: "success",
          message: "Todos os dados desta história foram restaurados em branco no MongoDB.",
          data: cleanData
        });
      }

      case "stats": {
        const worlds = await database.collection("worlds_index").find({ ownerId: userId }).toArray();
        const current = worlds.find((w) => (w.id || w._id) === requestedWorldId) || worlds[0];
        const mem = process.memoryUsage();

        return res.json({
          status: "success",
          stats: {
            database: DB_NAME,
            userEmail: user.email,
            activeWorldId: current?.id || requestedWorldId,
            worldsCount: worlds.length,
            charactersCount: current?.charactersCount || 0,
            housesCount: current?.housesCount || 0,
            nodeVersion: process.version,
            memoryRssMB: Math.round(mem.rss / 1024 / 1024),
            memoryHeapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
            serverTime: new Date().toISOString()
          }
        });
      }

      default:
        return res.status(400).json({ status: "error", message: `Ação desconhecida: ${action}` });
    }
  } catch (err) {
    console.error("[API Error]", err);
    return res.status(500).json({
      status: "error",
      message: "Erro na comunicação com o servidor: " + err.message
    });
  }
}

// Rotas: atende tanto /api quanto /api.php para retrocompatibilidade total
app.all("/api", handleApiRequest);
app.all("/api.php", handleApiRequest);

// Rota raiz opcional para verificar status
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), time: new Date().toISOString() });
});

// Qualquer outra rota não correspondente serve o index.html (SPA)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Inicialização do servidor
app.listen(PORT, "0.0.0.0", async () => {
  console.log("========================================================");
  console.log(` Servidor FamilyTree (Node.js Multi-Usuário) em execução!`);
  console.log(` Porta: http://localhost:${PORT}`);
  console.log(` MongoDB: ${MONGODB_URI.replace(/:[^:]*@/, ":****@")}`);
  console.log("========================================================");

  try {
    await getDb();
    console.log("[MongoDB] Pronto para processar requisições autenticadas.");
  } catch (e) {
    console.warn("[MongoDB] Inicializado em modo sob demanda:", e.message);
  }
});
