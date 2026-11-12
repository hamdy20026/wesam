import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Customer, Supplier } from '../types';
import { X, Banknote, MessageSquare, Upload } from 'lucide-react';

interface VoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  direction: 'in' | 'out'; // 'in' = Receipt (سند قبض), 'out' = Disbursement (سند صرف)
  defaultPartyType?: 'customer' | 'supplier' | 'general';
  defaultPartyId?: string;
  defaultAmount?: number;
  defaultNotes?: string;
  onSuccess?: () => void;
}

export const VoucherModal: React.FC<VoucherModalProps> = ({
  isOpen,
  onClose,
  direction,
  defaultPartyType,
  defaultPartyId,
  defaultAmount,
  defaultNotes,
  onSuccess,
}) => {
  const {
    customers,
    suppliers,
    salesInvoices,
    purchaseInvoices,
    transactions,
    settings,
    safes,
    depositToSafe,
    withdrawFromSafe,
    collectCustomerDebt,
    paySupplier,
    addManualCashTransaction,
    activeShift,
  } = useApp();

  const [partyType, setPartyType] = useState<'customer' | 'supplier' | 'general'>(
    defaultPartyType || (direction === 'in' ? 'customer' : 'supplier')
  );
  const [selectedPartyId, setSelectedPartyId] = useState<string>(defaultPartyId || '');
  const [generalPartyName, setGeneralPartyName] = useState<string>('');
  const [amount, setAmount] = useState<number>(defaultAmount || 0);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'check'>('cash');
  const [selectedSafeId, setSelectedSafeId] = useState<string>(
    safes.find(s => s.isDefault)?.id || safes[0]?.id || 'safe-main'
  );
  const [notes, setNotes] = useState<string>(defaultNotes || '');
  const [fileName, setFileName] = useState<string>('');

  useEffect(() => {
    if (safes.length > 0 && !safes.some(s => s.id === selectedSafeId)) {
      const def = safes.find(s => s.isDefault) || safes[0];
      if (def) setSelectedSafeId(def.id);
    }
  }, [safes, selectedSafeId]);

  useEffect(() => {
    if (defaultPartyType) setPartyType(defaultPartyType);
    if (defaultPartyId) setSelectedPartyId(defaultPartyId);
    if (defaultAmount !== undefined) setAmount(defaultAmount);
    if (defaultNotes) setNotes(defaultNotes);
  }, [defaultPartyType, defaultPartyId, defaultAmount, defaultNotes]);

  // Selected customer or supplier object
  const selectedCustomer = useMemo(() => {
    if (partyType !== 'customer') return null;
    return customers.find(c => c.id === selectedPartyId) || null;
  }, [customers, partyType, selectedPartyId]);

  const selectedSupplier = useMemo(() => {
    if (partyType !== 'supplier') return null;
    return suppliers.find(s => s.id === selectedPartyId) || null;
  }, [suppliers, partyType, selectedPartyId]);

  // Financial metrics for selected party
  const partyMetrics = useMemo(() => {
    if (partyType === 'customer' && selectedCustomer) {
      const invoices = salesInvoices.filter(i => i.customerId === selectedCustomer.id && i.status !== 'cancelled');
      const collections = transactions.filter(
        tx => tx.type === 'debt_collection' && (tx.referenceId === selectedCustomer.id || tx.title.includes(selectedCustomer.name))
      );
      const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
      const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0) + collections.reduce((sum, tx) => sum + tx.amount, 0);
      const totalUnpaid = invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
      const dueAmount = selectedCustomer.currentBalance;
      const previousBalance = Math.max(0, dueAmount - totalUnpaid);

      return {
        name: selectedCustomer.name,
        phone: selectedCustomer.phone || 'غير مسجل',
        category: selectedCustomer.customerType === 'contractor' ? 'مقاول كهرباء' : selectedCustomer.customerType === 'technician' ? 'فني / فني كهرباء' : 'عميل تجاري',
        dueAmount,
        dueLabel: dueAmount >= 0 ? 'مستحق على العميل / لنا' : 'مستحق للعميل / علينا',
        totalInvoiced,
        totalPaid,
        totalUnpaid,
        previousBalance,
        totalLabel: 'إجمالي المبيعات:',
      };
    }

    if (partyType === 'supplier' && selectedSupplier) {
      const invoices = purchaseInvoices.filter(i => i.supplierId === selectedSupplier.id && (i as any).status !== 'cancelled');
      const supplierPayments = transactions.filter(
        tx => (tx.type as string) === 'supplier_payment' || (tx.type as string) === 'expense' && (tx.referenceId === selectedSupplier.id || tx.title.includes(selectedSupplier.name))
      );
      const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
      const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0) + supplierPayments.reduce((sum, tx) => sum + tx.amount, 0);
      const totalUnpaid = invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
      const dueAmount = selectedSupplier.currentBalance;
      const previousBalance = Math.max(0, dueAmount - totalUnpaid);

      return {
        name: selectedSupplier.name,
        phone: selectedSupplier.phone || 'غير مسجل',
        category: selectedSupplier.suppliedCategories || 'مورد شركات / مصانع',
        dueAmount,
        dueLabel: dueAmount >= 0 ? 'مستحق للمورد / علينا' : 'مستحق من المورد / لنا',
        totalInvoiced,
        totalPaid,
        totalUnpaid,
        previousBalance,
        totalLabel: 'إجمالي المشتريات:',
      };
    }

    return {
      name: generalPartyName || 'جهة أخرى / عام',
      phone: 'غير مسجل',
      category: 'عام / تسوية',
      dueAmount: 0,
      dueLabel: 'لا يوجد رصيد مسجل',
      totalInvoiced: 0,
      totalPaid: 0,
      totalUnpaid: 0,
      previousBalance: 0,
      totalLabel: 'إجمالي المعاملات:',
    };
  }, [partyType, selectedCustomer, selectedSupplier, generalPartyName, salesInvoices, purchaseInvoices, transactions]);

  // Update default notes when party changes
  useEffect(() => {
    if (!notes || notes.startsWith('سداد دفعة')) {
      if (direction === 'in') {
        setNotes(`سداد دفعة من حساب العميل: ${partyMetrics.name}`);
      } else {
        setNotes(`سداد دفعة لحساب المورد: ${partyMetrics.name}`);
      }
    }
  }, [partyMetrics.name, direction]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    const safeToUse = selectedSafeId || safes[0]?.id || 'safe-main';

    if (partyType === 'customer' && selectedCustomer) {
      collectCustomerDebt(selectedCustomer.id, amount, notes || `سند قبض نقدية من العميل: ${selectedCustomer.name}`);
      if (direction === 'in') {
        depositToSafe(safeToUse, amount, `سند قبض نقدية - العميل: ${selectedCustomer.name}`, notes);
      } else {
        withdrawFromSafe(safeToUse, amount, `سند صرف نقدية - العميل: ${selectedCustomer.name}`, notes);
      }
    } else if (partyType === 'supplier' && selectedSupplier) {
      paySupplier(selectedSupplier.id, amount, notes || `سند صرف نقدية للمورد: ${selectedSupplier.name}`);
      if (direction === 'out') {
        withdrawFromSafe(safeToUse, amount, `سند صرف نقدية - المورد: ${selectedSupplier.name}`, notes);
      } else {
        depositToSafe(safeToUse, amount, `سند قبض نقدية - المورد: ${selectedSupplier.name}`, notes);
      }
    } else {
      addManualCashTransaction({
        title: `${direction === 'in' ? 'سند قبض' : 'سند صرف'} - ${generalPartyName || 'جهة عامة'}`,
        amount,
        direction,
        notes,
      });
      if (direction === 'in') {
        depositToSafe(safeToUse, amount, `سند قبض - ${generalPartyName || 'جهة عامة'}`, notes);
      } else {
        withdrawFromSafe(safeToUse, amount, `سند صرف - ${generalPartyName || 'جهة عامة'}`, notes);
      }
    }

    if (onSuccess) onSuccess();
    onClose();
  };

  const handleWhatsAppShare = () => {
    const text = `*وسام للأدوات الكهربائية* ⚡
📄 *${direction === 'in' ? 'إضافة دفع / سند قبض' : 'إضافة دفع / سند صرف'}*
👤 الاسم: ${partyMetrics.name}
📱 الهاتف: ${partyMetrics.phone}
💵 المبلغ: ${amount.toLocaleString()} ${settings.currency}
📅 التاريخ: ${date}
📝 البيان: ${notes || 'سداد دفعة نقدية'}
📌 الرصيد المستحق حالياً: ${partyMetrics.dueAmount.toLocaleString()} ${settings.currency}`;

    const cleanPhone = partyMetrics.phone !== 'غير مسجل' ? partyMetrics.phone.replace(/[^0-9]/g, '') : '';
    const url = cleanPhone
      ? `https://wa.me/20${cleanPhone.replace(/^0/, '')}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-white rounded-3xl max-w-5xl sm:max-w-7xl w-full p-4 sm:p-6 shadow-2xl border-2 border-slate-700 text-xs text-right animate-in zoom-in-95 my-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2.5 border-b-2 border-slate-500 mb-2.5">
          <div className="w-6" /> {/* Spacer for centered title */}
          <h3 className="font-black text-slate-950 text-base sm:text-xl flex items-center gap-2">
            <Banknote className="w-6 h-6 text-amber-700" />
            <span>{direction === 'in' ? 'إضافة دفع / سند قبض' : 'إضافة دفع / سند صرف'}</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5">

          {/* Top Overview Cards Section (Prominent Amounts & Full Customer Name) */}
          <div className="bg-slate-50 p-3 rounded-2xl border-2 border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-3">
            
            {/* Card 1: Party Details (Full Customer Name Display) */}
            <div className="bg-white p-3 rounded-2xl border-2 border-slate-700 shadow-sm space-y-1.5 flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                <span className="text-slate-800 font-bold shrink-0">
                  {partyType === 'customer' ? 'اسم العميل:' : partyType === 'supplier' ? 'اسم المورد:' : 'اسم الجهة:'}
                </span>
                <span className="font-black text-slate-950 text-sm sm:text-base leading-snug break-words">
                  {partyMetrics.name}
                </span>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <span className="text-slate-800 font-bold">موبايل:</span>
                <span className="font-mono font-black text-slate-900 text-sm">{partyMetrics.phone}</span>
              </div>

              {/* Highlighted Due Amount Badge */}
              <div className="bg-amber-50 border-2 border-amber-600 rounded-xl p-2 text-center my-1 shadow-xs">
                <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 tracking-tight">
                  {partyMetrics.dueAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {settings.currency}
                </div>
                <div className="text-xs font-black text-slate-800 mt-0.5">
                  ({partyMetrics.dueLabel})
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <span className="text-slate-800 font-bold">النشاط / الفئة:</span>
                <span className="font-black text-slate-950">{partyMetrics.category}</span>
              </div>
            </div>

            {/* Card 2: Financial Totals (Prominent Amounts) */}
            <div className="bg-white p-3 rounded-2xl border-2 border-slate-700 shadow-sm space-y-2 flex flex-col justify-between text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-800 font-bold">{partyMetrics.totalLabel}</span>
                <span className="font-mono font-black text-slate-950 text-sm sm:text-base">
                  {partyMetrics.totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {settings.currency}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-800">
                <span className="font-bold">مجموع المبالغ المدفوعة:</span>
                <span className="font-mono font-black text-sm sm:text-base text-amber-800">
                  {partyMetrics.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {settings.currency}
                </span>
              </div>

              <div className="flex items-center justify-between text-red-800">
                <span className="font-bold">مجموع المبالغ غير المدفوعة:</span>
                <span className="font-mono font-black text-sm sm:text-base text-red-700">
                  {partyMetrics.totalUnpaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {settings.currency}
                </span>
              </div>

              <div className="flex items-center justify-between border-t-2 border-slate-300 pt-1.5 text-slate-900">
                <span className="font-bold">رصيد سابق:</span>
                <span className="font-mono font-black text-sm text-slate-950">
                  {partyMetrics.previousBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {settings.currency}
                </span>
              </div>
            </div>

          </div>

          {/* Party Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl border-2 border-slate-500">
            <button
              type="button"
              onClick={() => { setPartyType('customer'); setSelectedPartyId(''); }}
              className={`py-2 rounded-lg font-black text-xs transition-all ${
                partyType === 'customer' ? 'bg-white text-slate-900 shadow-sm border-2 border-amber-700 font-black' : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              عميل / مزارع
            </button>
            <button
              type="button"
              onClick={() => { setPartyType('supplier'); setSelectedPartyId(''); }}
              className={`py-2 rounded-lg font-black text-xs transition-all ${
                partyType === 'supplier' ? 'bg-white text-purple-950 shadow-sm border-2 border-purple-700 font-black' : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              مورد / شركة
            </button>
            <button
              type="button"
              onClick={() => { setPartyType('general'); setSelectedPartyId(''); }}
              className={`py-2 rounded-lg font-black text-xs transition-all ${
                partyType === 'general' ? 'bg-white text-slate-950 shadow-sm border-2 border-slate-700 font-black' : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              جهة عامة / أخرى
            </button>
          </div>

          {/* Party Dropdown / Name Input */}
          {partyType === 'customer' && (
            <div>
              <label className="text-[11px] font-black text-slate-900 block mb-1">اختر العميل / المقاول *</label>
              <select
                required
                value={selectedPartyId}
                onChange={e => {
                  const id = e.target.value;
                  setSelectedPartyId(id);
                  const c = customers.find(item => item.id === id);
                  if (c && c.currentBalance > 0) setAmount(c.currentBalance);
                }}
                className="w-full py-2.5 px-3 border-2 border-slate-600 rounded-xl text-xs sm:text-sm font-black text-slate-950 bg-white focus:ring-2 focus:ring-amber-600 shadow-sm text-center"
              >
                <option value="">-- اختر عميل من القائمة --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.currentBalance > 0 ? `(مديونية: ${c.currentBalance} ${settings.currency})` : '(خالص)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {partyType === 'supplier' && (
            <div>
              <label className="text-[11px] font-black text-slate-900 block mb-1">اختر المورد / الشركة *</label>
              <select
                required
                value={selectedPartyId}
                onChange={e => {
                  const id = e.target.value;
                  setSelectedPartyId(id);
                  const s = suppliers.find(item => item.id === id);
                  if (s && s.currentBalance > 0) setAmount(s.currentBalance);
                }}
                className="w-full py-2.5 px-3 border-2 border-slate-600 rounded-xl text-xs sm:text-sm font-black text-slate-950 bg-white focus:ring-2 focus:ring-amber-600 shadow-sm text-center"
              >
                <option value="">-- اختر مورد من القائمة --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.currentBalance > 0 ? `(مستحقات له: ${s.currentBalance} ${settings.currency})` : '(خالص)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {partyType === 'general' && (
            <div>
              <label className="text-[11px] font-black text-slate-900 block mb-1">اسم الجهة أو البيان *</label>
              <input
                type="text"
                required
                placeholder="مثال: تسوية إيداع / إيراد متفرقات"
                value={generalPartyName}
                onChange={e => setGeneralPartyName(e.target.value)}
                className="w-full py-2.5 px-3 border-2 border-slate-600 rounded-xl text-xs font-black text-slate-950 focus:ring-2 focus:ring-amber-600 shadow-sm text-center"
              />
            </div>
          )}

          {/* Form Controls Grid (Row 1: Amount, Date, Payment Method) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            
            {/* Amount */}
            <div>
              <label className="text-[11px] font-black text-slate-900 block mb-1">المبلغ:*</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={amount || ''}
                  onChange={e => setAmount(Number(e.target.value))}
                  className="w-full py-2.5 pl-8 pr-3 border-2 border-slate-600 rounded-xl font-mono font-black text-lg sm:text-xl text-slate-950 bg-amber-50/80 focus:ring-2 focus:ring-amber-600 shadow-sm text-center"
                  placeholder="0.00"
                />
                <Banknote className="w-5 h-5 absolute left-3 top-3 text-slate-700 pointer-events-none" />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="text-[11px] font-black text-slate-900 block mb-1">المدفوعة على:*</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full py-2.5 px-3 border-2 border-slate-600 rounded-xl text-xs font-mono font-bold text-slate-950 bg-white focus:ring-2 focus:ring-amber-600 shadow-sm text-center"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-[11px] font-black text-slate-900 block mb-1">طريقة الدفع:*</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as 'cash' | 'bank' | 'check')}
                className="w-full py-2.5 px-3 border-2 border-slate-600 rounded-xl text-xs font-bold text-slate-950 bg-white focus:ring-2 focus:ring-amber-600 shadow-sm text-center"
              >
                <option value="cash">نقدي 💵</option>
                <option value="bank">تحويل بنكي 🏦</option>
                <option value="check">شيك مصرفي 📑</option>
              </select>
            </div>

          </div>

          {/* Form Controls Grid (Row 2: Safe Account Bounded to Registered Safes & Wallets) */}
          <div>
            <label className="text-[11px] font-black text-slate-900 block mb-1">حساب الإيداع / الخزينة:*</label>
            <select
              value={selectedSafeId}
              onChange={e => setSelectedSafeId(e.target.value)}
              className="w-full py-2.5 px-3 border-2 border-slate-600 rounded-xl text-xs sm:text-sm font-black text-slate-950 bg-white focus:ring-2 focus:ring-amber-600 shadow-sm text-center"
            >
              {safes.map(s => {
                const typeLabel =
                  s.type === 'pos' || (s.type as string) === 'pos_drawer'
                    ? 'نقطة بيع كاشير'
                    : s.type === 'bank'
                    ? 'حساب بنكي'
                    : s.type === 'wallet'
                    ? 'محفظة إلكترونية'
                    : 'خزينة رئيسية';
                return (
                  <option key={s.id} value={s.id}>
                    [{typeLabel}] {s.name} ({s.balance.toLocaleString()} {settings.currency})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Payment Notes */}
          <div>
            <label className="text-[11px] font-black text-slate-900 block mb-1">ملاحظة الدفع / بيان السند:*</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-2.5 border-2 border-slate-600 rounded-xl text-xs font-bold text-slate-950 focus:ring-2 focus:ring-amber-600 shadow-sm text-center bg-white"
              placeholder="سداد دفعة من حساب العميل / المورد..."
            />
          </div>

          {/* Action Buttons Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-slate-400 mt-2">
            <button
              type="submit"
              className="bg-amber-700 hover:bg-amber-600 text-white font-black px-6 py-2.5 rounded-xl text-xs shadow-md border-2 border-amber-950 transition-all active:scale-95"
            >
              حفظ
            </button>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="bg-amber-700 hover:bg-amber-600 text-white font-black px-4 py-2.5 rounded-xl text-xs shadow-md border-2 border-amber-950 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4 text-amber-200" />
              <span>واتساب</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="bg-slate-200 hover:bg-slate-300 text-slate-900 font-extrabold px-5 py-2.5 rounded-xl text-xs border-2 border-slate-400 transition-colors"
            >
              إغلاق
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

