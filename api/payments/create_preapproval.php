<?php
// api/payments/create_preapproval.php (skeleton)
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../session.php';

if (!isset($_SESSION['user'])) { http_response_code(401); echo json_encode(['error'=>'unauthorized']); exit; }
$user = $_SESSION['user'];
if (($user['role'] ?? '') !== 'installer') { http_response_code(403); echo json_encode(['error'=>'forbidden']); exit; }

$plan = $_GET['plan'] ?? 'destaque';
if ($plan !== 'destaque') { http_response_code(400); echo json_encode(['error'=>'invalid_plan']); exit; }
$amount = 79.00;

if (empty($MP_ACCESS_TOKEN)) { http_response_code(500); echo json_encode(['error'=>'missing_access_token']); exit; }

$back_url = (isset($_SERVER['HTTP_ORIGIN'])?$_SERVER['HTTP_ORIGIN']:'') . '/dashboard.html';

$body = [
  "reason" => "Assinatura Plano Destaque — Webartec",
  "external_reference" => "sub_" . uniqid(),
  "auto_recurring" => [
    "frequency" => 1,
    "frequency_type" => "months",
    "transaction_amount" => (float)$amount,
    "currency_id" => "BRL"
  ],
  "payer_email" => $user['email'],
  "back_url" => $back_url,
  "status" => "pending"
];

$idem = bin2hex(random_bytes(16));

$ch = curl_init('https://api.mercadopago.com/preapproval');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  'Content-Type: application/json',
  'Authorization: Bearer ' . $MP_ACCESS_TOKEN,
  'X-Idempotency-Key: ' . $idem
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
$resp = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$err = curl_error($ch);
curl_close($ch);

if ($resp === false) { http_response_code(500); echo json_encode(['error'=>'mp_error','message'=>$err]); exit; }
$data = json_decode($resp, true);
if ($http >= 400 || !$data) { http_response_code(500); echo json_encode(['error'=>'mp_http_error','http'=>$http,'body'=>$resp]); exit; }

if (!empty($data['init_point'])) {
  header('Location: ' . $data['init_point'], true, 302);
  exit;
}
echo json_encode($data);
