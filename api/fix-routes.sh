#!/bin/bash

# Script pour remplacer temporairement db par pool dans toutes les routes
# Cela permettra à l'API de démarrer

echo "🔄 Adaptation des routes pour PostgreSQL..."

# Remplacer "import db from" par "import { pool } from" dans tous les fichiers routes
find src/routes -name "*.ts" -type f -exec sed -i '' 's/import db from/import { pool as db } from/g' {} \;

# Remplacer "import db," par "import { pool as db," dans tous les fichiers
find src/routes -name "*.ts" -type f -exec sed -i '' 's/import db,/import { pool as db },/g' {} \;

echo "✅ Routes adaptées"
echo "⚠️  Attention: Les routes ont été temporairement adaptées"
echo "   Certaines fonctionnalités peuvent ne pas fonctionner correctement"
echo "   car PostgreSQL utilise une API différente de SQLite"
