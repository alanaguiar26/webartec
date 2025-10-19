<?php
require_once __DIR__.'/../config.php';
require_once __DIR__.'/../session.php';
require_role(['admin']);

$in = json_decode(file_get_contents('php://input'), true) ?? [];
$id = (int)($in['id'] ?? 0);
$plan = $in['plan'] ?? 'gratis';
$badge = ($plan==='exclusivo'?'Exclusivo':($plan==='destaque'?'Destaque':null));

$stmt = $pdo->prepare("UPDATE installers SET plan=?, badge=? WHERE id=?");
$stmt->execute([$plan,$badge,$id]);
echo json_encode(['ok'=>true]);
