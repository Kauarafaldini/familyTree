// ============================================================================
// APP.JS - Interface do Códice & Livro das Linhagens Reais
// Estética de História Antiga, Camafeus Heráldicos e Crônicas Nobiliárquicas
// ============================================================================

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
    this.mapTool = "select"; // select, add_city, draw_land, draw_river, draw_road, draw_mountain
    this.isDrawingMap = false;
    this.draggingPinId = null;

    this.init();
  }

  init() {
    this.syncHeaderAndBadges();
    this.populateHouseFilterSelect();
    this.renderTree();
    this.renderHousesAndSuccessionTab();
    this.renderGrimoire();
    this.initMapCanvasEvents();
    this.renderMapStudio();
    this.renderAuditHistory();
  }

  // --------------------------------------------------------------------------
  // Sincronização Geral e Navegação de Capítulos
  // --------------------------------------------------------------------------
  syncHeaderAndBadges() {
    const d = this.engine.data;
    const titleEl = document.getElementById("worldTitleDisplay");
    if (titleEl) titleEl.textContent = d.meta.worldTitle || "Crônicas de Ébano & Vinha";

    const yrInput = document.getElementById("currentYearInput");
    if (yrInput) yrInput.value = d.meta.currentYear || 1248;

    const activeChars = d.characters.filter(c => !c.isPlaceholderEmpty).length;
    const bChar = document.getElementById("badgeCharCount");
    const bHouse = document.getElementById("badgeHouseCount");
    const bCre = document.getElementById("badgeCreationCount");
    const bTerr = document.getElementById("badgeTerritoryCount");
    const bLog = document.getElementById("badgeLogCount");

    if (bChar) bChar.textContent = activeChars;
    if (bHouse) bHouse.textContent = d.houses.length;
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
    if (tabId === "tab-grimoire") this.renderGrimoire();
    if (tabId === "tab-map") this.renderMapStudio();
    if (tabId === "tab-history") this.renderAuditHistory();
  }

  updateCurrentYear(newYear) {
    const yr = Number(newYear);
    if (!isNaN(yr) && yr > 0) {
      this.engine.data.meta.currentYear = yr;
      this.engine.saveToStorage();
      const simInput = document.getElementById("successionSimYear");
      if (simInput) simInput.value = yr;
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

  populateHouseFilterSelect() {
    const sel = document.getElementById("houseFilterSelect");
    if (!sel) return;
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

  setHouseFilter(houseId) {
    this.engine.data.meta.selectedHouseFilter = houseId;
    this.engine.saveToStorage();
    this.renderTree();
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
    const filterHouseId = d.meta.selectedHouseFilter || "all";

    // Filtra personagens visíveis
    let chars = d.characters.slice();
    if (filterHouseId !== "all") {
      chars = chars.filter(
        c => c.officialHouseId === filterHouseId || c.birthHouseId === filterHouseId
      );
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
            generation: g
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
                fill="none" stroke="#8b202e" stroke-width="2.6"
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
                fill="none" stroke="#8b202e" stroke-width="2.6"
                ${child.isBastard ? 'stroke-dasharray="5 4"' : ""}
                filter="url(#shadowMedieval)" />
        `;
      }

      // Laço Carmesim de Gêmeos
      if (child.twinOfId && positions[child.twinOfId]) {
        const twinKey = [child.id, child.twinOfId].sort().join("__");
        if (!drawnTwins.has(twinKey)) {
          drawnTwins.add(twinKey);
          const tPos = positions[child.twinOfId];
          const midX = (childPos.x + tPos.x) / 2;
          const topY = Math.min(childPos.y, tPos.y) + 12;
          svgHtml += `
            <path d="M ${childPos.x} ${childPos.y + 18} Q ${midX} ${topY - 22} ${tPos.x} ${tPos.y + 18}"
                  fill="none" stroke="#8b202e" stroke-width="2" stroke-dasharray="3 3" />
            <rect x="${midX - 30}" y="${topY - 23}" width="60" height="15" rx="2" fill="#241a15" stroke="#8b202e" />
            <text x="${midX}" y="${topY - 12}" fill="#dfba73" font-family="Cinzel, serif" font-size="8.5" font-weight="700" text-anchor="middle">Gêmeos</text>
          `;
        }
      }

      // Conexão Fraterna Sutil entre Irmãos
      const siblings = this.engine.getSiblings(child);
      siblings.forEach(sib => {
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
                fill="none" stroke="#8b202e" stroke-width="1.4" opacity="0.45" />
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

      const birthHouse = this.engine.getHouse(c.birthHouseId);
      const officialHouse = this.engine.getHouse(c.officialHouseId);
      const territory = this.engine.getTerritory(c.livedInTerritoryId);

      let ringColor = "#8b202e";
      let modeSubLabel = "";

      if (colorMode === "linhagem") {
        ringColor = (birthHouse && birthHouse.color) || "#8b202e";
        modeSubLabel = `${birthHouse ? birthHouse.name : "Linhagem Antiga"}`;
      } else {
        ringColor = (territory && territory.color) || (officialHouse && officialHouse.color) || "#294873";
        modeSubLabel = `${territory ? territory.name : (officialHouse ? officialHouse.name : "Sem Feudo Fixo")}`;
      }

      const isAssimilatedWife =
        c.gender === "F" && c.birthHouseId && c.officialHouseId && c.birthHouseId !== c.officialHouseId;

      const birthStr = c.birthYear ? `* ${c.birthYear}` : "* ?";
      const deathStr = c.isAlive
        ? `Vivo (${c.birthYear ? currentYear - c.birthYear + "a" : ""})`
        : `† ${c.deathYear || "?"}`;

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
              <div class="grape-dates">Lugar de: ${this.escapeHtml(c.previousDeletedName || "Excluído")}</div>
            </div>
          </div>
        `;
        return;
      }

      // Selos Nobiliárquicos Discretos
      let extraBadgesHtml = "";
      if (c.isBastard) {
        if (c.bastardLegitimizedByAuthor) {
          extraBadgesHtml += `<div class="badge-pill badge-bastard">Lembrança de Bastardo (Exceção)</div>`;
        } else {
          extraBadgesHtml += `<div class="badge-pill badge-bastard">Bastardo (Desprovido de Herança)</div>`;
        }
      }
      if (c.twinOfId) {
        extraBadgesHtml += `<div class="badge-pill badge-twin">Gêmeo(a)</div>`;
      }
      if (c.linkedToExcludedLineage) {
        extraBadgesHtml += `<div class="badge-pill badge-excluded-lineage" title="Retomou a Casa de Nascimento após exclusão da linhagem">Linhagem Excluída</div>`;
      }
      if (c.creatureType && c.creatureType !== "humano") {
        extraBadgesHtml += `<div class="badge-pill badge-twin">Ser Mítico (Exceção)</div>`;
      }

      const portraitSrc = this.getCharacterPortraitSrc(c);

      nodesHtml += `
        <div class="grape-node-wrapper" style="left:${pos.x}px; top:${pos.y}px;">
          <div class="grape-sphere ${isAssimilatedWife ? "assimilated-wife" : ""}"
               style="--ring-color:${ringColor}; --origin-house-color:${birthHouse ? birthHouse.color : "#294873"};">

            <!-- CAMAFEU HERÁLDICO COM RETRATO REAL (SEM NOME NO INTERIOR DO CÍRCULO) -->
            <div class="sphere-portrait-clip" onclick="app.openProfileModal('${c.id}')" title="Inspecionar códice e registros">
              <img class="sphere-portrait-img" src="${portraitSrc}" alt="" />
            </div>

            <!-- BOTÃO DISCRETO DE PERFIL -->
            <button class="sphere-info-btn" onclick="app.openProfileModal('${c.id}')" title="Ver História, Aparência, Causa de Morte e Feudos">
              Perfil
            </button>

            <!-- Ações Rápidas Nobiliárquicas no Hover -->
            <div class="sphere-quick-actions">
              <button class="quick-dot-btn" title="Adicionar Filho ou Gêmeos" onclick="app.openQuickChildModal('${c.id}')">+Filho</button>
              <button class="quick-dot-btn" title="Adicionar Irmão Retroativo" onclick="app.openRetroactiveSiblingModal('${c.id}')">+Irmão</button>
              <button class="quick-dot-btn" title="Celebrar Casamento" onclick="app.openMarriageModal('${c.id}')">Casar</button>
              <button class="quick-dot-btn" title="Editar Registro" onclick="app.openCharacterModal('${c.id}')">Editar</button>
              <button class="quick-dot-btn danger" title="Verificação de Exclusão" onclick="app.openDeleteVerificationModal('${c.id}')">&times;</button>
            </div>
          </div>

          <!-- PLAQUETA GENEALÓGICA INFERIOR: NOME & DATAS -->
          <div class="grape-caption">
            <div class="grape-name">${this.escapeHtml(c.name)}</div>
            <div class="grape-dates">${birthStr} &bull; ${deathStr}</div>
            <div class="grape-house-sub">${this.escapeHtml(modeSubLabel)}</div>
            ${
              isAssimilatedWife
                ? `<div class="grape-house-sub" style="color:#7899c4;">Oficial: ${this.escapeHtml(officialHouse ? officialHouse.name : "")}</div>`
                : ""
            }
            ${extraBadgesHtml}
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
    if (rank === "rei") {
      headgearSvg = `
        <polygon points="30,31 35,14 43,24 50,11 57,24 65,14 70,31" fill="#c5a059" stroke="#5c441c" stroke-width="1.2"/>
        <circle cx="50" cy="16" r="2.2" fill="#8b202e"/>
        <circle cx="37" cy="20" r="1.6" fill="#294873"/>
        <circle cx="63" cy="20" r="1.6" fill="#294873"/>
      `;
    } else if (rank === "principe" || rank === "lorde") {
      headgearSvg = `
        <path d="M 33 30 Q 50 22 67 30 L 65 33 Q 50 26 35 33 Z" fill="#c5a059" stroke="#694d1f" stroke-width="1"/>
        <circle cx="50" cy="26" r="2" fill="${robeColor}"/>
      `;
    } else if (rank === "guarda") {
      headgearSvg = `
        <path d="M 32 35 Q 50 18 68 35 Z" fill="#4d4740" stroke="#756d61" stroke-width="1.2"/>
      `;
    }

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
            <div style="font-size:0.88rem; color:var(--ink-secondary); font-style:italic;">${this.escapeHtml(c.royalBranchStatus || "Membro da Linhagem")}</div>
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
      <button class="btn btn-sm btn-medieval" onclick="app.openQuickChildModal('${c.id}')">+Filho</button>
      <button class="btn btn-sm btn-medieval" onclick="app.openRetroactiveSiblingModal('${c.id}')">+Irmão</button>
      <button class="btn btn-sm btn-gold" onclick="app.openMarriageModal('${c.id}')">Casar</button>
      <button class="btn btn-sm btn-primary" onclick="app.openCharacterModal('${c.id}')">Editar</button>
      <button class="btn btn-sm btn-danger" onclick="app.openDeleteVerificationModal('${c.id}')">Excluir</button>
      <button class="btn btn-sm btn-medieval" onclick="app.closeModal()">Fechar</button>
    `;

    this.showModal(`Assento de ${c.name}`, bodyHtml, footerHtml);
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
          creatureType: "humano",
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

    const housesOpts = this.engine.data.houses
      .map(h => `<option value="${h.id}" ${c.birthHouseId === h.id ? "selected" : ""}>${this.escapeHtml(h.name)}</option>`)
      .join("");

    const officialHousesOpts = this.engine.data.houses
      .map(h => `<option value="${h.id}" ${c.officialHouseId === h.id ? "selected" : ""}>${this.escapeHtml(h.name)}</option>`)
      .join("");

    const territoriesOpts = this.engine.data.territories
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

    const bodyHtml = `
      <div id="charInconsistencyBox" style="display:none;"></div>
      <div id="charSmartBastardNotice" style="display:none;"></div>
      <div id="charSmartTwinSuggestion" style="display:none;"></div>

      <div class="form-row">
        <div class="form-group">
          <label>Nome Completo do Personagem:</label>
          <input type="text" id="cf_name" value="${this.escapeHtml(c.name)}" placeholder="Ex: Príncipe Aegon Valmont" />
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
          <label>Natureza do Personagem:</label>
          <select id="cf_creatureType" onchange="app.checkFormBastardAndTwinHints()">
            <option value="humano" ${c.creatureType === "humano" ? "selected" : ""}>Mortal / Humano (Padrão Genealógico)</option>
            <option value="bruxo" ${c.creatureType === "bruxo" ? "selected" : ""}>Feiticeiro / Mago (Gera Notificação de Inconsistência)</option>
            <option value="elfo" ${c.creatureType === "elfo" ? "selected" : ""}>Elfo (Gera Notificação de Inconsistência)</option>
            <option value="sereia" ${c.creatureType === "sereia" ? "selected" : ""}>Povo do Mar / Sereia (Gera Notificação de Inconsistência)</option>
            <option value="cacador" ${c.creatureType === "cacador" ? "selected" : ""}>Caçador Mítico (Gera Notificação de Inconsistência)</option>
          </select>
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
    const name = document.getElementById("cf_name").value.trim() || "Membro sem Nome";
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
    const creatureType = document.getElementById("cf_creatureType").value;
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
      birthYear,
      deathYear,
      isAlive,
      fatherId,
      motherId,
      birthHouseId,
      officialHouseId,
      livedInTerritoryId,
      creatureType,
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
      creatureType: "humano",
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
        creatureType: "humano",
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
      <button class="btn btn-gold" onclick="app.confirmMarriageFromModal()">
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
  // SUCESSÃO REAL & CASAS DINÁSTICAS
  // --------------------------------------------------------------------------
  renderHousesAndSuccessionTab() {
    const kingSelect = document.getElementById("successionKingSelect");
    const yearSpan = document.getElementById("succCurrentYearSpan");
    if (!kingSelect) return;

    if (yearSpan) yearSpan.textContent = this.engine.data.meta.currentYear;

    const rulers = this.engine.data.characters.filter(
      c => !c.isPlaceholderEmpty && ["rei", "principe", "lorde"].includes(c.socialRank)
    );

    const prevSelected = kingSelect.value;
    kingSelect.innerHTML = rulers
      .map(
        r =>
          `<option value="${r.id}">${this.escapeHtml(r.name)} (${r.socialRank.toUpperCase()} &bull; ${
            r.isAlive ? "Vivo" : "Falecido em " + r.deathYear
          })</option>`
      )
      .join("");

    if (prevSelected && rulers.some(r => r.id === prevSelected)) {
      kingSelect.value = prevSelected;
    }

    this.renderSuccessionAnalysis();
    this.renderHousesList();
    this.renderHouseEventsList();
  }

  renderSuccessionAnalysis() {
    const kingId = document.getElementById("successionKingSelect")?.value;
    const simYear = Number(document.getElementById("successionSimYear")?.value) || this.engine.data.meta.currentYear;
    const box = document.getElementById("successionResultBox");
    if (!box || !kingId) return;

    const res = this.engine.analyzeSuccessionForKing(kingId, simYear);
    if (!res) {
      box.innerHTML = `<p>Selecione um soberano.</p>`;
      return;
    }

    box.innerHTML = `
      <div class="alert-banner alert-info" style="margin-bottom:14px;">
        <h4 style="margin-bottom:6px; color:var(--gold-leaf);">Ordem Canônica de Sucessão (Ano Base: ${res.currentYear})</h4>
        <p style="font-size:0.92rem;">${this.escapeHtml(res.explanation)}</p>
      </div>

      <div class="form-row" style="margin-bottom:14px;">
        <div class="card-box" style="padding:12px;">
          <div style="font-family:var(--font-display); font-size:0.7rem; color:var(--gold-muted); text-transform:uppercase;">Soberano no Trono / Regente:</div>
          <div style="font-family:var(--font-display); font-size:1.02rem; font-weight:700; color:var(--gold-leaf); margin-top:4px;">
            ${res.ruler ? this.escapeHtml(res.ruler.name) : "Assento Vago"}
          </div>
          ${
            res.regent
              ? `<span class="badge-pill badge-avuncular">Rainha Regente (${res.yearsUntilMajority} anos para maioridade do herdeiro)</span>`
              : ""
          }
        </div>

        <div class="card-box" style="padding:12px;">
          <div style="font-family:var(--font-display); font-size:0.7rem; color:var(--gold-muted); text-transform:uppercase;">Herdeiro Imediato:</div>
          <div style="font-family:var(--font-display); font-size:1.02rem; font-weight:700; color:#7899c4; margin-top:4px;">
            ${res.heir ? `${this.escapeHtml(res.heir.name)} (${res.currentYear - (res.heir.birthYear || res.currentYear)} anos)` : "Sem herdeiro imediato"}
          </div>
        </div>
      </div>

      <div style="font-size:0.88rem; line-height:1.65; background:#140f0b; border:1px solid var(--border-brass); padding:12px; border-radius:3px; margin-bottom:12px;">
        <div><strong>1. Irmãos Vivos do Rei (Prioridade Fraterna):</strong> ${
          res.brothers.length > 0 ? res.brothers.map(b => this.escapeHtml(b.name)).join(", ") : "Nenhum irmão vivo"
        }</div>
        <div><strong>2. Príncipes Legítimos (Maioridade de 18 anos):</strong> ${
          res.sons.length > 0
            ? res.sons.map(s => `${this.escapeHtml(s.name)} (${res.currentYear - (s.birthYear || res.currentYear)} anos)`).join(", ")
            : "Nenhum filho homem legítimo"
        }</div>
        <div><strong>3. Princesas Legítimas (Herdam na ausência de varões):</strong> ${
          res.daughters.length > 0 ? res.daughters.map(d => this.escapeHtml(d.name)).join(", ") : "Nenhuma filha mulher"
        }</div>
        <div><strong>4. Bastardos Excluídos da Sucessão:</strong> ${
          res.excludedBastards.length > 0
            ? res.excludedBastards.map(b => `${this.escapeHtml(b.name)} (Desprovido de herança)`).join(", ")
            : "Nenhum"
        }</div>
      </div>

      <button class="btn btn-primary" onclick="app.triggerOfficialSuccession('${kingId}', ${simYear})">
        Decretar Sucessão do Trono de ${this.escapeHtml(res.king.name)}
      </button>
    `;
  }

  triggerOfficialSuccession(kingId, year) {
    const out = this.engine.applyKingSuccession(kingId, year);
    if (out.success) {
      this.syncHeaderAndBadges();
      this.renderHousesAndSuccessionTab();
      this.renderTree();
    }
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
        <button class="btn btn-gold" onclick="app.saveHouseEventFromModal()">Averbar Marco</button>
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

        return `
          <div class="creation-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="creation-cat-tag">${this.escapeHtml(item.category)} &bull; ${this.escapeHtml(item.powerLevel || "Arcano")}</span>
              <div style="display:flex; gap:4px;">
                <button class="btn btn-sm btn-medieval" onclick="app.openCreationModal('${item.id}')">Editar</button>
                <button class="btn btn-sm btn-danger" onclick="app.deleteCreation('${item.id}')">&times;</button>
              </div>
            </div>
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
    const newCat = prompt("Digite o nome da nova categoria (ex: Runas, Venenos, Relíquias, Leis):");
    if (newCat && newCat.trim()) {
      const clean = newCat.trim();
      if (!this.engine.data.creationCategories.includes(clean)) {
        this.engine.data.creationCategories.push(clean);
        this.engine.saveToStorage();
      }
      this.activeGrimoireCategory = clean;
      this.renderGrimoire();
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
    const powerLevel = document.getElementById("crf_power").value.trim();
    const originTerritoryId = document.getElementById("crf_territory").value || null;
    const ingredientsOrCost = document.getElementById("crf_cost").value.trim();
    const effect = document.getElementById("crf_effect").value.trim();
    const lore = document.getElementById("crf_lore").value.trim();

    if (editId) {
      const existing = this.engine.data.creations.find(x => x.id === editId);
      if (existing) {
        Object.assign(existing, { name, category, powerLevel, originTerritoryId, ingredientsOrCost, effect, lore });
      }
    } else {
      this.engine.data.creations.push({
        id: "cre_" + Date.now(),
        name,
        category,
        powerLevel,
        originTerritoryId,
        relatedCharacterIds: [],
        ingredientsOrCost,
        effect,
        lore
      });
    }

    this.engine.saveToStorage();
    this.closeModal();
    this.syncHeaderAndBadges();
    this.renderGrimoire();
  }

  deleteCreation(id) {
    this.engine.data.creations = this.engine.data.creations.filter(x => x.id !== id);
    this.engine.saveToStorage();
    this.syncHeaderAndBadges();
    this.renderGrimoire();
  }

  // --------------------------------------------------------------------------
  // CARTOGRAFIA DO REINO (MAPA ANTIGO)
  // --------------------------------------------------------------------------
  setMapTool(tool) {
    this.mapTool = tool;
    ["Select", "AddCity", "Land", "River", "Road", "Mountain"].forEach(suffix => {
      const btn = document.getElementById("mapTool" + suffix);
      if (btn) btn.classList.remove("btn-gold");
    });
    const mapIds = {
      select: "mapToolSelect",
      add_city: "mapToolAddCity",
      draw_land: "mapToolLand",
      draw_river: "mapToolRiver",
      draw_road: "mapToolRoad",
      draw_mountain: "mapToolMountain"
    };
    const activeBtn = document.getElementById(mapIds[tool]);
    if (activeBtn) activeBtn.classList.add("btn-gold");
  }

  initMapCanvasEvents() {
    const canvas = document.getElementById("fantasyMapCanvas");
    if (!canvas) return;

    const getCoords = e => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: Math.round((e.clientX - rect.left) * scaleX),
        y: Math.round((e.clientY - rect.top) * scaleY)
      };
    };

    canvas.addEventListener("mousedown", e => {
      const pt = getCoords(e);

      if (this.mapTool === "add_city") {
        this.openTerritoryModal(null, pt.x, pt.y);
        this.setMapTool("select");
        return;
      }

      if (this.mapTool.startsWith("draw_")) {
        this.isDrawingMap = true;
        this.engine.data.mapStrokes = this.engine.data.mapStrokes || [];
        this.engine.data.mapStrokes.push({
          type: this.mapTool,
          points: [pt]
        });
        this.drawMapCanvas();
      }
    });

    canvas.addEventListener("mousemove", e => {
      if (this.draggingPinId) {
        const pt = getCoords(e);
        const terr = this.engine.getTerritory(this.draggingPinId);
        if (terr) {
          terr.x = Math.max(20, Math.min(canvas.width - 20, pt.x));
          terr.y = Math.max(20, Math.min(canvas.height - 20, pt.y));
          this.renderMapStudio();
        }
        return;
      }
      if (!this.isDrawingMap) return;
      const pt = getCoords(e);
      const strokes = this.engine.data.mapStrokes;
      if (strokes && strokes.length > 0) {
        strokes[strokes.length - 1].points.push(pt);
        this.drawMapCanvas();
      }
    });

    window.addEventListener("mouseup", () => {
      if (this.draggingPinId) {
        this.draggingPinId = null;
        this.engine.saveToStorage();
      }
      if (this.isDrawingMap) {
        this.isDrawingMap = false;
        this.engine.saveToStorage();
      }
    });
  }

  undoLastMapStroke() {
    if (this.engine.data.mapStrokes && this.engine.data.mapStrokes.length > 0) {
      this.engine.data.mapStrokes.pop();
      this.engine.saveToStorage();
      this.drawMapCanvas();
    }
  }

  clearMapStrokes() {
    this.engine.data.mapStrokes = [];
    this.engine.saveToStorage();
    this.drawMapCanvas();
  }

  drawMapCanvas() {
    const canvas = document.getElementById("fantasyMapCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Fundo de Pergaminho Náutico Envelhecido
    const grad = ctx.createRadialGradient(480, 280, 60, 480, 280, 560);
    grad.addColorStop(0, "#231c15");
    grad.addColorStop(0.7, "#17120e");
    grad.addColorStop(1, "#0f0b08");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Linhas de Rumo Cartográficas Sutis
    ctx.strokeStyle = "rgba(197, 160, 89, 0.07)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Continente em Pergaminho
    ctx.save();
    ctx.fillStyle = "#2e241b";
    ctx.strokeStyle = "#8c6f3d";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(140, 110);
    ctx.quadraticCurveTo(260, 60, 420, 95);
    ctx.quadraticCurveTo(610, 70, 770, 150);
    ctx.quadraticCurveTo(850, 260, 780, 390);
    ctx.quadraticCurveTo(660, 480, 490, 465);
    ctx.quadraticCurveTo(310, 500, 190, 430);
    ctx.quadraticCurveTo(100, 300, 140, 110);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hidrografia / Rio
    ctx.strokeStyle = "#3f5a7e";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(250, 140);
    ctx.quadraticCurveTo(380, 250, 430, 270);
    ctx.quadraticCurveTo(510, 330, 580, 460);
    ctx.stroke();
    ctx.restore();

    // Traços Livres do Cartógrafo
    (this.engine.data.mapStrokes || []).forEach(s => {
      if (!s.points || s.points.length < 2) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y);
      }

      if (s.type === "draw_land") {
        ctx.strokeStyle = "#a38248";
        ctx.lineWidth = 16;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      } else if (s.type === "draw_river") {
        ctx.strokeStyle = "#3f5a7e";
        ctx.lineWidth = 4.5;
        ctx.lineCap = "round";
      } else if (s.type === "draw_road") {
        ctx.strokeStyle = "#b3a58e";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
      } else if (s.type === "draw_mountain") {
        ctx.strokeStyle = "#7a6a54";
        ctx.lineWidth = 7;
        ctx.setLineDash([3, 7]);
      }
      ctx.stroke();
      ctx.restore();
    });

    // Rosa dos Ventos Nobiliárquica
    ctx.fillStyle = "rgba(223, 186, 115, 0.75)";
    ctx.font = "600 12px Cinzel, serif";
    ctx.fillText("SEPTENTRIO (N)", canvas.width - 130, 32);
  }

  renderMapStudio() {
    this.drawMapCanvas();
    const pinsLayer = document.getElementById("mapPinsLayer");
    if (!pinsLayer) return;

    const canvas = document.getElementById("fantasyMapCanvas");
    pinsLayer.innerHTML = this.engine.data.territories
      .map(t => {
        const leftPct = ((t.x / (canvas ? canvas.width : 960)) * 100).toFixed(2);
        const topPct = ((t.y / (canvas ? canvas.height : 560)) * 100).toFixed(2);
        const isSelected = t.id === this.selectedTerritoryId;

        return `
          <div class="map-city-pin ${isSelected ? "selected" : ""}"
               style="left:${leftPct}%; top:${topPct}%; --pin-color:${t.color || "#8b202e"};"
               onmousedown="app.startPinDrag(event, '${t.id}')"
               onclick="app.selectTerritoryOnMap('${t.id}')">
            <div class="pin-marker"></div>
            <div class="pin-label">${this.escapeHtml(t.name)}</div>
          </div>
        `;
      })
      .join("");

    this.renderSelectedTerritoryPanel();
  }

  startPinDrag(event, terrId) {
    if (this.mapTool === "select") {
      event.stopPropagation();
      this.selectedTerritoryId = terrId;
      this.draggingPinId = terrId;
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
      panel.innerHTML = `<p>Utilize &ldquo;Fundar Feudo / Cidade&rdquo; para lavrar o primeiro assento geográfico.</p>`;
      return;
    }

    const house = this.engine.getHouse(t.houseId);

    const residents = this.engine.data.characters.filter(
      c => !c.isPlaceholderEmpty && c.livedInTerritoryId === t.id
    );

    const passages = t.notablePassages || [];

    const allCharsOpts = this.engine.data.characters
      .filter(c => !c.isPlaceholderEmpty)
      .map(c => `<option value="${c.id}">${this.escapeHtml(c.name)}</option>`)
      .join("");

    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
        <div>
          <span class="creation-cat-tag">${this.escapeHtml(t.type || "Feudo / Província")}</span>
          <h2 style="font-family:var(--font-display); font-size:1rem; margin-top:6px; color:var(--gold-leaf); text-transform:uppercase;">${this.escapeHtml(t.name)}</h2>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-sm btn-medieval" onclick="app.openTerritoryModal('${t.id}')" title="Alterar feudo">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="app.deleteTerritory('${t.id}')" title="Apagar feudo">&times;</button>
        </div>
      </div>

      <p class="sub-desc" style="margin-top:4px;">
        <strong>Casa Soberana / Feudal:</strong> ${house ? this.escapeHtml(house.name) : "Independente"}<br/>
        ${this.escapeHtml(t.description || "")}
      </p>

      <div class="card-box" style="padding:10px; margin-bottom:12px;">
        <h4 style="font-family:var(--font-display); color:var(--gold-leaf); font-size:0.8rem; text-transform:uppercase; margin-bottom:8px;">
          Habitantes deste Assento (${residents.length})
        </h4>
        ${
          residents.length > 0
            ? `<div style="display:flex; flex-direction:column; gap:5px;">
                ${residents
                  .map(
                    r => `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#140f0b; padding:5px 8px; border-radius:2px; border:1px solid var(--border-brass); font-size:0.86rem;">
                      <span><strong>${this.escapeHtml(r.name)}</strong> (*${r.birthYear || "?"} &bull; ${r.isAlive ? "Vivo" : "†" + r.deathYear})</span>
                      <button class="btn btn-sm btn-medieval" onclick="app.openProfileModal('${r.id}')">Perfil</button>
                    </div>
                  `
                  )
                  .join("")}
              </div>`
            : `<p style="font-size:0.84rem; color:var(--ink-dim); font-style:italic;">Nenhum membro registrado como morador fixo.</p>`
        }
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

    t.notablePassages = t.notablePassages || [];
    t.notablePassages.push({
      id: "pass_" + Date.now(),
      characterId,
      year,
      isHistorical,
      description
    });

    this.engine.saveToStorage();
    this.renderSelectedTerritoryPanel();
  }

  openTerritoryModal(editId = null, defaultX = 480, defaultY = 280) {
    const t = editId
      ? this.engine.getTerritory(editId)
      : {
          name: "",
          type: "Feudo / Província",
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
          <label>Nome do Feudo / Cidade:</label>
          <input type="text" id="tf_name" value="${this.escapeHtml(t.name)}" placeholder="Ex: Cidadela de Valória" />
        </div>
        <div class="form-group">
          <label>Natureza do Assento:</label>
          <input type="text" id="tf_type" value="${this.escapeHtml(t.type || "")}" placeholder="Ex: Fortaleza, Capital, Província..." />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Casa Feudal Governante:</label>
          <select id="tf_houseId">${houseOpts}</select>
        </div>
        <div class="form-group">
          <label>Cor do Estandarte Cartográfico:</label>
          <input type="color" id="tf_color" value="${t.color || "#294873"}" style="height:38px;" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Coordenada X (0 &bull; 960):</label>
          <input type="number" id="tf_x" value="${t.x}" />
        </div>
        <div class="form-group">
          <label>Coordenada Y (0 &bull; 560):</label>
          <input type="number" id="tf_y" value="${t.y}" />
        </div>
      </div>

      <div class="form-group">
        <label>Descrição Histórica & Geográfica:</label>
        <textarea id="tf_desc" rows="3">${this.escapeHtml(t.description || "")}</textarea>
      </div>
    `;

    this.showModal(
      editId ? `Editar Feudo: ${t.name}` : `Fundar Feudo ou Cidade`,
      bodyHtml,
      `
        <button class="btn btn-medieval" onclick="app.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="app.saveTerritoryFromModal('${editId || ""}')">Salvar Feudo</button>
      `
    );
  }

  saveTerritoryFromModal(editId = "") {
    const name = document.getElementById("tf_name").value.trim() || "Nova Província";
    const type = document.getElementById("tf_type").value.trim();
    const houseId = document.getElementById("tf_houseId").value;
    const color = document.getElementById("tf_color").value;
    const x = Number(document.getElementById("tf_x").value) || 450;
    const y = Number(document.getElementById("tf_y").value) || 260;
    const description = document.getElementById("tf_desc").value.trim();

    const snapshot = this.engine.createSnapshot();

    if (editId) {
      const existing = this.engine.getTerritory(editId);
      const oldName = existing ? existing.name : "";
      if (existing) {
        Object.assign(existing, { name, type, houseId, color, x, y, description });
      }
      this.engine.recordAuditLog(
        "TERRITÓRIO",
        "Alteração de Feudo",
        `Feudo Atualizado: "${oldName}" &rarr; "${name}"`,
        `O feudo "${oldName}" teve suas descrições e limites atualizados.`,
        snapshot
      );
    } else {
      const newTerr = {
        id: "terr_" + Date.now(),
        name,
        type,
        houseId,
        color,
        x,
        y,
        description,
        notablePassages: []
      };
      this.engine.data.territories.push(newTerr);
      this.selectedTerritoryId = newTerr.id;
      this.engine.recordAuditLog(
        "TERRITÓRIO",
        "Fundação de Feudo",
        `Novo Feudo Fundado: ${name}`,
        `A cidade/província "${name}" foi averbada na cartografia do reino.`,
        snapshot
      );
    }

    this.closeModal();
    this.syncHeaderAndBadges();
    this.renderMapStudio();
    this.renderTree();
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
      "Extinção de Feudo",
      `Feudo Revogado: ${t.name}`,
      `O feudo "${t.name}" foi removido da cartografia (restaurável na seção Feudos dos anais).`,
      snapshot
    );

    this.syncHeaderAndBadges();
    this.renderMapStudio();
    this.renderTree();
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

    ["ALL", "LINHAGEM", "CASA", "TERRITORIO"].forEach(k => {
      const btn = document.getElementById("histFilter" + k);
      if (btn) btn.classList.toggle("btn-primary", this.activeHistoryFilter === k);
    });

    const logs = this.engine.data.auditLogs.filter(l => {
      if (this.activeHistoryFilter === "ALL") return true;
      if (this.activeHistoryFilter === "TERRITORIO") {
        return l.category === "TERRITÓRIO" || l.category === "TERRITORIO";
      }
      return l.category === this.activeHistoryFilter;
    });

    if (logs.length === 0) {
      container.innerHTML = `<p style="color:var(--ink-dim); font-style:italic;">Nenhum registro lavrado nesta categoria.</p>`;
      return;
    }

    container.innerHTML = logs
      .map(l => {
        const cleanCat = l.category === "TERRITÓRIO" ? "TERRITORIO" : l.category;
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
      this.populateHouseFilterSelect();
      this.renderTree();
      this.renderHousesAndSuccessionTab();
      this.renderMapStudio();
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
        <h2>Governança do Códice</h2>
        <p class="sub-desc">Restaure o reino ao mundo histórico de demonstração ou inicie um livro de linhagens em branco para lavrar uma nova crônica do zero.</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-gold" onclick="app.resetToDemoWorld()">Restaurar Mundo de Demonstração Completo</button>
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
