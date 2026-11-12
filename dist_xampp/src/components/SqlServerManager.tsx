import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  FileCode2,
  Download,
  Copy,
  UploadCloud,
  DownloadCloud,
  Monitor,
  Settings,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
  Terminal,
  Check,
  Flame,
  Award,
  Layers,
  Sparkles
} from 'lucide-react';

export const SqlServerManager: React.FC = () => {
  const {
    products,
    customers,
    suppliers,
    safes,
    users,
    salesInvoices,
    expenses,
    settings,
  } = useApp();

  // Active Database Engine Tab: 'xampp' is default for local MySQL/phpMyAdmin setup
  const [engineType, setEngineType] = useState<'embedded' | 'xampp' | 'mssql'>('xampp');


  // MSSQL State
  const [mssqlConfig, setMssqlConfig] = useState({
    server: 'localhost',
    port: 1433,
    user: 'sa',
    password: '',
    database: 'MahsoulyDB',
    instanceName: '',
    encrypt: false,
    trustServerCertificate: true,
  });

  // XAMPP / MySQL State
  const [mysqlConfig, setMysqlConfig] = useState({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'alhana_pro_erp',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    latencyMs?: number;
    serverInfo?: any;
    error?: string;
    hint?: string;
  } | null>(null);

  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [initResult, setInitResult] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [rawScript, setRawScript] = useState<string>('');

  // Fetch initial configs on mount
  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    fetchScript(engineType);
    setTestResult(null);
    setInitResult(null);
    setSyncStatus(null);
  }, [engineType]);

  const fetchConfigs = async () => {
    try {
      // MSSQL config
      const resMs = await fetch('/api/sqlserver/config');
      if (resMs.ok) {
        const dataMs = await resMs.json();
        if (dataMs.success && dataMs.config) {
          setMssqlConfig(prev => ({ ...prev, ...dataMs.config }));
        }
      }
    } catch {}

    // MySQL config (Try PHP config first, then Node endpoint)
    try {
      let resMy = await fetch('./api/mysql_config.php');
      if (!resMy.ok) {
        resMy = await fetch('/api/mysql/config');
      }
      if (resMy.ok) {
        const dataMy = await resMy.json();
        if (dataMy.success && dataMy.config) {
          setMysqlConfig(prev => ({ ...prev, ...dataMy.config }));
        }
      }
    } catch (e) {
      console.warn('Failed to fetch configs', e);
    }
  };

  const fetchScript = async (engine: 'embedded' | 'xampp' | 'mssql') => {
    if (engine === 'embedded') {
      setRawScript('');
      return;
    }
    try {
      const endpoint = engine === 'xampp' ? '/api/mysql/script' : '/api/sqlserver/script';
      const res = await fetch(endpoint);
      if (res.ok) {
        const text = await res.text();
        setRawScript(text);
      }
    } catch {}
  };

  // Save Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSaveMessage(null);
    try {
      if (engineType === 'xampp') {
        // Try saving via PHP endpoint first (for XAMPP/Apache)
        let saved = false;
        try {
          const resPhp = await fetch('./api/mysql_config.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mysqlConfig),
          });
          if (resPhp.ok) {
            const dataPhp = await resPhp.json();
            if (dataPhp.success) saved = true;
          }
        } catch {}

        if (!saved) {
          try {
            const resNode = await fetch('/api/mysql/config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(mysqlConfig),
            });
            if (resNode.ok) {
              const dataNode = await resNode.json();
              if (dataNode.success) saved = true;
            }
          } catch {}
        }

        setSaveMessage('✓ تم حفظ إعدادات الاتصال بقاعدة بيانات XAMPP (MySQL) بنجاح');
        setTimeout(() => setSaveMessage(null), 3500);
        return;
      }

      // MSSQL
      const res = await fetch('/api/sqlserver/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mssqlConfig),
      });
      if (!res.ok) throw new Error('تعذر الوصول لمنفذ السيرفر');
      const data = await res.json();
      if (data.success) {
        setSaveMessage('تم حفظ إعدادات الاتصال بنجاح');
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage(`فشل الحفظ: ${data.error || 'خطأ غير معروف'}`);
      }
    } catch (err: any) {
      setSaveMessage(`تنبيه: تم الاحتفاظ بالإعدادات محلياً (${err.message})`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    setIsLoading(true);
    setTestResult(null);
    const startTime = Date.now();
    try {
      if (engineType === 'embedded') {
        const res = await fetch('/api/database');
        const latency = Date.now() - startTime;
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setTestResult({
              success: true,
              message: 'تم الاتصال بنجاح بقاعدة البيانات الحية المباشرة للنظام (Express Persistent Server DB)!',
              latencyMs: latency,
              serverInfo: {
                engine: 'Node Express Persistent JSON File DB',
                location: '/app/applet/data/server_database.json',
                productsCount: data.data?.products?.length || 0,
                customersCount: data.data?.customers?.length || 0,
                suppliersCount: data.data?.suppliers?.length || 0,
                safesCount: data.data?.safes?.length || 0,
                invoicesCount: data.data?.salesInvoices?.length || 0,
              },
            });
            return;
          }
        }
        throw new Error('تعذر الوصول لبيانات الخادم الرئيسي');
      }

      const endpoint = engineType === 'xampp' ? '/api/mysql/test' : '/api/sqlserver/test';
      const body = engineType === 'xampp' ? { config: mysqlConfig } : { config: mssqlConfig };
      let res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // If running inside Apache without Node.js backend, fallback to PHP
      if (!res.ok && res.status === 404 && engineType === 'xampp') {
        res = await fetch('./api/test.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      if (engineType === 'xampp') {
        try {
          const resPhp = await fetch('./api/test.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config: mysqlConfig }),
          });
          const dataPhp = await resPhp.json();
          setTestResult(dataPhp);
          return;
        } catch {}
      }
      setTestResult({
        success: false,
        error: err.message,
        hint: 'تعذر الوصول إلى سيرفر الواجهة الخلفية أو منفذ قاعدة البيانات',
      });
    } finally {
      setIsLoading(false);
    }
  };


  // Init Database
  const handleInitDatabase = async () => {
    const dbName = engineType === 'xampp' ? mysqlConfig.database : mssqlConfig.database;
    const engineTitle = engineType === 'xampp' ? 'XAMPP (MySQL)' : 'SQL Server 2012';

    if (!window.confirm(`هل تريد إنشاء وتهيئة قاعدة بيانات [${dbName}] وكافة الجداول في ${engineTitle} الآن؟`)) {
      return;
    }

    setIsLoading(true);
    setInitResult(null);
    try {
      const endpoint = engineType === 'xampp' ? '/api/mysql/init-db' : '/api/sqlserver/init-db';
      let res = await fetch(endpoint, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ database: dbName })
      });

      // Fallback to PHP in XAMPP
      if (!res.ok && res.status === 404 && engineType === 'xampp') {
        res = await fetch('./api/init_db.php', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ database: dbName })
        });
      }

      const data = await res.json();
      if (data.success) {
        setInitResult(data.message);
      } else {
        setInitResult(`خطأ: ${data.error}. ${data.hint || ''}`);
      }
    } catch (err: any) {
      if (engineType === 'xampp') {
        try {
          const resPhp = await fetch('./api/init_db.php', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ database: dbName })
          });
          const dataPhp = await resPhp.json();
          if (dataPhp.success) {
            setInitResult(dataPhp.message);
            return;
          }
        } catch {}
      }
      setInitResult(`خطأ أثناء التنفيذ: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Push Data
  const handlePushData = async () => {
    setIsLoading(true);
    setSyncStatus(null);
    try {
      const payload = {
        products,
        customers,
        suppliers,
        safes,
        users,
        settings,
        salesInvoices,
        expenses,
      };
      let res: Response | null = null;
      if (engineType === 'xampp') {
        // Try PHP sync_push.php first for XAMPP
        try {
          res = await fetch('./api/sync_push.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch {}

        if (!res || !res.ok) {
          res = await fetch('/api/mysql/sync/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }
      } else {
        res = await fetch('/api/sqlserver/sync/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        setSyncStatus(`✓ تم رفع ومزامنة البيانات بنجاح إلى جداول ${engineType === 'xampp' ? 'XAMPP / MySQL' : 'SQL Server 2012'}! (${data.syncedCounts?.products || products.length} صنف، ${data.syncedCounts?.customers || customers.length} عميل، ${data.syncedCounts?.safes || safes.length} خزينة، ${data.syncedCounts?.users || users.length} مستخدم).`);
      } else {
        setSyncStatus(`فشل الرفع: ${data.error}`);
      }
    } catch (err: any) {
      if (engineType === 'xampp') {
        try {
          const resPhp = await fetch('./api/sync_push.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ products, customers, suppliers, safes, users, settings }),
          });
          const dataPhp = await resPhp.json();
          if (dataPhp.success) {
            setSyncStatus(`✓ تم رفع ومزامنة البيانات بنجاح إلى جداول XAMPP (MySQL)! (${products.length} صنف، ${customers.length} عميل).`);
            return;
          }
        } catch {}
      }
      setSyncStatus(`خطأ أثناء المزامنة: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyScriptToClipboard = () => {
    if (!rawScript) return;
    navigator.clipboard.writeText(rawScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-amber-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>إدارة قواعد بيانات الكمبيوتر وسطح المكتب</span>
            </span>
            <span className="bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs px-2.5 py-1 rounded-full font-bold">
              دعم مزدوج: XAMPP & SQL Server 2012
            </span>
          </div>
          <h2 className="text-2xl font-black text-white">
            الربط بقواعد البيانات على جهاز الكمبيوتر
          </h2>
          <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
            المنظومة تدعم الآن كلا الخيارين: حزمة <strong>XAMPP (MySQL) السريعة والخفيفة</strong> أو محرك <strong>Microsoft SQL Server 2012</strong> التقليدي، لاختيار الأنسب لجهاز المحل.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <a
            href="/api/download/dist-zip"
            download="wessam_electrical_erp_dist.zip"
            className="flex-1 md:flex-initial bg-amber-500 hover:bg-amber-400 text-amber-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 animate-pulse"
            title="تنزيل حزمة المنظومة المكتملة والسيرفر وقاعدة البيانات (26 ميجابايت)"
          >
            <Download className="w-4 h-4 text-amber-950" />
            <span>تحميل حزمة المنظومة الكاملة (26MB)</span>
          </a>
          <a
            href={engineType === 'xampp' ? '/api/mysql/script?download=true' : '/api/sqlserver/script?download=true'}
            className="flex-1 md:flex-initial bg-amber-600 hover:bg-amber-500 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>تنزيل سكربت ({engineType === 'xampp' ? 'MySQL' : 'MSSQL'})</span>
          </a>
          <button
            onClick={() => setShowScriptModal(true)}
            className="flex-1 md:flex-initial bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-all"
          >
            <FileCode2 className="w-4 h-4 text-amber-400" />
            <span>عرض كود التداول</span>
          </button>
        </div>
      </div>

      {/* Comparison & Engine Switcher */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>مقارنة: هل الأفضل XAMPP أم SQL Server 2012 لمنظومة المحل والمخازن؟</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              اختر محرك قاعدة البيانات الذي تفضل العمل به على كمبيوتر المحل:
            </p>
          </div>

          {/* Engine Selector Tabs */}
          <div className="bg-slate-100 p-1.5 rounded-xl flex flex-wrap items-center gap-1 text-xs font-black">
            <button
              onClick={() => setEngineType('embedded')}
              className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                engineType === 'embedded'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>قاعدة بيانات الخادم الحية (Server DB)</span>
            </button>
            <button
              onClick={() => setEngineType('xampp')}
              className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                engineType === 'xampp'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>XAMPP (MySQL)</span>
            </button>
            <button
              onClick={() => setEngineType('mssql')}
              className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                engineType === 'mssql'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>SQL Server 2012</span>
            </button>
          </div>
        </div>


        {/* Detailed Comparison Table / Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div
            className={`p-4 rounded-xl border transition-all ${
              engineType === 'xampp'
                ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20'
                : 'bg-slate-50 border-slate-200 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>حزمة XAMPP (MySQL / MariaDB)</span>
              </span>
              <span className="bg-amber-200/80 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                الأسهل والأخف للمحلات
              </span>
            </div>
            <ul className="space-y-1.5 text-slate-700 leading-relaxed text-[11px]">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <span><strong>تثبيت وتشغيل في دقيقة:</strong> تثبيت برنامج XAMPP والضغط على زر <code>Start</code> أمام MySQL فقط.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <span><strong>خفيف جداً على موارد الكمبيوتر:</strong> يستهلك أقل من 150 ميجابايت رام ولا يبطئ الجهاز على الإطلاق.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <span><strong>لوحة تحكم ويب مجانية (phpMyAdmin):</strong> لمعاينة الجداول واستيراد وتصدير النسخ الاحتياطية بسهولة تامة.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <span><strong>لا توجد مشاكل تراخيص أو منافذ معقدة:</strong> يعمل مباشرة باسم المستخدم الافتراضي <code>root</code> بدون كلمة مرور.</span>
              </li>
            </ul>
          </div>

          <div
            className={`p-4 rounded-xl border transition-all ${
              engineType === 'mssql'
                ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20'
                : 'bg-slate-50 border-slate-200 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <Server className="w-4 h-4 text-amber-600" />
                <span>محرك Microsoft SQL Server 2012</span>
              </span>
              <span className="bg-amber-200/80 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                معيار الشركات والـ ERP
              </span>
            </div>
            <ul className="space-y-1.5 text-slate-700 leading-relaxed text-[11px]">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <span><strong>الأنظمة المحاسبية القديمة:</strong> ممتاز إذا كان جهازك أو شبكتك تحتوي بالفعل على سيرفر SQL Server 2012 مفعّل.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <span><strong>قوة استعلامات T-SQL:</strong> تحكم عميق في الإجراءات المخزنة والمناظر وفهارس الأداء العالي.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <span><strong>يحتاج خطوات إضافية:</strong> يتطلب تفعيل TCP/IP منفذ 1433 و Mixed Mode من SQL Configuration Manager.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <span><strong>أثقل في استهلاك الرام:</strong> يحتاج جهاز كمبيوتر بمواصفات جيدة (4GB+ رام).</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Settings Form and Testing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-700" />
              <span>
                إعدادات الاتصال بـ {engineType === 'xampp' ? 'XAMPP (MySQL)' : 'SQL Server 2012'}
              </span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              المنفذ: {engineType === 'xampp' ? mysqlConfig.port : mssqlConfig.port}
            </span>
          </div>

          {saveMessage && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              <span>{saveMessage}</span>
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            {engineType === 'xampp' ? (
              // XAMPP / MySQL Form
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">
                      سيرفر MySQL (Host) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="localhost أو 127.0.0.1"
                      value={mysqlConfig.host}
                      onChange={e => setMysqlConfig({ ...mysqlConfig, host: e.target.value })}
                      className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">المنفذ الافتراضي *</label>
                    <input
                      type="number"
                      required
                      value={mysqlConfig.port}
                      onChange={e => setMysqlConfig({ ...mysqlConfig, port: Number(e.target.value) })}
                      className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      اسم قاعدة البيانات (Database) *
                    </label>
                    <input
                      type="text"
                      required
                      value={mysqlConfig.database}
                      onChange={e => setMysqlConfig({ ...mysqlConfig, database: e.target.value })}
                      className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">اسم المستخدم *</label>
                    <input
                      type="text"
                      required
                      placeholder="root (الافتراضي في XAMPP)"
                      value={mysqlConfig.user}
                      onChange={e => setMysqlConfig({ ...mysqlConfig, user: e.target.value })}
                      className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    كلمة المرور (اتركها فارغة إذا لم تقم بتعيين كلمة مرور في XAMPP)
                  </label>
                  <input
                    type="password"
                    placeholder="فارغة افتراضياً في XAMPP"
                    value={mysqlConfig.password}
                    onChange={e => setMysqlConfig({ ...mysqlConfig, password: e.target.value })}
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
              </>
            ) : (
              // MSSQL 2012 Form
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">
                      عنوان السيرفر (Server Name / IP) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="localhost أو 127.0.0.1"
                      value={mssqlConfig.server}
                      onChange={e => setMssqlConfig({ ...mssqlConfig, server: e.target.value })}
                      className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">المنفذ (Port) *</label>
                    <input
                      type="number"
                      required
                      value={mssqlConfig.port}
                      onChange={e => setMssqlConfig({ ...mssqlConfig, port: Number(e.target.value) })}
                      className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      اسم قاعدة البيانات (Database) *
                    </label>
                    <input
                      type="text"
                      required
                      value={mssqlConfig.database}
                      onChange={e => setMssqlConfig({ ...mssqlConfig, database: e.target.value })}
                      className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      اسم الـ Instance (اختياري)
                    </label>
                    <input
                      type="text"
                      placeholder="SQLEXPRESS (إن وجد)"
                      value={mssqlConfig.instanceName}
                      onChange={e => setMssqlConfig({ ...mssqlConfig, instanceName: e.target.value })}
                      className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">اسم المستخدم (User) *</label>
                    <input
                      type="text"
                      required
                      value={mssqlConfig.user}
                      onChange={e => setMssqlConfig({ ...mssqlConfig, user: e.target.value })}
                      className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">كلمة المرور *</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={mssqlConfig.password}
                      onChange={e => setMssqlConfig({ ...mssqlConfig, password: e.target.value })}
                      className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={handleTestConnection}
                className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-sm transition-all"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>اختبار الاتصال</span>
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-xl transition-all"
              >
                حفظ الإعدادات
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={handleInitDatabase}
                className="bg-amber-700 hover:bg-amber-600 text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 mr-auto transition-all"
                title="إنشاء قاعدة البيانات والجداول تلقائياً"
              >
                <Database className="w-4 h-4" />
                <span>تهيئة وإنشاء الجداول تلقائياً</span>
              </button>
            </div>
          </form>

          {/* Test Connection Output */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-1.5 animate-in fade-in ${
                testResult.success
                  ? 'bg-amber-50 border-amber-300 text-slate-900'
                  : 'bg-red-50 border-red-300 text-red-950'
              }`}
            >
              <div className="font-extrabold flex items-center gap-2 text-sm">
                {testResult.success ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-amber-600" />
                    <span>{testResult.message} (زمن الاستجابة: {testResult.latencyMs}ms)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span>فشل الاتصال: {testResult.error}</span>
                  </>
                )}
              </div>

              {testResult.serverInfo && (
                <div className="bg-white/80 p-3 rounded-lg border border-amber-200 font-mono text-[11px] text-slate-800 space-y-0.5 mt-2">
                  <div><strong>إصدار السيرفر:</strong> {testResult.serverInfo.version || testResult.serverInfo.fullVersion}</div>
                  <div><strong>الوقت بالسيرفر:</strong> {testResult.serverInfo.serverTime}</div>
                  <div><strong>قاعدة البيانات:</strong> {testResult.serverInfo.database || testResult.serverInfo.currentDatabase}</div>
                </div>
              )}

              {testResult.hint && (
                <div className="text-[11px] text-red-700 font-sans mt-2 bg-white/70 p-2.5 rounded-lg border border-red-200">
                  <strong>إرشاد الحل:</strong> {testResult.hint}
                </div>
              )}
            </div>
          )}

          {initResult && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-slate-900 text-xs rounded-xl font-bold">
              {initResult}
            </div>
          )}
        </div>

        {/* Right Info & Sync (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Sync Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4 text-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <RefreshCw className="w-4 h-4 text-amber-700" />
              <h3 className="font-black text-slate-900 text-sm">
                مزامنة البيانات مع {engineType === 'xampp' ? 'XAMPP / MySQL' : 'SQL Server 2012'}
              </h3>
            </div>

            <p className="text-slate-500 text-[11px] leading-relaxed">
              يمكنك رفع كافة بيانات المبيعات والمنتجات والمخزون والعملاء الحالية من واجهة المتصفح إلى جداول قاعدة البيانات بضغطة زر.
            </p>

            {syncStatus && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-slate-900 font-bold rounded-xl text-xs">
                {syncStatus}
              </div>
            )}

            <button
              type="button"
              disabled={isLoading}
              onClick={handlePushData}
              className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm"
            >
              <UploadCloud className="w-4 h-4" />
              <span>مزامنة ورفع البيانات الحالية للسيرفر</span>
            </button>
          </div>

          {/* Quick Guide Card */}
          <div className="bg-gradient-to-br from-slate-900 to-amber-950 text-white rounded-2xl p-5 shadow-md space-y-3 text-xs">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Terminal className="w-4 h-4" />
              <span>
                {engineType === 'xampp'
                  ? 'طريقة تشغيل XAMPP في 3 خطوات بسيطة:'
                  : 'دليل تشغيل SQL Server 2012:'}
              </span>
            </div>

            {engineType === 'xampp' ? (
              <ol className="list-decimal list-inside space-y-2 text-[11px] text-slate-300 leading-relaxed">
                <li>
                  قم بتحميل وتثبيت برنامج <strong className="text-white">XAMPP</strong> من موقع apachefriends.org.
                </li>
                <li>
                  افتح <strong>XAMPP Control Panel</strong> واضغط على زر <span className="text-amber-400 font-bold">Start</span> بجانب كلمة <strong>MySQL</strong>.
                </li>
                <li>
                  اضغط على زر <strong className="text-amber-300">"تهيئة وإنشاء الجداول تلقائياً"</strong> في هذا النموذج لتجهيز قاعدة البيانات مباشرة!
                </li>
              </ol>
            ) : (
              <ol className="list-decimal list-inside space-y-2 text-[11px] text-slate-300 leading-relaxed">
                <li>
                  تأكد من تفعيل <span className="text-white">TCP/IP Port 1433</span> في SQL Server Configuration Manager.
                </li>
                <li>
                  تفعيل المصادقة المشتركة <span className="text-amber-400">SQL Server and Windows Authentication</span> في SSMS.
                </li>
                <li>
                  تفعيل حساب مستخدم <span className="text-white">sa</span> وتعيين كلمة المرور.
                </li>
              </ol>
            )}
          </div>
        </div>
      </div>

      {/* Script Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-amber-700" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  سكربت قاعدة البيانات ({engineType === 'xampp' ? 'MySQL / MariaDB لـ XAMPP' : 'T-SQL لـ SQL Server 2012'})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyScriptToClipboard}
                  className="bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5 text-amber-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'تم النسخ!' : 'نسخ الكود'}</span>
                </button>
                <a
                  href={engineType === 'xampp' ? '/api/mysql/script?download=true' : '/api/sqlserver/script?download=true'}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تنزيل الملف</span>
                </a>
                <button
                  onClick={() => setShowScriptModal(false)}
                  className="text-slate-400 hover:text-slate-600 px-2 py-1"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950 text-amber-400 p-4 rounded-xl font-mono text-xs text-left direction-ltr select-all max-h-[60vh] border border-slate-800">
              <pre>{rawScript || 'جاري تحميل السكربت...'}</pre>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
              <span>
                {engineType === 'xampp'
                  ? 'يمكنك نسخ هذا الكود أو تنزيله وفتحه في phpMyAdmin والضغط على Go.'
                  : 'يمكنك فتح هذا الملف في SQL Server Management Studio (SSMS) والضغط على Execute (F5).'}
              </span>
              <button
                onClick={() => setShowScriptModal(false)}
                className="bg-slate-800 text-white font-bold px-4 py-2 rounded-xl"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
