<?php
// shifts.php - API for managing employee shifts in XAMPP
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM `shifts` ORDER BY `opened_at` DESC");
        $shifts = $stmt->fetchAll();
        echo json_encode(['success' => true, 'shifts' => $shifts], JSON_UNESCAPED_UNICODE);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);

if ($method === 'POST') {
    // Open new shift
    try {
        $stmt = $pdo->prepare("
            INSERT INTO `shifts` (`id`, `user_id`, `user_name`, `opened_at`, `starting_balance`, `sales_revenue`, `other_incomes`, `other_expenses`, `expected_balance`, `notes`, `status`)
            VALUES (:id, :user_id, :user_name, :opened_at, :starting_balance, :sales_revenue, :other_incomes, :other_expenses, :expected_balance, :notes, :status)
            ON DUPLICATE KEY UPDATE
                `starting_balance` = VALUES(`starting_balance`),
                `notes` = VALUES(`notes`),
                `status` = VALUES(`status`)
        ");
        $stmt->execute([
            ':id' => $input['id'],
            ':user_id' => $input['userId'] ?? 'usr-1',
            ':user_name' => $input['userName'] ?? 'الكاشير',
            ':opened_at' => date('Y-m-d H:i:s', strtotime($input['openedAt'] ?? 'now')),
            ':starting_balance' => (float)($input['startingBalance'] ?? 0),
            ':sales_revenue' => (float)($input['salesRevenue'] ?? 0),
            ':other_incomes' => (float)($input['otherIncomes'] ?? 0),
            ':other_expenses' => (float)($input['otherExpenses'] ?? 0),
            ':expected_balance' => (float)($input['expectedBalance'] ?? 0),
            ':notes' => $input['notes'] ?? '',
            ':status' => $input['status'] ?? 'open'
        ]);
        echo json_encode(['success' => true, 'message' => 'تم حفظ الوردية بنجاح'], JSON_UNESCAPED_UNICODE);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit();
}

if ($method === 'PUT') {
    // Close / update shift
    try {
        $stmt = $pdo->prepare("
            UPDATE `shifts`
            SET
                `closed_at` = :closed_at,
                `actual_balance` = :actual_balance,
                `difference` = :difference,
                `notes` = :notes,
                `status` = :status
            WHERE `id` = :id
        ");
        $stmt->execute([
            ':id' => $input['id'],
            ':closed_at' => date('Y-m-d H:i:s', strtotime($input['closedAt'] ?? 'now')),
            ':actual_balance' => (float)($input['actualBalance'] ?? 0),
            ':difference' => (float)($input['difference'] ?? 0),
            ':notes' => $input['notes'] ?? '',
            ':status' => $input['status'] ?? 'closed'
        ]);
        echo json_encode(['success' => true, 'message' => 'تم إغلاق الوردية وحفظ المطابقة بنجاح'], JSON_UNESCAPED_UNICODE);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit();
}
?>
