<?php
// api/payments/process_card.php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../session.php';

if (!isset($_SESSION['user'])) { http_response_code(401); echo json_encode(['error'=>'unauthorized']); exit; }
$user = $_SESSION['user'];
if (($user['role'] ?? '') !== 'installer') { http_response_code(403); echo json_encode(['error'=>'forbidden']); exit; }

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true) ?: [];

$amount = isset($payload['amount']) ? (float)$payload['amount'] : 0.0;
$plan = strtolower((string)($payload['plan'] ?? 'destaque'));
$token = (string)($payload['token'] ?? '');
$payment_method_id = (string)($payload['payment_method_id'] ?? '');
$issuer_id = $payload['issuer_id'] ?? null;
$installments = (int)($payload['installments'] ?? 1);
$payer_email = (string)($payload['payer']['email'] ?? $user['email']);

if (!in_array($plan, ['gratis','destaque'], true)) { http_response_code(400); echo json_encode(['error'=>'invalid_plan']); exit; }
if ($plan === 'gratis') { echo json_encode(['ok'=>true,'note'=>'plano gratis']); exit; }
if ($amount <= 0) { http_response_code(400); echo json_encode(['error'=>'invalid_amount']); exit; }
if (!$token || !$payment_method_id) { http_response_code(400); echo json_encode(['error'=>'missing_card_data']); exit; }

$stmt = $pdo->prepare("SELECT id FROM installers WHERE user_id = ? LIMIT 1");
$stmt->execute([$user['id']]);
$inst = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$inst) { http_response_code(400); echo json_encode(['error'=>'installer_not_found']); exit; }

if (empty($MP_ACCESS_TOKEN)) { http_response_code(500); echo json_encode(['error'=>'missing_access_token']); exit; }

// Idempotência (reutiliza por até 90s, útil se o usuário clicar novamente)
if (!isset($_SESSION['card_idem']) || !is_array($_SESSION['card_idem'])) {
  $_SESSION['card_idem'] = [];
}
$reuse = false;
$reuseKey = null;
$signature = hash('sha256', json_encode([
  'user_id'=>$user['id'],'installer_id'=>(int)$inst['id'],'plan'=>$plan,'amount'=>$amount
]));
$now = time();
foreach ($_SESSION['card_idem'] as $k => $row) {
  if (($now - ($row['ts'] ?? 0)) > 90) { unset($_SESSION['card_idem'][$k]); continue; }
  if (($row['sig'] ?? '') === $signature) { $reuse = true; $reuseKey = $k; break; }
}
if (!$reuse) {
  try { $idemKey = bin2hex(random_bytes(16)); } catch (\Throwable $e) { $idemKey = uniqid('card_', true); }
  $_SESSION['card_idem'][$idemKey] = ['ts'=>$now, 'sig'=>$signature];
} else {
  $idemKey = $reuseKey;
}

$body = [
  'transaction_amount' => (float)$amount,
  'token' => $token,
  'description' => 'Plano ' . ucfirst($plan) . ' — Webartec',
  'installments' => max(1, $installments),
  'payment_method_id' => $payment_method_id,
  'payer' => [ 'email' => $payer_email ],
  'metadata' => [
    'user_id' => $user['id'],
    'installer_id' => (int)$inst['id'],
    'plan' => $plan
  ]
];
if (!empty($issuer_id)) { $body['issuer_id'] = $issuer_id; }

$ch = curl_init('https://api.mercadopago.com/v1/payments');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  'Content-Type: application/json',
  'Authorization: Bearer ' . $MP_ACCESS_TOKEN,
  'X-Idempotency-Key: ' . $idemKey,
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE));
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
curl_setopt($ch, CURLOPT_TIMEOUT, 45);

$resp = curl_exec($ch);
$http = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$err = curl_error($ch);
curl_close($ch);

if ($resp === false) {
  http_response_code(500);
  echo json_encode(['error'=>'mp_error','message'=>$err ?: 'curl_exec false']); exit;
}

$data = json_decode($resp, true);
if ($http >= 400 || !$data) {
  http_response_code(500);
  echo json_encode(['error'=>'mp_http_error','http'=>$http,'body'=>$resp]); exit;
}

$status = $data['status'] ?? '';
if ($status === 'approved') {
  $stmt2 = $pdo->prepare("
    UPDATE installers
       SET plan = 'destaque',
           plan_activated_at = NOW(),
           plan_until = DATE_ADD(NOW(), INTERVAL 30 DAY)
     WHERE id = ?
  ");
  $stmt2->execute([(int)$inst['id']]);

  echo json_encode(['ok'=>true,'status'=>$status,'idempotency_key'=>$idemKey]);
} else {
  // Retorna detalhe do MP para exibir no front
  $detail = $data['status_detail'] ?? ($data['error'] ?? '');
  echo json_encode(['ok'=>false,'status'=>$status,'message'=>$detail,'idempotency_key'=>$idemKey]);
}
