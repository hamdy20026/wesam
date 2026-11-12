import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DetailedCustomerStatement } from './DetailedCustomerStatement';
import { DetailedSupplierStatement } from './DetailedSupplierStatement';
import { DetailedTreasuryStatement } from './DetailedTreasuryStatement';
import {
  FileText,
  Users,
  Building2,
  Wallet,
  Printer,
  Calendar,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  RotateCcw,
  BadgePercent,
  CheckCircle2,
  DollarSign,
  ArrowRightLeft,
  Filter
} from 'lucide-react';

export const AccountStatements: React.FC = () => {
  const {
    customers,
    suppliers,
    safes,
    salesInvoices,
    purchaseInvoices,
    salesReturns,
    purchaseReturns,
    transactions,
    safeTransfers,
    transferBetweenSafes,
    settings,
  } = useApp();

  const [statementType, setStatementType] = useState<'customer' | 'supplier' | 'safe'>('customer');

  // Customer Filter
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [customerSearch, setCustomerSearch] = useState('');

  // Supplier Filter
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [supplierSearch, setSupplierSearch] = useState('');

  // Safe Filter
  const [selectedSafeId, setSelectedSafeId] = useState<string>(safes[0]?.id || 'safe-main');

  // Date Range Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Quick Safe Transfer Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferFrom, setTransferFrom] = useState(safes[0]?.id || 'safe-main');
  const [transferTo, setTransferTo] = useState(safes[1]?.id || 'safe-pos');
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferNotes, setTransferNotes] = useState('');
  const [transferStatusMsg, setTransferStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selected Customer details
  const activeCustomer = useMemo(
    () => customers.find(c => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  // Selected Supplier details
  const activeSupplier = useMemo(
    () => suppliers.find(s => s.id === selectedSupplierId),
    [suppliers, selectedSupplierId]
  );

  // Selected Safe details
  const activeSafe = useMemo(
    () => safes.find(s => s.id === selectedSafeId),
    [safes, selectedSafeId]
  );

  // Filtered customer list for selection
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))
    );
  }, [customers, customerSearch]);

  // Filtered supplier list
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers;
    const q = supplierSearch.toLowerCase();
    return suppliers.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.companyName && s.companyName.toLowerCase().includes(q))
    );
  }, [suppliers, supplierSearch]);

  // Build Customer Running Ledger
  const customerLedger = useMemo(() => {
    if (!selectedCustomerId) return [];

    interface LedgerEntry {
      id: string;
      date: string;
      type: 'invoice' | 'payment' | 'return';
      reference: string;
      description: string;
      debit: number; // مدين (المسحوبات تزيد الدين)
      credit: number; // دائن (المدفوعات تنقص الدين)
      balance: number; // الرصيد التراكمي
    }

    const entries: Omit<LedgerEntry, 'balance'>[] = [];

    // 1. Sales Invoices
    salesInvoices
      .filter(inv => inv.customerId === selectedCustomerId && inv.status !== 'cancelled')
      .forEach(inv => {
        entries.push({
          id: inv.id,
          date: inv.date,
          type: 'invoice',
          reference: inv.invoiceNumber,
          description: `فاتورة بيع بضاعة ومستلزمات كهرباء (${inv.items.length} صنف)`,
          debit: inv.total,
          credit: inv.paidAmount,
        });
      });

    // 2. Direct Debt Collections / Receipts
    transactions
      .filter(tx => tx.type === 'debt_collection' && tx.referenceId === selectedCustomerId)
      .forEach(tx => {
        entries.push({
          id: tx.id,
          date: tx.date,
          type: 'payment',
          reference: tx.id,
          description: tx.title || 'سند تحصيل نقدية / دفعة حساب',
          debit: 0,
          credit: tx.amount,
        });
      });

    // 3. Sales Returns
    salesReturns
      .filter(ret => ret.customerId === selectedCustomerId)
      .forEach(ret => {
        entries.push({
          id: ret.id,
          date: ret.date,
          type: 'return',
          reference: ret.returnNumber,
          description: `مرتجع بضاعة كهربائية (${ret.items.length} صنف)`,
          debit: 0,
          credit: ret.total,
        });
      });

    // Sort chronologically
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Apply date range filter
    const dateFiltered = entries.filter(e => {
      if (dateFrom && e.date.slice(0, 10) < dateFrom) return false;
      if (dateTo && e.date.slice(0, 10) > dateTo) return false;
      return true;
    });

    // Calculate running balance
    let current = 0;
    const finalLedger: LedgerEntry[] = [];
    dateFiltered.forEach(item => {
      current += (item.debit - item.credit);
      finalLedger.push({
        ...item,
        balance: current,
      });
    });

    return finalLedger;
  }, [selectedCustomerId, salesInvoices, transactions, salesReturns, dateFrom, dateTo]);

  // Customer Summary
  const customerSummary = useMemo(() => {
    const totalDebit = customerLedger.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = customerLedger.reduce((sum, e) => sum + e.credit, 0);
    const netBalance = activeCustomer?.currentBalance ?? (totalDebit - totalCredit);
    return {
      totalDebit,
      totalCredit,
      netBalance,
      invoicesCount: customerLedger.filter(e => e.type === 'invoice').length,
      paymentsCount: customerLedger.filter(e => e.type === 'payment').length,
    };
  }, [customerLedger, activeCustomer]);

  // Build Supplier Running Ledger
  const supplierLedger = useMemo(() => {
    if (!selectedSupplierId) return [];

    interface SupplierEntry {
      id: string;
      date: string;
      type: 'purchase' | 'payment' | 'return';
      reference: string;
      description: string;
      debit: number; // مدين (سدادنا للمورد ينقص حقه)
      credit: number; // دائن (فواتير التوريد تزيد حقه علينا)
      balance: number; // الرصيد المتبقي له
    }

    const entries: Omit<SupplierEntry, 'balance'>[] = [];

    // 0. Opening / Initial Balance
    const initialBal = activeSupplier?.initialBalance !== undefined
      ? activeSupplier.initialBalance
      : (activeSupplier?.currentBalance || 0);

    if (initialBal !== 0) {
      entries.push({
        id: `opening-${activeSupplier?.id}`,
        date: activeSupplier?.createdAt ? activeSupplier.createdAt.slice(0, 10) : '2020-01-01',
        type: 'purchase',
        reference: 'رصيد سابق',
        description: 'رصيد سابق مرحل (افتتاحي الحساب)',
        debit: initialBal < 0 ? Math.abs(initialBal) : 0,
        credit: initialBal > 0 ? initialBal : 0,
      });
    }

    // 1. Purchase Invoices
    purchaseInvoices
      .filter(p => p.supplierId === selectedSupplierId)
      .forEach(p => {
        entries.push({
          id: p.id,
          date: p.date,
          type: 'purchase',
          reference: p.invoiceNumber,
          description: `فاتورة شراء وتوريد (${p.items.length} صنف)`,
          debit: p.paidAmount,
          credit: p.total,
        });
      });

    // 2. Direct Supplier Payments
    transactions
      .filter(tx => tx.type === 'supplier_payment' && tx.referenceId === selectedSupplierId)
      .forEach(tx => {
        entries.push({
          id: tx.id,
          date: tx.date,
          type: 'payment',
          reference: tx.id,
          description: tx.title || 'سند صرف نقدية لحساب المورد',
          debit: tx.amount,
          credit: 0,
        });
      });

    // 3. Purchase Returns
    purchaseReturns
      .filter(ret => ret.supplierId === selectedSupplierId)
      .forEach(ret => {
        entries.push({
          id: ret.id,
          date: ret.date,
          type: 'return',
          reference: ret.returnNumber,
          description: `مرتجع مشتريات لمصنع/مورد (${ret.items.length} صنف)`,
          debit: ret.total,
          credit: 0,
        });
      });

    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const dateFiltered = entries.filter(e => {
      if (dateFrom && e.date.slice(0, 10) < dateFrom) return false;
      if (dateTo && e.date.slice(0, 10) > dateTo) return false;
      return true;
    });

    let current = 0;
    const finalLedger: SupplierEntry[] = [];
    dateFiltered.forEach(item => {
      current += (item.credit - item.debit);
      finalLedger.push({
        ...item,
        balance: current,
      });
    });

    return finalLedger;
  }, [selectedSupplierId, purchaseInvoices, transactions, purchaseReturns, dateFrom, dateTo]);

  // Supplier Summary
  const supplierSummary = useMemo(() => {
    const totalCredit = supplierLedger.reduce((sum, e) => sum + e.credit, 0); // purchases
    const totalDebit = supplierLedger.reduce((sum, e) => sum + e.debit, 0); // payments
    const netPayable = activeSupplier?.currentBalance ?? (totalCredit - totalDebit);
    return {
      totalCredit,
      totalDebit,
      netPayable,
    };
  }, [supplierLedger, activeSupplier]);

  // Build Safe Audit Ledger
  const safeLedger = useMemo(() => {
    // Collect all transactions, transfers in/out
    interface SafeEntry {
      id: string;
      date: string;
      type: 'in' | 'out' | 'transfer_in' | 'transfer_out';
      title: string;
      amount: number;
      notes?: string;
    }

    const list: SafeEntry[] = [];

    // Transactions
    transactions.forEach(tx => {
      list.push({
        id: tx.id,
        date: tx.date,
        type: tx.direction === 'in' ? 'in' : 'out',
        title: tx.title,
        amount: tx.amount,
        notes: tx.notes,
      });
    });

    // Transfers
    safeTransfers.forEach(st => {
      if (st.fromSafeId === selectedSafeId) {
        list.push({
          id: st.id,
          date: st.date,
          type: 'transfer_out',
          title: `تحويل صادر إلى [${st.toSafeName}]`,
          amount: st.amount,
          notes: st.notes,
        });
      }
      if (st.toSafeId === selectedSafeId) {
        list.push({
          id: st.id,
          date: st.date,
          type: 'transfer_in',
          title: `تحويل وارد من [${st.fromSafeName}]`,
          amount: st.amount,
          notes: st.notes,
        });
      }
    });

    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return list.filter(item => {
      if (dateFrom && item.date.slice(0, 10) < dateFrom) return false;
      if (dateTo && item.date.slice(0, 10) > dateTo) return false;
      return true;
    });
  }, [transactions, safeTransfers, selectedSafeId, dateFrom, dateTo]);

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferAmount <= 0) {
      setTransferStatusMsg({ type: 'error', text: 'يرجى إدخال مبلغ صحيح للتحويل.' });
      return;
    }
    const res = transferBetweenSafes(transferFrom, transferTo, transferAmount, transferNotes);
    if (res.success) {
      setTransferStatusMsg({ type: 'success', text: res.message });
      setTimeout(() => {
        setShowTransferModal(false);
        setTransferStatusMsg(null);
        setTransferAmount(0);
        setTransferNotes('');
      }, 1500);
    } else {
      setTransferStatusMsg({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                كشوفات الحسابات التفصيلية والأستاذ العام
              </h2>
              <p className="text-xs text-slate-500">
                وسام للأدوات الكهربائية • كشف حساب عملاء ومقاولي كهرباء، موردين، وحركة الخزائن
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowTransferModal(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>تحويل بين الخزائن والمحافظ</span>
          </button>
          <button
            onClick={() => window.print()}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة كشف الحساب A4</span>
          </button>
        </div>
      </div>

      {/* Main Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setStatementType('customer')}
          className={`py-2.5 px-4 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
            statementType === 'customer'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-900/20 font-black'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>كشف حساب عميل / مقاول كهرباء ({customers.length})</span>
        </button>

        <button
          onClick={() => setStatementType('supplier')}
          className={`py-2.5 px-4 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
            statementType === 'supplier'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-900/20 font-black'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>كشف حساب شركة ومورد ({suppliers.length})</span>
        </button>

        <button
          onClick={() => setStatementType('safe')}
          className={`py-2.5 px-4 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
            statementType === 'safe'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-900/20 font-black'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>كشف حركة الخزائن والمحافظ ({safes.length})</span>
        </button>
      </div>

      {/* SECTION 1: CUSTOMER STATEMENT */}
      {statementType === 'customer' && (
        <DetailedCustomerStatement initialCustomerId={selectedCustomerId} isModal={false} />
      )}

      {/* SECTION 2: SUPPLIER STATEMENT */}
      {statementType === 'supplier' && (
        <DetailedSupplierStatement initialSupplierId={selectedSupplierId} isModal={false} />
      )}

      {/* SECTION 3: SAFE & CASH FLOW AUDIT */}
      {statementType === 'safe' && (
        <DetailedTreasuryStatement initialSafeId={selectedSafeId} />
      )}

      {/* MODAL: Safe-to-Safe Transfer */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-600" />
                <span>تحويل مالي بين الخزائن والمحافظ</span>
              </h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {transferStatusMsg && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-bold ${
                  transferStatusMsg.type === 'success'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {transferStatusMsg.text}
              </div>
            )}

            <form onSubmit={handleExecuteTransfer} className="space-y-3.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">تحويل من الخزينة (المصدر) *</label>
                <select
                  value={transferFrom}
                  onChange={e => setTransferFrom(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl font-bold bg-slate-50"
                >
                  {safes.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (رصيدها: {s.balance.toLocaleString()} ج.م)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">تحويل إلى الخزينة (الوجهة) *</label>
                <select
                  value={transferTo}
                  onChange={e => setTransferTo(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl font-bold bg-slate-50"
                >
                  {safes.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (رصيدها: {s.balance.toLocaleString()} ج.م)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">المبلغ المراد تحويله (ج.م) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transferAmount || ''}
                  onChange={e => setTransferAmount(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full py-2.5 px-3 border border-slate-200 rounded-xl font-mono font-black text-lg text-amber-700 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">بيان التحويل أو ملاحظات</label>
                <input
                  type="text"
                  placeholder="مثلاً: توريد نقدية من درج الكاشير إلى الخزينة الرئيسية..."
                  value={transferNotes}
                  onChange={e => setTransferNotes(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl shadow-md transition-all active:scale-95 text-xs"
                >
                  تنفيذ التحويل وتحديث الأرصدة فورياً
                </button>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs"
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
