import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, UserRole } from '../types';
import {
  Users,
  UserPlus,
  ShieldCheck,
  User as UserIcon,
  Lock,
  Phone,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit,
  X,
  Key,
  Shield
} from 'lucide-react';

export const UserManager: React.FC = () => {
  const { users, currentUser, addUser, updateUser, deleteUser, permissionsMatrix, updatePermissionsMatrix } = useApp();

  const ALL_MODULES = [
    { id: 'dashboard', label: 'الرئيسية والمؤشرات' },
    { id: 'pos', label: 'نقطة البيع (POS)' },
    { id: 'sales', label: 'فواتير المبيعات' },
    { id: 'sales_returns', label: 'مرتجع المبيعات' },
    { id: 'purchases', label: 'فواتير المشتريات' },
    { id: 'purchase_returns', label: 'مرتجع المشتريات' },
    { id: 'inventory', label: 'المخازن والأصناف' },
    { id: 'expiry', label: 'رادار الصلاحيات' },
    { id: 'customers', label: 'العملاء والحسابات' },
    { id: 'suppliers', label: 'الموردين والشركات' },
    { id: 'finance', label: 'الخزينة والحسابات' },
    { id: 'reports', label: 'قسم التقارير' },
    { id: 'calculator', label: 'الورديات وتقفيل الكاشير' },
    { id: 'users', label: 'المستخدمين والصلاحيات' },
    { id: 'sqlserver', label: 'قاعدة البيانات' },
    { id: 'settings', label: 'الإعدادات والنسخ' },
  ];

  const handleTogglePermission = (role: UserRole, moduleId: string) => {
    if (role === 'admin') return; // Admin always has all
    const currentList = permissionsMatrix[role] || [];
    let updatedList: string[];
    if (currentList.includes(moduleId)) {
      updatedList = currentList.filter(id => id !== moduleId);
    } else {
      updatedList = [...currentList, moduleId];
    }
    updatePermissionsMatrix({
      ...permissionsMatrix,
      [role]: updatedList,
    });
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');
  const [password, setPassword] = useState('123456');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !name.trim()) return;

    addUser({
      username: username.trim().toLowerCase(),
      name: name.trim(),
      phone: phone.trim(),
      role,
      isActive: true,
      passwordHash: password || '123456',
    });

    // Reset & close
    setUsername('');
    setName('');
    setPhone('');
    setPassword('123456');
    setShowAddModal(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    updateUser(editingUser.id, {
      name,
      phone,
      role,
      passwordHash: password || editingUser.passwordHash,
    });

    setEditingUser(null);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setPhone(u.phone || '');
    setRole(u.role);
    setPassword(u.passwordHash);
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
            <ShieldCheck className="w-3 h-3 text-amber-700" />
            مدير النظام
          </span>
        );
      case 'cashier':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
            <UserIcon className="w-3 h-3 text-amber-700" />
            كاشير المبيعات
          </span>
        );
      case 'storekeeper':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
            <Lock className="w-3 h-3 text-amber-700" />
            أمين مخزن
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-700" />
            إدارة المستخدمين وصلاحيات الوصول
          </h2>
          <p className="text-xs text-slate-500">
            إضافة وإدارة حسابات الموظفين (مديري النظام، الكاشير، وأمناء المخازن)
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة مستخدم جديد</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                <th className="py-3.5 px-4">اسم المستخدم</th>
                <th className="py-3.5 px-4">الاسم الكامل</th>
                <th className="py-3.5 px-4">رقم الهاتف</th>
                <th className="py-3.5 px-4">الصلاحية / الدور</th>
                <th className="py-3.5 px-4">الحالة</th>
                <th className="py-3.5 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {u.username}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800">
                    {u.name}
                    {currentUser?.id === u.id && (
                      <span className="mr-2 text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                        حسابك الحالي
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono">
                    {u.phone || '—'}
                  </td>
                  <td className="py-3 px-4">{getRoleBadge(u.role)}</td>
                  <td className="py-3 px-4">
                    {u.isActive ? (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> نشط
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 font-bold text-[11px]">
                        <XCircle className="w-3.5 h-3.5" /> معطل
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                        title="تعديل المستخدم"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {currentUser?.role === 'admin' && users.length > 1 && currentUser?.id !== u.id && (
                        <button
                          onClick={() => {
                            if (window.confirm(`هل أنت متأكد من حذف حساب المستخدم (${u.username})؟`)) {
                              deleteUser(u.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="حذف المستخدم"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permission Matrix Configuration Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-700" />
            مصفوفة الصلاحيات المخصصة للأدوار (Permission Matrix)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            قم بتخصيص الصلاحيات لكل دور وظيفي عن طريق تفعيل أو إلغاء تفعيل الأقسام. يتم الحفظ والتطبيق الفوري تلقائياً.
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                <th className="py-3 px-4">القسم / الشاشة في المنظومة</th>
                <th className="py-3 px-4 text-center">مدير النظام (Admin)</th>
                <th className="py-3 px-4 text-center">كاشير المبيعات (Cashier)</th>
                <th className="py-3 px-4 text-center">أمين المخزن (Storekeeper)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {ALL_MODULES.map(mod => {
                const cashierAllowed = permissionsMatrix.cashier?.includes(mod.id);
                const storekeeperAllowed = permissionsMatrix.storekeeper?.includes(mod.id);

                return (
                  <tr key={mod.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">{mod.label}</td>
                    
                    {/* Admin (Always checked and disabled) */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="w-4 h-4 text-amber-600 rounded cursor-not-allowed accent-amber-600"
                        title="مدير النظام يمتلك كافة الصلاحيات دائماً"
                      />
                    </td>

                    {/* Cashier */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={cashierAllowed}
                        onChange={() => handleTogglePermission('cashier', mod.id)}
                        className="w-4 h-4 text-amber-600 rounded cursor-pointer accent-amber-600"
                      />
                    </td>

                    {/* Storekeeper */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={storekeeperAllowed}
                        onChange={() => handleTogglePermission('storekeeper', mod.id)}
                        className="w-4 h-4 text-amber-600 rounded cursor-pointer accent-amber-600"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-700" />
                <h3 className="font-black text-slate-900 text-base">إضافة مستخدم جديد</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">اسم المستخدم (Login Username) *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ahmed_sales"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: المهندس أحمد علي"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  placeholder="010XXXXXXXX"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">الصلاحية / نوع الحساب *</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as UserRole)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-amber-500"
                >
                  <option value="admin">مدير النظام (جميع الصلاحيات والإعدادات وحذف الفواتير)</option>
                  <option value="cashier">كاشير المبيعات (نقطة البيع، فواتير المبيعات، العملاء)</option>
                  <option value="storekeeper">أمين المخزن (المخزون، المشتريات، الموردين، رادار الصلاحية)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">كلمة المرور *</label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl shadow-md transition-all"
                >
                  حفظ المستخدم
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-700" />
                <h3 className="font-black text-slate-900 text-base">تعديل بيانات المستخدم</h3>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">اسم المستخدم</label>
                <input
                  type="text"
                  disabled
                  value={editingUser.username}
                  className="w-full py-2 px-3 bg-slate-100 border border-slate-200 rounded-xl font-mono text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">الصلاحية / الدور *</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as UserRole)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-amber-500"
                >
                  <option value="admin">مدير النظام</option>
                  <option value="cashier">كاشير المبيعات</option>
                  <option value="storekeeper">أمين المخزن</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">كلمة المرور الجديدة</label>
                <input
                  type="text"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl shadow-md transition-all"
                >
                  حفظ التغيرات
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
