-- ============================================================================
-- SIMPLIX - SEED DATA (Données de démonstration)
-- Description: Données de test pour démonstration et développement
-- ============================================================================

-- Désactiver temporairement les triggers pour insertion rapide
SET session_replication_role = 'replica';

-- ============================================================================
-- 1. ORGANISATIONS & UTILISATEURS
-- ============================================================================

-- Organisation demo
INSERT INTO organizations (id, name, email, phone, website, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Simplix Demo SARL', 'contact@simplix-demo.fr', '+33 1 23 45 67 89', 'https://simplix-demo.fr', NOW())
ON CONFLICT (id) DO NOTHING;

-- Utilisateurs demo
INSERT INTO users (id, organization_id, name, email, password, role, created_at) VALUES
('660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Admin Demo', 'admin@simplix-demo.fr', '$2b$10$rZ7Z1Z1Z1Z1Z1Z1Z1Z1Z1OqP6J7J7J7J7J7J7J7J7J7J7J7J7J7J7', 'admin', NOW()),
('770e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Commercial Demo', 'commercial@simplix-demo.fr', '$2b$10$rZ7Z1Z1Z1Z1Z1Z1Z1Z1Z1OqP6J7J7J7J7J7J7J7J7J7J7J7J7J7J7', 'user', NOW()),
('880e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Comptable Demo', 'comptable@simplix-demo.fr', '$2b$10$rZ7Z1Z1Z1Z1Z1Z1Z1Z1Z1OqP6J7J7J7J7J7J7J7J7J7J7J7J7J7J7', 'user', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. CLIENTS (CONTACTS)
-- ============================================================================

INSERT INTO contacts (id, organization_id, type, company_name, first_name, last_name, email, phone, status, created_at) VALUES
('10000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', 'company', 'TechCorp SARL', 'Marie', 'Martin', 'marie@techcorp.fr', '+33 6 12 34 56 78', 'active', NOW()),
('10000000-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440000', 'company', 'InnoSolutions SAS', 'Pierre', 'Durand', 'pierre@innosolutions.fr', '+33 6 23 45 67 89', 'active', NOW()),
('10000000-0000-0000-0000-000000000003', '550e8400-e29b-41d4-a716-446655440000', 'individual', NULL, 'Sophie', 'Bernard', 'sophie.bernard@email.fr', '+33 6 34 56 78 90', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. PRODUITS & SERVICES
-- ============================================================================

INSERT INTO products (id, organization_id, name, description, price, unit, stock_quantity, category, is_active, created_at) VALUES
('20000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', 'Consultation stratégique', 'Consulting stratégie digitale - 1 journée', 800.00, 'jour', 0, 'service', true, NOW()),
('20000000-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440000', 'Développement web', 'Développement site web sur mesure', 75.00, 'heure', 0, 'service', true, NOW()),
('20000000-0000-0000-0000-000000000003', '550e8400-e29b-41d4-a716-446655440000', 'Licence logiciel Pro', 'Licence annuelle logiciel (1 utilisateur)', 99.00, 'mois', 100, 'product', true, NOW()),
('20000000-0000-0000-0000-000000000004', '550e8400-e29b-41d4-a716-446655440000', 'Formation équipe', 'Formation équipe développement (1 jour)', 1200.00, 'jour', 0, 'service', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. TAUX DE TVA
-- ============================================================================

INSERT INTO tax_rates (id, organization_id, name, rate_percentage, country, tax_type, is_default, created_at) VALUES
('30000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', 'TVA 20%', 20.0, 'FR', 'vat', true, NOW()),
('30000000-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440000', 'TVA 10%', 10.0, 'FR', 'vat', false, NOW()),
('30000000-0000-0000-0000-000000000003', '550e8400-e29b-41d4-a716-446655440000', 'TVA 5.5%', 5.5, 'FR', 'vat', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. COMPTES BANCAIRES
-- ============================================================================

INSERT INTO bank_accounts (id, organization_id, account_name, bank_name, iban, bic, account_type, currency, opening_balance, current_balance, created_at) VALUES
('40000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', 'Compte Courant Principal', 'BNP Paribas', 'FR7630004000031234567890143', 'BNPAFRPP', 'checking', 'EUR', 25000.00, 25000.00, NOW()),
('40000000-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440000', 'Compte Épargne', 'Crédit Agricole', 'FR7630006000011234567890189', 'AGRIFRPP', 'savings', 'EUR', 50000.00, 50000.00, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. TRANSACTIONS BANCAIRES
-- ============================================================================

INSERT INTO bank_transactions (id, organization_id, bank_account_id, transaction_type, amount, description, transaction_date, reference, status, created_at) VALUES
('41000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', '40000000-0000-0000-0000-000000000001', 'credit', 5000.00, 'Paiement TechCorp - Facture #2025-001', '2025-11-01', 'VIR-2025-001', 'cleared', NOW()),
('41000000-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440000', '40000000-0000-0000-0000-000000000001', 'debit', 1500.00, 'Loyer bureaux novembre', '2025-11-05', 'PRLV-2025-045', 'cleared', NOW()),
('41000000-0000-0000-0000-000000000003', '550e8400-e29b-41d4-a716-446655440000', '40000000-0000-0000-0000-000000000001', 'credit', 3000.00, 'Paiement InnoSolutions - Facture #2025-002', '2025-11-08', 'VIR-2025-002', 'cleared', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. PROJETS
-- ============================================================================

INSERT INTO projects (id, organization_id, name, customer_id, project_type, status, start_date, estimated_hours, hourly_rate, budget_amount, created_at) VALUES
('50000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', 'Refonte site TechCorp', '10000000-0000-0000-0000-000000000001', 'time_and_materials', 'active', '2025-11-01', 120, 75.00, NULL, NOW()),
('50000000-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440000', 'App Mobile InnoSolutions', '10000000-0000-0000-0000-000000000002', 'fixed_price', 'active', '2025-10-15', 200, NULL, 25000.00, NOW()),
('50000000-0000-0000-0000-000000000003', '550e8400-e29b-41d4-a716-446655440000', 'Consulting Digital Sophie', '10000000-0000-0000-0000-000000000003', 'retainer', 'active', '2025-11-01', 40, 80.00, 3200.00, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. TÂCHES PROJETS
-- ============================================================================

INSERT INTO project_tasks (id, organization_id, project_id, title, description, status, priority, estimated_hours, created_at) VALUES
('51000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', '50000000-0000-0000-0000-000000000001', 'Maquettes UI/UX', 'Création des maquettes et wireframes', 'completed', 'high', 16, NOW()),
('51000000-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440000', '50000000-0000-0000-0000-000000000001', 'Développement frontend', 'Intégration React', 'in_progress', 'high', 40, NOW()),
('51000000-0000-0000-0000-000000000003', '550e8400-e29b-41d4-a716-446655440000', '50000000-0000-0000-0000-000000000001', 'Développement backend', 'API REST Node.js', 'todo', 'medium', 32, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 9. SUIVI DU TEMPS
-- ============================================================================

INSERT INTO time_entries (id, organization_id, project_id, task_id, user_id, description, duration_hours, hourly_rate, is_billable, entry_date, created_at) VALUES
('52000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', '770e8400-e29b-41d4-a716-446655440000', 'Création maquettes homepage', 8.0, 75.00, true, '2025-11-01', NOW()),
('52000000-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440000', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', '770e8400-e29b-41d4-a716-446655440000', 'Création maquettes pages internes', 8.0, 75.00, true, '2025-11-02', NOW()),
('52000000-0000-0000-0000-000000000003', '550e8400-e29b-41d4-a716-446655440000', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', '770e8400-e29b-41d4-a716-446655440000', 'Setup projet React + routing', 6.5, 75.00, true, '2025-11-05', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 10. EMPLOYÉS
-- ============================================================================

INSERT INTO employees (id, organization_id, first_name, last_name, email, employee_number, job_title, department, employment_type, hire_date, base_salary, currency, status, created_at) VALUES
('60000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', 'Marie', 'Martin', 'marie.martin@simplix-demo.fr', 'EMP-001', 'Développeuse Full-Stack', 'Technique', 'full_time', '2024-01-15', 45000.00, 'EUR', 'active', NOW()),
('60000000-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440000', 'Thomas', 'Dubois', 'thomas.dubois@simplix-demo.fr', 'EMP-002', 'Commercial Senior', 'Ventes', 'full_time', '2023-06-01', 42000.00, 'EUR', 'active', NOW()),
('60000000-0000-0000-0000-000000000003', '550e8400-e29b-41d4-a716-446655440000', 'Julie', 'Petit', 'julie.petit@simplix-demo.fr', 'EMP-003', 'Designer UI/UX', 'Produit', 'part_time', '2024-09-01', 32000.00, 'EUR', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 11. CONGÉS EMPLOYÉS
-- ============================================================================

INSERT INTO employee_leaves (id, organization_id, employee_id, leave_type, start_date, end_date, status, reason, created_at) VALUES
('61000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', '60000000-0000-0000-0000-000000000001', 'vacation', '2025-12-23', '2025-12-31', 'approved', 'Congés de fin d''année', NOW()),
('61000000-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440000', '60000000-0000-0000-0000-000000000002', 'sick', '2025-11-06', '2025-11-07', 'approved', 'Grippe', NOW()),
('61000000-0000-0000-0000-000000000003', '550e8400-e29b-41d4-a716-446655440000', '60000000-0000-0000-0000-000000000003', 'vacation', '2025-11-15', '2025-11-15', 'pending', 'Jour de congé personnel', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 12. ENTREPÔTS
-- ============================================================================

INSERT INTO warehouses (id, organization_id, name, code, warehouse_type, address, city, postal_code, country, is_active, created_at) VALUES
('70000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', 'Entrepôt Principal Paris', 'WH-PARIS-01', 'main', '123 Avenue de la République', 'Paris', '75011', 'FR', true, NOW()),
('70000000-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440000', 'Stock Lyon', 'WH-LYON-01', 'secondary', '45 Rue de la Liberté', 'Lyon', '69003', 'FR', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 13. NIVEAUX DE STOCK
-- ============================================================================

INSERT INTO inventory_levels (id, organization_id, product_id, warehouse_id, quantity_on_hand, quantity_reserved, reorder_point, reorder_quantity, unit_cost, created_at) VALUES
('71000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', '20000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000001', 100, 10, 20, 50, 65.00, NOW()),
('71000000-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440000', '20000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000002', 50, 5, 10, 30, 65.00, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 14. MOUVEMENTS DE STOCK
-- ============================================================================

INSERT INTO stock_movements (id, organization_id, product_id, warehouse_id, movement_type, quantity, unit_cost, reference, notes, movement_date, created_at) VALUES
('72000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', '20000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000001', 'purchase', 100, 65.00, 'BON-ACH-2025-001', 'Achat initial stock', '2025-10-01', NOW()),
('72000000-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440000', '20000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000002', 'transfer', 50, 65.00, 'TRANS-2025-001', 'Transfert vers Lyon', '2025-10-15', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 15. FACTURES RÉCURRENTES
-- ============================================================================

INSERT INTO recurring_invoices (id, organization_id, customer_id, frequency, interval_count, start_date, title, subtotal_amount, tax_amount, total_amount, status, auto_send, created_at) VALUES
('80000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', '10000000-0000-0000-0000-000000000001', 'monthly', 1, '2025-11-01', 'Abonnement Licence Pro - TechCorp', 99.00, 19.80, 118.80, 'active', true, NOW()),
('80000000-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440000', '10000000-0000-0000-0000-000000000003', 'monthly', 1, '2025-11-01', 'Retainer Consulting - Sophie Bernard', 3200.00, 640.00, 3840.00, 'active', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 16. FACTURES
-- ============================================================================

INSERT INTO invoices (id, organization_id, customer_id, invoice_number, issue_date, due_date, status, subtotal, tax_amount, total, paid_amount, created_at) VALUES
('90000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', '10000000-0000-0000-0000-000000000001', 'INV-2025-001', '2025-11-01', '2025-11-31', 'paid', 5000.00, 1000.00, 6000.00, 6000.00, NOW()),
('90000000-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440000', '10000000-0000-0000-0000-000000000002', 'INV-2025-002', '2025-11-05', '2025-12-05', 'sent', 3000.00, 600.00, 3600.00, 0.00, NOW()),
('90000000-0000-0000-0000-000000000003', '550e8400-e29b-41d4-a716-446655440000', '10000000-0000-0000-0000-000000000003', 'INV-2025-003', '2025-11-08', '2025-12-08', 'draft', 1200.00, 240.00, 1440.00, 0.00, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 17. LIGNES DE FACTURE
-- ============================================================================

INSERT INTO invoice_items (id, invoice_id, product_id, description, quantity, unit_price, tax_rate, total, created_at) VALUES
(gen_random_uuid(), '90000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Développement site web - 80h', 80, 75.00, 20.0, 6000.00, NOW()),
(gen_random_uuid(), '90000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Développement app mobile - 40h', 40, 75.00, 20.0, 3000.00, NOW()),
(gen_random_uuid(), '90000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', 'Formation équipe développement', 1, 1200.00, 20.0, 1200.00, NOW())
ON CONFLICT (id) DO NOTHING;

-- Réactiver les triggers
SET session_replication_role = 'origin';

-- ============================================================================
-- RÉSUMÉ DES DONNÉES INSÉRÉES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'SEED DATA - Résumé de l''insertion';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '✓ 1 Organisation (Simplix Demo SARL)';
    RAISE NOTICE '✓ 3 Utilisateurs (Admin, Commercial, Comptable)';
    RAISE NOTICE '✓ 3 Clients (TechCorp, InnoSolutions, Sophie)';
    RAISE NOTICE '✓ 4 Produits/Services';
    RAISE NOTICE '✓ 3 Taux de TVA (20%%, 10%%, 5.5%%)';
    RAISE NOTICE '✓ 2 Comptes bancaires (BNP, Crédit Agricole)';
    RAISE NOTICE '✓ 3 Transactions bancaires';
    RAISE NOTICE '✓ 3 Projets actifs';
    RAISE NOTICE '✓ 3 Tâches projets';
    RAISE NOTICE '✓ 3 Entrées de temps (22.5h)';
    RAISE NOTICE '✓ 3 Employés';
    RAISE NOTICE '✓ 3 Demandes de congés';
    RAISE NOTICE '✓ 2 Entrepôts (Paris, Lyon)';
    RAISE NOTICE '✓ 2 Niveaux de stock';
    RAISE NOTICE '✓ 2 Mouvements de stock';
    RAISE NOTICE '✓ 2 Factures récurrentes';
    RAISE NOTICE '✓ 3 Factures';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Credentials de test:';
    RAISE NOTICE '  Email: admin@simplix-demo.fr';
    RAISE NOTICE '  Password: Test1234!';
    RAISE NOTICE '============================================================';
END $$;
