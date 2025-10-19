// static/auth.js
(function(){
  const $ = (id)=>document.getElementById(id);
  function svcSelected(){ return Array.from(document.querySelectorAll('.svc:checked')).map(x=>x.value); }

  // Plan cards selection
  const cards = document.querySelectorAll('.plan-card');
  const hiddenPlan = document.getElementById('i_plan');
  if(cards && hiddenPlan){
    cards.forEach(c => {
      c.addEventListener('click', (ev)=>{
        const plan = c.getAttribute('data-plan');
        hiddenPlan.value = plan;
        cards.forEach(k => k.classList.toggle('selected', k===c));
      });
      const btn = c.querySelector('.selectPlan');
      if(btn){ btn.addEventListener('click', (ev)=>{ ev.preventDefault(); c.click(); }); }
    });
  }

  async function afterLoginRedirect(){
    const meRes = await fetch('api/auth/me.php',{credentials:'include'});
    if(!meRes.ok){ location.href='auth.html'; return; }
    const me = await meRes.json();
    if(me.user.role==='admin')      location.href='admin.html';
    else if(me.user.role==='installer') location.href='dashboard.html';
    else                             location.href='index.html';
  }

  // Login
  const btnLogin = $('btnLogin');
  if(btnLogin){
    btnLogin.onclick = async ()=>{
      const email = $('l_email').value.trim();
      const password = $('l_password').value;
      const r = await fetch('api/auth/login.php',{
        method:'POST',credentials:'include',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email,password})
      });
      if(r.ok){ afterLoginRedirect(); } else { $('l_msg').textContent='Credenciais inválidas'; }
    };
  }

  // Create installer
  const btnCI = $('btnCreateInstaller');
  if(btnCI){
    btnCI.onclick = async ()=>{
      const desiredPlan = $('i_plan').value || 'gratis';
      const body = {
        name: $('i_name').value.trim(),
        email: $('i_email').value.trim(),
        password: $('i_password').value,
        company_name: $('i_company').value.trim(),
        city: $('i_city').value.trim(),
        whatsapp: $('i_whatsapp').value.trim(),
        price: $('i_price').value ? Number($('i_price').value) : null,
        services: svcSelected()
      };
      const r = await fetch('api/auth/register_installer.php',{
        method:'POST',credentials:'include',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(body)
      });
      if(r.ok){
        if(desiredPlan !== 'gratis'){
          location.href = 'checkout.html?plan=' + encodeURIComponent(desiredPlan);
        } else {
          location.href = 'dashboard.html';
        }
      }else{
        $('i_msg').textContent = 'Erro ao cadastrar (verifique os campos e o e-mail).';
      }
    };
  }

  // Create customer
  const btnCC = $('btnCreateCustomer');
  if(btnCC){
    btnCC.onclick = async ()=>{
      const body = { name:$('c_name').value.trim(), email:$('c_email').value.trim(), password:$('c_password').value };
      const r = await fetch('api/auth/register_customer.php',{
        method:'POST',credentials:'include',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(body)
      });
      if(r.ok){ location.href='index.html'; }
      else { $('c_msg').textContent = 'Erro ao criar conta (e-mail já usado?)'; }
    };
  }
})();