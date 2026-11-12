<?php
// Automatic Root Router for Alhana Pro ERP in XAMPP
if (file_exists(__DIR__ . '/index.html')) {
    include __DIR__ . '/index.html';
    exit();
} else if (file_exists(__DIR__ . '/dist/index.html')) {
    include __DIR__ . '/dist/index.html';
    exit();
}
?>
