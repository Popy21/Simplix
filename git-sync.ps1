# Script de synchronisation Git automatique (PowerShell)
# Fait un pull si possible, sinon push les modifications locales

Write-Host "🔄 Synchronisation Git en cours..." -ForegroundColor Cyan

# Vérifier si on est dans un dépôt Git
try {
    git rev-parse --git-dir 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Pas dans un dépôt Git"
    }
} catch {
    Write-Host "❌ Erreur: Pas dans un dépôt Git" -ForegroundColor Red
    exit 1
}

# Récupérer les informations du remote
Write-Host "Récupération des informations du remote..." -ForegroundColor Gray
git fetch

# Vérifier s'il y a des modifications locales
$status = git status -s
if ($status) {
    Write-Host "📝 Modifications locales détectées" -ForegroundColor Yellow
    $hasLocalChanges = $true
} else {
    Write-Host "✓ Pas de modifications locales" -ForegroundColor Green
    $hasLocalChanges = $false
}

# Vérifier si on est en avance/retard par rapport au remote
$local = git rev-parse "@"
$remote = git rev-parse "@{u}" 2>$null
$base = git merge-base "@" "@{u}" 2>$null

if (-not $remote) {
    Write-Host "⚠️  Pas de branche remote configurée" -ForegroundColor Yellow
    exit 1
}

if ($local -eq $remote) {
    Write-Host "✓ Déjà à jour avec le remote" -ForegroundColor Green

    if ($hasLocalChanges) {
        Write-Host "📤 Push des modifications locales..." -ForegroundColor Cyan
        git add .
        $commitMsg = Read-Host "Message de commit"
        if ([string]::IsNullOrWhiteSpace($commitMsg)) {
            $commitMsg = "Update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        }
        git commit -m $commitMsg
        git push
        Write-Host "✅ Modifications pushées avec succès" -ForegroundColor Green
    }
} elseif ($local -eq $base) {
    Write-Host "📥 Pull des modifications distantes..." -ForegroundColor Cyan
    git pull
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Pull effectué avec succès" -ForegroundColor Green
    } else {
        Write-Host "❌ Erreur lors du pull" -ForegroundColor Red
        exit 1
    }
} elseif ($remote -eq $base) {
    Write-Host "📤 Push des modifications locales..." -ForegroundColor Cyan

    if ($hasLocalChanges) {
        git add .
        $commitMsg = Read-Host "Message de commit"
        if ([string]::IsNullOrWhiteSpace($commitMsg)) {
            $commitMsg = "Update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        }
        git commit -m $commitMsg
    }

    git push
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Modifications pushées avec succès" -ForegroundColor Green
    } else {
        Write-Host "❌ Erreur lors du push" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⚠️  Divergence détectée entre local et remote" -ForegroundColor Yellow
    Write-Host "Veuillez résoudre manuellement (pull puis push, ou rebase)" -ForegroundColor Yellow
    exit 1
}

Write-Host "🎉 Synchronisation terminée" -ForegroundColor Green
