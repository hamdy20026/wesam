import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { SafeAccount, FinancialTransaction } from '../types';
import {
  Wallet,
  Printer,
  Download,
  Search,
  X,
  Trash2,
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Calendar,
  CheckCircle2
} from 'lucide-react';

interface DetailedTreasuryStatementProps {
  initialSafeId?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export const DetailedTreasuryStatement: React.FC<DetailedTreasuryStatementProps> = ({
  initialSafeId,
  onClose,
  isModal = false,
}) => {
  const {
    safes,
    transactions,
    settings,
    deleteTransaction,
    closeStatement,
  } = useApp();

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      closeStatement();
    }
  };

  // Active Safe Selection
  const [selectedSafeId, setSelectedSafeId] = useState<string>(
    initialSafeId || safes[0]?.id || 'safe-main'
  );

  const activeSafe = useMemo(
    () => safes.find(s => s.id === selectedSafeId) || safes[0],
    [safes, selectedSafeId]
  );

  // Date Filter State
  const [datePreset, setDatePreset] = useState<'all' | 'thisMonth' | 'custom'>('all');
  const [dateFrom, setDateFrom] = useState<string>('2020-01-01');
  const [dateTo, setDateTo] = useState<string>('2099-12-31');

  // Search Filter State
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 25;

  // Preset Handlers
  const handlePresetChange = (preset: 'all' | 'thisMonth' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'all') {
      setDateFrom('2020-01-01');
      setDateTo('2099-12-31');
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setDateFrom(firstDay.toISOString().slice(0, 10));
      setDateTo(lastDay.toISOString().slice(0, 10));
    }
  };

  // Build Chronological Ledger Entries for Selected Safe
  const rawLedgerEntries = useMemo(() => {
    if (!activeSafe) return [];

    // Filter transactions associated with this safe
    const safeTx = transactions.filter(tx => {
      if (tx.safeId && tx.safeId === activeSafe.id) return true;
      if (!tx.safeId && activeSafe.id === 'safe-main') return true; // Default fallback to main safe
      if (tx.title && tx.title.includes(activeSafe.name)) return true;
      return false;
    });

    // Format & sort chronologically ascending
    const list = safeTx.map((tx, idx) => {
      const isIn = tx.direction === 'in';
      const refNum = tx.referenceId || `TX-${tx.id.slice(-6)}`;
      
      let typeBadgeLabel = 'حركة نقدية';
      let typeBadgeStyle = 'bg-slate-100 text-slate-800 border-slate-300';

      if (tx.type === 'debt_collection' || tx.type === 'sale_income') {
        typeBadgeLabel = 'سند قبض عميل';
        typeBadgeStyle = 'bg-amber-100 text-slate-800 border-amber-300';
      } else if (tx.type === 'supplier_payment') {
        typeBadgeLabel = 'سند صرف مورد';
        typeBadgeStyle = 'bg-rose-100 text-rose-900 border-rose-300';
      } else if (tx.type === 'general_expense' || tx.type === 'purchase_expense') {
        typeBadgeLabel = 'سند صرف مصروفات';
        typeBadgeStyle = 'bg-rose-100 text-rose-900 border-rose-300';
      } else if (tx.type === 'capital_deposit') {
        typeBadgeLabel = 'إيداع رأس مال';
        typeBadgeStyle = 'bg-amber-100 text-slate-800 border-amber-300';
      } else if (tx.type === 'safe_transfer') {
        typeBadgeLabel = isIn ? 'تحويل وارد' : 'تحويل صادر';
        typeBadgeStyle = isIn
          ? 'bg-amber-100 text-slate-800 border-amber-300'
          : 'bg-amber-100 text-amber-900 border-amber-300';
      }

      return {
        id: tx.id,
        rawDate: new Date(tx.date),
        dateStr: new Date(tx.date).toLocaleDateString('ar-EG'),
        timeStr: new Date(tx.date).toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        refNum,
        typeBadgeLabel,
        typeBadgeStyle,
        title: tx.title,
        notes: tx.notes,
        partyName: tx.partyName || '',
        inAmount: isIn ? tx.amount : 0,  // وارد (مدين)
        outAmount: !isIn ? tx.amount : 0, // صادر (دائن)
      };
    });

    list.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
    return list;
  }, [activeSafe, transactions]);

  // Filter Ledger Entries by Search & Date
  const filteredLedgerEntries = useMemo(() => {
    return rawLedgerEntries.filter(entry => {
      const entryDate = entry.rawDate.toISOString().slice(0, 10);
      if (dateFrom && entryDate < dateFrom) return false;
      if (dateTo && entryDate > dateTo) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = entry.title.toLowerCase().includes(q);
        const matchRef = entry.refNum.toLowerCase().includes(q);
        const matchNotes = (entry.notes || '').toLowerCase().includes(q);
        const matchParty = entry.partyName.toLowerCase().includes(q);
        if (!matchTitle && !matchRef && !matchNotes && !matchParty) return false;
      }

      return true;
    });
  }, [rawLedgerEntries, dateFrom, dateTo, searchQuery]);

  // Compute Running Balance for Filtered Entries
  const calculatedLedger = useMemo(() => {
    let runningBalance = 0;
    return filteredLedgerEntries.map((entry, idx) => {
      runningBalance += (entry.inAmount - entry.outAmount);
      return {
        ...entry,
        rowNum: idx + 1,
        runningBalance,
      };
    });
  }, [filteredLedgerEntries]);

  // Financial Summary Totals
  const totals = useMemo(() => {
    const totalIn = calculatedLedger.reduce((sum, e) => sum + e.inAmount, 0);
    const totalOut = calculatedLedger.reduce((sum, e) => sum + e.outAmount, 0);
    const openingBal = 0; // Previous balance
    const finalBalance = activeSafe?.balance ?? (totalIn - totalOut);

    return {
      openingBal,
      totalIn,
      totalOut,
      finalBalance,
    };
  }, [calculatedLedger, activeSafe]);

  // Pagination Logic
  const totalPages = Math.ceil(calculatedLedger.length / rowsPerPage) || 1;
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return calculatedLedger.slice(start, start + rowsPerPage);
  }, [calculatedLedger, currentPage, rowsPerPage]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (calculatedLedger.length === 0) return;
    let csv = 'م,التاريخ والوقت,رقم المرجع,نوع الحركة,البيان والتفاصيل,وارد (مدين),صادر (دائن),الرصيد التراكمي\n';
    calculatedLedger.forEach(item => {
      csv += `"${item.rowNum}","${item.dateStr} ${item.timeStr}","${item.refNum}","${item.typeBadgeLabel}","${item.title.replace(/"/g, '""')}","${item.inAmount}","${item.outAmount}","${item.runningBalance}"\n`;
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `دفتر_حسابات_${activeSafe?.name || 'الخزينة'}.csv`;
    a.click();
  };

  return (
    <div className="bg-slate-100 min-h-screen text-slate-900 font-sans text-xs select-none p-2 sm:p-4 space-y-3" dir="rtl">
      
      {/* 1. TOP DARK NAVY HEADER BAR (دفتر حسابات الخزينة) */}
      <div className="bg-gradient-to-r from-slate-950 via-amber-950 to-amber-950 text-white rounded-2xl p-3.5 shadow-2xl border-2 border-amber-400/50 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Right side: Safe Selector & Info */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-xs text-slate-400">دفتر حسابات:</span>
              <select
                value={selectedSafeId}
                onChange={e => setSelectedSafeId(e.target.value)}
                className="bg-slate-900 text-amber-300 border-2 border-slate-700 rounded-xl px-3 py-1 font-black text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {safes.map(s => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                    {s.name} ({s.balance.toLocaleString()} {settings.currency})
                  </option>
                ))}
              </select>
              <span className="bg-slate-800 text-amber-300 border border-amber-700 font-bold px-2 py-0.5 rounded-lg text-[10px]">
                {activeSafe?.type === 'bank'
                  ? 'حساب بنكي'
                  : activeSafe?.type === 'wallet'
                  ? 'محفظة إلكترونية'
                  : activeSafe?.type === 'pos'
                  ? 'درج كاشير'
                  : 'خزينة نقدية'}
              </span>
            </div>

            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              كود: <span className="font-bold text-white">{activeSafe?.id.slice(-5) || '10104'}</span> | العملة: <span className="font-bold text-white">{settings.currency}</span> | IBAN/الرقم: <span className="font-bold text-white">{activeSafe?.accountNumber || 'غير محدد'}</span>
            </div>
          </div>
        </div>

        {/* Left side: Top Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          <button
            onClick={() => window.print()}
            className="bg-amber-600 hover:bg-slate-500 text-white font-extrabold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow transition-all text-xs"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الدفتر</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-extrabold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow transition-all text-xs"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>تصدير CSV</span>
          </button>

          <button
            onClick={handleClose}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 shrink-0"
            title="إغلاق كشف الحساب والعودة"
          >
            <X className="w-4 h-4 text-slate-950" />
            <span>إغلاق ✕</span>
          </button>
        </div>
      </div>

      {/* 2. TOP 4 KPI SUMMARY RIBBON CARDS (الكروت الأربعة) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Opening Balance */}
        <div className="bg-white rounded-2xl p-3.5 border-2 border-slate-300 shadow-sm text-center">
          <span className="text-slate-500 text-[11px] font-bold block mb-1">رصيد سابق</span>
          <div className="text-sm sm:text-base font-black font-mono text-slate-900">
            {totals.openingBal.toLocaleString('en-US', { minimumFractionDigits: 2 })} {settings.currency}
          </div>
        </div>

        {/* Card 2: Total Inflows (الإيداعات) */}
        <div className="bg-amber-50 rounded-2xl p-3.5 border-2 border-amber-300 shadow-sm text-center">
          <span className="text-amber-800 text-[11px] font-bold block mb-1">إجمالي الإيداعات (مدين)</span>
          <div className="text-base sm:text-lg font-black font-mono text-amber-800">
            {totals.totalIn.toLocaleString('en-US', { minimumFractionDigits: 2 })} {settings.currency}
          </div>
        </div>

        {/* Card 3: Total Outflows (المسحوبات) */}
        <div className="bg-rose-50 rounded-2xl p-3.5 border-2 border-rose-300 shadow-sm text-center">
          <span className="text-rose-800 text-[11px] font-bold block mb-1">إجمالي المسحوبات (دائن)</span>
          <div className="text-base sm:text-lg font-black font-mono text-rose-700">
            {totals.totalOut.toLocaleString('en-US', { minimumFractionDigits: 2 })} {settings.currency}
          </div>
        </div>

        {/* Card 4: Net Final Balance (الرصيد النهائي الحالي) */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border-2 border-slate-300 shadow-sm text-center">
          <span className="text-slate-800 text-[11px] font-black block mb-1">الرصيد النهائي الحالي</span>
          <div className="text-lg sm:text-xl font-black font-mono text-slate-800">
            {totals.finalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} {settings.currency}
          </div>
        </div>
      </div>

      {/* 3. SEARCH & DATE PRESETS RIBBON */}
      <div className="bg-white rounded-2xl p-3 shadow-md border-2 border-slate-300 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Field */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="بحث في الحركات والبيان..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pr-9 pl-3 py-1.5 border-2 border-slate-300 rounded-xl font-bold bg-slate-50 focus:bg-white text-xs"
          />
        </div>

        {/* Date Presets */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          {datePreset === 'custom' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2 py-1 rounded-xl">
              <span className="font-bold text-slate-600 text-[11px]">من:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="bg-white border rounded px-1.5 py-0.5 font-mono text-xs font-bold"
              />
              <span className="font-bold text-slate-600 text-[11px]">إلى:</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="bg-white border rounded px-1.5 py-0.5 font-mono text-xs font-bold"
              />
            </div>
          )}

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => handlePresetChange('all')}
              className={`px-3 py-1 rounded-lg font-black text-xs transition-all ${
                datePreset === 'all'
                  ? 'bg-amber-700 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => handlePresetChange('thisMonth')}
              className={`px-3 py-1 rounded-lg font-black text-xs transition-all ${
                datePreset === 'thisMonth'
                  ? 'bg-amber-700 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              هذا الشهر
            </button>
            <button
              onClick={() => setDatePreset('custom')}
              className={`px-3 py-1 rounded-lg font-black text-xs transition-all ${
                datePreset === 'custom'
                  ? 'bg-amber-700 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              مخصص
            </button>
          </div>
        </div>
      </div>

      {/* 4. TRANSACTIONS LEDGER TABLE */}
      <div className="bg-white rounded-2xl shadow-md border-2 border-slate-400 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-slate-100 font-black text-xs border-b-2 border-amber-400">
                <th className="py-3 px-3 text-center border-l border-slate-800 w-12">م</th>
                <th className="py-3 px-3 text-center border-l border-slate-800 w-28">التاريخ والوقت</th>
                <th className="py-3 px-3 text-center border-l border-slate-800 w-28">رقم المرجع</th>
                <th className="py-3 px-3 text-center border-l border-slate-800 w-32">نوع الحركة</th>
                <th className="py-3 px-4 border-l border-slate-800">البيان والتفاصيل</th>
                <th className="py-3 px-3 text-center border-l border-slate-800 w-28">وارد (مدين)</th>
                <th className="py-3 px-3 text-center border-l border-slate-800 w-28">صادر (دائن)</th>
                <th className="py-3 px-4 text-center border-l border-slate-800 w-36">الرصيد التراكمي</th>
                <th className="py-3 px-2 text-center w-14">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 font-medium">
              {paginatedEntries.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500 border-l border-slate-200">
                    {entry.rowNum}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono border-l border-slate-200">
                    <div className="font-bold text-slate-800">{entry.dateStr}</div>
                    <div className="text-[10px] text-slate-400">{entry.timeStr}</div>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 border-l border-slate-200">
                    {entry.refNum}
                  </td>
                  <td className="py-2.5 px-3 text-center border-l border-slate-200">
                    <span className={`inline-block px-2.5 py-0.5 rounded-lg font-black text-[11px] border ${entry.typeBadgeStyle}`}>
                      {entry.typeBadgeLabel}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-bold text-slate-900 border-l border-slate-200">
                    <div>{entry.title}</div>
                    {entry.notes && (
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">الجهة: {entry.notes}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-black text-amber-700 text-xs sm:text-sm border-l border-slate-200">
                    {entry.inAmount > 0 ? entry.inAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-black text-rose-600 text-xs sm:text-sm border-l border-slate-200">
                    {entry.outAmount > 0 ? entry.outAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono font-black text-slate-900 border-l border-slate-200">
                    {entry.runningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <button
                      onClick={() => {
                        if (window.confirm(`هل أنت متأكد من حذف الحركة المرجعية ${entry.refNum}؟`)) {
                          deleteTransaction(entry.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="حذف الحركة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {paginatedEntries.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-bold text-sm">
                    لا توجد حركات مسجلة بهذا الحساب بالفترة المحددة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. BOTTOM TABLE SUMMARY RIBBON */}
        <div className="bg-gradient-to-r from-slate-950 via-amber-950 to-amber-950 text-white p-3 flex flex-col sm:flex-row items-center justify-between gap-3 font-extrabold text-xs border-t-2 border-amber-400/50">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-black">
              إجمالي الحركات: {calculatedLedger.length} حركة
            </span>
            <span className="text-slate-500">•</span>
            <span>
              الرصيد التراكمي النهائي:{' '}
              <span className="text-amber-400 font-mono font-black text-sm">
                {totals.finalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} {settings.currency}
              </span>
            </span>
          </div>

          {/* Pagination controls */}
          <div className="flex items-center gap-2 font-mono">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 text-xs font-sans font-bold"
            >
              السابق
            </button>

            <span className="text-slate-300 text-xs font-sans px-2">
              صفحة {currentPage} من {totalPages}
            </span>

            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 text-xs font-sans font-bold"
            >
              التالي
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
