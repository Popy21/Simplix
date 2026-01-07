-- Migration 034: Numérotation séquentielle stricte des factures
-- Description: Système de numérotation conforme à la législation française (pas de trous)
-- Author: Claude Code
-- Date: 2025-01-07

-- Table des séquences de numérotation par organisation et par type
CREATE TABLE IF NOT EXISTS document_sequences (
    id SERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Type de document
    document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('invoice', 'quote', 'credit_note', 'delivery_note', 'purchase_order')),

    -- Format du préfixe (ex: FAC, DEV, AV)
    prefix VARCHAR(10) NOT NULL,

    -- Séparateur (ex: -, /)
    separator VARCHAR(5) DEFAULT '-',

    -- Inclure l'année dans le numéro
    include_year BOOLEAN DEFAULT true,

    -- Format de l'année (2 ou 4 chiffres)
    year_format VARCHAR(4) DEFAULT 'YYYY' CHECK (year_format IN ('YY', 'YYYY')),

    -- Nombre minimum de chiffres pour le numéro
    min_digits INTEGER DEFAULT 5,

    -- Réinitialiser la séquence chaque année
    reset_yearly BOOLEAN DEFAULT true,

    -- Dernier numéro utilisé
    last_number INTEGER DEFAULT 0,

    -- Année du dernier numéro (pour reset annuel)
    last_year INTEGER,

    -- Contrôle des modifications
    is_locked BOOLEAN DEFAULT false, -- Verrouillé une fois qu'une facture est émise

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(organization_id, document_type)
);

-- Table d'audit des numéros générés (pour conformité)
CREATE TABLE IF NOT EXISTS document_number_audit (
    id SERIAL PRIMARY KEY,

    document_type VARCHAR(20) NOT NULL,
    document_id INTEGER NOT NULL,
    document_number VARCHAR(50) NOT NULL,

    -- Détails de la séquence au moment de la génération
    sequence_id INTEGER REFERENCES document_sequences(id) ON DELETE SET NULL,
    sequence_number INTEGER NOT NULL,
    year INTEGER NOT NULL,

    -- Qui a généré
    generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Organisation
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Index unique pour éviter les doublons
    UNIQUE(organization_id, document_type, document_number)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_doc_sequences_org ON document_sequences(organization_id);
CREATE INDEX IF NOT EXISTS idx_doc_sequences_type ON document_sequences(document_type);
CREATE INDEX IF NOT EXISTS idx_doc_number_audit_org ON document_number_audit(organization_id);
CREATE INDEX IF NOT EXISTS idx_doc_number_audit_type ON document_number_audit(document_type);
CREATE INDEX IF NOT EXISTS idx_doc_number_audit_year ON document_number_audit(year);

-- Fonction pour générer le prochain numéro de document
CREATE OR REPLACE FUNCTION generate_document_number(
    p_organization_id UUID,
    p_document_type VARCHAR(20),
    p_document_id INTEGER,
    p_user_id INTEGER DEFAULT NULL
) RETURNS VARCHAR(50) AS $$
DECLARE
    v_sequence RECORD;
    v_current_year INTEGER;
    v_next_number INTEGER;
    v_document_number VARCHAR(50);
    v_year_str VARCHAR(4);
BEGIN
    v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);

    -- Verrouiller la ligne pour éviter les doublons en concurrence
    SELECT * INTO v_sequence
    FROM document_sequences
    WHERE organization_id = p_organization_id AND document_type = p_document_type
    FOR UPDATE;

    -- Si pas de séquence, créer avec les valeurs par défaut
    IF v_sequence IS NULL THEN
        INSERT INTO document_sequences (organization_id, document_type, prefix, last_number, last_year)
        VALUES (
            p_organization_id,
            p_document_type,
            CASE p_document_type
                WHEN 'invoice' THEN 'FAC'
                WHEN 'quote' THEN 'DEV'
                WHEN 'credit_note' THEN 'AV'
                WHEN 'delivery_note' THEN 'BL'
                WHEN 'purchase_order' THEN 'BC'
                ELSE 'DOC'
            END,
            0,
            v_current_year
        )
        RETURNING * INTO v_sequence;
    END IF;

    -- Vérifier si on doit réinitialiser la séquence (nouvelle année)
    IF v_sequence.reset_yearly AND (v_sequence.last_year IS NULL OR v_sequence.last_year < v_current_year) THEN
        v_next_number := 1;
    ELSE
        v_next_number := v_sequence.last_number + 1;
    END IF;

    -- Construire le numéro de document
    IF v_sequence.include_year THEN
        IF v_sequence.year_format = 'YY' THEN
            v_year_str := LPAD((v_current_year % 100)::TEXT, 2, '0');
        ELSE
            v_year_str := v_current_year::TEXT;
        END IF;
        v_document_number := v_sequence.prefix || v_sequence.separator || v_year_str || v_sequence.separator || LPAD(v_next_number::TEXT, v_sequence.min_digits, '0');
    ELSE
        v_document_number := v_sequence.prefix || v_sequence.separator || LPAD(v_next_number::TEXT, v_sequence.min_digits, '0');
    END IF;

    -- Mettre à jour la séquence
    UPDATE document_sequences
    SET last_number = v_next_number,
        last_year = v_current_year,
        is_locked = true,
        updated_at = NOW()
    WHERE id = v_sequence.id;

    -- Enregistrer dans l'audit
    INSERT INTO document_number_audit (
        document_type, document_id, document_number,
        sequence_id, sequence_number, year,
        generated_by, organization_id
    ) VALUES (
        p_document_type, p_document_id, v_document_number,
        v_sequence.id, v_next_number, v_current_year,
        p_user_id, p_organization_id
    );

    RETURN v_document_number;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier l'intégrité de la numérotation
CREATE OR REPLACE FUNCTION check_numbering_integrity(
    p_organization_id UUID,
    p_document_type VARCHAR(20),
    p_year INTEGER DEFAULT NULL
) RETURNS TABLE (
    issue_type VARCHAR(50),
    details TEXT
) AS $$
DECLARE
    v_year INTEGER;
    v_expected INTEGER;
    v_actual INTEGER;
    v_missing_numbers TEXT;
BEGIN
    v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE));

    -- Vérifier les trous dans la numérotation
    WITH numbered AS (
        SELECT
            sequence_number,
            ROW_NUMBER() OVER (ORDER BY sequence_number) as expected_row
        FROM document_number_audit
        WHERE organization_id = p_organization_id
          AND document_type = p_document_type
          AND year = v_year
    ),
    gaps AS (
        SELECT sequence_number, expected_row
        FROM numbered
        WHERE sequence_number != expected_row
    )
    SELECT string_agg(sequence_number::TEXT, ', ')
    INTO v_missing_numbers
    FROM (
        SELECT generate_series(1, (SELECT MAX(sequence_number) FROM document_number_audit
                                   WHERE organization_id = p_organization_id
                                   AND document_type = p_document_type
                                   AND year = v_year)) as seq
        EXCEPT
        SELECT sequence_number FROM document_number_audit
        WHERE organization_id = p_organization_id
          AND document_type = p_document_type
          AND year = v_year
    ) missing;

    IF v_missing_numbers IS NOT NULL THEN
        issue_type := 'MISSING_NUMBERS';
        details := 'Numéros manquants: ' || v_missing_numbers;
        RETURN NEXT;
    END IF;

    -- Vérifier les doublons
    FOR v_actual, v_expected IN
        SELECT sequence_number, COUNT(*)
        FROM document_number_audit
        WHERE organization_id = p_organization_id
          AND document_type = p_document_type
          AND year = v_year
        GROUP BY sequence_number
        HAVING COUNT(*) > 1
    LOOP
        issue_type := 'DUPLICATE_NUMBER';
        details := 'Numéro ' || v_actual || ' utilisé ' || v_expected || ' fois';
        RETURN NEXT;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Vue des statistiques de numérotation
CREATE OR REPLACE VIEW numbering_statistics AS
SELECT
    ds.organization_id,
    ds.document_type,
    ds.prefix,
    ds.last_number,
    ds.last_year,
    ds.is_locked,
    (SELECT COUNT(*) FROM document_number_audit WHERE sequence_id = ds.id) as total_generated,
    (SELECT COUNT(*) FROM document_number_audit WHERE sequence_id = ds.id AND year = EXTRACT(YEAR FROM CURRENT_DATE)) as generated_this_year,
    (SELECT MAX(generated_at) FROM document_number_audit WHERE sequence_id = ds.id) as last_generated_at
FROM document_sequences ds;

-- Insérer les séquences par défaut pour les organisations existantes
INSERT INTO document_sequences (organization_id, document_type, prefix, last_number, last_year)
SELECT
    o.id,
    dt.type,
    dt.prefix,
    COALESCE(
        (SELECT COUNT(*) FROM invoices WHERE organization_id = o.id AND dt.type = 'invoice'),
        (SELECT COUNT(*) FROM quotes WHERE organization_id = o.id AND dt.type = 'quote'),
        (SELECT COUNT(*) FROM credit_notes WHERE organization_id = o.id AND dt.type = 'credit_note'),
        0
    ),
    EXTRACT(YEAR FROM CURRENT_DATE)
FROM organizations o
CROSS JOIN (VALUES
    ('invoice', 'FAC'),
    ('quote', 'DEV'),
    ('credit_note', 'AV')
) AS dt(type, prefix)
WHERE NOT EXISTS (
    SELECT 1 FROM document_sequences
    WHERE organization_id = o.id AND document_type = dt.type
)
ON CONFLICT (organization_id, document_type) DO NOTHING;

-- Commentaires
COMMENT ON TABLE document_sequences IS 'Séquences de numérotation des documents par organisation';
COMMENT ON TABLE document_number_audit IS 'Audit trail de tous les numéros générés (conformité légale)';
COMMENT ON FUNCTION generate_document_number IS 'Génère le prochain numéro de document de manière atomique';
COMMENT ON FUNCTION check_numbering_integrity IS 'Vérifie qu''il n''y a pas de trous dans la numérotation';
