// static/index.js — vitrine (apenas pagos), rating 0 oculto, geolocalização cidade
(async function(){
  const grid = document.getElementById('dh-grid');
  const cityInput = document.getElementById('dh-city'); // input
  const tabs = Array.from(document.querySelectorAll('.dh-tab'));
  let activeCat = 'instalacao';

  function esc(s){ return String(s||'').replace(/[&<>"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c])); }

  function buildParams(city){
    const p = new URLSearchParams();
    if (city) p.set('q', city);
    p.set('order', 'relevancia');
    p.set('per', '6');
    p.set('paid_only', '1'); // VITRINE = só pagos
    return p.toString();
  }

  async function fetchList(params){
    const r = await fetch('api/installers/list.php?' + params);
    if(!r.ok) throw new Error('HTTP '+r.status);
    return await r.json();
  }

  function inCat(x){
    const svcs = Array.isArray(x.services) ? x.services : [];
    if(activeCat==='instalacao')  return svcs.includes('instalacao') || svcs.some(s=>/instala/i.test(s));
    if(activeCat==='limpeza')     return svcs.includes('limpeza')    || svcs.some(s=>/limpeza|higieniza/i.test(s));
    if(activeCat==='manutencao')  return svcs.includes('manutencao') || svcs.some(s=>/manuten/i.test(s));
    if(activeCat==='vrf')         return svcs.includes('vrf')        || svcs.some(s=>/vrf|comercial/i.test(s));
    return true;
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

  function render(items){
    const filtered = items.filter(inCat);
    grid.innerHTML = (filtered.length? filtered : items).slice(0,6).map(card).join('');
  }

  async function load(cityText){
    try{
      const params = buildParams(cityText);
      const j = await fetchList(params);
      render(j.items || []);
    }catch(e){
      console.error(e);
      grid.innerHTML = '<p class="muted">Falha ao carregar destaques.</p>';
    }
  }

  // Tabs
  tabs.forEach(btn => btn.addEventListener('click', ()=>{
    tabs.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    activeCat = btn.dataset.cat || 'instalacao';
    load(cityInput?.value || '');
  }));

  // Cidade digitada
  cityInput?.addEventListener('change', ()=>load(cityInput.value||''));

  // Geolocalização -> apenas nome da cidade
  try{
    if(navigator.geolocation){
      const pos = await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true, timeout:5000}));
      const { latitude, longitude } = pos.coords || {};
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
      const j = await fetch(url, { headers:{'Accept':'application/json'} }).then(r=>r.json());
      const a = j.address || {};
      const city = a.city || a.town || a.village || a.county || '';
      if(city){
        if(cityInput) cityInput.value = city;
        await load(city);
        return;
      }
    }
  }catch{ /* ignora */ }

  // fallback: sem cidade
  load('');
})();
