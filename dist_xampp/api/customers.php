<?php
// customers.php - Electrical ERP Customers CRUD API for XAMPP
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents('php://input'), true);

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT id, code, name, phone, address, customer_type as customerType, commercial_record as commercialRecord, initial_balance as initialBalance, current_balance as currentBalance, credit_limit as creditLimit, notes, created_at as createdAt FROM customers ORDER BY CASE WHEN id = 'walk-in' THEN 0 ELSE 1 END, created_at DESC");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
    } elseif ($method === 'POST') {
        if (($data['id'] ?? '') === 'walk-in') {
            $data['name'] = 'عميل نقدي عام';
            $data['initialBalance'] = 0.00;
            $data['currentBalance'] = 0.00;
            $data['creditLimit'] = 0.00;
        }
        $initBal = isset($data['initialBalance']) ? (float)$data['initialBalance'] : 0.00;
        $currBal = isset($data['currentBalance']) ? (float)$data['currentBalance'] : $initBal;
        $stmt = $pdo->prepare("
            INSERT INTO customers (id, code, name, phone, address, customer_type, commercial_record, initial_balance, current_balance, credit_limit, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                code = VALUES(code), name = VALUES(name), phone = VALUES(phone), address = VALUES(address),
                customer_type = VALUES(customer_type), commercial_record = VALUES(commercial_record),
                current_balance = VALUES(current_balance), credit_limit = VALUES(credit_limit), notes = VALUES(notes)
        ");
        $stmt->execute([
            $data['id'],
            $data['code'] ?? null,
            $data['name'] ?? '',
            $data['phone'] ?? '',
            $data['address'] ?? null,
            $data['customerType'] ?? 'retail',
            $data['commercialRecord'] ?? null,
            $initBal,
            $currBal,
            (float)($data['creditLimit'] ?? 50000.00),
            $data['notes'] ?? null,
            toMysqlDateTime($data['createdAt'] ?? null)
        ]);
        echo json_encode(['success' => true, 'message' => 'تم حفظ العميل بنجاح في قاعدة البيانات', 'id' => $data['id']], JSON_UNESCAPED_UNICODE);
    } elseif ($method === 'PUT') {
        if (($data['id'] ?? '') === 'walk-in') {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'حساب عميل نقدي عام حساب دائم في النظام ومحمي من التعديل نهائياً'], JSON_UNESCAPED_UNICODE);
            exit();
        }
        $stmt = $pdo->prepare("
            UPDATE customers SET
                code = ?, name = ?, phone = ?, address = ?, customer_type = ?,
                commercial_record = ?, current_balance = ?, credit_limit = ?, notes = ?
            WHERE id = ?
        ");
        $stmt->execute([
            $data['code'] ?? null,
            $data['name'] ?? '',
            $data['phone'] ?? '',
            $data['address'] ?? null,
            $data['customerType'] ?? 'retail',
            $data['commercialRecord'] ?? null,
            (float)($data['currentBalance'] ?? 0),
            (float)($data['creditLimit'] ?? 50000.00),
            $data['notes'] ?? null,
            $data['id']
        ]);
        echo json_encode(['success' => true, 'message' => 'تم تعديل بيانات العميل بنجاح', 'id' => $data['id']], JSON_UNESCAPED_UNICODE);
    } elseif ($method === 'DELETE') {
        $id = $_GET['id'] ?? $data['id'] ?? null;
        if ($id === 'walk-in') {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'حساب عميل نقدي عام حساب دائم في النظام ومحمي من الحذف نهائياً'], JSON_UNESCAPED_UNICODE);
            exit();
        }
        if ($id) {
            $stmt = $pdo->prepare("DELETE FROM customers WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'تم حذف العميل بنجاح'], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'معرف العميل غير محدد'], JSON_UNESCAPED_UNICODE);
        }
    }
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
