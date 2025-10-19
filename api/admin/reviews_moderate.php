<?php
require_once __DIR__.'/../config.php';
require_once __DIR__.'/../session.php';
require_role(['admin']);

$in = json_decode(file_get_contents('php://input'), true) ?? [];
$id = (int)($in['id'] ?? 0);
$status = $in['status'] ?? 'approved';

$pdo->beginTransaction();
try {
  $r = $pdo->prepare("SELECT installer_id FROM reviews WHERE id=? FOR UPDATE");
  $r->execute([$id]); $rev = $r->fetch();
  if(!$rev){ throw new Exception('not_found'); }

  $pdo->prepare("UPDATE reviews SET status=? WHERE id=?")->execute([$status,$id]);

  $sumq = $pdo->prepare("SELECT COUNT(*) c, COALESCE(AVG(rating),0) avg FROM reviews WHERE installer_id=? AND status='approved'");
  $sumq->execute([(int)$rev['installer_id']]);
  $row = $sumq->fetch();
  $cnt=(int)$row['c']; $avg=(float)$row['avg'];

  $pdo->prepare("UPDATE installers SET rating_avg=?, rating_count=? WHERE id=?")->execute([$avg,$cnt,(int)$rev['installer_id']]);

  $pdo->commit();
  echo json_encode(['ok'=>true,'rating_avg'=>$avg,'rating_count'=>$cnt]);
}catch(Throwable $e){
  $pdo->rollBack();
  http_response_code(500); echo json_encode(['error'=>'server_error']);
}
