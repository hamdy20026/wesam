import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Zap, 
  Wallet, 
  PlusCircle, 
  AlertTriangle, 
  Calendar,
  User as UserIcon,
  LogOut,
  Menu,
  Download,
  Loader2
} from 'lucide-react';

import { downloadDistZip } from '../utils/downloadHelper';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu }) => {
  const { 
    settings, 
    metrics, 
    setActiveTab, 
    currentUser,
    logout
  } = useApp();

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const getRoleTitle = (r?: string) => {
    if (r === 'admin') return 'مدير النظام';
    if (r === 'cashier') return 'كاشير المبيعات';
    if (r === 'storekeeper') return 'أمين المخزن والتجميع';
    return 'مستخدم';
  };

  const [isDownloading, setIsDownloading] = React.useState(false);
  const [downloadMsg, setDownloadMsg] = React.useState<string | null>(null);

  const handleDownloadZip = (e: React.MouseEvent) => {
    e.preventDefault();
    downloadDistZip(setIsDownloading, setDownloadMsg);
  };

  return (
    <header className="no-print bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white shadow-lg border-b-2 border-amber-500/60 sticky top-0 z-30">
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          
          {/* Mobile Hamburger Toggle Button */}
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 rounded-xl bg-slate-600/60 border border-slate-500 text-white hover:bg-amber-600 transition-colors shrink-0 active:scale-95"
              aria-label="القائمة الجانبية"
              title="فتح القائمة الرئيسية"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}

          {/* Brand Info (Wessam Electrical Supplies) */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500 shadow-md flex items-center justify-center text-slate-950 select-none shrink-0 font-black">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 fill-slate-950 text-slate-950" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-black text-sm sm:text-base lg:text-lg tracking-wide select-none leading-none">
                <span className="text-white">وسام </span>
                <span className="text-amber-400">للأدوات الكهربائية</span>
              </h1>
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-300 leading-none mt-1 font-bold">
                {settings.commercialRecord && (
                  <span className="bg-slate-600/60 text-slate-100 px-1.5 py-0.5 rounded text-[9px] font-mono border border-slate-500">
                    سجل تجاري: {settings.commercialRecord}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics & Colorful Actions */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 flex-1 min-w-0">

            {/* Direct Download Zip Button */}
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={isDownloading}
              className="bg-slate-600/80 hover:bg-slate-600 disabled:opacity-75 text-white font-extrabold px-3 py-1.5 sm:py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md border border-slate-500 transition-all active:scale-95 shrink-0 cursor-pointer whitespace-nowrap"
              title="تحميل حزمة المنظومة المكتملة وقاعدة البيانات (dist.zip)"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-amber-400" />
              )}
              <span className="font-extrabold text-xs whitespace-nowrap">
                {isDownloading ? 'جاري التحميل...' : 'تحميل المنظومة (dist.zip)'}
              </span>
            </button>

            {/* Live Cash Register / Safe */}
            <div 
              onClick={() => setActiveTab('finance')}
              className="cursor-pointer bg-slate-600/60 hover:bg-slate-600 transition-colors px-2.5 py-1.5 rounded-xl border border-slate-500 flex items-center gap-2 text-xs shrink-0"
              title="الرصيد الكلي بالخزائن والمحافظ النقدية والبنكية"
            >
              <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="text-right leading-none">
                <span className="text-[9px] block text-slate-300 mb-0.5 font-bold">الخزائن</span>
                <span className="font-black font-mono text-white text-xs sm:text-sm">
                  {metrics.cashBalance.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Warnings Badges */}
            {metrics.lowStockCount > 0 && (
              <button
                onClick={() => setActiveTab('expiry')}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/50 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs transition-colors shrink-0 shadow-sm"
                title="أصناف وصلت لحد النواقص والطلب"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="font-extrabold text-[11px] sm:text-xs">
                  {metrics.lowStockCount} <span className="hidden sm:inline">نواقص</span>
                </span>
              </button>
            )}

            {/* Quick New Sale Button (Burnt Orange / Amber Button) */}
            <button
              onClick={() => setActiveTab('pos')}
              className="bg-amber-600 hover:bg-amber-500 text-white font-black px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md border border-amber-400/60 transition-all transform active:scale-95 shrink-0"
            >
              <PlusCircle className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">فاتورة بيع (F2)</span>
              <span className="sm:hidden text-[11px]">بيع</span>
            </button>

            {/* Date Display */}
            <div className="hidden 2xl:flex items-center gap-1.5 text-xs text-slate-100 bg-slate-600/60 border border-slate-500 px-3 py-1.5 rounded-xl shrink-0">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{dateFormatted}</span>
            </div>

            {/* Current Logged In User Pill */}
            {currentUser && (
              <div className="flex items-center gap-1.5 sm:gap-2 border-r border-slate-600 pr-1.5 sm:pr-2.5 shrink-0">
                <div className="bg-slate-600/60 border border-slate-500 px-2 sm:px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-xs">
                  <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                  <div className="text-right leading-none hidden sm:block">
                    <span className="font-bold block text-white text-xs">{currentUser.name}</span>
                    <span className="text-[10px] text-amber-300 block mt-0.5">{getRoleTitle(currentUser.role)}</span>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="p-1.5 bg-rose-500/90 hover:bg-rose-600 border border-rose-300/50 text-white rounded-xl transition-all active:scale-95 shadow-sm"
                  title="تسجيل الخروج من النظام"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
