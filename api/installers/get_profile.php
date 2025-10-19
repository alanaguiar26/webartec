<?php
// api/installers/get_profile.php
declare(strict_types=1);
session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config.php';

if (!isset($_SESSION['user'])) { http_response_code(401); echo json_encode(['error'=>'unauthorized']); exit; }
$user = $_SESSION['user'];
if (($user['role'] ?? '') !== 'installer') { http_response_code(403); echo json_encode(['error'=>'forbidden']); exit; }

$stmt = $pdo->prepare("
  SELECT id, company_name, city, whatsapp, price, services, plan, approved,
         DATE_FORMAT(plan_until,'%d/%m/%Y') AS plan_until
    FROM installers
   WHERE user_id = ?
   LIMIT 1");
$stmt->execute([$user['id']]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) { echo json_encode(['error'=>'not_found']); exit; }

$services = [];
if (!empty($row['services'])) {
  $tmp = json_decode($row['services'], true);
  if (is_array($tmp)) $services = $tmp;
}

echo json_encode([
  'id'           => (int)$row['id'],
  'company_name' => $row['company_name'],
  'city'         => $row['city'],
  'whatsapp'     => $row['whatsapp'],
  'price'        => isset($row['price']) ? (int)$row['price'] : null,
  'services'     => $services,
  'plan'         => $row['plan'],
  'approved'     => (int)$row['approved'],
  'plan_until'   => $row['plan_until']
]);
