// static/home.js — busca + paginação com suporte a URL (?q, svc, order, page)
(function(){
  const q = document.getElementById('q');
  const svc = document.getElementById('svc');
  const order = document.getElementById('order');
  const go = document.getElementById('go');
  const list = document.getElementById('list');
  const pager = document.getElementById('pager');

  // preenche filtros a partir da URL
  const usp = new URLSearchParams(location.search);
  const initial = {
    q: usp.get('q') || '',
    svc: usp.get('svc') || '',
    order: usp.get('order') || 'relevancia',
    page: parseInt(usp.get('page') || '1', 10)
  };
  if (q) q.value = initial.q;
  if (svc) svc.value = initial.svc;
  if (order) order.value = initial.order;

  function updateURL(paramsObj){
    const url = new URL(location.href);
    Object.entries(paramsObj).forEach(([k,v])=>{
      if (v === '' || v == null) url.searchParams.delete(k);
      else url.searchParams.set(k, String(v));
    });
    history.replaceState(null, '', url.toString());
  }

  async function fetchList(page=1){
    const params = new URLSearchParams();
    const qv = q?.value.trim() || '';
    const sv = svc?.value || '';
    const ov = order?.value || 'relevancia';
    if(qv) params.set('q', qv);
    if(sv) params.set('svc', sv);
    if(ov) params.set('order', ov);
    params.set('page', page.toString());
    params.set('per', '6');
    try{
      const r = await fetch('api/installers/list.php?' + params.toString(), { credentials:'include' });
      if(!r.ok){ throw new Error('HTTP '+r.status); }
      const data = await r.json();
      renderList(data.items || []);
      renderPager(data.page, data.pages);
      updateURL({ q:qv, svc:sv, order:ov, page: data.page });
    }catch(e){
      if(list) list.innerHTML = '<p class="muted">Erro ao carregar resultados.</p>';
      if(pager) pager.innerHTML = '';
      console.error(e);
    }
  }

  function renderList(items){
    if(!list) return;
    if(!items.length){
      list.innerHTML = '<p class="muted">Nenhum resultado.</p>';
      return;
    }
    list.innerHTML = items.map(it => {
      const price = (it.price==null)?'Sob consulta':('A partir de R$ '+Number(it.price).toFixed(0));
      const rating = (it.rating ?? 0).toFixed(1);
      const tags = Array.isArray(it.services)? it.services.map(s=>`<span class="badge-tag">${s}</span>`).join(' ') : '';
      const wa = it.whatsapp ? `https://wa.me/${it.whatsapp}` : null;
      return `
        <div class="card-list">
          <div class="card-head">
            <div class="title"><strong>${it.name || '-'}</strong> <span class="meta">• ${it.city || '-'}</span></div>
            <span class="badge-small">${it.plan || 'gratis'}</span>
          </div>
          <div class="meta">Avaliação: <span class="rating">${WA.star(it.rating)} <span>${rating}</span></span></div>
          <div class="meta">Serviços: ${tags || '-'}</div>
          <div class="meta price-strong">${price}</div>
          <div class="actions">
            ${wa ? `<a class="btn btn-wa" href="${wa}" target="_blank" rel="noopener">Chamar no WhatsApp</a>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  function renderPager(page, pages){
    if(!pager) return;
    if(pages<=1){ pager.innerHTML=''; return; }
    let html='';
    for(let i=1;i<=pages;i++){
      html += `<button class="page ${i===page?'active':''}" data-p="${i}">${i}</button>`;
    }
    pager.innerHTML = html;
    pager.querySelectorAll('.page').forEach(b=>{
      b.addEventListener('click', ()=> fetchList(parseInt(b.dataset.p,10)));
    });
  }

  go?.addEventListener('click', ()=> fetchList(1));
  // Enter no input "q"
  q?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); fetchList(1); } });

  // Carregamento inicial respeitando a URL
  fetchList(isNaN(initial.page) ? 1 : initial.page);
})();
