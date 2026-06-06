import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.URL_SUPABASE,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { data, error } = await supabase
    .from("agenda_empresas")
    .select("id, nome, slug, plano, status")
    .limit(1);

  if (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }

  return res.status(200).json({
    success: true,
    empresa: data[0] || null
  });
}
