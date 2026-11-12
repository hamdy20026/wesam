import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Zap, User as UserIcon, LogIn, Key, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const success = login(username, password);
    if (!success) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة، أو الحساب غير نشط.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-amber-50/60 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Decorative Glows */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-400/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-amber-200 z-10 animate-in fade-in zoom-in-95">
        {/* Header - Wessam Electrical Brand */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 p-8 text-white text-center relative border-b-2 border-amber-300">
          <div className="inline-flex p-3 bg-white/20 backdrop-blur-md rounded-2xl mb-4 border border-white/30 shadow-inner">
            <Zap className="w-10 h-10 text-amber-300 fill-amber-300" />
          </div>
          
          <h1 className="text-2xl font-black tracking-wide select-none leading-tight font-sans">
            <span className="text-white">وسام </span>
            <span className="text-amber-200">للأدوات الكهربائية</span>
          </h1>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-extrabold text-slate-800">تسجيل الدخول للمنظومة</h2>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">اسم المستخدم</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="اسم المستخدم..."
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none bg-slate-50 focus:bg-white transition-all text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">كلمة المرور</label>
              <div className="relative">
                <Key className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none bg-slate-50 focus:bg-white transition-all font-mono text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-600 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-white font-black py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98]"
            >
              <LogIn className="w-4 h-4" />
              <span>دخول إلى النظام</span>
            </button>
          </form>
        </div>

        <div className="bg-slate-100/80 p-3 text-center text-[10px] text-slate-600 border-t border-slate-200 font-medium">
          وسام للأدوات والتوريدات الكهربائية © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};
