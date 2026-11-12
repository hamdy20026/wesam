import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Printer,
  X,
  Zap,
  Receipt,
  FileText,
  Phone,
  MapPin,
  User as UserIcon,
  Calendar,
  Hash,
  CreditCard,
} from 'lucide-react';

export const PrintInvoiceModal: React.FC = () => {
  const {
    printInvoice,
    setPrintInvoice,
    settings,
    printMode,
    setPrintMode,
    customers,
    currentUser,
  } = useApp();

  if (!printInvoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const isThermal = printMode === 'thermal';

  const customerObj = customers.find(c => c.id === printInvoice.customerId);
  const isWalkIn =
    printInvoice.customerId === 'walk-in' ||
    printInvoice.customerName.trim() === 'عميل نقدي عام';

  const paymentMethodLabel =
    printInvoice.paymentMethod === 'cash'
      ? 'نقدي (كاش)'
      : printInvoice.paymentMethod === 'vodafone'
      ? 'فودافون كاش'
      : printInvoice.paymentMethod === 'instapay'
      ? 'انستا باي'
      : printInvoice.paymentMethod === 'credit'
      ? 'آجل (على الحساب)'
      : 'تحويل بنكي';

  const totalItemsQty = printInvoice.items.reduce((sum, item) => sum + item.quantity, 0);

  const formattedDate = new Date(printInvoice.date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const formattedTime = new Date(printInvoice.date).toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans select-none"
      dir="rtl"
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible !important;
          }
          #printable-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${isThermal ? '80mm' : '100%'} !important;
            max-width: ${isThermal ? '80mm' : '210mm'} !important;
            margin: 0 !important;
            padding: ${isThermal ? '2mm 2.5mm' : '8mm'} !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: 'Cairo', Arial, sans-serif !important;
            font-weight: 800 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          #printable-receipt table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          #printable-receipt th, #printable-receipt td {
            color: #000000 !important;
            border-color: #000000 !important;
            font-weight: 800 !important;
          }
          .no-print {
            display: none !important;
          }
          * {
            color: #000000 !important;
            box-shadow: none !important;
            text-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Modal Card */}
      <div
        className={`bg-white rounded-3xl ${
          isThermal ? 'max-w-xl' : 'max-w-4xl'
        } w-full shadow-2xl border-2 border-amber-900/40 overflow-hidden flex flex-col justify-between max-h-[95vh] transition-all`}
      >
        {/* Modal Header Controls Bar (Hidden during print) */}
        <div className="no-print bg-gradient-to-r from-slate-950 via-amber-950 to-amber-950 text-white px-4 py-3 flex items-center justify-between border-b-2 border-amber-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-sm sm:text-base flex items-center gap-2">
                <span>معاينة طباعة فاتورة الكاشير</span>
                <span className="font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-500/30 text-xs">
                  {printInvoice.invoiceNumber}
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                اختر مقاس الطباعة (بون كاشير حراري 80mm أو فاتورة A4 رسمية)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Mode Toggle */}
            <div className="bg-slate-900/90 p-1 rounded-xl border border-amber-800 flex items-center text-xs font-bold">
              <button
                type="button"
                onClick={() => setPrintMode('thermal')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  isThermal
                    ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>بون كاشير (80mm)</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('a4')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  !isThermal
                    ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>فاتورة A4</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setPrintInvoice(null)}
              className="text-slate-400 hover:text-white p-1.5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="إغلاق المعاينة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div className="overflow-y-auto max-h-[75vh] p-3 sm:p-5 flex justify-center bg-slate-200/80">
          {isThermal ? (
            /* =========================================================
               1. PROFESSIONAL 80MM THERMAL CASHIER RECEIPT DESIGN
               ========================================================= */
            <div
              id="printable-receipt"
              className="w-[375px] bg-white text-slate-950 px-4 py-4 border-2 border-slate-900 shadow-2xl text-right font-sans relative rounded-md"
            >
              {/* Top Decorative Receipt Header */}
              <div className="text-center pb-2.5 border-b-2 border-slate-950">
                <div className="inline-flex items-center justify-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-slate-950 text-amber-400 flex items-center justify-center border border-slate-950 shrink-0">
                    <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
                  </div>
                  <h1 className="font-black text-[19px] text-slate-950 tracking-tight leading-none">
                    {settings.storeName || 'وسام للأدوات الكهربائية'}
                  </h1>
                </div>

                <p className="text-[11px] font-extrabold text-slate-800 leading-tight">
                  تجارة وتوريد الكابلات والأدوات الكهربائية المعتمدة
                </p>

                <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-black text-slate-900">
                  {settings.address && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>{settings.address}</span>
                    </span>
                  )}
                  {settings.phone && (
                    <span className="inline-flex items-center gap-1 font-mono" dir="ltr">
                      <Phone className="w-3 h-3 shrink-0" />
                      <span>{settings.phone}</span>
                    </span>
                  )}
                </div>

                {/* Cashier Receipt Badge */}
                <div className="mt-2 bg-slate-950 text-white py-1 px-3 rounded border border-slate-950 flex items-center justify-between text-[12px] font-black">
                  <span>إيصال مبيعات كاشير</span>
                  <span className="font-mono text-amber-300 text-[13px]">
                    #{printInvoice.invoiceNumber}
                  </span>
                </div>
              </div>

              {/* Structured Receipt Metadata Table (No awkward wrapping) */}
              <div className="my-2 border-2 border-slate-950 rounded overflow-hidden text-[12px]">
                <div className="grid grid-cols-2 divide-x divide-x-reverse divide-slate-950 border-b border-slate-950 bg-slate-50">
                  <div className="px-2 py-1 flex items-center justify-between gap-1">
                    <span className="text-slate-700 font-bold text-[11px]">التاريخ:</span>
                    <span className="font-mono font-black text-slate-950 text-[12px]">
                      {formattedDate}
                    </span>
                  </div>
                  <div className="px-2 py-1 flex items-center justify-between gap-1">
                    <span className="text-slate-700 font-bold text-[11px]">الوقت:</span>
                    <span className="font-mono font-black text-slate-950 text-[12px]">
                      {formattedTime}
                    </span>
                  </div>
                </div>

                <div className="px-2 py-1.5 border-b border-slate-950 flex items-center justify-between gap-2 bg-white">
                  <span className="text-slate-700 font-bold text-[11px] shrink-0">العميل:</span>
                  <span className="font-black text-slate-950 text-[13px] truncate">
                    {printInvoice.customerName}
                  </span>
                </div>

                <div className="grid grid-cols-2 divide-x divide-x-reverse divide-slate-950 bg-slate-50">
                  <div className="px-2 py-1 flex items-center justify-between gap-1">
                    <span className="text-slate-700 font-bold text-[11px]">الدفع:</span>
                    <span className="font-black text-slate-950 text-[11.5px]">
                      {paymentMethodLabel}
                    </span>
                  </div>
                  <div className="px-2 py-1 flex items-center justify-between gap-1">
                    <span className="text-slate-700 font-bold text-[11px]">الكاشير:</span>
                    <span className="font-black text-slate-950 text-[11.5px] truncate">
                      {currentUser?.name || 'المدير العام'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Bordered Table */}
              <div className="my-2">
                <table className="w-full text-right border-2 border-slate-950 border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-slate-950 text-white text-[13px] font-black border-b-2 border-slate-950">
                      <th className="py-1.5 px-1.5 border-l border-slate-700 text-center w-6">م</th>
                      <th className="py-1.5 px-2 border-l border-slate-700">الصنف</th>
                      <th className="py-1.5 px-1.5 border-l border-slate-700 text-center whitespace-nowrap">
                        الكمية
                      </th>
                      <th className="py-1.5 px-1.5 border-l border-slate-700 text-center whitespace-nowrap">
                        السعر
                      </th>
                      <th className="py-1.5 px-1.5 text-center whitespace-nowrap">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-950 text-[13px] font-bold">
                    {printInvoice.items.map((item, idx) => (
                      <tr key={idx} className="even:bg-slate-50/80 text-[13px]">
                        <td className="py-1.5 px-1 border-l border-slate-950 text-center font-mono font-black text-[13px]">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-1.5 border-l border-slate-950">
                          <div className="font-black text-slate-950 text-[13px] leading-snug">
                            {item.productName}
                          </div>
                          {(item.discount || 0) > 0 && (
                            <div className="text-[11px] font-bold text-slate-700 font-mono">
                              خصم وحدة: {item.discount}
                              {item.discountType === 'percent' ? '%' : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-1.5 px-1 border-l border-slate-950 text-center font-mono font-black text-slate-950 text-[13px] whitespace-nowrap">
                          {item.quantity}
                        </td>
                        <td className="py-1.5 px-1.5 border-l border-slate-950 text-center font-mono font-black text-slate-950 text-[13px] whitespace-nowrap">
                          {item.unitPrice.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-1.5 text-center font-mono font-black text-slate-950 text-[13px] whitespace-nowrap">
                          {item.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals Summary Table (High-Contrast Cashier Style) */}
              <div className="border-2 border-slate-950 rounded overflow-hidden text-[12.5px]">
                <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-slate-950 bg-slate-50 font-bold">
                  <span>إجمالي الأصناف ({printInvoice.items.length} صنف / {totalItemsQty} وحدة):</span>
                  <span className="font-mono font-black text-slate-950 whitespace-nowrap">
                    {printInvoice.subtotal.toLocaleString()} {settings.currency}
                  </span>
                </div>

                {printInvoice.discount > 0 && (
                  <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-slate-950 bg-white font-bold text-rose-800">
                    <span>الخصم الممنوح:</span>
                    <span className="font-mono font-black whitespace-nowrap">
                      -{printInvoice.discount.toLocaleString()} {settings.currency}
                    </span>
                  </div>
                )}

                {/* Net Total Highlight Row (Single Line Guaranteed) */}
                <div className="px-3 py-2 bg-slate-950 text-white flex items-center justify-between border-b-2 border-slate-950">
                  <span className="font-black text-[14px]">صافي الفاتورة النهائي:</span>
                  <span className="font-mono font-black text-[18px] text-amber-300 whitespace-nowrap">
                    {printInvoice.total.toLocaleString()} {settings.currency}
                  </span>
                </div>

                <div className="px-2.5 py-1.5 flex items-center justify-between bg-white font-bold">
                  <span>المبلغ المدفوع ({paymentMethodLabel}):</span>
                  <span className="font-mono font-black text-slate-800 text-[13.5px] whitespace-nowrap">
                    {printInvoice.paidAmount.toLocaleString()} {settings.currency}
                  </span>
                </div>

                {printInvoice.remainingAmount > 0 && (
                  <div className="px-2.5 py-1.5 flex items-center justify-between border-t border-slate-950 bg-rose-50 font-black text-rose-900">
                    <span>المتبقي آجل (على الحساب):</span>
                    <span className="font-mono font-black text-[13.5px] whitespace-nowrap">
                      {printInvoice.remainingAmount.toLocaleString()} {settings.currency}
                    </span>
                  </div>
                )}

                {!isWalkIn && customerObj && (
                  <div className="px-2.5 py-1.5 flex items-center justify-between border-t border-slate-950 bg-slate-100 font-bold text-[11.5px]">
                    <span>إجمالي الرصيد الحالي للعميل:</span>
                    <span className="font-mono font-black text-slate-950 whitespace-nowrap">
                      {customerObj.currentBalance.toLocaleString()} {settings.currency}
                    </span>
                  </div>
                )}
              </div>

              {printInvoice.notes && (
                <div className="mt-2 p-2 border border-dashed border-slate-900 rounded bg-slate-50 text-[11px] font-bold">
                  <span className="font-black">ملاحظات: </span>
                  <span>{printInvoice.notes}</span>
                </div>
              )}

              {/* Graphic Barcode & Footer */}
              <div className="mt-3 pt-2.5 border-t-2 border-dashed border-slate-900 text-center flex flex-col items-center">
                {/* Simulated Barcode Lines */}
                <div
                  className="h-7 w-48 bg-[repeating-linear-gradient(90deg,#000,#000_2px,transparent_2px,transparent_4px,#000_4px,#000_5px,transparent_5px,transparent_8px)] opacity-90"
                  aria-hidden="true"
                />
                <div className="font-mono text-[11px] font-black tracking-widest text-slate-950 mt-0.5">
                  *{printInvoice.invoiceNumber}*
                </div>
                <p className="text-[11.5px] font-black text-slate-900 mt-1">
                  {settings.invoiceFooterNote ||
                    'شكراً لتعاملكم معنا - وسام للأدوات الكهربائية'}
                </p>
              </div>
            </div>
          ) : (
            /* =========================================================
               2. FORMAL COMMERCIAL A4 INVOICE DESIGN
               ========================================================= */
            <div
              id="printable-receipt"
              className="w-full max-w-3xl bg-white text-slate-950 p-6 sm:p-8 border-2 border-slate-900 shadow-2xl text-right font-sans rounded-xl"
            >
              {/* A4 Top Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b-2 border-slate-950">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center border-2 border-slate-950 shrink-0">
                    <Zap className="w-7 h-7 fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <h1 className="font-black text-2xl text-slate-950">
                      {settings.storeName || 'وسام للأدوات الكهربائية'}
                    </h1>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">
                      تجارة وتوريد الكابلات والأدوات الكهربائية المعتمدة
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-800 mt-1">
                      {settings.address && <span>العنوان: {settings.address}</span>}
                      {settings.phone && <span dir="ltr">هاتف: {settings.phone}</span>}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 text-white px-5 py-3 rounded-2xl border-2 border-slate-950 text-center self-stretch sm:self-auto flex flex-col justify-center">
                  <span className="text-xs font-bold text-amber-300">فاتورة مبيعات</span>
                  <span className="font-mono font-black text-lg tracking-wider mt-0.5">
                    {printInvoice.invoiceNumber}
                  </span>
                </div>
              </div>

              {/* A4 Customer & Invoice Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4 text-xs">
                <div className="border-2 border-slate-900 rounded-xl p-3 bg-slate-50 space-y-1.5">
                  <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                    <span className="text-slate-600 font-bold flex items-center gap-1">
                      <UserIcon className="w-3.5 h-3.5" />
                      <span>السيد / العميل:</span>
                    </span>
                    <span className="font-black text-slate-950 text-sm">
                      {printInvoice.customerName}
                    </span>
                  </div>
                  {customerObj?.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-bold">رقم الهاتف:</span>
                      <span className="font-mono font-black">{customerObj.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-bold flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>طريقة السداد:</span>
                    </span>
                    <span className="font-black text-slate-950">{paymentMethodLabel}</span>
                  </div>
                </div>

                <div className="border-2 border-slate-900 rounded-xl p-3 bg-slate-50 space-y-1.5">
                  <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                    <span className="text-slate-600 font-bold flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5" />
                      <span>رقم الفاتورة:</span>
                    </span>
                    <span className="font-mono font-black text-slate-950 text-sm">
                      {printInvoice.invoiceNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-bold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>التاريخ والوقت:</span>
                    </span>
                    <span className="font-mono font-black text-slate-950">
                      {formattedDate} - {formattedTime}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-bold">مسؤول المبيعات:</span>
                    <span className="font-black text-slate-950">
                      {currentUser?.name || 'المدير العام'}
                    </span>
                  </div>
                </div>
              </div>

              {/* A4 Detailed Items Table */}
              <div className="my-4">
                <table className="w-full text-right text-xs border-2 border-slate-950 border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-white font-black text-xs border-b-2 border-slate-950">
                      <th className="py-2.5 px-2 border-l border-slate-700 text-center w-10">م</th>
                      <th className="py-2.5 px-3 border-l border-slate-700">اسم الصنف والبيان</th>
                      <th className="py-2.5 px-2 border-l border-slate-700 text-center">الوحدة</th>
                      <th className="py-2.5 px-2 border-l border-slate-700 text-center">الكمية</th>
                      <th className="py-2.5 px-2 border-l border-slate-700 text-center">
                        سعر الوحدة
                      </th>
                      <th className="py-2.5 px-2 border-l border-slate-700 text-center">الخصم</th>
                      <th className="py-2.5 px-3 text-center">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 font-bold text-xs">
                    {printInvoice.items.map((item, idx) => (
                      <tr key={idx} className="even:bg-slate-50">
                        <td className="py-2 px-2 border-l border-slate-900 text-center font-mono font-black">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 border-l border-slate-900 font-black text-slate-950 text-sm">
                          {item.productName}
                        </td>
                        <td className="py-2 px-2 border-l border-slate-900 text-center font-bold">
                          {item.unit || 'قطعة'}
                        </td>
                        <td className="py-2 px-2 border-l border-slate-900 text-center font-mono font-black text-sm">
                          {item.quantity}
                        </td>
                        <td className="py-2 px-2 border-l border-slate-900 text-center font-mono font-black text-sm">
                          {item.unitPrice.toLocaleString()}
                        </td>
                        <td className="py-2 px-2 border-l border-slate-900 text-center font-mono font-bold">
                          {(item.discount || 0) > 0
                            ? `${item.discount}${item.discountType === 'percent' ? '%' : ''}`
                            : '-'}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-black text-slate-950 text-sm whitespace-nowrap">
                          {item.total.toLocaleString()} {settings.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* A4 Totals & Signatures */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start mt-4">
                <div className="sm:col-span-6 space-y-3 text-xs">
                  {printInvoice.notes && (
                    <div className="p-3 border-2 border-slate-900 rounded-xl bg-slate-50">
                      <span className="font-black block mb-1">ملاحظات الفاتورة:</span>
                      <p className="font-bold text-slate-800">{printInvoice.notes}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 pt-6 text-center font-black text-xs text-slate-800">
                    <div className="border-t-2 border-dashed border-slate-900 pt-2">
                      توقيع المستلم
                    </div>
                    <div className="border-t-2 border-dashed border-slate-900 pt-2">
                      توقيع المسؤول / الختم
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-6 border-2 border-slate-950 rounded-xl overflow-hidden text-xs">
                  <div className="px-3 py-2 flex justify-between border-b border-slate-900 bg-slate-50 font-bold">
                    <span>المجموع الفرعي:</span>
                    <span className="font-mono font-black text-sm">
                      {printInvoice.subtotal.toLocaleString()} {settings.currency}
                    </span>
                  </div>
                  {printInvoice.discount > 0 && (
                    <div className="px-3 py-2 flex justify-between border-b border-slate-900 bg-white font-bold text-rose-800">
                      <span>إجمالي الخصم:</span>
                      <span className="font-mono font-black text-sm">
                        -{printInvoice.discount.toLocaleString()} {settings.currency}
                      </span>
                    </div>
                  )}
                  <div className="px-3.5 py-2.5 flex justify-between bg-slate-950 text-white border-b border-slate-950">
                    <span className="font-black text-sm">صافي إجمالي الفاتورة:</span>
                    <span className="font-mono font-black text-lg text-amber-300 whitespace-nowrap">
                      {printInvoice.total.toLocaleString()} {settings.currency}
                    </span>
                  </div>
                  <div className="px-3 py-2 flex justify-between bg-white font-bold">
                    <span>المبلغ المسدد:</span>
                    <span className="font-mono font-black text-sm text-slate-800">
                      {printInvoice.paidAmount.toLocaleString()} {settings.currency}
                    </span>
                  </div>
                  {printInvoice.remainingAmount > 0 && (
                    <div className="px-3 py-2 flex justify-between border-t border-slate-900 bg-rose-50 font-black text-rose-900">
                      <span>المتبقي آجل:</span>
                      <span className="font-mono font-black text-sm">
                        {printInvoice.remainingAmount.toLocaleString()} {settings.currency}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-3 border-t-2 border-slate-900 text-center text-xs font-black text-slate-800">
                {settings.invoiceFooterNote ||
                  'شكراً لتعاملكم معنا - وسام للأدوات الكهربائية'}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Bar (Hidden during print) */}
        <div className="no-print bg-slate-900 text-white p-3.5 flex items-center gap-3 border-t-2 border-amber-900/80">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black py-3 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 cursor-pointer"
          >
            <Printer className="w-5 h-5 text-slate-950" />
            <span>طباعة الفاتورة الآن (Ctrl + P)</span>
          </button>
          <button
            type="button"
            onClick={() => setPrintInvoice(null)}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-2xl text-xs sm:text-sm border border-slate-700 transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
