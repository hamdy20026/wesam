import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Product,
  Customer,
  Supplier,
  SalesInvoice,
  PurchaseInvoice,
  PurchaseInvoiceItem,
  SalesReturnInvoice,
  PurchaseReturnInvoice,
  Expense,
  FinancialTransaction,
  StoreSettings,
  InvoiceItem,
  PaymentMethod,
  User,
  UserRole,
  Shift,
  WasteRecord,
  SafeAccount,
  SafeTransfer,
  AssemblyRecipe,
  AssemblyOperation,
  MoneyAssociation,
  SavedAuditReport,
  PreviousAuditInfo
} from '../types';
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
  INITIAL_SAVED_AUDITS,
  INITIAL_PREVIOUSLY_AUDITED_MAP
} from '../data/mockData';

const ensurePermanentWalkInCustomer = (list?: Customer[]): Customer[] => {
  const source = Array.isArray(list) ? list : [];
  const others = source.filter(c => c && !isWalkInCustomer(c));
  return [
    {
      ...WALK_IN_CUSTOMER,
      initialBalance: 0,
      currentBalance: 0,
      creditLimit: 0,
    },
    ...others,
  ];
};

interface AppContextType {
  // Data
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  expenses: Expense[];
  transactions: FinancialTransaction[];
  settings: StoreSettings;
  users: User[];
  shifts: Shift[];
  activeShift: Shift | null;
  wasteRecords: WasteRecord[];

  // Money Associations
  associations: MoneyAssociation[];
  addAssociation: (assocData: Omit<MoneyAssociation, 'id'>) => MoneyAssociation;
  updateAssociation: (id: string, partial: Partial<MoneyAssociation>) => void;
  deleteAssociation: (id: string) => void;

  // Stocktaking Audits
  savedAudits: SavedAuditReport[];
  previouslyAuditedMap: Record<string, PreviousAuditInfo>;
  setPreviouslyAuditedMap: React.Dispatch<React.SetStateAction<Record<string, PreviousAuditInfo>>>;
  saveAuditReport: (report: SavedAuditReport) => void;
  deleteAuditReport: (auditId: string) => void;
  resetPreviouslyAuditedMap: () => void;



  // Safes & Accounts
  safes: SafeAccount[];
  safeTransfers: SafeTransfer[];
  addSafe: (safeData: Omit<SafeAccount, 'id'>) => SafeAccount;
  updateSafe: (id: string, partial: Partial<SafeAccount>) => void;
  deleteSafe: (id: string) => void;
  transferBetweenSafes: (fromSafeId: string, toSafeId: string, amount: number, notes?: string, by?: string) => { success: boolean; message: string };
  depositToSafe: (safeId: string, amount: number, title: string, notes?: string) => void;
  withdrawFromSafe: (safeId: string, amount: number, title: string, notes?: string) => void;

  // Assembly & Disassembly
  recipes: AssemblyRecipe[];
  assemblyOperations: AssemblyOperation[];
  executeAssembly: (recipeId: string, quantity: number, operatorName?: string, notes?: string) => { success: boolean; message: string };
  executeDisassembly: (recipeId: string, quantity: number, operatorName?: string, notes?: string) => { success: boolean; message: string };
  executeDirectDisassembly: (data: {
    voucherNumber: string;
    sourceProductId: string;
    sourceQty: number;
    sourceUnitCost: number;
    targetProductId: string;
    targetQty: number;
    targetUnitCost: number;
    targetSellingPrice?: number;
    notes?: string;
  }) => { success: boolean; message: string; op?: AssemblyOperation };
  addRecipe: (recipe: Omit<AssemblyRecipe, 'id' | 'createdAt'>) => void;
  updateRecipe: (id: string, recipe: Partial<AssemblyRecipe>) => void;
  deleteRecipe: (id: string) => void;

  // User Auth & Permissions
  currentUser: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  addUser: (userData: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, partial: Partial<User>) => void;
  deleteUser: (id: string) => void;
  hasPermission: (tabId: string) => boolean;
  permissionsMatrix: Record<UserRole, string[]>;
  updatePermissionsMatrix: (matrix: Record<UserRole, string[]>) => void;
  
  // Navigation & UI state
  activeTab: string;
  setActiveTab: (tab: string) => void;
  registerInvoiceGuard: (guard: ActiveInvoiceGuard | null) => void;
  requestInvoiceClearConfirm: () => void;
  pendingExitTab: string | null;
  activeInvoiceGuard: ActiveInvoiceGuard | null;
  confirmExitWithSave: () => void;
  confirmExitWithDiscard: () => void;
  cancelExitRequest: () => void;
  printInvoice: SalesInvoice | null;
  setPrintInvoice: (inv: SalesInvoice | null) => void;
  printMode: 'thermal' | 'a4';
  setPrintMode: (mode: 'thermal' | 'a4') => void;

  // Standalone Statement Page View State
  activeStatementTarget: { type: 'customer' | 'supplier' | 'safe'; id: string } | null;
  openStatement: (type: 'customer' | 'supplier' | 'safe', id: string) => void;
  closeStatement: () => void;

  // Actions - Products
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (id: string, delta: number, reason?: string) => void;

  // Actions - Customers
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Customer;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  collectCustomerDebt: (customerId: string, amount: number, notes?: string) => void;

  // Actions - Suppliers
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  paySupplier: (supplierId: string, amount: number, notes?: string) => void;

  // Actions - Sales
  createSalesInvoice: (invoiceData: {
    customerId: string;
    customerName: string;
    customerPhone?: string;
    items: InvoiceItem[];
    subtotal: number;
    discount: number;
    total: number;
    paidAmount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
    safeId?: string;
    date?: string;
  }) => SalesInvoice;
  cancelSalesInvoice: (id: string) => void;
  deleteSalesInvoice: (id: string) => void;

  // Actions - Purchases
  createPurchaseInvoice: (invoiceData: {
    supplierId: string;
    supplierName: string;
    items: {
      productId: string;
      productName: string;
      unit: string;
      unitPrice: number;
      quantity: number;
      total: number;
      batchNumber?: string;
      expiryDate?: string;
    }[];
    total: number;
    paidAmount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
    safeId?: string;
    date?: string;
  }) => PurchaseInvoice;
  updatePurchaseInvoice: (id: string, updatedData: Partial<PurchaseInvoice>) => void;
  deletePurchaseInvoice: (id: string) => void;

  // Actions - Returns
  salesReturns: SalesReturnInvoice[];
  purchaseReturns: PurchaseReturnInvoice[];
  createSalesReturn: (data: {
    originalInvoiceNumber?: string;
    customerId: string;
    customerName: string;
    items: InvoiceItem[];
    total: number;
    paidAmount?: number;
    remainingAmount?: number;
    refundMethod: PaymentMethod;
    notes?: string;
    safeId?: string;
    date?: string;
  }) => SalesReturnInvoice;
  deleteSalesReturn: (id: string) => void;
  createPurchaseReturn: (data: {
    originalInvoiceNumber?: string;
    supplierId: string;
    supplierName: string;
    items: PurchaseInvoiceItem[];
    total: number;
    paidAmount?: number;
    remainingAmount?: number;
    refundMethod: PaymentMethod;
    notes?: string;
    safeId?: string;
    date?: string;
  }) => PurchaseReturnInvoice;
  deletePurchaseReturn: (id: string) => void;

  // Actions - Expenses
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;

  // Actions - Finance & Cash
  addManualCashTransaction: (data: {
    title: string;
    amount: number;
    direction: 'in' | 'out';
    notes?: string;
  }) => void;
  updateTransaction: (id: string, updated: Partial<FinancialTransaction>) => void;
  deleteTransaction: (id: string) => void;

  // Actions - Settings & Data
  updateSettings: (settings: Partial<StoreSettings>) => void;
  resetToDefaultData: () => void;
  exportDatabaseJson: () => string;
  importDatabaseJson: (jsonString: string) => boolean;

  // Actions - Shifts & Waste
  openShift: (startingBalance: number, notes?: string, assignedUser?: { id: string; name: string }) => void;
  closeShift: (actualBalance: number, notes?: string) => void;
  logWaste: (productId: string, quantity: number, reason: WasteRecord['reason'], notes?: string) => void;

  // Computed metrics
  metrics: {
    totalSalesRevenue: number;
    totalSalesCost: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    cashBalance: number;
    customerDebts: number;
    supplierPayables: number;
    inventoryCostValue: number;
    inventoryRetailValue: number;
    lowStockCount: number;
    expiringSoonCount: number;
    expiredCount: number;
    todaySales: number;
  };
}

export interface ActiveInvoiceGuard {
  hasItems: boolean;
  itemCount: number;
  totalAmount: number;
  invoiceTitle: string;
  onSave: () => boolean | void;
  onDiscard: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Robust ID Generator to prevent collisions in high-speed loops (imports)
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Pure Server DB State (No LocalStorage)
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>(INITIAL_SALES_INVOICES);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>(INITIAL_PURCHASE_INVOICES);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(INITIAL_TRANSACTIONS);
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_SETTINGS);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Safes & Assembly State
  const [safes, setSafes] = useState<SafeAccount[]>(INITIAL_SAFES);
  const [safeTransfers, setSafeTransfers] = useState<SafeTransfer[]>([]);
  const [recipes, setRecipes] = useState<AssemblyRecipe[]>(INITIAL_RECIPES);
  const [assemblyOperations, setAssemblyOperations] = useState<AssemblyOperation[]>(INITIAL_ASSEMBLY_OPERATIONS);

  // Shifts, Waste & Returns State
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [wasteRecords, setWasteRecords] = useState<WasteRecord[]>([]);
  const [salesReturns, setSalesReturns] = useState<SalesReturnInvoice[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturnInvoice[]>([]);

  // Money Associations & Stocktaking Audits State
  const [associations, setAssociations] = useState<MoneyAssociation[]>(INITIAL_ASSOCIATIONS);
  const [savedAudits, setSavedAudits] = useState<SavedAuditReport[]>(INITIAL_SAVED_AUDITS);
  const [previouslyAuditedMap, setPreviouslyAuditedMap] = useState<Record<string, PreviousAuditInfo>>(INITIAL_PREVIOUSLY_AUDITED_MAP);

  // UI State
  const [activeTab, setActiveTabRaw] = useState<string>('dashboard');
  const [printInvoice, setPrintInvoice] = useState<SalesInvoice | null>(null);
  const [printMode, setPrintMode] = useState<'thermal' | 'a4'>('thermal');

  // Unsaved Invoice Exit Guard
  const invoiceGuardRef = React.useRef<ActiveInvoiceGuard | null>(null);
  const [pendingExitTab, setPendingExitTab] = useState<string | null>(null);
  const [activeInvoiceGuard, setActiveInvoiceGuard] = useState<ActiveInvoiceGuard | null>(null);

  const registerInvoiceGuard = React.useCallback((guard: ActiveInvoiceGuard | null) => {
    invoiceGuardRef.current = guard;
    if (!guard || !guard.hasItems) {
      setActiveInvoiceGuard(null);
    }
  }, []);

  const setActiveTab = React.useCallback((targetTab: string) => {
    if (targetTab === activeTab) return;
    const guard = invoiceGuardRef.current;
    if (guard && guard.hasItems) {
      setActiveInvoiceGuard(guard);
      setPendingExitTab(targetTab);
      return;
    }
    setActiveTabRaw(targetTab);
  }, [activeTab]);

  const requestInvoiceClearConfirm = React.useCallback(() => {
    const guard = invoiceGuardRef.current;
    if (guard && guard.hasItems) {
      setActiveInvoiceGuard(guard);
      setPendingExitTab('__CLEAR_CURRENT__');
    }
  }, []);

  const confirmExitWithSave = React.useCallback(() => {
    const guard = invoiceGuardRef.current || activeInvoiceGuard;
    const target = pendingExitTab;
    if (guard) {
      const res = guard.onSave();
      if (res === false) {
        // Validation failed (e.g., walk-in customer credit not allowed), close exit modal so user sees error notice
        setPendingExitTab(null);
        return;
      }
    }
    invoiceGuardRef.current = null;
    setActiveInvoiceGuard(null);
    setPendingExitTab(null);
    if (target && target !== '__CLEAR_CURRENT__') {
      setActiveTabRaw(target);
    }
  }, [activeInvoiceGuard, pendingExitTab]);

  const confirmExitWithDiscard = React.useCallback(() => {
    const guard = invoiceGuardRef.current || activeInvoiceGuard;
    const target = pendingExitTab;
    if (guard) {
      guard.onDiscard();
    }
    invoiceGuardRef.current = null;
    setActiveInvoiceGuard(null);
    setPendingExitTab(null);
    if (target && target !== '__CLEAR_CURRENT__') {
      setActiveTabRaw(target);
    }
  }, [activeInvoiceGuard, pendingExitTab]);

  const cancelExitRequest = React.useCallback(() => {
    setPendingExitTab(null);
    setActiveInvoiceGuard(null);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (invoiceGuardRef.current && invoiceGuardRef.current.hasItems) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Standalone Statement Page View State
  const [activeStatementTarget, setActiveStatementTarget] = useState<{
    type: 'customer' | 'supplier' | 'safe';
    id: string;
  } | null>(null);

  const openStatement = (type: 'customer' | 'supplier' | 'safe', id: string) => {
    setActiveStatementTarget({ type, id });
  };

  const closeStatement = () => {
    setActiveStatementTarget(null);
  };

  const isDbLoadedRef = React.useRef(false);
  const skipNextSyncRef = React.useRef(false);

  // Fetch initial state from server database (Node DB or XAMPP PHP MySQL)
  useEffect(() => {
    const fetchServerData = async () => {
      let data: any = null;
      try {
        const cacheBuster = `t=${Date.now()}`;

        // 1. Try PHP get_all.php first (for XAMPP/Apache deployments)
        const phpUrls = [`./api/get_all.php?${cacheBuster}`, `/api/get_all.php?${cacheBuster}`];
        for (const url of phpUrls) {
          try {
            const resPhp = await fetch(url, { cache: 'no-store' });
            if (resPhp.ok) {
              const text = await resPhp.text();
              if (text.trim().startsWith('{')) {
                const resultPhp = JSON.parse(text);
                if (resultPhp && resultPhp.success && resultPhp.data) {
                  data = resultPhp.data;
                  break;
                }
              }
            }
          } catch {}
        }

        // 2. Fallback to Express /api/database
        if (!data) {
          try {
            const res = await fetch(`/api/database?${cacheBuster}`, { cache: 'no-store' });
            const contentType = res.headers.get('content-type') || '';
            if (res.ok && contentType.includes('application/json')) {
              const result = await res.json();
              if (result && result.success && result.data) {
                data = result.data;
              }
            }
          } catch {}
        }

        if (data) {
          skipNextSyncRef.current = true;

          const hasWalkInInDb =
            Array.isArray(data.customers) &&
            data.customers.some((c: any) => c && c.id === 'walk-in' && c.name === 'عميل نقدي عام');
          const ensuredCustomers = ensurePermanentWalkInCustomer(
            Array.isArray(data.customers) ? data.customers : []
          );

          if (!hasWalkInInDb) {
            apiCall('customers.php', 'POST', WALK_IN_CUSTOMER);
          }

          // Populate products state (if database has products, use them; if empty array on fresh setup, fallback to INITIAL_PRODUCTS)
          if (Array.isArray(data.products) && data.products.length > 0) {
            setProducts(data.products);
          } else if (!data.products || (Array.isArray(data.products) && data.products.length === 0)) {
            // Keep initial seed products if database product table is currently empty
            setProducts(INITIAL_PRODUCTS);
          }

          setCustomers(ensuredCustomers);
          if (Array.isArray(data.suppliers) && data.suppliers.length > 0) setSuppliers(data.suppliers);
          if (Array.isArray(data.salesInvoices)) setSalesInvoices(data.salesInvoices);
          if (Array.isArray(data.purchaseInvoices)) setPurchaseInvoices(data.purchaseInvoices);
          if (Array.isArray(data.salesReturns)) setSalesReturns(data.salesReturns);
          if (Array.isArray(data.purchaseReturns)) setPurchaseReturns(data.purchaseReturns);
          if (Array.isArray(data.expenses)) setExpenses(data.expenses);
          if (Array.isArray(data.transactions)) setTransactions(data.transactions);

          if (Array.isArray(data.shifts)) {
            setShifts(data.shifts);
            const openS = data.shifts.find((s: any) => s.status === 'open') || null;
            setActiveShift(openS);
          }
          if (Array.isArray(data.wasteRecords)) setWasteRecords(data.wasteRecords);
          if (Array.isArray(data.safes) && data.safes.length > 0) {
            setSafes(data.safes);
          }
          if (Array.isArray(data.safeTransfers)) setSafeTransfers(data.safeTransfers);
          if (Array.isArray(data.recipes)) setRecipes(data.recipes);
          if (Array.isArray(data.assemblyOperations)) setAssemblyOperations(data.assemblyOperations);
          if (Array.isArray(data.associations)) setAssociations(data.associations);
          if (Array.isArray(data.savedAudits)) setSavedAudits(data.savedAudits);
          if (data.previouslyAuditedMap && typeof data.previouslyAuditedMap === 'object') {
            setPreviouslyAuditedMap(data.previouslyAuditedMap);
          }
          if (data.settings && data.settings.storeName) {
            setSettings(data.settings);
          }

          if (Array.isArray(data.users) && data.users.length > 0) {
            setUsers(data.users);
          } else {
            setUsers(INITIAL_USERS);
          }
        }
      } catch (err) {
        console.warn('Notice: Server database load error, using initial defaults:', err);
      } finally {
        // Wait 600ms for all React state updates to take effect before enabling auto-sync
        setTimeout(() => {
          isDbLoadedRef.current = true;
        }, 600);
      }
    };

    fetchServerData();
  }, []);

  // Sync state changes directly to persistent server database JSON AND XAMPP MySQL (debounced & mirrorDelete enabled)
  useEffect(() => {
    if (!isDbLoadedRef.current) return;
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const payload = {
        mirrorDelete: true,
        products,
        customers,
        suppliers,
        salesInvoices,
        purchaseInvoices,
        salesReturns,
        purchaseReturns,
        expenses,
        transactions,
        settings,
        users,
        safes,
        safeTransfers,
        recipes,
        assemblyOperations,
        associations,
        savedAudits,
        previouslyAuditedMap,
        shifts,
        wasteRecords,
      };

      // 1. Sync to Node Express server_database.json
      try {
        fetch('/api/database/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: payload }),
        }).catch(() => {});
      } catch {}

      // 2. Sync directly to XAMPP MySQL via sync_push.php
      try {
        fetch('./api/sync_push.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {});
      } catch {}
    }, 150);

    return () => clearTimeout(timer);
  }, [
    products,
    customers,
    suppliers,
    salesInvoices,
    purchaseInvoices,
    salesReturns,
    purchaseReturns,
    expenses,
    transactions,
    settings,
    users,
    safes,
    safeTransfers,
    recipes,
    assemblyOperations,
    associations,
    savedAudits,
    previouslyAuditedMap,
    shifts,
    wasteRecords,
  ]);

  // Helper for Server Database API Calls (supports both Node and PHP paths)
  const apiCall = async (endpoint: string, method: 'POST' | 'PUT' | 'DELETE', body?: any) => {
    try {
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
      const urls = [
        `./api/${cleanEndpoint}`,
        `/api/${cleanEndpoint}`
      ];
      for (const url of urls) {
        try {
          const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
          });
          if (res.ok) break;
        } catch {}
      }
    } catch (e) {
      console.warn(`API call ${endpoint} error:`, e);
    }
  };


  // Product Actions
  const addProduct = (productData: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...productData,
      id: generateId('prod'),
    };
    setProducts(prev => [newProduct, ...prev]);
    apiCall('products.php', 'POST', newProduct);
  };

  const updateProduct = (id: string, partial: Partial<Product>) => {
    setProducts(prev => {
      const updated = prev.map(p => (p.id === id ? { ...p, ...partial } : p));
      const target = updated.find(p => p.id === id);
      if (target) {
        apiCall('products.php', 'PUT', target);
      }
      return updated;
    });
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    apiCall(`products.php?id=${encodeURIComponent(id)}`, 'DELETE');
  };

  const adjustStock = (id: string, delta: number) => {
    setProducts(prev => {
      const updated = prev.map(p => (p.id === id ? { ...p, quantity: Math.max(0, p.quantity + delta) } : p));
      const target = updated.find(p => p.id === id);
      if (target) {
        apiCall('products.php', 'PUT', target);
      }
      return updated;
    });
  };

  // Customer Actions
  const addCustomer = (customerData: Omit<Customer, 'id' | 'createdAt'>): Customer => {
    if (isWalkInCustomer(customerData)) {
      return WALK_IN_CUSTOMER;
    }
    const newCustomer: Customer = {
      ...customerData,
      id: generateId('cust'),
      createdAt: new Date().toISOString(),
    };
    setCustomers(prev => ensurePermanentWalkInCustomer([newCustomer, ...prev]));
    apiCall('customers.php', 'POST', newCustomer);
    return newCustomer;
  };

  const updateCustomer = (id: string, partial: Partial<Customer>) => {
    // حساب عميل نقدي عام حساب دائم ومحمي من التعديل نهائياً
    if (isWalkInCustomer(id)) {
      return;
    }
    setCustomers(prev => {
      const updated = ensurePermanentWalkInCustomer(
        prev.map(c => (c.id === id ? { ...c, ...partial } : c))
      );
      const target = updated.find(c => c.id === id);
      if (target) {
        apiCall('customers.php', 'PUT', target);
      }
      return updated;
    });
  };

  const deleteCustomer = (id: string) => {
    // حساب عميل نقدي عام حساب دائم ومحمي من الحذف نهائياً
    if (isWalkInCustomer(id)) {
      return;
    }
    setCustomers(prev => ensurePermanentWalkInCustomer(prev.filter(c => c.id !== id)));
    apiCall(`customers.php?id=${encodeURIComponent(id)}`, 'DELETE');
  };

  const collectCustomerDebt = (customerId: string, amount: number, notes?: string) => {
    if (isWalkInCustomer(customerId)) return;
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    // Deduct debt
    const newBal = Math.max(0, customer.currentBalance - amount);
    updateCustomer(customerId, { currentBalance: newBal });

    // Add to cash transactions
    const newTx: FinancialTransaction = {
      id: `tx-${Date.now()}`,
      type: 'debt_collection',
      title: `سند تحصيل نقدية من المزارع: ${customer.name}`,
      amount: amount,
      direction: 'in',
      date: new Date().toISOString(),
      referenceId: customerId,
      notes: notes || 'سداد دفعة من الحساب الآجل',
    };
    setTransactions(prev => [newTx, ...prev]);
    apiCall('transactions.php', 'POST', newTx);

    // Update active shift drawer expected balance
    if (activeShift) {
      setActiveShift(prev => {
        if (!prev) return null;
        const otherIncomes = prev.otherIncomes + amount;
        const expectedBalance = prev.expectedBalance + amount;
        const updated = { ...prev, otherIncomes, expectedBalance };
        apiCall('shifts.php', 'PUT', updated);
        return updated;
      });
    }
  };

  // Supplier Actions
  const addSupplier = (supplierData: Omit<Supplier, 'id' | 'createdAt'>) => {
    const initBal = supplierData.initialBalance !== undefined ? supplierData.initialBalance : supplierData.currentBalance;
    const newSupplier: Supplier = {
      ...supplierData,
      initialBalance: initBal,
      currentBalance: supplierData.currentBalance !== undefined ? supplierData.currentBalance : initBal,
      id: generateId('supp'),
      createdAt: new Date().toISOString(),
    };
    setSuppliers(prev => [newSupplier, ...prev]);
    apiCall('suppliers.php', 'POST', newSupplier);
  };

  const updateSupplier = (id: string, partial: Partial<Supplier>) => {
    setSuppliers(prev => {
      const updated = prev.map(s => (s.id === id ? { ...s, ...partial } : s));
      const target = updated.find(s => s.id === id);
      if (target) {
        apiCall('suppliers.php', 'PUT', target);
      }
      return updated;
    });
  };

  const deleteSupplier = (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
    apiCall(`suppliers.php?id=${encodeURIComponent(id)}`, 'DELETE');
  };

  const paySupplier = (supplierId: string, amount: number, notes?: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    // Deduct payable balance
    const newBal = Math.max(0, supplier.currentBalance - amount);
    updateSupplier(supplierId, { currentBalance: newBal });

    // Deduct cash from register
    const newTx: FinancialTransaction = {
      id: `tx-${Date.now()}`,
      type: 'supplier_payment',
      title: `سند صرف دفعة للمورد: ${supplier.name}`,
      amount: amount,
      direction: 'out',
      date: new Date().toISOString(),
      referenceId: supplierId,
      notes: notes || 'سداد مستحقات توريد بضاعة',
    };
    setTransactions(prev => [newTx, ...prev]);
    apiCall('transactions.php', 'POST', newTx);

    // Deduct from active shift drawer expected balance
    if (activeShift) {
      setActiveShift(prev => {
        if (!prev) return null;
        const otherExpenses = prev.otherExpenses + amount;
        const expectedBalance = Math.max(0, prev.expectedBalance - amount);
        const updated = { ...prev, otherExpenses, expectedBalance };
        apiCall('shifts.php', 'PUT', updated);
        return updated;
      });
    }
  };

  // Create Sales Invoice
  const createSalesInvoice = (data: {
    customerId: string;
    customerName: string;
    customerPhone?: string;
    items: InvoiceItem[];
    subtotal: number;
    discount: number;
    total: number;
    paidAmount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
    safeId?: string;
    date?: string;
  }): SalesInvoice => {
    const isWalkIn = !data.customerId || isWalkInCustomer(data.customerId);
    // حساب عميل نقدي عام لا يسمح له بفواتير آجل نهائياً
    const safePaymentMethod: PaymentMethod =
      isWalkIn && data.paymentMethod === 'credit' ? 'cash' : data.paymentMethod;
    const safePaidAmount = isWalkIn ? data.total : data.paidAmount;
    const remainingAmount = isWalkIn ? 0 : Math.max(0, data.total - safePaidAmount);
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const targetSafeId = data.safeId || 'safe-pos';
    const effectiveDate = data.date || new Date().toISOString();

    const newInvoice: SalesInvoice = {
      id: generateId('inv'),
      invoiceNumber,
      date: effectiveDate,
      customerId: isWalkIn ? 'walk-in' : data.customerId,
      customerName: isWalkIn ? 'عميل نقدي عام' : data.customerName,
      customerPhone: data.customerPhone,
      items: data.items,
      subtotal: data.subtotal,
      discount: data.discount,
      total: data.total,
      paidAmount: safePaidAmount,
      remainingAmount,
      paymentMethod: safePaymentMethod,
      safeId: targetSafeId,
      notes: data.notes,
      status: 'completed',
    };

    // 1. Deduct Stock
    setProducts(prev => {
      const stockMap = new Map(data.items.map(i => [i.productId, i.quantity]));
      return prev.map(p => {
        if (stockMap.has(p.id)) {
          const qtyToDeduct = stockMap.get(p.id)!;
          return { ...p, quantity: Math.max(0, p.quantity - qtyToDeduct) };
        }
        return p;
      });
    });

    // 2. If there's remaining debt and it's a registered customer (never walk-in), update customer balance
    if (remainingAmount > 0 && !isWalkIn && data.customerId) {
      setCustomers(prev =>
        prev.map(c =>
          c.id === data.customerId ? { ...c, currentBalance: c.currentBalance + remainingAmount } : c
        )
      );
    }

    // 3. Record Cash Inflow for paid amount & update selected safe balance
    if (safePaidAmount > 0) {
      setSafes(prev =>
        prev.map(s => (s.id === targetSafeId ? { ...s, balance: s.balance + safePaidAmount } : s))
      );

      const targetSafe = safes.find(s => s.id === targetSafeId);
      const newTx: FinancialTransaction = {
        id: generateId('tx'),
        type: 'sale_income',
        title: `تحصيل مبيعات فاتورة ${invoiceNumber} (${data.customerName}) - [${targetSafe?.name || 'الخزينة'}]`,
        amount: data.paidAmount,
        direction: 'in',
        date: new Date().toISOString(),
        safeId: targetSafeId,
        referenceId: newInvoice.id,
        notes: `طريقة الدفع: ${data.paymentMethod === 'cash' ? 'نقدي' : data.paymentMethod === 'credit' ? 'آجل جزئي' : 'تحويل'}`,
      };
      setTransactions(prev => [newTx, ...prev]);
      apiCall('transactions.php', 'POST', newTx);

      // Add to active shift cash drawer
      if (activeShift && data.paymentMethod === 'cash') {
        setActiveShift(prev => {
          if (!prev) return null;
          const salesRevenue = prev.salesRevenue + data.paidAmount;
          const expectedBalance = prev.expectedBalance + data.paidAmount;
          const updated = { ...prev, salesRevenue, expectedBalance };
          apiCall('shifts.php', 'PUT', updated);
          return updated;
        });
      }
    }

    // 4. Save Invoice
    setSalesInvoices(prev => [newInvoice, ...prev]);
    apiCall('sales.php', 'POST', newInvoice);

    return newInvoice;
  };

  const cancelSalesInvoice = (invoiceId: string) => {
    const inv = salesInvoices.find(i => i.id === invoiceId);
    if (!inv || inv.status === 'cancelled') return;

    // Return stock
    setProducts(prev => {
      const stockMap = new Map(inv.items.map(i => [i.productId, i.quantity]));
      return prev.map(p => {
        if (stockMap.has(p.id)) {
          return { ...p, quantity: p.quantity + stockMap.get(p.id)! };
        }
        return p;
      });
    });

    // Adjust customer balance if debt was added
    if (inv.remainingAmount > 0 && inv.customerId && inv.customerId !== 'walk-in') {
      setCustomers(prev =>
        prev.map(c =>
          c.id === inv.customerId
            ? { ...c, currentBalance: Math.max(0, c.currentBalance - inv.remainingAmount) }
            : c
        )
      );
    }

    // Mark invoice cancelled
    setSalesInvoices(prev =>
      prev.map(i => (i.id === invoiceId ? { ...i, status: 'cancelled' } : i))
    );

    // Reverse cash if paid
    if (inv.paidAmount > 0) {
      const targetSafeId = inv.safeId || 'safe-pos';
      setSafes(prev =>
        prev.map(s => (s.id === targetSafeId ? { ...s, balance: Math.max(0, s.balance - inv.paidAmount) } : s))
      );

      const reverseTx: FinancialTransaction = {
        id: generateId('tx'),
        type: 'general_expense',
        title: `مرتجع وإلغاء فاتورة بيع ${inv.invoiceNumber}`,
        amount: inv.paidAmount,
        direction: 'out',
        date: new Date().toISOString(),
        safeId: targetSafeId,
        referenceId: inv.id,
        notes: 'إرجاع القيمة للعميل واسترداد البضاعة إلى المخزن',
      };
      setTransactions(prev => [reverseTx, ...prev]);
      apiCall('transactions.php', 'POST', reverseTx);
    }

    apiCall(`sales.php?id=${encodeURIComponent(invoiceId)}`, 'DELETE');
  };

  const deleteSalesInvoice = (invoiceId: string) => {
    const inv = salesInvoices.find(i => i.id === invoiceId);
    if (!inv) return;

    if (inv.status !== 'cancelled') {
      // 1. Return sold quantities back to inventory stock
      if (Array.isArray(inv.items) && inv.items.length > 0) {
        setProducts(prev => {
          const stockMap = new Map(inv.items.map(i => [i.productId, i.quantity]));
          return prev.map(p =>
            stockMap.has(p.id) ? { ...p, quantity: p.quantity + (stockMap.get(p.id) || 0) } : p
          );
        });
      }

      // 2. Adjust customer balance if debt was recorded
      if (inv.remainingAmount > 0 && inv.customerId && inv.customerId !== 'walk-in') {
        setCustomers(prev =>
          prev.map(c =>
            c.id === inv.customerId
              ? { ...c, currentBalance: Math.max(0, c.currentBalance - inv.remainingAmount) }
              : c
          )
        );
      }

      // 3. Reverse paid amount from safe balance
      if (inv.paidAmount > 0) {
        const targetSafeId = inv.safeId || 'safe-pos';
        setSafes(prev =>
          prev.map(s =>
            s.id === targetSafeId ? { ...s, balance: Math.max(0, s.balance - inv.paidAmount) } : s
          )
        );
      }
    }

    // Remove associated transaction and sales invoice
    setTransactions(prev => prev.filter(t => t.referenceId !== invoiceId));
    setSalesInvoices(prev => prev.filter(i => i.id !== invoiceId));
    apiCall(`sales.php?id=${encodeURIComponent(invoiceId)}`, 'DELETE');
  };

  // Create Purchase Invoice
  const createPurchaseInvoice = (data: {
    supplierId: string;
    supplierName: string;
    items: {
      productId: string;
      productName: string;
      unit: string;
      unitPrice: number;
      quantity: number;
      total: number;
      batchNumber?: string;
      expiryDate?: string;
    }[];
    total: number;
    paidAmount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
    safeId?: string;
    date?: string;
  }): PurchaseInvoice => {
    const remainingAmount = Math.max(0, data.total - data.paidAmount);
    const invoiceNumber = `PUR-${Date.now().toString().slice(-6)}`;
    const targetSafeId = data.safeId || 'safe-main';
    const effectiveDate = data.date || new Date().toISOString();

    const newInvoice: PurchaseInvoice = {
      id: generateId('pur'),
      invoiceNumber,
      date: effectiveDate,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      items: data.items,
      total: data.total,
      paidAmount: data.paidAmount,
      remainingAmount,
      paymentMethod: data.paymentMethod,
      safeId: targetSafeId,
      notes: data.notes,
    };

    // 1. Add Stock & update purchase cost / expiry if provided
    setProducts(prev => {
      const itemsMap = new Map(data.items.map(i => [i.productId, i]));
      return prev.map(p => {
        if (itemsMap.has(p.id)) {
          const item = itemsMap.get(p.id)!;
          return {
            ...p,
            quantity: p.quantity + item.quantity,
            purchasePrice: item.unitPrice,
            batchNumber: item.batchNumber || p.batchNumber,
            expiryDate: item.expiryDate || p.expiryDate,
          };
        }
        return p;
      });
    });

    // 2. Update Supplier Balance if credit remaining
    if (remainingAmount > 0 && data.supplierId) {
      setSuppliers(prev =>
        prev.map(s =>
          s.id === data.supplierId ? { ...s, currentBalance: s.currentBalance + remainingAmount } : s
        )
      );
    }

    // 3. Deduct Cash Outflow for paid amount from selected safe
    if (data.paidAmount > 0) {
      setSafes(prev =>
        prev.map(s => (s.id === targetSafeId ? { ...s, balance: Math.max(0, s.balance - data.paidAmount) } : s))
      );

      const targetSafe = safes.find(s => s.id === targetSafeId);
      const newTx: FinancialTransaction = {
        id: generateId('tx'),
        type: 'purchase_expense',
        title: `سداد فاتورة مشتريات بضاعة ${invoiceNumber} (${data.supplierName}) - [${targetSafe?.name || 'الخزينة'}]`,
        amount: data.paidAmount,
        direction: 'out',
        date: new Date().toISOString(),
        safeId: targetSafeId,
        referenceId: newInvoice.id,
        notes: `سداد لمشتريات المخزن`,
      };
      setTransactions(prev => [newTx, ...prev]);
      apiCall('transactions.php', 'POST', newTx);
    }

    setPurchaseInvoices(prev => [newInvoice, ...prev]);
    apiCall('purchases.php', 'POST', newInvoice);

    return newInvoice;
  };

  const updatePurchaseInvoice = (id: string, updatedData: Partial<PurchaseInvoice>) => {
    setPurchaseInvoices(prev =>
      prev.map(p => {
        if (p.id === id) {
          const total = updatedData.total !== undefined ? updatedData.total : p.total;
          const paidAmount = updatedData.paidAmount !== undefined ? updatedData.paidAmount : p.paidAmount;
          const remainingAmount = Math.max(0, total - paidAmount);
          return {
            ...p,
            ...updatedData,
            remainingAmount,
          };
        }
        return p;
      })
    );
  };

  const deletePurchaseInvoice = (invoiceId: string) => {
    const inv = purchaseInvoices.find(p => p.id === invoiceId);
    if (!inv) return;

    // 1. Deduct purchased items from stock
    if (Array.isArray(inv.items) && inv.items.length > 0) {
      setProducts(prev => {
        const stockMap = new Map(inv.items.map(i => [i.productId, i.quantity]));
        return prev.map(p =>
          stockMap.has(p.id)
            ? { ...p, quantity: Math.max(0, p.quantity - (stockMap.get(p.id) || 0)) }
            : p
        );
      });
    }

    // 2. Deduct supplier balance if remaining debt was added
    if (inv.remainingAmount > 0 && inv.supplierId) {
      setSuppliers(prev =>
        prev.map(s =>
          s.id === inv.supplierId
            ? { ...s, currentBalance: Math.max(0, s.currentBalance - inv.remainingAmount) }
            : s
        )
      );
    }

    // 3. Return paid amount to safe balance
    if (inv.paidAmount > 0) {
      const targetSafeId = inv.safeId || 'safe-main';
      setSafes(prev =>
        prev.map(s => (s.id === targetSafeId ? { ...s, balance: s.balance + inv.paidAmount } : s))
      );
    }

    setTransactions(prev => prev.filter(t => t.referenceId !== invoiceId));
    setPurchaseInvoices(prev => prev.filter(p => p.id !== invoiceId));
    apiCall(`purchases.php?id=${encodeURIComponent(invoiceId)}`, 'DELETE');
  };

  // Return Actions
  const createSalesReturn = (data: {
    originalInvoiceNumber?: string;
    customerId: string;
    customerName: string;
    items: InvoiceItem[];
    total: number;
    paidAmount?: number;
    remainingAmount?: number;
    refundMethod: PaymentMethod;
    notes?: string;
    safeId?: string;
    date?: string;
  }): SalesReturnInvoice => {
    const returnNumber = `SRET-${Date.now().toString().slice(-6)}`;
    const targetSafeId = data.safeId || 'safe-pos';
    const effectiveDate = data.date || new Date().toISOString();
    const actualPaid = data.paidAmount !== undefined
      ? Math.max(0, data.paidAmount)
      : (data.refundMethod === 'credit' ? 0 : data.total);
    const debtDeduction = data.remainingAmount !== undefined
      ? Math.max(0, data.remainingAmount)
      : Math.max(0, data.total - actualPaid);

    const newReturn: SalesReturnInvoice = {
      id: generateId('sret'),
      returnNumber,
      originalInvoiceNumber: data.originalInvoiceNumber,
      date: effectiveDate,
      customerId: data.customerId,
      customerName: data.customerName,
      items: data.items,
      total: data.total,
      paidAmount: actualPaid,
      remainingAmount: debtDeduction,
      refundMethod: data.refundMethod,
      safeId: targetSafeId,
      notes: data.notes,
    };

    // 1. Return stock to inventory (increase quantity)
    setProducts(prev => {
      const itemsMap = new Map(data.items.map(i => [i.productId, i.quantity]));
      return prev.map(p => {
        if (itemsMap.has(p.id)) {
          return { ...p, quantity: p.quantity + itemsMap.get(p.id)! };
        }
        return p;
      });
    });

    // 2. Adjust customer balance (deduct the debt deduction portion)
    if (data.customerId && data.customerId !== 'walk-in' && debtDeduction > 0) {
      setCustomers(prev =>
        prev.map(c =>
          c.id === data.customerId
            ? { ...c, currentBalance: Math.max(0, c.currentBalance - debtDeduction) }
            : c
        )
      );
    }

    // 3. Record cash transaction out if refunded cash and update safe balance
    if (actualPaid > 0) {
      setSafes(prev =>
        prev.map(s => (s.id === targetSafeId ? { ...s, balance: Math.max(0, s.balance - actualPaid) } : s))
      );

      const targetSafe = safes.find(s => s.id === targetSafeId);
      const newTx: FinancialTransaction = {
        id: generateId('tx'),
        type: 'general_expense',
        title: `مرتجع مبيعات (${returnNumber}) للعميل ${data.customerName} - [${targetSafe?.name || 'الخزينة'}]`,
        amount: actualPaid,
        direction: 'out',
        date: new Date().toISOString(),
        safeId: targetSafeId,
        referenceId: newReturn.id,
        notes: data.notes || 'استرداد بضاعة ورد قيمتها للعميل',
      };
      setTransactions(prev => [newTx, ...prev]);
      apiCall('transactions.php', 'POST', newTx);
    }

    setSalesReturns(prev => [newReturn, ...prev]);
    apiCall('sales_returns.php', 'POST', newReturn);
    return newReturn;
  };

  const deleteSalesReturn = (id: string) => {
    setSalesReturns(prev => prev.filter(r => r.id !== id));
    apiCall(`sales_returns.php?id=${encodeURIComponent(id)}`, 'DELETE');
  };

  const createPurchaseReturn = (data: {
    originalInvoiceNumber?: string;
    supplierId: string;
    supplierName: string;
    items: PurchaseInvoiceItem[];
    total: number;
    paidAmount?: number;
    remainingAmount?: number;
    refundMethod: PaymentMethod;
    notes?: string;
    safeId?: string;
    date?: string;
  }): PurchaseReturnInvoice => {
    const returnNumber = `PRET-${Date.now().toString().slice(-6)}`;
    const targetSafeId = data.safeId || 'safe-main';
    const effectiveDate = data.date || new Date().toISOString();
    const actualReceived = data.paidAmount !== undefined
      ? Math.max(0, data.paidAmount)
      : (data.refundMethod === 'credit' ? 0 : data.total);
    const debtDeduction = data.remainingAmount !== undefined
      ? Math.max(0, data.remainingAmount)
      : Math.max(0, data.total - actualReceived);

    const newReturn: PurchaseReturnInvoice = {
      id: generateId('pret'),
      returnNumber,
      originalInvoiceNumber: data.originalInvoiceNumber,
      date: effectiveDate,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      items: data.items,
      total: data.total,
      paidAmount: actualReceived,
      remainingAmount: debtDeduction,
      refundMethod: data.refundMethod,
      safeId: targetSafeId,
      notes: data.notes,
    };

    // 1. Deduct stock from inventory
    setProducts(prev => {
      const itemsMap = new Map(data.items.map(i => [i.productId, i.quantity]));
      return prev.map(p => {
        if (itemsMap.has(p.id)) {
          return { ...p, quantity: Math.max(0, p.quantity - itemsMap.get(p.id)!) };
        }
        return p;
      });
    });

    // 2. Adjust supplier balance (reduce payable debt)
    if (data.supplierId && debtDeduction > 0) {
      setSuppliers(prev =>
        prev.map(s =>
          s.id === data.supplierId
            ? { ...s, currentBalance: Math.max(0, s.currentBalance - debtDeduction) }
            : s
        )
      );
    }

    // 3. Record cash transaction in if refunded cash and update safe balance
    if (actualReceived > 0) {
      setSafes(prev =>
        prev.map(s => (s.id === targetSafeId ? { ...s, balance: s.balance + actualReceived } : s))
      );

      const targetSafe = safes.find(s => s.id === targetSafeId);
      const newTx: FinancialTransaction = {
        id: generateId('tx'),
        type: 'sale_income',
        title: `مرتجع مشتريات (${returnNumber}) من المورد ${data.supplierName} - [${targetSafe?.name || 'الخزينة'}]`,
        amount: actualReceived,
        direction: 'in',
        date: new Date().toISOString(),
        safeId: targetSafeId,
        referenceId: newReturn.id,
        notes: data.notes || 'استرداد قيمة بضاعة مرتجعة للمورد',
      };
      setTransactions(prev => [newTx, ...prev]);
      apiCall('transactions.php', 'POST', newTx);
    }

    setPurchaseReturns(prev => [newReturn, ...prev]);
    apiCall('purchase_returns.php', 'POST', newReturn);
    return newReturn;
  };

  const deletePurchaseReturn = (id: string) => {
    setPurchaseReturns(prev => prev.filter(r => r.id !== id));
    apiCall(`purchase_returns.php?id=${encodeURIComponent(id)}`, 'DELETE');
  };



  // Expense Actions
  const addExpense = (expenseData: Omit<Expense, 'id'>) => {
    const targetSafeId =
      expenseData.safeId ||
      safes.find(s => s.isDefault)?.id ||
      safes[0]?.id ||
      'safe-main';
    const targetSafe = safes.find(s => s.id === targetSafeId);

    const newExpense: Expense = {
      ...expenseData,
      id: generateId('exp'),
      safeId: targetSafeId,
    };
    setExpenses(prev => [newExpense, ...prev]);
    apiCall('expenses.php', 'POST', newExpense);

    // Deduct from selected safe balance
    setSafes(prev =>
      prev.map(s => {
        if (s.id === targetSafeId) {
          const updatedSafe = {
            ...s,
            balance: Math.max(0, s.balance - expenseData.amount),
            updatedAt: new Date().toISOString(),
          };
          apiCall('safes.php', 'PUT', updatedSafe);
          return updatedSafe;
        }
        return s;
      })
    );

    // Financial transaction out
    const newTx: FinancialTransaction = {
      id: generateId('tx'),
      type: 'general_expense',
      title: `مصروف تشغيلي: ${expenseData.title}${expenseData.recipient ? ` (${expenseData.recipient})` : ''}`,
      amount: expenseData.amount,
      direction: 'out',
      date: expenseData.date || new Date().toISOString(),
      safeId: targetSafeId,
      referenceId: newExpense.id,
      partyType: 'general',
      partyName: expenseData.recipient || targetSafe?.name || 'مصروفات عامة',
      notes: expenseData.notes,
    };
    setTransactions(prev => [newTx, ...prev]);
    apiCall('transactions.php', 'POST', newTx);

    // Deduct from active shift drawer expected balance if paid from POS drawer or default cash safe
    if (activeShift) {
      setActiveShift(prev => {
        if (!prev) return null;
        const otherExpenses = prev.otherExpenses + expenseData.amount;
        const expectedBalance = Math.max(0, prev.expectedBalance - expenseData.amount);
        const updated = { ...prev, otherExpenses, expectedBalance };
        apiCall('shifts.php', 'PUT', updated);
        return updated;
      });
    }
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    apiCall(`expenses.php?id=${encodeURIComponent(id)}`, 'DELETE');
  };

  const addManualCashTransaction = (data: {
    title: string;
    amount: number;
    direction: 'in' | 'out';
    notes?: string;
  }) => {
    const newTx: FinancialTransaction = {
      id: generateId('tx'),
      type: data.direction === 'in' ? 'capital_deposit' : 'general_expense',
      title: data.title,
      amount: data.amount,
      direction: data.direction,
      date: new Date().toISOString(),
      notes: data.notes,
    };
    setTransactions(prev => [newTx, ...prev]);
    apiCall('transactions.php', 'POST', newTx);

    // Update active shift drawer expected balance based on direction
    if (activeShift) {
      setActiveShift(prev => {
        if (!prev) return null;
        let otherIncomes = prev.otherIncomes;
        let otherExpenses = prev.otherExpenses;
        let expectedBalance = prev.expectedBalance;

        if (data.direction === 'in') {
          otherIncomes += data.amount;
          expectedBalance += data.amount;
        } else {
          otherExpenses += data.amount;
          expectedBalance = Math.max(0, expectedBalance - data.amount);
        }

        const updated = { ...prev, otherIncomes, otherExpenses, expectedBalance };
        apiCall('shifts.php', 'PUT', updated);
        return updated;
      });
    }
  };

  const updateTransaction = (id: string, updatedData: Partial<FinancialTransaction>) => {
    setTransactions(prev => {
      const oldTx = prev.find(t => t.id === id);
      if (!oldTx) return prev;

      const newTx = { ...oldTx, ...updatedData };

      if (updatedData.amount !== undefined && updatedData.amount !== oldTx.amount) {
        const diff = updatedData.amount - oldTx.amount;
        if (oldTx.type === 'debt_collection' && oldTx.referenceId) {
          setCustomers(cList =>
            cList.map(c =>
              c.id === oldTx.referenceId
                ? { ...c, currentBalance: Math.max(0, c.currentBalance - diff) }
                : c
            )
          );
        } else if (oldTx.type === 'supplier_payment' && oldTx.referenceId) {
          setSuppliers(sList =>
            sList.map(s =>
              s.id === oldTx.referenceId
                ? { ...s, currentBalance: Math.max(0, s.currentBalance - diff) }
                : s
            )
          );
        }
      }

      apiCall('transactions.php', 'PUT', newTx);
      return prev.map(t => (t.id === id ? newTx : t));
    });
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => {
      const targetTx = prev.find(t => t.id === id);
      if (!targetTx) return prev;

      if (targetTx.type === 'debt_collection' && targetTx.referenceId) {
        setCustomers(cList =>
          cList.map(c =>
            c.id === targetTx.referenceId
              ? { ...c, currentBalance: c.currentBalance + targetTx.amount }
              : c
          )
        );
      } else if (targetTx.type === 'supplier_payment' && targetTx.referenceId) {
        setSuppliers(sList =>
          sList.map(s =>
            s.id === targetTx.referenceId
              ? { ...s, currentBalance: s.currentBalance + targetTx.amount }
              : s
          )
        );
      }

      apiCall(`transactions.php?id=${encodeURIComponent(id)}`, 'DELETE');
      return prev.filter(t => t.id !== id);
    });
  };

  // Auth & User Actions
  const login = (username: string, password: string): boolean => {
    const user = users.find(
      u => u.username.trim().toLowerCase() === username.trim().toLowerCase() && u.isActive
    );
    if (user && user.passwordHash === password) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const addUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...userData,
      id: generateId('usr'),
      createdAt: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
    apiCall('users.php', 'POST', newUser);
  };

  const updateUser = (id: string, partial: Partial<User>) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...partial } : u)));
    if (currentUser && currentUser.id === id) {
      setCurrentUser(prev => (prev ? { ...prev, ...partial } : null));
    }
    apiCall('users.php', 'PUT', { id, ...partial });
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    apiCall(`users.php?id=${encodeURIComponent(id)}`, 'DELETE');
  };

  const DEFAULT_PERMISSIONS: Record<UserRole, string[]> = {
    admin: [
      'dashboard', 'assistant', 'pos', 'sales', 'sales_returns', 'purchases', 'purchase_returns',
      'inventory', 'assembly', 'expiry', 'customers', 'suppliers', 'finance', 'statements',
      'reports', 'calculator', 'users', 'sqlserver', 'settings'
    ],
    cashier: ['dashboard', 'assistant', 'pos', 'sales', 'sales_returns', 'customers', 'statements', 'calculator', 'sqlserver'],
    storekeeper: ['dashboard', 'assistant', 'inventory', 'assembly', 'expiry', 'purchases', 'purchase_returns', 'suppliers', 'calculator', 'sqlserver'],
  };

  const permissionsMatrix = settings.permissionsMatrix || DEFAULT_PERMISSIONS;

  const updatePermissionsMatrix = (newMatrix: Record<UserRole, string[]>) => {
    updateSettings({ permissionsMatrix: newMatrix });
  };

  const hasPermission = (tabId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || tabId === 'assistant') return true;
    const mappedTab =
      tabId === 'sales_returns_list'
        ? 'sales_returns'
        : tabId === 'purchases_list'
        ? 'purchases'
        : tabId === 'purchase_returns_list'
        ? 'purchase_returns'
        : tabId;
    return permissionsMatrix[currentUser.role]?.includes(mappedTab) || false;
  };

  const openShift = (startingBalance: number, notes?: string, assignedUser?: { id: string; name: string }) => {
    const userToAssign = assignedUser || (currentUser ? { id: currentUser.id, name: currentUser.name } : { id: 'usr-1', name: 'الكاشير' });
    const newShift: Shift = {
      id: generateId('shift'),
      userId: userToAssign.id,
      userName: userToAssign.name,
      openedAt: new Date().toISOString(),
      startingBalance,
      salesRevenue: 0,
      otherIncomes: 0,
      otherExpenses: 0,
      expectedBalance: startingBalance,
      notes: notes || 'تم فتح الوردية وتعيين رصيد الصندوق الافتتاحي',
      status: 'open',
    };
    setActiveShift(newShift);
    setShifts(prev => [newShift, ...prev]);
    apiCall('shifts.php', 'POST', newShift);
  };

  const closeShift = (actualBalance: number, notes?: string) => {
    if (!activeShift) return;
    const difference = actualBalance - activeShift.expectedBalance;
    const closedShift: Shift = {
      ...activeShift,
      closedAt: new Date().toISOString(),
      actualBalance,
      difference,
      notes: notes || 'تم إغلاق الوردية ومطابقة العجز والزيادة',
      status: 'closed',
    };
    setActiveShift(null);
    setShifts(prev => prev.map(s => s.id === activeShift.id ? closedShift : s));
    apiCall('shifts.php', 'PUT', closedShift);
  };

  const logWaste = (productId: string, quantity: number, reason: WasteRecord['reason'], notes?: string) => {
    const product = products.find(p => p.id === productId);
    if (!product || quantity <= 0) return;

    const lossValue = quantity * product.purchasePrice;
    const newRecord: WasteRecord = {
      id: generateId('waste'),
      productId,
      productName: product.name,
      category: product.category,
      unit: product.unit,
      quantity,
      costPrice: product.purchasePrice,
      lossValue,
      reason,
      date: new Date().toISOString(),
      notes,
    };

    setWasteRecords(prev => [newRecord, ...prev]);
    apiCall('waste.php', 'POST', newRecord);

    // Deduct stock
    adjustStock(productId, -quantity);

    // Deduct drawer expected cash if active shift is running and this waste was paid from drawer (simulated as other expense)
    if (activeShift) {
      setActiveShift(prev => {
        if (!prev) return null;
        const otherExpenses = prev.otherExpenses + lossValue;
        const expectedBalance = Math.max(0, prev.expectedBalance - lossValue);
        const updated = { ...prev, otherExpenses, expectedBalance };
        apiCall('shifts.php', 'PUT', updated);
        return updated;
      });
    }

    // Add corresponding general expense to reflect on P&L
    const newExpense: Expense = {
      id: generateId('exp'),
      title: `هالك أصناف: ${product.name} (${quantity} ${product.unit})`,
      category: 'other',
      amount: lossValue,
      date: new Date().toISOString(),
      notes: notes || `تسجيل هالك للمخزن بسبب ${reason}`,
    };
    setExpenses(prev => [newExpense, ...prev]);
    apiCall('expenses.php', 'POST', newExpense);

    // Record cash transaction out for the loss
    const newTx: FinancialTransaction = {
      id: generateId('tx'),
      type: 'general_expense',
      title: `خسارة هالك أصناف: ${product.name}`,
      amount: lossValue,
      direction: 'out',
      date: new Date().toISOString(),
      referenceId: newRecord.id,
      notes: `تسجيل هالك بسبب: ${notes || reason}`,
    };
    setTransactions(prev => [newTx, ...prev]);
    apiCall('transactions.php', 'POST', newTx);
  };

  const updateSettings = (partial: Partial<StoreSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...partial };
      apiCall('settings.php', 'POST', updated);
      return updated;
    });
  };

  const resetToDefaultData = () => {
    fetch('/api/database/reset', { method: 'POST' })
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          const d = result.data;
          setProducts(d.products || INITIAL_PRODUCTS);
          setCustomers(ensurePermanentWalkInCustomer(d.customers || INITIAL_CUSTOMERS));
          setSuppliers(d.suppliers || INITIAL_SUPPLIERS);
          setSalesInvoices(d.salesInvoices || INITIAL_SALES_INVOICES);
          setPurchaseInvoices(d.purchaseInvoices || INITIAL_PURCHASE_INVOICES);
          setExpenses(d.expenses || INITIAL_EXPENSES);
          setTransactions(d.transactions || INITIAL_TRANSACTIONS);
          setSettings(d.settings || INITIAL_SETTINGS);
          setUsers(d.users || INITIAL_USERS);
          setSafes(d.safes || INITIAL_SAFES);
          setSafeTransfers([]);
          setRecipes(d.recipes || INITIAL_RECIPES);
          setAssemblyOperations(d.assemblyOperations || INITIAL_ASSEMBLY_OPERATIONS);
          setAssociations(d.associations || INITIAL_ASSOCIATIONS);
          setSavedAudits([]);
          setPreviouslyAuditedMap({});
          setShifts([]);
          setWasteRecords([]);
          setSalesReturns([]);
          setPurchaseReturns([]);
        }
      })
      .catch(() => {
        setProducts(INITIAL_PRODUCTS);
        setCustomers(INITIAL_CUSTOMERS);
        setSuppliers(INITIAL_SUPPLIERS);
        setSalesInvoices(INITIAL_SALES_INVOICES);
        setPurchaseInvoices(INITIAL_PURCHASE_INVOICES);
        setExpenses(INITIAL_EXPENSES);
        setTransactions(INITIAL_TRANSACTIONS);
        setSettings(INITIAL_SETTINGS);
        setSafes(INITIAL_SAFES);
        setSafeTransfers([]);
        setRecipes(INITIAL_RECIPES);
        setAssemblyOperations(INITIAL_ASSEMBLY_OPERATIONS);
        setAssociations(INITIAL_ASSOCIATIONS);
        setSavedAudits([]);
        setPreviouslyAuditedMap({});
      });
  };

  // Associations Actions
  const addAssociation = (assocData: Omit<MoneyAssociation, 'id'>): MoneyAssociation => {
    const newAssoc: MoneyAssociation = {
      ...assocData,
      id: generateId('assoc'),
    };
    setAssociations(prev => [newAssoc, ...prev]);
    apiCall('associations.php', 'POST', newAssoc);
    return newAssoc;
  };

  const updateAssociation = (id: string, partial: Partial<MoneyAssociation>) => {
    setAssociations(prev => {
      const updated = prev.map(a => (a.id === id ? { ...a, ...partial } : a));
      const target = updated.find(a => a.id === id);
      if (target) {
        apiCall('associations.php', 'PUT', target);
      }
      return updated;
    });
  };

  const deleteAssociation = (id: string) => {
    setAssociations(prev => prev.filter(a => a.id !== id));
    apiCall(`associations.php?id=${encodeURIComponent(id)}`, 'DELETE');
  };


  // Audit Actions
  const saveAuditReport = (report: SavedAuditReport) => {
    setSavedAudits(prev => [report, ...prev]);
    if (report.auditedProductIds && report.auditedProductIds.length > 0) {
      setPreviouslyAuditedMap(prev => {
        const updatedMap = { ...prev };
        report.itemsChanged.forEach(item => {
          updatedMap[item.productId] = {
            auditNumber: report.auditNumber,
            date: report.date,
            actualQty: item.actualQty,
          };
        });
        return updatedMap;
      });
    }
  };

  const deleteAuditReport = (auditId: string) => {
    setSavedAudits(prev => prev.filter(a => a.id !== auditId));
  };

  const resetPreviouslyAuditedMap = () => {
    setPreviouslyAuditedMap({});
  };


  // Safe Management
  const addSafe = (safeData: Omit<SafeAccount, 'id'>): SafeAccount => {
    const newSafe: SafeAccount = {
      ...safeData,
      id: generateId('safe'),
      updatedAt: new Date().toISOString(),
    };
    setSafes(prev => [...prev, newSafe]);
    apiCall('safes.php', 'POST', newSafe);
    return newSafe;
  };

  const updateSafe = (id: string, partial: Partial<SafeAccount>) => {
    setSafes(prev =>
      prev.map(s => (s.id === id ? { ...s, ...partial, updatedAt: new Date().toISOString() } : s))
    );
    apiCall('safes.php', 'PUT', { id, ...partial });
  };

  const deleteSafe = (id: string) => {
    setSafes(prev => prev.filter(s => s.id !== id));
    apiCall(`safes.php?id=${encodeURIComponent(id)}`, 'DELETE');
  };

  const transferBetweenSafes = (
    fromSafeId: string,
    toSafeId: string,
    amount: number,
    notes?: string,
    by?: string
  ): { success: boolean; message: string } => {
    if (fromSafeId === toSafeId) {
      return { success: false, message: 'لا يمكن التحويل لنفس الخزينة أو الحساب.' };
    }
    if (amount <= 0) {
      return { success: false, message: 'مبلغ التحويل يجب أن يكون أكبر من الصفر.' };
    }
    const source = safes.find(s => s.id === fromSafeId);
    const dest = safes.find(s => s.id === toSafeId);
    if (!source || !dest) {
      return { success: false, message: 'إحدى الخزائن المحددة غير موجودة.' };
    }
    if (source.balance < amount) {
      return {
        success: false,
        message: `رصيد ${source.name} الحالي (${source.balance.toLocaleString()} ج.م) غير كافٍ لتحويل (${amount.toLocaleString()} ج.م).`,
      };
    }

    setSafes(prev =>
      prev.map(s => {
        if (s.id === fromSafeId) return { ...s, balance: s.balance - amount };
        if (s.id === toSafeId) return { ...s, balance: s.balance + amount };
        return s;
      })
    );

    const transferRecord: SafeTransfer = {
      id: generateId('stx'),
      transferNumber: `STX-${Date.now().toString().slice(-6)}`,
      fromSafeId,
      fromSafeName: source.name,
      toSafeId,
      toSafeName: dest.name,
      amount,
      date: new Date().toISOString(),
      performedBy: by || currentUser?.name || 'أمين الخزينة',
      notes,
    };
    setSafeTransfers(prev => [transferRecord, ...prev]);

    const tx: FinancialTransaction = {
      id: generateId('tx'),
      type: 'capital_deposit',
      title: `تحويل نقدي: من [${source.name}] إلى [${dest.name}]`,
      amount,
      direction: 'in',
      date: new Date().toISOString(),
      notes: notes || 'تحويل داخلي بين الخزائن والمحافظ',
    };
    setTransactions(prev => [tx, ...prev]);

    return {
      success: true,
      message: `تم تحويل مبلغ ${amount.toLocaleString()} ج.م من "${source.name}" إلى "${dest.name}" بنجاح.`,
    };
  };

  const depositToSafe = (safeId: string, amount: number, title: string, notes?: string) => {
    if (amount <= 0) return;
    setSafes(prev =>
      prev.map(s => (s.id === safeId ? { ...s, balance: s.balance + amount } : s))
    );
    const targetSafe = safes.find(s => s.id === safeId);
    const tx: FinancialTransaction = {
      id: generateId('tx'),
      type: 'capital_deposit',
      title: `${title} (${targetSafe?.name || 'الخزينة'})`,
      amount,
      direction: 'in',
      date: new Date().toISOString(),
      notes,
    };
    setTransactions(prev => [tx, ...prev]);
  };

  const withdrawFromSafe = (safeId: string, amount: number, title: string, notes?: string) => {
    if (amount <= 0) return;
    setSafes(prev =>
      prev.map(s => (s.id === safeId ? { ...s, balance: Math.max(0, s.balance - amount) } : s))
    );
    const targetSafe = safes.find(s => s.id === safeId);
    const tx: FinancialTransaction = {
      id: generateId('tx'),
      type: 'general_expense',
      title: `${title} (${targetSafe?.name || 'الخزينة'})`,
      amount,
      direction: 'out',
      date: new Date().toISOString(),
      notes,
    };
    setTransactions(prev => [tx, ...prev]);
  };

  // Assembly & Disassembly
  const executeAssembly = (
    recipeId: string,
    quantity: number,
    operatorName?: string,
    notes?: string
  ): { success: boolean; message: string } => {
    if (quantity <= 0) {
      return { success: false, message: 'كمية التجميع يجب أن تكون أكبر من الصفر.' };
    }
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) {
      return { success: false, message: 'وصفة التجميع غير موجودة.' };
    }

    const targetProdId = recipe.outputProductId || recipe.targetProductId || '';
    const targetProdName = recipe.outputProductName || recipe.targetProductName || 'صنف مجمع';
    const targetProdUnit = recipe.outputUnit || recipe.targetUnit || 'قطعة';

    // Verify component stocks
    for (const comp of recipe.components) {
      const prod = products.find(p => p.id === comp.productId);
      const needed = comp.quantity * quantity;
      if (!prod || prod.quantity < needed) {
        return {
          success: false,
          message: `عجز في رصيد المكون "${comp.productName}". المطلوب: ${needed} ${comp.unit}، المتوفر حالياً بالمخزن: ${prod ? prod.quantity : 0} ${comp.unit}.`,
        };
      }
    }

    // Deduct components, increment target composite product
    setProducts(prev => {
      const deductionMap = new Map<string, number>();
      recipe.components.forEach(c => {
        deductionMap.set(c.productId, c.quantity * quantity);
      });

      return prev.map(p => {
        if (deductionMap.has(p.id)) {
          const deduct = deductionMap.get(p.id)!;
          return { ...p, quantity: Math.max(0, p.quantity - deduct) };
        }
        if (p.id === targetProdId) {
          return { ...p, quantity: p.quantity + quantity };
        }
        return p;
      });
    });

    const totalCost = recipe.components.reduce(
      (sum, c) => sum + (c.unitCost * c.quantity * quantity),
      0
    );
    const unitCost = quantity > 0 ? totalCost / quantity : totalCost;

    const op: AssemblyOperation = {
      id: generateId('asm'),
      operationNumber: `ASM-${Date.now().toString().slice(-6)}`,
      type: 'assembly',
      recipeId,
      recipeName: recipe.name,
      targetProductId: targetProdId,
      targetProductName: targetProdName,
      targetUnit: targetProdUnit,
      quantity,
      componentsUsed: recipe.components.map(c => ({
        productId: c.productId,
        productName: c.productName,
        quantityPerUnit: c.quantity,
        totalQuantity: c.quantity * quantity,
        unit: c.unit,
        unitCost: c.unitCost,
        totalCost: c.unitCost * c.quantity * quantity,
      })),
      totalCost,
      unitCost,
      date: new Date().toISOString(),
      performedBy: operatorName || currentUser?.name || 'فني الورشة',
      notes,
    };
    setAssemblyOperations(prev => [op, ...prev]);

    return {
      success: true,
      message: `تم تجميع عدد (${quantity} ${targetProdUnit}) من "${targetProdName}" بنجاح، وخُصمت المكونات من المخزن بدقة.`,
    };
  };

  const executeDisassembly = (
    recipeId: string,
    quantity: number,
    operatorName?: string,
    notes?: string
  ): { success: boolean; message: string } => {
    if (quantity <= 0) {
      return { success: false, message: 'كمية التفكيك يجب أن تكون أكبر من الصفر.' };
    }
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) {
      return { success: false, message: 'وصفة التجميع/التفكيك غير موجودة.' };
    }

    const targetProdId = recipe.outputProductId || recipe.targetProductId || '';
    const targetProdName = recipe.outputProductName || recipe.targetProductName || 'صنف مجمع';
    const targetProdUnit = recipe.outputUnit || recipe.targetUnit || 'قطعة';

    const targetProduct = products.find(p => p.id === targetProdId);
    if (!targetProduct || targetProduct.quantity < quantity) {
      return {
        success: false,
        message: `رصيد الصنف المجمع "${targetProdName}" لا يكفي للتفكيك. المتوفر: ${targetProduct ? targetProduct.quantity : 0} ${targetProdUnit} والمطلوب تفكيكه: ${quantity} ${targetProdUnit}.`,
      };
    }

    // Deduct composite item and restore components to stock
    setProducts(prev => {
      const additionMap = new Map<string, number>();
      recipe.components.forEach(c => {
        additionMap.set(c.productId, c.quantity * quantity);
      });

      return prev.map(p => {
        if (p.id === targetProdId) {
          return { ...p, quantity: Math.max(0, p.quantity - quantity) };
        }
        if (additionMap.has(p.id)) {
          const add = additionMap.get(p.id)!;
          return { ...p, quantity: p.quantity + add };
        }
        return p;
      });
    });

    const totalCost = recipe.components.reduce(
      (sum, c) => sum + (c.unitCost * c.quantity * quantity),
      0
    );
    const unitCost = quantity > 0 ? totalCost / quantity : totalCost;

    const op: AssemblyOperation = {
      id: generateId('dsm'),
      operationNumber: `DSM-${Date.now().toString().slice(-6)}`,
      type: 'disassembly',
      recipeId,
      recipeName: recipe.name,
      targetProductId: targetProdId,
      targetProductName: targetProdName,
      targetUnit: targetProdUnit,
      quantity,
      componentsUsed: recipe.components.map(c => ({
        productId: c.productId,
        productName: c.productName,
        quantityPerUnit: c.quantity,
        totalQuantity: c.quantity * quantity,
        unit: c.unit,
        unitCost: c.unitCost,
        totalCost: c.unitCost * c.quantity * quantity,
      })),
      totalCost,
      unitCost,
      date: new Date().toISOString(),
      performedBy: operatorName || currentUser?.name || 'فني الورشة',
      notes,
    };
    setAssemblyOperations(prev => [op, ...prev]);

    return {
      success: true,
      message: `تم تفكيك عدد (${quantity} ${targetProdUnit}) من "${targetProdName}"، وأعيدت جميع المكونات والأجزاء للمخزن بدقة.`,
    };
  };

  const executeDirectDisassembly = (data: {
    voucherNumber: string;
    sourceProductId: string;
    sourceQty: number;
    sourceUnitCost: number;
    targetProductId: string;
    targetQty: number;
    targetUnitCost: number;
    targetSellingPrice?: number;
    notes?: string;
  }): { success: boolean; message: string; op?: AssemblyOperation } => {
    if (data.sourceQty <= 0) {
      return { success: false, message: 'العدد المراد فكه يجب أن يكون أكبر من الصفر.' };
    }
    if (data.targetQty <= 0) {
      return { success: false, message: 'العدد الناتج من الفك يجب أن يكون أكبر من الصفر.' };
    }
    const sourceProd = products.find(p => p.id === data.sourceProductId);
    const targetProd = products.find(p => p.id === data.targetProductId);

    if (!sourceProd) {
      return { success: false, message: 'يرجى اختيار الصنف المراد فكه أولاً.' };
    }
    if (!targetProd) {
      return { success: false, message: 'يرجى اختيار الصنف الناتج من الفك.' };
    }
    if (sourceProd.id === targetProd.id) {
      return { success: false, message: 'لا يمكن فك الصنف لنفس الصنف بنفس الوقت.' };
    }
    if (sourceProd.quantity < data.sourceQty) {
      return {
        success: false,
        message: `عجز في رصيد الصنف "${sourceProd.name}" بالمخزن. المتوفر حالياً: (${sourceProd.quantity} ${sourceProd.unit}) والمطلوب فكه: (${data.sourceQty} ${sourceProd.unit}).`,
      };
    }

    const finalTargetSellingPrice =
      data.targetSellingPrice !== undefined && data.targetSellingPrice > 0
        ? data.targetSellingPrice
        : targetProd.sellingPrice;

    // Deduct source stock and increase target stock + update purchasePrice & sellingPrice
    setProducts(prev =>
      prev.map(p => {
        if (p.id === sourceProd.id) {
          const updatedSource = { ...p, quantity: Math.max(0, p.quantity - data.sourceQty) };
          apiCall('products.php', 'PUT', updatedSource);
          return updatedSource;
        }
        if (p.id === targetProd.id) {
          const updatedTarget = {
            ...p,
            quantity: p.quantity + data.targetQty,
            purchasePrice: data.targetUnitCost > 0 ? data.targetUnitCost : p.purchasePrice,
            sellingPrice: finalTargetSellingPrice,
          };
          apiCall('products.php', 'PUT', updatedTarget);
          return updatedTarget;
        }
        return p;
      })
    );

    const totalVal = Math.round(data.sourceQty * data.sourceUnitCost * 100) / 100;

    const op: AssemblyOperation = {
      id: generateId('dsm'),
      operationNumber: data.voucherNumber,
      type: 'disassembly',
      targetProductId: targetProd.id,
      targetProductName: targetProd.name,
      targetUnit: targetProd.unit,
      quantity: data.targetQty,
      unitCost: data.targetUnitCost,
      sellingPrice: finalTargetSellingPrice,
      totalCost: totalVal,
      componentsAffected: [
        {
          productId: sourceProd.id,
          productName: sourceProd.name,
          quantity: data.sourceQty,
          unit: sourceProd.unit,
          unitCost: data.sourceUnitCost,
          sellingPrice: sourceProd.sellingPrice,
          totalCost: totalVal,
          direction: 'deducted',
        },
        {
          productId: targetProd.id,
          productName: targetProd.name,
          quantity: data.targetQty,
          unit: targetProd.unit,
          unitCost: data.targetUnitCost,
          sellingPrice: finalTargetSellingPrice,
          totalCost: totalVal,
          direction: 'added',
        },
      ],
      performedBy: currentUser?.name || 'أمين المخزن',
      date: new Date().toISOString(),
      notes: data.notes || `فك (${data.sourceQty} ${sourceProd.unit}) من [${sourceProd.name}] إلى (${data.targetQty} ${targetProd.unit}) من [${targetProd.name}]`,
    };

    setAssemblyOperations(prev => [op, ...prev]);
    apiCall('assembly_operations.php', 'POST', op);

    return {
      success: true,
      message: `تم فك عدد (${data.sourceQty} ${sourceProd.unit}) من "${sourceProd.name}" وتحويلها إلى (${data.targetQty} ${targetProd.unit}) من "${targetProd.name}" بنجاح، وتحديث سعر بيع المنتج (${finalTargetSellingPrice} ${settings.currency}) ورصيد المخزن فورياً.`,
      op,
    };
  };

  const addRecipe = (recipeData: Omit<AssemblyRecipe, 'id' | 'createdAt'>) => {
    const newRecipe: AssemblyRecipe = {
      ...recipeData,
      id: generateId('rcp'),
      createdAt: new Date().toISOString(),
    };
    setRecipes(prev => [newRecipe, ...prev]);
  };

  const updateRecipe = (id: string, partial: Partial<AssemblyRecipe>) => {
    setRecipes(prev => prev.map(r => (r.id === id ? { ...r, ...partial } : r)));
  };

  const deleteRecipe = (id: string) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
  };

  const exportDatabaseJson = () => {
    const fullDb = {
      products,
      customers,
      suppliers,
      salesInvoices,
      purchaseInvoices,
      expenses,
      transactions,
      settings,
      exportDate: new Date().toISOString(),
    };
    return JSON.stringify(fullDb, null, 2);
  };

  const importDatabaseJson = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.products && Array.isArray(data.products)) setProducts(data.products);
      if (data.customers && Array.isArray(data.customers)) {
        setCustomers(ensurePermanentWalkInCustomer(data.customers));
      }
      if (data.suppliers && Array.isArray(data.suppliers)) setSuppliers(data.suppliers);
      if (data.salesInvoices && Array.isArray(data.salesInvoices)) setSalesInvoices(data.salesInvoices);
      if (data.purchaseInvoices && Array.isArray(data.purchaseInvoices)) setPurchaseInvoices(data.purchaseInvoices);
      if (data.expenses && Array.isArray(data.expenses)) setExpenses(data.expenses);
      if (data.transactions && Array.isArray(data.transactions)) setTransactions(data.transactions);
      if (data.settings) setSettings(data.settings);
      return true;
    } catch {
      return false;
    }
  };

  // Metrics Calculation
  const metrics = useMemo(() => {
    const completedSales = salesInvoices.filter(i => i.status === 'completed');
    const totalSalesRevenue = completedSales.reduce((sum, inv) => sum + inv.total, 0);

    // Calculate cost of goods sold
    const totalSalesCost = completedSales.reduce((sum, inv) => {
      const invoiceCost = inv.items.reduce(
        (iSum, item) => iSum + (item.purchaseCost || 0) * item.quantity,
        0
      );
      return sum + invoiceCost;
    }, 0);

    const grossProfit = totalSalesRevenue - totalSalesCost;
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = grossProfit - totalExpenses;

    // Cash register balance calculation
    const cashIn = transactions
      .filter(t => t.direction === 'in')
      .reduce((sum, t) => sum + t.amount, 0);
    const cashOut = transactions
      .filter(t => t.direction === 'out')
      .reduce((sum, t) => sum + t.amount, 0);
    const cashBalance = cashIn - cashOut;

    // Debts & Payables
    const customerDebts = customers.reduce((sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0), 0);
    const supplierPayables = suppliers.reduce((sum, s) => sum + (s.currentBalance > 0 ? s.currentBalance : 0), 0);

    // Inventory valuations
    const inventoryCostValue = products.reduce((sum, p) => sum + p.purchasePrice * p.quantity, 0);
    const inventoryRetailValue = products.reduce((sum, p) => sum + p.sellingPrice * p.quantity, 0);

    // Alerts
    const lowStockCount = products.filter(p => p.quantity <= p.minAlertQuantity).length;

    const now = new Date();
    const ninetyDaysLater = new Date();
    ninetyDaysLater.setDate(now.getDate() + 90);

    let expiringSoonCount = 0;
    let expiredCount = 0;

    products.forEach(p => {
      if (p.expiryDate) {
        const exp = new Date(p.expiryDate);
        if (exp < now) {
          expiredCount++;
        } else if (exp <= ninetyDaysLater) {
          expiringSoonCount++;
        }
      }
    });

    // Today's Sales
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySales = completedSales
      .filter(i => i.date.startsWith(todayStr))
      .reduce((sum, i) => sum + i.total, 0);

    return {
      totalSalesRevenue,
      totalSalesCost,
      grossProfit,
      totalExpenses,
      netProfit,
      cashBalance,
      customerDebts,
      supplierPayables,
      inventoryCostValue,
      inventoryRetailValue,
      lowStockCount,
      expiringSoonCount,
      expiredCount,
      todaySales,
    };
  }, [salesInvoices, expenses, transactions, customers, suppliers, products]);

  return (
    <AppContext.Provider
      value={{
        products,
        customers,
        suppliers,
        salesInvoices,
        purchaseInvoices,
        salesReturns,
        purchaseReturns,
        expenses,
        transactions,
        settings,
        users,
        currentUser,
        shifts,
        activeShift,
        wasteRecords,
        login,
        logout,
        addUser,
        updateUser,
        deleteUser,
        hasPermission,
        permissionsMatrix,
        updatePermissionsMatrix,
        openShift,
        closeShift,
        logWaste,
        activeTab,
        setActiveTab,
        registerInvoiceGuard,
        requestInvoiceClearConfirm,
        pendingExitTab,
        activeInvoiceGuard,
        confirmExitWithSave,
        confirmExitWithDiscard,
        cancelExitRequest,
        activeStatementTarget,
        openStatement,
        closeStatement,
        printInvoice,
        setPrintInvoice,
        printMode,
        setPrintMode,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        collectCustomerDebt,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        paySupplier,
        createSalesInvoice,
        cancelSalesInvoice,
        deleteSalesInvoice,
        createPurchaseInvoice,
        updatePurchaseInvoice,
        deletePurchaseInvoice,
        createSalesReturn,
        deleteSalesReturn,
        createPurchaseReturn,
        deletePurchaseReturn,
        addExpense,
        deleteExpense,
        addManualCashTransaction,
        updateTransaction,
        deleteTransaction,
        safes,
        safeTransfers,
        addSafe,
        updateSafe,
        deleteSafe,
        transferBetweenSafes,
        depositToSafe,
        withdrawFromSafe,
        recipes,
        assemblyOperations,
        executeAssembly,
        executeDisassembly,
        executeDirectDisassembly,
        addRecipe,
        updateRecipe,
        deleteRecipe,
        updateSettings,
        resetToDefaultData,
        exportDatabaseJson,
        importDatabaseJson,
        associations,
        addAssociation,
        updateAssociation,
        deleteAssociation,
        savedAudits,
        previouslyAuditedMap,
        setPreviouslyAuditedMap,
        saveAuditReport,
        deleteAuditReport,
        resetPreviouslyAuditedMap,
        metrics,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
