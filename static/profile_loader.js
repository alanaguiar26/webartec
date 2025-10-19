// static/profile_loader.js
(async function(){
  // Dashboard (inputs por ID)
  const ipCompany = document.getElementById('company');
  const ipCity = document.getElementById('city');
  const ipWa = document.getElementById('whatsapp');
  const ipPrice = document.getElementById('price');
  const svcContainer = document.getElementById('svcContainer');
  const planBadge = document.getElementById('planBadge');
  const approvedEl = document.getElementById('approved');
  const statusBanner = document.getElementById('statusBanner');

  // Cadastro (form com data-installer-form)
  const form = document.querySelector('[data-installer-form]');

  try{
    const r = await fetch('api/installers/get_profile.php', { credentials:'include' });
    if(!r.ok) return;
    const p = await r.json();
    if(p.error) return;

    // preencher dashboard
    if(ipCompany) ipCompany.value = p.company_name || '';
    if(ipCity) ipCity.value = p.city || '';
    if(ipWa) ipWa.value = p.whatsapp || '';
    if(ipPrice) ipPrice.value = (p.price ?? '');

    if(svcContainer && Array.isArray(p.services)){
      // cria checkboxes se não existirem
      const all = ['instalacao','limpeza','higienizacao','manutencao','preventiva','vrf'];
      svcContainer.innerHTML = all.map(val=>{
        const checked = p.services.includes(val) ? 'checked' : '';
        return `<label><input type="checkbox" name="services[]" value="${val}" ${checked}> ${val.charAt(0).toUpperCase()+val.slice(1)}</label>`;
      }).join('');
    }
    if(planBadge) planBadge.textContent = p.plan || '-';
    if(approvedEl) approvedEl.textContent = p.approved ? 'Aprovado' : 'Pendente';
    if(statusBanner) statusBanner.style.display = p.approved ? 'none' : 'block';

    // Cadastro (se estiver nessa página)
    if(form){
      if(form.company_name) form.company_name.value = p.company_name || '';
      if(form.city) form.city.value = p.city || '';
      if(form.whatsapp) form.whatsapp.value = p.whatsapp || '';
      if(form.base_price) form.base_price.value = (p.price ?? '');
      if(Array.isArray(p.services)){
        p.services.forEach(val=>{
          const cb = form.querySelector(`input[type=checkbox][name="services[]"][value="${val}"]`);
          if(cb) cb.checked = true;
        });
      }
    }
  }catch(e){
    console.error('perfil: erro', e);
  }
})();
