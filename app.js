let state={
  user:null,empresa:null,perfil:null,categorias:[],
  clientes:[],servicos:[],profissionais:[],agendamentos:[],pagamentos:[],
  pubEmpresa:null,pubServico:null,pubProfissional:null,
  agendaFilter:"todos",notifCount:0
};

let agendaRealtimeChannel=null;
let realtimeReloadTimer=null;
let realtimeReady=false;
let autoSyncTimer=null;
let lastAgendaIds=new Set();
let autoSyncStarted=false;

function scheduleRealtimeReload(reason="Atualização"){
  if(realtimeReloadTimer)clearTimeout(realtimeReloadTimer);
  realtimeReloadTimer=setTimeout(async()=>{
    if(!state?.empresa?.id)return;
    try{await loadAll()}catch(e){console.error("Erro no realtime reload:",e)}
  },300);
}

function notifyRealtime(payload,tabela){
  const row=payload.new||payload.old||{};
  const ev=payload.eventType;
  if(tabela==="agenda_agendamentos"){
    const nome=row.cliente_nome||"Cliente";
    if(ev==="INSERT"){
      incrNotif();
      showNotif("Novo agendamento recebido!",`${nome} acabou de agendar.`,"new_ag",6000);
      scheduleRealtimeReload("novo agendamento");
      return;
    }
    if(ev==="UPDATE"){
      const status=normStatus(row.status);
      const typeMap={"Confirmado":"confirm","Recusado":"refuse","Reagendado":"reschedule","Concluído":"done","Excluído":"info"};
      showNotif("Agenda atualizada",`${nome} — ${status}.`,typeMap[status]||"info",4200);
      scheduleRealtimeReload("agendamento atualizado");
      return;
    }
    if(ev==="DELETE"){
      showNotif("Agenda atualizada","Um agendamento foi removido.","info",3500);
      scheduleRealtimeReload("agendamento removido");
      return;
    }
  }

  const nomes={
    agenda_clientes:"Clientes",
    agenda_servicos:"Serviços",
    agenda_profissionais:"Profissionais",
    agenda_pagamentos:"Financeiro",
    agenda_empresas:"Configurações"
  };
  if(nomes[tabela]){
    showNotif(`${nomes[tabela]} atualizado`,"Dados sincronizados automaticamente.","info",2800);
    scheduleRealtimeReload(tabela);
  }
}

function rememberCurrentAgendaIds(){
  lastAgendaIds=new Set((state.agendamentos||[]).map(a=>String(a.id)));
}

function startAutoSync(){
  if(autoSyncStarted)return;
  autoSyncStarted=true;

  if(autoSyncTimer)clearInterval(autoSyncTimer);

  rememberCurrentAgendaIds();

  autoSyncTimer=setInterval(async()=>{
    if(!state?.empresa?.id)return;

    try{
      const {data,error}=await db
        .from("agenda_agendamentos")
        .select("*")
        .eq("empresa_id",state.empresa.id)
        .order("data",{ascending:true})
        .order("hora",{ascending:true});

      if(error){
        console.error("AutoSync erro:",error);
        return;
      }

      const novos=(data||[]).filter(a=>!lastAgendaIds.has(String(a.id)));

      state.agendamentos=data||[];

      if(novos.length){
        novos.forEach(a=>{
          incrNotif();
          showNotif(
            "Novo agendamento recebido!",
            `${a.cliente_nome||"Cliente"} agendou ${a.servico_nome||"um serviço"}${a.hora?` às ${a.hora}`:""}.`,
            "new_ag",
            7000
          );
        });

        const [cli,pag]=await Promise.all([
          db.from("agenda_clientes").select("*").eq("empresa_id",state.empresa.id).order("criado_em",{ascending:false}),
          db.from("agenda_pagamentos").select("*").eq("empresa_id",state.empresa.id).order("criado_em",{ascending:false})
        ]);

        state.clientes=cli.data||state.clientes||[];
        state.pagamentos=pag.data||state.pagamentos||[];
      }

      rememberCurrentAgendaIds();
      renderAll();

    }catch(e){
      console.error("AutoSync falhou:",e);
    }
  },4000);
}

function normStatus(s){
  const raw=(s||"pendente").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  if(raw==="confirmado"||raw==="confirmada")return"Confirmado";
  if(raw==="pendente")return"Pendente";
  if(raw==="concluido"||raw==="concluida")return"Concluído";
  if(raw==="recusado"||raw==="recusada"||raw==="cancelado"||raw==="cancelada")return"Recusado";
  if(raw==="reagendado"||raw==="reagendada")return"Reagendado";
  if(raw==="excluido"||raw==="excluida")return"Excluído";
  return s||"Pendente";
}

const navItemsFlat=[
  ["dashboard","📊","Dashboard","Controle geral do negócio"],
  ["agenda","📅","Agenda","Criar e acompanhar horários"],
  ["clientes","👥","Clientes","Cadastro de clientes"],
  ["servicos","✦","Serviços","Catálogo e preços"],
  ["profissionais","👤","Profissionais","Equipe de atendimento"],
  ["financeiro","💰","Financeiro","Valores e resultados"],
  ["relatorios","📈","Relatórios","Dados e métricas"],
  ["config","⚙","Configurações","Dados do negócio"]
];

window.addEventListener("scroll",()=>{document.getElementById("navbar")?.classList.toggle("scrolled",scrollY>40)});
function scrollToId(id){document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"})}
function money(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
function slugify(s){return(s||"").toString().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").substring(0,60)}
function hojeISO(){return new Date().toISOString().slice(0,10)}
function mesPrefixo(){return new Date().toISOString().slice(0,7)}
function publicUrl(slug){return location.origin+location.pathname+"#agendar/"+slug}
function badgeClass(s){const n=normStatus(s);const m={"Confirmado":"ok","Pendente":"wait","Concluído":"done","Recusado":"off","Reagendado":"re","Excluído":"exc"};return m[n]||"wait"}
function initial(name){return(name||"?").trim().substring(0,1).toUpperCase()}
function formatDateBR(d){if(!d)return"—";const[y,m,dd]=d.split("-");return dd+"/"+m+"/"+y}
function buildWaLink(tel,msg){const n=(tel||"").replace(/\D/g,"");if(!n)return null;const f=n.startsWith("55")?n:"55"+n;return"https://wa.me/"+f+"?text="+encodeURIComponent(msg)}
function safeSetText(id,v){const el=document.getElementById(id);if(el)el.textContent=v}

function isStatusAtivoCliente(c){
  const st=(c?.status||"").toLowerCase().trim();
  if(st==="inativo"||st==="excluido"||st==="excluído")return false;
  if(c?.ativo===false)return false;
  return true;
}
function isStatusExcluido(s){
  return normStatus(s)==="Excluído";
}

function isStatusFinanceiro(a){
  if(normStatus(a.status)==="Concluído")return true;
  if(normStatus(a.status)==="Excluído"&&a.financeiro_status==="Concluído")return true;
  return false;
}

function getClienteStatusPayload(ativo=true){
  return{status:ativo?"ativo":"inativo"};
}
function agendamentoPodeTerAcoes(a){
  const s=normStatus(a.status);
  return!["Excluído","Recusado","Concluído"].includes(s);
}
function agendamentoPodeWhatsapp(a){
  const s=normStatus(a.status);
  return!["Excluído","Recusado"].includes(s);
}
function renderAcoesAgendamento(a){
  const tel=(a.cliente_telefone||a.telefone||"").replace(/\D/g,"");
  const s=normStatus(a.status);

  if(s==="Excluído"){
    return`<div class="apt-actions muted-actions"><span class="badge exc">🗑 Excluído</span></div>`;
  }

  if(s==="Recusado"){
    return`<div class="apt-actions muted-actions"><span class="badge off">✕ Recusado</span></div>`;
  }

  if(s==="Concluído"){
    return`<div class="apt-actions muted-actions">
      <span class="badge done">✓ Concluído</span>
      ${tel?`<button class="act-btn wa" onclick="abrirWhatsappPadrao('${a.id}')">💬 WA</button>`:""}
      <button class="act-btn refuse" onclick="excluirAgendamento('${a.id}')">🗑 Arquivar</button>
    </div>`;
  }

  return`<div class="apt-actions">
    ${s!=="Confirmado"?`<button class="act-btn confirm" onclick="confirmarAg('${a.id}')">✅ Confirmar</button>`:""}
    <button class="act-btn refuse" onclick="openModalRecusa('${a.id}')">✕ Recusar</button>
    <button class="act-btn reschedule" onclick="openModalReagendar('${a.id}')">📅 Reagendar</button>
    <button class="act-btn done" onclick="concluirAg('${a.id}')">✓ Concluir</button>
    ${tel?`<button class="act-btn wa" onclick="abrirWhatsappPadrao('${a.id}')">💬 WA</button>`:""}
  </div>`;
}

function showNotif(title,msg,type="gold",duration=5500){
  const stack=document.getElementById("liveNotifyStack");
  if(!stack){console.log("NOTIF:",title,msg,type);return;}
  const item=document.createElement("div");
  item.className="live-notify";
  const now=new Date();
  const timeStr=now.getHours().toString().padStart(2,"0")+":"+now.getMinutes().toString().padStart(2,"0");

  const iconMap={
    gold:"🔔",new_ag:"📅",confirm:"✅",refuse:"✕",reschedule:"📅",done:"🎯",login:"👋",error:"⚠️",info:"💬"
  };
  item.innerHTML=`
    <div class="ln-icon ${type}">${iconMap[type]||"🔔"}</div>
    <div class="ln-body">
      <div class="ln-title">${title}</div>
      ${msg?`<div class="ln-msg">${msg}</div>`:""}
      <div class="ln-time">${timeStr}</div>
    </div>
    <button class="ln-close" onclick="this.parentElement.remove()">✕</button>
  `;
  stack.prepend(item);
  while(stack.children.length>4)stack.lastChild.remove();
  setTimeout(()=>{
    item.classList.add("fade-out");
    setTimeout(()=>item.remove(),550);
  },duration);
}

function toast(msg,type="info"){
  const map={ok:"confirm",err:"error",warn:"reschedule",info:"info"};
  showNotif(msg,"",map[type]||"info",3500);
}

let notifCount=0;
function incrNotif(){
  notifCount++;
  const dot=document.getElementById("notifDot");
  if(dot)dot.classList.add("visible");
}
function clearNotifCount(){
  notifCount=0;
  const dot=document.getElementById("notifDot");
  if(dot)dot.classList.remove("visible");
}

let _openMenu=null;
function buildMenu(id,items){
  const wrap=document.createElement("div");wrap.className="action-menu-wrap";
  const btn=document.createElement("button");btn.className="action-menu-btn";btn.innerHTML="⋮";btn.title="Ações";
  const drop=document.createElement("div");drop.className="action-menu-dropdown";
  items.forEach(item=>{
    if(item==="sep"){const s=document.createElement("div");s.className="action-menu-sep";drop.appendChild(s);return}
    const el=document.createElement("button");
    el.className="action-menu-item"+(item.cls?" "+item.cls:"");
    el.innerHTML=`<span class="action-menu-icon">${item.icon}</span>${item.label}`;
    el.onclick=(e)=>{e.stopPropagation();closeAllMenus();item.action()};
    drop.appendChild(el);
  });
  btn.onclick=(e)=>{e.stopPropagation();if(_openMenu===drop){closeAllMenus();return}closeAllMenus();drop.classList.add("open");_openMenu=drop};
  wrap.appendChild(btn);wrap.appendChild(drop);return wrap;
}
function closeAllMenus(){document.querySelectorAll(".action-menu-dropdown.open").forEach(d=>d.classList.remove("open"));_openMenu=null}
document.addEventListener("click",closeAllMenus);

let _confirmCb=null;
function openConfirmModal({icon="⚠️",iconCls="danger",title="Tem certeza?",sub="Esta ação não pode ser desfeita.",btnLabel="Confirmar",btnStyle="danger",cb}){
  document.getElementById("confirmIcon").className="confirm-icon "+iconCls;
  document.getElementById("confirmIcon").textContent=icon;
  document.getElementById("confirmTitle").textContent=title;
  document.getElementById("confirmSub").textContent=sub;
  const btn=document.getElementById("confirmActionBtn");btn.textContent=btnLabel;
  if(btnStyle==="danger")btn.style.cssText="flex:1;background:rgba(240,109,122,.18);color:var(--red);box-shadow:none;border:1px solid rgba(240,109,122,.25)";
  else if(btnStyle==="primary")btn.style.cssText="flex:1;background:linear-gradient(135deg,var(--gold),var(--gold2));color:#060606;box-shadow:0 9px 32px rgba(201,169,110,.28)";
  else btn.style.cssText="flex:1";
  _confirmCb=cb;document.getElementById("confirmOverlay").classList.add("open");
}
function closeConfirmModal(){document.getElementById("confirmOverlay").classList.remove("open");_confirmCb=null}
document.getElementById("confirmActionBtn").onclick=()=>{if(_confirmCb)_confirmCb();closeConfirmModal()};
document.getElementById("confirmOverlay").addEventListener("click",e=>{if(e.target===document.getElementById("confirmOverlay"))closeConfirmModal()});

let _editSaveCb=null;
function openEditModal(title,bodyHtml,saveCb){
  document.getElementById("editModalTitle").textContent=title;
  document.getElementById("editModalBody").innerHTML=bodyHtml;
  _editSaveCb=saveCb;
  document.getElementById("editModalSaveBtn").onclick=()=>{if(_editSaveCb)_editSaveCb()};
  document.getElementById("editOverlay").classList.add("open");
}
function closeEditModal(){document.getElementById("editOverlay").classList.remove("open");_editSaveCb=null}
document.getElementById("editOverlay").addEventListener("click",e=>{if(e.target===document.getElementById("editOverlay"))closeEditModal()});

function openAuth(mode){document.getElementById("authOverlay").classList.add("open");document.body.style.overflow="hidden";if(mode==="login")showLoginOnly();else showCadastro()}
function closeAuth(){document.getElementById("authOverlay").classList.remove("open");document.body.style.overflow=""}
document.getElementById("authOverlay").addEventListener("click",e=>{if(e.target===document.getElementById("authOverlay"))closeAuth()});
document.getElementById("modalRecusa").addEventListener("click",e=>{if(e.target===document.getElementById("modalRecusa"))closeModalRecusa()});
document.getElementById("modalReagendar").addEventListener("click",e=>{if(e.target===document.getElementById("modalReagendar"))closeModalReagendar()});

window.addEventListener("load",init);
async function init(){
  buildMobileNav();
  const publicSlug=getPublicSlug();
  if(publicSlug){await loadPublic(publicSlug);return}
  await loadCategorias();
  const{data:{session}}=await db.auth.getSession();
  if(session&&session.user){
    const ok=await carregarContaAutenticada(session.user);
    if(ok)return;
    await db.auth.signOut();
  }
}

async function carregarContaAutenticada(user){
  const{data:perfil,error:perfilErr}=await db.from("agenda_perfis").select("*").eq("auth_user_id",user.id).single();
  if(perfilErr||!perfil)return false;
  const{data:empresa,error:empErr}=await db.from("agenda_empresas").select("*").eq("id",perfil.empresa_id).single();
  if(empErr||!empresa)return false;
  state.user=user;state.perfil=perfil;state.empresa=empresa;
  showDashboard();await loadAll();
  return true;
}

function getPublicSlug(){
  if(location.hash.startsWith("#agendar/"))return location.hash.replace("#agendar/","").trim();
  const parts=location.pathname.split("/").filter(Boolean);const idx=parts.indexOf("agendar");
  if(idx>=0&&parts[idx+1])return parts[idx+1];return null;
}

async function loadCategorias(){
  const{data}=await db.from("agenda_categorias").select("*").order("nome");
  state.categorias=data||[];
  const sel=document.getElementById("empCategoria");
  if(sel)sel.innerHTML=state.categorias.map(c=>`<option value="${c.id}" data-nome="${c.nome}">${c.icone||""} ${c.nome}</option>`).join("");
}

function buildMobileNav(){
  const el=document.getElementById("mobileNav");
  if(!el)return;
  el.innerHTML=`
    <button class="nav-btn" onclick="setView('dashboard')"><span class="n-icon">📊</span>Início</button>
    <button class="nav-btn" onclick="setView('agenda')"><span class="n-icon">📅</span>Agenda</button>
    <button class="nav-btn nav-fab" onclick="setView('agenda');setTimeout(()=>document.getElementById('agCliente')?.focus(),200)"><span class="n-icon">+</span>Novo</button>
    <button class="nav-btn" onclick="setView('clientes')"><span class="n-icon">👥</span>Clientes</button>
    <button class="nav-btn" onclick="setView('config')"><span class="n-icon">⚙</span>Config</button>
  `;
}

function showDashboard(){
  document.getElementById("landingView").style.display="none";
  document.getElementById("dashboardView").style.display="block";
  document.getElementById("publicView").style.display="none";
  closeAuth();
  safeSetText("sideEmpresa",state.empresa.nome);
  safeSetText("sideArea",state.empresa.area_atuacao||state.empresa.plano||"Premium");
  safeSetText("avatarLetter",initial(state.empresa.nome));
  const lb=document.getElementById("publicLinkBox");
  if(lb)lb.textContent=publicUrl(state.empresa.slug);
  document.body.style.overflow="";
  setActiveNavBtn("dashboard");
  setupRealtime();
  startAutoSync();
}

function showLoginOnly(){["stepConta","stepNegocio","stepServico"].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display="none"});document.getElementById("onboardingStepper").style.display="none";document.getElementById("loginOnly").style.display="block";document.getElementById("formCadastro").style.display="none"}
function showCadastro(){document.getElementById("loginOnly").style.display="none";document.getElementById("formCadastro").style.display="block";document.getElementById("onboardingStepper").style.display="flex";document.getElementById("stepConta").style.display="block";document.getElementById("stepNegocio").style.display="none";document.getElementById("stepServico").style.display="none";setStep(1)}
function setStep(n){["st1","st2","st3"].forEach((id,i)=>{const el=document.getElementById(id);if(el)el.className="step-dot"+(i+1===n?" active":i+1<n?" done":"")})}
function goStepNegocio(){if(!cadNome.value||!cadEmail.value||!cadSenha.value)return toast("Preencha nome, e-mail e senha.","err");if(cadSenha.value.length<6)return toast("Senha mínimo 6 caracteres.","err");stepConta.style.display="none";stepNegocio.style.display="block";setStep(2)}
function backStepConta(){stepNegocio.style.display="none";stepConta.style.display="block";setStep(1)}
function goStepServico(){if(!empNome.value||!empSlug.value||!empWhatsapp.value)return toast("Preencha nome, WhatsApp e link.","err");stepNegocio.style.display="none";stepServico.style.display="block";setStep(3)}
function backStepNegocio(){stepServico.style.display="none";stepNegocio.style.display="block";setStep(2)}
function autoSlug(){const el=document.getElementById("empSlug");if(!el||el.dataset.manual==="1")return;el.value=slugify(empNome.value)}
document.addEventListener("input",e=>{if(e.target&&e.target.id==="empSlug")e.target.dataset.manual="1"});

async function finalizarCadastro(){
  if(!servNome.value||!servPreco.value||!servDuracao.value||!profNome.value)return toast("Preencha serviço, preço, duração e profissional.","err");
  if(!cadEmail.value||!cadSenha.value)return toast("Preencha e-mail e senha.","err");
  if(cadSenha.value.length<6)return toast("A senha precisa ter no mínimo 6 caracteres.","err");
  const email=cadEmail.value.trim(),senha=cadSenha.value.trim(),nomeUser=cadNome.value.trim();
  const{data:authData,error:authErr}=await db.auth.signUp({email,password:senha});
  if(authErr||!authData.user){console.error(authErr);return toast(authErr?.message||"Erro ao criar conta.","err")}
  const user=authData.user;
  const categoriaId=empCategoria.value||null;
  const categoriaNome=empCategoria.options[empCategoria.selectedIndex]?.textContent?.replace(/^[^\wÀ-ÿ]+/,"").trim()||"Outro";
  const{data:empresa,error:errEmp}=await db.from("agenda_empresas").insert({nome:empNome.value.trim(),slug:slugify(empSlug.value),categoria_id:categoriaId,area_atuacao:categoriaNome,whatsapp:empWhatsapp.value.trim(),email,plano:"Grátis",onboarding_finalizado:true}).select("*").single();
  if(errEmp){console.error(errEmp);await db.auth.signOut();return toast("Erro ao criar empresa.","err")}
  const{error:perfilErr}=await db.from("agenda_perfis").insert({auth_user_id:user.id,empresa_id:empresa.id,nome:nomeUser,email,whatsapp:empWhatsapp.value.trim(),cargo:"Administrador"});
  if(perfilErr){console.error(perfilErr);await db.auth.signOut();return toast("Conta criada, mas o perfil não foi salvo.","err")}
  await db.from("agenda_onboarding").insert({empresa_id:empresa.id,etapa_atual:3,conta_ok:true,negocio_ok:true,servicos_ok:true,finalizado:true});
  await db.from("agenda_servicos").insert({empresa_id:empresa.id,nome:servNome.value.trim(),descricao:"Serviço inicial.",preco:Number(servPreco.value||0),duracao_minutos:Number(servDuracao.value||60),status:"ativo"});
  await db.from("agenda_profissionais").insert({empresa_id:empresa.id,nome:profNome.value.trim(),especialidade:profEspecialidade.value||"Profissional",telefone:empWhatsapp.value.trim(),status:"ativo"});
  state.user=user;state.perfil={auth_user_id:user.id,empresa_id:empresa.id,nome:nomeUser,email};state.empresa=empresa;
  showDashboard();await loadAll();
  showNotif("Bem-vindo ao AgendaPro!","Painel criado com sucesso. Guarde seu e-mail e senha.","login",6000);
}

async function loginComSenha(){
  const email=(document.getElementById("loginEmail")?.value||"").trim();
  const senha=(document.getElementById("loginSenha")?.value||"").trim();
  if(!email||!senha)return toast("Digite e-mail e senha.","err");
  const{data,error}=await db.auth.signInWithPassword({email,password:senha});
  if(error||!data.user){console.error(error);return toast("E-mail ou senha incorretos.","err")}
  const ok=await carregarContaAutenticada(data.user);
  if(!ok){await db.auth.signOut();return toast("Perfil ou empresa não encontrados.","err")}
  showNotif("Login realizado!",`Bem-vindo de volta ao painel.`,"login",4000);
}

function setActiveNavBtn(view){
  document.querySelectorAll(".nav-btn").forEach(b=>{
    const onclick=b.getAttribute("onclick")||"";
    b.classList.toggle("active",onclick===`setView('${view}')`);
  });
}
function setView(view){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  const target=document.getElementById("view-"+view);if(target)target.classList.add("active");
  setActiveNavBtn(view);
  const item=navItemsFlat.find(i=>i[0]===view);
  if(item){safeSetText("pageTitle",item[2]);safeSetText("pageSub",item[3])}
}

function setupRealtime(){
  if(!state?.empresa?.id||!db?.channel)return;

  if(agendaRealtimeChannel){
    try{db.removeChannel(agendaRealtimeChannel)}catch(e){}
    agendaRealtimeChannel=null;
    realtimeReady=false;
  }

  const empresaId=state.empresa.id;
  const tables=[
    "agenda_agendamentos",
    "agenda_clientes",
    "agenda_servicos",
    "agenda_profissionais",
    "agenda_pagamentos",
    "agenda_empresas"
  ];

  let channel=db.channel("agendapro-realtime-"+empresaId,{
    config:{broadcast:{self:false},presence:{key:empresaId}}
  });

  tables.forEach(table=>{
    const filter=table==="agenda_empresas"?"id=eq."+empresaId:"empresa_id=eq."+empresaId;
    channel=channel.on(
      "postgres_changes",
      {event:"*",schema:"public",table,filter},
      payload=>{
        notifyRealtime(payload,table);
      }
    );
  });

  agendaRealtimeChannel=channel.subscribe((status,err)=>{
    if(status==="SUBSCRIBED"&&!realtimeReady){
      realtimeReady=true;
      console.log("✅ Realtime ativo para empresa:",empresaId);
    }
    if(status==="CHANNEL_ERROR"){
      console.warn("⚠️ Realtime com erro:",err);
      showNotif("Realtime precisa de atenção","Ative Realtime/Replication nas tabelas do Supabase.","error",7000);
    }
    if(status==="TIMED_OUT"){
      console.warn("⚠️ Realtime timeout. Tentando reconectar...");
      setTimeout(()=>setupRealtime(),3000);
    }
    if(status==="CLOSED"){
      realtimeReady=false;
    }
  });
}

async function loadAll(){
  if(!state.empresa)return;
  const id=state.empresa.id;
  const[cli,svc,prof,ag,pag]=await Promise.all([
    db.from("agenda_clientes").select("*").eq("empresa_id",id).order("criado_em",{ascending:false}),
    db.from("agenda_servicos").select("*").eq("empresa_id",id).order("criado_em",{ascending:false}),
    db.from("agenda_profissionais").select("*").eq("empresa_id",id).order("criado_em",{ascending:false}),
    db.from("agenda_agendamentos").select("*").eq("empresa_id",id).order("data",{ascending:true}).order("hora",{ascending:true}),
    db.from("agenda_pagamentos").select("*").eq("empresa_id",id).order("criado_em",{ascending:false})
  ]);
  state.clientes=cli.data||[];state.servicos=svc.data||[];
  state.profissionais=prof.data||[];state.agendamentos=ag.data||[];state.pagamentos=pag.data||[];
  rememberCurrentAgendaIds();
  renderAll();
}

function renderAll(){renderStats();renderDashboardLists();renderCalendar();renderSelects();renderAgendaTimeline();renderClienteCards();renderServicosCards();renderProfCards();renderFinanceiro();renderConfig()}

function renderStats(){
  const hoje=hojeISO(),mes=mesPrefixo(),ags=state.agendamentos||[];

  const ativos=ags.filter(a=>!isStatusExcluido(a.status));
  const concluidos=ags.filter(a=>isStatusFinanceiro(a));

  const st=s=>ags.filter(a=>normStatus(a.status)===s).length;
  const stAtivo=s=>ativos.filter(a=>normStatus(a.status)===s).length;

  const agHoje=ativos.filter(a=>a.data===hoje).length;
  const pendentes=stAtivo("Pendente"),confirmados=stAtivo("Confirmado"),reagendados=stAtivo("Reagendado");
  const concluidosCount=stAtivo("Concluído"),recusados=stAtivo("Recusado"),excluidos=st("Excluído");

  const totalAtivos=ativos.length;
  const baseTaxa=ativos.filter(a=>normStatus(a.status)!=="Recusado").length;
  const taxa=baseTaxa>0?Math.round(concluidosCount/baseTaxa*100):0;

  const fatHoje=concluidos.filter(a=>a.data===hoje).reduce((s,a)=>s+Number(a.valor||0),0);
  const fatMes=concluidos.filter(a=>a.data&&a.data.startsWith(mes)).reduce((s,a)=>s+Number(a.valor||0),0);

  safeSetText("statHoje",agHoje);safeSetText("statPendentes",pendentes);safeSetText("statConfirmados",confirmados);
  safeSetText("statReagendados",reagendados);safeSetText("statConcluidos",concluidosCount);safeSetText("statRecusados",recusados);
  safeSetText("statExcluidos",excluidos);safeSetText("statTaxaConf",taxa+"%");
  safeSetText("statFatHoje",money(fatHoje).replace(",00",""));safeSetText("statFatMes",money(fatMes).replace(",00",""));
  safeSetText("statClientes",(state.clientes||[]).filter(isStatusAtivoCliente).length);
  safeSetText("statServicos",(state.servicos||[]).filter(s=>s.status==="ativo").length);
  safeSetText("statProfissionais",(state.profissionais||[]).filter(p=>p.status==="ativo").length);
  safeSetText("statTotal",totalAtivos);

  safeSetText("fc-todos",totalAtivos);
  safeSetText("fc-pendente",pendentes);
  safeSetText("fc-confirmado",confirmados);
  safeSetText("fc-reagendado",reagendados);
  safeSetText("fc-concluido",concluidosCount);
  safeSetText("fc-recusado",recusados);
  safeSetText("fc-excluido",excluidos);
}

function renderDashboardLists(){
  const visíveis=state.agendamentos.filter(a=>{const s=normStatus(a.status);return s==="Pendente"||s==="Confirmado"||s==="Reagendado"}).slice(0,6);
  const el=document.getElementById("dashAppointments");
  if(!el)return;
  if(!visíveis.length){el.innerHTML=`<div class="empty-state"><div class="es-icon">📅</div><p>Nenhum agendamento pendente ou confirmado.</p></div>`;return}
  el.innerHTML=visíveis.map(a=>{
    const tel=(a.cliente_telefone||a.telefone||"").replace(/\D/g,"");
    return`<div class="apt-card" style="flex-direction:column;align-items:stretch;gap:0">
      <div style="display:flex;align-items:center;gap:11px">
        <div class="apt-avatar">${initial(a.cliente_nome)}</div>
        <div style="flex:1;min-width:0">
          <div class="apt-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.cliente_nome||"Cliente"}</div>
          <div class="apt-meta">${a.servico_nome||"—"} · ${a.profissional_nome||"—"}</div>
          <div class="apt-meta" style="margin-top:1px">📅 ${formatDateBR(a.data)} às ${a.hora||""}</div>
        </div>
        <span class="badge ${badgeClass(a.status)}">${normStatus(a.status)}</span>
      </div>
${renderAcoesAgendamento(a)}
    </div>`}).join("");
}

function renderCalendar(){
  const days=["S","T","Q","Q","S","S","D"];
  const busy=new Set(state.agendamentos.filter(a=>normStatus(a.status)!=="Excluído").map(a=>String(new Date(a.data+"T00:00:00").getDate())));
  let html=days.map(d=>`<div class="cal-label">${d}</div>`).join("");
  const today=String(new Date().getDate());
  for(let i=1;i<=28;i++){const d=String(i);html+=`<div class="cal-day${busy.has(d)?" busy":""}${d===today?" today":""}">${i}</div>`}
  const el=document.getElementById("calendarBox");if(el)el.innerHTML=html;
}

function renderSelects(){
  const agS=document.getElementById("agServico");
  if(agS)agS.innerHTML=`<option value="">Selecione serviço</option>`+state.servicos.filter(s=>s.status==="ativo").map(s=>`<option value="${s.id}">${s.nome} — ${money(s.preco)}</option>`).join("");
  const agP=document.getElementById("agProfissional");
  if(agP)agP.innerHTML=`<option value="">Selecione profissional</option>`+state.profissionais.filter(p=>p.status==="ativo").map(p=>`<option value="${p.id}">${p.nome}</option>`).join("");
}

let _agendaFilter="todos";
function setAgendaFilter(filter,btn){
  _agendaFilter=filter;
  document.querySelectorAll(".af-btn").forEach(b=>b.classList.remove("active"));
  if(btn)btn.classList.add("active");
  renderAgendaTimeline();
}

function renderAgendaTimeline(){
  const el=document.getElementById("agendaTimeline");if(!el)return;
  if(!state.agendamentos.length){el.innerHTML=`<div class="empty-state"><div class="es-icon">📅</div><p>Nenhum agendamento ainda.</p></div>`;return}
  let filtered=state.agendamentos.filter(a=>_agendaFilter==="excluido"||normStatus(a.status)!=="Excluído");
  if(_agendaFilter!=="todos"){
    const map={pendente:"Pendente",confirmado:"Confirmado",reagendado:"Reagendado",concluido:"Concluído",recusado:"Recusado",excluido:"Excluído"};
    const target=map[_agendaFilter]||"Pendente";
    filtered=state.agendamentos.filter(a=>normStatus(a.status)===target);
  }
  if(!filtered.length){el.innerHTML=`<div class="empty-state"><div class="es-icon">📅</div><p>Nenhum agendamento neste status.</p></div>`;return}
  el.innerHTML="";
  filtered.forEach(a=>{
    const block=document.createElement("div");block.className="tl-block";block.id="ag-"+a.id;
    const tel=(a.cliente_telefone||a.telefone||"").replace(/\D/g,"");
    block.innerHTML=`
      <div class="tl-timestamp">${a.hora||"—"}</div>
      <div class="tl-line"></div>
      <div class="tl-content">
        <div class="tl-apt">
          <div class="tl-apt-main">
            <div class="apt-avatar" style="width:34px;height:34px;border-radius:10px;font-size:13px;flex-shrink:0">${initial(a.cliente_nome)}</div>
            <div class="tl-apt-info">
              <div class="apt-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.cliente_nome||"Cliente"}</div>
              <div class="apt-meta">${a.servico_nome||"—"} · ${a.profissional_nome||"—"}</div>
              <div class="apt-meta" style="margin-top:1px">📅 ${formatDateBR(a.data)}${a.cliente_telefone?` · 📱 ${a.cliente_telefone}`:""}</div>
            </div>
            <div class="tl-apt-status"><span class="badge ${badgeClass(a.status)}">${normStatus(a.status)}</span></div>
          </div>
${renderAcoesAgendamento(a)}
        </div>
      </div>`;
    const tlapt=block.querySelector(".tl-apt");
    const menu=buildMenu(a.id,[
      {icon:"✏️",label:"Editar",action:()=>editAgendamento(a.id)},
      {icon:"📋",label:"Duplicar",action:()=>duplicarAgendamento(a.id)},
      "sep",
      {icon:"🗑",label:"Excluir",cls:"danger",action:()=>excluirAgendamento(a.id)}
    ]);
    tlapt.appendChild(menu);
    el.appendChild(block);
  });
}

function renderClienteCards(){
  const el=document.getElementById("clientesCards");if(!el)return;
  if(!state.clientes.length){el.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><div class="es-icon">👥</div><p>Nenhum cliente ainda.</p></div>`;return}
  el.innerHTML="";
  state.clientes.forEach(c=>{
    const agts=state.agendamentos.filter(a=>a.cliente_nome===c.nome&&normStatus(a.status)!=="Excluído").length;
    const gasto=state.agendamentos.filter(a=>a.cliente_nome===c.nome&&isStatusFinanceiro(a)).reduce((s,a)=>s+Number(a.valor||0),0);
    const isAtivo=isStatusAtivoCliente(c);
    const card=document.createElement("div");
    card.className="client-card"+(isAtivo?"":" inactive-item");
    card.innerHTML=`
      <div class="cc-top">
        <div class="cc-avatar">${initial(c.nome)}</div>
        <div><div class="cc-name">${c.nome}</div><div class="cc-phone">${c.telefone||"—"}</div></div>
      </div>
      ${c.email?`<div style="font-size:11.5px;color:var(--muted);margin-bottom:7px">✉ ${c.email}</div>`:""}
      <div style="margin-bottom:8px"><span class="badge ${isAtivo?"ok":"inactive"}">${isAtivo?"Ativo":"Inativo"}</span></div>
      <div class="cc-stats">
        <div class="cc-stat"><div class="csl">Atendimentos</div><div class="csv">${agts}</div></div>
        <div class="cc-stat"><div class="csl">Total gasto</div><div class="csv" style="font-size:13px">${money(gasto).replace(",00","")}</div></div>
      </div>`;
    const menu=buildMenu(c.id,[
      {icon:"✏️",label:"Editar",action:()=>editCliente(c.id)},
      {icon:"📋",label:"Duplicar",action:()=>duplicarCliente(c.id)},
      "sep",
      isAtivo?{icon:"⏸",label:"Desativar",cls:"toggle-off",action:()=>toggleCliente(c.id,false)}:{icon:"▶️",label:"Ativar",cls:"toggle-on",action:()=>toggleCliente(c.id,true)},
      {icon:"🗑",label:"Excluir",cls:"danger",action:()=>excluirCliente(c.id)}
    ]);
    card.appendChild(menu);el.appendChild(card);
  });
}

function renderServicosCards(){
  const el=document.getElementById("servicosCards");if(!el)return;
  const servicosVisiveis=state.servicos.filter(s=>s.status!=="excluido");
  if(!servicosVisiveis.length){el.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><div class="es-icon">✦</div><p>Nenhum serviço ainda.</p></div>`;return}
  el.innerHTML="";
  servicosVisiveis.forEach(s=>{
    const isAtivo=s.status==="ativo";
    const card=document.createElement("div");
    card.className="svc-card"+(isAtivo?"":" inactive-item");
    card.innerHTML=`
      <div class="svc-price">${money(s.preco).replace(",00","")}</div>
      <div class="svc-name">${s.nome}</div>
      <div class="svc-dur">⏱ ${s.duracao_minutos||60} min</div>
      <div class="svc-status"><span class="badge ${isAtivo?"ok":"inactive"}">${isAtivo?"Ativo":"Inativo"}</span></div>`;
    const menu=buildMenu(s.id,[
      {icon:"✏️",label:"Editar",action:()=>editServico(s.id)},
      {icon:"📋",label:"Duplicar",action:()=>duplicarServico(s.id)},
      "sep",
      isAtivo?{icon:"⏸",label:"Desativar",cls:"toggle-off",action:()=>toggleServico(s.id,"inativo")}:{icon:"▶️",label:"Ativar",cls:"toggle-on",action:()=>toggleServico(s.id,"ativo")},
      {icon:"🗑",label:"Excluir",cls:"danger",action:()=>excluirServico(s.id)}
    ]);
    card.appendChild(menu);el.appendChild(card);
  });
}

function renderProfCards(){
  const el=document.getElementById("profCards");if(!el)return;
  const profVisiveis=state.profissionais.filter(p=>p.status!=="excluido");
  if(!profVisiveis.length){el.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><div class="es-icon">👤</div><p>Nenhum profissional ainda.</p></div>`;return}
  el.innerHTML="";
  profVisiveis.forEach(p=>{
    const isAtivo=p.status==="ativo";
    const card=document.createElement("div");
    card.className="prof-card"+(isAtivo?"":" inactive-item");
    card.innerHTML=`
      <div class="prof-avatar">${initial(p.nome)}</div>
      <div class="prof-name">${p.nome}</div>
      <div class="prof-esp">${p.especialidade||"Profissional"}</div>
      ${p.telefone?`<div style="font-size:11.5px;color:var(--muted);margin-top:4px">📱 ${p.telefone}</div>`:""}
      <div class="prof-status" style="margin-top:9px"><span class="status-dot ${isAtivo?"":"off"}">${isAtivo?"Online":"Offline"}</span></div>`;
    const menu=buildMenu(p.id,[
      {icon:"✏️",label:"Editar",action:()=>editProfissional(p.id)},
      {icon:"📋",label:"Duplicar",action:()=>duplicarProfissional(p.id)},
      "sep",
      isAtivo?{icon:"⏸",label:"Desativar",cls:"toggle-off",action:()=>toggleProfissional(p.id,"inativo")}:{icon:"▶️",label:"Ativar",cls:"toggle-on",action:()=>toggleProfissional(p.id,"ativo")},
      {icon:"🗑",label:"Excluir",cls:"danger",action:()=>excluirProfissional(p.id)}
    ]);
    card.appendChild(menu);el.appendChild(card);
  });
}

function editServico(id){
  const s=state.servicos.find(x=>x.id===id);if(!s)return;
  openEditModal("Editar Serviço",`
    <div class="field"><label>Nome</label><input id="ed_svc_nome" value="${s.nome||""}"></div>
    <div class="field-grid">
      <div class="field"><label>Preço (R$)</label><input id="ed_svc_preco" type="number" value="${s.preco||0}"></div>
      <div class="field"><label>Duração (min)</label><input id="ed_svc_dur" type="number" value="${s.duracao_minutos||60}"></div>
    </div>`,async()=>{
    const nome=document.getElementById("ed_svc_nome").value.trim();
    if(!nome)return toast("Preencha o nome.","err");
    const{error}=await db.from("agenda_servicos").update({nome,preco:Number(document.getElementById("ed_svc_preco").value||0),duracao_minutos:Number(document.getElementById("ed_svc_dur").value||60)}).eq("id",id);
    if(error)return toast("Erro ao salvar.","err");
    closeEditModal();await loadAll();showNotif("Serviço atualizado","As alterações foram salvas com sucesso.","confirm");
  });
}
function editProfissional(id){
  const p=state.profissionais.find(x=>x.id===id);if(!p)return;
  openEditModal("Editar Profissional",`
    <div class="field"><label>Nome</label><input id="ed_pro_nome" value="${p.nome||""}"></div>
    <div class="field"><label>Especialidade</label><input id="ed_pro_esp" value="${p.especialidade||""}"></div>
    <div class="field"><label>Telefone</label><input id="ed_pro_tel" value="${p.telefone||""}"></div>`,async()=>{
    const nome=document.getElementById("ed_pro_nome").value.trim();
    if(!nome)return toast("Preencha o nome.","err");
    const{error}=await db.from("agenda_profissionais").update({nome,especialidade:document.getElementById("ed_pro_esp").value.trim(),telefone:document.getElementById("ed_pro_tel").value.trim()}).eq("id",id);
    if(error)return toast("Erro ao salvar.","err");
    closeEditModal();await loadAll();showNotif("Profissional atualizado","","confirm");
  });
}
function editCliente(id){
  const c=state.clientes.find(x=>x.id===id);if(!c)return;
  openEditModal("Editar Cliente",`
    <div class="field"><label>Nome</label><input id="ed_cli_nome" value="${c.nome||""}"></div>
    <div class="field"><label>Telefone</label><input id="ed_cli_tel" value="${c.telefone||""}"></div>
    <div class="field"><label>E-mail</label><input id="ed_cli_email" value="${c.email||""}"></div>`,async()=>{
    const nome=document.getElementById("ed_cli_nome").value.trim();
    if(!nome)return toast("Preencha o nome.","err");
    const{error}=await db.from("agenda_clientes").update({nome,telefone:document.getElementById("ed_cli_tel").value.trim(),email:document.getElementById("ed_cli_email").value.trim()}).eq("id",id);
    if(error)return toast("Erro ao salvar.","err");
    closeEditModal();await loadAll();showNotif("Cliente atualizado","","confirm");
  });
}
function editAgendamento(id){
  const a=state.agendamentos.find(x=>x.id===id);if(!a)return;
  const svcopts=state.servicos.filter(s=>s.status==="ativo").map(s=>`<option value="${s.id}"${s.id===a.servico_id?" selected":""}>${s.nome}</option>`).join("");
  const profopts=state.profissionais.filter(p=>p.status==="ativo").map(p=>`<option value="${p.id}"${p.id===a.profissional_id?" selected":""}>${p.nome}</option>`).join("");
  openEditModal("Editar Agendamento",`
    <div class="field"><label>Cliente</label><input id="ed_ag_cli" value="${a.cliente_nome||""}"></div>
    <div class="field"><label>Telefone</label><input id="ed_ag_tel" value="${a.cliente_telefone||""}"></div>
    <div class="field"><label>Serviço</label><select id="ed_ag_svc">${svcopts}</select></div>
    <div class="field"><label>Profissional</label><select id="ed_ag_prof">${profopts}</select></div>
    <div class="field-grid">
      <div class="field"><label>Data</label><input id="ed_ag_data" type="date" value="${a.data||""}"></div>
      <div class="field"><label>Hora</label><input id="ed_ag_hora" type="time" value="${a.hora||""}"></div>
    </div>
    <div class="field"><label>Status</label><select id="ed_ag_status">
      <option${normStatus(a.status)==="Confirmado"?" selected":""}>Confirmado</option>
      <option${normStatus(a.status)==="Pendente"?" selected":""}>Pendente</option>
      <option${normStatus(a.status)==="Reagendado"?" selected":""}>Reagendado</option>
      <option${normStatus(a.status)==="Concluído"?" selected":""}>Concluído</option>
      <option${normStatus(a.status)==="Recusado"?" selected":""}>Recusado</option>
      <option${normStatus(a.status)==="Excluído"?" selected":""}>Excluído</option>
    </select></div>`,async()=>{
    const cli=document.getElementById("ed_ag_cli").value.trim();
    const tel=document.getElementById("ed_ag_tel").value.trim();
    const svcId=document.getElementById("ed_ag_svc").value;
    const profId=document.getElementById("ed_ag_prof").value;
    const data=document.getElementById("ed_ag_data").value;
    const hora=document.getElementById("ed_ag_hora").value;
    const status=document.getElementById("ed_ag_status").value;
    if(!cli||!data||!hora)return toast("Preencha cliente, data e hora.","err");
    const serv=state.servicos.find(s=>s.id===svcId);const prof=state.profissionais.find(p=>p.id===profId);
    const{error}=await db.from("agenda_agendamentos").update({cliente_nome:cli,cliente_telefone:tel,servico_id:svcId||null,profissional_id:profId||null,servico_nome:serv?.nome||a.servico_nome,profissional_nome:prof?.nome||a.profissional_nome,data,hora,status,valor:Number(serv?.preco||a.valor||0)}).eq("id",id);
    if(error)return toast("Erro ao salvar.","err");
    closeEditModal();await loadAll();showNotif("Agendamento atualizado","","confirm");
  });
}

async function duplicarServico(id){const s=state.servicos.find(x=>x.id===id);if(!s)return;const{error}=await db.from("agenda_servicos").insert({empresa_id:state.empresa.id,nome:s.nome+" (cópia)",preco:s.preco,duracao_minutos:s.duracao_minutos,status:"ativo",descricao:s.descricao||""});if(error)return toast("Erro.","err");await loadAll();showNotif("Serviço duplicado","","info")}
async function duplicarProfissional(id){const p=state.profissionais.find(x=>x.id===id);if(!p)return;const{error}=await db.from("agenda_profissionais").insert({empresa_id:state.empresa.id,nome:p.nome+" (cópia)",especialidade:p.especialidade,telefone:p.telefone,status:"ativo"});if(error)return toast("Erro.","err");await loadAll();showNotif("Profissional duplicado","","info")}
async function duplicarCliente(id){const c=state.clientes.find(x=>x.id===id);if(!c)return;const{error}=await db.from("agenda_clientes").insert({empresa_id:state.empresa.id,nome:c.nome+" (cópia)",telefone:c.telefone,email:c.email,status:"ativo"});if(error)return toast("Erro.","err");await loadAll();showNotif("Cliente duplicado","","info")}
async function duplicarAgendamento(id){const a=state.agendamentos.find(x=>x.id===id);if(!a)return;const{error}=await db.from("agenda_agendamentos").insert({empresa_id:state.empresa.id,cliente_id:a.cliente_id,servico_id:a.servico_id,profissional_id:a.profissional_id,cliente_nome:a.cliente_nome,cliente_telefone:a.cliente_telefone,servico_nome:a.servico_nome,profissional_nome:a.profissional_nome,data:a.data,hora:a.hora,status:"Pendente",valor:a.valor,observacoes:a.observacoes});if(error)return toast("Erro.","err");await loadAll();showNotif("Agendamento duplicado como Pendente","","info")}

function toggleServico(id,ns){const s=state.servicos.find(x=>x.id===id);if(!s)return;openConfirmModal({icon:ns==="ativo"?"▶️":"⏸",iconCls:ns==="ativo"?"info":"warn",title:ns==="ativo"?"Ativar serviço?":"Desativar serviço?",sub:`"${s.nome}"`,btnLabel:ns==="ativo"?"▶ Ativar":"⏸ Desativar",btnStyle:ns==="ativo"?"primary":"danger",cb:async()=>{await db.from("agenda_servicos").update({status:ns}).eq("id",id);await loadAll();showNotif(ns==="ativo"?"Serviço ativado":"Serviço desativado","",ns==="ativo"?"confirm":"info")}})}
function toggleProfissional(id,ns){const p=state.profissionais.find(x=>x.id===id);if(!p)return;openConfirmModal({icon:ns==="ativo"?"▶️":"⏸",iconCls:ns==="ativo"?"info":"warn",title:ns==="ativo"?"Ativar profissional?":"Desativar?",sub:`"${p.nome}"`,btnLabel:ns==="ativo"?"▶ Ativar":"⏸ Desativar",btnStyle:ns==="ativo"?"primary":"danger",cb:async()=>{await db.from("agenda_profissionais").update({status:ns}).eq("id",id);await loadAll();showNotif(ns==="ativo"?"Profissional ativado":"Profissional desativado","",ns==="ativo"?"confirm":"info")}})}
function toggleCliente(id,ativar){const c=state.clientes.find(x=>x.id===id);if(!c)return;openConfirmModal({icon:ativar?"▶️":"⏸",iconCls:ativar?"info":"warn",title:ativar?"Ativar cliente?":"Desativar?",sub:`"${c.nome}"`,btnLabel:ativar?"▶ Ativar":"⏸ Desativar",btnStyle:ativar?"primary":"danger",cb:async()=>{await db.from("agenda_clientes").update(getClienteStatusPayload(ativar)).eq("id",id);await loadAll();showNotif(ativar?"Cliente ativado":"Cliente desativado","",ativar?"confirm":"info")}})}

function excluirServico(id){const s=state.servicos.find(x=>x.id===id);if(!s)return;openConfirmModal({icon:"🗑",iconCls:"danger",title:"Excluir serviço?",sub:`"${s.nome}" será removido.`,btnLabel:"Excluir",btnStyle:"danger",cb:async()=>{await db.from("agenda_servicos").update({status:"excluido"}).eq("id",id);await loadAll();showNotif("Serviço excluído","","info")}})}
function excluirProfissional(id){const p=state.profissionais.find(x=>x.id===id);if(!p)return;openConfirmModal({icon:"🗑",iconCls:"danger",title:"Excluir profissional?",sub:`"${p.nome}" será removido.`,btnLabel:"Excluir",btnStyle:"danger",cb:async()=>{await db.from("agenda_profissionais").update({status:"excluido"}).eq("id",id);await loadAll();showNotif("Profissional excluído","","info")}})}
function excluirCliente(id){const c=state.clientes.find(x=>x.id===id);if(!c)return;openConfirmModal({icon:"🗑",iconCls:"danger",title:"Excluir cliente?",sub:`"${c.nome}" será removido.`,btnLabel:"Excluir",btnStyle:"danger",cb:async()=>{await db.from("agenda_clientes").update(getClienteStatusPayload(false)).eq("id",id);await loadAll();showNotif("Cliente removido","","info")}})}

function excluirAgendamento(id){
  const a=state.agendamentos.find(x=>x.id===id);if(!a)return;
  const jaFoiConcluido=normStatus(a.status)==="Concluído"||a.financeiro_status==="Concluído";
  openConfirmModal({
    icon:"🗑",
    iconCls:"danger",
    title:jaFoiConcluido?"Arquivar agendamento?":"Excluir agendamento?",
    sub:jaFoiConcluido
      ?`"${a.cliente_nome}" em ${formatDateBR(a.data)}. O faturamento será preservado.`
      :`"${a.cliente_nome}" em ${formatDateBR(a.data)}.`,
    btnLabel:jaFoiConcluido?"Arquivar":"Excluir",
    btnStyle:"danger",
    cb:async()=>{
      const payload=jaFoiConcluido
        ?{status:"Excluído",financeiro_status:"Concluído"}
        :{status:"Excluído"};
      const{error}=await db.from("agenda_agendamentos").update(payload).eq("id",id);
      if(error){console.error(error);return toast("Erro ao excluir.","err")}
      await loadAll();
      showNotif(
        jaFoiConcluido?"Agendamento arquivado":"Agendamento excluído",
        jaFoiConcluido?"Faturamento mantido no histórico.":"",
        "info"
      );
    }
  });
}

async function salvarCliente(){
  const nome=(document.getElementById("cliNome")?.value||"").trim();
  const telefone=(document.getElementById("cliTel")?.value||"").trim();
  const email=(document.getElementById("cliEmail")?.value||"").trim();

  if(!state?.empresa?.id)return toast("Empresa não carregada.","err");
  if(!nome)return toast("Digite o nome do cliente.","err");

  const payload={empresa_id:state.empresa.id,nome,telefone,email,status:"ativo"};
  const{error}=await db.from("agenda_clientes").insert(payload);

  if(error){
    console.error(error);
    return toast("Erro ao adicionar cliente. Verifique RLS/colunas da tabela agenda_clientes.","err");
  }

  cliNome.value=cliTel.value=cliEmail.value="";
  await loadAll();
  showNotif("Cliente adicionado",`${nome} foi salvo na base de clientes.`,"confirm");
}
async function salvarServico(){if(!srvNome.value)return toast("Digite o nome.","err");const{error}=await db.from("agenda_servicos").insert({empresa_id:state.empresa.id,nome:srvNome.value,preco:Number(srvPreco.value||0),duracao_minutos:Number(srvDur.value||60),status:"ativo"});if(error)return toast("Erro.","err");srvNome.value=srvPreco.value=srvDur.value="";await loadAll();showNotif("Serviço adicionado","","confirm")}
async function salvarProfissional(){if(!proNome.value)return toast("Digite o nome.","err");const{error}=await db.from("agenda_profissionais").insert({empresa_id:state.empresa.id,nome:proNome.value,especialidade:proEsp.value,telefone:proTel.value,status:"ativo"});if(error)return toast("Erro.","err");proNome.value=proEsp.value=proTel.value="";await loadAll();showNotif("Profissional adicionado","","confirm")}
async function salvarAgendamento(){
  if(!agCliente.value||!agServico.value||!agProfissional.value||!agData.value||!agHora.value)return toast("Preencha todos os campos.","err");
  const serv=state.servicos.find(s=>s.id===agServico.value);const prof=state.profissionais.find(p=>p.id===agProfissional.value);
  let clienteId=null;
  const{data:cli}=await db.from("agenda_clientes").insert({empresa_id:state.empresa.id,nome:agCliente.value.trim(),telefone:agTelefone.value.trim(),status:"ativo"}).select("*").single();
  if(cli)clienteId=cli.id;
  const agDataValor=agData.value;
  const agHoraValor=agHora.value;
  const agStatusValor=agStatus.value;
  const{error}=await db.from("agenda_agendamentos").insert({empresa_id:state.empresa.id,cliente_id:clienteId,servico_id:serv?.id,profissional_id:prof?.id,cliente_nome:agCliente.value,cliente_telefone:agTelefone.value,servico_nome:serv?.nome,profissional_nome:prof?.nome,data:agDataValor,hora:agHoraValor,status:agStatusValor,valor:Number(serv?.preco||0)});
  if(error){console.error(error);return toast("Erro ao salvar.","err")}
  agCliente.value=agTelefone.value=agData.value=agHora.value="";
  await loadAll();showNotif("Agendamento criado!",`${agStatusValor} para ${formatDateBR(agDataValor)} às ${agHoraValor}.`,"new_ag");
}

async function salvarConfig(){
  if(!state?.empresa?.id)return toast("Empresa não carregada.","err");

  const nome=(document.getElementById("cfgNome")?.value||"").trim();
  const whatsapp=(document.getElementById("cfgWhatsapp")?.value||"").trim();
  const slugAtual=slugify(state.empresa.slug||"");
  const slugDigitado=slugify(document.getElementById("cfgSlug")?.value||slugAtual);
  const endereco=(document.getElementById("cfgEndereco")?.value||"").trim();
  const cidade=(document.getElementById("cfgCidade")?.value||"").trim();

  if(!nome)return toast("Digite o nome da empresa.","err");
  if(!whatsapp)return toast("Digite o WhatsApp da empresa.","err");
  if(!slugDigitado)return toast("Digite o link público.","err");

  const updates={nome,whatsapp,endereco,cidade};

  if(slugDigitado!==slugAtual){
    const{data:slugExiste,error:slugCheckErr}=await db
      .from("agenda_empresas")
      .select("id")
      .eq("slug",slugDigitado)
      .neq("id",state.empresa.id)
      .maybeSingle();

    if(slugCheckErr){
      console.error(slugCheckErr);
      return toast("Erro ao verificar o link público.","err");
    }
    if(slugExiste){
      return toast("Esse link público já está em uso.","err");
    }
    updates.slug=slugDigitado;
  }

  const{data,error}=await db
    .from("agenda_empresas")
    .update(updates)
    .eq("id",state.empresa.id)
    .select("*")
    .single();

  if(error){
    console.error(error);
    return toast("Erro ao salvar os dados da empresa.","err");
  }

  state.empresa=data||{...state.empresa,...updates};
  safeSetText("sideEmpresa",state.empresa.nome);
  safeSetText("sideArea",state.empresa.area_atuacao||state.empresa.plano||"Premium");
  safeSetText("avatarLetter",initial(state.empresa.nome));

  const lb=document.getElementById("publicLinkBox");
  if(lb)lb.textContent=publicUrl(state.empresa.slug);

  renderConfig();
  showNotif("Dados da empresa salvos","Nome, WhatsApp, endereço, cidade e link atualizados.","confirm");
}

async function salvarRedesSociais(){
  if(!state?.empresa?.id)return toast("Empresa não carregada.","err");

  const updates={
    instagram:(document.getElementById("cfgInstagram")?.value||"").trim(),
    facebook:(document.getElementById("cfgFacebook")?.value||"").trim(),
    tiktok:(document.getElementById("cfgTiktok")?.value||"").trim(),
    site:(document.getElementById("cfgSite")?.value||"").trim()
  };

  const{data,error}=await db
    .from("agenda_empresas")
    .update(updates)
    .eq("id",state.empresa.id)
    .select("*")
    .single();

  if(error){
    console.error("Erro ao salvar redes sociais:",error);
    return toast("Erro ao salvar redes sociais. Verifique se as colunas instagram, facebook, tiktok e site existem na tabela agenda_empresas.","err");
  }

  state.empresa=data||{...state.empresa,...updates};
  renderConfig();
  showNotif("Redes sociais salvas","Instagram, Facebook, TikTok e site atualizados.","confirm");
}

async function confirmarAg(id){
  const ag=state.agendamentos.find(a=>a.id===id);if(!ag)return;
  if(!agendamentoPodeTerAcoes(ag))return toast("Este agendamento não permite confirmação.","warn");
  const{error}=await db.from("agenda_agendamentos").update({status:"Confirmado"}).eq("id",id);
  if(error)return toast("Erro ao confirmar.","err");
  ag.status="Confirmado";renderAll();
  showNotif("Agendamento confirmado!",`${ag.cliente_nome} — ${formatDateBR(ag.data)} às ${ag.hora||"—"}.`,"confirm");
  const tel=(ag.cliente_telefone||ag.telefone||"").replace(/\D/g,"");
  if(tel){const msg=`Olá, ${ag.cliente_nome}! Seu agendamento foi confirmado ✅\nServiço: ${ag.servico_nome||"—"}\nProfissional: ${ag.profissional_nome||"—"}\nData: ${formatDateBR(ag.data)}\nHorário: ${ag.hora||"—"}\nAguardamos você!`;const link=buildWaLink(tel,msg);if(link)window.open(link,"_blank")}
}
async function concluirAg(id){
  const ag=state.agendamentos.find(a=>a.id===id);if(!ag)return;
  if(!agendamentoPodeTerAcoes(ag)&&normStatus(ag.status)!=="Confirmado")return toast("Este agendamento não permite conclusão.","warn");
  const{error}=await db.from("agenda_agendamentos").update({status:"Concluído",financeiro_status:"Concluído"}).eq("id",id);
  if(error)return toast("Erro ao concluir.","err");
  ag.status="Concluído";ag.financeiro_status="Concluído";renderAll();
  showNotif("Atendimento concluído!",`${ag.cliente_nome} — ${ag.servico_nome||"—"}.`,"done");
}
function abrirWhatsappPadrao(id){
  const ag=state.agendamentos.find(a=>a.id===id);if(!ag)return;
  if(!agendamentoPodeWhatsapp(ag))return toast("Este status não permite WhatsApp automático.","warn");
  const tel=(ag.cliente_telefone||ag.telefone||"").replace(/\D/g,"");
  if(!tel){toast("Telefone não cadastrado.","err");return}
  const msg=`Olá, ${ag.cliente_nome}! 👋\nServiço: ${ag.servico_nome||"—"}\nProfissional: ${ag.profissional_nome||"—"}\nData: ${formatDateBR(ag.data)}\nHorário: ${ag.hora||"—"}\nAté lá! 😊`;
  const link=buildWaLink(tel,msg);if(link)window.open(link,"_blank");
}

let _recusaId=null,_recusaMotivo=null;
function openModalRecusa(id){
  _recusaId=id;_recusaMotivo=null;
  const ag=state.agendamentos.find(a=>a.id===id);if(!ag)return;
  if(!agendamentoPodeTerAcoes(ag))return toast("Este agendamento não permite recusa.","warn");
  document.getElementById("recusaClienteInfo").textContent=`${ag.cliente_nome} · ${formatDateBR(ag.data)} às ${ag.hora||"—"}`;
  document.querySelectorAll(".motivo-opt").forEach(el=>{el.classList.remove("selected");el.querySelector(".mo-radio").innerHTML=""});
  document.getElementById("recusaMotivoCustom").value="";
  document.getElementById("modalRecusa").classList.add("open");
}
function closeModalRecusa(){document.getElementById("modalRecusa").classList.remove("open");_recusaId=null;_recusaMotivo=null}
function selectMotivo(el,motivo){document.querySelectorAll(".motivo-opt").forEach(o=>{o.classList.remove("selected");o.querySelector(".mo-radio").innerHTML=""});el.classList.add("selected");_recusaMotivo=motivo}
async function confirmarRecusa(){
  if(!_recusaId)return;
  const motivoCustom=document.getElementById("recusaMotivoCustom").value.trim();
  const motivo=motivoCustom||_recusaMotivo;
  if(!motivo)return toast("Escolha ou descreva o motivo.","err");
  const ag=state.agendamentos.find(a=>a.id===_recusaId);if(!ag)return;
  const{error}=await db.from("agenda_agendamentos").update({status:"Recusado",observacoes:motivo}).eq("id",_recusaId);
  if(error)return toast("Erro ao recusar.","err");
  ag.status="Recusado";closeModalRecusa();renderAll();
  showNotif("Agendamento recusado",`${ag.cliente_nome} — ${motivo}.`,"refuse");
  const tel=(ag.cliente_telefone||ag.telefone||"").replace(/\D/g,"");
  if(tel){const pubLink=state.empresa?publicUrl(state.empresa.slug):"";const msg=`Olá, ${ag.cliente_nome}!\nInfelizmente não conseguimos confirmar seu agendamento para ${formatDateBR(ag.data)} às ${ag.hora||"—"}.\nMotivo: ${motivo}\nEscolha outro horário: ${pubLink}`;const link=buildWaLink(tel,msg);if(link)window.open(link,"_blank")}
}

let _reagendarId=null;
function openModalReagendar(id){
  _reagendarId=id;const ag=state.agendamentos.find(a=>a.id===id);if(!ag)return;
  if(!agendamentoPodeTerAcoes(ag))return toast("Este agendamento não permite reagendamento.","warn");
  document.getElementById("reagendarClienteInfo").textContent=`${ag.cliente_nome} · ${formatDateBR(ag.data)} às ${ag.hora||"—"}`;
  document.getElementById("reagendarData").value=ag.data||"";document.getElementById("reagendarHora").value=ag.hora||"";
  document.getElementById("modalReagendar").classList.add("open");
}
function closeModalReagendar(){document.getElementById("modalReagendar").classList.remove("open");_reagendarId=null}
async function confirmarReagendar(){
  if(!_reagendarId)return;
  const novaData=document.getElementById("reagendarData").value,novaHora=document.getElementById("reagendarHora").value;
  if(!novaData||!novaHora)return toast("Escolha a nova data e horário.","err");
  const ag=state.agendamentos.find(a=>a.id===_reagendarId);if(!ag)return;
  const{error}=await db.from("agenda_agendamentos").update({data:novaData,hora:novaHora,status:"Reagendado"}).eq("id",_reagendarId);
  if(error)return toast("Erro ao reagendar.","err");
  ag.data=novaData;ag.hora=novaHora;ag.status="Reagendado";
  closeModalReagendar();renderAll();
  showNotif("Agendamento reagendado!",`${ag.cliente_nome} → ${formatDateBR(novaData)} às ${novaHora}.`,"reschedule");
  const tel=(ag.cliente_telefone||ag.telefone||"").replace(/\D/g,"");
  if(tel){const msg=`Olá, ${ag.cliente_nome}!\nSeu agendamento foi reagendado 📅\nServiço: ${ag.servico_nome||"—"}\nNova data: ${formatDateBR(novaData)}\nNovo horário: ${novaHora}\nAguardamos você! 😊`;const link=buildWaLink(tel,msg);if(link)window.open(link,"_blank")}
}

function renderFinanceiro(){
  const concluidos=(state.agendamentos||[]).filter(a=>isStatusFinanceiro(a));
  const total=concluidos.reduce((s,a)=>s+Number(a.valor||0),0);
  const ticket=concluidos.length?total/concluidos.length:0;
  safeSetText("finReceita",money(total).replace(",00",""));
  safeSetText("finTicket",money(ticket).replace(",00",""));
  safeSetText("finPagos",concluidos.length);
  safeSetText("finPlano",state.empresa.plano||"Grátis");
}
function renderConfig(){
  const fn=document.getElementById("cfgNome");if(fn)fn.value=state.empresa.nome||"";
  const fw=document.getElementById("cfgWhatsapp");if(fw)fw.value=state.empresa.whatsapp||"";
  const fs=document.getElementById("cfgSlug");if(fs)fs.value=state.empresa.slug||"";
  const fe=document.getElementById("cfgEndereco");if(fe)fe.value=state.empresa.endereco||"";
  const fc=document.getElementById("cfgCidade");if(fc)fc.value=state.empresa.cidade||"";
  const cl=document.getElementById("cfgLink");if(cl)cl.textContent="🔗 "+publicUrl(state.empresa.slug);
  const fi=document.getElementById("cfgInstagram");if(fi)fi.value=state.empresa.instagram||"";
  const fb=document.getElementById("cfgFacebook");if(fb)fb.value=state.empresa.facebook||"";
  const ft=document.getElementById("cfgTiktok");if(ft)ft.value=state.empresa.tiktok||"";
  const fst=document.getElementById("cfgSite");if(fst)fst.value=state.empresa.site||"";
}

/* ── PÁGINA PÚBLICA — NOVA VERSÃO COM INSTAGRAM, SITE E BOTÃO WA FLUTUANTE ── */
async function loadPublic(slug){
  document.getElementById("landingView").style.display="none";
  document.getElementById("dashboardView").style.display="none";
  document.getElementById("publicView").style.display="block";

  const{data:empresa,error}=await db.from("agenda_empresas").select("*").eq("slug",slug).single();
  if(error||!empresa){
    safeSetText("pubEmpresa","Agenda não encontrada");
    safeSetText("pubDesc","Verifique se o link está correto.");
    return;
  }
  state.pubEmpresa=empresa;
  safeSetText("pubEmpresa",empresa.nome);
  safeSetText("pubDesc",(empresa.area_atuacao||"Agendamento Online")+" • WhatsApp: "+(empresa.whatsapp||"Não informado"));

  /* Instagram e Site — somente se existirem */
  const pubSociais=document.getElementById("pubSociais");
  if(pubSociais){
    let sociaisHtml="";
    if(empresa.instagram){
      const instaHandle=empresa.instagram.replace("@","").replace(/.*instagram\.com\//,"");
      const instaUrl="https://instagram.com/"+instaHandle;
      sociaisHtml+=`<a href="${instaUrl}" target="_blank" rel="noopener" class="pub-social-link pub-social-insta">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
        @${instaHandle}
      </a>`;
    }
    if(empresa.site){
      const siteUrl=empresa.site.startsWith("http")?empresa.site:"https://"+empresa.site;
      const siteLbl=empresa.site.replace(/^https?:\/\//,"").replace(/\/$/,"");
      sociaisHtml+=`<a href="${siteUrl}" target="_blank" rel="noopener" class="pub-social-link pub-social-site">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        ${siteLbl}
      </a>`;
    }
    pubSociais.innerHTML=sociaisHtml;
    pubSociais.style.display=sociaisHtml?"flex":"none";
  }

  /* Botão flutuante WhatsApp — Tirar dúvida */
  const waFab=document.getElementById("pubWaFab");
  if(waFab){
    const telEmpresa=(empresa.whatsapp||"").replace(/\D/g,"");
    if(telEmpresa){
      const telFmt=telEmpresa.startsWith("55")?telEmpresa:"55"+telEmpresa;
      const msgDuvida=encodeURIComponent("Olá, tenho uma dúvida antes de agendar.");
      waFab.href="https://wa.me/"+telFmt+"?text="+msgDuvida;
      waFab.style.display="flex";
    } else {
      waFab.style.display="none";
    }
  }

  const[servicos,profissionais]=await Promise.all([
    db.from("agenda_servicos").select("*").eq("empresa_id",empresa.id).eq("status","ativo").order("nome"),
    db.from("agenda_profissionais").select("*").eq("empresa_id",empresa.id).eq("status","ativo").order("nome")
  ]);
  state.servicos=servicos.data||[];
  state.profissionais=profissionais.data||[];

  const ps=document.getElementById("pubServicos");
  if(ps)ps.innerHTML=state.servicos.map(s=>`<div class="choice" onclick="selectPubServico('${s.id}',this)"><div class="c-icon">✦</div><div><div class="choice-title">${s.nome}</div><div class="choice-sub">${s.duracao_minutos||60} min</div></div><div class="choice-right">${money(s.preco).replace(",00","")}</div></div>`).join()||`<div class="empty-state"><div class="es-icon">✦</div><p>Nenhum serviço disponível.</p></div>`;

  const pp=document.getElementById("pubProfissionais");
  if(pp)pp.innerHTML=state.profissionais.map(p=>`<div class="choice" onclick="selectPubProfissional('${p.id}',this)"><div class="c-icon">👤</div><div><div class="choice-title">${p.nome}</div><div class="choice-sub">${p.especialidade||"Profissional"}</div></div></div>`).join()||`<div class="empty-state"><div class="es-icon">👤</div><p>Nenhum profissional.</p></div>`;
}

function selectPubServico(id,el){state.pubServico=state.servicos.find(s=>s.id===id);document.querySelectorAll("#pubServicos .choice").forEach(c=>c.classList.remove("active"));el.classList.add("active")}
function selectPubProfissional(id,el){state.pubProfissional=state.profissionais.find(p=>p.id===id);document.querySelectorAll("#pubProfissionais .choice").forEach(c=>c.classList.remove("active"));el.classList.add("active")}

async function confirmarAgendamentoPublico(){
  if(!state.pubEmpresa||!state.pubServico||!state.pubProfissional||!pubNome.value||!pubTelefone.value||!pubData.value||!pubHora.value)return toast("Preencha tudo para confirmar.","err");
  const{data:cli}=await db.from("agenda_clientes").insert({empresa_id:state.pubEmpresa.id,nome:pubNome.value.trim(),telefone:pubTelefone.value.trim(),status:"ativo"}).select("*").single();
  const{error}=await db.from("agenda_agendamentos").insert({empresa_id:state.pubEmpresa.id,cliente_id:cli?.id||null,servico_id:state.pubServico.id,profissional_id:state.pubProfissional.id,cliente_nome:pubNome.value,cliente_telefone:pubTelefone.value,servico_nome:state.pubServico.nome,profissional_nome:state.pubProfissional.nome,data:pubData.value,hora:pubHora.value,status:"Pendente",valor:Number(state.pubServico.preco||0),observacoes:document.getElementById("pubObs").value});
  if(error){console.error(error);return toast("Erro ao confirmar.","err")}
  document.getElementById("pubMainBody").style.display="none";
  document.getElementById("pubConfirmScreen").style.display="block";
}

function resetPublic(){
  document.getElementById("pubMainBody").style.display="grid";
  document.getElementById("pubConfirmScreen").style.display="none";
  pubNome.value=pubTelefone.value=pubData.value=pubHora.value=document.getElementById("pubObs").value="";
  state.pubServico=null;state.pubProfissional=null;
  document.querySelectorAll(".choice").forEach(c=>c.classList.remove("active"));
}

function copyPublicLink(){if(!state.empresa)return;const link=publicUrl(state.empresa.slug);navigator.clipboard?.writeText(link);showNotif("Link copiado!",link,"info",3000)}
function openPublic(){if(!state?.empresa?.slug)return;history.pushState(null,"","#agendar/"+state.empresa.slug);loadPublic(state.empresa.slug)}
function voltarInicioPublico(){
  history.pushState(null,"",location.pathname);
  document.getElementById("publicView").style.display="none";
  if(state?.empresa){document.getElementById("dashboardView").style.display="block";setView("dashboard")}
  else{document.getElementById("landingView").style.display="block"}
  window.scrollTo({top:0,behavior:"smooth"});
}
async function logout(){await db.auth.signOut();state.user=null;state.perfil=null;state.empresa=null;state.clientes=[];state.servicos=[];state.profissionais=[];state.agendamentos=[];state.pagamentos=[];location.href=location.pathname}

window.addEventListener("hashchange",()=>{const slug=getPublicSlug();if(slug)loadPublic(slug)});
Object.assign(window,{
  scrollToId,
  openAuth,
  closeAuth,
  showLoginOnly,
  showCadastro,
  goStepNegocio,
  backStepConta,
  goStepServico,
  backStepNegocio,
  finalizarCadastro,
  loginComSenha,
  logout,
  setView,
  setAgendaFilter,
  salvarCliente,
  salvarServico,
  salvarProfissional,
  salvarAgendamento,
  salvarConfig,
  salvarRedesSociais,
  confirmarAg,
  concluirAg,
  abrirWhatsappPadrao,
  openModalRecusa,
  closeModalRecusa,
  selectMotivo,
  confirmarRecusa,
  openModalReagendar,
  closeModalReagendar,
  confirmarReagendar,
  editCliente,
  editServico,
  editProfissional,
  editAgendamento,
  duplicarCliente,
  duplicarServico,
  duplicarProfissional,
  duplicarAgendamento,
  toggleCliente,
  toggleServico,
  toggleProfissional,
  excluirCliente,
  excluirServico,
  excluirProfissional,
  excluirAgendamento,
  copyPublicLink,
  openPublic,
  voltarInicioPublico,
  selectPubServico,
  selectPubProfissional,
  confirmarAgendamentoPublico,
  resetPublic
});

