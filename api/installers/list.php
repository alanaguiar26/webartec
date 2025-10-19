<?php
// api/installers/list.php
require_once __DIR__.'/../config.php';

$q        = trim($_GET['q'] ?? '');
$svc      = trim($_GET['svc'] ?? '');
$order    = $_GET['order'] ?? 'relevancia';
$page     = max(1, (int)($_GET['page'] ?? 1));
$per      = max(1, min(24, (int)($_GET['per'] ?? 6)));
$paidOnly = (int)($_GET['paid_only'] ?? 0) === 1;

$where = "i.approved = 1";
$args  = [];

/**
 * BUSCA POR CIDADE / NOME
 */
if ($q !== '') {
  $where .= " AND (i.city LIKE ? OR i.company_name LIKE ?)";
  $like = "%$q%";
  $args[] = $like;
  $args[] = $like;
}

/**
 * FILTRO POR SERVIÇO
 * Os serviços são armazenados como JSON (ex.: ["instalacao","limpeza"...]).
 * Para bater exatamente o item dentro do JSON-texto, usamos LIKE %\"valor\"%
 */
if ($svc !== '') {
  // sanitiza para LIKE
  $safe = str_replace(
    ['"',   '%',  '_',  '\\'],
    ['\"', '\%', '\_', '\\\\'],
    $svc
  );
  $where .= " AND i.services LIKE ?";
  $args[] = '%"'.$safe.'"%';
}

/**
 * APENAS PLANOS PAGOS?
 */
if ($paidOnly) {
  $where .= " AND i.plan IN ('destaque','exclusivo')";
}

/**
 * ORDENACAO
 */
switch ($order) {
  case 'rating':
    $orderBy = "i.rating_avg DESC, COALESCE(i.price, 999999)";
    break;
  case 'preco':
    $orderBy = "COALESCE(i.price, 999999) ASC, i.rating_avg DESC";
    break;
  default:
    $orderBy =
      "CASE i.plan WHEN 'exclusivo' THEN 0 WHEN 'destaque' THEN 1 ELSE 2 END,
       i.rating_avg DESC,
       COALESCE(i.price, 999999)";
}

/**
 * PAGINACAO
 */
$offset = ($page - 1) * $per;

/**
 * TOTAL
 */
$total = $pdo->prepare("SELECT COUNT(*) AS c FROM installers i WHERE $where");
$total->execute($args);
$count = (int)$total->fetchColumn();

/**
 * LISTA
 */
$sql = "SELECT
          i.id,
          i.company_name AS name,
          i.city,
          i.whatsapp,
          i.price,
          i.services,
          i.plan,
          i.badge,
          i.rating_avg,
          i.rating_count
        FROM installers i
        WHERE $where
        ORDER BY $orderBy
        LIMIT $per OFFSET $offset";

$stmt = $pdo->prepare($sql);
$stmt->execute($args);
$list = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

foreach ($list as &$row) {
  // normaliza services
  $sv = json_decode($row['services'] ?? '[]', true);
  $row['services'] = is_array($sv) ? $sv : [];
  // rating numérico simples para o front
  $row['rating'] = isset($row['rating_avg']) ? (float)$row['rating_avg'] : 0.0;
}

echo json_encode([
  'items' => $list,
  'page'  => $page,
  'per'   => $per,
  'total' => $count,
  'pages' => max(1, (int)ceil($count / $per))
]);
