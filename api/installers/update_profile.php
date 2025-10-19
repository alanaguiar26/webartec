<?php
// api/installers/update_profile.php
declare(strict_types=1);
session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config.php';

if (!isset($_SESSION['user'])) { http_response_code(401); echo json_encode(['error'=>'unauthorized']); exit; }
$user = $_SESSION['user'];
if (($user['role'] ?? '') !== 'installer') { http_response_code(403); echo json_encode(['error'=>'forbidden']); exit; }

$raw = file_get_contents('php://input');
$in  = json_decode($raw, true) ?: [];

$company_name = trim((string)($in['company_name'] ?? ''));
$city         = trim((string)($in['city'] ?? ''));
$whatsapp     = trim((string)($in['whatsapp'] ?? ''));
$price        = $in['price'] !== null && $in['price'] !== '' ? (int)$in['price'] : null;
$services     = $in['services'] ?? [];

if (!is_array($services)) $services = [];
$services_json = json_encode(array_values($services), JSON_UNESCAPED_UNICODE);

try{
  // pega installer id do usuário logado
  $stmt = $pdo->prepare("SELECT id FROM installers WHERE user_id = ? LIMIT 1");
  $stmt->execute([$user['id']]);
  $inst = $stmt->fetch(PDO::FETCH_ASSOC);
  if(!$inst){ http_response_code(404); echo json_encode(['error'=>'installer_not_found']); exit; }

  $stmt2 = $pdo->prepare("
    UPDATE installers
       SET company_name = ?, city = ?, whatsapp = ?, price = ?, services = ?, updated_at = NOW()
     WHERE id = ?");
  $stmt2->execute([$company_name, $city, $whatsapp, $price, $services_json, (int)$inst['id']]);

  echo json_encode(['ok'=>true]);
}catch(Throwable $e){
  http_response_code(500);
  echo json_encode(['error'=>'db_error','message'=>$e->getMessage()]);
}
