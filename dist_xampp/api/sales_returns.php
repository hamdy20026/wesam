<?php
// sales_returns.php - Handle Sales Return Invoices API (CRUD)
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'بيانات غير صالحة'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $id = $input['id'] ?? ('sret-' . time());
        $returnNumber = $input['returnNumber'] ?? ('SRET-' . rand(100000, 999999));
        $originalInvoiceNumber = $input['originalInvoiceNumber'] ?? null;
        $date = toMysqlDateTime($input['date'] ?? null);
        $customerId = $input['customerId'] ?? 'walk-in';
        $customerName = $input['customerName'] ?? 'عميل نقدي عام';
        $total = (float)($input['total'] ?? 0);
        $paidAmount = (float)($input['paidAmount'] ?? 0);
        $remainingAmount = (float)($input['remainingAmount'] ?? 0);
        $refundMethod = $input['refundMethod'] ?? 'cash';
        $safeId = $input['safeId'] ?? 'safe-pos';
        $notes = $input['notes'] ?? null;
        $items = $input['items'] ?? [];

        $pdo->beginTransaction();

        $stmt = $pdo->prepare("
            INSERT INTO sales_returns (id, return_number, original_invoice_number, date, customer_id, customer_name, total, paid_amount, remaining_amount, refund_method, safe_id, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE total = VALUES(total), paid_amount = VALUES(paid_amount), remaining_amount = VALUES(remaining_amount), notes = VALUES(notes)
        ");
        $stmt->execute([$id, $returnNumber, $originalInvoiceNumber, $date, $customerId, $customerName, $total, $paidAmount, $remainingAmount, $refundMethod, $safeId, $notes]);

        $pdo->prepare("DELETE FROM sales_return_items WHERE return_id = ?")->execute([$id]);
        $stmtItem = $pdo->prepare("INSERT INTO sales_return_items (return_id, product_id, product_name, unit, unit_price, quantity, total) VALUES (?, ?, ?, ?, ?, ?, ?)");
        foreach ($items as $item) {
            $stmtItem->execute([
                $id,
                $item['productId'] ?? '',
                $item['productName'] ?? '',
                $item['unit'] ?? 'قطعة',
                (float)($item['unitPrice'] ?? 0),
                (float)($item['quantity'] ?? 1),
                (float)($item['total'] ?? 0)
            ]);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'id' => $id, 'message' => 'تم حفظ مرتجع المبيعات بنجاح'], JSON_UNESCAPED_UNICODE);

    } elseif ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = $_GET['id'] ?? $input['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'معرف المرتجع مطلوب'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $pdo->beginTransaction();
        $pdo->prepare("DELETE FROM sales_return_items WHERE return_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM sales_returns WHERE id = ?")->execute([$id]);
        $pdo->commit();

        echo json_encode(['success' => true, 'message' => 'تم حذف مرتجع المبيعات بنجاح'], JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'طريقة الطلب غير مسموحة'], JSON_UNESCAPED_UNICODE);
    }
} catch (\Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'خطأ في الخادم: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
