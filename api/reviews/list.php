<?php
require_once __DIR__.'/../config.php';

$installer_id = (int)($_GET['installer_id'] ?? 0);
$stmt = $pdo->prepare("SELECT r.id, r.rating, r.comment, r.created_at, u.name 
                       FROM reviews r JOIN users u ON u.id=r.user_id
                       WHERE r.installer_id=? AND r.status='approved'
                       ORDER BY r.id DESC LIMIT 50");
$stmt->execute([$installer_id]);
echo json_encode(['items'=>$stmt->fetchAll()]);
