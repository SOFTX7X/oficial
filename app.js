// ── STATE ──
let state = {
  user: null, empresa: null, perfil: null,
  categorias: [], clientes: [], servicos: [],
  profissionais: [], agendamentos: [], pagamentos: [],
  pubEmpresa: null, pubServico: null, pubProfissional: null,
  pubDiasFechados: []
};

let _agendaFilter = 'todos';
let _confirmCb = null;
let _editSaveCb = null;
let _recusaId = null;
let _recusaMotivo = null;
let _reagendarId = null;
let _openMenu = null;
let _openMenuBtn = null;
let autoSyncTimer = null;
let lastIds = new Set();
let realtimeChannel = null;
let _fotoEditor = null;

// ── UTILS ──
function $(id) { return document.getElementById(id); }

function setText(id, v) {
  const el = $(id);
  if (el) el.textContent = v;
}

function ajustarFonteCampo(campo) {
  if (!campo || !campo.matches('input, select') || campo.type === 'hidden') return;
  const texto = campo.tagName === 'SELECT'
    ? (campo.options[campo.selectedIndex]?.text || '')
    : (campo.value || campo.placeholder || '');
  const tamanho = texto.length > 34 ? 11 : texto.length > 25 ? 12 : texto.length > 18 ? 13 : 14;
  campo.style.fontSize = tamanho + 'px';
  campo.title = texto;
}

function ajustarFontesCampos(container = document) {
  container.querySelectorAll('input:not([type="hidden"]), select').forEach(ajustarFonteCampo);
}

function escapeHtml(valor) {
  return String(valor || '').replace(/[&<>"']/g, caractere => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[caractere]);
}

function normalizarUrl(valor, base = '') {
  const texto = String(valor || '').trim();
  if (!texto) return '';
  if (base && !/^https?:\/\//i.test(texto)) {
    return base + texto.replace(/^@/, '').replace(/^\/+/, '');
  }
  return /^https?:\/\//i.test(texto) ? texto : 'https://' + texto;
}

function aplicarImagemFundo(elemento, url) {
  if (!elemento) return;
  elemento.style.backgroundImage = url ? `url("${String(url).replace(/"/g, '%22')}")` : '';
}

function renderAvatarPainel() {
  const avatar = $('sideAvatar');
  if (!avatar || !state.empresa) return;
  const foto = state.empresa.foto_perfil_url || '';
  aplicarImagemFundo(avatar, foto);
  const enquadramento = getEnquadramentoFoto('perfil');
  aplicarEnquadramentoFoto(avatar, enquadramento.x, enquadramento.y, enquadramento.zoom);
  avatar.textContent = foto ? '' : initial(state.empresa.nome);
}

function renderPreviewImagem(id, url) {
  const preview = $(id);
  if (!preview) return;
  aplicarImagemFundo(preview, url);
  preview.innerHTML = url ? '' : '<span>+</span>';
}

function aplicarEnquadramentoFoto(elemento, x = 50, y = 50, zoom = 100) {
  if (!elemento) return;
  elemento.style.backgroundPosition = `${Number(x) || 50}% ${Number(y) || 50}%`;
  elemento.style.backgroundSize = `${Math.max(40, Number(zoom) || 100)}%`;
  elemento.style.backgroundRepeat = 'no-repeat';
}

function getEnquadramentoFoto(tipo, empresa = state.empresa || {}) {
  const prefixo = tipo === 'perfil' ? 'foto_perfil' : 'foto_publica';
  return {
    x: Number(empresa[`${prefixo}_x`] ?? 50),
    y: Number(empresa[`${prefixo}_y`] ?? 50),
    zoom: Number(empresa[`${prefixo}_zoom`] ?? 100)
  };
}

function money(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function slugify(s) {
  return (s || '').toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').substring(0, 60);
}

function dataLocalISO(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function hojeISO() { return dataLocalISO(); }
function mesPrefixo() { return hojeISO().slice(0, 7); }

function dataConclusaoISO(agendamento) {
  if (!agendamento?.concluido_em) return agendamento?.data || '';
  const data = new Date(agendamento.concluido_em);
  return Number.isNaN(data.getTime()) ? (agendamento.data || '') : dataLocalISO(data);
}

function ordenarAgendamentosRecentes(agendamentos) {
  return [...(agendamentos || [])].sort((a, b) => {
    const dataA = Date.parse(a.criado_em || '') || 0;
    const dataB = Date.parse(b.criado_em || '') || 0;
    return dataB - dataA;
  });
}

function ordenarAtendimentosAgendados(agendamentos) {
  return [...(agendamentos || [])].sort((a, b) => {
    const dataA = `${a.data || ''}T${a.hora || '00:00'}`;
    const dataB = `${b.data || ''}T${b.hora || '00:00'}`;
    return dataA.localeCompare(dataB);
  });
}

function publicUrl(slug) {
  return location.origin + location.pathname + '#agendar/' + slug;
}

function initial(name) { return (name || '?').trim().substring(0, 1).toUpperCase(); }

function formatDate(d) {
  if (!d) return '—';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}

function buildWaLink(tel, msg) {
  const n = (tel || '').replace(/\D/g, '');
  if (!n) return null;
  const f = n.startsWith('55') ? n : '55' + n;
  const params = '?phone=' + f + '&text=' + encodeURIComponent(msg || '');
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  return isMobile ? 'whatsapp://send' + params : 'https://web.whatsapp.com/send' + params;
}

function reservarJanelaWhatsapp(tel) {
  if (!(tel || '').replace(/\D/g, '')) return null;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) return null;
  const janela = window.open('about:blank', '_blank');
  if (janela) {
    janela.document.title = 'Abrindo WhatsApp...';
    janela.opener = null;
  }
  return janela;
}

function abrirLinkWhatsapp(tel, msg, janelaReservada = null) {
  const link = buildWaLink(tel, msg);
  if (!link) return false;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = link;
    return true;
  }
  if (janelaReservada && !janelaReservada.closed) {
    janelaReservada.location.replace(link);
    return true;
  }
  const janela = window.open(link, '_blank', 'noopener');
  if (!janela) window.location.href = link;
  return true;
}

const MENSAGENS_WHATSAPP_PADRAO = {
  confirmacao: `Olá, [CLIENTE]!

Seu agendamento na [EMPRESA] foi confirmado.

Serviço: [SERVICO]
Profissional: [PROFISSIONAL]
Data: [DATA]
Horário: [HORARIO]

Esperamos por você!`,
  recusa: `Olá, [CLIENTE].

Não conseguimos confirmar seu agendamento na [EMPRESA].

Serviço: [SERVICO]
Profissional: [PROFISSIONAL]
Data solicitada: [DATA] às [HORARIO]
Motivo: [MOTIVO]

Você pode escolher um novo horário aqui:
[LINK]`,
  reagendamento: `Olá, [CLIENTE]!

Seu agendamento na [EMPRESA] foi reagendado com sucesso.

Serviço: [SERVICO]
Profissional: [PROFISSIONAL]
Nova data: [NOVA_DATA]
Novo horário: [NOVO_HORARIO]

Até breve!`,
  contato: `Olá, [CLIENTE]!

Estamos entrando em contato sobre seu agendamento na [EMPRESA].

Serviço: [SERVICO]
Profissional: [PROFISSIONAL]
Data: [DATA]
Horário: [HORARIO]`
};

const MARCADORES_OBRIGATORIOS = {
  confirmacao: ['[CLIENTE]', '[SERVICO]', '[PROFISSIONAL]', '[DATA]', '[HORARIO]'],
  recusa: ['[CLIENTE]', '[SERVICO]', '[PROFISSIONAL]', '[DATA]', '[HORARIO]', '[MOTIVO]', '[LINK]'],
  reagendamento: ['[CLIENTE]', '[SERVICO]', '[PROFISSIONAL]', '[NOVA_DATA]', '[NOVO_HORARIO]'],
  contato: ['[CLIENTE]', '[SERVICO]', '[PROFISSIONAL]', '[DATA]', '[HORARIO]']
};

function getMensagensWhatsapp() {
  const mensagens = { ...MENSAGENS_WHATSAPP_PADRAO, ...(state.empresa?.mensagens_whatsapp || {}) };
  const antigos = {
    nome: '[CLIENTE]', empresa: '[EMPRESA]', servico: '[SERVICO]',
    profissional: '[PROFISSIONAL]', data: '[DATA]', hora: '[HORARIO]',
    motivo: '[MOTIVO]', link: '[LINK]', nova_data: '[NOVA_DATA]', nova_hora: '[NOVO_HORARIO]'
  };
  Object.keys(mensagens).forEach(tipo => {
    mensagens[tipo] = (mensagens[tipo] || '').replace(/\{([a-z_]+)\}/g, (_, chave) => antigos[chave] || `{${chave}}`);
  });
  return mensagens;
}

function montarMensagemWhatsapp(tipo, ag, extras = {}) {
  const templates = getMensagensWhatsapp();
  const valores = {
    CLIENTE: ag?.cliente_nome || 'Cliente',
    EMPRESA: state.empresa?.nome || 'nossa empresa',
    SERVICO: ag?.servico_nome || 'Não informado',
    PROFISSIONAL: ag?.profissional_nome || 'Não informado',
    DATA: formatDate(ag?.data),
    HORARIO: ag?.hora || 'Não informado',
    MOTIVO: extras.motivo || 'Não informado',
    LINK: extras.link || (state.empresa?.slug ? publicUrl(state.empresa.slug) : ''),
    NOVA_DATA: extras.novaData ? formatDate(extras.novaData) : formatDate(ag?.data),
    NOVO_HORARIO: extras.novaHora || ag?.hora || 'Não informado'
  };
  return (templates[tipo] || '').replace(/\[([A-Z_]+)\]/g, (_, chave) => valores[chave] ?? `[${chave}]`);
}

function normStatus(s) {
  const r = (s || 'pendente').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (r === 'confirmado' || r === 'confirmada') return 'Confirmado';
  if (r === 'pendente') return 'Pendente';
  if (r === 'concluido' || r === 'concluida') return 'Concluído';
  if (r === 'recusado' || r === 'recusada' || r === 'cancelado') return 'Recusado';
  if (r === 'reagendado' || r === 'reagendada') return 'Reagendado';
  if (r === 'excluido' || r === 'excluida') return 'Excluído';
  return s || 'Pendente';
}

function badgeClass(s) {
  const n = normStatus(s);
  const m = {
    Confirmado: 'badge-green', Pendente: 'badge-yellow',
    'Concluído': 'badge-blue', Recusado: 'badge-red',
    Reagendado: 'badge-purple', 'Excluído': 'badge-gray'
  };
  return m[n] || 'badge-gray';
}

function isFinanceiro(a) {
  if (normStatus(a.status) === 'Concluído') return true;
  if (normStatus(a.status) === 'Excluído' && a.financeiro_status === 'Concluído') return true;
  return false;
}

function isAtivoCliente(c) {
  const st = (c?.status || '').toLowerCase().trim();
  if (st === 'inativo' || st === 'excluido' || st === 'excluído') return false;
  if (c?.ativo === false) return false;
  return true;
}

function podeTerAcoes(a) {
  return !['Excluído', 'Recusado', 'Concluído'].includes(normStatus(a.status));
}

function calcDiasFechados(empresa) {
  if (!empresa) return [];
  const mapa = [
    { campo: 'dom', indice: 0 }, { campo: 'seg', indice: 1 },
    { campo: 'ter', indice: 2 }, { campo: 'qua', indice: 3 },
    { campo: 'qui', indice: 4 }, { campo: 'sex', indice: 5 },
    { campo: 'sab', indice: 6 }
  ];
  // Se empresa nunca configurou os dias (todos null), aplica padrao: seg-sex aberto, sab+dom fechado
  const nuncaConfigurou = mapa.every(d => empresa[d.campo] === null || empresa[d.campo] === undefined);
  if (nuncaConfigurou) return [0, 6];
  return mapa.filter(d => empresa[d.campo] === false).map(d => d.indice);
}

function parseDiasSemana(valor) {
  if (!valor) return [1,2,3,4,5];
  if (Array.isArray(valor)) return valor.map(Number);
  // Supabase retorna "{1,2,3}" como string para integer[]
  if (typeof valor === 'string') {
    return valor.replace(/[{}]/g, '').split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
  }
  return [1,2,3,4,5];
}

function isDiaFechado(dataStr, diasFechados) {
  if (!dataStr || !diasFechados || diasFechados.length === 0) return false;
  const d = new Date(dataStr + 'T00:00:00');
  return diasFechados.includes(d.getDay());
}

function toast(msg, type = 'info') {
  const typeMap = { ok: 'ok', err: 'err', warn: 'info', info: 'info' };
  showNotif(msg, '', typeMap[type] || 'info');
}

function showNotif(title, msg = '', type = 'info', duration = 5000) {
  const stack = $('notifStack');
  if (!stack) return;
  const item = document.createElement('div');
  item.className = 'notif-item';
  const now = new Date();
  const t = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  const icons = { new: '📅', ok: '✅', err: '⚠️', info: '💬' };
  item.innerHTML = `
    <div class="notif-icon ${type}">${icons[type] || '🔔'}</div>
    <div class="notif-body">
      <div class="notif-title">${title}</div>
      ${msg ? `<div class="notif-msg">${msg}</div>` : ''}
      <div class="notif-time">${t}</div>
    </div>
    <button class="notif-close" onclick="this.parentElement.remove()">✕</button>
  `;
  stack.prepend(item);
  while (stack.children.length > 4) stack.lastChild.remove();
  setTimeout(() => {
    item.classList.add('out');
    setTimeout(() => { if (item.parentElement) item.remove(); }, 450);
  }, duration);
  const dot = $('notifDot');
  if (dot) dot.classList.add('on');
}

function clearNotifDot() {
  const dot = $('notifDot');
  if (dot) dot.classList.remove('on');
}

window.addEventListener('scroll', () => {
  const nav = $('landNav');
  if (nav) nav.classList.toggle('scrolled', scrollY > 40);
});

window.addEventListener('hashchange', () => {
  const slug = getPublicSlug();
  if (slug) loadPublic(slug);
});

document.addEventListener('click', function(e) {
  if (_openMenu) {
    if (_openMenuBtn && _openMenuBtn.contains(e.target)) return;
    if (_openMenu.contains(e.target)) return;
    closeAllMenus();
  }
});

document.addEventListener('scroll', closeAllMenus, { passive: true });

const vyxoraLoaderStartedAt = Date.now();

function esconderTelaCarregamento() {
  const loader = $('vyxoraLoader');
  if (!loader) return;
  loader.classList.add('is-hidden');
  setTimeout(() => loader.remove(), 500);
}

window.addEventListener('load', () => {
  const isNativeApp = /VyXoraAndroidApp/i.test(navigator.userAgent);
  const minDuration = isNativeApp ? 0 : 2200;
  const remaining = Math.max(0, minDuration - (Date.now() - vyxoraLoaderStartedAt));
  setTimeout(esconderTelaCarregamento, remaining);
});

window.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadCategorias();
  const slug = getPublicSlug();
  if (slug) { await loadPublic(slug); return; }
  try {
    const { data: { session } } = await db.auth.getSession();
    if (session?.user) {
      const ok = await carregarConta(session.user);
      if (!ok) await db.auth.signOut();
    }
  } catch (e) { console.error('Erro ao verificar sessão:', e); }
}

function getPublicSlug() {
  if (location.hash.startsWith('#agendar/')) return location.hash.replace('#agendar/', '').trim();
  return null;
}

async function carregarConta(user) {
  try {
    const { data: perfil, error: pe } = await db.from('agenda_perfis').select('*').eq('auth_user_id', user.id).single();
    if (pe || !perfil) { console.warn('Perfil não encontrado para', user.id); return false; }
    const { data: empresa, error: ee } = await db.from('agenda_empresas').select('*').eq('id', perfil.empresa_id).single();
    if (ee || !empresa) { console.warn('Empresa não encontrada para perfil', perfil.id); return false; }
    state.user = user; state.perfil = perfil; state.empresa = empresa;
    showDashboard(); await loadAll(); return true;
  } catch (e) { console.error('Erro em carregarConta:', e); return false; }
}

async function loadCategorias() {
  try {
    const { data, error } = await db.from('agenda_categorias').select('*').order('nome');
    if (error) { console.warn('Erro ao carregar categorias:', error.message); state.categorias = []; }
    else state.categorias = data || [];
  } catch (e) { console.warn('Exceção ao carregar categorias:', e); state.categorias = []; }
  preencherSelectCategorias();
}

function preencherSelectCategorias() {
  const sel = $('empCategoria');
  if (!sel) return;
  if (!state.categorias || state.categorias.length === 0) {
    const fallback = [
      { id: 'beleza', nome: 'Beleza & Estética', icone: '💅' },
      { id: 'saude', nome: 'Saúde', icone: '🏥' },
      { id: 'barbearia', nome: 'Barbearia', icone: '✂️' },
      { id: 'fitness', nome: 'Fitness & Bem-estar', icone: '🏋️' },
      { id: 'tatuagem', nome: 'Tatuagem & Piercing', icone: '🎨' },
      { id: 'pet', nome: 'Pet Shop', icone: '🐾' },
      { id: 'educacao', nome: 'Educação', icone: '📚' },
      { id: 'consultoria', nome: 'Consultoria', icone: '💼' },
      { id: 'fotografia', nome: 'Fotografia', icone: '📸' },
      { id: 'outro', nome: 'Outro', icone: '✦' }
    ];
    sel.innerHTML = fallback.map(c => `<option value="${c.id}">${c.icone} ${c.nome}</option>`).join('');
  } else {
    sel.innerHTML = state.categorias.map(c => `<option value="${c.id}">${c.icone || ''} ${c.nome}</option>`).join('');
  }
}

function showDashboard() {
  const lv = $('landingView'), dv = $('dashboardView'), pv = $('publicView');
  if (lv) lv.style.display = 'none';
  if (dv) dv.style.display = 'block';
  if (pv) pv.style.display = 'none';
  closeAuth();
  if (state.empresa) {
    renderAvatarPainel();
    setText('sideNome', state.empresa.nome);
    setText('sidePlan', state.empresa.plano || 'Grátis');
    const lb = $('sideLinkBox');
    if (lb) lb.textContent = publicUrl(state.empresa.slug);
  }
  document.body.style.overflow = '';
  setView('dashboard');
  setupRealtime();
  startAutoSync();
  syncNativePushSubscription();
}

function syncNativePushSubscription() {
  try {
    if (state?.empresa?.id && window.VyxoraAndroid?.subscribeToCompany) {
      window.VyxoraAndroid.subscribeToCompany(String(state.empresa.id));
    }
  } catch (e) { console.warn('NÃ£o foi possÃ­vel ativar o push nativo:', e); }
}

function openMobileMenu() {
  const overlay = $('mobileMenuOverlay'), drawer = $('mobileMenuDrawer');
  if (overlay) overlay.classList.add('open');
  if (drawer) drawer.classList.add('open');
  document.body.classList.add('menu-open');
}

function closeMobileMenu() {
  const overlay = $('mobileMenuOverlay'), drawer = $('mobileMenuDrawer');
  if (overlay) overlay.classList.remove('open');
  if (drawer) drawer.classList.remove('open');
  document.body.classList.remove('menu-open');
}

function menuOpenPublic() { closeMobileMenu(); openPublic(); }
function menuCopyPublicLink() { closeMobileMenu(); copyPublicLink(); }
function menuNotifications() {
  closeMobileMenu(); clearNotifDot();
  const stack = $('notifStack');
  if (stack) stack.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = $('view-' + view);
  if (target) target.classList.add('active');
  // Reseta scroll ao trocar de aba no mobile
  if (window.innerWidth <= 768) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const dm = document.querySelector('.dash-main');
    if (dm) dm.scrollTop = 0;
  }
  const navMap = {
    dashboard: ['Dashboard', 'Controle completo do seu negócio.'],
    agenda: ['Agenda', 'Criar e acompanhar horários.'],
    clientes: ['Clientes', 'Cadastro de clientes.'],
    servicos: ['Serviços', 'Catálogo e preços.'],
    profissionais: ['Profissionais', 'Equipe de atendimento.'],
    financeiro: ['Financeiro', 'Valores e resultados.'],
    relatorios: ['Relatórios', 'Dados e métricas.'],
    config: ['Configurações', 'Dados do negócio.']
  };
  const info = navMap[view] || ['', ''];
  setText('pageTitle', info[0]);
  setText('pageSub', info[1]);

  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', (b.getAttribute('onclick') || '').includes(`'${view}'`));
  });
  document.querySelectorAll('.mob-nav-btn').forEach(b => {
    b.classList.toggle('active', (b.getAttribute('onclick') || '').includes(`'${view}'`));
  });
}

function openAuth(mode) {
  const overlay = $('authOverlay');
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  if (mode === 'login') showLogin(); else showCadastro();
}

function closeAuth() {
  const overlay = $('authOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function showLogin() {
  const fl = $('formLogin'), fc = $('formCadastro');
  if (fc) fc.style.display = 'none';
  if (fl) fl.style.display = 'block';
}

function showCadastro() {
  const fl = $('formLogin'), fc = $('formCadastro');
  if (fl) fl.style.display = 'none';
  if (fc) fc.style.cssText = 'display:block !important; visibility:visible !important;';
  if (typeof _mostrarStep === 'function') _mostrarStep(1);
  preencherSelectCategorias();
}

// ── STEPS DO CADASTRO ──
function _mostrarStep(n) {
  ['step1', 'step2', 'step3'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) { el.style.cssText = 'display:none !important; visibility:hidden !important;'; el.classList.remove('active'); }
  });
  const alvo = document.getElementById('step' + n);
  if (alvo) { alvo.style.cssText = 'display:block !important; visibility:visible !important;'; alvo.classList.add('active'); }
  ['st1', 'st2', 'st3'].forEach(function(id, i) {
    const dot = document.getElementById(id);
    if (!dot) return;
    dot.className = 'step-dot' + (i + 1 === n ? ' active' : (i + 1 < n ? ' done' : ''));
  });
}

function setStep(n) { _mostrarStep(n); }
function goStep1() { _mostrarStep(1); }

function goStep2() {
  const nome = $('cadNome')?.value?.trim();
  const email = $('cadEmail')?.value?.trim();
  const senha = $('cadSenha')?.value?.trim();
  if (!nome || !email || !senha) return toast('Preencha nome, e-mail e senha.', 'err');
  if (senha.length < 6) return toast('Senha mínimo 6 caracteres.', 'err');
  preencherSelectCategorias(); _mostrarStep(2);
}

function goStep3() {
  const empNome = $('empNome')?.value?.trim();
  const empSlug = $('empSlug')?.value?.trim();
  const empWhatsapp = $('empWhatsapp')?.value?.trim();
  if (!empNome || !empSlug || !empWhatsapp) return toast('Preencha nome, link e WhatsApp.', 'err');
  _mostrarStep(3);
}

function autoSlug() {
  const el = $('empSlug');
  if (!el || el.dataset.manual === '1') return;
  const nomeEl = $('empNome');
  if (nomeEl) el.value = slugify(nomeEl.value || '');
}

document.addEventListener('input', function(e) {
  if (e.target && e.target.id === 'empSlug') e.target.dataset.manual = '1';
  ajustarFonteCampo(e.target);
});

document.addEventListener('change', function(e) { ajustarFonteCampo(e.target); });

async function loginComSenha() {
  const email = ($('loginEmail')?.value || '').trim();
  const senha = ($('loginSenha')?.value || '').trim();
  if (!email || !senha) return toast('Digite e-mail e senha.', 'err');
  try {
    const { data, error } = await db.auth.signInWithPassword({ email, password: senha });
    if (error || !data.user) return toast(error?.message || 'E-mail ou senha incorretos.', 'err');
    const ok = await carregarConta(data.user);
    if (!ok) { await db.auth.signOut(); return toast('Perfil ou empresa não encontrado. Refaça o cadastro.', 'err'); }
    showNotif('Login realizado!', 'Bem-vindo de volta.', 'ok', 4000);
  } catch (e) { console.error('Erro no login:', e); toast('Erro ao fazer login. Tente novamente.', 'err'); }
}

async function finalizarCadastro() {
  const servNome = $('servNome')?.value?.trim();
  const servPreco = $('servPreco')?.value;
  const servDuracao = $('servDuracao')?.value;
  const profNomeVal = $('profNome')?.value?.trim();
  if (!servNome || !servPreco || !servDuracao || !profNomeVal) return toast('Preencha serviço, preço, duração e profissional.', 'err');
  const email = ($('cadEmail')?.value || '').trim();
  const senha = ($('cadSenha')?.value || '').trim();
  const nomeUser = ($('cadNome')?.value || '').trim();
  const empNomeVal = ($('empNome')?.value || '').trim();
  const empSlugVal = slugify($('empSlug')?.value || empNomeVal);
  const empWhatsappVal = ($('empWhatsapp')?.value || '').trim();
  const catSelect = $('empCategoria');
  const areaAtuacao = catSelect ? (catSelect.options[catSelect.selectedIndex]?.textContent?.trim() || 'Outro') : 'Outro';
  const btnFin = $('btnFinalizar');
  if (btnFin) { btnFin.disabled = true; btnFin.textContent = 'Criando...'; }
  try {
    // O cadastro passa pelo mesmo dominio do site. Isso evita que bloqueadores de
    // privacidade interrompam a rota externa /auth/v1/signup com "Failed to fetch".
    const signupResponse = await fetch('/api/auth-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: senha, nome: nomeUser })
    });
    const signupPayload = await signupResponse.json().catch(() => ({}));
    const authErr = signupResponse.ok ? null : new Error(signupPayload.error || 'Nao foi possivel criar a conta.');
    const authData = signupPayload.data || null;
    if (authErr) {
      if (btnFin) { btnFin.disabled = false; btnFin.textContent = 'Criar painel →'; }
      if (authErr.message && authErr.message.toLowerCase().includes('already registered')) return toast('Este e-mail já está cadastrado. Faça login.', 'err');
      return toast('Erro ao criar conta: ' + authErr.message, 'err');
    }
    if (!authData?.user) {
      if (btnFin) { btnFin.disabled = false; btnFin.textContent = 'Criar painel →'; }
      return toast('Erro ao criar conta. Tente novamente.', 'err');
    }
    if (authData.session?.access_token && authData.session?.refresh_token) {
      const { error: sessionErr } = await db.auth.setSession({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token
      });
      if (sessionErr) throw sessionErr;
    }
    const user = authData.user;
    const { data: slugExiste } = await db.from('agenda_empresas').select('id').eq('slug', empSlugVal).maybeSingle();
    const slugFinal = slugExiste ? empSlugVal + '-' + Date.now().toString().slice(-4) : empSlugVal;
    const { data: empresa, error: errEmp } = await db.from('agenda_empresas').insert({
      nome: empNomeVal, slug: slugFinal, area_atuacao: areaAtuacao,
      whatsapp: empWhatsappVal, email: email, plano: 'Grátis', onboarding_finalizado: true
    }).select('*').single();
    if (errEmp || !empresa) {
      console.error('Erro ao criar empresa:', errEmp);
      if (btnFin) { btnFin.disabled = false; btnFin.textContent = 'Criar painel →'; }
      return toast('Erro ao criar empresa: ' + (errEmp?.message || 'tente novamente.'), 'err');
    }
    const { error: perfilErr } = await db.from('agenda_perfis').insert({
      auth_user_id: user.id, empresa_id: empresa.id, nome: nomeUser,
      email: email, whatsapp: empWhatsappVal, cargo: 'Administrador'
    });
    if (perfilErr) console.error('Erro ao criar perfil:', perfilErr);
    await db.from('agenda_servicos').insert({
      empresa_id: empresa.id, nome: servNome, preco: Number(servPreco || 0),
      duracao_minutos: Number(servDuracao || 60), status: 'ativo', descricao: 'Serviço inicial.'
    });
    await db.from('agenda_profissionais').insert({
      empresa_id: empresa.id, nome: profNomeVal,
      especialidade: ($('profEsp')?.value || 'Profissional').trim(),
      telefone: empWhatsappVal, status: 'ativo'
    });
    const { data: loginData, error: loginErr } = await db.auth.signInWithPassword({ email, password: senha });
    if (loginErr || !loginData?.user) {
      if (btnFin) { btnFin.disabled = false; btnFin.textContent = 'Criar painel →'; }
      closeAuth(); toast('Conta criada! Faça login para acessar.', 'ok');
      setTimeout(() => openAuth('login'), 1500); return;
    }
    state.user = loginData.user;
    state.perfil = { auth_user_id: loginData.user.id, empresa_id: empresa.id, nome: nomeUser, email };
    state.empresa = empresa;
    showDashboard(); await loadAll();
    showNotif('Bem-vindo ao VyXora Agendas!', empresa.nome + ' — painel criado com sucesso.', 'ok', 7000);
  } catch (e) {
    console.error('Erro em finalizarCadastro:', e);
    if (btnFin) { btnFin.disabled = false; btnFin.textContent = 'Criar painel →'; }
    toast('Erro inesperado. Verifique o console e tente novamente.', 'err');
  }
}

async function logout() {
  try {
    if (window.VyxoraAndroid?.clearCompanySubscription) {
      window.VyxoraAndroid.clearCompanySubscription();
    }
    if (autoSyncTimer) { clearInterval(autoSyncTimer); autoSyncTimer = null; }
    if (realtimeChannel) { try { db.removeChannel(realtimeChannel); } catch(e) {} realtimeChannel = null; }
    await db.auth.signOut();
  } catch(e) {}
  state.user = null; state.perfil = null; state.empresa = null;
  state.clientes = []; state.servicos = []; state.profissionais = [];
  state.agendamentos = []; state.pagamentos = [];
  location.href = location.pathname;
}

function setupRealtime() {
  if (!state?.empresa?.id || !db?.channel) return;
  if (realtimeChannel) { try { db.removeChannel(realtimeChannel); } catch(e) {} realtimeChannel = null; }
  const id = state.empresa.id;
  const tables = ['agenda_agendamentos', 'agenda_clientes', 'agenda_servicos', 'agenda_profissionais'];
  let ch = db.channel('ap-realtime-' + id);
  tables.forEach(table => {
    ch = ch.on('postgres_changes', { event: '*', schema: 'public', table, filter: `empresa_id=eq.${id}` }, payload => {
      if (table === 'agenda_agendamentos' && payload.eventType === 'INSERT') {
        showNotif('Novo agendamento!', `${payload.new?.cliente_nome || 'Cliente'} acabou de agendar.`, 'new', 6000);
      }
      scheduleReload();
    });
  });
  realtimeChannel = ch.subscribe();
}

let _reloadTimer = null;
function scheduleReload() {
  if (_reloadTimer) clearTimeout(_reloadTimer);
  _reloadTimer = setTimeout(async () => { if (state?.empresa?.id) await loadAll(); }, 400);
}

function startAutoSync() {
  if (autoSyncTimer) clearInterval(autoSyncTimer);
  lastIds = new Set((state.agendamentos || []).map(a => String(a.id)));
  autoSyncTimer = setInterval(async () => {
    if (!state?.empresa?.id) return;
    try {
      const { data } = await db.from('agenda_agendamentos').select('*').eq('empresa_id', state.empresa.id).order('criado_em', { ascending: false });
      const novos = (data || []).filter(a => !lastIds.has(String(a.id)));
      state.agendamentos = ordenarAgendamentosRecentes(data);
      if (novos.length) novos.forEach(a => showNotif('Novo agendamento!', `${a.cliente_nome || 'Cliente'} agendou.`, 'new', 6000));
      lastIds = new Set(state.agendamentos.map(a => String(a.id)));
      renderAll();
    } catch (e) {}
  }, 5000);
}

function preserveAgendaFormValues(callback) {
  const values = {
    cliente: $('agCliente')?.value || '', telefone: $('agTelefone')?.value || '',
    servico: $('agServico')?.value || '', profissional: $('agProfissional')?.value || '',
    data: $('agData')?.value || '', hora: $('agHora')?.value || '', status: $('agStatus')?.value || ''
  };
  if (typeof callback === 'function') callback();
  if ($('agCliente') && values.cliente) $('agCliente').value = values.cliente;
  if ($('agTelefone') && values.telefone) $('agTelefone').value = values.telefone;
  if ($('agServico') && values.servico && [...$('agServico').options].some(o => o.value === values.servico)) $('agServico').value = values.servico;
  if ($('agProfissional') && values.profissional && [...$('agProfissional').options].some(o => o.value === values.profissional)) $('agProfissional').value = values.profissional;
  if ($('agData') && values.data) $('agData').value = values.data;
  if ($('agHora') && values.hora) $('agHora').value = values.hora;
  if ($('agStatus') && values.status) $('agStatus').value = values.status;
}

async function loadAll() {
  if (!state.empresa) return;
  const id = state.empresa.id;
  try {
    const [cli, svc, prof, ag, pag] = await Promise.all([
      db.from('agenda_clientes').select('*').eq('empresa_id', id).order('criado_em', { ascending: false }),
      db.from('agenda_servicos').select('*').eq('empresa_id', id).order('criado_em', { ascending: false }),
      db.from('agenda_profissionais').select('*').eq('empresa_id', id).order('criado_em', { ascending: false }),
      db.from('agenda_agendamentos').select('*').eq('empresa_id', id).order('criado_em', { ascending: false }),
      db.from('agenda_pagamentos').select('*').eq('empresa_id', id).order('criado_em', { ascending: false })
    ]);
    state.clientes = cli.data || []; state.servicos = svc.data || [];
    state.profissionais = prof.data || []; state.agendamentos = ordenarAgendamentosRecentes(ag.data);
    state.pagamentos = pag.data || [];
    lastIds = new Set(state.agendamentos.map(a => String(a.id)));
    renderAll();
  } catch (e) { console.error('Erro ao carregar dados:', e); }
}

function renderAll() {
  preserveAgendaFormValues(() => {
    renderStats(); renderDashList(); renderCalendar(); renderSelects();
    renderTimeline(); renderClientes(); renderServicos(); renderProfissionais(); renderFinanceiro();
    const active = document.activeElement;
    const editingConfig = active && active.closest && active.closest('#view-config');
    if (!editingConfig) renderConfig();
  });
  ajustarFontesCampos();
}

function renderStats() {
  const hoje = hojeISO(), mes = mesPrefixo(), ags = state.agendamentos || [];
  const ativos = ags.filter(a => normStatus(a.status) !== 'Excluído');
  const st = s => ativos.filter(a => normStatus(a.status) === s).length;
  const stAll = s => ags.filter(a => normStatus(a.status) === s).length;
  const concluidos = st('Concluído');
  const base = ativos.filter(a => normStatus(a.status) !== 'Recusado').length;
  const taxa = base > 0 ? Math.round(concluidos / base * 100) : 0;
  const fin = ags.filter(isFinanceiro);
  const fatHoje = fin.filter(a => dataConclusaoISO(a) === hoje).reduce((s, a) => s + Number(a.valor || 0), 0);
  const fatMes = fin.filter(a => dataConclusaoISO(a).startsWith(mes)).reduce((s, a) => s + Number(a.valor || 0), 0);
  setText('statHoje', ativos.filter(a => a.data === hoje).length);
  setText('statPendentes', st('Pendente')); setText('statConfirmados', st('Confirmado'));
  setText('statReagendados', st('Reagendado')); setText('statConcluidos', concluidos);
  setText('statRecusados', st('Recusado')); setText('statExcluidos', stAll('Excluído'));
  setText('statTaxa', taxa + '%');
  setText('statFatHoje', money(fatHoje).replace(',00', ''));
  setText('statFatMes', money(fatMes).replace(',00', ''));
  setText('statClientes', (state.clientes || []).filter(isAtivoCliente).length);
  setText('statServicos', (state.servicos || []).filter(s => s.status === 'ativo').length);
  setText('statProfissionais', (state.profissionais || []).filter(p => p.status === 'ativo').length);
  setText('statTotal', ativos.length);
  setText('fc-todos', ativos.length); setText('fc-pendente', st('Pendente'));
  setText('fc-confirmado', st('Confirmado')); setText('fc-reagendado', st('Reagendado'));
  setText('fc-concluido', concluidos); setText('fc-recusado', st('Recusado'));
  setText('fc-excluido', stAll('Excluído'));
}

function renderDashList() {
  const el = $('dashAptList');
  if (!el) return;
  const visibles = ordenarAtendimentosAgendados(state.agendamentos)
    .filter(a => ['Pendente', 'Confirmado', 'Reagendado'].includes(normStatus(a.status))).slice(0, 6);
  if (!visibles.length) {
    el.innerHTML = '<div class="empty-state"><div class="es-icon">📅</div><p>Nenhum agendamento pendente.</p></div>'; return;
  }
  el.innerHTML = visibles.map(a => `
    <div class="apt-item">
      <div class="apt-row">
        <div class="apt-av">${initial(a.cliente_nome)}</div>
        <div class="apt-info">
          <div class="apt-name">${a.cliente_nome || 'Cliente'}</div>
          <div class="apt-meta">${a.servico_nome || '—'} · ${a.profissional_nome || '—'} · ${formatDate(a.data)} ${a.hora || ''}</div>
        </div>
        <span class="badge ${badgeClass(a.status)}">${normStatus(a.status)}</span>
      </div>
      ${renderAcoes(a)}
    </div>`).join('');
}

function renderCalendar() {
  const el = $('calGrid');
  if (!el) return;
  const days = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  const hoje = new Date();
  const anoAtual = hoje.getFullYear(), mesAtual = hoje.getMonth();
  const totalDias = new Date(anoAtual, mesAtual + 1, 0).getDate();
  const busy = new Set(
    (state.agendamentos || []).filter(a => {
      if (normStatus(a.status) === 'Excluído' || !a.data) return false;
      const d = new Date(a.data + 'T00:00:00');
      return d.getFullYear() === anoAtual && d.getMonth() === mesAtual;
    }).map(a => String(new Date(a.data + 'T00:00:00').getDate()))
  );
  const today = String(hoje.getDate());
  let html = days.map(d => `<div class="cal-label">${d}</div>`).join('');
  for (let i = 1; i <= totalDias; i++) {
    const d = String(i);
    html += `<div class="cal-day${busy.has(d) ? ' busy' : ''}${d === today ? ' today' : ''}">${i}</div>`;
  }
  el.innerHTML = html;
}

function renderSelects() {
  const agS = $('agServico'), agP = $('agProfissional');
  const selectedServico = agS ? agS.value : '';
  const selectedProfissional = agP ? agP.value : '';
  if (agS) {
    agS.innerHTML = '<option value="">Escolha serviço</option>' +
      (state.servicos || []).filter(s => (s.status || 'ativo') === 'ativo')
        .map(s => `<option value="${s.id}">${s.nome} — ${money(s.preco).replace(',00','')}</option>`).join('');
    if (selectedServico && [...agS.options].some(o => o.value === selectedServico)) agS.value = selectedServico;
  }
  if (agP) {
    agP.innerHTML = '<option value="">Escolha profissional</option>' +
      (state.profissionais || []).filter(p => (p.status || 'ativo') === 'ativo')
        .map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
    if (selectedProfissional && [...agP.options].some(o => o.value === selectedProfissional)) agP.value = selectedProfissional;
  }
}

function setFilter(filter, btn) {
  _agendaFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTimeline();
}

function renderTimeline() {
  const el = $('agendaTimeline');
  if (!el) return;
  const ags = ordenarAgendamentosRecentes(state.agendamentos);
  if (!ags.length) {
    el.innerHTML = '<div class="empty-state"><div class="es-icon">📅</div><p>Nenhum agendamento ainda.</p></div>'; return;
  }
  const statusMap = { pendente: 'Pendente', confirmado: 'Confirmado', reagendado: 'Reagendado', concluido: 'Concluído', recusado: 'Recusado', excluido: 'Excluído' };
  let filtered;
  if (_agendaFilter === 'excluido') filtered = ags.filter(a => normStatus(a.status) === 'Excluído');
  else if (_agendaFilter !== 'todos') { const target = statusMap[_agendaFilter]; filtered = ags.filter(a => normStatus(a.status) === target); }
  else filtered = ags.filter(a => normStatus(a.status) !== 'Excluído');
  if (!filtered.length) {
    el.innerHTML = '<div class="empty-state"><div class="es-icon">📅</div><p>Nenhum agendamento neste filtro.</p></div>'; return;
  }
  el.innerHTML = '';
  filtered.forEach(a => {
    const block = document.createElement('div');
    block.className = 'tl-block'; block.id = 'ag-' + a.id;
    block.innerHTML = `
      <div class="tl-time">${a.hora || '—'}</div>
      <div class="tl-line"></div>
      <div class="tl-content">
        <div class="tl-card">
          <div class="tl-card-top">
            <div class="apt-av" style="width:34px;height:34px;border-radius:9px;flex-shrink:0">${initial(a.cliente_nome)}</div>
            <div class="tl-card-info">
              <div class="tl-card-name">${a.cliente_nome || 'Cliente'}</div>
              <div class="tl-card-meta">${a.servico_nome || '—'} · ${a.profissional_nome || '—'} · ${formatDate(a.data)}${a.cliente_telefone ? ' · ' + a.cliente_telefone : ''}</div>
            </div>
            <div class="tl-card-status"><span class="badge ${badgeClass(a.status)}">${normStatus(a.status)}</span></div>
          </div>
          ${renderAcoes(a)}
        </div>
      </div>`;
    const card = block.querySelector('.tl-card');
    const menu = buildActionMenu(a.id, [
      { icon: '✏️', label: 'Editar', action: () => editAgendamento(a.id) },
      { icon: '📋', label: 'Duplicar', action: () => duplicarAgendamento(a.id) },
      'sep',
      { icon: '🗑', label: 'Excluir', cls: 'danger', action: () => excluirAgendamento(a.id) }
    ]);
    if (card) card.appendChild(menu);
    el.appendChild(block);
  });
}

function renderAcoes(a) {
  const tel = (a.cliente_telefone || a.telefone || '').replace(/\D/g, '');
  const s = normStatus(a.status);
  if (s === 'Excluído') return `<div class="apt-actions muted-actions"><span class="badge badge-gray">🗑 Excluído</span></div>`;
  if (s === 'Recusado') return `<div class="apt-actions muted-actions"><span class="badge badge-red">✕ Recusado</span></div>`;
  if (s === 'Concluído') return `<div class="apt-actions muted-actions">
    <span class="badge badge-blue">✓ Concluído</span>
    ${tel ? `<button class="act-btn whatsapp" onclick="abrirWA('${a.id}')">💬 WA</button>` : ''}
    <button class="act-btn refuse" onclick="excluirAgendamento('${a.id}')">🗑 Arquivar</button>
  </div>`;
  return `<div class="apt-actions">
    ${s !== 'Confirmado' ? `<button class="act-btn confirm" onclick="confirmarAg('${a.id}')">✅ Confirmar</button>` : ''}
    <button class="act-btn refuse" onclick="openModalRecusa('${a.id}')">✕ Recusar</button>
    <button class="act-btn reschedule" onclick="openModalReagendar('${a.id}')">📅 Reagendar</button>
    <button class="act-btn conclude" onclick="concluirAg('${a.id}')">✓ Concluir</button>
    ${tel ? `<button class="act-btn whatsapp" onclick="abrirWA('${a.id}')">💬 WA</button>` : ''}
  </div>`;
}

function buildActionMenu(id, items) {
  const wrap = document.createElement('div'); wrap.className = 'action-menu';
  const btn = document.createElement('button'); btn.className = 'action-menu-btn'; btn.innerHTML = '⋮'; btn.type = 'button';
  const drop = document.createElement('div'); drop.className = 'action-dropdown';
  items.forEach(item => {
    if (item === 'sep') { const s = document.createElement('div'); s.className = 'action-sep'; drop.appendChild(s); return; }
    const el = document.createElement('button'); el.type = 'button';
    el.className = 'action-item' + (item.cls ? ' ' + item.cls : '');
    el.innerHTML = `<span class="action-item-icon">${item.icon}</span>${item.label}`;
    el.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); closeAllMenus(); setTimeout(() => item.action(), 50); });
    drop.appendChild(el);
  });
  btn.addEventListener('click', e => {
    e.stopPropagation(); e.preventDefault();
    if (_openMenu === drop) { closeAllMenus(); return; }
    closeAllMenus();
    const rect = btn.getBoundingClientRect(), dropW = 200;
    const viewportW = window.innerWidth;
    const viewportH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    let left = rect.right - dropW, top = rect.bottom + 6;
    if (left < 8) left = rect.left;
    if (left + dropW > viewportW - 8) left = viewportW - dropW - 8;
    if (top + 200 > viewportH - 8) top = rect.top - 210;
    drop.style.top = top + 'px'; drop.style.left = left + 'px'; drop.style.minWidth = dropW + 'px';
    document.body.appendChild(drop); drop.classList.add('open'); _openMenu = drop; _openMenuBtn = btn;
  });
  wrap.appendChild(btn); wrap.appendChild(drop); return wrap;
}

function closeAllMenus() {
  if (_openMenu) { _openMenu.classList.remove('open'); if (_openMenu.parentElement === document.body) document.body.removeChild(_openMenu); _openMenu = null; _openMenuBtn = null; }
  document.querySelectorAll('body > .action-dropdown').forEach(d => { d.classList.remove('open'); if (d.parentElement === document.body) document.body.removeChild(d); });
}

function renderClientes() {
  const el = $('clientesGrid');
  if (!el) return;
  const clientes = state.clientes || [];
  if (!clientes.length) { el.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="es-icon">👥</div><p>Nenhum cliente ainda.</p></div>'; return; }
  el.innerHTML = '';
  clientes.forEach(c => {
    const agts = (state.agendamentos || []).filter(a => a.cliente_nome === c.nome && normStatus(a.status) !== 'Excluído').length;
    const gasto = (state.agendamentos || []).filter(a => a.cliente_nome === c.nome && isFinanceiro(a)).reduce((s, a) => s + Number(a.valor || 0), 0);
    const ativo = isAtivoCliente(c);
    const card = document.createElement('div'); card.className = 'client-card' + (ativo ? '' : ' inactive');
    card.innerHTML = `
      <div class="cc-top">
        <div class="cc-av">${initial(c.nome)}</div>
        <div style="flex:1;min-width:0"><div class="cc-name">${c.nome}</div><div class="cc-phone">${c.telefone || '—'}</div></div>
      </div>
      ${c.email ? `<div style="font-size:11.5px;color:var(--text4);margin-bottom:8px;word-break:break-all">✉ ${c.email}</div>` : ''}
      <div style="margin-bottom:9px"><span class="badge ${ativo ? 'badge-green' : 'badge-gray'}">${ativo ? 'Ativo' : 'Inativo'}</span></div>
      <div class="cc-stats">
        <div class="cc-stat"><div class="cc-sl">Atendimentos</div><div class="cc-sv">${agts}</div></div>
        <div class="cc-stat"><div class="cc-sl">Total gasto</div><div class="cc-sv" style="font-size:14px">${money(gasto).replace(',00', '')}</div></div>
      </div>`;
    const menu = buildActionMenu(c.id, [
      { icon: '✏️', label: 'Editar', action: () => editCliente(c.id) },
      { icon: '📋', label: 'Duplicar', action: () => duplicarCliente(c.id) }, 'sep',
      ativo ? { icon: '⏸', label: 'Desativar', cls: 'danger', action: () => toggleCliente(c.id, false) }
             : { icon: '▶️', label: 'Ativar', cls: 'success', action: () => toggleCliente(c.id, true) },
      { icon: '🗑', label: 'Excluir', cls: 'danger', action: () => excluirCliente(c.id) }
    ]);
    card.appendChild(menu); el.appendChild(card);
  });
}

function renderServicos() {
  const el = $('servicosGrid');
  if (!el) return;
  const vis = (state.servicos || []).filter(s => s.status !== 'excluido');
  if (!vis.length) { el.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="es-icon">✦</div><p>Nenhum serviço ainda.</p></div>'; return; }
  el.innerHTML = '';
  vis.forEach(s => {
    const ativo = s.status === 'ativo';
    const card = document.createElement('div'); card.className = 'svc-card' + (ativo ? '' : ' inactive');
    card.innerHTML = `
      <div class="svc-price">${money(s.preco).replace(',00', '')}</div>
      <div class="svc-name">${s.nome}</div>
      <div class="svc-dur">⏱ ${s.duracao_minutos || 60} min</div>
      <div class="svc-status"><span class="badge ${ativo ? 'badge-green' : 'badge-gray'}">${ativo ? 'Ativo' : 'Inativo'}</span></div>`;
    const menu = buildActionMenu(s.id, [
      { icon: '✏️', label: 'Editar', action: () => editServico(s.id) },
      { icon: '📋', label: 'Duplicar', action: () => duplicarServico(s.id) }, 'sep',
      ativo ? { icon: '⏸', label: 'Desativar', cls: 'danger', action: () => toggleServico(s.id, 'inativo') }
             : { icon: '▶️', label: 'Ativar', cls: 'success', action: () => toggleServico(s.id, 'ativo') },
      { icon: '🗑', label: 'Excluir', cls: 'danger', action: () => excluirServico(s.id) }
    ]);
    card.appendChild(menu); el.appendChild(card);
  });
}

function renderProfissionais() {
  const el = $('profGrid');
  if (!el) return;
  const vis = (state.profissionais || []).filter(p => p.status !== 'excluido');
  if (!vis.length) { el.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="es-icon">👤</div><p>Nenhum profissional ainda.</p></div>'; return; }
  el.innerHTML = '';
  vis.forEach(p => {
    const ativo = p.status === 'ativo';
    const card = document.createElement('div'); card.className = 'prof-card' + (ativo ? '' : ' inactive');
    card.innerHTML = `
      <div class="prof-av">${initial(p.nome)}</div>
      <div class="prof-name">${p.nome}</div>
      <div class="prof-esp">${p.especialidade || 'Profissional'}</div>
      ${p.telefone ? `<div class="prof-phone">📱 ${p.telefone}</div>` : ''}
      <div class="online-dot${ativo ? '' : ' off'}">${ativo ? 'Online' : 'Offline'}</div>`;
    const menu = buildActionMenu(p.id, [
      { icon: '✏️', label: 'Editar', action: () => editProfissional(p.id) },
      { icon: '📋', label: 'Duplicar', action: () => duplicarProfissional(p.id) }, 'sep',
      ativo ? { icon: '⏸', label: 'Desativar', cls: 'danger', action: () => toggleProfissional(p.id, 'inativo') }
             : { icon: '▶️', label: 'Ativar', cls: 'success', action: () => toggleProfissional(p.id, 'ativo') },
      { icon: '🗑', label: 'Excluir', cls: 'danger', action: () => excluirProfissional(p.id) }
    ]);
    card.appendChild(menu); el.appendChild(card);
  });
}

function renderFinanceiro() {
  const fin = (state.agendamentos || []).filter(isFinanceiro);
  const total = fin.reduce((s, a) => s + Number(a.valor || 0), 0);
  const ticket = fin.length ? total / fin.length : 0;
  setText('finReceita', money(total).replace(',00', ''));
  setText('finTicket', money(ticket).replace(',00', ''));
  setText('finPagos', fin.length);
  setText('finPlano', state.empresa?.plano || 'Grátis');
}

function renderConfig() {
  const e = state.empresa || {};
  const set = (id, v) => { const el = $(id); if (el) el.value = v || ''; };
  set('cfgNome', e.nome); set('cfgWhatsapp', e.whatsapp); set('cfgSlug', e.slug);
  set('cfgCep', e.cep); set('cfgEndereco', e.endereco); set('cfgCidade', e.cidade);
  set('cfgInstagram', e.instagram); set('cfgFacebook', e.facebook);
  set('cfgTiktok', e.tiktok); set('cfgSite', e.site);
  renderPreviewImagem('previewFotoPerfil', e.foto_perfil_url);
  renderPreviewImagem('previewFotoPublica', e.foto_publica_url);
  const enquadramentoPerfil = getEnquadramentoFoto('perfil', e);
  const enquadramentoPublico = getEnquadramentoFoto('publica', e);
  aplicarEnquadramentoFoto($('previewFotoPerfil'), enquadramentoPerfil.x, enquadramentoPerfil.y, enquadramentoPerfil.zoom);
  aplicarEnquadramentoFoto($('previewFotoPublica'), enquadramentoPublico.x, enquadramentoPublico.y, enquadramentoPublico.zoom);
  const mensagens = getMensagensWhatsapp();
  set('msgConfirmacao', mensagens.confirmacao); set('msgRecusa', mensagens.recusa);
  set('msgReagendamento', mensagens.reagendamento); set('msgContato', mensagens.contato);
  const diasMap = [
    { campo: 'seg', id: 'diaSeg' }, { campo: 'ter', id: 'diaTer' },
    { campo: 'qua', id: 'diaQua' }, { campo: 'qui', id: 'diaQui' },
    { campo: 'sex', id: 'diaSex' }, { campo: 'sab', id: 'diaSab' },
    { campo: 'dom', id: 'diaDom' }
  ];
  // Verifica se empresa nunca configurou os dias (todos os campos são null)
  const nuncaConfigurou = diasMap.every(({ campo }) => e[campo] === null || e[campo] === undefined);
  const padraoDias = ['seg','ter','qua','qui','sex']; // padrão para empresa nova
  diasMap.forEach(({ campo, id }) => {
    const btn = $(id); if (!btn) return;
    const ativo = nuncaConfigurou ? padraoDias.includes(campo) : e[campo] === true;
    if (ativo) btn.classList.add('ativo'); else btn.classList.remove('ativo');
  });
  const hi = $('cfgHorarioInicio'); if (hi) hi.value = e.horario_inicio || '09:00';
  const hf = $('cfgHorarioFim'); if (hf) hf.value = e.horario_fim || '18:00';
  const intervaloAtual = String(e.intervalo_slots || 60);
  const isHidden = $('cfgIntervaloSlots'); if (isHidden) isHidden.value = intervaloAtual;
  document.querySelectorAll('.intervalo-btn').forEach(b => {
    b.classList.toggle('ativo', b.dataset.val === intervaloAtual);
  });
  const lb = $('cfgLinkBox');
  if (lb) lb.textContent = '🔗 ' + publicUrl(e.slug || '');
}

function setConfigTab(tab, botao) {
  document.querySelectorAll('.config-tab').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.config-tab-panel').forEach(item => item.classList.remove('active'));
  if (botao) botao.classList.add('active');
  document.querySelector(`[data-config-tab="${tab}"]`)?.classList.add('active');
  document.querySelectorAll('[data-config-section]').forEach(item => {
    item.classList.toggle('active', item.dataset.configSection === tab);
  });
  const secoes = {
    empresa: ['Dados da empresa', 'Informações principais do seu negócio.', 'Dados <em>da empresa.</em>'],
    redes: ['Redes sociais', 'Links exibidos na sua página pública.', 'Redes <em>sociais.</em>'],
    horarios: ['Horários', 'Dias disponíveis para receber agendamentos.', 'Horários <em>de funcionamento.</em>'],
    mensagens: ['Mensagens', 'Textos automáticos enviados pelo WhatsApp.', 'Mensagens <em>automáticas.</em>'],
    fotos: ['Fotos', 'Imagens usadas no painel e na página pública.', 'Fotos <em>de perfil.</em>']
  };
  const info = secoes[tab] || secoes.empresa;
  setText('pageTitle', info[0]); setText('pageSub', info[1]);
  const titulo = $('configHeroTitle'), subtitulo = $('configHeroSub');
  if (titulo) titulo.innerHTML = info[2];
  if (subtitulo) subtitulo.textContent = info[1];
}

function toggleDia(btn) {
  if (!btn) return;
  btn.classList.toggle('ativo');
}

function selecionarIntervalo(btn) {
  document.querySelectorAll('.intervalo-btn').forEach(b => b.classList.remove('ativo'));
  btn.classList.add('ativo');
  const hidden = document.getElementById('cfgIntervaloSlots');
  if (hidden) hidden.value = btn.dataset.val;
}

function openConfigSection(tab = 'empresa') { setView('config'); setConfigTab(tab); closeMobileMenu(); }

async function salvarCliente() {
  const nome = ($('cliNome')?.value || '').trim();
  if (!nome) return toast('Digite o nome.', 'err');
  const { error } = await db.from('agenda_clientes').insert({
    empresa_id: state.empresa.id, nome,
    telefone: ($('cliTel')?.value || '').trim(),
    email: ($('cliEmail')?.value || '').trim(), status: 'ativo'
  });
  if (error) return toast('Erro ao salvar: ' + error.message, 'err');
  if ($('cliNome')) $('cliNome').value = '';
  if ($('cliTel')) $('cliTel').value = '';
  if ($('cliEmail')) $('cliEmail').value = '';
  await loadAll(); showNotif('Cliente adicionado', nome + ' salvo com sucesso.', 'ok');
}

async function salvarServico() {
  const nome = ($('srvNome')?.value || '').trim();
  if (!nome) return toast('Digite o nome.', 'err');
  const { error } = await db.from('agenda_servicos').insert({
    empresa_id: state.empresa.id, nome,
    preco: Number($('srvPreco')?.value || 0),
    duracao_minutos: Number($('srvDur')?.value || 60), status: 'ativo'
  });
  if (error) return toast('Erro ao salvar: ' + error.message, 'err');
  if ($('srvNome')) $('srvNome').value = '';
  if ($('srvPreco')) $('srvPreco').value = '';
  if ($('srvDur')) $('srvDur').value = '';
  await loadAll(); showNotif('Serviço adicionado', '', 'ok');
}

async function salvarProfissional() {
  const nome = ($('proNome')?.value || '').trim();
  if (!nome) return toast('Digite o nome.', 'err');
  const { error } = await db.from('agenda_profissionais').insert({
    empresa_id: state.empresa.id, nome,
    especialidade: ($('proEsp')?.value || '').trim(),
    telefone: ($('proTel')?.value || '').trim(), status: 'ativo'
  });
  if (error) return toast('Erro ao salvar: ' + error.message, 'err');
  if ($('proNome')) $('proNome').value = '';
  if ($('proEsp')) $('proEsp').value = '';
  if ($('proTel')) $('proTel').value = '';
  await loadAll(); showNotif('Profissional adicionado', '', 'ok');
}

async function salvarAgendamento() {
  const agCli = $('agCliente')?.value?.trim();
  const agSvc = $('agServico')?.value;
  const agProf = $('agProfissional')?.value;
  const agData = $('agData')?.value;
  const agHora = $('agHora')?.value;
  if (!agCli || !agSvc || !agProf || !agData || !agHora) return toast('Preencha todos os campos.', 'err');
  const serv = (state.servicos || []).find(s => s.id === agSvc);
  const prof = (state.profissionais || []).find(p => p.id === agProf);
  let clienteId = null;
  try {
    const { data: cli } = await db.from('agenda_clientes').insert({
      empresa_id: state.empresa.id, nome: agCli,
      telefone: ($('agTelefone')?.value || '').trim(), status: 'ativo'
    }).select('*').single();
    if (cli) clienteId = cli.id;
  } catch(e) {}
  const { error } = await db.from('agenda_agendamentos').insert({
    empresa_id: state.empresa.id, cliente_id: clienteId,
    servico_id: serv?.id || null, profissional_id: prof?.id || null,
    cliente_nome: agCli, cliente_telefone: ($('agTelefone')?.value || '').trim(),
    servico_nome: serv?.nome || '', profissional_nome: prof?.nome || '',
    data: agData, hora: agHora, status: $('agStatus')?.value || 'Pendente',
    valor: Number(serv?.preco || 0)
  });
  if (error) return toast('Erro ao salvar: ' + error.message, 'err');
  if ($('agCliente')) $('agCliente').value = '';
  if ($('agTelefone')) $('agTelefone').value = '';
  if ($('agServico')) $('agServico').value = '';
  if ($('agProfissional')) $('agProfissional').value = '';
  if ($('agStatus')) $('agStatus').value = 'Confirmado';
  if ($('agData')) { if ($('agData')._flatpickr) $('agData')._flatpickr.clear(); else $('agData').value = ''; }
  if ($('agHora')) $('agHora').value = '';
  await loadAll(); showNotif('Agendamento criado!', `${agCli} — ${formatDate(agData)} às ${agHora}.`, 'ok');
}

async function salvarConfig() {
  if (!state?.empresa?.id) return;
  const nome = ($('cfgNome')?.value || '').trim();
  if (!nome) return toast('Digite o nome.', 'err');
  const slugAtual = slugify(state.empresa.slug || '');
  const slugNovo = slugify($('cfgSlug')?.value || slugAtual);
  const updates = {
    nome, whatsapp: ($('cfgWhatsapp')?.value || '').trim(),
    cep: ($('cfgCep')?.value || '').trim(),
    endereco: ($('cfgEndereco')?.value || '').trim(), cidade: ($('cfgCidade')?.value || '').trim()
  };
  if (slugNovo !== slugAtual) {
    const { data: slugExiste } = await db.from('agenda_empresas').select('id').eq('slug', slugNovo).neq('id', state.empresa.id).maybeSingle();
    if (slugExiste) return toast('Esse link já está em uso.', 'err');
    updates.slug = slugNovo;
  }
  const { data, error } = await db.from('agenda_empresas').update(updates).eq('id', state.empresa.id).select('*').single();
  if (error) return toast('Erro ao salvar: ' + error.message, 'err');
  state.empresa = data || { ...state.empresa, ...updates };
  setText('sideNome', state.empresa.nome); renderAvatarPainel();
  const lb = $('sideLinkBox'); if (lb) lb.textContent = publicUrl(state.empresa.slug);
  renderConfig(); showNotif('Configurações salvas', '', 'ok');
}

async function salvarHorarios() {
  if (!state?.empresa?.id) return;
  const diasMap = [
    { campo: 'seg', id: 'diaSeg' }, { campo: 'ter', id: 'diaTer' },
    { campo: 'qua', id: 'diaQua' }, { campo: 'qui', id: 'diaQui' },
    { campo: 'sex', id: 'diaSex' }, { campo: 'sab', id: 'diaSab' },
    { campo: 'dom', id: 'diaDom' }
  ];
  const updates = {};
  diasMap.forEach(({ campo, id }) => { const btn = $(id); if (btn) updates[campo] = btn.classList.contains('ativo'); });
  updates.horario_inicio = $('cfgHorarioInicio')?.value || '09:00';
  updates.horario_fim = $('cfgHorarioFim')?.value || '18:00';
  updates.intervalo_slots = parseInt($('cfgIntervaloSlots')?.value || '60');
  const { data, error } = await db.from('agenda_empresas').update(updates).eq('id', state.empresa.id).select('*').single();
  if (error) return toast('Erro ao salvar horários: ' + error.message, 'err');
  state.empresa = data || { ...state.empresa, ...updates };
  showNotif('Horários de funcionamento salvos', '', 'ok');
}

async function salvarRedesSociais() {
  if (!state?.empresa?.id) return;
  const updates = {
    instagram: ($('cfgInstagram')?.value || '').trim(), facebook: ($('cfgFacebook')?.value || '').trim(),
    tiktok: ($('cfgTiktok')?.value || '').trim(), site: ($('cfgSite')?.value || '').trim()
  };
  const { data, error } = await db.from('agenda_empresas').update(updates).eq('id', state.empresa.id).select('*').single();
  if (error) return toast('Erro ao salvar redes: ' + error.message, 'err');
  state.empresa = data || { ...state.empresa, ...updates };
  showNotif('Redes sociais salvas', '', 'ok');
}

function abrirEditorFoto(tipo, input) {
  if (!state?.empresa?.id || !state?.user?.id || !input?.files?.[0]) return;
  const arquivo = input.files[0];
  const permitidos = ['image/jpeg', 'image/png', 'image/webp'];
  if (!permitidos.includes(arquivo.type)) { input.value = ''; return toast('Use uma imagem JPG, PNG ou WEBP.', 'err'); }
  if (arquivo.size > 5 * 1024 * 1024) { input.value = ''; return toast('A imagem deve ter no máximo 5 MB.', 'err'); }
  const atual = getEnquadramentoFoto(tipo);
  _fotoEditor = { tipo, input, arquivo, urlTemporaria: URL.createObjectURL(arquivo), x: atual.x, y: atual.y, zoom: atual.zoom, ponteiros: new Map(), ultimoX: 0, ultimoY: 0, distanciaAnterior: 0 };
  setText('fotoEditorTitulo', tipo === 'perfil' ? 'Ajustar foto do painel' : 'Ajustar foto pública');
  aplicarImagemFundo($('fotoEditorCircle'), _fotoEditor.urlTemporaria);
  atualizarEditorFoto();
  const overlay = $('fotoEditorOverlay'); if (overlay) overlay.classList.add('open');
}

function atualizarEditorFoto() {
  if (!_fotoEditor) return;
  _fotoEditor.zoom = Math.max(40, Math.min(300, Number(_fotoEditor.zoom) || 100));
  aplicarEnquadramentoFoto($('fotoEditorCircle'), _fotoEditor.x, _fotoEditor.y, _fotoEditor.zoom);
}

function iniciarArrasteFotoEditor(evento) {
  if (!_fotoEditor) return;
  _fotoEditor.ponteiros.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
  _fotoEditor.ultimoX = evento.clientX; _fotoEditor.ultimoY = evento.clientY;
  _fotoEditor.distanciaAnterior = distanciaEntrePonteiros();
  evento.currentTarget.setPointerCapture?.(evento.pointerId);
}

function moverFotoEditor(evento) {
  if (!_fotoEditor?.ponteiros?.has(evento.pointerId)) return;
  _fotoEditor.ponteiros.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
  const circulo = $('fotoEditorCircle'), largura = circulo?.clientWidth || 270;
  if (_fotoEditor.ponteiros.size >= 2) {
    const distanciaAtual = distanciaEntrePonteiros();
    if (_fotoEditor.distanciaAnterior) _fotoEditor.zoom += (distanciaAtual - _fotoEditor.distanciaAnterior) / largura * 180;
    _fotoEditor.distanciaAnterior = distanciaAtual; atualizarEditorFoto(); return;
  }
  _fotoEditor.x = Math.max(0, Math.min(100, _fotoEditor.x - (evento.clientX - _fotoEditor.ultimoX) / largura * 100));
  _fotoEditor.y = Math.max(0, Math.min(100, _fotoEditor.y - (evento.clientY - _fotoEditor.ultimoY) / largura * 100));
  _fotoEditor.ultimoX = evento.clientX; _fotoEditor.ultimoY = evento.clientY; atualizarEditorFoto();
}

function distanciaEntrePonteiros() {
  if (!_fotoEditor?.ponteiros || _fotoEditor.ponteiros.size < 2) return 0;
  const [a, b] = [..._fotoEditor.ponteiros.values()];
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function finalizarArrasteFotoEditor(evento) {
  if (!_fotoEditor?.ponteiros) return;
  _fotoEditor.ponteiros.delete(evento.pointerId);
  _fotoEditor.distanciaAnterior = distanciaEntrePonteiros();
}

function zoomFotoEditor(evento) {
  if (!_fotoEditor) return; evento.preventDefault();
  _fotoEditor.zoom += evento.deltaY < 0 ? 10 : -10; atualizarEditorFoto();
}

function fecharEditorFoto() {
  const overlay = $('fotoEditorOverlay'); if (overlay) overlay.classList.remove('open');
  if (_fotoEditor?.urlTemporaria) URL.revokeObjectURL(_fotoEditor.urlTemporaria);
  if (_fotoEditor?.input) _fotoEditor.input.value = '';
  _fotoEditor = null;
}

document.addEventListener('pointermove', moverFotoEditor);
document.addEventListener('pointerup', finalizarArrasteFotoEditor);
document.addEventListener('pointercancel', finalizarArrasteFotoEditor);
document.addEventListener('DOMContentLoaded', () => { $('fotoEditorCircle')?.addEventListener('wheel', zoomFotoEditor, { passive: false }); });

async function salvarFotoEditor() {
  if (!state?.empresa?.id || !state?.user?.id || !_fotoEditor) return;
  const { tipo, input, arquivo, x, y, zoom } = _fotoEditor;
  const btn = $('fotoEditorSalvar');
  if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }
  const extensao = (arquivo.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const caminho = `${state.user.id}/${tipo}-${Date.now()}.${extensao}`;
  const coluna = tipo === 'perfil' ? 'foto_perfil_url' : 'foto_publica_url';
  const prefixo = tipo === 'perfil' ? 'foto_perfil' : 'foto_publica';
  const { error: uploadError } = await db.storage.from('fotos-perfil').upload(caminho, arquivo, { cacheControl: '3600', upsert: false, contentType: arquivo.type });
  if (uploadError) { if (btn) { btn.disabled = false; btn.textContent = 'Salvar foto'; } return toast('Erro ao enviar imagem: ' + uploadError.message, 'err'); }
  const { data: publica } = db.storage.from('fotos-perfil').getPublicUrl(caminho);
  const url = publica?.publicUrl || '';
  if (!url) { if (btn) { btn.disabled = false; btn.textContent = 'Salvar foto'; } return toast('Não foi possível gerar o link da imagem.', 'err'); }
  const updates = { [coluna]: url, [`${prefixo}_x`]: Math.round(x), [`${prefixo}_y`]: Math.round(y), [`${prefixo}_zoom`]: Math.round(zoom) };
  const { data, error } = await db.from('agenda_empresas').update(updates).eq('id', state.empresa.id).select('*').single();
  if (error) { if (btn) { btn.disabled = false; btn.textContent = 'Salvar foto'; } return toast('Imagem enviada, mas não foi possível vinculá-la: ' + error.message, 'err'); }
  state.empresa = data || { ...state.empresa, ...updates };
  renderPreviewImagem(tipo === 'perfil' ? 'previewFotoPerfil' : 'previewFotoPublica', url);
  aplicarEnquadramentoFoto($(tipo === 'perfil' ? 'previewFotoPerfil' : 'previewFotoPublica'), x, y, zoom);
  if (tipo === 'perfil') renderAvatarPainel();
  if (btn) { btn.disabled = false; btn.textContent = 'Salvar foto'; }
  fecharEditorFoto(); showNotif(tipo === 'perfil' ? 'Foto do painel atualizada' : 'Imagem pública atualizada', '', 'ok');
}

async function salvarMensagensWhatsapp() {
  if (!state?.empresa?.id) return;
  const mensagens = {
    confirmacao: ($('msgConfirmacao')?.value || '').trim(), recusa: ($('msgRecusa')?.value || '').trim(),
    reagendamento: ($('msgReagendamento')?.value || '').trim(), contato: ($('msgContato')?.value || '').trim()
  };
  if (Object.values(mensagens).some(msg => !msg)) return toast('Preencha todas as mensagens.', 'err');
  if (Object.values(mensagens).some(msg => msg.includes('\uFFFD'))) return toast('Existe um caractere inválido nas mensagens. Remova o símbolo e digite o emoji novamente.', 'err');
  const nomes = { confirmacao: 'Confirmação', recusa: 'Recusa', reagendamento: 'Reagendamento', contato: 'Contato pelo botão WA' };
  for (const [tipo, obrigatorios] of Object.entries(MARCADORES_OBRIGATORIOS)) {
    const ausentes = obrigatorios.filter(marcador => !mensagens[tipo].includes(marcador));
    if (ausentes.length) return toast(`${nomes[tipo]}: inclua ${ausentes.join(', ')}.`, 'err');
  }
  const { data, error } = await db.from('agenda_empresas').update({ mensagens_whatsapp: mensagens }).eq('id', state.empresa.id).select('*').single();
  if (error) return toast('Erro ao salvar mensagens. Verifique a configuração do Supabase.', 'err');
  state.empresa = data || { ...state.empresa, mensagens_whatsapp: mensagens };
  showNotif('Mensagens automáticas salvas', '', 'ok');
}

function restaurarMensagensWhatsappPadrao() {
  const set = (id, valor) => { const el = $(id); if (el) el.value = valor; };
  set('msgConfirmacao', MENSAGENS_WHATSAPP_PADRAO.confirmacao); set('msgRecusa', MENSAGENS_WHATSAPP_PADRAO.recusa);
  set('msgReagendamento', MENSAGENS_WHATSAPP_PADRAO.reagendamento); set('msgContato', MENSAGENS_WHATSAPP_PADRAO.contato);
  toast('Modelos padrão restaurados. Clique em Salvar mensagens.', 'ok');
}

async function confirmarAg(id) {
  let ag = (state.agendamentos || []).find(a => a.id === id);
  let tel = (ag?.cliente_telefone || ag?.telefone || '').replace(/\D/g, '');
  let janelaWhatsapp = reservarJanelaWhatsapp(tel);
  if (!ag) {
    // Agendamento criado/atualizado pela IA pode não estar no state ainda — busca no Supabase
    const { data, error: fetchErr } = await db.from('agenda_agendamentos').select('*').eq('id', id).single();
    if (fetchErr || !data) return toast('Agendamento não encontrado.', 'err');
    ag = data;
    // Adiciona ao state para manter consistência
    if (state.agendamentos) state.agendamentos.push(ag);
    else state.agendamentos = [ag];
    tel = (ag.cliente_telefone || ag.telefone || '').replace(/\D/g, '');
    if (tel && !janelaWhatsapp) janelaWhatsapp = reservarJanelaWhatsapp(tel);
  }
  const { error } = await db.from('agenda_agendamentos').update({ status: 'Confirmado' }).eq('id', id);
  if (error) {
    if (janelaWhatsapp && !janelaWhatsapp.closed) janelaWhatsapp.close();
    return toast('Erro ao confirmar.', 'err');
  }
  ag.status = 'Confirmado'; renderAll();
  showNotif('Confirmado!', ag.cliente_nome + ' — ' + formatDate(ag.data) + ' às ' + (ag.hora || '—'), 'ok');
  if (tel) abrirLinkWhatsapp(tel, montarMensagemWhatsapp('confirmacao', ag), janelaWhatsapp);
}

async function concluirAg(id) {
  const ag = (state.agendamentos || []).find(a => a.id === id); if (!ag) return;
  const concluidoEm = new Date().toISOString();
  const { error } = await db.from('agenda_agendamentos').update({ status: 'Concluído', financeiro_status: 'Concluído', concluido_em: concluidoEm }).eq('id', id);
  if (error) return toast('Erro ao concluir.', 'err');
  ag.status = 'Concluído'; ag.financeiro_status = 'Concluído'; ag.concluido_em = concluidoEm;
  renderAll(); showNotif('Concluído!', ag.cliente_nome + ' — ' + (ag.servico_nome || '—'), 'ok');
}

function abrirWA(id) {
  const ag = (state.agendamentos || []).find(a => a.id === id); if (!ag) return;
  const tel = (ag.cliente_telefone || ag.telefone || '').replace(/\D/g, '');
  if (!tel) return toast('Telefone não cadastrado.', 'err');
  const msg = montarMensagemWhatsapp('contato', ag);
  abrirLinkWhatsapp(tel, msg);
}

function openModalRecusa(id) {
  const ag = (state.agendamentos || []).find(a => a.id === id); if (!ag) return;
  if (!podeTerAcoes(ag)) return toast('Este agendamento não permite recusa.', 'warn');
  _recusaId = id; _recusaMotivo = null;
  setText('recusaInfo', `${ag.cliente_nome} · ${formatDate(ag.data)} às ${ag.hora || '—'}`);
  document.querySelectorAll('.motivo-item').forEach(el => { el.classList.remove('sel'); const r = el.querySelector('.motivo-radio'); if (r) r.innerHTML = ''; });
  const rmc = $('recusaMotivoCustom'); if (rmc) rmc.value = '';
  const overlay = $('modalRecusaOverlay'); if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModalRecusa() {
  const overlay = $('modalRecusaOverlay'); if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
  _recusaId = null; _recusaMotivo = null;
}

function selectMotivo(el, motivo) {
  document.querySelectorAll('.motivo-item').forEach(o => { o.classList.remove('sel'); const r = o.querySelector('.motivo-radio'); if (r) r.innerHTML = ''; });
  el.classList.add('sel'); _recusaMotivo = motivo;
}

async function confirmarRecusa() {
  if (!_recusaId) return;
  const motivo = ($('recusaMotivoCustom')?.value || '').trim() || _recusaMotivo;
  if (!motivo) return toast('Escolha um motivo.', 'err');
  const ag = (state.agendamentos || []).find(a => a.id === _recusaId); if (!ag) return;
  const tel = (ag.cliente_telefone || ag.telefone || '').replace(/\D/g, '');
  const janelaWhatsapp = reservarJanelaWhatsapp(tel);
  const { error } = await db.from('agenda_agendamentos').update({ status: 'Recusado', observacoes: motivo }).eq('id', _recusaId);
  if (error) {
    if (janelaWhatsapp && !janelaWhatsapp.closed) janelaWhatsapp.close();
    return toast('Erro ao recusar.', 'err');
  }
  ag.status = 'Recusado'; closeModalRecusa(); renderAll();
  showNotif('Recusado', ag.cliente_nome + ' — ' + motivo, 'info');
  if (tel) {
    const pubLink = state.empresa ? publicUrl(state.empresa.slug) : '';
    abrirLinkWhatsapp(tel, montarMensagemWhatsapp('recusa', ag, { motivo, link: pubLink }), janelaWhatsapp);
  }
}

function openModalReagendar(id) {
  const ag = (state.agendamentos || []).find(a => a.id === id); if (!ag) return;
  if (!podeTerAcoes(ag)) return toast('Este agendamento não permite reagendamento.', 'warn');
  _reagendarId = id;
  setText('reagendarInfo', `${ag.cliente_nome} · ${formatDate(ag.data)} às ${ag.hora || '—'}`);
  const rd = $('reagendarData'); if (rd) rd.value = ag.data || '';
  const rh = $('reagendarHora'); if (rh) rh.value = ag.hora || '';
  const overlay = $('modalReagendarOverlay'); if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModalReagendar() {
  const overlay = $('modalReagendarOverlay'); if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
  _reagendarId = null;
}

async function confirmarReagendar() {
  if (!_reagendarId) return;
  const data = $('reagendarData')?.value, hora = $('reagendarHora')?.value;
  if (!data || !hora) return toast('Escolha nova data e hora.', 'err');
  const ag = (state.agendamentos || []).find(a => a.id === _reagendarId); if (!ag) return;
  const tel = (ag.cliente_telefone || ag.telefone || '').replace(/\D/g, '');
  const janelaWhatsapp = reservarJanelaWhatsapp(tel);
  const { error } = await db.from('agenda_agendamentos').update({ data, hora, status: 'Reagendado' }).eq('id', _reagendarId);
  if (error) {
    if (janelaWhatsapp && !janelaWhatsapp.closed) janelaWhatsapp.close();
    return toast('Erro ao reagendar.', 'err');
  }
  ag.data = data; ag.hora = hora; ag.status = 'Reagendado';
  closeModalReagendar(); renderAll();
  showNotif('Reagendado!', ag.cliente_nome + ' → ' + formatDate(data) + ' às ' + hora, 'ok');
  if (tel) abrirLinkWhatsapp(tel, montarMensagemWhatsapp('reagendamento', ag, { novaData: data, novaHora: hora }), janelaWhatsapp);
}

function openConfirmModal({ icon = '⚠️', type = 'danger', title = 'Tem certeza?', body = 'Esta ação não pode ser desfeita.', btnLabel = 'Confirmar', cb }) {
  const wrap = $('confirmIconWrap'); if (wrap) { wrap.className = 'confirm-icon-wrap ' + type; wrap.textContent = icon; }
  setText('confirmTitle', title); setText('confirmBody', body);
  const btn = $('confirmActionBtn');
  if (btn) { btn.textContent = btnLabel; btn.className = 'btn ' + (type === 'danger' ? 'btn-danger' : 'btn-primary'); }
  _confirmCb = cb;
  const overlay = $('confirmOverlay'); if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeConfirmModal() {
  const overlay = $('confirmOverlay'); if (overlay) overlay.classList.remove('open'); _confirmCb = null;
  document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', function() {
  const confirmBtn = $('confirmActionBtn');
  if (confirmBtn) confirmBtn.addEventListener('click', () => { if (_confirmCb) _confirmCb(); closeConfirmModal(); });
  const confirmOverlay = $('confirmOverlay');
  if (confirmOverlay) confirmOverlay.addEventListener('click', e => { if (e.target === confirmOverlay) closeConfirmModal(); });
  const editOverlay = $('editOverlay');
  if (editOverlay) editOverlay.addEventListener('click', e => { if (e.target === editOverlay) closeEditModal(); });
  const modalRecusaOverlay = $('modalRecusaOverlay');
  if (modalRecusaOverlay) modalRecusaOverlay.addEventListener('click', e => { if (e.target === modalRecusaOverlay) closeModalRecusa(); });
  const modalReagendarOverlay = $('modalReagendarOverlay');
  if (modalReagendarOverlay) modalReagendarOverlay.addEventListener('click', e => { if (e.target === modalReagendarOverlay) closeModalReagendar(); });
  const pubDataInput = $('pubData');
  if (pubDataInput) pubDataInput.addEventListener('change', function() { validarDataPublica(this.value); });
});

function validarDataPublica(dataStr) {
  const aviso = $('pubDataAviso'), inputData = $('pubData');
  if (!aviso || !inputData) return true;
  if (!dataStr) { aviso.style.display = 'none'; inputData.style.borderColor = ''; return true; }
  const diasFechados = state.pubDiasFechados || [];
  const fechado = isDiaFechado(dataStr, diasFechados);
  if (fechado) {
    aviso.style.display = 'block'; inputData.style.borderColor = '#ef4444';
    inputData.style.boxShadow = '0 0 0 2px rgba(239,68,68,0.2)'; return false;
  } else { aviso.style.display = 'none'; inputData.style.borderColor = ''; inputData.style.boxShadow = ''; return true; }
}

function openEditModal(title, bodyHtml, saveCb) {
  setText('editModalTitle', title);
  const body = $('editModalBody'); if (body) body.innerHTML = bodyHtml;
  _editSaveCb = saveCb;
  const saveBtn = $('editSaveBtn'); if (saveBtn) saveBtn.onclick = () => { if (_editSaveCb) _editSaveCb(); };
  const overlay = $('editOverlay'); if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeEditModal() {
  const overlay = $('editOverlay'); if (overlay) overlay.classList.remove('open'); _editSaveCb = null;
  document.body.style.overflow = '';
}

function editServico(id) {
  const s = (state.servicos || []).find(x => x.id === id); if (!s) return;
  openEditModal('Editar Serviço', `
    <div class="form-gap">
      <div class="field"><label>Nome</label><input id="ed_sn" value="${s.nome || ''}"></div>
      <div class="field-row">
        <div class="field"><label>Preço (R$)</label><input id="ed_sp" type="number" value="${s.preco || 0}"></div>
        <div class="field"><label>Duração (min)</label><input id="ed_sd" type="number" value="${s.duracao_minutos || 60}"></div>
      </div>
    </div>`, async () => {
    const nome = ($('ed_sn')?.value || '').trim(); if (!nome) return toast('Preencha o nome.', 'err');
    const { error } = await db.from('agenda_servicos').update({ nome, preco: Number($('ed_sp')?.value || 0), duracao_minutos: Number($('ed_sd')?.value || 60) }).eq('id', id);
    if (error) return toast('Erro ao salvar.', 'err');
    closeEditModal(); await loadAll(); showNotif('Serviço atualizado', '', 'ok');
  });
}

function editProfissional(id) {
  const p = (state.profissionais || []).find(x => x.id === id); if (!p) return;
  const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const diasSemana = parseDiasSemana(p.dias_semana);
  const diasHtml = dias.map((d,i) => `
    <label class="dia-check">
      <input type="checkbox" id="ed_dia_${i}" ${diasSemana.includes(i) ? 'checked' : ''}>
      <span>${d}</span>
    </label>`).join('');
  openEditModal('Editar Profissional', `
    <div class="form-gap">
      <div class="field"><label>Nome</label><input id="ed_pn" value="${p.nome || ''}"></div>
      <div class="field"><label>Especialidade</label><input id="ed_pe" value="${p.especialidade || ''}"></div>
      <div class="field"><label>Telefone</label><input id="ed_pt" value="${p.telefone || ''}"></div>
    </div>`, async () => {
    const nome = ($('ed_pn')?.value || '').trim(); if (!nome) return toast('Preencha o nome.', 'err');
    const { error } = await db.from('agenda_profissionais').update({
      nome, especialidade: ($('ed_pe')?.value || '').trim(), telefone: ($('ed_pt')?.value || '').trim()
    }).eq('id', id);
    if (error) return toast('Erro ao salvar.', 'err');
    closeEditModal(); await loadAll(); showNotif('Profissional atualizado', '', 'ok');
  });
}

function editCliente(id) {
  const c = (state.clientes || []).find(x => x.id === id); if (!c) return;
  openEditModal('Editar Cliente', `
    <div class="form-gap">
      <div class="field"><label>Nome</label><input id="ed_cn" value="${c.nome || ''}"></div>
      <div class="field"><label>Telefone</label><input id="ed_ct" value="${c.telefone || ''}"></div>
      <div class="field"><label>E-mail</label><input id="ed_ce" value="${c.email || ''}"></div>
    </div>`, async () => {
    const nome = ($('ed_cn')?.value || '').trim(); if (!nome) return toast('Preencha o nome.', 'err');
    const { error } = await db.from('agenda_clientes').update({ nome, telefone: ($('ed_ct')?.value || '').trim(), email: ($('ed_ce')?.value || '').trim() }).eq('id', id);
    if (error) return toast('Erro ao salvar.', 'err');
    closeEditModal(); await loadAll(); showNotif('Cliente atualizado', '', 'ok');
  });
}

function editAgendamento(id) {
  const a = (state.agendamentos || []).find(x => x.id === id); if (!a) return;
  const svcopts = (state.servicos || []).filter(s => s.status === 'ativo').map(s => `<option value="${s.id}"${s.id === a.servico_id ? ' selected' : ''}>${s.nome}</option>`).join('');
  const profopts = (state.profissionais || []).filter(p => p.status === 'ativo').map(p => `<option value="${p.id}"${p.id === a.profissional_id ? ' selected' : ''}>${p.nome}</option>`).join('');
  openEditModal('Editar Agendamento', `
    <div class="form-gap">
      <div class="field-row">
        <div class="field"><label>Cliente</label><input id="ed_ac" value="${a.cliente_nome || ''}"></div>
        <div class="field"><label>Telefone</label><input id="ed_atel" value="${a.cliente_telefone || ''}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Serviço</label><select id="ed_as">${svcopts}</select></div>
        <div class="field"><label>Profissional</label><select id="ed_ap">${profopts}</select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Data</label><input id="ed_ad" type="date" value="${a.data || ''}"></div>
        <div class="field"><label>Hora</label><input id="ed_ah" type="time" value="${a.hora || ''}"></div>
      </div>
      <div class="field"><label>Status</label><select id="ed_ast">
        <option${normStatus(a.status) === 'Confirmado' ? ' selected' : ''}>Confirmado</option>
        <option${normStatus(a.status) === 'Pendente' ? ' selected' : ''}>Pendente</option>
        <option${normStatus(a.status) === 'Reagendado' ? ' selected' : ''}>Reagendado</option>
        <option${normStatus(a.status) === 'Concluído' ? ' selected' : ''}>Concluído</option>
        <option${normStatus(a.status) === 'Recusado' ? ' selected' : ''}>Recusado</option>
        <option${normStatus(a.status) === 'Excluído' ? ' selected' : ''}>Excluído</option>
      </select></div>
    </div>`, async () => {
    const cli = ($('ed_ac')?.value || '').trim(), data = $('ed_ad')?.value, hora = $('ed_ah')?.value;
    if (!cli || !data || !hora) return toast('Preencha cliente, data e hora.', 'err');
    const serv = (state.servicos || []).find(s => s.id === $('ed_as')?.value);
    const prof = (state.profissionais || []).find(p => p.id === $('ed_ap')?.value);
    const status = $('ed_ast')?.value || 'Pendente';
    const updates = {
      cliente_nome: cli, cliente_telefone: ($('ed_atel')?.value || '').trim(),
      servico_id: $('ed_as')?.value || null, profissional_id: $('ed_ap')?.value || null,
      servico_nome: serv?.nome || a.servico_nome, profissional_nome: prof?.nome || a.profissional_nome,
      data, hora, status, valor: Number(serv?.preco || a.valor || 0)
    };
    if (normStatus(status) === 'Concluído') { updates.financeiro_status = 'Concluído'; updates.concluido_em = a.concluido_em || new Date().toISOString(); }
    const { error } = await db.from('agenda_agendamentos').update(updates).eq('id', id);
    if (error) return toast('Erro ao salvar.', 'err');
    closeEditModal(); await loadAll(); showNotif('Agendamento atualizado', '', 'ok');
  });
}

async function duplicarServico(id) {
  const s = (state.servicos || []).find(x => x.id === id); if (!s) return;
  await db.from('agenda_servicos').insert({ empresa_id: state.empresa.id, nome: s.nome + ' (cópia)', preco: s.preco, duracao_minutos: s.duracao_minutos, status: 'ativo' });
  await loadAll(); showNotif('Serviço duplicado', '', 'info');
}

async function duplicarProfissional(id) {
  const p = (state.profissionais || []).find(x => x.id === id); if (!p) return;
  await db.from('agenda_profissionais').insert({ empresa_id: state.empresa.id, nome: p.nome + ' (cópia)', especialidade: p.especialidade, telefone: p.telefone, status: 'ativo' });
  await loadAll(); showNotif('Profissional duplicado', '', 'info');
}

async function duplicarCliente(id) {
  const c = (state.clientes || []).find(x => x.id === id); if (!c) return;
  await db.from('agenda_clientes').insert({ empresa_id: state.empresa.id, nome: c.nome + ' (cópia)', telefone: c.telefone, email: c.email, status: 'ativo' });
  await loadAll(); showNotif('Cliente duplicado', '', 'info');
}

async function duplicarAgendamento(id) {
  const a = (state.agendamentos || []).find(x => x.id === id); if (!a) return;
  await db.from('agenda_agendamentos').insert({
    empresa_id: state.empresa.id, cliente_id: a.cliente_id, servico_id: a.servico_id,
    profissional_id: a.profissional_id, cliente_nome: a.cliente_nome, cliente_telefone: a.cliente_telefone,
    servico_nome: a.servico_nome, profissional_nome: a.profissional_nome,
    data: a.data, hora: a.hora, status: 'Pendente', valor: a.valor
  });
  await loadAll(); showNotif('Agendamento duplicado como Pendente', '', 'info');
}

function toggleServico(id, ns) {
  const s = (state.servicos || []).find(x => x.id === id); if (!s) return;
  openConfirmModal({ icon: ns === 'ativo' ? '▶️' : '⏸', type: ns === 'ativo' ? 'info' : 'danger', title: ns === 'ativo' ? 'Ativar serviço?' : 'Desativar serviço?', body: `"${s.nome}"`, btnLabel: ns === 'ativo' ? 'Ativar' : 'Desativar',
    cb: async () => { await db.from('agenda_servicos').update({ status: ns }).eq('id', id); await loadAll(); showNotif(ns === 'ativo' ? 'Serviço ativado' : 'Serviço desativado', '', 'ok'); }
  });
}

function toggleProfissional(id, ns) {
  const p = (state.profissionais || []).find(x => x.id === id); if (!p) return;
  openConfirmModal({ icon: ns === 'ativo' ? '▶️' : '⏸', type: ns === 'ativo' ? 'info' : 'danger', title: ns === 'ativo' ? 'Ativar profissional?' : 'Desativar?', body: `"${p.nome}"`, btnLabel: ns === 'ativo' ? 'Ativar' : 'Desativar',
    cb: async () => { await db.from('agenda_profissionais').update({ status: ns }).eq('id', id); await loadAll(); showNotif(ns === 'ativo' ? 'Profissional ativado' : 'Profissional desativado', '', 'ok'); }
  });
}

function toggleCliente(id, ativar) {
  const c = (state.clientes || []).find(x => x.id === id); if (!c) return;
  openConfirmModal({ icon: ativar ? '▶️' : '⏸', type: ativar ? 'info' : 'danger', title: ativar ? 'Ativar cliente?' : 'Desativar?', body: `"${c.nome}"`, btnLabel: ativar ? 'Ativar' : 'Desativar',
    cb: async () => { await db.from('agenda_clientes').update({ status: ativar ? 'ativo' : 'inativo' }).eq('id', id); await loadAll(); showNotif(ativar ? 'Cliente ativado' : 'Cliente desativado', '', 'ok'); }
  });
}

function excluirServico(id) {
  const s = (state.servicos || []).find(x => x.id === id); if (!s) return;
  openConfirmModal({ icon: '🗑', type: 'danger', title: 'Excluir serviço?', body: `"${s.nome}"`, btnLabel: 'Excluir',
    cb: async () => { await db.from('agenda_servicos').update({ status: 'excluido' }).eq('id', id); await loadAll(); showNotif('Serviço excluído', '', 'info'); }
  });
}

function excluirProfissional(id) {
  const p = (state.profissionais || []).find(x => x.id === id); if (!p) return;
  openConfirmModal({ icon: '🗑', type: 'danger', title: 'Excluir profissional?', body: `"${p.nome}"`, btnLabel: 'Excluir',
    cb: async () => { await db.from('agenda_profissionais').update({ status: 'excluido' }).eq('id', id); await loadAll(); showNotif('Profissional excluído', '', 'info'); }
  });
}

function excluirCliente(id) {
  const c = (state.clientes || []).find(x => x.id === id); if (!c) return;
  openConfirmModal({ icon: '🗑', type: 'danger', title: 'Excluir cliente?', body: `"${c.nome}"`, btnLabel: 'Excluir',
    cb: async () => { await db.from('agenda_clientes').update({ status: 'inativo' }).eq('id', id); await loadAll(); showNotif('Cliente removido', '', 'info'); }
  });
}

function excluirAgendamento(id) {
  const a = (state.agendamentos || []).find(x => x.id === id); if (!a) return;
  const jaFoi = normStatus(a.status) === 'Concluído' || a.financeiro_status === 'Concluído';
  openConfirmModal({ icon: '🗑', type: 'danger', title: jaFoi ? 'Arquivar agendamento?' : 'Excluir agendamento?',
    body: `"${a.cliente_nome}" em ${formatDate(a.data)}.${jaFoi ? ' O faturamento será preservado.' : ''}`, btnLabel: jaFoi ? 'Arquivar' : 'Excluir',
    cb: async () => {
      const payload = jaFoi ? { status: 'Excluído', financeiro_status: 'Concluído' } : { status: 'Excluído' };
      const { error } = await db.from('agenda_agendamentos').update(payload).eq('id', id);
      if (error) return toast('Erro ao excluir.', 'err');
      await loadAll(); showNotif(jaFoi ? 'Agendamento arquivado' : 'Agendamento excluído', jaFoi ? 'Faturamento mantido.' : '', 'info');
    }
  });
}

function copyPublicLink(button = null) {
  if (!state?.empresa?.slug) return;
  const link = publicUrl(state.empresa.slug);
  if (navigator.clipboard) navigator.clipboard.writeText(link).catch(() => {});
  if (button?.classList?.contains('dash-copy-button')) {
    const label = button.querySelector('.dash-copy-label');
    button.classList.add('is-copied');
    if (label) label.textContent = '✓ Link copiado!';
    clearTimeout(button._copyResetTimer);
    button._copyResetTimer = setTimeout(() => {
      button.classList.remove('is-copied');
      if (label) label.textContent = 'Copiar link da agenda';
    }, 2400);
  }
  showNotif('Link copiado!', link, 'ok', 3000);
}

function openPublic() {
  if (!state?.empresa?.slug) return;
  history.pushState(null, '', '#agendar/' + state.empresa.slug);
  loadPublic(state.empresa.slug);
}

async function loadPublic(slug) {
  const lv = $('landingView'), dv = $('dashboardView'), pv = $('publicView');
  if (lv) lv.style.display = 'none';
  if (dv) dv.style.display = 'none';
  if (pv) pv.style.display = 'block';
  const { data: empresa, error } = await db.from('agenda_empresas').select('*').eq('slug', slug).single();
  if (error || !empresa) { setText('pubNomeEmpresa', 'Agenda não encontrada'); setText('pubDescEmpresa', 'Verifique se o link está correto.'); return; }
  state.pubEmpresa = empresa;
  state.pubDiasFechados = calcDiasFechados(empresa);
  aplicarBloqueioDataPublica(state.pubDiasFechados);
  setText('pubNomeEmpresa', empresa.nome);
  setText('pubDescEmpresa', (empresa.area_atuacao || 'Agendamento Online') + ' • WhatsApp: ' + (empresa.whatsapp || 'Não informado'));
  const fotoPublica = $('pubFotoPublica');
  if (fotoPublica) {
    if (empresa.foto_publica_url) {
      aplicarImagemFundo(fotoPublica, empresa.foto_publica_url);
      const enquadramento = getEnquadramentoFoto('publica', empresa);
      aplicarEnquadramentoFoto(fotoPublica, enquadramento.x, enquadramento.y, enquadramento.zoom);
      fotoPublica.className = 'pub-cover';
      fotoPublica.innerHTML = '';
      fotoPublica.style.display = 'block';
    } else {
      // Sem foto: exibe avatar com iniciais do nome da empresa
      const iniciais = (empresa.nome || 'VY')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p[0].toUpperCase())
        .join('');
      fotoPublica.className = 'pub-cover pub-cover-inicial';
      fotoPublica.style.backgroundImage = '';
      fotoPublica.innerHTML = `<span class="pub-cover-letra">${iniciais}</span>`;
      fotoPublica.style.display = 'block';
    }
  }
  const localizacao = $('pubLocalizacao');
  if (localizacao) {
    const enderecoCompleto = [empresa.endereco, empresa.cidade].filter(Boolean).join(' • ');
    localizacao.innerHTML = enderecoCompleto ? `<span>📍</span><span style="flex:1">${escapeHtml(enderecoCompleto)}</span><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoCompleto)}" target="_blank" rel="noopener">Ver mapa</a>` : '';
    localizacao.style.display = enderecoCompleto ? 'flex' : 'none';
  }
  const sociais = $('pubSociais');
  if (sociais) {
    let html = '';
    const enderecoCompleto = [empresa.endereco, empresa.cidade].filter(Boolean).join(' • ');
    if (enderecoCompleto) html += `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoCompleto)}" target="_blank" rel="noopener" class="pub-social">📍 ${escapeHtml(enderecoCompleto)}</a>`;
    if (empresa.instagram) { const h = empresa.instagram.replace('@', '').replace(/.*instagram\.com\//, ''); html += `<a href="${escapeHtml(normalizarUrl(h, 'https://instagram.com/'))}" target="_blank" rel="noopener" class="pub-social">📸 @${escapeHtml(h)}</a>`; }
    if (empresa.facebook) { const url = /facebook\.com\//i.test(empresa.facebook) ? normalizarUrl(empresa.facebook) : normalizarUrl(empresa.facebook, 'https://facebook.com/'); html += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="pub-social">f Facebook</a>`; }
    if (empresa.tiktok) { const h = empresa.tiktok.replace('@', '').replace(/.*tiktok\.com\/@?/, ''); html += `<a href="https://tiktok.com/@${escapeHtml(h)}" target="_blank" rel="noopener" class="pub-social">♪ @${escapeHtml(h)}</a>`; }
    if (empresa.site) { const url = normalizarUrl(empresa.site); const lbl = empresa.site.replace(/^https?:\/\//, '').replace(/\/$/, ''); html += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="pub-social">🌐 ${escapeHtml(lbl)}</a>`; }
    sociais.innerHTML = html; sociais.style.display = html ? 'flex' : 'none';
  }
  // Botão WhatsApp flutuante
  const fab = $('pubWhatsappFab');
  if (fab && empresa.whatsapp) {
    const num = empresa.whatsapp.replace(/\D/g, '');
    fab.href = `https://wa.me/${num}`;
    fab.style.display = 'flex';
  } else if (fab) {
    fab.style.display = 'none';
  }
  const [svcs, profs] = await Promise.all([
    db.from('agenda_servicos').select('*').eq('empresa_id', empresa.id).eq('status', 'ativo').order('nome'),
    db.from('agenda_profissionais').select('*').eq('empresa_id', empresa.id).eq('status', 'ativo').order('nome')
  ]);
  state.servicos = svcs.data || []; state.profissionais = profs.data || [];
  const ps = $('pubServicos');
  if (ps) {
    ps.innerHTML = state.servicos.map(s => `
      <div class="choice" onclick="selectPubSvc('${s.id}',this)">
        <div class="choice-icon">✦</div>
        <div style="flex:1;min-width:0"><div class="choice-title">${s.nome}</div><div class="choice-sub">${s.duracao_minutos || 60} min</div></div>
        <div class="choice-price">${money(s.preco).replace(',00', '')}</div>
      </div>`).join('') || '<div class="empty-state"><div class="es-icon">✦</div><p>Nenhum serviço disponível.</p></div>';
  }
  const pp = $('pubProfissionais');
  if (pp) {
    pp.innerHTML = state.profissionais.map(p => `
      <div class="choice" onclick="selectPubProf('${p.id}',this)">
        <div class="choice-icon">👤</div>
        <div style="flex:1;min-width:0"><div class="choice-title">${p.nome}</div><div class="choice-sub">${p.especialidade || 'Profissional'}</div></div>
      </div>`).join('') || '<div class="empty-state"><div class="es-icon">👤</div><p>Nenhum profissional disponível.</p></div>';
  }
}

function aplicarBloqueioDataPublica(diasFechados) {
  const inputData = $('pubData'); if (!inputData) return;
  const diasBloqueados = Array.isArray(diasFechados) ? diasFechados : [];
  if (inputData._diaFechadoListener) inputData.removeEventListener('change', inputData._diaFechadoListener);
  inputData._diaFechadoListener = function() { validarDataPublica(this.value); };
  inputData.addEventListener('change', inputData._diaFechadoListener);
  const hoje = hojeISO(); inputData.min = hoje;
  if (inputData._flatpickr) {
    const hojeLocal = new Date(); hojeLocal.setHours(0, 0, 0, 0);
    inputData._flatpickr.set('onDayCreate', [(_, __, ___, dayElem) => {
      if (diasBloqueados.includes(dayElem.dateObj.getDay())) dayElem.classList.add('dia-fechado');
      else if (dayElem.dateObj >= hojeLocal) dayElem.classList.add('dia-disponivel');
    }]);
    inputData._flatpickr.set('minDate', hoje);
    inputData._flatpickr.set('disable', [date => diasBloqueados.includes(date.getDay())]);
    inputData._flatpickr.redraw();
    if (!inputData._flatpickr.calendarContainer.querySelector('.calendar-legenda')) {
      const legenda = document.createElement('div'); legenda.className = 'calendar-legenda';
      legenda.innerHTML = `<span><i class="calendar-dot disponivel"></i>Disponível</span><span><i class="calendar-dot indisponivel"></i>Indisponível</span>`;
      inputData._flatpickr.calendarContainer.appendChild(legenda);
    }
    if (isDiaFechado(inputData.value, diasBloqueados)) inputData._flatpickr.clear();
  }
  validarDataPublica(inputData.value);
}

function selectPubSvc(id, el) {
  state.pubServico = (state.servicos || []).find(s => s.id === id);
  document.querySelectorAll('#pubServicos .choice').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
}

function selectPubProf(id, el) {
  state.pubProfissional = (state.profissionais || []).find(p => p.id === id);
  document.querySelectorAll('#pubProfissionais .choice').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
}

async function confirmarAgendamentoPublico() {
  const pubNome = $('pubClienteNome')?.value?.trim(), pubTel = $('pubClienteTel')?.value?.trim();
  const pubData = $('pubData')?.value, pubHora = $('pubHora')?.value;
  if (!state.pubEmpresa || !state.pubServico || !state.pubProfissional || !pubNome || !pubTel || !pubData || !pubHora) return toast('Preencha tudo para confirmar.', 'err');
  if (isDiaFechado(pubData, state.pubDiasFechados || [])) { validarDataPublica(pubData); return toast('Este dia não está disponível. Escolha outra data.', 'err'); }
  // Mostra tela de observação antes de salvar
  const mb = $('pubMainBody'), ob = $('pubObsScreen');
  if (mb) mb.style.display = 'none';
  if (ob) ob.style.display = 'block';
}

async function finalizarAgendamentoPublico() {
  const pubNome = $('pubClienteNome')?.value?.trim(), pubTel = $('pubClienteTel')?.value?.trim();
  const pubData = $('pubData')?.value, pubHora = $('pubHora')?.value;
  const ob = $('pubObsScreen'), cs = $('pubConfirmScreen');
  if (ob) ob.style.display = 'none';
  try {
    let clienteId = null;
    const { data: cli } = await db.from('agenda_clientes').insert({ empresa_id: state.pubEmpresa.id, nome: pubNome, telefone: pubTel, status: 'ativo' }).select('*').single();
    if (cli) clienteId = cli.id;
    const { data: novoAgendamento, error } = await db.from('agenda_agendamentos').insert({
      empresa_id: state.pubEmpresa.id, cliente_id: clienteId,
      servico_id: state.pubServico.id, profissional_id: state.pubProfissional.id,
      cliente_nome: pubNome, cliente_telefone: pubTel,
      servico_nome: state.pubServico.nome, profissional_nome: state.pubProfissional.nome,
      data: pubData, hora: pubHora, status: 'Pendente',
      valor: Number(state.pubServico.preco || 0), observacoes: $('pubObs')?.value || ''
    }).select('id, empresa_id').single();
    if (error) { console.error(error); return toast('Erro ao confirmar: ' + error.message, 'err'); }
    if (novoAgendamento?.id) {
      fetch('/api/push/new-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: novoAgendamento.id,
          companyId: novoAgendamento.empresa_id
        })
      }).catch(e => console.warn('Falha ao enviar notificaÃ§Ã£o push:', e));
    }
    if (cs) cs.style.display = 'block';
  } catch (e) { console.error('Erro ao confirmar agendamento público:', e); toast('Erro inesperado. Tente novamente.', 'err'); }
}

function resetPublic() {
  const mb = $('pubMainBody'), cs = $('pubConfirmScreen'), ob = $('pubObsScreen');
  if (mb) mb.style.display = '';
  if (cs) cs.style.display = 'none';
  if (ob) ob.style.display = 'none';
  ['pubClienteNome', 'pubClienteTel', 'pubData', 'pubHora', 'pubObs'].forEach(id => { const el = $(id); if (el) el.value = ''; });
  const aviso = $('pubDataAviso'); if (aviso) aviso.style.display = 'none';
  const inputData = $('pubData'); if (inputData) { inputData.style.borderColor = ''; inputData.style.boxShadow = ''; }
  state.pubServico = null; state.pubProfissional = null;
  document.querySelectorAll('.choice').forEach(c => c.classList.remove('active'));
}

function voltarDaPublica() {
  history.pushState(null, '', location.pathname);
  const pv = $('publicView'); if (pv) pv.style.display = 'none';
  if (state?.empresa) { const dv = $('dashboardView'); if (dv) dv.style.display = 'block'; setView('dashboard'); }
  else { const lv = $('landingView'); if (lv) lv.style.display = 'block'; }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

(function() {
  function forcePublicIsolation() {
    if (!location.hash || !location.hash.startsWith('#agendar/')) return;
    const landing = document.getElementById('landingView');
    const dashboard = document.getElementById('dashboardView');
    const publicView = document.getElementById('publicView');
    if (landing) landing.style.display = 'none';
    if (dashboard) dashboard.style.display = 'none';
    if (publicView) publicView.style.display = 'block';
    document.body.classList.add('public-mode');
  }
  window.addEventListener('hashchange', forcePublicIsolation);
  window.addEventListener('DOMContentLoaded', forcePublicIsolation);
  setTimeout(forcePublicIsolation, 300);
  setTimeout(forcePublicIsolation, 1000);
})();

Object.assign(window, {
  openAuth, closeAuth, showLogin, showCadastro,
  goStep1, goStep2, goStep3, autoSlug,
  loginComSenha, finalizarCadastro, logout,
  setView, setFilter,
  setConfigTab, openConfigSection,
  salvarCliente, salvarServico, salvarProfissional, salvarAgendamento,
  salvarConfig, salvarRedesSociais, salvarHorarios, salvarMensagensWhatsapp, restaurarMensagensWhatsappPadrao,
  toggleDia, selecionarIntervalo,
  abrirEditorFoto, fecharEditorFoto, atualizarEditorFoto, iniciarArrasteFotoEditor, salvarFotoEditor,
  confirmarAg, concluirAg, abrirWA,
  openModalRecusa, closeModalRecusa, selectMotivo, confirmarRecusa,
  openModalReagendar, closeModalReagendar, confirmarReagendar,
  editCliente, editServico, editProfissional, editAgendamento,
  duplicarCliente, duplicarServico, duplicarProfissional, duplicarAgendamento,
  toggleCliente, toggleServico, toggleProfissional,
  excluirCliente, excluirServico, excluirProfissional, excluirAgendamento,
  copyPublicLink, openPublic, voltarDaPublica,
  selectPubSvc, selectPubProf, confirmarAgendamentoPublico, finalizarAgendamentoPublico, resetPublic,
  closeEditModal, closeConfirmModal, closeModalRecusa, closeModalReagendar,
  toast, clearNotifDot, loadPublic,
  openMobileMenu, closeMobileMenu,
  menuOpenPublic, menuCopyPublicLink, menuNotifications,
  abrirCalendarioPublico, fecharCalendarioPublico, pubCalMes, selecionarDataPublica,
  abrirSlotsPublico, fecharSlotsPublico, selecionarSlot
});

// ── CALENDÁRIO PÚBLICO FULLSCREEN ─────────────────────────────────────────────
let _pubCalAno, _pubCalMes;

function abrirCalendarioPublico() {
  const hoje = new Date();
  _pubCalAno = hoje.getFullYear();
  _pubCalMes = hoje.getMonth();
  renderPubCal();
  const ov = document.getElementById('pubCalendarioOverlay');
  if (ov) { ov.style.display = 'flex'; requestAnimationFrame(() => ov.classList.add('open')); }
  document.body.style.overflow = 'hidden';
}

function fecharCalendarioPublico(e) {
  if (e && e.target !== document.getElementById('pubCalendarioOverlay')) return;
  const ov = document.getElementById('pubCalendarioOverlay');
  if (ov) { ov.classList.remove('open'); setTimeout(() => ov.style.display = 'none', 200); }
  document.body.style.overflow = '';
}

function pubCalMes(dir) {
  _pubCalMes += dir;
  if (_pubCalMes > 11) { _pubCalMes = 0; _pubCalAno++; }
  if (_pubCalMes < 0) { _pubCalMes = 11; _pubCalAno--; }
  renderPubCal();
}

function renderPubCal() {
  const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const titulo = document.getElementById('pubCalTitulo');
  if (titulo) titulo.textContent = nomes[_pubCalMes] + ' ' + _pubCalAno;

  // Calendário respeita apenas os dias configurados pela empresa
  const diasFechados = state.pubDiasFechados || [];

  const grid = document.getElementById('pubCalGrid');
  if (!grid) return;

  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const primeiroDia = new Date(_pubCalAno, _pubCalMes, 1);
  const ultimoDia = new Date(_pubCalAno, _pubCalMes + 1, 0);
  const iniciaSemana = primeiroDia.getDay();

  const totalDias = ultimoDia.getDate();

  // Dias do mês anterior para preencher início
  let html = '';
  if (iniciaSemana > 0) {
    const diasAnterior = new Date(_pubCalAno, _pubCalMes, 0).getDate();
    for (let i = iniciaSemana - 1; i >= 0; i--) {
      html += `<div class="pub-cal-cell fora-mes">${diasAnterior - i}</div>`;
    }
  }

  // Dias do mês atual
  for (let d = 1; d <= totalDias; d++) {
    const data = new Date(_pubCalAno, _pubCalMes, d);
    const diaSemana = data.getDay();
    const passado = data < hoje;
    const fechadoEmpresa = diasFechados.includes(diaSemana);
    const bloqueado = passado || fechadoEmpresa;
    const iso = `${_pubCalAno}-${String(_pubCalMes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const selecionado = document.getElementById('pubData')?.value === iso;
    html += `<div class="pub-cal-cell${bloqueado?' bloqueado':''}${selecionado?' selecionado':''}" ${!bloqueado?`onclick="selecionarDataPublica('${iso}')"`:''}>${d}</div>`;
  }

  // Dias do próximo mês para completar última semana
  const ultimoDiaSemana = ultimoDia.getDay();
  if (ultimoDiaSemana < 6) {
    for (let d = 1; d <= 6 - ultimoDiaSemana; d++) {
      html += `<div class="pub-cal-cell fora-mes">${d}</div>`;
    }
  }

  grid.innerHTML = html;
}

function selecionarDataPublica(iso) {
  const input = document.getElementById('pubData');
  const btn = document.getElementById('pubDataBtn');
  const label = document.getElementById('pubDataLabel');
  if (input) input.value = iso;
  if (label) {
    const [y,m,d] = iso.split('-');
    const nomes = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    label.textContent = `${parseInt(d)} de ${nomes[parseInt(m)-1]} de ${y}`;
  }
  if (btn) btn.classList.add('selecionado');
  const horaBtn = document.getElementById('pubHoraBtn');
  if (horaBtn) horaBtn.disabled = false;
  const horaLabel = document.getElementById('pubHoraLabel');
  if (horaLabel) { horaLabel.textContent = 'Escolher horário'; }
  const horaInput = document.getElementById('pubHora');
  if (horaInput) horaInput.value = '';
  fecharCalendarioPublico();
  renderPubCal();
}

// ── SLOTS DE HORÁRIO ────────────────────────────────────────────────────────────
async function abrirSlotsPublico() {
  const data = document.getElementById('pubData')?.value;
  const prof = state.pubProfissional;
  if (!data || !prof) { return; }

  // Usa horários da empresa; fallback para os do profissional se empresa não tiver
  const empresa = state.pubEmpresa || {};
  const inicio = empresa.horario_inicio || prof.horario_inicio || '09:00';
  const fim = empresa.horario_fim || prof.horario_fim || '18:00';
  const intervalo = empresa.intervalo_slots || prof.intervalo_slots || 30;

  // Buscar agendamentos ocupados nesse dia para esse profissional
  const { data: ags } = await db.from('agenda_agendamentos')
    .select('hora, status')
    .eq('profissional_id', prof.id)
    .eq('data', data)
    .in('status', ['Pendente','Confirmado','Reagendado']);

  const ocupados = new Set((ags || []).map(a => a.hora?.slice(0,5)));

  // Gerar slots
  const slots = [];
  const [hIni, mIni] = inicio.split(':').map(Number);
  const [hFim, mFim] = fim.split(':').map(Number);
  let atual = hIni * 60 + mIni;
  const fimMin = hFim * 60 + mFim;
  while (atual < fimMin) {
    const h = String(Math.floor(atual/60)).padStart(2,'0');
    const m = String(atual%60).padStart(2,'0');
    slots.push(`${h}:${m}`);
    atual += intervalo;
  }

  const grid = document.getElementById('pubSlotsGrid');
  if (grid) {
    grid.innerHTML = slots.length ? slots.map(s => {
      const ocup = ocupados.has(s);
      return `<div class="pub-slot${ocup?' ocupado':' livre'}" ${!ocup?`onclick="selecionarSlot('${s}')"`:''}>${s}${ocup?'<span class="slot-tag">Ocupado</span>':''}</div>`;
    }).join('') : '<p style="color:var(--text3);text-align:center;padding:24px">Nenhum horário disponível neste dia.</p>';
  }

  const titulo = document.getElementById('pubSlotsTitulo');
  if (titulo) {
    const [y,m,d] = data.split('-');
    const nomes = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    titulo.textContent = `Horários — ${parseInt(d)} ${nomes[parseInt(m)-1]}`;
  }

  const ov = document.getElementById('pubSlotsOverlay');
  if (ov) { ov.style.display = 'flex'; requestAnimationFrame(() => ov.classList.add('open')); }
  document.body.style.overflow = 'hidden';
}

function fecharSlotsPublico(e) {
  if (e && e.target !== document.getElementById('pubSlotsOverlay')) return;
  const ov = document.getElementById('pubSlotsOverlay');
  if (ov) { ov.classList.remove('open'); setTimeout(() => ov.style.display = 'none', 200); }
  document.body.style.overflow = '';
}

function selecionarSlot(hora) {
  const input = document.getElementById('pubHora');
  const btn = document.getElementById('pubHoraBtn');
  const label = document.getElementById('pubHoraLabel');
  if (input) input.value = hora;
  if (label) label.textContent = hora;
  if (btn) btn.classList.add('selecionado');
  fecharSlotsPublico();
}
// ─────────────────────────────────────────────────────────────────────────────


// ── CEP e Autocomplete de Endereço ───────────────────────────────────────────
function formatarCep(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 8);
  if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
  input.value = v;
  if (v.replace('-', '').length === 8) buscarCep(v);
}

async function buscarCep(cep) {
  const limpo = (cep || '').replace(/\D/g, '');
  if (limpo.length !== 8) return;
  const spinner = $('cepSpinner');
  if (spinner) spinner.style.display = 'inline';
  try {
    const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
    const d = await res.json();
    if (d.erro) { toast('CEP não encontrado.', 'err'); return; }
    const end = $('cfgEndereco');
    const cid = $('cfgCidade');
    if (end) end.value = [d.logradouro, d.bairro].filter(Boolean).join(', ');
    if (cid) cid.value = [d.localidade, d.uf].filter(Boolean).join(', ');
    toast('Endereço preenchido automaticamente!', 'ok');
  } catch (e) {
    toast('Erro ao buscar CEP.', 'err');
  } finally {
    if (spinner) spinner.style.display = 'none';
  }
}

let _enderecoTimer = null;
async function autocompleteEndereco(valor) {
  const box = $('enderecoSuggestions');
  if (!box) return;
  if (!valor || valor.length < 4) { box.style.display = 'none'; return; }
  clearTimeout(_enderecoTimer);
  _enderecoTimer = setTimeout(async () => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=br&q=${encodeURIComponent(valor)}`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
      const lista = await res.json();
      if (!lista.length) { box.style.display = 'none'; return; }
      box.innerHTML = lista.map((item, i) => {
        const a = item.address || {};
        const rua = [a.road, a.house_number].filter(Boolean).join(', ');
        const bairro = a.suburb || a.neighbourhood || a.quarter || '';
        const cidade = a.city || a.town || a.village || a.municipality || '';
        const estado = a.state_code || a.state || '';
        const linha1 = rua || item.display_name.split(',')[0];
        const linha2 = [bairro, cidade, estado].filter(Boolean).join(', ');
        return `<div class="endereco-suggestion-item" onclick="selecionarEndereco(${i})" data-rua="${escapeHtml(linha1)}" data-cidade="${escapeHtml([cidade, estado].filter(Boolean).join(', '))}">
          <span class="es-icon">📍</span>
          <span><strong>${escapeHtml(linha1)}</strong>${linha2 ? '<br><small>' + escapeHtml(linha2) + '</small>' : ''}</span>
        </div>`;
      }).join('');
      box.style.display = 'block';
    } catch (e) { box.style.display = 'none'; }
  }, 400);
}

function selecionarEndereco(idx) {
  const box = $('enderecoSuggestions');
  if (!box) return;
  const items = box.querySelectorAll('.endereco-suggestion-item');
  const item = items[idx];
  if (!item) return;
  const end = $('cfgEndereco');
  const cid = $('cfgCidade');
  if (end) end.value = item.dataset.rua || '';
  if (cid && item.dataset.cidade) cid.value = item.dataset.cidade;
  box.style.display = 'none';
}

document.addEventListener('click', (e) => {
  const box = $('enderecoSuggestions');
  if (box && !box.contains(e.target) && e.target.id !== 'cfgEndereco') {
    box.style.display = 'none';
  }
});
