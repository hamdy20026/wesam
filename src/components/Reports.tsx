import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { ProductCategory, Product, SalesInvoice, PurchaseInvoice, Expense } from '../types';
import {
  BarChart3,
  Package,
  ShoppingCart,
  Truck,
  TrendingUp,
  Calendar,
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  AlertTriangle,
  Scale,
  Percent,
  Layers,
  ChevronDown,
  RefreshCw,
  Coins,
  CheckCircle2
} from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  wires_cables: 'أسلاك وكابلات',
  switches_sockets: 'مفاتيح وبرايز وشاسيهات',
  lighting_bulbs: 'لمبات وكشافات وبانلات',
  breakers_panels: 'قواطع ولوحات توزيع',
  pipes_conduits: 'خراطيم ومواسير وعلب',
  tools_meters: 'عدد وأجهزة قياس واختبار',
  fans_heaters: 'شفاطات ومراوح ودفايات',
  accessories: 'شكرتون ومستلزمات كهرباء',
};

type ReportTab = 'inventory' | 'sales' | 'purchases' | 'profits';
type DatePreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'year' | 'custom';

export const Reports: React.FC = () => {
  const {
    products,
    salesInvoices,
    purchaseInvoices,
    expenses,
    settings,
    customers,
    suppliers
  } = useApp();

  const [activeTab, setActiveTab] = useState<ReportTab>('inventory');
  const [datePreset, setDatePreset] = useState<DatePreset>('month');

  // Custom date range state
  const todayStr = new Date().toISOString().slice(0, 10);
  const firstDayOfMonthStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState<string>(firstDayOfMonthStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Search & filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'low' | 'out'>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');

  // Date range calculation helper
  const dateRange = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (datePreset === 'all') {
      return { start: null, end: null };
    }
    if (datePreset === 'today') {
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { start: today, end };
    }
    if (datePreset === 'yesterday') {
      const start = new Date(today);
      start.setDate(today.getDate() - 1);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (datePreset === 'week') {
      const start = new Date(today);
      start.setDate(today.getDate() - 7);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (datePreset === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (datePreset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end };
    }
    if (datePreset === 'year') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (datePreset === 'custom') {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    return { start: null, end: null };
  }, [datePreset, startDate, endDate]);

  const isWithinDateRange = (dateStr: string) => {
    if (!dateRange.start && !dateRange.end) return true;
    const date = new Date(dateStr);
    if (dateRange.start && date < dateRange.start) return false;
    if (dateRange.end && date > dateRange.end) return false;
    return true;
  };

  // ==========================================
  // 1. INVENTORY REPORT CALCULATIONS
  // ==========================================
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchBarcode = p.barcode.toLowerCase().includes(q);
        if (!matchName && !matchBarcode) return false;
      }
      if (categoryFilter !== 'all' && p.category !== categoryFilter) {
        return false;
      }
      if (stockStatusFilter === 'out' && p.quantity > 0) return false;
      if (stockStatusFilter === 'low' && (p.quantity <= 0 || p.quantity > p.minAlertQuantity)) return false;
      if (stockStatusFilter === 'in_stock' && p.quantity <= p.minAlertQuantity) return false;
      return true;
    });
  }, [products, searchTerm, categoryFilter, stockStatusFilter]);

  const inventorySummary = useMemo(() => {
    let totalItemsCount = 0;
    let totalStockQty = 0;
    let totalPurchaseValue = 0;
    let totalSellingValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let weighableCount = 0;

    const categoryStats: Record<string, { count: number; qty: number; purchaseVal: number; sellingVal: number }> = {};

    products.forEach(p => {
      totalItemsCount += 1;
      totalStockQty += p.quantity;
      const pVal = p.quantity * p.purchasePrice;
      const sVal = p.quantity * p.sellingPrice;
      totalPurchaseValue += pVal;
      totalSellingValue += sVal;

      if (p.quantity === 0) outOfStockCount += 1;
      else if (p.quantity <= p.minAlertQuantity) lowStockCount += 1;

      if (p.isWeighable) weighableCount += 1;

      if (!categoryStats[p.category]) {
        categoryStats[p.category] = { count: 0, qty: 0, purchaseVal: 0, sellingVal: 0 };
      }
      categoryStats[p.category].count += 1;
      categoryStats[p.category].qty += p.quantity;
      categoryStats[p.category].purchaseVal += pVal;
      categoryStats[p.category].sellingVal += sVal;
    });

    const expectedProfit = totalSellingValue - totalPurchaseValue;
    const profitMargin = totalPurchaseValue > 0 ? (expectedProfit / totalPurchaseValue) * 100 : 0;

    return {
      totalItemsCount,
      totalStockQty,
      totalPurchaseValue,
      totalSellingValue,
      expectedProfit,
      profitMargin,
      lowStockCount,
      outOfStockCount,
      weighableCount,
      categoryStats
    };
  }, [products]);

  // ==========================================
  // 2. SALES REPORT CALCULATIONS
  // ==========================================
  const filteredSalesInvoices = useMemo(() => {
    return salesInvoices.filter(inv => {
      if (!isWithinDateRange(inv.date)) return false;
      if (selectedCustomerId !== 'all' && inv.customerId !== selectedCustomerId) return false;
      if (paymentMethodFilter !== 'all' && inv.paymentMethod !== paymentMethodFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchNum = inv.invoiceNumber.toLowerCase().includes(q);
        const matchCust = inv.customerName.toLowerCase().includes(q);
        const matchItem = inv.items?.some(it => it.productName.toLowerCase().includes(q));
        if (!matchNum && !matchCust && !matchItem) return false;
      }
      return true;
    });
  }, [salesInvoices, dateRange, selectedCustomerId, paymentMethodFilter, searchTerm]);

  const salesSummary = useMemo(() => {
    let totalInvoices = filteredSalesInvoices.length;
    let totalGrossSales = 0;
    let totalDiscounts = 0;
    let totalNetSales = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let cashSales = 0;
    let creditSales = 0;
    let transferSales = 0;

    const itemSalesMap: Record<string, { name: string; qty: number; total: number; count: number }> = {};

    filteredSalesInvoices.forEach(inv => {
      totalGrossSales += inv.subtotal;
      totalDiscounts += inv.discount;
      totalNetSales += inv.total;
      totalPaid += inv.paidAmount;
      totalRemaining += inv.remainingAmount;

      if (inv.paymentMethod === 'cash') cashSales += inv.total;
      else if (inv.paymentMethod === 'credit') creditSales += inv.total;
      else transferSales += inv.total;

      inv.items?.forEach(item => {
        if (!itemSalesMap[item.productId]) {
          itemSalesMap[item.productId] = { name: item.productName, qty: 0, total: 0, count: 0 };
        }
        itemSalesMap[item.productId].qty += item.quantity;
        itemSalesMap[item.productId].total += item.total;
        itemSalesMap[item.productId].count += 1;
      });
    });

    const topItems = Object.values(itemSalesMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const averageBasket = totalInvoices > 0 ? totalNetSales / totalInvoices : 0;

    return {
      totalInvoices,
      totalGrossSales,
      totalDiscounts,
      totalNetSales,
      totalPaid,
      totalRemaining,
      cashSales,
      creditSales,
      transferSales,
      averageBasket,
      topItems
    };
  }, [filteredSalesInvoices]);

  // ==========================================
  // 3. PURCHASES REPORT CALCULATIONS
  // ==========================================
  const filteredPurchaseInvoices = useMemo(() => {
    return purchaseInvoices.filter(inv => {
      if (!isWithinDateRange(inv.date)) return false;
      if (selectedSupplierId !== 'all' && inv.supplierId !== selectedSupplierId) return false;
      if (paymentMethodFilter !== 'all' && inv.paymentMethod !== paymentMethodFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchNum = inv.invoiceNumber.toLowerCase().includes(q);
        const matchSup = inv.supplierName.toLowerCase().includes(q);
        const matchItem = inv.items?.some(it => it.productName.toLowerCase().includes(q));
        if (!matchNum && !matchSup && !matchItem) return false;
      }
      return true;
    });
  }, [purchaseInvoices, dateRange, selectedSupplierId, paymentMethodFilter, searchTerm]);

  const purchasesSummary = useMemo(() => {
    let totalInvoices = filteredPurchaseInvoices.length;
    let totalPurchases = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let cashPurchases = 0;
    let creditPurchases = 0;
    let transferPurchases = 0;

    const supplierPurchasesMap: Record<string, { name: string; total: number; count: number; paid: number; remaining: number }> = {};

    filteredPurchaseInvoices.forEach(inv => {
      totalPurchases += inv.total;
      totalPaid += inv.paidAmount;
      totalRemaining += inv.remainingAmount;

      if (inv.paymentMethod === 'cash') cashPurchases += inv.total;
      else if (inv.paymentMethod === 'credit') creditPurchases += inv.total;
      else if (inv.paymentMethod === 'transfer') transferPurchases += inv.total;

      if (!supplierPurchasesMap[inv.supplierId]) {
        supplierPurchasesMap[inv.supplierId] = {
          name: inv.supplierName,
          total: 0,
          count: 0,
          paid: 0,
          remaining: 0
        };
      }
      supplierPurchasesMap[inv.supplierId].total += inv.total;
      supplierPurchasesMap[inv.supplierId].count += 1;
      supplierPurchasesMap[inv.supplierId].paid += inv.paidAmount;
      supplierPurchasesMap[inv.supplierId].remaining += inv.remainingAmount;
    });

    return {
      totalInvoices,
      totalPurchases,
      totalPaid,
      totalRemaining,
      cashPurchases,
      creditPurchases,
      transferPurchases,
      supplierPurchases: Object.values(supplierPurchasesMap).sort((a, b) => b.total - a.total)
    };
  }, [filteredPurchaseInvoices]);

  // ==========================================
  // 4. PROFITS REPORT CALCULATIONS
  // ==========================================
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => isWithinDateRange(exp.date));
  }, [expenses, dateRange]);

  const profitsSummary = useMemo(() => {
    let totalRevenue = 0;
    let totalCostOfGoods = 0;
    const dailyMap: Record<string, { date: string; revenue: number; cost: number; expenses: number; invoiceCount: number }> = {};
    const productProfitMap: Record<string, { name: string; category: ProductCategory; revenue: number; cost: number; profit: number; qty: number }> = {};

    // Group sales by day
    filteredSalesInvoices.forEach(inv => {
      const d = inv.date.slice(0, 10);
      if (!dailyMap[d]) {
        dailyMap[d] = { date: d, revenue: 0, cost: 0, expenses: 0, invoiceCount: 0 };
      }
      dailyMap[d].revenue += inv.total;
      dailyMap[d].invoiceCount += 1;
      totalRevenue += inv.total;

      inv.items?.forEach(item => {
        const itemCost = (item.purchaseCost || 0) * item.quantity;
        totalCostOfGoods += itemCost;
        dailyMap[d].cost += itemCost;

        if (!productProfitMap[item.productId]) {
          productProfitMap[item.productId] = {
            name: item.productName,
            category: item.category,
            revenue: 0,
            cost: 0,
            profit: 0,
            qty: 0
          };
        }
        productProfitMap[item.productId].revenue += item.total;
        productProfitMap[item.productId].cost += itemCost;
        productProfitMap[item.productId].profit += (item.total - itemCost);
        productProfitMap[item.productId].qty += item.quantity;
      });
    });

    // Group expenses by day
    let totalOperatingExpenses = 0;
    filteredExpenses.forEach(exp => {
      const d = exp.date.slice(0, 10);
      totalOperatingExpenses += exp.amount;
      if (!dailyMap[d]) {
        dailyMap[d] = { date: d, revenue: 0, cost: 0, expenses: 0, invoiceCount: 0 };
      }
      dailyMap[d].expenses += exp.amount;
    });

    const grossProfit = totalRevenue - totalCostOfGoods;
    const grossMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netProfit = grossProfit - totalOperatingExpenses;
    const netMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const dailyBreakdown = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
    const topProfitableProducts = Object.values(productProfitMap).sort((a, b) => b.profit - a.profit);

    return {
      totalRevenue,
      totalCostOfGoods,
      grossProfit,
      grossMarginPercent,
      totalOperatingExpenses,
      netProfit,
      netMarginPercent,
      dailyBreakdown,
      topProfitableProducts
    };
  }, [filteredSalesInvoices, filteredExpenses]);

  // ==========================================
  // EXPORT TO EXCEL
  // ==========================================
  const handleExportExcel = () => {
    let sheetData: any[] = [];
    let fileName = 'تقرير';

    if (activeTab === 'inventory') {
      fileName = 'تقرير_المخزون_فروزن_هاوس';
      sheetData = filteredProducts.map((p, idx) => ({
        'م': idx + 1,
        'اسم المنتج': p.name,
        'التصنيف': CATEGORY_LABELS[p.category] || p.category,
        'الباركود': p.barcode,
        'الكمية المتاحة': p.quantity,
        'الوحدة': p.unit,
        'حد الطلب': p.minAlertQuantity,
        'سعر الشراء': p.purchasePrice,
        'سعر البيع': p.sellingPrice,
        'إجمالي قيمة الشراء': p.quantity * p.purchasePrice,
        'إجمالي القيمة البيعية': p.quantity * p.sellingPrice,
        'الربح المتوقع': (p.quantity * p.sellingPrice) - (p.quantity * p.purchasePrice),
        'طبيعة البيع': p.isWeighable ? 'ميزان / وزن' : 'قطعة / عبوة',
        'حالة الرصيد': p.quantity === 0 ? 'نافد' : p.quantity <= p.minAlertQuantity ? 'منخفض' : 'متوفر'
      }));
    } else if (activeTab === 'sales') {
      fileName = 'تقرير_المبيعات_فروزن_هاوس';
      sheetData = filteredSalesInvoices.map((inv, idx) => ({
        'م': idx + 1,
        'رقم الفاتورة': inv.invoiceNumber,
        'التاريخ': new Date(inv.date).toLocaleDateString('ar-EG'),
        'العميل': inv.customerName,
        'عدد الأصناف': inv.items?.length || 0,
        'المبلغ قبل الخصم': inv.subtotal,
        'قيمة الخصم': inv.discount,
        'صافي الفاتورة': inv.total,
        'المدفوع': inv.paidAmount,
        'المتبقي آجل': inv.remainingAmount,
        'طريقة السداد': inv.paymentMethod === 'cash' ? 'نقدي' : inv.paymentMethod === 'vodafone' ? 'فودوفون كاش' : inv.paymentMethod === 'instapay' ? 'انيستا' : inv.paymentMethod === 'credit' ? 'آجل' : 'تحويل بنكي',
        'ملاحظات': inv.notes || ''
      }));
    } else if (activeTab === 'purchases') {
      fileName = 'تقرير_المشتريات_فروزن_هاوس';
      sheetData = filteredPurchaseInvoices.map((inv, idx) => ({
        'م': idx + 1,
        'رقم الفاتورة': inv.invoiceNumber,
        'التاريخ': new Date(inv.date).toLocaleDateString('ar-EG'),
        'المورد': inv.supplierName,
        'عدد الأصناف': inv.items?.length || 0,
        'إجمالي الفاتورة': inv.total,
        'المدفوع نقداً': inv.paidAmount,
        'المتبقي للمورد': inv.remainingAmount,
        'طريقة السداد': inv.paymentMethod === 'cash' ? 'نقدي' : inv.paymentMethod === 'credit' ? 'آجل' : 'تحويل بنكي',
        'ملاحظات': inv.notes || ''
      }));
    } else if (activeTab === 'profits') {
      fileName = 'تقرير_الأرباح_والأداء_المالي';
      sheetData = profitsSummary.dailyBreakdown.map((d, idx) => ({
        'م': idx + 1,
        'التاريخ': d.date,
        'عدد العمليات': d.invoiceCount,
        'إجمالي الإيرادات': d.revenue,
        'تكلفة البضاعة': d.cost,
        'مجمل الربح': d.revenue - d.cost,
        'المصروفات التشغيلية': d.expenses,
        'صافي الربح': (d.revenue - d.cost) - d.expenses
      }));
    }

    if (sheetData.length === 0) {
      alert('لا توجد بيانات مطابقة للتصدير في هذا التقرير');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'التقرير');
    XLSX.writeFile(wb, `${fileName}_${todayStr}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 text-xs font-sans pb-10">
      {/* HEADER BAR */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black flex items-center gap-2">
              <span>قسم التقارير والتحليلات الشاملة</span>
            </h2>
            <p className="text-slate-400 text-xs mt-0.5 font-medium">
              متابعة دقيقة لحركة المخزون، المبيعات، المشتريات، وصافي الأرباح لمؤسسة فروزن هاوس
            </p>
          </div>
        </div>

        {/* Action Buttons: Export Excel & Print */}
        <div className="no-print flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="bg-amber-600 hover:bg-amber-500 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
            title="تصدير بيانات التقرير الحالي إلى ملف Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-200" />
            <span>تصدير إكسيل (Excel)</span>
          </button>

          <button
            onClick={handlePrint}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 border border-slate-700 transition-all active:scale-95"
            title="طباعة التقرير الحالي"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="no-print bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'inventory'
              ? 'bg-amber-600 text-white shadow-md font-black'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>1. تقرير المخزون</span>
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'sales'
              ? 'bg-amber-600 text-white shadow-md font-black'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>2. تقرير المبيعات</span>
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'purchases'
              ? 'bg-amber-600 text-white shadow-md font-black'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>3. تقرير المشتريات</span>
        </button>

        <button
          onClick={() => setActiveTab('profits')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'profits'
              ? 'bg-amber-600 text-white shadow-md font-black'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>4. تقرير الأرباح</span>
        </button>
      </div>

      {/* FILTER CONTROLS BAR (Date Presets & Search) */}
      <div className="no-print bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Date Presets for Sales, Purchases, Profits */}
          {activeTab !== 'inventory' && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
              <span className="text-slate-500 ml-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>الفترة:</span>
              </span>
              {[
                { id: 'today', label: 'اليوم' },
                { id: 'yesterday', label: 'أمس' },
                { id: 'week', label: 'آخر 7 أيام' },
                { id: 'month', label: 'هذا الشهر' },
                { id: 'last_month', label: 'الشهر الماضي' },
                { id: 'year', label: 'هذا العام' },
                { id: 'all', label: 'كل الفترات' },
                { id: 'custom', label: 'مخصص...' },
              ].map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setDatePreset(preset.id as DatePreset)}
                  className={`px-2.5 py-1.5 rounded-lg transition-all ${
                    datePreset === preset.id
                      ? 'bg-slate-900 text-white font-black shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>جرد لحظي مباشر لأرصدة ومحتويات الثلاجات والمخازن</span>
            </div>
          )}

          {/* Search box */}
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={
                activeTab === 'inventory'
                  ? 'بحث باسم الصنف أو الباركود...'
                  : activeTab === 'sales'
                  ? 'بحث برقم الفاتورة أو العميل أو الصنف...'
                  : activeTab === 'purchases'
                  ? 'بحث برقم الفاتورة أو المورد...'
                  : 'بحث في البيانات...'
              }
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Custom Date Range Picker (shown when custom is selected) */}
        {activeTab !== 'inventory' && datePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <label className="text-slate-600 font-bold">من تاريخ:</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-600 font-bold">إلى تاريخ:</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
              />
            </div>
          </div>
        )}

        {/* Sub-Filters specific to tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          {activeTab === 'inventory' && (
            <>
              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-bold">التصنيف:</span>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                >
                  <option value="all">كل التصنيفات</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Stock Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-bold">حالة الرصيد:</span>
                <select
                  value={stockStatusFilter}
                  onChange={e => setStockStatusFilter(e.target.value as any)}
                  className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                >
                  <option value="all">كل الحالات</option>
                  <option value="in_stock">متوفر طبيعي</option>
                  <option value="low">منخفض / حد الطلب</option>
                  <option value="out">نافد تماماً (0)</option>
                </select>
              </div>
            </>
          )}

          {activeTab === 'sales' && (
            <>
              {/* Customer Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-bold">العميل:</span>
                <select
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold max-w-[200px]"
                >
                  <option value="all">كل العملاء</option>
                  <option value="walk-in">عميل نقدي عام</option>
                  {customers.filter(c => c.id !== 'walk-in').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Payment Method Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-bold">طريقة السداد:</span>
                <select
                  value={paymentMethodFilter}
                  onChange={e => setPaymentMethodFilter(e.target.value)}
                  className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                >
                  <option value="all">كل الطرق</option>
                  <option value="cash">نقدي (كاش)</option>
                  <option value="credit">آجل (على الحساب)</option>
                  <option value="transfer">تحويل بنكي</option>
                </select>
              </div>
            </>
          )}

          {activeTab === 'purchases' && (
            <>
              {/* Supplier Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-bold">المورد:</span>
                <select
                  value={selectedSupplierId}
                  onChange={e => setSelectedSupplierId(e.target.value)}
                  className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold max-w-[200px]"
                >
                  <option value="all">كل الموردين والشركات</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Payment Method Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-bold">طريقة السداد:</span>
                <select
                  value={paymentMethodFilter}
                  onChange={e => setPaymentMethodFilter(e.target.value)}
                  className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                >
                  <option value="all">كل الطرق</option>
                  <option value="cash">نقدي (كاش)</option>
                  <option value="credit">آجل للمورد</option>
                  <option value="transfer">تحويل بنكي</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: INVENTORY REPORT */}
      {/* ========================================================================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* KPI Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-slate-500 font-bold text-xs block mb-1">إجمالي تكلفة المخزون:</span>
              <span className="text-base sm:text-lg font-black font-mono text-slate-900 block">
                {inventorySummary.totalPurchaseValue.toLocaleString()} {settings.currency}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">سعر شراء البضاعة الحالية</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-amber-800 font-bold text-xs block mb-1">القيمة البيعية المتوقعة:</span>
              <span className="text-base sm:text-lg font-black font-mono text-amber-800 block">
                {inventorySummary.totalSellingValue.toLocaleString()} {settings.currency}
              </span>
              <span className="text-[10px] text-amber-600 font-medium">إجمالي البيع المقدر</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-amber-800 font-bold text-xs block mb-1">الربح المتوقع للمخزون:</span>
              <span className="text-base sm:text-lg font-black font-mono text-amber-700 block">
                +{inventorySummary.expectedProfit.toLocaleString()} {settings.currency}
              </span>
              <span className="text-[10px] text-amber-600 font-bold font-mono">
                هامش: {inventorySummary.profitMargin.toFixed(1)}%
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-slate-500 font-bold text-xs block mb-1">إجمالي الأصناف:</span>
              <span className="text-base sm:text-lg font-black font-mono text-slate-900 block">
                {inventorySummary.totalItemsCount} صنف
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                بالميزان: {inventorySummary.weighableCount}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-sm">
              <span className="text-amber-900 font-bold text-xs block mb-1">أصناف قاربت على النفاد:</span>
              <span className="text-base sm:text-lg font-black font-mono text-amber-700 block">
                {inventorySummary.lowStockCount} نواقص
              </span>
              <span className="text-[10px] text-amber-700 font-medium">وصلت لحد الطلب</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-red-200 bg-red-50/40 shadow-sm">
              <span className="text-red-900 font-bold text-xs block mb-1">أصناف نفدت تماماً:</span>
              <span className="text-base sm:text-lg font-black font-mono text-red-600 block">
                {inventorySummary.outOfStockCount} صنف
              </span>
              <span className="text-[10px] text-red-600 font-medium">الرصيد الحالي 0</span>
            </div>
          </div>

          {/* Products Inventory Detailed Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                <h4 className="font-black text-sm">جدول تقرير أرصدة وأسعار المخزون التفصيلي</h4>
              </div>
              <span className="text-xs bg-slate-800 text-slate-200 font-mono font-bold px-2.5 py-1 rounded-lg">
                الأصناف المعروضة: {filteredProducts.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-900 text-slate-100 font-bold border-b border-slate-800">
                    <th className="py-3 px-3.5 text-center w-12">م</th>
                    <th className="py-3 px-3.5">الصنف</th>
                    <th className="py-3 px-3.5">الباركود</th>
                    <th className="py-3 px-3.5 text-center">الرصيد المتاح</th>
                    <th className="py-3 px-3.5">سعر الشراء</th>
                    <th className="py-3 px-3.5">سعر البيع</th>
                    <th className="py-3 px-3.5">قيمة التكلفة</th>
                    <th className="py-3 px-3.5">القيمة البيعية</th>
                    <th className="py-3 px-3.5">الربح المتوقع</th>
                    <th className="py-3 px-3.5 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p, idx) => {
                    const costVal = p.quantity * p.purchasePrice;
                    const sellVal = p.quantity * p.sellingPrice;
                    const profitVal = sellVal - costVal;
                    const isOut = p.quantity === 0;
                    const isLow = p.quantity > 0 && p.quantity <= p.minAlertQuantity;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-400 text-xs">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {p.isWeighable && (
                              <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200">
                                <Scale className="w-3 h-3" /> ميزان
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-amber-700 font-bold block mt-0.5">
                            {CATEGORY_LABELS[p.category] || p.category}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-slate-600 text-xs sm:text-sm">
                          {p.barcode || '—'}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className={`font-mono font-black text-sm px-2.5 py-1 rounded-lg inline-block ${
                            isOut
                              ? 'bg-red-100 text-red-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-slate-100 text-slate-900'
                          }`}>
                            {p.quantity} {p.unit}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-slate-700 text-xs sm:text-sm font-bold">
                          {p.purchasePrice.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3 px-3.5 font-mono font-black text-amber-800 text-sm sm:text-base">
                          {p.sellingPrice.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3 px-3.5 font-mono font-bold text-slate-900 text-xs sm:text-sm">
                          {costVal.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3 px-3.5 font-mono font-black text-slate-900 text-sm sm:text-base">
                          {sellVal.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3 px-3.5 font-mono font-black text-amber-700 text-sm sm:text-base">
                          +{profitVal.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          {isOut ? (
                            <span className="bg-red-100 text-red-800 text-xs font-black px-2.5 py-1 rounded-md">
                              نافد
                            </span>
                          ) : isLow ? (
                            <span className="bg-amber-100 text-amber-900 text-xs font-black px-2.5 py-1 rounded-md">
                              نواقص
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-slate-800 text-xs font-black px-2.5 py-1 rounded-md">
                              متوفر
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-slate-400 font-bold">
                        لا توجد أصناف مطابقة لمعايير البحث والتصفية المحددة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SALES REPORT */}
      {/* ========================================================================= */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          {/* KPI Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-slate-500 font-bold text-xs block mb-1">إجمالي صافي المبيعات:</span>
              <span className="text-base sm:text-lg font-black font-mono text-amber-800 block">
                {salesSummary.totalNetSales.toLocaleString()} {settings.currency}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">بعد خصم الفواتير</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-slate-500 font-bold text-xs block mb-1">عدد فواتير المبيعات:</span>
              <span className="text-base sm:text-lg font-black font-mono text-slate-900 block">
                {salesSummary.totalInvoices} فاتورة
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                متوسط: {salesSummary.averageBasket.toFixed(0)} {settings.currency}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-amber-800 font-bold text-xs block mb-1">المبيعات النقدية (كاش):</span>
              <span className="text-base sm:text-lg font-black font-mono text-amber-700 block">
                {salesSummary.cashSales.toLocaleString()} {settings.currency}
              </span>
              <span className="text-[10px] text-amber-600 font-medium">وارد فوري بالخزينة</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-sm">
              <span className="text-amber-900 font-bold text-xs block mb-1">المبيعات الآجلة (ديون):</span>
              <span className="text-base sm:text-lg font-black font-mono text-amber-700 block">
                {salesSummary.creditSales.toLocaleString()} {settings.currency}
              </span>
              <span className="text-[10px] text-amber-700 font-medium">مسجلة على حساب العملاء</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-sm">
              <span className="text-slate-800 font-bold text-xs block mb-1">التحويلات البنكية:</span>
              <span className="text-base sm:text-lg font-black font-mono text-amber-700 block">
                {salesSummary.transferSales.toLocaleString()} {settings.currency}
              </span>
              <span className="text-[10px] text-amber-600 font-medium">سداد عبر الحساب البنكي</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-purple-200 bg-purple-50/40 shadow-sm">
              <span className="text-purple-900 font-bold text-xs block mb-1">إجمالي الخصومات:</span>
              <span className="text-base sm:text-lg font-black font-mono text-purple-700 block">
                {salesSummary.totalDiscounts.toLocaleString()} {settings.currency}
              </span>
              <span className="text-[10px] text-purple-600 font-medium">تخفيضات ممنوحة للعملاء</span>
            </div>
          </div>

          {/* Top Selling Products Ribbon */}
          {salesSummary.topItems.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm mb-3 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-600" />
                <span>أكثر 5 أصناف تحقيقاً للمبيعات في الفترة المختارة:</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                {salesSummary.topItems.map((item, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
                      <span>#{i + 1}</span>
                      <span className="font-mono text-slate-700">{item.qty} كمية مباعة</span>
                    </div>
                    <div className="font-bold text-slate-900 text-xs sm:text-sm truncate" title={item.name}>
                      {item.name}
                    </div>
                    <div className="font-mono font-black text-amber-800 text-xs sm:text-sm mt-1">
                      {item.total.toLocaleString()} {settings.currency}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Sales Invoices Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-amber-400" />
                <h4 className="font-black text-sm">جدول فواتير المبيعات بالتفصيل</h4>
              </div>
              <span className="text-xs bg-slate-800 text-slate-200 font-mono font-bold px-2.5 py-1 rounded-lg">
                الفواتير: {filteredSalesInvoices.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-900 text-slate-100 font-bold border-b border-slate-800">
                    <th className="py-3 px-3.5">رقم الفاتورة</th>
                    <th className="py-3 px-3.5">التاريخ والوقت</th>
                    <th className="py-3 px-3.5">العميل</th>
                    <th className="py-3 px-3.5 text-center">عدد الأصناف</th>
                    <th className="py-3 px-3.5">قبل الخصم</th>
                    <th className="py-3 px-3.5">الخصم</th>
                    <th className="py-3 px-3.5">الصافي</th>
                    <th className="py-3 px-3.5">المدفوع</th>
                    <th className="py-3 px-3.5">المتبقي</th>
                    <th className="py-3 px-3.5 text-center">طريقة السداد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSalesInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 font-mono text-xs sm:text-sm">
                        {new Date(inv.date).toLocaleDateString('ar-EG')}{' '}
                        <span className="text-xs text-slate-400">
                          {new Date(inv.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-bold text-slate-900">
                        {inv.customerName}
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-700">
                        {inv.items?.length || 0}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-600 font-bold text-xs sm:text-sm">
                        {inv.subtotal.toLocaleString()} {settings.currency}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-red-600 font-bold text-xs sm:text-sm">
                        {inv.discount > 0 ? `-${inv.discount.toLocaleString()}` : '0'}
                      </td>
                      <td className="py-3 px-3.5 font-mono font-black text-amber-800 text-sm sm:text-base">
                        {inv.total.toLocaleString()} {settings.currency}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-amber-700 font-bold text-xs sm:text-sm">
                        {inv.paidAmount.toLocaleString()} {settings.currency}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-red-600 font-bold text-xs sm:text-sm">
                        {inv.remainingAmount > 0 ? `${inv.remainingAmount.toLocaleString()} ${settings.currency}` : '—'}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          inv.paymentMethod === 'cash'
                            ? 'bg-amber-100 text-slate-800'
                            : inv.paymentMethod === 'vodafone'
                            ? 'bg-rose-100 text-rose-900'
                            : inv.paymentMethod === 'instapay'
                            ? 'bg-purple-100 text-purple-900'
                            : inv.paymentMethod === 'credit'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-amber-100 text-slate-800'
                        }`}>
                          {inv.paymentMethod === 'cash' ? 'نقدي' : inv.paymentMethod === 'vodafone' ? 'فودوفون كاش' : inv.paymentMethod === 'instapay' ? 'انيستا' : inv.paymentMethod === 'credit' ? 'آجل' : 'تحويل'}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {filteredSalesInvoices.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-slate-400 font-bold">
                        لا توجد فواتير مبيعات مسجلة في هذه الفترة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PURCHASES REPORT */}
      {/* ========================================================================= */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          {/* KPI Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-slate-500 font-bold text-xs block mb-1">إجمالي المشتريات:</span>
              <span className="text-base sm:text-lg font-black font-mono text-purple-800 block">
                {purchasesSummary.totalPurchases.toLocaleString()} {settings.currency}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">فواتير توريد البضاعة</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-slate-500 font-bold text-xs block mb-1">عدد فواتير الشراء:</span>
              <span className="text-base sm:text-lg font-black font-mono text-slate-900 block">
                {purchasesSummary.totalInvoices} فاتورة
              </span>
              <span className="text-[10px] text-slate-400 font-medium">شحنات مستلمة</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-amber-800 font-bold text-xs block mb-1">المسدد للموردين نقداً:</span>
              <span className="text-base sm:text-lg font-black font-mono text-amber-700 block">
                {purchasesSummary.totalPaid.toLocaleString()} {settings.currency}
              </span>
              <span className="text-[10px] text-amber-600 font-medium">مدفوعات من الخزينة</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-red-200 bg-red-50/40 shadow-sm">
              <span className="text-red-900 font-bold text-xs block mb-1">المتبقي آجل للموردين:</span>
              <span className="text-base sm:text-lg font-black font-mono text-red-600 block">
                {purchasesSummary.totalRemaining.toLocaleString()} {settings.currency}
              </span>
              <span className="text-[10px] text-red-600 font-medium">مستحقات واجبة السداد</span>
            </div>
          </div>

          {/* Supplier Breakdown Ribbon */}
          {purchasesSummary.supplierPurchases.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4 text-purple-700" />
                <span>حجم المشتريات حسب الموردين والشركات:</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                {purchasesSummary.supplierPurchases.slice(0, 4).map((sup, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
                      <span>{sup.count} فواتير</span>
                      <span className="font-mono text-red-600">
                        {sup.remaining > 0 ? `آجل: ${sup.remaining.toLocaleString()}` : 'خالص'}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-xs sm:text-sm truncate" title={sup.name}>
                      {sup.name}
                    </div>
                    <div className="font-mono font-black text-purple-900 text-xs sm:text-sm mt-1">
                      {sup.total.toLocaleString()} {settings.currency}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Purchases Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-purple-400" />
                <h4 className="font-black text-sm">جدول فواتير المشتريات والتوريدات</h4>
              </div>
              <span className="text-xs bg-slate-800 text-slate-200 font-mono font-bold px-2.5 py-1 rounded-lg">
                الفواتير: {filteredPurchaseInvoices.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-900 text-slate-100 font-bold border-b border-slate-800">
                    <th className="py-3 px-3.5">رقم الفاتورة</th>
                    <th className="py-3 px-3.5">التاريخ</th>
                    <th className="py-3 px-3.5">المورد / الشركة</th>
                    <th className="py-3 px-3.5 text-center">عدد الأصناف</th>
                    <th className="py-3 px-3.5">إجمالي الفاتورة</th>
                    <th className="py-3 px-3.5">المدفوع نقداً</th>
                    <th className="py-3 px-3.5">المتبقي آجل</th>
                    <th className="py-3 px-3.5 text-center">طريقة السداد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchaseInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 font-mono text-xs sm:text-sm">
                        {new Date(inv.date).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-slate-900">
                        {inv.supplierName}
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-700">
                        {inv.items?.length || 0}
                      </td>
                      <td className="py-3 px-3.5 font-mono font-black text-slate-900 text-sm sm:text-base">
                        {inv.total.toLocaleString()} {settings.currency}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-amber-700 font-bold text-xs sm:text-sm">
                        {inv.paidAmount.toLocaleString()} {settings.currency}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-red-600 font-bold text-xs sm:text-sm">
                        {inv.remainingAmount > 0 ? `${inv.remainingAmount.toLocaleString()} ${settings.currency}` : '—'}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          inv.paymentMethod === 'cash'
                            ? 'bg-amber-100 text-slate-800'
                            : inv.paymentMethod === 'credit'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-amber-100 text-slate-800'
                        }`}>
                          {inv.paymentMethod === 'cash' ? 'نقدي' : inv.paymentMethod === 'credit' ? 'آجل' : 'تحويل'}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {filteredPurchaseInvoices.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400 font-bold">
                        لا توجد فواتير مشتريات مسجلة في هذه الفترة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PROFITS REPORT */}
      {/* ========================================================================= */}
      {activeTab === 'profits' && (
        <div className="space-y-4">
          {/* KPI Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-slate-500 font-bold text-xs block mb-1">إجمالي إيرادات المبيعات:</span>
              <span className="text-base sm:text-lg font-black font-mono text-slate-900 block">
                {profitsSummary.totalRevenue.toLocaleString()} {settings.currency}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">مبيعات الفترة</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-slate-500 font-bold text-xs block mb-1">تكلفة البضاعة المباعة:</span>
              <span className="text-base sm:text-lg font-black font-mono text-slate-600 block">
                {profitsSummary.totalCostOfGoods.toLocaleString()} {settings.currency}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">سعر شراء البضاعة</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-sm">
              <span className="text-slate-800 font-bold text-xs block mb-1">مجمل الربح (Gross):</span>
              <span className="text-base sm:text-lg font-black font-mono text-amber-700 block">
                +{profitsSummary.grossProfit.toLocaleString()} {settings.currency}
              </span>
              <span className="text-[10px] text-amber-600 font-bold font-mono">
                هامش: {profitsSummary.grossMarginPercent.toFixed(1)}%
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-red-200 bg-red-50/40 shadow-sm">
              <span className="text-red-900 font-bold text-xs block mb-1">المصروفات التشغيلية:</span>
              <span className="text-base sm:text-lg font-black font-mono text-red-600 block">
                -{profitsSummary.totalOperatingExpenses.toLocaleString()} {settings.currency}
              </span>
              <span className="text-[10px] text-red-600 font-medium">كهرباء، إيجار، عمالة...</span>
            </div>

            <div className="col-span-2 bg-gradient-to-br from-amber-900 to-slate-900 text-white p-3.5 rounded-2xl shadow-md border border-amber-700/50 flex items-center justify-between">
              <div>
                <span className="text-amber-300 font-bold text-xs block mb-1">صافي الربح الفعلي (Net):</span>
                <span className={`text-xl sm:text-2xl font-black font-mono block ${
                  profitsSummary.netProfit >= 0 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {profitsSummary.netProfit >= 0 ? '+' : ''}
                  {profitsSummary.netProfit.toLocaleString()} {settings.currency}
                </span>
                <span className="text-[11px] text-amber-200/80 font-medium">
                  الربح الحقيقي بعد كل التكاليف والمصروفات
                </span>
              </div>
              <div className="text-left font-mono">
                <span className="text-xs text-slate-300 block">نسبة الصافي:</span>
                <span className="text-lg font-black text-amber-300">
                  {profitsSummary.netMarginPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Daily Profit Breakdown Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <h4 className="font-black text-sm">تحليل الأرباح اليومية (اليوم بيومه)</h4>
              </div>
              <span className="text-xs bg-slate-800 text-slate-200 font-mono font-bold px-2.5 py-1 rounded-lg">
                الأيام: {profitsSummary.dailyBreakdown.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-900 text-slate-100 font-bold border-b border-slate-800">
                    <th className="py-3 px-3.5">التاريخ (اليوم)</th>
                    <th className="py-3 px-3.5 text-center">العمليات</th>
                    <th className="py-3 px-3.5">إجمالي المبيعات</th>
                    <th className="py-3 px-3.5">تكلفة البضاعة</th>
                    <th className="py-3 px-3.5">مجمل الربح</th>
                    <th className="py-3 px-3.5">المصروفات</th>
                    <th className="py-3 px-3.5">صافي الربح اليومي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profitsSummary.dailyBreakdown.map(d => {
                    const gross = d.revenue - d.cost;
                    const net = gross - d.expenses;
                    const isNetPositive = net >= 0;

                    return (
                      <tr key={d.date} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                          {d.date}
                        </td>
                        <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-700">
                          {d.invoiceCount} فواتير
                        </td>
                        <td className="py-3 px-3.5 font-mono font-black text-slate-900 text-sm sm:text-base">
                          {d.revenue.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-slate-600 font-bold text-xs sm:text-sm">
                          {d.cost.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3 px-3.5 font-mono font-black text-amber-700 text-sm sm:text-base">
                          +{gross.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3 px-3.5 font-mono font-bold text-red-600 text-xs sm:text-sm">
                          {d.expenses > 0 ? `-${d.expenses.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-3.5">
                          <span className={`font-mono font-black px-2.5 py-1 rounded-lg text-xs sm:text-sm inline-block ${
                            isNetPositive
                              ? 'bg-amber-100 text-slate-800'
                              : 'bg-red-100 text-red-900'
                          }`}>
                            {isNetPositive ? '+' : ''}{net.toLocaleString()} {settings.currency}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {profitsSummary.dailyBreakdown.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 font-bold">
                        لا توجد حركات بيع أو مصروفات مسجلة في الفترة المحددة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Product Profitability Analysis */}
          {profitsSummary.topProfitableProducts.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <h4 className="font-black text-sm">ترتيب الأصناف الأكثر ربحية (Product Profitability)</h4>
                </div>
                <span className="text-xs bg-slate-800 text-slate-200 font-mono font-bold px-2.5 py-1 rounded-lg">
                  أصناف تم بيعها: {profitsSummary.topProfitableProducts.length}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-900 text-slate-100 font-bold border-b border-slate-800">
                      <th className="py-3 px-3.5 text-center w-12">م</th>
                      <th className="py-3 px-3.5">اسم الصنف</th>
                      <th className="py-3 px-3.5">التصنيف</th>
                      <th className="py-3 px-3.5 text-center">الكمية المباعة</th>
                      <th className="py-3 px-3.5">إجمالي الإيراد</th>
                      <th className="py-3 px-3.5">إجمالي التكلفة</th>
                      <th className="py-3 px-3.5">صافي ربح الصنف</th>
                      <th className="py-3 px-3.5 text-center">نسبة هامش الربح</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {profitsSummary.topProfitableProducts.slice(0, 15).map((prod, idx) => {
                      const margin = prod.cost > 0 ? (prod.profit / prod.cost) * 100 : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3.5 font-bold text-slate-900">
                            {prod.name}
                          </td>
                          <td className="py-3 px-3.5 text-xs text-amber-700 font-bold">
                            {CATEGORY_LABELS[prod.category] || prod.category}
                          </td>
                          <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-800">
                            {prod.qty}
                          </td>
                          <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                            {prod.revenue.toLocaleString()} {settings.currency}
                          </td>
                          <td className="py-3 px-3.5 font-mono text-slate-600 font-bold">
                            {prod.cost.toLocaleString()} {settings.currency}
                          </td>
                          <td className="py-3 px-3.5 font-mono font-black text-amber-800 text-sm sm:text-base">
                            +{prod.profit.toLocaleString()} {settings.currency}
                          </td>
                          <td className="py-3 px-3.5 text-center font-mono font-extrabold text-amber-700">
                            +{margin.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
