<?php
// api/payments/create_preference.php — Gera preferência do Checkout Pro (Mercado Pago)
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../session.php';

if (!isset($_SESSION['user'])) { http_response_code(401); echo json_encode(['error'=>'unauthorized']); exit; }
$user = $_SESSION['user'];
if (($user['role'] ?? '') !== 'installer') { http_response_code(403); echo json_encode(['error'=>'forbidden']); exit; }

$raw = file_get_contents('php://input');
$in  = json_decode($raw, true) ?: [];

$plan   = isset($in['plan']) ? strtolower((string)$in['plan']) : 'destaque';
$amount = isset($in['amount']) ? (float)$in['amount'] : 0.0;

if (!in_array($plan, ['gratis','destaque'], true)) {
  http_response_code(400); echo json_encode(['error'=>'invalid_plan']); exit;
}
if ($plan === 'gratis') {
  // Free não precisa de pagamento
  echo json_encode(['ok'=>true, 'init_point'=>null, 'note'=>'free_plan']); exit;
}
if ($amount <= 0) {
  http_response_code(400); echo json_encode(['error'=>'invalid_amount']); exit;
}

// Confere se instalador existe
$stmt = $pdo->prepare("SELECT id FROM installers WHERE user_id = ? LIMIT 1");
$stmt->execute([$user['id']]);
$inst = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$inst) { http_response_code(400); echo json_encode(['error'=>'installer_not_found']); exit; }

if (empty($MP_ACCESS_TOKEN)) {
  http_response_code(500); echo json_encode(['error'=>'missing_access_token']); exit;
}

// URLs de retorno
$origin = (isset($_SERVER['HTTP_ORIGIN']) && $_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : (
  (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://') .
  ($_SERVER['HTTP_HOST'] ?? 'localhost')
);

$backUrl = $origin . '/dashboard.html';

// Corpo da preferência
$pref = [
  'items' => [[
    'title'       => 'Plano ' . ucfirst($plan) . ' — Webartec',
    'description' => 'Assinatura/Plano de destaque por 30 dias',
    'quantity'    => 1,
    'currency_id' => 'BRL',
    'unit_price'  => round($amount, 2),
  ]],
  'payer' => [
    'email' => $user['email'] ?? ''
  ],
  'metadata' => [
    'user_id'       => (int)$user['id'],
    'installer_id'  => (int)$inst['id'],
    'plan'          => $plan
  ],
  'back_urls' => [
    'success' => $backUrl,
    'pending' => $backUrl,
    'failure' => $backUrl
  ],
  'auto_return' => 'approved'
];

// Idempotência
try { $idemKey = bin2hex(random_bytes(16)); } catch (Throwable $e) { $idemKey = uniqid('pref_', true); }

// Chamada à API
$ch = curl_init('https://api.mercadopago.com/checkout/preferences');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  'Content-Type: application/json',
  'Authorization: Bearer ' . $MP_ACCESS_TOKEN,
  'X-Idempotency-Key: ' . $idemKey
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($pref));
$resp = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$err  = curl_error($ch);
curl_close($ch);

if ($resp === false) { http_response_code(500); echo json_encode(['error'=>'mp_error','message'=>$err]); exit; }

$data = json_decode($resp, true);
if ($http >= 400 || !$data) {
  http_response_code(500);
  echo json_encode(['error'=>'mp_http_error','http'=>$http,'body'=>$resp]); exit;
}

// Preferência criada
$init = $data['init_point'] ?? ($data['sandbox_init_point'] ?? null);
if (!$init) { echo json_encode(['error'=>'init_point_missing', 'raw'=>$data]); exit; }

echo json_encode(['ok'=>true, 'init_point'=>$init]);
