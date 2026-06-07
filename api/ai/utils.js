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

  // Palavras-chave relativas
  if (/\bpassado amanha\b/.test(value)) return todayISO(2);
  if (/\bamanha\b/.test(value)) return todayISO(1);
  if (/\bhoje\b/.test(value)) return todayISO(0);
  if (/\bontem\b/.test(value)) return todayISO(-1);

  // Dias da semana (próximo dia da semana a partir de hoje)
  const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  for (let i = 0; i < diasSemana.length; i++) {
    if (value.includes(diasSemana[i])) {
      const hoje = new Date();
      const diaAtual = hoje.getDay();
      let diff = i - diaAtual;
      if (diff <= 0) diff += 7;
      return todayISO(diff);
    }
  }

  // Formato ISO: 2025-06-20
  const iso = value.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];

  // Formato brasileiro: 20/06, 20/06/2025, 20-06-2025
  const br = value.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (!br) return fallback;

  const day = br[1].padStart(2, '0');
  const month = br[2].padStart(2, '0');
  const year = br[3] ? String(br[3]).padStart(4, '20') : String(new Date().getFullYear());
  return `${year}-${month}-${day}`;
}

export function parseTime(text) {
  const value = normalizeText(text);

  // "às 15h", "as 15:30", "15h30", "15:00", "3 da tarde", "meio dia"
  if (/meio.?dia/.test(value)) return '12:00';
  if (/meia.?noite/.test(value)) return '00:00';

  // "3 da tarde" / "3 da manha"
  const tardeManha = value.match(/\b(\d{1,2})\s*da\s*(tarde|noite|manha)\b/);
  if (tardeManha) {
    let hour = Number(tardeManha[1]);
    if ((tardeManha[2] === 'tarde' || tardeManha[2] === 'noite') && hour < 12) hour += 12;
    if (hour >= 0 && hour <= 23) return `${String(hour).padStart(2, '0')}:00`;
  }

  // "às 15h30", "as 9:00", "15h", "9h30"
  const match = value.match(/\b(?:as|as)\s*(\d{1,2})(?::|h)?(\d{2})?\b/)
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
  return query.not('status', 'in', '(Recusado,Excluido,Excluído,excluido)');
}
