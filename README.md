# 🏊 Natation EPS — PWA

Application progressive web app pour l'évaluation natation en EPS (6ème).

## Modules
- ✅ **Savoir Nager** — Test référentiel national 7 critères + affectation groupes
- 🔜 Natation Endurance (6 min)
- 🔜 Natation Vitesse (25m NL)

## Déploiement sur GitHub Pages

### 1. Créer le repository
1. Va sur https://github.com → **New repository**
2. Nom : `natation-eps`
3. Public ✅ → **Create repository**

### 2. Uploader les fichiers
Uploader tous les fichiers :
```
index.html
style.css
app.js
sw.js
manifest.json
icons/icon-192.png
icons/icon-512.png
```

### 3. Activer GitHub Pages
**Settings** → **Pages** → Source : `main` → **Save**

Ton app sera disponible à :
`https://[ton-username].github.io/natation-eps`

### 4. Installer sur iPad
1. Ouvrir l'URL dans **Safari**
2. Bouton **Partager** 📤
3. **"Sur l'écran d'accueil"**
4. **Ajouter**

## Format JSON import
```json
[
  { "nom": "DUPONT", "prenom": "Emma", "classe": "6A" },
  { "nom": "MARTIN", "prenom": "Lucas", "classe": "6A" }
]
```

## Flux d'évaluation Savoir Nager

```
Élève importé
    ↓
Étape 1 — 7 critères du référentiel national
    ├── 1+ critère échoué → Groupe 1 (Non nageur) ✗
    └── Tous validés → Étape 2
         ↓
Étape 2 — Sait nager le crawl ?
    ├── Non → Groupe 2 (Nageur autonome) 🏊
    └── Oui → Étape 3
         ↓
Étape 3 — Observation 50m NL + Chrono 25m
    └── → Groupe 3 (Crawl maîtrisé) 🌊
```

## Groupes
| Groupe | Description |
|--------|-------------|
| **G1** 🔴 | Non nageur — A échoué au test savoir nager |
| **G2** 🟡 | Nageur autonome — Valide le test mais pas de crawl |
| **G3** 🟢 | Crawl maîtrisé — Culture sportive aquatique |
