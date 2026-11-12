<?php
// init_db.php - Initialize / Populate full database from alhana_pro_erp.sql or ensureTablesExist
require_once __DIR__ . '/config.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $targetDb = !empty($input['database']) ? $input['database'] : ($db ?? 'alhana_pro_erp');

    // Create database if not exists and select it
    $pdo_root = new PDO("mysql:host=$host;port=$port;charset=$charset", $user, $pass, $options);
    $pdo_root->exec("CREATE DATABASE IF NOT EXISTS `" . str_replace("`", "``", $targetDb) . "` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    
    $dsnTarget = "mysql:host=$host;port=$port;dbname=$targetDb;charset=$charset";
    $pdoTarget = new PDO($dsnTarget, $user, $pass, $options);

    // 1. Check if SQL file is available
    $possiblePaths = [
        __DIR__ . '/../alhana_pro_erp.sql',
        __DIR__ . '/alhana_pro_erp.sql',
        dirname(__DIR__, 2) . '/public/alhana_pro_erp.sql'
    ];

    $schemaFile = null;
    foreach ($possiblePaths as $path) {
        if (file_exists($path)) {
            $schemaFile = $path;
            break;
        }
    }

    if ($schemaFile) {
        $sql = file_get_contents($schemaFile);
        if ($targetDb !== 'alhana_pro_erp') {
            $sql = str_replace('`alhana_pro_erp`', '`' . str_replace('`', '``', $targetDb) . '`', $sql);
        }
        $pdoTarget->exec($sql);
    }

    // Explicitly pass $forceSeed = true when initializing via init_db.php
    ensureTablesExist($pdoTarget, true);

    // Verify row counts
    $usersCount = (int)$pdoTarget->query("SELECT COUNT(*) FROM `users`")->fetchColumn();
    $prodCount = (int)$pdoTarget->query("SELECT COUNT(*) FROM `products`")->fetchColumn();
    $custCount = (int)$pdoTarget->query("SELECT COUNT(*) FROM `customers`")->fetchColumn();
    $supCount = (int)$pdoTarget->query("SELECT COUNT(*) FROM `suppliers`")->fetchColumn();
    $safeCount = (int)$pdoTarget->query("SELECT COUNT(*) FROM `safes`")->fetchColumn();

    echo json_encode([
        'success' => true,
        'message' => "✓ تم تهيئة قاعدة البيانات [{$targetDb}] وتعبئة كافة الجداول بالبيانات بنجاح! ({$prodCount} صنف، {$custCount} عميل، {$supCount} مورد، {$safeCount} خزينة، {$usersCount} مستخدمين).",
        'counts' => [
            'users' => $usersCount,
            'products' => $prodCount,
            'customers' => $custCount,
            'suppliers' => $supCount,
            'safes' => $safeCount
        ]
    ], JSON_UNESCAPED_UNICODE);
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'خطأ أثناء تنفيذ تهيئة قاعدة البيانات: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
