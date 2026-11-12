import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PurchaseInvoice, Product, PaymentMethod } from '../types';
import { VoucherModal } from './VoucherModal';
import { SupplierModal } from './SupplierModal';
import { DetailedSupplierStatement } from './DetailedSupplierStatement';
import {
  Truck,
  Plus,
  PlusCircle,
  Search,
  Trash2,
  Eye,
  Edit,
  X,
  FileText,
  Banknote,
  AlertTriangle,
  RotateCcw,
  Save,
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

interface PurchasesProps {
  initialTab?: 'create' | 'list';
}

export const Purchases: React.FC<PurchasesProps> = ({ initialTab = 'create' }) => {
  const {
    purchaseInvoices,
    suppliers,
    products,
    safes,
    createPurchaseInvoice,
    updatePurchaseInvoice,
    deletePurchaseInvoice,
    settings,
    currentUser,
    setActiveTab: setGlobalActiveTab,
    registerInvoiceGuard,
    requestInvoiceClearConfirm,
  } = useApp();

  const [activeTab, setActiveTabState] = useState<'create' | 'list'>(initialTab);
  useEffect(() => {
    setActiveTabState(initialTab);
  }, [initialTab]);

  const setActiveTabMode = (mode: 'create' | 'list') => {
    setGlobalActiveTab(mode === 'list' ? 'purchases_list' : 'purchases');
  };
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState<string[]>([]);

  const filteredPurchases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return purchaseInvoices.filter(p =>
      !q ||
      p.invoiceNumber.toLowerCase().includes(q) ||
      p.supplierName.toLowerCase().includes(q)
    );
  }, [purchaseInvoices, searchQuery]);

  const isAllPurchasesSelected = useMemo(() => {
    if (filteredPurchases.length === 0) return false;
    return filteredPurchases.every(inv => selectedPurchaseIds.includes(inv.id));
  }, [filteredPurchases, selectedPurchaseIds]);

  const toggleSelectAllPurchases = () => {
    if (isAllPurchasesSelected) {
      setSelectedPurchaseIds([]);
    } else {
      setSelectedPurchaseIds(filteredPurchases.map(inv => inv.id));
    }
  };

  const toggleSelectOnePurchase = (id: string) => {
    setSelectedPurchaseIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBatchDeletePurchases = () => {
    if (selectedPurchaseIds.length === 0) return;
    if (window.confirm(`هل أنت متأكد من حذف ${selectedPurchaseIds.length} فاتورة مشتريات محددة نهائياً؟`)) {
      selectedPurchaseIds.forEach(id => deletePurchaseInvoice(id));
      setSelectedPurchaseIds([]);
    }
  };

  // Safe / Account Selector State
  const [selectedSafeId, setSelectedSafeId] = useState<string>(
    safes.find(s => s.id === 'safe-main')?.id || safes[0]?.id || 'safe-main'
  );

  useEffect(() => {
    if (safes.length > 0 && !safes.some(s => s.id === selectedSafeId)) {
      const defaultS = safes.find(s => s.id === 'safe-main') || safes[0];
      if (defaultS) setSelectedSafeId(defaultS.id);
    }
  }, [safes]);

  // Edit Purchase Invoice State
  const [editingInvoice, setEditingInvoice] = useState<PurchaseInvoice | null>(null);
  const [editSupplierId, setEditSupplierId] = useState<string>('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('credit');
  const [editPaidAmount, setEditPaidAmount] = useState<number>(0);
  const [editTotalAmount, setEditTotalAmount] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');

  // Supplier Disbursement Voucher & Statement Modals
  const [showDisbursementModal, setShowDisbursementModal] = useState<boolean>(false);
  const [disbursementAmount, setDisbursementAmount] = useState<number>(0);
  const [disbursementNotes, setDisbursementNotes] = useState<string>('');
  const [showStatementModal, setShowStatementModal] = useState<boolean>(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState<boolean>(false);
  const [supplierActionNotice, setSupplierActionNotice] = useState<string | null>(null);

  const getTodayDateStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [invoiceDate, setInvoiceDate] = useState<string>(getTodayDateStr);

  // Form State for Purchase Bill (POS Layout)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [hasCustomPaidAmount, setHasCustomPaidAmount] = useState<boolean>(false);
  const [discount, setDiscount] = useState<number>(0);
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [billNotes, setBillNotes] = useState<string>('');
  const [barResetKey, setBarResetKey] = useState<number>(0);

  // Items in current bill
  const [items, setItems] = useState<
    {
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
    }[]
  >([]);

  // Quick Add Item Bar state (Searchable product, Quantity, Price, Discount)
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [barProductId, setBarProductId] = useState<string>('');
  const [barQty, setBarQty] = useState<number>(1);
  const [barCost, setBarCost] = useState<number>(0);
  const [barDiscount, setBarDiscount] = useState<number>(0);
  const [barDiscountType, setBarDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState<boolean>(false);
  const [searchHighlightedIndex, setSearchHighlightedIndex] = useState<number>(0);
  const isKeyboardNavRef = useRef<boolean>(false);

  // Supplier Searchable Combobox State
  const [supplierSearchQuery, setSupplierSearchQuery] = useState<string>(suppliers[0]?.name || '');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState<boolean>(false);
  const [supplierHighlightedIndex, setSupplierHighlightedIndex] = useState<number>(0);
  const supplierContainerRef = useRef<HTMLDivElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const supplierItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const supplierSearchInputRef = useRef<HTMLInputElement>(null);

  // Focus Refs
  const productSearchInputRef = useRef<HTMLInputElement>(null);
  const productContainerRef = useRef<HTMLDivElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const productItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const qtyInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  const netPriceInputRef = useRef<HTMLInputElement>(null);

  // Arabic normalization
  const normalizeArabic = (str: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .trim();
  };

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearchQuery.trim()) return suppliers;
    const q = normalizeArabic(supplierSearchQuery);
    return suppliers.filter(s =>
      normalizeArabic(s.name).includes(q) ||
      (s.phone && s.phone.includes(q))
    );
  }, [suppliers, supplierSearchQuery]);

  // Selected supplier details
  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.id === selectedSupplierId) || suppliers[0];
  }, [suppliers, selectedSupplierId]);

  useEffect(() => {
    if (selectedSupplier && !supplierSearchQuery) {
      setSupplierSearchQuery(selectedSupplier.name);
    }
  }, [selectedSupplier]);

  // Filtered products for quick add bar
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

  // Selected bar product
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

  // Auto-scroll supplier dropdown
  useEffect(() => {
    if (!isSupplierDropdownOpen || !supplierDropdownRef.current) return;
    const container = supplierDropdownRef.current;
    if (supplierHighlightedIndex === 0) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const activeItem = supplierItemRefs.current[supplierHighlightedIndex] ||
      (container.querySelector(`[data-supplier-index="${supplierHighlightedIndex}"]`) as HTMLElement | null);
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
  }, [supplierHighlightedIndex, isSupplierDropdownOpen]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productContainerRef.current && !productContainerRef.current.contains(e.target as Node)) {
        setIsProductDropdownOpen(false);
      }
      if (supplierContainerRef.current && !supplierContainerRef.current.contains(e.target as Node)) {
        setIsSupplierDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Supplier Select Handler
  const selectSupplier = (s: { id: string; name: string }) => {
    setSelectedSupplierId(s.id);
    setSupplierSearchQuery(s.name);
    setIsSupplierDropdownOpen(false);
    setTimeout(() => {
      productSearchInputRef.current?.focus();
    }, 50);
  };

  const handleSupplierSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredSuppliers.length > 0) {
        setIsSupplierDropdownOpen(true);
        setSupplierHighlightedIndex(prev => (prev < filteredSuppliers.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredSuppliers.length > 0) {
        setIsSupplierDropdownOpen(true);
        setSupplierHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredSuppliers.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSuppliers.length > 0) {
        const chosen = filteredSuppliers[supplierHighlightedIndex] || filteredSuppliers[0];
        if (chosen) selectSupplier(chosen);
      }
    } else if (e.key === 'Escape') {
      setIsSupplierDropdownOpen(false);
    }
  };

  const selectProduct = (product: Product) => {
    setBarProductId(product.id);
    setBarCost(product.purchasePrice);
    setBarQty(1);
    setBarDiscount(0);
    setProductSearchQuery(product.name);
    setIsProductDropdownOpen(false);
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
      handleAddBarItem(finalQty);
    }
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddBarItem();
    }
  };

  const handleDiscountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddBarItem();
    }
  };

  const handleNetPriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddBarItem();
    }
  };

  // Net cost calculation for bar
  const barPriceAfterDiscount = useMemo(() => {
    if (barCost <= 0) return 0;
    if (barDiscount <= 0) return barCost;
    if (barDiscountType === 'percent') {
      const discounted = barCost * (1 - barDiscount / 100);
      return Math.max(0, Math.round(discounted * 100) / 100);
    } else {
      const discounted = Math.max(0, barCost - barDiscount);
      return Math.round(discounted * 100) / 100;
    }
  }, [barCost, barDiscount, barDiscountType]);

  const handleBarPriceAfterDiscountChange = (newNetPrice: number) => {
    if (barCost <= 0) {
      setBarCost(newNetPrice);
      setBarDiscount(0);
      return;
    }
    const safeNet = Math.max(0, Math.min(barCost, newNetPrice));
    if (barDiscountType === 'percent') {
      const pct = Math.round(((barCost - safeNet) / barCost) * 10000) / 100;
      setBarDiscount(pct);
    } else {
      const unitDisc = Math.round((barCost - safeNet) * 100) / 100;
      setBarDiscount(unitDisc);
    }
  };

  // Line item total calculation helper (per unit discount)
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

  // Quick Add Item
  const handleAddBarItem = (overrideQty?: number) => {
    const effectiveQty = typeof overrideQty === 'number' ? overrideQty : barQty;
    if (!selectedBarProduct || effectiveQty <= 0) return;
    const roundedQty = Math.round(effectiveQty * 1000) / 1000;
    const lineTotal = calculateItemTotal(roundedQty, barCost, barDiscount, barDiscountType);

    setItems(prev => {
      const existing = prev.find(i => i.productId === selectedBarProduct.id);
      if (existing) {
        const newQty = Math.round((existing.quantity + roundedQty) * 1000) / 1000;
        const finalDisc = barDiscount > 0 ? barDiscount : (existing.discount || 0);
        const finalDiscType = barDiscount > 0 ? barDiscountType : (existing.discountType || 'fixed');
        const newTotal = calculateItemTotal(newQty, barCost, finalDisc, finalDiscType);
        return prev.map(item =>
          item.productId === selectedBarProduct.id
            ? { ...item, quantity: newQty, unitPrice: barCost, discount: finalDisc, discountType: finalDiscType, total: newTotal }
            : item
        );
      } else {
        return [
          ...prev,
          {
            productId: selectedBarProduct.id,
            productName: selectedBarProduct.name,
            unit: selectedBarProduct.unit,
            unitPrice: barCost,
            quantity: roundedQty,
            discount: barDiscount,
            discountType: barDiscountType,
            total: lineTotal,
          },
        ];
      }
    });

    // Reset bar
    setBarProductId('');
    setProductSearchQuery('');
    setBarCost(0);
    setBarQty(1);
    setBarDiscount(0);
    setBarResetKey(prev => prev + 1);
    setIsProductDropdownOpen(false);
    setTimeout(() => {
      productSearchInputRef.current?.focus();
    }, 50);
  };

  // Table row editing actions
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
    if (paymentMethod === 'credit') {
      return hasCustomPaidAmount ? paidAmount : 0;
    }
    if (hasCustomPaidAmount) return paidAmount;
    return grandTotal;
  }, [paymentMethod, grandTotal, paidAmount, hasCustomPaidAmount]);

  const remainingDebt = useMemo(() => {
    return Math.max(0, Math.round((grandTotal - effectivePaidAmount) * 100) / 100);
  }, [grandTotal, effectivePaidAmount]);

  // Handlers for Voucher & Statement Modals
  const handleOpenDisbursementModal = () => {
    if (!selectedSupplier) {
      setSupplierActionNotice('يرجى اختيار مورد مسجل من القائمة لإصدار سند صرف');
      setTimeout(() => setSupplierActionNotice(null), 3500);
      return;
    }
    setDisbursementAmount(selectedSupplier.currentBalance > 0 ? selectedSupplier.currentBalance : 0);
    setDisbursementNotes(`سند صرف نقدية لحساب المورد: ${selectedSupplier.name}`);
    setShowDisbursementModal(true);
  };

  const handleOpenStatementModal = () => {
    if (!selectedSupplier) {
      setSupplierActionNotice('يرجى اختيار مورد مسجل من القائمة لعرض كشف الحساب');
      setTimeout(() => setSupplierActionNotice(null), 3500);
      return;
    }
    setShowStatementModal(true);
  };

  // Submit Purchase Invoice
  const handleSaveInvoice = () => {
    if (items.length === 0) return;

    const supplier = selectedSupplier || suppliers[0];
    const supplierName = supplier ? supplier.name : 'مورد عام';
    const timeSuffix = new Date().toTimeString().slice(0, 8);
    const chosenIsoDate = invoiceDate
      ? new Date(`${invoiceDate}T${timeSuffix}`).toISOString()
      : new Date().toISOString();

    createPurchaseInvoice({
      supplierId: selectedSupplierId,
      supplierName,
      items,
      total: grandTotal,
      paidAmount: effectivePaidAmount,
      paymentMethod,
      safeId: selectedSafeId,
      notes: billNotes,
      date: chosenIsoDate,
    });

    handleNewInvoice();
    setSupplierActionNotice('تم حفظ فاتورة المشتريات وتحديث المخزون بنجاح');
    setTimeout(() => setSupplierActionNotice(null), 3500);
  };

  const handleNewInvoice = () => {
    setItems([]);
    setDiscount(0);
    setInvoiceDiscountType('fixed');
    setPaidAmount(0);
    setHasCustomPaidAmount(false);
    setBillNotes('');
    setInvoiceDate(getTodayDateStr());
    if (suppliers.length > 0) {
      setSelectedSupplierId(suppliers[0].id);
      setSupplierSearchQuery(suppliers[0].name);
    }
    setProductSearchQuery('');
    setBarProductId('');
    setBarCost(0);
    setBarQty(1);
    setBarDiscount(0);
    setBarResetKey(prev => prev + 1);
    productSearchInputRef.current?.focus();
  };

  const handleRequestNewOrClear = () => {
    if (items.length > 0) {
      requestInvoiceClearConfirm();
    } else {
      handleNewInvoice();
    }
  };

  useEffect(() => {
    if (activeTab === 'create' && items.length > 0) {
      registerInvoiceGuard({
        hasItems: true,
        itemCount: items.length,
        totalAmount: grandTotal,
        invoiceTitle: 'فاتورة المشتريات الحالية',
        onSave: () => {
          handleSaveInvoice();
          return true;
        },
        onDiscard: () => {
          handleNewInvoice();
        },
      });
    } else {
      registerInvoiceGuard(null);
    }
    return () => {
      registerInvoiceGuard(null);
    };
  }, [activeTab, items, grandTotal, registerInvoiceGuard]);

  // Edit Modal handler
  const openEditModal = (inv: PurchaseInvoice) => {
    setEditingInvoice(inv);
    setEditSupplierId(inv.supplierId);
    setEditPaymentMethod(inv.paymentMethod);
    setEditPaidAmount(inv.paidAmount);
    setEditTotalAmount(inv.total);
    setEditNotes(inv.notes || '');
  };

  const handleUpdateBillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;

    const supplier = suppliers.find(s => s.id === editSupplierId);
    const supplierName = supplier ? supplier.name : editingInvoice.supplierName;

    updatePurchaseInvoice(editingInvoice.id, {
      supplierId: editSupplierId,
      supplierName,
      paymentMethod: editPaymentMethod,
      paidAmount: editPaidAmount,
      total: editTotalAmount,
      notes: editNotes,
    });

    setEditingInvoice(null);
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
          {/* HEADER: SUPPLIER & INVOICE DATA FIELDS IN THE CARD HEADER (IDENTICAL TO POS) */}
          <header
            className={`bg-gradient-to-r from-slate-950 via-amber-950 to-amber-950 text-white px-2.5 sm:px-3.5 py-2 border-b-2 border-amber-900/80 shadow-lg flex-shrink-0 relative z-30 ${
              isFullscreen ? '' : 'rounded-t-2xl'
            }`}
          >
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-24 gap-2 items-center">
              {/* 1. اسم المورد + زر مورد جديد (أيقونة فقط بجوار حقل اختيار المورد) */}
              <div
                ref={supplierContainerRef}
                className="col-span-2 sm:col-span-2 md:col-span-2 lg:col-span-11 flex items-center gap-1.5 relative z-40"
              >
                <div className="relative flex-1 min-w-0">
                  <input
                    ref={supplierSearchInputRef}
                    type="text"
                    placeholder="ابحث باسم المورد أو رقم الهاتف..."
                    value={supplierSearchQuery}
                    onChange={e => {
                      setSupplierSearchQuery(e.target.value);
                      setIsSupplierDropdownOpen(true);
                    }}
                    onFocus={() => setIsSupplierDropdownOpen(true)}
                    onClick={() => setIsSupplierDropdownOpen(true)}
                    onKeyDown={handleSupplierSearchKeyDown}
                    className="w-full h-10 bg-white border-2 border-amber-500 rounded-xl py-1.5 px-3 text-[15px] font-black text-slate-900 focus:ring-2 focus:ring-amber-400 focus:outline-none shadow-sm placeholder:font-normal placeholder:text-slate-400"
                  />

                  {/* Supplier Dropdown */}
                  {isSupplierDropdownOpen && filteredSuppliers.length > 0 && (
                    <div
                      ref={supplierDropdownRef}
                      className="absolute z-50 right-0 left-0 min-w-[280px] sm:min-w-[360px] mt-1 bg-white border-2 border-amber-600 rounded-2xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-100 animate-in fade-in-50 duration-100 text-slate-800 text-[15px]"
                    >
                      <div className="bg-slate-900 text-slate-100 px-3 py-1.5 text-[14px] font-black flex items-center justify-between border-b border-slate-800 sticky top-0 z-10 shadow-sm">
                        <span className="text-amber-300">الموردون ({filteredSuppliers.length})</span>
                      </div>
                      {filteredSuppliers.map((s, idx) => {
                        const isSelected = s.id === selectedSupplierId;
                        const isHighlighted = idx === supplierHighlightedIndex;
                        return (
                          <div
                            key={s.id}
                            data-supplier-index={idx}
                            ref={el => {
                              supplierItemRefs.current[idx] = el;
                            }}
                            onMouseDown={e => {
                              e.preventDefault();
                              selectSupplier(s);
                            }}
                            onMouseEnter={() => setSupplierHighlightedIndex(idx)}
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
                                {s.name}
                              </span>
                              {s.phone && (
                                <span
                                  className={`text-xs font-mono ${
                                    isHighlighted ? 'text-amber-100' : 'text-slate-500'
                                  }`}
                                >
                                  {s.phone}
                                </span>
                              )}
                            </div>
                            {s.currentBalance > 0 ? (
                              <span
                                className={`text-xs px-2 py-0.5 rounded-md font-mono font-black shrink-0 ${
                                  isHighlighted
                                    ? 'bg-red-500 text-white'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}
                              >
                                مستحق: {s.currentBalance}
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

                {/* زر مورد جديد: أيقونة فقط بجوار حقل اختيار المورد */}
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(true)}
                  className="h-10 w-10 bg-amber-600 hover:bg-amber-500 text-white rounded-xl flex items-center justify-center transition-all shadow-md active:scale-95 border-2 border-amber-400/60 shrink-0"
                  title="إضافة مورد جديد"
                >
                  <UserPlus className="w-4.5 h-4.5 shrink-0" />
                </button>
              </div>

              {/* 2. المستحق للمورد (المديونية السابقة بدون ج.م، خط 15px) */}
              <div className="sm:col-span-1 md:col-span-1 lg:col-span-3">
                <div
                  className={`h-10 py-1.5 px-2 rounded-xl font-mono font-black text-[15px] flex items-center justify-center text-center border-2 ${
                    selectedSupplier && selectedSupplier.currentBalance > 0
                      ? 'bg-red-50 text-red-700 border-red-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                  title="الرصيد المستحق للمورد"
                >
                  {selectedSupplier ? selectedSupplier.currentBalance : 0}
                </div>
              </div>

              {/* 3. زر سند صرف (lg:col-span-2) */}
              <div className="sm:col-span-1 md:col-span-1 lg:col-span-2">
                <button
                  type="button"
                  onClick={handleOpenDisbursementModal}
                  className="w-full h-10 bg-amber-600 hover:bg-amber-500 text-white font-black py-1.5 px-1.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1 shadow-md transition-all active:scale-95 border-2 border-amber-400/60 truncate"
                  title="إصدار سند صرف نقدية لهذا المورد"
                >
                  <Banknote className="w-4 h-4 text-amber-200 shrink-0" />
                  <span className="truncate">سند صرف</span>
                </button>
              </div>

              {/* 4. زر كشف (lg:col-span-2) */}
              <div className="sm:col-span-1 md:col-span-1 lg:col-span-2">
                <button
                  type="button"
                  onClick={handleOpenStatementModal}
                  className="w-full h-10 bg-[#16325c] hover:bg-slate-800 text-white font-black py-1.5 px-1.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1 shadow-md transition-all active:scale-95 border-2 border-amber-400/50 truncate"
                  title="عرض كشف حساب المورد"
                >
                  <FileText className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="truncate">كشف</span>
                </button>
              </div>

              {/* 5. زر قائمة الفواتير + التاريخ + التكبير على اليسار دائماً */}
              <div className="col-span-2 sm:col-span-2 md:col-span-2 lg:col-span-6 flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTabMode('list')}
                  className="h-10 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 border-2 border-amber-500 shrink-0"
                  title="عرض قائمة وسجل فواتير المشتريات"
                >
                  <FileText className="w-4 h-4 text-slate-900 shrink-0" />
                  <span>قائمة الفواتير ({purchaseInvoices.length})</span>
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
            {supplierActionNotice && (
              <div className="bg-amber-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between shadow-lg animate-in fade-in-50">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-200" />
                  <span>{supplierActionNotice}</span>
                </div>
                <button onClick={() => setSupplierActionNotice(null)} className="text-white/80 hover:text-white">
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
                                  {p.purchasePrice}
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
                    value={barCost}
                    onChange={val => setBarCost(val)}
                    onKeyDown={handlePriceKeyDown}
                    min={0}
                    placeholder="السعر"
                    title="سعر الشراء"
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
                    disabled={!barProductId}
                    onClick={() => handleAddBarItem()}
                    className={`w-full h-10 font-black py-1.5 px-2 rounded-xl text-[15px] shadow-sm flex items-center justify-center gap-1 transition-all ${
                      !barProductId
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-amber-600 hover:bg-amber-500 text-white active:scale-95 shadow-md'
                    }`}
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>إضافة</span>
                  </button>
                </div>
              </div>
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
                          {item.productName}
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
                    {effectivePaidAmount < grandTotal && (
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
                    value={effectivePaidAmount || ''}
                    placeholder="0"
                    onChange={e => {
                      const val = Math.max(0, Number(e.target.value));
                      setPaidAmount(val);
                      setHasCustomPaidAmount(true);
                    }}
                    className="w-20 sm:w-24 h-7 text-center font-mono font-black text-[15px] text-slate-900 bg-white border-2 border-amber-500 rounded-lg focus:ring-2 focus:ring-amber-700 focus:outline-none"
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
                      const isSelected = paymentMethod === method.id;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => {
                            setPaymentMethod(method.id as PaymentMethod);
                            if (method.id === 'cash') {
                              setHasCustomPaidAmount(false);
                              const cashSafe = safes.find(s => s.type === 'cash' || s.isDefault);
                              if (cashSafe) setSelectedSafeId(cashSafe.id);
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
                            isSelected
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
                    onClick={handleSaveInvoice}
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
                    title="عرض قائمة وسجل فواتير المشتريات"
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span>قائمة الفواتير ({purchaseInvoices.length})</span>
                  </button>
                </div>
              </div>
            </div>
          </footer>
        </>
      ) : (
        /* ARCHIVE & LIST OF PURCHASES */
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">أرشيف وسجل فواتير المشتريات</h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  مراجعة وتعديل فواتير التوريد المسجلة للموردين والشركات
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setActiveTabMode('create')}
                className="px-4 py-2 rounded-xl text-xs font-black bg-amber-700 hover:bg-amber-600 text-white shadow-md transition-all flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>العودة لشاشة فاتورة المشتريات</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث برقم فاتورة المشتريات أو اسم الشركة الموردة..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 focus:bg-white transition-colors"
              />
            </div>

            {selectedPurchaseIds.length > 0 && (
              <button
                onClick={handleBatchDeletePurchases}
                className="bg-red-600 hover:bg-red-500 text-white font-extrabold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95 text-xs shrink-0 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف المحدد ({selectedPurchaseIds.length})</span>
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
                        checked={isAllPurchasesSelected}
                        onChange={toggleSelectAllPurchases}
                        className="w-4 h-4 accent-amber-600 cursor-pointer rounded"
                        title="تحديد الكل"
                      />
                    </th>
                    <th className="py-3.5 px-4">رقم الفاتورة</th>
                    <th className="py-3.5 px-4">الشركة الموردة</th>
                    <th className="py-3.5 px-4">تاريخ التوريد</th>
                    <th className="py-3.5 px-4">عدد الأصناف</th>
                    <th className="py-3.5 px-4">إجمالي الفاتورة</th>
                    <th className="py-3.5 px-4">المسدد نقداً</th>
                    <th className="py-3.5 px-4">المتبقي (مستحق للمورد)</th>
                    <th className="py-3.5 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchases.map(inv => {
                    const isSelected = selectedPurchaseIds.includes(inv.id);
                    return (
                      <tr
                        key={inv.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? 'bg-amber-50/80 font-bold' : ''
                        }`}
                      >
                        <td className="py-3.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOnePurchase(inv.id)}
                            className="w-4 h-4 accent-amber-600 cursor-pointer rounded"
                          />
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-sm">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-sm sm:text-base">
                          {inv.supplierName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-mono text-xs sm:text-sm">
                          {new Date(inv.date).toLocaleDateString('ar-EG')}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 text-xs sm:text-sm font-medium">
                          {inv.items.length} صنف ({inv.items.reduce((s, i) => s + i.quantity, 0)} وحدة)
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-slate-900 text-sm sm:text-base">
                          {inv.total.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-amber-700 font-black text-sm sm:text-base">
                          {inv.paidAmount.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          {inv.remainingAmount > 0 ? (
                            <span className="font-black text-red-700 text-sm sm:text-base">
                              {inv.remainingAmount.toLocaleString()} {settings.currency}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-semibold">مسدد بالكامل</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="p-2 rounded-xl text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                              title="عرض تفاصيل الفاتورة"
                            >
                              <Eye className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(inv)}
                              className="p-2 rounded-xl text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                              title="تعديل فاتورة المشتريات"
                            >
                              <Edit className="w-4.5 h-4.5" />
                            </button>
                            {(currentUser?.role === 'admin' || currentUser?.role === 'storekeeper') && (
                              <button
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `هل أنت متأكد من حذف فاتورة المشتريات ${inv.invoiceNumber} نهائياً؟`
                                    )
                                  ) {
                                    deletePurchaseInvoice(inv.id);
                                  }
                                }}
                                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="حذف فاتورة المشتريات نهائياً"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredPurchases.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400">
                        لا توجد فواتير مشتريات مطابقة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Disbursement Voucher Modal (سند صرف للمورد) */}
      <VoucherModal
        isOpen={showDisbursementModal && !!selectedSupplier}
        onClose={() => setShowDisbursementModal(false)}
        direction="out"
        defaultPartyType="supplier"
        defaultPartyId={selectedSupplier?.id}
        defaultAmount={disbursementAmount}
        defaultNotes={disbursementNotes}
        onSuccess={() => {
          setSupplierActionNotice('تم إصدار سند صرف وتحديث حساب المورد بنجاح');
          setTimeout(() => setSupplierActionNotice(null), 4000);
        }}
      />

      {/* Quick Add Supplier Modal */}
      <SupplierModal
        isOpen={showAddSupplierModal}
        onClose={() => setShowAddSupplierModal(false)}
        onSuccess={s => {
          selectSupplier(s);
          setSupplierActionNotice(`تم تسجيل واختيار المورد ${s.name} بنجاح`);
          setTimeout(() => setSupplierActionNotice(null), 4000);
        }}
      />

      {/* Supplier Statement Modal (كشف حساب للمورد) */}
      {showStatementModal && selectedSupplier && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-50 overflow-y-auto">
          <DetailedSupplierStatement
            initialSupplierId={selectedSupplier.id}
            isModal={true}
            onClose={() => setShowStatementModal(false)}
          />
        </div>
      )}

      {/* View Bill Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-black text-slate-900 text-base">
                تفاصيل فاتورة المشتريات: {selectedInvoice.invoiceNumber}
              </h3>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 text-xs flex justify-between">
              <div>
                <span className="text-slate-500 block">الشركة الموردة:</span>
                <span className="font-bold text-slate-900">{selectedInvoice.supplierName}</span>
              </div>
              <div className="text-left font-mono">
                <span className="text-slate-500 block">تاريخ الفاتورة:</span>
                <span className="font-bold text-slate-800">
                  {new Date(selectedInvoice.date).toLocaleDateString('ar-EG')}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden mb-4 text-xs">
              <table className="w-full text-right">
                <thead className="bg-slate-100 font-bold text-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">الصنف</th>
                    <th className="py-2.5 px-3">الكمية</th>
                    <th className="py-2.5 px-3">سعر الشراء</th>
                    <th className="py-2.5 px-3">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.items.map((it, i) => (
                    <tr key={i}>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{it.productName}</td>
                      <td className="py-2.5 px-3 font-mono font-bold">
                        {it.quantity} {it.unit}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {it.unitPrice} {settings.currency}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-black text-slate-900">
                        {it.total} {settings.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between font-black text-slate-900 text-sm">
                <span className="font-sans">إجمالي الفاتورة:</span>
                <span>
                  {selectedInvoice.total} {settings.currency}
                </span>
              </div>
              <div className="flex justify-between text-amber-700 font-bold">
                <span className="font-sans">المدفوع نقداً:</span>
                <span>
                  {selectedInvoice.paidAmount} {settings.currency}
                </span>
              </div>
              <div className="flex justify-between text-red-700 font-bold">
                <span className="font-sans">المتبقي آجل للمورد:</span>
                <span>
                  {selectedInvoice.remainingAmount} {settings.currency}
                </span>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="bg-slate-800 text-white font-bold py-2 px-5 rounded-xl text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Purchase Invoice Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-700" />
                <h3 className="font-black text-slate-900 text-base">
                  تعديل فاتورة المشتريات: {editingInvoice.invoiceNumber}
                </h3>
              </div>
              <button onClick={() => setEditingInvoice(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBillSubmit} className="space-y-3.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">الشركة الموردة *</label>
                <select
                  value={editSupplierId}
                  onChange={e => setEditSupplierId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-amber-500"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">إجمالي الفاتورة</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editTotalAmount}
                    onChange={e => setEditTotalAmount(Number(e.target.value))}
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">المبلغ المسدد نقداً</label>
                  <input
                    type="number"
                    min="0"
                    max={editTotalAmount}
                    required
                    value={editPaidAmount}
                    onChange={e => setEditPaidAmount(Number(e.target.value))}
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl font-mono font-bold text-amber-700"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">طريقة السداد</label>
                <select
                  value={editPaymentMethod}
                  onChange={e => setEditPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-semibold focus:ring-2 focus:ring-amber-500"
                >
                  <option value="credit">آجل (على الحساب)</option>
                  <option value="cash">نقدي فوري (من الخزينة)</option>
                  <option value="transfer">تحويل بنكي</option>
                </select>
              </div>

              <div className="p-3 bg-red-50 rounded-xl border border-red-200 font-mono font-bold text-red-900 flex justify-between">
                <span>المتبقي آجل للمورد:</span>
                <span>
                  {Math.max(0, editTotalAmount - editPaidAmount)} {settings.currency}
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ملاحظات الفاتورة</label>
                <input
                  type="text"
                  placeholder="ملاحظات التعديل..."
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl shadow-md transition-all"
                >
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl"
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
