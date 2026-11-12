<?php
// products.php - Electrical Products CRUD API for XAMPP
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents('php://input'), true);

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT id, name, category, brand, voltage, power_watt as powerWatt, amperage, warranty_months as warrantyMonths, barcode, unit, purchase_price as purchasePrice, selling_price as sellingPrice, wholesale_price as wholesalePrice, quantity, min_alert_quantity as minAlertQuantity, batch_number as batchNumber, expiry_date as expiryDate, supplier_id as supplierId, is_composite as isComposite, recipe_id as recipeId, is_weighable as isWeighable, tare_weight as tareWeight, notes, created_at as createdAt FROM products ORDER BY created_at DESC");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
    } elseif ($method === 'POST') {
        $stmt = $pdo->prepare("
            INSERT INTO products (id, name, category, brand, voltage, power_watt, amperage, warranty_months, barcode, unit, purchase_price, selling_price, wholesale_price, quantity, min_alert_quantity, batch_number, expiry_date, supplier_id, is_composite, recipe_id, is_weighable, tare_weight, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name), category = VALUES(category), brand = VALUES(brand), voltage = VALUES(voltage),
                power_watt = VALUES(power_watt), amperage = VALUES(amperage), warranty_months = VALUES(warranty_months),
                barcode = VALUES(barcode), unit = VALUES(unit), purchase_price = VALUES(purchase_price), selling_price = VALUES(selling_price),
                wholesale_price = VALUES(wholesale_price), quantity = VALUES(quantity), min_alert_quantity = VALUES(min_alert_quantity),
                batch_number = VALUES(batch_number), expiry_date = VALUES(expiry_date), supplier_id = VALUES(supplier_id),
                notes = VALUES(notes)
        ");
        $stmt->execute([
            $data['id'],
            $data['name'] ?? '',
            $data['category'] ?? 'wires_cables',
            !empty($data['brand']) ? $data['brand'] : null,
            !empty($data['voltage']) ? $data['voltage'] : null,
            !empty($data['powerWatt']) ? $data['powerWatt'] : null,
            !empty($data['amperage']) ? $data['amperage'] : null,
            (int)($data['warrantyMonths'] ?? 0),
            !empty($data['barcode']) ? $data['barcode'] : $data['id'],
            $data['unit'] ?? 'قطعة',
            (float)($data['purchasePrice'] ?? 0),
            (float)($data['sellingPrice'] ?? 0),
            (float)($data['wholesalePrice'] ?? 0),
            (float)($data['quantity'] ?? 0),
            (float)($data['minAlertQuantity'] ?? 5),
            !empty($data['batchNumber']) ? $data['batchNumber'] : null,
            toMysqlDate($data['expiryDate'] ?? null),
            !empty($data['supplierId']) ? $data['supplierId'] : null,
            !empty($data['isComposite']) ? 1 : 0,
            !empty($data['recipeId']) ? $data['recipeId'] : null,
            !empty($data['isWeighable']) ? 1 : 0,
            (float)($data['tareWeight'] ?? 0),
            $data['notes'] ?? null
        ]);
        echo json_encode(['success' => true, 'message' => 'تم حفظ الصنف بنجاح في قاعدة البيانات', 'id' => $data['id']], JSON_UNESCAPED_UNICODE);
    } elseif ($method === 'PUT') {
        $stmt = $pdo->prepare("
            UPDATE products SET
                name = ?, category = ?, brand = ?, voltage = ?, power_watt = ?, amperage = ?,
                warranty_months = ?, barcode = ?, unit = ?, purchase_price = ?, selling_price = ?,
                wholesale_price = ?, quantity = ?, min_alert_quantity = ?, batch_number = ?,
                expiry_date = ?, supplier_id = ?, is_composite = ?, recipe_id = ?,
                is_weighable = ?, tare_weight = ?, notes = ?
            WHERE id = ?
        ");
        $stmt->execute([
            $data['name'] ?? '',
            $data['category'] ?? 'wires_cables',
            !empty($data['brand']) ? $data['brand'] : null,
            !empty($data['voltage']) ? $data['voltage'] : null,
            !empty($data['powerWatt']) ? $data['powerWatt'] : null,
            !empty($data['amperage']) ? $data['amperage'] : null,
            (int)($data['warrantyMonths'] ?? 0),
            !empty($data['barcode']) ? $data['barcode'] : $data['id'],
            $data['unit'] ?? 'قطعة',
            (float)($data['purchasePrice'] ?? 0),
            (float)($data['sellingPrice'] ?? 0),
            (float)($data['wholesalePrice'] ?? 0),
            (float)($data['quantity'] ?? 0),
            (float)($data['minAlertQuantity'] ?? 5),
            !empty($data['batchNumber']) ? $data['batchNumber'] : null,
            toMysqlDate($data['expiryDate'] ?? null),
            !empty($data['supplierId']) ? $data['supplierId'] : null,
            !empty($data['isComposite']) ? 1 : 0,
            !empty($data['recipeId']) ? $data['recipeId'] : null,
            !empty($data['isWeighable']) ? 1 : 0,
            (float)($data['tareWeight'] ?? 0),
            $data['notes'] ?? null,
            $data['id']
        ]);
        echo json_encode(['success' => true, 'message' => 'تم تعديل بيانات الصنف بنجاح', 'id' => $data['id']], JSON_UNESCAPED_UNICODE);
    } elseif ($method === 'DELETE') {
        $id = $_GET['id'] ?? $data['id'] ?? null;
        if (!empty($data['ids']) && is_array($data['ids'])) {
            $placeholders = implode(',', array_fill(0, count($data['ids']), '?'));
            $stmt = $pdo->prepare("DELETE FROM products WHERE id IN ({$placeholders})");
            $stmt->execute($data['ids']);
            echo json_encode(['success' => true, 'message' => 'تم حذف الأصناف المحددة بنجاح من قاعدة البيانات'], JSON_UNESCAPED_UNICODE);
        } elseif ($id) {
            $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'تم حذف الصنف بنجاح من قاعدة البيانات'], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'معرف الصنف غير محدد'], JSON_UNESCAPED_UNICODE);
        }
    }
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
