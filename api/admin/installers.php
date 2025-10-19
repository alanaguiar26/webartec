<?php
// api/admin/installers.php
// List installers with basic info, filterable by q (name/city/email). Admin only.
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../session.php';

if (!isset($_SESSION['user']) || ($_SESSION['user']['role'] ?? '') !== 'admin') {
  http_response_code(403);
  echo json_encode(['error'=>'forbidden']); exit;
}

$q = trim((string)($_GET['q'] ?? ''));
$args = [];
$where = "1=1";

if ($q !== '') {
  $where .= " AND (i.company_name LIKE ? OR i.city LIKE ? OR u.email LIKE ?)";
  $like = "%$q%";
  $args = [$like, $like, $like];
}

$sql = "SELECT i.id, i.company_name, i.city, i.whatsapp, i.plan, i.approved, i.rating_avg, i.rating_count,
               u.name, u.email
        FROM installers i
        JOIN users u ON u.id = i.user_id
        WHERE $where
        ORDER BY i.created_at DESC
        LIMIT 500";

try {
  $stmt = $pdo->prepare($sql);
  $stmt->execute($args);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  // normalize types
  foreach ($rows as &$r) {
    $r['approved'] = (int)$r['approved'];
    $r['rating_avg'] = isset($r['rating_avg']) ? (float)$r['rating_avg'] : 0.0;
    $r['rating_count'] = (int)($r['rating_count'] ?? 0);
  }

  echo json_encode($rows);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error'=>'db_error','message'=>$e->getMessage()]);
}
