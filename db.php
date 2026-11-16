<?php
// ============================================================================
// DB.PHP - Camada de Acesso a Dados do MongoDB Atlas
// ============================================================================

require_once __DIR__ . '/config.php';

class FamilyTreeDB {
    private $manager;
    private $dbName;

    public function __construct() {
        $this->manager = getMongoManager();
        $this->dbName = MONGO_DB_NAME;
    }

    /**
     * Testa o ping no MongoDB Atlas
     */
    public function ping() {
        $cmd = new MongoDB\Driver\Command(['ping' => 1]);
        $cursor = $this->manager->executeCommand('admin', $cmd);
        $res = $cursor->toArray();
        return !empty($res) && isset($res[0]->ok) && $res[0]->ok == 1;
    }

    /**
     * Retorna a estrutura limpa e padrão para novos mundos reais (sem dados fictícios/mockados)
     */
    public static function getDefaultCleanData() {
        return [
            'meta' => [
                'worldTitle' => 'Crônicas & Linhagens',
                'currentYear' => 1000,
                'treeColorMode' => 'linhagem',
                'selectedHouseFilter' => 'all',
                'selectedRaceFilter' => 'all'
            ],
            'races' => [
                'Humano',
                'Elfo',
                'Anão',
                'Orc',
                'Bruxo / Feiticeiro',
                'Sereia / Tritão',
                'Draconiano',
                'Vampiro',
                'Fada / Silfo'
            ],
            'houses' => [],
            'territories' => [],
            'mapStrokes' => [],
            'settlements' => [],
            'houseEvents' => [],
            'timelineMilestones' => [],
            'characters' => [],
            'creations' => [],
            'creationCategories' => [
                'Magia',
                'Poção',
                'Encantamento',
                'Artefato / Relíquia',
                'Maldição',
                'Ritual',
                'Erva / Ingrediente',
                'Criatura Mítica (Bestiário)'
            ],
            'auditLogs' => []
        ];
    }

    /**
     * Carrega o estado completo do mundo do MongoDB
     */
    public function getWorldData() {
        $query = new MongoDB\Driver\Query(['_id' => 'main_world']);
        $cursor = $this->manager->executeQuery("{$this->dbName}.world_state", $query);
        $rows = $cursor->toArray();

        if (empty($rows)) {
            // Se ainda não existir no banco, inicializa com o estado limpo
            $cleanData = self::getDefaultCleanData();
            $this->saveWorldData($cleanData);
            return $cleanData;
        }

        $doc = (array)$rows[0];
        unset($doc['_id']);
        unset($doc['updated_at']);

        // Converter BSON objects recursivamente para arrays associativos
        return json_decode(json_encode($doc), true);
    }

    /**
     * Salva o estado completo do mundo no MongoDB e sincroniza coleções dedicadas
     */
    public function saveWorldData($data) {
        if (!is_array($data)) {
            $data = (array)$data;
        }

        // 1. Gravar documento principal em world_state
        $doc = $data;
        $doc['_id'] = 'main_world';
        $doc['updated_at'] = date('c');

        $bulkMain = new MongoDB\Driver\BulkWrite();
        $bulkMain->update(['_id' => 'main_world'], ['$set' => $doc], ['upsert' => true]);
        $this->manager->executeBulkWrite("{$this->dbName}.world_state", $bulkMain);

        // 2. Sincronizar coleção dedicada 'characters'
        if (isset($data['characters']) && is_array($data['characters'])) {
            $bulkChars = new MongoDB\Driver\BulkWrite();
            $bulkChars->delete([]); // limpa e re-indexa com o estado atual
            foreach ($data['characters'] as $char) {
                if (isset($char['id'])) {
                    $cDoc = (array)$char;
                    $cDoc['_id'] = $char['id'];
                    $bulkChars->insert($cDoc);
                }
            }
            if ($bulkChars->count() > 0) {
                $this->manager->executeBulkWrite("{$this->dbName}.characters", $bulkChars);
            }
        }

        // 3. Sincronizar coleção dedicada 'houses'
        if (isset($data['houses']) && is_array($data['houses'])) {
            $bulkHouses = new MongoDB\Driver\BulkWrite();
            $bulkHouses->delete([]);
            foreach ($data['houses'] as $house) {
                if (isset($house['id'])) {
                    $hDoc = (array)$house;
                    $hDoc['_id'] = $house['id'];
                    $bulkHouses->insert($hDoc);
                }
            }
            if ($bulkHouses->count() > 0) {
                $this->manager->executeBulkWrite("{$this->dbName}.houses", $bulkHouses);
            }
        }

        // 4. Sincronizar coleção dedicada 'territories'
        if (isset($data['territories']) && is_array($data['territories'])) {
            $bulkTerr = new MongoDB\Driver\BulkWrite();
            $bulkTerr->delete([]);
            foreach ($data['territories'] as $terr) {
                if (isset($terr['id'])) {
                    $tDoc = (array)$terr;
                    $tDoc['_id'] = $terr['id'];
                    $bulkTerr->insert($tDoc);
                }
            }
            if ($bulkTerr->count() > 0) {
                $this->manager->executeBulkWrite("{$this->dbName}.territories", $bulkTerr);
            }
        }

        // 5. Sincronizar coleção dedicada 'timeline'
        if (isset($data['timelineMilestones']) && is_array($data['timelineMilestones'])) {
            $bulkTL = new MongoDB\Driver\BulkWrite();
            $bulkTL->delete([]);
            foreach ($data['timelineMilestones'] as $milestone) {
                if (isset($milestone['id'])) {
                    $mDoc = (array)$milestone;
                    $mDoc['_id'] = $milestone['id'];
                    $bulkTL->insert($mDoc);
                }
            }
            if ($bulkTL->count() > 0) {
                $this->manager->executeBulkWrite("{$this->dbName}.timeline", $bulkTL);
            }
        }

        // 6. Sincronizar coleção dedicada 'creations' (grimório)
        if (isset($data['creations']) && is_array($data['creations'])) {
            $bulkCre = new MongoDB\Driver\BulkWrite();
            $bulkCre->delete([]);
            foreach ($data['creations'] as $cre) {
                if (isset($cre['id'])) {
                    $crDoc = (array)$cre;
                    $crDoc['_id'] = $cre['id'];
                    $bulkCre->insert($crDoc);
                }
            }
            if ($bulkCre->count() > 0) {
                $this->manager->executeBulkWrite("{$this->dbName}.creations", $bulkCre);
            }
        }

        return true;
    }

    /**
     * Reseta os dados no MongoDB para um estado em branco (sem nenhum dado mockado)
     */
    public function resetWorldData() {
        $cleanData = self::getDefaultCleanData();
        $this->saveWorldData($cleanData);
        return $cleanData;
    }

    /**
     * Retorna contagens de estatísticas do banco de dados
     */
    public function getStats() {
        $data = $this->getWorldData();
        return [
            'database' => $this->dbName,
            'charactersCount' => isset($data['characters']) ? count($data['characters']) : 0,
            'housesCount' => isset($data['houses']) ? count($data['houses']) : 0,
            'territoriesCount' => isset($data['territories']) ? count($data['territories']) : 0,
            'creationsCount' => isset($data['creations']) ? count($data['creations']) : 0,
            'milestonesCount' => isset($data['timelineMilestones']) ? count($data['timelineMilestones']) : 0,
            'serverTime' => date('c')
        ];
    }
}
