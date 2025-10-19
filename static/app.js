window.WA = {
  star(r){
    const full = Math.floor(r||0);
    const half = (r-full)>=0.5?1:0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half?'½':'') + '☆'.repeat(empty);
  },
  money(v){ if(v==null) return 'Sob consulta'; const n = Number(v); return 'A partir de R$ ' + n.toFixed(2).replace('.', ','); },
  qparam(key){
    const url = new URL(window.location.href);
    return url.searchParams.get(key);
  }
};


WA.planWeight = (p)=> (p==='exclusivo'?0 : p==='destaque'?1 : 2);


WA.loadInstallers = async function (opts = {}) {
  const params = new URLSearchParams({ per: '60', order: 'relevancia', page: '1' });
  if (opts.q)    params.set('q', opts.q);
  if (opts.svc)  params.set('svc', opts.svc);
  const r = await fetch('api/installers/list.php?' + params.toString(), { credentials:'include' });
  if (!r.ok) return [];
  const j = await r.json();
  return Array.isArray(j.items) ? j.items : [];
};

WA.money = function(v){
    if(v==null || v==='') return 'Sob consulta';
    var n = typeof v==='string' ? parseFloat(v.replace(',', '.')) : Number(v);
    if (isNaN(n)) return 'Sob consulta';
    return 'R$ ' + n.toFixed(2).replace('.', ',');
  };
