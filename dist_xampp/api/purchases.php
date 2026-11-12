<?php
// purchases.php - Electrical Purchase Invoices API for XAMPP MySQL
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents('php://input'), true);

try {
    if ($method === 'POST') {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("
            INSERT INTO purchase_invoices (id, invoice_number, date, supplier_id, supplier_name, total, paid_amount, remaining_amount, payment_method, safe_id, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                date = VALUES(date), total = VALUES(total), paid_amount = VALUES(paid_amount), remaining_amount = VALUES(remaining_amount), status = VALUES(status), notes = VALUES(notes)
        ");
        
        $stmt->execute([
            $data['id'],
            $data['invoiceNumber'] ?? $data['id'],
            toMysqlDateTime($data['date'] ?? null),
            $data['supplierId'] ?? '',
            $data['supplierName'] ?? 'مورد معتمد',
            (float)($data['total'] ?? 0),
            (float)($data['paidAmount'] ?? 0),
            (float)($data['remainingAmount'] ?? 0),
            $data['paymentMethod'] ?? 'credit',
            $data['safeId'] ?? 'safe-main',
            $data['status'] ?? 'completed',
            $data['notes'] ?? null
        ]);

        if (!empty($data['items']) && is_array($data['items'])) {
            $pdo->prepare("DELETE FROM purchase_invoice_items WHERE invoice_id = ?")->execute([$data['id']]);

            $stmtItem = $pdo->prepare("
                INSERT INTO purchase_invoice_items (invoice_id, product_id, product_name, unit, unit_price, quantity, discount, discount_type, total, batch_number, expiry_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmtStock = $pdo->prepare("UPDATE products SET quantity = quantity + ?, purchase_price = ? WHERE id = ?");

            foreach ($data['items'] as $item) {
                $stmtItem->execute([
                    $data['id'],
                    $item['productId'] ?? '',
                    $item['productName'] ?? '',
                    $item['unit'] ?? 'قطعة',
                    (float)($item['unitPrice'] ?? 0),
                    (float)($item['quantity'] ?? 1),
                    (float)($item['discount'] ?? 0),
                    $item['discountType'] ?? 'fixed',
                    (float)($item['total'] ?? 0),
                    !empty($item['batchNumber']) ? $item['batchNumber'] : null,
                    toMysqlDate($item['expiryDate'] ?? null)
                ]);

                // Auto increase stock in MySQL
                $stmtStock->execute([(float)($item['quantity'] ?? 1), (float)($item['unitPrice'] ?? 0), $item['productId'] ?? '']);
            }
        }

        // Auto deduct from safe if paid
        if (($data['paidAmount'] ?? 0) > 0 && !empty($data['safeId'])) {
            $stmtSafe = $pdo->prepare("UPDATE safes SET balance = GREATEST(0, balance - ?) WHERE id = ?");
            $stmtSafe->execute([(float)$data['paidAmount'], $data['safeId']]);
        }

        // Auto update supplier balance if remaining > 0
        if (($data['remainingAmount'] ?? 0) > 0 && !empty($data['supplierId'])) {
            $stmtSup = $pdo->prepare("UPDATE suppliers SET current_balance = current_balance + ? WHERE id = ?");
            $stmtSup->execute([(float)$data['remainingAmount'], $data['supplierId']]);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'تم تسجيل فاتورة التوريد وتحديث المخزون والخزينة وحساب المورد بنجاح'], JSON_UNESCAPED_UNICODE);
    } elseif ($method === 'DELETE') {
        $id = $_GET['id'] ?? $data['id'] ?? null;
        if ($id) {
            $pdo->beginTransaction();
            $pdo->prepare("DELETE FROM purchase_invoice_items WHERE invoice_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM purchase_invoices WHERE id = ?")->execute([$id]);
            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'تم حذف فاتورة المشتريات بنجاح'], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'المعرف غير محدد'], JSON_UNESCAPED_UNICODE);
        }
    }
} catch (\Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
