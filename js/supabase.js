// js/supabase.js
const SUPABASE_URL = 'https://darhtqqqoktnsvymrdsb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o5LTnSIFYQSYOwDrymI1HQ_j5UY48iR';

// Inicializar el cliente global de Supabase
window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);