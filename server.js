// ============================================================================
// SERVER.JS - Servidor Node.js / Express & MongoDB Atlas para FamilyTree
// Substitui a API PHP por uma arquitetura leve, moderna e de baixo consumo de RAM.
// ============================================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const { MongoClient } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 8000;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://kauarsamtos0_db_user:vM8h0GYWkFoy4H6L@familytree.lhbb3e2.mongodb.net/familytree?retryWrites=true&w=majority";
const DB_NAME = process.env.MONGO_DB_NAME || "familytree";

// Configurações do Express
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Servir arquivos estáticos do frontend
app.use(
  express.static(path.join(__dirname), {
    etag: true,
    lastModified: true,
    maxAge: process.env.NODE_ENV === "production" ? "1h" : 0
  })
);

// ----------------------------------------------------------------------------
// Conexão com MongoDB Atlas (Singleton com Reconexão Automática)
// ----------------------------------------------------------------------------
let client = null;
let db = null;
let isConnecting = false;

async function getDb() {
  if (db) return db;
  if (isConnecting) {
    while (isConnecting) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (db) return db;
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
    return db;
  } catch (err) {
    console.error("[MongoDB] Erro ao conectar ao cluster Atlas:", err.message);
    throw err;
  } finally {
    isConnecting = false;
  }
}

// Utilitário de higienização de ID
function sanitizeId(worldId) {
  const clean = String(worldId || "").replace(/[^a-zA-Z0-9_\-]/g, "");
  return clean || "main_world";
}

// Estrutura padrão para nova história
function getDefaultCleanData(worldId = "main_world", title = "Crônicas & Linhagens", currentYear = 1000) {
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

// ----------------------------------------------------------------------------
// Sincronização Assíncrona de Coleções Estruturadas
// ----------------------------------------------------------------------------
async function syncIndividualCollections(database, worldId, data) {
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
        world_id: worldId
      }));
      await database.collection("characters").insertMany(docs, { ordered: false });
    }

    // 3. Coleção 'houses'
    await database.collection("houses").deleteMany({ world_id: worldId });
    if (houses.length > 0) {
      const docs = houses.map((h) => ({
        ...h,
        _id: `${worldId}_${h.id || Math.random().toString(36).substring(2)}`,
        world_id: worldId
      }));
      await database.collection("houses").insertMany(docs, { ordered: false });
    }

    // 4. Coleção 'territories'
    await database.collection("territories").deleteMany({ world_id: worldId });
    if (territories.length > 0) {
      const docs = territories.map((t) => ({
        ...t,
        _id: `${worldId}_${t.id || Math.random().toString(36).substring(2)}`,
        world_id: worldId
      }));
      await database.collection("territories").insertMany(docs, { ordered: false });
    }

    // 5. Coleção 'settlements'
    await database.collection("settlements").deleteMany({ world_id: worldId });
    if (settlements.length > 0) {
      const docs = settlements.map((s) => ({
        ...s,
        _id: `${worldId}_${s.id || Math.random().toString(36).substring(2)}`,
        world_id: worldId
      }));
      await database.collection("settlements").insertMany(docs, { ordered: false });
    }

    // 6. Coleção 'timeline_events'
    await database.collection("timeline_events").deleteMany({ world_id: worldId });
    if (timelineEvents.length > 0) {
      const docs = timelineEvents.map((ev) => ({
        ...ev,
        _id: `${worldId}_${ev.id || Math.random().toString(36).substring(2)}`,
        world_id: worldId
      }));
      await database.collection("timeline_events").insertMany(docs, { ordered: false });
    }

    // 7. Coleção 'creations' (Grimório)
    await database.collection("creations").deleteMany({ world_id: worldId });
    if (creations.length > 0) {
      const docs = creations.map((cr) => ({
        ...cr,
        _id: `${worldId}_${cr.id || Math.random().toString(36).substring(2)}`,
        world_id: worldId
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

  const worldId = sanitizeId(req.query.world_id || req.body?.world_id || "main_world");

  // Informações da API na raiz
  if (!action) {
    return res.json({
      status: "success",
      message: "API Node.js de Árvore Genealógica (MongoDB Atlas & Múltiplas Histórias)",
      endpoints: [
        "GET ?action=ping",
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

    switch (action) {
      case "ping":
      case "test": {
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

      case "list_worlds": {
        const worldsColl = database.collection("worlds_index");
        let worlds = await worldsColl.find({}).sort({ updatedAt: -1 }).toArray();

        if (!worlds || worlds.length === 0) {
          const defaultIndex = {
            _id: "main_world",
            id: "main_world",
            title: "Crônicas & Linhagens",
            currentYear: 1000,
            charactersCount: 0,
            housesCount: 0,
            updatedAt: new Date().toISOString()
          };
          await worldsColl.updateOne({ _id: "main_world" }, { $set: defaultIndex }, { upsert: true });
          worlds = [defaultIndex];
        }
        return res.json({ status: "success", worlds });
      }

      case "load": {
        const stateColl = database.collection("world_state");
        let doc = await stateColl.findOne(
          { _id: worldId },
          { projection: { _id: 0, world_id: 0, updated_at: 0 } }
        );

        if (!doc) {
          // Cria novo mundo padrão caso não exista
          const cleanData = getDefaultCleanData(worldId);
          await stateColl.updateOne(
            { _id: worldId },
            { $set: cleanData },
            { upsert: true }
          );
          await database.collection("worlds_index").updateOne(
            { _id: worldId },
            {
              $set: {
                id: worldId,
                title: cleanData.meta.worldTitle,
                currentYear: cleanData.meta.currentYear,
                charactersCount: 0,
                housesCount: 0,
                updatedAt: new Date().toISOString()
              }
            },
            { upsert: true }
          );
          doc = cleanData;
        }

        // Validação de ETag (HTTP 304 Not Modified)
        const jsonStr = JSON.stringify(doc);
        const etag = `W/"${worldId}-${crypto.createHash("md5").update(jsonStr).digest("hex")}"`;
        res.setHeader("ETag", etag);
        res.setHeader("Cache-Control", "private, no-cache");

        const ifNoneMatch = req.headers["if-none-match"];
        if (ifNoneMatch && ifNoneMatch.trim() === etag) {
          return res.status(304).end();
        }

        return res.json({
          status: "success",
          connected: true,
          world_id: worldId,
          data: doc
        });
      }

      case "save": {
        if (method !== "POST") {
          return res.status(405).json({ status: "error", message: "Use POST para salvar." });
        }

        let payload = req.body;
        if (!payload || typeof payload !== "object") {
          return res.status(400).json({ status: "error", message: "Payload inválido." });
        }

        // Suporte a payload envelopado em { data: {...} }
        if (!payload.meta && payload.data && typeof payload.data === "object") {
          payload = payload.data;
        }

        // Remove chaves reservadas
        delete payload._id;
        delete payload.world_id;
        delete payload.updated_at;

        const title = (payload.meta?.worldTitle || "Mundo Sem Título").trim();
        const year = Number(payload.meta?.currentYear) || 1000;
        const charsCount = Array.isArray(payload.characters) ? payload.characters.length : 0;
        const housesCount = Array.isArray(payload.houses) ? payload.houses.length : 0;

        // Atualização atômica no world_state
        await database.collection("world_state").replaceOne(
          { _id: worldId },
          payload,
          { upsert: true }
        );

        // Atualiza índice de mundos
        const nowIso = new Date().toISOString();
        await database.collection("worlds_index").updateOne(
          { _id: worldId },
          {
            $set: {
              id: worldId,
              title,
              currentYear: year,
              charactersCount: charsCount,
              housesCount: housesCount,
              updatedAt: nowIso
            }
          },
          { upsert: true }
        );

        // Sincroniza coleções individuais em segundo plano
        syncIndividualCollections(database, worldId, payload).catch((err) =>
          console.warn("[Sync Error]", err.message)
        );

        return res.json({
          status: "success",
          world_id: worldId,
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
        const newWorldId = `world_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const cleanData = getDefaultCleanData(newWorldId, title, year);

        await database.collection("world_state").updateOne(
          { _id: newWorldId },
          { $set: cleanData },
          { upsert: true }
        );

        await database.collection("worlds_index").updateOne(
          { _id: newWorldId },
          {
            $set: {
              id: newWorldId,
              title,
              currentYear: year,
              charactersCount: 0,
              housesCount: 0,
              updatedAt: new Date().toISOString()
            }
          },
          { upsert: true }
        );

        const allWorlds = await database.collection("worlds_index").find({}).sort({ updatedAt: -1 }).toArray();

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
        const totalWorlds = await worldsColl.countDocuments();
        if (totalWorlds <= 1) {
          return res.status(400).json({
            status: "error",
            message: "Não é permitido excluir a única história existente no códice."
          });
        }

        await database.collection("world_state").deleteOne({ _id: worldId });
        await worldsColl.deleteOne({ _id: worldId });

        // Exclui também das coleções individuais
        const colls = ["characters", "houses", "territories", "settlements", "timeline_events", "creations", "worlds"];
        for (const c of colls) {
          await database.collection(c).deleteMany({ world_id: worldId }).catch(() => {});
        }

        const remainingWorlds = await worldsColl.find({}).sort({ updatedAt: -1 }).toArray();
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

        await database.collection("world_state").updateOne(
          { _id: worldId },
          { $set: { "meta.worldTitle": newTitle } }
        );

        await database.collection("worlds_index").updateOne(
          { _id: worldId },
          { $set: { title: newTitle, updatedAt: new Date().toISOString() } }
        );

        const worlds = await database.collection("worlds_index").find({}).sort({ updatedAt: -1 }).toArray();
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

        const cleanData = getDefaultCleanData(worldId);
        await database.collection("world_state").replaceOne(
          { _id: worldId },
          cleanData,
          { upsert: true }
        );

        await database.collection("worlds_index").updateOne(
          { _id: worldId },
          {
            $set: {
              title: cleanData.meta.worldTitle,
              currentYear: cleanData.meta.currentYear,
              charactersCount: 0,
              housesCount: 0,
              updatedAt: new Date().toISOString()
            }
          },
          { upsert: true }
        );

        return res.json({
          status: "success",
          message: "Todos os dados deste mundo foram resetados no MongoDB.",
          data: cleanData
        });
      }

      case "stats": {
        const worlds = await database.collection("worlds_index").find({}).toArray();
        const current = worlds.find((w) => (w.id || w._id) === worldId);
        const mem = process.memoryUsage();

        return res.json({
          status: "success",
          stats: {
            database: DB_NAME,
            activeWorldId: worldId,
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
      message: "Erro na comunicação com o MongoDB: " + err.message
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
  console.log(` Servidor FamilyTree (Node.js) em execução!`);
  console.log(` Porta: http://localhost:${PORT}`);
  console.log(` MongoDB: ${MONGODB_URI.replace(/:[^:]*@/, ":****@")}`);
  console.log("========================================================");

  try {
    await getDb();
    console.log("[MongoDB] Pronto para processar requisições.");
  } catch (e) {
    console.warn("[MongoDB] Inicializado em modo sob demanda:", e.message);
  }
});
