const SUPABASE_URL = "https://wyjrjioipqfltdyupfna.supabase.co";

const SUPABASE_KEY = "sb_publishable_PkDkt5S-_rdrT0HhANoPAw_ZWluV2_H";

window.db = supabase.createClient(
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

// Também deixa db disponível para scripts antigos que usam db.from(...)
var db = window.db;

console.log("Supabase conectado pelo arquivo supabase.js");
