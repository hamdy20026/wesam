<?php
// download_dist.php - Direct streaming of the complete application ZIP for XAMPP
header("Access-Control-Allow-Origin: *");

$possibleZips = [
    __DIR__ . '/../wessam_electrical_erp_dist.zip',
    __DIR__ . '/../dist.zip',
    __DIR__ . '/wessam_electrical_erp_dist.zip',
    __DIR__ . '/dist.zip',
    dirname(__DIR__, 2) . '/wessam_electrical_erp_dist.zip',
    dirname(__DIR__, 2) . '/dist.zip',
];

$targetFile = null;
foreach ($possibleZips as $path) {
    if (file_exists($path) && filesize($path) > 100000) {
        $targetFile = $path;
        break;
    }
}

if (!$targetFile) {
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => 'حزمة التوزيع الكاملة (dist.zip) غير موجودة على الخادم.'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// Clear any output buffer
if (ob_get_level()) {
    ob_end_clean();
}

$filename = 'wessam_electrical_erp_dist.zip';
$filesize = filesize($targetFile);

header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . $filesize);
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

readfile($targetFile);
exit();
?>
