// ══════════════════════════════════════════════
// NATATION EPS — APP.JS v3.0
// ══════════════════════════════════════════════

let classes    = {};
let curClass   = null;
let curStudent = null;
let curFilter  = 'all';
let importBuf  = [];
let toastTmr   = null;

// ── CRITÈRES SAVOIR NAGER ──
const CRITERES_SN = [
  { id:'c1', label:"Sauter dans l'eau",         sub:"Se mettre à l'eau seul en sautant" },
  { id:'c2', label:"Se déplacer 15m",            sub:"Sans reprise d'appui sur fond ou bords" },
  { id:'c3', label:"Surplace 10 secondes",       sub:"Maintenir la tête hors de l'eau" },
  { id:'c4', label:"Se retourner sur le dos",    sub:"Depuis la position ventrale" },
  { id:'c5', label:"Nager sur le dos 10m",       sub:"En continuité du retournement" },
  { id:'c6', label:"Se retourner sur le ventre", sub:"Depuis la position dorsale" },
  { id:'c7', label:"Sortir de l'eau",            sub:"Sans l'aide de l'échelle" },
];

// ── CRITÈRES TECHNIQUES G3 ──
const TECH_G3 = [
  { id:'plongeon',     ico:'🤽', lbl:'Plongeon',
    niveaux:[
      {v:2, txt:'Gainé · axe · coulée immédiate'},
      {v:1, txt:'Entrée de côté · semi-gainé'},
      {v:0, txt:'Plat · tête relevée · bruit impact'},
    ]},
  { id:'coulee',       ico:'🌊', lbl:'Coulée',
    niveaux:[
      {v:2, txt:'Horizontal · bras tendus · ≥ 5m'},
      {v:1, txt:'Courte 2-4m · corps désaxé'},
      {v:0, txt:'Remontée immédiate · reprise brasse sous l\'eau'},
    ]},
  { id:'propulsion',   ico:'💪', lbl:'Propulsion (bras)',
    niveaux:[
      {v:2, txt:'Traction jusqu\'à la cuisse · recouvrement haut'},
      {v:1, txt:'Traction courte (ventre) · recouvrement bas'},
      {v:0, txt:'Bras en surface · croisé · pas de propulsion'},
    ]},
  { id:'coordination', ico:'🔄', lbl:'Coordination',
    niveaux:[
      {v:2, txt:'6 battements/cycle · régulier · jambes continues'},
      {v:1, txt:'Irrégulier · pauses · genoux cassés'},
      {v:0, txt:'Jambes arrêtées · ciseau · battement brasse'},
    ]},
  { id:'equilibre',    ico:'⚖️', lbl:'Équilibre',
    niveaux:[
      {v:2, txt:'Bassin haut · horizontal · tête dans l\'axe'},
      {v:1, txt:'Bassin semi-immergé · position en Z'},
      {v:0, txt:'Vertical · jambes profondes · marche dans l\'eau'},
    ]},
  { id:'respiration',  ico:'😮‍💨', lbl:'Respiration',
    niveaux:[
      {v:2, txt:'Rotation latérale · expiration eau · rythmée'},
      {v:1, txt:'Tête se soulève · rotation tardive · irrégulier'},
      {v:0, txt:'Tête hors eau · apnée'},
    ]},
];

// ── PERSISTENCE ──────────────────────────────
function save() {
  try {
    const d = JSON.stringify(classes);
    localStorage.setItem('natation_classes', d);
    localStorage.setItem('natation_bak_' + today(), d);
  } catch(e) { showToast('⚠️ Stockage plein'); }
}
function load() {
  try { const r = localStorage.getItem('natation_classes'); if(r) classes = JSON.parse(r); }
  catch(e) { classes = {}; }
}
function today() { return new Date().toISOString().slice(0,10); }
function fmtDate(iso) {
  if (!iso) return '';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
setInterval(() => { if(Object.keys(classes).length) save(); }, 30000);

// ── NAVIGATION ───────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('active');
  if (id === 'screen-classes') renderClasses();
  if (id === 'screen-group')   { renderStudents(); updateCounts(); }
}

// ── IMPORT EXCEL / CSV ───────────────────────
const COL_ALIASES = {
  nom:    ['nom','name','lastname','famille'],
  prenom: ['prenom','prénom','firstname','first'],
  ddn:    ['date_naissance','ddn','naissance','birthdate','né','birth'],
  sexe:   ['sexe','genre','sex','gender'],
  classe: ['classe','class','group','groupe','division','section'],
  note:   ['note_eleve','note','remarque','besoin','observation','handicap','ulis','pap','pps'],
};
function normKey(s) { return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim(); }
function detectCols(headers) {
  const map = {};
  headers.forEach((h,i) => {
    const n = normKey(h);
    Object.entries(COL_ALIASES).forEach(([f,aliases]) => {
      if (map[f] === undefined && aliases.some(a => n.includes(a))) map[f] = i;
    });
  });
  return map;
}
function parseDate(val) {
  if (!val && val !== 0) return '';
  if (typeof val === 'number' && typeof XLSX !== 'undefined') {
    try { const d = XLSX.SSF.parse_date_code(val); if(d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`; } catch(e){}
  }
  const s = String(val).trim();
  // Convertir JJ/MM/AAAA → AAAA-MM-JJ pour stockage ISO
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
}
function makeStudent(d, idx) {
  const nom = (d.nom||'').trim().toUpperCase();
  if (!nom) return null;
  return {
    id: `${Date.now()}_${idx}_${Math.random().toString(36).slice(2,6)}`,
    nom, prenom: (d.prenom||'').trim(),
    ddn: parseDate(d.ddn_raw),
    sexe: (d.sexe||'').trim().toUpperCase().charAt(0),
    classe: (d.classe||'Inconnue').trim(),
    note: (d.note||'').trim(),
    groupe: null, sousGroupe: null,
    etape: 0, criteres: {}, crawl: null,
    evalsTech: [],   // [{ date, scores:{plongeon,coulee,...} }]
    chronos:   [],   // [{ date, temps }]
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
        const wb = XLSX.read(e.target.result, {type:'array', cellDates:false});
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
        if (!data.length) throw new Error('Vide');
        headers = data[0].map(String);
        rows = data.slice(1).filter(r => r.some(c => c !== '' && c !== null));
      }
      const map = detectCols(headers);
      if (map.nom === undefined) { showToast('❌ Colonne "nom" introuvable'); return; }
      importBuf = rows.map((r,i) => {
        const g = f => map[f] !== undefined ? r[map[f]] : '';
        return makeStudent({
          nom: g('nom'), prenom: g('prenom'),
          ddn_raw: map.ddn !== undefined ? r[map.ddn] : '',
          sexe: g('sexe'), classe: g('classe'), note: g('note'),
        }, i);
      }).filter(Boolean);
      if (!importBuf.length) { showToast('❌ Aucun élève trouvé'); return; }
      showPreview();
    } catch(err) { console.error(err); showToast('❌ Erreur lecture fichier'); }
  };
  if (ext === 'csv') reader.readAsText(file, 'UTF-8');
  else reader.readAsArrayBuffer(file);
}
function showPreview() {
  const cls = [...new Set(importBuf.map(s => s.classe))].join(', ');
  document.getElementById('preview-count').textContent = `${importBuf.length} élève(s) · ${cls}`;
  document.getElementById('preview-list').innerHTML =
    importBuf.slice(0,25).map(s => `
      <div class="prev-item">
        ${s.sexe==='F'?'👧':s.sexe==='M'?'👦':'🧑'}
        <span style="flex:1;font-weight:500">${s.prenom} ${s.nom}</span>
        ${s.note ? `<span class="note-badge">⚡ ${s.note}</span>` : ''}
        <span style="color:var(--lite)">${s.classe}</span>
      </div>`).join('')
    + (importBuf.length > 25 ? `<div class="prev-item" style="color:var(--lite)">…et ${importBuf.length-25} autres</div>` : '');
  document.getElementById('import-preview').classList.remove('hidden');
}
function confirmImport() {
  let added=0, skip=0;
  importBuf.forEach(s => {
    if (!classes[s.classe]) classes[s.classe] = [];
    const ex = classes[s.classe].find(e => e.nom===s.nom && e.prenom===s.prenom);
    if (!ex) { classes[s.classe].push(s); added++; } else skip++;
  });
  save();
  importBuf = [];
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
    ['BERNARD','Chloé','22/11/2013','F','6A','ULIS'],
  ]);
  ws['!cols'] = [{wch:18},{wch:14},{wch:16},{wch:6},{wch:8},{wch:30}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Classe');
  XLSX.writeFile(wb, 'modele_classe.xlsx');
  showToast('📥 Modèle téléchargé');
}

// ── CLASSES ──────────────────────────────────
function renderClasses() {
  const el = document.getElementById('classes-list');
  const keys = Object.keys(classes).sort();
  if (!keys.length) {
    el.innerHTML = `<div class="empty"><div class="eico">🏊‍♀️</div><h3>Aucune classe</h3>
      <p>Importez votre première liste.</p>
      <button class="btn-ghost" style="margin-top:14px" onclick="showScreen('screen-import')">📥 Importer</button></div>`;
    return;
  }
  el.innerHTML = keys.map(cls => {
    const ss = classes[cls];
    const g1=ss.filter(s=>s.groupe==='1').length;
    const g2=ss.filter(s=>s.groupe==='2').length;
    const g3a=ss.filter(s=>s.groupe==='3'&&s.sousGroupe==='G3A').length;
    const g3b=ss.filter(s=>s.groupe==='3'&&s.sousGroupe==='G3B').length;
    const pe=ss.filter(s=>!s.groupe).length;
    const pct = Math.round((ss.length-pe)/ss.length*100);
    return `<div class="cls-card" onclick="openClass('${cls}')">
      <div class="cls-ico">🏊</div>
      <div style="flex:1">
        <div class="cls-name">${cls}</div>
        <div class="cls-meta">${ss.length} élève${ss.length>1?'s':''} · ${pct}% évalué${pct>0?'s':''}</div>
        <div class="cls-badges">
          ${g1?`<span class="mbadge g1">G1·${g1}</span>`:''}
          ${g2?`<span class="mbadge g2">G2·${g2}</span>`:''}
          ${g3a?`<span class="mbadge g3a">G3A·${g3a}</span>`:''}
          ${g3b?`<span class="mbadge g3b">G3B·${g3b}</span>`:''}
          ${pe?`<span class="mbadge p">À évaluer·${pe}</span>`:''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        <span style="color:var(--lite);font-size:20px">›</span>
        <button onclick="event.stopPropagation();deleteClass('${cls}')"
          style="background:transparent;border:none;font-size:15px;cursor:pointer;opacity:.35;padding:4px">🗑</button>
      </div>
    </div>`;
  }).join('');
}
function deleteClass(cls) {
  showModal(`Supprimer la classe "${cls}" ?`, () => { delete classes[cls]; save(); renderClasses(); showToast(`Classe ${cls} supprimée`); });
}
function openClass(cls) {
  curClass = cls; curFilter = 'all';
  document.getElementById('group-title').textContent = cls;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  document.getElementById('tab-all').classList.add('on');
  showScreen('screen-group');
}

// ── ÉLÈVES ───────────────────────────────────
function renderStudents() {
  if (!curClass) return;
  const el = document.getElementById('students-list');
  let ss = [...(classes[curClass]||[])];
  if (curFilter==='1') ss=ss.filter(s=>s.groupe==='1');
  else if (curFilter==='2') ss=ss.filter(s=>s.groupe==='2');
  else if (curFilter==='3a') ss=ss.filter(s=>s.groupe==='3'&&s.sousGroupe==='G3A');
  else if (curFilter==='3b') ss=ss.filter(s=>s.groupe==='3'&&s.sousGroupe==='G3B');
  else if (curFilter==='pending') ss=ss.filter(s=>!s.groupe);
  ss.sort((a,b)=>a.nom.localeCompare(b.nom));

  if (!ss.length) {
    el.innerHTML = `<div class="empty"><div class="eico">✓</div><h3>Aucun élève ici</h3></div>`;
    return;
  }
  el.innerHTML = ss.map(s => {
    const {gc,avc,gl,pc} = studentStyle(s);
    const ini = (s.prenom[0]||'').toUpperCase()+(s.nom[0]||'').toUpperCase();
    const lastTech = s.evalsTech && s.evalsTech.length ? s.evalsTech[s.evalsTech.length-1] : null;
    const lastChrono = s.chronos && s.chronos.length ? s.chronos[s.chronos.length-1] : null;
    const sub = s.groupe==='3'
      ? `${lastTech?'Tech ×'+s.evalsTech.length:'Pas de tech'} · ${lastChrono?'⏱ '+lastChrono.temps+'s':'Pas de chrono'}`
      : etapeLabel(s);
    return `<div class="stu-card ${gc}" onclick="openStudent('${s.id}')">
      <div class="avatar ${avc}">${ini}</div>
      <div style="flex:1;min-width:0">
        <div class="stu-name">${s.prenom} ${s.nom}${s.note?' <span style="font-size:11px">⚡</span>':''}</div>
        <div class="stu-sub">${sub}</div>
      </div>
      <span class="gpill ${pc}">${gl}</span>
    </div>`;
  }).join('');
}
function studentStyle(s) {
  if (!s.groupe) return {gc:'pend',avc:'avp',gl:'À évaluer',pc:'p'};
  if (s.groupe==='1') return {gc:'g1',avc:'av1',gl:'Groupe 1',pc:'g1'};
  if (s.groupe==='2') return {gc:'g2',avc:'av2',gl:'Groupe 2',pc:'g2'};
  if (s.sousGroupe==='G3A') return {gc:'g3a',avc:'av3a',gl:'G3A',pc:'g3a'};
  return {gc:'g3b',avc:'av3b',gl:'G3B',pc:'g3b'};
}
function etapeLabel(s) {
  const nb = Object.keys(s.criteres||{}).length;
  if (s.etape===0) return 'Pas encore évalué';
  if (s.etape===1) return `Savoir nager · ${nb}/7 critères`;
  if (s.etape===2) return 'Niveau de nage · à déterminer';
  return '';
}
function filterGroup(g) {
  curFilter = g;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  document.getElementById(`tab-${g}`).classList.add('on');
  renderStudents();
}
function updateCounts() {
  if (!curClass) return;
  const ss = classes[curClass]||[];
  document.getElementById('count-all').textContent = ss.length;
  document.getElementById('count-1').textContent = ss.filter(s=>s.groupe==='1').length;
  document.getElementById('count-2').textContent = ss.filter(s=>s.groupe==='2').length;
  document.getElementById('count-3a').textContent = ss.filter(s=>s.groupe==='3'&&s.sousGroupe==='G3A').length;
  document.getElementById('count-3b').textContent = ss.filter(s=>s.groupe==='3'&&s.sousGroupe==='G3B').length;
  document.getElementById('count-pending').textContent = ss.filter(s=>!s.groupe).length;
}

// ── OUVRIR UN ÉLÈVE ──────────────────────────
function openStudent(id) {
  const ss = classes[curClass]||[];
  curStudent = ss.find(s=>String(s.id)===String(id));
  if (!curStudent) return;
  if (curStudent.groupe==='3') { openFicheG3(); }
  else { openEval(); }
}

// ══════════════════════════════════════════════
// ÉVAL SAVOIR NAGER (G1 / G2 / G3 initial)
// ══════════════════════════════════════════════
function openEval() {
  document.getElementById('eval-back').onclick = () => showScreen('screen-group');
  refreshEvalHeader();
  renderEval();
  showScreen('screen-eval');
}
function refreshEvalHeader() {
  const s = curStudent;
  document.getElementById('eval-name').textContent = `${s.prenom} ${s.nom}`;
  const {pc,gl} = studentStyle(s);
  const badge = document.getElementById('eval-badge');
  badge.textContent = gl; badge.className = `gpill ${pc}`;
  const alert = document.getElementById('eval-alert');
  if (s.note) { alert.textContent='⚡ '+s.note; alert.classList.remove('hidden'); }
  else alert.classList.add('hidden');
}
function renderEval() {
  const s = curStudent;
  const el = document.getElementById('eval-body');
  el.scrollTop = 0;
  if (!s.groupe && s.etape<=1) renderStep1(el);
  else if (!s.groupe && s.etape===2) renderStep2(el);
  else renderRecapSN(el);
}

// ── ÉTAPE 1 : 7 critères ──
function renderStep1(el) {
  const s = curStudent;
  const koCount = CRITERES_SN.filter(c=>s.criteres[c.id]===false).length;
  const done = Object.keys(s.criteres).length;
  el.innerHTML = `
    <div class="steps"><div class="step cur"></div><div class="step"></div></div>
    <div class="eval-card" style="margin-top:12px">
      <div class="eval-card-title">🏊 Test Savoir Nager — 7 critères</div>
      <p style="font-size:12px;color:var(--mid);margin-bottom:10px">Appuyer pour basculer ✓ / ✗ / —</p>
      ${CRITERES_SN.map(c=>{
        const v=s.criteres[c.id];
        const cls=v===true?'ok':v===false?'ko':'';
        return `<div class="crit" onclick="toggleSN('${c.id}')">
          <button class="ctog ${cls}">${v===true?'✓':v===false?'✗':''}</button>
          <div><div class="clabel">${c.label}</div><div class="csub">${c.sub}</div></div>
        </div>`;
      }).join('')}
    </div>
    ${koCount>0?`
      <div class="banner g1"><div class="bico">⚠️</div>
        <div class="btitle">${koCount} critère${koCount>1?'s':''} échoué${koCount>1?'s':''}</div>
        <div class="bsub">Orientation Groupe 1</div>
      </div>
      <div class="ebtns"><button class="ebtn g1c" onclick="setG1()">Valider → Groupe 1</button></div>`:`
      <div class="ebtns">
        <button class="ebtn teal" onclick="validerSN()" ${done<7?'disabled':''}>
          ✓ Tous validés — Étape suivante${done<7?`<br><small style="font-weight:400;font-size:12px">${done}/7 cochés</small>`:''}
        </button>
      </div>`}`;
}
function toggleSN(id) {
  const s=curStudent, v=s.criteres[id];
  if (!v && v!==false) s.criteres[id]=true;
  else if (v===true) s.criteres[id]=false;
  else delete s.criteres[id];
  save(); renderEval();
}
function setG1() { curStudent.groupe='1'; curStudent.etape=99; save(); refreshEvalHeader(); renderEval(); updateCounts(); showToast('✅ Groupe 1 attribué'); }
function validerSN() { curStudent.etape=2; save(); renderEval(); }

// ── ÉTAPE 2 : Crawl ? ──
function renderStep2(el) {
  el.innerHTML = `
    <div class="steps"><div class="step done"></div><div class="step cur"></div></div>
    <div class="eval-card" style="margin-top:12px">
      <div class="eval-card-title">🔍 Affinage — Niveau de nage</div>
      <p style="font-size:14px;color:var(--mid);line-height:1.6;margin-bottom:18px">
        7 critères validés.<br>Sait-il nager le <strong>crawl</strong> de façon identifiable ?
      </p>
      <div class="ebtns">
        <button class="ebtn teal" onclick="setCrawl(true)">✓ Oui — Crawl identifiable<br><small style="font-weight:400;font-size:12px">→ Groupe 3 (tech + chrono)</small></button>
        <button class="ebtn g2c" onclick="setCrawl(false)">✗ Non — Nage hasardeuse<br><small style="font-weight:400;font-size:12px">→ Groupe 2</small></button>
        <button class="ebtn gray" onclick="retourE1()">← Retour aux critères</button>
      </div>
    </div>`;
}
function retourE1() { curStudent.etape=1; save(); renderEval(); }
function setCrawl(v) {
  if (!v) {
    curStudent.groupe='2'; curStudent.crawl=false; curStudent.etape=99;
    save(); refreshEvalHeader(); renderEval(); updateCounts(); showToast('✅ Groupe 2 attribué');
  } else {
    // Demander G3A ou G3B directement
    curStudent.crawl=true;
    renderStep3(document.getElementById('eval-body'));
  }
}
function renderStep3(el) {
  el.innerHTML = `
    <div class="eval-card" style="margin-top:8px">
      <div class="eval-card-title">🌊 Classement initial Groupe 3</div>
      <p style="font-size:14px;color:var(--mid);line-height:1.6;margin-bottom:18px">
        Sur ton observation directe, classe l'élève pour démarrer le cycle.
        Tu pourras affiner via l'évaluation technique détaillée.
      </p>
      <div class="ebtns">
        <button class="ebtn g3a" onclick="setGroupe3('G3A')">
          🌟 G3A — Excellent nageur<br><small style="font-weight:400;font-size:12px">Nageur club · très bonne technique</small>
        </button>
        <button class="ebtn g3b" onclick="setGroupe3('G3B')">
          🏊 G3B — Nageur à affiner<br><small style="font-weight:400;font-size:12px">Crawl présent · technique à consolider</small>
        </button>
        <button class="ebtn gray" onclick="retourE1()">← Retour</button>
      </div>
    </div>`;
}
function setGroupe3(sg) {
  curStudent.groupe='3'; curStudent.sousGroupe=sg; curStudent.etape=99;
  if (!curStudent.evalsTech) curStudent.evalsTech=[];
  if (!curStudent.chronos) curStudent.chronos=[];
  save(); updateCounts(); showToast(`✅ ${sg} attribué`);
  openFicheG3();
}

// ── RÉCAP SAVOIR NAGER ──
function renderRecapSN(el) {
  const s=curStudent;
  const G={'1':{ico:'🚨',title:'Groupe 1 — Non nageur',desc:'Échec au test savoir nager.',c:'g1'},
            '2':{ico:'🏊',title:'Groupe 2 — Nageur autonome',desc:'Crawl non identifiable.',c:'g2'}};
  const g = G[s.groupe] || {ico:'🌊',title:'Groupe 3',desc:'',c:'g3a'};
  const ko=CRITERES_SN.filter(c=>s.criteres[c.id]===false);
  const ok=CRITERES_SN.filter(c=>s.criteres[c.id]===true);
  el.innerHTML = `
    <div class="banner ${g.c}"><div class="bico">${g.ico}</div>
      <div class="btitle">${g.title}</div><div class="bsub">${g.desc}</div>
    </div>
    ${ok.length?`<div class="eval-card"><div class="eval-card-title">✅ Critères validés</div>
      ${ok.map(c=>`<div class="crit"><button class="ctog ok">✓</button><div><div class="clabel">${c.label}</div></div></div>`).join('')}
    </div>`:''}
    ${ko.length?`<div class="eval-card"><div class="eval-card-title">❌ Critères échoués</div>
      ${ko.map(c=>`<div class="crit"><button class="ctog ko">✗</button><div><div class="clabel">${c.label}</div><div class="csub">${c.sub}</div></div></div>`).join('')}
    </div>`:''}
    <div class="ebtns"><button class="ebtn gray" onclick="resetEvalSN()">↺ Réévaluer</button></div>`;
}
function resetEvalSN() {
  showModal('Réévaluer ? Groupe et données effacés.', () => {
    Object.assign(curStudent, {groupe:null,sousGroupe:null,etape:0,criteres:{},crawl:null,evalsTech:[],chronos:[]});
    save(); refreshEvalHeader(); renderEval(); updateCounts(); showToast('Réinitialisé');
  });
}

// ══════════════════════════════════════════════
// FICHE ÉLÈVE G3 — Résumé complet
// ══════════════════════════════════════════════
function openFicheG3() {
  const s = curStudent;
  if (!s.evalsTech) s.evalsTech=[];
  if (!s.chronos) s.chronos=[];
  document.getElementById('g3-name').textContent = `${s.prenom} ${s.nom}`;
  const badge = document.getElementById('g3-badge');
  badge.textContent = s.sousGroupe||'G3';
  badge.className = `gpill ${s.sousGroupe==='G3A'?'g3a':'g3b'}`;
  const alert = document.getElementById('g3-alert');
  if (s.note) { alert.textContent='⚡ '+s.note; alert.classList.remove('hidden'); }
  else alert.classList.add('hidden');
  renderFicheG3();
  showScreen('screen-g3');
}

function renderFicheG3() {
  const s = curStudent;
  const el = document.getElementById('g3-body');
  const evals = s.evalsTech||[];
  const chronos = s.chronos||[];

  // Calcul stats
  const derniereTech = evals.length ? evals[evals.length-1] : null;
  const meilleurChrono = chronos.length ? Math.min(...chronos.map(c=>c.temps)) : null;
  const dernierChrono = chronos.length ? chronos[chronos.length-1] : null;
  const progChrono = chronos.length>=2
    ? chronos[chronos.length-2].temps - chronos[chronos.length-1].temps
    : null;

  // Score tech dernière éval
  let scoreTech = null;
  if (derniereTech) {
    const vals = Object.values(derniereTech.scores);
    scoreTech = vals.reduce((a,b)=>a+b,0);
  }

  // Progression technique (comparer première et dernière éval)
  let progTech = null;
  if (evals.length>=2) {
    const first = Object.values(evals[0].scores).reduce((a,b)=>a+b,0);
    const last  = Object.values(derniereTech.scores).reduce((a,b)=>a+b,0);
    progTech = last - first;
  }

  // Afficher DDN + age
  let ageStr='';
  if (s.ddn) {
    const p=s.ddn.split('-');
    if (p.length===3) {
      const b=new Date(+p[0],+p[1]-1,+p[2]), n=new Date();
      const a=n.getFullYear()-b.getFullYear()-(n<new Date(n.getFullYear(),b.getMonth(),b.getDate())?1:0);
      if (!isNaN(a)) ageStr=`${a} ans`;
    }
  }

  el.innerHTML = `
    <!-- Hero -->
    <div class="fiche-hero">
      <div class="fiche-hero-name">${s.prenom} ${s.nom}</div>
      <div class="fiche-hero-meta">${s.classe}${ageStr?' · '+ageStr:''}${s.sexe?' · '+s.sexe:''}</div>
      <div class="fiche-hero-badges">
        <div class="hero-badge ${s.sousGroupe==='G3A'?'g3a':'g3b'}">${s.sousGroupe||'G3'}</div>
        ${evals.length?`<div class="hero-badge">${evals.length} éval${evals.length>1?'s':''} tech</div>`:''}
        ${chronos.length?`<div class="hero-badge">${chronos.length} chrono${chronos.length>1?'s':''}</div>`:''}
        ${s.note?`<div class="hero-badge alert">⚡ ${s.note}</div>`:''}
      </div>
    </div>

    <!-- Stats résumé -->
    <div class="stat-row">
      <div class="stat-box">
        <div class="stat-val">${scoreTech!==null?scoreTech+'/12':'—'}</div>
        <div class="stat-lbl">Score tech</div>
        ${progTech!==null?`<div class="stat-trend">${progTech>0?'📈':progTech<0?'📉':'➡️'}</div>`:''}
      </div>
      <div class="stat-box">
        <div class="stat-val">${meilleurChrono!==null?meilleurChrono+'s':'—'}</div>
        <div class="stat-lbl">Meilleur 25m</div>
        ${dernierChrono&&meilleurChrono===dernierChrono?`<div class="stat-trend">🏆</div>`:''}
      </div>
      <div class="stat-box">
        <div class="stat-val">${progChrono!==null?(progChrono>0?'-'+progChrono.toFixed(2)+'s':'+'+Math.abs(progChrono).toFixed(2)+'s'):'—'}</div>
        <div class="stat-lbl">Évolution</div>
        ${progChrono!==null?`<div class="stat-trend">${progChrono>0?'📈':progChrono<0?'📉':'➡️'}</div>`:''}
      </div>
    </div>

    <!-- Actions -->
    <div class="ebtns">
      <button class="ebtn teal" onclick="openTechEval()">
        📋 Nouvelle évaluation technique
      </button>
      <button class="ebtn" style="background:var(--navy2)" onclick="changeSousGroupe()">
        ${s.sousGroupe==='G3A'?'⬇ Reclasser en G3B':'⬆ Reclasser en G3A'}
      </button>
    </div>

    <!-- Historique technique -->
    ${evals.length ? `
    <div class="section-title" style="margin-top:6px">📋 Évaluations techniques (${evals.length})</div>
    ${[...evals].reverse().map((ev,i) => {
      const total = Object.values(ev.scores).reduce((a,b)=>a+b,0);
      const idx = evals.length-1-i;
      return `<div class="hist-card" style="border-left-color:${idx===evals.length-1?'var(--teal)':'var(--lite)'}">
        <div class="hist-date">
          ${idx===evals.length-1?'🔵 Dernière · ':''}Séance ${idx+1} — ${fmtDate(ev.date)}
          <span style="float:right;font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--navy)">${total}/12</span>
        </div>
        ${TECH_G3.map(c => {
          const v = ev.scores[c.id];
          const ico = v===2?'🟢':v===1?'🟡':v===0?'🔴':'⚫';
          const w = v===2?100:v===1?55:v===0?20:0;
          const fillCls = v===2?'f2':v===1?'f1':'f0';
          return `<div class="tech-row">
            <span class="tech-ico">${c.ico}</span>
            <span class="tech-lbl">${c.lbl}</span>
            <div class="tech-bar"><div class="tech-fill ${fillCls}" style="width:${w}%"></div></div>
            <span class="tech-dot">${ico}</span>
          </div>`;
        }).join('')}
      </div>`;
    }).join('')}` : `
    <div class="eval-card" style="text-align:center;padding:24px">
      <div style="font-size:32px;margin-bottom:8px">📋</div>
      <p style="font-size:14px;color:var(--mid)">Pas encore d'évaluation technique.<br>Lance la première séance d'observation.</p>
    </div>`}

    <!-- Historique chronos -->
    ${chronos.length ? `
    <div class="section-title" style="margin-top:6px">⏱ Chronos 25m NL (${chronos.length})</div>
    ${[...chronos].reverse().map((ch,i) => {
      const idx = chronos.length-1-i;
      const prev = idx>0 ? chronos[idx-1].temps : null;
      const diff = prev!==null ? prev-ch.temps : null;
      const trend = diff===null?'':diff>0?'📈':diff<0?'📉':'➡️';
      const isBest = ch.temps === meilleurChrono;
      return `<div class="chrono-hist-card">
        <div class="chrono-num">Chrono ${idx+1}</div>
        <div>
          <div class="chrono-val">${ch.temps}<span style="font-size:14px;font-weight:400;color:var(--mid)">s</span>
            ${isBest?'<span style="font-size:14px;margin-left:4px">🏆</span>':''}
          </div>
          <div class="chrono-date">${fmtDate(ch.date)}</div>
        </div>
        <div class="chrono-trend">${trend}</div>
        ${diff!==null?`<div style="font-size:12px;font-weight:600;color:${diff>0?'var(--g3adk)':diff<0?'var(--g1dk)':'var(--mid)'}">
          ${diff>0?'-'+diff.toFixed(2)+'s':'+'+Math.abs(diff).toFixed(2)+'s'}
        </div>`:''}
      </div>`;
    }).join('')}` : `
    <div class="eval-card" style="text-align:center;padding:24px">
      <div style="font-size:32px;margin-bottom:8px">⏱</div>
      <p style="font-size:14px;color:var(--mid)">Pas encore de chrono.<br>Utilise le bouton 🏁 Série depuis la liste.</p>
    </div>`}
  `;
}

function changeSousGroupe() {
  const sg = curStudent.sousGroupe==='G3A' ? 'G3B' : 'G3A';
  showModal(`Reclasser ${curStudent.prenom} en ${sg} ?`, () => {
    curStudent.sousGroupe = sg;
    save(); openFicheG3(); showToast(`✅ Reclassé en ${sg}`);
  });
}

// ══════════════════════════════════════════════
// ÉVALUATION TECHNIQUE G3
// ══════════════════════════════════════════════
let currentTechScores = {};

function openTechEval() {
  currentTechScores = {};
  renderTechEval();
  showScreen('screen-tech');
  document.getElementById('tech-name').textContent = `${curStudent.prenom} ${curStudent.nom}`;
}

function renderTechEval() {
  const el = document.getElementById('tech-body');
  const filled = Object.keys(currentTechScores).length;
  const total  = Object.values(currentTechScores).reduce((a,b)=>a+b,0);
  const suggest = filled===6 ? (total>=9?'G3A':'G3B') : null;

  el.innerHTML = `
    <div class="eval-card" style="margin-top:8px">
      <div class="eval-card-title">👁 Observation 50m NL souple</div>
      <p style="font-size:12px;color:var(--mid);margin-bottom:14px">Sélectionner le comportement observé</p>
      ${TECH_G3.map(c => {
        const val = currentTechScores[c.id];
        return `<div class="crit-block">
          <div class="crit-name">${c.ico} ${c.lbl}</div>
          <div class="crit-btns">
            ${c.niveaux.map(n => {
              const sel = val===n.v;
              const selCls = sel ? `sel-${n.v}` : '';
              const ico = n.v===2?'🟢':n.v===1?'🟡':'🔴';
              return `<button class="crit-btn ${selCls}"
                data-crit="${c.id}" data-val="${n.v}"
                onclick="selectTechCrit('${c.id}',${n.v})">
                ${ico} ${n.txt}
              </button>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- Suggestion -->
    <div id="tech-suggest" style="display:${filled>0?'flex':'none'};background:${suggest?suggest==='G3A'?'var(--g3abg)':'var(--g3bbg)':'var(--gray)'};
      border-radius:12px;padding:13px 15px;margin-bottom:12px;align-items:center;gap:10px">
      <span style="font-size:22px">${suggest?suggest==='G3A'?'🌟':'🏊':'📊'}</span>
      <div>
        <div id="tech-suggest-label" style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700;
          color:${suggest?suggest==='G3A'?'var(--g3adk)':'var(--g3bdk)':'var(--mid)'}">
          ${suggest?'Suggestion : '+suggest:filled+'/6 critères'}
        </div>
        <div id="tech-suggest-score" style="font-size:12px;color:var(--mid)">
          ${suggest?'Score '+total+'/12':''}
        </div>
      </div>
    </div>

    <!-- Valider -->
    <div class="ebtns">
      <button class="ebtn teal" onclick="validerTechEval()" ${filled<6?'disabled':''}>
        ✅ Enregistrer l'évaluation${filled<6?`<br><small style="font-weight:400;font-size:12px">${filled}/6 critères observés</small>`:''}
      </button>
      <button class="ebtn gray" onclick="showScreen('screen-g3')">← Retour</button>
    </div>`;
}

function selectTechCrit(critId, val) {
  currentTechScores[critId] = val;

  // Mise à jour visuelle sans scroll
  document.querySelectorAll(`[data-crit="${critId}"]`).forEach(btn => {
    const bval = parseInt(btn.dataset.val);
    const sel  = bval===val;
    btn.classList.remove('sel-0','sel-1','sel-2');
    if (sel) btn.classList.add(`sel-${bval}`);
  });

  // Mise à jour suggestion
  const filled = Object.keys(currentTechScores).length;
  const total  = Object.values(currentTechScores).reduce((a,b)=>a+b,0);
  const suggest = filled===6 ? (total>=9?'G3A':'G3B') : null;
  const box = document.getElementById('tech-suggest');
  const lbl = document.getElementById('tech-suggest-label');
  const scr = document.getElementById('tech-suggest-score');
  if (box) {
    box.style.display = filled>0 ? 'flex' : 'none';
    box.style.background = suggest ? (suggest==='G3A'?'var(--g3abg)':'var(--g3bbg)') : 'var(--gray)';
    if (lbl) { lbl.textContent = suggest ? 'Suggestion : '+suggest : filled+'/6 critères';
      lbl.style.color = suggest ? (suggest==='G3A'?'var(--g3adk)':'var(--g3bdk)') : 'var(--mid)'; }
    if (scr) scr.textContent = suggest ? 'Score '+total+'/12' : '';
  }

  // Activer/désactiver bouton valider
  const btn = document.querySelector('#tech-body .ebtn.teal');
  if (btn) btn.disabled = filled<6;
}

function validerTechEval() {
  if (Object.keys(currentTechScores).length < 6) { showToast('⚠️ 6 critères requis'); return; }
  if (!curStudent.evalsTech) curStudent.evalsTech=[];
  curStudent.evalsTech.push({ date: today(), scores: {...currentTechScores} });
  save();
  showToast('✅ Évaluation technique enregistrée');
  openFicheG3();
}

// ══════════════════════════════════════════════
// MODE SÉRIE CHRONO
// ══════════════════════════════════════════════
let serie = {
  running: false, startMs: 0, elapsed: 0,
  timer: null, selectedIds: [], temps: {}
};

function openSerie() {
  serie.selectedIds = curStudent && curStudent.groupe==='3' ? [curStudent.id] : [];
  serie.temps = {}; serie.running = false; serie.elapsed = 0;
  clearInterval(serie.timer);
  renderSerie();
  showScreen('screen-serie');
}

function closeSerie() {
  clearInterval(serie.timer);
  serie.running = false;
  showScreen('screen-group');
}

function renderSerie() {
  const el = document.getElementById('serie-body');
  const ss = (classes[curClass]||[]).filter(s=>s.groupe==='3').sort((a,b)=>a.nom.localeCompare(b.nom));

  el.innerHTML = `
    <!-- Chrono -->
    <div class="card" style="text-align:center;padding:20px 16px">
      <div id="serie-time" class="serie-chrono-big ${serie.running?'running':''}">${fmtTime(serie.elapsed)}</div>
      <div style="display:flex;gap:10px;margin-top:14px">
        <button id="btn-chrono-start" onclick="toggleChrono()"
          style="flex:1;background:${serie.running?'var(--g1)':'var(--g3a)'};color:#fff;border:none;
          border-radius:12px;padding:16px;font-family:'DM Sans',sans-serif;font-size:18px;font-weight:700;cursor:pointer">
          ${serie.running?'⏹ Stop':'▶ Go'}
        </button>
        <button onclick="resetSerie()"
          style="background:var(--gray);color:var(--mid);border:none;border-radius:12px;
          padding:16px 20px;font-size:18px;cursor:pointer">↺</button>
      </div>
    </div>

    <!-- Élèves -->
    <div class="card">
      <div class="eval-card-title">🏊 Sélectionner les nageurs <span style="font-size:12px;font-weight:400;color:var(--mid)">(1-4 élèves)</span></div>
      ${ss.length===0 ? '<p style="font-size:13px;color:var(--mid)">Aucun élève G3 dans cette classe.</p>' :
        ss.map(s => {
          const sel = serie.selectedIds.includes(s.id);
          const t   = serie.temps[s.id];
          return `<div class="serie-eleve-row">
            <button class="serie-check ${sel?'sel':''}" onclick="toggleSerieEleve('${s.id}')">${sel?'✓':''}</button>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:600;color:var(--navy)">${s.prenom} ${s.nom}</div>
              <div style="font-size:11px;color:var(--mid)">${s.sousGroupe||'G3'}</div>
            </div>
            ${sel ? `
              ${t ? `<span class="serie-temps-badge">${t}s</span>` : ''}
              <button class="btn-arrivee ${t?'done':''}" onclick="captureTps('${s.id}')">
                ${t?'✓ '+t+'s':'🏁 Arrivée'}
              </button>` : ''}
          </div>`;
        }).join('')}
    </div>

    <!-- Valider -->
    ${Object.keys(serie.temps).length>0 ? `
    <div class="ebtns">
      <button class="ebtn g3a" onclick="validerTemps()">
        ✅ Enregistrer ${Object.keys(serie.temps).length} temps dans les fiches
      </button>
    </div>` : ''}`;
}

function toggleSerieEleve(id) {
  const idx = serie.selectedIds.indexOf(id);
  if (idx>=0) { serie.selectedIds.splice(idx,1); delete serie.temps[id]; }
  else {
    if (serie.selectedIds.length>=4) { showToast('Maximum 4 élèves par série'); return; }
    serie.selectedIds.push(id);
  }
  renderSerie();
}

function toggleChrono() {
  if (serie.running) {
    clearInterval(serie.timer); serie.running=false;
  } else {
    serie.startMs = Date.now() - serie.elapsed*1000; serie.running=true;
    serie.timer = setInterval(()=>{
      serie.elapsed = (Date.now()-serie.startMs)/1000;
      const el=document.getElementById('serie-time');
      if (el) { el.textContent=fmtTime(serie.elapsed); el.classList.add('running'); }
    }, 50);
  }
  const btn=document.getElementById('btn-chrono-start');
  if (btn) { btn.textContent=serie.running?'⏹ Stop':'▶ Go'; btn.style.background=serie.running?'var(--g1)':'var(--g3a)'; }
}

function captureTps(id) {
  const t = Math.round(serie.elapsed*100)/100;
  serie.temps[id] = t;
  renderSerie();
}

function resetSerie() {
  clearInterval(serie.timer); serie.running=false; serie.elapsed=0; serie.temps={};
  const el=document.getElementById('serie-time');
  if (el) { el.textContent=fmtTime(0); el.classList.remove('running'); }
  const btn=document.getElementById('btn-chrono-start');
  if (btn) { btn.textContent='▶ Go'; btn.style.background='var(--g3a)'; }
  renderSerie();
}

function validerTemps() {
  let count=0;
  const dateAuj = today();
  Object.entries(serie.temps).forEach(([id,t]) => {
    const eleve = (classes[curClass]||[]).find(s=>String(s.id)===String(id));
    if (eleve) {
      if (!eleve.chronos) eleve.chronos=[];
      eleve.chronos.push({date:dateAuj, temps:t});
      count++;
    }
  });
  save(); updateCounts();
  showToast(`✅ ${count} temps enregistré${count>1?'s':''}`);
  serie.temps={};
  renderSerie();
}

function fmtTime(s) {
  const sec = s%60;
  const min = Math.floor(s/60);
  return min>0 ? `${min}:${sec.toFixed(2).padStart(5,'0')}` : sec.toFixed(2).padStart(5,'0');
}

// ── EXPORT ───────────────────────────────────
function exportClass() {
  if (!curClass) return;
  const data = (classes[curClass]||[]).map(s=>({
    nom:s.nom, prenom:s.prenom, date_naissance:s.ddn?fmtDate(s.ddn):'',
    sexe:s.sexe||'', classe:s.classe, note_eleve:s.note||'',
    groupe:s.groupe||'', sous_groupe:s.sousGroupe||'',
    nb_evals_tech: (s.evalsTech||[]).length,
    nb_chronos: (s.chronos||[]).length,
    meilleur_chrono: s.chronos&&s.chronos.length ? Math.min(...s.chronos.map(c=>c.temps)) : '',
    dernier_chrono: s.chronos&&s.chronos.length ? s.chronos[s.chronos.length-1].temps : '',
  }));
  dlJSON(data, `natation_${curClass}_${today()}.json`);
  showToast('📤 Export téléchargé');
}
function exportAll() {
  dlJSON(classes, `natation_backup_${today()}.json`);
  showToast('💾 Backup complet téléchargé');
}
function dlJSON(data, name) {
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  a.download=name; document.body.appendChild(a); a.click();
  document.body.removeChild(a); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function showBackups() {
  const baks=[];
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('natation_bak_'))baks.push(k);}
  if(!baks.length){showToast('Aucun backup disponible');return;}
  baks.sort().reverse();
  const latest=baks[0], date=latest.replace('natation_bak_','');
  showModal(`Restaurer le backup du ${date} ?`,()=>{
    try{classes=JSON.parse(localStorage.getItem(latest));save();renderClasses();showToast(`✅ Backup du ${date} restauré`);}
    catch(e){showToast('❌ Erreur restauration');}
  });
}

// ── MODAL / TOAST ─────────────────────────────
function showModal(msg,onOk) {
  document.getElementById('modal-msg').textContent=msg;
  document.getElementById('modal-ok').onclick=()=>{closeModal();onOk();};
  document.getElementById('modal').classList.remove('hidden');
}
function closeModal(){document.getElementById('modal').classList.add('hidden');}
function showToast(msg) {
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.remove('hidden');
  clearTimeout(toastTmr); toastTmr=setTimeout(()=>t.classList.add('hidden'),2500);
}

// ── SERVICE WORKER ────────────────────────────
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));}

// ── INIT ─────────────────────────────────────
load();
