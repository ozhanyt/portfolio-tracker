<?php
declare(strict_types=1);

$targetBase = 'https://script.google.com/macros/s/AKfycbxpdC1g4tQrIUP1wUPJnJ7l_un0mo2imEQrw7V78_wnRfUQdfdBSLwU-mgXup70Fx6AJQ/exec';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$query = $_SERVER['QUERY_STRING'] ?? '';
$targetUrl = $targetBase . ($query ? ('?' . $query) : '');

$ch = curl_init($targetUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 25,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_USERAGENT => 'fontahmin-proxy/1.0',
]);

$response = curl_exec($ch);
$statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'application/json; charset=utf-8';
$error = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => 'Proxy request failed',
        'details' => $error,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code($statusCode ?: 200);
header('Content-Type: ' . $contentType);
echo $response;
