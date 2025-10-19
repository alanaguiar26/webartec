<?php
declare(strict_types=1);

$DB_HOST = 'localhost';
$DB_NAME = 'webartec';
$DB_USER = 'admin_webartec';
$DB_PASS = '';

$options = [
  PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
  PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
];

try {
  $pdo = new PDO("mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4", $DB_USER, $DB_PASS, $options);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error' => 'DB connection failed']);
  exit;
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$MP_ACCESS_TOKEN = ''; // use env var se preferir
$MP_PUBLIC_KEY   = '';   // Client (TEST ou PROD)

$PLAN_DURATION_DAYS = 30;
$PLANS = [
  'gratis'    => 0.00,
  'destaque'  => 7.99,
  'exclusivo' => null, // sob consulta
];
