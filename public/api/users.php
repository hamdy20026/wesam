<?php
// users.php - User Management API for XAMPP MySQL
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT id, username, name, role, phone, password_hash as passwordHash, is_active as isActive, created_at as createdAt FROM users ORDER BY created_at ASC");
    $raw = $stmt->fetchAll();
    $users = [];
    foreach ($raw as $u) {
        $users[] = [
            'id' => $u['id'],
            'username' => $u['username'],
            'name' => $u['name'],
            'role' => $u['role'],
            'phone' => $u['phone'] ?? '',
            'passwordHash' => $u['passwordHash'] ?? '123456',
            'isActive' => (bool)$u['isActive'],
            'createdAt' => $u['createdAt']
        ];
    }
    echo json_encode(['success' => true, 'data' => $users, 'users' => $users], JSON_UNESCAPED_UNICODE);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);

if ($method === 'POST') {
    $id = $data['id'] ?? ('usr-' . time());
    $username = $data['username'] ?? '';
    $name = $data['name'] ?? '';
    $role = $data['role'] ?? 'cashier';
    $phone = $data['phone'] ?? '';
    $password = $data['passwordHash'] ?? $data['password'] ?? '123456';
    $isActive = isset($data['isActive']) ? ($data['isActive'] ? 1 : 0) : 1;

    if (empty($username) || empty($name)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'اسم المستخدم والاسم الكامل مطلوبان'], JSON_UNESCAPED_UNICODE);
        exit();
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO users (id, username, name, role, phone, password_hash, is_active)
            VALUES (:id, :username, :name, :role, :phone, :password_hash, :is_active)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name), role = VALUES(role), phone = VALUES(phone),
                password_hash = VALUES(password_hash), is_active = VALUES(is_active)
        ");
        $stmt->execute([
            ':id' => $id,
            ':username' => $username,
            ':name' => $name,
            ':role' => $role,
            ':phone' => $phone,
            ':password_hash' => $password,
            ':is_active' => $isActive
        ]);
        echo json_encode(['success' => true, 'message' => 'تم حفظ المستخدم بنجاح في قاعدة البيانات', 'id' => $id], JSON_UNESCAPED_UNICODE);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'فشل إضافة المستخدم: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit();
}

if ($method === 'PUT') {
    $id = $data['id'] ?? '';
    if (empty($id)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'معرف المستخدم غير محدد'], JSON_UNESCAPED_UNICODE);
        exit();
    }
    try {
        $fields = [];
        $params = [':id' => $id];
        if (isset($data['name'])) { $fields[] = "name = :name"; $params[':name'] = $data['name']; }
        if (isset($data['username'])) { $fields[] = "username = :username"; $params[':username'] = $data['username']; }
        if (isset($data['role'])) { $fields[] = "role = :role"; $params[':role'] = $data['role']; }
        if (isset($data['phone'])) { $fields[] = "phone = :phone"; $params[':phone'] = $data['phone']; }
        if (isset($data['passwordHash'])) { $fields[] = "password_hash = :password_hash"; $params[':password_hash'] = $data['passwordHash']; }
        if (isset($data['password'])) { $fields[] = "password_hash = :password_hash"; $params[':password_hash'] = $data['password']; }
        if (isset($data['isActive'])) { $fields[] = "is_active = :is_active"; $params[':is_active'] = $data['isActive'] ? 1 : 0; }

        if (!empty($fields)) {
            $sql = "UPDATE users SET " . implode(", ", $fields) . " WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        }
        echo json_encode(['success' => true, 'message' => 'تم تحديث بيانات المستخدم بنجاح'], JSON_UNESCAPED_UNICODE);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'فشل تحديث المستخدم: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit();
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? $data['id'] ?? '';
    if ($id) {
        if ($id === 'usr-admin' || $id === 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'لا يمكن حذف حساب مدير النظام الرئيسي'], JSON_UNESCAPED_UNICODE);
            exit();
        }
        try {
            $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'تم حذف المستخدم بنجاح من قاعدة البيانات'], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'المعرف غير محدد'], JSON_UNESCAPED_UNICODE);
    }
    exit();
}
?>
