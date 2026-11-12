import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Customer } from '../types';
import {
  X,
  UserPlus,
  UserCheck,
  Building2,
  Phone,
  MapPin,
  CreditCard,
  Briefcase,
  FileText,
  ShieldCheck,
  Save,
  AlertCircle,
  Hash
} from 'lucide-react';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null; // if editing
  onSuccess?: (savedCustomer: Customer) => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSuccess,
}) => {
  const { customers, addCustomer, updateCustomer, settings } = useApp();

  // Generate next customer code if new
  const generatedCode = React.useMemo(() => {
    if (customer?.code) return customer.code;
    const num = (customers?.length || 0) + 1;
    return `CUST-${num.toString().padStart(4, '0')}`;
  }, [customer, customers]);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneAlt, setPhoneAlt] = useState('');
  const [address, setAddress] = useState('');
  const [customerType, setCustomerType] = useState<'retail' | 'contractor' | 'technician' | 'company'>('retail');
  const [commercialRecord, setCommercialRecord] = useState('');
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [balanceType, setBalanceType] = useState<'debit' | 'credit' | 'zero'>('zero');
  const [initialBalanceAmount, setInitialBalanceAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Populate form on open or when customer changes
  useEffect(() => {
    if (isOpen) {
      if (customer) {
        setName(customer.name || '');
        setCode(customer.code || '');
        setPhone(customer.phone || '');
        setPhoneAlt('');
        setAddress(customer.address || '');
        setCustomerType(customer.customerType || 'retail');
        setCommercialRecord(customer.commercialRecord || '');
        setCreditLimit(customer.creditLimit || 0);
        setNotes(customer.notes || '');

        const curBal = customer.currentBalance || 0;
        if (curBal > 0) {
          setBalanceType('debit');
          setInitialBalanceAmount(curBal);
        } else if (curBal < 0) {
          setBalanceType('credit');
          setInitialBalanceAmount(Math.abs(curBal));
        } else {
          setBalanceType('zero');
          setInitialBalanceAmount(0);
        }
      } else {
        setName('');
        setCode(generatedCode);
        setPhone('');
        setPhoneAlt('');
        setAddress('');
        setCustomerType('retail');
        setCommercialRecord('');
        setCreditLimit(0);
        setBalanceType('zero');
        setInitialBalanceAmount(0);
        setNotes('');
      }
      setErrorMessage('');
    }
  }, [isOpen, customer, generatedCode]);

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
      setErrorMessage('يرجى إدخال اسم العميل / الجهة');
      return;
    }

    // Calculate final initial balance:
    // debit: customer owes store (+), credit: customer paid in advance (-), zero: 0
    let finalBalance = 0;
    if (balanceType === 'debit') {
      finalBalance = Math.abs(initialBalanceAmount);
    } else if (balanceType === 'credit') {
      finalBalance = -Math.abs(initialBalanceAmount);
    }

    const payload = {
      name: name.trim(),
      code: code.trim() || generatedCode,
      phone: phone.trim(),
      address: address.trim(),
      customerType,
      commercialRecord: commercialRecord.trim(),
      creditLimit: Number(creditLimit) || 0,
      initialBalance: finalBalance,
      currentBalance: finalBalance,
      notes: notes.trim(),
      // Backward compatibility aliases
      cropTypes: customerType === 'contractor' ? 'مقاول كهرباء' :
                 customerType === 'technician' ? 'فني كهربائي' :
                 customerType === 'company' ? 'شركة مقاولات' : 'عميل تجزئة',
      farmArea: commercialRecord.trim(),
    };

    let resultCustomer: Customer;
    if (customer) {
      updateCustomer(customer.id, payload);
      resultCustomer = { ...customer, ...payload };
    } else {
      resultCustomer = addCustomer(payload);
    }

    if (onSuccess) {
      onSuccess(resultCustomer);
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
            <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md">
              {customer ? <UserCheck className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg sm:text-xl">
                {customer ? 'تعديل بيانات العميل' : 'تسجيل عميل جديد'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-bold">
                إدخال بيانات الهوية والتواصل والحد الائتماني والرصيد الافتتاحي
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
          {/* SECTION 1: الأساسية والتعريف */}
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-300 space-y-3">
            <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <Building2 className="w-4 h-4 text-amber-700" />
              <span>البيانات الأساسية وتصنيف العميل:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Customer Name */}
              <div className="sm:col-span-2">
                <label className="font-black text-slate-900 block mb-1 text-xs sm:text-sm">
                  اسم العميل / المقاول / الشركة *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="مثال: شركة النور للمقاولات / المهندس وائل الشريف"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full py-2.5 px-3.5 border-2 border-slate-400 rounded-xl bg-white text-slate-900 font-black text-xs sm:text-sm focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10 focus:outline-none placeholder:font-normal placeholder:text-slate-400 transition-colors"
                />
              </div>

              {/* Code */}
              <div>
                <label className="font-black text-slate-900 block mb-1 text-xs sm:text-sm flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-slate-600" />
                  <span>كود العميل</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="CUST-0001"
                  className="w-full py-2.5 px-3.5 border-2 border-slate-400 rounded-xl bg-white text-slate-900 font-mono font-black text-xs sm:text-sm focus:border-slate-800 focus:outline-none"
                />
              </div>
            </div>

            {/* Customer Type / Classification */}
            <div>
              <label className="font-black text-slate-900 block mb-1 text-xs sm:text-sm flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-slate-600" />
                <span>تصنيف ونوع التعامل</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'retail', label: 'عميل نقدي / تجزئة' },
                  { id: 'technician', label: 'فني كهرباء معتمد' },
                  { id: 'contractor', label: 'مقاول تشطيبات' },
                  { id: 'company', label: 'شركة مقاولات / هيئة' },
                ].map(type => (
                  <button
                    type="button"
                    key={type.id}
                    onClick={() => setCustomerType(type.id as any)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-black border-2 transition-all ${
                      customerType === type.id
                        ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 2: التواصل والموقع */}
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-300 space-y-3">
            <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <Phone className="w-4 h-4 text-amber-700" />
              <span>بيانات التواصل والعنوان:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Primary Phone */}
              <div>
                <label className="font-black text-slate-900 block mb-1 text-xs sm:text-sm">
                  رقم الهاتف الرئيسي
                </label>
                <input
                  type="text"
                  placeholder="01012345678"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full py-2.5 px-3.5 border-2 border-slate-400 rounded-xl bg-white text-slate-900 font-mono font-black text-xs sm:text-sm focus:border-slate-800 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              {/* Secondary Phone / WhatsApp */}
              <div>
                <label className="font-black text-slate-900 block mb-1 text-xs sm:text-sm">
                  هاتف بديل / واتساب
                </label>
                <input
                  type="text"
                  placeholder="011xxxxxxx"
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
                <span>العنوان / المنطقة / تفاصيل الموقع</span>
              </label>
              <input
                type="text"
                placeholder="مثال: طنطا - شارع النادي - بجوار برج الأطباء"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full py-2.5 px-3.5 border-2 border-slate-400 rounded-xl bg-white text-slate-900 font-bold text-xs sm:text-sm focus:border-slate-800 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* SECTION 3: البيانات المالية والرصيد الافتتاحي */}
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-300 space-y-3">
            <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <CreditCard className="w-4 h-4 text-purple-700" />
              <span>البيانات المالية والرصيد السابق:</span>
            </h4>

            {/* Opening Balance Controls (Only for new customer or if editing) */}
            <div>
              <label className="font-black text-slate-900 block mb-1 text-xs sm:text-sm">
                حالة الرصيد الافتتاحي (بداية التعامل)
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
                  رصيد صفري (0.00)
                </button>

                <button
                  type="button"
                  onClick={() => setBalanceType('debit')}
                  className={`py-2 px-3 rounded-xl text-xs font-black border-2 transition-all ${
                    balanceType === 'debit'
                      ? 'bg-rose-700 text-white border-rose-800 shadow-sm'
                      : 'bg-white text-rose-800 border-slate-400 hover:bg-rose-50'
                  }`}
                >
                  مدين (عليه مديونية سابقة)
                </button>

                <button
                  type="button"
                  onClick={() => setBalanceType('credit')}
                  className={`py-2 px-3 rounded-xl text-xs font-black border-2 transition-all ${
                    balanceType === 'credit'
                      ? 'bg-amber-700 text-white border-amber-800 shadow-sm'
                      : 'bg-white text-amber-800 border-slate-400 hover:bg-amber-50'
                  }`}
                >
                  دائن (له دفعة مقدمة)
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
                      placeholder="أدخل مبلغ الرصيد السابق..."
                      value={initialBalanceAmount || ''}
                      onChange={e => setInitialBalanceAmount(Number(e.target.value))}
                      className="flex-1 py-2.5 px-3.5 border-2 border-slate-400 rounded-xl bg-white text-slate-900 font-mono font-black text-sm focus:border-slate-800 focus:outline-none"
                    />
                    <span className="font-black text-slate-700 text-sm">{settings.currency}</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 mt-1 block">
                    {balanceType === 'debit'
                      ? '⚠️ العميل مدين بهذا المبلغ وسيظهر في حسابه كمديونية سابقة مستحقة للمحل.'
                      : '✅ العميل دائن بهذا المبلغ كرصيد مسبق الدفع يخصم منه في مشترياته القادمة.'}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Credit Limit */}
              <div>
                <label className="font-black text-slate-900 block mb-1 text-xs sm:text-sm flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                  <span>سقف المديونية الأقصى (الحد الائتماني)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="0 (بدون حد)"
                    value={creditLimit || ''}
                    onChange={e => setCreditLimit(Number(e.target.value))}
                    className="w-full py-2.5 px-3.5 border-2 border-slate-400 rounded-xl bg-white text-slate-900 font-mono font-black text-xs sm:text-sm focus:border-slate-800 focus:outline-none"
                  />
                  <span className="font-bold text-slate-600 text-xs">{settings.currency}</span>
                </div>
              </div>

              {/* Tax / Commercial record */}
              <div>
                <label className="font-black text-slate-900 block mb-1 text-xs sm:text-sm flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                  <span>السجل التجاري / الرقم الضريبي</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: 1010508924"
                  value={commercialRecord}
                  onChange={e => setCommercialRecord(e.target.value)}
                  className="w-full py-2.5 px-3.5 border-2 border-slate-400 rounded-xl bg-white text-slate-900 font-mono font-bold text-xs sm:text-sm focus:border-slate-800 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="font-black text-slate-900 block mb-1 text-xs sm:text-sm">
              ملاحظات إضافية وشروط خاصة
            </label>
            <input
              type="text"
              placeholder="مثال: نسبة خصم خاصة للفني، لا يسلم بضاعة إلا بتصريح من المهندس..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full py-2.5 px-3.5 border-2 border-slate-400 rounded-xl bg-white text-slate-900 font-bold text-xs sm:text-sm focus:border-slate-800 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3 border-t-2 border-slate-200">
            <button
              type="submit"
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-black py-3 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <Save className="w-5 h-5" />
              <span>{customer ? 'حفظ التعديلات' : 'تسجيل وتأكيد العميل'}</span>
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
