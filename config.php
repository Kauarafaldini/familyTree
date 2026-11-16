<?php
// ============================================================================
// CONFIG.PHP - Configurações de Conexão com o MongoDB Atlas via PHP
// ============================================================================

define('MONGO_USER', getenv('MONGO_USER') ?: 'kauarsamtos0_db_user');
define('MONGO_PASS', getenv('MONGO_PASS') ?: 'vM8h0GYWkFoy4H6L');
define('MONGO_CLUSTER', getenv('MONGO_CLUSTER') ?: 'familytree.lhbb3e2.mongodb.net');
define('MONGO_DB_NAME', getenv('MONGO_DB_NAME') ?: 'familytree');

// String de conexão oficial com MongoDB Atlas (suporta variável de ambiente MONGODB_URI)
$envUri = getenv('MONGODB_URI');
if (!empty($envUri)) {
    define('MONGO_URI', $envUri);
} else {
    define(
        'MONGO_URI',
        'mongodb+srv://' . urlencode(MONGO_USER) . ':' . urlencode(MONGO_PASS) . '@' . MONGO_CLUSTER . '/' . MONGO_DB_NAME . '?retryWrites=true&w=majority'
    );
}

/**
 * Retorna uma instância gerenciada do MongoDB\Driver\Manager
 * @return MongoDB\Driver\Manager
 */
function getMongoManager() {
    static $manager = null;
    if ($manager === null) {
        $options = [
            'connectTimeoutMS' => 10000,
            'serverSelectionTimeoutMS' => 10000,
            'retryWrites' => true,
        ];
        $manager = new MongoDB\Driver\Manager(MONGO_URI, $options);
    }
    return $manager;
}
