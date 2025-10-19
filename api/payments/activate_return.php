<?php
// api/payments/activate_return.php
declare(strict_types=1);

// Após pagamento aprovado, o Mercado Pago redireciona para cá com parâmetros.
// Conferimos o pagamento pela API e ativamos o plano por 30 dias.

require_once __DIR__ . '/../config.php';

function redirect($url){
  header('Location: ' . $url, true, 302);
  exit;
}

$origin = (isset($_SERVER['HTTP_ORIGIN']) && $_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : (
  (isset($_SERVER['REQUEST_SCHEME']) ? $_SERVER['REQUEST_SCHEME'] : 'https') . '://' .
  ($_SERVER['HTTP_HOST'] ?? '')
);
$dashboard = $origin . '/dashboard.html';

// MP pode mandar vários nomes dependendo do país/método
$payment_id = $_GET['payment_id'] ?? $_GET['collection_id'] ?? null;
$status     = $_GET['status'] ?? $_GET['collection_status'] ?? null;
$pref_id    = $_GET['preference_id'] ?? null;

// Se não veio id, volta ao painel
if(!$payment_id){ redirect($dashboard . '?paid=0'); }

if (empty($MP_ACCESS_TOKEN)) { redirect($dashboard . '?paid=0'); }

// 1) Valida pagamento via API
$ch = curl_init('https://api.mercadopago.com/v1/payments/' . urlencode((string)$payment_id));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $MP_ACCESS_TOKEN]);
$resp = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
curl_close($ch);

if($resp === false || $http >= 400){ redirect($dashboard . '?paid=0'); }
$j = json_decode($resp, true);
if(!$j){ redirect($dashboard . '?paid=0'); }

if(($j['status'] ?? '') !== 'approved'){ redirect($dashboard . '?paid=0'); }

// 2) Extrai external_reference para saber plano/instalador
$ext = $j['external_reference'] ?? '';
$plan = 'destaque';
$iid  = 0;

if($ext){
  $tmp = json_decode($ext, true);
  if(is_array($tmp)){
    $plan = $tmp['plan'] ?? 'destaque';
    $iid  = (int)($tmp['iid'] ?? 0);
  }
}

// 3) Atualiza plano (30 dias)
try{
  if($iid > 0 && in_array($plan, ['destaque'], true)){
    $stmt = $pdo->prepare("UPDATE installers SET plan=?, plan_activated_at=NOW(), plan_until=DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE id=?");
    $stmt->execute([$plan, $iid]);
  }
}catch(Throwable $e){ /* se falhar, apenas segue */ }

// 4) Redireciona para o painel com flag de sucesso
redirect($dashboard . '?paid=1');
