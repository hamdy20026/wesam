<?php
// expenses.php - XAMPP Expenses API
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents('php://input'), true);

try {
    if ($method === 'POST') {
        $stmt = $pdo->prepare("
            INSERT INTO expenses (id, title, category, amount, safe_id, recipient, date, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE title = VALUES(title), amount = VALUES(amount), notes = VALUES(notes)
        ");
        $stmt->execute([
            $data['id'],
            $data['title'] ?? 'مصروف عام',
            $data['category'] ?? 'other',
            (float)($data['amount'] ?? 0),
            $data['safeId'] ?? 'safe-pos',
            $data['recipient'] ?? null,
            toMysqlDateTime($data['date'] ?? null),
            $data['notes'] ?? null
        ]);
        echo json_encode(['success' => true, 'message' => 'تم تسجيل المصروف بنجاح'], JSON_UNESCAPED_UNICODE);
    } elseif ($method === 'DELETE') {
        $id = $_GET['id'] ?? $data['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare("DELETE FROM expenses WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'تم حذف المصروف'], JSON_UNESCAPED_UNICODE);
        }
    }
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
