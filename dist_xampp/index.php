<?php
// Automatic Root Router for Wessam Electrical ERP in XAMPP / Apache
if (file_exists(__DIR__ . '/index.html')) {
    readfile(__DIR__ . '/index.html');
    exit();
}
?>