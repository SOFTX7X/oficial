const SUPABASE_URL = "https://wyjrjioipqfltdyupfna.supabase.co";

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljc2NrbmRpYmtidnh0cmJseXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjIyNDQsImV4cCI6MjA5NDY5ODI0NH0.BN1cpl56RCa-Gts-iMC-F2mjqGHuic1MXvg-k7l2qiM";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

console.log("Supabase conectado!");
