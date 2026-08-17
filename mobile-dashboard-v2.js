(function(){
  const isMobile=()=>matchMedia('(max-width:768px)').matches;
  const moneyNumber=text=>Number(String(text||'').replace(/[^0-9,-]/g,'').replace('.','').replace(',','.'))||0;
  const money=value=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const esc=value=>String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const normStatus=value=>{
    const s=String(value||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return ({pendente:'Pendente',confirmado:'Confirmado',reagendado:'Reagendado',concluido:'Concluído',recusado:'Recusado',excluido:'Excluído'})[s]||String(value||'—');
  };
  const statusClass=value=>'vx-st-'+normStatus(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const fmtDate=value=>{
    if(!value)return '—';
    const [y,m,d]=String(value).slice(0,10).split('-');
    return y&&m&&d?`${d}/${m}/${y}`:String(value);
  };
  const actions=[
    ['▦','Agenda',()=>window.setView?.('agenda')],['♙','Clientes',()=>window.setView?.('clientes')],['◇','Serviços',()=>window.setView?.('servicos')],['♧','Equipe',()=>window.setView?.('profissionais')],
    ['R$','Financeiro',()=>window.setView?.('financeiro')],['↗','Relatórios',()=>window.setView?.('relatorios')],['⌂','Página',()=>window.openPublic?.()],['⚙','Empresa',()=>window.openConfigSection?.('empresa')]
  ];
  const viewMeta={
    agenda:['Agenda','Crie e acompanhe seus horários.','▦'],clientes:['Clientes','Contatos e histórico em um só lugar.','♙'],servicos:['Serviços','Organize seu catálogo e seus valores.','◇'],profissionais:['Equipe','Gerencie quem realiza os atendimentos.','♧'],financeiro:['Financeiro','Cobranças, PIX e recebimentos.','R$'],relatorios:['Relatórios','Acompanhe os resultados do negócio.','↗'],config:['Empresa','Personalize o funcionamento da sua agenda.','⚙']
  };
  let recentPage=0;
  const RECENT_PAGE_SIZE=5;

  function animateBalance(element,target){
    if(!element)return;
    const from=moneyNumber(element.dataset.value);element.dataset.value=target;const start=performance.now(),duration=620;
    const frame=now=>{const p=Math.min(1,(now-start)/duration),e=1-Math.pow(1-p,4);element.innerHTML=`<small>R$</small>${money(from+(target-from)*e).replace('R$ ','')}`;if(p<1)requestAnimationFrame(frame)};requestAnimationFrame(frame);
  }

  function activeAppointments(){
    return (window.state?.agendamentos||[]).filter(a=>normStatus(a.status)!=='Excluído');
  }

  function recentAppointments(){
    return activeAppointments().filter(a=>['Confirmado','Concluído'].includes(normStatus(a.status))).slice().sort((a,b)=>{
      const ca=Date.parse(a.criado_em||'')||0,cb=Date.parse(b.criado_em||'')||0;
      if(ca!==cb)return cb-ca;
      return String(`${b.data||''} ${b.hora||''}`).localeCompare(String(`${a.data||''} ${a.hora||''}`));
    });
  }

  function nextAppointment(){
    const now=new Date();
    return activeAppointments()
      .filter(a=>normStatus(a.status)==='Confirmado'&&a.data)
      .map(a=>({a,when:new Date(`${a.data}T${String(a.hora||'00:00').slice(0,5)}:00`)}))
      .filter(x=>!Number.isNaN(x.when.getTime())&&x.when.getTime()>=now.getTime()-60000)
      .sort((x,y)=>x.when-y.when)[0]?.a||null;
  }

  function renderStatuses(){
    const map=[['vxPending','statPendentes'],['vxRefused','statRecusados'],['vxConfirmed','statConfirmados'],['vxFinished','statConcluidos']];
    map.forEach(([to,from])=>{const el=document.getElementById(to),src=document.getElementById(from);if(el&&src)el.textContent=src.textContent||'0'});
  }

  function renderNext(){
    const target=document.querySelector('.vx-next-body');if(!target)return;
    const a=nextAppointment();
    if(!a){target.innerHTML='<div class="vx-next-empty"><b>Nenhum atendimento confirmado</b><span>O próximo horário confirmado aparecerá aqui.</span></div>';return;}
    target.innerHTML=`<div class="vx-next-time"><strong>${esc(a.hora||'—')}</strong><span>${esc(fmtDate(a.data))}</span></div><div class="vx-next-copy"><b>${esc(a.cliente_nome||'Cliente')}</b><span>${esc(a.servico_nome||'Serviço')}</span></div><span class="vx-status-pill ${statusClass(a.status)}">${esc(normStatus(a.status))}</span>`;
  }

  function renderRecent(){
    const target=document.querySelector('.vx-recent-list');if(!target)return;
    const rows=recentAppointments();
    const pages=Math.max(1,Math.ceil(rows.length/RECENT_PAGE_SIZE));
    recentPage=Math.min(recentPage,pages-1);
    const pageRows=rows.slice(recentPage*RECENT_PAGE_SIZE,(recentPage+1)*RECENT_PAGE_SIZE);
    if(!pageRows.length){target.innerHTML='<div class="vx-mob-empty">Nenhum agendamento registrado ainda.</div>';}else{
      target.innerHTML=pageRows.map(a=>`<article class="vx-recent-item"><div class="vx-recent-top"><time>${esc(a.hora||'—')}</time><span class="vx-status-pill ${statusClass(a.status)}">${esc(normStatus(a.status))}</span></div><div class="vx-recent-line"><b>${esc(a.cliente_nome||'Cliente')}</b><small>CLIENTE</small></div><div class="vx-recent-line"><span>${esc(a.servico_nome||'Serviço')}</span><small>SERVIÇO</small></div><div class="vx-recent-date">${esc(fmtDate(a.data))}</div></article>`).join('');
    }
    const pager=document.querySelector('.vx-recent-pager');
    if(!pager)return;
    pager.hidden=rows.length<=RECENT_PAGE_SIZE;
    const prev=pager.querySelector('[data-recent-prev]'),next=pager.querySelector('[data-recent-next]'),label=pager.querySelector('[data-recent-page]');
    if(label)label.textContent=`${recentPage+1} / ${pages}`;
    if(prev)prev.disabled=recentPage===0;
    if(next)next.disabled=recentPage>=pages-1;
  }

  function sync(){
    const balance=document.querySelector('.vx-bank-value');if(!balance)return;
    animateBalance(balance,moneyNumber(document.getElementById('chartFatValue')?.textContent));
    const todaySrc=document.getElementById('statFatHoje');const today=document.getElementById('vxBankToday');if(today&&todaySrc)today.textContent=todaySrc.textContent||'R$ 0';
    const fin=activeAppointments().filter(a=>normStatus(a.status)==='Concluído');
    const total=fin.reduce((s,a)=>s+Number(a.valor||0),0);const ticket=fin.length?total/fin.length:0;const ticketEl=document.getElementById('vxBankTicket');if(ticketEl)ticketEl.textContent=money(ticket).replace(',00','');
    renderStatuses();renderNext();renderRecent();
    const name=document.getElementById('sideNome')?.textContent||window.state?.empresa?.nome||'Seu negócio';document.querySelector('.vx-mob-greeting b')?.replaceChildren(name);document.querySelector('.vx-mob-avatar')?.replaceChildren(name.trim()[0]?.toUpperCase()||'V');const company=window.state?.empresa?.nome||name;document.querySelector('.vx-mob-company')?.replaceChildren(company);
    updateFloatVisibility();
  }

  function go(fn){
    closeMenu();
    const publicView=document.getElementById('publicView'),dashboardView=document.getElementById('dashboardView');
    if(publicView)publicView.style.display='none';
    if(dashboardView)dashboardView.style.display='block';
    document.body.classList.remove('public-mode');
    if(location.hash.startsWith('#agendar/'))history.replaceState(null,'',location.pathname+location.search);
    window.unlockPublicModalScroll?.();
    fn();
    setTimeout(updateFloatVisibility,0);
  }

  function build(){
    if(!isMobile()||document.querySelector('.vx-mobile-home'))return;
    document.body.classList.add('vx-android-dashboard');
    const view=document.getElementById('view-dashboard');if(!view)return;
    const home=document.createElement('div');home.className='vx-mobile-home';home.innerHTML=`
      <header class="vx-mob-head"><div class="vx-mob-user"><div class="vx-mob-avatar">V</div><div class="vx-mob-greeting"><small>Bom dia</small><b>Seu negócio</b><em class="vx-mob-company">VYXORA</em></div></div><div class="vx-mob-head-actions"><button class="vx-mob-link" data-copy-link><i>⌁</i><span>LINK</span></button><button class="vx-mob-iconbtn" data-notifications aria-label="Notificações">♢<i class="vx-mob-dot"></i></button></div></header>
      <section class="vx-bank-card"><div class="vx-bank-top"><span class="vx-bank-label">Faturamento do período</span><span class="vx-bank-live" aria-label="Dados em tempo real"><i></i> AO VIVO</span></div><div class="vx-bank-value" data-value="0"><small>R$</small>0,00</div><div class="vx-bank-meta"><span>Hoje<b id="vxBankToday">R$ 0</b></span><span>Ticket médio<b id="vxBankTicket">R$ 0</b></span></div></section>
      <section class="vx-mob-section"><div class="vx-mob-section-head"><h2>Resumo dos agendamentos</h2><button data-reports>Ver relatório</button></div><div class="vx-status-grid"><article class="vx-status-card pending"><small>Pendentes</small><b id="vxPending">0</b></article><article class="vx-status-card refused"><small>Recusados</small><b id="vxRefused">0</b></article><article class="vx-status-card confirmed"><small>Confirmados</small><b id="vxConfirmed">0</b></article><article class="vx-status-card finished"><small>Concluídos</small><b id="vxFinished">0</b></article></div></section>
      <section class="vx-mob-section"><div class="vx-mob-section-head"><h2>Próximo atendimento</h2><button data-agenda>Ver agenda</button></div><div class="vx-next-card"><div class="vx-next-body"><div class="vx-mob-empty">Carregando…</div></div></div></section>
      <section class="vx-mob-section vx-recent-section"><div class="vx-mob-section-head"><h2>Agendamentos recentes</h2><span class="vx-section-note">Mais recentes</span></div><div class="vx-recent-list"><div class="vx-mob-empty">Carregando…</div></div><nav class="vx-recent-pager" hidden aria-label="Paginação dos agendamentos recentes"><button data-recent-prev>‹ Anterior</button><span data-recent-page>1 / 1</span><button data-recent-next>Próximo ›</button></nav></section>`;
    view.prepend(home);
    decorateViews();
    home.querySelectorAll('[data-agenda]').forEach(b=>b.addEventListener('click',()=>go(actions[0][2])));
    home.querySelector('[data-reports]')?.addEventListener('click',()=>go(actions[5][2]));
    home.querySelector('[data-notifications]')?.addEventListener('click',()=>window.openNotificationCenter?.());
    home.querySelector('[data-copy-link]')?.addEventListener('click',function(){window.copyPublicLink?.(this);this.classList.add('copied');this.querySelector('span').textContent='COPIADO';setTimeout(()=>{this.classList.remove('copied');this.querySelector('span').textContent='LINK'},1500)});
    home.querySelector('[data-recent-prev]')?.addEventListener('click',()=>{if(recentPage>0){recentPage--;renderRecent();home.querySelector('.vx-recent-section')?.scrollIntoView({behavior:'smooth',block:'start'})}});
    home.querySelector('[data-recent-next]')?.addEventListener('click',()=>{const pages=Math.ceil(recentAppointments().length/RECENT_PAGE_SIZE);if(recentPage<pages-1){recentPage++;renderRecent();home.querySelector('.vx-recent-section')?.scrollIntoView({behavior:'smooth',block:'start'})}});
    buildFloat();sync();setInterval(sync,1600);
  }

  function decorateViews(){Object.entries(viewMeta).forEach(([key,[title,subtitle,icon]])=>{const target=document.getElementById('view-'+key);if(!target||target.querySelector(':scope > .vx-mobile-view-head'))return;const head=document.createElement('header');head.className='vx-mobile-view-head';head.innerHTML=`<div><small>VYXORA · GESTÃO</small><h1>${title}</h1><p>${subtitle}</p></div><span class="vx-mobile-view-mark">${icon}</span>`;target.prepend(head)})}

  function buildFloat(){
    if(document.querySelector('.vx-float-launcher'))return;
    const backdrop=document.createElement('div');backdrop.className='vx-menu-backdrop';
    const panel=document.createElement('div');panel.className='vx-float-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Menu Vyxora');panel.innerHTML=`<div class="vx-float-handle" aria-hidden="true"></div><div class="vx-float-head"><div><strong>Menu Vyxora</strong><span>Acesso rápido</span></div><button class="vx-float-close" type="button" aria-label="Fechar menu">×</button></div><div class="vx-float-grid"><button class="vx-float-option vx-float-dashboard" data-dashboard-action><i>⌂</i><span>Dashboard</span></button>${actions.map((a,i)=>`<button class="vx-float-option" data-float-action="${i}"><i>${a[0]}</i><span>${a[1]}</span></button>`).join('')}</div>`;
    const launcher=document.createElement('button');launcher.className='vx-float-launcher';launcher.setAttribute('aria-label','Abrir menu Vyxora');launcher.setAttribute('aria-expanded','false');launcher.innerHTML='<i>＋</i>';
    document.body.append(backdrop,panel,launcher);
    launcher.addEventListener('click',toggleMenu);
    backdrop.addEventListener('click',closeMenu);
    panel.querySelector('.vx-float-close')?.addEventListener('click',closeMenu);
    panel.querySelector('[data-dashboard-action]')?.addEventListener('click',()=>go(()=>window.setView?.('dashboard')));
    panel.querySelectorAll('[data-float-action]').forEach(b=>b.addEventListener('click',()=>go(actions[Number(b.dataset.floatAction)][2])));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
    window.addEventListener('hashchange',()=>{closeMenu();updateFloatVisibility()});
    const observer=new MutationObserver(updateFloatVisibility);observer.observe(document.body,{attributes:true,attributeFilter:['class']});
    ['publicView','dashboardView'].forEach(id=>{const el=document.getElementById(id);if(el)observer.observe(el,{attributes:true,attributeFilter:['style','class']})});
    updateFloatVisibility();
  }

  function shouldShowFloat(){
    if(!isMobile()||!window.state?.user)return false;
    if(document.body.classList.contains('public-mode')||location.hash.startsWith('#agendar/'))return false;
    const publicView=document.getElementById('publicView');
    if(publicView&&getComputedStyle(publicView).display!=='none')return false;
    const dashboardView=document.getElementById('dashboardView');
    if(dashboardView&&getComputedStyle(dashboardView).display==='none')return false;
    return true;
  }
  function updateFloatVisibility(){
    const show=shouldShowFloat();
    document.querySelector('.vx-float-launcher')?.classList.toggle('is-visible',show);
    if(!show)closeMenu();
  }
  function toggleMenu(){
    if(!shouldShowFloat())return;
    const panel=document.querySelector('.vx-float-panel'),backdrop=document.querySelector('.vx-menu-backdrop'),launcher=document.querySelector('.vx-float-launcher');
    const open=!panel?.classList.contains('open');
    panel?.classList.toggle('open',open);backdrop?.classList.toggle('open',open);launcher?.classList.toggle('open',open);launcher?.setAttribute('aria-expanded',String(open));
  }
  function closeMenu(){document.querySelector('.vx-menu-backdrop')?.classList.remove('open');document.querySelector('.vx-float-panel')?.classList.remove('open');const launcher=document.querySelector('.vx-float-launcher');launcher?.classList.remove('open');launcher?.setAttribute('aria-expanded','false')}

  function preview(){if(!new URLSearchParams(location.search).has('mobile-preview'))return;setTimeout(()=>{document.getElementById('landingView')?.style.setProperty('display','none');document.getElementById('authOverlay')?.style.setProperty('display','none');document.getElementById('dashboardView')?.style.setProperty('display','block');document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='view-dashboard'));if(document.getElementById('chartFatValue'))document.getElementById('chartFatValue').textContent='R$ 8.742';sync()},400)}
  document.addEventListener('DOMContentLoaded',()=>{build();preview()});if(document.readyState!=='loading'){build();preview()}
})();
