<?php
// settings.php - Store Settings API for XAMPP MySQL
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT * FROM settings LIMIT 1");
        $s = $stmt->fetch();
        if ($s) {
            echo json_encode([
                'success' => true,
                'data' => [
                    'storeName' => $s['store_name'],
                    'ownerName' => $s['owner_name'] ?? '',
                    'phone' => $s['phone'] ?? '',
                    'phoneAlt' => $s['phone_alt'] ?? '',
                    'address' => $s['address'] ?? '',
                    'commercialRecord' => $s['commercial_record'] ?? '',
                    'agriculturalLicense' => $s['agricultural_license'] ?? '',
                    'taxRate' => (float)($s['tax_rate'] ?? 0),
                    'currency' => $s['currency'] ?? 'ج.م',
                    'invoiceFooterNote' => $s['invoice_footer_note'] ?? '',
                    'permissionsMatrix' => !empty($s['permissions_matrix']) ? json_decode($s['permissions_matrix'], true) : null
                ]
            ], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode(['success' => true, 'data' => null]);
        }
        exit();
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if ($method === 'POST' || $method === 'PUT') {
        $stmt = $pdo->prepare("
            INSERT INTO settings (id, store_name, owner_name, phone, phone_alt, address, commercial_record, agricultural_license, tax_rate, currency, invoice_footer_note, permissions_matrix)
            VALUES (1, :storeName, :ownerName, :phone, :phoneAlt, :address, :cr, :license, :taxRate, :currency, :footer, :matrix)
            ON DUPLICATE KEY UPDATE
                store_name = VALUES(store_name),
                owner_name = VALUES(owner_name),
                phone = VALUES(phone),
                phone_alt = VALUES(phone_alt),
                address = VALUES(address),
                commercial_record = VALUES(commercial_record),
                agricultural_license = VALUES(agricultural_license),
                tax_rate = VALUES(tax_rate),
                currency = VALUES(currency),
                invoice_footer_note = VALUES(invoice_footer_note),
                permissions_matrix = VALUES(permissions_matrix)
        ");
        $stmt->execute([
            ':storeName' => $data['storeName'] ?? 'وسام للأدوات والتوريدات الكهربائية',
            ':ownerName' => $data['ownerName'] ?? 'مؤسسة وسام للأدوات الكهربائية',
            ':phone' => $data['phone'] ?? '',
            ':phoneAlt' => $data['phoneAlt'] ?? '',
            ':address' => $data['address'] ?? '',
            ':cr' => $data['commercialRecord'] ?? '',
            ':license' => $data['agriculturalLicense'] ?? '',
            ':taxRate' => $data['taxRate'] ?? 0,
            ':currency' => $data['currency'] ?? 'ج.م',
            ':footer' => $data['invoiceFooterNote'] ?? '',
            ':matrix' => !empty($data['permissionsMatrix']) ? json_encode($data['permissionsMatrix'], JSON_UNESCAPED_UNICODE) : null
        ]);

        echo json_encode(['success' => true, 'message' => 'تم حفظ إعدادات المنظومة في قاعدة البيانات بنجاح'], JSON_UNESCAPED_UNICODE);
    }
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
