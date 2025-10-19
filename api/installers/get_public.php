<?php
// api/installers/get_public.php?id=123
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config.php';

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id<=0){ http_response_code(400); echo json_encode(['error'=>'invalid_id']); exit; }

$stmt = $pdo->prepare("
  SELECT i.id, i.company_name AS name, i.city, i.whatsapp, i.price, i.services,
         i.plan, i.badge, i.rating_avg AS rating, i.rating_count
    FROM installers i
   WHERE i.id = ? AND i.approved = 1
   LIMIT 1");
$stmt->execute([$id]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row){ http_response_code(404); echo json_encode(['error'=>'not_found']); exit; }

$row['services'] = $row['services'] ? json_decode($row['services'], true) : [];
$row['rating'] = (float)($row['rating'] ?? 0);
$row['rating_count'] = (int)($row['rating_count'] ?? 0);

echo json_encode($row);
