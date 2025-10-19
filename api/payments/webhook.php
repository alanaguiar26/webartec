<?php
// api/payments/webhook.php
// Recebe notificações do Mercado Pago e ativa plano do instalador.
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config.php'; // deve definir $pdo e $MP_ACCESS_TOKEN

// Duração do plano em dias
const PLAN_DURATION_DAYS = 30;

// Apenas POST do MP
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'POST') { echo json_encode(['ok'=>true]); exit; }

$raw = file_get_contents('php://input');
$event = json_decode($raw, true);
if (!$event) { http_response_code(400); echo json_encode(['error'=>'invalid_json']); exit; }

/*
Formato comum do MP (topic=payment):
{
  "id": "1234567890",
  "action": "payment.created",
  "api_version": "v1",
  "data": { "id": "PAYMENT_ID" },
  "type": "payment"
}
*/

$type = $event['type'] ?? ($event['action'] ?? '');
$payment_id = $event['data']['id'] ?? null;
if (!$payment_id) { echo json_encode(['ok'=>true,'note'=>'no payment id']); exit; }

// Buscar o pagamento para checar status e metadata
if (!isset($MP_ACCESS_TOKEN) || !$MP_ACCESS_TOKEN) { http_response_code(500); echo json_encode(['error'=>'missing_access_token']); exit; }

$ch = curl_init('https://api.mercadopago.com/v1/payments/' . urlencode((string)$payment_id));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  'Content-Type: application/json',
  'Authorization: Bearer ' . $MP_ACCESS_TOKEN
]);
$resp = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
if ($resp === false) {
  http_response_code(500);
  echo json_encode(['error'=>'mp_error','message'=>curl_error($ch)]); exit;
}
curl_close($ch);

$pay = json_decode($resp, true);
if ($http >= 400 || !$pay) {
  http_response_code(500);
  echo json_encode(['error'=>'mp_error','http'=>$http,'body'=>$resp]); exit;
}

$status = $pay['status'] ?? '';
$metadata = $pay['metadata'] ?? [];
$plan = $metadata['plan'] ?? 'destaque';
$installer_id = (int)($metadata['installer_id'] ?? 0);

if ($status !== 'approved' || $installer_id <= 0) {
  echo json_encode(['ok'=>true,'note'=>'not approved or missing installer']); exit;
}

try {
  // Ativa plano e define validade
  $stmt = $pdo->prepare("UPDATE installers SET plan = ?, plan_activated_at = NOW(), plan_until = DATE_ADD(NOW(), INTERVAL ? DAY) WHERE id = ?");
  $stmt->execute([$plan, PLAN_DURATION_DAYS, $installer_id]);
  echo json_encode(['ok'=>true, 'installer_id'=>$installer_id, 'plan'=>$plan]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error'=>'db_error','message'=>$e->getMessage()]);
}
