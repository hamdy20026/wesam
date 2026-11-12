-- ==========================================================================================
-- اسم المنظومة: وسام للأدوات الكهربائية - نظام إدارة المخازن والمبيعات والتجميع والحسابات
-- التوافق: Microsoft SQL Server 2012 (أو أحدث: 2014, 2016, 2019, 2022, Azure SQL)
-- التشفير ودعم اللغة: العربية (Unicode NVARCHAR - Arabic_100_CI_AS)
-- تاريخ التوليد: 2026
-- ==========================================================================================

USE master;
GO

-- 1. إنشاء قاعدة البيانات إن لم تكن موجودة مسبقاً
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'WessamElectricalDB')
BEGIN
    CREATE DATABASE [WessamElectricalDB]
    COLLATE Arabic_100_CI_AS;
    PRINT N'تم إنشاء قاعدة بيانات WessamElectricalDB بنجاح.';
END
GO

USE [WessamElectricalDB];
GO

-- ==========================================================================================
-- 2. جدول إعدادات المتجر (StoreSettings)
-- ==========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[StoreSettings]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[StoreSettings] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [StoreName] NVARCHAR(250) NOT NULL,
        [OwnerName] NVARCHAR(250) NULL,
        [Phone] NVARCHAR(50) NULL,
        [PhoneAlt] NVARCHAR(50) NULL,
        [Address] NVARCHAR(300) NULL,
        [CommercialRecord] NVARCHAR(100) NULL,
        [AgriculturalLicense] NVARCHAR(150) NULL,
        [TaxRate] DECIMAL(5,2) DEFAULT 0,
        [InvoiceFooterNote] NVARCHAR(MAX) NULL,
        [Currency] NVARCHAR(20) DEFAULT N'ج.م',
        [UpdatedAt] DATETIME DEFAULT GETDATE()
    );

    INSERT INTO [dbo].[StoreSettings] ([StoreName], [OwnerName], [Phone], [PhoneAlt], [Address], [CommercialRecord], [AgriculturalLicense], [TaxRate], [InvoiceFooterNote], [Currency])
    VALUES (
        N'وسام للأدوات والتوريدات الكهربائية',
        N'مؤسسة وسام للأدوات الكهربائية',
        N'01000000001',
        N'01200000002',
        N'القاهرة - السبتية - شارع سوق الكهرباء',
        N'س.ت: 894520 / ب.ض: 432-876-100',
        N'سجل صناعي وتجاري معتمد',
        0,
        N'شكراً لتعاملكم مع وسام للأدوات الكهربائية • بضاعة أصلية وضمان معتمد لجميع الكابلات والمفاتيح والقواطع',
        N'ج.م'
    );
    PRINT N'تم إنشاء جدول إعدادات المتجر StoreSettings.';
END
GO

-- ==========================================================================================
-- 3. جدول المستخدمين (Users)
-- ==========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Users] (
        [Id] NVARCHAR(50) PRIMARY KEY,
        [Username] NVARCHAR(50) NOT NULL UNIQUE,
        [Name] NVARCHAR(150) NOT NULL,
        [Role] NVARCHAR(50) NOT NULL DEFAULT N'cashier',
        [Phone] NVARCHAR(30) NULL,
        [PasswordHash] NVARCHAR(255) NOT NULL,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE()
    );

    INSERT INTO [dbo].[Users] ([Id], [Username], [Name], [Role], [Phone], [PasswordHash], [IsActive])
    VALUES
    (N'usr-admin', N'admin', N'المهندس وسام (مدير النظام)', N'admin', N'01000000001', N'123456', 1),
    (N'usr-cashier', N'cashier', N'أحمد كاشير (نقطة البيع)', N'cashier', N'01122334455', N'123456', 1),
    (N'usr-store', N'storekeeper', N'محمود أمين المخزن والتجميع', N'storekeeper', N'01233445566', N'123456', 1);

    PRINT N'تم إنشاء جدول المستخدمين Users.';
END
GO

-- ==========================================================================================
-- 4. جدول الخزائن والمحافظ والحسابات البنكية (Safes)
-- ==========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Safes]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Safes] (
        [Id] NVARCHAR(50) PRIMARY KEY,
        [Name] NVARCHAR(150) NOT NULL,
        [Type] NVARCHAR(50) NOT NULL DEFAULT N'cash',
        [Balance] DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        [AccountNumber] NVARCHAR(100) NULL,
        [IsDefault] BIT NOT NULL DEFAULT 0,
        [Notes] NVARCHAR(MAX) NULL,
        [UpdatedAt] DATETIME NOT NULL DEFAULT GETDATE()
    );

    INSERT INTO [dbo].[Safes] ([Id], [Name], [Type], [Balance], [AccountNumber], [IsDefault], [Notes])
    VALUES
    (N'safe-main', N'الخزينة الرئيسية (المكتب)', N'cash', 45000.00, N'CASH-MAIN-01', 0, N'الخزينة المركزية بالمكتب الرئيسي'),
    (N'safe-pos', N'درج كاشير نقطة البيع (POS)', N'pos_drawer', 5000.00, N'DRAWER-POS-01', 1, N'عهدة درج الكاشير للعمليات اليومية'),
    (N'safe-bank', N'حساب بنك مصر الجاري', N'bank', 120000.00, N'14001990000234', 0, N'الحساب البنكي الرسمي للتوريدات والتحويلات'),
    (N'safe-vodafone', N'محفظة فودافون كاش (01000000001)', N'wallet', 12500.00, N'01000000001', 0, N'محفظة إلكترونية للتحصيلات'),
    (N'safe-instapay', N'محفظة انستاباي InstaPay', N'wallet', 8400.00, N'wessam@instapay', 0, N'دفع وتحصيل فوري عبر انستاباي');

    PRINT N'تم إنشاء جدول الخزائن Safes.';
END
GO

-- ==========================================================================================
-- 5. جدول التحويلات بين الخزائن (SafeTransfers)
-- ==========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SafeTransfers]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SafeTransfers] (
        [Id] NVARCHAR(50) PRIMARY KEY,
        [TransferNumber] NVARCHAR(100) NULL,
        [Date] DATETIME NOT NULL DEFAULT GETDATE(),
        [FromSafeId] NVARCHAR(50) NOT NULL,
        [FromSafeName] NVARCHAR(150) NOT NULL,
        [ToSafeId] NVARCHAR(50) NOT NULL,
        [ToSafeName] NVARCHAR(150) NOT NULL,
        [Amount] DECIMAL(18,2) NOT NULL,
        [PerformedBy] NVARCHAR(150) NOT NULL,
        [Notes] NVARCHAR(MAX) NULL
    );
    PRINT N'تم إنشاء جدول تحويلات الخزائن SafeTransfers.';
END
GO

-- ==========================================================================================
-- 6. جدول الشركات والموردين (Suppliers)
-- ==========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Suppliers]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Suppliers] (
        [Id] NVARCHAR(50) PRIMARY KEY,
        [Name] NVARCHAR(250) NOT NULL,
        [RepresentativeName] NVARCHAR(200) NULL,
        [Phone] NVARCHAR(50) NOT NULL,
        [Address] NVARCHAR(300) NULL,
        [SuppliedCategories] NVARCHAR(300) NULL,
        [CurrentBalance] DECIMAL(18,2) DEFAULT 0,
        [Notes] NVARCHAR(MAX) NULL,
        [CreatedAt] DATETIME DEFAULT GETDATE()
    );

    INSERT INTO [dbo].[Suppliers] ([Id], [Name], [RepresentativeName], [Phone], [Address], [SuppliedCategories], [CurrentBalance], [Notes])
    VALUES
    (N'sup-1', N'شركة السويدي للكابلات والأسلاك', N'م. تامر ممدوح', N'01011112222', N'العاشر من رمضان - المنطقة الصناعية', N'أسلاك وكابلات كهربائية', 18500.00, N'توريد كابلات السويدي الأصلية المعتمدة'),
    (N'sup-2', N'شركة فينوس للصناعات الكهربائية', N'أ. طارق عبد الرحمن', N'01122223333', N'مدينة العبور - القاهرة', N'مفاتيح وبرايز وشاسيهات ولدات', 0.00, N'توريد مفاتيح وشاسيهات ولمبات فينوس'),
    (N'sup-3', N'شنايدر إلكتريك مصر (Schneider)', N'م. كمال نبيل', N'01233334444', N'القاهرة الجديدة', N'قواطع ولوحات توزيع', 32000.00, N'توريد قواطع ولوحات توزيع');

    PRINT N'تم إنشاء جدول الموردين Suppliers.';
END
GO

-- ==========================================================================================
-- 7. جدول العملاء والمقاولين (Customers)
-- ==========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Customers]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Customers] (
        [Id] NVARCHAR(50) PRIMARY KEY,
        [Code] NVARCHAR(50) NULL,
        [Name] NVARCHAR(250) NOT NULL,
        [Phone] NVARCHAR(50) NOT NULL,
        [Address] NVARCHAR(300) NULL,
        [CustomerType] NVARCHAR(50) DEFAULT N'retail',
        [CommercialRecord] NVARCHAR(100) NULL,
        [InitialBalance] DECIMAL(18,2) DEFAULT 0,
        [CurrentBalance] DECIMAL(18,2) DEFAULT 0,
        [CreditLimit] DECIMAL(18,2) DEFAULT 50000.00,
        [CropTypes] NVARCHAR(300) NULL,
        [FarmArea] NVARCHAR(100) NULL,
        [Notes] NVARCHAR(MAX) NULL,
        [CreatedAt] DATETIME DEFAULT GETDATE()
    );

    INSERT INTO [dbo].[Customers] ([Id], [Code], [Name], [Phone], [Address], [CustomerType], [InitialBalance], [CurrentBalance], [CreditLimit], [Notes])
    VALUES
    (N'walk-in', N'CUST-000', N'عميل نقدي عام', N'0000000000', N'مبيعات الكاشير المباشرة', N'retail', 0.00, 0.00, 0.00, N'حساب دائم في النظام للمبيعات النقدية المباشرة - محمي من الحذف والتعديل ولا يسمح له بفواتير آجل نهائياً'),
    (N'cust-1', N'CUST-001', N'المقاول حسن الصاوي (شركة الصاوي للمقاولات والديكور)', N'01012345678', N'مدينة نصر - القاهرة', N'contractor', 0.00, 14500.00, 100000.00, N'مقاول كهرباء وتشطيبات معتمد'),
    (N'cust-2', N'CUST-002', N'الأسطى رجب الكهربائي (فني تشطيبات)', N'01198765432', N'شبرا الخيمة', N'technician', 0.00, 2400.00, 15000.00, N'فني كهربائي تأسيس وتشطيب'),
    (N'cust-3', N'CUST-003', N'برج الأندلس السكني (م. سامح عزيز)', N'01255556666', N'مصر الجديدة', N'company', 0.00, 0.00, 80000.00, N'تأسيس شبكة الكهرباء بالكامل');

    PRINT N'تم إنشاء جدول العملاء Customers.';
END
GO

-- ==========================================================================================
-- 8. جدول الأصناف والمخزون (Products)
-- ==========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Products]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Products] (
        [Id] NVARCHAR(50) PRIMARY KEY,
        [Name] NVARCHAR(250) NOT NULL,
        [Category] NVARCHAR(50) NOT NULL,
        [Brand] NVARCHAR(100) NULL,
        [Voltage] NVARCHAR(50) NULL,
        [PowerWatt] NVARCHAR(50) NULL,
        [Amperage] NVARCHAR(50) NULL,
        [WarrantyMonths] INT DEFAULT 0,
        [Barcode] NVARCHAR(100) NOT NULL,
        [Unit] NVARCHAR(50) NOT NULL DEFAULT N'قطعة',
        [PurchasePrice] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [SellingPrice] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [WholesalePrice] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [Quantity] DECIMAL(18,3) NOT NULL DEFAULT 0,
        [MinAlertQuantity] DECIMAL(18,3) NOT NULL DEFAULT 5,
        [BatchNumber] NVARCHAR(100) NULL,
        [ExpiryDate] DATE NULL,
        [SupplierId] NVARCHAR(50) NULL,
        [IsComposite] BIT NOT NULL DEFAULT 0,
        [RecipeId] NVARCHAR(50) NULL,
        [IsWeighable] BIT NOT NULL DEFAULT 0,
        [TareWeight] DECIMAL(10,3) DEFAULT 0,
        [Notes] NVARCHAR(MAX) NULL,
        [CreatedAt] DATETIME DEFAULT GETDATE()
    );
    CREATE NONCLUSTERED INDEX [IX_Products_Barcode] ON [dbo].[Products]([Barcode]);
    CREATE NONCLUSTERED INDEX [IX_Products_Category] ON [dbo].[Products]([Category]);

    INSERT INTO [dbo].[Products] ([Id], [Name], [Category], [Brand], [Voltage], [PowerWatt], [Amperage], [WarrantyMonths], [Barcode], [Unit], [PurchasePrice], [SellingPrice], [WholesalePrice], [Quantity], [MinAlertQuantity], [SupplierId])
    VALUES
    (N'prod-1', N'سلك نحاس معزول 1.5 مم سويدي أصلي (لفة 100م)', N'wires_cables', N'السويدي للكابلات', N'450/750V', NULL, NULL, 120, N'6221001001501', N'لفة', 1150.00, 1400.00, 1300.00, 35.000, 10.000, N'sup-1'),
    (N'prod-2', N'سلك نحاس معزول 2.5 مم سويدي أصلي (لفة 100م)', N'wires_cables', N'السويدي للكابلات', N'450/750V', NULL, NULL, 120, N'6221001002508', N'لفة', 1450.00, 1780.00, 1650.00, 28.000, 10.000, N'sup-1'),
    (N'prod-3', N'سلك دش نحاس معزول RG6 عالي الجودة (متر)', N'wires_cables', N'السويدي للكابلات', NULL, NULL, NULL, 60, N'6221001000061', N'متر', 10.50, 14.00, 12.00, 450.000, 100.000, N'sup-1'),
    (N'prod-4', N'لقمة بريزة مفردة شنايدر أصلي مع طرف تأريض 16A', N'switches_sockets', N'شنايدر إلكتريك', N'250V', NULL, N'16A', 60, N'3606480016012', N'قطعة', 32.00, 42.00, 37.00, 85.000, 20.000, N'sup-3'),
    (N'prod-5', N'شاسيه ماجيك حديد مقوى فينوس مع مسامير التثبيت', N'switches_sockets', N'فينوس', NULL, NULL, NULL, 60, N'6222002000014', N'قطعة', 9.50, 14.00, 11.50, 120.000, 30.000, N'sup-2'),
    (N'prod-6', N'وش ماجيك 3 فتحة كلاسيك فينوس عاجي', N'switches_sockets', N'فينوس', NULL, NULL, NULL, 60, N'6222002000038', N'قطعة', 14.00, 20.00, 17.00, 95.000, 25.000, N'sup-2'),
    (N'prod-7', N'لمبة ليد 12 وات ورم (إضاءة دافئة) فيليبس E27', N'lighting_bulbs', N'فيليبس Philips', N'220V', N'12W', NULL, 24, N'8718696500123', N'قطعة', 48.00, 68.00, 58.00, 60.000, 15.000, N'sup-2'),
    (N'prod-8', N'لمبة ليد 9 وات إضاءة بيضاء E27 توشيبا', N'lighting_bulbs', N'توشيبا العربي', N'220V', N'9W', NULL, 24, N'6223003000095', N'قطعة', 35.00, 50.00, 42.00, 75.000, 20.000, N'sup-2'),
    (N'prod-9', N'قاطع تيار أوتوماتيك أحادي شنايدر إلكتريك 16A كوري', N'breakers_panels', N'شنايدر إلكتريك', N'230/400V', NULL, N'16A', 36, N'3606480160011', N'قطعة', 110.00, 145.00, 130.00, 40.000, 10.000, N'sup-3'),
    (N'prod-10', N'لوحة توزيع تجميع جاهزة 12 خط شنايدر كاملة القواطع', N'breakers_panels', N'شنايدر إلكتريك', N'220/380V', NULL, N'63A', 36, N'6224004000120', N'طقم', 1420.00, 1950.00, 1800.00, 6.000, 2.000, N'sup-3');

    PRINT N'تم إنشاء جدول الأصناف Products.';
END
GO

-- ==========================================================================================
-- 9. جدول فواتير المبيعات (SalesInvoices)
-- ==========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SalesInvoices]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SalesInvoices] (
        [Id] NVARCHAR(50) PRIMARY KEY,
        [InvoiceNumber] NVARCHAR(100) NOT NULL UNIQUE,
        [Date] DATETIME NOT NULL DEFAULT GETDATE(),
        [CustomerId] NVARCHAR(50) NOT NULL,
        [CustomerName] NVARCHAR(250) NOT NULL,
        [CustomerPhone] NVARCHAR(50) NULL,
        [Subtotal] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [Discount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [Total] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [PaidAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [RemainingAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [PaymentMethod] NVARCHAR(50) NOT NULL DEFAULT N'cash',
        [SafeId] NVARCHAR(50) DEFAULT N'safe-pos',
        [Notes] NVARCHAR(MAX) NULL,
        [Status] NVARCHAR(50) NOT NULL DEFAULT N'completed'
    );
    CREATE NONCLUSTERED INDEX [IX_SalesInvoices_Date] ON [dbo].[SalesInvoices]([Date]);
    PRINT N'تم إنشاء جدول فواتير المبيعات SalesInvoices.';
END
GO

-- ==========================================================================================
-- 10. جدول بنود فاتورة المبيعات (SalesInvoiceItems)
-- ==========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SalesInvoiceItems]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SalesInvoiceItems] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [InvoiceId] NVARCHAR(50) NOT NULL,
        [ProductId] NVARCHAR(50) NOT NULL,
        [ProductName] NVARCHAR(250) NOT NULL,
        [Category] NVARCHAR(50) NULL,
        [Brand] NVARCHAR(100) NULL,
        [Unit] NVARCHAR(50) NOT NULL,
        [UnitPrice] DECIMAL(18,2) NOT NULL,
        [PurchaseCost] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [Quantity] DECIMAL(18,3) NOT NULL,
        [Discount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [DiscountType] NVARCHAR(20) NOT NULL DEFAULT N'fixed',
        [Total] DECIMAL(18,2) NOT NULL,
        CONSTRAINT [FK_SalesInvoiceItems_Invoice] FOREIGN KEY ([InvoiceId]) REFERENCES [dbo].[SalesInvoices]([Id]) ON DELETE CASCADE
    );
    PRINT N'تم إنشاء جدول بنود فاتورة المبيعات SalesInvoiceItems.';
END
GO

-- ==========================================================================================
-- 11. جدول فواتير المشتريات (PurchaseInvoices)
-- ==========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PurchaseInvoices]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PurchaseInvoices] (
        [Id] NVARCHAR(50) PRIMARY KEY,
        [InvoiceNumber] NVARCHAR(100) NOT NULL UNIQUE,
        [Date] DATETIME NOT NULL DEFAULT GETDATE(),
        [SupplierId] NVARCHAR(50) NOT NULL,
        [SupplierName] NVARCHAR(250) NOT NULL,
        [Total] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [PaidAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [RemainingAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [PaymentMethod] NVARCHAR(50) NOT NULL DEFAULT N'credit',
        [SafeId] NVARCHAR(50) DEFAULT N'safe-main',
        [Notes] NVARCHAR(MAX) NULL,
        [Status] NVARCHAR(50) NOT NULL DEFAULT N'completed'
    );
    PRINT N'تم إنشاء جدول فواتير المشتريات PurchaseInvoices.';
END
GO

-- ==========================================================================================
-- 12. جدول بنود فاتورة المشتريات (PurchaseInvoiceItems)
-- ==========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PurchaseInvoiceItems]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PurchaseInvoiceItems] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [InvoiceId] NVARCHAR(50) NOT NULL,
        [ProductId] NVARCHAR(50) NOT NULL,
        [ProductName] NVARCHAR(250) NOT NULL,
        [Unit] NVARCHAR(50) NOT NULL,
        [UnitPrice] DECIMAL(18,2) NOT NULL,
        [Quantity] DECIMAL(18,3) NOT NULL,
        [Discount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [DiscountType] NVARCHAR(20) NOT NULL DEFAULT N'fixed',
        [Total] DECIMAL(18,2) NOT NULL,
        [BatchNumber] NVARCHAR(100) NULL,
        [ExpiryDate] DATE NULL,
        CONSTRAINT [FK_PurchaseInvoiceItems_Invoice] FOREIGN KEY ([InvoiceId]) REFERENCES [dbo].[PurchaseInvoices]([Id]) ON DELETE CASCADE
    );
    PRINT N'تم إنشاء جدول بنود فاتورة المشتريات PurchaseInvoiceItems.';
END
GO

-- ==========================================================================================
-- 13. جدول مرتجعات المبيعات (SalesReturns)
-- ==========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SalesReturns]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SalesReturns] (
        [Id] NVARCHAR(50) PRIMARY KEY,
        [ReturnNumber] NVARCHAR(100) NOT NULL UNIQUE,
        [OriginalInvoiceNumber] NVARCHAR(100) NULL,
        [Date] DATETIME NOT NULL DEFAULT GETDATE(),
        [CustomerId] NVARCHAR(50) NOT NULL,
        [CustomerName] NVARCHAR(250) NOT NULL,
        [Total] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [PaidAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [RemainingAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [RefundMethod] NVARCHAR(50) NOT NULL DEFAULT N'cash',
        [SafeId] NVARCHAR(50) DEFAULT N'safe-pos',
        [Notes] NVARCHAR(MAX) NULL
    );
    PRINT N'تم إنشاء جدول مرتجعات المبيعات SalesReturns.';
END
GO

-- ==========================================================================================
-- 14. جدول بنود مرتجع المبيعات (SalesReturnItems)
-- ==========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SalesReturnItems]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SalesReturnItems] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [ReturnId] NVARCHAR(50) NOT NULL,
        [ProductId] NVARCHAR(50) NOT NULL,
        [ProductName] NVARCHAR(250) NOT NULL,
        [Unit] NVARCHAR(50) NOT NULL,
        [UnitPrice] DECIMAL(18,2) NOT NULL,
        [Quantity] DECIMAL(18,3) NOT NULL,
        [Discount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [DiscountType] NVARCHAR(20) NOT NULL DEFAULT N'fixed',
        [Total] DECIMAL(18,2) NOT NULL,
        CONSTRAINT [FK_SalesReturnItems_Return] FOREIGN KEY ([ReturnId]) REFERENCES [dbo].[SalesReturns]([Id]) ON DELETE CASCADE
    );
    PRINT N'تم إنشاء جدول بنود مرتجع المبيعات SalesReturnItems.';
END
GO

-- ==========================================================================================
-- 15. جدول مرتجعات المشتريات (PurchaseReturns)
-- ==========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PurchaseReturns]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PurchaseReturns] (
        [Id] NVARCHAR(50) PRIMARY KEY,
        [ReturnNumber] NVARCHAR(100) NOT NULL UNIQUE,
        [OriginalInvoiceNumber] NVARCHAR(100) NULL,
        [Date] DATETIME NOT NULL DEFAULT GETDATE(),
        [SupplierId] NVARCHAR(50) NOT NULL,
        [SupplierName] NVARCHAR(250) NOT NULL,
        [Total] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [PaidAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [RemainingAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [RefundMethod] NVARCHAR(50) NOT NULL DEFAULT N'credit',
        [SafeId] NVARCHAR(50) DEFAULT N'safe-main',
        [Notes] NVARCHAR(MAX) NULL
    );
    PRINT N'تم إنشاء جدول مرتجعات المشتريات PurchaseReturns.';
END
GO

-- ==========================================================================================
-- 16. جدول بنود مرتجع المشتريات (PurchaseReturnItems)
-- ==========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PurchaseReturnItems]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PurchaseReturnItems] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [ReturnId] NVARCHAR(50) NOT NULL,
        [ProductId] NVARCHAR(50) NOT NULL,
        [ProductName] NVARCHAR(250) NOT NULL,
        [Unit] NVARCHAR(50) NOT NULL,
        [UnitPrice] DECIMAL(18,2) NOT NULL,
        [Quantity] DECIMAL(18,3) NOT NULL,
        [Discount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [DiscountType] NVARCHAR(20) NOT NULL DEFAULT N'fixed',
        [Total] DECIMAL(18,2) NOT NULL,
        CONSTRAINT [FK_PurchaseReturnItems_Return] FOREIGN KEY ([ReturnId]) REFERENCES [dbo].[PurchaseReturns]([Id]) ON DELETE CASCADE
    );
    PRINT N'تم إنشاء جدول بنود مرتجع المشتريات PurchaseReturnItems.';
END
GO

-- ==========================================================================================
-- 17. جدول المصروفات (Expenses)
-- ==========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Expenses]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Expenses] (
        [Id] NVARCHAR(50) PRIMARY KEY,
        [Title] NVARCHAR(250) NOT NULL,
        [Category] NVARCHAR(50) NOT NULL,
        [Amount] DECIMAL(18,2) NOT NULL,
        [SafeId] NVARCHAR(50) DEFAULT N'safe-pos',
        [Recipient] NVARCHAR(150) NULL,
        [Date] DATETIME NOT NULL DEFAULT GETDATE(),
        [Notes] NVARCHAR(MAX) NULL
    );
    PRINT N'تم إنشاء جدول المصروفات Expenses.';
END
GO

-- ==========================================================================================
-- 18. جدول حركة الخزينة النقدية (FinancialTransactions)
-- ==========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[FinancialTransactions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[FinancialTransactions] (
        [Id] NVARCHAR(50) PRIMARY KEY,
        [Type] NVARCHAR(50) NOT NULL,
        [Title] NVARCHAR(250) NOT NULL,
        [Amount] DECIMAL(18,2) NOT NULL,
        [Direction] NVARCHAR(10) NOT NULL, -- 'in' or 'out'
        [Date] DATETIME NOT NULL DEFAULT GETDATE(),
        [SafeId] NVARCHAR(50) DEFAULT N'safe-pos',
        [ReferenceId] NVARCHAR(50) NULL,
        [PartyType] NVARCHAR(50) NULL,
        [PartyId] NVARCHAR(50) NULL,
        [PartyName] NVARCHAR(150) NULL,
        [Notes] NVARCHAR(MAX) NULL
    );
    CREATE NONCLUSTERED INDEX [IX_Tx_Date] ON [dbo].[FinancialTransactions]([Date]);
    PRINT N'تم إنشاء جدول حركات الخزينة FinancialTransactions.';
END
GO

-- ==========================================================================================
-- 19. جدول الورديات وتقفيل الكاشير (Shifts)
-- ==========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Shifts]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Shifts] (
        [Id] NVARCHAR(50) PRIMARY KEY,
        [UserId] NVARCHAR(50) NOT NULL,
        [UserName] NVARCHAR(150) NOT NULL,
        [OpenedAt] DATETIME NOT NULL,
        [ClosedAt] DATETIME NULL,
        [StartingBalance] DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        [SalesRevenue] DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        [OtherIncomes] DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        [OtherExpenses] DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        [ExpectedBalance] DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        [ActualBalance] DECIMAL(18,2) NULL,
        [Difference] DECIMAL(18,2) NULL,
        [Notes] NVARCHAR(MAX) NULL,
        [Status] NVARCHAR(20) NOT NULL DEFAULT N'open'
    );
    PRINT N'تم إنشاء جدول الورديات Shifts.';
END
GO

-- ==========================================================================================
-- 20. جدول الجمعيات المالية والادخارية (MoneyAssociations)
-- ==========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MoneyAssociations]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[MoneyAssociations] (
        [Id] NVARCHAR(50) PRIMARY KEY,
        [Name] NVARCHAR(250) NOT NULL,
        [Organizer] NVARCHAR(150) NOT NULL,
        [TotalAmount] DECIMAL(18,2) NOT NULL,
        [MonthlyInstallment] DECIMAL(18,2) NOT NULL,
        [TotalMonths] INT NOT NULL,
        [PaidMonths] INT NOT NULL DEFAULT 0,
        [PayoutTurnMonth] INT NOT NULL DEFAULT 1,
        [PayoutDate] DATE NULL,
        [Status] NVARCHAR(50) NOT NULL DEFAULT N'active',
        [SafeId] NVARCHAR(50) DEFAULT N'safe-main',
        [StartDate] DATE NOT NULL,
        [Notes] NVARCHAR(MAX) NULL
    );
    PRINT N'تم إنشاء جدول الجمعيات المالية MoneyAssociations.';
END
GO

-- ==========================================================================================
-- 21. جدول وصفات وباقات التجميع (AssemblyRecipes)
-- ==========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AssemblyRecipes]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AssemblyRecipes] (
        [Id] NVARCHAR(50) PRIMARY KEY,
        [Name] NVARCHAR(250) NOT NULL,
        [OutputProductId] NVARCHAR(50) NOT NULL,
        [OutputProductName] NVARCHAR(250) NOT NULL,
        [OutputQuantity] DECIMAL(18,3) NOT NULL DEFAULT 1.000,
        [OutputUnit] NVARCHAR(50) NOT NULL DEFAULT N'قطعة',
        [LaborCost] DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        [TotalEstimatedCost] DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        [Notes] NVARCHAR(MAX) NULL,
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE()
    );
    PRINT N'تم إنشاء جدول وصفات التجميع AssemblyRecipes.';
END
GO

-- ==========================================================================================
-- 22. جدول مكونات وصفة التجميع (AssemblyRecipeItems)
-- ==========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AssemblyRecipeItems]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AssemblyRecipeItems] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [RecipeId] NVARCHAR(50) NOT NULL,
        [ProductId] NVARCHAR(50) NOT NULL,
        [ProductName] NVARCHAR(250) NOT NULL,
        [Quantity] DECIMAL(18,3) NOT NULL,
        [Unit] NVARCHAR(50) NOT NULL,
        [UnitCost] DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        [TotalCost] DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        CONSTRAINT [FK_AssemblyRecipeItems_Recipe] FOREIGN KEY ([RecipeId]) REFERENCES [dbo].[AssemblyRecipes]([Id]) ON DELETE CASCADE
    );
    PRINT N'تم إنشاء جدول مكونات وصفات التجميع AssemblyRecipeItems.';
END
GO

-- ==========================================================================================
-- 23. جدول حركات وعمليات التجميع والتفكيك (AssemblyOperations)
-- ==========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AssemblyOperations]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AssemblyOperations] (
        [Id] NVARCHAR(50) PRIMARY KEY,
        [OperationNumber] NVARCHAR(100) NOT NULL UNIQUE,
        [Type] NVARCHAR(50) NOT NULL DEFAULT N'assembly',
        [RecipeId] NVARCHAR(50) NULL,
        [RecipeName] NVARCHAR(250) NULL,
        [TargetProductId] NVARCHAR(50) NOT NULL,
        [TargetProductName] NVARCHAR(250) NOT NULL,
        [TargetUnit] NVARCHAR(50) NOT NULL DEFAULT N'قطعة',
        [Quantity] DECIMAL(18,3) NOT NULL,
        [UnitCost] DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        [TotalCost] DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        [LaborCost] DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        [OperatorName] NVARCHAR(150) NULL,
        [Date] DATETIME NOT NULL DEFAULT GETDATE(),
        [Notes] NVARCHAR(MAX) NULL
    );
    PRINT N'تم إنشاء جدول عمليات التجميع والتفكيك AssemblyOperations.';
END
GO

-- ==========================================================================================
-- 24. جدول الهالك والتالف (WasteRecords)
-- ==========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[WasteRecords]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[WasteRecords] (
        [Id] NVARCHAR(50) PRIMARY KEY,
        [ProductId] NVARCHAR(50) NOT NULL,
        [ProductName] NVARCHAR(250) NOT NULL,
        [Category] NVARCHAR(50) NULL,
        [Unit] NVARCHAR(50) NOT NULL,
        [Quantity] DECIMAL(18,3) NOT NULL,
        [CostPrice] DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        [LossValue] DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        [Reason] NVARCHAR(100) NOT NULL,
        [Date] DATETIME NOT NULL DEFAULT GETDATE(),
        [Notes] NVARCHAR(MAX) NULL
    );
    PRINT N'تم إنشاء جدول الهالك والتالف WasteRecords.';
END
GO

-- ==========================================================================================
-- 25. مناظر ذكية (Views) لتقارير سيكول سيرفر
-- ==========================================================================================
IF OBJECT_ID(N'[dbo].[v_SalesAndProfitSummary]', N'V') IS NOT NULL
    DROP VIEW [dbo].[v_SalesAndProfitSummary];
GO
CREATE VIEW [dbo].[v_SalesAndProfitSummary]
AS
SELECT 
    COUNT(i.[Id]) AS [TotalInvoicesCount],
    ISNULL(SUM(i.[Total]), 0) AS [TotalRevenue],
    ISNULL(SUM(i.[PaidAmount]), 0) AS [TotalCashCollected],
    ISNULL(SUM(i.[RemainingAmount]), 0) AS [TotalCreditDebts],
    ISNULL(SUM(itemSummary.[TotalCost]), 0) AS [TotalCostOfGoodsSold],
    (ISNULL(SUM(i.[Total]), 0) - ISNULL(SUM(itemSummary.[TotalCost]), 0)) AS [GrossProfit]
FROM [dbo].[SalesInvoices] i
LEFT JOIN (
    SELECT [InvoiceId], SUM([PurchaseCost] * [Quantity]) AS [TotalCost]
    FROM [dbo].[SalesInvoiceItems]
    GROUP BY [InvoiceId]
) itemSummary ON i.[Id] = itemSummary.[InvoiceId]
WHERE i.[Status] = 'completed';
GO

PRINT N'=====================================================================';
PRINT N'تم تجهيز وتنفيذ قاعدة بيانات وسام للأدوات الكهربائية على SQL Server بنجاح!';
PRINT N'تشمل جميع الجداول الـ 24 وجميع الخزائن وحركات البيع والشراء والمرتجعات.';
PRINT N'=====================================================================';
GO
