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

        // Supabase limite à 1000 lignes par défaut — on pagine pour tout charger
        const PAGE_SIZE = 1000;
        let allData = [];
        let from = 0;
        let hasMore = true;

        while (hasMore) {
            let query = supabaseClient
                .from('articles')
                .select(`
                    *,
                    human_classifications (id, userneed, classified_at)
                `)
                .order('date_publication', { ascending: false })
                .range(from, from + PAGE_SIZE - 1);

            if (options.classified === true) {
                query = query.not('human_classifications', 'is', null);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Erreur chargement articles:', error);
                break;
            }

            if (data && data.length > 0) {
                allData = allData.concat(data);
                from += PAGE_SIZE;
                hasMore = data.length === PAGE_SIZE;
            } else {
                hasMore = false;
            }
        }

        // Si des options de limite/offset sont passées, les appliquer sur le résultat
        if (options.limit && !options.offset) {
            return allData.slice(0, options.limit);
        }

        return allData;
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
            .order('date_publication', { ascending: false });

        if (error) {
            console.error('Erreur chargement articles classifiés:', error);
            return [];
        }

        // Dédupliquer par article.id puis par titre :
        // - la jointure inner peut retourner plusieurs lignes si plusieurs classifications
        // - des articles republiés avec une URL différente partagent le même titre
        const seenById = new Map();
        for (const article of (data || [])) {
            if (!seenById.has(article.id)) {
                seenById.set(article.id, article);
            }
        }
        const seenByTitle = new Map();
        for (const article of seenById.values()) {
            const title = (article.titre || '').trim().toLowerCase();
            if (!title || !seenByTitle.has(title)) {
                seenByTitle.set(title || article.id, article);
            }
        }
        return Array.from(seenByTitle.values());
    }
}

// Instance globale
let articleManager = null;
