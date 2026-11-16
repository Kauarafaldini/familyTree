// ============================================================================
// DATA.JS - Modelo de Dados Inicial do Mundo (Sem Dados Mocados / Dados Reais)
// ============================================================================

const DEFAULT_WORLD_DATA = {
  meta: {
    worldTitle: "Crônicas & Linhagens",
    currentYear: 1000,
    treeColorMode: "linhagem", // "linhagem" (Casa de Sangue/Origem) ou "territorio" (Território/Casa Oficial)
    selectedHouseFilter: "all",
    selectedRaceFilter: "all"
  },

  // Raças / Espécies Registradas no Códice (customizáveis pelo usuário)
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

  // Casas / Dinastias (Sem dados mockados)
  houses: [],

  // Territórios / Cidades / Províncias no Mapa (Sem dados mockados)
  territories: [],

  // Traços desenhados no rascunho do mapa
  mapStrokes: [],

  // Assentamentos Cartográficos (Cidades e Capitais)
  settlements: [],

  // Eventos Históricos das Casas
  houseEvents: [],

  // Cronologia & Linha do Tempo da História do Mundo
  timelineMilestones: [],

  // Personagens da Árvore Genealógica (Sem dados mockados)
  characters: [],

  // Grimório: Magias, Poções, Encantamentos e Criações (Sem dados mockados)
  creations: [],

  // Categorias customizáveis do Grimório
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

  // Histórico de Alterações / Auditoria
  auditLogs: []
};
