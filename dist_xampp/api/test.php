<?php
require_once __DIR__ . '/db.php';

$startTime = microtime(true);

try {
    // If request contains custom config in body
    $targetDb = $config['database'] ?? 'alhana_pro_erp';
    if (isset($input['config']) && is_array($input['config'])) {
        $cfg = $input['config'];
        $targetDb = !empty($cfg['database']) ? $cfg['database'] : $targetDb;
        $dsn = "mysql:host=" . ($cfg['host'] ?? 'localhost') . ";port=" . ($cfg['port'] ?? 3306) . ";charset=utf8mb4";
        $user = $cfg['user'] ?? 'root';
        $pass = $cfg['password'] ?? '';
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 3
        ]);
        // Try selecting the specific database if it exists
        try {
            $pdo->exec("USE `" . str_replace("`", "``", $targetDb) . "`");
        } catch (\Exception $exDb) {
            // Database might not be created yet
        }
    } else {
        $pdo = getDbConnection(false);
    }

    $stmt = $pdo->query("SELECT VERSION() AS version, NOW() as serverTime, DATABASE() as currentDb");
    $row = $stmt->fetch();
    $latencyMs = round((microtime(true) - $startTime) * 1000);
    $activeDatabaseName = !empty($row['currentDb']) ? $row['currentDb'] : $targetDb;

    echo json_encode([
        'success' => true,
        'message' => 'تم الاتصال بنجاح بسيرفر MySQL في XAMPP عبر PHP!',
        'latencyMs' => $latencyMs,
        'serverInfo' => [
            'version' => $row['version'] ?? 'MySQL/MariaDB',
            'serverTime' => $row['serverTime'] ?? date('Y-m-d H:i:s'),
            'database' => $activeDatabaseName
        ]
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(400);
    $hint = 'تأكد من الضغط على زر Start بجانب MySQL في XAMPP Control Panel';
    if (strpos($e->getMessage(), 'Access denied') !== false) {
        $hint = 'خطأ في اسم المستخدم أو كلمة المرور. في XAMPP الافتراضي اسم المستخدم هو root وكلمة المرور فارغة.';
    }

    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'hint' => $hint
    ], JSON_UNESCAPED_UNICODE);
}
