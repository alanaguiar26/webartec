<?php
// api/auth/create_admin.php
// One-time helper to create an admin user. Delete this file after use.
// Usage: /api/auth/create_admin.php?email=admin@webartec.com&password=SenhaForte123
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config.php';

$email = trim((string)($_GET['email'] ?? ''));
$pass  = (string)($_GET['password'] ?? '');
$name  = (string)($_GET['name'] ?? 'Admin');

if ($email === '' || $pass === '') {
  http_response_code(400);
  echo json_encode(['error'=>'missing_email_or_password']);
  exit;
}

$stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
$stmt->execute([$email]);
$exists = $stmt->fetchColumn();

if ($exists) {
  echo json_encode(['ok'=>true,'message'=>'user_exists']);
  exit;
}

$hash = password_hash($pass, PASSWORD_DEFAULT);
$stmt = $pdo->prepare("INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?,?,?,?,NOW())");
$stmt->execute([$name, $email, $hash, 'admin']);
echo json_encode(['ok'=>true,'created'=>true]);
