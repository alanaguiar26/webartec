<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../session.php';

if (!isset($_SESSION['user'])) { http_response_code(401); echo json_encode(['error'=>'unauthorized']); exit; }
$user = $_SESSION['user'];
if (($user['role'] ?? '') !== 'installer') { http_response_code(403); echo json_encode(['error'=>'forbidden']); exit; }

$id = isset($_GET['id']) ? trim($_GET['id']) : '';
if ($id === '') { http_response_code(400); echo json_encode(['error'=>'missing_id']); exit; }

if (empty($MP_ACCESS_TOKEN)) { http_response_code(500); echo json_encode(['error'=>'missing_access_token']); exit; }
if (!function_exists('curl_init')) { http_response_code(500); echo json_encode(['error'=>'curl_missing']); exit; }

$ch = curl_init('https://api.mercadopago.com/v1/payments/' . urlencode($id));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  'Content-Type: application/json',
  'Authorization: Bearer ' . $MP_ACCESS_TOKEN
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 20);
$resp = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$curl_err = curl_error($ch);
curl_close($ch);

if ($resp === false) { http_response_code(500); echo json_encode(['error'=>'mp_curl_error','message'=>$curl_err]); exit; }

$data = json_decode($resp, true);
if ($http >= 400 || !$data) { http_response_code(500); echo json_encode(['error'=>'mp_http_error','http'=>$http,'body'=>$resp]); exit; }

$status = $data['status'] ?? 'unknown';
if ($status === 'approved') {
  $meta = $data['metadata'] ?? [];
  $installer_id = (int)($meta['installer_id'] ?? 0);
  $plan = $meta['plan'] ?? 'destaque';

  if ($installer_id > 0) {
    $stmt = $pdo->prepare("UPDATE installers SET plan = ?, plan_activated_at = NOW(), plan_until = DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE id = ?");
    $stmt->execute([$plan, $installer_id]);
  }
}

echo json_encode(['status'=>$status]);
