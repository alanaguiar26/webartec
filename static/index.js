// static/index.js (v2) — vitrine mostra apenas pagos; geolocalização usa somente o nome da cidade
(async function(){
  const grid = document.getElementById('dh-grid');
  const cityInput = document.getElementById('dh-city'); // pode ser input ou select, tratamos como input
  const tabs = Array.from(document.querySelectorAll('.dh-tab'));
  let activeCat = 'instalacao';

  function buildParams(city){
    const p = new URLSearchParams();
    if (city) p.set('q', city);
    p.set('order', 'relevancia');
    p.set('per', '6');
    // manter apenas pagos na vitrine
    p.set('paid_only', '1');
    return p.toString();
  }

  async function load(cityText){
    const params = buildParams(cityText);
    const r = await fetch('api/installers/list.php?' + params);
    if(!r.ok){ grid.innerHTML = '<p class="muted">Falha ao carregar destaques.</p>'; return; }
    const j = await r.json();
    render(j.items || []);
  }

  function render(items){
    const filtered = items.filter(x => {
      const svcs = Array.isArray(x.services) ? x.services : [];
      if(activeCat==='instalacao')  return svcs.some(s=>/instala/i.test(s));
      if(activeCat==='limpeza')     return svcs.some(s=>/limpeza|higieniza/i.test(s));
      if(activeCat==='manutencao')  return svcs.some(s=>/manuten/i.test(s));
      if(activeCat==='vrf')         return svcs.some(s=>/vrf|comercial/i.test(s));
      return true;
    });
    grid.innerHTML = (filtered.length? filtered : items).slice(0,6).map(card).join('');
  }

  function card(x){
    const services = Array.isArray(x.services) ? x.services.join(', ') : '';
    const priceTxt = (x.price==null) ? 'Sob consulta' : ('A partir de R$ ' + Number(x.price).toFixed(0));
    return `
      <div class="card-list">
        <div class="card-head">
          <div class="title">
            <strong>${escapeHtml(x.name || x.company_name || 'Instalador')}</strong>
            ${x.badge ? `<span class="badge-tag">${escapeHtml(x.badge)}</span>` : ''}
            ${x.plan && x.plan!=='gratis' ? `<span class="badge-tag">Plano ${escapeHtml(x.plan)}</span>` : ''}
          </div>
          <div class="rating">${WA.star(x.rating||0)} <span>${Number(x.rating||0).toFixed(1)}</span></div>
        </div>
        <div class="meta">${escapeHtml(x.city||'-')} • ${escapeHtml(services)}</div>
        <div class="price-strong">${priceTxt}</div>
        <div class="actions">
          <a class="btn btn-ghost" href="profile.html?id=${encodeURIComponent(x.id)}">Ver perfil</a>
          <a class="btn btn-wa" href="https://wa.me/${encodeURIComponent(x.whatsapp||'')}" target="_blank" rel="noopener">WhatsApp</a>
        </div>
      </div>`;
  }

  function escapeHtml(s){
    return String(s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  // Tabs
  tabs.forEach(btn => btn.addEventListener('click', ()=>{
    tabs.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    activeCat = btn.dataset.cat || 'instalacao';
    load(cityInput?.value || '');
  }));

  // City input change
  cityInput?.addEventListener('change', ()=>load(cityInput.value||''));

  // Tenta auto-detectar cidade (somente nome da cidade)
  try{
    if(navigator.geolocation){
      const pos = await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true, timeout:5000}));
      const { latitude, longitude } = pos.coords || {};
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
      const j = await fetch(url, { headers:{'Accept':'application/json'} }).then(r=>r.json());
      const addr = j.address || {};
      const city = addr.city || addr.town || addr.village || addr.county || '';
      if(city){
        if(cityInput) cityInput.value = city;
        await load(city);
        return;
      }
    }
  }catch(e){/* silencioso */}

  // fallback: sem cidade
  load('');
})();