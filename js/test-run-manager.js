// ============================================
// TEST RUN MANAGER
// Gestion des test runs (couple LLM/Prompt) dans Supabase
// ============================================

class TestRunManager {
    constructor() {}

    /**
     * Crée un nouveau test run
     */
    async createRun(name, model, promptId, promptSnapshot, totalArticles) {
        if (!isSupabaseAvailable()) {
            throw new Error('Supabase non disponible');
        }

        const { data, error } = await supabaseClient
            .from('test_runs')
            .insert({
                name: name,
                llm_model: model,
                prompt_id: promptId,
                prompt_snapshot: promptSnapshot,
                status: 'running',
                total_articles: totalArticles,
                analyzed_articles: 0,
                started_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Erreur création test run:', error);
            throw error;
        }

        return data;
    }

    /**
     * Ajoute un résultat d'analyse IA pour un article
     */
    async addAnalysis(runId, articleId, result) {
        if (!isSupabaseAvailable()) return null;

        const { data, error } = await supabaseClient
            .from('ai_analyses')
            .upsert({
                test_run_id: runId,
                article_id: articleId,
                predicted_userneed: result.predictedUserneed,
                predictions: result.predictions || [],
                justification: result.justification || '',
                is_match: result.isMatch,
                delta: result.delta,
                icp: result.icp,
                confidence_level: result.confidenceLevel,
                raw_response: result.rawResponse || '',
                analyzed_at: new Date().toISOString()
            }, { onConflict: 'test_run_id,article_id' })
            .select()
            .single();

        if (error) {
            console.error('Erreur ajout analyse:', error);
            return null;
        }

        // Mettre à jour le compteur du test run
        await supabaseClient
            .from('test_runs')
            .update({ analyzed_articles: result.articleIndex + 1 })
            .eq('id', runId);

        return data;
    }

    /**
     * Marque un test run comme terminé avec les stats finales
     */
    async completeRun(runId, stats) {
        if (!isSupabaseAvailable()) return;

        const { error } = await supabaseClient
            .from('test_runs')
            .update({
                status: 'completed',
                analyzed_articles: stats.analyzedArticles,
                concordant_count: stats.concordantCount,
                concordant_percent: stats.concordantPercent,
                confusion_matrix: stats.confusionMatrix,
                statistics: stats.statistics || {},
                completed_at: new Date().toISOString()
            })
            .eq('id', runId);

        if (error) {
            console.error('Erreur completion test run:', error);
        }
    }

    /**
     * Marque un test run comme arrêté (par l'utilisateur)
     */
    async stopRun(runId, stats) {
        if (!isSupabaseAvailable()) return;

        const { error } = await supabaseClient
            .from('test_runs')
            .update({
                status: 'stopped',
                analyzed_articles: stats.analyzedArticles,
                concordant_count: stats.concordantCount,
                concordant_percent: stats.concordantPercent,
                confusion_matrix: stats.confusionMatrix,
                statistics: stats.statistics || {},
                completed_at: new Date().toISOString()
            })
            .eq('id', runId);

        if (error) {
            console.error('Erreur stop test run:', error);
        }
    }

    /**
     * Récupère un test run avec ses stats
     */
    async getRun(runId) {
        if (!isSupabaseAvailable()) return null;

        const { data, error } = await supabaseClient
            .from('test_runs')
            .select('*, prompts(name)')
            .eq('id', runId)
            .single();

        if (error) {
            console.error('Erreur lecture test run:', error);
            return null;
        }

        return data;
    }

    /**
     * Liste tous les test runs
     */
    async listRuns(limit = 50) {
        if (!isSupabaseAvailable()) return [];

        const { data, error } = await supabaseClient
            .from('test_runs')
            .select('*, prompts(name)')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Erreur listing test runs:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Récupère les analyses d'un test run avec les articles et classifications
     */
    async getRunAnalyses(runId) {
        if (!isSupabaseAvailable()) return [];

        const { data, error } = await supabaseClient
            .from('ai_analyses')
            .select(`
                *,
                articles (
                    id, external_id, titre, url, chapo, corps,
                    human_classifications (userneed, classified_by)
                )
            `)
            .eq('test_run_id', runId)
            .order('analyzed_at');

        if (error) {
            console.error('Erreur lecture analyses:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Supprime un test run et toutes ses analyses
     */
    async deleteRun(runId) {
        if (!isSupabaseAvailable()) return;

        const { error } = await supabaseClient
            .from('test_runs')
            .delete()
            .eq('id', runId);

        if (error) {
            console.error('Erreur suppression test run:', error);
            throw error;
        }
    }
}

// Instance globale
let testRunManager = null;
