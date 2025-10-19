// static/register_installer.js
(function(){
  const form = document.querySelector('[data-installer-form]');
  if(!form) return;

  // fill states if select[name=uf] exists
  const UF = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
  const ufSel = form.querySelector('select[name=uf]');
  if(ufSel){ ufSel.innerHTML = '<option value="">UF</option>' + UF.map(u=>`<option>${u}</option>`).join(''); }

  // simple phone mask (digits only)
  const w = form.querySelector('input[name=whatsapp]');
  if(w){
    w.addEventListener('input', ()=>{
      w.value = w.value.replace(/\D+/g,'');
      if(w.value.length>13) w.value = w.value.slice(0,13);
    });
  }

  // price with decimals normalize
  const priceInput = form.querySelector('input[name=price]');
  function normPrice(v){
    if(!v) return '';
    const n = parseFloat(String(v).replace(',','.'));
    return isNaN(n)?'':n.toFixed(2);
  }

  async function getPrices(){
    try{
      const r = await fetch('api/plans/get.php');
      if(!r.ok) throw 0;
      return await r.json();
    }catch(e){ return {gratis:0, destaque:79.99}; }
  }
  let PRICES = {gratis:0, destaque:79.99};
  getPrices().then(p=>PRICES=p);

  form.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const fd = new FormData(form);
    // normalize price
    fd.set('price', normPrice(fd.get('price')));
    // plan chosen
    const plan = (fd.get('plan')||'gratis').toString();

    try{
      const r = await fetch(form.action, { method:'POST', body: fd, credentials:'include' });
      const txt = await r.text();
      let j = {}; try{ j = JSON.parse(txt); }catch(_){}
      if(!r.ok){
        if(j.error==='email_in_use'){ alert('Este e-mail já está cadastrado.'); return; }
        throw new Error(j.error || txt || ('HTTP '+r.status));
      }
      if(j.ok){
        if(plan==='destaque'){
          location.href = 'checkout.html?plan=destaque';
          return;
        }
        location.href = 'dashboard.html';
      }else{
        alert('Falha: ' + (j.error || 'tente novamente.'));
      }
    }catch(e){
      alert('Falha ao enviar. Verifique sua conexão.');
      console.error(e);
    }
  });
})();