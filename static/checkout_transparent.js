// static/checkout_transparent.js — fix robusto para token/PMID do Brick
(async function(){
  const params = new URLSearchParams(location.search);
  const plan = (params.get('plan') || 'destaque').toLowerCase();
  const override = params.get('amount'); // ex.: ?amount=79.99 ou 79,99
  const recurring = params.get('recorrente') === '1';

  const $ = (id)=>document.getElementById(id);
  const msg = $('msg'), planEl = $('plan'), priceText = $('priceText'), billingNote = $('billingNote');

  async function getPrices(){
    try{
      const r = await fetch('api/plans/get.php', { credentials:'include' });
      if(!r.ok) throw new Error('HTTP '+r.status);
      return await r.json(); // { gratis: 0, destaque: 79.99 }
    }catch(e){
      return { gratis: 0, destaque: 79.99 };
    }
  }
  const PL = await getPrices();
  let amount = (plan in PL) ? Number(PL[plan]) : 0;

  if (override){
    const n = parseFloat(String(override).replace(',','.'));
    if(!Number.isNaN(n)) amount = n;
  }

  if(planEl) planEl.textContent = plan;
  if(priceText) priceText.textContent = (amount>0 ? 'R$ '+amount.toFixed(2).replace('.',',') : 'R$ 0,00');
  if(billingNote) billingNote.textContent = recurring ? 'Cobrança recorrente mensal.' : 'Cobrança única (30 dias).';

  if(plan === 'exclusivo'){ if(msg) msg.textContent = 'Plano exclusivo é sob consulta.'; return; }
  if(plan !== 'destaque' && plan !== 'gratis'){ if(msg) msg.textContent = 'Plano inválido'; return; }

  async function getPubKey(){
    try{
      const r = await fetch('api/payments/public_key.php', { credentials:'include' });
      if(!r.ok) return null;
      const j = await r.json();
      return j.public_key || null;
    }catch(e){ return null; }
  }
  const publicKey = await getPubKey();
  if(!publicKey){ if(msg) msg.textContent = 'Chave pública não configurada.'; return; }

  const mp = new MercadoPago(publicKey, { locale: 'pt-BR' });
  const bricksBuilder = mp.bricks();

  function pick(...candidates){
    for (const c of candidates){
      if (c !== undefined && c !== null && c !== '') return c;
    }
    return null;
  }

  try {
    const containerId = 'cardPaymentBrick_container';
    if (!document.getElementById(containerId)) {
      if(msg) msg.textContent = 'Elemento do formulário não encontrado.';
      return;
    }

    window.cardPaymentBrickController = await bricksBuilder.create('cardPayment', containerId, {
      initialization: { amount },
      customization: { paymentMethods: { maxInstallments: 1 } },
      callbacks: {
        onReady: () => {},
        onSubmit: async (cardFormData) => {
          try{
            if(recurring){
              location.href = 'checkout_recorrente.html?plan='+encodeURIComponent(plan);
              return;
            }

            // ⚠️ Campos defensivos: o Brick às vezes muda as chaves
            const token = pick(
              cardFormData?.token,
              cardFormData?.token?.id,
              cardFormData?.tokenizationData?.id,
              cardFormData?.tokenization_data?.id
            );
            const paymentMethodId = pick(
              cardFormData?.paymentMethodId,
              cardFormData?.payment_method_id,
              cardFormData?.paymentMethod?.id
            );
            const issuerId = pick(
              cardFormData?.issuerId,
              cardFormData?.issuer?.id
            );
            const installments = Number(pick(cardFormData?.installments, 1)) || 1;
            const payerEmail = pick(
              cardFormData?.payer?.email,
              document.getElementById('payerEmail')?.value,
              '' // fallback vazio
            );

            if(!token || !paymentMethodId){
              if(msg) msg.textContent = 'Não recebi os dados do cartão do Mercado Pago. Verifique os campos e tente novamente.';
              console.warn('[checkout] cardFormData recebido:', cardFormData);
              return;
            }

            const resp = await fetch('api/payments/process_card.php', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amount, plan,
                token: token,
                payment_method_id: paymentMethodId,
                issuer_id: issuerId,
                installments: installments,
                payer: { email: payerEmail }
              })
            });

            const txt = await resp.text();
            let data = {}; try{ data = JSON.parse(txt); }catch(_){}
            if(!resp.ok){
              throw new Error((data && (data.message || data.error)) || txt || 'Erro ao processar pagamento');
            }

            if(data.ok){
              location.href = 'dashboard.html';
            } else {
              if(msg) msg.textContent = 'Pagamento não aprovado: ' + (data.message || data.status || 'tente novamente.');
            }
          }catch(e){
            if(msg) msg.textContent = 'Falha ao processar: ' + e.message;
          }
        },
        onError: (error) => {
          if(msg) msg.textContent = 'Erro no Brick: ' + (error && error.message ? error.message : 'desconhecido');
        }
      }
    });
  } catch (err) {
    if(msg) msg.textContent = 'Não foi possível carregar o formulário do cartão.';
    console.error('[checkout_transparent] bricks error:', err);
  }
})();
