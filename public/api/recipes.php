<?php
// recipes.php - XAMPP Assembly Recipes CRUD API
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents('php://input'), true);

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT id, name, output_product_id as outputProductId, output_product_name as outputProductName, output_quantity as outputQuantity, output_unit as outputUnit, labor_cost as laborCost, total_estimated_cost as totalEstimatedCost, notes FROM assembly_recipes");
        $recipes = $stmt->fetchAll();
        foreach ($recipes as &$r) {
            $itemStmt = $pdo->prepare("SELECT product_id as productId, product_name as productName, quantity, unit, unit_cost as unitCost, total_cost as totalCost FROM assembly_recipe_items WHERE recipe_id = ?");
            $itemStmt->execute([$r['id']]);
            $r['items'] = $itemStmt->fetchAll();
        }
        echo json_encode(['success' => true, 'data' => $recipes], JSON_UNESCAPED_UNICODE);
    } elseif ($method === 'POST') {
        $stmt = $pdo->prepare("INSERT INTO assembly_recipes (id, name, output_product_id, output_product_name, output_quantity, output_unit, labor_cost, total_estimated_cost, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), output_product_id=VALUES(output_product_id), output_product_name=VALUES(output_product_name), output_quantity=VALUES(output_quantity), output_unit=VALUES(output_unit), labor_cost=VALUES(labor_cost), total_estimated_cost=VALUES(total_estimated_cost), notes=VALUES(notes)");
        $stmt->execute([
            $data['id'],
            $data['name'],
            $data['outputProductId'],
            $data['outputProductName'],
            $data['outputQuantity'] ?? 1,
            $data['outputUnit'] ?? 'قطعة',
            $data['laborCost'] ?? 0,
            $data['totalEstimatedCost'] ?? 0,
            $data['notes'] ?? null
        ]);
        if (!empty($data['items']) && is_array($data['items'])) {
            $pdo->prepare("DELETE FROM assembly_recipe_items WHERE recipe_id = ?")->execute([$data['id']]);
            $ins = $pdo->prepare("INSERT INTO assembly_recipe_items (recipe_id, product_id, product_name, quantity, unit, unit_cost, total_cost) VALUES (?, ?, ?, ?, ?, ?, ?)");
            foreach ($data['items'] as $it) {
                $ins->execute([
                    $data['id'],
                    $it['productId'],
                    $it['productName'],
                    $it['quantity'] ?? 1,
                    $it['unit'] ?? 'قطعة',
                    $it['unitCost'] ?? 0,
                    $it['totalCost'] ?? 0
                ]);
            }
        }
        echo json_encode(['success' => true, 'message' => 'تم حفظ وصفة التجميع بنجاح']);
    } elseif ($method === 'DELETE') {
        $id = $_GET['id'] ?? $data['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare("DELETE FROM assembly_recipes WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'تم حذف وصفة التجميع بنجاح']);
        }
    }
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
