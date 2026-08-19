// ═══════════════════════════════════════════════════════════════
// GERENCIADOR ÚNICO DE ROLAGEM
// Evita que um modal libere a rolagem enquanto outro ainda está aberto.
// Não usa position: fixed, top ou scrollTo, reduzindo saltos no Android.
// ═══════════════════════════════════════════════════════════════
const VYXORA_SCROLL = {
  legacyCount: 0,
  tokens: new Set(),

  apply() {
    const locked = this.legacyCount > 0 || this.tokens.size > 0;
    document.documentElement.classList.toggle('vyxora-safe-layer-open', locked);
    document.body.classList.toggle('vyxora-safe-layer-open', locked);
  },

  lock(token = null) {
    if (token) this.tokens.add(String(token));
    else this.legacyCount += 1;
    this.apply();
  },

  unlock(token = null) {
    if (token) this.tokens.delete(String(token));
    else this.legacyCount = Math.max(0, this.legacyCount - 1);
    this.apply();
  },

  reset() {
    this.legacyCount = 0;
    this.tokens.clear();
    this.apply();
  },

  isLocked() {
    return this.legacyCount > 0 || this.tokens.size > 0;
  }
};

window.VYXORA_SCROLL = VYXORA_SCROLL;
const VYXORA_MOBILE_DIRECT_BOOT = window.matchMedia('(max-width: 768px)').matches;
// Loader único para desktop e Android. No Android ele fica visível por menos tempo.
VYXORA_SCROLL.lock('loader');

const VYXORA_SAFE_LAYER = {
  lock() { VYXORA_SCROLL.lock(); },
  unlock() { VYXORA_SCROLL.unlock(); }
};

function lockSecondScreen() {
  VYXORA_SAFE_LAYER.lock();
}

function unlockSecondScreen() {
  VYXORA_SAFE_LAYER.unlock();
}

// Dashboard exclusivo do WebApp Android. Carregado como camada isolada para
// não alterar o layout e o comportamento do painel desktop.
const vxMobileDashboardStyles = document.createElement('link');
vxMobileDashboardStyles.rel = 'stylesheet';
vxMobileDashboardStyles.href = 'mobile-dashboard-v2.css?v=20';
document.head.appendChild(vxMobileDashboardStyles);
const vxMobilePremiumStyles = document.createElement('link');
vxMobilePremiumStyles.rel = 'stylesheet';
vxMobilePremiumStyles.href = 'mobile-app-premium.css?v=100';
document.head.appendChild(vxMobilePremiumStyles);
const vxMobileDashboardScript = document.createElement('script');
vxMobileDashboardScript.src = 'mobile-dashboard-v2.js?v=20';
vxMobileDashboardScript.defer = true;
document.head.appendChild(vxMobileDashboardScript);

// ── STATE ──
let state = {
  user: null, empresa: null, perfil: null,
  categorias: [], clientes: [], servicos: [],
  profissionais: [], agendamentos: [], pagamentos: [], cobrancas: [],
  pubEmpresa: null, pubServico: null, pubProfissional: null,
  pubDiasFechados: []
};
window.state = state;

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
  const avatarTopo = $('topbarAvatar');
  if (avatarTopo) {
    aplicarImagemFundo(avatarTopo, foto);
    aplicarEnquadramentoFoto(avatarTopo, enquadramento.x, enquadramento.y, enquadramento.zoom);
    avatarTopo.textContent = foto ? '' : initial(state.empresa.nome);
  }
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

const NOTIFICATION_LIMIT = 100;
let appNotifications = [];

function notificationStorageKey() {
  return `vyxora_notifications_${state?.empresa?.id || 'guest'}`;
}

function loadStoredNotifications() {
  try {
    const saved = JSON.parse(localStorage.getItem(notificationStorageKey()) || '[]');
    appNotifications = Array.isArray(saved) ? saved.slice(0, NOTIFICATION_LIMIT) : [];
  } catch (_) {
    appNotifications = [];
  }
  renderNotificationCenter();
}

function saveStoredNotifications() {
  try {
    localStorage.setItem(notificationStorageKey(), JSON.stringify(appNotifications.slice(0, NOTIFICATION_LIMIT)));
  } catch (_) {}
}

function escapeNotificationText(value) {
  return String(value || '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

function addAppNotification(title, message = '', type = 'new', sourceId = '') {
  const sourceKey = sourceId ? `${type}:${sourceId}` : '';
  if (sourceKey && appNotifications.some(item => item.sourceKey === sourceKey)) return;
  appNotifications.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sourceKey,
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString()
  });
  appNotifications = appNotifications.slice(0, NOTIFICATION_LIMIT);
  saveStoredNotifications();
  renderNotificationCenter();
  playNotificationSound();
}

function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(740, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(980, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.20);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.21);
    setTimeout(() => ctx.close().catch(() => {}), 350);
  } catch (_) {}
}

function formatNotificationDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function renderNotificationCenter() {
  const list = $('notificationList');
  const empty = $('notificationEmpty');
  const unread = appNotifications.filter(item => !item.read).length;
  [$('notificationBadge'), $('mobileNotificationBadge')].forEach(badge => {
    if (!badge) return;
    badge.textContent = unread > 99 ? '99+' : String(unread);
    badge.hidden = unread === 0;
  });
  if (!list || !empty) return;
  const center = list.closest('.notification-center');
  const isEmpty = appNotifications.length === 0;
  center?.classList.toggle('is-empty', isEmpty);
  empty.style.display = isEmpty ? 'flex' : 'none';
  list.setAttribute('aria-hidden', isEmpty ? 'true' : 'false');
  list.innerHTML = appNotifications.map(item => `
    <article class="notification-row ${item.read ? '' : 'unread'}" data-id="${item.id}">
      <button class="notification-row-main" onclick="markNotificationRead('${item.id}')">
        <span class="notification-row-icon">${item.type === 'new' ? '📅' : '🔔'}</span>
        <span class="notification-row-content">
          <strong>${escapeNotificationText(item.title)}</strong>
          ${item.message ? `<span>${escapeNotificationText(item.message)}</span>` : ''}
          <small>${formatNotificationDate(item.createdAt)}</small>
        </span>
        ${item.read ? '' : '<i aria-label="Não lida"></i>'}
      </button>
      <button class="notification-row-delete" onclick="deleteNotification('${item.id}')" aria-label="Excluir">✕</button>
    </article>
  `).join('');
}

function openNotificationCenter() {
  const overlay = $('notificationCenterOverlay');
  if (!overlay) return;
  renderNotificationCenter();
  overlay.classList.add('open');
  document.body.classList.add('notification-center-open');
}

function closeNotificationCenter(event) {
  if (event && event.target !== $('notificationCenterOverlay')) return;
  $('notificationCenterOverlay')?.classList.remove('open');
  document.body.classList.remove('notification-center-open');
}

function markNotificationRead(id) {
  const item = appNotifications.find(notification => notification.id === id);
  if (!item) return;
  item.read = true;
  saveStoredNotifications();
  renderNotificationCenter();
}

function markAllNotificationsRead() {
  appNotifications.forEach(item => { item.read = true; });
  saveStoredNotifications();
  renderNotificationCenter();
}

function deleteNotification(id) {
  appNotifications = appNotifications.filter(item => item.id !== id);
  saveStoredNotifications();
  renderNotificationCenter();
}

function clearAllNotifications() {
  appNotifications = [];
  saveStoredNotifications();
  renderNotificationCenter();
}

// Mensagens operacionais continuam discretas e nunca se acumulam.
function showNotif(title, msg = '', type = 'info', duration = 2800) {
  const stack = $('notifStack');
  if (!stack) return;
  stack.innerHTML = '';
  const item = document.createElement('div');
  item.className = 'notif-item compact';
  const icons = {
    new: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="1"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>',
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    err: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
  };
  item.innerHTML = `
    <div class="notif-icon ${type}">${icons[type] || icons.info}</div>
    <div class="notif-body">
      <div class="notif-title">${escapeNotificationText(title)}</div>
      ${msg ? `<div class="notif-msg">${escapeNotificationText(msg)}</div>` : ''}
    </div>
    <button class="notif-close" onclick="this.parentElement.remove()" aria-label="Fechar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
  `;
  stack.appendChild(item);
  setTimeout(() => {
    item.classList.add('out');
    setTimeout(() => item.remove(), 350);
  }, duration);
}

function clearNotifDot() { renderNotificationCenter(); }

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

let _vyxoraLoaderFinished = false;
let _vyxoraLoaderProgress = 12;
let _vyxoraLoaderTimers = [];

function atualizarTelaCarregamento(progress, title, detail, stage) {
  if (_vyxoraLoaderFinished) return;

  _vyxoraLoaderProgress = Math.max(_vyxoraLoaderProgress, Math.min(100, progress));
  const bar = $('vyxoraLoaderBar');
  const percent = $('vyxoraLoaderPercent');
  const titleEl = $('vyxoraLoaderTitle');
  const detailEl = $('vyxoraLoaderDetail');
  const stageEl = $('vyxoraLoaderStage');

  if (bar) bar.style.width = `${_vyxoraLoaderProgress}%`;
  if (percent) percent.textContent = `${Math.round(_vyxoraLoaderProgress)}%`;
  if (titleEl && title) titleEl.textContent = title;
  if (detailEl && detail) detailEl.textContent = detail;
  if (stageEl && stage) stageEl.textContent = stage;
}

function iniciarEtapasCarregamento() {
  const etapas = [
    [420, 30, 'Organizando o aplicativo', 'Preparando os recursos essenciais', 'Organizando'],
    [980, 54, 'Carregando seus recursos', 'Conectando serviços e preferências', 'Carregando'],
    [1580, 76, 'Ajustando sua experiência', 'Deixando tudo pronto para você', 'Ajustando'],
    [2150, 89, 'Finalizando', 'Só mais um instante', 'Finalizando']
  ];

  etapas.forEach(([delay, progress, title, detail, stage]) => {
    _vyxoraLoaderTimers.push(setTimeout(() => {
      atualizarTelaCarregamento(progress, title, detail, stage);
    }, delay));
  });
}

function esconderTelaCarregamento() {
  if (_vyxoraLoaderFinished) return;
  atualizarTelaCarregamento(100, 'Tudo pronto', 'Abrindo a VyXora Agendas', 'Concluído');
  _vyxoraLoaderFinished = true;
  _vyxoraLoaderTimers.forEach(clearTimeout);
  _vyxoraLoaderTimers = [];

  const loader = $('vyxoraLoader');
  document.documentElement.classList.remove('auth-performance-mode');
  document.body.classList.remove('auth-performance-mode', 'vx-booting');
  document.body.classList.add('vx-ready');
  VYXORA_SCROLL.unlock('loader');

  if (!loader) return;
  setTimeout(() => {
    loader.classList.add('is-hidden');
    loader.style.pointerEvents = 'none';
    setTimeout(() => loader.remove(), 320);
  }, 220);
}

document.addEventListener('DOMContentLoaded', () => {
  // O Android usa o mesmo loader, porém com duração mínima curta para sensação de app nativo.
  if (!VYXORA_MOBILE_DIRECT_BOOT) iniciarEtapasCarregamento();

  const minimumDelay = VYXORA_MOBILE_DIRECT_BOOT ? 700 : 2350;
  const minimumDisplay = new Promise(resolve => setTimeout(resolve, minimumDelay));
  const startup = init();

  Promise.allSettled([startup, minimumDisplay]).finally(() => {
    requestAnimationFrame(() => requestAnimationFrame(esconderTelaCarregamento));
  });
}, { once: true });

// Proteção para falhas externas de rede ou bibliotecas.
setTimeout(esconderTelaCarregamento, 5200);

async function init() {
  await loadCategorias();
  if (typeof window.isPublicChargeRoute === 'function' && window.isPublicChargeRoute()) {
    await window.loadPublicChargeRoute();
    return;
  }
  const slug = getPublicSlug();
  if (slug) { await loadPublic(slug); return; }
  try {
    const { data: { session } } = await db.auth.getSession();
    if (session?.user) {
      const detail = $('vyxoraLoaderDetail');
      if (detail) detail.textContent = 'Organizando seu painel';

      const ok = await carregarConta(session.user);
      if (!ok) await db.auth.signOut();
    }
  } catch (e) { console.error('Erro ao verificar sessão:', e); }
  if (!state.user && window.matchMedia('(max-width: 620px)').matches) abrirBoasVindasMobile();
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
    showDashboard(); await loadAll(); atualizarBloqueioPublicacao(); return true;
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
  if (sel.dataset.preenchido === '1') return;
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
  sel.dataset.preenchido = '1';
}

const CATEGORIAS_FALLBACK = [
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

function renderCategoriasCadastro(filtro) {
  const grid = $('authCategoryGrid');
  if (!grid) return;
  const termo = String(filtro || '').trim().toLowerCase();
  const lista = (state.categorias && state.categorias.length) ? state.categorias : CATEGORIAS_FALLBACK;
  const filtrada = termo ? lista.filter(c => (c.nome || '').toLowerCase().includes(termo)) : lista;
  const atual = $('empCategoria')?.value || '';

  if (!filtrada.length) {
    grid.innerHTML = '<div class="auth-category-empty">Nenhuma categoria encontrada.</div>';
    return;
  }

  grid.innerHTML = filtrada.map(c => {
    const nome = String(c.nome || '').replace(/"/g, '&quot;');
    const icone = c.icone || '✦';
    const selecionada = String(c.id) === String(atual) ? ' selected' : '';
    return `<button type="button" class="auth-category-option${selecionada}" data-categoria-value="${c.id}" data-categoria-nome="${nome}" data-categoria-icone="${icone}">
      <span class="auth-category-option-icon">${icone}</span>
      <span><strong>${c.nome || ''}</strong><small>Toque para selecionar</small></span>
    </button>`;
  }).join('');
}

function togglePw(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  const reveal = inp.type === 'password';
  const start = inp.selectionStart;
  const end = inp.selectionEnd;

  inp.type = reveal ? 'text' : 'password';
  btn.classList.toggle('show', reveal);
  btn.setAttribute('aria-pressed', reveal ? 'true' : 'false');
  btn.setAttribute('aria-label', reveal ? 'Ocultar senha' : 'Mostrar senha');

  // Android recria o campo ao alternar o type. Restaurar o foco e a seleção
  // evita o salto do teclado, o cursor perdido e o toque duplicado no ícone.
  requestAnimationFrame(() => {
    try {
      inp.focus({ preventScroll: true });
      if (Number.isInteger(start) && Number.isInteger(end)) inp.setSelectionRange(start, end);
    } catch (_) {}
  });
}

document.addEventListener('pointerdown', function(e) {
  if (e.target?.closest?.('#authOverlay .pw-eye')) e.preventDefault();
});

function abrirSeletorCategoria() {
  renderCategoriasCadastro('');
  const search = $('authCategorySearch');
  if (search) search.value = '';
  const cadastro = $('formCadastro');
  if (cadastro) cadastro.style.cssText = 'display:none !important; visibility:hidden !important;';
  const panel = $('authCategoryPanel');
  if (panel) panel.style.cssText = 'display:flex !important; visibility:visible !important;';
  const overlay = $('authOverlay');
  if (overlay) {
    overlay.dataset.authScreen = 'formCategory';
    overlay.scrollTop = 0;
  }
  const formArea = document.querySelector('#authOverlay .auth-form-area');
  if (formArea) formArea.scrollTop = 0;
  setTimeout(() => search?.focus({ preventScroll: true }), 60);
}

function fecharSeletorCategoria() {
  const panel = $('authCategoryPanel');
  if (panel) panel.style.cssText = 'display:none !important; visibility:hidden !important;';
  const cadastro = $('formCadastro');
  if (cadastro) cadastro.style.cssText = 'display:block !important; visibility:visible !important;';
  const overlay = $('authOverlay');
  if (overlay) {
    overlay.dataset.authScreen = 'formCadastro';
    overlay.scrollTop = 0;
  }
  const formArea = document.querySelector('#authOverlay .auth-form-area');
  if (formArea) formArea.scrollTop = 0;
  _mostrarStep(2);
}

function filtrarCategoriasCadastro(valor) {
  renderCategoriasCadastro(valor);
}

document.addEventListener('click', function(e) {
  const opt = e.target.closest('.auth-category-option');
  if (!opt) return;
  const select = $('empCategoria');
  const valor = opt.dataset.categoriaValue;
  if (select && valor != null) {
    select.value = valor;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
  const iconEl = $('empCategoriaTriggerIcon');
  const textEl = $('empCategoriaTriggerText');
  if (iconEl) iconEl.textContent = opt.dataset.categoriaIcone || '✦';
  if (textEl) textEl.textContent = opt.dataset.categoriaNome || 'Escolher área de atuação';
  fecharSeletorCategoria();
});

function showDashboard() {
  const lv = $('landingView'), dv = $('dashboardView'), pv = $('publicView');
  if (lv) lv.style.display = 'none';
  if (dv) dv.style.display = 'block';
  if (pv) pv.style.display = 'none';
  closeAuth();
  if (state.empresa) {
    renderAvatarPainel();
    setText('sideNome', state.empresa.nome);
    setText('topbarNome', state.empresa.nome);
    setText('mobileDashNome', state.empresa.nome);
    setText('sidePlan', state.empresa.plano || 'Grátis');
    const sideCard = $('sideAvatar')?.closest('.side-user-card');
    if (sideCard) sideCard.setAttribute('data-tip', state.empresa.nome || 'Empresa');
    const lb = $('sideLinkBox');
    if (lb) lb.textContent = publicUrl(state.empresa.slug);
  }
  unlockPublicModalScroll();
  setView('dashboard');
  loadStoredNotifications();
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
  closeMobileMenu();
  openNotificationCenter();
}

/* Tooltip real dos ícones da sidebar (substitui o ::after, que ficava cortado pelo
   overflow da sidebar). Um único elemento, criado sob demanda, reposicionado a cada
   hover via getBoundingClientRect — nunca é cortado, porque é filho direto do body. */
(function initSidebarTooltip() {
  let tipEl = null;
  function getTip() {
    if (!tipEl) {
      tipEl = document.createElement('div');
      tipEl.className = 'sidebar-tooltip';
      document.body.appendChild(tipEl);
    }
    return tipEl;
  }
  function mostrar(el) {
    const texto = el.getAttribute('data-tip');
    if (!texto) return;
    const tip = getTip();
    tip.textContent = texto;
    const r = el.getBoundingClientRect();
    tip.style.left = r.left + 'px';
    tip.style.top = 'auto';
    tip.style.bottom = (window.innerHeight - r.top + 8) + 'px';
    tip.classList.add('show');
  }
  function esconder() {
    if (tipEl) tipEl.classList.remove('show');
  }
  document.addEventListener('mouseover', (ev) => {
    const el = ev.target.closest('.sidebar [data-tip]');
    if (el) mostrar(el);
  });
  document.addEventListener('mouseout', (ev) => {
    const el = ev.target.closest('.sidebar [data-tip]');
    if (el) esconder();
  });
})();

function setView(view) {
  const target = $('view-' + view);
  if (!target) return;

  const atual = document.querySelector('.view.active');
  if (atual !== target) {
    // Troca síncrona e sem transição no Android para evitar flash da tela anterior.
    document.body.classList.add('vx-view-switching');
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v === target));
    requestAnimationFrame(() => document.body.classList.remove('vx-view-switching'));
  }

  // Reseta o scroll sem animação. "instant" não é suportado igualmente em WebViews.
  if (window.innerWidth <= 768) {
    window.scrollTo(0, 0);
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

  const copyBtn = $('topbarCopyLink');
  if (copyBtn) copyBtn.style.display = (view !== 'dashboard') ? 'none' : '';

  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', (b.getAttribute('onclick') || '').includes(`'${view}'`));
  });
  document.querySelectorAll('.mob-nav-btn').forEach(b => {
    b.classList.toggle('active', (b.getAttribute('onclick') || '').includes(`'${view}'`));
  });
  if (view === 'relatorios') window.renderRelatoriosFinanceiros?.();
}


const AUTH_PENDING_KEY = 'vyxora_pending_signup_v1';
let _authEmail = '';
let _recoveryEmail = '';
let _resendTimer = null;

function authFeedback(message = '', type = 'error') {
  const box = $('authFeedback');
  if (!box) return;
  box.textContent = String(message || '');
  box.className = 'auth-feedback' + (message ? ` show ${type}` : '');
}

function clearAuthFieldErrors(exceptInput = null) {
  document.querySelectorAll('#authOverlay .auth-field-error').forEach(error => {
    if (exceptInput && error.closest('.field')?.contains(exceptInput)) return;
    error.remove();
  });
  document.querySelectorAll('#authOverlay .field.has-auth-error').forEach(field => {
    if (exceptInput && field.contains(exceptInput)) return;
    field.classList.remove('has-auth-error');
    field.querySelectorAll('input, select, textarea').forEach(input => {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    });
  });
}

function authFail(message, inputId = '') {
  authFeedback();
  const input = inputId ? $(inputId) : null;
  if (input) {
    clearAuthFieldErrors(input);
    input.setAttribute('aria-invalid', 'true');
    const field = input.closest('.field');
    if (field) {
      field.classList.add('has-auth-error');
      let error = field.querySelector('.auth-field-error');
      if (!error) {
        error = document.createElement('small');
        error.className = 'auth-field-error';
        error.setAttribute('role', 'alert');
        field.appendChild(error);
      }
      error.textContent = String(message || 'Confira este campo.');
      error.id = error.id || `${input.id}Error`;
      input.setAttribute('aria-describedby', error.id);
    }
    input.focus({ preventScroll: true });
  } else {
    toast(message, 'err');
  }
  return false;
}

function authSuccess(message) {
  authFeedback();
  toast(message, 'ok');
}

function authCodeStatus(kind, message = '', type = 'info') {
  const id = kind === 'recovery' ? 'recoveryCodeStatus' : 'verifyCodeStatus';
  const status = $(id);
  if (!status) return;
  status.textContent = String(message || '');
  status.className = 'auth-code-status' + (message ? ` show ${type}` : '');
}

function clearAuthCodeStatuses() {
  authCodeStatus('signup');
  authCodeStatus('recovery');
}

function esconderTelasAuth() {
  ['formLogin','formCadastro','formVerifyEmail','formForgotPassword','formRecoveryCode','formNewPassword','authCategoryPanel'].forEach(id => {
    const el = $(id);
    if (el) el.style.display = 'none';
  });
}

function mostrarTelaAuth(id) {
  esconderTelasAuth();
  authFeedback();
  clearAuthCodeStatuses();
  if (id === 'formVerifyEmail' || id === 'formRecoveryCode') {
    const operationalNotices = $('notifStack');
    if (operationalNotices) operationalNotices.innerHTML = '';
  }
  clearAuthFieldErrors();
  const overlay = $('authOverlay');
  if (overlay) {
    overlay.dataset.authScreen = id;
    overlay.scrollTop = 0;
  }
  const el = $(id);
  if (el) el.style.display = 'block';
  const formArea = document.querySelector('#authOverlay .auth-form-area');
  if (formArea) formArea.scrollTop = 0;
}

function normalizarCodigo(valor) {
  return String(valor || '').replace(/\D/g, '').slice(0, 8);
}

function mensagemAuth(error, fallback) {
  const code = String(error?.code || '').toLowerCase();
  const msg = String(error?.message || '').toLowerCase();
  if (code.includes('otp_expired') || msg.includes('expired')) return 'O código expirou. Solicite um novo.';
  if (code.includes('otp_disabled') || msg.includes('invalid') || msg.includes('token')) return 'Código inválido. Confira e tente novamente.';
  if (code.includes('email_not_confirmed') || msg.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (code.includes('over_request_rate_limit') || msg.includes('rate limit')) return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
  if (msg.includes('already registered')) return 'Este e-mail já está cadastrado.';
  return error?.message || fallback;
}

function guardarCadastroPendente(data) {
  // Nunca persiste senha no navegador. O OTP confirmado deve devolver uma
  // sessão válida antes de qualquer dado do negócio ser provisionado.
  const { senha: _senhaDescartada, ...cadastroSeguro } = data || {};
  localStorage.setItem(AUTH_PENDING_KEY, JSON.stringify({ ...cadastroSeguro, createdAt: Date.now() }));
}

function lerCadastroPendente() {
  try {
    const data = JSON.parse(localStorage.getItem(AUTH_PENDING_KEY) || 'null');
    if (data?.senha) {
      const { senha: _senhaAntiga, ...cadastroSeguro } = data;
      localStorage.setItem(AUTH_PENDING_KEY, JSON.stringify(cadastroSeguro));
      return cadastroSeguro;
    }
    return data;
  }
  catch (_) { return null; }
}

function limparCadastroPendente() {
  localStorage.removeItem(AUTH_PENDING_KEY);
}

function iniciarContagemReenvio(buttonId, seconds = 60) {
  if (_resendTimer) clearInterval(_resendTimer);
  const btn = $(buttonId);
  if (!btn) return;
  let left = seconds;
  btn.disabled = true;
  btn.textContent = `Reenviar em ${left}s`;
  _resendTimer = setInterval(() => {
    left -= 1;
    if (left <= 0) {
      clearInterval(_resendTimer); _resendTimer = null;
      btn.disabled = false; btn.textContent = 'Reenviar código';
    } else btn.textContent = `Reenviar em ${left}s`;
  }, 1000);
}

function showVerifyEmail(email) {
  _authEmail = String(email || '').trim().toLowerCase();
  setText('verifyEmailLabel', _authEmail);
  const code = $('verifyEmailCode'); if (code) { code.value = ''; syncAuthCodeBoxes(code); }
  mostrarTelaAuth('formVerifyEmail');
  setTimeout(() => code?.focus({ preventScroll: true }), 60);
}

function showForgotPassword() {
  const current = ($('loginEmail')?.value || _recoveryEmail || '').trim();
  const input = $('recoveryEmail'); if (input) input.value = current;
  mostrarTelaAuth('formForgotPassword');
  setTimeout(() => input?.focus({ preventScroll: true }), 60);
}

function showRecoveryCode(email) {
  _recoveryEmail = String(email || '').trim().toLowerCase();
  setText('recoveryEmailLabel', _recoveryEmail);
  const code = $('recoveryCode'); if (code) { code.value = ''; syncAuthCodeBoxes(code); }
  mostrarTelaAuth('formRecoveryCode');
  setTimeout(() => code?.focus({ preventScroll: true }), 60);
}

function showNewPassword() {
  mostrarTelaAuth('formNewPassword');
  setTimeout(() => $('newPassword')?.focus({ preventScroll: true }), 60);
}

function voltarCadastroEmail() {
  showCadastro();
  _mostrarStep(1);
  setTimeout(() => $('cadEmail')?.focus({ preventScroll: true }), 60);
}

async function reenviarCodigoCadastro() {
  const email = _authEmail || lerCadastroPendente()?.email;
  if (!email) return authFail('Informe o e-mail do cadastro.', 'verifyEmailCode');
  const sessao = await db.auth.getSession();
  if (sessao?.data?.session) {
    return authFail('Esta conta já foi confirmada. Faça login.', 'verifyEmailCode');
  }
  const btn = $('btnResendSignup'); if (btn) btn.disabled = true;
  const { error } = await db.auth.resend({ type: 'signup', email });
  if (error) { if (btn) btn.disabled = false; return authFail(mensagemAuth(error, 'Não foi possível reenviar o código.'), 'verifyEmailCode'); }
  authCodeStatus('signup', 'Novo código enviado. Confira sua caixa de entrada.', 'success');
  iniciarContagemReenvio('btnResendSignup', 60);
}

async function confirmarEmailCadastro() {
  const email = _authEmail || lerCadastroPendente()?.email;
  const token = normalizarCodigo($('verifyEmailCode')?.value);
  if (!email || token.length < 6) return authFail('Digite o código de confirmação recebido por e-mail.', 'verifyEmailCode');
  const btn = $('btnVerifyEmail'); if (btn) { btn.disabled = true; btn.textContent = 'Confirmando...'; }
  try {
    const { data, error } = await db.auth.verifyOtp({ email, token, type: 'signup' });
    if (error || !data?.user || !data?.session) {
      return authFail(mensagemAuth(error, 'Código inválido ou expirado.'), 'verifyEmailCode');
    }
    await db.auth.setSession(data.session);

    const pendente = lerCadastroPendente();
    if (pendente && pendente.email === email) {
      const ok = await provisionarCadastroConfirmado(data.user, pendente);
      if (!ok) return;
      limparCadastroPendente();
    } else {
      const ok = await carregarConta(data.user);
      if (!ok) return toast('E-mail confirmado. Complete novamente os dados do negócio para criar o painel.', 'err');
    }
    closeAuth();
    showNotif('E-mail confirmado!', 'Sua conta está pronta para uso.', 'ok', 5000);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Confirmar e continuar →'; }
  }
}

async function enviarCodigoRecuperacao() {
  const email = ($('recoveryEmail')?.value || '').trim().toLowerCase();
  if (!email) return authFail('Digite o e-mail da conta que deseja recuperar.', 'recoveryEmail');
  if (!/^\S+@\S+\.\S+$/.test(email)) return authFail('Digite um endereço de e-mail válido.', 'recoveryEmail');
  const btn = $('btnSendRecovery'); if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
  try {
    const response = await fetch('/api/auth-recovery-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return authFail(payload.error || 'Não foi possível solicitar a recuperação agora.', 'recoveryEmail');
    showRecoveryCode(email);
    authCodeStatus('recovery', 'Se a conta existir, o código chegará em instantes.', 'success');
    iniciarContagemReenvio('btnResendRecovery', 60);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Enviar código →'; }
  }
}

async function reenviarCodigoRecuperacao() {
  if (!_recoveryEmail) return showForgotPassword();
  const btn = $('btnResendRecovery'); if (btn) btn.disabled = true;
  try {
    const response = await fetch('/api/auth-recovery-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: _recoveryEmail })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return authFail(payload.error || 'Não foi possível solicitar um novo código agora.', 'recoveryCode');
    authCodeStatus('recovery', 'Novo código solicitado. Confira sua caixa de entrada.', 'success');
    iniciarContagemReenvio('btnResendRecovery', 60);
  } finally {
    if (btn && !_resendTimer) btn.disabled = false;
  }
}

async function validarCodigoRecuperacao() {
  const token = normalizarCodigo($('recoveryCode')?.value);
  if (!_recoveryEmail || token.length < 6) return authFail('Digite o código de recuperação recebido por e-mail.', 'recoveryCode');
  const btn = $('btnVerifyRecovery'); if (btn) { btn.disabled = true; btn.textContent = 'Validando...'; }
  try {
    const { data, error } = await db.auth.verifyOtp({ email: _recoveryEmail, token, type: 'recovery' });
    if (error || !data?.session) return authFail(mensagemAuth(error, 'Código inválido ou expirado.'), 'recoveryCode');
    showNewPassword();
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Validar código →'; }
  }
}

async function salvarNovaSenha() {
  const password = $('newPassword')?.value || '';
  const confirm = $('newPasswordConfirm')?.value || '';
  if (password.length < 8 || !/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) {
    return authFail('Use pelo menos 8 caracteres, incluindo uma letra e um número.', 'newPassword');
  }
  if (password !== confirm) return authFail('As senhas não são iguais. Confira e tente novamente.', 'newPasswordConfirm');
  const btn = $('btnUpdatePassword'); if (btn) { btn.disabled = true; btn.textContent = 'Atualizando...'; }
  try {
    const { error } = await db.auth.updateUser({ password });
    if (error) return toast(mensagemAuth(error, 'Não foi possível atualizar a senha.'), 'err');
    await db.auth.signOut();
    toast('Senha atualizada. Entre com a nova senha.', 'ok');
    showLogin();
    if ($('loginEmail')) $('loginEmail').value = _recoveryEmail;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Atualizar senha →'; }
  }
}

let _authViewportBaseline = 0;
let _authViewportTimer = null;

function scrollAuthFieldIntoView(field = document.activeElement) {
  const overlay = $('authOverlay');
  const area = overlay?.querySelector('.auth-form-area');
  if (!overlay?.classList.contains('open') || !area || !field?.closest?.('#authOverlay')) return;
  if (overlay.dataset.authScreen === 'formLogin') return;
  const fieldRect = field.getBoundingClientRect();
  const areaRect = area.getBoundingClientRect();
  const targetTop = area.scrollTop + fieldRect.top - areaRect.top - Math.max(68, area.clientHeight * .34);
  area.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
}

function syncAuthVisualViewport() {
  const overlay = $('authOverlay');
  if (!overlay || window.innerWidth > 620) return;
  const viewport = window.visualViewport;
  const height = Math.round(viewport?.height || window.innerHeight);
  const offsetTop = Math.round(viewport?.offsetTop || 0);
  _authViewportBaseline = Math.max(_authViewportBaseline, window.innerHeight, height);
  const keyboardOpen = _authViewportBaseline - height > 120;

  overlay.style.setProperty('--auth-visual-height', `${height}px`);
  overlay.style.setProperty('--auth-visual-top', `${offsetTop}px`);
  overlay.classList.toggle('keyboard-open', keyboardOpen);
  const stack = $('notifStack');
  if (stack) {
    const coveredBottom = Math.max(0, window.innerHeight - (offsetTop + height));
    stack.style.setProperty('--auth-toast-bottom', `${coveredBottom + 18}px`);
  }

  if (keyboardOpen) {
    clearTimeout(_authViewportTimer);
    _authViewportTimer = setTimeout(() => scrollAuthFieldIntoView(), 70);
  }
}

window.visualViewport?.addEventListener('resize', syncAuthVisualViewport);
window.visualViewport?.addEventListener('scroll', syncAuthVisualViewport);
window.addEventListener('orientationchange', () => {
  _authViewportBaseline = 0;
  setTimeout(syncAuthVisualViewport, 120);
});
document.addEventListener('focusin', function(e) {
  if (!e.target?.matches?.('#authOverlay input, #authOverlay select, #authOverlay textarea')) return;
  setTimeout(syncAuthVisualViewport, 80);
  setTimeout(() => scrollAuthFieldIntoView(e.target), 220);
});

function openAuth(mode) {
  const overlay = $('authOverlay');
  if (!overlay) return;
  overlay.classList.remove('mobile-welcome-open', 'mobile-welcome-leaving');

  // Suspende a página de fundo enquanto a autenticação está aberta.
  document.documentElement.classList.add('auth-performance-mode');
  document.body.classList.add('auth-performance-mode');
  VYXORA_SCROLL.lock('auth');

  if (mode === 'login') showLogin(); else showCadastro();

  // Exibe somente após preparar o formulário, evitando duas renderizações.
  overlay.classList.add('open');
  _authViewportBaseline = Math.max(window.innerHeight, window.visualViewport?.height || 0);
  requestAnimationFrame(syncAuthVisualViewport);
}

function closeAuth() {
  const overlay = $('authOverlay');
  if (window.innerWidth <= 620 && !state.user && !getPublicSlug()) {
    overlay?.classList.remove('keyboard-open', 'mobile-welcome-leaving');
    overlay?.style.removeProperty('--auth-visual-height');
    overlay?.style.removeProperty('--auth-visual-top');
    $('notifStack')?.style.removeProperty('--auth-toast-bottom');
    _authViewportBaseline = 0;
    abrirBoasVindasMobile();
    return;
  }
  if (overlay) overlay.classList.remove('open', 'mobile-welcome-open', 'mobile-welcome-leaving');

  document.documentElement.classList.remove('auth-performance-mode');
  document.body.classList.remove('auth-performance-mode');
  VYXORA_SCROLL.unlock('auth');
  _authViewportBaseline = 0;
  overlay?.classList.remove('keyboard-open');
  overlay?.style.removeProperty('--auth-visual-height');
  overlay?.style.removeProperty('--auth-visual-top');
  $('notifStack')?.style.removeProperty('--auth-toast-bottom');
}

function abrirBoasVindasMobile() {
  if (window.innerWidth > 620 || getPublicSlug() || state.user) return;
  const overlay = $('authOverlay');
  if (!overlay) return;
  esconderTelasAuth();
  overlay.classList.add('open', 'mobile-welcome-open');
  document.documentElement.classList.add('auth-performance-mode');
  document.body.classList.add('auth-performance-mode');
  VYXORA_SCROLL.lock('auth');
}

function continuarBoasVindasMobile() {
  const overlay = $('authOverlay');
  overlay?.classList.add('mobile-welcome-leaving');
  setTimeout(() => {
    overlay?.classList.remove('mobile-welcome-open', 'mobile-welcome-leaving');
    showLogin();
    requestAnimationFrame(syncAuthVisualViewport);
  }, 260);
}

function pularBoasVindasMobile() {
  const overlay = $('authOverlay');
  overlay?.classList.remove('mobile-welcome-open', 'mobile-welcome-leaving');
  showLogin();
  requestAnimationFrame(syncAuthVisualViewport);
}

function sairBoasVindasMobile(destino) {
  const overlay = $('authOverlay');
  overlay?.classList.add('mobile-welcome-leaving');
  setTimeout(() => {
    overlay?.classList.remove('mobile-welcome-open', 'mobile-welcome-leaving');
    if (destino === 'cadastro') showCadastro();
    else showLogin();
    requestAnimationFrame(syncAuthVisualViewport);
  }, 260);
}

function abrirCadastroPelasBoasVindas() { sairBoasVindasMobile('cadastro'); }
function abrirLoginPelasBoasVindas() { sairBoasVindasMobile('login'); }

function showLogin() {
  mostrarTelaAuth('formLogin');
}

function showCadastro() {
  esconderTelasAuth();
  authFeedback();
  const overlay = $('authOverlay');
  if (overlay) {
    overlay.dataset.authScreen = 'formCadastro';
    overlay.scrollTop = 0;
  }
  const fc = $('formCadastro');
  if (fc) fc.style.cssText = 'display:block !important; visibility:visible !important;';
  const formArea = document.querySelector('#authOverlay .auth-form-area');
  if (formArea) formArea.scrollTop = 0;
  if ($('cadSenha')) $('cadSenha').placeholder = '8+ caracteres, letra e número';
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
  atualizarCabecalhoCadastro(n);
  const overlay = $('authOverlay');
  const formArea = document.querySelector('#authOverlay .auth-form-area');
  if (overlay) overlay.scrollTop = 0;
  if (formArea) formArea.scrollTop = 0;
}

function primeiroNomeCadastro() {
  const nome = ($('cadNome')?.value || '').trim().replace(/\s+/g, ' ');
  return nome ? nome.split(' ')[0].slice(0, 32) : '';
}

function atualizarCabecalhoCadastro(etapa) {
  const titulo = $('cadastroSaudacao');
  const mensagem = $('cadastroMensagem');
  if (!titulo || !mensagem) return;
  const nome = primeiroNomeCadastro();
  const textos = {
    1: [nome ? `Olá, ${nome}` : 'Vamos começar?', 'Crie seu acesso. Você configura o negócio depois, dentro do painel.'],
    2: [nome ? `Olá, ${nome}` : 'Sobre você', 'Agora, conte sobre o seu negócio.'],
    3: [nome ? `Estamos quase lá, ${nome}` : 'Estamos quase lá', 'Vamos preparar os primeiros detalhes da sua agenda.']
  };
  const [novoTitulo, novaMensagem] = textos[etapa] || textos[1];
  titulo.classList.remove('auth-heading-change');
  void titulo.offsetWidth;
  titulo.textContent = novoTitulo;
  mensagem.textContent = novaMensagem;
  titulo.classList.add('auth-heading-change');
}

function setStep(n) { _mostrarStep(n); }
function goStep1() { _mostrarStep(1); }

async function goStep2() {
  const nome = $('cadNome')?.value?.trim();
  const email = $('cadEmail')?.value?.trim().toLowerCase();
  const senha = $('cadSenha')?.value?.trim();
  if (!nome) return authFail('Conte para a gente como você quer ser chamado.', 'cadNome');
  if (!email) return authFail('Digite seu melhor e-mail.', 'cadEmail');
  if (!/^\S+@\S+\.\S+$/.test(email)) return authFail('Digite um endereço de e-mail válido.', 'cadEmail');
  if (!senha) return authFail('Crie uma senha para proteger sua conta.', 'cadSenha');
  if (senha.length < 8 || !/[A-Za-zÀ-ÿ]/.test(senha) || !/\d/.test(senha)) {
    return authFail('Use pelo menos 8 caracteres, incluindo uma letra e um número.', 'cadSenha');
  }
  authFeedback();
  const btn = $('btnGoStep2');
  if (btn) { btn.disabled = true; btn.textContent = 'Verificando e-mail...'; }
  try {
    const response = await fetch('/api/auth-email-exists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return authFail(payload.error || 'Não foi possível verificar o e-mail. Tente novamente.', 'cadEmail');
    }
    if (payload.exists) {
      return authFail('Este e-mail já possui uma conta. Entre ou redefina sua senha.', 'cadEmail');
    }
    const signupResponse = await fetch('/api/auth-signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: senha, nome })
    });
    const signupPayload = await signupResponse.json().catch(() => ({}));
    if (!signupResponse.ok) {
      return authFail(mensagemAuth({ message: signupPayload.error }, 'Não foi possível criar a conta.'), 'cadEmail');
    }
    const authData = signupPayload.data;
    if (!authData?.user) return authFail('Não foi possível criar a conta. Tente novamente.', 'cadEmail');
    guardarCadastroPendente({ email, nomeUser: nome });
    if (authData.session) {
      try { await db.auth.signOut(); } catch (_) {}
    }
    showVerifyEmail(email);
    iniciarContagemReenvio('btnResendSignup', 60);
    authCodeStatus('signup', 'Código enviado. Confira sua caixa de entrada.', 'success');
  } catch (error) {
    console.error('Erro ao verificar e-mail:', error);
    return authFail('Não foi possível verificar o e-mail. Confira sua conexão e tente novamente.', 'cadEmail');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Criar conta'; }
  }
}

function goStep3() {
  const empNome = $('empNome')?.value?.trim();
  const empSlug = $('empSlug')?.value?.trim();
  const empWhatsapp = $('empWhatsapp')?.value?.trim();
  if (!empNome) return authFail('Digite o nome do seu negócio.', 'empNome');
  if (!empWhatsapp) return authFail('Digite um WhatsApp para seus clientes.', 'empWhatsapp');
  if (!empSlug) return authFail('Escolha o endereço personalizado da sua agenda.', 'empSlug');
  authFeedback();
  _mostrarStep(3);
}

// Corrige seleção de categoria em componentes personalizados.
document.addEventListener('click', function(e) {
  const btn = e.target.closest('[data-area-value], [data-categoria-value], .area-option, .categoria-option');
  if (!btn) return;
  const select = document.getElementById('empCategoria');
  const value = btn.dataset.areaValue || btn.dataset.categoriaValue || btn.getAttribute('data-value');
  if (select && value != null) {
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    btn.parentElement?.querySelectorAll('.selected, .active').forEach(x => x.classList.remove('selected','active'));
    btn.classList.add('selected','active');
  }
});

function autoSlug() {
  const el = $('empSlug');
  if (!el || el.dataset.manual === '1') return;
  const nomeEl = $('empNome');
  if (nomeEl) el.value = slugify(nomeEl.value || '');
}

document.addEventListener('input', function(e) {
  if (e.target && e.target.id === 'empSlug') e.target.dataset.manual = '1';
  if (e.target?.closest?.('#authOverlay')) {
    e.target.removeAttribute('aria-invalid');
    const field = e.target.closest('.field');
    if (field?.classList.contains('has-auth-error')) {
      field.classList.remove('has-auth-error');
      field.querySelector('.auth-field-error')?.remove();
      e.target.removeAttribute('aria-describedby');
    }
    const box = $('authFeedback');
    if (box?.classList.contains('error')) authFeedback();
  }
  ajustarFonteCampo(e.target);
});

document.addEventListener('change', function(e) { ajustarFonteCampo(e.target); });

document.addEventListener('input', function(e) {
  if (e.target?.classList?.contains('auth-code-input')) {
    e.target.value = normalizarCodigo(e.target.value).slice(0, 8);
    syncAuthCodeBoxes(e.target);
  }
});

function syncAuthCodeBoxes(input) {
  if (!input) return;
  const wrap = input.closest('.auth-code-segmented');
  if (!wrap) return;
  const value = normalizarCodigo(input.value).slice(0, 8);
  const boxes = [...wrap.querySelectorAll('.auth-code-boxes span')];
  boxes.forEach((box, index) => {
    box.textContent = value[index] || '';
    box.classList.toggle('is-filled', index < value.length);
    box.classList.toggle('is-active', document.activeElement === input && index === Math.min(value.length, boxes.length - 1));
  });
  wrap.classList.toggle('is-complete', value.length === boxes.length);
}

function initAuthCodeBoxes() {
  document.querySelectorAll('.auth-code-segmented').forEach(wrap => {
    const input = document.getElementById(wrap.dataset.codeInput || '');
    if (!input || wrap.dataset.ready === '1') return;
    wrap.dataset.ready = '1';
    wrap.addEventListener('click', () => input.focus({ preventScroll: true }));
    input.addEventListener('focus', () => syncAuthCodeBoxes(input));
    input.addEventListener('blur', () => syncAuthCodeBoxes(input));
    input.addEventListener('paste', event => {
      const pasted = normalizarCodigo(event.clipboardData?.getData('text') || '').slice(0, 8);
      if (!pasted) return;
      event.preventDefault();
      input.value = pasted;
      syncAuthCodeBoxes(input);
    });
    syncAuthCodeBoxes(input);
  });
}

document.addEventListener('DOMContentLoaded', initAuthCodeBoxes, { once: true });

document.addEventListener('keydown', function(e) {
  const overlay = $('authOverlay');
  if (!overlay?.classList.contains('open')) return;
  if (e.key === 'Escape') return closeAuth();
  if (e.key !== 'Enter' || e.target?.tagName === 'BUTTON') return;
  e.preventDefault();
  if ($('formLogin')?.offsetParent) return loginComSenha();
  if ($('formForgotPassword')?.offsetParent) return enviarCodigoRecuperacao();
  if ($('formRecoveryCode')?.offsetParent) return validarCodigoRecuperacao();
  if ($('formVerifyEmail')?.offsetParent) return confirmarEmailCadastro();
  if ($('formNewPassword')?.offsetParent) return salvarNovaSenha();
  if ($('step1')?.offsetParent) return goStep2();
  if ($('step2')?.offsetParent) return goStep3();
  if ($('step3')?.offsetParent) return finalizarCadastro();
});

async function loginComSenha() {
  const email = ($('loginEmail')?.value || '').trim().toLowerCase();
  const senha = ($('loginSenha')?.value || '').trim();
  if (!email) return authFail('Digite o e-mail usado no seu cadastro.', 'loginEmail');
  if (!/^\S+@\S+\.\S+$/.test(email)) return authFail('Digite um endereço de e-mail válido.', 'loginEmail');
  if (!senha) return authFail('Digite sua senha para continuar.', 'loginSenha');
  const btn = $('btnLogin'); if (btn) { btn.disabled = true; btn.textContent = 'Entrando...'; }
  authFeedback();
  try {
    const { data, error } = await db.auth.signInWithPassword({ email, password: senha });
    if (error || !data.user) {
      const message = mensagemAuth(error, 'E-mail ou senha incorretos.');
      if (String(error?.code || '').includes('email_not_confirmed') || String(error?.message || '').toLowerCase().includes('email not confirmed')) {
        showVerifyEmail(email);
        iniciarContagemReenvio('btnResendSignup', 60);
      }
      return authFail(message, 'loginSenha');
    }
    const ok = await carregarConta(data.user);
    if (!ok) { await db.auth.signOut(); return authFail('Perfil ou empresa não encontrado. Refaça o cadastro.'); }
    showNotif('Login realizado!', 'Bem-vindo de volta.', 'ok', 4000);
  } catch (e) { console.error('Erro no login:', e); authFail('Não foi possível entrar agora. Verifique sua conexão e tente novamente.'); }
  finally { if (btn) { btn.disabled = false; btn.textContent = 'Entrar →'; } }
}

async function provisionarCadastroConfirmado(user, cadastro) {
  const btnFin = $('btnFinalizar');
  try {
    const { data: perfilExistente } = await db.from('agenda_perfis').select('*').eq('auth_user_id', user.id).maybeSingle();
    if (perfilExistente) {
      const ok = await carregarConta(user);
      return !!ok;
    }
    const cadastroBasico = !cadastro.empNomeVal;
    const slugBase = cadastroBasico ? `agenda-${String(user.id).slice(0, 8)}` : cadastro.empSlugVal;
    const { data: slugExiste } = await db.from('agenda_empresas').select('id').eq('slug', slugBase).maybeSingle();
    const slugFinal = slugExiste ? slugBase + '-' + Date.now().toString().slice(-4) : slugBase;
    const { data: empresa, error: errEmp } = await db.from('agenda_empresas').insert({
      nome: cadastroBasico ? 'Meu negócio' : cadastro.empNomeVal,
      slug: slugFinal,
      area_atuacao: cadastroBasico ? 'Outro' : cadastro.areaAtuacao,
      whatsapp: cadastroBasico ? '' : cadastro.empWhatsappVal,
      email: cadastro.email,
      plano: 'Grátis',
      onboarding_finalizado: !cadastroBasico
    }).select('*').single();
    if (errEmp || !empresa) { console.error(errEmp); toast('Não foi possível criar a empresa: ' + (errEmp?.message || 'tente novamente.'), 'err'); return false; }
    const { error: perfilErr } = await db.from('agenda_perfis').insert({
      auth_user_id: user.id, empresa_id: empresa.id, nome: cadastro.nomeUser,
      email: cadastro.email, whatsapp: cadastroBasico ? '' : cadastro.empWhatsappVal, cargo: 'Administrador'
    });
    if (perfilErr) { console.error(perfilErr); toast('Não foi possível criar o perfil.', 'err'); return false; }
    if (!cadastroBasico) {
      await db.from('agenda_servicos').insert({
        empresa_id: empresa.id, nome: cadastro.servNome, preco: Number(cadastro.servPreco || 0),
        duracao_minutos: Number(cadastro.servDuracao || 60), status: 'ativo', descricao: 'Serviço inicial.'
      });
      await db.from('agenda_profissionais').insert({
        empresa_id: empresa.id, nome: cadastro.profNomeVal,
        especialidade: cadastro.profEsp || 'Profissional', telefone: cadastro.empWhatsappVal, status: 'ativo'
      });
    }
    state.user = user;
    state.perfil = { auth_user_id: user.id, empresa_id: empresa.id, nome: cadastro.nomeUser, email: cadastro.email };
    state.empresa = empresa;
    showDashboard(); await loadAll();
    showNotif('Conta confirmada!', cadastroBasico ? 'Complete seu espaço pelo painel.' : empresa.nome + ' — painel criado com sucesso.', 'ok', 7000);
    return true;
  } catch (e) {
    console.error('Erro ao provisionar cadastro:', e);
    toast('Erro ao concluir o cadastro. Tente novamente.', 'err');
    return false;
  } finally {
    if (btnFin) { btnFin.disabled = false; btnFin.textContent = 'Criar painel →'; }
  }
}

async function finalizarCadastro() {
  const servNome = $('servNome')?.value?.trim();
  const servPreco = $('servPreco')?.value;
  const servDuracao = $('servDuracao')?.value;
  const profNomeVal = $('profNome')?.value?.trim();
  if (!servNome) return authFail('Digite o nome do seu primeiro serviço.', 'servNome');
  if (!servPreco) return authFail('Informe o preço do serviço.', 'servPreco');
  if (!servDuracao) return authFail('Informe a duração do atendimento.', 'servDuracao');
  if (!profNomeVal) return authFail('Digite o nome do primeiro profissional.', 'profNome');
  authFeedback();
  const email = ($('cadEmail')?.value || '').trim().toLowerCase();
  const senha = ($('cadSenha')?.value || '').trim();
  const nomeUser = ($('cadNome')?.value || '').trim();
  const empNomeVal = ($('empNome')?.value || '').trim();
  const empSlugVal = slugify($('empSlug')?.value || empNomeVal);
  const empWhatsappVal = ($('empWhatsapp')?.value || '').trim();
  const catSelect = $('empCategoria');
  const areaAtuacao = catSelect ? (catSelect.options[catSelect.selectedIndex]?.textContent?.trim() || 'Outro') : 'Outro';
  const cadastro = {
    senha,
    email, nomeUser, empNomeVal, empSlugVal, empWhatsappVal, areaAtuacao,
    servNome, servPreco, servDuracao, profNomeVal, profEsp: ($('profEsp')?.value || 'Profissional').trim()
  };
  const btnFin = $('btnFinalizar');
  if (btnFin) { btnFin.disabled = true; btnFin.textContent = 'Criando conta...'; }
  try {
    const signupResponse = await fetch('/api/auth-signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: senha, nome: nomeUser })
    });
    const signupPayload = await signupResponse.json().catch(() => ({}));
    if (!signupResponse.ok) return authFail(mensagemAuth({ message: signupPayload.error }, 'Não foi possível criar a conta.'), 'cadEmail');
    const authData = signupPayload.data;
    if (!authData?.user) return toast('Não foi possível criar a conta. Tente novamente.', 'err');
    guardarCadastroPendente(cadastro);

    // O cadastro sempre deve passar pela confirmação por código antes de
    // provisionar empresa, perfil, serviço e profissional. Mesmo que uma
    // sessão seja devolvida por configuração incorreta do Supabase, ela não
    // pode liberar o painel automaticamente.
    if (authData.session) {
      try { await db.auth.signOut(); } catch (_) {}
    }

    showVerifyEmail(email);
    iniciarContagemReenvio('btnResendSignup', 60);
    authCodeStatus('signup', 'Código enviado. Confira sua caixa de entrada.', 'success');
  } catch (e) {
    console.error('Erro em finalizarCadastro:', e);
    toast('Erro inesperado. Tente novamente.', 'err');
  } finally {
    if (btnFin) { btnFin.disabled = false; btnFin.textContent = 'Criar painel →'; }
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
        addAppNotification('Novo agendamento!', `${payload.new?.cliente_nome || 'Cliente'} acabou de agendar.`, 'new', payload.new?.id || '');
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
      if (novos.length) novos.forEach(a => addAppNotification('Novo agendamento!', `${a.cliente_nome || 'Cliente'} agendou.`, 'new', a.id || ''));
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
    if (typeof window.loadCobrancasFinanceiras === 'function') {
      state.cobrancas = await window.loadCobrancasFinanceiras(id);
    }
    lastIds = new Set(state.agendamentos.map(a => String(a.id)));
    renderAll();
  } catch (e) { console.error('Erro ao carregar dados:', e); }
}

function renderAll() {
  preserveAgendaFormValues(() => {
    renderStats(); renderDashList(); renderCalendar(); renderSelects();
    renderTimeline(); renderClientes(); renderServicos(); renderProfissionais(); renderFinanceiro(); renderDashPremium(); renderDashChart(); renderDashTrends();
    if (typeof window.renderVxdDashboard === 'function') window.renderVxdDashboard();
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

function sparkPath(values) {
  const nums = (values || []).map(Number);
  if (nums.length < 2) return '';
  const min = Math.min(...nums), max = Math.max(...nums);
  const range = (max - min) || 1;
  const stepX = 100 / (nums.length - 1);
  return nums.map((v, i) => {
    const x = (i * stepX).toFixed(2);
    const y = (26 - ((v - min) / range) * 24).toFixed(2);
    return (i === 0 ? 'M' : 'L') + x + ',' + y;
  }).join(' ');
}

function renderDeltaBadge(elId, deltaValue, opts = {}) {
  const el = $(elId);
  if (!el) return;
  const isPts = !!opts.pts;
  const rounded = Math.round((deltaValue || 0) * 10) / 10;
  el.classList.remove('up', 'down', 'flat');
  if (rounded === 0) {
    el.textContent = '— 0,0' + (isPts ? 'pts' : '%');
    el.classList.add('flat');
    return;
  }
  const up = rounded > 0;
  const abs = Math.abs(rounded).toFixed(1).replace('.', ',');
  el.textContent = (up ? '↑ ' : '↓ ') + abs + (isPts ? 'pts' : '%');
  el.classList.add(up ? 'up' : 'down');
}

function renderSparkline(elId, values) {
  const svg = $(elId);
  if (!svg) return;
  const path = svg.querySelector('.stat-spark-line');
  if (!path) return;
  const novoPath = sparkPath(values);
  const mudou = path.getAttribute('d') !== novoPath;
  path.setAttribute('d', novoPath);
  if (!mudou) return;
  let len = 300;
  try { len = path.getTotalLength(); } catch (e) {}
  path.style.transition = 'none';
  path.style.strokeDasharray = len;
  path.style.strokeDashoffset = len;
  void path.getBoundingClientRect();
  requestAnimationFrame(() => {
    path.style.transition = 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)';
    path.style.strokeDashoffset = '0';
  });
}

function renderDashTrends() {
  const ags = state.agendamentos || [];
  const fin = ags.filter(isFinanceiro);
  const hojeDate = new Date();

  const dias7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hojeDate); d.setDate(d.getDate() - i);
    dias7.push(fin.filter(a => dataConclusaoISO(a) === dataLocalISO(d)).reduce((s, a) => s + Number(a.valor || 0), 0));
  }
  const fatOntemVal = dias7[5], fatHojeVal = dias7[6];
  renderDeltaBadge('statFatHojeDelta', fatOntemVal > 0 ? ((fatHojeVal - fatOntemVal) / fatOntemVal * 100) : (fatHojeVal > 0 ? 100 : 0));
  renderSparkline('statFatHojeSpark', dias7);

  const meses6 = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hojeDate.getFullYear(), hojeDate.getMonth() - i, 1);
    const prefixo = dataLocalISO(d).slice(0, 7);
    meses6.push(fin.filter(a => dataConclusaoISO(a).startsWith(prefixo)).reduce((s, a) => s + Number(a.valor || 0), 0));
  }
  const fatMesPassadoVal = meses6[4], fatMesVal = meses6[5];
  renderDeltaBadge('statFatMesDelta', fatMesPassadoVal > 0 ? ((fatMesVal - fatMesPassadoVal) / fatMesPassadoVal * 100) : (fatMesVal > 0 ? 100 : 0));
  renderSparkline('statFatMesSpark', meses6);

  function taxaDoMes(prefixo) {
    const doMes = ags.filter(a => (a.data || '').startsWith(prefixo) && normStatus(a.status) !== 'Excluído');
    const concl = doMes.filter(a => normStatus(a.status) === 'Concluído').length;
    const base = doMes.filter(a => normStatus(a.status) !== 'Recusado').length;
    return base > 0 ? Math.round(concl / base * 100) : 0;
  }
  const taxas6 = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hojeDate.getFullYear(), hojeDate.getMonth() - i, 1);
    taxas6.push(taxaDoMes(dataLocalISO(d).slice(0, 7)));
  }
  renderDeltaBadge('statTaxaDelta', taxas6[5] - taxas6[4], { pts: true });
  renderSparkline('statTaxaSpark', taxas6);

  const clientesAtivos = (state.clientes || []).filter(isAtivoCliente);
  const clientesAgoraVal = clientesAtivos.length;
  const fimMesPassado = new Date(hojeDate.getFullYear(), hojeDate.getMonth(), 0);
  const clientesFimMesPassadoVal = clientesAtivos.filter(c => c.criado_em && new Date(c.criado_em) <= fimMesPassado).length;
  renderDeltaBadge('statClientesDelta', clientesFimMesPassadoVal > 0 ? ((clientesAgoraVal - clientesFimMesPassadoVal) / clientesFimMesPassadoVal * 100) : (clientesAgoraVal > 0 ? 100 : 0));
  const clientesSpark = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hojeDate.getFullYear(), hojeDate.getMonth() - i + 1, 0);
    clientesSpark.push(clientesAtivos.filter(c => c.criado_em && new Date(c.criado_em) <= d).length);
  }
  renderSparkline('statClientesSpark', clientesSpark);
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
  const agS = $('agServico'), agP = $('agProfissional'), agC = $('agClienteSelect');
  const selectedServico = agS ? agS.value : '';
  const selectedProfissional = agP ? agP.value : '';
  const selectedCliente = agC ? agC.value : '';
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
  if (agC) {
    agC.innerHTML = '<option value="">Escolha o cliente</option>' +
      (state.clientes || []).filter(c => (c.status || 'ativo') === 'ativo')
        .map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
    if (selectedCliente && [...agC.options].some(o => o.value === selectedCliente)) {
      agC.value = selectedCliente;
      vxAgendaClienteSelecionado(selectedCliente);
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// VYXORA ANDROID — AGENDA PREMIUM
// ═══════════════════════════════════════════════════════════════
let _vxAgendaDate = new Date();
function vxIsMobileAgenda(){ return window.matchMedia('(max-width: 768px)').matches; }
function vxISODate(d){ const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
function vxAgendaDateLabel(d){
  const today=new Date(); today.setHours(0,0,0,0);
  const x=new Date(d); x.setHours(0,0,0,0);
  const diff=Math.round((x-today)/86400000);
  const mon=x.toLocaleDateString('pt-BR',{month:'short'}).replace('.','').toUpperCase();
  const prefix=diff===0?'HOJE':diff===1?'AMANHÃ':diff===-1?'ONTEM':x.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','').toUpperCase();
  return `${prefix} · ${String(x.getDate()).padStart(2,'0')} ${mon}`;
}

function vxNormalizeAgendaDate(value){
  if(!value) return '';
  const s=String(value).trim();
  const m=s.match(/^(\d{4}-\d{2}-\d{2})/);
  if(m) return m[1];
  const d=new Date(s);
  if(Number.isNaN(d.getTime())) return s.slice(0,10);
  return vxISODate(d);
}
function vxAgendaRowsForSelectedDay(){
  const selected=vxISODate(_vxAgendaDate);
  return ordenarAgendamentosRecentes(state.agendamentos).filter(a=>vxNormalizeAgendaDate(a.data)===selected);
}
function vxUpdateAgendaFilterCounts(){
  if(!vxIsMobileAgenda()) return;
  const all=ordenarAgendamentosRecentes(state.agendamentos);
  const rows=all.filter(a=>normStatus(a.status)!=='Excluído');
  const counts={
    todos:rows.length,
    pendente:rows.filter(a=>normStatus(a.status)==='Pendente').length,
    confirmado:rows.filter(a=>normStatus(a.status)==='Confirmado').length,
    reagendado:rows.filter(a=>normStatus(a.status)==='Reagendado').length,
    concluido:rows.filter(a=>normStatus(a.status)==='Concluído').length,
    recusado:rows.filter(a=>normStatus(a.status)==='Recusado').length,
    excluido:all.filter(a=>normStatus(a.status)==='Excluído').length
  };
  Object.entries(counts).forEach(([k,v])=>{
    const el=document.getElementById('fc-'+k);
    if(el) el.textContent=String(v);
  });
}
function vxAgendaSyncDateUI(){
  const t=document.getElementById('vxAgendaDateText'); if(t)t.textContent=vxAgendaDateLabel(_vxAgendaDate);
  const p=document.getElementById('vxAgendaDatePicker'); if(p)p.value=vxISODate(_vxAgendaDate);
  vxUpdateAgendaFilterCounts();
}
function vxAgendaDay(step){ _vxAgendaDate.setDate(_vxAgendaDate.getDate()+step); vxAgendaSyncDateUI(); const agData=document.getElementById('agData'); if(agData) agData.value=vxISODate(_vxAgendaDate); }
function vxAgendaPickDate(){ const p=document.getElementById('vxAgendaDatePicker'); if(!p)return; if(typeof p.showPicker==='function')p.showPicker(); else p.click(); }
function vxOpenAgendaAdd(){ const s=document.getElementById('vxAgendaAddSheet'); if(!s)return; s.classList.add('open');s.setAttribute('aria-hidden','false'); }
function vxCloseAgendaAdd(){ const s=document.getElementById('vxAgendaAddSheet'); if(!s)return; s.classList.remove('open');s.setAttribute('aria-hidden','true'); }
function vxOpenAgendaForm(type){
  if(!vxIsMobileAgenda()) return;
  vxCloseAgendaAdd();
  if(type==='agendamento'){ document.getElementById('view-agenda')?.classList.add('vx-form-open'); setTimeout(()=>document.getElementById('agClienteSelect')?.focus(),180); return; }
  if(type==='cliente'){
    if(typeof setView==='function') { setView('clientes'); return; }
    if(typeof showView==='function') { showView('clientes'); return; }
    document.querySelector('[data-view="clientes"]')?.click();
  }
}
function vxCloseAgendaForm(){ document.getElementById('view-agenda')?.classList.remove('vx-form-open'); }
function vxOpenAgendaClient(returnTo='agenda'){
  if(!vxIsMobileAgenda()) return;
  const screen=document.getElementById('vxAgendaClientScreen');
  if(!screen) return;
  screen.dataset.return=returnTo;
  screen.classList.add('open');
  screen.setAttribute('aria-hidden','false');
  document.body.classList.add('vx-agenda-client-open');
  setTimeout(()=>document.getElementById('vxAgCliNome')?.focus(),120);
}
function vxCloseAgendaClient(){
  const screen=document.getElementById('vxAgendaClientScreen');
  if(!screen) return;
  screen.classList.remove('open');
  screen.setAttribute('aria-hidden','true');
  document.body.classList.remove('vx-agenda-client-open');
}
async function vxSalvarClienteRapido(){
  const nome=(document.getElementById('vxAgCliNome')?.value||'').trim();
  const telefone=(document.getElementById('vxAgCliTel')?.value||'').trim();
  const email=(document.getElementById('vxAgCliEmail')?.value||'').trim();
  if(!nome) return toast('Digite o nome.', 'err');
  const screen=document.getElementById('vxAgendaClientScreen');
  const returnTo=screen?.dataset.return||'agenda';
  const btn=document.getElementById('vxAgendaClientSave');
  if(btn) btn.disabled=true;
  try{
    const { error }=await db.from('agenda_clientes').insert({
      empresa_id:state.empresa.id,
      nome,
      telefone,
      email,
      status:'ativo'
    });
    if(error) return toast('Erro ao salvar: '+error.message,'err');
    await loadAll();
    if(returnTo==='appointment'){
      const nomeInput=document.getElementById('agCliente');
      const telInput=document.getElementById('agTelefone');
      if(nomeInput) nomeInput.value=nome;
      if(telInput) telInput.value=telefone;
    }
    ['vxAgCliNome','vxAgCliTel','vxAgCliEmail'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.value='';
    });
    vxCloseAgendaClient();
    showNotif('Cliente adicionado',nome+' salvo com sucesso.','ok');
    if(returnTo==='appointment'){
      setTimeout(()=>document.getElementById('agServico')?.focus(),120);
    }
  } finally {
    if(btn) btn.disabled=false;
  }
}


window.vxOpenAgendaClient = vxOpenAgendaClient;
window.vxCloseAgendaClient = vxCloseAgendaClient;
window.vxSalvarClienteRapido = vxSalvarClienteRapido;
window.vxOpenAgendaAdd = vxOpenAgendaAdd;
window.vxCloseAgendaAdd = vxCloseAgendaAdd;
window.vxOpenAgendaForm = vxOpenAgendaForm;
window.vxCloseAgendaForm = vxCloseAgendaForm;
window.vxAgendaDay = vxAgendaDay;
window.vxAgendaPickDate = vxAgendaPickDate;

document.addEventListener('DOMContentLoaded',()=>{
  
  vxUpdateAgendaFilterCounts();
});


function vxAgendaClienteSelecionado(id){
  const cliente=(state.clientes||[]).find(c=>String(c.id)===String(id));
  const nomeInput=document.getElementById('agCliente');
  const telInput=document.getElementById('agTelefone');
  const summary=document.getElementById('vxAgendaClientSummary');
  const summaryName=document.getElementById('vxAgendaClientSummaryName');
  const summaryContact=document.getElementById('vxAgendaClientSummaryContact');
  if(!cliente){
    if(nomeInput) nomeInput.value='';
    if(telInput) telInput.value='';
    if(summary) summary.hidden=true;
    return;
  }
  if(nomeInput) nomeInput.value=cliente.nome||'';
  if(telInput) telInput.value=cliente.telefone||'';
  const contact=[cliente.telefone,cliente.email].filter(Boolean).join(' | ');
  if(summaryName) summaryName.textContent=cliente.nome||'Cliente';
  if(summaryContact) summaryContact.textContent=contact||'Sem contato informado';
  if(summary) summary.hidden=false;
}
window.vxAgendaClienteSelecionado=vxAgendaClienteSelecionado;



let _vxAgendaPickerType='';
let _vxAgendaCalDate=new Date();

function vxFormatAgendaDate(iso){
  if(!iso) return 'Escolher data';
  const [y,m,d]=iso.split('-');
  return `${d}/${m}/${y}`;
}

function vxSyncAgendaModalControlLabels(){
  const clienteId=$('vxAgCliente')?.value;
  const servicoId=$('vxAgServico')?.value;
  const profissionalId=$('vxAgProfissional')?.value;

  const cliente=(state.clientes||[]).find(x=>String(x.id)===String(clienteId));
  const servico=(state.servicos||[]).find(x=>String(x.id)===String(servicoId));
  const prof=(state.profissionais||[]).find(x=>String(x.id)===String(profissionalId));

  if($('vxAgClienteLabel')) $('vxAgClienteLabel').textContent=cliente?.nome||'Escolha o cliente';
  if($('vxAgServicoLabel')) $('vxAgServicoLabel').textContent=servico?.nome||'Escolha o serviço';
  if($('vxAgProfissionalLabel')) $('vxAgProfissionalLabel').textContent=prof?.nome||'Escolha o profissional';
  if($('vxAgDataLabel')) $('vxAgDataLabel').textContent=$('vxAgData')?.value?vxFormatAgendaDate($('vxAgData').value):'Escolher data';
  if($('vxAgHoraLabel')) $('vxAgHoraLabel').textContent=$('vxAgHora')?.value||'Escolher horário';
  if($('vxAgStatusLabel')) $('vxAgStatusLabel').textContent=$('vxAgStatus')?.value||'Pendente';
}

function vxOpenAgendaPickerBase(title){
  const layer=$('vxAgendaPickerLayer');
  const titleEl=$('vxAgendaPickerTitle');
  const content=$('vxAgendaPickerContent');
  if(!layer||!content) return null;
  if(titleEl) titleEl.textContent=title;
  layer.hidden=false;
  layer.style.setProperty('display','grid','important');
  return content;
}

function vxCloseAgendaPicker(){
  const layer=$('vxAgendaPickerLayer');
  if(!layer) return;
  layer.hidden=true;
  layer.style.setProperty('display','none','important');
  _vxAgendaPickerType='';
}
window.vxCloseAgendaPicker=vxCloseAgendaPicker;

function vxAgendaChoiceItems(type){
  if(type==='cliente'){
    return (state.clientes||[])
      .filter(x=>(x.status||'ativo')==='ativo')
      .map(x=>({value:String(x.id),label:x.nome,sub:[x.telefone,x.email].filter(Boolean).join(' | ')}));
  }
  if(type==='servico'){
    return (state.servicos||[])
      .filter(x=>(x.status||'ativo')==='ativo')
      .map(x=>({value:String(x.id),label:x.nome,sub:x.preco!=null?money(x.preco):''}));
  }
  if(type==='profissional'){
    return (state.profissionais||[])
      .filter(x=>(x.status||'ativo')==='ativo')
      .map(x=>({value:String(x.id),label:x.nome,sub:''}));
  }
  if(type==='status'){
    return [
      {value:'Pendente',label:'Pendente',sub:''},
      {value:'Confirmado',label:'Confirmado',sub:''}
    ];
  }
  return [];
}

function vxOpenAgendaChoice(type){
  _vxAgendaPickerType=type;
  const titles={cliente:'Escolha o cliente',servico:'Escolha o serviço',profissional:'Escolha o profissional',status:'Escolha o status'};
  const content=vxOpenAgendaPickerBase(titles[type]||'Escolha');
  if(!content) return;

  const current=$(`vxAg${type==='cliente'?'Cliente':type==='servico'?'Servico':type==='profissional'?'Profissional':'Status'}`)?.value||'';
  const items=vxAgendaChoiceItems(type);

  content.innerHTML=`<div class="vx-agenda-choice-list">${
    items.length ? items.map(item=>`
      <button type="button" class="vx-agenda-choice-item${String(current)===item.value?' selected':''}" onclick="vxSelectAgendaChoice('${type}','${String(item.value).replace(/'/g,"\\'")}')">
        <span><strong>${escapeHtml(item.label||'')}</strong>${item.sub?`<small>${escapeHtml(item.sub)}</small>`:''}</span>
        <i>${String(current)===item.value?'✓':''}</i>
      </button>`).join('')
      : '<div class="vx-agenda-picker-empty">Nenhuma opção disponível.</div>'
  }</div>`;
}
window.vxOpenAgendaChoice=vxOpenAgendaChoice;

function vxSelectAgendaChoice(type,value){
  const map={cliente:'vxAgCliente',servico:'vxAgServico',profissional:'vxAgProfissional',status:'vxAgStatus'};
  const input=$(map[type]);
  if(input) input.value=value;

  if(type==='cliente') vxAgendaModalClienteInfo();

  // Trocar profissional ou serviço invalida horário anterior.
  if(type==='profissional'||type==='servico'){
    if($('vxAgHora')) $('vxAgHora').value='';
  }

  vxSyncAgendaModalControlLabels();
  vxCloseAgendaPicker();
}
window.vxSelectAgendaChoice=vxSelectAgendaChoice;

function vxOpenAgendaCalendar(){
  _vxAgendaPickerType='data';
  const current=$('vxAgData')?.value;
  _vxAgendaCalDate=current?new Date(current+'T12:00:00'):new Date();
  vxRenderAgendaCalendar();
}
window.vxOpenAgendaCalendar=vxOpenAgendaCalendar;

function vxAgendaCalMove(delta){
  _vxAgendaCalDate=new Date(_vxAgendaCalDate.getFullYear(),_vxAgendaCalDate.getMonth()+delta,1);
  vxRenderAgendaCalendar();
}
window.vxAgendaCalMove=vxAgendaCalMove;

function vxRenderAgendaCalendar(){
  const content=vxOpenAgendaPickerBase('Escolha a data');
  if(!content) return;

  const y=_vxAgendaCalDate.getFullYear();
  const m=_vxAgendaCalDate.getMonth();
  const first=new Date(y,m,1);
  const last=new Date(y,m+1,0);
  const today=new Date(); today.setHours(0,0,0,0);
  const closed=state.empresa?.dias_fechados||state.diasFechados||[];
  const selected=$('vxAgData')?.value||'';
  const monthNames=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  let days='';
  for(let i=0;i<first.getDay();i++) days+='<span class="vx-agenda-cal-empty"></span>';
  for(let d=1;d<=last.getDate();d++){
    const dt=new Date(y,m,d); dt.setHours(0,0,0,0);
    const iso=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const disabled=dt<today||closed.includes(dt.getDay());
    days+=`<button type="button" class="vx-agenda-cal-day${selected===iso?' selected':''}${disabled?' disabled':''}" ${disabled?'disabled':`onclick="vxSelectAgendaDate('${iso}')"`}>${d}</button>`;
  }

  content.innerHTML=`
    <div class="vx-agenda-cal-nav">
      <button type="button" onclick="vxAgendaCalMove(-1)">‹</button>
      <strong>${monthNames[m]} de ${y}</strong>
      <button type="button" onclick="vxAgendaCalMove(1)">›</button>
    </div>
    <div class="vx-agenda-cal-week"><span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div>
    <div class="vx-agenda-cal-grid">${days}</div>`;
}

function vxSelectAgendaDate(iso){
  if($('vxAgData')) $('vxAgData').value=iso;
  if($('vxAgHora')) $('vxAgHora').value='';
  vxSyncAgendaModalControlLabels();
  vxCloseAgendaPicker();
}
window.vxSelectAgendaDate=vxSelectAgendaDate;

async function vxOpenAgendaTimes(){
  const data=$('vxAgData')?.value;
  const profissionalId=$('vxAgProfissional')?.value;
  if(!data) return toast('Escolha a data primeiro.','warn');
  if(!profissionalId) return toast('Escolha o profissional antes do horário.','warn');

  const content=vxOpenAgendaPickerBase('Escolha o horário');
  if(!content) return;
  content.innerHTML='<div class="vx-agenda-picker-empty">Carregando horários...</div>';

  const empresa=state.empresa||{};
  const profissional=(state.profissionais||[]).find(x=>String(x.id)===String(profissionalId))||{};
  const inicio=empresa.horario_inicio||profissional.horario_inicio||'09:00';
  const fim=empresa.horario_fim||profissional.horario_fim||'18:00';
  const intervalo=Math.max(5,Number(empresa.intervalo_slots||profissional.intervalo_slots||30));

  const {data:registros,error}=await db.from('agenda_agendamentos')
    .select('hora,status')
    .eq('data',data)
    .eq('profissional_id',profissionalId)
    .in('status',['Pendente','Confirmado','Reagendado']);

  if(error){
    content.innerHTML='<div class="vx-agenda-picker-empty">Não foi possível carregar os horários.</div>';
    return;
  }

  const ocupados=new Set((registros||[]).map(x=>(x.hora||'').slice(0,5)));
  const [hi,mi]=inicio.split(':').map(Number);
  const [hf,mf]=fim.split(':').map(Number);
  const slots=[];
  for(let t=hi*60+mi;t<hf*60+mf;t+=intervalo){
    const h=`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
    slots.push(h);
  }

  const current=$('vxAgHora')?.value||'';
  content.innerHTML=`<div class="vx-agenda-time-grid">${
    slots.map(h=>`<button type="button" class="vx-agenda-time-item${current===h?' selected':''}${ocupados.has(h)?' disabled':''}" ${ocupados.has(h)?'disabled':`onclick="vxSelectAgendaTime('${h}')"`}>${h}${ocupados.has(h)?'<small>Ocupado</small>':''}</button>`).join('')
  }</div>`;
}
window.vxOpenAgendaTimes=vxOpenAgendaTimes;

function vxSelectAgendaTime(hora){
  if($('vxAgHora')) $('vxAgHora').value=hora;
  vxSyncAgendaModalControlLabels();
  vxCloseAgendaPicker();
}
window.vxSelectAgendaTime=vxSelectAgendaTime;


function vxAgendaModalIsMobile(){
  return window.matchMedia('(max-width:768px)').matches;
}

function vxPopulateAgendaModal(){
  const date=$('vxAgData');
  const status=$('vxAgStatus');

  if(date && !date.value){
    const now=new Date();
    const y=now.getFullYear(), m=String(now.getMonth()+1).padStart(2,'0'), d=String(now.getDate()).padStart(2,'0');
    date.value=`${y}-${m}-${d}`;
    const label=$('vxAgDataLabel');
    if(label) label.textContent=vxFormatAgendaDate(date.value);
  }

  if(status && !status.value) status.value='Pendente';
  const statusLabel=$('vxAgStatusLabel');
  if(statusLabel) statusLabel.textContent=status?.value||'Pendente';

  vxSyncAgendaModalControlLabels();
}

function vxApplyAgendaModalFinalStyle(){
  const modal=$('vxAgendaModal');
  const card=modal?.querySelector('.vx-agenda-modal-card');
  const backdrop=modal?.querySelector('.vx-agenda-modal-backdrop');
  const head=modal?.querySelector('.vx-agenda-modal-head');
  const closeBtn=head?.querySelector('button');
  const body=modal?.querySelector('.vx-agenda-modal-body');
  const save=$('vxAgendaModalSave');

  if(!modal||!card||!body) return;

  const imp=(el,prop,val)=>el?.style.setProperty(prop,val,'important');

  // Modal: centralizado de verdade e usando praticamente a tela toda.
  imp(modal,'display','grid');
  imp(modal,'position','fixed');
  imp(modal,'inset','0');
  imp(modal,'width','100vw');
  imp(modal,'height','var(--vx-clientes-viewport-h, 100dvh)');
  imp(modal,'min-height','100dvh');
  imp(modal,'max-width','100vw');
  imp(modal,'overflow','visible');
  imp(modal,'place-items','center');
  imp(modal,'align-items','center');
  imp(modal,'justify-items','center');
  imp(modal,'padding','0 8px');
  imp(modal,'margin','0');
  imp(modal,'transform','none');
  imp(modal,'background','#08070d');

  // Agenda permanece visível atrás.
  imp(backdrop,'background','#08070d');
  imp(backdrop,'backdrop-filter','none');
  imp(backdrop,'-webkit-backdrop-filter','none');
  imp(backdrop,'pointer-events','none');

  // Caixa principal: larga e 100% quadrada.
  imp(card,'width','calc(100vw - 16px)');
  imp(card,'max-width','calc(100vw - 16px)');
  imp(card,'max-height','calc(var(--vx-clientes-viewport-h, 100dvh) - 16px)');
  imp(card,'box-sizing','border-box');
  imp(card,'overflow-y','hidden');
  imp(card,'overflow-x','hidden');
  imp(card,'position','relative');
  imp(card,'top','auto');
  imp(card,'right','auto');
  imp(card,'bottom','auto');
  imp(card,'left','auto');
  imp(card,'margin','0 auto');
  imp(card,'transform','none');
  imp(card,'padding','0 14px 14px');
  imp(card,'border-radius','0');

  /* Campos reais do modal Cliente: força formato totalmente quadrado. */
  ['vxCliNome','vxCliTel','vxCliEmail'].forEach(id=>{
    const input=$(id);
    imp(input,'border-radius','0');
    imp(input,'-webkit-border-radius','0');
  });
  imp(card,'background','#0d0b10');
  imp(card,'border','1px solid rgba(163,101,232,.24)');
  imp(card,'box-shadow','0 14px 32px rgba(0,0,0,.28)');

  // Cabeçalho.
  imp(head,'height','44px');
  imp(head,'min-height','44px');
  imp(head,'margin','0 -14px 12px');
  imp(head,'padding','0 12px 0 14px');
  imp(head,'border-radius','0');
  imp(head,'background','#0d0b10');

  imp(closeBtn,'width','30px');
  imp(closeBtn,'height','30px');
  imp(closeBtn,'border-radius','0');
  imp(closeBtn,'position','relative');
  imp(closeBtn,'z-index','2147483647');
  imp(closeBtn,'pointer-events','auto');
  imp(closeBtn,'touch-action','manipulation');

  // Grade interna centralizada e usando toda a largura útil.
  imp(body,'width','100%');
  imp(body,'margin','0 auto');
  imp(body,'grid-template-columns','minmax(0,1fr) minmax(0,1fr)');
  imp(body,'gap','10px 12px');

  modal.querySelectorAll('.vx-agenda-modal-field').forEach(field=>{
    imp(field,'width','100%');
    imp(field,'margin','0');
  });

  modal.querySelectorAll('.vx-agenda-modal-field select, .vx-agenda-modal-field input').forEach(input=>{
    imp(input,'width','100%');
    imp(input,'height','44px');
    imp(input,'min-height','44px');
    imp(input,'padding','0 12px');
    imp(input,'border-radius','0');
    imp(input,'background','#09080b');
  });

  modal.querySelectorAll('.vx-agenda-modal-client, .vx-agenda-modal-status').forEach(field=>{
    imp(field,'grid-column','1 / -1');
  });

  imp(save,'width','100%');
  imp(save,'height','44px');
  imp(save,'min-height','44px');
  imp(save,'margin','12px 0 0');
  imp(save,'border-radius','0');
  imp(save,'box-shadow','none');
}

function vxOpenAgendaModal(){
  if(!vxAgendaModalIsMobile()) return;
  vxPopulateAgendaModal();
  const modal=$('vxAgendaModal');
  if(!modal) return;

  // IMPORTANTE: tira o modal de dentro da Agenda antes de abrir.
  // Isso evita qualquer corte causado por overflow/transform dos containers da tela.
  if(modal.parentElement !== document.body){
    document.body.appendChild(modal);
  }

  const success=$('vxAgendaSuccess');
  const formBody=modal.querySelector('.vx-agenda-modal-body');
  const saveBtn=$('vxAgendaModalSave');
  if(success){
    success.hidden=true;
    success.style.setProperty('display','none','important');
  }
  if(formBody){
    formBody.hidden=false;
    formBody.style.setProperty('display','grid','important');
  }
  if(saveBtn){
    saveBtn.hidden=false;
    saveBtn.style.setProperty('display','block','important');
  }

  modal.style.removeProperty('display');
  modal.style.removeProperty('pointer-events');

  vxApplyAgendaModalFinalStyle();
  modal.classList.add('open');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('vx-agenda-modal-open');
}


document.addEventListener('click',(e)=>{
  const btn=e.target?.closest?.('.vx-agenda-modal-close');
  if(!btn) return;
  e.preventDefault();
  e.stopPropagation();
  vxCloseAgendaModal();
},true);

function vxCloseAgendaModal(){
  const modal=document.getElementById('vxAgendaModal');
  if(!modal) return;

  modal.classList.remove('open');
  modal.setAttribute('aria-hidden','true');

  // Força o fechamento visual imediatamente.
  modal.style.setProperty('display','none','important');
  modal.style.setProperty('pointer-events','none','important');

  document.body.classList.remove('vx-agenda-modal-open');
}

function vxAgendaModalClienteInfo(){
  const id=$('vxAgCliente')?.value;
  const c=(state.clientes||[]).find(x=>String(x.id)===String(id));
  const info=$('vxAgClienteInfo');
  const label=$('vxAgClienteLabel');
  if(label) label.textContent=c?.nome||'Escolha o cliente';
  if(!info) return;
  const contact=[c?.telefone,c?.email].filter(Boolean).join(' | ');
  info.textContent=contact||'';
}


function vxResetAgendaModalForm(){
  ['vxAgCliente','vxAgServico','vxAgProfissional','vxAgHora'].forEach(id=>{
    const el=$(id); if(el) el.value='';
  });
  const status=$('vxAgStatus');
  if(status) status.value='Pendente';
  const info=$('vxAgClienteInfo');
  if(info) info.textContent='';
  vxSyncAgendaModalControlLabels();
}

function vxShowAgendaSuccess(clienteNome){
  const modal=$('vxAgendaModal');
  const body=modal?.querySelector('.vx-agenda-modal-body');
  const save=$('vxAgendaModalSave');
  const success=$('vxAgendaSuccess');
  const text=$('vxAgendaSuccessText');

  if(text) text.textContent=(clienteNome||'Cliente')+' agendado com sucesso.';

  // O CSS do formulário usa display:grid!important.
  // Por isso o atributo hidden sozinho não era suficiente.
  if(body){
    body.hidden=true;
    body.style.setProperty('display','none','important');
  }
  if(save){
    save.hidden=true;
    save.style.setProperty('display','none','important');
  }
  if(success){
    success.hidden=false;
    success.style.setProperty('display','flex','important');
  }
}

function vxNovoAgendamentoAposSucesso(){
  const modal=$('vxAgendaModal');
  const body=modal?.querySelector('.vx-agenda-modal-body');
  const save=$('vxAgendaModalSave');
  const success=$('vxAgendaSuccess');

  if(success){
    success.hidden=true;
    success.style.setProperty('display','none','important');
  }
  if(body){
    body.hidden=false;
    body.style.setProperty('display','grid','important');
  }
  if(save){
    save.hidden=false;
    save.style.setProperty('display','block','important');
  }

  vxResetAgendaModalForm();
  vxPopulateAgendaModal();
}

window.vxNovoAgendamentoAposSucesso=vxNovoAgendamentoAposSucesso;

async function vxSalvarAgendamentoModal(){
  if(!vxAgendaModalIsMobile()) return;
  const clienteId=$('vxAgCliente')?.value;
  const servicoId=$('vxAgServico')?.value;
  const profissionalId=$('vxAgProfissional')?.value;
  const data=$('vxAgData')?.value;
  const hora=$('vxAgHora')?.value;
  const status=$('vxAgStatus')?.value||'Pendente';

  if(!clienteId||!servicoId||!profissionalId||!data||!hora){
    toast('Preencha todos os campos.','err');
    return;
  }

  const cliente=(state.clientes||[]).find(c=>String(c.id)===String(clienteId));
  const serv=(state.servicos||[]).find(s=>String(s.id)===String(servicoId));
  const prof=(state.profissionais||[]).find(p=>String(p.id)===String(profissionalId));
  const btn=$('vxAgendaModalSave');
  if(btn) btn.disabled=true;

  try{
    const { data:novoAgendamento, error }=await db.from('agenda_agendamentos').insert({
      empresa_id:state.empresa.id,
      cliente_id:clienteId,
      servico_id:serv?.id||null,
      profissional_id:prof?.id||null,
      cliente_nome:cliente?.nome||'',
      cliente_telefone:cliente?.telefone||'',
      servico_nome:serv?.nome||'',
      profissional_nome:prof?.nome||'',
      data,
      hora,
      status,
      valor:Number(serv?.preco||0)
    }).select('*').single();
    if(error){
      toast('Erro ao salvar: '+error.message,'err');
      return;
    }

    // Atualiza imediatamente o estado local, sem depender do ciclo completo de loadAll().
    if(novoAgendamento){
      const semDuplicar=(state.agendamentos||[]).filter(a=>String(a.id)!==String(novoAgendamento.id));
      state.agendamentos=ordenarAgendamentosRecentes([novoAgendamento,...semDuplicar]);

      // Atualiza exatamente as duas áreas afetadas pelo novo agendamento.
      renderTimeline();
      renderClientes();

      // Mantém contadores/resumos coerentes.
      renderStats();
      renderDashList();
      renderCalendar();
      if(typeof vxUpdateAgendaFilterCounts==='function') vxUpdateAgendaFilterCounts();
    }

    // Sincronização completa em seguida; se outro renderer falhar,
    // Agenda e Clientes já terão sido atualizados acima.
    try{
      await loadAll();
    }catch(syncErr){
      console.warn('Sincronização pós-agendamento:',syncErr);
    }

    vxResetAgendaModalForm();
    vxShowAgendaSuccess(cliente?.nome||'Cliente');
  } finally {
    if(btn) btn.disabled=false;
  }
}

window.vxApplyAgendaModalFinalStyle=vxApplyAgendaModalFinalStyle;
window.vxOpenAgendaModal=vxOpenAgendaModal;
window.vxCloseAgendaModal=vxCloseAgendaModal;
window.vxSalvarAgendamentoModal=vxSalvarAgendamentoModal;

window.addEventListener('resize',()=>{
  if(document.getElementById('vxAgendaModal')?.classList.contains('open')){
    vxApplyAgendaModalFinalStyle();
  }
});



function setFilter(filter, btn) {
  _agendaFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTimeline();
}

function renderTimeline() {
  const el = $('agendaTimeline');
  if (!el) return;
  const mobile=vxIsMobileAgenda();
  const all=ordenarAgendamentosRecentes(state.agendamentos);
  const ags=all;
  const statusMap = { pendente:'Pendente', confirmado:'Confirmado', reagendado:'Reagendado', concluido:'Concluído', recusado:'Recusado', excluido:'Excluído' };
  let filtered;
  if (_agendaFilter === 'excluido') filtered = ags.filter(a => normStatus(a.status) === 'Excluído');
  else if (_agendaFilter !== 'todos') { const target=statusMap[_agendaFilter]; filtered=ags.filter(a=>normStatus(a.status)===target); }
  else filtered=ags.filter(a=>normStatus(a.status)!=='Excluído');

  if (!filtered.length) {
    el.innerHTML = `<div class="empty-state vx-agenda-empty"><p>Nenhum agendamento neste filtro.</p></div>`;
    vxUpdateAgendaFilterCounts();
    return;
  }
  el.innerHTML='';
  filtered.forEach(a=>{
    const block=document.createElement('div');
    block.className='tl-block'; block.id='ag-'+a.id;
    const tel=(a.cliente_telefone||a.telefone||'').trim();
    const email=(a.cliente_email||a.email||'').trim();
    const contact=[tel,email].filter(Boolean).join(' | ');
    block.innerHTML=`
      <div class="tl-time">${String(a.hora||'—').slice(0,5)}</div>
      <div class="tl-line"></div>
      <div class="tl-content">
        <div class="tl-card">
          <div class="tl-card-top">
            <div class="apt-av">${initial(a.cliente_nome)}</div>
            <div class="tl-card-info">
              <div class="tl-card-name">${a.cliente_nome||'Cliente'}</div>
              <div class="tl-card-service">${a.servico_nome||'—'}</div>
              ${contact?`<div class="tl-card-contact" title="${contact.replace(/"/g,'&quot;')}">${contact}</div>`:''}
            </div>
            <div class="tl-card-status"><span class="badge ${badgeClass(a.status)}">${normStatus(a.status)}</span></div>
          </div>
          ${renderAcoes(a)}
        </div>
      </div>`;
    const card=block.querySelector('.tl-card');
    const menu=buildActionMenu(a.id,[
      {icon:'✏️',label:'Editar',action:()=>editAgendamento(a.id)},
      {icon:'📋',label:'Duplicar',action:()=>duplicarAgendamento(a.id)},
      'sep',
      {icon:'🗑',label:'Excluir',cls:'danger',action:()=>excluirAgendamento(a.id)}
    ]);
    if(card)card.appendChild(menu);
    el.appendChild(block);
  });
  vxUpdateAgendaFilterCounts();
}
function renderAcoes(a) {
  const tel=(a.cliente_telefone||a.telefone||'').replace(/\D/g,'');
  const s=normStatus(a.status);
  const wa=tel?`<button class="act-btn whatsapp vx-action-wide" onclick="abrirWA('${a.id}')">WhatsApp</button>`:'';
  if(s==='Excluído') return `<div class="apt-actions vx-actions-compact"><button class="act-btn muted" disabled>Excluído</button></div>`;
  if(s==='Recusado') return `<div class="apt-actions vx-actions-compact">${wa||'<button class="act-btn muted" disabled>Recusado</button>'}</div>`;
  if(s==='Concluído') return `<div class="apt-actions vx-actions-compact vx-actions-completed">${wa}<button class="act-btn refuse" onclick="excluirAgendamento('${a.id}')">Arquivar</button></div>`;
  return `<div class="apt-actions vx-actions-compact">
    ${s!=='Confirmado'?`<button class="act-btn confirm" onclick="confirmarAg('${a.id}')">Confirmar</button>`:`<button class="act-btn confirm" disabled>Confirmado</button>`}
    <button class="act-btn refuse" onclick="openModalRecusa('${a.id}')">Recusar</button>
    <button class="act-btn reschedule" onclick="openModalReagendar('${a.id}')">Reagendar</button>
    <button class="act-btn conclude" onclick="concluirAg('${a.id}')">Concluir</button>
    ${wa}
  </div>`;
}
function ensureActionCenterModal() {
  let modal = document.getElementById('actionCenterModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'actionCenterModal';
  modal.className = 'action-center-modal';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="action-center-backdrop" data-action-close></div>
    <section class="action-center-dialog" role="dialog" aria-modal="true" aria-labelledby="actionCenterTitle">
      <header class="action-center-head">
        <div>
          <span class="action-center-kicker">GERENCIAR</span>
          <h3 id="actionCenterTitle">Ações do agendamento</h3>
          <p>Escolha o que deseja fazer com este registro.</p>
        </div>
        <button type="button" class="action-center-close" data-action-close aria-label="Fechar">×</button>
      </header>
      <div class="action-center-list" id="actionCenterList"></div>
      <button type="button" class="action-center-cancel" data-action-close>Cancelar</button>
    </section>`;

  modal.addEventListener('click', e => {
    if (e.target.closest('[data-action-close]')) closeActionCenterModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeActionCenterModal();
  });
  document.body.appendChild(modal);
  return modal;
}

function openActionCenterModal(items, title = 'Ações do agendamento') {
  const modal = ensureActionCenterModal();
  const list = modal.querySelector('#actionCenterList');
  const heading = modal.querySelector('#actionCenterTitle');
  heading.textContent = title;
  list.innerHTML = '';

  items.filter(item => item !== 'sep').forEach(item => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'action-center-item' + (item.cls ? ' ' + item.cls : '');
    button.innerHTML = `
      <span class="action-center-icon">${item.icon}</span>
      <span class="action-center-copy">
        <strong>${item.label}</strong>
        <small>${item.label === 'Editar' ? 'Alterar dados deste registro' : item.label === 'Duplicar' ? 'Criar uma nova cópia' : 'Remover este registro'}</small>
      </span>
      <span class="action-center-arrow">›</span>`;
    button.addEventListener('click', () => {
      closeActionCenterModal();
      setTimeout(() => item.action(), 120);
    });
    list.appendChild(button);
  });

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('action-center-open');
  requestAnimationFrame(() => modal.querySelector('.action-center-close')?.focus());
}

function closeActionCenterModal() {
  const modal = document.getElementById('actionCenterModal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('action-center-open');
}

function buildActionMenu(id, items) {
  const wrap = document.createElement('div');
  wrap.className = 'action-menu action-menu-center';

  const btn = document.createElement('button');
  btn.className = 'action-menu-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Abrir ações do registro');
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.innerHTML = '<span></span><span></span><span></span>';
  btn.addEventListener('click', e => {
    e.stopPropagation();
    e.preventDefault();
    openActionCenterModal(items, 'Ações do agendamento');
  });

  wrap.appendChild(btn);
  return wrap;
}

function closeAllMenus() {
  closeActionCenterModal();
  document.querySelectorAll('.action-menu.open').forEach(menu => menu.classList.remove('open'));
  document.querySelectorAll('.action-dropdown.open').forEach(drop => drop.classList.remove('open'));
  document.querySelectorAll('body > .action-dropdown').forEach(drop => drop.remove());
  _openMenu = null;
  _openMenuBtn = null;
}

function renderClientes() {
  const el = $('clientesGrid');
  if (!el) return;
  const clientes = state.clientes || [];
  if (!clientes.length) { el.innerHTML = '<div class="empty-state directory-empty" style="grid-column:1/-1"><div class="es-icon">👥</div><p>Nenhum cliente cadastrado.</p><span>Use + ADICIONAR para criar o primeiro contato.</span></div>'; return; }
  el.innerHTML = '';
  clientes.forEach(c => {
    const agts = (state.agendamentos || []).filter(a => a.cliente_nome === c.nome && normStatus(a.status) !== 'Excluído').length;
    const gasto = (state.agendamentos || []).filter(a => a.cliente_nome === c.nome && isFinanceiro(a)).reduce((s, a) => s + Number(a.valor || 0), 0);
    const ativo = isAtivoCliente(c);
    const card = document.createElement('div'); card.className = 'client-card premium-record-card' + (ativo ? '' : ' inactive');
    card.innerHTML = `
      <div class="record-card-accent"></div>
      <div class="record-card-top">
        <div class="cc-av record-avatar">${initial(c.nome)}</div>
        <div class="record-main"><div class="cc-name record-name">${c.nome}</div><div class="record-type">Cliente</div></div>
        <span class="badge ${ativo ? 'badge-green' : 'badge-gray'} record-status">${ativo ? 'Ativo' : 'Inativo'}</span>
      </div>
      <div class="record-contact-list">
        <div class="record-contact"><span>☎</span><div><small>Telefone</small><strong>${c.telefone || 'Não informado'}</strong></div></div>
        <div class="record-contact"><span>✉</span><div><small>E-mail</small><strong>${c.email || 'Não informado'}</strong></div></div>
      </div>
      <div class="cc-stats record-stats">
        <div class="cc-stat"><div class="cc-sl">Atendimentos</div><div class="cc-sv">${agts}</div></div>
        <div class="cc-stat"><div class="cc-sl">Total gasto</div><div class="cc-sv record-money">${money(gasto).replace(',00', '')}</div></div>
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
  if (!vis.length) { el.innerHTML = '<div class="empty-state directory-empty" style="grid-column:1/-1"><div class="es-icon">✦</div><p>Nenhum serviço cadastrado.</p><span>Adicione o primeiro item do seu catálogo.</span></div>'; return; }
  el.innerHTML = '';
  vis.forEach(s => {
    const ativo = s.status === 'ativo';
    const card = document.createElement('div'); card.className = 'svc-card premium-record-card service-record-card' + (ativo ? '' : ' inactive');
    card.innerHTML = `
      <div class="record-card-accent"></div>
      <div class="service-card-head"><span class="service-symbol">◈</span><span class="badge ${ativo ? 'badge-green' : 'badge-gray'} record-status">${ativo ? 'Ativo' : 'Inativo'}</span></div>
      <div class="svc-name record-name">${s.nome}</div>
      <div class="record-type">Serviço cadastrado</div>
      <div class="service-info-grid">
        <div class="service-info"><small>Valor</small><strong>${money(s.preco).replace(',00', '')}</strong></div>
        <div class="service-info"><small>Duração</small><strong>${s.duracao_minutos || 60} min</strong></div>
      </div>
      <div class="service-footer"><span>Pronto para agendamentos</span><span>⏱</span></div>`;
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
  if (!vis.length) { el.innerHTML = '<div class="empty-state directory-empty" style="grid-column:1/-1"><div class="es-icon">👤</div><p>Nenhum profissional cadastrado.</p><span>Adicione quem fará parte da agenda da empresa.</span></div>'; return; }
  el.innerHTML = '';
  vis.forEach(p => {
    const ativo = p.status === 'ativo';
    const card = document.createElement('div'); card.className = 'prof-card premium-record-card professional-record-card' + (ativo ? '' : ' inactive');
    card.innerHTML = `
      <div class="record-card-accent"></div>
      <div class="professional-card-top">
        <div class="prof-av record-avatar">${initial(p.nome)}</div>
        <span class="badge ${ativo ? 'badge-green' : 'badge-gray'} record-status">${ativo ? 'Disponível' : 'Indisponível'}</span>
      </div>
      <div class="prof-name record-name">${p.nome}</div>
      <div class="prof-esp professional-specialty">${p.especialidade || 'Profissional'}</div>
      <div class="professional-contact"><span>☎</span><strong>${p.telefone || 'Telefone não informado'}</strong></div>
      <div class="professional-footer"><div class="online-dot${ativo ? '' : ' off'}">${ativo ? 'Agenda ativa' : 'Agenda inativa'}</div><span class="team-label">Equipe</span></div>`;
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

const DIAS_SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_SEMANA_NOME = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

let chartPeriodAtual = 'dias';
let _chartHoverState = null;

// Série de CONTAGEM por status (Confirmados/Recusados/Concluídos), usada pelo gráfico de desempenho do PC.
// Não usa isFinanceiro() de propósito: Concluídos aqui é status operacional puro, não a regra financeira
// (que também aceita Excluído+financeiro_status=Concluído). getChartSeries()/getPeriodBreakdown() continuam intactas.
function getStatusSeries(period, offsetPeriods = 0) {
  const ags = state.agendamentos || [];
  const dataAgendada = a => a.data || '';
  const dataConclusao = a => dataConclusaoISO(a);
  const ehConfirmado = a => normStatus(a.status) === 'Confirmado';
  const ehRecusado = a => normStatus(a.status) === 'Recusado';
  const ehConcluido = a => normStatus(a.status) === 'Concluído';
  const contar = (deIso, ateIso, teste, campoData) => ags.filter(a => teste(a) && campoData(a) >= deIso && campoData(a) <= ateIso).length;

  if (period === 'semanas') {
    const pts = [];
    const hoje = new Date(hojeISO() + 'T00:00:00');
    hoje.setDate(hoje.getDate() - offsetPeriods * 8 * 7);
    for (let w = 7; w >= 0; w--) {
      const fim = new Date(hoje); fim.setDate(fim.getDate() - w * 7);
      const ini = new Date(fim); ini.setDate(ini.getDate() - 6);
      const iniISO = dataLocalISO(ini), fimISO = dataLocalISO(fim);
      pts.push({
        label: (w === 0 && offsetPeriods === 0) ? 'Atual' : `S-${w}`,
        full: `${ini.getDate()}/${ini.getMonth() + 1} a ${fim.getDate()}/${fim.getMonth() + 1}`,
        confirmados: contar(iniISO, fimISO, ehConfirmado, dataAgendada),
        recusados: contar(iniISO, fimISO, ehRecusado, dataAgendada),
        concluidos: contar(iniISO, fimISO, ehConcluido, dataConclusao),
      });
    }
    return pts;
  }
  if (period === 'meses') {
    const pts = [];
    const hoje = new Date();
    hoje.setMonth(hoje.getMonth() - offsetPeriods * 6);
    for (let m = 5; m >= 0; m--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - m, 1);
      const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      pts.push({
        label: MESES_ABREV[d.getMonth()],
        full: `${MESES_ABREV[d.getMonth()]}/${d.getFullYear()}`,
        confirmados: ags.filter(a => ehConfirmado(a) && dataAgendada(a).startsWith(prefix)).length,
        recusados: ags.filter(a => ehRecusado(a) && dataAgendada(a).startsWith(prefix)).length,
        concluidos: ags.filter(a => ehConcluido(a) && dataConclusao(a).startsWith(prefix)).length,
      });
    }
    return pts;
  }
  const pts = [];
  const hoje = new Date(hojeISO() + 'T00:00:00');
  hoje.setDate(hoje.getDate() - offsetPeriods * 14);
  for (let i = 13; i >= 0; i--) {
    const d = new Date(hoje); d.setDate(d.getDate() - i);
    const iso = dataLocalISO(d);
    const dataFmt = `${d.getDate()}/${d.getMonth() + 1}`;
    pts.push({
      label: (i === 0 && offsetPeriods === 0) ? 'Hoje' : dataFmt,
      full: `${DIAS_SEMANA_NOME[d.getDay()]}, ${dataFmt}`,
      confirmados: contar(iso, iso, ehConfirmado, dataAgendada),
      recusados: contar(iso, iso, ehRecusado, dataAgendada),
      concluidos: contar(iso, iso, ehConcluido, dataConclusao),
    });
  }
  return pts;
}

function getPeriodRange(period) {
  const hoje = new Date(hojeISO() + 'T00:00:00');
  if (period === 'semanas') {
    const ini = new Date(hoje); ini.setDate(ini.getDate() - 7 * 7 - 6);
    return { inicioISO: dataLocalISO(ini), fimISO: hojeISO() };
  }
  if (period === 'meses') {
    const ini = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);
    return { inicioISO: dataLocalISO(ini), fimISO: hojeISO() };
  }
  const ini = new Date(hoje); ini.setDate(ini.getDate() - 13);
  return { inicioISO: dataLocalISO(ini), fimISO: hojeISO() };
}

function getPeriodBreakdown(period) {
  const { inicioISO, fimISO } = getPeriodRange(period);
  const ags = (state.agendamentos || []).filter(a => {
    const iso = dataConclusaoISO(a);
    return iso >= inicioISO && iso <= fimISO;
  });
  const recebido = ags.filter(isFinanceiro).reduce((s, a) => s + Number(a.valor || 0), 0);
  const aReceber = ags.filter(a => ['Pendente', 'Confirmado', 'Reagendado'].includes(normStatus(a.status))).reduce((s, a) => s + Number(a.valor || 0), 0);
  const cancelado = ags.filter(a => normStatus(a.status) === 'Recusado').reduce((s, a) => s + Number(a.valor || 0), 0);
  return { recebido, aReceber, cancelado };
}

function getChartSeries(period, offsetPeriods = 0) {
  const fin = (state.agendamentos || []).filter(isFinanceiro);
  const somaNoIntervalo = (deIso, ateIso) => fin
    .filter(a => { const iso = dataConclusaoISO(a); return iso >= deIso && iso <= ateIso; })
    .reduce((s, a) => s + Number(a.valor || 0), 0);
  const atendimentosNoIntervalo = (deIso, ateIso) => fin
    .filter(a => { const iso = dataConclusaoISO(a); return iso >= deIso && iso <= ateIso; }).length;

  if (period === 'semanas') {
    const pts = [];
    const hoje = new Date(hojeISO() + 'T00:00:00');
    hoje.setDate(hoje.getDate() - offsetPeriods * 8 * 7);
    for (let w = 7; w >= 0; w--) {
      const fim = new Date(hoje); fim.setDate(fim.getDate() - w * 7);
      const ini = new Date(fim); ini.setDate(ini.getDate() - 6);
      const iniISO = dataLocalISO(ini), fimISO = dataLocalISO(fim);
      pts.push({ label: (w === 0 && offsetPeriods === 0) ? 'Atual' : `S-${w}`, valor: somaNoIntervalo(iniISO, fimISO), atendimentos: atendimentosNoIntervalo(iniISO, fimISO), full: `${ini.getDate()}/${ini.getMonth() + 1} a ${fim.getDate()}/${fim.getMonth() + 1}` });
    }
    return pts;
  }
  if (period === 'meses') {
    const pts = [];
    const hoje = new Date();
    hoje.setMonth(hoje.getMonth() - offsetPeriods * 6);
    for (let m = 5; m >= 0; m--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - m, 1);
      const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const valor = fin.filter(a => dataConclusaoISO(a).startsWith(prefix)).reduce((s, a) => s + Number(a.valor || 0), 0);
      const atendimentos = fin.filter(a => dataConclusaoISO(a).startsWith(prefix)).length;
      pts.push({ label: MESES_ABREV[d.getMonth()], valor, atendimentos, full: `${MESES_ABREV[d.getMonth()]}/${d.getFullYear()}` });
    }
    return pts;
  }
  // dias (padrão): últimos 14 dias
  const pts = [];
  const hoje = new Date(hojeISO() + 'T00:00:00');
  hoje.setDate(hoje.getDate() - offsetPeriods * 14);
  for (let i = 13; i >= 0; i--) {
    const d = new Date(hoje); d.setDate(d.getDate() - i);
    const iso = dataLocalISO(d);
    const dataFmt = `${d.getDate()}/${d.getMonth() + 1}`;
    pts.push({ label: (i === 0 && offsetPeriods === 0) ? 'Hoje' : dataFmt, valor: somaNoIntervalo(iso, iso), atendimentos: atendimentosNoIntervalo(iso, iso), full: `${DIAS_SEMANA_NOME[d.getDay()]}, ${dataFmt}` });
  }
  return pts;
}

function moneyCompact(v) {
  if (v >= 1000) return 'R$' + (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1).replace('.', ',') + 'mil';
  return money(v).replace(',00', '');
}

function setChartPeriod(period) {
  chartPeriodAtual = period;
  document.querySelectorAll('.dash-chart-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.period === period);
  });
  renderDashChart();
}

function renderDashChart() {
  const svg = $('dashChartSvg');
  if (!svg) return;
  const pts = getChartSeries(chartPeriodAtual);
  const ptsAnterior = getChartSeries(chartPeriodAtual, 1);
  const totalValor = pts.reduce((s, p) => s + p.valor, 0);
  const totalAtendimentos = pts.reduce((s, p) => s + p.atendimentos, 0);
  const melhor = pts.reduce((m, p) => (p.valor > m.valor ? p : m), pts[0] || { valor: 0, full: '—' });
  const ticket = totalAtendimentos > 0 ? totalValor / totalAtendimentos : 0;

  setText('chartFatValue', money(totalValor).replace(',00', ''));
  setText('chartFatSub', chartPeriodAtual === 'dias' ? 'Faturamento nos últimos 14 dias' : chartPeriodAtual === 'semanas' ? 'Faturamento nas últimas 8 semanas' : 'Faturamento nos últimos 6 meses');
  setText('chartMelhor', melhor && melhor.valor > 0 ? melhor.full : '—');
  setText('chartTicket', money(ticket).replace(',00', ''));
  setText('chartAtendimentos', totalAtendimentos);
  setText('chartLegendText', `Faturamento por ${chartPeriodAtual === 'dias' ? 'dia' : chartPeriodAtual === 'semanas' ? 'semana' : 'mês'} · último: ${money(pts[pts.length - 1] ? pts[pts.length - 1].valor : 0).replace(',00', '')}`);
  setText('chartLegendGhostText', chartPeriodAtual === 'dias' ? '14 dias anteriores' : chartPeriodAtual === 'semanas' ? '8 semanas anteriores' : '6 meses anteriores');

  const breakdown = getPeriodBreakdown(chartPeriodAtual);
  setText('chartBreakdownRecebido', money(breakdown.recebido).replace(',00', ''));
  setText('chartBreakdownAReceber', money(breakdown.aReceber).replace(',00', ''));
  setText('chartBreakdownCancelado', money(breakdown.cancelado).replace(',00', ''));

  const W = 640, H = 200, padX = 14, padY = 22, padTop = 30;
  const n = pts.length;
  const maxValReal = Math.max(...pts.map(p => p.valor));
  const maxValAnteriorReal = Math.max(...ptsAnterior.map(p => p.valor), 0);
  const maxVal = Math.max(maxValReal, maxValAnteriorReal, 1) * 1.18;
  const baseY = H - padY;
  const usableH = baseY - padTop;
  const slot = (W - padX * 2) / Math.max(1, n);

  function smoothPath(points) {
    if (!points.length) return '';
    if (points.length === 1) return `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }

  const points = pts.map((p, i) => {
    const x = padX + slot * (i + 0.5);
    const y = maxVal > 0 ? baseY - (p.valor / maxVal) * usableH : baseY;
    return { ...p, x, y, isLast: i === n - 1 };
  });
  const pointsGhost = ptsAnterior.map((p, i) => {
    const x = padX + slot * (i + 0.5);
    const y = maxVal > 0 ? baseY - (p.valor / maxVal) * usableH : baseY;
    return { ...p, x, y };
  });

  const gridEl = $('chartGrid');
  let gridHtml = '';
  for (let g = 0; g <= 3; g++) {
    const gy = padTop + (g * usableH) / 3;
    const isBase = g === 3;
    gridHtml += `<line x1="${padX}" y1="${gy.toFixed(1)}" x2="${W - padX}" y2="${gy.toFixed(1)}" class="${isBase ? 'dash-chart-baseline' : 'dash-chart-grid-line'}"></line>`;
  }
  if (gridEl) gridEl.innerHTML = gridHtml;

  // ── 3 séries do PC: Confirmados/Recusados/Concluídos (contagem, não R$) ──
  const statusPts = getStatusSeries(chartPeriodAtual);
  const statusPtsAnterior = getStatusSeries(chartPeriodAtual, 1);
  const maxStatusReal = Math.max(...statusPts.map(p => Math.max(p.confirmados, p.recusados, p.concluidos)), 0);
  const maxStatusAnteriorReal = Math.max(...statusPtsAnterior.map(p => Math.max(p.confirmados, p.recusados, p.concluidos)), 0);
  const maxStatus = Math.max(maxStatusReal, maxStatusAnteriorReal, 1) * 1.18;

  // Eixo Y acompanha a escala realmente exibida: contagem no PC (3 séries), R$ no mobile (barras).
  const yAxisEl = $('chartYAxis');
  if (yAxisEl) {
    const ehDesktop = window.matchMedia('(min-width: 901px)').matches;
    const topo = ehDesktop ? maxStatus : maxVal;
    const steps = [topo, topo * 0.66, topo * 0.33, 0];
    yAxisEl.innerHTML = steps.map(v => `<span>${ehDesktop ? Math.round(v) : moneyCompact(Math.round(v))}</span>`).join('');
  }

  function serieCoords(lista, campo) {
    return lista.map((p, i) => {
      const x = padX + slot * (i + 0.5);
      const y = baseY - (p[campo] / maxStatus) * usableH;
      return { ...p, x, y, valorSerie: p[campo], isLast: i === n - 1 };
    });
  }
  const pConfirmados = serieCoords(statusPts, 'confirmados');
  const pRecusados = serieCoords(statusPts, 'recusados');
  const pConcluidos = serieCoords(statusPts, 'concluidos');
  const pConfirmadosGhost = serieCoords(statusPtsAnterior, 'confirmados');
  const pRecusadosGhost = serieCoords(statusPtsAnterior, 'recusados');
  const pConcluidosGhost = serieCoords(statusPtsAnterior, 'concluidos');

  const assinaturaStatus = [pConfirmados, pRecusados, pConcluidos].map(s => s.map(p => `${p.x.toFixed(1)}:${p.y.toFixed(1)}`).join(',')).join('|');
  const lineConfirmadosEl = $('chartLineConfirmados');
  const statusMudou = !lineConfirmadosEl || lineConfirmadosEl.dataset.sig !== assinaturaStatus;

  function desenharGhost(elId, coords) {
    const el = $(elId);
    if (el) el.setAttribute('d', smoothPath(coords));
  }
  desenharGhost('chartLineConfirmadosGhost', pConfirmadosGhost);
  desenharGhost('chartLineRecusadosGhost', pRecusadosGhost);
  desenharGhost('chartLineConcluidosGhost', pConcluidosGhost);

  const areaConcluidosEl = $('chartAreaConcluidos');
  const linePathConcluidos = smoothPath(pConcluidos);
  if (areaConcluidosEl) {
    const areaPathConcluidos = pConcluidos.length ? `${linePathConcluidos} L${pConcluidos[n - 1].x.toFixed(1)},${baseY.toFixed(1)} L${pConcluidos[0].x.toFixed(1)},${baseY.toFixed(1)} Z` : '';
    areaConcluidosEl.setAttribute('d', areaPathConcluidos);
    if (statusMudou) areaConcluidosEl.style.opacity = '0';
  }

  function desenharLinhaPrincipal(elId, coords, path, atrasoExtra) {
    const el = $(elId);
    if (!el) return;
    el.setAttribute('d', path);
    if (!statusMudou) return;
    let len = 900;
    try { len = el.getTotalLength(); } catch (e) {}
    el.style.transition = 'none';
    el.style.strokeDasharray = `${len} ${len}`;
    el.style.strokeDashoffset = String(len);
    void el.getBoundingClientRect();
    requestAnimationFrame(() => {
      el.style.transition = `stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1) ${atrasoExtra}ms`;
      el.style.strokeDashoffset = '0';
      if (elId === 'chartLineConcluidos' && areaConcluidosEl) {
        areaConcluidosEl.style.transition = 'opacity 0.9s ease 0.3s';
        areaConcluidosEl.style.opacity = '1';
      }
    });
  }
  desenharLinhaPrincipal('chartLineConfirmados', pConfirmados, smoothPath(pConfirmados), 0);
  desenharLinhaPrincipal('chartLineRecusados', pRecusados, smoothPath(pRecusados), 80);
  desenharLinhaPrincipal('chartLineConcluidos', pConcluidos, linePathConcluidos, 160);
  if (lineConfirmadosEl) lineConfirmadosEl.dataset.sig = assinaturaStatus;

  // Pontos existem matematicamente (statusPts/pConfirmados/pRecusados/pConcluidos), mas não
  // desenham círculo nenhum permanente. Guarda a leitura mais recente pro hover (crosshair) usar.
  _chartHoverState = { statusPts, pConfirmados, pRecusados, pConcluidos, padX, W: 640, n, padTop, baseY };
  configurarHoverGrafico();

  function garantirIndicador(elId, classeExtra) {
    const el = $(elId);
    if (!el) return;
    if (!el.querySelector('.dash-chart-dot')) {
      el.innerHTML = `<circle class="dash-chart-dot ${classeExtra}" r="4" style="opacity:0"></circle>`;
    }
  }
  garantirIndicador('chartDotsConfirmados', 'is-green');
  garantirIndicador('chartDotsRecusados', 'is-red');
  garantirIndicador('chartDotsConcluidos', 'is-purple');

  // barras — mantidas só para o Android/WebApp (o PC agora usa a linha acima); mesmo 'points'/'pointsGhost'
  const assinaturaBars = points.map(p => `${p.x.toFixed(1)}:${p.y.toFixed(1)}`).join('|');
  const barsEl = $('chartBars');
  const dadosMudaram = !barsEl || barsEl.dataset.sig !== assinaturaBars;
  const barW = Math.max(6, Math.min(46, slot * 0.82));
  const barsGhostEl = $('chartBarsGhost');
  const ghostW = Math.min(barW * 1.7, slot * 0.85);
  const assinaturaGhost = pointsGhost.map(p => `${p.x.toFixed(1)}:${p.y.toFixed(1)}`).join('|');
  if (barsGhostEl && barsGhostEl.dataset.sig !== assinaturaGhost) {
    barsGhostEl.dataset.sig = assinaturaGhost;
    barsGhostEl.innerHTML = pointsGhost.map((p) => {
      const h = Math.max(0, baseY - p.y);
      return `<rect class="dash-chart-bar-ghost" x="${(p.x - ghostW / 2).toFixed(1)}" y="${p.y.toFixed(1)}" width="${ghostW.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(3, ghostW / 2).toFixed(1)}" style="opacity:0"><title>${p.full}: ${money(p.valor)}</title></rect>`;
    }).join('');
    const ghostRects = barsGhostEl.querySelectorAll('.dash-chart-bar-ghost');
    requestAnimationFrame(() => {
      ghostRects.forEach((r, i) => {
        r.style.transition = `opacity 0.5s ease ${300 + i * 16}ms`;
        r.style.opacity = '1';
      });
    });
  }

  if (barsEl && dadosMudaram) {
    barsEl.dataset.sig = assinaturaBars;
    barsEl.innerHTML = points.map((p, i) => {
      const fill = p.isLast ? 'url(#barGradRecent)' : 'url(#barGradPast)';
      const bx = (p.x - barW / 2).toFixed(1);
      const brx = Math.min(4, barW / 2).toFixed(1);
      return `<g class="dash-chart-bar-group" data-i="${i}">` +
        `<rect class="dash-chart-bar${p.isLast ? ' is-recent' : ''}" data-i="${i}" x="${bx}" y="${baseY.toFixed(1)}" width="${barW.toFixed(1)}" height="0" rx="${brx}" fill="${fill}"></rect>` +
        `<rect class="dash-chart-bar-hatch" x="${bx}" y="${baseY.toFixed(1)}" width="${barW.toFixed(1)}" height="0" rx="${brx}" fill="url(#barHatch)"></rect>` +
        `</g>`;
    }).join('');
    const rects = barsEl.querySelectorAll('.dash-chart-bar');
    rects.forEach((r, i) => {
      const p = points[i];
      const hatch = r.nextElementSibling;
      const h = Math.max(0, baseY - p.y);
      r.style.transition = 'none';
      if (hatch) hatch.style.transition = 'none';
      requestAnimationFrame(() => {
        const t = `y 0.55s cubic-bezier(.2,.8,.2,1) ${i * 16}ms, height 0.55s cubic-bezier(.2,.8,.2,1) ${i * 16}ms`;
        r.style.transition = t;
        r.setAttribute('y', p.y.toFixed(1));
        r.setAttribute('height', h.toFixed(1));
        if (hatch) {
          hatch.style.transition = t;
          hatch.setAttribute('y', p.y.toFixed(1));
          hatch.setAttribute('height', h.toFixed(1));
        }
      });
      r.addEventListener('mouseenter', () => showChartTooltip(p, r));
      r.addEventListener('mouseleave', hideChartTooltip);
    });
  }

  const labelsEl = $('chartLabels');
  if (labelsEl) {
    const mobile = window.innerWidth < 480;
    const showEvery = n > 10 ? (mobile ? 4 : 2) : (n > 6 ? (mobile ? 2 : 1) : 1);
    labelsEl.innerHTML = pts.map((p, i) => {
      const isLast = i === n - 1;
      const visible = isLast || (i % showEvery === 0 && i !== n - 2);
      return `<span${visible ? '' : ' style="opacity:0"'}>${p.label}</span>`;
    }).join('');
  }
}

function showChartTooltip(ponto, dotEl) {
  const tip = $('chartTooltip');
  const wrap = dotEl.closest('.dash-chart-svg-wrap');
  if (!tip || !wrap) return;
  const wrapRect = wrap.getBoundingClientRect();
  const dotRect = dotEl.getBoundingClientRect();
  const ticketDia = ponto.atendimentos > 0 ? ponto.valor / ponto.atendimentos : 0;
  const atendimentosTxt = ponto.atendimentos === 1 ? '1 atendimento' : `${ponto.atendimentos} atendimentos`;
  tip.innerHTML = `
    <div class="dash-chart-tooltip-date">${ponto.full}</div>
    <div class="dash-chart-tooltip-value">${money(ponto.valor).replace(',00', '')}</div>
    <div class="dash-chart-tooltip-row"><span>${atendimentosTxt}</span>${ponto.atendimentos > 0 ? `<span>tíquete ${money(ticketDia).replace(',00', '')}</span>` : ''}</div>
  `;
  tip.style.left = (dotRect.left - wrapRect.left + dotRect.width / 2) + 'px';
  tip.style.top = (dotRect.top - wrapRect.top) + 'px';
  tip.classList.add('is-visible');
  dotEl.classList.add('is-hover');
}

function configurarHoverGrafico() {
  const capture = $('chartHoverCapture');
  const svg = $('dashChartSvg');
  if (!capture || !svg || capture.dataset.wired) return;
  capture.dataset.wired = '1';

  function svgXDoMouse(clientX) {
    const rect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const relX = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return vb.x + relX * vb.width;
  }

  capture.addEventListener('mousemove', (ev) => {
    const st = _chartHoverState;
    if (!st || !st.n) return;
    const svgX = svgXDoMouse(ev.clientX);
    let melhorI = 0, melhorDist = Infinity;
    st.pConfirmados.forEach((p, i) => {
      const d = Math.abs(p.x - svgX);
      if (d < melhorDist) { melhorDist = d; melhorI = i; }
    });
    atualizarHoverParaIndice(melhorI);
  });
  capture.addEventListener('mouseleave', esconderHoverGrafico);
}

function atualizarHoverParaIndice(i) {
  const st = _chartHoverState;
  if (!st) return;
  const pC = st.pConfirmados[i], pR = st.pRecusados[i], pK = st.pConcluidos[i];
  if (!pC || !pR || !pK) return;

  const crosshair = $('chartCrosshair');
  if (crosshair) {
    crosshair.setAttribute('x1', pC.x.toFixed(1));
    crosshair.setAttribute('x2', pC.x.toFixed(1));
    crosshair.setAttribute('y1', st.padTop.toFixed(1));
    crosshair.setAttribute('y2', st.baseY.toFixed(1));
    crosshair.classList.add('is-visible');
  }
  posicionarIndicador('chartDotsConfirmados', pC);
  posicionarIndicador('chartDotsRecusados', pR);
  posicionarIndicador('chartDotsConcluidos', pK);

  const svg = $('dashChartSvg');
  const wrap = svg && svg.closest('.dash-chart-svg-wrap');
  if (svg && wrap) {
    const wrapRect = wrap.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const pxX = svgRect.left - wrapRect.left + ((pC.x - vb.x) / vb.width) * svgRect.width;
    const pxY = svgRect.top - wrapRect.top + ((Math.min(pC.y, pR.y, pK.y) - vb.y) / vb.height) * svgRect.height;
    showStatusTooltip(st.statusPts[i], pxX, pxY);
  }
}

function posicionarIndicador(elId, ponto) {
  const el = $(elId);
  const dot = el && el.querySelector('.dash-chart-dot');
  if (!dot) return;
  dot.setAttribute('cx', ponto.x.toFixed(1));
  dot.setAttribute('cy', ponto.y.toFixed(1));
  dot.style.opacity = '1';
}

function esconderHoverGrafico() {
  const crosshair = $('chartCrosshair');
  if (crosshair) crosshair.classList.remove('is-visible');
  ['chartDotsConfirmados', 'chartDotsRecusados', 'chartDotsConcluidos'].forEach(id => {
    const dot = $(id) && $(id).querySelector('.dash-chart-dot');
    if (dot) dot.style.opacity = '0';
  });
  hideChartTooltip();
}

function showStatusTooltip(ponto, xPixel, yPixel) {
  const tip = $('chartTooltip');
  if (!tip) return;
  tip.innerHTML = `
    <div class="dash-chart-tooltip-date">${ponto.full}</div>
    <div class="dash-chart-tooltip-row dash-chart-tooltip-status">
      <span class="is-green">● Confirmados <b>${ponto.confirmados}</b></span>
      <span class="is-red">● Recusados <b>${ponto.recusados}</b></span>
      <span class="is-purple">● Concluídos <b>${ponto.concluidos}</b></span>
    </div>
  `;
  tip.style.left = xPixel + 'px';
  tip.style.top = yPixel + 'px';
  tip.classList.add('is-visible');
}

function hideChartTooltip() {
  const tip = $('chartTooltip');
  if (tip) tip.classList.remove('is-visible');
  document.querySelectorAll('.dash-chart-dot.is-hover, .dash-chart-bar.is-hover').forEach(el => el.classList.remove('is-hover'));
}

function renderFinanceiro() {
  if (typeof window.renderFinanceiroV2 === 'function') return window.renderFinanceiroV2();
  const todos = state.agendamentos || [];
  const fin = todos.filter(isFinanceiro);
  const total = fin.reduce((s, a) => s + Number(a.valor || 0), 0);
  const ticket = fin.length ? total / fin.length : 0;
  const hoje = hojeISO();
  const mes = mesPrefixo();

  const fatHoje = fin.filter(a => dataConclusaoISO(a) === hoje).reduce((s, a) => s + Number(a.valor || 0), 0);
  const fatMes = fin.filter(a => dataConclusaoISO(a).startsWith(mes)).reduce((s, a) => s + Number(a.valor || 0), 0);

  setText('finHoje', money(fatHoje).replace(',00', ''));
  setText('finHojeSub', new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }));
  setText('finMes', money(fatMes).replace(',00', ''));
  setText('finMesSub', new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
  setText('finTicket', money(ticket).replace(',00', ''));
  setText('finPagos', fin.length);
  setText('finPagosSub', 'Todos os tempos');

  renderFinBars7(fin, hoje);
  renderFinWeekRanking(fin);

  const naoExcluidos = todos.filter(a => normStatus(a.status) !== 'Excluído');
  const clientesUnicos = new Set(naoExcluidos.map(a => (a.cliente_telefone || a.cliente_nome || '').trim().toLowerCase()).filter(Boolean));
  const taxa = naoExcluidos.length ? Math.round((fin.length / naoExcluidos.length) * 100) : 0;
  setText('finClientesUnicos', clientesUnicos.size);
  setText('finTotalAgendamentos', naoExcluidos.length);
  setText('finTaxaConclusao', taxa + '%');
}

function renderFinBars7(fin, hojeStr, containerId, badgeId) {
  containerId = containerId || 'finBars7';
  badgeId = badgeId || 'finMelhorDiaBadge';
  const el = $(containerId);
  if (!el) return;

  const dias = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hojeStr + 'T00:00:00');
    d.setDate(d.getDate() - i);
    const iso = dataLocalISO(d);
    const valor = fin.filter(a => dataConclusaoISO(a) === iso).reduce((s, a) => s + Number(a.valor || 0), 0);
    dias.push({ iso, valor, weekday: d.getDay(), isHoje: iso === hojeStr });
  }

  const max = Math.max(...dias.map(d => d.valor), 1);
  const maiorDia = dias.reduce((m, d) => d.valor > m.valor ? d : m, dias[0]);

  el.innerHTML = dias.map(d => {
    const alturaPct = Math.max(4, Math.round((d.valor / max) * 100));
    const isTop = d.valor > 0 && d.valor === maiorDia.valor;
    const label = d.isHoje ? 'Hoje' : DIAS_SEMANA_ABREV[d.weekday];
    return `<div class="fin-bar-col${isTop ? ' top' : ''}" style="--fin-bar-h:${alturaPct}%">
      <div class="fin-bar-value">${money(d.valor).replace(',00', '')}</div>
      <div class="fin-bar-track"><div class="fin-bar-fill"></div></div>
      <div class="fin-bar-label">${label}</div>
    </div>`;
  }).join('');

  const badge = $(badgeId);
  if (badge) {
    badge.textContent = maiorDia.valor > 0
      ? `Melhor dia: ${maiorDia.isHoje ? 'Hoje' : DIAS_SEMANA_NOME[maiorDia.weekday]}`
      : 'Sem faturamento ainda';
  }

  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.querySelectorAll('.fin-bar-col').forEach(col => col.classList.add('animated'));
  }));
}

function renderFinWeekRanking(fin) {
  const el = $('finWeekList');
  if (!el) return;

  const totais = [0, 0, 0, 0, 0, 0, 0];
  fin.forEach(a => {
    const iso = dataConclusaoISO(a);
    if (!iso) return;
    const d = new Date(iso + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return;
    totais[d.getDay()] += Number(a.valor || 0);
  });

  const ranking = totais
    .map((valor, idx) => ({ idx, valor }))
    .sort((a, b) => b.valor - a.valor);

  const max = Math.max(...totais, 1);

  el.innerHTML = ranking.map((r, pos) => {
    const pct = Math.max(3, Math.round((r.valor / max) * 100));
    const isTop = pos === 0 && r.valor > 0;
    return `<div class="fin-week-row${isTop ? ' top' : ''}">
      <div class="fin-week-day${isTop ? ' top' : ''}">${DIAS_SEMANA_NOME[r.idx]}</div>
      <div class="fin-week-track"><div class="fin-week-fill" data-pct="${pct}"></div></div>
      <div class="fin-week-val">${money(r.valor).replace(',00', '')}</div>
    </div>`;
  }).join('');

  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.querySelectorAll('.fin-week-fill').forEach(f => { f.style.width = f.dataset.pct + '%'; });
  }));
}

function renderDashPremium() {
  if (!$('dashDonutValue')) return;
  const todos = state.agendamentos || [];
  const ativos = todos.filter(a => normStatus(a.status) !== 'Excluído');

  const concluidos = ativos.filter(a => normStatus(a.status) === 'Concluído').length;
  const confirmados = ativos.filter(a => ['Confirmado', 'Reagendado'].includes(normStatus(a.status))).length;
  const pendentes = ativos.filter(a => normStatus(a.status) === 'Pendente').length;
  const total = ativos.length;

  setText('dashDonutValue', total);
  setText('dashLegConcluidos', concluidos);
  setText('dashLegConfirmados', confirmados);
  setText('dashLegPendentes', pendentes);

  const R = 52, C = 2 * Math.PI * R;
  const segs = [
    { id: 'dashDonutConcluidos', val: concluidos },
    { id: 'dashDonutConfirmados', val: confirmados },
    { id: 'dashDonutPendentes', val: pendentes }
  ];
  let acc = 0;
  segs.forEach(seg => {
    const el = $(seg.id);
    if (!el) return;
    const frac = total > 0 ? seg.val / total : 0;
    const len = Math.max(0, frac * C - (frac > 0 ? 2 : 0));
    el.style.strokeDasharray = `${len} ${C - len}`;
    el.style.strokeDashoffset = String(-acc);
    acc += frac * C;
  });
}

function atualizarPreviewEmpresa() {
  const nome = ($('cfgNome')?.value || '').trim();
  const whatsapp = ($('cfgWhatsapp')?.value || '').trim();
  const slug = ($('cfgSlug')?.value || '').trim();
  const endereco = ($('cfgEndereco')?.value || '').trim();
  const cidade = ($('cfgCidade')?.value || '').trim();
  const setTxt = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  setTxt('empPrevNome', nome || 'Nome da empresa');
  const av = $('empPrevAvatar'); if (av) av.textContent = nome ? nome.trim().charAt(0).toUpperCase() : '?';
  setTxt('empPrevLink', slug ? ('vyxora.online/' + slug) : 'vyxora.online/agenda');
  setTxt('empPrevWhats', whatsapp || 'WhatsApp não informado');
  const enderecoCompleto = [endereco, cidade].filter(Boolean).join(' · ');
  setTxt('empPrevEndereco', enderecoCompleto || 'Endereço não informado');
}
window.atualizarPreviewEmpresa = atualizarPreviewEmpresa;

function renderConfig() {
  const e = state.empresa || {};
  const set = (id, v) => { const el = $(id); if (el) el.value = v || ''; };
  set('cfgNome', e.nome); set('cfgWhatsapp', e.whatsapp); set('cfgSlug', e.slug);
  set('cfgEndereco', e.endereco); set('cfgCidade', e.cidade);
  set('cfgInstagram', e.instagram); set('cfgFacebook', e.facebook);
  set('cfgTiktok', e.tiktok); set('cfgSite', e.site);
  if (typeof atualizarPreviewEmpresa === 'function') atualizarPreviewEmpresa();
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


function vxClienteModalIsMobile(){
  return window.matchMedia('(max-width:768px)').matches;
}

function vxApplyClienteModalStyle(){
  const modal=$('vxClientesModal');
  const card=modal?.querySelector('.vx-clientes-modal-card');
  if(!modal||!card) return;
  const imp=(el,prop,val)=>el?.style.setProperty(prop,val,'important');

  imp(modal,'display','grid');
  imp(modal,'position','fixed');
  imp(modal,'inset','0');
  imp(modal,'width','100vw');
  imp(modal,'height','100dvh');
  imp(modal,'place-items','center');
  imp(modal,'padding','0 8px');
  imp(modal,'margin','0');
  imp(modal,'background','#08070d');
  imp(modal,'z-index','100090');

  imp(card,'width','calc(100vw - 16px)');
  imp(card,'max-width','calc(100vw - 16px)');
  imp(card,'max-height','calc(100dvh - 16px)');
  imp(card,'box-sizing','border-box');
  imp(card,'overflow-y','auto');
  imp(card,'overflow-x','hidden');
  imp(card,'margin','0 auto');
  imp(card,'border-radius','0');
}

function vxResetClienteModal(){
  if($('vxCliNome')) $('vxCliNome').value='';
  if($('vxCliTel')) $('vxCliTel').value='';
  if($('vxCliEmail')) $('vxCliEmail').value='';
}


let _vxClienteKeyboardRAF=0;

function vxResetClienteModalKeyboardPosition(){
  const card=document.querySelector('#vxClientesModal .vx-clientes-modal-card');
  if(!card) return;
  card.style.removeProperty('transform');
  card.style.removeProperty('transition');
}

function vxAjustarClienteModalTeclado(){
  const modal=$('vxClientesModal');
  const card=modal?.querySelector('.vx-clientes-modal-card');
  const email=$('vxCliEmail');

  if(!modal||!card||!modal.classList.contains('open')) return;

  // SOMENTE o campo E-mail pode deslocar o modal.
  if(document.activeElement!==email){
    card.style.setProperty('transition','transform .18s ease','important');
    card.style.setProperty('transform','translateY(0)','important');
    return;
  }

  // Sempre mede a partir da posição normal.
  card.style.setProperty('transition','none','important');
  card.style.setProperty('transform','translateY(0)','important');

  setTimeout(()=>{
    if(!modal.classList.contains('open') || document.activeElement!==email) return;

    const vv=window.visualViewport;
    const saveBtn=$('vxClientesModalSave');
    if(!saveBtn) return;

    let shift=0;

    if(vv){
      const visibleBottom=(vv.offsetTop||0)+vv.height;
      const btnRect=saveBtn.getBoundingClientRect();
      shift=Math.max(0,(btnRect.bottom+12)-visibleBottom);
    }else{
      shift=150;
    }

    // Evita deslocamento exagerado.
    shift=Math.min(shift,180);

    card.style.setProperty('transition','transform .18s ease','important');
    card.style.setProperty(
      'transform',
      shift>0 ? `translateY(-${Math.ceil(shift)}px)` : 'translateY(0)',
      'important'
    );
  },220);
}
window.vxAjustarClienteModalTeclado=vxAjustarClienteModalTeclado;

function vxOpenClienteModal(){
  if(!vxClienteModalIsMobile()) return;
  const modal=$('vxClientesModal');
  if(!modal) return;

  // Guarda a altura da tela ANTES do teclado abrir.
  // Assim o teclado não redimensiona nem cria rolagem no modal.
  const viewportH = window.innerHeight;
  document.documentElement.style.setProperty('--vx-clientes-viewport-h', `${viewportH}px`);
  document.body.style.setProperty('overflow','hidden','important');
  document.body.style.setProperty('overscroll-behavior','none','important');

  // Evita cortes por overflow/transform da view Clientes.
  if(modal.parentElement!==document.body){
    document.body.appendChild(modal);
  }

  const body=modal.querySelector('.vx-clientes-modal-body');
  const save=$('vxClientesModalSave');
  const success=$('vxClientesSuccess');

  if(success){
    success.hidden=true;
    success.style.setProperty('display','none','important');
  }
  if(body){
    body.hidden=false;
    body.style.setProperty('display','grid','important');
  }
  if(save){
    save.hidden=false;
    save.style.setProperty('display','block','important');
  }

  vxApplyClienteModalStyle();
  modal.classList.add('open');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('vx-clientes-modal-open');
  vxResetClienteModalKeyboardPosition();
  setTimeout(()=>{
    $('vxCliNome')?.focus();
  },80);
}
window.vxOpenClienteModal=vxOpenClienteModal;

function vxCloseClienteModal(){
  const modal=$('vxClientesModal');
  if(!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden','true');
  modal.style.setProperty('display','none','important');
  modal.style.setProperty('pointer-events','none','important');
  document.body.classList.remove('vx-clientes-modal-open');
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('overscroll-behavior');
  document.documentElement.style.removeProperty('--vx-clientes-viewport-h');
  vxResetClienteModalKeyboardPosition();
}
window.vxCloseClienteModal=vxCloseClienteModal;

function vxShowClienteSuccess(nome){
  const modal=$('vxClientesModal');
  const body=modal?.querySelector('.vx-clientes-modal-body');
  const save=$('vxClientesModalSave');
  const success=$('vxClientesSuccess');
  const text=$('vxClientesSuccessText');

  if(text) text.textContent=(nome||'Cliente')+' salvo com sucesso.';
  if(body){
    body.hidden=true;
    body.style.setProperty('display','none','important');
  }
  if(save){
    save.hidden=true;
    save.style.setProperty('display','none','important');
  }
  if(success){
    success.hidden=false;
    success.style.setProperty('display','flex','important');
  }
}

function vxNovoClienteAposSucesso(){
  const modal=$('vxClientesModal');
  const body=modal?.querySelector('.vx-clientes-modal-body');
  const save=$('vxClientesModalSave');
  const success=$('vxClientesSuccess');

  if(success){
    success.hidden=true;
    success.style.setProperty('display','none','important');
  }
  if(body){
    body.hidden=false;
    body.style.setProperty('display','grid','important');
  }
  if(save){
    save.hidden=false;
    save.style.setProperty('display','block','important');
  }

  vxResetClienteModal();
  setTimeout(()=>$('vxCliNome')?.focus(),80);
}
window.vxNovoClienteAposSucesso=vxNovoClienteAposSucesso;

async function vxSalvarClienteModal(){
  if(!vxClienteModalIsMobile()) return;

  const nome=($('vxCliNome')?.value||'').trim();
  const telefone=($('vxCliTel')?.value||'').trim();
  const email=($('vxCliEmail')?.value||'').trim();
  const btn=$('vxClientesModalSave');

  if(!nome) return toast('Digite o nome.','err');

  if(btn) btn.disabled=true;
  try{
    const {data:novoCliente,error}=await db.from('agenda_clientes').insert({
      empresa_id:state.empresa.id,
      nome,
      telefone,
      email,
      status:'ativo'
    }).select('*').single();

    if(error){
      toast('Erro ao salvar: '+error.message,'err');
      return;
    }

    // Atualização imediata da lista, antes da sincronização geral.
    if(novoCliente){
      const semDuplicar=(state.clientes||[]).filter(c=>String(c.id)!==String(novoCliente.id));
      state.clientes=[novoCliente,...semDuplicar];
      renderClientes();
      renderStats();
      if(typeof renderDashPremium==='function') renderDashPremium();
    }

    try{
      await loadAll();
    }catch(syncErr){
      console.warn('Sincronização pós-cliente:',syncErr);
    }

    vxResetClienteModal();
    vxShowClienteSuccess(nome);
  }finally{
    if(btn) btn.disabled=false;
  }
}
window.vxSalvarClienteModal=vxSalvarClienteModal;

// X mobile robusto.
document.addEventListener('click',(e)=>{
  const btn=e.target?.closest?.('.vx-clientes-modal-close');
  if(!btn) return;
  e.preventDefault();
  e.stopPropagation();
  vxCloseClienteModal();
},true);


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


function vxResetServicoModal(){
  const body=$('vxServicosModal')?.querySelector('.vx-servicos-modal-body');
  const save=$('vxServicosModalSave');
  const success=$('vxServicosSuccess');
  if(body) body.hidden=false;
  if(save){ save.hidden=false; save.disabled=false; }
  if(success) success.hidden=true;
  if($('vxSrvNome')) $('vxSrvNome').value='';
  if($('vxSrvPreco')) $('vxSrvPreco').value='';
  if($('vxSrvDur')) $('vxSrvDur').value='';
}
function vxOpenServicoModal(){
  const modal=$('vxServicosModal');
  if(!modal) return;
  vxResetServicoModal();
  modal.classList.add('open');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('vx-servicos-modal-open');
}
function vxCloseServicoModal(){
  const modal=$('vxServicosModal');
  if(!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden','true');
  document.body.classList.remove('vx-servicos-modal-open');
  vxResetServicoModal();
}
function vxShowServicoSuccess(nome){
  const body=$('vxServicosModal')?.querySelector('.vx-servicos-modal-body');
  const save=$('vxServicosModalSave');
  const success=$('vxServicosSuccess');
  if(body) body.hidden=true;
  if(save) save.hidden=true;
  if(success) success.hidden=false;
  if($('vxServicosSuccessText')) $('vxServicosSuccessText').textContent=`${nome} salvo com sucesso.`;
}
function vxNovoServicoAposSucesso(){
  vxResetServicoModal();
  $('vxSrvNome')?.focus();
}
async function vxSalvarServicoModal(){
  const nome=($('vxSrvNome')?.value||'').trim();
  if(!nome) return toast('Digite o nome.','err');
  const btn=$('vxServicosModalSave');
  if(btn) btn.disabled=true;
  try{
    const {error}=await db.from('agenda_servicos').insert({
      empresa_id:state.empresa.id,
      nome,
      preco:Number($('vxSrvPreco')?.value||0),
      duracao_minutos:Number($('vxSrvDur')?.value||60),
      status:'ativo'
    });
    if(error) return toast('Erro ao salvar: '+error.message,'err');
    await loadAll();
    renderServicos();
    renderStats();
    if(typeof renderDashPremium==='function') renderDashPremium();
    vxShowServicoSuccess(nome);
  }finally{
    if(btn) btn.disabled=false;
  }
}
window.vxOpenServicoModal=vxOpenServicoModal;
window.vxCloseServicoModal=vxCloseServicoModal;
window.vxSalvarServicoModal=vxSalvarServicoModal;
window.vxNovoServicoAposSucesso=vxNovoServicoAposSucesso;
document.addEventListener('click',(e)=>{
  const btn=e.target?.closest?.('.vx-servicos-modal-close');
  if(!btn) return;
  e.preventDefault(); e.stopPropagation(); vxCloseServicoModal();
},true);

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
  if (salvarAgendamento._running) return;

  const botao = $('agendaBtnSalvar');
  salvarAgendamento._running = true;
  if (botao) botao.disabled = true;

  try {
    const mobileAgenda = vxIsMobileAgenda();

    let clienteId = mobileAgenda ? ($('agClienteSelect')?.value || null) : null;
    const agCli = mobileAgenda
      ? ($('agCliente')?.value || '').trim()
      : ($('agClienteDesktop')?.value || '').trim();
    const agTel = mobileAgenda
      ? ($('agTelefone')?.value || '').trim()
      : ($('agTelefoneDesktop')?.value || '').trim();

    const agSvc = $('agServico')?.value;
    const agProf = $('agProfissional')?.value;
    const agData = $('agData')?.value;
    const agHora = $('agHora')?.value;

    if (!agCli || !agSvc || !agProf || !agData || !agHora || (mobileAgenda && !clienteId)) {
      toast('Preencha todos os campos.', 'err');
      return;
    }

    const serv = (state.servicos || []).find(s => s.id === agSvc);
    const prof = (state.profissionais || []).find(p => p.id === agProf);

    // Desktop mantém o fluxo original do sistema.
    if (!mobileAgenda) {
      try {
        const { data: cli } = await db.from('agenda_clientes').insert({
          empresa_id: state.empresa.id,
          nome: agCli,
          telefone: agTel,
          status: 'ativo'
        }).select('*').single();
        if (cli) clienteId = cli.id;
      } catch (e) {
        console.warn('Não foi possível criar o cliente automaticamente:', e);
      }
    }

    const { error } = await db.from('agenda_agendamentos').insert({
      empresa_id: state.empresa.id,
      cliente_id: clienteId,
      servico_id: serv?.id || null,
      profissional_id: prof?.id || null,
      cliente_nome: agCli,
      cliente_telefone: agTel,
      servico_nome: serv?.nome || '',
      profissional_nome: prof?.nome || '',
      data: agData,
      hora: agHora,
      status: $('agStatus')?.value || 'Pendente',
      valor: Number(serv?.preco || 0)
    });

    if (error) {
      toast('Erro ao salvar: ' + error.message, 'err');
      return;
    }

    if ($('agClienteSelect')) $('agClienteSelect').value = '';
    if ($('agCliente')) $('agCliente').value = '';
    if ($('agTelefone')) $('agTelefone').value = '';
    if ($('agClienteDesktop')) $('agClienteDesktop').value = '';
    if ($('agTelefoneDesktop')) $('agTelefoneDesktop').value = '';
    if ($('vxAgendaClientSummary')) $('vxAgendaClientSummary').hidden = true;
    if ($('agServico')) $('agServico').value = '';
    if ($('agProfissional')) $('agProfissional').value = '';
    if ($('agStatus')) $('agStatus').value = 'Confirmado';
    if ($('agData')) {
      if ($('agData')._flatpickr) $('agData')._flatpickr.clear();
      else $('agData').value = '';
    }
    if ($('agHora')) $('agHora').value = '';

    await loadAll();
    if (vxIsMobileAgenda()) vxCloseAgendaForm();
    showNotif('Agendamento criado!', `${agCli} — ${formatDate(agData)} às ${agHora}.`, 'ok');
  } finally {
    salvarAgendamento._running = false;
    if (botao) botao.disabled = false;
  }
}

async function salvarConfig() {
  if (!state?.empresa?.id) return;
  const nome = ($('cfgNome')?.value || '').trim();
  if (!nome) return toast('Digite o nome.', 'err');
  const slugAtual = slugify(state.empresa.slug || '');
  const slugNovo = slugify($('cfgSlug')?.value || slugAtual);
  const updates = {
    nome, whatsapp: ($('cfgWhatsapp')?.value || '').trim(),
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
  setText('sideNome', state.empresa.nome); setText('topbarNome', state.empresa.nome); setText('mobileDashNome', state.empresa.nome); renderAvatarPainel();
  { const sideCard = $('sideAvatar')?.closest('.side-user-card'); if (sideCard) sideCard.setAttribute('data-tip', state.empresa.nome || 'Empresa'); }
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
  lockPublicModalScroll();
}

function closeModalRecusa() {
  const overlay = $('modalRecusaOverlay'); if (overlay) overlay.classList.remove('open');
  unlockPublicModalScroll();
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
  lockSecondScreen();
}

function closeModalReagendar() {
  const overlay = $('modalReagendarOverlay'); if (overlay) overlay.classList.remove('open');
  unlockSecondScreen();
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
  lockSecondScreen();
}

function closeConfirmModal() {
  const overlay = $('confirmOverlay'); if (overlay) overlay.classList.remove('open'); _confirmCb = null;
  unlockSecondScreen();
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
  lockSecondScreen();
}

function closeEditModal() {
  const overlay = $('editOverlay'); if (overlay) overlay.classList.remove('open'); _editSaveCb = null;
  unlockSecondScreen();
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

function atualizarBloqueioPublicacao() {
  const sideLink = $('sideLinkBox');
  if (sideLink) {
    sideLink.textContent = state?.empresa?.slug ? publicUrl(state.empresa.slug) : '';
    sideLink.classList.remove('is-locked');
  }
  document.querySelectorAll('.dash-copy-button').forEach(button => {
    button.classList.remove('is-locked');
    button.setAttribute('aria-disabled', 'false');
    const label = button.querySelector('.dash-copy-label');
    if (label) label.textContent = 'Copiar link';
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
  setText('pubDescEmpresa', '');
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
        <div style="flex:1;min-width:0"><div class="choice-title">${p.nome}</div></div>
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
  if (!state.pubEmpresa) return toast('Empresa não carregada. Atualize a página e tente novamente.', 'err');
  if (!state.pubServico) return toast('Escolha um serviço antes de confirmar.', 'warn');
  if (!state.pubProfissional) return toast('Escolha um profissional antes de confirmar.', 'warn');
  if (!pubData) return toast('Escolha uma data antes de confirmar.', 'warn');
  if (!pubHora) return toast('Escolha um horário antes de confirmar.', 'warn');
  if (!pubNome) return toast('Informe seu nome completo.', 'warn');
  if (!pubTel || pubTel.replace(/\D/g, '').length < 10) return toast('Informe um WhatsApp válido.', 'warn');
  if (isDiaFechado(pubData, state.pubDiasFechados || [])) { validarDataPublica(pubData); return toast('Este dia não está disponível. Escolha outra data.', 'err'); }
  if (horarioPublicoJaPassou(pubData, pubHora)) {
    const horaInput = $('pubHora');
    const horaLabel = $('pubHoraLabel');
    const horaBtn = $('pubHoraBtn');
    if (horaInput) horaInput.value = '';
    if (horaLabel) horaLabel.textContent = 'Escolher horário';
    if (horaBtn) horaBtn.classList.remove('selecionado');
    return toast('Este horário já passou. Escolha um horário disponível.', 'warn');
  }

  const botao = document.querySelector('.pub-confirm-btn');
  if (botao) {
    botao.disabled = true;
    botao.textContent = 'Confirmando...';
  }

  await finalizarAgendamentoPublico();
}

async function finalizarAgendamentoPublico() {
  const pubNome = $('pubClienteNome')?.value?.trim(), pubTel = $('pubClienteTel')?.value?.trim();
  const pubData = $('pubData')?.value, pubHora = $('pubHora')?.value;
  const mb = $('pubMainBody'), cs = $('pubConfirmScreen');
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
      valor: Number(state.pubServico.preco || 0), observacoes: ''
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
    const dataFormatada = (() => {
      try {
        return new Date(pubData + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      } catch (_) { return pubData; }
    })();

    const preencher = (id, valor) => { const el = $(id); if (el) el.textContent = valor || '—'; };
    preencher('pubSuccessServico', state.pubServico?.nome);
    preencher('pubSuccessProfissional', state.pubProfissional?.nome);
    preencher('pubSuccessData', dataFormatada);
    preencher('pubSuccessHora', pubHora);

    const hero = document.querySelector('#publicView .pub-hero');
    if (mb) mb.style.display = 'none';
    if (hero) hero.style.display = 'none';
    if (cs) cs.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {
    console.error('Erro ao confirmar agendamento público:', e);
    toast('Erro inesperado. Tente novamente.', 'err');
  } finally {
    const botao = document.querySelector('.pub-confirm-btn');
    if (botao) {
      botao.disabled = false;
      botao.textContent = 'Confirmar agendamento ✓';
    }
  }
}

function resetPublic() {
  const mb = $('pubMainBody'), cs = $('pubConfirmScreen');
  const hero = document.querySelector('#publicView .pub-hero');
  if (mb) mb.style.display = '';
  if (hero) hero.style.display = '';
  if (cs) cs.style.display = 'none';
  ['pubClienteNome', 'pubClienteTel', 'pubData', 'pubHora'].forEach(id => { const el = $(id); if (el) el.value = ''; });
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
  abrirBoasVindasMobile, continuarBoasVindasMobile, pularBoasVindasMobile,
  abrirCadastroPelasBoasVindas, abrirLoginPelasBoasVindas,
  goStep1, goStep2, goStep3, autoSlug,
  loginComSenha, finalizarCadastro, logout,
  showForgotPassword, confirmarEmailCadastro, reenviarCodigoCadastro, voltarCadastroEmail,
  enviarCodigoRecuperacao, reenviarCodigoRecuperacao, validarCodigoRecuperacao, salvarNovaSenha,
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
  openNotificationCenter, closeNotificationCenter, markNotificationRead,
  markAllNotificationsRead, deleteNotification, clearAllNotifications,
  abrirCalendarioPublico, fecharCalendarioPublico, pubCalMes, selecionarDataPublica,
  abrirSlotsPublico, fecharSlotsPublico, selecionarSlot
});


// ── TRAVA DE ROLAGEM DOS MODAIS PÚBLICOS ─────────────────────────────────────
let _publicModalLockCount = 0;

function lockPublicModalScroll() {
  _publicModalLockCount += 1;
  if (_publicModalLockCount > 1) return;
  document.documentElement.classList.add('public-modal-open');
  document.body.classList.add('public-modal-open');
}

function unlockPublicModalScroll() {
  _publicModalLockCount = Math.max(0, _publicModalLockCount - 1);
  if (_publicModalLockCount > 0) return;
  document.documentElement.classList.remove('public-modal-open');
  document.body.classList.remove('public-modal-open');
}
// ─────────────────────────────────────────────────────────────────────────────

// ── CALENDÁRIO PÚBLICO FULLSCREEN ─────────────────────────────────────────────
let _pubCalAno, _pubCalMes;

function abrirCalendarioPublico() {
  if (!state.pubServico) {
    toast('Escolha um serviço antes de selecionar a data.', 'warn');
    document.getElementById('pubServicos')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (!state.pubProfissional) {
    toast('Escolha um profissional antes de selecionar a data.', 'warn');
    document.getElementById('pubProfissionais')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const hoje = new Date();
  _pubCalAno = hoje.getFullYear();
  _pubCalMes = hoje.getMonth();
  renderPubCal();
  const ov = document.getElementById('pubCalendarioOverlay');
  if (ov) { ov.style.display = 'flex'; requestAnimationFrame(() => ov.classList.add('open')); }
  VYXORA_SCROLL.lock('public-calendar');
}

function fecharCalendarioPublico(e) {
  if (e && e.target !== document.getElementById('pubCalendarioOverlay')) return;
  const ov = document.getElementById('pubCalendarioOverlay');
  if (ov) { ov.classList.remove('open'); setTimeout(() => ov.style.display = 'none', 200); }
  VYXORA_SCROLL.unlock('public-calendar');
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
// Na agenda pública, horários que já passaram no dia atual não podem ser reservados.
// A comparação usa o horário local do dispositivo do cliente, sem afetar datas futuras.
function horarioPublicoJaPassou(dataISO, horaHHMM) {
  if (!dataISO || !horaHHMM) return false;
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  const hojeISO = `${ano}-${mes}-${dia}`;
  if (dataISO !== hojeISO) return false;

  const [h, m] = String(horaHHMM).slice(0, 5).split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return false;
  const horarioSelecionado = new Date(ano, agora.getMonth(), agora.getDate(), h, m, 0, 0);
  return horarioSelecionado <= agora;
}

async function abrirSlotsPublico() {
  const data = document.getElementById('pubData')?.value;
  const prof = state.pubProfissional;

  if (!state.pubServico) {
    toast('Escolha um serviço antes de ver os horários.', 'warn');
    document.getElementById('pubServicos')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (!prof) {
    toast('Escolha um profissional para ver os horários disponíveis.', 'warn');
    document.getElementById('pubProfissionais')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (!data) {
    toast('Escolha uma data antes de selecionar o horário.', 'warn');
    document.getElementById('pubDataBtn')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

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
      const passou = horarioPublicoJaPassou(data, s);
      const indisponivel = ocup || passou;
      const classe = passou ? 'passado' : (ocup ? 'ocupado' : 'livre');
      const tag = passou ? '<span class="slot-tag">Indisponível</span>' : (ocup ? '<span class="slot-tag">Ocupado</span>' : '');
      return `<div class="pub-slot ${classe}" ${!indisponivel ? `onclick="selecionarSlot('${s}')"` : ''}>${s}${tag}</div>`;
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
  VYXORA_SCROLL.lock('public-slots');
}

function fecharSlotsPublico(e) {
  if (e && e.target !== document.getElementById('pubSlotsOverlay')) return;
  const ov = document.getElementById('pubSlotsOverlay');
  if (ov) { ov.classList.remove('open'); setTimeout(() => ov.style.display = 'none', 200); }
  VYXORA_SCROLL.unlock('public-slots');
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


// Garante que os seletores nativos de data e hora abram dentro dos modais.
document.addEventListener('DOMContentLoaded', () => {
  ['reagendarData', 'reagendarHora'].forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;

    input.addEventListener('click', () => {
      try {
        if (typeof input.showPicker === 'function') input.showPicker();
      } catch (_) {
        // Alguns navegadores abrem o seletor automaticamente.
      }
    });
  });
});


// ═════════════════════════════════════════════════════════════════════════════
// V14 — REAGENDAMENTO MÍNIMO USANDO EXATAMENTE OS OVERLAYS PÚBLICOS EXISTENTES
// Não altera HTML nem CSS do painel.
// ═════════════════════════════════════════════════════════════════════════════
(() => {
  let modoSeletor = 'publico';
  let reagendamentoAtual = null;
  let novaData = '';
  let novaHora = '';

  const originalAbrirCalendarioPublico = abrirCalendarioPublico;
  const originalSelecionarDataPublica = selecionarDataPublica;
  const originalSelecionarSlot = selecionarSlot;
  const originalFecharCalendarioPublico = fecharCalendarioPublico;
  const originalFecharSlotsPublico = fecharSlotsPublico;
  const originalRenderPubCal = renderPubCal;

  function resetarModoReagendamento() {
    modoSeletor = 'publico';
    reagendamentoAtual = null;
    novaData = '';
    novaHora = '';

    const tituloCal = document.querySelector('#pubCalendarioOverlay .pub-modal-title');
    const tituloSlots = document.querySelector('#pubSlotsOverlay .pub-modal-title');
    if (tituloCal) tituloCal.textContent = 'Escolha a data';
    if (tituloSlots) tituloSlots.textContent = 'Escolha o horário';
  }

  function abrirOverlayExistente(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('open'));
    lockPublicModalScroll();
  }

  function fecharOverlayExistente(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.remove('open');
    setTimeout(() => {
      if (!overlay.classList.contains('open')) overlay.style.display = 'none';
    }, 200);
    unlockPublicModalScroll();
  }

  function formatarDataCurta(iso) {
    const [ano, mes, dia] = iso.split('-').map(Number);
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    return `${dia} de ${meses[mes - 1]} de ${ano}`;
  }

  abrirCalendarioPublico = function() {
    modoSeletor = 'publico';
    return originalAbrirCalendarioPublico();
  };

  openModalReagendar = function(id) {
    const ag = (state.agendamentos || []).find(item => String(item.id) === String(id));
    if (!ag) return;
    if (!podeTerAcoes(ag)) {
      return toast('Este agendamento não permite reagendamento.', 'warn');
    }

    modoSeletor = 'reagendamento';
    reagendamentoAtual = ag;
    novaData = '';
    novaHora = '';

    const hoje = new Date();
    _pubCalAno = hoje.getFullYear();
    _pubCalMes = hoje.getMonth();

    const tituloCal = document.querySelector('#pubCalendarioOverlay .pub-modal-title');
    if (tituloCal) tituloCal.textContent = 'Escolha a nova data';

    originalRenderPubCal();
    abrirOverlayExistente('pubCalendarioOverlay');
  };

  renderPubCal = function() {
    if (modoSeletor !== 'reagendamento') {
      return originalRenderPubCal();
    }

    const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const titulo = document.getElementById('pubCalTitulo');
    if (titulo) titulo.textContent = `${nomes[_pubCalMes]} ${_pubCalAno}`;

    const grid = document.getElementById('pubCalGrid');
    if (!grid) return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const primeiroDia = new Date(_pubCalAno, _pubCalMes, 1);
    const ultimoDia = new Date(_pubCalAno, _pubCalMes + 1, 0);
    const iniciaSemana = primeiroDia.getDay();

    let html = '';

    if (iniciaSemana > 0) {
      const diasAnterior = new Date(_pubCalAno, _pubCalMes, 0).getDate();
      for (let i = iniciaSemana - 1; i >= 0; i -= 1) {
        html += `<div class="pub-cal-cell fora-mes">${diasAnterior - i}</div>`;
      }
    }

    for (let dia = 1; dia <= ultimoDia.getDate(); dia += 1) {
      const data = new Date(_pubCalAno, _pubCalMes, dia);
      data.setHours(0, 0, 0, 0);
      const bloqueado = data < hoje;
      const iso = `${_pubCalAno}-${String(_pubCalMes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const selecionado = novaData === iso;

      html += `<div class="pub-cal-cell${bloqueado ? ' bloqueado' : ''}${selecionado ? ' selecionado' : ''}" ${bloqueado ? '' : `onclick="selecionarDataPublica('${iso}')"`}>${dia}</div>`;
    }

    const ultimoDiaSemana = ultimoDia.getDay();
    if (ultimoDiaSemana < 6) {
      for (let dia = 1; dia <= 6 - ultimoDiaSemana; dia += 1) {
        html += `<div class="pub-cal-cell fora-mes">${dia}</div>`;
      }
    }

    grid.innerHTML = html;
  };

  selecionarDataPublica = function(iso) {
    if (modoSeletor !== 'reagendamento') {
      return originalSelecionarDataPublica(iso);
    }

    novaData = iso;
    novaHora = '';
    fecharOverlayExistente('pubCalendarioOverlay');
    carregarHorariosReagendamento();
  };

  async function carregarHorariosReagendamento() {
    if (!reagendamentoAtual || !novaData) return;

    const empresa = state.empresa || {};
    const profissional = (state.profissionais || []).find(
      item => String(item.id) === String(reagendamentoAtual.profissional_id)
    ) || {};

    const inicio = empresa.horario_inicio || profissional.horario_inicio || '09:00';
    const fim = empresa.horario_fim || profissional.horario_fim || '18:00';
    const intervalo = Math.max(5, Number(empresa.intervalo_slots || profissional.intervalo_slots || 30));

    let consulta = db.from('agenda_agendamentos')
      .select('id, hora, status')
      .eq('data', novaData)
      .in('status', ['Pendente', 'Confirmado', 'Reagendado']);

    if (reagendamentoAtual.profissional_id) {
      consulta = consulta.eq('profissional_id', reagendamentoAtual.profissional_id);
    }

    const { data: registros, error } = await consulta;
    const grid = document.getElementById('pubSlotsGrid');

    if (error) {
      if (grid) grid.innerHTML = '<p style="color:var(--text3);text-align:center;padding:24px">Não foi possível carregar os horários.</p>';
      return;
    }

    const ocupados = new Set(
      (registros || [])
        .filter(item => String(item.id) !== String(reagendamentoAtual.id))
        .map(item => (item.hora || '').slice(0, 5))
    );

    const [hIni, mIni] = inicio.split(':').map(Number);
    const [hFim, mFim] = fim.split(':').map(Number);
    let atual = hIni * 60 + mIni;
    const limite = hFim * 60 + mFim;
    const slots = [];

    while (atual < limite) {
      slots.push(`${String(Math.floor(atual / 60)).padStart(2, '0')}:${String(atual % 60).padStart(2, '0')}`);
      atual += intervalo;
    }

    if (grid) {
      grid.innerHTML = slots.map(hora => {
        const ocupado = ocupados.has(hora);
        return `<div class="pub-slot${ocupado ? ' ocupado' : ' livre'}" ${ocupado ? '' : `onclick="selecionarSlot('${hora}')"`}>${hora}${ocupado ? '<span class="slot-tag">Ocupado</span>' : ''}</div>`;
      }).join('');
    }

    const titulo = document.getElementById('pubSlotsTitulo');
    if (titulo) titulo.textContent = `Novo horário — ${formatarDataCurta(novaData)}`;

    const tituloModal = document.querySelector('#pubSlotsOverlay .pub-modal-title');
    if (tituloModal) tituloModal.textContent = 'Escolha o novo horário';

    abrirOverlayExistente('pubSlotsOverlay');
  }

  selecionarSlot = function(hora) {
    if (modoSeletor !== 'reagendamento') {
      return originalSelecionarSlot(hora);
    }

    novaHora = hora;
    fecharOverlayExistente('pubSlotsOverlay');

    openConfirmModal({
      icon: '📅',
      type: 'info',
      title: 'Confirmar reagendamento?',
      body: `${reagendamentoAtual.cliente_nome} será reagendado para ${formatarDataCurta(novaData)} às ${novaHora}.`,
      btnLabel: 'Reagendar',
      cb: salvarReagendamento
    });
  };

  async function salvarReagendamento() {
    if (!reagendamentoAtual || !novaData || !novaHora) return;

    const ag = reagendamentoAtual;
    const tel = (ag.cliente_telefone || ag.telefone || '').replace(/\D/g, '');
    const janelaWhatsapp = reservarJanelaWhatsapp(tel);

    const { error } = await db.from('agenda_agendamentos')
      .update({ data: novaData, hora: novaHora, status: 'Reagendado' })
      .eq('id', ag.id);

    if (error) {
      if (janelaWhatsapp && !janelaWhatsapp.closed) janelaWhatsapp.close();
      return toast('Erro ao reagendar.', 'err');
    }

    ag.data = novaData;
    ag.hora = novaHora;
    ag.status = 'Reagendado';

    const dadosMensagem = { novaData, novaHora };
    resetarModoReagendamento();
    renderAll();
    showNotif('Reagendado!', `${ag.cliente_nome} → ${formatDate(ag.data)} às ${ag.hora}`, 'ok');

    if (tel) {
      abrirLinkWhatsapp(
        tel,
        montarMensagemWhatsapp('reagendamento', ag, dadosMensagem),
        janelaWhatsapp
      );
    }
  }

  fecharCalendarioPublico = function(e) {
    if (modoSeletor !== 'reagendamento') {
      return originalFecharCalendarioPublico(e);
    }

    if (e && e.target !== document.getElementById('pubCalendarioOverlay')) return;
    fecharOverlayExistente('pubCalendarioOverlay');
    resetarModoReagendamento();
  };

  fecharSlotsPublico = function(e) {
    if (modoSeletor !== 'reagendamento') {
      return originalFecharSlotsPublico(e);
    }

    if (e && e.target !== document.getElementById('pubSlotsOverlay')) return;
    fecharOverlayExistente('pubSlotsOverlay');
    resetarModoReagendamento();
  };
})();


// Entrada progressiva da página inicial premium.
function initLandingPremiumMotion() {
  const landing = document.getElementById('landingView');
  if (!landing || landing.dataset.motionReady === '1') return;
  landing.dataset.motionReady = '1';

  const items = landing.querySelectorAll('.landing-reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach(item => item.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -45px 0px' });

  items.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
    observer.observe(item);
  });
}

// A home leve não usa observadores ou animações de entrada contínuas.
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#landingView .landing-reveal').forEach(el => el.classList.add('is-visible'));
}, { once: true });

// ═════════════════════════════════════════════════════════════════════════════
// AGENDA INTERNA — usa exatamente os mesmos overlays da Página Pública
// para data e horário, sem abrir os seletores nativos/Flatpickr.
// ═════════════════════════════════════════════════════════════════════════════
(() => {
  let modoAgendaInterna = false;
  let agendaAno = 0;
  let agendaMes = 0;
  let agendaData = '';

  const anteriorSelecionarData = selecionarDataPublica;
  const anteriorSelecionarSlot = selecionarSlot;
  const anteriorPubCalMes = pubCalMes;
  const anteriorFecharCalendario = fecharCalendarioPublico;
  const anteriorFecharSlots = fecharSlotsPublico;

  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const mesesCurtos = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

  function abrirOverlay(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('open'));
    VYXORA_SCROLL.lock('overlay:' + id);
  }

  function fecharOverlay(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.remove('open');
    setTimeout(() => {
      if (!overlay.classList.contains('open')) overlay.style.display = 'none';
    }, 200);
    VYXORA_SCROLL.unlock('overlay:' + id);
  }

  function formatarDataAgenda(iso) {
    if (!iso) return 'Escolher data';
    const [ano, mes, dia] = iso.split('-').map(Number);
    return `${dia} de ${mesesCurtos[mes - 1]} de ${ano}`;
  }

  function renderCalendarioAgendaInterna() {
    const titulo = document.getElementById('pubCalTitulo');
    if (titulo) titulo.textContent = `${meses[agendaMes]} ${agendaAno}`;

    const grid = document.getElementById('pubCalGrid');
    if (!grid) return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const primeiro = new Date(agendaAno, agendaMes, 1);
    const ultimo = new Date(agendaAno, agendaMes + 1, 0);
    const inicioSemana = primeiro.getDay();
    const diasFechados = state.empresa?.dias_fechados || state.diasFechados || [];

    let html = '';
    if (inicioSemana > 0) {
      const anterior = new Date(agendaAno, agendaMes, 0).getDate();
      for (let i = inicioSemana - 1; i >= 0; i -= 1) {
        html += `<div class="pub-cal-cell fora-mes">${anterior - i}</div>`;
      }
    }

    for (let dia = 1; dia <= ultimo.getDate(); dia += 1) {
      const data = new Date(agendaAno, agendaMes, dia);
      data.setHours(0, 0, 0, 0);
      const iso = `${agendaAno}-${String(agendaMes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const bloqueado = data < hoje || diasFechados.includes(data.getDay());
      const selecionado = agendaData === iso;
      html += `<div class="pub-cal-cell${bloqueado ? ' bloqueado' : ''}${selecionado ? ' selecionado' : ''}" ${bloqueado ? '' : `onclick="selecionarDataPublica('${iso}')"`}>${dia}</div>`;
    }

    const ultimoDiaSemana = ultimo.getDay();
    if (ultimoDiaSemana < 6) {
      for (let dia = 1; dia <= 6 - ultimoDiaSemana; dia += 1) {
        html += `<div class="pub-cal-cell fora-mes">${dia}</div>`;
      }
    }
    grid.innerHTML = html;
  }

  window.abrirCalendarioAgendaInterna = function() {
    modoAgendaInterna = true;
    agendaData = document.getElementById('agData')?.value || '';
    const base = agendaData ? new Date(`${agendaData}T12:00:00`) : new Date();
    agendaAno = base.getFullYear();
    agendaMes = base.getMonth();

    const titulo = document.querySelector('#pubCalendarioOverlay .pub-modal-title');
    if (titulo) titulo.textContent = 'Escolha a data';
    renderCalendarioAgendaInterna();
    abrirOverlay('pubCalendarioOverlay');
  };

  pubCalMes = function(direcao) {
    if (!modoAgendaInterna) return anteriorPubCalMes(direcao);
    agendaMes += direcao;
    if (agendaMes > 11) { agendaMes = 0; agendaAno += 1; }
    if (agendaMes < 0) { agendaMes = 11; agendaAno -= 1; }
    renderCalendarioAgendaInterna();
  };

  selecionarDataPublica = function(iso) {
    if (!modoAgendaInterna) return anteriorSelecionarData(iso);

    agendaData = iso;
    const input = document.getElementById('agData');
    const label = document.getElementById('agDataLabel');
    const botao = document.getElementById('agDataBtn');
    if (input) input.value = iso;
    if (label) label.textContent = formatarDataAgenda(iso);
    if (botao) botao.classList.add('selecionado');

    const horaInput = document.getElementById('agHora');
    const horaLabel = document.getElementById('agHoraLabel');
    const horaBotao = document.getElementById('agHoraBtn');
    if (horaInput) horaInput.value = '';
    if (horaLabel) horaLabel.textContent = 'Escolher horário';
    if (horaBotao) horaBotao.classList.remove('selecionado');

    fecharOverlay('pubCalendarioOverlay');
    window.abrirHorariosAgendaInterna();
  };

  window.abrirHorariosAgendaInterna = async function() {
    modoAgendaInterna = true;
    const data = document.getElementById('agData')?.value;
    const profissionalId = document.getElementById('agProfissional')?.value;

    if (!data) return toast('Escolha a data primeiro.', 'warn');
    if (!profissionalId) return toast('Escolha o profissional antes do horário.', 'warn');

    const empresa = state.empresa || {};
    const profissional = (state.profissionais || []).find(item => String(item.id) === String(profissionalId)) || {};
    const inicio = empresa.horario_inicio || profissional.horario_inicio || '09:00';
    const fim = empresa.horario_fim || profissional.horario_fim || '18:00';
    const intervalo = Math.max(5, Number(empresa.intervalo_slots || profissional.intervalo_slots || 30));

    let consulta = db.from('agenda_agendamentos')
      .select('hora, status')
      .eq('data', data)
      .eq('profissional_id', profissionalId)
      .in('status', ['Pendente', 'Confirmado', 'Reagendado']);

    const { data: registros, error } = await consulta;
    const grid = document.getElementById('pubSlotsGrid');
    if (!grid) return;

    if (error) {
      grid.innerHTML = '<p style="color:var(--text3);text-align:center;padding:24px">Não foi possível carregar os horários.</p>';
    } else {
      const ocupados = new Set((registros || []).map(item => (item.hora || '').slice(0, 5)));
      const [hIni, mIni] = inicio.split(':').map(Number);
      const [hFim, mFim] = fim.split(':').map(Number);
      let atual = hIni * 60 + mIni;
      const limite = hFim * 60 + mFim;
      const slots = [];
      while (atual < limite) {
        slots.push(`${String(Math.floor(atual / 60)).padStart(2, '0')}:${String(atual % 60).padStart(2, '0')}`);
        atual += intervalo;
      }
      grid.innerHTML = slots.map(hora => {
        const ocupado = ocupados.has(hora);
        return `<div class="pub-slot${ocupado ? ' ocupado' : ' livre'}" ${ocupado ? '' : `onclick="selecionarSlot('${hora}')"`}>${hora}${ocupado ? '<span class="slot-tag">Ocupado</span>' : ''}</div>`;
      }).join('');
    }

    const titulo = document.getElementById('pubSlotsTitulo');
    if (titulo) titulo.textContent = `Horários — ${formatarDataAgenda(data)}`;
    const tituloModal = document.querySelector('#pubSlotsOverlay .pub-modal-title');
    if (tituloModal) tituloModal.textContent = 'Escolha o horário';
    abrirOverlay('pubSlotsOverlay');
  };

  selecionarSlot = function(hora) {
    if (!modoAgendaInterna) return anteriorSelecionarSlot(hora);

    const input = document.getElementById('agHora');
    const label = document.getElementById('agHoraLabel');
    const botao = document.getElementById('agHoraBtn');
    if (input) input.value = hora;
    if (label) label.textContent = hora;
    if (botao) botao.classList.add('selecionado');
    fecharOverlay('pubSlotsOverlay');
    modoAgendaInterna = false;
  };

  fecharCalendarioPublico = function(evento) {
    if (!modoAgendaInterna) return anteriorFecharCalendario(evento);
    if (evento && evento.target !== document.getElementById('pubCalendarioOverlay')) return;
    fecharOverlay('pubCalendarioOverlay');
    modoAgendaInterna = false;
  };

  fecharSlotsPublico = function(evento) {
    if (!modoAgendaInterna) return anteriorFecharSlots(evento);
    if (evento && evento.target !== document.getElementById('pubSlotsOverlay')) return;
    fecharOverlay('pubSlotsOverlay');
    modoAgendaInterna = false;
  };

  // Mantém os rótulos sincronizados quando o formulário é limpo pelo sistema.
  document.addEventListener('DOMContentLoaded', () => {
    const observar = () => {
      const data = document.getElementById('agData');
      const hora = document.getElementById('agHora');
      const dataLabel = document.getElementById('agDataLabel');
      const horaLabel = document.getElementById('agHoraLabel');
      const dataBtn = document.getElementById('agDataBtn');
      const horaBtn = document.getElementById('agHoraBtn');
      if (!data || !hora) return;

      let anteriorData = data.value;
      let anteriorHora = hora.value;
      setInterval(() => {
        if (data.value !== anteriorData) {
          anteriorData = data.value;
          if (dataLabel) dataLabel.textContent = data.value ? formatarDataAgenda(data.value) : 'Escolher data';
          dataBtn?.classList.toggle('selecionado', Boolean(data.value));
        }
        if (hora.value !== anteriorHora) {
          anteriorHora = hora.value;
          if (horaLabel) horaLabel.textContent = hora.value || 'Escolher horário';
          horaBtn?.classList.toggle('selecionado', Boolean(hora.value));
        }
      }, 250);
    };
    observar();
  }, { once: true });
})();

/* =========================================================
   AGENDA V14 — selects personalizados para Serviço,
   Profissional e Status. Mantém os <select> originais como
   fonte de valor para preservar toda a lógica existente.
   ========================================================= */
(() => {
  const SELECT_IDS = ['agServico', 'agProfissional', 'agStatus'];
  const instances = new Map();
  let activeInstance = null;
  let layer = null;
  let panel = null;

  function ensureLayer() {
    if (layer) return;

    layer = document.createElement('div');
    layer.className = 'agenda-custom-select-layer';
    layer.hidden = true;
    layer.innerHTML = `
      <div class="agenda-custom-select-backdrop" data-agenda-select-close></div>
      <div class="agenda-custom-select-panel" role="listbox" tabindex="-1"></div>
    `;
    document.body.appendChild(layer);
    panel = layer.querySelector('.agenda-custom-select-panel');

    layer.addEventListener('click', (event) => {
      if (event.target.closest('[data-agenda-select-close]')) {
        closeCustomSelect();
        return;
      }

      const optionButton = event.target.closest('[data-agenda-select-value]');
      if (!optionButton || !activeInstance || optionButton.disabled) return;

      const value = optionButton.dataset.agendaSelectValue ?? '';
      activeInstance.select.value = value;
      activeInstance.select.dispatchEvent(new Event('input', { bubbles: true }));
      activeInstance.select.dispatchEvent(new Event('change', { bubbles: true }));
      syncTrigger(activeInstance);
      closeCustomSelect(true);
    });
  }

  function selectedOption(select) {
    return select.options[select.selectedIndex] || select.options[0] || null;
  }

  function syncTrigger(instance) {
    const option = selectedOption(instance.select);
    instance.label.textContent = option?.textContent?.trim() || 'Selecione';
    instance.trigger.disabled = instance.select.disabled;
    instance.trigger.setAttribute('aria-disabled', String(instance.select.disabled));
  }

  function renderOptions(instance) {
    panel.replaceChildren();
    const fragment = document.createDocumentFragment();

    Array.from(instance.select.options).forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'agenda-custom-select-option';
      button.dataset.agendaSelectValue = option.value;
      button.textContent = option.textContent.trim();
      button.disabled = option.disabled;
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(option.selected));
      if (option.selected) button.classList.add('is-selected');
      fragment.appendChild(button);
    });

    panel.appendChild(fragment);
  }

  function positionPanel(trigger) {
    if (window.matchMedia('(max-width: 700px)').matches) {
      panel.style.removeProperty('left');
      panel.style.removeProperty('top');
      panel.style.removeProperty('width');
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 12;
    const width = Math.max(rect.width, 220);
    panel.style.width = `${Math.min(width, window.innerWidth - viewportPadding * 2)}px`;

    const estimatedHeight = Math.min(panel.scrollHeight || 260, 360);
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const opensAbove = spaceBelow < Math.min(estimatedHeight, 220) && rect.top > spaceBelow;
    const top = opensAbove
      ? Math.max(viewportPadding, rect.top - estimatedHeight - 6)
      : Math.min(window.innerHeight - estimatedHeight - viewportPadding, rect.bottom + 6);
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - Math.min(width, window.innerWidth - viewportPadding * 2) - viewportPadding
    );

    panel.style.left = `${left}px`;
    panel.style.top = `${Math.max(viewportPadding, top)}px`;
  }

  function openCustomSelect(instance) {
    if (!instance || instance.select.disabled) return;
    ensureLayer();

    if (activeInstance && activeInstance !== instance) {
      activeInstance.trigger.setAttribute('aria-expanded', 'false');
    }

    activeInstance = instance;
    syncTrigger(instance);
    renderOptions(instance);
    positionPanel(instance.trigger);

    layer.hidden = false;
    instance.trigger.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => layer.classList.add('is-open'));
  }

  function closeCustomSelect(restoreFocus = false) {
    if (!layer || layer.hidden) return;

    const previous = activeInstance;
    layer.classList.remove('is-open');
    previous?.trigger.setAttribute('aria-expanded', 'false');
    activeInstance = null;

    window.setTimeout(() => {
      if (!layer.classList.contains('is-open')) layer.hidden = true;
    }, 140);

    if (restoreFocus && previous?.trigger) {
      previous.trigger.focus({ preventScroll: true });
    }
  }

  function enhanceSelect(select) {
    if (!select || select.dataset.agendaCustomSelect === 'true') return;

    select.dataset.agendaCustomSelect = 'true';
    select.classList.add('agenda-native-select-hidden');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'agenda-custom-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = `
      <span class="agenda-custom-select-trigger__label"></span>
      <span class="agenda-custom-select-trigger__chevron" aria-hidden="true"></span>
    `;
    select.insertAdjacentElement('afterend', trigger);

    const instance = {
      select,
      trigger,
      label: trigger.querySelector('.agenda-custom-select-trigger__label')
    };
    instances.set(select.id, instance);
    syncTrigger(instance);

    trigger.addEventListener('click', () => {
      if (activeInstance === instance && layer?.classList.contains('is-open')) {
        closeCustomSelect();
      } else {
        openCustomSelect(instance);
      }
    });

    select.addEventListener('change', () => syncTrigger(instance));
    select.addEventListener('input', () => syncTrigger(instance));

    const observer = new MutationObserver(() => {
      syncTrigger(instance);
      if (activeInstance === instance) {
        renderOptions(instance);
        positionPanel(instance.trigger);
      }
    });
    observer.observe(select, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'selected', 'label', 'value']
    });
  }

  function initAgendaCustomSelects() {
    SELECT_IDS.forEach((id) => enhanceSelect(document.getElementById(id)));
  }

  document.addEventListener('DOMContentLoaded', initAgendaCustomSelects, { once: true });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && activeInstance) closeCustomSelect(true);
  });

  window.addEventListener('resize', () => {
    if (activeInstance && layer?.classList.contains('is-open')) {
      positionPanel(activeInstance.trigger);
    }
  }, { passive: true });

  window.addEventListener('scroll', () => {
    if (activeInstance && !window.matchMedia('(max-width: 700px)').matches) {
      closeCustomSelect();
    }
  }, { passive: true, capture: true });
})();


document.addEventListener('DOMContentLoaded',()=>{
  const closeBtn=document.querySelector('#vxAgendaModal .vx-agenda-modal-close');
  if(closeBtn){
    const forceClose=(e)=>{
      e.preventDefault();
      e.stopPropagation();
      vxCloseAgendaModal();
    };
    closeBtn.addEventListener('click',forceClose,{passive:false});
    closeBtn.addEventListener('touchend',forceClose,{passive:false});
    closeBtn.addEventListener('pointerup',forceClose,{passive:false});
  }
});









// Modal Cliente: somente o E-mail desloca o card para cima.
document.addEventListener('focusin',(e)=>{
  const modal=$('vxClientesModal');
  const card=modal?.querySelector('.vx-clientes-modal-card');
  if(!modal||!card) return;

  if(e.target?.id==='vxCliEmail'){
    setTimeout(vxAjustarClienteModalTeclado,60);
    return;
  }

  // Nome e WhatsApp ficam sempre na posição normal.
  if(e.target?.id==='vxCliNome' || e.target?.id==='vxCliTel'){
    card.style.setProperty('transition','transform .18s ease','important');
    card.style.setProperty('transform','translateY(0)','important');
  }
});

document.addEventListener('focusout',(e)=>{
  if(e.target?.id!=='vxCliEmail') return;
  setTimeout(()=>{
    const modal=$('vxClientesModal');
    const card=modal?.querySelector('.vx-clientes-modal-card');
    if(card){
      card.style.setProperty('transition','transform .18s ease','important');
      card.style.setProperty('transform','translateY(0)','important');
    }
  },120);
});

