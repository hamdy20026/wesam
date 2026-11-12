import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Expense, FinancialTransaction, SafeAccount, MoneyAssociation } from '../types';
import { VoucherModal } from './VoucherModal';
import { DetailedTreasuryStatement } from './DetailedTreasuryStatement';
import {
  BadgeDollarSign,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  Receipt,
  Building2,
  Trash2,
  Calendar,
  X,
  BarChart3,
  PieChart,
  Filter,
  FileText,
  Printer,
  ShoppingCart,
  ShoppingBag,
  DollarSign,
  Edit,
  Search,
  Users,
  CheckCircle2,
  CreditCard,
  Plus,
  ArrowRightLeft,
  ChevronDown
} from 'lucide-react';

const INITIAL_ASSOCIATIONS: MoneyAssociation[] = [
  {
    id: 'assoc-1',
    name: 'جمعية التجار والشركاء السنوية',
    organizer: 'الحاج إبراهيم العوضي',
    totalAmount: 100000,
    monthlyInstallment: 10000,
    totalMonths: 10,
    paidMonths: 4,
    payoutTurnMonth: 7,
    payoutDate: '2026-07-01',
    status: 'active',
    safeId: 'safe-main',
    startDate: '2026-01-01',
    notes: 'جمعية ادخارية لشراء بضائع الصيف كابلات ومفاتيح'
  },
  {
    id: 'assoc-2',
    name: 'جمعية العائلة الرمضانية',
    organizer: 'المهندس طارق عبد المنعم',
    totalAmount: 30000,
    monthlyInstallment: 3000,
    totalMonths: 10,
    paidMonths: 8,
    payoutTurnMonth: 3,
    payoutDate: '2026-03-15',
    status: 'payout_received',
    safeId: 'safe-main',
    startDate: '2025-10-01',
    notes: 'تم استلام المبلغ بشهر مارس وإيداعه بالخزينة الرئيسية'
  }
];

const EXPENSE_CATEGORIES: Record<Expense['category'], string> = {
  rent: 'إيجار المحل والمخازن',
  utilities: 'كهرباء ومياه وإنترنت',
  salaries: 'مرتبات وعمالة',
  transport: 'نقل ومشال وشحن بضاعة',
  hospitality: 'بوفيه وضيافة ونظافة',
  maintenance: 'صيانة ومعدات الورشة',
  marketing: 'دعاية وإعلانات ومطبوعات',
  taxes: 'ضرائب وتأمينات ورسوم ورخص',
  other: 'مصروفات ونثريات أخرى',
};

export const Finance: React.FC = () => {
  const {
    metrics,
    expenses,
    transactions,
    salesInvoices,
    purchaseInvoices,
    addExpense,
    deleteExpense,
    addManualCashTransaction,
    updateTransaction,
    deleteTransaction,
    customers,
    suppliers,
    collectCustomerDebt,
    paySupplier,
    settings,
    safes,
    safeTransfers,
    addSafe,
    updateSafe,
    deleteSafe,
    depositToSafe,
    withdrawFromSafe,
    transferBetweenSafes,
    setActiveTab,
    openStatement,
    associations,
    addAssociation,
    updateAssociation,
    deleteAssociation,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<
    'safes' | 'vouchers' | 'associations' | 'overview' | 'profit_reports' | 'expenses' | 'transactions'
  >('safes');

  // Association Modal & Form State

  const [showAssocModal, setShowAssocModal] = useState(false);
  const [editingAssoc, setEditingAssoc] = useState<MoneyAssociation | null>(null);
  const [assocName, setAssocName] = useState('');
  const [assocOrganizer, setAssocOrganizer] = useState('');
  const [assocTotalAmount, setAssocTotalAmount] = useState<number>(0);
  const [assocMonthlyInstallment, setAssocMonthlyInstallment] = useState<number>(0);
  const [assocTotalMonths, setAssocTotalMonths] = useState<number>(10);
  const [assocPaidMonths, setAssocPaidMonths] = useState<number>(0);
  const [assocPayoutTurnMonth, setAssocPayoutTurnMonth] = useState<number>(1);
  const [assocPayoutDate, setAssocPayoutDate] = useState('');
  const [assocSafeId, setAssocSafeId] = useState<string>(safes[0]?.id || 'safe-main');
  const [assocNotes, setAssocNotes] = useState('');

  // Action Modals: Pay Installment & Receive Payout
  const [payInstallmentModal, setPayInstallmentModal] = useState<MoneyAssociation | null>(null);
  const [payInstallmentSafeId, setPayInstallmentSafeId] = useState<string>(safes[0]?.id || 'safe-main');

  const [payoutModal, setPayoutModal] = useState<MoneyAssociation | null>(null);
  const [payoutSafeId, setPayoutSafeId] = useState<string>(safes[0]?.id || 'safe-main');

  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Vouchers Management State
  const [voucherFilter, setVoucherFilter] = useState<'all' | 'in' | 'out'>('all');
  const [voucherSearch, setVoucherSearch] = useState('');
  const [editingVoucher, setEditingVoucher] = useState<FinancialTransaction | null>(null);
  const [printingVoucher, setPrintingVoucher] = useState<FinancialTransaction | null>(null);

  // Edit Voucher Modal Form State
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editNotes, setEditNotes] = useState('');
  const [editDate, setEditDate] = useState('');

  // New Voucher Modal Form State
  const [showNewVoucherModal, setShowNewVoucherModal] = useState(false);
  const [newVoucherDirection, setNewVoucherDirection] = useState<'in' | 'out'>('in');
  const [newVoucherPartyType, setNewVoucherPartyType] = useState<'customer' | 'supplier' | 'general'>('customer');
  const [newVoucherPartyId, setNewVoucherPartyId] = useState('');
  const [newVoucherPartyName, setNewVoucherPartyName] = useState('');
  const [newVoucherAmount, setNewVoucherAmount] = useState<number>(0);
  const [newVoucherNotes, setNewVoucherNotes] = useState('');

  // Safe Transfer State
  const [showSafeTransferModal, setShowSafeTransferModal] = useState(false);
  const [safeTransferFrom, setSafeTransferFrom] = useState(safes[0]?.id || 'safe-main');
  const [safeTransferTo, setSafeTransferTo] = useState(safes[1]?.id || 'safe-pos');
  const [safeTransferAmount, setSafeTransferAmount] = useState<number>(0);
  const [safeTransferNotes, setSafeTransferNotes] = useState('');
  const [safeTransferMsg, setSafeTransferMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Safe Add / Edit Modal State
  const [showSafeModal, setShowSafeModal] = useState(false);
  const [editingSafe, setEditingSafe] = useState<SafeAccount | null>(null);
  const [safeFormName, setSafeFormName] = useState('');
  const [safeFormType, setSafeFormType] = useState<SafeAccount['type']>('cash');
  const [safeFormBalance, setSafeFormBalance] = useState<number>(0);
  const [safeFormAccNum, setSafeFormAccNum] = useState('');
  const [safeFormNotes, setSafeFormNotes] = useState('');

  // Dropdown Menu State per Safe
  const [openSafeMenuId, setOpenSafeMenuId] = useState<string | null>(null);

  // Safe Deposit Modal State
  const [depositSafeModal, setDepositSafeModal] = useState<SafeAccount | null>(null);
  const [depositAmountVal, setDepositAmountVal] = useState<number>(0);
  const [depositTitleVal, setDepositTitleVal] = useState('');
  const [depositNotesVal, setDepositNotesVal] = useState('');

  // Safe Withdraw Modal State
  const [withdrawSafeModal, setWithdrawSafeModal] = useState<SafeAccount | null>(null);
  const [withdrawAmountVal, setWithdrawAmountVal] = useState<number>(0);
  const [withdrawTitleVal, setWithdrawTitleVal] = useState('');
  const [withdrawNotesVal, setWithdrawNotesVal] = useState('');

  // Safe Statement Modal State
  const [statementSafeModal, setStatementSafeModal] = useState<SafeAccount | null>(null);

  const openAddSafeModal = () => {
    setEditingSafe(null);
    setSafeFormName('');
    setSafeFormType('cash');
    setSafeFormBalance(0);
    setSafeFormAccNum('');
    setSafeFormNotes('');
    setShowSafeModal(true);
  };

  const openEditSafeModal = (safe: SafeAccount) => {
    setEditingSafe(safe);
    setSafeFormName(safe.name);
    setSafeFormType(safe.type);
    setSafeFormBalance(safe.balance);
    setSafeFormAccNum(safe.accountNumber || '');
    setSafeFormNotes(safe.notes || '');
    setShowSafeModal(true);
  };

  const handleSafeFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!safeFormName.trim()) return;

    if (editingSafe) {
      updateSafe(editingSafe.id, {
        name: safeFormName.trim(),
        type: safeFormType,
        balance: safeFormBalance,
        accountNumber: safeFormAccNum.trim(),
        notes: safeFormNotes.trim(),
      });
    } else {
      addSafe({
        name: safeFormName.trim(),
        type: safeFormType,
        balance: safeFormBalance,
        accountNumber: safeFormAccNum.trim(),
        notes: safeFormNotes.trim(),
      });
    }

    setShowSafeModal(false);
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositSafeModal || depositAmountVal <= 0) return;

    depositToSafe(
      depositSafeModal.id,
      depositAmountVal,
      depositTitleVal || `إيداع نقدي بالخزينة: ${depositSafeModal.name}`,
      depositNotesVal
    );

    setDepositSafeModal(null);
    setDepositAmountVal(0);
    setDepositTitleVal('');
    setDepositNotesVal('');
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawSafeModal || withdrawAmountVal <= 0) return;

    withdrawFromSafe(
      withdrawSafeModal.id,
      withdrawAmountVal,
      withdrawTitleVal || `سحب نقدي من الخزينة: ${withdrawSafeModal.name}`,
      withdrawNotesVal
    );

    setWithdrawSafeModal(null);
    setWithdrawAmountVal(0);
    setWithdrawTitleVal('');
    setWithdrawNotesVal('');
  };

  const handleSafeTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (safeTransferAmount <= 0) {
      setSafeTransferMsg({ type: 'error', text: 'يرجى إدخال مبلغ صحيح' });
      return;
    }
    const res = transferBetweenSafes(safeTransferFrom, safeTransferTo, safeTransferAmount, safeTransferNotes);
    if (res.success) {
      setSafeTransferMsg({ type: 'success', text: res.message });
      setTimeout(() => {
        setShowSafeTransferModal(false);
        setSafeTransferMsg(null);
        setSafeTransferAmount(0);
        setSafeTransferNotes('');
      }, 1500);
    } else {
      setSafeTransferMsg({ type: 'error', text: res.message });
    }
  };

  // Money Association Helper Handlers
  const openAddAssocModal = () => {
    setEditingAssoc(null);
    setAssocName('');
    setAssocOrganizer('');
    setAssocTotalAmount(0);
    setAssocMonthlyInstallment(0);
    setAssocTotalMonths(10);
    setAssocPaidMonths(0);
    setAssocPayoutTurnMonth(1);
    setAssocPayoutDate('');
    setAssocSafeId(safes[0]?.id || 'safe-main');
    setAssocNotes('');
    setShowAssocModal(true);
  };

  const openEditAssocModal = (assoc: MoneyAssociation) => {
    setEditingAssoc(assoc);
    setAssocName(assoc.name);
    setAssocOrganizer(assoc.organizer);
    setAssocTotalAmount(assoc.totalAmount);
    setAssocMonthlyInstallment(assoc.monthlyInstallment);
    setAssocTotalMonths(assoc.totalMonths);
    setAssocPaidMonths(assoc.paidMonths);
    setAssocPayoutTurnMonth(assoc.payoutTurnMonth);
    setAssocPayoutDate(assoc.payoutDate || '');
    setAssocSafeId(assoc.safeId || safes[0]?.id || 'safe-main');
    setAssocNotes(assoc.notes || '');
    setShowAssocModal(true);
  };

  const handleAssocFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assocName.trim() || assocTotalAmount <= 0 || assocMonthlyInstallment <= 0) return;

    if (editingAssoc) {
      updateAssociation(editingAssoc.id, {
        name: assocName.trim(),
        organizer: assocOrganizer.trim(),
        totalAmount: assocTotalAmount,
        monthlyInstallment: assocMonthlyInstallment,
        totalMonths: assocTotalMonths,
        paidMonths: assocPaidMonths,
        payoutTurnMonth: assocPayoutTurnMonth,
        payoutDate: assocPayoutDate,
        safeId: assocSafeId,
        notes: assocNotes.trim(),
      });
    } else {
      addAssociation({
        name: assocName.trim(),
        organizer: assocOrganizer.trim() || 'غير محدد',
        totalAmount: assocTotalAmount,
        monthlyInstallment: assocMonthlyInstallment,
        totalMonths: assocTotalMonths,
        paidMonths: assocPaidMonths,
        payoutTurnMonth: assocPayoutTurnMonth,
        payoutDate: assocPayoutDate,
        status: 'active',
        safeId: assocSafeId,
        startDate: new Date().toISOString().split('T')[0],
        notes: assocNotes.trim(),
      });
    }

    setShowAssocModal(false);
  };

  const handlePayInstallmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payInstallmentModal) return;

    const safeToUse = payInstallmentSafeId || payInstallmentModal.safeId || safes[0]?.id || 'safe-main';
    const nextPaidMonths = payInstallmentModal.paidMonths + 1;
    const isCompleted = nextPaidMonths >= payInstallmentModal.totalMonths && payInstallmentModal.status === 'payout_received';

    // Withdraw installment from selected safe
    withdrawFromSafe(
      safeToUse,
      payInstallmentModal.monthlyInstallment,
      `سداد قسط جمعية: ${payInstallmentModal.name}`,
      `قسط الشهر رقم (${nextPaidMonths}) للمنظم: ${payInstallmentModal.organizer}`
    );

    // Update association state via AppContext
    updateAssociation(payInstallmentModal.id, {
      paidMonths: nextPaidMonths,
      status: isCompleted ? 'completed' : payInstallmentModal.status,
    });

    setPayInstallmentModal(null);
  };

  const handleReceivePayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutModal) return;

    const safeToUse = payoutSafeId || payoutModal.safeId || safes[0]?.id || 'safe-main';

    // Deposit full association payout amount into selected safe
    depositToSafe(
      safeToUse,
      payoutModal.totalAmount,
      `استلام قبض جمعية: ${payoutModal.name}`,
      `استلام المبلغ الكامل بواسطة المنظم: ${payoutModal.organizer}`
    );

    // Update status to payout_received via AppContext
    updateAssociation(payoutModal.id, {
      status: 'payout_received',
    });

    setPayoutModal(null);
  };

  const handleDeleteAssoc = (assocId: string, assocName: string) => {
    if (window.confirm(`هل أنت متأكد من حذف الجمعية: ${assocName}؟`)) {
      deleteAssociation(assocId);
    }
  };


  // Filtered Vouchers List
  const filteredVouchers = useMemo(() => {
    return transactions.filter(tx => {
      // Filter by direction
      if (voucherFilter === 'in' && tx.direction !== 'in') return false;
      if (voucherFilter === 'out' && tx.direction !== 'out') return false;

      // Filter by search term
      if (voucherSearch.trim()) {
        const q = voucherSearch.trim().toLowerCase();
        const matchTitle = tx.title.toLowerCase().includes(q);
        const matchNotes = (tx.notes || '').toLowerCase().includes(q);
        const matchId = tx.id.toLowerCase().includes(q);
        const matchAmount = tx.amount.toString().includes(q);
        return matchTitle || matchNotes || matchId || matchAmount;
      }

      return true;
    });
  }, [transactions, voucherFilter, voucherSearch]);

  const openEditVoucher = (tx: FinancialTransaction) => {
    setEditingVoucher(tx);
    setEditTitle(tx.title);
    setEditAmount(tx.amount);
    setEditNotes(tx.notes || '');
    setEditDate(tx.date ? tx.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
  };

  const handleEditVoucherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVoucher || editAmount <= 0 || !editTitle.trim()) return;

    updateTransaction(editingVoucher.id, {
      title: editTitle.trim(),
      amount: editAmount,
      notes: editNotes.trim(),
      date: editDate ? new Date(editDate).toISOString() : editingVoucher.date,
    });

    setEditingVoucher(null);
  };

  const openNewVoucherModal = (direction: 'in' | 'out') => {
    setNewVoucherDirection(direction);
    setNewVoucherPartyType(direction === 'in' ? 'customer' : 'supplier');
    setNewVoucherPartyId('');
    setNewVoucherPartyName('');
    setNewVoucherAmount(0);
    setNewVoucherNotes('');
    setShowNewVoucherModal(true);
  };

  const handleCreateVoucherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newVoucherAmount <= 0) return;

    if (newVoucherDirection === 'in') {
      // Receipt Voucher (سند قبض)
      if (newVoucherPartyType === 'customer' && newVoucherPartyId) {
        collectCustomerDebt(newVoucherPartyId, newVoucherAmount, newVoucherNotes || 'سند قبض نقدية من حساب العميل');
      } else {
        const title = newVoucherPartyName.trim()
          ? `سند قبض نقدية من: ${newVoucherPartyName.trim()}`
          : 'سند قبض نقدية إيداع بالخزينة';
        addManualCashTransaction({
          title,
          amount: newVoucherAmount,
          direction: 'in',
          notes: newVoucherNotes,
        });
      }
    } else {
      // Payment Voucher (سند صرف)
      if (newVoucherPartyType === 'supplier' && newVoucherPartyId) {
        paySupplier(newVoucherPartyId, newVoucherAmount, newVoucherNotes || 'سند صرف نقدية لحساب المورد');
      } else {
        const title = newVoucherPartyName.trim()
          ? `سند صرف نقدية إلى: ${newVoucherPartyName.trim()}`
          : 'سند صرف نقدية مسحوبات من الخزينة';
        addManualCashTransaction({
          title,
          amount: newVoucherAmount,
          direction: 'out',
          notes: newVoucherNotes,
        });
      }
    }

    setShowNewVoucherModal(false);
  };

  // Daily Profit Analysis
  const dailyReports = useMemo(() => {
    const map: Record<
      string,
      {
        date: string;
        salesCount: number;
        salesRevenue: number;
        salesCost: number;
        purchasesTotal: number;
        expensesTotal: number;
      }
    > = {};

    // Process Sales
    salesInvoices.forEach(inv => {
      if (inv.status === 'cancelled') return;
      const dateKey = inv.date.split('T')[0];
      if (!map[dateKey]) {
        map[dateKey] = {
          date: dateKey,
          salesCount: 0,
          salesRevenue: 0,
          salesCost: 0,
          purchasesTotal: 0,
          expensesTotal: 0,
        };
      }
      map[dateKey].salesCount += 1;
      map[dateKey].salesRevenue += inv.total;
      const cost = inv.items.reduce((sum, item) => sum + ((item.purchaseCost || 0) * item.quantity), 0);
      map[dateKey].salesCost += cost;
    });

    // Process Purchases
    purchaseInvoices.forEach(inv => {
      const dateKey = inv.date.split('T')[0];
      if (!map[dateKey]) {
        map[dateKey] = {
          date: dateKey,
          salesCount: 0,
          salesRevenue: 0,
          salesCost: 0,
          purchasesTotal: 0,
          expensesTotal: 0,
        };
      }
      map[dateKey].purchasesTotal += inv.total;
    });

    // Process Expenses
    expenses.forEach(exp => {
      const dateKey = exp.date.split('T')[0];
      if (!map[dateKey]) {
        map[dateKey] = {
          date: dateKey,
          salesCount: 0,
          salesRevenue: 0,
          salesCost: 0,
          purchasesTotal: 0,
          expensesTotal: 0,
        };
      }
      map[dateKey].expensesTotal += exp.amount;
    });

    let list = Object.values(map).sort((a, b) => b.date.localeCompare(a.date));

    if (selectedMonth !== 'all') {
      list = list.filter(item => item.date.startsWith(selectedMonth));
    }

    return list;
  }, [salesInvoices, purchaseInvoices, expenses, selectedMonth]);

  // Monthly Profit Analysis
  const monthlyReports = useMemo(() => {
    const map: Record<
      string,
      {
        month: string;
        salesCount: number;
        salesRevenue: number;
        salesCost: number;
        purchasesTotal: number;
        expensesTotal: number;
      }
    > = {};

    salesInvoices.forEach(inv => {
      if (inv.status === 'cancelled') return;
      const monthKey = inv.date.substring(0, 7);
      if (!map[monthKey]) {
        map[monthKey] = {
          month: monthKey,
          salesCount: 0,
          salesRevenue: 0,
          salesCost: 0,
          purchasesTotal: 0,
          expensesTotal: 0,
        };
      }
      map[monthKey].salesCount += 1;
      map[monthKey].salesRevenue += inv.total;
      const cost = inv.items.reduce((sum, item) => sum + ((item.purchaseCost || 0) * item.quantity), 0);
      map[monthKey].salesCost += cost;
    });

    purchaseInvoices.forEach(inv => {
      const monthKey = inv.date.substring(0, 7);
      if (!map[monthKey]) {
        map[monthKey] = {
          month: monthKey,
          salesCount: 0,
          salesRevenue: 0,
          salesCost: 0,
          purchasesTotal: 0,
          expensesTotal: 0,
        };
      }
      map[monthKey].purchasesTotal += inv.total;
    });

    expenses.forEach(exp => {
      const monthKey = exp.date.substring(0, 7);
      if (!map[monthKey]) {
        map[monthKey] = {
          month: monthKey,
          salesCount: 0,
          salesRevenue: 0,
          salesCost: 0,
          purchasesTotal: 0,
          expensesTotal: 0,
        };
      }
      map[monthKey].expensesTotal += exp.amount;
    });

    return Object.values(map).sort((a, b) => b.month.localeCompare(a.month));
  }, [salesInvoices, purchaseInvoices, expenses]);

  // Available months for filtering
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    salesInvoices.forEach(inv => set.add(inv.date.substring(0, 7)));
    purchaseInvoices.forEach(inv => set.add(inv.date.substring(0, 7)));
    expenses.forEach(exp => set.add(exp.date.substring(0, 7)));
    return Array.from(set).sort().reverse();
  }, [salesInvoices, purchaseInvoices, expenses]);

  // New Expense Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<Expense['category']>('transport');
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseSafeId, setExpenseSafeId] = useState<string>(
    safes.find(s => s.isDefault)?.id || safes[0]?.id || 'safe-main'
  );
  const [expenseRecipient, setExpenseRecipient] = useState('');
  const [expenseDate, setExpenseDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [expenseNotes, setExpenseNotes] = useState('');

  // Manual Cash In/Out Modal
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashDirection, setCashDirection] = useState<'in' | 'out'>('in');
  const [cashTitle, setCashTitle] = useState('');
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [cashNotes, setCashNotes] = useState('');

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || expenseAmount <= 0) return;

    const targetSafeId = expenseSafeId || safes.find(s => s.isDefault)?.id || safes[0]?.id || 'safe-main';
    const isoDate = expenseDate
      ? new Date(`${expenseDate}T${new Date().toTimeString().slice(0, 8)}`).toISOString()
      : new Date().toISOString();

    addExpense({
      title: expenseTitle.trim(),
      category: expenseCategory,
      amount: expenseAmount,
      safeId: targetSafeId,
      recipient: expenseRecipient.trim() || undefined,
      date: isoDate,
      notes: expenseNotes.trim() || undefined,
    });

    setExpenseTitle('');
    setExpenseAmount(0);
    setExpenseRecipient('');
    setExpenseNotes('');
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setShowExpenseModal(false);
  };

  const handleCashSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashTitle.trim() || cashAmount <= 0) return;

    addManualCashTransaction({
      title: cashTitle.trim(),
      amount: cashAmount,
      direction: cashDirection,
      notes: cashNotes,
    });

    setCashTitle('');
    setCashAmount(0);
    setCashNotes('');
    setShowCashModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <BadgeDollarSign className="w-6 h-6 text-amber-700" />
            الحسابات المالية وحركة الخزينة
          </h2>
          <p className="text-xs text-slate-500">
            متابعة السيولة النقدية، المصروفات التشغيلية، وقائمة الأرباح والخسائر
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => openNewVoucherModal('in')}
            className="bg-amber-700 hover:bg-amber-600 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
          >
            <ArrowDownLeft className="w-4 h-4 text-amber-300" />
            <span>+ سند قبض</span>
          </button>
          <button
            onClick={() => openNewVoucherModal('out')}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
          >
            <ArrowUpRight className="w-4 h-4 text-amber-200" />
            <span>+ سند صرف</span>
          </button>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="bg-red-600 hover:bg-red-500 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>تسجيل مصروف</span>
          </button>
          <button
            onClick={() => setShowCashModal(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Wallet className="w-4 h-4 text-amber-400" />
            <span>حركة يدوية</span>
          </button>
        </div>
      </div>

      {/* Cash and Profit Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Physical Cash in Register */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-300 font-bold">الرصيد الفعلي بالخزينة</span>
            <div className="p-2 rounded-xl bg-slate-700/60 text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-amber-300">
            {metrics.cashBalance.toLocaleString()} {settings.currency}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            النقدية السائلة المتوفرة بالدرج الآن
          </p>
        </div>

        {/* Gross Profit on Goods */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-600 font-bold">مجمل ربح البضاعة المباعة</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {metrics.grossProfit.toLocaleString()} {settings.currency}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            فارق سعر البيع عن سعر الشراء
          </p>
        </div>

        {/* Total Expenses */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-600 font-bold">إجمالي المصروفات التشغيلية</span>
            <div className="p-2 rounded-xl bg-red-50 text-red-600">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-red-600">
            {metrics.totalExpenses.toLocaleString()} {settings.currency}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            إيجار، كهرباء، عمالة، نقل ونثريات
          </p>
        </div>

        {/* Net Profit */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">صافي أرباح النشاط</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <BadgeDollarSign className="w-5 h-5" />
            </div>
          </div>
          <div
            className={`text-2xl font-black font-mono ${
              metrics.netProfit >= 0 ? 'text-amber-700' : 'text-red-600'
            }`}
          >
            {metrics.netProfit.toLocaleString()} {settings.currency}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            مجمل الربح مخصوماً منه المصروفات
          </p>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('safes')}
          className={`py-2 px-4 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeSubTab === 'safes'
              ? 'bg-amber-600 text-white shadow-sm font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>الخزائن والمحافظ والتحويلات ({safes.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('associations')}
          className={`py-2 px-4 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeSubTab === 'associations'
              ? 'bg-amber-600 text-white shadow-sm font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4 text-amber-300" />
          <span>الجمعيات المالية والادخارية ({associations.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('vouchers')}
          className={`py-2 px-4 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeSubTab === 'vouchers'
              ? 'bg-amber-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>إدارة سندات القبض والصرف ({transactions.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`py-2 px-4 rounded-xl transition-all whitespace-nowrap ${
            activeSubTab === 'overview'
              ? 'bg-amber-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          قائمة الدخل والأرباح المبسطة
        </button>
        <button
          onClick={() => setActiveSubTab('profit_reports')}
          className={`py-2 px-4 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeSubTab === 'profit_reports'
              ? 'bg-amber-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>لوحة تقارير الأرباح اليومية والشهرية</span>
        </button>
        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`py-2 px-4 rounded-xl transition-all whitespace-nowrap ${
            activeSubTab === 'expenses'
              ? 'bg-amber-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          سجل المصروفات التشغيلية ({expenses.length})
        </button>
        <button
          onClick={() => setActiveSubTab('transactions')}
          className={`py-2 px-4 rounded-xl transition-all whitespace-nowrap ${
            activeSubTab === 'transactions'
              ? 'bg-amber-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          حركة الخزينة النقدية (كشف الوارد والصادر)
        </button>
        <button
          onClick={() => setActiveTab('statements')}
          className="py-2 px-4 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 font-bold mr-auto"
        >
          <FileText className="w-4 h-4 text-amber-600" />
          <span>كشوفات الحسابات التفصيلية 📋 ↗</span>
        </button>
      </div>

      {/* TAB: Safes & Accounts (الخزائن والمحافظ والتحويلات) */}
      {activeSubTab === 'safes' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Banner with Total Balances */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white p-6 rounded-2xl shadow-lg border-2 border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-amber-400 font-bold uppercase tracking-wider block mb-1">
                إجمالي السيولة والأصول النقدية الحالية
              </span>
              <div className="text-3xl font-black font-mono text-white flex items-center gap-2">
                <span>
                  {safes.reduce((sum, s) => sum + s.balance, 0).toLocaleString()}
                </span>
                <span className="text-base text-amber-300 font-sans font-bold">{settings.currency}</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                موزعة على {safes.length} خزائن ومحافظ بنكية وإلكترونية نشطة
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={openAddSafeModal}
                className="bg-amber-600 hover:bg-amber-500 text-white font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ إضافة خزينة / محفظة جديدة</span>
              </button>

              <button
                onClick={() => setShowSafeTransferModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>تحويل مالي بين الخزائن والمحافظ</span>
              </button>
              <button
                onClick={() => setActiveTab('statements')}
                className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all"
              >
                <FileText className="w-4 h-4 text-amber-300" />
                <span>كشف حساب تفصيلي</span>
              </button>
            </div>
          </div>

          {/* Individual Safes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {safes.map(safe => (
              <div
                key={safe.id}
                className="bg-white rounded-2xl p-5 border-2 border-slate-400 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-300">
                      {safe.type === 'pos' || (safe.type as string) === 'pos_drawer'
                        ? 'نقطة بيع كاشير'
                        : safe.type === 'bank'
                        ? 'حساب بنكي'
                        : safe.type === 'wallet'
                        ? 'محفظة إلكترونية'
                        : 'خزينة رئيسية'}
                    </span>
                    <Wallet className="w-5 h-5 text-amber-600" />
                  </div>
                  <h4 className="text-base font-black text-slate-900">{safe.name}</h4>
                  {safe.accountNumber && (
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5 font-bold">
                      رقم الحساب: {safe.accountNumber}
                    </div>
                  )}
                  <div className="text-2xl font-black font-mono text-amber-700 mt-3">
                    {safe.balance.toLocaleString()} {settings.currency}
                  </div>
                  <p className="text-xs text-slate-600 mt-2 line-clamp-2 font-medium">
                    {safe.notes || 'حساب نقدي مسجل بالنظام'}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t-2 border-slate-300 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500 font-bold">
                    آخر تدقيق: {new Date(safe.updatedAt || Date.now()).toLocaleDateString('ar-EG')}
                  </span>

                  {/* Options Button Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenSafeMenuId(openSafeMenuId === safe.id ? null : safe.id)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-sm transition-all"
                    >
                      <span>خيارات</span>
                      <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                    </button>

                    {openSafeMenuId === safe.id && (
                      <div className="absolute left-0 bottom-full mb-1 w-44 bg-white border-2 border-slate-400 rounded-xl shadow-2xl z-40 py-1 font-bold text-xs space-y-0.5">
                        <button
                          onClick={() => {
                            setOpenSafeMenuId(null);
                            openEditSafeModal(safe);
                          }}
                          className="w-full text-right px-3.5 py-2 hover:bg-slate-100 flex items-center gap-2 text-slate-800"
                        >
                          <Edit className="w-3.5 h-3.5 text-amber-600" />
                          <span>تعديل</span>
                        </button>

                        <button
                          onClick={() => {
                            setOpenSafeMenuId(null);
                            openStatement('safe', safe.id);
                          }}
                          className="w-full text-right px-3.5 py-2 hover:bg-slate-100 flex items-center gap-2 text-amber-900"
                        >
                          <Receipt className="w-3.5 h-3.5 text-amber-600" />
                          <span>كشف حساب</span>
                        </button>

                        <button
                          onClick={() => {
                            setOpenSafeMenuId(null);
                            setDepositSafeModal(safe);
                            setDepositTitleVal(`إيداع نقدي لحساب: ${safe.name}`);
                          }}
                          className="w-full text-right px-3.5 py-2 hover:bg-slate-100 flex items-center gap-2 text-amber-800"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5 text-amber-600" />
                          <span>إيداع</span>
                        </button>

                        <button
                          onClick={() => {
                            setOpenSafeMenuId(null);
                            setWithdrawSafeModal(safe);
                            setWithdrawTitleVal(`سحب نقدي من حساب: ${safe.name}`);
                          }}
                          className="w-full text-right px-3.5 py-2 hover:bg-slate-100 flex items-center gap-2 text-red-700"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5 text-red-600" />
                          <span>سحب</span>
                        </button>

                        <button
                          onClick={() => {
                            setOpenSafeMenuId(null);
                            setSafeTransferFrom(safe.id);
                            setShowSafeTransferModal(true);
                          }}
                          className="w-full text-right px-3.5 py-2 hover:bg-slate-100 flex items-center gap-2 text-purple-700"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 text-purple-600" />
                          <span>تحويل</span>
                        </button>

                        <div className="border-t border-slate-200 my-1"></div>

                        <button
                          onClick={() => {
                            setOpenSafeMenuId(null);
                            if (window.confirm(`هل أنت متأكد من حذف الخزينة ${safe.name}؟`)) {
                              deleteSafe(safe.id);
                            }
                          }}
                          className="w-full text-right px-3.5 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          <span>حذف</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Transfers History Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm">
                  سجل التحويلات والمناقلات المالية بين الخزائن والمحافظ
                </h3>
              </div>
              <span className="text-xs bg-white/10 px-2.5 py-1 rounded-lg font-mono font-bold">
                عدد التحويلات: {safeTransfers.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-black text-xs">
                    <th className="py-3 px-4">رقم التحويل</th>
                    <th className="py-3 px-4">التاريخ والوقت</th>
                    <th className="py-3 px-4">من الخزينة</th>
                    <th className="py-3 px-4">إلى الخزينة</th>
                    <th className="py-3 px-4">المبلغ المحول</th>
                    <th className="py-3 px-4">المسؤول</th>
                    <th className="py-3 px-4">البيان والملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {safeTransfers.map(st => (
                    <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{st.id}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {new Date(st.date).toLocaleDateString('ar-EG')}{' '}
                        <span className="text-[10px] text-slate-400">
                          {new Date(st.date).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-red-700">
                        [{st.fromSafeName}]
                      </td>
                      <td className="py-3 px-4 font-bold text-amber-700">
                        [{st.toSafeName}]
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-slate-900 text-sm">
                        {st.amount.toLocaleString()} {settings.currency}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{st.performedBy}</td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {st.notes || 'تحويل داخلي'}
                      </td>
                    </tr>
                  ))}

                  {safeTransfers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                        لم يتم تسجيل أي عمليات تحويل بين الخزائن حتى الآن. اضغط على "تحويل مالي بين الخزائن" للبدء.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Money Associations (الجمعيات المالية والادخارية) */}
      {activeSubTab === 'associations' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Top Banner & KPI Cards */}
          <div className="bg-gradient-to-r from-slate-950 via-amber-950 to-amber-950 text-white p-4 rounded-2xl shadow-lg border-2 border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-400" />
                إدارة الجمعيات المالية والدورات الادخارية
              </span>
              <div className="text-base sm:text-lg font-black text-white">
                متابعة الأقساط الشهرية، مواعيد القبض، وحركات السيولة المرتبطة
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                تتبع مسحوبات وإيداعات الجمعيات تلقائياً وتوثيق مبالغ السداد في خزائن المحل
              </p>
            </div>

            <button
              onClick={openAddAssocModal}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition-all active:scale-95 whitespace-nowrap border-2 border-amber-700"
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة جمعية جديدة</span>
            </button>
          </div>

          {/* KPI Summary Row (Compact & Darker Borders) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-3 border-2 border-slate-500 shadow-sm">
              <span className="text-[11px] font-black text-slate-700">إجمالي مبالغ الجمعيات النشطة</span>
              <div className="text-base sm:text-lg font-black font-mono text-slate-900 mt-0.5">
                {associations
                  .filter(a => a.status === 'active')
                  .reduce((sum, a) => sum + a.totalAmount, 0)
                  .toLocaleString()} {settings.currency}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 font-bold">مجمعة في {associations.filter(a => a.status === 'active').length} جمعيات جارية</p>
            </div>

            <div className="bg-white rounded-xl p-3 border-2 border-slate-500 shadow-sm">
              <span className="text-[11px] font-black text-slate-700">الأقساط الشهرية الملتزم بها</span>
              <div className="text-base sm:text-lg font-black font-mono text-red-600 mt-0.5">
                {associations
                  .filter(a => a.status === 'active')
                  .reduce((sum, a) => sum + a.monthlyInstallment, 0)
                  .toLocaleString()} {settings.currency} / شهرياً
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 font-bold">خصم شهري مباشر من الخزينة</p>
            </div>

            <div className="bg-white rounded-xl p-3 border-2 border-slate-500 shadow-sm">
              <span className="text-[11px] font-black text-slate-700">إجمالي الأقساط المدفوعة حتى الآن</span>
              <div className="text-base sm:text-lg font-black font-mono text-amber-700 mt-0.5">
                {associations
                  .reduce((sum, a) => sum + (a.paidMonths * a.monthlyInstallment), 0)
                  .toLocaleString()} {settings.currency}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 font-bold">تأكيد السداد والتدفق</p>
            </div>

            <div className="bg-white rounded-xl p-3 border-2 border-slate-500 shadow-sm">
              <span className="text-[11px] font-black text-slate-700">جمعيات تم قبضها وإيداعها</span>
              <div className="text-base sm:text-lg font-black font-mono text-amber-600 mt-0.5">
                {associations.filter(a => a.status === 'payout_received' || a.status === 'completed').length} جمعية
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 font-bold">تم إيداعها بالحسابات والسيولة</p>
            </div>
          </div>

          {/* Associations Grid Cards (Compact 3-Column Layout & Darker Borders) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {associations.map(assoc => {
              const progressPercent = Math.min(100, Math.round((assoc.paidMonths / assoc.totalMonths) * 100));
              const safeName = safes.find(s => s.id === assoc.safeId)?.name || 'الخزينة الرئيسية';
              const isPayoutReady = assoc.paidMonths >= assoc.payoutTurnMonth && assoc.status === 'active';

              return (
                <div
                  key={assoc.id}
                  className="bg-white rounded-xl p-3.5 border-2 border-slate-500 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Title & Status Badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-500 block truncate">
                          المنظم: {assoc.organizer}
                        </span>
                        <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">{assoc.name}</h3>
                      </div>

                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-black whitespace-nowrap shrink-0 border-2 ${
                          assoc.status === 'completed'
                            ? 'bg-slate-100 text-slate-800 border-slate-500'
                            : assoc.status === 'payout_received'
                            ? 'bg-amber-100 text-slate-800 border-amber-500'
                            : isPayoutReady
                            ? 'bg-amber-100 text-amber-900 border-amber-500 animate-pulse'
                            : 'bg-amber-100 text-slate-800 border-amber-500'
                        }`}
                      >
                        {assoc.status === 'completed'
                          ? 'مكتملة بالكامل'
                          : assoc.status === 'payout_received'
                          ? 'تم قبض المبلغ'
                          : isPayoutReady
                          ? 'جاهزة للاستلام 🎯'
                          : 'نشطة ويسدد قسطها'}
                      </span>
                    </div>

                    {/* Financial Amounts Summary */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-xl border-2 border-slate-400 mb-2.5 text-center">
                      <div>
                        <span className="text-[10px] font-bold text-slate-600 block">إجمالي الجمعية</span>
                        <span className="text-sm sm:text-base font-black font-mono text-slate-900">
                          {assoc.totalAmount.toLocaleString()} {settings.currency}
                        </span>
                      </div>
                      <div className="border-r-2 border-slate-300">
                        <span className="text-[10px] font-bold text-slate-600 block">القسط الشهري</span>
                        <span className="text-sm sm:text-base font-black font-mono text-red-600">
                          {assoc.monthlyInstallment.toLocaleString()} {settings.currency}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Details */}
                    <div className="space-y-1.5 mb-2.5">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-800">الأقساط المسددة: {assoc.paidMonths} من {assoc.totalMonths} شهور</span>
                        <span className="text-amber-700 font-mono font-black">{progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-500">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            assoc.status === 'completed'
                              ? 'bg-slate-600'
                              : assoc.status === 'payout_received'
                              ? 'bg-amber-600'
                              : 'bg-gradient-to-r from-amber-500 to-amber-600'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 pt-0.5">
                        <span>دور القبض: الشهر ({assoc.payoutTurnMonth})</span>
                        {assoc.payoutDate && <span>التاريخ: {assoc.payoutDate}</span>}
                      </div>

                      <div className="text-[11px] text-slate-700 font-bold bg-slate-50/80 px-2.5 py-1.5 rounded-lg border-2 border-slate-400 flex items-center justify-between">
                        <span>الخزينة المرتبطة:</span>
                        <span className="text-slate-900 font-black truncate max-w-[150px]">{safeName}</span>
                      </div>

                      {assoc.notes && (
                        <p className="text-[11px] text-slate-600 font-medium italic truncate">
                          ملاحظات: {assoc.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2.5 border-t-2 border-slate-400 flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Pay Installment Button */}
                      <button
                        onClick={() => {
                          setPayInstallmentModal(assoc);
                          setPayInstallmentSafeId(assoc.safeId || safes[0]?.id || 'safe-main');
                        }}
                        disabled={assoc.paidMonths >= assoc.totalMonths}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all border ${
                          assoc.paidMonths >= assoc.totalMonths
                            ? 'bg-slate-100 text-slate-400 border-slate-400 cursor-not-allowed'
                            : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-800 shadow-xs active:scale-95'
                        }`}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 text-amber-200" />
                        <span>سداد قسط</span>
                      </button>

                      {/* Receive Payout Button */}
                      {assoc.status === 'active' && (
                        <button
                          onClick={() => {
                            setPayoutModal(assoc);
                            setPayoutSafeId(assoc.safeId || safes[0]?.id || 'safe-main');
                          }}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 shadow-xs transition-all active:scale-95 border border-amber-700"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          <span>استلام القبض</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditAssocModal(assoc)}
                        className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg border-2 border-slate-400 transition-colors"
                        title="تعديل"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAssoc(assoc.id, assoc.name)}
                        className="p-1.5 text-red-700 hover:bg-red-50 rounded-lg border-2 border-slate-400 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {associations.length === 0 && (
              <div className="col-span-full bg-white p-8 text-center rounded-2xl border-2 border-slate-500">
                <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h4 className="font-extrabold text-slate-800 text-sm">لا توجد جمعيات مالية مسجلة بالنظام</h4>
                <p className="text-xs text-slate-500 mt-1 mb-3">قم بإضافة أول جمعية لمتابعة الأقساط والقبض مع باقي الأعضاء والمنظمين</p>
                <button
                  onClick={openAddAssocModal}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs inline-flex items-center gap-2 border-2 border-amber-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ إضافة جمعية جديدة</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 0: Vouchers Management (إدارة سندات القبض والصرف) */}
      {activeSubTab === 'vouchers' && (
        <div className="space-y-4">
          {/* Top Filter and Actions Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setVoucherFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    voucherFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  الكل ({transactions.length})
                </button>
                <button
                  onClick={() => setVoucherFilter('in')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                    voucherFilter === 'in'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-amber-700'
                  }`}
                >
                  <span>سندات قبض</span>
                  <span className="text-[10px] bg-amber-700/50 px-1.5 rounded-full">
                    {transactions.filter(t => t.direction === 'in').length}
                  </span>
                </button>
                <button
                  onClick={() => setVoucherFilter('out')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                    voucherFilter === 'out'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-red-700'
                  }`}
                >
                  <span>سندات صرف</span>
                  <span className="text-[10px] bg-red-700/50 px-1.5 rounded-full">
                    {transactions.filter(t => t.direction === 'out').length}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث باسم العميل، المورد، رقم السند..."
                  value={voucherSearch}
                  onChange={e => setVoucherSearch(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-semibold"
                />
              </div>

              <button
                onClick={() => openNewVoucherModal('in')}
                className="bg-amber-700 hover:bg-amber-600 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 shadow-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>سند قبض</span>
              </button>

              <button
                onClick={() => openNewVoucherModal('out')}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 shadow-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>سند صرف</span>
              </button>
            </div>
          </div>

          {/* Vouchers List Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="bg-slate-900 text-slate-100 border-b border-slate-800 font-bold text-xs sm:text-sm">
                    <th className="py-3.5 px-4">نوع السند</th>
                    <th className="py-3.5 px-4">رقم وتاريخ السند</th>
                    <th className="py-3.5 px-4">الجهة / البيان</th>
                    <th className="py-3.5 px-4">المبلغ</th>
                    <th className="py-3.5 px-4">ملاحظات</th>
                    <th className="py-3.5 px-4 text-center">العمليات والتحكم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVouchers.map(tx => {
                    const isIn = tx.direction === 'in';
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isIn
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}
                          >
                            {isIn ? (
                              <ArrowDownLeft className="w-3.5 h-3.5 text-amber-600" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5 text-red-600" />
                            )}
                            <span>{isIn ? 'سند قبض نقدية' : 'سند صرف نقدية'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-800">{tx.id}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {new Date(tx.date).toLocaleDateString('ar-EG')}{' '}
                            {new Date(tx.date).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{tx.title}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-mono font-black text-sm ${
                              isIn ? 'text-amber-700' : 'text-red-600'
                            }`}
                          >
                            {tx.amount.toLocaleString()} {settings.currency}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {tx.notes || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setPrintingVoucher(tx)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                              title="طباعة السند"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditVoucher(tx)}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-all"
                              title="تعديل السند"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `هل أنت متأكد من حذف ${
                                      isIn ? 'سند القبض' : 'سند الصرف'
                                    } هذا؟ سيتم تعديل رصيد العميل/المورد تلقائياً إذا كان مرتبطاً بحساب.`
                                  )
                                ) {
                                  deleteTransaction(tx.id);
                                }
                              }}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all"
                              title="حذف السند"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredVouchers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="font-bold">لا توجد سندات قبض أو صرف مطابقة للبحث</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: Income Statement */}
      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income Statement Breakdown */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm pb-2 border-b border-slate-100">
              قائمة الدخل التقديرية للفترة
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="font-bold text-slate-700">إجمالي إيراد المبيعات (Sales Revenue):</span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  {metrics.totalSalesRevenue.toLocaleString()} {settings.currency}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100 text-red-700">
                <span className="font-semibold">(-) تكلفة البضاعة المباعة (Cost of Goods Sold):</span>
                <span className="font-mono font-bold">
                  -{metrics.totalSalesCost.toLocaleString()} {settings.currency}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 bg-amber-50 px-3 rounded-xl border border-amber-200 text-slate-900 font-bold">
                <span>(=) مجمل الربح التجاري (Gross Profit):</span>
                <span className="font-mono font-black text-base text-amber-800">
                  {metrics.grossProfit.toLocaleString()} {settings.currency}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100 text-red-700">
                <span className="font-semibold">(-) إجمالي مصروفات التشغيل (Expenses):</span>
                <span className="font-mono font-bold">
                  -{metrics.totalExpenses.toLocaleString()} {settings.currency}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 bg-slate-900 text-white px-4 rounded-xl font-bold">
                <span className="text-sm font-extrabold">(=) صافي الربح الفعلي (Net Profit):</span>
                <span className="font-mono font-black text-lg text-amber-400">
                  {metrics.netProfit.toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>
          </div>

          {/* Balance Sheet Highlights */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm pb-2 border-b border-slate-100">
              مؤشرات الأصول والالتزامات المالية
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <div>
                  <span className="font-bold text-slate-800 block">قيمة بضاعة المخزن (بسعر الشراء):</span>
                  <span className="text-[10px] text-slate-400">قيمة الأسلاك والكابلات والمستلزمات المخزنة فعلياً</span>
                </div>
                <span className="font-mono font-bold text-slate-900">
                  {metrics.inventoryCostValue.toLocaleString()} {settings.currency}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <div>
                  <span className="font-bold text-slate-800 block">قيمة بضاعة المخزن (بسعر البيع المتوقع):</span>
                  <span className="text-[10px] text-slate-400">القيمة السوقية للبضاعة عند اكتمال بيعها</span>
                </div>
                <span className="font-mono font-bold text-amber-700">
                  {metrics.inventoryRetailValue.toLocaleString()} {settings.currency}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <div>
                  <span className="font-bold text-slate-800 block">ديون العملاء في السوق (Receivables):</span>
                  <span className="text-[10px] text-slate-400">مبالغ مؤجلة على المزارعين لحين الحصاد</span>
                </div>
                <span className="font-mono font-bold text-amber-700">
                  {metrics.customerDebts.toLocaleString()} {settings.currency}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <div>
                  <span className="font-bold text-slate-800 block">مستحقات الشركات والموزعين (Payables):</span>
                  <span className="text-[10px] text-slate-400">فواتير توريد بضاعة لم تسدد بعد</span>
                </div>
                <span className="font-mono font-bold text-purple-700">
                  {metrics.supplierPayables.toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Profit Reports Dashboard (لوحة تقارير الأرباح اليومية والشهرية) */}
      {activeSubTab === 'profit_reports' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Top Filter & Print Action Bar */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-700" />
              <h3 className="font-extrabold text-slate-900 text-sm">
                لوحة تقارير تحليل الأرباح اليومية والشهرية
              </h3>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-slate-600">تصفية حسب الشهر:</span>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="bg-transparent font-extrabold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">كل الشهور المستخرجة ({availableMonths.length})</option>
                  {availableMonths.map(m => (
                    <option key={m} value={m}>
                      شهر {m}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => window.print()}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة التقرير</span>
              </button>
            </div>
          </div>

          {/* Section 1: Monthly Profits Report Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-amber-400" />
                <h4 className="font-black text-sm">
                  1. تقرير الأرباح الشهرية التراكمية (من واقع جداول المبيعات والمشتريات)
                </h4>
              </div>
              <span className="text-xs bg-amber-500/20 text-amber-300 font-mono font-bold px-2.5 py-1 rounded-lg border border-amber-500/30">
                إجمالي الشهور: {monthlyReports.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="bg-slate-900 text-slate-100 border-b border-slate-800 font-bold text-xs sm:text-sm">
                    <th className="py-3.5 px-4">الشهر (YYYY-MM)</th>
                    <th className="py-3.5 px-4">عدد المبيعات</th>
                    <th className="py-3.5 px-4">إجمالي المبيعات</th>
                    <th className="py-3.5 px-4">تكلفة البضاعة (COGS)</th>
                    <th className="py-3.5 px-4">إجمالي المشتريات</th>
                    <th className="py-3.5 px-4">مجمل الربح</th>
                    <th className="py-3.5 px-4">المصروفات</th>
                    <th className="py-3.5 px-4">صافي الربح الشهري</th>
                    <th className="py-3.5 px-4 text-center">هامش الربح</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyReports.map(item => {
                    const gross = item.salesRevenue - item.salesCost;
                    const net = gross - item.expensesTotal;
                    const margin =
                      item.salesRevenue > 0 ? ((net / item.salesRevenue) * 100).toFixed(1) : '0';
                    const isProfitable = net >= 0;

                    return (
                      <tr key={item.month} className="hover:bg-slate-50 transition-colors font-medium">
                        <td className="py-3.5 px-4 font-mono font-extrabold text-slate-900 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-amber-600" />
                          <span>{item.month}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                          {item.salesCount} فاتورة
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-slate-900">
                          {item.salesRevenue.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {item.salesCost.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-purple-700 font-bold">
                          {item.purchasesTotal.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-700">
                          {gross.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-red-600 font-bold">
                          {item.expensesTotal.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-mono font-black px-2.5 py-1 rounded-lg text-xs inline-block ${
                              isProfitable
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}
                          >
                            {isProfitable ? '+' : ''}
                            {net.toLocaleString()} {settings.currency}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                              Number(margin) >= 15
                                ? 'bg-amber-50 text-amber-700'
                                : Number(margin) > 0
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {margin}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {monthlyReports.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                        لا توجد بيانات شهرية مستخرجة في الوقت الحالي
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Daily Profits Report Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-300" />
                <h4 className="font-black text-sm">
                  2. تقرير الأرباح اليومية التفصيلي (اليوم بيومه)
                </h4>
              </div>
              <span className="text-xs bg-white/20 text-white font-mono font-bold px-2.5 py-1 rounded-lg">
                الأيام المعروضة: {dailyReports.length} يوم
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-900 text-slate-100 font-bold border-b border-slate-800">
                    <th className="py-3 px-4">التاريخ (اليوم)</th>
                    <th className="py-3 px-4">المبيعات</th>
                    <th className="py-3 px-4">إجمالي الإيراد</th>
                    <th className="py-3 px-4">تكلفة البضاعة</th>
                    <th className="py-3 px-4">المشتريات اليومية</th>
                    <th className="py-3 px-4">مجمل الربح اليومي</th>
                    <th className="py-3 px-4">المصروفات اليومية</th>
                    <th className="py-3 px-4">صافي الربح اليومي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyReports.map(item => {
                    const gross = item.salesRevenue - item.salesCost;
                    const net = gross - item.expensesTotal;
                    const isProfitable = net >= 0;

                    return (
                      <tr key={item.date} className="hover:bg-slate-50 transition-colors font-medium">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 text-sm">
                          {item.date}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700 text-sm">
                          {item.salesCount} عمليات
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-slate-900 text-sm sm:text-base">
                          {item.salesRevenue.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 font-bold text-xs sm:text-sm">
                          {item.salesCost.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-purple-700 text-sm">
                          {item.purchasesTotal > 0
                            ? `${item.purchasesTotal.toLocaleString()} ${settings.currency}`
                            : '—'}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-amber-700 text-sm sm:text-base">
                          {gross.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-red-600 text-sm">
                          {item.expensesTotal > 0
                            ? `-${item.expensesTotal.toLocaleString()} ${settings.currency}`
                            : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-mono font-black px-2.5 py-1 rounded-lg text-xs sm:text-sm ${
                              isProfitable
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {isProfitable ? '+' : ''}
                            {net.toLocaleString()} {settings.currency}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {dailyReports.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                        لا توجد حركات أرباح يومية مسجلة للفترة المحددة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Expenses Table */}
      {activeSubTab === 'expenses' && (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-400 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-900 text-slate-100 font-bold border-b border-slate-800">
                  <th className="py-3 px-4">بند المصروف</th>
                  <th className="py-3 px-4">التصنيف</th>
                  <th className="py-3 px-4">الحساب المسدد منه</th>
                  <th className="py-3 px-4">المستلم</th>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4">المبلغ</th>
                  <th className="py-3 px-4">ملاحظات</th>
                  <th className="py-3 px-4 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {expenses.map(exp => {
                  const expSafe = safes.find(s => s.id === exp.safeId);
                  return (
                    <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">{exp.title}</td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium text-xs sm:text-sm">
                        <span className="bg-slate-100 text-slate-800 border border-slate-300 px-2.5 py-0.5 rounded-lg font-bold text-xs">
                          {EXPENSE_CATEGORIES[exp.category]}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-black text-xs sm:text-sm">
                        {expSafe ? expSafe.name : 'الخزينة الرئيسية'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-bold text-xs sm:text-sm">
                        {exp.recipient || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-xs sm:text-sm">
                        {new Date(exp.date).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black text-red-600 text-sm sm:text-base">
                        {exp.amount.toLocaleString()} {settings.currency}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs sm:text-sm">{exp.notes || '—'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => {
                            if (window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
                              deleteExpense(exp.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                      لا توجد مصروفات مسجلة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Transactions Log */}
      {activeSubTab === 'transactions' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-900 text-slate-100 font-bold border-b border-slate-800">
                  <th className="py-3 px-4">الحركة</th>
                  <th className="py-3 px-4">النوع</th>
                  <th className="py-3 px-4">التاريخ والوقت</th>
                  <th className="py-3 px-4">وارد الخزينة (+)</th>
                  <th className="py-3 px-4">صادر الخزينة (-)</th>
                  <th className="py-3 px-4">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map(tx => {
                  const isIn = tx.direction === 'in';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2 text-sm">
                        {isIn ? (
                          <ArrowDownLeft className="w-4 h-4 text-amber-600" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-red-600" />
                        )}
                        <span>{tx.title}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium text-xs sm:text-sm">
                        {tx.type === 'sale_income'
                          ? 'مبيعات نقدية'
                          : tx.type === 'debt_collection'
                          ? 'تحصيل من عميل'
                          : tx.type === 'purchase_expense'
                          ? 'سداد بضاعة مورد'
                          : tx.type === 'supplier_payment'
                          ? 'دفعة مورد'
                          : tx.type === 'capital_deposit'
                          ? 'إيداع نقدي'
                          : 'مصروفات تشغيل'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 text-xs sm:text-sm">
                        {new Date(tx.date).toLocaleDateString('ar-EG')}{' '}
                        <span className="text-xs text-slate-400">
                          {new Date(tx.date).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black text-amber-700 text-sm sm:text-base">
                        {isIn ? `+${tx.amount.toLocaleString()} ${settings.currency}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black text-red-600 text-sm sm:text-base">
                        {!isIn ? `-${tx.amount.toLocaleString()} ${settings.currency}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs sm:text-sm">{tx.notes || '—'}</td>
                    </tr>
                  );
                })}

                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      لا توجد حركات مسجلة بالخزينة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Expense Modal (Professional Design with Darker Borders & Paid From Account) */}
      {showExpenseModal && (() => {
        const selectedExpenseSafe = safes.find(s => s.id === expenseSafeId) || safes[0];
        const safeCurrentBalance = selectedExpenseSafe?.balance || 0;
        const safeBalanceAfter = safeCurrentBalance - (expenseAmount || 0);

        return (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
            <div
              className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border-2 border-slate-500 text-xs max-h-[92vh] overflow-y-auto font-sans text-right select-none"
              dir="rtl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3.5 border-b-2 border-slate-300 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shrink-0">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base sm:text-lg">
                      تسجيل مصروف تشغيلي جديد
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                      توثيق المصروفات التشغيلية وخصمها المباشر من الحساب المسدد منه
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border-2 border-slate-400 flex items-center justify-center transition-colors"
                  title="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                {/* 1. بند المصروف + اختصارات سريعة */}
                <div>
                  <label className="font-black text-slate-800 text-xs block mb-1.5">
                    بند المصروف (البيان التفصيلي) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: فاتورة كهرباء المعرض، إيجار المخزن، مشال وتحميل بضاعة..."
                    value={expenseTitle}
                    onChange={e => setExpenseTitle(e.target.value)}
                    className="w-full py-2.5 px-3.5 bg-slate-50/70 focus:bg-white border-2 border-slate-500 focus:border-slate-900 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:outline-none font-black text-slate-900 text-xs sm:text-sm transition-all"
                  />
                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    <span className="text-[10px] font-bold text-slate-500 ml-1">بنود سريعة:</span>
                    {[
                      { label: 'نقل ومشال بضاعة', cat: 'transport' as const },
                      { label: 'فاتورة كهرباء ومياه', cat: 'utilities' as const },
                      { label: 'إيجار المعرض / المخزن', cat: 'rent' as const },
                      { label: 'رواتب ويوميات عمال', cat: 'salaries' as const },
                      { label: 'ضيافة وبوفيه', cat: 'hospitality' as const },
                      { label: 'صيانة وإصلاحات', cat: 'maintenance' as const },
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setExpenseTitle(preset.label);
                          setExpenseCategory(preset.cat);
                        }}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-400 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. الحساب المسدد منه (الخزينة / المحفظة / البنك) */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-400 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-rose-600" />
                      <span>الحساب المسدد منه (الخزينة / المحفظة) *</span>
                    </label>
                    <span className="text-[11px] font-bold text-slate-500">
                      سيتم خصم المبلغ مباشرة من هذا الحساب
                    </span>
                  </div>

                  <select
                    value={expenseSafeId}
                    onChange={e => setExpenseSafeId(e.target.value)}
                    className="w-full py-2.5 px-3.5 bg-white border-2 border-slate-500 focus:border-slate-900 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:outline-none font-black text-slate-900 text-xs sm:text-sm transition-all"
                  >
                    {safes.map(s => {
                      const typeLabel =
                        s.type === 'bank'
                          ? 'حساب بنكي'
                          : s.type === 'wallet'
                          ? 'محفظة إلكترونية'
                          : s.type === 'pos_drawer' || s.type === 'pos'
                          ? 'درج كاشير'
                          : 'خزينة نقدية';
                      return (
                        <option key={s.id} value={s.id}>
                          [{typeLabel}] {s.name} — (الرصيد المتاح: {s.balance.toLocaleString()} {settings.currency})
                        </option>
                      );
                    })}
                  </select>

                  {/* Live Safe Balance Preview */}
                  {selectedExpenseSafe && (
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                      <div className="bg-white p-2 rounded-xl border-2 border-slate-400">
                        <span className="text-[10px] font-bold text-slate-500 block">الرصيد الحالي بالحساب</span>
                        <span className="text-xs sm:text-sm font-black font-mono text-slate-900">
                          {safeCurrentBalance.toLocaleString()} {settings.currency}
                        </span>
                      </div>
                      <div className="bg-rose-50 p-2 rounded-xl border-2 border-rose-400">
                        <span className="text-[10px] font-bold text-rose-700 block">المبلغ المراد خصمه</span>
                        <span className="text-xs sm:text-sm font-black font-mono text-rose-700">
                          -{(expenseAmount || 0).toLocaleString()} {settings.currency}
                        </span>
                      </div>
                      <div
                        className={`p-2 rounded-xl border-2 ${
                          safeBalanceAfter >= 0
                            ? 'bg-amber-50 border-amber-500 text-slate-800'
                            : 'bg-amber-50 border-amber-500 text-amber-900'
                        }`}
                      >
                        <span className="text-[10px] font-bold block">الرصيد بعد الصرف</span>
                        <span className="text-xs sm:text-sm font-black font-mono">
                          {safeBalanceAfter.toLocaleString()} {settings.currency}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. التصنيف & تاريخ الصرف */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-black text-slate-800 text-xs block mb-1.5">
                      تصنيف المصروف <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={expenseCategory}
                      onChange={e => setExpenseCategory(e.target.value as Expense['category'])}
                      className="w-full py-2.5 px-3 bg-slate-50/70 focus:bg-white border-2 border-slate-500 focus:border-slate-900 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:outline-none font-black text-slate-900 text-xs sm:text-sm transition-all"
                    >
                      {Object.entries(EXPENSE_CATEGORIES).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-black text-slate-800 text-xs block mb-1.5">
                      تاريخ الصرف
                    </label>
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={e => setExpenseDate(e.target.value)}
                      className="w-full py-2.5 px-3 bg-slate-50/70 focus:bg-white border-2 border-slate-500 focus:border-slate-900 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:outline-none font-mono font-black text-slate-900 text-xs sm:text-sm text-center transition-all"
                    />
                  </div>
                </div>

                {/* 4. المبلغ المصروف & اسم المستلم */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-black text-slate-800 text-xs block mb-1.5">
                      المبلغ المصروف ({settings.currency}) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      required
                      value={expenseAmount || ''}
                      onChange={e => setExpenseAmount(Number(e.target.value))}
                      className="w-full py-2.5 px-3 bg-rose-50/50 focus:bg-white border-2 border-slate-500 focus:border-rose-700 rounded-xl font-mono font-black text-base text-rose-700 text-center focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="font-black text-slate-800 text-xs block mb-1.5">
                      اسم المستلم / الجهة المستفيدة
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: شركة الشحن / محصل الكهرباء..."
                      value={expenseRecipient}
                      onChange={e => setExpenseRecipient(e.target.value)}
                      className="w-full py-2.5 px-3 bg-slate-50/70 focus:bg-white border-2 border-slate-500 focus:border-slate-900 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:outline-none font-bold text-slate-900 text-xs sm:text-sm transition-all"
                    />
                  </div>
                </div>

                {/* 5. ملاحظات / رقم الإيصال */}
                <div>
                  <label className="font-black text-slate-800 text-xs block mb-1.5">
                    ملاحظات إضافية / رقم الإيصال أو الفاتورة
                  </label>
                  <input
                    type="text"
                    placeholder="رقم الفاتورة أو تفاصيل إضافية عن المصروف..."
                    value={expenseNotes}
                    onChange={e => setExpenseNotes(e.target.value)}
                    className="w-full py-2.5 px-3.5 bg-slate-50/70 focus:bg-white border-2 border-slate-500 focus:border-slate-900 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:outline-none font-bold text-slate-900 text-xs sm:text-sm transition-all"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5 pt-3 border-t-2 border-slate-300">
                  <button
                    type="submit"
                    className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black py-3 px-4 rounded-xl shadow-lg transition-all active:scale-95 text-xs sm:text-sm border-2 border-rose-800 flex items-center justify-center gap-2"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>تأكيد خصم المصروف من {selectedExpenseSafe?.name || 'الخزينة'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowExpenseModal(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-black py-3 px-5 rounded-xl border-2 border-slate-500 transition-colors text-xs sm:text-sm"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Manual Cash In/Out Modal */}
      {showCashModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-black text-slate-900 text-base">تسجيل حركة نقدية يدوية بالخزينة</h3>
              <button
                onClick={() => setShowCashModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCashSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCashDirection('in')}
                  className={`py-2 rounded-xl font-bold transition-all ${
                    cashDirection === 'in'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  + إيداع نقدية بالدرج
                </button>
                <button
                  type="button"
                  onClick={() => setCashDirection('out')}
                  className={`py-2 rounded-xl font-bold transition-all ${
                    cashDirection === 'out'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  - سحب نقدية من الدرج
                </button>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">بيان الحركة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: إيداع رأس مال تشغيلي أو مسحوبات المالك"
                  value={cashTitle}
                  onChange={e => setCashTitle(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">المبلغ *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={cashAmount || ''}
                  onChange={e => setCashAmount(Number(e.target.value))}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl font-mono font-bold text-base focus:ring-2 focus:ring-amber-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ملاحظات إضافية</label>
                <input
                  type="text"
                  placeholder="اختياري..."
                  value={cashNotes}
                  onChange={e => setCashNotes(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl shadow-md transition-all"
                >
                  تنفيذ الحركة وتحديث الخزينة
                </button>
                <button
                  type="button"
                  onClick={() => setShowCashModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Voucher Modal (سند قبض / صرف جديد) */}
      <VoucherModal
        isOpen={showNewVoucherModal}
        onClose={() => setShowNewVoucherModal(false)}
        direction={newVoucherDirection}
        defaultPartyType={newVoucherPartyType}
        defaultPartyId={newVoucherPartyId}
        defaultAmount={newVoucherAmount}
        defaultNotes={newVoucherNotes}
        onSuccess={() => {
          setShowNewVoucherModal(false);
          setNewVoucherPartyId('');
          setNewVoucherPartyName('');
          setNewVoucherAmount(0);
          setNewVoucherNotes('');
        }}
      />

      {/* Edit Voucher Modal */}
      {editingVoucher && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-600" />
                <span>تعديل السند ({editingVoucher.id})</span>
              </h3>
              <button
                onClick={() => setEditingVoucher(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditVoucherSubmit} className="space-y-3.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">البيان / عنوان السند *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">مبلغ السند *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editAmount || ''}
                  onChange={e => setEditAmount(Number(e.target.value))}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl font-mono font-black text-base text-amber-700 focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  تنبيه: تعديل قيمة السند سيقوم بتحديث رصيد العميل/المورد تلقائياً بالفرق.
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">تاريخ السند</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ملاحظات إضافية</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-amber-700 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl shadow-md transition-all"
                >
                  حفظ التعديلات وتحديث البيانات
                </button>
                <button
                  type="button"
                  onClick={() => setEditingVoucher(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Voucher Modal */}
      {printingVoucher && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 print:hidden">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-700" />
                <span>معاينة السند للطباعة</span>
              </h3>
              <button
                onClick={() => setPrintingVoucher(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Area */}
            <div className="p-6 border-2 border-slate-800 rounded-2xl space-y-5 bg-slate-50/50">
              {/* Voucher Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">{settings.storeName}</h2>
                  <p className="text-[11px] text-slate-600">{settings.address}</p>
                  <p className="text-[11px] text-slate-600 font-mono">هاتف: {settings.phone}</p>
                </div>
                <div className="text-left font-mono">
                  <div className="text-sm font-black text-slate-800">
                    رقم السند: {printingVoucher.id}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    التاريخ: {new Date(printingVoucher.date).toLocaleDateString('ar-EG')}
                  </div>
                </div>
              </div>

              {/* Title Badge */}
              <div className="text-center my-2">
                <span className="inline-block bg-slate-900 text-white text-base font-black px-6 py-1.5 rounded-full shadow-sm">
                  {printingVoucher.direction === 'in' ? 'سند قبض نقدية' : 'سند صرف نقدية'}
                </span>
              </div>

              {/* Details Content */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-600">
                    {printingVoucher.direction === 'in' ? 'استلمنا من السيد:' : 'صرفنا إلى السيد:'}
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {printingVoucher.title}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-600">مبلغ وقدره:</span>
                  <span className="font-mono font-black text-lg text-amber-800">
                    {printingVoucher.amount.toLocaleString()} {settings.currency}
                  </span>
                </div>

                <div className="flex items-start justify-between">
                  <span className="font-bold text-slate-600">وذلك عن / البيان:</span>
                  <span className="font-semibold text-slate-800 max-w-xs text-left">
                    {printingVoucher.notes || printingVoucher.title}
                  </span>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-300 text-center font-bold text-slate-700">
                <div>
                  <p className="mb-8">توقيع المستلم / الطرف الثاني</p>
                  <p className="text-slate-400">...........................</p>
                </div>
                <div>
                  <p className="mb-8">توقيع أمانة الخزينة</p>
                  <p className="text-slate-400">...........................</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة السند</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintingVoucher(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Transfer Modal */}
      {showSafeTransferModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-600" />
                <span>تحويل مالي بين الخزائن والمحافظ</span>
              </h3>
              <button
                onClick={() => setShowSafeTransferModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {safeTransferMsg && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-bold ${
                  safeTransferMsg.type === 'success'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {safeTransferMsg.text}
              </div>
            )}

            <form onSubmit={handleSafeTransferSubmit} className="space-y-3.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">تحويل من الخزينة (المصدر) *</label>
                <select
                  value={safeTransferFrom}
                  onChange={e => setSafeTransferFrom(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl font-bold bg-slate-50"
                >
                  {safes.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (رصيدها: {s.balance.toLocaleString()} {settings.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">تحويل إلى الخزينة (الوجهة) *</label>
                <select
                  value={safeTransferTo}
                  onChange={e => setSafeTransferTo(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl font-bold bg-slate-50"
                >
                  {safes.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (رصيدها: {s.balance.toLocaleString()} {settings.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">المبلغ المراد تحويله ({settings.currency}) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={safeTransferAmount || ''}
                  onChange={e => setSafeTransferAmount(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full py-2.5 px-3 border border-slate-200 rounded-xl font-mono font-black text-lg text-amber-700 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">بيان التحويل أو ملاحظات</label>
                <input
                  type="text"
                  placeholder="مثلاً: تغذية درج الكاشير من الخزينة الرئيسية..."
                  value={safeTransferNotes}
                  onChange={e => setSafeTransferNotes(e.target.value)}
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
                  onClick={() => setShowSafeTransferModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Safe Modal */}
      {showSafeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-slate-400 text-xs">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-300 mb-4">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-700" />
                <span>{editingSafe ? 'تعديل بيانات الخزينة / المحفظة' : 'إضافة خزينة أو محفظة جديدة'}</span>
              </h3>
              <button onClick={() => setShowSafeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSafeFormSubmit} className="space-y-3.5">
              <div>
                <label className="font-bold text-slate-800 block mb-1">اسم الخزينة / المحفظة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الخزينة الرئيسية / محفظة فودافون كاش / بنك مصر"
                  value={safeFormName}
                  onChange={e => setSafeFormName(e.target.value)}
                  className="w-full py-2 px-3 border-2 border-slate-400 rounded-xl focus:ring-2 focus:ring-amber-500 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">نوع الحساب *</label>
                <select
                  value={safeFormType}
                  onChange={e => setSafeFormType(e.target.value as SafeAccount['type'])}
                  className="w-full py-2 px-3 border-2 border-slate-400 rounded-xl focus:ring-2 focus:ring-amber-500 font-bold bg-slate-50"
                >
                  <option value="cash">خزينة رئيسية نقدية</option>
                  <option value="pos">نقطة بيع كاشير (درج)</option>
                  <option value="bank">حساب بنكي معتمد</option>
                  <option value="wallet">محفظة إلكترونية (فودافون كاش / انستا باي)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">الرصيد الحالي / الافتتاحي (ج.م) *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={safeFormBalance}
                  onChange={e => setSafeFormBalance(Number(e.target.value))}
                  className="w-full py-2 px-3 border-2 border-slate-400 rounded-xl font-mono font-black text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">رقم الحساب / رقم المحفظة (اختياري)</label>
                <input
                  type="text"
                  placeholder="مثال: 01012345678 أو رقم الآيبان"
                  value={safeFormAccNum}
                  onChange={e => setSafeFormAccNum(e.target.value)}
                  className="w-full py-2 px-3 border-2 border-slate-400 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">ملاحظات وبيان الحساب</label>
                <input
                  type="text"
                  placeholder="أي معلومات إضافية عن الخزينة..."
                  value={safeFormNotes}
                  onChange={e => setSafeFormNotes(e.target.value)}
                  className="w-full py-2 px-3 border-2 border-slate-400 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl shadow-md transition-all active:scale-95"
                >
                  {editingSafe ? 'تحديث البيانات' : 'حفظ الخزينة / المحفظة'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSafeModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl border border-slate-300"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deposit to Safe Modal */}
      {depositSafeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-slate-400 text-xs">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-300 mb-4">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2 text-amber-800">
                <ArrowDownLeft className="w-5 h-5 text-amber-600" />
                <span>إيداع نقدي في: {depositSafeModal.name}</span>
              </h3>
              <button onClick={() => setDepositSafeModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-3.5">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-300 flex justify-between items-center">
                <span className="font-bold text-slate-800">الرصيد الحالي بالحساب:</span>
                <span className="font-mono font-black text-slate-900 text-base">
                  {depositSafeModal.balance.toLocaleString()} {settings.currency}
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">مبلغ الإيداع (ج.م) *</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  placeholder="0.00"
                  value={depositAmountVal || ''}
                  onChange={e => setDepositAmountVal(Number(e.target.value))}
                  className="w-full py-2.5 px-3 border-2 border-slate-400 rounded-xl font-mono font-black text-lg text-amber-700"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">عنوان / سبب الإيداع</label>
                <input
                  type="text"
                  placeholder="مثال: تغذية حساب / إيداع راس مال / سداد خارجي"
                  value={depositTitleVal}
                  onChange={e => setDepositTitleVal(e.target.value)}
                  className="w-full py-2 px-3 border-2 border-slate-400 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">ملاحظات إضافية</label>
                <input
                  type="text"
                  placeholder="ملاحظات أو تفاصيل حول العملية..."
                  value={depositNotesVal}
                  onChange={e => setDepositNotesVal(e.target.value)}
                  className="w-full py-2 px-3 border-2 border-slate-400 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl shadow-md transition-all active:scale-95"
                >
                  إيداع وإضافة للرصيد
                </button>
                <button
                  type="button"
                  onClick={() => setDepositSafeModal(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl border border-slate-300"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw from Safe Modal */}
      {withdrawSafeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-slate-400 text-xs">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-300 mb-4">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2 text-red-700">
                <ArrowUpRight className="w-5 h-5 text-red-600" />
                <span>سحب نقدي من: {withdrawSafeModal.name}</span>
              </h3>
              <button onClick={() => setWithdrawSafeModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-3.5">
              <div className="bg-red-50 p-3 rounded-xl border border-red-300 flex justify-between items-center">
                <span className="font-bold text-red-900">الرصيد المتاح حالياً:</span>
                <span className="font-mono font-black text-red-950 text-base">
                  {withdrawSafeModal.balance.toLocaleString()} {settings.currency}
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">مبلغ السحب (ج.م) *</label>
                <input
                  type="number"
                  min="1"
                  max={withdrawSafeModal.balance}
                  step="any"
                  required
                  placeholder="0.00"
                  value={withdrawAmountVal || ''}
                  onChange={e => setWithdrawAmountVal(Number(e.target.value))}
                  className="w-full py-2.5 px-3 border-2 border-slate-400 rounded-xl font-mono font-black text-lg text-red-700"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">سبب / بند السحب</label>
                <input
                  type="text"
                  placeholder="مثال: مسحوبات شخصية / مصروفات / سداد مستحقات"
                  value={withdrawTitleVal}
                  onChange={e => setWithdrawTitleVal(e.target.value)}
                  className="w-full py-2 px-3 border-2 border-slate-400 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">ملاحظات إضافية</label>
                <input
                  type="text"
                  placeholder="ملاحظات حول عملية السحب..."
                  value={withdrawNotesVal}
                  onChange={e => setWithdrawNotesVal(e.target.value)}
                  className="w-full py-2 px-3 border-2 border-slate-400 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl shadow-md transition-all active:scale-95"
                >
                  تأكيد السحب وخصم الرصيد
                </button>
                <button
                  type="button"
                  onClick={() => setWithdrawSafeModal(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl border border-slate-300"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Money Association Modal */}
      {showAssocModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border-2 border-slate-600 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-500 mb-4">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2 text-slate-900">
                <Users className="w-5 h-5 text-amber-500" />
                <span>{editingAssoc ? 'تعديل بيانات الجمعية المالية' : 'إضافة جمعية جديدة'}</span>
              </h3>
              <button onClick={() => setShowAssocModal(false)} className="text-slate-500 hover:text-slate-800 p-1 rounded-lg border-2 border-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssocFormSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-black text-slate-800 block mb-1 text-center">اسم الجمعية *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: جمعية التجار 50 ألف"
                    value={assocName}
                    onChange={e => setAssocName(e.target.value)}
                    className="w-full py-2 px-3 border-2 border-slate-600 focus:border-slate-900 bg-slate-50/50 focus:bg-white rounded-xl font-bold text-center focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-black text-slate-800 block mb-1 text-center">اسم المنظم / المسئول *</label>
                  <input
                    type="text"
                    required
                    placeholder="اسم صاحب الجمعية"
                    value={assocOrganizer}
                    onChange={e => setAssocOrganizer(e.target.value)}
                    className="w-full py-2 px-3 border-2 border-slate-600 focus:border-slate-900 bg-slate-50/50 focus:bg-white rounded-xl font-bold text-center focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-black text-slate-800 block mb-1 text-center">إجمالي مبلغ الجمعية (ج.م) *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="0.00"
                    value={assocTotalAmount || ''}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setAssocTotalAmount(val);
                      if (assocTotalMonths > 0) {
                        setAssocMonthlyInstallment(Math.round(val / assocTotalMonths));
                      }
                    }}
                    className="w-full py-2 px-3 border-2 border-slate-600 focus:border-slate-900 bg-slate-50/50 focus:bg-white rounded-xl font-mono font-black text-center text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-black text-slate-800 block mb-1 text-center">القسط الشهري (ج.م) *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="0.00"
                    value={assocMonthlyInstallment || ''}
                    onChange={e => setAssocMonthlyInstallment(Number(e.target.value))}
                    className="w-full py-2 px-3 border-2 border-slate-600 focus:border-slate-900 bg-slate-50/50 focus:bg-white rounded-xl font-mono font-black text-center text-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-black text-slate-800 block mb-1 text-center">عدد الشهور</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={assocTotalMonths}
                    onChange={e => {
                      const m = Number(e.target.value);
                      setAssocTotalMonths(m);
                      if (assocTotalAmount > 0 && m > 0) {
                        setAssocMonthlyInstallment(Math.round(assocTotalAmount / m));
                      }
                    }}
                    className="w-full py-2 px-3 border-2 border-slate-600 focus:border-slate-900 bg-slate-50/50 focus:bg-white rounded-xl font-mono font-black text-center focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-black text-slate-800 block mb-1 text-center">أقساط مدفوعة</label>
                  <input
                    type="number"
                    min="0"
                    max={assocTotalMonths}
                    value={assocPaidMonths}
                    onChange={e => setAssocPaidMonths(Number(e.target.value))}
                    className="w-full py-2 px-3 border-2 border-slate-600 focus:border-slate-900 bg-slate-50/50 focus:bg-white rounded-xl font-mono font-black text-center text-amber-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-black text-slate-800 block mb-1 text-center">دور القبض</label>
                  <input
                    type="number"
                    min="1"
                    max={assocTotalMonths}
                    value={assocPayoutTurnMonth}
                    onChange={e => setAssocPayoutTurnMonth(Number(e.target.value))}
                    className="w-full py-2 px-3 border-2 border-slate-600 focus:border-slate-900 bg-slate-50/50 focus:bg-white rounded-xl font-mono font-black text-center text-amber-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-black text-slate-800 block mb-1 text-center">تاريخ القبض المتوقع</label>
                  <input
                    type="date"
                    value={assocPayoutDate}
                    onChange={e => setAssocPayoutDate(e.target.value)}
                    className="w-full py-2 px-3 border-2 border-slate-600 focus:border-slate-900 bg-slate-50/50 focus:bg-white rounded-xl text-center font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-black text-slate-800 block mb-1 text-center">الخزينة المرتبطة للخصم/الإيداع</label>
                  <select
                    value={assocSafeId}
                    onChange={e => setAssocSafeId(e.target.value)}
                    className="w-full py-2 px-3 border-2 border-slate-600 focus:border-slate-900 bg-slate-50/50 focus:bg-white rounded-xl font-bold text-center focus:outline-none"
                  >
                    {safes.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.balance.toLocaleString()} {settings.currency})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-black text-slate-800 block mb-1 text-center">ملاحظات وقرارات الجمعية</label>
                <input
                  type="text"
                  placeholder="ملاحظات تفصيلية حول الجمعية..."
                  value={assocNotes}
                  onChange={e => setAssocNotes(e.target.value)}
                  className="w-full py-2 px-3 border-2 border-slate-600 focus:border-slate-900 bg-slate-50/50 focus:bg-white rounded-xl text-center font-bold focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t-2 border-slate-300">
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl shadow-md transition-all active:scale-95 border-2 border-amber-700"
                >
                  {editingAssoc ? 'حفظ التعديلات' : 'إضافة الجمعية بالنظام'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAssocModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-4 rounded-xl border-2 border-slate-500"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Installment Modal */}
      {payInstallmentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border-2 border-slate-600 text-xs">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-500 mb-4">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2 text-amber-800">
                <ArrowUpRight className="w-5 h-5 text-amber-600" />
                <span>سداد قسط شهر لجمعية: {payInstallmentModal.name}</span>
              </h3>
              <button onClick={() => setPayInstallmentModal(null)} className="text-slate-500 hover:text-slate-800 p-1 rounded-lg border-2 border-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePayInstallmentSubmit} className="space-y-4 text-center">
              <div className="bg-amber-50 p-3.5 rounded-xl border-2 border-amber-500 space-y-1">
                <span className="text-xs text-slate-800 font-bold block">مبلغ القسط الشهري المطلوب:</span>
                <span className="text-xl font-black font-mono text-amber-700 block">
                  {payInstallmentModal.monthlyInstallment.toLocaleString()} {settings.currency}
                </span>
                <span className="text-[11px] text-amber-800 font-semibold block">
                  سداد قسط الشهر رقم ({payInstallmentModal.paidMonths + 1}) من إجمالي {payInstallmentModal.totalMonths} شهور
                </span>
              </div>

              <div>
                <label className="font-black text-slate-800 block mb-1">اختر الخزينة المسحوب منها القسط *</label>
                <select
                  value={payInstallmentSafeId}
                  onChange={e => setPayInstallmentSafeId(e.target.value)}
                  className="w-full py-2.5 px-3 border-2 border-slate-600 focus:border-slate-900 bg-slate-50/50 focus:bg-white rounded-xl font-bold text-center focus:outline-none"
                >
                  {safes.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (رصيد: {s.balance.toLocaleString()} {settings.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-black py-2.5 rounded-xl shadow-md transition-all active:scale-95 border-2 border-amber-800"
                >
                  تأكيد خصم القسط وتوثيق السند
                </button>
                <button
                  type="button"
                  onClick={() => setPayInstallmentModal(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-4 rounded-xl border-2 border-slate-500"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Payout Modal */}
      {payoutModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border-2 border-slate-600 text-xs">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-500 mb-4">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2 text-amber-700">
                <ArrowDownLeft className="w-5 h-5 text-amber-600" />
                <span>استلام قبض المبلغ الكامل للجمعية</span>
              </h3>
              <button onClick={() => setPayoutModal(null)} className="text-slate-500 hover:text-slate-800 p-1 rounded-lg border-2 border-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReceivePayoutSubmit} className="space-y-4 text-center">
              <div className="bg-amber-50 p-3.5 rounded-xl border-2 border-amber-500 space-y-1">
                <span className="text-xs text-amber-900 font-bold block">مبلغ استلام الجمعية الكامل:</span>
                <span className="text-xl font-black font-mono text-amber-700 block">
                  {payoutModal.totalAmount.toLocaleString()} {settings.currency}
                </span>
                <span className="text-[11px] text-amber-900 font-semibold block">
                  الجمعية: {payoutModal.name} - المنظم: {payoutModal.organizer}
                </span>
              </div>

              <div>
                <label className="font-black text-slate-800 block mb-1">اختر الخزينة المراد إيداع مبلغ الجمعية بها *</label>
                <select
                  value={payoutSafeId}
                  onChange={e => setPayoutSafeId(e.target.value)}
                  className="w-full py-2.5 px-3 border-2 border-slate-600 focus:border-slate-900 bg-slate-50/50 focus:bg-white rounded-xl font-bold text-center focus:outline-none"
                >
                  {safes.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (رصيد: {s.balance.toLocaleString()} {settings.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl shadow-md transition-all active:scale-95 border-2 border-amber-700"
                >
                  تأكيد استلام وتغذية رصيد الخزينة
                </button>
                <button
                  type="button"
                  onClick={() => setPayoutModal(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-4 rounded-xl border-2 border-slate-500"
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
