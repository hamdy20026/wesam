<?php
// suppliers.php - Electrical ERP Suppliers CRUD API for XAMPP
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents('php://input'), true);

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT id, name, company_name as companyName, representative_name as representativeName, phone, address, supplied_categories as suppliedCategories, initial_balance as initialBalance, current_balance as currentBalance, notes, created_at as createdAt FROM suppliers ORDER BY created_at DESC");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
    } elseif ($method === 'POST') {
        $initBal = isset($data['initialBalance']) ? (float)$data['initialBalance'] : (float)($data['currentBalance'] ?? 0);
        $currBal = isset($data['currentBalance']) ? (float)$data['currentBalance'] : $initBal;
        $stmt = $pdo->prepare("
            INSERT INTO suppliers (id, name, company_name, representative_name, phone, address, supplied_categories, initial_balance, current_balance, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name), company_name = VALUES(company_name), representative_name = VALUES(representative_name),
                phone = VALUES(phone), address = VALUES(address), supplied_categories = VALUES(supplied_categories),
                current_balance = VALUES(current_balance), notes = VALUES(notes)
        ");
        $stmt->execute([
            $data['id'],
            $data['name'] ?? '',
            $data['companyName'] ?? $data['name'] ?? '',
            $data['representativeName'] ?? null,
            $data['phone'] ?? '',
            $data['address'] ?? null,
            $data['suppliedCategories'] ?? null,
            $initBal,
            $currBal,
            $data['notes'] ?? null,
            toMysqlDateTime($data['createdAt'] ?? null)
        ]);
        echo json_encode(['success' => true, 'message' => 'تم إضافة المورد بنجاح في قاعدة البيانات', 'id' => $data['id']], JSON_UNESCAPED_UNICODE);
    } elseif ($method === 'PUT') {
        $stmt = $pdo->prepare("
            UPDATE suppliers SET
                name = ?, company_name = ?, representative_name = ?, phone = ?,
                address = ?, supplied_categories = ?, current_balance = ?, notes = ?
            WHERE id = ?
        ");
        $stmt->execute([
            $data['name'] ?? '',
            $data['companyName'] ?? $data['name'] ?? '',
            $data['representativeName'] ?? null,
            $data['phone'] ?? '',
            $data['address'] ?? null,
            $data['suppliedCategories'] ?? null,
            (float)($data['currentBalance'] ?? 0),
            $data['notes'] ?? null,
            $data['id']
        ]);
        echo json_encode(['success' => true, 'message' => 'تم تعديل بيانات المورد بنجاح', 'id' => $data['id']], JSON_UNESCAPED_UNICODE);
    } elseif ($method === 'DELETE') {
        $id = $_GET['id'] ?? $data['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare("DELETE FROM suppliers WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'تم حذف المورد بنجاح'], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'معرف المورد غير محدد'], JSON_UNESCAPED_UNICODE);
        }
    }
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
