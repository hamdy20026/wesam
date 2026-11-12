<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$configFile = __DIR__ . '/config.json';
$config = [
    'host' => 'localhost',
    'port' => 3306,
    'user' => 'root',
    'password' => '',
    'database' => 'alhana_pro_erp'
];

if (file_exists($configFile)) {
    $saved = json_decode(file_get_contents($configFile), true);
    if (is_array($saved)) {
        $config = array_merge($config, $saved);
    }
}

function getDbConnection($selectDatabase = true) {
    global $config;
    $dsn = "mysql:host=" . $config['host'] . ";port=" . $config['port'] . ";charset=utf8mb4";
    if ($selectDatabase) {
        $dsn .= ";dbname=" . $config['database'];
    }
    
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    
    return new PDO($dsn, $config['user'], $config['password'], $options);
}
