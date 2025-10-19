(async function(){
  const id = Number(new URL(window.location.href).searchParams.get('id')||0);
  const inst = await fetch('api/installers/get.php?id='+id).then(r=>r.json());
  if(inst.error){ document.getElementById('name').textContent='Não encontrado'; return; }

  document.getElementById('name').textContent = inst.company_name;
  document.getElementById('meta').textContent = `${inst.city} • ${(inst.services||[]).join(', ')} • Avaliação ${Number(inst.rating_avg||0).toFixed(1)} (${inst.rating_count||0}) • Plano ${inst.plan}`;
  const wa = document.getElementById('wa'); 
  wa.href = 'https://wa.me/' + inst.whatsapp;

  document.getElementById('info').innerHTML = `
    <p><strong>Cidade:</strong> ${inst.city}</p>
    <p><strong>Serviços:</strong> ${(inst.services||[]).join(', ')}</p>
    <p><strong>Avaliação:</strong> ${Number(inst.rating_avg||0).toFixed(1)} (${WA.star(inst.rating_avg||0)})</p>
    <p><strong>Preço:</strong> ${WA.money(inst.price)}</p>
    <p><strong>Plano:</strong> <span class="badge-small">${inst.plan}</span> ${inst.badge? '• Badge: '+inst.badge : ''}</p>
  `;

  // reviews
  async function loadReviews(){
    const rev = await fetch('api/reviews/list.php?installer_id='+id).then(r=>r.json());
    const list = rev.items||[];
    document.getElementById('reviews').innerHTML = list.length? list.map(r=>`
      <div style="border-bottom:1px solid #E6ECF5; padding:8px 0">
        <strong>${r.name}</strong> — ${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}
        <div class="muted">${r.comment||''}</div>
        <div class="muted" style="font-size:12px">${r.created_at}</div>
      </div>
    `).join('') : '<p class="muted">Ainda não há avaliações.</p>';
  }
  loadReviews();

  // show form only for customer
  const me = await fetch('api/auth/me.php',{credentials:'include'}).then(r=>r.ok?r.json():null).catch(()=>null);
  if(me && me.user && me.user.role==='customer'){
    document.getElementById('reviewForm').style.display='block';
    document.getElementById('r_send').onclick = async ()=>{
      const rating = Math.max(1, Math.min(5, Number(document.getElementById('r_rating').value||5)));
      const comment = document.getElementById('r_comment').value||'';
      const r = await fetch('api/reviews/add.php', {
        method:'POST', credentials:'include',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ installer_id:id, rating, comment })
      });
      if(r.ok){ alert('Enviado para moderação. Obrigado!'); document.getElementById('r_comment').value=''; }
      else { alert('Erro ao enviar.'); }
    };
  }
})();