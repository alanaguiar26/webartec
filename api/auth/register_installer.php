<?php
// api/auth/register_installer.php
declare(strict_types=1);
session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config.php'; // $pdo, headers e CORS já vêm daqui

// Detecta se a resposta deve ser JSON
function wants_json(): bool {
  $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
  $xhr    = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
  return (stripos($accept, 'application/json') !== false) || (strtolower($xhr) === 'xmlhttprequest');
}

// Lê input (form ou JSON)
$ct  = $_SERVER['CONTENT_TYPE'] ?? '';
$raw = file_get_contents('php://input');
$in  = [];
if (stripos($ct, 'application/json') !== false && $raw) {
  $in = json_decode($raw, true) ?: [];
} else {
  $in = $_POST;
}

// Campos
$name         = trim((string)($in['name'] ?? ''));
$email        = strtolower(trim((string)($in['email'] ?? '')));
$password     = (string)($in['password'] ?? '');
$company_name = trim((string)($in['company_name'] ?? ''));
$city         = trim((string)($in['city'] ?? ''));
$uf           = strtoupper(trim((string)($in['uf'] ?? ''))); // opcional (se você enviar)
$whatsapp_raw = preg_replace('/\D+/', '', (string)($in['whatsapp'] ?? '')); // só dígitos
$services     = $in['services'] ?? [];
$planSel      = strtolower(trim((string)($in['plan'] ?? 'gratis')));

// normaliza serviços
if (is_string($services)) {
  $services = array_filter(array_map('trim', preg_split('/[,;]+/', $services)));
} elseif (!is_array($services)) {
  $services = [];
}
$services_json = json_encode(array_values($services), JSON_UNESCAPED_UNICODE);

// trata preço (campo correto: price INT na sua tabela)
// aceita "79,99" ou "79.99" ou "79"
$priceStr = trim((string)($in['price'] ?? $in['price_min'] ?? ''));
$price = null;
if ($priceStr !== '') {
  // Se você guarda em REAIS inteiros, remova decimais:
  // $price = (int)floor((float)str_replace([','], ['.'], $priceStr));
  // Se você guarda em CENTAVOS (recomendado), converta:
  $norm = (float)str_replace(',', '.', $priceStr);
  $price = (int)round($norm); // <<< ajuste aqui: em reais inteiros (ex.: 80). Se quiser em centavos, use round($norm*100).
}

// validações
if ($name === '' || $email === '' || $password === '') {
  http_response_code(422);
  echo json_encode(['error' => 'validation', 'fields' => ['name','email','password']]); exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(422);
  echo json_encode(['error' => 'invalid_email']); exit;
}
if ($password !== '' && strlen($password) < 6) {
  http_response_code(422);
  echo json_encode(['error' => 'weak_password']); exit;
}

// valida plano
$plan = in_array($planSel, ['gratis','destaque'], true) ? $planSel : 'gratis';

try {
  $pdo->beginTransaction();

  // email único
  $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
  $stmt->execute([$email]);
  if ($stmt->fetchColumn()) {
    $pdo->rollBack();
    http_response_code(409);
    echo json_encode(['error' => 'email_in_use']); exit;
  }

  // cria usuário
  $hash = password_hash($password, PASSWORD_DEFAULT);
  $stmt = $pdo->prepare("INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?,?,?,?,NOW())");
  $stmt->execute([$name, $email, $hash, 'installer']);
  $user_id = (int)$pdo->lastInsertId();

  // monta city completa se você quiser guardar "Cidade (UF)"
  if ($city !== '' && $uf !== '') {
    // armazena como "Cidade (UF)" para manter padrão visual:
    $city = sprintf('%s (%s)', $city, $uf);
  }

  // cria perfil do instalador (approved=0 SEMPRE)
  $stmt = $pdo->prepare("
    INSERT INTO installers
      (user_id, company_name, city, whatsapp, price, services, plan, approved, plan_until, plan_activated_at, created_at, updated_at)
    VALUES
      (?,?,?,?,?,?,?,0,NULL,NULL,NOW(),NOW())
  ");
  $stmt->execute([
    $user_id,
    $company_name,
    $city,
    $whatsapp_raw,
    $price,             // INT (reais inteiros) — ajuste conversão acima se quiser centavos
    $services_json,
    $plan               // 'gratis' ou 'destaque' (mas só ativa após pagamento)
  ]);

  $pdo->commit();

  // cria sessão
  $_SESSION['user'] = [
    'id' => $user_id,
    'email' => $email,
    'name' => $name,
    'role' => 'installer',
  ];

  // fluxo de saída: se plano pago, manda para checkout; senão, dashboard.
  $redirect = ($plan === 'destaque')
    ? '/checkout.html?plan=destaque'
    : '/dashboard.html';

  if (wants_json()) {
    echo json_encode(['ok' => true, 'redirect' => $redirect, 'plan' => $plan]);
  } else {
    header('Location: ' . $redirect, true, 302);
  }
  exit;

} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(['error' => 'server', 'message' => $e->getMessage()]);
  exit;
}
