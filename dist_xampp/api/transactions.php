<?php
// transactions.php - XAMPP Financial Transactions API
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents('php://input'), true);

try {
    if ($method === 'POST' || $method === 'PUT') {
        $stmt = $pdo->prepare("
            INSERT INTO financial_transactions (id, date, type, title, amount, direction, related_id, safe_id, safe_name, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                title = VALUES(title), amount = VALUES(amount), direction = VALUES(direction), notes = VALUES(notes)
        ");
        $stmt->execute([
            $data['id'],
            toMysqlDateTime($data['date'] ?? null),
            $data['type'] ?? 'general_expense',
            $data['title'] ?? '',
            (float)($data['amount'] ?? 0),
            ($data['direction'] ?? 'in') === 'out' ? 'out' : 'in',
            $data['referenceId'] ?? $data['relatedId'] ?? null,
            $data['safeId'] ?? 'safe-pos',
            $data['safeName'] ?? null,
            $data['notes'] ?? null
        ]);
        echo json_encode(['success' => true, 'message' => 'تم تسجيل الحركة المالية بنجاح'], JSON_UNESCAPED_UNICODE);
    } elseif ($method === 'DELETE') {
        $id = $_GET['id'] ?? $data['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare("DELETE FROM financial_transactions WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'تم حذف الحركة المالية بنجاح'], JSON_UNESCAPED_UNICODE);
        }
    }
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
