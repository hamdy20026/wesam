import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { Customer } from '../types';
import { isWalkInCustomer } from '../data/mockData';
import { VoucherModal } from './VoucherModal';
import { CustomerModal } from './CustomerModal';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  MapPin,
  Receipt,
  Edit,
  Trash2,
  X,
  CreditCard,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Upload,
  FileCheck,
  ShieldCheck,
  Lock
} from 'lucide-react';

interface ParsedImportCustomer extends Omit<Customer, 'id' | 'createdAt'> {
  existingId?: string;
  isValid: boolean;
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

export const Customers: React.FC = () => {
  const {
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    settings,
    setActiveTab,
    openStatement,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Payment Collect Modal
  const [collectingCustomer, setCollectingCustomer] = useState<Customer | null>(null);
  const [collectNotes, setCollectNotes] = useState<string>('');

  // Excel Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importPreview, setImportPreview] = useState<ParsedImportCustomer[]>([]);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  const openAdd = () => {
    setEditingCustomer(null);
    setShowAddModal(true);
  };

  const openEdit = (c: Customer) => {
    if (isWalkInCustomer(c)) return;
    setEditingCustomer(c);
    setShowAddModal(true);
  };

  // Download Sample Excel Template for Customers
  const handleDownloadSampleTemplate = () => {
    const sampleData = [
      {
        'كود العميل': 'CO-101',
        'اسم العميل': 'المقاول حسن الصاوي للمقاولات الكهربائية',
        'رقم الهاتف': '01012345678',
        'العنوان': 'شارع الجمهورية - بجوار المحطة',
        'تصنيف العميل': 'مقاول وتوريدات',
        'الرصيد الحالي (مديونية)': 14500,
        'سقف الائتمان': 50000,
        'ملاحظات': 'عميل منتظم السداد كل أسبوعين',
      },
      {
        'كود العميل': 'CO-102',
        'اسم العميل': 'المهندس كريم عادل للتشطيبات',
        'رقم الهاتف': '01122334455',
        'العنوان': 'الحي الجديد - عمارة 12',
        'تصنيف العميل': 'فني / مهندس',
        'الرصيد الحالي (مديونية)': 3200,
        'سقف الائتمان': 25000,
        'ملاحظات': 'يسحب أسلاك السويدي ومفاتيح فينوس',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'نموذج العملاء');
    XLSX.writeFile(wb, 'نموذج_استيراد_العملاء_والمقاولين.xlsx');
  };

  // Export Current Customers to Excel
  const handleExportCustomersToExcel = () => {
    const exportData = customers.map((c, idx) => ({
      'م': idx + 1,
      'كود العميل': c.code || `CO00${idx + 1}`,
      'اسم العميل': c.name,
      'رقم الهاتف': c.phone,
      'العنوان': c.address || '',
      'تصنيف العميل': c.cropTypes || 'عميل / مقاول',
      'الرصيد الحالي (مديونية)': c.currentBalance,
      'سقف الائتمان': c.creditLimit || 0,
      'ملاحظات': c.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'سجل العملاء');
    XLSX.writeFile(wb, `سجل_العملاء_والمقاولين_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Parse Uploaded Excel File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setIsProcessingFile(true);

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

        const parsed: ParsedImportCustomer[] = rawData.map((row, idx) => {
          const name = String(
            row['اسم العميل'] ||
              row['الاسم'] ||
              row['العميل'] ||
              row['Customer Name'] ||
              row['Name'] ||
              ''
          ).trim();

          const phone = String(
            row['رقم الهاتف'] ||
              row['الهاتف'] ||
              row['التليفون'] ||
              row['الموبايل'] ||
              row['Phone'] ||
              row['Mobile'] ||
              ''
          ).trim();

          const address = String(
            row['العنوان'] || row['المدينة'] || row['المنطقة'] || row['Address'] || ''
          ).trim();

          const code = String(
            row['كود العميل'] || row['الكود'] || row['Code'] || `CO-${100 + idx + 1}`
          ).trim();

          const cropTypes = String(
            row['تصنيف العميل'] ||
              row['النوع'] ||
              row['التصنيف'] ||
              row['Customer Type'] ||
              'عميل / مقاول'
          ).trim();

          const currentBalance =
            parseFloat(
              String(
                row['الرصيد الحالي (مديونية)'] ||
                  row['الرصيد الحالي'] ||
                  row['الرصيد'] ||
                  row['المديونية'] ||
                  row['الرصيد الافتتاحي'] ||
                  row['Balance'] ||
                  0
              )
            ) || 0;

          const creditLimit =
            parseFloat(
              String(row['سقف الائتمان'] || row['حد الائتمان'] || row['Credit Limit'] || 0)
            ) || undefined;

          const notes = String(row['ملاحظات'] || row['Notes'] || 'مستورد من ملف Excel').trim();

          const existing = customers.find(
            c =>
              (name && normalizeArabic(c.name) === normalizeArabic(name)) ||
              (phone && phone.length >= 8 && c.phone === phone)
          );

          return {
            code,
            name,
            phone: phone || '—',
            address,
            cropTypes,
            currentBalance,
            initialBalance: currentBalance,
            creditLimit,
            notes,
            existingId: existing?.id,
            isValid: Boolean(name),
          };
        });

        setImportPreview(parsed);
      } catch (err) {
        console.error('Excel parse error:', err);
      } finally {
        setIsProcessingFile(false);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Execute Import
  const handleExecuteImport = () => {
    const validRows = importPreview.filter(r => r.isValid);
    if (validRows.length === 0) return;

    let added = 0;
    let updated = 0;

    validRows.forEach(item => {
      const { existingId, isValid, ...customerData } = item;
      if (isWalkInCustomer(existingId) || isWalkInCustomer(customerData)) {
        return;
      }
      if (updateExisting && existingId) {
        updateCustomer(existingId, customerData);
        updated++;
      } else {
        addCustomer(customerData);
        added++;
      }
    });

    setImportSuccessMessage(
      `تم استيراد ${added} عميل جديد وتحديث بيانات ${updated} عميل بنجاح!`
    );

    setTimeout(() => {
      setShowImportModal(false);
      setImportSuccessMessage(null);
      setImportPreview([]);
      setImportFileName('');
    }, 1800);
  };

  const filteredCustomers = useMemo(() => {
    const q = normalizeArabic(searchQuery);
    return customers.filter((c: Customer) =>
      !q ||
      normalizeArabic(c.name).includes(q) ||
      c.phone.includes(q) ||
      (c.address && normalizeArabic(c.address).includes(q)) ||
      (c.cropTypes && normalizeArabic(c.cropTypes).includes(q))
    );
  }, [customers, searchQuery]);

  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  const selectableCustomers = useMemo(
    () => filteredCustomers.filter(c => !isWalkInCustomer(c)),
    [filteredCustomers]
  );

  const isAllCustomersSelected = useMemo(() => {
    if (selectableCustomers.length === 0) return false;
    return selectableCustomers.every(c => selectedCustomerIds.includes(c.id));
  }, [selectableCustomers, selectedCustomerIds]);

  const toggleSelectAllCustomers = () => {
    if (isAllCustomersSelected) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(selectableCustomers.map((c: Customer) => c.id));
    }
  };

  const toggleSelectOneCustomer = (id: string) => {
    if (isWalkInCustomer(id)) return;
    setSelectedCustomerIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBatchDeleteCustomers = () => {
    const validIds = selectedCustomerIds.filter(id => !isWalkInCustomer(id));
    if (validIds.length === 0) return;
    if (window.confirm(`هل أنت متأكد من حذف ${validIds.length} عميل محدد نهائياً؟`)) {
      validIds.forEach(id => deleteCustomer(id));
      setSelectedCustomerIds([]);
    }
  };

  const totalDebts = customers.reduce(
    (sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0),
    0
  );

  return (
    <div className="space-y-5 font-sans">
      {/* Header Banner */}
      <div className="bg-white p-4 rounded-2xl border-2 border-slate-400 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-700" />
            <span>سجل العملاء والمقاولين والحسابات الآجلة</span>
          </h2>
          <p className="text-xs font-bold text-slate-600 mt-0.5">
            متابعة حسابات العملاء والمقاولين والمهندسين، تحصيل المديونيات، واستيراد وتصدير البيانات من Excel
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-amber-50 border-2 border-amber-400 px-3.5 py-1.5 rounded-xl text-xs">
            <span className="text-amber-900 font-bold block text-[10px]">إجمالي ديون العملاء:</span>
            <span className="font-black text-amber-950 font-mono text-sm">
              {totalDebts.toLocaleString()} {settings.currency}
            </span>
          </div>

          <button
            onClick={handleExportCustomersToExcel}
            className="bg-slate-800 hover:bg-slate-700 text-white font-black px-3 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
            title="تصدير قائمة العملاء وأرصدتهم إلى ملف إكسيل"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>تصدير لإكسيل</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="bg-slate-800 hover:bg-amber-700 text-white font-black px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-300" />
            <span>استيراد من إكسيل (Excel)</span>
          </button>

          <button
            onClick={openAdd}
            className="bg-amber-600 hover:bg-amber-500 text-white font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة عميل جديد</span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className="bg-rose-600 hover:bg-rose-700 text-white font-black px-3 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="إغلاق والعودة للقائمة الرئيسية"
          >
            <X className="w-4 h-4" />
            <span>الرئيسية</span>
          </button>
        </div>
      </div>

      {/* Search & Batch Action Bar */}
      <div className="bg-white rounded-2xl p-3.5 shadow-sm border-2 border-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="ابحث باسم العميل، رقم الهاتف، العنوان، أو تصنيف العميل..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 border-2 border-slate-500 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-black text-slate-900 focus:outline-none bg-slate-50 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-between sm:justify-start">
          <label className="flex items-center gap-2 text-xs font-black text-slate-800 cursor-pointer bg-slate-100 border border-slate-300 px-3 py-2 rounded-xl">
            <input
              type="checkbox"
              checked={isAllCustomersSelected}
              onChange={toggleSelectAllCustomers}
              className="w-4 h-4 accent-amber-600 cursor-pointer rounded"
            />
            <span>تحديد الكل ({filteredCustomers.length})</span>
          </label>

          {selectedCustomerIds.length > 0 && (
            <button
              onClick={handleBatchDeleteCustomers}
              className="bg-red-600 hover:bg-red-500 text-white font-extrabold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95 text-xs cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف المحدد ({selectedCustomerIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Customers Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredCustomers.map((customer: Customer) => {
          const isPermanentWalkIn = isWalkInCustomer(customer);
          const hasDebt = !isPermanentWalkIn && customer.currentBalance > 0;
          const isSelected = !isPermanentWalkIn && selectedCustomerIds.includes(customer.id);
          return (
            <div
              key={customer.id}
              className={`rounded-xl p-3.5 border-2 transition-all flex flex-col justify-between text-xs ${
                isPermanentWalkIn
                  ? 'bg-amber-50/40 border-amber-600 shadow-sm'
                  : isSelected
                  ? 'bg-amber-50/50 border-amber-500 shadow-md'
                  : 'bg-white border-slate-400 shadow-sm hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-1.5 mb-2">
                  <div className="flex items-start gap-2">
                    {isPermanentWalkIn ? (
                      <div
                        className="w-6 h-6 rounded-lg bg-amber-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs"
                        title="حساب نظام دائم محمي من الحذف والتعديل"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                    ) : (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOneCustomer(customer.id)}
                        className="w-4 h-4 mt-0.5 accent-amber-600 cursor-pointer rounded shrink-0"
                      />
                    )}
                    <div>
                      <h3 className="font-black text-slate-900 text-sm leading-tight flex items-center gap-1.5 flex-wrap">
                        <span>{customer.name}</span>
                        {isPermanentWalkIn && (
                          <span className="bg-amber-700 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                            حساب دائم
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-0.5 font-mono font-bold">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{customer.phone}</span>
                      </div>
                    </div>
                  </div>

                  {isPermanentWalkIn ? (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 text-amber-300 text-[10px] font-black shrink-0"
                      title="هذا الحساب دائم في النظام ومحمي من الحذف والتعديل"
                    >
                      <Lock className="w-3 h-3" />
                      <span>محمي</span>
                    </span>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => openEdit(customer)}
                        className="p-1 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded"
                        title="تعديل بيانات العميل"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`هل أنت متأكد من حذف العميل ${customer.name}؟`)) {
                            deleteCustomer(customer.id);
                          }
                        }}
                        className="p-1 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Customer Details */}
                <div className="space-y-1 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-300 mb-2.5">
                  {customer.address && (
                    <div className="flex items-center gap-1 text-slate-700 font-bold truncate">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">العنوان: {customer.address}</span>
                    </div>
                  )}
                  {isPermanentWalkIn ? (
                    <div className="flex items-center gap-1 text-slate-800 font-black">
                      <Lock className="w-3 h-3 text-amber-700 shrink-0" />
                      <span>نقدي فقط — لا يُسمح بفواتير آجل نهائياً</span>
                    </div>
                  ) : (
                    customer.cropTypes && (
                      <div className="flex items-center gap-1 text-amber-800 font-bold truncate">
                        <Users className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="truncate">{customer.cropTypes}</span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Balance & Actions */}
              <div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100 border border-slate-300 mb-2 text-[11px]">
                  <span className="font-black text-slate-700">رصيد الحساب:</span>
                  <div className="text-left font-mono">
                    {isPermanentWalkIn ? (
                      <span className="font-black text-amber-800">0 (نقدي فوري فقط)</span>
                    ) : hasDebt ? (
                      <span className="font-black text-red-600">
                        عليه {customer.currentBalance.toLocaleString()} {settings.currency}
                      </span>
                    ) : (
                      <span className="font-black text-amber-700">خالص</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {isPermanentWalkIn ? (
                    <div
                      className="bg-slate-200 text-slate-700 font-black py-1.5 rounded-lg text-[10.5px] flex items-center justify-center gap-1 border border-slate-300 select-none"
                      title="لا يسمح بالبيع الآجل أو المديونية لهذا الحساب"
                    >
                      <Lock className="w-3 h-3 text-slate-600" />
                      <span>ممنوع الآجل</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setCollectingCustomer(customer);
                      }}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-black py-1.5 rounded-lg text-[11px] flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                    >
                      <CreditCard className="w-3 h-3" />
                      <span>تحصيل</span>
                    </button>
                  )}
                  <button
                    onClick={() => openStatement('customer', customer.id)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-black py-1.5 rounded-lg text-[11px] flex items-center justify-center gap-1 transition-all border border-slate-400 cursor-pointer"
                  >
                    <Receipt className="w-3 h-3" />
                    <span>كشف حساب</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredCustomers.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border-2 border-dashed border-slate-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-black text-sm">لا يوجد عملاء يطابقون البحث</p>
          </div>
        )}
      </div>

      {/* Collect Debt Payment Modal */}
      <VoucherModal
        isOpen={!!collectingCustomer}
        onClose={() => setCollectingCustomer(null)}
        direction="in"
        defaultPartyType="customer"
        defaultPartyId={collectingCustomer?.id}
        defaultAmount={collectingCustomer?.currentBalance || 0}
        defaultNotes={
          collectNotes ||
          (collectingCustomer ? `سداد دفعة من حساب العميل: ${collectingCustomer.name}` : '')
        }
        onSuccess={() => {
          setCollectingCustomer(null);
          setCollectNotes('');
        }}
      />

      {/* Add / Edit Customer Modal */}
      <CustomerModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingCustomer(null);
        }}
        customer={editingCustomer}
      />

      {/* EXCEL IMPORT MODAL FOR CUSTOMERS */}
      {showImportModal && (
        <div
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          dir="rtl"
        >
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-2 border-slate-500 text-xs">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b-2 border-slate-700">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm sm:text-base">
                  استيراد بيانات وأرصدة العملاء والمقاولين من إكسيل (Excel / CSV)
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview([]);
                  setImportFileName('');
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {importSuccessMessage && (
                <div className="bg-amber-100 border-2 border-amber-500 text-slate-900 p-3 rounded-xl font-black flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>{importSuccessMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <h4 className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5 mb-1">
                      <Download className="w-4 h-4 text-amber-700" />
                      <span>1. تحميل نموذج Excel جاهز للعملاء</span>
                    </h4>
                    <p className="text-[11px] font-bold text-amber-800 leading-relaxed mb-3">
                      يحتوي النموذج على الأعمدة المعتمدة: (اسم العميل، رقم الهاتف، العنوان، التصنيف، الرصيد الحالي، سقف الائتمان، ملاحظات).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadSampleTemplate}
                    className="w-full bg-amber-700 hover:bg-amber-600 text-white font-black py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل نموذج العملاء (.xlsx)</span>
                  </button>
                </div>

                <div className="bg-slate-50 border-2 border-dashed border-slate-500 hover:border-amber-600 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all">
                  <Upload className="w-8 h-8 text-amber-600 mb-2" />
                  <span className="font-black text-slate-900 text-xs">
                    2. اختر ملف إكسيل العملاء (.xlsx / .xls / .csv)
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 mt-1">
                    يتعرف النظام تلقائياً على أعمدة الاسم والهاتف والرصيد والعنوان
                  </span>

                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="mt-3 text-xs file:ml-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-900 file:text-amber-400 hover:file:bg-slate-800 cursor-pointer"
                  />
                  {importFileName && (
                    <span className="mt-2 text-[11px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                      📁 {importFileName}
                    </span>
                  )}
                </div>
              </div>

              {isProcessingFile && (
                <div className="text-center py-6 text-slate-700 font-black flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  <span>جاري قراءة وتحليل بيانات العملاء من ملف الإكسيل...</span>
                </div>
              )}

              {!isProcessingFile && importPreview.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between bg-slate-100 p-3 rounded-xl border-2 border-slate-400">
                    <div className="flex items-center gap-2 font-black text-slate-900">
                      <FileCheck className="w-4 h-4 text-amber-600" />
                      <span>معاينة بيانات العملاء المقروءة ({importPreview.length} سجل)</span>
                    </div>

                    <label className="flex items-center gap-2 text-[11px] font-black text-slate-800 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={updateExisting}
                        onChange={e => setUpdateExisting(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>تحديث أرصدة وبيانات العملاء المسجلين مسبقاً بنفس الاسم أو الهاتف</span>
                    </label>
                  </div>

                  <div className="max-h-60 overflow-y-auto border-2 border-slate-400 rounded-xl">
                    <table className="w-full text-right text-[11px] border-collapse">
                      <thead className="sticky top-0 bg-slate-900 text-white font-black">
                        <tr>
                          <th className="p-2 text-center">م</th>
                          <th className="p-2">اسم العميل</th>
                          <th className="p-2 text-center">رقم الهاتف</th>
                          <th className="p-2">العنوان</th>
                          <th className="p-2 text-center">الرصيد (مديونية)</th>
                          <th className="p-2 text-center">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-bold">
                        {importPreview.map((item, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2 text-center font-mono text-slate-500">{i + 1}</td>
                            <td className="p-2 font-black text-slate-900">{item.name || '—'}</td>
                            <td className="p-2 text-center font-mono text-slate-700">
                              {item.phone}
                            </td>
                            <td className="p-2 text-slate-600">{item.address || '—'}</td>
                            <td className="p-2 text-center font-mono font-black text-red-700">
                              {item.currentBalance.toLocaleString()} {settings.currency}
                            </td>
                            <td className="p-2 text-center">
                              {!item.isValid ? (
                                <span className="bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 rounded-full font-black text-[10px]">
                                  اسم مفقود 🔴
                                </span>
                              ) : item.existingId ? (
                                <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-black text-[10px]">
                                  تحديث عميل 🟡
                                </span>
                              ) : (
                                <span className="bg-amber-100 text-slate-800 border border-amber-300 px-2 py-0.5 rounded-full font-black text-[10px]">
                                  عميل جديد 🟢
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-100 p-4 border-t-2 border-slate-400 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-700 font-black">
                {importPreview.length > 0
                  ? `السجلات الصالحة للاستيراد: ${
                      importPreview.filter(x => x.isValid).length
                    } من أصل ${importPreview.length}`
                  : 'يرجى رفع ملف Excel لبدء المعاينة'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportPreview([]);
                    setImportFileName('');
                  }}
                  className="bg-white hover:bg-slate-200 text-slate-800 border-2 border-slate-400 font-black py-2 px-4 rounded-xl text-xs cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  disabled={importPreview.filter(x => x.isValid).length === 0}
                  onClick={handleExecuteImport}
                  className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-black py-2 px-5 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>تأكيد واستيراد العملاء للنظام</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
