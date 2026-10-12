const form = document.querySelector('#downloadForm');
const input = document.querySelector('#mediaUrl');
const note = document.querySelector('#formNote');
const clearButton = document.querySelector('#clearButton');
const youtubeSearchForm = document.querySelector('#youtubeSearchForm');
const youtubeSearchInput = document.querySelector('#youtubeSearchInput');
const youtubeSearchNote = document.querySelector('#youtubeSearchNote');
const youtubeSearchState = document.querySelector('#youtubeSearchState');
const youtubeSearchResults = document.querySelector('#youtubeSearchResults');
const pinterestForm = document.querySelector('#pinterestForm');
const pinterestInput = document.querySelector('#pinterestProfile');
const pinterestNote = document.querySelector('#pinterestFormNote');
const pinterestClearButton = document.querySelector('#pinterestClearButton');
const mp3Form = document.querySelector('#mp3Form');
const mp3Input = document.querySelector('#mp3Url');
const mp3Note = document.querySelector('#mp3FormNote');
const mp3ClearButton = document.querySelector('#mp3ClearButton');
const musicForm = document.querySelector('#musicForm');
const musicInput = document.querySelector('#musicUrl');
const musicNote = document.querySelector('#musicFormNote');
const musicClearButton = document.querySelector('#musicClearButton');
const thumbnailForm = document.querySelector('#thumbnailForm');
const thumbnailInput = document.querySelector('#thumbnailUrl');
const thumbnailNote = document.querySelector('#thumbnailFormNote');
const thumbnailClearButton = document.querySelector('#thumbnailClearButton');
const avatarForm = document.querySelector('#avatarForm');
const avatarInput = document.querySelector('#avatarProfile');
const avatarNote = document.querySelector('#avatarFormNote');
const avatarClearButton = document.querySelector('#avatarClearButton');
const mediaTab = document.querySelector('#mediaTab');
const youtubeSearchTab = document.querySelector('#youtubeSearchTab');
const pinterestTab = document.querySelector('#pinterestTab');
const mp3Tab = document.querySelector('#mp3Tab');
const musicTab = document.querySelector('#musicTab');
const thumbnailTab = document.querySelector('#thumbnailTab');
const avatarTab = document.querySelector('#avatarTab');
const photosPdfTab = document.querySelector('#photosPdfTab');
const createTab = document.querySelector('#createTab');
const mediaToolPanel = document.querySelector('#mediaToolPanel');
const youtubeSearchToolPanel = document.querySelector('#youtubeSearchToolPanel');
const pinterestToolPanel = document.querySelector('#pinterestToolPanel');
const mp3ToolPanel = document.querySelector('#mp3ToolPanel');
const musicToolPanel = document.querySelector('#musicToolPanel');
const thumbnailToolPanel = document.querySelector('#thumbnailToolPanel');
const avatarToolPanel = document.querySelector('#avatarToolPanel');
const photosPdfToolPanel = document.querySelector('#photosPdfToolPanel');
const createToolPanel = document.querySelector('#createToolPanel');
const homeAppPromo = document.querySelector('#homeAppPromo');

function isOfficialSoftAndroidApp() {
  // Recurso exclusivo do WebApp oficial: somente a ponte nativa SoftAndroid
  // libera a Pesquisa YouTube. Navegadores comuns, inclusive no Android,
  // não recebem essa interface.
  try {
    return typeof window !== 'undefined' && Boolean(window.SoftAndroid);
  } catch (_) {
    return false;
  }
}

const resultScreen = document.querySelector('#resultScreen');
const resultBack = document.querySelector('#resultBack');
const resultLoading = document.querySelector('#resultLoading');
const resultLoadingText = document.querySelector('#resultLoadingText');
const resultLoadingHint = resultLoading?.querySelector('small');
const resultError = document.querySelector('#resultError');
const resultErrorTitle = document.querySelector('#resultErrorTitle');
const resultErrorText = document.querySelector('#resultErrorText');
const result = document.querySelector('#result');
const resultStage = document.querySelector('.result-stage');
const preview = document.querySelector('#resultPreview');
const downloadLink = document.querySelector('#downloadLink');
const carouselItems = document.querySelector('#carouselItems');
const downloadStatus = document.querySelector('#downloadStatus');
const downloadScreen = document.querySelector('#downloadScreen');
const downloadProgressBack = document.querySelector('#downloadProgressBack');
const downloadProgressTitle = document.querySelector('#downloadProgressTitle');
const downloadProgressSummary = document.querySelector('#downloadProgressSummary');
const downloadProgressSource = document.querySelector('#downloadProgressSource');
const downloadProgressCover = document.querySelector('#downloadProgressCover');
const downloadProgressContentTitle = document.querySelector('#downloadProgressContentTitle');
const downloadProgressContentMeta = document.querySelector('#downloadProgressContentMeta');
const downloadProgressList = document.querySelector('#downloadProgressList');
const downloadProgressCancel = document.querySelector('#downloadProgressCancel');
const mobileMenuToggle = document.querySelector('#mobileMenuToggle');
const mobileMenu = document.querySelector('#sideNav');
const sidebarBackdrop = document.querySelector('#sidebarBackdrop');
const themeToggles = document.querySelectorAll('[data-theme-toggle]');
const themeLabels = document.querySelectorAll('[data-theme-label]');
const historyOpenButtons = document.querySelectorAll('[data-open-history]');
const historyCountBadges = document.querySelectorAll('[data-history-count]');
const historyScreen = document.querySelector('#historyScreen');
const historyBack = document.querySelector('#historyBack');
const historyEnabled = document.querySelector('#historyEnabled');
const historyClear = document.querySelector('#historyClear');
const historyPrivacy = document.querySelector('#historyPrivacy');
const historyFeedback = document.querySelector('#historyFeedback');
const historyEmpty = document.querySelector('#historyEmpty');
const historyList = document.querySelector('#historyList');
const appViews = [...document.querySelectorAll('[data-app-view]')];
const viewLinks = [...document.querySelectorAll('[data-view-target]')];
const siteNotice = document.querySelector('.site-notice');

const DEFAULT_NOTE = 'Analisa fotos e vídeos públicos das plataformas acima e prepara o arquivo automaticamente para download.';
const DEFAULT_PINTEREST_NOTE = 'Busca somente as mídias públicas da área CRIADOS do perfil informado.';
const DEFAULT_MP3_NOTE = 'Converte vídeos públicos compatíveis das plataformas acima para MP3 em 192 kbps.';
const DEFAULT_MUSIC_NOTE = 'Compatível com YouTube, SoundCloud, Bandcamp, Audius, BandLab e links diretos de áudio.';
const DEFAULT_THUMBNAIL_NOTE = 'Disponível para YouTube, Twitch, Kick e Dailymotion.';
const DEFAULT_AVATAR_NOTE = 'Não precisa de login. Informe um @ ou link de perfil do Instagram.';
const THUMBNAIL_SOURCES = new Set(['youtube', 'twitch', 'kick', 'dailymotion']);
const MUSIC_SOURCES = new Set(['soundcloud', 'bandcamp', 'audius', 'bandlab']);

const DIRECT_MEDIA_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']);
const DIRECT_VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v']);
const DIRECT_AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'wav', 'ogg', 'opus', 'aac']);
const PLATFORM_RULES = [
  { source: 'instagram', label: 'Instagram', hosts: ['instagram.com', 'instagr.am'] },
  { source: 'tiktok', label: 'TikTok', hosts: ['tiktok.com'] },
  { source: 'facebook', label: 'Facebook', hosts: ['facebook.com', 'fb.watch', 'fb.com'] },
  { source: 'youtube', label: 'YouTube', hosts: ['youtube.com', 'youtube-nocookie.com', 'youtu.be'] },
  { source: 'bilibili', label: 'Bilibili', hosts: ['bilibili.com', 'b23.tv'] },
  { source: 'twitter', label: 'X', hosts: ['x.com', 'twitter.com'] },
  { source: 'pinterest', label: 'Pinterest', hosts: ['pinterest.com', 'pin.it'] },
  { source: 'kwai', label: 'Kwai', hosts: ['kwai.com', 'kwai-video.com', 'kw.ai'] },
  { source: 'dailymotion', label: 'Dailymotion', hosts: ['dailymotion.com', 'dai.ly'] },
  { source: 'linkedin', label: 'LinkedIn', hosts: ['linkedin.com', 'lnkd.in'] },
  { source: 'twitch', label: 'Twitch', hosts: ['twitch.tv'] },
  { source: 'kick', label: 'Kick', hosts: ['kick.com'] },
  { source: 'soundcloud', label: 'SoundCloud', hosts: ['soundcloud.com'] },
  { source: 'bandcamp', label: 'Bandcamp', hosts: ['bandcamp.com'] },
  { source: 'audius', label: 'Audius', hosts: ['audius.co'] },
  { source: 'bandlab', label: 'BandLab', hosts: ['bandlab.com'] },
];
const MEDIA_SOURCES = new Set(['instagram', 'tiktok', 'facebook', 'youtube', 'bilibili', 'twitter', 'pinterest', 'kwai', 'dailymotion', 'linkedin', 'twitch', 'kick']);
const MP3_VIDEO_SOURCES = new Set(MEDIA_SOURCES);
const MUSIC_TOOL_SOURCES = new Set(['youtube', 'soundcloud', 'bandcamp', 'audius', 'bandlab']);
const THUMBNAIL_TOOL_SOURCES = new Set(['youtube', 'twitch', 'kick', 'dailymotion']);

const WORKER_MEDIA_HOST = 'api.forgeaioficial.online';
const HISTORY_DB_NAME = 'soft-downloaders-local';
const HISTORY_DB_VERSION = 1;
const HISTORY_MAX_ITEMS = 30;
const ANALYSIS_CACHE_TTL_MS = 4 * 60 * 1000;
const ANALYSIS_CACHE_MAX_ITEMS = 24;
const ANALYSIS_REQUEST_TIMEOUT_MS = 48 * 1000;
const LONG_YOUTUBE_VIDEO_SECONDS = 60 * 60;
const analysisCache = new Map();
let activeResultItems = [];
let activeRequest = { tool: 'media', url: '' };
let historyReplayPending = null;
let historyDbPromise = null;
let historyEnabledCache = true;
let historyClearConfirmTimer = null;
let historyGroupView = null;
let historyGroupReturnScroll = 0;
let activeDownloadSession = null;

function installFooterSocialLinks() {
  const footer = document.querySelector('body > footer');
  if (!footer || footer.querySelector('.footer-socials')) return;

  const socials = document.createElement('div');
  socials.className = 'footer-socials';
  socials.setAttribute('aria-label', 'Redes sociais oficiais');
  socials.innerHTML = `
    <a href="https://www.instagram.com/codenoficial/" target="_blank" rel="noopener noreferrer" aria-label="Instagram CODEN OFICIAL">Instagram <strong>@codenoficial</strong></a>
    <span aria-hidden="true">•</span>
    <a href="https://www.tiktok.com/@codenoficialbr" target="_blank" rel="noopener noreferrer" aria-label="TikTok CODEN OFICIAL">TikTok <strong>@codenoficialbr</strong></a>
  `;
  footer.appendChild(socials);
}

installFooterSocialLinks();

function cloneAnalysisPayload(value) {
  if (typeof structuredClone === 'function') {
    try { return structuredClone(value); } catch (_) {}
  }
  return JSON.parse(JSON.stringify(value));
}

function canonicalAnalysisKey(rawUrl, mode = 'media') {
  try {
    const url = new URL(String(rawUrl || '').trim());
    url.hash = '';
    url.hostname = normalizeHost(url.hostname);
    const removable = new Set([
      'fbclid', 'gclid', 'igsh', 'igshid', 'si', 'feature', 'share_id',
      'sender_device', 'is_from_webapp', '_r', '_t', 'utm_source', 'utm_medium',
      'utm_campaign', 'utm_term', 'utm_content', 'utm_name', 'stkn',
    ]);
    [...url.searchParams.keys()].forEach((key) => {
      const lower = key.toLowerCase();
      if (lower.startsWith('utm_') || removable.has(lower)) url.searchParams.delete(key);
    });
    url.searchParams.sort();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
    return `${mode}:${url.toString()}`;
  } catch (_) {
    return `${mode}:${String(rawUrl || '').trim()}`;
  }
}

function pruneAnalysisCache() {
  const now = Date.now();
  for (const [key, entry] of analysisCache) {
    if (!entry || entry.expires <= now) analysisCache.delete(key);
  }
  while (analysisCache.size > ANALYSIS_CACHE_MAX_ITEMS) {
    analysisCache.delete(analysisCache.keys().next().value);
  }
}

function getCachedAnalysis(rawUrl, mode = 'media') {
  pruneAnalysisCache();
  const key = canonicalAnalysisKey(rawUrl, mode);
  const entry = analysisCache.get(key);
  if (!entry || entry.expires <= Date.now()) {
    analysisCache.delete(key);
    return null;
  }
  // Renova a ordem LRU sem prolongar o prazo de validade dos proxy_ids.
  analysisCache.delete(key);
  analysisCache.set(key, entry);
  return cloneAnalysisPayload(entry.data);
}

function setCachedAnalysis(rawUrl, mode, data) {
  if (!data || data.status !== 'ready') return;
  const key = canonicalAnalysisKey(rawUrl, mode);
  analysisCache.set(key, {
    expires: Date.now() + ANALYSIS_CACHE_TTL_MS,
    data: cloneAnalysisPayload(data),
  });
  pruneAnalysisCache();
}

function invalidateCachedAnalysis(rawUrl, mode = 'media') {
  if (!rawUrl) return;
  analysisCache.delete(canonicalAnalysisKey(rawUrl, mode));
}

async function postAnalysisJson(path, payload, fallbackMessage) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), ANALYSIS_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: controller.signal,
    });
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(data.error || fallbackMessage);
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('A análise demorou mais que o esperado. Tente novamente em instantes.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function requestExtraction(rawUrl, mode = 'media', fallbackMessage = 'Não foi possível analisar o link.') {
  const cached = getCachedAnalysis(rawUrl, mode);
  if (cached) return { data: cached, cached: true };
  const data = await postAnalysisJson('/api/worker', { url: rawUrl, mode }, fallbackMessage);
  setCachedAnalysis(rawUrl, mode, data);
  return { data, cached: false };
}

async function requestDirectResolution(rawUrl, fallbackMessage = 'Não foi possível analisar o link.') {
  return postAnalysisJson('/api/resolve', { url: rawUrl }, fallbackMessage);
}

function analysisLoadingCopy(validation, action = 'mídia') {
  const label = validation?.label || 'Link';
  return {
    title: `${label} reconhecido.`,
    detail: `Buscando ${action}, capa, título e informações disponíveis…`,
  };
}

function hasWorkerProxy(data) {
  if (!data || !['tiktok', 'youtube', 'bilibili'].includes(data.source)) return true;
  if (data.proxy_id) return true;
  const items = Array.isArray(data.items) ? data.items : [];
  return items.length > 0 && items.every((item) => item && item.proxy_id);
}

const yearElement = document.querySelector('#year');
if (yearElement) yearElement.textContent = new Date().getFullYear();

function openHistoryDatabase() {
  if (historyDbPromise) return historyDbPromise;
  if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB indisponível.'));

  historyDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(HISTORY_DB_NAME, HISTORY_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('downloads')) {
        db.createObjectStore('downloads', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Não foi possível abrir o histórico.'));
  });
  return historyDbPromise;
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Falha ao acessar o histórico.'));
  });
}

async function historyGetAll() {
  const db = await openHistoryDatabase();
  const store = db.transaction('downloads', 'readonly').objectStore('downloads');
  const items = await idbRequest(store.getAll());
  return items
    .filter((item) => item?.tool !== 'album' && item?.mode !== 'album')
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
}

async function historyPut(entry) {
  const db = await openHistoryDatabase();
  const store = db.transaction('downloads', 'readwrite').objectStore('downloads');
  await idbRequest(store.put(entry));
}

async function historyDelete(id) {
  const db = await openHistoryDatabase();
  const store = db.transaction('downloads', 'readwrite').objectStore('downloads');
  await idbRequest(store.delete(id));
}

async function historyClearAll() {
  const db = await openHistoryDatabase();
  const store = db.transaction('downloads', 'readwrite').objectStore('downloads');
  await idbRequest(store.clear());
}

async function historyGetEnabled() {
  const db = await openHistoryDatabase();
  const store = db.transaction('settings', 'readonly').objectStore('settings');
  const setting = await idbRequest(store.get('enabled'));
  return setting ? setting.value !== false : true;
}

async function historySetEnabled(enabled) {
  const db = await openHistoryDatabase();
  const store = db.transaction('settings', 'readwrite').objectStore('settings');
  await idbRequest(store.put({ key: 'enabled', value: Boolean(enabled) }));
  historyEnabledCache = Boolean(enabled);
}

function historyEntryMatches(a, b) {
  const aIsGroup = Array.isArray(a?.items) && a.items.length > 1;
  const bIsGroup = Array.isArray(b?.items) && b.items.length > 1;
  if (aIsGroup && bIsGroup) {
    return a.originalUrl === b.originalUrl && a.tool === b.tool;
  }
  return a.originalUrl === b.originalUrl &&
    a.tool === b.tool &&
    a.mode === b.mode &&
    Number(a.itemIndex ?? -1) === Number(b.itemIndex ?? -1) &&
    String(a.filename || '') === String(b.filename || '');
}

async function rememberHistoryEntry(entry) {
  if (!entry || !entry.originalUrl) return;
  try {
    historyEnabledCache = await historyGetEnabled();
    if (!historyEnabledCache) return;
    const current = await historyGetAll();
    const duplicate = current.find((item) => historyEntryMatches(item, entry));
    const saved = {
      ...entry,
      id: duplicate?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      createdAt: Date.now(),
    };
    await historyPut(saved);

    const refreshed = await historyGetAll();
    const overflow = refreshed.slice(HISTORY_MAX_ITEMS);
    await Promise.all(overflow.map((item) => historyDelete(item.id)));
    await refreshHistoryCount();
  } catch (_) {
    // O download continua normalmente mesmo se o navegador bloquear o histórico local.
  }
}

function platformLabelForSource(source) {
  const match = PLATFORM_RULES.find((rule) => rule.source === source);
  return match?.label || (source === 'direct' ? 'Link direto' : 'Mídia');
}

function historyTypeLabel(entry) {
  if (Array.isArray(entry?.items) && entry.items.length > 1) return `${entry.items.length} arquivos`;
  if (entry.mode === 'all') return `${entry.count || 0} arquivos`;
  if (entry.tool === 'thumbnail' || entry.mode === 'thumbnail') return 'Thumbnail';
  if (entry.tool === 'avatar' || entry.mode === 'avatar') return 'Avatar';
  if (entry.tool === 'mp3') return 'MP3';
  if (entry.tool === 'music') return entry.mode === 'mp3' ? 'Música • MP3' : 'Música';
  if (entry.mediaType === 'video') return 'Vídeo';
  if (entry.mediaType === 'image') return 'Foto';
  if (entry.mediaType === 'audio') return 'Áudio';
  return 'Arquivo';
}

function historyIconLabel(entry) {
  if (Array.isArray(entry?.items) && entry.items.length > 1) return 'LOTE';
  if (entry.mode === 'all') return 'LOTE';
  if (entry.tool === 'thumbnail' || entry.mode === 'thumbnail') return 'CAPA';
  if (entry.tool === 'avatar' || entry.mode === 'avatar') return 'AVT';
  if (entry.tool === 'mp3') return 'MP3';
  if (entry.tool === 'music') return 'MÚS';
  if (entry.mediaType === 'video') return 'VÍD';
  if (entry.mediaType === 'image') return 'FOTO';
  if (entry.mediaType === 'audio') return 'AUD';
  return 'ARQ';
}

function formatHistoryDate(timestamp) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return '';
  }
}


function historySnapshotForItem(data, index = 0) {
  const source = data?.source || 'direct';
  const mediaType = mediaTypeForDownload(data);
  const filename = data?.filename || `soft-download-${index + 1}`;
  const fallbackTitle = String(filename).replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  return {
    itemIndex: index,
    title: data?.title || fallbackTitle || `Mídia ${index + 1}`,
    artist: data?.artist || data?.uploader || data?.author || data?.channel || data?.creator || data?.username || '',
    thumbnail: data?.thumbnail || (mediaType === 'image' ? data?.url : '') || '',
    source,
    mediaType,
    filename,
  };
}

function buildHistoryEntry(data, options = {}) {
  const source = data?.source || 'direct';
  const mediaType = mediaTypeForDownload(data);
  const filename = options.filename || data?.filename || 'soft-download';
  const fallbackTitle = String(filename).replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  const author = data?.artist || data?.uploader || data?.author || data?.channel || data?.creator || data?.username || '';
  const thumbnail = data?.thumbnail || (mediaType === 'image' ? data?.url : '') || '';
  return {
    originalUrl: activeRequest.url,
    tool: activeRequest.tool,
    mode: options.mode || downloadLink.dataset.mode || 'single',
    itemIndex: Number.isInteger(options.itemIndex) ? options.itemIndex : -1,
    count: Number(options.count || 0),
    items: Array.isArray(options.items) ? options.items : undefined,
    title: data?.title || fallbackTitle || `Conteúdo do ${platformLabelForSource(source)}`,
    artist: author,
    thumbnail,
    source,
    mediaType,
    filename,
  };
}

async function refreshHistoryCount() {
  try {
    const items = await historyGetAll();
    historyCountBadges.forEach((badge) => {
      badge.textContent = String(items.length);
      badge.hidden = items.length === 0;
    });
  } catch (_) {
    historyCountBadges.forEach((badge) => { badge.hidden = true; });
  }
}

function showHistoryFeedback(message, isError = false) {
  if (!historyFeedback) return;
  historyFeedback.hidden = !message;
  historyFeedback.textContent = message || '';
  historyFeedback.classList.toggle('is-error', isError);
}

function closeHistoryGroup(restoreScroll = true) {
  if (historyGroupView) {
    historyGroupView.remove();
    historyGroupView = null;
  }
  historyScreen?.classList.remove('has-group-open');
  if (restoreScroll && historyScreen) {
    historyScreen.scrollTop = historyGroupReturnScroll;
  }
}

function openHistoryGroup(entry) {
  const storedItems = Array.isArray(entry?.items) ? entry.items : [];
  if (!storedItems.length || !historyScreen) {
    showHistoryFeedback('Este registro antigo não possui as mídias salvas. Baixe o carrossel novamente para visualizar os arquivos aqui.', true);
    return;
  }

  closeHistoryGroup(false);
  historyGroupReturnScroll = historyScreen.scrollTop;
  const panel = document.createElement('section');
  panel.className = 'history-group-view';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', `${storedItems.length} arquivos do histórico`);

  const shell = document.createElement('div');
  shell.className = 'history-group-shell';

  const header = document.createElement('div');
  header.className = 'history-group-header';

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'history-group-back';
  back.textContent = '← Voltar';
  back.addEventListener('click', () => closeHistoryGroup());

  const heading = document.createElement('div');
  heading.className = 'history-group-heading';
  const title = document.createElement('strong');
  title.textContent = entry.title || 'Publicação';
  const count = document.createElement('span');
  count.textContent = `${storedItems.length} arquivos`;
  heading.append(title, count);
  header.append(back, heading);

  const grid = document.createElement('div');
  grid.className = 'carousel-grid history-group-grid';

  storedItems.forEach((item, index) => {
    const tile = document.createElement('article');
    tile.className = 'carousel-tile history-group-tile';

    const mediaFrame = document.createElement('div');
    mediaFrame.className = 'carousel-media-frame';

    const thumbnail = String(item.thumbnail || '').trim();
    if (thumbnail) {
      const image = document.createElement('img');
      image.src = thumbnail;
      image.alt = item.title ? `Prévia de ${item.title}` : `Mídia ${index + 1}`;
      image.loading = 'lazy';
      image.addEventListener('error', () => {
        const fallback = document.createElement('div');
        fallback.className = 'history-item-fallback';
        fallback.textContent = historyIconLabel({ ...entry, ...item });
        image.replaceWith(fallback);
      }, { once: true });
      mediaFrame.append(image);
    } else {
      const fallback = document.createElement('div');
      fallback.className = 'history-item-fallback';
      fallback.textContent = historyIconLabel({ ...entry, ...item });
      mediaFrame.append(fallback);
    }
    tile.append(mediaFrame);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tile-download';
    button.textContent = '↓';
    button.title = `Baixar mídia ${index + 1} novamente`;
    button.setAttribute('aria-label', `Baixar mídia ${index + 1} novamente`);
    button.addEventListener('click', () => replayHistoryEntry({
      ...entry,
      mode: 'carousel-item',
      itemIndex: Number.isInteger(item.itemIndex) ? item.itemIndex : index,
      filename: item.filename || entry.filename,
    }));

    tile.append(button);
    grid.append(tile);
  });

  const all = document.createElement('button');
  all.type = 'button';
  all.className = 'history-group-all';
  all.textContent = 'BAIXAR TODOS NOVAMENTE';
  all.addEventListener('click', () => replayHistoryEntry({ ...entry, mode: 'all' }));

  shell.append(header, grid, all);
  panel.append(shell);
  historyScreen.append(panel);
  historyGroupView = panel;
  historyScreen.classList.add('has-group-open');
  historyScreen.scrollTop = 0;
  requestAnimationFrame(() => back.focus({ preventScroll: true }));
}

async function renderHistory() {
  if (!historyList || !historyEmpty) return;
  historyList.replaceChildren();
  try {
    historyEnabledCache = await historyGetEnabled();
    if (historyEnabled) historyEnabled.checked = historyEnabledCache;
    if (historyPrivacy) {
      historyPrivacy.textContent = historyEnabledCache
        ? 'Nada é enviado para servidor, conta ou banco de dados online. Limpar os dados do site/aplicativo também remove este histórico.'
        : 'Histórico desativado. Novos downloads não serão salvos neste dispositivo.';
    }

    const items = await historyGetAll();
    historyEmpty.hidden = items.length !== 0;

    items.forEach((entry) => {
      const card = document.createElement('article');
      card.className = 'history-item';

      // Usa o mesmo bloco quadrado do carrossel já existente no SOFT.
      const media = document.createElement('div');
      media.className = 'history-item-media carousel-tile';

      const addFallback = () => {
        media.replaceChildren();
        const fallback = document.createElement('div');
        fallback.className = 'history-item-fallback';
        fallback.textContent = historyIconLabel(entry);
        media.append(fallback);
      };

      const thumbnail = String(entry.thumbnail || '').trim();
      if (thumbnail) {
        const image = document.createElement('img');
        image.src = thumbnail;
        image.alt = entry.title ? `Capa de ${entry.title}` : 'Capa do download';
        image.loading = 'lazy';
        image.addEventListener('error', addFallback, { once: true });
        media.append(image);
      } else {
        addFallback();
      }

      const copy = document.createElement('div');
      copy.className = 'history-item-copy';

      const title = document.createElement('strong');
      title.className = 'history-item-title';
      title.textContent = entry.title || 'Download';
      copy.append(title);

      if (entry.artist) {
        const author = document.createElement('span');
        author.className = 'history-item-author';
        author.textContent = entry.artist;
        copy.append(author);
      }

      const meta = document.createElement('div');
      meta.className = 'history-item-meta';
      const metadata = [
        platformLabelForSource(entry.source),
        historyTypeLabel(entry),
      ];
      metadata.filter(Boolean).forEach((value) => {
        const span = document.createElement('span');
        span.textContent = value;
        meta.append(span);
      });
      copy.append(meta);

      const date = document.createElement('span');
      date.className = 'history-item-date';
      date.textContent = formatHistoryDate(entry.createdAt);
      copy.append(date);

      const actions = document.createElement('div');
      actions.className = 'history-item-actions';

      const again = document.createElement('button');
      again.type = 'button';
      again.className = 'history-action';
      if (Array.isArray(entry.items) && entry.items.length > 1) {
        again.textContent = `VER ${entry.items.length} ARQUIVOS`;
        again.addEventListener('click', () => openHistoryGroup(entry));
      } else {
        again.textContent = 'BAIXAR NOVAMENTE';
        again.addEventListener('click', () => replayHistoryEntry(entry));
      }

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'history-delete';
      remove.textContent = 'EXCLUIR';
      remove.setAttribute('aria-label', `Excluir ${entry.title || 'download'} do histórico`);
      remove.addEventListener('click', async () => {
        remove.disabled = true;
        try {
          await historyDelete(entry.id);
          await renderHistory();
          await refreshHistoryCount();
          showHistoryFeedback('Item excluído do histórico.');
        } catch (_) {
          remove.disabled = false;
          showHistoryFeedback('Não foi possível excluir este item.', true);
        }
      });

      actions.append(again, remove);
      card.append(media, copy, actions);
      historyList.append(card);
    });
  } catch (_) {
    historyEmpty.hidden = true;
    if (historyEnabled) historyEnabled.disabled = true;
    if (historyClear) historyClear.disabled = true;
    showHistoryFeedback('O histórico local não está disponível neste navegador.', true);
  }
}

function closeMobileMenu() {
  if (!mobileMenu || !mobileMenuToggle) return;
  mobileMenu.classList.remove('is-open');
  if (sidebarBackdrop) sidebarBackdrop.hidden = true;
  mobileMenuToggle.setAttribute('aria-expanded', 'false');
  mobileMenuToggle.setAttribute('aria-label', 'Abrir menu');
}

function currentTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function applyTheme(theme, persist = true) {
  const next = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  themeToggles.forEach((button) => {
    button.setAttribute('aria-label', next === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro');
    button.classList.toggle('is-light-theme', next === 'light');
  });
  themeLabels.forEach((label) => {
    label.textContent = next === 'dark' ? 'Tema claro' : 'Tema escuro';
  });
  if (persist) {
    try { localStorage.setItem('soft-theme', next); } catch (_) {}
  }
}

applyTheme(currentTheme(), false);
themeToggles.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });
});

function openHistoryScreen() {
  closeMobileMenu();
  historyReturnHash = activeSectionHash === '#historico' ? '#midias' : activeSectionHash;
  historyScreen.hidden = false;
  document.body.classList.add('history-screen-open');
  setSectionHash('#historico');
  showHistoryFeedback('');
  renderHistory();
  requestAnimationFrame(() => historyBack?.focus({ preventScroll: true }));
}

function closeHistoryScreen() {
  const wasOpen = Boolean(historyScreen && !historyScreen.hidden);
  closeHistoryGroup();
  historyScreen.hidden = true;
  document.body.classList.remove('history-screen-open');
  if (wasOpen) setSectionHash(historyReturnHash || '#midias');
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

function historyFormForTool(tool) {
  if (tool === 'pinterest') return { form: pinterestForm, input: pinterestInput, note: pinterestNote, defaultNote: DEFAULT_PINTEREST_NOTE, sync: syncPinterestClearButton };
  if (tool === 'mp3') return { form: mp3Form, input: mp3Input, note: mp3Note, defaultNote: DEFAULT_MP3_NOTE, sync: syncMp3ClearButton };
  if (tool === 'music') return { form: musicForm, input: musicInput, note: musicNote, defaultNote: DEFAULT_MUSIC_NOTE, sync: syncMusicClearButton };
  if (tool === 'thumbnail') return { form: thumbnailForm, input: thumbnailInput, note: thumbnailNote, defaultNote: DEFAULT_THUMBNAIL_NOTE, sync: syncThumbnailClearButton };
  if (tool === 'avatar') return { form: avatarForm, input: avatarInput, note: avatarNote, defaultNote: DEFAULT_AVATAR_NOTE, sync: syncAvatarClearButton };
  return { form, input, note, defaultNote: DEFAULT_NOTE, sync: syncClearButton };
}

function replayHistoryEntry(entry) {
  if (!entry?.originalUrl) return;
  const tool = ['media', 'pinterest', 'mp3', 'music', 'thumbnail', 'avatar'].includes(entry.tool) ? entry.tool : 'media';
  const target = historyFormForTool(tool);
  historyReplayPending = entry;
  closeHistoryScreen();
  setActiveTool(tool);
  target.input.value = entry.originalUrl;
  target.sync();
  updateLiveValidation(target.input, target.note, target.defaultNote, tool);
  window.scrollTo({ top: 0, behavior: 'auto' });
  window.setTimeout(() => target.form.requestSubmit(), 120);
}

function maybeReplayHistoryDownload() {
  const pending = historyReplayPending;
  if (!pending || pending.originalUrl !== activeRequest.url || pending.tool !== activeRequest.tool) return;
  historyReplayPending = null;

  window.setTimeout(() => {
    if (pending.mode === 'all') {
      downloadAllMedia(activeResultItems, downloadLink);
      return;
    }
    if (pending.mode === 'carousel-item') {
      const index = Math.max(0, Number(pending.itemIndex || 0));
      const item = activeResultItems[index] || activeResultItems[0];
      if (!item) return;
      const mediaUrl = proxyMediaUrl(item.url, item.source, item.proxy_id, true);
      const groupSnapshots = activeResultItems.map((media, itemIndex) => historySnapshotForItem(media, itemIndex));
      downloadMedia(mediaUrl, item.filename || pending.filename || 'soft-download', downloadLink,
        buildHistoryEntry(item, {
          mode: 'carousel-item',
          itemIndex: index,
          filename: item.filename,
          count: groupSnapshots.length,
          items: groupSnapshots.length > 1 ? groupSnapshots : pending.items,
        }));
      return;
    }

    downloadLink.click();
  }, 220);
}

if (mobileMenuToggle && mobileMenu) {
  mobileMenuToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const willOpen = !mobileMenu.classList.contains('is-open');
    mobileMenu.classList.toggle('is-open', willOpen);
    if (sidebarBackdrop) sidebarBackdrop.hidden = !willOpen;
    mobileMenuToggle.setAttribute('aria-expanded', String(willOpen));
    mobileMenuToggle.setAttribute('aria-label', willOpen ? 'Fechar menu' : 'Abrir menu');
  });
  mobileMenu.addEventListener('click', (event) => event.stopPropagation());
  mobileMenu.querySelectorAll('a[data-sidebar-close]').forEach((link) => link.addEventListener('click', closeMobileMenu));
  sidebarBackdrop?.addEventListener('click', closeMobileMenu);
}

historyOpenButtons.forEach((button) => button.addEventListener('click', openHistoryScreen));
historyBack?.addEventListener('click', closeHistoryScreen);

historyEnabled?.addEventListener('change', async () => {
  try {
    await historySetEnabled(historyEnabled.checked);
    if (historyPrivacy) {
      historyPrivacy.textContent = historyEnabled.checked
        ? 'Nada é enviado para servidor, conta ou banco de dados online. Limpar os dados do site/aplicativo também remove este histórico.'
        : 'Histórico desativado. Novos downloads não serão salvos neste dispositivo.';
    }
    showHistoryFeedback(historyEnabled.checked
      ? 'Histórico ativado neste dispositivo.'
      : 'Histórico desativado. Os itens existentes continuam aqui até você excluí-los.');
  } catch (_) {
    historyEnabled.checked = historyEnabledCache;
    showHistoryFeedback('Não foi possível alterar esta configuração.', true);
  }
});

historyClear?.addEventListener('click', async () => {
  if (!historyClear.classList.contains('is-confirming')) {
    historyClear.classList.add('is-confirming');
    historyClear.textContent = 'Confirmar limpeza';
    clearTimeout(historyClearConfirmTimer);
    historyClearConfirmTimer = window.setTimeout(() => {
      historyClear.classList.remove('is-confirming');
      historyClear.textContent = 'Limpar histórico';
    }, 4500);
    return;
  }

  clearTimeout(historyClearConfirmTimer);
  historyClear.disabled = true;
  try {
    await historyClearAll();
    historyClear.classList.remove('is-confirming');
    historyClear.textContent = 'Limpar histórico';
    await renderHistory();
    await refreshHistoryCount();
    showHistoryFeedback('Histórico apagado deste dispositivo.');
  } catch (_) {
    showHistoryFeedback('Não foi possível limpar o histórico.', true);
  } finally {
    historyClear.disabled = false;
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && historyGroupView) {
    closeHistoryGroup();
    return;
  }
  if (event.key === 'Escape' && historyScreen && !historyScreen.hidden) closeHistoryScreen();
  if (event.key === 'Escape' && mobileMenu?.classList.contains('is-open')) closeMobileMenu();
});

(async () => {
  try {
    historyEnabledCache = await historyGetEnabled();
    if (historyEnabled) historyEnabled.checked = historyEnabledCache;
    await refreshHistoryCount();
  } catch (_) {
    historyCountBadges.forEach((badge) => { badge.hidden = true; });
  }
})();

function normalizeHost(hostname) {
  return String(hostname || '').toLowerCase().replace(/^www\./, '');
}

function matchPlatform(hostname) {
  const host = normalizeHost(hostname);
  return PLATFORM_RULES.find(({ hosts }) =>
    hosts.some((candidate) => host === candidate || host.endsWith(`.${candidate}`))
  ) || null;
}

function directExtension(url) {
  const filename = String(url?.pathname || '').split('/').pop() || '';
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : '';
}

function normalizeInstagramProfileInput(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return { empty: true, valid: false };

  const usernamePattern = /^[A-Za-z0-9._]{1,30}$/;
  const reserved = new Set(['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'direct', 'about', 'developer', 'privacy', 'legal']);
  let username = '';

  if (raw.startsWith('@')) {
    username = raw.slice(1).trim();
  } else if (usernamePattern.test(raw)) {
    username = raw;
  } else {
    let value = raw;
    if (/^(?:www\.)?instagram\.com\//i.test(value)) value = `https://${value}`;
    let url;
    try {
      url = new URL(value);
    } catch {
      return {
        valid: false,
        title: 'PERFIL INVÁLIDO',
        message: 'Digite @usuario ou cole um link de perfil do Instagram.',
      };
    }
    const host = normalizeHost(url.hostname);
    if (!(host === 'instagram.com' || host.endsWith('.instagram.com'))) {
      return {
        valid: false,
        title: 'PERFIL NÃO COMPATÍVEL',
        message: 'A opção Avatar está disponível somente para perfis do Instagram.',
      };
    }
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length !== 1) {
      return {
        valid: false,
        title: 'LINK DE PERFIL NECESSÁRIO',
        message: 'Cole o link do perfil, não o link de uma publicação, Reel ou Story.',
      };
    }
    username = parts[0];
  }

  username = String(username || '').replace(/^@+/, '').trim();
  if (!usernamePattern.test(username) || reserved.has(username.toLowerCase())) {
    return {
      valid: false,
      title: 'PERFIL INVÁLIDO',
      message: 'Informe um @ válido do Instagram ou o link direto do perfil.',
    };
  }

  return {
    valid: true,
    source: 'instagram',
    label: `@${username}`,
    username,
    url: `https://www.instagram.com/${username}/`,
  };
}


function normalizePinterestProfileInput(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return { empty: true, valid: false };

  let username = '';

  if (raw.includes('://')) {
    let url;
    try {
      url = new URL(raw);
    } catch {
      return {
        valid: false,
        title: 'PERFIL INVÁLIDO',
        message: 'Informe um usuário, @ ou link válido do perfil do Pinterest.',
      };
    }

    const host = normalizeHost(url.hostname);
    if (host !== 'pinterest.com' && !host.endsWith('.pinterest.com')) {
      return {
        valid: false,
        title: 'PERFIL DO PINTEREST NECESSÁRIO',
        message: 'Use um usuário ou link de perfil do Pinterest.',
      };
    }

    const parts = url.pathname.split('/').filter(Boolean);
    const reserved = new Set(['pin', 'ideas', 'search', 'today', 'explore', 'business', 'settings', 'login', 'signup']);
    username = String(parts[0] || '').replace(/^@+/, '').trim();

    if (
      !username ||
      reserved.has(username.toLowerCase()) ||
      (parts.length > 1 && !['_created', 'created'].includes(String(parts[1] || '').toLowerCase()))
    ) {
      return {
        valid: false,
        title: 'LINK DE PERFIL NECESSÁRIO',
        message: 'Use o perfil do Pinterest ou a área CRIADOS, não um Pin ou pasta.',
      };
    }
  } else {
    username = raw.replace(/^@+/, '').trim();
  }

  if (!/^[A-Za-z0-9._-]{1,80}$/.test(username)) {
    return {
      valid: false,
      title: 'PERFIL INVÁLIDO',
      message: 'Informe um usuário válido do Pinterest.',
    };
  }

  return {
    valid: true,
    source: 'pinterest',
    label: `Pinterest @${username}`,
    username,
    kind: 'pinterest-profile',
    url: `https://www.pinterest.com/${username}/_created/`,
  };
}

function validateUrlForTool(rawValue, tool) {
  const value = String(rawValue || '').trim();
  if (!value) return { empty: true, valid: false };

  if (tool === 'avatar') return normalizeInstagramProfileInput(value);
  if (tool === 'pinterest') return normalizePinterestProfileInput(value);

  let url;
  try {
    url = new URL(value);
  } catch {
    return {
      valid: false,
      title: 'LINK INVÁLIDO',
      message: 'Insira um link completo, começando com http:// ou https://.',
    };
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    return {
      valid: false,
      title: 'LINK INVÁLIDO',
      message: 'Use um link público http:// ou https://, sem usuário ou senha no endereço.',
    };
  }

  const platform = matchPlatform(url.hostname);

  const extension = directExtension(url);
  const isDirectMedia = DIRECT_MEDIA_EXTENSIONS.has(extension);
  const isDirectVideo = DIRECT_VIDEO_EXTENSIONS.has(extension);
  const isDirectAudio = DIRECT_AUDIO_EXTENSIONS.has(extension);

  if (!platform && !isDirectMedia && !isDirectAudio) {
    return {
      valid: false,
      title: 'PLATAFORMA NÃO COMPATÍVEL',
      message: 'Este site ainda não é compatível com o SOFT Downloaders.',
    };
  }

  if (platform?.source === 'kick' && !url.pathname.toLowerCase().includes('/clips/')) {
    return {
      valid: false,
      title: 'LINK DA KICK NÃO COMPATÍVEL',
      message: 'No momento, a Kick é compatível somente com Clips públicos.',
    };
  }

  if (tool === 'media') {
    if (platform && ['soundcloud', 'bandcamp', 'audius', 'bandlab'].includes(platform.source)) {
      return {
        valid: false,
        title: 'USE A OPÇÃO MÚSICAS',
        message: `Este link é do ${platform.label}. Abra Músicas para analisar esse conteúdo.`,
      };
    }
    if (!platform && isDirectAudio) {
      return {
        valid: false,
        title: 'USE A OPÇÃO MÚSICAS',
        message: 'Este link aponta para um arquivo de áudio. Abra Músicas para continuar.',
      };
    }
    if (platform && !MEDIA_SOURCES.has(platform.source)) {
      return {
        valid: false,
        title: 'PLATAFORMA NÃO COMPATÍVEL',
        message: 'Esta plataforma não está disponível na área Mídias.',
      };
    }
  }

  if (tool === 'mp3') {
    if (platform && ['soundcloud', 'bandcamp', 'audius', 'bandlab'].includes(platform.source)) {
      return {
        valid: false,
        title: 'USE A OPÇÃO MÚSICAS',
        message: `Este link é do ${platform.label}. Abra Músicas para baixar o áudio.`,
      };
    }
    if (!platform && !isDirectVideo) {
      return {
        valid: false,
        title: 'LINK DE VÍDEO NECESSÁRIO',
        message: 'Vídeo para MP3 aceita links de vídeo compatíveis ou arquivos diretos de vídeo.',
      };
    }
    if (platform && !MP3_VIDEO_SOURCES.has(platform.source)) {
      return {
        valid: false,
        title: 'PLATAFORMA NÃO COMPATÍVEL',
        message: 'Esta plataforma não está disponível em Vídeo para MP3.',
      };
    }
  }

  if (tool === 'music') {
    if (!platform && !isDirectAudio) {
      return {
        valid: false,
        title: 'LINK DE MÚSICA NÃO COMPATÍVEL',
        message: 'Use YouTube, SoundCloud, Bandcamp, Audius, BandLab ou um link direto de áudio.',
      };
    }
    if (platform && !MUSIC_TOOL_SOURCES.has(platform.source)) {
      return {
        valid: false,
        title: 'PLATAFORMA NÃO COMPATÍVEL',
        message: 'Esta plataforma não está disponível na área Músicas.',
      };
    }
  }

  if (tool === 'thumbnail') {
    if (!platform || !THUMBNAIL_TOOL_SOURCES.has(platform.source)) {
      return {
        valid: false,
        title: 'THUMBNAIL NÃO COMPATÍVEL',
        message: 'Baixar Thumbnail está disponível somente para YouTube, Twitch, Kick e Dailymotion.',
      };
    }
  }

  return {
    valid: true,
    source: platform?.source || 'direct',
    label: platform?.label || 'link direto',
  };
}

function updateLiveValidation(inputElement, noteElement, defaultMessage, tool) {
  const validation = validateUrlForTool(inputElement.value, tool);
  if (validation.empty) {
    if (tool === 'media') closeYoutubeWebViewMenu();
    noteElement.hidden = false;
    noteElement.className = 'form-note';
    noteElement.textContent = defaultMessage;
    return validation;
  }
  if (!validation.valid) {
    if (tool === 'media') closeYoutubeWebViewMenu();
    noteElement.hidden = false;
    noteElement.className = 'form-note error';
    noteElement.textContent = `${validation.title}: ${validation.message}`;
    return validation;
  }
  if (tool === 'media') closeYoutubeWebViewMenu();
  noteElement.className = 'form-note success';
  noteElement.textContent = tool === 'avatar'
    ? `Perfil reconhecido (${validation.label}). Pronto para buscar o avatar.`
    : validation.kind === 'pinterest-profile'
      ? `Perfil reconhecido (${validation.label}). Serão buscados somente os Pins criados.`
      : `Link reconhecido (${validation.label}). Pronto para analisar.`;
  return validation;
}

function validateBeforeSubmit(inputElement, noteElement, defaultMessage, tool) {
  const validation = updateLiveValidation(inputElement, noteElement, defaultMessage, tool);
  if (validation.empty) {
    noteElement.className = 'form-note error';
    noteElement.textContent = tool === 'avatar'
      ? 'PERFIL AUSENTE: Digite um @ ou cole o link do perfil para continuar.'
      : 'LINK AUSENTE: Cole um link para continuar.';
    return null;
  }
  return validation.valid ? validation : null;
}

function classifyResultError(message) {
  const original = String(message || '').trim();
  const normalized = original.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const contentProcessingError = {
    title: 'NÃO FOI POSSÍVEL PROCESSAR',
    message: 'Verifique se o link está correto e se o conteúdo está público e acessível. Restrições da plataforma, como login obrigatório, limite de idade, conteúdo privado ou indisponível, podem impedir o processamento.',
  };

  if (!original || normalized.includes('failed to fetch') || normalized.includes('networkerror') || normalized.includes('load failed')) {
    return {
      title: 'SERVIÇO INDISPONÍVEL',
      message: 'Não foi possível conectar ao serviço de processamento. Verifique sua conexão e tente novamente em instantes.',
    };
  }
  if (normalized.includes('link valido') || normalized.includes('link publico http') || normalized.includes('endereco nao pode')) {
    return { title: 'LINK INVÁLIDO', message: original };
  }
  if (normalized.includes('nao e compativel') || normalized.includes('nao parece ser') || normalized.includes('somente com clips') || normalized.includes('plataforma compativel')) {
    return { title: 'CONTEÚDO NÃO COMPATÍVEL', message: original };
  }
  if (normalized.includes('expirou') || normalized.includes('analise a publicacao novamente') || normalized.includes('analise o video novamente')) {
    return { title: 'LINK EXPIRADO', message: original };
  }
  if (normalized.includes('tente novamente em instantes')) {
    return { title: 'FALHA TEMPORÁRIA', message: original };
  }
  if (
    normalized.includes('confirme se a publicacao e publica') ||
    normalized.includes('confirme se ela e publica') ||
    normalized.includes('exige autentic') ||
    normalized.includes('exigir login') ||
    normalized.includes('conteudo privado') ||
    normalized.includes('publicacao privada') ||
    normalized.includes('restricao de idade') ||
    normalized.includes('limite de idade')
  ) {
    return contentProcessingError;
  }
  if (normalized.includes('nao encontramos') || normalized.includes('nao disponibilizou')) {
    return { title: 'MÍDIA NÃO ENCONTRADA', message: original };
  }
  if (normalized.includes('preparar') || normalized.includes('gerar o mp3') || normalized.includes('conversao')) {
    return { title: 'FALHA AO PREPARAR O ARQUIVO', message: original };
  }
  if (normalized.includes('nao foi possivel ler') || normalized.includes('nao foi possivel analisar') || normalized.includes('nao foi possivel processar') || normalized.includes('agora')) {
    return contentProcessingError;
  }
  return { title: 'NÃO FOI POSSÍVEL CONCLUIR', message: original || 'Ocorreu um erro inesperado. Tente novamente.' };
}

function syncClearButton() {
  if (clearButton) clearButton.hidden = !input.value.trim();
}

function syncPinterestClearButton() {
  if (pinterestClearButton) pinterestClearButton.hidden = !pinterestInput.value.trim();
}

function syncMp3ClearButton() {
  if (mp3ClearButton) mp3ClearButton.hidden = !mp3Input.value.trim();
}

function syncMusicClearButton() {
  if (musicClearButton) musicClearButton.hidden = !musicInput.value.trim();
}

function syncThumbnailClearButton() {
  if (thumbnailClearButton) thumbnailClearButton.hidden = !thumbnailInput.value.trim();
}

function syncAvatarClearButton() {
  if (avatarClearButton) avatarClearButton.hidden = !avatarInput.value.trim();
}

const TOOL_SECTION_HASH = {
  media: '#midias',
  youtubeSearch: '#pesquisar-youtube',
  pinterest: '#pinterest-massa',
  mp3: '#video-para-mp3',
  music: '#musicas',
  thumbnail: '#thumbnail',
  avatar: '#avatar',
  photosPdf: '#fotos-para-pdf',
  create: '#criar',
};

const VIEW_SECTION_HASH = {
  how: '#como-funciona',
  compatibility: '#compatibilidade',
  app: '#aplicativo',
  help: '#ajuda',
  info: '#informacoes-importantes',
};

let activeSectionHash = '#midias';
let historyReturnHash = '#midias';

function setSectionHash(hash) {
  if (!hash || !hash.startsWith('#')) return;
  activeSectionHash = hash;
  if (window.location.hash !== hash) {
    window.history.replaceState(null, '', hash);
  }
}

function showAppView(view = 'tool') {
  const target = view || 'tool';
  if (target !== 'tool') {
    document.body.classList.remove('create-chat-active');
    document.body.classList.remove('photos-pdf-active');
  }
  appViews.forEach((section) => {
    section.hidden = section.dataset.appView !== target;
  });
  if (siteNotice) siteNotice.hidden = target !== 'tool';
  viewLinks.forEach((link) => {
    link.classList.toggle('is-active', link.dataset.viewTarget === target && target !== 'tool');
  });
  if (target !== 'tool') {
    [mediaTab, youtubeSearchTab, pinterestTab, mp3Tab, musicTab, thumbnailTab, avatarTab, photosPdfTab, createTab].forEach((tab) => tab?.classList.remove('is-active'));
  }
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

function setActiveTool(tool) {
  // A Pesquisa YouTube existe somente dentro do WebApp oficial.
  // Se algum navegador tentar abrir a ferramenta diretamente, volta para Mídias.
  if (tool === 'youtubeSearch' && !isOfficialSoftAndroidApp()) tool = 'media';

  showAppView('tool');
  const useMedia = tool === 'media';
  const useYoutubeSearch = tool === 'youtubeSearch';
  const usePinterest = tool === 'pinterest';
  const useMp3 = tool === 'mp3';
  const useMusic = tool === 'music';
  const useThumbnail = tool === 'thumbnail';
  const useAvatar = tool === 'avatar';
  const usePhotosPdf = tool === 'photosPdf';
  const useCreate = tool === 'create';
  document.body.classList.toggle('create-chat-active', useCreate);
  document.body.classList.toggle('photos-pdf-active', usePhotosPdf);
  // O aviso vermelho fala especificamente sobre links públicos.
  // Exibe somente nas ferramentas cujo fluxo principal depende de um link.
  const showLinkNotice = useMedia || useMp3 || useMusic || useThumbnail;
  if (siteNotice) siteNotice.hidden = !showLinkNotice;
  mediaTab.classList.toggle('is-active', useMedia);
  youtubeSearchTab.classList.toggle('is-active', useYoutubeSearch);
  pinterestTab.classList.toggle('is-active', usePinterest);
  mp3Tab.classList.toggle('is-active', useMp3);
  musicTab.classList.toggle('is-active', useMusic);
  thumbnailTab.classList.toggle('is-active', useThumbnail);
  avatarTab.classList.toggle('is-active', useAvatar);
  photosPdfTab.classList.toggle('is-active', usePhotosPdf);
  createTab.classList.toggle('is-active', useCreate);
  mediaTab.setAttribute('aria-selected', String(useMedia));
  youtubeSearchTab.setAttribute('aria-selected', String(useYoutubeSearch));
  pinterestTab.setAttribute('aria-selected', String(usePinterest));
  mp3Tab.setAttribute('aria-selected', String(useMp3));
  musicTab.setAttribute('aria-selected', String(useMusic));
  thumbnailTab.setAttribute('aria-selected', String(useThumbnail));
  avatarTab.setAttribute('aria-selected', String(useAvatar));
  photosPdfTab.setAttribute('aria-selected', String(usePhotosPdf));
  createTab.setAttribute('aria-selected', String(useCreate));
  mediaToolPanel.hidden = !useMedia;
  youtubeSearchToolPanel.hidden = !useYoutubeSearch;
  pinterestToolPanel.hidden = !usePinterest;
  mp3ToolPanel.hidden = !useMp3;
  musicToolPanel.hidden = !useMusic;
  thumbnailToolPanel.hidden = !useThumbnail;
  avatarToolPanel.hidden = !useAvatar;
  photosPdfToolPanel.hidden = !usePhotosPdf;
  createToolPanel.hidden = !useCreate;
  setSectionHash(TOOL_SECTION_HASH[tool] || '#midias');
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

function activateToolFromMenu(tool) {
  setActiveTool(tool);
  closeMobileMenu();
  window.scrollTo({ top: 0, behavior: 'auto' });
}

// Pesquisa YouTube: mostra o item do menu somente no WebApp oficial.
// Usamos a ponte SoftAndroid em vez de tamanho de tela/UA para não liberar
// o recurso no Chrome, Edge ou outro navegador móvel.
if (youtubeSearchTab) {
  const youtubeSearchAvailable = isOfficialSoftAndroidApp();
  youtubeSearchTab.hidden = !youtubeSearchAvailable;
  youtubeSearchTab.style.display = youtubeSearchAvailable ? '' : 'none';
}
if (!isOfficialSoftAndroidApp() && youtubeSearchToolPanel) {
  youtubeSearchToolPanel.hidden = true;
}

// O convite para instalar o app existe somente no site.
// Dentro do WebApp oficial ele desaparece por completo.
if (homeAppPromo) {
  homeAppPromo.hidden = isOfficialSoftAndroidApp();
}

mediaTab.addEventListener('click', () => activateToolFromMenu('media'));
youtubeSearchTab?.addEventListener('click', () => activateToolFromMenu('youtubeSearch'));
pinterestTab.addEventListener('click', () => activateToolFromMenu('pinterest'));
mp3Tab.addEventListener('click', () => activateToolFromMenu('mp3'));
musicTab.addEventListener('click', () => activateToolFromMenu('music'));
thumbnailTab.addEventListener('click', () => activateToolFromMenu('thumbnail'));
avatarTab.addEventListener('click', () => activateToolFromMenu('avatar'));
photosPdfTab.addEventListener('click', () => activateToolFromMenu('photosPdf'));
createTab.addEventListener('click', () => activateToolFromMenu('create'));

viewLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    const view = link.dataset.viewTarget || 'tool';
    const tool = link.dataset.toolTarget;
    if (view === 'tool' && tool) {
      setActiveTool(tool);
    } else {
      showAppView(view);
      setSectionHash(VIEW_SECTION_HASH[view] || '#midias');
    }
    closeMobileMenu();
    window.scrollTo({ top: 0, behavior: 'auto' });
  });
});

input.addEventListener('input', () => {
  syncClearButton();
  updateLiveValidation(input, note, DEFAULT_NOTE, 'media');
});
pinterestInput.addEventListener('input', () => {
  syncPinterestClearButton();
  updateLiveValidation(pinterestInput, pinterestNote, DEFAULT_PINTEREST_NOTE, 'pinterest');
});
mp3Input.addEventListener('input', () => {
  syncMp3ClearButton();
  updateLiveValidation(mp3Input, mp3Note, DEFAULT_MP3_NOTE, 'mp3');
});
musicInput.addEventListener('input', () => {
  syncMusicClearButton();
  updateLiveValidation(musicInput, musicNote, DEFAULT_MUSIC_NOTE, 'music');
});
thumbnailInput.addEventListener('input', () => {
  syncThumbnailClearButton();
  updateLiveValidation(thumbnailInput, thumbnailNote, DEFAULT_THUMBNAIL_NOTE, 'thumbnail');
});
avatarInput.addEventListener('input', () => {
  syncAvatarClearButton();
  updateLiveValidation(avatarInput, avatarNote, DEFAULT_AVATAR_NOTE, 'avatar');
});

document.querySelector('#pasteButton').addEventListener('click', async () => {
  try {
    input.value = await navigator.clipboard.readText();
    syncClearButton();
    updateLiveValidation(input, note, DEFAULT_NOTE, 'media');
    input.focus();
  } catch {
    input.focus();
  }
});

document.querySelector('#pinterestPasteButton').addEventListener('click', async () => {
  try {
    pinterestInput.value = await navigator.clipboard.readText();
    syncPinterestClearButton();
    updateLiveValidation(pinterestInput, pinterestNote, DEFAULT_PINTEREST_NOTE, 'pinterest');
    pinterestInput.focus();
  } catch {
    pinterestInput.focus();
  }
});

document.querySelector('#mp3PasteButton').addEventListener('click', async () => {
  try {
    mp3Input.value = await navigator.clipboard.readText();
    syncMp3ClearButton();
    updateLiveValidation(mp3Input, mp3Note, DEFAULT_MP3_NOTE, 'mp3');
    mp3Input.focus();
  } catch {
    mp3Input.focus();
  }
});

document.querySelector('#musicPasteButton').addEventListener('click', async () => {
  try {
    musicInput.value = await navigator.clipboard.readText();
    syncMusicClearButton();
    updateLiveValidation(musicInput, musicNote, DEFAULT_MUSIC_NOTE, 'music');
    musicInput.focus();
  } catch {
    musicInput.focus();
  }
});

document.querySelector('#thumbnailPasteButton').addEventListener('click', async () => {
  try {
    thumbnailInput.value = await navigator.clipboard.readText();
    syncThumbnailClearButton();
    updateLiveValidation(thumbnailInput, thumbnailNote, DEFAULT_THUMBNAIL_NOTE, 'thumbnail');
    thumbnailInput.focus();
  } catch {
    thumbnailInput.focus();
  }
});

document.querySelector('#avatarPasteButton').addEventListener('click', async () => {
  try {
    avatarInput.value = await navigator.clipboard.readText();
    syncAvatarClearButton();
    updateLiveValidation(avatarInput, avatarNote, DEFAULT_AVATAR_NOTE, 'avatar');
    avatarInput.focus();
  } catch {
    avatarInput.focus();
  }
});

if (clearButton) {
  clearButton.addEventListener('click', (event) => {
    event.preventDefault();
    input.value = '';
    syncClearButton();
    updateLiveValidation(input, note, DEFAULT_NOTE, 'media');
    input.blur();
    clearButton.blur();
  });
}

if (pinterestClearButton) {
  pinterestClearButton.addEventListener('click', (event) => {
    event.preventDefault();
    pinterestInput.value = '';
    syncPinterestClearButton();
    updateLiveValidation(pinterestInput, pinterestNote, DEFAULT_PINTEREST_NOTE, 'pinterest');
    pinterestInput.blur();
    pinterestClearButton.blur();
  });
}

if (mp3ClearButton) {
  mp3ClearButton.addEventListener('click', (event) => {
    event.preventDefault();
    mp3Input.value = '';
    syncMp3ClearButton();
    updateLiveValidation(mp3Input, mp3Note, DEFAULT_MP3_NOTE, 'mp3');
    mp3Input.blur();
    mp3ClearButton.blur();
  });
}

if (musicClearButton) {
  musicClearButton.addEventListener('click', (event) => {
    event.preventDefault();
    musicInput.value = '';
    syncMusicClearButton();
    updateLiveValidation(musicInput, musicNote, DEFAULT_MUSIC_NOTE, 'music');
    musicInput.blur();
    musicClearButton.blur();
  });
}

if (thumbnailClearButton) {
  thumbnailClearButton.addEventListener('click', (event) => {
    event.preventDefault();
    thumbnailInput.value = '';
    syncThumbnailClearButton();
    updateLiveValidation(thumbnailInput, thumbnailNote, DEFAULT_THUMBNAIL_NOTE, 'thumbnail');
    thumbnailInput.blur();
    thumbnailClearButton.blur();
  });
}

if (avatarClearButton) {
  avatarClearButton.addEventListener('click', (event) => {
    event.preventDefault();
    avatarInput.value = '';
    syncAvatarClearButton();
    updateLiveValidation(avatarInput, avatarNote, DEFAULT_AVATAR_NOTE, 'avatar');
    avatarInput.blur();
    avatarClearButton.blur();
  });
}

syncClearButton();
syncPinterestClearButton();
syncMp3ClearButton();
syncMusicClearButton();
syncThumbnailClearButton();
syncAvatarClearButton();

resultBack.addEventListener('click', closeResultScreen);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !resultScreen.hidden) closeResultScreen();
});

function isMusicContent(data) {
  return Boolean(data) && (
    MUSIC_SOURCES.has(data.source) ||
    (data.source === 'direct' && data.type === 'audio')
  );
}

function isMusicToolContent(data) {
  return isMusicContent(data) || Boolean(data && data.source === 'youtube');
}

downloadLink.addEventListener('click', async (event) => {
  event.preventDefault();

  // O atalho rápido do YouTube vale SOMENTE para o download normal de vídeo.
  // Ferramentas que transformam o arquivo (MP3/Thumbnail) precisam respeitar
  // o endpoint específico preparado para elas.
  const activeItem = activeResultItems[0] || null;
  const downloadMode = downloadLink.dataset.mode || 'single';

  // No WebApp Android, a análise do YouTube é permitida normalmente.
  // O aviso aparece somente quando o usuário realmente pede o download.
  if (
    downloadMode === 'single' &&
    activeItem?.source === 'youtube' &&
    (activeItem?.youtube_direct_url || activeItem?.proxy_id) &&
    isAndroidWebView()
  ) {
    // A URL GoogleVideo já vem pronta da análise. /youtube-direct fica apenas
    // como fallback para resultados antigos/sem itag 18 pré-resolvido.
    const directUrl = activeItem.youtube_direct_url || youtubeDirectPlayerUrl(activeItem.proxy_id);
    const filename = activeItem.filename || downloadLink.dataset.filename || 'youtube-video.mp4';

    try {
      if (window.SoftAndroid && typeof window.SoftAndroid.startDirectDownload === 'function') {
        window.SoftAndroid.startDirectDownload(directUrl, filename, 'video/mp4');
        rememberHistoryEntry(buildHistoryEntry(activeItem, { mode: 'single', filename }));
        return;
      }
    } catch (_) {}

    // Versões atuais do app baixam diretamente pela ponte nativa.
    // Sem a ponte de download, não exibimos mais o fluxo antigo de navegador/modal.
    return;
  }

  if (
    downloadMode === 'single' &&
    activeItem?.source === 'youtube' &&
    (activeItem?.youtube_direct_url || activeItem?.proxy_id) &&
    !isAndroidWebView()
  ) {
    // Normalmente abre GoogleVideo direto, sem exibir/aguardar a rota do Worker.
    const directPlayerUrl = activeItem.youtube_direct_url || youtubeDirectPlayerUrl(activeItem.proxy_id);

    // Abre exatamente uma guia para o player direto do GoogleVideo.
    // Não verificamos o retorno de window.open com noopener porque alguns
    // navegadores retornam null mesmo quando a guia foi aberta, o que antes
    // causava um segundo redirecionamento na guia do SOFT Downloaders.
    const directLink = document.createElement('a');
    directLink.href = directPlayerUrl;
    directLink.target = '_blank';
    directLink.rel = 'noopener noreferrer';
    document.body.appendChild(directLink);
    directLink.click();
    directLink.remove();

    rememberHistoryEntry(buildHistoryEntry(activeItem, {
      mode: 'single',
      filename: activeItem.filename || downloadLink.dataset.filename || 'youtube-video.mp4',
    }));
    return;
  }

  if (downloadMode === 'all') {
    await downloadAllMedia(activeResultItems, downloadLink);
    return;
  }

  if (downloadLink.dataset.mediaUrl) {
    const item = activeResultItems[0] || null;
    const historyEntry = buildHistoryEntry(item, {
      mode: downloadMode,
      filename: downloadLink.dataset.filename,
    });
    await downloadMedia(downloadLink.dataset.mediaUrl, downloadLink.dataset.filename, downloadLink, historyEntry);
  }
});

function setYoutubeSearchState(message = '', kind = '') {
  if (!youtubeSearchState) return;
  youtubeSearchState.textContent = message;
  youtubeSearchState.className = `youtube-search-state${kind ? ` is-${kind}` : ''}`;
  youtubeSearchState.hidden = !message;
}

function youtubeSearchPickVideo(data) {
  const items = Array.isArray(data?.items) && data.items.length ? data.items : [data];
  return items.find((entry) => entry?.source === 'youtube' && mediaTypeForDownload(entry) === 'video' && entry?.proxy_id)
    || items.find((entry) => mediaTypeForDownload(entry) === 'video' && entry?.proxy_id)
    || null;
}

function startInlineAttachment(url) {
  if (!url) return;
  const frame = document.createElement('iframe');
  frame.hidden = true;
  frame.setAttribute('aria-hidden', 'true');
  frame.src = url;
  document.body.append(frame);
  window.setTimeout(() => frame.remove(), 60000);
}

async function downloadYoutubeSearchVideo(item, button) {
  const url = String(item?.url || '').trim();
  if (!url || !button) return;

  const cover = button.closest('.youtube-search-cover');
  const processing = cover?.querySelector('.youtube-search-processing');

  button.disabled = true;
  button.classList.add('is-loading');
  button.setAttribute('aria-label', 'Processando vídeo');
  if (processing) {
    processing.hidden = false;
    processing.setAttribute('aria-hidden', 'false');
  }
  cover?.classList.add('is-processing');
  setYoutubeSearchState('', '');

  try {
    const extraction = await requestExtraction(url, 'media', 'Não foi possível preparar este vídeo.');
    const data = extraction.data;
    if (data?.status !== 'ready') throw new Error(data?.message || 'Este vídeo ainda não está disponível para download.');

    const video = youtubeSearchPickVideo(data);
    if (!video) throw new Error('Não encontramos uma versão disponível deste vídeo.');

    const filename = video.filename || `${String(item?.title || 'youtube-video').trim() || 'youtube-video'}.mp4`;
    const directUrl = video.youtube_direct_url || youtubeDirectPlayerUrl(video.proxy_id);

    if (isAndroidWebView()) {
      try {
        if (window.SoftAndroid && typeof window.SoftAndroid.startDirectDownload === 'function') {
          window.SoftAndroid.startDirectDownload(directUrl, filename, 'video/mp4');
          rememberHistoryEntry(buildHistoryEntry(video, { mode: 'single', filename }));
          setYoutubeSearchState('Download do vídeo iniciado.', 'success');
          window.setTimeout(() => setYoutubeSearchState('', ''), 1800);
          return;
        }
      } catch (_) {}
    }

    // Site: permanece na Pesquisa YouTube enquanto prepara. Quando a URL
    // direta do GoogleVideo estiver pronta, abre somente a guia do arquivo.
    // Não navega para a tela de Baixar Mídias e não cria etapa intermediária.
    const directLink = document.createElement('a');
    directLink.href = directUrl;
    directLink.target = '_blank';
    directLink.rel = 'noopener noreferrer';
    directLink.setAttribute('aria-hidden', 'true');
    document.body.append(directLink);
    directLink.click();
    directLink.remove();
    rememberHistoryEntry(buildHistoryEntry(video, { mode: 'single', filename }));
    setYoutubeSearchState('Download do vídeo iniciado.', 'success');
    window.setTimeout(() => setYoutubeSearchState('', ''), 1800);
  } catch (error) {
    setYoutubeSearchState(error?.message || 'Não foi possível iniciar o download.', 'error');
  } finally {
    if (processing) {
      processing.hidden = true;
      processing.setAttribute('aria-hidden', 'true');
    }
    cover?.classList.remove('is-processing');
    button.disabled = false;
    button.classList.remove('is-loading');
    button.setAttribute('aria-label', 'Baixar vídeo');
  }
}

function renderYoutubeSearchResults(items = []) {
  if (!youtubeSearchResults) return;
  youtubeSearchResults.replaceChildren();

  if (!items.length) {
    setYoutubeSearchState('Nenhum vídeo encontrado para esta pesquisa.', 'empty');
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const url = String(item?.url || '').trim();
    if (!url) return;

    const card = document.createElement('article');
    card.className = 'youtube-search-item';

    const cover = document.createElement('div');
    cover.className = 'youtube-search-cover';

    const img = document.createElement('img');
    img.src = String(item?.thumbnail || '');
    img.alt = String(item?.title || 'Vídeo do YouTube');
    img.loading = 'lazy';
    img.decoding = 'async';
    cover.appendChild(img);

    const downloadToggle = document.createElement('button');
    downloadToggle.type = 'button';
    downloadToggle.className = 'youtube-search-download-icon';
    downloadToggle.setAttribute('aria-label', 'Baixar vídeo');
    downloadToggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 19h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    downloadToggle.addEventListener('click', (event) => {
      event.stopPropagation();
      downloadYoutubeSearchVideo(item, downloadToggle);
    });
    cover.appendChild(downloadToggle);

    const processing = document.createElement('div');
    processing.className = 'youtube-search-processing';
    processing.hidden = true;
    processing.setAttribute('aria-hidden', 'true');
    processing.innerHTML = '<span class="youtube-search-processing-spinner" aria-hidden="true"></span><span class="youtube-search-processing-text">PROCESSANDO</span>';
    cover.appendChild(processing);

    const body = document.createElement('div');
    body.className = 'youtube-search-body';

    const title = document.createElement('strong');
    title.className = 'youtube-search-title';
    title.textContent = String(item?.title || 'Vídeo do YouTube');

    const channelRow = document.createElement('div');
    channelRow.className = 'youtube-search-channel';
    const avatar = document.createElement('img');
    avatar.className = 'youtube-search-channel-avatar';
    avatar.src = String(item?.channel_avatar || '');
    avatar.alt = '';
    avatar.loading = 'lazy';
    avatar.decoding = 'async';
    if (!avatar.src) avatar.hidden = true;
    const channelName = document.createElement('span');
    channelName.textContent = String(item?.channel || 'YouTube');
    channelRow.append(avatar, channelName);

    body.append(title, channelRow);
    card.append(cover, body);
    fragment.appendChild(card);
  });

  youtubeSearchResults.appendChild(fragment);
}

async function runYoutubeSearch(term) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`https://${WORKER_MEDIA_HOST}/youtube-search?q=${encodeURIComponent(term)}`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || 'Não foi possível pesquisar no YouTube.');
    return Array.isArray(data?.results) ? data.results : [];
  } finally {
    window.clearTimeout(timeout);
  }
}

if (youtubeSearchForm) {
  youtubeSearchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const term = String(youtubeSearchInput?.value || '').trim();
    if (term.length < 2) {
      setYoutubeSearchState('Digite pelo menos 2 caracteres para pesquisar.', 'error');
      youtubeSearchInput?.focus();
      return;
    }

    youtubeSearchInput?.blur();
    youtubeSearchResults?.replaceChildren();
    setYoutubeSearchState('Pesquisando no YouTube...', 'loading');

    try {
      const items = await runYoutubeSearch(term);
      setYoutubeSearchState('', '');
      renderYoutubeSearchResults(items);
    } catch (error) {
      const message = error?.name === 'AbortError'
        ? 'A pesquisa demorou demais. Tente novamente.'
        : (error?.message || 'Não foi possível pesquisar no YouTube.');
      setYoutubeSearchState(message, 'error');
    } finally {
    }
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const validation = validateBeforeSubmit(input, note, DEFAULT_NOTE, 'media');
  if (!validation) return;
  const rawUrl = validation.url || input.value.trim();

  activeRequest = { tool: 'media', url: rawUrl };
  input.blur();
  const loading = analysisLoadingCopy(validation, 'todas as mídias');
  openResultScreen(loading.title, loading.detail);
  note.className = 'form-note';
  note.textContent = DEFAULT_NOTE;

  let data;
  try {
    const extraction = await requestExtraction(rawUrl, 'media', 'Não foi possível extrair a mídia.');
    data = extraction.data;
    if (extraction.cached) setResultLoading('Resultado recente encontrado.', 'Abrindo a análise já preparada…');
  } catch (error) {
    return showResultError(error.message || 'Não foi possível analisar o link.');
  }

  if (isMusicContent(data)) {
    return showResultError('Este link é de música ou áudio. Use a opção Músicas.');
  }
  if (data.status !== 'ready') {
    return showResultError(data.message || 'Este link ainda não é compatível.');
  }
  if (!hasWorkerProxy(data)) {
    return showResultError('Não foi possível preparar este vídeo agora. Tente analisar novamente.');
  }

  const items = Array.isArray(data.items) && data.items.length ? data.items : [data];
  const isCarousel = items.length > 1;
  activeResultItems = items;

  result.classList.toggle('is-carousel', isCarousel);
  resultStage.classList.toggle('carousel-mode', isCarousel);
  if (isCarousel) renderCarousel(items);
  else {
    renderMedia(items[0]);
    maybeShowLongYoutubeWarning(items[0]);
  }
  resultLoading.hidden = true;
  resultError.hidden = true;
  result.hidden = false;
  maybeReplayHistoryDownload();
});

pinterestForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const validation = validateBeforeSubmit(
    pinterestInput,
    pinterestNote,
    DEFAULT_PINTEREST_NOTE,
    'pinterest'
  );
  if (!validation) return;

  const profileUrl = validation.url;
  activeRequest = { tool: 'pinterest', url: profileUrl };
  pinterestInput.blur();

  openResultScreen(
    `${validation.label} reconhecido.`,
    'Buscando as mídias públicas da área CRIADOS…'
  );
  pinterestNote.className = 'form-note';
  pinterestNote.textContent = DEFAULT_PINTEREST_NOTE;

  let data;
  try {
    const extraction = await requestExtraction(
      profileUrl,
      'media',
      'Não foi possível ler os Criados deste perfil.'
    );
    data = extraction.data;
    if (extraction.cached) {
      setResultLoading('Resultado recente encontrado.', 'Abrindo as mídias já analisadas…');
    }
  } catch (error) {
    return showResultError(error.message || 'Não foi possível analisar este perfil.');
  }

  if (data.status !== 'ready') {
    return showResultError(data.message || 'Não foi possível ler os Criados deste perfil.');
  }
  if (!hasWorkerProxy(data)) {
    return showResultError('Não foi possível preparar as mídias deste perfil agora. Tente novamente.');
  }

  const items = Array.isArray(data.items) && data.items.length ? data.items : [data];
  const isCarousel = items.length > 1;
  activeResultItems = items;

  result.classList.toggle('is-carousel', isCarousel);
  resultStage.classList.toggle('carousel-mode', isCarousel);

  if (isCarousel) renderCarousel(items);
  else renderMedia(items[0]);

  resultLoading.hidden = true;
  resultError.hidden = true;
  result.hidden = false;
  maybeReplayHistoryDownload();
});

mp3Form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const rawUrl = mp3Input.value.trim();
  const validation = validateBeforeSubmit(mp3Input, mp3Note, DEFAULT_MP3_NOTE, 'mp3');
  if (!validation) return;

  activeRequest = { tool: 'mp3', url: rawUrl };
  mp3Input.blur();
  const loading = analysisLoadingCopy(validation, 'o vídeo');
  openResultScreen(loading.title, 'Lendo o vídeo sem converter ou baixar o arquivo inteiro…');
  mp3Note.className = 'form-note';
  mp3Note.textContent = DEFAULT_MP3_NOTE;

  let data;
  try {
    const extraction = await requestExtraction(rawUrl, 'media', 'Não foi possível preparar o vídeo.');
    data = extraction.data;
    if (extraction.cached) setResultLoading('Resultado recente encontrado.', 'Preparando as opções de MP3…');
  } catch (error) {
    return showResultError(error.message || 'Não foi possível preparar o vídeo.');
  }

  if (data.status !== 'ready') {
    return showResultError(data.message || 'Este vídeo ainda não é compatível com a conversão para MP3.');
  }

  const items = Array.isArray(data.items) && data.items.length ? data.items : [data];
  const video = items.find((item) => mediaTypeForDownload(item) === 'video' && item.proxy_id);
  if (!video) {
    return showResultError('Não encontramos um vídeo com áudio disponível neste link.');
  }

  activeResultItems = [video];
  renderMp3Result(video);
  resultLoading.hidden = true;
  resultError.hidden = true;
  result.hidden = false;
  maybeReplayHistoryDownload();
});

musicForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const rawUrl = musicInput.value.trim();
  const validation = validateBeforeSubmit(musicInput, musicNote, DEFAULT_MUSIC_NOTE, 'music');
  if (!validation) return;

  activeRequest = { tool: 'music', url: rawUrl };
  musicInput.blur();
  const loading = analysisLoadingCopy(validation, 'a faixa');
  openResultScreen(loading.title, loading.detail);
  musicNote.className = 'form-note';
  musicNote.textContent = DEFAULT_MUSIC_NOTE;

  let data;
  try {
    const extraction = await requestExtraction(rawUrl, 'media', 'Não foi possível extrair a música.');
    data = extraction.data;
    if (extraction.cached) setResultLoading('Resultado recente encontrado.', 'Abrindo a faixa já analisada…');
  } catch (error) {
    return showResultError(error.message || 'Não foi possível analisar o link.');
  }

  if (!isMusicToolContent(data)) {
    return showResultError('Esta área aceita YouTube, SoundCloud, Bandcamp, Audius, BandLab e links diretos de áudio.');
  }
  if (data.status !== 'ready') {
    return showResultError(data.message || 'Esta música ainda não é compatível.');
  }

  const items = Array.isArray(data.items) && data.items.length ? data.items : [data];

  if (data.source === 'youtube' || items.some((item) => item?.source === 'youtube')) {
    if (!hasWorkerProxy(data)) {
      return showResultError('Não foi possível preparar esta música do YouTube agora. Tente analisar novamente.');
    }

    const youtubeVideo = items.find(
      (item) => item?.source === 'youtube' && mediaTypeForDownload(item) === 'video' && item.proxy_id
    );

    if (!youtubeVideo) {
      return showResultError('Não encontramos o áudio deste vídeo do YouTube.');
    }

    activeResultItems = [youtubeVideo];
    renderMp3Result(youtubeVideo, true);
    downloadLink.textContent = 'BAIXAR MÚSICA';
    resultLoading.hidden = true;
    resultError.hidden = true;
    result.hidden = false;
    maybeReplayHistoryDownload();
    return;
  }

  const audio = items.find((item) => mediaTypeForDownload(item) === 'audio');
  if (!audio) {
    return showResultError('Não encontramos uma faixa de áudio disponível neste link.');
  }

  activeResultItems = [audio];
  renderMusicResult(audio);
  resultLoading.hidden = true;
  resultError.hidden = true;
  result.hidden = false;
  maybeReplayHistoryDownload();
});

thumbnailForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const rawUrl = thumbnailInput.value.trim();
  const validation = validateBeforeSubmit(thumbnailInput, thumbnailNote, DEFAULT_THUMBNAIL_NOTE, 'thumbnail');
  if (!validation) return;

  activeRequest = { tool: 'thumbnail', url: rawUrl };
  thumbnailInput.blur();
  openResultScreen(`${validation.label} reconhecido.`, 'Buscando a maior thumbnail disponível…');
  thumbnailNote.className = 'form-note';
  thumbnailNote.textContent = DEFAULT_THUMBNAIL_NOTE;

  let data;
  try {
    const extraction = await requestExtraction(rawUrl, 'media', 'Não foi possível buscar a thumbnail.');
    data = extraction.data;
    if (extraction.cached) setResultLoading('Resultado recente encontrado.', 'Abrindo a thumbnail já analisada…');
  } catch (error) {
    return showResultError(error.message || 'Não foi possível buscar a thumbnail.');
  }

  if (data.status !== 'ready' || !THUMBNAIL_SOURCES.has(data.source)) {
    return showResultError(data.message || 'Não foi possível obter a thumbnail deste link.');
  }

  const items = Array.isArray(data.items) && data.items.length ? data.items : [data];
  const item = items.find((value) => value && value.thumbnail && value.proxy_id) ||
    (data.thumbnail && data.proxy_id ? data : null);
  if (!item) {
    return showResultError('Este conteúdo não disponibilizou uma thumbnail para download.');
  }

  activeResultItems = [item];
  renderThumbnailResult(item);
  resultLoading.hidden = true;
  resultError.hidden = true;
  result.hidden = false;
  maybeReplayHistoryDownload();
});

avatarForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const validation = updateLiveValidation(avatarInput, avatarNote, DEFAULT_AVATAR_NOTE, 'avatar');
  if (validation.empty) {
    avatarNote.className = 'form-note error';
    avatarNote.textContent = 'PERFIL AUSENTE: Digite um @ ou cole o link do perfil para continuar.';
    return;
  }
  if (!validation.valid) return;

  const profileUrl = validation.url;
  activeRequest = { tool: 'avatar', url: profileUrl };
  avatarInput.blur();
  openResultScreen(`Perfil ${validation.label} reconhecido.`, 'Buscando a maior foto de perfil pública disponível…');
  avatarNote.className = 'form-note';
  avatarNote.textContent = DEFAULT_AVATAR_NOTE;

  let data;
  try {
    const extraction = await requestExtraction(profileUrl, 'avatar', 'Não foi possível buscar o avatar.');
    data = extraction.data;
    if (extraction.cached) setResultLoading('Resultado recente encontrado.', 'Abrindo o avatar já analisado…');
  } catch (error) {
    return showResultError(error.message || 'Não foi possível buscar o avatar.');
  }

  const items = Array.isArray(data.items) && data.items.length ? data.items : [data];
  const item = items.find((value) => value && value.type === 'image' && value.proxy_id) ||
    (data.type === 'image' && data.proxy_id ? data : null);
  if (!item) {
    return showResultError('Não foi possível encontrar a foto de perfil deste Instagram agora.');
  }

  activeResultItems = [item];
  renderAvatarResult(item);
  resultLoading.hidden = true;
  resultError.hidden = true;
  result.hidden = false;
  maybeReplayHistoryDownload();
});

function openResultScreen(message, detail = 'Isso pode levar alguns segundos.') {
  resetResult();
  resultScreen.hidden = false;
  document.body.classList.add('result-screen-open');
  setResultLoading(message, detail);
  requestAnimationFrame(() => resultBack.focus({ preventScroll: true }));
}

function closeResultScreen() {
  resultScreen.hidden = true;
  document.body.classList.remove('result-screen-open');
  resetResult();
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}


function resetResult() {
  result.hidden = true;
  result.classList.remove('is-carousel', 'is-mp3', 'is-thumbnail', 'is-avatar');
  resultStage.classList.remove('carousel-mode');
  resultLoading.hidden = true;
  resultError.hidden = true;
  preview.replaceChildren();
  delete preview.dataset.type;
  preview.style.removeProperty('width');
  preview.style.removeProperty('height');
  preview.style.removeProperty('background');
  preview.style.removeProperty('overflow');
  carouselItems.replaceChildren();
  carouselItems.hidden = true;
  activeResultItems = [];
  downloadLink.hidden = true;
  downloadLink.href = '#';
  downloadLink.textContent = 'BAIXAR ARQUIVO';
  delete downloadLink.dataset.mode;
  delete downloadLink.dataset.mediaUrl;
  delete downloadLink.dataset.filename;
  if (downloadStatus) {
    downloadStatus.hidden = true;
    downloadStatus.textContent = '';
    downloadStatus.classList.remove('is-error');
  }
}

function setResultLoading(message, detail = 'Isso pode levar alguns segundos.') {
  result.hidden = true;
  resultError.hidden = true;
  resultLoading.hidden = false;
  resultLoadingText.textContent = message;
  if (resultLoadingHint) resultLoadingHint.textContent = detail;
}

function showResultError(message) {
  historyReplayPending = null;
  const friendly = classifyResultError(message);
  result.hidden = true;
  resultLoading.hidden = true;
  resultError.hidden = false;
  if (resultErrorTitle) resultErrorTitle.textContent = friendly.title;
  resultErrorText.textContent = friendly.message;
}

function formatAudioTime(seconds) {
  const value = Number.isFinite(Number(seconds)) ? Math.max(0, Number(seconds)) : 0;
  const minutes = Math.floor(value / 60);
  const secs = Math.floor(value % 60);
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function createAudioPreview(data) {
  const card = document.createElement('article');
  card.className = 'audio-preview-card';

  const cover = document.createElement('div');
  cover.className = 'audio-cover';

  if (data.thumbnail) {
    const image = document.createElement('img');
    image.src = lightweightPreviewImageUrl(data) || data.thumbnail;
    image.alt = '';
    image.addEventListener('error', () => {
      image.remove();
      cover.classList.add('is-fallback');
      cover.setAttribute('aria-label', 'Capa indisponível');
    });
    cover.append(image);
  } else {
    cover.classList.add('is-fallback');
    cover.setAttribute('aria-label', 'Capa indisponível');
  }

  const details = document.createElement('div');
  details.className = 'audio-details';

  const title = document.createElement('strong');
  title.className = 'audio-title';
  title.textContent = data.track_title || data.title || 'Áudio';

  const artist = document.createElement('span');
  artist.className = 'audio-artist';
  const audioSourceNames = {
    youtube: 'YouTube',
    soundcloud: 'SoundCloud',
    bandcamp: 'Bandcamp',
    audius: 'Audius',
    bandlab: 'BandLab',
  };
  artist.textContent = data.artist || audioSourceNames[data.source] || 'Áudio';

  const player = document.createElement('div');
  player.className = 'audio-player';

  const playButton = document.createElement('button');
  playButton.type = 'button';
  playButton.className = 'audio-play';
  playButton.setAttribute('aria-label', 'Reproduzir áudio');
  playButton.textContent = '▶';

  const timeline = document.createElement('div');
  timeline.className = 'audio-timeline';

  const progress = document.createElement('input');
  progress.className = 'audio-progress';
  progress.type = 'range';
  progress.min = '0';
  progress.max = '1000';
  progress.value = '0';
  progress.step = '1';
  progress.setAttribute('aria-label', 'Progresso do áudio');

  const timeRow = document.createElement('div');
  timeRow.className = 'audio-time-row';
  const currentTime = document.createElement('span');
  currentTime.textContent = '0:00';
  const durationTime = document.createElement('span');
  durationTime.textContent = data.duration ? formatAudioTime(data.duration) : '--:--';
  timeRow.append(currentTime, durationTime);
  timeline.append(progress, timeRow);
  player.append(playButton, timeline);
  details.append(title, artist, player);

  const audio = document.createElement('audio');
  audio.src = proxyMediaUrl(data.url, data.source, data.proxy_id, false);
  audio.preload = 'metadata';
  audio.className = 'audio-engine';
  audio.setAttribute('aria-hidden', 'true');

  const syncPlayer = () => {
    const duration = Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration
      : Number(data.duration || 0);
    if (duration > 0) {
      const ratio = Math.min(1, Math.max(0, audio.currentTime / duration));
      progress.value = String(Math.round(ratio * 1000));
      durationTime.textContent = formatAudioTime(duration);
    }
    currentTime.textContent = formatAudioTime(audio.currentTime);
  };

  playButton.addEventListener('click', async () => {
    if (audio.paused) {
      try {
        await audio.play();
      } catch (_) {
        return;
      }
    } else {
      audio.pause();
    }
  });

  progress.addEventListener('input', () => {
    const duration = Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration
      : Number(data.duration || 0);
    if (duration > 0) {
      audio.currentTime = (Number(progress.value) / 1000) * duration;
      syncPlayer();
    }
  });

  audio.addEventListener('play', () => {
    playButton.textContent = '❚❚';
    playButton.setAttribute('aria-label', 'Pausar áudio');
  });
  audio.addEventListener('pause', () => {
    playButton.textContent = '▶';
    playButton.setAttribute('aria-label', 'Reproduzir áudio');
  });
  audio.addEventListener('ended', () => {
    playButton.textContent = '▶';
    progress.value = '0';
    currentTime.textContent = '0:00';
  });
  audio.addEventListener('loadedmetadata', syncPlayer);
  audio.addEventListener('durationchange', syncPlayer);
  audio.addEventListener('timeupdate', syncPlayer);
  audio.addEventListener('error', () => {
    playButton.disabled = true;
    playButton.textContent = '▶';
    artist.textContent = 'Prévia de áudio indisponível';
  });

  card.append(cover, details, audio);
  return card;
}


function createPreview(data) {
  // Comportamento de prévia restaurado: a mídia é aberta diretamente pelo
  // proxy já existente, sem trocar a URL da imagem no navegador.
  if (data.type === 'audio') return createAudioPreview(data);

  const element = document.createElement(data.type === 'image' ? 'img' : 'video');
  element.src = proxyMediaUrl(data.url, data.source, data.proxy_id, false);

  if (data.type === 'image') {
    element.alt = '';
    element.addEventListener('error', () => showPreviewFallback(data, element));
  } else if (data.type === 'video') {
    element.autoplay = true;
    element.muted = true;
    element.loop = true;
    element.playsInline = true;
    element.controls = false;
    element.removeAttribute('controls');
    element.preload = 'metadata';
    element.disablePictureInPicture = true;
    element.disableRemotePlayback = true;
    if (data.thumbnail) element.poster = data.thumbnail;
    element.setAttribute('controlsList', 'nodownload noremoteplayback nofullscreen');
    element.addEventListener('error', () => showPreviewFallback(data, element));
    element.addEventListener('canplay', () => {
      element.play().catch(() => {});
    }, { once: true });
  }

  return element;
}

function showPreviewFallback(data, element) {
  if (!element.isConnected) return;
  if (data.thumbnail && data.type === 'video') {
    const image = document.createElement('img');
    image.src = data.thumbnail;
    image.alt = '';
    image.addEventListener('error', () => image.replaceWith(createPreviewUnavailable()));
    element.replaceWith(image);
    return;
  }
  element.replaceWith(createPreviewUnavailable());
}

function createPreviewUnavailable() {
  const fallback = document.createElement('div');
  fallback.className = 'preview-unavailable';
  fallback.textContent = 'Prévia indisponível';
  return fallback;
}



function maybeShowLongYoutubeWarning(data) {
  // YouTube usa fluxo direto para googlevideo.com no site.
  // O aviso/instrução fica concentrado no menu do resultado, sem status menor abaixo.
  if (data?.source === 'youtube') {
    if (downloadStatus) {
      downloadStatus.hidden = true;
      downloadStatus.textContent = '';
      downloadStatus.classList.remove('is-error');
    }
    return;
  }
}

function renderMedia(data) {
  preview.dataset.type = data.type || 'media';
  preview.replaceChildren(createPreview(data));
  carouselItems.hidden = true;
  carouselItems.replaceChildren();
  downloadLink.hidden = false;
  downloadLink.href = '#';
  downloadLink.textContent = downloadLabelForMedia(data);
  downloadLink.dataset.mode = 'single';
  downloadLink.dataset.filename = data.filename || 'soft-download';

  if (data?.source === 'youtube') {
    downloadLink.textContent = 'BAIXAR VÍDEO';
  }

  downloadLink.dataset.mediaUrl = proxyMediaUrl(
    data.url, data.source, data.proxy_id, true
  );
}

function renderMusicResult(data) {
  renderMedia(data);
  downloadLink.textContent = 'BAIXAR MÚSICA';
  downloadLink.dataset.mode = 'music';
}

function renderMp3Result(data, showThumbnail = false) {
  result.classList.add('is-mp3');
  result.classList.remove('is-carousel');
  resultStage.classList.remove('carousel-mode');
  preview.dataset.type = 'mp3';
  carouselItems.hidden = true;
  carouselItems.replaceChildren();

  const card = document.createElement('article');
  card.className = 'mp3-audio-card';

  if (showThumbnail) {
    const cover = document.createElement('div');
    cover.className = 'audio-cover';

    const image = document.createElement('img');
    image.src = data.proxy_id
      ? proxyThumbnailUrl(data.proxy_id)
      : (data.thumbnail || '');
    image.alt = data.title ? `Capa de ${data.title}` : 'Capa da música';

    image.addEventListener('error', () => {
      image.remove();
      cover.classList.add('is-fallback');
    });

    if (image.src) {
      cover.append(image);
    } else {
      cover.classList.add('is-fallback');
    }

    card.append(cover);
    card.style.gap = '14px';
  }

  const details = document.createElement('div');
  details.className = 'audio-details mp3-audio-details';

  const title = document.createElement('strong');
  title.className = 'audio-title';
  title.textContent = data.title || 'Áudio do vídeo';

  const format = document.createElement('span');
  format.className = 'audio-artist';
  format.textContent = 'MP3 • 192 kbps';

  const player = document.createElement('div');
  player.className = 'audio-player';

  const playButton = document.createElement('button');
  playButton.type = 'button';
  playButton.className = 'audio-play';
  playButton.setAttribute('aria-label', 'Reproduzir áudio');
  playButton.textContent = '▶';

  const timeline = document.createElement('div');
  timeline.className = 'audio-timeline';

  const progress = document.createElement('input');
  progress.className = 'audio-progress';
  progress.type = 'range';
  progress.min = '0';
  progress.max = '1000';
  progress.value = '0';
  progress.step = '1';
  progress.setAttribute('aria-label', 'Progresso do áudio');

  const timeRow = document.createElement('div');
  timeRow.className = 'audio-time-row';
  const currentTime = document.createElement('span');
  currentTime.textContent = '0:00';
  const durationTime = document.createElement('span');
  durationTime.textContent = data.duration ? formatAudioTime(data.duration) : '--:--';
  timeRow.append(currentTime, durationTime);
  timeline.append(progress, timeRow);
  player.append(playButton, timeline);
  details.append(title, format, player);

  const audio = document.createElement('audio');
  audio.src = proxyMp3PreviewUrl(data.proxy_id);
  audio.preload = 'metadata';
  audio.className = 'audio-engine';
  audio.setAttribute('aria-hidden', 'true');

  const syncPlayer = () => {
    const duration = Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration
      : Number(data.duration || 0);
    if (duration > 0) {
      const ratio = Math.min(1, Math.max(0, audio.currentTime / duration));
      progress.value = String(Math.round(ratio * 1000));
      durationTime.textContent = formatAudioTime(duration);
    }
    currentTime.textContent = formatAudioTime(audio.currentTime);
  };

  playButton.addEventListener('click', async () => {
    if (audio.paused) {
      try {
        await audio.play();
      } catch (_) {
        return;
      }
    } else {
      audio.pause();
    }
  });

  progress.addEventListener('input', () => {
    const duration = Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration
      : Number(data.duration || 0);
    if (duration > 0 && Number.isFinite(audio.duration)) {
      audio.currentTime = (Number(progress.value) / 1000) * duration;
      syncPlayer();
    }
  });

  audio.addEventListener('play', () => {
    playButton.textContent = '❚❚';
    playButton.setAttribute('aria-label', 'Pausar áudio');
  });
  audio.addEventListener('pause', () => {
    playButton.textContent = '▶';
    playButton.setAttribute('aria-label', 'Reproduzir áudio');
  });
  audio.addEventListener('ended', () => {
    playButton.textContent = '▶';
    progress.value = '0';
    currentTime.textContent = '0:00';
  });
  audio.addEventListener('loadedmetadata', syncPlayer);
  audio.addEventListener('durationchange', syncPlayer);
  audio.addEventListener('timeupdate', syncPlayer);
  audio.addEventListener('error', () => {
    playButton.disabled = true;
    playButton.textContent = '▶';
    format.textContent = 'Prévia de áudio indisponível';
  });

  card.append(details, audio);
  preview.replaceChildren(card);

  const mp3Filename = String(data.filename || 'soft-download.mp4').replace(/\.[^.]+$/, '') + '.mp3';
  downloadLink.hidden = false;
  downloadLink.href = '#';
  downloadLink.textContent = 'BAIXAR MP3';
  downloadLink.dataset.mode = 'mp3';
  downloadLink.dataset.mediaUrl = proxyMp3Url(data.proxy_id);
  downloadLink.dataset.filename = mp3Filename;
}

function renderThumbnailResult(data) {
  result.classList.add('is-thumbnail');
  result.classList.remove('is-carousel', 'is-mp3');
  resultStage.classList.remove('carousel-mode');
  preview.dataset.type = 'thumbnail';
  carouselItems.hidden = true;
  carouselItems.replaceChildren();

  const image = document.createElement('img');
  image.src = data.thumbnail;
  image.alt = data.title ? `Thumbnail de ${data.title}` : 'Thumbnail do vídeo';
  image.addEventListener('error', () => image.replaceWith(createPreviewUnavailable()));
  preview.replaceChildren(image);

  const thumbnailFilename = thumbnailFilenameFor(data);
  downloadLink.hidden = false;
  downloadLink.href = '#';
  downloadLink.textContent = 'BAIXAR THUMBNAIL';
  downloadLink.dataset.mode = 'thumbnail';
  downloadLink.dataset.mediaUrl = proxyThumbnailUrl(data.proxy_id, true);
  downloadLink.dataset.filename = thumbnailFilename;
}

function thumbnailFilenameFor(data) {
  const source = String(data.source || 'video').replace(/[^a-z0-9_-]+/gi, '-');
  const base = String(data.filename || `${source}-thumbnail`)
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9 _-]+/gi, '')
    .trim() || `${source}-thumbnail`;
  return `${base}-thumbnail.jpg`;
}

function renderAvatarResult(data) {
  result.classList.add('is-avatar');
  result.classList.remove('is-carousel', 'is-mp3', 'is-thumbnail');
  resultStage.classList.remove('carousel-mode');
  carouselItems.hidden = true;
  carouselItems.replaceChildren();

  const card = document.createElement('div');
  card.className = 'avatar-result-card';

  const frame = document.createElement('div');
  frame.className = 'result-preview';
  frame.dataset.type = 'avatar';
  const image = document.createElement('img');
  image.src = proxyMediaUrl(data.url, data.source, data.proxy_id, false);
  image.alt = data.username ? `Avatar de @${data.username}` : 'Avatar do Instagram';
  image.addEventListener('error', () => image.replaceWith(createPreviewUnavailable()));
  frame.append(image);

  const copy = document.createElement('div');
  copy.className = 'avatar-result-copy';
  const username = document.createElement('strong');
  username.textContent = data.username ? `@${data.username}` : 'Instagram';
  copy.append(username);
  if (data.full_name) {
    const fullName = document.createElement('span');
    fullName.textContent = data.full_name;
    copy.append(fullName);
  }

  card.append(frame, copy);
  delete preview.dataset.type;
  preview.replaceChildren(card);
  preview.style.width = 'auto';
  preview.style.height = 'auto';
  preview.style.background = 'transparent';
  preview.style.overflow = 'visible';

  downloadLink.hidden = false;
  downloadLink.href = '#';
  downloadLink.textContent = 'BAIXAR AVATAR';
  downloadLink.dataset.mode = 'avatar';
  downloadLink.dataset.mediaUrl = proxyMediaUrl(data.url, data.source, data.proxy_id, true);
  downloadLink.dataset.filename = data.filename || `instagram-${data.username || 'avatar'}-avatar.jpg`;
}

function renderCarousel(items) {
  delete preview.dataset.type;
  preview.replaceChildren();
  carouselItems.hidden = true;
  carouselItems.replaceChildren();

  const grid = document.createElement('div');
  grid.className = 'carousel-grid';
  const groupSnapshots = items.map((item, index) => historySnapshotForItem(item, index));

  items.forEach((item, index) => {
    const tile = document.createElement('article');
    tile.className = 'carousel-tile';

    // Mantém a área da mídia com tamanho real mesmo em WebViews Android
    // que apresentam falhas com `aspect-ratio` em elementos de grid.
    const mediaFrame = document.createElement('div');
    mediaFrame.className = 'carousel-media-frame';
    const mediaElement = createPreview(item);
    if (mediaElement instanceof HTMLImageElement && index >= 8) {
      mediaElement.loading = 'lazy';
    }
    mediaFrame.append(mediaElement);
    tile.append(mediaFrame);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tile-download';
    button.textContent = '↓';
    button.title = `Baixar mídia ${index + 1}`;
    button.setAttribute('aria-label', `Baixar mídia ${index + 1}`);
    button.addEventListener('click', () => downloadMedia(
      proxyMediaUrl(item.url, item.source, item.proxy_id, true),
      item.filename || 'soft-download',
      button,
      buildHistoryEntry(item, {
        mode: 'carousel-item',
        itemIndex: index,
        filename: item.filename,
        count: groupSnapshots.length,
        items: groupSnapshots,
      }),
    ));

    tile.append(button);
    grid.append(tile);
  });

  preview.append(grid);

  downloadLink.hidden = false;
  downloadLink.href = '#';
  downloadLink.textContent = 'BAIXAR TODOS';
  downloadLink.dataset.mode = 'all';
  delete downloadLink.dataset.mediaUrl;
  delete downloadLink.dataset.filename;
}

function mediaTypeForDownload(data) {
  if (!data) return 'media';

  // TikTok e YouTube são sempre tratados como vídeo; a imagem mostrada na
  // prévia é apenas a capa e não deve mudar o texto do botão.
  if (data.source === 'tiktok' || data.source === 'youtube') return 'video';

  const filename = String(data.filename || '').toLowerCase();
  const url = String(data.url || '').toLowerCase();

  if (/\.(mp4|webm|mov|m4v)(?:$|[?#])/.test(filename) || /mime_type=video/.test(url)) return 'video';
  if (/\.(mp3|m4a|aac|wav|ogg|opus)(?:$|[?#])/.test(filename)) return 'audio';
  if (/\.(jpe?g|png|webp|gif|avif)(?:$|[?#])/.test(filename)) return 'image';

  if (data.type === 'video' || data.type === 'audio' || data.type === 'image') return data.type;
  return 'media';
}

function downloadLabelForMedia(data) {
  const type = mediaTypeForDownload(data);
  if (type === 'image') return 'BAIXAR FOTO';
  if (type === 'video') return 'BAIXAR VÍDEO';
  if (type === 'audio') return 'BAIXAR ÁUDIO';
  return 'BAIXAR ARQUIVO';
}

function createDownloadProgressId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  const bytes = new Uint8Array(18);
  if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
  else bytes.forEach((_, index) => { bytes[index] = Math.floor(Math.random() * 256); });
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

function isWorkerMediaUrl(mediaUrl) {
  try {
    const parsed = new URL(mediaUrl, window.location.href);
    return parsed.hostname === WORKER_MEDIA_HOST && (parsed.pathname === '/media' || parsed.pathname === '/pdf');
  } catch {
    return false;
  }
}

function mediaUrlWithProgress(mediaUrl, progressId) {
  const parsed = new URL(mediaUrl, window.location.href);
  parsed.searchParams.set('progress', progressId);
  return parsed.toString();
}

function downloadProgressItemLabel(media, index, total) {
  const type = mediaTypeForDownload(media);
  const base = type === 'video' ? 'VÍDEO' : type === 'image' ? 'FOTO' : type === 'audio' ? 'ÁUDIO' : 'ARQUIVO';
  return total > 1 ? `${base} ${index + 1}` : base;
}

function closeDownloadProgressScreen() {
  if (!downloadScreen) return;
  downloadScreen.hidden = true;
  document.body.classList.remove('download-screen-open');
  activeDownloadSession = null;
}

function hasPendingDownloadTransfers(session = activeDownloadSession) {
  return Boolean(session?.transfers?.some((transfer) => !transfer.done));
}

function returnDownloadProgressToHome() {
  closeDownloadProgressScreen();
  closeResultScreen();
  closeHistoryScreen?.();
  setActiveTool('media');
  setSectionHash('#midias');
  const home = document.querySelector('#inicio');
  if (home) home.scrollIntoView({ behavior: 'auto', block: 'start' });
  else window.scrollTo({ top: 0, behavior: 'auto' });
}

async function requestWorkerDownloadCancel(progressId) {
  if (!progressId) return;
  try {
    await fetch(`https://${WORKER_MEDIA_HOST}/cancel?id=${encodeURIComponent(progressId)}`, {
      method: 'POST',
      cache: 'no-store',
      keepalive: true,
    });
  } catch {
    // O navegador também tem a conexão de mídia interrompida localmente.
    // Se o aviso ao worker falhar, o fechamento do request ainda encerra o fluxo.
  }
}

function stopBrowserDownloadRequest(transfer) {
  transfer.abortController?.abort();
  transfer.abortController = null;

  if (transfer.frame) {
    try { transfer.frame.src = 'about:blank'; } catch {}
    transfer.frame.remove();
    transfer.frame = null;
  }
}

function cancelDownloadTransfer(transfer) {
  if (!transfer || transfer.done) return;
  transfer.cancelRequested = true;
  stopBrowserDownloadRequest(transfer);
  if (transfer.progressId) void requestWorkerDownloadCancel(transfer.progressId);
  setDownloadTransferState(transfer, 'cancelled');
}

function cancelActiveDownloadSession({ returnHome = false } = {}) {
  const session = activeDownloadSession;
  if (session) {
    session.cancelRequested = true;
    session.transfers.forEach(cancelDownloadTransfer);
    updateDownloadOverall(session);
  }
  if (returnHome) returnDownloadProgressToHome();
}

downloadProgressBack?.addEventListener('click', () => {
  if (hasPendingDownloadTransfers()) {
    cancelActiveDownloadSession({ returnHome: true });
    return;
  }
  returnDownloadProgressToHome();
});

downloadProgressCancel?.addEventListener('click', () => {
  if (!hasPendingDownloadTransfers()) return;
  downloadProgressCancel.disabled = true;
  cancelActiveDownloadSession();
});

function createDownloadTransfer(media, mediaUrl, filename, index, total) {
  return {
    media,
    mediaUrl,
    fallbackMediaUrl: '',
    filename: filename || media?.filename || `soft-download-${index + 1}`,
    index,
    total,
    label: downloadProgressItemLabel(media, index, total),
    status: 'preparing',
    progressPercent: 0,
    progressKnown: false,
    progressId: '',
    frame: null,
    abortController: null,
    cancelRequested: false,
    cancelled: false,
    done: false,
    failed: false,
  };
}

function transferProgressValue(transfer) {
  if (transfer.done && !transfer.cancelled) return 100;
  if (transfer.progressKnown && Number.isFinite(transfer.progressPercent)) {
    return Math.max(0, Math.min(100, transfer.progressPercent));
  }
  return 0;
}

function updateDownloadOverall(session) {
  if (!session || activeDownloadSession !== session) return;

  const completed = session.transfers.filter((item) => item.done && !item.failed && !item.cancelled).length;
  const failed = session.transfers.filter((item) => item.failed).length;
  const cancelled = session.transfers.filter((item) => item.cancelled).length;
  const finished = completed + failed + cancelled;
  const total = session.transfers.length;
  const hasKnownProgress = session.transfers.some((item) => item.progressKnown || item.done);
  const overallPercent = total > 0
    ? session.transfers.reduce((sum, item) => sum + transferProgressValue(item), 0) / total
    : 0;
  const safePercent = Math.max(0, Math.min(100, Math.round(overallPercent)));

  if (session.overallPercentElement) {
    session.overallPercentElement.textContent = hasKnownProgress || finished === total ? `${safePercent}%` : '';
  }
  if (session.overallFillElement) {
    session.overallFillElement.style.width = `${safePercent}%`;
  }
  session.overallTrackElement?.classList.toggle(
    'is-indeterminate',
    finished < total && !hasKnownProgress,
  );

  if (downloadProgressCancel) {
    downloadProgressCancel.hidden = finished >= total;
    downloadProgressCancel.disabled = finished >= total || Boolean(session.cancelRequested);
  }

  if (finished < total) {
    downloadProgressTitle.textContent = total === 1 ? 'Baixando arquivo' : 'Baixando publicação';
    downloadProgressSummary.textContent = total === 1
      ? 'Aguarde enquanto o arquivo é transferido para o navegador.'
      : `${completed} de ${total} arquivos transferidos.`;

    if (session.overallStatusElement) {
      if (total === 1) {
        const transfer = session.transfers[0];
        if (transfer.status === 'finalizing') session.overallStatusElement.textContent = 'FINALIZANDO...';
        else if (transfer.status === 'downloading') session.overallStatusElement.textContent = 'BAIXANDO...';
        else session.overallStatusElement.textContent = 'PREPARANDO...';
      } else {
        session.overallStatusElement.textContent = completed > 0
          ? `BAIXANDO... ${completed} DE ${total} TRANSFERIDOS`
          : 'BAIXANDO...';
      }
    }
    return;
  }

  session.overallTrackElement?.classList.remove('is-indeterminate');

  if (cancelled > 0) {
    session.overallRow?.classList.remove('is-complete', 'is-error');
    session.overallRow?.classList.add('is-cancelled');
    if (cancelled === total) {
      downloadProgressTitle.textContent = 'Download cancelado';
      downloadProgressSummary.textContent = total === 1
        ? 'A transferência foi interrompida.'
        : 'As transferências foram interrompidas.';
      session.overallStatusElement.textContent = 'CANCELADO';
    } else {
      downloadProgressTitle.textContent = 'Download interrompido';
      downloadProgressSummary.textContent = `${completed} de ${total} arquivos foram enviados ao navegador. ${cancelled} cancelado${cancelled > 1 ? 's' : ''}.`;
      session.overallStatusElement.textContent = 'INTERROMPIDO';
    }
  } else if (failed === 0) {
    if (session.overallPercentElement) session.overallPercentElement.textContent = '100%';
    if (session.overallFillElement) session.overallFillElement.style.width = '100%';
    downloadProgressTitle.textContent = 'Transferência concluída';
    downloadProgressSummary.textContent = total === 1
      ? 'O arquivo foi enviado ao navegador.'
      : `${total} arquivos foram enviados ao navegador.`;
    session.overallStatusElement.textContent = 'ENVIADO ✓';
    session.overallRow?.classList.add('is-complete');
  } else if (completed > 0) {
    if (session.overallPercentElement) session.overallPercentElement.textContent = '100%';
    if (session.overallFillElement) session.overallFillElement.style.width = '100%';
    downloadProgressTitle.textContent = 'Transferência parcial';
    downloadProgressSummary.textContent = `${completed} de ${total} arquivos foram enviados ao navegador. ${failed} não puderam ser transferidos.`;
    session.overallStatusElement.textContent = `${failed} ARQUIVO${failed > 1 ? 'S' : ''} COM ERRO`;
    session.overallRow?.classList.add('is-error');
  } else {
    if (session.overallPercentElement) session.overallPercentElement.textContent = '100%';
    if (session.overallFillElement) session.overallFillElement.style.width = '100%';
    downloadProgressTitle.textContent = 'Não foi possível baixar';
    downloadProgressSummary.textContent = total === 1
      ? (session.transfers[0]?.error || 'O arquivo não pôde ser transferido.')
      : 'Nenhum arquivo pôde ser transferido.';
    session.overallStatusElement.textContent = 'ERRO NO DOWNLOAD';
    session.overallRow?.classList.add('is-error');
  }

  downloadProgressBack.disabled = false;
  downloadProgressBack.classList.remove('is-pending');
  downloadProgressBack.removeAttribute('aria-hidden');
}

function setDownloadTransferState(transfer, status, options = {}) {
  const { percent = null, error = '' } = options;
  transfer.status = status;
  if (error) transfer.error = String(error);

  if (status === 'preparing') {
    transfer.progressPercent = 0;
    transfer.progressKnown = false;
  } else if (status === 'downloading') {
    if (percent === null) {
      transfer.progressKnown = false;
    } else {
      transfer.progressKnown = true;
      transfer.progressPercent = Math.max(0, Math.min(100, Number(percent) || 0));
    }
  } else if (status === 'finalizing') {
    transfer.progressKnown = true;
    transfer.progressPercent = 100;
  } else if (status === 'complete') {
    transfer.progressKnown = true;
    transfer.progressPercent = 100;
    transfer.done = true;
  } else if (status === 'cancelled') {
    transfer.done = true;
    transfer.cancelled = true;
    transfer.failed = false;
    transfer.status = 'cancelled';
  } else if (status === 'error') {
    if (transfer.cancelRequested || transfer.cancelled) {
      transfer.done = true;
      transfer.cancelled = true;
      transfer.failed = false;
      transfer.status = 'cancelled';
    } else {
      transfer.progressKnown = true;
      transfer.progressPercent = 100;
      transfer.done = true;
      transfer.failed = true;
    }
  }

  updateDownloadOverall(activeDownloadSession);
}

function openDownloadProgressScreen(transfers) {
  if (!downloadScreen || !downloadProgressList) return null;
  const session = { transfers, startedAt: Date.now(), cancelRequested: false };
  activeDownloadSession = session;

  downloadProgressList.replaceChildren();
  downloadProgressBack.textContent = '← Voltar';
  downloadProgressBack.setAttribute('aria-label', 'Voltar para a tela inicial');
  downloadProgressBack.disabled = false;
  downloadProgressBack.classList.remove('is-pending');
  downloadProgressBack.removeAttribute('aria-hidden');
  if (downloadProgressCancel) {
    downloadProgressCancel.hidden = false;
    downloadProgressCancel.disabled = false;
  }
  downloadProgressTitle.textContent = transfers.length > 1 ? 'Baixando publicação' : 'Baixando arquivo';
  downloadProgressSummary.textContent = transfers.length > 1
    ? `0 de ${transfers.length} arquivos transferidos.`
    : 'Aguarde enquanto o arquivo é transferido para o navegador.';

  const first = transfers[0]?.media || null;
  const cover = String(first?.thumbnail || (mediaTypeForDownload(first) === 'image' ? first?.url : '') || '').trim();

  // Limpa imediatamente qualquer prévia da transferência anterior.
  // O elemento <img> só volta a aparecer depois que a nova imagem terminou de carregar.
  downloadProgressSource.hidden = true;
  downloadProgressSource.classList.remove('has-cover');
  downloadProgressCover.hidden = true;
  downloadProgressCover.alt = '';
  downloadProgressCover.removeAttribute('src');

  if (cover) {
    const previewImage = new Image();
    const previewSession = session;

    previewImage.onload = () => {
      if (activeDownloadSession !== previewSession) return;
      downloadProgressCover.src = cover;
      downloadProgressCover.alt = 'Prévia da mídia';
      downloadProgressCover.hidden = false;
      downloadProgressSource.classList.add('has-cover');
      downloadProgressSource.hidden = false;
    };

    previewImage.onerror = () => {
      if (activeDownloadSession !== previewSession) return;
      downloadProgressCover.removeAttribute('src');
      downloadProgressCover.hidden = true;
      downloadProgressSource.classList.remove('has-cover');
      downloadProgressSource.hidden = true;
    };

    previewImage.src = cover;
  }

  downloadProgressContentTitle.textContent = '';
  downloadProgressContentMeta.textContent = '';

  const row = document.createElement('article');
  row.className = 'download-progress-item download-progress-overall';

  const top = document.createElement('div');
  top.className = 'download-progress-item-top';
  const copy = document.createElement('div');
  copy.className = 'download-progress-item-copy';
  const label = document.createElement('strong');
  label.textContent = transfers.length > 1 ? 'PROGRESSO GERAL' : transfers[0].label;
  const status = document.createElement('span');
  status.textContent = 'PREPARANDO...';
  copy.append(label, status);
  const percent = document.createElement('strong');
  percent.className = 'download-progress-percent';
  percent.textContent = '';
  top.append(copy, percent);

  const track = document.createElement('div');
  track.className = 'download-progress-track is-indeterminate';
  const fill = document.createElement('span');
  track.append(fill);
  row.append(top, track);
  downloadProgressList.append(row);

  session.overallRow = row;
  session.overallStatusElement = status;
  session.overallPercentElement = percent;
  session.overallFillElement = fill;
  session.overallTrackElement = track;

  downloadScreen.hidden = false;
  downloadScreen.scrollTop = 0;
  document.body.classList.add('download-screen-open');
  updateDownloadOverall(session);
  return session;
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function pollWorkerDownloadProgress(progressId, transfer) {
  const deadline = Date.now() + (2 * 60 * 60 * 1000);
  let consecutiveErrors = 0;

  while (Date.now() < deadline) {
    if (transfer.cancelRequested || transfer.cancelled) return;
    try {
      const response = await fetch(`https://${WORKER_MEDIA_HOST}/progress?id=${encodeURIComponent(progressId)}`, {
        cache: 'no-store',
      });
      const data = await response.json();
      consecutiveErrors = 0;
      if (transfer.cancelRequested || transfer.cancelled) return;

      if (data.status === 'cancelled') {
        setDownloadTransferState(transfer, 'cancelled');
        return;
      }

      if (data.status === 'error') {
        // O fechamento da conexão e o finish() do Worker podem acontecer com poucos
        // milissegundos de diferença. Confirma uma vez antes de mostrar erro para
        // não transformar um download já entregue em falha visual no PC/mobile.
        await wait(450);
        const confirmResponse = await fetch(`https://${WORKER_MEDIA_HOST}/progress?id=${encodeURIComponent(progressId)}`, {
          cache: 'no-store',
        });
        const confirmed = await confirmResponse.json();
        if (confirmed.status === 'complete') {
          setDownloadTransferState(transfer, 'finalizing', { percent: 100 });
          if (!transfer.cancelRequested) setDownloadTransferState(transfer, 'complete', { percent: 100 });
          return;
        }
        if (confirmed.status !== 'error') {
          consecutiveErrors = 0;
          continue;
        }
        const terminalError = new Error(confirmed.error || data.error || 'A transferência foi interrompida.');
        terminalError.workerTerminal = true;
        throw terminalError;
      }

      if (data.status === 'complete') {
        setDownloadTransferState(transfer, 'finalizing', { percent: 100 });
        if (!transfer.cancelRequested) setDownloadTransferState(transfer, 'complete', { percent: 100 });
        return;
      }

      if (data.status === 'downloading') {
        const total = Number(data.total || 0);
        const sent = Number(data.sent || 0);
        const percent = total > 0 ? Math.min(100, (sent / total) * 100) : null;
        if (percent !== null && percent >= 100) {
          setDownloadTransferState(transfer, 'finalizing', { percent: 100 });
        } else {
          setDownloadTransferState(transfer, 'downloading', { percent });
        }
      } else {
        setDownloadTransferState(transfer, 'preparing');
      }
    } catch (error) {
      if (transfer.cancelRequested || transfer.cancelled) return;
      if (error?.workerTerminal) throw error;
      consecutiveErrors += 1;
      if (consecutiveErrors >= 8) throw error;
    }

    await wait(300);
  }
  throw new Error('O download demorou mais que o esperado.');
}

async function runWorkerTrackedDownload(transfer) {
  const progressId = createDownloadProgressId();
  transfer.progressId = progressId;
  const trackedUrl = mediaUrlWithProgress(transfer.mediaUrl, progressId);
  const frame = document.createElement('iframe');
  frame.hidden = true;
  frame.setAttribute('aria-hidden', 'true');
  transfer.frame = frame;
  frame.src = trackedUrl;
  document.body.append(frame);

  try {
    await pollWorkerDownloadProgress(progressId, transfer);
  } finally {
    if (transfer.frame === frame) transfer.frame = null;
    window.setTimeout(() => frame.remove(), 250);
  }
}

async function runFetchTrackedDownload(transfer) {
  setDownloadTransferState(transfer, 'preparing');
  const controller = new AbortController();
  transfer.abortController = controller;

  try {
    const response = await fetch(transfer.mediaUrl, { signal: controller.signal });
    if (!response.ok) {
      const directRoute = String(transfer.mediaUrl || '').startsWith('/api/direct-download?');
      if (directRoute && response.status === 409 && transfer.fallbackMediaUrl) {
        const fallbackError = new Error('DOWNLOAD_DIRECT_FALLBACK');
        fallbackError.directFallback = true;
        throw fallbackError;
      }
      throw new Error('Arquivo indisponível. Analise o link novamente.');
    }

    const total = Number(response.headers.get('Content-Length') || 0);
    const reader = response.body?.getReader?.();
    if (!reader) {
      setDownloadTransferState(transfer, 'downloading', { percent: null });
      const file = await response.blob();
      if (transfer.cancelRequested) return;
      setDownloadTransferState(transfer, 'finalizing', { percent: 100 });
      const objectUrl = URL.createObjectURL(file);
      const trigger = document.createElement('a');
      trigger.href = objectUrl;
      trigger.download = transfer.filename;
      document.body.append(trigger);
      trigger.click();
      trigger.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
      if (!transfer.cancelRequested) setDownloadTransferState(transfer, 'complete', { percent: 100 });
      return;
    }

    const chunks = [];
    let received = 0;
    setDownloadTransferState(transfer, 'downloading', { percent: total > 0 ? 0 : null });
    while (true) {
      if (transfer.cancelRequested) {
        await reader.cancel().catch(() => {});
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      chunks.push(value);
      received += value.byteLength;
      setDownloadTransferState(transfer, 'downloading', {
        percent: total > 0 ? Math.min(100, (received / total) * 100) : null,
      });
    }

    if (transfer.cancelRequested) return;
    setDownloadTransferState(transfer, 'finalizing', { percent: 100 });
    const file = new Blob(chunks, { type: response.headers.get('Content-Type') || 'application/octet-stream' });
    const objectUrl = URL.createObjectURL(file);
    const trigger = document.createElement('a');
    trigger.href = objectUrl;
    trigger.download = transfer.filename;
    document.body.append(trigger);
    trigger.click();
    trigger.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    if (!transfer.cancelRequested) setDownloadTransferState(transfer, 'complete', { percent: 100 });
  } finally {
    if (transfer.abortController === controller) transfer.abortController = null;
  }
}

async function runTrackedDownload(transfer) {
  if (transfer.cancelRequested || transfer.cancelled) return false;
  try {
    if (isWorkerMediaUrl(transfer.mediaUrl)) await runWorkerTrackedDownload(transfer);
    else await runFetchTrackedDownload(transfer);
    return !transfer.cancelled && !transfer.cancelRequested && !transfer.failed;
  } catch (error) {
    if (error?.directFallback && transfer.fallbackMediaUrl && !transfer.cancelRequested) {
      transfer.mediaUrl = transfer.fallbackMediaUrl;
      transfer.fallbackMediaUrl = '';
      setDownloadTransferState(transfer, 'preparing');
      try {
        if (isWorkerMediaUrl(transfer.mediaUrl)) await runWorkerTrackedDownload(transfer);
        else await runFetchTrackedDownload(transfer);
        return !transfer.cancelled && !transfer.cancelRequested && !transfer.failed;
      } catch (fallbackError) {
        error = fallbackError;
      }
    }
    if (transfer.cancelRequested || transfer.cancelled || error?.name === 'AbortError') {
      setDownloadTransferState(transfer, 'cancelled');
      return false;
    }
    const message = error?.message || 'Falha na transferência';
    const normalized = String(message).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (normalized.includes('expirou') || normalized.includes('analise a publicacao novamente') || normalized.includes('analise o video novamente')) {
      invalidateCachedAnalysis(activeRequest.url, activeRequest.tool === 'avatar' ? 'avatar' : 'media');
    }
    setDownloadTransferState(transfer, 'error', { error: message });
    return false;
  }
}


function absoluteDownloadUrl(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  try {
    return new URL(value, window.location.origin).href;
  } catch (_) {
    return value;
  }
}

function nativeDownloadMimeType(item) {
  const type = mediaTypeForDownload(item);
  if (type === 'video') return 'video/mp4';
  if (type === 'image') return 'image/jpeg';
  if (type === 'audio') return 'audio/mpeg';
  return 'application/octet-stream';
}

function canUseNativeDownloadBridge() {
  try {
    return isAndroidWebView()
      && Boolean(window.SoftAndroid)
      && typeof window.SoftAndroid.startDirectDownload === 'function';
  } catch (_) {
    return false;
  }
}

async function downloadAllMedia(items, button) {
  if (!Array.isArray(items) || items.length < 2) return;

  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'BAIXANDO…';
  hideDownloadStatus();

  const transfers = items.map((item, itemIndex) => {
    const filename = item.filename || `soft-download-${itemIndex + 1}`;
    const fallbackMediaUrl = proxyMediaUrl(item.url, item.source, item.proxy_id, true);
    const directMediaUrl = item.proxy_id ? directCdnDownloadUrl(item.proxy_id, filename) : '';
    const transfer = createDownloadTransfer(
      item, directMediaUrl || fallbackMediaUrl, filename, itemIndex, items.length
    );
    transfer.fallbackMediaUrl = directMediaUrl ? fallbackMediaUrl : '';
    return transfer;
  }).filter((transfer) => Boolean(transfer.mediaUrl));

  if (!transfers.length) {
    button.disabled = false;
    button.textContent = originalLabel;
    showDownloadStatus('Não foi possível preparar os arquivos.', true);
    return;
  }

  // WebApp Android: entrega cada arquivo diretamente ao serviço nativo.
  // Isso permite Pinterest em massa sem depender de Blob/downloads múltiplos
  // do WebView. Mantemos exatamente as mesmas URLs rápidas já usadas no site.
  if (canUseNativeDownloadBridge()) {
    const session = openDownloadProgressScreen(transfers);
    const downloadedItems = [];

    try {
      for (const transfer of transfers) {
        if (transfer.cancelRequested || transfer.cancelled) continue;

        try {
          const targetUrl = absoluteDownloadUrl(transfer.mediaUrl);
          if (!/^https?:\/\//i.test(targetUrl)) throw new Error('URL de download inválida.');

          window.SoftAndroid.startDirectDownload(
            targetUrl,
            transfer.filename,
            nativeDownloadMimeType(transfer.media)
          );

          setDownloadTransferState(transfer, 'complete', { percent: 100 });
          downloadedItems.push(historySnapshotForItem(transfer.media, transfer.index));
        } catch (error) {
          setDownloadTransferState(transfer, 'error', {
            error: error?.message || 'Não foi possível iniciar este arquivo no aplicativo.'
          });
        }

        // Espaçamento curto para o Android registrar cada download separadamente.
        await wait(350);
      }

      if (downloadedItems.length) {
        const firstItem = items[0] || null;
        rememberHistoryEntry(buildHistoryEntry(firstItem, {
          mode: 'all',
          count: downloadedItems.length,
          items: downloadedItems,
          filename: `${downloadedItems.length}-arquivos`,
        }));
      }
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
      updateDownloadOverall(session);
    }
    return;
  }

  const session = openDownloadProgressScreen(transfers);
  const tasks = [];
  try {
    for (const transfer of transfers) {
      tasks.push(runTrackedDownload(transfer));
      // Mantém o espaçamento já usado pelo SOFT para múltiplos downloads,
      // evitando que o navegador receba todas as requisições no mesmo instante.
      await wait(650);
    }

    const results = await Promise.all(tasks);
    const downloadedItems = transfers
      .filter((_, index) => results[index])
      .map((transfer) => historySnapshotForItem(transfer.media, transfer.index));

    if (downloadedItems.length) {
      const firstItem = items[0] || null;
      rememberHistoryEntry(buildHistoryEntry(firstItem, {
        mode: 'all',
        count: downloadedItems.length,
        items: downloadedItems,
        filename: `${downloadedItems.length}-arquivos`,
      }));
    }
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
    updateDownloadOverall(session);
  }
}

async function downloadMedia(mediaUrl, filename, button, historyEntry = null) {
  const originalLabel = button?.textContent;
  const item = historyEntry
    ? { ...historyEntry, filename: filename || historyEntry.filename }
    : (activeResultItems[0] || { filename });
  const fallbackMediaUrl = mediaUrl;
  const mode = historyEntry?.mode || button?.dataset?.mode || 'single';

  // MP3 e Thumbnail são arquivos gerados pelo Worker. Nesses modos jamais
  // substituímos a URL específica pelo CDN do arquivo original (vídeo).
  // Nos downloads normais a otimização direta continua exatamente como antes.
  const generatedMode = mode === 'mp3' || mode === 'thumbnail';
  const directMediaUrl = !generatedMode && item?.proxy_id
    ? directCdnDownloadUrl(item.proxy_id, filename || item.filename)
    : '';

  const transfer = createDownloadTransfer(item, directMediaUrl || fallbackMediaUrl, filename, 0, 1);
  transfer.fallbackMediaUrl = directMediaUrl ? fallbackMediaUrl : '';

  if (button) {
    button.disabled = true;
    button.textContent = 'BAIXANDO…';
  }
  hideDownloadStatus();
  const session = openDownloadProgressScreen([transfer]);

  try {
    const success = await runTrackedDownload(transfer);
    if (success) rememberHistoryEntry(historyEntry);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalLabel;
    }
    updateDownloadOverall(session);
  }
}

function showDownloadStatus(message, isError = false) {
  if (!downloadStatus) return;
  downloadStatus.hidden = false;
  downloadStatus.textContent = message;
  downloadStatus.classList.toggle('is-error', isError);
}

function hideDownloadStatus() {
  if (!downloadStatus) return;
  downloadStatus.hidden = true;
  downloadStatus.textContent = '';
  downloadStatus.classList.remove('is-error');
}

function showFormError(message) {
  note.className = 'form-note error';
  note.textContent = message;
}

function showMp3FormError(message) {
  mp3Note.className = 'form-note error';
  mp3Note.textContent = message;
}

function showMusicFormError(message) {
  musicNote.className = 'form-note error';
  musicNote.textContent = message;
}

function showThumbnailFormError(message) {
  thumbnailNote.className = 'form-note error';
  thumbnailNote.textContent = message;
}

function proxyThumbnailUrl(proxyId, download = false) {
  if (!proxyId) return '';
  const suffix = download ? '&dl=1' : '';
  return `https://${WORKER_MEDIA_HOST}/media?id=${encodeURIComponent(proxyId)}&thumb=1${suffix}`;
}

function proxyMp3Url(proxyId) {
  if (!proxyId) return '';
  return `https://${WORKER_MEDIA_HOST}/media?id=${encodeURIComponent(proxyId)}&mp3=1&dl=1`;
}

function proxyMp3PreviewUrl(proxyId) {
  if (!proxyId) return '';
  return `https://${WORKER_MEDIA_HOST}/media?id=${encodeURIComponent(proxyId)}&mp3=1`;
}

function proxyMediaUrl(url, source, proxyId, download = false) {
  const suffix = download ? '&dl=1' : '';
  if (proxyId) return `https://${WORKER_MEDIA_HOST}/media?id=${encodeURIComponent(proxyId)}${suffix}`;
  if (!source || source === 'direct') return url;
  if (source === 'tiktok' || source === 'youtube' || source === 'bilibili') return '';
  return `https://${WORKER_MEDIA_HOST}/media?url=${encodeURIComponent(url)}${suffix}`;
}

function youtubeDirectPlayerUrl(proxyId) {
  const params = new URLSearchParams({ id: String(proxyId || '') });
  return `https://${WORKER_MEDIA_HOST}/youtube-direct?${params.toString()}`;
}

function directCdnDownloadUrl(proxyId, filename) {
  if (!proxyId) return '';
  const params = new URLSearchParams({ id: proxyId });
  if (filename) params.set('filename', filename);
  return `/api/direct-download?${params.toString()}`;
}


// Ao abrir/recarregar o site, sempre começa na tela principal MÍDIAS.
// O hash antigo da sessão é substituído por #midias.
(() => {
  showAppView('tool');
  setActiveTool('media');
  setSectionHash('#midias');
})();


// =========================================================
// SOFT CRIAR — assistente guiado, sem IA e sem servidor.
// =========================================================
const createFlow = document.querySelector('#createFlow');
const createMessages = document.querySelector('#createMessages');
const createOptions = document.querySelector('#createOptions');
const createComposer = document.querySelector('#createComposer');
const createChat = document.querySelector('.create-chat');
const createShell = document.querySelector('.create-shell');
const createAnswerWrap = document.querySelector('#createAnswerWrap');
const createSendButton = document.querySelector('#createSendButton');
const createResetButton = document.querySelector('#createResetButton');
const createPreviewCard = document.querySelector('#createPreviewCard');
const createPreviewType = document.querySelector('#createPreviewType');
const createDocumentPreview = document.querySelector('#createDocumentPreview');
const createCopyButton = document.querySelector('#createCopyButton');
const createWhatsappButton = document.querySelector('#createWhatsappButton');
const createPrintButton = document.querySelector('#createPrintButton');
let createPreparedPdf = null;
let createPdfPreparePromise = null;
let createPdfPrepareVersion = 0;


// Mobile: mantém o composer acima do teclado virtual, como em apps de conversa.
// 100vh/100dvh sozinho não acompanha de forma consistente o teclado em todos os browsers.
let createViewportFrame = 0;
let createViewportTimers = [];

function createIsMobileViewport() {
  return window.matchMedia?.('(max-width: 900px)')?.matches ?? (window.innerWidth <= 900);
}

function createHasFocusedEditor() {
  const active = document.activeElement;
  return Boolean(active && createComposer?.contains(active) && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) && !active.disabled);
}

function createScrollConversationToBottom() {
  if (!createFlow) return;
  createFlow.scrollTop = createFlow.scrollHeight;
}

function clearCreateViewportTimers() {
  createViewportTimers.forEach((timer) => clearTimeout(timer));
  createViewportTimers = [];
}

function syncCreateMobileViewport({ keepBottom = false } = {}) {
  if (!createChat || !createShell || !createIsMobileViewport() || !document.body.classList.contains('create-chat-active')) {
    document.body.classList.remove('create-keyboard-open');
    document.documentElement.style.removeProperty('--create-mobile-chat-height');
    return;
  }

  const viewport = window.visualViewport;
  if (!viewport) return;

  cancelAnimationFrame(createViewportFrame);
  createViewportFrame = requestAnimationFrame(() => {
    const focused = createHasFocusedEditor();
    document.body.classList.toggle('create-keyboard-open', focused);

    // getBoundingClientRect() usa o viewport de layout; offsetTop informa quanto o
    // viewport visual foi deslocado pelo browser/teclado. O resultado é a altura
    // realmente disponível entre o topo do chat e o topo do teclado.
    const rect = createChat.getBoundingClientRect();
    const visualTop = Number(viewport.offsetTop || 0);
    const topInsideVisualViewport = Math.max(0, rect.top - visualTop);
    const available = Math.max(240, Math.floor(viewport.height - topInsideVisualViewport));
    document.documentElement.style.setProperty('--create-mobile-chat-height', `${available}px`);

    if (focused || keepBottom) createScrollConversationToBottom();
  });
}

function settleCreateMobileKeyboard() {
  clearCreateViewportTimers();
  syncCreateMobileViewport({ keepBottom: true });
  // Android/Samsung/iOS animam o teclado; recalculamos durante e após a animação.
  [60, 180, 320].forEach((delay) => {
    createViewportTimers.push(setTimeout(() => syncCreateMobileViewport({ keepBottom: true }), delay));
  });
}

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => syncCreateMobileViewport({ keepBottom: createHasFocusedEditor() }), { passive: true });
  window.visualViewport.addEventListener('scroll', () => syncCreateMobileViewport({ keepBottom: createHasFocusedEditor() }), { passive: true });
}
window.addEventListener('resize', () => syncCreateMobileViewport({ keepBottom: createHasFocusedEditor() }), { passive: true });
window.addEventListener('orientationchange', () => {
  clearCreateViewportTimers();
  createViewportTimers.push(setTimeout(() => syncCreateMobileViewport({ keepBottom: true }), 180));
}, { passive: true });

document.addEventListener('focusin', (event) => {
  if (!createComposer?.contains(event.target)) return;
  settleCreateMobileKeyboard();
});

document.addEventListener('focusout', (event) => {
  if (!createComposer?.contains(event.target)) return;
  clearCreateViewportTimers();
  createViewportTimers.push(setTimeout(() => {
    syncCreateMobileViewport({ keepBottom: false });
    if (!createHasFocusedEditor()) document.body.classList.remove('create-keyboard-open');
  }, 180));
});

const CREATE_TYPES = {
  receipt: {
    title: 'RECIBO',
    intro: 'Certo. Vamos criar um recibo completo e pronto para impressão.',
    fields: [
      { key: 'receiver', label: 'Quem recebeu o pagamento?', placeholder: 'Nome completo ou razão social' },
      { key: 'receiverDoc', kind: 'documentId', label: 'Informe o CPF ou CNPJ de quem recebeu.', placeholder: 'CPF ou CNPJ' },
      { key: 'receiverAddress', kind: 'address', label: 'Deseja incluir o endereço de quem recebeu?', addressLabel: 'recebedor', optional: true },
      { key: 'payer', label: 'Quem realizou o pagamento?', placeholder: 'Nome completo ou razão social' },
      { key: 'payerDoc', kind: 'documentId', label: 'Informe o CPF ou CNPJ de quem pagou.', placeholder: 'CPF ou CNPJ' },
      { key: 'amount', kind: 'currency', inputMode: 'decimal', label: 'Qual foi o valor recebido?', placeholder: 'Ex.: 1.200,00' },
      { key: 'reason', label: 'O pagamento foi referente a quê?', placeholder: 'Ex.: Instalação de ar-condicionado' },
      { key: 'method', label: 'Como o pagamento foi realizado?', placeholder: 'Digite ou escolha uma opção', options: ['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Transferência', 'Boleto'] },
      { key: 'paymentRef', label: 'Existe alguma referência, pedido, contrato ou identificação do pagamento?', placeholder: 'Ex.: Pedido 1042', optional: true },
      { key: 'place', kind: 'place', label: 'Em qual cidade/UF o recibo será emitido?', placeholder: 'Ex.: Manaus/AM' },
      { key: 'issueDate', kind: 'date', label: 'Qual é a data de emissão?', placeholder: 'Selecione ou informe a data' },
      { key: 'signatureName', kind: 'signatureName', label: 'Qual nome deve aparecer na assinatura?', placeholder: 'Nome de quem assina' },
      { key: 'signatureStyle', kind: 'signatureStyle', label: 'Escolha o estilo da assinatura.' }
    ]
  },
  budget: {
    title: 'ORÇAMENTO',
    intro: 'Certo. Vamos montar um orçamento completo, com identificação, itens e condições.',
    fields: [
      { key: 'provider', label: 'Quem está emitindo o orçamento?', placeholder: 'Profissional ou empresa' },
      { key: 'providerDoc', kind: 'documentId', label: 'Informe o CPF ou CNPJ do emitente.', placeholder: 'CPF ou CNPJ' },
      { key: 'providerAddress', kind: 'address', label: 'Agora vamos localizar o endereço do emitente.', addressLabel: 'emitente', optional: false },
      { key: 'contact', label: 'Qual contato comercial deve aparecer no orçamento?', placeholder: 'Telefone, WhatsApp ou e-mail' },
      { key: 'client', label: 'Para quem é o orçamento?', placeholder: 'Nome do cliente ou empresa' },
      { key: 'clientDoc', kind: 'documentId', label: 'Informe o CPF ou CNPJ do cliente.', placeholder: 'CPF ou CNPJ' },
      { key: 'clientAddress', kind: 'address', label: 'Deseja incluir o endereço do cliente?', addressLabel: 'cliente', optional: true },
      { key: 'items', kind: 'budgetItems', label: 'Agora vamos adicionar os itens do orçamento.' },
      { key: 'deadline', label: 'Qual é o prazo previsto para execução ou entrega?', placeholder: 'Ex.: até 5 dias úteis' },
      { key: 'validity', label: 'Por quanto tempo este orçamento será válido?', placeholder: 'Ex.: 7 dias' },
      { key: 'paymentTerms', label: 'Quais são as condições de pagamento?', placeholder: 'Ex.: 50% na aprovação e 50% na entrega' },
      { key: 'note', label: 'Deseja acrescentar alguma observação?', placeholder: 'Observações adicionais', multiline: true, optional: true },
      { key: 'place', kind: 'place', label: 'Em qual cidade/UF o orçamento será emitido?', placeholder: 'Ex.: Manaus/AM' },
      { key: 'issueDate', kind: 'date', label: 'Qual é a data de emissão?', placeholder: 'Selecione ou informe a data' },
      { key: 'signatureName', kind: 'signatureName', label: 'Qual nome deve aparecer na assinatura?', placeholder: 'Nome de quem assina' },
      { key: 'signatureStyle', kind: 'signatureStyle', label: 'Escolha o estilo da assinatura.' }
    ]
  },
  declaration: {
    title: 'DECLARAÇÃO',
    intro: 'Certo. Vamos preparar uma declaração completa e bem identificada.',
    fields: [
      { key: 'name', label: 'Quem está fazendo a declaração?', placeholder: 'Nome completo' },
      { key: 'document', kind: 'documentId', label: 'Informe o CPF ou CNPJ do declarante.', placeholder: 'CPF ou CNPJ' },
      { key: 'rg', label: 'Deseja incluir RG ou outro documento de identificação?', placeholder: 'RG ou outro documento', optional: true },
      { key: 'address', kind: 'address', label: 'Agora vamos localizar o endereço do declarante.', addressLabel: 'declarante', optional: false },
      { key: 'statement', label: 'Escreva o texto completo da declaração exatamente como deseja que apareça no documento.', placeholder: 'Digite a declaração completa com suas próprias palavras', multiline: true },
      { key: 'purpose', label: 'Escreva a finalidade exatamente como deseja que apareça no documento.', placeholder: 'Ex.: Comprovação da prestação e conclusão dos serviços realizados.', multiline: true },
      { key: 'place', kind: 'place', label: 'Em qual cidade/UF a declaração será emitida?', placeholder: 'Ex.: Manaus/AM' },
      { key: 'issueDate', kind: 'date', label: 'Qual é a data da declaração?', placeholder: 'Selecione ou informe a data' },
      { key: 'signatureName', kind: 'signatureName', label: 'Qual nome deve aparecer na assinatura?', placeholder: 'Nome de quem assina' },
      { key: 'signatureStyle', kind: 'signatureStyle', label: 'Escolha o estilo da assinatura.' }
    ]
  },
  prices: {
    title: 'LISTA DE PREÇOS',
    intro: 'Certo. Vamos organizar uma lista de preços com identificação e informações comerciais.',
    fields: [
      { key: 'name', label: 'Qual nome, marca ou empresa deve aparecer?', placeholder: 'Nome da marca ou negócio' },
      { key: 'document', kind: 'documentId', label: 'Informe o CPF ou CNPJ do responsável ou empresa.', placeholder: 'CPF ou CNPJ' },
      { key: 'contact', label: 'Qual contato deve aparecer na lista de preços?', placeholder: 'Telefone, WhatsApp ou e-mail' },
      { key: 'address', kind: 'address', label: 'Deseja incluir um endereço comercial?', addressLabel: 'estabelecimento', optional: true },
      { key: 'items', kind: 'priceItems', label: 'Agora vamos adicionar os produtos ou serviços da lista de preços.' },
      { key: 'validity', label: 'Qual é a validade ou período destes preços?', placeholder: 'Ex.: válidos até 31/12/2026' },
      { key: 'note', label: 'Quer adicionar uma observação?', placeholder: 'Ex.: Valores sujeitos a alteração', multiline: true, optional: true },
      { key: 'place', kind: 'place', label: 'Em qual cidade/UF esta lista foi emitida?', placeholder: 'Ex.: Manaus/AM' },
      { key: 'issueDate', kind: 'date', label: 'Qual é a data de emissão?', placeholder: 'Selecione ou informe a data' }
    ]
  },
  proof: {
    title: 'COMPROVANTE',
    intro: 'Certo. Vamos criar um comprovante completo e formal.',
    fields: [
      { key: 'issuer', label: 'Quem está emitindo o comprovante?', placeholder: 'Pessoa ou empresa' },
      { key: 'issuerDoc', kind: 'documentId', label: 'Informe o CPF ou CNPJ do emitente.', placeholder: 'CPF ou CNPJ' },
      { key: 'issuerAddress', kind: 'address', label: 'Deseja incluir o endereço do emitente?', addressLabel: 'emitente', optional: true },
      { key: 'recipient', label: 'Para quem o comprovante será emitido?', placeholder: 'Pessoa ou empresa' },
      { key: 'recipientDoc', kind: 'documentId', label: 'Informe o CPF ou CNPJ do destinatário.', placeholder: 'CPF ou CNPJ' },
      { key: 'subject', label: 'Escreva exatamente o que este comprovante deve registrar.', placeholder: 'Digite o registro completo com suas próprias palavras', multiline: true },
      { key: 'amount', kind: 'currency', inputMode: 'decimal', label: 'Existe algum valor relacionado?', placeholder: 'Ex.: 500,00', optional: true },
      { key: 'method', label: 'Existe forma de pagamento relacionada?', placeholder: 'Digite ou escolha uma opção', options: ['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Transferência', 'Boleto'], optional: true },
      { key: 'reference', label: 'Existe código, pedido, contrato ou outra referência?', placeholder: 'Ex.: Pedido 1042', optional: true },
      { key: 'place', kind: 'place', label: 'Em qual cidade/UF o comprovante será emitido?', placeholder: 'Ex.: Manaus/AM' },
      { key: 'issueDate', kind: 'date', label: 'Qual é a data de emissão?', placeholder: 'Selecione ou informe a data' },
      { key: 'signatureName', kind: 'signatureName', label: 'Qual nome deve aparecer na assinatura?', placeholder: 'Nome de quem assina' },
      { key: 'signatureStyle', kind: 'signatureStyle', label: 'Escolha o estilo da assinatura.' }
    ]
  },
  label: {
    title: 'ETIQUETA',
    intro: 'Certo. Vamos montar uma etiqueta de envio completa, com endereço validado por CEP ou pesquisa.',
    fields: [
      { key: 'recipient', label: 'Qual é o nome do destinatário?', placeholder: 'Nome completo ou empresa' },
      { key: 'recipientDoc', kind: 'documentId', label: 'Deseja incluir CPF ou CNPJ do destinatário?', placeholder: 'CPF ou CNPJ', optional: true },
      { key: 'recipientPhone', label: 'Deseja incluir telefone do destinatário?', placeholder: 'Telefone ou WhatsApp', optional: true },
      { key: 'recipientAddress', kind: 'address', label: 'Agora vamos localizar o endereço do destinatário.', addressLabel: 'destinatário', optional: false },
      { key: 'sender', label: 'Qual é o nome do remetente?', placeholder: 'Nome completo ou empresa' },
      { key: 'senderDoc', kind: 'documentId', label: 'Deseja incluir CPF ou CNPJ do remetente?', placeholder: 'CPF ou CNPJ', optional: true },
      { key: 'senderPhone', label: 'Deseja incluir telefone do remetente?', placeholder: 'Telefone ou WhatsApp', optional: true },
      { key: 'senderAddress', kind: 'address', label: 'Agora vamos localizar o endereço do remetente.', addressLabel: 'remetente', optional: false },
      { key: 'note', label: 'Deseja adicionar alguma observação de envio?', placeholder: 'Ex.: FRÁGIL', optional: true }
    ]
  }
};

let createState = {
  type: null,
  step: 0,
  answers: {},
  finalText: '',
  addressFlow: null,
  itemFlow: null
};

function createEscape(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function addCreateMessage(text, who = 'bot') {
  if (!createMessages) return;
  const message = document.createElement('div');
  message.className = `create-message ${who}`;
  message.textContent = text;
  createMessages.appendChild(message);
  requestAnimationFrame(() => {
    if (createFlow) createFlow.scrollTop = createFlow.scrollHeight;
  });
}

function createQuickOptionLabel(option) {
  return typeof option === 'string' ? option : String(option?.label || option?.value || '');
}
function createQuickOptionValue(option) {
  return typeof option === 'string' ? option : String(option?.value ?? option?.label ?? '');
}
function clearCreateInlineOptions() {
  createMessages?.querySelectorAll('.create-inline-keyboard').forEach((keyboard) => keyboard.remove());
}
function renderCreateInlineOptions(options = []) {
  if (!createMessages || !options.length) return;
  clearCreateInlineOptions();
  const keyboard = document.createElement('div');
  keyboard.className = 'create-inline-keyboard';
  options.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'create-inline-option';
    button.dataset.createQuickValue = createQuickOptionValue(option);
    button.dataset.createQuickLabel = createQuickOptionLabel(option);
    button.textContent = createQuickOptionLabel(option);
    if (option && typeof option === 'object' && option.signatureFont) {
      button.style.fontFamily = option.signatureFont;
      button.style.fontSize = '20px';
      button.style.fontWeight = option.signatureWeight || '400';
      button.style.fontStyle = option.signatureItalic ? 'italic' : 'normal';
      button.style.letterSpacing = option.signatureSpacing || '0';
      button.style.paddingTop = '10px';
      button.style.paddingBottom = '10px';
    }
    keyboard.appendChild(button);
  });
  createMessages.appendChild(keyboard);
  requestAnimationFrame(() => {
    if (createFlow) createFlow.scrollTop = createFlow.scrollHeight;
  });
}
function setCreateInput(field) {
  if (!createAnswerWrap || !createComposer) return;
  createAnswerWrap.innerHTML = '';
  createComposer.classList.remove('create-options-only');
  const options = [...(field.options || [])];
  if (field.optional && !options.some(option => createQuickOptionValue(option) === '-')) options.push({ label: 'NÃO INFORMAR', value: '-' });
  renderCreateInlineOptions(options);

  if (field.onlyOptions) {
    createComposer.hidden = true;
    if (createSendButton) createSendButton.disabled = true;
    return;
  }

  const useTextarea = field.multiline || !field.inputType || field.inputType === 'text';
  const control = document.createElement(useTextarea ? 'textarea' : 'input');
  if (!useTextarea) control.type = field.inputType || 'text';
  control.placeholder = field.placeholder || 'Digite aqui...';
  control.autocomplete = field.autocomplete || 'off';
  if (field.inputMode) control.inputMode = field.inputMode;
  if (field.maxlength) control.maxLength = field.maxlength;
  control.id = 'createAnswer';
  control.name = 'createAnswer';
  if (useTextarea) {
    control.rows = 1;
    control.classList.add('create-auto-grow');
    const resizeComposerField = () => {
      control.style.height = 'auto';
      const maxHeight = 132;
      const nextHeight = Math.max(40, Math.min(control.scrollHeight, maxHeight));
      control.style.height = `${nextHeight}px`;
      control.style.overflowY = control.scrollHeight > maxHeight ? 'auto' : 'hidden';
    };
    control.addEventListener('input', resizeComposerField);
    control.addEventListener('keydown', (event) => {
      if (event.isComposing || event.key !== 'Enter') return;
      if (event.shiftKey) {
        // Shift + Enter mantém a quebra de linha, como WhatsApp/Telegram.
        requestAnimationFrame(resizeComposerField);
        return;
      }
      event.preventDefault();
      createComposer.requestSubmit();
    });
    requestAnimationFrame(resizeComposerField);
  }
  createAnswerWrap.appendChild(control);
  createComposer.hidden = false;
  if (createSendButton) createSendButton.disabled = false;
  requestAnimationFrame(() => {
    syncCreateMobileViewport({ keepBottom: true });
    // No PC, mantém a digitação contínua entre uma pergunta e outra.
    // No mobile, não abre o teclado automaticamente.
    if (!createIsMobileViewport() && !control.disabled) {
      try { control.focus({ preventScroll: true }); } catch { control.focus(); }
    }
  });
}
function setCreateComposerIdle(message = 'Escolha uma opção acima') {
  if (!createAnswerWrap || !createComposer) return;
  createAnswerWrap.innerHTML = '';
  createComposer.classList.remove('create-options-only');
  const control = document.createElement('input');
  control.id = 'createAnswer';
  control.type = 'text';
  control.placeholder = message;
  control.disabled = true;
  createAnswerWrap.appendChild(control);
  createComposer.hidden = false;
  if (createSendButton) createSendButton.disabled = true;
}
function createTodayIsoValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
function createAddressLocationSuggestions() {
  const seen = new Set();
  const suggestions = [];
  Object.values(createState.answers || {}).forEach((value) => {
    if (!value || typeof value !== 'object' || !value.city || !value.uf) return;
    const label = `${value.city}/${value.uf}`;
    const key = label.toLocaleLowerCase('pt-BR');
    if (!seen.has(key)) {
      seen.add(key);
      suggestions.push({ label: `USAR ${label.toLocaleUpperCase('pt-BR')}`, value: label });
    }
  });
  return suggestions;
}
function createDefaultSignatureName() {
  const a = createState.answers || {};
  if (createState.type === 'receipt') return createNaturalName(a.receiver || '');
  if (createState.type === 'budget') return createNaturalName(a.provider || '');
  if (createState.type === 'declaration') return createNaturalName(a.name || '');
  if (createState.type === 'proof') return createNaturalName(a.issuer || '');
  return '';
}

const CREATE_SIGNATURE_STYLES = {
  classic: {
    label: 'CLÁSSICA',
    font: '"Brush Script MT", "Segoe Script", cursive',
    canvasFont: '72px "Brush Script MT", "Segoe Script", cursive',
    weight: '400', italic: false
  },
  elegant: {
    label: 'ELEGANTE',
    font: 'Georgia, "Times New Roman", serif',
    canvasFont: 'italic 68px Georgia, "Times New Roman", serif',
    weight: '400', italic: true
  },
  modern: {
    label: 'MODERNA',
    font: '"Segoe Print", "Comic Sans MS", cursive',
    canvasFont: '62px "Segoe Print", "Comic Sans MS", cursive',
    weight: '400', italic: false
  },
  formal: {
    label: 'FORMAL',
    font: 'Georgia, "Times New Roman", serif',
    canvasFont: 'italic 700 58px Georgia, "Times New Roman", serif',
    weight: '700', italic: true
  }
};

function createSignatureStyleOptions(name) {
  const sample = createNaturalName(name || '') || 'Sua assinatura';
  return Object.entries(CREATE_SIGNATURE_STYLES).map(([value, style]) => ({
    label: sample,
    value,
    signatureFont: style.font,
    signatureWeight: style.weight,
    signatureItalic: style.italic,
    signatureSpacing: value === 'modern' ? '0.2px' : '0'
  }));
}

function createSignaturePreviewMarkup(name, role) {
  const key = createState.answers?.signatureStyle || 'classic';
  const style = CREATE_SIGNATURE_STYLES[key] || CREATE_SIGNATURE_STYLES.classic;
  const signedName = createNaturalName(createState.answers?.signatureName || name || '');
  const css = `font-family:${style.font};font-size:24px;font-weight:${style.weight};font-style:${style.italic ? 'italic' : 'normal'};line-height:1.05;`;
  return `<div class="doc-signature"><span></span><b style="${css}">${createEscape(signedName)}</b><small>${createEscape(String(role || '').toUpperCase())}</small></div>`;
}

function isValidCreateCpf(value = '') {
  const digits = String(value).replace(/\D/g, '');
  if (!/^\d{11}$/.test(digits) || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(digits[i]) * (10 - i);
  let d1 = (sum * 10) % 11; if (d1 === 10) d1 = 0;
  if (d1 !== Number(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(digits[i]) * (11 - i);
  let d2 = (sum * 10) % 11; if (d2 === 10) d2 = 0;
  return d2 === Number(digits[10]);
}

function isValidCreateCnpj(value = '') {
  const digits = String(value).replace(/\D/g, '');
  if (!/^\d{14}$/.test(digits) || /^(\d)\1+$/.test(digits)) return false;
  const calc = (base, weights) => {
    const sum = base.split('').reduce((acc, n, i) => acc + Number(n) * weights[i], 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(digits.slice(0, 12), [5,4,3,2,9,8,7,6,5,4,3,2]);
  const d2 = calc(digits.slice(0, 12) + d1, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  return d1 === Number(digits[12]) && d2 === Number(digits[13]);
}

function isValidCreateDocumentId(value = '') {
  const digits = String(value).replace(/\D/g, '');
  return digits.length === 11 ? isValidCreateCpf(digits) : digits.length === 14 ? isValidCreateCnpj(digits) : false;
}


function createItemFlowPrompt(flow) {
  const isBudget = flow.mode === 'budget';
  if (flow.stage === 'description') {
    addCreateMessage(isBudget ? 'Qual é o produto ou serviço?' : 'Qual é o nome do produto ou serviço?', 'bot');
    setCreateInput({ placeholder: isBudget ? 'Ex.: Instalação de ar-condicionado' : 'Ex.: Corte de cabelo' });
    return;
  }
  if (flow.stage === 'quantity') {
    addCreateMessage('Qual é a quantidade?', 'bot');
    setCreateInput({ placeholder: 'Ex.: 1', inputMode: 'decimal' });
    return;
  }
  if (flow.stage === 'unitPrice') {
    addCreateMessage('Qual é o valor unitário?', 'bot');
    setCreateInput({ placeholder: 'Ex.: 350,00', inputMode: 'decimal' });
    return;
  }
  if (flow.stage === 'detail') {
    addCreateMessage('Deseja informar unidade, tamanho ou algum detalhe deste item?', 'bot');
    setCreateInput({ placeholder: 'Ex.: unidade, 500 ml, tamanho M', optional: true });
    return;
  }
  if (flow.stage === 'price') {
    addCreateMessage('Qual é o preço deste item?', 'bot');
    setCreateInput({ placeholder: 'Ex.: 35,00', inputMode: 'decimal' });
    return;
  }
  if (flow.stage === 'more') {
    addCreateMessage(flow.items.length === 1 ? 'Item adicionado. Deseja incluir mais um?' : `${flow.items.length} itens adicionados. Deseja incluir outro?`, 'bot');
    setCreateInput({ onlyOptions: true, options: [
      { label: 'ADICIONAR OUTRO', value: 'add' },
      { label: 'FINALIZAR ITENS', value: 'finish' }
    ] });
  }
}

function startCreateItemFlow(field) {
  const mode = field.kind === 'budgetItems' ? 'budget' : 'prices';
  createState.itemFlow = { field, mode, stage: 'description', current: {}, items: [] };
  addCreateMessage(field.label, 'bot');
  createItemFlowPrompt(createState.itemFlow);
}

function finishCreateItemFlow() {
  const flow = createState.itemFlow;
  if (!flow) return;
  createState.answers[flow.field.key] = flow.items.slice();
  createState.itemFlow = null;
  createState.step += 1;
  askCreateField();
}

function addCurrentCreateItem(flow) {
  if (flow.mode === 'budget') {
    const quantity = Number(String(flow.current.quantity || '1').replace(',', '.')) || 1;
    const unitNumber = parseCreateCurrencyNumber(flow.current.unitPrice);
    if (unitNumber === null || unitNumber < 0) return false;
    flow.items.push({
      description: createNaturalSentence(flow.current.description),
      quantityLabel: String(flow.current.quantity || '1'),
      quantity,
      unitPrice: formatCreateCurrency(String(unitNumber)),
      unitNumber,
      totalNumber: quantity * unitNumber,
      total: formatCreateCurrency(String(quantity * unitNumber))
    });
  } else {
    const priceNumber = parseCreateCurrencyNumber(flow.current.price);
    if (priceNumber === null || priceNumber < 0) return false;
    flow.items.push({
      name: createNaturalSentence(flow.current.description),
      detail: createNaturalSentence(flow.current.detail || ''),
      price: formatCreateCurrency(String(priceNumber)),
      priceNumber
    });
  }
  flow.current = {};
  flow.stage = 'more';
  return true;
}

async function handleCreateItemSubmission(rawValue, displayValue = '') {
  const flow = createState.itemFlow;
  if (!flow) return;
  const value = normalCreateValue(rawValue);
  const display = displayValue || value || 'Não informar';

  if (flow.stage === 'more') {
    addCreateMessage(display, 'user');
    if (value === 'add') {
      flow.stage = 'description';
      createItemFlowPrompt(flow);
    } else {
      finishCreateItemFlow();
    }
    return;
  }

  if (flow.stage === 'description') {
    if (!value || value === '-') return;
    flow.current.description = value;
    addCreateMessage(display, 'user');
    flow.stage = flow.mode === 'budget' ? 'quantity' : 'detail';
    createItemFlowPrompt(flow);
    return;
  }

  if (flow.stage === 'quantity') {
    const quantity = Number(String(value).replace(',', '.'));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      addCreateMessage('Informe uma quantidade maior que zero.', 'bot');
      createItemFlowPrompt(flow);
      return;
    }
    flow.current.quantity = String(value);
    addCreateMessage(display, 'user');
    flow.stage = 'unitPrice';
    createItemFlowPrompt(flow);
    return;
  }

  if (flow.stage === 'unitPrice') {
    const number = parseCreateCurrencyNumber(value);
    if (number === null || number < 0) {
      addCreateMessage('Informe um valor válido, por exemplo 350,00.', 'bot');
      createItemFlowPrompt(flow);
      return;
    }
    flow.current.unitPrice = value;
    addCreateMessage(formatCreateCurrency(String(number)), 'user');
    if (!addCurrentCreateItem(flow)) return;
    createItemFlowPrompt(flow);
    return;
  }

  if (flow.stage === 'detail') {
    flow.current.detail = value === '-' ? '' : value;
    addCreateMessage(value === '-' ? 'Não informar' : display, 'user');
    flow.stage = 'price';
    createItemFlowPrompt(flow);
    return;
  }

  if (flow.stage === 'price') {
    const number = parseCreateCurrencyNumber(value);
    if (number === null || number < 0) {
      addCreateMessage('Informe um preço válido, por exemplo 35,00.', 'bot');
      createItemFlowPrompt(flow);
      return;
    }
    flow.current.price = value;
    addCreateMessage(formatCreateCurrency(String(number)), 'user');
    if (!addCurrentCreateItem(flow)) return;
    createItemFlowPrompt(flow);
  }
}

function askCreateField() {
  const config = CREATE_TYPES[createState.type];
  if (!config) return;
  if (createState.step >= config.fields.length) { finishCreateDocument(); return; }
  const field = config.fields[createState.step];
  if (field.kind === 'address') { startCreateAddressFlow(field); return; }
  if (field.kind === 'budgetItems' || field.kind === 'priceItems') { startCreateItemFlow(field); return; }
  let inputField = { ...field };
  if (field.kind === 'date') inputField = { ...inputField, inputType: 'date', options: [{ label: 'HOJE', value: createTodayIsoValue() }] };
  if (field.kind === 'place') inputField = { ...inputField, options: createAddressLocationSuggestions() };
  if (field.kind === 'documentId') inputField = { ...inputField, inputMode: 'numeric', maxlength: 18 };
  if (field.kind === 'signatureName') {
    const suggested = createDefaultSignatureName();
    if (suggested) inputField.options = [{ label: `USAR ${suggested.toLocaleUpperCase('pt-BR')}`, value: suggested }];
  }
  if (field.kind === 'signatureStyle') {
    const signatureName = createState.answers.signatureName || createDefaultSignatureName();
    addCreateMessage(`${field.label}
Toque no seu nome no estilo que preferir.`, 'bot');
    setCreateInput({ onlyOptions: true, options: createSignatureStyleOptions(signatureName) });
    return;
  }
  addCreateMessage(field.label, 'bot');
  setCreateInput(inputField);
}
function startCreateFlow(type) {
  const config = CREATE_TYPES[type];
  if (!config) return;
  createState = { type, step: 0, answers: {}, finalText: '', addressFlow: null, itemFlow: null };
  createOptions?.querySelectorAll('.create-option').forEach((button) => button.classList.toggle('is-selected', button.dataset.createType === type));
  if (createMessages) createMessages.innerHTML = '';
  if (createPreviewCard) createPreviewCard.hidden = true;
  if (createOptions) createOptions.hidden = true;
  if (createResetButton) createResetButton.hidden = false;
  addCreateMessage(config.title, 'user');
  addCreateMessage(config.intro, 'bot');
  askCreateField();
  requestAnimationFrame(() => syncCreateMobileViewport({ keepBottom: true }));
}

function normalCreateValue(value) {
  const clean = String(value || '').trim();
  return clean === '-' ? '' : clean;
}


function formatCreateDocumentId(value = '') {
  const clean = String(value || '').trim();
  if (!clean) return '';
  const digits = clean.replace(/\D/g, '');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return clean;
}
function normalizeCreateCep(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : '';
}
function normalizeCreateAddress(data = {}) {
  return {
    cep: normalizeCreateCep(data.cep || data.zipcode || ''),
    street: String(data.logradouro || data.street || '').trim(),
    neighborhood: String(data.bairro || data.neighborhood || '').trim(),
    city: String(data.localidade || data.city || '').trim(),
    uf: String(data.uf || data.state || '').trim().toLocaleUpperCase('pt-BR'),
    number: String(data.number || '').trim(),
    complement: String(data.complement || '').trim()
  };
}
function formatCreateAddress(address, multiline = true) {
  if (!address || typeof address !== 'object') return '';
  const first = [address.street, address.number ? `nº ${address.number}` : ''].filter(Boolean).join(', ');
  const second = [address.complement, address.neighborhood].filter(Boolean).join(' — ');
  const third = [address.city && address.uf ? `${address.city}/${address.uf}` : address.city || address.uf, address.cep ? `CEP ${address.cep}` : ''].filter(Boolean).join(' — ');
  return [first, second, third].filter(Boolean).join(multiline ? '\n' : ' · ');
}
async function fetchCreateJson(url, timeout = 6500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}
async function lookupCreateCep(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 8) throw new Error('CEP_INVALIDO');
  try {
    const via = await fetchCreateJson(`https://viacep.com.br/ws/${digits}/json/`);
    if (!via?.erro) return normalizeCreateAddress(via);
  } catch {}
  try {
    const brasil = await fetchCreateJson(`https://brasilapi.com.br/api/cep/v2/${digits}`);
    if (brasil?.cep) return normalizeCreateAddress(brasil);
  } catch {}
  throw new Error('CEP_NAO_ENCONTRADO');
}
async function searchCreateAddress({ uf, city, street, neighborhood = '' }) {
  const state = String(uf || '').trim().toLocaleUpperCase('pt-BR');
  const locality = String(city || '').trim();
  const road = String(street || '').trim();
  if (!/^[A-Z]{2}$/.test(state) || locality.length < 3 || road.length < 3) throw new Error('BUSCA_INVALIDA');
  const url = `https://viacep.com.br/ws/${encodeURIComponent(state)}/${encodeURIComponent(locality)}/${encodeURIComponent(road)}/json/`;
  const data = await fetchCreateJson(url);
  const list = Array.isArray(data) ? data.map(normalizeCreateAddress).filter(item => item.city && item.uf) : [];
  const hint = String(neighborhood || '').trim().toLocaleLowerCase('pt-BR');
  const filtered = hint ? list.filter(item => item.neighborhood.toLocaleLowerCase('pt-BR').includes(hint)) : list;
  return (filtered.length ? filtered : list).slice(0, 8);
}
function createAddressOptionLabel(address) {
  return [address.street || 'Logradouro não informado', address.neighborhood, `${address.city}/${address.uf}`, address.cep].filter(Boolean).join(' — ');
}
function renderCreateAddressStage() {
  const flow = createState.addressFlow;
  if (!flow) return;
  const role = flow.field.addressLabel || 'endereço';
  if (flow.stage === 'mode') {
    addCreateMessage(`Como você quer localizar o endereço do ${role}?`, 'bot');
    const options = [{ label: 'USAR CEP', value: 'cep' }, { label: 'PROCURAR ENDEREÇO', value: 'search' }];
    if (flow.field.optional) options.push({ label: 'NÃO INFORMAR', value: 'skip' });
    setCreateInput({ onlyOptions: true, options }); return;
  }
  if (flow.stage === 'cep') { addCreateMessage('Digite o CEP com 8 números. Vou preencher rua, bairro, cidade e UF automaticamente.', 'bot'); setCreateInput({ placeholder: 'Ex.: 69036-110', inputMode: 'numeric' }); return; }
  if (flow.stage === 'confirm') { addCreateMessage(`Encontrei:\n${formatCreateAddress(flow.data)}\n\nConfirme se este é o endereço correto.`, 'bot'); setCreateInput({ onlyOptions: true, options: [{ label: 'ESTÁ CORRETO', value: 'yes' }, { label: 'PROCURAR OUTRO', value: 'again' }] }); return; }
  if (flow.stage === 'searchUf') { addCreateMessage('Informe a UF com duas letras.', 'bot'); setCreateInput({ placeholder: 'Ex.: AM', maxlength: 2 }); return; }
  if (flow.stage === 'searchCity') { addCreateMessage('Qual é a cidade?', 'bot'); setCreateInput({ placeholder: 'Ex.: Manaus' }); return; }
  if (flow.stage === 'searchNeighborhood') { addCreateMessage('Qual é o bairro? Se não souber, escolha NÃO SEI.', 'bot'); setCreateInput({ placeholder: 'Ex.: Compensa', options: [{ label: 'NÃO SEI', value: '-' }] }); return; }
  if (flow.stage === 'searchStreet') { addCreateMessage('Digite pelo menos parte do nome da rua, avenida ou logradouro. Vou mostrar as opções encontradas.', 'bot'); setCreateInput({ placeholder: 'Ex.: Avenida Brasil' }); return; }
  if (flow.stage === 'candidate') { addCreateMessage('Encontrei estas opções. Escolha o endereço correto:', 'bot'); const options = flow.candidates.map((address, index) => ({ label: createAddressOptionLabel(address), value: String(index) })); options.push({ label: 'NENHUMA DESTAS', value: 'again' }); setCreateInput({ onlyOptions: true, options }); return; }
  if (flow.stage === 'manualStreet') { addCreateMessage('Este CEP não trouxe o logradouro. Digite o nome da rua ou avenida.', 'bot'); setCreateInput({ placeholder: 'Rua / Avenida' }); return; }
  if (flow.stage === 'manualNeighborhood') { addCreateMessage('Qual é o bairro?', 'bot'); setCreateInput({ placeholder: 'Ex.: Compensa' }); return; }
  if (flow.stage === 'number') { addCreateMessage('Qual é o número do imóvel?', 'bot'); setCreateInput({ placeholder: 'Ex.: 145', options: [{ label: 'S/N', value: 'S/N' }] }); return; }
  if (flow.stage === 'complement') { addCreateMessage('Existe complemento?', 'bot'); setCreateInput({ placeholder: 'Ex.: Apto 202, Bloco B', options: [{ label: 'SEM COMPLEMENTO', value: '-' }] }); }
}
function startCreateAddressFlow(field) {
  createState.addressFlow = { field, stage: 'mode', data: {}, candidates: [] };
  addCreateMessage(field.label, 'bot');
  renderCreateAddressStage();
}
function finishCreateAddressFlow() {
  const flow = createState.addressFlow;
  if (!flow) return;
  createState.answers[flow.field.key] = flow.skipped ? '' : normalizeCreateAddress(flow.data);
  createState.addressFlow = null;
  createState.step += 1;
  askCreateField();
}
async function handleCreateAddressSubmission(raw) {
  const flow = createState.addressFlow;
  if (!flow) return false;
  const value = String(raw || '').trim();
  if (flow.stage === 'mode') {
    const labels = { cep: 'USAR CEP', search: 'PROCURAR ENDEREÇO', skip: 'NÃO INFORMAR' };
    addCreateMessage(labels[value] || value, 'user');
    if (value === 'skip' && flow.field.optional) { flow.skipped = true; finishCreateAddressFlow(); return true; }
    flow.stage = value === 'search' ? 'searchUf' : 'cep'; renderCreateAddressStage(); return true;
  }
  if (flow.stage === 'cep') {
    addCreateMessage(value, 'user'); setCreateComposerIdle('Consultando CEP...');
    try { flow.data = await lookupCreateCep(value); flow.stage = 'confirm'; }
    catch (error) { addCreateMessage(error?.message === 'CEP_INVALIDO' ? 'Esse CEP não está no formato correto. Digite 8 números.' : 'Não encontrei esse CEP. Tente novamente ou use a pesquisa por endereço.', 'bot'); flow.stage = 'mode'; }
    renderCreateAddressStage(); return true;
  }
  if (flow.stage === 'confirm') { addCreateMessage(value === 'yes' ? 'ESTÁ CORRETO' : 'PROCURAR OUTRO', 'user'); if (value === 'again') { flow.data = {}; flow.stage = 'mode'; } else flow.stage = flow.data.street ? (flow.data.neighborhood ? 'number' : 'manualNeighborhood') : 'manualStreet'; renderCreateAddressStage(); return true; }
  if (flow.stage === 'searchUf') { const uf = value.toLocaleUpperCase('pt-BR'); if (!/^[A-Z]{2}$/.test(uf)) { addCreateMessage('Informe uma UF válida com duas letras, por exemplo AM.', 'bot'); renderCreateAddressStage(); return true; } addCreateMessage(uf, 'user'); flow.data.uf = uf; flow.stage = 'searchCity'; renderCreateAddressStage(); return true; }
  if (flow.stage === 'searchCity') { addCreateMessage(value, 'user'); flow.data.city = value; flow.stage = 'searchNeighborhood'; renderCreateAddressStage(); return true; }
  if (flow.stage === 'searchNeighborhood') { addCreateMessage(value === '-' ? 'NÃO SEI' : value, 'user'); flow.data.neighborhoodHint = value === '-' ? '' : value; flow.stage = 'searchStreet'; renderCreateAddressStage(); return true; }
  if (flow.stage === 'searchStreet') {
    addCreateMessage(value, 'user'); setCreateComposerIdle('Procurando endereços...');
    try { flow.candidates = await searchCreateAddress({ uf: flow.data.uf, city: flow.data.city, neighborhood: flow.data.neighborhoodHint, street: value }); if (!flow.candidates.length) { addCreateMessage('Não encontrei opções com esses dados. Tente outro trecho da rua ou use o CEP.', 'bot'); flow.stage = 'mode'; } else flow.stage = 'candidate'; }
    catch { addCreateMessage('Não consegui consultar os endereços agora. Tente novamente ou use o CEP.', 'bot'); flow.stage = 'mode'; }
    renderCreateAddressStage(); return true;
  }
  if (flow.stage === 'candidate') { if (value === 'again') { addCreateMessage('NENHUMA DESTAS', 'user'); flow.stage = 'mode'; renderCreateAddressStage(); return true; } const candidate = flow.candidates[Number(value)]; if (!candidate) return true; addCreateMessage(createAddressOptionLabel(candidate), 'user'); flow.data = { ...candidate }; flow.stage = candidate.street ? (candidate.neighborhood ? 'number' : 'manualNeighborhood') : 'manualStreet'; renderCreateAddressStage(); return true; }
  if (flow.stage === 'manualStreet') { addCreateMessage(value, 'user'); flow.data.street = value; flow.stage = flow.data.neighborhood ? 'number' : 'manualNeighborhood'; renderCreateAddressStage(); return true; }
  if (flow.stage === 'manualNeighborhood') { addCreateMessage(value, 'user'); flow.data.neighborhood = value; flow.stage = 'number'; renderCreateAddressStage(); return true; }
  if (flow.stage === 'number') { addCreateMessage(value, 'user'); flow.data.number = value; flow.stage = 'complement'; renderCreateAddressStage(); return true; }
  if (flow.stage === 'complement') { addCreateMessage(value === '-' ? 'SEM COMPLEMENTO' : value, 'user'); flow.data.complement = value === '-' ? '' : value; finishCreateAddressFlow(); return true; }
  return false;
}

function createTextHtml(value = '') {
  return createEscape(value).replace(/\n/g, '<br>');
}

function formatCreateCurrency(value = '') {
  const original = String(value || '').trim();
  if (!original) return '';

  let raw = original.replace(/R\$/gi, '').replace(/\s+/g, '').replace(/[^0-9,.-]/g, '');
  if (!raw || !/[0-9]/.test(raw)) return original;

  const comma = raw.lastIndexOf(',');
  const dot = raw.lastIndexOf('.');
  let normalized = raw;

  if (comma >= 0 && dot >= 0) {
    if (comma > dot) normalized = raw.replace(/\./g, '').replace(',', '.');
    else normalized = raw.replace(/,/g, '');
  } else if (comma >= 0) {
    const decimals = raw.length - comma - 1;
    normalized = decimals <= 2 ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
  } else if (dot >= 0) {
    const decimals = raw.length - dot - 1;
    normalized = decimals <= 2 ? raw.replace(/,/g, '') : raw.replace(/\./g, '');
  }

  const number = Number(normalized);
  if (!Number.isFinite(number)) return original;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number);
}


function parseCreateCurrencyNumber(value = '') {
  const rawValue = String(value || '').trim();
  if (!rawValue) return null;
  let raw = rawValue.replace(/R\$/gi, '').replace(/\s+/g, '').replace(/[^0-9,.-]/g, '');
  if (!raw || !/[0-9]/.test(raw)) return null;

  const comma = raw.lastIndexOf(',');
  const dot = raw.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) raw = comma > dot ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
  else if (comma >= 0) raw = raw.length - comma - 1 <= 2 ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
  else if (dot >= 0) raw = raw.length - dot - 1 <= 2 ? raw.replace(/,/g, '') : raw.replace(/\./g, '');

  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
}

function createWordsUnderThousand(value) {
  const small = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const tens = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const hundreds = ["", "", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
  const n = Math.floor(value);
  if (n < 20) return small[n];
  if (n < 100) {
    const rest = n % 10;
    return tens[Math.floor(n / 10)] + (rest ? ` e ${small[rest]}` : '');
  }
  if (n === 100) return 'cem';
  const rest = n % 100;
  return (n < 200 ? 'cento' : hundreds[Math.floor(n / 100)]) + (rest ? ` e ${createWordsUnderThousand(rest)}` : '');
}

function createIntegerWords(value) {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return 'zero';
  const scales = [
    { value: 1000000000000, one: 'trilhão', many: 'trilhões' },
    { value: 1000000000, one: 'bilhão', many: 'bilhões' },
    { value: 1000000, one: 'milhão', many: 'milhões' },
    { value: 1000, one: 'mil', many: 'mil' }
  ];
  const parts = [];

  for (const scale of scales) {
    if (n < scale.value) continue;
    const qty = Math.floor(n / scale.value);
    n %= scale.value;
    if (scale.value === 1000 && qty === 1) parts.push('mil');
    else parts.push(`${createWordsUnderThousand(qty)} ${qty === 1 ? scale.one : scale.many}`);
  }
  if (n) parts.push(createWordsUnderThousand(n));

  return parts.join(parts.length > 1 && n > 0 && n < 100 ? ' e ' : ', ').replace(/, ([^,]+)$/, ' e $1');
}

function createCurrencyWords(value = '') {
  const number = parseCreateCurrencyNumber(value);
  if (number === null) return '';
  const rounded = Math.round(Math.abs(number) * 100);
  const reais = Math.floor(rounded / 100);
  const centavos = rounded % 100;
  const parts = [];

  if (reais) parts.push(`${createIntegerWords(reais)} ${reais === 1 ? 'real' : 'reais'}`);
  if (centavos) parts.push(`${createIntegerWords(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`);
  return parts.length ? parts.join(' e ') : 'zero reais';
}

function createNaturalName(value = '') {
  const clean = String(value || '').trim().replace(/\s+/g, ' ');
  if (!clean) return '';
  const lowerWords = new Set(['da', 'das', 'de', 'do', 'dos', 'e']);
  return clean.toLocaleLowerCase('pt-BR').split(' ').map((word, index) => {
    if (index > 0 && lowerWords.has(word)) return word;
    return word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1);
  }).join(' ');
}

function createNaturalSentence(value = '') {
  let clean = String(value || '').trim().replace(/\s+/g, ' ');
  if (!clean) return '';
  const letters = clean.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
  if (letters && letters === letters.toLocaleUpperCase('pt-BR')) clean = clean.toLocaleLowerCase('pt-BR');
  clean = clean.replace(/\bar\s*condicionado\b/gi, 'ar-condicionado');
  return clean.charAt(0).toLocaleUpperCase('pt-BR') + clean.slice(1);
}

function createNaturalPayment(value = '') {
  const clean = String(value || '').trim();
  if (!clean) return '';
  const key = clean.toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
  const known = {
    'pix': 'Pix',
    'dinheiro': 'dinheiro',
    'cartão': 'cartão',
    'cartao': 'cartão',
    'cartão débito': 'cartão de débito',
    'cartao debito': 'cartão de débito',
    'cartão de débito': 'cartão de débito',
    'cartao de debito': 'cartão de débito',
    'débito': 'cartão de débito',
    'debito': 'cartão de débito',
    'cartão crédito': 'cartão de crédito',
    'cartao credito': 'cartão de crédito',
    'cartão de crédito': 'cartão de crédito',
    'cartao de credito': 'cartão de crédito',
    'crédito': 'cartão de crédito',
    'credito': 'cartão de crédito',
    'transferência': 'transferência',
    'transferencia': 'transferência',
    'transferência bancária': 'transferência bancária',
    'transferencia bancaria': 'transferência bancária',
    'boleto': 'boleto'
  };
  return known[key] || createNaturalSentence(clean);
}

function createNaturalPlace(value = '') {
  const clean = String(value || '').trim().replace(/,+$/, '').replace(/\s+/g, ' ');
  if (!clean) return '';
  const match = clean.match(/^(.+?)[\s,/-]+([A-Za-z]{2})$/);
  if (match) return `${createNaturalName(match[1])}/${match[2].toLocaleUpperCase('pt-BR')}`;
  return createNaturalName(clean);
}

function createNaturalPlaceDate(value = '') {
  const clean = String(value || '').trim().replace(/\s+/g, ' ');
  if (!clean) return '';
  const months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

  let match = clean.match(/^(.*?)[,\s-]*(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (match) {
    const place = createNaturalPlace(match[1]);
    const day = String(Number(match[2])).padStart(2, '0');
    const month = months[Number(match[3]) - 1];
    const date = month ? `${day} de ${month} de ${match[4]}` : `${match[2]}/${match[3]}/${match[4]}`;
    return `${place ? `${place}, ` : ''}${date}.`;
  }

  match = clean.match(/^(.*?)[,\s-]*(\d{1,2})\s+de\s+([A-Za-zÀ-ÖØ-öø-ÿ]+)\s+de\s+(\d{4})\.?$/i);
  if (match) {
    const place = createNaturalPlace(match[1]);
    const day = String(Number(match[2])).padStart(2, '0');
    const month = match[3].toLocaleLowerCase('pt-BR');
    return `${place ? `${place}, ` : ''}${day} de ${month} de ${match[4]}.`;
  }

  return clean.endsWith('.') ? clean : `${clean}.`;
}

function createTodayNaturalLabel() {
  const parts = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).formatToParts(new Date());
  const day = parts.find(part => part.type === 'day')?.value || '';
  const month = parts.find(part => part.type === 'month')?.value || '';
  const year = parts.find(part => part.type === 'year')?.value || '';
  return `${day} de ${month} de ${year}`;
}

function createAmountPresentation(value = '') {
  const formatted = formatCreateCurrency(value);
  const words = createCurrencyWords(value);
  return { formatted, words, full: words ? `${formatted} (${words})` : formatted };
}

function createTodayLabel() {
  return createTodayNaturalLabel();
}

function createDocumentDateLabel(value = '') {
  const natural = createNaturalPlaceDate(value);
  const match = natural.match(/(\d{2} de [A-Za-zÀ-ÖØ-öø-ÿ]+ de \d{4})/i);
  return match ? match[1] : createTodayLabel();
}

function createDocShell({ kind, title, eyebrow = 'DOCUMENTO', meta = '', body = '', footer = '', dateLabel = '' }) {
  const documentDate = dateLabel || createTodayLabel();
  return `
    <article class="soft-doc soft-doc-${kind}">
      <header class="doc-header">
        <div>
          <span class="doc-eyebrow">${createEscape(eyebrow)}</span>
          <h2>${createEscape(title)}</h2>
        </div>
        <div class="doc-header-meta">
          <span>EMISSÃO</span>
          <strong>${createEscape(documentDate)}</strong>
          ${meta}
        </div>
      </header>
      <div class="doc-accent"></div>
      <div class="doc-content">${body}</div>
      ${footer || '<footer class="doc-footer"><span>Documento preparado para impressão ou arquivo digital.</span></footer>'}
    </article>
  `;
}

function parsePriceListItems(value = '') {
  return String(value || '').split(/\n+/).map(line => line.trim()).filter(Boolean).map((line) => {
    const parts = line.split(/\s+[—–-]\s+|\s*\|\s*|\s*:\s*/);
    if (parts.length >= 2) {
      const price = parts.pop().trim();
      return { name: parts.join(' — ').trim(), price: formatCreateCurrency(price) };
    }
    const match = line.match(/^(.*?)(R\$\s*)?([0-9][0-9.,]*)$/i);
    if (match) return { name: match[1].trim(), price: formatCreateCurrency(match[3]) };
    return { name: line, price: '' };
  });
}


function createNaturalMultiline(value = '') {
  return String(value || '').split(/\n+/).map(line => createNaturalSentence(line)).filter(Boolean).join('\n');
}

function createSentenceWithPeriod(value = '') {
  const clean = String(value || '').trim();
  if (!clean) return '';
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

function createPaymentClause(value = '') {
  const method = createNaturalPayment(value);
  if (!method) return '';
  if (method.toLocaleLowerCase('pt-BR') === 'dinheiro') return 'paga em dinheiro';
  return `paga por meio de ${method}`;
}

function createReceiptReference(value = '') {
  const reason = createNaturalSentence(value);
  const lower = reason.charAt(0).toLocaleLowerCase('pt-BR') + reason.slice(1);
  const first = lower.split(/\s+/)[0].replace(/[^A-Za-zÀ-ÖØ-öø-ÿ-]/g, '');
  if (/(ção|dade|agem)$/.test(first) || /^(compra|venda|locação|entrega|manutenção|limpeza|consulta|mensalidade|parcela|diária|hospedagem)$/.test(first)) return `à ${lower}`;
  if (/^(serviço|produto|pagamento|reparo|conserto|aluguel|fornecimento|transporte|atendimento)$/.test(first)) return `ao ${lower}`;
  return `a ${lower}`;
}

function createNaturalDate(value = '') {
  const clean = String(value || '').trim();
  if (!clean) return createTodayNaturalLabel();
  const months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  let match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]} de ${months[Number(match[2]) - 1]} de ${match[1]}`;
  match = clean.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (match) return `${String(Number(match[1])).padStart(2, '0')} de ${months[Number(match[2]) - 1]} de ${match[3]}`;
  return clean;
}
function createPlaceDateLine(place = '', date = '') {
  const p = createNaturalPlace(place);
  return `${p ? `${p}, ` : ''}${createNaturalDate(date)}.`;
}
function createIdentityHtml(name, doc, address, label) {
  const documentId = formatCreateDocumentId(doc);
  const addressText = formatCreateAddress(address);
  return `<section class="doc-person-card"><span>${createEscape(label)}</span><strong>${createEscape(createNaturalName(name))}</strong>${documentId ? `<small>${createEscape(documentId)}</small>` : ''}${addressText ? `<p>${createTextHtml(addressText)}</p>` : ''}</section>`;
}
function createMajorSectionHeading(label) {
  return `<div class="doc-major-section-heading"><span>${createEscape(String(label || '').toLocaleUpperCase('pt-BR'))}</span></div>`;
}
function parseCreateBudgetItems(value = '') {
  if (Array.isArray(value)) {
    return value.map((item) => {
      const description = createNaturalSentence(item?.description || item?.name || '');
      const quantity = Number(String(item?.quantity ?? item?.quantityLabel ?? '1').replace(',', '.')) || 1;
      const quantityLabel = String(item?.quantityLabel ?? item?.quantity ?? quantity);
      const unitNumber = item?.unitNumber != null ? Number(item.unitNumber) : parseCreateCurrencyNumber(item?.unitPrice ?? item?.price ?? '');
      const totalNumber = item?.totalNumber != null ? Number(item.totalNumber) : (unitNumber === null ? null : unitNumber * quantity);
      return {
        description,
        quantityLabel,
        quantity,
        unitPrice: unitNumber === null ? '' : formatCreateCurrency(String(unitNumber)),
        unitNumber,
        totalNumber,
        total: totalNumber === null ? '' : formatCreateCurrency(String(totalNumber))
      };
    }).filter((item) => item.description);
  }
  return String(value || '').split(/\n+/).map(line => line.trim()).filter(Boolean).map((line) => {
    const parts = line.split(/\s*\|\s*|\s*;\s*/).map(part => part.trim());
    const description = createNaturalSentence(parts[0] || line);
    const quantityLabel = parts.length >= 3 ? (parts[1] || '1') : '1';
    const quantity = Number(String(quantityLabel).replace(',', '.')) || 1;
    const unitRaw = parts.length >= 3 ? parts[2] : (parts[1] || '');
    const unitNumber = parseCreateCurrencyNumber(unitRaw);
    const unitPrice = unitNumber === null ? (unitRaw ? formatCreateCurrency(unitRaw) : '') : formatCreateCurrency(String(unitNumber));
    const totalNumber = unitNumber === null ? null : unitNumber * quantity;
    return { description, quantityLabel, quantity, unitPrice, totalNumber, total: totalNumber === null ? '' : formatCreateCurrency(String(totalNumber)) };
  });
}
function parseCreatePriceItems(value = '') {
  if (Array.isArray(value)) {
    return value.map((item) => {
      const priceNumber = item?.priceNumber != null ? Number(item.priceNumber) : parseCreateCurrencyNumber(item?.price ?? '');
      return {
        name: createNaturalSentence(item?.name || item?.description || ''),
        detail: createNaturalSentence(item?.detail || ''),
        priceNumber,
        price: priceNumber === null ? '' : formatCreateCurrency(String(priceNumber))
      };
    }).filter((item) => item.name);
  }
  return String(value || '').split(/\n+/).map(line => line.trim()).filter(Boolean).map((line) => {
    const parts = line.split(/\s*\|\s*|\s*;\s*/).map(part => part.trim());
    if (parts.length >= 3) return { name: createNaturalSentence(parts[0]), detail: createNaturalSentence(parts[1]), price: formatCreateCurrency(parts.slice(2).join(' ')) };
    if (parts.length === 2) return { name: createNaturalSentence(parts[0]), detail: '', price: formatCreateCurrency(parts[1]) };
    const fallback = parsePriceListItems(line)[0] || { name: line, price: '' };
    return { name: createNaturalSentence(fallback.name), detail: '', price: fallback.price };
  });
}
function buildCreateDocument() {
  const a = createState.answers;
  const type = createState.type;
  if (type === 'receipt') {
    const receiver = createNaturalName(a.receiver); const payer = createNaturalName(a.payer);
    const amount = createAmountPresentation(a.amount); const reason = createNaturalSentence(a.reason);
    const method = createNaturalPayment(a.method); const ref = String(a.paymentRef || '').trim();
    const placeDate = createPlaceDateLine(a.place, a.issueDate); const dateLabel = createNaturalDate(a.issueDate);
    const mainSentence = `Recebi de ${payer}${a.payerDoc ? `, ${formatCreateDocumentId(a.payerDoc)}` : ''}, a quantia de ${amount.full}, referente ${createReceiptReference(reason)}, ${createPaymentClause(method)}.`;
    const body = `<section class="doc-party-grid">${createIdentityHtml(receiver,a.receiverDoc,a.receiverAddress,'RECEBEDOR')}${createIdentityHtml(payer,a.payerDoc,'','PAGADOR')}</section>
      <section class="doc-prose-block"><p class="doc-lead">${createEscape(mainSentence)}</p><p class="doc-legal-copy">Declaro, para os devidos fins, que o valor acima foi recebido integralmente, dando plena quitação quanto ao pagamento e à finalidade descritos neste recibo.</p></section>
      <section class="doc-value-card doc-value-card-written"><span>VALOR RECEBIDO</span><div><strong>${createEscape(amount.formatted)}</strong><small>${createEscape(amount.words)}</small></div></section>
      ${ref ? `<section class="doc-detail-row"><span>REFERÊNCIA</span><strong>${createEscape(ref)}</strong></section>` : ''}
      <div class="doc-bottom-block"><p class="doc-place-date">${createEscape(placeDate)}</p>${createSignaturePreviewMarkup(receiver,'RESPONSÁVEL PELO RECEBIMENTO')}</div>`;
    return { title:'RECIBO', html:createDocShell({kind:'receipt',title:'RECIBO',eyebrow:'COMPROVANTE DE RECEBIMENTO',body,dateLabel}), text:`RECIBO\n\n${mainSentence}\n\nDeclaro que o valor foi recebido integralmente, dando plena quitação.\n${ref ? `\nReferência: ${ref}\n` : ''}\n${placeDate}\n\n________________________________\n${receiver}\nResponsável pelo recebimento` };
  }
  if (type === 'budget') {
    const provider=createNaturalName(a.provider), client=createNaturalName(a.client), items=parseCreateBudgetItems(a.items);
    const totalNumber=items.reduce((sum,item)=>sum+(item.totalNumber||0),0); const total=totalNumber ? createAmountPresentation(String(totalNumber)) : {formatted:'A combinar',words:'',full:'A combinar'};
    const placeDate=createPlaceDateLine(a.place,a.issueDate), dateLabel=createNaturalDate(a.issueDate);
    const rows=items.map((item,index)=>`<div class="doc-item-row"><span>${String(index+1).padStart(2,'0')}</span><strong>${createEscape(item.description)}</strong><em>${createEscape(item.quantityLabel)}</em><b>${createEscape(item.unitPrice || '—')}</b><b>${createEscape(item.total || '—')}</b></div>`).join('');
    const body=`<section class="doc-party-grid">${createIdentityHtml(provider,a.providerDoc,a.providerAddress,'EMITENTE')}${createIdentityHtml(client,a.clientDoc,a.clientAddress,'CLIENTE')}</section>
      ${a.contact ? `<section class="doc-detail-row"><span>CONTATO</span><strong>${createEscape(a.contact)}</strong></section>`:''}
      <section class="doc-items-table"><div class="doc-item-head"><span>#</span><span>ITEM / SERVIÇO</span><span>QTD.</span><span>UNITÁRIO</span><span>TOTAL</span></div>${rows}</section>
      <section class="doc-summary-grid"><div><span>VALOR TOTAL</span><strong>${createEscape(total.formatted)}</strong>${total.words?`<small>${createEscape(total.words)}</small>`:''}</div><div><span>VALIDADE</span><strong>${createEscape(createNaturalSentence(a.validity))}</strong></div></section>
      <section class="doc-terms-grid">${a.deadline?`<div><span>PRAZO</span><p>${createEscape(createNaturalSentence(a.deadline))}</p></div>`:''}${a.paymentTerms?`<div><span>CONDIÇÕES DE PAGAMENTO</span><p>${createEscape(createNaturalSentence(a.paymentTerms))}</p></div>`:''}</section>
      ${a.note?`<section class="doc-note-box"><span>OBSERVAÇÕES</span><p>${createTextHtml(createNaturalMultiline(a.note))}</p></section>`:''}
      <div class="doc-bottom-block compact"><p class="doc-place-date">${createEscape(placeDate)}</p>${createSignaturePreviewMarkup(provider,'RESPONSÁVEL PELO ORÇAMENTO')}</div>`;
    return {title:'ORÇAMENTO',html:createDocShell({kind:'budget',title:'ORÇAMENTO',eyebrow:'PROPOSTA COMERCIAL',body,dateLabel}),text:`ORÇAMENTO\n\nEmitente: ${provider}${a.providerDoc?` — ${formatCreateDocumentId(a.providerDoc)}`:''}\nCliente: ${client}${a.clientDoc?` — ${formatCreateDocumentId(a.clientDoc)}`:''}\n\n${items.map(i=>`${i.description} | ${i.quantityLabel} | ${i.unitPrice}${i.total?` | ${i.total}`:''}`).join('\n')}\n\nTotal: ${total.full}\nValidade: ${a.validity}${a.deadline?`\nPrazo: ${a.deadline}`:''}${a.paymentTerms?`\nPagamento: ${a.paymentTerms}`:''}${a.note?`\nObservações: ${a.note}`:''}\n\n${placeDate}

________________________________
${createNaturalName(a.signatureName || provider)}
Responsável pelo orçamento`};
  }
  if (type === 'declaration') {
    const name=createNaturalName(a.name), doc=formatCreateDocumentId(a.document), rg=String(a.rg||'').trim(), address=formatCreateAddress(a.address);
    const statement=String(a.statement||'').trim(), purpose=String(a.purpose||'').trim();
    const placeDate=createPlaceDateLine(a.place,a.issueDate), dateLabel=createNaturalDate(a.issueDate);
    const identity=[doc?`CPF/CNPJ ${doc}`:'',rg?`documento ${rg}`:''].filter(Boolean).join(' e ');
    const body=`${createMajorSectionHeading('Identificação do declarante')}<section class="doc-person-card doc-person-wide"><strong>${createEscape(name)}</strong>${identity?`<small>${createEscape(identity)}</small>`:''}${address?`<p>${createTextHtml(address)}</p>`:''}</section>
      ${createMajorSectionHeading('Declaração')}<section class="doc-prose-block doc-declaration-prose"><div class="doc-declaration-user-text">${createTextHtml(statement)}</div></section>
      ${purpose?`${createMajorSectionHeading('Finalidade')}<section class="doc-prose-block doc-declaration-purpose"><div class="doc-declaration-user-text">${createTextHtml(purpose)}</div></section>`:''}
      <div class="doc-bottom-block"><p class="doc-place-date">${createEscape(placeDate)}</p>${createSignaturePreviewMarkup(name,'DECLARANTE')}</div>`;
    return {title:'DECLARAÇÃO',html:createDocShell({kind:'declaration',title:'DECLARAÇÃO',eyebrow:'DOCUMENTO PARTICULAR',body,dateLabel}),text:`DECLARAÇÃO

${statement}${purpose?`

FINALIDADE
${purpose}`:''}

${placeDate}

________________________________
${name}
Declarante`};
  }
  if (type === 'prices') {
    const name=String(a.name||'Lista de preços').trim(), doc=formatCreateDocumentId(a.document), address=formatCreateAddress(a.address), items=parseCreatePriceItems(a.items), dateLabel=createNaturalDate(a.issueDate), placeDate=createPlaceDateLine(a.place,a.issueDate);
    const rows=items.map((item,index)=>`<div class="doc-price-row"><span class="doc-price-index">${String(index+1).padStart(2,'0')}</span><div><strong>${createEscape(item.name)}</strong>${item.detail?`<small>${createEscape(item.detail)}</small>`:''}</div><b>${createEscape(item.price)}</b></div>`).join('');
    const body=`<section class="doc-brand-block"><span>ESTABELECIMENTO / PROFISSIONAL</span><strong>${createEscape(name)}</strong>${doc?`<small>${createEscape(doc)}</small>`:''}${a.contact?`<small>${createEscape(a.contact)}</small>`:''}${address?`<p>${createTextHtml(address)}</p>`:''}</section><section class="doc-price-table">${rows}</section>${a.validity?`<section class="doc-detail-row"><span>VALIDADE / PERÍODO</span><strong>${createEscape(createNaturalSentence(a.validity))}</strong></section>`:''}${a.note?`<section class="doc-note-box"><span>OBSERVAÇÕES</span><p>${createTextHtml(createNaturalMultiline(a.note))}</p></section>`:''}<div class="doc-bottom-block compact"><p class="doc-place-date">${createEscape(placeDate)}</p></div>`;
    return {title:'LISTA DE PREÇOS',html:createDocShell({kind:'prices',title:'LISTA DE PREÇOS',eyebrow:'TABELA DE VALORES',body,dateLabel}),text:`LISTA DE PREÇOS\n${name}\n${doc?`${doc}\n`:''}${a.contact?`${a.contact}\n`:''}\n${items.map(i=>`${i.name}${i.detail?` — ${i.detail}`:''} — ${i.price}`).join('\n')}${a.validity?`\n\n${a.validity}`:''}${a.note?`\n\nObservações: ${a.note}`:''}\n\n${placeDate}`};
  }
  if (type === 'proof') {
    const issuer=createNaturalName(a.issuer), recipient=createNaturalName(a.recipient), subject=String(a.subject||'').trim(), amount=a.amount?createAmountPresentation(a.amount):null, method=a.method?createNaturalPayment(a.method):'', ref=String(a.reference||'').trim();
    const placeDate=createPlaceDateLine(a.place,a.issueDate),dateLabel=createNaturalDate(a.issueDate);
    const body=`${createMajorSectionHeading('Emitente')}<section class="doc-person-card doc-person-wide"><strong>${createEscape(issuer)}</strong>${a.issuerDoc?`<small><b>CPF/CNPJ</b> ${createEscape(formatCreateDocumentId(a.issuerDoc))}</small>`:''}${a.issuerAddress?`<p><b>ENDEREÇO</b><br>${createTextHtml(formatCreateAddress(a.issuerAddress))}</p>`:''}</section>
      ${createMajorSectionHeading('Destinatário')}<section class="doc-person-card doc-person-wide"><strong>${createEscape(recipient)}</strong>${a.recipientDoc?`<small><b>CPF/CNPJ</b> ${createEscape(formatCreateDocumentId(a.recipientDoc))}</small>`:''}</section>
      ${amount?`<section class="doc-value-card doc-value-card-written"><span>VALOR REGISTRADO</span><div><strong>${createEscape(amount.formatted)}</strong><small>${createEscape(amount.words)}</small></div></section>`:''}
      ${createMajorSectionHeading('Registro / finalidade')}<section class="doc-prose-block"><div class="doc-declaration-user-text">${createTextHtml(subject)}</div></section>
      ${(method||ref)?`${createMajorSectionHeading('Dados da operação')}<section class="doc-proof-operation">${method?`<div><span>FORMA DE PAGAMENTO</span><strong>${createEscape(method)}</strong></div>`:''}${ref?`<div><span>REFERÊNCIA</span><strong>${createEscape(ref)}</strong></div>`:''}</section>`:''}
      <div class="doc-bottom-block"><p class="doc-place-date">${createEscape(placeDate)}</p>${createSignaturePreviewMarkup(issuer,'EMITENTE / RESPONSÁVEL')}</div>`;
    return {title:'COMPROVANTE',html:createDocShell({kind:'proof',title:'COMPROVANTE',eyebrow:'REGISTRO FORMAL',body,dateLabel}),text:`COMPROVANTE

Emitente: ${issuer}${a.issuerDoc?` — ${formatCreateDocumentId(a.issuerDoc)}`:''}
Destinatário: ${recipient}${a.recipientDoc?` — ${formatCreateDocumentId(a.recipientDoc)}`:''}

${subject}${amount?`

Valor: ${amount.full}`:''}${method?`
Forma/meio: ${method}`:''}${ref?`
Referência: ${ref}`:''}

${placeDate}

________________________________
${issuer}
Emitente / Responsável`};
  }
  if (type === 'label') {
    const recipient=createNaturalName(a.recipient), sender=createNaturalName(a.sender), raddr=formatCreateAddress(a.recipientAddress), saddr=formatCreateAddress(a.senderAddress), rdoc=formatCreateDocumentId(a.recipientDoc), sdoc=formatCreateDocumentId(a.senderDoc);
    const body=`<section class="doc-label-recipient"><span>DESTINATÁRIO</span><strong>${createEscape(recipient)}</strong>${rdoc?`<small>${createEscape(rdoc)}</small>`:''}${a.recipientPhone?`<small>${createEscape(a.recipientPhone)}</small>`:''}<p>${createTextHtml(raddr)}</p></section><div class="doc-label-route"><span>REMETENTE</span><i>→</i><span>DESTINATÁRIO</span></div><section class="doc-label-sender"><span>REMETENTE</span><strong>${createEscape(sender)}</strong>${sdoc?`<small>${createEscape(sdoc)}</small>`:''}${a.senderPhone?`<small>${createEscape(a.senderPhone)}</small>`:''}<p>${createTextHtml(saddr)}</p></section>${a.note?`<section class="doc-label-note"><strong>${createEscape(String(a.note).trim())}</strong></section>`:''}`;
    return {title:'ETIQUETA',html:createDocShell({kind:'label',title:'ETIQUETA DE ENVIO',eyebrow:'IDENTIFICAÇÃO DE REMESSA',body,footer:'<footer class="doc-footer"><span>Confira os dados de destinatário e remetente antes da postagem.</span></footer>'}),text:`ETIQUETA DE ENVIO\n\nDESTINATÁRIO\n${recipient}${rdoc?`\n${rdoc}`:''}${a.recipientPhone?`\n${a.recipientPhone}`:''}\n${raddr}\n\nREMETENTE\n${sender}${sdoc?`\n${sdoc}`:''}${a.senderPhone?`\n${a.senderPhone}`:''}\n${saddr}${a.note?`\n\nOBSERVAÇÃO\n${a.note}`:''}`};
  }
  return { title: 'DOCUMENTO', html: '<p>Documento pronto.</p>', text: 'Documento pronto.' };
}

function finishCreateDocument() {
  const documentData = buildCreateDocument();
  createState.finalText = documentData.text;

  setCreateComposerIdle('Documento pronto');
  if (createPreviewType) createPreviewType.textContent = documentData.title;
  if (createDocumentPreview) createDocumentPreview.innerHTML = documentData.html;
  if (createPreviewCard) createPreviewCard.hidden = false;

  addCreateMessage('Pronto. Seu documento foi criado.', 'bot');
  void prepareCreatePdfDownload();

  requestAnimationFrame(() => { if (createFlow) createFlow.scrollTop = createFlow.scrollHeight; });
}

function resetCreateFlow() {
  createState = { type: null, step: 0, answers: {}, finalText: '', addressFlow: null, itemFlow: null };
  resetCreatePdfPreparation();
  if (createMessages) {
    createMessages.innerHTML = '';
    addCreateMessage('O que você quer criar?', 'bot');
  }
  if (createOptions) createOptions.hidden = false;
  if (createPreviewCard) createPreviewCard.hidden = true;
  if (createResetButton) createResetButton.hidden = true;

  // Tela inicial do CRIAR: somente pergunta + teclado inline de opções.
  // O composer aparece apenas depois que um tipo de documento é escolhido
  // e a etapa realmente exigir digitação.
  if (createAnswerWrap) createAnswerWrap.innerHTML = '';
  if (createComposer) {
    createComposer.classList.remove('create-options-only');
    createComposer.hidden = true;
  }
  if (createSendButton) createSendButton.disabled = true;

  createOptions?.querySelectorAll('.create-option').forEach((button) => {
    button.classList.remove('is-selected');
  });

  requestAnimationFrame(() => {
    if (createFlow) createFlow.scrollTop = 0;
  });
}

createOptions?.addEventListener('click', (event) => {
  const option = event.target.closest('.create-option');
  if (!option) return;
  startCreateFlow(option.dataset.createType);
});

createMessages?.addEventListener('click', async (event) => {
  const button = event.target.closest('.create-inline-option');
  if (!button) return;
  const value = button.dataset.createQuickValue || '';
  const label = button.dataset.createQuickLabel || value;
  clearCreateInlineOptions();

  if (createState.addressFlow) {
    await handleCreateAddressSubmission(value);
    return;
  }
  if (createState.itemFlow) {
    await handleCreateItemSubmission(value, label);
    return;
  }

  const config = CREATE_TYPES[createState.type];
  const field = config?.fields?.[createState.step];
  if (!field) return;
  createState.answers[field.key] = normalCreateValue(value);
  addCreateMessage(label || 'Não informar', 'user');
  createState.step += 1;
  askCreateField();
});

createComposer?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const config = CREATE_TYPES[createState.type];
  if (!config) return;
  const control = createAnswerWrap?.querySelector('input, textarea, select');
  if (!control) return;
  const raw = String(control.value || '').trim();
  if (!raw) { if (!control.hidden) control.focus(); return; }
  if (createState.addressFlow) { await handleCreateAddressSubmission(raw); return; }
  if (createState.itemFlow) { await handleCreateItemSubmission(raw); return; }
  const field = config.fields[createState.step];
  if (!field) return;
  const value = normalCreateValue(raw);
  if (field.kind === 'currency' && value !== '-') {
    const numericValue = parseCreateCurrencyNumber(value);
    if (numericValue === null || numericValue < 0) {
      addCreateMessage('Informe um valor válido, por exemplo 1.200,00.', 'bot');
      control.focus();
      return;
    }
  }
  if (field.kind === 'documentId' && !isValidCreateDocumentId(value)) {
    addCreateMessage('Esse CPF/CNPJ não é válido. Confira os números e tente novamente.', 'bot');
    control.focus();
    return;
  }
  clearCreateInlineOptions();
  createState.answers[field.key] = value;
  let display = value || 'Não informar';
  if (field.kind === 'date' && value) display = createNaturalDate(value);
  addCreateMessage(display, 'user');
  createState.step += 1;
  askCreateField();
});

createResetButton?.addEventListener('click', resetCreateFlow);

createCopyButton?.addEventListener('click', async () => {
  if (!createState.finalText) return;
  try {
    await navigator.clipboard.writeText(createState.finalText);
    createCopyButton.textContent = 'COPIADO';
    setTimeout(() => { createCopyButton.textContent = 'COPIAR'; }, 1400);
  } catch {
    const area = document.createElement('textarea');
    area.value = createState.finalText;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
});

createWhatsappButton?.addEventListener('click', () => {
  if (!createState.finalText) return;
  const url = `https://wa.me/?text=${encodeURIComponent(createState.finalText)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
});

function createPdfFilename() {
  const raw = String(createPreviewType?.textContent || createState.type || 'documento')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${raw || 'documento'}.pdf`;
}

function resetCreatePdfPreparation() {
  createPdfPrepareVersion += 1;
  if (createPreparedPdf?.objectUrl) {
    try { URL.revokeObjectURL(createPreparedPdf.objectUrl); } catch {}
  }
  createPreparedPdf = null;
  createPdfPreparePromise = null;
  if (createPrintButton) {
    createPrintButton.disabled = true;
    createPrintButton.textContent = 'IMPRIMIR / PDF';
  }
}

function isAndroidWebView() {
  // O aplicativo oficial expõe a ponte SoftAndroid via addJavascriptInterface.
  // Ela é uma identificação muito mais confiável do que depender apenas do UA,
  // pois alguns WebViews recentes não incluem o marcador "wv".
  try {
    if (typeof window !== 'undefined' && window.SoftAndroid) return true;
  } catch (_) {}
  const ua = String(navigator.userAgent || '');
  return /Android/i.test(ua) && (/;\s*wv\)/i.test(ua) || /Version\/4\.0/i.test(ua));
}

function closeYoutubeWebViewMenu() {
  // Fluxo antigo removido: o YouTube baixa direto dentro do app.
}

function showYoutubeWebViewMenu() {
  // Mantido apenas como compatibilidade interna; não exibe mais aviso/modal.
}

function createPdfBlobUrl(payload) {
  const binary = atob(String(payload || ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}

function savePreparedPdfLocally(prepared) {
  if (!prepared?.objectUrl) throw new Error('PDF local indisponível.');
  const link = document.createElement('a');
  link.href = prepared.objectUrl;
  link.download = prepared.filename || 'documento.pdf';
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function submitPreparedPdfToWebView(prepared) {
  const base64 = String(prepared?.payload || '').trim();
  if (!base64) throw new Error('PDF vazio.');

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `https://${WORKER_MEDIA_HOST}/pdf/direct`;
  form.target = '_self';
  form.acceptCharset = 'UTF-8';
  form.style.display = 'none';

  const pdfInput = document.createElement('input');
  pdfInput.type = 'hidden';
  pdfInput.name = 'pdf';
  pdfInput.value = base64;
  form.appendChild(pdfInput);

  const nameInput = document.createElement('input');
  nameInput.type = 'hidden';
  nameInput.name = 'filename';
  nameInput.value = prepared.filename || 'documento.pdf';
  form.appendChild(nameInput);

  document.body.appendChild(form);
  form.submit();
  setTimeout(() => form.remove(), 1500);
}

async function prepareCreatePdfDownload() {
  if (!createState.finalText || !createPrintButton) return null;
  if (createPreparedPdf?.signature === createState.finalText) return createPreparedPdf;
  if (createPdfPreparePromise) return createPdfPreparePromise;

  const version = ++createPdfPrepareVersion;
  const signature = createState.finalText;
  createPrintButton.disabled = true;
  createPrintButton.textContent = 'PREPARANDO PDF...';

  createPdfPreparePromise = (async () => {
    try {
      if (!window.CodenCreatePdf?.generate) throw new Error('Motor profissional de PDF não foi carregado.');
      const result = await window.CodenCreatePdf.generate(createState.type, createState.answers || {});
      if (version !== createPdfPrepareVersion || signature !== createState.finalText) return null;
      const payload = String(result?.payload || '');
      if (!payload) throw new Error('O gerador retornou um PDF vazio.');

      if (createPreparedPdf?.objectUrl) {
        try { URL.revokeObjectURL(createPreparedPdf.objectUrl); } catch {}
      }
      createPreparedPdf = {
        payload,
        filename: createPdfFilename(),
        signature,
        objectUrl: createPdfBlobUrl(payload)
      };
      createPrintButton.disabled = false;
      createPrintButton.textContent = 'BAIXAR PDF';
      return createPreparedPdf;
    } catch (error) {
      console.error('Falha ao preparar PDF:', error);
      if (version === createPdfPrepareVersion) {
        createPreparedPdf = null;
        createPrintButton.disabled = false;
        createPrintButton.textContent = 'TENTAR PDF NOVAMENTE';
      }
      return null;
    } finally {
      if (version === createPdfPrepareVersion) createPdfPreparePromise = null;
    }
  })();

  return createPdfPreparePromise;
}

createPrintButton?.addEventListener('click', () => {
  if (!createState.finalText) return;

  if (!createPreparedPdf || createPreparedPdf.signature !== createState.finalText) {
    void prepareCreatePdfDownload();
    return;
  }

  try {
    createPrintButton.textContent = 'INICIANDO DOWNLOAD...';
    if (isAndroidWebView()) submitPreparedPdfToWebView(createPreparedPdf);
    else savePreparedPdfLocally(createPreparedPdf);
    setTimeout(() => {
      if (createPrintButton) createPrintButton.textContent = 'BAIXAR PDF';
    }, 1200);
  } catch (error) {
    console.error('Falha ao iniciar download do PDF:', error);
    createPrintButton.textContent = 'TENTAR PDF NOVAMENTE';
  }
});

resetCreateFlow();


// Handoff do WebApp para o navegador externo: quando o site é aberto com
// ?youtube=<link>, preenche o campo e dispara a análise automaticamente.
(function consumeYoutubeBrowserHandoff() {
  if (isAndroidWebView()) return;
  let handedUrl = '';
  try {
    const params = new URLSearchParams(window.location.search);
    handedUrl = String(params.get('youtube') || '').trim();
    if (!handedUrl) return;
    params.delete('youtube');
    const cleanQuery = params.toString();
    const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}${window.location.hash || ''}`;
    window.history.replaceState({}, '', cleanUrl);
  } catch (_) {
    return;
  }

  const run = () => {
    if (!input || !form) return;
    input.value = handedUrl;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    window.setTimeout(() => {
      if (typeof form.requestSubmit === 'function') form.requestSubmit();
      else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }, 120);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
})();
