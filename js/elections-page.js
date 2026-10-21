// ============================================
// PAGE PRÉSIDENTIELLE 2027
// Articles tagués « Présidentielle 2027 » / « Elections en France »,
// classés par Claude Sonnet 5.5 (prompt V7) puis validés par un humain.
//
// Stockage (schéma existant, pas de table dédiée) :
//   - chaque lancement = une ligne test_runs (llm_model = claude-sonnet-5-5)
//   - chaque article classé = une ligne ai_analyses
//   - la validation humaine = human_classifications (classificationManager)
// L'appel au modèle passe par /api/classify-anthropic : la clé API reste
// côté serveur (ANTHROPIC_API_KEY).
// ============================================

const ELECTION_TAGS = ['Présidentielle 2027'];
const ELECTION_MODEL = 'claude-sonnet-5-5';
const ELECTION_PROMPT_ID = 'prompt_userneeds_v7';
const ELECTION_RUN_PREFIX = 'Présidentielle 2027';
const ELECTION_CONCURRENCY = 4;
// Tarifs Sonnet 5.5 ($ / 1M tokens) — estimation affichée, pas la facture.
const ELECTION_PRICING = { input: 2.0, output: 10.0, cacheRead: 0.2, cacheWrite: 2.5 };

const electionState = {
    articles: [],          // articles enrichis : { ..., sonnet, human }
    sonnetRunIds: new Set(),
    runs: {},              // id → { name, statistics, analyzed_articles, created_at } (export)
    statusFilter: 'todo',  // 'all' | 'todo' | 'classified'
    search: '',
    effort: 'medium',      // fixe (plus de choix dans l'interface)
    expandedId: null,
    loading: false,
    loadError: null,
    // Lot en cours
    running: false,
    paused: false,
    stopRequested: false,
    run: null,
    progress: { done: 0, total: 0, errors: 0, matches: 0, compared: 0 },
    errorMessages: [],     // affichés sous la barre de progression (les 5 derniers)
    usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
    promptContent: null,
};

// ── Utilitaires ──────────────────────────────────────────────

function elEscape(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function elConfidenceLevel(c) {
    if (c >= 0.9) return 'HAUTE';
    if (c >= 0.7) return 'MOYENNE';
    return 'BASSE';
}

function elCost(u) {
    const p = ELECTION_PRICING;
    return (u.input_tokens * p.input + u.output_tokens * p.output
        + u.cache_read_input_tokens * p.cacheRead + u.cache_creation_input_tokens * p.cacheWrite) / 1e6;
}

function elUserneedBadge(un, extra = '') {
    if (!un) return '';
    const color = (typeof USERNEED_COLORS !== 'undefined' && USERNEED_COLORS[un]) || '#6366f1';
    return `<span class="el-badge" style="background:${color}">${elEscape(un)}${extra}</span>`;
}

function elFormatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ── Chargement ───────────────────────────────────────────────

async function loadElectionPrompt() {
    if (electionState.promptContent) return electionState.promptContent;
    const { data, error } = await supabaseClient
        .from('prompts').select('content').eq('id', ELECTION_PROMPT_ID).single();
    if (error || !data) throw new Error(`Prompt ${ELECTION_PROMPT_ID} introuvable dans Supabase`);
    electionState.promptContent = data.content;
    return data.content;
}

async function loadElectionArticles() {
    if (!isSupabaseAvailable()) {
        document.getElementById('electionsList').innerHTML =
            '<p class="el-empty">Supabase indisponible.</p>';
        return;
    }
    electionState.loading = true;
    renderElectionList();

    const { data: runs, error: runErr } = await supabaseClient
        .from('test_runs').select('id, name, statistics, analyzed_articles, created_at')
        .eq('llm_model', ELECTION_MODEL)
        .like('name', `${ELECTION_RUN_PREFIX}%`);
    if (runErr) console.error('Erreur lecture runs Sonnet:', runErr);
    electionState.sonnetRunIds = new Set((runs || []).map(r => r.id));
    electionState.runs = Object.fromEntries((runs || []).map(r => [r.id, r]));

    // Le rôle anon a un statement_timeout de 3 s : pas de `corps` dans la liste
    // (chargé à la demande par fetchElectionCorps) et des pages courtes.
    const PAGE = 200;
    const fetchPage = from => supabaseClient
        .from('articles')
        .select(`
            id, external_id, titre, chapo, url, date_publication, tags, word_count,
            human_classifications (userneed, classified_by, classified_at),
            ai_analyses (test_run_id, predicted_userneed, justification, predictions, icp, confidence_level, analyzed_at)
        `)
        .overlaps('tags', ELECTION_TAGS)
        .order('date_publication', { ascending: false })
        .range(from, from + PAGE - 1);

    let from = 0, all = [], loadError = null;
    while (true) {
        let { data, error } = await fetchPage(from);
        if (error) {
            console.warn('Chargement articles élections, nouvel essai :', error.message);
            ({ data, error } = await fetchPage(from));
        }
        if (error) {
            console.error('Erreur chargement articles élections:', error);
            loadError = error.message;
            break;
        }
        all = all.concat(data || []);
        if (!data || data.length < PAGE) break;
        from += PAGE;
    }

    // En cas d'échec, on ne remplace pas une liste partielle par une liste vide trompeuse.
    electionState.loadError = loadError;
    electionState.articles = loadError ? [] : all.map(enrichElectionArticle);
    electionState.loading = false;
    renderElectionToolbar();
    renderElectionList();
}

function enrichElectionArticle(a) {
    const sonnetRows = (a.ai_analyses || [])
        .filter(r => electionState.sonnetRunIds.has(r.test_run_id))
        .sort((x, y) => (y.analyzed_at || '').localeCompare(x.analyzed_at || ''));
    const s = sonnetRows[0];
    const pred = s?.predictions?.[0] || {};
    const human = (a.human_classifications || [])
        .sort((x, y) => (y.classified_at || '').localeCompare(x.classified_at || ''))[0];
    return {
        ...a,
        ai_analyses: undefined,
        sonnet: s ? {
            userneed: s.predicted_userneed,
            justification: s.justification,
            cheminement: pred.cheminement || '',
            confidence: pred.confidence ?? (s.icp != null ? s.icp / 100 : null),
            confidenceLevel: s.confidence_level,
            analyzedAt: s.analyzed_at,
            runId: s.test_run_id,
            usage: pred.usage || null,
            model: pred.model || null,
            effort: pred.effort || null,
            count: sonnetRows.length,
        } : null,
        human: human ? human.userneed : null,
        humanBy: human ? human.classified_by : null,
        humanAt: human ? human.classified_at : null,
    };
}

// ── Filtres ──────────────────────────────────────────────────

function filteredElectionArticles() {
    const q = electionState.search.trim().toLowerCase();
    return electionState.articles.filter(a => {
        if (electionState.statusFilter === 'todo' && a.sonnet) return false;
        if (electionState.statusFilter === 'classified' && !a.sonnet) return false;
        if (q && !(a.titre || '').toLowerCase().includes(q)) return false;
        return true;
    });
}

function setElectionFilter(kind, value) {
    electionState[kind] = value;
    renderElectionToolbar();
    renderElectionList();
}

// ── Rendu ────────────────────────────────────────────────────

function renderElectionToolbar() {
    const box = document.getElementById('electionsToolbar');
    if (!box) return;
    const arts = electionState.articles;
    const nTodo = arts.filter(a => !a.sonnet).length;
    const nClassified = arts.filter(a => a.sonnet).length;
    const targets = filteredElectionArticles().filter(a => !a.sonnet).length;

    const chip = (kind, value, label) =>
        `<button class="article-filter-btn ${electionState[kind] === value ? 'active' : ''}"
                 onclick="setElectionFilter('${kind}', ${JSON.stringify(value).replace(/"/g, '&quot;')})">${label}</button>`;

    box.innerHTML = `
        <div class="el-toolbar-row">
            <span class="filter-label">Statut :</span>
            ${chip('statusFilter', 'all', 'Tous')}
            ${chip('statusFilter', 'todo', `À classer (${nTodo})`)}
            ${chip('statusFilter', 'classified', `Classifiés (${nClassified})`)}
            <div class="articles-search-bar el-search">
                <span class="articles-search-icon">🔍</span>
                <input type="text" class="articles-search-input" placeholder="Filtrer par titre…"
                       value="${elEscape(electionState.search)}"
                       oninput="electionState.search = this.value; renderElectionList()">
            </div>
        </div>
        <div class="el-toolbar-row el-actions">
            ${electionState.running ? `
                <button class="nav-btn ${electionState.paused ? 'nav-btn-success' : 'nav-btn-warning'}"
                        onclick="toggleElectionPause()">${electionState.paused ? '▶ Reprendre' : '⏸ Pause'}</button>
                <button class="nav-btn nav-btn-danger" onclick="stopElectionBatch()">⏹ Stop</button>
            ` : `
                <button class="nav-btn nav-btn-primary" ${targets ? '' : 'disabled'}
                        onclick="startElectionBatch()">🤖 Classer avec Sonnet 5.5 (${targets})</button>
            `}
            <button class="articles-refresh-btn" ${electionState.running ? 'disabled' : ''}
                    onclick="loadElectionArticles()">↻ Actualiser</button>
            <button class="articles-export-btn" id="electionExportBtn" ${filteredElectionArticles().length ? '' : 'disabled'}
                    title="Exporte les articles de la vue filtrée : métadonnées, texte, verdict Sonnet, validation humaine, tokens et coût"
                    onclick="exportElectionCsv()">⬇ Export CSV (${filteredElectionArticles().length})</button>
        </div>
    `;
}

function renderElectionProgress() {
    const box = document.getElementById('electionsProgress');
    if (!box) return;
    const p = electionState.progress;
    const errors = electionState.errorMessages.slice(-5).reverse()
        .map(m => `<div class="el-error">${elEscape(m)}</div>`).join('');
    if (!p.total) { box.innerHTML = errors; return; }
    const pct = Math.round((p.done / p.total) * 100);
    const agree = p.compared ? ` · accord humain ${p.matches}/${p.compared}` : '';
    const status = electionState.running
        ? (electionState.paused ? '⏸ En pause' : '⏳ En cours')
        : '✅ Terminé';
    box.innerHTML = `
        <div class="el-progress">
            <div class="el-progress-bar"><div style="width:${pct}%"></div></div>
            <div class="el-progress-text">
                ${status} — ${p.done}/${p.total} articles${p.errors ? ` · ${p.errors} erreur(s)` : ''}${agree}
                · coût estimé ≈ ${elCost(electionState.usage).toFixed(2)} $
            </div>
        </div>${errors}`;
}

function renderElectionList() {
    const box = document.getElementById('electionsList');
    if (!box) return;
    if (electionState.loading) {
        box.innerHTML = '<p class="el-empty">Chargement des articles…</p>';
        return;
    }
    if (electionState.loadError) {
        box.innerHTML = `<div class="el-error">Chargement impossible : ${elEscape(electionState.loadError)}</div>
            <p class="el-empty"><button class="articles-refresh-btn" onclick="loadElectionArticles()">↻ Réessayer</button></p>`;
        return;
    }
    const list = filteredElectionArticles();
    const exportBtn = document.getElementById('electionExportBtn');
    if (exportBtn) {
        exportBtn.textContent = `⬇ Export CSV (${list.length})`;
        exportBtn.disabled = !list.length;
    }
    if (!list.length) {
        box.innerHTML = '<p class="el-empty">Aucun article pour ces filtres.</p>';
        return;
    }
    box.innerHTML = list.map(renderElectionRow).join('');
}

function renderElectionRow(a) {
    const s = a.sonnet;
    const conf = s && s.confidence != null ? ` ${Math.round(s.confidence * 100)} %` : '';
    const disagree = s && a.human && a.human !== s.userneed;
    const tags = (a.tags || []).filter(t => ELECTION_TAGS.includes(t))
        .map(t => `<span class="el-tag">${elEscape(t)}</span>`).join('');
    const expanded = electionState.expandedId === a.id;

    return `
        <div class="el-row ${expanded ? 'expanded' : ''} ${disagree ? 'disagree' : ''}" id="el-row-${a.id}">
            <div class="el-row-head" onclick="toggleElectionRow('${a.id}')">
                <span class="el-date">${elFormatDate(a.date_publication)}</span>
                <span class="el-title">${elEscape(a.titre)}</span>
                <span class="el-tags">${tags}</span>
                <span class="el-verdicts">
                    ${s ? elUserneedBadge(s.userneed, conf) : '<span class="el-pending">non classé</span>'}
                    ${a.human ? `<span class="el-human" title="Validation humaine">👤 ${elEscape(a.human)}</span>` : ''}
                </span>
            </div>
            ${expanded ? renderElectionDetail(a) : ''}
        </div>`;
}

function renderElectionDetail(a) {
    const s = a.sonnet;
    const current = a.human || s?.userneed;
    const buttons = USERNEEDS.map(un => `
        <button class="el-un-btn ${current === un ? 'selected' : ''}"
                style="--un-color:${USERNEED_COLORS[un] || '#6366f1'}"
                onclick="validateElectionArticle('${a.id}', '${un}')">${un}</button>`).join('');

    return `
        <div class="el-detail">
            ${a.chapo ? `<p class="el-chapo">${elEscape(a.chapo)}</p>` : ''}
            <p class="el-links">
                <a href="${elEscape(a.url)}" target="_blank" rel="noopener">Ouvrir l'article ↗</a>
                · ${a.word_count || 0} mots
            </p>
            ${s ? `
                <div class="el-sonnet">
                    <div class="el-sonnet-head">🤖 Sonnet 5.5 : ${elUserneedBadge(s.userneed)}
                        ${s.confidence != null ? `confiance ${s.confidence.toFixed(2)}` : ''}</div>
                    <p><strong>Justification :</strong> ${elEscape(s.justification)}</p>
                    ${s.cheminement ? `<p class="el-path"><strong>Cheminement :</strong> ${elEscape(s.cheminement)}</p>` : ''}
                </div>` : '<p class="el-pending">Pas encore classé par Sonnet.</p>'}
            <div class="el-validate">
                <span class="filter-label">Validation humaine :</span>
                <div class="el-un-grid">${buttons}</div>
            </div>
            <div class="el-detail-actions">
                <button class="articles-refresh-btn" ${electionState.running ? 'disabled' : ''}
                        onclick="classifyOneElectionArticle('${a.id}')">🤖 ${s ? 'Relancer' : 'Classer'} avec Sonnet</button>
            </div>
        </div>`;
}

function toggleElectionRow(id) {
    electionState.expandedId = electionState.expandedId === id ? null : id;
    renderElectionList();
}

function refreshElectionRow(id) {
    const a = electionState.articles.find(x => x.id === id);
    const row = document.getElementById(`el-row-${id}`);
    if (!a || !row) return;
    // Un article qui ne passe plus le filtre courant disparaît au prochain rendu complet,
    // pas en plein lot : on se contente de mettre la ligne à jour.
    row.outerHTML = renderElectionRow(a);
}

// ── Validation humaine ───────────────────────────────────────

async function validateElectionArticle(id, userneed) {
    const a = electionState.articles.find(x => x.id === id);
    if (!a) return;
    try {
        await classificationManager.classify(id, userneed);
        a.human = userneed;
        refreshElectionRow(id);
        renderElectionToolbar();
    } catch (e) {
        alertElection(`Erreur d'enregistrement : ${e.message}`);
    }
}

function alertElection(msg) {
    // Conservé dans l'état : un innerHTML direct serait effacé au rendu suivant de la progression.
    electionState.errorMessages.push(msg);
    renderElectionProgress();
    console.error('[Présidentielle 2027]', msg);
}

// ── Classification Sonnet ────────────────────────────────────

async function fetchElectionCorps(article) {
    if (article.corps !== undefined) return article.corps;
    const { data, error } = await supabaseClient
        .from('articles').select('corps').eq('id', article.id).single();
    if (error) throw new Error(`Lecture du texte impossible : ${error.message}`);
    // Pas de mise en cache sur l'article : la liste reste légère en mémoire.
    return data.corps || '';
}

async function callSonnet(article) {
    const system = await loadElectionPrompt();
    const corps = await fetchElectionCorps(article);
    const res = await fetch('/api/classify-anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system,
            titre: article.titre,
            chapo: article.chapo,
            corps,
            effort: electionState.effort,
        }),
    });
    let data;
    try { data = await res.json(); } catch { throw new Error(`Réponse serveur illisible (HTTP ${res.status})`); }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

async function createElectionRun(label, total) {
    const prompt = await loadElectionPrompt();
    const date = new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
    const run = await testRunManager.createRun(
        `${ELECTION_RUN_PREFIX} · Sonnet 5.5 · ${label} · ${date}`,
        ELECTION_MODEL, ELECTION_PROMPT_ID, prompt, total);
    electionState.sonnetRunIds.add(run.id);
    electionState.runs[run.id] = run;
    return run;
}

async function classifyElectionArticle(article, run, index) {
    const data = await callSonnet(article);
    const r = data.result;
    for (const k of Object.keys(electionState.usage)) electionState.usage[k] += data.usage?.[k] || 0;

    const isMatch = article.human ? article.human === r.user_need : null;
    await testRunManager.addAnalysis(run.id, article.id, {
        predictedUserneed: r.user_need,
        predictions: [{
            rank: 1,
            userneed: r.user_need,
            score: Math.round(r.confidence * 100),
            justification: r.justification,
            cheminement: r.cheminement,
            confidence: r.confidence,
            usage: data.usage,
            model: data.model,
            effort: electionState.effort,
            request_id: data.request_id,
        }],
        justification: r.justification,
        isMatch,
        delta: null,
        icp: Math.round(r.confidence * 1000) / 10,
        confidenceLevel: elConfidenceLevel(r.confidence),
        rawResponse: data.raw,
        articleIndex: index,
    });

    article.sonnet = {
        userneed: r.user_need,
        justification: r.justification,
        cheminement: r.cheminement,
        confidence: r.confidence,
        confidenceLevel: elConfidenceLevel(r.confidence),
        analyzedAt: new Date().toISOString(),
        runId: run.id,
        usage: data.usage,
        model: data.model,
        effort: electionState.effort,
        count: (article.sonnet?.count || 0) + 1,
    };
    return isMatch;
}

function electionRunStats(run) {
    const p = electionState.progress;
    return {
        analyzedArticles: p.done - p.errors,
        concordantCount: p.matches,
        concordantPercent: p.compared ? Math.round((p.matches / p.compared) * 10000) / 100 : 0,
        confusionMatrix: {},
        statistics: { usage: electionState.usage, estimated_cost_usd: elCost(electionState.usage), effort: electionState.effort },
    };
}

async function startElectionBatch() {
    if (electionState.running) return;  // garde de réentrance (double clic)
    const targets = filteredElectionArticles().filter(a => !a.sonnet);
    if (!targets.length) return;

    electionState.running = true;
    electionState.paused = false;
    electionState.stopRequested = false;
    electionState.progress = { done: 0, total: targets.length, errors: 0, matches: 0, compared: 0 };
    electionState.errorMessages = [];
    for (const k of Object.keys(electionState.usage)) electionState.usage[k] = 0;
    renderElectionToolbar();
    renderElectionProgress();

    let run;
    try {
        run = await createElectionRun('lot', targets.length);
    } catch (e) {
        electionState.running = false;
        renderElectionToolbar();
        alertElection(`Impossible de créer le test run : ${e.message}`);
        return;
    }
    electionState.run = run;

    let next = 0;
    const worker = async () => {
        while (!electionState.stopRequested) {
            while (electionState.paused && !electionState.stopRequested) {
                await new Promise(r => setTimeout(r, 300));
            }
            if (electionState.stopRequested) break;
            const i = next++;
            if (i >= targets.length) break;
            const article = targets[i];
            try {
                const isMatch = await classifyElectionArticle(article, run, i);
                if (isMatch !== null) {
                    electionState.progress.compared++;
                    if (isMatch) electionState.progress.matches++;
                }
            } catch (e) {
                electionState.progress.errors++;
                alertElection(`« ${article.titre.slice(0, 60)}… » : ${e.message}`);
                // Clé absente côté serveur : inutile de continuer le lot.
                if (/ANTHROPIC_API_KEY/.test(e.message)) electionState.stopRequested = true;
            }
            electionState.progress.done++;
            refreshElectionRow(article.id);
            renderElectionProgress();
        }
    };
    await Promise.all(Array.from({ length: ELECTION_CONCURRENCY }, worker));

    const stats = electionRunStats(run);
    // Aucun article analysé (clé absente, panne API) : pas de run vide dans l'historique.
    if (stats.analyzedArticles === 0) await discardElectionRun(run.id);
    else if (electionState.stopRequested) await testRunManager.stopRun(run.id, stats);
    else await testRunManager.completeRun(run.id, stats);

    electionState.running = false;
    electionState.paused = false;
    renderElectionToolbar();
    renderElectionProgress();
}

async function discardElectionRun(runId) {
    electionState.sonnetRunIds.delete(runId);
    try { await testRunManager.deleteRun(runId); } catch { /* déjà loggé */ }
}

function toggleElectionPause() {
    electionState.paused = !electionState.paused;
    renderElectionToolbar();
    renderElectionProgress();
}

function stopElectionBatch() {
    electionState.stopRequested = true;
    electionState.paused = false;
    renderElectionToolbar();
}

async function classifyOneElectionArticle(id) {
    if (electionState.running) return;
    const article = electionState.articles.find(x => x.id === id);
    if (!article) return;
    electionState.running = true;
    renderElectionToolbar();
    const row = document.querySelector(`#el-row-${id} .el-detail-actions`);
    if (row) row.innerHTML = '<span class="el-pending">⏳ Sonnet analyse l\'article…</span>';
    let run = null;
    try {
        electionState.errorMessages = [];
        run = await createElectionRun('unitaire', 1);
        electionState.progress = { done: 0, total: 0, errors: 0, matches: 0, compared: 0 };
        const isMatch = await classifyElectionArticle(article, run, 0);
        await testRunManager.completeRun(run.id, {
            analyzedArticles: 1,
            concordantCount: isMatch ? 1 : 0,
            concordantPercent: isMatch ? 100 : 0,
            confusionMatrix: {},
            statistics: { effort: electionState.effort },
        });
    } catch (e) {
        alertElection(`« ${article.titre.slice(0, 60)}… » : ${e.message}`);
        if (run) await discardElectionRun(run.id);
    }
    electionState.running = false;
    renderElectionToolbar();
    refreshElectionRow(id);
}

// ── Export CSV ───────────────────────────────────────────────

// Excel en français : séparateur « ; » et virgule décimale.
function elNum(v, digits = 2) {
    if (v === null || v === undefined || v === '' || Number.isNaN(v)) return '';
    return Number(v).toFixed(digits).replace('.', ',');
}

function elDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Dernière étape atteinte dans le cheminement (« É1:NON → … → É5:EXPLAIN ME » → 5).
function elDecisionStep(cheminement) {
    const steps = [...String(cheminement || '').matchAll(/É\s*(\d)\s*:\s*([^→]+)/g)]
        // « NON », « non atteint », « non atteinte »… : étape franchie sans verdict.
        .filter(m => !/^\s*non\b/i.test(m[2]));
    return steps.length ? Number(steps[steps.length - 1][1]) : '';
}

function elStatus(a) {
    if (a.human) return 'Validé';
    if (a.sonnet) return 'À valider';
    return 'À classer';
}

// Le texte n'est pas dans la liste (timeout anon 3 s) : lecture par lots d'ID.
async function fetchElectionBodies(ids) {
    const bodies = {};
    const CHUNK = 50;
    for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        let { data, error } = await supabaseClient.from('articles').select('id, corps').in('id', chunk);
        if (error) ({ data, error } = await supabaseClient.from('articles').select('id, corps').in('id', chunk));
        if (error) throw new Error(`lecture des textes : ${error.message}`);
        for (const r of data || []) bodies[r.id] = r.corps || '';
        const btn = document.getElementById('electionExportBtn');
        if (btn) btn.textContent = `⏳ Textes ${Math.min(i + CHUNK, ids.length)}/${ids.length}…`;
    }
    return bodies;
}

const ELECTION_EXPORT_COLUMNS = [
    ['ID franceinfo', a => a.external_id],
    ['UUID Supabase', a => a.id],
    ['URL', a => a.url],
    ['Date de publication', a => elDateTime(a.date_publication)],
    ['Titre', a => a.titre],
    ['Chapô', a => a.chapo],
    ['Texte', (a, ctx) => ctx.bodies[a.id] ?? ''],
    ['Nb mots', a => a.word_count ?? ''],
    ['Tag Présidentielle 2027', a => (a.tags || []).includes('Présidentielle 2027') ? 'oui' : 'non'],
    ['Tag Elections en France', a => (a.tags || []).includes('Elections en France') ? 'oui' : 'non'],
    ['Tous les tags franceinfo', a => (a.tags || []).join(' | ')],
    ['Statut', a => elStatus(a)],
    ['Sonnet – user need', a => a.sonnet?.userneed ?? ''],
    ['Sonnet – confiance (0-1)', a => elNum(a.sonnet?.confidence)],
    ['Sonnet – niveau de confiance', a => a.sonnet?.confidenceLevel ?? ''],
    ['Sonnet – étape de décision', a => a.sonnet ? elDecisionStep(a.sonnet.cheminement) : ''],
    ['Sonnet – cheminement', a => a.sonnet?.cheminement ?? ''],
    ['Sonnet – justification', a => a.sonnet?.justification ?? ''],
    ['Sonnet – date d\'analyse', a => elDateTime(a.sonnet?.analyzedAt)],
    ['Sonnet – nb d\'analyses', a => a.sonnet?.count ?? ''],
    ['Modèle', a => a.sonnet ? (a.sonnet.model || ELECTION_MODEL) : ''],
    ['Effort', (a, ctx) => a.sonnet ? (a.sonnet.effort || ctx.run(a)?.statistics?.effort || '') : ''],
    ['Tokens entrée', a => a.sonnet?.usage?.input_tokens ?? ''],
    ['Tokens sortie', a => a.sonnet?.usage?.output_tokens ?? ''],
    ['Tokens cache lus', a => a.sonnet?.usage?.cache_read_input_tokens ?? ''],
    ['Tokens cache écrits', a => a.sonnet?.usage?.cache_creation_input_tokens ?? ''],
    ['Coût article ($)', a => a.sonnet?.usage ? elNum(elCost(a.sonnet.usage), 5) : ''],
    ['Test run', (a, ctx) => ctx.run(a)?.name ?? ''],
    ['Coût moyen / article du run ($)', (a, ctx) => {
        const r = ctx.run(a);
        const cost = r?.statistics?.estimated_cost_usd;
        return cost != null && r.analyzed_articles ? elNum(cost / r.analyzed_articles, 5) : '';
    }],
    ['Humain – user need', a => a.human ?? ''],
    ['Humain – classé par', a => a.humanBy ?? ''],
    ['Humain – date', a => elDateTime(a.humanAt)],
    ['Accord Sonnet / humain', a => (a.sonnet && a.human) ? (a.sonnet.userneed === a.human ? 'oui' : 'non') : ''],
];

async function exportElectionCsv() {
    const list = filteredElectionArticles();
    if (!list.length) return;
    const btn = document.getElementById('electionExportBtn');
    if (btn) btn.disabled = true;
    try {
        const ctx = {
            bodies: await fetchElectionBodies(list.map(a => a.id)),
            run: a => a.sonnet ? electionState.runs[a.sonnet.runId] : null,
        };
        const escapeCsv = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const header = ELECTION_EXPORT_COLUMNS.map(([h]) => h);
        const rows = list.map(a => ELECTION_EXPORT_COLUMNS.map(([, f]) => f(a, ctx)));
        const csv = '\uFEFF' + [header, ...rows].map(r => r.map(escapeCsv).join(';')).join('\r\n');

        const filters = { all: 'tous', todo: 'a-classer', classified: 'classifies' }[electionState.statusFilter];
        const date = new Date().toISOString().slice(0, 10);
        downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
            `presidentielle-2027-sonnet-${filters}-${date}.csv`);
        if (typeof showToast === 'function') showToast(`${list.length} articles exportés (CSV).`, 'success');
    } catch (e) {
        alertElection(`Échec de l'export : ${e.message}`);
    } finally {
        renderElectionToolbar();
    }
}

// ── Panneau ──────────────────────────────────────────────────

function openElectionsPanel() {
    document.getElementById('electionsPanel').classList.add('active');
    if (!electionState.articles.length && !electionState.loading) loadElectionArticles();
    else { renderElectionToolbar(); renderElectionList(); }
}

function closeElectionsPanel() {
    // Un lot en cours continue en arrière-plan : seul le panneau se ferme.
    document.getElementById('electionsPanel').classList.remove('active');
}

function initializeElectionsUI() {
    const btn = document.getElementById('electionsBtn');
    if (!btn) return;
    btn.addEventListener('click', openElectionsPanel);
    document.getElementById('closeElectionsPanelBtn')?.addEventListener('click', closeElectionsPanel);
    document.querySelector('#electionsPanel .tests-panel-backdrop')?.addEventListener('click', closeElectionsPanel);
}
