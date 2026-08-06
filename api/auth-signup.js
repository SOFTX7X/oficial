import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL=process.env.SUPABASE_URL||'https://wyjrjioipqfltdyupfna.supabase.co';
const SUPABASE_KEY=process.env.SUPABASE_ANON_KEY||'sb_publishable_PkDkt5S-_rdrT0HhANoPAw_ZWluV2_H';
export default async function handler(req,res){ res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({error:'Método não permitido.'});const email=String(req.body?.email||'').trim().toLowerCase();const password=String(req.body?.password||'');const nome=String(req.body?.nome||'').trim();if(!email||!password||!nome)return res.status(400).json({error:'Preencha nome, e-mail e senha.'});try{const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const{data,error}=await supabase.auth.signUp({email,password,options:{data:{nome}}});if(error){if(/already registered|already exists/i.test(String(error.message||'')))return res.status(409).json({error:'Este e-mail já possui uma conta.'});return res.status(error.status||400).json({error:'Não foi possível criar a conta. Confira os dados e tente novamente.'});}if(data?.user&&Array.isArray(data.user.identities)&&data.user.identities.length===0)return res.status(409).json({error:'Este e-mail já possui uma conta.'});return res.status(200).json({data});}catch(error){console.error('Erro no cadastro:',error);return res.status(502).json({error:'Serviço de cadastro indisponível. Tente novamente.'});}}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo nao permitido.' });
  }

  const email = String(req.body?.email || '').trim();
  const password = String(req.body?.password || '');
  const nome = String(req.body?.nome || '').trim();

  if (!email || !password || !nome) {
    return res.status(400).json({ error: 'Preencha nome, e-mail e senha.' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } }
    });

    if (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }

    return res.status(200).json({ data });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    return res.status(502).json({ error: 'Servico de cadastro indisponivel. Tente novamente.' });
  }
}
