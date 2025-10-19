// static/admin.js
(async function(){
  const $ = (sel,el=document)=>el.querySelector(sel);
  const $$ = (sel,el=document)=>Array.from(el.querySelectorAll(sel));
  const tbody = $('#table tbody');
  const rtbody = $('#revtable tbody');
  const q = $('#aq'); const go = $('#ago');

  // gate: admin only
  const meRes = await fetch('api/auth/me.php',{credentials:'include'});
  if(!meRes.ok){ alert('Faça login.'); location.href='admin_login.html'; return; }
  const me = await meRes.json();
  if(!me || !me.user || me.user.role!=='admin'){ alert('Acesso restrito ao admin.'); location.href='index.html'; return; }

  async function apiListInstallers(query=''){
    const r = await fetch('api/admin/installers.php?q='+encodeURIComponent(query), {credentials:'include'});
    if(!r.ok) return [];
    return r.json();
  }
  async function apiSetApproved(id, approved){
    const r = await fetch('api/admin/approve.php', {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id, approved })
    });
    return r.ok;
  }
  async function apiSetPlan(id, plan){
    const r = await fetch('api/admin/set_plan.php', {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id, plan })
    });
    return r.ok;
  }

  function renderRow(x){
    const tr = document.createElement('tr');
    tr.dataset.id = x.id;
    tr.innerHTML = `
      <td>${x.id}</td>
      <td>${x.company_name||x.name||'-'}</td>
      <td>${x.city||'-'}</td>
      <td>${x.whatsapp||'-'}</td>
      <td>
        <select class="planSel">
          <option value="gratis" ${x.plan==='gratis'?'selected':''}>gratis</option>
          <option value="destaque" ${x.plan==='destaque'?'selected':''}>destaque</option>
          <option value="exclusivo" ${x.plan==='exclusivo'?'selected':''}>exclusivo</option>
        </select>
      </td>
      <td class="approvedCell">${x.approved ? 'Sim' : 'Não'}</td>
      <td class="actions">
        <button class="btn btn-ghost approveBtn" ${x.approved? 'disabled':''}>Aprovar</button>
        <button class="btn btn-ghost rejectBtn" ${!x.approved? 'disabled':''}>Reprovar</button>
        <a class="btn btn-blue" href="profile.html?id=${x.id}" target="_blank" rel="noopener">Ver</a>
      </td>
    `;
    // bind plan change
    const planSel = $('.planSel', tr);
    planSel.addEventListener('change', async ()=>{
      const ok = await apiSetPlan(x.id, planSel.value);
      if(!ok){ alert('Erro ao salvar plano'); planSel.value = x.plan; } else { x.plan = planSel.value; }
    });

    // bind approve/reject with UI update
    const approveBtn = $('.approveBtn', tr);
    const rejectBtn  = $('.rejectBtn', tr);
    const approvedCell = $('.approvedCell', tr);

    approveBtn.addEventListener('click', async ()=>{
      approveBtn.disabled = true;
      const ok = await apiSetApproved(x.id, 1);
      if(!ok){ alert('Erro ao aprovar'); approveBtn.disabled = false; return; }
      x.approved = 1;
      approvedCell.textContent = 'Sim';
      // toggle buttons: after approve, allow reprovar
      rejectBtn.disabled = false;
      approveBtn.disabled = true;
    });

    rejectBtn.addEventListener('click', async ()=>{
      rejectBtn.disabled = true;
      const ok = await apiSetApproved(x.id, 0);
      if(!ok){ alert('Erro ao reprovar'); rejectBtn.disabled = false; return; }
      x.approved = 0;
      approvedCell.textContent = 'Não';
      // toggle buttons: after reprovar, allow aprovar novamente
      approveBtn.disabled = false;
      rejectBtn.disabled = true;
    });

    return tr;
  }

  async function loadInstallers(){
    tbody.innerHTML = '<tr><td colspan="7">Carregando...</td></tr>';
    const list = await apiListInstallers(q.value.trim());
    tbody.innerHTML = '';
    list.forEach(x => tbody.appendChild(renderRow(x)));
  }

  go.addEventListener('click', loadInstallers);
  q.addEventListener('keydown', (e)=>{ if(e.key==='Enter') loadInstallers(); });

  // Reviews pendentes
  async function loadPendingReviews(){
    try {
      const r = await fetch('api/admin/reviews_list.php?status=pending',{credentials:'include'});
      if(!r.ok) { rtbody.innerHTML = '<tr><td colspan="6">Erro ao carregar reviews.</td></tr>'; return; }
      const list = await r.json();
      rtbody.innerHTML = '';
      list.forEach(rv => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${rv.id}</td>
          <td>${rv.installer_name||rv.installer_id}</td>
          <td>${rv.user_name||rv.user_id}</td>
          <td>${rv.rating}</td>
          <td>${rv.comment||''}</td>
          <td>
            <button class="btn btn-blue approveReview">Aprovar</button>
            <button class="btn btn-ghost rejectReview">Rejeitar</button>
          </td>`;
        const approveR = $('.approveReview', tr);
        const rejectR  = $('.rejectReview', tr);
        approveR.addEventListener('click', async ()=>{
          approveR.disabled = true;
          const r = await fetch('api/admin/reviews_moderate.php',{
            method:'POST', credentials:'include',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ id: rv.id, status:'approved' })
          });
          if(!r.ok){ approveR.disabled = false; alert('Erro ao aprovar review'); return; }
          tr.remove();
        });
        rejectR.addEventListener('click', async ()=>{
          rejectR.disabled = true;
          const r = await fetch('api/admin/reviews_moderate.php',{
            method:'POST', credentials:'include',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ id: rv.id, status:'rejected' })
          });
          if(!r.ok){ rejectR.disabled = false; alert('Erro ao rejeitar review'); return; }
          tr.remove();
        });
        rtbody.appendChild(tr);
      });
      if(!list.length){
        rtbody.innerHTML = '<tr><td colspan="6">Nenhuma review pendente</td></tr>';
      }
    } catch(e){
      rtbody.innerHTML = '<tr><td colspan="6">Erro ao carregar reviews.</td></tr>';
    }
  }

  await loadInstallers();
  await loadPendingReviews();
})();