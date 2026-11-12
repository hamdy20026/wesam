import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import {
  ClipboardCheck,
  Search,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Printer,
  FileSpreadsheet,
  Upload,
  RotateCcw,
  X,
  Plus,
  Minus,
  Check,
  FileText,
  EyeOff,
  Eye,
  CheckSquare,
  Square,
  History
} from 'lucide-react';

interface StocktakingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AuditEntry {
  actualQty: number;
  selectedForAudit: boolean;
  reason: string;
}

interface SavedAuditItem {
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

interface SavedAuditReport {
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

interface PreviousAuditInfo {
  auditNumber: string;
  date: string;
  actualQty: number;
}

const normalizeArabic = (str: string) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
};

export const StocktakingModal: React.FC<StocktakingModalProps> = ({ isOpen, onClose }) => {
  const {
    products,
    updateProduct,
    logWaste,
    currentUser,
    settings,
    savedAudits,
    previouslyAuditedMap,
    setPreviouslyAuditedMap,
    saveAuditReport,
    deleteAuditReport,
    resetPreviouslyAuditedMap,
  } = useApp();

  const [auditNumber, setAuditNumber] = useState(
    () => `INV-AUD-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`
  );
  const [auditDate, setAuditDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [auditorName, setAuditorName] = useState(() => currentUser?.name || 'أمين المخزن');
  const [generalNotes, setGeneralNotes] = useState('');


  // Search & Filter states (No barcode or category filter as requested)
  const [searchQuery, setSearchQuery] = useState('');
  const [varianceFilter, setVarianceFilter] = useState<
    | 'all'
    | 'selected_only'
    | 'not_previously_audited'
    | 'previously_audited'
    | 'has_variance'
    | 'deficit'
    | 'surplus'
    | 'matched'
  >('all');
  const [hidePreviouslyAudited, setHidePreviouslyAudited] = useState<boolean>(false);
  const [recordDeficitAsExpense, setRecordDeficitAsExpense] = useState(false);

  // Map of productId -> AuditEntry
  // IMPORTANT: selectedForAudit defaults to FALSE so NO items are marked as audited unless the user explicitly selects them!
  const [auditMap, setAuditMap] = useState<Record<string, AuditEntry>>(() => {
    const initial: Record<string, AuditEntry> = {};
    products.forEach(p => {
      initial[p.id] = {
        actualQty: p.quantity,
        selectedForAudit: false,
        reason: 'جرد فعلي مطابق',
      };
    });
    return initial;
  });

  const [activeView, setActiveView] = useState<'workspace' | 'archive'>('workspace');
  const [commitSuccessBanner, setCommitSuccessBanner] = useState<string | null>(null);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const getEntry = (p: Product): AuditEntry => {
    return (
      auditMap[p.id] ?? {
        actualQty: p.quantity,
        selectedForAudit: false,
        reason: 'جرد فعلي مطابق',
      }
    );
  };

  // Toggle whether a product is included in the current audit report
  const toggleSelectForAudit = (product: Product) => {
    setAuditMap(prev => {
      const current = prev[product.id] || getEntry(product);
      return {
        ...prev,
        [product.id]: {
          ...current,
          selectedForAudit: !current.selectedForAudit,
        },
      };
    });
  };

  // Manually toggle whether a product is marked as "Audited in a Previous Report"
  const togglePreviouslyAuditedMark = (product: Product) => {
    setPreviouslyAuditedMap(prev => {
      const next = { ...prev };
      if (next[product.id]) {
        delete next[product.id];
      } else {
        next[product.id] = {
          auditNumber: 'محضر سابق',
          date: new Date().toISOString(),
          actualQty: product.quantity,
        };
        // Ensure it is unchecked from current selection
        setAuditMap(aMap => ({
          ...aMap,
          [product.id]: {
            ...(aMap[product.id] || getEntry(product)),
            selectedForAudit: false,
          },
        }));
      }
      return next;
    });
  };

  // Clear all previous audit marks to start a fresh full-warehouse inventory cycle
  const handleClearPreviousAuditCycle = () => {
    resetPreviouslyAuditedMap();
    const nextMap: Record<string, AuditEntry> = {};
    products.forEach(p => {
      const current = auditMap[p.id];
      nextMap[p.id] = {
        actualQty: current ? current.actualQty : p.quantity,
        selectedForAudit: false,
        reason: current?.reason || 'جرد فعلي مطابق',
      };
    });
    setAuditMap(nextMap);
    setHidePreviouslyAudited(false);
    setCommitSuccessBanner('تم بدء دورة جرد جديدة وإلغاء علامات الجرد السابق لجميع الأصناف.');
    setTimeout(() => setCommitSuccessBanner(null), 3500);
  };


  const updateActualQty = (product: Product, newQty: number) => {
    const cleanQty = Math.max(0, Math.round(newQty * 1000) / 1000);
    const diff = cleanQty - product.quantity;
    setAuditMap(prev => ({
      ...prev,
      [product.id]: {
        actualQty: cleanQty,
        selectedForAudit: true, // Editing actual quantity automatically selects this specific item for audit
        reason:
          prev[product.id]?.reason && prev[product.id]?.reason !== 'جرد فعلي مطابق'
            ? prev[product.id].reason
            : diff === 0
            ? 'جرد فعلي مطابق'
            : diff < 0
            ? 'عجز جرد فعلي بالمخزن'
            : 'فائض جرد فعلي بالمخزن',
      },
    }));
  };

  const updateReason = (productId: string, reason: string, fallbackProduct: Product) => {
    setAuditMap(prev => {
      const current = prev[productId] || getEntry(fallbackProduct);
      return {
        ...prev,
        [productId]: {
          ...current,
          reason,
        },
      };
    });
  };

  // Unselect all currently selected items
  const handleClearCurrentSelection = () => {
    const next: Record<string, AuditEntry> = {};
    products.forEach(p => {
      const cur = getEntry(p);
      next[p.id] = {
        ...cur,
        selectedForAudit: false,
      };
    });
    setAuditMap(next);
  };

  // Match all with system balance (without auto-selecting all items)
  const handleMatchAllWithSystem = () => {
    const next: Record<string, AuditEntry> = {};
    products.forEach(p => {
      const cur = getEntry(p);
      next[p.id] = {
        actualQty: p.quantity,
        selectedForAudit: cur.selectedForAudit,
        reason: 'جرد فعلي مطابق',
      };
    });
    setAuditMap(next);
  };

  // Zero all for manual count (without auto-selecting all items)
  const handleResetToZeroCount = () => {
    const next: Record<string, AuditEntry> = {};
    products.forEach(p => {
      const wasAudited = Boolean(previouslyAuditedMap[p.id]);
      const cur = getEntry(p);
      next[p.id] = {
        actualQty: wasAudited ? p.quantity : 0,
        selectedForAudit: cur.selectedForAudit,
        reason: wasAudited ? 'تم جرده في محضر سابق' : 'بانتظار العد الفعلي',
      };
    });
    setAuditMap(next);
  };

  // Detailed Audit Row Calculations across ALL products
  const allAuditRows = useMemo(() => {
    return products.map(p => {
      const entry = getEntry(p);
      const prevAudit = previouslyAuditedMap[p.id] || null;
      const systemQty = p.quantity;
      const actualQty = entry.actualQty;
      const variance = Math.round((actualQty - systemQty) * 1000) / 1000;
      const varianceCostValue = Math.round(variance * p.purchasePrice * 100) / 100;
      const varianceRetailValue = Math.round(variance * p.sellingPrice * 100) / 100;
      return {
        product: p,
        entry,
        prevAudit,
        systemQty,
        actualQty,
        variance,
        varianceCostValue,
        varianceRetailValue,
      };
    });
  }, [products, auditMap, previouslyAuditedMap]);

  // Global Audit Summary KPIs
  const auditSummary = useMemo(() => {
    let matchedCount = 0;
    let surplusCount = 0;
    let deficitCount = 0;
    let selectedCount = 0;
    let previouslyAuditedCount = 0;
    let totalSurplusCost = 0;
    let totalDeficitCost = 0;
    let totalSystemCostValue = 0;
    let totalActualCostValue = 0;
    let totalActualRetailValue = 0;

    allAuditRows.forEach(r => {
      totalSystemCostValue += r.systemQty * r.product.purchasePrice;
      totalActualCostValue += r.actualQty * r.product.purchasePrice;
      totalActualRetailValue += r.actualQty * r.product.sellingPrice;

      if (r.prevAudit) {
        previouslyAuditedCount++;
      }
      if (r.entry.selectedForAudit) {
        selectedCount++;
      }

      if (r.variance === 0) {
        matchedCount++;
      } else if (r.variance > 0) {
        surplusCount++;
        totalSurplusCost += r.varianceCostValue;
      } else {
        deficitCount++;
        totalDeficitCost += Math.abs(r.varianceCostValue);
      }
    });

    const netCostVariance = Math.round((totalSurplusCost - totalDeficitCost) * 100) / 100;
    const accuracyRate =
      products.length > 0 ? ((matchedCount / products.length) * 100).toFixed(1) : '100.0';
    const remainingUnauditedCount = Math.max(0, products.length - previouslyAuditedCount);

    return {
      matchedCount,
      surplusCount,
      deficitCount,
      selectedCount,
      previouslyAuditedCount,
      remainingUnauditedCount,
      totalSurplusCost,
      totalDeficitCost,
      netCostVariance,
      totalSystemCostValue,
      totalActualCostValue,
      totalActualRetailValue,
      accuracyRate,
    };
  }, [allAuditRows, products.length]);

  // Filtered rows for display
  const filteredRows = useMemo(() => {
    const q = normalizeArabic(searchQuery);
    const words = q.split(/\s+/).filter(Boolean);

    return allAuditRows.filter(row => {
      const p = row.product;

      if (hidePreviouslyAudited && row.prevAudit) return false;

      if (varianceFilter === 'selected_only' && !row.entry.selectedForAudit) return false;
      if (varianceFilter === 'not_previously_audited' && row.prevAudit) return false;
      if (varianceFilter === 'previously_audited' && !row.prevAudit) return false;
      if (varianceFilter === 'has_variance' && row.variance === 0) return false;
      if (varianceFilter === 'deficit' && row.variance >= 0) return false;
      if (varianceFilter === 'surplus' && row.variance <= 0) return false;
      if (varianceFilter === 'matched' && row.variance !== 0) return false;

      if (words.length > 0) {
        const target = normalizeArabic(`${p.name} ${p.unit}`);
        return words.every(w => target.includes(w));
      }
      return true;
    });
  }, [allAuditRows, searchQuery, varianceFilter, hidePreviouslyAudited]);

  // Quick Search Enter handler
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredRows.length > 0) {
      e.preventDefault();
      const firstMatch = filteredRows[0];
      const el = inputRefs.current[firstMatch.product.id];
      if (el) {
        el.focus();
        el.select();
      }
    }
  };

  // Navigate between row inputs using Up/Down arrows or Enter
  const handleRowQtyKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number
  ) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      const nextRow = filteredRows[rowIndex + 1];
      if (nextRow) {
        const el = inputRefs.current[nextRow.product.id];
        el?.focus();
        el?.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRow = filteredRows[rowIndex - 1];
      if (prevRow) {
        const el = inputRefs.current[prevRow.product.id];
        el?.focus();
        el?.select();
      }
    }
  };

  // Export Audit Sheet to Excel (without barcode or category or ج.م)
  const handleExportAuditExcel = () => {
    const rows = allAuditRows.map((r, i) => ({
      'م': i + 1,
      'اسم الصنف': r.product.name,
      'الوحدة': r.product.unit,
      'تكلفة الوحدة': r.product.purchasePrice,
      'الرصيد الدفتري (بالنظام)': r.systemQty,
      'الرصيد الفعلي (الجرد)': r.actualQty,
      'الفرق (الفعلي - الدفتري)': r.variance,
      'قيمة الفرق (بالتكلفة)': r.varianceCostValue,
      'حالة الجرد السابق': r.prevAudit ? `تم جرده (${r.prevAudit.auditNumber})` : 'لم يجرد سابقاً',
      'حالة المطابقة':
        r.variance === 0 ? 'مطابق' : r.variance > 0 ? 'فائض (+)' : 'عجز (-)',
      'البيان / سبب الفرق': r.entry.reason,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'محضر جرد المخزن');
    XLSX.writeFile(wb, `محضر_جرد_المخزون_${auditNumber}_${auditDate}.xlsx`);
  };

  // Import Actual Quantities from Excel
  const handleImportAuditExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

        const updatedMap = { ...auditMap };
        let matchedCount = 0;

        raw.forEach(row => {
          const name = String(
            row['اسم الصنف'] || row['الاسم'] || row['Product Name'] || ''
          ).trim();
          const actualVal = parseFloat(
            String(
              row['الرصيد الفعلي (الجرد)'] ||
                row['الرصيد الفعلي'] ||
                row['الكمية الفعلية'] ||
                row['الكمية بالمخزن'] ||
                row['الكمية'] ||
                ''
            )
          );

          if (!isNaN(actualVal) && name) {
            const targetProd = products.find(
              p => normalizeArabic(p.name) === normalizeArabic(name)
            );
            if (targetProd) {
              const diff = actualVal - targetProd.quantity;
              updatedMap[targetProd.id] = {
                actualQty: Math.max(0, actualVal),
                selectedForAudit: true,
                reason:
                  String(row['البيان / سبب الفرق'] || row['ملاحظات'] || '').trim() ||
                  (diff === 0
                    ? 'جرد إكسيل مطابق'
                    : diff < 0
                    ? 'عجز جرد مستورد من إكسيل'
                    : 'فائض جرد مستورد من إكسيل'),
              };
              matchedCount++;
            }
          }
        });

        setAuditMap(updatedMap);
        setCommitSuccessBanner(
          `تم استيراد الكميات الفعلية من ملف الإكسيل ومطابقة ${matchedCount} صنف بنجاح!`
        );
        setTimeout(() => setCommitSuccessBanner(null), 4000);
      } catch {
        // Ignore invalid file
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Commit & Reconcile Inventory Stocktaking (ONLY for items explicitly selected by the user)
  const handleCommitStocktaking = () => {
    const selectedRows = allAuditRows.filter(r => r.entry.selectedForAudit);

    if (selectedRows.length === 0) {
      setCommitSuccessBanner(
        '⚠️ يرجى تحديد الأصناف المراد اعتماد جردها أولاً (بالضغط على مربع "تحديد للجرد" أمام الصنف أو تعديل رصيده الفعلي) ليتم اعتماد الأصناف المحددة فقط!'
      );
      setTimeout(() => setCommitSuccessBanner(null), 4500);
      return;
    }

    const changedRows = selectedRows.filter(r => r.variance !== 0);

    const report: SavedAuditReport = {
      id: `aud-${Date.now()}`,
      auditNumber,
      date: new Date().toISOString(),
      auditorName: auditorName.trim() || 'أمين المخزن',
      notes: generalNotes.trim() || 'محضر جرد وتسوية مخزنية',
      totalItemsCounted: selectedRows.length,
      surplusItemsCount: changedRows.filter(r => r.variance > 0).length,
      deficitItemsCount: changedRows.filter(r => r.variance < 0).length,
      totalSurplusValue: changedRows
        .filter(r => r.variance > 0)
        .reduce((s, r) => s + r.varianceCostValue, 0),
      totalDeficitValue: changedRows
        .filter(r => r.variance < 0)
        .reduce((s, r) => s + Math.abs(r.varianceCostValue), 0),
      netFinancialVariance: changedRows.reduce((s, r) => s + r.varianceCostValue, 0),
      auditedProductIds: selectedRows.map(r => r.product.id),
      itemsChanged: changedRows.map(r => ({
        productId: r.product.id,
        productName: r.product.name,
        unit: r.product.unit,
        costPrice: r.product.purchasePrice,
        systemQty: r.systemQty,
        actualQty: r.actualQty,
        variance: r.variance,
        varianceValue: r.varianceCostValue,
        reason: r.entry.reason,
      })),
    };

    // Update each changed product in the store (only among selected rows)
    changedRows.forEach(r => {
      if (r.variance < 0 && recordDeficitAsExpense) {
        logWaste(
          r.product.id,
          Math.abs(r.variance),
          'other',
          `تسوية عجز جرد رقم ${auditNumber}: ${r.entry.reason}`
        );
      } else {
        updateProduct(r.product.id, {
          quantity: r.actualQty,
        });
      }
    });

    // Save report and mark audited items in AppContext
    saveAuditReport(report);

    // Unselect the newly audited items after commit so they aren't accidentally committed again
    setAuditMap(prev => {
      const updated = { ...prev };
      selectedRows.forEach(r => {
        updated[r.product.id] = {
          ...(updated[r.product.id] || r.entry),
          actualQty: r.actualQty,
          selectedForAudit: false,
        };
      });
      return updated;
    });


    setCommitSuccessBanner(
      changedRows.length > 0
        ? `✅ تم اعتماد محضر الجرد (${auditNumber}) للأصناف المحددة فقط (${selectedRows.length} صنف)، وتحديث أرصدة (${changedRows.length} صنف) بالمخزن!`
        : `✅ تم اعتماد محضر الجرد (${auditNumber}) للأصناف المحددة فقط (${selectedRows.length} صنف) وتعليمها بأنه تم جردها دون المساس بباقي الأصناف!`
    );

    // Prepare next audit number
    setAuditNumber(`INV-AUD-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-1.5 sm:p-3 overflow-y-auto print:p-0 print:bg-white"
      dir="rtl"
    >
      <div className="bg-slate-50 w-full max-w-[98vw] min-h-[95vh] max-h-[97vh] rounded-2xl border-2 border-slate-600 shadow-2xl flex flex-col overflow-hidden font-sans print:max-h-none print:border-none print:shadow-none print:bg-white">
        {/* TOP HEADER BAR */}
        <div className="bg-gradient-to-r from-slate-950 via-amber-950 to-slate-900 text-white px-4 py-3 border-b-2 border-slate-700 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md font-black shrink-0">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white">
                  منظومة الجرد الفعلي والتسوية المخزنية الدقيقة (High-Precision Stocktaking)
                </h2>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black px-2.5 py-0.5 rounded-full">
                  نسبة تطابق المخزن: {auditSummary.accuracyRate}%
                </span>
              </div>
              <p className="text-xs text-slate-300 font-bold mt-0.5">
                مقارنة لحظية بين الرصيد الدفتري والعد الفعلي، مع تمييز واستبعاد الأصناف التي تم جردها في محضر سابق لمنع التكرار
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Switch between Active Audit Workspace & Audit Archive */}
            <div className="bg-slate-900 p-1 rounded-xl border border-slate-700 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveView('workspace')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  activeView === 'workspace'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                شاشة الجرد الفعلي
              </button>
              <button
                type="button"
                onClick={() => setActiveView('archive')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                  activeView === 'archive'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>أرشيف محاضر الجرد ({savedAudits.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-600 px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
              title="طباعة محضر الجرد الرسمي"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة محضر الجرد</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>إغلاق والعودة للمخازن</span>
            </button>
          </div>
        </div>

        {/* Success Notification Banner */}
        {commitSuccessBanner && (
          <div className="bg-amber-600 text-white px-4 py-2.5 font-black text-xs sm:text-sm flex items-center justify-between shrink-0 print:hidden">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{commitSuccessBanner}</span>
            </div>
            <button onClick={() => setCommitSuccessBanner(null)} className="hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {activeView === 'archive' ? (
          /* ARCHIVE OF PREVIOUS AUDITS */
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-slate-300 pb-3">
              <h3 className="text-base font-black text-slate-900">
                سجل وأرشيف محاضر الجرد والتسويات المعتمدة ({savedAudits.length})
              </h3>
              <button
                type="button"
                onClick={() => setActiveView('workspace')}
                className="bg-slate-900 text-amber-400 px-4 py-2 rounded-xl text-xs font-black cursor-pointer"
              >
                + بدء أو استكمال محضر جرد جديد
              </button>
            </div>

            {savedAudits.length === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-slate-400 p-12 text-center text-slate-500 font-black">
                لا توجد محاضر جرد محفوظة في الأرشيف حتى الآن.
              </div>
            ) : (
              <div className="space-y-4">
                {savedAudits.map(aud => (
                  <div
                    key={aud.id}
                    className="bg-white rounded-2xl border-2 border-slate-500 shadow-sm overflow-hidden"
                  >
                    <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-amber-400 text-sm">
                          {aud.auditNumber}
                        </span>
                        <span className="text-slate-300 font-bold">
                          التاريخ: {new Date(aud.date).toLocaleString('ar-EG')}
                        </span>
                        <span className="bg-slate-800 px-2.5 py-0.5 rounded border border-slate-600 font-bold">
                          المسؤول: {aud.auditorName}
                        </span>
                        <span className="bg-slate-800/70 text-amber-200 px-2.5 py-0.5 rounded border border-amber-500/40 font-bold">
                          عدد الأصناف المجرودة بالمحضر: {aud.totalItemsCounted} صنف
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-mono font-black">
                        <span className="text-amber-400">
                          فائض: +{aud.totalSurplusValue.toLocaleString()} ({aud.surplusItemsCount}{' '}
                          صنف)
                        </span>
                        <span className="text-rose-400">
                          عجز: -{aud.totalDeficitValue.toLocaleString()} ({aud.deficitItemsCount}{' '}
                          صنف)
                        </span>
                        <span className="bg-white/10 px-2.5 py-0.5 rounded text-white">
                          صافي الفرق: {aud.netFinancialVariance >= 0 ? '+' : ''}
                          {aud.netFinancialVariance.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {aud.itemsChanged.length > 0 ? (
                      <div className="p-3 overflow-x-auto">
                        <table className="w-full text-right text-xs border-collapse">
                          <thead className="bg-slate-100 text-slate-800 font-black border-b-2 border-slate-300">
                            <tr>
                              <th className="p-2">الصنف</th>
                              <th className="p-2 text-center">الرصيد الدفتري</th>
                              <th className="p-2 text-center">الرصيد الفعلي</th>
                              <th className="p-2 text-center">الفرق</th>
                              <th className="p-2 text-center">قيمة الفرق (تكلفة)</th>
                              <th className="p-2">البيان / السبب</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 font-bold">
                            {aud.itemsChanged.map((item, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="p-2 text-slate-900 font-black">
                                  {item.productName}
                                </td>
                                <td className="p-2 text-center font-mono">
                                  {item.systemQty} {item.unit}
                                </td>
                                <td className="p-2 text-center font-mono font-black text-slate-900">
                                  {item.actualQty} {item.unit}
                                </td>
                                <td
                                  className={`p-2 text-center font-mono font-black ${
                                    item.variance > 0 ? 'text-amber-700' : 'text-rose-700'
                                  }`}
                                >
                                  {item.variance > 0 ? `+${item.variance}` : item.variance}{' '}
                                  {item.unit}
                                </td>
                                <td
                                  className={`p-2 text-center font-mono font-black ${
                                    item.varianceValue >= 0
                                      ? 'text-amber-700'
                                      : 'text-rose-700'
                                  }`}
                                >
                                  {item.varianceValue >= 0 ? '+' : ''}
                                  {item.varianceValue.toLocaleString()}
                                </td>
                                <td className="p-2 text-slate-600">{item.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-amber-700 font-black text-xs">
                        ✅ جرد مطابق تماماً (لم توجد أي فروق عجز أو زيادة في هذا المحضر).
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ACTIVE HIGH-PRECISION STOCKTAKING WORKSPACE */
          <div className="p-3 sm:p-4 flex-1 flex flex-col gap-3 overflow-y-auto">
            {/* Printable Header (Only visible in print) */}
            <div className="hidden print:block text-center border-b-2 border-slate-900 pb-3 mb-2">
              <h1 className="text-xl font-black">{settings.storeName}</h1>
              <p className="text-sm font-bold">
                محضر جرد فعلي وتسوية مخزنية رقم: {auditNumber} | التاريخ: {auditDate} | المسؤول:{' '}
                {auditorName}
              </p>
            </div>

            {/* 1. AUDIT METADATA & KPI SUMMARY CARDS (Without ج.م) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 shrink-0">
              <div
                onClick={() => setVarianceFilter('not_previously_audited')}
                className="cursor-pointer bg-white hover:bg-amber-50/50 p-3 rounded-xl border-2 border-slate-400 shadow-xs transition-colors"
                title="اضغط لعرض الأصناف المتبقية التي لم يتم جردها في محضر سابق"
              >
                <span className="text-[11px] font-black text-slate-600 block">
                  إجمالي الأصناف بالجرد
                </span>
                <div className="text-base sm:text-lg font-black font-mono text-slate-900 mt-0.5">
                  {products.length} <span className="text-xs font-sans">صنف</span>
                </div>
                <span className="text-[10px] font-black text-amber-700 block">
                  جُرد سابقاً: {auditSummary.previouslyAuditedCount} | متبقي:{' '}
                  {auditSummary.remainingUnauditedCount}
                </span>
              </div>

              <div
                onClick={() => setVarianceFilter('matched')}
                className="cursor-pointer bg-amber-50/70 hover:bg-amber-100/70 p-3 rounded-xl border-2 border-amber-500 shadow-xs transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-800">أصناف مطابقة (✓)</span>
                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-amber-800 mt-0.5">
                  {auditSummary.matchedCount} <span className="text-xs font-sans">صنف</span>
                </div>
                <span className="text-[10px] font-bold text-amber-700">بدون أي عجز أو زيادة</span>
              </div>

              <div
                onClick={() => setVarianceFilter('surplus')}
                className="cursor-pointer bg-amber-50/70 hover:bg-amber-100/70 p-3 rounded-xl border-2 border-amber-500 shadow-xs transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-800">فائض / زيادة (+)</span>
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-amber-800 mt-0.5">
                  +{auditSummary.totalSurplusCost.toLocaleString()}
                </div>
                <span className="text-[10px] font-bold text-amber-700">
                  في {auditSummary.surplusCount} صنف
                </span>
              </div>

              <div
                onClick={() => setVarianceFilter('deficit')}
                className="cursor-pointer bg-rose-50/70 hover:bg-rose-100/70 p-3 rounded-xl border-2 border-rose-500 shadow-xs transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-rose-900">عجز / نقص (-)</span>
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-rose-800 mt-0.5">
                  -{auditSummary.totalDeficitCost.toLocaleString()}
                </div>
                <span className="text-[10px] font-bold text-rose-700">
                  في {auditSummary.deficitCount} صنف
                </span>
              </div>

              <div
                onClick={() => setVarianceFilter('has_variance')}
                className="cursor-pointer bg-white hover:bg-slate-100 p-3 rounded-xl border-2 border-slate-500 shadow-xs transition-colors"
              >
                <span className="text-[11px] font-black text-slate-700 block">
                  صافي فروق التقييم المالي
                </span>
                <div
                  className={`text-base sm:text-lg font-black font-mono mt-0.5 ${
                    auditSummary.netCostVariance > 0
                      ? 'text-amber-700'
                      : auditSummary.netCostVariance < 0
                      ? 'text-rose-700'
                      : 'text-amber-700'
                  }`}
                >
                  {auditSummary.netCostVariance > 0 ? '+' : ''}
                  {auditSummary.netCostVariance.toLocaleString()}
                </div>
                <span className="text-[10px] font-bold text-slate-500">
                  إجمالي الفروق: {auditSummary.surplusCount + auditSummary.deficitCount} صنف
                </span>
              </div>

              <div className="bg-slate-900 text-white p-3 rounded-xl border-2 border-slate-700 shadow-xs">
                <span className="text-[11px] font-bold text-amber-400 block">
                  قيمة المخزون الفعلي (تكلفة)
                </span>
                <div className="text-base sm:text-lg font-black font-mono text-white mt-0.5">
                  {auditSummary.totalActualCostValue.toLocaleString()}
                </div>
                <span className="text-[10px] font-mono text-amber-300 block">
                  بسعر البيع: {auditSummary.totalActualRetailValue.toLocaleString()}
                </span>
              </div>
            </div>

            {/* 2. VOUCHER INFO & QUICK ACTION TOOLBAR */}
            <div className="bg-white p-3 rounded-2xl border-2 border-slate-500 shadow-xs space-y-3 shrink-0 print:hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end">
                <div className="lg:col-span-2">
                  <label className="text-[11px] font-black text-slate-900 block mb-1">
                    رقم محضر الجرد
                  </label>
                  <input
                    type="text"
                    value={auditNumber}
                    onChange={e => setAuditNumber(e.target.value)}
                    className="w-full bg-slate-100 border-2 border-slate-500 rounded-xl py-1.5 px-2.5 font-mono font-black text-xs text-slate-900 text-center"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="text-[11px] font-black text-slate-900 block mb-1">
                    تاريخ الجرد
                  </label>
                  <input
                    type="date"
                    value={auditDate}
                    onChange={e => setAuditDate(e.target.value)}
                    className="w-full bg-white border-2 border-slate-500 rounded-xl py-1.5 px-2.5 font-mono font-black text-xs text-slate-900 text-center"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="text-[11px] font-black text-slate-900 block mb-1">
                    مسؤول الجرد / اللجنة
                  </label>
                  <input
                    type="text"
                    value={auditorName}
                    onChange={e => setAuditorName(e.target.value)}
                    placeholder="اسم المسؤول..."
                    className="w-full bg-white border-2 border-slate-500 rounded-xl py-1.5 px-2.5 font-black text-xs text-slate-900"
                  />
                </div>

                <div className="lg:col-span-3">
                  <label className="text-[11px] font-black text-slate-900 block mb-1">
                    ملاحظات عامة على محضر الجرد
                  </label>
                  <input
                    type="text"
                    value={generalNotes}
                    onChange={e => setGeneralNotes(e.target.value)}
                    placeholder="مثال: الجرد الدوري الشهري للمخزن الرئيسي..."
                    className="w-full bg-white border-2 border-slate-500 rounded-xl py-1.5 px-2.5 font-bold text-xs text-slate-900"
                  />
                </div>

                <div className="lg:col-span-3 flex items-center gap-1.5 justify-end flex-wrap">
                  <button
                    type="button"
                    onClick={handleExportAuditExcel}
                    className="bg-slate-800 hover:bg-amber-700 text-white px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
                    title="تصدير شيت الجرد الفعلي بالكامل إلى ملف إكسيل"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300" />
                    <span>تصدير شيت الجرد</span>
                  </button>

                  <label className="bg-amber-700 hover:bg-amber-600 text-white px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-amber-200" />
                    <span>استيراد الجرد من Excel</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleImportAuditExcel}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Search, Variance Filter & "Previous Audit" Prevention Controls */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-2 border-t-2 border-slate-200 items-center">
                <div className="md:col-span-4 relative">
                  <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="ابحث باسم الصنف ثم اضغط Enter للانتقال لخانة العد..."
                    className="w-full pr-9 pl-3 py-2 bg-slate-50 border-2 border-slate-500 focus:bg-white focus:border-slate-900 rounded-xl text-xs sm:text-sm font-black text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-3">
                  <select
                    value={varianceFilter}
                    onChange={e => setVarianceFilter(e.target.value as any)}
                    className="w-full bg-white border-2 border-slate-500 rounded-xl py-2 px-2.5 text-xs font-black text-slate-900 focus:outline-none"
                  >
                    <option value="all">عرض كل الأصناف ({allAuditRows.length})</option>
                    <option value="selected_only">
                      الأصناف المحددة للاعتماد حالياً ({auditSummary.selectedCount})
                    </option>
                    <option value="not_previously_audited">
                      الأصناف المتبقية (لم يتم جردها في محضر سابق: {auditSummary.remainingUnauditedCount})
                    </option>
                    <option value="previously_audited">
                      الأصناف التي تم جردها في محضر سابق ({auditSummary.previouslyAuditedCount})
                    </option>
                    <option value="has_variance">
                      الأصناف التي بها فروق فقط ({auditSummary.surplusCount + auditSummary.deficitCount})
                    </option>
                    <option value="deficit">أصناف بها عجز فقط (-{auditSummary.deficitCount})</option>
                    <option value="surplus">أصناف بها فائض فقط (+{auditSummary.surplusCount})</option>
                    <option value="matched">الأصناف المطابقة (✓ {auditSummary.matchedCount})</option>
                  </select>
                </div>

                <div className="md:col-span-5 flex items-center justify-end gap-1.5 flex-wrap">
                  {auditSummary.selectedCount > 0 && (
                    <button
                      type="button"
                      onClick={handleClearCurrentSelection}
                      className="bg-amber-50 hover:bg-amber-100 text-slate-800 border-2 border-amber-500 px-2.5 py-2 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer"
                      title="إلغاء تحديد الأصناف المختارة حالياً"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>إلغاء تحديد الكل ({auditSummary.selectedCount})</span>
                    </button>
                  )}

                  {/* Toggle hiding previously audited items so they are not repeated */}
                  <button
                    type="button"
                    onClick={() => setHidePreviouslyAudited(prev => !prev)}
                    className={`px-3 py-2 rounded-xl text-[11px] font-black border-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                      hidePreviouslyAudited
                        ? 'bg-amber-500 text-slate-950 border-amber-800 shadow-xs'
                        : 'bg-amber-50 text-amber-950 border-amber-500 hover:bg-amber-100'
                    }`}
                    title="إخفاء الأصناف التي تم جردها في محضر سابق لمنع تكرار جردها مرة أخرى"
                  >
                    {hidePreviouslyAudited ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>إظهار المجرود سابقاً ({auditSummary.previouslyAuditedCount})</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>إخفاء المجرود في محضر سابق ({auditSummary.previouslyAuditedCount})</span>
                      </>
                    )}
                  </button>

                  {auditSummary.previouslyAuditedCount > 0 && (
                    <button
                      type="button"
                      onClick={handleClearPreviousAuditCycle}
                      className="bg-amber-50 hover:bg-amber-100 text-slate-800 border-2 border-amber-400 px-2.5 py-2 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer"
                      title="بدء دورة جرد جديدة للمخزن بالكامل وإلغاء علامات الجرد السابق"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>بدء دورة جرد جديدة</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleMatchAllWithSystem}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-400 px-2.5 py-2 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer"
                    title="مساواة جميع الخانات بالرصيد الدفتري الحالي"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>مطابقة الكل</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetToZeroCount}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-900 border-2 border-rose-400 px-2.5 py-2 rounded-xl text-[11px] font-black cursor-pointer"
                    title="تصفير الخانات للأصناف غير المجرودة سابقاً لإدخال العد اليدوي"
                  >
                    تصفير للعد اليدوي
                  </button>
                </div>
              </div>
            </div>

            {/* 3. HIGH-PRECISION AUDIT TABLE (No Barcode, No Category, No ج.م, with Previous Audit Status) */}
            <div className="bg-white rounded-2xl border-2 border-slate-500 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[340px]">
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-slate-900 text-white font-black sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-2 border-l border-slate-800 text-center w-10">م</th>
                      <th
                        onClick={handleClearCurrentSelection}
                        className="py-2.5 px-2.5 border-l border-slate-800 text-center w-28 cursor-pointer hover:bg-slate-800"
                        title="حدد فقط الأصناف التي قمت بجردها لاعتمادها"
                      >
                        تحديد للجرد ({auditSummary.selectedCount})
                      </th>
                      <th className="py-2.5 px-3 border-l border-slate-800">اسم الصنف</th>
                      <th className="py-2.5 px-2.5 border-l border-slate-800 text-center">
                        حالة الجرد السابق
                      </th>
                      <th className="py-2.5 px-2.5 border-l border-slate-800 text-center">الوحدة</th>
                      <th className="py-2.5 px-2.5 border-l border-slate-800 text-center">
                        تكلفة الوحدة
                      </th>
                      <th className="py-2.5 px-3 border-l border-slate-800 text-center bg-slate-800">
                        الرصيد الدفتري (بالنظام)
                      </th>
                      <th className="py-2.5 px-3 border-l border-slate-800 text-center bg-slate-800 text-amber-300 w-48">
                        الرصيد الفعلي (الجرد الحقيقي)
                      </th>
                      <th className="py-2.5 px-2.5 border-l border-slate-800 text-center">
                        الفرق (فعلي - دفتري)
                      </th>
                      <th className="py-2.5 px-2.5 border-l border-slate-800 text-center">
                        قيمة الفرق (بالتكلفة)
                      </th>
                      <th className="py-2.5 px-2.5 border-l border-slate-800 text-center">
                        حالة المطابقة
                      </th>
                      <th className="py-2.5 px-3">سبب الفرق / ملاحظة التسوية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 font-bold">
                    {filteredRows.map((row, idx) => {
                      const {
                        product: p,
                        entry,
                        prevAudit,
                        systemQty,
                        actualQty,
                        variance,
                        varianceCostValue,
                      } = row;
                      const isDeficit = variance < 0;
                      const isSurplus = variance > 0;
                      const isAuditedBefore = Boolean(prevAudit);

                      return (
                        <tr
                          key={p.id}
                          className={`transition-colors ${
                            entry.selectedForAudit
                              ? 'bg-amber-50/70 ring-1 ring-inset ring-amber-500/40'
                              : isAuditedBefore
                              ? 'bg-amber-50/40 text-slate-600'
                              : isDeficit
                              ? 'bg-rose-50/70 hover:bg-rose-100/60'
                              : isSurplus
                              ? 'bg-amber-50/70 hover:bg-amber-100/60'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2 px-2 text-center font-mono text-slate-500 border-l border-slate-200">
                            {idx + 1}
                          </td>

                          {/* Include in current audit checkbox */}
                          <td className="py-2 px-2 text-center border-l border-slate-200">
                            <button
                              type="button"
                              onClick={() => toggleSelectForAudit(p)}
                              className={`inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg border-2 text-[11px] font-black transition-colors cursor-pointer ${
                                entry.selectedForAudit
                                  ? 'bg-amber-600 text-white border-amber-800 shadow-xs'
                                  : 'bg-white text-slate-600 border-slate-400 hover:border-slate-800 hover:bg-slate-100'
                              }`}
                              title={
                                entry.selectedForAudit
                                  ? 'محدد للاعتماد في هذا المحضر (اضغط لإلغاء تحديده)'
                                  : 'اضغط لتحديد هذا الصنف لاعتماده في محضر الجرد'
                              }
                            >
                              {entry.selectedForAudit ? (
                                <>
                                  <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                                  <span>محدد</span>
                                </>
                              ) : (
                                <>
                                  <Square className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                  <span>تحديد</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Product Name ONLY (No Barcode, No Category/Brand subtitle) */}
                          <td className="py-2 px-3 border-l border-slate-200">
                            <div className="font-black text-slate-900 text-xs sm:text-sm">
                              {p.name}
                            </div>
                          </td>

                          {/* Previous Audit Status Column (click to mark/unmark as audited in previous report) */}
                          <td className="py-2 px-2.5 text-center border-l border-slate-200">
                            <button
                              type="button"
                              onClick={() => togglePreviouslyAuditedMark(p)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-black border-2 inline-flex items-center gap-1 transition-all cursor-pointer ${
                                isAuditedBefore
                                  ? 'bg-amber-100 text-amber-950 border-amber-500 hover:bg-amber-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                              }`}
                              title="انقر لتحديد أو إلغاء تحديد الصنف كـ (تم جرده في محضر سابق) لمنع تكرار جرده"
                            >
                              {isAuditedBefore ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                  <span>تم جرده سابقاً ({prevAudit?.auditNumber})</span>
                                </>
                              ) : (
                                <span>لم يُجرد سابقاً</span>
                              )}
                            </button>
                          </td>

                          <td className="py-2 px-2.5 text-center text-slate-700 border-l border-slate-200">
                            {p.unit}
                          </td>

                          {/* Unit Cost without ج.م */}
                          <td className="py-2 px-2.5 text-center font-mono font-black text-slate-800 border-l border-slate-200">
                            {p.purchasePrice.toLocaleString()}
                          </td>

                          <td className="py-2 px-3 text-center font-mono font-black text-sm text-slate-900 bg-slate-100/80 border-l border-slate-200">
                            {systemQty}
                          </td>

                          {/* Actual Physical Count Input with +/- buttons and keyboard arrow support */}
                          <td className="py-1.5 px-2.5 border-l border-slate-200 bg-amber-50/30">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateActualQty(p, actualQty - 1)}
                                className="p-1.5 rounded-lg bg-white hover:bg-rose-100 text-slate-700 hover:text-rose-800 border-2 border-slate-400 transition-colors print:hidden cursor-pointer"
                                title="إنقاص 1"
                              >
                                <Minus className="w-3 h-3" />
                              </button>

                              <input
                                ref={el => {
                                  inputRefs.current[p.id] = el;
                                }}
                                type="number"
                                step="any"
                                min="0"
                                value={actualQty}
                                onChange={e => {
                                  const val =
                                    e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  updateActualQty(p, isNaN(val) ? 0 : val);
                                }}
                                onKeyDown={e => handleRowQtyKeyDown(e, idx)}
                                className={`w-24 py-1.5 px-2 text-center font-mono font-black text-sm rounded-xl border-2 focus:outline-none shadow-inner ${
                                  isDeficit
                                    ? 'bg-white border-rose-600 text-rose-900 focus:ring-2 focus:ring-rose-500/30'
                                    : isSurplus
                                    ? 'bg-white border-amber-600 text-slate-800 focus:ring-2 focus:ring-amber-500/30'
                                    : 'bg-white border-slate-600 text-slate-950 focus:border-slate-950'
                                }`}
                              />

                              <button
                                type="button"
                                onClick={() => updateActualQty(p, actualQty + 1)}
                                className="p-1.5 rounded-lg bg-white hover:bg-amber-100 text-slate-700 hover:text-amber-800 border-2 border-slate-400 transition-colors print:hidden cursor-pointer"
                                title="زيادة 1"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* Variance Quantity */}
                          <td className="py-2 px-2.5 text-center font-mono font-black text-sm border-l border-slate-200">
                            {variance === 0 ? (
                              <span className="text-amber-700">0</span>
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded-md border ${
                                  isSurplus
                                    ? 'bg-amber-100 text-slate-800 border-amber-400'
                                    : 'bg-rose-100 text-rose-900 border-rose-400'
                                }`}
                              >
                                {isSurplus ? `+${variance}` : variance}
                              </span>
                            )}
                          </td>

                          {/* Variance Financial Value without ج.م */}
                          <td className="py-2 px-2.5 text-center font-mono font-black border-l border-slate-200">
                            {varianceCostValue === 0 ? (
                              <span className="text-slate-400">0</span>
                            ) : (
                              <span className={isSurplus ? 'text-amber-800' : 'text-rose-700'}>
                                {isSurplus ? '+' : ''}
                                {varianceCostValue.toLocaleString()}
                              </span>
                            )}
                          </td>

                          {/* Match Status Badge */}
                          <td className="py-2 px-2.5 text-center border-l border-slate-200">
                            {variance === 0 ? (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-slate-800 border border-amber-400 px-2 py-0.5 rounded-full text-[11px] font-black">
                                <Check className="w-3 h-3" />
                                مطابق
                              </span>
                            ) : isSurplus ? (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-slate-800 border border-amber-400 px-2 py-0.5 rounded-full text-[11px] font-black">
                                زيادة +
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-900 border border-rose-400 px-2 py-0.5 rounded-full text-[11px] font-black">
                                عجز -
                              </span>
                            )}
                          </td>

                          {/* Reason / Note Input */}
                          <td className="py-1.5 px-2.5">
                            <input
                              type="text"
                              value={entry.reason}
                              onChange={e => updateReason(p.id, e.target.value, p)}
                              placeholder="سبب الفرق أو ملاحظة الجرد..."
                              className="w-full bg-white border-2 border-slate-400 focus:border-slate-800 rounded-lg py-1 px-2 text-xs font-bold text-slate-800 focus:outline-none"
                            />
                          </td>
                        </tr>
                      );
                    })}

                    {filteredRows.length === 0 && (
                      <tr>
                        <td colSpan={12} className="p-8 text-center text-slate-500 font-black">
                          لا توجد أصناف تطابق شروط البحث أو الفرز المحددة.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. BOTTOM ACTION & COMMIT BAR (Without ج.م) */}
            <div className="bg-slate-900 text-white p-3.5 rounded-2xl border-2 border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 print:hidden">
              <div className="flex items-center gap-4 flex-wrap text-xs">
                <div>
                  <span className="text-slate-400 font-bold ml-1">الأصناف المحددة للجرد حالياً:</span>
                  <strong className="font-mono text-amber-400 text-sm">
                    {auditSummary.selectedCount} صنف
                  </strong>
                </div>

                <div>
                  <span className="text-slate-400 font-bold ml-1">الأصناف المتأثرة بتعديل الرصيد:</span>
                  <strong className="font-mono text-amber-400 text-sm">
                    {auditSummary.surplusCount + auditSummary.deficitCount} صنف
                  </strong>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-600">
                  <input
                    type="checkbox"
                    checked={recordDeficitAsExpense}
                    onChange={e => setRecordDeficitAsExpense(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span className="font-bold text-slate-200 text-[11px]">
                    تسجيل قيمة العجز المالي ({auditSummary.totalDeficitCost.toLocaleString()}) في سجل الهالك والمصروفات تلقائياً
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-black border border-slate-600 cursor-pointer"
                >
                  إغلاق بدون اعتماد
                </button>

                <button
                  type="button"
                  onClick={handleCommitStocktaking}
                  className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer border-2 ${
                    auditSummary.selectedCount > 0
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/50 border-amber-400'
                      : 'bg-slate-700 hover:bg-slate-600 text-amber-300 border-amber-500/60'
                  }`}
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>
                    {auditSummary.selectedCount > 0
                      ? `اعتماد الأصناف المحددة فقط (${auditSummary.selectedCount} صنف) وتحديث المخزن ⚡`
                      : 'حدد الأصناف المراد جردها أولاً ثم اضغط للاعتماد ⚡'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
