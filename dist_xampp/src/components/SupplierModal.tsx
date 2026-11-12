import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Supplier } from '../types';
import {
  X,
  Building2,
  Phone,
  MapPin,
  CreditCard,
  Briefcase,
  FileText,
  User,
  Save,
  AlertCircle,
  Hash,
  Truck
} from 'lucide-react';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier?: Supplier | null; // if editing
  onSuccess?: (savedSupplier: Supplier) => void;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  supplier,
  onSuccess,
}) => {
  const { suppliers, addSupplier, updateSupplier, settings } = useApp();

  // Generate next supplier code
  const generatedCode = React.useMemo(() => {
    const num = (suppliers?.length || 0) + 1;
    return `SUPP-${num.toString().padStart(4, '0')}`;
  }, [suppliers]);

  // Form State
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneAlt, setPhoneAlt] = useState('');
  const [address, setAddress] = useState('');
  const [suppliedCategories, setSuppliedCategories] = useState('');
  const [balanceType, setBalanceType] = useState<'credit' | 'debit' | 'zero'>('zero');
  const [initialBalanceAmount, setInitialBalanceAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Populate form on open or when supplier changes
  useEffect(() => {
    if (isOpen) {
      if (supplier) {
        setName(supplier.name || '');
        setCompanyName(supplier.companyName || '');
        setRepresentativeName(supplier.representativeName || '');
        setPhone(supplier.phone || '');
        setPhoneAlt('');
        setAddress(supplier.address || '');
        setSuppliedCategories(supplier.suppliedCategories || '');
        setNotes(supplier.notes || '');

        const curBal = supplier.currentBalance || 0;
        if (curBal > 0) {
          setBalanceType('credit'); // المستحق للمورد (+)
          setInitialBalanceAmount(curBal);
        } else if (curBal < 0) {
          setBalanceType('debit'); // دفعنا مقدماً للمورد (-)
          setInitialBalanceAmount(Math.abs(curBal));
        } else {
          setBalanceType('zero');
          setInitialBalanceAmount(0);
        }
      } else {
        setName('');
        setCompanyName('');
        setRepresentativeName('');
        setPhone('');
        setPhoneAlt('');
        setAddress('');
        setSuppliedCategories('كابلات وأسلاك');
        setBalanceType('zero');
        setInitialBalanceAmount(0);
        setNotes('');
      }
      setErrorMessage('');
    }
  }, [isOpen, supplier]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('يرجى إدخال اسم الشركة الموردة أو الموزع');
      return;
    }

    if (!phone.trim()) {
      setErrorMessage('يرجى إدخال رقم هاتف الشركة أو المندوب');
      return;
    }

    // Calculate final initial balance:
    // credit: store owes supplier (+), debit: store paid supplier in advance (-), zero: 0
    let finalBalance = 0;
    if (balanceType === 'credit') {
      finalBalance = Math.abs(initialBalanceAmount);
    } else if (balanceType === 'debit') {
      finalBalance = -Math.abs(initialBalanceAmount);
    }

    const payload = {
      name: name.trim(),
      companyName: companyName.trim() || name.trim(),
      representativeName: representativeName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      suppliedCategories: suppliedCategories.trim(),
      initialBalance: finalBalance,
      currentBalance: finalBalance,
      notes: notes.trim(),
    };

    let resultSupplier: Supplier;
    if (supplier) {
      updateSupplier(supplier.id, payload);
      resultSupplier = { ...supplier, ...payload };
    } else {
      // addSupplier returns void in context, create object
      addSupplier(payload);
      resultSupplier = {
        ...payload,
        id: `supp-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
    }

    if (onSuccess) {
      onSuccess(resultSupplier);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border-2 border-slate-300 max-h-[92vh] overflow-y-auto font-sans text-right select-none"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-slate-200 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-700 text-white flex items-center justify-center shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg sm:text-xl">
                {supplier ? 'تعديل بيانات الشركة الموردة' : 'تسجيل شركة موردة جديدة'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-bold">
                إدخال بيانات المورد، المندوب، الأصناف الموردة، والرصيد الافتتاحي المستحق
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 bg-rose-50 border-2 border-rose-400 text-rose-800 p-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* SECTION 1: بيانات الشركة والمندوب */}
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-300 space-y-3">
            <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <Building2 className="w-4 h-4 text-purple-700" />
              <span>بيانات الشركة والنشاط:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Supplier / Company Name */}
              <div>
                <label className="font-black text-slate-900 block mb-1 text-xs sm:text-sm">
                  اسم الشركة الموردة / المصنع *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="مثال: شركة السويدي إليكتريك / فينوس للكهرباء"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full py-2.5 px-3.5 border-2 border-slate-400 rounded-xl bg-white text-slate-900 font-black text-xs sm:text-sm focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10 focus:outline-none placeholder:font-normal placeholder:text-slate-400 transition-colors"
                />
              </div>

              {/* Representative Name */}
              <div>
                <label className="font-black text-slate-900 block mb-1 text-xs sm:text-sm flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-600" />
                  <span>اسم المندوب / جهة الاتصال</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: م. وائل الشريف"
                  value={representativeName}
                  onChange={e => setRepresentativeName(e.target.value)}
                  className="w-full py-2.5 px-3.5 border-2 border-slate-400 rounded-xl bg-white text-slate-900 font-bold text-xs sm:text-sm focus:border-slate-800 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Supplied Categories */}
            <div>
              <label className="font-black text-slate-900 block mb-1 text-xs sm:text-sm flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-slate-600" />
                <span>نوعية الأصناف الموردة</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  'كابلات وأسلاك',
                  'قواطع ولوحات',
                  'لمبات وإنارة',
                  'مفاتيح وبرايز',
                ].map(cat => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setSuppliedCategories(cat)}
                    className={`py-2 px-2 rounded-xl text-xs font-black border-2 transition-all ${
                      suppliedCategories === cat
                        ? 'bg-purple-700 text-white border-purple-800 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 2: التواصل والعنوان */}
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-300 space-y-3">
            <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <Phone className="w-4 h-4 text-amber-700" />
              <span>أرقام الهاتف والعنوان:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Primary Phone */}
              <div>
                <label className="font-black text-slate-900 block mb-1 text-xs sm:text-sm">
                  رقم الهاتف الرئيسي *
                </label>
                <input
                  type="text"
                  required
                  placeholder="01001122334"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full py-2.5 px-3.5 border-2 border-slate-400 rounded-xl bg-white text-slate-900 font-mono font-black text-xs sm:text-sm focus:border-slate-800 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              {/* Alt Phone */}
              <div>
                <label className="font-black text-slate-900 block mb-1 text-xs sm:text-sm">
                  هاتف بديل / الخط الأرضي
                </label>
                <input
                  type="text"
                  placeholder="02xxxxxxxx / 012xxxxxxx"
                  value={phoneAlt}
                  onChange={e => setPhoneAlt(e.target.value)}
                  className="w-full py-2.5 px-3.5 border-2 border-slate-400 rounded-xl bg-white text-slate-900 font-mono font-black text-xs sm:text-sm focus:border-slate-800 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="font-black text-slate-900 block mb-1 text-xs sm:text-sm flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-600" />
                <span>العنوان / المنطقة / مقر الشركة أو المخزن</span>
              </label>
              <input
                type="text"
                placeholder="مثال: العاشر من رمضان - المنطقة الصناعية الثالثة"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full py-2.5 px-3.5 border-2 border-slate-400 rounded-xl bg-white text-slate-900 font-bold text-xs sm:text-sm focus:border-slate-800 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* SECTION 3: الحساب المالي والرصيد الافتتاحي */}
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-300 space-y-3">
            <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <CreditCard className="w-4 h-4 text-purple-700" />
              <span>الرصيد المالي السابق للمورد (الحساب الافتتاحي):</span>
            </h4>

            <div>
              <label className="font-black text-slate-900 block mb-1 text-xs sm:text-sm">
                طبيعة الحساب السابق مع المورد
              </label>

              <div className="grid grid-cols-3 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setBalanceType('zero');
                    setInitialBalanceAmount(0);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-black border-2 transition-all ${
                    balanceType === 'zero'
                      ? 'bg-slate-800 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-400 hover:bg-slate-100'
                  }`}
                >
                  رصيد صفري (خالص)
                </button>

                <button
                  type="button"
                  onClick={() => setBalanceType('credit')}
                  className={`py-2 px-3 rounded-xl text-xs font-black border-2 transition-all ${
                    balanceType === 'credit'
                      ? 'bg-purple-700 text-white border-purple-800 shadow-sm'
                      : 'bg-white text-purple-900 border-slate-400 hover:bg-purple-50'
                  }`}
                >
                  دائن (مستحق للمورد طرفنا)
                </button>

                <button
                  type="button"
                  onClick={() => setBalanceType('debit')}
                  className={`py-2 px-3 rounded-xl text-xs font-black border-2 transition-all ${
                    balanceType === 'debit'
                      ? 'bg-amber-700 text-white border-amber-800 shadow-sm'
                      : 'bg-white text-amber-800 border-slate-400 hover:bg-amber-50'
                  }`}
                >
                  مدين (سددنا له دفعة مقدماً)
                </button>
              </div>

              {balanceType !== 'zero' && (
                <div className="mt-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      placeholder="أدخل مبلغ الرصيد المستحق..."
                      value={initialBalanceAmount || ''}
                      onChange={e => setInitialBalanceAmount(Number(e.target.value))}
                      className="flex-1 py-2.5 px-3.5 border-2 border-slate-400 rounded-xl bg-white text-slate-900 font-mono font-black text-sm focus:border-slate-800 focus:outline-none"
                    />
                    <span className="font-black text-slate-700 text-sm">{settings.currency}</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 mt-1 block">
                    {balanceType === 'credit'
                      ? '⚠️ هذا المبلغ مستحق للمورد وسيظهر في كشف حسابه كمديونية سابقة واجبة السداد.'
                      : '✅ هذا المبلغ دفعة مقدمة دفعناها للمورد وتخصم من فواتير الشراء القادمة.'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="font-black text-slate-900 block mb-1 text-xs sm:text-sm">
              شروط التوريد وملاحظات الفواتير
            </label>
            <input
              type="text"
              placeholder="مثال: فترة سماح 45 يوم، بونص سنوي 2% على المسحوبات..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full py-2.5 px-3.5 border-2 border-slate-400 rounded-xl bg-white text-slate-900 font-bold text-xs sm:text-sm focus:border-slate-800 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3 border-t-2 border-slate-200">
            <button
              type="submit"
              className="flex-1 bg-purple-700 hover:bg-purple-600 text-white font-black py-3 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <Save className="w-5 h-5" />
              <span>{supplier ? 'حفظ التعديلات' : 'تسجيل وتأكيد المورد'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 px-6 rounded-2xl transition-colors text-sm sm:text-base border-2 border-slate-300"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
