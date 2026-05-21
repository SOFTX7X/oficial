// Supabase separado do index.html
// Este arquivo precisa ficar na mesma pasta do index.html

const SUPABASE_URL = "https://wyjrjioipqfltdyupfna.supabase.co";
const SUPABASE_KEY = "sb_publishable_PkDkt5S-_rdrT0HhANoPAw_ZWluV2_H";

var db = window.supabase.createClient(
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

window.db = db;

console.log("Supabase conectado pelo arquivo supabase.js");
