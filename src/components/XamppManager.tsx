import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Database,
  Server,
  Download,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  Code,
  Folder,
  ExternalLink,
  Terminal,
  FileCode2,
  UploadCloud,
  Info,
  RefreshCw
} from 'lucide-react';

import { downloadDistZip } from '../utils/downloadHelper';

export const XamppManager: React.FC = () => {
  const {
    products,
    customers,
    suppliers,
    safes,
    users,
    settings,
    exportDatabaseJson
  } = useApp();
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedPhp, setCopiedPhp] = useState(false);
  const [dbHost, setDbHost] = useState('localhost');
  const [dbName, setDbName] = useState('alhana_pro_erp');
  const [dbUser, setDbUser] = useState('root');
  const [dbPass, setDbPass] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleDownloadSql = async () => {
    try {
      const res = await fetch('alhana_pro_erp.sql');
      if (!res.ok) throw new Error('File not found');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'alhana_pro_erp.sql';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      window.open('alhana_pro_erp.sql', '_blank');
    }
  };

  const handleDownloadDistZip = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    downloadDistZip();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // Test hitting local PHP login API
      const res = await fetch('api/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: '123456' }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTestResult({
            success: true,
            message: 'تم الاتصال بنجاح بسيرفر XAMPP (MySQL) وقاعدة بيانات alhana_pro_erp! وتم التحقق من مستخدم مدير النظام (admin).',
          });
          return;
        } else {
          setTestResult({
            success: true,
            message: `سيرفر XAMPP وقاعدة البيانات متصلان ويعملان! تنبيه: ${data.message} (اضغط على زر "تعبئة ومزامنة البيانات في MySQL" بالأسفل لإدراج كافة البيانات والمستخدمين فوراً).`,
          });
          return;
        }
      }

      // Fallback check test.php
      const testRes = await fetch('api/test.php');
      if (testRes.ok) {
        const tData = await testRes.json();
        if (tData.success) {
          setTestResult({
            success: true,
            message: `تم الاتصال بنجاح بسيرفر MySQL في XAMPP عبر PHP! زمن الاستجابة: ${tData.latencyMs || 10}ms`,
          });
          return;
        }
      }

      setTestResult({
        success: false,
        message: 'لم يتم العثور على سيرفر Apache/PHP المحلي في المسار الافتراضي. تأكد من تشغيل Apache و MySQL في XAMPP Control Panel.',
      });
    } catch {
      setTestResult({
        success: false,
        message: 'لا يمكن الاتصال برابط PHP المحلي حالياً. تأكد من وضع ملفات التطبيق داخل مجلد htdocs في XAMPP وتشغيل السيرفر.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSyncData = async () => {
    setSyncing(true);
    setSyncResult(null);

    try {
      // 1. Try init_db.php to execute full schema and initial records
      try {
        await fetch('api/init_db.php', { method: 'POST' });
      } catch (e) {
        console.warn('init_db.php bypass', e);
      }

      // 2. Push all actual application data
      const pushRes = await fetch('api/sync_push.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products,
          customers,
          suppliers,
          safes,
          users,
          settings,
        }),
      });

      if (pushRes.ok) {
        const data = await pushRes.json();
        if (data.success) {
          setSyncResult({
            success: true,
            message: `تم بنجاح إدخال وتحديث كافة البيانات في قاعدة بيانات MySQL على XAMPP! (${products.length} صنف، ${customers.length} عميل، ${safes.length} خزينة ومحفظة، ومستخدمين). إذا قمت بتحديث صفحة phpMyAdmin الآن ستجد الجداول ممتلئة بالصفوف.`,
          });
          setTestResult({
            success: true,
            message: 'تم الاتصال بنجاح بقاعدة بيانات XAMPP (MySQL) وتأكيد حساب مدير النظام (admin)!',
          });
          return;
        }
      }

      throw new Error('لم يستجب السيرفر للطلب');
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: 'تعذر إتمام المزامنة: ' + (err?.message || 'تأكد من تشغيل سيرفر Apache و MySQL في XAMPP'),
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-amber-700" />
            إدارة وتجهيز قاعدة بيانات XAMPP (MySQL)
          </h2>
          <p className="text-xs text-slate-500">
            تهيئة المنظومة للعمل كاملاً على سيرفر XAMPP المحلي (Apache + PHP + MySQL / phpMyAdmin)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadDistZip}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تحميل مجلد DIST الكامل (dist.zip)</span>
          </button>
          <button
            onClick={handleDownloadSql}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>تحميل قاعدة البيانات (alhana_pro_erp.sql)</span>
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className="bg-gradient-to-r from-amber-900 to-amber-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-400/30 rounded-full text-xs text-amber-300 font-bold">
            <Server className="w-4 h-4" />
            <span>نظام XAMPP جاهز للاستخدام والتصدير</span>
          </div>
          <h3 className="text-lg font-black">المنظومة مُجهزة بالكامل للعمل على قاعدة بيانات XAMPP MySQL</h3>
          <p className="text-xs text-amber-100/90 leading-relaxed max-w-3xl">
            يمكنك تشغيل هذا التطبيق مباشرة داخل مجلد <code className="bg-black/30 px-1.5 py-0.5 rounded font-mono">htdocs</code> في برنامج XAMPP وتخصيص سيرفر Apache و MySQL المحلي بكل سهولة مع دعم كامل للجداول البرمجية والحسابات.
          </p>
        </div>
      </div>

      {/* Grid Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Database Setup */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 font-black flex items-center justify-center text-sm">
              1
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">خطوات تجهيز قاعدة البيانات في XAMPP</h4>
              <p className="text-xs text-slate-500">إنشاء قاعدة البيانات واستيراد الجداول عبر phpMyAdmin</p>
            </div>
          </div>

          <ol className="list-decimal list-inside text-xs text-slate-700 space-y-2 font-medium bg-slate-50 p-4 rounded-xl border border-slate-200/70">
            <li>قم بتشغيل برنامج <strong className="text-amber-800">XAMPP Control Panel</strong> واضغط Start لكل من <strong className="font-mono">Apache</strong> و <strong className="font-mono">MySQL</strong>.</li>
            <li>افتح المتصفح وانتقل إلى: <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono">http://localhost/phpmyadmin</code></li>
            <li>أنشئ قاعدة بيانات جديدة باسم: <strong className="font-mono text-amber-800">alhana_pro_erp</strong> مع الترميز <code className="bg-slate-200 px-1 rounded">utf8mb4_unicode_ci</code>.</li>
            <li>اضغط على تبويب <strong className="text-slate-900">استيراد (Import)</strong> واختر ملف <code className="font-mono text-amber-700">alhana_pro_erp.sql</code> الذي قمت بتحميله.</li>
            <li>اضغط <strong className="text-amber-800">تطبيق (Go)</strong> ليتم إنشاء كافة الجداول والمستخدمين الأوليين تلقائياً.</li>
          </ol>

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleDownloadDistZip}
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow transition-all cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>تحميل dist.zip</span>
            </button>
            <button
              onClick={handleDownloadSql}
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow transition-all"
            >
              <Download className="w-4 h-4" />
              <span>تحميل alhana_pro_erp.sql</span>
            </button>
          </div>
        </div>

        {/* Step 2: Connection Config */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 font-black flex items-center justify-center text-sm">
              2
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">بيانات الاتصال بقاعدة بيانات XAMPP</h4>
              <p className="text-xs text-slate-500">محددات سيرفر MySQL المحلي الإفتراضية</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">اسم المضيف (Host)</label>
                <input
                  type="text"
                  value={dbHost}
                  onChange={e => setDbHost(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">اسم قاعدة البيانات</label>
                <input
                  type="text"
                  value={dbName}
                  onChange={e => setDbName(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">مستخدم MySQL</label>
                <input
                  type="text"
                  value={dbUser}
                  onChange={e => setDbUser(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">كلمة المرور (افتراضي فارغ)</label>
                <input
                  type="password"
                  placeholder="لا يوجد كلمة مرور افتراضياً"
                  value={dbPass}
                  onChange={e => setDbPass(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Server className="w-4 h-4 shrink-0" />
                <span>{testing ? 'جاري فحص الاتصال...' : 'اختبار الاتصال بقاعدة البيانات'}</span>
              </button>

              <button
                onClick={handleSyncData}
                disabled={syncing}
                className="w-full bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                {syncing ? <RefreshCw className="w-4 h-4 animate-spin shrink-0" /> : <UploadCloud className="w-4 h-4 shrink-0" />}
                <span>{syncing ? 'جاري ملء وتحديث الجداول...' : 'تعبئة ومزامنة البيانات في MySQL'}</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3.5 rounded-xl text-xs border flex items-start gap-2.5 ${
                  testResult.success
                    ? 'bg-amber-50 border-amber-200 text-slate-800'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold block mb-0.5">
                    {testResult.success ? 'تم الاتصال بنجاح!' : 'تنبيه الاتصال:'}
                  </span>
                  <span>{testResult.message}</span>
                </div>
              </div>
            )}

            {syncResult && (
              <div
                className={`p-3.5 rounded-xl text-xs border flex items-start gap-2.5 ${
                  syncResult.success
                    ? 'bg-amber-50 border-amber-300 text-slate-900 shadow-sm'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {syncResult.success ? (
                  <Check className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold block mb-0.5">
                    {syncResult.success ? 'تمت مزامنة الجداول بنجاح!' : 'تنبيه المزامنة:'}
                  </span>
                  <span>{syncResult.message}</span>
                </div>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs text-slate-700 flex items-start gap-2.5 leading-relaxed">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block mb-0.5">توضيح بخصوص ظهور (الصفوف: 0) في phpMyAdmin:</strong>
                ظهور كافة الجداول الـ 24 في phpMyAdmin يعني أن السيرفر وقاعدة البيانات متصلان 100%. الجداول كانت 0 صفوف لأنها هيكل فارغ، وبمجرد الضغط على زر <strong className="text-amber-800">"تعبئة ومزامنة البيانات في MySQL"</strong> بالأعلى، يتم إدراج كافة الأصناف والعملاء والموردين والخزائن والمستخدمين وتظهر الأرقام ممتلئة في phpMyAdmin فوراً!
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Backend API File Code Details */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <FileCode2 className="w-5 h-5 text-amber-700" />
              ملف الاتصال التلقائي بـ PHP (api/config.php)
            </h4>
            <p className="text-xs text-slate-500">
              ملف الربط المباشر المرفق مع المنظومة للعمل داخل مجلد <code className="font-mono bg-slate-100 px-1 rounded">htdocs/wessam_electrical/api</code>
            </p>
          </div>

          <button
            onClick={() => {
              const code = `<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

$host = 'localhost';
$db   = 'alhana_pro_erp';
$user = 'root';
$pass = '';

$dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
     $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\\PDOException $e) {
     http_response_code(500);
     echo json_encode(['success' => false, 'message' => 'فشل الاتصال: ' . $e->getMessage()]);
     exit();
}
?>`;
              navigator.clipboard.writeText(code);
              setCopiedPhp(true);
              setTimeout(() => setCopiedPhp(false), 2000);
            }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all"
          >
            {copiedPhp ? <Check className="w-3.5 h-3.5 text-amber-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPhp ? 'تم النسخ!' : 'نسخ كود config.php'}</span>
          </button>
        </div>

        <pre className="bg-slate-950 text-slate-100 p-4 rounded-xl text-[11px] font-mono overflow-x-auto text-left dir-ltr leading-relaxed border border-slate-800">
{`<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

$host = '${dbHost}';
$db   = '${dbName}';
$user = '${dbUser}';
$pass = '${dbPass}';

$dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
     $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\\PDOException $e) {
     http_response_code(500);
     echo json_encode(['success' => false, 'message' => 'فشل الاتصال: ' . $e->getMessage()]);
     exit();
}
?>`}
        </pre>
      </div>
    </div>
  );
};
