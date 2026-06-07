export function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function todayISO(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function parseDate(text, fallback = null) {
  const value = normalizeText(text);
  if (/\bamanha\b/.test(value)) return todayISO(1);
  if (/\bhoje\b/.test(value)) return todayISO(0);
  const iso = value.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  const br = value.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (!br) return fallback;
  const year = br[3] ? String(br[3]).padStart(4, '20') : String(new Date().getFullYear());
  return `${year}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
}

export function parseTime(text) {
  const value = normalizeText(text);
  const match = value.match(/\b(?:as|às)\s*(\d{1,2})(?::|h)?(\d{2})?\b/)
    || value.match(/\b(\d{1,2})(?::(\d{2})|h(\d{2})?)\b/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] || match[3] || 0);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function minutesFromTime(time) {
  const [h, m] = String(time || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function timeFromMinutes(total) {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function normStatus(status) {
  const value = normalizeText(status || 'pendente');
  if (value.startsWith('conf')) return 'Confirmado';
  if (value.startsWith('conc')) return 'Concluido';
  if (value.startsWith('rec') || value.startsWith('canc')) return 'Recusado';
  if (value.startsWith('reag')) return 'Reagendado';
  if (value.startsWith('excl')) return 'Excluido';
  return 'Pendente';
}

export function activeStatus(query) {
  // Se for uma tabela que usa o padrão booleano 'ativo' (como profissionais ou servicos),
  // a query falharia ao buscar pela string 'excluido'. Esta verificação dinâmica previne isso.
  if (query && query.url && (query.url.includes('profissionais') || query.url.includes('servicos'))) {
    return query.eq('ativo', true);
  }
  return query.not('status', 'in', '("Excluido","Excluído","excluido")');
}
