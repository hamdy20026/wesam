import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  Package,
  Calendar,
  Building2,
  DollarSign,
  TrendingDown
} from 'lucide-react';

export const ExpiryAlerts: React.FC = () => {
  const { products, suppliers, settings, adjustStock, setActiveTab } = useApp();

  const [filterPeriod, setFilterPeriod] = useState<'all' | 'expired' | '30days' | '90days'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const now = new Date();

  const enrichedProducts = useMemo(() => {
    return products
      .filter(p => !!p.expiryDate)
      .map(p => {
        const expDate = new Date(p.expiryDate!);
        const diffMs = expDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 3600 * 24));
        const supplier = suppliers.find(s => s.id === p.supplierId);
        const capitalRisk = p.quantity * p.purchasePrice;

        let status: 'expired' | 'critical' | 'warning' | 'safe';
        if (diffDays <= 0) {
          status = 'expired';
        } else if (diffDays <= 30) {
          status = 'critical';
        } else if (diffDays <= 90) {
          status = 'warning';
        } else {
          status = 'safe';
        }

        return {
          ...p,
          diffDays,
          status,
          supplierName: supplier ? supplier.name : 'مورد غير محدد',
          capitalRisk,
        };
      })
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [products, suppliers, now]);

  const filtered = useMemo(() => {
    return enrichedProducts.filter(p => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.activeIngredient && p.activeIngredient.toLowerCase().includes(q)) ||
        (p.batchNumber && p.batchNumber.toLowerCase().includes(q));

      if (filterPeriod === 'expired') return matchesSearch && p.status === 'expired';
      if (filterPeriod === '30days') return matchesSearch && (p.status === 'expired' || p.status === 'critical');
      if (filterPeriod === '90days') return matchesSearch && p.status !== 'safe';

      return matchesSearch;
    });
  }, [enrichedProducts, filterPeriod, searchQuery]);

  // Risk stats
  const totalExpiredCapital = enrichedProducts
    .filter(p => p.status === 'expired')
    .reduce((sum, p) => sum + p.capitalRisk, 0);

  const totalNearExpiryCapital = enrichedProducts
    .filter(p => p.status === 'critical' || p.status === 'warning')
    .reduce((sum, p) => sum + p.capitalRisk, 0);

  return (
    <div className="space-y-6">
      {/* Header & Risk Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
            رادار الضمان ونواقص المخزون الكهربائي
          </h2>
          <p className="text-xs text-slate-500">
            تتبع دقيق لفترات الضمان والتشغيلات للأجهزة والقواطع، وتنبيهات فورية لنواقص الكابلات والمفاتيح
          </p>
        </div>

        {/* Financial Risk Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="bg-red-50 border border-red-200 px-3.5 py-2 rounded-xl">
            <span className="text-red-700 block text-[10px]">قيمة المنتجات التالفة/المنتهية:</span>
            <span className="font-black text-red-800 font-mono">
              {totalExpiredCapital.toLocaleString()} {settings.currency}
            </span>
          </div>

          <div className="bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl">
            <span className="text-amber-800 block text-[10px]">بضاعة مهددة خلال 90 يوم:</span>
            <span className="font-black text-amber-900 font-mono">
              {totalNearExpiryCapital.toLocaleString()} {settings.currency}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث باسم المنتج، المنشأ، أو رقم التشغيلة..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto text-xs overflow-x-auto">
          <button
            onClick={() => setFilterPeriod('all')}
            className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
              filterPeriod === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            كل التواريخ ({enrichedProducts.length})
          </button>
          <button
            onClick={() => setFilterPeriod('expired')}
            className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
              filterPeriod === 'expired'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            منتهية الصلاحية (
            {enrichedProducts.filter(p => p.status === 'expired').length})
          </button>
          <button
            onClick={() => setFilterPeriod('30days')}
            className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
              filterPeriod === '30days'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            خلال 30 يوماً (
            {enrichedProducts.filter(p => p.status === 'critical').length})
          </button>
          <button
            onClick={() => setFilterPeriod('90days')}
            className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
              filterPeriod === '90days'
                ? 'bg-yellow-600 text-white'
                : 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100'
            }`}
          >
            خلال 90 يوماً (
            {enrichedProducts.filter(p => p.status === 'warning').length})
          </button>
        </div>
      </div>

      {/* Radar Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                <th className="py-3.5 px-4">اسم المنتج والبلد المنشأ/المصنع</th>
                <th className="py-3.5 px-4">رقم التشغيلة</th>
                <th className="py-3.5 px-4">تاريخ الانتهاء</th>
                <th className="py-3.5 px-4">المدة المتبقية</th>
                <th className="py-3.5 px-4">الكمية بالمخزن</th>
                <th className="py-3.5 px-4">رأس المال المعرض للخطر</th>
                <th className="py-3.5 px-4">الشركة الموردة</th>
                <th className="py-3.5 px-4 text-center">الإجراء الموصى به</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => {
                const isExpired = p.status === 'expired';
                const isCritical = p.status === 'critical';
                const isWarning = p.status === 'warning';

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isExpired
                        ? 'bg-red-50/40 text-red-950'
                        : isCritical
                        ? 'bg-amber-50/40 text-amber-950'
                        : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900">{p.name}</div>
                      {p.activeIngredient && (
                        <div className="text-[11px] text-slate-500 font-sans">
                          {p.activeIngredient}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {p.batchNumber || '—'}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {p.expiryDate}
                    </td>

                    <td className="py-3 px-4 font-mono">
                      {isExpired ? (
                        <span className="inline-block px-2.5 py-1 rounded-full font-black text-[11px] bg-red-100 text-red-700 border border-red-200">
                          منتهي منذ {Math.abs(p.diffDays)} يوم
                        </span>
                      ) : isCritical ? (
                        <span className="inline-block px-2.5 py-1 rounded-full font-bold text-[11px] bg-amber-100 text-amber-900 border border-amber-200 animate-pulse">
                          متبقي {p.diffDays} يوم فقط!
                        </span>
                      ) : isWarning ? (
                        <span className="inline-block px-2.5 py-1 rounded-full font-bold text-[11px] bg-yellow-100 text-yellow-800">
                          متبقي {p.diffDays} يوم
                        </span>
                      ) : (
                        <span className="text-amber-700 font-bold">
                          ساري ({p.diffDays} يوم)
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {p.quantity} {p.unit}
                    </td>

                    <td className="py-3 px-4 font-mono font-black text-slate-900">
                      {p.capitalRisk.toLocaleString()} {settings.currency}
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {p.supplierName}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {isExpired ? (
                        <span className="inline-block text-[11px] bg-red-600 text-white px-2.5 py-1 rounded-lg font-bold">
                          سحب فوري وإعدام أو مرتجع
                        </span>
                      ) : isCritical ? (
                        <span className="inline-block text-[11px] bg-amber-500 text-white px-2.5 py-1 rounded-lg font-bold">
                          عرض تخفيض سريع أو استبدال
                        </span>
                      ) : isWarning ? (
                        <span className="inline-block text-[11px] bg-yellow-50 text-yellow-800 border border-yellow-200 px-2 py-0.5 rounded-lg font-bold">
                          تقديم أولوية الصرف
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">في الأمان</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    لا توجد منتجات أو سلع غذائية مطابقة لهذا الفلتر
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
