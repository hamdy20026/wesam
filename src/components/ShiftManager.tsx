import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Shift } from '../types';
import {
  Clock,
  Unlock,
  Lock,
  Wallet,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertTriangle,
  History,
  Printer,
  FileText,
  BadgeDollarSign,
  TrendingUp,
  User as UserIcon,
  Users,
  Search,
  Filter,
  Layers,
  ShieldAlert,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export const ShiftManager: React.FC = () => {
  const {
    shifts = [],
    activeShift,
    openShift,
    closeShift,
    currentUser,
    users = [],
    safes = [],
    settings,
    transactions = [],
    salesInvoices = []
  } = useApp();

  // Open Shift Form State
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || users[0]?.id || 'usr-1');
  const [startingBalance, setStartingBalance] = useState<string>('0');
  const [openNotes, setOpenNotes] = useState<string>('');

  // Close Shift Form State
  const [actualBalance, setActualBalance] = useState<string>('0');
  const [closeNotes, setCloseNotes] = useState<string>('');

  // Filter State for Shifts History
  const [historyUserFilter, setHistoryUserFilter] = useState<string>('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

  // Selected Employee Details
  const selectedUserForOpen = useMemo(() => {
    return users.find(u => u.id === selectedUserId) || currentUser || { id: 'usr-1', name: 'الكاشير الحالي' };
  }, [users, selectedUserId, currentUser]);

  // Active shift cash transactions log
  const activeShiftTransactions = useMemo(() => {
    if (!activeShift) return [];
    const openTime = new Date(activeShift.openedAt).getTime();
    return transactions.filter(tx => {
      const txTime = new Date(tx.date).getTime();
      return txTime >= openTime;
    });
  }, [activeShift, transactions]);

  // Active shift cash sales invoices
  const activeShiftSalesInvoices = useMemo(() => {
    if (!activeShift) return [];
    const openTime = new Date(activeShift.openedAt).getTime();
    return salesInvoices.filter(inv => {
      const invTime = new Date(inv.date).getTime();
      return invTime >= openTime && inv.paymentMethod === 'cash';
    });
  }, [activeShift, salesInvoices]);

  // Handle Opening Shift
  const handleOpenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const balanceNum = parseFloat(startingBalance);
    const validBalance = isNaN(balanceNum) ? 0 : Math.max(0, balanceNum);
    openShift(validBalance, openNotes.trim(), {
      id: selectedUserForOpen.id,
      name: selectedUserForOpen.name
    });
    setStartingBalance('0');
    setOpenNotes('');
  };

  // Handle Closing Shift
  const handleCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const balanceNum = parseFloat(actualBalance);
    const validBalance = isNaN(balanceNum) ? 0 : Math.max(0, balanceNum);
    closeShift(validBalance, closeNotes.trim());
    setActualBalance('0');
    setCloseNotes('');
  };

  // Format Date & Time
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filtered History Shifts
  const filteredShifts = useMemo(() => {
    return shifts.filter(s => {
      const matchesUser = historyUserFilter === 'all' || s.userId === historyUserFilter;
      const matchesStatus = historyStatusFilter === 'all' || s.status === historyStatusFilter;
      const q = historySearchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        s.userName.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.notes && s.notes.toLowerCase().includes(q));

      return matchesUser && matchesStatus && matchesQuery;
    });
  }, [shifts, historyUserFilter, historyStatusFilter, historySearchQuery]);

  // Printable Official Shift Report
  const handlePrintShiftReport = (shift: Shift) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const diff = shift.difference ?? 0;
    const diffText =
      shift.status === 'open'
        ? 'الوردية نشطة حالياً'
        : diff > 0
        ? `زيادة بالصندوق (+${diff.toLocaleString()})`
        : diff < 0
        ? `عجز بالصندوق (${diff.toLocaleString()})`
        : 'مطابق بالكامل (0.00)';

    const diffBg =
      shift.status === 'open'
        ? '#f3f4f6'
        : diff < 0
        ? '#fee2e2'
        : diff > 0
        ? '#d1fae5'
        : '#f3f4f6';

    const diffColor =
      shift.status === 'open'
        ? '#374151'
        : diff < 0
        ? '#991b1b'
        : diff > 0
        ? '#065f46'
        : '#111827';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>تقرير تقفيل وردية موظف - ${shift.userName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&display=swap');
            body {
              font-family: 'Almarai', sans-serif;
              direction: rtl;
              text-align: right;
              padding: 20px;
              color: #1e293b;
              max-width: 80mm;
              margin: 0 auto;
              font-size: 12px;
              line-height: 1.4;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #0f172a;
              padding-bottom: 12px;
              margin-bottom: 15px;
            }
            .store-title {
              font-size: 16px;
              font-weight: 800;
              color: #0f172a;
            }
            .report-title {
              font-size: 14px;
              font-weight: 700;
              color: #b45309;
              margin: 4px 0;
            }
            .shift-id {
              font-family: monospace;
              font-size: 11px;
              color: #64748b;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 6px 0;
              border-bottom: 1px dotted #cbd5e1;
              padding-bottom: 3px;
            }
            .bold {
              font-weight: 800;
            }
            .divider {
              border-top: 2px dashed #0f172a;
              margin: 14px 0;
            }
            .stat-box {
              padding: 8px;
              border-radius: 6px;
              margin: 8px 0;
              text-align: center;
            }
            .signatures {
              margin-top: 25px;
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              font-weight: 700;
              border-top: 1px solid #e2e8f0;
              padding-top: 12px;
            }
            .btn-print {
              display: block;
              width: 100%;
              padding: 10px;
              background-color: #b45309;
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-family: 'Almarai', sans-serif;
              font-weight: 800;
              margin-bottom: 15px;
            }
            @media print {
              .btn-print { display: none; }
              body { padding: 0; margin: 0; }
            }
          </style>
        </head>
        <body>
          <button class="btn-print" onclick="window.print()">طباعة تقرير الوردية (حراري 80 مم) 🖨️</button>
          
          <div class="header">
            <div class="store-title">${settings.storeName}</div>
            <div class="report-title">تقرير أمانة وتسليم وردية موظف</div>
            <div class="shift-id">رقم الوردية: #${shift.id.slice(-8).toUpperCase()}</div>
          </div>

          <div class="info-row">
            <span>الموظف / الكاشير:</span>
            <span class="bold">${shift.userName}</span>
          </div>
          <div class="info-row">
            <span>تاريخ ووقت الفتح:</span>
            <span>${formatDateTime(shift.openedAt)}</span>
          </div>
          <div class="info-row">
            <span>تاريخ ووقت الإغلاق:</span>
            <span>${shift.closedAt ? formatDateTime(shift.closedAt) : 'مفتوحة حالياً'}</span>
          </div>
          <div class="info-row">
            <span>حالة الوردية:</span>
            <span class="bold">${shift.status === 'open' ? 'نشطة ومفتوحة' : 'مغلقة ومسلمة'}</span>
          </div>

          <div class="divider"></div>

          <div class="info-row bold">
            <span>مبلغ البداية (الافتتاحي):</span>
            <span>${shift.startingBalance.toLocaleString()} ${settings.currency}</span>
          </div>
          <div class="info-row">
            <span>المبيعات النقدية المقبوضة:</span>
            <span style="color: #047857; font-weight: bold;">+${shift.salesRevenue.toLocaleString()} ${settings.currency}</span>
          </div>
          <div class="info-row">
            <span>مقبوضات أخرى (سندات قبض):</span>
            <span style="color: #047857;">+${shift.otherIncomes.toLocaleString()} ${settings.currency}</span>
          </div>
          <div class="info-row">
            <span>مصروفات ومدفوعات نقداً:</span>
            <span style="color: #b91c1c;">-${shift.otherExpenses.toLocaleString()} ${settings.currency}</span>
          </div>

          <div class="divider"></div>

          <div class="info-row bold" style="background-color: #f8fafc; padding: 5px;">
            <span>الرصيد النقدي المتوقع بالدرج:</span>
            <span>${shift.expectedBalance.toLocaleString()} ${settings.currency}</span>
          </div>
          
          ${shift.status === 'closed' ? `
            <div class="info-row bold" style="background-color: #f8fafc; padding: 5px;">
              <span>مبلغ النهاية (العد الفعلي):</span>
              <span>${(shift.actualBalance ?? 0).toLocaleString()} ${settings.currency}</span>
            </div>

            <div class="stat-box" style="background-color: ${diffBg}; color: ${diffColor}; font-weight: 800;">
              <div>نتيجة المطابقة المالية:</div>
              <div style="font-size: 14px; margin-top: 2px;">${diffText}</div>
            </div>
          ` : ''}

          ${shift.notes ? `
            <div style="margin-top: 10px; font-size: 11px; border: 1px solid #e2e8f0; padding: 6px; border-radius: 6px; background-color: #f8fafc;">
              <strong>ملاحظات الوردية:</strong> ${shift.notes}
            </div>
          ` : ''}

          <div class="signatures">
            <div>توقيع الموظف:<br /><br />........................</div>
            <div>توقيع المشرف المالي:<br /><br />........................</div>
          </div>

          <div style="text-align: center; margin-top: 20px; font-size: 10px; color: #64748b;">
            منظومة إدارة المبيعات والورديات والرقابة المالية<br />
            تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <BadgeDollarSign className="w-6 h-6 text-amber-700" />
            شاشة إدارة ورديات الموظفين والرقابة المالية
          </h2>
          <p className="text-xs text-slate-500">
            فتح وإغلاق الورديات، تسجيل مبالغ البداية والنهاية، ومطابقتها التلقائية مع المبيعات النقدية
          </p>
        </div>

        {activeShift && (
          <button
            onClick={() => handlePrintShiftReport(activeShift)}
            className="bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>طباعة تقرير الوردية النشطة</span>
          </button>
        )}
      </div>

      {/* Top Shift Status & Real-time Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Metric 1: Current Shift Status */}
        <div className={`p-4 rounded-2xl border ${
          activeShift ? 'bg-slate-900 text-white border-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200'
        } shadow-sm flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">حالة الوردية الحالية</span>
            {activeShift ? (
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                مفتوحة ونشطة
              </span>
            ) : (
              <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                مغلقة
              </span>
            )}
          </div>
          <div className="mt-3">
            <div className="font-extrabold text-sm sm:text-base">
              {activeShift ? activeShift.userName : 'لا توجد وردية مفتوحة'}
            </div>
            {activeShift && (
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                منذ: {formatDateTime(activeShift.openedAt)}
              </div>
            )}
          </div>
        </div>

        {/* Metric 2: Starting Balance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold text-slate-600">مبلغ البداية (الافتتاحي)</span>
            <Coins className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 font-mono font-black text-xl text-slate-900">
            {activeShift ? activeShift.startingBalance.toLocaleString() : '0.00'}
          </div>
        </div>

        {/* Metric 3: Shift Cash Sales */}
        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[11px] font-bold">المبيعات النقدية المسجلة</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 font-mono font-black text-xl text-amber-800">
            +{activeShift ? activeShift.salesRevenue.toLocaleString() : '0.00'}
          </div>
        </div>

        {/* Metric 4: Cash Outflows & Expenses */}
        <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-[11px] font-bold">مصروفات ونفقات نقداً</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 font-mono font-black text-xl text-rose-800">
            -{activeShift ? activeShift.otherExpenses.toLocaleString() : '0.00'}
          </div>
        </div>

        {/* Metric 5: Expected Cash in Drawer */}
        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-800">
            <span className="text-[11px] font-bold">الرصيد النقدي المتوقع</span>
            <Wallet className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 font-mono font-black text-xl text-slate-800">
            {activeShift ? activeShift.expectedBalance.toLocaleString() : '0.00'}
          </div>
        </div>
      </div>

      {/* Main Shift Action Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Primary Column (7 Cols): Open Form OR Active Shift Operations */}
        <div className="lg:col-span-7 space-y-6">
          {!activeShift ? (
            /* OPEN SHIFT FORM (فتح وردية جديدة) */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">فتح وردية موظف جديدة</h3>
                  <p className="text-xs text-slate-500">
                    تعيين الموظف المسؤول وإدخال عهدة الدرج الافتتاحية لبدء المبيعات
                  </p>
                </div>
              </div>

              <form onSubmit={handleOpenSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Employee */}
                  <div>
                    <label className="font-bold text-slate-800 block mb-1 text-xs">
                      الموظف / الكاشير المسؤول عن الوردية *
                    </label>
                    <select
                      value={selectedUserId}
                      onChange={e => setSelectedUserId(e.target.value)}
                      className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role === 'admin' ? 'مدير' : u.role === 'cashier' ? 'كاشير' : 'أمين مخزن'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Starting Balance Input */}
                  <div>
                    <label className="font-bold text-slate-800 block mb-1 text-xs">
                      مبلغ البداية (الرصيد الافتتاحي بالدرج) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={startingBalance}
                        onChange={e => setStartingBalance(e.target.value)}
                        placeholder="0.00"
                        className="w-full py-2.5 px-3 pl-12 bg-white border border-slate-300 rounded-xl font-mono font-bold text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                      <Coins className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      يمكنك بدء الوردية برصيد صفري (0 ج.م) أو إدخال أي مبلغ عهدة نقدي.
                    </span>
                  </div>
                </div>

                {/* Quick Balance Shortcuts */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-bold text-slate-500">اختصارات نقدية سريعة:</span>
                  {[0, 50, 100, 200, 500, 1000].map(amt => {
                    const isSelected = (amt === 0 && (startingBalance === '0' || startingBalance === '' || parseFloat(startingBalance) === 0)) || (amt > 0 && parseFloat(startingBalance) === amt);
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setStartingBalance(amt.toString())}
                        className={`px-2.5 py-1 font-bold font-mono rounded-lg text-xs transition-colors ${
                          isSelected
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {amt === 0 ? 'رصيد صفري (0 ج.م)' : `+${amt}`}
                      </button>
                    );
                  })}
                </div>

                {/* Open Shift Notes */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1 text-xs">ملاحظات تسلم العهدة</label>
                  <input
                    type="text"
                    value={openNotes}
                    onChange={e => setOpenNotes(e.target.value)}
                    placeholder="مثال: استلام عهدة الخزينة مبالغ فكة ورقية..."
                    className="w-full py-2.5 px-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-extrabold py-3 rounded-xl shadow-md transition-all active:scale-95 text-xs flex items-center justify-center gap-2 mt-2"
                >
                  <Unlock className="w-4 h-4" />
                  <span>تأكيد فتح الوردية وبدء تسجيل المبيعات</span>
                </button>
              </form>
            </div>
          ) : (
            /* ACTIVE SHIFT SUMMARY & CASH LOG */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">تفاصيل الوردية القائمة ومطابقة المبيعات</h3>
                    <p className="text-xs text-slate-500">
                      أمانة الكاشير: <span className="font-bold text-slate-900">{activeShift.userName}</span>
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
                  #{activeShift.id.slice(-8).toUpperCase()}
                </span>
              </div>

              {/* Shift Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold block">فواتير البيع النقدي</span>
                  <span className="text-base font-black text-slate-900 font-mono">
                    {activeShiftSalesInvoices.length} فاتورة
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold block">إجمالي حركة النقدية</span>
                  <span className="text-base font-black text-slate-900 font-mono">
                    {activeShiftTransactions.length} عملية
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 font-bold block">صافي النقدية بالدرج</span>
                  <span className="text-base font-black text-amber-700 font-mono">
                    {activeShift.expectedBalance.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Shift Cash Operations Table */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  <span>حركة الصندوق المباشرة داخل هذه الوردية</span>
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-900 text-white font-bold sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">التاريخ والوقت</th>
                        <th className="py-2.5 px-3">العملية والبيان</th>
                        <th className="py-2.5 px-3 text-center">المبلغ النقدي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {activeShiftTransactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-500 text-[11px]">
                            {new Date(tx.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2 px-3 font-sans font-bold text-slate-800">
                            {tx.title}
                          </td>
                          <td className={`py-2 px-3 text-center font-black ${
                            tx.direction === 'in' ? 'text-amber-700' : 'text-rose-700'
                          }`}>
                            {tx.direction === 'in' ? `+${tx.amount.toLocaleString()}` : `-${tx.amount.toLocaleString()}`}
                          </td>
                        </tr>
                      ))}

                      {activeShiftTransactions.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-slate-400 font-sans">
                            لا توجد عمليات نقدية مسجلة في الوردية بعد
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right / Secondary Column (5 Cols): Close Shift & Financial Audit Panel */}
        <div className="lg:col-span-5 space-y-6">
          {activeShift ? (
            /* CLOSE SHIFT FORM (إغلاق الوردية ومطابقة النقدية) */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-800 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">تقفيل الوردية ومطابقة الصندوق</h3>
                  <p className="text-xs text-slate-500">
                    تسجيل مبلغ النهاية (العد الفعلي) ومطابقته التلقائية مع المبيعات
                  </p>
                </div>
              </div>

              <form onSubmit={handleCloseSubmit} className="space-y-4 text-xs">
                {/* Expected Balance Display */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">الرصيد النقدي المتوقع بالدرج</label>
                  <div className="py-2.5 px-3 bg-slate-100 rounded-xl font-mono font-black text-base text-slate-900 border border-slate-200">
                    {activeShift.expectedBalance.toLocaleString()}
                  </div>
                </div>

                {/* Actual Counted Cash Input */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    مبلغ النهاية (العد الفعلي للصندوق عند التسليم) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={actualBalance}
                      onChange={e => setActualBalance(e.target.value)}
                      placeholder="0.00"
                      className="w-full py-2.5 px-3 pl-12 bg-white border border-slate-300 rounded-xl font-mono font-black text-base text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <Coins className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                {/* Audit Reconciliation Match Indicator Box */}
                {(() => {
                  const numActual = parseFloat(actualBalance);
                  const validActual = isNaN(numActual) ? 0 : numActual;
                  const diff = validActual - activeShift.expectedBalance;
                  return (
                    <div className={`p-4 rounded-xl border flex flex-col gap-1.5 transition-all ${
                      diff < 0
                        ? 'bg-rose-50 border-rose-300 text-rose-900'
                        : diff > 0
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-amber-50 border-amber-300 text-slate-800'
                    }`}>
                      <div className="flex items-center justify-between font-bold text-xs">
                        <span>نتيجة مطابقة الوردية:</span>
                        <span className="font-mono text-base font-black">
                          {diff > 0 ? '+' : ''}
                          {diff.toLocaleString()}
                        </span>
                      </div>

                      <div className="text-[11px] font-bold flex items-center gap-1.5">
                        {diff === 0 ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>مطابق بالكامل 🟢 - لا يوجد أي عجز أو زيادة بالنقدية.</span>
                          </>
                        ) : diff < 0 ? (
                          <>
                            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>يوجد عجز بالخزينة 🔴 - يرجى تدوين سبب النقص في الملاحظات.</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>توجد زيادة بالصندوق 🟡 - النقدية الفعلية أكثر من المسجل.</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Close Shift Notes */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1">ملاحظات التقفيل وتسليم العهدة</label>
                  <textarea
                    rows={2}
                    value={closeNotes}
                    onChange={e => setCloseNotes(e.target.value)}
                    placeholder="ملاحظات حول سلامة النقدية أو سبب العجز..."
                    className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3 rounded-xl shadow-md transition-all active:scale-95 text-xs flex items-center justify-center gap-2 mt-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>تأكيد إغلاق الوردية وطباعة التقرير الحراري</span>
                </button>
              </form>
            </div>
          ) : (
            /* GUIDELINES WHEN NO ACTIVE SHIFT */
            <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <span>دليل الرقابة المالية وتسليم الورديات</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                1. قم باختيار الموظف المسؤول وإدخال عهدة الدرج الافتتاحية بدقة لبدء عمل الوردية.
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                2. يتم ربط كافة الفواتير والسندات النقدية تلقائياً برصيد الوردية النشطة لضمان الدقة وتفادي أي تلاعب.
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                3. عند الانتهاء، قم بعد النقدية بالدرج وإدخال مبلغ النهاية لمطابقتها فورياً واستخراج تقرير التسليم المعتمد.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Shifts History & Audit Trail Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-sm sm:text-base">سجل وأرشيف ورديات الموظفين المغلقة والمفتوحة</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
            {/* Filter by User */}
            <select
              value={historyUserFilter}
              onChange={e => setHistoryUserFilter(e.target.value)}
              className="bg-slate-800 text-slate-100 border border-slate-700 rounded-xl py-2 px-3 font-bold focus:outline-none"
            >
              <option value="all">كل الموظفين ({shifts.length})</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            {/* Filter by Status */}
            <select
              value={historyStatusFilter}
              onChange={e => setHistoryStatusFilter(e.target.value)}
              className="bg-slate-800 text-slate-100 border border-slate-700 rounded-xl py-2 px-3 font-bold focus:outline-none"
            >
              <option value="all">كل الحالات</option>
              <option value="open">مفتوحة حالياً</option>
              <option value="closed">مغلقة ومسلمة</option>
            </select>

            {/* Search Input */}
            <input
              type="text"
              placeholder="ابحث باسم الموظف أو رقم الوردية..."
              value={historySearchQuery}
              onChange={e => setHistorySearchQuery(e.target.value)}
              className="bg-slate-800 text-slate-100 border border-slate-700 rounded-xl py-2 px-3 font-bold focus:outline-none placeholder:text-slate-400 text-xs min-w-[180px]"
            />
          </div>
        </div>

        {filteredShifts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-4">رقم الوردية</th>
                  <th className="py-3 px-4">اسم الموظف / الكاشير</th>
                  <th className="py-3 px-4">وقت الفتح</th>
                  <th className="py-3 px-4">وقت الإغلاق</th>
                  <th className="py-3 px-4 font-mono text-center">بداية الوردية</th>
                  <th className="py-3 px-4 font-mono text-center">المبيعات النقدية</th>
                  <th className="py-3 px-4 font-mono text-center">نهاية الوردية (الفعلي)</th>
                  <th className="py-3 px-4 font-mono text-center">نتيجة المطابقة</th>
                  <th className="py-3 px-4 text-center">خيارات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredShifts.map(s => {
                  const diff = s.difference ?? 0;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        #{s.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="py-3.5 px-4 font-sans font-extrabold text-slate-900">
                        {s.userName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-sans">
                        {formatDateTime(s.openedAt)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-sans">
                        {s.closedAt ? (
                          formatDateTime(s.closedAt)
                        ) : (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-300">
                            مفتوحة حالياً
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {s.startingBalance.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-amber-700">
                        +{s.salesRevenue.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                        {s.actualBalance !== undefined ? s.actualBalance.toLocaleString() : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-sans">
                        {s.status === 'open' ? (
                          <span className="text-slate-400 font-bold text-[11px]">قيد التشغيل</span>
                        ) : diff === 0 ? (
                          <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-extrabold text-[10px] border border-amber-300">
                            مطابق 🟢
                          </span>
                        ) : diff < 0 ? (
                          <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-black text-[10px] border border-rose-300">
                            عجز ({diff.toLocaleString()}) 🔴
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-black text-[10px] border border-amber-300">
                            زيادة (+{diff.toLocaleString()}) 🟡
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handlePrintShiftReport(s)}
                          className="bg-slate-800 hover:bg-slate-700 text-white font-bold p-2 rounded-xl text-xs inline-flex items-center gap-1 shadow-sm transition-all active:scale-95"
                          title="طباعة تقرير تقفيل الوردية"
                        >
                          <Printer className="w-4 h-4 text-amber-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs font-bold">
            لا توجد ورديات مطابقة لشروط البحث
          </div>
        )}
      </div>
    </div>
  );
};
