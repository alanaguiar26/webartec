<?php
require_once __DIR__ . '/../util/mail.php';
// api/admin/approve.php
// Toggle approval status for installer (admin only).
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../session.php';

// Require admin session
if (!isset($_SESSION['user']) || ($_SESSION['user']['role'] ?? '') !== 'admin') {
  http_response_code(403);
  echo json_encode(['error'=>'forbidden']); exit;
}

// Parse JSON body
$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);
$id = isset($payload['id']) ? (int)$payload['id'] : 0;
$approved = isset($payload['approved']) ? (int)$payload['approved'] : -1;

if ($id <= 0 || ($approved !== 0 && $approved !== 1)) {
  http_response_code(400);
  echo json_encode(['error'=>'invalid_params']); exit;
}

try {
  $stmt = $pdo->prepare("UPDATE installers SET approved = ?, updated_at = NOW() WHERE id = ?");
  $stmt->execute([$approved, $id]);
  // notify user when approved
  if($approved===1){
    $q = $pdo->prepare("SELECT u.email,u.name FROM installers i JOIN users u ON u.id=i.user_id WHERE i.id=? LIMIT 1");
    $q->execute([$id]);
    $u = $q->fetch(PDO::FETCH_ASSOC);
    if($u){ @send_html_mail($u['email'], 'Sua conta foi aprovada', '<p>Olá '+htmlspecialchars($u['name'])+', sua conta foi aprovada! Já pode receber contatos.</p>'); }
  }

  echo json_encode(['ok'=>true, 'id'=>$id, 'approved'=>$approved]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error'=>'db_error','message'=>$e->getMessage()]);
}
