<?php
// ============================================================================
// API.PHP - Endpoint REST / JSON para MongoDB Atlas (Múltiplas Histórias) - LEVE
// ----------------------------------------------------------------------------
//  * load  -> streaming do cache quente em disco + ETag (HTTP 304 se nada mudou)
//  * save  -> JSON bruto vai direto para BSON (sem json_decode do mundo inteiro)
// ============================================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, If-None-Match');
header('Access-Control-Expose-Headers: ETag');
header('Content-Type: application/json; charset=utf-8');

$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($requestMethod === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/db.php';

function jsonOut($arr, $code = 200) {
    http_response_code($code);
    echo json_encode($arr, JSON_UNESCAPED_UNICODE);
}

function requirePost($method) {
    if ($method !== 'POST') {
        jsonOut(['status' => 'error', 'message' => 'Use POST para esta ação.'], 405);
        return false;
    }
    return true;
}

/** Lê corpo pequeno (create/rename). Nunca usado para o "save". */
function smallPayload() {
    $raw = file_get_contents('php://input', false, null, 0, 65536);
    $p = $raw ? json_decode($raw, true) : [];
    return is_array($p) ? $p : [];
}

try {
    $action = isset($_GET['action']) ? trim($_GET['action']) : '';
    if ($action === '' && $requestMethod === 'POST') $action = 'save';

    $worldId = FamilyTreeDB::sanitizeId($_GET['world_id'] ?? 'main_world');

    // Ações que não tocam o banco não precisam abrir conexão
    if ($action === '') {
        jsonOut([
            'status' => 'success',
            'message' => 'API PHP de Árvore Genealógica (MongoDB Atlas & Múltiplas Histórias)',
            'endpoints' => [
                'GET ?action=ping', 'GET ?action=list_worlds', 'GET ?action=load&world_id=X',
                'POST ?action=save&world_id=X', 'POST ?action=create_world',
                'POST ?action=delete_world&world_id=X', 'POST ?action=rename_world&world_id=X',
                'POST ?action=reset&world_id=X', 'GET ?action=stats&world_id=X'
            ]
        ]);
        exit;
    }

    $db = new FamilyTreeDB();

    switch ($action) {
        case 'ping':
        case 'test':
            $isOk = $db->ping();
            jsonOut([
                'status' => $isOk ? 'success' : 'error',
                'connected' => $isOk,
                'driver' => 'PHP ' . PHP_VERSION . ' (ext-mongodb)',
                'database' => MONGO_DB_NAME,
                'message' => $isOk ? 'Conectado ao MongoDB Atlas com sucesso!' : 'Falha ao responder ao ping no MongoDB.'
            ]);
            break;

        case 'list_worlds':
            jsonOut(['status' => 'success', 'worlds' => $db->listWorlds()]);
            break;

        case 'load':
            $path = $db->getWorldJsonPath($worldId);
            if (!$path || !is_file($path)) {
                throw new Exception('Não foi possível carregar o mundo solicitado.');
            }
            clearstatcache(true, $path);
            $etag = 'W/"' . $worldId . '-' . filemtime($path) . '-' . filesize($path) . '"';
            header('ETag: ' . $etag);
            header('Cache-Control: private, no-cache');

            $ifNoneMatch = $_SERVER['HTTP_IF_NONE_MATCH'] ?? '';
            if ($ifNoneMatch !== '' && trim($ifNoneMatch) === $etag) {
                http_response_code(304);
                exit;
            }

            // Streaming: o mundo nunca é carregado inteiro na memória do PHP
            echo '{"status":"success","connected":true,"world_id":' . json_encode($worldId) . ',"data":';
            readfile($path);
            echo '}';
            break;

        case 'save':
            if (!requirePost($requestMethod)) break;
            $rawInput = file_get_contents('php://input');
            if ($rawInput === '' || $rawInput === false) {
                jsonOut(['status' => 'error', 'message' => 'Nenhum dado enviado no corpo da requisição.'], 400);
                break;
            }
            $counts = $db->saveWorldJson($rawInput, $worldId);
            unset($rawInput);
            jsonOut([
                'status' => 'success',
                'world_id' => $worldId,
                'charactersCount' => $counts['charactersCount'],
                'housesCount' => $counts['housesCount'],
                'savedAt' => date('c')
            ]);
            break;

        case 'create_world':
            if (!requirePost($requestMethod)) break;
            $p = smallPayload();
            $title = trim($p['title'] ?? ($_GET['title'] ?? 'Nova História'));
            $year = (int)($p['currentYear'] ?? ($_GET['year'] ?? 1000));
            $newWorld = $db->createWorld($title, $year);
            jsonOut([
                'status' => 'success',
                'message' => 'Nova história criada com sucesso!',
                'world' => $newWorld,
                'worlds' => $db->listWorlds()
            ]);
            break;

        case 'delete_world':
            if (!requirePost($requestMethod)) break;
            $db->deleteWorld($worldId);
            jsonOut(['status' => 'success', 'message' => 'História excluída com sucesso.', 'worlds' => $db->listWorlds()]);
            break;

        case 'rename_world':
            if (!requirePost($requestMethod)) break;
            $p = smallPayload();
            $db->renameWorld($worldId, trim($p['title'] ?? ($_GET['title'] ?? '')));
            jsonOut(['status' => 'success', 'message' => 'História renomeada com sucesso.', 'worlds' => $db->listWorlds()]);
            break;

        case 'reset':
            if (!requirePost($requestMethod)) break;
            $cleanData = FamilyTreeDB::getDefaultCleanData($worldId);
            $db->saveWorldData($cleanData, $worldId);
            jsonOut(['status' => 'success', 'message' => 'Todos os dados deste mundo foram resetados no MongoDB.', 'data' => $cleanData]);
            break;

        case 'stats':
            jsonOut(['status' => 'success', 'stats' => $db->getStats($worldId)]);
            break;

        default:
            jsonOut(['status' => 'error', 'message' => 'Ação desconhecida: ' . $action], 400);
            break;
    }
} catch (Throwable $e) {
    jsonOut([
        'status' => 'error',
        'message' => 'Erro na comunicação com o MongoDB: ' . $e->getMessage()
    ], 500);
}
