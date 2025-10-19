<?php
require_once __DIR__.'/../config.php';

$id = (int)($_GET['id'] ?? 0);
$stmt = $pdo->prepare("SELECT i.*, u.name AS owner_name, u.email AS owner_email
  FROM installers i JOIN users u ON u.id=i.user_id WHERE i.id=?");
$stmt->execute([$id]);
$x = $stmt->fetch(PDO::FETCH_ASSOC);

if(!$x){
  http_response_code(404);
  echo json_encode(['error'=>'not_found']);
  exit;
}

$x['services'] = $x['services'] ? json_decode($x['services'], true) : [];
if (!is_array($x['services'])) $x['services'] = [];

if (isset($x['price']) && $x['price'] !== null) {
  $x['price'] = (int)$x['price'];
}

echo json_encode($x, JSON_UNESCAPED_UNICODE);
