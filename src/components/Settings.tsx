import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Settings as SettingsIcon,
  Store,
  FileText,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Building,
  Phone,
  ShieldCheck
} from 'lucide-react';

import { downloadDistZip } from '../utils/downloadHelper';

export const Settings: React.FC = () => {
  const {
    settings,
    updateSettings,
    exportDatabaseJson,
    importDatabaseJson,
    resetToDefaultData,
  } = useApp();

  const [formData, setFormData] = useState({ ...settings });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportDatabaseJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Frozen_House_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importDatabaseJson(content);
        if (ok) {
          setImportStatus('تم استرجاع النسخة الاحتياطية بنجاح!');
          setTimeout(() => setImportStatus(null), 3000);
        } else {
          setImportStatus('فشل استرجاع الملف، تأكد من صحة ملف JSON');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (
      window.confirm(
        'تحذير هام: هل أنت متأكد من رغبتك في إعادة ضبط المنظومة وتحميل البيانات النموذجية الافتراضية؟ سيتم مسح أي تعديلات غير محفوظة خارجياً.'
      )
    ) {
      resetToDefaultData();
      alert('تمت إعادة ضبط البيانات بنجاح.');
    }
  };

  const handleDownloadDistZip = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    downloadDistZip();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-amber-700" />
            إعدادات المحل والنسخ الاحتياطي
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            تخصيص بيانات متجر وسام للأدوات الكهربائية، السجل التجاري والبطاقة الضريبية، نصوص الفواتير والنسخ الاحتياطي
          </p>
        </div>

        {/* Download DIST ZIP Button Moved Here */}
        <button
          type="button"
          onClick={handleDownloadDistZip}
          className="bg-amber-600 hover:bg-amber-500 text-white font-extrabold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
          title="تحميل حزمة المنظومة الكاملة والسيرفر وقاعدة البيانات (dist.zip)"
        >
          <Download className="w-4 h-4 text-amber-200" />
          <span>تحميل حزمة المنظومة الكاملة (dist.zip)</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-amber-100 border border-amber-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-amber-700" />
          <span>تم حفظ تحديثات إعدادات المحل بنجاح وتطبيقها على كافة الفواتير والتقارير.</span>
        </div>
      )}

      {/* Store Information Form */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
          <Store className="w-4 h-4 text-amber-700" />
          <span>بيانات المنشأة وتراخيص السلامة والصحة الغذائية</span>
        </h3>

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">اسم المحل التجاري *</label>
              <input
                type="text"
                required
                value={formData.storeName}
                onChange={e => setFormData({ ...formData, storeName: e.target.value })}
                className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                اسم المدير المسؤول / صاحب المنشأة
              </label>
              <input
                type="text"
                value={formData.ownerName}
                onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                رقم ترخيص سلامة الغذاء والصحة
              </label>
              <input
                type="text"
                placeholder="ترخيص صحي رقم ... لسنة ..."
                value={formData.agriculturalLicense || ''}
                onChange={e => setFormData({ ...formData, agriculturalLicense: e.target.value })}
                className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                السجل التجاري والبطاقة الضريبية
              </label>
              <input
                type="text"
                value={formData.commercialRecord || ''}
                onChange={e => setFormData({ ...formData, commercialRecord: e.target.value })}
                className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">رقم الهاتف الأساسي</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">هاتف بديل / واتساب</label>
              <input
                type="text"
                value={formData.phoneAlt || ''}
                onChange={e => setFormData({ ...formData, phoneAlt: e.target.value })}
                className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">رمز العملة</label>
              <input
                type="text"
                value={formData.currency}
                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">عنوان المحل / المقر</label>
            <input
              type="text"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              ملاحظة وإرشادات أسفل فاتورة البيع المطبوعة
            </label>
            <textarea
              rows={2}
              value={formData.invoiceFooterNote}
              onChange={e => setFormData({ ...formData, invoiceFooterNote: e.target.value })}
              className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 text-xs"
              placeholder="شروط الإرجاع، إرشادات جودة التجميد والحفظ، السلامة والضيافة..."
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-md transition-all active:scale-95"
            >
              حفظ التعديلات
            </button>
          </div>
        </form>
      </div>

      {/* Data Management & Backup Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
          <Download className="w-4 h-4 text-amber-700" />
          <span>إدارة قواعد البيانات والنسخ الاحتياطي وتحميل ملفات التشغيل (DIST)</span>
        </h3>

        <p className="text-xs text-slate-500 leading-relaxed">
          يتم حفظ بياناتك تلقائياً في ذاكرة المتصفح. يمكنك في أي وقت تنزيل نسخة احتياطية آمنة (ملف JSON)
          أو تحميل مجلد ملفات التشغيل المضغوطة (DIST) لتشغيل المنظومة محلياً على أي جهاز.
        </p>

        {importStatus && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-slate-800 rounded-xl text-xs font-bold">
            {importStatus}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Download DIST ZIP Card */}
          <button
            type="button"
            onClick={handleDownloadDistZip}
            className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50 hover:bg-amber-100/80 text-slate-900 text-right flex flex-col justify-between transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-xs">تحميل حزمة المنظومة (dist.zip)</span>
              <Download className="w-4 h-4 text-amber-700" />
            </div>
            <p className="text-[11px] text-amber-700 font-semibold">
              تنزيل حزمة المنظومة والسيرفر وقاعدة البيانات المضغوطة (dist.zip)
            </p>
          </button>

          {/* Export Button */}
          <button
            onClick={handleDownloadBackup}
            className="p-4 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100/80 text-slate-800 text-right flex flex-col justify-between transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-xs">تصدير نسخة احتياطية</span>
              <Download className="w-4 h-4 text-amber-700" />
            </div>
            <p className="text-[11px] text-amber-700">
              تنزيل ملف كامل ببيانات المتجر الحالي
            </p>
          </button>

          {/* Import Button */}
          <label className="p-4 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100/80 text-slate-800 text-right flex flex-col justify-between cursor-pointer transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-xs">استرجاع نسخة احتياطية</span>
              <Upload className="w-4 h-4 text-amber-700" />
            </div>
            <p className="text-[11px] text-amber-700">
              رفع ملف JSON مستخرج مسبقاً
            </p>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>

          {/* Reset Demo Data */}
          <button
            onClick={handleResetData}
            className="p-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100/80 text-red-900 text-right flex flex-col justify-between transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-xs">تحميل بيانات نموذجية</span>
              <RotateCcw className="w-4 h-4 text-red-700" />
            </div>
            <p className="text-[11px] text-red-700">
              إعادة ضبط المنظومة للبيانات الافتراضية
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
