<?php
// ============================================================================
// DB.PHP - Camada de Acesso ao MongoDB Atlas (Múltiplas Histórias) - VERSÃO LEVE
// ----------------------------------------------------------------------------
// Otimizações de memória:
//  * Cache quente em disco (/tmp): o "load" faz streaming do arquivo JSON
//    direto para a resposta (readfile), sem carregar o mundo na RAM do PHP.
//  * JSON <-> BSON convertido dentro da extensão C (MongoDB\BSON\Document),
//    sem criar arrays PHP gigantes (que ocupam ~10x o tamanho do JSON).
//  * Removida a duplicação de escrita nas coleções characters/houses
//    (que apagava e reinseria tudo a cada salvamento).
// ============================================================================

require_once __DIR__ . '/config.php';

class FamilyTreeDB {
    private $manager;
    private $dbName;
    private $cacheDir;

    public function __construct() {
        $this->manager = getMongoManager();
        $this->dbName = MONGO_DB_NAME;
        $this->cacheDir = rtrim(sys_get_temp_dir(), '/\\') . DIRECTORY_SEPARATOR . 'familytree_cache';
        if (!is_dir($this->cacheDir)) {
            @mkdir($this->cacheDir, 0775, true);
        }
    }

    // ------------------------------------------------------------------------
    // Utilitários
    // ------------------------------------------------------------------------
    public static function sanitizeId($worldId) {
        $worldId = preg_replace('/[^a-zA-Z0-9_\-]/', '', (string)$worldId);
        return $worldId !== '' ? $worldId : 'main_world';
    }

    public function cachePath($worldId) {
        return $this->cacheDir . DIRECTORY_SEPARATOR . self::sanitizeId($worldId) . '.json';
    }

    private function writeCache($worldId, $json) {
        $path = $this->cachePath($worldId);
        $tmp = $path . '.' . getmypid() . '.tmp';
        if (@file_put_contents($tmp, $json, LOCK_EX) !== false) {
            @rename($tmp, $path); // troca atômica
        }
    }

    public function invalidateCache($worldId) {
        @unlink($this->cachePath($worldId));
    }

    private static function hasBsonDocument() {
        return class_exists('MongoDB\\BSON\\Document');
    }

    public function ping() {
        $cmd = new MongoDB\Driver\Command(['ping' => 1]);
        $res = $this->manager->executeCommand('admin', $cmd)->toArray();
        return !empty($res) && isset($res[0]->ok) && $res[0]->ok == 1;
    }

    public static function getDefaultCleanData($worldId = 'main_world', $title = 'Crônicas & Linhagens', $currentYear = 1000) {
        return [
            'meta' => [
                'worldId' => $worldId,
                'worldTitle' => $title,
                'currentYear' => (int)$currentYear,
                'treeColorMode' => 'linhagem',
                'selectedHouseFilter' => 'all',
                'selectedRaceFilter' => 'all'
            ],
            'customPresets' => [
                'socialRanks' => [], 'genders' => [], 'races' => [],
                'creationCategories' => [], 'powerLevels' => [],
                'timelineCategories' => [], 'timelineImportances' => [],
                'territoryTypes' => [], 'settlementTypes' => [], 'successionLaws' => []
            ],
            'races' => ['Humano', 'Elfo', 'Anão', 'Orc', 'Bruxo / Feiticeiro', 'Sereia / Tritão', 'Draconiano', 'Vampiro', 'Fada / Silfo'],
            'houses' => [],
            'territories' => [],
            'mapStrokes' => [],
            'settlements' => [],
            'houseEvents' => [],
            'timelineMilestones' => [],
            'characters' => [],
            'creations' => [],
            'creationCategories' => ['Magia', 'Poção', 'Encantamento', 'Artefato / Relíquia', 'Maldição', 'Ritual', 'Erva / Ingrediente', 'Criatura Mítica (Bestiário)'],
            'auditLogs' => []
        ];
    }

    // ------------------------------------------------------------------------
    // Índice de mundos (documentos pequenos)
    // ------------------------------------------------------------------------
    public function listWorlds() {
        $query = new MongoDB\Driver\Query([], ['sort' => ['updatedAt' => -1]]);
        $cursor = $this->manager->executeQuery("{$this->dbName}.worlds_index", $query);
        $cursor->setTypeMap(['root' => 'array', 'document' => 'array', 'array' => 'array']);
        $worlds = $cursor->toArray();

        if (empty($worlds)) {
            $defaultIndex = [
                '_id' => 'main_world',
                'id' => 'main_world',
                'title' => 'Crônicas & Linhagens',
                'currentYear' => 1000,
                'charactersCount' => 0,
                'housesCount' => 0,
                'updatedAt' => date('c')
            ];
            $bulk = new MongoDB\Driver\BulkWrite();
            $bulk->update(['_id' => 'main_world'], ['$set' => $defaultIndex], ['upsert' => true]);
            $this->manager->executeBulkWrite("{$this->dbName}.worlds_index", $bulk);
            return [$defaultIndex];
        }
        return $worlds;
    }

    private function updateIndex($worldId, $title, $year, $chars, $houses) {
        $bulk = new MongoDB\Driver\BulkWrite();
        $bulk->update(['_id' => $worldId], ['$set' => [
            'id' => $worldId,
            'title' => $title,
            'currentYear' => (int)$year,
            'charactersCount' => (int)$chars,
            'housesCount' => (int)$houses,
            'updatedAt' => date('c')
        ]], ['upsert' => true]);
        $this->manager->executeBulkWrite("{$this->dbName}.worlds_index", $bulk);
    }

    // ------------------------------------------------------------------------
    // Leitura: devolve o CAMINHO do arquivo JSON em cache (cache quente)
    // ------------------------------------------------------------------------
    public function getWorldJsonPath($worldId = 'main_world') {
        $worldId = self::sanitizeId($worldId);
        $path = $this->cachePath($worldId);
        if (is_file($path)) {
            return $path; // HIT: nenhum acesso ao Mongo, nenhuma RAM extra
        }

        // MISS: busca no Mongo já sem os campos internos
        $query = new MongoDB\Driver\Query(
            ['_id' => $worldId],
            ['projection' => ['_id' => 0, 'world_id' => 0, 'updated_at' => 0], 'limit' => 1]
        );
        $cursor = $this->manager->executeQuery("{$this->dbName}.world_state", $query);

        $json = null;
        if (self::hasBsonDocument()) {
            $cursor->setTypeMap(['root' => 'bson']);
            foreach ($cursor as $doc) {
                $json = $doc->toRelaxedExtendedJSON();
                break;
            }
        } else {
            $cursor->setTypeMap(['root' => 'array', 'document' => 'array', 'array' => 'array']);
            foreach ($cursor as $doc) {
                $json = json_encode($doc, JSON_UNESCAPED_UNICODE);
                break;
            }
        }

        if ($json === null) {
            // Mundo ainda não existe: cria limpo
            $json = json_encode(self::getDefaultCleanData($worldId), JSON_UNESCAPED_UNICODE);
            $this->saveWorldJson($json, $worldId);
            return $path;
        }

        $this->writeCache($worldId, $json);
        unset($json);
        return is_file($path) ? $path : null;
    }

    /** Compatibilidade: retorna o mundo como array (use apenas em rotinas raras). */
    public function getWorldData($worldId = 'main_world') {
        $path = $this->getWorldJsonPath($worldId);
        $data = $path ? json_decode(file_get_contents($path), true) : null;
        return is_array($data) ? $data : self::getDefaultCleanData(self::sanitizeId($worldId));
    }

    // ------------------------------------------------------------------------
    // Escrita: recebe o JSON bruto e converte para BSON dentro da extensão C
    // ------------------------------------------------------------------------
    public function saveWorldJson($rawJson, $worldId = 'main_world') {
        $worldId = self::sanitizeId($worldId);

        $title = 'Mundo Sem Título';
        $year = 1000;
        $chars = 0;
        $houses = 0;
        $doc = null;

        if (self::hasBsonDocument()) {
            $doc = MongoDB\BSON\Document::fromJSON($rawJson);
            // Payload antigo encapsulado em { data: {...} }
            if (!$doc->has('meta') && $doc->has('data')) {
                $inner = $doc->get('data');
                if ($inner instanceof MongoDB\BSON\Document) {
                    $doc = $inner;
                    $rawJson = $doc->toRelaxedExtendedJSON();
                }
            }
            // _id é imutável no Mongo: se veio no payload, remove pelo caminho lento
            if ($doc->has('_id') || $doc->has('world_id') || $doc->has('updated_at')) {
                $arr = json_decode($rawJson, true);
                unset($arr['_id'], $arr['world_id'], $arr['updated_at']);
                $rawJson = json_encode($arr, JSON_UNESCAPED_UNICODE);
                unset($arr);
                $doc = MongoDB\BSON\Document::fromJSON($rawJson);
            }
            if ($doc->has('meta')) {
                $meta = $doc->get('meta');
                if ($meta instanceof MongoDB\BSON\Document) {
                    if ($meta->has('worldTitle')) $title = trim((string)$meta->get('worldTitle')) ?: $title;
                    if ($meta->has('currentYear')) $year = (int)$meta->get('currentYear');
                }
            }
            if ($doc->has('characters')) $chars = iterator_count($doc->get('characters'));
            if ($doc->has('houses')) $houses = iterator_count($doc->get('houses'));
        } else {
            $arr = json_decode($rawJson, true);
            if (!is_array($arr)) throw new Exception('JSON inválido recebido.');
            if (!isset($arr['meta']) && isset($arr['data']) && is_array($arr['data'])) $arr = $arr['data'];
            unset($arr['_id'], $arr['world_id'], $arr['updated_at']);
            $title = isset($arr['meta']['worldTitle']) ? (trim($arr['meta']['worldTitle']) ?: $title) : $title;
            $year = isset($arr['meta']['currentYear']) ? (int)$arr['meta']['currentYear'] : $year;
            $chars = isset($arr['characters']) && is_array($arr['characters']) ? count($arr['characters']) : 0;
            $houses = isset($arr['houses']) && is_array($arr['houses']) ? count($arr['houses']) : 0;
            $rawJson = json_encode($arr, JSON_UNESCAPED_UNICODE);
            $doc = $arr;
        }

        // Substitui o documento inteiro (replace) - uma única operação de escrita
        $bulk = new MongoDB\Driver\BulkWrite();
        $bulk->update(['_id' => $worldId], $doc, ['upsert' => true]);
        $this->manager->executeBulkWrite("{$this->dbName}.world_state", $bulk);
        unset($doc, $bulk);

        $this->updateIndex($worldId, $title, $year, $chars, $houses);
        $this->syncIndividualCollections($worldId, $rawJson);
        $this->writeCache($worldId, $rawJson);

        return ['charactersCount' => $chars, 'housesCount' => $houses];
    }

    /**
     * Sincroniza coleções individuais no MongoDB Atlas para visualização e consulta estruturada
     */
    public function syncIndividualCollections($worldId, $jsonOrArray) {
        $data = is_array($jsonOrArray) ? $jsonOrArray : json_decode($jsonOrArray, true);
        if (!is_array($data)) return;

        // 1. Coleção 'worlds'
        try {
            $bulk = new MongoDB\Driver\BulkWrite();
            $meta = $data['meta'] ?? [];
            $bulk->update(['_id' => $worldId], ['$set' => [
                'id' => $worldId,
                'title' => $meta['worldTitle'] ?? 'Crônicas & Linhagens',
                'currentYear' => (int)($meta['currentYear'] ?? 1000),
                'charactersCount' => count($data['characters'] ?? []),
                'housesCount' => count($data['houses'] ?? []),
                'territoriesCount' => count($data['territories'] ?? []),
                'settlementsCount' => count($data['settlements'] ?? []),
                'updatedAt' => date('c')
            ]], ['upsert' => true]);
            $this->manager->executeBulkWrite("{$this->dbName}.worlds", $bulk);
        } catch (Throwable $e) {}

        // 2. Coleção 'characters'
        try {
            $bulk = new MongoDB\Driver\BulkWrite();
            $bulk->delete(['world_id' => $worldId]);
            if (!empty($data['characters']) && is_array($data['characters'])) {
                foreach ($data['characters'] as $c) {
                    $doc = $c;
                    $doc['_id'] = $worldId . '_' . ($c['id'] ?? uniqid());
                    $doc['world_id'] = $worldId;
                    $bulk->insert($doc);
                }
            }
            $this->manager->executeBulkWrite("{$this->dbName}.characters", $bulk);
        } catch (Throwable $e) {}

        // 3. Coleção 'houses'
        try {
            $bulk = new MongoDB\Driver\BulkWrite();
            $bulk->delete(['world_id' => $worldId]);
            if (!empty($data['houses']) && is_array($data['houses'])) {
                foreach ($data['houses'] as $h) {
                    $doc = $h;
                    $doc['_id'] = $worldId . '_' . ($h['id'] ?? uniqid());
                    $doc['world_id'] = $worldId;
                    $bulk->insert($doc);
                }
            }
            $this->manager->executeBulkWrite("{$this->dbName}.houses", $bulk);
        } catch (Throwable $e) {}

        // 4. Coleção 'territories'
        try {
            $bulk = new MongoDB\Driver\BulkWrite();
            $bulk->delete(['world_id' => $worldId]);
            if (!empty($data['territories']) && is_array($data['territories'])) {
                foreach ($data['territories'] as $t) {
                    $doc = $t;
                    $doc['_id'] = $worldId . '_' . ($t['id'] ?? uniqid());
                    $doc['world_id'] = $worldId;
                    $bulk->insert($doc);
                }
            }
            $this->manager->executeBulkWrite("{$this->dbName}.territories", $bulk);
        } catch (Throwable $e) {}

        // 5. Coleção 'settlements'
        try {
            $bulk = new MongoDB\Driver\BulkWrite();
            $bulk->delete(['world_id' => $worldId]);
            if (!empty($data['settlements']) && is_array($data['settlements'])) {
                foreach ($data['settlements'] as $s) {
                    $doc = $s;
                    $doc['_id'] = $worldId . '_' . ($s['id'] ?? uniqid());
                    $doc['world_id'] = $worldId;
                    $bulk->insert($doc);
                }
            }
            $this->manager->executeBulkWrite("{$this->dbName}.settlements", $bulk);
        } catch (Throwable $e) {}

        // 6. Coleção 'timeline_events'
        try {
            $bulk = new MongoDB\Driver\BulkWrite();
            $bulk->delete(['world_id' => $worldId]);
            if (!empty($data['timelineMilestones']) && is_array($data['timelineMilestones'])) {
                foreach ($data['timelineMilestones'] as $ev) {
                    $doc = $ev;
                    $doc['_id'] = $worldId . '_' . ($ev['id'] ?? uniqid());
                    $doc['world_id'] = $worldId;
                    $bulk->insert($doc);
                }
            }
            $this->manager->executeBulkWrite("{$this->dbName}.timeline_events", $bulk);
        } catch (Throwable $e) {}

        // 7. Coleção 'creations' (Grimório)
        try {
            $bulk = new MongoDB\Driver\BulkWrite();
            $bulk->delete(['world_id' => $worldId]);
            if (!empty($data['creations']) && is_array($data['creations'])) {
                foreach ($data['creations'] as $cr) {
                    $doc = $cr;
                    $doc['_id'] = $worldId . '_' . ($cr['id'] ?? uniqid());
                    $doc['world_id'] = $worldId;
                    $bulk->insert($doc);
                }
            }
            $this->manager->executeBulkWrite("{$this->dbName}.creations", $bulk);
        } catch (Throwable $e) {}
    }

    /** Compatibilidade com chamadas que passam array. */
    public function saveWorldData($data, $worldId = 'main_world') {
        return $this->saveWorldJson(json_encode($data, JSON_UNESCAPED_UNICODE), $worldId);
    }

    // ------------------------------------------------------------------------
    // Gestão de mundos
    // ------------------------------------------------------------------------
    public function createWorld($title, $initialYear = 1000) {
        $title = trim($title) ?: 'Nova História';
        $worldId = 'world_' . time() . '_' . substr(md5(uniqid(mt_rand(), true)), 0, 5);
        $cleanData = self::getDefaultCleanData($worldId, $title, (int)$initialYear);
        $this->saveWorldData($cleanData, $worldId);
        return ['id' => $worldId, 'title' => $title, 'data' => $cleanData];
    }

    public function deleteWorld($worldId) {
        $worldId = self::sanitizeId($worldId);
        if (count($this->listWorlds()) <= 1) {
            throw new Exception("Não é permitido excluir o único mundo existente no códice.");
        }

        foreach (['world_state' => ['_id' => $worldId], 'worlds_index' => ['_id' => $worldId],
                  'characters' => ['world_id' => $worldId], 'houses' => ['world_id' => $worldId]] as $coll => $filter) {
            $bulk = new MongoDB\Driver\BulkWrite();
            $bulk->delete($filter);
            $this->manager->executeBulkWrite("{$this->dbName}.{$coll}", $bulk);
        }
        $this->invalidateCache($worldId);
        return true;
    }

    public function renameWorld($worldId, $newTitle) {
        $worldId = self::sanitizeId($worldId);
        $newTitle = trim($newTitle);
        if ($newTitle === '') throw new Exception("O título do mundo não pode ser vazio.");

        // Atualização parcial: não carrega o mundo inteiro
        $bulk = new MongoDB\Driver\BulkWrite();
        $bulk->update(['_id' => $worldId], ['$set' => ['meta.worldTitle' => $newTitle]]);
        $this->manager->executeBulkWrite("{$this->dbName}.world_state", $bulk);

        $bulk = new MongoDB\Driver\BulkWrite();
        $bulk->update(['_id' => $worldId], ['$set' => ['title' => $newTitle, 'updatedAt' => date('c')]]);
        $this->manager->executeBulkWrite("{$this->dbName}.worlds_index", $bulk);

        $this->invalidateCache($worldId);
        return true;
    }

    public function getStats($worldId = 'main_world') {
        $worldId = self::sanitizeId($worldId);
        $worlds = $this->listWorlds();
        $current = null;
        foreach ($worlds as $w) {
            if (($w['id'] ?? $w['_id'] ?? '') === $worldId) { $current = $w; break; }
        }
        return [
            'database' => $this->dbName,
            'activeWorldId' => $worldId,
            'worldsCount' => count($worlds),
            'charactersCount' => $current['charactersCount'] ?? 0,
            'housesCount' => $current['housesCount'] ?? 0,
            'cacheHot' => is_file($this->cachePath($worldId)),
            'memoryPeakMB' => round(memory_get_peak_usage(true) / 1048576, 2),
            'serverTime' => date('c')
        ];
    }
}
