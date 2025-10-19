<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config.php';

$checks = [
  'MP_ACCESS_TOKEN_set' => !empty($MP_ACCESS_TOKEN),
  'MP_PUBLIC_KEY_set'   => !empty($MP_PUBLIC_KEY),
  'php_curl'            => function_exists('curl_init'),
  'php_openssl'         => defined('OPENSSL_VERSION_TEXT'),
  'allow_url_fopen'     => (bool)ini_get('allow_url_fopen'),
  'openssl_version'     => defined('OPENSSL_VERSION_TEXT') ? OPENSSL_VERSION_TEXT : null,
];
echo json_encode($checks);
