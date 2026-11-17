// ============================================================================
// DATA.JS - Modelo de Dados Inicial do Mundo & Presets Customizáveis da Autora
// ============================================================================

const STANDARD_PRESETS = {
  socialRanks: [
    { key: "rei", label: "Rei / Rainha Soberana" },
    { key: "principe", label: "Príncipe / Princesa" },
    { key: "lorde", label: "Lorde / Lady (Nobreza)" },
    { key: "guarda", label: "Cavaleiro / Guarda de Honra" },
    { key: "civil", label: "Civil / Cidadão" },
    { key: "fazendeira", label: "Camponês / Fazendeira" },
    { key: "prostituta", label: "Relação Fora do Padrão Nobre" },
    { key: "estuprada", label: "Vítima / Relação Não Consensual" }
  ],
  genders: [
    { key: "M", label: "Masculino" },
    { key: "F", label: "Feminino" }
  ],
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
  powerLevels: [
    "Comum",
    "Incomum",
    "Rara",
    "Arcano Superior",
    "Ancestral",
    "Lendário",
    "Divino"
  ],
  timelineCategories: [
    { key: "war", label: "Guerras & Conflitos", icon: "⚔️", color: "#ef4444" },
    { key: "battle", label: "Batalhas", icon: "🛡️", color: "#f97316" },
    { key: "birth", label: "Nascimentos Ilustres", icon: "🌱", color: "#10b981" },
    { key: "death", label: "Mortes & Martírios", icon: "🪦", color: "#a855f7" },
    { key: "coronation", label: "Coroações & Tronos", icon: "👑", color: "#eab308" },
    { key: "wedding", label: "Matrimônios Reais", icon: "💍", color: "#ec4899" },
    { key: "foundation", label: "Fundações & Tratados", icon: "🏰", color: "#06b6d4" },
    { key: "arcane", label: "Fenômenos Arcanos", icon: "✨", color: "#8b5cf6" },
    { key: "general", label: "Crônica Geral", icon: "📜", color: "#d97706" }
  ],
  timelineImportances: [
    { key: "minor", label: "Menor / Cotidiano" },
    { key: "major", label: "Notável / Capítulo Histórico" },
    { key: "epic", label: "Épico / Transição de Era" }
  ],
  territoryTypes: [
    "Capital Real",
    "Província do Norte",
    "Província Solar",
    "Vila / Fronteira",
    "Território Histórico",
    "Ilha / Arquipélago",
    "Reino Subterrâneo"
  ],
  settlementTypes: [
    { key: "capital", label: "Capital Real" },
    { key: "city", label: "Cidade Nobre" },
    { key: "village", label: "Vila / Aldeia" },
    { key: "fortress", label: "Fortaleza / Castelo" },
    { key: "ruins", label: "Ruínas Arcanas" }
  ],
  successionLaws: [
    { key: "fraternal_priority", label: "Prioridade Fraterna (Irmãos do Rei)" },
    { key: "primogeniture", label: "Primogenitura Clássica (Filho Mais Velho)" },
    { key: "none", label: "Sem Sucessão Nobre" }
  ]
};

const DEFAULT_WORLD_DATA = {
  meta: {
    worldId: "main_world",
    worldTitle: "Crônicas & Linhagens",
    currentYear: 1000,
    treeColorMode: "linhagem", // "linhagem" ou "territorio"
    selectedHouseFilter: "all",
    selectedRaceFilter: "all"
  },

  // Presets customizados adicionados pela autora (categorias que não são padrão)
  customPresets: {
    socialRanks: [],        // [{ key: "guerreira", label: "Guerreira" }, ...]
    genders: [],            // [{ key: "NB", label: "Não-binário" }, ...]
    races: [],              // ["Dríade", ...]
    creationCategories: [], // ["Alquimia Proibida", ...]
    powerLevels: [],        // ["Cósmico", ...]
    timelineCategories: [], // [{ key: "pacto", label: "Pactos & Alianças", icon: "📜", color: "#6366f1" }, ...]
    timelineImportances: [],
    territoryTypes: [],
    settlementTypes: [],
    successionLaws: []
  },

  // Raças / Espécies Registradas no Códice
  races: STANDARD_PRESETS.races.slice(),

  // Casas / Dinastias
  houses: [],

  // Territórios / Cidades / Províncias no Mapa
  territories: [],

  // Traços desenhados no rascunho do mapa
  mapStrokes: [],

  // Assentamentos Cartográficos (Cidades e Capitais)
  settlements: [],

  // Eventos Históricos das Casas
  houseEvents: [],

  // Cronologia & Linha do Tempo da História do Mundo
  timelineMilestones: [],

  // Personagens da Árvore Genealógica
  characters: [],

  // Grimório: Magias, Poções, Encantamentos e Criações
  creations: [],

  // Categorias do Grimório
  creationCategories: STANDARD_PRESETS.creationCategories.slice(),

  // Histórico de Alterações / Auditoria
  auditLogs: []
};
