// ══════════════════════════════════════════════
// EPS NATATION — APP.JS v4.0
// ══════════════════════════════════════════════

let classes    = {};
let curClass   = null;
let curStudent = null;
let curModule  = null;  // 'assn' | 'end' | 'vit'
let modTabs    = { assn:'eleves', end:'eleves', vit:'eleves' };
let importBuf  = [];
let toastTmr   = null;

// ── CRITÈRES SAVOIR NAGER — Arrêté 28/02/2022 ──
const CRITERES_SN = [
  { id:'c1', label:"Entrée en chute arrière",         sub:"Depuis le bord, entrer dans l'eau en chute arrière" },
  { id:'c2', label:"Déplacement 3m50 vers obstacle",  sub:"Se déplacer 3m50 en direction de l'obstacle" },
  { id:'c3', label:"Franchir l'obstacle (immersion)",  sub:"Franchir en immersion complète sur 1m50" },
  { id:'c4', label:"20m ventre + surplace 15s",        sub:"Nager 20m ventre · au signal : surplace vertical 15s" },
  { id:'c5', label:"Demi-tour + passage dos",          sub:"Demi-tour sans appui · passer de ventral à dorsal" },
  { id:'c6', label:"20m dos + surplace 15s",           sub:"Nager 20m dos · au signal : surplace horizontal dorsal 15s" },
  { id:'c7', label:"Retour + franchir obstacle",       sub:"Se retourner ventre · franchir à nouveau l'obstacle" },
  { id:'c8', label:"Retour au point de départ",        sub:"Se déplacer ventre jusqu'au point de départ" },
  { id:'c9', label:"Ancrage sécurisé",                 sub:"S'ancrer de manière sécurisée sur un élément fixe" },
];
const ATTITUDES_SN = [
  { id:'a1', label:"Identifier le surveillant",   sub:"Savoir qui alerter en cas de problème" },
  { id:'a2', label:"Règles hygiène et sécurité",  sub:"Connaître les règles de base dans un établissement de bains" },
  { id:'a3', label:"Identifier les environnements", sub:"Savoir pour quels environnements le savoir-nager est adapté" },
];

// ── CRITÈRES TECHNIQUES G3 ──
const TECH_G3 = [
  { id:'plongeon',     ico:'🤽', lbl:'Plongeon',
    niveaux:[{v:2,txt:"Gainé · axe · coulée immédiate"},{v:1,txt:"Entrée de côté · semi-gainé"},{v:0,txt:"Plat · tête relevée · bruit impact"}]},
  { id:'coulee',       ico:'🌊', lbl:'Coulée',
    niveaux:[{v:2,txt:"Horizontal · bras tendus · ≥ 5m"},{v:1,txt:"Courte 2-4m · corps désaxé"},{v:0,txt:"Remontée immédiate · reprise brasse sous l'eau"}]},
  { id:'propulsion',   ico:'💪', lbl:'Propulsion (bras)',
    niveaux:[{v:2,txt:"Traction jusqu'à la cuisse · recouvrement haut"},{v:1,txt:"Traction courte (ventre) · recouvrement bas"},{v:0,txt:"Bras en surface · croisé · pas de propulsion"}]},
  { id:'coordination', ico:'🔄', lbl:'Coordination',
    niveaux:[{v:2,txt:"6 battements/cycle · régulier · jambes continues"},{v:1,txt:"Irrégulier · pauses · genoux cassés"},{v:0,txt:"Jambes arrêtées · ciseau · battement brasse"}]},
  { id:'equilibre',    ico:'⚖️', lbl:'Équilibre',
    niveaux:[{v:2,txt:"Bassin haut · horizontal · tête dans l'axe"},{v:1,txt:"Bassin semi-immergé · position en Z"},{v:0,txt:"Vertical · jambes profondes · marche dans l'eau"}]},
  { id:'respiration',  ico:'😮‍💨', lbl:'Respiration',
    niveaux:[{v:2,txt:"Rotation latérale · expiration eau · rythmée"},{v:1,txt:"Tête se soulève · rotation tardive · irrégulier"},{v:0,txt:"Tête hors eau · apnée"}]},
];

const PRESENCE_VALS = [
  { val:'P', ico:'✅', lbl:'Présent',     cls:'pb-p' },
  { val:'A', ico:'❌', lbl:'Absent',      cls:'pb-a' },
  { val:'D', ico:'🩺', lbl:'Dispensé',   cls:'pb-d' },
  { val:'T', ico:'👕', lbl:'Oubli tenue',cls:'pb-t' },
];

// ── PERSISTENCE ──────────────────────────────
function save() {
  try {
    const d = JSON.stringify(classes);
    localStorage.setItem('natation_classes', d);
    localStorage.setItem('natation_bak_'+today(), d);
  } catch(e) { showToast('⚠️ Stockage plein'); }
}
function load() {
  try { const r=localStorage.getItem('natation_classes'); if(r) classes=JSON.parse(r); }
  catch(e) { classes={}; }
}
function today() { return new Date().toISOString().slice(0,10); }
function fmtDate(iso) {
  if (!iso) return '';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}`;  // format court pour colonnes présences
}
function fmtDateLong(iso) {
  if (!iso) return '';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
setInterval(()=>{ if(Object.keys(classes).length) save(); }, 30000);

// ── NAVIGATION ───────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('active');
  if (id==='screen-classes') renderClasses();
  if (id==='screen-home') updateHomeCounts();
}

// ── MODULES ──────────────────────────────────
function getModuleStudents(mod) {
  const all = Object.values(classes).flat();
  if (mod==='assn') return all.filter(s=>s.groupe==='1'||!s.groupe);
  if (mod==='end')  return all.filter(s=>s.groupe==='2');
  if (mod==='vit')  return all.filter(s=>s.groupe==='3');
  return [];
}

function openModule(mod) {
  curModule = mod;
  modTabs[mod] = 'eleves';
  // Réinitialiser les onglets
  document.querySelectorAll(`[id^="${mod}-tab-"]`).forEach(t=>t.classList.remove('on'));
  const tabEl = document.getElementById(`${mod}-tab-eleves`);
  if (tabEl) tabEl.classList.add('on');
  renderModuleTab(mod, 'eleves');
  updateSearchVisibility(mod, 'eleves');
  showScreen(`screen-${mod}`);
}

function switchModTab(mod, tab) {
  modTabs[mod] = tab;
  document.querySelectorAll(`[id^="${mod}-tab-"]`).forEach(t=>t.classList.remove('on'));
  const tabEl = document.getElementById(`${mod}-tab-${tab}`);
  if (tabEl) tabEl.classList.add('on');
  updateSearchVisibility(mod, tab);
  renderModuleTab(mod, tab);
}

function renderModuleTab(mod, tab) {
  const el = document.getElementById(`${mod}-body`);
  if (!el) return;
  if (tab==='eleves') renderModuleEleves(mod, el);
  else if (tab==='presences') renderPresencesTable(mod, el);
  else if (tab==='serie') { renderSerieInline(el); }
  else if (tab==='diag')  renderEvalDiag(el);
  else if (tab==='bilan') renderBilanVitesse(el);

}

function updateHomeCounts() {
  const all = Object.values(classes).flat();
  const g1  = all.filter(s=>s.groupe==='1'||!s.groupe);
  const g2  = all.filter(s=>s.groupe==='2');
  const g3  = all.filter(s=>s.groupe==='3');
  const g3a = g3.filter(s=>s.sousGroupe==='G3A');
  const g3b = g3.filter(s=>s.sousGroupe==='G3B');

  const elAssn = document.getElementById('mod-count-assn');
  const elEnd  = document.getElementById('mod-count-end');
  const elVit  = document.getElementById('mod-count-vit');

  if (elAssn) elAssn.textContent = g1.length ? `${g1.length} élève${g1.length>1?'s':''} · G1` : 'Aucun élève';
  if (elEnd)  elEnd.textContent  = g2.length ? `${g2.length} élève${g2.length>1?'s':''} · G2` : 'Aucun élève';
  if (elVit)  elVit.textContent  = g3.length ? `${g3.length} élève${g3.length>1?'s':''} · G3A: ${g3a.length} · G3B: ${g3b.length}` : 'Aucun élève';
}

// ── ÉLÈVES PAR MODULE ─────────────────────────
function renderModuleEleves(mod, el) {
  if (mod==='assn') { renderAssnEleves(el); return; }
  let ss = getModuleStudents(mod).sort((a,b)=>a.nom.localeCompare(b.nom));
  ss = filterBySearch(ss, mod);

  if (mod==='end') {
    if (!ss.length) {
      el.innerHTML = `<div class="empty"><div class="eico">🏃</div><h3>Aucun élève G2</h3>
        <p>Les élèves orientés Natation d'Endurance apparaîtront ici.</p></div>`;
      return;
    }
    el.innerHTML = ss.map(s=>renderStuCard(s, mod)).join('');
    return;
  }

  if (!ss.length) {
    const msgs = {
      assn: 'Les élèves non encore évalués et ceux du Groupe 1 apparaîtront ici.',
      vit:  'Les élèves orientés Natation de Vitesse (G3A/G3B) apparaîtront ici.',
    };
    el.innerHTML = `<div class="empty"><div class="eico">${mod==='assn'?'🏊':'⚡'}</div>
      <h3>Aucun élève</h3><p>${msgs[mod]||''}</p></div>`;
    return;
  }
  el.innerHTML = ss.map(s=>renderStuCard(s, mod)).join('');
}

function renderStuCard(s, mod) {
  const {gc,avc,gl,pc} = studentStyle(s);
  const ini = (s.prenom[0]||'').toUpperCase()+(s.nom[0]||'').toUpperCase();
  const lastTech   = s.evalsTech&&s.evalsTech.length ? s.evalsTech[s.evalsTech.length-1] : null;
  const lastChrono = s.chronos&&s.chronos.length ? s.chronos[s.chronos.length-1] : null;
  const sub = s.groupe==='3'
    ? (s.sousGroupe||'G3')+' · '+(lastTech?'Tech ×'+s.evalsTech.length:'Pas de tech')+' · '+(lastChrono?'⏱ '+lastChrono.temps+'s':'Pas de chrono')
    : s.groupe==='2' ? 'Natation d\'Endurance'
    : s.groupe==='1' ? 'Savoir Nager · Non nageur'
    : etapeLabel(s);
  return `<div class="stu-card ${gc} stu-open" data-student-id="${s.id}">
    <div class="avatar ${avc}">${ini}</div>
    <div style="flex:1;min-width:0">
      <div class="stu-name">${s.prenom} ${s.nom}${s.note?' <span style="font-size:11px">⚡</span>':''}</div>
      <div class="stu-sub">${sub}</div>
    </div>
    <span class="gpill ${pc}">${gl}</span>
  </div>`;
}

function studentStyle(s) {
  if (!s.groupe) return {gc:'pend',avc:'avp',gl:'À évaluer',pc:'p'};
  if (s.groupe==='1') return {gc:'g1',avc:'av1',gl:'G1 · ASSN',pc:'g1'};
  if (s.groupe==='2') return {gc:'g2',avc:'av2',gl:'G2 · Endurance',pc:'g2'};
  if (s.sousGroupe==='G3A') return {gc:'g3a',avc:'av3a',gl:'G3A · Vitesse',pc:'g3a'};
  return {gc:'g3b',avc:'av3b',gl:'G3B · Vitesse',pc:'g3b'};
}

function etapeLabel(s) {
  const nb=Object.keys(s.criteres||{}).length;
  if (s.etape===0) return 'Pas encore évalué';
  if (s.etape===1) return `Parcours ASSN · ${nb}/9 étapes`;
  if (s.etape===2) return 'Niveau de nage · à déterminer';
  return '';
}

// ── PRÉSENCES TABLE ───────────────────────────
function renderPresencesTable(mod, el) {
  const ss = getModuleStudents(mod).sort((a,b)=>a.nom.localeCompare(b.nom));

  // Collecter les dates existantes (présences + séances créées manuellement)
  const datesSet = new Set();
  ss.forEach(s=>Object.keys(s.presences||{}).forEach(d=>datesSet.add(d)));
  // Ajouter les séances créées manuellement (même sans présence cochée)
  if (classes._seancesDates && classes._seancesDates[mod])
    classes._seancesDates[mod].forEach(d=>datesSet.add(d));
  const dates = [...datesSet].sort();

  if (!ss.length) {
    el.innerHTML = `<div class="empty"><div class="eico">📋</div><h3>Aucun élève</h3></div>`;
    return;
  }

  el.innerHTML = `
    <!-- Bouton nouvelle séance -->
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
      <button onclick="presNouvSeance('${mod}')"
        style="background:var(--teal);color:#fff;border:none;border-radius:10px;
        padding:10px 16px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;cursor:pointer">
        ＋ Nouvelle séance
      </button>
      ${dates.length?`<span style="font-size:11px;color:var(--mid)">${dates.length} séance${dates.length>1?'s':''} enregistrée${dates.length>1?'s':''}</span>`:'<span style="font-size:11px;color:var(--mid)">Aucune séance encore</span>'}
    </div>

    ${!dates.length ? `
    <div class="eval-card" style="text-align:center;padding:24px">
      <div style="font-size:32px;margin-bottom:8px">📋</div>
      <p style="font-size:13px;color:var(--mid)">Aucune séance enregistrée.<br>Appuie sur <strong>+ Nouvelle séance</strong> pour commencer l'appel.</p>
    </div>` : `
    <div class="pres-table-wrap">
      <table class="pres-table">
        <thead>
          <tr>
            <th class="name-col">Élève</th>
            ${dates.map(d=>`<th>
              <div>${fmtDate(d)}</div>
              <button onclick="presDelColonne('${mod}','${d}')"
                title="Supprimer cette séance"
                style="background:rgba(255,255,255,.15);border:none;color:rgba(255,255,255,.7);
                border-radius:4px;padding:1px 5px;font-size:10px;cursor:pointer;margin-top:3px">✕</button>
            </th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${ss.map(s=>`
            <tr>
              <td class="name-col">
                <div>${s.prenom} ${s.nom}</div>
              </td>
              ${dates.map(d=>{
                const val=(s.presences||{})[d]||'';
                const pv = PRESENCE_VALS.find(p=>p.val===val);
                const lbl = pv ? pv.ico+' '+pv.lbl : '—';
                const cls = pv ? 'pres-btn '+pv.cls : 'pres-btn pb-empty';
                return `<td><button class="${cls}" onclick="cyclePresence('${s.id}','${d}')">${lbl}</button></td>`;
              }).join('')}
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`}

    <!-- Légende -->
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
      ${PRESENCE_VALS.map(p=>`
        <span style="background:${p.cls==='pb-p'?'var(--g3abg)':p.cls==='pb-a'?'var(--g1bg)':p.cls==='pb-d'?'var(--g2bg)':'var(--pendbg)'};
          color:${p.cls==='pb-p'?'var(--g3adk)':p.cls==='pb-a'?'var(--g1dk)':p.cls==='pb-d'?'var(--g2dk)':'var(--penddk)'};
          padding:3px 10px;border-radius:8px;font-size:11px;font-weight:600">
          ${p.ico} ${p.lbl}
        </span>`).join('')}
      <span style="font-size:11px;color:var(--mid);margin-left:4px;align-self:center">→ cliquer pour changer</span>
    </div>`;
}

function presNouvSeance(mod) {
  // Modal avec sélecteur de date
  const d = today();
  document.getElementById('modal-msg').innerHTML = `
    <div style="text-align:left">
      <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--navy);margin-bottom:12px">
        Nouvelle séance
      </div>
      <div style="margin-bottom:8px">
        <label style="font-size:12px;font-weight:600;color:var(--mid);display:block;margin-bottom:6px">Date de la séance</label>
        <input type="date" id="pres-date-input" value="${d}"
          style="width:100%;padding:10px;border:2px solid var(--teal);border-radius:10px;
          font-family:'DM Sans',sans-serif;font-size:15px;color:var(--navy);background:#fff;outline:none">
      </div>
    </div>`;
  document.getElementById('modal-ok').textContent = 'Créer la séance';
  document.getElementById('modal-ok').onclick = () => {
    closeModal();
    const input = document.getElementById('pres-date-input');
    const dateVal = input ? input.value : d;
    if (!dateVal) { showToast('Date invalide'); return; }
    // Initialiser la présence pour tous les élèves du module (vide = non marqué)
    const ss = getModuleStudents(mod);
    ss.forEach(s => { if (!s.presences) s.presences={}; });
    save();
    // Ajouter la date et re-render (la colonne apparaît vide)
    // On stocke la date pour que la colonne existe même sans présence marquée
    // On utilise un élève fantôme... non : on ajoute la date dans un Set global par module
    if (!classes._seancesDates) classes._seancesDates = {};
    if (!classes._seancesDates[mod]) classes._seancesDates[mod] = [];
    if (!classes._seancesDates[mod].includes(dateVal)) classes._seancesDates[mod].push(dateVal);
    save();
    showToast('✅ Séance du '+fmtDateLong(dateVal)+' créée');
    switchModTab(mod, 'presences');
  };
  document.querySelector('.m-acts .btn-ghost').onclick = closeModal;
  document.getElementById('modal').classList.remove('hidden');
}

function presDelColonne(mod, dateKey) {
  showModal('Supprimer la séance du '+fmtDateLong(dateKey)+' ? Toutes les présences de cette date seront effacées.', () => {
    const ss = getModuleStudents(mod);
    ss.forEach(s => { if (s.presences) delete s.presences[dateKey]; });
    if (classes._seancesDates && classes._seancesDates[mod])
      classes._seancesDates[mod] = classes._seancesDates[mod].filter(d=>d!==dateKey);
    save();
    switchModTab(mod, 'presences');
    showToast('Séance supprimée');
  });
}

function cyclePresence(studentId, dateKey) {
  const all = Object.values(classes).flat();
  const s   = all.find(e=>String(e.id)===String(studentId));
  if (!s) return;
  if (!s.presences) s.presences={};

  const CYCLE = ['','P','A','D','T'];
  const cur   = s.presences[dateKey]||'';
  const idx   = CYCLE.indexOf(cur);
  const next  = CYCLE[(idx+1)%CYCLE.length];
  if (next==='') delete s.presences[dateKey];
  else s.presences[dateKey]=next;
  save();

  // Mise à jour visuelle sans recréer la table
  const btn = document.querySelector(`[onclick="cyclePresence('${studentId}','${dateKey}')"]`);
  if (btn) {
    const pv = PRESENCE_VALS.find(p=>p.val===next);
    btn.textContent = pv ? pv.ico+' '+pv.lbl : '—';
    btn.className = 'pres-btn '+(pv?pv.cls:'pb-empty');
  }
}

// ── EXPORT PRÉSENCES ─────────────────────────
function exportPresences(mod) {
  const ss = getModuleStudents(mod);
  const datesSet = new Set();
  ss.forEach(s=>Object.keys(s.presences||{}).forEach(d=>datesSet.add(d)));
  const dates = [...datesSet].sort();
  const rows = ss.map(s=>{
    const row={nom:s.nom, prenom:s.prenom, classe:s.classe, groupe:s.sousGroupe||s.groupe||''};
    dates.forEach(d=>{ row[fmtDateLong(d)]=(s.presences||{})[d]||''; });
    return row;
  });
  dlJSON(rows, `presences_${mod}_${today()}.json`);
  showToast('📋 Présences exportées');
}

// ── OUVRIR UN ÉLÈVE ──────────────────────────
function openStudent(id) {
  const all = Object.values(classes).flat();
  curStudent = all.find(s=>String(s.id)===String(id));
  if (!curStudent) return;

  // Trouver la classe de cet élève
  Object.entries(classes).forEach(([cls, ss])=>{
    if (ss.find(s=>String(s.id)===String(id))) curClass=cls;
  });

  if (curStudent.groupe==='3') openFicheG3();
  else if (curStudent.groupe==='2') openFicheG2();
  else openEval();
}

// ══════════════════════════════════════════════
// ÉVAL SAVOIR NAGER
// ══════════════════════════════════════════════
function openEval() {
  const s=curStudent;
  const backMod = s.groupe==='2' ? 'end' : 'assn';
  document.getElementById('eval-back').onclick=()=>{ openModule(backMod); };
  // Couleur header selon module
  document.getElementById('eval-hdr').className = 'hdr '+(s.groupe==='2'?'end':'assn');
  refreshEvalHeader();
  renderEval();
  showScreen('screen-eval');
}

function refreshEvalHeader() {
  const s=curStudent;
  document.getElementById('eval-name').textContent=`${s.prenom} ${s.nom}`;
  const {pc,gl}=studentStyle(s);
  const badge=document.getElementById('eval-badge');
  badge.textContent=gl; badge.className=`gpill ${pc}`;
  const alert=document.getElementById('eval-alert');
  if (s.note){alert.textContent='⚡ '+s.note;alert.classList.remove('hidden');}
  else alert.classList.add('hidden');
}

function renderEval() {
  const s=curStudent;
  const el=document.getElementById('eval-body');
  el.scrollTop=0;
  if (!s.groupe&&s.etape<=1) renderStep1(el);
  else if (!s.groupe&&s.etape===2) renderStep2(el);
  else renderRecapSN(el);
}

function renderStep1(el) {
  const s=curStudent;
  if (!s.criteres) s.criteres={};
  if (!s.attitudes) s.attitudes={};
  const koCount=CRITERES_SN.filter(c=>s.criteres[c.id]===false).length;
  const doneParcours=Object.keys(s.criteres).length;
  const doneAttitudes=Object.keys(s.attitudes).length;
  const allDone=doneParcours===9&&doneAttitudes===3;
  const koAtt=ATTITUDES_SN.filter(a=>s.attitudes[a.id]===false).length;
  const hasKo=koCount>0||koAtt>0;

  el.innerHTML=`
    <div class="steps"><div class="step cur"></div><div class="step"></div></div>
    <div class="eval-card" style="margin-top:10px">
      <div class="eval-card-title">🏊 Parcours Savoir-Nager — Arrêté 28/02/2022</div>
      <p style="font-size:11px;color:var(--mid);margin-bottom:8px">Parcours continu · sans appuis · sans lunettes · Appuyer pour cocher</p>
      ${CRITERES_SN.map((c,i)=>{
        const v=s.criteres[c.id];
        const cls=v===true?'ok':v===false?'ko':'';
        return `<div class="crit" onclick="toggleSN('${c.id}')">
          <div style="width:18px;height:18px;border-radius:50%;background:var(--navy);color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${i+1}</div>
          <button class="ctog ${cls}" style="flex-shrink:0">${v===true?'✓':v===false?'✗':''}</button>
          <div><div class="clabel">${c.label}</div><div class="csub">${c.sub}</div></div>
        </div>`;
      }).join('')}
    </div>
    <div class="eval-card">
      <div class="eval-card-title">🧠 Connaissances et attitudes</div>
      ${ATTITUDES_SN.map(a=>{
        const v=s.attitudes[a.id];
        const cls=v===true?'ok':v===false?'ko':'';
        return `<div class="crit" onclick="toggleAttitude('${a.id}')">
          <button class="ctog ${cls}" data-att="${a.id}" style="flex-shrink:0">${v===true?'✓':v===false?'✗':''}</button>
          <div><div class="clabel">${a.label}</div><div class="csub">${a.sub}</div></div>
        </div>`;
      }).join('')}
    </div>
    ${hasKo?`
      <div class="banner g1"><div class="bico">⚠️</div>
        <div class="btitle">${[koCount>0?koCount+' étape'+(koCount>1?'s':'')+' échouée'+(koCount>1?'s':''):'',koAtt>0?koAtt+' attitude'+(koAtt>1?'s':'')+' non maîtrisée'+(koAtt>1?'s':''):''].filter(Boolean).join(' · ')}</div>
        <div class="bsub">Orientation Savoir Nager G1</div>
      </div>
      <div class="ebtns"><button id="btn-go-g1" class="ebtn g1c" onclick="setG1()">Valider → Savoir Nager G1</button></div>`:`
      <div class="ebtns">
        <button id="btn-valider-sn" class="ebtn teal" onclick="validerSN()" ${!allDone?'disabled':''}>
          ✓ Parcours validé — Étape suivante${!allDone?('<br><small style="font-weight:400;font-size:11px">'+doneParcours+'/9 étapes · '+doneAttitudes+'/3 attitudes</small>'):''}
        </button>
      </div>`}`;
}

function toggleSN(id) {
  const s=curStudent;
  if (!s.criteres) s.criteres={};
  const v=s.criteres[id];
  if (v===undefined||v===null) s.criteres[id]=true;
  else if (v===true) s.criteres[id]=false;
  else delete s.criteres[id];
  save(); renderEval();
}

function toggleAttitude(id) {
  const s=curStudent;
  if (!s.attitudes) s.attitudes={};
  const v=s.attitudes[id];
  if (v===undefined||v===null) s.attitudes[id]=true;
  else if (v===true) s.attitudes[id]=false;
  else delete s.attitudes[id];
  save();
  // Mise à jour visuelle sans scroll
  const btn=document.querySelector('[data-att="'+id+'"]');
  if (btn){
    const nv=s.attitudes[id];
    btn.className='ctog'+(nv===true?' ok':nv===false?' ko':'');
    btn.textContent=nv===true?'✓':nv===false?'✗':'';
  }
  const doneParcours=Object.keys(s.criteres||{}).length;
  const doneAttitudes=Object.keys(s.attitudes||{}).length;
  const koAtt=ATTITUDES_SN.filter(a=>s.attitudes[a.id]===false).length;
  const koCount=CRITERES_SN.filter(c=>s.criteres[c.id]===false).length;
  const allDone=doneParcours===9&&doneAttitudes===3;
  const hasKo=koCount>0||koAtt>0;
  const btnV=document.getElementById('btn-valider-sn');
  if (btnV&&!hasKo){
    btnV.disabled=!allDone;
    btnV.innerHTML='✓ Parcours validé — Étape suivante'+(!allDone?('<br><small style="font-weight:400;font-size:11px">'+doneParcours+'/9 étapes · '+doneAttitudes+'/3 attitudes</small>'):'');
  }
}

function setG1(){curStudent.groupe='1';curStudent.etape=99;save();refreshEvalHeader();renderEval();updateHomeCounts();showToast('✅ Orienté Savoir Nager G1');}
function validerSN(){curStudent.etape=2;save();renderEval();}

function renderStep2(el){
  el.innerHTML=`
    <div class="steps"><div class="step done"></div><div class="step cur"></div></div>
    <div class="eval-card" style="margin-top:10px">
      <div class="eval-card-title">🔍 Affinage — Niveau de nage</div>
      <p style="font-size:13px;color:var(--mid);line-height:1.6;margin-bottom:16px">9 étapes validées ✓<br>Sait-il nager le <strong>crawl</strong> de façon identifiable ?</p>
      <div class="ebtns">
        <button class="ebtn teal" onclick="setCrawl(true)">✓ Oui — Crawl identifiable<br><small style="font-weight:400;font-size:11px">→ Natation de Vitesse (G3A/G3B après éval tech)</small></button>
        <button class="ebtn g2c" onclick="setCrawl(false)">✗ Non — Nage hasardeuse<br><small style="font-weight:400;font-size:11px">→ Natation d'Endurance (G2)</small></button>
        <button class="ebtn gray" onclick="()=>{curStudent.etape=1;save();renderEval();}">← Retour</button>
      </div>
    </div>`;
}

function setCrawl(v){
  if(!v){
    curStudent.groupe='2';curStudent.crawl=false;curStudent.etape=99;
    save();refreshEvalHeader();renderEval();updateHomeCounts();showToast('✅ Orienté Endurance G2');
  } else {
    curStudent.crawl=true;
    const el=document.getElementById('eval-body');
    el.innerHTML=`
      <div class="eval-card" style="margin-top:10px">
        <div class="eval-card-title">⚡ Natation de Vitesse — Groupe 3</div>
        <p style="font-size:13px;color:var(--mid);line-height:1.6;margin-bottom:16px">
          Crawl identifiable ✓<br>L'élève est orienté en <strong>Natation de Vitesse</strong>.<br>
          Le classement <strong>G3A / G3B</strong> sera déterminé après la première évaluation technique.
        </p>
        <div class="ebtns">
          <button class="ebtn g3a" onclick="setGroupe3()">✓ Confirmer — Natation de Vitesse<br><small style="font-weight:400;font-size:11px">G3A/G3B défini après éval technique</small></button>
          <button class="ebtn gray" onclick="curStudent.etape=2;save();renderEval()">← Retour</button>
        </div>
      </div>`;
  }
}

function setGroupe3(){
  curStudent.groupe='3';curStudent.sousGroupe='G3B';curStudent.etape=99;
  if(!curStudent.evalsTech) curStudent.evalsTech=[];
  if(!curStudent.chronos) curStudent.chronos=[];
  save();updateHomeCounts();showToast('✅ Orienté Natation de Vitesse');
  openFicheG3();
}

function renderRecapSN(el){
  const s=curStudent;
  const G={'1':{ico:'🚨',title:'Savoir Nager G1',desc:'Échec au parcours savoir-nager officiel.',c:'g1'},
            '2':{ico:'🏃',title:'Endurance G2',desc:"Crawl non identifiable. Orienté Natation d'Endurance.",c:'g2'}};
  const g=G[s.groupe]||{ico:'⚡',title:'Natation de Vitesse',desc:'',c:'g3a'};
  const ko=CRITERES_SN.filter(c=>s.criteres[c.id]===false);
  const ok=CRITERES_SN.filter(c=>s.criteres[c.id]===true);
  const koAtt=ATTITUDES_SN.filter(a=>(s.attitudes||{})[a.id]===false);
  const okAtt=ATTITUDES_SN.filter(a=>(s.attitudes||{})[a.id]===true);
  el.innerHTML=`
    <div class="banner ${g.c}"><div class="bico">${g.ico}</div>
      <div class="btitle">${g.title}</div><div class="bsub">${g.desc}</div>
    </div>
    ${ok.length?`<div class="eval-card"><div class="eval-card-title">✅ Étapes validées (${ok.length}/9)</div>
      ${ok.map(c=>`<div class="crit"><button class="ctog ok">✓</button><div><div class="clabel">${c.label}</div></div></div>`).join('')}
    </div>`:''}
    ${ko.length?`<div class="eval-card"><div class="eval-card-title">❌ Étapes échouées</div>
      ${ko.map(c=>`<div class="crit"><button class="ctog ko">✗</button><div><div class="clabel">${c.label}</div><div class="csub">${c.sub}</div></div></div>`).join('')}
    </div>`:''}
    ${okAtt.length||koAtt.length?`<div class="eval-card"><div class="eval-card-title">🧠 Connaissances et attitudes</div>
      ${okAtt.map(a=>`<div class="crit"><button class="ctog ok">✓</button><div><div class="clabel">${a.label}</div></div></div>`).join('')}
      ${koAtt.map(a=>`<div class="crit"><button class="ctog ko">✗</button><div><div class="clabel">${a.label}</div></div></div>`).join('')}
    </div>`:''}
    <div class="ebtns"><button class="ebtn gray" onclick="resetEvalSN()">↺ Réévaluer</button></div>`;
}

function resetEvalSN(){
  showModal('Réévaluer ? Groupe et données effacés.',()=>{
    Object.assign(curStudent,{groupe:null,sousGroupe:null,etape:0,criteres:{},attitudes:{},crawl:null,evalsTech:[],chronos:[]});
    save();refreshEvalHeader();renderEval();updateHomeCounts();showToast('Réinitialisé');
  });
}

// ══════════════════════════════════════════════
// FICHE G3
// ══════════════════════════════════════════════
function openFicheG3(){
  const s=curStudent;
  if(!s.evalsTech) s.evalsTech=[];
  if(!s.chronos) s.chronos=[];
  document.getElementById('g3-name').textContent=`${s.prenom} ${s.nom}`;
  const badge=document.getElementById('g3-badge');
  badge.textContent=s.sousGroupe||'G3';
  badge.className=`gpill ${s.sousGroupe==='G3A'?'g3a':'g3b'}`;
  const alert=document.getElementById('g3-alert');
  if(s.note){alert.textContent='⚡ '+s.note;alert.classList.remove('hidden');}
  else alert.classList.add('hidden');
  renderFicheG3();
  showScreen('screen-g3');
}

function renderFicheG3(){
  const s=curStudent;
  const el=document.getElementById('g3-body');
  const evals=s.evalsTech||[], chronos=s.chronos||[];
  const lastTech=evals.length?evals[evals.length-1]:null;
  const bestChrono=chronos.length?Math.min(...chronos.map(c=>c.temps)):null;
  const lastChrono=chronos.length?chronos[chronos.length-1]:null;
  const progChrono=chronos.length>=2?chronos[chronos.length-2].temps-chronos[chronos.length-1].temps:null;
  const scoreTech=lastTech?Object.values(lastTech.scores).reduce((a,b)=>a+b,0):null;
  const progTech=evals.length>=2?Object.values(evals[evals.length-1].scores).reduce((a,b)=>a+b,0)-Object.values(evals[0].scores).reduce((a,b)=>a+b,0):null;
  // suggest G3A/G3B
  const suggest=scoreTech!==null?(scoreTech>=9?'G3A':'G3B'):null;
  const showSuggest=suggest&&suggest!==s.sousGroupe;

  let ageStr='';
  if(s.ddn){const p=s.ddn.split('-');if(p.length===3){const b=new Date(+p[0],+p[1]-1,+p[2]),n=new Date();const a=n.getFullYear()-b.getFullYear()-(n<new Date(n.getFullYear(),b.getMonth(),b.getDate())?1:0);if(!isNaN(a))ageStr=`${a} ans`;}}

  el.innerHTML=`
    <div class="fiche-hero">
      <div class="fiche-hero-name">${s.prenom} ${s.nom}</div>
      <div class="fiche-hero-meta">Natation de Vitesse · ${s.classe}${ageStr?' · '+ageStr:''}${s.sexe?' · '+s.sexe:''}</div>
      <div class="fiche-hero-badges">
        <div class="hero-badge ${s.sousGroupe==='G3A'?'g3a':'g3b'}">${s.sousGroupe||'G3'}</div>
        ${evals.length?`<div class="hero-badge">${evals.length} éval${evals.length>1?'s':''} tech</div>`:''}
        ${chronos.length?`<div class="hero-badge">${chronos.length} chrono${chronos.length>1?'s':''}</div>`:''}
        ${s.note?`<div class="hero-badge alert">⚡ ${s.note}</div>`:''}
      </div>
    </div>

    ${showSuggest?`<div style="background:${suggest==='G3A'?'var(--g3abg)':'var(--g3bbg)'};border-radius:10px;padding:10px 14px;margin-bottom:10px;display:flex;align-items:center;gap:10px">
      <span style="font-size:18px">${suggest==='G3A'?'🌟':'🏊'}</span>
      <div style="flex:1"><div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:${suggest==='G3A'?'var(--g3adk)':'var(--g3bdk)'}">Suggestion : ${suggest} (score ${scoreTech}/12)</div>
      <div style="font-size:11px;color:var(--mid)">Actuellement ${s.sousGroupe}</div></div>
      <button onclick="appliquerSuggest('${suggest}')" style="background:${suggest==='G3A'?'var(--g3a)':'var(--g3b)'};color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer">Appliquer</button>
    </div>`:''}

    <div class="stat-row">
      <div class="stat-box">
        <div class="stat-val">${scoreTech!==null?scoreTech+'/12':'—'}</div>
        <div class="stat-lbl">Score tech</div>
        ${progTech!==null?`<div class="stat-trend">${progTech>0?'📈':progTech<0?'📉':'➡️'}</div>`:''}
      </div>
      <div class="stat-box">
        <div class="stat-val">${bestChrono!==null?bestChrono+'s':'—'}</div>
        <div class="stat-lbl">Meilleur 25m</div>
        ${lastChrono&&bestChrono===lastChrono?`<div class="stat-trend">🏆</div>`:''}
      </div>
      <div class="stat-box">
        <div class="stat-val">${progChrono!==null?Math.abs(progChrono).toFixed(2)+'s':'—'}</div>
        <div class="stat-lbl">Évolution</div>
        ${progChrono!==null?`<div class="stat-trend">${progChrono>0?'📈':progChrono<0?'📉':'➡️'}</div>`:''}
      </div>
    </div>

    <div class="ebtns">
      <button class="ebtn teal" onclick="openTechEval()">📋 Nouvelle évaluation technique</button>
      <button class="ebtn" style="background:var(--navy2)" onclick="changeSousGroupe()">
        ${s.sousGroupe==='G3A'?'⬇ Reclasser en G3B':'⬆ Reclasser en G3A'}
      </button>
    </div>

    ${evals.length?`<div class="section-title">📋 Évaluations techniques (${evals.length})</div>
    ${[...evals].reverse().map((ev,i)=>{
      const total=Object.values(ev.scores).reduce((a,b)=>a+b,0);
      const idx=evals.length-1-i;
      return `<div class="hist-card" style="border-left-color:${idx===evals.length-1?'var(--teal)':'var(--lite)'}">
        <div class="hist-date">Séance ${idx+1} — ${fmtDateLong(ev.date)}<span style="font-family:'Inter',sans-serif;font-size:13px;font-weight:700;color:var(--navy)">${total}/12</span></div>
        ${TECH_G3.map(c=>{const v=ev.scores[c.id];const w=v===2?100:v===1?55:20;const fc=v===2?'f2':v===1?'f1':'f0';const dot=v===2?'🟢':v===1?'🟡':'🔴';
          return `<div class="tech-row"><span class="tech-ico">${c.ico}</span><span class="tech-lbl">${c.lbl}</span>
          <div class="tech-bar"><div class="tech-fill ${fc}" style="width:${w}%"></div></div><span class="tech-dot">${dot}</span></div>`;
        }).join('')}
      </div>`;
    }).join('')}`:`<div class="eval-card" style="text-align:center;padding:20px"><div style="font-size:28px;margin-bottom:6px">📋</div><p style="font-size:13px;color:var(--mid)">Pas encore d'évaluation technique.</p></div>`}

    ${chronos.length?`<div class="section-title">⏱ Chronos 25m NL (${chronos.length})</div>
    ${[...chronos].reverse().map((ch,i)=>{
      const idx=chronos.length-1-i;
      const prev=idx>0?chronos[idx-1].temps:null;
      const diff=prev!==null?prev-ch.temps:null;
      const isBest=ch.temps===bestChrono;
      return `<div class="chrono-hist-card">
        <div class="chrono-num">Chrono ${idx+1}</div>
        <div><div class="chrono-val">${ch.temps}<span style="font-size:13px;font-weight:400;color:var(--mid)">s</span>${isBest?' 🏆':''}</div>
        <div class="chrono-date">${fmtDateLong(ch.date)}</div></div>
        <div class="chrono-trend">${diff===null?'':diff>0?'📈':diff<0?'📉':'➡️'}</div>
        ${diff!==null?`<div style="font-size:11px;font-weight:600;color:${diff>0?'var(--g3adk)':diff<0?'var(--g1dk)':'var(--mid)'}">${diff>0?'-':'+'}${Math.abs(diff).toFixed(2)}s</div>`:''}
      </div>`;
    }).join('')}`:`<div class="eval-card" style="text-align:center;padding:20px"><div style="font-size:28px;margin-bottom:6px">⏱</div><p style="font-size:13px;color:var(--mid)">Pas encore de chrono. Utilise le bouton 🏁 Série.</p></div>`}

    <div class="ebtns" style="margin-top:4px">
      <button class="ebtn gray" onclick="resetEvalG3()">↺ Réévaluer cet élève</button>
    </div>`;
}

function appliquerSuggest(sg){
  curStudent.sousGroupe=sg;save();renderFicheG3();showToast('✅ Reclassé en '+sg);
}
function changeSousGroupe(){
  const sg=curStudent.sousGroupe==='G3A'?'G3B':'G3A';
  showModal('Reclasser en '+sg+' ?',()=>{curStudent.sousGroupe=sg;save();openFicheG3();showToast('✅ Reclassé en '+sg);});
}
function resetEvalG3(){
  showModal('Réévaluer ? Groupe et données effacés.',()=>{
    Object.assign(curStudent,{groupe:null,sousGroupe:null,etape:0,criteres:{},attitudes:{},crawl:null,evalsTech:[],chronos:[]});
    save();updateHomeCounts();openModule('assn');showToast('Réinitialisé');
  });
}

// ══════════════════════════════════════════════
// ÉVAL TECHNIQUE G3
// ══════════════════════════════════════════════
let currentTechScores={};

function openTechEval(){
  currentTechScores={};
  document.getElementById('tech-name').textContent=`${curStudent.prenom} ${curStudent.nom}`;
  renderTechEval();
  showScreen('screen-tech');
}

function renderTechEval(){
  const el=document.getElementById('tech-body');
  const filled=Object.keys(currentTechScores).length;
  const total=Object.values(currentTechScores).reduce((a,b)=>a+b,0);
  const suggest=filled===6?(total>=9?'G3A':'G3B'):null;

  el.innerHTML=`
    <div class="eval-card" style="margin-top:8px">
      <div class="eval-card-title">👁 Observation 50m NL souple</div>
      <p style="font-size:11px;color:var(--mid);margin-bottom:12px">Sélectionner le comportement observé</p>
      ${TECH_G3.map(c=>{
        const val=currentTechScores[c.id];
        return `<div class="crit-block">
          <div class="crit-name">${c.ico} ${c.lbl}</div>
          <div class="crit-btns">
            ${c.niveaux.map(n=>{
              const sel=val===n.v;
              return `<button class="crit-btn${sel?' sel-'+n.v:''}" data-crit="${c.id}" data-val="${n.v}" onclick="selectTechCrit('${c.id}',${n.v})">
                ${n.v===2?'🟢':n.v===1?'🟡':'🔴'} ${n.txt}
              </button>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>
    <div id="tech-suggest" style="display:${filled>0?'flex':'none'};background:${suggest?suggest==='G3A'?'var(--g3abg)':'var(--g3bbg)':'var(--gray)'};border-radius:10px;padding:11px 14px;margin-bottom:10px;align-items:center;gap:10px">
      <span style="font-size:20px">${suggest?suggest==='G3A'?'🌟':'🏊':'📊'}</span>
      <div>
        <div id="ts-label" style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:${suggest?suggest==='G3A'?'var(--g3adk)':'var(--g3bdk)':'var(--mid)'}">
          ${suggest?'Suggestion : '+suggest:filled+'/6 critères'}
        </div>
        <div id="ts-score" style="font-size:11px;color:var(--mid)">${suggest?'Score '+total+'/12':''}</div>
      </div>
    </div>
    <div class="ebtns">
      <button class="ebtn teal" onclick="validerTechEval()" ${filled<6?'disabled':''}>
        ✅ Enregistrer l'évaluation${filled<6?('<br><small style="font-weight:400;font-size:11px">'+filled+'/6 critères observés</small>'):''}
      </button>
      <button class="ebtn gray" onclick="showScreen('screen-g3')">← Retour</button>
    </div>`;
}

function selectTechCrit(critId,val){
  currentTechScores[critId]=val;
  document.querySelectorAll('[data-crit="'+critId+'"]').forEach(btn=>{
    const bval=parseInt(btn.dataset.val);
    btn.classList.remove('sel-0','sel-1','sel-2');
    if(bval===val) btn.classList.add('sel-'+bval);
  });
  const filled=Object.keys(currentTechScores).length;
  const total=Object.values(currentTechScores).reduce((a,b)=>a+b,0);
  const suggest=filled===6?(total>=9?'G3A':'G3B'):null;
  const box=document.getElementById('tech-suggest');
  const lbl=document.getElementById('ts-label');
  const scr=document.getElementById('ts-score');
  if(box){
    box.style.display=filled>0?'flex':'none';
    box.style.background=suggest?(suggest==='G3A'?'var(--g3abg)':'var(--g3bbg)'):'var(--gray)';
    if(lbl){lbl.textContent=suggest?'Suggestion : '+suggest:filled+'/6 critères';lbl.style.color=suggest?(suggest==='G3A'?'var(--g3adk)':'var(--g3bdk)'):'var(--mid)';}
    if(scr) scr.textContent=suggest?'Score '+total+'/12':'';
  }
  const btn=document.querySelector('#tech-body .ebtn.teal');
  if(btn) btn.disabled=filled<6;
}

function validerTechEval(){
  if(Object.keys(currentTechScores).length<6){showToast('⚠️ 6 critères requis');return;}
  if(!curStudent.evalsTech) curStudent.evalsTech=[];
  curStudent.evalsTech.push({date:today(),scores:{...currentTechScores}});
  const total=Object.values(currentTechScores).reduce((a,b)=>a+b,0);
  curStudent._techSuggest=total>=9?'G3A':'G3B';
  save();showToast('✅ Évaluation technique enregistrée');
  openFicheG3();
}

// ══════════════════════════════════════════════
// SÉRIE CHRONO
// ══════════════════════════════════════════════
let serie={running:false,startMs:0,elapsed:0,timer:null,selectedIds:[],temps:{}};

function openSerie(){
  serie.selectedIds=curStudent&&curStudent.groupe==='3'?[curStudent.id]:[];
  serie.temps={};serie.running=false;serie.elapsed=0;
  clearInterval(serie.timer);
  renderSerie();
  showScreen('screen-serie');
}
function closeSerie(){clearInterval(serie.timer);serie.running=false;showScreen('screen-vit');}

function renderSerie(){
  const el=document.getElementById('serie-body');
  const all=Object.values(classes).flat();
  const ss=all.filter(s=>s.groupe==='3').sort((a,b)=>a.nom.localeCompare(b.nom));

  el.innerHTML=`
    <div class="card" style="text-align:center;padding:18px 14px">
      <div id="serie-time" class="serie-chrono-big ${serie.running?'running':''}">${fmtTime(serie.elapsed)}</div>
      <div style="display:flex;gap:9px;margin-top:12px">
        <button id="btn-start" onclick="toggleChrono()" style="flex:1;background:${serie.running?'var(--g1)':'var(--g3a)'};color:#fff;border:none;border-radius:10px;padding:14px;font-family:'DM Sans',sans-serif;font-size:17px;font-weight:700;cursor:pointer">${serie.running?'⏹ Stop':'▶ Go'}</button>
        <button onclick="resetSerie()" style="background:var(--gray);color:var(--mid);border:none;border-radius:10px;padding:14px 18px;font-size:17px;cursor:pointer">↺</button>
      </div>
    </div>
    <div class="card">
      <div class="eval-card-title">🏊 Sélectionner les nageurs <span style="font-size:11px;font-weight:400;color:var(--mid)">(1-4)</span></div>
      ${ss.length===0?'<p style="font-size:13px;color:var(--mid)">Aucun élève G3.</p>':ss.map(s=>{
        const sel=serie.selectedIds.includes(s.id);
        const t=serie.temps[s.id];
        return `<div class="serie-eleve-row">
          <button class="serie-check ${sel?'sel':''}" onclick="toggleSerieEleve('${s.id}')">${sel?'✓':''}</button>
          <div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--navy)">${s.prenom} ${s.nom}</div>
          <div style="font-size:11px;color:var(--mid)">${s.sousGroupe||'G3'}</div></div>
          ${sel?`${t?`<span class="serie-temps-badge">${t}s</span>`:''}
          <button class="btn-arrivee ${t?'done':''}" onclick="captureTps('${s.id}')">${t?'✓ '+t+'s':'🏁 Arrivée'}</button>`:''}
        </div>`;
      }).join('')}
    </div>
    ${Object.keys(serie.temps).length>0?`
    <div class="ebtns">
      <button class="ebtn g3a" onclick="validerTemps()">✅ Enregistrer ${Object.keys(serie.temps).length} temps</button>
    </div>`:''}`;
}

function toggleSerieEleve(id){
  const idx=serie.selectedIds.indexOf(id);
  if(idx>=0){serie.selectedIds.splice(idx,1);delete serie.temps[id];}
  else{if(serie.selectedIds.length>=4){showToast('Maximum 4 élèves');return;}serie.selectedIds.push(id);}
  renderSerie();
}
function toggleChrono(){
  if(serie.running){clearInterval(serie.timer);serie.running=false;}
  else{serie.startMs=Date.now()-serie.elapsed*1000;serie.running=true;
    serie.timer=setInterval(()=>{serie.elapsed=(Date.now()-serie.startMs)/1000;
      const el=document.getElementById('serie-time');if(el){el.textContent=fmtTime(serie.elapsed);el.classList.add('running');}},50);}
  const btn=document.getElementById('btn-start');
  if(btn){btn.textContent=serie.running?'⏹ Stop':'▶ Go';btn.style.background=serie.running?'var(--g1)':'var(--g3a)';}
}
function captureTps(id){serie.temps[id]=Math.round(serie.elapsed*100)/100;renderSerie();}
function resetSerie(){clearInterval(serie.timer);serie.running=false;serie.elapsed=0;serie.temps={};
  const el=document.getElementById('serie-time');if(el){el.textContent=fmtTime(0);el.classList.remove('running');}
  const btn=document.getElementById('btn-start');if(btn){btn.textContent='▶ Go';btn.style.background='var(--g3a)';}
  renderSerie();}
function validerTemps(){
  const all=Object.values(classes).flat();
  let count=0;
  Object.entries(serie.temps).forEach(([id,t])=>{
    const e=all.find(s=>String(s.id)===String(id));
    if(e){if(!e.chronos)e.chronos=[];e.chronos.push({date:today(),temps:t});count++;}
  });
  save();showToast('✅ '+count+' temps enregistré'+(count>1?'s':''));
  serie.temps={};renderSerie();
}
function fmtTime(s){const sec=s%60,min=Math.floor(s/60);return min>0?`${min}:${sec.toFixed(2).padStart(5,'0')}`:sec.toFixed(2).padStart(5,'0');}

// ── CLASSES (gestion) ─────────────────────────
function renderClasses(){
  const el=document.getElementById('classes-list');
  const keys=Object.keys(classes).sort();
  if(!keys.length){
    el.innerHTML=`<div class="empty"><div class="eico">🗂</div><h3>Aucune classe</h3><p>Importez votre première liste.</p>
      <button class="btn-ghost" style="margin-top:12px" onclick="showScreen('screen-import')">📥 Importer</button></div>`;
    return;
  }
  el.innerHTML=keys.map(cls=>{
    const ss=classes[cls];
    const g1=ss.filter(s=>s.groupe==='1').length,g2=ss.filter(s=>s.groupe==='2').length;
    const g3a=ss.filter(s=>s.groupe==='3'&&s.sousGroupe==='G3A').length;
    const g3b=ss.filter(s=>s.groupe==='3'&&s.sousGroupe==='G3B').length;
    const pe=ss.filter(s=>!s.groupe).length;
    return `<div class="card" style="display:flex;align-items:center;gap:12px;cursor:pointer" onclick="openClasseDetail('${cls}')">
      <div style="width:40px;height:40px;background:linear-gradient(135deg,var(--navy),var(--navy2));border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🏊</div>
      <div style="flex:1">
        <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--navy)">${cls}</div>
        <div style="font-size:11px;color:var(--mid);margin-top:2px">${ss.length} élève${ss.length>1?'s':''}</div>
        <div style="display:flex;gap:4px;margin-top:5px;flex-wrap:wrap">
          ${g1?`<span style="background:var(--g1bg);color:var(--g1dk);padding:1px 7px;border-radius:6px;font-size:10px;font-weight:700">G1·${g1}</span>`:''}
          ${g2?`<span style="background:var(--g2bg);color:var(--g2dk);padding:1px 7px;border-radius:6px;font-size:10px;font-weight:700">G2·${g2}</span>`:''}
          ${g3a?`<span style="background:var(--g3abg);color:var(--g3adk);padding:1px 7px;border-radius:6px;font-size:10px;font-weight:700">G3A·${g3a}</span>`:''}
          ${g3b?`<span style="background:var(--g3bbg);color:var(--g3bdk);padding:1px 7px;border-radius:6px;font-size:10px;font-weight:700">G3B·${g3b}</span>`:''}
          ${pe?`<span style="background:var(--pendbg);color:var(--penddk);padding:1px 7px;border-radius:6px;font-size:10px;font-weight:700">À évaluer·${pe}</span>`:''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end">
        <span style="color:var(--lite);font-size:18px">›</span>
        <button onclick="event.stopPropagation();deleteClass('${cls}')" style="background:transparent;border:none;font-size:14px;cursor:pointer;opacity:.35">🗑</button>
      </div>
    </div>`;
  }).join('');
}

function openClasseDetail(cls) {
  // Ouvrir directement le module ASSN avec cette classe comme contexte
  curClass = cls;
  openModule('assn');
}

function deleteClass(cls){
  showModal('Supprimer la classe "'+cls+'" ?',()=>{delete classes[cls];save();renderClasses();updateHomeCounts();showToast('Classe supprimée');});
}


function renderAssnEleves(el) {
  const all  = Object.values(classes).flat();
  const q    = (searchQueries['assn']||'').toLowerCase();
  const match = s => !q || (s.nom||'').toLowerCase().includes(q) || (s.prenom||'').toLowerCase().includes(q);
  // À tester = pas de groupe
  const aTester = all.filter(s=>!s.groupe&&match(s)).sort((a,b)=>a.nom.localeCompare(b.nom));
  // G1 = groupe 1
  const g1 = all.filter(s=>s.groupe==='1'&&match(s)).sort((a,b)=>a.nom.localeCompare(b.nom));

  const tab = window._assnTab || 'attester';

  el.innerHTML = `
    <!-- Sous-onglets -->
    <div style="display:flex;gap:6px;margin-bottom:12px">
      <button onclick="window._assnTab='attester';renderAssnEleves(document.getElementById('assn-body'))"
        style="flex:1;padding:9px;border-radius:10px;border:none;cursor:pointer;
        font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;
        background:${tab==='attester'?'var(--pend)':'#fff'};
        color:${tab==='attester'?'#fff':'var(--mid)'};
        box-shadow:0 1px 6px rgba(10,37,64,.08)">
        🕐 À tester <span style="background:rgba(255,255,255,.25);border-radius:6px;padding:1px 7px;font-size:11px">${aTester.length}</span>
      </button>
      <button onclick="window._assnTab='g1';renderAssnEleves(document.getElementById('assn-body'))"
        style="flex:1;padding:9px;border-radius:10px;border:none;cursor:pointer;
        font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;
        background:${tab==='g1'?'var(--g1)':'#fff'};
        color:${tab==='g1'?'#fff':'var(--mid)'};
        box-shadow:0 1px 6px rgba(10,37,64,.08)">
        🚨 G1 Non nageurs <span style="background:rgba(255,255,255,.25);border-radius:6px;padding:1px 7px;font-size:11px">${g1.length}</span>
      </button>
    </div>

    ${tab==='attester' ? `
      ${!aTester.length ? `
        <div class="empty">
          <div class="eico">✅</div>
          <h3>Tous évalués !</h3>
          <p>Aucun élève en attente de test ASSN.</p>
        </div>` :
        aTester.map(s=>{
          const ini=(s.prenom[0]||'').toUpperCase()+(s.nom[0]||'').toUpperCase();
          return `<div class="stu-card pend stu-open" data-student-id="${s.id}">
            <div class="avatar avp">${ini}</div>
            <div style="flex:1;min-width:0">
              <div class="stu-name">${s.prenom} ${s.nom}${s.note?' <span style="font-size:11px">⚡</span>':''}</div>
              <div class="stu-sub">${s.classe} · Parcours ASSN à réaliser</div>
            </div>
            <span class="gpill p">À tester</span>
          </div>`;
        }).join('')}` : `
      ${!g1.length ? `
        <div class="empty">
          <div class="eico">🎉</div>
          <h3>Aucun élève G1</h3>
          <p>Tous les élèves testés ont validé le savoir nager.</p>
        </div>` :
        g1.map(s=>{
          const ini=(s.prenom[0]||'').toUpperCase()+(s.nom[0]||'').toUpperCase();
          const ko=Object.entries(s.criteres||{}).filter(([,v])=>v===false).length;
          const koAtt=Object.entries(s.attitudes||{}).filter(([,v])=>v===false).length;
          return `<div class="stu-card g1 stu-open" data-student-id="${s.id}">
            <div class="avatar av1">${ini}</div>
            <div style="flex:1;min-width:0">
              <div class="stu-name">${s.prenom} ${s.nom}${s.note?' <span style="font-size:11px">⚡</span>':''}</div>
              <div class="stu-sub">${s.classe} · ${ko>0?ko+' étape'+(ko>1?'s':'')+ ' échouée'+(ko>1?'s':''):''}${koAtt>0?' · '+koAtt+' attitude'+(koAtt>1?'s':'')+' non maîtrisée'+(koAtt>1?'s':''):''}</div>
            </div>
            <span class="gpill g1">G1</span>
          </div>`;
        }).join('')}
    `}`;
}


// ══════════════════════════════════════════════
// RECHERCHE RAPIDE D'ÉLÈVE
// ══════════════════════════════════════════════

let searchQueries = { assn:'', end:'', vit:'' };

function searchEleve(mod, query) {
  searchQueries[mod] = query.toLowerCase().trim();
  const clearBtn = document.getElementById(mod+'-search-clear');
  if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';
  renderModuleTab(mod, modTabs[mod]);
}

function clearSearch(mod) {
  searchQueries[mod] = '';
  const input = document.getElementById(mod+'-search-input');
  if (input) input.value = '';
  const clearBtn = document.getElementById(mod+'-search-clear');
  if (clearBtn) clearBtn.style.display = 'none';
  renderModuleTab(mod, modTabs[mod]);
}

function filterBySearch(ss, mod) {
  const q = searchQueries[mod] || '';
  if (!q) return ss;
  return ss.filter(s =>
    (s.nom||'').toLowerCase().includes(q) ||
    (s.prenom||'').toLowerCase().includes(q) ||
    (s.classe||'').toLowerCase().includes(q)
  );
}

// Masquer la barre de recherche sur les onglets non-élèves
function updateSearchVisibility(mod, tab) {
  const bar = document.getElementById(mod+'-search-bar');
  if (!bar) return;
  // Visible uniquement sur les onglets élèves et bilan
  const showOn = ['eleves', 'bilan'];
  bar.style.display = showOn.includes(tab) ? 'flex' : 'none';
}

// ── IMPORT ───────────────────────────────────
const COL_ALIASES={
  nom:['nom','name','lastname','famille'],prenom:['prenom','prénom','firstname'],
  ddn:['date_naissance','ddn','naissance','birthdate','né','birth'],
  sexe:['sexe','genre','sex'],classe:['classe','class','group','groupe','division'],
  note:['note_eleve','note','remarque','besoin','observation','handicap','ulis','pap','pps'],
};
function normKey(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
function detectCols(headers){
  const map={};
  headers.forEach((h,i)=>{const n=normKey(h);Object.entries(COL_ALIASES).forEach(([f,al])=>{if(map[f]===undefined&&al.some(a=>n.includes(a)))map[f]=i;});});
  return map;
}
function parseDate(val){
  if(!val&&val!==0)return'';
  if(typeof val==='number'&&typeof XLSX!=='undefined'){try{const d=XLSX.SSF.parse_date_code(val);if(d)return`${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;}catch(e){}}
  const s=String(val).trim();const m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(m)return`${m[3]}-${m[2]}-${m[1]}`;return s;
}
function makeStudent(d,idx){
  const nom=(d.nom||'').trim().toUpperCase();if(!nom)return null;
  return{id:`${Date.now()}_${idx}_${Math.random().toString(36).slice(2,6)}`,
    nom,prenom:(d.prenom||'').trim(),ddn:parseDate(d.ddn_raw),
    sexe:(d.sexe||'').trim().toUpperCase().charAt(0),
    classe:(d.classe||'Inconnue').trim(),note:(d.note||'').trim(),
    groupe:null,sousGroupe:null,etape:0,criteres:{},attitudes:{},crawl:null,
    evalsTech:[],chronos:[],presences:{}};
}
function handleImport(event){
  const file=event.target.files[0];if(!file)return;event.target.value='';
  const ext=file.name.split('.').pop().toLowerCase();const reader=new FileReader();
  reader.onload=e=>{
    try{
      let headers=[],rows=[];
      if(ext==='csv'){const lines=e.target.result.split(/\r?\n/).filter(l=>l.trim());const sep=lines[0].includes(';')?';':',';headers=lines[0].split(sep).map(h=>h.replace(/['"]/g,'').trim());rows=lines.slice(1).map(l=>l.split(sep).map(v=>v.replace(/['"]/g,'').trim()));}
      else{if(typeof XLSX==='undefined'){showToast('❌ Bibliothèque Excel non chargée');return;}const wb=XLSX.read(e.target.result,{type:'array',cellDates:false});const ws=wb.Sheets[wb.SheetNames[0]];const data=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});if(!data.length)throw new Error('Vide');headers=data[0].map(String);rows=data.slice(1).filter(r=>r.some(c=>c!==''&&c!==null));}
      const map=detectCols(headers);if(map.nom===undefined){showToast('❌ Colonne "nom" introuvable');return;}
      importBuf=rows.map((r,i)=>{const g=f=>map[f]!==undefined?r[map[f]]:'';return makeStudent({nom:g('nom'),prenom:g('prenom'),ddn_raw:map.ddn!==undefined?r[map.ddn]:'',sexe:g('sexe'),classe:g('classe'),note:g('note')},i);}).filter(Boolean);
      if(!importBuf.length){showToast('❌ Aucun élève');return;}showPreview();
    }catch(err){console.error(err);showToast('❌ Erreur lecture fichier');}
  };
  if(ext==='csv')reader.readAsText(file,'UTF-8');else reader.readAsArrayBuffer(file);
}
function showPreview(){
  const cls=[...new Set(importBuf.map(s=>s.classe))].join(', ');
  document.getElementById('preview-count').textContent=`${importBuf.length} élève(s) · ${cls}`;
  document.getElementById('preview-list').innerHTML=importBuf.slice(0,25).map(s=>`
    <div class="prev-item">${s.sexe==='F'?'👧':s.sexe==='M'?'👦':'🧑'}<span style="flex:1;font-weight:500">${s.prenom} ${s.nom}</span>
    ${s.note?`<span class="note-badge">⚡ ${s.note}</span>`:''}<span style="color:var(--lite)">${s.classe}</span></div>`).join('')
    +(importBuf.length>25?`<div class="prev-item" style="color:var(--lite)">…et ${importBuf.length-25} autres</div>`:'');
  document.getElementById('import-preview').classList.remove('hidden');
}
function confirmImport(){
  let added=0,skip=0;
  importBuf.forEach(s=>{if(!classes[s.classe])classes[s.classe]=[];const ex=classes[s.classe].find(e=>e.nom===s.nom&&e.prenom===s.prenom);if(!ex){classes[s.classe].push(s);added++;}else skip++;});
  save();importBuf=[];document.getElementById('import-preview').classList.add('hidden');
  updateHomeCounts();showToast(`✅ ${added} élève(s) ajouté(s)${skip?` · ${skip} doublon(s) ignoré(s)`:''}`);showScreen('screen-home');
}
function downloadSample(){
  if(typeof XLSX==='undefined'){showToast('❌ Bibliothèque Excel non chargée');return;}
  const ws=XLSX.utils.aoa_to_sheet([['nom','prenom','date_naissance','sexe','classe','note_eleve'],
    ['DUPONT','Emma','14/03/2013','F','6A',''],['MARTIN','Lucas','07/09/2012','M','6A','PAP - Dyslexie'],['BERNARD','Chloé','22/11/2013','F','6A','ULIS']]);
  ws['!cols']=[{wch:18},{wch:14},{wch:16},{wch:6},{wch:8},{wch:30}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Classe');XLSX.writeFile(wb,'modele_classe.xlsx');showToast('📥 Modèle téléchargé');
}

// ── EXPORT ───────────────────────────────────
function exportAll(){
  // Export complet avec toutes les données
  const data = {
    version: '4.0',
    date: today(),
    classes: classes,
    seancesDates: classes._seancesDates || {},
  };
  dlJSON(data, 'natation_backup_'+today()+'.json');
  showToast('💾 Backup téléchargé');
}

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  event.target.value = '';
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const raw = JSON.parse(e.target.result);
      // Accepter 2 formats : ancien (objet classes direct) ou nouveau (avec version)
      let data, seancesDates = {};
      if (raw.version && raw.classes) {
        data = raw.classes;
        seancesDates = raw.seancesDates || {};
      } else if (typeof raw === 'object' && !Array.isArray(raw)) {
        data = raw;
      } else {
        showToast('❌ Format JSON invalide');
        return;
      }
      const nbClasses = Object.keys(data).filter(k=>k!=='_seancesDates').length;
      const nbEleves  = Object.values(data).filter(v=>Array.isArray(v)).flat().length;

      // Remettre le modal dans son état normal avant d'appeler showModal
      const btnOk    = document.getElementById('modal-ok');
      const btnGhost = document.querySelector('.m-acts .btn-ghost');
      if (btnOk)    { btnOk.style.display=''; btnOk.textContent='Confirmer'; }
      if (btnGhost) { btnGhost.textContent='Annuler'; btnGhost.onclick=closeModal; }

      showModal(
        'Restaurer ce backup ? '+nbClasses+' classe(s) · '+nbEleves+' élève(s). Les données actuelles seront remplacées.',
        () => {
          classes = data;
          if (!classes._seancesDates) classes._seancesDates = seancesDates;
          save();
          renderClasses();
          updateHomeCounts();
          showToast('✅ Backup restauré — '+nbEleves+' élève(s)');
        }
      );
    } catch(e) {
      console.error(e);
      showToast('❌ Fichier JSON invalide');
    }
  };
  reader.readAsText(file, 'UTF-8');
}
function dlJSON(data,name){
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  a.download=name;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function showBackups(){
  // Lister les backups auto disponibles
  const baks=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k&&k.startsWith('natation_bak_'))baks.push(k);
  }
  baks.sort().reverse();

  // Construire le message
  const bakMsg = baks.length
    ? 'Backups automatiques disponibles :\n'+baks.slice(0,5).map(k=>'• '+k.replace('natation_bak_','')).join('\n')
    : 'Aucun backup automatique disponible.';

  document.getElementById('modal-msg').innerHTML = `
    <div style="text-align:left">
      <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--navy);margin-bottom:12px">
        Restaurer les données
      </div>
      <div style="margin-bottom:14px">
        <button onclick="document.getElementById('backup-file-input').click()"
          style="width:100%;background:var(--teal);color:#fff;border:none;border-radius:10px;
          padding:12px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;cursor:pointer;
          display:flex;align-items:center;justify-content:center;gap:8px">
          📂 Charger un fichier JSON
        </button>
        <input type="file" id="backup-file-input" accept=".json" style="display:none"
          onchange="closeModal();importBackup(event)">
      </div>
      ${baks.length ? `
      <div style="border-top:1px solid var(--gray);padding-top:12px">
        <div style="font-size:12px;font-weight:600;color:var(--mid);margin-bottom:8px">BACKUPS AUTOMATIQUES</div>
        ${baks.slice(0,5).map(k=>{
          const date = k.replace('natation_bak_','');
          return `<div style="display:flex;align-items:center;justify-content:space-between;
            padding:7px 0;border-bottom:1px solid var(--gray)">
            <span style="font-size:13px;color:var(--navy)">📅 ${date}</span>
            <button onclick="closeModal();restoreBak('${k}')"
              style="background:var(--navy);color:#fff;border:none;border-radius:7px;
              padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer">
              Restaurer
            </button>
          </div>`;
        }).join('')}
      </div>` : `<div style="font-size:13px;color:var(--mid);text-align:center;padding:8px 0">Aucun backup automatique</div>`}
    </div>`;
  document.getElementById('modal-ok').style.display = 'none';
  document.querySelector('.m-acts .btn-ghost').textContent = 'Fermer';
  document.querySelector('.m-acts .btn-ghost').onclick = () => {
    closeModal();
    // Remettre les boutons dans leur état normal
    document.getElementById('modal-ok').style.display = '';
    document.getElementById('modal-ok').textContent = 'Confirmer';
    document.querySelector('.m-acts .btn-ghost').textContent = 'Annuler';
    document.querySelector('.m-acts .btn-ghost').onclick = closeModal;
  };
  document.getElementById('modal').classList.remove('hidden');
}

function restoreBak(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key));
    // Ancien format = objet classes direct
    if (raw.version && raw.classes) {
      classes = raw.classes;
      if (!classes._seancesDates) classes._seancesDates = raw.seancesDates||{};
    } else {
      classes = raw;
    }
    save(); renderClasses(); updateHomeCounts();
    showToast('✅ Backup du '+key.replace('natation_bak_','')+' restauré');
  } catch(e) { showToast('❌ Erreur restauration'); }
}

// ── MODAL / TOAST ─────────────────────────────
function showModal(msg,onOk){document.getElementById('modal-msg').textContent=msg;document.getElementById('modal-ok').onclick=()=>{closeModal();onOk();};document.getElementById('modal').classList.remove('hidden');}
function closeModal(){document.getElementById('modal').classList.add('hidden');}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.remove('hidden');clearTimeout(toastTmr);toastTmr=setTimeout(()=>t.classList.add('hidden'),2500);}

// ── SW ────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      // Vérifier les mises à jour toutes les 60 secondes
      setInterval(() => reg.update(), 60000);

      // Si une nouvelle version est trouvée → notifier l'utilisateur
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            // Nouvelle version disponible
            showUpdateBanner();
          }
        });
      });
    }).catch(() => {});

    // Rechargement automatique après activation du nouveau SW
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}

function showUpdateBanner() {
  // Bannière discrète en bas de page
  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.style.cssText = `position:fixed;bottom:0;left:0;right:0;z-index:9999;
    background:var(--teal);color:#fff;padding:12px 20px;
    display:flex;align-items:center;justify-content:space-between;
    font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;
    box-shadow:0 -4px 20px rgba(0,0,0,.2);`;
  banner.innerHTML = `
    <span>🔄 Nouvelle version disponible</span>
    <button onclick="applyUpdate()" style="background:rgba(255,255,255,.25);border:none;
      border-radius:8px;padding:6px 14px;color:#fff;font-family:'DM Sans',sans-serif;
      font-size:13px;font-weight:700;cursor:pointer">Mettre à jour</button>`;
  document.body.appendChild(banner);
}

function applyUpdate() {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage('SKIP_WAITING');
  }
  const banner = document.getElementById('update-banner');
  if (banner) banner.remove();
}



// ══════════════════════════════════════════════
// ÉVALUATION FINALE VITESSE
// ══════════════════════════════════════════════

const EVAL_CRITERES = [
  { id:'entree',       lbl:"Entrée dans l'eau", max:2, ico:'🤽',
    niveaux:[
      {n:1, ico:'🔴', txt:"Plat · tête relevée · bruit impact",            pts:0.5},
      {n:2, ico:'🟠', txt:"Entrée de côté · semi-gainé",                    pts:1.0},
      {n:3, ico:'🟡', txt:"Gainé · axe correct · légère déviation",         pts:1.5},
      {n:4, ico:'🟢', txt:"Gainé · axe parfait · entrée silencieuse",       pts:2.0},
    ]},
  { id:'coulee',       lbl:'Coulée', max:1, ico:'🌊',
    niveaux:[
      {n:1, ico:'🔴', txt:"Remontée immédiate · reprise brasse sous l'eau", pts:0.25},
      {n:2, ico:'🟠', txt:"Courte 2-4m · corps désaxé",                    pts:0.5},
      {n:3, ico:'🟡', txt:"5-7m · horizontal · quelques corrections",        pts:0.75},
      {n:4, ico:'🟢', txt:"≥ 7m · corps horizontal · bras tendus",          pts:1.0},
    ]},
  { id:'propulsion',   lbl:'Propulsion (bras)', max:4, ico:'💪',
    niveaux:[
      {n:1, ico:'🔴', txt:"Bras en surface · croisé · pas de propulsion",   pts:1.0},
      {n:2, ico:'🟠', txt:"Traction courte (ventre) · recouvrement bas",    pts:2.0},
      {n:3, ico:'🟡', txt:"Traction correcte · recouvrement moyen",          pts:3.0},
      {n:4, ico:'🟢', txt:"Traction cuisse · recouvrement haut · efficace", pts:4.0},
    ]},
  { id:'equilibre',    lbl:'Équilibre', max:2, ico:'⚖️',
    niveaux:[
      {n:1, ico:'🔴', txt:"Vertical · jambes profondes · marche dans l'eau",pts:0.5},
      {n:2, ico:'🟠', txt:"Bassin semi-immergé · position en Z",             pts:1.0},
      {n:3, ico:'🟡', txt:"Quasi-horizontal · légère désaxation",            pts:1.5},
      {n:4, ico:'🟢', txt:"Bassin haut · parfaitement horizontal",           pts:2.0},
    ]},
  { id:'respiration',  lbl:'Respiration', max:2, ico:'😮‍💨',
    niveaux:[
      {n:1, ico:'🔴', txt:"Tête hors eau · apnée",                          pts:0.5},
      {n:2, ico:'🟠', txt:"Tête se soulève · rotation tardive",              pts:1.0},
      {n:3, ico:'🟡', txt:"Rotation latérale · rythme irrégulier",           pts:1.5},
      {n:4, ico:'🟢', txt:"Rotation dans l'axe · expiration eau · rythmée", pts:2.0},
    ]},
  { id:'coordination', lbl:'Coordination', max:2, ico:'🔄',
    niveaux:[
      {n:1, ico:'🔴', txt:"Jambes arrêtées · ciseau · battement brasse",    pts:0.5},
      {n:2, ico:'🟠', txt:"Irrégulier · pauses · genoux cassés",             pts:1.0},
      {n:3, ico:'🟡', txt:"Battements présents · quelques irrégularités",    pts:1.5},
      {n:4, ico:'🟢', txt:"6 battements/cycle · régulier · continu",         pts:2.0},
    ]},
  { id:'investissement', lbl:'Investissement', max:1.5, ico:'💯',
    niveaux:[
      {n:1, ico:'🔴', txt:"Pas d'effort · évitement · désengagé",           pts:0.5},
      {n:2, ico:'🟠', txt:"Effort minimal · participation passive",          pts:0.75},
      {n:3, ico:'🟡', txt:"Impliqué · effort visible · quelques abandons",  pts:1.0},
      {n:4, ico:'🟢', txt:"Très investi · effort maximal · combatif",        pts:1.5},
    ]},
  { id:'securite',     lbl:'Sécurité', max:2, ico:'🛡️',
    niveaux:[
      {n:1, ico:'🔴', txt:"Comportement dangereux · ignorer les règles",    pts:0.5},
      {n:2, ico:'🟠', txt:"Quelques manquements · rappels nécessaires",      pts:1.0},
      {n:3, ico:'🟡', txt:"Globalement correct · vigilance à améliorer",    pts:1.5},
      {n:4, ico:'🟢', txt:"Respect total · comportement exemplaire",         pts:2.0},
    ]},
];

// Total max technique sans perf/prog = 2+1+4+2+2+2+1.5+2 = 16.5 → + perf 3.5 + prog 2 = 22 pts brut → plafonné à 20

// Retourne le temps du chrono le plus ancien (référence éval diag initiale)
function getChronoRef(eleve) {
  if (!eleve.chronos || !eleve.chronos.length) return null;
  // Trier par date croissante et prendre le premier
  const sorted = [...eleve.chronos].sort((a,b) => (a.date||'').localeCompare(b.date||''));
  return sorted[0].temps;
}

function perfNote(t) {
  if (!t) return 0.25;
  if (t <= 18)  return 3.5;
  if (t <= 21)  return 2.75;
  if (t <= 23)  return 2.25;
  if (t <= 25)  return 1.75;
  if (t <= 28)  return 1.25;
  if (t <= 30)  return 0.75;
  return 0.25;
}

function progNote(ts, tf) {
  if (!ts || !tf) return 0.25;
  const pct = (ts - tf) / ts * 100;
  if (tf <= 20) {
    if (pct >= 2) return 2.0; if (pct >= 1) return 1.5;
    if (pct >= 0.5) return 1.0; if (pct > 0) return 0.5; return 0.25;
  } else if (tf <= 23) {
    if (pct >= 5) return 2.0; if (pct >= 3) return 1.5;
    if (pct >= 1.5) return 1.0; if (pct >= 0.5) return 0.5; return 0.25;
  } else if (tf <= 26) {
    if (pct >= 10) return 2.0; if (pct >= 6) return 1.5;
    if (pct >= 3) return 1.0; if (pct >= 1) return 0.5; return 0.25;
  } else {
    if (pct >= 15) return 2.0; if (pct >= 10) return 1.5;
    if (pct >= 5) return 1.0; if (pct >= 2) return 0.5; return 0.25;
  }
}

function calcNoteFinale(eleve, chrono, grille, plongeoir) {
  const perf   = perfNote(chrono);
  const ts     = getChronoRef(eleve); // premier chrono par date (éval diag initiale)
  const prog   = progNote(ts, chrono);
  const bonus  = plongeoir ? 0.5 : 0;
  const tech   = EVAL_CRITERES.reduce((sum, c) => {
    const niv = grille[c.id];
    const pts = niv ? (c.niveaux.find(n => n.n === niv)?.pts || 0) : 0;
    return sum + pts;
  }, 0);
  return Math.min(20, Math.round((perf + prog + tech + bonus) * 100) / 100);
}

// ── État éval finale ──
let evalState = {
  step: 1,
  selectedIds: [],
  chrono: { running: false, startMs: 0, elapsed: 0, timer: null },
  temps: {},
  grilles: {},
  plongeoir: {},
  eleveActif: null,
};

function openEvalFinale() {
  // Stopper tout chrono en cours
  if (evalState.chrono && evalState.chrono.timer) {
    clearInterval(evalState.chrono.timer);
  }
  evalState = {
    step:1, selectedIds:[], temps:{}, grilles:{}, plongeoir:{}, eleveActif:null,
    chrono:{ running:false, startMs:0, elapsed:0, timer:null }
  };
  renderEvalFinale();
  showScreen('screen-eval-finale');
}

function resetEvalFinale() {
  showModal("Recommencer l'évaluation ? Toutes les saisies seront perdues.", () => {
    if (evalState.chrono && evalState.chrono.timer) clearInterval(evalState.chrono.timer);
    evalState = {
      step:1, selectedIds:[], temps:{}, grilles:{}, plongeoir:{}, eleveActif:null,
      chrono:{ running:false, startMs:0, elapsed:0, timer:null }
    };
    renderEvalFinale();
    showToast('Évaluation réinitialisée');
  });
}

function renderEvalFinale() {
  const el = document.getElementById('eval-finale-body');
  if (!el) return;
  el.scrollTop = 0;
  if (evalState.step === 1) renderEFStep1(el);
  else if (evalState.step === 2) renderEFStep2(el);
  else renderEFStep3(el);
}

// ── ÉTAPE 1 : Sélection ──
function renderEFStep1(el) {
  const all = Object.values(classes).flat();
  const g3  = all.filter(s => s.groupe === '3').sort((a,b) => a.nom.localeCompare(b.nom));
  el.innerHTML = `
    <div class="ef-steps">
      <div class="ef-step cur">1 · Sélection</div>
      <div class="ef-step">2 · Chrono + Grille</div>
      <div class="ef-step">3 · Résumé</div>
    </div>
    <div class="eval-card">
      <div class="eval-card-title">🏊 Sélectionner les élèves de la série
        <span style="font-size:11px;font-weight:400;color:var(--mid)">(1 à 4)</span>
      </div>
      ${!g3.length ? '<p style="color:var(--mid);font-size:13px">Aucun élève G3.</p>' :
        g3.map(s => {
          const sel = evalState.selectedIds.includes(s.id);
          const t0  = s.chronos && s.chronos.length ? s.chronos[0].temps+'s (réf)' : 'Pas de chrono référence';
          return `<div class="serie-eleve-row">
            <button class="serie-check ${sel?'sel':''}" onclick="efToggleEleve('${s.id}')">${sel?'✓':''}</button>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600;color:var(--navy)">${s.prenom} ${s.nom}</div>
              <div style="font-size:11px;color:var(--mid)">${s.sousGroupe||'G3'} · ${t0}</div>
            </div>
          </div>`;
        }).join('')}
    </div>
    <div class="ebtns">
      <button class="ebtn teal" onclick="efGoStep2()" ${!evalState.selectedIds.length?'disabled':''}>
        ▶ Démarrer — ${evalState.selectedIds.length} élève${evalState.selectedIds.length>1?'s':''}
      </button>
    </div>`;
}

function efToggleEleve(id) {
  const idx = evalState.selectedIds.indexOf(id);
  if (idx >= 0) {
    evalState.selectedIds.splice(idx, 1);
    delete evalState.grilles[id];
    delete evalState.plongeoir[id];
  } else {
    if (evalState.selectedIds.length >= 4) { showToast('Maximum 4 élèves'); return; }
    evalState.selectedIds.push(id);
    evalState.grilles[id]   = {};
    evalState.plongeoir[id] = false;
  }
  if (evalState.selectedIds.length && !evalState.eleveActif)
    evalState.eleveActif = evalState.selectedIds[0];
  renderEvalFinale();
}

function efGoStep2() {
  if (!evalState.selectedIds.length) return;
  evalState.step = 2;
  evalState.eleveActif = evalState.selectedIds[0];
  renderEvalFinale();
}

// ── ÉTAPE 2 : Chrono + Grille (sans scroll sur sélection critère) ──
function renderEFStep2(el) {
  const all    = Object.values(classes).flat();
  const eleves = evalState.selectedIds.map(id => all.find(s=>String(s.id)===String(id))).filter(Boolean);
  const actif  = all.find(s => String(s.id)===String(evalState.eleveActif));
  const grille = evalState.grilles[evalState.eleveActif] || {};
  const filled = EVAL_CRITERES.filter(c => grille[c.id]).length;
  const total  = EVAL_CRITERES.length; // 8 critères
  const allFilled = evalState.selectedIds.every(id => {
    const g = evalState.grilles[id]||{};
    return EVAL_CRITERES.every(c => g[c.id]);
  });
  const c = evalState.chrono;

  el.innerHTML = `
    <div class="ef-steps">
      <div class="ef-step done">1 · Sélection</div>
      <div class="ef-step cur">2 · Chrono + Grille</div>
      <div class="ef-step">3 · Résumé</div>
    </div>

    <!-- Chrono -->
    <div class="card" style="padding:14px;text-align:center">
      <div id="ef-chrono" class="serie-chrono-big ${c.running?'running':''}">${fmtTime(c.elapsed)}</div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button id="ef-btn-go" onclick="efToggleChrono()"
          style="flex:1;background:${c.running?'var(--g1)':'var(--g3a)'};color:#fff;border:none;
          border-radius:10px;padding:12px;font-size:16px;font-weight:700;cursor:pointer">
          ${c.running?'⏹ Stop':'▶ Go'}
        </button>
        <button onclick="efResetChrono()"
          style="background:var(--gray);color:var(--mid);border:none;border-radius:10px;
          padding:12px 16px;font-size:16px;cursor:pointer">↺</button>
      </div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;justify-content:center">
        ${eleves.map(s => {
          const t = evalState.temps[s.id];
          return `<button onclick="efCapture('${s.id}')"
            style="background:${t?'var(--g3abg)':'var(--navy2)'};
            color:${t?'var(--g3adk)':'#fff'};border:none;border-radius:8px;
            padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer">
            ${t ? '✓ '+t+'s' : '🏁 '+s.prenom}
          </button>`;
        }).join('')}
      </div>
    </div>

    <!-- Onglets élèves -->
    <div style="display:flex;gap:6px;margin-bottom:8px;overflow-x:auto;padding-bottom:2px">
      ${eleves.map(s => {
        const g    = evalState.grilles[s.id]||{};
        const done = EVAL_CRITERES.filter(c=>g[c.id]).length;
        const isA  = String(s.id)===String(evalState.eleveActif);
        const col  = done===EVAL_CRITERES.length?'var(--g3a)':done>0?'var(--g2)':'var(--lite)';
        return `<button onclick="efSetActif('${s.id}')"
          style="flex-shrink:0;padding:7px 12px;border-radius:10px;
          border:2px solid ${isA?'var(--teal)':'transparent'};
          background:${isA?'var(--teal)':'#fff'};color:${isA?'#fff':'var(--navy)'};
          font-family:'DM Sans',sans-serif;font-size:12px;font-weight:700;cursor:pointer;
          box-shadow:0 1px 4px rgba(10,37,64,.1)">
          ${s.prenom}<br>
          <span style="font-size:10px;color:${isA?'rgba(255,255,255,.8)':col}">${done}/${EVAL_CRITERES.length} critères${evalState.temps[s.id]?' · '+evalState.temps[s.id]+'s':''}</span>
        </button>`;
      }).join('')}
    </div>

    <!-- Type départ -->
    <div class="card" style="padding:10px">
      <div style="font-size:11px;font-weight:700;color:var(--mid);margin-bottom:7px;text-transform:uppercase;letter-spacing:.4px">Départ — ${actif?actif.prenom:''}</div>
      <div style="display:flex;gap:8px">
        <button onclick="efSetPlongeoir('${evalState.eleveActif}',false)" data-dep="bord"
          style="flex:1;padding:9px;border-radius:9px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;
          border:2px solid ${!evalState.plongeoir[evalState.eleveActif]?'var(--navy)':'var(--lite)'};
          background:${!evalState.plongeoir[evalState.eleveActif]?'var(--navy)':'#fff'};
          color:${!evalState.plongeoir[evalState.eleveActif]?'#fff':'var(--mid)'}">
          🏊 Bord
        </button>
        <button onclick="efSetPlongeoir('${evalState.eleveActif}',true)" data-dep="plongeoir"
          style="flex:1;padding:9px;border-radius:9px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;
          border:2px solid ${evalState.plongeoir[evalState.eleveActif]?'var(--g3a)':'var(--lite)'};
          background:${evalState.plongeoir[evalState.eleveActif]?'var(--g3abg)':'#fff'};
          color:${evalState.plongeoir[evalState.eleveActif]?'var(--g3adk)':'var(--mid)'}">
          🤿 Plongeoir <span style="font-size:10px">(+0.5)</span>
        </button>
      </div>
    </div>

    <!-- Grille -->
    <div class="eval-card">
      <div class="eval-card-title">
        📋 Grille — ${actif?actif.prenom+' '+actif.nom:''}
      </div>
      ${EVAL_CRITERES.map(c => {
        const sel = grille[c.id];
        return `<div class="crit-block">
          <div class="crit-name">${c.ico} ${c.lbl}
            <span style="font-size:10px;color:var(--mid);font-weight:400;margin-left:auto">/${c.max} pts</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${c.niveaux.map(niv => {
              const isSel = sel===niv.n;
              const bgMap = {1:'var(--ko)',2:'#FFE8D6',3:'var(--partial)',4:'var(--ok)'};
              const fgMap = {1:'var(--kofg)',2:'#9A3412',3:'var(--partfg)',4:'var(--okfg)'};
              return `<button
                data-ef-eleve="${evalState.eleveActif}"
                data-ef-crit="${c.id}"
                data-ef-niv="${niv.n}"
                onclick="efSetNiveau('${evalState.eleveActif}','${c.id}',${niv.n})"
                style="border:none;border-radius:8px;padding:8px 10px;text-align:left;
                font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;
                display:flex;align-items:center;gap:7px;
                background:${isSel?bgMap[niv.n]:'var(--gray)'};
                color:${isSel?fgMap[niv.n]:'var(--mid)'};
                font-weight:${isSel?'700':'400'}">
                <span>${niv.ico}</span>
                <span>N${niv.n} — ${niv.txt}</span>
                <span style="margin-left:auto;font-family:'Inter',sans-serif;font-size:11px;font-weight:700">${niv.pts}pt${niv.pts>1?'s':''}</span>
              </button>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>

    <div class="ebtns">
      <button id="ef-btn-valider" class="ebtn teal" onclick="efGoStep3()" ${!allFilled?'disabled':''}>
        ✅ Valider l'évaluation${!allFilled?'<br><small style="font-weight:400;font-size:11px">Remplir tous les critères pour tous les élèves</small>':''}
      </button>
      <button class="ebtn gray" onclick="evalState.step=1;renderEvalFinale()">← Retour</button>
      <button class="ebtn danger" onclick="resetEvalFinale()" style="background:var(--g1)">↺ Tout réinitialiser</button>
    </div>`;
}

// Sélection critère SANS scroll
function efSetNiveau(eleveId, critId, niv) {
  if (!evalState.grilles[eleveId]) evalState.grilles[eleveId] = {};
  evalState.grilles[eleveId][critId] = niv;

  // Mise à jour visuelle des boutons du critère (sans scroll)
  const bgMap = {1:'var(--ko)',2:'#FFE8D6',3:'var(--partial)',4:'var(--ok)'};
  const fgMap = {1:'var(--kofg)',2:'#9A3412',3:'var(--partfg)',4:'var(--okfg)'};
  document.querySelectorAll(`[data-ef-crit="${critId}"][data-ef-eleve="${eleveId}"]`).forEach(btn => {
    const bNiv = parseInt(btn.dataset.efNiv);
    const isSel = bNiv === niv;
    btn.style.background  = isSel ? bgMap[bNiv] : 'var(--gray)';
    btn.style.color       = isSel ? fgMap[bNiv] : 'var(--mid)';
    btn.style.fontWeight  = isSel ? '700' : '400';
  });

  // Activer bouton valider si tout rempli
  const allFilled = evalState.selectedIds.every(id => {
    const gr = evalState.grilles[id]||{};
    return EVAL_CRITERES.every(c => gr[c.id]);
  });
  const btnV = document.getElementById('ef-btn-valider');
  if (btnV) {
    btnV.disabled = !allFilled;
    btnV.innerHTML = allFilled
      ? "✅ Valider l'évaluation"
      : "✅ Valider l'évaluation<br><small style='font-weight:400;font-size:11px'>Remplir tous les critères pour tous les élèves</small>";
  }
}

function efToggleChrono() {
  const c = evalState.chrono;
  if (c.running) {
    clearInterval(c.timer); c.running = false;
  } else {
    c.startMs = Date.now() - c.elapsed*1000; c.running = true;
    c.timer = setInterval(() => {
      c.elapsed = (Date.now()-c.startMs)/1000;
      const el = document.getElementById('ef-chrono');
      if (el) { el.textContent = fmtTime(c.elapsed); el.classList.add('running'); }
    }, 50);
  }
  const btn = document.getElementById('ef-btn-go');
  if (btn) {
    btn.textContent = c.running ? '⏹ Stop' : '▶ Go';
    btn.style.background = c.running ? 'var(--g1)' : 'var(--g3a)';
  }
}

function efResetChrono() {
  clearInterval(evalState.chrono.timer);
  evalState.chrono = { running:false, startMs:0, elapsed:0, timer:null };
  evalState.temps  = {};
  const el = document.getElementById('ef-chrono');
  if (el) { el.textContent = fmtTime(0); el.classList.remove('running'); }
  const btn = document.getElementById('ef-btn-go');
  if (btn) { btn.textContent = '▶ Go'; btn.style.background = 'var(--g3a)'; }
  // Régénérer les boutons arrivée
  renderEvalFinale();
}

function efCapture(id) {
  evalState.temps[id] = Math.round(evalState.chrono.elapsed * 100) / 100;
  // Mettre à jour seulement le bouton
  const btn = document.querySelector(`[onclick="efCapture('${id}')"]`);
  if (btn) {
    btn.textContent = '✓ '+evalState.temps[id]+'s';
    btn.style.background = 'var(--g3abg)';
    btn.style.color = 'var(--g3adk)';
  }
}

function efSetActif(id) {
  evalState.eleveActif = id;
  renderEvalFinale();
}

function efSetPlongeoir(id, val) {
  evalState.plongeoir[id] = val;
  // Mise à jour visuelle sans scroll
  const btnBord = document.querySelector('[data-dep="bord"]');
  const btnPlo  = document.querySelector('[data-dep="plongeoir"]');
  if (btnBord) {
    btnBord.style.background = !val ? 'var(--navy)' : '#fff';
    btnBord.style.color      = !val ? '#fff' : 'var(--mid)';
    btnBord.style.borderColor= !val ? 'var(--navy)' : 'var(--lite)';
  }
  if (btnPlo) {
    btnPlo.style.background  = val ? 'var(--g3abg)' : '#fff';
    btnPlo.style.color       = val ? 'var(--g3adk)' : 'var(--mid)';
    btnPlo.style.borderColor = val ? 'var(--g3a)'   : 'var(--lite)';
  }
}

function efGoStep3() {
  // Stopper le chrono
  clearInterval(evalState.chrono.timer);
  evalState.chrono.running = false;
  // Enregistrer dans les fiches
  const all = Object.values(classes).flat();
  const dateAuj = today();
  evalState.selectedIds.forEach(id => {
    const eleve = all.find(s => String(s.id)===String(id));
    if (!eleve) return;
    if (!eleve.chronos)   eleve.chronos   = [];
    if (!eleve.evalsTech) eleve.evalsTech = [];
    if (evalState.temps[id])
      eleve.chronos.push({ date:dateAuj, temps:evalState.temps[id], type:'finale' });
    const grille = evalState.grilles[id]||{};
    const scores = {};
    EVAL_CRITERES.forEach(c => {
      scores[c.id] = c.niveaux.find(n=>n.n===grille[c.id])?.pts || 0;
    });
    eleve.evalsTech.push({ date:dateAuj, scores, plongeoir:evalState.plongeoir[id]||false, type:'finale' });
    // Suggestion G3A/G3B
    const techScore = Object.values(scores).reduce((a,b)=>a+b,0);
    eleve._techSuggest = techScore >= 12 ? 'G3A' : 'G3B';
  });
  save();
  evalState.step = 3;
  renderEvalFinale();
}

// ── ÉTAPE 3 : Résumé ──
function efDetailHTML(eleve, chrono, grille, plongeoir) {
  const note    = calcNoteFinale(eleve, chrono, grille, plongeoir);
  const nc      = note>=16?'var(--g3adk)':note>=12?'var(--g3bdk)':note>=8?'var(--g2dk)':'var(--g1dk)';
  const nb      = note>=16?'var(--g3abg)':note>=12?'var(--g3bbg)':note>=8?'var(--g2bg)':'var(--g1bg)';
  const ts      = getChronoRef(eleve);
  const perf    = perfNote(chrono);
  const prog    = progNote(ts, chrono);
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div style="font-size:12px;color:var(--mid)">${eleve.sousGroupe||'G3'} · ${plongeoir?'🤿 Plongeoir (+0.5)':'🏊 Bord'}</div>
      <div style="background:${nb};color:${nc};border-radius:10px;padding:6px 14px;text-align:center">
        <div style="font-family:'Inter',sans-serif;font-size:26px;font-weight:800;line-height:1">${note}</div>
        <div style="font-size:9px;font-weight:700">/20</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:0">
      ${[
        {ico:'⏱', lbl:'Chrono 25m NL',  val:chrono?chrono+'s':'—',  max:'',        sub:''},
        {ico:'🎯', lbl:'Performance',     val:perf,                   max:'/3.5 pts',sub:''},
        {ico:'📈', lbl:'Progression',     val:prog,                   max:'/2 pts',  sub:ts?'réf: '+ts+'s':'⚠️ Pas de T1'},
      ].map(x=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--gray)">
        <span style="width:18px;text-align:center">${x.ico}</span>
        <span style="flex:1;font-size:12px;color:var(--mid)">${x.lbl}${x.sub?'<br><span style="font-size:10px;color:var(--lite)">'+x.sub+'</span>':''}</span>
        <span style="font-family:'Inter',sans-serif;font-size:13px;font-weight:700;color:var(--navy)">${x.val}<span style="font-size:10px;font-weight:400;color:var(--mid)"> ${x.max}</span></span>
      </div>`).join('')}
      ${EVAL_CRITERES.map(c=>{
        const niv    = grille[c.id];
        const pts    = niv ? (c.niveaux.find(n=>n.n===niv)?.pts||0) : 0;
        const txt    = niv ? c.niveaux.find(n=>n.n===niv)?.txt : '—';
        const icoNiv = niv===4?'🟢':niv===3?'🟡':niv===2?'🟠':'🔴';
        return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--gray)">
          <span style="width:18px;text-align:center">${c.ico}</span>
          <span style="flex:1;font-size:12px;color:var(--mid)">${c.lbl}<br><span style="font-size:10px;color:var(--lite)">${icoNiv} ${txt}</span></span>
          <span style="font-family:'Inter',sans-serif;font-size:13px;font-weight:700;color:var(--navy)">${pts}<span style="font-size:10px;font-weight:400;color:var(--mid)"> /${c.max}pt${c.max>1?'s':''}</span></span>
        </div>`;
      }).join('')}
      ${plongeoir?`<div style="display:flex;align-items:center;gap:8px;padding:6px 0">
        <span style="width:18px;text-align:center">🤿</span>
        <span style="flex:1;font-size:12px;color:var(--mid)">Bonus plongeoir</span>
        <span style="font-family:'Inter',sans-serif;font-size:13px;font-weight:700;color:var(--g3adk)">+0.5 pts</span>
      </div>`:''}
    </div>`;
}

function efToggleAccordeon(id) {
  window._efOpenId = (window._efOpenId===id) ? null : id;
  const el = document.getElementById('eval-finale-body');
  if (el) renderEFStep3(el);
}

function renderEFStep3(el) {
  const all = Object.values(classes).flat();
  if (!window._efOpenId && evalState.selectedIds.length)
    window._efOpenId = evalState.selectedIds[0];

  el.innerHTML = `
    <div class="ef-steps">
      <div class="ef-step done">1 · Sélection</div>
      <div class="ef-step done">2 · Chrono + Grille</div>
      <div class="ef-step cur">3 · Résumé</div>
    </div>
    ${evalState.selectedIds.map(id => {
      const eleve     = all.find(s=>String(s.id)===String(id));
      if (!eleve) return '';
      const chrono    = evalState.temps[id];
      const grille    = evalState.grilles[id]||{};
      const plongeoir = evalState.plongeoir[id]||false;
      const note      = calcNoteFinale(eleve, chrono, grille, plongeoir);
      const nc        = note>=16?'var(--g3adk)':note>=12?'var(--g3bdk)':note>=8?'var(--g2dk)':'var(--g1dk)';
      const nb        = note>=16?'var(--g3abg)':note>=12?'var(--g3bbg)':note>=8?'var(--g2bg)':'var(--g1bg)';
      const isOpen    = window._efOpenId===id;
      return `
        <!-- Accordéon header -->
        <div style="background:#fff;border-radius:12px;margin-bottom:6px;
          box-shadow:0 1px 8px rgba(10,37,64,.08);overflow:hidden;
          border-left:3px solid ${nc}">
          <div onclick="efToggleAccordeon('${id}')"
            style="display:flex;align-items:center;gap:12px;padding:12px 14px;cursor:pointer">
            <div style="flex:1">
              <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:800;color:var(--navy)">
                ${eleve.prenom} ${eleve.nom}
              </div>
              <div style="font-size:11px;color:var(--mid);margin-top:2px">
                ${eleve.sousGroupe||'G3'} · ${chrono?chrono+'s':'—'} · ${plongeoir?'🤿 +0.5':'🏊 Bord'}
              </div>
            </div>
            <div style="background:${nb};color:${nc};border-radius:8px;padding:4px 10px;text-align:center;flex-shrink:0">
              <div style="font-family:'Inter',sans-serif;font-size:18px;font-weight:800;line-height:1">${note}</div>
              <div style="font-size:9px;font-weight:700">/20</div>
            </div>
            <div style="color:var(--mid);font-size:16px;transition:transform .2s;transform:rotate(${isOpen?'180':'0'}deg)">▾</div>
          </div>
          ${isOpen ? `
          <div style="padding:0 14px 14px;border-top:1px solid var(--gray)">
            ${efDetailHTML(eleve, chrono, grille, plongeoir)}
          </div>` : ''}
        </div>`;
    }).join('')}
    <div class="ebtns" style="margin-top:8px">
      <button class="ebtn teal" onclick="openModule('vit')">✓ Terminer</button>
      <button class="ebtn gray" onclick="openEvalFinale()">↺ Nouvelle série</button>
    </div>`;
}

// ── Série inline dans l'onglet ──
function renderSerieInline(el) {
  // Utilise l'objet serie global mais avec IDs dédiés pour ne pas confliter
  const all = Object.values(classes).flat();
  let ss  = all.filter(s=>s.groupe==='3').sort((a,b)=>a.nom.localeCompare(b.nom));
  ss = filterBySearch(ss, 'vit');
  const cID = 'si-chrono'; // IDs uniques pour la serie inline

  el.innerHTML = `
    <div class="card" style="text-align:center;padding:14px">
      <div id="${cID}" class="serie-chrono-big ${serie.running?'running':''}">${fmtTime(serie.elapsed)}</div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button id="si-btn-go"
          onclick="siToggleChrono()"
          style="flex:1;background:${serie.running?'var(--g1)':'var(--g3a)'};color:#fff;border:none;
          border-radius:10px;padding:12px;font-size:16px;font-weight:700;cursor:pointer">
          ${serie.running?'⏹ Stop':'▶ Go'}
        </button>
        <button onclick="siReset()"
          style="background:var(--gray);color:var(--mid);border:none;
          border-radius:10px;padding:12px 16px;font-size:16px;cursor:pointer">↺</button>
      </div>
    </div>
    <div class="card">
      <div class="eval-card-title">🏊 Nageurs
        <span style="font-size:11px;font-weight:400;color:var(--mid)">(1-4 max)</span>
      </div>
      ${!ss.length ? '<p style="font-size:13px;color:var(--mid)">Aucun élève G3.</p>' :
        ss.map(s => {
          const sel = serie.selectedIds.includes(s.id);
          const t   = serie.temps[s.id];
          return `<div class="serie-eleve-row">
            <button class="serie-check ${sel?'sel':''}"
              onclick="siToggleEleve('${s.id}')">${sel?'✓':''}</button>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600;color:var(--navy)">${s.prenom} ${s.nom}</div>
              <div style="font-size:11px;color:var(--mid)">${s.sousGroupe||'G3'}</div>
            </div>
            ${sel ? `
              ${t ? `<span class="serie-temps-badge">${t}s</span>` : ''}
              <button class="btn-arrivee ${t?'done':''}" onclick="siCapture('${s.id}')">
                ${t ? '✓ '+t+'s' : '🏁 Arrivée'}
              </button>` : ''}
          </div>`;
        }).join('')}
    </div>
    ${Object.keys(serie.temps).length ? `
    <div class="ebtns">
      <button class="ebtn g3a" onclick="siValider()">
        ✅ Enregistrer ${Object.keys(serie.temps).length} temps dans les fiches
      </button>
    </div>` : ''}`;
}

function siToggleChrono() {
  if (serie.running) {
    clearInterval(serie.timer); serie.running = false;
  } else {
    serie.startMs = Date.now() - serie.elapsed * 1000;
    serie.running = true;
    serie.timer = setInterval(() => {
      serie.elapsed = (Date.now() - serie.startMs) / 1000;
      const el = document.getElementById('si-chrono');
      if (el) { el.textContent = fmtTime(serie.elapsed); el.classList.add('running'); }
    }, 50);
  }
  const btn = document.getElementById('si-btn-go');
  if (btn) {
    btn.textContent = serie.running ? '⏹ Stop' : '▶ Go';
    btn.style.background = serie.running ? 'var(--g1)' : 'var(--g3a)';
  }
}

function siToggleEleve(id) {
  const idx = serie.selectedIds.indexOf(id);
  if (idx >= 0) { serie.selectedIds.splice(idx, 1); delete serie.temps[id]; }
  else {
    if (serie.selectedIds.length >= 4) { showToast('Maximum 4 élèves'); return; }
    serie.selectedIds.push(id);
  }
  switchModTab('vit', 'serie');
}

function siCapture(id) {
  serie.temps[id] = Math.round(serie.elapsed * 100) / 100;
  // Mise à jour visuelle sans recréer
  const btn = document.querySelector(`[onclick="siCapture('${id}')"]`);
  if (btn) { btn.textContent = '✓ '+serie.temps[id]+'s'; btn.classList.add('done'); }
  // Mettre à jour le badge du sélecteur
  const selBtn = document.querySelector(`[onclick="siToggleEleve('${id}')"]`);
  // Ajouter le bouton "Enregistrer" si pas déjà là
  const body = document.getElementById('vit-body');
  if (body && !body.querySelector('.ebtn.g3a')) {
    const div = document.createElement('div');
    div.className = 'ebtns'; div.style.marginTop = '8px';
    div.innerHTML = `<button class="ebtn g3a" onclick="siValider()">
      ✅ Enregistrer les temps dans les fiches
    </button>`;
    body.appendChild(div);
  }
}

function siReset() {
  clearInterval(serie.timer);
  serie.running = false; serie.elapsed = 0; serie.temps = {};
  serie.selectedIds = [];
  switchModTab('vit', 'serie');
}

function siValider() {
  const all = Object.values(classes).flat();
  let count = 0;
  Object.entries(serie.temps).forEach(([id, t]) => {
    const e = all.find(s => String(s.id) === String(id));
    if (e) {
      if (!e.chronos) e.chronos = [];
      e.chronos.push({ date: today(), temps: t });
      count++;
    }
  });
  save();
  serie.temps = {}; serie.selectedIds = [];
  showToast('✅ ' + count + ' temps enregistré' + (count > 1 ? 's' : ''));
  switchModTab('vit', 'serie');
}



// ══════════════════════════════════════════════
// BILAN MODULE VITESSE
// ══════════════════════════════════════════════


// ══════════════════════════════════════════════
// ÉVALUATION DIAGNOSTIQUE (séance 2 — début cycle)
// ══════════════════════════════════════════════

let diagState = {
  step: 1,
  selectedIds: [],
  chrono: { running:false, startMs:0, elapsed:0, timer:null },
  temps: {},
  grilles: {},
  eleveActif: null,
};

function hasDiag(s) {
  return (s.evalsTech||[]).some(e=>e.type==='diag') || (s.chronos||[]).some(c=>c.type==='diag');
}

function renderEvalDiag(el) {
  el.scrollTop = 0;
  if (diagState.step===1) renderDiagStep1(el);
  else if (diagState.step===2) renderDiagStep2(el);
  else renderDiagStep3(el);
}

function renderDiagStep1(el) {
  const all = Object.values(classes).flat();
  const g3  = all.filter(s=>s.groupe==='3').sort((a,b)=>a.nom.localeCompare(b.nom));

  el.innerHTML = `
    <div class="ef-steps">
      <div class="ef-step cur">1 · Sélection</div>
      <div class="ef-step">2 · Chrono + Obs.</div>
      <div class="ef-step">3 · Résumé</div>
    </div>
    <div class="eval-card" style="margin-top:10px">
      <div class="eval-card-title">🔍 Évaluation Diagnostique</div>
      <p style="font-size:12px;color:var(--mid);margin-bottom:12px">
        50m observation technique + chrono 25m NL → <strong>T1 de référence</strong><br>
        <span style="color:var(--g2dk);font-weight:600">Une seule éval diag par élève.</span>
      </p>
      ${!g3.length ? '<p style="color:var(--mid);font-size:13px">Aucun élève G3.</p>' :
        g3.map(s => {
          const sel  = diagState.selectedIds.includes(s.id);
          const done = hasDiag(s);
          const t1   = getChronoRef(s);
          return `<div class="serie-eleve-row" style="${done?'opacity:.55':''}">
            ${done ? `
              <div style="width:28px;height:28px;border-radius:50%;background:var(--g3abg);
                display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">✅</div>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:600;color:var(--navy)">${s.prenom} ${s.nom}</div>
                <div style="font-size:11px;color:var(--g3adk)">Diag fait · T1 : ${t1||'?'}s</div>
              </div>
              <button onclick="supprimerDiag('${s.id}')"
                style="background:transparent;border:1px solid var(--lite);color:var(--mid);
                border-radius:7px;padding:4px 9px;font-size:11px;cursor:pointer">🗑</button>
            ` : `
              <button class="serie-check ${sel?'sel':''}" onclick="diagToggleEleve('${s.id}')">${sel?'✓':''}</button>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:600;color:var(--navy)">${s.prenom} ${s.nom}</div>
                <div style="font-size:11px;color:var(--mid)">${s.sousGroupe||'G3'} · Pas encore de diag</div>
              </div>
            `}
          </div>`;
        }).join('')}
    </div>
    <div class="ebtns">
      <button class="ebtn teal" onclick="diagGoStep2()" ${!diagState.selectedIds.length?'disabled':''}>
        ▶ Démarrer — ${diagState.selectedIds.length} élève${diagState.selectedIds.length>1?'s':''}
      </button>
    </div>`;
}

function supprimerDiag(id) {
  const all = Object.values(classes).flat();
  const s   = all.find(e=>String(e.id)===String(id));
  if (!s) return;
  showModal('Supprimer le diagnostic de '+s.prenom+' '+s.nom+' ?', () => {
    s.evalsTech = (s.evalsTech||[]).filter(e=>e.type!=='diag');
    s.chronos   = (s.chronos||[]).filter(c=>c.type!=='diag');
    save();
    diagState.selectedIds = diagState.selectedIds.filter(sid=>sid!==id);
    const el = document.getElementById('vit-body');
    if (el) renderEvalDiag(el);
    showToast('Diagnostic supprimé');
  });
}

function diagToggleEleve(id) {
  const idx = diagState.selectedIds.indexOf(id);
  if (idx>=0) { diagState.selectedIds.splice(idx,1); delete diagState.grilles[id]; }
  else {
    if (diagState.selectedIds.length>=4) { showToast('Maximum 4 élèves'); return; }
    diagState.selectedIds.push(id);
    diagState.grilles[id] = {};
  }
  if (diagState.selectedIds.length && !diagState.eleveActif)
    diagState.eleveActif = diagState.selectedIds[0];
  const el = document.getElementById('vit-body');
  if (el) renderEvalDiag(el);
}

function diagGoStep2() {
  if (!diagState.selectedIds.length) return;
  diagState.step = 2;
  diagState.eleveActif = diagState.selectedIds[0];
  const el = document.getElementById('vit-body');
  if (el) renderEvalDiag(el);
}

function diagReset() {
  if (diagState.chrono.timer) clearInterval(diagState.chrono.timer);
  diagState = { step:1, selectedIds:[], chrono:{running:false,startMs:0,elapsed:0,timer:null}, temps:{}, grilles:{}, eleveActif:null };
  const el = document.getElementById('vit-body');
  if (el) renderEvalDiag(el);
}

function renderDiagStep2(el) {
  const all    = Object.values(classes).flat();
  const eleves = diagState.selectedIds.map(id=>all.find(s=>String(s.id)===String(id))).filter(Boolean);
  const actif  = all.find(s=>String(s.id)===String(diagState.eleveActif));
  const grille = diagState.grilles[diagState.eleveActif]||{};
  const c      = diagState.chrono;
  const allFilled = diagState.selectedIds.every(id=>TECH_G3.every(crit=>(diagState.grilles[id]||{})[crit.id]!==undefined));

  el.innerHTML = `
    <div class="ef-steps">
      <div class="ef-step done">1 · Sélection</div>
      <div class="ef-step cur">2 · Chrono + Obs.</div>
      <div class="ef-step">3 · Résumé</div>
    </div>

    <div class="card" style="padding:14px;text-align:center">
      <div id="diag-chrono" class="serie-chrono-big ${c.running?'running':''}">${fmtTime(c.elapsed)}</div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button id="diag-btn-go" onclick="diagToggleChrono()"
          style="flex:1;background:${c.running?'var(--g1)':'var(--g3a)'};color:#fff;border:none;
          border-radius:10px;padding:12px;font-size:16px;font-weight:700;cursor:pointer">
          ${c.running?'⏹ Stop':'▶ Go'}
        </button>
        <button onclick="diagResetChrono()"
          style="background:var(--gray);color:var(--mid);border:none;border-radius:10px;padding:12px 16px;font-size:16px;cursor:pointer">↺</button>
      </div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;justify-content:center">
        ${eleves.map(s=>{
          const t=diagState.temps[s.id];
          return `<button onclick="diagCapture('${s.id}')"
            style="background:${t?'var(--g3abg)':'var(--navy2)'};color:${t?'var(--g3adk)':'#fff'};
            border:none;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer">
            ${t?'✓ '+t+'s':'🏁 '+s.prenom}</button>`;
        }).join('')}
      </div>
    </div>

    <div style="display:flex;gap:6px;margin-bottom:8px;overflow-x:auto">
      ${eleves.map(s=>{
        const g=diagState.grilles[s.id]||{};
        const done=TECH_G3.filter(c=>g[c.id]!==undefined).length;
        const isA=String(s.id)===String(diagState.eleveActif);
        return `<button onclick="diagSetActif('${s.id}')"
          style="flex-shrink:0;padding:7px 12px;border-radius:10px;
          border:2px solid ${isA?'var(--teal)':'transparent'};
          background:${isA?'var(--teal)':'#fff'};color:${isA?'#fff':'var(--navy)'};
          font-family:'DM Sans',sans-serif;font-size:12px;font-weight:700;cursor:pointer">
          ${s.prenom}<br><span style="font-size:10px;opacity:.8">${done}/6${diagState.temps[s.id]?' · '+diagState.temps[s.id]+'s':''}</span>
        </button>`;
      }).join('')}
    </div>

    <div class="eval-card">
      <div class="eval-card-title">👁 Observation 50m NL — ${actif?actif.prenom+' '+actif.nom:''}</div>
      <p style="font-size:11px;color:var(--mid);margin-bottom:10px">Comportement observé — pas de note</p>
      ${TECH_G3.map(c=>{
        const val=grille[c.id];
        return `<div class="crit-block">
          <div class="crit-name">${c.ico} ${c.lbl}</div>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${c.niveaux.map(niv=>{
              const isSel=val===niv.v;
              const bg=isSel?(niv.v===2?'var(--ok)':niv.v===1?'var(--partial)':'var(--ko)'):'var(--gray)';
              const fg=isSel?(niv.v===2?'var(--okfg)':niv.v===1?'var(--partfg)':'var(--kofg)'):'var(--mid)';
              const ico=niv.v===2?'🟢':niv.v===1?'🟡':'🔴';
              return `<button data-diag-crit="${c.id}" data-diag-niv="${niv.v}"
                onclick="diagSetNiveau('${diagState.eleveActif}','${c.id}',${niv.v})"
                style="border:none;border-radius:8px;padding:8px 10px;text-align:left;
                font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;
                display:flex;align-items:center;gap:7px;
                background:${bg};color:${fg};font-weight:${isSel?'700':'400'}">
                ${ico} ${niv.txt}
              </button>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>

    <div class="ebtns">
      <button class="ebtn teal" onclick="diagGoStep3()" ${!allFilled?'disabled':''}>
        ✅ Enregistrer le diagnostic${!allFilled?'<br><small style="font-weight:400;font-size:11px">Remplir les 6 critères pour tous les élèves</small>':''}
      </button>
      <button class="ebtn gray" onclick="diagState.step=1;diagState.selectedIds=[];diagState.grilles={};renderEvalDiag(document.getElementById('vit-body'))">← Retour</button>
      <button class="ebtn" style="background:var(--g1)" onclick="diagReset()">↺ Tout annuler</button>
    </div>`;
}

function diagToggleChrono() {
  const c=diagState.chrono;
  if(c.running){clearInterval(c.timer);c.running=false;}
  else{c.startMs=Date.now()-c.elapsed*1000;c.running=true;
    c.timer=setInterval(()=>{c.elapsed=(Date.now()-c.startMs)/1000;
      const e=document.getElementById('diag-chrono');
      if(e){e.textContent=fmtTime(c.elapsed);e.classList.add('running');}},50);}
  const btn=document.getElementById('diag-btn-go');
  if(btn){btn.textContent=c.running?'⏹ Stop':'▶ Go';btn.style.background=c.running?'var(--g1)':'var(--g3a)';}
}

function diagResetChrono(){
  clearInterval(diagState.chrono.timer);
  diagState.chrono={running:false,startMs:0,elapsed:0,timer:null};
  diagState.temps={};
  const el=document.getElementById('vit-body');
  if(el) renderEvalDiag(el);
}

function diagCapture(id){
  diagState.temps[id]=Math.round(diagState.chrono.elapsed*100)/100;
  const btn=document.querySelector(`[onclick="diagCapture('${id}')"]`);
  if(btn){btn.textContent='✓ '+diagState.temps[id]+'s';btn.style.background='var(--g3abg)';btn.style.color='var(--g3adk)';}
}

function diagSetActif(id){
  diagState.eleveActif=id;
  const el=document.getElementById('vit-body');
  if(el) renderEvalDiag(el);
}

function diagSetNiveau(eleveId,critId,val){
  if(!diagState.grilles[eleveId]) diagState.grilles[eleveId]={};
  diagState.grilles[eleveId][critId]=val;
  document.querySelectorAll(`[data-diag-crit="${critId}"]`).forEach(btn=>{
    const bv=parseInt(btn.dataset.diagNiv);
    const isSel=bv===val;
    const bg=isSel?(bv===2?'var(--ok)':bv===1?'var(--partial)':'var(--ko)'):'var(--gray)';
    const fg=isSel?(bv===2?'var(--okfg)':bv===1?'var(--partfg)':'var(--kofg)'):'var(--mid)';
    btn.style.background=bg;btn.style.color=fg;btn.style.fontWeight=isSel?'700':'400';
  });
  const allFilled=diagState.selectedIds.every(id=>TECH_G3.every(c=>(diagState.grilles[id]||{})[c.id]!==undefined));
  const btnV=document.querySelector('#vit-body .ebtn.teal');
  if(btnV) btnV.disabled=!allFilled;
}

function diagGoStep3(){
  clearInterval(diagState.chrono.timer);
  const all=Object.values(classes).flat();
  const dateAuj=today();
  diagState.selectedIds.forEach(id=>{
    const eleve=all.find(s=>String(s.id)===String(id));
    if(!eleve) return;
    if(!eleve.chronos)   eleve.chronos=[];
    if(!eleve.evalsTech) eleve.evalsTech=[];
    if(diagState.temps[id])
      eleve.chronos.unshift({date:dateAuj, temps:diagState.temps[id], type:'diag'});
    const scores={};
    TECH_G3.forEach(c=>{scores[c.id]=(diagState.grilles[id]||{})[c.id]??0;});
    eleve.evalsTech.unshift({date:dateAuj, scores, type:'diag'});
  });
  save();
  diagState.step=3;
  const el=document.getElementById('vit-body');
  if(el) renderEvalDiag(el);
}

function renderDiagStep3(el){
  const all=Object.values(classes).flat();
  el.innerHTML=`
    <div class="ef-steps">
      <div class="ef-step done">1 · Sélection</div>
      <div class="ef-step done">2 · Chrono + Obs.</div>
      <div class="ef-step cur">3 · Résumé</div>
    </div>
    <div class="banner g3a" style="margin-top:10px">
      <div class="bico">✅</div>
      <div class="btitle">Diagnostic enregistré</div>
      <div class="bsub">T1 et observation technique sauvegardés</div>
    </div>
    ${diagState.selectedIds.map(id=>{
      const s=all.find(e=>String(e.id)===String(id));
      if(!s) return '';
      const t=diagState.temps[id];
      const g=diagState.grilles[id]||{};
      return `<div class="hist-card">
        <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700;color:var(--navy);margin-bottom:8px">
          ${s.prenom} ${s.nom}
        </div>
        ${t?`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--gray)">
          <span>⏱</span><span style="flex:1;font-size:12px;color:var(--mid)">T1 référence</span>
          <span style="font-family:'Inter',sans-serif;font-size:18px;font-weight:700;color:var(--navy)">${t}s</span>
        </div>`:'<div style="font-size:11px;color:var(--g2dk);padding:4px 0">⚠️ Pas de chrono enregistré</div>'}
        ${TECH_G3.map(c=>{
          const v=g[c.id];
          const ico=v===2?'🟢':v===1?'🟡':v===0?'🔴':'⚫';
          const niv=c.niveaux.find(n=>n.v===v);
          return `<div style="display:flex;align-items:center;gap:7px;padding:4px 0">
            <span>${c.ico}</span>
            <span style="flex:1;font-size:12px;color:var(--mid)">${c.lbl}</span>
            <span>${ico}</span>
            <span style="font-size:11px;color:var(--mid)">${niv?niv.txt:''}</span>
          </div>`;
        }).join('')}
      </div>`;
    }).join('')}
    <div class="ebtns">
      <button class="ebtn teal" onclick="diagReset()">✓ Nouvelle série</button>
      <button class="ebtn gray" onclick="switchModTab('vit','eleves')">← Retour aux élèves</button>
    </div>`;
}


// ══════════════════════════════════════════════
// BILAN ÉLÈVE — Fiche complète
// ══════════════════════════════════════════════

function renderBilanVitesse(el) {
  const all = Object.values(classes).flat();
  let ss  = all.filter(s=>s.groupe==='3').sort((a,b)=>a.nom.localeCompare(b.nom));
  ss = filterBySearch(ss, 'vit');

  if (!ss.length) {
    el.innerHTML = `<div class="empty"><div class="eico">📊</div><h3>Aucun élève G3</h3><p>Les élèves orientés Vitesse apparaîtront ici.</p></div>`;
    return;
  }

  el.innerHTML = `
    <p style="font-size:12px;color:var(--mid);margin-bottom:12px">
      ${ss.length} élève${ss.length>1?'s':''} · Cliquer sur un nom pour ouvrir la fiche
    </p>
    ${ss.map(s=>{
      const chronosFinale = (s.chronos||[]).filter(c=>c.type==='finale');
      const evalsFinale   = (s.evalsTech||[]).filter(e=>e.type==='finale');
      const hasDiagData   = hasDiag(s);
      const t1            = getChronoRef(s);
      const bestF         = chronosFinale.length ? Math.min(...chronosFinale.map(c=>c.temps)) : null;
      const lastF         = chronosFinale.length ? chronosFinale[chronosFinale.length-1] : null;
      const lastEvalF     = evalsFinale.length ? evalsFinale[evalsFinale.length-1] : null;
      const note          = lastEvalF&&lastF ? calcNoteFinale(s,lastF.temps,lastEvalF.scores,lastEvalF.plongeoir||false) : null;
      const evol          = t1&&lastF ? (t1-lastF.temps).toFixed(2) : null;
      const nc            = note ? (note>=16?'var(--g3adk)':note>=12?'var(--g3bdk)':note>=8?'var(--g2dk)':'var(--g1dk)') : 'var(--mid)';
      const nb            = note ? (note>=16?'var(--g3abg)':note>=12?'var(--g3bbg)':note>=8?'var(--g2bg)':'var(--g1bg)') : 'var(--gray)';
      return `
        <div style="background:#fff;border-radius:12px;margin-bottom:8px;
          box-shadow:0 1px 8px rgba(10,37,64,.07);overflow:hidden;
          border-left:3px solid ${s.sousGroupe==='G3A'?'var(--g3a)':'var(--g3b)'}">
          <div class="bilan-fiche-row" data-bilan-id="${s.id}"
            style="display:flex;align-items:center;gap:12px;padding:12px 14px;cursor:pointer">
            <div style="width:34px;height:34px;border-radius:50%;flex-shrink:0;
              background:${s.sousGroupe==='G3A'?'var(--g3a)':'var(--g3b)'};
              color:#fff;display:flex;align-items:center;justify-content:center;
              font-family:'Syne',sans-serif;font-size:12px;font-weight:700">
              ${(s.prenom[0]||'').toUpperCase()+(s.nom[0]||'').toUpperCase()}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--navy)">
                ${s.prenom} ${s.nom}
              </div>
              <div style="display:flex;gap:8px;margin-top:2px;flex-wrap:wrap">
                <span style="font-size:10px;font-weight:700;color:${s.sousGroupe==='G3A'?'var(--g3adk)':'var(--g3bdk)'}">${s.sousGroupe||'G3'}</span>
                <span style="font-size:10px;color:var(--mid)">${hasDiagData?'✅ Diag':'⏳ Pas de diag'}</span>
                ${t1?`<span style="font-size:10px;color:var(--mid)">T1: ${t1}s</span>`:''}
                ${evol!==null?`<span style="font-size:10px;font-weight:700;color:${parseFloat(evol)>0?'var(--g3adk)':'var(--g1dk)'}">
                  ${parseFloat(evol)>0?'−'+evol:'+'+Math.abs(parseFloat(evol)).toFixed(2)}s</span>`:''}
              </div>
            </div>
            <div style="background:${nb};color:${nc};border-radius:8px;padding:4px 10px;text-align:center;flex-shrink:0">
              <div style="font-family:'Inter',sans-serif;font-size:16px;font-weight:800;line-height:1">${note||'—'}</div>
              <div style="font-size:8px;font-weight:700">/20</div>
            </div>
            <div style="color:var(--lite);font-size:16px;flex-shrink:0">›</div>
          </div>
        </div>`;
    }).join('')}`;
}

function bilanOpenFiche(id) {
  const all = Object.values(classes).flat();
  curStudent = all.find(s=>String(s.id)===String(id));
  if (!curStudent) { showToast('Élève introuvable'); return; }
  Object.entries(classes).forEach(([cls,ss])=>{
    if (ss.find(s=>String(s.id)===String(id))) curClass=cls;
  });
  document.getElementById('fiche-bilan-name').textContent = curStudent.prenom+' '+curStudent.nom;
  showScreen('screen-fiche-bilan');
  renderFicheDetailBilan();
}

function renderFicheDetailBilan() {
  const s   = curStudent;
  const el  = document.getElementById('fiche-bilan-body');
  if (!s || !el) return;

  const chronos        = s.chronos||[];
  const evals          = s.evalsTech||[];
  const chronosFinale  = chronos.filter(c=>c.type==='finale');
  const evalsFinale    = evals.filter(e=>e.type==='finale');
  const diagEval       = evals.find(e=>e.type==='diag')||null;
  const t1             = getChronoRef(s);
  const lastF          = chronosFinale.length ? chronosFinale[chronosFinale.length-1] : null;
  const lastEvalF      = evalsFinale.length ? evalsFinale[evalsFinale.length-1] : null;
  const note           = lastEvalF&&lastF ? calcNoteFinale(s,lastF.temps,lastEvalF.scores,lastEvalF.plongeoir||false) : null;
  const evol           = t1&&lastF ? (t1-lastF.temps) : null;
  const nc             = note ? (note>=16?'var(--g3adk)':note>=12?'var(--g3bdk)':note>=8?'var(--g2dk)':'var(--g1dk)') : 'var(--mid)';
  const nb             = note ? (note>=16?'var(--g3abg)':note>=12?'var(--g3bbg)':note>=8?'var(--g2bg)':'var(--g1bg)') : 'var(--gray)';
  const presences      = s.presences||{};
  const nbP            = Object.values(presences).filter(v=>v==='P').length;
  const nbTotal        = Object.keys(presences).length;

  // Age
  let ageStr='';
  if(s.ddn){const p=s.ddn.split('-');if(p.length===3){const b=new Date(+p[0],+p[1]-1,+p[2]),n=new Date();const a=n.getFullYear()-b.getFullYear()-(n<new Date(n.getFullYear(),b.getMonth(),b.getDate())?1:0);if(!isNaN(a))ageStr=a+' ans';}}

  // Bilan auto 4-5 lignes
  const bilanAuto = genBilanAuto(s, t1, lastF, evol, note, diagEval, lastEvalF);

  el.innerHTML = `
    <!-- HERO -->
    <div style="background:linear-gradient(135deg,#065F46,#059669);border-radius:14px;
      padding:16px;margin-bottom:10px;color:#fff;position:relative;overflow:hidden">
      <div style="position:absolute;right:-10px;bottom:-10px;font-size:60px;opacity:.1">⚡</div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800">${s.prenom} ${s.nom}</div>
          <div style="font-size:11px;opacity:.65;margin-top:2px">${s.classe}${ageStr?' · '+ageStr:''}${s.sexe?' · '+s.sexe:''}</div>
          ${s.note?`<div style="background:rgba(245,158,11,.35);color:#FDE68A;border-radius:7px;padding:3px 8px;
            font-size:11px;font-weight:700;margin-top:6px;display:inline-block">⚡ ${s.note}</div>`:''}
        </div>
        ${note!==null?`<div style="background:${nb};color:${nc};border-radius:10px;padding:8px 14px;text-align:center;flex-shrink:0">
          <div style="font-family:'Inter',sans-serif;font-size:28px;font-weight:800;line-height:1">${note}</div>
          <div style="font-size:9px;font-weight:700">/20</div>
        </div>`:''}
      </div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
        <span style="background:rgba(255,255,255,.2);border-radius:10px;padding:3px 10px;font-size:11px;font-weight:700">${s.sousGroupe||'G3'}</span>
        ${nbTotal?`<span style="background:rgba(255,255,255,.15);border-radius:10px;padding:3px 10px;font-size:11px">${nbP}/${nbTotal} présences</span>`:''}
        ${chronos.length?`<span style="background:rgba(255,255,255,.15);border-radius:10px;padding:3px 10px;font-size:11px">${chronos.length} chrono${chronos.length>1?'s':''}</span>`:''}
      </div>
    </div>

    <!-- BILAN AUTO -->
    ${bilanAuto?`<div style="background:#fff;border-radius:12px;padding:14px;margin-bottom:10px;
      box-shadow:0 1px 8px rgba(10,37,64,.07);border-left:3px solid var(--teal)">
      <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--navy);margin-bottom:8px">
        📝 Bilan de cycle
      </div>
      <p style="font-size:13px;color:var(--mid);line-height:1.7">${bilanAuto}</p>
    </div>`:''}

    <!-- EVAL DIAG -->
    ${diagEval?`
    <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--navy);margin:12px 0 8px">
      🔍 Évaluation Diagnostique
    </div>
    <div style="background:#fff;border-radius:12px;padding:14px;margin-bottom:10px;
      box-shadow:0 1px 8px rgba(10,37,64,.07);border-left:3px solid var(--g2)">
      <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--gray);margin-bottom:8px">
        <span>⏱</span>
        <span style="flex:1;font-size:12px;color:var(--mid)">T1 — Chrono de référence</span>
        <span style="font-family:'Inter',sans-serif;font-size:16px;font-weight:700;color:var(--navy)">${t1?t1+'s':'—'}</span>
      </div>
      ${TECH_G3.map(c=>{
        const v   = diagEval.scores[c.id];
        const ico = v===2?'🟢':v===1?'🟡':v===0?'🔴':'⚫';
        const niv = c.niveaux.find(n=>n.v===v);
        return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0">
          <span style="font-size:12px">${c.ico}</span>
          <span style="flex:1;font-size:12px;color:var(--mid)">${c.lbl}</span>
          <span>${ico}</span>
          <span style="font-size:10px;color:var(--lite);max-width:120px;text-align:right">${niv?niv.txt:''}</span>
        </div>`;
      }).join('')}
    </div>` : `
    <div style="background:var(--gray);border-radius:10px;padding:12px;margin-bottom:10px;text-align:center;font-size:12px;color:var(--mid)">
      🔍 Pas encore d'évaluation diagnostique
    </div>`}

    <!-- CHRONOS COMPARÉS -->
    ${chronos.length?`
    <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--navy);margin:12px 0 8px">
      ⏱ Chronos comparés
    </div>
    <div style="background:#fff;border-radius:12px;padding:14px;margin-bottom:10px;box-shadow:0 1px 8px rgba(10,37,64,.07)">
      ${chronos.map((ch,i)=>{
        const prev = i>0 ? chronos[i-1].temps : null;
        const diff = prev!==null ? prev-ch.temps : null;
        const isT1 = ch.type==='diag'||i===0;
        const isBest = ch.temps===Math.min(...chronos.map(c=>c.temps));
        return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--gray)">
          <div style="width:40px;flex-shrink:0">
            <div style="font-size:10px;font-weight:700;color:${isT1?'var(--g2dk)':'var(--mid)'}">
              ${isT1?'T1 réf':'Série '+(i)}
            </div>
            <div style="font-size:9px;color:var(--lite)">${fmtDateLong(ch.date)}</div>
          </div>
          <div style="font-family:'Inter',sans-serif;font-size:20px;font-weight:700;color:var(--navy);flex:1">
            ${ch.temps}s ${isBest&&!isT1?'🏆':''}
          </div>
          ${diff!==null?`<div style="font-size:11px;font-weight:700;color:${diff>0?'var(--g3adk)':diff<0?'var(--g1dk)':'var(--mid)'}">
            ${diff>0?'−'+diff.toFixed(2):'+'+Math.abs(diff).toFixed(2)}s
          </div>`:''}
        </div>`;
      }).join('')}
    </div>`:''}

    <!-- EVAL FINALE -->
    ${lastEvalF&&lastF?`
    <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--navy);margin:12px 0 8px">
      📋 Évaluation Finale — ${fmtDateLong(lastEvalF.date)}
    </div>
    <div style="background:#fff;border-radius:12px;padding:14px;margin-bottom:10px;box-shadow:0 1px 8px rgba(10,37,64,.07);border-left:3px solid ${nc}">
      ${efDetailHTML(s, lastF.temps, lastEvalF.scores, lastEvalF.plongeoir||false)}
    </div>` : `
    <div style="background:var(--gray);border-radius:10px;padding:12px;margin-bottom:10px;text-align:center;font-size:12px;color:var(--mid)">
      📋 Pas encore d'évaluation finale
    </div>`}

    <!-- ACTIONS -->
    <div class="ebtns" style="margin-top:4px" id="fiche-actions">
      <button class="ebtn teal" onclick="imprimerFiche()" style="display:flex;align-items:center;justify-content:center;gap:8px">
        🖨️ Imprimer la fiche
      </button>
      <button class="ebtn" style="background:var(--navy2);display:flex;align-items:center;justify-content:center;gap:8px"
        onclick="mailFiche()">
        📧 Envoyer par mail
      </button>
    </div>`;
}

function genBilanAuto(s, t1, lastF, evol, note, diagEval, lastEvalF) {
  if (!lastF && !diagEval) return null;
  const lines = [];
  const prenom = s.prenom;

  // Progression chrono
  if (t1 && lastF && evol!==null) {
    const sec = Math.abs(evol).toFixed(2);
    if (evol>0) lines.push(`${prenom} a progressé de <strong>${sec}s</strong> sur 25m NL depuis le début du cycle (${t1}s → ${lastF.temps}s).`);
    else if (evol<0) lines.push(`${prenom} a régressé de ${sec}s sur 25m NL (${t1}s → ${lastF.temps}s). Un travail spécifique est à prévoir.`);
    else lines.push(`${prenom} maintient son temps de ${t1}s sur 25m NL.`);
  } else if (t1 && !lastF) {
    lines.push(`${prenom} a un T1 de référence de ${t1}s. Aucun chrono d'évaluation finale enregistré.`);
  }

  // Points forts / à consolider depuis diag ou finale
  const evalRef = lastEvalF || diagEval;
  if (evalRef) {
    const scores = evalRef.scores;
    const forts  = TECH_G3.filter(c=>scores[c.id]===2).map(c=>c.lbl.toLowerCase());
    const moyens = TECH_G3.filter(c=>scores[c.id]===1).map(c=>c.lbl.toLowerCase());
    const faibles= TECH_G3.filter(c=>scores[c.id]===0).map(c=>c.lbl.toLowerCase());
    if (forts.length)   lines.push(`Points forts : <strong>${forts.join(', ')}</strong>.`);
    if (faibles.length) lines.push(`À consolider : <strong>${faibles.join(', ')}</strong>.`);
    else if (moyens.length) lines.push(`Axes d'amélioration : ${moyens.join(', ')}.`);
  }

  // Note
  if (note!==null) {
    const mention = note>=16?'Très bien':note>=14?'Bien':note>=12?'Assez bien':note>=10?'Passable':'Insuffisant';
    lines.push(`<strong>Note finale : ${note}/20 — ${mention}</strong>.`);
  }

  // Groupe
  if (s.sousGroupe) {
    lines.push(`Classement : ${s.sousGroupe==='G3A'?'G3A — Excellent nageur ✦':'G3B — Nageur à confirmer'}.`);
  }

  return lines.join(' ');
}

function imprimerFiche() {
  // Masquer les boutons pour l'impression
  const actions = document.getElementById('fiche-actions');
  if (actions) actions.style.display='none';
  window.print();
  setTimeout(()=>{ if(actions) actions.style.display=''; }, 1000);
}

function mailFiche() {
  const s = curStudent;
  if (!s) return;
  const chronos       = s.chronos||[];
  const evalsFinale   = (s.evalsTech||[]).filter(e=>e.type==='finale');
  const t1            = getChronoRef(s);
  const lastF         = (chronos.filter(c=>c.type==='finale')).slice(-1)[0]||null;
  const lastEvalF     = evalsFinale.slice(-1)[0]||null;
  const note          = lastEvalF&&lastF ? calcNoteFinale(s,lastF.temps,lastEvalF.scores,lastEvalF.plongeoir||false) : null;
  const evol          = t1&&lastF ? (t1-lastF.temps).toFixed(2) : null;

  const sujet = encodeURIComponent('Fiche natation — '+s.prenom+' '+s.nom+' — '+s.classe);
  let corps = 'Fiche Natation de Vitesse\n';
  corps += s.prenom+' '+s.nom+' | '+s.classe+' | '+s.sousGroupe+'\n\n';
  corps += '--- CHRONOS ---\n';
  corps += 'T1 référence : '+(t1?t1+'s':'—')+'\n';
  corps += 'Dernier chrono : '+(lastF?lastF.temps+'s':'—')+'\n';
  if (evol) corps += 'Évolution : '+(parseFloat(evol)>0?'−'+evol:'+'+Math.abs(parseFloat(evol)).toFixed(2))+'s\n';
  if (note!==null) corps += '\n--- NOTE FINALE ---\n'+note+'/20\n';
  corps += '\nGénéré par EPS Natation';

  window.location.href = 'mailto:?subject='+sujet+'&body='+encodeURIComponent(corps);
}


// ══════════════════════════════════════════════
// FICHE ÉLÈVE G2 — Natation d'Endurance
// ══════════════════════════════════════════════

function openFicheG2() {
  const s = curStudent;
  if (!s.distances) s.distances = []; // historique distances
  document.getElementById('g2-name').textContent = s.prenom+' '+s.nom;
  const alert = document.getElementById('g2-alert');
  if (s.note) { alert.textContent='⚡ '+s.note; alert.classList.remove('hidden'); }
  else alert.classList.add('hidden');
  renderFicheG2();
  showScreen('screen-g2');
}

function renderFicheG2() {
  const s  = curStudent;
  const el = document.getElementById('g2-body');
  if (!s || !el) return;

  const presences = s.presences||{};
  const nbP       = Object.values(presences).filter(v=>v==='P').length;
  const nbTotal   = Object.keys(presences).length;
  const dists     = s.distances||[];
  const lastDist  = dists.length ? dists[dists.length-1] : null;
  const bestDist  = dists.length ? Math.max(...dists.map(d=>d.metres)) : null;
  const progDist  = dists.length>=2 ? dists[dists.length-1].metres - dists[0].metres : null;

  let ageStr='';
  if(s.ddn){const p=s.ddn.split('-');if(p.length===3){const b=new Date(+p[0],+p[1]-1,+p[2]),n=new Date();const a=n.getFullYear()-b.getFullYear()-(n<new Date(n.getFullYear(),b.getMonth(),b.getDate())?1:0);if(!isNaN(a))ageStr=a+' ans';}}

  el.innerHTML = `
    <!-- Hero -->
    <div style="background:linear-gradient(135deg,#92400E,#D97706);border-radius:14px;
      padding:16px;margin-bottom:10px;color:#fff;position:relative;overflow:hidden">
      <div style="position:absolute;right:-10px;bottom:-10px;font-size:60px;opacity:.1">🏃</div>
      <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800">${s.prenom} ${s.nom}</div>
      <div style="font-size:11px;opacity:.65;margin-top:2px">${s.classe}${ageStr?' · '+ageStr:''}${s.sexe?' · '+s.sexe:''}</div>
      ${s.note?`<div style="background:rgba(255,255,255,.2);border-radius:7px;padding:3px 8px;
        font-size:11px;font-weight:700;margin-top:6px;display:inline-block">⚡ ${s.note}</div>`:''}
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
        <span style="background:rgba(255,255,255,.2);border-radius:10px;padding:3px 10px;font-size:11px;font-weight:700">G2 · Endurance</span>
        ${nbTotal?`<span style="background:rgba(255,255,255,.15);border-radius:10px;padding:3px 10px;font-size:11px">${nbP}/${nbTotal} présences</span>`:''}
      </div>
    </div>

    <!-- Stats -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-bottom:10px">
      ${[
        {lbl:'Distance réf.', val:dists.length?dists[0].metres+'m':'—'},
        {lbl:'Meilleure',      val:bestDist?bestDist+'m':'—'},
        {lbl:'Progression',   val:progDist!==null?(progDist>0?'+'+progDist:''+progDist)+'m':'—',
         color:progDist>0?'var(--g3adk)':progDist<0?'var(--g1dk)':'var(--mid)'},
      ].map(x=>`<div style="background:#fff;border-radius:10px;padding:10px 8px;text-align:center;box-shadow:0 1px 6px rgba(10,37,64,.06)">
        <div style="font-family:'Inter',sans-serif;font-size:18px;font-weight:700;color:${x.color||'var(--navy)'};">${x.val}</div>
        <div style="font-size:10px;color:var(--mid);margin-top:2px">${x.lbl}</div>
      </div>`).join('')}
    </div>

    <!-- Ajouter une distance -->
    <div class="eval-card">
      <div class="eval-card-title">📏 Enregistrer une distance</div>
      <p style="font-size:12px;color:var(--mid);margin-bottom:10px">
        Distance nagée en continu (nage libre ou crawl)<br>
        <span style="color:var(--g2dk);font-weight:600">La première saisie = distance de référence</span>
      </p>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="number" id="g2-dist-input" placeholder="ex: 150" min="0" max="3000" step="5"
          style="flex:1;padding:10px 12px;border:2px solid var(--g2);border-radius:10px;
          font-family:'Inter',sans-serif;font-size:20px;font-weight:700;color:var(--navy);
          background:#fff;outline:none;text-align:center">
        <span style="font-size:16px;color:var(--mid);font-weight:600">m</span>
        <button onclick="g2AddDist()"
          style="background:var(--g2);color:var(--navy);border:none;border-radius:10px;
          padding:11px 16px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;cursor:pointer">
          ＋ Ajouter
        </button>
      </div>
    </div>

    <!-- Historique distances -->
    ${dists.length ? `
    <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--navy);margin:10px 0 8px">
      📏 Historique des distances (${dists.length})
    </div>
    ${[...dists].reverse().map((d,i)=>{
      const idx   = dists.length-1-i;
      const prev  = idx>0 ? dists[idx-1].metres : null;
      const diff  = prev!==null ? d.metres-prev : null;
      const isRef = idx===0;
      return `<div style="background:#fff;border-radius:10px;padding:10px 12px;margin-bottom:6px;
        box-shadow:0 1px 6px rgba(10,37,64,.06);display:flex;align-items:center;gap:12px;
        border-left:3px solid ${isRef?'var(--g2)':'var(--lite)'}">
        <div style="flex:0 0 50px">
          <div style="font-size:10px;font-weight:700;color:${isRef?'var(--g2dk)':'var(--mid)'}">
            ${isRef?'Réf.':'Séance '+idx}
          </div>
          <div style="font-size:9px;color:var(--lite)">${fmtDateLong(d.date)}</div>
        </div>
        <div style="font-family:'Inter',sans-serif;font-size:22px;font-weight:700;color:var(--navy);flex:1">
          ${d.metres}m
        </div>
        ${diff!==null?`<div style="font-size:12px;font-weight:700;color:${diff>0?'var(--g3adk)':diff<0?'var(--g1dk)':'var(--mid)'}">
          ${diff>0?'+'+diff:diff}m
        </div>`:''}
        <button onclick="g2DelDist(${idx})"
          style="background:transparent;border:none;color:var(--lite);font-size:14px;cursor:pointer;padding:4px">🗑</button>
      </div>`;
    }).join('')}` : `
    <div style="background:var(--gray);border-radius:10px;padding:14px;text-align:center;
      font-size:12px;color:var(--mid);margin-top:4px">
      Aucune distance enregistrée.<br>La première saisie servira de référence.
    </div>`}

    <div class="ebtns" style="margin-top:10px">
      <button class="ebtn gray" onclick="showScreen('screen-end')">← Retour</button>
    </div>`;
}

function g2AddDist() {
  const input = document.getElementById('g2-dist-input');
  const metres = parseInt(input.value);
  if (!metres || metres<=0) { showToast('Saisir une distance valide'); return; }
  if (!curStudent.distances) curStudent.distances=[];
  curStudent.distances.push({ date:today(), metres });
  input.value='';
  save();
  renderFicheG2();
  showToast('✅ Distance enregistrée');
}

function g2DelDist(idx) {
  showModal('Supprimer cette distance ?', () => {
    curStudent.distances.splice(idx,1);
    save(); renderFicheG2();
    showToast('Distance supprimée');
  });
}

// ── INIT ─────────────────────────────────────
load();
updateHomeCounts();

// Délégation — fiche bilan
document.addEventListener('click', e => {
  const row = e.target.closest('.bilan-fiche-row');
  if (row && row.dataset.bilanId) bilanOpenFiche(row.dataset.bilanId);
});

// Délégation — ouvrir fiche élève
document.addEventListener('click', e => {
  const card = e.target.closest('.stu-open');
  if (card && card.dataset.studentId) openStudent(card.dataset.studentId);
});


