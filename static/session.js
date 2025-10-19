// static/session.js (revisado)
(async function () {
  function a(href, label, klass = 'btn btn-ghost') {
    return `<a class="${klass}" href="${href}">${label}</a>`;
  }

  async function getMe() {
    try {
      const r = await fetch('api/auth/me.php', { credentials: 'include' });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  }

  function renderDefault(actions) {
    actions.innerHTML =
      a('planos.html', 'Planos', 'btn btn-ghost') +
      a('login.html', 'Entrar', 'btn btn-ghost') +
      a('cadastro_instalador.html', 'Cadastrar', 'btn btn-blue');
  }

  function wireLogout(actions) {
    const exitA = Array.from(actions.querySelectorAll('a')).find(a => a.textContent.trim() === 'Sair');
    if (exitA) {
      exitA.addEventListener('click', async (ev) => {
        ev.preventDefault();
        try {
          await fetch('api/auth/logout.php', { method: 'POST', credentials: 'include' });
        } catch {}
        location.href = 'index.html';
      });
    }
  }

  const actions = document.querySelector('.nav .actions');
  if (!actions) return;

  // estado padrão (aparece já de cara)
  renderDefault(actions);

  const me = await getMe();
  if (!me || !me.user) {
    return; // mantém padrão (Planos / Entrar / Cadastrar)
  }

  const role = me.user.role;
  if (role === 'admin') {
    actions.innerHTML =
      a('admin.html', 'Admin', 'btn btn-blue') +
      a('sair', 'Sair', 'btn btn-ghost');
  } else if (role === 'installer') {
    actions.innerHTML =
      a('dashboard.html', 'Painel', 'btn btn-blue') +
      a('sair', 'Sair', 'btn btn-ghost');
  } else if (role === 'customer') {
    actions.innerHTML =
      a('index.html', 'Minha conta', 'btn btn-blue') +
      a('sair', 'Sair', 'btn btn-ghost');
  } else {
    renderDefault(actions);
  }

  wireLogout(actions);
})();
