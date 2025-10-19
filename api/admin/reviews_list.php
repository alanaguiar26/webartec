<?php
require_once __DIR__.'/../config.php';
require_once __DIR__.'/../session.php';
require_role(['admin']);

$sql = "SELECT r.id, r.rating, r.comment, i.company_name AS installer_name, u.name AS customer_name
        FROM reviews r
        JOIN installers i ON i.id=r.installer_id
        JOIN users u ON u.id=r.user_id
        WHERE r.status='pending'
        ORDER BY r.id DESC LIMIT 200";
$stmt = $pdo->query($sql);
echo json_encode(['items'=>$stmt->fetchAll()]);
