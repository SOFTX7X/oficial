// supabase.js — conexão separada do AgendaPro
// Este arquivo precisa ficar na mesma pasta do index.html.

const SUPABASE_URL = "https://wyjrjioipqfltdyupfna.supabase.co";

const SUPABASE_KEY = "sb_publishable_PkDkt5S-_rdrT0HhANoPAw_ZWluV2_H";

window.db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  }
);

// Compatibilidade com o código antigo que chama db.from(...)
var db = window.db;

console.log("✅ Supabase conectado pelo supabase.js");
