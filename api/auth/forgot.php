<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__.'/../config.php';
require_once __DIR__.'/../util/mail.php';

$raw = file_get_contents('php://input');
$in = json_decode($raw, true) ?: [];
$email = strtolower(trim($in['email'] ?? ''));
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { http_response_code(422); echo json_encode(['error'=>'invalid_email']); exit; }

$stmt = $pdo->prepare('SELECT id,name FROM users WHERE email=? LIMIT 1');
$stmt->execute([$email]);
$u = $stmt->fetch(PDO::FETCH_ASSOC);
if(!$u){ http_response_code(404); echo json_encode(['error'=>'not_found']); exit; }

$pwd = substr(bin2hex(random_bytes(8)),0,8);
$hash = password_hash($pwd, PASSWORD_DEFAULT);
$pdo->prepare('UPDATE users SET password_hash=? WHERE id=?')->execute([$hash, (int)$u['id']]);

$body = '<p>Olá '.htmlspecialchars($u['name']).',</p><p>Sua nova senha temporária é: <strong>'.htmlspecialchars($pwd).'</strong></p><p>Faça login e altere a senha.</p>';
@send_html_mail($email, 'Nova senha - Webartec', $body);
echo json_encode(['ok'=>true]);
