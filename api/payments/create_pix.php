<?php
// api/payments/create_pix.php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../session.php';

// ===== Configuração de reutilização de idempotência =====
const IDEMPOTENCY_TTL = 60; // segundos

if (!isset($_SESSION['user'])) { http_response_code(401); echo json_encode(['error'=>'unauthorized']); exit; }
$user = $_SESSION['user'];
if (($user['role'] ?? '') !== 'installer') { http_response_code(403); echo json_encode(['error'=>'forbidden']); exit; }

$plan = $_GET['plan'] ?? 'destaque';
if (!in_array($plan, ['destaque','gratis'], true)) { http_response_code(400); echo json_encode(['error'=>'invalid_plan']); exit; }
if ($plan === 'gratis') { echo json_encode(['ok'=>true,'note'=>'plano gratis']); exit; }
$amount = 79.00;

// Credenciais e extensões
if (empty($MP_ACCESS_TOKEN)) { http_response_code(500); echo json_encode(['error'=>'missing_access_token']); exit; }
if (!function_exists('curl_init')) { http_response_code(500); echo json_encode(['error'=>'curl_missing']); exit; }
if (!defined('OPENSSL_VERSION_TEXT')) { http_response_code(500); echo json_encode(['error'=>'openssl_missing']); exit; }

// Descobrir installer
$stmt = $pdo->prepare("SELECT id, company_name FROM installers WHERE user_id = ? LIMIT 1");
$stmt->execute([$user['id']]);
$inst = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$inst) { http_response_code(400); echo json_encode(['error'=>'installer_not_found']); exit; }

// Monta body
$body = [
  'transaction_amount' => $amount,
  'description' => 'Plano ' . ucfirst($plan) . ' — Webartec',
  'payment_method_id' => 'pix',
  'payer' => ['email' => $user['email']],
  'metadata' => [
    'user_id' => $user['id'],
    'installer_id' => (int)$inst['id'],
    'plan' => $plan
  ]
];

// ===== Lógica de reutilização da idempotência por sessão =====
$reuse = false;
$now = time();
if (!empty($_SESSION['pix_idem_key']) && is_array($_SESSION['pix_idem_key'])) {
  $s = $_SESSION['pix_idem_key'];
  if (!empty($s['key']) && !empty($s['ts']) && !empty($s['plan']) && isset($s['amount'])) {
    if (($now - (int)$s['ts']) <= IDEMPOTENCY_TTL && $s['plan'] === $plan && (float)$s['amount'] === (float)$amount) {
      $idemKey = (string)$s['key'];
      $reuse = true;
    }
  }
}
if (!$reuse) {
  try {
    $idemKey = bin2hex(random_bytes(16));
  } catch (Throwable $e) {
    $idemKey = uniqid('pix_', true); // fallback
  }
  $_SESSION['pix_idem_key'] = [
    'key' => $idemKey,
    'ts' => $now,
    'plan' => $plan,
    'amount' => (float)$amount,
  ];
}

// Chama MP
$ch = curl_init('https://api.mercadopago.com/v1/payments');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  'Content-Type: application/json',
  'Authorization: Bearer ' . $MP_ACCESS_TOKEN,
  'X-Idempotency-Key: ' . $idemKey,
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
$resp = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$err = curl_error($ch);
curl_close($ch);

if ($resp === false) { http_response_code(500); echo json_encode(['error'=>'mp_curl_error','message'=>$err]); exit; }

$data = json_decode($resp, true);
if ($http >= 400 || !$data) {
  http_response_code(500); echo json_encode(['error'=>'mp_http_error','http'=>$http,'body'=>$resp]); exit;
}

$poi = $data['point_of_interaction']['transaction_data'] ?? null;
$qr_base64 = $poi['qr_code_base64'] ?? null;
$qr_code   = $poi['qr_code'] ?? null;
$payment_id = $data['id'] ?? null;

if (!$qr_base64 || !$qr_code || !$payment_id) {
  http_response_code(500); echo json_encode(['error'=>'mp_no_qr','data'=>$data]); exit;
}

echo json_encode([
  'ok' => true,
  'payment_id' => $payment_id,
  'qr_base64' => $qr_base64,
  'qr_code' => $qr_code,
  'reused' => $reuse,
  'idempotency_key' => $idemKey
]);
