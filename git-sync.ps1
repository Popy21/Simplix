# Script de synchronisation Git automatique AVANCÉ (PowerShell)
# Gère: stash, overwrites, conflicts, et garde tout sur main

$ErrorActionPreference = "Continue"

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          🔄 Git Sync - Synchronisation Avancée             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

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

# S'assurer qu'on est sur main
$currentBranch = git branch --show-current
if ($currentBranch -ne "main") {
    Write-Host "⚠️  Vous êtes sur la branche '$currentBranch'" -ForegroundColor Yellow
    $switchBranch = Read-Host "Voulez-vous passer sur 'main' ? (y/n) [y]"
    if ([string]::IsNullOrWhiteSpace($switchBranch)) {
        $switchBranch = "y"
    }

    if ($switchBranch -eq "y") {
        Write-Host "📍 Passage sur la branche main..." -ForegroundColor Blue

        # Sauvegarder les modifications locales
        $status = git status -s
        if ($status) {
            Write-Host "💾 Sauvegarde des modifications locales (stash)..." -ForegroundColor Yellow
            git stash push -m "Auto-stash before switching to main $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        }

        git checkout main

        # Restaurer le stash si besoin
        $stashList = git stash list
        if ($stashList -match "Auto-stash before switching to main") {
            Write-Host "📥 Restauration des modifications..." -ForegroundColor Blue
            git stash pop
        }
    } else {
        Write-Host "❌ Synchronisation annulée" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✓ Sur la branche main" -ForegroundColor Green
Write-Host ""

# Configurer Git pour toujours merger
git config pull.rebase false 2>$null

# Récupérer les informations du remote
Write-Host "🌐 Récupération des informations du remote..." -ForegroundColor Blue
git fetch origin main 2>&1 | Out-Null

# Vérifier s'il y a des modifications locales
$hasLocalChanges = $false
$status = git status -s
if ($status) {
    Write-Host "📝 Modifications locales détectées" -ForegroundColor Yellow
    $hasLocalChanges = $true

    # Afficher un résumé
    Write-Host ""
    git status --short
    Write-Host ""
} else {
    Write-Host "✓ Pas de modifications locales" -ForegroundColor Green
}

# Comparer avec le remote
$local = git rev-parse main
$remote = git rev-parse origin/main 2>$null
$base = git merge-base main origin/main 2>$null

if (-not $remote) {
    Write-Host "❌ Erreur: Pas de branche remote 'origin/main'" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# CAS 1: Déjà à jour
if ($local -eq $remote) {
    Write-Host "✓ Déjà à jour avec origin/main" -ForegroundColor Green

    if ($hasLocalChanges) {
        Write-Host ""
        Write-Host "📤 Vous avez des modifications locales à push" -ForegroundColor Yellow
        Write-Host ""
        $commitMsg = Read-Host "Message de commit"

        if ([string]::IsNullOrWhiteSpace($commitMsg)) {
            $commitMsg = "Update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        }

        Write-Host "💾 Commit des modifications..." -ForegroundColor Blue
        git add .
        git commit -m $commitMsg

        Write-Host "📤 Push vers origin/main..." -ForegroundColor Blue
        git push origin main

        Write-Host "✅ Modifications pushées avec succès" -ForegroundColor Green
    } else {
        Write-Host "✅ Rien à faire, tout est synchronisé" -ForegroundColor Green
    }

# CAS 2: En retard
} elseif ($local -eq $base) {
    Write-Host "📥 Vous êtes en retard par rapport au remote" -ForegroundColor Yellow

    # Commit les modifications locales d'abord
    if ($hasLocalChanges) {
        Write-Host ""
        Write-Host "💾 Commit des modifications locales avant pull..." -ForegroundColor Yellow
        Write-Host ""
        $commitMsg = Read-Host "Message de commit"

        if ([string]::IsNullOrWhiteSpace($commitMsg)) {
            $commitMsg = "WIP: Auto-commit before pull $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        }

        git add .
        git commit -m $commitMsg
        Write-Host "✓ Modifications committées" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "📥 Pull des modifications distantes..." -ForegroundColor Blue

    git pull origin main --no-edit 2>&1 | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Pull réussi !" -ForegroundColor Green
    } else {
        Write-Host "❌ Conflit détecté lors du pull" -ForegroundColor Red
        Write-Host ""
        Write-Host "🔧 Résolution des conflits..." -ForegroundColor Yellow
        Write-Host ""

        # Afficher les fichiers en conflit
        Write-Host "Fichiers en conflit:" -ForegroundColor Cyan
        git diff --name-only --diff-filter=U
        Write-Host ""

        $keepOurs = Read-Host "Voulez-vous accepter TOUTES vos modifications locales ? (y/n) [y]"
        if ([string]::IsNullOrWhiteSpace($keepOurs)) {
            $keepOurs = "y"
        }

        if ($keepOurs -eq "y") {
            Write-Host "📝 Acceptation de vos modifications locales..." -ForegroundColor Yellow
            git checkout --ours .
            git add .
            git commit -m "Merge: Keep local changes $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            Write-Host "✅ Conflits résolus (vos modifications gardées)" -ForegroundColor Green
        } else {
            $keepTheirs = Read-Host "Voulez-vous accepter TOUTES les modifications distantes ? (y/n) [n]"

            if ($keepTheirs -eq "y") {
                Write-Host "📝 Acceptation des modifications distantes..." -ForegroundColor Yellow
                git checkout --theirs .
                git add .
                git commit -m "Merge: Keep remote changes $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
                Write-Host "✅ Conflits résolus (modifications distantes gardées)" -ForegroundColor Green
            } else {
                Write-Host "❌ Veuillez résoudre les conflits manuellement" -ForegroundColor Red
                Write-Host ""
                Write-Host "Commandes utiles:"
                Write-Host "  git status                    # Voir les conflits"
                Write-Host "  git checkout --ours fichier   # Garder votre version"
                Write-Host "  git checkout --theirs fichier # Garder la version distante"
                Write-Host "  git add .                     # Marquer comme résolu"
                Write-Host "  git commit                    # Finaliser le merge"
                Write-Host "  git merge --abort             # Annuler complètement"
                exit 1
            }
        }
    }

# CAS 3: En avance
} elseif ($remote -eq $base) {
    Write-Host "📤 Vous êtes en avance par rapport au remote" -ForegroundColor Blue

    if ($hasLocalChanges) {
        Write-Host ""
        Write-Host "💾 Commit des modifications..." -ForegroundColor Yellow
        Write-Host ""
        $commitMsg = Read-Host "Message de commit"

        if ([string]::IsNullOrWhiteSpace($commitMsg)) {
            $commitMsg = "Update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        }

        git add .
        git commit -m $commitMsg
        Write-Host "✓ Modifications committées" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "📤 Push vers origin/main..." -ForegroundColor Blue
    git push origin main
    Write-Host "✅ Push réussi !" -ForegroundColor Green

# CAS 4: Divergence
} else {
    Write-Host "⚠️  DIVERGENCE DÉTECTÉE" -ForegroundColor Red
    Write-Host ""
    Write-Host "Vos commits locaux et les commits distants ont divergé."
    Write-Host ""

    # Afficher les commits divergents
    Write-Host "📊 Vos commits locaux (absents du remote):" -ForegroundColor Cyan
    git log --oneline origin/main..main | Select-Object -First 5
    Write-Host ""
    Write-Host "📊 Commits distants (absents en local):" -ForegroundColor Cyan
    git log --oneline main..origin/main | Select-Object -First 5
    Write-Host ""

    # Commit les modifications locales
    if ($hasLocalChanges) {
        Write-Host "💾 Commit des modifications locales..." -ForegroundColor Yellow
        Write-Host ""
        $commitMsg = Read-Host "Message de commit"

        if ([string]::IsNullOrWhiteSpace($commitMsg)) {
            $commitMsg = "WIP: Auto-commit $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        }

        git add .
        git commit -m $commitMsg
        Write-Host "✓ Modifications committées" -ForegroundColor Green
        Write-Host ""
    }

    Write-Host "Choisissez la stratégie:" -ForegroundColor Yellow
    Write-Host "  1) FORCER AVEC VOS MODIFICATIONS (overwrites remote) ⚠️"
    Write-Host "  2) Merge (combine les deux historiques)"
    Write-Host "  3) Rebase (applique vos commits après le remote)"
    Write-Host "  4) Annuler"
    Write-Host ""
    $strategy = Read-Host "Votre choix (1-4)"

    switch ($strategy) {
        "1" {
            Write-Host ""
            Write-Host "⚠️  ATTENTION: Cela va ÉCRASER les modifications distantes !" -ForegroundColor Red
            $confirm = Read-Host "Êtes-vous SÛR ? Tapez 'FORCE' pour confirmer"

            if ($confirm -eq "FORCE") {
                Write-Host "💪 Force push vers origin/main..." -ForegroundColor Yellow
                git push --force origin main
                Write-Host "✅ Push forcé réussi (remote écrasé)" -ForegroundColor Green
            } else {
                Write-Host "❌ Annulé (confirmation incorrecte)" -ForegroundColor Red
                exit 1
            }
        }
        "2" {
            Write-Host "🔀 Merge des branches..." -ForegroundColor Blue
            git pull origin main --no-edit 2>&1 | Out-Null

            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Merge réussi" -ForegroundColor Green
                Write-Host "📤 Push du résultat..." -ForegroundColor Blue
                git push origin main
                Write-Host "✅ Synchronisation complète" -ForegroundColor Green
            } else {
                Write-Host "❌ Conflit lors du merge" -ForegroundColor Red
                Write-Host ""
                $keepOurs = Read-Host "Garder VOS modifications ? (y/n) [y]"
                if ([string]::IsNullOrWhiteSpace($keepOurs)) {
                    $keepOurs = "y"
                }

                if ($keepOurs -eq "y") {
                    git checkout --ours .
                    git add .
                    git commit -m "Merge: Keep local changes"
                    git push origin main
                    Write-Host "✅ Conflits résolus (vos modifs gardées)" -ForegroundColor Green
                } else {
                    git checkout --theirs .
                    git add .
                    git commit -m "Merge: Keep remote changes"
                    git push origin main
                    Write-Host "✅ Conflits résolus (modifs distantes gardées)" -ForegroundColor Green
                }
            }
        }
        "3" {
            Write-Host "🔄 Rebase sur origin/main..." -ForegroundColor Blue
            git pull --rebase origin main 2>&1 | Out-Null

            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Rebase réussi" -ForegroundColor Green
                Write-Host "📤 Push des modifications..." -ForegroundColor Blue
                git push origin main
                Write-Host "✅ Push réussi" -ForegroundColor Green
            } else {
                Write-Host "❌ Conflit lors du rebase" -ForegroundColor Red
                Write-Host ""
                Write-Host "Résolvez les conflits puis:"
                Write-Host "  git add ."
                Write-Host "  git rebase --continue"
                Write-Host "  git push origin main"
                Write-Host ""
                Write-Host "Ou annulez avec: git rebase --abort"
                exit 1
            }
        }
        default {
            Write-Host "❌ Synchronisation annulée" -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎉 Synchronisation terminée !" -ForegroundColor Green
Write-Host ""

# Afficher le statut final
Write-Host "📊 Statut final:" -ForegroundColor Cyan
git status --short --branch
Write-Host ""
Write-Host "✅ Vous êtes sur 'main' et tout est synchronisé" -ForegroundColor Green
