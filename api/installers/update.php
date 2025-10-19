<?php
require_once __DIR__.'/../config.php';
require_once __DIR__.'/../session.php';
require_login();
$me = current_user();

$in = json_decode(file_get_contents('php://input'), true) ?? [];
$id = (int)($in['id'] ?? 0);

$stmt = $pdo->prepare("SELECT user_id FROM installers WHERE id=?");
$stmt->execute([$id]);
$row = $stmt->fetch();
if(!$row){ http_response_code(404); echo json_encode(['error'=>'not_found']); exit; }

$isOwner = ((int)$row['user_id'] === (int)$me['id']);
$isAdmin = ($me['role'] === 'admin');
if(!$isOwner && !$isAdmin){ http_response_code(403); echo json_encode(['error'=>'forbidden']); exit; }

$fields = [];
$args = [];

if (isset($in['company_name'])) { $fields[]="company_name=?"; $args[] = trim($in['company_name']); }
if (isset($in['city']))         { $fields[]="city=?"; $args[] = trim($in['city']); }
if (isset($in['whatsapp']))     { $fields[]="whatsapp=?"; $args[] = preg_replace('/\D+/', '', (string)$in['whatsapp']); }
if (array_key_exists('price',$in)) { $fields[]="price=?"; $args[] = ($in['price']!==null)?(int)$in['price']:null; }
if (isset($in['services']))     { $fields[]="services=?"; $args[] = json_encode(array_values($in['services']), JSON_UNESCAPED_UNICODE); }

if ($isAdmin && isset($in['plan']))  { $fields[]="plan=?";  $args[] = $in['plan']; }
if ($isAdmin && isset($in['badge'])) { $fields[]="badge=?"; $args[] = $in['badge']; }
if ($isAdmin && isset($in['approved'])) { $fields[]="approved=?"; $args[] = (int)!!$in['approved']; }

if (!$fields) { echo json_encode(['ok'=>true]); exit; }

$args[] = $id;
$sql = "UPDATE installers SET ".implode(",",$fields)." WHERE id=?";
$stmt = $pdo->prepare($sql); $stmt->execute($args);
echo json_encode(['ok'=>true]);
