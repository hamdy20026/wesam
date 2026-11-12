-- ==========================================================================================
-- اسم المنظومة: وسام للأدوات والتوريدات الكهربائية - نظام إدارة ERP والمبيعات والمخازن
-- التوافق: XAMPP / Apache / PHP / MySQL / phpMyAdmin / MariaDB
-- التشفير ودعم اللغة العربية: utf8mb4_unicode_ci
-- قاعدة البيانات المعتمدة: alhana_pro_erp (or frozenhouse_db)
-- ==========================================================================================

CREATE DATABASE IF NOT EXISTS `alhana_pro_erp` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `alhana_pro_erp`;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------------------
-- 1. جدول المستخدمين والصلاحيات (Users)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `role` ENUM('admin', 'cashier', 'storekeeper') NOT NULL DEFAULT 'cashier',
  `phone` VARCHAR(30) DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`id`, `username`, `name`, `role`, `phone`, `password_hash`, `is_active`) VALUES
('usr-admin', 'admin', 'المهندس وسام (مدير النظام)', 'admin', '01000000001', '123456', 1),
('usr-cashier', 'cashier', 'أحمد كاشير (نقطة البيع)', 'cashier', '01122334455', '123456', 1),
('usr-store', 'storekeeper', 'محمود أمين المخزن والتجميع', 'storekeeper', '01233445566', '123456', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`), `password_hash` = VALUES(`password_hash`);

-- ------------------------------------------------------------------------------------------
-- 2. جدول إعدادات المحل والمنظومة (Settings / StoreSettings)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `settings` (`id`, `store_name`, `owner_name`, `phone`, `phone_alt`, `address`, `commercial_record`, `agricultural_license`, `tax_rate`, `currency`, `invoice_footer_note`) VALUES
(1, 'وسام للأدوات والتوريدات الكهربائية', 'مؤسسة وسام للأدوات الكهربائية', '01000000001', '01200000002', 'القاهرة - السبتية - شارع سوق الكهرباء', 'س.ت: 894520 / ب.ض: 432-876-100', 'سجل صناعي وتجاري معتمد', 0.00, 'ج.م', 'شكراً لتعاملكم مع وسام للأدوات الكهربائية • بضاعة أصلية وضمان معتمد')
ON DUPLICATE KEY UPDATE `store_name` = VALUES(`store_name`), `address` = VALUES(`address`);

-- ------------------------------------------------------------------------------------------
-- 3. جدول الخزائن والحسابات المالية والمحافظ (Safes & Wallets)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `safes` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `type` VARCHAR(50) NOT NULL DEFAULT 'cash',
  `balance` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `account_number` VARCHAR(100) DEFAULT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `notes` TEXT DEFAULT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `safes` (`id`, `name`, `type`, `balance`, `account_number`, `is_default`, `notes`) VALUES
('safe-main', 'الخزينة الرئيسية (المكتب)', 'cash', 45000.00, 'CASH-MAIN-01', 0, 'الخزينة المركزية بالمكتب الرئيسي'),
('safe-pos', 'درج كاشير نقطة البيع (POS)', 'pos_drawer', 5000.00, 'DRAWER-POS-01', 1, 'عهدة درج الكاشير للعمليات اليومية'),
('safe-bank', 'حساب بنك مصر الجاري', 'bank', 120000.00, '14001990000234', 0, 'الحساب البنكي الرسمي للتوريدات والتحويلات'),
('safe-vodafone', 'محفظة فودافون كاش (01000000001)', 'wallet', 12500.00, '01000000001', 0, 'محفظة إلكترونية للتحصيلات'),
('safe-instapay', 'محفظة انستاباي InstaPay', 'wallet', 8400.00, 'wessam@instapay', 0, 'دفع وتحصيل فوري عبر انستاباي')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `balance` = VALUES(`balance`);

-- ------------------------------------------------------------------------------------------
-- 4. جدول التحويلات المالية بين الخزائن (Safe Transfers)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `safe_transfers` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------------------
-- 5. جدول الموردين والشركات (Suppliers)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(250) NOT NULL,
  `company_name` VARCHAR(250) DEFAULT NULL,
  `representative_name` VARCHAR(200) DEFAULT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `address` VARCHAR(300) DEFAULT NULL,
  `supplied_categories` VARCHAR(300) DEFAULT NULL,
  `current_balance` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `suppliers` (`id`, `name`, `representative_name`, `phone`, `address`, `supplied_categories`, `current_balance`, `notes`) VALUES
('sup-1', 'شركة السويدي للكابلات والأسلاك', 'م. تامر ممدوح', '01011112222', 'العاشر من رمضان - المنطقة الصناعية', 'أسلاك وكابلات كهربائية', 18500.00, 'توريد كابلات السويدي الأصلية المعتمدة'),
('sup-2', 'شركة فينوس للصناعات الكهربائية', 'أ. طارق عبد الرحمن', '01122223333', 'مدينة العبور - القاهرة', 'مفاتيح وبرايز وشاسيهات ولدات', 0.00, 'توريد مفاتيح وشاسيهات ولمبات فينوس'),
('sup-3', 'شنايدر إلكتريك مصر (Schneider)', 'م. كمال نبيل', '01233334444', 'القاهرة الجديدة', 'قواطع ولوحات توزيع', 32000.00, 'توريد قواطع ولوحات توزيع')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`);

-- ------------------------------------------------------------------------------------------
-- 6. جدول العملاء والمقاولين (Customers)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `customers` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `customers` (`id`, `code`, `name`, `phone`, `address`, `customer_type`, `initial_balance`, `current_balance`, `credit_limit`, `notes`) VALUES
('walk-in', 'CUST-000', 'عميل نقدي عام (بدون حساب آجل)', '0000000000', 'مبيعات الكاشير المباشرة', 'retail', 0.00, 0.00, 0.00, 'حساب الكاشير الافتراضي للبيع السريع النقدي'),
('cust-1', 'CUST-001', 'المقاول حسن الصاوي (شركة الصاوي للمقاولات والديكور)', '01012345678', 'مدينة نصر - القاهرة', 'contractor', 0.00, 14500.00, 100000.00, 'مقاول كهرباء وتشطيبات معتمد'),
('cust-2', 'CUST-002', 'الأسطى رجب الكهربائي (فني تشطيبات)', '01198765432', 'شبرا الخيمة', 'technician', 0.00, 2400.00, 15000.00, 'فني كهربائي تأسيس وتشطيب'),
('cust-3', 'CUST-003', 'برج الأندلس السكني (م. سامح عزيز)', '01255556666', 'مصر الجديدة', 'company', 0.00, 0.00, 80000.00, 'تأسيس شبكة الكهرباء بالكامل')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`);

-- ------------------------------------------------------------------------------------------
-- 7. جدول الأصناف والمخزون (Products)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
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
  INDEX `idx_category` (`category`),
  INDEX `idx_brand` (`brand`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `products` (`id`, `name`, `category`, `brand`, `voltage`, `power_watt`, `amperage`, `warranty_months`, `barcode`, `unit`, `purchase_price`, `selling_price`, `wholesale_price`, `quantity`, `min_alert_quantity`, `supplier_id`) VALUES
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
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `selling_price` = VALUES(`selling_price`);

-- ------------------------------------------------------------------------------------------
-- 8. جدول فواتير المبيعات (Sales Invoices)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sales_invoices` (
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
  INDEX `idx_sales_date` (`date`),
  INDEX `idx_sales_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------------------
-- 9. جدول بنود فاتورة المبيعات (Sales Invoice Items)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sales_invoice_items` (
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
  FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------------------
-- 10. جدول فواتير المشتريات (Purchase Invoices)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `purchase_invoices` (
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
  INDEX `idx_purchases_date` (`date`),
  INDEX `idx_purchases_supplier` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------------------
-- 11. جدول بنود فاتورة المشتريات (Purchase Invoice Items)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `purchase_invoice_items` (
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
  FOREIGN KEY (`invoice_id`) REFERENCES `purchase_invoices`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------------------
-- 12. جدول مرتجعات المبيعات (Sales Returns)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sales_returns` (
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
  `notes` TEXT DEFAULT NULL,
  INDEX `idx_sret_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------------------
-- 13. جدول بنود مرتجع المبيعات (Sales Return Items)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sales_return_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `return_id` VARCHAR(50) NOT NULL,
  `product_id` VARCHAR(50) NOT NULL,
  `product_name` VARCHAR(250) NOT NULL,
  `unit` VARCHAR(50) NOT NULL,
  `unit_price` DECIMAL(18,2) NOT NULL,
  `quantity` DECIMAL(18,3) NOT NULL,
  `discount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `discount_type` VARCHAR(20) NOT NULL DEFAULT 'fixed',
  `total` DECIMAL(18,2) NOT NULL,
  FOREIGN KEY (`return_id`) REFERENCES `sales_returns`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------------------
-- 14. جدول مرتجعات المشتريات (Purchase Returns)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `purchase_returns` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `return_number` VARCHAR(100) NOT NULL UNIQUE,
  `original_invoice_number` VARCHAR(100) DEFAULT NULL,
  `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `supplier_id` VARCHAR(50) NOT NULL,
  `supplier_name` VARCHAR(250) NOT NULL,
  `total` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `paid_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `remaining_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `refund_method` VARCHAR(50) NOT NULL DEFAULT 'credit',
  `safe_id` VARCHAR(50) DEFAULT 'safe-main',
  `notes` TEXT DEFAULT NULL,
  INDEX `idx_pret_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------------------
-- 15. جدول بنود مرتجع المشتريات (Purchase Return Items)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `purchase_return_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `return_id` VARCHAR(50) NOT NULL,
  `product_id` VARCHAR(50) NOT NULL,
  `product_name` VARCHAR(250) NOT NULL,
  `unit` VARCHAR(50) NOT NULL,
  `unit_price` DECIMAL(18,2) NOT NULL,
  `quantity` DECIMAL(18,3) NOT NULL,
  `discount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `discount_type` VARCHAR(20) NOT NULL DEFAULT 'fixed',
  `total` DECIMAL(18,2) NOT NULL,
  FOREIGN KEY (`return_id`) REFERENCES `purchase_returns`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------------------
-- 16. جدول المصروفات الإدارية والتشغيلية (Expenses)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `title` VARCHAR(250) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `amount` DECIMAL(18,2) NOT NULL,
  `safe_id` VARCHAR(50) DEFAULT 'safe-pos',
  `recipient` VARCHAR(150) DEFAULT NULL,
  `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` TEXT DEFAULT NULL,
  INDEX `idx_expenses_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------------------
-- 17. جدول حركات الخزينة والحسابات المالية (Financial Transactions)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `financial_transactions` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(250) NOT NULL,
  `amount` DECIMAL(18,2) NOT NULL,
  `direction` VARCHAR(10) NOT NULL,
  `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `safe_id` VARCHAR(50) DEFAULT 'safe-pos',
  `reference_id` VARCHAR(50) DEFAULT NULL,
  `party_type` VARCHAR(50) DEFAULT NULL,
  `party_id` VARCHAR(50) DEFAULT NULL,
  `party_name` VARCHAR(150) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  INDEX `idx_tx_date` (`date`),
  INDEX `idx_tx_safe` (`safe_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------------------
-- 18. جدول الورديات وتقفيل الكاشير (Shifts)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `shifts` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(50) NOT NULL,
  `user_name` VARCHAR(150) NOT NULL,
  `opened_at` DATETIME NOT NULL,
  `closed_at` DATETIME DEFAULT NULL,
  `starting_balance` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `sales_revenue` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `other_incomes` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `other_expenses` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `expected_balance` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `actual_balance` DECIMAL(18,2) DEFAULT NULL,
  `difference` DECIMAL(18,2) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'open'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------------------
-- 19. جدول الجمعيات المالية والادخارية (Money Associations / Savings Circles)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `money_associations` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(250) NOT NULL,
  `organizer` VARCHAR(150) NOT NULL,
  `total_amount` DECIMAL(18,2) NOT NULL,
  `monthly_installment` DECIMAL(18,2) NOT NULL,
  `total_months` INT NOT NULL,
  `paid_months` INT NOT NULL DEFAULT 0,
  `payout_turn_month` INT NOT NULL DEFAULT 1,
  `payout_date` DATE DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'active',
  `safe_id` VARCHAR(50) DEFAULT 'safe-main',
  `start_date` DATE NOT NULL,
  `notes` TEXT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------------------
-- 20. جدول وصفات وباقات التجميع (Assembly Recipes / BOM)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `assembly_recipes` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(250) NOT NULL,
  `output_product_id` VARCHAR(50) NOT NULL,
  `output_product_name` VARCHAR(250) NOT NULL,
  `output_quantity` DECIMAL(18,3) NOT NULL DEFAULT 1.000,
  `output_unit` VARCHAR(50) NOT NULL DEFAULT 'قطعة',
  `labor_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `total_estimated_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------------------
-- 21. جدول مكونات وصفة التجميع (Assembly Recipe Items / BOM Components)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `assembly_recipe_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `recipe_id` VARCHAR(50) NOT NULL,
  `product_id` VARCHAR(50) NOT NULL,
  `product_name` VARCHAR(250) NOT NULL,
  `quantity` DECIMAL(18,3) NOT NULL,
  `unit` VARCHAR(50) NOT NULL,
  `unit_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `total_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  FOREIGN KEY (`recipe_id`) REFERENCES `assembly_recipes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------------------
-- 22. جدول سجل حركات وعمليات التجميع والتفكيك (Assembly Operations)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `assembly_operations` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `operation_number` VARCHAR(100) NOT NULL UNIQUE,
  `type` VARCHAR(50) NOT NULL DEFAULT 'assembly',
  `recipe_id` VARCHAR(50) DEFAULT NULL,
  `recipe_name` VARCHAR(250) DEFAULT NULL,
  `target_product_id` VARCHAR(50) NOT NULL,
  `target_product_name` VARCHAR(250) NOT NULL,
  `target_unit` VARCHAR(50) NOT NULL DEFAULT 'قطعة',
  `quantity` DECIMAL(18,3) NOT NULL,
  `unit_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `total_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `labor_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `operator_name` VARCHAR(150) DEFAULT NULL,
  `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` TEXT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------------------
-- 23. جدول مكونات حركة التجميع والتفكيك (Assembly Operation Items)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `assembly_operation_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `operation_id` VARCHAR(50) NOT NULL,
  `product_id` VARCHAR(50) NOT NULL,
  `product_name` VARCHAR(250) NOT NULL,
  `quantity` DECIMAL(18,3) NOT NULL,
  `unit` VARCHAR(50) NOT NULL,
  `unit_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `total_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `direction` VARCHAR(20) NOT NULL DEFAULT 'deducted',
  FOREIGN KEY (`operation_id`) REFERENCES `assembly_operations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------------------
-- 24. جدول الهالك والتالف والمفقودات (Waste Records)
-- ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `waste_records` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `product_id` VARCHAR(50) NOT NULL,
  `product_name` VARCHAR(250) NOT NULL,
  `category` VARCHAR(50) DEFAULT NULL,
  `unit` VARCHAR(50) NOT NULL,
  `quantity` DECIMAL(18,3) NOT NULL,
  `cost_price` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `loss_value` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `reason` VARCHAR(100) NOT NULL,
  `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` TEXT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
