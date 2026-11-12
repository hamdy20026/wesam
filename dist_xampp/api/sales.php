<?php
// sales.php - Electrical Sales Invoices API for XAMPP MySQL
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents('php://input'), true);

try {
    if ($method === 'POST') {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("
            INSERT INTO sales_invoices (id, invoice_number, date, customer_id, customer_name, customer_phone, subtotal, discount, total, paid_amount, remaining_amount, payment_method, safe_id, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                date = VALUES(date), total = VALUES(total), paid_amount = VALUES(paid_amount), remaining_amount = VALUES(remaining_amount), status = VALUES(status), notes = VALUES(notes)
        ");
        
        $stmt->execute([
            $data['id'],
            $data['invoiceNumber'] ?? $data['id'],
            toMysqlDateTime($data['date'] ?? null),
            $data['customerId'] ?? 'walk-in',
            $data['customerName'] ?? 'عميل نقدي عام',
            $data['customerPhone'] ?? null,
            (float)($data['subtotal'] ?? $data['total'] ?? 0),
            (float)($data['discount'] ?? 0),
            (float)($data['total'] ?? 0),
            (float)($data['paidAmount'] ?? 0),
            (float)($data['remainingAmount'] ?? 0),
            $data['paymentMethod'] ?? 'cash',
            $data['safeId'] ?? 'safe-pos',
            $data['status'] ?? 'completed',
            $data['notes'] ?? null
        ]);

        if (!empty($data['items']) && is_array($data['items'])) {
            $pdo->prepare("DELETE FROM sales_invoice_items WHERE invoice_id = ?")->execute([$data['id']]);

            $stmtItem = $pdo->prepare("
                INSERT INTO sales_invoice_items (invoice_id, product_id, product_name, category, brand, unit, unit_price, purchase_cost, quantity, discount, discount_type, total)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmtDeduct = $pdo->prepare("UPDATE products SET quantity = GREATEST(0, quantity - ?) WHERE id = ?");

            foreach ($data['items'] as $item) {
                $stmtItem->execute([
                    $data['id'],
                    $item['productId'] ?? '',
                    $item['productName'] ?? '',
                    $item['category'] ?? 'wires_cables',
                    $item['brand'] ?? null,
                    $item['unit'] ?? 'قطعة',
                    (float)($item['unitPrice'] ?? 0),
                    (float)($item['purchaseCost'] ?? 0),
                    (float)($item['quantity'] ?? 1),
                    (float)($item['discount'] ?? 0),
                    $item['discountType'] ?? 'fixed',
                    (float)($item['total'] ?? 0)
                ]);

                // Auto deduct product stock in MySQL
                $stmtDeduct->execute([(float)($item['quantity'] ?? 1), $item['productId'] ?? '']);
            }
        }

        // Auto update safe balance if cash/drawer payment
        if (($data['paidAmount'] ?? 0) > 0 && !empty($data['safeId'])) {
            $stmtSafe = $pdo->prepare("UPDATE safes SET balance = balance + ? WHERE id = ?");
            $stmtSafe->execute([(float)$data['paidAmount'], $data['safeId']]);
        }

        // Auto update customer balance in XAMPP MySQL if remaining amount > 0
        if (($data['remainingAmount'] ?? 0) > 0 && !empty($data['customerId']) && $data['customerId'] !== 'walk-in') {
            $stmtCust = $pdo->prepare("UPDATE customers SET current_balance = current_balance + ? WHERE id = ?");
            $stmtCust->execute([(float)$data['remainingAmount'], $data['customerId']]);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'تم حفظ فاتورة المبيعات وتحديث المخزون والخزينة وحساب العميل بنجاح'], JSON_UNESCAPED_UNICODE);
    } elseif ($method === 'DELETE') {
        $id = $_GET['id'] ?? $data['id'] ?? null;
        if ($id) {
            $pdo->beginTransaction();
            $pdo->prepare("DELETE FROM sales_invoice_items WHERE invoice_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM sales_invoices WHERE id = ?")->execute([$id]);
            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'تم حذف فاتورة المبيعات بنجاح'], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'معرف الفاتورة غير محدد'], JSON_UNESCAPED_UNICODE);
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
