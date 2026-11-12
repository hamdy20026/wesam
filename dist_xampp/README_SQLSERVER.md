# دليل تشغيل منظومة "محصولي" على الكمبيوتر والربط مع Microsoft SQL Server 2012

تمت تهيئة وتطوير المنظومة لتعمل محلياً على أجهزة الكمبيوتر (Desktop / PC) وتتصل مباشرة بمحرك قواعد البيانات **Microsoft SQL Server 2012** (أو أي إصدار أحدث 2014, 2016, 2019, 2022).

---

## 1. متطلبات التشغيل على جهاز الكمبيوتر:
1. **Node.js** (إصدار 18 أو 20 أو 22) - متوفر مجاناً على [nodejs.org](https://nodejs.org).
2. محرك **Microsoft SQL Server 2012** (Standard أو Enterprise أو Express).
3. أداة **SQL Server Management Studio (SSMS)**.

---

## 2. خطوات تهيئة SQL Server 2012 على الويندوز:

### الخطوة الأولى: تفعيل بروتوكول TCP/IP (منفذ 1433)
1. افتح من قائمة ابدأ: **SQL Server Configuration Manager**.
2. توجّه إلى: `SQL Server Network Configuration` > `Protocols for MSSQLSERVER` (أو `Protocols for SQLEXPRESS`).
3. اضغط كليك يمين على **TCP/IP** واختر **Enable**.
4. افتح **Properties** لـ TCP/IP، وتوجّه لتبويب **IP Addresses**، وانزل لأسفل عند `IPAll`:
   - امسح أي قيمة في `TCP Dynamic Ports`.
   - اضبط `TCP Port` = `1433`.
5. أعد تشغيل خدمة SQL Server من قائمة Services.

### الخطوة الثانية: تفعيل الدخول بالمصادقة المشتركة (Mixed Mode Authentication)
1. افتح برنامج **SQL Server Management Studio (SSMS 2012)** وسجّل الدخول بـ Windows Authentication.
2. كليك يمين على اسم السيرفر > **Properties** > **Security**.
3. تحت *Server authentication*، اختر:
   **SQL Server and Windows Authentication mode**.
4. اضغط **OK**.

### الخطوة الثالثة: تفعيل مستخدم `sa` وتعيين كلمة المرور
1. في SSMS، افتح المجلد: `Security` > `Logins` > اضغط مرتين على `sa`.
2. في تبويب *General*، اكتب كلمة المرور (مثلاً: `123456`).
3. في تبويب *Status*:
   - اختر *Permission to connect to database engine*: **Grant**.
   - اختر *Login*: **Enabled**.
4. أعد تشغيل خدمة SQL Server (Restart).

### الخطوة الرابعة: إنشاء قاعدة البيانات والجداول
- يمكنك الضغط على زر **"تهيئة وإنشاء الجداول تلقائياً"** من داخل شاشة "سيكول سيرفر 2012" في البرنامج.
- **أو** فتح ملف السكربت المرفق: `src/data/sqlserver2012_schema.sql` داخل SSMS والضغط على **Execute (F5)** لإنشاء قاعدة بيانات `MahsoulyDB` بكافة الجداول والفهارس والمناظر الذكية.

---

## 3. تشغيل البرنامج على الكمبيوتر:
اضغط نقرتين مزدوجتين على الملف:
```cmd
run_desktop.bat
```
سيقوم الملف تلقائياً بفحص الحزم وتشغيل السيرفر المحلي وفتح البرنامج فوراً في المتصفح على:
`http://localhost:3000`

---

## 4. إعدادات الاتصال الافتراضية داخل البرنامج:
- **Server:** `localhost` أو `127.0.0.1` أو `.\SQLEXPRESS`
- **Port:** `1433`
- **Database:** `MahsoulyDB`
- **User:** `sa`
- **Password:** كلمة المرور الخاصة بك
- **Encrypt:** `false` (للتوافق التام مع إصدار 2012 المحلي)
- **Trust Server Certificate:** `true`
