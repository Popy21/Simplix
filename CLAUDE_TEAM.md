# CLAUDE_TEAM.md - Instructions pour le travail collaboratif

Ce fichier contient les instructions pour Claude Code utilisé par plusieurs développeurs simultanément sur le projet Simplix CRM.

---

## IDENTIFICATION OBLIGATOIRE

**IMPORTANT**: Au début de chaque session, demande à l'utilisateur:
1. Son nom/pseudo (pour les commits et le tracking)
2. Sur quelle fonctionnalité il travaille
3. S'il a synchronisé avec `git pull origin main`

---

## RÈGLES D'OR - À RESPECTER ABSOLUMENT

### 1. Vérification avant modification
Avant de modifier un fichier, TOUJOURS vérifier:
```bash
git status
git log --oneline -5
```

### 2. Branches obligatoires
JAMAIS de commit direct sur `main`. Toujours créer une branche:
```bash
git checkout -b feature/[NOM]-[description-courte]
# Exemple: feature/adel-fix-invoices
# Exemple: feature/ami-dashboard-ui
```

### 3. Commits atomiques
- Un commit = une modification logique
- Message clair en français ou anglais
- Format: `type: description courte`

Types autorisés:
- `feat:` nouvelle fonctionnalité
- `fix:` correction de bug
- `refactor:` refactoring sans changement fonctionnel
- `style:` formatage, CSS
- `docs:` documentation
- `test:` ajout/modification de tests
- `chore:` maintenance, dépendances

### 4. Zones de travail exclusives

| Zone | Fichiers | Responsable |
|------|----------|-------------|
| API Core | `api/src/routes/*.ts` | À définir par session |
| API Auth | `api/src/middleware/*.ts` | À définir par session |
| Frontend Screens | `web-app/src/screens/*.tsx` | À définir par session |
| Frontend Components | `web-app/src/components/*.tsx` | À définir par session |
| Database | `database/migrations/*.sql` | UN SEUL à la fois |
| Config | `*.config.js`, `.env*` | Coordination requise |

---

## WORKFLOW DE DÉVELOPPEMENT

### Début de session
```bash
# 1. Synchroniser
git fetch origin
git checkout main
git pull origin main

# 2. Créer sa branche
git checkout -b feature/[ton-nom]-[tache]

# 3. Vérifier l'état
git status
```

### Pendant le développement
```bash
# Commits réguliers (toutes les 30 min ou après chaque fonctionnalité)
git add [fichiers-modifiés]
git commit -m "feat: description de ce qui a été fait"

# Synchroniser avec main régulièrement
git fetch origin
git rebase origin/main  # ou git merge origin/main
```

### Fin de session
```bash
# 1. Commit final
git add .
git commit -m "feat: [description finale]"

# 2. Push vers le repo
git push origin feature/[ta-branche]

# 3. Créer une Pull Request (si prêt à merger)
gh pr create --title "feat: [description]" --body "Description des changements"
```

---

## DÉPLOIEMENT - PROCÉDURE STRICTE

### Qui peut déployer ?
- Seulement après validation sur la branche `main`
- Coordination obligatoire (prévenir l'autre développeur)

### Avant déploiement
```bash
# Vérifier qu'on est sur main à jour
git checkout main
git pull origin main

# Vérifier que les builds passent
cd api && npm run build
cd ../web-app && npx expo export --platform web
```

### Commande de déploiement
```bash
# Déploiement complet
./deploy.sh

# Ou manuellement:
# 1. Build API
cd api && npm run build

# 2. Build Frontend
cd web-app && npx expo export --platform web

# 3. Deploy via SSH
sshpass -p '[MOT_DE_PASSE]' scp -r api/dist root@82.165.134.105:/var/www/simplix/api/
sshpass -p '[MOT_DE_PASSE]' scp -r web-app/dist/* root@82.165.134.105:/var/www/vhosts/drive.paraweb.fr/simplix.drive.paraweb.fr/

# 4. Restart services
sshpass -p '[MOT_DE_PASSE]' ssh root@82.165.134.105 "pm2 restart simplix-api"
```

### Après déploiement
```bash
# Vérifier que tout fonctionne
curl -s https://crm.paraweb.fr/api/products  # Doit retourner 401
curl -s -I https://crm.paraweb.fr/           # Doit retourner 200
```

---

## STRUCTURE DU PROJET

```
Simplix/
├── api/                    # Backend Express.js + TypeScript
│   ├── src/
│   │   ├── routes/         # Endpoints API (un fichier par domaine)
│   │   ├── middleware/     # Auth, validation, multi-tenancy
│   │   ├── database/       # Connection pool PostgreSQL
│   │   └── index.ts        # Point d'entrée
│   ├── dist/               # Build compilé (ne pas modifier)
│   └── package.json
│
├── web-app/                # Frontend React Native + Expo
│   ├── src/
│   │   ├── screens/        # Écrans de l'application
│   │   ├── components/     # Composants réutilisables
│   │   ├── services/       # Appels API (api.ts)
│   │   ├── context/        # State global (Auth, Theme)
│   │   └── theme/          # Styles, couleurs, glass morphism
│   ├── dist/               # Build web (ne pas modifier)
│   └── package.json
│
├── database/
│   ├── migrations/         # Scripts SQL numérotés
│   └── migrate.sh          # Script de migration
│
├── deploy.sh               # Script de déploiement
├── CLAUDE.md               # Instructions générales
└── CLAUDE_TEAM.md          # CE FICHIER
```

---

## CONVENTIONS DE CODE

### Backend (TypeScript)
```typescript
// Toujours utiliser organization_id depuis le token
const organizationId = req.user?.organization_id;

// Toujours filtrer par organization_id (multi-tenant)
const result = await pool.query(
  'SELECT * FROM contacts WHERE organization_id = $1 AND deleted_at IS NULL',
  [organizationId]
);

// Gestion d'erreur avec fallback
try {
  // code
} catch (error: any) {
  console.error('Description:', error);
  res.status(500).json({ error: 'Message utilisateur' });
}
```

### Frontend (React Native)
```typescript
// Imports organisés
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { contactService } from '../services/api';

// Composant fonctionnel avec types
const MyScreen: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const { user } = useAuth();

  // useEffect pour charger les données
  useEffect(() => {
    loadData();
  }, []);

  return (
    <GlassLayout title="Mon Écran">
      {/* contenu */}
    </GlassLayout>
  );
};
```

### SQL (Migrations)
```sql
-- Fichier: XXX_description.sql
-- Toujours avec IF NOT EXISTS pour idempotence

CREATE TABLE IF NOT EXISTS ma_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP  -- Soft delete
);

CREATE INDEX IF NOT EXISTS idx_ma_table_org ON ma_table(organization_id);
```

---

## COMMANDES UTILES

### Base de données
```bash
# Connexion locale
PGPASSWORD=postgres psql -h localhost -U postgres -d simplix_crm

# Lister les tables
\dt

# Décrire une table
\d nom_table

# Exécuter une migration
PGPASSWORD=postgres psql -h localhost -U postgres -d simplix_crm -f database/migrations/XXX_file.sql
```

### Développement
```bash
# API en mode dev
cd api && npm run dev

# Frontend web
cd web-app && npm run web

# Build API
cd api && npm run build

# Build Frontend
cd web-app && npx expo export --platform web
```

### Git
```bash
# Voir les branches
git branch -a

# Changer de branche
git checkout nom-branche

# Voir les différences
git diff

# Annuler les modifications locales
git checkout -- fichier.ts

# Voir l'historique
git log --oneline -10
```

---

## RÉSOLUTION DE CONFLITS

### Si conflit lors d'un merge/rebase
```bash
# 1. Voir les fichiers en conflit
git status

# 2. Ouvrir et résoudre manuellement les conflits
# Chercher les marqueurs <<<<<<<, =======, >>>>>>>

# 3. Marquer comme résolu
git add fichier-resolu.ts

# 4. Continuer
git rebase --continue  # ou git merge --continue
```

### Si quelqu'un a modifié le même fichier
1. **STOP** - Ne pas forcer
2. Communiquer avec l'autre développeur
3. Décider qui garde quelle version
4. Merger manuellement si nécessaire

---

## CHECKLIST AVANT COMMIT

- [ ] Le code compile sans erreur (`npm run build`)
- [ ] Les fonctionnalités testées manuellement
- [ ] Pas de `console.log` de debug oubliés
- [ ] Pas de credentials/secrets dans le code
- [ ] organization_id utilisé dans toutes les requêtes DB
- [ ] Gestion d'erreur avec try/catch
- [ ] Message de commit clair et descriptif

---

## CHECKLIST AVANT DÉPLOIEMENT

- [ ] Branche `main` à jour
- [ ] Tous les tests passent
- [ ] Build API réussi
- [ ] Build Frontend réussi
- [ ] L'autre développeur prévenu
- [ ] Backup si modification DB importante
- [ ] Migrations appliquées sur prod si nécessaire

---

## CONTACTS & RESOURCES

- **Serveur Production**: 82.165.134.105
- **URL Frontend**: https://crm.paraweb.fr/
- **URL API**: https://crm.paraweb.fr/api/
- **Base de données**: PostgreSQL sur localhost:5432

---

## EN CAS DE PROBLÈME

### L'API ne répond plus
```bash
ssh root@82.165.134.105
pm2 logs simplix-api --lines 50
pm2 restart simplix-api
```

### Le frontend affiche une page blanche
1. Vérifier la console du navigateur (F12)
2. Vérifier que le JS bundle est accessible
3. Redéployer le frontend

### Erreur de base de données
```bash
# Vérifier la connexion
PGPASSWORD=postgres psql -h localhost -U postgres -d simplix_crm -c "SELECT 1"

# Voir les logs PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log
```

---

**RAPPEL FINAL**: Communication = Clé du succès. Prévenez-vous mutuellement avant de modifier des fichiers critiques !
