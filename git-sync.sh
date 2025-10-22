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
elif [ "$LOCAL" = "$BASE" ]; then
    echo "📥 Pull des modifications distantes..."
    git pull
    echo "✅ Pull effectué avec succès"
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
else
    echo "⚠️  Divergence détectée entre local et remote"
    echo "Veuillez résoudre manuellement (pull puis push, ou rebase)"
    exit 1
fi

echo "🎉 Synchronisation terminée"
