import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PurchaseInvoiceItem } from '../types';
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
  Building2,
  Receipt,
  FolderOpen,
  FileSpreadsheet,
  Minimize2
} from 'lucide-react';

interface DetailedSupplierStatementProps {
  initialSupplierId?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export const DetailedSupplierStatement: React.FC<DetailedSupplierStatementProps> = ({
  initialSupplierId,
  onClose,
  isModal = false,
}) => {
  const {
    suppliers,
    purchaseInvoices,
    transactions,
    purchaseReturns,
    settings,
    updateSupplier,
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

  // Active Selected Supplier
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    initialSupplierId || suppliers[0]?.id || ''
  );

  const activeSupplier = useMemo(
    () => suppliers.find(s => s.id === selectedSupplierId) || suppliers[0],
    [suppliers, selectedSupplierId]
  );

  // Zoom & Fullscreen UI Controls
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Top Sub-Tab ('account' | 'purchases' | 'payments')
  const [subTab, setSubTab] = useState<'account' | 'purchases' | 'payments'>('account');

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

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Discount Modal State
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountNotes, setDiscountNotes] = useState<string>('');

  const handleDiscountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupplier || discountAmount <= 0) return;

    const newBalance = Math.max(0, activeSupplier.currentBalance - discountAmount);
    updateSupplier(activeSupplier.id, { currentBalance: newBalance });

    addManualCashTransaction({
      title: `خصم تسوية تجاري من المورد: ${activeSupplier.name}`,
      amount: discountAmount,
      direction: 'in',
      notes: discountNotes || 'خصم مالي خاص على كشف الحساب من المورد',
    });

    setShowDiscountModal(false);
    setDiscountAmount(0);
    setDiscountNotes('');
  };

  // Quick Date Filter Presets
  const applyDatePreset = (preset: 'all' | 'this_month' | 'this_year') => {
    const now = new Date();
    if (preset === 'all') {
      setDateFrom('2020-01-01');
      setDateTo('2099-12-31');
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setDateFrom(firstDay.toISOString().slice(0, 10));
      setDateTo(lastDay.toISOString().slice(0, 10));
    } else if (preset === 'this_year') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      setDateFrom(firstDay.toISOString().slice(0, 10));
      setDateTo(lastDay.toISOString().slice(0, 10));
    }
  };

  // Build Chronological Ledger Entries with Full Itemized Details for Purchases & Purchase Returns
  const rawLedgerEntries = useMemo(() => {
    if (!activeSupplier) return [];

    interface Entry {
      id: string;
      date: string;
      rawDate: Date;
      typeBadge: 'opening' | 'invoice' | 'receipt' | 'return';
      typeLabel: string;
      docNumber?: string;
      description: string;
      notes?: string;
      items?: PurchaseInvoiceItem[];
      invoiceDiscount?: number;
      invoiceSubtotal?: number;
      invoiceNetTotal?: number;
      credit: number; // دائن (له - مستحقات وفواتير توريد تزيد حقه)
      debit: number;  // مدين (عليه - سدادات ومرتجعات تنقص حقه)
    }

    const list: Entry[] = [];

    const suppInvoices = purchaseInvoices.filter(
      p => p.supplierId === activeSupplier.id && p.status !== 'cancelled'
    );
    const suppReturns = purchaseReturns.filter(ret => ret.supplierId === activeSupplier.id);
    const suppPayments = transactions.filter(
      tx =>
        tx.type === 'supplier_payment' &&
        (tx.referenceId === activeSupplier.id ||
          (activeSupplier.name && tx.title?.includes(activeSupplier.name)))
    );

    const sumPurchasesCredit = suppInvoices.reduce((s, p) => s + p.total, 0);
    const sumPurchasesPaid = suppInvoices.reduce((s, p) => s + p.paidAmount, 0);
    const sumReturnsDebit = suppReturns.reduce((s, r) => s + r.total, 0);
    const sumPaymentsDebit = suppPayments.reduce((s, t) => s + t.amount, 0);

    const netTransactionsDelta =
      sumPurchasesCredit - (sumPurchasesPaid + sumReturnsDebit + sumPaymentsDebit);

    const initialBal =
      activeSupplier.initialBalance !== undefined
        ? activeSupplier.initialBalance
        : Math.round((activeSupplier.currentBalance - netTransactionsDelta) * 100) / 100;

    // 1. Opening Balance (الرصيد السابق المرحل)
    if (initialBal !== 0) {
      const opDate = activeSupplier.createdAt ? activeSupplier.createdAt.slice(0, 10) : '2026-01-01';
      list.push({
        id: `opening-${activeSupplier.id}`,
        date: opDate,
        rawDate: new Date(`${opDate}T00:00:00`),
        typeBadge: 'opening',
        typeLabel: 'رصيد سابق',
        description: 'رصيد سابق مرحل',
        credit: initialBal > 0 ? initialBal : 0,
        debit: initialBal < 0 ? Math.abs(initialBal) : 0,
      });
    }

    // 2. Purchase Invoices (فواتير المشتريات والتوريد)
    suppInvoices.forEach(p => {
      list.push({
        id: `purch-${p.id}`,
        date: p.date.slice(0, 10),
        rawDate: new Date(p.date),
        typeBadge: 'invoice',
        typeLabel: 'فاتورة مشتريات',
        docNumber: p.invoiceNumber,
        description: `فاتورة مشتريات - رقم : ${p.invoiceNumber}`,
        notes: p.notes,
        items: p.items || [],
        invoiceDiscount: 0,
        invoiceSubtotal: p.total,
        invoiceNetTotal: p.total,
        credit: p.total,
        debit: 0,
      });

      // If invoice was paid in part or full at creation
      if (p.paidAmount > 0) {
        const payMethodLabel =
          p.paymentMethod === 'vodafone'
            ? 'فودافون كاش'
            : p.paymentMethod === 'instapay'
            ? 'انستا باي'
            : 'نقدي';
        list.push({
          id: `purch-paid-${p.id}`,
          date: p.date.slice(0, 10),
          rawDate: new Date(new Date(p.date).getTime() + 1000),
          typeBadge: 'receipt',
          typeLabel: 'سند صرف',
          docNumber: `PAY-${p.invoiceNumber.replace(/\D/g, '') || p.id.slice(0, 6)}`,
          description: `سند صرف (${payMethodLabel}) - رقم : PAY-${p.invoiceNumber.replace(/\D/g, '') || p.id.slice(0, 6)}`,
          credit: 0,
          debit: p.paidAmount,
        });
      }
    });

    // 3. Direct Supplier Payments / Disbursements (سندات الصرف)
    suppPayments.forEach(tx => {
      list.push({
        id: `tx-${tx.id}`,
        date: tx.date.slice(0, 10),
        rawDate: new Date(tx.date),
        typeBadge: 'receipt',
        typeLabel: 'سند صرف',
        docNumber: `PAY-${tx.id.replace(/\D/g, '').slice(0, 6) || tx.id.slice(0, 6)}`,
        description:
          tx.title || `سند صرف (نقدي) - رقم : PAY-${tx.id.replace(/\D/g, '').slice(0, 6) || tx.id.slice(0, 6)}`,
        notes: tx.notes,
        credit: 0,
        debit: tx.amount,
      });
    });

    // 4. Purchase Returns (فواتير مرتجع المشتريات)
    suppReturns.forEach(ret => {
      list.push({
        id: `ret-${ret.id}`,
        date: ret.date.slice(0, 10),
        rawDate: new Date(ret.date),
        typeBadge: 'return',
        typeLabel: 'مرتجع مشتريات',
        docNumber: ret.returnNumber,
        description: `فاتورة مرتجع مشتريات - رقم : ${ret.returnNumber}`,
        notes: ret.notes || (ret.originalInvoiceNumber ? `مرتجع من فاتورة ${ret.originalInvoiceNumber}` : undefined),
        items: ret.items || [],
        invoiceDiscount: 0,
        invoiceSubtotal: ret.total,
        invoiceNetTotal: ret.total,
        credit: 0,
        debit: ret.total,
      });
    });

    // Sort chronologically ascending
    list.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

    return list;
  }, [activeSupplier, purchaseInvoices, transactions, purchaseReturns]);

  // Filter Ledger Entries by Date, Search, SubTab, and Type
  const filteredLedgerEntries = useMemo(() => {
    return rawLedgerEntries.filter(entry => {
      if (dateFrom && entry.date < dateFrom) return false;
      if (dateTo && entry.date > dateTo) return false;

      if (subTab === 'purchases' && entry.typeBadge !== 'invoice' && entry.typeBadge !== 'return') {
        return false;
      }
      if (subTab === 'payments' && entry.typeBadge !== 'receipt') {
        return false;
      }

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

      if (documentTypeFilter === 'invoices' && entry.typeBadge !== 'invoice') return false;
      if (documentTypeFilter === 'receipts' && entry.typeBadge !== 'receipt') return false;
      if (documentTypeFilter === 'returns' && entry.typeBadge !== 'return') return false;

      if (statusFilter === 'debit_only' && entry.debit <= 0) return false;
      if (statusFilter === 'credit_only' && entry.credit <= 0) return false;

      return true;
    });
  }, [rawLedgerEntries, dateFrom, dateTo, subTab, searchQuery, documentTypeFilter, statusFilter]);

  // Compute Running Balance for Filtered Entries (Credit increases supplier balance, Debit reduces it)
  const calculatedLedger = useMemo(() => {
    let runningBalance = 0;
    return filteredLedgerEntries.map((entry, idx) => {
      runningBalance += entry.credit - entry.debit;
      return {
        ...entry,
        rowNumber: idx + 1,
        runningBalance,
      };
    });
  }, [filteredLedgerEntries]);

  // Financial Totals
  const totals = useMemo(() => {
    const openingEntry = rawLedgerEntries.find(e => e.typeBadge === 'opening');
    const openingBal = openingEntry ? openingEntry.credit - openingEntry.debit : 0;

    const periodCredit = calculatedLedger
      .filter(e => e.typeBadge !== 'opening')
      .reduce((s, e) => s + e.credit, 0);
    const periodDebit = calculatedLedger
      .filter(e => e.typeBadge !== 'opening')
      .reduce((s, e) => s + e.debit, 0);

    const totalCreditWithOpening = calculatedLedger.reduce((s, e) => s + e.credit, 0);
    const totalDebitWithOpening = calculatedLedger.reduce((s, e) => s + e.debit, 0);

    const endingBalance =
      calculatedLedger.length > 0
        ? calculatedLedger[calculatedLedger.length - 1].runningBalance
        : activeSupplier?.currentBalance || 0;

    return {
      openingBal,
      periodCredit,
      periodDebit,
      totalCredit: totalCreditWithOpening,
      totalDebit: totalDebitWithOpening,
      endingBalance,
      amountDueToSupplier: endingBalance > 0 ? endingBalance : 0,
      amountPrepaidToUs: endingBalance < 0 ? Math.abs(endingBalance) : 0,
    };
  }, [calculatedLedger, rawLedgerEntries, activeSupplier]);

  const getItemDiscountAmount = (item: PurchaseInvoiceItem) => {
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
      {/* 1. TOP HEADER BAR */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-3 flex-1 min-w-[260px]">
            <h1 className="font-black text-slate-900 text-sm sm:text-base shrink-0">
              عرض جهات الاتصال
            </h1>
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              <select
                value={selectedSupplierId}
                onChange={e => setSelectedSupplierId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-1.5 pr-8 pl-3 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-amber-600 focus:outline-none"
              >
                {suppliers.map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (SU{(idx + 1).toString().padStart(4, '0')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Left: Zoom & Fullscreen Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setZoomLevel(z => Math.min(130, z + 5))}
                className="px-2 py-1 hover:bg-white rounded-md transition-colors"
              >
                +
              </button>
              <span className="px-2 font-mono text-slate-700">{zoomLevel}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel(z => Math.max(75, z - 5))}
                className="px-2 py-1 hover:bg-white rounded-md transition-colors"
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

        {/* Second Row: Supplier Name + Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-800 font-black text-sm">
              <Building2 className="w-4 h-4 text-slate-600" />
              <span>{activeSupplier?.name || 'غير محدد'}</span>
            </div>
            <span className="bg-slate-200 text-slate-700 font-bold px-2.5 py-0.5 rounded-md text-[11px]">
              المورد
            </span>

            <button
              type="button"
              onClick={() => {
                if (activeSupplier?.phone) {
                  window.location.href = `tel:${activeSupplier.phone}`;
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
                if (activeSupplier?.phone) {
                  window.open(`https://wa.me/2${activeSupplier.phone.replace(/\D/g, '')}`, '_blank');
                }
              }}
              className="bg-[#b45309] hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs shadow-xs transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>دردشة واتساب</span>
            </button>
          </div>

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
              onClick={() => setShowPaymentModal(true)}
              className="bg-[#e11d48] hover:bg-rose-700 text-white font-black px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ إضافة دفع</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. SECOND BAR (حساب / المشتريات / المدفوعات + التاريخ + الطباعة) */}
      <div className="bg-white rounded-2xl p-2.5 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
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
              <Building2 className="w-3.5 h-3.5" />
              <span>حساب</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('purchases')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                subTab === 'purchases'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>المشتريات</span>
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

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => applyDatePreset('this_month')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs border border-slate-200"
            >
              هذا الشهر
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset('this_year')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs border border-slate-200"
            >
              السنة الحالية
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset('all')}
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-black rounded-lg text-xs border border-amber-200"
            >
              الكل
            </button>
          </div>
        </div>

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
              if (activeSupplier?.phone) {
                const msg = encodeURIComponent(
                  `كشف حساب مورد معتمد من ${settings.storeName}\nالمورد: ${activeSupplier.name}\nالرصيد المستحق: ${totals.endingBalance.toLocaleString()} ج.م`
                );
                window.open(`https://wa.me/2${activeSupplier.phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
              }
            }}
            className="bg-[#1e293b] hover:bg-slate-800 text-white font-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs shadow-xs transition-all"
          >
            <Send className="w-3.5 h-3.5 text-amber-400" />
            <span>إرسال تذكير واتساب</span>
          </button>
        </div>
      </div>

      {/* 3. UNIFIED DARK HEADER BANNER + 5-COLUMN KPI SUMMARY STRIP */}
      <div className="rounded-2xl overflow-hidden shadow-md border border-slate-300 bg-white">
        <div className="bg-[#0f172a] text-white px-5 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
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

          <div className="text-center">
            <div className="border border-amber-500/80 bg-amber-500/10 text-amber-400 font-black px-5 py-1 rounded-lg text-xs sm:text-sm inline-block shadow-xs">
              كشف حساب مالي تفصيلي معتمد
            </div>
            <div className="text-[11px] text-slate-300 font-mono font-bold mt-1">
              الفترة: {dateFrom} — {dateTo}
            </div>
          </div>

          <div className="bg-[#1e293b] border border-slate-700 px-4 py-2.5 rounded-xl text-right min-w-[220px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-300 text-xs font-bold">
                المورد: <strong className="text-amber-400 font-black text-sm">{activeSupplier?.name || 'غير محدد'}</strong>
              </span>
              <span className="bg-slate-800 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded font-mono text-[11px] font-bold">
                {activeSupplier?.id?.slice(0, 6).toUpperCase() || 'SU0001'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-bold mt-1">
              التصنيف: {activeSupplier?.companyName || 'شركة توريد ومصنع معتمد'}
            </div>
          </div>
        </div>

        {/* Attached 5-Column Financial Summary Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-200 text-center bg-white">
          <div className="p-3 flex flex-col justify-center">
            <span className="text-slate-500 text-[11px] font-bold mb-1">
              الرصيد السابق (الافتتاحي)
            </span>
            <div className="font-mono font-black text-slate-800 text-sm sm:text-base">
              {Math.abs(totals.openingBal).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م{' '}
              <span className="text-[11px] font-bold text-slate-500">
                ({totals.openingBal >= 0 ? 'دائن' : 'مدين'})
              </span>
            </div>
          </div>

          <div className="p-3 flex flex-col justify-center">
            <span className="text-amber-600 text-[11px] font-bold mb-1">
              إجمالي المدين (المسدد والمرتجع)
            </span>
            <div className="font-mono font-black text-amber-600 text-sm sm:text-base">
              {totals.periodDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
            </div>
          </div>

          <div className="p-3 flex flex-col justify-center">
            <span className="text-amber-600 text-[11px] font-bold mb-1">
              إجمالي الدائن (المشتريات)
            </span>
            <div className="font-mono font-black text-amber-600 text-sm sm:text-base">
              {totals.periodCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
            </div>
          </div>

          <div className="p-3 flex flex-col justify-center bg-rose-50/40">
            <span className="text-rose-600 text-[11px] font-bold mb-1">
              مبلغ مستحق علينا للمورد (دائن)
            </span>
            <div className="font-mono font-black text-rose-600 text-sm sm:text-base">
              {totals.amountDueToSupplier.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
            </div>
          </div>

          <div className="p-3 flex flex-col justify-center bg-amber-50/50 col-span-2 lg:col-span-1">
            <span className="text-amber-700 text-[11px] font-bold mb-1">
              المبلغ المستحق لنا (مدين)
            </span>
            <div className="font-mono font-black text-amber-700 text-base sm:text-lg">
              {totals.amountPrepaidToUs.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
            </div>
          </div>
        </div>
      </div>

      {/* 4. THREE STATEMENT MODE TABS */}
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
              <option value="credit_only">حركات دائنة فقط (توريدات)</option>
              <option value="debit_only">حركات مدينة فقط (سداد ومرتجع)</option>
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
              <option value="invoices">فواتير المشتريات والتوريد</option>
              <option value="returns">مرتجعات المشتريات</option>
              <option value="receipts">سندات الصرف والدفعات</option>
            </select>
          </div>
        </div>

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

      {/* 6. MAIN LEDGER TABLE WITH EMBEDDED ITEMIZED SUB-TABLES */}
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
                const netDocTotal = item.invoiceNetTotal ?? (item.credit || item.debit);

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors align-middle">
                    {visibleColumns.index && (
                      <td className="py-3 px-2.5 text-center font-mono font-bold text-slate-600 border-l border-slate-200">
                        {item.rowNumber}
                      </td>
                    )}

                    {visibleColumns.date && (
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 border-l border-slate-200">
                        {item.date}
                      </td>
                    )}

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

                    {visibleColumns.details && (
                      <td className="py-2.5 px-4 font-bold text-slate-900 border-l border-slate-200">
                        {hasItemsTable ? (
                          <div className="space-y-1.5 my-0.5">
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-xs">
                              <span className="font-black text-slate-800">
                                {item.typeBadge === 'return'
                                  ? `فاتورة مرتجع مشتريات - رقم : ${item.docNumber}`
                                  : `فاتورة مشتريات - رقم : ${item.docNumber}`}
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

                    {visibleColumns.credit && (
                      <td className="py-3 px-3 text-center font-mono font-black text-amber-700 text-xs sm:text-sm border-l border-slate-200">
                        {item.credit > 0
                          ? item.credit.toLocaleString('en-US', { minimumFractionDigits: 2 })
                          : '-'}
                      </td>
                    )}

                    {visibleColumns.debit && (
                      <td className="py-3 px-3 text-center font-mono font-black text-rose-600 bg-rose-50/30 text-xs sm:text-sm border-l border-slate-200">
                        {item.debit > 0
                          ? item.debit.toLocaleString('en-US', { minimumFractionDigits: 2 })
                          : '-'}
                      </td>
                    )}

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
                          ج.م ({item.runningBalance >= 0 ? 'دائن / له' : 'مدين / لنا'})
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}

              {calculatedLedger.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold text-sm">
                    لا توجد حركات أو فواتير مسجلة في كشف حساب المورد بالفترة المحددة
                  </td>
                </tr>
              )}
            </tbody>

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
                    ج.م ({totals.endingBalance >= 0 ? 'دائن / له' : 'مدين / لنا'})
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

      {/* MODAL 1: Payment Voucher to Supplier */}
      {showPaymentModal && activeSupplier && (
        <VoucherModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          direction="out"
          defaultPartyType="supplier"
          defaultPartyId={activeSupplier.id}
          defaultAmount={totals.endingBalance > 0 ? totals.endingBalance : 0}
          defaultNotes={`سداد دفعة نقدية لحساب المورد: ${activeSupplier.name}`}
        />
      )}

      {/* MODAL 2: Settlement Discount from Supplier */}
      {showDiscountModal && activeSupplier && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  %
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">إضافة خصم تسوية تجاري</h3>
                  <p className="text-[10px] text-slate-500">خصم من مديونية المورد لحسابنا</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDiscountModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDiscountSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">المورد المستفيد</label>
                <div className="py-2 px-3 bg-slate-100 rounded-xl font-bold text-slate-900">
                  {activeSupplier.name}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  قيمة الخصم ({settings.currency}) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  placeholder="0.00"
                  value={discountAmount || ''}
                  onChange={e => setDiscountAmount(Number(e.target.value))}
                  className="w-full py-2.5 px-3 border border-slate-300 rounded-xl font-mono font-bold text-base focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">بيان وسبب الخصم</label>
                <input
                  type="text"
                  placeholder="مثال: خصم كمية، بونص شهري، تسوية حساب..."
                  value={discountNotes}
                  onChange={e => setDiscountNotes(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-purple-700 hover:bg-purple-600 text-white font-bold py-2.5 rounded-xl shadow transition-all"
                >
                  تأكيد الخصم
                </button>
                <button
                  type="button"
                  onClick={() => setShowDiscountModal(false)}
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
