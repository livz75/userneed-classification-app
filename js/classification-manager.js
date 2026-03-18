// ============================================
// CLASSIFICATION MANAGER
// Gestion des classifications humaines dans Supabase
// ============================================

class ClassificationManager {
    constructor() {}

    /**
     * Classifie un article avec un userneed
     * @param {string} articleId - UUID Supabase de l'article
     * @param {string} userneed - Un des 8 userneeds
     * @param {string} classifiedBy - Identifiant de l'utilisateur (défaut: 'anonymous')
     */
    async classify(articleId, userneed, classifiedBy = 'anonymous') {
        if (!isSupabaseAvailable()) {
            throw new Error('Supabase non disponible');
        }

        const { data, error } = await supabaseClient
            .from('human_classifications')
            .upsert({
                article_id: articleId,
                userneed: userneed,
                classified_by: classifiedBy,
                classified_at: new Date().toISOString()
            }, { onConflict: 'article_id,classified_by' })
            .select()
            .single();

        if (error) {
            console.error('Erreur classification:', error);
            throw error;
        }

        return data;
    }

    /**
     * Supprime la classification d'un article
     */
    async unclassify(articleId, classifiedBy = 'anonymous') {
        if (!isSupabaseAvailable()) return;

        const { error } = await supabaseClient
            .from('human_classifications')
            .delete()
            .eq('article_id', articleId)
            .eq('classified_by', classifiedBy);

        if (error) {
            console.error('Erreur suppression classification:', error);
            throw error;
        }
    }

    /**
     * Récupère la classification d'un article
     */
    async getClassification(articleId, classifiedBy = 'anonymous') {
        if (!isSupabaseAvailable()) return null;

        const { data, error } = await supabaseClient
            .from('human_classifications')
            .select('*')
            .eq('article_id', articleId)
            .eq('classified_by', classifiedBy)
            .maybeSingle();

        if (error) {
            console.error('Erreur lecture classification:', error);
            return null;
        }

        return data;
    }

    /**
     * Compte les articles classifiés vs non classifiés
     */
    async getStats() {
        if (!isSupabaseAvailable()) return { classified: 0, total: 0 };

        const { count: total } = await supabaseClient
            .from('articles')
            .select('*', { count: 'exact', head: true });

        const { count: classified } = await supabaseClient
            .from('human_classifications')
            .select('*', { count: 'exact', head: true });

        return {
            total: total || 0,
            classified: classified || 0,
            unclassified: (total || 0) - (classified || 0)
        };
    }
}

// Instance globale
let classificationManager = null;
