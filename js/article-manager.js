// ============================================
// ARTICLE MANAGER
// Gestion des articles depuis Supabase
// (les articles sont alimentés par le cron local fetch_articles.py)
// ============================================

class ArticleManager {
    constructor() {
        this.articles = [];
    }

    /**
     * Charge les articles depuis Supabase avec filtres optionnels
     */
    async loadFromSupabase(options = {}) {
        if (!isSupabaseAvailable()) return [];

        let query = supabaseClient
            .from('articles')
            .select(`
                *,
                human_classifications (id, userneed, classified_at)
            `)
            .order('fetched_at', { ascending: false });

        if (options.limit) query = query.limit(options.limit);
        if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 30) - 1);
        if (options.classified === true) {
            query = query.not('human_classifications', 'is', null);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Erreur chargement articles:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Charge uniquement les articles classifiés (avec human_classifications)
     */
    async loadClassifiedArticles() {
        if (!isSupabaseAvailable()) return [];

        const { data, error } = await supabaseClient
            .from('articles')
            .select(`
                *,
                human_classifications!inner (id, userneed, classified_at, classified_by)
            `)
            .order('fetched_at', { ascending: false });

        if (error) {
            console.error('Erreur chargement articles classifiés:', error);
            return [];
        }

        return data || [];
    }
}

// Instance globale
let articleManager = null;
