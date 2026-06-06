export default async function handler(req, res) {
  const url = process.env.URL_SUPABASE;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const response = await fetch(`${url}/rest/v1/agenda_empresas?select=id,nome,slug,plano,status&limit=1`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });

  const data = await response.json();

  return res.status(200).json({
    success: true,
    empresa: data[0] || null
  });
}
