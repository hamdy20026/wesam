import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Product,
  SalesInvoice,
  PurchaseInvoice,
  SalesReturnInvoice,
  PurchaseReturnInvoice,
  AssemblyOperation,
  WasteRecord
} from '../types';
import {
  X,
  Printer,
  FileSpreadsheet,
  FileText,
  Layers,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Eye,
  ExternalLink,
  Receipt,
  Building2,
  Phone,
  User,
  Clock,
  CheckCircle2,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

interface StockHistoryModalProps {
  product: Product;
  onClose: () => void;
}

// Union type for movement document preview
type MovementDocPreview =
  | { type: 'sales'; invoice: SalesInvoice }
  | { type: 'purchase'; invoice: PurchaseInvoice }
  | { type: 'sales_return'; invoice: SalesReturnInvoice }
  | { type: 'purchase_return'; invoice: PurchaseReturnInvoice }
  | { type: 'assembly'; operation: AssemblyOperation }
  | { type: 'waste'; record: WasteRecord }
  | { type: 'opening'; initialStock: number; unit: string; date: string }
  | { type: 'prior'; priorBalance: number; unit: string; date: string };

export const StockHistoryModal: React.FC<StockHistoryModalProps> = ({
  product: initialProduct,
  onClose,
}) => {
  const {
    products,
    salesInvoices,
    purchaseInvoices,
    salesReturns,
    purchaseReturns,
    assemblyOperations,
    wasteRecords,
    settings,
  } = useApp();

  const [activeProduct, setActiveProduct] = useState<Product>(initialProduct);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(true); // يفتح ملء الشاشة كاملة افتراضياً حسب طلب المستخدم

  // Date Range Filtering (حركة الصنف خلال فترة)
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Sort Order: 'asc' (من الأقدم إلى الأحدث حسب طلب المستخدم) أو 'desc'
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Document Modal Preview State (عرض صورة الحركة / الفاتورة عند الضغط على البيان)
  const [docPreview, setDocPreview] = useState<MovementDocPreview | null>(null);

  const product = activeProduct;
  const unit = product.unit || 'قطعة';

  // Support ESC key to close modal (closes doc preview if open, otherwise closes main modal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (docPreview) {
          setDocPreview(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [docPreview, onClose]);

  // Handle Preset Date Range Selection
  const handleApplyPreset = (preset: 'all' | 'today' | 'week' | 'month' | 'year') => {
    setDatePreset(preset);
    setCurrentPage(1);

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }

    if (preset === 'today') {
      const todayStr = toYMD(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
      return;
    }

    if (preset === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      setStartDate(toYMD(start));
      setEndDate(toYMD(now));
      return;
    }

    if (preset === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(toYMD(start));
      setEndDate(toYMD(end));
      return;
    }

    if (preset === 'year') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      setStartDate(toYMD(start));
      setEndDate(toYMD(end));
      return;
    }
  };

  // 1. Gather all chronological movements for this product with linked documents
  const rawMovements = useMemo(() => {
    interface RawMovement {
      id: string;
      date: string;
      timestamp: number;
      type: string;
      category: 'in' | 'out';
      qty: number; // positive for in, negative for out
      refNumber: string;
      partyName: string;
      notes?: string;
      docPreviewData: MovementDocPreview;
    }

    const list: RawMovement[] = [];

    // A. Sales Invoices (صادر - مبيعات)
    salesInvoices.forEach(inv => {
      if (inv.status === 'cancelled') return;
      inv.items?.forEach((item, idx) => {
        if (item.productId === product.id || item.productName === product.name) {
          list.push({
            id: `sale-${inv.id}-${idx}`,
            date: inv.date,
            timestamp: new Date(inv.date).getTime(),
            type: 'المبيعات',
            category: 'out',
            qty: -Math.abs(item.quantity),
            refNumber: inv.invoiceNumber,
            partyName: inv.customerName || 'عميل نقدي عام',
            notes: inv.notes,
            docPreviewData: { type: 'sales', invoice: inv },
          });
        }
      });
    });

    // B. Purchase Invoices (وارد - شراء)
    purchaseInvoices.forEach(inv => {
      if (inv.status === 'cancelled') return;
      inv.items?.forEach((item, idx) => {
        if (item.productId === product.id || item.productName === product.name) {
          list.push({
            id: `pur-${inv.id}-${idx}`,
            date: inv.date,
            timestamp: new Date(inv.date).getTime(),
            type: 'شراء',
            category: 'in',
            qty: Math.abs(item.quantity),
            refNumber: inv.invoiceNumber,
            partyName: inv.supplierName || 'مورد معتمد',
            notes: inv.notes,
            docPreviewData: { type: 'purchase', invoice: inv },
          });
        }
      });
    });

    // C. Sales Returns (وارد - مرتجع مبيعات)
    salesReturns.forEach(ret => {
      ret.items?.forEach((item, idx) => {
        if (item.productId === product.id || item.productName === product.name) {
          list.push({
            id: `sret-${ret.id}-${idx}`,
            date: ret.date,
            timestamp: new Date(ret.date).getTime(),
            type: 'مرتجع مبيعات',
            category: 'in',
            qty: Math.abs(item.quantity),
            refNumber: ret.returnNumber,
            partyName: ret.customerName || 'عميل',
            notes: ret.notes,
            docPreviewData: { type: 'sales_return', invoice: ret },
          });
        }
      });
    });

    // D. Purchase Returns (صادر - مرتجع مشتريات)
    purchaseReturns.forEach(ret => {
      ret.items?.forEach((item, idx) => {
        if (item.productId === product.id || item.productName === product.name) {
          list.push({
            id: `pret-${ret.id}-${idx}`,
            date: ret.date,
            timestamp: new Date(ret.date).getTime(),
            type: 'مرتجع مشتريات',
            category: 'out',
            qty: -Math.abs(item.quantity),
            refNumber: ret.returnNumber,
            partyName: ret.supplierName || 'مورد',
            notes: ret.notes,
            docPreviewData: { type: 'purchase_return', invoice: ret },
          });
        }
      });
    });

    // E. Waste / Inventory Adjustments (صادر - جرد وتالف)
    wasteRecords.forEach(w => {
      if (w.productId === product.id || w.productName === product.name) {
        list.push({
          id: `waste-${w.id}`,
          date: w.date,
          timestamp: new Date(w.date).getTime(),
          type: 'جرد',
          category: 'out',
          qty: -Math.abs(w.quantity),
          refNumber: `WST-${w.id.slice(0, 6)}`,
          partyName: w.reason || 'إتلاف وتسوية مخزنية',
          notes: w.notes,
          docPreviewData: { type: 'waste', record: w },
        });
      }
    });

    // F. Assembly Operations (وارد من تصنيع / مستخدم في تصنيع)
    assemblyOperations.forEach(op => {
      // Produced target product (وارد)
      if (op.targetProductId === product.id || op.targetProductName === product.name) {
        list.push({
          id: `asm-target-${op.id}`,
          date: op.date,
          timestamp: new Date(op.date).getTime(),
          type: 'وارد من التصنيع',
          category: 'in',
          qty: Math.abs(op.quantity),
          refNumber: op.operationNumber || `ASM-${op.id.slice(0, 6)}`,
          partyName: op.operatorName || op.performedBy || 'إذن تصنيع وتجميع',
          notes: op.notes,
          docPreviewData: { type: 'assembly', operation: op },
        });
      }

      // Consumed component (مستخدم في تصنيع - صادر)
      op.componentsAffected?.forEach((comp, idx) => {
        if (comp.productId === product.id || comp.productName === product.name) {
          list.push({
            id: `asm-comp-${op.id}-${idx}`,
            date: op.date,
            timestamp: new Date(op.date).getTime(),
            type: 'مستخدم في التصنيع',
            category: 'out',
            qty: -Math.abs(comp.quantity),
            refNumber: op.operationNumber || `ASM-${op.id.slice(0, 6)}`,
            partyName: `تشغيل في إنتاج: ${op.targetProductName}`,
            notes: op.notes,
            docPreviewData: { type: 'assembly', operation: op },
          });
        }
      });
    });

    return list;
  }, [product, salesInvoices, purchaseInvoices, salesReturns, purchaseReturns, wasteRecords, assemblyOperations]);

  // 2. Compute Summary Statistics for the 3 top tables (taking period into account if active)
  const summary = useMemo(() => {
    let allPurchasesTotal = 0;
    let allSalesReturnsTotal = 0;
    let allAssemblyInTotal = 0;
    let allTransfersInTotal = 0;

    let allSalesTotal = 0;
    let allWasteTotal = 0;
    let allPurchaseReturnsTotal = 0;
    let allAssemblyOutTotal = 0;
    let allTransfersOutTotal = 0;

    // Period specific
    let periodPurchases = 0;
    let periodSalesReturns = 0;
    let periodAssemblyIn = 0;
    let periodTransfersIn = 0;

    let periodSales = 0;
    let periodWaste = 0;
    let periodPurchaseReturns = 0;
    let periodAssemblyOut = 0;
    let periodTransfersOut = 0;

    const startMs = startDate ? new Date(startDate + 'T00:00:00').getTime() : null;
    const endMs = endDate ? new Date(endDate + 'T23:59:59').getTime() : null;

    rawMovements.forEach(m => {
      const isInPeriod = (!startMs || m.timestamp >= startMs) && (!endMs || m.timestamp <= endMs);

      if (m.type === 'شراء') {
        allPurchasesTotal += m.qty;
        if (isInPeriod) periodPurchases += m.qty;
      } else if (m.type === 'مرتجع مبيعات') {
        allSalesReturnsTotal += m.qty;
        if (isInPeriod) periodSalesReturns += m.qty;
      } else if (m.type === 'وارد من التصنيع') {
        allAssemblyInTotal += m.qty;
        if (isInPeriod) periodAssemblyIn += m.qty;
      } else if (m.type === 'المبيعات') {
        allSalesTotal += Math.abs(m.qty);
        if (isInPeriod) periodSales += Math.abs(m.qty);
      } else if (m.type === 'جرد') {
        allWasteTotal += Math.abs(m.qty);
        if (isInPeriod) periodWaste += Math.abs(m.qty);
      } else if (m.type === 'مرتجع مشتريات') {
        allPurchaseReturnsTotal += Math.abs(m.qty);
        if (isInPeriod) periodPurchaseReturns += Math.abs(m.qty);
      } else if (m.type === 'مستخدم في التصنيع') {
        allAssemblyOutTotal += Math.abs(m.qty);
        if (isInPeriod) periodAssemblyOut += Math.abs(m.qty);
      }
    });

    const netOperations = (allPurchasesTotal + allSalesReturnsTotal + allAssemblyInTotal + allTransfersInTotal) -
      (allSalesTotal + allWasteTotal + allPurchaseReturnsTotal + allAssemblyOutTotal + allTransfersOutTotal);

    const currentStock = Number(product.quantity) || 0;
    const initialStock = Math.max(0, currentStock - netOperations);

    // If period filter is active:
    const isFiltered = Boolean(startDate || endDate);

    const purchasesTotal = isFiltered ? periodPurchases : allPurchasesTotal;
    const salesReturnsTotal = isFiltered ? periodSalesReturns : allSalesReturnsTotal;
    const assemblyInTotal = isFiltered ? periodAssemblyIn : allAssemblyInTotal;
    const transfersInTotal = isFiltered ? periodTransfersIn : allTransfersInTotal;

    const salesTotal = isFiltered ? periodSales : allSalesTotal;
    const wasteTotal = isFiltered ? periodWaste : allWasteTotal;
    const purchaseReturnsTotal = isFiltered ? periodPurchaseReturns : allPurchaseReturnsTotal;
    const assemblyOutTotal = isFiltered ? periodAssemblyOut : allAssemblyOutTotal;
    const transfersOutTotal = isFiltered ? periodTransfersOut : allTransfersOutTotal;

    // Initial stock for period:
    // If startDate is set, compute balance right before startDate
    let openingStockForView = initialStock;
    if (startDate) {
      let balanceBeforeStart = initialStock;
      rawMovements.forEach(m => {
        if (startMs && m.timestamp < startMs) {
          balanceBeforeStart += m.qty;
        }
      });
      openingStockForView = balanceBeforeStart;
    }

    const totalIn = (isFiltered ? 0 : initialStock) + purchasesTotal + salesReturnsTotal + transfersInTotal + assemblyInTotal;
    const totalOut = salesTotal + wasteTotal + purchaseReturnsTotal + transfersOutTotal + assemblyOutTotal;

    return {
      initialStock,
      openingStockForView,
      isFiltered,
      purchasesTotal,
      salesReturnsTotal,
      transfersInTotal,
      assemblyInTotal,
      totalIn,

      salesTotal,
      wasteTotal,
      purchaseReturnsTotal,
      transfersOutTotal,
      assemblyOutTotal,
      totalOut,

      currentStock,
    };
  }, [rawMovements, product, startDate, endDate]);

  // 3. Complete chronological timeline with Running Balance ("الرصيد بعد")
  // Calculated from oldest to newest, then sorted according to sortOrder (default: 'asc' = من الأقدم إلى الأحدث)
  const fullTimeline = useMemo(() => {
    interface TimelineEntry {
      id: string;
      date: string;
      rawDate: Date;
      type: string;
      qty: number; // Signed number (e.g. -3.00 or +3.00)
      balanceAfter: number;
      refNumber: string;
      statement: string; // يحتوي على رقم الحركة واسم العميل او المورد
      isOpeningRow?: boolean;
      docPreviewData?: MovementDocPreview;
    }

    const allEntries: Omit<TimelineEntry, 'balanceAfter'>[] = [];

    // Add opening stock if > 0
    if (summary.initialStock > 0) {
      const openDate = product.createdAt ? product.createdAt : '2026-01-01T00:00:00Z';
      allEntries.push({
        id: `opening-${product.id}`,
        date: openDate,
        rawDate: new Date(openDate),
        type: 'المخزون الافتتاحي',
        qty: summary.initialStock,
        refNumber: 'افتتاحي',
        statement: `رصيد أول المدة - بداية التشغيل للمخزن`,
        isOpeningRow: true,
        docPreviewData: {
          type: 'opening',
          initialStock: summary.initialStock,
          unit,
          date: openDate,
        },
      });
    }

    // Add all raw movements
    rawMovements.forEach(m => {
      const statementText = m.refNumber
        ? `${m.refNumber} - ${m.partyName}`
        : m.partyName;

      allEntries.push({
        id: m.id,
        date: m.date,
        rawDate: new Date(m.date),
        type: m.type,
        qty: m.qty,
        refNumber: m.refNumber,
        statement: statementText,
        docPreviewData: m.docPreviewData,
      });
    });

    // 1. Sort ascending (oldest first) to compute 100% accurate running balances
    allEntries.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

    let running = 0;
    const computedAll: TimelineEntry[] = allEntries.map(e => {
      running += e.qty;
      return {
        ...e,
        balanceAfter: running,
      };
    });

    // 2. Filter by date if active
    const startMs = startDate ? new Date(startDate + 'T00:00:00').getTime() : null;
    const endMs = endDate ? new Date(endDate + 'T23:59:59').getTime() : null;

    let filtered: TimelineEntry[] = [];

    if (!startMs && !endMs) {
      filtered = computedAll;
    } else {
      // Find balance right before startDate
      let priorBalance = 0;
      if (startMs) {
        const priorEntries = computedAll.filter(e => e.rawDate.getTime() < startMs);
        if (priorEntries.length > 0) {
          priorBalance = priorEntries[priorEntries.length - 1].balanceAfter;
        }
      }

      // If startDate is set, add a synthetic "رصيد ما قبل الفترة" row at the beginning
      if (startMs) {
        filtered.push({
          id: `prior-balance-${product.id}`,
          date: `${startDate}T00:00:00`,
          rawDate: new Date(`${startDate}T00:00:00`),
          type: 'رصيد ما قبل الفترة',
          qty: priorBalance,
          balanceAfter: priorBalance,
          refNumber: 'افتتاحي فترة',
          statement: `رصيد المخزون التراكمي حتى بداية الفترة (${startDate})`,
          isOpeningRow: true,
          docPreviewData: {
            type: 'prior',
            priorBalance,
            unit,
            date: startDate,
          },
        });
      }

      // Add entries within period
      computedAll.forEach(e => {
        const t = e.rawDate.getTime();
        if ((!startMs || t >= startMs) && (!endMs || t <= endMs)) {
          filtered.push(e);
        }
      });
    }

    // 3. Apply final user sort order (Default: 'asc' = من الأقدم إلى الأحدث)
    if (sortOrder === 'asc') {
      return filtered.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
    } else {
      return filtered.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
    }
  }, [rawMovements, summary.initialStock, product, startDate, endDate, sortOrder, unit]);

  // Pagination
  const totalPages = Math.ceil(fullTimeline.length / rowsPerPage) || 1;
  const displayedEntries = useMemo(() => {
    if (rowsPerPage === 1000) return fullTimeline;
    const start = (currentPage - 1) * rowsPerPage;
    return fullTimeline.slice(start, start + rowsPerPage);
  }, [fullTimeline, currentPage, rowsPerPage]);

  // Format Date exactly like Screenshot 519 (e.g. 21:32 01-10-2026)
  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${hh}:${mm} ${dd}-${mo}-${yyyy}`;
    } catch {
      return dateStr;
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    const headers = ['النوع', 'كمية', 'الرصيد بعد', 'تاريخ', 'البيان'];
    const rows = fullTimeline.map(e => [
      e.type,
      e.qty > 0 ? `+${e.qty.toFixed(2)}` : e.qty.toFixed(2),
      e.balanceAfter.toFixed(2),
      formatDateTime(e.date),
      `"${e.statement.replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `حركة_صنف_${product.name.replace(/\s+/g, '_')}_${startDate || 'بداية'}_إلى_${endDate || 'نهاية'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto print:p-0 print:bg-white ${
        isFullscreen
          ? 'bg-slate-100 flex flex-col w-full h-full min-h-screen p-2 sm:p-4 md:p-6'
          : 'bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4'
      }`}
    >
      <div
        className={`bg-white shadow-2xl border border-slate-200 overflow-y-auto animate-in fade-in zoom-in-95 font-sans text-right select-none print:max-h-none print:border-none print:shadow-none ${
          isFullscreen
            ? 'w-full min-h-full rounded-2xl p-4 sm:p-6 md:p-8 flex flex-col'
            : 'rounded-2xl max-w-6xl w-full p-4 sm:p-6 max-h-[95vh]'
        }`}
        dir="rtl"
      >
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between pb-3 border-b border-slate-200 gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <Layers className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <span className="font-black text-slate-900 text-lg sm:text-xl block">
                تقرير حركة الصنف التفصيلي (Stock Movement History)
              </span>
              <span className="text-xs sm:text-sm text-slate-500 font-bold block">
                متابعة حركة الوارد والمنصرف ومعاينة صور الفواتير والأذون
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Product Switcher Dropdown */}
            {products && products.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-sm">
                <span className="text-slate-500 font-bold">الصنف:</span>
                <select
                  value={activeProduct.id}
                  onChange={(e) => {
                    const found = products.find(p => p.id === e.target.value);
                    if (found) {
                      setActiveProduct(found);
                      setCurrentPage(1);
                    }
                  }}
                  className="bg-transparent font-black text-slate-900 focus:outline-none cursor-pointer max-w-[240px] text-sm"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.quantity} {p.unit || 'قطعة'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Fullscreen Toggle Button */}
            <button
              onClick={() => setIsFullscreen(prev => !prev)}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة كاملة'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              title="إغلاق التقرير والعودة (Esc)"
            >
              <span>إغلاق والعودة ✕</span>
            </button>
          </div>
        </div>

        {/* Product Centered Title - Enlarged Typography */}
        <div className="text-center py-4 bg-gradient-to-b from-slate-50/70 to-white rounded-2xl my-2 border border-slate-100 shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
            {product.name} - ({product.barcode || product.id})
          </h2>
          <div className="flex items-center justify-center gap-3 text-sm font-bold mt-2 flex-wrap">
            {product.brand && (
              <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-xl border border-slate-200">
                الماركة: <strong>{product.brand}</strong>
              </span>
            )}
            <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-xl border border-slate-200">
              الوحدة: <strong>{unit}</strong>
            </span>
            <span className="bg-amber-50 text-slate-800 px-3.5 py-1 rounded-xl border border-amber-200 font-mono text-base font-black">
              المخزون الحالي: <strong>{product.quantity} {unit}</strong>
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Date Range Filter (حركة الصنف خلال فترة) - Enlarged text and inputs */}
        {/* ========================================================================= */}
        <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-3.5 my-2 print:hidden">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Right: Quick preset buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-slate-800 flex items-center gap-1.5 ml-1">
                <Calendar className="w-5 h-5 text-amber-600" />
                <span>حركة الصنف خلال فترة:</span>
              </span>

              <button
                type="button"
                onClick={() => handleApplyPreset('all')}
                className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                  datePreset === 'all' && !startDate && !endDate
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                كامل المدة (الكل)
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('today')}
                className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                  datePreset === 'today'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                اليوم
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('week')}
                className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                  datePreset === 'week'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                آخر 7 أيام
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('month')}
                className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                  datePreset === 'month'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                هذا الشهر
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('year')}
                className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                  datePreset === 'year'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                هذه السنة
              </button>
            </div>

            {/* Left: Custom date pickers */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-sm">
                <span className="text-slate-500 font-bold">من:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('custom');
                    setCurrentPage(1);
                  }}
                  className="bg-transparent font-mono text-slate-800 text-sm font-bold focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-sm">
                <span className="text-slate-500 font-bold">إلى:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('custom');
                    setCurrentPage(1);
                  }}
                  className="bg-transparent font-mono text-slate-800 text-sm font-bold focus:outline-none"
                />
              </div>

              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => handleApplyPreset('all')}
                  className="px-3 py-1.5 text-sm bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold flex items-center gap-1 transition-colors"
                  title="إلغاء تصفية التاريخ"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>إلغاء التصفية</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3 Summary Grid Boxes - Enlarged Font Sizes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-3">
          {/* BOX 1: واردات المخزن (+) */}
          <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
            {/* Header */}
            <div className="bg-[#333333] text-white py-2.5 px-4 flex items-center justify-between text-sm sm:text-base font-black">
              <span>واردات المخزن {summary.isFiltered ? '(خلال الفترة)' : ''}</span>
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-black">
                +
              </div>
            </div>

            {/* Rows Table */}
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-200">
                <tr className="hover:bg-slate-50">
                  <td className="py-2 px-4 font-bold text-slate-700">
                    {summary.isFiltered ? 'رصيد ما قبل الفترة' : 'المخزون الافتتاحي'}
                  </td>
                  <td className="py-2 px-4 text-left font-mono font-bold text-slate-900 text-base">
                    {summary.openingStockForView.toFixed(2)} {unit}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-2 px-4 font-bold text-slate-700">إجمالي المشتريات</td>
                  <td className="py-2 px-4 text-left font-mono font-bold text-slate-900 text-base">
                    {summary.purchasesTotal.toFixed(2)} {unit}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-2 px-4 font-bold text-slate-700">إجمالي مرتجع المبيعات</td>
                  <td className="py-2 px-4 text-left font-mono font-bold text-slate-900 text-base">
                    {summary.salesReturnsTotal.toFixed(2)} {unit}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-2 px-4 font-bold text-slate-700">تحويلات المخزون (داخل)</td>
                  <td className="py-2 px-4 text-left font-mono font-bold text-slate-900 text-base">
                    {summary.transfersInTotal.toFixed(2)} {unit}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-2 px-4 font-bold text-slate-700">وارد من التصنيع</td>
                  <td className="py-2 px-4 text-left font-mono font-bold text-slate-900 text-base">
                    {summary.assemblyInTotal.toFixed(2)} {unit}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Dark Footer Total */}
            <div className="bg-[#333333] text-white py-2 px-4 flex items-center justify-between text-sm sm:text-base font-black">
              <span>الإجمالي</span>
              <span className="font-mono text-base sm:text-lg">{summary.totalIn.toFixed(2)} {unit}</span>
            </div>
          </div>

          {/* BOX 2: صادر المخزن (-) */}
          <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
            {/* Header */}
            <div className="bg-[#333333] text-white py-2.5 px-4 flex items-center justify-between text-sm sm:text-base font-black">
              <span>صادر المخزن {summary.isFiltered ? '(خلال الفترة)' : ''}</span>
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-black">
                −
              </div>
            </div>

            {/* Rows Table */}
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-200">
                <tr className="hover:bg-slate-50">
                  <td className="py-2 px-4 font-bold text-slate-700">إجمالي المباع</td>
                  <td className="py-2 px-4 text-left font-mono font-bold text-slate-900 text-base">
                    {summary.salesTotal.toFixed(2)} {unit}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-2 px-4 font-bold text-slate-700">إجمالي المخزون التالف</td>
                  <td className="py-2 px-4 text-left font-mono font-bold text-slate-900 text-base">
                    {summary.wasteTotal.toFixed(2)} {unit}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-2 px-4 font-bold text-slate-700">إجمالي مرتجع المشتريات</td>
                  <td className="py-2 px-4 text-left font-mono font-bold text-slate-900 text-base">
                    {summary.purchaseReturnsTotal.toFixed(2)} {unit}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-2 px-4 font-bold text-slate-700">تحويلات المخزون (خارج)</td>
                  <td className="py-2 px-4 text-left font-mono font-bold text-slate-900 text-base">
                    {summary.transfersOutTotal.toFixed(2)} {unit}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-2 px-4 font-bold text-slate-700">مستخدم في التصنيع (خارج)</td>
                  <td className="py-2 px-4 text-left font-mono font-bold text-slate-900 text-base">
                    {summary.assemblyOutTotal.toFixed(2)} {unit}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Dark Footer Total */}
            <div className="bg-[#333333] text-white py-2 px-4 flex items-center justify-between text-sm sm:text-base font-black">
              <span>الإجمالي</span>
              <span className="font-mono text-base sm:text-lg">{summary.totalOut.toFixed(2)} {unit}</span>
            </div>
          </div>

          {/* BOX 3: الإجماليات */}
          <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm flex flex-col justify-start">
            {/* Header */}
            <div className="bg-[#333333] text-white py-2.5 px-4 text-center text-sm sm:text-base font-black">
              <span>الإجماليات</span>
            </div>

            {/* Content Table */}
            <div className="p-4 flex items-center justify-between border-b border-slate-200">
              <span className="font-bold text-slate-800 text-sm sm:text-base">المخزون الحالي</span>
              <span className="font-mono font-black text-slate-900 text-xl sm:text-2xl">
                {summary.currentStock.toFixed(2)} {unit}
              </span>
            </div>

            <div className="p-4 text-xs sm:text-sm text-slate-600 font-bold space-y-2 bg-slate-50/70 mt-auto">
              <div className="flex justify-between">
                <span>سعر الشراء:</span>
                <span className="font-mono font-bold text-slate-900">{product.purchasePrice} {settings.currency}</span>
              </div>
              <div className="flex justify-between">
                <span>سعر البيع:</span>
                <span className="font-mono font-bold text-amber-800">{product.sellingPrice} {settings.currency}</span>
              </div>
              <div className="flex justify-between">
                <span>حد التنبيه الأدنى:</span>
                <span className="font-mono font-bold text-amber-700">{product.minAlertQuantity} {unit}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Separator Line */}
        <hr className="my-3 border-slate-200" />

        {/* Action Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3 print:hidden">
          {/* Right: Rows per page dropdown & sorting indicator */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-slate-700 font-bold">
              <span>عرض</span>
              <select
                value={rowsPerPage}
                onChange={e => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="py-1.5 px-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={1000}>الكل</option>
              </select>
              <span>إدخالات</span>
            </div>

            {/* Sort toggle (من الأقدم إلى الأحدث) */}
            <button
              type="button"
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs sm:text-sm font-black transition-colors"
              title="انقر لتبديل اتجاه الترتيب"
            >
              {sortOrder === 'asc' ? (
                <>
                  <ArrowUp className="w-4 h-4 text-amber-700" />
                  <span>الترتيب: من الأقدم إلى الأحدث (تصاعدي)</span>
                </>
              ) : (
                <>
                  <ArrowDown className="w-4 h-4 text-amber-700" />
                  <span>الترتيب: من الأحدث إلى الأقدم (تنازلي)</span>
                </>
              )}
            </button>
          </div>

          {/* Left: Export & Action Buttons */}
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <button
              onClick={handleExportCsv}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <FileText className="w-4 h-4 text-slate-600" />
              <span>تصدير إلى CSV</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-700" />
              <span>تصدير إلى Excel</span>
            </button>

            <button
              onClick={() => window.print()}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4 text-slate-700" />
              <span>طباعة</span>
            </button>

            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>إغلاق</span>
            </button>
          </div>
        </div>

        {/* Main Movements Table - Enlarged Font Sizes & Clickable Statement */}
        <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="bg-[#333333] text-white font-black text-sm select-none">
                  <th className="py-3 px-4 text-right w-44">نوع</th>
                  <th className="py-3 px-3 text-center w-32">كمية</th>
                  <th className="py-3 px-3 text-center w-32">الرصيد بعد</th>
                  <th
                    className="py-3 px-4 text-center w-48 cursor-pointer hover:bg-slate-800 transition-colors"
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    title="انقر لتبديل الترتيب"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>تاريخ</span>
                      {sortOrder === 'asc' ? (
                        <ArrowUp className="w-4 h-4 text-amber-400" />
                      ) : (
                        <ArrowDown className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">
                    <span>البيان (انقر لعرض صورة الفاتورة أو المستند)</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {displayedEntries.map(entry => {
                  const isPositive = entry.qty > 0;
                  const qtyFormatted = isPositive
                    ? `+${Math.abs(entry.qty).toFixed(2)}`
                    : `-${Math.abs(entry.qty).toFixed(2)}`;

                  return (
                    <tr
                      key={entry.id}
                      className={`hover:bg-amber-50/60 transition-colors font-sans text-sm ${
                        entry.isOpeningRow ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      {/* 1. نوع */}
                      <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          {entry.isOpeningRow && (
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                          )}
                          <span className="text-sm font-black">{entry.type}</span>
                        </span>
                      </td>

                      {/* 2. كمية */}
                      <td
                        className={`py-3 px-3 text-center font-mono font-black text-sm sm:text-base dir-ltr ${
                          isPositive ? 'text-[#2b6cb0]' : 'text-[#c53030]'
                        }`}
                      >
                        {qtyFormatted}
                      </td>

                      {/* 3. الرصيد بعد */}
                      <td className="py-3 px-3 text-center font-mono font-black text-slate-900 text-sm sm:text-base">
                        {entry.balanceAfter.toFixed(2)}
                      </td>

                      {/* 4. تاريخ */}
                      <td className="py-3 px-4 text-center font-mono text-slate-600 text-xs sm:text-sm font-bold whitespace-nowrap">
                        {formatDateTime(entry.date)}
                      </td>

                      {/* 5. البيان (CLICKABLE: opens document / invoice preview) */}
                      <td className="py-3 px-4 text-right">
                        {entry.docPreviewData ? (
                          <button
                            type="button"
                            onClick={() => setDocPreview(entry.docPreviewData!)}
                            className="text-right font-bold text-[#1d72b8] hover:text-slate-800 hover:underline flex items-center gap-2 group transition-colors"
                            title="انقر لفتح واستعراض صورة المستند / الفاتورة"
                          >
                            <span className="text-sm sm:text-base">{entry.statement}</span>
                            <span className="inline-flex items-center gap-1 text-[11px] bg-amber-50 group-hover:bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md font-bold transition-all shadow-xs">
                              <Eye className="w-3.5 h-3.5" />
                              <span>عرض المستند</span>
                            </span>
                          </button>
                        ) : (
                          <span className="text-sm font-bold text-slate-800">{entry.statement}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {displayedEntries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-bold text-base">
                      {startDate || endDate
                        ? `لا توجد حركات مسجلة لهذا الصنف خلال الفترة المحددة (${startDate || '...'} إلى ${endDate || '...'})`
                        : 'لا توجد حركات مسجلة لهذا الصنف حتى الآن'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        {fullTimeline.length > rowsPerPage && rowsPerPage !== 1000 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-3 pt-2 text-sm text-slate-600 font-medium print:hidden">
            <div>
              عرض {((currentPage - 1) * rowsPerPage) + 1} إلى{' '}
              {Math.min(currentPage * rowsPerPage, fullTimeline.length)} من أصل {fullTimeline.length} حركة
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
              >
                السابق
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((pageNum, idx, arr) => {
                  const showEllipsis = idx > 0 && pageNum - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={pageNum}>
                      {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                      <button
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 rounded-lg font-bold font-mono text-sm ${
                          currentPage === pageNum
                            ? 'bg-[#333333] text-white shadow-sm'
                            : 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* NEW FEATURE: Movement Document / Invoice Preview Modal (صورة الحركة) */}
      {/* ========================================================================= */}
      {docPreview && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
          <div
            className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto font-sans text-right select-none"
            dir="rtl"
          >
            {/* Top Toolbar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4 print:hidden">
              <div className="flex items-center gap-2">
                <Receipt className="w-6 h-6 text-amber-600" />
                <span className="font-black text-slate-900 text-lg">
                  معاينة صورة مستند الحركة (Movement Voucher Preview)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4 text-slate-700" />
                  <span>طباعة المستند</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDocPreview(null)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                  title="إغلاق (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Content Rendered based on movement type */}
            {docPreview.type === 'sales' && (() => {
              const inv = docPreview.invoice;
              return (
                <div className="space-y-4">
                  {/* Invoice Header */}
                  <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black">{settings.storeName}</h3>
                      <p className="text-xs text-slate-300 mt-1">{settings.address} | هاتف: {settings.phone}</p>
                      {settings.commercialRecord && (
                        <p className="text-[11px] text-amber-300">س.ت / ب.ض: {settings.commercialRecord}</p>
                      )}
                    </div>
                    <div className="text-left bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                      <span className="text-xs text-amber-300 font-bold block">فاتورة مبيعات</span>
                      <span className="text-lg font-mono font-black">{inv.invoiceNumber}</span>
                    </div>
                  </div>

                  {/* Invoice Meta Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                    <div>
                      <span className="text-slate-500 font-bold block text-xs">العميل:</span>
                      <span className="font-black text-slate-900">{inv.customerName || 'عميل نقدي عام'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block text-xs">التاريخ والوقت:</span>
                      <span className="font-mono font-bold text-slate-800">{formatDateTime(inv.date)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block text-xs">طريقة الدفع:</span>
                      <span className="font-bold text-amber-800">
                        {inv.paymentMethod === 'cash' ? 'نقدي' :
                         inv.paymentMethod === 'vodafone' ? 'فودافون كاش' :
                         inv.paymentMethod === 'instapay' ? 'انيستا باي' :
                         inv.paymentMethod === 'credit' ? 'آجل' : inv.paymentMethod}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block text-xs">الحالة:</span>
                      <span className="font-bold text-amber-700">مكتملة ومرحلة للمخزن</span>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 font-black text-slate-800">
                        <tr>
                          <th className="py-2.5 px-3 text-right">م</th>
                          <th className="py-2.5 px-3 text-right">الصنف</th>
                          <th className="py-2.5 px-3 text-center">الكمية</th>
                          <th className="py-2.5 px-3 text-center">السعر</th>
                          <th className="py-2.5 px-3 text-center">الخصم</th>
                          <th className="py-2.5 px-3 text-left">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inv.items?.map((it, idx) => (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-50 ${it.productId === product.id ? 'bg-amber-50/50 font-black text-amber-950' : ''}`}
                          >
                            <td className="py-2 px-3">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <span>{it.productName}</span>
                              {it.productId === product.id && (
                                <span className="mr-2 text-xs bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                                  الصنف المحدد
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-bold">{it.quantity} {it.unit}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold">{it.unitPrice}</td>
                            <td className="py-2 px-3 text-center font-mono">{it.discount || 0}</td>
                            <td className="py-2 px-3 text-left font-mono font-black">{it.total.toFixed(2)} {settings.currency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Invoice Totals */}
                  <div className="bg-slate-100 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div>
                      <span className="text-slate-600 font-bold">إجمالي الفاتورة: </span>
                      <span className="font-mono font-black text-slate-900 text-lg">{inv.total.toFixed(2)} {settings.currency}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 font-bold">المدفوع: </span>
                      <span className="font-mono font-bold text-amber-800">{inv.paidAmount?.toFixed(2) || inv.total.toFixed(2)} {settings.currency}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 font-bold">المتبقي (مديونية): </span>
                      <span className="font-mono font-bold text-rose-700">{inv.remainingAmount?.toFixed(2) || '0.00'} {settings.currency}</span>
                    </div>
                  </div>

                  {inv.notes && (
                    <div className="text-xs text-slate-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                      <strong>ملاحظات: </strong> {inv.notes}
                    </div>
                  )}
                </div>
              );
            })()}

            {docPreview.type === 'purchase' && (() => {
              const inv = docPreview.invoice;
              return (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="bg-slate-800 text-white rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black">فاتورة مشتريات وتوريد بضاعة</h3>
                      <p className="text-xs text-slate-300 mt-1">المورد: {inv.supplierName} | نظام {settings.storeName}</p>
                    </div>
                    <div className="text-left bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                      <span className="text-xs text-amber-300 font-bold block">رقم فاتورة المشتريات</span>
                      <span className="text-lg font-mono font-black">{inv.invoiceNumber}</span>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                    <div>
                      <span className="text-slate-500 font-bold block text-xs">المورد:</span>
                      <span className="font-black text-slate-900">{inv.supplierName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block text-xs">التاريخ:</span>
                      <span className="font-mono font-bold text-slate-800">{formatDateTime(inv.date)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block text-xs">طريقة الدفع:</span>
                      <span className="font-bold text-amber-800">{inv.paymentMethod}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block text-xs">حالة الفاتورة:</span>
                      <span className="font-bold text-amber-700">بضاعة مستلمة ومضافة للمخزن</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 font-black text-slate-800">
                        <tr>
                          <th className="py-2.5 px-3 text-right">م</th>
                          <th className="py-2.5 px-3 text-right">الصنف المورد</th>
                          <th className="py-2.5 px-3 text-center">الكمية</th>
                          <th className="py-2.5 px-3 text-center">سعر الشراء</th>
                          <th className="py-2.5 px-3 text-left">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inv.items?.map((it, idx) => (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-50 ${it.productId === product.id ? 'bg-amber-50/50 font-black text-amber-950' : ''}`}
                          >
                            <td className="py-2 px-3">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <span>{it.productName}</span>
                              {it.productId === product.id && (
                                <span className="mr-2 text-xs bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                                  الصنف المحدد
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-bold">{it.quantity} {it.unit}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold">{it.unitPrice}</td>
                            <td className="py-2 px-3 text-left font-mono font-black">{it.total.toFixed(2)} {settings.currency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  <div className="bg-slate-100 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div>
                      <span className="text-slate-600 font-bold">إجمالي الفاتورة: </span>
                      <span className="font-mono font-black text-slate-900 text-lg">{inv.total.toFixed(2)} {settings.currency}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 font-bold">المدفوع للمورد: </span>
                      <span className="font-mono font-bold text-amber-800">{inv.paidAmount?.toFixed(2) || inv.total.toFixed(2)} {settings.currency}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 font-bold">المتبقي للمورد: </span>
                      <span className="font-mono font-bold text-purple-700">{inv.remainingAmount?.toFixed(2) || '0.00'} {settings.currency}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {docPreview.type === 'assembly' && (() => {
              const op = docPreview.operation;
              return (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="bg-orange-950 text-white rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black">
                        {op.type === 'disassembly' ? 'إذن تفكيك وتجهيز أصناف' : 'إذن تجميع وتشغيل أصناف'}
                      </h3>
                      <p className="text-xs text-orange-200 mt-1">
                        تحويل الأصناف وإعادة التشكيل المخزني مع ضبط التكلفة اللحظية
                      </p>
                    </div>
                    <div className="text-left bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                      <span className="text-xs text-orange-300 font-bold block">رقم إذن العملية</span>
                      <span className="text-lg font-mono font-black">{op.operationNumber}</span>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                    <div>
                      <span className="text-slate-500 font-bold block text-xs">نوع العملية:</span>
                      <span className="font-black text-orange-900">
                        {op.type === 'disassembly' ? 'تفكيك أصناف (لفة ← أمتار)' : 'تجميع أصناف'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block text-xs">التاريخ:</span>
                      <span className="font-mono font-bold text-slate-800">{formatDateTime(op.date)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block text-xs">المسؤول / المشغل:</span>
                      <span className="font-bold text-slate-800">{op.operatorName || op.performedBy || 'مدير المخزن'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block text-xs">إجمالي التكلفة:</span>
                      <span className="font-mono font-bold text-slate-900">{op.totalCost.toFixed(2)} {settings.currency}</span>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Source / Consumed items */}
                    <div className="border border-red-200 rounded-xl p-4 bg-red-50/30">
                      <h4 className="font-black text-red-900 text-sm mb-2 flex items-center gap-1.5">
                        <span>المكونات المصروفة من المخزن (-)</span>
                      </h4>
                      {op.componentsAffected && op.componentsAffected.length > 0 ? (
                        <div className="space-y-1 text-xs">
                          {op.componentsAffected.map((c, i) => (
                            <div key={i} className="flex justify-between py-1 border-b border-red-100">
                              <span className="font-bold text-slate-800">{c.productName}</span>
                              <span className="font-mono font-black text-red-700">{c.quantity} {c.unit}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">تم الخصم التلقائي للمكونات</p>
                      )}
                    </div>

                    {/* Output target product */}
                    <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/30">
                      <h4 className="font-black text-slate-800 text-sm mb-2 flex items-center gap-1.5">
                        <span>الصنف الناتج والمضاف للمخزن (+)</span>
                      </h4>
                      <div className="py-1">
                        <span className="font-black text-slate-900 block text-sm">{op.targetProductName}</span>
                        <span className="font-mono font-black text-amber-800 text-base">
                          +{op.quantity} {op.targetUnit || op.unit || 'قطعة'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {op.notes && (
                    <div className="text-xs text-slate-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                      <strong>ملاحظات الإذن: </strong> {op.notes}
                    </div>
                  )}
                </div>
              );
            })()}

            {docPreview.type === 'sales_return' && (() => {
              const ret = docPreview.invoice;
              return (
                <div className="space-y-4">
                  <div className="bg-amber-900 text-white rounded-2xl p-5 flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-black">إذن مرتجع مبيعات</h3>
                      <p className="text-xs text-amber-200 mt-1">العميل: {ret.customerName}</p>
                    </div>
                    <div className="text-left bg-white/10 px-4 py-2 rounded-xl">
                      <span className="text-xs text-amber-300 block">رقم الإذن</span>
                      <span className="text-lg font-mono font-black">{ret.returnNumber}</span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden text-sm">
                    <table className="w-full">
                      <thead className="bg-slate-100 font-bold">
                        <tr>
                          <th className="p-2 text-right">الصنف المرتجع</th>
                          <th className="p-2 text-center">الكمية</th>
                          <th className="p-2 text-left">المبلغ المسترد</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ret.items?.map((it, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-bold">{it.productName}</td>
                            <td className="p-2 text-center font-mono font-black text-amber-700">+{it.quantity} {it.unit}</td>
                            <td className="p-2 text-left font-mono font-bold">{it.total} {settings.currency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-slate-100 p-4 rounded-xl flex justify-between font-bold text-sm">
                    <span>إجمالي المرتجع: {ret.total} {settings.currency}</span>
                    <span>طريقة الرد: {ret.refundMethod}</span>
                  </div>
                </div>
              );
            })()}

            {docPreview.type === 'purchase_return' && (() => {
              const ret = docPreview.invoice;
              return (
                <div className="space-y-4">
                  <div className="bg-rose-950 text-white rounded-2xl p-5 flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-black">إذن مرتجع مشتريات إلى المورد</h3>
                      <p className="text-xs text-rose-200 mt-1">المورد: {ret.supplierName}</p>
                    </div>
                    <div className="text-left bg-white/10 px-4 py-2 rounded-xl">
                      <span className="text-xs text-rose-300 block">رقم الإذن</span>
                      <span className="text-lg font-mono font-black">{ret.returnNumber}</span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden text-sm">
                    <table className="w-full">
                      <thead className="bg-slate-100 font-bold">
                        <tr>
                          <th className="p-2 text-right">الصنف المرتجع للمورد</th>
                          <th className="p-2 text-center">الكمية المردودة</th>
                          <th className="p-2 text-left">القيمة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ret.items?.map((it, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-bold">{it.productName}</td>
                            <td className="p-2 text-center font-mono font-black text-rose-700">-{it.quantity} {it.unit}</td>
                            <td className="p-2 text-left font-mono font-bold">{it.total} {settings.currency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {docPreview.type === 'waste' && (() => {
              const w = docPreview.record;
              return (
                <div className="space-y-4">
                  <div className="bg-slate-800 text-white rounded-2xl p-5 flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-black">إذن تسوية عجز وإتلاف مخزني</h3>
                      <p className="text-xs text-slate-300 mt-1">تاريخ: {formatDateTime(w.date)}</p>
                    </div>
                    <div className="text-left bg-white/10 px-4 py-2 rounded-xl">
                      <span className="text-xs text-amber-300 block">رقم الإذن</span>
                      <span className="text-lg font-mono font-black">{w.id.slice(0, 8)}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-600">الصنف:</span>
                      <span className="font-black text-slate-900">{w.productName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-600">الكمية التالفة / المستبعدة:</span>
                      <span className="font-mono font-black text-rose-700">-{w.quantity} {w.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-600">سعر التكلفة:</span>
                      <span className="font-mono font-bold text-slate-800">{w.costPrice} {settings.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-600">إجمالي قيمة الخسارة:</span>
                      <span className="font-mono font-black text-rose-900">{w.lossValue} {settings.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-600">السبب:</span>
                      <span className="font-bold text-amber-800">{w.reason}</span>
                    </div>
                    {w.notes && (
                      <div className="mt-2 text-xs text-slate-500 pt-2 border-t border-slate-200">
                        ملاحظات: {w.notes}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {docPreview.type === 'opening' && (() => {
              return (
                <div className="space-y-4">
                  <div className="bg-slate-900 text-white rounded-2xl p-5 flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-black">إذن إثبات رصيد المخزون الافتتاحي</h3>
                      <p className="text-xs text-amber-300 mt-1">بداية تشغيل النظام وإدخال بضاعة أول المدة</p>
                    </div>
                    <span className="bg-amber-400 text-slate-900 font-bold px-3 py-1 rounded-lg text-xs">
                      رصيد افتتاحي
                    </span>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-sm space-y-3">
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-600">الصنف:</span>
                      <span className="font-black text-slate-900 text-base">{product.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-600">الباركود:</span>
                      <span className="font-mono font-bold text-slate-800">{product.barcode || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-600">الكمية الافتتاحية المسجلة:</span>
                      <span className="font-mono font-black text-amber-700 text-lg">
                        +{docPreview.initialStock.toFixed(2)} {docPreview.unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-600">سعر التكلفة:</span>
                      <span className="font-mono font-bold text-slate-800">{product.purchasePrice} {settings.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-600">إجمالي قيمة بضاعة أول المدة:</span>
                      <span className="font-mono font-black text-slate-900 text-base">
                        {(docPreview.initialStock * product.purchasePrice).toFixed(2)} {settings.currency}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {docPreview.type === 'prior' && (() => {
              return (
                <div className="space-y-4">
                  <div className="bg-slate-800 text-white rounded-2xl p-5 flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-black">كشف رصيد ما قبل بداية الفترة</h3>
                      <p className="text-xs text-slate-300 mt-1">الرصيد التراكمي السابق حتى تاريخ: {docPreview.date}</p>
                    </div>
                    <span className="bg-amber-600 text-white font-bold px-3 py-1 rounded-lg text-xs">
                      رصيد مرحل
                    </span>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-sm space-y-3">
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-600">الصنف:</span>
                      <span className="font-black text-slate-900 text-base">{product.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-600">رصيد المخزون التراكمي السابق:</span>
                      <span className="font-mono font-black text-amber-700 text-lg">
                        {docPreview.priorBalance.toFixed(2)} {docPreview.unit}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 pt-2 border-t border-slate-200">
                      هذا الرصيد ناتج عن حساب كافة الحركات الواردة والصادرة السابقة لهذا التاريخ لتبدأ به الفترة المحددة محاسبياً.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Document Modal Close Button */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setDocPreview(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-black px-6 py-2.5 rounded-xl text-sm transition-colors shadow-md"
              >
                إغلاق المستند
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
