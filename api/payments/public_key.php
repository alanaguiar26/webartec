<?php
// api/payments/public_key.php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config.php';
echo json_encode([ 'public_key' => $MP_PUBLIC_KEY ?? null ]);
