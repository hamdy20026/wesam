<?php
// config.php - Master XAMPP MySQL Database Connection & Schema Config
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$configFile = __DIR__ . '/config.json';
$defaultConfig = [
    'host' => 'localhost',
    'port' => 3306,
    'user' => 'root',
    'password' => '',
    'database' => 'alhana_pro_erp'
];

if (file_exists($configFile)) {
    $saved = json_decode(file_get_contents($configFile), true);
    if (is_array($saved)) {
        $defaultConfig = array_merge($defaultConfig, $saved);
    }
}

$host = $defaultConfig['host'];
$port = (int)($defaultConfig['port'] ?? 3306);
$db   = $defaultConfig['database'];
$user = $defaultConfig['user'];
$pass = $defaultConfig['password'];
$charset = 'utf8mb4';

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

/**
 * Safely converts any ISO 8601 / string date into MySQL DATETIME ('Y-m-d H:i:s').
 */
function toMysqlDateTime($val, $allowNull = false) {
    if ($val === null || $val === '' || $val === false) {
        return $allowNull ? null : date('Y-m-d H:i:s');
    }
    $ts = strtotime((string)$val);
    if ($ts === false || $ts <= 0) {
        return $allowNull ? null : date('Y-m-d H:i:s');
    }
    return date('Y-m-d H:i:s', $ts);
}

/**
 * Safely converts a date string into MySQL DATE ('Y-m-d') or NULL if empty/invalid.
 */
function toMysqlDate($val) {
    if ($val === null || trim((string)$val) === '' || $val === false) {
        return null;
    }
    $ts = strtotime((string)$val);
    if ($ts === false || $ts <= 0) {
        return null;
    }
    return date('Y-m-d', $ts);
}

function ensureTablesExist($pdo, $forceSeed = false) {
    // 1. Users
    $pdo->exec("CREATE TABLE IF NOT EXISTS `users` (
        `id` VARCHAR(50) NOT NULL PRIMARY KEY,
        `username` VARCHAR(50) NOT NULL UNIQUE,
        `name` VARCHAR(150) NOT NULL,
        `role` ENUM('admin', 'cashier', 'storekeeper') NOT NULL DEFAULT 'cashier',
        `phone` VARCHAR(30) DEFAULT NULL,
        `password_hash` VARCHAR(255) NOT NULL,
        `is_active` TINYINT(1) NOT NULL DEFAULT 1,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 2. Settings
    $pdo->exec("CREATE TABLE IF NOT EXISTS `settings` (
        `id` INT PRIMARY KEY AUTO_INCREMENT,
        `store_name` VARCHAR(250) NOT NULL,
        `owner_name` VARCHAR(150) DEFAULT NULL,
        `phone` VARCHAR(50) DEFAULT NULL,
        `phone_alt` VARCHAR(50) DEFAULT NULL,
        `address` TEXT DEFAULT NULL,
        `commercial_record` VARCHAR(100) DEFAULT NULL,
        `agricultural_license` VARCHAR(150) DEFAULT NULL,
        `tax_rate` DECIMAL(5,2) DEFAULT 0.00,
        `currency` VARCHAR(20) DEFAULT 'ج.م',
        `invoice_footer_note` TEXT DEFAULT NULL,
        `permissions_matrix` LONGTEXT DEFAULT NULL,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 3. Safes
    $pdo->exec("CREATE TABLE IF NOT EXISTS `safes` (
        `id` VARCHAR(50) NOT NULL PRIMARY KEY,
        `name` VARCHAR(150) NOT NULL,
        `type` VARCHAR(50) NOT NULL DEFAULT 'cash',
        `balance` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `account_number` VARCHAR(100) DEFAULT NULL,
        `is_default` TINYINT(1) NOT NULL DEFAULT 0,
        `notes` TEXT DEFAULT NULL,
        `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 4. Safe Transfers
    $pdo->exec("CREATE TABLE IF NOT EXISTS `safe_transfers` (
        `id` VARCHAR(50) NOT NULL PRIMARY KEY,
        `transfer_number` VARCHAR(100) DEFAULT NULL,
        `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `from_safe_id` VARCHAR(50) NOT NULL,
        `from_safe_name` VARCHAR(150) NOT NULL,
        `to_safe_id` VARCHAR(50) NOT NULL,
        `to_safe_name` VARCHAR(150) NOT NULL,
        `amount` DECIMAL(18,2) NOT NULL,
        `performed_by` VARCHAR(150) NOT NULL,
        `notes` TEXT DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 5. Suppliers
    $pdo->exec("CREATE TABLE IF NOT EXISTS `suppliers` (
        `id` VARCHAR(50) NOT NULL PRIMARY KEY,
        `name` VARCHAR(250) NOT NULL,
        `company_name` VARCHAR(250) DEFAULT NULL,
        `representative_name` VARCHAR(200) DEFAULT NULL,
        `phone` VARCHAR(50) NOT NULL,
        `address` VARCHAR(300) DEFAULT NULL,
        `supplied_categories` VARCHAR(300) DEFAULT NULL,
        `initial_balance` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `current_balance` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `notes` TEXT DEFAULT NULL,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 6. Customers
    $pdo->exec("CREATE TABLE IF NOT EXISTS `customers` (
        `id` VARCHAR(50) NOT NULL PRIMARY KEY,
        `code` VARCHAR(50) DEFAULT NULL,
        `name` VARCHAR(250) NOT NULL,
        `phone` VARCHAR(50) NOT NULL,
        `address` VARCHAR(300) DEFAULT NULL,
        `customer_type` VARCHAR(50) DEFAULT 'retail',
        `commercial_record` VARCHAR(100) DEFAULT NULL,
        `initial_balance` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `current_balance` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `credit_limit` DECIMAL(18,2) NOT NULL DEFAULT 50000.00,
        `crop_types` VARCHAR(300) DEFAULT NULL,
        `farm_area` VARCHAR(100) DEFAULT NULL,
        `notes` TEXT DEFAULT NULL,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 7. Products
    $pdo->exec("CREATE TABLE IF NOT EXISTS `products` (
        `id` VARCHAR(50) NOT NULL PRIMARY KEY,
        `name` VARCHAR(250) NOT NULL,
        `category` VARCHAR(50) NOT NULL,
        `brand` VARCHAR(100) DEFAULT NULL,
        `voltage` VARCHAR(50) DEFAULT NULL,
        `power_watt` VARCHAR(50) DEFAULT NULL,
        `amperage` VARCHAR(50) DEFAULT NULL,
        `warranty_months` INT DEFAULT 0,
        `barcode` VARCHAR(100) NOT NULL,
        `unit` VARCHAR(50) NOT NULL DEFAULT 'قطعة',
        `purchase_price` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `selling_price` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `wholesale_price` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `quantity` DECIMAL(18,3) NOT NULL DEFAULT 0.000,
        `min_alert_quantity` DECIMAL(18,3) NOT NULL DEFAULT 5.000,
        `batch_number` VARCHAR(100) DEFAULT NULL,
        `expiry_date` DATE DEFAULT NULL,
        `supplier_id` VARCHAR(50) DEFAULT NULL,
        `is_composite` TINYINT(1) NOT NULL DEFAULT 0,
        `recipe_id` VARCHAR(50) DEFAULT NULL,
        `is_weighable` TINYINT(1) NOT NULL DEFAULT 0,
        `tare_weight` DECIMAL(10,3) DEFAULT 0.000,
        `notes` TEXT DEFAULT NULL,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX `idx_barcode` (`barcode`),
        INDEX `idx_category` (`category`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 8. Sales Invoices
    $pdo->exec("CREATE TABLE IF NOT EXISTS `sales_invoices` (
        `id` VARCHAR(50) NOT NULL PRIMARY KEY,
        `invoice_number` VARCHAR(100) NOT NULL UNIQUE,
        `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `customer_id` VARCHAR(50) NOT NULL,
        `customer_name` VARCHAR(250) NOT NULL,
        `customer_phone` VARCHAR(50) DEFAULT NULL,
        `subtotal` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `discount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `total` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `paid_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `remaining_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `payment_method` VARCHAR(50) NOT NULL DEFAULT 'cash',
        `safe_id` VARCHAR(50) DEFAULT 'safe-pos',
        `notes` TEXT DEFAULT NULL,
        `status` VARCHAR(50) NOT NULL DEFAULT 'completed',
        INDEX `idx_sales_date` (`date`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 9. Sales Invoice Items
    $pdo->exec("CREATE TABLE IF NOT EXISTS `sales_invoice_items` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `invoice_id` VARCHAR(50) NOT NULL,
        `product_id` VARCHAR(50) NOT NULL,
        `product_name` VARCHAR(250) NOT NULL,
        `category` VARCHAR(50) DEFAULT NULL,
        `brand` VARCHAR(100) DEFAULT NULL,
        `unit` VARCHAR(50) NOT NULL,
        `unit_price` DECIMAL(18,2) NOT NULL,
        `purchase_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `quantity` DECIMAL(18,3) NOT NULL,
        `discount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `discount_type` VARCHAR(20) NOT NULL DEFAULT 'fixed',
        `total` DECIMAL(18,2) NOT NULL,
        INDEX `idx_sitems_inv` (`invoice_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 10. Purchase Invoices
    $pdo->exec("CREATE TABLE IF NOT EXISTS `purchase_invoices` (
        `id` VARCHAR(50) NOT NULL PRIMARY KEY,
        `invoice_number` VARCHAR(100) NOT NULL UNIQUE,
        `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `supplier_id` VARCHAR(50) NOT NULL,
        `supplier_name` VARCHAR(250) NOT NULL,
        `total` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `paid_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `remaining_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `payment_method` VARCHAR(50) NOT NULL DEFAULT 'credit',
        `safe_id` VARCHAR(50) DEFAULT 'safe-main',
        `notes` TEXT DEFAULT NULL,
        `status` VARCHAR(50) NOT NULL DEFAULT 'completed',
        INDEX `idx_purchases_date` (`date`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 11. Purchase Invoice Items
    $pdo->exec("CREATE TABLE IF NOT EXISTS `purchase_invoice_items` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `invoice_id` VARCHAR(50) NOT NULL,
        `product_id` VARCHAR(50) NOT NULL,
        `product_name` VARCHAR(250) NOT NULL,
        `unit` VARCHAR(50) NOT NULL,
        `unit_price` DECIMAL(18,2) NOT NULL,
        `quantity` DECIMAL(18,3) NOT NULL,
        `discount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `discount_type` VARCHAR(20) NOT NULL DEFAULT 'fixed',
        `total` DECIMAL(18,2) NOT NULL,
        `batch_number` VARCHAR(100) DEFAULT NULL,
        `expiry_date` DATE DEFAULT NULL,
        INDEX `idx_pitems_inv` (`invoice_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 12. Sales Returns
    $pdo->exec("CREATE TABLE IF NOT EXISTS `sales_returns` (
        `id` VARCHAR(50) NOT NULL PRIMARY KEY,
        `return_number` VARCHAR(100) NOT NULL UNIQUE,
        `original_invoice_number` VARCHAR(100) DEFAULT NULL,
        `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `customer_id` VARCHAR(50) NOT NULL,
        `customer_name` VARCHAR(250) NOT NULL,
        `total` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `paid_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `remaining_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `refund_method` VARCHAR(50) NOT NULL DEFAULT 'cash',
        `safe_id` VARCHAR(50) DEFAULT 'safe-pos',
        `notes` TEXT DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `sales_return_items` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `return_id` VARCHAR(50) NOT NULL,
        `product_id` VARCHAR(50) NOT NULL,
        `product_name` VARCHAR(250) NOT NULL,
        `unit` VARCHAR(50) NOT NULL,
        `unit_price` DECIMAL(18,2) NOT NULL,
        `quantity` DECIMAL(18,3) NOT NULL,
        `total` DECIMAL(18,2) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 13. Purchase Returns
    $pdo->exec("CREATE TABLE IF NOT EXISTS `purchase_returns` (
        `id` VARCHAR(50) NOT NULL PRIMARY KEY,
        `return_number` VARCHAR(100) NOT NULL UNIQUE,
        `original_invoice_number` VARCHAR(100) DEFAULT NULL,
        `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `supplier_id` VARCHAR(50) NOT NULL,
        `supplier_name` VARCHAR(250) NOT NULL,
        `total` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `paid_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `remaining_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `refund_method` VARCHAR(50) NOT NULL DEFAULT 'cash',
        `safe_id` VARCHAR(50) DEFAULT 'safe-main',
        `notes` TEXT DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `purchase_return_items` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `return_id` VARCHAR(50) NOT NULL,
        `product_id` VARCHAR(50) NOT NULL,
        `product_name` VARCHAR(250) NOT NULL,
        `unit` VARCHAR(50) NOT NULL,
        `unit_price` DECIMAL(18,2) NOT NULL,
        `quantity` DECIMAL(18,3) NOT NULL,
        `total` DECIMAL(18,2) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 14. Expenses
    $pdo->exec("CREATE TABLE IF NOT EXISTS `expenses` (
        `id` VARCHAR(50) NOT NULL PRIMARY KEY,
        `title` VARCHAR(250) NOT NULL,
        `category` VARCHAR(50) NOT NULL DEFAULT 'other',
        `amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `safe_id` VARCHAR(50) DEFAULT 'safe-pos',
        `recipient` VARCHAR(150) DEFAULT NULL,
        `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `notes` TEXT DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 15. Financial Transactions
    $pdo->exec("CREATE TABLE IF NOT EXISTS `financial_transactions` (
        `id` VARCHAR(50) NOT NULL PRIMARY KEY,
        `type` VARCHAR(50) NOT NULL,
        `title` VARCHAR(250) NOT NULL,
        `amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `direction` ENUM('in', 'out') NOT NULL,
        `related_id` VARCHAR(50) DEFAULT NULL,
        `safe_id` VARCHAR(50) DEFAULT 'safe-pos',
        `safe_name` VARCHAR(150) DEFAULT NULL,
        `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `notes` TEXT DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 16. Shifts
    $pdo->exec("CREATE TABLE IF NOT EXISTS `shifts` (
        `id` VARCHAR(50) NOT NULL PRIMARY KEY,
        `user_id` VARCHAR(50) NOT NULL,
        `user_name` VARCHAR(150) NOT NULL,
        `opened_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `closed_at` DATETIME DEFAULT NULL,
        `starting_balance` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `sales_revenue` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `other_incomes` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `other_expenses` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `expected_balance` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `actual_balance` DECIMAL(18,2) DEFAULT NULL,
        `difference` DECIMAL(18,2) DEFAULT NULL,
        `notes` TEXT DEFAULT NULL,
        `status` ENUM('open', 'closed') NOT NULL DEFAULT 'open'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 17. Assembly Recipes & Items
    $pdo->exec("CREATE TABLE IF NOT EXISTS `assembly_recipes` (
        `id` VARCHAR(50) NOT NULL PRIMARY KEY,
        `target_product_id` VARCHAR(50) NOT NULL,
        `target_product_name` VARCHAR(250) NOT NULL,
        `target_quantity` DECIMAL(18,3) NOT NULL DEFAULT 1.000,
        `target_unit` VARCHAR(50) NOT NULL DEFAULT 'طقم',
        `labor_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `other_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `notes` TEXT DEFAULT NULL,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `assembly_recipe_items` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `recipe_id` VARCHAR(50) NOT NULL,
        `component_product_id` VARCHAR(50) NOT NULL,
        `component_product_name` VARCHAR(250) NOT NULL,
        `required_quantity` DECIMAL(18,3) NOT NULL,
        `unit` VARCHAR(50) NOT NULL,
        `unit_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `notes` TEXT DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 18. Assembly Operations & Items
    $pdo->exec("CREATE TABLE IF NOT EXISTS `assembly_operations` (
        `id` VARCHAR(50) NOT NULL PRIMARY KEY,
        `operation_type` ENUM('assembly', 'disassembly') NOT NULL,
        `operation_number` VARCHAR(100) NOT NULL UNIQUE,
        `recipe_id` VARCHAR(50) DEFAULT NULL,
        `target_product_id` VARCHAR(50) NOT NULL,
        `target_product_name` VARCHAR(250) NOT NULL,
        `quantity` DECIMAL(18,3) NOT NULL,
        `unit` VARCHAR(50) NOT NULL DEFAULT 'طقم',
        `labor_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `other_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `total_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `unit_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `selling_price` DECIMAL(18,2) DEFAULT NULL,
        `performed_by` VARCHAR(150) NOT NULL,
        `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `notes` TEXT DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `assembly_operation_items` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `operation_id` VARCHAR(50) NOT NULL,
        `component_product_id` VARCHAR(50) NOT NULL,
        `component_product_name` VARCHAR(250) NOT NULL,
        `quantity_used` DECIMAL(18,3) NOT NULL,
        `unit` VARCHAR(50) NOT NULL,
        `unit_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `selling_price` DECIMAL(18,2) DEFAULT NULL,
        `total_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        `direction` VARCHAR(20) DEFAULT 'deducted'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 19. Money Associations
    $pdo->exec("CREATE TABLE IF NOT EXISTS `money_associations` (
        `id` VARCHAR(50) NOT NULL PRIMARY KEY,
        `name` VARCHAR(250) NOT NULL,
        `monthly_share_amount` DECIMAL(18,2) NOT NULL,
        `total_shares_count` INT NOT NULL DEFAULT 10,
        `current_round` INT NOT NULL DEFAULT 1,
        `start_date` DATE NOT NULL,
        `duration_months` INT NOT NULL DEFAULT 10,
        `our_payout_month` INT DEFAULT 1,
        `is_received` TINYINT(1) NOT NULL DEFAULT 0,
        `notes` TEXT DEFAULT NULL,
        `members_json` LONGTEXT DEFAULT NULL,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 20. Waste Records
    $pdo->exec("CREATE TABLE IF NOT EXISTS `waste_records` (
        `id` VARCHAR(50) NOT NULL PRIMARY KEY,
        `product_id` VARCHAR(50) NOT NULL,
        `product_name` VARCHAR(250) NOT NULL,
        `category` VARCHAR(50) NOT NULL,
        `unit` VARCHAR(50) NOT NULL,
        `quantity` DECIMAL(18,3) NOT NULL,
        `cost_price` DECIMAL(18,2) NOT NULL,
        `loss_value` DECIMAL(18,2) NOT NULL,
        `reason` VARCHAR(50) NOT NULL DEFAULT 'damaged',
        `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `notes` TEXT DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Dynamic Column Migrations (adds columns if missing from old migrations)
    $migrations = [
        "ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `brand` VARCHAR(100) DEFAULT NULL",
        "ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `voltage` VARCHAR(50) DEFAULT NULL",
        "ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `power_watt` VARCHAR(50) DEFAULT NULL",
        "ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `amperage` VARCHAR(50) DEFAULT NULL",
        "ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `warranty_months` INT DEFAULT 0",
        "ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `wholesale_price` DECIMAL(18,2) NOT NULL DEFAULT 0.00",
        "ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `is_composite` TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `recipe_id` VARCHAR(50) DEFAULT NULL",
        "ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `is_weighable` TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `tare_weight` DECIMAL(10,3) DEFAULT 0.000",
        "ALTER TABLE `customers` ADD COLUMN IF NOT EXISTS `code` VARCHAR(50) DEFAULT NULL",
        "ALTER TABLE `customers` ADD COLUMN IF NOT EXISTS `customer_type` VARCHAR(50) DEFAULT 'retail'",
        "ALTER TABLE `customers` ADD COLUMN IF NOT EXISTS `commercial_record` VARCHAR(100) DEFAULT NULL",
        "ALTER TABLE `customers` ADD COLUMN IF NOT EXISTS `initial_balance` DECIMAL(18,2) NOT NULL DEFAULT 0.00",
        "ALTER TABLE `customers` ADD COLUMN IF NOT EXISTS `credit_limit` DECIMAL(18,2) NOT NULL DEFAULT 50000.00",
        "ALTER TABLE `customers` ADD COLUMN IF NOT EXISTS `crop_types` VARCHAR(300) DEFAULT NULL",
        "ALTER TABLE `customers` ADD COLUMN IF NOT EXISTS `farm_area` VARCHAR(100) DEFAULT NULL",
        "ALTER TABLE `suppliers` ADD COLUMN IF NOT EXISTS `company_name` VARCHAR(250) DEFAULT NULL",
        "ALTER TABLE `suppliers` ADD COLUMN IF NOT EXISTS `representative_name` VARCHAR(200) DEFAULT NULL",
        "ALTER TABLE `suppliers` ADD COLUMN IF NOT EXISTS `supplied_categories` VARCHAR(300) DEFAULT NULL",
        "ALTER TABLE `suppliers` ADD COLUMN IF NOT EXISTS `initial_balance` DECIMAL(18,2) NOT NULL DEFAULT 0.00",
        "ALTER TABLE `settings` ADD COLUMN IF NOT EXISTS `permissions_matrix` LONGTEXT DEFAULT NULL",
        "ALTER TABLE `sales_returns` ADD COLUMN IF NOT EXISTS `paid_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00",
        "ALTER TABLE `sales_returns` ADD COLUMN IF NOT EXISTS `remaining_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00",
        "ALTER TABLE `sales_returns` ADD COLUMN IF NOT EXISTS `safe_id` VARCHAR(50) DEFAULT 'safe-pos'",
        "ALTER TABLE `purchase_returns` ADD COLUMN IF NOT EXISTS `paid_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00",
        "ALTER TABLE `purchase_returns` ADD COLUMN IF NOT EXISTS `remaining_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00",
        "ALTER TABLE `purchase_returns` ADD COLUMN IF NOT EXISTS `safe_id` VARCHAR(50) DEFAULT 'safe-main'",
        "ALTER TABLE `assembly_operations` ADD COLUMN IF NOT EXISTS `selling_price` DECIMAL(18,2) DEFAULT NULL",
        "ALTER TABLE `assembly_operation_items` ADD COLUMN IF NOT EXISTS `selling_price` DECIMAL(18,2) DEFAULT NULL",
        "ALTER TABLE `assembly_operation_items` ADD COLUMN IF NOT EXISTS `direction` VARCHAR(20) DEFAULT 'deducted'"
    ];

    foreach ($migrations as $mSql) {
        try {
            $pdo->exec($mSql);
        } catch (\Throwable $e) {}
    }

    // Check if database is brand new (settings table has 0 rows)
    $isBrandNewDb = false;
    try {
        $sCount = (int)$pdo->query("SELECT COUNT(*) FROM `settings`")->fetchColumn();
        if ($sCount === 0) {
            $isBrandNewDb = true;
            $pdo->exec("INSERT INTO `settings` (`id`, `store_name`, `owner_name`, `phone`, `phone_alt`, `address`, `commercial_record`, `agricultural_license`, `tax_rate`, `currency`, `invoice_footer_note`) VALUES
                (1, 'وسام للأدوات والتوريدات الكهربائية', 'مؤسسة وسام للأدوات الكهربائية', '01000000001', '01200000002', 'القاهرة - السبتية - شارع سوق الكهرباء', 'س.ت: 894520 / ب.ض: 432-876-100', 'سجل صناعي وتجاري معتمد', 0.00, 'ج.م', 'شكراً لتعاملكم مع وسام للأدوات الكهربائية • بضاعة أصلية وضمان معتمد')");
        }
    } catch (\Throwable $e) {}

    // Always ensure permanent 'walk-in' cash customer exists and is protected
    try {
        $pdo->exec("INSERT INTO `customers` (`id`, `code`, `name`, `phone`, `address`, `customer_type`, `initial_balance`, `current_balance`, `credit_limit`, `crop_types`, `notes`) VALUES
            ('walk-in', 'CUST-000', 'عميل نقدي عام', '0000000000', 'مبيعات الكاشير المباشرة', 'retail', 0.00, 0.00, 0.00, 'عميل نقدي عام (حساب دائم)', 'حساب دائم في النظام للمبيعات النقدية المباشرة - محمي من الحذف والتعديل ولا يسمح له بفواتير آجل نهائياً')
            ON DUPLICATE KEY UPDATE `name` = 'عميل نقدي عام', `initial_balance` = 0.00, `current_balance` = 0.00, `credit_limit` = 0.00");
    } catch (\Throwable $e) {}

    // Always ensure at least admin user exists so the user is never locked out
    try {
        $uCount = (int)$pdo->query("SELECT COUNT(*) FROM `users`")->fetchColumn();
        if ($uCount === 0 || $isBrandNewDb || $forceSeed) {
            $pdo->exec("INSERT INTO `users` (`id`, `username`, `name`, `role`, `phone`, `password_hash`, `is_active`) VALUES
                ('usr-admin', 'admin', 'المهندس وسام (مدير النظام)', 'admin', '01000000001', '123456', 1),
                ('usr-cashier', 'cashier', 'أحمد كاشير (نقطة البيع)', 'cashier', '01122334455', '123456', 1),
                ('usr-store', 'storekeeper', 'محمود أمين المخزن والتجميع', 'storekeeper', '01233445566', '123456', 1)
                ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`)");
        }
    } catch (\Throwable $e) {}

    // ONLY seed initial sample Safes, Suppliers, Customers, and Products when the database is brand new OR explicitly forced via init_db.php!
    // This prevents deleted products, customers, or suppliers from ever coming back on subsequent requests.
    if ($isBrandNewDb || $forceSeed) {
        try {
            $sfCount = (int)$pdo->query("SELECT COUNT(*) FROM `safes`")->fetchColumn();
            if ($sfCount === 0) {
                $pdo->exec("INSERT INTO `safes` (`id`, `name`, `type`, `balance`, `account_number`, `is_default`, `notes`) VALUES
                    ('safe-main', 'الخزينة الرئيسية (المكتب)', 'cash', 45000.00, 'CASH-MAIN-01', 0, 'الخزينة المركزية بالمكتب الرئيسي'),
                    ('safe-pos', 'درج كاشير نقطة البيع (POS)', 'pos_drawer', 5000.00, 'DRAWER-POS-01', 1, 'عهدة درج الكاشير للعمليات اليومية'),
                    ('safe-bank', 'حساب بنك مصر الجاري', 'bank', 120000.00, '14001990000234', 0, 'الحساب البنكي الرسمي للتوريدات والتحويلات'),
                    ('safe-vodafone', 'محفظة فودافون كاش (01000000001)', 'wallet', 12500.00, '01000000001', 0, 'محفظة إلكترونية للتحصيلات'),
                    ('safe-instapay', 'محفظة انستاباي InstaPay', 'wallet', 8400.00, 'wessam@instapay', 0, 'دفع وتحصيل فوري عبر انستاباي')
                    ON DUPLICATE KEY UPDATE `name` = VALUES(`name`)");
            }
        } catch (\Throwable $e) {}

        try {
            $supCount = (int)$pdo->query("SELECT COUNT(*) FROM `suppliers`")->fetchColumn();
            if ($supCount === 0) {
                $pdo->exec("INSERT INTO `suppliers` (`id`, `name`, `representative_name`, `phone`, `address`, `supplied_categories`, `initial_balance`, `current_balance`, `notes`) VALUES
                    ('sup-1', 'شركة السويدي للكابلات والأسلاك', 'م. تامر ممدوح', '01011112222', 'العاشر من رمضان - المنطقة الصناعية', 'أسلاك وكابلات كهربائية', 18500.00, 18500.00, 'توريد كابلات السويدي الأصلية المعتمدة'),
                    ('sup-2', 'شركة فينوس للصناعات الكهربائية', 'أ. طارق عبد الرحمن', '01122223333', 'مدينة العبور - القاهرة', 'مفاتيح وبرايز وشاسيهات ولدات', 0.00, 0.00, 'توريد مفاتيح وشاسيهات ولمبات فينوس'),
                    ('sup-3', 'شنايدر إلكتريك مصر (Schneider)', 'م. كمال نبيل', '01233334444', 'القاهرة الجديدة', 'قواطع ولوحات توزيع', 32000.00, 32000.00, 'توريد قواطع ولوحات توزيع')
                    ON DUPLICATE KEY UPDATE `name` = VALUES(`name`)");
            }
        } catch (\Throwable $e) {}

        try {
            $cCount = (int)$pdo->query("SELECT COUNT(*) FROM `customers`")->fetchColumn();
            if ($cCount <= 1) {
                $pdo->exec("INSERT INTO `customers` (`id`, `code`, `name`, `phone`, `address`, `customer_type`, `initial_balance`, `current_balance`, `credit_limit`, `notes`) VALUES
                    ('cust-1', 'CUST-001', 'المقاول حسن الصاوي (شركة الصاوي للمقاولات والديكور)', '01012345678', 'مدينة نصر - القاهرة', 'contractor', 0.00, 14500.00, 100000.00, 'مقاول كهرباء وتشطيبات معتمد'),
                    ('cust-2', 'CUST-002', 'الأسطى رجب الكهربائي (فني تشطيبات)', '01198765432', 'شبرا الخيمة', 'technician', 0.00, 2400.00, 15000.00, 'فني كهربائي تأسيس وتشطيب'),
                    ('cust-3', 'CUST-003', 'برج الأندلس السكني (م. سامح عزيز)', '01255556666', 'مصر الجديدة', 'company', 0.00, 0.00, 80000.00, 'تأسيس شبكة الكهرباء بالكامل')
                    ON DUPLICATE KEY UPDATE `name` = VALUES(`name`)");
            }
        } catch (\Throwable $e) {}

        try {
            $pCount = (int)$pdo->query("SELECT COUNT(*) FROM `products`")->fetchColumn();
            if ($pCount === 0) {
                $pdo->exec("INSERT INTO `products` (`id`, `name`, `category`, `brand`, `voltage`, `power_watt`, `amperage`, `warranty_months`, `barcode`, `unit`, `purchase_price`, `selling_price`, `wholesale_price`, `quantity`, `min_alert_quantity`, `supplier_id`) VALUES
                    ('prod-1', 'سلك نحاس معزول 1.5 مم سويدي أصلي (لفة 100م)', 'wires_cables', 'السويدي للكابلات', '450/750V', NULL, NULL, 120, '6221001001501', 'لفة', 1150.00, 1400.00, 1300.00, 35.000, 10.000, 'sup-1'),
                    ('prod-2', 'سلك نحاس معزول 2.5 مم سويدي أصلي (لفة 100م)', 'wires_cables', 'السويدي للكابلات', '450/750V', NULL, NULL, 120, '6221001002508', 'لفة', 1450.00, 1780.00, 1650.00, 28.000, 10.000, 'sup-1'),
                    ('prod-3', 'سلك دش نحاس معزول RG6 عالي الجودة (متر)', 'wires_cables', 'السويدي للكابلات', NULL, NULL, NULL, 60, '6221001000061', 'متر', 10.50, 14.00, 12.00, 450.000, 100.000, 'sup-1'),
                    ('prod-4', 'لقمة بريزة مفردة شنايدر أصلي مع طرف تأريض 16A', 'switches_sockets', 'شنايدر إلكتريك', '250V', NULL, '16A', 60, '3606480016012', 'قطعة', 32.00, 42.00, 37.00, 85.000, 20.000, 'sup-3'),
                    ('prod-5', 'شاسيه ماجيك حديد مقوى فينوس مع مسامير التثبيت', 'switches_sockets', 'فينوس', NULL, NULL, NULL, 60, '6222002000014', 'قطعة', 9.50, 14.00, 11.50, 120.000, 30.000, 'sup-2'),
                    ('prod-6', 'وش ماجيك 3 فتحة كلاسيك فينوس عاجي', 'switches_sockets', 'فينوس', NULL, NULL, NULL, 60, '6222002000038', 'قطعة', 14.00, 20.00, 17.00, 95.000, 25.000, 'sup-2'),
                    ('prod-7', 'لمبة ليد 12 وات ورم (إضاءة دافئة) فيليبس E27', 'lighting_bulbs', 'فيليبس Philips', '220V', '12W', NULL, 24, '8718696500123', 'قطعة', 48.00, 68.00, 58.00, 60.000, 15.000, 'sup-2'),
                    ('prod-8', 'لمبة ليد 9 وات إضاءة بيضاء E27 توشيبا', 'lighting_bulbs', 'توشيبا العربي', '220V', '9W', NULL, 24, '6223003000095', 'قطعة', 35.00, 50.00, 42.00, 75.000, 20.000, 'sup-2'),
                    ('prod-9', 'قاطع تيار أوتوماتيك أحادي شنايدر إلكتريك 16A كوري', 'breakers_panels', 'شنايدر إلكتريك', '230/400V', NULL, '16A', 36, '3606480160011', 'قطعة', 110.00, 145.00, 130.00, 40.000, 10.000, 'sup-3'),
                    ('prod-10', 'لوحة توزيع تجميع جاهزة 12 خط شنايدر كاملة القواطع', 'breakers_panels', 'شنايدر إلكتريك', '220/380V', NULL, '63A', 36, '6224004000120', 'طقم', 1420.00, 1950.00, 1800.00, 6.000, 2.000, 'sup-3')
                    ON DUPLICATE KEY UPDATE `name` = VALUES(`name`)");
            }
        } catch (\Throwable $e) {}
    }
}

try {
    $pdo_root = new PDO("mysql:host=$host;port=$port;charset=$charset", $user, $pass, $options);
    $pdo_root->exec("CREATE DATABASE IF NOT EXISTS `$db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    
    $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";
    $pdo = new PDO($dsn, $user, $pass, $options);

    ensureTablesExist($pdo, false);
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'فشل الاتصال بقاعدة بيانات XAMPP (MySQL): ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit();
}
?>
