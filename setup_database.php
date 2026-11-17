<?php
// ============================================================================
// SETUP_DATABASE.PHP - Cria todas as Coleções e Índices no MongoDB Atlas
// ============================================================================
require_once __DIR__ . '/config.php';

echo "Conectando ao MongoDB Atlas...\n";
try {
    $m = getMongoManager();
    $dbName = MONGO_DB_NAME;

    // Testa conexão
    $cmd = new MongoDB\Driver\Command(['ping' => 1]);
    $m->executeCommand('admin', $cmd);
    echo "✓ Conectado com sucesso ao cluster do MongoDB Atlas!\n\n";

    // Lista de coleções que a aplicação utiliza
    $collections = [
        'worlds' => [
            'desc' => 'Histórias / Mundos criados pela autora',
            'indexes' => [
                ['key' => ['id' => 1], 'unique' => true]
            ]
        ],
        'characters' => [
            'desc' => 'Personagens, fichas nobres e linhagens genealógicas',
            'indexes' => [
                ['key' => ['id' => 1, 'world_id' => 1], 'unique' => true],
                ['key' => ['world_id' => 1]],
                ['key' => ['officialHouseId' => 1]],
                ['key' => ['fatherId' => 1]],
                ['key' => ['motherId' => 1]]
            ]
        ],
        'houses' => [
            'desc' => 'Casas Dinásticas, brasões, lemas e linhagens soberanas',
            'indexes' => [
                ['key' => ['id' => 1, 'world_id' => 1], 'unique' => true],
                ['key' => ['world_id' => 1]]
            ]
        ],
        'territories' => [
            'desc' => 'Continentes e territórios cartográficos modeláveis',
            'indexes' => [
                ['key' => ['id' => 1, 'world_id' => 1], 'unique' => true],
                ['key' => ['world_id' => 1]]
            ]
        ],
        'settlements' => [
            'desc' => 'Capitais Reais e Cidades/Vilas no mapa',
            'indexes' => [
                ['key' => ['id' => 1, 'world_id' => 1], 'unique' => true],
                ['key' => ['world_id' => 1]]
            ]
        ],
        'timeline_events' => [
            'desc' => 'Crônicas históricas, guerras, coroações e marcos do tempo',
            'indexes' => [
                ['key' => ['id' => 1, 'world_id' => 1], 'unique' => true],
                ['key' => ['world_id' => 1]],
                ['key' => ['year' => 1]]
            ]
        ],
        'creations' => [
            'desc' => 'Grimório Arcano: magias, poções, artefatos e criaturas míticas',
            'indexes' => [
                ['key' => ['id' => 1, 'world_id' => 1], 'unique' => true],
                ['key' => ['world_id' => 1]],
                ['key' => ['category' => 1]]
            ]
        ],
        'map_strokes' => [
            'desc' => 'Traços cartográficos (cordilheiras, bosques, rios, estradas, carimbos)',
            'indexes' => [
                ['key' => ['world_id' => 1]]
            ]
        ],
        'audit_logs' => [
            'desc' => 'Histórico de alterações e auditoria do reino',
            'indexes' => [
                ['key' => ['world_id' => 1]],
                ['key' => ['timestamp' => -1]]
            ]
        ],
        'world_state' => [
            'desc' => 'Snapshot consolidado de carregamento ultrarrápido (cache)',
            'indexes' => [
                ['key' => ['_id' => 1], 'unique' => true]
            ]
        ]
    ];

    // Obtém coleções existentes
    $listCmd = new MongoDB\Driver\Command(['listCollections' => 1]);
    $existingCursor = $m->executeCommand($dbName, $listCmd);
    $existing = [];
    foreach ($existingCursor as $col) {
        $existing[$col->name] = true;
    }

    echo "Criando coleções ('tabelas') no banco '{$dbName}':\n";
    foreach ($collections as $colName => $meta) {
        if (!isset($existing[$colName])) {
            try {
                $createCmd = new MongoDB\Driver\Command(['create' => $colName]);
                $m->executeCommand($dbName, $createCmd);
                echo " + Criada coleção: [{$colName}] - {$meta['desc']}\n";
            } catch (Throwable $e) {
                echo " ! Coleção [{$colName}]: " . $e->getMessage() . "\n";
            }
        } else {
            echo " ✓ Coleção já existente: [{$colName}] - {$meta['desc']}\n";
        }

        // Cria índices se existirem
        if (!empty($meta['indexes'])) {
            $indexesToCreate = [];
            foreach ($meta['indexes'] as $idx) {
                $key = $idx['key'];
                $idxName = implode('_', array_keys($key)) . '_idx';
                $def = ['key' => $key, 'name' => $idxName];
                if (!empty($idx['unique'])) $def['unique'] = true;
                $indexesToCreate[] = $def;
            }
            try {
                $idxCmd = new MongoDB\Driver\Command([
                    'createIndexes' => $colName,
                    'indexes' => $indexesToCreate
                ]);
                $m->executeCommand($dbName, $idxCmd);
            } catch (Throwable $e) {
                // Índices já podem existir ou aviso ignorável
            }
        }
    }

    echo "\n✓ Todas as coleções ('tabelas') foram configuradas com sucesso no MongoDB Atlas!\n";

} catch (Throwable $e) {
    echo "Erro durante o setup: " . $e->getMessage() . "\n";
}
