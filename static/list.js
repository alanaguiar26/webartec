(function(){
  const $ = (sel)=>document.querySelector(sel);
  const qParam = new URL(window.location.href).searchParams.get('q');
  if(qParam){ $('#q').value = qParam; }

  async function fetchPage(page=1){
    const q = $('#q').value||'';
    const svc = $('#svc').value||'';
    const ord = $('#ordena').value||'relevancia';
    const per = $('#perpage').value||6;
    const url = `api/installers/list.php?q=${encodeURIComponent(q)}&svc=${encodeURIComponent(svc)}&order=${ord}&page=${page}&per=${per}`;
    const r = await fetch(url); return r.json();
  }

  async function render(page=1){
    const d = await fetchPage(page);
    $('#filtrocidade').textContent = $('#q').value||'Brasil';
    $('#filtrosvc').textContent = $('#svc').value||'Todos os serviços';

    $('#cards').innerHTML = (d.items||[]).map(x=>`
      <div class="card-list">
        <div class="card-head">
          <div class="title">
            <strong>${x.name}</strong>
            ${x.badge ? `<span class="badge-tag">${x.badge}</span>` : ''}
          </div>
          <div class="rating">${WA.star(x.rating)} <span>${Number(x.rating||0).toFixed(1)}</span></div>
        </div>
        <div class="meta">${x.city} • ${(x.services||[]).join(', ')}</div>
        <div class="price-strong">${WA.money(x.price)}</div>
        <div class="actions">
          <a class="btn btn-wa" href="https://wa.me/${x.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>
          <a class="btn btn-ghost" href="profile.html?id=${x.id}">Ver perfil</a>
        </div>
      </div>
    `).join('') || '<p class="muted">Nenhum resultado.</p>';

    const pags = $('#paginas'); pags.innerHTML='';
    for(let i=1;i<=d.pages;i++){
      const span = document.createElement('span');
      span.className = 'page' + (i===d.page?' active':''); span.textContent = i;
      span.onclick = ()=>render(i); pags.appendChild(span);
    }
  }

  $('#btnBuscar').addEventListener('click', ()=>render(1));
  ['q','svc','ordena','perpage'].forEach(id=>{
    document.getElementById(id).addEventListener('change', ()=>render(1));
  });

  render(1);
})();