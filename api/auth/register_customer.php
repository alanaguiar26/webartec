<?php
require_once __DIR__.'/../config.php';
require_once __DIR__.'/../session.php';

$in = json_decode(file_get_contents('php://input'), true) ?? [];
$name = trim($in['name'] ?? '');
$email = strtolower(trim($in['email'] ?? ''));
$password = (string)($in['password'] ?? '');

if (!$name || !filter_var($email,FILTER_VALIDATE_EMAIL) || strlen($password)<6) {
  http_response_code(422); echo json_encode(['error'=>'invalid_input']); exit;
}
try{
  $stmt = $pdo->prepare("INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?, 'customer')");
  $stmt->execute([$name,$email,password_hash($password, PASSWORD_DEFAULT)]);
  $uid = (int)$stmt->rowCount() ? (int)$pdo->lastInsertId() : 0;
  $_SESSION['user'] = ['id'=>$uid,'name'=>$name,'email'=>$email,'role'=>'customer'];
  echo json_encode(['ok'=>true]);
}catch(Throwable $e){
  if (str_contains($e->getMessage(),'Duplicate entry')) { http_response_code(409); echo json_encode(['error'=>'email_in_use']); exit; }
  http_response_code(500); echo json_encode(['error'=>'server_error']); exit;
}
