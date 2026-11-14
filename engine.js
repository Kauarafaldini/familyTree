// ============================================================================
// ENGINE.JS - Motor de Regras Genealógicas, Sucessão, Casamentos, Bastardos,
//             Detecção de Inconsistências e Histórico de Reversão
// ============================================================================

const STORAGE_KEY = "fantasy_family_tree_v1";

class WorldEngine {
  constructor() {
    this.data = this.loadFromStorage();
  }

  // Sanitiza o nome do personagem para exibir somente nome e sobrenome, sem cargos ou títulos
  cleanCharacterName(name) {
    if (!name || typeof name !== "string") return "";
    let clean = name.trim();
    clean = clean.replace(/\(nasc\.?\s*([^)]+)\)/i, "$1");
    clean = clean.replace(/\s*\([^)]*\)/g, "");
    clean = clean.replace(/^(Príncipe\/Rei|Príncipe\s+Herdeiro|Princesa\s+Herdeira|Rei|Rainha|Príncipe|Princesa|Lorde|Lord|Lady|Herdeiro|Herdeira|Cavaleiro|Guarda|Sor|Sir|Dom|Dona)\s+/i, "");
    clean = clean.replace(/\b([A-Za-zÀ-ÿ]+)\s+(I|II|III|IV|V|VI)\b/i, "$1");
    if (clean.toLowerCase() === "lyanna") clean = "Lyanna Valmont";
    if (clean.toLowerCase() === "jonas") clean = "Jonas Valmont";
    return clean.replace(/\s+/g, " ").trim();
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.characters) && Array.isArray(parsed.houses)) {
          let modified = false;

          if (!Array.isArray(parsed.races)) {
            parsed.races = Array.isArray(DEFAULT_WORLD_DATA.races) ? DEFAULT_WORLD_DATA.races.slice() : ["Humano", "Elfo", "Anão", "Orc"];
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
          if (modified) {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            } catch (e) {}
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Erro ao carregar localStorage, usando dados iniciais:", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_WORLD_DATA));
  }

  getRaces() {
    const list = Array.isArray(this.data.races) && this.data.races.length > 0
      ? this.data.races.slice()
      : (Array.isArray(DEFAULT_WORLD_DATA.races) ? DEFAULT_WORLD_DATA.races.slice() : ["Humano", "Elfo", "Anão", "Orc"]);

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

  addRace(raceName) {
    if (!raceName || typeof raceName !== "string") return;
    const name = raceName.trim();
    if (!name) return;
    if (!Array.isArray(this.data.races)) {
      this.data.races = this.getRaces();
    }
    if (!this.data.races.some(r => r.toLowerCase() === name.toLowerCase())) {
      this.data.races.push(name);
      this.saveToStorage();
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error("Erro ao salvar no localStorage:", e);
    }
  }

  resetToDefault() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_WORLD_DATA));
    this.saveToStorage();
  }

  createBlankWorld() {
    this.data = {
      meta: {
        worldTitle: "Meu Mundo de Fantasia",
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
      houses: [
        {
          id: "house_real_1",
          name: "Casa Real Principal",
          motto: "Sangue e Honra",
          color: "#e11d48",
          isRoyal: true,
          allowAvuncularMarriage: false,
          seatTerritoryId: "terr_1",
          successionLaw: "fraternal_priority",
          description: "Casa soberana principal."
        },
        {
          id: "house_plebe",
          name: "Sem Casa Nobre (Civis & Guardas)",
          motto: "Povo Livre",
          color: "#64748b",
          isRoyal: false,
          allowAvuncularMarriage: false,
          seatTerritoryId: "terr_1",
          successionLaw: "none",
          description: "Civis, guardas, fazendeiros e plebeus."
        }
      ],
      territories: [
        {
          id: "terr_1",
          name: "Capital do Reino",
          type: "Capital Real",
          color: "#f43f5e",
          x: 450,
          y: 260,
          houseId: "house_real_1",
          description: "Primeira cidade do seu rascunho de mapa.",
          notablePassages: []
        }
      ],
      mapStrokes: [],
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
    this.saveToStorage();
    return logEntry;
  }

  createSnapshot() {
    return {
      characters: JSON.parse(JSON.stringify(this.data.characters)),
      houses: JSON.parse(JSON.stringify(this.data.houses)),
      territories: JSON.parse(JSON.stringify(this.data.territories)),
      houseEvents: JSON.parse(JSON.stringify(this.data.houseEvents))
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
    this.data.houseEvents = JSON.parse(JSON.stringify(log.snapshot.houseEvents));
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
