import React, { useState, useMemo, useEffect } from 'react';
import { Product, Customer, SalesInvoice } from '../types';
import {
  History,
  X,
  Check,
  User,
  Package,
  Receipt,
  TrendingDown,
  TrendingUp,
  Tag,
  CornerDownLeft
} from 'lucide-react';

interface CustomerLastPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  customer: Customer | null;
  customerId: string;
  customerNameLabel: string;
  salesInvoices: SalesInvoice[];
  onApplyPrice: (unitPrice: number, discount?: number, discountType?: 'fixed' | 'percent') => void;
}

interface PriceHistoryRow {
  invoiceId: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  discountType: 'fixed' | 'percent';
  netUnitPrice: number;
  lineTotal: number;
  paymentMethod: string;
  isCurrentCustomer: boolean;
}

const normalizeArabic = (str: string) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
};

export const CustomerLastPriceModal: React.FC<CustomerLastPriceModalProps> = ({
  isOpen,
  onClose,
  product,
  customer,
  customerId,
  customerNameLabel,
  salesInvoices,
  onApplyPrice,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Build history rows for this product across all non-cancelled sales invoices
  const { customerRows, otherCustomerRows, allSelectableRows } = useMemo(() => {
    if (!product) {
      return { customerRows: [], otherCustomerRows: [], allSelectableRows: [] };
    }

    const normProdName = normalizeArabic(product.name);
    const normCustName = normalizeArabic(customer?.name || customerNameLabel || '');
    const isWalkIn = !customerId || customerId === 'walk-in';

    const matchedCustomer: PriceHistoryRow[] = [];
    const matchedOthers: PriceHistoryRow[] = [];

    const sortedInvoices = [...(salesInvoices || [])]
      .filter(inv => inv.status !== 'cancelled')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    sortedInvoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        const isSameProduct =
          item.productId === product.id ||
          (item.productName && normalizeArabic(item.productName) === normProdName);

        if (!isSameProduct) return;

        const netUnitPrice =
          item.quantity > 0
            ? Math.round((item.total / item.quantity) * 100) / 100
            : item.unitPrice;

        const belongsToCurrentCustomer = isWalkIn
          ? inv.customerId === 'walk-in'
          : inv.customerId === customerId ||
            (normCustName.length > 2 && normalizeArabic(inv.customerName) === normCustName);

        const row: PriceHistoryRow = {
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          date: inv.date,
          customerId: inv.customerId,
          customerName: inv.customerName,
          quantity: item.quantity,
          unit: item.unit || product.unit,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          discountType: item.discountType || 'fixed',
          netUnitPrice,
          lineTotal: item.total,
          paymentMethod: inv.paymentMethod,
          isCurrentCustomer: belongsToCurrentCustomer,
        };

        if (belongsToCurrentCustomer) {
          matchedCustomer.push(row);
        } else {
          matchedOthers.push(row);
        }
      });
    });

    const combined = [...matchedCustomer, ...matchedOthers];
    return {
      customerRows: matchedCustomer,
      otherCustomerRows: matchedOthers,
      allSelectableRows: combined,
    };
  }, [product, customer, customerId, customerNameLabel, salesInvoices]);

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
    }
  }, [isOpen, product?.id, customerId]);

  // Keyboard navigation inside the F10 modal (ArrowUp, ArrowDown, Enter, Escape, F10)
  useEffect(() => {
    if (!isOpen || !product) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'F10') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        if (allSelectableRows.length > 0) {
          setSelectedIndex(prev => (prev < allSelectableRows.length - 1 ? prev + 1 : 0));
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        if (allSelectableRows.length > 0) {
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : allSelectableRows.length - 1));
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const chosen = allSelectableRows[selectedIndex] || customerRows[0];
        if (chosen) {
          onApplyPrice(chosen.unitPrice, chosen.discount, chosen.discountType);
          onClose();
        } else {
          onApplyPrice(product.sellingPrice, 0, 'fixed');
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, product, allSelectableRows, customerRows, selectedIndex, onApplyPrice, onClose]);

  if (!isOpen || !product) return null;

  const latestCustomerDeal = customerRows[0] || null;
  const minCustomerPrice =
    customerRows.length > 0
      ? Math.min(...customerRows.map(r => r.netUnitPrice))
      : null;
  const maxCustomerPrice =
    customerRows.length > 0
      ? Math.max(...customerRows.map(r => r.netUnitPrice))
      : null;
  const totalCustomerQty = customerRows.reduce((sum, r) => sum + r.quantity, 0);

  const getPaymentLabel = (method: string) => {
    if (method === 'cash') return 'نقدي';
    if (method === 'credit') return 'آجل';
    if (method === 'vodafone') return 'فودافون كاش';
    if (method === 'instapay') return 'انستا باي';
    return 'تحويل';
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 font-sans select-none"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-4xl rounded-2xl border-2 border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* TOP HEADER */}
        <div className="bg-gradient-to-r from-slate-950 via-amber-950 to-slate-900 text-white px-4 py-3 border-b-2 border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-white">
                  قائمة آخر سعر للعميل من هذا الصنف
                </h3>
                <span className="bg-amber-400 text-slate-950 text-[11px] font-mono font-black px-2 py-0.5 rounded-md">
                  اختصار الكيبورد: F10
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-300 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1 text-amber-300">
                  <Package className="w-3.5 h-3.5" />
                  <span>الصنف: {product.name}</span>
                </span>
                <span className="text-slate-500">|</span>
                <span className="flex items-center gap-1 text-amber-300">
                  <User className="w-3.5 h-3.5" />
                  <span>العميل: {customer ? customer.name : customerNameLabel}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-[11px] font-bold bg-slate-800 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700">
              الأسهم ↑↓ للتنقل • Enter لتطبيق السعر • Esc للإغلاق
            </span>
            <button
              type="button"
              onClick={onClose}
              className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer shadow-sm"
            >
              <X className="w-4 h-4" />
              <span>إغلاق</span>
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-4 flex-1 bg-slate-50">
          {/* 1. SUMMARY CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Last Customer Price Card */}
            <div className="bg-amber-50 p-3 rounded-xl border-2 border-amber-600 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-900">
                  آخر سعر بيع للعميل
                </span>
                <Tag className="w-4 h-4 text-amber-700" />
              </div>
              {latestCustomerDeal ? (
                <>
                  <div className="text-lg sm:text-xl font-black font-mono text-amber-800 my-1">
                    {latestCustomerDeal.netUnitPrice.toLocaleString()}
                  </div>
                  <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-slate-800">
                    <span>فاتورة: {latestCustomerDeal.invoiceNumber}</span>
                    <span>
                      ({new Date(latestCustomerDeal.date).toLocaleDateString('ar-EG')})
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm font-black text-slate-500 my-1.5">
                    لا توجد سابقة شراء
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">
                    لم يسبق لهذا العميل شراء الصنف
                  </span>
                </>
              )}
            </div>

            {/* Min / Max Price for Customer */}
            <div className="bg-white p-3 rounded-xl border-2 border-slate-500 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-700">
                  أقل / أعلى سعر للعميل
                </span>
                <TrendingDown className="w-4 h-4 text-amber-600" />
              </div>
              {minCustomerPrice !== null && maxCustomerPrice !== null ? (
                <>
                  <div className="text-sm sm:text-base font-black font-mono text-slate-900 my-1">
                    {minCustomerPrice.toLocaleString()} — {maxCustomerPrice.toLocaleString()}
                  </div>
                  <span className="text-[10px] font-bold text-amber-700">
                    إجمالي مسحوبات العميل: {totalCustomerQty} {product.unit} ({customerRows.length}{' '}
                    فاتورة)
                  </span>
                </>
              ) : (
                <>
                  <div className="text-sm font-black text-slate-400 my-1.5">—</div>
                  <span className="text-[10px] font-bold text-slate-400">
                    إجمالي المسحوبات السابقة: 0 {product.unit}
                  </span>
                </>
              )}
            </div>

            {/* Current System Selling & Wholesale Price */}
            <div
              onClick={() => {
                onApplyPrice(product.sellingPrice, 0, 'fixed');
                onClose();
              }}
              className="cursor-pointer bg-amber-50 hover:bg-amber-100/80 p-3 rounded-xl border-2 border-amber-500 shadow-xs flex flex-col justify-between transition-colors"
              title="اضغط لتطبيق سعر البيع الحالي بالنظام"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-amber-950">
                  سعر البيع الحالي بالنظام
                </span>
                <TrendingUp className="w-4 h-4 text-amber-700" />
              </div>
              <div className="text-lg sm:text-xl font-black font-mono text-amber-900 my-1">
                {product.sellingPrice.toLocaleString()}
              </div>
              <span className="text-[10px] font-bold text-amber-800">
                {product.wholesalePrice
                  ? `سعر الجملة: ${product.wholesalePrice.toLocaleString()} | رصيد: ${product.quantity}`
                  : `الرصيد بالمخزن: ${product.quantity} ${product.unit}`}
              </span>
            </div>

            {/* Purchase Cost Reference */}
            <div className="bg-slate-900 text-white p-3 rounded-xl border-2 border-slate-700 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-rose-300">
                سعر التكلفة (الشراء)
              </span>
              <div className="text-lg sm:text-xl font-black font-mono text-white my-1">
                {product.purchasePrice.toLocaleString()}
              </div>
              <span className="text-[10px] font-bold text-slate-300">
                الوحدة: {product.unit} | ربح النظام:{' '}
                {Math.round((product.sellingPrice - product.purchasePrice) * 100) / 100}
              </span>
            </div>
          </div>

          {/* 2. PRIMARY TABLE: CUSTOMER'S OWN HISTORY FOR THIS PRODUCT */}
          <div className="bg-white rounded-2xl border-2 border-slate-500 shadow-xs overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black">
                <Receipt className="w-4 h-4 text-amber-400" />
                <span>
                  سجل أسعار بيع الصنف للعميل: ({customer ? customer.name : customerNameLabel})
                </span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full text-[11px] font-mono">
                  {customerRows.length} حركة
                </span>
              </div>
              {latestCustomerDeal && (
                <button
                  type="button"
                  onClick={() => {
                    onApplyPrice(
                      latestCustomerDeal.unitPrice,
                      latestCustomerDeal.discount,
                      latestCustomerDeal.discountType
                    );
                    onClose();
                  }}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>اعتماد آخر سعر للعميل ({latestCustomerDeal.netUnitPrice}) ↵</span>
                </button>
              )}
            </div>

            {customerRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-900 font-black border-b-2 border-slate-300">
                    <tr>
                      <th className="py-2 px-2.5 text-center w-10">م</th>
                      <th className="py-2 px-3">رقم الفاتورة</th>
                      <th className="py-2 px-3 text-center">تاريخ البيع</th>
                      <th className="py-2 px-2.5 text-center">الكمية</th>
                      <th className="py-2 px-2.5 text-center">سعر الوحدة</th>
                      <th className="py-2 px-2.5 text-center">الخصم</th>
                      <th className="py-2 px-3 text-center bg-amber-50 text-slate-900">
                        السعر الصافي للعميل
                      </th>
                      <th className="py-2 px-2.5 text-center">إجمالي السطر</th>
                      <th className="py-2 px-2.5 text-center">طريقة الدفع</th>
                      <th className="py-2 px-3 text-center">تطبيق السعر</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-bold">
                    {customerRows.map((row, idx) => {
                      const isHighlighted = selectedIndex === idx;
                      const isLatest = idx === 0;
                      return (
                        <tr
                          key={`${row.invoiceId}-${idx}`}
                          onClick={() => {
                            onApplyPrice(row.unitPrice, row.discount, row.discountType);
                            onClose();
                          }}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`cursor-pointer transition-colors ${
                            isHighlighted
                              ? 'bg-slate-800 text-white font-black'
                              : isLatest
                              ? 'bg-amber-50/70 hover:bg-amber-100/70 text-slate-900'
                              : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <td className="py-2.5 px-2.5 text-center font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-black">
                            <div className="flex items-center gap-1.5">
                              <span>{row.invoiceNumber}</span>
                              {isLatest && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-black ${
                                    isHighlighted
                                      ? 'bg-amber-400 text-slate-950'
                                      : 'bg-amber-600 text-white'
                                  }`}
                                >
                                  آخر سعر
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            {new Date(row.date).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="py-2.5 px-2.5 text-center font-mono font-black">
                            {row.quantity} {row.unit}
                          </td>
                          <td className="py-2.5 px-2.5 text-center font-mono">
                            {row.unitPrice.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2.5 text-center font-mono">
                            {row.discount > 0
                              ? `${row.discount}${row.discountType === 'percent' ? '%' : ''}`
                              : '0'}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-center font-mono font-black text-sm ${
                              isHighlighted
                                ? 'bg-slate-800 text-amber-300'
                                : 'bg-amber-50/90 text-slate-800'
                            }`}
                          >
                            {row.netUnitPrice.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2.5 text-center font-mono">
                            {row.lineTotal.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                isHighlighted
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-100 text-slate-700 border border-slate-300'
                              }`}
                            >
                              {getPaymentLabel(row.paymentMethod)}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                onApplyPrice(row.unitPrice, row.discount, row.discountType);
                                onClose();
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-black inline-flex items-center gap-1 cursor-pointer ${
                                isHighlighted
                                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                                  : 'bg-amber-600 hover:bg-amber-700 text-white'
                              }`}
                            >
                              <CornerDownLeft className="w-3 h-3" />
                              <span>اختيار السعر</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center space-y-1">
                <p className="text-slate-700 font-black text-xs sm:text-sm">
                  لم يسبق للعميل ({customer ? customer.name : customerNameLabel}) شراء هذا الصنف في فواتير سابقة.
                </p>
                <p className="text-slate-500 font-bold text-xs">
                  يمكنك الاطلاع بالأسفل على آخر أسعار بيع هذا الصنف للعملاء الآخرين أو اعتماد سعر النظام الحالي ({product.sellingPrice}).
                </p>
              </div>
            )}
          </div>

          {/* 3. SECONDARY TABLE: OTHER CUSTOMERS' LAST PRICES FOR THIS PRODUCT */}
          {otherCustomerRows.length > 0 && (
            <div className="bg-white rounded-2xl border-2 border-slate-400 shadow-xs overflow-hidden">
              <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black">
                  <History className="w-4 h-4 text-amber-400" />
                  <span>آخر أسعار بيع نفس الصنف لعملاء آخرين (للاسترشاد والمقارنة)</span>
                </div>
                <span className="text-[11px] font-mono text-slate-300">
                  {otherCustomerRows.length} فاتورة سابقة
                </span>
              </div>

              <div className="overflow-x-auto max-h-48">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-800 font-black border-b border-slate-300 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">اسم العميل</th>
                      <th className="py-2 px-2.5">رقم الفاتورة</th>
                      <th className="py-2 px-2.5 text-center">التاريخ</th>
                      <th className="py-2 px-2.5 text-center">الكمية</th>
                      <th className="py-2 px-3 text-center">السعر الصافي</th>
                      <th className="py-2 px-3 text-center">تطبيق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-bold">
                    {otherCustomerRows.map((row, i) => {
                      const globalIdx = customerRows.length + i;
                      const isHighlighted = selectedIndex === globalIdx;
                      return (
                        <tr
                          key={`other-${row.invoiceId}-${i}`}
                          onClick={() => {
                            onApplyPrice(row.unitPrice, row.discount, row.discountType);
                            onClose();
                          }}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={`cursor-pointer transition-colors ${
                            isHighlighted
                              ? 'bg-slate-800 text-white font-black'
                              : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <td className="py-2 px-3 font-black">{row.customerName}</td>
                          <td className="py-2 px-2.5 font-mono">{row.invoiceNumber}</td>
                          <td className="py-2 px-2.5 text-center font-mono">
                            {new Date(row.date).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono">
                            {row.quantity} {row.unit}
                          </td>
                          <td
                            className={`py-2 px-3 text-center font-mono font-black ${
                              isHighlighted ? 'text-amber-300' : 'text-amber-800'
                            }`}
                          >
                            {row.netUnitPrice.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                onApplyPrice(row.unitPrice, row.discount, row.discountType);
                                onClose();
                              }}
                              className={`px-2 py-0.5 rounded text-[11px] font-black cursor-pointer ${
                                isHighlighted
                                  ? 'bg-amber-400 text-slate-950'
                                  : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
                              }`}
                            >
                              تطبيق السعر
                            </button>
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

        {/* FOOTER */}
        <div className="bg-slate-900 text-white px-4 py-2.5 border-t-2 border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-slate-300 font-bold">
            💡 اضغط <kbd className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded border border-slate-600 font-mono">Enter</kbd> أو انقر على أي سطر لتطبيق السعر مباشرة في خانة السعر بالفاتورة.
          </div>
          <div className="flex items-center gap-2">
            {latestCustomerDeal && (
              <button
                type="button"
                onClick={() => {
                  onApplyPrice(
                    latestCustomerDeal.unitPrice,
                    latestCustomerDeal.discount,
                    latestCustomerDeal.discountType
                  );
                  onClose();
                }}
                className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-1.5 rounded-xl font-black cursor-pointer"
              >
                اعتماد آخر سعر للعميل ({latestCustomerDeal.netUnitPrice})
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded-xl font-black border border-slate-600 cursor-pointer"
            >
              إغلاق (Esc)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
