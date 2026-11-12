import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Product, ProductCategory, InvoiceItem, PaymentMethod } from '../types';
import { VoucherModal } from './VoucherModal';
import { CustomerModal } from './CustomerModal';
import { CustomerLastPriceModal } from './CustomerLastPriceModal';
import { DetailedCustomerStatement } from './DetailedCustomerStatement';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  CheckCircle2,
  User,
  Printer,
  Clock,
  X,
  UserPlus,
  Scale,
  Save,
  RotateCcw,
  Receipt,
  FileText,
  CreditCard,
  Banknote,
  AlertTriangle,
  History,
  Maximize2,
  Minimize2
} from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  wires_cables: 'أسلاك وكابلات',
  switches_sockets: 'مفاتيح وبرايز وشاسيهات',
  lighting_bulbs: 'لمبات وكشافات وبانلات',
  breakers_panels: 'قواطع ولوحات توزيع',
  pipes_conduits: 'خراطيم ومواسير وعلب',
  tools_meters: 'عدد وأجهزة قياس واختبار',
  fans_heaters: 'شفاطات ومراوح ودفايات',
  accessories: 'شكرتون ومستلزمات كهرباء',
};

// Reusable Decimal Input Component for fluid typing of weights and prices
interface DecimalInputProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  className?: string;
  placeholder?: string;
  title?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  resetToken?: any;
}

const DecimalInput = React.forwardRef<HTMLInputElement, DecimalInputProps>(({
  value,
  onChange,
  min = 0,
  className = '',
  placeholder = '0',
  title,
  onKeyDown,
  resetToken,
}, ref) => {
  const [strValue, setStrValue] = useState<string>(
    value !== undefined && !isNaN(value) ? value.toString() : '0'
  );
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused || resetToken !== undefined) {
      setStrValue(value !== undefined && !isNaN(value) ? value.toString() : '0');
    }
  }, [value, isFocused, resetToken]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (/^\d*\.?\d*$/.test(raw)) {
      setStrValue(raw);
      const parsed = parseFloat(raw);
      if (!isNaN(parsed) && parsed >= min) {
        onChange(parsed);
      } else if (raw === '' || raw === '.') {
        onChange(min);
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(strValue);
    if (isNaN(parsed) || parsed < min) {
      setStrValue(min.toString());
      onChange(min);
    } else {
      setStrValue(parsed.toString());
      onChange(parsed);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    e.target.select();
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      value={strValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      title={title}
      className={className}
    />
  );
});
export interface PosTab {
  id: string;
  title: string;
  cart: InvoiceItem[];
  selectedCustomerId: string;
  customerSearchQuery: string;
  discount: number;
  invoiceDiscountType: 'fixed' | 'percent';
  paymentMethod: PaymentMethod;
  selectedSafeId: string;
  paidAmount: number;
  hasCustomPaidAmount: boolean;
  notes: string;
  invoiceDate: string;
}

export const POS: React.FC = () => {
  const {
    products,
    customers,
    safes,
    settings,
    salesInvoices,
    transactions,
    createSalesInvoice,
    setPrintInvoice,
    addCustomer,
    collectCustomerDebt,
    activeShift,
    setActiveTab,
    registerInvoiceGuard,
    updateProduct,
  } = useApp();

  // Product Edit Modal State
  const [editingProductModal, setEditingProductModal] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    purchasePrice: 0,
    sellingPrice: 0,
    quantity: 0,
    unit: 'قطعة',
    barcode: '',
  });

  useEffect(() => {
    if (editingProductModal) {
      setEditForm({
        name: editingProductModal.name,
        purchasePrice: editingProductModal.purchasePrice,
        sellingPrice: editingProductModal.sellingPrice,
        quantity: editingProductModal.quantity,
        unit: editingProductModal.unit || 'قطعة',
        barcode: editingProductModal.barcode || '',
      });
    }
  }, [editingProductModal]);

  const handleSaveProductEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductModal) return;
    updateProduct(editingProductModal.id, {
      name: editForm.name,
      purchasePrice: editForm.purchasePrice,
      sellingPrice: editForm.sellingPrice,
      quantity: editForm.quantity,
      unit: editForm.unit,
      barcode: editForm.barcode,
    });
    setEditingProductModal(null);
  };

  // Helper function for today date string
  const getTodayDateStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const defaultSafeId = safes.find(s => s.isDefault)?.id || safes[0]?.id || 'safe-pos';

  // Multi-Tab POS Invoices State (persisted in sessionStorage so tabs survive screen switches)
  const [tabs, setTabs] = useState<PosTab[]>(() => {
    try {
      const saved = sessionStorage.getItem('wessam_pos_tabs_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'tab-1',
        title: 'فاتورة 1',
        cart: [],
        selectedCustomerId: 'walk-in',
        customerSearchQuery: 'عميل نقدي عام',
        discount: 0,
        invoiceDiscountType: 'fixed',
        paymentMethod: 'cash',
        selectedSafeId: defaultSafeId,
        paidAmount: 0,
        hasCustomPaidAmount: false,
        notes: '',
        invoiceDate: getTodayDateStr(),
      },
    ];
  });
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    try {
      return sessionStorage.getItem('wessam_pos_active_tab_v1') || 'tab-1';
    } catch {
      return 'tab-1';
    }
  });
  const [tabCounter, setTabCounter] = useState<number>(() => {
    try {
      const c = Number(sessionStorage.getItem('wessam_pos_tab_counter_v1'));
      return c >= 1 ? c : 1;
    } catch {
      return 1;
    }
  });
  const [confirmCloseTab, setConfirmCloseTab] = useState<PosTab | null>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem('wessam_pos_tabs_v1', JSON.stringify(tabs));
      sessionStorage.setItem('wessam_pos_active_tab_v1', activeTabId);
      sessionStorage.setItem('wessam_pos_tab_counter_v1', String(tabCounter));
    } catch {}
  }, [tabs, activeTabId, tabCounter]);

  const activeTabObj = useMemo(() => {
    return (
      tabs.find(t => t.id === activeTabId) ||
      tabs[0] || {
        id: 'tab-1',
        title: 'فاتورة 1',
        cart: [],
        selectedCustomerId: 'walk-in',
        customerSearchQuery: 'عميل نقدي عام',
        discount: 0,
        invoiceDiscountType: 'fixed',
        paymentMethod: 'cash',
        selectedSafeId: defaultSafeId,
        paidAmount: 0,
        hasCustomPaidAmount: false,
        notes: '',
        invoiceDate: getTodayDateStr(),
      }
    );
  }, [tabs, activeTabId, defaultSafeId]);

  const updateActiveTabState = (updater: (prev: PosTab) => PosTab) => {
    setTabs(prevTabs =>
      prevTabs.map(t => (t.id === activeTabId ? updater(t) : t))
    );
  };

  const cart = activeTabObj.cart;
  const setCart = (action: InvoiceItem[] | ((prev: InvoiceItem[]) => InvoiceItem[])) => {
    updateActiveTabState(prev => ({
      ...prev,
      cart: typeof action === 'function' ? action(prev.cart) : action,
    }));
  };

  const selectedCustomerId = activeTabObj.selectedCustomerId;
  const setSelectedCustomerId = (val: string | ((prev: string) => string)) => {
    updateActiveTabState(prev => ({
      ...prev,
      selectedCustomerId: typeof val === 'function' ? val(prev.selectedCustomerId) : val,
    }));
  };

  const customerSearchQuery = activeTabObj.customerSearchQuery;
  const setCustomerSearchQuery = (val: string | ((prev: string) => string)) => {
    updateActiveTabState(prev => ({
      ...prev,
      customerSearchQuery: typeof val === 'function' ? val(prev.customerSearchQuery) : val,
    }));
  };

  const discount = activeTabObj.discount;
  const setDiscount = (val: number | ((prev: number) => number)) => {
    updateActiveTabState(prev => ({
      ...prev,
      discount: typeof val === 'function' ? val(prev.discount) : val,
    }));
  };

  const invoiceDiscountType = activeTabObj.invoiceDiscountType;
  const setInvoiceDiscountType = (
    val: 'fixed' | 'percent' | ((prev: 'fixed' | 'percent') => 'fixed' | 'percent')
  ) => {
    updateActiveTabState(prev => ({
      ...prev,
      invoiceDiscountType: typeof val === 'function' ? val(prev.invoiceDiscountType) : val,
    }));
  };

  const paymentMethod = activeTabObj.paymentMethod;
  const setPaymentMethod = (val: PaymentMethod | ((prev: PaymentMethod) => PaymentMethod)) => {
    updateActiveTabState(prev => ({
      ...prev,
      paymentMethod: typeof val === 'function' ? val(prev.paymentMethod) : val,
    }));
  };

  const selectedSafeId = activeTabObj.selectedSafeId;
  const setSelectedSafeId = (val: string | ((prev: string) => string)) => {
    updateActiveTabState(prev => ({
      ...prev,
      selectedSafeId: typeof val === 'function' ? val(prev.selectedSafeId) : val,
    }));
  };

  const [barResetKey, setBarResetKey] = useState<number>(0);

  useEffect(() => {
    if (safes.length > 0 && !safes.some(s => s.id === selectedSafeId)) {
      const defaultS = safes.find(s => s.isDefault) || safes[0];
      if (defaultS) setSelectedSafeId(defaultS.id);
    }
  }, [safes]);

  const paidAmount = activeTabObj.paidAmount;
  const setPaidAmount = (val: number | ((prev: number) => number)) => {
    updateActiveTabState(prev => ({
      ...prev,
      paidAmount: typeof val === 'function' ? val(prev.paidAmount) : val,
    }));
  };

  const hasCustomPaidAmount = activeTabObj.hasCustomPaidAmount;
  const setHasCustomPaidAmount = (val: boolean | ((prev: boolean) => boolean)) => {
    updateActiveTabState(prev => ({
      ...prev,
      hasCustomPaidAmount: typeof val === 'function' ? val(prev.hasCustomPaidAmount) : val,
    }));
  };

  const notes = activeTabObj.notes;
  const setNotes = (val: string | ((prev: string) => string)) => {
    updateActiveTabState(prev => ({
      ...prev,
      notes: typeof val === 'function' ? val(prev.notes) : val,
    }));
  };

  const invoiceDate = activeTabObj.invoiceDate;
  const setInvoiceDate = (val: string | ((prev: string) => string)) => {
    updateActiveTabState(prev => ({
      ...prev,
      invoiceDate: typeof val === 'function' ? val(prev.invoiceDate) : val,
    }));
  };

  const handleAddNewTab = () => {
    const nextNum = tabCounter + 1;
    const defaultS = safes.find(s => s.isDefault)?.id || safes[0]?.id || 'safe-pos';
    const newTab: PosTab = {
      id: `tab-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: `فاتورة ${nextNum}`,
      cart: [],
      selectedCustomerId: 'walk-in',
      customerSearchQuery: 'عميل نقدي عام',
      discount: 0,
      invoiceDiscountType: 'fixed',
      paymentMethod: 'cash',
      selectedSafeId: defaultS,
      paidAmount: 0,
      hasCustomPaidAmount: false,
      notes: '',
      invoiceDate: getTodayDateStr(),
    };
    setTabCounter(nextNum);
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setBarProductId('');
    setProductSearchQuery('');
    setBarPrice(0);
    setBarQty(1);
    setBarDiscount(0);
    setTimeout(() => productSearchInputRef.current?.focus(), 50);
  };

  const handleRequestCloseTab = (tabId: string) => {
    const target = tabs.find(t => t.id === tabId);
    if (!target) return;
    if (target.cart.length > 0) {
      setConfirmCloseTab(target);
    } else {
      executeCloseTab(tabId);
    }
  };

  const executeCloseTab = (tabId: string) => {
    setTabs(prev => {
      const filtered = prev.filter(t => t.id !== tabId);
      if (filtered.length === 0) {
        const defaultS = safes.find(s => s.isDefault)?.id || safes[0]?.id || 'safe-pos';
        const fresh: PosTab = {
          id: `tab-${Date.now()}`,
          title: `فاتورة 1`,
          cart: [],
          selectedCustomerId: 'walk-in',
          customerSearchQuery: 'عميل نقدي عام',
          discount: 0,
          invoiceDiscountType: 'fixed',
          paymentMethod: 'cash',
          selectedSafeId: defaultS,
          paidAmount: 0,
          hasCustomPaidAmount: false,
          notes: '',
          invoiceDate: getTodayDateStr(),
        };
        setTabCounter(1);
        setActiveTabId(fresh.id);
        return [fresh];
      }
      if (tabId === activeTabId) {
        const closingIndex = prev.findIndex(t => t.id === tabId);
        const nextActive = filtered[Math.max(0, closingIndex - 1)] || filtered[0];
        setActiveTabId(nextActive.id);
      }
      return filtered;
    });
    setConfirmCloseTab(null);
  };

  const [isPosFullscreen, setIsPosFullscreen] = useState<boolean>(false);

  // Customer Receipt Voucher & Statement Modals state
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [receiptAmount, setReceiptAmount] = useState<number>(0);
  const [receiptNotes, setReceiptNotes] = useState<string>('');
  const [showStatementModal, setShowStatementModal] = useState<boolean>(false);
  const [customerActionNotice, setCustomerActionNotice] = useState<string | null>(null);

  // Quick Add Item Bar state (Searchable product, Quantity, Price, Discount)
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [barProductId, setBarProductId] = useState<string>('');
  const [barQty, setBarQty] = useState<number>(1);
  const [barPrice, setBarPrice] = useState<number>(0);
  const [barDiscount, setBarDiscount] = useState<number>(0);
  const [barDiscountType, setBarDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState<boolean>(false);
  const [searchHighlightedIndex, setSearchHighlightedIndex] = useState<number>(0);

  // Arabic normalization for smooth substring search
  const normalizeArabic = (str: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .trim();
  };

  // Filter products by ANY PART OF THE WORD in name, barcode, or brand
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return products;
    const q = normalizeArabic(productSearchQuery);
    return products.filter(p => {
      const nameMatch = normalizeArabic(p.name).includes(q);
      const barcodeMatch = normalizeArabic(p.barcode || '').includes(q);
      const brandMatch = p.brand ? normalizeArabic(p.brand).includes(q) : false;
      const ingredientMatch = p.activeIngredient ? normalizeArabic(p.activeIngredient).includes(q) : false;
      return nameMatch || barcodeMatch || brandMatch || ingredientMatch;
    });
  }, [products, productSearchQuery]);

  // Sequential focus refs
  const productSearchInputRef = useRef<HTMLInputElement>(null);
  const productContainerRef = useRef<HTMLDivElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const productItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isKeyboardNavRef = useRef<boolean>(false);

  const qtyInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  const netPriceInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll dropdown to keep highlighted item fully visible
  useEffect(() => {
    if (!isProductDropdownOpen || !productDropdownRef.current) return;
    const container = productDropdownRef.current;

    if (searchHighlightedIndex === 0) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const activeItem = productItemRefs.current[searchHighlightedIndex] ||
      (container.querySelector(`[data-product-index="${searchHighlightedIndex}"]`) as HTMLElement | null);

    if (!activeItem) return;

    const containerRect = container.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    const headerEl = container.firstElementChild as HTMLElement | null;
    const headerHeight = headerEl ? headerEl.offsetHeight : 42;

    if (itemRect.bottom > containerRect.bottom) {
      const scrollOffset = itemRect.bottom - containerRect.bottom + 12;
      container.scrollBy({ top: scrollOffset, behavior: 'smooth' });
    } else if (itemRect.top < containerRect.top + headerHeight) {
      const scrollOffset = (containerRect.top + headerHeight) - itemRect.top + 12;
      container.scrollBy({ top: -scrollOffset, behavior: 'smooth' });
    }
  }, [searchHighlightedIndex, isProductDropdownOpen]);

  // Reset highlight index when search text changes
  useEffect(() => {
    setSearchHighlightedIndex(0);
    if (productDropdownRef.current) {
      productDropdownRef.current.scrollTop = 0;
    }
  }, [productSearchQuery]);

  // Click outside to close product dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productContainerRef.current && !productContainerRef.current.contains(e.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autofocus product search on mount
  useEffect(() => {
    productSearchInputRef.current?.focus();
  }, []);

  // Quick Add Customer Modal State
  const [showAddFarmerModal, setShowAddFarmerModal] = useState(false);
  const [newFarmerName, setNewFarmerName] = useState('');
  const [newFarmerPhone, setNewFarmerPhone] = useState('');
  const [newFarmerAddress, setNewFarmerAddress] = useState('');
  const [newFarmerCrops, setNewFarmerCrops] = useState('');

  // Customer Searchable Combobox State & Refs
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState<boolean>(false);
  const [customerHighlightedIndex, setCustomerHighlightedIndex] = useState<number>(0);
  const customerContainerRef = useRef<HTMLDivElement>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const customerItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const customerSearchInputRef = useRef<HTMLInputElement>(null);

  // Filtered customers matching query (permanent walk-in cash customer is always first without duplication)
  const filteredCustomers = useMemo(() => {
    const others = customers.filter(c => c.id !== 'walk-in');
    const walkInEntry = customers.find(c => c.id === 'walk-in') || {
      id: 'walk-in',
      name: 'عميل نقدي عام',
      currentBalance: 0,
      phone: '0000000000',
    };
    const all = [walkInEntry, ...others];
    if (!customerSearchQuery.trim()) return all;
    const q = normalizeArabic(customerSearchQuery);
    return all.filter(c =>
      normalizeArabic(c.name).includes(q) ||
      (c.phone && c.phone.includes(q))
    );
  }, [customers, customerSearchQuery]);

  // Auto-scroll customer dropdown to keep highlighted item in view
  useEffect(() => {
    if (!isCustomerDropdownOpen || !customerDropdownRef.current) return;
    const container = customerDropdownRef.current;
    if (customerHighlightedIndex === 0) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const activeItem = customerItemRefs.current[customerHighlightedIndex] ||
      (container.querySelector(`[data-customer-index="${customerHighlightedIndex}"]`) as HTMLElement | null);
    if (!activeItem) return;

    const containerRect = container.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    const headerEl = container.firstElementChild as HTMLElement | null;
    const headerHeight = headerEl ? headerEl.offsetHeight : 34;

    if (itemRect.bottom > containerRect.bottom) {
      const scrollOffset = itemRect.bottom - containerRect.bottom + 8;
      container.scrollBy({ top: scrollOffset, behavior: 'smooth' });
    } else if (itemRect.top < containerRect.top + headerHeight) {
      const scrollOffset = (containerRect.top + headerHeight) - itemRect.top + 8;
      container.scrollBy({ top: -scrollOffset, behavior: 'smooth' });
    }
  }, [customerHighlightedIndex, isCustomerDropdownOpen]);

  // Click outside to close customer dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerContainerRef.current && !customerContainerRef.current.contains(e.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Customer Select Handler
  const selectCustomer = (c: { id: string; name: string }) => {
    setSelectedCustomerId(c.id);
    setCustomerSearchQuery(c.name);
    setIsCustomerDropdownOpen(false);
    // إذا تم اختيار عميل نقدي عام، يمنع البيع الآجل أو الدفع الجزئي نهائياً
    if (c.id === 'walk-in') {
      if (paymentMethod === 'credit') {
        setPaymentMethod('cash');
      }
      setHasCustomPaidAmount(false);
    }
    setTimeout(() => {
      productSearchInputRef.current?.focus();
    }, 50);
  };

  // Customer Keyboard Navigation (Arrows & Enter)
  const handleCustomerSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredCustomers.length > 0) {
        setIsCustomerDropdownOpen(true);
        setCustomerHighlightedIndex(prev =>
          prev < filteredCustomers.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredCustomers.length > 0) {
        setIsCustomerDropdownOpen(true);
        setCustomerHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : filteredCustomers.length - 1
        );
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCustomers.length > 0) {
        const chosen = filteredCustomers[customerHighlightedIndex] || filteredCustomers[0];
        if (chosen) {
          selectCustomer(chosen);
        }
      }
    } else if (e.key === 'Escape') {
      setIsCustomerDropdownOpen(false);
    }
  };

  const [scaleNotification, setScaleNotification] = useState<string | null>(null);

  // Selected customer details
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const isWalkInSelected = !selectedCustomerId || selectedCustomerId === 'walk-in';

  const handleOpenReceiptModal = () => {
    if (!selectedCustomer || isWalkInSelected) {
      setCustomerActionNotice('حساب "عميل نقدي عام" نقدي فقط ولا يقبل المديونية أو سندات القبض الآجلة');
      setTimeout(() => setCustomerActionNotice(null), 3500);
      return;
    }
    setReceiptAmount(selectedCustomer.currentBalance > 0 ? selectedCustomer.currentBalance : 0);
    setReceiptNotes(`سند قبض نقدية من العميل: ${selectedCustomer.name}`);
    setShowReceiptModal(true);
  };

  const handleOpenStatementModal = () => {
    if (!selectedCustomer) {
      setCustomerActionNotice('يرجى اختيار عميل من القائمة لعرض كشف الحساب التفصيلي');
      setTimeout(() => setCustomerActionNotice(null), 3500);
      return;
    }
    setShowStatementModal(true);
  };

  // Selected bar product
  const selectedBarProduct = useMemo(() => {
    if (!barProductId) return null;
    return products.find(p => p.id === barProductId) || null;
  }, [products, barProductId]);

  // Customer Last Price History Modal (Opened via F10 or button click)
  const [showLastPriceModal, setShowLastPriceModal] = useState<boolean>(false);
  const [lastPriceTargetProduct, setLastPriceTargetProduct] = useState<Product | null>(null);

  const openCustomerLastPriceModal = (explicitProduct?: Product | null) => {
    const target =
      explicitProduct ||
      selectedBarProduct ||
      (isProductDropdownOpen && filteredProducts.length > 0
        ? filteredProducts[searchHighlightedIndex] || filteredProducts[0]
        : null) ||
      (cart.length > 0
        ? products.find(p => p.id === cart[cart.length - 1].productId) || null
        : null);

    if (!target) {
      setCustomerActionNotice(
        'يرجى اختيار الصنف أولاً ثم الضغط على زر F10 لعرض قائمة آخر سعر للعميل من هذا الصنف'
      );
      setTimeout(() => setCustomerActionNotice(null), 3500);
      return;
    }

    if (!selectedBarProduct && target) {
      setBarProductId(target.id);
      setBarPrice(target.sellingPrice);
      setBarQty(1);
      setBarDiscount(0);
      setProductSearchQuery(target.name);
      setIsProductDropdownOpen(false);
    }

    setLastPriceTargetProduct(target);
    setShowLastPriceModal(true);
  };

  // Global F10 listener to open Customer Last Price History Modal when an item is selected
  useEffect(() => {
    const handleGlobalF10 = (e: KeyboardEvent) => {
      if (e.key === 'F10') {
        e.preventDefault();
        if (showLastPriceModal) {
          setShowLastPriceModal(false);
        } else {
          openCustomerLastPriceModal();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalF10);
    return () => window.removeEventListener('keydown', handleGlobalF10);
  }, [
    showLastPriceModal,
    selectedBarProduct,
    isProductDropdownOpen,
    filteredProducts,
    searchHighlightedIndex,
    cart,
    products,
  ]);

  // Select product from combobox & populate quick add bar, keeping name in search until added
  const selectProduct = (product: Product) => {
    setBarProductId(product.id);
    setBarPrice(product.sellingPrice);
    setBarQty(1);
    setBarDiscount(0);
    setProductSearchQuery(product.name);
    setIsProductDropdownOpen(false);
    setTimeout(() => {
      qtyInputRef.current?.focus();
      qtyInputRef.current?.select();
    }, 50);
  };

  // Keyboard navigation inside Product Search (Arrows, Page, Home, End, Enter)
  const handleProductSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredProducts.length > 0) {
        setIsProductDropdownOpen(true);
        isKeyboardNavRef.current = true;
        setSearchHighlightedIndex(prev =>
          prev < filteredProducts.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredProducts.length > 0) {
        setIsProductDropdownOpen(true);
        isKeyboardNavRef.current = true;
        setSearchHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : filteredProducts.length - 1
        );
      }
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      if (filteredProducts.length > 0) {
        setIsProductDropdownOpen(true);
        isKeyboardNavRef.current = true;
        setSearchHighlightedIndex(prev =>
          Math.min(filteredProducts.length - 1, prev + 4)
        );
      }
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      if (filteredProducts.length > 0) {
        setIsProductDropdownOpen(true);
        isKeyboardNavRef.current = true;
        setSearchHighlightedIndex(prev =>
          Math.max(0, prev - 4)
        );
      }
    } else if (e.key === 'Home') {
      if (isProductDropdownOpen && filteredProducts.length > 0) {
        e.preventDefault();
        isKeyboardNavRef.current = true;
        setSearchHighlightedIndex(0);
      }
    } else if (e.key === 'End') {
      if (isProductDropdownOpen && filteredProducts.length > 0) {
        e.preventDefault();
        isKeyboardNavRef.current = true;
        setSearchHighlightedIndex(filteredProducts.length - 1);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = productSearchQuery.trim();

      // Check scale barcode
      if (/^2[0-9]{12}$/.test(trimmed)) {
        const prodCode = trimmed.substring(2, 7);
        const weightGrams = parseInt(trimmed.substring(7, 12), 10);
        const weightKg = Math.round((weightGrams / 1000) * 1000) / 1000;
        const targetProduct = products.find(
          p => p.barcode === trimmed || p.barcode === prodCode || p.barcode.endsWith(prodCode)
        );
        if (targetProduct) {
          addToCartWithQuantity(targetProduct, weightKg);
          const lineTotal = Math.round(weightKg * targetProduct.sellingPrice * 100) / 100;
          setScaleNotification(
            `⚖️ تم قراءة باركود ميزان: ${targetProduct.name} — الوزن: ${weightKg} كجم (الإجمالي: ${lineTotal} ${settings.currency})`
          );
          setBarProductId('');
          setProductSearchQuery('');
          setBarPrice(0);
          setBarQty(1);
          setBarDiscount(0);
          setIsProductDropdownOpen(false);
          setTimeout(() => setScaleNotification(null), 5000);
          return;
        }
      }

      // If dropdown is already closed and product is selected, Enter jumps to Quantity
      if (!isProductDropdownOpen && selectedBarProduct) {
        qtyInputRef.current?.focus();
        qtyInputRef.current?.select();
        return;
      }

      // Check exact barcode
      const exactProd = products.find(p => p.barcode.trim().toLowerCase() === trimmed.toLowerCase());
      if (exactProd) {
        selectProduct(exactProd);
        return;
      }

      // Choose highlighted item
      if (filteredProducts.length > 0) {
        const chosen = filteredProducts[searchHighlightedIndex] || filteredProducts[0];
        if (chosen) {
          selectProduct(chosen);
        }
      }
    } else if (e.key === 'Escape') {
      setIsProductDropdownOpen(false);
    }
  };

  // Sequential Enter focus handlers:
  // Quantity -> Add Item Directly to Invoice Table
  const handleQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const rawVal = parseFloat(e.currentTarget.value);
      const finalQty = !isNaN(rawVal) && rawVal > 0 ? rawVal : barQty;
      handleAddBarItem(finalQty);
    }
  };

  // Price -> Add Item (or Discount)
  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddBarItem();
    }
  };

  // Discount -> Add Item
  const handleDiscountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddBarItem();
    }
  };

  // Net Price -> Add Item & Return Focus to Product Search
  const handleNetPriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddBarItem();
    }
  };

  // Price after discount calculated for the Quick Add Bar (Per unit discount)
  const barPriceAfterDiscount = useMemo(() => {
    if (barPrice <= 0) return 0;
    if (barDiscount <= 0) return barPrice;
    if (barDiscountType === 'percent') {
      const discounted = barPrice * (1 - barDiscount / 100);
      return Math.max(0, Math.round(discounted * 100) / 100);
    } else {
      // Fixed discount is per unit
      const discounted = Math.max(0, barPrice - barDiscount);
      return Math.round(discounted * 100) / 100;
    }
  }, [barPrice, barDiscount, barDiscountType]);

  // When user edits "السعر بعد الخصم" directly in the Quick Add Bar
  const handleBarPriceAfterDiscountChange = (newNetPrice: number) => {
    if (barPrice <= 0) {
      setBarPrice(newNetPrice);
      setBarDiscount(0);
      return;
    }
    const safeNet = Math.max(0, Math.min(barPrice, newNetPrice));
    if (barDiscountType === 'percent') {
      const pct = Math.round(((barPrice - safeNet) / barPrice) * 10000) / 100;
      setBarDiscount(pct);
    } else {
      // Discount per unit:
      const unitDisc = Math.round((barPrice - safeNet) * 100) / 100;
      setBarDiscount(unitDisc);
    }
  };

  // Add Item from Quick Input Bar
  const handleAddBarItem = (overrideQty?: number | React.MouseEvent) => {
    if (!selectedBarProduct) {
      return;
    }
    const effectiveQty = typeof overrideQty === 'number' ? overrideQty : barQty;
    if (effectiveQty <= 0) return;

    const costPrice = Number(selectedBarProduct.purchasePrice) || 0;
    if (barPrice < costPrice || barPriceAfterDiscount < costPrice) {
      setCustomerActionNotice(
        `⛔ لا يمكن إضافة الصنف "${selectedBarProduct.name}" في جدول الفاتورة لأن سعر البيع (${barPriceAfterDiscount} ${settings.currency}) أقل من سعر التكلفة (${costPrice} ${settings.currency})!`
      );
      setTimeout(() => setCustomerActionNotice(null), 5000);
      priceInputRef.current?.focus();
      priceInputRef.current?.select();
      return;
    }

    const added = addToCartWithQuantity(
      selectedBarProduct,
      effectiveQty,
      barPrice,
      barDiscount,
      barDiscountType
    );
    if (!added) return;

    // Reset bar
    setBarProductId('');
    setProductSearchQuery('');
    setBarPrice(0);
    setBarQty(1);
    setBarDiscount(0);
    setBarResetKey(prev => prev + 1);
    setIsProductDropdownOpen(false);
    setTimeout(() => {
      productSearchInputRef.current?.focus();
    }, 50);
  };

  // Helper to calculate line total with cash or percentage discount (discount is per unit)
  const calculateItemTotal = (
    qty: number,
    price: number,
    discountVal = 0,
    discountTypeVal: 'fixed' | 'percent' = 'fixed'
  ) => {
    const gross = Math.round(qty * price * 100) / 100;
    if (discountVal <= 0) return gross;
    let unitDiscount = 0;
    if (discountTypeVal === 'percent') {
      unitDiscount = Math.round((price * (discountVal / 100)) * 100) / 100;
    } else {
      // Fixed discount is per unit (e.g. 10 LE discount per item, on 5 items = 50 LE discount)
      unitDiscount = Math.min(price, discountVal);
    }
    const totalDiscount = Math.round(unitDiscount * qty * 100) / 100;
    return Math.max(0, Math.round((gross - totalDiscount) * 100) / 100);
  };

  // Cart Actions
  const addToCartWithQuantity = (
    product: Product,
    customQty: number,
    customPrice?: number,
    customDiscount: number = 0,
    customDiscountType: 'fixed' | 'percent' = 'fixed'
  ): boolean => {
    if (!product || customQty <= 0) return false;

    const roundedQty = Math.round(customQty * 1000) / 1000;
    const finalPrice = customPrice !== undefined ? customPrice : product.sellingPrice;
    const lineTotal = calculateItemTotal(roundedQty, finalPrice, customDiscount, customDiscountType);
    const netUnitPrice = roundedQty > 0 ? Math.round((lineTotal / roundedQty) * 100) / 100 : finalPrice;
    const costPrice = Number(product.purchasePrice) || 0;

    if (finalPrice < costPrice || netUnitPrice < costPrice) {
      setCustomerActionNotice(
        `⛔ لا يمكن إضافة الصنف "${product.name}" في جدول الفاتورة لأن سعر البيع (${netUnitPrice} ${settings.currency}) أقل من سعر التكلفة (${costPrice} ${settings.currency})!`
      );
      setTimeout(() => setCustomerActionNotice(null), 5000);
      return false;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        const newQty = Math.round((existing.quantity + roundedQty) * 1000) / 1000;
        const finalDisc = customDiscount > 0 ? customDiscount : (existing.discount || 0);
        const finalDiscType = customDiscount > 0 ? customDiscountType : (existing.discountType || 'fixed');
        const newTotal = calculateItemTotal(newQty, finalPrice, finalDisc, finalDiscType);
        return prev.map(item =>
          item.productId === product.id
            ? {
                ...item,
                quantity: newQty,
                unitPrice: finalPrice,
                discount: finalDisc,
                discountType: finalDiscType,
                total: newTotal,
              }
            : item
        );
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            category: product.category,
            brand: product.brand,
            activeIngredient: product.activeIngredient,
            unit: product.unit,
            unitPrice: finalPrice,
            purchaseCost: product.purchasePrice,
            quantity: roundedQty,
            discount: customDiscount,
            discountType: customDiscountType,
            total: lineTotal,
          },
        ];
      }
    });
    return true;
  };

  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const roundedQty = Math.round(newQty * 1000) / 1000;

    setCart(prev =>
      prev.map(item =>
        item.productId === productId
          ? {
              ...item,
              quantity: roundedQty,
              total: calculateItemTotal(roundedQty, item.unitPrice, item.discount || 0, item.discountType || 'fixed'),
            }
          : item
      )
    );
  };

  const updateUnitPrice = (productId: string, newUnitPrice: number) => {
    const validPrice = Math.max(0, newUnitPrice);
    setCart(prev =>
      prev.map(item => {
        if (item.productId !== productId) return item;
        const costPrice = Number(item.purchaseCost) || 0;
        const newTotal = calculateItemTotal(item.quantity, validPrice, item.discount || 0, item.discountType || 'fixed');
        const netUnit = item.quantity > 0 ? Math.round((newTotal / item.quantity) * 100) / 100 : validPrice;
        if (validPrice < costPrice || netUnit < costPrice) {
          setCustomerActionNotice(
            `⛔ لا يُسمح بتعديل سعر الصنف "${item.productName}" لأقل من سعر التكلفة (${costPrice} ${settings.currency})!`
          );
          setTimeout(() => setCustomerActionNotice(null), 4000);
          return item;
        }
        return {
          ...item,
          unitPrice: validPrice,
          total: newTotal,
        };
      })
    );
  };

  const updateDiscount = (
    productId: string,
    newDiscount: number,
    newDiscountType?: 'fixed' | 'percent'
  ) => {
    const validDiscount = Math.max(0, newDiscount);
    setCart(prev =>
      prev.map(item => {
        if (item.productId !== productId) return item;
        const dType = newDiscountType || item.discountType || 'fixed';
        const costPrice = Number(item.purchaseCost) || 0;
        const newTotal = calculateItemTotal(item.quantity, item.unitPrice, validDiscount, dType);
        const netUnit = item.quantity > 0 ? Math.round((newTotal / item.quantity) * 100) / 100 : item.unitPrice;
        if (netUnit < costPrice) {
          setCustomerActionNotice(
            `⛔ لا يُسمح بخصم يجعل سعر البيع الصافي (${netUnit} ${settings.currency}) أقل من سعر التكلفة (${costPrice} ${settings.currency})!`
          );
          setTimeout(() => setCustomerActionNotice(null), 4000);
          return item;
        }
        return {
          ...item,
          discount: validDiscount,
          discountType: dType,
          total: newTotal,
        };
      })
    );
  };

  const updateNetPrice = (productId: string, newNetPrice: number) => {
    setCart(prev =>
      prev.map(item => {
        if (item.productId !== productId) return item;
        const validNet = Math.max(0, newNetPrice);
        const costPrice = Number(item.purchaseCost) || 0;
        if (validNet < costPrice) {
          setCustomerActionNotice(
            `⛔ لا يُسمح بتعديل السعر الصافي لأقل من سعر التكلفة (${costPrice} ${settings.currency})!`
          );
          setTimeout(() => setCustomerActionNotice(null), 4000);
          return item;
        }
        let newDiscount = 0;
        if (item.unitPrice > 0 && validNet < item.unitPrice) {
          if (item.discountType === 'percent') {
            newDiscount = Math.round(((item.unitPrice - validNet) / item.unitPrice) * 10000) / 100;
          } else {
            // Per unit discount
            newDiscount = Math.round((item.unitPrice - validNet) * 100) / 100;
          }
        }
        return {
          ...item,
          discount: newDiscount,
          total: calculateItemTotal(item.quantity, item.unitPrice, newDiscount, item.discountType || 'fixed'),
        };
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  // Calculations
  const subtotal = useMemo(() => {
    return Math.round(cart.reduce((sum, item) => sum + item.total, 0) * 100) / 100;
  }, [cart]);

  const effectiveInvoiceDiscount = useMemo(() => {
    if (discount <= 0 || subtotal <= 0) return 0;
    if (invoiceDiscountType === 'percent') {
      const pct = Math.min(100, Math.max(0, discount));
      return Math.round(subtotal * (pct / 100) * 100) / 100;
    }
    return Math.min(subtotal, Math.max(0, discount));
  }, [subtotal, discount, invoiceDiscountType]);

  const grandTotal = useMemo(() => {
    return Math.max(0, Math.round((subtotal - effectiveInvoiceDiscount) * 100) / 100);
  }, [subtotal, effectiveInvoiceDiscount]);

  const effectivePaidAmount = useMemo(() => {
    // حساب عميل نقدي عام لا يسمح له بفواتير آجل أو متبقي نهائياً
    if (isWalkInSelected) {
      return grandTotal;
    }
    if (paymentMethod === 'credit') {
      return hasCustomPaidAmount ? paidAmount : 0;
    }
    if (hasCustomPaidAmount) return paidAmount;
    return grandTotal;
  }, [isWalkInSelected, paymentMethod, grandTotal, paidAmount, hasCustomPaidAmount]);

  const remainingDebt = useMemo(() => {
    if (isWalkInSelected) return 0;
    return Math.max(0, Math.round((grandTotal - effectivePaidAmount) * 100) / 100);
  }, [isWalkInSelected, grandTotal, effectivePaidAmount]);

  // Save any specific POS Tab Invoice
  const handleSaveSpecificTab = (tabToSave: PosTab, shouldPrint = false): boolean => {
    if (!tabToSave || tabToSave.cart.length === 0) return false;

    const isTabWalkIn = !tabToSave.selectedCustomerId || tabToSave.selectedCustomerId === 'walk-in';
    const tabSub = Math.round(tabToSave.cart.reduce((sum, item) => sum + item.total, 0) * 100) / 100;
    const tabDisc =
      tabToSave.discount <= 0 || tabSub <= 0
        ? 0
        : tabToSave.invoiceDiscountType === 'percent'
        ? Math.round(tabSub * (Math.min(100, Math.max(0, tabToSave.discount)) / 100) * 100) / 100
        : Math.min(tabSub, Math.max(0, tabToSave.discount));
    const tabGrand = Math.max(0, Math.round((tabSub - tabDisc) * 100) / 100);
    const tabPaid = isTabWalkIn
      ? tabGrand
      : tabToSave.paymentMethod === 'credit'
      ? tabToSave.hasCustomPaidAmount
        ? tabToSave.paidAmount
        : 0
      : tabToSave.hasCustomPaidAmount
      ? tabToSave.paidAmount
      : tabGrand;
    const tabRem = isTabWalkIn ? 0 : Math.max(0, Math.round((tabGrand - tabPaid) * 100) / 100);

    if (isTabWalkIn && (tabToSave.paymentMethod === 'credit' || tabRem > 0 || tabPaid < tabGrand)) {
      setCustomerActionNotice(
        '⛔ مرفوض: حساب "عميل نقدي عام" لا يُسمح له بفواتير آجل أو متبقي مديونية نهائياً!'
      );
      setTimeout(() => setCustomerActionNotice(null), 4000);
      return false;
    }

    const custObj = customers.find(c => c.id === tabToSave.selectedCustomerId);
    const customerName = custObj ? custObj.name : 'عميل نقدي عام';
    const timeSuffix = new Date().toTimeString().slice(0, 8);
    const chosenIsoDate = tabToSave.invoiceDate
      ? new Date(`${tabToSave.invoiceDate}T${timeSuffix}`).toISOString()
      : new Date().toISOString();

    const newInvoice = createSalesInvoice({
      customerId: isTabWalkIn ? 'walk-in' : tabToSave.selectedCustomerId,
      customerName,
      items: tabToSave.cart,
      subtotal: tabSub,
      discount: tabDisc,
      total: tabGrand,
      paidAmount: isTabWalkIn ? tabGrand : tabPaid,
      paymentMethod: isTabWalkIn && tabToSave.paymentMethod === 'credit' ? 'cash' : tabToSave.paymentMethod,
      safeId: tabToSave.selectedSafeId,
      notes: tabToSave.notes,
      date: chosenIsoDate,
    });

    if (shouldPrint && newInvoice) {
      setPrintInvoice(newInvoice);
    }

    executeCloseTab(tabToSave.id);
    return true;
  };

  // Submit Active Invoice
  const handleSaveInvoice = (shouldPrint = false) => {
    handleSaveSpecificTab(activeTabObj, shouldPrint);
  };

  // Reset Form directly (internal use after save/confirm)
  const handleNewInvoice = () => {
    setCart([]);
    setDiscount(0);
    setInvoiceDiscountType('fixed');
    setPaidAmount(0);
    setHasCustomPaidAmount(false);
    setPaymentMethod('cash');
    setNotes('');
    setInvoiceDate(getTodayDateStr());
    setSelectedCustomerId('walk-in');
    setCustomerSearchQuery('عميل نقدي عام');
    setProductSearchQuery('');
    setBarProductId('');
    setBarPrice(0);
    setBarQty(1);
    setBarDiscount(0);
    productSearchInputRef.current?.focus();
  };

  // Request clearing or starting new invoice (shows Save vs Delete warning if items exist)
  const handleRequestClearOrNewInvoice = () => {
    if (cart.length > 0) {
      setConfirmCloseTab(activeTabObj);
    } else {
      handleNewInvoice();
    }
  };

  // Register global exit guard when any POS invoice tab has items
  useEffect(() => {
    const tabWithItems = activeTabObj.cart.length > 0 ? activeTabObj : tabs.find(t => t.cart.length > 0);
    if (tabWithItems && tabWithItems.cart.length > 0) {
      const tabSub = Math.round(tabWithItems.cart.reduce((sum, item) => sum + item.total, 0) * 100) / 100;
      const tabDisc =
        tabWithItems.discount <= 0 || tabSub <= 0
          ? 0
          : tabWithItems.invoiceDiscountType === 'percent'
          ? Math.round(tabSub * (Math.min(100, Math.max(0, tabWithItems.discount)) / 100) * 100) / 100
          : Math.min(tabSub, Math.max(0, tabWithItems.discount));
      const tabGrand = Math.max(0, Math.round((tabSub - tabDisc) * 100) / 100);

      registerInvoiceGuard({
        hasItems: true,
        itemCount: tabWithItems.cart.length,
        totalAmount: tabGrand,
        invoiceTitle: `نقطة البيع (POS) — ${tabWithItems.title}`,
        onSave: () => handleSaveSpecificTab(tabWithItems, false),
        onDiscard: () => executeCloseTab(tabWithItems.id),
      });
    } else {
      registerInvoiceGuard(null);
    }
    return () => {
      registerInvoiceGuard(null);
    };
  }, [tabs, activeTabObj, registerInvoiceGuard]);

  // Add Farmer Submit
  const handleAddFarmerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFarmerName.trim()) return;

    const created = addCustomer({
      name: newFarmerName.trim(),
      phone: newFarmerPhone.trim() || '—',
      address: newFarmerAddress.trim() || '—',
      cropTypes: newFarmerCrops.trim() || '—',
      farmArea: '',
      currentBalance: 0,
      notes: 'تمت إضافته من شاشة نقطة البيع',
    });

    if (created) {
      setSelectedCustomerId(created.id);
      setCustomerSearchQuery(created.name);
    }

    setNewFarmerName('');
    setNewFarmerPhone('');
    setNewFarmerAddress('');
    setNewFarmerCrops('');
    setShowAddFarmerModal(false);
  };

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (!activeShift) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-5 max-w-lg mx-auto my-12 font-sans text-xs select-none">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto text-amber-500 border border-amber-200 animate-bounce">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-extrabold text-slate-900 text-base mb-1">الوردية مغلقة حالياً بالخزينة!</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            لأسباب الرقابة المالية ومنع العجز النقدي، لا يمكن تسجيل أي مبيعات أو استخدام شاشة الكاشير قبل فتح الوردية وتصفير الخزينة من قبل الكاشير المسؤول.
          </p>
        </div>
        <button
          onClick={() => setActiveTab('calculator')}
          className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-md transition-all active:scale-95 inline-flex items-center gap-2"
        >
          <Clock className="w-4 h-4" />
          <span>الذهاب لفتح وردية جديدة الآن</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={
        isPosFullscreen
          ? 'fixed inset-0 z-50 bg-slate-100 text-slate-800 flex flex-col h-[100dvh] w-full overflow-hidden font-sans select-none no-print'
          : 'bg-slate-100 text-slate-800 flex flex-col h-[calc(100dvh-4.75rem)] w-full rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden font-sans select-none no-print'
      }
    >
      {/* POS MULTI-TAB INVOICE NAVIGATION BAR */}
      <div className="bg-slate-200/80 text-slate-800 px-2.5 py-1.5 flex items-center justify-between gap-2 border-b border-slate-200 shrink-0 no-print select-none">
        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-none">
          {tabs.map(t => {
            const isActive = t.id === activeTabId;
            const itemCount = t.cart.length;
            return (
              <div
                key={t.id}
                onClick={() => setActiveTabId(t.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all border ${
                  isActive
                    ? 'bg-amber-600 text-white border-amber-700 shadow-md shadow-amber-500/20'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <Receipt className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-amber-600'}`} />
                <span>{t.title}</span>
                {itemCount > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      isActive ? 'bg-white text-amber-700' : 'bg-amber-600 text-white'
                    }`}
                  >
                    {itemCount} {itemCount === 1 ? 'صنف' : 'أصناف'}
                  </span>
                )}
                {(tabs.length > 1 || itemCount > 0) && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleRequestCloseTab(t.id);
                    }}
                    className={`p-1 rounded-full transition-colors ${
                      isActive
                        ? 'hover:bg-white/20 text-white'
                        : 'hover:bg-rose-100 text-slate-400 hover:text-rose-600'
                    }`}
                    title="إغلاق / الخروج من الفاتورة"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleAddNewTab}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 shrink-0"
          title="فتح فاتورة بيع جديدة في تبويب جديد"
        >
          <Plus className="w-4 h-4" />
          <span>فاتورة جديدة</span>
        </button>
      </div>

      {/* CONFIRMATION MODAL WHEN CLOSING OR EXITING TAB WITH ITEMS (SAVE VS DELETE) */}
      {confirmCloseTab && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-50">
          <div className="bg-white rounded-2xl border-2 border-amber-500 shadow-2xl max-w-md w-full p-5 space-y-4 font-sans select-none">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">تحذير: الفاتورة تحتوي على أصناف!</h3>
                  <p className="text-xs text-slate-500 font-bold">{confirmCloseTab.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmCloseTab(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="تراجع والبقاء في الفاتورة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 font-bold leading-relaxed">
              تحتوي هذه الفاتورة على <span className="text-amber-700 font-mono font-black">{confirmCloseTab.cart.length}</span> صنف بقيمة إجمالية{' '}
              <span className="text-amber-700 font-mono font-black">
                {confirmCloseTab.cart.reduce((sum, i) => sum + i.total, 0).toLocaleString()} {settings.currency}
              </span>
              . هل ترغب في <span className="text-slate-900 font-black">حفظ الفاتورة</span> أم <span className="text-rose-600 font-black">حذفها</span>؟
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  const saved = handleSaveSpecificTab(confirmCloseTab, false);
                  if (saved) setConfirmCloseTab(null);
                }}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>حفظ الفاتورة</span>
              </button>

              <button
                type="button"
                onClick={() => executeCloseTab(confirmCloseTab.id)}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف الفاتورة</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setConfirmCloseTab(null)}
              className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-300 transition-all active:scale-95"
            >
              <span>تراجع (البقاء في الفاتورة)</span>
            </button>
          </div>
        </div>
      )}

      {/* POS HEADER: CUSTOMER & INVOICE DATA FIELDS IN THE CARD HEADER */}
      <header className={`bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white px-2.5 sm:px-3.5 py-2 border-b-2 border-slate-300 shadow-lg flex-shrink-0 relative z-30 ${isPosFullscreen ? '' : 'rounded-t-none'}`}>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-24 gap-2 items-center">
          {/* 1. اسم العميل + زر عميل جديد (أيقونة فقط بجوار حقل اختيار العميل) */}
          <div ref={customerContainerRef} className="col-span-2 sm:col-span-2 md:col-span-2 lg:col-span-11 flex items-center gap-1.5 relative z-40">
            <div className="relative flex-1 min-w-0">
              <input
                ref={customerSearchInputRef}
                type="text"
                placeholder="ابحث باسم العميل أو رقم الهاتف..."
                value={customerSearchQuery}
                onChange={e => {
                  setCustomerSearchQuery(e.target.value);
                  setIsCustomerDropdownOpen(e.target.value.trim().length > 0 && e.target.value !== 'عميل نقدي عام (بدون حساب آجل)');
                }}
                onFocus={() => {
                  if (customerSearchQuery.trim().length > 0 && customerSearchQuery !== 'عميل نقدي عام (بدون حساب آجل)') {
                    setIsCustomerDropdownOpen(true);
                  }
                }}
                onClick={() => {
                  if (customerSearchQuery.trim().length > 0 && customerSearchQuery !== 'عميل نقدي عام (بدون حساب آجل)') {
                    setIsCustomerDropdownOpen(true);
                  }
                }}
                onKeyDown={handleCustomerSearchKeyDown}
                className="w-full h-10 bg-white border-2 border-amber-500 rounded-xl py-1.5 px-3 text-[15px] font-black text-slate-900 focus:ring-2 focus:ring-amber-400 focus:outline-none shadow-sm placeholder:font-normal placeholder:text-slate-400"
              />

              {/* Customer Dropdown */}
              {isCustomerDropdownOpen && filteredCustomers.length > 0 && (
                <div
                  ref={customerDropdownRef}
                  className="absolute z-50 right-0 left-0 min-w-[280px] sm:min-w-[360px] mt-1 bg-white border-2 border-amber-600 rounded-2xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-100 animate-in fade-in-50 duration-100 text-slate-800 text-[15px]"
                >
                  <div className="bg-amber-700 text-white px-3 py-1.5 text-[14px] font-black flex items-center justify-between border-b border-amber-600 sticky top-0 z-10 shadow-sm">
                    <span className="text-amber-200">العملاء ({filteredCustomers.length})</span>
                  </div>
                  {filteredCustomers.map((c, idx) => {
                    const isSelected = c.id === selectedCustomerId;
                    const isHighlighted = idx === customerHighlightedIndex;
                    return (
                      <div
                        key={c.id}
                        data-customer-index={idx}
                        ref={el => { customerItemRefs.current[idx] = el; }}
                        onMouseDown={e => {
                          e.preventDefault();
                          selectCustomer(c);
                        }}
                        onMouseEnter={() => setCustomerHighlightedIndex(idx)}
                        className={`px-3 py-2 cursor-pointer flex items-center justify-between gap-2 transition-all text-[15px] ${
                          isHighlighted
                            ? 'bg-amber-600 text-white font-black'
                            : isSelected
                            ? 'bg-amber-50 text-slate-900 font-bold'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className={`text-[15px] truncate font-bold ${isHighlighted ? 'text-white' : 'text-slate-900'}`}>
                            {c.name}
                          </span>
                          {c.phone && (
                            <span className={`text-xs font-mono ${isHighlighted ? 'text-amber-100' : 'text-slate-500'}`}>
                              {c.phone}
                            </span>
                          )}
                        </div>
                        {c.currentBalance > 0 ? (
                          <span className={`text-xs px-2 py-0.5 rounded-md font-mono font-black shrink-0 ${
                            isHighlighted ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            مديونية: {c.currentBalance}
                          </span>
                        ) : (
                          <span className={`text-xs px-1.5 py-0.5 rounded-md font-mono shrink-0 ${
                            isHighlighted ? 'text-amber-100' : 'text-slate-400'
                          }`}>
                            خالص
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* زر عميل جديد: أيقونة فقط بجوار حقل اختيار العميل */}
            <button
              type="button"
              onClick={() => setShowAddFarmerModal(true)}
              className="h-10 w-10 bg-amber-600 hover:bg-amber-500 text-white rounded-xl flex items-center justify-center transition-all shadow-md active:scale-95 border-2 border-amber-400/60 shrink-0"
              title="إضافة عميل جديد"
            >
              <UserPlus className="w-4.5 h-4.5 shrink-0" />
            </button>
          </div>

          {/* 2. المديونية (lg:col-span-3، خط 15px) */}
          <div className="sm:col-span-1 md:col-span-1 lg:col-span-3">
            <div
              className={`h-10 py-1.5 px-2 rounded-xl font-mono font-black text-[15px] flex items-center justify-center text-center border-2 ${
                selectedCustomer && selectedCustomer.currentBalance > 0
                  ? 'bg-red-50 text-red-700 border-red-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
              title="المديونية السابقة على العميل"
            >
              {selectedCustomer ? selectedCustomer.currentBalance : 0}
            </div>
          </div>

          {/* 3. زر سند قبض (lg:col-span-2) */}
          <div className="sm:col-span-1 md:col-span-1 lg:col-span-2">
            <button
              type="button"
              onClick={handleOpenReceiptModal}
              className="w-full h-10 bg-amber-600 hover:bg-amber-500 text-white font-black py-1.5 px-1.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1 shadow-md transition-all active:scale-95 border-2 border-amber-400/60 truncate"
              title="إصدار سند قبض نقدية من حساب هذا العميل"
            >
              <Banknote className="w-4 h-4 text-amber-200 shrink-0" />
              <span className="truncate">سند قبض</span>
            </button>
          </div>

          {/* 4. زر كشف (lg:col-span-2) */}
          <div className="sm:col-span-1 md:col-span-1 lg:col-span-2">
            <button
              type="button"
              onClick={handleOpenStatementModal}
              className="w-full h-10 bg-slate-800 hover:bg-slate-800 text-white font-black py-1.5 px-1.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1 shadow-md transition-all active:scale-95 border-2 border-slate-300/60 truncate"
              title="عرض كشف حساب العميل"
            >
              <FileText className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="truncate">كشف</span>
            </button>
          </div>

          {/* 5. زر التكبير على اليسار دائماً وبجواره حقل التاريخ */}
          <div className="col-span-2 sm:col-span-2 md:col-span-2 lg:col-span-6 flex items-center justify-end gap-1.5">
            <input
              type="date"
              value={invoiceDate}
              onChange={e => setInvoiceDate(e.target.value)}
              onClick={e => {
                try {
                  (e.currentTarget as any).showPicker?.();
                } catch {}
              }}
              title="تاريخ الفاتورة"
              className="w-[112px] sm:w-[116px] shrink-0 h-10 bg-white hover:bg-slate-50 border-2 border-slate-300 focus:border-amber-500 rounded-xl py-1 px-1 text-center font-mono font-black text-slate-900 text-[15px] shadow-sm cursor-pointer focus:ring-2 focus:ring-amber-400 focus:outline-none [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:p-0 [&::-webkit-calendar-picker-indicator]:w-3.5 [&::-webkit-calendar-picker-indicator]:h-3.5 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />

            <button
              type="button"
              onClick={() => setIsPosFullscreen(prev => !prev)}
              className="h-10 w-10 bg-white/15 hover:bg-white/25 text-white rounded-xl border-2 border-white/30 flex items-center justify-center transition-all active:scale-95 shadow-md shrink-0"
              title={isPosFullscreen ? "إظهار الشريط الجانبي" : "تكبير ملء الشاشة"}
            >
              {isPosFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* POS MAIN SCROLLABLE BODY */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-2.5 space-y-2 text-xs font-sans">
        {/* Scale Toast Notification */}
        {scaleNotification && (
          <div className="bg-amber-700 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-between shadow-md animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-200 animate-bounce" />
              <span>{scaleNotification}</span>
            </div>
            <button onClick={() => setScaleNotification(null)} className="text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Customer Action Notice Toast */}
        {customerActionNotice && (
          <div className="bg-amber-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between shadow-lg animate-in fade-in-50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-200" />
              <span>{customerActionNotice}</span>
            </div>
            <button onClick={() => setCustomerActionNotice(null)} className="text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

      {/* Customer Receipt Voucher Modal (سند قبض للعميل) */}
      <VoucherModal
        isOpen={showReceiptModal && !!selectedCustomer}
        onClose={() => setShowReceiptModal(false)}
        direction="in"
        defaultPartyType="customer"
        defaultPartyId={selectedCustomer?.id}
        defaultAmount={receiptAmount}
        defaultNotes={receiptNotes}
        onSuccess={() => {
          setCustomerActionNotice(`تم إصدار سند قبض وتحديث حساب العميل بنجاح`);
          setTimeout(() => setCustomerActionNotice(null), 4000);
        }}
      />

      {/* Customer Account Statement Modal (كشف حساب للعميل) */}
      {showStatementModal && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-50 overflow-y-auto">
          <DetailedCustomerStatement
            initialCustomerId={selectedCustomer.id}
            isModal={true}
            onClose={() => setShowStatementModal(false)}
          />
        </div>
      )}

      {/* MIDDLE SECTION 1: "إضافة صنف" QUICK INPUT BAR (بدون عناوين الحقول، خط 15px لجميع الحقول والقائمة المنسدلة) */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-300 relative z-10 text-[15px]">
        <div className="p-2 bg-slate-50/80 rounded-2xl grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-12 gap-2 items-center text-[15px]">
          {/* 1. حقل البحث عن الصنف (lg:col-span-5، بدون جملة اختر الصنف) */}
          <div ref={productContainerRef} className="col-span-2 sm:col-span-2 lg:col-span-5 relative">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
              <input
                ref={productSearchInputRef}
                type="text"
                placeholder="ابحث بالاسم، المقاس، النوع، أو الباركود..."
                value={productSearchQuery}
                onChange={e => {
                  setProductSearchQuery(e.target.value);
                  setIsProductDropdownOpen(e.target.value.trim().length > 0);
                  isKeyboardNavRef.current = false;
                }}
                onFocus={() => {
                  if (productSearchQuery.trim().length > 0) {
                    setIsProductDropdownOpen(true);
                  }
                }}
                onClick={() => {
                  if (productSearchQuery.trim().length > 0) {
                    setIsProductDropdownOpen(true);
                  }
                }}
                onKeyDown={handleProductSearchKeyDown}
                className="w-full h-10 pr-9 pl-3 py-1.5 bg-white border border-slate-300 rounded-xl text-[15px] font-black text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-sm placeholder:font-normal placeholder:text-slate-400"
              />

              {/* Floating Dropdown Results with Auto-scroll */}
              {isProductDropdownOpen && filteredProducts.length > 0 && (
                <div
                  ref={productDropdownRef}
                  className="absolute z-40 right-0 left-0 min-w-[300px] sm:min-w-[500px] mt-1 bg-white border-2 border-amber-600 rounded-2xl shadow-2xl max-h-80 overflow-y-auto divide-y divide-slate-100 animate-in fade-in-50 duration-100 text-[15px]"
                >
                  <div className="bg-amber-700 text-white px-4 py-1.5 text-[15px] font-black flex items-center justify-between border-b border-amber-600 sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-200 text-[15px]">الأصناف المطابقة ({filteredProducts.length})</span>
                      <span className="text-[14px] bg-slate-800 text-amber-200 px-2 py-0.5 rounded-md font-mono font-bold">
                        {searchHighlightedIndex + 1} / {filteredProducts.length}
                      </span>
                    </div>
                  </div>
                  {filteredProducts.map((p, idx) => {
                    const isHighlighted = idx === searchHighlightedIndex;
                    return (
                      <div
                        key={p.id}
                        data-product-index={idx}
                        ref={el => { productItemRefs.current[idx] = el; }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectProduct(p);
                        }}
                        onMouseMove={() => {
                          if (isKeyboardNavRef.current) isKeyboardNavRef.current = false;
                          if (searchHighlightedIndex !== idx) setSearchHighlightedIndex(idx);
                        }}
                        className={`px-4 py-2 cursor-pointer flex items-center justify-between gap-4 transition-all text-[15px] ${
                          isHighlighted
                            ? 'bg-amber-600/85 text-white font-extrabold shadow-inner border-r-4 border-amber-300'
                            : 'hover:bg-amber-50/80 text-slate-900 font-bold border-r-4 border-transparent'
                        }`}
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[15px] font-black truncate ${isHighlighted ? 'text-white' : 'text-slate-900'}`}>
                              {p.name}
                            </span>
                          </div>
                          {/* التكلفة والمخزون مصغر بمقدار 0.3 درجة (12px بدلاً من 15px) */}
                          <div className={`text-[12px] font-black flex items-center gap-3 ${
                            isHighlighted ? 'text-rose-100' : 'text-red-600'
                          }`}>
                            <span className={isHighlighted ? 'text-rose-100' : 'text-red-600'}>
                              م.ت: <span className="font-mono font-black text-[12px]">{p.purchasePrice}</span>
                            </span>
                            <span className="opacity-40 text-slate-300">|</span>
                            <span className={isHighlighted ? 'text-rose-100' : 'text-red-600'}>
                              م : <span className="font-mono font-black text-[12px]">{p.quantity}</span>
                            </span>
                          </div>
                        </div>
                        <div className="text-left shrink-0">
                          <span className={`text-[15px] font-black px-3 py-1 rounded-xl font-mono inline-block shadow-sm ${
                            isHighlighted
                              ? 'bg-white text-slate-900 font-black shadow-md'
                              : 'bg-amber-100 text-slate-900 border border-amber-300'
                          }`}>
                            {p.sellingPrice}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 2. العدد (بدون كلمة العدد العلوية، خط 15px) */}
          <div className="sm:col-span-1 lg:col-span-1">
            <DecimalInput
              ref={qtyInputRef}
              value={barQty}
              onChange={val => setBarQty(val)}
              onKeyDown={handleQtyKeyDown}
              min={0.001}
              resetToken={barResetKey}
              title="العدد / الكمية"
              placeholder="العدد"
              className="w-full h-10 py-1.5 px-2 text-center bg-white border border-slate-300 rounded-xl font-black font-mono text-[15px] focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-sm"
            />
          </div>

          {/* 3. السعر (بدون كلمة السعر العلوية، خط 15px) */}
          <div className="sm:col-span-1 lg:col-span-1 relative">
            <DecimalInput
              ref={priceInputRef}
              value={barPrice}
              onChange={val => setBarPrice(val)}
              onKeyDown={handlePriceKeyDown}
              min={0}
              placeholder="السعر"
              title="سعر الوحدة (اضغط F10 لعرض آخر سعر للعميل)"
              resetToken={barResetKey}
              className="w-full h-10 py-1.5 px-2 text-center bg-white border border-slate-300 rounded-xl font-black font-mono text-[15px] focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-sm"
            />
          </div>

          {/* 4. الخصم + زر تبديل الخصم (نقدي / %) بجوار الحقل */}
          <div className="sm:col-span-1 lg:col-span-2 flex items-center gap-1">
            <DecimalInput
              ref={discountInputRef}
              value={barDiscount}
              onChange={val => setBarDiscount(val)}
              onKeyDown={handleDiscountKeyDown}
              min={0}
              placeholder="الخصم"
              title="خصم الوحدة"
              resetToken={barResetKey}
              className="w-full h-10 py-1.5 px-2 text-center bg-white border border-slate-300 rounded-xl font-black font-mono text-[15px] focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-sm"
            />
            <button
              type="button"
              onClick={() => setBarDiscountType(prev => (prev === 'percent' ? 'fixed' : 'percent'))}
              className={`h-10 px-2.5 text-[14px] font-black rounded-xl border transition-colors shrink-0 flex items-center justify-center ${
                barDiscountType === 'percent'
                  ? 'bg-amber-600 text-white border-amber-700'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-400'
              }`}
              title="تبديل نوع الخصم بين نقدي أو مئوي (%)"
            >
              {barDiscountType === 'percent' ? '%' : 'نقدي'}
            </button>
          </div>

          {/* 5. بعد الخصم (بدون كلمة السعر بعد الخصم العلوية، خط 15px) */}
          <div className="sm:col-span-1 lg:col-span-2">
            <DecimalInput
              ref={netPriceInputRef}
              value={barPriceAfterDiscount}
              onChange={handleBarPriceAfterDiscountChange}
              onKeyDown={handleNetPriceKeyDown}
              min={0}
              placeholder="بعد الخصم"
              title="بعد الخصم"
              resetToken={barResetKey}
              className="w-full h-10 py-1.5 px-2 text-center bg-amber-50/80 border border-amber-300 text-slate-900 rounded-xl font-black font-mono text-[15px] focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none shadow-sm"
            />
          </div>

          {/* 6. زر إضافة */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-1">
            <button
              type="button"
              disabled={
                !barProductId ||
                Boolean(
                  selectedBarProduct &&
                    (barPrice < selectedBarProduct.purchasePrice ||
                      barPriceAfterDiscount < selectedBarProduct.purchasePrice)
                )
              }
              onClick={() => handleAddBarItem()}
              className={`w-full h-10 font-black py-1.5 px-2 rounded-xl text-[15px] shadow-sm flex items-center justify-center gap-1 transition-all ${
                !barProductId ||
                Boolean(
                  selectedBarProduct &&
                    (barPrice < selectedBarProduct.purchasePrice ||
                      barPriceAfterDiscount < selectedBarProduct.purchasePrice)
                )
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-500 text-white active:scale-95 shadow-md'
              }`}
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>إضافة</span>
            </button>
          </div>
        </div>

        {/* Cost Blocking Error Alert if selling price < purchase cost */}
        {selectedBarProduct &&
          (barPrice < selectedBarProduct.purchasePrice ||
            barPriceAfterDiscount < selectedBarProduct.purchasePrice) && (
            <div className="mx-3 mb-2 bg-red-50 border-2 border-red-500 text-red-900 px-3 py-2 rounded-xl font-black text-xs flex items-center gap-2 shadow-sm animate-in fade-in-50">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>
                ⛔ مرفوض: سعر البيع الصافي ({barPriceAfterDiscount}) أقل من سعر التكلفة ({selectedBarProduct.purchasePrice}) — لا يقبل النظام إضافته في جدول الفاتورة!
              </span>
            </div>
          )}
      </div>

      {/* MIDDLE SECTION 2: ITEMS INVOICE TABLE (جدول الأصناف) - Font size 14.2px & centered vertically and horizontally */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-300 overflow-hidden text-[14.2px]">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-[14.2px]">
            <thead>
              <tr className="bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 text-white font-black text-[14.2px]">
                <th className="py-2 px-2 text-center align-middle w-10 text-[14.2px]">م</th>
                <th className="py-2 px-3 text-center align-middle text-[14.2px]">الصنف</th>
                <th className="py-2 px-2 text-center align-middle w-24 text-[14.2px]">العدد</th>
                <th className="py-2 px-2 text-center align-middle w-24 text-[14.2px]">السعر</th>
                <th className="py-2 px-2 text-center align-middle w-28 text-[14.2px]">خصم الوحدة</th>
                <th className="py-2 px-2 text-center align-middle w-28 text-[14.2px]">بعد الخصم</th>
                <th className="py-2 px-3 text-center align-middle w-28 text-[14.2px]">الإجمالي</th>
                <th className="py-2 px-2 text-center align-middle w-12 text-[14.2px]">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-300 text-[14.2px]">
              {cart.map((item, idx) => (
                <tr key={item.productId} className="hover:bg-amber-50/50 transition-colors text-[14.2px]">
                  {/* Row # */}
                  <td className="py-1.5 px-2 text-center align-middle font-black text-slate-700 font-mono text-[14.2px]">
                    {idx + 1}
                  </td>

                  {/* Item Name (Centered vertically & horizontally, 14.2px) */}
                  <td className="py-1.5 px-3 text-center align-middle text-[14.2px]">
                    <div className="flex flex-col items-center justify-center">
                      <div
                        onDoubleClick={() => {
                          const p = products.find(prod => prod.id === item.productId);
                          if (p) setEditingProductModal(p);
                        }}
                        className="text-[14.2px] font-black text-slate-950 cursor-pointer hover:text-amber-700 transition-colors text-center"
                        title="دبل كليك لتعديل بيانات الصنف"
                      >
                        {item.productName}
                      </div>
                      {item.purchaseCost !== undefined && item.unitPrice < item.purchaseCost && (
                        <div className="text-[14.2px] text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded font-bold inline-flex items-center justify-center gap-1 mt-0.5 border border-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>تحذير: سعر البيع أقل من التكلفة ({item.purchaseCost})</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Quantity / Count Direct Edit */}
                  <td className="py-1.5 px-2 text-center align-middle text-[14.2px]">
                    <div className="flex items-center justify-center">
                      <DecimalInput
                        value={item.quantity}
                        onChange={val => updateQuantity(item.productId, val)}
                        min={0}
                        className="w-20 h-8 leading-none text-center font-black font-mono text-[14.2px] py-1 px-1 bg-slate-50 border-2 border-slate-500 rounded-lg focus:ring-2 focus:ring-amber-600 focus:bg-white focus:outline-none shadow-xs"
                      />
                    </div>
                  </td>

                  {/* Price Direct Edit */}
                  <td className="py-1.5 px-2 text-center align-middle text-[14.2px]">
                    <div className="flex items-center justify-center">
                      <DecimalInput
                        value={item.unitPrice}
                        onChange={val => updateUnitPrice(item.productId, val)}
                        min={0}
                        className="w-24 h-8 leading-none text-center font-black font-mono text-[14.2px] py-1 px-1 bg-slate-50 border-2 border-slate-500 rounded-lg focus:ring-2 focus:ring-amber-600 focus:bg-white focus:outline-none shadow-xs"
                      />
                    </div>
                  </td>

                  {/* Item Discount in Table + زر تبديل الخصم (نقدي / %) بجوار الحقل */}
                  <td className="py-1.5 px-2 text-center align-middle text-[14.2px]">
                    <div className="flex items-center justify-center gap-1">
                      <DecimalInput
                        value={item.discount || 0}
                        onChange={val => updateDiscount(item.productId, val)}
                        min={0}
                        className="w-20 h-8 leading-none text-center font-black font-mono text-[14.2px] py-1 px-1 bg-slate-50 border-2 border-slate-500 rounded-lg focus:ring-2 focus:ring-amber-600 focus:bg-white focus:outline-none shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateDiscount(
                            item.productId,
                            item.discount || 0,
                            item.discountType === 'percent' ? 'fixed' : 'percent'
                          )
                        }
                        className={`h-8 px-2 leading-none text-[14.2px] font-black rounded-lg border-2 transition-colors shrink-0 flex items-center justify-center ${
                          item.discountType === 'percent'
                            ? 'bg-amber-600 text-white border-amber-800'
                            : 'bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-500'
                        }`}
                        title="تبديل نوع الخصم بين نقدي أو مئوي (%)"
                      >
                        {item.discountType === 'percent' ? '%' : 'نقدي'}
                      </button>
                    </div>
                  </td>

                  {/* Price After Discount */}
                  <td className="py-1.5 px-2 text-center align-middle text-[14.2px]">
                    <div className="flex items-center justify-center">
                      <DecimalInput
                        value={item.quantity > 0 ? Math.round((item.total / item.quantity) * 100) / 100 : item.unitPrice}
                        onChange={val => updateNetPrice(item.productId, val)}
                        min={0}
                        className="w-24 h-8 leading-none text-center font-black font-mono text-[14.2px] py-1 px-1 bg-amber-50 border-2 border-amber-500 text-slate-900 rounded-lg focus:ring-2 focus:ring-amber-600 focus:bg-white focus:outline-none shadow-xs"
                      />
                    </div>
                  </td>

                  {/* Line Total (Dark Red & 14.2px, centered) */}
                  <td className="py-1.5 px-3 text-center align-middle font-black font-mono text-red-800 text-[14.2px]">
                    {item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Trash Action */}
                  <td className="py-1.5 px-2 text-center align-middle text-[14.2px]">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="text-slate-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center"
                        title="حذف الصنف"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {cart.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center align-middle text-slate-400 font-bold text-[14.2px]">
                    سلة الفاتورة فارغة.. اختر صنفاً من الشريط أعلاه لإضافته
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* FIXED BOTTOM FOOTER: 2 HARMONIOUS ROWS FOR TOTALS, PAYMENT METHODS & INVOICE BUTTONS */}
      <footer className="shrink-0 sticky bottom-0 px-2 sm:px-2.5 py-1.5 bg-slate-100 border-t-2 border-slate-300 z-30">
        <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-600 p-2 space-y-1.5 font-sans">
          {/* السطر الأول: إجماليات الفاتورة والخصم والمدفوع والمتبقي */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 items-stretch">
            {/* 1. إجمالي قبل الخصم */}
            <div className="h-10 bg-slate-100 px-2.5 rounded-xl border-2 border-slate-400 flex items-center justify-between gap-1.5">
              <span className="text-[13.5px] font-black text-slate-700 shrink-0">قبل الخصم:</span>
              <span className="font-mono font-black text-slate-950 text-[15px] truncate">
                {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* 2. خصم الفاتورة + زر تبديل نقدي / مئوي */}
            <div className="h-10 bg-rose-50/70 px-2 rounded-xl border-2 border-rose-300 flex items-center justify-between gap-1">
              <span className="text-[13.5px] font-black text-rose-900 shrink-0">خصم الفاتورة:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max={invoiceDiscountType === 'percent' ? 100 : subtotal}
                  value={discount || ''}
                  placeholder="0"
                  onChange={e => setDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-16 sm:w-20 h-7 text-center border-2 border-rose-400 rounded-lg text-[15px] font-mono font-black text-red-700 focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white"
                />
                <button
                  type="button"
                  onClick={() => setInvoiceDiscountType(prev => (prev === 'percent' ? 'fixed' : 'percent'))}
                  className={`h-7 px-2 leading-none text-[13px] font-black rounded-lg border-2 transition-colors shrink-0 flex items-center justify-center ${
                    invoiceDiscountType === 'percent'
                      ? 'bg-amber-600 text-white border-amber-800'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-500'
                  }`}
                  title="تبديل خصم الفاتورة بين نقدي أو مئوي (%)"
                >
                  {invoiceDiscountType === 'percent' ? '%' : 'نقدي'}
                </button>
              </div>
            </div>

            {/* 3. إجمالي الفاتورة النهائي */}
            <div className="h-10 bg-gradient-to-r from-amber-700 to-amber-600 text-white px-2.5 rounded-xl border-2 border-amber-800 shadow-sm flex items-center justify-between gap-1.5">
              <span className="text-[13.5px] font-black text-amber-100 shrink-0">الصافي النهائي:</span>
              <span className="font-mono font-black text-amber-200 text-[16px] truncate">
                {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* 4. المبلغ المدفوع */}
            <div className="h-10 bg-amber-50 text-slate-900 px-2 rounded-xl border-2 border-amber-500 flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[13.5px] font-black text-slate-800">المدفوع:</span>
                {!isWalkInSelected && effectivePaidAmount < grandTotal && (
                  <button
                    type="button"
                    onClick={() => {
                      setPaidAmount(grandTotal);
                      setHasCustomPaidAmount(true);
                    }}
                    className="text-[11px] bg-amber-600 hover:bg-amber-700 text-white px-1.5 py-0.5 rounded-md font-black transition-colors leading-none"
                    title="سداد كامل المبلغ"
                  >
                    كامل
                  </button>
                )}
              </div>
              <input
                type="number"
                step="any"
                min="0"
                max={grandTotal}
                readOnly={isWalkInSelected}
                value={effectivePaidAmount || ''}
                placeholder="0"
                title={
                  isWalkInSelected
                    ? 'حساب عميل نقدي عام لا يسمح له بالدفع الجزئي أو الآجل نهائياً'
                    : 'المبلغ المدفوع'
                }
                onClick={() => {
                  if (isWalkInSelected) {
                    setCustomerActionNotice(
                      '⛔ حساب "عميل نقدي عام" نقدي فقط ولا يُسمح له بالدفع الجزئي أو الآجل نهائياً'
                    );
                    setTimeout(() => setCustomerActionNotice(null), 3500);
                  }
                }}
                onChange={e => {
                  if (isWalkInSelected) return;
                  const val = Math.max(0, Number(e.target.value));
                  setPaidAmount(val);
                  setHasCustomPaidAmount(true);
                }}
                className={`w-20 sm:w-24 h-7 text-center font-mono font-black text-[15px] text-slate-900 border-2 border-amber-500 rounded-lg focus:outline-none ${
                  isWalkInSelected
                    ? 'bg-amber-100/80 cursor-not-allowed'
                    : 'bg-white focus:ring-2 focus:ring-amber-700'
                }`}
              />
            </div>

            {/* 5. المتبقي (مديونية آجل) */}
            <div
              className={`h-10 px-2.5 rounded-xl border-2 flex items-center justify-between gap-1.5 ${
                remainingDebt > 0
                  ? 'bg-red-50 text-red-950 border-red-400'
                  : 'bg-amber-50/60 text-slate-900 border-amber-400'
              }`}
            >
              <span className="text-[13.5px] font-black shrink-0">المتبقي آجل:</span>
              <span
                className={`font-mono font-black text-[15px] truncate ${
                  remainingDebt > 0 ? 'text-red-700' : 'text-amber-800'
                }`}
              >
                {remainingDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* السطر الثاني: طرق الدفع + الخزينة + أزرار الفاتورة */}
          <div className="pt-1.5 border-t border-slate-300 flex flex-wrap lg:flex-nowrap items-center justify-between gap-1.5">
            {/* طرق الدفع + الخزينة */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-1 shrink-0">
                {[
                  {
                    id: 'cash',
                    label: 'نقدي',
                    activeClass: 'bg-amber-700 text-white border-amber-950 shadow-sm',
                  },
                  {
                    id: 'vodafone',
                    label: 'فودوفون كاش',
                    activeClass: 'bg-rose-700 text-white border-rose-950 shadow-sm',
                  },
                  {
                    id: 'instapay',
                    label: 'انيستا',
                    activeClass: 'bg-purple-700 text-white border-purple-950 shadow-sm',
                  },
                  {
                    id: 'credit',
                    label: 'آجل',
                    activeClass: 'bg-amber-600 text-white border-amber-950 shadow-sm',
                  },
                ].map(method => {
                  const isSelected = paymentMethod === method.id;
                  const isCreditBlocked = method.id === 'credit' && isWalkInSelected;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      title={
                        isCreditBlocked
                          ? 'مرفوض: حساب عميل نقدي عام لا يسمح له بفواتير آجل نهائياً'
                          : method.label
                      }
                      onClick={() => {
                        if (isCreditBlocked) {
                          setCustomerActionNotice(
                            '⛔ لا يُسمح بإصدار فواتير آجل لحساب "عميل نقدي عام" نهائياً — يرجى اختيار عميل مسجل أولاً!'
                          );
                          setTimeout(() => setCustomerActionNotice(null), 4000);
                          return;
                        }
                        setPaymentMethod(method.id as PaymentMethod);
                        if (method.id === 'cash') {
                          setHasCustomPaidAmount(false);
                          const posSafe =
                            safes.find(s => s.type === 'pos_drawer' || s.type === 'pos') ||
                            safes.find(s => s.isDefault);
                          if (posSafe) setSelectedSafeId(posSafe.id);
                        } else if (method.id === 'vodafone' || method.id === 'instapay') {
                          setHasCustomPaidAmount(false);
                          const walletSafe = safes.find(
                            s =>
                              s.type === 'wallet' ||
                              s.name.includes('كاش') ||
                              s.name.includes('انستا') ||
                              s.name.includes('محفظة')
                          );
                          if (walletSafe) setSelectedSafeId(walletSafe.id);
                        } else if (method.id === 'credit') {
                          setHasCustomPaidAmount(false);
                        }
                      }}
                      className={`h-9 px-2.5 rounded-xl border-2 text-[13.5px] font-black flex items-center justify-center transition-all shrink-0 ${
                        isCreditBlocked
                          ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed line-through'
                          : isSelected
                          ? method.activeClass
                          : 'bg-slate-50 text-slate-800 border-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <span>{method.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* اختيار الخزينة (مكبر بمقدار 1.5 درجة عرضياً) */}
              <select
                value={selectedSafeId}
                onChange={e => setSelectedSafeId(e.target.value)}
                className="h-9 w-[240px] sm:w-[330px] max-w-full px-2.5 bg-slate-50 border-2 border-slate-400 rounded-xl text-[13.5px] font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-600 focus:outline-none text-center truncate"
              >
                {safes.map(s => (
                  <option key={s.id} value={s.id}>
                    [{s.type === 'cash' || s.type === 'pos_drawer' || s.type === 'pos' ? 'خزينة' : s.type === 'wallet' ? 'محفظة' : 'بنك'}] {s.name} ({s.balance.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {/* أزرار التحكم بالفاتورة */}
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
              {/* حفظ وطباعة */}
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => handleSaveInvoice(true)}
                className={`h-9 px-3.5 rounded-xl text-[13.5px] font-black flex items-center gap-1.5 shadow-sm transition-all border-2 ${
                  cart.length === 0
                    ? 'bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white border-amber-950 active:scale-95'
                }`}
              >
                <Printer className="w-4 h-4 text-amber-200 shrink-0" />
                <span>حفظ وطباعة</span>
              </button>

              {/* حفظ فقط */}
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => handleSaveInvoice(false)}
                className={`h-9 px-3 rounded-xl text-[13.5px] font-black flex items-center gap-1.5 shadow-sm transition-all border-2 ${
                  cart.length === 0
                    ? 'bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border-amber-950 active:scale-95'
                }`}
              >
                <Save className="w-4 h-4 text-amber-200 shrink-0" />
                <span>حفظ فقط</span>
              </button>

              {/* فاتورة جديدة */}
              <button
                type="button"
                onClick={handleRequestClearOrNewInvoice}
                className="h-9 bg-amber-600 hover:bg-slate-500 text-white font-black px-3 rounded-xl text-[13.5px] flex items-center gap-1.5 transition-all border-2 border-amber-700 shadow-sm active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-200 shrink-0" />
                <span>فاتورة جديدة</span>
              </button>

              {/* تفريغ / حذف الفاتورة */}
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={handleRequestClearOrNewInvoice}
                className={`h-9 px-2.5 rounded-xl text-[13.5px] font-black flex items-center gap-1 transition-all border-2 ${
                  cart.length === 0
                    ? 'bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-400 shadow-xs active:scale-95'
                }`}
                title="تفريغ / حذف الفاتورة"
              >
                <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                <span>حذف الفاتورة</span>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* QUICK ADD CUSTOMER MODAL */}
      <CustomerModal
        isOpen={showAddFarmerModal}
        onClose={() => setShowAddFarmerModal(false)}
        onSuccess={(c) => {
          selectCustomer(c);
        }}
      />

      {/* CUSTOMER LAST PRICE HISTORY MODAL (F10) */}
      <CustomerLastPriceModal
        isOpen={showLastPriceModal}
        onClose={() => {
          setShowLastPriceModal(false);
          setTimeout(() => {
            priceInputRef.current?.focus();
            priceInputRef.current?.select();
          }, 50);
        }}
        product={lastPriceTargetProduct || selectedBarProduct}
        customer={selectedCustomer || null}
        customerId={selectedCustomerId}
        customerNameLabel={selectedCustomer ? selectedCustomer.name : customerSearchQuery || 'عميل نقدي عام'}
        salesInvoices={salesInvoices}
        onApplyPrice={(unitPrice, disc = 0, discType = 'fixed') => {
          setBarPrice(unitPrice);
          setBarDiscount(disc);
          setBarDiscountType(discType);
          setBarResetKey(prev => prev + 1);
        }}
      />

      {/* EDIT PRODUCT MODAL (Opened on Double Click of Invoice Item) */}
      {editingProductModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 font-sans text-right" dir="rtl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-600" />
                <span>تعديل بيانات الصنف: {editingProductModal.name}</span>
              </h3>
              <button
                onClick={() => setEditingProductModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProductEdit} className="space-y-4 text-xs">
              <div>
                <label className="font-black text-slate-800 block mb-1">اسم الصنف *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full py-2.5 px-3 border-2 border-slate-300 rounded-xl font-bold text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-black text-slate-800 block mb-1">سعر الشراء (التكلفة) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={editForm.purchasePrice}
                    onChange={e => setEditForm({ ...editForm, purchasePrice: Number(e.target.value) })}
                    className="w-full py-2.5 px-3 border-2 border-slate-300 rounded-xl font-mono font-bold text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="font-black text-slate-800 block mb-1">سعر البيع *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={editForm.sellingPrice}
                    onChange={e => setEditForm({ ...editForm, sellingPrice: Number(e.target.value) })}
                    className="w-full py-2.5 px-3 border-2 border-amber-400 rounded-xl font-mono font-black text-sm text-slate-800 bg-amber-50/70 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-black text-slate-800 block mb-1">الكمية بالمخزن *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={editForm.quantity}
                    onChange={e => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                    className="w-full py-2.5 px-3 border-2 border-slate-300 rounded-xl font-mono font-bold text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="font-black text-slate-800 block mb-1">الوحدة *</label>
                  <input
                    type="text"
                    required
                    value={editForm.unit}
                    onChange={e => setEditForm({ ...editForm, unit: e.target.value })}
                    className="w-full py-2.5 px-3 border-2 border-slate-300 rounded-xl font-bold text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-black text-slate-800 block mb-1">الباركود</label>
                <input
                  type="text"
                  value={editForm.barcode}
                  onChange={e => setEditForm({ ...editForm, barcode: e.target.value })}
                  className="w-full py-2.5 px-3 border-2 border-slate-300 rounded-xl font-mono text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-200 mt-4">
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-black py-3 rounded-xl shadow-md transition-all active:scale-95 text-xs sm:text-sm"
                >
                  حفظ وتحديث الصنف
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProductModal(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-5 rounded-xl text-xs sm:text-sm transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
