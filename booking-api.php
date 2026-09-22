<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function load_booking_config(): array
{
    $configPath = dirname(__DIR__) . '/booking-config.php';
    if (!is_file($configPath)) {
        respond(503, [
            'ok' => false,
            'error' => 'integration_not_configured',
            'message' => 'Онлайн-запись пока не настроена. Позвоните нам, и мы подберём рейс.',
        ]);
    }
    $config = require $configPath;
    if (!is_array($config)) {
        respond(503, ['ok' => false, 'error' => 'integration_not_configured', 'message' => 'Онлайн-запись пока не настроена.']);
    }
    $endpoint = rtrim((string)($config['endpoint'] ?? ''), '/');
    $secret = trim((string)($config['secret'] ?? ''));
    if (!filter_var($endpoint, FILTER_VALIDATE_URL) || stripos($endpoint, 'https://') !== 0 || strlen($secret) < 24) {
        respond(503, ['ok' => false, 'error' => 'integration_not_configured', 'message' => 'Онлайн-запись пока не настроена.']);
    }
    return ['endpoint' => $endpoint, 'secret' => $secret];
}

function proxy_request(string $method, string $url, string $secret, ?string $body = null): void
{
    if (!extension_loaded('curl')) {
        respond(503, ['ok' => false, 'error' => 'curl_unavailable', 'message' => 'Сервис записи временно недоступен.']);
    }
    $curl = curl_init($url);
    $headers = [
        'Accept: application/json',
        'Authorization: Bearer ' . $secret,
    ];
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
    ]);
    if ($body !== null) {
        $headers[] = 'Content-Type: application/json';
        curl_setopt($curl, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($curl, CURLOPT_POSTFIELDS, $body);
    }
    $responseBody = curl_exec($curl);
    $status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $curlError = curl_error($curl);
    curl_close($curl);
    if ($responseBody === false || $curlError !== '') {
        respond(503, ['ok' => false, 'error' => 'upstream_unavailable', 'message' => 'Не удалось связаться с расписанием. Попробуйте ещё раз.']);
    }
    $decoded = json_decode($responseBody, true);
    if (!is_array($decoded)) {
        respond(503, ['ok' => false, 'error' => 'invalid_upstream_response', 'message' => 'Расписание вернуло некорректный ответ.']);
    }
    respond($status >= 100 ? $status : 503, $decoded);
}

$config = load_booking_config();
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

if ($method === 'GET' && ($_GET['action'] ?? '') === 'availability') {
    $from = (string)($_GET['from'] ?? '');
    $days = filter_var($_GET['days'] ?? 21, FILTER_VALIDATE_INT, [
        'options' => ['min_range' => 1, 'max_range' => 31],
    ]);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $from) || $days === false) {
        respond(400, ['ok' => false, 'error' => 'invalid_request', 'message' => 'Некорректный период расписания.']);
    }
    $query = http_build_query(['from' => $from, 'days' => $days]);
    proxy_request('GET', $config['endpoint'] . '/availability?' . $query, $config['secret']);
}

if ($method === 'POST') {
    $contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($contentLength > 16384) {
        respond(413, ['ok' => false, 'error' => 'payload_too_large', 'message' => 'Запрос слишком большой.']);
    }
    $rawBody = file_get_contents('php://input');
    $payload = json_decode($rawBody ?: '', true);
    if (!is_array($payload)) {
        respond(400, ['ok' => false, 'error' => 'invalid_payload', 'message' => 'Некорректные данные записи.']);
    }
    if (!empty($payload['company'])) {
        respond(201, ['ok' => true, 'booking_id' => 0]);
    }
    $allowed = ['request_id', 'schedule_item_id', 'name', 'phone', 'guests_count', 'consent', 'source_url'];
    $clean = array_intersect_key($payload, array_flip($allowed));
    proxy_request(
        'POST',
        $config['endpoint'] . '/bookings',
        $config['secret'],
        json_encode($clean, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
    );
}

respond(405, ['ok' => false, 'error' => 'method_not_allowed', 'message' => 'Метод не поддерживается.']);

