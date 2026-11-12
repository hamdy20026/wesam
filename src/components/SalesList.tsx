import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { SalesInvoice } from '../types';
import {
  Receipt,
  Search,
  Printer,
  Eye,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Edit
} from 'lucide-react';

export const SalesList: React.FC = () => {
  const { salesInvoices, cancelSalesInvoice, deleteSalesInvoice, setPrintInvoice, settings } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [openMenuInvoiceId, setOpenMenuInvoiceId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const itemsPerPage = 15;

  const filteredInvoices = useMemo(() => {
    return salesInvoices.filter(inv => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        (inv.customerPhone && inv.customerPhone.includes(q));

      const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
      const matchesPayment =
        filterPayment === 'all' ||
        (filterPayment === 'cash' && inv.remainingAmount === 0) ||
        (filterPayment === 'credit' && inv.remainingAmount > 0);

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [salesInvoices, searchQuery, filterStatus, filterPayment]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(start, start + itemsPerPage);
  }, [filteredInvoices, currentPage]);

  const isAllPaginatedSelected = useMemo(() => {
    if (paginatedInvoices.length === 0) return false;
    return paginatedInvoices.every(inv => selectedIds.includes(inv.id));
  }, [paginatedInvoices, selectedIds]);

  const toggleSelectAll = () => {
    if (isAllPaginatedSelected) {
      const pageIds = new Set(paginatedInvoices.map(inv => inv.id));
      setSelectedIds(prev => prev.filter(id => !pageIds.has(id)));
    } else {
      const pageIds = paginatedInvoices.map(inv => inv.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`هل أنت متأكد من حذف ${selectedIds.length} فاتورة محددة نهائياً؟`)) {
      selectedIds.forEach(id => deleteSalesInvoice(id));
      setSelectedIds([]);
    }
  };

  const totalFilteredSales = filteredInvoices
    .filter(i => i.status === 'completed')
    .reduce((sum, i) => sum + i.total, 0);

  const totalFilteredPaid = filteredInvoices
    .filter(i => i.status === 'completed')
    .reduce((sum, i) => sum + i.paidAmount, 0);

  const totalFilteredRemaining = filteredInvoices
    .filter(i => i.status === 'completed')
    .reduce((sum, i) => sum + i.remainingAmount, 0);

  return (
    <div className="space-y-5">
      {/* Top Banner and Summary Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-amber-700" />
            سجل فواتير المبيعات
          </h2>
        </div>

        {/* Quick Summary Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="bg-white border border-slate-300 px-3 py-1.5 rounded-xl shadow-sm">
            <span className="text-slate-500 block text-[10px]">إجمالي الفواتير</span>
            <span className="font-black text-slate-900 font-mono">
              {totalFilteredSales.toLocaleString()} {settings.currency}
            </span>
          </div>
          <div className="bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-xl">
            <span className="text-amber-700 block text-[10px]">المحصل نقداً</span>
            <span className="font-black text-amber-800 font-mono">
              {totalFilteredPaid.toLocaleString()} {settings.currency}
            </span>
          </div>
          <div className="bg-red-50 border border-red-300 px-3 py-1.5 rounded-xl">
            <span className="text-red-700 block text-[10px]">المتبقي آجل (ديون)</span>
            <span className="font-black text-red-800 font-mono">
              {totalFilteredRemaining.toLocaleString()} {settings.currency}
            </span>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-300 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث برقم الفاتورة أو اسم العميل..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pr-10 pl-4 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto text-xs shrink-0">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBatchDelete}
              className="bg-red-600 hover:bg-red-500 text-white font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95 text-xs cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف المحدد ({selectedIds.length})</span>
            </button>
          )}

          <select
            value={filterStatus}
            onChange={e => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-300 rounded-xl py-1.5 px-3 text-xs bg-slate-50 focus:outline-none font-medium"
          >
            <option value="all">كل الحالات</option>
            <option value="completed">المكتملة السارية</option>
            <option value="cancelled">الملغاة / المرتجعة</option>
          </select>

          <select
            value={filterPayment}
            onChange={e => {
              setFilterPayment(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-300 rounded-xl py-1.5 px-3 text-xs bg-slate-50 focus:outline-none font-medium"
          >
            <option value="all">كل طرق السداد</option>
            <option value="cash">مسددة بالكامل</option>
            <option value="credit">بها متبقي آجل (دين)</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-300 overflow-visible">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-right text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-100 border-b border-slate-800 font-bold text-xs">
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPaginatedSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 accent-amber-600 cursor-pointer rounded"
                    title="تحديد الكل"
                  />
                </th>
                <th className="py-2.5 px-3">رقم الفاتورة</th>
                <th className="py-2.5 px-3">العميل</th>
                <th className="py-2.5 px-3">التاريخ والوقت</th>
                <th className="py-2.5 px-3">الإجمالي</th>
                <th className="py-2.5 px-3">المدفوع</th>
                <th className="py-2.5 px-3">المتبقي (آجل)</th>
                <th className="py-2.5 px-3">الحالة</th>
                <th className="py-2.5 px-3 text-center">خيارات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {paginatedInvoices.map(inv => {
                const isCancelled = inv.status === 'cancelled';
                const isMenuOpen = openMenuInvoiceId === inv.id;
                const isSelected = selectedIds.includes(inv.id);

                return (
                  <tr
                    key={inv.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      isSelected ? 'bg-amber-50/80 font-bold' : ''
                    } ${isCancelled ? 'bg-red-50/30 line-through text-slate-400' : ''}`}
                  >
                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(inv.id)}
                        className="w-4 h-4 accent-amber-600 cursor-pointer rounded"
                      />
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900 text-xs sm:text-sm">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">{inv.customerName}</div>
                    </td>
                    <td className="py-2 px-3 text-slate-600 font-mono text-xs">
                      {new Date(inv.date).toLocaleDateString('ar-EG')}{' '}
                      <span className="text-[11px] text-slate-400">
                        {new Date(inv.date).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-black font-mono text-slate-900 text-xs sm:text-sm">
                      {inv.total.toLocaleString()} {settings.currency}
                    </td>
                    <td className="py-2 px-3 font-mono font-black text-amber-700 text-xs sm:text-sm">
                      {inv.paidAmount.toLocaleString()} {settings.currency}
                    </td>
                    <td className="py-2 px-3 font-mono">
                      {inv.remainingAmount > 0 ? (
                        <span className="font-black text-red-600 text-xs sm:text-sm">
                          {inv.remainingAmount.toLocaleString()} {settings.currency}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs font-semibold">0 (خالص)</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {isCancelled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" />
                          ملغاة / مرتجع
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          سارية ومكتملة
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center relative">
                      <div className="relative inline-block text-right">
                        <button
                          onClick={() => setOpenMenuInvoiceId(isMenuOpen ? null : inv.id)}
                          className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-1 rounded-xl text-xs flex items-center gap-1 shadow-sm transition-all active:scale-95 mx-auto"
                        >
                          <span>خيارات</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        {isMenuOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setOpenMenuInvoiceId(null)}
                            />
                            <div className="absolute left-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-300 z-50 py-1 text-xs overflow-hidden font-sans">
                              {/* Display Details */}
                              <button
                                onClick={() => {
                                  setOpenMenuInvoiceId(null);
                                  setSelectedInvoice(inv);
                                }}
                                className="w-full text-right px-3.5 py-2 text-slate-700 hover:bg-amber-50 hover:text-amber-700 font-bold flex items-center gap-2 border-b border-slate-100"
                              >
                                <Eye className="w-4 h-4 text-amber-600" />
                                <span>عرض</span>
                              </button>

                              {/* Edit option */}
                              <button
                                onClick={() => {
                                  setOpenMenuInvoiceId(null);
                                  setSelectedInvoice(inv);
                                }}
                                className="w-full text-right px-3.5 py-2 text-slate-700 hover:bg-amber-50 hover:text-amber-700 font-bold flex items-center gap-2 border-b border-slate-100"
                              >
                                <Edit className="w-4 h-4 text-amber-600" />
                                <span>تعديل</span>
                              </button>

                              {/* Return invoice */}
                              {!isCancelled && (
                                <button
                                  onClick={() => {
                                    setOpenMenuInvoiceId(null);
                                    if (
                                      window.confirm(
                                        `هل أنت متأكد من إلغاء وارتجاع فاتورة البيع ${inv.invoiceNumber} بالكامل؟`
                                      )
                                    ) {
                                      cancelSalesInvoice(inv.id);
                                    }
                                  }}
                                  className="w-full text-right px-3.5 py-2 text-amber-700 hover:bg-amber-50 font-bold flex items-center gap-2 border-b border-slate-100"
                                >
                                  <RotateCcw className="w-4 h-4 text-amber-600" />
                                  <span>مرتجع بالكامل</span>
                                </button>
                              )}

                              {/* Delete invoice */}
                              <button
                                onClick={() => {
                                  setOpenMenuInvoiceId(null);
                                  if (
                                    window.confirm(
                                      `هل أنت متأكد من حذف فاتورة البيع ${inv.invoiceNumber} نهائياً؟`
                                    )
                                  ) {
                                    deleteSalesInvoice(inv.id);
                                  }
                                }}
                                className="w-full text-right px-3.5 py-2 text-red-600 hover:bg-red-50 font-bold flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                                <span>حذف</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    لا توجد فواتير تطابق معايير البحث الحالية
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredInvoices.length > 0 && (
          <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-300 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-semibold">
              عرض {(currentPage - 1) * itemsPerPage + 1} إلى {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} من إجمالي {filteredInvoices.length} فاتورة
            </span>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
                title="الصفحة السابقة"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="px-3 font-bold text-slate-800">
                صفحة {currentPage} من {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
                title="الصفحة التالية"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-300 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-700" />
                <h3 className="font-black text-slate-900 text-base">
                  تفاصيل الفاتورة: {selectedInvoice.invoiceNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-300 mb-4">
              <div>
                <span className="text-slate-500 block">العميل:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedInvoice.customerName}
                </span>
              </div>
              <div className="text-left font-mono">
                <span className="text-slate-500 block">التاريخ والوقت:</span>
                <span className="font-bold text-slate-800">
                  {new Date(selectedInvoice.date).toLocaleString('ar-EG')}
                </span>
                <span className="text-slate-500 block mt-1">
                  طريقة السداد:{' '}
                  {selectedInvoice.paymentMethod === 'cash'
                    ? 'نقدي'
                    : selectedInvoice.paymentMethod === 'vodafone'
                    ? 'فودوفون كاش'
                    : selectedInvoice.paymentMethod === 'instapay'
                    ? 'انيستا'
                    : selectedInvoice.paymentMethod === 'credit'
                    ? 'آجل'
                    : 'تحويل'}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-300 rounded-xl overflow-hidden mb-4 text-xs">
              <table className="w-full text-right">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-3">الصنف</th>
                    <th className="py-2 px-3">الكمية</th>
                    <th className="py-2 px-3">السعر</th>
                    <th className="py-2 px-3">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {selectedInvoice.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900">{item.productName}</div>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2 px-3 font-mono">
                        {item.unitPrice} {settings.currency}
                      </td>
                      <td className="py-2 px-3 font-mono font-black text-slate-900">
                        {item.total} {settings.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>المجموع الفرعي:</span>
                <span className="font-mono font-bold">
                  {selectedInvoice.subtotal} {settings.currency}
                </span>
              </div>
              {selectedInvoice.discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>الخصم الممنوح:</span>
                  <span className="font-mono font-bold">
                    -{selectedInvoice.discount} {settings.currency}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-black text-slate-900 text-sm border-t border-slate-300 pt-2">
                <span>صافي الفاتورة:</span>
                <span className="font-mono text-amber-800">
                  {selectedInvoice.total} {settings.currency}
                </span>
              </div>
              <div className="flex justify-between text-amber-700 font-bold">
                <span>المبلغ المدفوع:</span>
                <span className="font-mono">
                  {selectedInvoice.paidAmount} {settings.currency}
                </span>
              </div>
              <div className="flex justify-between text-red-600 font-bold">
                <span>المتبقي آجل (دين):</span>
                <span className="font-mono">
                  {selectedInvoice.remainingAmount} {settings.currency}
                </span>
              </div>
            </div>

            {selectedInvoice.notes && (
              <div className="mt-3 p-3 bg-amber-50 rounded-xl text-xs text-amber-900 border border-amber-300">
                <span className="font-bold">ملاحظات:</span> {selectedInvoice.notes}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={() => {
                  setPrintInvoice(selectedInvoice);
                  setSelectedInvoice(null);
                }}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الفاتورة</span>
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl text-xs transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
