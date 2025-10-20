// static/buscar.js — busca com chips e paid_only inicial
(async function () {
  // ------- elementos
  const els = {
    list:  document.getElementById('list'),
    pager: document.getElementById('pager'),
    q:     document.getElementById('q'),
    svc:   document.getElementById('svc'),
    order: document.getElementById('order'),
    go:    document.getElementById('go'),
    geo:   document.getElementById('geo'),
  };

  if (!els.list)  { console.warn('[buscar.js] Container da lista não encontrado (#list).'); return; }
  if (!els.pager) { console.warn('[buscar.js] Pager não encontrado (#pager).'); }

  // ------- helpers
  function escapeHtml(s){
    return String(s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  function buildSvcChips(list){
    const S = Array.isArray(list) ? list : [];
    const out = [];
    for (const sRaw of S) {
      const s = String(sRaw||'').toLowerCase();
      if (/instala/.test(s))          out.push({label:'Instalação',    cls:'chip-instalacao'});
      else if (/limpez/.test(s))      out.push({label:'Limpeza',       cls:'chip-limpeza'});
      else if (/higieniz/.test(s))    out.push({label:'Higienização',  cls:'chip-higienizacao'});
      else if (/manuten/.test(s))     out.push({label:'Manutenção',    cls:'chip-manutencao'});
      else if (/preventiv/.test(s))   out.push({label:'Preventiva',    cls:'chip-preventiva'});
      else if (/vrf|comercial/.test(s)) out.push({label:'Comercial/VRF', cls:'chip-vrf'});
    }
    const seen = new Set();
    const uniq = out.filter(x => !seen.has(x.label) && seen.add(x.label));
    if (!uniq.length) return '';
    return `<div class="svc-chips">${uniq.map(x=>`<span class="chip-svc ${x.cls}">${x.label}</span>`).join('')}</div>`;
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

  function buildParams({ q, svc, order, page=1, per=12, paidOnly=false }){
    const p = new URLSearchParams();
    if (q)     p.set('q', q);
    if (svc)   p.set('svc', svc);
    p.set('order', order || 'relevancia');
    p.set('page', String(page));
    p.set('per',  String(per));
    if (paidOnly) p.set('paid_only', '1');
    return p.toString();
  }

  async function fetchList(params){
    const r = await fetch('api/installers/list.php?' + params);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  function render(data){
    const items = (data && data.items) || [];
    els.list.innerHTML = items.length
      ? items.map(card).join('')
      : '<p class="muted">Nenhum técnico encontrado.</p>';

    if (!els.pager) return;
    const pages = Math.max(1, Number(data.pages||1));
    const page  = Math.max(1, Number(data.page||1));
    if (pages <= 1) { els.pager.innerHTML = ''; return; }

    let html = '';
    for (let i=1;i<=pages;i++){
      const active = (i===page) ? 'page active' : 'page';
      html += `<button class="${active}" data-page="${i}">${i}</button>`;
    }
    els.pager.innerHTML = html;

    els.pager.querySelectorAll('button[data-page]').forEach(btn=>{
      btn.onclick = () => {
        state.page = Number(btn.dataset.page||'1');
        doSearch();
      };
    });
  }

  // ------- estado e busca
  const state = { page: 1, per: 12 };

  async function doSearch(){
    try{
      const q = (els.q?.value || '').trim();
      const svc = (els.svc?.value || '').trim();
      const order = (els.order?.value || 'relevancia');
      // Regra: se não pesquisou cidade, mostrar apenas pagos
      const paidOnly = q === '';

      const params = buildParams({ q, svc, order, page: state.page, per: state.per, paidOnly });
      const data = await fetchList(params);
      render(data);
    }catch(e){
      console.error(e);
      els.list.innerHTML = '<p class="muted">Falha ao carregar resultados.</p>';
    }
  }

  // ------- eventos
  els.go  && (els.go.onclick  = () => { state.page = 1; doSearch(); });
  els.order && (els.order.onchange = () => { state.page = 1; doSearch(); });
  els.svc && (els.svc.onchange = () => { state.page = 1; doSearch(); });

  // Geolocalização: preenche apenas a cidade (sem UF)
  els.geo && (els.geo.onclick = async () => {
    try{
      if (!navigator.geolocation) return;
      const pos = await new Promise((res, rej)=>navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy:true, timeout:5000 }));
      const { latitude, longitude } = pos.coords || {};
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
      const j = await fetch(url, { headers:{'Accept':'application/json'} }).then(r=>r.json());
      const addr = j.address || {};
      const city = addr.city || addr.town || addr.village || addr.county || '';
      if (city && els.q) {
        els.q.value = city; // só cidade!
        state.page = 1;
        doSearch();
      }
    }catch(e){ /* silencioso */ }
  });

  // ------- primeira carga (somente pagos)
  doSearch();
})();
