#!/bin/bash

# Script de synchronisation Git automatique AVANCÉ
# Gère: stash, overwrites, conflicts, et garde tout sur main

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          🔄 Git Sync - Synchronisation Avancée             ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Vérifier si on est dans un dépôt Git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Erreur: Pas dans un dépôt Git${NC}"
    exit 1
fi

# S'assurer qu'on est sur main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${YELLOW}⚠️  Vous êtes sur la branche '$CURRENT_BRANCH'${NC}"
    read -p "Voulez-vous passer sur 'main' ? (y/n) [y]: " switch_branch
    switch_branch=${switch_branch:-y}

    if [ "$switch_branch" = "y" ]; then
        echo -e "${BLUE}📍 Passage sur la branche main...${NC}"

        # Sauvegarder les modifications locales
        if [[ -n $(git status -s) ]]; then
            echo -e "${YELLOW}💾 Sauvegarde des modifications locales (stash)...${NC}"
            git stash push -m "Auto-stash before switching to main $(date '+%Y-%m-%d %H:%M:%S')"
        fi

        git checkout main

        # Restaurer le stash si besoin
        if git stash list | grep -q "Auto-stash before switching to main"; then
            echo -e "${BLUE}📥 Restauration des modifications...${NC}"
            git stash pop
        fi
    else
        echo -e "${RED}❌ Synchronisation annulée${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Sur la branche main${NC}"
echo ""

# Configurer Git pour toujours merger (pas de rebase par défaut)
git config pull.rebase false 2>/dev/null || true

# Récupérer les informations du remote
echo -e "${BLUE}🌐 Récupération des informations du remote...${NC}"
git fetch origin main

# Vérifier s'il y a des modifications locales
HAS_LOCAL_CHANGES=false
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}📝 Modifications locales détectées${NC}"
    HAS_LOCAL_CHANGES=true

    # Afficher un résumé des modifications
    echo ""
    git status --short
    echo ""
else
    echo -e "${GREEN}✓ Pas de modifications locales${NC}"
fi

# Comparer avec le remote
LOCAL=$(git rev-parse main)
REMOTE=$(git rev-parse origin/main 2>/dev/null)
BASE=$(git merge-base main origin/main 2>/dev/null)

if [ -z "$REMOTE" ]; then
    echo -e "${RED}❌ Erreur: Pas de branche remote 'origin/main'${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# CAS 1: Déjà à jour avec le remote
if [ "$LOCAL" = "$REMOTE" ]; then
    echo -e "${GREEN}✓ Déjà à jour avec origin/main${NC}"

    if [ "$HAS_LOCAL_CHANGES" = true ]; then
        echo ""
        echo -e "${YELLOW}📤 Vous avez des modifications locales à push${NC}"
        echo ""
        read -p "Message de commit: " commit_msg

        if [ -z "$commit_msg" ]; then
            commit_msg="Update $(date '+%Y-%m-%d %H:%M:%S')"
        fi

        echo -e "${BLUE}💾 Commit des modifications...${NC}"
        git add .
        git commit -m "$commit_msg"

        echo -e "${BLUE}📤 Push vers origin/main...${NC}"
        git push origin main

        echo -e "${GREEN}✅ Modifications pushées avec succès${NC}"
    else
        echo -e "${GREEN}✅ Rien à faire, tout est synchronisé${NC}"
    fi

# CAS 2: En retard (besoin de pull)
elif [ "$LOCAL" = "$BASE" ]; then
    echo -e "${YELLOW}📥 Vous êtes en retard par rapport au remote${NC}"

    # S'il y a des modifications locales, les commit d'abord
    if [ "$HAS_LOCAL_CHANGES" = true ]; then
        echo ""
        echo -e "${YELLOW}💾 Commit des modifications locales avant pull...${NC}"
        echo ""
        read -p "Message de commit: " commit_msg

        if [ -z "$commit_msg" ]; then
            commit_msg="WIP: Auto-commit before pull $(date '+%Y-%m-%d %H:%M:%S')"
        fi

        git add .
        git commit -m "$commit_msg"
        echo -e "${GREEN}✓ Modifications committées${NC}"
    fi

    echo ""
    echo -e "${BLUE}📥 Pull des modifications distantes...${NC}"

    # Pull avec merge automatique
    if git pull origin main --no-edit; then
        echo -e "${GREEN}✅ Pull réussi !${NC}"
    else
        echo -e "${RED}❌ Conflit détecté lors du pull${NC}"
        echo ""
        echo -e "${YELLOW}🔧 Résolution des conflits...${NC}"
        echo ""

        # Afficher les fichiers en conflit
        echo -e "${CYAN}Fichiers en conflit:${NC}"
        git diff --name-only --diff-filter=U
        echo ""

        read -p "Voulez-vous accepter TOUTES vos modifications locales ? (y/n) [y]: " keep_ours
        keep_ours=${keep_ours:-y}

        if [ "$keep_ours" = "y" ]; then
            echo -e "${YELLOW}📝 Acceptation de vos modifications locales...${NC}"
            git checkout --ours .
            git add .
            git commit -m "Merge: Keep local changes $(date '+%Y-%m-%d %H:%M:%S')"
            echo -e "${GREEN}✅ Conflits résolus (vos modifications gardées)${NC}"
        else
            read -p "Voulez-vous accepter TOUTES les modifications distantes ? (y/n) [n]: " keep_theirs

            if [ "$keep_theirs" = "y" ]; then
                echo -e "${YELLOW}📝 Acceptation des modifications distantes...${NC}"
                git checkout --theirs .
                git add .
                git commit -m "Merge: Keep remote changes $(date '+%Y-%m-%d %H:%M:%S')"
                echo -e "${GREEN}✅ Conflits résolus (modifications distantes gardées)${NC}"
            else
                echo -e "${RED}❌ Veuillez résoudre les conflits manuellement${NC}"
                echo ""
                echo "Commandes utiles:"
                echo "  git status                    # Voir les conflits"
                echo "  git checkout --ours fichier   # Garder votre version"
                echo "  git checkout --theirs fichier # Garder la version distante"
                echo "  git add .                     # Marquer comme résolu"
                echo "  git commit                    # Finaliser le merge"
                echo "  git merge --abort             # Annuler complètement"
                exit 1
            fi
        fi
    fi

# CAS 3: En avance (besoin de push)
elif [ "$REMOTE" = "$BASE" ]; then
    echo -e "${BLUE}📤 Vous êtes en avance par rapport au remote${NC}"

    # S'il y a des modifications non commitées
    if [ "$HAS_LOCAL_CHANGES" = true ]; then
        echo ""
        echo -e "${YELLOW}💾 Commit des modifications...${NC}"
        echo ""
        read -p "Message de commit: " commit_msg

        if [ -z "$commit_msg" ]; then
            commit_msg="Update $(date '+%Y-%m-%d %H:%M:%S')"
        fi

        git add .
        git commit -m "$commit_msg"
        echo -e "${GREEN}✓ Modifications committées${NC}"
    fi

    echo ""
    echo -e "${BLUE}📤 Push vers origin/main...${NC}"
    git push origin main
    echo -e "${GREEN}✅ Push réussi !${NC}"

# CAS 4: Divergence (historiques différents)
else
    echo -e "${RED}⚠️  DIVERGENCE DÉTECTÉE${NC}"
    echo ""
    echo "Vos commits locaux et les commits distants ont divergé."
    echo ""

    # Afficher les commits divergents
    echo -e "${CYAN}📊 Vos commits locaux (absents du remote):${NC}"
    git log --oneline origin/main..main | head -5
    echo ""
    echo -e "${CYAN}📊 Commits distants (absents en local):${NC}"
    git log --oneline main..origin/main | head -5
    echo ""

    # Commit les modifications locales si nécessaire
    if [ "$HAS_LOCAL_CHANGES" = true ]; then
        echo -e "${YELLOW}💾 Commit des modifications locales...${NC}"
        echo ""
        read -p "Message de commit: " commit_msg

        if [ -z "$commit_msg" ]; then
            commit_msg="WIP: Auto-commit $(date '+%Y-%m-%d %H:%M:%S')"
        fi

        git add .
        git commit -m "$commit_msg"
        echo -e "${GREEN}✓ Modifications committées${NC}"
        echo ""
    fi

    echo -e "${YELLOW}Choisissez la stratégie:${NC}"
    echo "  1) FORCER AVEC VOS MODIFICATIONS (overwrites remote) ⚠️"
    echo "  2) Merge (combine les deux historiques)"
    echo "  3) Rebase (applique vos commits après le remote)"
    echo "  4) Annuler"
    echo ""
    read -p "Votre choix (1-4): " strategy

    case $strategy in
        1)
            echo ""
            echo -e "${RED}⚠️  ATTENTION: Cela va ÉCRASER les modifications distantes !${NC}"
            read -p "Êtes-vous SÛR ? Tapez 'FORCE' pour confirmer: " confirm

            if [ "$confirm" = "FORCE" ]; then
                echo -e "${YELLOW}💪 Force push vers origin/main...${NC}"
                git push --force origin main
                echo -e "${GREEN}✅ Push forcé réussi (remote écrasé)${NC}"
            else
                echo -e "${RED}❌ Annulé (confirmation incorrecte)${NC}"
                exit 1
            fi
            ;;
        2)
            echo -e "${BLUE}🔀 Merge des branches...${NC}"
            if git pull origin main --no-edit; then
                echo -e "${GREEN}✅ Merge réussi${NC}"
                echo -e "${BLUE}📤 Push du résultat...${NC}"
                git push origin main
                echo -e "${GREEN}✅ Synchronisation complète${NC}"
            else
                echo -e "${RED}❌ Conflit lors du merge${NC}"
                echo ""
                read -p "Garder VOS modifications ? (y/n) [y]: " keep_ours
                keep_ours=${keep_ours:-y}

                if [ "$keep_ours" = "y" ]; then
                    git checkout --ours .
                    git add .
                    git commit -m "Merge: Keep local changes"
                    git push origin main
                    echo -e "${GREEN}✅ Conflits résolus (vos modifs gardées)${NC}"
                else
                    git checkout --theirs .
                    git add .
                    git commit -m "Merge: Keep remote changes"
                    git push origin main
                    echo -e "${GREEN}✅ Conflits résolus (modifs distantes gardées)${NC}"
                fi
            fi
            ;;
        3)
            echo -e "${BLUE}🔄 Rebase sur origin/main...${NC}"
            if git pull --rebase origin main; then
                echo -e "${GREEN}✅ Rebase réussi${NC}"
                echo -e "${BLUE}📤 Push des modifications...${NC}"
                git push origin main
                echo -e "${GREEN}✅ Push réussi${NC}"
            else
                echo -e "${RED}❌ Conflit lors du rebase${NC}"
                echo ""
                echo "Résolvez les conflits puis:"
                echo "  git add ."
                echo "  git rebase --continue"
                echo "  git push origin main"
                echo ""
                echo "Ou annulez avec: git rebase --abort"
                exit 1
            fi
            ;;
        4|*)
            echo -e "${RED}❌ Synchronisation annulée${NC}"
            exit 1
            ;;
    esac
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Synchronisation terminée !${NC}"
echo ""

# Afficher le statut final
echo -e "${CYAN}📊 Statut final:${NC}"
git status --short --branch
echo ""
echo -e "${GREEN}✅ Vous êtes sur 'main' et tout est synchronisé${NC}"
