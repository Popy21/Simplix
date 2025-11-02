-- Script de données de test en français pour Simplix CRM
-- Permet de tester l'application avec des données réalistes

BEGIN;

-- Nettoyage des données existantes (sauf utilisateurs et organisations)
DELETE FROM task_comments WHERE task_id IN (SELECT id FROM tasks);
DELETE FROM tasks;
DELETE FROM payments;
DELETE FROM invoices;
DELETE FROM quote_items;
DELETE FROM quotes;
DELETE FROM sales;
DELETE FROM products WHERE name LIKE '%Site%' OR name LIKE '%Application%' OR name LIKE '%SEO%' OR name LIKE '%Formation%';
DELETE FROM contacts WHERE email LIKE '%technosolutions%' OR email LIKE '%innovatech%' OR email LIKE '%digital-consulting%';
DELETE FROM customers WHERE name LIKE '%Solutions%' OR name LIKE '%France%' OR name LIKE '%Consulting%';

-- Insertion de clients français
INSERT INTO customers (name, email, phone, company, address, created_at, updated_at) VALUES
('Techno Solutions', 'contact@technosolutions.fr', '+33 1 42 85 63 47', 'Techno Solutions SARL', '15 Avenue des Champs-Élysées, 75008 Paris', NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days'),
('Innovatech France', 'info@innovatech.fr', '+33 4 91 54 32 18', 'Innovatech France SAS', '42 Boulevard de la Canebière, 13001 Marseille', NOW() - INTERVAL '85 days', NOW() - INTERVAL '85 days'),
('Digital Consulting', 'contact@digital-consulting.fr', '+33 5 56 48 22 33', 'Digital Consulting & Co', '88 Cours de l''Intendance, 33000 Bordeaux', NOW() - INTERVAL '80 days', NOW() - INTERVAL '80 days'),
('Web Services Lyon', 'hello@webservices-lyon.fr', '+33 4 78 62 44 55', 'Web Services Lyon EURL', '25 Rue de la République, 69002 Lyon', NOW() - INTERVAL '75 days', NOW() - INTERVAL '75 days'),
('E-Commerce Pro', 'contact@ecommercepro.fr', '+33 3 20 06 88 99', 'E-Commerce Pro SAS', '12 Rue Faidherbe, 59000 Lille', NOW() - INTERVAL '70 days', NOW() - INTERVAL '70 days'),
('StartUp Digitale', 'bonjour@startup-digitale.fr', '+33 2 40 89 33 22', 'StartUp Digitale', '8 Quai de la Fosse, 44000 Nantes', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),
('Marketing Plus', 'info@marketingplus.fr', '+33 3 88 35 77 44', 'Marketing Plus SARL', '18 Place Kléber, 67000 Strasbourg', NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days'),
('Tech Innovation', 'contact@techinnovation.fr', '+33 4 92 14 55 66', 'Tech Innovation SAS', '35 Promenade des Anglais, 06000 Nice', NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days'),
('Business Solutions', 'hello@business-solutions.fr', '+33 5 61 22 88 33', 'Business Solutions Group', '20 Allées Jean Jaurès, 31000 Toulouse', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
('Agence Créative', 'contact@agence-creative.fr', '+33 2 99 78 44 22', 'Agence Créative Rennes', '14 Rue Saint-Malo, 35000 Rennes', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days');

-- Comptage après insertion clients
SELECT 'Clients' as type, COUNT(*) as nombre FROM customers
UNION ALL SELECT 'Produits' as type, COUNT(*) as nombre FROM products
UNION ALL SELECT 'Devis' as type, COUNT(*) as nombre FROM quotes
UNION ALL SELECT 'Factures' as type, COUNT(*) as nombre FROM invoices
UNION ALL SELECT 'Paiements' as type, COUNT(*) as nombre FROM payments
UNION ALL SELECT 'Tâches' as type, COUNT(*) as nombre FROM tasks
UNION ALL SELECT 'Contacts' as type, COUNT(*) as nombre FROM contacts;

-- Insertion de produits/services en français
WITH first_org AS (
  SELECT organization_id FROM users ORDER BY created_at ASC LIMIT 1
)
INSERT INTO products (name, description, price, stock, organization_id, created_at, updated_at)
SELECT name, description, price, stock, first_org.organization_id, created_at, updated_at
FROM first_org, (VALUES
    ('Site Web Vitrine', 'Création d''un site web vitrine responsive avec 5 pages', 2500.00, 100, NOW() - INTERVAL '90 days', NOW()),
    ('Site E-commerce', 'Site e-commerce complet avec paiement en ligne et gestion produits', 5500.00, 50, NOW() - INTERVAL '90 days', NOW()),
    ('Application Mobile', 'Développement application mobile iOS et Android', 12000.00, 30, NOW() - INTERVAL '90 days', NOW()),
    ('Refonte Graphique', 'Refonte complète de l''identité visuelle et charte graphique', 3500.00, 75, NOW() - INTERVAL '90 days', NOW()),
    ('SEO Premium', 'Optimisation SEO complète avec suivi mensuel pendant 6 mois', 1800.00, 80, NOW() - INTERVAL '90 days', NOW()),
    ('Maintenance Mensuelle', 'Maintenance et support technique mensuel', 450.00, 200, NOW() - INTERVAL '90 days', NOW()),
    ('Formation WordPress', 'Formation à WordPress (2 jours)', 1200.00, 100, NOW() - INTERVAL '90 days', NOW()),
    ('Hébergement Pro', 'Hébergement professionnel avec SSL et backup quotidien (1 an)', 600.00, 150, NOW() - INTERVAL '90 days', NOW()),
    ('Logo & Identité', 'Création de logo et kit d''identité visuelle complet', 1500.00, 90, NOW() - INTERVAL '90 days', NOW()),
    ('Audit Technique', 'Audit complet de votre infrastructure web', 950.00, 120, NOW() - INTERVAL '90 days', NOW()),
    ('Pack Réseaux Sociaux', 'Gestion réseaux sociaux pendant 3 mois', 2400.00, 60, NOW() - INTERVAL '60 days', NOW()),
    ('Intégration CRM', 'Intégration et paramétrage CRM personnalisé', 4200.00, 40, NOW() - INTERVAL '60 days', NOW())
) AS v(name, description, price, stock, created_at, updated_at);

-- Insertion de devis (quotes) avec différents statuts
WITH customer_ids AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn FROM customers WHERE name LIKE '%Solutions%' OR name LIKE '%France%' OR name LIKE '%Consulting%'
)
INSERT INTO quotes (customer_id, title, description, subtotal, tax_rate, tax_amount, total_amount, status, quote_number, created_at, updated_at)
SELECT
  c.id,
  title,
  description,
  subtotal,
  tax_rate,
  tax_amount,
  total_amount,
  status,
  quote_number,
  created_at,
  updated_at
FROM (VALUES
  -- Devis acceptés
  (1, 'Site Web Corporate Techno Solutions', 'Création site vitrine + SEO Premium', 4300.00, 0.20, 860.00, 5160.00, 'accepted', 'DEV-2024-001', NOW() - INTERVAL '85 days', NOW() - INTERVAL '70 days'),
  (2, 'Refonte E-commerce Innovatech', 'Refonte complète boutique en ligne avec nouveau design', 9000.00, 0.20, 1800.00, 10800.00, 'accepted', 'DEV-2024-002', NOW() - INTERVAL '70 days', NOW() - INTERVAL '55 days'),
  (3, 'Application Mobile Digital Consulting', 'Application mobile de gestion pour tablette et smartphone', 14500.00, 0.20, 2900.00, 17400.00, 'accepted', 'DEV-2024-003', NOW() - INTERVAL '60 days', NOW() - INTERVAL '40 days'),
  (4, 'Pack Marketing Web Services Lyon', 'Site vitrine + Formation + Maintenance 6 mois', 4650.00, 0.20, 930.00, 5580.00, 'accepted', 'DEV-2024-004', NOW() - INTERVAL '50 days', NOW() - INTERVAL '35 days'),
  -- Devis envoyés (en attente)
  (5, 'Boutique en ligne E-Commerce Pro', 'Site e-commerce avec 200 produits et paiement sécurisé', 7800.00, 0.20, 1560.00, 9360.00, 'sent', 'DEV-2024-005', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
  (6, 'Refonte graphique StartUp Digitale', 'Nouvelle identité visuelle complète + supports print', 3200.00, 0.20, 640.00, 3840.00, 'sent', 'DEV-2024-006', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
  (7, 'Campagne SEO Marketing Plus', 'Optimisation SEO + contenus + netlinking 6 mois', 2400.00, 0.20, 480.00, 2880.00, 'sent', 'DEV-2024-007', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
  -- Devis brouillon
  (8, 'Site vitrine Tech Innovation', 'Site web corporate responsive - En cours d''élaboration', 2800.00, 0.20, 560.00, 3360.00, 'draft', 'DEV-2024-008', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
  (9, 'Intégration CRM Business Solutions', 'Mise en place CRM + formation équipe', 5200.00, 0.20, 1040.00, 6240.00, 'draft', 'DEV-2024-009', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  -- Devis rejeté
  (10, 'Application web Agence Créative', 'Application de gestion de projets sur mesure', 18000.00, 0.20, 3600.00, 21600.00, 'rejected', 'DEV-2024-010', NOW() - INTERVAL '30 days', NOW() - INTERVAL '25 days')
) AS v(customer_rn, title, description, subtotal, tax_rate, tax_amount, total_amount, status, quote_number, created_at, updated_at)
LEFT JOIN customer_ids c ON c.rn = v.customer_rn;

-- Insertion de factures (invoices)
WITH customer_ids AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn FROM customers WHERE name LIKE '%Solutions%' OR name LIKE '%France%' OR name LIKE '%Consulting%'
),
quote_ids AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn FROM quotes WHERE status = 'accepted'
)
INSERT INTO invoices (customer_id, quote_id, invoice_number, title, description, subtotal, tax_rate, tax_amount, total_amount, status, due_date, invoice_date, created_at, updated_at)
SELECT
  c.id,
  q.id,
  invoice_number,
  title,
  description,
  subtotal,
  tax_rate,
  tax_amount,
  total_amount,
  status,
  due_date,
  invoice_date,
  created_at,
  updated_at
FROM (VALUES
  -- Factures payées
  (1, 1, 'INV-2024-001', 'Facture - Site Web Corporate Techno Solutions', 'Paiement du devis DEV-2024-001', 4300.00, 0.20, 860.00, 5160.00, 'paid', NOW() - INTERVAL '60 days', NOW() - INTERVAL '70 days', NOW() - INTERVAL '70 days', NOW() - INTERVAL '70 days'),
  (2, 2, 'INV-2024-002', 'Facture - Refonte E-commerce Innovatech', 'Paiement du devis DEV-2024-002', 9000.00, 0.20, 1800.00, 10800.00, 'paid', NOW() - INTERVAL '45 days', NOW() - INTERVAL '55 days', NOW() - INTERVAL '55 days', NOW() - INTERVAL '55 days'),
  (3, 3, 'INV-2024-003', 'Facture - Application Mobile Digital Consulting', 'Paiement du devis DEV-2024-003', 14500.00, 0.20, 2900.00, 17400.00, 'paid', NOW() - INTERVAL '30 days', NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days'),
  (4, 4, 'INV-2024-004', 'Facture - Pack Marketing Web Services Lyon', 'Paiement du devis DEV-2024-004', 4650.00, 0.20, 930.00, 5580.00, 'paid', NOW() - INTERVAL '25 days', NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days'),
  -- Facture en attente (sent)
  (1, NULL, 'INV-2024-005', 'Facture - Maintenance Mensuelle Janvier', 'Maintenance et support mensuel', 450.00, 0.20, 90.00, 540.00, 'sent', NOW() + INTERVAL '15 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  -- Facture en retard
  (2, NULL, 'INV-2024-006', 'Facture - Hébergement Annuel', 'Hébergement Pro 12 mois', 600.00, 0.20, 120.00, 720.00, 'overdue', NOW() - INTERVAL '10 days', NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days')
) AS v(customer_rn, quote_rn, invoice_number, title, description, subtotal, tax_rate, tax_amount, total_amount, status, due_date, invoice_date, created_at, updated_at)
LEFT JOIN customer_ids c ON c.rn = v.customer_rn
LEFT JOIN quote_ids q ON q.rn = v.quote_rn;

-- Insertion de paiements (payments)
WITH invoice_ids AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn FROM invoices WHERE status = 'paid'
)
INSERT INTO payments (invoice_id, amount, payment_method, payment_date, transaction_id, notes, created_at)
SELECT
  i.id,
  amount,
  payment_method,
  payment_date,
  transaction_id,
  notes,
  created_at
FROM (VALUES
  (1, 5160.00, 'bank_transfer', NOW() - INTERVAL '55 days', 'VIRT-FR-20240115-001', 'Virement bancaire reçu', NOW() - INTERVAL '55 days'),
  (2, 10800.00, 'check', NOW() - INTERVAL '40 days', 'CHQ-20240130-002', 'Chèque encaissé', NOW() - INTERVAL '40 days'),
  (3, 17400.00, 'bank_transfer', NOW() - INTERVAL '25 days', 'VIRT-FR-20240215-003', 'Virement reçu - Application Mobile', NOW() - INTERVAL '25 days'),
  (4, 5580.00, 'card', NOW() - INTERVAL '20 days', 'CB-20240220-004', 'Paiement par carte bancaire', NOW() - INTERVAL '20 days')
) AS v(invoice_rn, amount, payment_method, payment_date, transaction_id, notes, created_at)
LEFT JOIN invoice_ids i ON i.rn = v.invoice_rn;

-- Insertion de ventes (sales)
WITH customer_ids AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn FROM customers WHERE name LIKE '%Solutions%' OR name LIKE '%France%' OR name LIKE '%Consulting%'
),
product_ids AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn FROM products WHERE name LIKE '%Site%' OR name LIKE '%Application%'
)
INSERT INTO sales (customer_id, product_id, quantity, total_amount, sale_date, status, notes, created_at, updated_at)
SELECT
  c.id,
  p.id,
  quantity,
  total_amount,
  sale_date,
  status,
  notes,
  created_at,
  updated_at
FROM (VALUES
  (1, 1, 1, 2500.00, NOW() - INTERVAL '55 days', 'completed', 'Site Web Vitrine - Client satisfait', NOW() - INTERVAL '70 days', NOW() - INTERVAL '55 days'),
  (2, 2, 1, 5500.00, NOW() - INTERVAL '40 days', 'completed', 'Site E-commerce - Projet d''envergure', NOW() - INTERVAL '55 days', NOW() - INTERVAL '40 days'),
  (3, 3, 1, 12000.00, NOW() - INTERVAL '25 days', 'completed', 'Application Mobile - Livrée dans les délais', NOW() - INTERVAL '40 days', NOW() - INTERVAL '25 days'),
  (4, 1, 1, 2500.00, NOW() - INTERVAL '20 days', 'completed', 'Site Web Vitrine - Formation réalisée avec succès', NOW() - INTERVAL '35 days', NOW() - INTERVAL '20 days')
) AS v(customer_rn, product_rn, quantity, total_amount, sale_date, status, notes, created_at, updated_at)
LEFT JOIN customer_ids c ON c.rn = v.customer_rn
LEFT JOIN product_ids p ON p.rn = v.product_rn;

-- Insertion de tâches (tasks) simplifiées
WITH first_org AS (
  SELECT organization_id FROM users ORDER BY created_at ASC LIMIT 1
)
INSERT INTO tasks (organization_id, title, description, status, priority, due_date, created_at, updated_at)
SELECT
  first_org.organization_id,
  title,
  description,
  task_status,
  priority,
  due_date,
  created_at,
  updated_at
FROM first_org, (VALUES
  ('Relancer E-Commerce Pro pour devis', 'Appeler le client pour discuter du devis de boutique en ligne', 'todo', 'high', NOW() + INTERVAL '2 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  ('Finaliser devis Tech Innovation', 'Compléter les détails du devis et l''envoyer', 'todo', 'medium', NOW() + INTERVAL '5 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  ('Préparer présentation CRM', 'Créer la présentation pour le rdv client', 'in_progress', 'high', NOW() + INTERVAL '7 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('Suivre devis Marketing Plus', 'Vérifier si le client a des questions sur le devis SEO', 'todo', 'medium', NOW() + INTERVAL '10 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
) AS v(title, description, task_status, priority, due_date, created_at, updated_at);

-- Note: Les contacts sont liés à des companies (UUIDs) dans cette version du schéma
-- On pourrait les ajouter plus tard si nécessaire

-- Vérification finale des données insérées
SELECT 'Clients' as type, COUNT(*) as nombre FROM customers WHERE name LIKE '%Solutions%' OR name LIKE '%France%' OR name LIKE '%Consulting%'
UNION ALL SELECT 'Produits' as type, COUNT(*) as nombre FROM products WHERE name LIKE '%Site%' OR name LIKE '%Application%' OR name LIKE '%SEO%'
UNION ALL SELECT 'Devis' as type, COUNT(*) as nombre FROM quotes WHERE quote_number LIKE 'DEV-2024-%'
UNION ALL SELECT 'Factures' as type, COUNT(*) as nombre FROM invoices WHERE invoice_number LIKE 'INV-2024-%'
UNION ALL SELECT 'Paiements' as type, COUNT(*) as nombre FROM payments WHERE transaction_id LIKE '%20240%'
UNION ALL SELECT 'Ventes' as type, COUNT(*) as nombre FROM sales WHERE status = 'completed'
UNION ALL SELECT 'Tâches' as type, COUNT(*) as nombre FROM tasks WHERE title LIKE '%devis%';

COMMIT;
