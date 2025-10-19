<?php
// api/auth/login.php
declare(strict_types=1);
session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config.php'; // must define $pdo

function wants_json(): bool {
  $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
  $xhr = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
  return (stripos($accept, 'application/json') !== false) || (strtolower($xhr) === 'xmlhttprequest');
}

$ct = $_SERVER['CONTENT_TYPE'] ?? '';
$body = file_get_contents('php://input');
$email = '';
$password = '';

if (stripos($ct, 'application/json') !== false && $body) {
  $j = json_decode($body, true);
  $email = trim((string)($j['email'] ?? ''));
  $password = (string)($j['password'] ?? '');
} else {
  $email = trim((string)($_POST['email'] ?? ''));
  $password = (string)($_POST['password'] ?? '');
}

if ($email === '' || $password === '') {
  http_response_code(400);
  echo json_encode(['error' => 'missing_fields']);
  exit;
}

$stmt = $pdo->prepare("SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || !password_verify($password, $user['password_hash'])) {
  // Fallback: legado md5 (se ainda houver contas antigas)
  $legacy_ok = $user && (md5($password) === $user['password_hash']);
  if (!$legacy_ok) {
    http_response_code(401);
    echo json_encode(['error' => 'invalid_credentials']);
    exit;
  }
}

$_SESSION['user'] = [
  'id'    => (int)$user['id'],
  'email' => $user['email'],
  'name'  => $user['name'],
  'role'  => $user['role'],
];

if (wants_json()) {
  echo json_encode(['ok' => true, 'role' => $user['role']]);
} else {
  if ($user['role'] === 'admin') {
    header('Location: /admin.html', true, 302);
  } elseif ($user['role'] === 'installer') {
    header('Location: /dashboard.html', true, 302);
  } else {
    header('Location: /index.html', true, 302);
  }
}
