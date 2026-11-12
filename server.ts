import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import type * as sqlTypes from 'mssql';
import type mysqlTypes from 'mysql2/promise';

import {
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  WALK_IN_CUSTOMER,
  isWalkInCustomer,
  INITIAL_SUPPLIERS,
  INITIAL_SALES_INVOICES,
  INITIAL_PURCHASE_INVOICES,
  INITIAL_EXPENSES,
  INITIAL_TRANSACTIONS,
  INITIAL_SETTINGS,
  INITIAL_USERS,
  INITIAL_SAFES,
  INITIAL_RECIPES,
  INITIAL_ASSEMBLY_OPERATIONS,
  INITIAL_ASSOCIATIONS,
} from './src/data/mockData';

function ensureWalkInInList(customers?: any[]) {
  const list = Array.isArray(customers) ? customers : [];
  const others = list.filter((c: any) => c && !isWalkInCustomer(c));
  return [
    {
      ...WALK_IN_CUSTOMER,
      initialBalance: 0,
      currentBalance: 0,
      creditLimit: 0,
    },
    ...others,
  ];
}

dotenv.config();

// Safe dynamic imports for database drivers so dev server never crashes if a package is missing
let sql: typeof sqlTypes | any = null;
try {
  const mssqlModule = await import('mssql');
  sql = mssqlModule.default || mssqlModule;
} catch (e) {
  console.warn('Notice: Optional mssql driver could not be loaded:', (e as Error)?.message);
}

let mysql: typeof mysqlTypes | any = null;
try {
  const mysqlModule = await import('mysql2/promise');
  mysql = mysqlModule.default || mysqlModule;
} catch (e) {
  console.warn('Notice: Optional mysql2 driver could not be loaded:', (e as Error)?.message);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// =========================================================================
// FILE-BACKED PERSISTENT SERVER DATABASE (JSON PERSISTENCE LAYER)
// =========================================================================
const SERVER_DB_FILE = path.join(__dirname, 'data', 'server_database.json');

function getDefaultServerDb() {
  return {
    products: INITIAL_PRODUCTS || [],
    customers: INITIAL_CUSTOMERS || [],
    suppliers: INITIAL_SUPPLIERS || [],
    salesInvoices: INITIAL_SALES_INVOICES || [],
    purchaseInvoices: INITIAL_PURCHASE_INVOICES || [],
    salesReturns: [],
    purchaseReturns: [],
    expenses: INITIAL_EXPENSES || [],
    transactions: INITIAL_TRANSACTIONS || [],
    settings: INITIAL_SETTINGS || {},
    users: INITIAL_USERS || [],
    safes: INITIAL_SAFES || [],
    safeTransfers: [],
    recipes: INITIAL_RECIPES || [],
    assemblyOperations: INITIAL_ASSEMBLY_OPERATIONS || [],
    associations: INITIAL_ASSOCIATIONS || [],
    savedAudits: [],
    previouslyAuditedMap: {},
    shifts: [],
    wasteRecords: [],
  };
}

function loadServerDatabase() {
  try {
    const dir = path.dirname(SERVER_DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(SERVER_DB_FILE)) {
      const initial = getDefaultServerDb();
      initial.customers = ensureWalkInInList(initial.customers);
      fs.writeFileSync(SERVER_DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const content = fs.readFileSync(SERVER_DB_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    const merged = { ...getDefaultServerDb(), ...parsed };
    merged.customers = ensureWalkInInList(merged.customers);
    return merged;
  } catch (err) {
    console.error('Failed to load server database file:', err);
    return getDefaultServerDb();
  }
}

function saveServerDatabase(data: any) {
  try {
    const dir = path.dirname(SERVER_DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const current = loadServerDatabase();
    const updated = { ...current, ...data };
    updated.customers = ensureWalkInInList(updated.customers);
    fs.writeFileSync(SERVER_DB_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (err) {
    console.error('Failed to save server database file:', err);
    return null;
  }
}

app.get(['/api/database', '/api/get_all.php'], (req: Request, res: Response) => {
  const data = loadServerDatabase();
  res.json({ success: true, data });
});

app.post(['/api/database/save', '/api/save_all.php', '/api/sync_push.php'], (req: Request, res: Response) => {
  try {
    const payload = req.body.data || req.body;
    const saved = saveServerDatabase(payload);
    res.json({ success: true, message: 'تم حفظ البيانات في قاعدة البيانات بنجاح', data: saved });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/database/reset', (req: Request, res: Response) => {
  try {
    const initial = getDefaultServerDb();
    const dir = path.dirname(SERVER_DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SERVER_DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    res.json({ success: true, message: 'تم إعادة ضبط قاعدة البيانات إلى الحالات الافتراضية بنجاح', data: initial });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Dynamic CRUD handlers for legacy / PHP API calls
const ENTITY_FILE_MAP: Record<string, string> = {
  'products.php': 'products',
  'customers.php': 'customers',
  'suppliers.php': 'suppliers',
  'sales.php': 'salesInvoices',
  'purchases.php': 'purchaseInvoices',
  'sales_returns.php': 'salesReturns',
  'purchase_returns.php': 'purchaseReturns',
  'expenses.php': 'expenses',
  'transactions.php': 'transactions',
  'users.php': 'users',
  'shifts.php': 'shifts',
  'waste.php': 'wasteRecords',
  'safes.php': 'safes',
  'recipes.php': 'recipes',
  'assembly_ops.php': 'assemblyOperations',
  'assembly_operations.php': 'assemblyOperations',
  'associations.php': 'associations',
  'settings.php': 'settings',
};

app.all('/api/:endpoint', (req: Request, res: Response, next) => {
  const endpoint = req.params.endpoint;
  const collectionKey = ENTITY_FILE_MAP[endpoint];

  if (!collectionKey) {
    return next();
  }

  const method = req.method;
  const db = loadServerDatabase();

  if (method === 'GET') {
    return res.json({ success: true, data: db[collectionKey] || [] });
  }

  if (method === 'POST' || method === 'PUT') {
    const item = req.body;
    if (collectionKey === 'customers' && method === 'PUT' && isWalkInCustomer(item)) {
      return res.status(403).json({
        success: false,
        error: 'حساب عميل نقدي عام حساب دائم في النظام ومحمي من التعديل نهائياً',
        data: db.customers,
      });
    }
    if (collectionKey === 'settings') {
      db.settings = { ...db.settings, ...item };
    } else if (item && item.id) {
      const list: any[] = Array.isArray(db[collectionKey]) ? db[collectionKey] : [];
      const idx = list.findIndex((x: any) => x.id === item.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...item };
      } else {
        list.unshift(item);
      }
      db[collectionKey] = collectionKey === 'customers' ? ensureWalkInInList(list) : list;
    }
    saveServerDatabase(db);
    return res.json({ success: true, message: 'تم حفظ البيانات بنجاح', data: db[collectionKey] });
  }

  if (method === 'DELETE') {
    const id = (req.query.id as string) || (req.body && req.body.id);
    const ids: string[] | undefined = req.body && Array.isArray(req.body.ids) ? req.body.ids : undefined;
    if (collectionKey === 'customers' && isWalkInCustomer(id)) {
      return res.status(403).json({
        success: false,
        error: 'حساب عميل نقدي عام حساب دائم في النظام ومحمي من الحذف نهائياً',
        data: db.customers,
      });
    }
    if (ids && ids.length > 0 && Array.isArray(db[collectionKey])) {
      const idSet = new Set(ids);
      db[collectionKey] = db[collectionKey].filter((x: any) => !idSet.has(x.id));
      if (collectionKey === 'customers') {
        db.customers = ensureWalkInInList(db.customers);
      }
      saveServerDatabase(db);
    } else if (id && Array.isArray(db[collectionKey])) {
      db[collectionKey] = db[collectionKey].filter((x: any) => x.id !== id);
      if (collectionKey === 'customers') {
        db.customers = ensureWalkInInList(db.customers);
      }
      saveServerDatabase(db);
    }
    return res.json({ success: true, message: 'تم الحذف بنجاح', data: db[collectionKey] });
  }

  return next();
});


// Persistent SQL Server Configuration file path
const CONFIG_FILE = path.join(__dirname, '.sqlserver.config.json');


// Default SQL Server 2012 Configuration
interface SqlServerConnectionSettings {
  server: string;
  port: number;
  user: string;
  password: string;
  database: string;
  instanceName?: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
}

const defaultSqlConfig: SqlServerConnectionSettings = {
  server: process.env.MSSQL_SERVER || 'localhost',
  port: Number(process.env.MSSQL_PORT) || 1433,
  user: process.env.MSSQL_USER || 'sa',
  password: process.env.MSSQL_PASSWORD || '123456',
  database: process.env.MSSQL_DATABASE || 'FrozenHouseDB',
  instanceName: process.env.MSSQL_INSTANCE || '',
  encrypt: false, // Recommended false for SQL Server 2012 local installations
  trustServerCertificate: true,
};

function getActiveConfig(): SqlServerConnectionSettings {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return { ...defaultSqlConfig, ...JSON.parse(data) };
    } catch (e) {
      console.warn('Could not read .sqlserver.config.json, using defaults', e);
    }
  }
  return { ...defaultSqlConfig };
}

function saveActiveConfig(config: Partial<SqlServerConnectionSettings>) {
  const merged = { ...getActiveConfig(), ...config };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

function getMssqlPoolConfig(custom?: Partial<SqlServerConnectionSettings>): any {
  const current = custom ? { ...getActiveConfig(), ...custom } : getActiveConfig();
  
  const mssqlConfig: any = {
    server: current.server,
    port: current.port || 1433,
    user: current.user,
    password: current.password,
    database: current.database || 'master',
    options: {
      encrypt: current.encrypt,
      trustServerCertificate: current.trustServerCertificate,
      enableArithAbort: true,
      connectTimeout: 8000,
      requestTimeout: 15000,
    },
  };

  if (current.instanceName && current.instanceName.trim().length > 0) {
    mssqlConfig.options = {
      ...mssqlConfig.options,
      instanceName: current.instanceName.trim(),
    };
  }

  return mssqlConfig;
}

// =========================================================================
// SQL SERVER API ROUTES
// =========================================================================

// 1. Get current config (masked password)
app.get('/api/sqlserver/config', (req: Request, res: Response) => {
  const config = getActiveConfig();
  res.json({
    success: true,
    config: {
      ...config,
      password: config.password ? '••••••••' : '',
      hasPassword: Boolean(config.password),
    },
  });
});

// 2. Save config
app.post('/api/sqlserver/config', (req: Request, res: Response) => {
  try {
    const { server, port, user, password, database, instanceName, encrypt, trustServerCertificate } = req.body;
    const updateObj: Partial<SqlServerConnectionSettings> = {
      server,
      port: Number(port) || 1433,
      user,
      database,
      instanceName: instanceName || '',
      encrypt: Boolean(encrypt),
      trustServerCertificate: Boolean(trustServerCertificate),
    };
    if (password && password !== '••••••••') {
      updateObj.password = password;
    }
    const saved = saveActiveConfig(updateObj);
    res.json({
      success: true,
      message: 'تم حفظ إعدادات الاتصال بسيكول سيرفر 2012 بنجاح',
      config: {
        ...saved,
        password: saved.password ? '••••••••' : '',
        hasPassword: Boolean(saved.password),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Test Connection
app.post('/api/sqlserver/test', async (req: Request, res: Response) => {
  const customConfig = req.body.config ? { ...req.body.config } : undefined;
  if (customConfig && customConfig.password === '••••••••') {
    customConfig.password = getActiveConfig().password;
  }

  const poolConfig = getMssqlPoolConfig(customConfig);

  let pool: any = null;
  const startTime = Date.now();

  try {
    pool = await new sql.ConnectionPool(poolConfig).connect();
    const result = await pool.request().query(`
      SELECT 
        @@VERSION AS version,
        DB_NAME() AS currentDb,
        SERVERPROPERTY('ProductVersion') AS productVersion,
        SERVERPROPERTY('ProductLevel') AS productLevel,
        SERVERPROPERTY('Edition') AS edition,
        SERVERPROPERTY('MachineName') AS machineName,
        GETDATE() AS serverTime
    `);

    const latency = Date.now() - startTime;
    const row = result.recordset[0];

    await pool.close();

    res.json({
      success: true,
      message: 'تم الاتصال بنجاح بقاعدة بيانات SQL Server 2012!',
      latencyMs: latency,
      serverInfo: {
        fullVersion: row.version,
        productVersion: row.productVersion,
        productLevel: row.productLevel,
        edition: row.edition,
        machineName: row.machineName,
        currentDatabase: row.currentDb,
        serverTime: row.serverTime,
      },
    });
  } catch (err: any) {
    if (pool) {
      try { await pool.close(); } catch {}
    }

    let arabicHint = 'تأكد من صحة اسم السيرفر وكلمة المرور';
    if (err.code === 'ESOCKET' || err.message?.includes('Failed to connect') || err.message?.includes('timeout')) {
      arabicHint = 'تعذر الوصول لمنفذ SQL Server (1433). يرجى التأكد من تشغيل خدمة SQL Server وخدمة SQL Server Browser وتفعيل بروتوكول TCP/IP في SQL Server Configuration Manager.';
    } else if (err.message?.includes('Login failed')) {
      arabicHint = 'فشل تسجيل الدخول للمستخدم. تأكد من تفعيل Mixed Mode Authentication (SQL Server and Windows Authentication) في سيكول سيرفر ومن صحة كلمة مرور sa.';
    } else if (err.message?.includes('Cannot open database')) {
      arabicHint = `قاعدة البيانات '${poolConfig.database}' غير موجودة بعد. يمكنك الضغط على زر "تهيئة وإنشاء الجداول تلقائياً" لإنشائها فوراً.`;
    }

    res.status(400).json({
      success: false,
      error: err.message,
      code: err.code,
      hint: arabicHint,
    });
  }
});

// 4. Initialize Database & Run Schema Script on SQL Server 2012
app.post('/api/sqlserver/init-db', async (req: Request, res: Response) => {
  const schemaPath = path.join(__dirname, 'src', 'data', 'sqlserver2012_schema.sql');
  if (!fs.existsSync(schemaPath)) {
    return res.status(404).json({ success: false, error: 'ملف سكربت SQL Server غير موجود' });
  }

  const rawScript = fs.readFileSync(schemaPath, 'utf-8');
  // Connect initially to master to create DB if needed
  const targetDbName = getActiveConfig().database || 'FrozenHouseDB';
  const masterConfig = getMssqlPoolConfig({ database: 'master' });

  let pool: any = null;
  try {
    pool = await new sql.ConnectionPool(masterConfig).connect();

    // 1. Create DB if missing
    await pool.request().query(`
      IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'${targetDbName}')
      BEGIN
        CREATE DATABASE [${targetDbName}] COLLATE Arabic_100_CI_AS;
      END
    `);
    await pool.close();

    // 2. Connect to the new DB and execute batches split by GO
    const dbConfig = getMssqlPoolConfig({ database: targetDbName });
    pool = await new sql.ConnectionPool(dbConfig).connect();

    const batches = rawScript
      .split(/\r?\n\s*GO\s*\r?\n/i)
      .map(b => b.trim())
      .filter(b => b.length > 0 && !b.startsWith('USE master;') && !b.startsWith('USE [MahsoulyDB];') && !b.startsWith('USE [FrozenHouseDB];'));

    for (const batch of batches) {
      if (batch.trim()) {
        await pool.request().query(batch);
      }
    }

    await pool.close();

    res.json({
      success: true,
      message: `تم إنشاء وتهيئة قاعدة البيانات [${targetDbName}] وكافة الجداول والمناظر الذكية بنجاح على SQL Server 2012!`,
    });
  } catch (err: any) {
    if (pool) {
      try { await pool.close(); } catch {}
    }
    res.status(500).json({
      success: false,
      error: err.message,
      hint: 'تأكد من صلاحيات مستخدم sa وقدرته على إنشاء الجداول (CREATE TABLE/CREATE VIEW).',
    });
  }
});

// 5. Download / Read raw SQL Server 2012 script
app.get('/api/sqlserver/script', (req: Request, res: Response) => {
  const schemaPath = path.join(__dirname, 'src', 'data', 'sqlserver2012_schema.sql');
  if (fs.existsSync(schemaPath)) {
    const script = fs.readFileSync(schemaPath, 'utf-8');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    if (req.query.download === 'true') {
      res.setHeader('Content-Disposition', 'attachment; filename="FrozenHouse_SQLServer2012.sql"');
    }
    return res.send(script);
  }
  res.status(404).send('Script not found');
});

// 6. Push Local Client Data to SQL Server 2012
app.post('/api/sqlserver/sync/push', async (req: Request, res: Response) => {
  const { products, customers, suppliers, salesInvoices, purchaseInvoices, expenses, transactions, settings } = req.body;
  const targetDb = getActiveConfig().database || 'FrozenHouseDB';
  const poolConfig = getMssqlPoolConfig({ database: targetDb });

  let pool: any = null;
  try {
    pool = await new sql.ConnectionPool(poolConfig).connect();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. StoreSettings
      if (settings) {
        const reqSetting = new sql.Request(transaction);
        await reqSetting.query(`
          IF EXISTS (SELECT 1 FROM [dbo].[StoreSettings])
            UPDATE [dbo].[StoreSettings] SET 
              [StoreName] = N'${(settings.storeName || '').replace(/'/g, "''")}',
              [OwnerName] = N'${(settings.ownerName || '').replace(/'/g, "''")}',
              [Phone] = N'${(settings.phone || '').replace(/'/g, "''")}',
              [PhoneAlt] = N'${(settings.phoneAlt || '').replace(/'/g, "''")}',
              [Address] = N'${(settings.address || '').replace(/'/g, "''")}',
              [CommercialRecord] = N'${(settings.commercialRecord || '').replace(/'/g, "''")}',
              [AgriculturalLicense] = N'${(settings.agriculturalLicense || '').replace(/'/g, "''")}',
              [InvoiceFooterNote] = N'${(settings.invoiceFooterNote || '').replace(/'/g, "''")}',
              [Currency] = N'${(settings.currency || 'ج.م').replace(/'/g, "''")}',
              [UpdatedAt] = GETDATE()
          ELSE
            INSERT INTO [dbo].[StoreSettings] ([StoreName], [OwnerName], [Phone], [PhoneAlt], [Address], [CommercialRecord], [AgriculturalLicense], [InvoiceFooterNote], [Currency])
            VALUES (
              N'${(settings.storeName || '').replace(/'/g, "''")}',
              N'${(settings.ownerName || '').replace(/'/g, "''")}',
              N'${(settings.phone || '').replace(/'/g, "''")}',
              N'${(settings.phoneAlt || '').replace(/'/g, "''")}',
              N'${(settings.address || '').replace(/'/g, "''")}',
              N'${(settings.commercialRecord || '').replace(/'/g, "''")}',
              N'${(settings.agriculturalLicense || '').replace(/'/g, "''")}',
              N'${(settings.invoiceFooterNote || '').replace(/'/g, "''")}',
              N'${(settings.currency || 'ج.م').replace(/'/g, "''")}'
            )
        `);
      }

      // 2. Suppliers
      if (Array.isArray(suppliers)) {
        for (const s of suppliers) {
          const reqSup = new sql.Request(transaction);
          await reqSup.query(`
            IF EXISTS (SELECT 1 FROM [dbo].[Suppliers] WHERE [Id] = N'${s.id}')
              UPDATE [dbo].[Suppliers] SET
                [Name] = N'${(s.name || '').replace(/'/g, "''")}',
                [RepresentativeName] = N'${(s.representativeName || '').replace(/'/g, "''")}',
                [Phone] = N'${(s.phone || '').replace(/'/g, "''")}',
                [Address] = N'${(s.address || '').replace(/'/g, "''")}',
                [CurrentBalance] = ${Number(s.currentBalance) || 0},
                [Notes] = N'${(s.notes || '').replace(/'/g, "''")}'
              WHERE [Id] = N'${s.id}'
            ELSE
              INSERT INTO [dbo].[Suppliers] ([Id], [Name], [RepresentativeName], [Phone], [Address], [CurrentBalance], [Notes])
              VALUES (
                N'${s.id}',
                N'${(s.name || '').replace(/'/g, "''")}',
                N'${(s.representativeName || '').replace(/'/g, "''")}',
                N'${(s.phone || '').replace(/'/g, "''")}',
                N'${(s.address || '').replace(/'/g, "''")}',
                ${Number(s.currentBalance) || 0},
                N'${(s.notes || '').replace(/'/g, "''")}'
              )
          `);
        }
      }

      // 3. Customers
      if (Array.isArray(customers)) {
        for (const c of customers) {
          const reqCust = new sql.Request(transaction);
          await reqCust.query(`
            IF EXISTS (SELECT 1 FROM [dbo].[Customers] WHERE [Id] = N'${c.id}')
              UPDATE [dbo].[Customers] SET
                [Name] = N'${(c.name || '').replace(/'/g, "''")}',
                [Phone] = N'${(c.phone || '').replace(/'/g, "''")}',
                [Address] = N'${(c.address || '').replace(/'/g, "''")}',
                [CropTypes] = N'${(c.cropTypes || '').replace(/'/g, "''")}',
                [FarmArea] = N'${(c.farmArea || '').replace(/'/g, "''")}',
                [CurrentBalance] = ${Number(c.currentBalance) || 0},
                [Notes] = N'${(c.notes || '').replace(/'/g, "''")}'
              WHERE [Id] = N'${c.id}'
            ELSE
              INSERT INTO [dbo].[Customers] ([Id], [Name], [Phone], [Address], [CropTypes], [FarmArea], [CurrentBalance], [Notes])
              VALUES (
                N'${c.id}',
                N'${(c.name || '').replace(/'/g, "''")}',
                N'${(c.phone || '').replace(/'/g, "''")}',
                N'${(c.address || '').replace(/'/g, "''")}',
                N'${(c.cropTypes || '').replace(/'/g, "''")}',
                N'${(c.farmArea || '').replace(/'/g, "''")}',
                ${Number(c.currentBalance) || 0},
                N'${(c.notes || '').replace(/'/g, "''")}'
              )
          `);
        }
      }

      // 4. Products
      if (Array.isArray(products)) {
        for (const p of products) {
          const reqProd = new sql.Request(transaction);
          const expSql = p.expiryDate ? `'${p.expiryDate}'` : 'NULL';
          await reqProd.query(`
            IF EXISTS (SELECT 1 FROM [dbo].[Products] WHERE [Id] = N'${p.id}')
              UPDATE [dbo].[Products] SET
                [Name] = N'${(p.name || '').replace(/'/g, "''")}',
                [Category] = N'${(p.category || '').replace(/'/g, "''")}',
                [ActiveIngredient] = N'${(p.activeIngredient || '').replace(/'/g, "''")}',
                [Concentration] = N'${(p.concentration || '').replace(/'/g, "''")}',
                [Phi] = ${p.phi !== undefined && p.phi !== null ? Number(p.phi) : 'NULL'},
                [DosageInfo] = N'${(p.dosageInfo || '').replace(/'/g, "''")}',
                [TargetPests] = N'${(p.targetPests || '').replace(/'/g, "''")}',
                [Toxicity] = N'${(p.toxicity || 'caution').replace(/'/g, "''")}',
                [Barcode] = N'${(p.barcode || '').replace(/'/g, "''")}',
                [Unit] = N'${(p.unit || '').replace(/'/g, "''")}',
                [PurchasePrice] = ${Number(p.purchasePrice) || 0},
                [SellingPrice] = ${Number(p.sellingPrice) || 0},
                [Quantity] = ${Number(p.quantity) || 0},
                [MinAlertQuantity] = ${Number(p.minAlertQuantity) || 5},
                [BatchNumber] = N'${(p.batchNumber || '').replace(/'/g, "''")}',
                [ExpiryDate] = ${expSql},
                [SupplierId] = ${p.supplierId ? `N'${p.supplierId}'` : 'NULL'},
                [Notes] = N'${(p.notes || '').replace(/'/g, "''")}'
              WHERE [Id] = N'${p.id}'
            ELSE
              INSERT INTO [dbo].[Products] ([Id], [Name], [Category], [ActiveIngredient], [Concentration], [Phi], [DosageInfo], [TargetPests], [Toxicity], [Barcode], [Unit], [PurchasePrice], [SellingPrice], [Quantity], [MinAlertQuantity], [BatchNumber], [ExpiryDate], [SupplierId], [Notes])
              VALUES (
                N'${p.id}',
                N'${(p.name || '').replace(/'/g, "''")}',
                N'${(p.category || '').replace(/'/g, "''")}',
                N'${(p.activeIngredient || '').replace(/'/g, "''")}',
                N'${(p.concentration || '').replace(/'/g, "''")}',
                ${p.phi !== undefined && p.phi !== null ? Number(p.phi) : 'NULL'},
                N'${(p.dosageInfo || '').replace(/'/g, "''")}',
                N'${(p.targetPests || '').replace(/'/g, "''")}',
                N'${(p.toxicity || 'caution').replace(/'/g, "''")}',
                N'${(p.barcode || '').replace(/'/g, "''")}',
                N'${(p.unit || '').replace(/'/g, "''")}',
                ${Number(p.purchasePrice) || 0},
                ${Number(p.sellingPrice) || 0},
                ${Number(p.quantity) || 0},
                ${Number(p.minAlertQuantity) || 5},
                N'${(p.batchNumber || '').replace(/'/g, "''")}',
                ${expSql},
                ${p.supplierId ? `N'${p.supplierId}'` : 'NULL'},
                N'${(p.notes || '').replace(/'/g, "''")}'
              )
          `);
        }
      }

      // 5. Sales Invoices & Items
      if (Array.isArray(salesInvoices)) {
        for (const inv of salesInvoices) {
          const reqInv = new sql.Request(transaction);
          await reqInv.query(`
            IF EXISTS (SELECT 1 FROM [dbo].[SalesInvoices] WHERE [Id] = N'${inv.id}')
              UPDATE [dbo].[SalesInvoices] SET
                [InvoiceNumber] = N'${(inv.invoiceNumber || '').replace(/'/g, "''")}',
                [Date] = '${inv.date}',
                [CustomerId] = N'${(inv.customerId || '').replace(/'/g, "''")}',
                [CustomerName] = N'${(inv.customerName || '').replace(/'/g, "''")}',
                [CustomerPhone] = N'${(inv.customerPhone || '').replace(/'/g, "''")}',
                [Subtotal] = ${Number(inv.subtotal) || 0},
                [Discount] = ${Number(inv.discount) || 0},
                [Total] = ${Number(inv.total) || 0},
                [PaidAmount] = ${Number(inv.paidAmount) || 0},
                [RemainingAmount] = ${Number(inv.remainingAmount) || 0},
                [PaymentMethod] = N'${(inv.paymentMethod || 'cash').replace(/'/g, "''")}',
                [Notes] = N'${(inv.notes || '').replace(/'/g, "''")}',
                [Status] = N'${(inv.status || 'completed').replace(/'/g, "''")}'
              WHERE [Id] = N'${inv.id}'
            ELSE
              INSERT INTO [dbo].[SalesInvoices] ([Id], [InvoiceNumber], [Date], [CustomerId], [CustomerName], [CustomerPhone], [Subtotal], [Discount], [Total], [PaidAmount], [RemainingAmount], [PaymentMethod], [Notes], [Status])
              VALUES (
                N'${inv.id}',
                N'${(inv.invoiceNumber || '').replace(/'/g, "''")}',
                '${inv.date}',
                N'${(inv.customerId || '').replace(/'/g, "''")}',
                N'${(inv.customerName || '').replace(/'/g, "''")}',
                N'${(inv.customerPhone || '').replace(/'/g, "''")}',
                ${Number(inv.subtotal) || 0},
                ${Number(inv.discount) || 0},
                ${Number(inv.total) || 0},
                ${Number(inv.paidAmount) || 0},
                ${Number(inv.remainingAmount) || 0},
                N'${(inv.paymentMethod || 'cash').replace(/'/g, "''")}',
                N'${(inv.notes || '').replace(/'/g, "''")}',
                N'${(inv.status || 'completed').replace(/'/g, "''")}'
              )
          `);

          // Insert items
          if (Array.isArray(inv.items)) {
            const reqDelItems = new sql.Request(transaction);
            await reqDelItems.query(`DELETE FROM [dbo].[SalesInvoiceItems] WHERE [InvoiceId] = N'${inv.id}'`);

            for (const item of inv.items) {
              const reqItem = new sql.Request(transaction);
              await reqItem.query(`
                INSERT INTO [dbo].[SalesInvoiceItems] ([InvoiceId], [ProductId], [ProductName], [Category], [ActiveIngredient], [Phi], [Unit], [UnitPrice], [PurchaseCost], [Quantity], [Total])
                VALUES (
                  N'${inv.id}',
                  N'${item.productId}',
                  N'${(item.productName || '').replace(/'/g, "''")}',
                  N'${(item.category || '').replace(/'/g, "''")}',
                  N'${(item.activeIngredient || '').replace(/'/g, "''")}',
                  ${item.phi !== undefined && item.phi !== null ? Number(item.phi) : 'NULL'},
                  N'${(item.unit || '').replace(/'/g, "''")}',
                  ${Number(item.unitPrice) || 0},
                  ${Number(item.purchaseCost) || 0},
                  ${Number(item.quantity) || 1},
                  ${Number(item.total) || 0}
                )
              `);
            }
          }
        }
      }

      // 6. Expenses
      if (Array.isArray(expenses)) {
        for (const exp of expenses) {
          const reqExp = new sql.Request(transaction);
          await reqExp.query(`
            IF EXISTS (SELECT 1 FROM [dbo].[Expenses] WHERE [Id] = N'${exp.id}')
              UPDATE [dbo].[Expenses] SET
                [Title] = N'${(exp.title || '').replace(/'/g, "''")}',
                [Category] = N'${(exp.category || '').replace(/'/g, "''")}',
                [Amount] = ${Number(exp.amount) || 0},
                [Date] = '${exp.date}',
                [Notes] = N'${(exp.notes || '').replace(/'/g, "''")}'
              WHERE [Id] = N'${exp.id}'
            ELSE
              INSERT INTO [dbo].[Expenses] ([Id], [Title], [Category], [Amount], [Date], [Notes])
              VALUES (
                N'${exp.id}',
                N'${(exp.title || '').replace(/'/g, "''")}',
                N'${(exp.category || '').replace(/'/g, "''")}',
                ${Number(exp.amount) || 0},
                '${exp.date}',
                N'${(exp.notes || '').replace(/'/g, "''")}'
              )
          `);
        }
      }

      await transaction.commit();
      await pool.close();

      res.json({
        success: true,
        message: 'تمت مزامنة ورفع كافة البيانات بنجاح إلى قاعدة بيانات SQL Server 2012!',
        syncedCounts: {
          products: products?.length || 0,
          customers: customers?.length || 0,
          suppliers: suppliers?.length || 0,
          salesInvoices: salesInvoices?.length || 0,
          expenses: expenses?.length || 0,
        },
      });
    } catch (innerErr) {
      await transaction.rollback();
      throw innerErr;
    }
  } catch (err: any) {
    if (pool) {
      try { await pool.close(); } catch {}
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Pull Data from SQL Server 2012 to Client
app.get('/api/sqlserver/sync/pull', async (req: Request, res: Response) => {
  const targetDb = getActiveConfig().database || 'FrozenHouseDB';
  const poolConfig = getMssqlPoolConfig({ database: targetDb });

  let pool: any = null;
  try {
    pool = await new sql.ConnectionPool(poolConfig).connect();

    // Query all entities
    const [settingsRes, prodsRes, custsRes, supsRes, invsRes, itemsRes, expsRes, txsRes] = await Promise.all([
      pool.request().query('SELECT TOP 1 * FROM [dbo].[StoreSettings] ORDER BY [Id] DESC'),
      pool.request().query('SELECT * FROM [dbo].[Products] ORDER BY [Name] ASC'),
      pool.request().query('SELECT * FROM [dbo].[Customers] ORDER BY [Name] ASC'),
      pool.request().query('SELECT * FROM [dbo].[Suppliers] ORDER BY [Name] ASC'),
      pool.request().query('SELECT * FROM [dbo].[SalesInvoices] ORDER BY [Date] DESC'),
      pool.request().query('SELECT * FROM [dbo].[SalesInvoiceItems]'),
      pool.request().query('SELECT * FROM [dbo].[Expenses] ORDER BY [Date] DESC'),
      pool.request().query('SELECT * FROM [dbo].[FinancialTransactions] ORDER BY [Date] DESC'),
    ]);

    await pool.close();

    // Group items into invoices
    const itemsMap: Record<string, any[]> = {};
    for (const item of itemsRes.recordset) {
      if (!itemsMap[item.InvoiceId]) itemsMap[item.InvoiceId] = [];
      itemsMap[item.InvoiceId].push({
        productId: item.ProductId,
        productName: item.ProductName,
        category: item.Category,
        activeIngredient: item.ActiveIngredient,
        phi: item.Phi,
        unit: item.Unit,
        unitPrice: Number(item.UnitPrice),
        purchaseCost: Number(item.PurchaseCost),
        quantity: Number(item.Quantity),
        total: Number(item.Total),
      });
    }

    const salesInvoices = invsRes.recordset.map((inv: any) => ({
      id: inv.Id,
      invoiceNumber: inv.InvoiceNumber,
      date: inv.Date ? new Date(inv.Date).toISOString() : new Date().toISOString(),
      customerId: inv.CustomerId,
      customerName: inv.CustomerName,
      customerPhone: inv.CustomerPhone,
      items: itemsMap[inv.Id] || [],
      subtotal: Number(inv.Subtotal),
      discount: Number(inv.Discount),
      total: Number(inv.Total),
      paidAmount: Number(inv.PaidAmount),
      remainingAmount: Number(inv.RemainingAmount),
      paymentMethod: inv.PaymentMethod,
      notes: inv.Notes,
      status: inv.Status,
    }));

    const products = prodsRes.recordset.map((p: any) => ({
      id: p.Id,
      name: p.Name,
      category: p.Category,
      activeIngredient: p.ActiveIngredient,
      concentration: p.Concentration,
      phi: p.Phi,
      dosageInfo: p.DosageInfo,
      targetPests: p.TargetPests,
      toxicity: p.Toxicity,
      barcode: p.Barcode,
      unit: p.Unit,
      purchasePrice: Number(p.PurchasePrice),
      sellingPrice: Number(p.SellingPrice),
      quantity: Number(p.Quantity),
      minAlertQuantity: Number(p.MinAlertQuantity),
      batchNumber: p.BatchNumber,
      expiryDate: p.ExpiryDate ? new Date(p.ExpiryDate).toISOString().slice(0, 10) : undefined,
      supplierId: p.SupplierId,
      notes: p.Notes,
    }));

    const customers = custsRes.recordset.map((c: any) => ({
      id: c.Id,
      name: c.Name,
      phone: c.Phone,
      address: c.Address,
      cropTypes: c.CropTypes,
      farmArea: c.FarmArea,
      currentBalance: Number(c.CurrentBalance),
      notes: c.Notes,
      createdAt: c.CreatedAt ? new Date(c.CreatedAt).toISOString() : new Date().toISOString(),
    }));

    const suppliers = supsRes.recordset.map((s: any) => ({
      id: s.Id,
      name: s.Name,
      representativeName: s.RepresentativeName,
      phone: s.Phone,
      address: s.Address,
      currentBalance: Number(s.CurrentBalance),
      notes: s.notes || s.Notes,
      createdAt: s.CreatedAt ? new Date(s.CreatedAt).toISOString() : new Date().toISOString(),
    }));

    const expenses = expsRes.recordset.map((e: any) => ({
      id: e.Id,
      title: e.Title,
      category: e.Category,
      amount: Number(e.Amount),
      date: e.Date ? new Date(e.Date).toISOString() : new Date().toISOString(),
      notes: e.Notes,
    }));

    let settingsObj = undefined;
    if (settingsRes.recordset.length > 0) {
      const s = settingsRes.recordset[0];
      settingsObj = {
        storeName: s.StoreName,
        ownerName: s.OwnerName,
        phone: s.Phone,
        phoneAlt: s.PhoneAlt,
        address: s.Address,
        commercialRecord: s.CommercialRecord,
        agriculturalLicense: s.AgriculturalLicense,
        taxRate: Number(s.TaxRate || 0),
        invoiceFooterNote: s.InvoiceFooterNote,
        currency: s.Currency || 'ج.م',
      };
    }

    res.json({
      success: true,
      message: 'تم جلب البيانات بنجاح من SQL Server 2012',
      data: {
        products,
        customers,
        suppliers,
        salesInvoices,
        expenses,
        settings: settingsObj,
      },
    });
  } catch (err: any) {
    if (pool) {
      try { await pool.close(); } catch {}
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// XAMPP / MYSQL API ROUTES
// =========================================================================
const MYSQL_CONFIG_FILE = path.join(__dirname, '.mysql.config.json');

interface MySqlConnectionSettings {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

const defaultMySqlConfig: MySqlConnectionSettings = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '', // XAMPP default root password is empty
  database: process.env.MYSQL_DATABASE || 'alhana_pro_erp',
};

function getActiveMySqlConfig(): MySqlConnectionSettings {
  if (fs.existsSync(MYSQL_CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(MYSQL_CONFIG_FILE, 'utf-8');
      return { ...defaultMySqlConfig, ...JSON.parse(data) };
    } catch {}
  }
  return { ...defaultMySqlConfig };
}

function saveActiveMySqlConfig(config: Partial<MySqlConnectionSettings>) {
  const merged = { ...getActiveMySqlConfig(), ...config };
  fs.writeFileSync(MYSQL_CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

// Get MySQL Config
app.get('/api/mysql/config', (req: Request, res: Response) => {
  const cfg = getActiveMySqlConfig();
  res.json({
    success: true,
    config: {
      ...cfg,
      password: cfg.password ? '••••••••' : '',
      hasPassword: Boolean(cfg.password),
    },
  });
});

// Save MySQL Config
app.post('/api/mysql/config', (req: Request, res: Response) => {
  try {
    const { host, port, user, password, database } = req.body;
    const updateObj: Partial<MySqlConnectionSettings> = {
      host: host || 'localhost',
      port: Number(port) || 3306,
      user: user || 'root',
      database: database || 'mahsouly_db',
    };
    if (password !== undefined && password !== '••••••••') {
      updateObj.password = password;
    }
    const saved = saveActiveMySqlConfig(updateObj);
    res.json({
      success: true,
      message: 'تم حفظ إعدادات الاتصال بـ XAMPP / MySQL بنجاح',
      config: {
        ...saved,
        password: saved.password ? '••••••••' : '',
        hasPassword: Boolean(saved.password),
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Test Connection MySQL / XAMPP
app.post('/api/mysql/test', async (req: Request, res: Response) => {
  const custom = req.body.config ? { ...req.body.config } : {};
  if (custom.password === '••••••••') {
    custom.password = getActiveMySqlConfig().password;
  }
  const cfg = { ...getActiveMySqlConfig(), ...custom };

  const startTime = Date.now();
  let conn: any = null;
  try {
    conn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      connectTimeout: 5000,
    });

    const [rows]: any = await conn.query('SELECT VERSION() AS version, DATABASE() AS currentDb, NOW() as serverTime');
    const latency = Date.now() - startTime;
    await conn.end();

    res.json({
      success: true,
      message: 'تم الاتصال بنجاح بـ XAMPP (MySQL / MariaDB)!',
      latencyMs: latency,
      serverInfo: {
        version: rows[0].version,
        serverTime: rows[0].serverTime,
        database: cfg.database,
      },
    });
  } catch (err: any) {
    if (conn) {
      try { await conn.end(); } catch {}
    }
    let hint = 'تأكد من الضغط على زر Start بجانب MySQL في لوحة تحكم XAMPP Control Panel';
    if (err.code === 'ECONNREFUSED') {
      hint = 'خدمة MySQL غير مشغلة على جهازك أو المنفذ 3306 مغلق. افتح XAMPP Control Panel واضغط Start بجانب MySQL.';
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      hint = 'خطأ في اسم المستخدم أو كلمة المرور. في XAMPP الافتراضي اسم المستخدم هو root وكلمة المرور فارغة (اتركها فارغة).';
    }
    res.status(400).json({
      success: false,
      error: err.message,
      code: err.code,
      hint,
    });
  }
});

// Init Database & Run Schema on MySQL / XAMPP
app.post('/api/mysql/init-db', async (req: Request, res: Response) => {
  const schemaPath = path.join(__dirname, 'src', 'data', 'mysql_schema.sql');
  if (!fs.existsSync(schemaPath)) {
    return res.status(404).json({ success: false, error: 'ملف سكربت MySQL غير موجود' });
  }

  const rawScript = fs.readFileSync(schemaPath, 'utf-8');
  const cfg = getActiveMySqlConfig();

  let conn: any = null;
  try {
    conn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      multipleStatements: true,
    });

    await conn.query(rawScript);
    await conn.end();

    res.json({
      success: true,
      message: `تم إنشاء وتهيئة قاعدة بيانات [${cfg.database}] وكافة الجداول في XAMPP / MySQL بنجاح!`,
    });
  } catch (err: any) {
    if (conn) {
      try { await conn.end(); } catch {}
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get MySQL Script
app.get('/api/mysql/script', (req: Request, res: Response) => {
  const schemaPath = path.join(__dirname, 'src', 'data', 'mysql_schema.sql');
  if (fs.existsSync(schemaPath)) {
    const script = fs.readFileSync(schemaPath, 'utf-8');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    if (req.query.download === 'true') {
      res.setHeader('Content-Disposition', 'attachment; filename="Mahsouly_XAMPP_MySQL.sql"');
    }
    return res.send(script);
  }
  res.status(404).send('Script not found');
});

// Push data to MySQL / XAMPP
app.post('/api/mysql/sync/push', async (req: Request, res: Response) => {
  const { products, customers, suppliers, salesInvoices, expenses, settings } = req.body;
  const cfg = getActiveMySqlConfig();

  let conn: any = null;
  try {
    conn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
    });

    // 1. Settings
    if (settings) {
      await conn.query(`
        INSERT INTO \`StoreSettings\` (\`Id\`, \`StoreName\`, \`OwnerName\`, \`Phone\`, \`PhoneAlt\`, \`Address\`, \`CommercialRecord\`, \`AgriculturalLicense\`, \`InvoiceFooterNote\`, \`Currency\`)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          \`StoreName\` = VALUES(\`StoreName\`),
          \`OwnerName\` = VALUES(\`OwnerName\`),
          \`Phone\` = VALUES(\`Phone\`),
          \`PhoneAlt\` = VALUES(\`PhoneAlt\`),
          \`Address\` = VALUES(\`Address\`),
          \`CommercialRecord\` = VALUES(\`CommercialRecord\`),
          \`AgriculturalLicense\` = VALUES(\`AgriculturalLicense\`),
          \`InvoiceFooterNote\` = VALUES(\`InvoiceFooterNote\`),
          \`Currency\` = VALUES(\`Currency\`)
      `, [
        settings.storeName, settings.ownerName, settings.phone, settings.phoneAlt,
        settings.address, settings.commercialRecord, settings.agriculturalLicense,
        settings.invoiceFooterNote, settings.currency || 'ج.م'
      ]);
    }

    // 2. Suppliers
    if (Array.isArray(suppliers)) {
      for (const s of suppliers) {
        await conn.query(`
          INSERT INTO \`Suppliers\` (\`Id\`, \`Name\`, \`RepresentativeName\`, \`Phone\`, \`Address\`, \`CurrentBalance\`, \`Notes\`)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`Name\` = VALUES(\`Name\`),
            \`RepresentativeName\` = VALUES(\`RepresentativeName\`),
            \`Phone\` = VALUES(\`Phone\`),
            \`Address\` = VALUES(\`Address\`),
            \`CurrentBalance\` = VALUES(\`CurrentBalance\`),
            \`Notes\` = VALUES(\`Notes\`)
        `, [s.id, s.name, s.representativeName, s.phone, s.address, Number(s.currentBalance) || 0, s.notes || '']);
      }
    }

    // 3. Customers
    if (Array.isArray(customers)) {
      for (const c of customers) {
        await conn.query(`
          INSERT INTO \`Customers\` (\`Id\`, \`Name\`, \`Phone\`, \`Address\`, \`CropTypes\`, \`FarmArea\`, \`CurrentBalance\`, \`Notes\`)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`Name\` = VALUES(\`Name\`),
            \`Phone\` = VALUES(\`Phone\`),
            \`Address\` = VALUES(\`Address\`),
            \`CropTypes\` = VALUES(\`CropTypes\`),
            \`FarmArea\` = VALUES(\`FarmArea\`),
            \`CurrentBalance\` = VALUES(\`CurrentBalance\`),
            \`Notes\` = VALUES(\`Notes\`)
        `, [c.id, c.name, c.phone, c.address, c.cropTypes, c.farmArea, Number(c.currentBalance) || 0, c.notes || '']);
      }
    }

    // 4. Products
    if (Array.isArray(products)) {
      for (const p of products) {
        await conn.query(`
          INSERT INTO \`Products\` (\`Id\`, \`Name\`, \`Category\`, \`ActiveIngredient\`, \`Concentration\`, \`Phi\`, \`DosageInfo\`, \`TargetPests\`, \`Toxicity\`, \`Barcode\`, \`Unit\`, \`PurchasePrice\`, \`SellingPrice\`, \`Quantity\`, \`MinAlertQuantity\`, \`BatchNumber\`, \`ExpiryDate\`, \`SupplierId\`, \`Notes\`)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`Name\` = VALUES(\`Name\`),
            \`Category\` = VALUES(\`Category\`),
            \`ActiveIngredient\` = VALUES(\`ActiveIngredient\`),
            \`Concentration\` = VALUES(\`Concentration\`),
            \`Phi\` = VALUES(\`Phi\`),
            \`DosageInfo\` = VALUES(\`DosageInfo\`),
            \`TargetPests\` = VALUES(\`TargetPests\`),
            \`Toxicity\` = VALUES(\`Toxicity\`),
            \`Barcode\` = VALUES(\`Barcode\`),
            \`Unit\` = VALUES(\`Unit\`),
            \`PurchasePrice\` = VALUES(\`PurchasePrice\`),
            \`SellingPrice\` = VALUES(\`SellingPrice\`),
            \`Quantity\` = VALUES(\`Quantity\`),
            \`MinAlertQuantity\` = VALUES(\`MinAlertQuantity\`),
            \`BatchNumber\` = VALUES(\`BatchNumber\`),
            \`ExpiryDate\` = VALUES(\`ExpiryDate\`),
            \`SupplierId\` = VALUES(\`SupplierId\`),
            \`Notes\` = VALUES(\`Notes\`)
        `, [
          p.id, p.name, p.category, p.activeIngredient, p.concentration,
          p.phi !== undefined ? p.phi : null, p.dosageInfo, p.targetPests,
          p.toxicity || 'caution', p.barcode, p.unit, Number(p.purchasePrice) || 0,
          Number(p.sellingPrice) || 0, Number(p.quantity) || 0, Number(p.minAlertQuantity) || 5,
          p.batchNumber, p.expiryDate || null, p.supplierId || null, p.notes || ''
        ]);
      }
    }

    await conn.end();

    res.json({
      success: true,
      message: 'تمت مزامنة ورفع البيانات بنجاح إلى XAMPP / MySQL!',
      syncedCounts: {
        products: products?.length || 0,
        customers: customers?.length || 0,
        suppliers: suppliers?.length || 0,
      },
    });
  } catch (err: any) {
    if (conn) {
      try { await conn.end(); } catch {}
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// Download dist.zip for XAMPP / Desktop installation
const getTargetDistZipPath = (): string | null => {
  const possiblePaths = [
    path.resolve(__dirname, 'wessam_electrical_erp_dist.zip'),
    path.resolve(__dirname, 'dist.zip'),
    path.resolve(__dirname, 'public', 'wessam_electrical_erp_dist.zip'),
    path.resolve(__dirname, 'public', 'dist.zip'),
    path.resolve(__dirname, 'dist', 'wessam_electrical_erp_dist.zip'),
    path.resolve(__dirname, 'dist', 'dist.zip')
  ];
  return possiblePaths.find(p => fs.existsSync(p)) || null;
};

app.get('/api/download/dist-zip-json', (req: Request, res: Response) => {
  try {
    const targetZip = getTargetDistZipPath();
    if (!targetZip) {
      return res.status(404).json({ success: false, error: 'ملف التوزيع المضغوط غير موجود' });
    }
    const buffer = fs.readFileSync(targetZip);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.json({
      success: true,
      filename: 'wessam_electrical_erp_dist.zip',
      size: buffer.length,
      base64: buffer.toString('base64'),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

const handleDistZipDownload = (req: Request, res: Response) => {
  const targetZip = getTargetDistZipPath();

  if (!targetZip) {
    return res.status(404).json({ success: false, error: 'ملف التوزيع المضغوط غير موجود' });
  }

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  return res.download(targetZip, 'wessam_electrical_erp_dist.zip', (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
};

app.get([
  '/dist.zip',
  '/wessam_electrical_erp_dist.zip',
  '/api/download/dist-zip',
  '/api/download_dist.php',
  '/download_dist.php'
], handleDistZipDownload);

app.get(['/alhana_pro_erp.sql', '/frozenhouse_xampp.sql'], (req: Request, res: Response) => {
  const sqlPath = fs.existsSync(path.join(__dirname, 'public', 'frozenhouse_xampp.sql'))
    ? path.join(__dirname, 'public', 'frozenhouse_xampp.sql')
    : path.join(__dirname, 'public', 'alhana_pro_erp.sql');

  if (fs.existsSync(sqlPath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="frozenhouse_xampp.sql"');
    res.sendFile(sqlPath);
  } else {
    res.status(404).json({ success: false, error: 'ملف SQL غير موجود' });
  }
});

// =========================================================================
// SMART ASSISTANT API (GEMINI 3.8 FLASH + ERP STORE CONTEXT)
// =========================================================================
app.post('/api/assistant/chat', async (req: Request, res: Response) => {
  try {
    const { message, history = [], storeSummary = '' } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'الرسالة مطلوبة' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        fallback: true,
        error: 'مفتاح المساعد الذكي غير مفعل على الخادم، سيتم التحليل المحلي الفوري.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const systemInstruction = `أنت "المساعد الذكي لمنظومة وسام للأدوات الكهربائية" (ERP Smart Assistant).
مهمتك مساعدة إدارة المحل والمحاسبين وأمناء المخزن في تحليل المبيعات، الأرباح، المخزون، نواقص الأصناف، فك وتجميع الأصناف الكهربائية، مديونيات العملاء والمقاولين، مستحقات الموردين، وأرصدة الخزائن والمصروفات.
تحدث باللغة العربية بأسلوب احترافي، واضح، ومنظم في نقاط قصيرة وأرقام دقيقة بالجنيه المصري (ج.م).
اعتمد دائماً على البيانات الحية التالية للمتجر عند الإجابة:
${storeSummary}`;

    const formattedHistory = Array.isArray(history)
      ? history.slice(-8).map((msg: { role?: string; text?: string }) => ({
          role: msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: String(msg.text || '') }],
        }))
      : [];

    const contents = [
      ...formattedHistory,
      { role: 'user', parts: [{ text: message }] },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
      },
    });

    return res.json({
      success: true,
      reply: response.text || 'تم تحليل البيانات بنجاح.',
    });
  } catch (err: any) {
    console.error('Smart Assistant Error:', err?.message || err);
    return res.status(500).json({
      success: false,
      fallback: true,
      error: err?.message || 'حدث خطأ أثناء الاتصال بالمساعد الذكي',
    });
  }
});

// Serve public directory static files
app.use(express.static(path.join(__dirname, 'public')));

// =========================================================================
// VITE DEV SERVER / STATIC ASSETS
// =========================================================================
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`فروزن هاوس يعمل الآن على المنفذ: http://localhost:${PORT}`);
    console.log(`دعم Microsoft SQL Server 2012 مفعل وجاهز.`);
  });
}

startServer();
