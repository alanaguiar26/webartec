<?php
require_once __DIR__.'/../config.php';
require_once __DIR__.'/../session.php';
require_role(['customer']);

$in = json_decode(file_get_contents('php://input'), true) ?? [];
$installer_id = (int)($in['installer_id'] ?? 0);
$rating = (int)($in['rating'] ?? 0);
$comment = trim($in['comment'] ?? '');

if ($installer_id<=0 || $rating<1 || $rating>5) {
  http_response_code(422); echo json_encode(['error'=>'invalid_input']); exit;
}

$stmt = $pdo->prepare("INSERT INTO reviews (installer_id,user_id,rating,comment,status) VALUES (?,?,?,?, 'pending')");
$stmt->execute([$installer_id, current_user()['id'], $rating, $comment]);

echo json_encode(['ok'=>true, 'moderation'=>'pending']);
