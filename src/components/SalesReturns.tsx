import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Product, InvoiceItem, PaymentMethod } from '../types';
import { VoucherModal } from './VoucherModal';
import { CustomerModal } from './CustomerModal';
import { CustomerLastPriceModal } from './CustomerLastPriceModal';
import { DetailedCustomerStatement } from './DetailedCustomerStatement';
import {
  RotateCcw,
  Plus,
  PlusCircle,
  Search,
  Trash2,
  CheckCircle2,
  Eye,
  X,
  FileText,
  Banknote,
  AlertTriangle,
  Save,
  History,
  UserPlus,
  Maximize2,
  Minimize2
} from 'lucide-react';

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
DecimalInput.displayName = 'DecimalInput';

interface SalesReturnsProps {
  initialTab?: 'create' | 'list';
}

export const SalesReturns: React.FC<SalesReturnsProps> = ({ initialTab = 'create' }) => {
  const {
    salesReturns,
    createSalesReturn,
    deleteSalesReturn,
    customers,
    products,
    safes,
    settings,
    currentUser,
    salesInvoices,
    setActiveTab: setGlobalActiveTab,
    registerInvoiceGuard,
    requestInvoiceClearConfirm,
  } = useApp();

  const [activeTab, setActiveTabState] = useState<'create' | 'list'>(initialTab);
  useEffect(() => {
    setActiveTabState(initialTab);
  }, [initialTab]);

  const setActiveTabMode = (mode: 'create' | 'list') => {
    setGlobalActiveTab(mode === 'list' ? 'sales_returns_list' : 'sales_returns');
  };
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Safe / Account Selector State
  const [selectedSafeId, setSelectedSafeId] = useState<string>(
    safes.find(s => s.isDefault)?.id || safes[0]?.id || 'safe-pos'
  );

  useEffect(() => {
    if (safes.length > 0 && !safes.some(s => s.id === selectedSafeId)) {
      const defaultS = safes.find(s => s.isDefault) || safes[0];
      if (defaultS) setSelectedSafeId(defaultS.id);
    }
  }, [safes]);

  // Customer Receipt Voucher, Statement & Quick Add Customer Modals state
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [receiptAmount, setReceiptAmount] = useState<number>(0);
  const [receiptNotes, setReceiptNotes] = useState<string>('');
  const [showStatementModal, setShowStatementModal] = useState<boolean>(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);
  const [customerActionNotice, setCustomerActionNotice] = useState<string | null>(null);

  const getTodayDateStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [invoiceDate, setInvoiceDate] = useState<string>(getTodayDateStr);

  // Form State for Sales Return (POS Layout)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walk-in');
  const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState<string>('');
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [hasCustomPaidAmount, setHasCustomPaidAmount] = useState<boolean>(false);
  const [discount, setDiscount] = useState<number>(0);
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [barResetKey, setBarResetKey] = useState<number>(0);

  // Quick Add Item Bar state
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [barProductId, setBarProductId] = useState<string>('');
  const [barQty, setBarQty] = useState<number>(1);
  const [barPrice, setBarPrice] = useState<number>(0);
  const [barDiscount, setBarDiscount] = useState<number>(0);
  const [barDiscountType, setBarDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState<boolean>(false);
  const [searchHighlightedIndex, setSearchHighlightedIndex] = useState<number>(0);
  const isKeyboardNavRef = useRef<boolean>(false);

  // Customer Searchable Combobox State & Refs
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('عميل نقدي عام');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState<boolean>(false);
  const [customerHighlightedIndex, setCustomerHighlightedIndex] = useState<number>(0);
  const customerContainerRef = useRef<HTMLDivElement>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const customerItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const customerSearchInputRef = useRef<HTMLInputElement>(null);

  // Sequential focus refs
  const productSearchInputRef = useRef<HTMLInputElement>(null);
  const productContainerRef = useRef<HTMLDivElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const productItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  const netPriceInputRef = useRef<HTMLInputElement>(null);

  const normalizeArabic = (str: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .trim();
  };

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

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const isWalkInSelected = !selectedCustomerId || selectedCustomerId === 'walk-in';

  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return products;
    const q = normalizeArabic(productSearchQuery);
    return products.filter(p => {
      const nameMatch = normalizeArabic(p.name).includes(q);
      const barcodeMatch = normalizeArabic(p.barcode || '').includes(q);
      const brandMatch = p.brand ? normalizeArabic(p.brand).includes(q) : false;
      return nameMatch || barcodeMatch || brandMatch;
    });
  }, [products, productSearchQuery]);

  const selectedBarProduct = useMemo(() => {
    if (!barProductId) return null;
    return products.find(p => p.id === barProductId) || null;
  }, [products, barProductId]);

  // Auto-scroll product dropdown
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

  useEffect(() => {
    setSearchHighlightedIndex(0);
    if (productDropdownRef.current) {
      productDropdownRef.current.scrollTop = 0;
    }
  }, [productSearchQuery]);

  // Auto-scroll customer dropdown
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productContainerRef.current && !productContainerRef.current.contains(e.target as Node)) {
        setIsProductDropdownOpen(false);
      }
      if (customerContainerRef.current && !customerContainerRef.current.contains(e.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectCustomer = (c: { id: string; name: string }) => {
    setSelectedCustomerId(c.id);
    setCustomerSearchQuery(c.name);
    setIsCustomerDropdownOpen(false);
    if (c.id === 'walk-in') {
      if (refundMethod === 'credit') {
        setRefundMethod('cash');
      }
      setHasCustomPaidAmount(false);
    }
    setTimeout(() => {
      productSearchInputRef.current?.focus();
    }, 50);
  };

  const handleCustomerSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredCustomers.length > 0) {
        setIsCustomerDropdownOpen(true);
        setCustomerHighlightedIndex(prev => (prev < filteredCustomers.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredCustomers.length > 0) {
        setIsCustomerDropdownOpen(true);
        setCustomerHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredCustomers.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCustomers.length > 0) {
        const chosen = filteredCustomers[customerHighlightedIndex] || filteredCustomers[0];
        if (chosen) selectCustomer(chosen);
      }
    } else if (e.key === 'Escape') {
      setIsCustomerDropdownOpen(false);
    }
  };

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
      setCustomerActionNotice('يرجى اختيار عميل من القائمة لعرض كشف الحساب');
      setTimeout(() => setCustomerActionNotice(null), 3500);
      return;
    }
    setShowStatementModal(true);
  };

  const [showLastPriceModal, setShowLastPriceModal] = useState<boolean>(false);
  const [lastPriceTargetProduct, setLastPriceTargetProduct] = useState<Product | null>(null);
  const [returnExceptionApproved, setReturnExceptionApproved] = useState<boolean>(false);
  const [exceptionProductIds, setExceptionProductIds] = useState<Record<string, boolean>>({});

  const getCustomerProductHistory = (product: Product | null) => {
    if (!product) {
      return {
        hasPurchasedBefore: false,
        invoiceCount: 0,
        totalQtyPurchased: 0,
        lastDeal: null as null | {
          invoiceNumber: string;
          date: string;
          quantity: number;
          unitPrice: number;
          discount: number;
          discountType: 'fixed' | 'percent';
          netUnitPrice: number;
        },
      };
    }

    const normProdName = normalizeArabic(product.name);
    const normCustName = normalizeArabic(selectedCustomer?.name || customerSearchQuery || '');
    const isWalkIn = !selectedCustomerId || selectedCustomerId === 'walk-in';
    const trimmedOrigInv = originalInvoiceNumber.trim().toLowerCase();

    const sortedInvoices = [...(salesInvoices || [])]
      .filter(inv => inv.status !== 'cancelled')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const matchedDeals: {
      invoiceNumber: string;
      date: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      discountType: 'fixed' | 'percent';
      netUnitPrice: number;
    }[] = [];

    sortedInvoices.forEach(inv => {
      const matchesOrigInv =
        trimmedOrigInv.length > 0 &&
        inv.invoiceNumber.toLowerCase().includes(trimmedOrigInv.replace(/^#/, ''));

      const belongsToCustomer = isWalkIn
        ? matchesOrigInv || inv.customerId === 'walk-in'
        : inv.customerId === selectedCustomerId ||
          (normCustName.length > 2 && normalizeArabic(inv.customerName) === normCustName) ||
          matchesOrigInv;

      if (!belongsToCustomer) return;

      (inv.items || []).forEach(item => {
        const isSameProduct =
          item.productId === product.id ||
          (item.productName && normalizeArabic(item.productName) === normProdName);

        if (!isSameProduct) return;

        const netUnitPrice =
          item.quantity > 0
            ? Math.round((item.total / item.quantity) * 100) / 100
            : item.unitPrice;

        matchedDeals.push({
          invoiceNumber: inv.invoiceNumber,
          date: inv.date,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          discountType: item.discountType || 'fixed',
          netUnitPrice,
        });
      });
    });

    const totalQtyPurchased = matchedDeals.reduce((sum, d) => sum + d.quantity, 0);

    return {
      hasPurchasedBefore: matchedDeals.length > 0,
      invoiceCount: matchedDeals.length,
      totalQtyPurchased: Math.round(totalQtyPurchased * 1000) / 1000,
      lastDeal: matchedDeals[0] || null,
    };
  };

  const selectedProductHistory = useMemo(() => {
    return getCustomerProductHistory(selectedBarProduct);
  }, [
    selectedBarProduct,
    selectedCustomerId,
    selectedCustomer,
    customerSearchQuery,
    originalInvoiceNumber,
    salesInvoices,
  ]);

  useEffect(() => {
    if (!selectedBarProduct) {
      setReturnExceptionApproved(false);
      return;
    }
    const hist = getCustomerProductHistory(selectedBarProduct);
    setReturnExceptionApproved(hist.hasPurchasedBefore);
  }, [selectedBarProduct?.id, selectedCustomerId]);

  const openCustomerLastPriceModal = (explicitProduct?: Product | null) => {
    const target =
      explicitProduct ||
      selectedBarProduct ||
      (isProductDropdownOpen && filteredProducts.length > 0
        ? filteredProducts[searchHighlightedIndex] || filteredProducts[0]
        : null) ||
      (items.length > 0
        ? products.find(p => p.id === items[items.length - 1].productId) || null
        : null);

    if (!target) {
      setCustomerActionNotice('يرجى اختيار الصنف أولاً ثم الضغط على زر F10 لعرض سجل أسعار العميل');
      setTimeout(() => setCustomerActionNotice(null), 3500);
      return;
    }

    if (!selectedBarProduct && target) {
      selectProduct(target);
    }

    setLastPriceTargetProduct(target);
    setShowLastPriceModal(true);
  };

  useEffect(() => {
    const handleGlobalF10 = (e: KeyboardEvent) => {
      if (e.key === 'F10' && activeTab === 'create') {
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
    activeTab,
    showLastPriceModal,
    selectedBarProduct,
    isProductDropdownOpen,
    filteredProducts,
    searchHighlightedIndex,
    items,
    products,
  ]);

  const selectProduct = (product: Product) => {
    const hist = getCustomerProductHistory(product);
    setBarProductId(product.id);
    setBarQty(1);
    setProductSearchQuery(product.name);
    setIsProductDropdownOpen(false);

    if (hist.hasPurchasedBefore && hist.lastDeal) {
      setBarPrice(hist.lastDeal.unitPrice);
      setBarDiscount(hist.lastDeal.discount);
      setBarDiscountType(hist.lastDeal.discountType);
      setReturnExceptionApproved(true);
      if (!originalInvoiceNumber.trim()) {
        setOriginalInvoiceNumber(hist.lastDeal.invoiceNumber);
      }
    } else {
      setBarPrice(product.sellingPrice);
      setBarDiscount(0);
      setBarDiscountType('fixed');
      setReturnExceptionApproved(false);
    }

    setTimeout(() => {
      qtyInputRef.current?.focus();
      qtyInputRef.current?.select();
    }, 50);
  };

  const handleProductSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredProducts.length > 0) {
        setIsProductDropdownOpen(true);
        isKeyboardNavRef.current = true;
        setSearchHighlightedIndex(prev => (prev < filteredProducts.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredProducts.length > 0) {
        setIsProductDropdownOpen(true);
        isKeyboardNavRef.current = true;
        setSearchHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredProducts.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!isProductDropdownOpen && selectedBarProduct) {
        qtyInputRef.current?.focus();
        qtyInputRef.current?.select();
        return;
      }
      const trimmed = productSearchQuery.trim();
      const exactProd = products.find(p => p.barcode?.trim().toLowerCase() === trimmed.toLowerCase());
      if (exactProd) {
        selectProduct(exactProd);
        return;
      }
      if (filteredProducts.length > 0) {
        const chosen = filteredProducts[searchHighlightedIndex] || filteredProducts[0];
        if (chosen) selectProduct(chosen);
      }
    } else if (e.key === 'Escape') {
      setIsProductDropdownOpen(false);
    }
  };

  // Enter on Quantity adds directly to Invoice Table (matching POS)
  const handleQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const rawVal = parseFloat(e.currentTarget.value);
      const finalQty = !isNaN(rawVal) && rawVal > 0 ? rawVal : barQty;
      handleAddBarItem(false, finalQty);
    }
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddBarItem(false);
    }
  };

  const handleDiscountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddBarItem(false);
    }
  };

  const handleNetPriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddBarItem(false);
    }
  };

  const barPriceAfterDiscount = useMemo(() => {
    if (barPrice <= 0) return 0;
    if (barDiscount <= 0) return barPrice;
    if (barDiscountType === 'percent') {
      const discounted = barPrice * (1 - barDiscount / 100);
      return Math.max(0, Math.round(discounted * 100) / 100);
    } else {
      const discounted = Math.max(0, barPrice - barDiscount);
      return Math.round(discounted * 100) / 100;
    }
  }, [barPrice, barDiscount, barDiscountType]);

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
      const unitDisc = Math.round((barPrice - safeNet) * 100) / 100;
      setBarDiscount(unitDisc);
    }
  };

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
      unitDiscount = Math.min(price, discountVal);
    }
    const totalDiscount = Math.round(unitDiscount * qty * 100) / 100;
    return Math.max(0, Math.round((gross - totalDiscount) * 100) / 100);
  };

  const handleAddBarItem = (forceExceptionApproval = false, overrideQty?: number) => {
    const effectiveQty = typeof overrideQty === 'number' ? overrideQty : barQty;
    if (!selectedBarProduct || effectiveQty <= 0) return;

    const hasBoughtBefore = selectedProductHistory.hasPurchasedBefore;
    const isAllowed = hasBoughtBefore || returnExceptionApproved || forceExceptionApproval;

    if (!isAllowed) {
      setCustomerActionNotice(
        `⚠️ تنبيه: العميل لم يشترِ الصنف "${selectedBarProduct.name}" من قبل! اضغط على زر "استثناء وإضافة للمرتجع فوراً" لإضافته.`
      );
      setTimeout(() => setCustomerActionNotice(null), 4500);
      return;
    }

    if (!hasBoughtBefore) {
      setExceptionProductIds(prev => ({
        ...prev,
        [selectedBarProduct.id]: true,
      }));
      if (!notes.includes('استثناء')) {
        setNotes(prev =>
          prev ? `${prev} | مرتجع باستثناء (بدون سابقة شراء)` : 'مرتجع باستثناء (بدون سابقة شراء للعميل)'
        );
      }
    }

    const roundedQty = Math.round(effectiveQty * 1000) / 1000;
    const lineTotal = calculateItemTotal(roundedQty, barPrice, barDiscount, barDiscountType);

    setItems(prev => {
      const existing = prev.find(i => i.productId === selectedBarProduct.id);
      if (existing) {
        const newQty = Math.round((existing.quantity + roundedQty) * 1000) / 1000;
        const finalDisc = barDiscount > 0 ? barDiscount : (existing.discount || 0);
        const finalDiscType = barDiscount > 0 ? barDiscountType : (existing.discountType || 'fixed');
        const newTotal = calculateItemTotal(newQty, barPrice, finalDisc, finalDiscType);
        return prev.map(item =>
          item.productId === selectedBarProduct.id
            ? { ...item, quantity: newQty, unitPrice: barPrice, discount: finalDisc, discountType: finalDiscType, total: newTotal }
            : item
        );
      } else {
        return [
          ...prev,
          {
            productId: selectedBarProduct.id,
            productName: selectedBarProduct.name,
            category: selectedBarProduct.category,
            activeIngredient: selectedBarProduct.activeIngredient,
            unit: selectedBarProduct.unit,
            unitPrice: barPrice,
            purchaseCost: selectedBarProduct.purchasePrice,
            quantity: roundedQty,
            discount: barDiscount,
            discountType: barDiscountType,
            total: lineTotal,
          },
        ];
      }
    });

    setBarProductId('');
    setProductSearchQuery('');
    setBarPrice(0);
    setBarQty(1);
    setBarDiscount(0);
    setBarResetKey(prev => prev + 1);
    setReturnExceptionApproved(false);
    setIsProductDropdownOpen(false);
    setTimeout(() => {
      productSearchInputRef.current?.focus();
    }, 50);
  };

  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeItem(productId);
      return;
    }
    const roundedQty = Math.round(newQty * 1000) / 1000;
    setItems(prev =>
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
    setItems(prev =>
      prev.map(item =>
        item.productId === productId
          ? {
              ...item,
              unitPrice: validPrice,
              total: calculateItemTotal(item.quantity, validPrice, item.discount || 0, item.discountType || 'fixed'),
            }
          : item
      )
    );
  };

  const updateDiscount = (productId: string, newDiscount: number, newDiscountType?: 'fixed' | 'percent') => {
    const validDiscount = Math.max(0, newDiscount);
    setItems(prev =>
      prev.map(item => {
        if (item.productId !== productId) return item;
        const dType = newDiscountType || item.discountType || 'fixed';
        return {
          ...item,
          discount: validDiscount,
          discountType: dType,
          total: calculateItemTotal(item.quantity, item.unitPrice, validDiscount, dType),
        };
      })
    );
  };

  const updateNetPrice = (productId: string, newNetPrice: number) => {
    setItems(prev =>
      prev.map(item => {
        if (item.productId !== productId) return item;
        const validNet = Math.max(0, newNetPrice);
        let newDiscount = 0;
        if (item.unitPrice > 0 && validNet < item.unitPrice) {
          if (item.discountType === 'percent') {
            newDiscount = Math.round(((item.unitPrice - validNet) / item.unitPrice) * 10000) / 100;
          } else {
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

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(item => item.productId !== productId));
  };

  // Financial Totals
  const subtotal = useMemo(() => {
    return Math.round(items.reduce((sum, item) => sum + item.total, 0) * 100) / 100;
  }, [items]);

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
    if (isWalkInSelected) {
      return grandTotal;
    }
    if (refundMethod === 'credit') {
      return hasCustomPaidAmount ? paidAmount : 0;
    }
    if (hasCustomPaidAmount) return paidAmount;
    return grandTotal;
  }, [isWalkInSelected, refundMethod, grandTotal, paidAmount, hasCustomPaidAmount]);

  const remainingDebt = useMemo(() => {
    if (isWalkInSelected) return 0;
    return Math.max(0, Math.round((grandTotal - effectivePaidAmount) * 100) / 100);
  }, [isWalkInSelected, grandTotal, effectivePaidAmount]);

  const handleSaveReturn = (): boolean => {
    if (items.length === 0) return false;

    if (isWalkInSelected && (refundMethod === 'credit' || remainingDebt > 0 || effectivePaidAmount < grandTotal)) {
      setCustomerActionNotice(
        '⛔ مرفوض: حساب "عميل نقدي عام" لا يُسمح له بفواتير آجل نهائياً!'
      );
      setTimeout(() => setCustomerActionNotice(null), 4000);
      return false;
    }

    const customerName = selectedCustomer ? selectedCustomer.name : 'عميل نقدي عام';
    const timeSuffix = new Date().toTimeString().slice(0, 8);
    const chosenIsoDate = invoiceDate
      ? new Date(`${invoiceDate}T${timeSuffix}`).toISOString()
      : new Date().toISOString();

    createSalesReturn({
      originalInvoiceNumber: originalInvoiceNumber.trim() || undefined,
      customerId: isWalkInSelected ? 'walk-in' : selectedCustomerId,
      customerName,
      items,
      total: grandTotal,
      paidAmount: isWalkInSelected ? grandTotal : effectivePaidAmount,
      remainingAmount: isWalkInSelected ? 0 : remainingDebt,
      refundMethod: isWalkInSelected && refundMethod === 'credit' ? 'cash' : refundMethod,
      safeId: selectedSafeId,
      notes: notes.trim() || undefined,
      date: chosenIsoDate,
    });

    handleNewReturn();
    setCustomerActionNotice('تم حفظ فاتورة مرتجع المبيعات وتحديث المخزون بنجاح');
    setTimeout(() => setCustomerActionNotice(null), 3500);
    return true;
  };

  const handleNewReturn = () => {
    setItems([]);
    setDiscount(0);
    setInvoiceDiscountType('fixed');
    setPaidAmount(0);
    setHasCustomPaidAmount(false);
    setRefundMethod('cash');
    setNotes('');
    setOriginalInvoiceNumber('');
    setInvoiceDate(getTodayDateStr());
    setSelectedCustomerId('walk-in');
    setCustomerSearchQuery('عميل نقدي عام');
    setProductSearchQuery('');
    setBarProductId('');
    setBarPrice(0);
    setBarQty(1);
    setBarDiscount(0);
    setBarResetKey(prev => prev + 1);
    productSearchInputRef.current?.focus();
  };

  const handleRequestNewOrClear = () => {
    if (items.length > 0) {
      requestInvoiceClearConfirm();
    } else {
      handleNewReturn();
    }
  };

  useEffect(() => {
    if (activeTab === 'create' && items.length > 0) {
      registerInvoiceGuard({
        hasItems: true,
        itemCount: items.length,
        totalAmount: grandTotal,
        invoiceTitle: 'فاتورة مرتجع المبيعات الحالية',
        onSave: () => handleSaveReturn(),
        onDiscard: () => handleNewReturn(),
      });
    } else {
      registerInvoiceGuard(null);
    }
    return () => {
      registerInvoiceGuard(null);
    };
  }, [activeTab, items, grandTotal, registerInvoiceGuard]);

  const filteredReturns = salesReturns.filter(r => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      r.returnNumber.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      (r.originalInvoiceNumber && r.originalInvoiceNumber.toLowerCase().includes(q))
    );
  });

  const [selectedReturnIds, setSelectedReturnIds] = useState<string[]>([]);

  const isAllReturnsSelected = useMemo(() => {
    if (filteredReturns.length === 0) return false;
    return filteredReturns.every(r => selectedReturnIds.includes(r.id));
  }, [filteredReturns, selectedReturnIds]);

  const toggleSelectAllReturns = () => {
    if (isAllReturnsSelected) {
      setSelectedReturnIds([]);
    } else {
      setSelectedReturnIds(filteredReturns.map(r => r.id));
    }
  };

  const toggleSelectOneReturn = (id: string) => {
    setSelectedReturnIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBatchDeleteReturns = () => {
    if (selectedReturnIds.length === 0) return;
    if (window.confirm(`هل أنت متأكد من حذف ${selectedReturnIds.length} سجل مرتجع محدد نهائياً؟`)) {
      selectedReturnIds.forEach(id => deleteSalesReturn(id));
      setSelectedReturnIds([]);
    }
  };

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-100 text-slate-800 flex flex-col h-[100dvh] w-full overflow-hidden font-sans select-none no-print'
          : 'bg-slate-100 text-slate-800 flex flex-col h-[calc(100dvh-4.75rem)] w-full rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden font-sans select-none no-print'
      }
    >
      {activeTab === 'create' ? (
        <>
          {/* HEADER: CUSTOMER & INVOICE DATA FIELDS IN THE CARD HEADER (IDENTICAL TO POS) */}
          <header
            className={`bg-gradient-to-r from-slate-950 via-amber-950 to-amber-950 text-white px-2.5 sm:px-3.5 py-2 border-b-2 border-amber-900/80 shadow-lg flex-shrink-0 relative z-30 ${
              isFullscreen ? '' : 'rounded-t-2xl'
            }`}
          >
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-24 gap-2 items-center">
              {/* 1. اسم العميل + زر عميل جديد (أيقونة فقط بجوار حقل اختيار العميل) */}
              <div
                ref={customerContainerRef}
                className="col-span-2 sm:col-span-2 md:col-span-2 lg:col-span-11 flex items-center gap-1.5 relative z-40"
              >
                <div className="relative flex-1 min-w-0">
                  <input
                    ref={customerSearchInputRef}
                    type="text"
                    placeholder="ابحث باسم العميل أو رقم الهاتف..."
                    value={customerSearchQuery}
                    onChange={e => {
                      setCustomerSearchQuery(e.target.value);
                      setIsCustomerDropdownOpen(
                        e.target.value.trim().length > 0 &&
                          e.target.value !== 'عميل نقدي عام (بدون حساب آجل)'
                      );
                    }}
                    onFocus={() => {
                      if (
                        customerSearchQuery.trim().length > 0 &&
                        customerSearchQuery !== 'عميل نقدي عام (بدون حساب آجل)'
                      ) {
                        setIsCustomerDropdownOpen(true);
                      }
                    }}
                    onClick={() => {
                      if (
                        customerSearchQuery.trim().length > 0 &&
                        customerSearchQuery !== 'عميل نقدي عام (بدون حساب آجل)'
                      ) {
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
                      <div className="bg-slate-900 text-slate-100 px-3 py-1.5 text-[14px] font-black flex items-center justify-between border-b border-slate-800 sticky top-0 z-10 shadow-sm">
                        <span className="text-amber-300">العملاء ({filteredCustomers.length})</span>
                      </div>
                      {filteredCustomers.map((c, idx) => {
                        const isSelected = c.id === selectedCustomerId;
                        const isHighlighted = idx === customerHighlightedIndex;
                        return (
                          <div
                            key={c.id}
                            data-customer-index={idx}
                            ref={el => {
                              customerItemRefs.current[idx] = el;
                            }}
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
                              <span
                                className={`text-[15px] truncate font-bold ${
                                  isHighlighted ? 'text-white' : 'text-slate-900'
                                }`}
                              >
                                {c.name}
                              </span>
                              {c.phone && (
                                <span
                                  className={`text-xs font-mono ${
                                    isHighlighted ? 'text-amber-100' : 'text-slate-500'
                                  }`}
                                >
                                  {c.phone}
                                </span>
                              )}
                            </div>
                            {c.currentBalance > 0 ? (
                              <span
                                className={`text-xs px-2 py-0.5 rounded-md font-mono font-black shrink-0 ${
                                  isHighlighted
                                    ? 'bg-red-500 text-white'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}
                              >
                                مديونية: {c.currentBalance}
                              </span>
                            ) : (
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded-md font-mono shrink-0 ${
                                  isHighlighted ? 'text-amber-100' : 'text-slate-400'
                                }`}
                              >
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
                  onClick={() => setShowAddCustomerModal(true)}
                  className="h-10 w-10 bg-amber-600 hover:bg-amber-500 text-white rounded-xl flex items-center justify-center transition-all shadow-md active:scale-95 border-2 border-amber-400/60 shrink-0"
                  title="إضافة عميل جديد"
                >
                  <UserPlus className="w-4.5 h-4.5 shrink-0" />
                </button>
              </div>

              {/* 2. المديونية (بدون ج.م، خط 15px) */}
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
                  className="w-full h-10 bg-[#16325c] hover:bg-slate-800 text-white font-black py-1.5 px-1.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1 shadow-md transition-all active:scale-95 border-2 border-amber-400/50 truncate"
                  title="عرض كشف حساب العميل"
                >
                  <FileText className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="truncate">كشف</span>
                </button>
              </div>

              {/* 5. زر قائمة المرتجعات + التاريخ + التكبير على اليسار دائماً */}
              <div className="col-span-2 sm:col-span-2 md:col-span-2 lg:col-span-6 flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTabMode('list')}
                  className="h-10 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 border-2 border-amber-500 shrink-0"
                  title="عرض قائمة وسجل مرتجعات المبيعات"
                >
                  <FileText className="w-4 h-4 text-slate-900 shrink-0" />
                  <span>قائمة المرتجعات ({salesReturns.length})</span>
                </button>

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
                  onClick={() => setIsFullscreen(prev => !prev)}
                  className="h-10 w-10 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl border-2 border-slate-600 flex items-center justify-center transition-all active:scale-95 shadow-md shrink-0"
                  title={isFullscreen ? 'إظهار الشريط الجانبي' : 'تكبير ملء الشاشة'}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </header>

          {/* MAIN SCROLLABLE BODY */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-2.5 space-y-2 text-xs font-sans">
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

            {/* MIDDLE SECTION 1: PRODUCT QUICK INPUT BAR (IDENTICAL TO POS) */}
            <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-300 relative z-10 text-[15px]">
              <div className="p-2 bg-slate-50/80 rounded-2xl grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-12 gap-2 items-center text-[15px]">
                {/* 1. حقل البحث عن الصنف (lg:col-span-5) */}
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

                    {/* Floating Dropdown Results */}
                    {isProductDropdownOpen && filteredProducts.length > 0 && (
                      <div
                        ref={productDropdownRef}
                        className="absolute z-40 right-0 left-0 min-w-[300px] sm:min-w-[500px] mt-1 bg-white border-2 border-amber-600 rounded-2xl shadow-2xl max-h-80 overflow-y-auto divide-y divide-slate-100 animate-in fade-in-50 duration-100 text-[15px]"
                      >
                        <div className="bg-slate-900 text-slate-100 px-4 py-1.5 text-[15px] font-black flex items-center justify-between border-b border-slate-800 sticky top-0 z-10 shadow-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-amber-300 text-[15px]">
                              الأصناف المطابقة ({filteredProducts.length})
                            </span>
                            <span className="text-[14px] bg-slate-800 text-amber-300 px-2 py-0.5 rounded-md font-mono font-bold">
                              {searchHighlightedIndex + 1} / {filteredProducts.length}
                            </span>
                          </div>
                        </div>
                        {filteredProducts.map((p, idx) => {
                          const isHighlighted = idx === searchHighlightedIndex;
                          const pHist = getCustomerProductHistory(p);
                          return (
                            <div
                              key={p.id}
                              data-product-index={idx}
                              ref={el => {
                                productItemRefs.current[idx] = el;
                              }}
                              onMouseDown={e => {
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
                                  <span
                                    className={`text-[15px] font-black truncate ${
                                      isHighlighted ? 'text-white' : 'text-slate-900'
                                    }`}
                                  >
                                    {p.name}
                                  </span>
                                </div>
                                <div
                                  className={`text-[12px] font-black flex items-center gap-3 ${
                                    isHighlighted ? 'text-rose-100' : 'text-red-600'
                                  }`}
                                >
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
                                <span
                                  className={`text-[15px] font-black px-3 py-1 rounded-xl font-mono inline-block shadow-sm ${
                                    isHighlighted
                                      ? 'bg-white text-slate-900 font-black shadow-md'
                                      : 'bg-amber-100 text-slate-900 border border-amber-300'
                                  }`}
                                >
                                  {pHist.lastDeal ? pHist.lastDeal.netUnitPrice : p.sellingPrice}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. العدد */}
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

                {/* 3. السعر */}
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

                {/* 4. الخصم + زر تبديل الخصم (نقدي / %) */}
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

                {/* 5. بعد الخصم */}
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
                      (!selectedProductHistory.hasPurchasedBefore && !returnExceptionApproved)
                    }
                    onClick={() => handleAddBarItem(false)}
                    className={`w-full h-10 font-black py-1.5 px-2 rounded-xl text-[15px] shadow-sm flex items-center justify-center gap-1 transition-all ${
                      !barProductId ||
                      (!selectedProductHistory.hasPurchasedBefore && !returnExceptionApproved)
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-amber-600 hover:bg-amber-500 text-white active:scale-95 shadow-md'
                    }`}
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>إضافة</span>
                  </button>
                </div>
              </div>

              {/* CUSTOMER PREVIOUS PURCHASE ALERT & EXCEPTION APPROVAL BANNER */}
              {selectedBarProduct && (
                <div className="px-3 pb-2.5 bg-slate-50/80 rounded-b-2xl">
                  {selectedProductHistory.hasPurchasedBefore && selectedProductHistory.lastDeal ? (
                    <div className="bg-amber-50 border-2 border-amber-600 rounded-xl p-2 flex flex-wrap items-center justify-between gap-2 text-xs shadow-xs animate-in fade-in-50">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-black text-slate-900">
                          سبق للعميل شراؤه ({selectedProductHistory.totalQtyPurchased}{' '}
                          {selectedBarProduct.unit}) — آخر سعر:{' '}
                          <strong className="font-mono underline">
                            {selectedProductHistory.lastDeal.netUnitPrice}
                          </strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openCustomerLastPriceModal(selectedBarProduct)}
                        className="bg-white hover:bg-amber-100 text-slate-800 border border-amber-600 px-2 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>سجل الأسعار (F10)</span>
                      </button>
                    </div>
                  ) : !returnExceptionApproved ? (
                    <div className="bg-rose-50 border-2 border-rose-600 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-sm animate-in fade-in-50">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="font-black text-rose-950">
                          العميل لم يشترِ الصنف "{selectedBarProduct.name}" سابقاً. هل ترغب في قبول المرتجع باستثناء؟
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setReturnExceptionApproved(true);
                            handleAddBarItem(true);
                          }}
                          className="bg-amber-700 hover:bg-amber-600 text-white px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 shadow-sm cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>استثناء وإضافة فوراً</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBarProductId('');
                            setProductSearchQuery('');
                            setBarPrice(0);
                            setBarQty(1);
                            setBarDiscount(0);
                            setReturnExceptionApproved(false);
                            productSearchInputRef.current?.focus();
                          }}
                          className="bg-white hover:bg-rose-100 text-rose-800 border border-rose-400 px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>إلغاء</span>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* MIDDLE SECTION 2: ITEMS INVOICE TABLE (14.2px & centered vertically and horizontally) */}
            <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-500 overflow-hidden text-[14.2px]">
              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse text-[14.2px]">
                  <thead>
                    <tr className="bg-slate-900 text-slate-100 font-black text-[14.2px]">
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
                    {items.map((item, idx) => (
                      <tr key={item.productId} className="hover:bg-amber-50/50 transition-colors text-[14.2px]">
                        <td className="py-1.5 px-2 text-center align-middle font-black text-slate-700 font-mono text-[14.2px]">
                          {idx + 1}
                        </td>

                        <td className="py-1.5 px-3 text-center align-middle font-black text-slate-950 text-[14.2px]">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <span>{item.productName}</span>
                            {exceptionProductIds[item.productId] && (
                              <span className="bg-amber-100 text-amber-900 border border-amber-400 px-1.5 py-0.5 rounded text-[11px] font-black">
                                استثناء
                              </span>
                            )}
                          </div>
                        </td>

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

                        <td className="py-1.5 px-3 text-center align-middle font-black font-mono text-red-800 text-[14.2px]">
                          {item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        <td className="py-1.5 px-2 text-center align-middle text-[14.2px]">
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => removeItem(item.productId)}
                              className="text-slate-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center"
                              title="حذف الصنف"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {items.length === 0 && (
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
                <div className="h-10 bg-slate-900 text-white px-2.5 rounded-xl border-2 border-slate-950 shadow-sm flex items-center justify-between gap-1.5">
                  <span className="text-[13.5px] font-black text-amber-300 shrink-0">الصافي النهائي:</span>
                  <span className="font-mono font-black text-amber-400 text-[16px] truncate">
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
                        ? 'حساب عميل نقدي عام لا يسمح له بالآجل نهائياً'
                        : 'المبلغ المدفوع'
                    }
                    onClick={() => {
                      if (isWalkInSelected) {
                        setCustomerActionNotice(
                          '⛔ حساب "عميل نقدي عام" نقدي فقط ولا يُسمح له بالآجل نهائياً'
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

                {/* 5. المتبقي آجل */}
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
                      const isSelected = refundMethod === method.id;
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
                            setRefundMethod(method.id as PaymentMethod);
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
                  <button
                    type="button"
                    disabled={items.length === 0}
                    onClick={handleSaveReturn}
                    className={`h-9 px-3.5 rounded-xl text-[13.5px] font-black flex items-center gap-1.5 shadow-sm transition-all border-2 ${
                      items.length === 0
                        ? 'bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white border-amber-950 active:scale-95'
                    }`}
                  >
                    <Save className="w-4 h-4 text-amber-200 shrink-0" />
                    <span>حفظ الفاتورة</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRequestNewOrClear}
                    className="h-9 bg-slate-900 hover:bg-slate-800 text-white font-black px-3 rounded-xl text-[13.5px] flex items-center gap-1.5 transition-all border-2 border-slate-950 shadow-sm active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>فاتورة جديدة</span>
                  </button>

                  <button
                    type="button"
                    disabled={items.length === 0}
                    onClick={handleRequestNewOrClear}
                    className={`h-9 px-2.5 rounded-xl text-[13.5px] font-black flex items-center gap-1 transition-all border-2 ${
                      items.length === 0
                        ? 'bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-400 shadow-xs active:scale-95'
                    }`}
                    title="تفريغ / حذف الفاتورة"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>حذف الفاتورة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTabMode('list')}
                    className="h-9 bg-slate-800 hover:bg-slate-800 text-amber-300 font-black px-2.5 rounded-xl text-[13px] flex items-center gap-1 transition-all border-2 border-amber-800 shadow-sm active:scale-95"
                    title="عرض قائمة وسجل مرتجعات المبيعات"
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span>قائمة المرتجعات ({salesReturns.length})</span>
                  </button>
                </div>
              </div>
            </div>
          </footer>
        </>
      ) : (
        /* ARCHIVE LIST */
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">أرشيف وسجل مرتجعات المبيعات</h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  مراجعة سجلات مرتجعات المبيعات للعملاء
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTabMode('create')}
              className="px-4 py-2 rounded-xl text-xs font-black bg-amber-700 hover:bg-amber-600 text-white shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>العودة لشاشة فاتورة مرتجع المبيعات</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="بحث برقم المرتجع، اسم العميل، أو رقم الفاتورة الأصلية..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
              />
            </div>

            {selectedReturnIds.length > 0 && (
              <button
                onClick={handleBatchDeleteReturns}
                className="bg-red-600 hover:bg-red-500 text-white font-extrabold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95 text-xs shrink-0 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف المحدد ({selectedReturnIds.length})</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="bg-slate-900 text-slate-100 border-b border-slate-800 font-bold text-xs sm:text-sm">
                    <th className="py-3.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllReturnsSelected}
                        onChange={toggleSelectAllReturns}
                        className="w-4 h-4 accent-amber-600 cursor-pointer rounded"
                        title="تحديد الكل"
                      />
                    </th>
                    <th className="py-3.5 px-4">رقم المرتجع</th>
                    <th className="py-3.5 px-4">الفاتورة الأصلية</th>
                    <th className="py-3.5 px-4">اسم العميل</th>
                    <th className="py-3.5 px-4">التاريخ والوقت</th>
                    <th className="py-3.5 px-4">الأصناف المرتجعة</th>
                    <th className="py-3.5 px-4">إجمالي المبلغ المسترد</th>
                    <th className="py-3.5 px-4">طريقة الاسترداد</th>
                    <th className="py-3.5 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReturns.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-400 font-medium">
                        لا توجد سجلات لمرتجعات المبيعات حتى الآن
                      </td>
                    </tr>
                  ) : (
                    filteredReturns.map(r => {
                      const isSelected = selectedReturnIds.includes(r.id);
                      return (
                        <tr
                          key={r.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            isSelected ? 'bg-amber-50/80 font-bold' : ''
                          }`}
                        >
                          <td className="py-3.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOneReturn(r.id)}
                              className="w-4 h-4 accent-amber-600 cursor-pointer rounded"
                            />
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-sm">
                            {r.returnNumber}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600 text-xs sm:text-sm">
                            {r.originalInvoiceNumber || '—'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 text-sm sm:text-base">
                            {r.customerName}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-mono text-xs sm:text-sm">
                            {new Date(r.date).toLocaleDateString('ar-EG')}{' '}
                            <span className="text-xs text-slate-400">
                              {new Date(r.date).toLocaleTimeString('ar-EG', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 text-xs sm:text-sm font-medium">
                            {r.items.length} صنف ({r.items.reduce((s, i) => s + i.quantity, 0)} وحدة)
                          </td>
                          <td className="py-3.5 px-4 font-mono font-black text-red-800 text-sm sm:text-base">
                            {r.total.toLocaleString()} {settings.currency}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-full font-bold text-xs">
                              {r.refundMethod === 'cash'
                                ? 'نقدي'
                                : r.refundMethod === 'credit'
                                ? 'خصم من الدين'
                                : 'تحويل'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {(currentUser?.role === 'admin' || currentUser?.role === 'storekeeper') && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`هل أنت متأكد من حذف سجل المرتجع (${r.returnNumber})؟`)) {
                                    deleteSalesReturn(r.id);
                                  }
                                }}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                title="حذف السجل"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Customer Receipt Voucher Modal */}
      <VoucherModal
        isOpen={showReceiptModal && !!selectedCustomer}
        onClose={() => setShowReceiptModal(false)}
        direction="in"
        defaultPartyType="customer"
        defaultPartyId={selectedCustomer?.id}
        defaultAmount={receiptAmount}
        defaultNotes={receiptNotes}
        onSuccess={() => {
          setCustomerActionNotice('تم إصدار سند قبض وتحديث حساب العميل بنجاح');
          setTimeout(() => setCustomerActionNotice(null), 4000);
        }}
      />

      {/* Quick Add Customer Modal */}
      <CustomerModal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onSuccess={c => {
          selectCustomer(c);
          setCustomerActionNotice(`تم تسجيل واختيار العميل ${c.name} بنجاح`);
          setTimeout(() => setCustomerActionNotice(null), 4000);
        }}
      />

      {/* Customer Statement Modal */}
      {showStatementModal && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-50 overflow-y-auto">
          <DetailedCustomerStatement
            initialCustomerId={selectedCustomer.id}
            isModal={true}
            onClose={() => setShowStatementModal(false)}
          />
        </div>
      )}

      {/* Customer Last Price History Modal */}
      <CustomerLastPriceModal
        isOpen={showLastPriceModal}
        onClose={() => setShowLastPriceModal(false)}
        product={lastPriceTargetProduct}
        customer={selectedCustomer || null}
        customerId={selectedCustomerId}
        customerNameLabel={selectedCustomer ? selectedCustomer.name : 'عميل نقدي'}
        salesInvoices={salesInvoices}
        onApplyPrice={(appliedPrice, appliedDisc, appliedDiscType) => {
          setBarPrice(appliedPrice);
          setBarDiscount(appliedDisc ?? 0);
          if (appliedDiscType) setBarDiscountType(appliedDiscType);
          setTimeout(() => {
            qtyInputRef.current?.focus();
            qtyInputRef.current?.select();
          }, 50);
        }}
      />
    </div>
  );
};
