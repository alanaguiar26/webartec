// static/buscar.js
(function(){
  const elQ     = document.getElementById('q');
  const elSVC   = document.getElementById('svc');
  const elOrder = document.getElementById('order');
  const elGeo   = document.getElementById('geo');
  const elGo    = document.getElementById('go');
  const grid    = document.getElementById('list');
  const pager   = document.getElementById('pager');

  if(!grid){ console.warn('[buscar.js] Container da lista não encontrado (#list).'); return; }
  if(!elGeo){ console.warn('[buscar.js] Botão de geolocalização não encontrado (#geo).'); }
  if(!elQ || !elSVC || !elOrder){ console.warn('[buscar.js] Filtros não encontrados.'); }

  // Lê parâmetros iniciais (ex.: ?q=Barueri&svc=instalacao)
  const url = new URL(location.href);
  if(elQ)   elQ.value   = url.searchParams.get('q')   || '';
  if(elSVC) elSVC.value = url.searchParams.get('svc') || '';
  if(elOrder) elOrder.value = url.searchParams.get('order') || 'relevancia';

  let currentPage = 1;

  async function fetchList(params){
    const qs = new URLSearchParams(params);
    const resp = await fetch('api/installers/list.php?' + qs.toString(), { credentials:'include' });
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    return resp.json();
  }

  function card(item){
    const services = Array.isArray(item.services) ? item.services.join(', ') : '';
    const priceTxt = (item.price==null || item.price==='') ? 'Sob consulta' : ('A partir de R$ ' + Number(item.price).toFixed(0));
    const rating   = (item.rating!=null) ? Number(item.rating).toFixed(1) : '0.0';
    const stars    = WA.star(item.rating || 0);

    return `
      <div class="card-list">
        <div class="card-head">
          <div class="title">
            <strong>${item.name || item.company_name || '—'}</strong>
            ${item.badge ? `<span class="badge-tag">${item.badge}</span>` : ''}
          </div>
          <div class="rating">${stars} <span>${rating}</span></div>
        </div>
        <div class="meta">${item.city || ''} • ${services}</div>
        <div class="price-strong">${priceTxt}</div>
        <div class="actions">
          ${item.whatsapp ? `<a class="btn btn-wa" href="https://wa.me/${item.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
          <a class="btn btn-ghost" href="profile.html?id=${item.id}">Ver perfil</a>
        </div>
      </div>
    `;
  }

  function renderPager(page, pages, paramsBase){
    if(!pager) return;
    pager.innerHTML = '';
    if(pages<=1) return;
    const mk = (p,label=(p+''),active=false)=>`<button class="page ${active?'active':''}" data-p="${p}">${label}</button>`;
    let html = '';
    html += mk(1,'«',false);
    html += mk(Math.max(1,page-1),'‹',false);
    html += mk(page, page, true);
    if(page<pages){ html += mk(page+1,'›',false); html += mk(pages,'»',false); }
    pager.innerHTML = html;
    pager.querySelectorAll('button.page').forEach(b=>{
      b.addEventListener('click', ()=>{
        currentPage = parseInt(b.getAttribute('data-p'),10);
        doSearch(false); // não reseta page
      });
    });
  }

  async function doSearch(resetPage=true){
    try{
      if(resetPage) currentPage = 1;
      grid.innerHTML = '<p class="muted">Carregando...</p>';

      const params = {
        q: (elQ?.value || '').trim(),
        svc: (elSVC?.value || '').trim(),
        order: (elOrder?.value || 'relevancia'),
        page: currentPage,
        per: 9 // 3 col x 3 linhas no desktop
      };

      const data = await fetchList(params);
      const items = data.items || [];
      if(items.length === 0){
        grid.innerHTML = '<p class="muted">Nenhum profissional encontrado.</p>';
      }else{
        grid.innerHTML = items.map(card).join('');
      }
      renderPager(data.page||1, data.pages||1, params);
    }catch(e){
      console.error(e);
      grid.innerHTML = '<p class="muted">Falha ao carregar resultados.</p>';
    }
  }

  // Geolocalização -> cidade (sem UF)
  async function setCityFromGeo(){
    if(!navigator.geolocation){ alert('Geolocalização não suportada.'); return; }
    navigator.geolocation.getCurrentPosition(async (pos)=>{
      try{
        const { latitude, longitude } = pos.coords;
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
        const r = await fetch(url, { headers:{ 'Accept':'application/json' } });
        const j = await r.json();
        const addr = j.address || {};
        const city = addr.city || addr.town || addr.village || addr.municipality || '';
        if(elQ) elQ.value = city; // só a cidade (sem UF)
        doSearch();
      }catch(err){
        console.error('geo/reverse', err);
        alert('Não foi possível identificar sua cidade.');
      }
    }, (err)=>{
      console.warn('geoloc', err);
      alert('Não foi possível obter sua localização.');
    }, { enableHighAccuracy:false, timeout:10000, maximumAge:60000 });
  }

  // Eventos
  elGo && elGo.addEventListener('click', ()=>doSearch());
  elOrder && elOrder.addEventListener('change', ()=>doSearch());
  elSVC && elSVC.addEventListener('change', ()=>doSearch());
  elGeo && elGeo.addEventListener('click', setCityFromGeo);

  // Primeira busca
  doSearch();
})();
