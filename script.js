const tableContainer = document.getElementById('tableContainer');
const tableHead = document.getElementById('tableHead');
const tableBody = document.getElementById('tableBody');
const tableTitle = document.getElementById('tableTitle');
const errorDiv = document.getElementById('error');
const clearBtn = document.getElementById('clearBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const resetBtn = document.getElementById('resetBtn');
const progressContainer = document.getElementById('progress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const stopBtn = document.getElementById('stopBtn');
const statsContainer = document.getElementById('statsContainer');
const exportBtn = document.getElementById('exportBtn');

let currentArticles = []; // Articles chargés depuis Supabase (avec classifications)
let stopAnalysis = false;
let articleResults = []; // Stockage global des résultats d'analyse
let articleFilter = 'unclassified'; // 'all' | 'classified' | 'unclassified'
let articleCategoryFilter = 'all'; // 'all' | '<category>'
let articleMediaTypeFilter = 'all'; // 'all' | 'article' | 'video' | 'autre'
let articleTitleSearch = ''; // recherche libre sur le titre

// Variables pour le filtrage de la matrice
let matrixFilter = {
    active: false,
    sourceUserneed: null,
    predictionUserneed: null,
    selectedCellIndex: null
};

// Variable pour le filtrage par confiance
let confidenceFilter = 'all'; // 'all' | 'haute' | 'haute+moyenne' | 'basse'

// Variable pour le filtrage par concordance
let concordanceFilter = 'all'; // 'all' | 'concordant' | 'non-concordant'

// Sélection pour la comparaison (max 2 IDs)
let selectedRunIds = [];

// ===================================
// HEALTH CHECK DU SERVEUR
// ===================================

/**
 * Vérifie que le serveur proxy local est actif et fonctionnel
 * Affiche une alerte si le serveur n'est pas accessible
 */
async function checkServerHealth() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch('/api/health', {
            method: 'GET',
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Serveur proxy détecté et fonctionnel');
            console.log(`📦 Modèle configuré : ${data.model}`);
            return true;
        } else {
            throw new Error(`Status ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Serveur proxy non accessible:', error.message);

        // Afficher une alerte visuelle à l'utilisateur
        const errorDiv = document.getElementById('error');
        if (errorDiv) {
            errorDiv.style.display = 'block';
            errorDiv.innerHTML = `
                <div style="background: rgba(239, 68, 68, 0.1); border: 2px solid var(--accent-red); border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: var(--accent-red); margin-top: 0;">⚠️ SERVEUR NON DÉMARRÉ</h3>
                    <p style="margin-bottom: 15px;">Le serveur local doit être lancé pour utiliser cette application.</p>
                    <p style="font-weight: 600; margin-bottom: 10px;">Ouvrez un terminal et exécutez :</p>
                    <pre style="background: var(--bg-darker); padding: 15px; border-radius: 8px; overflow-x: auto;">cd "/Users/livioricci/Documents/FRANCETV/App qualif user needs"
python3 server.py</pre>
                    <p style="margin-top: 15px; font-size: 0.9em; color: var(--text-secondary);">
                        💡 Une fois le serveur démarré, rechargez cette page.
                    </p>
                </div>
            `;
        }

        return false;
    }
}

// Les 8 userneeds dans l'ordre
// MODELS — triés du meilleur au moins bon pour cette application
// Coût estimé pour 50 articles : 50 × (400 tokens entrée + 120 tokens sortie)
// = 20 000 tokens entrée + 6 000 tokens sortie
const INPUT_TOKENS_50 = 20000;
const OUTPUT_TOKENS_50 = 6000;

const MODELS = [
    // id, provider, name, speedLabel, speedStars(1-5), input$/M, output$/M, qualityStars, french(1-3), recommended, note
    { id: 'anthropic/claude-3.5-haiku',                 provider: 'Anthropic', name: 'Claude 3.5 Haiku',       speed: '⚡⚡⚡ Très rapide', input: 0.80,  output: 4.00,  quality: 5, french: 3, recommended: true,  note: 'Meilleur équilibre vitesse/qualité/français' },
    { id: 'openai/gpt-4o-mini',                         provider: 'OpenAI',    name: 'GPT-4o Mini',            speed: '⚡⚡⚡ Très rapide', input: 0.15,  output: 0.60,  quality: 4, french: 3, recommended: true,  note: 'Excellent rapport qualité/prix' },
    { id: 'mistralai/mistral-small-24b-instruct-2501',  provider: 'Mistral',   name: 'Mistral Small 3.1',      speed: '⚡⚡ Rapide',        input: 0.10,  output: 0.30,  quality: 4, french: 3, recommended: true,  note: 'Modèle européen, excellent en français' },
    { id: 'google/gemini-2.5-flash-lite',               provider: 'Google',    name: 'Gemini 2.5 Flash Lite',  speed: '⚡⚡⚡ Très rapide', input: 0.10,  output: 0.40,  quality: 4, french: 2, recommended: true,  note: 'Ultra rapide, très économique' },
    { id: 'google/gemini-flash-1.5',                    provider: 'Google',    name: 'Gemini Flash 1.5',       speed: '⚡⚡⚡ Très rapide', input: 0.075, output: 0.30,  quality: 3, french: 2, recommended: false, note: 'Le moins cher du marché' },
    { id: 'deepseek/deepseek-chat',                     provider: 'DeepSeek',  name: 'DeepSeek V3',            speed: '⚡⚡ Rapide',        input: 0.14,  output: 0.28,  quality: 4, french: 2, recommended: false, note: 'Surprise : très bon pour le prix' },
    { id: 'meta-llama/llama-3.3-70b-instruct',          provider: 'Meta',      name: 'Llama 3.3 70B',          speed: '⚡⚡ Rapide',        input: 0.13,  output: 0.40,  quality: 4, french: 2, recommended: false, note: 'Open source, bonne qualité' },
    { id: 'anthropic/claude-3.5-sonnet',                provider: 'Anthropic', name: 'Claude 3.5 Sonnet',      speed: '⚡ Modéré',         input: 3.00,  output: 15.00, quality: 5, french: 3, recommended: false, note: 'Qualité maximale, idéal pour valider' },
    { id: 'openai/gpt-4o',                              provider: 'OpenAI',    name: 'GPT-4o',                 speed: '⚡ Modéré',         input: 2.50,  output: 10.00, quality: 5, french: 3, recommended: false, note: 'Très bonne qualité, coût élevé' },
    { id: 'google/gemini-pro-1.5',                      provider: 'Google',    name: 'Gemini Pro 1.5',         speed: '⚡ Modéré',         input: 1.25,  output: 5.00,  quality: 4, french: 2, recommended: false, note: 'Bon compromis qualité/prix' },
    { id: 'qwen/qwen-2.5-72b-instruct',                 provider: 'Alibaba',   name: 'Qwen 2.5 72B',           speed: '⚡ Modéré',         input: 0.40,  output: 0.40,  quality: 3, french: 2, recommended: false, note: 'Alternatif économique' },
    { id: 'mistralai/mistral-medium',                   provider: 'Mistral',   name: 'Mistral Medium',         speed: '⚡ Modéré',         input: 0.40,  output: 1.20,  quality: 3, french: 3, recommended: false, note: 'Bon français, moins récent' },
    { id: 'meta-llama/llama-3.1-8b-instruct',           provider: 'Meta',      name: 'Llama 3.1 8B',           speed: '⚡⚡⚡ Très rapide', input: 0,     output: 0,     quality: 2, french: 1, recommended: false, note: 'Gratuit, qualité limitée' },
    { id: 'anthropic/claude-3-opus',                    provider: 'Anthropic', name: 'Claude 3 Opus',          speed: '🐢 Lent',           input: 15.00, output: 75.00, quality: 5, french: 3, recommended: false, note: 'Le plus puissant, très coûteux' },
];

const USERNEEDS = [
    'UPDATE ME',
    'EXPLAIN ME',
    'GIVE ME PERSPECTIVE',
    'GIVE ME A BREAK',
    'GIVE ME CONCERNING NEWS',
    'INSPIRE ME',
    'MAKE ME FEEL THE NEWS',
    'REVEAL NEWS'
];

// Mapping des variantes de userneeds vers leur forme canonique
const USERNEED_VARIANTS = {
    'CONCERNING NEWS': 'GIVE ME CONCERNING NEWS',
    'GIVE ME CONCERNING NEWS': 'GIVE ME CONCERNING NEWS',
    'MAKE ME FEEL': 'MAKE ME FEEL THE NEWS',
    'MAKE ME FEEL THE NEWS': 'MAKE ME FEEL THE NEWS',
    'REVEAL ME': 'REVEAL NEWS',
    'REVEAL NEWS': 'REVEAL NEWS',
    'UPDATE ME': 'UPDATE ME',
    'EXPLAIN ME': 'EXPLAIN ME',
    'GIVE ME PERSPECTIVE': 'GIVE ME PERSPECTIVE',
    'GIVE ME A BREAK': 'GIVE ME A BREAK',
    'INSPIRE ME': 'INSPIRE ME'
};

// Normalise un userneed vers sa forme canonique
function normalizeUserneed(userneed) {
    if (!userneed) return null;
    const normalized = userneed.trim().toUpperCase();
    return USERNEED_VARIANTS[normalized] || normalized;
}

// Parse la réponse de Claude pour extraire userneed et justification
function parseAIResponse(responseText) {
    const text = responseText.trim();

    // Regex universelle pour capturer tous les formats possibles:
    // Format 1: "Le userneed principal est GIVE ME CONCERNING NEWS, avec un score de 50."
    // Format 2: "Userneed principal : UPDATE ME (80 points)"
    // Format 3: "Userneed principal : GIVE CONCERNING NEWS (score : 60)"
    // Format 4: "Userneed principal : REVEAL NEWS (score 70)"

    let principalMatch = text.match(/userneed\s+principal\s*(?:est\s+|:\s*)([A-Z\s]+?)[\s,]*(?:avec\s+un\s+score\s+de\s+|\(score\s*:?\s*|\()(\d+)/i);
    let secondaireMatch = text.match(/userneed\s+secondaire\s*(?:est\s+|:\s*)([A-Z\s]+?)[\s,]*(?:avec\s+un\s+score\s+de\s+|\(score\s*:?\s*|\()(\d+)/i);
    let tertiaireMatch = text.match(/userneed\s+tertiaire\s*(?:est\s+|:\s*)([A-Z\s]+?)[\s,]*(?:avec\s+un\s+score\s+de\s+|\(score\s*:?\s*|\()(\d+)/i);

    // Extraire les justifications (uniquement le texte après "JUSTIFICATION :")
    const principalJustMatch = text.match(/USERNEED\s+PRINCIPAL[^\n]*\n\s*JUSTIFICATION\s*:\s*([^\n]+)/i);
    const secondaireJustMatch = text.match(/USERNEED\s+SECONDAIRE[^\n]*\n\s*JUSTIFICATION\s*:\s*([^\n]+)/i);
    const tertiaireJustMatch = text.match(/USERNEED\s+TERTIAIRE[^\n]*\n\s*JUSTIFICATION\s*:\s*([^\n]+)/i);

    // Valider et normaliser les userneeds
    const validUserneeds = USERNEEDS.join('|').replace(/\s+/g, '\\s+');
    const validateUserneed = (name) => {
        if (!name) return null;
        const regex = new RegExp(`(${validUserneeds})`, 'i');
        const match = name.trim().match(regex);
        return match ? match[1].toUpperCase().trim() : null;
    };

    // Si on a trouvé les 3 userneeds, retourner la nouvelle structure
    if (principalMatch || secondaireMatch || tertiaireMatch) {
        const predictions = [
            {
                userneed: validateUserneed(principalMatch?.[1]) || '❓ Non identifié',
                score: parseInt(principalMatch?.[2] || 0),
                rank: 'principal',
                justification: principalJustMatch?.[1]?.trim() || ''
            },
            {
                userneed: validateUserneed(secondaireMatch?.[1]) || '❓ Non identifié',
                score: parseInt(secondaireMatch?.[2] || 0),
                rank: 'secondaire',
                justification: secondaireJustMatch?.[1]?.trim() || ''
            },
            {
                userneed: validateUserneed(tertiaireMatch?.[1]) || '❓ Non identifié',
                score: parseInt(tertiaireMatch?.[2] || 0),
                rank: 'tertiaire',
                justification: tertiaireJustMatch?.[1]?.trim() || ''
            }
        ];
        // Plus de filtre → toujours 3 éléments

        return {
            predictions,
            justification: principalJustMatch?.[1]?.trim() || '',
            hasJustification: !!principalJustMatch?.[1]
        };
    }

    // FALLBACK: Ancien format (pour compatibilité avec anciens articles)
    const userneedRegex = new RegExp(`(${validUserneeds})`, 'i');
    const userneedMatch = text.match(userneedRegex);

    if (userneedMatch) {
        const userneed = userneedMatch[1].trim();
        const userneedIndex = text.indexOf(userneedMatch[0]);
        const afterUserneed = text.substring(userneedIndex + userneedMatch[0].length).trim();

        const explicitJustifRegex = /(?:justification|raisonnement|explication|raison|analyse)\s*:?\s*(.+)/is;
        const explicitMatch = afterUserneed.match(explicitJustifRegex);

        if (explicitMatch) {
            return {
                userneed: userneed,
                justification: explicitMatch[1].trim(),
                hasJustification: true
            };
        }

        if (afterUserneed.length > 20) {
            return {
                userneed: userneed,
                justification: afterUserneed,
                hasJustification: true
            };
        }

        const beforeUserneed = text.substring(0, userneedIndex).trim();
        if (beforeUserneed.length > 20) {
            return {
                userneed: userneed,
                justification: beforeUserneed,
                hasJustification: true
            };
        }

        return {
            userneed: userneed,
            justification: null,
            hasJustification: false
        };
    }

    return {
        userneed: text,
        justification: null,
        hasJustification: false
    };
}

// ========================
// CONFIDENCE SCORE
// ========================

/**
 * Calcule le score de confiance d'un article basé sur les prédictions.
 * @param {Array} predictions - Tableau de 3 prédictions [{userneed, score, rank}, ...]
 * @returns {Object} {delta, icp, confidenceLevel, icpLevel}
 */
function calculateConfidence(predictions) {
    if (!predictions || predictions.length < 2) {
        return { delta: 0, icp: 0, confidenceLevel: 'BASSE', icpLevel: 'BASSE' };
    }

    const scoreP1 = predictions[0].score;
    const scoreP2 = predictions[1].score;

    // Delta P1-P2
    const delta = scoreP1 - scoreP2;

    // ICP = (Delta / 100) × Score P1
    const icp = Math.round(((delta / 100) * scoreP1) * 10) / 10;

    // Niveau basé sur le delta
    let confidenceLevel;
    if (delta >= 30) {
        confidenceLevel = 'HAUTE';
    } else if (delta >= 15) {
        confidenceLevel = 'MOYENNE';
    } else {
        confidenceLevel = 'BASSE';
    }

    // Niveau basé sur l'ICP
    let icpLevel;
    if (icp >= 18) {
        icpLevel = 'HAUTE';
    } else if (icp >= 7) {
        icpLevel = 'MOYENNE';
    } else {
        icpLevel = 'BASSE';
    }

    return { delta, icp, confidenceLevel, icpLevel };
}

// ========================
// PROMPT MANAGEMENT SYSTEM
// ========================

class PromptManager {
    constructor() {
        this.prompts = [];
        this.activePromptId = null;
        this.storageKey = 'userneeds_prompts';
        this.activePromptKey = 'userneeds_active_prompt_id';
        this.settingsKey = 'userneeds_settings';
        this.supabaseReady = false;
        this.initializeSync();
    }

    // Initialisation synchrone (localStorage uniquement) pour affichage immédiat
    initializeSync() {
        this.loadFromLocalStorage();
        if (this.prompts.length === 0) {
            this.createDefaultPrompt();
        }
        if (!this.activePromptId || !this.getPromptById(this.activePromptId)) {
            const defaultPrompt = this.prompts.find(p => p.isDefault) || this.prompts[0];
            this.activePromptId = defaultPrompt.id;
        }
    }

    // Initialisation async (Supabase) — appelée après initSupabase()
    async initializeAsync() {
        if (!isSupabaseAvailable()) {
            console.log('📝 Prompts: mode localStorage uniquement');
            return;
        }

        try {
            // Tenter la migration localStorage → Supabase
            await this.migrateToSupabase();
            // Charger depuis Supabase
            await this.loadFromSupabase();
            this.supabaseReady = true;
            console.log('✅ Prompts synchronisés avec Supabase');
        } catch (error) {
            console.warn('⚠️ Fallback localStorage pour les prompts:', error.message);
        }
    }

    // Migration one-time : localStorage → Supabase
    async migrateToSupabase() {
        if (localStorage.getItem('prompts_migrated_to_supabase')) return;
        if (!isSupabaseAvailable()) return;

        const localPrompts = this.prompts;
        if (localPrompts.length === 0) return;

        // Vérifier si Supabase a déjà des prompts
        const { data: existing } = await supabaseClient
            .from('prompts')
            .select('id')
            .limit(1);

        if (existing && existing.length > 0) {
            localStorage.setItem('prompts_migrated_to_supabase', 'true');
            return;
        }

        // Migrer tous les prompts
        const rows = localPrompts.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description || '',
            content: typeof p.content === 'string' ? p.content : JSON.stringify(p.content),
            is_default: p.isDefault || false,
            is_active: p.id === this.activePromptId,
            userneeds: p.userneeds || USERNEEDS,
            metadata: p.metadata || {},
            created_at: p.createdAt || new Date().toISOString(),
            modified_at: p.modifiedAt || new Date().toISOString()
        }));

        const { error } = await supabaseClient.from('prompts').upsert(rows);
        if (error) {
            console.error('Erreur migration prompts:', error);
            return;
        }

        localStorage.setItem('prompts_migrated_to_supabase', 'true');
        console.log(`✅ ${rows.length} prompt(s) migrés vers Supabase`);
    }

    // Charger depuis Supabase
    async loadFromSupabase() {
        if (!isSupabaseAvailable()) return false;

        const { data, error } = await supabaseClient
            .from('prompts')
            .select('*')
            .order('created_at');

        if (error) {
            console.warn('Erreur chargement Supabase prompts:', error.message);
            return false;
        }

        if (data && data.length > 0) {
            this.prompts = data.map(row => ({
                id: row.id,
                name: row.name,
                description: row.description || '',
                isDefault: row.is_default,
                isActive: row.is_active,
                createdAt: row.created_at,
                modifiedAt: row.modified_at,
                content: row.content,
                userneeds: row.userneeds || USERNEEDS,
                metadata: row.metadata || {}
            }));

            // Trouver le prompt actif
            const activePrompt = this.prompts.find(p => p.isActive);
            if (activePrompt) {
                this.activePromptId = activePrompt.id;
            }
            // Sauvegarder en localStorage comme cache
            this.saveToLocalStorage();
            return true;
        }
        return false;
    }

    // Sauvegarder vers Supabase (+ localStorage en cache)
    async saveToSupabase() {
        // Toujours sauvegarder en localStorage (cache/fallback)
        this.saveToLocalStorage();

        if (!isSupabaseAvailable() || !this.supabaseReady) return;

        const rows = this.prompts.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description || '',
            content: typeof p.content === 'string' ? p.content : JSON.stringify(p.content),
            is_default: p.isDefault || false,
            is_active: p.id === this.activePromptId,
            userneeds: p.userneeds || USERNEEDS,
            metadata: p.metadata || {},
            created_at: p.createdAt || new Date().toISOString(),
            modified_at: p.modifiedAt || new Date().toISOString()
        }));

        const { error } = await supabaseClient.from('prompts').upsert(rows);
        if (error) {
            console.error('Erreur sauvegarde Supabase prompts:', error);
        }
    }

    initialize() {
        // Backward compat — appelé nulle part maintenant, voir initializeSync()
        this.initializeSync();
    }

    createDefaultPrompt() {
        const defaultPrompt = {
            id: 'prompt_default_system',
            name: 'Prompt système Franceinfo',
            description: 'Prompt d\'origine avec 8 userneeds standards',
            isDefault: true,
            isActive: true,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
            content: `#ROLE
Tu es un expert en data analyse et IA spécialisé dans la classification éditoriale pour France Télévisions. Ta mission est de catégoriser précisément des articles de franceinfo selon 8 userneeds prédéfinis.

#VISION DE FRANCEINFO

1. L'information de Franceinfo est le reflet d'une couverture exacte, équilibrée, complète et impartiale de l'actualité.
2. L'information de Franceinfo est certifiée, validée avant d'être publiée.
3. L'information de Franceinfo revendique la liberté de ton sur tous les supports.
4. L'information de Franceinfo est au service du public et participe à la construction de la citoyenneté.
5. L'information de Franceinfo est honnête et transparente.

#DÉFINITIONS DES USERNEEDS

1. UPDATE ME - Information factuelle sur l'actualité récente. Brèves ou contenus factuels récapitulant les événements.

2. EXPLAIN ME - Vulgarisation et mise en contexte pédagogique. Premier niveau de compréhension, synthétique et didactique.

3. GIVE ME PERSPECTIVE - Analyse approfondie avec différents points de vue. Second niveau de compréhension pour ceux qui connaissent déjà le sujet.

4. GIVE ME A BREAK - Contenus légers et divertissants. Insolite, étonnant, drôle, curiosité.

5. GIVE ME CONCERNING NEWS - Contenus qui touchent à la sphère privée, dans l'air du temps, utiles au quotidien.

6. INSPIRE ME - Récits inspirants et solutions. Histoires positives, résilience, espoir, journalisme de solution.

7. MAKE ME FEEL THE NEWS - Témoignages et expériences vécues. Récits de première main qui provoquent une émotion.

8. REVEAL NEWS - Enquêtes et révélations exclusives. Information obtenue par France Télévisions/franceinfo/Radio France.

#TÂCHE

Analyse cet article et réponds EXACTEMENT avec ce format (ne rajoute rien d'autre) :

USERNEED: [nom exact du userneed]
JUSTIFICATION: [2-3 phrases expliquant pourquoi ce userneed correspond à l'article]

Userneeds disponibles :
- UPDATE ME
- EXPLAIN ME
- GIVE ME PERSPECTIVE
- GIVE ME A BREAK
- GIVE ME CONCERNING NEWS
- INSPIRE ME
- MAKE ME FEEL THE NEWS
- REVEAL NEWS

Règle CRITIQUE : Tu dois répondre EXACTEMENT avec le format ci-dessus. Commence par "USERNEED:" suivi du nom, puis sur une nouvelle ligne "JUSTIFICATION:" suivi de ton explication. Ne rajoute AUCUN texte avant ou après.`,
            userneeds: [...USERNEEDS],
            metadata: {
                version: '1.0',
                author: 'system',
                tags: ['default', 'franceinfo', '8-categories']
            }
        };
        this.prompts.push(defaultPrompt);
        this.activePromptId = defaultPrompt.id;
        this.saveToStorage();
    }

    loadFromLocalStorage() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const parsed = JSON.parse(data);
                this.prompts = parsed.map(prompt => migrateOldPromptFormat(prompt));
            }
            const activeId = localStorage.getItem(this.activePromptKey);
            if (activeId) {
                this.activePromptId = activeId;
            }
        } catch (error) {
            console.error('Erreur lors du chargement des prompts:', error);
            this.prompts = [];
        }
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.prompts));
            localStorage.setItem(this.activePromptKey, this.activePromptId);
            localStorage.setItem(this.settingsKey, JSON.stringify({
                lastModified: new Date().toISOString(),
                version: '1.0'
            }));
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des prompts:', error);
        }
    }

    // Méthode de compatibilité — redirige vers dual save (localStorage + Supabase)
    saveToStorage() {
        this.saveToLocalStorage();
        this.saveToSupabase(); // async, fire-and-forget
    }

    loadFromStorage() {
        this.loadFromLocalStorage();
    }

    getActivePrompt() {
        return this.getPromptById(this.activePromptId) || this.prompts[0];
    }

    getPromptById(id) {
        return this.prompts.find(p => p.id === id);
    }

    buildFullPrompt(titre, chapo, corps) {
        const activePrompt = this.getActivePrompt();
        if (!activePrompt) {
            throw new Error('Aucun prompt actif trouvé');
        }

        // Le prompt de base est déjà complet dans content (string)
        const basePrompt = activePrompt.content;

        // Ajouter uniquement la section article à analyser
        const articleSection = `\n\n#ARTICLE À ANALYSER\n\nTitre: ${titre}\n\nChapô: ${chapo}\n\nCorps: ${corps}`;

        return basePrompt + articleSection;
    }

    setActivePrompt(id) {
        const prompt = this.getPromptById(id);
        if (prompt) {
            this.activePromptId = id;
            this.prompts.forEach(p => p.isActive = (p.id === id));
            this.saveToStorage();
            return true;
        }
        return false;
    }

    createPrompt(promptData) {
        const newPrompt = {
            id: `prompt_${Date.now()}`,
            name: promptData.name,
            description: promptData.description || '',
            isDefault: false,
            isActive: false,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
            content: { ...promptData.content },
            userneeds: promptData.userneeds || [...USERNEEDS],
            metadata: {
                version: '1.0',
                author: 'user',
                tags: promptData.tags || []
            }
        };
        this.prompts.push(newPrompt);
        this.saveToStorage();
        return newPrompt;
    }

    updatePrompt(id, updates) {
        const prompt = this.getPromptById(id);
        if (prompt && !prompt.isDefault) {
            Object.assign(prompt, updates);
            prompt.modifiedAt = new Date().toISOString();
            this.saveToStorage();
            return true;
        }
        return false;
    }

    deletePrompt(id) {
        const index = this.prompts.findIndex(p => p.id === id);
        if (index !== -1 && !this.prompts[index].isDefault) {
            this.prompts.splice(index, 1);
            if (this.activePromptId === id) {
                const defaultPrompt = this.prompts.find(p => p.isDefault) || this.prompts[0];
                this.activePromptId = defaultPrompt.id;
            }
            this.saveToStorage();
            // Supprimer aussi de Supabase
            if (isSupabaseAvailable() && this.supabaseReady) {
                supabaseClient.from('prompts').delete().eq('id', id)
                    .then(({ error }) => { if (error) console.error('Erreur suppression Supabase:', error); });
            }
            return true;
        }
        return false;
    }

    duplicatePrompt(id) {
        const original = this.getPromptById(id);
        if (original) {
            return this.createPrompt({
                name: `${original.name} (Copie)`,
                description: original.description,
                content: { ...original.content },
                userneeds: [...original.userneeds],
                tags: [...(original.metadata.tags || [])]
            });
        }
        return null;
    }

    exportPrompts() {
        return {
            version: '1.0',
            exportDate: new Date().toISOString(),
            prompts: this.prompts
        };
    }

    importPrompts(data, mergeStrategy = 'replace') {
        try {
            if (!data.prompts || !Array.isArray(data.prompts)) {
                throw new Error('Format invalide');
            }

            if (mergeStrategy === 'replace') {
                this.prompts = data.prompts;
            } else if (mergeStrategy === 'merge') {
                data.prompts.forEach(p => {
                    if (!this.getPromptById(p.id)) {
                        this.prompts.push(p);
                    }
                });
            }

            this.saveToStorage();
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'import:', error);
            return false;
        }
    }
}

// Migration des anciens prompts (format objet) vers nouveau format (string)
function migrateOldPromptFormat(prompt) {
    // Si content est déjà une string, rien à faire
    if (typeof prompt.content === 'string') {
        return prompt;
    }

    // Si content est un objet (ancien format), convertir en string
    if (typeof prompt.content === 'object' && prompt.content !== null) {
        let fullPrompt = '';

        if (prompt.content.role) {
            fullPrompt += `#ROLE\n${prompt.content.role}\n\n`;
        }

        if (prompt.content.vision) {
            fullPrompt += `#VISION DE FRANCEINFO\n${prompt.content.vision}\n\n`;
        }

        if (prompt.content.definitions) {
            fullPrompt += `#DÉFINITIONS DES USERNEEDS\n\n${prompt.content.definitions}\n\n`;
        }

        if (prompt.content.task) {
            fullPrompt += `#TÂCHE\n${prompt.content.task}`;
        }

        prompt.content = fullPrompt;
        console.log(`✅ Migration du prompt "${prompt.name}" vers le nouveau format`);
        return prompt;
    }

    return prompt;
}

// Instance globale du gestionnaire de prompts
let promptManager = null;

// ========================
// PROVIDER CONFIGURATION MANAGER
// ========================

class ProviderManager {
    constructor() {
        this.openrouterApiKey = null;
        this.selectedModel = 'anthropic/claude-3.5-haiku';
        this.configFileLoaded = false;
    }

    async loadConfigurationFromFile() {
        try {
            const response = await fetch('/config.json');
            if (response.ok) {
                const config = await response.json();

                // Charger la clé OpenRouter
                if (config.openrouter_api_key) {
                    this.openrouterApiKey = config.openrouter_api_key;
                }

                // Si pas de clé dans config.json, essayer localStorage
                if (!this.openrouterApiKey) {
                    const storedKey = localStorage.getItem('openrouter_api_key');
                    if (storedKey) {
                        this.openrouterApiKey = storedKey;
                        console.log('🔑 Clé OpenRouter chargée depuis localStorage');
                    }
                }

                // Charger le modèle
                this.selectedModel = config.default_model || 'anthropic/claude-3.5-haiku';

                this.configFileLoaded = true;
                console.log('✅ Configuration OpenRouter chargée');
                console.log(`   Modèle: ${this.selectedModel}`);
                console.log(`   OpenRouter key: ${this.openrouterApiKey ? '✓' : '✗'}`);

                // Nettoyer localStorage obsolète
                localStorage.removeItem('llm_provider');
                localStorage.removeItem('anthropic_api_key');

                return true;
            }
        } catch (error) {
            console.log('⚠️ Fichier config.json non disponible');
        }
        return false;
    }

    loadConfiguration() {
        if (this.configFileLoaded) {
            console.log('ℹ️ Config.json déjà chargé');
            return;
        }

        const storedModel = localStorage.getItem('openrouter_model');
        if (storedModel) {
            this.selectedModel = storedModel;
        }

        this.openrouterApiKey = localStorage.getItem('openrouter_api_key');
    }

    saveConfiguration() {
        if (this.openrouterApiKey) {
            localStorage.setItem('openrouter_api_key', this.openrouterApiKey);
        }
        if (this.selectedModel) {
            localStorage.setItem('openrouter_model', this.selectedModel);
        }
        console.log('💾 Configuration OpenRouter sauvegardée');
    }

    getActiveApiKey() {
        return this.openrouterApiKey;
    }

    getRequestPayload(prompt) {
        return {
            apiKey: this.openrouterApiKey,
            model: this.selectedModel,
            prompt: prompt
        };
    }

    isConfigured() {
        return !!(this.openrouterApiKey && this.selectedModel);
    }
}

// Instance globale du gestionnaire de provider
let providerManager = null;

// Matrice de confusion : confusionMatrix[source][prediction] = count
let confusionMatrix = {};
let sourceDistribution = {};
let predictionDistribution = {};

// Charger la clé API depuis le fichier config.json au démarrage
window.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Démarrage de l\'application...');

    // Nettoyer les clés obsolètes d'Anthropic Direct
    localStorage.removeItem('llm_provider');
    localStorage.removeItem('anthropic_api_key');
    console.log('🧹 localStorage nettoyé (clés Anthropic obsolètes)');

    // 1. Initialiser Supabase
    const supabaseOk = await initSupabase();
    console.log(supabaseOk ? '✅ Supabase connecté' : '⚠️ Supabase indisponible (mode localStorage)');

    // 2. Initialiser le gestionnaire de prompts (sync = localStorage)
    promptManager = new PromptManager();
    console.log('📝 Gestionnaire de prompts initialisé (localStorage)');

    // 3. Synchroniser les prompts avec Supabase (async)
    if (supabaseOk) {
        await promptManager.initializeAsync();
    }

    // 4. Initialiser le gestionnaire de provider
    providerManager = new ProviderManager();

    // 5. Charger la configuration depuis config.json (prioritaire)
    const configLoaded = await providerManager.loadConfigurationFromFile();

    // 6. Si config.json n'est pas disponible, fallback sur localStorage
    if (!configLoaded) {
        providerManager.loadConfiguration();
        console.log('🔌 Configuration chargée depuis localStorage');
    }

    console.log(`   Provider: OpenRouter`);
    console.log(`   Modèle: ${providerManager.selectedModel}`);

    // 7. Initialiser les gestionnaires articles, classification et test runs
    articleManager = new ArticleManager();
    classificationManager = new ClassificationManager();
    testRunManager = new TestRunManager();
    console.log('📰 Gestionnaires articles, classification et test runs initialisés');

    // 8. Initialiser l'interface UI
    initializePromptUI();  // PROMPTS + LLM
    initializeProviderUI(); // Configuration provider
    initializeArticlesUI(); // Articles panel
    initializeTestsUI();    // Test Runs panel
    initializeHelpModal();  // Aide

    console.log('✅ Application initialisée');
});

function addLog(message, type = 'info') {
    // Logs sont maintenant uniquement dans la console pour debug
    const timestamp = new Date().toLocaleTimeString('fr-FR');
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message.replace(/<[^>]*>/g, '')}`);
}

function clearLog() {
    console.clear();
}

function stopAnalysisHandler() {
    stopAnalysis = true;
    stopBtn.style.display = 'none';
    analyzeBtn.style.display = 'inline-block';
    addLog('🛑 Arrêt de l\'analyse demandé par l\'utilisateur...', 'error');
}

clearBtn.addEventListener('click', clearTable);
analyzeBtn.addEventListener('click', analyzeWithAI);
stopBtn.addEventListener('click', stopAnalysisHandler);
resetBtn.addEventListener('click', resetApplication);
exportBtn.addEventListener('click', exportToCSV);

// Event listeners pour le modal de justification
document.addEventListener('DOMContentLoaded', () => {
    const closeReasoningBtn = document.getElementById('closeReasoningBtn');
    const reasoningBackdrop = document.querySelector('.reasoning-modal-backdrop');

    if (closeReasoningBtn) closeReasoningBtn.addEventListener('click', closeReasoningModal);
    if (reasoningBackdrop) reasoningBackdrop.addEventListener('click', closeReasoningModal);

    // Event listeners pour le modal de confiance
    const closeConfidenceBtn = document.getElementById('closeConfidenceBtn');
    const confidenceBackdrop = document.querySelector('#confidenceModal .reasoning-modal-backdrop');

    if (closeConfidenceBtn) closeConfidenceBtn.addEventListener('click', closeConfidenceModal);
    if (confidenceBackdrop) confidenceBackdrop.addEventListener('click', closeConfidenceModal);

    // Fermer avec Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeReasoningModal();
            closeConfidenceModal();
        }
    });

    // Initialiser le thème

    // Vérifier que le serveur proxy est actif
    checkServerHealth();
});


function resetApplication() {
    tableContainer.style.display = 'none';
    statsContainer.style.display = 'none';
    progressContainer.style.display = 'none';
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    articleResults = [];

    // Réinitialiser le filtre de confiance
    confidenceFilter = 'all';
    document.querySelectorAll('.confidence-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === 'all');
    });

    // Réinitialiser le filtre de concordance
    concordanceFilter = 'all';
    document.querySelectorAll('.concordance-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === 'all');
    });

    // Réinitialiser les boutons
    analyzeBtn.style.display = 'none';
    resetBtn.style.display = 'none';
    stopBtn.style.display = 'none';

    showArticlesSection();
    hideError();
}

function clearTable() {
    resetApplication();
    stopAnalysis = false;
    hideError();
    initConfusionMatrix();
}

function initConfusionMatrix() {
    confusionMatrix = {};
    sourceDistribution = {};
    predictionDistribution = {};

    // Initialiser la matrice
    USERNEEDS.forEach(source => {
        confusionMatrix[source] = {};
        sourceDistribution[source] = 0;
        predictionDistribution[source] = 0;
        USERNEEDS.forEach(pred => {
            confusionMatrix[source][pred] = 0;
        });
    });

    // Créer les cellules de la matrice
    const matrixGrid = document.getElementById('confusionMatrix');
    matrixGrid.innerHTML = '';

    for (let i = 0; i < 64; i++) {
        const cell = document.createElement('div');
        cell.className = 'matrix-cell';
        cell.textContent = '0';
        cell.dataset.index = i;

        // Ajouter l'event listener pour le filtrage
        cell.addEventListener('click', () => handleMatrixCellClick(i));

        matrixGrid.appendChild(cell);
    }
}

function updateConfusionMatrix(source, prediction) {
    // Normaliser les valeurs vers leur forme canonique
    source = normalizeUserneed(source);
    prediction = normalizeUserneed(prediction);

    // Vérifier que les valeurs sont valides
    if (!USERNEEDS.includes(source) || !USERNEEDS.includes(prediction)) {
        console.warn(`Valeur invalide: source=${source}, prediction=${prediction}`);
        return;
    }

    // Incrémenter les compteurs
    confusionMatrix[source][prediction]++;
    sourceDistribution[source]++;
    predictionDistribution[prediction]++;

    // Mettre à jour l'affichage
    updateConfusionMatrixDisplay();
    updateStatisticsDisplay();
    updateConfidenceStats();
}

function updateConfusionMatrixDisplay() {
    const matrixGrid = document.getElementById('confusionMatrix');
    const cells = matrixGrid.querySelectorAll('.matrix-cell');

    let maxValue = 0;
    USERNEEDS.forEach(source => {
        USERNEEDS.forEach(pred => {
            maxValue = Math.max(maxValue, confusionMatrix[source][pred]);
        });
    });

    let cellIndex = 0;
    USERNEEDS.forEach((source, i) => {
        USERNEEDS.forEach((pred, j) => {
            const value = confusionMatrix[source][pred];
            const cell = cells[cellIndex];
            cell.textContent = value;

            // Colorer les cellules
            cell.classList.remove('correct', 'incorrect-high', 'incorrect-medium', 'incorrect-low');

            if (value > 0) {
                if (i === j) {
                    // Diagonal - correct
                    cell.classList.add('correct');
                } else {
                    // Hors diagonal - erreurs
                    const intensity = value / maxValue;
                    if (intensity > 0.5) {
                        cell.classList.add('incorrect-high');
                    } else if (intensity > 0.25) {
                        cell.classList.add('incorrect-medium');
                    } else {
                        cell.classList.add('incorrect-low');
                    }
                }
            }

            cellIndex++;
        });
    });
}

/**
 * Gère le clic sur une cellule de la matrice de confusion
 * Active ou désactive le filtrage du tableau
 */
function handleMatrixCellClick(cellIndex) {
    const rowIndex = Math.floor(cellIndex / 8);
    const colIndex = cellIndex % 8;

    const sourceUserneed = USERNEEDS[rowIndex];
    const predictionUserneed = USERNEEDS[colIndex];

    // Si on clique sur la même cellule, désactiver le filtre
    if (matrixFilter.active && matrixFilter.selectedCellIndex === cellIndex) {
        clearMatrixFilter();
        return;
    }

    // Activer le nouveau filtre
    matrixFilter.active = true;
    matrixFilter.sourceUserneed = sourceUserneed;
    matrixFilter.predictionUserneed = predictionUserneed;
    matrixFilter.selectedCellIndex = cellIndex;

    // Mettre à jour l'affichage
    updateMatrixFilterVisual();
    filterTableByMatrix();

    console.log(`🔍 Filtre activé: ${sourceUserneed} → ${predictionUserneed}`);
}

/**
 * Désactive le filtre de la matrice
 */
function clearMatrixFilter() {
    matrixFilter.active = false;
    matrixFilter.sourceUserneed = null;
    matrixFilter.predictionUserneed = null;
    matrixFilter.selectedCellIndex = null;

    updateMatrixFilterVisual();
    filterTableByMatrix(); // Réaffiche tous les articles

    console.log('🔄 Filtre désactivé - Affichage de tous les articles');
}

// ========================
// CONFIDENCE FILTER
// ========================

/**
 * Active un filtre de confiance et recalcule la matrice
 */
function setConfidenceFilter(level) {
    confidenceFilter = level;

    // Mettre à jour les boutons actifs
    document.querySelectorAll('.confidence-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === level);
    });

    // Recalculer la matrice avec les articles filtrés
    recalculateMatrixForConfidence();

    // Refiltrer le tableau
    filterTableByMatrix();

    console.log(`📊 Filtre confiance: ${level}`);
}

/**
 * Filtre les stats de confiance par concordance (concordant / non-concordant)
 */
function setConcordanceFilter(level) {
    concordanceFilter = level;

    // Mettre à jour les boutons actifs
    document.querySelectorAll('.concordance-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === level);
    });

    // Recalculer les stats de confiance avec le filtre
    updateConfidenceStats();

    console.log(`📊 Filtre concordance: ${level}`);
}

/**
 * Retourne les articles filtrés selon le filtre de confiance actif
 */
function getConfidenceFilteredArticles() {
    if (confidenceFilter === 'all') return articleResults;

    return articleResults.filter(a => {
        const level = a.confidenceLevel || 'BASSE';
        if (confidenceFilter === 'haute') return level === 'HAUTE';
        if (confidenceFilter === 'moyenne') return level === 'MOYENNE';
        if (confidenceFilter === 'basse') return level === 'BASSE';
        return true;
    });
}

/**
 * Recalcule la matrice de confusion en tenant compte du filtre de confiance
 */
function recalculateMatrixForConfidence() {
    // Remettre à zéro
    USERNEEDS.forEach(source => {
        sourceDistribution[source] = 0;
        predictionDistribution[source] = 0;
        USERNEEDS.forEach(pred => {
            confusionMatrix[source][pred] = 0;
        });
    });

    // Recompter uniquement les articles filtrés
    const filtered = getConfidenceFilteredArticles();
    filtered.forEach(article => {
        const source = normalizeUserneed(article.expectedUserneed);
        const pred = normalizeUserneed(article.predictedUserneed);
        if (USERNEEDS.includes(source) && USERNEEDS.includes(pred) &&
            article.predictedUserneed && !article.predictedUserneed.includes('Non identifié') &&
            article.predictedUserneed !== 'ERROR') {
            confusionMatrix[source][pred]++;
            sourceDistribution[source]++;
            predictionDistribution[pred]++;
        }
    });

    // Mettre à jour les affichages
    updateConfusionMatrixDisplay();
    updateStatisticsDisplay();
    updateConfidenceStats();
}

/**
 * Met à jour l'apparence visuelle de la matrice (cellule sélectionnée)
 */
function updateMatrixFilterVisual() {
    const cells = document.querySelectorAll('.matrix-cell');

    cells.forEach((cell, index) => {
        if (matrixFilter.active && index === matrixFilter.selectedCellIndex) {
            cell.classList.add('matrix-cell-selected');
        } else {
            cell.classList.remove('matrix-cell-selected');
        }
    });

    // Afficher/masquer l'indicateur de filtre
    updateFilterIndicator();
}

/**
 * Affiche ou masque l'indicateur de filtre actif
 */
function updateFilterIndicator() {
    let indicator = document.getElementById('matrixFilterIndicator');

    if (matrixFilter.active) {
        if (!indicator) {
            // Créer l'indicateur s'il n'existe pas
            indicator = document.createElement('div');
            indicator.id = 'matrixFilterIndicator';
            indicator.className = 'filter-indicator';

            // Insérer avant le tableau
            const tableContainer = document.getElementById('tableContainer');
            tableContainer.parentNode.insertBefore(indicator, tableContainer);
        }

        const sourceNormalized = normalizeUserneed(matrixFilter.sourceUserneed);
        const predNormalized = normalizeUserneed(matrixFilter.predictionUserneed);
        const count = getConfidenceFilteredArticles().filter(a =>
            normalizeUserneed(a.expectedUserneed) === sourceNormalized &&
            normalizeUserneed(a.predictedUserneed) === predNormalized
        ).length;

        indicator.innerHTML = `
            <span class="filter-icon">🔍</span>
            <span class="filter-text">
                Filtre actif : <strong>${matrixFilter.sourceUserneed}</strong> → <strong>${matrixFilter.predictionUserneed}</strong>
                (${count} article${count > 1 ? 's' : ''})
            </span>
            <button class="filter-clear-btn" onclick="clearMatrixFilter()">✕ Réinitialiser</button>
        `;
        indicator.style.display = 'flex';
    } else {
        if (indicator) {
            indicator.style.display = 'none';
        }
    }
}

/**
 * Filtre le tableau selon la sélection de la matrice
 */
function filterTableByMatrix() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = ''; // Vider le tableau

    // D'abord appliquer le filtre de confiance
    let articlesToShow = getConfidenceFilteredArticles();

    // Puis appliquer le filtre de cellule matrice par-dessus
    if (matrixFilter.active) {
        const sourceNormalized = normalizeUserneed(matrixFilter.sourceUserneed);
        const predNormalized = normalizeUserneed(matrixFilter.predictionUserneed);

        articlesToShow = articlesToShow.filter(article => {
            const articleSource = normalizeUserneed(article.expectedUserneed);
            const articlePred = normalizeUserneed(article.predictedUserneed);
            return articleSource === sourceNormalized && articlePred === predNormalized;
        });
    }

    // Régénérer les lignes du tableau
    articlesToShow.forEach(article => {
        const tr = createTableRow(article);
        tableBody.appendChild(tr);
    });

    // Si aucun article trouvé
    if (articlesToShow.length === 0 && (matrixFilter.active || confidenceFilter !== 'all')) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="6" style="text-align: center; padding: 40px; color: #9ca3af; font-style: italic;">
                Aucun article ne correspond aux filtres actifs
            </td>
        `;
        tableBody.appendChild(emptyRow);
    }
}

/**
 * Crée une ligne de tableau pour un article
 * Extrait et réutilise le code existant de la fonction analyzeWithAI()
 */
function createTableRow(article) {
    const tr = document.createElement('tr');

    // Numéro
    const numeroTd = document.createElement('td');
    numeroTd.textContent = article.numero;
    tr.appendChild(numeroTd);

    // Titre avec lien
    const titreTd = document.createElement('td');
    const titreContainer = document.createElement('div');
    titreContainer.style.display = 'flex';
    titreContainer.style.alignItems = 'center';
    titreContainer.style.gap = '8px';

    const titreText = document.createElement('span');
    titreText.textContent = article.titre || 'Sans titre';
    titreText.style.flex = '1';
    titreText.style.overflow = 'hidden';
    titreText.style.textOverflow = 'ellipsis';
    titreText.style.whiteSpace = 'nowrap';
    titreContainer.appendChild(titreText);

    if (article.url) {
        const linkBtn = document.createElement('a');
        linkBtn.href = article.url;
        linkBtn.target = '_blank';
        linkBtn.rel = 'noopener noreferrer';
        linkBtn.className = 'open-url-btn';
        linkBtn.innerHTML = '🔗';
        linkBtn.title = 'Ouvrir l\'article';
        linkBtn.setAttribute('aria-label', 'Ouvrir l\'article dans un nouvel onglet');
        titreContainer.appendChild(linkBtn);
    }

    titreTd.appendChild(titreContainer);
    tr.appendChild(titreTd);

    // User Need attendu
    const userIdTd = document.createElement('td');
    userIdTd.textContent = article.expectedUserneed;
    tr.appendChild(userIdTd);

    // Prédiction IA
    const aiTd = document.createElement('td');
    aiTd.classList.add('ai-prediction');

    // Si on a les 3 prédictions (nouveau format), afficher la structure complète
    if (article.predictions && article.predictions.length === 3) {
        const predContainer = document.createElement('div');
        predContainer.className = 'predictions-container';

        article.predictions.forEach((pred, index) => {
            const predRow = document.createElement('div');
            predRow.className = `prediction-row prediction-${pred.rank}`;

            const rankLabel = document.createElement('span');
            rankLabel.className = 'prediction-rank';
            rankLabel.textContent = index === 0 ? '1️⃣' : index === 1 ? '2️⃣' : '3️⃣';

            const userneedSpan = document.createElement('span');
            userneedSpan.className = 'prediction-userneed';
            userneedSpan.textContent = pred.userneed;

            // Colorer uniquement le principal (vert si match, rouge sinon)
            if (index === 0) {
                userneedSpan.style.color = article.isMatch ? '#10b981' : '#ef4444';
            }

            const scoreSpan = document.createElement('span');
            scoreSpan.className = 'prediction-score';
            scoreSpan.textContent = `${pred.score}%`;

            predRow.appendChild(rankLabel);
            predRow.appendChild(userneedSpan);
            predRow.appendChild(scoreSpan);
            predContainer.appendChild(predRow);
        });

        aiTd.appendChild(predContainer);
    } else {
        // Fallback pour ancien format (un seul userneed)
        const predContainer = document.createElement('div');
        predContainer.className = 'prediction-container';
        predContainer.style.display = 'flex';
        predContainer.style.alignItems = 'center';
        predContainer.style.gap = '8px';

        const predText = document.createElement('span');
        predText.textContent = article.predictedUserneed;
        predText.style.color = article.isMatch ? '#10b981' : '#ef4444';
        predText.style.fontWeight = '600';
        predContainer.appendChild(predText);

        aiTd.appendChild(predContainer);
    }

    tr.appendChild(aiTd);

    // Justification IA - afficher uniquement la justification du userneed principal
    const justificationTd = document.createElement('td');
    justificationTd.classList.add('justification-cell');

    // Récupérer la justification du principal (si disponible dans predictions)
    let principalJustification = article.justification; // Fallback
    if (article.predictions && article.predictions.length > 0 && article.predictions[0].justification) {
        principalJustification = article.predictions[0].justification;
    }

    if (principalJustification || !article.isMatch) {
        const justifContainer = document.createElement('div');
        justifContainer.className = 'justification-container';
        justifContainer.style.display = 'flex';
        justifContainer.style.alignItems = 'flex-start';
        justifContainer.style.gap = '8px';

        if (principalJustification) {
            const justifText = document.createElement('span');
            justifText.className = 'justification-text';
            const truncatedJustif = principalJustification.length > 150
                ? principalJustification.substring(0, 150) + '...'
                : principalJustification;
            justifText.textContent = truncatedJustif;
            justifText.style.flex = '1';
            justifText.style.fontSize = '0.9em';
            justifText.style.color = '#e5e7eb';
            justifText.style.lineHeight = '1.4';
            justifContainer.appendChild(justifText);

            const expandBtn = document.createElement('button');
            expandBtn.className = 'reasoning-btn';
            expandBtn.innerHTML = '💬';
            expandBtn.title = 'Voir la justification complète du userneed principal';
            expandBtn.setAttribute('aria-label', 'Voir la justification complète du userneed principal');
            expandBtn.onclick = () => showReasoningModal(article.index);
            justifContainer.appendChild(expandBtn);
        } else {
            const noJustifText = document.createElement('span');
            noJustifText.className = 'justification-text';
            noJustifText.textContent = 'Justification non disponible';
            noJustifText.style.flex = '1';
            noJustifText.style.fontSize = '0.9em';
            noJustifText.style.color = '#9ca3af';
            noJustifText.style.fontStyle = 'italic';
            justifContainer.appendChild(noJustifText);
        }

        justificationTd.appendChild(justifContainer);
    } else {
        justificationTd.textContent = '—';
        justificationTd.style.color = '#9ca3af';
        justificationTd.style.textAlign = 'center';
        justificationTd.style.fontStyle = 'italic';
    }

    tr.appendChild(justificationTd);

    // Confiance
    const confidenceTd = document.createElement('td');
    confidenceTd.style.textAlign = 'center';

    if (article.predictions && article.predictions.length >= 2) {
        const badge = document.createElement('span');
        badge.className = 'confidence-badge';

        if (article.confidenceLevel === 'HAUTE') {
            badge.classList.add('confidence-haute');
            badge.textContent = 'HAUTE';
        } else if (article.confidenceLevel === 'MOYENNE') {
            badge.classList.add('confidence-moyenne');
            badge.textContent = 'MOYENNE';
        } else {
            badge.classList.add('confidence-basse');
            badge.textContent = 'BASSE';
        }

        badge.title = `Delta P1-P2: ${article.delta} | ICP: ${article.icp}`;
        badge.onclick = () => showConfidenceDetail(article.index);
        confidenceTd.appendChild(badge);
    } else {
        confidenceTd.textContent = '—';
        confidenceTd.style.color = '#9ca3af';
    }

    tr.appendChild(confidenceTd);

    return tr;
}

function updateStatisticsDisplay() {
    // Calculer les totaux
    let totalArticles = 0;
    let concordants = 0;

    USERNEEDS.forEach(source => {
        totalArticles += sourceDistribution[source];
        concordants += confusionMatrix[source][source];
    });

    const reclassified = totalArticles - concordants;
    const concordantPercent = totalArticles > 0 ? ((concordants / totalArticles) * 100).toFixed(1) : 0;
    const reclassifiedPercent = totalArticles > 0 ? ((reclassified / totalArticles) * 100).toFixed(1) : 0;

    // Mettre à jour les statistiques globales
    document.getElementById('totalArticles').textContent = totalArticles;
    document.getElementById('concordantCount').textContent = concordants;
    document.getElementById('concordantPercent').textContent = concordantPercent + '%';
    document.getElementById('reclassifiedCount').textContent = reclassified;
    document.getElementById('reclassifiedPercent').textContent = reclassifiedPercent + '%';

    // Top 5 reclassifications
    const topDiv = document.getElementById('topReclassifications');
    topDiv.innerHTML = '';

    const reclassifications = [];
    USERNEEDS.forEach((source, i) => {
        USERNEEDS.forEach((pred, j) => {
            if (i !== j && confusionMatrix[source][pred] > 0) {
                reclassifications.push({
                    source: source,
                    prediction: pred,
                    count: confusionMatrix[source][pred]
                });
            }
        });
    });

    reclassifications.sort((a, b) => b.count - a.count);
    reclassifications.slice(0, 5).forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'reclassif-item';
        div.textContent = `${index + 1}. ${getShortName(item.source)} → ${getShortName(item.prediction)} : ${item.count}`;
        topDiv.appendChild(div);
    });
}

function updateConfidenceStats() {
    const box = document.getElementById('confidenceStatsBox');
    if (!box) return;

    if (articleResults.length === 0) { box.style.display = 'none'; return; }

    box.style.display = 'block';

    // Appliquer le filtre de concordance
    let filtered = articleResults;
    if (concordanceFilter === 'concordant') {
        filtered = articleResults.filter(a => a.isMatch === true);
    } else if (concordanceFilter === 'non-concordant') {
        filtered = articleResults.filter(a => a.isMatch === false);
    }

    const total = filtered.length;

    // Compter par niveau
    const counts = { HAUTE: 0, MOYENNE: 0, BASSE: 0 };
    const concordantByLevel = { HAUTE: 0, MOYENNE: 0, BASSE: 0 };

    filtered.forEach(a => {
        const level = a.confidenceLevel || 'BASSE';
        counts[level]++;
        if (a.isMatch) concordantByLevel[level]++;
    });

    // Barres de distribution
    const distDiv = document.getElementById('confidenceDistribution');
    distDiv.innerHTML = '';

    const levels = [
        { key: 'HAUTE', color: '#10b981', label: 'HAUTE' },
        { key: 'MOYENNE', color: '#f59e0b', label: 'MOYENNE' },
        { key: 'BASSE', color: '#ef4444', label: 'BASSE' }
    ];

    levels.forEach(({ key, color, label }) => {
        const count = counts[key];
        const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;

        const item = document.createElement('div');
        item.className = 'distribution-item';
        item.innerHTML = `
            <span style="min-width: 80px; color: ${color}; font-weight: 700; font-size: 0.8rem;">${label}</span>
            <div class="distribution-bar">
                <div class="distribution-fill" style="width: ${pct}%; background: ${color};">&nbsp;</div>
            </div>
            <span style="min-width: 80px; text-align: right; color: ${color}; font-size: 0.85rem;">${count} (${pct}%)</span>
        `;
        distDiv.appendChild(item);
    });

    // Précision par niveau
    const precDiv = document.getElementById('confidencePrecision');
    precDiv.innerHTML = '<div class="stat-subtitle" style="margin-bottom: 8px;">Précision par niveau</div>';

    levels.forEach(({ key, color, label }) => {
        const count = counts[key];
        const correct = concordantByLevel[key];
        const precision = count > 0 ? ((correct / count) * 100).toFixed(1) : '—';

        const item = document.createElement('div');
        item.className = 'stat-item';
        item.style.margin = '4px 0';
        item.innerHTML = `<span style="color: ${color}; font-weight: 600;">${label}</span> : ${precision}% <span style="color: var(--text-secondary);">(${correct}/${count})</span>`;
        precDiv.appendChild(item);
    });
}

function getShortName(userneed) {
    // Normaliser d'abord vers la forme canonique
    const normalized = normalizeUserneed(userneed);

    const names = {
        'UPDATE ME': 'Update me',
        'EXPLAIN ME': 'Explain me',
        'GIVE ME PERSPECTIVE': 'Give me perspective',
        'GIVE ME A BREAK': 'Give me a break',
        'GIVE ME CONCERNING NEWS': 'Concerning news',
        'INSPIRE ME': 'Inspire me',
        'MAKE ME FEEL THE NEWS': 'Make me feel',
        'REVEAL NEWS': 'Reveal news'
    };
    return names[normalized] || normalized;
}

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function hideError() {
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
}

let currentTestRunId = null; // ID du test run en cours

async function analyzeWithAI() {
    // Vérifier la configuration OpenRouter
    if (!providerManager.isConfigured()) {
        showError('Veuillez configurer votre clé API OpenRouter dans le panneau 🤖 LLM ou dans le fichier config.json');
        return;
    }

    // Charger les articles classifiés depuis Supabase
    let classifiedArticles;
    try {
        classifiedArticles = await articleManager.loadClassifiedArticles();
    } catch (e) {
        showError('Erreur de chargement des articles: ' + e.message);
        return;
    }

    if (!classifiedArticles || classifiedArticles.length === 0) {
        showError('Aucun article classifié à analyser. Classifiez des articles dans le panneau 📰 Articles.');
        return;
    }

    // Réinitialiser le flag d'arrêt et les résultats
    stopAnalysis = false;
    articleResults = [];

    // Réinitialiser les filtres
    clearMatrixFilter();
    confidenceFilter = 'all';
    document.querySelectorAll('.confidence-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === 'all');
    });
    concordanceFilter = 'all';
    document.querySelectorAll('.concordance-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === 'all');
    });

    // Gérer les boutons
    analyzeBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';
    progressContainer.style.display = 'block';
    statsContainer.style.display = 'block';
    tableContainer.style.display = 'block';
    hideArticlesSection();

    // Initialiser les en-têtes du tableau
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    const headerRow = document.createElement('tr');
    ['Numéro', 'Titre de l\'article', 'User Need attribué', 'Prédiction IA', 'Justification IA', 'Confiance'].forEach((text, idx) => {
        const th = document.createElement('th');
        th.textContent = text;
        if (idx === 3) th.classList.add('ai-column');
        if (idx === 4) th.classList.add('justification-column');
        if (idx === 5) th.classList.add('confidence-column');
        headerRow.appendChild(th);
    });
    tableHead.appendChild(headerRow);
    tableTitle.textContent = 'Articles analysés';

    clearLog();
    hideError();
    initConfusionMatrix();

    addLog('🚀 Démarrage de l\'analyse IA...', 'info');
    addLog(`📊 Nombre total d'articles classifiés à analyser : ${classifiedArticles.length}`, 'info');

    const ARTICLE_DELAY_MS = 5000;
    const apiKey = providerManager.getActiveApiKey();

    if (!apiKey) {
        showError('Veuillez configurer votre clé API dans le panneau LLM');
        analyzeBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        progressContainer.style.display = 'none';
        return;
    }

    // Créer un test run dans Supabase
    const activePrompt = promptManager.getActivePrompt();
    let testRun = null;
    try {
        testRun = await testRunManager.createRun(
            `${providerManager.selectedModel} - ${activePrompt.name}`,
            providerManager.selectedModel,
            activePrompt.id,
            typeof activePrompt.content === 'string' ? activePrompt.content : JSON.stringify(activePrompt.content),
            classifiedArticles.length
        );
        currentTestRunId = testRun.id;
        addLog(`📋 Test run créé: ${testRun.name}`, 'info');
    } catch (e) {
        console.warn('Impossible de créer le test run en DB:', e.message);
    }

    addLog(`🔄 Traitement séquentiel : 1 article à la fois`, 'info');
    addLog(`⏱️ Délai entre articles : ${ARTICLE_DELAY_MS / 1000} secondes`, 'info');

    try {
        for (let i = 0; i < classifiedArticles.length; i++) {
            if (stopAnalysis) {
                addLog(`🛑 ANALYSE ARRÊTÉE par l'utilisateur à l'article ${i + 1}/${classifiedArticles.length}`, 'error');
                break;
            }

            const article = classifiedArticles[i];
            const titre = article.titre || '';
            const chapo = article.chapo || '';
            const corps = article.corps || '';
            const expectedUserneed = article.human_classifications[0].userneed;
            const urlValue = article.url;

            addLog(`📰 Article ${i + 1}/${classifiedArticles.length} : ${titre.substring(0, 80)}${titre.length > 80 ? '...' : ''}`, 'info');

            try {
                const parsed = await analyzeArticle(apiKey, titre, chapo, corps);

                let userneed, justification, hasJustification, predictions, rawResponse;

                if (parsed && parsed.predictions && parsed.predictions.length > 0) {
                    predictions = parsed.predictions;
                    userneed = predictions[0].userneed;
                    justification = parsed.justification;
                    hasJustification = parsed.hasJustification;
                    rawResponse = parsed.rawResponse || '';
                } else if (parsed) {
                    userneed = parsed.userneed;
                    justification = parsed.justification;
                    hasJustification = parsed.hasJustification;
                    predictions = null;
                    rawResponse = parsed.rawResponse || '';
                } else {
                    userneed = '❓ Non identifié';
                    justification = '';
                    hasJustification = false;
                    predictions = null;
                    rawResponse = '';
                }

                const isMatch = normalizeUserneed(userneed) === normalizeUserneed(expectedUserneed);
                const confidence = calculateConfidence(predictions);

                const articleData = {
                    index: i,
                    numero: i + 1,
                    url: urlValue,
                    titre: titre,
                    expectedUserneed: expectedUserneed,
                    predictedUserneed: userneed,
                    predictions: predictions,
                    justification: justification,
                    isMatch: isMatch,
                    hasJustification: hasJustification,
                    delta: confidence.delta,
                    icp: confidence.icp,
                    confidenceLevel: confidence.confidenceLevel,
                    icpLevel: confidence.icpLevel
                };

                addLog(`✅ Résultat: ${userneed}`, 'success');
                if (isMatch) {
                    addLog(`✓ Concordant`, 'success');
                } else {
                    addLog(`✗ Différent (attendu: ${expectedUserneed})`, 'error');
                }

                articleResults.push(articleData);

                if (userneed && expectedUserneed && !userneed.includes('Non identifié')) {
                    updateConfusionMatrix(expectedUserneed, userneed);
                }

                filterTableByMatrix();

                // Persister le résultat dans Supabase
                if (testRun) {
                    testRunManager.addAnalysis(testRun.id, article.id, {
                        predictedUserneed: userneed,
                        predictions: predictions,
                        justification: justification,
                        isMatch: isMatch,
                        delta: confidence.delta,
                        icp: confidence.icp,
                        confidenceLevel: confidence.confidenceLevel,
                        rawResponse: rawResponse,
                        articleIndex: i
                    });
                }

            } catch (error) {
                addLog(`❌ Erreur sur article ${i + 1} : ${error.message}`, 'error');

                articleResults.push({
                    index: i,
                    numero: i + 1,
                    url: urlValue,
                    titre: titre,
                    expectedUserneed: expectedUserneed,
                    predictedUserneed: 'ERROR',
                    predictions: null,
                    justification: `Erreur: ${error.message}`,
                    isMatch: false,
                    hasJustification: false,
                    delta: 0,
                    icp: 0,
                    confidenceLevel: 'BASSE',
                    icpLevel: 'BASSE'
                });
            }

            // Progression
            const progress = ((i + 1) / classifiedArticles.length) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Analyse en cours... ${i + 1}/${classifiedArticles.length} articles`;

            // Délai entre articles
            if (i < classifiedArticles.length - 1 && !stopAnalysis) {
                if (ARTICLE_DELAY_MS > 0) {
                    await new Promise(resolve => setTimeout(resolve, ARTICLE_DELAY_MS));
                }
            }
        }

        // Compléter le test run avec les stats finales
        const concordantCount = articleResults.filter(r => r.isMatch).length;
        const concordantPercent = articleResults.length > 0 ? (concordantCount / articleResults.length * 100).toFixed(2) : 0;
        const finalStats = {
            analyzedArticles: articleResults.length,
            concordantCount: concordantCount,
            concordantPercent: parseFloat(concordantPercent),
            confusionMatrix: confusionMatrix,
            statistics: {
                sourceDistribution: sourceDistribution,
                predictionDistribution: predictionDistribution,
                articleResults: articleResults.length
            }
        };

        if (testRun) {
            if (stopAnalysis) {
                await testRunManager.stopRun(testRun.id, finalStats);
            } else {
                await testRunManager.completeRun(testRun.id, finalStats);
            }
            addLog(`📋 Test run sauvegardé en DB`, 'info');
        }

        if (!stopAnalysis) {
            progressText.textContent = 'Analyse terminée !';
            progressFill.style.width = '100%';
            addLog(`🎉 ANALYSE TERMINÉE ! ${articleResults.length} articles traités. Concordance: ${concordantPercent}%`, 'success');
        }

        setTimeout(() => {
            if (!stopAnalysis) {
                progressContainer.style.display = 'none';
                progressFill.style.width = '0%';
            }
        }, 3000);

    } catch (error) {
        addLog(`❌ ERREUR: ${error.message}`, 'error');
        showError('Erreur lors de l\'analyse : ' + error.message);
    } finally {
        stopBtn.style.display = 'none';
        analyzeBtn.style.display = 'inline-block';
        currentTestRunId = null;
    }
}

async function analyzeArticle(apiKey, titre, chapo, corps) {
    // Utiliser le prompt du gestionnaire au lieu du hardcodé
    const prompt = promptManager.buildFullPrompt(titre, chapo, corps);

    // NEW: Get request payload from provider manager
    const requestPayload = providerManager.getRequestPayload(prompt);

    // Configuration du timeout (120 secondes - augmenté pour éviter les timeouts)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
        addLog(`🔌 Provider: OpenRouter`, 'info');
        addLog(`🤖 Modèle: ${providerManager.selectedModel}`, 'info');
        addLog(`🔑 Vérification de la clé API (longueur: ${apiKey.length} caractères)`, 'info');
        addLog(`🌐 Connexion au serveur proxy...`, 'info');

        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestPayload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        addLog(`📡 Réponse HTTP reçue (status: ${response.status})`, 'info');

        if (!response.ok) {
            const errorData = await response.json();
            addLog(`⚠️ Détails de l'erreur: ${JSON.stringify(errorData)}`, 'error');
            throw new Error(errorData.error?.message || `Erreur HTTP ${response.status}`);
        }

        const data = await response.json();

        // NEW: Handle different response formats
        let responseText;
        if (data.provider === 'openrouter') {
            responseText = data.content; // OpenRouter format
        } else {
            responseText = data.content[0].text.trim(); // Anthropic format
        }

        // DEBUG: Log la réponse brute
        console.log('🔍 Réponse brute:', responseText);

        const parsed = parseAIResponse(responseText);

        // DEBUG: Log le résultat du parsing
        console.log('📊 Résultat du parsing:', parsed);

        return parsed;
    } catch (error) {
        clearTimeout(timeoutId);

        // Gérer spécifiquement l'erreur de timeout
        if (error.name === 'AbortError') {
            addLog(`❌ Timeout: La requête a pris plus de 60 secondes`, 'error');
            throw new Error('Timeout: La requête a pris plus de 60 secondes');
        }

        addLog(`❌ Exception capturée: ${error.name} - ${error.message}`, 'error');

        // Messages d'erreur spécifiques et actionnables
        if (error.message.includes('Failed to fetch')) {
            addLog(``, 'error');
            addLog(`⚠️ ERREUR DE CONNEXION AU SERVEUR LOCAL`, 'error');
            addLog(``, 'error');
            addLog(`Vérifiez que le serveur Python est bien démarré :`, 'error');
            addLog(`  1. Ouvrez un terminal`, 'error');
            addLog(`  2. cd "/Users/livioricci/Documents/FRANCETV/App qualif user needs"`, 'error');
            addLog(`  3. python3 server.py`, 'error');
            addLog(``, 'error');
            addLog(`Si le serveur est démarré, vérifiez :`, 'error');
            addLog(`  • Que le port 8000 n'est pas utilisé par un autre processus`, 'error');
            addLog(`  • Votre connexion Internet`, 'error');
            addLog(`  • Que votre clé API est valide dans config.json`, 'error');
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            addLog(``, 'error');
            addLog(`⚠️ CLÉ API INVALIDE`, 'error');
            addLog(``, 'error');
            addLog(`Votre clé API OpenRouter est incorrecte ou expirée.`, 'error');
            addLog(`Vérifiez la clé dans le fichier config.json ou le panneau 🤖 LLM`, 'error');
            addLog(``, 'error');
            addLog(`Obtenez une nouvelle clé sur : https://openrouter.ai/keys`, 'error');
        } else if (error.message.includes('429')) {
            addLog(``, 'error');
            addLog(`⚠️ LIMITE DE REQUÊTES ATTEINTE`, 'error');
            addLog(``, 'error');
            addLog(`Vous avez dépassé votre quota API OpenRouter.`, 'error');
            addLog(`Attendez quelques minutes avant de réessayer.`, 'error');
            addLog(``, 'error');
            addLog(`Si le problème persiste, vérifiez votre plan sur openrouter.ai`, 'error');
        } else if (error.message.includes('Timeout') || error.message.includes('AbortError')) {
            addLog(``, 'error');
            addLog(`⚠️ TIMEOUT DE LA REQUÊTE`, 'error');
            addLog(``, 'error');
            addLog(`La requête a pris plus de 30 secondes.`, 'error');
            addLog(`Vérifiez votre connexion Internet ou réessayez.`, 'error');
        } else if (error.message.includes('500')) {
            addLog(``, 'error');
            addLog(`⚠️ ERREUR SERVEUR API`, 'error');
            addLog(``, 'error');
            addLog(`L'API OpenRouter rencontre un problème temporaire.`, 'error');
            addLog(`Réessayez dans quelques instants.`, 'error');
        }

        throw error;
    }
}

function exportToCSV() {
    // Calculer les statistiques globales
    let totalArticles = 0;
    let concordants = 0;
    USERNEEDS.forEach(source => {
        totalArticles += sourceDistribution[source];
        concordants += confusionMatrix[source][source];
    });

    if (totalArticles === 0 && articleResults.length === 0) {
        showToast('Aucune donnée à exporter', 'error');
        return;
    }

    const concordantPercent = totalArticles > 0 ? ((concordants / totalArticles) * 100).toFixed(1) : 0;

    // Helper CSV: escape and join
    const csvEscape = (val) => {
        const str = String(val ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    };
    const csvRow = (cols) => cols.map(csvEscape).join(',');

    const lines = [];

    // Section 1: Stats
    lines.push(csvRow(['STATISTIQUES GLOBALES']));
    lines.push(csvRow(['Total articles', totalArticles]));
    lines.push(csvRow(['Concordants', `${concordants} (${concordantPercent}%)`]));
    lines.push('');

    // Section 2: Matrice de confusion
    lines.push(csvRow(['MATRICE DE CONFUSION']));
    const matrixHeader = ['Source / Prediction'];
    USERNEEDS.forEach(un => matrixHeader.push(getShortName(un)));
    lines.push(csvRow(matrixHeader));

    USERNEEDS.forEach(source => {
        const row = [getShortName(source)];
        USERNEEDS.forEach(pred => {
            row.push(confusionMatrix[source][pred]);
        });
        lines.push(csvRow(row));
    });
    lines.push('');

    // Section 3: Détails articles
    if (articleResults.length > 0) {
        lines.push(csvRow(['DETAILS ARTICLES']));
        lines.push(csvRow(['N°', 'Titre', 'User Need Attendu', 'Prediction IA', 'Concordant', 'Justification', 'Delta', 'ICP', 'Confiance']));

        articleResults.forEach(article => {
            let predText = article.predictedUserneed;
            if (article.predictions && article.predictions.length === 3) {
                predText = article.predictions.map(p => `${p.userneed}(${p.score}%)`).join(' | ');
            }
            lines.push(csvRow([
                article.numero,
                article.titre,
                article.expectedUserneed,
                predText,
                article.isMatch ? 'OUI' : 'NON',
                article.justification || '',
                article.delta ?? '',
                article.icp ?? '',
                article.confidenceLevel || ''
            ]));
        });
    }

    // Download
    const csvContent = '\uFEFF' + lines.join('\n'); // BOM for Excel UTF-8
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `Analyse_Userneeds_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    console.log(`✅ Fichier CSV exporté`);
}

// ====================================
// ARTICLES PANEL UI FUNCTIONS
// ====================================

function initializeHelpModal() {
    const helpBtn = document.getElementById('helpBtn');
    const helpModal = document.getElementById('helpModal');
    const closeHelpBtn = document.getElementById('closeHelpModalBtn');
    const backdrop = helpModal.querySelector('.help-modal-backdrop');

    helpBtn.addEventListener('click', () => helpModal.classList.add('active'));
    closeHelpBtn.addEventListener('click', () => helpModal.classList.remove('active'));
    backdrop.addEventListener('click', () => helpModal.classList.remove('active'));
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') helpModal.classList.remove('active');
    });
}

function initializeArticlesUI() {
    refreshArticlesList();
    console.log('✅ Section Articles initialisée');
}

function showArticlesSection() {
    const section = document.getElementById('articlesSection');
    if (section) section.classList.remove('hidden');
}

function hideArticlesSection() {
    const section = document.getElementById('articlesSection');
    if (section) section.classList.add('hidden');
}

function setArticleFilter(filter) {
    articleFilter = filter;
    document.querySelectorAll('.article-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderFilteredArticles();
}

function setCategoryFilter(cat) {
    articleCategoryFilter = cat;
    renderFilteredArticles();
}

function setMediaTypeFilter(type) {
    articleMediaTypeFilter = type;
    renderFilteredArticles();
}

async function refreshArticlesList() {
    const listContainer = document.getElementById('articlesList');
    listContainer.innerHTML = '<p class="articles-empty">Chargement…</p>';

    try {
        const articles = await articleManager.loadFromSupabase({ limit: 500 });
        currentArticles = articles;
        renderFilteredArticles();
    } catch (error) {
        console.error('Erreur refresh articles:', error);
        document.getElementById('articlesList').innerHTML = '<p class="articles-empty">Erreur de chargement.</p>';
    }
}

function renderFilteredArticles() {
    const listContainer = document.getElementById('articlesList');
    const statsSpan = document.getElementById('articleStats');
    const articles = currentArticles;

    // Filtre statut
    let filtered = articles;
    if (articleFilter === 'classified') {
        filtered = articles.filter(a => a.human_classifications && a.human_classifications.length > 0);
    } else if (articleFilter === 'unclassified') {
        filtered = articles.filter(a => !a.human_classifications || a.human_classifications.length === 0);
    }

    // Filtre catégorie
    const KNOWN_CATEGORIES = ['monde', 'culture', 'economie', 'sport', 'france', 'faits-divers', 'politique'];
    if (articleCategoryFilter === 'autres') {
        filtered = filtered.filter(a => { const cat = getArticleCategory(a); return !cat || !KNOWN_CATEGORIES.includes(cat); });
    } else if (articleCategoryFilter !== 'all') {
        filtered = filtered.filter(a => getArticleCategory(a) === articleCategoryFilter);
    }

    // Filtre type de média
    if (articleMediaTypeFilter !== 'all') {
        filtered = filtered.filter(a => (a.metadata?.media_type || 'article') === articleMediaTypeFilter);
    }

    // Filtre titre (recherche libre)
    if (articleTitleSearch.trim()) {
        const q = articleTitleSearch.trim().toLowerCase();
        filtered = filtered.filter(a => (a.titre || '').toLowerCase().includes(q));
    }

    // Stats
    const classifiedCount = articles.filter(a => a.human_classifications && a.human_classifications.length > 0).length;
    if (statsSpan) statsSpan.textContent = `${classifiedCount}/${articles.length} classifiés`;

    // Rendu
    if (filtered.length === 0) {
        listContainer.innerHTML = '<p class="articles-empty">Aucun article trouvé.</p>';
        return;
    }
    listContainer.innerHTML = filtered.map(article => renderArticleCard(article)).join('');

    if (classifiedCount > 0) analyzeBtn.style.display = 'inline-block';

    const loadMore = document.getElementById('articlesLoadMore');
    if (loadMore) loadMore.style.display = articleManager.hasNextPage ? 'block' : 'none';
}

function applyTitleFilter(value) {
    articleTitleSearch = value;
    const clearBtn = document.getElementById('articleTitleSearchClear');
    if (clearBtn) clearBtn.style.display = value ? 'flex' : 'none';
    renderFilteredArticles();
}

function clearTitleSearch() {
    articleTitleSearch = '';
    const input = document.getElementById('articleTitleSearchInput');
    if (input) input.value = '';
    const clearBtn = document.getElementById('articleTitleSearchClear');
    if (clearBtn) clearBtn.style.display = 'none';
    renderFilteredArticles();
}

function getArticleCategory(article) {
    if (article.url) {
        const m = article.url.match(/franceinfo\.fr\/([^\/]+)\//);
        if (m) return m[1];
    }
    return null;
}

function renderArticleCard(article) {
    const classification = article.human_classifications && article.human_classifications.length > 0
        ? article.human_classifications[0]
        : null;
    const selectedUserneed = classification ? classification.userneed : '';
    const isClassified = !!selectedUserneed;
    const contentType = article.metadata?.teams ? article.metadata.teams.join(', ') : '';

    const dateStr = article.date_publication
        ? new Date(article.date_publication).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';

    const category = getArticleCategory(article);

    const options = USERNEEDS.map(un => {
        const selected = un === selectedUserneed ? 'selected' : '';
        return `<option value="${un}" ${selected}>${un}</option>`;
    }).join('');

    return `
        <div class="article-card" data-article-id="${article.id}">
            <div class="article-card-header">
                <div class="article-card-header-left">
                    <span class="article-card-id">#${article.external_id}</span>
                    ${category ? `<span class="article-card-category cat-${category}">${category}</span>` : ''}
                </div>
                ${article.word_count ? `<span class="article-card-type">${article.word_count} mots</span>` : ''}
            </div>
            <div class="article-card-title">
                <a href="${article.url}" target="_blank" title="Ouvrir l'article">${article.titre || 'Sans titre'}</a>
            </div>
            <div class="article-card-description">${article.chapo || ''}</div>
            <div class="article-card-footer">
                <div class="article-card-meta">
                    ${dateStr ? `<span>Publié le ${dateStr}</span>` : ''}
                    ${article.auteur ? `<span>${article.auteur}</span>` : ''}
                </div>
                <select class="classification-select ${isClassified ? 'classified' : ''}"
                        onchange="handleClassification('${article.id}', this.value)"
                        title="Classifier cet article">
                    <option value="">-- Classifier --</option>
                    ${options}
                </select>
            </div>
        </div>
    `;
}

async function handleClassification(articleId, userneed) {
    if (!userneed) return;

    try {
        await classificationManager.classify(articleId, userneed);

        // Mettre à jour le visuel de la select
        const card = document.querySelector(`[data-article-id="${articleId}"]`);
        if (card) {
            const select = card.querySelector('.classification-select');
            if (select) select.classList.add('classified');
        }

        // Mettre à jour les stats
        const stats = await classificationManager.getStats();
        const statsSpan = document.getElementById('articleStats');
        if (statsSpan) {
            statsSpan.textContent = `${stats.classified}/${stats.total} classifiés`;
        }

        // Afficher le bouton Analyse IA si au moins 1 article classifié
        if (stats.classified > 0) {
            analyzeBtn.style.display = 'inline-block';
        }

        showToast(`Article classifié: ${userneed}`);
    } catch (error) {
        console.error('Erreur classification:', error);
        showToast('Erreur de classification', 'error');
    }
}

// ====================================
// TEST RUNS UI FUNCTIONS
// ====================================

function initializeTestsUI() {
    const testsBtn = document.getElementById('testsBtn');
    const closeTestsPanelBtn = document.getElementById('closeTestsPanelBtn');
    const testsPanelBackdrop = document.querySelector('.tests-panel-backdrop');
    const backToTestsListBtn = document.getElementById('backToTestsListBtn');
    const backFromCompareBtn = document.getElementById('backFromCompareBtn');
    const compareFromSelectionBtn = document.getElementById('compareFromSelectionBtn');

    if (!testsBtn) {
        console.warn('⚠️ Bouton Tests non trouvé');
        return;
    }

    testsBtn.addEventListener('click', openTestsPanel);
    if (closeTestsPanelBtn) closeTestsPanelBtn.addEventListener('click', closeTestsPanel);
    if (testsPanelBackdrop) testsPanelBackdrop.addEventListener('click', closeTestsPanel);
    if (backToTestsListBtn) backToTestsListBtn.addEventListener('click', showTestsListView);
    if (backFromCompareBtn) backFromCompareBtn.addEventListener('click', backFromCompare);
    if (compareFromSelectionBtn) compareFromSelectionBtn.addEventListener('click', runComparisonFromSelection);
}

function openTestsPanel() {
    const panel = document.getElementById('testsPanel');
    panel.classList.add('active');
    showTestsListView();
    refreshTestsList();
}

function closeTestsPanel() {
    const panel = document.getElementById('testsPanel');
    panel.classList.remove('active');
}

function showTestsListView() {
    document.getElementById('testsListView').style.display = 'block';
    document.getElementById('testDetailView').style.display = 'none';
    document.getElementById('testCompareView').style.display = 'none';
}

function showTestDetailView() {
    document.getElementById('testsListView').style.display = 'none';
    document.getElementById('testDetailView').style.display = 'flex';
}

async function refreshTestsList() {
    const listContainer = document.getElementById('testsList');
    listContainer.innerHTML = '<p class="tests-empty">Chargement...</p>';

    try {
        const runs = await testRunManager.listRuns();

        if (!runs || runs.length === 0) {
            listContainer.innerHTML = '<p class="tests-empty">Aucun test enregistré. Lancez une analyse IA pour créer un test.</p>';
            return;
        }

        listContainer.innerHTML = runs.map(run => renderTestRunCard(run)).join('');

        // Restaurer les cases cochées
        selectedRunIds.forEach(id => {
            const cb = document.getElementById(`check-${id}`);
            if (cb) {
                cb.checked = true;
                cb.closest('.test-run-card').classList.add('selected');
            }
        });
        updateCompareButton();

    } catch (error) {
        console.error('Erreur listing test runs:', error);
        listContainer.innerHTML = '<p class="tests-empty">Erreur de chargement des tests.</p>';
    }
}

function renderTestRunCard(run) {
    const statusLabel = run.status === 'completed' ? 'Terminé' :
                        run.status === 'running' ? 'En cours' : 'Arrêté';
    const dateStr = run.started_at
        ? new Date(run.started_at).toLocaleDateString('fr-FR', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit'
        })
        : '';
    const promptName = run.prompts?.name || run.prompt_id || '—';
    const concordance = run.concordant_percent != null ? `${run.concordant_percent}%` : '—';

    return `
        <div class="test-run-card" data-run-id="${run.id}">
            <div class="test-run-card-header">
                <label class="test-run-select-wrap" onclick="event.stopPropagation()">
                    <input type="checkbox" class="test-run-checkbox" id="check-${run.id}"
                           onchange="toggleRunSelection('${run.id}', this)">
                    <span class="test-run-checkmark"></span>
                </label>
                <span class="test-run-card-name">${run.name || 'Test sans nom'}</span>
                <span class="test-run-card-status ${run.status}">${statusLabel}</span>
            </div>
            <div class="test-run-card-info">
                <span>🤖 ${run.llm_model || '—'}</span>
                <span>📝 ${promptName}</span>
                <span>📅 ${dateStr}</span>
            </div>
            <div class="test-run-card-stats">
                <span class="test-run-stat">${run.analyzed_articles || 0}/${run.total_articles || 0} articles</span>
                <span class="test-run-stat concordance">Concordance: ${concordance}</span>
            </div>
            <div class="test-run-card-actions">
                <button class="test-run-action-btn view" onclick="viewTestRun('${run.id}')">📊 Voir détail</button>
                <button class="test-run-action-btn delete" onclick="deleteTestRun('${run.id}', event)">🗑️ Supprimer</button>
            </div>
        </div>
    `;
}

async function viewTestRun(runId) {
    showTestDetailView();

    const headerContainer = document.getElementById('testDetailHeader');
    const contentContainer = document.getElementById('testDetailContent');
    headerContainer.innerHTML = '<p>Chargement...</p>';
    contentContainer.innerHTML = '';

    try {
        const run = await testRunManager.getRun(runId);
        if (!run) {
            headerContainer.innerHTML = '<p class="tests-empty">Test non trouvé.</p>';
            return;
        }

        const dateStr = run.started_at
            ? new Date(run.started_at).toLocaleString('fr-FR')
            : '—';
        const statusLabel = run.status === 'completed' ? 'Terminé' :
                            run.status === 'running' ? 'En cours' : 'Arrêté';
        const promptName = run.prompts?.name || run.prompt_id || '—';

        headerContainer.innerHTML = `
            <h3>${run.name || 'Test sans nom'}</h3>
            <div class="test-detail-meta">
                <span>🤖 Modèle: <strong>${run.llm_model || '—'}</strong></span>
                <span>📝 Prompt: <strong>${promptName}</strong></span>
                <span>📅 Date: <strong>${dateStr}</strong></span>
                <span>📊 Status: <strong>${statusLabel}</strong></span>
                <span>✅ Concordance: <strong>${run.concordant_percent ?? '—'}%</strong> (${run.concordant_count ?? 0}/${run.analyzed_articles ?? 0})</span>
            </div>
        `;

        // Charger la matrice de confusion depuis la DB et l'afficher dans la vue principale
        loadMatrixFromTestRun(run);

    } catch (error) {
        console.error('Erreur chargement test run:', error);
        headerContainer.innerHTML = '<p class="tests-empty">Erreur de chargement.</p>';
    }
}

async function loadMatrixFromTestRun(run) {
    // Réinitialiser la matrice en mémoire
    initConfusionMatrix();
    articleResults = [];

    // Charger la matrice de confusion depuis le snapshot JSONB
    if (run.confusion_matrix && typeof run.confusion_matrix === 'object') {
        const matrix = run.confusion_matrix;
        for (const source in matrix) {
            for (const prediction in matrix[source]) {
                const count = matrix[source][prediction];
                if (count > 0) {
                    const sourceNorm = normalizeUserneed(source);
                    const predNorm = normalizeUserneed(prediction);
                    if (confusionMatrix[sourceNorm] && confusionMatrix[sourceNorm][predNorm] !== undefined) {
                        confusionMatrix[sourceNorm][predNorm] = count;
                    }
                }
            }
        }
    }

    // Recalculer les distributions
    sourceDistribution = {};
    predictionDistribution = {};
    for (const source in confusionMatrix) {
        for (const pred in confusionMatrix[source]) {
            const count = confusionMatrix[source][pred];
            if (count > 0) {
                sourceDistribution[source] = (sourceDistribution[source] || 0) + count;
                predictionDistribution[pred] = (predictionDistribution[pred] || 0) + count;
            }
        }
    }

    // Charger les analyses individuelles pour reconstruire articleResults
    try {
        const analyses = await testRunManager.getRunAnalyses(run.id);
        if (analyses && analyses.length > 0) {
            analyses.forEach((a, i) => {
                const article = a.articles || {};
                const humanClassif = article.human_classifications?.[0];
                const expectedUserneed = humanClassif?.userneed || '—';

                articleResults.push({
                    index: i,
                    numero: i + 1,
                    url: article.url || '',
                    titre: article.titre || 'Sans titre',
                    expectedUserneed: expectedUserneed,
                    predictedUserneed: a.predicted_userneed || '—',
                    predictions: a.predictions || null,
                    justification: a.justification || '',
                    isMatch: a.is_match || false,
                    hasJustification: !!a.justification,
                    delta: a.delta || 0,
                    icp: a.icp || 0,
                    confidenceLevel: a.confidence_level || 'BASSE',
                    icpLevel: a.confidence_level || 'BASSE'
                });
            });
        }
    } catch (e) {
        console.warn('Impossible de charger les analyses détaillées:', e.message);
    }

    // Mettre à jour les affichages
    updateConfusionMatrixDisplay();
    updateStatisticsDisplay();

    // Initialiser et remplir le tableau d'articles si on a des résultats
    if (articleResults.length > 0) {
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';
        const headerRow = document.createElement('tr');
        ['Numéro', 'Titre de l\'article', 'User Need attribué', 'Prédiction IA', 'Justification IA', 'Confiance'].forEach((text, idx) => {
            const th = document.createElement('th');
            th.textContent = text;
            if (idx === 3) th.classList.add('ai-column');
            if (idx === 4) th.classList.add('justification-column');
            if (idx === 5) th.classList.add('confidence-column');
            headerRow.appendChild(th);
        });
        tableHead.appendChild(headerRow);
        tableTitle.textContent = `Résultats : ${run.name || 'Test'}`;
        tableContainer.style.display = 'block';
        filterTableByMatrix();

        // Mettre à jour les stats de confiance
        updateConfidenceStats();
    }

    // Afficher la zone stats
    statsContainer.style.display = 'block';
    hideArticlesSection();

    // Fermer le panneau Tests pour voir la matrice
    closeTestsPanel();
}

// ---- Comparison ----

function toggleRunSelection(runId, checkbox) {
    const card = checkbox.closest('.test-run-card');
    if (checkbox.checked) {
        if (selectedRunIds.length >= 2) {
            // Décocher le plus ancien
            const firstId = selectedRunIds[0];
            const firstCb = document.getElementById(`check-${firstId}`);
            if (firstCb) firstCb.checked = false;
            document.querySelector(`.test-run-card[data-run-id="${firstId}"]`)?.classList.remove('selected');
            selectedRunIds.shift();
        }
        selectedRunIds.push(runId);
        card.classList.add('selected');
    } else {
        selectedRunIds = selectedRunIds.filter(id => id !== runId);
        card.classList.remove('selected');
    }
    updateCompareButton();
}

function updateCompareButton() {
    const btn = document.getElementById('compareFromSelectionBtn');
    const countEl = document.getElementById('compareSelectionCount');
    if (!btn) return;
    const n = selectedRunIds.length;
    if (countEl) countEl.textContent = `(${n}/2)`;
    btn.disabled = n !== 2;
    btn.classList.toggle('compare-btn-ready', n === 2);
}

async function runComparisonFromSelection() {
    if (selectedRunIds.length !== 2) return;
    const [idA, idB] = selectedRunIds;

    document.getElementById('testsListView').style.display = 'none';
    document.getElementById('testDetailView').style.display = 'none';
    document.getElementById('testCompareView').style.display = 'flex';
    document.getElementById('compareResults').innerHTML = '<p class="tests-empty">Calcul en cours...</p>';

    try {
        const [runA, runB] = await Promise.all([
            testRunManager.getRun(idA),
            testRunManager.getRun(idB)
        ]);
        if (!runA || !runB) {
            document.getElementById('compareResults').innerHTML = '<p class="tests-empty">Impossible de charger les tests.</p>';
            return;
        }
        document.getElementById('compareResults').innerHTML = buildComparisonHTML(runA, runB);
        generateComparisonSummary(runA, runB);
    } catch (error) {
        console.error('Erreur comparaison:', error);
        document.getElementById('compareResults').innerHTML = '<p class="tests-empty">Erreur de comparaison.</p>';
    }
}

async function openCompareView() {
    document.getElementById('testsListView').style.display = 'none';
    document.getElementById('testDetailView').style.display = 'none';
    document.getElementById('testCompareView').style.display = 'flex';
    document.getElementById('compareResults').innerHTML = '';

    // Populate dropdowns with completed/stopped tests
    const runs = await testRunManager.listRuns();
    const completedRuns = runs.filter(r => r.status === 'completed' || r.status === 'stopped');

    const buildOptions = (selectId) => {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">-- Sélectionner --</option>';
        completedRuns.forEach(run => {
            const dateStr = run.started_at
                ? new Date(run.started_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                : '';
            const opt = document.createElement('option');
            opt.value = run.id;
            opt.textContent = `${run.name || run.llm_model} (${run.concordant_percent ?? '?'}%) — ${dateStr}`;
            select.appendChild(opt);
        });
    };

    buildOptions('compareTestA');
    buildOptions('compareTestB');
}

function backFromCompare() {
    document.getElementById('testCompareView').style.display = 'none';
    showTestsListView();
}

async function runComparison() {
    const idA = document.getElementById('compareTestA').value;
    const idB = document.getElementById('compareTestB').value;
    const resultsContainer = document.getElementById('compareResults');

    if (!idA || !idB) {
        resultsContainer.innerHTML = '<p class="tests-empty">Veuillez sélectionner 2 tests.</p>';
        return;
    }

    if (idA === idB) {
        resultsContainer.innerHTML = '<p class="tests-empty">Veuillez sélectionner 2 tests différents.</p>';
        return;
    }

    resultsContainer.innerHTML = '<p class="tests-empty">Calcul en cours...</p>';

    try {
        const [runA, runB] = await Promise.all([
            testRunManager.getRun(idA),
            testRunManager.getRun(idB)
        ]);

        if (!runA || !runB) {
            resultsContainer.innerHTML = '<p class="tests-empty">Impossible de charger les tests.</p>';
            return;
        }

        // Build comparison HTML
        const html = buildComparisonHTML(runA, runB);
        resultsContainer.innerHTML = html;

        // Generate AI summary asynchronously
        generateComparisonSummary(runA, runB);

    } catch (error) {
        console.error('Erreur comparaison:', error);
        resultsContainer.innerHTML = '<p class="tests-empty">Erreur de comparaison.</p>';
    }
}

function buildComparisonHTML(runA, runB) {
    const promptNameA = runA.prompts?.name || runA.prompt_id || '—';
    const promptNameB = runB.prompts?.name || runB.prompt_id || '—';
    const concA = parseFloat(runA.concordant_percent) || 0;
    const concB = parseFloat(runB.concordant_percent) || 0;
    const globalDelta = (concB - concA).toFixed(1);
    const winnerA = concA > concB;
    const winnerB = concB > concA;

    // Summary cards
    let html = `
        <div class="compare-summary">
            <div class="compare-summary-card ${winnerA ? 'winner' : ''}">
                <h4>Test A ${winnerA ? '🏆' : ''}</h4>
                <div class="meta">🤖 ${runA.llm_model || '—'} • 📝 ${promptNameA}</div>
                <div class="meta">${runA.analyzed_articles || 0} articles</div>
                <div class="big-stat">${concA}%</div>
            </div>
            <div class="compare-summary-card ${winnerB ? 'winner' : ''}">
                <h4>Test B ${winnerB ? '🏆' : ''}</h4>
                <div class="meta">🤖 ${runB.llm_model || '—'} • 📝 ${promptNameB}</div>
                <div class="meta">${runB.analyzed_articles || 0} articles</div>
                <div class="big-stat">${concB}%</div>
            </div>
        </div>
        <div style="text-align: center; margin-bottom: 20px;">
            <span style="font-size: 1.1rem; font-weight: 700;">
                Delta global: <span class="${parseFloat(globalDelta) > 0 ? 'delta-positive' : parseFloat(globalDelta) < 0 ? 'delta-negative' : 'delta-neutral'}">${parseFloat(globalDelta) > 0 ? '+' : ''}${globalDelta}%</span>
            </span>
        </div>
    `;

    // Per-userneed metrics table
    const matrixA = runA.confusion_matrix || {};
    const matrixB = runB.confusion_matrix || {};

    html += `
        <button class="pr-explain-btn" onclick="openPRModal()">
            📊 C'est quoi la Précision et le Rappel ?
        </button>
    `;

    html += `<table class="compare-delta-table">
        <thead>
            <tr>
                <th>User Need</th>
                <th>Précision A</th>
                <th>Précision B</th>
                <th>Rappel A</th>
                <th>Rappel B</th>
            </tr>
        </thead>
        <tbody>`;

    USERNEEDS.forEach(un => {
        const precA = calcPrecision(matrixA, un);
        const precB = calcPrecision(matrixB, un);
        const recA = calcRecall(matrixA, un);
        const recB = calcRecall(matrixB, un);

        const precAClass = precA > precB ? 'cell-best' : precA < precB ? 'cell-worst' : '';
        const precBClass = precB > precA ? 'cell-best' : precB < precA ? 'cell-worst' : '';
        const recAClass  = recA  > recB  ? 'cell-best' : recA  < recB  ? 'cell-worst' : '';
        const recBClass  = recB  > recA  ? 'cell-best' : recB  < recA  ? 'cell-worst' : '';

        html += `<tr>
            <td>${getShortName(un)}</td>
            <td class="${precAClass}">${precA.toFixed(1)}%</td>
            <td class="${precBClass}">${precB.toFixed(1)}%</td>
            <td class="${recAClass}">${recA.toFixed(1)}%</td>
            <td class="${recBClass}">${recB.toFixed(1)}%</td>
        </tr>`;
    });

    html += `</tbody></table>`;

    // Placeholder for AI summary (filled asynchronously)
    html += `
        <div id="comparisonAISummary" class="comparison-ai-summary">
            <div class="comparison-ai-summary-header">
                <span class="comparison-ai-summary-title">🤖 Analyse & recommandation IA</span>
            </div>
            <div class="comparison-ai-summary-body loading">
                <span class="ai-summary-spinner"></span> Analyse en cours…
            </div>
        </div>
    `;

    return html;
}

// ===================================
// MODAL PRÉCISION / RAPPEL
// ===================================

function openPRModal() {
    let modal = document.getElementById('prExplainerModal');
    if (!modal) {
        modal = createPRModal();
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closePRModal(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePRModal(); });
    }
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('pr-modal-visible'));
    document.body.style.overflow = 'hidden';
}

function closePRModal() {
    const modal = document.getElementById('prExplainerModal');
    if (!modal) return;
    modal.classList.remove('pr-modal-visible');
    setTimeout(() => { modal.style.display = 'none'; }, 240);
    document.body.style.overflow = '';
}

function createPRModal() {
    const div = document.createElement('div');
    div.id = 'prExplainerModal';
    div.className = 'pr-modal-overlay';

    const precDots = Array.from({length: 10}, (_, i) =>
        `<div class="pr-dot ${i < 7 ? 'pr-dot-correct' : 'pr-dot-wrong'}">${i < 7 ? '✓' : '✗'}</div>`
    ).join('');

    const recallDots = Array.from({length: 10}, (_, i) =>
        `<div class="pr-dot ${i < 6 ? 'pr-dot-found' : 'pr-dot-missed'}">${i < 6 ? '🤖' : '?'}</div>`
    ).join('');

    div.innerHTML = `
        <div class="pr-modal">
            <div class="pr-modal-header">
                <div class="pr-modal-title">📊 Précision & Rappel — Guide visuel</div>
                <button class="pr-close-btn" onclick="closePRModal()">✕</button>
            </div>
            <div class="pr-modal-body">

                <p class="pr-intro">L'IA classe des articles selon leur User Need. Mais comment savoir si elle le fait <em>bien</em> ? Deux métriques complémentaires permettent de le mesurer.</p>

                <div class="pr-scenario">
                    Exemple : l'IA classe des articles en <strong>"UPDATE ME"</strong>
                </div>

                <div class="pr-card pr-card-precision">
                    <div class="pr-card-header">
                        <span class="pr-card-icon">🎯</span>
                        <span class="pr-card-label">Précision</span>
                    </div>
                    <div class="pr-card-question">"Quand l'IA dit <em>UPDATE ME</em>, a-t-elle raison ?"</div>
                    <div class="pr-visual-label">L'IA a prédit <strong>UPDATE ME</strong> pour 10 articles :</div>
                    <div class="pr-dots-grid">${precDots}</div>
                    <div class="pr-dots-legend">
                        <span class="pr-legend-item pr-legend-correct"><span class="pr-legend-dot pr-legend-dot-correct">✓</span> Prédiction juste (7)</span>
                        <span class="pr-legend-item pr-legend-wrong"><span class="pr-legend-dot pr-legend-dot-wrong">✗</span> Fausse alerte (3)</span>
                    </div>
                    <div class="pr-formula-row">
                        <span class="pr-formula-frac">
                            <span class="pr-formula-num">7 justes</span>
                            <span class="pr-formula-line"></span>
                            <span class="pr-formula-den">10 prédictions</span>
                        </span>
                        <span class="pr-formula-eq">= <strong class="pr-score precision-score">70 %</strong></span>
                    </div>
                    <div class="pr-plain">Sur 10 articles classés UPDATE ME par l'IA, <strong>7 l'étaient vraiment</strong>. Les 3 autres ? D'autres User Needs classifiés à tort.</div>
                </div>

                <div class="pr-card pr-card-recall">
                    <div class="pr-card-header">
                        <span class="pr-card-icon">🔍</span>
                        <span class="pr-card-label">Rappel</span>
                    </div>
                    <div class="pr-card-question">"Parmi tous les vrais <em>UPDATE ME</em>, combien l'IA en a-t-elle trouvé ?"</div>
                    <div class="pr-visual-label">Les humains ont classifié <strong>10 articles</strong> UPDATE ME :</div>
                    <div class="pr-dots-grid">${recallDots}</div>
                    <div class="pr-dots-legend">
                        <span class="pr-legend-item pr-legend-found"><span class="pr-legend-dot pr-legend-dot-found">🤖</span> Détecté par l'IA (6)</span>
                        <span class="pr-legend-item pr-legend-missed"><span class="pr-legend-dot pr-legend-dot-missed">?</span> Raté par l'IA (4)</span>
                    </div>
                    <div class="pr-formula-row">
                        <span class="pr-formula-frac">
                            <span class="pr-formula-num">6 détectés</span>
                            <span class="pr-formula-line"></span>
                            <span class="pr-formula-den">10 articles réels</span>
                        </span>
                        <span class="pr-formula-eq">= <strong class="pr-score recall-score">60 %</strong></span>
                    </div>
                    <div class="pr-plain">Sur 10 vrais articles UPDATE ME, l'IA en a <strong>manqué 4</strong>. Ils ont été classés dans un autre User Need.</div>
                </div>

                <div class="pr-tradeoff">
                    <div class="pr-tradeoff-title">⚖️ Le compromis à connaître</div>
                    <div class="pr-tradeoff-grid">
                        <div class="pr-tradeoff-item">
                            <div class="pr-tradeoff-arrow arrow-precision">🎯 Précision haute</div>
                            <div class="pr-tradeoff-desc">L'IA est <strong>sélective</strong> — elle prédit peu, mais juste.<br>Risque : elle rate des articles (rappel ↓)</div>
                        </div>
                        <div class="pr-tradeoff-vs">VS</div>
                        <div class="pr-tradeoff-item">
                            <div class="pr-tradeoff-arrow arrow-recall">🔍 Rappel haut</div>
                            <div class="pr-tradeoff-desc">L'IA est <strong>généreuse</strong> — elle détecte tout, mais fait des erreurs.<br>Risque : plus de fausses alertes (précision ↓)</div>
                        </div>
                    </div>
                    <div class="pr-tradeoff-ideal">✨ <strong>L'idéal :</strong> maximiser les deux. Un bon modèle + un prompt précis permettent d'atteindre >70% dans les deux métriques.</div>
                </div>

            </div>
        </div>
    `;
    return div;
}

async function generateComparisonSummary(runA, runB) {
    if (!providerManager || !providerManager.isConfigured()) {
        const el = document.getElementById('comparisonAISummary');
        if (el) el.querySelector('.comparison-ai-summary-body').textContent = 'Clé API non configurée.';
        return;
    }

    const promptNameA = runA.prompts?.name || runA.prompt_id || '—';
    const promptNameB = runB.prompts?.name || runB.prompt_id || '—';
    const concA = parseFloat(runA.concordant_percent) || 0;
    const concB = parseFloat(runB.concordant_percent) || 0;
    const matrixA = runA.confusion_matrix || {};
    const matrixB = runB.confusion_matrix || {};

    // Build per-userneed metrics text
    const metricsLines = USERNEEDS.map(un => {
        const precA = calcPrecision(matrixA, un).toFixed(1);
        const precB = calcPrecision(matrixB, un).toFixed(1);
        const recA = calcRecall(matrixA, un).toFixed(1);
        const recB = calcRecall(matrixB, un).toFixed(1);
        return `  - ${getShortName(un)}: Prec A=${precA}% B=${precB}% | Rappel A=${recA}% B=${recB}%`;
    }).join('\n');

    const prompt = `Tu es expert en évaluation de modèles de classification NLP. Voici les résultats d'une comparaison entre deux configurations d'IA pour classifier des articles de presse selon des "User Needs".

TEST A : Modèle = ${runA.llm_model || '—'} | Prompt = "${promptNameA}" | Concordance globale = ${concA}%
TEST B : Modèle = ${runB.llm_model || '—'} | Prompt = "${promptNameB}" | Concordance globale = ${concB}%
Delta global : ${(concB - concA).toFixed(1)}%

Métriques par User Need (Précision = quand l'IA prédit ce UN, a-t-elle raison | Rappel = parmi tous les articles de ce UN, combien détectés) :
${metricsLines}

Rédige en français :
1. Un bref constat (3-4 phrases max) sur les points forts et faibles de chaque configuration.
2. Une recommandation claire et justifiée sur le combo prompt/modèle à privilégier.
3. Si pertinent, un point d'attention sur les User Needs les plus problématiques.

Sois direct, concis, et parle comme un expert qui s'adresse à une équipe éditoriale non technique.`;

    try {
        const payload = providerManager.getRequestPayload(prompt);
        // Use a smart model for this analysis
        payload.model = 'anthropic/claude-3.5-sonnet';

        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        const text = data.content || data.choices?.[0]?.message?.content || 'Aucune réponse.';

        const el = document.getElementById('comparisonAISummary');
        if (el) {
            const body = el.querySelector('.comparison-ai-summary-body');
            body.classList.remove('loading');
            // Render paragraphs
            body.innerHTML = text
                .split('\n')
                .filter(l => l.trim())
                .map(l => `<p>${l.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`)
                .join('');
        }
    } catch (err) {
        const el = document.getElementById('comparisonAISummary');
        if (el) {
            const body = el.querySelector('.comparison-ai-summary-body');
            body.classList.remove('loading');
            body.textContent = 'Erreur lors de la génération de l\'analyse.';
        }
    }
}

function calcPrecision(matrix, userneed) {
    // Precision = TP / (TP + FP) — of all predicted as this UN, how many were correct
    let tp = 0, totalPredicted = 0;
    const un = normalizeUserneed(userneed);

    for (const source in matrix) {
        const sourceNorm = normalizeUserneed(source);
        for (const pred in matrix[source]) {
            const predNorm = normalizeUserneed(pred);
            const count = matrix[source][pred] || 0;
            if (predNorm === un) {
                totalPredicted += count;
                if (sourceNorm === un) tp += count;
            }
        }
    }
    return totalPredicted > 0 ? (tp / totalPredicted) * 100 : 0;
}

function calcRecall(matrix, userneed) {
    // Recall = TP / (TP + FN) — of all actual this UN, how many were correctly predicted
    let tp = 0, totalActual = 0;
    const un = normalizeUserneed(userneed);

    for (const source in matrix) {
        const sourceNorm = normalizeUserneed(source);
        for (const pred in matrix[source]) {
            const predNorm = normalizeUserneed(pred);
            const count = matrix[source][pred] || 0;
            if (sourceNorm === un) {
                totalActual += count;
                if (predNorm === un) tp += count;
            }
        }
    }
    return totalActual > 0 ? (tp / totalActual) * 100 : 0;
}

function formatDelta(val) {
    const num = parseFloat(val);
    if (num > 0) return `+${val}%`;
    if (num < 0) return `${val}%`;
    return `${val}%`;
}

function formatDeltaClass(val) {
    const num = parseFloat(val);
    if (num > 0) return 'delta-positive';
    if (num < 0) return 'delta-negative';
    return 'delta-neutral';
}

async function deleteTestRun(runId, event) {
    event.stopPropagation();

    if (!confirm('Supprimer ce test et toutes ses analyses ?')) return;

    try {
        await testRunManager.deleteRun(runId);
        showToast('Test supprimé');
        refreshTestsList();
    } catch (error) {
        console.error('Erreur suppression test:', error);
        showToast('Erreur de suppression', 'error');
    }
}

// ====================================
// PROMPT MANAGEMENT UI FUNCTIONS
// ====================================

let currentEditingPromptId = null;

function initializePromptUI() {
    // Références DOM pour la gestion LLM
    // Références DOM pour LLM
    const llmBtn = document.getElementById('llmBtn');
    const llmPanel = document.getElementById('llmPanel');

    // CRITIQUE : Vérifier que les éléments LLM existent
    if (!llmBtn || !llmPanel) {
        console.error('❌ Éléments LLM manquants (llmBtn ou llmPanel)');
        // Continue quand même pour initialiser PROMPTS
    } else {
        const closeLlmPanelBtn = document.getElementById('closeLlmPanelBtn');
        const llmPanelBackdrop = llmPanel.querySelector('.llm-panel-backdrop');

        if (!closeLlmPanelBtn || !llmPanelBackdrop) {
            console.error('❌ Éléments internes LLM manquants');
        } else {
            // Event listeners pour LLM
            llmBtn.addEventListener('click', openLlmPanel);
            closeLlmPanelBtn.addEventListener('click', closeLlmPanel);
            llmPanelBackdrop.addEventListener('click', closeLlmPanel);
            console.log('✅ Bouton LLM initialisé');
        }
    }

    // Références DOM pour la gestion des prompts
    const settingsBtn = document.getElementById('settingsBtn');
    const promptPanel = document.getElementById('promptPanel');

    // CRITIQUE : Vérifier que les éléments PROMPTS existent
    if (!settingsBtn || !promptPanel) {
        console.error('❌ Éléments PROMPTS manquants (settingsBtn ou promptPanel)');
        return; // Arrêter complètement si PROMPTS manquant
    }

    const closePanelBtn = document.getElementById('closePanelBtn');
    const promptPanelBackdrop = promptPanel.querySelector('.prompt-panel-backdrop');
    const createPromptBtn = document.getElementById('createPromptBtn');
    const importPromptsBtn = document.getElementById('importPromptsBtn');
    const exportPromptsBtn = document.getElementById('exportPromptsBtn');

    const promptModal = document.getElementById('promptModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const savePromptBtn = document.getElementById('savePromptBtn');

    const importFileInput = document.getElementById('importFileInput');

    // Vérifications supplémentaires pour PROMPTS
    if (!closePanelBtn || !promptPanelBackdrop) {
        console.error('❌ Éléments internes PROMPTS manquants');
        return;
    }

    // Event listeners pour Prompts
    settingsBtn.addEventListener('click', openPromptPanel);
    closePanelBtn.addEventListener('click', closePromptPanel);
    promptPanelBackdrop.addEventListener('click', closePromptPanel);

    if (createPromptBtn) createPromptBtn.addEventListener('click', () => openPromptModal());
    if (importPromptsBtn) importPromptsBtn.addEventListener('click', importPrompts);
    if (exportPromptsBtn) exportPromptsBtn.addEventListener('click', exportPrompts);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closePromptModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closePromptModal);
    if (savePromptBtn) savePromptBtn.addEventListener('click', savePrompt);
    if (importFileInput) importFileInput.addEventListener('change', handleImportFile);

    console.log('✅ Interface UI initialisée (PROMPTS + LLM)');

    // Charger la liste des prompts au démarrage
    refreshPromptList();
}

// ====================================
// PROVIDER MANAGEMENT UI FUNCTIONS
// ====================================

function renderModelPicker() {
    const picker = document.getElementById('modelPicker');
    if (!picker) return;

    function estimatedCost(m) {
        if (m.input === 0 && m.output === 0) return null; // free
        return (INPUT_TOKENS_50 * m.input + OUTPUT_TOKENS_50 * m.output) / 1_000_000;
    }

    function costClass(cost) {
        if (cost === null) return 'free';
        if (cost < 0.02) return 'cheap';
        if (cost < 0.15) return 'mid';
        return 'pricey';
    }

    function stars(n, max = 5) {
        return '★'.repeat(n) + '☆'.repeat(max - n);
    }

    function frenchLabel(n) {
        if (n === 3) return '🇫🇷 Excellent';
        if (n === 2) return '✓ Bon';
        return '~ Correct';
    }

    const legend = `
        <div class="model-legend">
            <div class="model-legend-item">
                <span class="model-legend-term">Prix entrée /M</span>
                <span class="model-legend-def">Coût des tokens envoyés à l'IA (titre + chapô de l'article). Payé à chaque article analysé.</span>
            </div>
            <div class="model-legend-item">
                <span class="model-legend-term">Prix sortie /M</span>
                <span class="model-legend-def">Coût des tokens générés par l'IA (sa réponse de classification). Généralement plus cher.</span>
            </div>
            <div class="model-legend-item">
                <span class="model-legend-term">≈ Coût / 50 articles</span>
                <span class="model-legend-def">Estimation pour une analyse de 50 articles (~400 tokens entrée + 120 tokens sortie par article).</span>
            </div>
            <div class="model-legend-item">
                <span class="model-legend-term">Français</span>
                <span class="model-legend-def">Niveau de maîtrise du français — critère clé pour cette application.</span>
            </div>
        </div>`;

    const rows = MODELS.map((m, i) => {
        const isSelected = m.id === providerManager.selectedModel;
        const cost = estimatedCost(m);
        const costStr = cost === null ? '<span class="mt-cost free">Gratuit</span>'
            : `<span class="mt-cost ${costClass(cost)}">$${cost < 0.01 ? cost.toFixed(4) : cost.toFixed(3)}</span>`;
        const inputStr = m.input === 0 ? '<span class="mt-price free">—</span>' : `<span class="mt-price">$${m.input}</span>`;
        const outputStr = m.output === 0 ? '<span class="mt-price free">—</span>' : `<span class="mt-price">$${m.output}</span>`;
        const recBadge = m.recommended ? '<span class="mt-rec-badge">✦ Recommandé</span>' : '';
        const rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;

        return `<tr class="${isSelected ? 'selected' : ''}" data-model-id="${m.id}" title="${m.note}">
            <td class="mt-rank">${rankEmoji}</td>
            <td class="mt-name-cell">
                <span class="mt-radio">${isSelected ? '●' : '○'}</span>
                <span class="mt-name">${m.name}${recBadge}</span>
                <span class="mt-provider">${m.provider}</span>
            </td>
            <td class="mt-speed">${m.speed}</td>
            <td>${inputStr}</td>
            <td>${outputStr}</td>
            <td>${costStr}</td>
            <td class="mt-stars">${stars(m.quality)}</td>
            <td class="mt-fr">${frenchLabel(m.french)}</td>
        </tr>`;
    }).join('');

    picker.innerHTML = legend + `
        <table class="model-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th style="text-align:left">Modèle</th>
                    <th>Vitesse</th>
                    <th>Prix entrée /M</th>
                    <th>Prix sortie /M</th>
                    <th>≈ Coût / 50 art.</th>
                    <th>Qualité</th>
                    <th>Français</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
        <p style="font-size:0.72rem; color:var(--text-secondary); margin-top:8px;">
            * Prix indicatifs OpenRouter ($/million de tokens). Survolez une ligne pour voir le détail du modèle.
        </p>`;

    picker.querySelectorAll('tr[data-model-id]').forEach(row => {
        row.addEventListener('click', () => {
            providerManager.selectedModel = row.dataset.modelId;
            console.log(`✅ Modèle sélectionné: ${providerManager.selectedModel}`);
            renderModelPicker();
        });
    });
}

function initializeProviderUI() {
    const openrouterApiKeyInput = document.getElementById('openrouterApiKey');
    const saveProviderConfigBtn = document.getElementById('saveProviderConfigBtn');

    renderModelPicker();

    if (openrouterApiKeyInput) {
        openrouterApiKeyInput.value = providerManager.openrouterApiKey || '';
    }

    // Event listener for OpenRouter API key
    if (openrouterApiKeyInput) {
        openrouterApiKeyInput.addEventListener('input', (e) => {
            providerManager.openrouterApiKey = e.target.value;
        });
    }

    // Event listener for save button
    if (saveProviderConfigBtn) {
        saveProviderConfigBtn.addEventListener('click', () => {
            providerManager.saveConfiguration();
            console.log('✅ Clé API OpenRouter sauvegardée');

            // Visual feedback
            const originalText = saveProviderConfigBtn.textContent;
            saveProviderConfigBtn.textContent = '✅ Sauvegardé !';
            saveProviderConfigBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            setTimeout(() => {
                saveProviderConfigBtn.textContent = originalText;
                saveProviderConfigBtn.style.background = '';
            }, 2000);
        });
    }

    // Event listener for reset configuration button
    const resetConfigBtn = document.getElementById('resetConfigBtn');
    if (resetConfigBtn) {
        resetConfigBtn.addEventListener('click', async () => {
            console.log('🔄 Rechargement de la configuration depuis config.json...');

            // Nettoyer localStorage
            localStorage.clear();
            console.log('🧹 localStorage effacé');

            // Recharger depuis config.json
            providerManager.configFileLoaded = false; // Reset flag
            await providerManager.loadConfigurationFromFile();

            // Rafraîchir l'UI
            renderModelPicker();
            if (openrouterApiKeyInput) {
                openrouterApiKeyInput.value = providerManager.openrouterApiKey || '';
            }

            // Visual feedback
            const originalText = resetConfigBtn.textContent;
            resetConfigBtn.textContent = '✅ Configuration rechargée !';
            resetConfigBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            setTimeout(() => {
                resetConfigBtn.textContent = originalText;
                resetConfigBtn.style.background = '';
            }, 2000);

            console.log('✅ Configuration rechargée avec succès');
        });
    }

    console.log('✅ Interface OpenRouter initialisée');
}

function openLlmPanel() {
    const llmPanel = document.getElementById('llmPanel');
    llmPanel.classList.add('active');
}

function closeLlmPanel() {
    const llmPanel = document.getElementById('llmPanel');
    llmPanel.classList.remove('active');
}

function openPromptPanel() {
    const promptPanel = document.getElementById('promptPanel');
    promptPanel.classList.add('active');
    refreshPromptList();
}

function closePromptPanel() {
    const promptPanel = document.getElementById('promptPanel');
    promptPanel.classList.remove('active');
}

function openPromptModal(promptId = null) {
    currentEditingPromptId = promptId;
    const promptModal = document.getElementById('promptModal');
    const modalTitle = document.getElementById('modalTitle');
    const savePromptBtn = document.getElementById('savePromptBtn');

    if (promptId) {
        // Mode édition
        const prompt = promptManager.getPromptById(promptId);
        if (!prompt) return;

        modalTitle.textContent = prompt.isDefault ? 'Voir le prompt' : 'Éditer le prompt';
        document.getElementById('promptName').value = prompt.name;
        document.getElementById('promptDescription').value = prompt.description || '';
        document.getElementById('promptContent').value = prompt.content || '';

        // Désactiver l'édition si c'est le prompt par défaut
        if (prompt.isDefault) {
            document.querySelectorAll('#promptModal input, #promptModal textarea').forEach(el => {
                el.disabled = true;
            });
            savePromptBtn.style.display = 'none';
        } else {
            document.querySelectorAll('#promptModal input, #promptModal textarea').forEach(el => {
                el.disabled = false;
            });
            savePromptBtn.style.display = 'block';
        }
    } else {
        // Mode création
        modalTitle.textContent = 'Nouveau prompt';
        document.getElementById('promptName').value = '';
        document.getElementById('promptDescription').value = '';
        document.getElementById('promptContent').value = '';

        document.querySelectorAll('#promptModal input, #promptModal textarea').forEach(el => {
            el.disabled = false;
        });
        savePromptBtn.style.display = 'block';
    }

    promptModal.classList.add('active');
}

function closePromptModal() {
    const promptModal = document.getElementById('promptModal');
    promptModal.classList.remove('active');
    currentEditingPromptId = null;
}

function savePrompt() {
    const name = document.getElementById('promptName').value.trim();
    const description = document.getElementById('promptDescription').value.trim();
    const content = document.getElementById('promptContent').value.trim();

    // Validation simplifiée
    if (!name) {
        alert('Le nom du prompt est obligatoire');
        return;
    }

    if (!content) {
        alert('Le contenu du prompt ne peut pas être vide');
        return;
    }

    const promptData = {
        name,
        description,
        content: content, // String directe au lieu d'objet
        userneeds: [...USERNEEDS],
        tags: []
    };

    if (currentEditingPromptId) {
        // Mode édition
        promptManager.updatePrompt(currentEditingPromptId, promptData);
    } else {
        // Mode création
        promptManager.createPrompt(promptData);
    }

    closePromptModal();
    refreshPromptList();
}

function refreshPromptList() {
    const promptList = document.getElementById('promptList');
    const promptCount = document.getElementById('promptCount');
    const prompts = promptManager.prompts;
    
    promptCount.textContent = prompts.length;
    promptList.innerHTML = '';

    prompts.forEach(prompt => {
        const card = document.createElement('div');
        card.className = 'prompt-card';
        if (prompt.isActive) card.classList.add('active');

        const header = document.createElement('div');
        header.className = 'prompt-card-header';

        const title = document.createElement('div');
        title.className = 'prompt-card-title';
        title.textContent = prompt.name;

        const badges = document.createElement('div');
        if (prompt.isDefault) {
            const defaultBadge = document.createElement('span');
            defaultBadge.className = 'default-badge';
            defaultBadge.textContent = 'Système';
            badges.appendChild(defaultBadge);
        }

        header.appendChild(title);
        header.appendChild(badges);

        const description = document.createElement('div');
        description.className = 'prompt-card-description';
        description.textContent = prompt.description || 'Aucune description';

        const meta = document.createElement('div');
        meta.className = 'prompt-card-meta';
        const createdDate = new Date(prompt.createdAt).toLocaleDateString('fr-FR');
        meta.textContent = `Créé le ${createdDate} • ${prompt.userneeds.length} userneeds`;

        const actions = document.createElement('div');
        actions.className = 'prompt-card-actions';

        // Bouton Voir
        const viewBtn = document.createElement('button');
        viewBtn.className = 'prompt-card-btn btn-view';
        viewBtn.textContent = '👁️ Voir';
        viewBtn.onclick = () => openPromptModal(prompt.id);
        actions.appendChild(viewBtn);

        // Bouton Dupliquer
        const duplicateBtn = document.createElement('button');
        duplicateBtn.className = 'prompt-card-btn btn-duplicate';
        duplicateBtn.textContent = '📋 Dupliquer';
        duplicateBtn.onclick = () => {
            const newPrompt = promptManager.duplicatePrompt(prompt.id);
            if (newPrompt) {
                refreshPromptList();
            }
        };
        actions.appendChild(duplicateBtn);

        // Bouton Éditer (si pas default)
        if (!prompt.isDefault) {
            const editBtn = document.createElement('button');
            editBtn.className = 'prompt-card-btn btn-edit';
            editBtn.textContent = '✏️ Éditer';
            editBtn.onclick = () => openPromptModal(prompt.id);
            actions.appendChild(editBtn);

            // Bouton Supprimer
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'prompt-card-btn btn-delete';
            deleteBtn.textContent = '🗑️ Supprimer';
            deleteBtn.onclick = () => {
                if (confirm(`Voulez-vous vraiment supprimer le prompt "${prompt.name}" ?`)) {
                    promptManager.deletePrompt(prompt.id);
                    refreshPromptList();
                }
            };
            actions.appendChild(deleteBtn);
        }

        // Bouton Activer (si pas déjà actif)
        if (!prompt.isActive) {
            const activateBtn = document.createElement('button');
            activateBtn.className = 'prompt-card-btn btn-activate';
            activateBtn.textContent = '✓ Activer';
            activateBtn.onclick = () => {
                promptManager.setActivePrompt(prompt.id);
                refreshPromptList();
            };
            actions.appendChild(activateBtn);
        }

        card.appendChild(header);
        card.appendChild(description);
        card.appendChild(meta);
        card.appendChild(actions);

        promptList.appendChild(card);
    });
}

function exportPrompts() {
    const data = promptManager.exportPrompts();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `prompts_userneeds_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log(`✅ Prompts exportés : prompts_userneeds_${date}.json`);
}

function importPrompts() {
    const importFileInput = document.getElementById('importFileInput');
    importFileInput.click();
}

function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            const strategy = confirm('Voulez-vous remplacer tous les prompts existants ?\n\nOK = Remplacer tout\nAnnuler = Fusionner avec les existants')
                ? 'replace'
                : 'merge';

            const success = promptManager.importPrompts(data, strategy);
            if (success) {
                alert('Import réussi !');
                refreshPromptList();
            } else {
                alert('Erreur lors de l\'import. Vérifiez le format du fichier.');
            }
        } catch (error) {
            alert('Erreur : fichier JSON invalide');
            console.error(error);
        }
    };
    reader.readAsText(file);

    // Reset input pour permettre l'import du même fichier
    event.target.value = '';
}

// ========================
// REASONING & URL COPY FEATURES
// ========================

// Afficher le modal avec la justification de l'IA
function showReasoningModal(articleIndex) {
    const result = articleResults[articleIndex];
    if (!result || !result.hasJustification) {
        showToast('Aucune justification disponible', 'error');
        return;
    }

    const modal = document.getElementById('reasoningModal');

    // Badge du userneed avec couleur
    const badge = document.getElementById('reasoningUserneedBadge');
    badge.textContent = result.predictedUserneed;
    badge.className = 'reasoning-userneed-badge';
    badge.classList.add(result.isMatch ? 'concordant' : 'different');

    // Justification complète
    document.getElementById('reasoningText').textContent = result.justification;

    // Afficher le modal
    modal.classList.add('active');
}

// Fermer le modal de justification
function closeReasoningModal() {
    const modal = document.getElementById('reasoningModal');
    modal.classList.remove('active');
}

// Afficher le détail de confiance d'un article
function showConfidenceDetail(articleIndex) {
    const article = articleResults[articleIndex];
    if (!article) return;

    const modal = document.getElementById('confidenceModal');
    const detail = document.getElementById('confidenceDetail');

    const levelColor = article.confidenceLevel === 'HAUTE' ? '#10b981'
                     : article.confidenceLevel === 'MOYENNE' ? '#f59e0b'
                     : '#ef4444';

    let scoresHtml = '';
    if (article.predictions && article.predictions.length > 0) {
        article.predictions.forEach((p, i) => {
            const rankLabel = i === 0 ? '1️⃣ Principal' : i === 1 ? '2️⃣ Secondaire' : '3️⃣ Tertiaire';
            scoresHtml += `<div class="stat-item" style="margin: 6px 0;">
                <span style="color: var(--text-secondary);">${rankLabel} :</span>
                <strong>${p.userneed}</strong> — <span style="font-weight: 700;">${p.score}%</span>
            </div>`;
        });
    }

    detail.innerHTML = `
        <div class="stats-box">
            <div class="stat-title" style="font-size: 1.1rem; margin-bottom: 12px;">
                Niveau : <span style="color: ${levelColor}; font-size: 1.2rem;">${article.confidenceLevel}</span>
            </div>
            <div class="stat-item" style="margin: 8px 0;">
                <strong>Delta P1-P2 :</strong> <span style="color: ${levelColor}; font-weight: 700; font-size: 1.1rem;">${article.delta}</span>
                <span style="color: var(--text-secondary); font-size: 0.85rem;"> (écart entre score principal et secondaire)</span>
            </div>
            <div class="stat-item" style="margin: 8px 0;">
                <strong>ICP :</strong> <span style="color: ${levelColor}; font-weight: 700; font-size: 1.1rem;">${article.icp}</span>
                <span style="color: var(--text-secondary); font-size: 0.85rem;"> (Indice de Confiance Pondéré)</span>
            </div>
        </div>
        <div class="stats-box">
            <div class="stat-subtitle">Décomposition des scores</div>
            ${scoresHtml}
        </div>
        <div class="stats-box" style="font-size: 0.85rem; color: var(--text-secondary);">
            <strong>Seuils Delta :</strong> HAUTE ≥ 30 | MOYENNE 15-29 | BASSE < 15<br>
            <strong>Seuils ICP :</strong> HAUTE ≥ 18 | MOYENNE 7-17 | BASSE < 7
        </div>
    `;

    modal.classList.add('active');
}

// Fermer le modal de confiance
function closeConfidenceModal() {
    const modal = document.getElementById('confidenceModal');
    modal.classList.remove('active');
}

// Copier l'URL dans le presse-papier
async function copyUrlToClipboard(url) {
    if (!url) {
        showToast('Aucune URL à copier', 'error');
        return;
    }

    try {
        // Méthode moderne (Clipboard API)
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(url);
            showToast('URL copiée !', 'success');
        } else {
            // Fallback pour navigateurs anciens
            const textArea = document.createElement('textarea');
            textArea.value = url;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showToast('URL copiée !', 'success');
        }
    } catch (error) {
        console.error('Erreur lors de la copie:', error);
        showToast('Erreur lors de la copie', 'error');
    }
}

// Afficher une notification toast
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? '✓' : '✕';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;

    container.appendChild(toast);

    // Supprimer après 3 secondes
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3000);
}

// ===================================
// GESTION DU THÈME
// ===================================

/**
 * Initialise le thème au chargement de la page
 */
