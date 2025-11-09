#!/usr/bin/env python3
"""
Remote deployment script for Simplix v4.0
Uses Python standard library to deploy to production server
"""

import subprocess
import sys
import time

# Server configuration
SERVER = "82.165.134.105"
USER = "root"
PASSWORD = "HkVB9iuftdyè(4442212l???"
SCRIPT_URL = "https://raw.githubusercontent.com/Popy21/Simplix/claude/simplix-roadmap-analysis-011CUx1wAomWPhRbBARmsgTw/deploy-server-side.sh"

print("=" * 70)
print("🚀 SIMPLIX v4.0 - DÉPLOIEMENT AUTOMATIQUE")
print("=" * 70)
print()

# Deployment command to execute on server
deployment_command = f'curl -fsSL {SCRIPT_URL} | bash'

print(f"📡 Connexion au serveur {SERVER}...")
print(f"👤 Utilisateur: {USER}")
print(f"📥 Script: {SCRIPT_URL}")
print()
print("⚠️  Note: Ce script nécessite sshpass ou une clé SSH configurée")
print()

# Try different methods to connect

# Method 1: Try with sshpass (if available)
try:
    result = subprocess.run(
        ['which', 'sshpass'],
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        print("✓ sshpass trouvé, utilisation de sshpass...")
        cmd = [
            'sshpass', '-p', PASSWORD,
            'ssh',
            '-o', 'StrictHostKeyChecking=no',
            '-o', 'UserKnownHostsFile=/dev/null',
            f'{USER}@{SERVER}',
            deployment_command
        ]
        print(f"🔧 Exécution: {' '.join(cmd[:2])} *** ssh {USER}@{SERVER} ...")
        print()
        subprocess.run(cmd)
        sys.exit(0)
except Exception as e:
    print(f"✗ sshpass non disponible: {e}")

# Method 2: Try with SSH key (if available)
print("Tentative avec clé SSH...")
try:
    cmd = [
        'ssh',
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'UserKnownHostsFile=/dev/null',
        '-o', 'PasswordAuthentication=no',
        f'{USER}@{SERVER}',
        deployment_command
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
    if result.returncode == 0:
        print("✓ Déploiement réussi avec clé SSH!")
        print(result.stdout)
        sys.exit(0)
except Exception as e:
    print(f"✗ Clé SSH non disponible: {e}")

# Method 3: Show manual instructions
print()
print("=" * 70)
print("❌ DÉPLOIEMENT AUTOMATIQUE NON DISPONIBLE")
print("=" * 70)
print()
print("Les outils nécessaires (sshpass ou clé SSH) ne sont pas disponibles.")
print("Veuillez déployer manuellement en suivant ces étapes:")
print()
print("=" * 70)
print("📋 INSTRUCTIONS DE DÉPLOIEMENT MANUEL")
print("=" * 70)
print()
print("Étape 1: Connectez-vous au serveur")
print("-" * 70)
print(f"ssh {USER}@{SERVER}")
print(f"Mot de passe: {PASSWORD}")
print()
print("Étape 2: Exécutez le script de déploiement")
print("-" * 70)
print(deployment_command)
print()
print("=" * 70)
print()
print("Ou en une seule commande (copiez-collez dans votre terminal):")
print()
print(f"ssh {USER}@{SERVER} '{deployment_command}'")
print()
print("(Le mot de passe sera demandé)")
print()
print("=" * 70)
print("📚 Documentation complète: DEPLOY_INSTRUCTIONS.md")
print("🚀 Guide rapide: DEPLOY_NOW.md")
print("=" * 70)
