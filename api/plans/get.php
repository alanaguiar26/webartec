<?php
// api/plans/get.php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

// Fonte única (pode ler de .env/DB depois). Suporta centavos.
echo json_encode([
  'gratis'    => 0.00,
  'destaque'  => 79.99, // edite aqui quando precisar
  'exclusivo' => null   // comercial/sob consulta
], JSON_UNESCAPED_UNICODE);
