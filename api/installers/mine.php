<?php
require_once __DIR__.'/../config.php';
require_once __DIR__.'/../session.php';
require_role(['installer','admin']);
$me = current_user();

if($me['role']==='admin'){
  http_response_code(400);
  echo json_encode(['error'=>'admin_has_no_installer_profile']); exit;
}

$stmt = $pdo->prepare("SELECT * FROM installers WHERE user_id=? LIMIT 1");
$stmt->execute([(int)$me['id']]);
$x = $stmt->fetch();
if(!$x){ http_response_code(404); echo json_encode(['error'=>'not_found']); exit; }
$x['services'] = json_decode($x['services'], true);
echo json_encode($x);
