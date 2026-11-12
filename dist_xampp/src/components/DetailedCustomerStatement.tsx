import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { InvoiceItem } from '../types';
import { VoucherModal } from './VoucherModal';
import {
  FileText,
  Printer,
  Download,
  Send,
  Plus,
  Percent,
  MessageSquare,
  Phone,
  Search,
  SlidersHorizontal,
  X,
  Zap,
  Users,
  Receipt,
  FolderOpen,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface DetailedCustomerStatementProps {
  initialCustomerId?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export const DetailedCustomerStatement: React.FC<DetailedCustomerStatementProps> = ({
  initialCustomerId,
  onClose,
  isModal = false,
}) => {
  const {
    customers,
    salesInvoices,
    transactions,
    salesReturns,
    settings,
    updateCustomer,
    addManualCashTransaction,
    closeStatement,
  } = useApp();

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      closeStatement();
    }
  };

  // Active Selected Customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialCustomerId || customers[0]?.id || ''
  );

  const activeCustomer = useMemo(
    () => customers.find(c => c.id === selectedCustomerId) || customers[0],
    [customers, selectedCustomerId]
  );

  // Zoom & Fullscreen UI Controls
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Top Sub-Tab ('account' | 'sales' | 'payments')
  const [subTab, setSubTab] = useState<'account' | 'sales' | 'payments'>('account');

  // Date Range Filters
  const [dateFrom, setDateFrom] = useState<string>('2020-01-01');
  const [dateTo, setDateTo] = useState<string>('2099-12-31');

  // Search & Type Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);

  // Statement View Style Tab (Default to 'advanced' as requested by user)
  const [statementStyle, setStatementStyle] = useState<'detailed' | 'classic' | 'advanced'>('advanced');

  // Column Visibility State
  const [showColumnMenu, setShowColumnMenu] = useState<boolean>(false);
  const [visibleColumns, setVisibleColumns] = useState({
    index: true,
    date: true,
    type: true,
    details: true,
    credit: true,
    debit: true,
    balance: true,
  });

  const visibleColumnsCount = Object.values(visibleColumns).filter(Boolean).length;

  // Payment Collect Modal State
  const [showCollectModal, setShowCollectModal] = useState(false);

  // Discount Modal State
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountNotes, setDiscountNotes] = useState<string>('');

  const handleDiscountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || discountAmount <= 0) return;

    const newBalance = Math.max(0, activeCustomer.currentBalance - discountAmount);
    updateCustomer(activeCustomer.id, { currentBalance: newBalance });

    addManualCashTransaction({
      title: `خصم تسوية مالي للعميل: ${activeCustomer.name}`,
      amount: discountAmount,
      direction: 'out',
      notes: discountNotes || 'خصم مالي خاص على كشف الحساب',
    });

    setShowDiscountModal(false);
    setDiscountAmount(0);
    setDiscountNotes('');
  };

  // Quick Date Preset Handlers
  const handleDatePreset = (preset: 'all' | 'thisMonth' | 'thisYear') => {
    const now = new Date();
    if (preset === 'all') {
      setDateFrom('2020-01-01');
      setDateTo('2099-12-31');
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setDateFrom(firstDay.toISOString().slice(0, 10));
      setDateTo(lastDay.toISOString().slice(0, 10));
    } else if (preset === 'thisYear') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      setDateFrom(firstDay.toISOString().slice(0, 10));
      setDateTo(lastDay.toISOString().slice(0, 10));
    }
  };

  // Build Chronological Ledger Entries with Full Itemized Details for Invoices & Returns
  const rawLedgerEntries = useMemo(() => {
    if (!activeCustomer) return [];

    interface Entry {
      id: string;
      date: string;
      rawDate: Date;
      typeBadge: 'opening' | 'invoice' | 'receipt' | 'return';
      typeLabel: string;
      docNumber?: string;
      description: string;
      notes?: string;
      items?: InvoiceItem[];
      invoiceDiscount?: number;
      invoiceSubtotal?: number;
      invoiceNetTotal?: number;
      credit: number; // دائن (له - دفعات وسندات ومرتجعات)
      debit: number;  // مدين (عليه - فواتير ومسحوبات)
    }

    const list: Entry[] = [];

    // Calculate inferred opening balance if initialBalance is not explicitly set
    const custInvoices = salesInvoices.filter(
      inv => inv.customerId === activeCustomer.id && inv.status !== 'cancelled'
    );
    const custReturns = salesReturns.filter(ret => ret.customerId === activeCustomer.id);
    const custReceipts = transactions.filter(
      tx =>
        tx.type === 'debt_collection' &&
        (tx.referenceId === activeCustomer.id ||
          (activeCustomer.name && tx.title?.includes(activeCustomer.name)))
    );

    const sumInvoicesDebit = custInvoices.reduce((s, i) => s + i.total, 0);
    const sumInvoicesPaid = custInvoices.reduce((s, i) => s + i.paidAmount, 0);
    const sumReturnsCredit = custReturns.reduce((s, r) => s + r.total, 0);
    const sumReceiptsCredit = custReceipts.reduce((s, t) => s + t.amount, 0);

    const netTransactionsDelta =
      sumInvoicesDebit - (sumInvoicesPaid + sumReturnsCredit + sumReceiptsCredit);

    const initialBal =
      activeCustomer.initialBalance !== undefined
        ? activeCustomer.initialBalance
        : Math.round((activeCustomer.currentBalance - netTransactionsDelta) * 100) / 100;

    // 1. Opening Balance (الرصيد السابق المرحل)
    if (initialBal !== 0) {
      list.push({
        id: `opening-${activeCustomer.id}`,
        date: '2026-01-01',
        rawDate: new Date('2026-01-01T00:00:00'),
        typeBadge: 'opening',
        typeLabel: 'رصيد سابق',
        description: 'رصيد سابق مرحل',
        credit: initialBal < 0 ? Math.abs(initialBal) : 0,
        debit: initialBal > 0 ? initialBal : 0,
      });
    }

    // 2. Sales Invoices (فواتير المبيعات)
    custInvoices.forEach(inv => {
      list.push({
        id: `inv-${inv.id}`,
        date: inv.date.slice(0, 10),
        rawDate: new Date(inv.date),
        typeBadge: 'invoice',
        typeLabel: 'فاتورة بيع',
        docNumber: inv.invoiceNumber,
        description: `فاتورة بيع - رقم : ${inv.invoiceNumber}`,
        notes: inv.notes,
        items: inv.items || [],
        invoiceDiscount: inv.discount || 0,
        invoiceSubtotal: inv.subtotal || inv.total,
        invoiceNetTotal: inv.total,
        debit: inv.total,
        credit: 0,
      });

      // If invoice had a paid amount directly at invoice creation
      if (inv.paidAmount > 0) {
        const payMethodLabel =
          inv.paymentMethod === 'vodafone'
            ? 'فودافون كاش'
            : inv.paymentMethod === 'instapay'
            ? 'انستا باي'
            : 'نقدي';
        list.push({
          id: `inv-paid-${inv.id}`,
          date: inv.date.slice(0, 10),
          rawDate: new Date(new Date(inv.date).getTime() + 1000),
          typeBadge: 'receipt',
          typeLabel: 'سند قبض',
          docNumber: `REC-${inv.invoiceNumber.replace(/\D/g, '') || inv.id.slice(0, 6)}`,
          description: `سند قبض (${payMethodLabel}) - رقم : REC-${inv.invoiceNumber.replace(/\D/g, '') || inv.id.slice(0, 6)}`,
          debit: 0,
          credit: inv.paidAmount,
        });
      }
    });

    // 3. Direct Debt Collections / Receipts (سندات القبض)
    custReceipts.forEach(tx => {
      list.push({
        id: `tx-${tx.id}`,
        date: tx.date.slice(0, 10),
        rawDate: new Date(tx.date),
        typeBadge: 'receipt',
        typeLabel: 'سند قبض',
        docNumber: `REC-${tx.id.replace(/\D/g, '').slice(0, 6) || tx.id.slice(0, 6)}`,
        description:
          tx.title || `سند قبض (نقدي) - رقم : REC-${tx.id.replace(/\D/g, '').slice(0, 6) || tx.id.slice(0, 6)}`,
        notes: tx.notes,
        debit: 0,
        credit: tx.amount,
      });
    });

    // 4. Sales Returns (فواتير مرتجع المبيعات)
    custReturns.forEach(ret => {
      list.push({
        id: `ret-${ret.id}`,
        date: ret.date.slice(0, 10),
        rawDate: new Date(ret.date),
        typeBadge: 'return',
        typeLabel: 'مرتجع بيع',
        docNumber: ret.returnNumber,
        description: `فاتورة مرتجع مبيعات - رقم : ${ret.returnNumber}`,
        notes: ret.notes || (ret.originalInvoiceNumber ? `مرتجع من فاتورة ${ret.originalInvoiceNumber}` : undefined),
        items: ret.items || [],
        invoiceDiscount: 0,
        invoiceSubtotal: ret.total,
        invoiceNetTotal: ret.total,
        debit: 0,
        credit: ret.total,
      });
    });

    // Sort chronologically ascending
    list.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

    return list;
  }, [activeCustomer, salesInvoices, transactions, salesReturns]);

  // Filter Ledger Entries by Date, Search, SubTab, and Type
  const filteredLedgerEntries = useMemo(() => {
    return rawLedgerEntries.filter(entry => {
      // Date filter
      if (dateFrom && entry.date < dateFrom) return false;
      if (dateTo && entry.date > dateTo) return false;

      // SubTab filter
      if (subTab === 'sales' && entry.typeBadge !== 'invoice' && entry.typeBadge !== 'return') {
        return false;
      }
      if (subTab === 'payments' && entry.typeBadge !== 'receipt') {
        return false;
      }

      // Search query filter (matches description, docNumber, or any item name inside the invoice/return!)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = entry.description.toLowerCase().includes(q);
        const matchType = entry.typeLabel.toLowerCase().includes(q);
        const matchDoc = entry.docNumber ? entry.docNumber.toLowerCase().includes(q) : false;
        const matchItems = entry.items
          ? entry.items.some(it => it.productName.toLowerCase().includes(q))
          : false;
        if (!matchDesc && !matchType && !matchDoc && !matchItems) return false;
      }

      // Document Type filter
      if (documentTypeFilter === 'invoices' && entry.typeBadge !== 'invoice') return false;
      if (documentTypeFilter === 'receipts' && entry.typeBadge !== 'receipt') return false;
      if (documentTypeFilter === 'returns' && entry.typeBadge !== 'return') return false;

      // Status / Balance direction filter
      if (statusFilter === 'debit_only' && entry.debit <= 0) return false;
      if (statusFilter === 'credit_only' && entry.credit <= 0) return false;

      return true;
    });
  }, [rawLedgerEntries, dateFrom, dateTo, subTab, searchQuery, documentTypeFilter, statusFilter]);

  // Compute Running Balance for Filtered Entries
  const calculatedLedger = useMemo(() => {
    let runningBalance = 0;
    return filteredLedgerEntries.map((entry, idx) => {
      runningBalance += entry.debit - entry.credit;
      return {
        ...entry,
        rowNumber: idx + 1,
        runningBalance,
      };
    });
  }, [filteredLedgerEntries]);

  // Financial Totals matching Screenshot (531).png
  const totals = useMemo(() => {
    const openingEntry = rawLedgerEntries.find(e => e.typeBadge === 'opening');
    const openingBal = openingEntry ? openingEntry.debit - openingEntry.credit : 0;

    // Total Debit (excluding opening or including? In Screenshot 531: Opening=42,000, Invoices Debit=416,000, Table footer Debit=458,000, Credit=360,040, Ending=97,960)
    const periodDebit = calculatedLedger
      .filter(e => e.typeBadge !== 'opening')
      .reduce((s, e) => s + e.debit, 0);
    const periodCredit = calculatedLedger
      .filter(e => e.typeBadge !== 'opening')
      .reduce((s, e) => s + e.credit, 0);

    const totalDebitWithOpening = calculatedLedger.reduce((s, e) => s + e.debit, 0);
    const totalCreditWithOpening = calculatedLedger.reduce((s, e) => s + e.credit, 0);

    const endingBalance =
      calculatedLedger.length > 0
        ? calculatedLedger[calculatedLedger.length - 1].runningBalance
        : activeCustomer?.currentBalance || 0;

    return {
      openingBal,
      periodDebit,
      periodCredit,
      totalDebit: totalDebitWithOpening,
      totalCredit: totalCreditWithOpening,
      endingBalance,
      amountDueToUs: endingBalance > 0 ? endingBalance : 0,
      amountDueFromUs: endingBalance < 0 ? Math.abs(endingBalance) : 0,
    };
  }, [calculatedLedger, rawLedgerEntries, activeCustomer]);

  // Helper to compute item discount and total invoice discount
  const getItemDiscountAmount = (item: InvoiceItem) => {
    const gross = Math.round(item.quantity * item.unitPrice * 100) / 100;
    const diff = Math.max(0, Math.round((gross - item.total) * 100) / 100);
    return diff;
  };

  return (
    <div
      style={{ zoom: `${zoomLevel}%` }}
      className="bg-[#f4f6f9] min-h-screen text-slate-900 font-sans text-xs select-none p-2.5 sm:p-4 space-y-3"
      dir="rtl"
    >
      {/* 1. TOP HEADER BAR (عرض جهات الاتصال + أزرار التحكم بالحجم والعميل) */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-200 space-y-3">
        {/* Top Row: Contact Selector on Right, Window/Zoom Controls on Left */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          {/* Right: Title & Contact Dropdown */}
          <div className="flex items-center gap-3 flex-1 min-w-[260px]">
            <h1 className="font-black text-slate-900 text-sm sm:text-base shrink-0">
              عرض جهات الاتصال
            </h1>
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              <select
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-1.5 pr-8 pl-3 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-amber-600 focus:outline-none"
              >
                {customers.map((c, idx) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code || `CO${(idx + 1).toString().padStart(4, '0')}`})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Left: Zoom & Fullscreen Controls matching Screenshot (531).png */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setZoomLevel(z => Math.min(130, z + 5))}
                className="px-2 py-1 hover:bg-white rounded-md transition-colors"
                title="تكبير"
              >
                +
              </button>
              <span className="px-2 font-mono text-slate-700">{zoomLevel}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel(z => Math.max(75, z - 5))}
                className="px-2 py-1 hover:bg-white rounded-md transition-colors"
                title="تصغير"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                className="px-2 py-1 hover:bg-white rounded-md text-slate-600 border-r border-slate-200"
              >
                افتراضي
              </button>
            </div>

            <div className="hidden sm:flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                className={`px-2 py-1 rounded-md transition-colors ${zoomLevel === 100 ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-600'}`}
              >
                عادي
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(110)}
                className={`px-2 py-1 rounded-md transition-colors ${zoomLevel === 110 ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-600'}`}
              >
                كبير
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-md transition-colors"
              >
                ملء الشاشة
              </button>
            </div>

            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 text-[11px] font-bold flex items-center gap-1"
            >
              <Minimize2 className="w-3 h-3" />
              <span className="hidden md:inline">استعادة الحجم</span>
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded-lg border border-slate-200 transition-colors"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Second Row inside Card 1: Customer Name + Call/WhatsApp on Right, Add Payment / Add Discount on Left */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Right: Customer Name & Quick Contact */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-800 font-black text-sm">
              <Users className="w-4 h-4 text-slate-600" />
              <span>{activeCustomer?.name || 'غير محدد'}</span>
            </div>
            <span className="bg-slate-200 text-slate-700 font-bold px-2.5 py-0.5 rounded-md text-[11px]">
              العميل
            </span>

            <button
              type="button"
              onClick={() => {
                if (activeCustomer?.phone) {
                  window.location.href = `tel:${activeCustomer.phone}`;
                }
              }}
              className="bg-[#e11d48] hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs shadow-xs transition-all"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>الاتصال</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (activeCustomer?.phone) {
                  window.open(`https://wa.me/2${activeCustomer.phone.replace(/\D/g, '')}`, '_blank');
                }
              }}
              className="bg-[#b45309] hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs shadow-xs transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>دردشة واتساب</span>
            </button>
          </div>

          {/* Left: Add Discount & Add Payment */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDiscountModal(true)}
              className="bg-[#7e22ce] hover:bg-purple-800 text-white font-black px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs shadow-xs transition-all active:scale-95"
            >
              <Percent className="w-3.5 h-3.5" />
              <span>% إضافة خصم</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCollectModal(true)}
              className="bg-[#e11d48] hover:bg-rose-700 text-white font-black px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ إضافة دفع</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. SECOND BAR (أزرار حساب / المبيعات / المدفوعات + نطاق التاريخ + طباعة وتصدير PDF) */}
      <div className="bg-white rounded-2xl p-2.5 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-2">
        {/* Right: Sub-Tabs + Date Range + Presets */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-Tabs */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSubTab('account')}
              className={`px-3 py-1.5 rounded-lg font-black text-xs flex items-center gap-1.5 transition-all ${
                subTab === 'account'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>حساب</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('sales')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                subTab === 'sales'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>المبيعات</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('payments')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                subTab === 'payments'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>المدفوعات</span>
            </button>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-xs">
            <span className="font-bold text-slate-600">نطاق التاريخ: من</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-white border border-slate-300 rounded-md px-2 py-0.5 font-mono font-bold text-xs text-slate-800"
            />
            <span className="font-bold text-slate-600">إلى</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-white border border-slate-300 rounded-md px-2 py-0.5 font-mono font-bold text-xs text-slate-800"
            />
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleDatePreset('thisMonth')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs border border-slate-200"
            >
              هذا الشهر
            </button>
            <button
              type="button"
              onClick={() => handleDatePreset('thisYear')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs border border-slate-200"
            >
              السنة الحالية
            </button>
            <button
              type="button"
              onClick={() => handleDatePreset('all')}
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-black rounded-lg text-xs border border-amber-200"
            >
              الكل
            </button>
          </div>
        </div>

        {/* Left: Print, Export PDF, Send WhatsApp Reminder */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-[#e11d48] hover:bg-rose-700 text-white font-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs shadow-xs transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة كشف الحساب</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="bg-[#be123c] hover:bg-rose-800 text-white font-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs shadow-xs transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير PDF</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (activeCustomer?.phone) {
                const msg = encodeURIComponent(
                  `كشف حساب مالي معتمد من ${settings.storeName}\nالعميل: ${activeCustomer.name}\nالمبلغ المستحق: ${totals.endingBalance.toLocaleString()} ج.م`
                );
                window.open(`https://wa.me/2${activeCustomer.phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
              }
            }}
            className="bg-[#1e293b] hover:bg-slate-800 text-white font-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs shadow-xs transition-all"
          >
            <Send className="w-3.5 h-3.5 text-amber-400" />
            <span>إرسال تذكير واتساب</span>
          </button>
        </div>
      </div>

      {/* 3. UNIFIED DARK HEADER BANNER + 5-COLUMN KPI SUMMARY STRIP (مطابق للصورة 100%) */}
      <div className="rounded-2xl overflow-hidden shadow-md border border-slate-300 bg-white">
        {/* Top Dark Navy Banner */}
        <div className="bg-[#0f172a] text-white px-5 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Right: Store Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white text-slate-950 flex items-center justify-center font-black shadow-md shrink-0 border-2 border-amber-400">
              <Zap className="w-6 h-6 text-amber-500 fill-amber-500" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                {settings.storeName}
              </h2>
              <p className="text-[11px] text-slate-300 font-bold">
                تجارة وتوريد الكابلات والأدوات الكهربائية المعتمدة
              </p>
            </div>
          </div>

          {/* Center: Gold Outlined Title Badge */}
          <div className="text-center">
            <div className="border border-amber-500/80 bg-amber-500/10 text-amber-400 font-black px-5 py-1 rounded-lg text-xs sm:text-sm inline-block shadow-xs">
              كشف حساب مالي تفصيلي معتمد
            </div>
            <div className="text-[11px] text-slate-300 font-mono font-bold mt-1">
              الفترة: {dateFrom} — {dateTo}
            </div>
          </div>

          {/* Left: Client Info Box */}
          <div className="bg-[#1e293b] border border-slate-700 px-4 py-2.5 rounded-xl text-right min-w-[220px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-300 text-xs font-bold">
                العميل: <strong className="text-amber-400 font-black text-sm">{activeCustomer?.name || 'غير محدد'}</strong>
              </span>
              <span className="bg-slate-800 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded font-mono text-[11px] font-bold">
                {activeCustomer?.code || 'CO0001'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-bold mt-1">
              التصنيف: {activeCustomer?.cropTypes || 'مقاول / عميل تجاري'}
            </div>
          </div>
        </div>

        {/* Attached 5-Column Financial Summary Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-200 text-center bg-white">
          {/* 1. Opening Balance */}
          <div className="p-3 flex flex-col justify-center">
            <span className="text-slate-500 text-[11px] font-bold mb-1">
              الرصيد السابق (الافتتاحي)
            </span>
            <div className="font-mono font-black text-slate-800 text-sm sm:text-base">
              {Math.abs(totals.openingBal).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م{' '}
              <span className="text-[11px] font-bold text-slate-500">
                ({totals.openingBal >= 0 ? 'مدين' : 'دائن'})
              </span>
            </div>
          </div>

          {/* 2. Total Debit */}
          <div className="p-3 flex flex-col justify-center">
            <span className="text-amber-600 text-[11px] font-bold mb-1">
              إجمالي المدين
            </span>
            <div className="font-mono font-black text-amber-600 text-sm sm:text-base">
              {totals.periodDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
            </div>
          </div>

          {/* 3. Total Credit */}
          <div className="p-3 flex flex-col justify-center">
            <span className="text-amber-600 text-[11px] font-bold mb-1">
              إجمالي الدائن
            </span>
            <div className="font-mono font-black text-amber-600 text-sm sm:text-base">
              {totals.periodCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
            </div>
          </div>

          {/* 4. Amount Due From Us (Credit Balance) */}
          <div className="p-3 flex flex-col justify-center bg-rose-50/40">
            <span className="text-rose-600 text-[11px] font-bold mb-1">
              مبلغ مستحق علينا (دائن)
            </span>
            <div className="font-mono font-black text-rose-600 text-sm sm:text-base">
              {totals.amountDueFromUs.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
            </div>
          </div>

          {/* 5. Amount Due To Us (Debit Balance) */}
          <div className="p-3 flex flex-col justify-center bg-amber-50/50 col-span-2 lg:col-span-1">
            <span className="text-amber-700 text-[11px] font-bold mb-1">
              المبلغ المستحق لنا (مدين)
            </span>
            <div className="font-mono font-black text-amber-700 text-base sm:text-lg">
              {totals.amountDueToUs.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
            </div>
          </div>
        </div>
      </div>

      {/* 4. THREE STATEMENT MODE TABS (كشف حساب مفصل | كشف حساب كلاسيك | كشف حساب متقدم) */}
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setStatementStyle('detailed')}
          className={`py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all border ${
            statementStyle === 'detailed'
              ? 'bg-[#16325c] text-white border-[#16325c] shadow-md'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          <FolderOpen className="w-4 h-4 text-amber-500" />
          <span>كشف حساب مفصل</span>
        </button>

        <button
          type="button"
          onClick={() => setStatementStyle('classic')}
          className={`py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all border ${
            statementStyle === 'classic'
              ? 'bg-[#16325c] text-white border-[#16325c] shadow-md'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4 text-slate-500" />
          <span>كشف حساب كلاسيك</span>
        </button>

        <button
          type="button"
          onClick={() => setStatementStyle('advanced')}
          className={`py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all border ${
            statementStyle === 'advanced'
              ? 'bg-[#16325c] text-white border-[#16325c] shadow-md'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-rose-300" />
          <span>كشف حساب متقدم</span>
        </button>
      </div>

      {/* 5. FILTER BAR & COLUMN VISIBILITY CONTROL */}
      <div className="bg-white rounded-xl p-2.5 shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-2">
        {/* Right Side Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <span className="font-bold text-slate-600 text-xs">صفوف:</span>
            <select
              value={rowsPerPage}
              onChange={e => setRowsPerPage(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={500}>الكل</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <span className="font-bold text-slate-600 text-xs">الحالة / الرصيد:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none"
            >
              <option value="all">جميع الحالات (الكل)</option>
              <option value="debit_only">حركات مدينة فقط (عليه)</option>
              <option value="credit_only">حركات دائنة فقط (له)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <span className="font-bold text-slate-600 text-xs">نوع المستند:</span>
            <select
              value={documentTypeFilter}
              onChange={e => setDocumentTypeFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none"
            >
              <option value="all">جميع المستندات</option>
              <option value="invoices">فواتير المبيعات</option>
              <option value="returns">مرتجعات المبيعات</option>
              <option value="receipts">سندات القبض</option>
            </select>
          </div>
        </div>

        {/* Left Side: Search Box + Column Control */}
        <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
          <div className="relative w-full sm:w-56">
            <input
              type="text"
              placeholder="بحث بالرقم أو البيان أو الصنف..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold bg-slate-50 focus:bg-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColumnMenu(prev => !prev)}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-black text-xs flex items-center gap-1.5 transition-colors shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>التحكم بالأعمدة ({visibleColumnsCount})</span>
            </button>

            {showColumnMenu && (
              <div className="absolute left-0 mt-1.5 w-48 bg-white border border-slate-300 rounded-xl shadow-xl p-2.5 z-30 space-y-1.5 text-xs font-bold">
                {[
                  { key: 'index', label: 'م (التسلسل)' },
                  { key: 'date', label: 'التاريخ' },
                  { key: 'type', label: 'نوع الحركة' },
                  { key: 'details', label: 'البيان وتفاصيل الحركة' },
                  { key: 'credit', label: 'دائن (له)' },
                  { key: 'debit', label: 'مدين (عليه)' },
                  { key: 'balance', label: 'الرصيد (ج.م)' },
                ].map(col => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[col.key as keyof typeof visibleColumns]}
                      onChange={e =>
                        setVisibleColumns(prev => ({
                          ...prev,
                          [col.key]: e.target.checked,
                        }))
                      }
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-slate-800">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. MAIN LEDGER TABLE WITH EMBEDDED ITEMIZED SUB-TABLES (مطابق للصورة 531) */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-[#0f172a] text-white font-black text-xs border-b border-slate-700">
                {visibleColumns.index && (
                  <th className="py-3 px-2.5 text-center border-l border-slate-800 w-10">م</th>
                )}
                {visibleColumns.date && (
                  <th className="py-3 px-3 text-center border-l border-slate-800 w-28">التاريخ</th>
                )}
                {visibleColumns.type && (
                  <th className="py-3 px-3 text-center border-l border-slate-800 w-28">نوع الحركة</th>
                )}
                {visibleColumns.details && (
                  <th className="py-3 px-4 text-center border-l border-slate-800">
                    البيان وتفاصيل الحركة
                  </th>
                )}
                {visibleColumns.credit && (
                  <th className="py-3 px-3 text-center border-l border-slate-800 w-32 text-amber-400">
                    دائن (له)
                  </th>
                )}
                {visibleColumns.debit && (
                  <th className="py-3 px-3 text-center border-l border-slate-800 w-32 text-rose-300">
                    مدين (عليه)
                  </th>
                )}
                {visibleColumns.balance && (
                  <th className="py-3 px-3 text-center w-44 text-amber-400">
                    الرصيد (ج.م)
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-300 font-medium">
              {calculatedLedger.slice(0, rowsPerPage).map(item => {
                const hasItemsTable =
                  statementStyle !== 'classic' &&
                  item.items &&
                  item.items.length > 0 &&
                  (item.typeBadge === 'invoice' || item.typeBadge === 'return');

                const itemsDiscountSum = (item.items || []).reduce(
                  (s, it) => s + getItemDiscountAmount(it),
                  0
                );
                const totalDocDiscount = itemsDiscountSum + (item.invoiceDiscount || 0);
                const netDocTotal = item.invoiceNetTotal ?? (item.debit || item.credit);

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors align-middle">
                    {/* 1. م */}
                    {visibleColumns.index && (
                      <td className="py-3 px-2.5 text-center font-mono font-bold text-slate-600 border-l border-slate-200">
                        {item.rowNumber}
                      </td>
                    )}

                    {/* 2. التاريخ */}
                    {visibleColumns.date && (
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 border-l border-slate-200">
                        {item.date}
                      </td>
                    )}

                    {/* 3. نوع الحركة */}
                    {visibleColumns.type && (
                      <td className="py-3 px-3 text-center border-l border-slate-200">
                        <span
                          className={`inline-block px-3 py-1 rounded-md font-black text-[11px] border ${
                            item.typeBadge === 'opening'
                              ? 'bg-slate-50 text-slate-700 border-slate-300'
                              : item.typeBadge === 'invoice'
                              ? 'bg-amber-50 text-amber-700 border-amber-300'
                              : item.typeBadge === 'receipt'
                              ? 'bg-amber-50 text-amber-700 border-amber-300'
                              : 'bg-rose-50 text-rose-700 border-rose-300'
                          }`}
                        >
                          {item.typeLabel}
                        </span>
                      </td>
                    )}

                    {/* 4. البيان وتفاصيل الحركة */}
                    {visibleColumns.details && (
                      <td className="py-2.5 px-4 font-bold text-slate-900 border-l border-slate-200">
                        {hasItemsTable ? (
                          <div className="space-y-1.5 my-0.5">
                            {/* Top Summary Line above Embedded Table */}
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-xs">
                              <span className="font-black text-slate-800">
                                {item.typeBadge === 'return'
                                  ? `فاتورة مرتجع مبيعات - رقم : ${item.docNumber}`
                                  : `فاتورة بيع - رقم : ${item.docNumber}`}
                              </span>
                              <span className="text-slate-400">|</span>
                              <span className="text-amber-600 font-black">
                                {item.notes ? item.notes : `تاريخ المستند : ${item.date}`}
                              </span>
                              <span className="text-slate-400">|</span>
                              <span className="text-amber-700 font-black">
                                عدد الأصناف : {item.items?.length || 0}
                              </span>
                            </div>

                            {/* Embedded Itemized Sub-Table matching Screenshot (531).png */}
                            <div className="border border-slate-300 rounded-lg overflow-hidden shadow-2xs">
                              <table className="w-full text-right text-[11px] border-collapse">
                                <thead>
                                  <tr className="bg-[#2c3e50] text-white font-black">
                                    <th className="py-1.5 px-3 text-right border-l border-slate-600">
                                      اسم البند / الصنف
                                    </th>
                                    <th className="py-1.5 px-2 text-center border-l border-slate-600 w-20">
                                      العدد
                                    </th>
                                    <th className="py-1.5 px-2 text-center border-l border-slate-600 w-24">
                                      السعر
                                    </th>
                                    <th className="py-1.5 px-2 text-center border-l border-slate-600 w-24 text-rose-200">
                                      الخصم
                                    </th>
                                    <th className="py-1.5 px-2.5 text-center w-28">
                                      الصافي
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white font-bold">
                                  {item.items?.map((subItem, sIdx) => {
                                    const itemDisc = getItemDiscountAmount(subItem);
                                    return (
                                      <tr key={sIdx} className="hover:bg-slate-50">
                                        <td className="py-1.5 px-3 text-slate-800 border-l border-slate-200">
                                          {subItem.productName}
                                        </td>
                                        <td className="py-1.5 px-2 text-center font-mono text-slate-900 border-l border-slate-200">
                                          {subItem.quantity}
                                        </td>
                                        <td className="py-1.5 px-2 text-center font-mono text-slate-800 border-l border-slate-200">
                                          {subItem.unitPrice.toLocaleString('en-US')}
                                        </td>
                                        <td className="py-1.5 px-2 text-center font-mono text-rose-600 border-l border-slate-200">
                                          {itemDisc > 0 ? itemDisc.toLocaleString('en-US') : '0'}
                                        </td>
                                        <td className="py-1.5 px-2.5 text-center font-mono font-black text-amber-700">
                                          {subItem.total.toLocaleString('en-US')}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr className="bg-slate-50 border-t border-slate-300 font-black text-[11px]">
                                    <td
                                      colSpan={3}
                                      className="py-1.5 px-3 text-left text-slate-600 border-l border-slate-200"
                                    >
                                      {item.typeBadge === 'return'
                                        ? 'إجمالي الخصم والصافي للمرتجع:'
                                        : 'إجمالي الخصم والصافي للفاتورة:'}
                                    </td>
                                    <td className="py-1.5 px-2 text-center font-mono text-rose-600 border-l border-slate-200">
                                      {totalDocDiscount.toLocaleString('en-US')}
                                    </td>
                                    <td className="py-1.5 px-2.5 text-center font-mono text-amber-800">
                                      {netDocTotal.toLocaleString('en-US')}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div className="py-1 text-slate-800 font-black text-xs">
                            {item.description}
                          </div>
                        )}
                      </td>
                    )}

                    {/* 5. دائن (له) */}
                    {visibleColumns.credit && (
                      <td className="py-3 px-3 text-center font-mono font-black text-amber-700 text-xs sm:text-sm border-l border-slate-200">
                        {item.credit > 0
                          ? item.credit.toLocaleString('en-US', { minimumFractionDigits: 2 })
                          : '-'}
                      </td>
                    )}

                    {/* 6. مدين (عليه) */}
                    {visibleColumns.debit && (
                      <td className="py-3 px-3 text-center font-mono font-black text-rose-600 bg-rose-50/30 text-xs sm:text-sm border-l border-slate-200">
                        {item.debit > 0
                          ? item.debit.toLocaleString('en-US', { minimumFractionDigits: 2 })
                          : '-'}
                      </td>
                    )}

                    {/* 7. الرصيد (ج.م) */}
                    {visibleColumns.balance && (
                      <td className="py-3 px-3 text-center font-mono">
                        <span
                          className={`inline-block font-black px-3 py-1 rounded-lg text-xs border ${
                            item.runningBalance >= 0
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                        >
                          {Math.abs(item.runningBalance).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}{' '}
                          ج.م ({item.runningBalance >= 0 ? 'مدين / لنا' : 'دائن / له'})
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}

              {calculatedLedger.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold text-sm">
                    لا توجد حركات أو فواتير مسجلة في كشف الحساب بالفترة المحددة
                  </td>
                </tr>
              )}
            </tbody>

            {/* DARK FOOTER TABLE SUMMARY ROW matching Screenshot (531).png */}
            <tfoot>
              <tr className="bg-[#0f172a] text-white font-black text-xs sm:text-sm border-t-2 border-slate-700">
                <td
                  colSpan={
                    (visibleColumns.index ? 1 : 0) +
                    (visibleColumns.date ? 1 : 0) +
                    (visibleColumns.type ? 1 : 0) +
                    (visibleColumns.details ? 1 : 0)
                  }
                  className="py-3.5 px-4 text-center text-amber-400 font-black border-l border-slate-800"
                >
                  إجمالي كشف الحساب والرصيد الختامي:
                </td>
                {visibleColumns.credit && (
                  <td className="py-3.5 px-3 text-center font-mono text-amber-400 border-l border-slate-800">
                    {totals.totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
                  </td>
                )}
                {visibleColumns.debit && (
                  <td className="py-3.5 px-3 text-center font-mono text-rose-400 border-l border-slate-800">
                    {totals.totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
                  </td>
                )}
                {visibleColumns.balance && (
                  <td className="py-3.5 px-3 text-center font-mono text-amber-400">
                    {Math.abs(totals.endingBalance).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    ج.م ({totals.endingBalance >= 0 ? 'مدين / لنا' : 'دائن / له'})
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 7. STATEMENT BOTTOM BAR */}
      <div className="bg-white rounded-xl px-4 py-2.5 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 font-bold">
        <div>
          <button
            type="button"
            onClick={handleClose}
            className="bg-[#0f172a] hover:bg-slate-800 text-white font-black px-5 py-1.5 rounded-lg text-xs shadow-xs transition-all"
          >
            إغلاق
          </button>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <span>({settings.invoiceFooterNote || 'شكراً لتعاملكم معنا'})</span>
          <span>س.ت: {settings.commercialRecord || '1010508924'}</span>
          <span>{settings.storeName}</span>
        </div>
      </div>

      {/* COLLECT DEBT MODAL */}
      <VoucherModal
        isOpen={showCollectModal}
        onClose={() => setShowCollectModal(false)}
        direction="in"
        defaultPartyType="customer"
        defaultPartyId={activeCustomer?.id}
        defaultAmount={activeCustomer?.currentBalance || 0}
        defaultNotes={activeCustomer ? `سداد دفعة من حساب العميل: ${activeCustomer.name}` : ''}
        onSuccess={() => {
          setShowCollectModal(false);
        }}
      />

      {/* ADD DISCOUNT MODAL */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-slate-400 text-xs">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-300 mb-4">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Percent className="w-5 h-5 text-purple-700" />
                <span>إضافة خصم مالي على حساب: {activeCustomer?.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowDiscountModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDiscountSubmit} className="space-y-3.5">
              <div className="bg-purple-50 p-3 rounded-xl border border-purple-300 flex justify-between items-center">
                <span className="font-bold text-purple-900">الرصيد المتبقي حالياً:</span>
                <span className="font-mono font-black text-purple-950 text-base">
                  {activeCustomer?.currentBalance.toLocaleString()} {settings.currency}
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  مبلغ الخصم المسموح به (ج.م) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  placeholder="0.00"
                  value={discountAmount || ''}
                  onChange={e => setDiscountAmount(Number(e.target.value))}
                  className="w-full py-2.5 px-3 border-2 border-slate-400 rounded-xl font-mono font-black text-lg text-purple-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  سبب الخصم / بيان التسوية
                </label>
                <input
                  type="text"
                  placeholder="مثال: خصم خاص بمناسبة التعاقد / تسوية هالك / خصم كمية"
                  value={discountNotes}
                  onChange={e => setDiscountNotes(e.target.value)}
                  className="w-full py-2 px-3 border-2 border-slate-400 rounded-xl font-bold"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-purple-700 hover:bg-purple-600 text-white font-bold py-2.5 rounded-xl shadow-md transition-all active:scale-95"
                >
                  حفظ الخصم وخصمه من الرصيد
                </button>
                <button
                  type="button"
                  onClick={() => setShowDiscountModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl border border-slate-300"
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
