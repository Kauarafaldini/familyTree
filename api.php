<?php
// ============================================================================
// API.PHP - Endpoint REST / JSON para Comunicação com MongoDB Atlas via PHP
// ============================================================================

// Permite requisições CORS tanto locais (file://, localhost, live server) quanto remotas
if (!headers_sent()) {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Content-Type: application/json; charset=utf-8');
}

// Responde imediatamente a requisições de pre-flight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

try {
    $db = new FamilyTreeDB();
    $action = isset($_GET['action']) ? trim($_GET['action']) : '';

    if (empty($action) && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = 'save';
    }

    switch ($action) {
        case 'ping':
        case 'test':
            $isOk = $db->ping();
            echo json_encode([
                'status' => $isOk ? 'success' : 'error',
                'connected' => $isOk,
                'driver' => 'PHP ' . PHP_VERSION . ' (ext-mongodb)',
                'database' => MONGO_DB_NAME,
                'cluster' => MONGO_CLUSTER,
                'message' => $isOk ? 'Conectado ao MongoDB Atlas com sucesso!' : 'Falha ao responder ao ping no MongoDB.'
            ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            break;

        case 'load':
            $data = $db->getWorldData();
            echo json_encode([
                'status' => 'success',
                'connected' => true,
                'data' => $data,
                'timestamp' => date('c')
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'save':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['status' => 'error', 'message' => 'Método inválido. Use POST para salvar dados.']);
                break;
            }

            $rawInput = file_get_contents('php://input');
            if (empty($rawInput)) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'Nenhum dado enviado no corpo da requisição.']);
                break;
            }

            $payload = json_decode($rawInput, true);
            if (!is_array($payload)) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'JSON inválido enviado no payload.']);
                break;
            }

            // Se o payload vier encapsulado em { data: ... }
            $dataToSave = isset($payload['data']) && is_array($payload['data']) ? $payload['data'] : $payload;

            $db->saveWorldData($dataToSave);
            echo json_encode([
                'status' => 'success',
                'message' => 'Mundo salvo com sucesso no MongoDB Atlas!',
                'stats' => $db->getStats(),
                'savedAt' => date('c')
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'reset':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['status' => 'error', 'message' => 'Use POST para confirmar o reset.']);
                break;
            }

            $cleanData = $db->resetWorldData();
            echo json_encode([
                'status' => 'success',
                'message' => 'Todos os dados foram resetados para um estado em branco no MongoDB.',
                'data' => $cleanData
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'stats':
            echo json_encode([
                'status' => 'success',
                'stats' => $db->getStats()
            ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            break;

        default:
            echo json_encode([
                'status' => 'success',
                'message' => 'API PHP de Árvore Genealógica (MongoDB Atlas)',
                'endpoints' => [
                    'GET ?action=ping'  => 'Testa conexão com o MongoDB Atlas',
                    'GET ?action=load'  => 'Carrega os dados completos do mundo',
                    'POST ?action=save' => 'Salva o mundo completo no banco de dados',
                    'POST ?action=reset'=> 'Limpa o banco de dados para estado em branco',
                    'GET ?action=stats' => 'Estatísticas de contagem do banco'
                ]
            ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            break;
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Erro na comunicação com o MongoDB: ' . $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
