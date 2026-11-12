import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Truck,
  Package,
  Layers,
  AlertTriangle,
  Users,
  Building2,
  BadgeDollarSign,
  FileText,
  Calculator,
  Settings as SettingsIcon,
  Database,
  Shield,
  RotateCcw,
  BarChart3,
  Zap,
  Sparkles,
  Download,
  X
} from 'lucide-react';
import { downloadDistZip } from '../utils/downloadHelper';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onCloseMobile }) => {
  const {
    activeTab,
    setActiveTab,
    metrics,
    hasPermission,
    activeShift,
    salesInvoices,
    salesReturns,
    purchaseInvoices,
    purchaseReturns,
  } = useApp();

  const menuItems = [
    {
      id: 'dashboard',
      label: 'الرئيسية',
      icon: LayoutDashboard,
      badge: null,
      iconColor: 'text-amber-600',
    },
    {
      id: 'pos',
      label: 'نقطة البيع (POS)',
      icon: ShoppingCart,
      badge: null,
      highlight: true,
      iconColor: 'text-amber-600',
    },
    {
      id: 'sales',
      label: 'قائمة فواتير المبيعات',
      icon: Receipt,
      badge: salesInvoices.length > 0 ? `${salesInvoices.length}` : null,
      iconColor: 'text-slate-600',
    },
    {
      id: 'sales_returns',
      label: 'فاتورة مرتجع المبيعات',
      icon: RotateCcw,
      badge: null,
      iconColor: 'text-rose-600',
    },
    {
      id: 'sales_returns_list',
      label: 'قائمة مرتجع المبيعات',
      icon: FileText,
      badge: salesReturns.length > 0 ? `${salesReturns.length}` : null,
      iconColor: 'text-rose-500',
    },
    {
      id: 'purchases',
      label: 'فاتورة المشتريات',
      icon: Truck,
      badge: null,
      iconColor: 'text-amber-600',
    },
    {
      id: 'purchases_list',
      label: 'فواتير المشتريات',
      icon: FileText,
      badge: purchaseInvoices.length > 0 ? `${purchaseInvoices.length}` : null,
      iconColor: 'text-slate-600',
    },
    {
      id: 'purchase_returns',
      label: 'فاتورة مرتجع المشتريات',
      icon: RotateCcw,
      badge: null,
      iconColor: 'text-amber-600',
    },
    {
      id: 'purchase_returns_list',
      label: 'قائمة مرتجع المشتريات',
      icon: FileText,
      badge: purchaseReturns.length > 0 ? `${purchaseReturns.length}` : null,
      iconColor: 'text-amber-500',
    },
    {
      id: 'inventory',
      label: 'المخازن والأصناف',
      icon: Package,
      badge: metrics.lowStockCount > 0 ? `${metrics.lowStockCount} نواقص` : null,
      badgeType: 'warning',
      iconColor: 'text-amber-600',
    },
    {
      id: 'assembly',
      label: 'فك الأصناف',
      icon: Layers,
      badge: null,
      iconColor: 'text-orange-600',
    },
    {
      id: 'expiry',
      label: 'نواقص المخزن',
      icon: AlertTriangle,
      badge: (metrics.expiringSoonCount + metrics.expiredCount) > 0 
        ? `${metrics.expiringSoonCount + metrics.expiredCount}` 
        : null,
      badgeType: 'danger',
      iconColor: 'text-rose-600',
    },
    {
      id: 'customers',
      label: 'العملاء والمقاولين',
      icon: Users,
      badge: null,
      iconColor: 'text-slate-600',
    },
    {
      id: 'suppliers',
      label: 'الموردين والشركات',
      icon: Building2,
      badge: null,
      iconColor: 'text-slate-600',
    },
    {
      id: 'finance',
      label: 'الخزائن والمصروفات',
      icon: BadgeDollarSign,
      badge: null,
      iconColor: 'text-amber-600',
    },
    {
      id: 'reports',
      label: 'قسم التقارير والرسوم',
      icon: BarChart3,
      badge: null,
      iconColor: 'text-amber-600',
    },
    {
      id: 'calculator',
      label: 'الورديات',
      icon: Calculator,
      badge: activeShift ? 'وردية مفتوحة' : null,
      badgeType: 'warning',
      iconColor: 'text-amber-600',
    },
    {
      id: 'users',
      label: 'المستخدمين والصلاحيات',
      icon: Shield,
      badge: null,
      iconColor: 'text-slate-600',
    },
    {
      id: 'sqlserver',
      label: 'قاعدة البيانات',
      icon: Database,
      badge: null,
      iconColor: 'text-slate-600',
    },
    {
      id: 'assistant',
      label: 'المساعد الذكي (AI)',
      icon: Sparkles,
      badge: 'ذكي',
      badgeType: 'warning',
      iconColor: 'text-amber-500',
    },
    {
      id: 'settings',
      label: 'الإعدادات والنسخ',
      icon: SettingsIcon,
      badge: null,
      iconColor: 'text-slate-600',
    },
  ];

  const visibleMenuItems = menuItems.filter(item => hasPermission(item.id));

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  const navContent = (
    <>
      <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto">
        <div className="text-xs font-black text-slate-700 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 mb-2 flex items-center justify-between">
          <span>إدارة المتجر والحسابات</span>
        </div>
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 sm:py-2.5 rounded-xl text-sm transition-all min-h-[44px] ${
                isActive
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-md shadow-amber-600/25 font-black'
                  : 'text-slate-700 hover:bg-amber-50/80 hover:text-amber-900 font-bold'
              } ${item.highlight && !isActive ? 'border-2 border-amber-400/70 text-amber-900 bg-amber-50/70 hover:bg-amber-100/80' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-white' : item.iconColor || 'text-slate-500'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-black ${
                    item.badgeType === 'danger'
                      ? 'bg-rose-600 text-white animate-pulse'
                      : item.badgeType === 'warning'
                      ? 'bg-amber-500 text-slate-950'
                      : isActive
                      ? 'bg-white text-amber-700'
                      : 'bg-slate-700 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Mini Helper Footer */}
      <div className="p-3 bg-slate-100/90 border border-slate-200 m-2 rounded-xl text-xs text-slate-600 space-y-2">
        <div className="flex items-center gap-2 text-slate-800 font-extrabold">
          <Zap className="w-4 h-4 text-amber-600 fill-amber-500" />
          <span>وسام للأدوات الكهربائية</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-600">
          نظام متكامل لإدارة المبيعات والمخازن بخيارات وحسابات دقيقة.
        </p>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            downloadDistZip();
          }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white shadow-md shadow-amber-500/20 border border-amber-400/40 transition-all active:scale-95 cursor-pointer"
          title="تحميل حزمة المنظومة المكتملة وقاعدة البيانات (dist.zip)"
        >
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-amber-100 shrink-0" />
            <span className="truncate">تحميل المنظومة (dist.zip)</span>
          </div>
          <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">ZIP</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop & Laptop Sidebar (md screens and above) */}
      <aside className="no-print hidden md:flex w-56 lg:w-64 bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-800 flex-col flex-shrink-0 border-l-2 border-slate-200 shadow-lg select-none min-h-[calc(100vh-4rem)] sticky top-16 h-[calc(100vh-4rem)]">
        {navContent}
      </aside>

      {/* Mobile Off-Canvas Drawer Overlay */}
      {isMobileOpen && (
        <div className="no-print fixed inset-0 z-50 md:hidden flex">
          {/* Semi-transparent backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Slide-over Drawer Container */}
          <aside className="relative z-50 w-72 max-w-[85vw] bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-800 flex flex-col h-full shadow-2xl overflow-hidden font-sans border-l-2 border-slate-200 animate-in slide-in-from-right duration-200">
            <div className="p-4 bg-gradient-to-r from-slate-800 to-slate-700 border-b border-amber-500/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                <span className="font-extrabold text-white text-base">القائمة الرئيسية</span>
              </div>
              <button 
                onClick={onCloseMobile}
                className="p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/15 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col">
              {navContent}
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
