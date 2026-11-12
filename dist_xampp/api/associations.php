<?php
// associations.php - XAMPP Money Associations CRUD API
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents('php://input'), true);

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT id, name, organizer, total_amount as totalAmount, monthly_installment as monthlyInstallment, total_months as totalMonths, paid_months as paidMonths, payout_turn_month as payoutTurnMonth, payout_date as payoutDate, status, safe_id as safeId, start_date as startDate, notes FROM money_associations");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
    } elseif ($method === 'POST') {
        $stmt = $pdo->prepare("INSERT INTO money_associations (id, name, organizer, total_amount, monthly_installment, total_months, paid_months, payout_turn_month, payout_date, status, safe_id, start_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), organizer=VALUES(organizer), total_amount=VALUES(total_amount), monthly_installment=VALUES(monthly_installment), total_months=VALUES(total_months), paid_months=VALUES(paid_months), payout_turn_month=VALUES(payout_turn_month), payout_date=VALUES(payout_date), status=VALUES(status), safe_id=VALUES(safe_id), start_date=VALUES(start_date), notes=VALUES(notes)");
        $stmt->execute([
            $data['id'],
            $data['name'],
            $data['organizer'] ?? '',
            $data['totalAmount'] ?? 0,
            $data['monthlyInstallment'] ?? 0,
            $data['totalMonths'] ?? 10,
            $data['paidMonths'] ?? 0,
            $data['payoutTurnMonth'] ?? 1,
            $data['payoutDate'] ?? null,
            $data['status'] ?? 'active',
            $data['safeId'] ?? 'safe-main',
            $data['startDate'] ?? date('Y-m-d'),
            $data['notes'] ?? null
        ]);
        echo json_encode(['success' => true, 'message' => 'تم حفظ الجمعية بنجاح']);
    } elseif ($method === 'PUT') {
        $stmt = $pdo->prepare("UPDATE money_associations SET name=?, organizer=?, total_amount=?, monthly_installment=?, total_months=?, paid_months=?, payout_turn_month=?, payout_date=?, status=?, safe_id=?, start_date=?, notes=? WHERE id=?");
        $stmt->execute([
            $data['name'],
            $data['organizer'] ?? '',
            $data['totalAmount'] ?? 0,
            $data['monthlyInstallment'] ?? 0,
            $data['totalMonths'] ?? 10,
            $data['paidMonths'] ?? 0,
            $data['payoutTurnMonth'] ?? 1,
            $data['payoutDate'] ?? null,
            $data['status'] ?? 'active',
            $data['safeId'] ?? 'safe-main',
            $data['startDate'] ?? date('Y-m-d'),
            $data['notes'] ?? null,
            $data['id']
        ]);
        echo json_encode(['success' => true, 'message' => 'تم تعديل بيانات الجمعية']);
    } elseif ($method === 'DELETE') {
        $id = $_GET['id'] ?? $data['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare("DELETE FROM money_associations WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'تم حذف الجمعية بنجاح']);
        }
    }
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
