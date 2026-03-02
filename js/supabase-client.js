// ============================================
// SUPABASE CLIENT INITIALIZATION
// ============================================

let supabaseClient = null;
let supabaseConfig = null;

/**
 * Initialise le client Supabase à partir de config.json
 * @returns {boolean} true si l'initialisation a réussi
 */
async function initSupabase() {
    try {
        // Charger la config depuis config.json
        const response = await fetch('/config.json');
        if (!response.ok) throw new Error('config.json non trouvé');
        const config = await response.json();

        const url = config.supabase_url;
        const key = config.supabase_anon_key;

        if (!url || !key) {
            console.warn('⚠️ Configuration Supabase manquante dans config.json');
            return false;
        }

        // Vérifier que le SDK Supabase est chargé
        if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
            console.error('❌ SDK Supabase non chargé');
            return false;
        }

        supabaseClient = window.supabase.createClient(url, key);
        supabaseConfig = { url, key };
        console.log('✅ Client Supabase initialisé');

        // Test de connexion rapide
        const { error } = await supabaseClient.from('prompts').select('id', { count: 'exact', head: true });
        if (error) {
            console.warn('⚠️ Supabase connecté mais erreur de requête:', error.message);
        } else {
            console.log('✅ Connexion Supabase vérifiée');
        }

        return true;
    } catch (error) {
        console.warn('⚠️ Impossible d\'initialiser Supabase:', error.message);
        supabaseClient = null;
        return false;
    }
}

/**
 * Vérifie si Supabase est disponible
 */
function isSupabaseAvailable() {
    return supabaseClient !== null;
}
