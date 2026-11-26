// ============================================================================
// ENGINE.JS - Motor de Regras Genealógicas, Sucessão, Casamentos, Bastardos,
//             Detecção de Inconsistências e Histórico de Reversão
// ============================================================================

const BASE_STORAGE_KEY = "fantasy_family_tree_v1";

class WorldEngine {
  constructor() {
    this.currentWorldId = localStorage.getItem("current_world_id") || "main_world";
    this.worldsList = [];
    this.data = this.loadFromStorage();
    this.initDatabase();
  }

  getStorageKey(worldId = null) {
    const wId = worldId || this.currentWorldId || "main_world";
    return `${BASE_STORAGE_KEY}_${wId}`;
  }

  // Sanitiza o nome do personagem para exibir somente nome e sobrenome, sem cargos ou títulos
  cleanCharacterName(name) {
    if (!name || typeof name !== "string") return "";
    let clean = name.trim();
    clean = clean.replace(/\(nasc\.?\s*([^)]+)\)/i, "$1");
    clean = clean.replace(/\s*\([^)]*\)/g, "");
    clean = clean.replace(/^(Príncipe\/Rei|Príncipe\s+Herdeiro|Princesa\s+Herdeira|Rei|Rainha|Príncipe|Princesa|Lorde|Lord|Lady|Herdeiro|Herdeira|Cavaleiro|Guarda|Sor|Sir|Dom|Dona)\s+/i, "");
    clean = clean.replace(/\b([A-Za-zÀ-ÿ]+)\s+(I|II|III|IV|V|VI)\b/i, "$1");
    return clean.replace(/\s+/g, " ").trim();
  }

  loadFromStorage(targetWorldId = null) {
    const wId = targetWorldId || this.currentWorldId || "main_world";
    const storageKey = this.getStorageKey(wId);
    try {
      let saved = localStorage.getItem(storageKey);
      // Migração de cache anterior sem sufixo se for o mundo principal
      if (!saved && wId === "main_world") {
        saved = localStorage.getItem(BASE_STORAGE_KEY);
      }
      if (saved) {
        // Se o cache contiver dados mockados antigos da versão demonstrativa, descarta para iniciar com dados reais
        if (
          saved.includes("char_theron") ||
          saved.includes("house_valmont") ||
          saved.includes("house_ravencrest") ||
          saved.includes("char_aldric")
        ) {
          try {
            localStorage.removeItem(storageKey);
            localStorage.removeItem(BASE_STORAGE_KEY);
          } catch (e) {}
          const initialData = JSON.parse(JSON.stringify(DEFAULT_WORLD_DATA));
          initialData.meta.worldId = wId;
          this.ensureTerritoryPolygons(initialData.territories);
          return initialData;
        }

        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.characters) && Array.isArray(parsed.houses)) {
          let modified = false;

          if (!parsed.meta) {
            parsed.meta = { ...DEFAULT_WORLD_DATA.meta, worldId: wId };
            modified = true;
          }
          if (!parsed.meta.worldId) {
            parsed.meta.worldId = wId;
            modified = true;
          }

          if (!parsed.customPresets || typeof parsed.customPresets !== "object") {
            parsed.customPresets = {
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
            };
            modified = true;
          }

          if (!Array.isArray(parsed.races)) {
            parsed.races = Array.isArray(DEFAULT_WORLD_DATA.races) ? DEFAULT_WORLD_DATA.races.slice() : ["Humano", "Elfo", "Anão", "Orc"];
            modified = true;
          }

          if (!Array.isArray(parsed.creations)) {
            parsed.creations = Array.isArray(DEFAULT_WORLD_DATA.creations) ? DEFAULT_WORLD_DATA.creations.slice() : [];
            modified = true;
          }

          if (!Array.isArray(parsed.creationCategories)) {
            parsed.creationCategories = Array.isArray(DEFAULT_WORLD_DATA.creationCategories) ? DEFAULT_WORLD_DATA.creationCategories.slice() : ["Magia", "Poção", "Encantamento", "Artefato / Relíquia"];
            modified = true;
          }

          if (parsed.meta && !parsed.meta.selectedRaceFilter) {
            parsed.meta.selectedRaceFilter = "all";
            modified = true;
          }

          parsed.characters.forEach(c => {
            if (c.name) {
              const cleaned = this.cleanCharacterName(c.name);
              if (cleaned !== c.name) {
                c.name = cleaned;
                modified = true;
              }
            }
            if (!c.race) {
              c.race = c.creatureType ? (c.creatureType.charAt(0).toUpperCase() + c.creatureType.slice(1)) : "Humano";
              modified = true;
            }
          });
          if (this.ensureTerritoryPolygons(parsed.territories)) {
            modified = true;
          }
          if (!Array.isArray(parsed.settlements)) {
            parsed.settlements = Array.isArray(DEFAULT_WORLD_DATA.settlements) ? JSON.parse(JSON.stringify(DEFAULT_WORLD_DATA.settlements)) : [];
            modified = true;
          }
          if (!Array.isArray(parsed.timelineMilestones)) {
            parsed.timelineMilestones = Array.isArray(DEFAULT_WORLD_DATA.timelineMilestones) ? JSON.parse(JSON.stringify(DEFAULT_WORLD_DATA.timelineMilestones)) : [];
            modified = true;
          }
          if (modified) {
            try {
              localStorage.setItem(storageKey, JSON.stringify(parsed));
            } catch (e) {}
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Erro ao carregar localStorage, usando dados iniciais:", e);
    }
    const initialData = JSON.parse(JSON.stringify(DEFAULT_WORLD_DATA));
    initialData.meta.worldId = wId;
    this.ensureTerritoryPolygons(initialData.territories);
    return initialData;
  }

  // Gera um anel cheio de pontos de controle na borda para modelar um território/continente
  generateContinentPoints(cx, cy, rx = 96, ry = 74, count = 24, seed = 1) {
    const pts = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const wave1 = Math.sin(angle * 3 + seed * 1.3) * 0.12;
      const wave2 = Math.cos(angle * 5 - seed * 1.9) * 0.08;
      const factor = 1 + wave1 + wave2;
      const px = Math.round(cx + Math.cos(angle) * rx * factor);
      const py = Math.round(cy + Math.sin(angle) * ry * factor);
      pts.push({ x: px, y: py });
    }
    return pts;
  }

  ensureTerritoryPolygons(territories) {
    if (!Array.isArray(territories)) return false;
    let changed = false;
    territories.forEach((t, idx) => {
      if (!Array.isArray(t.points) || t.points.length < 6) {
        const cx = Number(t.x) || 480;
        const cy = Number(t.y) || 280;
        t.points = this.generateContinentPoints(cx, cy, 86, 66, 24, idx + 1);
        changed = true;
      }
    });
    return changed;
  }

  // --------------------------------------------------------------------------
  // Gestão de Presets Personalizados & Padrão (Categorias Customizáveis da Autora)
  // --------------------------------------------------------------------------
  ensureCustomPresets() {
    if (!this.data.customPresets || typeof this.data.customPresets !== "object") {
      this.data.customPresets = {
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
      };
    }
  }

  getPresets(category) {
    this.ensureCustomPresets();
    const standard = (typeof STANDARD_PRESETS !== "undefined" && Array.isArray(STANDARD_PRESETS[category]))
      ? STANDARD_PRESETS[category]
      : [];
    const custom = (this.data.customPresets && Array.isArray(this.data.customPresets[category]))
      ? this.data.customPresets[category]
      : [];

    if (standard.length > 0 && typeof standard[0] === "string") {
      const merged = [...standard];
      custom.forEach(c => {
        const label = typeof c === "string" ? c : (c.label || c.name || c.key || "");
        if (label && !merged.some(m => m.toLowerCase() === label.toLowerCase())) {
          merged.push(label);
        }
      });
      return merged;
    }

    const merged = standard.map(s => ({ ...s, isStandard: true }));
    custom.forEach(c => {
      const key = typeof c === "string" ? c.toLowerCase().replace(/\s+/g, "_") : c.key;
      const label = typeof c === "string" ? c : (c.label || key);
      if (key && !merged.some(m => m.key === key)) {
        merged.push({ key, label, isCustom: true, ...(typeof c === "object" ? c : {}) });
      }
    });
    return merged;
  }

  getSocialRanks() { return this.getPresets("socialRanks"); }
  getGenders() { return this.getPresets("genders"); }
  getRaces() {
    const list = this.getPresets("races");
    if (Array.isArray(this.data.characters)) {
      this.data.characters.forEach(c => {
        const r = c.race || c.creatureType;
        if (r && !list.some(item => item.toLowerCase() === r.toLowerCase())) {
          list.push(r);
        }
      });
    }
    return list;
  }
  getTimelineCategories() { return this.getPresets("timelineCategories"); }
  getTimelineImportances() { return this.getPresets("timelineImportances"); }
  getCreationCategories() { return this.getPresets("creationCategories"); }
  getPowerLevels() { return this.getPresets("powerLevels"); }
  getTerritoryTypes() { return this.getPresets("territoryTypes"); }
  getSettlementTypes() { return this.getPresets("settlementTypes"); }
  getSuccessionLaws() { return this.getPresets("successionLaws"); }

  addCustomPreset(category, rawItem) {
    this.ensureCustomPresets();
    if (!Array.isArray(this.data.customPresets[category])) {
      this.data.customPresets[category] = [];
    }

    const isStringList = ["races", "powerLevels", "territoryTypes", "creationCategories"].includes(category);
    let createdItem = null;

    if (isStringList) {
      const label = (typeof rawItem === "string" ? rawItem : (rawItem.label || rawItem.name || "")).trim();
      if (!label) return null;
      const existing = this.getPresets(category);
      if (existing.some(x => x.toLowerCase() === label.toLowerCase())) {
        return label;
      }
      this.data.customPresets[category].push(label);
      if (category === "races" && Array.isArray(this.data.races)) {
        if (!this.data.races.some(r => r.toLowerCase() === label.toLowerCase())) {
          this.data.races.push(label);
        }
      }
      createdItem = label;
    } else {
      let key = "";
      let label = "";
      if (typeof rawItem === "string") {
        label = rawItem.trim();
        key = label.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9_]/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_|_$/g, "");
      } else if (rawItem && typeof rawItem === "object") {
        label = (rawItem.label || rawItem.name || "").trim();
        key = (rawItem.key || "").trim().toLowerCase();
        if (!key && label) {
          key = label.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9_]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_|_$/g, "");
        }
      }
      if (!label || !key) return null;

      const existing = this.getPresets(category);
      const found = existing.find(x => x.key === key || (x.label && x.label.toLowerCase() === label.toLowerCase()));
      if (found) return found;

      const newItem = { key, label, isCustom: true };
      if (rawItem && typeof rawItem === "object") {
        if (rawItem.icon) newItem.icon = rawItem.icon;
        if (rawItem.color) newItem.color = rawItem.color;
      }

      this.data.customPresets[category].push(newItem);
      createdItem = newItem;
    }

    this.saveToStorage();
    return createdItem;
  }

  removeCustomPreset(category, keyOrLabel) {
    this.ensureCustomPresets();
    if (!Array.isArray(this.data.customPresets[category])) return false;
    const target = (keyOrLabel || "").toString().trim().toLowerCase();

    const before = this.data.customPresets[category].length;
    this.data.customPresets[category] = this.data.customPresets[category].filter(item => {
      if (typeof item === "string") {
        return item.toLowerCase() !== target;
      } else if (item && typeof item === "object") {
        return (item.key || "").toLowerCase() !== target && (item.label || "").toLowerCase() !== target;
      }
      return true;
    });

    const removed = this.data.customPresets[category].length < before;
    if (removed) {
      if (category === "races" && Array.isArray(this.data.races)) {
        this.data.races = this.data.races.filter(r => r.toLowerCase() !== target);
      }
      this.saveToStorage();
    }
    return removed;
  }

  isCustomPreset(category, keyOrLabel) {
    this.ensureCustomPresets();
    if (!Array.isArray(this.data.customPresets[category])) return false;
    const target = (keyOrLabel || "").toString().trim().toLowerCase();
    return this.data.customPresets[category].some(item => {
      if (typeof item === "string") return item.toLowerCase() === target;
      return (item.key || "").toLowerCase() === target || (item.label || "").toLowerCase() === target;
    });
  }

  addRace(raceName) {
    return this.addCustomPreset("races", raceName);
  }

  // --------------------------------------------------------------------------
  // Sincronização com MongoDB Atlas via Node.js API & Múltiplas Histórias
  // --------------------------------------------------------------------------
  initDatabase() {
    this.apiUrl = (window.location.protocol === "http:" || window.location.protocol === "https:")
      ? "./api"
      : "http://localhost:8000/api";
    this.dbStatus = "init";
    this.dbMessage = "Iniciando comunicação com MongoDB Atlas...";
    this.lastSavedAt = null;
    this.saveDebounceTimer = null;

    setTimeout(() => {
      this.fetchFromDatabase(this.currentWorldId);
    }, 100);

    // Ao fechar/ocultar a aba, envia imediatamente alterações ainda pendentes
    window.addEventListener("pagehide", () => {
      if (!this.saveDebounceTimer) return;
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
      try {
        const body = JSON.stringify(this.data);
        fetch(`${this.apiUrl}?action=save&world_id=${encodeURIComponent(this.currentWorldId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: body.length < 60000
        });
      } catch (e) {}
    });
  }

  setDbStatus(status, message) {
    this.dbStatus = status;
    this.dbMessage = message;
    if (typeof window.updateDbStatusUi === "function") {
      window.updateDbStatusUi(status, message);
    }
  }

  async fetchWorldsList() {
    try {
      const res = await fetch(`${this.apiUrl}?action=list_worlds`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json && json.status === "success" && Array.isArray(json.worlds)) {
        this.worldsList = json.worlds;
        return this.worldsList;
      }
    } catch (e) {
      console.warn("Erro ao listar histórias:", e.message);
    }
    return this.worldsList || [];
  }

  async fetchFromDatabase(worldId = null) {
    const targetWorldId = worldId || this.currentWorldId || "main_world";
    try {
      this.setDbStatus("syncing", "Conectando ao MongoDB Atlas...");
      // "no-cache" = o navegador revalida com ETag; se nada mudou o servidor responde 304 sem corpo
      const res = await fetch(`${this.apiUrl}?action=load&world_id=${encodeURIComponent(targetWorldId)}`, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json && json.status === "success" && json.data) {
        this.currentWorldId = targetWorldId;
        localStorage.setItem("current_world_id", this.currentWorldId);
        this.data = json.data;
        if (Array.isArray(json.worlds)) {
          this.worldsList = json.worlds;
        }
        this.ensureCustomPresets();
        this.ensureTerritoryPolygons(this.data.territories);
        if (!this._lastSavedPayload) this._lastSavedPayload = {};
        this._lastSavedPayload[this.currentWorldId] = JSON.stringify(this.data);
        try {
          localStorage.setItem(this.getStorageKey(this.currentWorldId), JSON.stringify(this.data));
        } catch (e) {}
        this.setDbStatus("connected", "MongoDB Atlas Conectado");
        if (window.app && typeof window.app.renderAll === "function") {
          window.app.renderAll();
        }
        if (window.app && typeof window.app.updateHeaderWorldTitle === "function") {
          window.app.updateHeaderWorldTitle();
        }
        return true;
      } else {
        throw new Error(json.message || "Resposta inválida do servidor");
      }
    } catch (err) {
      console.warn("MongoDB / Node.js API offline:", err.message);
      this.setDbStatus("offline", "MongoDB Offline (Modo Local)");
      return false;
    }
  }

  // Salvamento leve: agrupa alterações (debounce), ignora se nada mudou e
  // mantém no máximo UMA requisição em andamento por vez (evita fila no servidor).
  saveToDatabase(immediate = false) {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }
    if (!this._lastSavedPayload) this._lastSavedPayload = {};

    const doSave = async () => {
      if (this._saveInFlight) {
        this._savePending = true; // salva de novo quando a atual terminar
        return { inFlight: true };
      }
      const worldId = this.currentWorldId;
      this.pruneAuditLogSnapshots(15);
      const body = JSON.stringify(this.data);
      if (!immediate && this._lastSavedPayload[worldId] === body) {
        return { success: true, unchanged: true }; // nada mudou desde o último salvamento
      }

      this._saveInFlight = true;
      try {
        this.setDbStatus("syncing", "Salvando no MongoDB...");
        const res = await fetch(`${this.apiUrl}?action=save&world_id=${encodeURIComponent(worldId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json && json.status === "success") {
          this._lastSavedPayload[worldId] = body;
          this.lastSavedAt = new Date();
          this.setDbStatus("connected", "Salvo no MongoDB");
          return { success: true, data: json };
        } else {
          throw new Error(json.message || "Erro retornado ao salvar");
        }
      } catch (err) {
        console.warn("Aviso ao salvar no MongoDB via Node.js API:", err.message);
        this.setDbStatus("offline", "Salvo localmente (Node/Mongo offline)");
        return { success: false, error: err.message };
      } finally {
        this._saveInFlight = false;
        if (this._savePending) {
          this._savePending = false;
          this.saveDebounceTimer = setTimeout(doSave, 1500);
        }
      }
    };

    if (immediate) {
      return doSave();
    } else {
      this.saveDebounceTimer = setTimeout(doSave, 2000);
    }
  }

  async pushToDatabaseNow() {
    this.pruneAuditLogSnapshots(3);
    if (this._lastSavedPayload) {
      delete this._lastSavedPayload[this.currentWorldId];
    }
    return await this.saveToDatabase(true);
  }

  pruneAuditLogSnapshots(keepCount = 3) {
    if (!this.data || !Array.isArray(this.data.auditLogs)) return;
    let countWithSnapshot = 0;
    for (let i = 0; i < this.data.auditLogs.length; i++) {
      const log = this.data.auditLogs[i];
      if (log && log.snapshot) {
        countWithSnapshot++;
        if (countWithSnapshot > keepCount) {
          log.snapshot = null;
          log.canRevert = false;
        }
      }
    }
  }

  prepareExportData(keepSnapshots = 0) {
    const copy = JSON.parse(JSON.stringify(this.data));
    if (Array.isArray(copy.auditLogs)) {
      copy.auditLogs = copy.auditLogs.map((l, i) => {
        if (i >= keepSnapshots && l.snapshot) {
          return { ...l, snapshot: null, canRevert: false };
        }
        return l;
      });
    }
    return copy;
  }

  saveToStorage() {
    try {
      this.ensureCustomPresets();
      this.pruneAuditLogSnapshots(3);
      localStorage.setItem(this.getStorageKey(), JSON.stringify(this.data));
    } catch (e) {
      console.warn("Aviso ao salvar no localStorage, reduzindo snapshots:", e);
      try {
        this.pruneAuditLogSnapshots(1);
        localStorage.setItem(this.getStorageKey(), JSON.stringify(this.data));
      } catch (e2) {
        console.error("localStorage ainda cheio após podar snapshots:", e2);
      }
    }
    this.saveToDatabase();
  }

  async switchWorld(worldId) {
    if (!worldId || worldId === this.currentWorldId) return;
    this.currentWorldId = worldId;
    localStorage.setItem("current_world_id", worldId);
    this.data = this.loadFromStorage(worldId);
    if (window.app && typeof window.app.renderAll === "function") {
      window.app.renderAll();
    }
    if (window.app && typeof window.app.updateHeaderWorldTitle === "function") {
      window.app.updateHeaderWorldTitle();
    }
    await this.fetchFromDatabase(worldId);
  }

  async createNewWorld(title, initialYear = 1000) {
    const worldTitle = (title || "").trim() || "Nova História";
    try {
      this.setDbStatus("syncing", "Criando nova história no MongoDB...");
      const res = await fetch(`${this.apiUrl}?action=create_world`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: worldTitle, currentYear: Number(initialYear) || 1000 })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json && json.status === "success" && json.world) {
        this.currentWorldId = json.world.id;
        localStorage.setItem("current_world_id", this.currentWorldId);
        this.data = json.world.data;
        if (Array.isArray(json.worlds)) this.worldsList = json.worlds;
        this.saveToStorage();
        this.setDbStatus("connected", `História "${worldTitle}" criada!`);
        if (window.app && typeof window.app.renderAll === "function") {
          window.app.renderAll();
        }
        if (window.app && typeof window.app.updateHeaderWorldTitle === "function") {
          window.app.updateHeaderWorldTitle();
        }
        return json.world;
      }
    } catch (e) {
      console.warn("Erro ao criar mundo no MongoDB:", e);
      const newId = "world_" + Date.now();
      const newWorldData = JSON.parse(JSON.stringify(DEFAULT_WORLD_DATA));
      newWorldData.meta.worldId = newId;
      newWorldData.meta.worldTitle = worldTitle;
      newWorldData.meta.currentYear = Number(initialYear) || 1000;
      this.currentWorldId = newId;
      localStorage.setItem("current_world_id", newId);
      this.data = newWorldData;
      this.saveToStorage();
      if (window.app && typeof window.app.renderAll === "function") {
        window.app.renderAll();
      }
      if (window.app && typeof window.app.updateHeaderWorldTitle === "function") {
        window.app.updateHeaderWorldTitle();
      }
      return { id: newId, title: worldTitle, data: newWorldData };
    }
  }

  async deleteWorld(worldId) {
    if (!worldId) return false;
    try {
      this.setDbStatus("syncing", "Excluindo história...");
      const res = await fetch(`${this.apiUrl}?action=delete_world&world_id=${encodeURIComponent(worldId)}`, {
        method: "POST"
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json && json.status === "success") {
        if (Array.isArray(json.worlds)) this.worldsList = json.worlds;
        try { localStorage.removeItem(this.getStorageKey(worldId)); } catch (e) {}
        if (this.currentWorldId === worldId) {
          const nextWorld = (this.worldsList && this.worldsList[0]) ? this.worldsList[0].id : "main_world";
          await this.switchWorld(nextWorld);
        }
        return true;
      } else {
        throw new Error(json.message || "Erro retornado ao excluir");
      }
    } catch (e) {
      console.warn("Erro ao excluir mundo:", e);
      alert("Não foi possível excluir a história: " + e.message);
      return false;
    }
  }

  async renameWorld(worldId, newTitle) {
    const cleanTitle = (newTitle || "").trim();
    if (!cleanTitle) return false;
    try {
      const res = await fetch(`${this.apiUrl}?action=rename_world&world_id=${encodeURIComponent(worldId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: cleanTitle })
      });
      if (this.currentWorldId === worldId) {
        if (!this.data.meta) this.data.meta = {};
        this.data.meta.worldTitle = cleanTitle;
        this.saveToStorage();
        if (window.app && typeof window.app.updateHeaderWorldTitle === "function") {
          window.app.updateHeaderWorldTitle();
        }
      }
      await this.fetchWorldsList();
      return true;
    } catch (e) {
      console.warn("Erro ao renomear mundo:", e);
      return false;
    }
  }

  async resetDatabase() {
    try {
      this.setDbStatus("syncing", "Resetando no MongoDB...");
      const res = await fetch(`${this.apiUrl}?action=reset&world_id=${encodeURIComponent(this.currentWorldId)}`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json && json.status === "success") {
        this.data = json.data || JSON.parse(JSON.stringify(DEFAULT_WORLD_DATA));
        try {
          localStorage.setItem(this.getStorageKey(), JSON.stringify(this.data));
        } catch (e) {}
        this.setDbStatus("connected", "MongoDB Resetado com Sucesso");
        if (window.app && typeof window.app.renderAll === "function") {
          window.app.renderAll();
        }
        return true;
      }
    } catch (err) {
      console.warn("Erro ao resetar no MongoDB via Node.js API:", err.message);
      this.data = JSON.parse(JSON.stringify(DEFAULT_WORLD_DATA));
      this.saveToStorage();
    }
  }

  resetToDefault() {
    this.resetDatabase();
  }

  createBlankWorld() {
    const clean = JSON.parse(JSON.stringify(DEFAULT_WORLD_DATA));
    clean.meta.worldId = this.currentWorldId;
    this.data = clean;
    this.ensureTerritoryPolygons(this.data.territories);
    this.saveToStorage();
  }

  createBlankWorld() {
    this.data = {
      meta: {
        worldTitle: "Crônicas & Linhagens",
        currentYear: 1000,
        treeColorMode: "linhagem",
        selectedHouseFilter: "all",
        selectedRaceFilter: "all"
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
    this.ensureTerritoryPolygons(this.data.territories);
    this.saveToStorage();
  }

  // --------------------------------------------------------------------------
  // Utilitários de Busca
  // --------------------------------------------------------------------------
  getCharacter(id) {
    if (!id) return null;
    return this.data.characters.find(c => c.id === id) || null;
  }

  getHouse(id) {
    if (!id) return null;
    return this.data.houses.find(h => h.id === id) || null;
  }

  getTerritory(id) {
    if (!id) return null;
    return this.data.territories.find(t => t.id === id) || null;
  }

  getChildren(charOrId) {
    const charId = typeof charOrId === "object" && charOrId !== null ? charOrId.id : charOrId;
    if (!charId) return [];
    return this.data.characters.filter(
      c => c.fatherId === charId || c.motherId === charId
    );
  }

  getSiblings(char) {
    if (!char || (!char.fatherId && !char.motherId)) return [];
    return this.data.characters.filter(c => {
      if (c.id === char.id) return false;
      const sameFather = char.fatherId && c.fatherId === char.fatherId;
      const sameMother = char.motherId && c.motherId === char.motherId;
      return sameFather || sameMother;
    });
  }

  // Verifica se charA e charB são Tio(a) e Sobrinho(a)
  isAvuncularRelationship(charAId, charBId) {
    const a = this.getCharacter(charAId);
    const b = this.getCharacter(charBId);
    if (!a || !b) return false;

    const aParents = [a.fatherId, a.motherId].filter(Boolean);
    const bParents = [b.fatherId, b.motherId].filter(Boolean);

    // b é filho(a) de um irmão/irmã de a?
    for (const bParentId of bParents) {
      const bParent = this.getCharacter(bParentId);
      if (bParent) {
        const siblingsOfA = this.getSiblings(a).map(s => s.id);
        if (siblingsOfA.includes(bParent.id)) {
          return { uncleOrAunt: a, nieceOrNephew: b };
        }
      }
    }

    // a é filho(a) de um irmão/irmã de b?
    for (const aParentId of aParents) {
      const aParent = this.getCharacter(aParentId);
      if (aParent) {
        const siblingsOfB = this.getSiblings(b).map(s => s.id);
        if (siblingsOfB.includes(aParent.id)) {
          return { uncleOrAunt: b, nieceOrNephew: a };
        }
      }
    }

    return false;
  }

  // Verifica se um status social é nobre (Rei, Príncipe, Lorde)
  isNobleRank(rank) {
    return ["rei", "principe", "lorde"].includes(rank);
  }

  // Verifica se a mãe gera bastardo com um pai nobre
  isMotherNonNobleStandard(rank) {
    return ["civil", "fazendeira", "prostituta", "estuprada", "guarda", "plebeia"].includes(rank);
  }

  // --------------------------------------------------------------------------
  // Sistema de Log de Alterações & Reversão (CASA, TERRITÓRIO, LINHAGEM)
  // --------------------------------------------------------------------------
  recordAuditLog(category, actionType, title, details, snapshotBefore = null) {
    const now = new Date();
    const pad = n => String(n).padStart(2, "0");
    const timestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const logEntry = {
      id: "log_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      timestamp,
      category, // "LINHAGEM" | "CASA" | "TERRITÓRIO"
      actionType,
      title,
      details,
      canRevert: Boolean(snapshotBefore),
      reverted: false,
      snapshot: snapshotBefore
    };

    this.data.auditLogs.unshift(logEntry);
    this.pruneAuditLogSnapshots(3);
    this.saveToStorage();
    return logEntry;
  }

  createSnapshot() {
    return {
      characters: JSON.parse(JSON.stringify(this.data.characters)),
      houses: JSON.parse(JSON.stringify(this.data.houses)),
      territories: JSON.parse(JSON.stringify(this.data.territories)),
      settlements: JSON.parse(JSON.stringify(this.data.settlements || [])),
      mapStrokes: JSON.parse(JSON.stringify(this.data.mapStrokes || [])),
      houseEvents: JSON.parse(JSON.stringify(this.data.houseEvents)),
      timelineMilestones: JSON.parse(JSON.stringify(this.data.timelineMilestones || [])),
      creations: JSON.parse(JSON.stringify(this.data.creations || [])),
      creationCategories: JSON.parse(JSON.stringify(this.data.creationCategories || []))
    };
  }

  revertAuditLog(logId) {
    const log = this.data.auditLogs.find(l => l.id === logId);
    if (!log || !log.canRevert || !log.snapshot || log.reverted) {
      return { success: false, message: "Esta alteração não pode ser revertida ou já foi revertida." };
    }

    this.data.characters = JSON.parse(JSON.stringify(log.snapshot.characters));
    this.data.houses = JSON.parse(JSON.stringify(log.snapshot.houses));
    this.data.territories = JSON.parse(JSON.stringify(log.snapshot.territories));
    if (log.snapshot.settlements) {
      this.data.settlements = JSON.parse(JSON.stringify(log.snapshot.settlements));
    }
    if (log.snapshot.mapStrokes) {
      this.data.mapStrokes = JSON.parse(JSON.stringify(log.snapshot.mapStrokes));
    }
    this.data.houseEvents = JSON.parse(JSON.stringify(log.snapshot.houseEvents));
    if (log.snapshot.timelineMilestones) {
      this.data.timelineMilestones = JSON.parse(JSON.stringify(log.snapshot.timelineMilestones));
    }
    if (log.snapshot.creations) {
      this.data.creations = JSON.parse(JSON.stringify(log.snapshot.creations));
    }
    if (log.snapshot.creationCategories) {
      this.data.creationCategories = JSON.parse(JSON.stringify(log.snapshot.creationCategories));
    }
    log.reverted = true;

    this.recordAuditLog(
      log.category,
      "Reversão Executada",
      `Revertido: ${log.title}`,
      `O estado de ${log.category} foi restaurado para antes da ação "${log.title}".`,
      null
    );

    this.saveToStorage();
    return { success: true, log };
  }

  // --------------------------------------------------------------------------
  // Motor de Detecção de Inconsistências (com Explicação e Registro da Autora)
  // --------------------------------------------------------------------------
  detectCharacterInconsistencies(charDraft) {
    const warnings = [];

    // 1. Datas de Nascimento e Falecimento inconsistentes
    const bYear = Number(charDraft.birthYear);
    const dYear = charDraft.deathYear ? Number(charDraft.deathYear) : null;
    if (!isNaN(bYear) && dYear !== null && !isNaN(dYear) && dYear < bYear) {
      warnings.push({
        code: "DEATH_BEFORE_BIRTH",
        where: `Cronologia de "${charDraft.name}": Ano de falecimento (${dYear}) anterior ao ano de nascimento (${bYear}).`,
        whyNotAllowed: "Um personagem não pode falecer antes de ter nascido na linha do tempo.",
        promptLabel: "Explique a razão narrativa ou mágica para esta inversão temporal:"
      });
    }

    // 3. Cronologia em relação ao Pai e à Mãe
    if (charDraft.fatherId) {
      const father = this.getCharacter(charDraft.fatherId);
      if (father && !father.isPlaceholderEmpty && father.birthYear && bYear) {
        if (bYear <= father.birthYear + 11) {
          warnings.push({
            code: "FATHER_TOO_YOUNG",
            where: `Linhagem Paterna: "${charDraft.name}" (nasc. ${bYear}) e Pai "${father.name}" (nasc. ${father.birthYear}).`,
            whyNotAllowed: `O pai teria apenas ${bYear - father.birthYear} anos no nascimento do filho (ou nasceu depois do filho).`,
            promptLabel: "Registre por que prosseguir com esta diferença de idade paterna:"
          });
        }
        if (!father.isAlive && father.deathYear && bYear > father.deathYear + 1) {
          warnings.push({
            code: "BORN_AFTER_FATHER_DEATH",
            where: `Linhagem Paterna: "${charDraft.name}" nasceu em ${bYear}, mas o pai "${father.name}" faleceu em ${father.deathYear}.`,
            whyNotAllowed: "O nascimento ocorre mais de 1 ano após a morte registrada do pai.",
            promptLabel: "Explique por que este nascimento ocorreu após a morte do pai:"
          });
        }
      }
    }

    if (charDraft.motherId) {
      const mother = this.getCharacter(charDraft.motherId);
      if (mother && !mother.isPlaceholderEmpty && mother.birthYear && bYear) {
        if (bYear <= mother.birthYear + 11) {
          warnings.push({
            code: "MOTHER_TOO_YOUNG",
            where: `Linhagem Materna: "${charDraft.name}" (nasc. ${bYear}) e Mãe "${mother.name}" (nasc. ${mother.birthYear}).`,
            whyNotAllowed: `A mãe teria apenas ${bYear - mother.birthYear} anos no nascimento do filho(a).`,
            promptLabel: "Registre por que prosseguir com esta diferença de idade materna:"
          });
        }
        if (!mother.isAlive && mother.deathYear && bYear > mother.deathYear) {
          warnings.push({
            code: "BORN_AFTER_MOTHER_DEATH",
            where: `Linhagem Materna: "${charDraft.name}" nasceu em ${bYear}, mas a mãe "${mother.name}" faleceu em ${mother.deathYear}.`,
            whyNotAllowed: "Um filho não pode nascer após o ano de falecimento da mãe.",
            promptLabel: "Explique a exceção narrativa para este nascimento:"
          });
        }
      }
    }

    // 4. Bastardo sendo incluído na Casa Nobre/Herança por exceção da autora
    if (charDraft.isBastard && charDraft.bastardLegitimizedByAuthor) {
      warnings.push({
        code: "BASTARD_LEGITIMIZED_EXCEPTION",
        where: `Estatuto de Bastardia de "${charDraft.name}": Filho(a) fora dos padrões matrimoniais nobres incluído na casa/herança.`,
        whyNotAllowed: "Filhos de lordes, príncipes e reis com mulheres civis, fazendeiras, prostitutas ou relações não-oficiais não pertencem à Casa nem à herança por regra geral.",
        promptLabel: "Confirme o motivo da Exceção da Autora (o aviso de Lembrança de Bastardo permanecerá visível):"
      });
    }

    return warnings;
  }

  detectMarriageInconsistencies(charAId, charBId, marriageYear) {
    const warnings = [];
    const a = this.getCharacter(charAId);
    const b = this.getCharacter(charBId);
    if (!a || !b) return warnings;

    const mYear = Number(marriageYear);

    // Verifica se o casamento ocorre antes do nascimento ou após a morte
    if (a.birthYear && mYear < a.birthYear + 12) {
      warnings.push({
        code: "MARRIAGE_AGE_A",
        where: `Casamento de "${a.name}" (nasc. ${a.birthYear}) no ano ${mYear}.`,
        whyNotAllowed: `"${a.name}" teria ${mYear - a.birthYear} anos na data do casamento.`,
        promptLabel: "Explique por que este casamento foi registrado nesta data:"
      });
    }
    if (b.birthYear && mYear < b.birthYear + 12) {
      warnings.push({
        code: "MARRIAGE_AGE_B",
        where: `Casamento de "${b.name}" (nasc. ${b.birthYear}) no ano ${mYear}.`,
        whyNotAllowed: `"${b.name}" teria ${mYear - b.birthYear} anos na data do casamento.`,
        promptLabel: "Explique por que este casamento foi registrado nesta data:"
      });
    }

    // Verifica consanguinidade (Irmãos ou Pais/Filhos)
    const siblingsOfA = this.getSiblings(a).map(s => s.id);
    if (siblingsOfA.includes(b.id)) {
      warnings.push({
        code: "SIBLING_MARRIAGE",
        where: `Consanguinidade Direta: "${a.name}" e "${b.name}" são irmãos de sangue.`,
        whyNotAllowed: "Casamento entre irmãos não é permitido pelas leis tradicionais das casas.",
        promptLabel: "Registre por que você decidiu permitir este casamento entre irmãos:"
      });
    }

    // Verifica Tio/Sobrinha (Avuncular) em casas que NÃO têm essa tradição
    const avuncular = this.isAvuncularRelationship(a.id, b.id);
    if (avuncular) {
      const houseA = this.getHouse(a.officialHouseId || a.birthHouseId);
      const houseB = this.getHouse(b.officialHouseId || b.birthHouseId);
      const allowed = (houseA && houseA.allowAvuncularMarriage) || (houseB && houseB.allowAvuncularMarriage);
      if (!allowed) {
        warnings.push({
          code: "AVUNCULAR_OUTSIDE_SOLARIUS",
          where: `Casamento Tio(a)/Sobrinho(a) entre "${avuncular.uncleOrAunt.name}" e "${avuncular.nieceOrNephew.name}".`,
          whyNotAllowed: `A casa "${houseA ? houseA.name : "Atual"}" não está marcada com a tradição de casamento avuncular (exclusiva de casas como a Casa Solárius).`,
          promptLabel: "Explique por que este casamento entre tio(a) e sobrinho(a) ocorreu nesta casa:"
        });
      }
    }

    return warnings;
  }

  // --------------------------------------------------------------------------
  // Casamento & Assimilação da Mulher à Trajetória Oficial do Marido
  // --------------------------------------------------------------------------
  getHusbandEventsSinceMarriage(husbandId, marriageYear) {
    const husband = this.getCharacter(husbandId);
    if (!husband) return [];
    const mYear = Number(marriageYear) || 0;

    // Coleta eventos da Casa Oficial do marido a partir do ano de casamento
    const houseEvents = this.data.houseEvents
      .filter(ev => ev.houseId === husband.officialHouseId && ev.year >= mYear)
      .map(ev => `${ev.year}: ${ev.title} — ${ev.description}`);

    // Coleta eventos da trajetória do próprio marido que tenham ano >= mYear
    const husbandCustom = (husband.customTrajectoryEvents || []).filter(evStr => {
      const match = evStr.match(/^(\d{3,4})/);
      if (match) {
        return Number(match[1]) >= mYear;
      }
      return true;
    });

    return Array.from(new Set([...houseEvents, ...husbandCustom]));
  }

  registerMarriage({ partnerAId, partnerBId, marriageYear, exceptionEvents = [], inconsistencyJustification = "" }) {
    const snapshot = this.createSnapshot();
    const charA = this.getCharacter(partnerAId);
    const charB = this.getCharacter(partnerBId);
    if (!charA || !charB) return { success: false, message: "Personagens não encontrados." };

    const mYear = Number(marriageYear) || this.data.meta.currentYear;

    if (!charA.spouseIds.includes(charB.id)) charA.spouseIds.push(charB.id);
    if (!charB.spouseIds.includes(charA.id)) charB.spouseIds.push(charA.id);

    // Determina quem é o marido e quem é a esposa (ou parceiros)
    let husband = null;
    let wife = null;
    if (charA.gender === "M" && charB.gender === "F") {
      husband = charA;
      wife = charB;
    } else if (charB.gender === "M" && charA.gender === "F") {
      husband = charB;
      wife = charA;
    }

    const avuncularInfo = this.isAvuncularRelationship(charA.id, charB.id);
    const isAvuncular = Boolean(avuncularInfo);

    // Regra de Assimilação: A mulher se casa com um Lorde, Príncipe ou Rei!
    // Casamentos entre "civis" e "guardas" NÃO seguem a mesma lógica das casas.
    let isNobleAssimilation = false;
    let assimilationSummary = "";

    if (husband && wife && this.isNobleRank(husband.socialRank)) {
      isNobleAssimilation = true;
      const oldHouse = this.getHouse(wife.birthHouseId);
      const newHouse = this.getHouse(husband.officialHouseId);

      // Oficializa a esposa na Casa A do marido, mantendo birthHouseId como Casa X
      wife.officialHouseId = husband.officialHouseId;
      if (husband.livedInTerritoryId) {
        wife.livedInTerritoryId = husband.livedInTerritoryId;
      }

      // Une a trajetória oficial do marido (a partir do ano do casamento) à história dela,
      // exceto o que a autora marcou em exceptionEvents ("coisa X não alterou")
      const candidateEvents = this.getHusbandEventsSinceMarriage(husband.id, mYear);
      const unitedEvents = candidateEvents.filter(ev => !exceptionEvents.includes(ev));

      const marriageEventLine = `${mYear}: Casou-se com ${husband.name} e oficializou-se na ${newHouse ? newHouse.name : "Casa do Marido"} (Origem preservada: ${oldHouse ? oldHouse.name : "Casa Natal"}).`;

      wife.customTrajectoryEvents = Array.from(
        new Set([marriageEventLine, ...(wife.customTrajectoryEvents || []), ...unitedEvents])
      );
      wife.excludedMarriageExceptions = exceptionEvents;
      wife.postMarriageHistory =
        `Unida oficialmente à ${newHouse ? newHouse.name : "Casa do Marido"} em ${mYear} pelo casamento com ${husband.name}. ` +
        (unitedEvents.length > 0
          ? `Eventos pós-${mYear} integrados: ${unitedEvents.length}.`
          : `Acompanha a trajetória oficial de ${husband.name} a partir de ${mYear}.`);

      assimilationSummary =
        `${wife.name} (origem: ${oldHouse ? oldHouse.name : "N/A"}) passou a pertencer oficialmente à ${newHouse ? newHouse.name : "Casa A"} a partir de ${mYear}. ` +
        `Sua história anterior na casa natal permanece guardada na aba 'História' de seu perfil.`;
    } else {
      assimilationSummary =
        `Casamento entre ${charA.name} (${charA.socialRank}) e ${charB.name} (${charB.socialRank}) registrado como união civil/não-senhorial: não altera a Casa dinástica nem funde linhagens reais.`;
    }

    if (!charA.marriageDetails) charA.marriageDetails = {};
    if (!charB.marriageDetails) charB.marriageDetails = {};

    charA.marriageDetails[charB.id] = {
      year: mYear,
      isNobleAssimilation,
      exceptions: exceptionEvents,
      isAvuncular
    };
    charB.marriageDetails[charA.id] = {
      year: mYear,
      isNobleAssimilation,
      exceptions: exceptionEvents,
      isAvuncular
    };

    if (inconsistencyJustification) {
      const note = {
        date: new Date().toLocaleDateString("pt-BR"),
        reason: inconsistencyJustification,
        context: `Casamento em ${mYear} entre ${charA.name} e ${charB.name}`
      };
      charA.inconsistencyJustifications = charA.inconsistencyJustifications || [];
      charB.inconsistencyJustifications = charB.inconsistencyJustifications || [];
      charA.inconsistencyJustifications.push(note);
      charB.inconsistencyJustifications.push(note);
    }

    this.recordAuditLog(
      "LINHAGEM",
      isAvuncular ? "Casamento Avuncular (Tio/Sobrinho)" : (isNobleAssimilation ? "Casamento Nobre & Assimilação" : "Casamento Civil"),
      `Casamento: ${charA.name} & ${charB.name} (${mYear})`,
      assimilationSummary,
      snapshot
    );

    this.saveToStorage();
    return { success: true, isNobleAssimilation, isAvuncular, assimilationSummary };
  }

  // --------------------------------------------------------------------------
  // Assistente de Irmão Retroativo (Mesmo após 5+ gerações!)
  // --------------------------------------------------------------------------
  buildRetroactiveSiblingProposal(referenceSiblingId, birthYear, deathYear) {
    const refSibling = this.getCharacter(referenceSiblingId);
    if (!refSibling) return null;

    const bYear = Number(birthYear) || (refSibling.birthYear ? refSibling.birthYear + 2 : 1200);
    const dYear = deathYear ? Number(deathYear) : null;
    const endYear = dYear || this.data.meta.currentYear;

    const houseId = refSibling.birthHouseId;
    const house = this.getHouse(houseId);
    const father = this.getCharacter(refSibling.fatherId);
    const mother = this.getCharacter(refSibling.motherId);

    // Busca todos os acontecimentos da época em que nasceu até a morte!
    const matchingEvents = [];

    this.data.houseEvents.forEach(ev => {
      if (ev.houseId === houseId && ev.year >= bYear && ev.year <= endYear) {
        matchingEvents.push(`${ev.year}: ${ev.title} (${ev.description})`);
      }
    });

    // Inclui acontecimentos familiares importantes (nascimentos/mortes/casamentos de pais e irmãos naquela janela)
    const familyMembers = [father, mother, refSibling, ...this.getSiblings(refSibling)].filter(Boolean);
    const seenIds = new Set();
    familyMembers.forEach(member => {
      if (seenIds.has(member.id)) return;
      seenIds.add(member.id);
      if (member.birthYear && member.birthYear >= bYear && member.birthYear <= endYear) {
        matchingEvents.push(`${member.birthYear}: Nascimento do familiar ${member.name}.`);
      }
      if (!member.isAlive && member.deathYear && member.deathYear >= bYear && member.deathYear <= endYear) {
        matchingEvents.push(`${member.deathYear}: Falecimento do familiar ${member.name}.`);
      }
    });

    matchingEvents.sort();

    return {
      fatherId: refSibling.fatherId,
      motherId: refSibling.motherId,
      fatherName: father ? father.name : "Desconhecido",
      motherName: mother ? mother.name : "Desconhecida",
      birthHouseId: houseId,
      officialHouseId: houseId,
      houseName: house ? house.name : "Casa de Origem",
      livedInTerritoryId: refSibling.livedInTerritoryId,
      socialRank: refSibling.socialRank === "rei" ? "principe" : refSibling.socialRank,
      suggestedEvents: matchingEvents
    };
  }

  // --------------------------------------------------------------------------
  // Exclusão de Personagem:
  // 1) Excluir SOMENTE o personagem -> Campo Fica Vazio (isPlaceholderEmpty = true)
  // 2) Excluir Personagem E TODA a Árvore Seguinte -> Esposas retornam à Casa de Nascimento
  //    e recebem o aviso de "Ligado a uma linhagem excluída"
  // --------------------------------------------------------------------------
  getAllDescendants(rootCharId) {
    const descendants = [];
    const visited = new Set();

    const traverse = currentId => {
      const children = this.getChildren(currentId);
      children.forEach(child => {
        if (!visited.has(child.id)) {
          visited.add(child.id);
          descendants.push(child);
          traverse(child.id);
        }
      });
    };

    traverse(rootCharId);
    return descendants;
  }

  deleteOnlyCharacterLeaveEmptySlot(charId) {
    const char = this.getCharacter(charId);
    if (!char) return { success: false };

    const snapshot = this.createSnapshot();
    const oldName = char.name;
    const hasConnections =
      this.getChildren(charId).length > 0 ||
      this.getSiblings(char).length > 0 ||
      (char.spouseIds && char.spouseIds.length > 0) ||
      char.fatherId ||
      char.motherId;

    if (hasConnections) {
      // O campo fica vazio até que a autora adicione alguém no lugar!
      char.isPlaceholderEmpty = true;
      char.previousDeletedName = oldName;
      char.name = "Espaço Vazio (Excluído)";
      char.appearance = "Este espaço pertencia a " + oldName + " e aguarda um novo personagem ou restauração.";
      char.preMarriageHistory = "";
      char.postMarriageHistory = "";
      char.customTrajectoryEvents = [];
    } else {
      // Sem ligações, remove do array
      this.data.characters = this.data.characters.filter(c => c.id !== charId);
    }

    this.recordAuditLog(
      "LINHAGEM",
      "Exclusão Individual (Campo Vazio)",
      `Personagem Excluído: ${oldName} (Descendentes Mantidos)`,
      `Somente o personagem "${oldName}" foi excluído. Sua posição na árvore permaneceu como um Campo Vazio para manter filhos e irmãos conectados.`,
      snapshot
    );

    this.saveToStorage();
    return { success: true, leftEmptySlot: hasConnections };
  }

  deleteCharacterAndEntireSubtree(charId) {
    const rootChar = this.getCharacter(charId);
    if (!rootChar) return { success: false };

    const snapshot = this.createSnapshot();
    const rootName = rootChar.name;
    const rootHouse = this.getHouse(rootChar.officialHouseId || rootChar.birthHouseId);
    const rootHouseName = rootHouse ? rootHouse.name : "Linhagem";

    const descendants = this.getAllDescendants(charId);
    const toDeleteIds = new Set([charId, ...descendants.map(d => d.id)]);

    const revertedWives = [];

    // Verifica esposas/cônjuges que foram ligadas a esta linhagem mas NÃO são descendentes de sangue dela
    this.data.characters.forEach(person => {
      if (toDeleteIds.has(person.id)) return;

      const marriedToDeleted = (person.spouseIds || []).some(spId => toDeleteIds.has(spId));
      if (marriedToDeleted) {
        // Remove os cônjuges excluídos da lista de spouseIds
        const deletedSpouseNames = (person.spouseIds || [])
          .filter(spId => toDeleteIds.has(spId))
          .map(spId => {
            const sp = this.getCharacter(spId);
            return sp ? sp.name : "Desconhecido";
          });

        person.spouseIds = (person.spouseIds || []).filter(spId => !toDeleteIds.has(spId));

        // Se era uma esposa assimilada a outra casa, retoma sua Casa de Nascimento!
        if (person.birthHouseId && person.officialHouseId !== person.birthHouseId) {
          person.officialHouseId = person.birthHouseId;
        }

        const birthHouseObj = this.getHouse(person.birthHouseId);
        person.royalBranchStatus = `Retornou à ${birthHouseObj ? birthHouseObj.name : "Casa Natal"} (Linhagem Marital Excluída)`;

        // Marca permanentemente no perfil que foi ligada a uma linhagem excluída!
        person.linkedToExcludedLineage = {
          excludedRootName: rootName,
          excludedSpouseNames: deletedSpouseNames.join(", "),
          excludedHouseName: rootHouseName,
          revertedToHouseName: birthHouseObj ? birthHouseObj.name : "Casa de Nascimento",
          date: new Date().toLocaleDateString("pt-BR")
        };

        revertedWives.push(person.name);
      }
    });

    // Remove o personagem raiz e todos os seus descendentes
    this.data.characters = this.data.characters.filter(c => !toDeleteIds.has(c.id));

    // Limpa referências de pais ou gêmeos caso algum nó externo apontasse para eles
    this.data.characters.forEach(c => {
      if (toDeleteIds.has(c.fatherId)) c.fatherId = null;
      if (toDeleteIds.has(c.motherId)) c.motherId = null;
      if (toDeleteIds.has(c.twinOfId)) c.twinOfId = null;
    });

    const revertedMsg =
      revertedWives.length > 0
        ? ` Esposas que retomaram sua Casa de Nascimento e receberam o registro de linhagem excluída: ${revertedWives.join(", ")}.`
        : "";

    this.recordAuditLog(
      "LINHAGEM",
      "Exclusão de Árvore Genealógica",
      `Excluída Linhagem de ${rootName} (${toDeleteIds.size} pessoa(s))`,
      `O personagem "${rootName}" e toda a sua descendência (${descendants.length} descendentes) foram excluídos.${revertedMsg}`,
      snapshot
    );

    this.saveToStorage();
    return {
      success: true,
      deletedCount: toDeleteIds.size,
      revertedWives
    };
  }

  // --------------------------------------------------------------------------
  // Motor de Sucessão Real e Regência
  // Regras:
  // 1. Irmãos do rei têm prioridade na ordem de sucessão; caso assumam o trono,
  //    seus filhos e esposas passam a ser a Família Real, e os filhos do irmão
  //    tornam-se os novos herdeiros. A família do antigo rei passa a ser apenas
  //    "Familiares da Família Real" daquela casa.
  // 2. Se não houver irmãos do rei (ou na sucessão direta aos filhos):
  //    O príncipe que nasceu primeiro herda o trono, MAS só pode herdar a partir dos 18 anos.
  // 3. Caso não haja irmãos e o príncipe seja jovem demais (< 18), a Rainha (esposa do rei)
  //    governará como Rainha Regente até que seu herdeiro esteja pronto (18 anos).
  // 4. A princesa só será digna do trono quando NÃO houver sucessores homens
  //    (nem irmãos do rei, nem príncipes).
  // 5. Bastardos não entram na sucessão, SALVO se a autora ativou a Exceção de Bastardo!
  // --------------------------------------------------------------------------
  analyzeSuccessionForKing(kingId, customYear = null) {
    const king = this.getCharacter(kingId);
    if (!king) return null;

    const currentYear = customYear !== null ? Number(customYear) : Number(this.data.meta.currentYear);
    const house = this.getHouse(king.officialHouseId || king.birthHouseId);

    const isEligibleCandidate = char => {
      if (!char || char.isPlaceholderEmpty || !char.isAlive) return false;
      if (char.isBastard && !char.bastardLegitimizedByAuthor) return false;
      return true;
    };

    // 1. Irmãos homens do Rei (ordenados por nascimento: mais velho primeiro)
    const brothers = this.getSiblings(king)
      .filter(s => s.gender === "M" && isEligibleCandidate(s))
      .sort((a, b) => (a.birthYear || 9999) - (b.birthYear || 9999));

    // 2. Filhos homens do Rei (Príncipes elegíveis, ordenados pelo que nasceu primeiro)
    const sons = this.getChildren(king)
      .filter(c => c.gender === "M" && isEligibleCandidate(c))
      .sort((a, b) => (a.birthYear || 9999) - (b.birthYear || 9999));

    // 3. Filhas mulheres do Rei (Princesas elegíveis, ordenadas pela que nasceu primeiro)
    const daughters = this.getChildren(king)
      .filter(c => c.gender === "F" && isEligibleCandidate(c))
      .sort((a, b) => (a.birthYear || 9999) - (b.birthYear || 9999));

    // 4. Esposa viva do Rei (Rainha para possível Regência)
    const queens = (king.spouseIds || [])
      .map(id => this.getCharacter(id))
      .filter(sp => sp && sp.isAlive && !sp.isPlaceholderEmpty);
    const queenRegent = queens[0] || null;

    // Bastardos excluídos (para exibir explicação clara na tela)
    const excludedBastards = this.getChildren(king).filter(
      c => c.isBastard && !c.bastardLegitimizedByAuthor && !c.isPlaceholderEmpty
    );

    let outcomeType = "";
    let ruler = null;
    let heir = null;
    let regent = null;
    let yearsUntilMajority = 0;
    let explanation = "";

    // Verifica Prioridade dos Irmãos do Rei vs Primogenitura
    const useFraternalPriority = !house || house.successionLaw !== "primogeniture_strict";

    if (brothers.length > 0 && useFraternalPriority) {
      // Irmão do Rei assume o trono!
      ruler = brothers[0];
      const brotherSons = this.getChildren(ruler)
        .filter(c => c.gender === "M" && isEligibleCandidate(c))
        .sort((a, b) => (a.birthYear || 9999) - (b.birthYear || 9999));
      const brotherDaughters = this.getChildren(ruler)
        .filter(c => c.gender === "F" && isEligibleCandidate(c))
        .sort((a, b) => (a.birthYear || 9999) - (b.birthYear || 9999));

      heir = brotherSons[0] || brotherDaughters[0] || sons[0] || null;
      outcomeType = "BROTHER_PRIORITY";
      explanation =
        `Pela prioridade dos irmãos do rei na ordem de sucessão, o irmão "${ruler.name}" assume o trono. ` +
        `Sua esposa e filhos passam a ser a Família Real ativa (sendo ${heir ? `"${heir.name}" o novo herdeiro` : "seus filhos os novos herdeiros"}), ` +
        `enquanto a viúva e filhos de ${king.name} tornam-se apenas familiares da família real da ${house ? house.name : "Casa"}.`;
    } else if (sons.length > 0) {
      // Não há irmãos do rei (ou sucessão direta para o príncipe que nasceu primeiro)
      const eldestPrince = sons[0];
      const princeAge = currentYear - (eldestPrince.birthYear || currentYear);

      if (princeAge >= 18) {
        ruler = eldestPrince;
        heir = sons[1] || daughters[0] || null;
        outcomeType = "PRINCE_MAJORITY";
        explanation =
          `O príncipe primogênito "${eldestPrince.name}" tem ${princeAge} anos (maior de 18 anos) e herda o trono diretamente!`;
      } else {
        // Príncipe tem menos de 18 anos e não há irmãos do rei!
        yearsUntilMajority = 18 - princeAge;
        heir = eldestPrince;
        if (queenRegent) {
          ruler = queenRegent;
          regent = queenRegent;
          outcomeType = "QUEEN_REGENCY";
          explanation =
            `Não há irmãos vivos do rei e o príncipe primogênito "${eldestPrince.name}" tem apenas ${princeAge} anos (menos de 18). ` +
            `A Rainha "${queenRegent.name}" (esposa do rei) governa como Rainha Regente por mais ${yearsUntilMajority} ano(s), até que o príncipe complete 18 anos no ano ${(eldestPrince.birthYear || currentYear) + 18}!`;
        } else {
          ruler = eldestPrince;
          outcomeType = "PRINCE_MINOR_NO_QUEEN";
          explanation =
            `O príncipe primogênito "${eldestPrince.name}" tem ${princeAge} anos (< 18), mas não há irmãos do rei nem rainha consorte viva; aguarda maioridade sob conselho até ${(eldestPrince.birthYear || currentYear) + 18}.`;
        }
      }
    } else if (brothers.length > 0) {
      ruler = brothers[0];
      outcomeType = "BROTHER_FALLBACK";
      explanation = `Sem filhos homens legítimos, o irmão do rei "${ruler.name}" assume a coroa.`;
    } else if (daughters.length > 0) {
      // Princesa herda somente quando NÃO há sucessores homens (nem irmãos do rei, nem príncipes)!
      const eldestPrincess = daughters[0];
      ruler = eldestPrincess;
      heir = daughters[1] || null;
      outcomeType = "PRINCESS_NO_MALES";
      explanation =
        `Não existem sucessores homens legítimos (nem irmãos do rei, nem príncipes). ` +
        `Portanto, a princesa "${eldestPrincess.name}" torna-se digna do trono e herda a coroa!`;
    } else {
      outcomeType = "NO_HEIR";
      explanation = `Crise de Sucessão: Não foram encontrados irmãos vivos, príncipes ou princesas legítimos para suceder ${king.name}.`;
    }

    return {
      king,
      currentYear,
      outcomeType,
      ruler,
      heir,
      regent,
      yearsUntilMajority,
      brothers,
      sons,
      daughters,
      excludedBastards,
      explanation
    };
  }

  // Aplica oficialmente a Sucessão Real nos dados dos personagens e registra no histórico CASA
  applyKingSuccession(kingId, customDeathYear = null) {
    const king = this.getCharacter(kingId);
    if (!king) return { success: false, message: "Rei não encontrado." };

    const snapshot = this.createSnapshot();
    const effectiveYear = customDeathYear ? Number(customDeathYear) : Number(this.data.meta.currentYear);

    // Marca a morte do rei caso ainda estivesse vivo
    if (king.isAlive) {
      king.isAlive = false;
      king.deathYear = effectiveYear;
      if (!king.deathCause || king.deathCause === "Vivo") {
        king.deathCause = `Faleceu no ano ${effectiveYear}, desencadeando a sucessão real.`;
      }
    }
    this.data.meta.currentYear = Math.max(this.data.meta.currentYear, effectiveYear);

    const analysis = this.analyzeSuccessionForKing(kingId, effectiveYear);
    if (!analysis || !analysis.ruler) {
      return { success: false, message: analysis ? analysis.explanation : "Sem sucessor." };
    }

    king.royalBranchStatus = `Antigo Rei (Falecido em ${king.deathYear || effectiveYear})`;

    if (analysis.outcomeType === "BROTHER_PRIORITY" || analysis.outcomeType === "BROTHER_FALLBACK") {
      const newKing = analysis.ruler;
      newKing.socialRank = "rei";
      newKing.royalBranchStatus = "Rei Atual (Assumiu por Prioridade de Irmão do Rei)";
      newKing.customTrajectoryEvents = newKing.customTrajectoryEvents || [];
      newKing.customTrajectoryEvents.push(`${effectiveYear}: Assumiu o trono após a morte do irmão ${king.name}.`);

      // Esposa e filhos do irmão passam a ser a Família Real ativa e novos herdeiros!
      (newKing.spouseIds || []).forEach(spId => {
        const sp = this.getCharacter(spId);
        if (sp) {
          sp.royalBranchStatus = `Família Real Ativa (Rainha Consorte de ${newKing.name})`;
        }
      });

      const newKingChildren = this.getChildren(newKing.id);
      newKingChildren.forEach((child, idx) => {
        if (!child.isBastard || child.bastardLegitimizedByAuthor) {
          child.socialRank = "principe";
          child.royalBranchStatus =
            idx === 0 && child.gender === "M"
              ? `Novo Príncipe Herdeiro (Filho do Rei ${newKing.name})`
              : `Família Real Ativa (Filho(a) do Rei ${newKing.name})`;
        }
      });

      // A família que perdeu o marido (antigo rei) passa a ser apenas "Familiares da Família Real"
      (king.spouseIds || []).forEach(spId => {
        const widow = this.getCharacter(spId);
        if (widow) {
          widow.royalBranchStatus = `Familiar da Família Real (Viúva do Antigo Rei ${king.name})`;
        }
      });
      this.getChildren(king.id).forEach(child => {
        if (!child.isBastard || child.bastardLegitimizedByAuthor) {
          child.royalBranchStatus = `Familiar da Família Real (Ramo do Antigo Rei ${king.name})`;
        }
      });
    } else if (analysis.outcomeType === "QUEEN_REGENCY") {
      const regentQueen = analysis.regent;
      const minorPrince = analysis.heir;
      regentQueen.royalBranchStatus = `Rainha Regente (Governando até ${minorPrince.name} completar 18 anos)`;
      regentQueen.customTrajectoryEvents = regentQueen.customTrajectoryEvents || [];
      regentQueen.customTrajectoryEvents.push(
        `${effectiveYear}: Assumiu a Regência do Trono até que seu filho ${minorPrince.name} alcance 18 anos.`
      );
      minorPrince.royalBranchStatus = `Príncipe Herdeiro Menor de Idade (Sob Regência da Mãe ${regentQueen.name})`;
    } else if (analysis.outcomeType === "PRINCE_MAJORITY") {
      const newKing = analysis.ruler;
      newKing.socialRank = "rei";
      newKing.royalBranchStatus = `Rei Atual (Sucessor Primogênito de ${king.name})`;
      newKing.customTrajectoryEvents = newKing.customTrajectoryEvents || [];
      newKing.customTrajectoryEvents.push(`${effectiveYear}: Herdou o trono aos ${effectiveYear - newKing.birthYear} anos.`);
    } else if (analysis.outcomeType === "PRINCESS_NO_MALES") {
      const newQueenRegnant = analysis.ruler;
      newQueenRegnant.socialRank = "rei";
      newQueenRegnant.royalBranchStatus = `Rainha Soberana (Herdou por ausência de sucessores homens)`;
      newQueenRegnant.customTrajectoryEvents = newQueenRegnant.customTrajectoryEvents || [];
      newQueenRegnant.customTrajectoryEvents.push(
        `${effectiveYear}: Coroada Rainha Soberana na ausência de irmãos do rei ou príncipes.`
      );
    }

    this.recordAuditLog(
      "CASA",
      "Transição de Trono & Sucessão Real",
      `Sucessão de ${king.name} (${effectiveYear}) -> ${analysis.ruler.name}`,
      analysis.explanation,
      snapshot
    );

    this.saveToStorage();
    return { success: true, analysis };
  }
}

window.worldEngine = new WorldEngine();
