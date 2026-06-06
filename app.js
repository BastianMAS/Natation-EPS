// ══════════════════════════════════════════════
// NATATION EPS — APP.JS v1.1
// ══════════════════════════════════════════════

// ── DONNÉES ──────────────────────────────────
let classes = {};
let currentClass = null;
let currentStudent = null;
let currentFilter = 'all';
let importBuffer = [];
let saveTimer = null;

// ── CRITÈRES SAVOIR NAGER (référentiel national) ──
const CRITERES = [
  { id: 'c1', label: "Sauter dans l'eau", sub: "Se mettre à l'eau seul en sautant" },
  { id: 'c2', label: "Se déplacer 15m", sub: "Sans reprise d'appui sur le fond ou les bords" },
  { id: 'c3', label: "Surplace 10 secondes", sub: "Maintenir la tête hors de l'eau" },
  { id: 'c4', label: "Se retourner sur le dos", sub: "Depuis la position ventrale" },
  { id: 'c5', label: "Nager sur le dos 10m", sub: "En continuité du retournement" },
  { id: 'c6', label: "Se retourner sur le ventre", sub: "Depuis la position dorsale" },
  { id: 'c7', label: "Sortir de l'eau", sub: "Sans l'aide de l'échelle" },
];

// ── PERSISTENCE — sauvegarde immédiate + backup ──
function save() {
  const data = JSON.stringify(classes);
  localStorage.setItem('natation_classes', data);
  // Backup horodaté (récupération si effacement accidentel)
  const ts = new Date().toISOString().slice(0, 16);
  localStorage.setItem('natation_backup_' + ts.slice(0,10), data);
}

function load() {
  const raw = localStorage.getItem('natation_classes');
  if (raw) {
    try { classes = JSON.parse(raw); }
    catch(e) { classes = {}; }
  }
}

// Sauvegarde auto toutes les 30 secondes si données présentes
setInterval(() => {
  if (Object.keys(classes).length > 0) save();
}, 30000);

// ── NAVIGATION ───────────────────────────────
function showScreen(id) {
  const screens = document.querySelectorAll('.screen');
  const next = document.getElementById(id);
  if (!next) return;

  screens.forEach(s => {
    if (s === next) {
      s.classList.add('active');
    } else {
      s.classList.remove('active');
    }
  });

  // Refresh content
  if (id === 'screen-classes') renderClasses();
  if (id === 'screen-group') { renderStudents(); updateTabCounts(); }
}

// ── IMPORT ───────────────────────────────────
function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error('Format invalide');
      importBuffer = data.map((d, i) => ({
        id: Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2,7),
        nom: (d.nom || '').trim().toUpperCase(),
        prenom: (d.prenom || '').trim(),
        classe: (d.classe || 'Inconnue').trim(),
        ddn: (d.date_naissance || d.ddn || '').trim(),
        sexe: (d.sexe || '').trim(),
        note_eleve: (d.note_eleve || '').trim(),  // ULIS, PAP, PPS, handicap...
        groupe: d.groupe_num || null,
        etape: d.etape || 0,
        criteres: d.criteres || {},
        crawl: d.crawl || null,
        observ: d.observ || {},
        chrono: d.chrono || null,
      })).filter(d => d.nom);

      if (!importBuffer.length) {
        showToast('❌ Aucun élève trouvé dans le fichier');
        return;
      }
      showPreview();
    } catch (err) {
      showToast('❌ Fichier invalide — vérifiez le format JSON');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function showPreview() {
  if (!importBuffer.length) return;
  const div = document.getElementById('import-preview');
  const list = document.getElementById('preview-list');
  document.getElementById('preview-count').textContent =
    `${importBuffer.length} élève(s) — ${[...new Set(importBuffer.map(s => s.classe))].join(', ')}`;
  list.innerHTML = importBuffer.slice(0, 30).map(s =>
    `<div class="preview-item">
       ${s.sexe === 'F' ? '👧' : s.sexe === 'M' ? '👦' : '🧑'}
       <span>${s.prenom} ${s.nom}</span>
       ${s.note_eleve ? `<span class="badge-note-eleve">⚡ ${s.note_eleve}</span>` : ''}
       <span style="color:var(--text-lite);margin-left:auto">${s.classe}</span>
     </div>`
  ).join('') + (importBuffer.length > 30
    ? `<div class="preview-item" style="color:var(--text-lite)">... et ${importBuffer.length - 30} autres</div>`
    : '');
  div.classList.remove('hidden');
}

function confirmImport() {
  if (!importBuffer.length) return;
  let added = 0, skipped = 0;
  importBuffer.forEach(s => {
    if (!classes[s.classe]) classes[s.classe] = [];
    const exists = classes[s.classe].find(e => e.nom === s.nom && e.prenom === s.prenom);
    if (!exists) { classes[s.classe].push(s); added++; }
    else skipped++;
  });
  save();
  importBuffer = [];
  document.getElementById('import-preview').classList.add('hidden');
  showToast(`✅ ${added} élève(s) ajouté(s)${skipped ? ` · ${skipped} doublon(s) ignoré(s)` : ''}`);
  showScreen('screen-classes');
}

function downloadSample() {
  const sample = [
    { nom: "DUPONT",   prenom: "Emma",  date_naissance: "14/03/2013", sexe: "F", classe: "6A", note_eleve: "" },
    { nom: "MARTIN",   prenom: "Lucas", date_naissance: "07/09/2012", sexe: "M", classe: "6A", note_eleve: "PAP - Dyslexie" },
    { nom: "BERNARD",  prenom: "Chloé", date_naissance: "22/11/2013", sexe: "F", classe: "6A", note_eleve: "ULIS - Déficience motrice" },
  ];
  downloadJSON(sample, 'exemple_classe.json');
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ── LISTE CLASSES ─────────────────────────────
function renderClasses() {
  const container = document.getElementById('classes-list');
  const keys = Object.keys(classes).sort();

  if (!keys.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏊‍♀️</div>
        <h3>Aucune classe</h3>
        <p>Importez votre première classe pour commencer l'évaluation.</p>
        <button class="btn-ghost" style="margin-top:16px" onclick="showScreen('screen-import')">
          📥 Importer une classe
        </button>
      </div>`;
    return;
  }

  container.innerHTML = keys.map(cls => {
    const students = classes[cls];
    const g1 = students.filter(s => s.groupe === '1').length;
    const g2 = students.filter(s => s.groupe === '2').length;
    const g3 = students.filter(s => s.groupe === '3').length;
    const pending = students.filter(s => !s.groupe).length;
    const pct = Math.round(((students.length - pending) / students.length) * 100);
    return `
      <div class="class-card" onclick="openClass('${cls}')">
        <div class="class-icon">🏊</div>
        <div class="class-info">
          <div class="class-name">${cls}</div>
          <div class="class-meta">${students.length} élève${students.length > 1 ? 's' : ''} · ${pct}% évalué${pct > 0 ? 's' : ''}</div>
          <div class="class-groups">
            ${g1 ? `<span class="mini-badge g1">G1·${g1}</span>` : ''}
            ${g2 ? `<span class="mini-badge g2">G2·${g2}</span>` : ''}
            ${g3 ? `<span class="mini-badge g3">G3·${g3}</span>` : ''}
            ${pending ? `<span class="mini-badge pending">À évaluer·${pending}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
          <span class="class-arrow">›</span>
          <button class="btn-delete-class" onclick="event.stopPropagation();confirmDeleteClass('${cls}')">🗑</button>
        </div>
      </div>`;
  }).join('');
}

function confirmDeleteClass(cls) {
  showModal(
    `Supprimer la classe "${cls}" et toutes ses données ?`,
    () => {
      delete classes[cls];
      save();
      renderClasses();
      showToast(`Classe ${cls} supprimée`);
    }
  );
}

function openClass(cls) {
  currentClass = cls;
  currentFilter = 'all';
  document.getElementById('group-title').textContent = cls;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-all').classList.add('active');
  showScreen('screen-group');
}

// ── LISTE ÉLÈVES ──────────────────────────────
function renderStudents() {
  if (!currentClass) return;
  const students = classes[currentClass] || [];
  const container = document.getElementById('students-list');

  let filtered = students;
  if (currentFilter === '1')       filtered = students.filter(s => s.groupe === '1');
  else if (currentFilter === '2')  filtered = students.filter(s => s.groupe === '2');
  else if (currentFilter === '3')  filtered = students.filter(s => s.groupe === '3');
  else if (currentFilter === 'pending') filtered = students.filter(s => !s.groupe);

  // Tri alphabétique
  filtered = [...filtered].sort((a, b) => a.nom.localeCompare(b.nom));

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✓</div>
        <h3>Aucun élève dans ce groupe</h3>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(s => {
    const groupClass = s.groupe ? `g${s.groupe}` : 'pending';
    const avatarClass = s.groupe ? `avatar-g${s.groupe}` : 'avatar-pending';
    const initiales = (s.prenom[0] || '').toUpperCase() + (s.nom[0] || '').toUpperCase();
    const groupLabel = s.groupe ? `Groupe ${s.groupe}` : 'À évaluer';
    const pillClass = s.groupe ? `pill-g${s.groupe}` : 'pill-pending';

    return `
      <div class="student-card ${groupClass}" onclick="openEval('${s.id}')">
        <div class="student-avatar ${avatarClass}">${initiales}</div>
        <div class="student-info">
          <div class="student-name">${s.prenom} ${s.nom}${s.note_eleve ? ' <span class="alert-dot" title="' + s.note_eleve + '">⚡</span>' : ''}</div>
          <div class="student-sub">${getEtapeLabel(s)}</div>
        </div>
        <span class="group-pill ${pillClass}">${groupLabel}</span>
      </div>`;
  }).join('');
}

function getEtapeLabel(s) {
  if (s.groupe) {
    const echoues = CRITERES.filter(c => s.criteres[c.id] === false).length;
    if (s.groupe === '1') return `Non nageur · ${echoues} critère${echoues>1?'s':''} échoué${echoues>1?'s':''}`;
    if (s.groupe === '2') return 'Nageur autonome · pas de crawl';
    if (s.groupe === '3') return `Crawl maîtrisé${s.chrono ? ' · ' + s.chrono + 's' : ''}`;
  }
  const nb = Object.keys(s.criteres).length;
  switch (s.etape) {
    case 0: return 'Pas encore évalué';
    case 1: return `Savoir nager · ${nb}/7 critères saisis`;
    case 2: return 'Niveau de nage · à déterminer';
    case 3: return '50m + chrono · à finaliser';
    default: return '';
  }
}

function filterGroup(g) {
  currentFilter = g;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${g}`).classList.add('active');
  renderStudents();
}

function updateTabCounts() {
  if (!currentClass) return;
  const students = classes[currentClass] || [];
  document.getElementById('count-all').textContent = students.length;
  document.getElementById('count-1').textContent = students.filter(s => s.groupe === '1').length;
  document.getElementById('count-2').textContent = students.filter(s => s.groupe === '2').length;
  document.getElementById('count-3').textContent = students.filter(s => s.groupe === '3').length;
  document.getElementById('count-pending').textContent = students.filter(s => !s.groupe).length;
}

// ── ÉVALUATION ───────────────────────────────
function openEval(id) {
  if (!currentClass) return;
  const students = classes[currentClass];
  currentStudent = students.find(s => String(s.id) === String(id));
  if (!currentStudent) return;

  document.getElementById('eval-back-btn').onclick = () => {
    showScreen('screen-group');
  };

  updateEvalHeader();
  renderEval();
  showScreen('screen-eval');
}

function updateEvalHeader() {
  const s = currentStudent;
  document.getElementById('eval-student-name').textContent = `${s.prenom} ${s.nom}`;
  const badge = document.getElementById('eval-group-badge');
  if (s.groupe) {
    badge.textContent = `G${s.groupe}`;
    badge.className = `group-badge-sm pill-g${s.groupe}`;
  } else {
    badge.textContent = 'À évaluer';
    badge.className = 'group-badge-sm pill-pending';
  }
  // Alerte besoin particulier dans le header
  const alertEl = document.getElementById('eval-alert-banner');
  if (alertEl) {
    if (s.note_eleve) {
      alertEl.textContent = '⚡ ' + s.note_eleve;
      alertEl.classList.remove('hidden');
    } else {
      alertEl.classList.add('hidden');
    }
  }
}

function renderEval() {
  const s = currentStudent;
  const container = document.getElementById('eval-content');
  container.scrollTop = 0;

  if (!s.groupe && s.etape <= 1) renderEtape1(container);
  else if (!s.groupe && s.etape === 2) renderEtape2(container);
  else if (!s.groupe && s.etape === 3) renderEtape3(container);
  else renderRecap(container);
}

// ÉTAPE 1 — 7 critères
function renderEtape1(container) {
  const s = currentStudent;
  const failCount = CRITERES.filter(c => s.criteres[c.id] === false).length;
  const doneCount = Object.keys(s.criteres).length;
  const allDone = doneCount === 7;

  container.innerHTML = `
    <div class="eval-step">
      <div class="step-indicator">
        <div class="step-dot active"></div>
        <div class="step-dot"></div>
        <div class="step-dot"></div>
      </div>
      <div class="eval-section" style="margin-top:12px">
        <div class="eval-section-title">🏊 Test Savoir Nager — 7 critères</div>
        <p style="font-size:12px;color:var(--text-mid);margin-bottom:12px">Appuyer pour basculer ✓ / ✗ / —</p>
        ${CRITERES.map(c => {
          const val = s.criteres[c.id];
          const toggleClass = val === true ? 'success' : val === false ? 'fail' : 'pending';
          const icon = val === true ? '✓' : val === false ? '✗' : '';
          return `
            <div class="critere-item" onclick="toggleCritere('${c.id}')">
              <button class="critere-toggle ${toggleClass}" onclick="event.stopPropagation();toggleCritere('${c.id}')">${icon}</button>
              <div class="critere-text">
                <div class="critere-label">${c.label}</div>
                <div class="critere-sub">${c.sub}</div>
              </div>
            </div>`;
        }).join('')}
      </div>

      ${failCount > 0 ? `
        <div class="result-banner g1">
          <div class="result-banner-icon">⚠️</div>
          <div class="result-banner-title">${failCount} critère${failCount > 1 ? 's' : ''} échoué${failCount > 1 ? 's' : ''}</div>
          <div class="result-banner-sub">Cet élève sera orienté en Groupe 1</div>
        </div>
        <div class="eval-actions">
          <button class="btn-eval-primary btn-eval-g1" onclick="assignGroup1()">
            Valider — Groupe 1 (Non nageur)
          </button>
        </div>
      ` : `
        <div class="eval-actions">
          <button class="btn-eval-primary btn-eval-teal" onclick="validerSavoirNager()"
            ${!allDone ? 'disabled style="opacity:0.38;cursor:not-allowed"' : ''}>
            ✓ Tous validés — Étape suivante
            ${!allDone ? `<br><small style="font-weight:400;font-size:12px">${doneCount}/7 critères saisis</small>` : ''}
          </button>
        </div>
      `}
    </div>`;
}

function toggleCritere(id) {
  const s = currentStudent;
  const val = s.criteres[id];
  if (val === undefined || val === null) s.criteres[id] = true;
  else if (val === true) s.criteres[id] = false;
  else delete s.criteres[id];
  save();
  renderEval();
}

function assignGroup1() {
  currentStudent.groupe = '1';
  currentStudent.etape = 99;
  save();
  updateEvalHeader();
  renderEval();
  updateTabCounts();
  showToast('✅ Groupe 1 attribué');
}

function validerSavoirNager() {
  currentStudent.etape = 2;
  save();
  renderEval();
}

// ÉTAPE 2 — Sait nager le crawl ?
function renderEtape2(container) {
  container.innerHTML = `
    <div class="eval-step">
      <div class="step-indicator">
        <div class="step-dot done"></div>
        <div class="step-dot active"></div>
        <div class="step-dot"></div>
      </div>
      <div class="eval-section" style="margin-top:12px">
        <div class="eval-section-title">🔍 Affinage — Niveau de nage</div>
        <p style="font-size:14px;color:var(--text-mid);line-height:1.6;margin-bottom:20px">
          L'élève valide les 7 critères du savoir nager.<br>
          Sait-il nager le <strong>crawl</strong> de façon identifiable ?
        </p>
        <div class="eval-actions">
          <button class="btn-eval-primary btn-eval-teal" onclick="setCrawl(true)">
            ✓ Oui — Crawl identifiable
            <br><small style="font-weight:400;font-size:12px">→ Observation 50m + chrono 25m</small>
          </button>
          <button class="btn-eval-primary btn-eval-g2" onclick="setCrawl(false)">
            ✗ Non — Nage hasardeuse
            <br><small style="font-weight:400;font-size:12px">→ Groupe 2 (Nageur autonome)</small>
          </button>
          <button class="btn-ghost" onclick="retourEtape1()">← Retour aux critères</button>
        </div>
      </div>
    </div>`;
}

function retourEtape1() {
  currentStudent.etape = 1;
  save();
  renderEval();
}

function setCrawl(val) {
  if (!val) {
    currentStudent.groupe = '2';
    currentStudent.crawl = false;
    currentStudent.etape = 99;
    save();
    updateEvalHeader();
    renderEval();
    updateTabCounts();
    showToast('✅ Groupe 2 attribué');
  } else {
    currentStudent.crawl = true;
    currentStudent.etape = 3;
    save();
    renderEval();
  }
}

// ÉTAPE 3 — 50m observé + 25m chrono
function renderEtape3(container) {
  const s = currentStudent;
  const obs = s.observ || {};

  container.innerHTML = `
    <div class="eval-step">
      <div class="step-indicator">
        <div class="step-dot done"></div>
        <div class="step-dot done"></div>
        <div class="step-dot active"></div>
      </div>

      <div class="eval-section" style="margin-top:12px">
        <div class="eval-section-title">👁 Observation 50m NL souple</div>
        <p style="font-size:13px;color:var(--text-mid);margin-bottom:14px">Cochez les éléments observés :</p>
        <div class="observ-grid">
          ${[
            { id: 'propulsion',   icon: '💪', label: 'Propulsion efficace' },
            { id: 'equilibre',    icon: '⚖️', label: 'Équilibre horizontal' },
            { id: 'respiration',  icon: '😮‍💨', label: 'Respiration rythmée' },
            { id: 'coordination', icon: '🔄', label: 'Coordination bras/jambes' },
          ].map(o => `
            <div class="observ-item ${obs[o.id] ? 'selected' : ''}" onclick="toggleObserv('${o.id}')">
              <div class="observ-icon">${o.icon}</div>
              <div class="observ-label">${o.label}</div>
            </div>`).join('')}
        </div>
      </div>

      <div class="eval-section">
        <div class="eval-section-title">⏱ Chrono 25m NL — Plongeon · Coulée · Sprint</div>
        <div class="chrono-input-wrap">
          <div class="chrono-label">Temps en secondes (ex: 24.35)</div>
          <input class="chrono-input" type="number" inputmode="decimal" placeholder="—"
            step="0.01" min="0" max="120"
            id="chrono-input" value="${s.chrono || ''}"
            oninput="autoSaveChrono(this.value)">
          <div class="chrono-hint">Évaluation diagnostique initiale</div>
        </div>
      </div>

      <div class="eval-actions">
        <button class="btn-eval-primary btn-eval-g3" onclick="assignGroup3()">
          🌊 Valider — Groupe 3 (Crawl maîtrisé)
        </button>
        <button class="btn-eval-primary btn-eval-g2" onclick="repasserG2()">
          ← Finalement Groupe 2
        </button>
        <button class="btn-ghost" onclick="retourCrawl()">← Retour</button>
      </div>
    </div>`;
}

function autoSaveChrono(val) {
  currentStudent.chrono = parseFloat(val) || null;
  save();
}

function toggleObserv(id) {
  if (!currentStudent.observ) currentStudent.observ = {};
  currentStudent.observ[id] = !currentStudent.observ[id];
  save();
  renderEval();
}

function assignGroup3() {
  const input = document.getElementById('chrono-input');
  if (input) currentStudent.chrono = parseFloat(input.value) || currentStudent.chrono || null;
  currentStudent.groupe = '3';
  currentStudent.etape = 99;
  save();
  updateEvalHeader();
  renderEval();
  updateTabCounts();
  showToast('✅ Groupe 3 attribué');
}

function repasserG2() {
  currentStudent.groupe = '2';
  currentStudent.crawl = false;
  currentStudent.etape = 99;
  save();
  updateEvalHeader();
  renderEval();
  updateTabCounts();
  showToast('✅ Groupe 2 attribué');
}

function retourCrawl() {
  currentStudent.etape = 2;
  currentStudent.crawl = null;
  save();
  renderEval();
}

// RÉCAP — groupe attribué
function renderRecap(container) {
  const s = currentStudent;
  const groupLabels = {
    '1': { title: 'Groupe 1 — Non nageur',       icon: '🚨', desc: 'Échec à au moins un critère du savoir nager.', cls: 'g1' },
    '2': { title: 'Groupe 2 — Nageur autonome',   icon: '🏊', desc: 'Valide le savoir nager, nage hasardeuse sans crawl.', cls: 'g2' },
    '3': { title: 'Groupe 3 — Crawl maîtrisé',    icon: '🌊', desc: 'Crawl identifiable, très à l\'aise dans l\'eau.', cls: 'g3' },
  };
  const gl = groupLabels[s.groupe];
  const failedCriteres = CRITERES.filter(c => s.criteres[c.id] === false);
  const validCriteres  = CRITERES.filter(c => s.criteres[c.id] === true);

  // Calcul âge
  let ageStr = '';
  if (s.ddn) {
    const parts = s.ddn.split('/');
    if (parts.length === 3) {
      const birth = new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));
      const now = new Date();
      const age = now.getFullYear() - birth.getFullYear() -
        (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
      ageStr = isNaN(age) ? '' : `${age} ans`;
    }
  }

  container.innerHTML = `
    <div class="eval-step">

      ${(s.ddn || s.sexe || s.note_eleve) ? `
      <div class="fiche-eleve-card">
        <div class="fiche-eleve-row">
          <span class="fiche-label">Classe</span><span class="fiche-value">${s.classe}</span>
        </div>
        ${s.ddn ? `<div class="fiche-eleve-row">
          <span class="fiche-label">Naissance</span><span class="fiche-value">${s.ddn}${ageStr ? ' · ' + ageStr : ''}</span>
        </div>` : ''}
        ${s.sexe ? `<div class="fiche-eleve-row">
          <span class="fiche-label">Sexe</span><span class="fiche-value">${s.sexe === 'F' ? '👧 Fille' : s.sexe === 'M' ? '👦 Garçon' : s.sexe}</span>
        </div>` : ''}
        ${s.note_eleve ? `<div class="fiche-eleve-row fiche-alerte">
          <span class="fiche-label">⚡ Besoin particulier</span><span class="fiche-value">${s.note_eleve}</span>
        </div>` : ''}
      </div>` : ''}

      <div class="result-banner ${gl.cls}" style="margin-top:8px">
        <div class="result-banner-icon">${gl.icon}</div>
        <div class="result-banner-title">${gl.title}</div>
        <div class="result-banner-sub">${gl.desc}</div>
        ${s.chrono ? `<div style="font-size:22px;font-weight:700;margin-top:10px;font-family:'Syne',sans-serif">${s.chrono}s · 25m NL</div>` : ''}
      </div>

      ${validCriteres.length ? `
        <div class="eval-section">
          <div class="eval-section-title">✅ Critères validés (${validCriteres.length}/7)</div>
          ${validCriteres.map(c => `
            <div class="critere-item">
              <div class="critere-toggle success">✓</div>
              <div class="critere-text"><div class="critere-label">${c.label}</div></div>
            </div>`).join('')}
        </div>` : ''}

      ${failedCriteres.length ? `
        <div class="eval-section">
          <div class="eval-section-title">❌ Critères échoués (${failedCriteres.length})</div>
          ${failedCriteres.map(c => `
            <div class="critere-item">
              <div class="critere-toggle fail">✗</div>
              <div class="critere-text">
                <div class="critere-label">${c.label}</div>
                <div class="critere-sub">${c.sub}</div>
              </div>
            </div>`).join('')}
        </div>` : ''}

      ${s.observ && Object.values(s.observ).some(v => v) ? `
        <div class="eval-section">
          <div class="eval-section-title">👁 Observations 50m NL</div>
          ${[
            ['propulsion',   '💪 Propulsion efficace'],
            ['equilibre',    '⚖️ Équilibre horizontal'],
            ['respiration',  '😮‍💨 Respiration rythmée'],
            ['coordination', '🔄 Coordination bras/jambes'],
          ].filter(([k]) => s.observ[k])
           .map(([,v]) => `
            <div class="critere-item">
              <div class="critere-toggle success">✓</div>
              <div class="critere-label" style="font-size:14px;padding:4px 0">${v}</div>
            </div>`).join('')}
        </div>` : ''}

      <div class="eval-section">
        <div class="eval-section-title">⚙️ Actions</div>
        <div class="eval-actions" style="margin-top:0">
          <button class="btn-eval-primary" style="background:var(--text-mid)" onclick="resetEval()">
            ↺ Réévaluer cet élève
          </button>
        </div>
      </div>
    </div>`;
}

function resetEval() {
  showModal('Réévaluer cet élève ? Son groupe et toutes ses données seront effacés.', () => {
    currentStudent.groupe  = null;
    currentStudent.etape   = 0;
    currentStudent.criteres = {};
    currentStudent.crawl   = null;
    currentStudent.observ  = {};
    currentStudent.chrono  = null;
    save();
    updateEvalHeader();
    renderEval();
    updateTabCounts();
    showToast('Évaluation réinitialisée');
  });
}

// ── EXPORT ───────────────────────────────────
function exportClass() {
  if (!currentClass) return;
  const students = classes[currentClass];

  // Export complet (permet ré-import avec données conservées)
  const data = students.map(s => ({
    nom: s.nom,
    prenom: s.prenom,
    date_naissance: s.ddn || '',
    sexe: s.sexe || '',
    classe: s.classe,
    note_eleve: s.note_eleve || '',
    groupe_num: s.groupe || null,
    groupe_label: s.groupe ? ['', 'Non nageur', 'Nageur autonome', 'Crawl maîtrisé'][s.groupe] : 'Non évalué',
    chrono_25m: s.chrono || null,
    etape: s.etape,
    criteres: s.criteres,
    crawl: s.crawl,
    observ: s.observ,
    criteres_echoues: CRITERES.filter(c => s.criteres[c.id] === false).map(c => c.label).join(', '),
    observations_positives: Object.entries(s.observ || {}).filter(([,v]) => v).map(([k]) => k).join(', '),
  }));

  const date = new Date().toISOString().slice(0,10);
  downloadJSON(data, `natation_${currentClass}_${date}.json`);
  showToast('📤 Export téléchargé');
}

// Exporter toutes les classes d'un coup
function exportAll() {
  const data = {};
  Object.keys(classes).forEach(cls => {
    data[cls] = classes[cls];
  });
  downloadJSON(data, `natation_backup_${new Date().toISOString().slice(0,10)}.json`);
  showToast('📤 Backup complet téléchargé');
}

// ── RÉCUPÉRATION DONNÉES EFFACÉES ──────────────
function showBackups() {
  const backups = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('natation_backup_')) {
      backups.push({ key, date: key.replace('natation_backup_', '') });
    }
  }
  if (!backups.length) {
    showToast('Aucun backup disponible');
    return;
  }
  backups.sort((a,b) => b.date.localeCompare(a.date));
  const latest = backups[0];
  showModal(
    `Restaurer le backup du ${latest.date} ? Les données actuelles seront remplacées.`,
    () => {
      try {
        const raw = localStorage.getItem(latest.key);
        classes = JSON.parse(raw);
        save();
        renderClasses();
        showToast(`✅ Backup du ${latest.date} restauré`);
      } catch(e) {
        showToast('❌ Erreur lors de la restauration');
      }
    }
  );
}

// ── MODAL ────────────────────────────────────
function showModal(message, onConfirm) {
  document.getElementById('modal-message').textContent = message;
  document.getElementById('modal-confirm-btn').onclick = () => { closeModal(); onConfirm(); };
  document.getElementById('modal').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

// ── TOAST ────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2500);
}

// ── SERVICE WORKER ───────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => {
        // Force update si nouvelle version disponible
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              showToast('🔄 Mise à jour disponible — Rechargez l\'app');
            }
          });
        });
      })
      .catch(err => console.log('SW erreur', err));
  });
}

// ── INIT ─────────────────────────────────────
load();
