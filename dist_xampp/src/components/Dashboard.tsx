import React from 'react';
import { useApp } from '../context/AppContext';
import {
  TrendingUp,
  Wallet,
  Users,
  Building2,
  Package,
  PackageCheck,
  AlertTriangle,
  ShoppingCart,
  Truck,
  Printer,
  ChevronLeft,
  Layers,
  Receipt,
  BadgeDollarSign,
  Calculator,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  FileText
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const {
    metrics,
    settings,
    products,
    salesInvoices,
    setActiveTab,
    setPrintInvoice,
    customers,
    suppliers,
    hasPermission
  } = useApp();

  const recentSales = salesInvoices.slice(0, 5);

  // Products expiring soon or low stock
  const now = new Date();
  const ninetyDays = new Date();
  ninetyDays.setDate(now.getDate() + 90);

  const urgentExpiryProducts = products.filter(p => {
    if (!p.expiryDate) return false;
    const exp = new Date(p.expiryDate);
    return exp <= ninetyDays;
  }).slice(0, 4);

  const lowStockProducts = products.filter(p => p.quantity <= p.minAlertQuantity).slice(0, 4);

  // Department / Module Navigation Cards
  const departmentCards = [
    {
      id: 'pos',
      title: 'نقطة البيع (POS)',
      description: 'بيع سريع، باركود، وطباعة إيصال الفاتورة للعميل فورياً.',
      icon: ShoppingCart,
      badge: 'F2 سريع',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
      borderColor: 'border-slate-400 hover:border-amber-600',
      iconBg: 'bg-amber-600 text-white',
      btnBg: 'bg-amber-600 hover:bg-amber-500 text-white',
    },
    {
      id: 'sales',
      title: 'فواتير المبيعات',
      description: 'أرشيف كلي لفواتير البيع الصادرة، التعديل، وإلغاء الفواتير.',
      icon: Receipt,
      badge: `${salesInvoices.length} فاتورة`,
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
      borderColor: 'border-slate-400 hover:border-amber-600',
      iconBg: 'bg-amber-600 text-white',
      btnBg: 'bg-amber-600 hover:bg-amber-500 text-white',
    },
    {
      id: 'sales_returns',
      title: 'مرتجع المبيعات',
      description: 'تسجيل مرتجعات العملاء مع فحص سجل الشراء السابق للعميل.',
      icon: RotateCcw,
      badge: 'فحص ذكي',
      badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
      borderColor: 'border-slate-400 hover:border-rose-600',
      iconBg: 'bg-rose-600 text-white',
      btnBg: 'bg-rose-600 hover:bg-rose-500 text-white',
    },
    {
      id: 'purchases',
      title: 'فواتير المشتريات',
      description: 'توريد البضاعة للمخزن، تحديث التكلفة، وحسابات الشركات.',
      icon: Truck,
      badge: 'توريد مخزني',
      badgeBg: 'bg-purple-100 text-purple-800 border-purple-300',
      borderColor: 'border-slate-400 hover:border-purple-600',
      iconBg: 'bg-purple-600 text-white',
      btnBg: 'bg-purple-600 hover:bg-purple-500 text-white',
    },
    {
      id: 'inventory',
      title: 'إدارة المخازن والأصناف',
      description: 'متابعة الرصيد الحقيقي بالمخزن، الجرد الفعلي، وتعديل الأسعار.',
      icon: Package,
      badge: metrics.lowStockCount > 0 ? `${metrics.lowStockCount} نواقص` : 'جرد دقيق',
      badgeBg: metrics.lowStockCount > 0 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-700 border-slate-300',
      borderColor: 'border-slate-400 hover:border-amber-600',
      iconBg: 'bg-amber-500 text-slate-950 font-black',
      btnBg: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold',
    },
    {
      id: 'assembly',
      title: 'فك الأصناف (لفة إلى أمتار)',
      description: 'إذن فك وتحويل اللفات والعبوات إلى أمتار مع التأثير المباشر.',
      icon: Layers,
      badge: 'مباشر ⚡',
      badgeBg: 'bg-orange-100 text-orange-800 border-orange-300',
      borderColor: 'border-slate-400 hover:border-orange-600',
      iconBg: 'bg-orange-600 text-white',
      btnBg: 'bg-orange-600 hover:bg-orange-500 text-white',
    },
    {
      id: 'customers',
      title: 'العملاء والمقاولين',
      description: 'متابعة ديون السوق، كشف الحساب المتقدم، وتحصيل الدفعات.',
      icon: Users,
      badge: `${customers.length} عميل`,
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
      borderColor: 'border-slate-400 hover:border-amber-600',
      iconBg: 'bg-amber-600 text-white',
      btnBg: 'bg-amber-600 hover:bg-amber-500 text-white',
    },
    {
      id: 'suppliers',
      title: 'الموردين والشركات',
      description: 'حسابات شركات ومصانع الأدوات الكهربائية وسندات الصرف.',
      icon: Building2,
      badge: `${suppliers.length} مورد`,
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
      borderColor: 'border-slate-400 hover:border-amber-600',
      iconBg: 'bg-amber-600 text-white',
      btnBg: 'bg-amber-600 hover:bg-amber-500 text-white',
    },
    {
      id: 'finance',
      title: 'الخزائن والمصروفات',
      description: 'متابعة حركة الخزينة الرئيسية، المحافظ النقدية، والمصروفات.',
      icon: BadgeDollarSign,
      badge: 'السيولة',
      badgeBg: 'bg-slate-100 text-amber-800 border-slate-300',
      borderColor: 'border-slate-400 hover:border-amber-600',
      iconBg: 'bg-amber-700 text-white',
      btnBg: 'bg-amber-700 hover:bg-amber-600 text-white',
    },
    {
      id: 'statements',
      title: 'كشوفات الحسابات المتقدمة',
      description: 'كشف حساب متقدم بالتفاصيل والأصناف للعملاء والموردين والخزائن.',
      icon: FileText,
      badge: 'متقدم',
      badgeBg: 'bg-amber-100 text-slate-800 border-amber-300',
      borderColor: 'border-slate-200 hover:border-amber-600',
      iconBg: 'bg-amber-600 text-white',
      btnBg: 'bg-amber-600 hover:bg-amber-500 text-white',
    },
    {
      id: 'calculator',
      title: 'الورديات',
      description: 'فتح وإغلاق الوردية، تسجيل العجز والزيادة، ومطابقة النقدية.',
      icon: Calculator,
      badge: 'الرقابة',
      badgeBg: 'bg-violet-100 text-violet-800 border-violet-300',
      borderColor: 'border-slate-200 hover:border-violet-600',
      iconBg: 'bg-violet-600 text-white',
      btnBg: 'bg-violet-600 hover:bg-violet-500 text-white',
    },
    {
      id: 'assistant',
      title: 'المساعد الذكي (AI)',
      description: 'تعديل الأسعار الجماعي، تحليل المبيعات، وإدارة الأصناف بالذكاء.',
      icon: Sparkles,
      badge: 'ذكي ✨',
      badgeBg: 'bg-slate-100 text-slate-800 border-amber-400',
      borderColor: 'border-slate-200 hover:border-amber-500',
      iconBg: 'bg-amber-600 text-white',
      btnBg: 'bg-amber-600 hover:bg-slate-500 text-white',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 text-xs sm:text-sm">
      {/* Top Welcome Banner - Responsive for Mobile, Tablet & Desktop */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg border-2 border-slate-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 shrink-0" />
            <h2 className="text-base sm:text-xl lg:text-2xl font-black text-white leading-snug">
              منظومة {settings.storeName}
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-amber-100 leading-relaxed">
            لوحة تحكم مركزية متوافقة مع الموبايل والتابلت والكمبيوتر لإدارة المبيعات والمخازن والحسابات.
          </p>
        </div>
      </div>

      {/* Main KPI Stats Cards Grid - 2 Columns Side-by-Side on Mobile & Tablet, 4 on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Today's Sales */}
        <div
          onClick={() => setActiveTab('sales')}
          className="bg-white rounded-2xl p-3 sm:p-5 border-2 border-slate-400 shadow-sm hover:shadow transition-all cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2 gap-1">
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-700 truncate">
              مبيعات اليوم
            </span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-2xl font-black text-slate-900 font-mono truncate">
              {metrics.todaySales.toLocaleString()}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 shrink-0">
              {settings.currency}
            </span>
          </div>
          <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-slate-500 flex items-center justify-between pt-1.5 sm:pt-2 border-t border-slate-200 gap-1">
            <span className="truncate">إجمالي المبيعات:</span>
            <span className="font-bold text-slate-800 font-mono shrink-0">
              {metrics.totalSalesRevenue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Cash in Treasury */}
        <div
          onClick={() => setActiveTab('finance')}
          className="bg-white rounded-2xl p-3 sm:p-5 border-2 border-slate-400 shadow-sm hover:shadow transition-all cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2 gap-1">
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-700 truncate">
              رصيد الخزائن
            </span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-slate-100 text-amber-700 shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-2xl font-black text-slate-900 font-mono truncate">
              {metrics.cashBalance.toLocaleString()}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 shrink-0">
              {settings.currency}
            </span>
          </div>
          <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-slate-500 flex items-center justify-between pt-1.5 sm:pt-2 border-t border-slate-200 gap-1">
            <span className="truncate">صافي الأرباح:</span>
            <span
              className={`font-bold font-mono shrink-0 ${
                metrics.netProfit >= 0 ? 'text-amber-700' : 'text-rose-600'
              }`}
            >
              {metrics.netProfit.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Customer Debts */}
        <div
          onClick={() => setActiveTab('customers')}
          className="bg-white rounded-2xl p-3 sm:p-5 border-2 border-slate-400 shadow-sm hover:shadow transition-all cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2 gap-1">
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-700 truncate">
              ديون العملاء
            </span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-2xl font-black text-amber-700 font-mono truncate">
              {metrics.customerDebts.toLocaleString()}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 shrink-0">
              {settings.currency}
            </span>
          </div>
          <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-slate-500 flex items-center justify-between pt-1.5 sm:pt-2 border-t border-slate-200 gap-1">
            <span className="truncate">العملاء المسجلين:</span>
            <span className="font-bold text-slate-800 font-mono shrink-0">{customers.length} عميل</span>
          </div>
        </div>

        {/* Supplier Payables */}
        <div
          onClick={() => setActiveTab('suppliers')}
          className="bg-white rounded-2xl p-3 sm:p-5 border-2 border-slate-400 shadow-sm hover:shadow transition-all cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2 gap-1">
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-700 truncate">
              مستحقات الموردين
            </span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-purple-100 text-purple-700 shrink-0">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-2xl font-black text-purple-700 font-mono truncate">
              {metrics.supplierPayables.toLocaleString()}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 shrink-0">
              {settings.currency}
            </span>
          </div>
          <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-slate-500 flex items-center justify-between pt-1.5 sm:pt-2 border-t border-slate-200 gap-1">
            <span className="truncate">قيمة المخزون:</span>
            <span className="font-bold text-slate-800 font-mono shrink-0">
              {metrics.inventoryCostValue.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* DEPARTMENT / MODULE CARDS (كروت الأقسام - كرتين جمب بعض عرضياً كشبكة على الموبايل تلقائياً) */}
      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-lg">
              أقسام المنظومة والوحدات الرئيسية
            </h3>
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-slate-500">
            انقر على أي قسم للدخول المباشر
          </span>
        </div>

        {/* 2 columns side-by-side on mobile (grid-cols-2), 3 on tablet (md:grid-cols-3), 4 on desktop (lg:grid-cols-4) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {departmentCards.map(card => {
            if (!hasPermission(card.id)) return null;
            const Icon = card.icon;

            return (
              <div
                key={card.id}
                onClick={() => setActiveTab(card.id)}
                className={`bg-white rounded-2xl p-3 sm:p-4 lg:p-5 border-2 ${card.borderColor} shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group hover:-translate-y-0.5 active:scale-[0.98]`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                    <div
                      className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl ${card.iconBg} shadow-sm group-hover:scale-105 transition-transform shrink-0`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <span
                      className={`text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full border truncate max-w-[95px] sm:max-w-none ${card.badgeBg}`}
                    >
                      {card.badge}
                    </span>
                  </div>

                  <h4 className="font-black text-slate-900 text-xs sm:text-base mb-1 group-hover:text-amber-600 transition-colors leading-snug">
                    {card.title}
                  </h4>
                  <p className="text-[10px] sm:text-xs text-slate-500 leading-relaxed line-clamp-2 sm:line-clamp-none">
                    {card.description}
                  </p>
                </div>

                <div className="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                  <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-700 truncate">
                    دخول القسم
                  </span>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setActiveTab(card.id);
                    }}
                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-extrabold text-[10px] sm:text-xs flex items-center gap-1 transition-all shadow-sm shrink-0 ${card.btnBg}`}
                  >
                    <span>عرض</span>
                    <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Urgent Warning Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Expiry Radar Alert Card */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border-2 border-slate-400 shadow-sm">
          <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-2 rounded-xl bg-red-100 text-red-700 shrink-0">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm truncate">
                  رادار الضمان ونواقص المخزون
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                  متابعة فترات الضمان وتنبيهات إعادة طلب المنتجات
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('expiry')}
              className="text-xs font-extrabold text-amber-600 hover:text-amber-700 flex items-center gap-1 shrink-0"
            >
              <span>عرض الكل</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {urgentExpiryProducts.length === 0 ? (
            <div className="p-3.5 sm:p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-800 font-bold flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
              <span>كافة الأصناف والأجهزة الكهربائية بالمخزن ضمن فترات الضمان والتشغيل المعتمدة.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {urgentExpiryProducts.map(p => {
                const exp = new Date(p.expiryDate!);
                const isExpired = exp < now;
                const daysDiff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border text-xs gap-2 ${
                      isExpired
                        ? 'bg-red-50 border-red-200 text-red-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">{p.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        المخزون: {p.quantity} {p.unit}
                      </div>
                    </div>
                    <div className="text-left font-mono shrink-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-bold text-[11px] ${
                          isExpired ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'
                        }`}
                      >
                        {isExpired ? 'منتهي الصلاحية' : `متبقي ${daysDiff} يوم`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Low Stock Alerts Card */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border-2 border-slate-400 shadow-sm">
          <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                <PackageCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm truncate">
                  نواقص المخزن (حد الطلب الأدنى)
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                  أصناف أوشكت على النفاد يلزم طلب توريد جديد
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('inventory')}
              className="text-xs font-extrabold text-amber-600 hover:text-amber-700 flex items-center gap-1 shrink-0"
            >
              <span>إدارة المخزن</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="p-3.5 sm:p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-800 font-bold flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
              <span>كافة الأصناف متوفرة بكميات تفوق حد الأمان والطلب.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {lowStockProducts.map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-slate-300 bg-slate-50 text-xs gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{p.name}</div>
                    <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                      حد الطلب: {p.minAlertQuantity} {p.unit}
                    </div>
                  </div>
                  <div className="text-left font-mono shrink-0">
                    <span className="inline-block px-2 py-0.5 rounded-full font-black text-[10px] sm:text-xs bg-red-100 text-red-700 border border-red-300">
                      {p.quantity} {p.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Sales Invoices Table */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-5 border-2 border-slate-400 shadow-sm">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">
              آخر فواتير المبيعات الصادرة
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500">
              سجل أحدث عمليات البيع للعملاء والجهات
            </p>
          </div>
          <button
            onClick={() => setActiveTab('sales')}
            className="text-xs font-extrabold text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            <span>عرض الكل</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {recentSales.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">
            لا توجد فواتير مبيعات مسجلة حتى الآن.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-3.5 sm:mx-0 px-3.5 sm:px-0">
            <table className="w-full text-right text-xs border-collapse min-w-[520px]">
              <thead>
                <tr className="bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 text-white border-b border-amber-500 font-extrabold">
                  <th className="py-2.5 px-3">رقم الفاتورة</th>
                  <th className="py-2.5 px-3">العميل / الجهة</th>
                  <th className="py-2.5 px-3">التاريخ والوقت</th>
                  <th className="py-2.5 px-3">الإجمالي</th>
                  <th className="py-2.5 px-3">المدفوع</th>
                  <th className="py-2.5 px-3">المتبقي (آجل)</th>
                  <th className="py-2.5 px-3 text-center">طباعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {recentSales.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      {inv.customerName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">
                      {new Date(inv.date).toLocaleDateString('ar-EG')}{' '}
                      {new Date(inv.date).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-3 font-black font-mono text-slate-900">
                      {inv.total.toLocaleString()} {settings.currency}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-amber-700 font-black">
                      {inv.paidAmount.toLocaleString()} {settings.currency}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {inv.remainingAmount > 0 ? (
                        <span className="font-black text-rose-600">
                          {inv.remainingAmount.toLocaleString()} {settings.currency}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold">0 (خالص)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => setPrintInvoice(inv)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors inline-flex items-center justify-center"
                        title="طباعة الفاتورة"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
