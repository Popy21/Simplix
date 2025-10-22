#!/bin/bash

# Script de synchronisation Git automatique AVANCÉ - Travail en équipe
# Gère: stash, overwrites, conflicts, protections, et garde tout sur main
# Version: 2.0 - Safe Team Mode

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       🔄 Git Sync - Mode Équipe Sécurisé v2.0             ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Vérifier si on est dans un dépôt Git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Erreur: Pas dans un dépôt Git${NC}"
    exit 1
fi

# Fonction de détection de suppressions massives
check_dangerous_deletions() {
    local deleted_count=$(git status --short | grep -c "^ D" || true)
    local total_files=$(git ls-files | wc -l | tr -d ' ')
    
    if [ "$deleted_count" -gt 10 ]; then
        echo -e "${RED}⚠️  ALERTE: $deleted_count fichiers supprimés détectés !${NC}"
        echo -e "${YELLOW}Fichiers supprimés:${NC}"
        git status --short | grep "^ D" | head -20
        
        if [ "$deleted_count" -gt 20 ]; then
            echo -e "${YELLOW}... et $(($deleted_count - 20)) autres fichiers${NC}"
        fi
        
        echo ""
        echo -e "${RED}⚠️  DANGER: Suppression massive détectée !${NC}"
        echo -e "${YELLOW}Cela pourrait être une erreur (ex: git rm, mv mal exécuté)${NC}"
        echo ""
        read -p "Êtes-vous SÛR de vouloir supprimer ces fichiers ? Tapez 'DELETE' pour confirmer: " confirm
        
        if [ "$confirm" != "DELETE" ]; then
            echo -e "${GREEN}✅ Synchronisation annulée pour votre sécurité${NC}"
            echo -e "${BLUE}💡 Conseil: Vérifiez avec 'git status' ce qui a été supprimé${NC}"
            echo -e "${BLUE}💡 Pour restaurer: git restore <fichier> ou git restore .${NC}"
            exit 0
        fi
    fi
}

# Fonction de vérification de l'identité Git
check_git_identity() {
    local git_name=$(git config user.name || echo "")
    local git_email=$(git config user.email || echo "")
    
    if [ -z "$git_name" ] || [ -z "$git_email" ]; then
        echo -e "${YELLOW}⚠️  Configuration Git incomplète${NC}"
        echo ""
        
        if [ -z "$git_name" ]; then
            read -p "Votre nom complet: " git_name
            git config --global user.name "$git_name"
        fi
        
        if [ -z "$git_email" ]; then
            read -p "Votre email: " git_email
            git config --global user.email "$git_email"
        fi
        
        echo -e "${GREEN}✓ Identité configurée: $git_name <$git_email>${NC}"
        echo ""
    fi
}

# Fonction de backup automatique avant opérations dangereuses
create_backup_branch() {
    local backup_name="backup-$(date '+%Y%m%d-%H%M%S')"
    git branch "$backup_name" 2>/dev/null || true
    echo -e "${BLUE}💾 Backup créé: $backup_name${NC}"
}

# Fonction de nettoyage des vieux backups (garde les 5 derniers)
cleanup_old_backups() {
    local backup_count=$(git branch | grep -c "backup-" || true)
    if [ "$backup_count" -gt 5 ]; then
        echo -e "${BLUE}🧹 Nettoyage des anciens backups...${NC}"
        git branch | grep "backup-" | head -n $(($backup_count - 5)) | xargs -r git branch -D 2>/dev/null || true
    fi
}

# Vérifier l'identité Git
check_git_identity

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
git fetch origin main 2>/dev/null || {
    echo -e "${RED}❌ Erreur lors de la récupération du remote${NC}"
    echo -e "${YELLOW}Vérifiez votre connexion internet ou les permissions GitHub${NC}"
    exit 1
}

# Vérifier s'il y a des modifications locales
HAS_LOCAL_CHANGES=false
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}📝 Modifications locales détectées${NC}"
    HAS_LOCAL_CHANGES=true

    # PROTECTION: Vérifier les suppressions massives
    check_dangerous_deletions

    # Afficher un résumé des modifications
    echo ""
    echo -e "${CYAN}Résumé des modifications:${NC}"
    added=$(git status --short | grep -c "^??" || true)
    modified=$(git status --short | grep -c "^ M" || true)
    deleted=$(git status --short | grep -c "^ D" || true)
    
    echo -e "${GREEN}  ✓ Ajoutés: $added fichiers${NC}"
    echo -e "${BLUE}  ✓ Modifiés: $modified fichiers${NC}"
    [ "$deleted" -gt 0 ] && echo -e "${YELLOW}  ⚠️  Supprimés: $deleted fichiers${NC}"
    
    echo ""
    echo -e "${CYAN}Détails des modifications:${NC}"
    git status --short | head -20
    
    total_changes=$(git status --short | wc -l | tr -d ' ')
    if [ "$total_changes" -gt 20 ]; then
        echo -e "${YELLOW}... et $(($total_changes - 20)) autres modifications${NC}"
    fi
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
        
        # Afficher l'auteur du dernier commit remote pour info
        last_author=$(git log origin/main -1 --pretty=format:"%an" 2>/dev/null || echo "inconnu")
        echo -e "${CYAN}💡 Dernier commit sur le remote par: $last_author${NC}"
        echo ""
        
        read -p "Message de commit: " commit_msg

        if [ -z "$commit_msg" ]; then
            commit_msg="Update $(date '+%Y-%m-%d %H:%M:%S')"
        fi

        echo -e "${BLUE}💾 Commit des modifications...${NC}"
        git add .
        git commit -m "$commit_msg"

        echo -e "${BLUE}📤 Push vers origin/main...${NC}"
        
        # Vérifier une dernière fois qu'on est toujours à jour avant de push
        git fetch origin main 2>/dev/null
        if [ "$(git rev-parse main)" != "$(git rev-parse origin/main)" ]; then
            echo -e "${YELLOW}⚠️  Le remote a changé pendant votre commit !${NC}"
            echo -e "${BLUE}Relancer le script pour synchroniser correctement${NC}"
            exit 0
        fi
        
        if git push origin main; then
            echo -e "${GREEN}✅ Modifications pushées avec succès${NC}"
        else
            echo -e "${RED}❌ Erreur lors du push${NC}"
            echo -e "${YELLOW}Quelqu'un d'autre a peut-être push en même temps${NC}"
            echo -e "${BLUE}Relancer le script pour synchroniser${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ Rien à faire, tout est synchronisé${NC}"
    fi

# CAS 2: En retard (besoin de pull)
elif [ "$LOCAL" = "$BASE" ]; then
    echo -e "${YELLOW}📥 Vous êtes en retard par rapport au remote${NC}"
    
    # Afficher qui a fait les derniers commits
    echo ""
    echo -e "${CYAN}📊 Derniers commits sur le remote:${NC}"
    git log --oneline origin/main..main --reverse 2>/dev/null || git log --oneline origin/main -3
    echo ""

    # S'il y a des modifications locales, créer un backup puis les commit
    if [ "$HAS_LOCAL_CHANGES" = true ]; then
        echo -e "${YELLOW}💾 Sauvegarde automatique avant pull...${NC}"
        create_backup_branch
        
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
        cleanup_old_backups
    else
        echo -e "${RED}❌ Conflit détecté lors du pull${NC}"
        echo ""
        echo -e "${YELLOW}🔧 Résolution des conflits...${NC}"
        echo ""

        # Afficher les fichiers en conflit
        echo -e "${CYAN}Fichiers en conflit:${NC}"
        git diff --name-only --diff-filter=U
        echo ""
        
        echo -e "${MAGENTA}Options de résolution:${NC}"
        echo "  1) Garder VOS modifications (--ours)"
        echo "  2) Garder les modifications DISTANTES (--theirs)"
        echo "  3) Annuler le merge et résoudre manuellement"
        echo ""
        read -p "Votre choix (1-3) [3]: " conflict_choice
        conflict_choice=${conflict_choice:-3}

        case $conflict_choice in
            1)
                echo -e "${YELLOW}📝 Acceptation de vos modifications locales...${NC}"
                git checkout --ours .
                git add .
                git commit -m "Merge: Keep local changes $(date '+%Y-%m-%d %H:%M:%S')"
                echo -e "${GREEN}✅ Conflits résolus (vos modifications gardées)${NC}"
                cleanup_old_backups
                ;;
            2)
                echo -e "${YELLOW}📝 Acceptation des modifications distantes...${NC}"
                git checkout --theirs .
                git add .
                git commit -m "Merge: Keep remote changes $(date '+%Y-%m-%d %H:%M:%S')"
                echo -e "${GREEN}✅ Conflits résolus (modifications distantes gardées)${NC}"
                cleanup_old_backups
                ;;
            *)
                echo -e "${YELLOW}❌ Merge annulé - résolution manuelle nécessaire${NC}"
                echo ""
                echo -e "${CYAN}Commandes utiles:${NC}"
                echo "  git status                    # Voir les conflits"
                echo "  git diff                      # Voir les différences"
                echo "  git checkout --ours fichier   # Garder votre version"
                echo "  git checkout --theirs fichier # Garder la version distante"
                echo "  git add <fichier>             # Marquer comme résolu"
                echo "  git commit                    # Finaliser le merge"
                echo "  git merge --abort             # Annuler complètement"
                echo ""
                echo -e "${BLUE}💡 Backup disponible dans la branche backup-*${NC}"
                git branch | grep "backup-" | tail -1
                exit 1
                ;;
        esac
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
    echo -e "${YELLOW}Vos commits locaux et les commits distants ont divergé.${NC}"
    echo -e "${YELLOW}Cela arrive quand plusieurs personnes travaillent en parallèle.${NC}"
    echo ""

    # Créer un backup automatique
    create_backup_branch
    echo ""

    # Afficher les commits divergents avec auteurs
    echo -e "${CYAN}📊 Vos commits locaux (absents du remote):${NC}"
    git log --oneline --pretty=format:"%h %an: %s" origin/main..main | head -5
    echo ""
    echo ""
    echo -e "${CYAN}📊 Commits distants (absents en local):${NC}"
    git log --oneline --pretty=format:"%h %an: %s" main..origin/main | head -5
    echo ""
    echo ""

    # Commit les modifications locales si nécessaire
    if [ "$HAS_LOCAL_CHANGES" = true ]; then
        echo -e "${YELLOW}💾 Commit des modifications locales d'abord...${NC}"
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

    echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║           Choisissez la stratégie de résolution            ║${NC}"
    echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}Recommandé pour le travail en équipe:${NC}"
    echo "  ${GREEN}2) Merge${NC} - Combine les deux historiques (RECOMMANDÉ)"
    echo "     ✓ Préserve tout l'historique"
    echo "     ✓ Sûr pour le travail collaboratif"
    echo ""
    echo -e "${YELLOW}Options avancées:${NC}"
    echo "  ${BLUE}3) Rebase${NC} - Applique vos commits après le remote"
    echo "     ⚠️  Réécrit l'historique (peut être dangereux)"
    echo ""
    echo "  ${RED}1) Force Push${NC} - ÉCRASER le remote avec vos changements"
    echo "     ⚠️  DANGER: Supprime le travail des autres !"
    echo ""
    echo "  4) Annuler et résoudre manuellement"
    echo ""
    read -p "Votre choix (1-4) [2]: " strategy
    strategy=${strategy:-2}

    case $strategy in
        1)
            echo ""
            echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
            echo -e "${RED}║                    ⚠️  DANGER CRITIQUE ⚠️                  ║${NC}"
            echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
            echo ""
            echo -e "${RED}Cela va ÉCRASER définitivement les modifications distantes !${NC}"
            echo -e "${YELLOW}Tous les commits de vos collègues seront PERDUS !${NC}"
            echo ""
            echo -e "${CYAN}Commits qui seront SUPPRIMÉS du remote:${NC}"
            git log --oneline --pretty=format:"%h %an: %s" main..origin/main
            echo ""
            echo ""
            read -p "Avez-vous PRÉVENU votre équipe ? (y/n) [n]: " team_notified
            
            if [ "$team_notified" != "y" ]; then
                echo -e "${YELLOW}⚠️  Prévenez d'abord votre équipe avant de force push !${NC}"
                echo -e "${RED}Force push annulé pour protéger le travail de l'équipe${NC}"
                exit 1
            fi
            
            read -p "Tapez exactement 'FORCE PUSH' pour confirmer: " confirm

            if [ "$confirm" = "FORCE PUSH" ]; then
                echo -e "${YELLOW}💪 Force push vers origin/main...${NC}"
                if git push --force origin main; then
                    echo -e "${GREEN}✅ Push forcé réussi (remote écrasé)${NC}"
                    echo -e "${YELLOW}⚠️  Prévenez immédiatement votre équipe de faire un 'git pull --force'${NC}"
                    cleanup_old_backups
                else
                    echo -e "${RED}❌ Erreur lors du force push${NC}"
                    exit 1
                fi
            else
                echo -e "${RED}❌ Confirmation incorrecte - force push annulé${NC}"
                echo -e "${GREEN}✅ Travail de l'équipe préservé${NC}"
                exit 1
            fi
            ;;
        2)
            echo -e "${BLUE}🔀 Merge des branches (recommandé pour l'équipe)...${NC}"
            if git pull origin main --no-edit; then
                echo -e "${GREEN}✅ Merge réussi automatiquement${NC}"
                echo -e "${BLUE}📤 Push du résultat...${NC}"
                git push origin main
                echo -e "${GREEN}✅ Synchronisation complète${NC}"
                cleanup_old_backups
            else
                echo -e "${RED}❌ Conflit lors du merge${NC}"
                echo ""
                echo -e "${MAGENTA}Résolution des conflits:${NC}"
                echo "  1) Garder VOS modifications"
                echo "  2) Garder les modifications DISTANTES"
                echo "  3) Annuler et résoudre manuellement"
                echo ""
                read -p "Votre choix (1-3) [3]: " merge_choice
                merge_choice=${merge_choice:-3}

                case $merge_choice in
                    1)
                        git checkout --ours .
                        git add .
                        git commit -m "Merge: Keep local changes (team sync)"
                        git push origin main
                        echo -e "${GREEN}✅ Conflits résolus (vos modifs gardées)${NC}"
                        cleanup_old_backups
                        ;;
                    2)
                        git checkout --theirs .
                        git add .
                        git commit -m "Merge: Keep remote changes (team sync)"
                        git push origin main
                        echo -e "${GREEN}✅ Conflits résolus (modifs distantes gardées)${NC}"
                        cleanup_old_backups
                        ;;
                    *)
                        echo -e "${YELLOW}Merge annulé - résolution manuelle${NC}"
                        echo -e "${BLUE}💡 Backup disponible:${NC}"
                        git branch | grep "backup-" | tail -1
                        exit 1
                        ;;
                esac
            fi
            ;;
        3)
            echo -e "${BLUE}🔄 Rebase sur origin/main...${NC}"
            echo -e "${YELLOW}⚠️  Le rebase réécrit l'historique${NC}"
            if git pull --rebase origin main; then
                echo -e "${GREEN}✅ Rebase réussi${NC}"
                echo -e "${BLUE}📤 Push des modifications...${NC}"
                git push origin main
                echo -e "${GREEN}✅ Push réussi${NC}"
                cleanup_old_backups
            else
                echo -e "${RED}❌ Conflit lors du rebase${NC}"
                echo ""
                echo -e "${CYAN}Résolution manuelle nécessaire:${NC}"
                echo "  1. Résolvez les conflits dans les fichiers"
                echo "  2. git add <fichiers-résolus>"
                echo "  3. git rebase --continue"
                echo "  4. git push origin main"
                echo ""
                echo -e "${YELLOW}Ou annulez avec: git rebase --abort${NC}"
                echo -e "${BLUE}💡 Backup disponible:${NC}"
                git branch | grep "backup-" | tail -1
                exit 1
            fi
            ;;
        4|*)
            echo -e "${YELLOW}❌ Synchronisation annulée${NC}"
            echo -e "${BLUE}💡 Backup créé:${NC}"
            git branch | grep "backup-" | tail -1
            echo ""
            echo -e "${CYAN}Pour synchroniser manuellement plus tard:${NC}"
            echo "  ./git-sync.sh"
            exit 0
            ;;
    esac
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Synchronisation terminée avec succès !${NC}"
echo ""

# Afficher le statut final
echo -e "${CYAN}📊 Statut final:${NC}"
git status --short --branch
echo ""

# Afficher les derniers commits pour info
echo -e "${CYAN}📜 Derniers commits:${NC}"
git log --oneline --pretty=format:"%C(yellow)%h%C(reset) %C(cyan)%an%C(reset): %s" -5
echo ""
echo ""

echo -e "${GREEN}✅ Vous êtes sur 'main' et synchronisé avec le remote${NC}"

# Afficher les backups disponibles si il y en a
backup_count=$(git branch | grep -c "backup-" || true)
if [ "$backup_count" -gt 0 ]; then
    echo -e "${BLUE}💾 $backup_count backup(s) disponible(s) en cas de besoin${NC}"
    echo -e "${CYAN}   Pour voir: git branch | grep backup${NC}"
fi

echo ""
echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║    🤝 Pensez à communiquer avec votre équipe ! 🤝         ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════╝${NC}"
