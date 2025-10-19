<?php
declare(strict_types=1);
session_set_cookie_params([
  'lifetime' => 0,
  'path' => '/',
  'domain' => '',
  'secure' => isset($_SERVER['HTTPS']),
  'httponly' => true,
  'samesite' => 'Lax'
]);
session_start();

function require_login() {
  if (empty($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['error' => 'auth_required']);
    exit;
  }
}
function require_role(array $roles) {
  require_login();
  $u = $_SESSION['user'];
  if (!in_array($u['role'], $roles, true)) {
    http_response_code(403);
    echo json_encode(['error' => 'forbidden']);
    exit;
  }
}
function current_user() {
  return $_SESSION['user'] ?? null;
}
