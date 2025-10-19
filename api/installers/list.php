<?php
require_once __DIR__.'/../config.php';

$q     = trim($_GET['q'] ?? '');
$svc   = trim($_GET['svc'] ?? '');
$order = $_GET['order'] ?? 'relevancia';
$page  = max(1, (int)($_GET['page'] ?? 1));
$per   = max(1, min(24, (int)($_GET['per'] ?? 9))); // 9 pra combinar com 3x3

$where = "i.approved = 1";
$args  = [];

/** filtro por cidade/nome */
if ($q !== '') {
  $where .= " AND (i.city LIKE ? OR i.company_name LIKE ?)";
  $args[] = "%$q%";
  $args[] = "%$q%";
}

/** filtro por serviço (coluna TEXT que guarda JSON) — procura por "svc" cercado por aspas */
if ($svc !== '') {
  // garante apenas [a-z0-9_ -] pra evitar quebrar o LIKE
  $svc = preg_replace('/[^a-z0-9_\-]/i', '', $svc);
  $where .= " AND i.services LIKE ?";
  $args[] = '%"'.$svc.'"%';
}

/** ordenação */
$orderBy = "CASE i.plan WHEN 'exclusivo' THEN 0 WHEN 'destaque' THEN 1 ELSE 2 END,
           i.rating_avg DESC, COALESCE(i.price, 999999) ASC";
if ($order === 'rating') { $orderBy = "i.rating_avg DESC"; }
if ($order === 'preco')  { $orderBy = "COALESCE(i.price, 999999) ASC"; }

/** paginação */
$offset = ($page - 1) * $per;

$total = $pdo->prepare("SELECT COUNT(*) FROM installers i WHERE $where");
$total->execute($args);
$count = (int)$total->fetchColumn();

$sql = "SELECT i.id, i.company_name AS name, i.city, i.whatsapp, i.price, i.services,
               i.plan, i.badge, i.rating_avg, i.rating_count
        FROM installers i
        WHERE $where
        ORDER BY $orderBy
        LIMIT $per OFFSET $offset";

$stmt = $pdo->prepare($sql);
$stmt->execute($args);
$list = $stmt->fetchAll();

foreach($list as &$row){
  $srv = json_decode($row['services'] ?? '[]', true);
  $row['services'] = is_array($srv) ? $srv : [];
  $row['rating']   = (float)($row['rating_avg'] ?? 0);
}

echo json_encode([
  'items' => $list,
  'page'  => $page,
  'per'   => $per,
  'total' => $count,
  'pages' => max(1, (int)ceil($count / $per)),
]);
