-- Ajouter des logos aux clients de test
-- Utilise le logo de l'entreprise Paraweb pour certains clients

BEGIN;

-- Mettre à jour les clients avec des logos
-- Utilisation du logo Paraweb pour les 3 premiers clients principaux
UPDATE customers SET logo_url = '/uploads/image-1761735360980-997893879.png'
WHERE name IN ('Techno Solutions', 'Innovatech France', 'Digital Consulting');

-- Pour les autres clients, on peut utiliser des logos génériques ou laisser NULL
-- (Vous pourrez ajouter des logos personnalisés plus tard)

-- Vérification
SELECT id, name, company, logo_url FROM customers
WHERE name LIKE '%Solutions%' OR name LIKE '%France%' OR name LIKE '%Consulting%'
ORDER BY created_at ASC
LIMIT 10;

COMMIT;
