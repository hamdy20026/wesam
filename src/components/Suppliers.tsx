import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { Supplier } from '../types';
import { VoucherModal } from './VoucherModal';
import { SupplierModal } from './SupplierModal';
import {
  Building2,
  PlusCircle,
  Search,
  Phone,
  MapPin,
  User,
  CreditCard,
  Edit,
  Trash2,
  X,
  Receipt,
  FileSpreadsheet,
  Download,
  Upload,
  FileCheck,
  CheckCircle2
} from 'lucide-react';

interface ParsedImportSupplier extends Omit<Supplier, 'id' | 'createdAt'> {
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

export const Suppliers: React.FC = () => {
  const {
    suppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    settings,
    setActiveTab,
    openStatement,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Payment Modal
  const [payingSupplier, setPayingSupplier] = useState<Supplier | null>(null);
  const [payNotes, setPayNotes] = useState<string>('');

  // Excel Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importPreview, setImportPreview] = useState<ParsedImportSupplier[]>([]);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  const openAdd = () => {
    setEditingSupplier(null);
    setShowAddModal(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setShowAddModal(true);
  };

  // Download Sample Excel Template for Suppliers
  const handleDownloadSampleTemplate = () => {
    const sampleData = [
      {
        'اسم الشركة / المورد': 'شركة السويدي للكابلات والأسلاك (التوكيل الرئيسي)',
        'اسم المندوب': 'م. طارق المنشاوي',
        'رقم الهاتف': '01099887766',
        'العنوان': 'المنطقة الصناعية - العاشر من رمضان',
        'الأصناف الموردة': 'أسلاك وكابلات نحاس معتمدة',
        'الرصيد المستحق للمورد': 45000,
        'ملاحظات': 'توريد أسبوعي كل يوم أحد',
      },
      {
        'اسم الشركة / المورد': 'شركة فينوس للصناعات الكهربائية والإنارة',
        'اسم المندوب': 'أ. محمود عبد السلام',
        'رقم الهاتف': '01233445566',
        'العنوان': 'مدينة نصر - القاهرة',
        'الأصناف الموردة': 'مفاتيح وبرايز ولمبات ليد',
        'الرصيد المستحق للمورد': 18500,
        'ملاحظات': 'خصم إضافي 3% عند السداد النقدي',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'نموذج الموردين');
    XLSX.writeFile(wb, 'نموذج_استيراد_الموردين_والشركات.xlsx');
  };

  // Export Current Suppliers to Excel
  const handleExportSuppliersToExcel = () => {
    const exportData = suppliers.map((s, idx) => ({
      'م': idx + 1,
      'اسم الشركة / المورد': s.name,
      'اسم المندوب': s.representativeName || '',
      'رقم الهاتف': s.phone,
      'العنوان': s.address || '',
      'الأصناف الموردة': s.suppliedCategories || '',
      'الرصيد المستحق للمورد': s.currentBalance,
      'ملاحظات': s.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'سجل الموردين');
    XLSX.writeFile(wb, `سجل_الموردين_والشركات_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

        const parsed: ParsedImportSupplier[] = rawData.map(row => {
          const name = String(
            row['اسم الشركة / المورد'] ||
              row['اسم الشركة'] ||
              row['اسم المورد'] ||
              row['المورد'] ||
              row['الاسم'] ||
              row['Supplier Name'] ||
              row['Company Name'] ||
              row['Name'] ||
              ''
          ).trim();

          const representativeName = String(
            row['اسم المندوب'] ||
              row['المندوب'] ||
              row['مسؤول المبيعات'] ||
              row['Representative'] ||
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
            row['العنوان'] || row['المدينة'] || row['المقر'] || row['Address'] || ''
          ).trim();

          const suppliedCategories = String(
            row['الأصناف الموردة'] ||
              row['التصنيف'] ||
              row['المنتجات'] ||
              row['Categories'] ||
              ''
          ).trim();

          const currentBalance =
            parseFloat(
              String(
                row['الرصيد المستحق للمورد'] ||
                  row['الرصيد الحالي'] ||
                  row['الرصيد'] ||
                  row['المستحق'] ||
                  row['المديونية'] ||
                  row['Balance'] ||
                  0
              )
            ) || 0;

          const notes = String(row['ملاحظات'] || row['Notes'] || 'مستورد من ملف Excel').trim();

          const existing = suppliers.find(
            s =>
              (name && normalizeArabic(s.name) === normalizeArabic(name)) ||
              (phone && phone.length >= 8 && s.phone === phone)
          );

          return {
            name,
            companyName: name,
            representativeName,
            phone: phone || '—',
            address,
            suppliedCategories,
            initialBalance: currentBalance,
            currentBalance,
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
      const { existingId, isValid, ...supplierData } = item;
      if (updateExisting && existingId) {
        updateSupplier(existingId, supplierData);
        updated++;
      } else {
        addSupplier(supplierData);
        added++;
      }
    });

    setImportSuccessMessage(
      `تم استيراد ${added} مورد جديد وتحديث بيانات ${updated} مورد بنجاح!`
    );

    setTimeout(() => {
      setShowImportModal(false);
      setImportSuccessMessage(null);
      setImportPreview([]);
      setImportFileName('');
    }, 1800);
  };

  const filteredSuppliers = useMemo(() => {
    const q = normalizeArabic(searchQuery);
    return suppliers.filter((s: Supplier) =>
      !q ||
      normalizeArabic(s.name).includes(q) ||
      (s.representativeName && normalizeArabic(s.representativeName).includes(q)) ||
      s.phone.includes(q) ||
      (s.address && normalizeArabic(s.address).includes(q))
    );
  }, [suppliers, searchQuery]);

  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);

  const isAllSuppliersSelected = useMemo(() => {
    if (filteredSuppliers.length === 0) return false;
    return filteredSuppliers.every(s => selectedSupplierIds.includes(s.id));
  }, [filteredSuppliers, selectedSupplierIds]);

  const toggleSelectAllSuppliers = () => {
    if (isAllSuppliersSelected) {
      setSelectedSupplierIds([]);
    } else {
      setSelectedSupplierIds(filteredSuppliers.map((s: Supplier) => s.id));
    }
  };

  const toggleSelectOneSupplier = (id: string) => {
    setSelectedSupplierIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBatchDeleteSuppliers = () => {
    if (selectedSupplierIds.length === 0) return;
    if (window.confirm(`هل أنت متأكد من حذف ${selectedSupplierIds.length} مورد محدد نهائياً؟`)) {
      selectedSupplierIds.forEach(id => deleteSupplier(id));
      setSelectedSupplierIds([]);
    }
  };

  const totalPayables = suppliers.reduce(
    (sum, s) => sum + (s.currentBalance > 0 ? s.currentBalance : 0),
    0
  );

  return (
    <div className="space-y-5 font-sans">
      {/* Header Banner */}
      <div className="bg-white p-4 rounded-2xl border-2 border-slate-400 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-purple-700" />
            <span>سجل الشركات الموردة والموزعين</span>
          </h2>
          <p className="text-xs font-bold text-slate-600 mt-0.5">
            إدارة حسابات شركات ومصانع الكابلات والأدوات الكهربائية، متابعة دفعات السداد، واستيراد وتصدير البيانات من Excel
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-purple-50 border-2 border-purple-400 px-3.5 py-1.5 rounded-xl text-xs">
            <span className="text-purple-900 font-bold block text-[10px]">مستحقات الموردين:</span>
            <span className="font-black text-purple-950 font-mono text-sm">
              {totalPayables.toLocaleString()} {settings.currency}
            </span>
          </div>

          <button
            onClick={handleExportSuppliersToExcel}
            className="bg-slate-800 hover:bg-slate-700 text-white font-black px-3 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
            title="تصدير قائمة الموردين ومستحقاتهم إلى ملف إكسيل"
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
            <PlusCircle className="w-4 h-4" />
            <span>إضافة شركة موردة</span>
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
            placeholder="ابحث باسم الشركة أو اسم المندوب أو رقم الهاتف..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 border-2 border-slate-500 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-black text-slate-900 focus:outline-none bg-slate-50 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-between sm:justify-start">
          <label className="flex items-center gap-2 text-xs font-black text-slate-800 cursor-pointer bg-slate-100 border border-slate-300 px-3 py-2 rounded-xl">
            <input
              type="checkbox"
              checked={isAllSuppliersSelected}
              onChange={toggleSelectAllSuppliers}
              className="w-4 h-4 accent-amber-600 cursor-pointer rounded"
            />
            <span>تحديد الكل ({filteredSuppliers.length})</span>
          </label>

          {selectedSupplierIds.length > 0 && (
            <button
              onClick={handleBatchDeleteSuppliers}
              className="bg-red-600 hover:bg-red-500 text-white font-extrabold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95 text-xs cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف المحدد ({selectedSupplierIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredSuppliers.map((supplier: Supplier) => {
          const hasBalance = supplier.currentBalance > 0;
          const isSelected = selectedSupplierIds.includes(supplier.id);
          return (
            <div
              key={supplier.id}
              className={`bg-white rounded-xl p-3.5 border-2 transition-all flex flex-col justify-between text-xs ${
                isSelected
                  ? 'border-amber-500 bg-amber-50/50 shadow-md'
                  : 'border-slate-400 shadow-sm hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-1.5 mb-2">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOneSupplier(supplier.id)}
                      className="w-4 h-4 mt-0.5 accent-amber-600 cursor-pointer rounded shrink-0"
                    />
                    <div className="flex flex-col">
                      <h3 className="font-black text-slate-900 text-sm leading-tight">
                        {supplier.name}
                      </h3>
                      {supplier.representativeName && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-700 font-bold mt-0.5">
                          <User className="w-3 h-3 text-slate-500" />
                          <span>المندوب: {supplier.representativeName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => openEdit(supplier)}
                      className="p-1 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded"
                      title="تعديل بيانات المورد"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`هل أنت متأكد من حذف المورد ${supplier.name}؟`)) {
                          deleteSupplier(supplier.id);
                        }
                      }}
                      className="p-1 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-300 mb-2.5">
                  <div className="flex items-center gap-1 text-slate-700 font-mono font-bold">
                    <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                    <span>{supplier.phone}</span>
                  </div>
                  {supplier.address && (
                    <div className="flex items-center gap-1 text-slate-600 font-bold truncate">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{supplier.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100 border border-slate-300 mb-2 text-[11px]">
                  <span className="font-black text-slate-700">المستحق للمورد:</span>
                  <div className="text-left font-mono">
                    {hasBalance ? (
                      <span className="font-black text-purple-800">
                        {supplier.currentBalance.toLocaleString()} {settings.currency}
                      </span>
                    ) : (
                      <span className="font-black text-amber-700">مسدد بالكامل</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      setPayingSupplier(supplier);
                    }}
                    className="bg-purple-700 hover:bg-purple-600 text-white font-black py-1.5 rounded-lg text-[11px] flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                  >
                    <CreditCard className="w-3 h-3" />
                    <span>صرف دفعة</span>
                  </button>
                  <button
                    onClick={() => openStatement('supplier', supplier.id)}
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

        {filteredSuppliers.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border-2 border-dashed border-slate-400">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-black text-sm">لا يوجد موردين يطابقون البحث</p>
          </div>
        )}
      </div>

      {/* Pay Supplier Modal */}
      <VoucherModal
        isOpen={!!payingSupplier}
        onClose={() => setPayingSupplier(null)}
        direction="out"
        defaultPartyType="supplier"
        defaultPartyId={payingSupplier?.id}
        defaultAmount={payingSupplier?.currentBalance || 0}
        defaultNotes={
          payNotes ||
          (payingSupplier ? `سداد دفعة لحساب المورد: ${payingSupplier.name}` : '')
        }
        onSuccess={() => {
          setPayingSupplier(null);
          setPayNotes('');
        }}
      />

      {/* Add / Edit Supplier Modal */}
      <SupplierModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingSupplier(null);
        }}
        supplier={editingSupplier}
      />

      {/* EXCEL IMPORT MODAL FOR SUPPLIERS */}
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
                  استيراد بيانات وأرصدة الموردين والشركات من إكسيل (Excel / CSV)
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
                <div className="bg-purple-50 border-2 border-purple-400 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <h4 className="font-black text-purple-950 text-xs sm:text-sm flex items-center gap-1.5 mb-1">
                      <Download className="w-4 h-4 text-purple-700" />
                      <span>1. تحميل نموذج Excel جاهز للموردين</span>
                    </h4>
                    <p className="text-[11px] font-bold text-purple-900 leading-relaxed mb-3">
                      يحتوي النموذج على الأعمدة المعتمدة: (اسم الشركة / المورد، اسم المندوب، رقم الهاتف، العنوان، الأصناف الموردة، الرصيد المستحق للمورد، ملاحظات).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadSampleTemplate}
                    className="w-full bg-purple-700 hover:bg-purple-600 text-white font-black py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل نموذج الموردين (.xlsx)</span>
                  </button>
                </div>

                <div className="bg-slate-50 border-2 border-dashed border-slate-500 hover:border-purple-600 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all">
                  <Upload className="w-8 h-8 text-purple-600 mb-2" />
                  <span className="font-black text-slate-900 text-xs">
                    2. اختر ملف إكسيل الموردين (.xlsx / .xls / .csv)
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 mt-1">
                    يتعرف النظام تلقائياً على أعمدة اسم الشركة والمندوب والهاتف والرصيد المستحق
                  </span>

                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="mt-3 text-xs file:ml-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-900 file:text-amber-400 hover:file:bg-slate-800 cursor-pointer"
                  />
                  {importFileName && (
                    <span className="mt-2 text-[11px] font-black text-purple-900 bg-purple-100 border border-purple-300 px-2.5 py-0.5 rounded-full">
                      📁 {importFileName}
                    </span>
                  )}
                </div>
              </div>

              {isProcessingFile && (
                <div className="text-center py-6 text-slate-700 font-black flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  <span>جاري قراءة وتحليل بيانات الموردين من ملف الإكسيل...</span>
                </div>
              )}

              {!isProcessingFile && importPreview.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between bg-slate-100 p-3 rounded-xl border-2 border-slate-400">
                    <div className="flex items-center gap-2 font-black text-slate-900">
                      <FileCheck className="w-4 h-4 text-purple-700" />
                      <span>معاينة بيانات الموردين المقروءة ({importPreview.length} سجل)</span>
                    </div>

                    <label className="flex items-center gap-2 text-[11px] font-black text-slate-800 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={updateExisting}
                        onChange={e => setUpdateExisting(e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>تحديث أرصدة وبيانات الموردين المسجلين مسبقاً بنفس الاسم أو الهاتف</span>
                    </label>
                  </div>

                  <div className="max-h-60 overflow-y-auto border-2 border-slate-400 rounded-xl">
                    <table className="w-full text-right text-[11px] border-collapse">
                      <thead className="sticky top-0 bg-slate-900 text-white font-black">
                        <tr>
                          <th className="p-2 text-center">م</th>
                          <th className="p-2">اسم الشركة / المورد</th>
                          <th className="p-2">المندوب</th>
                          <th className="p-2 text-center">رقم الهاتف</th>
                          <th className="p-2 text-center">الرصيد المستحق</th>
                          <th className="p-2 text-center">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-bold">
                        {importPreview.map((item, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2 text-center font-mono text-slate-500">{i + 1}</td>
                            <td className="p-2 font-black text-slate-900">{item.name || '—'}</td>
                            <td className="p-2 text-slate-700">
                              {item.representativeName || '—'}
                            </td>
                            <td className="p-2 text-center font-mono text-slate-700">
                              {item.phone}
                            </td>
                            <td className="p-2 text-center font-mono font-black text-purple-800">
                              {item.currentBalance.toLocaleString()} {settings.currency}
                            </td>
                            <td className="p-2 text-center">
                              {!item.isValid ? (
                                <span className="bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 rounded-full font-black text-[10px]">
                                  اسم مفقود 🔴
                                </span>
                              ) : item.existingId ? (
                                <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-black text-[10px]">
                                  تحديث مورد 🟡
                                </span>
                              ) : (
                                <span className="bg-amber-100 text-slate-800 border border-amber-300 px-2 py-0.5 rounded-full font-black text-[10px]">
                                  مورد جديد 🟢
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
                  <span>تأكيد واستيراد الموردين للنظام</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
