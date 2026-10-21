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

const ELECTION_TAGS = ['Présidentielle 2027', 'Elections en France'];
const ELECTION_MODEL = 'claude-sonnet-5-5';
const ELECTION_PROMPT_ID = 'prompt_userneeds_v7';
const ELECTION_RUN_PREFIX = 'Présidentielle 2027';
const ELECTION_CONCURRENCY = 4;
// Tarifs Sonnet 5.5 ($ / 1M tokens) — estimation affichée, pas la facture.
const ELECTION_PRICING = { input: 2.0, output: 10.0, cacheRead: 0.2, cacheWrite: 2.5 };

const electionState = {
    articles: [],          // articles enrichis : { ..., sonnet, human }
    sonnetRunIds: new Set(),
    tagFilter: 'all',      // 'all' | un des ELECTION_TAGS
    statusFilter: 'todo',  // 'all' | 'todo' | 'to_validate' | 'validated'
    search: '',
    effort: 'medium',
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
        .from('test_runs').select('id')
        .eq('llm_model', ELECTION_MODEL)
        .like('name', `${ELECTION_RUN_PREFIX}%`);
    if (runErr) console.error('Erreur lecture runs Sonnet:', runErr);
    electionState.sonnetRunIds = new Set((runs || []).map(r => r.id));

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
            analyzedAt: s.analyzed_at,
        } : null,
        human: human ? human.userneed : null,
    };
}

// ── Filtres ──────────────────────────────────────────────────

function filteredElectionArticles() {
    const q = electionState.search.trim().toLowerCase();
    return electionState.articles.filter(a => {
        if (electionState.tagFilter !== 'all' && !(a.tags || []).includes(electionState.tagFilter)) return false;
        if (electionState.statusFilter === 'todo' && a.sonnet) return false;
        if (electionState.statusFilter === 'to_validate' && (!a.sonnet || a.human)) return false;
        if (electionState.statusFilter === 'validated' && !a.human) return false;
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
    const count = tag => arts.filter(a => (a.tags || []).includes(tag)).length;
    const nTodo = arts.filter(a => !a.sonnet).length;
    const nToValidate = arts.filter(a => a.sonnet && !a.human).length;
    const nValidated = arts.filter(a => a.human).length;
    const targets = filteredElectionArticles().filter(a => !a.sonnet).length;

    const chip = (kind, value, label) =>
        `<button class="article-filter-btn ${electionState[kind] === value ? 'active' : ''}"
                 onclick="setElectionFilter('${kind}', ${JSON.stringify(value).replace(/"/g, '&quot;')})">${label}</button>`;

    box.innerHTML = `
        <div class="el-toolbar-row">
            <span class="filter-label">Tag :</span>
            ${chip('tagFilter', 'all', `Tous (${arts.length})`)}
            ${ELECTION_TAGS.map(t => chip('tagFilter', t, `${elEscape(t)} (${count(t)})`)).join('')}
        </div>
        <div class="el-toolbar-row">
            <span class="filter-label">Statut :</span>
            ${chip('statusFilter', 'all', 'Tous')}
            ${chip('statusFilter', 'todo', `À classer (${nTodo})`)}
            ${chip('statusFilter', 'to_validate', `À valider (${nToValidate})`)}
            ${chip('statusFilter', 'validated', `Validés (${nValidated})`)}
            <div class="articles-search-bar el-search">
                <span class="articles-search-icon">🔍</span>
                <input type="text" class="articles-search-input" placeholder="Filtrer par titre…"
                       value="${elEscape(electionState.search)}"
                       oninput="electionState.search = this.value; renderElectionList()">
            </div>
        </div>
        <div class="el-toolbar-row el-actions">
            <label class="filter-label" for="electionEffort">Effort :</label>
            <select id="electionEffort" class="el-select" ${electionState.running ? 'disabled' : ''}
                    onchange="electionState.effort = this.value">
                ${['low', 'medium', 'high'].map(e =>
                    `<option value="${e}" ${electionState.effort === e ? 'selected' : ''}>${e}</option>`).join('')}
            </select>
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
        analyzedAt: new Date().toISOString(),
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
