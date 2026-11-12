<?php
// purchase_returns.php - Handle Purchase Return Invoices API (CRUD)
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

        $id = $input['id'] ?? ('pret-' . time());
        $returnNumber = $input['returnNumber'] ?? ('PRET-' . rand(100000, 999999));
        $originalInvoiceNumber = $input['originalInvoiceNumber'] ?? null;
        $date = toMysqlDateTime($input['date'] ?? null);
        $supplierId = $input['supplierId'] ?? '';
        $supplierName = $input['supplierName'] ?? 'مورد عام';
        $total = (float)($input['total'] ?? 0);
        $paidAmount = (float)($input['paidAmount'] ?? 0);
        $remainingAmount = (float)($input['remainingAmount'] ?? 0);
        $refundMethod = $input['refundMethod'] ?? 'credit';
        $safeId = $input['safeId'] ?? 'safe-main';
        $notes = $input['notes'] ?? null;
        $items = $input['items'] ?? [];

        $pdo->beginTransaction();

        $stmt = $pdo->prepare("
            INSERT INTO purchase_returns (id, return_number, original_invoice_number, date, supplier_id, supplier_name, total, paid_amount, remaining_amount, refund_method, safe_id, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE total = VALUES(total), paid_amount = VALUES(paid_amount), remaining_amount = VALUES(remaining_amount), notes = VALUES(notes)
        ");
        $stmt->execute([$id, $returnNumber, $originalInvoiceNumber, $date, $supplierId, $supplierName, $total, $paidAmount, $remainingAmount, $refundMethod, $safeId, $notes]);

        $pdo->prepare("DELETE FROM purchase_return_items WHERE return_id = ?")->execute([$id]);
        $stmtItem = $pdo->prepare("INSERT INTO purchase_return_items (return_id, product_id, product_name, unit, unit_price, quantity, total) VALUES (?, ?, ?, ?, ?, ?, ?)");
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
        echo json_encode(['success' => true, 'id' => $id, 'message' => 'تم حفظ مرتجع المشتريات بنجاح'], JSON_UNESCAPED_UNICODE);

    } elseif ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = $_GET['id'] ?? $input['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'معرف المرتجع مطلوب'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $pdo->beginTransaction();
        $pdo->prepare("DELETE FROM purchase_return_items WHERE return_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM purchase_returns WHERE id = ?")->execute([$id]);
        $pdo->commit();

        echo json_encode(['success' => true, 'message' => 'تم حذف مرتجع المشتريات بنجاح'], JSON_UNESCAPED_UNICODE);
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
