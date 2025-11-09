# 🚀 SIMPLIX - QUICK START GUIDE

Démarrez Simplix en 5 minutes avec Docker !

## 📋 Prérequis

- **Docker** >= 20.x
- **Docker Compose** >= 2.x

Vérifier :
```bash
docker --version
docker-compose --version
```

## ⚡ Démarrage rapide (Docker)

### 1. Cloner le projet

```bash
git clone https://github.com/Popy21/Simplix.git
cd Simplix
```

### 2. Démarrer tous les services

```bash
# Démarrer PostgreSQL, Redis, API et Adminer
docker-compose up -d

# Vérifier que tout fonctionne
docker-compose ps
```

### 3. Appliquer les migrations

```bash
# Exécuter les migrations (première fois)
docker-compose --profile tools run --rm migrations

# Ou manuellement
docker-compose exec postgres psql -U simplix_user -d simplix_crm -f /docker-entrypoint-initdb.d/001_initial_schema.sql
```

### 4. Tester l'API

```bash
# Health check
curl http://localhost:3000/health

# Devrait retourner:
# {"status":"ok","timestamp":"..."}
```

## 🌐 URLs disponibles

| Service | URL | Description |
|---------|-----|-------------|
| **API Backend** | http://localhost:3000 | API REST |
| **Swagger Docs** | http://localhost:3000/api-docs | Documentation interactive |
| **Adminer** | http://localhost:8080 | Interface PostgreSQL |
| **PostgreSQL** | localhost:5432 | Base de données |
| **Redis** | localhost:6379 | Cache |

### Credentials Adminer

- **Système:** PostgreSQL
- **Serveur:** postgres
- **Utilisateur:** simplix_user
- **Mot de passe:** simplix_password_2025
- **Base de données:** simplix_crm

## 🔧 Commandes utiles

### Gérer les services

```bash
# Démarrer
docker-compose up -d

# Arrêter
docker-compose down

# Redémarrer
docker-compose restart

# Voir les logs
docker-compose logs -f

# Logs d'un service spécifique
docker-compose logs -f api
docker-compose logs -f postgres
```

### Accéder aux containers

```bash
# Shell dans l'API
docker-compose exec api sh

# Shell dans PostgreSQL
docker-compose exec postgres psql -U simplix_user -d simplix_crm

# Shell dans Redis
docker-compose exec redis redis-cli
```

### Base de données

```bash
# Backup
docker-compose exec postgres pg_dump -U simplix_user simplix_crm > backup.sql

# Restore
docker-compose exec -T postgres psql -U simplix_user -d simplix_crm < backup.sql

# Réinitialiser complètement
docker-compose down -v
docker-compose up -d
docker-compose --profile tools run --rm migrations
```

## 📦 Seed data (données de démo)

```bash
# Charger les données de démo
docker-compose exec api node dist/scripts/seed.js

# Ou manuellement
docker-compose exec postgres psql -U simplix_user -d simplix_crm -f /migrations/seed.sql
```

## 🧪 Tester l'API

### 1. Créer un compte

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin Test",
    "email": "admin@test.com",
    "password": "Test1234!",
    "organization_name": "Test Company"
  }'
```

Sauvegarder le token retourné :
```bash
export TOKEN="eyJhbGc..."
```

### 2. Tester les modules

**Comptabilité - Créer un compte bancaire:**
```bash
curl -X POST http://localhost:3000/api/bank-accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "account_name": "Compte Principal",
    "bank_name": "BNP Paribas",
    "iban": "FR7630004000031234567890143",
    "currency": "EUR",
    "opening_balance": 10000
  }'
```

**Projets - Créer un projet:**
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Site E-commerce",
    "project_type": "time_and_materials",
    "status": "active",
    "hourly_rate": 75.00
  }'
```

**RH - Créer un employé:**
```bash
curl -X POST http://localhost:3000/api/employees \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jean",
    "last_name": "Dupont",
    "email": "jean@test.com",
    "job_title": "Développeur",
    "hire_date": "2025-01-01",
    "base_salary": 45000
  }'
```

Plus d'exemples dans `DEPLOYMENT_GUIDE.md`.

## 🐛 Troubleshooting

### Port déjà utilisé

```bash
# Changer le port dans docker-compose.yml
ports:
  - "3001:3000"  # au lieu de 3000:3000
```

### Migrations ne s'appliquent pas

```bash
# Vérifier les logs
docker-compose logs migrations

# Réappliquer manuellement
docker-compose exec postgres sh
cd /migrations
for f in *.sql; do psql -U simplix_user -d simplix_crm -f "$f"; done
```

### L'API ne démarre pas

```bash
# Vérifier les logs
docker-compose logs api

# Vérifier que PostgreSQL est prêt
docker-compose exec postgres pg_isready

# Redémarrer l'API
docker-compose restart api
```

### Réinitialiser complètement

```bash
# ATTENTION: Supprime TOUTES les données !
docker-compose down -v
docker volume prune -f
docker-compose up -d
docker-compose --profile tools run --rm migrations
```

## 🔥 Mode développement (sans Docker)

Si vous préférez développer sans Docker :

### 1. Installer PostgreSQL localement

Voir `DEPLOYMENT_GUIDE.md` section "Installation PostgreSQL"

### 2. Configuration

```bash
cd api
cp .env.example .env
nano .env  # Éditer les credentials
```

### 3. Installer et démarrer

```bash
# Installer dépendances
npm install

# Appliquer migrations
cd ../database
./migrate.sh up

# Démarrer API en mode dev
cd ../api
npm run dev
```

## 📚 Documentation complète

- **Vue d'ensemble:** [SIMPLIX_V4_README.md](./SIMPLIX_V4_README.md)
- **Roadmap technique:** [ROADMAP_IMPLEMENTATION.md](./ROADMAP_IMPLEMENTATION.md)
- **Guide déploiement:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **API Swagger:** http://localhost:3000/api-docs (quand serveur lancé)

## 🎯 Prochaines étapes

Une fois l'API lancée :

1. **Tester Swagger:** http://localhost:3000/api-docs
2. **Créer un compte de test**
3. **Explorer les modules** via Swagger ou curl
4. **Charger les données de démo:** `docker-compose exec api node dist/scripts/seed.js`
5. **Développer le frontend** (React Native dans `/web-app`)

## 💡 Tips

### Monitoring en temps réel

```bash
# Logs de tous les services
docker-compose logs -f

# Stats des containers
docker stats
```

### Performance

```bash
# Voir les requêtes lentes PostgreSQL
docker-compose exec postgres psql -U simplix_user -d simplix_crm -c \
  "SELECT query, calls, total_time, mean_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;"
```

### Backup automatique

Ajouter dans crontab :
```bash
0 2 * * * cd /path/to/Simplix && docker-compose exec -T postgres pg_dump -U simplix_user simplix_crm | gzip > backups/simplix_$(date +\%Y\%m\%d).sql.gz
```

## 🆘 Support

- **Issues GitHub:** https://github.com/Popy21/Simplix/issues
- **Documentation:** `/docs`
- **Logs:** `docker-compose logs`

---

**Développé avec ❤️ - Simplix v4.0**
