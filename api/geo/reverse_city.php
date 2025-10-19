<?php
// api/geo/reverse_city.php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

$lat = isset($_GET['lat']) ? (float)$_GET['lat'] : 0.0;
$lon = isset($_GET['lon']) ? (float)$_GET['lon'] : 0.0;
if (!$lat || !$lon) { http_response_code(400); echo json_encode(['error'=>'missing_coords']); exit; }

// Nominatim exige User-Agent identificável; limite de uso: só chamar no clique do usuário.
$url = 'https://nominatim.openstreetmap.org/reverse?format=json&lat=' . urlencode((string)$lat) . '&lon=' . urlencode((string)$lon) . '&zoom=10&addressdetails=1';

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['User-Agent: Webartec/1.0 (reverse-city)']);
curl_setopt($ch, CURLOPT_TIMEOUT, 8);
$resp = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$err  = curl_error($ch);
curl_close($ch);

if ($resp === false || $http >= 400) {
  http_response_code(502);
  echo json_encode(['error'=>'geo_failed','message'=>$err ?: ('http '.$http)]);
  exit;
}

$j = json_decode($resp, true);
$addr = $j['address'] ?? [];
$city = $addr['city'] ?? ($addr['town'] ?? ($addr['village'] ?? ''));

// devolve só o nome da cidade (sem UF)
echo json_encode(['city' => (string)$city]);
