<?php
// create_admin.php — one-off script to create/change an admin user safely.
// Upload to /api/, access once in the browser, then DELETE this file.
require_once __DIR__.'/config.php';

$email = isset($_GET['email']) ? strtolower(trim($_GET['email'])) : 'admin@webartec.com';
$pass  = isset($_GET['pass'])  ? (string)$_GET['pass'] : 'Admin@123';
$name  = isset($_GET['name'])  ? trim($_GET['name']) : 'Admin';

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { http_response_code(400); echo 'email inválido'; exit; }
if (strlen($pass) < 6) { http_response_code(400); echo 'senha fraca (>=6)'; exit; }

$hash = password_hash($pass, PASSWORD_DEFAULT);

try {
  // if exists, update; else insert
  $sel = $pdo->prepare("SELECT id FROM users WHERE email=? LIMIT 1");
  $sel->execute([$email]);
  $row = $sel->fetch();
  if ($row) {
    $upd = $pdo->prepare("UPDATE users SET name=?, password_hash=?, role='admin' WHERE id=?");
    $upd->execute([$name, $hash, (int)$row['id']]);
    echo "Admin atualizado: $email";
  } else {
    $ins = $pdo->prepare("INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,'admin')");
    $ins->execute([$name, $email, $hash]);
    echo "Admin criado: $email";
  }
} catch (Throwable $e) {
  http_response_code(500);
  echo "Erro: ".$e->getMessage();
}
