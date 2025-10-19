// static/checkout.js — Checkout hospedado (Mercado Pago Checkout Pro)
(async function () {
  const $ = (sel) => document.querySelector(sel);
  const params = new URLSearchParams(location.search);
  const plan = (params.get('plan') || 'destaque').toLowerCase();
  const planLabel = plan === 'destaque' ? 'Destaque' : (plan === 'gratis' ? 'Grátis' : plan);

  // Preenche o plano na tela
  const planEl = $('#plan');
  if (planEl) planEl.textContent = planLabel;

  const msg = $('#msg');
  const payBtn = $('#pay');

  // Preço (pega da API se existir; fallback local)
  let prices = { gratis: 0, destaque: 79.90 };
  try {
    const r = await fetch('api/plans/get.php', { credentials: 'include' });
    if (r.ok) {
      const j = await r.json();
      if (j && j.plans) {
        // aceita inteiro/decimal; converte para número
        if (j.plans.gratis != null)   prices.gratis   = Number(j.plans.gratis);
        if (j.plans.destaque != null) prices.destaque = Number(j.plans.destaque);
      }
    }
  } catch (e) { /* usa fallback */ }

  // Desabilita botão se plano inválido
  if (!['gratis', 'destaque'].includes(plan)) {
    if (msg) msg.textContent = 'Plano inválido ou não suportado neste checkout.';
    if (payBtn) payBtn.disabled = true;
    return;
  }

  // Clique: cria Preference e redireciona para o Mercado Pago
  payBtn?.addEventListener('click', async () => {
    try {
      payBtn.disabled = true;
      msg.textContent = 'Gerando checkout seguro…';

      const resp = await fetch('api/payments/create_preference.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          amount: plan === 'destaque' ? prices.destaque : prices.gratis
        })
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data || !data.ok || !data.init_point) {
        throw new Error(data && (data.error || data.message) || 'Falha ao criar preferência');
      }

      // Redireciona para o checkout hospedado (Mercado Livre)
      window.location.href = data.init_point;
    } catch (e) {
      msg.textContent = 'Não foi possível iniciar o pagamento: ' + e.message;
      payBtn.disabled = false;
    }
  });
})();
