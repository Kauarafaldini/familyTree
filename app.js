// ============================================================================
// APP.JS - Interface do Códice & Livro das Linhagens Reais
// Estética de História Antiga, Camafeus Heráldicos e Crônicas Nobiliárquicas
// ============================================================================

const FANTASY_MONTHS = [
  { num: 1, name: "Geada das Sombras", season: "Inverno Profundo", days: 30 },
  { num: 2, name: "Degelo dos Montes", season: "Fim do Inverno", days: 30 },
  { num: 3, name: "Semeadura da Terra", season: "Primavera Nascente", days: 30 },
  { num: 4, name: "Florescência dos Vales", season: "Primavera Plena", days: 30 },
  { num: 5, name: "Solstício das Vinhas", season: "Transição do Verão", days: 30 },
  { num: 6, name: "Sol Alto", season: "Verão Dourado", days: 30 },
  { num: 7, name: "Grande Colheita", season: "Verão Tardio", days: 30 },
  { num: 8, name: "Vindima Real", season: "Outono Inicial", days: 30 },
  { num: 9, name: "Folhas Douradas", season: "Outono Médio", days: 30 },
  { num: 10, name: "Brumas Ancestrais", season: "Outono Tardio", days: 30 },
  { num: 11, name: "Ventos Uivantes", season: "Início do Inverno", days: 30 },
  { num: 12, name: "Noite Longa", season: "Solstício de Inverno", days: 30 }
];

const TIMELINE_CATEGORIES = {
  war: { label: "Guerras & Conflitos", icon: "⚔️", color: "#ef4444", badgeClass: "badge-war" },
  battle: { label: "Batalhas", icon: "🛡️", color: "#f97316", badgeClass: "badge-war" },
  birth: { label: "Nascimentos Ilustres", icon: "🌱", color: "#10b981", badgeClass: "badge-birth" },
  death: { label: "Mortes & Martírios", icon: "🪦", color: "#a855f7", badgeClass: "badge-death" },
  coronation: { label: "Coroações & Tronos", icon: "👑", color: "#eab308", badgeClass: "badge-coronation" },
  wedding: { label: "Matrimônios Reais", icon: "💍", color: "#ec4899", badgeClass: "badge-wedding" },
  foundation: { label: "Fundações & Tratados", icon: "🏰", color: "#06b6d4", badgeClass: "badge-foundation" },
  arcane: { label: "Fenômenos Arcanos", icon: "✨", color: "#8b5cf6", badgeClass: "badge-arcane" },
  general: { label: "Crônica Geral", icon: "📜", color: "#d97706", badgeClass: "badge-bastard" }
};

class FantasyGenealogyApp {
  constructor() {
    this.engine = window.worldEngine;
    this.activeTab = "tab-tree";
    this.zoomLevel = 1.0;
    this.activeGrimoireCategory = "ALL";
    this.activeHistoryFilter = "ALL";

    // Estado da Cartografia
    this.selectedTerritoryId =
      (this.engine.data.territories[0] && this.engine.data.territories[0].id) || null;
    this.isMapEditMode = false; // Começa sempre em Modo de Exibição
    this.mapTool = "select"; // select, draw_mountain, draw_tree, draw_road, draw_river, add_capital, add_city
    this.showContinentNames = true; // Exibe ou oculta os nomes dos continentes no mapa
    this.selectedSettlementId = null;
    this.draggingSettlement = null;
    this.isDrawingMap = false;
    this.draggingPinId = null;
    this.hoveredMapHandle = null;
    this.draggingVertex = null;
    this.draggingTerritory = null;
    this.mapZoom = 1.0;
    this.mapPanX = 0;
    this.mapPanY = 0;
    this.isPanningMap = false;
    this.panStartX = 0;
    this.panStartY = 0;
    this.initialPanX = 0;
    this.initialPanY = 0;

    // Estado da Cronologia & Linha do Tempo
    this.timelineZoom = 1.0;
    this.timelineZoomMode = "year"; // "year", "month", "day"
    this.timelineCategoryFilter = "ALL";
    this.timelineSearchQuery = "";
    this.timelineHouseFilter = "ALL";
    this.timelineTerritoryFilter = "ALL";
    this.timelineIncludeCharLifeEvents = true;
    this.timelineSortOrder = "asc"; // "asc" ou "desc"
    this.selectedMilestoneId = null;

    this.init();
  }

  init() {
    this.syncHeaderAndBadges();
    this.populateFilterControls();
    this.renderTree();
    this.renderHousesAndSuccessionTab();
    this.renderTimeline();
    this.renderGrimoire();
    this.initMapCanvasEvents();
    this.initTimelineEvents();
    this.renderMapStudio();
    this.renderAuditHistory();

    window.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        this.closeResidentsDrawer();
        this.closeModal();
      }
    });
    window.updateDbStatusUi = (status, message) => {
      const dot = document.getElementById("dbStatusDot");
      const txt = document.getElementById("dbStatusText");
      const badge = document.getElementById("dbStatusBadge");
      if (!dot || !txt) return;

      dot.className = "db-status-dot " + (status || "offline");
      if (status === "connected") {
        txt.textContent = "MongoDB Atlas";
        if (badge) badge.title = `🟢 Conectado ao MongoDB Atlas via PHP\n${message || ''}`;
      } else if (status === "syncing") {
        txt.textContent = "Sincronizando...";
        if (badge) badge.title = `🟡 Sincronizando com MongoDB Atlas...\n${message || ''}`;
      } else if (status === "offline") {
        txt.textContent = "Modo Local";
        if (badge) badge.title = `🔴 PHP / MongoDB não detectado.\nRodando localmente.\nExecute start-server.bat para sincronizar com o MongoDB.`;
      } else {
        txt.textContent = "MongoDB (PHP)";
      }
    };
  }

  // --------------------------------------------------------------------------
  // Sincronização Geral e Navegação de Capítulos
  // --------------------------------------------------------------------------
  renderAll() {
    this.syncHeaderAndBadges();
    this.populateFilterControls();
    this.renderTree();
    this.renderHousesAndSuccessionTab();
    this.renderTimeline();
    this.renderGrimoire();
    this.renderMapStudio();
    this.renderAuditHistory();
  }

  async syncDatabaseNow() {
    if (typeof this.showToast === "function") {
      this.showToast("Sincronizando com MongoDB Atlas via PHP...");
    }
    const ok = await this.engine.fetchFromDatabase();
    if (ok) {
      if (typeof this.showToast === "function") {
        this.showToast("Mundo sincronizado com MongoDB Atlas!");
      }
    } else {
      this.openDatabaseModal();
    }
  }

  openDatabaseModal() {
    const isOnline = this.engine.dbStatus === "connected";
    const bodyHtml = `
      <div class="card-box" style="padding:16px; margin-bottom:14px; border-left:4px solid ${isOnline ? '#10b981' : '#f59e0b'};">
        <h4 style="color:var(--gold-leaf); font-family:var(--font-display); margin-bottom:8px;">
          ${isOnline ? '🟢 MongoDB Atlas Conectado' : '🟡 Conexão com MongoDB Atlas via PHP'}
        </h4>
        <p style="font-size:0.92rem; color:var(--ink-secondary); line-height:1.6;">
          <strong>Banco de Dados:</strong> MongoDB Atlas (Database: <code>familytree</code>)<br/>
          <strong>Cluster:</strong> <code>familytree.lhbb3e2.mongodb.net</code><br/>
          <strong>Driver:</strong> PHP 8.3 com extensão oficial <code>mongodb</code> (ext-mongodb)<br/>
          <strong>Status da Conexão:</strong> ${this.escapeHtml(this.engine.dbMessage || 'Aguardando')}
        </p>
      </div>
      <div style="font-size:0.88rem; color:var(--ink-dim); line-height:1.6;">
        <p><strong>Como funciona a persistência em tempo real:</strong></p>
        <ul style="padding-left:18px; margin-top:6px;">
          <li>Cada personagem, casa dinástica, continente, evento e criação é salvo imediatamente no seu MongoDB Atlas.</li>
          <li>Os dados estão organizados no banco nas coleções <code>world_state</code>, <code>characters</code>, <code>houses</code>, <code>territories</code>, <code>timeline</code> e <code>creations</code>.</li>
          <li>Inicie o servidor local executando <code>start-server.bat</code> ou com o comando <code>php -S localhost:8000</code>.</li>
        </ul>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-medieval" onclick="app.closeModal()">Fechar</button>
      <button class="btn btn-gold" onclick="app.syncDatabaseNow(); app.closeModal();">Sincronizar Agora</button>
    `;

    this.showModal("Conexão MongoDB via PHP", bodyHtml, footerHtml);
  }

  syncHeaderAndBadges() {
    const d = this.engine.data;
    const titleEl = document.getElementById("worldTitleDisplay");
    if (titleEl) titleEl.textContent = d.meta.worldTitle || "Crônicas & Linhagens";

    const yrInput = document.getElementById("currentYearInput");
    if (yrInput) yrInput.value = d.meta.currentYear || 1000;

    const activeChars = d.characters.filter(c => !c.isPlaceholderEmpty).length;
    const bChar = document.getElementById("badgeCharCount");
    const bHouse = document.getElementById("badgeHouseCount");
    const bTimeline = document.getElementById("badgeTimelineCount");
    const bCre = document.getElementById("badgeCreationCount");
    const bTerr = document.getElementById("badgeTerritoryCount");
    const bLog = document.getElementById("badgeLogCount");

    if (bChar) bChar.textContent = activeChars;
    if (bHouse) bHouse.textContent = d.houses.length;
    if (bTimeline) {
      const allEvents = this.getAllTimelineEvents ? this.getAllTimelineEvents() : (d.timelineMilestones || []);
      bTimeline.textContent = allEvents.length;
    }
    if (bCre) bCre.textContent = d.creations.length;
    if (bTerr) bTerr.textContent = d.territories.length;
    if (bLog) bLog.textContent = d.auditLogs.length;

    const btnLinhagem = document.getElementById("btnModeLinhagem");
    const btnTerritorio = document.getElementById("btnModeTerritorio");
    if (btnLinhagem && btnTerritorio) {
      if (d.meta.treeColorMode === "territorio") {
        btnLinhagem.classList.remove("active");
        btnTerritorio.classList.add("active");
      } else {
        btnLinhagem.classList.add("active");
        btnTerritorio.classList.remove("active");
      }
    }
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll(".tab-panel").forEach(panel => {
      panel.classList.toggle("active", panel.id === tabId);
    });
    document.querySelectorAll(".nav-tab").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
    });

    if (tabId === "tab-tree") this.renderTree();
    if (tabId === "tab-houses") this.renderHousesAndSuccessionTab();
    if (tabId === "tab-timeline") this.renderTimeline();
    if (tabId === "tab-grimoire") this.renderGrimoire();
    if (tabId === "tab-map") this.renderMapStudio();
    if (tabId === "tab-history") this.renderAuditHistory();
  }

  updateCurrentYear(newYear) {
    const yr = Number(newYear);
    if (!isNaN(yr) && yr > 0) {
      this.engine.data.meta.currentYear = yr;
      this.engine.saveToStorage();
      this.renderTree();
      this.renderHousesAndSuccessionTab();
    }
  }

  setTreeColorMode(mode) {
    this.engine.data.meta.treeColorMode = mode;
    this.engine.saveToStorage();
    this.syncHeaderAndBadges();
    this.renderTree();
  }

  populateFilterControls() {
    // 1. Datalist e Campo de Busca de Casa
    const houseDatalist = document.getElementById("houseFilterDatalist");
    if (houseDatalist) {
      houseDatalist.innerHTML = this.engine.data.houses
        .map(h => `<option value="${this.escapeHtml(h.name)}"></option>`)
        .join("");
    }
    const houseInput = document.getElementById("houseFilterInput");
    if (houseInput) {
      const currentHouseVal = this.engine.data.meta.selectedHouseFilter || "all";
      if (currentHouseVal === "all") {
        houseInput.value = "";
      } else {
        const foundH = this.engine.getHouse(currentHouseVal);
        houseInput.value = foundH ? foundH.name : currentHouseVal;
      }
    }

    // 2. Datalist e Campo de Busca de Raça
    const raceDatalist = document.getElementById("raceFilterDatalist");
    if (raceDatalist) {
      const races = this.engine.getRaces();
      raceDatalist.innerHTML = races
        .map(r => `<option value="${this.escapeHtml(r)}"></option>`)
        .join("");
    }
    const raceInput = document.getElementById("raceFilterInput");
    if (raceInput) {
      const currentRaceVal = this.engine.data.meta.selectedRaceFilter || "all";
      raceInput.value = currentRaceVal === "all" ? "" : currentRaceVal;
    }

    // 3. Suporte para select legado de Casas (se presente no DOM)
    const sel = document.getElementById("houseFilterSelect");
    if (sel) {
      const currentVal = this.engine.data.meta.selectedHouseFilter || "all";
      sel.innerHTML = `<option value="all">Todas as Casas e Linhagens</option>`;
      this.engine.data.houses.forEach(h => {
        const opt = document.createElement("option");
        opt.value = h.id;
        opt.textContent = `${h.name}${h.allowAvuncularMarriage ? " (Tradição Avuncular)" : ""}`;
        sel.appendChild(opt);
      });
      sel.value = currentVal;
    }
  }

  populateHouseFilterSelect() {
    this.populateFilterControls();
  }

  onHouseFilterInput(val) {
    const clean = (val || "").trim();
    this.engine.data.meta.selectedHouseFilter = clean ? clean : "all";
    this.engine.saveToStorage();
    this.renderTree();
  }

  clearHouseFilter() {
    const input = document.getElementById("houseFilterInput");
    if (input) input.value = "";
    this.onHouseFilterInput("");
  }

  setHouseFilter(houseId) {
    this.onHouseFilterInput(houseId);
    this.populateFilterControls();
  }

  onRaceFilterInput(val) {
    const clean = (val || "").trim();
    this.engine.data.meta.selectedRaceFilter = clean ? clean : "all";
    this.engine.saveToStorage();
    this.renderTree();
  }

  clearRaceFilter() {
    const input = document.getElementById("raceFilterInput");
    if (input) input.value = "";
    this.onRaceFilterInput("");
  }

  setRaceFilter(race) {
    this.onRaceFilterInput(race);
    this.populateFilterControls();
  }

  promptNewRace() {
    const bodyHtml = `
      <div class="form-group">
        <label>Nome da Nova Raça / Espécie:</label>
        <input
          type="text"
          id="modalNewRaceName"
          placeholder="Ex: Fada / Silfo, Quimera, Tritão, Draconiano..."
          class="input-medieval"
          style="width:100%;"
          onkeydown="if(event.key==='Enter') app.confirmNewRaceModal()"
        />
      </div>
      <div class="card-box" style="margin-top:12px; padding:12px;">
        <h4 style="font-family:var(--font-display); color:var(--gold-leaf); font-size:0.84rem; text-transform:uppercase; margin-bottom:6px;">
          Registro no Códice de Raças
        </h4>
        <p style="font-size:0.88rem; color:var(--ink-secondary); line-height:1.5;">
          A nova espécie será averbada no tomo, passando a constar imediatamente nos filtros de genealogia e nas opções de novos personagens.
        </p>
      </div>
      <div id="newRaceErrorMsg" style="display:none; margin-top:8px;" class="alert-banner alert-danger"></div>
    `;

    const footerHtml = `
      <button class="btn btn-medieval" onclick="app.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="app.confirmNewRaceModal()">Registrar Raça</button>
    `;

    this.showModal("Registrar Nova Raça no Códice", bodyHtml, footerHtml);
    setTimeout(() => {
      const inp = document.getElementById("modalNewRaceName");
      if (inp) inp.focus();
    }, 50);
  }

  confirmNewRaceModal() {
    const inp = document.getElementById("modalNewRaceName");
    const errBox = document.getElementById("newRaceErrorMsg");
    if (!inp) return;
    const clean = inp.value.trim();
    if (!clean) {
      if (errBox) {
        errBox.textContent = "Por favor, informe o nome da raça.";
        errBox.style.display = "block";
      }
      inp.focus();
      return;
    }
    const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1);
    this.engine.addRace(capitalized);
    this.populateFilterControls();
    const raceInput = document.getElementById("raceFilterInput");
    if (raceInput) raceInput.value = capitalized;
    this.onRaceFilterInput(capitalized);
    this.closeModal();
  }

  adjustZoom(delta) {
    this.zoomLevel = Math.min(1.5, Math.max(0.55, +(this.zoomLevel + delta).toFixed(2)));
    this.applyZoom();
  }

  resetZoom() {
    this.zoomLevel = 1.0;
    this.applyZoom();
  }

  applyZoom() {
    const stage = document.getElementById("grapeTreeStage");
    const label = document.getElementById("zoomLabel");
    if (stage) stage.style.transform = `scale(${this.zoomLevel})`;
    if (label) label.textContent = `${Math.round(this.zoomLevel * 100)}%`;
  }

  // --------------------------------------------------------------------------
  // ABA 1: RENDERIZAÇÃO DA ÁRVORE GENEALÓGICA EM CACHOS DESCENDENTES
  // --------------------------------------------------------------------------
  computeGrapeClusterLayout() {
    const d = this.engine.data;
    const rawHouseFilter = (d.meta.selectedHouseFilter || "all").trim();
    const rawRaceFilter = (d.meta.selectedRaceFilter || "all").trim();

    const normalizeText = str =>
      (str || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    const normHouseFilter = normalizeText(rawHouseFilter);
    const normRaceFilter = normalizeText(rawRaceFilter);

    // Identifica Casas correspondentes à busca digitada (por ID, Nome ou Brasão)
    let matchingHouseIds = null;
    if (normHouseFilter && normHouseFilter !== "all") {
      matchingHouseIds = new Set();
      d.houses.forEach(h => {
        const normHId = normalizeText(h.id);
        const normHName = normalizeText(h.name);
        const normSigil = normalizeText(h.sigilTitle);
        if (
          normHId === normHouseFilter ||
          normHName.includes(normHouseFilter) ||
          normSigil.includes(normHouseFilter)
        ) {
          matchingHouseIds.add(h.id);
        }
      });
      // Permite também casar ID exato direto se fornecido
      matchingHouseIds.add(rawHouseFilter);
    }

    // Filtra personagens visíveis por Casa e Raça
    let chars = d.characters.slice();
    if (matchingHouseIds !== null) {
      chars = chars.filter(
        c => (c.officialHouseId && matchingHouseIds.has(c.officialHouseId)) ||
             (c.birthHouseId && matchingHouseIds.has(c.birthHouseId))
      );
    }

    if (normRaceFilter && normRaceFilter !== "all") {
      chars = chars.filter(c => {
        const cRace = normalizeText(c.race || c.creatureType || "humano");
        return cRace.includes(normRaceFilter);
      });
    }

    const charIds = new Set(chars.map(c => c.id));

    // Calcula geração de cada personagem (de cima para baixo)
    const genMap = {};
    const computeGen = (c, depth = 0) => {
      if (!c || depth > 12) return 0;
      if (genMap[c.id] !== undefined) return genMap[c.id];
      let g = 0;
      if (c.fatherId && charIds.has(c.fatherId)) {
        g = Math.max(g, computeGen(this.engine.getCharacter(c.fatherId), depth + 1) + 1);
      }
      if (c.motherId && charIds.has(c.motherId)) {
        g = Math.max(g, computeGen(this.engine.getCharacter(c.motherId), depth + 1) + 1);
      }
      genMap[c.id] = g;
      return g;
    };

    chars.forEach(c => computeGen(c));

    // Alinha cônjuges na mesma geração (exceto avunculares)
    for (let pass = 0; pass < 3; pass++) {
      chars.forEach(c => {
        (c.spouseIds || []).forEach(spId => {
          if (!charIds.has(spId)) return;
          const isAvuncular = Boolean(this.engine.isAvuncularRelationship(c.id, spId));
          if (!isAvuncular) {
            const maxG = Math.max(genMap[c.id] || 0, genMap[spId] || 0);
            genMap[c.id] = maxG;
            genMap[spId] = maxG;
          }
        });
      });
      chars.forEach(c => {
        let parentMax = -1;
        if (c.fatherId && genMap[c.fatherId] !== undefined) parentMax = Math.max(parentMax, genMap[c.fatherId]);
        if (c.motherId && genMap[c.motherId] !== undefined) parentMax = Math.max(parentMax, genMap[c.motherId]);
        if (parentMax >= 0 && genMap[c.id] <= parentMax) {
          genMap[c.id] = parentMax + 1;
        }
      });
    }

    // Agrupa por Cacho / Casa Feudal Principal
    const getClusterHouseId = c => {
      if (matchingHouseIds !== null) {
        if (c.birthHouseId && matchingHouseIds.has(c.birthHouseId)) return c.birthHouseId;
        if (c.officialHouseId && matchingHouseIds.has(c.officialHouseId)) return c.officialHouseId;
      }
      if (c.spouseIds && c.spouseIds.length > 0) {
        for (const spId of c.spouseIds) {
          const sp = this.engine.getCharacter(spId);
          if (sp && this.engine.isNobleRank(sp.socialRank)) {
            return sp.officialHouseId || sp.birthHouseId;
          }
        }
      }
      if (c.fatherId) {
        const father = this.engine.getCharacter(c.fatherId);
        if (father) return father.officialHouseId || father.birthHouseId;
      }
      return c.officialHouseId || c.birthHouseId || "house_plebe";
    };

    const clustersByHouse = {};
    chars.forEach(c => {
      const hId = getClusterHouseId(c);
      if (!clustersByHouse[hId]) clustersByHouse[hId] = [];
      clustersByHouse[hId].push(c);
    });

    const positions = {};
    const clusterHeaders = [];
    let currentClusterOffsetX = 90;
    const NODE_SPACING_X = 182;
    const GEN_SPACING_Y = 220;
    const TOP_MARGIN_Y = 105;

    Object.keys(clustersByHouse).forEach(houseId => {
      const clusterChars = clustersByHouse[houseId];
      const houseObj = this.engine.getHouse(houseId);

      const rows = {};
      clusterChars.forEach(c => {
        const g = genMap[c.id] || 0;
        if (!rows[g]) rows[g] = [];
        rows[g].push(c);
      });

      let maxRowCount = 1;
      Object.keys(rows).forEach(gKey => {
        const rowList = rows[gKey];
        const ordered = [];
        const placed = new Set();

        rowList
          .sort((a, b) => (a.birthYear || 9999) - (b.birthYear || 9999))
          .forEach(person => {
            if (placed.has(person.id)) return;
            ordered.push(person);
            placed.add(person.id);
            (person.spouseIds || []).forEach(spId => {
              const sp = rowList.find(x => x.id === spId);
              if (sp && !placed.has(sp.id)) {
                ordered.push(sp);
                placed.add(sp.id);
              }
            });
          });

        rows[gKey] = ordered;
        if (ordered.length > maxRowCount) maxRowCount = ordered.length;
      });

      const clusterWidth = Math.max(maxRowCount * NODE_SPACING_X, 340);
      const clusterCenterX = currentClusterOffsetX + clusterWidth / 2;

      clusterHeaders.push({
        houseId,
        name: houseObj ? houseObj.name : "Linhagem",
        motto: houseObj ? houseObj.motto : "",
        color: houseObj ? houseObj.color : "#c5a059",
        allowAvuncular: houseObj ? houseObj.allowAvuncularMarriage : false,
        x: clusterCenterX,
        y: 26
      });

      Object.keys(rows).forEach(gKey => {
        const g = Number(gKey);
        const rowChars = rows[gKey];
        const rowWidth = (rowChars.length - 1) * NODE_SPACING_X;
        const startX = clusterCenterX - rowWidth / 2;

        rowChars.forEach((c, idx) => {
          const distFromCenter = Math.abs(idx - (rowChars.length - 1) / 2);
          const grapeArcOffsetY = Math.round(distFromCenter * 8);

          positions[c.id] = {
            x: startX + idx * NODE_SPACING_X,
            y: TOP_MARGIN_Y + g * GEN_SPACING_Y + grapeArcOffsetY,
            generation: g,
            clusterHouseId: houseId
          };
        });
      });

      currentClusterOffsetX += clusterWidth + 110;
    });

    const totalWidth = Math.max(1500, currentClusterOffsetX + 60);
    const maxGen = Math.max(0, ...Object.values(genMap));
    const totalHeight = Math.max(860, TOP_MARGIN_Y + (maxGen + 1) * GEN_SPACING_Y + 140);

    return { chars, positions, clusterHeaders, totalWidth, totalHeight };
  }

  renderTree() {
    const stage = document.getElementById("grapeTreeStage");
    const svg = document.getElementById("treeConnectionsSvg");
    const nodesContainer = document.getElementById("grapeNodesContainer");
    if (!stage || !svg || !nodesContainer) return;

    const { chars, positions, clusterHeaders, totalWidth, totalHeight } =
      this.computeGrapeClusterLayout();

    if (chars.length === 0) {
      svg.innerHTML = "";
      const isTotallyEmpty = (this.engine.data.characters || []).length === 0;
      nodesContainer.innerHTML = `
        <div style="position:absolute; left:50%; top:200px; transform:translateX(-50%); text-align:center; color:var(--ink-secondary); font-family:var(--font-serif); font-size:1.05rem; max-width:540px; padding:32px; background:rgba(20,16,12,0.95); border:1px solid var(--border-brass); border-radius:6px; box-shadow:0 8px 32px rgba(0,0,0,0.85);">
          <div style="font-size:2.6rem; margin-bottom:12px;">🌱</div>
          <h3 style="font-family:var(--font-display); color:var(--gold-leaf); margin-bottom:8px; font-size:1.25rem;">
            ${isTotallyEmpty ? "Inicie sua Árvore Genealógica" : "Nenhum Assento Encontrado"}
          </h3>
          <p style="color:var(--ink-dim); font-size:0.92rem; line-height:1.6;">
            ${isTotallyEmpty
              ? "Todos os dados mockados foram removidos com sucesso. O seu códice agora está conectado ao MongoDB Atlas pronto para receber personagens, linhagens e casas reais!"
              : "Nenhum membro atende simultaneamente aos filtros de Casa e Raça selecionados."}
          </p>
          <div style="margin-top:20px; display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
            ${isTotallyEmpty
              ? `<button class="btn btn-gold" onclick="app.openCharacterModal()">+ Iniciar Primeiro Personagem</button>
                 <button class="btn btn-medieval" onclick="app.openHouseModal()">+ Criar Primeira Casa</button>`
              : `<button class="btn btn-sm btn-gold" onclick="app.clearHouseFilter(); app.clearRaceFilter();">Restaurar Todas as Linhagens</button>`}
          </div>
        </div>
      `;
      return;
    }

    stage.style.width = `${totalWidth}px`;
    stage.style.height = `${totalHeight}px`;
    svg.setAttribute("viewBox", `0 0 ${totalWidth} ${totalHeight}`);
    svg.setAttribute("width", totalWidth);
    svg.setAttribute("height", totalHeight);

    // Linhas de Conexão no Pergaminho (Carmesim Nobre e Azul Real)
    let svgHtml = `
      <defs>
        <filter id="shadowMedieval" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.6"/>
        </filter>
        <filter id="glowPurple" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#a855f7" flood-opacity="0.85"/>
        </filter>
      </defs>
    `;

    // Tronco Heráldico Superior de cada Cacho
    clusterHeaders.forEach(ch => {
      svgHtml += `
        <path d="M ${ch.x} ${ch.y + 24} L ${ch.x} ${ch.y + 75}"
              stroke="${ch.color}" stroke-width="2.5" stroke-dasharray="4 3" opacity="0.6" />
      `;
    });

    const drawnMarriages = new Set();
    const drawnTwins = new Set();

    // A) Linhas de Aliança Matrimonial (Azul Real)
    chars.forEach(c => {
      const posA = positions[c.id];
      if (!posA) return;

      (c.spouseIds || []).forEach(spId => {
        const posB = positions[spId];
        if (!posB) return;
        const pairKey = [c.id, spId].sort().join("__");
        if (drawnMarriages.has(pairKey)) return;
        drawnMarriages.add(pairKey);

        const yA = posA.y + 53;
        const yB = posB.y + 53;
        const midX = (posA.x + posB.x) / 2;
        const midY = (yA + yB) / 2 - 14;

        const avuncular = this.engine.isAvuncularRelationship(c.id, spId);
        const mDetail = (c.marriageDetails && c.marriageDetails[spId]) || {};
        const isAvuncular = Boolean(avuncular || mDetail.isAvuncular);

        if (isAvuncular) {
          // Trança de União Avuncular (Azul-Real e Ouro Envelhecido)
          svgHtml += `
            <path d="M ${posA.x} ${yA} Q ${midX} ${midY} ${posB.x} ${yB}"
                  fill="none" stroke="#294873" stroke-width="3.5" filter="url(#shadowMedieval)" />
            <path d="M ${posA.x} ${yA} Q ${midX} ${midY} ${posB.x} ${yB}"
                  fill="none" stroke="#c5a059" stroke-width="2" stroke-dasharray="6 5" />
            <rect x="${midX - 70}" y="${midY - 11}" width="140" height="20" rx="2"
                  fill="#1c1611" stroke="#c5a059" stroke-width="1.2" />
            <text x="${midX}" y="${midY + 3}" fill="#dfba73" font-family="Cinzel, serif" font-size="9" font-weight="600" text-anchor="middle" letter-spacing="0.5">
              Matrimônio Avuncular (${mDetail.year || "Linhagem"})
            </text>
          `;
        } else {
          // Casamento Nobre Padrão (Linha Azul-Real com Selo Central)
          svgHtml += `
            <path d="M ${posA.x} ${yA} Q ${midX} ${midY} ${posB.x} ${yB}"
                  fill="none" stroke="#294873" stroke-width="3" filter="url(#shadowMedieval)" />
            <circle cx="${midX}" cy="${midY + 3}" r="7" fill="#18130e" stroke="#294873" stroke-width="1.8" />
            <circle cx="${midX}" cy="${midY + 3}" r="3" fill="#c5a059" />
          `;
        }
      });
    });

    // B) Linhas de Sangue (Carmesim Heráldico: Pais -> Filhos e Irmãos)
    chars.forEach(child => {
      const childPos = positions[child.id];
      if (!childPos) return;

      const fatherPos = child.fatherId ? positions[child.fatherId] : null;
      const motherPos = child.motherId ? positions[child.motherId] : null;
      const childTopY = childPos.y;

      if (fatherPos && motherPos) {
        const originX = (fatherPos.x + motherPos.x) / 2;
        const originY = (fatherPos.y + motherPos.y) / 2 + 53;
        const ctrlY1 = originY + (childTopY - originY) * 0.45;
        const ctrlY2 = originY + (childTopY - originY) * 0.65;

        svgHtml += `
          <path d="M ${originX} ${originY} C ${originX} ${ctrlY1}, ${childPos.x} ${ctrlY2}, ${childPos.x} ${childTopY}"
                fill="none" stroke="#c81e32" stroke-width="2.6"
                ${child.isBastard ? 'stroke-dasharray="5 4"' : ""}
                filter="url(#shadowMedieval)" />
        `;
      } else if (fatherPos || motherPos) {
        const pPos = fatherPos || motherPos;
        const originX = pPos.x;
        const originY = pPos.y + 106;
        const ctrlY = (originY + childTopY) / 2;

        svgHtml += `
          <path d="M ${originX} ${originY} C ${originX} ${ctrlY}, ${childPos.x} ${ctrlY}, ${childPos.x} ${childTopY}"
                fill="none" stroke="#c81e32" stroke-width="2.6"
                ${child.isBastard ? 'stroke-dasharray="5 4"' : ""}
                filter="url(#shadowMedieval)" />
        `;
      }

      // Traço Púrpura/Roxo de Gêmeos (Fácil Visualização)
      if (child.twinOfId && positions[child.twinOfId]) {
        const twinKey = [child.id, child.twinOfId].sort().join("__");
        if (!drawnTwins.has(twinKey)) {
          drawnTwins.add(twinKey);
          const tPos = positions[child.twinOfId];
          const midX = (childPos.x + tPos.x) / 2;
          const topY = Math.min(childPos.y, tPos.y) + 12;
          svgHtml += `
            <path d="M ${childPos.x} ${childPos.y + 16} Q ${midX} ${topY - 26} ${tPos.x} ${tPos.y + 16}"
                  fill="none" stroke="#a855f7" stroke-width="3.2" filter="url(#glowPurple)" />
          `;
        }
      }

      // Conexão Fraterna Sutil entre Irmãos
      const siblings = this.engine.getSiblings(child);
      siblings.forEach(sib => {
        if (child.twinOfId === sib.id) return;
        const sibPos = positions[sib.id];
        if (!sibPos) return;
        const sibKey = ["sib", ...[child.id, sib.id].sort()].join("__");
        if (drawnTwins.has(sibKey)) return;
        drawnTwins.add(sibKey);

        const topA = childPos.y + 6;
        const topB = sibPos.y + 6;
        const midX = (childPos.x + sibPos.x) / 2;
        const archY = Math.min(topA, topB) - 16;

        svgHtml += `
          <path d="M ${childPos.x} ${topA} Q ${midX} ${archY} ${sibPos.x} ${topB}"
                fill="none" stroke="#c81e32" stroke-width="1.4" opacity="0.45" />
        `;
      });
    });

    svg.innerHTML = svgHtml;

    // Cabeçalhos Heráldicos & Medalhões dos Personagens
    let nodesHtml = "";

    clusterHeaders.forEach(ch => {
      nodesHtml += `
        <div class="cluster-header-vine" style="left:${ch.x}px; top:${ch.y}px; border-color:${ch.color};">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${ch.color};"></span>
          <span>${this.escapeHtml(ch.name)}</span>
          ${ch.allowAvuncular ? `<span class="badge-pill badge-avuncular" style="margin:0;">Tradição Avuncular</span>` : ""}
        </div>
      `;
    });

    const colorMode = this.engine.data.meta.treeColorMode || "linhagem";
    const currentYear = Number(this.engine.data.meta.currentYear) || 1248;

    chars.forEach(c => {
      const pos = positions[c.id];
      if (!pos) return;

      const clusterHouseId = pos.clusterHouseId;
      // Ligação de sangue da família:
      // Se a pessoa nasceu nesta família (birthHouseId === clusterHouseId), é de sangue (bolinha vermelha).
      // Se for de outra família que aparece nesta árvore, é bolinha azul.
      const isBloodOfCurrentFamily = Boolean(
        (c.birthHouseId && c.birthHouseId === clusterHouseId) ||
        (!c.birthHouseId && c.officialHouseId === clusterHouseId)
      );

      const sphereClass = isBloodOfCurrentFamily ? "sphere-blood" : "sphere-external";
      const ringColor = isBloodOfCurrentFamily ? "#dc2626" : "#2563eb";
      const sphereTooltip = isBloodOfCurrentFamily
        ? "Membro de Sangue da Família"
        : "Membro de Outra Família (Origem Externa)";

      if (c.isPlaceholderEmpty) {
        nodesHtml += `
          <div class="grape-node-wrapper" style="left:${pos.x}px; top:${pos.y}px;">
            <div class="grape-sphere empty-placeholder">
              <button class="sphere-info-btn" style="position:static;transform:none;" onclick="app.openCharacterModal('${c.id}')">
                Preencher
              </button>
            </div>
            <div class="grape-caption">
              <div class="grape-name" style="color:#806f58;">[Assento Vago]</div>
            </div>
          </div>
        `;
        return;
      }

      const portraitSrc = this.getCharacterPortraitSrc(c);
      const displayName = this.engine.cleanCharacterName ? this.engine.cleanCharacterName(c.name) : c.name;

      nodesHtml += `
        <div class="grape-node-wrapper" style="left:${pos.x}px; top:${pos.y}px;">
          <div class="grape-sphere ${sphereClass}"
               style="--ring-color:${ringColor};"
               title="${sphereTooltip}">

            <!-- CAMAFEU HERÁLDICO COM RETRATO (SEM NOME NO INTERIOR DO CÍRCULO) -->
            <div class="sphere-portrait-clip" onclick="app.onCharacterPhotoClick('${c.id}')" title="Clique para adicionar parentesco ou inspecionar códice">
              <img class="sphere-portrait-img" src="${portraitSrc}" alt="" />
            </div>

            <!-- Ações Rápidas Nobiliárquicas no Hover -->
            <div class="sphere-quick-actions">
              <button class="quick-dot-btn" title="Adicionar Parentesco (Pai, Padrasto, Irmão, Filho, Tio...)" onclick="app.openAddRelationshipModal('${c.id}')">+Parentesco</button>
              <button class="quick-dot-btn" title="Celebrar Casamento" onclick="app.openMarriageModal('${c.id}')">Casar</button>
              <button class="quick-dot-btn" title="Editar Registro" onclick="app.openCharacterModal('${c.id}')">Editar</button>
              <button class="quick-dot-btn danger" title="Verificação de Exclusão" onclick="app.openDeleteVerificationModal('${c.id}')">&times;</button>
            </div>
          </div>

          <!-- IDENTIFICAÇÃO GENEALÓGICA INFERIOR: SOMENTE NOME E SOBRENOME (SEM DATAS NEM CARGO) -->
          <div class="grape-caption" onclick="app.openProfileModal('${c.id}')" title="Inspecionar registro">
            <div class="grape-name">${this.escapeHtml(displayName)}</div>
          </div>
        </div>
      `;
    });

    nodesContainer.innerHTML = nodesHtml;
  }

  // Gera um camafeu em pintura clássica a óleo renascentista / iluminura medieval
  getCharacterPortraitSrc(c) {
    if (c && c.photoUrl && c.photoUrl.trim()) {
      return c.photoUrl;
    }

    const house = this.engine.getHouse(c.officialHouseId || c.birthHouseId);
    const robeColor = (house && house.color) || "#7a1d29";
    const isFemale = c.gender === "F";
    const rank = c.socialRank || "principe";

    let hairColor = "#26201a";
    let eyeColor = "#574229";
    const appText = (c.appearance || "").toLowerCase();
    if (appText.includes("prateado") || appText.includes("grisalho") || c.birthHouseId === "house_ravencrest") {
      hairColor = "#b8b2a8";
      eyeColor = "#3d577a";
    } else if (appText.includes("dourado") || appText.includes("louro") || appText.includes("trigo") || c.birthHouseId === "house_solarius") {
      hairColor = "#a37e3c";
      eyeColor = "#785b2b";
    } else if (appText.includes("ruiv") || appText.includes("avermelhad")) {
      hairColor = "#6e291b";
      eyeColor = "#324d38";
    }

    let headgearSvg = "";

    const hairBackSvg = isFemale
      ? `<path d="M 27 42 Q 22 75 29 95 L 71 95 Q 78 75 73 42 Q 50 20 27 42 Z" fill="${hairColor}"/>`
      : `<path d="M 30 42 Q 27 65 31 78 L 69 78 Q 73 65 70 42 Q 50 22 30 42 Z" fill="${hairColor}"/>`;

    const hairFrontSvg = isFemale
      ? `<path d="M 31 38 Q 50 26 69 38 Q 62 30 50 32 Q 38 30 31 38 Z" fill="${hairColor}"/>`
      : `<path d="M 31 39 Q 50 27 69 39 Q 64 29 50 30 Q 36 29 31 39 Z" fill="${hairColor}"/>`;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <radialGradient id="vignette" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#3b3024"/>
          <stop offset="85%" stop-color="#19130d"/>
          <stop offset="100%" stop-color="#0d0a07"/>
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="url(#vignette)"/>
      ${hairBackSvg}
      <path d="M 17 100 Q 23 74 50 74 Q 77 74 83 100 Z" fill="${robeColor}" stroke="#a88544" stroke-width="1.2"/>
      <path d="M 37 75 L 50 96 L 63 75" fill="#1b1612" stroke="#c5a059" stroke-width="1"/>
      <rect x="44" y="60" width="12" height="16" rx="4" fill="#cfab84"/>
      <ellipse cx="50" cy="49" rx="16" ry="19" fill="#e0bea0"/>
      <circle cx="44" cy="48" r="1.8" fill="${eyeColor}"/>
      <circle cx="56" cy="48" r="1.8" fill="${eyeColor}"/>
      <path d="M 41 44 Q 44 43 47 44" fill="none" stroke="#3d3023" stroke-width="1.2"/>
      <path d="M 53 44 Q 56 43 59 44" fill="none" stroke="#3d3023" stroke-width="1.2"/>
      <path d="M 46 58 Q 50 60 54 58" fill="none" stroke="${isFemale ? "#7a2228" : "#57341e"}" stroke-width="1.4"/>
      ${hairFrontSvg}
      ${headgearSvg}
    </svg>`;

    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  triggerQuickPhotoUpload(charId) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const c = this.engine.getCharacter(charId);
        if (c) {
          c.photoUrl = ev.target.result;
          this.engine.saveToStorage();
          this.renderTree();
          this.openProfileModal(charId);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  clearCharacterPhoto(charId) {
    const c = this.engine.getCharacter(charId);
    if (c) {
      c.photoUrl = "";
      this.engine.saveToStorage();
      this.renderTree();
      this.openProfileModal(charId);
    }
  }

  handleModalPhotoFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const urlInput = document.getElementById("cf_photoUrl");
      if (urlInput) {
        urlInput.value = ev.target.result;
      }
    };
    reader.readAsDataURL(file);
  }

  // --------------------------------------------------------------------------
  // EDITO DE PERFIL (Dentro do Círculo)
  // --------------------------------------------------------------------------
  openProfileModal(charId, activeSubTab = "overview") {
    const c = this.engine.getCharacter(charId);
    if (!c) return;

    const birthHouse = this.engine.getHouse(c.birthHouseId);
    const officialHouse = this.engine.getHouse(c.officialHouseId);
    const territory = this.engine.getTerritory(c.livedInTerritoryId);
    const father = this.engine.getCharacter(c.fatherId);
    const mother = this.engine.getCharacter(c.motherId);
    const twin = this.engine.getCharacter(c.twinOfId);
    const spouses = (c.spouseIds || []).map(id => this.engine.getCharacter(id)).filter(Boolean);
    const children = this.engine.getChildren(c.id);
    const siblings = this.engine.getSiblings(c);

    const isAssimilatedWife =
      c.gender === "F" && c.birthHouseId && c.officialHouseId && c.birthHouseId !== c.officialHouseId;

    let bannersHtml = "";

    if (c.linkedToExcludedLineage) {
      const info = c.linkedToExcludedLineage;
      bannersHtml += `
        <div class="alert-banner alert-danger">
          <strong>Notificação de Linhagem Revogada:</strong><br/>
          Esta personagem esteve ligada matrimonialmente à linhagem de <strong>${this.escapeHtml(info.excludedRootName)}</strong>
          (${this.escapeHtml(info.excludedHouseName)}), que foi excluída do códice em ${info.date}.
          Conforme as regras do reino, ela <strong>retomou sua Casa de Nascimento (${this.escapeHtml(info.revertedToHouseName)})</strong>.
        </div>
      `;
    }

    if (c.isBastard) {
      bannersHtml += `
        <div class="alert-banner alert-warning" style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
          <div>
            <strong>Lembrança de Bastardo:</strong><br/>
            ${
              c.bastardLegitimizedByAuthor
                ? `Admitido na Casa <strong>${this.escapeHtml(officialHouse ? officialHouse.name : "")}</strong> e na ordem de herança por <strong>Exceção da Autora</strong>. O registro de bastardo permanece averbado.`
                : `Descendente fora dos padrões de matrimônio nobre. Desprovido de vínculo oficial com a dinastia ou herança.`
            }
          </div>
          <button class="btn btn-sm btn-gold" onclick="app.toggleBastardAuthorException('${c.id}')">
            ${c.bastardLegitimizedByAuthor ? "Revogar Concessão de Legitimidade" : "Conceder Exceção da Autora"}
          </button>
        </div>
      `;
    }

    if (c.inconsistencyJustifications && c.inconsistencyJustifications.length > 0) {
      bannersHtml += `
        <div class="alert-banner alert-info">
          <strong>Exceções & Deferimentos Registrados pela Autora:</strong>
          <ul style="margin-top:6px; padding-left:18px;">
            ${c.inconsistencyJustifications
              .map(j => `<li><em>${this.escapeHtml(j.context || "")}:</em> &ldquo;${this.escapeHtml(j.reason)}&rdquo; (${j.date})</li>`)
              .join("")}
          </ul>
        </div>
      `;
    }

    let subTabContentHtml = "";

    if (activeSubTab === "overview") {
      const portraitSrc = this.getCharacterPortraitSrc(c);
      subTabContentHtml = `
        <div class="card-box" style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
          <div style="width:86px; height:86px; border-radius:50%; overflow:hidden; border:2px solid var(--border-gold-bright); flex-shrink:0;">
            <img src="${portraitSrc}" alt="" style="width:100%; height:100%; object-fit:cover; display:block;" />
          </div>
          <div style="flex:1;">
            <div style="font-family:var(--font-display); font-size:1.05rem; font-weight:700; color:var(--gold-leaf); text-transform:uppercase;">${this.escapeHtml(c.name)}</div>
            <div style="font-size:0.88rem; color:var(--ink-secondary); font-style:italic;">${this.escapeHtml(c.royalBranchStatus || "Membro da Linhagem")} &bull; <strong>Raça:</strong> ${this.escapeHtml(c.race || "Humano")}</div>
            <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
              <button class="btn btn-sm btn-gold" onclick="app.triggerQuickPhotoUpload('${c.id}')">Substituir Retrato</button>
              ${
                c.photoUrl
                  ? `<button class="btn btn-sm btn-medieval" onclick="app.clearCharacterPhoto('${c.id}')">Restaurar Pintura Padrão</button>`
                  : ""
              }
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="card-box">
            <h2>Aparência & Porte</h2>
            <p style="font-size:0.92rem; line-height:1.55; color:var(--ink-parchment);">
              ${this.escapeHtml(c.appearance || "Nenhuma descrição física lavrada nos registros.")}
            </p>
          </div>
          <div class="card-box">
            <h2>Nascimento & Falecimento</h2>
            <p style="font-size:0.92rem; line-height:1.55;">
              <strong>Ano de Nascimento:</strong> ${c.birthYear || "Desconhecido"}<br/>
              <strong>Estado Atual:</strong> ${c.isAlive ? `Vivo (${this.engine.data.meta.currentYear - (c.birthYear || 0)} invernos)` : `Falecido no ano ${c.deathYear || "?"}`}<br/>
              <strong>Causa do Falecimento:</strong> ${this.escapeHtml(c.deathCause || (c.isAlive ? "Ainda vivo na narrativa" : "Não especificada"))}
            </p>
          </div>
        </div>

        <div class="form-row">
          <div class="card-box">
            <h2>Assento Feudal & Casas</h2>
            <p style="font-size:0.92rem; line-height:1.6;">
              <strong>Raça / Espécie:</strong> <span style="color:var(--gold-leaf); font-weight:700;">${this.escapeHtml(c.race || "Humano")}</span><br/>
              <strong>Feudo de Residência:</strong>
              ${
                territory
                  ? `<a href="javascript:void(0)" style="color:var(--gold-leaf);text-decoration:underline;" onclick="app.closeModal(); app.jumpToTerritoryOnMap('${territory.id}')">${this.escapeHtml(territory.name)} (Ver no Mapa)</a>`
                  : "Sem assento vinculado"
              }<br/>
              <strong>Casa de Nascimento:</strong> ${this.escapeHtml(birthHouse ? birthHouse.name : "Sem Dinastia")}<br/>
              <strong>Casa Oficial Vigente:</strong> ${this.escapeHtml(officialHouse ? officialHouse.name : "Sem Dinastia")}<br/>
              <strong>Condição Nobiliárquica:</strong> <span style="color:var(--gold-leaf);">${this.escapeHtml(c.royalBranchStatus || "Membro")}</span>
            </p>
          </div>

          <div class="card-box">
            <h2>Vínculos Nobiliárquicos</h2>
            <p style="font-size:0.92rem; line-height:1.6;">
              <strong>Pai:</strong> ${father ? `<a href="javascript:void(0)" style="color:#dfba73;" onclick="app.openProfileModal('${father.id}')">${this.escapeHtml(father.name)}</a>` : "&mdash;"}<br/>
              <strong>Mãe:</strong> ${mother ? `<a href="javascript:void(0)" style="color:#dfba73;" onclick="app.openProfileModal('${mother.id}')">${this.escapeHtml(mother.name)}</a>` : "&mdash;"}<br/>
              ${twin ? `<strong>Irmão(ã) Gêmeo(a):</strong> <a href="javascript:void(0)" style="color:#dfba73;" onclick="app.openProfileModal('${twin.id}')">${this.escapeHtml(twin.name)}</a><br/>` : ""}
              <strong>Cônjuge(s):</strong> ${
                spouses.length > 0
                  ? spouses.map(s => `<a href="javascript:void(0)" style="color:#7899c4;" onclick="app.openProfileModal('${s.id}')">${this.escapeHtml(s.name)}</a>`).join(", ")
                  : "Sem aliança matrimonial"
              }<br/>
              <strong>Descendência (${children.length}):</strong> ${
                children.length > 0
                  ? children.map(ch => `<a href="javascript:void(0)" style="color:var(--gold-leaf);" onclick="app.openProfileModal('${ch.id}')">${this.escapeHtml(ch.name)}</a>`).join(", ")
                  : "Nenhuma registrada"
              }<br/>
              <strong>Irmandade (${siblings.length}):</strong> ${
                siblings.length > 0
                  ? siblings.map(sb => `<a href="javascript:void(0)" style="color:var(--ink-secondary);" onclick="app.openProfileModal('${sb.id}')">${this.escapeHtml(sb.name)}</a>`).join(", ")
                  : "Nenhum irmão registrado"
              }
            </p>
          </div>
        </div>
      `;
    } else if (activeSubTab === "history") {
      subTabContentHtml = `
        <div class="card-box" style="border-left:3px solid ${birthHouse ? birthHouse.color : "#c5a059"};">
          <h2>História de Origem &bull; ${this.escapeHtml(birthHouse ? birthHouse.name : "Casa Natal")}</h2>
          <p class="sub-desc">
            ${
              isAssimilatedWife
                ? `Conforme o costume das casas reais, após as núpcias esta senhora ingressou oficialmente na ${this.escapeHtml(officialHouse ? officialHouse.name : "Casa do Esposo")}. Seu histórico natal na ${this.escapeHtml(birthHouse ? birthHouse.name : "Casa de Nascimento")} permanece preservado neste tomo:`
                : `Histórico individual e primeiros feitos na dinastia de origem:`
            }
          </p>
          <p style="font-size:0.95rem; line-height:1.65; color:var(--ink-parchment); white-space:pre-line;">
            ${this.escapeHtml(c.preMarriageHistory || "Nenhum registro anterior lavrado.")}
          </p>
        </div>

        <div class="card-box" style="border-left:3px solid ${officialHouse ? officialHouse.color : "#8b202e"};">
          <h2>Trajetória Oficial ${isAssimilatedWife ? `(Unida à ${this.escapeHtml(officialHouse ? officialHouse.name : "Casa do Esposo")} Pós-Matrimônio)` : "e Feitos Registrados"}</h2>
          <p style="font-size:0.92rem; line-height:1.6; color:var(--ink-secondary); margin-bottom:10px;">
            ${this.escapeHtml(c.postMarriageHistory || "Feitos e trajetória dinástica ao longo dos anos.")}
          </p>

          <h4 style="font-family:var(--font-display); font-size:0.8rem; color:var(--gold-leaf); text-transform:uppercase; margin-bottom:6px;">Anais & Acontecimentos Incorporados:</h4>
          ${
            c.customTrajectoryEvents && c.customTrajectoryEvents.length > 0
              ? `<ul style="padding-left:18px; font-size:0.92rem; line-height:1.65;">
                  ${c.customTrajectoryEvents.map(ev => `<li>${this.escapeHtml(ev)}</li>`).join("")}
                </ul>`
              : `<p style="font-size:0.86rem; color:var(--ink-dim); font-style:italic;">Nenhum marco cronológico registrado.</p>`
          }

          ${
            c.excludedMarriageExceptions && c.excludedMarriageExceptions.length > 0
              ? `<div class="alert-banner alert-warning" style="margin-top:12px;">
                  <strong>Exceções Deferidas (Eventos do esposo que não envolveram nem alteraram a trajetória da esposa):</strong>
                  <ul style="padding-left:18px; margin-top:4px;">
                    ${c.excludedMarriageExceptions.map(ex => `<li>${this.escapeHtml(ex)}</li>`).join("")}
                  </ul>
                </div>`
              : ""
          }
        </div>
      `;
    }

    const bodyHtml = `
      ${bannersHtml}

      <div style="background:#1a140e; border:1px solid var(--border-gold-subtle); padding:8px 12px; border-radius:3px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <span style="font-family:var(--font-serif); font-size:0.86rem; color:var(--ink-secondary);">Adicionar novos laços de sangue, casamento ou aliança a este assento:</span>
        <button class="btn btn-sm btn-gold" onclick="app.openAddRelationshipModal('${c.id}')" title="Adicionar pai, padrasto, irmão, filho, tio ou afins">
          🔗 Adicionar Parentesco
        </button>
      </div>

      <div class="profile-subtabs">
        <button class="profile-subtab-btn ${activeSubTab === "overview" ? "active" : ""}"
                onclick="app.openProfileModal('${c.id}', 'overview')">
          Aparência & Assento Feudal
        </button>
        <button class="profile-subtab-btn ${activeSubTab === "history" ? "active" : ""}"
                onclick="app.openProfileModal('${c.id}', 'history')">
          História & Trajetória Oficial
        </button>
      </div>

      ${subTabContentHtml}
    `;

    const footerHtml = `
      <button class="btn btn-sm btn-gold" onclick="app.openAddRelationshipModal('${c.id}')">+ Adicionar Parentesco</button>
      <button class="btn btn-sm btn-gold" onclick="app.openMarriageModal('${c.id}')">Casar</button>
      <button class="btn btn-sm btn-medieval" onclick="app.openCharacterModal('${c.id}')">Editar</button>
      <button class="btn btn-sm btn-danger" onclick="app.openDeleteVerificationModal('${c.id}')">Excluir</button>
      <button class="btn btn-sm btn-medieval" onclick="app.closeModal()">Fechar</button>
    `;

    this.showModal(`Assento de ${c.name}`, bodyHtml, footerHtml);
  }

  onCharacterPhotoClick(charId) {
    this.openProfileModal(charId);
  }

  openAddRelationshipModal(charId = null) {
    const chars = this.engine.data.characters.filter(c => !c.isPlaceholderEmpty);
    if (chars.length === 0) {
      alert("Nenhum personagem registrado no códice ainda.");
      return;
    }
    const current = (charId && this.engine.getCharacter(charId)) || chars[0];

    const charOpts = chars
      .map(c => `<option value="${c.id}" ${c.id === current.id ? "selected" : ""}>${this.escapeHtml(c.name)} (*${c.birthYear || "?"})</option>`)
      .join("");

    const otherCharOpts = chars
      .filter(c => c.id !== current.id)
      .map(c => `<option value="${c.id}">${this.escapeHtml(c.name)} (*${c.birthYear || "?"})</option>`)
      .join("");

    const races = this.engine.getRaces();
    const raceOpts = races
      .map(r => `<option value="${this.escapeHtml(r)}">${this.escapeHtml(r)}</option>`)
      .join("");

    const houseOpts = this.engine.data.houses
      .map(h => `<option value="${h.id}" ${h.id === (current.officialHouseId || current.birthHouseId) ? "selected" : ""}>${this.escapeHtml(h.name)}</option>`)
      .join("");

    const bodyHtml = `
      <div style="background:#17120c; border:1px solid var(--border-gold-subtle); padding:10px 14px; border-radius:3px; margin-bottom:12px;">
        <span style="font-family:var(--font-display); font-size:0.7rem; color:var(--gold-leaf); text-transform:uppercase; letter-spacing:0.5px;">Personagem em Foco:</span>
        <select id="rel_baseCharId" class="select-medieval" style="width:100%; font-size:0.95rem; margin-top:4px;" onchange="app.openAddRelationshipModal(this.value)">
          ${charOpts}
        </select>
      </div>

      <div class="form-group" style="margin-bottom:12px;">
        <label>Qual parentesco deseja adicionar a este personagem?</label>
        <select id="rel_type" class="select-medieval" style="width:100%; font-size:0.95rem;" onchange="app.onRelationshipTypeChange()">
          <option value="pai">Pai (Genitor)</option>
          <option value="mae">Mãe (Genitora)</option>
          <option value="padrasto">Padrasto (Casado com a Mãe)</option>
          <option value="madrasta">Madrasta (Casada com o Pai)</option>
          <option value="filho">Filho(a) Descendente</option>
          <option value="irmao">Irmão / Irmã</option>
          <option value="meio_irmao">Meio-Irmão / Meia-Irmã</option>
          <option value="tio">Tio / Tia</option>
          <option value="sobrinho">Sobrinho / Sobrinha</option>
          <option value="conjuge">Cônjuge / Consorte</option>
        </select>
      </div>

      <div class="profile-subtabs" style="margin-bottom:12px;">
        <button type="button" class="profile-subtab-btn active" id="relTabBtnExisting" onclick="app.setRelationshipMode('existing')">
          Vincular Personagem Existente
        </button>
        <button type="button" class="profile-subtab-btn" id="relTabBtnNew" onclick="app.setRelationshipMode('new')">
          + Criar Novo Parente
        </button>
      </div>

      <!-- Modo 1: Vincular Existente -->
      <div id="relSectionExisting">
        <div class="form-group">
          <label>Selecione o parente existente no códice:</label>
          <select id="rel_existingCharId" class="select-medieval" style="width:100%;">
            ${otherCharOpts || `<option value="">(Nenhum outro personagem disponível)</option>`}
          </select>
        </div>
      </div>

      <!-- Modo 2: Criar Novo Personagem -->
      <div id="relSectionNew" style="display:none; flex-direction:column; gap:10px;">
        <div class="form-row">
          <div class="form-group">
            <label>Nome do Novo Parente:</label>
            <input type="text" id="rel_newName" placeholder="Ex: Raymund Valmont" />
          </div>
          <div class="form-group">
            <label>Gênero:</label>
            <select id="rel_newGender">
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Ano de Nascimento (Aprox.):</label>
            <input type="number" id="rel_newBirthYear" value="${(current.birthYear || 1220) - 25}" />
          </div>
          <div class="form-group">
            <label>Raça / Espécie:</label>
            <select id="rel_newRace">
              ${raceOpts}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Casa Nobre / Origem:</label>
          <select id="rel_newHouse">
            ${houseOpts}
          </select>
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-medieval" onclick="app.closeModal()">Cancelar</button>
      <button class="btn btn-primary btn-confirm" onclick="app.confirmAddRelationship()">Confirmar Parentesco</button>
    `;

    this.showModal(`Adicionar Parentesco: ${current.name}`, bodyHtml, footerHtml);
    this.currentRelMode = "existing";
  }

  setRelationshipMode(mode) {
    this.currentRelMode = mode;
    const btnEx = document.getElementById("relTabBtnExisting");
    const btnNew = document.getElementById("relTabBtnNew");
    const secEx = document.getElementById("relSectionExisting");
    const secNew = document.getElementById("relSectionNew");

    if (mode === "existing") {
      if (btnEx) btnEx.classList.add("active");
      if (btnNew) btnNew.classList.remove("active");
      if (secEx) secEx.style.display = "block";
      if (secNew) secNew.style.display = "none";
    } else {
      if (btnEx) btnEx.classList.remove("active");
      if (btnNew) btnNew.classList.add("active");
      if (secEx) secEx.style.display = "none";
      if (secNew) secNew.style.display = "flex";
    }
  }

  onRelationshipTypeChange() {
    const relType = document.getElementById("rel_type")?.value || "pai";
    const genderSel = document.getElementById("rel_newGender");
    const birthInput = document.getElementById("rel_newBirthYear");
    const baseId = document.getElementById("rel_baseCharId")?.value;
    const base = baseId ? this.engine.getCharacter(baseId) : null;
    const bYear = (base && base.birthYear) ? Number(base.birthYear) : 1220;

    if (genderSel) {
      if (["pai", "padrasto"].includes(relType)) genderSel.value = "M";
      else if (["mae", "madrasta"].includes(relType)) genderSel.value = "F";
    }

    if (birthInput) {
      if (["pai", "mae", "padrasto", "madrasta", "tio"].includes(relType)) {
        birthInput.value = bYear - 25;
      } else if (["filho", "sobrinho"].includes(relType)) {
        birthInput.value = bYear + 25;
      } else {
        birthInput.value = bYear;
      }
    }
  }

  confirmAddRelationship() {
    const baseCharId = document.getElementById("rel_baseCharId")?.value;
    const baseChar = this.engine.getCharacter(baseCharId);
    if (!baseChar) return;

    const relType = document.getElementById("rel_type")?.value || "pai";
    const mode = this.currentRelMode || "existing";

    const snapshot = this.engine.createSnapshot();
    let relative = null;

    if (mode === "existing") {
      const relId = document.getElementById("rel_existingCharId")?.value;
      if (!relId) {
        alert("Selecione um personagem para vincular.");
        return;
      }
      relative = this.engine.getCharacter(relId);
    } else {
      const name = document.getElementById("rel_newName")?.value.trim();
      if (!name) {
        alert("Por favor, informe o nome do novo parente.");
        return;
      }
      const gender = document.getElementById("rel_newGender")?.value || "M";
      const birthYear = Number(document.getElementById("rel_newBirthYear")?.value) || 1200;
      const race = document.getElementById("rel_newRace")?.value || "Humano";
      const houseId = document.getElementById("rel_newHouse")?.value || baseChar.officialHouseId;

      relative = {
        id: "char_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        name,
        gender,
        birthYear,
        deathYear: null,
        isAlive: true,
        socialRank: baseChar.socialRank || "lorde",
        race,
        creatureType: race.toLowerCase(),
        birthHouseId: houseId,
        officialHouseId: houseId,
        livedInTerritoryId: baseChar.livedInTerritoryId || "terr_valoria",
        fatherId: null,
        motherId: null,
        spouseIds: [],
        marriageDetails: {},
        twinOfId: null,
        isBastard: false,
        bastardLegitimizedByAuthor: false,
        bastardAuthorNote: "",
        isPlaceholderEmpty: false,
        royalBranchStatus: "Familiar de " + baseChar.name,
        appearance: "Traços nobres da Casa.",
        deathCause: "Vivo",
        preMarriageHistory: `Parentesco adicionado com ${baseChar.name}.`,
        postMarriageHistory: "",
        customTrajectoryEvents: [],
        excludedMarriageExceptions: [],
        linkedToExcludedLineage: null,
        inconsistencyJustifications: []
      };
      this.engine.data.characters.push(relative);
    }

    if (!relative) return;

    const relLabels = {
      pai: "Pai",
      mae: "Mãe",
      padrasto: "Padrasto",
      madrasta: "Madrasta",
      filho: "Filho(a)",
      irmao: "Irmão(ã)",
      meio_irmao: "Meio-Irmão(ã)",
      tio: "Tio(a)",
      sobrinho: "Sobrinho(a)",
      conjuge: "Cônjuge"
    };

    if (relType === "pai") {
      baseChar.fatherId = relative.id;
    } else if (relType === "mae") {
      baseChar.motherId = relative.id;
    } else if (relType === "filho") {
      if (baseChar.gender === "F") {
        relative.motherId = baseChar.id;
        if (baseChar.spouseIds && baseChar.spouseIds[0]) relative.fatherId = baseChar.spouseIds[0];
      } else {
        relative.fatherId = baseChar.id;
        if (baseChar.spouseIds && baseChar.spouseIds[0]) relative.motherId = baseChar.spouseIds[0];
      }
    } else if (relType === "padrasto") {
      if (baseChar.motherId) {
        const mother = this.engine.getCharacter(baseChar.motherId);
        if (mother) {
          if (!mother.spouseIds.includes(relative.id)) mother.spouseIds.push(relative.id);
          if (!relative.spouseIds.includes(mother.id)) relative.spouseIds.push(mother.id);
          mother.marriageDetails = mother.marriageDetails || {};
          mother.marriageDetails[relative.id] = { year: (baseChar.birthYear || 1200) + 5, isNobleAssimilation: false, exceptions: [] };
        }
      }
    } else if (relType === "madrasta") {
      if (baseChar.fatherId) {
        const father = this.engine.getCharacter(baseChar.fatherId);
        if (father) {
          if (!father.spouseIds.includes(relative.id)) father.spouseIds.push(relative.id);
          if (!relative.spouseIds.includes(father.id)) relative.spouseIds.push(father.id);
          father.marriageDetails = father.marriageDetails || {};
          father.marriageDetails[relative.id] = { year: (baseChar.birthYear || 1200) + 5, isNobleAssimilation: false, exceptions: [] };
        }
      }
    } else if (relType === "irmao") {
      relative.fatherId = baseChar.fatherId;
      relative.motherId = baseChar.motherId;
    } else if (relType === "meio_irmao") {
      if (baseChar.fatherId) relative.fatherId = baseChar.fatherId;
      else if (baseChar.motherId) relative.motherId = baseChar.motherId;
    } else if (relType === "tio") {
      const parent = (baseChar.fatherId && this.engine.getCharacter(baseChar.fatherId)) || (baseChar.motherId && this.engine.getCharacter(baseChar.motherId));
      if (parent) {
        relative.fatherId = parent.fatherId;
        relative.motherId = parent.motherId;
      }
    } else if (relType === "sobrinho") {
      const sibs = this.engine.getSiblings(baseChar);
      if (sibs.length > 0) {
        if (sibs[0].gender === "F") relative.motherId = sibs[0].id;
        else relative.fatherId = sibs[0].id;
      } else {
        if (baseChar.gender === "F") relative.motherId = baseChar.id;
        else relative.fatherId = baseChar.id;
      }
    } else if (relType === "conjuge") {
      if (!baseChar.spouseIds.includes(relative.id)) baseChar.spouseIds.push(relative.id);
      if (!relative.spouseIds.includes(baseChar.id)) relative.spouseIds.push(baseChar.id);
      baseChar.marriageDetails = baseChar.marriageDetails || {};
      baseChar.marriageDetails[relative.id] = { year: (baseChar.birthYear || 1200) + 20, isNobleAssimilation: true, exceptions: [] };
    }

    this.engine.recordAuditLog(
      "LINHAGEM",
      "Vínculo de Parentesco",
      `Parentesco (${relLabels[relType]}): ${baseChar.name} & ${relative.name}`,
      `${relative.name} foi averbado(a) como ${relLabels[relType]} de ${baseChar.name}.`,
      snapshot
    );

    this.closeModal();
    this.syncHeaderAndBadges();
    this.renderTree();
  }

  toggleBastardAuthorException(charId) {
    const c = this.engine.getCharacter(charId);
    if (!c) return;

    const snapshot = this.engine.createSnapshot();
    c.bastardLegitimizedByAuthor = !c.bastardLegitimizedByAuthor;

    if (c.bastardLegitimizedByAuthor) {
      const father = this.engine.getCharacter(c.fatherId);
      if (father && father.officialHouseId) {
        c.officialHouseId = father.officialHouseId;
      }
      c.royalBranchStatus = "Bastardo Legitimado (Concessão da Autora — Registro Permanente)";
    } else {
      c.officialHouseId = "house_plebe";
      c.royalBranchStatus = "Bastardo (Fora da Casa e Herança)";
    }

    this.engine.recordAuditLog(
      "LINHAGEM",
      "Alteração de Estatuto de Bastardo",
      `${c.name}: Concessão de Legitimidade ${c.bastardLegitimizedByAuthor ? "Deferida" : "Revogada"}`,
      `A autora alterou a condição de herança de ${c.name}. O aviso de lembrança de bastardo permanece averbado.`,
      snapshot
    );

    this.renderTree();
    this.openProfileModal(charId);
  }

  // --------------------------------------------------------------------------
  // EDITAR / ADICIONAR PERSONAGEM
  // --------------------------------------------------------------------------
  openCharacterModal(editCharId = null, prefill = {}) {
    const existing = editCharId ? this.engine.getCharacter(editCharId) : null;
    const isFillingPlaceholder = existing && existing.isPlaceholderEmpty;

    const c = existing && !isFillingPlaceholder
      ? existing
      : {
          name: prefill.name || "",
          gender: prefill.gender || "M",
          birthYear: prefill.birthYear || 1220,
          deathYear: prefill.deathYear || "",
          isAlive: prefill.isAlive !== undefined ? prefill.isAlive : true,
          socialRank: prefill.socialRank || "principe",
          race: prefill.race || "Humano",
          creatureType: prefill.creatureType || (prefill.race ? prefill.race.toLowerCase() : "humano"),
          birthHouseId: prefill.birthHouseId || (this.engine.data.houses[0] && this.engine.data.houses[0].id) || "",
          officialHouseId: prefill.officialHouseId || prefill.birthHouseId || (this.engine.data.houses[0] && this.engine.data.houses[0].id) || "",
          livedInTerritoryId: prefill.livedInTerritoryId || (this.engine.data.territories[0] && this.engine.data.territories[0].id) || "",
          fatherId: prefill.fatherId !== undefined ? prefill.fatherId : (existing ? existing.fatherId : ""),
          motherId: prefill.motherId !== undefined ? prefill.motherId : (existing ? existing.motherId : ""),
          twinOfId: prefill.twinOfId || "",
          isBastard: Boolean(prefill.isBastard),
          bastardLegitimizedByAuthor: false,
          appearance: "",
          deathCause: "",
          preMarriageHistory: prefill.preMarriageHistory || "",
          postMarriageHistory: "",
          customTrajectoryEvents: prefill.customTrajectoryEvents || []
        };

    const noHouseOpt = `<option value="">— Sem Casa Dinástica —</option>`;
    const housesOpts = (this.engine.data.houses.length === 0 ? noHouseOpt : (c.birthHouseId ? "" : noHouseOpt)) +
      this.engine.data.houses
        .map(h => `<option value="${h.id}" ${c.birthHouseId === h.id ? "selected" : ""}>${this.escapeHtml(h.name)}</option>`)
        .join("");

    const officialHousesOpts = (this.engine.data.houses.length === 0 ? noHouseOpt : (c.officialHouseId ? "" : noHouseOpt)) +
      this.engine.data.houses
        .map(h => `<option value="${h.id}" ${c.officialHouseId === h.id ? "selected" : ""}>${this.escapeHtml(h.name)}</option>`)
        .join("");

    const noTerrOpt = `<option value="">— Sem Território Vinculado —</option>`;
    const territoriesOpts = (this.engine.data.territories.length === 0 ? noTerrOpt : (c.livedInTerritoryId ? "" : noTerrOpt)) +
      this.engine.data.territories
        .map(t => `<option value="${t.id}" ${c.livedInTerritoryId === t.id ? "selected" : ""}>${this.escapeHtml(t.name)}</option>`)
        .join("");

    const maleCharsOpts = [`<option value="">— Nenhum / Não Declarado —</option>`]
      .concat(
        this.engine.data.characters
          .filter(x => x.id !== editCharId && x.gender === "M" && !x.isPlaceholderEmpty)
          .map(x => `<option value="${x.id}" ${c.fatherId === x.id ? "selected" : ""}>${this.escapeHtml(x.name)} (*${x.birthYear || "?"})</option>`)
      )
      .join("");

    const femaleCharsOpts = [`<option value="">— Nenhuma / Não Declarada —</option>`]
      .concat(
        this.engine.data.characters
          .filter(x => x.id !== editCharId && x.gender === "F" && !x.isPlaceholderEmpty)
          .map(x => `<option value="${x.id}" ${c.motherId === x.id ? "selected" : ""}>${this.escapeHtml(x.name)} (*${x.birthYear || "?"})</option>`)
      )
      .join("");

    const twinCandidateOpts = [`<option value="">— Não é gêmeo de personagem registrado —</option>`]
      .concat(
        this.engine.data.characters
          .filter(x => x.id !== editCharId && !x.isPlaceholderEmpty)
          .map(x => `<option value="${x.id}" ${c.twinOfId === x.id ? "selected" : ""}>Gêmeo(a) de ${this.escapeHtml(x.name)} (*${x.birthYear || "?"})</option>`)
      )
      .join("");

    const charRace = c.race || (c.creatureType ? (c.creatureType.charAt(0).toUpperCase() + c.creatureType.slice(1)) : "Humano");

    const bodyHtml = `
      <div id="charInconsistencyBox" style="display:none;"></div>
      <div id="charSmartBastardNotice" style="display:none;"></div>
      <div id="charSmartTwinSuggestion" style="display:none;"></div>

      <div class="form-row">
        <div class="form-group">
          <label>Nome Completo do Personagem:</label>
          <input type="text" id="cf_name" value="${this.escapeHtml(c.name)}" placeholder="Ex: Aegon Valmont" />
        </div>
        <div class="form-group">
          <label>Gênero & Condição Social:</label>
          <div style="display:flex; gap:8px;">
            <select id="cf_gender" style="flex:1;">
              <option value="M" ${c.gender === "M" ? "selected" : ""}>Masculino</option>
              <option value="F" ${c.gender === "F" ? "selected" : ""}>Feminino</option>
            </select>
            <select id="cf_rank" style="flex:1.4;" onchange="app.checkFormBastardAndTwinHints()">
              <option value="rei" ${c.socialRank === "rei" ? "selected" : ""}>Rei / Rainha Soberana</option>
              <option value="principe" ${c.socialRank === "principe" ? "selected" : ""}>Príncipe / Princesa</option>
              <option value="lorde" ${c.socialRank === "lorde" ? "selected" : ""}>Lorde / Lady (Nobreza)</option>
              <option value="guarda" ${c.socialRank === "guarda" ? "selected" : ""}>Cavaleiro / Guarda de Honra</option>
              <option value="civil" ${c.socialRank === "civil" ? "selected" : ""}>Civil / Cidadão</option>
              <option value="fazendeira" ${c.socialRank === "fazendeira" ? "selected" : ""}>Camponês / Fazendeira</option>
              <option value="prostituta" ${c.socialRank === "prostituta" ? "selected" : ""}>Relação Fora do Padrão Nobre</option>
              <option value="estuprada" ${c.socialRank === "estuprada" ? "selected" : ""}>Vítima / Relação Não Consensual</option>
            </select>
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Ano de Nascimento:</label>
          <input type="number" id="cf_birthYear" value="${c.birthYear || ""}" oninput="app.checkFormBastardAndTwinHints()" />
        </div>
        <div class="form-group">
          <label>Estado Vital & Ano de Falecimento:</label>
          <div style="display:flex; gap:8px; align-items:center;">
            <select id="cf_isAlive" onchange="document.getElementById('cf_deathYear').disabled = (this.value === 'true')">
              <option value="true" ${c.isAlive ? "selected" : ""}>Vivo</option>
              <option value="false" ${!c.isAlive ? "selected" : ""}>Falecido</option>
            </select>
            <input type="number" id="cf_deathYear" placeholder="Ano da Morte" value="${c.deathYear || ""}" ${c.isAlive ? "disabled" : ""} />
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Pai de Sangue (Linha Carmesim):</label>
          <select id="cf_fatherId" onchange="app.checkFormBastardAndTwinHints()">${maleCharsOpts}</select>
        </div>
        <div class="form-group">
          <label>Mãe de Sangue (Linha Carmesim):</label>
          <select id="cf_motherId" onchange="app.checkFormBastardAndTwinHints()">${femaleCharsOpts}</select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Casa de Nascimento (Origem):</label>
          <select id="cf_birthHouseId">${housesOpts}</select>
        </div>
        <div class="form-group">
          <label>Casa Oficial Vigente (Pós-Matrimônio):</label>
          <select id="cf_officialHouseId">${officialHousesOpts}</select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Feudo de Residência:</label>
          <select id="cf_territoryId">${territoriesOpts}</select>
        </div>
        <div class="form-group">
          <label>Raça / Espécie (Digite ou Selecione):</label>
          <input
            type="text"
            id="cf_race"
            list="cf_raceList"
            value="${this.escapeHtml(charRace)}"
            placeholder="Ex: Humano, Elfo, Draconiano..."
            autocomplete="off"
            class="input-medieval"
            style="width:100%;"
          />
          <datalist id="cf_raceList">
            ${this.engine.getRaces().map(r => `<option value="${this.escapeHtml(r)}"></option>`).join("")}
          </datalist>
        </div>
      </div>

      <div class="card-box" style="padding:12px;">
        <div class="form-row">
          <div class="form-group">
            <label>Condição de Gêmeos:</label>
            <select id="cf_twinOfId">${twinCandidateOpts}</select>
            ${
              !editCharId
                ? `<label style="margin-top:6px; color:var(--gold-leaf); cursor:pointer;">
                    <input type="checkbox" id="cf_createSecondTwinNow" onchange="document.getElementById('cf_secondTwinBox').style.display = this.checked ? 'block' : 'none'" />
                    Registrar concomitantemente o segundo irmão gêmeo
                  </label>
                  <div id="cf_secondTwinBox" style="display:none; margin-top:6px;">
                    <input type="text" id="cf_secondTwinName" placeholder="Nome do segundo gêmeo" style="width:100%; margin-bottom:4px;" />
                    <select id="cf_secondTwinGender" style="width:100%;">
                      <option value="F">Feminino (Irmã Gêmea)</option>
                      <option value="M">Masculino (Irmão Gêmeo)</option>
                    </select>
                  </div>`
                : ""
            }
          </div>

          <div class="form-group">
            <label>Estatuto de Bastardia:</label>
            <label style="cursor:pointer; color:var(--gold-leaf);">
              <input type="checkbox" id="cf_isBastard" ${c.isBastard ? "checked" : ""} onchange="app.checkFormBastardAndTwinHints()" />
              Declarar como Bastardo (Fora da Casa e sem direito à sucessão)
            </label>
            <label style="cursor:pointer; color:#dfba73; margin-top:4px;">
              <input type="checkbox" id="cf_bastardException" ${c.bastardLegitimizedByAuthor ? "checked" : ""} onchange="app.checkFormBastardAndTwinHints()" />
              Exceção da Autora: Admitir na Casa (mantém a Lembrança de Bastardo)
            </label>
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Retrato do Medalhão (Arquivo ou URL):</label>
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="text" id="cf_photoUrl" value="${this.escapeHtml(c.photoUrl || "")}" placeholder="Em branco para pintura clássica padrão..." style="flex:1;" />
            <button type="button" class="btn btn-sm btn-gold" onclick="document.getElementById('cf_photoFileInput').click()">Carregar Arquivo</button>
            <input type="file" id="cf_photoFileInput" accept="image/*" style="display:none;" onchange="app.handleModalPhotoFile(event)" />
          </div>
        </div>
        <div class="form-group">
          <label>Causa do Falecimento:</label>
          <textarea id="cf_deathCause" rows="2" placeholder="Ex: Tombou na Batalha das Ruínas, velhice...">${this.escapeHtml(c.deathCause || "")}</textarea>
        </div>
      </div>

      <div class="form-group">
        <label>Aparência Física & Porte:</label>
        <textarea id="cf_appearance" rows="2" placeholder="Aspectos, olhos, cabelos, mantos e cicatrizes...">${this.escapeHtml(c.appearance || "")}</textarea>
      </div>

      <div class="form-group">
        <label>História de Origem (Preservada no perfil):</label>
        <textarea id="cf_preHistory" rows="2" placeholder="Infância e vida anterior ao casamento...">${this.escapeHtml(c.preMarriageHistory || "")}</textarea>
      </div>

      <div class="form-group">
        <label>Eventos da Trajetória Oficial (um por linha no formato: Ano: Descrição):</label>
        <textarea id="cf_events" rows="3" placeholder="1225: Casamento real na capital...">${this.escapeHtml((c.customTrajectoryEvents || []).join("\n"))}</textarea>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-medieval" onclick="app.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="app.saveCharacterFromModal('${editCharId || ""}')">
        Salvar Assento
      </button>
    `;

    this.showModal(
      isFillingPlaceholder
        ? `Preencher Assento Vago na Linhagem`
        : editCharId
        ? `Editar Assento: ${c.name}`
        : `Lavrar Novo Assento de Personagem`,
      bodyHtml,
      footerHtml
    );

    setTimeout(() => this.checkFormBastardAndTwinHints(), 30);
  }

  checkFormBastardAndTwinHints() {
    const fatherId = document.getElementById("cf_fatherId")?.value;
    const motherId = document.getElementById("cf_motherId")?.value;
    const birthYear = Number(document.getElementById("cf_birthYear")?.value);
    const bastardBox = document.getElementById("charSmartBastardNotice");
    const twinBox = document.getElementById("charSmartTwinSuggestion");
    if (!bastardBox || !twinBox) return;

    const father = this.engine.getCharacter(fatherId);
    const mother = this.engine.getCharacter(motherId);

    if (father && mother && this.engine.isNobleRank(father.socialRank)) {
      const areMarried = (father.spouseIds || []).includes(mother.id);
      const nonNobleMother = this.engine.isMotherNonNobleStandard(mother.socialRank);
      if (nonNobleMother || !areMarried) {
        const cbBastard = document.getElementById("cf_isBastard");
        if (cbBastard && !cbBastard.dataset.userTouched) {
          cbBastard.checked = true;
          cbBastard.dataset.userTouched = "true";
        }
        bastardBox.style.display = "block";
        bastardBox.className = "alert-banner alert-warning";
        bastardBox.innerHTML = `
          <strong>Aviso de Estatuto de Bastardia:</strong>
          O progenitor (<strong>${this.escapeHtml(father.name)}</strong>) pertence à nobreza/coroa e a mãe (<strong>${this.escapeHtml(mother.name)}</strong>) não atende aos requisitos dinásticos.
          Pelas leis heráldicas, este descendente é registrado como <strong>Bastardo</strong>, desprovido de herança dinástica salvo concessão expressa da autora.
        `;
      } else {
        bastardBox.style.display = "none";
      }
    } else {
      bastardBox.style.display = "none";
    }

    if ((fatherId || motherId) && birthYear) {
      const sameYearSibling = this.engine.data.characters.find(
        ch =>
          !ch.isPlaceholderEmpty &&
          Number(ch.birthYear) === birthYear &&
          ((fatherId && ch.fatherId === fatherId) || (motherId && ch.motherId === motherId))
      );
      if (sameYearSibling) {
        twinBox.style.display = "block";
        twinBox.className = "alert-banner alert-info";
        twinBox.innerHTML = `
          <strong>Identificação de Nascimento no Mesmo Ano:</strong>
          Constatamos que <strong>${this.escapeHtml(sameYearSibling.name)}</strong> também nasceu no ano <strong>${birthYear}</strong> sob os mesmos pais.
          <button type="button" class="btn btn-sm btn-gold" style="margin-left:8px;"
                  onclick="document.getElementById('cf_twinOfId').value='${sameYearSibling.id}'">
            Vincular como Gêmeo de ${this.escapeHtml(sameYearSibling.name)}
          </button>
        `;
      } else {
        twinBox.style.display = "none";
      }
    } else {
      twinBox.style.display = "none";
    }
  }

  saveCharacterFromModal(editCharId = "") {
    const rawName = document.getElementById("cf_name").value.trim() || "Membro sem Nome";
    const name = this.engine.cleanCharacterName(rawName) || rawName;
    const gender = document.getElementById("cf_gender").value;
    const socialRank = document.getElementById("cf_rank").value;
    const birthYear = Number(document.getElementById("cf_birthYear").value) || null;
    const isAlive = document.getElementById("cf_isAlive").value === "true";
    const deathYear = !isAlive ? Number(document.getElementById("cf_deathYear").value) || null : null;
    const fatherId = document.getElementById("cf_fatherId").value || null;
    const motherId = document.getElementById("cf_motherId").value || null;
    let birthHouseId = document.getElementById("cf_birthHouseId").value;
    let officialHouseId = document.getElementById("cf_officialHouseId").value;
    const livedInTerritoryId = document.getElementById("cf_territoryId").value || null;
    const rawRace = document.getElementById("cf_race")?.value.trim() || "Humano";
    const race = rawRace ? (rawRace.charAt(0).toUpperCase() + rawRace.slice(1)) : "Humano";
    this.engine.addRace(race);
    const creatureType = race.toLowerCase();
    const twinOfId = document.getElementById("cf_twinOfId").value || null;
    const isBastard = document.getElementById("cf_isBastard").checked;
    const bastardLegitimizedByAuthor = document.getElementById("cf_bastardException").checked;
    const appearance = document.getElementById("cf_appearance").value.trim();
    const deathCause = document.getElementById("cf_deathCause").value.trim();
    const photoUrl = document.getElementById("cf_photoUrl")?.value.trim() || "";
    const preMarriageHistory = document.getElementById("cf_preHistory").value.trim();
    const customTrajectoryEvents = document
      .getElementById("cf_events")
      .value.split("\n")
      .map(s => s.trim())
      .filter(Boolean);

    if (isBastard && !bastardLegitimizedByAuthor) {
      officialHouseId = "house_plebe";
    }

    const draft = {
      id: editCharId || "char_" + Date.now(),
      name,
      gender,
      socialRank,
      race,
      creatureType,
      birthYear,
      deathYear,
      isAlive,
      fatherId,
      motherId,
      birthHouseId,
      officialHouseId,
      livedInTerritoryId,
      twinOfId,
      isBastard,
      bastardLegitimizedByAuthor,
      appearance,
      deathCause,
      photoUrl,
      preMarriageHistory,
      customTrajectoryEvents
    };

    const warnings = this.engine.detectCharacterInconsistencies(draft);
    const incBox = document.getElementById("charInconsistencyBox");
    const justificationInput = document.getElementById("cf_inconsistencyJustification");

    if (warnings.length > 0 && (!justificationInput || !justificationInput.value.trim())) {
      incBox.style.display = "block";
      incBox.innerHTML = `
        <div class="alert-banner alert-danger" style="margin-bottom:12px;">
          <h4 style="margin-bottom:6px;">Notificação de Inconsistência Genealógica</h4>
          ${warnings
            .map(
              w => `
              <div style="margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.12);">
                <strong>Assento sob Interferência:</strong> ${this.escapeHtml(w.where)}<br/>
                <strong>Impedimento Canônico:</strong> ${this.escapeHtml(w.whyNotAllowed)}
              </div>
            `
            )
            .join("")}
          <div class="form-group" style="margin-top:10px;">
            <label style="color:var(--gold-leaf); font-weight:700;">
              Justificativa Expressa da Autora para Lavrar a Exceção no Códice:
            </label>
            <textarea id="cf_inconsistencyJustification" rows="2" placeholder="Registre a razão soberana para validar esta inscrição..."></textarea>
          </div>
        </div>
      `;
      incBox.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const authorJustificationText = justificationInput ? justificationInput.value.trim() : "";
    const snapshot = this.engine.createSnapshot();

    let savedChar = null;
    if (editCharId) {
      savedChar = this.engine.getCharacter(editCharId);
      Object.assign(savedChar, draft, { isPlaceholderEmpty: false });
    } else {
      savedChar = {
        ...draft,
        spouseIds: [],
        marriageDetails: {},
        isPlaceholderEmpty: false,
        royalBranchStatus: isBastard
          ? bastardLegitimizedByAuthor
            ? "Bastardo Legitimado (Concessão da Autora)"
            : "Bastardo (Fora da Dinastia)"
          : "Membro da Linhagem",
        postMarriageHistory: "",
        excludedMarriageExceptions: [],
        linkedToExcludedLineage: null,
        inconsistencyJustifications: []
      };
      this.engine.data.characters.push(savedChar);
    }

    if (authorJustificationText) {
      savedChar.inconsistencyJustifications = savedChar.inconsistencyJustifications || [];
      savedChar.inconsistencyJustifications.push({
        date: new Date().toLocaleDateString("pt-BR"),
        context: warnings.map(w => w.code).join(", "),
        reason: authorJustificationText
      });
    }

    if (twinOfId) {
      const twinPartner = this.engine.getCharacter(twinOfId);
      if (twinPartner) twinPartner.twinOfId = savedChar.id;
    }

    const createSecondTwin = document.getElementById("cf_createSecondTwinNow")?.checked;
    if (createSecondTwin && !editCharId) {
      const twin2Name = document.getElementById("cf_secondTwinName")?.value.trim() || `Gêmeo(a) de ${savedChar.name}`;
      const twin2Gender = document.getElementById("cf_secondTwinGender")?.value || "F";
      const twin2Id = "char_twin_" + Date.now();
      savedChar.twinOfId = twin2Id;

      this.engine.data.characters.push({
        ...JSON.parse(JSON.stringify(savedChar)),
        id: twin2Id,
        name: twin2Name,
        gender: twin2Gender,
        twinOfId: savedChar.id
      });
    }

    this.engine.recordAuditLog(
      "LINHAGEM",
      editCharId ? "Edição de Assento" : "Lavratura de Personagem",
      `${editCharId ? "Editado" : "Inscrito"}: ${savedChar.name}`,
      `Assento de ${savedChar.name} confirmado no códice${authorJustificationText ? ` (Com exceção deferida: "${authorJustificationText}")` : ""}.`,
      snapshot
    );

    this.closeModal();
    this.populateFilterControls();
    this.syncHeaderAndBadges();
    this.renderTree();
  }

  openQuickChildModal(parentId) {
    const parent = this.engine.getCharacter(parentId);
    if (!parent) return;
    const spouseId = (parent.spouseIds && parent.spouseIds[0]) || "";
    const fatherId = parent.gender === "M" ? parent.id : spouseId;
    const motherId = parent.gender === "F" ? parent.id : spouseId;

    this.openCharacterModal(null, {
      fatherId,
      motherId,
      birthYear: (parent.birthYear || 1200) + 24,
      birthHouseId: parent.officialHouseId || parent.birthHouseId,
      officialHouseId: parent.officialHouseId || parent.birthHouseId,
      livedInTerritoryId: parent.livedInTerritoryId,
      race: parent.race || "Humano",
      socialRank: parent.socialRank === "rei" ? "principe" : parent.socialRank
    });
  }

  openTwinsModal() {
    this.openCharacterModal(null, {});
    setTimeout(() => {
      const cb = document.getElementById("cf_createSecondTwinNow");
      const box = document.getElementById("cf_secondTwinBox");
      if (cb && box) {
        cb.checked = true;
        box.style.display = "block";
      }
    }, 50);
  }

  // --------------------------------------------------------------------------
  // IRMÃO RETROATIVO EM FAMÍLIA MULTIGERACIONAL
  // --------------------------------------------------------------------------
  openRetroactiveSiblingModal(preselectedSiblingId = null) {
    const chars = this.engine.data.characters.filter(c => !c.isPlaceholderEmpty);
    const refId = preselectedSiblingId || (chars[0] && chars[0].id) || "";

    const charOpts = chars
      .map(c => `<option value="${c.id}" ${c.id === refId ? "selected" : ""}>${this.escapeHtml(c.name)} (*${c.birthYear || "?"})</option>`)
      .join("");

    const bodyHtml = `
      <div class="alert-banner alert-info">
        <strong>Inscrição Retroativa de Irmão na Linhagem:</strong><br/>
        Mesmo que a estirpe já conte com múltiplas gerações, selecione o irmão de referência.
        O sistema atribuirá a <strong>família de origem (progenitores e casa)</strong>, resgatará os
        <strong>acontecimentos da época em que nasceu até o falecimento</strong> e possibilitará <strong>propor herdeiros</strong> na mesma lavratura.
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Irmão de Referência:</label>
          <select id="retro_refSiblingId" onchange="app.refreshRetroactiveSiblingPreview()">${charOpts}</select>
        </div>
        <div class="form-group">
          <label>Nome do Novo Irmão:</label>
          <input type="text" id="retro_name" placeholder="Ex: Príncipe Vaemond Valmont" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Gênero:</label>
          <select id="retro_gender">
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
        </div>
        <div class="form-group">
          <label>Período Histórico (Nascimento &bull; Falecimento):</label>
          <div style="display:flex; gap:8px;">
            <input type="number" id="retro_birthYear" value="1200" placeholder="Nascimento" oninput="app.refreshRetroactiveSiblingPreview()" />
            <input type="number" id="retro_deathYear" value="1244" placeholder="Morte (em branco se vivo)" oninput="app.refreshRetroactiveSiblingPreview()" />
          </div>
        </div>
      </div>

      <div id="retroPreviewContainer"></div>

      <div class="card-box" style="padding:12px;">
        <h4 style="font-family:var(--font-display); color:var(--gold-leaf); font-size:0.84rem; text-transform:uppercase; margin-bottom:6px;">
          Propor Descendentes para este Irmão (Formato: Nome | Ano | M ou F):
        </h4>
        <textarea id="retro_proposedChildren" rows="3" placeholder="Aelor Valmont | 1224 | M&#10;Daena Valmont | 1227 | F"></textarea>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-medieval" onclick="app.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="app.confirmRetroactiveSibling()">
        Lavrar Irmão & Acontecimentos da Época
      </button>
    `;

    this.showModal("Inscrição Retroativa de Irmão na Linhagem", bodyHtml, footerHtml);
    setTimeout(() => this.refreshRetroactiveSiblingPreview(), 30);
  }

  refreshRetroactiveSiblingPreview() {
    const refId = document.getElementById("retro_refSiblingId")?.value;
    const bYear = document.getElementById("retro_birthYear")?.value;
    const dYear = document.getElementById("retro_deathYear")?.value;
    const previewBox = document.getElementById("retroPreviewContainer");
    if (!refId || !previewBox) return;

    const proposal = this.engine.buildRetroactiveSiblingProposal(refId, bYear, dYear);
    if (!proposal) return;

    previewBox.innerHTML = `
      <div class="card-box" style="padding:12px;">
        <p style="font-size:0.88rem; margin-bottom:8px;">
          <strong>Estirpe Reconhecida:</strong> ${this.escapeHtml(proposal.houseName)}
          &bull; Pai: <strong>${this.escapeHtml(proposal.fatherName)}</strong>
          &bull; Mãe: <strong>${this.escapeHtml(proposal.motherName)}</strong>
        </p>
        <label style="font-family:var(--font-display); font-size:0.75rem; color:var(--gold-leaf); text-transform:uppercase;">
          Marcos Cronológicos da Época (${bYear || "?"} &bull; ${dYear || "Vigência"}):
        </label>
        <textarea id="retro_eventsList" rows="4" style="width:100%; margin-top:6px;">${this.escapeHtml(proposal.suggestedEvents.join("\n"))}</textarea>
      </div>
    `;
  }

  confirmRetroactiveSibling() {
    const refId = document.getElementById("retro_refSiblingId").value;
    const refChar = this.engine.getCharacter(refId);
    const refRace = (refChar && refChar.race) || "Humano";
    const name = document.getElementById("retro_name").value.trim() || "Novo Irmão";
    const gender = document.getElementById("retro_gender").value;
    const bYear = Number(document.getElementById("retro_birthYear").value) || 1200;
    const dYearRaw = document.getElementById("retro_deathYear").value.trim();
    const dYear = dYearRaw ? Number(dYearRaw) : null;
    const eventsText = document.getElementById("retro_eventsList")?.value || "";
    const proposedChildrenRaw = document.getElementById("retro_proposedChildren")?.value || "";

    const proposal = this.engine.buildRetroactiveSiblingProposal(refId, bYear, dYear);
    if (!proposal) return;

    const snapshot = this.engine.createSnapshot();
    const newSiblingId = "char_retro_" + Date.now();

    const newSibling = {
      id: newSiblingId,
      name,
      gender,
      birthYear: bYear,
      deathYear: dYear,
      isAlive: !dYear,
      socialRank: proposal.socialRank,
      race: refRace,
      creatureType: refRace.toLowerCase(),
      birthHouseId: proposal.birthHouseId,
      officialHouseId: proposal.officialHouseId,
      livedInTerritoryId: proposal.livedInTerritoryId,
      fatherId: proposal.fatherId,
      motherId: proposal.motherId,
      spouseIds: [],
      marriageDetails: {},
      twinOfId: null,
      isBastard: false,
      bastardLegitimizedByAuthor: false,
      isPlaceholderEmpty: false,
      royalBranchStatus: `Irmão de Origem (${proposal.houseName})`,
      appearance: "",
      deathCause: dYear ? `Falecido no ano ${dYear}` : "Vivo",
      preMarriageHistory: `Nascido na ${proposal.houseName}, filho de ${proposal.fatherName} e ${proposal.motherName}.`,
      postMarriageHistory: "",
      customTrajectoryEvents: eventsText.split("\n").map(s => s.trim()).filter(Boolean),
      excludedMarriageExceptions: [],
      linkedToExcludedLineage: null,
      inconsistencyJustifications: []
    };

    this.engine.data.characters.push(newSibling);

    const childLines = proposedChildrenRaw.split("\n").map(s => s.trim()).filter(Boolean);
    let createdChildrenCount = 0;
    childLines.forEach((line, idx) => {
      const parts = line.split("|").map(p => p.trim());
      const chName = parts[0] || `Descendente de ${name}`;
      const chBirth = Number(parts[1]) || bYear + 22 + idx * 2;
      const chGender = (parts[2] || "M").toUpperCase() === "F" ? "F" : "M";

      this.engine.data.characters.push({
        id: `char_retro_child_${Date.now()}_${idx}`,
        name: chName,
        gender: chGender,
        birthYear: chBirth,
        deathYear: null,
        isAlive: true,
        socialRank: proposal.socialRank,
        race: refRace,
        creatureType: refRace.toLowerCase(),
        birthHouseId: proposal.birthHouseId,
        officialHouseId: proposal.officialHouseId,
        livedInTerritoryId: proposal.livedInTerritoryId,
        fatherId: gender === "M" ? newSiblingId : null,
        motherId: gender === "F" ? newSiblingId : null,
        spouseIds: [],
        marriageDetails: {},
        twinOfId: null,
        isBastard: false,
        bastardLegitimizedByAuthor: false,
        isPlaceholderEmpty: false,
        royalBranchStatus: `Descendente de ${name}`,
        appearance: "",
        deathCause: "Vivo",
        preMarriageHistory: `Descendente proposto de ${name}.`,
        postMarriageHistory: "",
        customTrajectoryEvents: [`${chBirth}: Nascimento na ${proposal.houseName}.`],
        excludedMarriageExceptions: [],
        linkedToExcludedLineage: null,
        inconsistencyJustifications: []
      });
      createdChildrenCount++;
    });

    this.engine.recordAuditLog(
      "LINHAGEM",
      "Inscrição Retroativa de Irmão",
      `Irmão Retroativo: ${name} (+ ${createdChildrenCount} descendentes)`,
      `Averbado ${name} na ${proposal.houseName} com marcos de ${bYear} a ${dYear || "atual"}.`,
      snapshot
    );

    this.closeModal();
    this.populateFilterControls();
    this.syncHeaderAndBadges();
    this.renderTree();
  }

  // --------------------------------------------------------------------------
  // CELEBRAÇÃO DE MATRIMÔNIO & ASSIMILAÇÃO NOBILIÁRQUICA
  // --------------------------------------------------------------------------
  openMarriageModal(preselectedCharId = null) {
    const chars = this.engine.data.characters.filter(c => !c.isPlaceholderEmpty);
    const charAId = preselectedCharId || (chars[0] && chars[0].id) || "";
    const defaultB = chars.find(c => c.id !== charAId);
    const charBId = (defaultB && defaultB.id) || "";

    const optsA = chars
      .map(c => `<option value="${c.id}" ${c.id === charAId ? "selected" : ""}>${this.escapeHtml(c.name)} (${c.socialRank})</option>`)
      .join("");
    const optsB = chars
      .map(c => `<option value="${c.id}" ${c.id === charBId ? "selected" : ""}>${this.escapeHtml(c.name)} (${c.socialRank})</option>`)
      .join("");

    const bodyHtml = `
      <div id="marriageInconsistencyBox" style="display:none;"></div>

      <div class="form-row">
        <div class="form-group">
          <label>Primeiro Cônjuge:</label>
          <select id="mar_charA" onchange="app.refreshMarriagePreview()">${optsA}</select>
        </div>
        <div class="form-group">
          <label>Segundo Cônjuge:</label>
          <select id="mar_charB" onchange="app.refreshMarriagePreview()">${optsB}</select>
        </div>
      </div>

      <div class="form-group">
        <label>Ano do Matrimônio (A partir deste ano, a trajetória oficial do esposo nobre unifica-se à esposa):</label>
        <input type="number" id="mar_year" value="1235" oninput="app.refreshMarriagePreview()" />
      </div>

      <div id="marriageRulePreviewBox"></div>
    `;

    const footerHtml = `
      <button class="btn btn-medieval" onclick="app.closeModal()">Cancelar</button>
      <button class="btn btn-primary btn-confirm" onclick="app.confirmMarriageFromModal()">
        Celebrar Casamento
      </button>
    `;

    this.showModal("Celebrar Casamento & Aliança Matrimonial", bodyHtml, footerHtml);
    setTimeout(() => this.refreshMarriagePreview(), 30);
  }

  refreshMarriagePreview() {
    const aId = document.getElementById("mar_charA")?.value;
    const bId = document.getElementById("mar_charB")?.value;
    const mYear = Number(document.getElementById("mar_year")?.value) || 1235;
    const previewBox = document.getElementById("marriageRulePreviewBox");
    if (!aId || !bId || !previewBox) return;

    if (aId === bId) {
      previewBox.innerHTML = `<div class="alert-banner alert-danger">Selecione duas personalidades distintas.</div>`;
      return;
    }

    const a = this.engine.getCharacter(aId);
    const b = this.engine.getCharacter(bId);
    let husband = null;
    let wife = null;
    if (a.gender === "M" && b.gender === "F") {
      husband = a;
      wife = b;
    } else if (b.gender === "M" && a.gender === "F") {
      husband = b;
      wife = a;
    }

    const avuncular = this.engine.isAvuncularRelationship(aId, bId);
    let html = "";

    if (avuncular) {
      html += `
        <div class="alert-banner alert-warning" style="margin-bottom:10px;">
          <strong>União Avuncular Detectada (Tio & Sobrinha):</strong><br/>
          Vínculo matrimonial entre <strong>${this.escapeHtml(avuncular.uncleOrAunt.name)}</strong> e
          <strong>${this.escapeHtml(avuncular.nieceOrNephew.name)}</strong>. O códice destacará esta união com cordão de Azul-Real e Ouro.
        </div>
      `;
    }

    if (husband && wife && this.engine.isNobleRank(husband.socialRank)) {
      const wifeBirthHouse = this.engine.getHouse(wife.birthHouseId);
      const husbandHouse = this.engine.getHouse(husband.officialHouseId);
      const eventsSinceMarriage = this.engine.getHusbandEventsSinceMarriage(husband.id, mYear);

      html += `
        <div class="card-box" style="border-left:3px solid #7899c4;">
          <h4 style="font-family:var(--font-display); color:var(--gold-leaf); text-transform:uppercase; margin-bottom:6px;">Assimilação Matrimonial Nobiliárquica</h4>
          <ul style="font-size:0.92rem; line-height:1.6; padding-left:18px; margin-bottom:12px;">
            <li><strong>${this.escapeHtml(wife.name)}</strong> ingressa na <strong>${this.escapeHtml(husbandHouse ? husbandHouse.name : "Casa do Esposo")}</strong>, preservando sua linhagem na <strong>${this.escapeHtml(wifeBirthHouse ? wifeBirthHouse.name : "Casa de Nascimento")}</strong>.</li>
            <li>Sua casa oficial passa a ser a <strong>${this.escapeHtml(husbandHouse ? husbandHouse.name : "Casa do Esposo")}</strong>.</li>
            <li>O histórico anterior de nascimento fica resguardado no capítulo &ldquo;História&rdquo; de seu assento.</li>
            <li>A partir de <strong>${mYear}</strong>, os marcos dinásticos do esposo unem-se à trajetória da senhora &mdash; assinale abaixo caso queira marcar alguma exceção que não a tenha envolvido:</li>
          </ul>

          ${
            eventsSinceMarriage.length > 0
              ? `<div style="background:#140f0b; padding:10px; border-radius:3px; border:1px solid var(--border-brass);">
                  <div style="font-family:var(--font-display); font-size:0.75rem; color:var(--gold-leaf); text-transform:uppercase; margin-bottom:6px;">
                    Assinale acontecimentos para declarar como Exceção (não envolveram a esposa):
                  </div>
                  ${eventsSinceMarriage
                    .map(
                      ev => `
                      <label style="display:block; font-size:0.86rem; margin-bottom:4px; cursor:pointer;">
                        <input type="checkbox" class="mar-exception-cb" value="${this.escapeHtml(ev)}" />
                        Exceção Declarada: <em>${this.escapeHtml(ev)}</em>
                      </label>
                    `
                    )
                    .join("")}
                </div>`
              : `<p style="font-size:0.86rem; color:var(--ink-dim); font-style:italic;">Nenhum marco dinástico posterior a ${mYear} registrado até o momento.</p>`
          }
        </div>
      `;
    } else {
      html += `
        <div class="alert-banner alert-info">
          <strong>Matrimônio Plebeu / Guarda:</strong><br/>
          Como a união não envolve corte senhorial ou senhor de feudo, <strong>não decorre assimilação de dinastia</strong>.
        </div>
      `;
    }

    previewBox.innerHTML = html;
  }

  confirmMarriageFromModal() {
    const aId = document.getElementById("mar_charA").value;
    const bId = document.getElementById("mar_charB").value;
    const mYear = Number(document.getElementById("mar_year").value) || 1235;
    if (!aId || !bId || aId === bId) return;

    const exceptionCheckboxes = document.querySelectorAll(".mar-exception-cb:checked");
    const exceptionEvents = Array.from(exceptionCheckboxes).map(cb => cb.value);

    const warnings = this.engine.detectMarriageInconsistencies(aId, bId, mYear);
    const incBox = document.getElementById("marriageInconsistencyBox");
    const justInput = document.getElementById("mar_inconsistencyJustification");

    if (warnings.length > 0 && (!justInput || !justInput.value.trim())) {
      incBox.style.display = "block";
      incBox.innerHTML = `
        <div class="alert-banner alert-danger" style="margin-bottom:12px;">
          <h4>Notificação de Inconsistência Matrimonial</h4>
          ${warnings
            .map(
              w => `
              <div style="margin-top:6px;">
                <strong>Impedimento:</strong> ${this.escapeHtml(w.where)}<br/>
                <strong>Motivo Canônico:</strong> ${this.escapeHtml(w.whyNotAllowed)}
              </div>
            `
            )
            .join("")}
          <div class="form-group" style="margin-top:10px;">
            <label style="color:var(--gold-leaf); font-weight:700;">
              Justificativa Expressa da Autora para Validar o Matrimônio:
            </label>
            <textarea id="mar_inconsistencyJustification" rows="2" placeholder="Explique a decisão soberana..."></textarea>
          </div>
        </div>
      `;
      return;
    }

    const justification = justInput ? justInput.value.trim() : "";
    this.engine.registerMarriage({
      partnerAId: aId,
      partnerBId: bId,
      marriageYear: mYear,
      exceptionEvents,
      inconsistencyJustification: justification
    });

    this.closeModal();
    this.syncHeaderAndBadges();
    this.renderTree();
  }

  // --------------------------------------------------------------------------
  // VERIFICAÇÃO DE EXCLUSÃO DE PERSONAGEM & LINHAGEM
  // --------------------------------------------------------------------------
  openDeleteVerificationModal(charId) {
    const c = this.engine.getCharacter(charId);
    if (!c) return;

    const descendants = this.engine.getAllDescendants(charId);

    const bodyHtml = `
      <div class="alert-banner alert-danger">
        <strong>Verificação Formal de Exclusão de Linhagem: &ldquo;${this.escapeHtml(c.name)}&rdquo;</strong><br/>
        A árvore genealógica descendente (${descendants.length} descendentes) <strong>não será revogada sem vossa expressa confirmação</strong>.
        Escolha abaixo o procedimento de escriba:
      </div>

      <div class="card-box" style="border-left:3px solid var(--gold-antique);">
        <h2>Opção A: Excluir Apenas o Personagem (Manter Descendência e Irmandade)</h2>
        <p class="sub-desc">
          Filhos, irmãos e laços de sangue permanecem preservados. O medalhão de <strong>${this.escapeHtml(c.name)}</strong> converter-se-á em um
          <strong>Assento Vago</strong> no pergaminho até que um novo membro venha a ser lavrado no mesmo assento.
        </p>
        <button class="btn btn-gold" onclick="app.executeSingleCharacterDelete('${c.id}')">
          Excluir Somente &ldquo;${this.escapeHtml(c.name)}&rdquo; (Reservar Assento Vago)
        </button>
      </div>

      <div class="card-box" style="border-left:3px solid var(--crimson-wax);">
        <h2>Opção B: Revogar Personagem e Toda a Descendência Seguinte (${descendants.length + 1} membros)</h2>
        <p class="sub-desc">
          Ao revogar o ramo a partir de <strong>${this.escapeHtml(c.name)}</strong>:
          <br/>&bull; Todos os <strong>${descendants.length} descendentes</strong> serão apagados do pergaminho.
          <br/>&bull; <strong>Esposas</strong> aliadas a este ramo <strong>retomarão automaticamente suas Casas de Nascimento</strong> e exibirão nos assentos que pertenceram a uma linhagem revogada.
          <br/>&bull; O ato será arquivado na seção <strong>Linhagem</strong> dos anais, passível de restauração a qualquer tempo.
        </p>
        <label style="display:block; margin-bottom:10px; color:#fad1d4; font-size:0.88rem; cursor:pointer;">
          <input type="checkbox" id="verifyCascadeDeleteCheckbox" />
          <strong>Confirmação Solene:</strong> Confirmo que desejo revogar ${this.escapeHtml(c.name)} e toda a sua árvore descendente.
        </label>
        <button class="btn btn-danger" onclick="app.executeCascadeSubtreeDelete('${c.id}')">
          Revogar Personagem e Toda a Linhagem Seguinte
        </button>
      </div>
    `;

    this.showModal(
      `Verificação de Exclusão &bull; ${c.name}`,
      bodyHtml,
      `<button class="btn btn-medieval" onclick="app.closeModal()">Cancelar e Manter Registros</button>`
    );
  }

  executeSingleCharacterDelete(charId) {
    this.engine.deleteOnlyCharacterLeaveEmptySlot(charId);
    this.closeModal();
    this.syncHeaderAndBadges();
    this.renderTree();
  }

  executeCascadeSubtreeDelete(charId) {
    const confirmed = document.getElementById("verifyCascadeDeleteCheckbox")?.checked;
    if (!confirmed) {
      alert("Por favor, assinale a caixa de Confirmação Solene para confirmar a exclusão de toda a árvore seguinte.");
      return;
    }
    this.engine.deleteCharacterAndEntireSubtree(charId);
    this.closeModal();
    this.syncHeaderAndBadges();
    this.renderTree();
  }

  // --------------------------------------------------------------------------
  // CASAS DINÁSTICAS & MARCOS HISTÓRICOS
  // --------------------------------------------------------------------------
  renderHousesAndSuccessionTab() {
    this.renderHousesList();
    this.renderHouseEventsList();
  }

  renderHousesList() {
    const container = document.getElementById("housesListContainer");
    if (!container) return;

    container.innerHTML = this.engine.data.houses
      .map(
        h => `
        <div class="card-box" style="padding:12px; border-left:4px solid ${h.color}; display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <div>
            <div style="font-family:var(--font-display); font-weight:700; color:var(--gold-leaf); font-size:0.88rem; text-transform:uppercase;">
              ${this.escapeHtml(h.name)}
              ${h.isRoyal ? `<span class="badge-pill badge-bastard">Casa Soberana</span>` : ""}
              ${h.allowAvuncularMarriage ? `<span class="badge-pill badge-avuncular">Tradição Avuncular</span>` : ""}
            </div>
            <div style="font-size:0.84rem; color:var(--ink-secondary); font-style:italic;">&ldquo;${this.escapeHtml(h.motto || "")}&rdquo;</div>
            <div style="font-size:0.82rem; color:var(--ink-dim); margin-top:2px;">${this.escapeHtml(h.description || "")}</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-sm btn-medieval" onclick="app.openHouseModal('${h.id}')">Editar</button>
            ${
              h.id !== "house_plebe"
                ? `<button class="btn btn-sm btn-danger" onclick="app.deleteHouse('${h.id}')">Excluir</button>`
                : ""
            }
          </div>
        </div>
      `
      )
      .join("");
  }

  openHouseModal(editHouseId = null) {
    const h = editHouseId
      ? this.engine.getHouse(editHouseId)
      : {
          name: "",
          motto: "",
          color: "#8b202e",
          isRoyal: false,
          allowAvuncularMarriage: false,
          description: ""
        };

    const bodyHtml = `
      <div class="form-row">
        <div class="form-group">
          <label>Nome da Casa / Dinastia:</label>
          <input type="text" id="hf_name" value="${this.escapeHtml(h.name)}" placeholder="Ex: Casa Valmont" />
        </div>
        <div class="form-group">
          <label>Cor Heráldica do Medalhão:</label>
          <input type="color" id="hf_color" value="${h.color || "#8b202e"}" style="height:38px; padding:3px;" />
        </div>
      </div>

      <div class="form-group">
        <label>Lema da Casa:</label>
        <input type="text" id="hf_motto" value="${this.escapeHtml(h.motto || "")}" placeholder="Ex: Do Sangue Real, a Coroa Eterna" />
      </div>

      <div class="form-group">
        <label style="cursor:pointer; color:var(--gold-leaf);">
          <input type="checkbox" id="hf_isRoyal" ${h.isRoyal ? "checked" : ""} />
          Dinastia Soberana do Reino
        </label>
        <label style="cursor:pointer; color:#7899c4; margin-top:6px;">
          <input type="checkbox" id="hf_avuncular" ${h.allowAvuncularMarriage ? "checked" : ""} />
          Tradição Consanguínea Avuncular (Casamento entre Tios e Sobrinhos)
        </label>
      </div>

      <div class="form-group">
        <label>Costumes & Tradições:</label>
        <textarea id="hf_desc" rows="3">${this.escapeHtml(h.description || "")}</textarea>
      </div>
    `;

    this.showModal(
      editHouseId ? `Editar Dinastia: ${h.name}` : `Lavrar Nova Casa Nobre`,
      bodyHtml,
      `
        <button class="btn btn-medieval" onclick="app.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="app.saveHouseFromModal('${editHouseId || ""}')">Salvar Casa</button>
      `
    );
  }

  saveHouseFromModal(editHouseId = "") {
    const name = document.getElementById("hf_name").value.trim() || "Nova Casa";
    const color = document.getElementById("hf_color").value;
    const motto = document.getElementById("hf_motto").value.trim();
    const isRoyal = document.getElementById("hf_isRoyal").checked;
    const allowAvuncularMarriage = document.getElementById("hf_avuncular").checked;
    const description = document.getElementById("hf_desc").value.trim();

    const snapshot = this.engine.createSnapshot();

    if (editHouseId) {
      const h = this.engine.getHouse(editHouseId);
      if (h) {
        Object.assign(h, { name, color, motto, isRoyal, allowAvuncularMarriage, description });
      }
      this.engine.recordAuditLog(
        "CASA",
        "Alteração de Dinastia",
        `Casa Atualizada: ${name}`,
        `Estatutos e cores heráldicas da dinastia ${name} foram revisados.`,
        snapshot
      );
    } else {
      const newHouse = {
        id: "house_" + Date.now(),
        name,
        color,
        motto,
        isRoyal,
        allowAvuncularMarriage,
        seatTerritoryId: null,
        successionLaw: "fraternal_priority",
        description
      };
      this.engine.data.houses.push(newHouse);
      this.engine.recordAuditLog(
        "CASA",
        "Criação de Dinastia",
        `Nova Casa Inscrita: ${name}`,
        `A dinastia ${name} foi averbada no códice do reino.`,
        snapshot
      );
    }

    this.closeModal();
    this.populateHouseFilterSelect();
    this.syncHeaderAndBadges();
    this.renderHousesAndSuccessionTab();
    this.renderTree();
  }

  deleteHouse(houseId) {
    const h = this.engine.getHouse(houseId);
    if (!h) return;
    const snapshot = this.engine.createSnapshot();

    this.engine.data.houses = this.engine.data.houses.filter(x => x.id !== houseId);
    this.engine.data.characters.forEach(c => {
      if (c.birthHouseId === houseId) c.birthHouseId = "house_plebe";
      if (c.officialHouseId === houseId) c.officialHouseId = "house_plebe";
    });

    this.engine.recordAuditLog(
      "CASA",
      "Revogação de Dinastia",
      `Casa Extinta: ${h.name}`,
      `A dinastia ${h.name} foi revogada (passível de restauração na seção Dinastia dos anais).`,
      snapshot
    );

    this.populateHouseFilterSelect();
    this.syncHeaderAndBadges();
    this.renderHousesAndSuccessionTab();
    this.renderTree();
  }

  renderHouseEventsList() {
    const container = document.getElementById("houseEventsListContainer");
    if (!container) return;

    const sorted = this.engine.data.houseEvents.slice().sort((a, b) => a.year - b.year);
    container.innerHTML = sorted
      .map(ev => {
        const h = this.engine.getHouse(ev.houseId);
        return `
          <div style="background:#17120d; padding:8px 12px; border-radius:3px; border-left:3px solid ${h ? h.color : "#c5a059"}; display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:0.86rem;">
              <strong>Ano ${ev.year} (${this.escapeHtml(h ? h.name : "")}):</strong> ${this.escapeHtml(ev.title)}
              <div style="color:var(--ink-dim); font-size:0.8rem;">${this.escapeHtml(ev.description)}</div>
            </div>
            <button class="btn btn-sm btn-danger" onclick="app.deleteHouseEvent('${ev.id}')">&times;</button>
          </div>
        `;
      })
      .join("");
  }

  openHouseEventModal() {
    const houseOpts = this.engine.data.houses
      .map(h => `<option value="${h.id}">${this.escapeHtml(h.name)}</option>`)
      .join("");

    const bodyHtml = `
      <div class="form-row">
        <div class="form-group">
          <label>Dinastia:</label>
          <select id="hev_houseId">${houseOpts}</select>
        </div>
        <div class="form-group">
          <label>Ano do Marco Histórico:</label>
          <input type="number" id="hev_year" value="1230" />
        </div>
      </div>
      <div class="form-group">
        <label>Título do Acontecimento:</label>
        <input type="text" id="hev_title" placeholder="Ex: Tratado das Espadas Douradas" />
      </div>
      <div class="form-group">
        <label>Descrição do Acontecimento:</label>
        <textarea id="hev_desc" rows="2"></textarea>
      </div>
    `;

    this.showModal(
      "Lavrar Marco Histórico da Casa",
      bodyHtml,
      `
        <button class="btn btn-medieval" onclick="app.closeModal()">Cancelar</button>
        <button class="btn btn-primary btn-confirm" onclick="app.saveHouseEventFromModal()">Averbar Marco</button>
      `
    );
  }

  saveHouseEventFromModal() {
    const houseId = document.getElementById("hev_houseId").value;
    const year = Number(document.getElementById("hev_year").value) || 1200;
    const title = document.getElementById("hev_title").value.trim() || "Marco";
    const description = document.getElementById("hev_desc").value.trim();

    this.engine.data.houseEvents.push({
      id: "ev_" + Date.now(),
      houseId,
      year,
      title,
      description
    });
    this.engine.saveToStorage();
    this.closeModal();
    this.renderHouseEventsList();
  }

  deleteHouseEvent(evId) {
    this.engine.data.houseEvents = this.engine.data.houseEvents.filter(e => e.id !== evId);
    this.engine.saveToStorage();
    this.renderHouseEventsList();
  }

  // ==========================================================================
  // CRONOLOGIA DO MUNDO & LINHA DO TEMPO HISTÓRICA (GUERRAS, NASCIMENTOS, MARCOS)
  // ==========================================================================
  getTimelineCategoryMeta(cat) {
    return TIMELINE_CATEGORIES[cat] || { label: cat || "Crônica", icon: "📜", color: "#d97706", badgeClass: "badge-bastard" };
  }

  formatTimelineDate(year, month, day, mode = this.timelineZoomMode) {
    const mNum = Number(month);
    const dNum = Number(day);
    const mInfo = mNum >= 1 && mNum <= 12 ? FANTASY_MONTHS[mNum - 1] : null;

    if (mode === "day") {
      if (dNum > 0 && mInfo) {
        return `Dia ${dNum} de ${mInfo.name} (Mês ${mNum}), Ano ${year}`;
      }
      if (mInfo) {
        return `${mInfo.name} (Mês ${mNum}), Ano ${year}`;
      }
      return `Ano ${year}`;
    }

    if (mode === "month") {
      if (mInfo) {
        return `${mInfo.name} (Mês ${mNum}), Ano ${year}`;
      }
      return `Ano ${year}`;
    }

    // mode === "year" ou padrão
    return `Ano ${year}`;
  }

  getAllTimelineEvents() {
    const list = [...(this.engine.data.timelineMilestones || [])];

    if (this.timelineIncludeCharLifeEvents) {
      (this.engine.data.characters || []).forEach(c => {
        if (c.birthYear !== undefined && c.birthYear !== null) {
          list.push({
            id: `char_birth_${c.id}`,
            isSynthetic: true,
            syntheticType: "birth",
            title: `Nascimento de ${c.name}`,
            category: "birth",
            year: c.birthYear,
            month: c.birthMonth || 1,
            day: c.birthDay || 1,
            characterId: c.id,
            houseId: c.houseId,
            territoryId: c.territoryId,
            importance: c.isDead ? "normal" : "notable",
            description: `Nascimento de ${c.name}${c.title ? ", " + c.title : ""} nos anais da dinastia.`,
            imageUrl: c.photoUrl || ""
          });
        }
        if (c.isDead && c.deathYear !== undefined && c.deathYear !== null) {
          list.push({
            id: `char_death_${c.id}`,
            isSynthetic: true,
            syntheticType: "death",
            title: `Falecimento de ${c.name}`,
            category: "death",
            year: c.deathYear,
            month: c.deathMonth || 12,
            day: c.deathDay || 30,
            characterId: c.id,
            houseId: c.houseId,
            territoryId: c.territoryId,
            importance: "notable",
            description: `Falecimento e memória de ${c.name}${c.title ? ", " + c.title : ""}. ${c.causeOfDeath ? "Causa: " + c.causeOfDeath : "Registrado nos anais do reino."}`,
            imageUrl: c.photoUrl || ""
          });
        }
      });
    }

    return list;
  }

  getFilteredTimelineEvents() {
    const events = this.getAllTimelineEvents();
    const query = (this.timelineSearchQuery || "").toLowerCase().trim();

    const filtered = events.filter(ev => {
      if (this.timelineCategoryFilter && this.timelineCategoryFilter !== "ALL" && ev.category !== this.timelineCategoryFilter) {
        return false;
      }
      if (this.timelineHouseFilter && this.timelineHouseFilter !== "ALL" && ev.houseId !== this.timelineHouseFilter) {
        return false;
      }
      if (this.timelineTerritoryFilter && this.timelineTerritoryFilter !== "ALL" && ev.territoryId !== this.timelineTerritoryFilter) {
        return false;
      }
      if (query) {
        const titleMatch = (ev.title || "").toLowerCase().includes(query);
        const descMatch = (ev.description || "").toLowerCase().includes(query);
        const charMatch = ev.characterId ? (this.engine.getCharacter(ev.characterId)?.name || "").toLowerCase().includes(query) : false;
        const houseMatch = ev.houseId ? (this.engine.getHouse(ev.houseId)?.name || "").toLowerCase().includes(query) : false;
        const terrMatch = ev.territoryId ? (this.engine.getTerritory(ev.territoryId)?.name || "").toLowerCase().includes(query) : false;
        if (!titleMatch && !descMatch && !charMatch && !houseMatch && !terrMatch) {
          return false;
        }
      }
      return true;
    });

    const mult = this.timelineSortOrder === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      const ya = Number(a.year) || 0;
      const yb = Number(b.year) || 0;
      if (ya !== yb) return (ya - yb) * mult;

      const ma = Number(a.month) || 1;
      const mb = Number(b.month) || 1;
      if (ma !== mb) return (ma - mb) * mult;

      const da = Number(a.day) || 1;
      const db = Number(b.day) || 1;
      return (da - db) * mult;
    });

    return filtered;
  }

  getTimelinePixelsPerYear() {
    let base = 140;
    if (this.timelineZoomMode === "month") base = 340;
    if (this.timelineZoomMode === "day") base = 980;
    return base * this.timelineZoom;
  }

  updateTimelineZoomModeFromZoom() {
    if (this.timelineZoom >= 3.0) {
      this.timelineZoomMode = "day";
    } else if (this.timelineZoom >= 1.6) {
      this.timelineZoomMode = "month";
    } else {
      this.timelineZoomMode = "year";
    }
  }

  renderTimeline() {
    const badge = document.getElementById("badgeTimelineCount");
    if (badge) badge.textContent = (this.engine.data.timelineMilestones || []).length;

    ["year", "month", "day"].forEach(m => {
      const btn = document.getElementById("btnZoom" + m.charAt(0).toUpperCase() + m.slice(1));
      if (btn) btn.classList.toggle("active", this.timelineZoomMode === m);
    });

    const zoomLbl = document.getElementById("timelineZoomLabel");
    if (zoomLbl) zoomLbl.textContent = Math.round(this.timelineZoom * 100) + "%";

    const chk = document.getElementById("chkIncludeCharLifeEvents");
    if (chk) chk.checked = this.timelineIncludeCharLifeEvents;

    const houseSel = document.getElementById("timelineHouseFilterSelect");
    if (houseSel && (houseSel.options.length <= 1 || houseSel.dataset.loaded !== "1")) {
      const currentVal = this.timelineHouseFilter || "ALL";
      houseSel.innerHTML = `<option value="ALL">Todas as Casas Nobres</option>` +
        (this.engine.data.houses || []).map(h => `<option value="${h.id}">${this.escapeHtml(h.name)}</option>`).join("");
      houseSel.value = currentVal;
      houseSel.dataset.loaded = "1";
    }

    const terrSel = document.getElementById("timelineTerritoryFilterSelect");
    if (terrSel && (terrSel.options.length <= 1 || terrSel.dataset.loaded !== "1")) {
      const currentVal = this.timelineTerritoryFilter || "ALL";
      terrSel.innerHTML = `<option value="ALL">Todos os Territórios</option>` +
        (this.engine.data.territories || []).map(t => `<option value="${t.id}">${this.escapeHtml(t.name)}</option>`).join("");
      terrSel.value = currentVal;
      terrSel.dataset.loaded = "1";
    }

    const allEvents = this.getAllTimelineEvents();
    const pillsBox = document.getElementById("timelineCategoryPillsContainer");
    if (pillsBox) {
      const catsList = [
        { id: "ALL", label: "Todas as Crônicas", icon: "📜" },
        { id: "war", label: "Guerras & Conflitos", icon: "⚔️" },
        { id: "battle", label: "Batalhas", icon: "🛡️" },
        { id: "birth", label: "Nascimentos", icon: "🌱" },
        { id: "death", label: "Mortes & Martírios", icon: "🪦" },
        { id: "coronation", label: "Coroações", icon: "👑" },
        { id: "wedding", label: "Matrimônios", icon: "💍" },
        { id: "foundation", label: "Fundações", icon: "🏰" },
        { id: "arcane", label: "Arcanos", icon: "✨" },
        { id: "general", label: "Crônica Geral", icon: "📜" }
      ];

      pillsBox.innerHTML = catsList.map(c => {
        const count = c.id === "ALL" ? allEvents.length : allEvents.filter(e => e.category === c.id).length;
        const isActive = (this.timelineCategoryFilter || "ALL") === c.id;
        return `
          <button class="timeline-cat-pill ${isActive ? "active" : ""}" onclick="app.setTimelineCategoryFilter('${c.id}')">
            <span>${c.icon}</span>
            <span>${c.label}</span>
            <span class="nav-badge" style="margin-left:4px; font-size:0.65rem;">${count}</span>
          </button>
        `;
      }).join("");
    }

    const filteredEvents = this.getFilteredTimelineEvents();
    const statsInfo = document.getElementById("timelineStatsInfo");
    if (statsInfo) {
      statsInfo.textContent = `${filteredEvents.length} acontecimentos no eixo cronológico`;
    }

    const scaleBadge = document.getElementById("timelineScaleBadge");
    if (scaleBadge) {
      scaleBadge.textContent = this.timelineZoomMode === "day"
        ? "Escala: Dias Exatos & Luas"
        : this.timelineZoomMode === "month"
        ? "Escala: Luas & Meses das Estações"
        : "Escala: Anos & Décadas";
    }

    this.renderHorizontalTimeline(filteredEvents);
  }

  renderHorizontalTimeline(filteredEvents) {
    const track = document.getElementById("timelineHorizontalTrack");
    if (!track) return;

    if (filteredEvents.length === 0) {
      track.style.width = "100%";
      track.innerHTML = `
        <div style="text-align:center; padding:120px 20px; color:var(--ink-dim); font-style:italic;">
          <div style="font-size:2.5rem; margin-bottom:10px;">📜</div>
          Nenhum acontecimento histórico coincide com os filtros da crônica.
          <div style="margin-top:14px;">
            <button class="btn btn-sm btn-medieval" onclick="app.setTimelineCategoryFilter('ALL')">Limpar Filtros</button>
            <button class="btn btn-sm btn-gold" onclick="app.openCreateMilestoneModal()" style="margin-left:8px;">+ Lavrar Novo Marco</button>
          </div>
        </div>
      `;
      return;
    }

    let minYear = Infinity;
    let maxYear = -Infinity;
    filteredEvents.forEach(e => {
      const y = Number(e.year);
      if (!isNaN(y)) {
        if (y < minYear) minYear = y;
        if (y > maxYear) maxYear = y;
      }
    });

    if (minYear === Infinity) {
      minYear = (this.engine.data.currentYear || 1220) - 20;
      maxYear = (this.engine.data.currentYear || 1220) + 10;
    }

    const startYear = Math.floor((minYear - 4) / 5) * 5;
    const endYear = Math.ceil((maxYear + 4) / 5) * 5;
    const totalYears = Math.max(10, endYear - startYear);

    this.timelineStartYear = startYear;
    this.timelineEndYear = endYear;

    const pixelsPerYear = this.getTimelinePixelsPerYear();
    const paddingX = 240;
    const totalWidth = Math.max(1200, totalYears * pixelsPerYear + paddingX * 2);
    track.style.width = `${totalWidth}px`;

    // Ativa desdobramento automático quando aproximado (zoom >= 1.35)
    const isZoomNear = this.timelineZoom >= 1.35;
    track.classList.toggle("zoom-revealed", isZoomNear);

    let html = "";

    // 1. Linha do Eixo Central Horizontal
    html += `<div class="timeline-main-axis" style="left:${paddingX - 40}px; right:${paddingX - 40}px;"></div>`;

    // 2. Marcas do tempo (Ticks)
    for (let yr = startYear; yr <= endYear; yr++) {
      const yrLeft = paddingX + (yr - startYear) * pixelsPerYear;
      const isDecade = yr % 10 === 0;
      const isFive = yr % 5 === 0;

      if (this.timelineZoomMode === "year") {
        if (isFive) {
          html += `
            <div class="timeline-axis-tick" style="left:${yrLeft}px;">
              <div class="${isDecade ? "axis-tick-mark-major" : "axis-tick-mark-minor"}"></div>
              <div class="axis-tick-label-year">${yr}</div>
            </div>
          `;
        } else {
          html += `
            <div class="timeline-axis-tick" style="left:${yrLeft}px;">
              <div class="axis-tick-mark-day"></div>
            </div>
          `;
        }
      } else if (this.timelineZoomMode === "month") {
        html += `
          <div class="timeline-axis-tick" style="left:${yrLeft}px;">
            <div class="axis-tick-mark-major"></div>
            <div class="axis-tick-label-year">${yr}</div>
          </div>
        `;
        for (let m = 1; m <= 12; m++) {
          const mLeft = yrLeft + (m / 12) * pixelsPerYear;
          const mInfo = FANTASY_MONTHS[m - 1];
          html += `
            <div class="timeline-axis-tick" style="left:${mLeft}px;">
              <div class="axis-tick-mark-month"></div>
              <div class="axis-tick-label-month" title="${mInfo.name}">${mInfo.name.split(" ")[0]}</div>
            </div>
          `;
        }
      } else if (this.timelineZoomMode === "day") {
        html += `
          <div class="timeline-axis-tick" style="left:${yrLeft}px;">
            <div class="axis-tick-mark-major"></div>
            <div class="axis-tick-label-year">${yr}</div>
          </div>
        `;
        for (let m = 1; m <= 12; m++) {
          const mStart = yrLeft + ((m - 1) / 12) * pixelsPerYear;
          const mInfo = FANTASY_MONTHS[m - 1];
          html += `
            <div class="timeline-axis-tick" style="left:${mStart}px;">
              <div class="axis-tick-mark-month"></div>
              <div class="axis-tick-label-month">${mInfo.name}</div>
            </div>
          `;
          for (let d = 5; d <= 30; d += 5) {
            const dLeft = mStart + (d / 30) * (pixelsPerYear / 12);
            html += `
              <div class="timeline-axis-tick" style="left:${dLeft}px;">
                <div class="axis-tick-mark-day"></div>
                <div class="axis-tick-label-day">d${d}</div>
              </div>
            `;
          }
        }
      }
    }

    // 3. Nós dos Acontecimentos na Linha Horizontal
    filteredEvents.forEach(ev => {
      const yr = Number(ev.year) || startYear;
      const m = Number(ev.month) || 1;
      const d = Number(ev.day) || 1;

      const yrFrac = yr - startYear;
      const mFrac = (m - 1) / 12;
      const dFrac = (d - 1) / (12 * 30);
      const nodeX = paddingX + (yrFrac + mFrac + dFrac) * pixelsPerYear;

      const meta = this.getTimelineCategoryMeta(ev.category);
      const isEpic = ev.importance === "epic";
      const isSelected = this.selectedMilestoneId === ev.id;
      const dateText = this.formatTimelineDate(yr, m, d, this.timelineZoomMode);

      let charCameoHtml = "";
      if (ev.characterId) {
        const char = this.engine.getCharacter(ev.characterId);
        if (char) {
          charCameoHtml = `
            <span class="badge-pill badge-noble" style="cursor:pointer;" onclick="event.stopPropagation(); app.openProfileModal('${char.id}')" title="Inspecionar códice de ${this.escapeHtml(char.name)}">
              ${char.photoUrl ? `<img class="timeline-cameo-thumb" src="${char.photoUrl}" onerror="this.style.display='none'" alt="" />` : "👤"}
              <span>${this.escapeHtml(char.name)}</span>
            </span>
          `;
        }
      }

      let houseHtml = "";
      if (ev.houseId) {
        const house = this.engine.getHouse(ev.houseId);
        if (house) {
          houseHtml = `
            <span class="badge-pill badge-twin" title="Dinastia vinculada">
              🏰 ${this.escapeHtml(house.name)}
            </span>
          `;
        }
      }

      let territoryHtml = "";
      if (ev.territoryId) {
        const terr = this.engine.getTerritory(ev.territoryId);
        if (terr) {
          territoryHtml = `
            <span class="badge-pill badge-avuncular" style="cursor:pointer;" onclick="event.stopPropagation(); app.switchTab('tab-map'); app.jumpToTerritoryOnMap('${terr.id}')" title="Ver no Mapa Cartográfico">
              🗺️ ${this.escapeHtml(terr.name)}
            </span>
          `;
        }
      }

      const imgHtml = ev.imageUrl
        ? `<img class="timeline-node-img-thumb" src="${this.escapeHtml(ev.imageUrl)}" alt="${this.escapeHtml(ev.title)}" onerror="this.style.display='none'" />`
        : "";

      html += `
        <div class="timeline-h-node ${isEpic ? "node-epic" : ""} ${isSelected ? "selected" : ""}"
             id="hnode-${ev.id}"
             style="left:${nodeX}px;"
             onclick="app.selectTimelineNode('${ev.id}')">
          
          <!-- Haste conectora superior -->
          <div class="timeline-stem-up"></div>

          <!-- Rótulo Superior: Nome do Evento e Data -->
          <div class="timeline-node-top-label" title="${this.escapeHtml(ev.title)} (${dateText})">
            <div class="timeline-node-event-title">${this.escapeHtml(ev.title)}</div>
            <div class="timeline-node-event-date">${dateText}</div>
          </div>

          <!-- Selo Heráldico sobre a Linha Horizontal -->
          <div class="timeline-node-seal" style="border-color:${meta.color}; color:${meta.color};" title="${this.escapeHtml(ev.title)} &bull; Clique para inspecionar">
            <span>${meta.icon}</span>
          </div>

          <!-- Haste conectora inferior -->
          <div class="timeline-stem-down"></div>

          <!-- Caixa Inferior: Resumo do Conto da Cronologia (Desdobra ao aproximar o zoom ou ao passar o mouse) -->
          <div class="timeline-node-summary-card" onclick="event.stopPropagation()">
            <div class="timeline-card-badges">
              <span class="badge-pill ${meta.badgeClass}" style="border-color:${meta.color}; color:${meta.color}; font-size:0.7rem;">
                ${meta.icon} ${meta.label}
              </span>
              ${isEpic ? `<span class="badge-pill badge-bastard" style="border-color:var(--gold-leaf); color:var(--gold-leaf); font-weight:700; font-size:0.68rem;">★ Marco Épico</span>` : ""}
            </div>

            ${(charCameoHtml || houseHtml || territoryHtml) ? `
              <div class="timeline-card-cameos">
                ${charCameoHtml}
                ${houseHtml}
                ${territoryHtml}
              </div>
            ` : ""}

            ${imgHtml}

            <div class="timeline-card-summary-text">${this.escapeHtml(ev.description || "Sem crônica detalhada registrada.")}</div>

            <div class="timeline-card-actions">
              ${ev.isSynthetic ? `
                <button class="btn btn-sm btn-medieval" onclick="app.openProfileModal('${ev.characterId}')" title="Inspecionar códice">Códice</button>
                <button class="btn btn-sm btn-medieval" onclick="app.switchTab('tab-tree')" title="Localizar na árvore">Árvore</button>
              ` : `
                <button class="btn btn-sm btn-medieval" onclick="app.openEditMilestoneModal('${ev.id}')" title="Editar este acontecimento">Editar</button>
                <button class="btn btn-sm btn-danger" onclick="app.confirmDeleteMilestone('${ev.id}')" title="Excluir marco da história">Excluir</button>
              `}
            </div>
          </div>
        </div>
      `;
    });

    track.innerHTML = html;
  }

  selectTimelineNode(milestoneId) {
    this.selectedMilestoneId = (this.selectedMilestoneId === milestoneId) ? null : milestoneId;
    const track = document.getElementById("timelineHorizontalTrack");
    if (!track) return;

    track.querySelectorAll(".timeline-h-node").forEach(n => {
      n.classList.toggle("selected", n.id === `hnode-${milestoneId}` && this.selectedMilestoneId === milestoneId);
    });
  }

  jumpTimelineToEvent(eventId) {
    this.selectedMilestoneId = eventId;
    const node = document.getElementById(`hnode-${eventId}`);
    const viewport = document.getElementById("timelineHorizontalViewport");
    if (node && viewport) {
      const nodeLeft = node.offsetLeft;
      viewport.scrollTo({
        left: Math.max(0, nodeLeft - viewport.clientWidth / 2),
        behavior: "smooth"
      });
      this.selectTimelineNode(eventId);
    }
  }

  jumpTimelineToYear(year) {
    const yr = Number(year);
    if (isNaN(yr)) return;

    const viewport = document.getElementById("timelineHorizontalViewport");
    if (!viewport) return;

    const startYear = this.timelineStartYear || 1200;
    const pixelsPerYear = this.getTimelinePixelsPerYear();
    const paddingX = 240;
    const targetX = paddingX + (yr - startYear) * pixelsPerYear;

    viewport.scrollTo({
      left: Math.max(0, targetX - viewport.clientWidth / 2),
      behavior: "smooth"
    });
  }

  jumpTimelineToInputYear() {
    const inp = document.getElementById("timelineJumpYearInput");
    if (inp && inp.value) {
      this.jumpTimelineToYear(inp.value);
    }
  }

  setTimelineZoomMode(mode) {
    if (mode === "year") this.timelineZoom = 1.0;
    else if (mode === "month") this.timelineZoom = 1.8;
    else if (mode === "day") this.timelineZoom = 3.2;
    this.timelineZoomMode = mode;
    this.renderTimeline();
  }

  adjustTimelineZoom(delta) {
    const newZoom = Math.max(0.4, Math.min(6.5, Number((this.timelineZoom + delta).toFixed(2))));
    if (newZoom !== this.timelineZoom) {
      this.timelineZoom = newZoom;
      this.updateTimelineZoomModeFromZoom();
      this.renderTimeline();
    }
  }

  resetTimelineZoom() {
    this.timelineZoom = 1.0;
    this.timelineZoomMode = "year";
    this.renderTimeline();
  }

  toggleTimelineSortOrder() {
    this.timelineSortOrder = this.timelineSortOrder === "asc" ? "desc" : "asc";
    this.renderTimeline();
  }

  toggleIncludeCharLifeEvents(checked) {
    this.timelineIncludeCharLifeEvents = !!checked;
    this.renderTimeline();
  }

  onTimelineSearchInput(val) {
    this.timelineSearchQuery = val;
    this.renderTimeline();
  }

  onTimelineHouseFilterChange(val) {
    this.timelineHouseFilter = val;
    this.renderTimeline();
  }

  onTimelineTerritoryFilterChange(val) {
    this.timelineTerritoryFilter = val;
    this.renderTimeline();
  }

  setTimelineCategoryFilter(cat) {
    this.timelineCategoryFilter = cat;
    this.renderTimeline();
  }

  openCreateMilestoneModal(presetYear = null, presetCategory = "war") {
    const curYear = presetYear !== null ? Number(presetYear) : (this.engine.data.currentYear || 1220);
    const m = {
      title: "",
      category: presetCategory,
      importance: "normal",
      year: curYear,
      month: 1,
      day: 1,
      characterId: "",
      houseId: "",
      territoryId: "",
      description: "",
      imageUrl: ""
    };
    this.renderMilestoneModalForm(m, "");
  }

  openEditMilestoneModal(milestoneId) {
    const m = (this.engine.data.timelineMilestones || []).find(e => e.id === milestoneId);
    if (!m) return;
    this.renderMilestoneModalForm(m, milestoneId);
  }

  renderMilestoneModalForm(m, editId = "") {
    const chars = this.engine.data.characters || [];
    const houses = this.engine.data.houses || [];
    const terrs = this.engine.data.territories || [];

    const catsOptions = Object.entries(TIMELINE_CATEGORIES).map(([k, meta]) => {
      return `<option value="${k}" ${m.category === k ? "selected" : ""}>${meta.icon} ${meta.label}</option>`;
    }).join("");

    const monthsOptions = FANTASY_MONTHS.map(mo => {
      return `<option value="${mo.num}" ${Number(m.month) === mo.num ? "selected" : ""}>Mês ${mo.num}: ${mo.name} (${mo.season})</option>`;
    }).join("");

    const charsOptions = `<option value="">Nenhum personagem vinculado</option>` +
      chars.map(c => `<option value="${c.id}" ${m.characterId === c.id ? "selected" : ""}>${this.escapeHtml(c.name)}${c.title ? " &bull; " + this.escapeHtml(c.title) : ""}</option>`).join("");

    const housesOptions = `<option value="">Nenhuma casa nobre vinculada</option>` +
      houses.map(h => `<option value="${h.id}" ${m.houseId === h.id ? "selected" : ""}>${this.escapeHtml(h.name)}</option>`).join("");

    const terrOptions = `<option value="">Nenhum território vinculado</option>` +
      terrs.map(t => `<option value="${t.id}" ${m.territoryId === t.id ? "selected" : ""}>${this.escapeHtml(t.name)}</option>`).join("");

    const bodyHtml = `
      <div class="form-group">
        <label>Título do Acontecimento Histórico / Guerra / Marco:</label>
        <input type="text" id="mf_title" value="${this.escapeHtml(m.title || "")}" placeholder="Ex: Início da Guerra das Três Pontes, Coroação de Aldric I..." />
      </div>

      <div class="form-row">
        <div class="form-group" style="flex:1;">
          <label>Categoria:</label>
          <select id="mf_category">
            ${catsOptions}
          </select>
        </div>
        <div class="form-group" style="flex:1;">
          <label>Importância Histórica:</label>
          <select id="mf_importance">
            <option value="normal" ${m.importance === "normal" ? "selected" : ""}>Comum / Notável</option>
            <option value="notable" ${m.importance === "notable" ? "selected" : ""}>Grande Acontecimento</option>
            <option value="epic" ${m.importance === "epic" ? "selected" : ""}>★ Marco Lendário / Épico</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group" style="flex:1;">
          <label>Ano Histórico:</label>
          <input type="number" id="mf_year" value="${m.year || 1200}" />
        </div>
        <div class="form-group" style="flex:1.5;">
          <label>Lua / Mês das Estações:</label>
          <select id="mf_month">
            ${monthsOptions}
          </select>
        </div>
        <div class="form-group" style="flex:0.8;">
          <label>Dia (1 a 30):</label>
          <input type="number" id="mf_day" min="1" max="30" value="${m.day || 1}" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group" style="flex:1;">
          <label>Personagem Central (Opcional):</label>
          <select id="mf_charId">
            ${charsOptions}
          </select>
        </div>
        <div class="form-group" style="flex:1;">
          <label>Casa Nobre / Facção (Opcional):</label>
          <select id="mf_houseId">
            ${housesOptions}
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Território / Feudo no Mapa (Opcional):</label>
        <select id="mf_territoryId">
          ${terrOptions}
        </select>
      </div>

      <div class="form-group">
        <label>Crônica &amp; Detalhes Históricos:</label>
        <textarea id="mf_desc" rows="4" placeholder="Descreva os fatores que desencadearam a guerra, as consequências políticas, a morte de personagens ou o legado do acontecimento...">${this.escapeHtml(m.description || "")}</textarea>
      </div>

      <div class="form-group">
        <label>Ilustração / Gravura Histórica (URL da Imagem - Opcional):</label>
        <input type="text" id="mf_imageUrl" value="${this.escapeHtml(m.imageUrl || "")}" placeholder="https://..." />
      </div>
    `;

    const title = editId ? "Editar Marco nos Anais da História" : "Lavrar Novo Marco na Cronologia";
    const footerHtml = `
      <button class="btn btn-medieval" onclick="app.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="app.saveMilestoneFromModal('${editId || ""}')">
        ${editId ? "Salvar Alterações" : "Gravar nos Anais da História"}
      </button>
    `;

    this.showModal(title, bodyHtml, footerHtml);
  }

  saveMilestoneFromModal(editId = "") {
    const title = document.getElementById("mf_title")?.value.trim();
    if (!title) {
      alert("Por favor, forneça um título para o marco histórico.");
      return;
    }

    const category = document.getElementById("mf_category")?.value || "general";
    const importance = document.getElementById("mf_importance")?.value || "normal";
    const year = Number(document.getElementById("mf_year")?.value) || this.engine.data.currentYear || 1220;
    const month = Number(document.getElementById("mf_month")?.value) || 1;
    const day = Math.max(1, Math.min(30, Number(document.getElementById("mf_day")?.value) || 1));
    const characterId = document.getElementById("mf_charId")?.value || null;
    const houseId = document.getElementById("mf_houseId")?.value || null;
    const territoryId = document.getElementById("mf_territoryId")?.value || null;
    const description = document.getElementById("mf_desc")?.value.trim() || "";
    const imageUrl = document.getElementById("mf_imageUrl")?.value.trim() || "";

    const snapshot = this.engine.createSnapshot();

    if (!Array.isArray(this.engine.data.timelineMilestones)) {
      this.engine.data.timelineMilestones = [];
    }

    const meta = this.getTimelineCategoryMeta(category);

    if (editId) {
      const idx = this.engine.data.timelineMilestones.findIndex(m => m.id === editId);
      if (idx !== -1) {
        const old = this.engine.data.timelineMilestones[idx];
        this.engine.data.timelineMilestones[idx] = {
          ...old,
          title,
          category,
          importance,
          year,
          month,
          day,
          characterId,
          houseId,
          territoryId,
          description,
          imageUrl
        };

        this.engine.recordAuditLog(
          "CRONOLOGIA",
          "Alteração de Marco Histórico",
          `Marco Atualizado: "${title}" (Ano ${year})`,
          `O marco histórico "${title}" teve suas propriedades atualizadas nos anais da cronologia.`,
          snapshot
        );
      }
    } else {
      const newMilestone = {
        id: "ms_" + Date.now(),
        title,
        category,
        importance,
        year,
        month,
        day,
        characterId,
        houseId,
        territoryId,
        description,
        imageUrl
      };
      this.engine.data.timelineMilestones.push(newMilestone);

      this.engine.recordAuditLog(
        "CRONOLOGIA",
        "Inscrição de Marco Histórico",
        `Novo Marco nos Anais: "${title}" (Ano ${year})`,
        `Lavrado nos anais do mundo: "${title}" sob a categoria ${meta.label}.`,
        snapshot
      );
    }

    this.engine.saveToStorage();
    this.closeModal();
    this.syncHeaderAndBadges();
    this.renderTimeline();
    this.renderAuditHistory();
  }

  confirmDeleteMilestone(milestoneId) {
    const m = (this.engine.data.timelineMilestones || []).find(e => e.id === milestoneId);
    if (!m) return;

    this.showModal(
      `Confirmar Exclusão de Marco Histórico`,
      `
        <div class="alert-banner alert-danger" style="margin-bottom:12px;">
          <strong>Atenção:</strong> Você está prestes a apagar o marco <strong>"${this.escapeHtml(m.title)}"</strong> (Ano ${m.year}) da cronologia do mundo.
        </div>
        <p style="color:var(--parchment-bright); font-size:0.9rem;">
          Esta ação ficará documentada nos <strong>Anais do Reino</strong> e poderá ser revogada a qualquer momento se desejar recuperar o registro histórico.
        </p>
      `,
      `
        <button class="btn btn-medieval" onclick="app.closeModal()">Cancelar</button>
        <button class="btn btn-danger" onclick="app.deleteMilestone('${m.id}')">Confirmar Exclusão</button>
      `
    );
  }

  deleteMilestone(milestoneId) {
    const m = (this.engine.data.timelineMilestones || []).find(e => e.id === milestoneId);
    if (!m) {
      this.closeModal();
      return;
    }

    const snapshot = this.engine.createSnapshot();
    this.engine.data.timelineMilestones = this.engine.data.timelineMilestones.filter(e => e.id !== milestoneId);

    this.engine.recordAuditLog(
      "CRONOLOGIA",
      "Exclusão de Marco Histórico",
      `Marco Excluído: "${m.title}" (Ano ${m.year})`,
      `O marco histórico "${m.title}" foi removido da cronologia. Ação revogável.`,
      snapshot
    );

    this.engine.saveToStorage();
    this.closeModal();
    this.syncHeaderAndBadges();
    this.renderTimeline();
    this.renderAuditHistory();
  }

  initTimelineEvents() {
    const viewport = document.getElementById("timelineHorizontalViewport");
    if (!viewport) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    viewport.addEventListener("mousedown", e => {
      // Evita arrastar quando clica em botões de ação ou links
      if (e.target.closest("button") || e.target.closest("a") || e.target.closest("select") || e.target.closest("input")) {
        return;
      }
      isDown = true;
      startX = e.pageX - viewport.offsetLeft;
      scrollLeft = viewport.scrollLeft;
      viewport.style.cursor = "grabbing";
    });

    window.addEventListener("mouseup", () => {
      isDown = false;
      if (viewport) viewport.style.cursor = "grab";
    });

    viewport.addEventListener("mouseleave", () => {
      isDown = false;
      if (viewport) viewport.style.cursor = "grab";
    });

    viewport.addEventListener("mousemove", e => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - viewport.offsetLeft;
      const walk = (x - startX);
      viewport.scrollLeft = scrollLeft - walk;
    });

    // Zoom direto com o scroll do mouse sobre determinado ponto da linha do tempo!
    viewport.addEventListener("wheel", e => {
      e.preventDefault();

      const rect = viewport.getBoundingClientRect();
      const mouseViewportX = e.clientX - rect.left;
      const currentScrollLeft = viewport.scrollLeft;

      const pixelsPerYearOld = this.getTimelinePixelsPerYear();
      const paddingX = 240;
      const startYear = this.timelineStartYear || 1200;

      // Ano histórico exato sob o cursor no momento do scroll
      const trackXOld = currentScrollLeft + mouseViewportX;
      const yearUnderCursor = startYear + (trackXOld - paddingX) / pixelsPerYearOld;

      // Fator de aproximação / afastamento
      const zoomFactor = e.deltaY < 0 ? 1.2 : 0.833;
      let newZoom = Number((this.timelineZoom * zoomFactor).toFixed(2));
      newZoom = Math.max(0.4, Math.min(6.5, newZoom));

      if (newZoom !== this.timelineZoom) {
        this.timelineZoom = newZoom;
        this.updateTimelineZoomModeFromZoom();
        this.renderTimeline();

        // Reposiciona o scroll horizontal para manter o ponto do ano sob o cursor!
        const pixelsPerYearNew = this.getTimelinePixelsPerYear();
        const trackXNew = paddingX + (yearUnderCursor - startYear) * pixelsPerYearNew;
        viewport.scrollLeft = Math.max(0, trackXNew - mouseViewportX);
      }
    }, { passive: false });
  }

  // --------------------------------------------------------------------------
  // GRIMÓRIO ARCANO (MAGIAS, POÇÕES, ENCANTAMENTOS E CRIAÇÕES)
  // --------------------------------------------------------------------------
  renderGrimoire() {
    const pillsBox = document.getElementById("grimoireCategoryPills");
    const grid = document.getElementById("creationsGridContainer");
    const searchVal = (document.getElementById("grimoireSearchInput")?.value || "").toLowerCase();
    if (!pillsBox || !grid) return;

    const cats = ["ALL", ...(this.engine.data.creationCategories || [])];
    pillsBox.innerHTML = cats
      .map(
        cat => `
        <button class="btn btn-sm ${this.activeGrimoireCategory === cat ? "btn-primary" : "btn-medieval"}"
                onclick="app.setGrimoireCategory('${this.escapeHtml(cat)}')">
          ${cat === "ALL" ? "Todos os Arcanos" : this.escapeHtml(cat)}
        </button>
      `
      )
      .join("");

    const filtered = this.engine.data.creations.filter(item => {
      const matchCat = this.activeGrimoireCategory === "ALL" || item.category === this.activeGrimoireCategory;
      const matchSearch =
        !searchVal ||
        item.name.toLowerCase().includes(searchVal) ||
        (item.effect || "").toLowerCase().includes(searchVal) ||
        (item.lore || "").toLowerCase().includes(searchVal) ||
        (item.category || "").toLowerCase().includes(searchVal);
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="card-box"><p>Nenhum encantamento, poção ou tomo encontrado sob este filtro.</p></div>`;
      return;
    }

    grid.innerHTML = filtered
      .map(item => {
        const terr = this.engine.getTerritory(item.originTerritoryId);
        const relChars = (item.relatedCharacterIds || [])
          .map(id => this.engine.getCharacter(id))
          .filter(Boolean);

        const imageHtml = item.imageUrl
          ? `
            <div class="creation-img-container">
              <img src="${this.escapeHtml(item.imageUrl)}" alt="${this.escapeHtml(item.name)}" class="creation-img" />
            </div>
          `
          : "";

        return `
          <div class="creation-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="creation-cat-tag">${this.escapeHtml(item.category)} &bull; ${this.escapeHtml(item.powerLevel || "Arcano")}</span>
              <div style="display:flex; gap:4px;">
                <button class="btn btn-sm btn-medieval" onclick="app.openCreationModal('${item.id}')">Editar</button>
                <button class="btn btn-sm btn-danger" onclick="app.openDeleteCreationModal('${item.id}')" title="Excluir criação do Grimório">&times;</button>
              </div>
            </div>
            ${imageHtml}
            <h3 style="font-family:var(--font-display); color:var(--gold-leaf); font-size:0.95rem; text-transform:uppercase;">${this.escapeHtml(item.name)}</h3>
            <p style="font-size:0.9rem; color:var(--ink-parchment);"><strong>Efeito:</strong> ${this.escapeHtml(item.effect || "&mdash;")}</p>
            <p style="font-size:0.86rem; color:var(--ink-secondary);"><strong>Ingredientes / Catalisadores:</strong> ${this.escapeHtml(item.ingredientsOrCost || "&mdash;")}</p>
            <p style="font-size:0.84rem; color:var(--ink-dim); font-style:italic;">&ldquo;${this.escapeHtml(item.lore || "")}&rdquo;</p>
            <div style="margin-top:auto; padding-top:6px; border-top:1px solid var(--border-gold-subtle); font-size:0.8rem; color:var(--gold-muted);">
              Feudo de Origem: ${terr ? this.escapeHtml(terr.name) : "Origem ancestral desconhecida"}
              ${relChars.length > 0 ? `<br/>Vínculo: ${relChars.map(c => this.escapeHtml(c.name)).join(", ")}` : ""}
            </div>
          </div>
        `;
      })
      .join("");
  }

  setGrimoireCategory(cat) {
    this.activeGrimoireCategory = cat;
    this.renderGrimoire();
  }

  promptNewCreationCategory() {
    const bodyHtml = `
      <div class="form-group">
        <label>Nome da Nova Categoria Arcana:</label>
        <input
          type="text"
          id="modalNewCatName"
          placeholder="Ex: Runas Antigas, Venenos Reais, Relíquias, Bestiário..."
          class="input-medieval"
          style="width:100%;"
          onkeydown="if(event.key==='Enter') app.confirmNewCreationCategory()"
        />
      </div>

      <div class="card-box" style="margin-top:12px; padding:12px;">
        <h4 style="font-family:var(--font-display); color:var(--gold-leaf); font-size:0.84rem; text-transform:uppercase; margin-bottom:6px;">
          Disciplinas Arcanas do Reino
        </h4>
        <p style="font-size:0.88rem; color:var(--ink-secondary); line-height:1.5;">
          A nova categoria aparecerá imediatamente como um filtro superior no Grimório e estará disponível para classificação de novos feitiços, poções e rituais.
        </p>
      </div>
      <div id="newCatErrorMsg" style="display:none; margin-top:8px;" class="alert-banner alert-danger"></div>
    `;

    const footerHtml = `
      <button class="btn btn-medieval" onclick="app.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="app.confirmNewCreationCategory()">Consagrar Categoria</button>
    `;

    this.showModal("Consagrar Nova Categoria no Grimório", bodyHtml, footerHtml);
    setTimeout(() => {
      const inp = document.getElementById("modalNewCatName");
      if (inp) inp.focus();
    }, 50);
  }

  confirmNewCreationCategory() {
    const inp = document.getElementById("modalNewCatName");
    const errBox = document.getElementById("newCatErrorMsg");
    if (!inp) return;
    const clean = inp.value.trim();

    if (!clean) {
      if (errBox) {
        errBox.textContent = "Por favor, informe o nome da categoria arcana.";
        errBox.style.display = "block";
      }
      inp.focus();
      return;
    }

    if (!Array.isArray(this.engine.data.creationCategories)) {
      this.engine.data.creationCategories = [];
    }

    const alreadyExists = this.engine.data.creationCategories.some(
      c => c.toLowerCase() === clean.toLowerCase()
    );

    if (alreadyExists) {
      if (errBox) {
        errBox.textContent = `A categoria "${clean}" já se encontra consagrada no Grimório.`;
        errBox.style.display = "block";
      }
      return;
    }

    const snapshot = this.engine.createSnapshot();
    this.engine.data.creationCategories.push(clean);

    this.engine.recordAuditLog(
      "GRIMÓRIO",
      "Consagração de Categoria",
      `Nova Categoria Arcana: ${clean}`,
      `A disciplina "${clean}" foi formalizada no Grimório Arcano.`,
      snapshot
    );

    this.engine.saveToStorage();
    this.activeGrimoireCategory = clean;
    this.closeModal();
    this.renderGrimoire();
  }

  handleCreationPhotoFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const urlInput = document.getElementById("crf_imageUrl");
      if (urlInput) {
        urlInput.value = ev.target.result;
        this.updateCreationImagePreview(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  }

  updateCreationImagePreview(url) {
    const box = document.getElementById("crf_imagePreviewBox");
    const img = document.getElementById("crf_imagePreviewImg");
    if (!box || !img) return;
    if (url && url.trim()) {
      img.src = url.trim();
      box.style.display = "block";
    } else {
      img.src = "";
      box.style.display = "none";
    }
  }

  openCreationModal(editId = null) {
    const item = editId
      ? this.engine.data.creations.find(x => x.id === editId)
      : {
          name: "",
          category: this.activeGrimoireCategory !== "ALL" ? this.activeGrimoireCategory : "Magia",
          powerLevel: "Arcano",
          originTerritoryId: "",
          imageUrl: "",
          ingredientsOrCost: "",
          effect: "",
          lore: ""
        };

    const catOpts = (this.engine.data.creationCategories || [])
      .map(cat => `<option value="${this.escapeHtml(cat)}" ${item.category === cat ? "selected" : ""}>${this.escapeHtml(cat)}</option>`)
      .join("");

    const terrOpts = [`<option value="">— Origem Livre / Desconhecida —</option>`]
      .concat(
        this.engine.data.territories.map(
          t => `<option value="${t.id}" ${item.originTerritoryId === t.id ? "selected" : ""}>${this.escapeHtml(t.name)}</option>`
        )
      )
      .join("");

    const bodyHtml = `
      <div class="form-row">
        <div class="form-group">
          <label>Nome do Encantamento / Criação:</label>
          <input type="text" id="crf_name" value="${this.escapeHtml(item.name)}" placeholder="Ex: Lâmina do Sangue Real" />
        </div>
        <div class="form-group">
          <label>Categoria:</label>
          <select id="crf_category">${catOpts}</select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Raridade / Poder:</label>
          <input type="text" id="crf_power" value="${this.escapeHtml(item.powerLevel || "")}" placeholder="Ex: Proibida, Ancestral, Cerimonial..." />
        </div>
        <div class="form-group">
          <label>Feudo de Origem:</label>
          <select id="crf_territory">${terrOpts}</select>
        </div>
      </div>

      <div class="form-group">
        <label>Ilustração / Pintura Arcana (Arquivo Local ou Link URL):</label>
        <div style="display:flex; gap:8px; align-items:center;">
          <input
            type="text"
            id="crf_imageUrl"
            value="${this.escapeHtml(item.imageUrl || "")}"
            placeholder="Cole uma URL ou clique em Carregar Arquivo..."
            class="input-medieval"
            style="flex:1;"
            oninput="app.updateCreationImagePreview(this.value)"
          />
          <button type="button" class="btn btn-sm btn-gold" onclick="document.getElementById('crf_imageFileInput').click()">Carregar Arquivo</button>
          <input
            type="file"
            id="crf_imageFileInput"
            accept="image/*"
            style="display:none;"
            onchange="app.handleCreationPhotoFile(event)"
          />
          <button
            type="button"
            class="btn btn-sm btn-medieval"
            onclick="document.getElementById('crf_imageUrl').value=''; app.updateCreationImagePreview('');"
            title="Remover ilustração"
          >Limpar</button>
        </div>
        <div id="crf_imagePreviewBox" style="${item.imageUrl ? 'display:block;' : 'display:none;'} margin-top:8px; text-align:center;">
          <img
            id="crf_imagePreviewImg"
            src="${this.escapeHtml(item.imageUrl || "")}"
            alt="Prévia da Ilustração"
            style="max-height:160px; max-width:100%; border-radius:4px; border:1px solid var(--border-gold-subtle); object-fit:contain; background:#120e0a; padding:2px;"
          />
        </div>
      </div>

      <div class="form-group">
        <label>Ingredientes, Catalisadores ou Custo:</label>
        <input type="text" id="crf_cost" value="${this.escapeHtml(item.ingredientsOrCost || "")}" placeholder="Ex: Três gotas de sangue de linhagem real e cinzas de rubi" />
      </div>

      <div class="form-group">
        <label>Efeito Prático:</label>
        <textarea id="crf_effect" rows="2">${this.escapeHtml(item.effect || "")}</textarea>
      </div>

      <div class="form-group">
        <label>História / Tradição nos Anais:</label>
        <textarea id="crf_lore" rows="2">${this.escapeHtml(item.lore || "")}</textarea>
      </div>
    `;

    this.showModal(
      editId ? `Editar Criação: ${item.name}` : `Inscrever Criação no Grimório`,
      bodyHtml,
      `
        <button class="btn btn-medieval" onclick="app.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="app.saveCreationFromModal('${editId || ""}')">Salvar no Grimório</button>
      `
    );
  }

  saveCreationFromModal(editId = "") {
    const name = document.getElementById("crf_name").value.trim() || "Nova Criação";
    const category = document.getElementById("crf_category").value;
    const powerLevel = document.getElementById("crf_power").value.trim() || "Arcano";
    const originTerritoryId = document.getElementById("crf_territory").value || null;
    const imageUrl = document.getElementById("crf_imageUrl")?.value.trim() || "";
    const ingredientsOrCost = document.getElementById("crf_cost").value.trim();
    const effect = document.getElementById("crf_effect").value.trim();
    const lore = document.getElementById("crf_lore").value.trim();

    const snapshot = this.engine.createSnapshot();

    if (editId) {
      const existing = this.engine.data.creations.find(x => x.id === editId);
      if (existing) {
        Object.assign(existing, { name, category, powerLevel, originTerritoryId, imageUrl, ingredientsOrCost, effect, lore });
      }
      this.engine.recordAuditLog(
        "GRIMÓRIO",
        "Revisão Arcana",
        `Edição no Grimório: ${name}`,
        `O registro arcano "${name}" (${category}) teve seus efeitos, custos, ilustrações e tradições atualizados.`,
        snapshot
      );
    } else {
      this.engine.data.creations.push({
        id: "cre_" + Date.now(),
        name,
        category,
        powerLevel,
        originTerritoryId,
        relatedCharacterIds: [],
        imageUrl,
        ingredientsOrCost,
        effect,
        lore
      });
      this.engine.recordAuditLog(
        "GRIMÓRIO",
        "Inscrição Arcana",
        `Nova Inscrição: ${name}`,
        `Inscrito sob a categoria "${category}". Poder: "${powerLevel}". Efeito: "${effect || "Sem efeito lavrado"}".`,
        snapshot
      );
    }

    this.engine.saveToStorage();
    this.closeModal();
    this.syncHeaderAndBadges();
    this.renderGrimoire();
  }

  openDeleteCreationModal(id) {
    const item = this.engine.data.creations.find(x => x.id === id);
    if (!item) return;

    const bodyHtml = `
      <div class="alert-banner alert-danger">
        <h4 style="margin-bottom:6px;">Confirmação de Revogação Arcana</h4>
        Deseja realmente excluir <strong>&ldquo;${this.escapeHtml(item.name)}&rdquo;</strong> (${this.escapeHtml(item.category)}) do Grimório?
      </div>
      <p style="font-size:0.92rem; color:var(--ink-secondary); margin-top:12px; line-height:1.5;">
        Esta exclusão será registrada nos <strong>Anais do Reino</strong> com auditoria completa e poderá ser revertida a qualquer momento na aba Anais.
      </p>
    `;

    const footerHtml = `
      <button class="btn btn-medieval" onclick="app.closeModal()">Cancelar</button>
      <button class="btn btn-danger" onclick="app.confirmDeleteCreation('${item.id}')">
        Confirmar Exclusão
      </button>
    `;

    this.showModal(`Excluir do Grimório: ${item.name}`, bodyHtml, footerHtml);
  }

  confirmDeleteCreation(id) {
    const item = this.engine.data.creations.find(x => x.id === id);
    if (!item) {
      this.closeModal();
      return;
    }

    const snapshot = this.engine.createSnapshot();
    const itemName = item.name;
    const itemCat = item.category;

    this.engine.data.creations = this.engine.data.creations.filter(x => x.id !== id);
    this.engine.recordAuditLog(
      "GRIMÓRIO",
      "Revogação Arcana",
      `Excluído do Grimório: ${itemName}`,
      `O registro arcano "${itemName}" (${itemCat}) foi removido do tomo.`,
      snapshot
    );

    this.engine.saveToStorage();
    this.closeModal();
    this.syncHeaderAndBadges();
    this.renderGrimoire();
  }

  deleteCreation(id) {
    this.openDeleteCreationModal(id);
  }

  // --------------------------------------------------------------------------
  // CARTOGRAFIA DO REINO (EDITOR DE TERRITÓRIOS, RELEVO E OCEANO COM ONDAS)
  // --------------------------------------------------------------------------
  toggleMapEditMode() {
    this.isMapEditMode = !this.isMapEditMode;
    this.updateMapEditModeUI();
    if (!this.isMapEditMode) {
      this.hoveredMapHandle = null;
      this.draggingVertex = null;
      this.draggingTerritory = null;
      this.isDrawingMap = false;
      this.mapTool = "select";
    } else {
      this.setMapTool("select");
    }
    this.renderMapStudio();
  }

  updateMapEditModeUI() {
    const btn = document.getElementById("btnToggleMapEdit");
    const textEl = document.getElementById("toggleMapEditText");
    const iconEl = document.getElementById("iconToggleMapEdit");
    const badgeEl = document.getElementById("mapModeBadge");
    const badgeTextEl = document.getElementById("mapModeBadgeText");
    const controls = document.getElementById("mapEditControls");
    const helperBar = document.getElementById("mapHelperBar");

    if (this.isMapEditMode) {
      if (btn) {
        btn.classList.add("btn-editing-active");
        btn.title = "Clique para concluir a edição e retornar ao modo de exibição limpo";
      }
      if (textEl) textEl.textContent = "Concluir Edição";
      if (iconEl) {
        iconEl.innerHTML = `<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>`;
      }
      if (badgeEl) {
        badgeEl.className = "map-mode-badge edit-mode";
      }
      if (badgeTextEl) badgeTextEl.textContent = "Modo de Edição";
      if (controls) controls.style.display = "flex";
      if (helperBar) helperBar.style.display = "flex";
    } else {
      if (btn) {
        btn.classList.remove("btn-editing-active");
        btn.title = "Clique no lápis para habilitar a edição do mapa, continentes e traços";
      }
      if (textEl) textEl.textContent = "Habilitar Edição";
      if (iconEl) {
        iconEl.innerHTML = `<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>`;
      }
      if (badgeEl) {
        badgeEl.className = "map-mode-badge view-mode";
      }
      if (badgeTextEl) badgeTextEl.textContent = "Modo de Exibição";
      if (controls) controls.style.display = "none";
      if (helperBar) helperBar.style.display = "none";
    }
  }

  toggleContinentNames() {
    this.showContinentNames = !this.showContinentNames;
    const btnText = document.getElementById("toggleContinentNamesText");
    const btnIcon = document.getElementById("iconToggleContinentNames");
    const btn = document.getElementById("btnToggleContinentNames");
    if (this.showContinentNames) {
      if (btnText) btnText.textContent = "Ocultar Nomes";
      if (btn) {
        btn.classList.remove("btn-names-hidden");
        btn.title = "Ocultar os nomes dos continentes no mapa";
      }
      if (btnIcon) {
        btnIcon.innerHTML = `<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>`;
      }
    } else {
      if (btnText) btnText.textContent = "Exibir Nomes";
      if (btn) {
        btn.classList.add("btn-names-hidden");
        btn.title = "Exibir os nomes dos continentes no mapa";
      }
      if (btnIcon) {
        btnIcon.innerHTML = `<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/>`;
      }
    }
    this.drawMapCanvas();
  }

  setMapTool(tool) {
    if (!this.isMapEditMode) {
      this.isMapEditMode = true;
      this.updateMapEditModeUI();
    }
    this.mapTool = tool;
    ["Select", "Mountain", "Tree", "Road", "River", "Capital", "City"].forEach(suffix => {
      const btn = document.getElementById("mapTool" + suffix);
      if (btn) {
        btn.classList.remove("active-tool");
      }
    });
    const mapIds = {
      select: "mapToolSelect",
      draw_mountain: "mapToolMountain",
      draw_tree: "mapToolTree",
      draw_road: "mapToolRoad",
      draw_river: "mapToolRiver",
      add_capital: "mapToolCapital",
      add_city: "mapToolCity"
    };
    const activeBtn = document.getElementById(mapIds[tool]);
    if (activeBtn) {
      activeBtn.classList.add("active-tool");
    }
    this.drawMapCanvas();
  }

  // ------------------------------------------------------------------------
  // SISTEMA DE NAVEGAÇÃO & VISUALIZAÇÃO DO MINI MAPA INFINITO
  // ------------------------------------------------------------------------

  adjustMapZoom(delta) {
    const canvas = document.getElementById("fantasyMapCanvas");
    const cx = canvas ? canvas.width / 2 : 480;
    const cy = canvas ? canvas.height / 2 : 280;
    const factor = delta > 0 ? 1 + delta : 1 / (1 - delta);
    this.zoomMapAt(cx, cy, factor);
  }

  resetMapZoom() {
    this.mapZoom = 1.0;
    this.mapPanX = 0;
    this.mapPanY = 0;
    this.updateMapZoomUI();
    this.drawMapCanvas();
    this.renderMapStudio();
  }

  updateMapZoomUI() {
    const label = document.getElementById("mapZoomLabel");
    if (label) {
      label.textContent = `${Math.round(this.mapZoom * 100)}%`;
    }
  }

  // Converte coordenadas da tela para as coordenadas do mundo infinito
  getMapWorldCoords(e) {
    const canvas = document.getElementById("fantasyMapCanvas");
    if (!canvas) return { x: 0, y: 0, screenX: 0, screenY: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const screenX = (e.clientX - rect.left) * scaleX;
    const screenY = (e.clientY - rect.top) * scaleY;
    return {
      x: Math.round((screenX - this.mapPanX) / this.mapZoom),
      y: Math.round((screenY - this.mapPanY) / this.mapZoom),
      screenX,
      screenY
    };
  }

  // Converte coordenadas do mundo para a tela
  worldToMapScreen(wx, wy) {
    return {
      x: wx * this.mapZoom + this.mapPanX,
      y: wy * this.mapZoom + this.mapPanY
    };
  }

  zoomMapAt(screenX, screenY, factor) {
    const newZoom = Math.max(0.18, Math.min(4.5, this.mapZoom * factor));
    if (Math.abs(newZoom - this.mapZoom) < 0.001) return;
    const worldX = (screenX - this.mapPanX) / this.mapZoom;
    const worldY = (screenY - this.mapPanY) / this.mapZoom;
    this.mapPanX = Math.round(screenX - worldX * newZoom);
    this.mapPanY = Math.round(screenY - worldY * newZoom);
    this.mapZoom = Number(newZoom.toFixed(3));
    this.updateMapZoomUI();
    this.drawMapCanvas();
    this.renderMapStudio();
  }

  // Adiciona na tela um novo elemento Território (Continente / Terra) sobre o oceano infinito
  addContinentOnMap(customX = null, customY = null) {
    this.engine.ensureTerritoryPolygons(this.engine.data.territories);
    const snapshot = this.engine.createSnapshot();

    const canvas = document.getElementById("fantasyMapCanvas");
    const cw = canvas ? canvas.width : 960;
    const ch = canvas ? canvas.height : 560;

    // Se não especificado, insere no centro visível do viewport da autora no oceano infinito
    const viewportCenterWorldX = Math.round((cw / 2 - this.mapPanX) / this.mapZoom);
    const viewportCenterWorldY = Math.round((ch / 2 - this.mapPanY) / this.mapZoom);

    const count = this.engine.data.territories.length;
    const cx = customX !== null ? customX : viewportCenterWorldX;
    const cy = customY !== null ? customY : viewportCenterWorldY;

    const palette = ["#d97706", "#e11d48", "#38bdf8", "#10b981", "#a855f7", "#f59e0b", "#ec4899", "#14b8a6"];
    const color = palette[count % palette.length];
    const defaultHouseId = (this.engine.data.houses[0] && this.engine.data.houses[0].id) || "";
    const points = this.engine.generateContinentPoints(cx, cy, 110, 85, 24, count + 3);

    const newTerr = {
      id: "terr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      name: `Novo Território ${count + 1}`,
      type: "Continente / Território",
      houseId: defaultHouseId,
      color,
      x: cx,
      y: cy,
      points,
      description: "Território modelável adicionado pela autora sobre o oceano infinito.",
      notablePassages: []
    };

    this.engine.data.territories.push(newTerr);
    this.selectedTerritoryId = newTerr.id;
    this.setMapTool("select");

    this.engine.recordAuditLog(
      "TERRITÓRIO",
      "Novo Território (Continente)",
      `Território Criado: ${newTerr.name}`,
      `Elemento território (terra) adicionado ao mapa infinito com ${points.length} pontos de modelagem nas bordas.`,
      snapshot
    );

    this.engine.saveToStorage();
    this.syncHeaderAndBadges();
    this.renderMapStudio();
    this.renderTree();
  }

  updateTerritoryCentroid(terr) {
    if (!terr || !Array.isArray(terr.points) || terr.points.length === 0) return;
    let sumX = 0;
    let sumY = 0;
    terr.points.forEach(p => {
      sumX += p.x;
      sumY += p.y;
    });
    terr.x = Math.round(sumX / terr.points.length);
    terr.y = Math.round(sumY / terr.points.length);
  }

  isPointInPolygon(pt, points) {
    if (!Array.isArray(points) || points.length < 3) return false;
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x;
      const yi = points[i].y;
      const xj = points[j].x;
      const yj = points[j].y;
      const intersect =
        yi > pt.y !== yj > pt.y &&
        pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 0.00001) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  findHitVertex(pt) {
    if (!this.isMapEditMode) return null;
    this.engine.ensureTerritoryPolygons(this.engine.data.territories);
    const selected = this.engine.getTerritory(this.selectedTerritoryId);
    const hitThreshold = 12 / this.mapZoom;
    const midThreshold = 10 / this.mapZoom;

    // 1. Pontos principais da borda do território selecionado
    if (selected && Array.isArray(selected.points)) {
      for (let i = 0; i < selected.points.length; i++) {
        const p = selected.points[i];
        if (Math.hypot(pt.x - p.x, pt.y - p.y) <= hitThreshold) {
          return { kind: "vertex", terr: selected, index: i };
        }
      }
      // 2. Pontos intermediários (midpoints) da borda para criar novo vértice
      const len = selected.points.length;
      for (let i = 0; i < len; i++) {
        const p1 = selected.points[i];
        const p2 = selected.points[(i + 1) % len];
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        if (Math.hypot(pt.x - mx, pt.y - my) <= midThreshold) {
          return { kind: "midpoint", terr: selected, index: i, mx, my };
        }
      }
    }

    // 3. Pontos da borda de qualquer outro território
    for (let tIdx = this.engine.data.territories.length - 1; tIdx >= 0; tIdx--) {
      const t = this.engine.data.territories[tIdx];
      if (!t || !Array.isArray(t.points)) continue;
      for (let i = 0; i < t.points.length; i++) {
        const p = t.points[i];
        if (Math.hypot(pt.x - p.x, pt.y - p.y) <= hitThreshold) {
          return { kind: "vertex", terr: t, index: i };
        }
      }
    }

    return null;
  }

  findHitTerritoryBody(pt) {
    this.engine.ensureTerritoryPolygons(this.engine.data.territories);
    for (let i = this.engine.data.territories.length - 1; i >= 0; i--) {
      const t = this.engine.data.territories[i];
      if (!t) continue;
      // Hit-testing preciso no corpo do continente ou no centro onde fica o nome
      let maxDist = 35;
      if (Array.isArray(t.points)) {
        t.points.forEach(p => {
          const d = Math.hypot(p.x - t.x, p.y - t.y);
          if (d > maxDist) maxDist = d;
        });
      }
      const centerHitDist = Math.max(38, maxDist * 0.45);
      if (Math.hypot(pt.x - t.x, pt.y - t.y) <= centerHitDist || this.isPointInPolygon(pt, t.points)) {
        return t;
      }
    }
    return null;
  }

  // Dobra a quantidade de pontos de modelagem inserindo novos vértices nos intervalos
  subdivideSelectedTerritoryPoints() {
    const t = this.engine.getTerritory(this.selectedTerritoryId) || this.engine.data.territories[0];
    if (!t) return;
    this.engine.ensureTerritoryPolygons([t]);
    if (t.points.length >= 128) {
      if (typeof this.showToast === "function") this.showToast("Limite de 128 pontos de modelagem atingido.");
      return;
    }

    const snapshot = this.engine.createSnapshot();
    const newPts = [];
    const len = t.points.length;
    for (let i = 0; i < len; i++) {
      const p1 = t.points[i];
      const p2 = t.points[(i + 1) % len];
      newPts.push({ x: p1.x, y: p1.y });
      newPts.push({
        x: Math.round((p1.x + p2.x) / 2),
        y: Math.round((p1.y + p2.y) / 2)
      });
    }
    t.points = newPts;
    this.updateTerritoryCentroid(t);

    this.engine.recordAuditLog(
      "TERRITÓRIO",
      "Refinamento de Borda",
      `Mais Pontos na Borda: ${t.name}`,
      `O território "${t.name}" passou a ter ${t.points.length} pontos de modelagem em sua borda.`,
      snapshot
    );
    this.engine.saveToStorage();
    this.renderMapStudio();
  }

  // Reduz a quantidade de pontos da borda (remove pontos extras sem perder o formato)
  reduceSelectedTerritoryPoints() {
    const t = this.engine.getTerritory(this.selectedTerritoryId) || this.engine.data.territories[0];
    if (!t) return;
    this.engine.ensureTerritoryPolygons([t]);
    if (t.points.length <= 8) {
      if (typeof this.showToast === "function") this.showToast("Mínimo de 8 pontos mantido para preservar o formato da terra.");
      return;
    }

    const snapshot = this.engine.createSnapshot();
    const oldLen = t.points.length;
    // Decima pontos preservando os índices pares
    t.points = t.points.filter((_, i) => i % 2 === 0);
    this.updateTerritoryCentroid(t);

    this.engine.recordAuditLog(
      "TERRITÓRIO",
      "Redução de Pontos da Borda",
      `Menos Pontos na Borda: ${t.name}`,
      `Os pontos da borda de "${t.name}" foram reduzidos de ${oldLen} para ${t.points.length}.`,
      snapshot
    );
    this.engine.saveToStorage();
    this.renderMapStudio();
  }

  // Redimensiona o continente sem limites artificiais de tamanho
  scaleSelectedTerritory(factor = 1.15) {
    const t = this.engine.getTerritory(this.selectedTerritoryId) || this.engine.data.territories[0];
    if (!t) return;
    this.engine.ensureTerritoryPolygons([t]);

    const snapshot = this.engine.createSnapshot();
    this.updateTerritoryCentroid(t);
    const cx = t.x;
    const cy = t.y;

    t.points = t.points.map(p => ({
      x: Math.round(cx + (p.x - cx) * factor),
      y: Math.round(cy + (p.y - cy) * factor)
    }));
    this.updateTerritoryCentroid(t);

    this.engine.recordAuditLog(
      "TERRITÓRIO",
      "Redimensionamento de Território",
      `Tamanho Ajustado: ${t.name}`,
      `O território "${t.name}" foi redimensionado (${factor > 1 ? "ampliado" : "reduzido"}) pela autora.`,
      snapshot
    );
    this.engine.saveToStorage();
    this.renderMapStudio();
  }

  // Suaviza o contorno costeiro da massa de terra
  smoothSelectedTerritoryPoints() {
    const t = this.engine.getTerritory(this.selectedTerritoryId) || this.engine.data.territories[0];
    if (!t) return;
    this.engine.ensureTerritoryPolygons([t]);

    const snapshot = this.engine.createSnapshot();
    const len = t.points.length;
    const smoothed = [];
    for (let i = 0; i < len; i++) {
      const prev = t.points[(i - 1 + len) % len];
      const curr = t.points[i];
      const next = t.points[(i + 1) % len];
      smoothed.push({
        x: Math.round(prev.x * 0.22 + curr.x * 0.56 + next.x * 0.22),
        y: Math.round(prev.y * 0.22 + curr.y * 0.56 + next.y * 0.22)
      });
    }
    t.points = smoothed;
    this.updateTerritoryCentroid(t);

    this.engine.recordAuditLog(
      "TERRITÓRIO",
      "Suavização Costeira",
      `Costa Suavizada: ${t.name}`,
      `Os pontos de borda do território "${t.name}" foram suavizados.`,
      snapshot
    );
    this.engine.saveToStorage();
    this.renderMapStudio();
  }

  resetTerritoryPolygonShape(terrId) {
    const t = this.engine.getTerritory(terrId);
    if (!t) return;
    const snapshot = this.engine.createSnapshot();
    t.points = this.engine.generateContinentPoints(t.x || 480, t.y || 280, 110, 85, 24, Date.now() % 19);
    this.updateTerritoryCentroid(t);

    this.engine.recordAuditLog(
      "TERRITÓRIO",
      "Redefinição de Formato",
      `Formato Redefinido: ${t.name}`,
      `O contorno do território "${t.name}" foi redefinido com 24 pontos de borda.`,
      snapshot
    );
    this.engine.saveToStorage();
    this.renderMapStudio();
  }

  updateMapPinPosition(terr) {
    if (!terr) return;
    this.drawMapCanvas();
  }

  // Interpola pontos equidistantes ao longo de uma linha traçada
  getEquidistantPointsAlongPath(points, spacing = 20) {
    if (!Array.isArray(points) || points.length === 0) return [];
    if (points.length === 1) return [{ x: points[0].x, y: points[0].y, index: 0 }];

    const result = [{ x: points[0].x, y: points[0].y, index: 0 }];
    let accumulatedDist = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const segDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (segDist === 0) continue;

      let distCovered = 0;
      while (accumulatedDist + (segDist - distCovered) >= spacing) {
        const needed = spacing - accumulatedDist;
        const t = (distCovered + needed) / segDist;
        const ix = Math.round(p1.x + (p2.x - p1.x) * t);
        const iy = Math.round(p1.y + (p2.y - p1.y) * t);
        result.push({ x: ix, y: iy, index: result.length });
        distCovered += needed;
        accumulatedDist = 0;
      }
      accumulatedDist += segDist - distCovered;
    }
    return result;
  }

  // Desenha um ícone clássico de montanha estilo pergaminho medieval
  drawMountainIcon(ctx, x, y, size = 18, seed = 0) {
    const h = size;
    const halfW = size * 0.95;
    const ridgeCurve = seed % 2 === 0 ? 2 : -1.5;

    ctx.save();
    // 1. Sombra da base
    ctx.beginPath();
    ctx.ellipse(x, y + h * 0.45, halfW * 0.9, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(18, 12, 7, 0.35)";
    ctx.fill();

    // 2. Silhueta e encosta esquerda (iluminada)
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.quadraticCurveTo(x + ridgeCurve, y, x, y + h * 0.45);
    ctx.lineTo(x - halfW, y + h * 0.45);
    ctx.closePath();
    ctx.fillStyle = "#4a3b2c";
    ctx.fill();

    // 3. Encosta direita (sombra)
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.quadraticCurveTo(x + ridgeCurve, y, x, y + h * 0.45);
    ctx.lineTo(x + halfW, y + h * 0.45);
    ctx.closePath();
    ctx.fillStyle = "#271b12";
    ctx.fill();

    // 4. Hachuras de relevo na vertente de sombra
    ctx.strokeStyle = "rgba(10, 7, 4, 0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 1, y - h * 0.35);
    ctx.lineTo(x + halfW * 0.55, y + h * 0.15);
    ctx.moveTo(x + 2, y);
    ctx.lineTo(x + halfW * 0.8, y + h * 0.35);
    ctx.stroke();

    // 5. Cume com neve / reflexo de marfim no pico
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x - halfW * 0.26, y - h * 0.5);
    ctx.lineTo(x + ridgeCurve * 0.4, y - h * 0.4);
    ctx.lineTo(x + halfW * 0.26, y - h * 0.5);
    ctx.closePath();
    ctx.fillStyle = "rgba(245, 238, 220, 0.85)";
    ctx.fill();

    // 6. Contorno exterior e cume central a nanquim
    ctx.strokeStyle = "#140c06";
    ctx.lineWidth = 1.35;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x - halfW, y + h * 0.45);
    ctx.lineTo(x, y - h);
    ctx.lineTo(x + halfW, y + h * 0.45);
    // Linha do cume
    ctx.moveTo(x, y - h);
    ctx.quadraticCurveTo(x + ridgeCurve, y, x, y + h * 0.45);
    ctx.stroke();

    ctx.restore();
  }

  // Desenha um autêntico pinheiro conífero estilo cartografia de fantasia medieval
  drawPineTreeIcon(ctx, x, y, size = 16, seed = 0) {
    const h = size * 1.35;
    const halfW = size * 0.72;
    const trunkW = Math.max(1.6, size * 0.16);
    const trunkH = size * 0.38;

    ctx.save();

    // 1. Sombra suave na base do pinheiro
    ctx.beginPath();
    ctx.ellipse(x, y + trunkH * 0.9, halfW * 0.85, trunkH * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(10, 16, 11, 0.42)";
    ctx.fill();

    // 2. Tronco de madeira resistente
    ctx.beginPath();
    ctx.rect(x - trunkW / 2, y, trunkW, trunkH);
    ctx.fillStyle = "#382314";
    ctx.fill();
    ctx.strokeStyle = "#1b1008";
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // 3. Três camadas coníferas de folhagem triangular serrilhada
    // Camada Inferior (mais larga)
    const yB = y + 2;
    const wB = halfW;
    ctx.beginPath();
    ctx.moveTo(x, yB - h * 0.52);
    ctx.lineTo(x + wB, yB);
    ctx.lineTo(x + wB * 0.65, yB - 1);
    ctx.lineTo(x + wB * 0.35, yB + 0.5);
    ctx.lineTo(x, yB - 0.8);
    ctx.lineTo(x - wB * 0.35, yB + 0.5);
    ctx.lineTo(x - wB * 0.65, yB - 1);
    ctx.lineTo(x - wB, yB);
    ctx.closePath();
    ctx.fillStyle = "#1b381d";
    ctx.fill();
    ctx.strokeStyle = "#0d1f10";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Camada Intermediária
    const yM = y - h * 0.28;
    const wM = halfW * 0.78;
    ctx.beginPath();
    ctx.moveTo(x, yM - h * 0.48);
    ctx.lineTo(x + wM, yM);
    ctx.lineTo(x + wM * 0.55, yM - 1);
    ctx.lineTo(x, yM - 0.5);
    ctx.lineTo(x - wM * 0.55, yM - 1);
    ctx.lineTo(x - wM, yM);
    ctx.closePath();
    ctx.fillStyle = "#224725";
    ctx.fill();
    ctx.strokeStyle = "#0d1f10";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Camada Superior / Ápice do Pinheiro
    const yT = y - h * 0.58;
    const wT = halfW * 0.54;
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x + wT, yT);
    ctx.lineTo(x, yT - 0.5);
    ctx.lineTo(x - wT, yT);
    ctx.closePath();
    ctx.fillStyle = "#2d5e32";
    ctx.fill();
    ctx.strokeStyle = "#0d1f10";
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // 4. Iluminação nas acículas da esquerda e sombra na vertente direita
    ctx.save();
    // Destaque de luz nas agulhas do lado iluminado
    ctx.strokeStyle = "rgba(165, 220, 150, 0.38)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 1, y - h * 0.9);
    ctx.lineTo(x - wT * 0.5, yT);
    ctx.moveTo(x - 2, yM - h * 0.3);
    ctx.lineTo(x - wM * 0.6, yM);
    ctx.moveTo(x - 2, yB - h * 0.35);
    ctx.lineTo(x - wB * 0.7, yB);
    ctx.stroke();

    // Hachura de sombra no lado direito
    ctx.strokeStyle = "rgba(8, 18, 10, 0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 1, y - h * 0.7);
    ctx.lineTo(x + wT * 0.6, yT);
    ctx.moveTo(x + 1, yM - h * 0.2);
    ctx.lineTo(x + wM * 0.6, yM);
    ctx.moveTo(x + 1, yB - h * 0.25);
    ctx.lineTo(x + wB * 0.7, yB);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  initMapCanvasEvents() {
    const canvas = document.getElementById("fantasyMapCanvas");
    if (!canvas) return;

    // Zoom infinito através da roda do mouse (centrado na posição do cursor)
    canvas.addEventListener(
      "wheel",
      e => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const screenX = (e.clientX - rect.left) * scaleX;
        const screenY = (e.clientY - rect.top) * scaleY;
        const factor = e.deltaY < 0 ? 1.14 : 0.88;
        this.zoomMapAt(screenX, screenY, factor);
      },
      { passive: false }
    );

    // Menu de contexto no canvas (botão direito): remove vértice clicado se houver mais de 6
    canvas.addEventListener("contextmenu", e => {
      if (!this.isMapEditMode) return;
      const pt = this.getMapWorldCoords(e);
      const hit = this.findHitVertex(pt);
      if (hit && hit.kind === "vertex" && hit.terr && hit.terr.points.length > 6) {
        e.preventDefault();
        const snapshot = this.engine.createSnapshot();
        hit.terr.points.splice(hit.index, 1);
        this.updateTerritoryCentroid(hit.terr);
        this.engine.recordAuditLog(
          "TERRITÓRIO",
          "Modelagem de Território",
          `Ponto Removido da Borda: ${hit.terr.name}`,
          `Um ponto de controle foi removido da borda de "${hit.terr.name}" (${hit.terr.points.length} pontos restantes).`,
          snapshot
        );
        this.hoveredMapHandle = null;
        this.renderMapStudio();
      }
    });

    canvas.addEventListener("dblclick", e => {
      const pt = this.getMapWorldCoords(e);
      const hitSettle = this.findHitSettlement(pt);
      if (hitSettle) {
        if (this.isMapEditMode) {
          this.openEditSettlementModal(hitSettle.id);
        } else {
          this.focusSettlementOnMap(hitSettle.id);
        }
        return;
      }
      if (!this.isMapEditMode || this.mapTool !== "select") return;
      const hitVertex = this.findHitVertex(pt);
      if (hitVertex) return;
      const hitTerr = this.findHitTerritoryBody(pt);
      if (hitTerr) {
        this.selectedTerritoryId = hitTerr.id;
        this.openTerritoryModal(hitTerr.id);
      }
    });

    canvas.addEventListener("mousedown", e => {
      if (e.button === 2) return; // Ignora clique direito para o contextmenu
      const pt = this.getMapWorldCoords(e);

      // Clique com botão do meio (roda) inicia navegação panorâmica imediatamente
      if (e.button === 1) {
        e.preventDefault();
        this.isPanningMap = true;
        this.panStartX = e.clientX;
        this.panStartY = e.clientY;
        this.initialPanX = this.mapPanX;
        this.initialPanY = this.mapPanY;
        canvas.style.cursor = "grabbing";
        return;
      }

      // Adicionar Capital Real ou Cidade/Vila no mapa no ponto clicado
      if (this.mapTool === "add_capital" || this.mapTool === "add_city") {
        const defaultType = this.mapTool === "add_capital" ? "capital" : "city";
        this.openSettlementModal(pt.x, pt.y, defaultType);
        return;
      }

      // Em modo de exibição pura, clicar em um assentamento ou território o seleciona; clicar no oceano arrasta o mapa
      if (!this.isMapEditMode) {
        const hitSettle = this.findHitSettlement(pt);
        if (hitSettle) {
          this.selectedSettlementId = hitSettle.id;
          if (hitSettle.territoryId) {
            this.selectedTerritoryId = hitSettle.territoryId;
          }
          this.renderMapStudio();
          return;
        }
        const hitTerr = this.findHitTerritoryBody(pt);
        if (hitTerr) {
          this.selectedTerritoryId = hitTerr.id;
          this.renderMapStudio();
        } else {
          this.isPanningMap = true;
          this.panStartX = e.clientX;
          this.panStartY = e.clientY;
          this.initialPanX = this.mapPanX;
          this.initialPanY = this.mapPanY;
          canvas.style.cursor = "grabbing";
        }
        return;
      }

      // Modo de edição: traçado livre de montanhas, pinheiros, estradas ou rios
      if (this.mapTool && this.mapTool.startsWith("draw_")) {
        this.mapDragSnapshot = this.engine.createSnapshot();
        this.isDrawingMap = true;
        this.engine.data.mapStrokes = this.engine.data.mapStrokes || [];
        this.engine.data.mapStrokes.push({
          type: this.mapTool,
          points: [{ x: pt.x, y: pt.y }]
        });
        this.drawMapCanvas();
        return;
      }

      // Modo de modelagem e seleção de territórios & assentamentos
      const hitSettle = this.findHitSettlement(pt);
      if (hitSettle) {
        this.selectedSettlementId = hitSettle.id;
        if (hitSettle.territoryId) {
          this.selectedTerritoryId = hitSettle.territoryId;
        }
        this.mapDragSnapshot = this.engine.createSnapshot();
        this.mapDragModified = false;
        this.draggingSettlement = { id: hitSettle.id, lastX: pt.x, lastY: pt.y };
        this.renderMapStudio();
        return;
      }
      const hit = this.findHitVertex(pt);
      if (hit && hit.kind === "vertex") {
        this.selectedTerritoryId = hit.terr.id;
        this.mapDragSnapshot = this.engine.createSnapshot();
        this.mapDragModified = false;
        this.draggingVertex = { terrId: hit.terr.id, index: hit.index };
        this.renderMapStudio();
        return;
      }

      if (hit && hit.kind === "midpoint") {
        this.selectedTerritoryId = hit.terr.id;
        this.mapDragSnapshot = this.engine.createSnapshot();
        hit.terr.points.splice(hit.index + 1, 0, { x: pt.x, y: pt.y });
        this.mapDragModified = true;
        this.draggingVertex = { terrId: hit.terr.id, index: hit.index + 1 };
        this.renderMapStudio();
        return;
      }

      const hitTerr = this.findHitTerritoryBody(pt);
      if (hitTerr) {
        this.selectedTerritoryId = hitTerr.id;
        this.mapDragSnapshot = this.engine.createSnapshot();
        this.mapDragModified = false;
        this.draggingTerritory = {
          terrId: hitTerr.id,
          lastX: pt.x,
          lastY: pt.y
        };
        this.renderMapStudio();
        return;
      }

      // Se clicou na água/oceano no modo select, arrasta a visão do mapa infinito
      this.isPanningMap = true;
      this.panStartX = e.clientX;
      this.panStartY = e.clientY;
      this.initialPanX = this.mapPanX;
      this.initialPanY = this.mapPanY;
      canvas.style.cursor = "grabbing";
    });

    canvas.addEventListener("mousemove", e => {
      const pt = this.getMapWorldCoords(e);

      // 1. Arrastando a visão do mapa infinito (Pan)
      if (this.isPanningMap) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const dx = (e.clientX - this.panStartX) * scaleX;
        const dy = (e.clientY - this.panStartY) * scaleY;
        this.mapPanX = Math.round(this.initialPanX + dx);
        this.mapPanY = Math.round(this.initialPanY + dy);
        canvas.style.cursor = "grabbing";
        this.drawMapCanvas();
        this.renderMapStudio();
        return;
      }

      // 1.5. Arrastando assentamento (Capital ou Cidade) pelo mapa
      if (this.draggingSettlement) {
        const settle = (this.engine.data.settlements || []).find(s => s.id === this.draggingSettlement.id);
        if (settle) {
          settle.x = Math.round(pt.x);
          settle.y = Math.round(pt.y);
          this.mapDragModified = true;
          canvas.style.cursor = "grabbing";
          this.drawMapCanvas();
        }
        return;
      }

      // Em modo de exibição, altera o cursor se passar sobre uma cidade/território ou oceano
      if (!this.isMapEditMode) {
        const hitSettle = this.findHitSettlement(pt);
        const hitTerr = this.findHitTerritoryBody(pt);
        canvas.style.cursor = hitSettle || hitTerr ? "pointer" : "grab";
        return;
      }

      // 2. Arrastando um ponto da borda para modelar o território livremente
      if (this.draggingVertex) {
        const terr = this.engine.getTerritory(this.draggingVertex.terrId);
        if (terr && Array.isArray(terr.points) && terr.points[this.draggingVertex.index]) {
          terr.points[this.draggingVertex.index].x = pt.x;
          terr.points[this.draggingVertex.index].y = pt.y;
          this.updateTerritoryCentroid(terr);
          this.mapDragModified = true;
          canvas.style.cursor = "grabbing";
          this.drawMapCanvas();
          this.updateMapPinPosition(terr);
        }
        return;
      }

      // 3. Arrastando o território inteiro pelo oceano infinito
      if (this.draggingTerritory) {
        const terr = this.engine.getTerritory(this.draggingTerritory.terrId);
        if (terr && Array.isArray(terr.points)) {
          const dx = pt.x - this.draggingTerritory.lastX;
          const dy = pt.y - this.draggingTerritory.lastY;
          if (dx !== 0 || dy !== 0) {
            terr.points.forEach(p => {
              p.x += dx;
              p.y += dy;
            });
            this.updateTerritoryCentroid(terr);
            this.draggingTerritory.lastX = pt.x;
            this.draggingTerritory.lastY = pt.y;
            this.mapDragModified = true;
            canvas.style.cursor = "grabbing";
            this.drawMapCanvas();
            this.updateMapPinPosition(terr);
          }
        }
        return;
      }

      // 4. Desenhando traço livre (rio, estrada, montanhas, pinheiros) com mini-correção anti-tremor
      if (this.isDrawingMap) {
        const strokes = this.engine.data.mapStrokes;
        if (strokes && strokes.length > 0) {
          const curStroke = strokes[strokes.length - 1];
          const pts = curStroke.points;
          const lastPt = pts[pts.length - 1];
          const dist = Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y);

          // Filtro anti-tremor: só registra novo ponto se houver deslocamento mínimo (evita micro-vibrações)
          if (dist >= 3.8 / this.mapZoom) {
            // Mini-amortecimento suave entre o ponto anterior e a nova coordenada
            const smoothX = Math.round(lastPt.x + (pt.x - lastPt.x) * 0.84);
            const smoothY = Math.round(lastPt.y + (pt.y - lastPt.y) * 0.84);
            pts.push({ x: smoothX, y: smoothY });
            this.drawMapCanvas();
          }
        }
        return;
      }

      // 5. Feedback visual de cursor ao passar o mouse sobre os pontos da borda ou território
      if (this.mapTool && this.mapTool.startsWith("draw_")) {
        canvas.style.cursor = "crosshair";
        return;
      }

      if (this.mapTool === "add_capital" || this.mapTool === "add_city") {
        canvas.style.cursor = "cell";
        return;
      }

      const hitSettle = this.findHitSettlement(pt);
      const hit = this.findHitVertex(pt);
      const prevHover = this.hoveredMapHandle;
      this.hoveredMapHandle = hit;
      if (
        (prevHover && !hit) ||
        (!prevHover && hit) ||
        (prevHover &&
          hit &&
          (prevHover.index !== hit.index ||
            prevHover.kind !== hit.kind ||
            prevHover.terr.id !== hit.terr.id))
      ) {
        this.drawMapCanvas();
      }

      if (hitSettle) {
        canvas.style.cursor = "pointer";
      } else if (hit) {
        canvas.style.cursor = hit.kind === "midpoint" ? "copy" : "grab";
      } else if (this.findHitTerritoryBody(pt)) {
        canvas.style.cursor = "move";
      } else {
        canvas.style.cursor = "grab";
      }
    });

    window.addEventListener("mouseup", () => {
      if (this.isPanningMap) {
        this.isPanningMap = false;
        canvas.style.cursor = this.isMapEditMode ? "grab" : "default";
      }

      if (this.draggingSettlement) {
        const settle = (this.engine.data.settlements || []).find(s => s.id === this.draggingSettlement.id);
        this.draggingSettlement = null;
        if (this.mapDragModified && settle) {
          this.engine.recordAuditLog(
            "TERRITÓRIO",
            "Movimentação de Assentamento",
            `Assentamento Movido: ${settle.name}`,
            `O assentamento "${settle.name}" (${settle.type === "capital" ? "Capital Real" : "Cidade / Vila"}) foi reposicionado para (${settle.x}, ${settle.y}) no mapa.`,
            this.mapDragSnapshot
          );
          this.engine.saveToStorage();
          this.renderMapStudio();
        }
        this.mapDragSnapshot = null;
        this.mapDragModified = false;
      }

      if (this.draggingVertex) {
        const terr = this.engine.getTerritory(this.draggingVertex.terrId);
        this.draggingVertex = null;
        if (this.mapDragModified && terr) {
          this.engine.recordAuditLog(
            "TERRITÓRIO",
            "Modelagem de Território",
            `Território Modelado: ${terr.name}`,
            `O formato e tamanho do território "${terr.name}" foram modelados pelos pontos da borda.`,
            this.mapDragSnapshot
          );
          this.engine.saveToStorage();
          this.renderMapStudio();
        }
        this.mapDragSnapshot = null;
        this.mapDragModified = false;
      }

      if (this.draggingTerritory) {
        const terr = this.engine.getTerritory(this.draggingTerritory.terrId);
        this.draggingTerritory = null;
        if (this.mapDragModified && terr) {
          this.engine.recordAuditLog(
            "TERRITÓRIO",
            "Movimentação de Território",
            `Território Movido: ${terr.name}`,
            `O território "${terr.name}" foi reposicionado para (${terr.x}, ${terr.y}) no mapa.`,
            this.mapDragSnapshot
          );
          this.engine.saveToStorage();
          this.renderMapStudio();
        }
        this.mapDragSnapshot = null;
        this.mapDragModified = false;
      }

      if (this.isDrawingMap) {
        this.isDrawingMap = false;
        const currentStroke =
          this.engine.data.mapStrokes &&
          this.engine.data.mapStrokes[this.engine.data.mapStrokes.length - 1];

        if (currentStroke && Array.isArray(currentStroke.points) && currentStroke.points.length > 2) {
          // Mini-correção automática anti-tremor: remove serrilhado e suaviza a linha
          currentStroke.points = this.smoothStrokePoints(currentStroke.points, 2);
        }

        const strokeNames = {
          draw_mountain: "Cordilheira de Montanhas",
          draw_tree: "Bosque de Pinheiros / Floresta",
          draw_road: "Estrada / Via",
          draw_river: "Curso d'Água / Rio"
        };
        const sName = (currentStroke && strokeNames[currentStroke.type]) || "Elemento Geográfico";
        this.engine.recordAuditLog(
          "TERRITÓRIO",
          "Traço Cartográfico",
          `${sName} Adicionado(a)`,
          `Um novo elemento cartográfico (${sName}) foi desenhado sobre o mapa com mini-correções anti-tremor.`,
          this.mapDragSnapshot
        );
        this.mapDragSnapshot = null;
        this.engine.saveToStorage();
        this.drawMapCanvas();
      }
    });
  }

  undoLastMapStroke() {
    if (this.engine.data.mapStrokes && this.engine.data.mapStrokes.length > 0) {
      const snapshot = this.engine.createSnapshot();
      this.engine.data.mapStrokes.pop();
      this.engine.recordAuditLog(
        "TERRITÓRIO",
        "Traço Desfeito",
        "Último Traço Cartográfico Removido",
        "O último traço desenhado no mapa foi desfeito.",
        snapshot
      );
      this.drawMapCanvas();
    }
  }

  clearMapStrokes() {
    if (!this.engine.data.mapStrokes || this.engine.data.mapStrokes.length === 0) return;
    const snapshot = this.engine.createSnapshot();
    this.engine.data.mapStrokes = [];
    this.engine.recordAuditLog(
      "TERRITÓRIO",
      "Limpeza de Traços",
      "Traços Livres do Mapa Limpos",
      "Todos os traços livres (montanhas, pinheiros, rios e estradas) foram removidos.",
      snapshot
    );
    this.drawMapCanvas();
  }

  // Aplica mini correções e suavização ponderada anti-tremor a uma linha de pontos
  smoothStrokePoints(points, iterations = 2) {
    if (!Array.isArray(points) || points.length <= 2) return points;

    // 1. Filtro de redundância: elimina pontos excessivamente colados (< 3.5px)
    const cleaned = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      const prev = cleaned[cleaned.length - 1];
      const d = Math.hypot(p.x - prev.x, p.y - prev.y);
      if (d >= 3.5 || i === points.length - 1) {
        cleaned.push(p);
      }
    }

    if (cleaned.length <= 2) return cleaned;

    // 2. Filtro gaussiano ponderado (Moving Average 0.22 - 0.56 - 0.22)
    // Preserva rigorosamente os pontos de início e fim da linha onde a autora clicou
    let current = cleaned;
    for (let iter = 0; iter < iterations; iter++) {
      const nextPts = [current[0]];
      for (let i = 1; i < current.length - 1; i++) {
        const prev = current[i - 1];
        const curr = current[i];
        const next = current[i + 1];
        nextPts.push({
          x: Math.round(prev.x * 0.22 + curr.x * 0.56 + next.x * 0.22),
          y: Math.round(prev.y * 0.22 + curr.y * 0.56 + next.y * 0.22)
        });
      }
      nextPts.push(current[current.length - 1]);
      current = nextPts;
    }

    return current;
  }

  // Suaviza o último traço desenhado (botão da barra de ferramentas)
  smoothLastMapStroke() {
    if (!this.engine.data.mapStrokes || this.engine.data.mapStrokes.length === 0) return;
    const lastStroke = this.engine.data.mapStrokes[this.engine.data.mapStrokes.length - 1];
    if (lastStroke && Array.isArray(lastStroke.points) && lastStroke.points.length > 2) {
      const snapshot = this.engine.createSnapshot();
      lastStroke.points = this.smoothStrokePoints(lastStroke.points, 2);
      this.engine.recordAuditLog(
        "TERRITÓRIO",
        "Suavização de Traço",
        "Traço Cartográfico Suavizado",
        "Mini correções anti-tremor aplicadas ao último traço desenhado.",
        snapshot
      );
      this.engine.saveToStorage();
      this.drawMapCanvas();
    }
  }

  // Traça um caminho de curvas suaves através de pontos médios quadráticos
  // Elimina arestas duras e tremores de mão na renderização de linhas
  traceSmoothStrokePath(ctx, points) {
    if (!Array.isArray(points) || points.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    if (points.length === 1) {
      ctx.arc(points[0].x, points[0].y, 1, 0, Math.PI * 2);
      return;
    }

    if (points.length === 2) {
      ctx.lineTo(points[1].x, points[1].y);
      return;
    }

    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }

    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y);
  }

  // Traça o caminho fechado suave passando exatamente por todos os pontos da borda do território
  traceTerritoryPolygonPath(ctx, points) {
    if (!Array.isArray(points) || points.length < 3) return;
    const len = points.length;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 0; i < len; i++) {
      const p0 = points[(i - 1 + len) % len];
      const p1 = points[i];
      const p2 = points[(i + 1) % len];
      const p3 = points[(i + 2) % len];

      // Curva Catmull-Rom cúbica suave que passa exatamente por cada vértice da borda
      const tension = 0.22;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    ctx.closePath();
  }

  // Desenha um ícone de mini ondas (duas cristas náuticas) na posição (wx, wy) da água
  drawMiniWaveIcon(ctx, wx, wy) {
    // Crista principal de mini ondas (~ ~)
    ctx.strokeStyle = "rgba(115, 185, 238, 0.42)";
    ctx.lineWidth = 1.45;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(wx - 8.5, wy + 1);
    ctx.quadraticCurveTo(wx - 4.2, wy - 3.6, wx, wy + 1);
    ctx.quadraticCurveTo(wx + 4.2, wy - 3.6, wx + 8.5, wy + 1);
    ctx.stroke();

    // Segunda mini onda sutil logo abaixo
    ctx.strokeStyle = "rgba(165, 216, 250, 0.24)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(wx - 5, wy + 4.6);
    ctx.quadraticCurveTo(wx - 2.5, wy + 1.8, wx, wy + 4.6);
    ctx.quadraticCurveTo(wx + 2.5, wy + 1.8, wx + 5, wy + 4.6);
    ctx.stroke();
  }

  // Identifica se um ponto no mundo do mapa colidiu com um assentamento (Capital ou Cidade)
  findHitSettlement(pt) {
    const settlements = this.engine.data.settlements || [];
    const hitRadius = 22;
    for (let i = settlements.length - 1; i >= 0; i--) {
      const s = settlements[i];
      const d = Math.hypot(pt.x - s.x, pt.y - s.y);
      if (d <= hitRadius) {
        return s;
      }
    }
    return null;
  }

  // Desenha uma Capital Real com o ícone autêntico de castelo medieval ("castelinho")
  drawCastleIcon(ctx, x, y, size = 22, isSelected = false, name = "") {
    ctx.save();
    ctx.translate(x, y);

    if (isSelected) {
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 14;
    }

    const s = size / 22;

    // Sombra de chão do castelo
    ctx.beginPath();
    ctx.ellipse(0, 10 * s, 16 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fill();

    // Paredes base em pedra antiga
    ctx.fillStyle = "#2d2319";
    ctx.strokeStyle = isSelected ? "#f59e0b" : "#c5a059";
    ctx.lineWidth = 1.2;

    // Muralha central
    ctx.beginPath();
    ctx.rect(-10 * s, -4 * s, 20 * s, 14 * s);
    ctx.fill();
    ctx.stroke();

    // Torre esquerda
    ctx.beginPath();
    ctx.rect(-14 * s, -8 * s, 6.5 * s, 18 * s);
    ctx.fill();
    ctx.stroke();

    // Torre direita
    ctx.beginPath();
    ctx.rect(7.5 * s, -8 * s, 6.5 * s, 18 * s);
    ctx.fill();
    ctx.stroke();

    // Torre central / Torre de Menagem (mais alta)
    ctx.beginPath();
    ctx.rect(-5 * s, -14 * s, 10 * s, 12 * s);
    ctx.fill();
    ctx.stroke();

    // Ameias / Merlões das torres
    ctx.fillStyle = isSelected ? "#f59e0b" : "#dfba73";
    // Ameias torre central
    ctx.fillRect(-5 * s, -16.5 * s, 3 * s, 2.8 * s);
    ctx.fillRect(2 * s, -16.5 * s, 3 * s, 2.8 * s);
    // Ameias torre esquerda
    ctx.fillRect(-14 * s, -10.5 * s, 2.8 * s, 2.5 * s);
    ctx.fillRect(-10.2 * s, -10.5 * s, 2.8 * s, 2.5 * s);
    // Ameias torre direita
    ctx.fillRect(7.5 * s, -10.5 * s, 2.8 * s, 2.5 * s);
    ctx.fillRect(11.2 * s, -10.5 * s, 2.8 * s, 2.5 * s);

    // Portão com arco gótico
    ctx.fillStyle = "#120e0a";
    ctx.beginPath();
    ctx.arc(0, 5 * s, 3.5 * s, Math.PI, 0, false);
    ctx.lineTo(3.5 * s, 10 * s);
    ctx.lineTo(-3.5 * s, 10 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#c5a059";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Grades do portão
    ctx.beginPath();
    ctx.moveTo(0, 2 * s);
    ctx.lineTo(0, 10 * s);
    ctx.moveTo(-2.5 * s, 6 * s);
    ctx.lineTo(2.5 * s, 6 * s);
    ctx.stroke();

    // Mastro e Flâmula Real Carmesim
    ctx.beginPath();
    ctx.moveTo(0, -16.5 * s);
    ctx.lineTo(0, -24 * s);
    ctx.strokeStyle = "#dfba73";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -24 * s);
    ctx.lineTo(8 * s, -21 * s);
    ctx.lineTo(0, -18 * s);
    ctx.closePath();
    ctx.fillStyle = "#dc2626";
    ctx.fill();

    // Nome da Capital (placa heráldica de cartografia antiga)
    if (name) {
      ctx.font = "700 10px Cinzel, Georgia, serif";
      const metrics = ctx.measureText(name);
      const tw = metrics.width;
      const bw = tw + 10;
      const bh = 15;
      const by = 13 * s;

      ctx.fillStyle = "rgba(16, 12, 8, 0.88)";
      ctx.fillRect(-bw / 2, by, bw, bh);

      ctx.strokeStyle = isSelected ? "#f59e0b" : "#c5a059";
      ctx.lineWidth = 1;
      ctx.strokeRect(-bw / 2, by, bw, bh);

      ctx.fillStyle = "#fff8e7";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(name, 0, by + bh / 2 + 0.5);
    }

    ctx.restore();
  }

  // Desenha uma Cidade com o ícone autêntico de aldeia medieval ("vila")
  drawVillageIcon(ctx, x, y, size = 18, isSelected = false, name = "") {
    ctx.save();
    ctx.translate(x, y);

    if (isSelected) {
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 12;
    }

    const s = size / 18;

    // Sombra de chão da vila
    ctx.beginPath();
    ctx.ellipse(0, 8 * s, 15 * s, 4.5 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fill();

    // 1. Casa da Direita (principal)
    ctx.fillStyle = "#3a2d20";
    ctx.strokeStyle = isSelected ? "#38bdf8" : "#a88448";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.rect(0 * s, 0 * s, 11 * s, 8 * s);
    ctx.fill();
    ctx.stroke();

    // Telhado de terracota
    ctx.fillStyle = "#9a3412";
    ctx.beginPath();
    ctx.moveTo(-1 * s, 0 * s);
    ctx.lineTo(5.5 * s, -7 * s);
    ctx.lineTo(12 * s, 0 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Porta da casa da direita
    ctx.fillStyle = "#18120b";
    ctx.fillRect(4 * s, 3 * s, 3 * s, 5 * s);

    // 2. Casa da Esquerda (menor / adjacente)
    ctx.fillStyle = "#2c2217";
    ctx.beginPath();
    ctx.rect(-10 * s, 1 * s, 9 * s, 7 * s);
    ctx.fill();
    ctx.stroke();

    // Telhado de palha/madeira
    ctx.fillStyle = "#b45309";
    ctx.beginPath();
    ctx.moveTo(-11 * s, 1 * s);
    ctx.lineTo(-5.5 * s, -5 * s);
    ctx.lineTo(0 * s, 1 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Janela iluminada
    ctx.fillStyle = "#fef08a";
    ctx.fillRect(-7.5 * s, 3.5 * s, 2.5 * s, 2.5 * s);

    // Pequena chaminé com fumaça
    ctx.fillStyle = "#221910";
    ctx.fillRect(8 * s, -6 * s, 2 * s, 4 * s);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(9 * s, -6 * s);
    ctx.quadraticCurveTo(11 * s, -9 * s, 10 * s, -12 * s);
    ctx.stroke();

    // 3. Nome da Cidade / Vila
    if (name) {
      ctx.font = "600 9.5px Cinzel, Georgia, serif";
      const metrics = ctx.measureText(name);
      const tw = metrics.width;
      const bw = tw + 8;
      const bh = 14;
      const by = 11 * s;

      ctx.fillStyle = "rgba(16, 12, 8, 0.85)";
      ctx.fillRect(-bw / 2, by, bw, bh);

      ctx.strokeStyle = isSelected ? "#38bdf8" : "rgba(197, 160, 89, 0.6)";
      ctx.lineWidth = 0.9;
      ctx.strokeRect(-bw / 2, by, bw, bh);

      ctx.fillStyle = "#e8dcbc";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(name, 0, by + bh / 2 + 0.5);
    }

    ctx.restore();
  }

  drawMapCanvas() {
    const canvas = document.getElementById("fantasyMapCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    this.engine.ensureTerritoryPolygons(this.engine.data.territories);

    // ------------------------------------------------------------------------
    // 1. CAMADA BASE DE ÁGUA (OCEANO INFINITO COM MINI ONDAS DINÂMICAS)
    // Onde não houver elemento território (terra), é automaticamente Água!
    // ------------------------------------------------------------------------
    const waterGrad = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      50,
      canvas.width / 2,
      canvas.height / 2,
      Math.max(canvas.width, canvas.height)
    );
    waterGrad.addColorStop(0, "#152c42");
    waterGrad.addColorStop(0.65, "#0e1f30");
    waterGrad.addColorStop(1, "#07121d");
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Aplicação da matriz de transformação de Zoom e Pan do mundo infinito
    ctx.translate(this.mapPanX, this.mapPanY);
    ctx.scale(this.mapZoom, this.mapZoom);

    // Bounding box das coordenadas visíveis do mundo infinito
    const minWX = Math.floor(-this.mapPanX / this.mapZoom) - 100;
    const maxWX = Math.ceil((canvas.width - this.mapPanX) / this.mapZoom) + 100;
    const minWY = Math.floor(-this.mapPanY / this.mapZoom) - 100;
    const maxWY = Math.ceil((canvas.height - this.mapPanY) / this.mapZoom) + 100;

    // Linhas de rumo náuticas e meridianos sobre as águas infinitas
    const gridStep = 80;
    const gStartX = Math.floor(minWX / gridStep) * gridStep;
    const gStartY = Math.floor(minWY / gridStep) * gridStep;
    ctx.strokeStyle = "rgba(120, 180, 230, 0.05)";
    ctx.lineWidth = 1 / this.mapZoom;
    for (let gx = gStartX; gx <= maxWX; gx += gridStep) {
      ctx.beginPath();
      ctx.moveTo(gx, minWY);
      ctx.lineTo(gx, maxWY);
      ctx.stroke();
    }
    for (let gy = gStartY; gy <= maxWY; gy += gridStep) {
      ctx.beginPath();
      ctx.moveTo(minWX, gy);
      ctx.lineTo(maxWX, gy);
      ctx.stroke();
    }

    // Preenchimento de todo o Oceano visível com Ícones de Mini Ondas
    const stepX = 46;
    const stepY = 28;
    const startX = Math.floor(minWX / stepX) * stepX;
    const startY = Math.floor(minWY / stepY) * stepY;
    for (let wy = startY; wy <= maxWY; wy += stepY) {
      const row = Math.round(wy / stepY);
      const offsetX = row % 2 === 0 ? 0 : stepX / 2;
      for (let wx = startX + offsetX; wx <= maxWX; wx += stepX) {
        this.drawMiniWaveIcon(ctx, wx, wy);
      }
    }

    // ------------------------------------------------------------------------
    // 2. CAMADA DE ELEMENTOS TERRITÓRIO (TERRA / CONTINENTES MODELÁVEIS)
    // Cobre a água onde o território está posicionado e modelado
    // ------------------------------------------------------------------------
    const territories = this.engine.data.territories || [];
    if (!this.selectedTerritoryId && territories.length > 0) {
      this.selectedTerritoryId = territories[0].id;
    }

    territories.forEach(t => {
      if (!Array.isArray(t.points) || t.points.length < 3) return;
      const isSelected = t.id === this.selectedTerritoryId;

      ctx.save();
      this.traceTerritoryPolygonPath(ctx, t.points);

      // Espuma e rebentação costeira ao redor do continente
      ctx.strokeStyle = "rgba(110, 192, 242, 0.18)";
      ctx.lineWidth = 12 / this.mapZoom;
      ctx.stroke();

      ctx.strokeStyle = "rgba(170, 224, 252, 0.30)";
      ctx.lineWidth = 5 / this.mapZoom;
      ctx.stroke();

      // Preenchimento opaco de Terra (esconde as mini ondas de água abaixo)
      const landGrad = ctx.createRadialGradient(t.x, t.y, 10, t.x, t.y, 380);
      landGrad.addColorStop(0, "#3b2e20");
      landGrad.addColorStop(0.7, "#2e2318");
      landGrad.addColorStop(1, "#241b12");
      ctx.fillStyle = landGrad;
      ctx.fill();

      // Matiz sutil da cor heráldica do território sobre a terra
      ctx.save();
      ctx.clip();
      ctx.fillStyle = t.color || "#c5a059";
      ctx.globalAlpha = isSelected ? 0.16 : 0.10;
      ctx.fillRect(minWX, minWY, maxWX - minWX, maxWY - minWY);

      // Textura cartográfica de solo
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = "#dfba73";
      ctx.lineWidth = 1 / this.mapZoom;
      const hatchStart = Math.floor(minWY / 16) * 16;
      for (let ty = hatchStart; ty <= maxWY; ty += 16) {
        ctx.beginPath();
        ctx.moveTo(minWX, ty);
        ctx.lineTo(maxWX, ty);
        ctx.stroke();
      }
      ctx.restore();

      // Contorno costeiro a nanquim
      this.traceTerritoryPolygonPath(ctx, t.points);
      ctx.strokeStyle = isSelected && this.isMapEditMode ? t.color || "#dfba73" : "#9c7c44";
      ctx.lineWidth = (isSelected && this.isMapEditMode ? 2.8 : 2.0) / this.mapZoom;
      ctx.stroke();
      ctx.restore();
    });

    // ------------------------------------------------------------------------
    // 3. TRAÇOS DO CARTÓGRAFO (MONTANHAS, PINHEIROS, ESTRADAS E RIOS)
    // ------------------------------------------------------------------------
    (this.engine.data.mapStrokes || []).forEach((s, sIdx) => {
      if (!s.points || s.points.length === 0) return;

      // Traçado de Montanhas: adiciona ícones de montanha ao longo da linha traçada
      if (s.type === "draw_mountain") {
        const pts = this.getEquidistantPointsAlongPath(s.points, 22);
        const sorted = pts.slice().sort((a, b) => a.y - b.y);
        sorted.forEach((p, pIdx) => {
          this.drawMountainIcon(ctx, p.x, p.y, 18, (sIdx + 1) * 7 + pIdx);
        });
        return;
      }

      // Traçado de Pinheiros: adiciona ícones de pinheiros autênticos de fantasia
      if (s.type === "draw_tree") {
        const pts = this.getEquidistantPointsAlongPath(s.points, 16);
        const sorted = pts.slice().sort((a, b) => a.y - b.y);
        sorted.forEach((p, pIdx) => {
          this.drawPineTreeIcon(ctx, p.x, p.y, 16, (sIdx + 1) * 5 + pIdx);
        });
        return;
      }

      if (s.points.length < 2) return;

      if (s.type === "draw_land") {
        ctx.save();
        this.traceSmoothStrokePath(ctx, s.points);
        ctx.strokeStyle = "#a38248";
        ctx.lineWidth = 16 / this.mapZoom;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
        ctx.restore();
      } else if (s.type === "draw_river") {
        // Linha de água / Rio: traço fluido multicamada sem serrilhado nem tremidos
        ctx.save();
        // 1. Leito profundo da água (halo sutil)
        this.traceSmoothStrokePath(ctx, s.points);
        ctx.strokeStyle = "rgba(14, 116, 144, 0.38)";
        ctx.lineWidth = 6.6 / this.mapZoom;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        // 2. Correnteza principal do rio
        this.traceSmoothStrokePath(ctx, s.points);
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3.6 / this.mapZoom;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        // 3. Brilho límpido no centro do curso d'água
        this.traceSmoothStrokePath(ctx, s.points);
        ctx.strokeStyle = "rgba(224, 242, 254, 0.65)";
        ctx.lineWidth = 1.2 / this.mapZoom;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
        ctx.restore();
      } else if (s.type === "draw_road") {
        // Estrada / Rodovia: traço suave com linha pontilhada sem quinas duras
        ctx.save();
        this.traceSmoothStrokePath(ctx, s.points);
        ctx.strokeStyle = "#d6c7b2";
        ctx.lineWidth = 2.4 / this.mapZoom;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.setLineDash([5 / this.mapZoom, 5 / this.mapZoom]);
        ctx.stroke();
        ctx.restore();
      }
    });

    // ------------------------------------------------------------------------
    // 3.5. ASSENTAMENTOS CARTOGRÁFICOS (CAPITAIS COM CASTELO & CIDADES COM VILA)
    // ------------------------------------------------------------------------
    const settlements = this.engine.data.settlements || [];
    settlements.forEach(settle => {
      const isSelected = this.selectedSettlementId === settle.id;
      if (settle.type === "capital") {
        this.drawCastleIcon(ctx, settle.x, settle.y, 22, isSelected, settle.name);
      } else {
        this.drawVillageIcon(ctx, settle.x, settle.y, 18, isSelected, settle.name);
      }
    });

    // ------------------------------------------------------------------------
    // 4. PONTOS DE CONTROLE NAS BORDAS DOS TERRITÓRIOS (MODELAGEM PELA AUTORA)
    // Apenas visíveis quando o MODO DE EDIÇÃO estiver ativado!
    // ------------------------------------------------------------------------
    if (this.isMapEditMode) {
      territories.forEach(t => {
        if (!Array.isArray(t.points) || t.points.length < 3) return;
        const isSelected = t.id === this.selectedTerritoryId;

        if (isSelected) {
          ctx.save();
          // Anel pontilhado guia ligando os pontos da borda
          ctx.beginPath();
          ctx.moveTo(t.points[0].x, t.points[0].y);
          for (let i = 1; i < t.points.length; i++) {
            ctx.lineTo(t.points[i].x, t.points[i].y);
          }
          ctx.closePath();
          ctx.strokeStyle = "rgba(223, 186, 115, 0.45)";
          ctx.lineWidth = 1.2 / this.mapZoom;
          ctx.setLineDash([4 / this.mapZoom, 4 / this.mapZoom]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Pontos intermediários (midpoints) nas bordas para adicionar mais vértices ao puxar
          const len = t.points.length;
          for (let i = 0; i < len; i++) {
            const p1 = t.points[i];
            const p2 = t.points[(i + 1) % len];
            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2;
            const isHoveredMid =
              this.hoveredMapHandle &&
              this.hoveredMapHandle.kind === "midpoint" &&
              this.hoveredMapHandle.terr.id === t.id &&
              this.hoveredMapHandle.index === i;

            ctx.beginPath();
            ctx.arc(mx, my, (isHoveredMid ? 5.2 : 3.0) / this.mapZoom, 0, Math.PI * 2);
            ctx.fillStyle = isHoveredMid ? "#38bdf8" : "rgba(223, 186, 115, 0.65)";
            ctx.fill();
            ctx.strokeStyle = "#120e0a";
            ctx.lineWidth = 1 / this.mapZoom;
            ctx.stroke();
          }

          // Pontos principais na borda do território (cheio de pontos modeláveis)
          t.points.forEach((p, idx) => {
            const isHoveredVertex =
              (this.hoveredMapHandle &&
                this.hoveredMapHandle.kind === "vertex" &&
                this.hoveredMapHandle.terr.id === t.id &&
                this.hoveredMapHandle.index === idx) ||
              (this.draggingVertex &&
                this.draggingVertex.terrId === t.id &&
                this.draggingVertex.index === idx);

            ctx.beginPath();
            ctx.arc(p.x, p.y, (isHoveredVertex ? 7.2 : 5.4) / this.mapZoom, 0, Math.PI * 2);
            ctx.fillStyle = isHoveredVertex ? "#f43f5e" : "#fff3d1";
            ctx.fill();
            ctx.lineWidth = 2 / this.mapZoom;
            ctx.strokeStyle = isHoveredVertex ? "#ffffff" : t.color || "#c5a059";
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(p.x, p.y, (isHoveredVertex ? 2.6 : 1.8) / this.mapZoom, 0, Math.PI * 2);
            ctx.fillStyle = "#16110c";
            ctx.fill();
          });
          ctx.restore();
        } else {
          // Pontos discretos nos outros territórios indicando que também são modeláveis
          ctx.save();
          t.points.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3.0 / this.mapZoom, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(223, 186, 115, 0.55)";
            ctx.fill();
            ctx.strokeStyle = "rgba(18, 14, 10, 0.8)";
            ctx.lineWidth = 1 / this.mapZoom;
            ctx.stroke();
          });
          ctx.restore();
        }
      });
    }

    // ------------------------------------------------------------------------
    // 5. NOMES DOS CONTINENTES ATRELADOS AO CENTRO (RESPONSIVOS AO TAMANHO E AO ZOOM)
    // ------------------------------------------------------------------------
    if (this.showContinentNames) {
      // Regra de zoom cartográfico padrão: ao aproximar do continente (zoom >= 1.25), o nome some
      let zoomAlpha = 1.0;
      if (this.mapZoom > 1.0) {
        zoomAlpha = Math.max(0, 1.0 - (this.mapZoom - 1.0) / 0.25);
      }

      if (zoomAlpha > 0.01) {
        territories.forEach(t => {
          if (!Array.isArray(t.points) || t.points.length < 3) return;
          const isSelected = t.id === this.selectedTerritoryId;

          // Se o usuário selecionou o continente em específico, o nome dele deve sumir de imediato!
          if (isSelected) return;

          // 1. Calcula o raio/envergadura do continente
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          let maxDist = 0;
          t.points.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
            const d = Math.hypot(p.x - t.x, p.y - t.y);
            if (d > maxDist) maxDist = d;
          });

          const spanW = maxX - minX;
          const spanH = maxY - minY;
          const contRadius = Math.max(35, (maxDist + Math.min(spanW, spanH) / 2) / 2);

          // 2. Limita o tamanho do texto para NÃO ultrapassar o tamanho do continente
          const maxAllowedTextW = Math.max(30, spanW * 0.72);
          let fontSize = Math.max(10, Math.min(32, Math.round(contRadius * 0.15)));
          const nameText = (t.name || "Território").toUpperCase();

          ctx.save();
          // CLIP OBRIGATÓRIO: Garante que o nome fique estritamente dentro do continente
          // Não transborda para o oceano nem além da terra sob nenhuma hipótese!
          this.traceTerritoryPolygonPath(ctx, t.points);
          ctx.clip();

          ctx.font = `700 ${fontSize}px Cinzel, Georgia, serif`;
          let measuredW = ctx.measureText(nameText).width;
          if (measuredW > maxAllowedTextW && measuredW > 0) {
            fontSize = Math.max(8.5, Math.round(fontSize * (maxAllowedTextW / measuredW)));
            ctx.font = `700 ${fontSize}px Cinzel, Georgia, serif`;
          }

          // Meio transparente para não ficar na frente dos desenhos do mapa (árvores, montanhas, estradas, rios)
          // Sem caixa sólida/opaca por trás cobrindo os traços
          ctx.globalAlpha = 0.42 * zoomAlpha;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          // Sombra cartográfica sutil gravada no relevo
          ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
          ctx.shadowBlur = 4;
          ctx.fillStyle = t.color || "#dfba73";
          ctx.fillText(nameText, t.x, t.y);

          ctx.restore();
        });
      }
    }

    ctx.restore(); // Fecha o contexto transformado pelo mundo

    // ------------------------------------------------------------------------
    // 6. ELEMENTOS DO PAINEL DE NAVEGAÇÃO & ROSA DOS VENTOS (FIXOS NA TELA)
    // ------------------------------------------------------------------------
    ctx.fillStyle = "rgba(165, 216, 250, 0.85)";
    ctx.font = "600 11px Cinzel, serif";
    ctx.fillText("≈ ÁGUA (OCEANO INFINITO)", 16, 28);

    ctx.fillStyle = "rgba(223, 186, 115, 0.85)";
    ctx.font = "600 12px Cinzel, serif";
    ctx.fillText("SEPTENTRIO (N)", canvas.width - 130, 28);

    // Indicador sutil de escala do mapa
    ctx.strokeStyle = "rgba(223, 186, 115, 0.65)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, canvas.height - 18);
    ctx.lineTo(86, canvas.height - 18);
    ctx.moveTo(16, canvas.height - 23);
    ctx.lineTo(16, canvas.height - 13);
    ctx.moveTo(86, canvas.height - 23);
    ctx.lineTo(86, canvas.height - 13);
    ctx.stroke();

    ctx.fillStyle = "rgba(223, 186, 115, 0.80)";
    ctx.font = "500 10px Cinzel, serif";
    const scaleLeagues = Math.round(70 / this.mapZoom);
    ctx.fillText(`${scaleLeagues} léguas`, 24, canvas.height - 24);
  }

  renderMapStudio() {
    this.engine.ensureTerritoryPolygons(this.engine.data.territories);
    if (
      !this.selectedTerritoryId &&
      this.engine.data.territories &&
      this.engine.data.territories.length > 0
    ) {
      this.selectedTerritoryId = this.engine.data.territories[0].id;
    }

    this.drawMapCanvas();

    // Limpa a camada HTML legada de pins para que os nomes fiquem atrelados nativamente ao canvas
    const pinsLayer = document.getElementById("mapPinsLayer");
    if (pinsLayer) pinsLayer.innerHTML = "";

    this.renderSelectedTerritoryPanel();
  }

  startPinDrag(event, terrId) {
    if (this.isMapEditMode && this.mapTool === "select") {
      event.stopPropagation();
      this.selectedTerritoryId = terrId;
      this.renderMapStudio();
    }
  }

  selectTerritoryOnMap(terrId) {
    this.selectedTerritoryId = terrId;
    this.renderMapStudio();
  }

  jumpToTerritoryOnMap(terrId) {
    this.selectedTerritoryId = terrId;
    this.switchTab("tab-map");
  }

  renderSelectedTerritoryPanel() {
    const panel = document.getElementById("mapTerritoryDetailPanel");
    if (!panel) return;

    const t = this.engine.getTerritory(this.selectedTerritoryId) || this.engine.data.territories[0];
    if (!t) {
      panel.innerHTML = `
        <div style="text-align:center; padding:18px 8px;">
          <p style="margin-bottom:12px; color:var(--ink-secondary);">Todo o mapa está coberto por <strong>Água (mini ondas)</strong>. Clique no botão de continente para criar seu primeiro território de terra!</p>
          <button class="btn btn-gold" onclick="app.addContinentOnMap()">+ Novo Território (Continente)</button>
        </div>
      `;
      return;
    }

    const house = this.engine.getHouse(t.houseId);
    const borderPointsCount = Array.isArray(t.points) ? t.points.length : 0;

    const residents = this.engine.data.characters.filter(
      c => !c.isPlaceholderEmpty && c.livedInTerritoryId === t.id
    );
    const terrSettlements = (this.engine.data.settlements || []).filter(
      s => s.territoryId === t.id
    );

    const passages = t.notablePassages || [];

    const allCharsOpts = this.engine.data.characters
      .filter(c => !c.isPlaceholderEmpty)
      .map(c => `<option value="${c.id}">${this.escapeHtml(c.name)}</option>`)
      .join("");

    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
        <div>
          <span class="creation-cat-tag">${this.escapeHtml(t.type || "Território / Continente")}${this.isMapEditMode ? ` &bull; ${borderPointsCount} pontos na borda` : ""}</span>
          <h2 style="font-family:var(--font-display); font-size:1rem; margin-top:6px; color:var(--gold-leaf); text-transform:uppercase;">${this.escapeHtml(t.name)}</h2>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-sm btn-medieval" onclick="app.openTerritoryModal('${t.id}')" title="Alterar nome, cor e casa deste território">Editar</button>
          ${this.isMapEditMode ? `<button class="btn btn-sm btn-danger" onclick="app.openDeleteTerritoryModal('${t.id}')" title="Apagar território">&times;</button>` : ""}
        </div>
      </div>

      <p class="sub-desc" style="margin-top:4px; margin-bottom:10px;">
        <strong>Casa Soberana / Feudal:</strong> ${house ? this.escapeHtml(house.name) : "Independente"}<br/>
        ${this.escapeHtml(t.description || "")}
      </p>

      ${
        this.isMapEditMode
          ? `<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">
              <button class="btn btn-sm btn-medieval" onclick="app.subdivideSelectedTerritoryPoints()" title="Dobrar a quantidade de pontos na borda">+ Pontos na Borda</button>
              <button class="btn btn-sm btn-medieval" onclick="app.reduceSelectedTerritoryPoints()" title="Reduzir pela metade a quantidade de pontos da borda">&minus; Pontos na Borda</button>
              <button class="btn btn-sm btn-medieval" onclick="app.scaleSelectedTerritory(1.2)" title="Ampliar território em 20%">+ Expandir</button>
              <button class="btn btn-sm btn-medieval" onclick="app.scaleSelectedTerritory(0.85)" title="Reduzir território em 15%">&minus; Reduzir</button>
              <button class="btn btn-sm btn-medieval" onclick="app.smoothSelectedTerritoryPoints()" title="Suavizar o contorno costeiro">Suavizar Costa</button>
              <button class="btn btn-sm btn-medieval" onclick="app.resetTerritoryPolygonShape('${t.id}')" title="Restaurar formato circular de continente">Redefinir Formato</button>
            </div>`
          : ""
      }

      <div class="card-box" style="padding:10px 12px; margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div>
            <div style="display:flex; align-items:center; gap:6px;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--gold-leaf); flex-shrink:0;">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <h4 style="font-family:var(--font-display); color:var(--gold-leaf); font-size:0.8rem; text-transform:uppercase; margin:0;">
                Habitantes deste Território
              </h4>
            </div>
            <div style="font-size:0.82rem; color:var(--ink-secondary); margin-top:3px;">
              ${residents.length} ${residents.length === 1 ? "habitante registrado" : "habitantes registrados"}
            </div>
          </div>
          <button class="btn btn-sm btn-gold" onclick="app.openTerritoryResidentsDrawer('${t.id}')" title="Ver mais: abrir canto com todos os habitantes">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:4px;">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Ver Mais
          </button>
        </div>
      </div>

      <div class="card-box" style="padding:10px 12px; margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--gold-leaf); flex-shrink:0;">
              <path d="M4 21h16M5 21V9l3 2 4-4 4 4 3-2v12M9 21v-4a3 3 0 0 1 6 0v4"/>
            </svg>
            <h4 style="font-family:var(--font-display); color:var(--gold-leaf); font-size:0.8rem; text-transform:uppercase; margin:0;">
              Assentamentos &amp; Vilas (${terrSettlements.length})
            </h4>
          </div>
          ${this.isMapEditMode ? `
            <div style="display:flex; gap:4px;">
              <button class="btn btn-sm btn-gold" onclick="app.openSettlementModal(${t.x}, ${t.y}, 'capital')" title="Fundar Capital Real neste continente">+ Capital</button>
              <button class="btn btn-sm btn-medieval" onclick="app.openSettlementModal(${t.x}, ${t.y}, 'city')" title="Fundar Cidade ou Vila neste continente">+ Cidade</button>
            </div>
          ` : ""}
        </div>
        ${terrSettlements.length === 0 ? `
          <p style="font-size:0.8rem; color:var(--ink-secondary); margin:0;">Nenhum assentamento registrado neste território. Use os botões Capital ou Cidade da barra de ferramentas para fundar um centro urbano!</p>
        ` : `
          <div style="display:flex; flex-direction:column; gap:5px;">
            ${terrSettlements.map(s => `
              <div style="display:flex; justify-content:space-between; align-items:center; background:#140f0b; border:1px solid var(--border-brass); border-radius:3px; padding:6px 8px;">
                <div style="display:flex; align-items:center; gap:7px;">
                  <span style="font-size:1.1rem; line-height:1;">${s.type === "capital" ? "🏰" : "🏡"}</span>
                  <div>
                    <strong style="color:var(--parchment-bright); font-size:0.82rem;">${this.escapeHtml(s.name)}</strong>
                    <div style="font-size:0.7rem; color:var(--gold-leaf); text-transform:uppercase;">${s.type === "capital" ? "Capital Real" : "Cidade / Vila"} &bull; (${s.x}, ${s.y})</div>
                  </div>
                </div>
                <div style="display:flex; gap:4px;">
                  <button class="btn btn-sm btn-medieval" onclick="app.focusSettlementOnMap('${s.id}')" title="Focar e centralizar no mapa">Ver</button>
                  ${this.isMapEditMode ? `<button class="btn btn-sm btn-medieval" onclick="app.openEditSettlementModal('${s.id}')" title="Editar assentamento">Editar</button>` : ""}
                </div>
              </div>
            `).join("")}
          </div>
        `}
      </div>

      <div class="card-box" style="padding:10px;">
        <h4 style="font-family:var(--font-display); color:#7899c4; font-size:0.8rem; text-transform:uppercase; margin-bottom:8px;">
          Passagens & Marcos Históricos (${passages.length})
        </h4>
        <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:12px; max-height:210px; overflow-y:auto;">
          ${
            passages.length > 0
              ? passages
                  .map(p => {
                    const ch = this.engine.getCharacter(p.characterId);
                    return `
                      <div style="background:#140f0b; padding:6px 9px; border-radius:2px; border-left:3px solid ${p.isHistorical ? "#c5a059" : "#684f75"}; font-size:0.85rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                          <strong>${ch ? this.escapeHtml(ch.name) : "Personalidade"} (Ano ${p.year || "?"})</strong>
                          <span class="badge-pill ${p.isHistorical ? "badge-avuncular" : "badge-twin"}">
                            ${p.isHistorical ? "Marco Histórico" : "Passagem Pessoal"}
                          </span>
                        </div>
                        <div style="color:var(--ink-secondary); margin-top:3px;">${this.escapeHtml(p.description)}</div>
                      </div>
                    `;
                  })
                  .join("")
              : `<p style="font-size:0.84rem; color:var(--ink-dim); font-style:italic;">Nenhuma passagem lavrada neste território.</p>`
          }
        </div>

        <div style="border-top:1px solid var(--border-gold-subtle); padding-top:8px;">
          <div style="font-family:var(--font-display); font-size:0.72rem; font-weight:700; color:var(--gold-leaf); text-transform:uppercase; margin-bottom:6px;">
            Averbar Passagem de Personagem:
          </div>
          <div class="form-row" style="margin-bottom:6px;">
            <select id="pass_charId" class="select-medieval" style="width:100%;">
              ${allCharsOpts}
            </select>
            <input type="number" id="pass_year" value="1240" placeholder="Ano" class="input-medieval" />
          </div>
          <select id="pass_isHist" class="select-medieval" style="width:100%; margin-bottom:6px;">
            <option value="true">Marco Histórico (Batalha, Tratado, Fundação)</option>
            <option value="false">Passagem Pessoal / Segredo Local</option>
          </select>
          <input type="text" id="pass_desc" placeholder="Ato ou memória deixada neste solo..." class="input-medieval" style="width:100%; margin-bottom:6px;" />
          <button class="btn btn-sm btn-primary" style="width:100%; justify-content:center;" onclick="app.addTerritoryPassage('${t.id}')">
            Lavrar Passagem
          </button>
        </div>
      </div>
    `;
  }

  addTerritoryPassage(terrId) {
    const t = this.engine.getTerritory(terrId);
    if (!t) return;
    const characterId = document.getElementById("pass_charId").value;
    const year = Number(document.getElementById("pass_year").value) || 1240;
    const isHistorical = document.getElementById("pass_isHist").value === "true";
    const description = document.getElementById("pass_desc").value.trim();
    if (!description) return;

    const snapshot = this.engine.createSnapshot();
    t.notablePassages = t.notablePassages || [];
    t.notablePassages.push({
      id: "pass_" + Date.now(),
      characterId,
      year,
      isHistorical,
      description
    });

    this.engine.recordAuditLog(
      "TERRITÓRIO",
      "Passagem Histórica",
      `Passagem Averbada em ${t.name}`,
      `Registro no ano ${year}: "${description}"`,
      snapshot
    );

    this.syncHeaderAndBadges();
    this.renderSelectedTerritoryPanel();
  }

  // --------------------------------------------------------------------------
  // CANTO LATERAL: HABITANTES DO TERRITÓRIO (DRAWER)
  // --------------------------------------------------------------------------
  openTerritoryResidentsDrawer(terrId) {
    const t = this.engine.getTerritory(terrId) || this.engine.getTerritory(this.selectedTerritoryId);
    if (!t) return;

    const drawer = document.getElementById("residentsCornerDrawer");
    const backdrop = document.getElementById("residentsDrawerBackdrop");
    const titleEl = document.getElementById("residentsDrawerTitle");
    const typeEl = document.getElementById("residentsDrawerTerrType");
    const bodyEl = document.getElementById("residentsDrawerBody");
    if (!drawer || !bodyEl) return;

    const residents = this.engine.data.characters.filter(
      c => !c.isPlaceholderEmpty && c.livedInTerritoryId === t.id
    );

    if (typeEl) typeEl.textContent = t.type || "Território";
    if (titleEl) titleEl.textContent = `Habitantes de ${t.name} (${residents.length})`;

    if (residents.length === 0) {
      bodyEl.innerHTML = `
        <div style="text-align:center; padding:44px 16px; color:var(--ink-secondary);">
          <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:12px; opacity:0.6; color:var(--gold-leaf);">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
          <p style="font-size:0.92rem; margin-bottom:8px; color:var(--ink-parchment);">Nenhum habitante registrado neste território.</p>
          <p style="font-size:0.82rem; color:var(--ink-dim); font-style:italic;">Ao cadastrar ou editar personagens, defina seu território de moradia para vinculá-los aqui.</p>
        </div>
      `;
    } else {
      bodyEl.innerHTML = residents
        .map(r => {
          const portrait = this.getCharacterPortraitSrc(r);
          const house = this.engine.getHouse(r.officialHouseId || r.birthHouseId);
          const houseName = house ? house.name : "Independente";
          const houseColor = (house && house.color) || "#c5a059";
          const rankDisplay = this.engine.getSocialRankDisplay ? this.engine.getSocialRankDisplay(r.socialRank, r.gender) : (r.socialRank || "");

          return `
            <div class="resident-card-item">
              <img src="${portrait}" class="resident-card-avatar" alt="${this.escapeHtml(r.name)}" />
              <div class="resident-card-info">
                <div class="resident-card-name">${this.escapeHtml(r.name)}</div>
                <div class="resident-card-meta">
                  <span>*${r.birthYear || "?"} &bull; ${r.isAlive ? "Vivo" : "†" + (r.deathYear || "")}</span>
                  ${rankDisplay ? ` &bull; <em>${this.escapeHtml(rankDisplay)}</em>` : ""}
                </div>
                <div style="display:flex; gap:5px; margin-top:5px; flex-wrap:wrap;">
                  <span class="badge-pill" style="background:#1c1611; border-color:${houseColor}; color:${houseColor}; font-size:0.62rem;">
                    ${this.escapeHtml(houseName)}
                  </span>
                  <span class="badge-pill badge-twin" style="font-size:0.62rem;">
                    ${this.escapeHtml(r.race || "Humano")}
                  </span>
                </div>
              </div>
              <button class="btn btn-sm btn-medieval" onclick="app.openProfileModal('${r.id}')" title="Inspecionar registro e linhagem">
                Perfil
              </button>
            </div>
          `;
        })
        .join("");
    }

    drawer.classList.add("open");
    if (backdrop) backdrop.classList.add("open");
  }

  closeResidentsDrawer() {
    const drawer = document.getElementById("residentsCornerDrawer");
    const backdrop = document.getElementById("residentsDrawerBackdrop");
    if (drawer) drawer.classList.remove("open");
    if (backdrop) backdrop.classList.remove("open");
  }

  openTerritoryModal(editId = null, defaultX = 480, defaultY = 280) {
    const t = editId
      ? this.engine.getTerritory(editId)
      : {
          name: "",
          type: "Continente / Território",
          color: "#294873",
          x: defaultX,
          y: defaultY,
          houseId: (this.engine.data.houses[0] && this.engine.data.houses[0].id) || "",
          description: ""
        };

    const houseOpts = this.engine.data.houses
      .map(h => `<option value="${h.id}" ${t.houseId === h.id ? "selected" : ""}>${this.escapeHtml(h.name)}</option>`)
      .join("");

    const bodyHtml = `
      <div class="form-row">
        <div class="form-group">
          <label>Nome do Território / Continente:</label>
          <input type="text" id="tf_name" value="${this.escapeHtml(t.name)}" placeholder="Ex: Continente de Valória" />
        </div>
        <div class="form-group">
          <label>Natureza do Território:</label>
          <input type="text" id="tf_type" value="${this.escapeHtml(t.type || "")}" placeholder="Ex: Continente, Ilha, Província, Fortaleza..." />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Casa Soberana / Governante:</label>
          <select id="tf_houseId">${houseOpts}</select>
        </div>
        <div class="form-group">
          <label>Cor Heráldica do Território:</label>
          <input type="color" id="tf_color" value="${t.color || "#294873"}" style="height:38px;" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Centro X (0 &bull; 960):</label>
          <input type="number" id="tf_x" value="${t.x}" />
        </div>
        <div class="form-group">
          <label>Centro Y (0 &bull; 560):</label>
          <input type="number" id="tf_y" value="${t.y}" />
        </div>
      </div>

      <div class="form-group">
        <label>Descrição Histórica & Geográfica:</label>
        <textarea id="tf_desc" rows="3">${this.escapeHtml(t.description || "")}</textarea>
      </div>
    `;

    this.showModal(
      editId ? `Editar Território: ${t.name}` : `Fundar Novo Território (Continente)`,
      bodyHtml,
      `
        <button class="btn btn-medieval" onclick="app.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="app.saveTerritoryFromModal('${editId || ""}')">Salvar Território</button>
      `
    );
  }

  saveTerritoryFromModal(editId = "") {
    const name = document.getElementById("tf_name").value.trim() || "Novo Território";
    const type = document.getElementById("tf_type").value.trim() || "Continente / Território";
    const houseId = document.getElementById("tf_houseId").value;
    const color = document.getElementById("tf_color").value;
    const newX = Number(document.getElementById("tf_x").value) || 480;
    const newY = Number(document.getElementById("tf_y").value) || 280;
    const description = document.getElementById("tf_desc").value.trim();

    const snapshot = this.engine.createSnapshot();

    if (editId) {
      const existing = this.engine.getTerritory(editId);
      const oldName = existing ? existing.name : "";
      if (existing) {
        const dx = newX - (existing.x || newX);
        const dy = newY - (existing.y || newY);
        if ((dx !== 0 || dy !== 0) && Array.isArray(existing.points)) {
          existing.points.forEach(p => {
            p.x = Math.max(8, Math.min(952, p.x + dx));
            p.y = Math.max(8, Math.min(552, p.y + dy));
          });
        }
        Object.assign(existing, { name, type, houseId, color, x: newX, y: newY, description });
        this.engine.ensureTerritoryPolygons([existing]);
      }
      this.engine.recordAuditLog(
        "TERRITÓRIO",
        "Alteração de Território",
        `Território Atualizado: "${oldName}" &rarr; "${name}"`,
        `O território "${oldName}" teve suas propriedades atualizadas.`,
        snapshot
      );
    } else {
      const points = this.engine.generateContinentPoints(newX, newY, 96, 74, 24, this.engine.data.territories.length + 1);
      const newTerr = {
        id: "terr_" + Date.now(),
        name,
        type,
        houseId,
        color,
        x: newX,
        y: newY,
        points,
        description,
        notablePassages: []
      };
      this.engine.data.territories.push(newTerr);
      this.selectedTerritoryId = newTerr.id;
      this.engine.recordAuditLog(
        "TERRITÓRIO",
        "Fundação de Território",
        `Novo Território Fundado: ${name}`,
        `O território "${name}" foi averbado na cartografia do reino com ${points.length} pontos de borda.`,
        snapshot
      );
    }

    this.closeModal();
    this.syncHeaderAndBadges();
    this.renderMapStudio();
    this.renderTree();
  }

  openDeleteTerritoryModal(terrId) {
    const t = this.engine.getTerritory(terrId);
    if (!t) return;

    const bodyHtml = `
      <div class="alert-banner alert-danger" style="margin-bottom:10px;">
        <strong>Confirmação de Exclusão de Território:</strong><br/>
        Tem certeza de que deseja submergir e remover o território <strong>"${this.escapeHtml(t.name)}"</strong> do mapa?
      </div>
      <p style="font-size:0.9rem; color:var(--ink-secondary); line-height:1.5;">
        A área ocupada por este território voltará a ser <strong>Água (preenchida com ícones de mini ondas)</strong>. Esta remoção será registrada nos <em>Anais do Reino</em> e poderá ser revertida a qualquer momento.
      </p>
    `;

    this.showModal(
      `Confirmar Exclusão: ${t.name}`,
      bodyHtml,
      `
        <button class="btn btn-medieval" onclick="app.closeModal()">Cancelar</button>
        <button class="btn btn-danger" onclick="app.deleteTerritory('${t.id}')">Confirmar Exclusão</button>
      `
    );
  }

  deleteTerritory(terrId) {
    const t = this.engine.getTerritory(terrId);
    if (!t) return;
    const snapshot = this.engine.createSnapshot();

    this.engine.data.territories = this.engine.data.territories.filter(x => x.id !== terrId);
    if (this.selectedTerritoryId === terrId) {
      this.selectedTerritoryId =
        (this.engine.data.territories[0] && this.engine.data.territories[0].id) || null;
    }

    this.engine.recordAuditLog(
      "TERRITÓRIO",
      "Extinção de Território",
      `Território Removido: ${t.name}`,
      `O território "${t.name}" foi removido da cartografia e sua área retornou ao oceano.`,
      snapshot
    );

    this.closeModal();
    this.syncHeaderAndBadges();
    this.renderMapStudio();
    this.renderTree();
  }

  // --------------------------------------------------------------------------
  // GESTÃO DE ASSENTAMENTOS (CAPITAIS REAIS & CIDADES / VILAS)
  // --------------------------------------------------------------------------
  focusSettlementOnMap(settleId) {
    const settle = (this.engine.data.settlements || []).find(s => s.id === settleId);
    if (!settle) return;
    this.selectedSettlementId = settle.id;
    const canvas = document.getElementById("fantasyMapCanvas");
    const cx = canvas ? canvas.width / 2 : 480;
    const cy = canvas ? canvas.height / 2 : 280;
    this.mapPanX = Math.round(cx - settle.x * this.mapZoom);
    this.mapPanY = Math.round(cy - settle.y * this.mapZoom);
    this.drawMapCanvas();
  }

  openSettlementModal(x, y, defaultType = "city") {
    const houses = this.engine.data.houses || [];
    const territories = this.engine.data.territories || [];
    const hitTerr = this.findHitTerritoryBody({ x, y });
    const selectedTerrId = hitTerr
      ? hitTerr.id
      : this.selectedTerritoryId || (territories[0] && territories[0].id) || "";

    const houseOpts = houses
      .map(h => `<option value="${h.id}">${this.escapeHtml(h.name)}</option>`)
      .join("");

    const terrOpts = territories
      .map(
        t =>
          `<option value="${t.id}" ${t.id === selectedTerrId ? "selected" : ""}>${this.escapeHtml(
            t.name
          )}</option>`
      )
      .join("");

    const isCapital = defaultType === "capital";

    const bodyHtml = `
      <div class="form-row">
        <div class="form-group">
          <label>Nome do Assentamento:</label>
          <input type="text" id="sf_name" placeholder="Ex: ${
            isCapital ? "Cidadela Real de Ébano" : "Vila das Pedras Altas"
          }" autofocus />
        </div>
        <div class="form-group">
          <label>Tipo de Assentamento:</label>
          <select id="sf_type">
            <option value="capital" ${isCapital ? "selected" : ""}>🏰 Capital Real (Ícone de Castelinho)</option>
            <option value="city" ${!isCapital ? "selected" : ""}>🏡 Cidade / Vila (Ícone de Aldeia)</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Território / Continente:</label>
          <select id="sf_territoryId">${terrOpts}</select>
        </div>
        <div class="form-group">
          <label>Casa Nobre Soberana:</label>
          <select id="sf_houseId">${houseOpts}</select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Posição no Mapa X:</label>
          <input type="number" id="sf_x" value="${Math.round(x)}" />
        </div>
        <div class="form-group">
          <label>Posição no Mapa Y:</label>
          <input type="number" id="sf_y" value="${Math.round(y)}" />
        </div>
      </div>
      <p style="font-size:0.82rem; color:var(--ink-secondary); margin-top:4px;">
        ${
          isCapital
            ? "Uma <strong>Capital Real</strong> é o coração administrativo e dinástico de seu reino no mapa (representada por um castelinho medieval)."
            : "Uma <strong>Cidade ou Vila</strong> representa portos, burgos ou centros comerciais regionais (representada por um conjunto de casas de aldeia)."
        }
      </p>
    `;

    this.showModal(
      isCapital ? "Fundar Nova Capital Real" : "Fundar Nova Cidade / Vila",
      bodyHtml,
      `
        <button class="btn btn-medieval" onclick="app.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="app.saveSettlementFromModal()">Fundar no Mapa</button>
      `
    );
  }

  saveSettlementFromModal(editId = null) {
    const nameEl = document.getElementById("sf_name");
    const name =
      (nameEl && nameEl.value.trim()) || (editId ? "Assentamento" : "Nova Fundação");
    const type = document.getElementById("sf_type").value;
    const territoryId = document.getElementById("sf_territoryId").value;
    const houseId = document.getElementById("sf_houseId").value;
    const x = Number(document.getElementById("sf_x").value) || 0;
    const y = Number(document.getElementById("sf_y").value) || 0;

    const snapshot = this.engine.createSnapshot();
    this.engine.data.settlements = this.engine.data.settlements || [];

    const house = this.engine.getHouse(houseId);
    const houseName = house ? house.name : "Coroa Real";
    const typeLabel = type === "capital" ? "Capital Real" : "Cidade / Vila";

    if (editId) {
      const existing = this.engine.data.settlements.find(s => s.id === editId);
      if (existing) {
        existing.name = name;
        existing.type = type;
        existing.territoryId = territoryId;
        existing.houseId = houseId;
        existing.x = x;
        existing.y = y;
      }
      this.engine.recordAuditLog(
        "TERRITÓRIO",
        "Edição de Assentamento",
        `Assentamento Atualizado: ${name}`,
        `O assentamento "${name}" (${typeLabel}) foi atualizado sob o domínio da ${houseName}.`,
        snapshot
      );
    } else {
      const newSettlement = {
        id: "settle_" + Date.now(),
        type,
        name,
        x,
        y,
        territoryId,
        houseId
      };
      this.engine.data.settlements.push(newSettlement);
      this.selectedSettlementId = newSettlement.id;
      this.engine.recordAuditLog(
        "TERRITÓRIO",
        "Fundação de Assentamento",
        `Novo Assentamento: ${name}`,
        `A fundação de "${name}" (${typeLabel}) foi estabelecida no mapa em (${x}, ${y}) sob a regência da ${houseName}.`,
        snapshot
      );
    }

    this.engine.saveToStorage();
    this.closeModal();
    this.setMapTool("select");
    this.renderMapStudio();
  }

  openEditSettlementModal(settleId) {
    const settle = (this.engine.data.settlements || []).find(s => s.id === settleId);
    if (!settle) return;

    const houses = this.engine.data.houses || [];
    const territories = this.engine.data.territories || [];

    const houseOpts = houses
      .map(
        h =>
          `<option value="${h.id}" ${h.id === settle.houseId ? "selected" : ""}>${this.escapeHtml(
            h.name
          )}</option>`
      )
      .join("");

    const terrOpts = territories
      .map(
        t =>
          `<option value="${t.id}" ${t.id === settle.territoryId ? "selected" : ""}>${this.escapeHtml(
            t.name
          )}</option>`
      )
      .join("");

    const isCapital = settle.type === "capital";

    const bodyHtml = `
      <div class="form-row">
        <div class="form-group">
          <label>Nome do Assentamento:</label>
          <input type="text" id="sf_name" value="${this.escapeHtml(settle.name)}" />
        </div>
        <div class="form-group">
          <label>Tipo de Assentamento:</label>
          <select id="sf_type">
            <option value="capital" ${isCapital ? "selected" : ""}>🏰 Capital Real (Ícone de Castelinho)</option>
            <option value="city" ${!isCapital ? "selected" : ""}>🏡 Cidade / Vila (Ícone de Aldeia)</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Território / Continente:</label>
          <select id="sf_territoryId">${terrOpts}</select>
        </div>
        <div class="form-group">
          <label>Casa Nobre Soberana:</label>
          <select id="sf_houseId">${houseOpts}</select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Posição no Mapa X:</label>
          <input type="number" id="sf_x" value="${settle.x}" />
        </div>
        <div class="form-group">
          <label>Posição no Mapa Y:</label>
          <input type="number" id="sf_y" value="${settle.y}" />
        </div>
      </div>
    `;

    this.showModal(
      `Editar Assentamento: ${settle.name}`,
      bodyHtml,
      `
        <button class="btn btn-danger" onclick="app.confirmDeleteSettlement('${settle.id}')">Excluir Assentamento</button>
        <div style="flex:1"></div>
        <button class="btn btn-medieval" onclick="app.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="app.saveSettlementFromModal('${settle.id}')">Salvar Alterações</button>
      `
    );
  }

  confirmDeleteSettlement(settleId) {
    const settle = (this.engine.data.settlements || []).find(s => s.id === settleId);
    if (!settle) return;

    this.showModal(
      `Confirmar Exclusão de Assentamento`,
      `
        <div class="alert-banner alert-danger" style="margin-bottom:10px;">
          <strong>Confirmação de Exclusão:</strong><br/>
          Tem certeza que deseja remover o assentamento <strong>"${this.escapeHtml(settle.name)}"</strong> (${
            settle.type === "capital" ? "Capital Real" : "Cidade / Vila"
          }) do mapa?
        </div>
        <p style="font-size:0.88rem; color:var(--ink-secondary); line-height:1.5;">
          Esta remoção será registrada nos Anais do Reino e poderá ser revertida a qualquer momento.
        </p>
      `,
      `
        <button class="btn btn-medieval" onclick="app.closeModal()">Cancelar</button>
        <button class="btn btn-danger" onclick="app.deleteSettlement('${settle.id}')">Confirmar Exclusão</button>
      `
    );
  }

  deleteSettlement(settleId) {
    const idx = (this.engine.data.settlements || []).findIndex(s => s.id === settleId);
    if (idx === -1) return;
    const snapshot = this.engine.createSnapshot();
    const [removed] = this.engine.data.settlements.splice(idx, 1);

    this.engine.recordAuditLog(
      "TERRITÓRIO",
      "Remoção de Assentamento",
      `Assentamento Removido: ${removed.name}`,
      `O assentamento "${removed.name}" (${
        removed.type === "capital" ? "Capital Real" : "Cidade / Vila"
      }) foi removido da cartografia.`,
      snapshot
    );
    this.engine.saveToStorage();
    this.closeModal();
    this.renderMapStudio();
  }

  // --------------------------------------------------------------------------
  // ANAIS DO REINO & REVERSÃO
  // --------------------------------------------------------------------------
  setHistoryFilter(cat) {
    this.activeHistoryFilter = cat;
    this.renderAuditHistory();
  }

  renderAuditHistory() {
    const container = document.getElementById("auditLogsContainer");
    if (!container) return;

    ["ALL", "LINHAGEM", "CASA", "TERRITORIO", "CRONOLOGIA", "GRIMORIO"].forEach(k => {
      const btn = document.getElementById("histFilter" + k);
      if (btn) btn.classList.toggle("btn-primary", this.activeHistoryFilter === k);
    });

    const logs = this.engine.data.auditLogs.filter(l => {
      if (this.activeHistoryFilter === "ALL") return true;
      if (this.activeHistoryFilter === "TERRITORIO") {
        return (
          l.category === "TERRITÓRIO" ||
          l.category === "TERRITORIO" ||
          l.category === "ASSENTAMENTO"
        );
      }
      if (this.activeHistoryFilter === "CRONOLOGIA") {
        return (
          l.category === "CRONOLOGIA" ||
          l.category === "GUERRA" ||
          l.category === "HISTÓRIA"
        );
      }
      if (this.activeHistoryFilter === "GRIMORIO") {
        return l.category === "GRIMÓRIO" || l.category === "GRIMORIO";
      }
      return l.category === this.activeHistoryFilter;
    });

    if (logs.length === 0) {
      container.innerHTML = `<p style="color:var(--ink-dim); font-style:italic;">Nenhum registro lavrado nesta categoria.</p>`;
      return;
    }

    container.innerHTML = logs
      .map(l => {
        let cleanCat = l.category;
        if (cleanCat === "TERRITÓRIO" || cleanCat === "ASSENTAMENTO") cleanCat = "TERRITORIO";
        if (cleanCat === "GUERRA" || cleanCat === "HISTÓRIA") cleanCat = "CRONOLOGIA";
        if (cleanCat === "GRIMÓRIO") cleanCat = "GRIMORIO";
        return `
          <div class="audit-log-item cat-${cleanCat}">
            <div>
              <div style="display:flex; gap:8px; align-items:center; margin-bottom:3px;">
                <span class="badge-pill badge-avuncular" style="margin:0;">${this.escapeHtml(l.category)}</span>
                <span style="font-size:0.78rem; color:var(--ink-dim);">${this.escapeHtml(l.timestamp)} &bull; ${this.escapeHtml(l.actionType)}</span>
              </div>
              <div style="font-family:var(--font-display); font-size:0.9rem; font-weight:700; color:var(--gold-leaf); text-transform:uppercase;">${this.escapeHtml(l.title)}</div>
              <div style="font-size:0.86rem; color:var(--ink-secondary); margin-top:2px;">${this.escapeHtml(l.details)}</div>
            </div>

            <div>
              ${
                l.canRevert && !l.reverted
                  ? `<button class="btn btn-gold btn-sm" onclick="app.revertLogAction('${l.id}')">
                      Revogar & Restaurar
                    </button>`
                  : l.reverted
                  ? `<span class="badge-pill badge-twin">Restaurado</span>`
                  : `<span style="font-size:0.75rem; color:var(--ink-dim); font-style:italic;">Registro Inicial</span>`
              }
            </div>
          </div>
        `;
      })
      .join("");
  }

  revertLogAction(logId) {
    const res = this.engine.revertAuditLog(logId);
    if (res.success) {
      this.syncHeaderAndBadges();
      this.populateFilterControls();
      this.renderTree();
      this.renderHousesAndSuccessionTab();
      this.renderMapStudio();
      this.renderTimeline();
      this.renderGrimoire();
      this.renderAuditHistory();
    }
  }

  // --------------------------------------------------------------------------
  // ARQUIVO DO REINO / EXPORTAÇÃO
  // --------------------------------------------------------------------------
  exportWorldJson() {
    const jsonStr = JSON.stringify(this.engine.data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `codice_linhagens_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importWorldJson(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed && Array.isArray(parsed.characters)) {
          this.engine.data = parsed;
          this.engine.saveToStorage();
          this.init();
        }
      } catch (err) {
        alert("Manuscrito corrompido ou formato JSON inválido.");
      }
    };
    reader.readAsText(file);
  }

  openResetWorldModal() {
    const bodyHtml = `
      <div class="form-group">
        <label>Título do Reino / Códice Narrativo:</label>
        <input type="text" id="wf_title" value="${this.escapeHtml(this.engine.data.meta.worldTitle)}" />
      </div>

      <div class="card-box" style="margin-top:10px;">
        <h2>Persistência & Banco de Dados</h2>
        <p class="sub-desc">Os dados são sincronizados automaticamente com o <strong>MongoDB Atlas</strong> via PHP. Você pode sincronizar manualmente ou limpar os dados para iniciar uma nova linhagem em branco.</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-gold" onclick="app.syncDatabaseNow(); app.closeModal();">Sincronizar com MongoDB Atlas</button>
          <button class="btn btn-danger" onclick="app.startBlankWorld()">Limpar Pergaminho e Iniciar do Zero</button>
        </div>
      </div>
    `;

    this.showModal(
      "Governança & Arquivo do Reino",
      bodyHtml,
      `
        <button class="btn btn-medieval" onclick="app.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="app.saveWorldTitle()">Salvar Título</button>
      `
    );
  }

  saveWorldTitle() {
    const t = document.getElementById("wf_title")?.value.trim();
    if (t) {
      this.engine.data.meta.worldTitle = t;
      this.engine.saveToStorage();
      this.syncHeaderAndBadges();
    }
    this.closeModal();
  }

  resetToDemoWorld() {
    this.engine.resetToDefault();
    this.closeModal();
    this.init();
  }

  startBlankWorld() {
    this.engine.createBlankWorld();
    this.closeModal();
    this.init();
  }

  // --------------------------------------------------------------------------
  // Modais e Auxiliares
  // --------------------------------------------------------------------------
  showModal(title, bodyHtml, footerHtml) {
    document.getElementById("mainModalTitle").textContent = title;
    document.getElementById("mainModalBody").innerHTML = bodyHtml;
    document.getElementById("mainModalFooter").innerHTML = footerHtml || "";
    document.getElementById("mainModalBackdrop").classList.add("open");
  }

  closeModal() {
    document.getElementById("mainModalBackdrop").classList.remove("open");
  }

  escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.app = new FantasyGenealogyApp();
});
