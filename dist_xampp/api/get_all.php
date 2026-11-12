<?php
// get_all.php - Fetch complete application data safely from XAMPP MySQL Database
require_once __DIR__ . '/config.php';

try {
    ensureTablesExist($pdo, false);
} catch (\Throwable $ex) {}

$response = [
    'users' => [],
    'settings' => null,
    'safes' => [],
    'safeTransfers' => [],
    'suppliers' => [],
    'customers' => [],
    'products' => [],
    'salesInvoices' => [],
    'purchaseInvoices' => [],
    'salesReturns' => [],
    'purchaseReturns' => [],
    'expenses' => [],
    'transactions' => [],
    'shifts' => [],
    'recipes' => [],
    'assemblyOperations' => [],
    'associations' => [],
    'wasteRecords' => [],
    'savedAudits' => [],
    'previouslyAuditedMap' => (object)[]
];

// 1. Users
try {
    $stmtUsers = $pdo->query("SELECT * FROM users ORDER BY created_at ASC");
    $rawUsers = $stmtUsers->fetchAll();
    $users = [];
    foreach ($rawUsers as $u) {
        $users[] = [
            'id' => $u['id'],
            'username' => $u['username'],
            'name' => $u['name'],
            'role' => $u['role'] ?? 'cashier',
            'phone' => $u['phone'] ?? '',
            'passwordHash' => $u['password_hash'] ?? '123456',
            'isActive' => !empty($u['is_active']),
            'createdAt' => $u['created_at'] ?? date('c')
        ];
    }
    $response['users'] = $users;
} catch (\Throwable $e) {}

// 2. Settings
try {
    $stmtSettings = $pdo->query("SELECT * FROM settings LIMIT 1");
    $s = $stmtSettings->fetch();
    if ($s) {
        $response['settings'] = [
            'storeName' => $s['store_name'] ?? 'وسام للأدوات والتوريدات الكهربائية',
            'ownerName' => $s['owner_name'] ?? 'مؤسسة وسام للأدوات الكهربائية',
            'phone' => $s['phone'] ?? '01000000001',
            'phoneAlt' => $s['phone_alt'] ?? '01200000002',
            'address' => $s['address'] ?? 'القاهرة - السبتية - شارع سوق الكهرباء',
            'commercialRecord' => $s['commercial_record'] ?? 'س.ت: 894520 / ب.ض: 432-876-100',
            'agriculturalLicense' => $s['agricultural_license'] ?? 'سجل تجاري توريدات كهربائية ومقاولات',
            'taxRate' => (float)($s['tax_rate'] ?? 0),
            'currency' => $s['currency'] ?? 'ج.م',
            'invoiceFooterNote' => $s['invoice_footer_note'] ?? 'شكراً لتعاملكم مع وسام للأدوات الكهربائية • بضاعة أصلية وضمان معتمد',
            'permissionsMatrix' => !empty($s['permissions_matrix']) ? json_decode($s['permissions_matrix'], true) : null
        ];
    }
} catch (\Throwable $e) {}

if (!$response['settings']) {
    $response['settings'] = [
        'storeName' => 'وسام للأدوات والتوريدات الكهربائية',
        'ownerName' => 'مؤسسة وسام للأدوات الكهربائية',
        'phone' => '01000000001',
        'phoneAlt' => '01200000002',
        'address' => 'القاهرة - السبتية - شارع سوق الكهرباء',
        'commercialRecord' => 'س.ت: 894520 / ب.ض: 432-876-100',
        'agriculturalLicense' => 'سجل تجاري توريدات كهربائية ومقاولات',
        'taxRate' => 0,
        'currency' => 'ج.م',
        'invoiceFooterNote' => 'شكراً لتعاملكم مع وسام للأدوات الكهربائية • بضاعة أصلية وضمان معتمد'
    ];
}

// 3. Safes
try {
    $stmtSafes = $pdo->query("SELECT * FROM safes ORDER BY is_default DESC, id ASC");
    $rawSafes = $stmtSafes->fetchAll();
    $safes = [];
    foreach ($rawSafes as $sf) {
        $safes[] = [
            'id' => $sf['id'],
            'name' => $sf['name'],
            'type' => $sf['type'] ?? 'cash',
            'balance' => (float)($sf['balance'] ?? 0),
            'accountNumber' => $sf['account_number'] ?? null,
            'isDefault' => !empty($sf['is_default']),
            'notes' => $sf['notes'] ?? ''
        ];
    }
    $response['safes'] = $safes;
} catch (\Throwable $e) {}

// 4. Safe Transfers
try {
    $stmtST = $pdo->query("SELECT * FROM safe_transfers ORDER BY date DESC");
    $rawST = $stmtST->fetchAll();
    $sts = [];
    foreach ($rawST as $st) {
        $sts[] = [
            'id' => $st['id'],
            'transferNumber' => $st['transfer_number'] ?? '',
            'date' => $st['date'],
            'fromSafeId' => $st['from_safe_id'],
            'fromSafeName' => $st['from_safe_name'],
            'toSafeId' => $st['to_safe_id'],
            'toSafeName' => $st['to_safe_name'],
            'amount' => (float)$st['amount'],
            'performedBy' => $st['performed_by'],
            'notes' => $st['notes'] ?? ''
        ];
    }
    $response['safeTransfers'] = $sts;
} catch (\Throwable $e) {}

// 5. Suppliers
try {
    $stmtSuppliers = $pdo->query("SELECT * FROM suppliers ORDER BY created_at DESC");
    $rawS = $stmtSuppliers->fetchAll();
    $suppliers = [];
    foreach ($rawS as $s) {
        $suppliers[] = [
            'id' => $s['id'],
            'name' => $s['name'],
            'companyName' => $s['company_name'] ?? $s['name'],
            'representativeName' => $s['representative_name'] ?? '',
            'phone' => $s['phone'] ?? '',
            'address' => $s['address'] ?? '',
            'suppliedCategories' => $s['supplied_categories'] ?? '',
            'initialBalance' => (float)($s['initial_balance'] ?? 0),
            'currentBalance' => (float)($s['current_balance'] ?? 0),
            'notes' => $s['notes'] ?? '',
            'createdAt' => $s['created_at'] ?? date('c')
        ];
    }
    $response['suppliers'] = $suppliers;
} catch (\Throwable $e) {}

// 6. Customers
try {
    $stmtCustomers = $pdo->query("SELECT * FROM customers ORDER BY CASE WHEN id = 'walk-in' THEN 0 ELSE 1 END, created_at DESC");
    $rawC = $stmtCustomers->fetchAll();
    $customers = [];
    foreach ($rawC as $c) {
        $customers[] = [
            'id' => $c['id'],
            'code' => $c['code'] ?? '',
            'name' => $c['name'],
            'phone' => $c['phone'] ?? '',
            'address' => $c['address'] ?? '',
            'customerType' => $c['customer_type'] ?? 'retail',
            'commercialRecord' => $c['commercial_record'] ?? '',
            'initialBalance' => (float)($c['initial_balance'] ?? 0),
            'currentBalance' => (float)($c['current_balance'] ?? 0),
            'creditLimit' => (float)($c['credit_limit'] ?? 50000),
            'cropTypes' => $c['crop_types'] ?? '',
            'farmArea' => $c['farm_area'] ?? '',
            'notes' => $c['notes'] ?? '',
            'createdAt' => $c['created_at'] ?? date('c')
        ];
    }
    $response['customers'] = $customers;
} catch (\Throwable $e) {}

// 7. Products (Electrical ERP fields)
try {
    $stmtProducts = $pdo->query("SELECT * FROM products ORDER BY created_at DESC");
    $rawProducts = $stmtProducts->fetchAll();
    $products = [];
    foreach ($rawProducts as $p) {
        $products[] = [
            'id' => $p['id'],
            'name' => $p['name'],
            'category' => $p['category'] ?? 'wires_cables',
            'brand' => $p['brand'] ?? '',
            'voltage' => $p['voltage'] ?? '',
            'powerWatt' => $p['power_watt'] ?? '',
            'amperage' => $p['amperage'] ?? '',
            'warrantyMonths' => (int)($p['warranty_months'] ?? 0),
            'barcode' => $p['barcode'] ?? $p['id'],
            'unit' => $p['unit'] ?? 'قطعة',
            'purchasePrice' => (float)($p['purchase_price'] ?? 0),
            'sellingPrice' => (float)($p['selling_price'] ?? 0),
            'wholesalePrice' => (float)($p['wholesale_price'] ?? 0),
            'quantity' => (float)($p['quantity'] ?? 0),
            'minAlertQuantity' => (float)($p['min_alert_quantity'] ?? 5),
            'batchNumber' => $p['batch_number'] ?? '',
            'expiryDate' => $p['expiry_date'] ?? '',
            'supplierId' => $p['supplier_id'] ?? '',
            'isComposite' => !empty($p['is_composite']),
            'recipeId' => $p['recipe_id'] ?? null,
            'isWeighable' => !empty($p['is_weighable']),
            'tareWeight' => (float)($p['tare_weight'] ?? 0),
            'notes' => $p['notes'] ?? '',
            'createdAt' => $p['created_at'] ?? date('c')
        ];
    }
    $response['products'] = $products;
} catch (\Throwable $e) {}

// 8. Sales Invoices
try {
    $stmtSales = $pdo->query("SELECT * FROM sales_invoices ORDER BY date DESC");
    $rawSales = $stmtSales->fetchAll();
    $salesInvoices = [];
    foreach ($rawSales as $inv) {
        $items = [];
        try {
            $stmtItems = $pdo->prepare("SELECT * FROM sales_invoice_items WHERE invoice_id = ?");
            $stmtItems->execute([$inv['id']]);
            $rawItems = $stmtItems->fetchAll();
            foreach ($rawItems as $it) {
                $items[] = [
                    'productId' => $it['product_id'],
                    'productName' => $it['product_name'],
                    'category' => $it['category'] ?? 'wires_cables',
                    'brand' => $it['brand'] ?? '',
                    'unit' => $it['unit'] ?? 'قطعة',
                    'unitPrice' => (float)($it['unit_price'] ?? 0),
                    'purchaseCost' => (float)($it['purchase_cost'] ?? 0),
                    'quantity' => (float)($it['quantity'] ?? 1),
                    'discount' => (float)($it['discount'] ?? 0),
                    'discountType' => $it['discount_type'] ?? 'fixed',
                    'total' => (float)($it['total'] ?? 0)
                ];
            }
        } catch (\Throwable $ex) {}

        $salesInvoices[] = [
            'id' => $inv['id'],
            'invoiceNumber' => $inv['invoice_number'],
            'date' => $inv['date'],
            'customerId' => $inv['customer_id'] ?? 'walk-in',
            'customerName' => $inv['customer_name'] ?? 'عميل نقدي عام',
            'customerPhone' => $inv['customer_phone'] ?? '',
            'subtotal' => (float)($inv['subtotal'] ?? 0),
            'discount' => (float)($inv['discount'] ?? 0),
            'total' => (float)($inv['total'] ?? 0),
            'paidAmount' => (float)($inv['paid_amount'] ?? 0),
            'remainingAmount' => (float)($inv['remaining_amount'] ?? 0),
            'paymentMethod' => $inv['payment_method'] ?? 'cash',
            'safeId' => $inv['safe_id'] ?? 'safe-pos',
            'status' => $inv['status'] ?? 'completed',
            'notes' => $inv['notes'] ?? '',
            'items' => $items
        ];
    }
    $response['salesInvoices'] = $salesInvoices;
} catch (\Throwable $e) {}

// 9. Purchase Invoices
try {
    $stmtPurchases = $pdo->query("SELECT * FROM purchase_invoices ORDER BY date DESC");
    $rawPurchases = $stmtPurchases->fetchAll();
    $purchaseInvoices = [];
    foreach ($rawPurchases as $pinv) {
        $pitems = [];
        try {
            $stmtPItems = $pdo->prepare("SELECT * FROM purchase_invoice_items WHERE invoice_id = ?");
            $stmtPItems->execute([$pinv['id']]);
            $rawPItems = $stmtPItems->fetchAll();
            foreach ($rawPItems as $pit) {
                $pitems[] = [
                    'productId' => $pit['product_id'],
                    'productName' => $pit['product_name'],
                    'unit' => $pit['unit'] ?? 'قطعة',
                    'unitPrice' => (float)($pit['unit_price'] ?? 0),
                    'quantity' => (float)($pit['quantity'] ?? 1),
                    'discount' => (float)($pit['discount'] ?? 0),
                    'discountType' => $pit['discount_type'] ?? 'fixed',
                    'total' => (float)($pit['total'] ?? 0),
                    'batchNumber' => $pit['batch_number'] ?? '',
                    'expiryDate' => $pit['expiry_date'] ?? ''
                ];
            }
        } catch (\Throwable $ex) {}

        $purchaseInvoices[] = [
            'id' => $pinv['id'],
            'invoiceNumber' => $pinv['invoice_number'],
            'date' => $pinv['date'],
            'supplierId' => $pinv['supplier_id'] ?? '',
            'supplierName' => $pinv['supplier_name'] ?? 'مورد معتمد',
            'total' => (float)($pinv['total'] ?? 0),
            'paidAmount' => (float)($pinv['paid_amount'] ?? 0),
            'remainingAmount' => (float)($pinv['remaining_amount'] ?? 0),
            'paymentMethod' => $pinv['payment_method'] ?? 'credit',
            'safeId' => $pinv['safe_id'] ?? 'safe-main',
            'status' => $pinv['status'] ?? 'completed',
            'notes' => $pinv['notes'] ?? '',
            'items' => $pitems
        ];
    }
    $response['purchaseInvoices'] = $purchaseInvoices;
} catch (\Throwable $e) {}

// 9b. Sales Returns
try {
    $stmtSRet = $pdo->query("SELECT * FROM sales_returns ORDER BY date DESC");
    $rawSRet = $stmtSRet->fetchAll();
    $salesReturns = [];
    foreach ($rawSRet as $sr) {
        $srItems = [];
        try {
            $stmtSRItems = $pdo->prepare("SELECT * FROM sales_return_items WHERE return_id = ?");
            $stmtSRItems->execute([$sr['id']]);
            $rawSRItems = $stmtSRItems->fetchAll();
            foreach ($rawSRItems as $sri) {
                $srItems[] = [
                    'productId' => $sri['product_id'],
                    'productName' => $sri['product_name'],
                    'unit' => $sri['unit'] ?? 'قطعة',
                    'unitPrice' => (float)($sri['unit_price'] ?? 0),
                    'purchaseCost' => 0,
                    'quantity' => (float)($sri['quantity'] ?? 1),
                    'total' => (float)($sri['total'] ?? 0)
                ];
            }
        } catch (\Throwable $ex) {}

        $salesReturns[] = [
            'id' => $sr['id'],
            'returnNumber' => $sr['return_number'],
            'originalInvoiceNumber' => $sr['original_invoice_number'] ?? '',
            'date' => $sr['date'],
            'customerId' => $sr['customer_id'] ?? 'walk-in',
            'customerName' => $sr['customer_name'] ?? 'عميل نقدي عام',
            'total' => (float)($sr['total'] ?? 0),
            'paidAmount' => (float)($sr['paid_amount'] ?? 0),
            'remainingAmount' => (float)($sr['remaining_amount'] ?? 0),
            'refundMethod' => $sr['refund_method'] ?? 'cash',
            'safeId' => $sr['safe_id'] ?? 'safe-pos',
            'notes' => $sr['notes'] ?? '',
            'items' => $srItems
        ];
    }
    $response['salesReturns'] = $salesReturns;
} catch (\Throwable $e) {}

// 9c. Purchase Returns
try {
    $stmtPRet = $pdo->query("SELECT * FROM purchase_returns ORDER BY date DESC");
    $rawPRet = $stmtPRet->fetchAll();
    $purchaseReturns = [];
    foreach ($rawPRet as $pr) {
        $prItems = [];
        try {
            $stmtPRItems = $pdo->prepare("SELECT * FROM purchase_return_items WHERE return_id = ?");
            $stmtPRItems->execute([$pr['id']]);
            $rawPRItems = $stmtPRItems->fetchAll();
            foreach ($rawPRItems as $pri) {
                $prItems[] = [
                    'productId' => $pri['product_id'],
                    'productName' => $pri['product_name'],
                    'unit' => $pri['unit'] ?? 'قطعة',
                    'unitPrice' => (float)($pri['unit_price'] ?? 0),
                    'quantity' => (float)($pri['quantity'] ?? 1),
                    'total' => (float)($pri['total'] ?? 0)
                ];
            }
        } catch (\Throwable $ex) {}

        $purchaseReturns[] = [
            'id' => $pr['id'],
            'returnNumber' => $pr['return_number'],
            'originalInvoiceNumber' => $pr['original_invoice_number'] ?? '',
            'date' => $pr['date'],
            'supplierId' => $pr['supplier_id'] ?? '',
            'supplierName' => $pr['supplier_name'] ?? 'مورد عام',
            'total' => (float)($pr['total'] ?? 0),
            'paidAmount' => (float)($pr['paid_amount'] ?? 0),
            'remainingAmount' => (float)($pr['remaining_amount'] ?? 0),
            'refundMethod' => $pr['refund_method'] ?? 'cash',
            'safeId' => $pr['safe_id'] ?? 'safe-main',
            'notes' => $pr['notes'] ?? '',
            'items' => $prItems
        ];
    }
    $response['purchaseReturns'] = $purchaseReturns;
} catch (\Throwable $e) {}

// 10. Expenses
try {
    $stmtExpenses = $pdo->query("SELECT * FROM expenses ORDER BY date DESC");
    $rawExpenses = $stmtExpenses->fetchAll();
    $expenses = [];
    foreach ($rawExpenses as $ex) {
        $expenses[] = [
            'id' => $ex['id'],
            'title' => $ex['title'],
            'category' => $ex['category'] ?? 'other',
            'amount' => (float)($ex['amount'] ?? 0),
            'safeId' => $ex['safe_id'] ?? 'safe-pos',
            'recipient' => $ex['recipient'] ?? '',
            'date' => $ex['date'] ?? date('c'),
            'notes' => $ex['notes'] ?? ''
        ];
    }
    $response['expenses'] = $expenses;
} catch (\Throwable $e) {}

// 11. Transactions
try {
    $stmtTrans = $pdo->query("SELECT * FROM financial_transactions ORDER BY date DESC");
    $rawTrans = $stmtTrans->fetchAll();
    $transactions = [];
    foreach ($rawTrans as $tr) {
        $transactions[] = [
            'id' => $tr['id'],
            'type' => $tr['type'],
            'title' => $tr['title'],
            'amount' => (float)$tr['amount'],
            'direction' => $tr['direction'],
            'referenceId' => $tr['related_id'] ?? null,
            'relatedId' => $tr['related_id'] ?? null,
            'safeId' => $tr['safe_id'] ?? 'safe-pos',
            'safeName' => $tr['safe_name'] ?? 'الخزينة',
            'date' => $tr['date'],
            'notes' => $tr['notes'] ?? ''
        ];
    }
    $response['transactions'] = $transactions;
} catch (\Throwable $e) {}

// 12. Shifts (Fixed PHP 8 undefined constant crash)
try {
    $stmtShifts = $pdo->query("SELECT * FROM shifts ORDER BY opened_at DESC");
    $rawShifts = $stmtShifts->fetchAll();
    $shifts = [];
    foreach ($rawShifts as $sh) {
        $shifts[] = [
            'id' => $sh['id'],
            'userId' => $sh['user_id'],
            'userName' => $sh['user_name'],
            'openedAt' => $sh['opened_at'],
            'closedAt' => $sh['closed_at'] ?? null,
            'startingBalance' => (float)($sh['starting_balance'] ?? 0),
            'salesRevenue' => (float)($sh['sales_revenue'] ?? 0),
            'otherIncomes' => (float)($sh['other_incomes'] ?? 0),
            'otherExpenses' => (float)($sh['other_expenses'] ?? 0),
            'expectedBalance' => (float)($sh['expected_balance'] ?? 0),
            'actualBalance' => isset($sh['actual_balance']) && $sh['actual_balance'] !== null ? (float)$sh['actual_balance'] : null,
            'difference' => isset($sh['difference']) && $sh['difference'] !== null ? (float)$sh['difference'] : null,
            'notes' => $sh['notes'] ?? '',
            'status' => $sh['status'] ?? 'open'
        ];
    }
    $response['shifts'] = $shifts;
} catch (\Throwable $e) {}

// 13. Recipes
try {
    $stmtRec = $pdo->query("SELECT * FROM assembly_recipes ORDER BY created_at DESC");
    $rawRec = $stmtRec->fetchAll();
    $recipes = [];
    foreach ($rawRec as $rc) {
        $rcItems = [];
        try {
            $stRItems = $pdo->prepare("SELECT * FROM assembly_recipe_items WHERE recipe_id = ?");
            $stRItems->execute([$rc['id']]);
            $rawRItems = $stRItems->fetchAll();
            foreach ($rawRItems as $ri) {
                $rcItems[] = [
                    'productId' => $ri['component_product_id'],
                    'productName' => $ri['component_product_name'],
                    'componentProductId' => $ri['component_product_id'],
                    'componentProductName' => $ri['component_product_name'],
                    'quantity' => (float)$ri['required_quantity'],
                    'requiredQuantity' => (float)$ri['required_quantity'],
                    'unit' => $ri['unit'] ?? 'قطعة',
                    'unitCost' => (float)($ri['unit_cost'] ?? 0),
                    'notes' => $ri['notes'] ?? ''
                ];
            }
        } catch (\Throwable $ex) {}

        $recipes[] = [
            'id' => $rc['id'],
            'name' => $rc['target_product_name'],
            'outputProductId' => $rc['target_product_id'],
            'outputProductName' => $rc['target_product_name'],
            'outputQuantity' => (float)($rc['target_quantity'] ?? 1),
            'outputUnit' => $rc['target_unit'] ?? 'طقم',
            'targetProductId' => $rc['target_product_id'],
            'targetProductName' => $rc['target_product_name'],
            'targetQuantity' => (float)($rc['target_quantity'] ?? 1),
            'targetUnit' => $rc['target_unit'] ?? 'طقم',
            'laborCost' => (float)($rc['labor_cost'] ?? 0),
            'otherCost' => (float)($rc['other_cost'] ?? 0),
            'notes' => $rc['notes'] ?? '',
            'createdAt' => $rc['created_at'] ?? date('c'),
            'components' => $rcItems
        ];
    }
    $response['recipes'] = $recipes;
} catch (\Throwable $e) {}

// 14. Assembly Operations
try {
    $stmtOps = $pdo->query("SELECT * FROM assembly_operations ORDER BY date DESC");
    $rawOps = $stmtOps->fetchAll();
    $assemblyOperations = [];
    foreach ($rawOps as $op) {
        $opItems = [];
        try {
            $stOpItems = $pdo->prepare("SELECT * FROM assembly_operation_items WHERE operation_id = ?");
            $stOpItems->execute([$op['id']]);
            $rawOpItems = $stOpItems->fetchAll();
            foreach ($rawOpItems as $opi) {
                $opItems[] = [
                    'productId' => $opi['component_product_id'],
                    'productName' => $opi['component_product_name'],
                    'componentProductId' => $opi['component_product_id'],
                    'componentProductName' => $opi['component_product_name'],
                    'quantity' => (float)$opi['quantity_used'],
                    'quantityUsed' => (float)$opi['quantity_used'],
                    'unit' => $opi['unit'] ?? 'قطعة',
                    'unitCost' => (float)($opi['unit_cost'] ?? 0),
                    'sellingPrice' => isset($opi['selling_price']) && $opi['selling_price'] !== null ? (float)$opi['selling_price'] : null,
                    'totalCost' => (float)($opi['total_cost'] ?? 0),
                    'direction' => $opi['direction'] ?? 'deducted'
                ];
            }
        } catch (\Throwable $ex) {}

        $assemblyOperations[] = [
            'id' => $op['id'],
            'type' => $op['operation_type'],
            'operationType' => $op['operation_type'],
            'operationNumber' => $op['operation_number'],
            'recipeId' => $op['recipe_id'] ?? null,
            'targetProductId' => $op['target_product_id'],
            'targetProductName' => $op['target_product_name'],
            'targetUnit' => $op['unit'] ?? 'طقم',
            'quantity' => (float)$op['quantity'],
            'unit' => $op['unit'] ?? 'طقم',
            'laborCost' => (float)($op['labor_cost'] ?? 0),
            'otherCost' => (float)($op['other_cost'] ?? 0),
            'totalCost' => (float)($op['total_cost'] ?? 0),
            'unitCost' => (float)($op['unit_cost'] ?? 0),
            'sellingPrice' => isset($op['selling_price']) && $op['selling_price'] !== null ? (float)$op['selling_price'] : null,
            'performedBy' => $op['performed_by'],
            'date' => $op['date'],
            'notes' => $op['notes'] ?? '',
            'componentsUsed' => $opItems,
            'componentsAffected' => $opItems
        ];
    }
    $response['assemblyOperations'] = $assemblyOperations;
} catch (\Throwable $e) {}

// 15. Money Associations
try {
    $stmtAssoc = $pdo->query("SELECT * FROM money_associations ORDER BY start_date DESC");
    $rawAssoc = $stmtAssoc->fetchAll();
    $associations = [];
    foreach ($rawAssoc as $ma) {
        $associations[] = [
            'id' => $ma['id'],
            'name' => $ma['name'],
            'monthlyShareAmount' => (float)($ma['monthly_share_amount'] ?? 0),
            'totalSharesCount' => (int)($ma['total_shares_count'] ?? 10),
            'currentRound' => (int)($ma['current_round'] ?? 1),
            'startDate' => $ma['start_date'],
            'durationMonths' => (int)($ma['duration_months'] ?? 10),
            'ourPayoutMonth' => (int)($ma['our_payout_month'] ?? 1),
            'isReceived' => !empty($ma['is_received']),
            'notes' => $ma['notes'] ?? '',
            'members' => !empty($ma['members_json']) ? json_decode($ma['members_json'], true) : []
        ];
    }
    $response['associations'] = $associations;
} catch (\Throwable $e) {}

// 16. Waste Records
try {
    $stmtWaste = $pdo->query("SELECT * FROM waste_records ORDER BY date DESC");
    $rawWaste = $stmtWaste->fetchAll();
    $wasteRecords = [];
    foreach ($rawWaste as $wr) {
        $wasteRecords[] = [
            'id' => $wr['id'],
            'productId' => $wr['product_id'],
            'productName' => $wr['product_name'],
            'category' => $wr['category'] ?? 'wires_cables',
            'unit' => $wr['unit'] ?? 'قطعة',
            'quantity' => (float)$wr['quantity'],
            'costPrice' => (float)($wr['cost_price'] ?? 0),
            'lossValue' => (float)($wr['loss_value'] ?? 0),
            'reason' => $wr['reason'] ?? 'damaged',
            'date' => $wr['date'],
            'notes' => $wr['notes'] ?? ''
        ];
    }
    $response['wasteRecords'] = $wasteRecords;
} catch (\Throwable $e) {}

echo json_encode([
    'success' => true,
    'data' => $response
], JSON_UNESCAPED_UNICODE);
?>
