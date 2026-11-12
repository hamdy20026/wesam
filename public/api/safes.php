<?php
// safes.php - XAMPP Safes and Treasuries CRUD API
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents('php://input'), true);

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT id, name, type, balance, account_number as accountNumber, is_default as isDefault, notes, updated_at as updatedAt FROM safes");
        $safes = $stmt->fetchAll();
        // format isDefault boolean
        foreach ($safes as &$s) {
            $s['isDefault'] = (bool)$s['isDefault'];
            $s['balance'] = (float)$s['balance'];
        }
        echo json_encode(['success' => true, 'data' => $safes], JSON_UNESCAPED_UNICODE);
    } elseif ($method === 'POST') {
        $isDefault = !empty($data['isDefault']) ? 1 : 0;
        $stmt = $pdo->prepare("INSERT INTO safes (id, name, type, balance, account_number, is_default, notes) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), type=VALUES(type), balance=VALUES(balance), account_number=VALUES(account_number), is_default=VALUES(is_default), notes=VALUES(notes)");
        $stmt->execute([
            $data['id'],
            $data['name'],
            $data['type'] ?? 'cash',
            $data['balance'] ?? 0,
            $data['accountNumber'] ?? null,
            $isDefault,
            $data['notes'] ?? null
        ]);
        echo json_encode(['success' => true, 'message' => 'تم حفظ الخزينة بنجاح']);
    } elseif ($method === 'PUT') {
        $isDefault = !empty($data['isDefault']) ? 1 : 0;
        $stmt = $pdo->prepare("UPDATE safes SET name=?, type=?, balance=?, account_number=?, is_default=?, notes=? WHERE id=?");
        $stmt->execute([
            $data['name'],
            $data['type'] ?? 'cash',
            $data['balance'] ?? 0,
            $data['accountNumber'] ?? null,
            $isDefault,
            $data['notes'] ?? null,
            $data['id']
        ]);
        echo json_encode(['success' => true, 'message' => 'تم تعديل الخزينة بنجاح']);
    } elseif ($method === 'DELETE') {
        $id = $_GET['id'] ?? $data['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare("DELETE FROM safes WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'تم حذف الخزينة بنجاح من قاعدة البيانات']);
        } else {
            echo json_encode(['success' => false, 'message' => 'المعرف غير محدد']);
        }
    }
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
