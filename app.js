// ══════════════════════════════════════════════
// NATATION EPS — APP.JS v2.0
// ══════════════════════════════════════════════

let classes = {};
let currentClass = null;
let currentStudent = null;
let currentFilter = 'all';
let importBuffer = [];
let toastTimer = null;

const CRITERES = [
  { id:'c1', label:"Sauter dans l'eau",        sub:"Se mettre à l'eau seul en sautant" },
  { id:'c2', label:"Se déplacer 15m",           sub:"Sans reprise d'appui sur le fond ou les bords" },
  { id:'c3', label:"Surplace 10 secondes",      sub:"Maintenir la tête hors de l'eau" },
  { id:'c4', label:"Se retourner sur le dos",   sub:"Depuis la position ventrale" },
  { id:'c5', label:"Nager sur le dos 10m",      sub:"En continuité du retournement" },
  { id:'c6', label:"Se retourner sur le ventre",sub:"Depuis la position dorsale" },
  { id:'c7', label:"Sortir de l'eau",           sub:"Sans l'aide de l'échelle" },
];

// ── PERSISTENCE ──────────────────────────────
function save() {
  const data = JSON.stringify(classes);
  try {
    localStorage.setItem('natation_classes', data);
    const today = new Date().toISOString().slice(0,10);
    localStorage.setItem('natation_bak_' + today, data);
  } catch(e) { showToast('⚠️ Sauvegarde impossible (stockage plein)'); }
}

function load() {
  try {
    const raw = localStorage.getItem('natation_classes');
    if (raw) classes = JSON.parse(raw);
  } catch(e) { classes = {}; }
}

// Sauvegarde auto toutes les 30s
setInterval(() => { if (Object.keys(classes).length) save(); }, 30000);

// ── NAVIGATION ───────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const next = document.getElementById(id);
  if (!next) return;
  next.classList.add('active');
  if (id === 'screen-classes') renderClasses();
  if (id === 'screen-group')   { renderStudents(); updateCounts(); }
}

// ── IMPORT EXCEL / CSV ───────────────────────
const COL_ALIASES = {
  nom:    ['nom','name','lastname','famille','élève'],
  prenom: ['prenom','prénom','firstname','given','first'],
  ddn:    ['date_naissance','ddn','naissance','birthdate','né','nee','birth'],
  sexe:   ['sexe','genre','sex','gender'],
  classe: ['classe','class','group','groupe','division','section'],
  note:   ['note_eleve','note','remarque','commentaire','besoin','observation','particularité','handicap','ulis','pap','pps'],
};

function normKey(s) {
  return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
}

function detectCols(headers) {
  const map = {};
  headers.forEach((h,i) => {
    const n = normKey(h);
    Object.entries(COL_ALIASES).forEach(([field, aliases]) => {
      if (map[field] === undefined && aliases.some(a => n.includes(a)))
        map[field] = i;
    });
  });
  return map;
}

function parseDate(val) {
  if (!val && val !== 0) return '';
  if (typeof val === 'number' && typeof XLSX !== 'undefined') {
    try {
      const d = XLSX.SSF.parse_date_code(val);
      if (d) return `${String(d.d).padStart(2,'0')}/${String(d.m).padStart(2,'0')}/${d.y}`;
    } catch(e) {}
  }
  return String(val).trim();
}

function rowToStudent(row, map, idx) {
  const g = f => { const i = map[f]; return i !== undefined ? String(row[i]??'').trim() : ''; };
  const nom = g('nom').toUpperCase();
  if (!nom) return null;
  return {
    id: `${Date.now()}_${idx}_${Math.random().toString(36).slice(2,6)}`,
    nom, prenom: g('prenom'),
    ddn: parseDate(map.ddn !== undefined ? row[map.ddn] : ''),
    sexe: g('sexe').toUpperCase().charAt(0),
    classe: g('classe') || 'Inconnue',
    note: g('note'),
    groupe: null, etape: 0, criteres: {}, crawl: null, observ: {}, chrono: null,
  };
}

function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  event.target.value = '';
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();

  reader.onload = e => {
    try {
      let headers = [], rows = [];
      if (ext === 'csv') {
        const lines = e.target.result.split(/\r?\n/).filter(l => l.trim());
        const sep = lines[0].includes(';') ? ';' : ',';
        headers = lines[0].split(sep).map(h => h.replace(/['"]/g,'').trim());
        rows = lines.slice(1).map(l => l.split(sep).map(v => v.replace(/['"]/g,'').trim()));
      } else {
        if (typeof XLSX === 'undefined') { showToast('❌ Bibliothèque Excel non chargée'); return; }
        const wb = XLSX.read(e.target.result, { type:'array', cellDates:false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });
        if (!data.length) throw new Error('Vide');
        headers = data[0].map(String);
        rows = data.slice(1).filter(r => r.some(c => c !== '' && c !== null && c !== undefined));
      }

      const map = detectCols(headers);
      if (map.nom === undefined) { showToast('❌ Colonne "nom" introuvable'); return; }

      importBuffer = rows.map((r,i) => rowToStudent(r, map, i)).filter(Boolean);
      if (!importBuffer.length) { showToast('❌ Aucun élève trouvé'); return; }
      showPreview();
    } catch(err) {
      console.error(err);
      showToast('❌ Erreur lecture fichier');
    }
  };

  if (ext === 'csv') reader.readAsText(file, 'UTF-8');
  else reader.readAsArrayBuffer(file);
}

function showPreview() {
  const classes_dispo = [...new Set(importBuffer.map(s => s.classe))].join(', ');
  document.getElementById('preview-count').textContent =
    `${importBuffer.length} élève(s) · ${classes_dispo}`;
  document.getElementById('preview-list').innerHTML =
    importBuffer.slice(0,25).map(s => `
      <div class="prev-item">
        ${s.sexe==='F'?'👧':s.sexe==='M'?'👦':'🧑'}
        <span style="flex:1;font-weight:500">${s.prenom} ${s.nom}</span>
        ${s.note ? `<span class="note-badge">⚡ ${s.note}</span>` : ''}
        <span style="color:var(--lite)">${s.classe}</span>
      </div>`).join('')
    + (importBuffer.length > 25 ? `<div class="prev-item" style="color:var(--lite)">… et ${importBuffer.length-25} autres</div>` : '');
  document.getElementById('import-preview').classList.remove('hidden');
}

function confirmImport() {
  let added = 0, skip = 0;
  importBuffer.forEach(s => {
    if (!classes[s.classe]) classes[s.classe] = [];
    const exists = classes[s.classe].find(e => e.nom===s.nom && e.prenom===s.prenom);
    if (!exists) { classes[s.classe].push(s); added++; } else skip++;
  });
  save();
  importBuffer = [];
  document.getElementById('import-preview').classList.add('hidden');
  showToast(`✅ ${added} élève(s) ajouté(s)${skip?` · ${skip} doublon(s) ignoré(s)`:''}`);
  showScreen('screen-classes');
}

function downloadSample() {
  if (typeof XLSX === 'undefined') { showToast('❌ Bibliothèque Excel non chargée'); return; }
  const ws = XLSX.utils.aoa_to_sheet([
    ['nom','prenom','date_naissance','sexe','classe','note_eleve'],
    ['DUPONT','Emma','14/03/2013','F','6A',''],
    ['MARTIN','Lucas','07/09/2012','M','6A','PAP - Dyslexie'],
    ['BERNARD','Chloé','22/11/2013','F','6A','ULIS - Déficience motrice'],
    ['ROUSSEAU','Théo','03/06/2013','M','6A',''],
  ]);
  ws['!cols'] = [{wch:18},{wch:14},{wch:16},{wch:6},{wch:8},{wch:32}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Classe');
  XLSX.writeFile(wb, 'modele_liste_classe.xlsx');
  showToast('📥 Modèle Excel téléchargé');
}

// ── CLASSES ──────────────────────────────────
function renderClasses() {
  const el = document.getElementById('classes-list');
  const keys = Object.keys(classes).sort();
  if (!keys.length) {
    el.innerHTML = `<div class="empty"><div class="eico">🏊‍♀️</div><h3>Aucune classe</h3>
      <p>Importez votre première liste de classe.</p>
      <button class="btn-ghost" style="margin-top:14px" onclick="showScreen('screen-import')">📥 Importer</button></div>`;
    return;
  }
  el.innerHTML = keys.map(cls => {
    const ss = classes[cls];
    const g1=ss.filter(s=>s.groupe==='1').length, g2=ss.filter(s=>s.groupe==='2').length;
    const g3=ss.filter(s=>s.groupe==='3').length, pe=ss.filter(s=>!s.groupe).length;
    const pct = Math.round((ss.length-pe)/ss.length*100);
    return `<div class="cls-card" onclick="openClass('${cls}')">
      <div class="cls-ico">🏊</div>
      <div class="cls-info">
        <div class="cls-name">${cls}</div>
        <div class="cls-meta">${ss.length} élève${ss.length>1?'s':''} · ${pct}% évalué${pct>0?'s':''}</div>
        <div class="cls-badges">
          ${g1?`<span class="mbadge g1">G1·${g1}</span>`:''}
          ${g2?`<span class="mbadge g2">G2·${g2}</span>`:''}
          ${g3?`<span class="mbadge g3">G3·${g3}</span>`:''}
          ${pe?`<span class="mbadge p">À évaluer·${pe}</span>`:''}
        </div>
      </div>
      <div class="cls-actions">
        <span style="color:var(--lite);font-size:20px">›</span>
        <button class="btn-del" onclick="event.stopPropagation();deleteClass('${cls}')">🗑</button>
      </div>
    </div>`;
  }).join('');
}

function deleteClass(cls) {
  showModal(`Supprimer la classe "${cls}" et toutes ses données ?`, () => {
    delete classes[cls];
    save();
    renderClasses();
    showToast(`Classe ${cls} supprimée`);
  });
}

function openClass(cls) {
  currentClass = cls;
  currentFilter = 'all';
  document.getElementById('group-title').textContent = cls;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  document.getElementById('tab-all').classList.add('on');
  showScreen('screen-group');
}

// ── ÉLÈVES ───────────────────────────────────
function renderStudents() {
  if (!currentClass) return;
  const el = document.getElementById('students-list');
  let ss = [...(classes[currentClass]||[])];
  if (currentFilter==='1') ss=ss.filter(s=>s.groupe==='1');
  else if (currentFilter==='2') ss=ss.filter(s=>s.groupe==='2');
  else if (currentFilter==='3') ss=ss.filter(s=>s.groupe==='3');
  else if (currentFilter==='pending') ss=ss.filter(s=>!s.groupe);
  ss.sort((a,b)=>a.nom.localeCompare(b.nom));

  if (!ss.length) {
    el.innerHTML = `<div class="empty"><div class="eico">✓</div><h3>Aucun élève ici</h3></div>`;
    return;
  }
  el.innerHTML = ss.map(s => {
    const gc = s.groupe ? `g${s.groupe}` : 'pend';
    const avc = s.groupe ? `av${s.groupe}` : 'avp';
    const ini = (s.prenom[0]||'').toUpperCase()+(s.nom[0]||'').toUpperCase();
    const gl = s.groupe ? `Groupe ${s.groupe}` : 'À évaluer';
    const pc = s.groupe ? `g${s.groupe}` : 'p';
    return `<div class="stu-card ${gc}" onclick="openEval('${s.id}')">
      <div class="avatar ${avc}">${ini}</div>
      <div class="stu-info">
        <div class="stu-name">${s.prenom} ${s.nom}${s.note?` <span style="font-size:12px">⚡</span>`:''}</div>
        <div class="stu-sub">${etapeLabel(s)}</div>
      </div>
      <span class="gpill ${pc}">${gl}</span>
    </div>`;
  }).join('');
}

function etapeLabel(s) {
  if (s.groupe) {
    const ko = CRITERES.filter(c=>s.criteres[c.id]===false).length;
    if (s.groupe==='1') return `Non nageur · ${ko} critère${ko>1?'s':''} échoué${ko>1?'s':''}`;
    if (s.groupe==='2') return 'Nageur autonome · pas de crawl';
    if (s.groupe==='3') return `Crawl maîtrisé${s.chrono?' · '+s.chrono+'s':''}`;
  }
  const nb = Object.keys(s.criteres).length;
  if (s.etape===0) return 'Pas encore évalué';
  if (s.etape===1) return `Savoir nager · ${nb}/7 critères`;
  if (s.etape===2) return 'Niveau de nage · à déterminer';
  if (s.etape===3) return '50m + chrono · à finaliser';
  return '';
}

function filterGroup(g) {
  currentFilter = g;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  document.getElementById(`tab-${g}`).classList.add('on');
  renderStudents();
}

function updateCounts() {
  if (!currentClass) return;
  const ss = classes[currentClass]||[];
  document.getElementById('count-all').textContent = ss.length;
  document.getElementById('count-1').textContent = ss.filter(s=>s.groupe==='1').length;
  document.getElementById('count-2').textContent = ss.filter(s=>s.groupe==='2').length;
  document.getElementById('count-3').textContent = ss.filter(s=>s.groupe==='3').length;
  document.getElementById('count-pending').textContent = ss.filter(s=>!s.groupe).length;
}

// ── ÉVALUATION ───────────────────────────────
function openEval(id) {
  const ss = classes[currentClass]||[];
  currentStudent = ss.find(s=>String(s.id)===String(id));
  if (!currentStudent) return;
  document.getElementById('eval-back').onclick = () => showScreen('screen-group');
  refreshEvalHeader();
  renderEval();
  showScreen('screen-eval');
}

function refreshEvalHeader() {
  const s = currentStudent;
  document.getElementById('eval-name').textContent = `${s.prenom} ${s.nom}`;
  const badge = document.getElementById('eval-badge');
  if (s.groupe) { badge.textContent=`G${s.groupe}`; badge.className=`gpill g${s.groupe}`; }
  else { badge.textContent='À évaluer'; badge.className='gpill p'; }
  const alert = document.getElementById('eval-alert');
  if (s.note) { alert.textContent='⚡ '+s.note; alert.classList.remove('hidden'); }
  else { alert.classList.add('hidden'); }
}

function renderEval() {
  const s = currentStudent;
  const el = document.getElementById('eval-body');
  el.scrollTop = 0;
  if (!s.groupe && s.etape<=1) renderStep1(el);
  else if (!s.groupe && s.etape===2) renderStep2(el);
  else if (!s.groupe && s.etape===3) renderStep3(el);
  else renderRecap(el);
}

// ── ÉTAPE 1 : 7 critères ──
function renderStep1(el) {
  const s = currentStudent;
  const koCount = CRITERES.filter(c=>s.criteres[c.id]===false).length;
  const doneCount = Object.keys(s.criteres).length;
  const allDone = doneCount===7;

  el.innerHTML = `
    <div class="steps">
      <div class="step cur"></div><div class="step"></div><div class="step"></div>
    </div>
    <div class="card">
      <div class="card-title">🏊 Test Savoir Nager — Référentiel National</div>
      <p style="font-size:12px;color:var(--mid);margin-bottom:10px">Appuyer pour basculer ✓ / ✗ / —</p>
      ${CRITERES.map(c=>{
        const v=s.criteres[c.id];
        const cls=v===true?'ok':v===false?'ko':'';
        const ico=v===true?'✓':v===false?'✗':'';
        return `<div class="crit" onclick="toggleC('${c.id}')">
          <button class="ctog ${cls}">${ico}</button>
          <div><div class="clabel">${c.label}</div><div class="csub">${c.sub}</div></div>
        </div>`;
      }).join('')}
    </div>
    ${koCount>0?`
      <div class="banner g1">
        <div class="bico">⚠️</div>
        <div class="btitle">${koCount} critère${koCount>1?'s':''} échoué${koCount>1?'s':''}</div>
        <div class="bsub">Cet élève sera orienté en Groupe 1</div>
      </div>
      <div class="ebtns">
        <button class="ebtn g1c" onclick="setG1()">Valider → Groupe 1 (Non nageur)</button>
      </div>`:`
      <div class="ebtns">
        <button class="ebtn teal" onclick="validerSN()" ${!allDone?'disabled':''}>
          ✓ Tous validés — Étape suivante${!allDone?`<br><small style="font-weight:400;font-size:12px">${doneCount}/7 cochés</small>`:''}
        </button>
      </div>`}`;
}

function toggleC(id) {
  const s=currentStudent, v=s.criteres[id];
  if (v===undefined||v===null) s.criteres[id]=true;
  else if (v===true) s.criteres[id]=false;
  else delete s.criteres[id];
  save(); renderEval();
}

function setG1() {
  currentStudent.groupe='1'; currentStudent.etape=99;
  save(); refreshEvalHeader(); renderEval(); updateCounts();
  showToast('✅ Groupe 1 attribué');
}

function validerSN() {
  currentStudent.etape=2; save(); renderEval();
}

// ── ÉTAPE 2 : Crawl ? ──
function renderStep2(el) {
  el.innerHTML = `
    <div class="steps">
      <div class="step done"></div><div class="step cur"></div><div class="step"></div>
    </div>
    <div class="card">
      <div class="card-title">🔍 Affinage — Niveau de nage</div>
      <p style="font-size:14px;color:var(--mid);line-height:1.6;margin-bottom:18px">
        L'élève a validé les 7 critères.<br>Sait-il nager le <strong>crawl</strong> de façon identifiable ?
      </p>
      <div class="ebtns">
        <button class="ebtn teal" onclick="setCrawl(true)">
          ✓ Oui — Crawl identifiable<br><small style="font-weight:400;font-size:12px">→ Observation 50m + chrono 25m</small>
        </button>
        <button class="ebtn g2c" onclick="setCrawl(false)">
          ✗ Non — Nage hasardeuse<br><small style="font-weight:400;font-size:12px">→ Groupe 2</small>
        </button>
        <button class="ebtn gray" onclick="retourE1()">← Retour aux critères</button>
      </div>
    </div>`;
}

function retourE1() { currentStudent.etape=1; save(); renderEval(); }

function setCrawl(v) {
  if (!v) {
    currentStudent.groupe='2'; currentStudent.crawl=false; currentStudent.etape=99;
    save(); refreshEvalHeader(); renderEval(); updateCounts();
    showToast('✅ Groupe 2 attribué');
  } else {
    currentStudent.crawl=true; currentStudent.etape=3; save(); renderEval();
  }
}

// ── ÉTAPE 3 : 50m + chrono ──
function renderStep3(el) {
  const s=currentStudent, obs=s.observ||{};
  el.innerHTML = `
    <div class="steps">
      <div class="step done"></div><div class="step done"></div><div class="step cur"></div>
    </div>
    <div class="card">
      <div class="card-title">👁 Observation 50m NL souple</div>
      <div class="obs-grid">
        ${[
          {id:'propulsion',   ico:'💪', lbl:'Propulsion efficace'},
          {id:'equilibre',    ico:'⚖️', lbl:'Équilibre horizontal'},
          {id:'respiration',  ico:'😮‍💨', lbl:'Respiration rythmée'},
          {id:'coordination', ico:'🔄', lbl:'Coordination bras/jambes'},
        ].map(o=>`<div class="obs-item ${obs[o.id]?'sel':''}" onclick="toggleObs('${o.id}')">
          <div class="obs-ico">${o.ico}</div>
          <div class="obs-lbl">${o.lbl}</div>
        </div>`).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-title">⏱ Chrono 25m NL — Plongeon · Coulée · Sprint</div>
      <div class="chrono-wrap">
        <div class="chrono-lbl">Temps en secondes</div>
        <input class="chrono-in" type="number" inputmode="decimal" placeholder="—"
          step="0.01" min="0" max="120" id="chrono-in"
          value="${s.chrono||''}" oninput="saveChrono(this.value)">
        <div class="chrono-hint">Évaluation diagnostique initiale</div>
      </div>
    </div>
    <div class="ebtns">
      <button class="ebtn g3c" onclick="setG3()">🌊 Valider → Groupe 3 (Crawl maîtrisé)</button>
      <button class="ebtn g2c" onclick="retourG2()">← Finalement Groupe 2</button>
      <button class="ebtn gray" onclick="retourCrawl()">← Retour</button>
    </div>`;
}

function toggleObs(id) {
  if (!currentStudent.observ) currentStudent.observ={};
  currentStudent.observ[id]=!currentStudent.observ[id];
  save(); renderEval();
}

function saveChrono(v) { currentStudent.chrono=parseFloat(v)||null; save(); }

function setG3() {
  const inp=document.getElementById('chrono-in');
  if (inp) currentStudent.chrono=parseFloat(inp.value)||currentStudent.chrono||null;
  currentStudent.groupe='3'; currentStudent.etape=99;
  save(); refreshEvalHeader(); renderEval(); updateCounts();
  showToast('✅ Groupe 3 attribué');
}

function retourG2() {
  currentStudent.groupe='2'; currentStudent.crawl=false; currentStudent.etape=99;
  save(); refreshEvalHeader(); renderEval(); updateCounts();
  showToast('✅ Groupe 2 attribué');
}

function retourCrawl() { currentStudent.etape=2; currentStudent.crawl=null; save(); renderEval(); }

// ── RÉCAP ──
function renderRecap(el) {
  const s=currentStudent;
  const GL={
    '1':{title:'Groupe 1 — Non nageur',     ico:'🚨', desc:"Échec à au moins un critère du savoir nager.", c:'g1'},
    '2':{title:'Groupe 2 — Nageur autonome',ico:'🏊', desc:"Valide le savoir nager, nage hasardeuse sans crawl.", c:'g2'},
    '3':{title:'Groupe 3 — Crawl maîtrisé', ico:'🌊', desc:"Crawl identifiable, très à l'aise dans l'eau.", c:'g3'},
  };
  const gl=GL[s.groupe];
  const ko=CRITERES.filter(c=>s.criteres[c.id]===false);
  const ok=CRITERES.filter(c=>s.criteres[c.id]===true);

  // Calcul âge
  let ageStr='';
  if (s.ddn) {
    const p=s.ddn.split('/');
    if (p.length===3) {
      const b=new Date(+p[2],+p[1]-1,+p[0]), n=new Date();
      const a=n.getFullYear()-b.getFullYear()-(n<new Date(n.getFullYear(),b.getMonth(),b.getDate())?1:0);
      if (!isNaN(a)) ageStr=` · ${a} ans`;
    }
  }

  el.innerHTML = `
    ${(s.ddn||s.sexe||s.note)?`
    <div class="fiche">
      ${s.classe?`<div class="frow"><span class="flbl">Classe</span><span class="fval">${s.classe}</span></div>`:''}
      ${s.ddn?`<div class="frow"><span class="flbl">Naissance</span><span class="fval">${s.ddn}${ageStr}</span></div>`:''}
      ${s.sexe?`<div class="frow"><span class="flbl">Sexe</span><span class="fval">${s.sexe==='F'?'👧 Fille':s.sexe==='M'?'👦 Garçon':s.sexe}</span></div>`:''}
      ${s.note?`<div class="frow warn-row"><span class="flbl">⚡ Besoin particulier</span><span class="fval">${s.note}</span></div>`:''}
    </div>`:''}

    <div class="banner ${gl.c}">
      <div class="bico">${gl.ico}</div>
      <div class="btitle">${gl.title}</div>
      <div class="bsub">${gl.desc}</div>
      ${s.chrono?`<div style="font-size:22px;font-weight:700;margin-top:10px;font-family:'Syne',sans-serif">${s.chrono}s · 25m NL</div>`:''}
    </div>

    ${ok.length?`<div class="card">
      <div class="card-title">✅ Critères validés (${ok.length}/7)</div>
      ${ok.map(c=>`<div class="crit"><button class="ctog ok">✓</button>
        <div><div class="clabel">${c.label}</div></div></div>`).join('')}
    </div>`:''}

    ${ko.length?`<div class="card">
      <div class="card-title">❌ Critères échoués (${ko.length})</div>
      ${ko.map(c=>`<div class="crit"><button class="ctog ko">✗</button>
        <div><div class="clabel">${c.label}</div><div class="csub">${c.sub}</div></div></div>`).join('')}
    </div>`:''}

    ${s.observ&&Object.values(s.observ).some(v=>v)?`<div class="card">
      <div class="card-title">👁 Observations 50m NL</div>
      ${[['propulsion','💪 Propulsion efficace'],['equilibre','⚖️ Équilibre horizontal'],
         ['respiration','😮‍💨 Respiration rythmée'],['coordination','🔄 Coordination bras/jambes']]
        .filter(([k])=>s.observ[k])
        .map(([,v])=>`<div class="crit"><button class="ctog ok">✓</button>
          <div class="clabel">${v}</div></div>`).join('')}
    </div>`:''}

    <div class="ebtns" style="margin-top:4px">
      <button class="ebtn gray" onclick="resetEval()">↺ Réévaluer cet élève</button>
    </div>`;
}

function resetEval() {
  showModal('Réévaluer cet élève ? Groupe et données effacés.', () => {
    Object.assign(currentStudent, {groupe:null,etape:0,criteres:{},crawl:null,observ:{},chrono:null});
    save(); refreshEvalHeader(); renderEval(); updateCounts();
    showToast('Évaluation réinitialisée');
  });
}

// ── EXPORT ───────────────────────────────────
function exportClass() {
  if (!currentClass) return;
  const ss = classes[currentClass];
  const data = ss.map(s=>({
    nom:s.nom, prenom:s.prenom, date_naissance:s.ddn||'',
    sexe:s.sexe||'', classe:s.classe, note_eleve:s.note||'',
    groupe_num:s.groupe||'', groupe_label:s.groupe?['','Non nageur','Nageur autonome','Crawl maîtrisé'][s.groupe]:'Non évalué',
    chrono_25m:s.chrono||'', etape:s.etape, criteres:JSON.stringify(s.criteres),
    criteres_echoues:CRITERES.filter(c=>s.criteres[c.id]===false).map(c=>c.label).join(', '),
    observations:Object.entries(s.observ||{}).filter(([,v])=>v).map(([k])=>k).join(', '),
  }));
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`natation_${currentClass}_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  showToast('📤 Export téléchargé');
}

function exportAll() {
  const blob=new Blob([JSON.stringify(classes,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`natation_backup_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  showToast('💾 Backup complet téléchargé');
}

function showBackups() {
  const baks=[];
  for (let i=0;i<localStorage.length;i++) {
    const k=localStorage.key(i);
    if (k&&k.startsWith('natation_bak_')) baks.push(k);
  }
  if (!baks.length) { showToast('Aucun backup disponible'); return; }
  baks.sort().reverse();
  const latest=baks[0];
  const date=latest.replace('natation_bak_','');
  showModal(`Restaurer le backup du ${date} ?\nLes données actuelles seront remplacées.`, ()=>{
    try {
      classes=JSON.parse(localStorage.getItem(latest));
      save(); renderClasses();
      showToast(`✅ Backup du ${date} restauré`);
    } catch(e) { showToast('❌ Erreur lors de la restauration'); }
  });
}

// ── MODAL ────────────────────────────────────
function showModal(msg, onOk) {
  document.getElementById('modal-msg').textContent=msg;
  document.getElementById('modal-ok').onclick=()=>{closeModal();onOk();};
  document.getElementById('modal').classList.remove('hidden');
}
function closeModal() { document.getElementById('modal').classList.add('hidden'); }

// ── TOAST ────────────────────────────────────
function showToast(msg) {
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.add('hidden'),2500);
}

// ── SERVICE WORKER ───────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}

// ── INIT ─────────────────────────────────────
load();
