// static/buscar.js — quando q vazio: só pagos; com q: todos; filtro svc consistente
(function(){
  const elList  = document.getElementById('list');
  const elPager = document.getElementById('pager');
  const elQ     = document.getElementById('q');
  const elSvc   = document.getElementById('svc');
  const elOrder = document.getElementById('order');
  const btnGeo  = document.getElementById('geo');
  const btnGo   = document.getElementById('go');

  if(!elList){ console.warn('[buscar.js] #list não encontrado'); return; }

  function esc(s){ return String(s||'').replace(/[&<>"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c])); }

  function buildParams(page=1){
    const p = new URLSearchParams();
    const q = (elQ?.value || '').trim();

    if (q) p.set('q', q);
    if (elSvc && elSvc.value) p.set('svc', elSvc.value);
    p.set('order', elOrder?.value || 'relevancia');
    p.set('page', String(page));
    p.set('per', '12');

    // Sem termo de busca -> mostrar só pagos
    if (!q) p.set('paid_only','1');

    return p.toString();
  }

  async function fetchList(params){
    const r = await fetch('api/installers/list.php?' + params);
    if(!r.ok) throw new Error('HTTP '+r.status);
    return await r.json();
  }

  function card(x){
    const services = Array.isArray(x.services) ? x.services.join(', ') : '';
    const priceTxt = (x.price==null) ? 'Sob consulta' : ('A partir de R$ ' + Number(x.price).toFixed(0));
    const rating   = Number(x.rating||0);
    const ratingHtml = rating > 0 ? `<div class="rating">${WA.star(rating)} <span>${rating.toFixed(1)}</span></div>` : '';
    const planTag = (x.plan && x.plan!=='gratis') ? `<span class="badge-tag">Plano ${esc(x.plan)}</span>` : '';

    return `
      <div class="card-list">
        <div class="card-head">
          <div class="title">
            <strong>${esc(x.name || x.company_name || 'Instalador')}</strong>
            ${x.badge ? `<span class="badge-tag">${esc(x.badge)}</span>` : ''}
            ${planTag}
          </div>
          ${ratingHtml}
        </div>
        <div class="meta">${esc(x.city||'-')} • ${esc(services)}</div>
        <div class="price-strong">${priceTxt}</div>
        <div class="actions">
          <a class="btn btn-ghost" href="profile.html?id=${encodeURIComponent(x.id)}">Ver perfil</a>
          <a class="btn btn-wa" href="https://wa.me/${encodeURIComponent(x.whatsapp||'')}" target="_blank" rel="noopener">WhatsApp</a>
        </div>
      </div>`;
  }

  function render(list){
    elList.innerHTML = list.map(card).join('') || '<p class="muted">Nenhum profissional encontrado.</p>';
  }

  async function doSearch(page=1){
    try{
      elList.innerHTML = '<p class="muted">Carregando…</p>';
      const params = buildParams(page);
      const j = await fetchList(params);
      render(j.items || []);
      // (se quiser paginação, monte elPager aqui com j.pages)
    }catch(e){
      console.error(e);
      elList.innerHTML = '<p class="muted">Falha ao carregar resultados.</p>';
    }
  }

  // eventos
  btnGo?.addEventListener('click', ()=>doSearch(1));
  elSvc?.addEventListener('change', ()=>doSearch(1));
  elOrder?.addEventListener('change', ()=>doSearch(1));

  // geolocalização -> preenche só cidade
  btnGeo?.addEventListener('click', async ()=>{
    try{
      if(!navigator.geolocation) return;
      const pos = await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true, timeout:6000}));
      const { latitude, longitude } = pos.coords || {};
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
      const j = await fetch(url, { headers:{'Accept':'application/json'} }).then(r=>r.json());
      const a = j.address || {};
      const city = a.city || a.town || a.village || a.county || '';
      if(elQ && city) elQ.value = city; // só a cidade
      doSearch(1);
    }catch(e){ /* silencioso */ }
  });

  // primeira carga: só pagos
  doSearch(1);
})();
