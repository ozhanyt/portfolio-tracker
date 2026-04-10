<?php
declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

function slugify_file_name(string $value): string
{
    $value = strtolower($value);
    $value = preg_replace('/[^a-z0-9._-]+/', '-', $value) ?? $value;
    $value = preg_replace('/-+/', '-', $value) ?? $value;
    return trim($value, '-');
}

$period = $_POST['period'] ?? '';
$reportType = $_POST['reportType'] ?? '';
$reportId = $_POST['reportId'] ?? '';

if ($period === '' || $reportType === '' || $reportId === '') {
    http_response_code(422);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Missing upload context'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!isset($_FILES['images'])) {
    http_response_code(422);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'No images uploaded'], JSON_UNESCAPED_UNICODE);
    exit;
}

$baseDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'report-assets' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . $period . DIRECTORY_SEPARATOR . $reportType . DIRECTORY_SEPARATOR . $reportId;

if (!is_dir($baseDir) && !mkdir($baseDir, 0775, true) && !is_dir($baseDir)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Upload directory could not be created'], JSON_UNESCAPED_UNICODE);
    exit;
}

$images = [];
$names = $_FILES['images']['name'] ?? [];
$tmpNames = $_FILES['images']['tmp_name'] ?? [];
$errors = $_FILES['images']['error'] ?? [];

foreach ($names as $index => $originalName) {
    if (($errors[$index] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        continue;
    }

    $safeName = slugify_file_name((string) $originalName);
    $targetName = str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT) . '-' . $safeName;
    $targetPath = $baseDir . DIRECTORY_SEPARATOR . $targetName;

    if (!move_uploaded_file($tmpNames[$index], $targetPath)) {
        continue;
    }

    $images[] = [
        'src' => '/report-assets/uploads/' . rawurlencode($period) . '/' . rawurlencode($reportType) . '/' . rawurlencode($reportId) . '/' . rawurlencode($targetName),
        'alt' => $originalName,
        'name' => $originalName,
    ];
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode(['images' => $images], JSON_UNESCAPED_UNICODE);
