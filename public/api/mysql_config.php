<?php
// mysql_config.php - Read & Save MySQL configuration for XAMPP deployment
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$configFile = __DIR__ . '/config.json';
$defaultConfig = [
    'host' => 'localhost',
    'port' => 3306,
    'user' => 'root',
    'password' => '',
    'database' => 'alhana_pro_erp'
];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $current = $defaultConfig;
    if (file_exists($configFile)) {
        $saved = json_decode(file_get_contents($configFile), true);
        if (is_array($saved)) {
            $current = array_merge($current, $saved);
        }
    }
    
    echo json_encode([
        'success' => true,
        'config' => [
            'host' => $current['host'] ?? 'localhost',
            'port' => (int)($current['port'] ?? 3306),
            'user' => $current['user'] ?? 'root',
            'password' => !empty($current['password']) ? '••••••••' : '',
            'hasPassword' => !empty($current['password']),
            'database' => $current['database'] ?? 'alhana_pro_erp'
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) {
        $data = [];
    }

    $current = $defaultConfig;
    if (file_exists($configFile)) {
        $saved = json_decode(file_get_contents($configFile), true);
        if (is_array($saved)) {
            $current = array_merge($current, $saved);
        }
    }

    if (isset($data['host']) && $data['host'] !== '') $current['host'] = $data['host'];
    if (isset($data['port']) && $data['port'] !== '') $current['port'] = (int)$data['port'];
    if (isset($data['user']) && $data['user'] !== '') $current['user'] = $data['user'];
    if (isset($data['password'])) {
        // Only update if not the masked placeholder
        if ($data['password'] !== '••••••••') {
            $current['password'] = $data['password'];
        }
    }
    if (isset($data['database']) && $data['database'] !== '') $current['database'] = $data['database'];

    // Save to config.json
    file_put_contents($configFile, json_encode($current, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    // Also update config.php $db variable if exists
    $configPhpPath = __DIR__ . '/config.php';
    if (file_exists($configPhpPath)) {
        $content = file_get_contents($configPhpPath);
        $content = preg_replace('/\$db\s*=\s*[\'"][^\'"]*[\'"];/', '$db   = \'' . addslashes($current['database']) . '\';', $content);
        $content = preg_replace('/\$host\s*=\s*[\'"][^\'"]*[\'"];/', '$host = \'' . addslashes($current['host']) . '\';', $content);
        $content = preg_replace('/\$user\s*=\s*[\'"][^\'"]*[\'"];/', '$user = \'' . addslashes($current['user']) . '\';', $content);
        if ($data['password'] !== '••••••••') {
            $content = preg_replace('/\$pass\s*=\s*[\'"][^\'"]*[\'"];/', '$pass = \'' . addslashes($current['password']) . '\';', $content);
        }
        file_put_contents($configPhpPath, $content);
    }

    echo json_encode([
        'success' => true,
        'message' => 'تم حفظ إعدادات الاتصال بقاعدة بيانات XAMPP بنجاح',
        'config' => [
            'host' => $current['host'],
            'port' => (int)$current['port'],
            'user' => $current['user'],
            'database' => $current['database']
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit();
}
?>
