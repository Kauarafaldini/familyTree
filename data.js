// ============================================================================
// DATA.JS - Modelo de Dados Inicial e Estado Padrão do Mundo de Fantasia
// ============================================================================

const DEFAULT_WORLD_DATA = {
  meta: {
    worldTitle: "Crônicas de Ébano & Vinha",
    currentYear: 1248,
    treeColorMode: "linhagem", // "linhagem" (Casa de Sangue/Origem) ou "territorio" (Território/Casa Oficial)
    selectedHouseFilter: "all",
    selectedRaceFilter: "all"
  },

  // Raças / Espécies Registradas no Códice
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

  // Casas / Dinastias
  houses: [
    {
      id: "house_valmont",
      name: "Casa Valmont",
      motto: "Do Sangue Real, a Coroa Eterna",
      color: "#e11d48", // Carmesim Real
      isRoyal: true,
      allowAvuncularMarriage: false,
      seatTerritoryId: "terr_valoria",
      successionLaw: "fraternal_priority", // "fraternal_priority" (Irmãos do rei têm prioridade, depois príncipes >=18) ou "primogeniture"
      description: "A dinastia soberana do Trono de Rubi. Segue as leis estritas de sucessão agnática fraterna e assimilação matrimonial."
    },
    {
      id: "house_ravencrest",
      name: "Casa Ravencrest",
      motto: "Asas sobre os Montes Brancos",
      color: "#0284c7", // Azul Celeste
      isRoyal: false,
      allowAvuncularMarriage: false,
      seatTerritoryId: "terr_ninho_corvo",
      successionLaw: "primogeniture",
      description: "Antiga casa de lordes do Norte. Suas princesas e ladys frequentemente selam alianças com a coroa."
    },
    {
      id: "house_solarius",
      name: "Casa Solárius",
      motto: "O Sangue Puro Jamais se Divide",
      color: "#d97706", // Ouro Solar
      isRoyal: false,
      allowAvuncularMarriage: true, // Casa onde casamentos ocorrem entre tios e sobrinhos!
      seatTerritoryId: "terr_helios",
      successionLaw: "fraternal_priority",
      description: "Dinastia ancestral que preserva sua linhagem exclusivamente através de casamentos entre tios e sobrinhas (ou tias e sobrinhos)."
    },
    {
      id: "house_plebe",
      name: "Sem Casa Nobre (Civis & Guardas)",
      motto: "Povo Livre do Reino",
      color: "#64748b", // Cinza
      isRoyal: false,
      allowAvuncularMarriage: false,
      seatTerritoryId: "terr_vila_ferro",
      successionLaw: "none",
      description: "Cidadãos comuns, guardas reais, artesãos e camponeses. Casamentos civis não alteram casas dinásticas."
    }
  ],

  // Territórios / Cidades / Províncias no Rascunho do Mapa
  territories: [
    {
      id: "terr_valoria",
      name: "Cidadela de Valória (Capital)",
      type: "Capital Real",
      color: "#f43f5e",
      x: 450,
      y: 250,
      houseId: "house_valmont",
      description: "Capital murada onde se ergue o Trono de Rubi. Palco das grandes coroações e cercos históricos.",
      notablePassages: [
        {
          id: "pass_1",
          characterId: "char_elena",
          year: 1225,
          isHistorical: true,
          description: "Chegou em cortejo real vinda do Norte para se casar com o Rei Aldric, unificando os tratados comerciais."
        },
        {
          id: "pass_2",
          characterId: "char_jonas_bastardo",
          year: 1242,
          isHistorical: false,
          description: "Entrou disfarçado pelos portões inferiores durante o Festival das Vinhas para conhecer o pai biológico."
        }
      ]
    },
    {
      id: "terr_ninho_corvo",
      name: "Forte Ninho do Corvo",
      type: "Província do Norte",
      color: "#38bdf8",
      x: 190,
      y: 135,
      houseId: "house_ravencrest",
      description: "Fortaleza erguida sobre penhascos gelados. Terra natal da Rainha Elena antes de seu casamento.",
      notablePassages: [
        {
          id: "pass_3",
          characterId: "char_aldric",
          year: 1224,
          isHistorical: true,
          description: "Assinou o Pacto das Neves e pediu a mão da princesa Elena Ravencrest."
        }
      ]
    },
    {
      id: "terr_helios",
      name: "Província de Hélios Dourado",
      type: "Província Solar",
      color: "#fbbf24",
      x: 750,
      y: 165,
      houseId: "house_solarius",
      description: "Território cercado por vinhedos dourados onde a Casa Solárius mantém seus costumes consanguíneos.",
      notablePassages: [
        {
          id: "pass_4",
          characterId: "char_cael_solarius",
          year: 1238,
          isHistorical: true,
          description: "Celebrou o casamento tradicional no Templo do Sol com sua sobrinha Lyra Solárius."
        }
      ]
    },
    {
      id: "terr_vila_ferro",
      name: "Vila do Vale de Ferro",
      type: "Vila / Fronteira",
      color: "#94a3b8",
      x: 230,
      y: 425,
      houseId: "house_plebe",
      description: "Vila de ferreiros, fazendeiros e guarnições de guardas da fronteira sul.",
      notablePassages: []
    },
    {
      id: "terr_ bosque_cinzas",
      name: "Ruínas de Âmbar",
      type: "Território Histórico",
      color: "#a855f7",
      x: 680,
      y: 425,
      houseId: "house_valmont",
      description: "Antigo campo de batalha onde o Rei Aldric tombou em 1246.",
      notablePassages: [
        {
          id: "pass_5",
          characterId: "char_aldric",
          year: 1246,
          isHistorical: true,
          description: "Batalha final do Rei Aldric I, que mudou a linha de sucessão do reino."
        },
        {
          id: "pass_6",
          characterId: "char_daemon",
          year: 1246,
          isHistorical: true,
          description: "Liderou a retirada estratégica e reivindicou a coroa pela Lei de Prioridade Fraterna."
        }
      ]
    }
  ],

  // Traços desenhados no rascunho do mapa (polígonos/caminhos para o mapa já vir bonito!)
  mapStrokes: [],

  // Assentamentos Cartográficos (Cidades e Capitais)
  settlements: [
    {
      id: "settle_valoria",
      type: "capital",
      name: "Cidadela de Valória",
      x: 450,
      y: 250,
      territoryId: "terr_valoria",
      houseId: "house_valmont"
    }
  ],

  // Eventos Históricos das Casas (usados para alimentar casamentos e irmãos retroativos!)
  houseEvents: [
    { id: "ev_1", houseId: "house_valmont", year: 1195, title: "Grande Colheita Carmesim", description: "Prosperidade nos domínios reais sob o reinado de Theron Valmont." },
    { id: "ev_2", houseId: "house_valmont", year: 1215, title: "Guerra das Três Pontes", description: "A Casa Valmont defendeu as fronteiras do sul contra invasores mercenários." },
    { id: "ev_3", houseId: "house_valmont", year: 1225, title: "Casamento Real de Aldric e Elena", description: "União entre a Casa Valmont e a Casa Ravencrest na Cidadela de Valória." },
    { id: "ev_4", houseId: "house_valmont", year: 1234, title: "Torneio do Solstício de Rubi", description: "Celebração pelo nascimento dos príncipes gêmeos na capital." },
    { id: "ev_5", houseId: "house_valmont", year: 1246, title: "Batalha das Ruínas de Âmbar", description: "Queda do Rei Aldric I e transição da coroa na família real." },
    { id: "ev_6", houseId: "house_ravencrest", year: 1210, title: "Inverno das Asas Brancas", description: "A princesa Elena liderou os suprimentos do Forte Ninho do Corvo." },
    { id: "ev_7", houseId: "house_solarius", year: 1238, title: "Conclave do Sangue Solar", description: "Renovação do pacto de casamento avuncular entre tio e sobrinha." }
  ],

  // Cronologia & Linha do Tempo da História do Mundo (Anos, Meses, Dias e Acontecimentos)
  timelineMilestones: [
    {
      id: "tl_1",
      title: "Nascimento de Theron Valmont",
      category: "birth",
      year: 1170,
      month: 3,
      day: 12,
      importance: "epic",
      characterId: "char_theron",
      houseId: "house_valmont",
      territoryId: "terr_valoria",
      description: "Sob a constelação da Serpente Carmesim, nasce Theron Valmont, futuro Rei e patriarca que unificou as linhagens sob o Trono de Rubi.",
      imageUrl: ""
    },
    {
      id: "tl_2",
      title: "Grande Colheita Carmesim",
      category: "foundation",
      year: 1195,
      month: 8,
      day: 20,
      importance: "major",
      characterId: "char_theron",
      houseId: "house_valmont",
      territoryId: "terr_valoria",
      description: "Período de imensa abundância nos domínios reais de Valória, inaugurando celeiros subterrâneos e os primeiros feudos formais da coroa.",
      imageUrl: ""
    },
    {
      id: "tl_3",
      title: "Inverno das Asas Brancas",
      category: "chronicle",
      year: 1210,
      month: 11,
      day: 5,
      importance: "major",
      characterId: "char_elena",
      houseId: "house_ravencrest",
      territoryId: "terr_ravencrest",
      description: "Nevasca implacável isolou as fortalezas do norte. A jovem princesa Elena Ravencrest organizou caravanas de suprimento e salvou centenas de aldeões.",
      imageUrl: ""
    },
    {
      id: "tl_4",
      title: "Início da Guerra das Três Pontes",
      category: "war",
      year: 1215,
      month: 4,
      day: 14,
      importance: "epic",
      characterId: "char_theron",
      houseId: "house_valmont",
      territoryId: "terr_valoria",
      description: "Invasores das terras desoladas avançam sobre os passos fluviais. A coroa mobilizou todas as legiões de cavaleiros para uma guerra de resistência de cinco anos.",
      imageUrl: ""
    },
    {
      id: "tl_5",
      title: "Fim da Guerra e Morte do Patriarca Theron",
      category: "death",
      year: 1220,
      month: 6,
      day: 2,
      importance: "epic",
      characterId: "char_theron",
      houseId: "house_valmont",
      territoryId: "terr_valoria",
      description: "Com a vitória assegurada na terceira ponte, o Rei Theron falece pacificamente no acampamento real aos 50 anos de idade, deixando o trono a seus herdeiros.",
      imageUrl: ""
    },
    {
      id: "tl_6",
      title: "Casamento Real de Aldric e Elena",
      category: "marriage",
      year: 1225,
      month: 5,
      day: 18,
      importance: "major",
      characterId: "char_aldric",
      houseId: "house_valmont",
      territoryId: "terr_valoria",
      description: "União dinástica e selamento do Tratado de Aliança Perpétua entre a Casa Valmont e a Casa Ravencrest na Cidadela de Valória.",
      imageUrl: ""
    },
    {
      id: "tl_7",
      title: "Nascimento dos Príncipes Herdeiros & Torneio do Solstício",
      category: "birth",
      year: 1234,
      month: 6,
      day: 21,
      importance: "major",
      characterId: "char_edward",
      houseId: "house_valmont",
      territoryId: "terr_valoria",
      description: "Nascimento festejado na corte com o Grande Torneio do Solstício de Rubi, recebendo embaixadores de todos os continentes conhecidos.",
      imageUrl: ""
    },
    {
      id: "tl_8",
      title: "Batalha das Ruínas de Âmbar & Morte do Rei Aldric I",
      category: "war",
      year: 1246,
      month: 9,
      day: 9,
      importance: "epic",
      characterId: "char_aldric",
      houseId: "house_valmont",
      territoryId: "terr_valoria",
      description: "Feroz confronto fronteiriço nas ruínas arcanas. O Rei Aldric tomba heroicamente na linha de frente, precipitando a atual crise e debates sobre a sucessão do Trono.",
      imageUrl: ""
    }
  ],

  // Personagens da Árvore Genealógica
  characters: [
    // GERAÇÃO 1 - CASA VALMONT (Patriarca e Matriarca)
    {
      id: "char_theron",
      name: "Theron Valmont",
      gender: "M",
      birthYear: 1170,
      deathYear: 1220,
      isAlive: false,
      socialRank: "rei", // rei, principe, lorde, guarda, civil, prostituta, fazendeira
      race: "Humano",
      creatureType: "humano", // humano (padrão) ou mítico (com justificativa de inconsistência)
      birthHouseId: "house_valmont",
      officialHouseId: "house_valmont",
      livedInTerritoryId: "terr_valoria",
      fatherId: null,
      motherId: null,
      spouseIds: ["char_lyanna"],
      marriageDetails: {
        "char_lyanna": { year: 1192, isNobleAssimilation: true, exceptions: [], isAvuncular: false }
      },
      twinOfId: null,
      isBastard: false,
      bastardLegitimizedByAuthor: false,
      bastardAuthorNote: "",
      isPlaceholderEmpty: false, // Caso excluído mantendo descendentes ("campo vazio")
      royalBranchStatus: "Ramo Real Ancestral",
      appearance: "Alto, cabelos grisalhos na juventude e barba trançada com fios de rubi. Olhos cor de âmbar.",
      deathCause: "Febre de inverno em seus aposentos reais na Cidadela de Valória.",
      preMarriageHistory: "Criado como príncipe herdeiro em Valória, treinou esgrima desde os sete anos.",
      postMarriageHistory: "Governou por três décadas ao lado da Rainha Lyanna, consolidando as fronteiras.",
      customTrajectoryEvents: [
        "1192: Casou-se com Lyanna e assumiu o Trono de Rubi.",
        "1195: Grande Colheita Carmesim.",
        "1215: Comandou a defesa na Guerra das Três Pontes."
      ],
      excludedMarriageExceptions: [],
      linkedToExcludedLineage: null,
      inconsistencyJustifications: []
    },
    {
      id: "char_lyanna",
      name: "Lyanna Valmont",
      gender: "F",
      birthYear: 1174,
      deathYear: 1222,
      isAlive: false,
      socialRank: "rei",
      race: "Humano",
      creatureType: "humano",
      birthHouseId: "house_valmont",
      officialHouseId: "house_valmont",
      livedInTerritoryId: "terr_valoria",
      fatherId: null,
      motherId: null,
      spouseIds: ["char_theron"],
      marriageDetails: {
        "char_theron": { year: 1192, isNobleAssimilation: true, exceptions: [], isAvuncular: false }
      },
      twinOfId: null,
      isBastard: false,
      bastardLegitimizedByAuthor: false,
      bastardAuthorNote: "",
      isPlaceholderEmpty: false,
      royalBranchStatus: "Ramo Real Ancestral",
      appearance: "Cabelos negros longos, porte majestoso e olhar sereno.",
      deathCause: "Faleceu pacificamente dois anos após o marido.",
      preMarriageHistory: "Nobre prima distante dentro da corte de Valória.",
      postMarriageHistory: "Unida à trajetória oficial do Rei Theron desde 1192.",
      customTrajectoryEvents: [
        "1192: Coroada Rainha Consorte na Cidadela de Valória."
      ],
      excludedMarriageExceptions: [],
      linkedToExcludedLineage: null,
      inconsistencyJustifications: []
    },

    // GERAÇÃO 2 - CASA VALMONT (Rei Aldric, Irmão Príncipe/Rei Daemon, Esposa Elena da Casa Y, Amante Civil)
    {
      id: "char_aldric",
      name: "Aldric Valmont",
      gender: "M",
      birthYear: 1196,
      deathYear: 1246,
      isAlive: false,
      socialRank: "rei",
      race: "Humano",
      creatureType: "humano",
      birthHouseId: "house_valmont",
      officialHouseId: "house_valmont",
      livedInTerritoryId: "terr_valoria",
      fatherId: "char_theron",
      motherId: "char_lyanna",
      spouseIds: ["char_elena"],
      marriageDetails: {
        "char_elena": { year: 1225, isNobleAssimilation: true, exceptions: [], isAvuncular: false }
      },
      twinOfId: null,
      isBastard: false,
      bastardLegitimizedByAuthor: false,
      bastardAuthorNote: "",
      isPlaceholderEmpty: false,
      royalBranchStatus: "Antigo Rei (Falecido em 1246)",
      appearance: "Ombros largos, cicatriz no supercílio esquerdo, olhos cor de brasa.",
      deathCause: "Morto em combate na Batalha das Ruínas de Âmbar (1246).",
      preMarriageHistory: "Primogênito de Theron e Lyanna. Cavaleiro prodígio na Guerra das Três Pontes.",
      postMarriageHistory: "Casou-se com a Princesa Elena (da Casa Ravencrest) em 1225. Seu reinado durou até sua queda em 1246.",
      customTrajectoryEvents: [
        "1220: Coroado Rei após a morte de Theron.",
        "1225: Casamento Real de Aldric e Elena.",
        "1234: Torneio do Solstício de Rubi.",
        "1246: Batalha das Ruínas de Âmbar."
      ],
      excludedMarriageExceptions: [],
      linkedToExcludedLineage: null,
      inconsistencyJustifications: []
    },
    {
      id: "char_elena",
      name: "Elena Ravencrest",
      gender: "F",
      birthYear: 1202,
      deathYear: null,
      isAlive: true,
      socialRank: "principe", // Princesa de nascimento que virou Rainha pelo casamento
      race: "Humano",
      creatureType: "humano",
      birthHouseId: "house_ravencrest", // Casa X (Origem)
      officialHouseId: "house_valmont", // Casa A (Oficializada pelo casamento em 1225!)
      livedInTerritoryId: "terr_valoria", // Mudou-se para Valória após casar
      fatherId: null,
      motherId: null,
      spouseIds: ["char_aldric"],
      marriageDetails: {
        "char_aldric": {
          year: 1225,
          isNobleAssimilation: true,
          exceptions: ["Não participou diretamente da campanha militar nas Ruínas de Âmbar (permaneceu governando a capital)."],
          isAvuncular: false
        }
      },
      twinOfId: null,
      isBastard: false,
      bastardLegitimizedByAuthor: false,
      bastardAuthorNote: "",
      isPlaceholderEmpty: false,
      royalBranchStatus: "Familiar da Família Real (Viúva do Antigo Rei)",
      appearance: "Cabelos prateados como a neve do norte, olhos azuis profundos da Casa Ravencrest.",
      deathCause: "Viva",
      preMarriageHistory: "Nascida Princesa da Casa Ravencrest no Forte Ninho do Corvo. Durante o Inverno das Asas Brancas (1210), organizou a defesa e os celeiros do Norte antes de partir para o Sul.",
      postMarriageHistory: "Em 1225, casou-se com o Rei Aldric I e ingressou oficialmente na Casa Valmont. Toda a trajetória real a partir de 1225 uniu-se à sua história (exceto a campanha militar de 1246, marcada como exceção).",
      customTrajectoryEvents: [
        "1225: Casamento Real de Aldric e Elena (Oficializada na Casa Valmont).",
        "1234: Torneio do Solstício de Rubi (Organizadora Real)."
      ],
      excludedMarriageExceptions: ["1246: Batalha das Ruínas de Âmbar (Exceção indicada pela autora: permaneceu na capital)"],
      linkedToExcludedLineage: null,
      inconsistencyJustifications: []
    },
    {
      id: "char_daemon",
      name: "Daemon Valmont",
      gender: "M",
      birthYear: 1199,
      deathYear: null,
      isAlive: true,
      socialRank: "rei", // Irmão do Rei Aldric - prioridade na sucessão!
      race: "Humano",
      creatureType: "humano",
      birthHouseId: "house_valmont",
      officialHouseId: "house_valmont",
      livedInTerritoryId: "terr_valoria",
      fatherId: "char_theron",
      motherId: "char_lyanna",
      spouseIds: ["char_seraphina"],
      marriageDetails: {
        "char_seraphina": { year: 1228, isNobleAssimilation: true, exceptions: [], isAvuncular: false }
      },
      twinOfId: null,
      isBastard: false,
      bastardLegitimizedByAuthor: false,
      bastardAuthorNote: "",
      isPlaceholderEmpty: false,
      royalBranchStatus: "Rei Atual (Assumiu por Prioridade de Irmão do Rei)",
      appearance: "Porte esguio e imponente, manto negro e carmesim, olhar calculista.",
      deathCause: "Vivo",
      preMarriageHistory: "Segundo filho de Theron e irmão mais novo de Aldric I. Comandante da frota real.",
      postMarriageHistory: "Com a morte do irmão Aldric I em 1246, assumiu o trono pela Lei de Prioridade dos Irmãos do Rei. Sua esposa Seraphina e seu filho Baelor tornaram-se a Família Real ativa e novos herdeiros!",
      customTrajectoryEvents: [
        "1228: Casamento com Lady Seraphina.",
        "1246: Assumiu o Trono de Rubi após a morte do irmão Aldric I."
      ],
      excludedMarriageExceptions: [],
      linkedToExcludedLineage: null,
      inconsistencyJustifications: []
    },
    {
      id: "char_seraphina",
      name: "Seraphina Ravencrest",
      gender: "F",
      birthYear: 1205,
      deathYear: null,
      isAlive: true,
      socialRank: "lorde",
      race: "Humano",
      creatureType: "humano",
      birthHouseId: "house_ravencrest",
      officialHouseId: "house_valmont",
      livedInTerritoryId: "terr_valoria",
      fatherId: null,
      motherId: null,
      spouseIds: ["char_daemon"],
      marriageDetails: {
        "char_daemon": { year: 1228, isNobleAssimilation: true, exceptions: [], isAvuncular: false }
      },
      twinOfId: null,
      isBastard: false,
      bastardLegitimizedByAuthor: false,
      bastardAuthorNote: "",
      isPlaceholderEmpty: false,
      royalBranchStatus: "Família Real Ativa (Rainha Consorte de Daemon)",
      appearance: "Cabelos castanho-avermelhados, vestidos bordados a ouro.",
      deathCause: "Viva",
      preMarriageHistory: "Dama nobre de um ramo menor da Casa Ravencrest.",
      postMarriageHistory: "Unida à Casa Valmont em 1228. Em 1246, com a ascensão do marido Daemon, passou a integrar a Família Real soberana.",
      customTrajectoryEvents: [
        "1228: Ingressou na Casa Valmont pelo casamento com Daemon.",
        "1246: Tornou-se Rainha Consorte quando o marido assumiu o trono."
      ],
      excludedMarriageExceptions: [],
      linkedToExcludedLineage: null,
      inconsistencyJustifications: []
    },
    {
      id: "char_mira_camponesa",
      name: "Mira do Vale",
      gender: "F",
      birthYear: 1204,
      deathYear: null,
      isAlive: true,
      socialRank: "fazendeira", // Mulher fora dos padrões nobres -> gera filho bastardo com o Rei!
      race: "Humano",
      creatureType: "humano",
      birthHouseId: "house_plebe",
      officialHouseId: "house_plebe",
      livedInTerritoryId: "terr_vila_ferro",
      fatherId: null,
      motherId: null,
      spouseIds: ["char_garrett_guarda"],
      marriageDetails: {
        "char_garrett_guarda": { year: 1230, isNobleAssimilation: false, exceptions: [], isAvuncular: false }
      },
      twinOfId: null,
      isBastard: false,
      bastardLegitimizedByAuthor: false,
      bastardAuthorNote: "",
      isPlaceholderEmpty: false,
      royalBranchStatus: "Plebeia (Sem vínculo com a Casa Real)",
      appearance: "Cabelos cor de trigo, mãos calejadas do campo, olhos verdes vivos.",
      deathCause: "Viva",
      preMarriageHistory: "Camponesa da Vila do Vale de Ferro. Teve um envolvimento com o Rei Aldric durante a marcha de 1222.",
      postMarriageHistory: "Casou-se em 1230 com Garrett, um guarda da fronteira (casamento civil: não altera casa nem funde trajetória dinástica).",
      customTrajectoryEvents: [
        "1223: Nascimento de seu filho bastardo Jonas.",
        "1230: Casamento civil com o guarda Garrett na Vila do Vale de Ferro."
      ],
      excludedMarriageExceptions: [],
      linkedToExcludedLineage: null,
      inconsistencyJustifications: []
    },
    {
      id: "char_garrett_guarda",
      name: "Garrett",
      gender: "M",
      birthYear: 1200,
      deathYear: null,
      isAlive: true,
      socialRank: "guarda",
      race: "Humano",
      creatureType: "humano",
      birthHouseId: "house_plebe",
      officialHouseId: "house_plebe",
      livedInTerritoryId: "terr_vila_ferro",
      fatherId: null,
      motherId: null,
      spouseIds: ["char_mira_camponesa"],
      marriageDetails: {
        "char_mira_camponesa": { year: 1230, isNobleAssimilation: false, exceptions: [], isAvuncular: false }
      },
      twinOfId: null,
      isBastard: false,
      bastardLegitimizedByAuthor: false,
      bastardAuthorNote: "",
      isPlaceholderEmpty: false,
      royalBranchStatus: "Guarda Civil",
      appearance: "Armadura de couro batido e cota de malha simples.",
      deathCause: "Vivo",
      preMarriageHistory: "Patrulheiro da Vila do Vale de Ferro.",
      postMarriageHistory: "Casamento entre guarda e civil não possui assimilação dinástica.",
      customTrajectoryEvents: [],
      excludedMarriageExceptions: [],
      linkedToExcludedLineage: null,
      inconsistencyJustifications: []
    },

    // GERAÇÃO 3 - CASA VALMONT (Filhos de Aldric & Elena: Gêmeos + Bastardo de Aldric + Filho Herdeiro de Daemon)
    {
      id: "char_lucian",
      name: "Lucian Valmont",
      gender: "M",
      birthYear: 1234, // Tem 14 anos em 1248 (< 18 anos!)
      deathYear: null,
      isAlive: true,
      socialRank: "principe",
      race: "Humano",
      creatureType: "humano",
      birthHouseId: "house_valmont",
      officialHouseId: "house_valmont",
      livedInTerritoryId: "terr_valoria",
      fatherId: "char_aldric",
      motherId: "char_elena",
      spouseIds: [],
      marriageDetails: {},
      twinOfId: "char_vaella", // Gêmeo da Princesa Vaella!
      isBastard: false,
      bastardLegitimizedByAuthor: false,
      bastardAuthorNote: "",
      isPlaceholderEmpty: false,
      royalBranchStatus: "Familiar da Família Real (Filho do Antigo Rei - 14 anos)",
      appearance: "Jovem de 14 anos, mistura os olhos azuis da mãe Ravencrest com o porte marcial do pai.",
      deathCause: "Vivo",
      preMarriageHistory: "Nascido em 1234 (gêmeo de Vaella). Tinha apenas 12 anos quando o pai Aldric I morreu. Se não houvesse o tio Daemon, sua mãe Elena seria Rainha Regente até ele completar 18 anos (em 1252)!",
      postMarriageHistory: "",
      customTrajectoryEvents: [
        "1234: Nascimento como primogênito gêmeo no Torneio do Solstício de Rubi."
      ],
      excludedMarriageExceptions: [],
      linkedToExcludedLineage: null,
      inconsistencyJustifications: []
    },
    {
      id: "char_vaella",
      name: "Vaella Valmont",
      gender: "F",
      birthYear: 1234,
      deathYear: null,
      isAlive: true,
      socialRank: "principe",
      race: "Humano",
      creatureType: "humano",
      birthHouseId: "house_valmont",
      officialHouseId: "house_valmont",
      livedInTerritoryId: "terr_valoria",
      fatherId: "char_aldric",
      motherId: "char_elena",
      spouseIds: [],
      marriageDetails: {},
      twinOfId: "char_lucian", // Gêmea do Príncipe Lucian!
      isBastard: false,
      bastardLegitimizedByAuthor: false,
      bastardAuthorNote: "",
      isPlaceholderEmpty: false,
      royalBranchStatus: "Familiar da Família Real (Gêmea de Lucian)",
      appearance: "Cabelos prateados como a mãe, olhos cor de brasa como o pai.",
      deathCause: "Viva",
      preMarriageHistory: "Irmã gêmea de Lucian. Só herdaria o trono caso não restasse nenhum sucessor homem (nem tios/irmãos do rei, nem príncipes).",
      postMarriageHistory: "",
      customTrajectoryEvents: [
        "1234: Nascida minutos após seu irmão gêmeo Lucian."
      ],
      excludedMarriageExceptions: [],
      linkedToExcludedLineage: null,
      inconsistencyJustifications: []
    },
    {
      id: "char_jonas_bastardo",
      name: "Jonas Valmont",
      gender: "M",
      birthYear: 1223,
      deathYear: null,
      isAlive: true,
      socialRank: "civil",
      race: "Humano",
      creatureType: "humano",
      birthHouseId: "house_plebe", // Bastardo: não pertence à casa real por padrão!
      officialHouseId: "house_plebe",
      livedInTerritoryId: "terr_vila_ferro",
      fatherId: "char_aldric",
      motherId: "char_mira_camponesa",
      spouseIds: [],
      marriageDetails: {},
      twinOfId: null,
      isBastard: true,
      bastardLegitimizedByAuthor: false, // A autora pode ativar a exceção no perfil!
      bastardAuthorNote: "Filho de Rei Aldric I com a fazendeira Mira. Por regra, não pertence à Casa Valmont nem à sucessão, salvo exceção da autora.",
      isPlaceholderEmpty: false,
      royalBranchStatus: "Bastardo (Fora da Casa e Herança)",
      appearance: "Forte como o pai real, mas veste roupas simples de ferreiro do Vale.",
      deathCause: "Vivo",
      preMarriageHistory: "Nascido em 1223 da união fora do casamento entre Aldric I e a fazendeira Mira. Mesmo sendo mais velho que os príncipes legítimos, sua condição de bastardo o exclui da Casa Valmont e do trono.",
      postMarriageHistory: "",
      customTrajectoryEvents: [
        "1242: Visitou secretamente a Cidadela de Valória."
      ],
      excludedMarriageExceptions: [],
      linkedToExcludedLineage: null,
      inconsistencyJustifications: []
    },
    {
      id: "char_baelor",
      name: "Baelor Valmont",
      gender: "M",
      birthYear: 1229, // 19 anos em 1248 (>= 18 anos!)
      deathYear: null,
      isAlive: true,
      socialRank: "principe",
      race: "Humano",
      creatureType: "humano",
      birthHouseId: "house_valmont",
      officialHouseId: "house_valmont",
      livedInTerritoryId: "terr_valoria",
      fatherId: "char_daemon",
      motherId: "char_seraphina",
      spouseIds: [],
      marriageDetails: {},
      twinOfId: null,
      isBastard: false,
      bastardLegitimizedByAuthor: false,
      bastardAuthorNote: "",
      isPlaceholderEmpty: false,
      royalBranchStatus: "Novo Príncipe Herdeiro (Filho de Daemon)",
      appearance: "Jovem guerreiro de 19 anos, armadura negra ornamentada com rubis.",
      deathCause: "Vivo",
      preMarriageHistory: "Filho de Daemon e Seraphina. Quando seu pai Daemon legitimou o trono do falecido irmão Aldric I em 1246, Baelor tornou-se o novo Príncipe Herdeiro oficial!",
      postMarriageHistory: "",
      customTrajectoryEvents: [
        "1246: Proclamado Novo Príncipe Herdeiro após a ascensão do pai Daemon."
      ],
      excludedMarriageExceptions: [],
      linkedToExcludedLineage: null,
      inconsistencyJustifications: []
    },

    // ========================================================================
    // CASA SOLÁRIUS (Demonstração da Casa com Casamento Exclusivo Tio-Sobrinha)
    // ========================================================================
    {
      id: "char_aurelius_solarius",
      name: "Aurélius Solárius",
      gender: "M",
      birthYear: 1175,
      deathYear: 1230,
      isAlive: false,
      socialRank: "lorde",
      race: "Humano",
      creatureType: "humano",
      birthHouseId: "house_solarius",
      officialHouseId: "house_solarius",
      livedInTerritoryId: "terr_helios",
      fatherId: null,
      motherId: null,
      spouseIds: [],
      marriageDetails: {},
      twinOfId: null,
      isBastard: false,
      bastardLegitimizedByAuthor: false,
      bastardAuthorNote: "",
      isPlaceholderEmpty: false,
      royalBranchStatus: "Patriarca Solar",
      appearance: "Cabelos dourados resplandecentes, túnicas de seda solar.",
      deathCause: "Causas naturais em Hélios Dourado.",
      preMarriageHistory: "Patriarca da Casa Solárius, guardião da tradição avuncular.",
      postMarriageHistory: "",
      customTrajectoryEvents: [],
      excludedMarriageExceptions: [],
      linkedToExcludedLineage: null,
      inconsistencyJustifications: []
    },
    {
      id: "char_cassian_solarius",
      name: "Cassian Solárius",
      gender: "M",
      birthYear: 1198,
      deathYear: 1240,
      isAlive: false,
      socialRank: "lorde",
      race: "Humano",
      creatureType: "humano",
      birthHouseId: "house_solarius",
      officialHouseId: "house_solarius",
      livedInTerritoryId: "terr_helios",
      fatherId: "char_aurelius_solarius",
      motherId: null,
      spouseIds: [],
      marriageDetails: {},
      twinOfId: null,
      isBastard: false,
      bastardLegitimizedByAuthor: false,
      bastardAuthorNote: "",
      isPlaceholderEmpty: false,
      royalBranchStatus: "Primogênito Solar (Pai de Lyra)",
      appearance: "Olhos dourados e feições nobres.",
      deathCause: "Queda de cavalo nos vinhedos de Hélios.",
      preMarriageHistory: "Irmão mais velho de Cael Solárius e pai de Lyra Solárius.",
      postMarriageHistory: "",
      customTrajectoryEvents: [],
      excludedMarriageExceptions: [],
      linkedToExcludedLineage: null,
      inconsistencyJustifications: []
    },
    {
      id: "char_cael_solarius",
      name: "Cael Solárius",
      gender: "M",
      birthYear: 1204,
      deathYear: null,
      isAlive: true,
      socialRank: "lorde",
      race: "Humano",
      creatureType: "humano",
      birthHouseId: "house_solarius",
      officialHouseId: "house_solarius",
      livedInTerritoryId: "terr_helios",
      fatherId: "char_aurelius_solarius",
      motherId: null,
      spouseIds: ["char_lyra_solarius"],
      marriageDetails: {
        "char_lyra_solarius": {
          year: 1238,
          isNobleAssimilation: true,
          exceptions: [],
          isAvuncular: true,
          avuncularNote: "Casamento Tradicional Tio + Sobrinha da Casa Solárius"
        }
      },
      twinOfId: null,
      isBastard: false,
      bastardLegitimizedByAuthor: false,
      bastardAuthorNote: "",
      isPlaceholderEmpty: false,
      royalBranchStatus: "Lorde Regente de Hélios (Casado com a Sobrinha)",
      appearance: "Cabelos louro-acobreados, coroa de louros dourados.",
      deathCause: "Vivo",
      preMarriageHistory: "Filho mais novo de Aurélius e tio paterno de Lyra.",
      postMarriageHistory: "Em 1238, cumprindo o costume sagrado da Casa Solárius, casou-se com sua sobrinha Lyra Solárius (filha de seu irmão Cassian).",
      customTrajectoryEvents: [
        "1238: Conclave do Sangue Solar - Casamento avuncular com a sobrinha Lyra."
      ],
      excludedMarriageExceptions: [],
      linkedToExcludedLineage: null,
      inconsistencyJustifications: []
    },
    {
      id: "char_lyra_solarius",
      name: "Lyra Solárius",
      gender: "F",
      birthYear: 1219,
      deathYear: null,
      isAlive: true,
      socialRank: "lorde",
      race: "Humano",
      creatureType: "humano",
      birthHouseId: "house_solarius",
      officialHouseId: "house_solarius",
      livedInTerritoryId: "terr_helios",
      fatherId: "char_cassian_solarius",
      motherId: null,
      spouseIds: ["char_cael_solarius"],
      marriageDetails: {
        "char_cael_solarius": {
          year: 1238,
          isNobleAssimilation: true,
          exceptions: [],
          isAvuncular: true,
          avuncularNote: "Casamento Tradicional Tio + Sobrinha da Casa Solárius"
        }
      },
      twinOfId: null,
      isBastard: false,
      bastardLegitimizedByAuthor: false,
      bastardAuthorNote: "",
      isPlaceholderEmpty: false,
      royalBranchStatus: "Senhora de Hélios (Casada com o Tio Cael)",
      appearance: "Olhos de ouro líquido, tranças adornadas com fios solares.",
      deathCause: "Viva",
      preMarriageHistory: "Filha única de Cassian Solárius e sobrinha de Cael.",
      postMarriageHistory: "Casou-se em 1238 com seu tio paterno Cael Solárius, mantendo a linhagem fechada da Casa Solárius.",
      customTrajectoryEvents: [
        "1238: Casamento com o tio Cael Solárius."
      ],
      excludedMarriageExceptions: [],
      linkedToExcludedLineage: null,
      inconsistencyJustifications: []
    },
    {
      id: "char_solon_solarius",
      name: "Solon Solárius",
      gender: "M",
      birthYear: 1241,
      deathYear: null,
      isAlive: true,
      socialRank: "lorde",
      race: "Humano",
      creatureType: "humano",
      birthHouseId: "house_solarius",
      officialHouseId: "house_solarius",
      livedInTerritoryId: "terr_helios",
      fatherId: "char_cael_solarius",
      motherId: "char_lyra_solarius",
      spouseIds: [],
      marriageDetails: {},
      twinOfId: null,
      isBastard: false,
      bastardLegitimizedByAuthor: false,
      bastardAuthorNote: "",
      isPlaceholderEmpty: false,
      royalBranchStatus: "Filho de Tio e Sobrinha (Casa Solárius)",
      appearance: "Menino de cabelos dourados extremamente claros.",
      deathCause: "Vivo",
      preMarriageHistory: "Fruto da união avuncular entre o Tio Cael e a Sobrinha Lyra.",
      postMarriageHistory: "",
      customTrajectoryEvents: [],
      excludedMarriageExceptions: [],
      linkedToExcludedLineage: null,
      inconsistencyJustifications: []
    }
  ],

  // Grimório: Magias, Poções, Encantamentos e Tudo que Puder Criar
  creations: [
    {
      id: "cre_1",
      name: "Chama do Sangue Real",
      category: "Magia",
      powerLevel: "Arcano Superior",
      originTerritoryId: "terr_valoria",
      imageUrl: "",
      relatedCharacterIds: ["char_aldric", "char_daemon"],
      ingredientsOrCost: "Três gotas de sangue de linhagem real e cinzas de rubi.",
      effect: "Conjura uma lâmina de fogo carmesim que só se apaga quando o portador embainha a espada.",
      lore: "Antiga magia cerimonial usada pelos reis da Casa Valmont em duelos decisivos."
    },
    {
      id: "cre_2",
      name: "Elixir das Lágrimas de Inverno",
      category: "Poção",
      powerLevel: "Rara",
      originTerritoryId: "terr_ninho_corvo",
      imageUrl: "",
      relatedCharacterIds: ["char_elena"],
      ingredientsOrCost: "Orvalho congelado dos Montes Brancos, pétalas de lírio-da-neve e prata líquida.",
      effect: "Cura febres mortais e preserva a lucidez sob frio extremo por sete noites.",
      lore: "Trazido pela Rainha Elena em seu dote quando partiu do Forte Ninho do Corvo."
    },
    {
      id: "cre_3",
      name: "Selo do Juramento Solar",
      category: "Encantamento",
      powerLevel: "Ancestral",
      originTerritoryId: "terr_helios",
      imageUrl: "",
      relatedCharacterIds: ["char_cael_solarius", "char_lyra_solarius"],
      ingredientsOrCost: "Alianças forjadas em ouro solar sob o eclipse do meio-dia.",
      effect: "Une misticamente a vitalidade de tio e sobrinha nos casamentos da Casa Solárius.",
      lore: "Encantamento gravado nas criptas de Hélios Dourado há cinco gerações."
    },
    {
      id: "cre_4",
      name: "Coroa do Trono de Rubi",
      category: "Artefato / Relíquia",
      powerLevel: "Lendário",
      originTerritoryId: "terr_valoria",
      imageUrl: "",
      relatedCharacterIds: ["char_theron", "char_aldric", "char_daemon"],
      ingredientsOrCost: "Forjada pelos primeiros reis com ferro meteórico e sete rubis imperiais.",
      effect: "Reconhece a autoridade soberana da Casa Valmont.",
      lore: "Passou de Theron para Aldric I e, em 1246, para seu irmão Daemon."
    }
  ],

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

  // Histórico Separado de Alterações (Dividido em: LINHAGEM, CASA, TERRITÓRIO) com snapshots para Reversão!
  auditLogs: [
    {
      id: "log_init_1",
      timestamp: "13/11/2026 19:50",
      category: "LINHAGEM", // "LINHAGEM" | "CASA" | "TERRITÓRIO"
      actionType: "Casamento Real & Assimilação",
      title: "Casamento de Rei Aldric I e Princesa Elena (1225)",
      details: "Elena (nascida Casa Ravencrest) ingressou oficialmente na Casa Valmont. Eventos de 1225 em diante foram unidos à sua história (com 1 exceção marcada em 1246).",
      canRevert: false,
      reverted: false,
      snapshot: null
    },
    {
      id: "log_init_2",
      timestamp: "13/11/2026 19:52",
      category: "CASA",
      actionType: "Sucessão Fraterna do Trono",
      title: "Morte de Aldric I (1246) -> Ascensão do Irmão Daemon",
      details: "Pela prioridade dos irmãos do rei, Daemon assumiu o trono. Sua esposa Seraphina e seu filho Baelor tornaram-se a Família Real ativa e novos herdeiros; a viúva Elena e seus filhos gêmeos passaram a ser familiares da família real.",
      canRevert: false,
      reverted: false,
      snapshot: null
    }
  ]
};
