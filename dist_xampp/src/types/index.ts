export type ProductCategory = 
  | 'wires_cables'        // أسلاك وكابلات
  | 'switches_sockets'    // مفاتيح وبرايز وشاسيهات
  | 'lighting_bulbs'      // لمبات وكشافات وإنارة
  | 'breakers_panels'     // قواطع ولوحات توزيع
  | 'pipes_conduits'      // خراطيم وبواطات ومواسير
  | 'tools_meters'        // عدد وأجهزة قياس
  | 'fans_heaters'        // مراوح وشفاطات
  | 'accessories'         // مستلزمات وإكسسوارات كهربائية
  // Legacy aliases for backward compatibility
  | 'frozen_meat'
  | 'frozen_poultry'
  | 'frozen_fish'
  | 'frozen_veg'
  | 'processed_meat'
  | 'french_fries'
  | 'ready_meals'
  | 'ice_cream';

export type ToxicityClass = 'safe' | 'caution' | 'warning' | 'danger';

export interface Shift {
  id: string;
  userId: string;
  userName: string;
  openedAt: string;
  closedAt?: string;
  startingBalance: number; // الرصيد الافتتاحي للخزينة
  salesRevenue: number; // إيراد المبيعات النقدية
  otherIncomes: number; // مقبوضات الخزينة الأخرى
  otherExpenses: number; // مدفوعات الخزينة والمصروفات
  expectedBalance: number; // الرصيد المتوقع بالخزينة
  actualBalance?: number; // الرصيد الفعلي بعد العد والدرج
  difference?: number; // العجز أو الزيادة
  notes?: string;
  status: 'open' | 'closed';
}

export interface WasteRecord {
  id: string;
  productId: string;
  productName: string;
  category: ProductCategory;
  unit: string;
  quantity: number;
  costPrice: number;
  lossValue: number;
  reason: 'damaged_packaging' | 'defrosting' | 'expired' | 'damaged' | 'other';
  date: string;
  notes?: string;
}

export interface Product {
  id: string;
  name: string; // الاسم التجاري للصنف
  category: ProductCategory;
  brand?: string; // الماركة / الشركة (السويدي، فينوس، شنايدر، توشيبا، فيليبس...)
  voltage?: string; // الجهد (220V, 380V, 12V)
  powerWatt?: string; // القدرة بالواط (9W, 12W, 18W, 50W...)
  amperage?: string; // شدة التيار بالأمبير (10A, 16A, 25A, 32A, 63A...)
  warrantyMonths?: number; // فترة الضمان بالشهور
  barcode: string;
  unit: string; // لفة، متر، قطعة، علبة، طقم، بكرة...
  purchasePrice: number; // سعر الشراء / التكلفة
  sellingPrice: number; // سعر البيع (قطاعي)
  wholesalePrice?: number; // سعر الجملة (للفنيين والمقاولين)
  quantity: number; // الكمية المتوفرة حالياً
  minAlertQuantity: number; // حد الطلب الأدنى
  batchNumber?: string; // رقم التشغيلة / الباتش
  expiryDate?: string; // تاريخ انتهاء الضمان أو الصلاحية
  supplierId?: string; // المورد المعتمد
  notes?: string;
  createdAt?: string;
  isWeighable?: boolean;
  tareWeight?: number;
  isComposite?: boolean; // هل هو صنف مجمع / مركب
  recipeId?: string; // رقم وصفة التجميع المرتبطة
  // Legacy aliases
  activeIngredient?: string;
  concentration?: string;
  dosageInfo?: string;
  targetPests?: string;
  toxicity?: ToxicityClass;
}

export interface Customer {
  id: string;
  code?: string; // كود العميل (مثال CO0001)
  name: string; // اسم العميل / المقاول
  phone: string;
  address?: string; // العنوان / المركز
  customerType?: 'retail' | 'contractor' | 'technician' | 'company'; // نوع العميل
  commercialRecord?: string; // السجل التجاري / الرقم الضريبي
  initialBalance?: number; // الرصيد الافتتاحي السابق
  currentBalance: number; // الرصيد: موجب يعني عليه ديون للمحل، سالب له رصيد
  creditLimit?: number; // سقف المديونية المسموح به
  notes?: string;
  createdAt: string;
  // Legacy aliases
  cropTypes?: string;
  farmArea?: string;
}

export interface Supplier {
  id: string;
  name: string; // اسم الشركة أو الموزع أو المصنع
  companyName?: string; // اسم الشركة التجارية
  representativeName?: string; // اسم المندوب
  phone: string;
  address?: string;
  suppliedCategories?: string; // الأصناف الموردة (كابلات، قواطع، إنارة...)
  initialBalance?: number; // الرصيد الافتتاحي السابق
  currentBalance: number; // الرصيد: موجب يعني للمورد مستحقات، سالب دفعنا مقدماً
  notes?: string;
  createdAt: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  category: ProductCategory;
  brand?: string;
  unit: string;
  unitPrice: number;
  purchaseCost: number; // For calculating profit
  quantity: number;
  discount?: number; // قيمة الخصم على الصنف
  discountType?: 'fixed' | 'percent'; // نوع الخصم (نقدي / مئوي)
  total: number;
  // Legacy alias
  activeIngredient?: string;
}

export type PaymentMethod = 'cash' | 'vodafone' | 'instapay' | 'credit' | 'transfer' | 'bank_transfer' | 'check'; // نقدي | فودافون كاش | انيستا | آجل | تحويل بنكي | شيك

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  date: string; // ISO string
  customerId: string;
  customerName: string;
  customerPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: PaymentMethod;
  safeId?: string; // الخزينة المودع بها
  notes?: string;
  status: 'completed' | 'cancelled';
}

export interface PurchaseInvoiceItem {
  productId: string;
  productName: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  discount?: number;
  discountType?: 'fixed' | 'percent';
  total: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseInvoiceItem[];
  total: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: PaymentMethod;
  safeId?: string; // الخزينة المسحوب منها
  notes?: string;
  status?: 'completed' | 'cancelled';
}

export interface SalesReturnInvoice {
  id: string;
  returnNumber: string;
  originalInvoiceNumber?: string;
  date: string;
  customerId: string;
  customerName: string;
  items: InvoiceItem[];
  total: number;
  paidAmount?: number;
  remainingAmount?: number;
  refundMethod: PaymentMethod;
  safeId?: string;
  notes?: string;
}

export interface PurchaseReturnInvoice {
  id: string;
  returnNumber: string;
  originalInvoiceNumber?: string;
  date: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseInvoiceItem[];
  total: number;
  paidAmount?: number;
  remainingAmount?: number;
  refundMethod: PaymentMethod;
  safeId?: string;
  notes?: string;
}

export interface Expense {
  id: string;
  title: string; // بند المصروف (إيجار، كهرباء، عمالة، وقود، صيانة، الخ)
  category: 'rent' | 'utilities' | 'salaries' | 'transport' | 'hospitality' | 'maintenance' | 'marketing' | 'taxes' | 'other';
  amount: number;
  safeId?: string; // الخزينة المسحوب منها المصروف
  date: string;
  notes?: string;
  recipient?: string; // المستلم
}

export interface FinancialTransaction {
  id: string;
  type: 
    | 'sale_income' 
    | 'debt_collection' 
    | 'purchase_expense' 
    | 'supplier_payment' 
    | 'general_expense' 
    | 'capital_deposit'
    | 'safe_transfer'
    | 'assembly_cost';
  title: string;
  amount: number;
  direction: 'in' | 'out'; // وارد أو صادر من الخزينة
  date: string;
  safeId?: string; // الخزينة المرتبطة
  referenceId?: string; // معرف الفاتورة أو السند
  partyType?: 'customer' | 'supplier' | 'safe' | 'general';
  partyId?: string;
  partyName?: string;
  notes?: string;
}

// -------------------------------------------------------------
// SAFES & BANK WALLETS
// -------------------------------------------------------------
export interface SafeAccount {
  id: string;
  name: string; // الخزينة الرئيسية، درج كاشير، حساب بنك مصر، محفظة فودافون كاش
  type: 'cash' | 'pos_drawer' | 'pos' | 'bank' | 'wallet';
  balance: number; // الرصيد الحالي
  accountNumber?: string;
  isDefault?: boolean;
  notes?: string;
  updatedAt?: string;
}

export interface SafeTransfer {
  id: string;
  transferNumber?: string;
  date: string;
  fromSafeId: string;
  fromSafeName: string;
  toSafeId: string;
  toSafeName: string;
  amount: number;
  notes?: string;
  performedBy: string;
}

// -------------------------------------------------------------
// MONEY ASSOCIATIONS / SAVINGS CIRCLES (الجمعيات المالية والادخارية)
// -------------------------------------------------------------
export interface MoneyAssociation {
  id: string;
  name: string; // اسم الجمعية (مثال: جمعية الأقارب 50 ألف)
  organizer: string; // اسم المنظم / القائم بالجمعية
  totalAmount: number; // إجمالي مبلغ الجمعية
  monthlyInstallment: number; // القسط الشهري
  totalMonths: number; // عدد الشهور
  paidMonths: number; // عدد الأقساط المدفوعة
  payoutTurnMonth: number; // ترتيب أو شهر استلام المبلغ
  payoutDate?: string; // تاريخ استلام المبلغ المتوقع
  status: 'active' | 'payout_received' | 'completed'; // نشطة | تم القبض | مكتملة
  safeId?: string; // الخزينة المرتبطة
  startDate: string;
  notes?: string;
}

// -------------------------------------------------------------
// ASSEMBLY & DISASSEMBLY (تفكيك وتجميع الأصناف)
// -------------------------------------------------------------
export interface BomComponent {
  productId: string;
  productName: string;
  quantity: number; // الكمية المطلوبة لكل وحدة مجمعة
  unit: string;
  unitCost: number; // تكلفة شراء المكون
  totalCost: number; // quantity * unitCost
}

export interface AssemblyRecipe {
  id: string;
  name: string; // اسم التجميعة / الباقة (مثال: لوحة توزيع 12 خط مجمعة جاهزة)
  outputProductId: string; // الصنف الناتج في المخزون
  outputProductName: string;
  outputQuantity: number; // الكمية الناتجة (افتراضياً 1)
  outputUnit: string;
  targetProductId?: string;
  targetProductName?: string;
  targetUnit?: string;
  components: BomComponent[];
  laborCost: number; // تكلفة المصنعية أو عمالة التجميع
  totalEstimatedCost: number; // إجمالي تكلفة التجميع
  notes?: string;
  createdAt: string;
}

export interface AssemblyOperation {
  id: string;
  operationNumber: string; // ASM-2026-001
  type: 'assembly' | 'disassembly'; // تجميع أو تفكيك
  recipeId?: string;
  recipeName?: string;
  targetProductId: string;
  targetProductName: string;
  targetUnit?: string;
  quantity: number; // الكمية المجمعة أو المفككة
  unit?: string;
  unitCost?: number;
  sellingPrice?: number;
  totalCost: number;
  laborCost?: number;
  componentsAffected?: {
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    unitCost: number;
    sellingPrice?: number;
    totalCost: number;
    direction: 'deducted' | 'added';
  }[];
  componentsUsed?: {
    productId: string;
    productName: string;
    quantityPerUnit?: number;
    totalQuantity: number;
    unit: string;
    unitCost: number;
    totalCost: number;
  }[];
  operatorName?: string;
  performedBy?: string;
  date: string;
  notes?: string;
}

export interface StoreSettings {
  storeName: string;
  ownerName: string;
  phone: string;
  phoneAlt?: string;
  address: string;
  commercialRecord?: string; // السجل التجاري / البطاقة الضريبية
  agriculturalLicense?: string; // رخصة أو تصريح النشاط التجاري
  taxRate: number; // نسبة الضريبة المضافة
  invoiceFooterNote: string;
  currency: string;
  permissionsMatrix?: Record<UserRole, string[]>;
}

export type UserRole = 'admin' | 'cashier' | 'storekeeper';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  passwordHash: string;
}

export interface SavedAuditItem {
  productId: string;
  productName: string;
  unit: string;
  costPrice: number;
  systemQty: number;
  actualQty: number;
  variance: number;
  varianceValue: number;
  reason: string;
}

export interface SavedAuditReport {
  id: string;
  auditNumber: string;
  date: string;
  auditorName: string;
  notes: string;
  totalItemsCounted: number;
  surplusItemsCount: number;
  deficitItemsCount: number;
  totalSurplusValue: number;
  totalDeficitValue: number;
  netFinancialVariance: number;
  auditedProductIds?: string[];
  itemsChanged: SavedAuditItem[];
}

export interface PreviousAuditInfo {
  auditNumber: string;
  date: string;
  actualQty: number;
}

