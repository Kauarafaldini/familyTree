// ============================================================================
// MIGRATE-DB.JS - Revisão de Estrutura do MongoDB Atlas & Portabilidade
// Cria/verifica índices multi-usuário, registra Maria Zafalon (1º acesso)
// e porta integralmente as histórias atuais do banco para a conta dela.
// ============================================================================

try {
  require("dotenv").config();
} catch (_) {}
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://kauarsamtos0_db_user:vM8h0GYWkFoy4H6L@familytree.lhbb3e2.mongodb.net/familytree?retryWrites=true&w=majority";
const DB_NAME = process.env.MONGO_DB_NAME || "familytree";

const SEED_MARIA_USER = {
  id: "user_maria_zafalon",
  name: "Maria Zafalon",
  email: "dudazafalonferreira@gmail.com",
  initialPassword: process.env.INITIAL_ADMIN_PASSWORD || "123456"
};

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

async function runMigration() {
  console.log("==============================================================");
  console.log(" Revisão de Estrutura & Migração Multi-Usuário — MongoDB Atlas");
  console.log("==============================================================");

  const client = new MongoClient(MONGODB_URI, {
    connectTimeoutMS: 12000,
    serverSelectionTimeoutMS: 12000
  });

  try {
    await client.connect();
    const database = client.db(DB_NAME);
    console.log(`[1/5] Conectado com sucesso ao banco '${DB_NAME}'.`);

    // Listar coleções existentes e revisar índices
    const existingCols = await database.listCollections().toArray();
    console.log(`[2/5] Coleções atuais encontradas (${existingCols.length}): ${existingCols.map(c => c.name).join(", ") || "nenhuma"}`);

    // Garantir coleções e índices multi-usuário compatíveis
    await database.collection("users").createIndex({ email: 1 }, { unique: true });
    await database.collection("worlds_index").createIndex({ ownerId: 1, updatedAt: -1 });
    await database.collection("world_state").createIndex({ ownerId: 1 });

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
      await database.collection(colName).createIndex({ owner_id: 1, world_id: 1 });
    }
    console.log("[3/5] Índices de isolamento por usuário verificados/criados em todas as coleções.");

    // Criar ou verificar usuário Maria Zafalon
    const usersColl = database.collection("users");
    const targetEmail = SEED_MARIA_USER.email.toLowerCase().trim();
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
        mustChangePassword: true,
        createdAt: nowIso,
        updatedAt: nowIso,
        lastLoginAt: null
      };
      await usersColl.insertOne(mariaUser);
      console.log(`[4/5] Usuária criada: "${mariaUser.name}" <${mariaUser.email}> (Senha inicial: 123456 | Troca no 1º login: ATIVA).`);
    } else {
      console.log(`[4/5] Usuária já existente: "${mariaUser.name}" <${mariaUser.email}> (ID: ${mariaUser._id} | mustChangePassword: ${Boolean(mariaUser.mustChangePassword)}).`);
    }

    const mariaId = mariaUser._id || mariaUser.id;
    const stateColl = database.collection("world_state");
    const indexColl = database.collection("worlds_index");

    // Portar histórias sem ownerId para Maria Zafalon
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
      console.log(`  -> História portada: "${title}" (ID: ${wId} | ${charsCount} personagens, ${housesCount} casas) -> ${mariaUser.name}`);
    }

    await indexColl.updateMany(unownedFilter, { $set: { ownerId: mariaId } });

    // Se nenhuma história com dados existir no banco ainda, verifica fallback codice.json
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
        const rawCodice = JSON.parse(fs.readFileSync(codicePath, "utf8"));
        const wId = "main_world";
        rawCodice.meta = rawCodice.meta || {};
        rawCodice.meta.worldId = wId;
        const charsCount = Array.isArray(rawCodice.characters) ? rawCodice.characters.length : 0;
        const housesCount = Array.isArray(rawCodice.houses) ? rawCodice.houses.length : 0;

        await stateColl.replaceOne(
          { _id: wId },
          { ...rawCodice, ownerId: mariaId, updated_at: nowIso },
          { upsert: true }
        );
        await indexColl.updateOne(
          { _id: wId },
          {
            $set: {
              id: wId,
              ownerId: mariaId,
              title: rawCodice.meta.worldTitle || "Crônicas & Linhagens",
              currentYear: Number(rawCodice.meta.currentYear) || 1000,
              charactersCount: charsCount,
              housesCount: housesCount,
              updatedAt: nowIso
            }
          },
          { upsert: true }
        );
        console.log(`  -> História importada de codice.json (${charsCount} personagens) para ${mariaUser.name}.`);
      }
    }

    // Atualizar coleções estruturadas sem owner_id
    const unownedSubFilter = {
      $or: [{ owner_id: { $exists: false } }, { owner_id: null }, { owner_id: "" }]
    };
    for (const colName of structuredCollections) {
      const res = await database.collection(colName).updateMany(unownedSubFilter, { $set: { owner_id: mariaId } });
      if (res.modifiedCount > 0) {
        console.log(`  -> Coleção '${colName}': ${res.modifiedCount} documento(s) vinculados a ${mariaUser.name}.`);
      }
    }

    const finalWorlds = await indexColl.find({ ownerId: mariaId }).toArray();
    console.log(`[5/5] Migração concluída! Histórias vinculadas a ${mariaUser.name}: ${finalWorlds.length}`);
    finalWorlds.forEach(w => {
      console.log(`   • [${w.id}] "${w.title}" — ${w.charactersCount || 0} personagens, ${w.housesCount || 0} casas`);
    });
  } finally {
    await client.close();
  }
}

runMigration().catch((err) => {
  console.error("Erro na migração:", err);
  process.exit(1);
});
