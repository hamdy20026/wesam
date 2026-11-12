<?php
// sync_push.php - Sync and mirror all application state directly into MySQL on XAMPP
require_once __DIR__ . '/config.php';

try {
    ensureTablesExist($pdo, false);
} catch (\Throwable $ex) {}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'لم يتم استلام أي بيانات صالحة بصيغة JSON'], JSON_UNESCAPED_UNICODE);
    exit();
}

$mirrorDelete = isset($input['mirrorDelete']) ? (bool)$input['mirrorDelete'] : true;

/**
 * Helper to delete rows in a table whose `id` is not in $keepIds.
 */
function pruneTableByIds($pdo, $tableName, array $keepIds, array $protectedIds = [], $allowEmptyClear = false) {
    $allKeep = array_values(array_unique(array_filter(array_merge($keepIds, $protectedIds), function($v) {
        return $v !== null && $v !== '';
    })));
    if (empty($allKeep)) {
        if ($allowEmptyClear) {
            $pdo->exec("DELETE FROM `{$tableName}`");
        }
        return;
    } else {
        $placeholders = implode(',', array_fill(0, count($allKeep), '?'));
        $stmt = $pdo->prepare("DELETE FROM `{$tableName}` WHERE `id` NOT IN ({$placeholders})");
        $stmt->execute($allKeep);
    }
}

try {
    // 1. Settings
    if (!empty($input['settings']) && is_array($input['settings'])) {
        $s = $input['settings'];
        $stmt = $pdo->prepare("
            INSERT INTO `settings` (`id`, `store_name`, `owner_name`, `phone`, `phone_alt`, `address`, `commercial_record`, `agricultural_license`, `tax_rate`, `currency`, `invoice_footer_note`, `permissions_matrix`)
            VALUES (1, :storeName, :ownerName, :phone, :phoneAlt, :address, :commercialRecord, :agriculturalLicense, :taxRate, :currency, :invoiceFooterNote, :matrix)
            ON DUPLICATE KEY UPDATE
                `store_name` = VALUES(`store_name`),
                `owner_name` = VALUES(`owner_name`),
                `phone` = VALUES(`phone`),
                `phone_alt` = VALUES(`phone_alt`),
                `address` = VALUES(`address`),
                `commercial_record` = VALUES(`commercial_record`),
                `agricultural_license` = VALUES(`agricultural_license`),
                `tax_rate` = VALUES(`tax_rate`),
                `currency` = VALUES(`currency`),
                `invoice_footer_note` = VALUES(`invoice_footer_note`),
                `permissions_matrix` = VALUES(`permissions_matrix`)
        ");
        $stmt->execute([
            ':storeName' => $s['storeName'] ?? 'وسام للأدوات والتوريدات الكهربائية',
            ':ownerName' => $s['ownerName'] ?? 'مؤسسة وسام للأدوات الكهربائية',
            ':phone' => $s['phone'] ?? '',
            ':phoneAlt' => $s['phoneAlt'] ?? '',
            ':address' => $s['address'] ?? '',
            ':commercialRecord' => $s['commercialRecord'] ?? '',
            ':agriculturalLicense' => $s['agriculturalLicense'] ?? '',
            ':taxRate' => (float)($s['taxRate'] ?? 0.00),
            ':currency' => $s['currency'] ?? 'ج.م',
            ':invoiceFooterNote' => $s['invoiceFooterNote'] ?? '',
            ':matrix' => !empty($s['permissionsMatrix']) ? json_encode($s['permissionsMatrix'], JSON_UNESCAPED_UNICODE) : null
        ]);
    }

    // 2. Users
    if (isset($input['users']) && is_array($input['users'])) {
        $keepIds = [];
        $stmt = $pdo->prepare("
            INSERT INTO `users` (`id`, `username`, `name`, `role`, `phone`, `password_hash`, `is_active`)
            VALUES (:id, :username, :name, :role, :phone, :password_hash, :is_active)
            ON DUPLICATE KEY UPDATE
                `name` = VALUES(`name`),
                `role` = VALUES(`role`),
                `phone` = VALUES(`phone`),
                `password_hash` = VALUES(`password_hash`),
                `is_active` = VALUES(`is_active`)
        ");
        foreach ($input['users'] as $u) {
            if (empty($u['id']) || empty($u['username'])) continue;
            $keepIds[] = $u['id'];
            $stmt->execute([
                ':id' => $u['id'],
                ':username' => $u['username'],
                ':name' => $u['name'] ?? $u['username'],
                ':role' => $u['role'] ?? 'cashier',
                ':phone' => $u['phone'] ?? '',
                ':password_hash' => $u['passwordHash'] ?? $u['password'] ?? '123456',
                ':is_active' => isset($u['isActive']) ? ($u['isActive'] ? 1 : 0) : 1
            ]);
        }
        if ($mirrorDelete && !empty($keepIds)) {
            pruneTableByIds($pdo, 'users', $keepIds, ['usr-admin']);
        }
    }

    // 3. Safes
    if (isset($input['safes']) && is_array($input['safes'])) {
        $keepIds = [];
        $stmt = $pdo->prepare("
            INSERT INTO `safes` (`id`, `name`, `type`, `balance`, `account_number`, `is_default`, `notes`)
            VALUES (:id, :name, :type, :balance, :account_number, :is_default, :notes)
            ON DUPLICATE KEY UPDATE
                `name` = VALUES(`name`),
                `type` = VALUES(`type`),
                `balance` = VALUES(`balance`),
                `account_number` = VALUES(`account_number`),
                `is_default` = VALUES(`is_default`),
                `notes` = VALUES(`notes`)
        ");
        foreach ($input['safes'] as $sf) {
            if (empty($sf['id'])) continue;
            $keepIds[] = $sf['id'];
            $stmt->execute([
                ':id' => $sf['id'],
                ':name' => $sf['name'] ?? 'خزينة',
                ':type' => $sf['type'] ?? 'cash',
                ':balance' => (float)($sf['balance'] ?? 0),
                ':account_number' => $sf['accountNumber'] ?? null,
                ':is_default' => !empty($sf['isDefault']) ? 1 : 0,
                ':notes' => $sf['notes'] ?? ''
            ]);
        }
        if ($mirrorDelete) {
            pruneTableByIds($pdo, 'safes', $keepIds);
        }
    }

    // 4. Safe Transfers
    if (isset($input['safeTransfers']) && is_array($input['safeTransfers'])) {
        $keepIds = [];
        $stmtST = $pdo->prepare("
            INSERT INTO `safe_transfers` (`id`, `transfer_number`, `date`, `from_safe_id`, `from_safe_name`, `to_safe_id`, `to_safe_name`, `amount`, `performed_by`, `notes`)
            VALUES (:id, :num, :date, :from_id, :from_name, :to_id, :to_name, :amount, :by, :notes)
            ON DUPLICATE KEY UPDATE `amount` = VALUES(`amount`), `notes` = VALUES(`notes`)
        ");
        foreach ($input['safeTransfers'] as $st) {
            if (empty($st['id'])) continue;
            $keepIds[] = $st['id'];
            $stmtST->execute([
                ':id' => $st['id'],
                ':num' => $st['transferNumber'] ?? null,
                ':date' => toMysqlDateTime($st['date'] ?? null),
                ':from_id' => $st['fromSafeId'] ?? '',
                ':from_name' => $st['fromSafeName'] ?? '',
                ':to_id' => $st['toSafeId'] ?? '',
                ':to_name' => $st['toSafeName'] ?? '',
                ':amount' => (float)($st['amount'] ?? 0),
                ':by' => $st['performedBy'] ?? 'المدير',
                ':notes' => $st['notes'] ?? ''
            ]);
        }
        if ($mirrorDelete) {
            pruneTableByIds($pdo, 'safe_transfers', $keepIds);
        }
    }

    // 5. Suppliers
    if (isset($input['suppliers']) && is_array($input['suppliers'])) {
        $keepIds = [];
        $stmt = $pdo->prepare("
            INSERT INTO `suppliers` (`id`, `name`, `company_name`, `representative_name`, `phone`, `address`, `supplied_categories`, `initial_balance`, `current_balance`, `notes`, `created_at`)
            VALUES (:id, :name, :company, :rep, :phone, :address, :categories, :init_bal, :bal, :notes, :created_at)
            ON DUPLICATE KEY UPDATE
                `name` = VALUES(`name`),
                `company_name` = VALUES(`company_name`),
                `representative_name` = VALUES(`representative_name`),
                `phone` = VALUES(`phone`),
                `address` = VALUES(`address`),
                `supplied_categories` = VALUES(`supplied_categories`),
                `initial_balance` = VALUES(`initial_balance`),
                `current_balance` = VALUES(`current_balance`),
                `notes` = VALUES(`notes`)
        ");
        foreach ($input['suppliers'] as $sup) {
            if (empty($sup['id'])) continue;
            $keepIds[] = $sup['id'];
            $initBal = isset($sup['initialBalance']) ? (float)$sup['initialBalance'] : (float)($sup['currentBalance'] ?? 0);
            $stmt->execute([
                ':id' => $sup['id'],
                ':name' => $sup['name'] ?? '',
                ':company' => $sup['companyName'] ?? $sup['name'] ?? '',
                ':rep' => $sup['representativeName'] ?? '',
                ':phone' => $sup['phone'] ?? '',
                ':address' => $sup['address'] ?? '',
                ':categories' => $sup['suppliedCategories'] ?? '',
                ':init_bal' => $initBal,
                ':bal' => isset($sup['currentBalance']) ? (float)$sup['currentBalance'] : $initBal,
                ':notes' => $sup['notes'] ?? '',
                ':created_at' => toMysqlDateTime($sup['createdAt'] ?? null)
            ]);
        }
        if ($mirrorDelete) {
            pruneTableByIds($pdo, 'suppliers', $keepIds);
        }
    }

    // 6. Customers (always protect 'walk-in')
    if (isset($input['customers']) && is_array($input['customers'])) {
        $keepIds = ['walk-in'];
        $stmt = $pdo->prepare("
            INSERT INTO `customers` (`id`, `code`, `name`, `phone`, `address`, `customer_type`, `commercial_record`, `initial_balance`, `current_balance`, `credit_limit`, `crop_types`, `farm_area`, `notes`, `created_at`)
            VALUES (:id, :code, :name, :phone, :address, :type, :cr, :init_bal, :bal, :credit_limit, :crops, :area, :notes, :created_at)
            ON DUPLICATE KEY UPDATE
                `code` = VALUES(`code`),
                `name` = VALUES(`name`),
                `phone` = VALUES(`phone`),
                `address` = VALUES(`address`),
                `customer_type` = VALUES(`customer_type`),
                `commercial_record` = VALUES(`commercial_record`),
                `initial_balance` = VALUES(`initial_balance`),
                `current_balance` = VALUES(`current_balance`),
                `credit_limit` = VALUES(`credit_limit`),
                `crop_types` = VALUES(`crop_types`),
                `farm_area` = VALUES(`farm_area`),
                `notes` = VALUES(`notes`)
        ");
        foreach ($input['customers'] as $c) {
            if (empty($c['id'])) continue;
            $isWalkIn = ($c['id'] === 'walk-in');
            $keepIds[] = $c['id'];
            $initBal = $isWalkIn ? 0.00 : (isset($c['initialBalance']) ? (float)$c['initialBalance'] : 0.00);
            $currBal = $isWalkIn ? 0.00 : (isset($c['currentBalance']) ? (float)$c['currentBalance'] : $initBal);
            $credLim = $isWalkIn ? 0.00 : (isset($c['creditLimit']) ? (float)$c['creditLimit'] : 50000.00);
            $stmt->execute([
                ':id' => $c['id'],
                ':code' => $c['code'] ?? ($isWalkIn ? 'CUST-000' : null),
                ':name' => $isWalkIn ? 'عميل نقدي عام' : ($c['name'] ?? ''),
                ':phone' => $c['phone'] ?? '',
                ':address' => $c['address'] ?? '',
                ':type' => $c['customerType'] ?? 'retail',
                ':cr' => $c['commercialRecord'] ?? '',
                ':init_bal' => $initBal,
                ':bal' => $currBal,
                ':credit_limit' => $credLim,
                ':crops' => $c['cropTypes'] ?? '',
                ':area' => $c['farmArea'] ?? '',
                ':notes' => $c['notes'] ?? '',
                ':created_at' => toMysqlDateTime($c['createdAt'] ?? null)
            ]);
        }
        if ($mirrorDelete) {
            pruneTableByIds($pdo, 'customers', $keepIds, ['walk-in']);
        }
    }

    // 7. Products
    if (isset($input['products']) && is_array($input['products'])) {
        $keepIds = [];
        $stmt = $pdo->prepare("
            INSERT INTO `products` (`id`, `name`, `category`, `brand`, `voltage`, `power_watt`, `amperage`, `warranty_months`, `barcode`, `unit`, `purchase_price`, `selling_price`, `wholesale_price`, `quantity`, `min_alert_quantity`, `batch_number`, `expiry_date`, `supplier_id`, `is_composite`, `recipe_id`, `is_weighable`, `tare_weight`, `notes`, `created_at`)
            VALUES (:id, :name, :cat, :brand, :volt, :watt, :amp, :warr, :bar, :unit, :purch, :sell, :wsell, :qty, :min, :batch, :exp, :sup, :comp, :rec, :weigh, :tare, :notes, :created_at)
            ON DUPLICATE KEY UPDATE
                `name` = VALUES(`name`),
                `category` = VALUES(`category`),
                `brand` = VALUES(`brand`),
                `voltage` = VALUES(`voltage`),
                `power_watt` = VALUES(`power_watt`),
                `amperage` = VALUES(`amperage`),
                `warranty_months` = VALUES(`warranty_months`),
                `barcode` = VALUES(`barcode`),
                `unit` = VALUES(`unit`),
                `purchase_price` = VALUES(`purchase_price`),
                `selling_price` = VALUES(`selling_price`),
                `wholesale_price` = VALUES(`wholesale_price`),
                `quantity` = VALUES(`quantity`),
                `min_alert_quantity` = VALUES(`min_alert_quantity`),
                `batch_number` = VALUES(`batch_number`),
                `expiry_date` = VALUES(`expiry_date`),
                `supplier_id` = VALUES(`supplier_id`),
                `is_composite` = VALUES(`is_composite`),
                `recipe_id` = VALUES(`recipe_id`),
                `is_weighable` = VALUES(`is_weighable`),
                `tare_weight` = VALUES(`tare_weight`),
                `notes` = VALUES(`notes`)
        ");
        foreach ($input['products'] as $p) {
            if (empty($p['id'])) continue;
            $keepIds[] = $p['id'];
            $stmt->execute([
                ':id' => $p['id'],
                ':name' => $p['name'] ?? '',
                ':cat' => $p['category'] ?? 'wires_cables',
                ':brand' => $p['brand'] ?? null,
                ':volt' => $p['voltage'] ?? null,
                ':watt' => $p['powerWatt'] ?? null,
                ':amp' => $p['amperage'] ?? null,
                ':warr' => (int)($p['warrantyMonths'] ?? 0),
                ':bar' => !empty($p['barcode']) ? $p['barcode'] : $p['id'],
                ':unit' => $p['unit'] ?? 'قطعة',
                ':purch' => (float)($p['purchasePrice'] ?? 0),
                ':sell' => (float)($p['sellingPrice'] ?? 0),
                ':wsell' => (float)($p['wholesalePrice'] ?? 0),
                ':qty' => (float)($p['quantity'] ?? 0),
                ':min' => (float)($p['minAlertQuantity'] ?? 5),
                ':batch' => !empty($p['batchNumber']) ? $p['batchNumber'] : null,
                ':exp' => toMysqlDate($p['expiryDate'] ?? null),
                ':sup' => !empty($p['supplierId']) ? $p['supplierId'] : null,
                ':comp' => !empty($p['isComposite']) ? 1 : 0,
                ':rec' => !empty($p['recipeId']) ? $p['recipeId'] : null,
                ':weigh' => !empty($p['isWeighable']) ? 1 : 0,
                ':tare' => (float)($p['tareWeight'] ?? 0),
                ':notes' => $p['notes'] ?? '',
                ':created_at' => toMysqlDateTime($p['createdAt'] ?? null)
            ]);
        }
        if ($mirrorDelete) {
            pruneTableByIds($pdo, 'products', $keepIds);
        }
    }

    // 8. Sales Invoices
    if (isset($input['salesInvoices']) && is_array($input['salesInvoices'])) {
        $keepIds = [];
        $stmtInv = $pdo->prepare("
            INSERT INTO `sales_invoices` (`id`, `invoice_number`, `date`, `customer_id`, `customer_name`, `customer_phone`, `subtotal`, `discount`, `total`, `paid_amount`, `remaining_amount`, `payment_method`, `safe_id`, `notes`, `status`)
            VALUES (:id, :num, :date, :cid, :cname, :cphone, :sub, :disc, :total, :paid, :rem, :pmethod, :safe, :notes, :status)
            ON DUPLICATE KEY UPDATE
                `date` = VALUES(`date`),
                `customer_id` = VALUES(`customer_id`),
                `customer_name` = VALUES(`customer_name`),
                `subtotal` = VALUES(`subtotal`),
                `discount` = VALUES(`discount`),
                `total` = VALUES(`total`),
                `paid_amount` = VALUES(`paid_amount`),
                `remaining_amount` = VALUES(`remaining_amount`),
                `payment_method` = VALUES(`payment_method`),
                `safe_id` = VALUES(`safe_id`),
                `notes` = VALUES(`notes`),
                `status` = VALUES(`status`)
        ");
        $stmtItem = $pdo->prepare("
            INSERT INTO `sales_invoice_items` (`invoice_id`, `product_id`, `product_name`, `category`, `brand`, `unit`, `unit_price`, `purchase_cost`, `quantity`, `discount`, `discount_type`, `total`)
            VALUES (:inv_id, :pid, :pname, :cat, :brand, :unit, :price, :cost, :qty, :disc, :dtype, :total)
        ");
        foreach ($input['salesInvoices'] as $inv) {
            if (empty($inv['id'])) continue;
            $keepIds[] = $inv['id'];
            $stmtInv->execute([
                ':id' => $inv['id'],
                ':num' => $inv['invoiceNumber'] ?? $inv['id'],
                ':date' => toMysqlDateTime($inv['date'] ?? null),
                ':cid' => $inv['customerId'] ?? 'walk-in',
                ':cname' => $inv['customerName'] ?? 'عميل نقدي عام',
                ':cphone' => $inv['customerPhone'] ?? '',
                ':sub' => (float)($inv['subtotal'] ?? $inv['total'] ?? 0),
                ':disc' => (float)($inv['discount'] ?? 0),
                ':total' => (float)($inv['total'] ?? 0),
                ':paid' => (float)($inv['paidAmount'] ?? 0),
                ':rem' => (float)($inv['remainingAmount'] ?? 0),
                ':pmethod' => $inv['paymentMethod'] ?? 'cash',
                ':safe' => $inv['safeId'] ?? 'safe-pos',
                ':notes' => $inv['notes'] ?? '',
                ':status' => $inv['status'] ?? 'completed'
            ]);

            $pdo->prepare("DELETE FROM `sales_invoice_items` WHERE `invoice_id` = ?")->execute([$inv['id']]);
            if (!empty($inv['items']) && is_array($inv['items'])) {
                foreach ($inv['items'] as $it) {
                    $stmtItem->execute([
                        ':inv_id' => $inv['id'],
                        ':pid' => $it['productId'] ?? '',
                        ':pname' => $it['productName'] ?? '',
                        ':cat' => $it['category'] ?? 'wires_cables',
                        ':brand' => $it['brand'] ?? '',
                        ':unit' => $it['unit'] ?? 'قطعة',
                        ':price' => (float)($it['unitPrice'] ?? 0),
                        ':cost' => (float)($it['purchaseCost'] ?? 0),
                        ':qty' => (float)($it['quantity'] ?? 1),
                        ':disc' => (float)($it['discount'] ?? 0),
                        ':dtype' => $it['discountType'] ?? 'fixed',
                        ':total' => (float)($it['total'] ?? 0)
                    ]);
                }
            }
        }
        if ($mirrorDelete) {
            pruneTableByIds($pdo, 'sales_invoices', $keepIds);
            if (empty($keepIds)) {
                $pdo->exec("DELETE FROM `sales_invoice_items`");
            } else {
                $placeholders = implode(',', array_fill(0, count($keepIds), '?'));
                $pdo->prepare("DELETE FROM `sales_invoice_items` WHERE `invoice_id` NOT IN ({$placeholders})")->execute($keepIds);
            }
        }
    }

    // 9. Purchase Invoices
    if (isset($input['purchaseInvoices']) && is_array($input['purchaseInvoices'])) {
        $keepIds = [];
        $stmtP = $pdo->prepare("
            INSERT INTO `purchase_invoices` (`id`, `invoice_number`, `date`, `supplier_id`, `supplier_name`, `total`, `paid_amount`, `remaining_amount`, `payment_method`, `safe_id`, `notes`, `status`)
            VALUES (:id, :num, :date, :sup_id, :sup_name, :total, :paid, :rem, :pmethod, :safe, :notes, :status)
            ON DUPLICATE KEY UPDATE
                `date` = VALUES(`date`),
                `supplier_id` = VALUES(`supplier_id`),
                `supplier_name` = VALUES(`supplier_name`),
                `total` = VALUES(`total`),
                `paid_amount` = VALUES(`paid_amount`),
                `remaining_amount` = VALUES(`remaining_amount`),
                `payment_method` = VALUES(`payment_method`),
                `safe_id` = VALUES(`safe_id`),
                `notes` = VALUES(`notes`),
                `status` = VALUES(`status`)
        ");
        $stmtPItem = $pdo->prepare("
            INSERT INTO `purchase_invoice_items` (`invoice_id`, `product_id`, `product_name`, `unit`, `unit_price`, `quantity`, `discount`, `discount_type`, `total`, `batch_number`, `expiry_date`)
            VALUES (:inv_id, :pid, :pname, :unit, :price, :qty, :disc, :dtype, :total, :batch, :exp)
        ");
        foreach ($input['purchaseInvoices'] as $pinv) {
            if (empty($pinv['id'])) continue;
            $keepIds[] = $pinv['id'];
            $stmtP->execute([
                ':id' => $pinv['id'],
                ':num' => $pinv['invoiceNumber'] ?? $pinv['id'],
                ':date' => toMysqlDateTime($pinv['date'] ?? null),
                ':sup_id' => $pinv['supplierId'] ?? '',
                ':sup_name' => $pinv['supplierName'] ?? 'مورد معتمد',
                ':total' => (float)($pinv['total'] ?? 0),
                ':paid' => (float)($pinv['paidAmount'] ?? 0),
                ':rem' => (float)($pinv['remainingAmount'] ?? 0),
                ':pmethod' => $pinv['paymentMethod'] ?? 'credit',
                ':safe' => $pinv['safeId'] ?? 'safe-main',
                ':notes' => $pinv['notes'] ?? '',
                ':status' => $pinv['status'] ?? 'completed'
            ]);

            $pdo->prepare("DELETE FROM `purchase_invoice_items` WHERE `invoice_id` = ?")->execute([$pinv['id']]);
            if (!empty($pinv['items']) && is_array($pinv['items'])) {
                foreach ($pinv['items'] as $pit) {
                    $stmtPItem->execute([
                        ':inv_id' => $pinv['id'],
                        ':pid' => $pit['productId'] ?? '',
                        ':pname' => $pit['productName'] ?? '',
                        ':unit' => $pit['unit'] ?? 'قطعة',
                        ':price' => (float)($pit['unitPrice'] ?? 0),
                        ':qty' => (float)($pit['quantity'] ?? 1),
                        ':disc' => (float)($pit['discount'] ?? 0),
                        ':dtype' => $pit['discountType'] ?? 'fixed',
                        ':total' => (float)($pit['total'] ?? 0),
                        ':batch' => !empty($pit['batchNumber']) ? $pit['batchNumber'] : null,
                        ':exp' => toMysqlDate($pit['expiryDate'] ?? null)
                    ]);
                }
            }
        }
        if ($mirrorDelete) {
            pruneTableByIds($pdo, 'purchase_invoices', $keepIds);
            if (empty($keepIds)) {
                $pdo->exec("DELETE FROM `purchase_invoice_items`");
            } else {
                $placeholders = implode(',', array_fill(0, count($keepIds), '?'));
                $pdo->prepare("DELETE FROM `purchase_invoice_items` WHERE `invoice_id` NOT IN ({$placeholders})")->execute($keepIds);
            }
        }
    }

    // 9b. Sales Returns
    if (isset($input['salesReturns']) && is_array($input['salesReturns'])) {
        $keepIds = [];
        $stmtSR = $pdo->prepare("
            INSERT INTO `sales_returns` (`id`, `return_number`, `original_invoice_number`, `date`, `customer_id`, `customer_name`, `total`, `paid_amount`, `remaining_amount`, `refund_method`, `safe_id`, `notes`)
            VALUES (:id, :num, :orig, :date, :cid, :cname, :total, :paid, :rem, :method, :safe, :notes)
            ON DUPLICATE KEY UPDATE
                `total` = VALUES(`total`),
                `paid_amount` = VALUES(`paid_amount`),
                `remaining_amount` = VALUES(`remaining_amount`),
                `refund_method` = VALUES(`refund_method`),
                `notes` = VALUES(`notes`)
        ");
        $stmtSRItem = $pdo->prepare("
            INSERT INTO `sales_return_items` (`return_id`, `product_id`, `product_name`, `unit`, `unit_price`, `quantity`, `total`)
            VALUES (:ret_id, :pid, :pname, :unit, :price, :qty, :total)
        ");
        foreach ($input['salesReturns'] as $sr) {
            if (empty($sr['id'])) continue;
            $keepIds[] = $sr['id'];
            $stmtSR->execute([
                ':id' => $sr['id'],
                ':num' => $sr['returnNumber'] ?? $sr['id'],
                ':orig' => $sr['originalInvoiceNumber'] ?? null,
                ':date' => toMysqlDateTime($sr['date'] ?? null),
                ':cid' => $sr['customerId'] ?? 'walk-in',
                ':cname' => $sr['customerName'] ?? 'عميل نقدي عام',
                ':total' => (float)($sr['total'] ?? 0),
                ':paid' => (float)($sr['paidAmount'] ?? 0),
                ':rem' => (float)($sr['remainingAmount'] ?? 0),
                ':method' => $sr['refundMethod'] ?? 'cash',
                ':safe' => $sr['safeId'] ?? 'safe-pos',
                ':notes' => $sr['notes'] ?? ''
            ]);
            $pdo->prepare("DELETE FROM `sales_return_items` WHERE `return_id` = ?")->execute([$sr['id']]);
            if (!empty($sr['items']) && is_array($sr['items'])) {
                foreach ($sr['items'] as $sri) {
                    $stmtSRItem->execute([
                        ':ret_id' => $sr['id'],
                        ':pid' => $sri['productId'] ?? '',
                        ':pname' => $sri['productName'] ?? '',
                        ':unit' => $sri['unit'] ?? 'قطعة',
                        ':price' => (float)($sri['unitPrice'] ?? 0),
                        ':qty' => (float)($sri['quantity'] ?? 1),
                        ':total' => (float)($sri['total'] ?? 0)
                    ]);
                }
            }
        }
        if ($mirrorDelete) {
            pruneTableByIds($pdo, 'sales_returns', $keepIds);
            if (empty($keepIds)) {
                $pdo->exec("DELETE FROM `sales_return_items`");
            } else {
                $placeholders = implode(',', array_fill(0, count($keepIds), '?'));
                $pdo->prepare("DELETE FROM `sales_return_items` WHERE `return_id` NOT IN ({$placeholders})")->execute($keepIds);
            }
        }
    }

    // 9c. Purchase Returns
    if (isset($input['purchaseReturns']) && is_array($input['purchaseReturns'])) {
        $keepIds = [];
        $stmtPR = $pdo->prepare("
            INSERT INTO `purchase_returns` (`id`, `return_number`, `original_invoice_number`, `date`, `supplier_id`, `supplier_name`, `total`, `paid_amount`, `remaining_amount`, `refund_method`, `safe_id`, `notes`)
            VALUES (:id, :num, :orig, :date, :sid, :sname, :total, :paid, :rem, :method, :safe, :notes)
            ON DUPLICATE KEY UPDATE
                `total` = VALUES(`total`),
                `paid_amount` = VALUES(`paid_amount`),
                `remaining_amount` = VALUES(`remaining_amount`),
                `refund_method` = VALUES(`refund_method`),
                `notes` = VALUES(`notes`)
        ");
        $stmtPRItem = $pdo->prepare("
            INSERT INTO `purchase_return_items` (`return_id`, `product_id`, `product_name`, `unit`, `unit_price`, `quantity`, `total`)
            VALUES (:ret_id, :pid, :pname, :unit, :price, :qty, :total)
        ");
        foreach ($input['purchaseReturns'] as $pr) {
            if (empty($pr['id'])) continue;
            $keepIds[] = $pr['id'];
            $stmtPR->execute([
                ':id' => $pr['id'],
                ':num' => $pr['returnNumber'] ?? $pr['id'],
                ':orig' => $pr['originalInvoiceNumber'] ?? null,
                ':date' => toMysqlDateTime($pr['date'] ?? null),
                ':sid' => $pr['supplierId'] ?? '',
                ':sname' => $pr['supplierName'] ?? 'مورد عام',
                ':total' => (float)($pr['total'] ?? 0),
                ':paid' => (float)($pr['paidAmount'] ?? 0),
                ':rem' => (float)($pr['remainingAmount'] ?? 0),
                ':method' => $pr['refundMethod'] ?? 'cash',
                ':safe' => $pr['safeId'] ?? 'safe-main',
                ':notes' => $pr['notes'] ?? ''
            ]);
            $pdo->prepare("DELETE FROM `purchase_return_items` WHERE `return_id` = ?")->execute([$pr['id']]);
            if (!empty($pr['items']) && is_array($pr['items'])) {
                foreach ($pr['items'] as $pri) {
                    $stmtPRItem->execute([
                        ':ret_id' => $pr['id'],
                        ':pid' => $pri['productId'] ?? '',
                        ':pname' => $pri['productName'] ?? '',
                        ':unit' => $pri['unit'] ?? 'قطعة',
                        ':price' => (float)($pri['unitPrice'] ?? 0),
                        ':qty' => (float)($pri['quantity'] ?? 1),
                        ':total' => (float)($pri['total'] ?? 0)
                    ]);
                }
            }
        }
        if ($mirrorDelete) {
            pruneTableByIds($pdo, 'purchase_returns', $keepIds);
            if (empty($keepIds)) {
                $pdo->exec("DELETE FROM `purchase_return_items`");
            } else {
                $placeholders = implode(',', array_fill(0, count($keepIds), '?'));
                $pdo->prepare("DELETE FROM `purchase_return_items` WHERE `return_id` NOT IN ({$placeholders})")->execute($keepIds);
            }
        }
    }

    // 10. Expenses
    if (isset($input['expenses']) && is_array($input['expenses'])) {
        $keepIds = [];
        $stmtEx = $pdo->prepare("
            INSERT INTO `expenses` (`id`, `title`, `category`, `amount`, `safe_id`, `recipient`, `date`, `notes`)
            VALUES (:id, :title, :category, :amount, :safe, :recipient, :date, :notes)
            ON DUPLICATE KEY UPDATE
                `title` = VALUES(`title`),
                `category` = VALUES(`category`),
                `amount` = VALUES(`amount`),
                `safe_id` = VALUES(`safe_id`),
                `recipient` = VALUES(`recipient`),
                `date` = VALUES(`date`),
                `notes` = VALUES(`notes`)
        ");
        foreach ($input['expenses'] as $ex) {
            if (empty($ex['id'])) continue;
            $keepIds[] = $ex['id'];
            $stmtEx->execute([
                ':id' => $ex['id'],
                ':title' => $ex['title'] ?? 'مصروف عام',
                ':category' => $ex['category'] ?? 'other',
                ':amount' => (float)($ex['amount'] ?? 0),
                ':safe' => $ex['safeId'] ?? 'safe-pos',
                ':recipient' => $ex['recipient'] ?? null,
                ':date' => toMysqlDateTime($ex['date'] ?? null),
                ':notes' => $ex['notes'] ?? ''
            ]);
        }
        if ($mirrorDelete) {
            pruneTableByIds($pdo, 'expenses', $keepIds);
        }
    }

    // 10b. Financial Transactions
    if (isset($input['transactions']) && is_array($input['transactions'])) {
        $keepIds = [];
        $stmtTx = $pdo->prepare("
            INSERT INTO `financial_transactions` (`id`, `type`, `title`, `amount`, `direction`, `related_id`, `safe_id`, `safe_name`, `date`, `notes`)
            VALUES (:id, :type, :title, :amount, :dir, :rel, :safe, :sname, :date, :notes)
            ON DUPLICATE KEY UPDATE
                `title` = VALUES(`title`),
                `amount` = VALUES(`amount`),
                `direction` = VALUES(`direction`),
                `notes` = VALUES(`notes`)
        ");
        foreach ($input['transactions'] as $tx) {
            if (empty($tx['id'])) continue;
            $keepIds[] = $tx['id'];
            $stmtTx->execute([
                ':id' => $tx['id'],
                ':type' => $tx['type'] ?? 'general_expense',
                ':title' => $tx['title'] ?? '',
                ':amount' => (float)($tx['amount'] ?? 0),
                ':dir' => ($tx['direction'] ?? 'in') === 'out' ? 'out' : 'in',
                ':rel' => $tx['referenceId'] ?? $tx['relatedId'] ?? null,
                ':safe' => $tx['safeId'] ?? 'safe-pos',
                ':sname' => $tx['safeName'] ?? null,
                ':date' => toMysqlDateTime($tx['date'] ?? null),
                ':notes' => $tx['notes'] ?? ''
            ]);
        }
        if ($mirrorDelete) {
            pruneTableByIds($pdo, 'financial_transactions', $keepIds);
        }
    }

    // 11. Assembly Recipes
    if (isset($input['recipes']) && is_array($input['recipes'])) {
        $keepIds = [];
        $stRc = $pdo->prepare("
            INSERT INTO `assembly_recipes` (`id`, `target_product_id`, `target_product_name`, `target_quantity`, `target_unit`, `labor_cost`, `other_cost`, `notes`)
            VALUES (:id, :t_id, :t_name, :t_qty, :t_unit, :l_cost, :o_cost, :notes)
            ON DUPLICATE KEY UPDATE
                `target_product_name` = VALUES(`target_product_name`),
                `target_quantity` = VALUES(`target_quantity`),
                `notes` = VALUES(`notes`)
        ");
        $stRcItem = $pdo->prepare("
            INSERT INTO `assembly_recipe_items` (`recipe_id`, `component_product_id`, `component_product_name`, `required_quantity`, `unit`, `unit_cost`, `notes`)
            VALUES (:rc_id, :c_id, :c_name, :qty, :unit, :cost, :notes)
        ");
        foreach ($input['recipes'] as $rc) {
            if (empty($rc['id'])) continue;
            $keepIds[] = $rc['id'];
            $stRc->execute([
                ':id' => $rc['id'],
                ':t_id' => $rc['outputProductId'] ?? $rc['targetProductId'] ?? '',
                ':t_name' => $rc['outputProductName'] ?? $rc['targetProductName'] ?? $rc['name'] ?? '',
                ':t_qty' => (float)($rc['outputQuantity'] ?? $rc['targetQuantity'] ?? 1),
                ':t_unit' => $rc['outputUnit'] ?? $rc['targetUnit'] ?? 'طقم',
                ':l_cost' => (float)($rc['laborCost'] ?? 0),
                ':o_cost' => (float)($rc['otherCost'] ?? 0),
                ':notes' => $rc['notes'] ?? ''
            ]);

            $pdo->prepare("DELETE FROM `assembly_recipe_items` WHERE `recipe_id` = ?")->execute([$rc['id']]);
            if (!empty($rc['components']) && is_array($rc['components'])) {
                foreach ($rc['components'] as $ci) {
                    $stRcItem->execute([
                        ':rc_id' => $rc['id'],
                        ':c_id' => $ci['productId'] ?? $ci['componentProductId'] ?? '',
                        ':c_name' => $ci['productName'] ?? $ci['componentProductName'] ?? '',
                        ':qty' => (float)($ci['quantity'] ?? $ci['requiredQuantity'] ?? 1),
                        ':unit' => $ci['unit'] ?? 'قطعة',
                        ':cost' => (float)($ci['unitCost'] ?? 0),
                        ':notes' => $ci['notes'] ?? ''
                    ]);
                }
            }
        }
        if ($mirrorDelete) {
            pruneTableByIds($pdo, 'assembly_recipes', $keepIds);
        }
    }

    // 11b. Assembly Operations
    if (isset($input['assemblyOperations']) && is_array($input['assemblyOperations'])) {
        $keepIds = [];
        $stOp = $pdo->prepare("
            INSERT INTO `assembly_operations` (`id`, `operation_type`, `operation_number`, `recipe_id`, `target_product_id`, `target_product_name`, `quantity`, `unit`, `labor_cost`, `other_cost`, `total_cost`, `unit_cost`, `selling_price`, `performed_by`, `date`, `notes`)
            VALUES (:id, :type, :num, :rec_id, :t_id, :t_name, :qty, :unit, :l_cost, :o_cost, :tot_cost, :u_cost, :sell_price, :by, :date, :notes)
            ON DUPLICATE KEY UPDATE
                `quantity` = VALUES(`quantity`),
                `total_cost` = VALUES(`total_cost`),
                `unit_cost` = VALUES(`unit_cost`),
                `selling_price` = VALUES(`selling_price`),
                `notes` = VALUES(`notes`)
        ");
        $stOpItem = $pdo->prepare("
            INSERT INTO `assembly_operation_items` (`operation_id`, `component_product_id`, `component_product_name`, `quantity_used`, `unit`, `unit_cost`, `selling_price`, `total_cost`, `direction`)
            VALUES (:op_id, :c_id, :c_name, :qty, :unit, :u_cost, :sell_price, :t_cost, :dir)
        ");
        foreach ($input['assemblyOperations'] as $op) {
            if (empty($op['id'])) continue;
            $keepIds[] = $op['id'];
            $opType = ($op['type'] ?? $op['operationType'] ?? 'disassembly') === 'assembly' ? 'assembly' : 'disassembly';
            $stOp->execute([
                ':id' => $op['id'],
                ':type' => $opType,
                ':num' => $op['operationNumber'] ?? $op['id'],
                ':rec_id' => $op['recipeId'] ?? null,
                ':t_id' => $op['targetProductId'] ?? '',
                ':t_name' => $op['targetProductName'] ?? '',
                ':qty' => (float)($op['quantity'] ?? 1),
                ':unit' => $op['targetUnit'] ?? $op['unit'] ?? 'قطعة',
                ':l_cost' => (float)($op['laborCost'] ?? 0),
                ':o_cost' => (float)($op['otherCost'] ?? 0),
                ':tot_cost' => (float)($op['totalCost'] ?? 0),
                ':u_cost' => (float)($op['unitCost'] ?? 0),
                ':sell_price' => isset($op['sellingPrice']) ? (float)$op['sellingPrice'] : null,
                ':by' => $op['performedBy'] ?? 'أمين المخزن',
                ':date' => toMysqlDateTime($op['date'] ?? null),
                ':notes' => $op['notes'] ?? ''
            ]);
            $pdo->prepare("DELETE FROM `assembly_operation_items` WHERE `operation_id` = ?")->execute([$op['id']]);
            $itemsList = !empty($op['componentsAffected']) ? $op['componentsAffected'] : ($op['componentsUsed'] ?? []);
            if (is_array($itemsList)) {
                foreach ($itemsList as $item) {
                    $stOpItem->execute([
                        ':op_id' => $op['id'],
                        ':c_id' => $item['productId'] ?? $item['componentProductId'] ?? '',
                        ':c_name' => $item['productName'] ?? $item['componentProductName'] ?? '',
                        ':qty' => (float)($item['quantity'] ?? $item['totalQuantity'] ?? $item['quantityUsed'] ?? 1),
                        ':unit' => $item['unit'] ?? 'قطعة',
                        ':u_cost' => (float)($item['unitCost'] ?? 0),
                        ':sell_price' => isset($item['sellingPrice']) ? (float)$item['sellingPrice'] : null,
                        ':t_cost' => (float)($item['totalCost'] ?? 0),
                        ':dir' => $item['direction'] ?? 'deducted'
                    ]);
                }
            }
        }
        if ($mirrorDelete) {
            pruneTableByIds($pdo, 'assembly_operations', $keepIds);
        }
    }

    // 12. Associations
    if (isset($input['associations']) && is_array($input['associations'])) {
        $keepIds = [];
        $stAssoc = $pdo->prepare("
            INSERT INTO `money_associations` (`id`, `name`, `monthly_share_amount`, `total_shares_count`, `current_round`, `start_date`, `duration_months`, `our_payout_month`, `is_received`, `notes`, `members_json`)
            VALUES (:id, :name, :share, :count, :round, :start, :duration, :payout, :rec, :notes, :members)
            ON DUPLICATE KEY UPDATE
                `name` = VALUES(`name`),
                `monthly_share_amount` = VALUES(`monthly_share_amount`),
                `current_round` = VALUES(`current_round`),
                `is_received` = VALUES(`is_received`),
                `members_json` = VALUES(`members_json`)
        ");
        foreach ($input['associations'] as $ma) {
            if (empty($ma['id'])) continue;
            $keepIds[] = $ma['id'];
            $stAssoc->execute([
                ':id' => $ma['id'],
                ':name' => $ma['name'] ?? '',
                ':share' => (float)($ma['monthlyShareAmount'] ?? $ma['monthlyInstallment'] ?? 1000),
                ':count' => (int)($ma['totalSharesCount'] ?? $ma['totalMonths'] ?? 10),
                ':round' => (int)($ma['currentRound'] ?? $ma['paidMonths'] ?? 1),
                ':start' => toMysqlDate($ma['startDate'] ?? null) ?? date('Y-m-d'),
                ':duration' => (int)($ma['durationMonths'] ?? $ma['totalMonths'] ?? 10),
                ':payout' => (int)($ma['ourPayoutMonth'] ?? $ma['payoutTurnMonth'] ?? 1),
                ':rec' => !empty($ma['isReceived']) ? 1 : 0,
                ':notes' => $ma['notes'] ?? '',
                ':members' => !empty($ma['members']) ? json_encode($ma['members'], JSON_UNESCAPED_UNICODE) : null
            ]);
        }
        if ($mirrorDelete) {
            pruneTableByIds($pdo, 'money_associations', $keepIds);
        }
    }

    // 13. Waste Records
    if (isset($input['wasteRecords']) && is_array($input['wasteRecords'])) {
        $keepIds = [];
        $stWaste = $pdo->prepare("
            INSERT INTO `waste_records` (`id`, `product_id`, `product_name`, `category`, `unit`, `quantity`, `cost_price`, `loss_value`, `reason`, `date`, `notes`)
            VALUES (:id, :pid, :pname, :cat, :unit, :qty, :cost, :loss, :reason, :date, :notes)
            ON DUPLICATE KEY UPDATE `quantity` = VALUES(`quantity`), `loss_value` = VALUES(`loss_value`)
        ");
        foreach ($input['wasteRecords'] as $wr) {
            if (empty($wr['id'])) continue;
            $keepIds[] = $wr['id'];
            $stWaste->execute([
                ':id' => $wr['id'],
                ':pid' => $wr['productId'] ?? '',
                ':pname' => $wr['productName'] ?? '',
                ':cat' => $wr['category'] ?? 'wires_cables',
                ':unit' => $wr['unit'] ?? 'قطعة',
                ':qty' => (float)($wr['quantity'] ?? 1),
                ':cost' => (float)($wr['costPrice'] ?? 0),
                ':loss' => (float)($wr['lossValue'] ?? 0),
                ':reason' => $wr['reason'] ?? 'damaged',
                ':date' => toMysqlDateTime($wr['date'] ?? null),
                ':notes' => $wr['notes'] ?? ''
            ]);
        }
        if ($mirrorDelete) {
            pruneTableByIds($pdo, 'waste_records', $keepIds);
        }
    }

    echo json_encode([
        'success' => true,
        'message' => '✓ تمت مزامنة وحفظ وتحديث كافة البيانات بنجاح في قاعدة بيانات MySQL على XAMPP!',
        'syncedCounts' => [
            'products' => count($input['products'] ?? []),
            'customers' => count($input['customers'] ?? []),
            'suppliers' => count($input['suppliers'] ?? []),
            'safes' => count($input['safes'] ?? []),
            'users' => count($input['users'] ?? []),
            'salesInvoices' => count($input['salesInvoices'] ?? []),
            'purchaseInvoices' => count($input['purchaseInvoices'] ?? [])
        ]
    ], JSON_UNESCAPED_UNICODE);
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'خطأ أثناء المزامنة في MySQL: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
