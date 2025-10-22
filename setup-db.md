cd database
docker-compose up -d
# PostgreSQL: localhost:5432
# pgAdmin: http://localhost:5050 (admin@simplix.local / admin)
Phase 1: Préparation (1-2 jours)
Installer PostgreSQL localement ou utiliser Docker
Exécuter les migrations: cd database && ./migrate.sh up
Charger les seed data: psql simplix_crm < database/seeds/001_default_data.sql
Phase 2: Migration des données (2-3 jours)
Exporter données SQLite avec le script fourni
Transformer les données avec transform-data.js
Importer dans PostgreSQL avec import-to-postgres.js
Phase 3: Adaptation de l'API (1-2 semaines)
Adapter chaque route pour utiliser PostgreSQL
Ajouter le multi-tenancy (organization_id)
Implémenter le soft delete (deleted_at)
Tester chaque endpoint
