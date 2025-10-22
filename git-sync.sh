#!/bin/bash

# Script de synchronisation Git automatique
# Fait un pull si possible, sinon push les modifications locales

echo "🔄 Synchronisation Git en cours..."

# Vérifier si on est dans un dépôt Git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Erreur: Pas dans un dépôt Git"
    exit 1
fi

# Récupérer les informations du remote
echo "🌐 Récupération des informations du remote..."
git fetch

# Vérifier s'il y a des modifications locales
if [[ -n $(git status -s) ]]; then
    echo "📝 Modifications locales détectées"
    HAS_LOCAL_CHANGES=true
else
    echo "✓ Pas de modifications locales"
    HAS_LOCAL_CHANGES=false
fi

# Vérifier si on est en avance/retard par rapport au remote
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u} 2>/dev/null)
BASE=$(git merge-base @ @{u} 2>/dev/null)

if [ -z "$REMOTE" ]; then
    echo "⚠️  Pas de branche remote configurée"
    exit 1
fi

# Cas 1: Déjà à jour
if [ "$LOCAL" = "$REMOTE" ]; then
    echo "✓ Déjà à jour avec le remote"

    if [ "$HAS_LOCAL_CHANGES" = true ]; then
        echo "📤 Push des modifications locales..."
        git add .
        read -p "Message de commit: " commit_msg
        if [ -z "$commit_msg" ]; then
            commit_msg="Update $(date '+%Y-%m-%d %H:%M:%S')"
        fi
        git commit -m "$commit_msg"
        git push
        echo "✅ Modifications pushées avec succès"
    fi

# Cas 2: En retard par rapport au remote (besoin de pull)
elif [ "$LOCAL" = "$BASE" ]; then
    # Si on a des modifications locales, il faut les commit d'abord
    if [ "$HAS_LOCAL_CHANGES" = true ]; then
        echo "📝 Commit des modifications locales avant pull..."
        git add .
        read -p "Message de commit: " commit_msg
        if [ -z "$commit_msg" ]; then
            commit_msg="WIP: Auto-commit before pull $(date '+%Y-%m-%d %H:%M:%S')"
        fi
        git commit -m "$commit_msg"
        echo "✅ Modifications locales committées"
    fi

    echo "📥 Pull des modifications distantes..."
    if git pull --no-edit; then
        echo "✅ Pull effectué avec succès"
    else
        echo "❌ Erreur lors du pull"
        echo "⚠️  Il peut y avoir des conflits à résoudre"
        echo ""
        echo "Commandes utiles:"
        echo "  git status              # Voir les conflits"
        echo "  git diff                # Voir les différences"
        echo "  git merge --abort       # Annuler le merge"
        exit 1
    fi

# Cas 3: En avance par rapport au remote (besoin de push)
elif [ "$REMOTE" = "$BASE" ]; then
    echo "📤 Push des modifications locales..."

    if [ "$HAS_LOCAL_CHANGES" = true ]; then
        git add .
        read -p "Message de commit: " commit_msg
        if [ -z "$commit_msg" ]; then
            commit_msg="Update $(date '+%Y-%m-%d %H:%M:%S')"
        fi
        git commit -m "$commit_msg"
    fi

    git push
    echo "✅ Modifications pushées avec succès"

# Cas 4: Divergence (local et remote ont des commits différents)
else
    echo "⚠️  Divergence détectée entre local et remote"
    echo ""
    echo "Votre branche locale et la branche distante ont divergé."
    echo ""

    # Afficher les derniers commits locaux et distants
    echo "📊 Commits locaux (absents du remote):"
    git log --oneline @{u}..@ | head -3
    echo ""
    echo "📊 Commits distants (absents en local):"
    git log --oneline @..@{u} | head -3
    echo ""

    if [ "$HAS_LOCAL_CHANGES" = true ]; then
        echo "📝 Commit des modifications locales..."
        git add .
        read -p "Message de commit: " commit_msg
        if [ -z "$commit_msg" ]; then
            commit_msg="WIP: Auto-commit $(date '+%Y-%m-%d %H:%M:%S')"
        fi
        git commit -m "$commit_msg"
    fi

    echo "Options:"
    echo "  1) Pull puis push (merge - recommandé)"
    echo "  2) Rebase puis push (historique linéaire)"
    echo "  3) Annuler"
    echo ""
    read -p "Votre choix (1-3): " choice

    case $choice in
        1)
            echo "📥 Pull avec merge..."
            if git pull --no-edit; then
                echo "✅ Pull effectué avec succès"
                echo "📤 Push des modifications..."
                git push
                echo "✅ Push effectué avec succès"
            else
                echo "❌ Erreur lors du pull"
                echo "Résolvez les conflits puis relancez le script"
                exit 1
            fi
            ;;
        2)
            echo "📥 Pull avec rebase..."
            if git pull --rebase; then
                echo "✅ Rebase effectué avec succès"
                echo "📤 Push des modifications..."
                git push
                echo "✅ Push effectué avec succès"
            else
                echo "❌ Erreur lors du rebase"
                echo "Résolvez les conflits avec: git rebase --continue"
                echo "Ou annulez avec: git rebase --abort"
                exit 1
            fi
            ;;
        3|*)
            echo "❌ Synchronisation annulée"
            echo ""
            echo "Pour synchroniser manuellement:"
            echo "  git pull          # Récupérer les changements distants"
            echo "  git push          # Envoyer les changements locaux"
            exit 1
            ;;
    esac
fi

echo "🎉 Synchronisation terminée"
