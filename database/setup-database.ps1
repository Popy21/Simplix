# Script de setup automatique de la base de données PostgreSQL pour Simplix CRM
# Compatible: Windows 10/11
# Usage: .\setup-database.ps1

param(
    [switch]$SkipInstall,
    [switch]$LoadSeeds = $true
)

$ErrorActionPreference = "Stop"

# Configuration par défaut
$DB_NAME = "simplix_crm"
$DB_PORT = "5432"
$DB_HOST = "localhost"
$POSTGRES_VERSION = "14"

# Fonction pour afficher un titre
function Write-Title {
    param([string]$Text)
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  $Text" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

# Fonction pour afficher une section
function Write-Section {
    param([string]$Text)
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    Write-Host "  $Text" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
}

# Fonction pour vérifier si une commande existe
function Test-CommandExists {
    param([string]$Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# Fonction pour vérifier si PostgreSQL est installé
function Test-PostgreSQLInstalled {
    # Chercher dans les emplacements d'installation courants
    $possiblePaths = @(
        "C:\Program Files\PostgreSQL\$POSTGRES_VERSION\bin\psql.exe",
        "C:\Program Files\PostgreSQL\15\bin\psql.exe",
        "C:\Program Files\PostgreSQL\13\bin\psql.exe",
        "C:\Program Files (x86)\PostgreSQL\$POSTGRES_VERSION\bin\psql.exe"
    )

    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            return $path
        }
    }

    # Vérifier dans le PATH
    if (Test-CommandExists "psql") {
        return "psql"
    }

    return $null
}

Clear-Host
Write-Title "Simplix CRM - Database Setup Script"
Write-Host "    PostgreSQL Installation & Configuration" -ForegroundColor Cyan
Write-Host ""

# Étape 1: Installation de PostgreSQL
Write-Section "📦 Étape 1/5: Vérification/Installation de PostgreSQL"

$psqlPath = Test-PostgreSQLInstalled

if ($psqlPath) {
    Write-Host "✓ PostgreSQL est déjà installé" -ForegroundColor Green
    $psqlVersion = & $psqlPath --version
    Write-Host "  Version: $psqlVersion" -ForegroundColor Blue
} elseif ($SkipInstall) {
    Write-Host "❌ PostgreSQL n'est pas installé et -SkipInstall est activé" -ForegroundColor Red
    exit 1
} else {
    Write-Host "PostgreSQL n'est pas installé. Installation en cours..." -ForegroundColor Yellow
    Write-Host ""

    # Vérifier si Chocolatey est installé
    if (Test-CommandExists "choco") {
        Write-Host "Installation via Chocolatey..." -ForegroundColor Blue
        choco install postgresql$POSTGRES_VERSION -y --params '/Password:postgres'

        # Rafraîchir les variables d'environnement
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

        Write-Host "✓ PostgreSQL installé via Chocolatey" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Chocolatey n'est pas installé" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Options d'installation:" -ForegroundColor Cyan
        Write-Host "  1. Installer via Chocolatey (recommandé)" -ForegroundColor White
        Write-Host "  2. Télécharger l'installeur officiel" -ForegroundColor White
        Write-Host "  3. Quitter" -ForegroundColor White
        Write-Host ""
        $choice = Read-Host "Votre choix (1-3)"

        switch ($choice) {
            "1" {
                Write-Host ""
                Write-Host "Installation de Chocolatey..." -ForegroundColor Blue
                Set-ExecutionPolicy Bypass -Scope Process -Force
                [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
                Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

                Write-Host "Installation de PostgreSQL..." -ForegroundColor Blue
                choco install postgresql$POSTGRES_VERSION -y --params '/Password:postgres'

                # Rafraîchir les variables d'environnement
                $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

                Write-Host "✓ PostgreSQL installé" -ForegroundColor Green
            }
            "2" {
                Write-Host ""
                Write-Host "Téléchargement de l'installeur PostgreSQL..." -ForegroundColor Blue
                $installerUrl = "https://get.enterprisedb.com/postgresql/postgresql-$POSTGRES_VERSION-windows-x64.exe"
                $installerPath = "$env:TEMP\postgresql-installer.exe"

                # Télécharger l'installeur
                Write-Host "Téléchargement depuis $installerUrl" -ForegroundColor Gray
                Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath

                Write-Host "Lancement de l'installeur..." -ForegroundColor Blue
                Write-Host "⚠️  Veuillez suivre les instructions de l'installeur" -ForegroundColor Yellow
                Write-Host "   - Mot de passe par défaut suggéré: postgres" -ForegroundColor Gray
                Write-Host "   - Port par défaut: 5432" -ForegroundColor Gray

                Start-Process -FilePath $installerPath -Wait

                # Nettoyer
                Remove-Item $installerPath -ErrorAction SilentlyContinue

                Write-Host "✓ Installation terminée" -ForegroundColor Green
                Write-Host "⚠️  Veuillez redémarrer ce script après l'installation" -ForegroundColor Yellow
                Read-Host "Appuyez sur Entrée pour quitter"
                exit 0
            }
            "3" {
                Write-Host "Installation annulée" -ForegroundColor Yellow
                exit 0
            }
            default {
                Write-Host "❌ Choix invalide" -ForegroundColor Red
                exit 1
            }
        }
    }

    # Attendre que le service démarre
    Write-Host "Démarrage du service PostgreSQL..." -ForegroundColor Blue
    Start-Sleep -Seconds 5

    # Mettre à jour le chemin psql
    $psqlPath = Test-PostgreSQLInstalled
    if (-not $psqlPath) {
        Write-Host "❌ PostgreSQL n'a pas été trouvé après l'installation" -ForegroundColor Red
        Write-Host "Veuillez redémarrer votre terminal et réexécuter ce script" -ForegroundColor Yellow
        exit 1
    }
}

# Vérifier que le service PostgreSQL est démarré
Write-Host "Vérification du service PostgreSQL..." -ForegroundColor Blue
$service = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($service) {
    if ($service.Status -ne "Running") {
        Write-Host "Démarrage du service PostgreSQL..." -ForegroundColor Yellow
        Start-Service $service.Name
        Start-Sleep -Seconds 3
    }
    Write-Host "✓ Service PostgreSQL actif" -ForegroundColor Green
} else {
    Write-Host "⚠️  Service PostgreSQL non trouvé, mais psql est disponible" -ForegroundColor Yellow
}

Start-Sleep -Seconds 2

# Étape 2: Configuration de l'utilisateur
Write-Section "📝 Étape 2/5: Configuration de l'utilisateur"

Write-Host "Configuration de l'utilisateur PostgreSQL" -ForegroundColor Blue
Write-Host ""
Write-Host "Options:" -ForegroundColor Cyan
Write-Host "  1. Utiliser l'utilisateur postgres par défaut" -ForegroundColor White
Write-Host "  2. Créer un nouvel utilisateur" -ForegroundColor White
Write-Host ""
$userChoice = Read-Host "Votre choix (1-2) [1]"

if ([string]::IsNullOrWhiteSpace($userChoice)) {
    $userChoice = "1"
}

if ($userChoice -eq "2") {
    $DB_USER = Read-Host "Nom d'utilisateur"
    $DB_PASSWORD = Read-Host "Mot de passe" -AsSecureString
    $DB_PASSWORD_TEXT = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD))

    # Créer l'utilisateur
    Write-Host "Création de l'utilisateur $DB_USER..." -ForegroundColor Blue
    $createUserCmd = "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD_TEXT'; ALTER USER $DB_USER CREATEDB;"

    try {
        $env:PGPASSWORD = "postgres"
        & $psqlPath -U postgres -c $createUserCmd 2>&1 | Out-Null
        Write-Host "✓ Utilisateur $DB_USER créé" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Erreur lors de la création de l'utilisateur: $_" -ForegroundColor Yellow
    }
} else {
    $DB_USER = "postgres"
    $DB_PASSWORD_TEXT = Read-Host "Mot de passe pour postgres (laisser vide si configuré lors de l'installation)" -AsSecureString
    if ($DB_PASSWORD_TEXT.Length -gt 0) {
        $DB_PASSWORD_TEXT = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD_TEXT))
    } else {
        $DB_PASSWORD_TEXT = "postgres"
    }
    Write-Host "✓ Utilisation de l'utilisateur postgres" -ForegroundColor Green
}

$env:PGPASSWORD = $DB_PASSWORD_TEXT

Start-Sleep -Seconds 1

# Étape 3: Création de la base de données
Write-Section "🗄️  Étape 3/5: Création de la base de données"

# Vérifier si la base existe déjà
Write-Host "Vérification de l'existence de la base '$DB_NAME'..." -ForegroundColor Blue

try {
    $dbExists = & $psqlPath -U $DB_USER -lqt 2>&1 | Select-String -Pattern $DB_NAME -Quiet

    if ($dbExists) {
        Write-Host "⚠️  La base de données '$DB_NAME' existe déjà" -ForegroundColor Yellow
        $recreate = Read-Host "Voulez-vous la supprimer et la recréer ? (y/n) [n]"

        if ($recreate -eq "y") {
            Write-Host "Suppression de la base existante..." -ForegroundColor Yellow
            & $psqlPath -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>&1 | Out-Null
            Write-Host "✓ Base de données supprimée" -ForegroundColor Green
            $dbExists = $false
        } else {
            Write-Host "ℹ️  Conservation de la base de données existante" -ForegroundColor Blue
        }
    }

    if (-not $dbExists) {
        Write-Host "Création de la base de données '$DB_NAME'..." -ForegroundColor Blue
        & $psqlPath -U $DB_USER -c "CREATE DATABASE $DB_NAME;" 2>&1 | Out-Null
        Write-Host "✓ Base de données '$DB_NAME' créée" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Erreur lors de la création de la base: $_" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 1

# Étape 4: Application des migrations
Write-Section "🚀 Étape 4/5: Application des migrations"

# Créer le fichier .env
$envContent = @"
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD_TEXT
"@

Set-Content -Path ".env" -Value $envContent
Write-Host "✓ Fichier .env créé" -ForegroundColor Green

# Définir les variables d'environnement pour cette session
$env:DB_HOST = $DB_HOST
$env:DB_PORT = $DB_PORT
$env:DB_NAME = $DB_NAME
$env:DB_USER = $DB_USER
$env:DB_PASSWORD = $DB_PASSWORD_TEXT

# Appliquer les migrations
Write-Host "Application des migrations SQL..." -ForegroundColor Blue
Write-Host ""

try {
    .\migrate.ps1 up
} catch {
    Write-Host "❌ Erreur lors des migrations: $_" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 1

# Étape 5: Chargement des données de démonstration
Write-Section "📊 Étape 5/5: Chargement des données de démonstration"

if ($LoadSeeds) {
    $loadSeedsChoice = Read-Host "Voulez-vous charger les données de démonstration ? (y/n) [y]"
    if ([string]::IsNullOrWhiteSpace($loadSeedsChoice)) {
        $loadSeedsChoice = "y"
    }
} else {
    $loadSeedsChoice = "n"
}

if ($loadSeedsChoice -eq "y") {
    Write-Host "Chargement des données de seed..." -ForegroundColor Blue

    if (Test-Path "seeds\001_default_data.sql") {
        & $psqlPath -U $DB_USER -d $DB_NAME -f "seeds\001_default_data.sql" 2>&1 | Out-Null
        Write-Host "✓ Données de démonstration chargées" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Fichier seeds\001_default_data.sql non trouvé" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️  Pas de données de démonstration chargées" -ForegroundColor Blue
}

# Résumé final
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              ✅ Installation terminée !                    ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Informations de connexion:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "Host:     " -NoNewline -ForegroundColor Blue
Write-Host $DB_HOST
Write-Host "Port:     " -NoNewline -ForegroundColor Blue
Write-Host $DB_PORT
Write-Host "Database: " -NoNewline -ForegroundColor Blue
Write-Host $DB_NAME
Write-Host "User:     " -NoNewline -ForegroundColor Blue
Write-Host $DB_USER
if ($DB_PASSWORD_TEXT) {
    Write-Host "Password: " -NoNewline -ForegroundColor Blue
    Write-Host "********"
}
Write-Host ""

Write-Host "🔧 Commandes utiles:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "# Se connecter à la base" -ForegroundColor Green
Write-Host "  psql -U $DB_USER -d $DB_NAME"
Write-Host ""
Write-Host "# Voir le statut des migrations" -ForegroundColor Green
Write-Host "  .\migrate.ps1 status"
Write-Host ""
Write-Host "# Appliquer de nouvelles migrations" -ForegroundColor Green
Write-Host "  .\migrate.ps1 up"
Write-Host ""
Write-Host "# Créer une nouvelle migration" -ForegroundColor Green
Write-Host "  .\migrate.ps1 create nom_de_la_migration"
Write-Host ""
Write-Host "# Réinitialiser complètement la base" -ForegroundColor Green
Write-Host "  .\migrate.ps1 reset"
Write-Host ""

Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "  - README.md                    - Documentation complète de la BDD"
Write-Host "  - ..\docs\MIGRATION_GUIDE.md   - Guide de migration"
Write-Host "  - ..\docs\STATUS.md            - État du projet"
Write-Host ""
Write-Host "🎉 La base de données Simplix CRM est prête à l'emploi !" -ForegroundColor Green
Write-Host ""
