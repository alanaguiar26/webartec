<?php
require_once __DIR__.'/../config.php';
require_once __DIR__.'/../session.php';
require_role(['installer']);

$in = json_decode(file_get_contents('php://input'), true) ?? [];
$plan = $in['plan'] ?? 'destaque';
$badge = ($plan==='exclusivo'?'Exclusivo':($plan==='destaque'?'Destaque':null));

$me = current_user();
$stmt = $pdo->prepare("UPDATE installers SET plan=?, badge=?, approved=1 WHERE user_id=?");
$stmt->execute([$plan,$badge,(int)$me['id']]);
echo json_encode(['ok'=>true]);
