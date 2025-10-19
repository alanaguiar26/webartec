<?php
// api/installers/me_plan.php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../session.php';

if (!isset($_SESSION['user'])) { http_response_code(401); echo json_encode(['error'=>'unauthorized']); exit; }
$user = $_SESSION['user'];

$stmt = $pdo->prepare("SELECT i.plan, DATE_FORMAT(i.plan_until, '%d/%m/%Y') AS plan_until, i.approved FROM installers i WHERE i.user_id = ? LIMIT 1");
$stmt->execute([$user['id']]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) { echo json_encode(['plan'=>null]); exit; }

$status = ($row['approved'] == 1) ? 'approved' : 'pending_approval';
echo json_encode(['plan'=>$row['plan'], 'plan_until'=>$row['plan_until'], 'status'=>$status]);
