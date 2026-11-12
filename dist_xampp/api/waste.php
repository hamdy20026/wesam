<?php
// waste.php - XAMPP Waste and Damaged Inventory CRUD API
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents('php://input'), true);

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT id, product_id as productId, product_name as productName, category, unit, quantity, cost_price as costPrice, loss_value as lossValue, reason, date, notes FROM waste_records ORDER BY date DESC");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
    } elseif ($method === 'POST') {
        $stmt = $pdo->prepare("INSERT INTO waste_records (id, product_id, product_name, category, unit, quantity, cost_price, loss_value, reason, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['id'],
            $data['productId'] ?? '',
            $data['productName'] ?? '',
            $data['category'] ?? 'wires_cables',
            $data['unit'] ?? 'قطعة',
            (float)($data['quantity'] ?? 1),
            (float)($data['costPrice'] ?? 0),
            (float)($data['lossValue'] ?? 0),
            $data['reason'] ?? 'damaged',
            toMysqlDateTime($data['date'] ?? null),
            $data['notes'] ?? null
        ]);
        echo json_encode(['success' => true, 'message' => 'تم تسجيل الهالك بنجاح'], JSON_UNESCAPED_UNICODE);
    } elseif ($method === 'DELETE') {
        $id = $_GET['id'] ?? $data['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare("DELETE FROM waste_records WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'تم حذف سجل الهالك بنجاح'], JSON_UNESCAPED_UNICODE);
        }
    }
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
