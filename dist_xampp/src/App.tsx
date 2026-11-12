import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { POS } from './components/POS';
import { SalesList } from './components/SalesList';
import { Purchases } from './components/Purchases';
import { Inventory } from './components/Inventory';
import { ExpiryAlerts } from './components/ExpiryAlerts';
import { Customers } from './components/Customers';
import { Suppliers } from './components/Suppliers';
import { Finance } from './components/Finance';
import { ShiftManager } from './components/ShiftManager';
import { Settings } from './components/Settings';
import { SqlServerManager } from './components/SqlServerManager';
import { UserManager } from './components/UserManager';

import { SalesReturns } from './components/SalesReturns';
import { PurchaseReturns } from './components/PurchaseReturns';
import { LoginPage } from './components/LoginPage';
import { PrintInvoiceModal } from './components/PrintInvoiceModal';
import { Reports } from './components/Reports';
import { AssemblyManager } from './components/AssemblyManager';
import { AccountStatements } from './components/AccountStatements';
import { DetailedTreasuryStatement } from './components/DetailedTreasuryStatement';
import { DetailedCustomerStatement } from './components/DetailedCustomerStatement';
import { DetailedSupplierStatement } from './components/DetailedSupplierStatement';
import { SmartAssistant } from './components/SmartAssistant';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Sparkles,
  FileSpreadsheet,
  Menu,
  AlertTriangle,
  Save,
  Trash2,
  X
} from 'lucide-react';

const MainContent: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    activeStatementTarget,
    closeStatement,
    settings,
    pendingExitTab,
    activeInvoiceGuard,
    confirmExitWithSave,
    confirmExitWithDiscard,
    cancelExitRequest,
  } = useApp();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAssistantModalOpen, setIsAssistantModalOpen] = useState(false);

  // Listen to keyboard shortcuts (F2 -> POS)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('pos');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab]);

  if (!currentUser) {
    return <LoginPage />;
  }

  if (activeStatementTarget) {
    if (activeStatementTarget.type === 'safe') {
      return (
        <DetailedTreasuryStatement
          initialSafeId={activeStatementTarget.id}
          isModal={true}
          onClose={closeStatement}
        />
      );
    }
    if (activeStatementTarget.type === 'supplier') {
      return (
        <DetailedSupplierStatement
          initialSupplierId={activeStatementTarget.id}
          isModal={true}
          onClose={closeStatement}
        />
      );
    }
    return (
      <DetailedCustomerStatement
        initialCustomerId={activeStatementTarget.id}
        isModal={true}
        onClose={closeStatement}
      />
    );
  }

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans selection:bg-amber-600 selection:text-white">
      <Navbar onToggleMobileMenu={() => setIsMobileOpen(prev => !prev)} />

      <div className="flex flex-1 relative">
        <Sidebar isMobileOpen={isMobileOpen} onCloseMobile={() => setIsMobileOpen(false)} />

        <main
          className={`flex-1 w-full max-w-none ${
            activeTab === 'pos' ||
            activeTab === 'purchases' ||
            activeTab === 'purchase_returns' ||
            activeTab === 'sales_returns'
              ? 'p-1.5 sm:p-2 overflow-hidden'
              : 'p-2 sm:p-3 lg:p-3.5 pb-20 md:pb-4 overflow-x-hidden'
          }`}
        >
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'assistant' && <SmartAssistant />}
          {activeTab === 'pos' && <POS />}
          {activeTab === 'sales' && <SalesList />}
          {(activeTab === 'sales_returns' || activeTab === 'sales_returns_list') && (
            <SalesReturns initialTab={activeTab === 'sales_returns_list' ? 'list' : 'create'} />
          )}
          {(activeTab === 'purchases' || activeTab === 'purchases_list') && (
            <Purchases initialTab={activeTab === 'purchases_list' ? 'list' : 'create'} />
          )}
          {(activeTab === 'purchase_returns' || activeTab === 'purchase_returns_list') && (
            <PurchaseReturns initialTab={activeTab === 'purchase_returns_list' ? 'list' : 'create'} />
          )}
          {activeTab === 'inventory' && <Inventory />}
          {activeTab === 'assembly' && <AssemblyManager />}
          {activeTab === 'expiry' && <ExpiryAlerts />}
          {activeTab === 'customers' && <Customers />}
          {activeTab === 'suppliers' && <Suppliers />}
          {activeTab === 'finance' && <Finance />}
          {activeTab === 'statements' && <AccountStatements />}
          {activeTab === 'reports' && <Reports />}
          {activeTab === 'calculator' && <ShiftManager />}
          {activeTab === 'users' && <UserManager />}
          {activeTab === 'sqlserver' && <SqlServerManager />}

          {activeTab === 'settings' && <Settings />}
        </main>
      </div>

      {/* GLOBAL WARNING MODAL WHEN EXITING ANY INVOICE THAT HAS ITEMS */}
      {pendingExitTab && activeInvoiceGuard && (
        <div className="no-print fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-50">
          <div className="bg-white rounded-2xl border-2 border-amber-500 shadow-2xl max-w-md w-full p-5 space-y-4 font-sans select-none">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">تحذير: الفاتورة تحتوي على أصناف!</h3>
                  <p className="text-xs text-slate-500 font-bold">{activeInvoiceGuard.invoiceTitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={cancelExitRequest}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="تراجع والبقاء في الفاتورة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 font-bold leading-relaxed">
              تحتوي هذه الفاتورة على{' '}
              <span className="text-amber-700 font-mono font-black">{activeInvoiceGuard.itemCount}</span>{' '}
              {activeInvoiceGuard.itemCount === 1 ? 'صنف' : 'أصناف'} بقيمة إجمالية{' '}
              <span className="text-amber-700 font-mono font-black">
                {activeInvoiceGuard.totalAmount.toLocaleString()} {settings.currency}
              </span>
              . هل ترغب في <span className="text-slate-900 font-black">حفظ الفاتورة</span> أم{' '}
              <span className="text-rose-600 font-black">حذفها</span> قبل الخروج؟
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={confirmExitWithSave}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>حفظ الفاتورة والخروج</span>
              </button>

              <button
                type="button"
                onClick={confirmExitWithDiscard}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف الفاتورة والخروج</span>
              </button>
            </div>

            <button
              type="button"
              onClick={cancelExitRequest}
              className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-300 transition-all active:scale-95"
            >
              <span>تراجع (البقاء في الفاتورة)</span>
            </button>
          </div>
        </div>
      )}

      {isAssistantModalOpen && (
        <SmartAssistant
          isFloatingModal={true}
          onCloseModal={() => setIsAssistantModalOpen(false)}
        />
      )}

      {/* Mobile & Tablet Bottom Navigation Bar */}
      <nav className="no-print fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-slate-200 text-slate-600 lg:hidden grid grid-cols-6 h-16 px-1 pb-[env(safe-area-inset-bottom,0px)] shadow-2xl select-none">
        <button
          onClick={() => handleSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] rounded-xl transition-all active:scale-95 ${
            activeTab === 'dashboard' ? 'text-amber-700 font-black bg-amber-50 border border-amber-200/80' : 'hover:text-amber-600'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] tracking-tight truncate">الرئيسية</span>
        </button>

        <button
          onClick={() => handleSelectTab('pos')}
          className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] rounded-xl transition-all active:scale-95 ${
            activeTab === 'pos' ? 'text-amber-700 font-black bg-amber-50 border border-amber-200/80' : 'hover:text-amber-600'
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="text-[10px] tracking-tight truncate">البيع POS</span>
        </button>

        <button
          onClick={() => handleSelectTab('inventory')}
          className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] rounded-xl transition-all active:scale-95 ${
            activeTab === 'inventory' ? 'text-amber-700 font-black bg-amber-50 border border-amber-200/80' : 'hover:text-amber-600'
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px] tracking-tight truncate">المخازن</span>
        </button>

        <button
          onClick={() => handleSelectTab('sales')}
          className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] rounded-xl transition-all active:scale-95 ${
            activeTab === 'sales' ? 'text-amber-700 font-black bg-amber-50 border border-amber-200/80' : 'hover:text-amber-600'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px] tracking-tight truncate">المبيعات</span>
        </button>

        <button
          onClick={() => handleSelectTab('statements')}
          className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] rounded-xl transition-all active:scale-95 ${
            activeTab === 'statements' ? 'text-amber-700 font-black bg-amber-50 border border-amber-200/80' : 'hover:text-amber-600'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span className="text-[10px] tracking-tight truncate">كشف الحساب</span>
        </button>

        <button
          onClick={() => setIsMobileOpen(prev => !prev)}
          className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] rounded-xl transition-all active:scale-95 ${
            isMobileOpen ? 'text-amber-700 font-black bg-amber-50 border border-amber-200/80' : 'text-slate-600 hover:text-amber-600'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] tracking-tight truncate">القائمة</span>
        </button>
      </nav>

      <PrintInvoiceModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
