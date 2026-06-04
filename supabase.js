// supabase.js — conexão separada do AgendaPro
// Este arquivo precisa ficar na mesma pasta do index.html.

const SUPABASE_URL = "https://bbupjunmkutqrlamcdlx.supabase.co";

const SUPABASE_KEY = "sb_publishable_xnbWHgN5SIq4fqHRaNT-8A_Pc7qC8py";

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
