# 🚀 Guide de Setup - Base de données Simplix CRM

Ce guide explique comment installer et configurer la base de données PostgreSQL pour Simplix CRM sur n'importe quelle machine (Linux, macOS, Windows).

## 📋 Prérequis

### Minimaux
- **Système**: Windows 10/11, macOS 10.15+, ou Linux (Ubuntu 20.04+, Debian 10+, CentOS 7+)
- **RAM**: 2 GB minimum (4 GB recommandé)
- **Espace disque**: 500 MB pour PostgreSQL + 100 MB pour la base de données
- **Droits**: Droits administrateur/sudo

### Logiciels (seront installés automatiquement si nécessaire)
- PostgreSQL 14+ (installé par le script)
- psql (client PostgreSQL)

---

## 🐧 Linux / macOS

### Installation automatique (Recommandé)

```bash
# Se placer dans le dossier database
cd database

# Rendre le script exécutable
chmod +x setup-database.sh

# Exécuter le script
./setup-database.sh
```

### Ce que fait le script :
1. ✅ Détecte automatiquement votre OS (macOS, Ubuntu, Debian, CentOS, etc.)
2. ✅ Installe PostgreSQL si nécessaire (via Homebrew, apt, ou yum)
3. ✅ Configure l'utilisateur et le mot de passe
4. ✅ Crée la base de données `simplix_crm`
5. ✅ Applique toutes les migrations (31 tables)
6. ✅ Charge les données de démonstration (optionnel)
7. ✅ Crée le fichier `.env` avec les paramètres

### Exemple d'exécution

```
╔════════════════════════════════════════════════════════════╗
║         Simplix CRM - Database Setup Script               ║
║                PostgreSQL Installation                     ║
╚════════════════════════════════════════════════════════════╝

🔍 Détection du système d'exploitation: macos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Étape 1/5: Installation de PostgreSQL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ PostgreSQL est déjà installé (version 14.10)

📝 Étape 2/5: Configuration de l'utilisateur
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ️  Sur macOS, on utilise l'utilisateur système: votre_nom

🗄️  Étape 3/5: Création de la base de données
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Base de données 'simplix_crm' créée

🚀 Étape 4/5: Application des migrations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Fichier .env créé
✓ Migration 001 appliquée avec succès
✓ Migration 002 appliquée avec succès
✓ Migration 003 appliquée avec succès
✓ Migration 004 appliquée avec succès

📊 Étape 5/5: Chargement des données de démonstration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Données de démonstration chargées

╔════════════════════════════════════════════════════════════╗
║              ✅ Installation terminée !                    ║
╚════════════════════════════════════════════════════════════╝
```

### Installation manuelle (Alternative)

Si le script ne fonctionne pas, voici les étapes manuelles :

#### Sur macOS (avec Homebrew)
```bash
# Installer Homebrew si nécessaire
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Installer PostgreSQL
brew install postgresql@14
brew services start postgresql@14

# Créer la base
createdb simplix_crm

# Appliquer les migrations
export DB_USER=$(whoami)
export DB_PASSWORD=""
./migrate.sh up

# Charger les données
psql simplix_crm < seeds/001_default_data.sql
```

#### Sur Ubuntu/Debian
```bash
# Installer PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Démarrer le service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Créer la base
sudo -u postgres createdb simplix_crm

# Créer un utilisateur (optionnel)
sudo -u postgres psql -c "CREATE USER votre_nom WITH PASSWORD 'votre_mdp';"
sudo -u postgres psql -c "ALTER USER votre_nom CREATEDB;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE simplix_crm TO votre_nom;"

# Appliquer les migrations
export DB_USER="votre_nom"
export DB_PASSWORD="votre_mdp"
./migrate.sh up

# Charger les données
psql -U votre_nom simplix_crm < seeds/001_default_data.sql
```

#### Sur CentOS/RHEL
```bash
# Installer PostgreSQL
sudo yum install -y postgresql-server postgresql-contrib

# Initialiser et démarrer
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Suite identique à Ubuntu
```

---

## 🪟 Windows

### Installation automatique (Recommandé)

```powershell
# Ouvrir PowerShell en tant qu'Administrateur
# Se placer dans le dossier database
cd database

# Autoriser l'exécution du script (si nécessaire)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Exécuter le script
.\setup-database.ps1
```

### Ce que fait le script :
1. ✅ Détecte si PostgreSQL est installé
2. ✅ Propose d'installer PostgreSQL via Chocolatey ou l'installeur officiel
3. ✅ Configure l'utilisateur et le mot de passe
4. ✅ Crée la base de données `simplix_crm`
5. ✅ Applique toutes les migrations (31 tables)
6. ✅ Charge les données de démonstration (optionnel)
7. ✅ Crée le fichier `.env` avec les paramètres

### Options du script

```powershell
# Ne pas charger les données de démo
.\setup-database.ps1 -LoadSeeds:$false

# Sauter l'installation (si PostgreSQL déjà installé)
.\setup-database.ps1 -SkipInstall
```

### Installation manuelle (Alternative)

1. **Télécharger PostgreSQL**
   - Aller sur https://www.postgresql.org/download/windows/
   - Télécharger PostgreSQL 14 ou supérieur
   - Exécuter l'installeur
   - Mot de passe par défaut : `postgres`
   - Port : `5432`

2. **Créer la base de données**
   ```powershell
   # Ouvrir PowerShell
   cd "C:\Program Files\PostgreSQL\14\bin"

   # Se connecter
   .\psql -U postgres

   # Dans psql:
   CREATE DATABASE simplix_crm;
   \q
   ```

3. **Appliquer les migrations**
   ```powershell
   cd chemin\vers\Simplix\database

   # Configurer les variables
   $env:DB_USER = "postgres"
   $env:DB_PASSWORD = "votre_mdp"

   # Lancer les migrations
   .\migrate.ps1 up
   ```

4. **Charger les données**
   ```powershell
   .\psql -U postgres -d simplix_crm -f seeds\001_default_data.sql
   ```

---

## 🐳 Docker (Tous systèmes)

### Option la plus simple pour le développement

```bash
# Se placer dans le dossier database
cd database

# Démarrer PostgreSQL + pgAdmin
docker-compose up -d

# Attendre que PostgreSQL démarre (5-10 secondes)
sleep 10

# Appliquer les migrations
export DB_USER=postgres
export DB_PASSWORD=postgres
./migrate.sh up

# Charger les données
docker-compose exec postgres psql -U postgres -d simplix_crm -f /docker-entrypoint-initdb.d/001_default_data.sql
```

### Accès
- **PostgreSQL**: `localhost:5432`
- **pgAdmin**: http://localhost:5050
  - Email: `admin@simplix.local`
  - Password: `admin`

### Arrêter les conteneurs
```bash
docker-compose down
```

---

## ✅ Vérification

Après l'installation, vérifiez que tout fonctionne :

### 1. Se connecter à la base
```bash
# Linux/macOS
psql -U votre_utilisateur -d simplix_crm

# Windows
psql -U postgres -d simplix_crm
```

### 2. Lister les tables
```sql
\dt

-- Vous devriez voir 31 tables
```

### 3. Vérifier les données de démo
```sql
SELECT COUNT(*) FROM organizations;  -- Doit retourner 1
SELECT COUNT(*) FROM users;          -- Doit retourner 1
SELECT COUNT(*) FROM contacts;       -- Doit retourner 1
SELECT COUNT(*) FROM companies;      -- Doit retourner 3
SELECT COUNT(*) FROM pipelines;      -- Doit retourner 1
SELECT COUNT(*) FROM pipeline_stages; -- Doit retourner 6

\q
```

### 4. Vérifier les migrations
```bash
# Linux/macOS
./migrate.sh status

# Windows
.\migrate.ps1 status
```

Résultat attendu :
```
✓ 001_initial_schema.sql
✓ 002_crm_schema.sql
✓ 003_tasks_notifications_schema.sql
✓ 004_analytics_emails_schema.sql
```

---

## 🔧 Configuration de l'API

Une fois la base installée, configurez l'API :

```bash
cd ../api

# Copier le fichier d'exemple
cp .env.example .env

# Éditer .env avec vos paramètres
nano .env
```

Contenu du `.env` :
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=simplix_crm
DB_USER=votre_utilisateur
DB_PASSWORD=votre_mot_de_passe
```

Tester l'API :
```bash
npm install
npm run dev
```

---

## 🆘 Problèmes courants

### Erreur: "psql: command not found"
**Solution**: PostgreSQL n'est pas dans le PATH
```bash
# Trouver l'emplacement de psql
# Linux
which psql
# macOS avec Homebrew
/opt/homebrew/opt/postgresql@14/bin/psql
# Windows
C:\Program Files\PostgreSQL\14\bin\psql.exe

# Ajouter au PATH ou utiliser le chemin complet
```

### Erreur: "Connection refused"
**Solution**: PostgreSQL n'est pas démarré
```bash
# Linux/Ubuntu
sudo systemctl start postgresql
sudo systemctl status postgresql

# macOS
brew services start postgresql@14
brew services list

# Windows
# Services > postgresql-x64-14 > Démarrer
```

### Erreur: "FATAL: password authentication failed"
**Solution**: Mauvais mot de passe
```bash
# Réinitialiser le mot de passe postgres
# Linux
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'nouveau_mdp';"

# macOS
psql -U postgres -c "ALTER USER postgres PASSWORD 'nouveau_mdp';"
```

### Erreur: "database already exists"
**Solution**: La base existe déjà
```bash
# Option 1: Utiliser la base existante
# Option 2: Supprimer et recréer
dropdb simplix_crm
createdb simplix_crm
./migrate.sh up
```

### Le script ne démarre pas (Windows)
**Solution**: Politique d'exécution PowerShell
```powershell
# Ouvrir PowerShell en Administrateur
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine

# Ou temporairement pour la session actuelle
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

---

## 📚 Ressources

- **Documentation complète**: [README.md](README.md)
- **Guide de migration**: [../docs/MIGRATION_GUIDE.md](../docs/MIGRATION_GUIDE.md)
- **État du projet**: [../docs/STATUS.md](../docs/STATUS.md)
- **PostgreSQL docs**: https://www.postgresql.org/docs/

---

## 📞 Support

Si vous rencontrez des problèmes :
1. Consultez d'abord cette documentation
2. Vérifiez les logs PostgreSQL
3. Demandez à l'équipe

**Configuration réussie = Base prête pour le développement ! 🚀**
