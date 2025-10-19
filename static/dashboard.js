// static/dashboard.js  (versão revisada)
(async function () {
  const els = {
    company:  document.getElementById('company'),
    city:     document.getElementById('city'),
    whatsapp: document.getElementById('whatsapp'),
    price:    document.getElementById('price'),
    svcBox:   document.getElementById('svcContainer'),
    planBadge:document.getElementById('planBadge'),
    approved: document.getElementById('approved'),
    statusBanner: document.getElementById('statusBanner'),
    saveBtn:  document.getElementById('save'),
    statusTxt:document.getElementById('status'),
    viewProfile: document.getElementById('viewProfile'),
    btnUpgrade: document.getElementById('btnUpgrade')
  };

  const svcList = ['instalacao','limpeza','higienizacao','manutencao','preventiva','vrf'];

  function renderSvcCheckboxes(selected = []) {
    if (!els.svcBox) return;
    const sel = Array.isArray(selected) ? selected : [];
    els.svcBox.innerHTML = svcList.map(val => {
      const checked = sel.includes(val) ? 'checked' : '';
      const label = {
        instalacao: 'Instalação',
        limpeza: 'Limpeza',
        higienizacao: 'Higienização',
        manutencao: 'Manutenção',
        preventiva: 'Preventiva',
        vrf: 'VRF / Comercial'
      }[val] || val;
      return `<label><input type="checkbox" value="${val}" ${checked}> ${label}</label>`;
    }).join('');
  }

  async function loadProfile() {
    try {
      const r = await fetch('api/installers/get_profile.php', { credentials: 'include' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const p = await r.json();
      if (p.error) throw new Error(p.error);

      // campos básicos
      if (els.company)  els.company.value  = p.company_name || '';
      if (els.city)     els.city.value     = p.city || '';
      if (els.whatsapp) els.whatsapp.value = p.whatsapp || '';
      if (els.price)    els.price.value    = (p.price ?? '');

      renderSvcCheckboxes(p.services);

      // plano (somente leitura)
      document.querySelectorAll('input[name="plan_ro"]').forEach(radio => {
        if (radio.value === (p.plan || 'gratis')) radio.checked = true;
      });

      // status (coluna direita)
      if (els.planBadge) {
        els.planBadge.textContent = p.plan || '-';
        if (p.plan_until) els.planBadge.textContent += ` • até ${p.plan_until}`;
      }
      if (els.approved) els.approved.textContent = p.approved ? 'Aprovado' : 'Aguardando aprovação';
      if (els.statusBanner) els.statusBanner.style.display = p.approved ? 'none' : 'block';

      // "Ver perfil" → página pública
      if (els.viewProfile && p.id) {
        els.viewProfile.href = `profile.html?id=${encodeURIComponent(p.id)}`;
        els.viewProfile.target = '_blank';
        els.viewProfile.rel = 'noopener';
      }

      // Upgrade: desabilita se já estiver em destaque/exclusivo
      if (els.btnUpgrade) {
        if (p.plan === 'destaque' || p.plan === 'exclusivo') {
          els.btnUpgrade.classList.add('btn-ghost');
          els.btnUpgrade.classList.remove('btn-blue');
          els.btnUpgrade.textContent = 'Plano ativo';
          els.btnUpgrade.href = '#';
          els.btnUpgrade.setAttribute('aria-disabled', 'true');
        } else {
          els.btnUpgrade.href = 'checkout.html?plan=destaque';
        }
      }

    } catch (e) {
      console.error(e);
      if (els.statusTxt) els.statusTxt.textContent = 'Falha ao carregar perfil.';
    }
  }

  async function saveProfile() {
    const services = Array.from(els.svcBox?.querySelectorAll('input[type=checkbox]:checked') || [])
      .map(cb => cb.value);

    // normaliza WhatsApp (só dígitos)
    const wa = (els.whatsapp?.value || '').replace(/\D+/g, '');

    const payload = {
      company_name: (els.company?.value || '').trim(),
      city:         (els.city?.value || '').trim(),
      whatsapp:     wa,
      price:        els.price?.value ? parseInt(els.price.value, 10) : null,
      services
    };

    try {
      if (els.saveBtn) els.saveBtn.disabled = true;
      const r = await fetch('api/installers/update_profile.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || ('HTTP ' + r.status));
      }
      const j = await r.json();
      if (j.ok) {
        if (els.statusTxt) els.statusTxt.textContent = 'Salvo com sucesso.';
        loadProfile(); // reflete plano/data se alterados por regras do backend
      } else {
        throw new Error(j.error || 'Erro ao salvar');
      }
    } catch (e) {
      console.error(e);
      if (els.statusTxt) els.statusTxt.textContent = 'Falha ao salvar: ' + e.message;
    } finally {
      if (els.saveBtn) els.saveBtn.disabled = false;
    }
  }

  els.saveBtn?.addEventListener('click', ev => { ev.preventDefault(); saveProfile(); });

  loadProfile();
})();
