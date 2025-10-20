// static/index.js — vitrine da home (somente pagos) + geolocalização por clique
(async function () {
  const grid = document.getElementById('dh-grid');
  const cityInput = document.getElementById('dh-city'); // é um <input>
  const tabs = Array.from(document.querySelectorAll('.dh-tab'));
  const geoBtn = document.getElementById('dh-geo'); // se existir um botão "Usar minha localização"
  let activeCat = 'instalacao';

  if (!grid) { console.warn('[index.js] #dh-grid não encontrado'); return; }

  // ------- helpers
  function escapeHtml(s){
    return String(s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  function buildSvcChips(list){
    const S = Array.isArray(list) ? list : [];
    const out = [];
    for (const sRaw of S) {
      const s = String(sRaw||'').toLowerCase();
      if (/instala/.test(s))            out.push({label:'Instalação',    cls:'chip-instalacao'});
      else if (/limpez/.test(s))        out.push({label:'Limpeza',       cls:'chip-limpeza'});
      else if (/higieniz/.test(s))      out.push({label:'Higienização',  cls:'chip-higienizacao'});
      else if (/manuten/.test(s))       out.push({label:'Manutenção',    cls:'chip-manutencao'});
      else if (/preventiv/.test(s))     out.push({label:'Preventiva',    cls:'chip-preventiva'});
      else if (/vrf|comercial/.test(s)) out.push({label:'Comercial/VRF', cls:'chip-vrf'});
    }
    const seen = new Set();
    const uniq = out.filter(x => !seen.has(x.label) && seen.add(x.label));
    if (!uniq.length) return '';
    return `<div class="svc-chips">${uniq.map(x=>`<span class="chip-svc ${x.cls}">${x.label}</span>`).join('')}</div>`;
  }

  function buildParams({ q, svc, order='relevancia', per=6, page=1, paidOnly=true }){
    const p = new URLSearchParams();
    if (q)     p.set('q', q);
    if (svc)   p.set('svc', svc);
    p.set('order', order);
    p.set('per', String(per));
    p.set('page', String(page));
    if (paidOnly) p.set('paid_only', '1'); // vitrine: somente pagos
    return p.toString();
  }

  async function fetchList(params){
    const r = await fetch('api/installers/list.php?' + params);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
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
    const services = Array.isArray(x.services) ? x.services : [];
    const priceTxt = (x.price==null) ? 'Sob consulta' : ('A partir de R$ ' + Number(x.price).toFixed(0));
    const ratingVal = Number(x.rating || x.rating_avg || 0);
    const ratingHtml = ratingVal > 0 ? `<div class="rating">${WA.star(ratingVal)} <span>${ratingVal.toFixed(1)}</span></div>` : '';
    const chipsHtml = buildSvcChips(services);

    return `
      <div class="card-list">
        <div class="card-head">
          <div class="title">
            <strong>${escapeHtml(x.name || x.company_name || 'Instalador')}</strong>
            ${x.badge ? `<span class="badge-tag">${escapeHtml(x.badge)}</span>` : ''}
            ${x.plan && x.plan!=='gratis' ? `<span class="badge-tag">Plano ${escapeHtml(x.plan)}</span>` : ''}
          </div>
          ${ratingHtml}
        </div>
        <div class="meta">${escapeHtml(x.city||'-')}</div>
        ${chipsHtml}
        <div class="price-strong">${priceTxt}</div>
        <div class="actions">
          <a class="btn btn-ghost" href="profile.html?id=${encodeURIComponent(x.id)}">Ver perfil</a>
          <a class="btn btn-wa" href="https://wa.me/${encodeURIComponent(x.whatsapp||'')}" target="_blank" rel="noopener">WhatsApp</a>
        </div>
      </div>`;
  }

  async function load(cityText){
    try{
      // vitrine: sempre pagos
      const params = buildParams({ q: cityText, paidOnly:true, per:6, page:1 });
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

  // City change
  cityInput?.addEventListener('change', ()=>load(cityInput.value||''));

  // Geolocalização SOMENTE após gesto do usuário
  geoBtn?.addEventListener('click', async ()=>{
    try{
      if (!navigator.geolocation) return;
      const pos = await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true, timeout:5000}));
      const { latitude, longitude } = pos.coords || {};
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
      const j = await fetch(url, { headers:{'Accept':'application/json'} }).then(r=>r.json());
      const addr = j.address || {};
      const city = addr.city || addr.town || addr.village || addr.county || '';
      if(city){
        if(cityInput) cityInput.value = city;
        await load(city);
      }
    }catch(e){ /* silencioso */ }
  });

  // Primeira carga sem pedir geolocalização
  load('');
})();
