@echo off
chcp 65001 > nul
title منظومة وسام للأدوات والتوريدات الكهربائية - تثبيت XAMPP تلقائياً
color 0B

echo ==============================================================================
echo    منظومة وسام للأدوات والتوريدات الكهربائية
echo    نسخ مجلد dist وتجهيز التشغيل المباشر على سيرفر XAMPP المحلي
echo ==============================================================================
echo.

set "TARGET_DIR=C:\xampp\htdocs\wessam_erp"

if not exist "C:\xampp\htdocs" (
    echo [تنبيه] لم يتم العثور على المسار الافتراضي C:\xampp\htdocs!
    echo يرجى التأكد من مسار تثبيت XAMPP على جهازك.
    echo يمكنك نسخ محتويات مجلد dist يدوياً إلى مجلد htdocs في XAMPP.
    pause
    exit /b
)

echo [1/3] جاري إنشاء مجلد البرنامج في XAMPP: %TARGET_DIR% ...
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo [2/3] جاري نسخ ملفات dist الكاملة إلى htdocs...
xcopy /E /I /Y "dist\*" "%TARGET_DIR%\"

echo [3/3] تم نسخ ملفات البرنامج بنجاح!
echo.
echo ==============================================================================
echo  المنظومة جاهزة الآن على سيرفر XAMPP المحلي!
echo  تأكد من تشغيل Apache و MySQL من XAMPP Control Panel
echo  رابط فتح البرنامج: http://localhost/wessam_erp/
echo ==============================================================================
echo.

start "" "http://localhost/wessam_erp/"

pause
