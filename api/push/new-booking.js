import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { createClient } from '@supabase/supabase-js';

function getFirebaseApp() {
  if (getApps().length) return getApps()[0];
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin nÃ£o configurado.');
  }
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

function safeTopic(companyId) {
  return `empresa_${String(companyId).trim().replace(/[^a-zA-Z0-9-_.~%]/g, '_')}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'MÃ©todo nÃ£o permitido.' });
  }

  try {
    const appointmentId = String(req.body?.appointmentId || '').trim();
    const companyId = String(req.body?.companyId || '').trim();
    if (!appointmentId || !companyId) {
      return res.status(400).json({ error: 'Agendamento invÃ¡lido.' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.URL_SUPABASE;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) throw new Error('Supabase nÃ£o configurado.');
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: booking, error } = await supabase
      .from('agenda_agendamentos')
      .select('id, empresa_id, cliente_nome, servico_nome, data, hora, criado_em')
      .eq('id', appointmentId)
      .eq('empresa_id', companyId)
      .maybeSingle();
    if (error) throw error;
    if (!booking) return res.status(404).json({ error: 'Agendamento nÃ£o encontrado.' });

    const createdAt = new Date(booking.criado_em).getTime();
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > 10 * 60 * 1000) {
      return res.status(409).json({ error: 'Agendamento fora da janela de envio.' });
    }

    await getMessaging(getFirebaseApp()).send({
      topic: safeTopic(companyId),
      notification: {
        title: 'Novo agendamento!',
        body: `${booking.cliente_nome || 'Cliente'} agendou ${booking.servico_nome || 'um serviÃ§o'} para ${booking.data} Ã s ${booking.hora}.`
      },
      data: {
        appointmentId: String(booking.id),
        companyId: String(booking.empresa_id),
        type: 'new_booking'
      },
      android: {
        priority: 'high',
        notification: { channelId: 'vyxora_agendamentos' }
      }
    });

    return res.status(200).json({ sent: true });
  } catch (error) {
    console.error('Erro ao enviar push:', error);
    return res.status(500).json({ error: 'NÃ£o foi possÃ­vel enviar a notificaÃ§Ã£o.' });
  }
}
