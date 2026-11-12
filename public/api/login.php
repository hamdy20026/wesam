<?php
// login.php - XAMPP User Authentication API
require_once 'config.php';

$data = json_decode(file_get_contents('php://input'), true);

$username = $data['username'] ?? '';
$password = $data['password'] ?? '';

if (empty($username) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'يرجى إدخال اسم المستخدم وكلمة المرور']);
    exit();
}

try {
    // If table is empty, auto-seed admin user
    $uCount = (int)$pdo->query("SELECT COUNT(*) FROM `users`")->fetchColumn();
    if ($uCount === 0) {
        $pdo->exec("INSERT INTO `users` (`id`, `username`, `name`, `role`, `phone`, `password_hash`, `is_active`) VALUES
            ('usr-admin', 'admin', 'المهندس وسام (مدير النظام)', 'admin', '01000000001', '123456', 1),
            ('usr-cashier', 'cashier', 'أحمد كاشير (نقطة البيع)', 'cashier', '01122334455', '123456', 1),
            ('usr-store', 'storekeeper', 'محمود أمين المخزن والتجميع', 'storekeeper', '01233445566', '123456', 1)");
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = :username AND is_active = 1");
    $stmt->execute(['username' => $username]);
    $user = $stmt->fetch();

    if ($user && ($user['password_hash'] === $password || password_verify($password, $user['password_hash']))) {
        unset($user['password_hash']);
        echo json_encode([
            'success' => true,
            'message' => 'تم تسجيل الدخول بنجاح',
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'name' => $user['name'],
                'role' => $user['role'],
                'phone' => $user['phone'],
                'isActive' => (bool)$user['is_active'],
                'createdAt' => $user['created_at']
            ]
        ], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode(['success' => false, 'message' => 'اسم المستخدم أو كلمة المرور غير صحيحة']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'خطأ أثناء تسجيل الدخول: ' . $e->getMessage()]);
}
?>
