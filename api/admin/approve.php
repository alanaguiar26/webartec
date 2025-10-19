<?php declare(strict_types=1);

// api/admin/approve.php — Alterna/define aprovação de instalador (apenas admin)
session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config.php';

// Requer sessão de admin
if (!isset($_SESSION['user']) || ($_SESSION['user']['role'] ?? '') !== 'admin') {
  http_response_code(403);
  echo json_encode(['error' => 'forbidden']);
  exit;
}

// Lê JSON ou FORM
$ct = $_SERVER['CONTENT_TYPE'] ?? '';
$in = [];
if ($ct && stripos($ct, 'application/json') !== false) {
  $raw = file_get_contents('php://input');
  $in = json_decode($raw, true) ?: [];
} else {
  $in = $_POST ?: [];
}

$id = (int)($in['id'] ?? 0);
$approvedParam = $in['approved'] ?? null; // se null, vamos alternar

if ($id <= 0) {
  http_response_code(400);
  echo json_encode(['error' => 'invalid_id']);
  exit;
}

try {
  // Descobre novo valor: se não veio "approved", alterna
  if ($approvedParam === null || $approvedParam === '') {
    $st = $pdo->prepare('SELECT approved FROM installers WHERE id = ? LIMIT 1');
    $st->execute([$id]);
    $current = (int)$st->fetchColumn();
    $new = $current ? 0 : 1;
  } else {
    $new = ((int)$approvedParam === 1) ? 1 : 0;
  }

  $up = $pdo->prepare('UPDATE installers SET approved = ?, updated_at = NOW() WHERE id = ?');
  $up->execute([$new, $id]);

  echo json_encode(['ok' => true, 'id' => $id, 'approved' => $new]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error' => 'db_error', 'message' => $e->getMessage()]);
}
