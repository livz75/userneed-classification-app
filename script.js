const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
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

let currentData = null;
let stopAnalysis = false;
let articleResults = []; // Stockage global des résultats d'analyse

// Les 8 userneeds dans l'ordre
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
    const normalized = userneed.trim().toUpperCase();
    return USERNEED_VARIANTS[normalized] || normalized;
}

// Parse la réponse de Claude pour extraire userneed et justification
function parseAIResponse(responseText) {
    const text = responseText.trim();

    // Méthode 1: Chercher un userneed valide en premier
    const validUserneeds = USERNEEDS.join('|').replace(/\s+/g, '\\s+');
    const userneedRegex = new RegExp(`(${validUserneeds})`, 'i');
    const userneedMatch = text.match(userneedRegex);

    if (userneedMatch) {
        const userneed = userneedMatch[1].trim();

        // Position du userneed dans le texte
        const userneedIndex = text.indexOf(userneedMatch[0]);

        // Chercher une justification après le userneed avec plusieurs patterns possibles
        const afterUserneed = text.substring(userneedIndex + userneedMatch[0].length).trim();

        // Pattern 1: Justification explicite avec "justification:", "raisonnement:", etc.
        const explicitJustifRegex = /(?:justification|raisonnement|explication|raison|analyse)\s*:?\s*(.+)/is;
        const explicitMatch = afterUserneed.match(explicitJustifRegex);

        if (explicitMatch) {
            return {
                userneed: userneed,
                justification: explicitMatch[1].trim(),
                hasJustification: true
            };
        }

        // Pattern 2: Tout ce qui suit le userneed (si plus de 20 caractères, c'est probablement une justification)
        if (afterUserneed.length > 20) {
            return {
                userneed: userneed,
                justification: afterUserneed,
                hasJustification: true
            };
        }

        // Pattern 3: Chercher avant le userneed (au cas où la justification précède)
        const beforeUserneed = text.substring(0, userneedIndex).trim();
        if (beforeUserneed.length > 20) {
            return {
                userneed: userneed,
                justification: beforeUserneed,
                hasJustification: true
            };
        }

        // Userneed trouvé mais pas de justification substantielle
        return {
            userneed: userneed,
            justification: null,
            hasJustification: false
        };
    }

    // Fallback: toute la réponse comme userneed
    return {
        userneed: text,
        justification: null,
        hasJustification: false
    };
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
        this.initialize();
    }

    initialize() {
        // Charger depuis localStorage ou créer le prompt par défaut
        this.loadFromStorage();
        if (this.prompts.length === 0) {
            this.createDefaultPrompt();
        }

        // Vérifier et mettre à jour le prompt système s'il utilise l'ancien format
        const systemPrompt = this.prompts.find(p => p.isDefault);
        const newTaskFormat = 'Analyse cet article et réponds EXACTEMENT avec ce format (ne rajoute rien d\'autre) :\n\nUSERNEED: [nom exact du userneed]\nJUSTIFICATION: [2-3 phrases expliquant pourquoi ce userneed correspond à l\'article]\n\nUserneeds disponibles :\n- UPDATE ME\n- EXPLAIN ME\n- GIVE ME PERSPECTIVE\n- GIVE ME A BREAK\n- GIVE ME CONCERNING NEWS\n- INSPIRE ME\n- MAKE ME FEEL THE NEWS\n- REVEAL NEWS\n\nRègle CRITIQUE : Tu dois répondre EXACTEMENT avec le format ci-dessus. Commence par "USERNEED:" suivi du nom, puis sur une nouvelle ligne "JUSTIFICATION:" suivi de ton explication. Ne rajoute AUCUN texte avant ou après.';

        if (systemPrompt && systemPrompt.content.task !== newTaskFormat) {
            console.log('🔄 Mise à jour du prompt système avec le format structuré obligatoire');
            systemPrompt.content.task = newTaskFormat;
            systemPrompt.modifiedAt = new Date().toISOString();
            this.saveToStorage();
        }

        // S'assurer qu'un prompt est actif
        if (!this.activePromptId || !this.getPromptById(this.activePromptId)) {
            const defaultPrompt = this.prompts.find(p => p.isDefault) || this.prompts[0];
            this.activePromptId = defaultPrompt.id;
        }
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
            content: {
                role: 'Tu es un expert en data analyse et IA spécialisé dans la classification éditoriale pour France Télévisions. Ta mission est de catégoriser précisément des articles de franceinfo selon 8 userneeds prédéfinis.',
                vision: '1. L\'information de Franceinfo est le reflet d\'une couverture exacte, équilibrée, complète et impartiale de l\'actualité.\n2. L\'information de Franceinfo est certifiée, validée avant d\'être publiée.\n3. L\'information de Franceinfo revendique la liberté de ton sur tous les supports.\n4. L\'information de Franceinfo est au service du public et participe à la construction de la citoyenneté.\n5. L\'information de Franceinfo est honnête et transparente.',
                definitions: '1. UPDATE ME - Information factuelle sur l\'actualité récente. Brèves ou contenus factuels récapitulant les événements.\n\n2. EXPLAIN ME - Vulgarisation et mise en contexte pédagogique. Premier niveau de compréhension, synthétique et didactique.\n\n3. GIVE ME PERSPECTIVE - Analyse approfondie avec différents points de vue. Second niveau de compréhension pour ceux qui connaissent déjà le sujet.\n\n4. GIVE ME A BREAK - Contenus légers et divertissants. Insolite, étonnant, drôle, curiosité.\n\n5. GIVE ME CONCERNING NEWS - Contenus qui touchent à la sphère privée, dans l\'air du temps, utiles au quotidien.\n\n6. INSPIRE ME - Récits inspirants et solutions. Histoires positives, résilience, espoir, journalisme de solution.\n\n7. MAKE ME FEEL THE NEWS - Témoignages et expériences vécues. Récits de première main qui provoquent une émotion.\n\n8. REVEAL NEWS - Enquêtes et révélations exclusives. Information obtenue par France Télévisions/franceinfo/Radio France.',
                task: 'Analyse cet article et réponds EXACTEMENT avec ce format (ne rajoute rien d\'autre) :\n\nUSERNEED: [nom exact du userneed]\nJUSTIFICATION: [2-3 phrases expliquant pourquoi ce userneed correspond à l\'article]\n\nUserneeds disponibles :\n- UPDATE ME\n- EXPLAIN ME\n- GIVE ME PERSPECTIVE\n- GIVE ME A BREAK\n- GIVE ME CONCERNING NEWS\n- INSPIRE ME\n- MAKE ME FEEL THE NEWS\n- REVEAL NEWS\n\nRègle CRITIQUE : Tu dois répondre EXACTEMENT avec le format ci-dessus. Commence par "USERNEED:" suivi du nom, puis sur une nouvelle ligne "JUSTIFICATION:" suivi de ton explication. Ne rajoute AUCUN texte avant ou après.'
            },
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

    loadFromStorage() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                this.prompts = JSON.parse(data);
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

    saveToStorage() {
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

    getActivePrompt() {
        return this.getPromptById(this.activePromptId) || this.prompts[0];
    }

    getPromptById(id) {
        return this.prompts.find(p => p.id === id);
    }

    buildPromptText(titre, chapo, corps) {
        const activePrompt = this.getActivePrompt();
        if (!activePrompt) {
            throw new Error('Aucun prompt actif trouvé');
        }

        const { content } = activePrompt;
        let promptText = '';

        if (content.role) {
            promptText += `#ROLE\n${content.role}\n\n`;
        }
        if (content.vision) {
            promptText += `#VISION DE FRANCEINFO\n${content.vision}\n\n`;
        }
        if (content.definitions) {
            promptText += `#DÉFINITIONS DES USERNEEDS\n\n${content.definitions}\n\n`;
        }

        promptText += `#ARTICLE À ANALYSER\n\nTitre: ${titre}\n\nChapô: ${chapo}\n\nCorps: ${corps}\n\n`;

        if (content.task) {
            promptText += `#TÂCHE\n${content.task}`;
        }

        return promptText;
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

// Instance globale du gestionnaire de prompts
let promptManager = null;

// Matrice de confusion : confusionMatrix[source][prediction] = count
let confusionMatrix = {};
let sourceDistribution = {};
let predictionDistribution = {};

// Charger la clé API depuis le fichier config.json au démarrage
window.addEventListener('DOMContentLoaded', async () => {
    // NOUVEAU: Initialiser le gestionnaire de prompts en premier
    promptManager = new PromptManager();
    console.log('📝 Gestionnaire de prompts initialisé');

    // Ensuite charger l'API key (code existant)
    try {
        const response = await fetch('/config.json');
        if (response.ok) {
            const config = await response.json();
            if (config.apiKey && config.apiKey !== 'VOTRE_CLE_API_ICI') {
                localStorage.setItem('anthropic_api_key', config.apiKey);
                console.log('🔑 Clé API chargée depuis config.json');
            }
        }
    } catch (error) {
        console.warn('Impossible de charger config.json:', error);
        // La clé API sera chargée depuis localStorage lors de l'analyse
        const savedApiKey = localStorage.getItem('anthropic_api_key');
        if (savedApiKey) {
            console.log('🔑 Clé API disponible dans le stockage local');
        }
    }

    // Initialiser la gestion des prompts UI
    initializePromptUI();
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

fileInput.addEventListener('change', handleFileUpload);
clearBtn.addEventListener('click', clearTable);
analyzeBtn.addEventListener('click', analyzeWithAI);
stopBtn.addEventListener('click', stopAnalysisHandler);
resetBtn.addEventListener('click', resetApplication);
exportBtn.addEventListener('click', exportToExcel);

// Event listeners pour le modal de justification
document.addEventListener('DOMContentLoaded', () => {
    const closeReasoningBtn = document.getElementById('closeReasoningBtn');
    const reasoningBackdrop = document.querySelector('.reasoning-modal-backdrop');

    if (closeReasoningBtn) closeReasoningBtn.addEventListener('click', closeReasoningModal);
    if (reasoningBackdrop) reasoningBackdrop.addEventListener('click', closeReasoningModal);

    // Fermer avec Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeReasoningModal();
        }
    });
});

function handleFileUpload(event) {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    // Vérifier l'extension du fichier
    if (!file.name.endsWith('.xlsx')) {
        showError('Veuillez sélectionner un fichier .xlsx');
        return;
    }

    fileName.textContent = `Fichier sélectionné : ${file.name}`;
    fileName.style.display = 'block';
    hideError();

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Prendre la première feuille
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Convertir en JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length === 0) {
                showError('Le fichier est vide');
                return;
            }

            displayTable(jsonData, firstSheetName);
        } catch (error) {
            showError('Erreur lors de la lecture du fichier : ' + error.message);
        }
    };

    reader.onerror = function() {
        showError('Erreur lors de la lecture du fichier');
    };

    reader.readAsArrayBuffer(file);
}

function displayTable(data, sheetName) {
    // Sauvegarder les données pour l'analyse IA
    currentData = data;

    // Effacer le tableau précédent
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';

    if (data.length === 0) {
        showError('Aucune donnée à afficher');
        return;
    }

    // Créer l'en-tête du tableau avec seulement les colonnes visibles
    const headers = data[0];
    const headerRow = document.createElement('tr');

    // Colonnes à afficher: Numéro, Titre, User ID attribué (A), Prédiction IA
    const numeroTh = document.createElement('th');
    numeroTh.textContent = 'Numéro';
    headerRow.appendChild(numeroTh);

    const titreTh = document.createElement('th');
    titreTh.textContent = 'Titre de l\'article';
    headerRow.appendChild(titreTh);

    const userIdTh = document.createElement('th');
    userIdTh.textContent = headers[0] || 'User Need attribué'; // Colonne A (index 0)
    headerRow.appendChild(userIdTh);

    const aiTh = document.createElement('th');
    aiTh.textContent = 'Prédiction IA';
    aiTh.classList.add('ai-column');
    headerRow.appendChild(aiTh);

    // NOUVELLE COLONNE: Justification IA
    const justificationTh = document.createElement('th');
    justificationTh.textContent = 'Justification IA';
    justificationTh.classList.add('justification-column');
    headerRow.appendChild(justificationTh);

    tableHead.appendChild(headerRow);

    // Le tableau reste vide, les lignes seront ajoutées au fur et à mesure de l'analyse

    // Mettre à jour le titre et afficher le tableau
    tableTitle.textContent = `Contenu du fichier : ${sheetName}`;
    tableContainer.style.display = 'block';

    // Afficher les boutons appropriés
    analyzeBtn.style.display = 'inline-block';
    resetBtn.style.display = 'inline-block';

    // Faire défiler jusqu'au tableau
    tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetApplication() {
    fileInput.value = '';
    fileName.textContent = '';
    fileName.style.display = 'none';
    tableContainer.style.display = 'none';
    statsContainer.style.display = 'none';
    progressContainer.style.display = 'none';
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    currentData = null;
    articleResults = [];

    // Réinitialiser les boutons
    analyzeBtn.style.display = 'none';
    resetBtn.style.display = 'none';
    stopBtn.style.display = 'none';

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

    // Distribution par source
    const sourceDiv = document.getElementById('sourceDistribution');
    sourceDiv.innerHTML = '';

    // Créer un tableau d'objets pour trier
    const sourceItems = USERNEEDS.map(userneed => {
        const count = sourceDistribution[userneed];
        const percent = totalArticles > 0 ? ((count / totalArticles) * 100).toFixed(0) : 0;
        return { userneed, count, percent };
    }).filter(item => item.count > 0)  // Ne garder que les userneeds avec count > 0
      .sort((a, b) => b.count - a.count);  // Trier du plus grand au plus petit

    // Afficher les items triés
    sourceItems.forEach(({ userneed, count, percent }) => {
        const item = document.createElement('div');
        item.className = 'distribution-item';
        item.innerHTML = `
            <span>${getShortName(userneed)}</span>
            <div class="distribution-bar">
                <div class="distribution-fill" style="width: ${percent}%"></div>
            </div>
            <span>${percent}%</span>
        `;
        sourceDiv.appendChild(item);
    });

    // Distribution par prédiction
    const predDiv = document.getElementById('predictionDistribution');
    predDiv.innerHTML = '';

    // Créer un tableau d'objets pour trier
    const predItems = USERNEEDS.map(userneed => {
        const count = predictionDistribution[userneed];
        const percent = totalArticles > 0 ? ((count / totalArticles) * 100).toFixed(0) : 0;
        return { userneed, count, percent };
    }).filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);

    // Afficher les items triés
    predItems.forEach(({ userneed, count, percent }) => {
        const item = document.createElement('div');
        item.className = 'distribution-item';
        item.innerHTML = `
            <span>${getShortName(userneed)}</span>
            <div class="distribution-bar">
                <div class="distribution-fill" style="width: ${percent}%"></div>
            </div>
            <span>${percent}%</span>
        `;
        predDiv.appendChild(item);
    });

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

async function analyzeWithAI() {
    const apiKey = localStorage.getItem('anthropic_api_key');

    if (!apiKey) {
        showError('Veuillez configurer votre clé API Anthropic dans le fichier config.json ou via localStorage');
        return;
    }

    if (!currentData || currentData.length < 2) {
        showError('Aucune donnée à analyser');
        return;
    }

    // Réinitialiser le flag d'arrêt et les résultats
    stopAnalysis = false;
    articleResults = [];

    // Gérer les boutons
    analyzeBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';
    progressContainer.style.display = 'block';
    statsContainer.style.display = 'block';
    clearLog();
    hideError();
    initConfusionMatrix();

    addLog('🚀 Démarrage de l\'analyse IA...', 'info');
    addLog(`📊 Nombre total d'articles à analyser : ${currentData.length - 1}`, 'info');

    const headers = currentData[0];
    const rows = currentData.slice(1);

    // Identifier les indices des colonnes
    const titreIndex = 3;  // Colonne D
    const chapoIndex = 4;  // Colonne E
    const corpsIndex = 5;  // Colonne F
    const userIdIndex = 0; // Colonne A

    try {
        // Analyser chaque ligne
        for (let i = 0; i < rows.length; i++) {
            // Vérifier si l'utilisateur a demandé l'arrêt
            if (stopAnalysis) {
                addLog(`<br/>🛑 <strong>ANALYSE ARRÊTÉE</strong> par l'utilisateur à l'article ${i}/${rows.length}`, 'error');
                break;
            }

            const row = rows[i];
            const titre = row[titreIndex] || '';
            const chapo = row[chapoIndex] || '';
            const corps = row[corpsIndex] || '';
            const expectedUserneed = row[userIdIndex] || '';

            // Mettre à jour la progression
            const progress = ((i + 1) / rows.length) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Analyse en cours... ${i + 1}/${rows.length} articles`;

            addLog(`<br/>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info');
            addLog(`📰 Article ${i + 1}/${rows.length}`, 'info');
            addLog(`<span class="log-title">Titre:</span> ${titre.substring(0, 100)}${titre.length > 100 ? '...' : ''}`, 'info');
            addLog(`🎯 User need attendu: <span class="log-result">${expectedUserneed}</span>`, 'info');
            addLog(`⏳ Envoi à l'API Claude...`, 'info');

            // Appeler l'API pour analyser cet article
            const { userneed, justification, hasJustification } = await analyzeArticle(apiKey, titre, chapo, corps);

            addLog(`✅ Réponse reçue: <span class="log-result">${userneed}</span>`, 'success');

            // Vérifier la concordance avec normalisation
            const isMatch = normalizeUserneed(userneed) === normalizeUserneed(expectedUserneed);
            if (isMatch) {
                addLog(`✓ <span style="color: #10b981;">Concordant</span>`, 'success');
            } else {
                addLog(`✗ <span style="color: #ef4444;">Différent</span> (attendu: ${expectedUserneed})`, 'error');
            }

            // Créer une nouvelle ligne dans le tableau avec les résultats
            const tr = document.createElement('tr');

            // Numéro
            const numeroTd = document.createElement('td');
            numeroTd.textContent = i + 1;
            tr.appendChild(numeroTd);

            // Titre de l'article (colonne D - index 3) avec lien vers l'URL
            const titreTd = document.createElement('td');
            const urlValue = row[2]; // URL (colonne C)
            const titreValue = titre; // Le titre est déjà extrait plus haut

            // Container pour titre + bouton lien
            const titreContainer = document.createElement('div');
            titreContainer.style.display = 'flex';
            titreContainer.style.alignItems = 'center';
            titreContainer.style.gap = '8px';

            // Texte du titre (tronqué si trop long)
            const titreText = document.createElement('span');
            titreText.textContent = titreValue || 'Sans titre';
            titreText.style.flex = '1';
            titreText.style.overflow = 'hidden';
            titreText.style.textOverflow = 'ellipsis';
            titreText.style.whiteSpace = 'nowrap';
            titreContainer.appendChild(titreText);

            // Bouton lien pour ouvrir l'URL
            if (urlValue) {
                const linkBtn = document.createElement('a');
                linkBtn.href = urlValue;
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

            // User ID attribué (colonne A - index 0)
            const userIdTd = document.createElement('td');
            userIdTd.textContent = expectedUserneed;
            tr.appendChild(userIdTd);

            // Prédiction IA avec coloration et bouton de justification
            const aiTd = document.createElement('td');
            aiTd.classList.add('ai-prediction');

            // Container pour le texte + boutons
            const predContainer = document.createElement('div');
            predContainer.className = 'prediction-container';
            predContainer.style.display = 'flex';
            predContainer.style.alignItems = 'center';
            predContainer.style.gap = '8px';

            // Texte de la prédiction
            const predText = document.createElement('span');
            predText.textContent = userneed;
            predText.style.color = isMatch ? '#10b981' : '#ef4444';
            predText.style.fontWeight = '600';
            predContainer.appendChild(predText);

            aiTd.appendChild(predContainer);
            tr.appendChild(aiTd);

            // NOUVELLE COLONNE: Justification IA
            const justificationTd = document.createElement('td');
            justificationTd.classList.add('justification-cell');

            // Afficher la justification si elle existe OU si la prédiction est différente
            if (justification || !isMatch) {
                // Container pour justification + bouton
                const justifContainer = document.createElement('div');
                justifContainer.className = 'justification-container';
                justifContainer.style.display = 'flex';
                justifContainer.style.alignItems = 'flex-start';
                justifContainer.style.gap = '8px';

                if (justification) {
                    // Texte de la justification (tronqué à 150 caractères)
                    const justifText = document.createElement('span');
                    justifText.className = 'justification-text';
                    const truncatedJustif = justification.length > 150
                        ? justification.substring(0, 150) + '...'
                        : justification;
                    justifText.textContent = truncatedJustif;
                    justifText.style.flex = '1';
                    justifText.style.fontSize = '0.9em';
                    justifText.style.color = '#e5e7eb';
                    justifText.style.lineHeight = '1.4';
                    justifContainer.appendChild(justifText);

                    // Bouton pour voir la justification complète
                    const expandBtn = document.createElement('button');
                    expandBtn.className = 'reasoning-btn';
                    expandBtn.innerHTML = '💬';
                    expandBtn.title = 'Voir la justification complète';
                    expandBtn.setAttribute('aria-label', 'Voir la justification complète');
                    expandBtn.onclick = () => showReasoningModal(i);
                    justifContainer.appendChild(expandBtn);
                } else {
                    // Prédiction différente mais pas de justification extractée
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
                // Prédiction concordante et pas de justification nécessaire
                justificationTd.textContent = '—';
                justificationTd.style.color = '#9ca3af';
                justificationTd.style.textAlign = 'center';
                justificationTd.style.fontStyle = 'italic';
            }

            tr.appendChild(justificationTd);

            // Stocker le résultat complet
            articleResults.push({
                index: i,
                numero: i + 1,
                url: urlValue,
                titre: titre,
                expectedUserneed: expectedUserneed,
                predictedUserneed: userneed,
                justification: justification,
                isMatch: isMatch,
                hasJustification: hasJustification
            });

            // Ajouter la ligne au tableau
            tableBody.appendChild(tr);

            // Mettre à jour la matrice de confusion
            updateConfusionMatrix(expectedUserneed, userneed);

            addLog(`💾 Résultat enregistré dans le tableau`, 'success');

            // Délai de 6 secondes pour respecter les limites de rate (50k tokens/min)
            if (i < rows.length - 1 && !stopAnalysis) {
                addLog(`⏱️ Attente de 6 secondes avant le prochain article...`, 'info');
                await new Promise(resolve => setTimeout(resolve, 6000));
            }
        }

        if (!stopAnalysis) {
            progressText.textContent = 'Analyse terminée !';
            progressFill.style.width = '100%';
            addLog(`<br/>🎉 <strong>ANALYSE TERMINÉE !</strong> Tous les articles ont été traités avec succès.`, 'success');
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
    }
}

async function analyzeArticle(apiKey, titre, chapo, corps) {
    // Utiliser le prompt du gestionnaire au lieu du hardcodé
    const prompt = promptManager.buildPromptText(titre, chapo, corps);

    try {
        addLog(`🔑 Vérification de la clé API (longueur: ${apiKey.length} caractères)`, 'info');
        addLog(`🌐 Connexion au serveur proxy...`, 'info');

        const response = await fetch('/api/claude', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                apiKey: apiKey,
                prompt: prompt
            })
        });

        addLog(`📡 Réponse HTTP reçue (status: ${response.status})`, 'info');

        if (!response.ok) {
            const errorData = await response.json();
            addLog(`⚠️ Détails de l'erreur: ${JSON.stringify(errorData)}`, 'error');
            throw new Error(errorData.error?.message || `Erreur HTTP ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.content[0].text.trim();

        // DEBUG: Log la réponse brute de Claude
        console.log('🔍 Réponse brute de Claude:', responseText);

        const parsed = parseAIResponse(responseText);

        // DEBUG: Log le résultat du parsing
        console.log('📊 Résultat du parsing:', parsed);

        return parsed;
    } catch (error) {
        addLog(`❌ Exception capturée: ${error.name} - ${error.message}`, 'error');
        if (error.message.includes('Failed to fetch')) {
            addLog(`💡 Conseil: Vérifiez votre connexion Internet`, 'error');
            addLog(`💡 Conseil: Vérifiez que votre clé API est valide`, 'error');
            addLog(`💡 Conseil: Vérifiez votre firewall/antivirus`, 'error');
        }
        throw error;
    }
}

function exportToExcel() {
    // Créer un nouveau workbook
    const wb = XLSX.utils.book_new();

    // Calculer les statistiques globales
    let totalArticles = 0;
    let concordants = 0;
    USERNEEDS.forEach(source => {
        totalArticles += sourceDistribution[source];
        concordants += confusionMatrix[source][source];
    });
    const reclassified = totalArticles - concordants;
    const concordantPercent = totalArticles > 0 ? ((concordants / totalArticles) * 100).toFixed(1) : 0;
    const reclassifiedPercent = totalArticles > 0 ? ((reclassified / totalArticles) * 100).toFixed(1) : 0;

    // === FEUILLE 1 : STATISTIQUES GLOBALES ===
    const statsData = [
        ['STATISTIQUES GLOBALES - ANALYSE USERNEEDS FRANCEINFO'],
        [''],
        ['Résumé'],
        ['Total d\'articles analysés', totalArticles],
        ['Articles concordants', `${concordants} (${concordantPercent}%)`],
        ['Articles reclassifiés', `${reclassified} (${reclassifiedPercent}%)`],
        [''],
        ['Distribution par catégorie source'],
        ['Userneed', 'Nombre', 'Pourcentage']
    ];

    USERNEEDS.forEach(userneed => {
        const count = sourceDistribution[userneed];
        if (count > 0) {
            const percent = totalArticles > 0 ? ((count / totalArticles) * 100).toFixed(1) : 0;
            statsData.push([getShortName(userneed), count, `${percent}%`]);
        }
    });

    statsData.push(['']);
    statsData.push(['Distribution par prédiction IA']);
    statsData.push(['Userneed', 'Nombre', 'Pourcentage']);

    USERNEEDS.forEach(userneed => {
        const count = predictionDistribution[userneed];
        if (count > 0) {
            const percent = totalArticles > 0 ? ((count / totalArticles) * 100).toFixed(1) : 0;
            statsData.push([getShortName(userneed), count, `${percent}%`]);
        }
    });

    const wsStats = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, wsStats, 'Statistiques');

    // === FEUILLE 2 : MATRICE DE CONFUSION ===
    const matrixData = [
        ['MATRICE DE CONFUSION'],
        ['']
    ];

    // En-têtes de colonnes
    const headerRow = ['Catégorie Source / Prédiction IA'];
    USERNEEDS.forEach(un => headerRow.push(getShortName(un)));
    matrixData.push(headerRow);

    // Lignes de la matrice
    USERNEEDS.forEach((source, i) => {
        const row = [getShortName(source)];
        USERNEEDS.forEach((pred, j) => {
            row.push(confusionMatrix[source][pred]);
        });
        matrixData.push(row);
    });

    const wsMatrix = XLSX.utils.aoa_to_sheet(matrixData);
    XLSX.utils.book_append_sheet(wb, wsMatrix, 'Matrice de Confusion');

    // === FEUILLE 3 : TOP RECLASSIFICATIONS ===
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

    const reclassData = [
        ['TOP RECLASSIFICATIONS'],
        [''],
        ['Rang', 'Catégorie Source', 'Prédiction IA', 'Nombre']
    ];

    reclassifications.slice(0, 20).forEach((item, index) => {
        reclassData.push([
            index + 1,
            getShortName(item.source),
            getShortName(item.prediction),
            item.count
        ]);
    });

    const wsReclass = XLSX.utils.aoa_to_sheet(reclassData);
    XLSX.utils.book_append_sheet(wb, wsReclass, 'Top Reclassifications');

    // === FEUILLE 4 : CONCORDANCE PAR CATÉGORIE ===
    const concordanceData = [
        ['CONCORDANCE PAR CATÉGORIE'],
        [''],
        ['Catégorie', 'Total Articles', 'Concordants', 'Taux de Concordance']
    ];

    USERNEEDS.forEach(userneed => {
        const total = sourceDistribution[userneed];
        if (total > 0) {
            const correct = confusionMatrix[userneed][userneed];
            const rate = ((correct / total) * 100).toFixed(1);
            concordanceData.push([
                getShortName(userneed),
                total,
                correct,
                `${rate}%`
            ]);
        }
    });

    const wsConcordance = XLSX.utils.aoa_to_sheet(concordanceData);
    XLSX.utils.book_append_sheet(wb, wsConcordance, 'Concordance par Catégorie');

    // Générer le fichier et le télécharger
    const date = new Date().toISOString().split('T')[0];
    const filename = `Analyse_Userneeds_${date}.xlsx`;
    XLSX.writeFile(wb, filename);

    console.log(`✅ Fichier Excel exporté : ${filename}`);
}

// ====================================
// PROMPT MANAGEMENT UI FUNCTIONS
// ====================================

let currentEditingPromptId = null;

function initializePromptUI() {
    // Références DOM pour la gestion des prompts
    const settingsBtn = document.getElementById('settingsBtn');
    const promptPanel = document.getElementById('promptPanel');
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

    // Event listeners
    settingsBtn.addEventListener('click', openPromptPanel);
    closePanelBtn.addEventListener('click', closePromptPanel);
    promptPanelBackdrop.addEventListener('click', closePromptPanel);
    createPromptBtn.addEventListener('click', () => openPromptModal());
    importPromptsBtn.addEventListener('click', importPrompts);
    exportPromptsBtn.addEventListener('click', exportPrompts);
    closeModalBtn.addEventListener('click', closePromptModal);
    cancelModalBtn.addEventListener('click', closePromptModal);
    savePromptBtn.addEventListener('click', savePrompt);
    importFileInput.addEventListener('change', handleImportFile);

    // Charger la liste des prompts au démarrage
    refreshPromptList();
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
        document.getElementById('promptRole').value = prompt.content.role || '';
        document.getElementById('promptVision').value = prompt.content.vision || '';
        document.getElementById('promptDefinitions').value = prompt.content.definitions || '';
        document.getElementById('promptTask').value = prompt.content.task || '';

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
        document.getElementById('promptRole').value = '';
        document.getElementById('promptVision').value = '';
        document.getElementById('promptDefinitions').value = '';
        document.getElementById('promptTask').value = '';

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
    const role = document.getElementById('promptRole').value.trim();
    const vision = document.getElementById('promptVision').value.trim();
    const definitions = document.getElementById('promptDefinitions').value.trim();
    const task = document.getElementById('promptTask').value.trim();

    // Validation
    if (!name) {
        alert('Le nom du prompt est obligatoire');
        return;
    }

    if (!role || !definitions || !task) {
        alert('Les sections #ROLE, #DÉFINITIONS et #TÂCHE sont obligatoires');
        return;
    }

    const promptData = {
        name,
        description,
        content: { role, vision, definitions, task },
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
