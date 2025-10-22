# Script de migration PostgreSQL pour Simplix CRM (PowerShell)
# Usage: .\migrate.ps1 [up|down|status|reset] [migration_number]

param(
    [Parameter(Position=0)]
    [ValidateSet('up', 'status', 'reset', 'create', 'help')]
    [string]$Command = 'help',

    [Parameter(Position=1)]
    [string]$Argument
)

# Configuration (à personnaliser selon votre environnement)
$env:PGHOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$env:PGPORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$env:PGDATABASE = if ($env:DB_NAME) { $env:DB_NAME } else { "simplix_crm" }
$env:PGUSER = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
$env:PGPASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "postgres" }

$MigrationsDir = Join-Path $PSScriptRoot "migrations"
$MigrationsTable = "schema_migrations"

# Fonction pour exécuter des commandes SQL
function Invoke-PsqlCommand {
    param([string]$Query)

    $result = psql -t -c $Query 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Erreur SQL: $result"
    }
    return $result
}

# Fonction pour exécuter un fichier SQL
function Invoke-PsqlFile {
    param([string]$FilePath)

    psql -f $FilePath 2>&1 | Out-Null
    return $LASTEXITCODE -eq 0
}

# Créer la table de suivi des migrations
function Initialize-MigrationsTable {
    Write-Host "🔧 Initialisation de la table de migrations..." -ForegroundColor Blue

    $query = @"
CREATE TABLE IF NOT EXISTS $MigrationsTable (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL UNIQUE,
    filename VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
"@

    Invoke-PsqlCommand $query | Out-Null
    Write-Host "✓ Table de migrations initialisée" -ForegroundColor Green
}

# Vérifier si une migration a été exécutée
function Test-MigrationApplied {
    param([string]$Version)

    $query = "SELECT COUNT(*) FROM $MigrationsTable WHERE version = '$Version';"
    $result = (Invoke-PsqlCommand $query).Trim()
    return $result -eq "1"
}

# Enregistrer une migration comme exécutée
function Register-Migration {
    param(
        [string]$Version,
        [string]$Filename
    )

    $query = "INSERT INTO $MigrationsTable (version, filename) VALUES ('$Version', '$Filename');"
    Invoke-PsqlCommand $query | Out-Null
}

# Obtenir le dernier numéro de migration appliquée
function Get-LatestMigration {
    try {
        $query = "SELECT version FROM $MigrationsTable ORDER BY executed_at DESC LIMIT 1;"
        $result = (Invoke-PsqlCommand $query).Trim()
        return $result
    } catch {
        return $null
    }
}

# Exécuter les migrations UP
function Invoke-MigrateUp {
    param([string]$TargetVersion)

    Write-Host "📤 Exécution des migrations UP..." -ForegroundColor Blue
    Write-Host ""

    $migrations = Get-ChildItem -Path $MigrationsDir -Filter "*.sql" | Sort-Object Name

    foreach ($migration in $migrations) {
        $filename = $migration.Name
        $version = $filename.Split('_')[0]

        # Si une version cible est spécifiée, s'arrêter après cette version
        if ($TargetVersion -and [int]$version -gt [int]$TargetVersion) {
            continue
        }

        if (-not (Test-MigrationApplied $version)) {
            Write-Host "⏳ Application de la migration $version : $filename" -ForegroundColor Yellow

            if (Invoke-PsqlFile $migration.FullName) {
                Register-Migration $version $filename
                Write-Host "✓ Migration $version appliquée avec succès" -ForegroundColor Green
            } else {
                Write-Host "❌ Erreur lors de l'application de la migration $version" -ForegroundColor Red
                exit 1
            }
        } else {
            Write-Host "✓ Migration $version déjà appliquée" -ForegroundColor Green
        }
    }

    Write-Host ""
    Write-Host "🎉 Toutes les migrations ont été appliquées avec succès" -ForegroundColor Green
}

# Afficher le statut des migrations
function Show-MigrationStatus {
    Write-Host "📊 Statut des migrations:" -ForegroundColor Blue
    Write-Host ""

    $latest = Get-LatestMigration
    if (-not $latest) {
        Write-Host "Aucune migration appliquée" -ForegroundColor Yellow
        $latest = "000"
    } else {
        Write-Host "Dernière migration appliquée: $latest" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "Migrations disponibles:"
    Write-Host "----------------------"

    $migrations = Get-ChildItem -Path $MigrationsDir -Filter "*.sql" | Sort-Object Name

    foreach ($migration in $migrations) {
        $filename = $migration.Name
        $version = $filename.Split('_')[0]

        if (Test-MigrationApplied $version) {
            Write-Host "✓ $filename" -ForegroundColor Green
        } else {
            Write-Host "✗ $filename" -ForegroundColor Red
        }
    }
}

# Réinitialiser la base de données
function Reset-Database {
    Write-Host "⚠️  ATTENTION: Cette opération va supprimer TOUTES les données!" -ForegroundColor Red
    $confirm = Read-Host "Êtes-vous sûr de vouloir continuer? (tapez 'yes' pour confirmer)"

    if ($confirm -ne "yes") {
        Write-Host "Opération annulée." -ForegroundColor Yellow
        exit 0
    }

    Write-Host "🔄 Suppression de toutes les tables..." -ForegroundColor Yellow

    # Drop all tables
    $query = "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO $env:PGUSER; GRANT ALL ON SCHEMA public TO public;"
    Invoke-PsqlCommand $query | Out-Null

    Write-Host "✓ Base de données réinitialisée" -ForegroundColor Green

    # Réappliquer les migrations
    Initialize-MigrationsTable
    Invoke-MigrateUp
}

# Créer une nouvelle migration
function New-Migration {
    param([string]$Name)

    if (-not $Name) {
        Write-Host "❌ Erreur: Vous devez spécifier un nom pour la migration" -ForegroundColor Red
        Write-Host "Usage: .\migrate.ps1 create <nom_de_la_migration>"
        exit 1
    }

    # Trouver le prochain numéro de version
    $lastMigration = Get-ChildItem -Path $MigrationsDir -Filter "*.sql" | Sort-Object Name | Select-Object -Last 1

    if ($lastMigration) {
        $lastVersion = $lastMigration.Name.Split('_')[0]
        $nextVersion = ([int]$lastVersion + 1).ToString("000")
    } else {
        $nextVersion = "001"
    }

    $filename = "${nextVersion}_${Name}.sql"
    $filepath = Join-Path $MigrationsDir $filename

    $date = Get-Date -Format "yyyy-MM-dd"

    $content = @"
-- Migration $nextVersion : $Name
-- Description:
-- Author: Team Simplix
-- Date: $date

-- ============================================================================
-- TODO: Add your migration SQL here
-- ============================================================================


-- ============================================================================
-- COMMENTS
-- ============================================================================

"@

    Set-Content -Path $filepath -Value $content -Encoding UTF8
    Write-Host "✓ Migration créée: $filepath" -ForegroundColor Green
}

# Menu d'aide
function Show-Help {
    Write-Host "Script de migration PostgreSQL pour Simplix CRM"
    Write-Host ""
    Write-Host "Usage: .\migrate.ps1 [command] [options]"
    Write-Host ""
    Write-Host "Commandes:"
    Write-Host "  up [version]     Appliquer toutes les migrations (ou jusqu'à une version spécifique)"
    Write-Host "  status           Afficher le statut des migrations"
    Write-Host "  reset            Réinitialiser complètement la base de données"
    Write-Host "  create <name>    Créer une nouvelle migration"
    Write-Host "  help             Afficher cette aide"
    Write-Host ""
    Write-Host "Variables d'environnement:"
    Write-Host "  DB_HOST          Hôte PostgreSQL (défaut: localhost)"
    Write-Host "  DB_PORT          Port PostgreSQL (défaut: 5432)"
    Write-Host "  DB_NAME          Nom de la base de données (défaut: simplix_crm)"
    Write-Host "  DB_USER          Utilisateur PostgreSQL (défaut: postgres)"
    Write-Host "  DB_PASSWORD      Mot de passe PostgreSQL (défaut: postgres)"
    Write-Host ""
    Write-Host "Exemples:"
    Write-Host "  .\migrate.ps1 up                    # Appliquer toutes les migrations"
    Write-Host "  .\migrate.ps1 up 002                # Appliquer jusqu'à la migration 002"
    Write-Host "  .\migrate.ps1 status                # Voir l'état des migrations"
    Write-Host "  .\migrate.ps1 reset                 # Réinitialiser la BDD"
    Write-Host "  .\migrate.ps1 create add_users      # Créer une nouvelle migration"
}

# Point d'entrée principal
try {
    # Vérifier que psql est disponible
    $psqlVersion = psql --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur: psql n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
        Write-Host "Veuillez installer PostgreSQL client tools."
        exit 1
    }

    # Vérifier que PostgreSQL est accessible
    if ($Command -ne "help" -and $Command -ne "create") {
        psql -c '\q' 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Erreur: Impossible de se connecter à PostgreSQL" -ForegroundColor Red
            Write-Host "Vérifiez vos paramètres de connexion."
            exit 1
        }

        Initialize-MigrationsTable
    }

    switch ($Command) {
        'up' {
            Invoke-MigrateUp $Argument
        }
        'status' {
            Show-MigrationStatus
        }
        'reset' {
            Reset-Database
        }
        'create' {
            New-Migration $Argument
        }
        'help' {
            Show-Help
        }
        default {
            Write-Host "Commande inconnue: $Command" -ForegroundColor Red
            Write-Host ""
            Show-Help
            exit 1
        }
    }
} catch {
    Write-Host "❌ Erreur: $_" -ForegroundColor Red
    exit 1
}
