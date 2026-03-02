// ============================================
// ARTICLE MANAGER
// Gestion des articles via l'API franceinfo + Supabase
// ============================================

class ArticleManager {
    constructor() {
        this.articles = [];
        this.pollingInterval = null;
        this.pollingMs = 5 * 60 * 1000; // 5 minutes par défaut
        this.isPolling = false;
        this.currentPage = 1;
        this.itemsPerPage = 30;
        this.hasNextPage = false;
    }

    /**
     * Récupère les derniers articles depuis l'API franceinfo (via proxy)
     */
    async fetchLatest(page = 1, itemsPerPage = 30) {
        const response = await fetch(`/api/articles/latest?page=${page}&itemsPerPage=${itemsPerPage}`);
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `Erreur API: ${response.status}`);
        }

        const data = await response.json();
        this.currentPage = data.pagination.current_page;
        this.hasNextPage = data.pagination.has_next;
        return data.articles;
    }

    /**
     * Récupère un article par son ID franceinfo
     */
    async fetchById(externalId) {
        const response = await fetch(`/api/articles/${externalId}`);
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `Article ${externalId} non trouvé`);
        }
        return await response.json();
    }

    /**
     * Sauvegarde des articles dans Supabase (upsert sur external_id)
     * Retourne les articles avec leurs UUIDs Supabase
     */
    async saveToSupabase(articles) {
        if (!isSupabaseAvailable()) {
            console.warn('Supabase non disponible, articles en mémoire uniquement');
            return articles;
        }

        const rows = articles.map(a => ({
            external_id: a.external_id,
            url: a.url,
            titre: a.titre,
            chapo: a.chapo,
            corps: a.corps,
            auteur: a.auteur,
            path: a.path,
            word_count: a.word_count,
            date_publication: a.date_publication,
            date_modification: a.date_modification,
            metadata: a.metadata || {}
        }));

        const { data, error } = await supabaseClient
            .from('articles')
            .upsert(rows, { onConflict: 'external_id', ignoreDuplicates: false })
            .select();

        if (error) {
            console.error('Erreur sauvegarde articles:', error);
            throw error;
        }

        return data;
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

    /**
     * Enrichit les articles qui n'ont pas de corps texte en fetchant individuellement
     * Ne fetch que les types qui ont du contenu (Cms-Article, Cms-Live)
     */
    async enrichWithText(articles) {
        const toEnrich = articles.filter(a =>
            (!a.corps || a.corps.length === 0) &&
            a.content_type && (a.content_type === 'Cms-Article' || a.content_type === 'Cms-Live')
        );

        if (toEnrich.length === 0) return articles;

        console.log(`📝 Enrichissement de ${toEnrich.length} articles avec le texte complet...`);

        for (const article of toEnrich) {
            try {
                const full = await this.fetchById(article.external_id);
                if (full.corps) {
                    article.corps = full.corps;
                }
                // Petit délai pour ne pas surcharger l'API
                await new Promise(r => setTimeout(r, 200));
            } catch (e) {
                console.warn(`Impossible d'enrichir l'article ${article.external_id}:`, e.message);
            }
        }

        return articles;
    }

    /**
     * Récupère et sauvegarde les derniers articles (fetch + enrich + save)
     * Retourne les articles sauvegardés avec UUID
     */
    async fetchAndSave(page = 1, itemsPerPage = 30) {
        let articles = await this.fetchLatest(page, itemsPerPage);
        articles = await this.enrichWithText(articles);
        const saved = await this.saveToSupabase(articles);
        return saved;
    }

    /**
     * Démarre le polling automatique
     */
    startPolling(intervalMs = null) {
        if (intervalMs) this.pollingMs = intervalMs;
        this.stopPolling();
        this.isPolling = true;

        this.pollingInterval = setInterval(async () => {
            try {
                console.log('🔄 Polling: récupération des derniers articles...');
                const articles = await this.fetchAndSave(1, 30);
                console.log(`✅ Polling: ${articles.length} articles récupérés`);
                // Déclencher un événement pour mettre à jour l'UI
                window.dispatchEvent(new CustomEvent('articles-updated', { detail: { articles } }));
            } catch (error) {
                console.error('❌ Polling error:', error);
            }
        }, this.pollingMs);

        console.log(`🔄 Polling démarré (intervalle: ${this.pollingMs / 1000}s)`);
    }

    /**
     * Arrête le polling automatique
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.isPolling = false;
        console.log('⏹ Polling arrêté');
    }
}

// Instance globale
let articleManager = null;
