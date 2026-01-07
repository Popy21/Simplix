import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import multer from 'multer';

const router = express.Router();

// Configuration multer pour les fichiers CSV
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Format de fichier non supporté. Utilisez un fichier CSV.'));
    }
  }
});

// Fonction pour parser le CSV
function parseCSV(content: string, delimiter: string = ';'): { headers: string[], rows: string[][] } {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  // Détecter le délimiteur si non spécifié
  const firstLine = lines[0];
  if (firstLine.includes('\t') && !firstLine.includes(delimiter)) {
    delimiter = '\t';
  } else if (firstLine.includes(',') && !firstLine.includes(delimiter)) {
    delimiter = ',';
  }

  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const rows = lines.slice(1).map(line => {
    // Gérer les champs entre guillemets
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    return values;
  });

  return { headers, rows };
}

// ==========================================
// IMPORT CLIENTS
// ==========================================

// Template pour import clients
router.get('/customers/template', authenticateToken, (req: AuthRequest, res: Response) => {
  const template = 'name;email;phone;address;city;postal_code;country;siret;tva_number;website;notes\n' +
    'Entreprise Exemple;contact@exemple.fr;01 23 45 67 89;123 Rue Exemple;Paris;75001;France;12345678901234;FR12345678901;www.exemple.fr;Client important\n';

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=template_clients.csv');
  res.send(template);
});

// Import clients
router.post('/customers', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;

    if (!req.file) {
      res.status(400).json({ error: 'Fichier CSV requis' });
      return;
    }

    const { delimiter = ';', update_existing = 'false' } = req.body;
    const updateExisting = update_existing === 'true';

    const content = req.file.buffer.toString('utf-8');
    const { headers, rows } = parseCSV(content, delimiter);

    // Mapping des colonnes
    const columnMap: { [key: string]: string } = {
      'name': 'name', 'nom': 'name', 'raison_sociale': 'name', 'company': 'name',
      'email': 'email', 'mail': 'email', 'e-mail': 'email',
      'phone': 'phone', 'telephone': 'phone', 'tel': 'phone',
      'address': 'address', 'adresse': 'address',
      'city': 'city', 'ville': 'city',
      'postal_code': 'postal_code', 'code_postal': 'postal_code', 'cp': 'postal_code',
      'country': 'country', 'pays': 'country',
      'siret': 'siret',
      'tva_number': 'tva_number', 'tva': 'tva_number', 'vat': 'tva_number',
      'website': 'website', 'site_web': 'website', 'site': 'website',
      'notes': 'notes', 'commentaire': 'notes'
    };

    const results = {
      total: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as { row: number, error: string }[]
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const data: any = {};

        headers.forEach((header, index) => {
          const mappedColumn = columnMap[header] || header;
          if (row[index]) {
            data[mappedColumn] = row[index].replace(/^"|"$/g, '');
          }
        });

        if (!data.name) {
          results.errors.push({ row: i + 2, error: 'Nom requis' });
          results.skipped++;
          continue;
        }

        // Vérifier si le client existe (par email ou SIRET)
        let existingClient = null;
        if (data.email) {
          const existing = await db.query(
            'SELECT id FROM customers WHERE email = $1 AND organization_id = $2',
            [data.email, organizationId]
          );
          if (existing.rows.length > 0) existingClient = existing.rows[0];
        }
        if (!existingClient && data.siret) {
          const existing = await db.query(
            'SELECT id FROM customers WHERE siret = $1 AND organization_id = $2',
            [data.siret, organizationId]
          );
          if (existing.rows.length > 0) existingClient = existing.rows[0];
        }

        if (existingClient && updateExisting) {
          // Mettre à jour
          await db.query(`
            UPDATE customers SET
              name = COALESCE($1, name),
              phone = COALESCE($2, phone),
              address = COALESCE($3, address),
              city = COALESCE($4, city),
              postal_code = COALESCE($5, postal_code),
              country = COALESCE($6, country),
              siret = COALESCE($7, siret),
              tva_number = COALESCE($8, tva_number),
              website = COALESCE($9, website),
              notes = COALESCE($10, notes),
              updated_at = NOW()
            WHERE id = $11
          `, [
            data.name, data.phone, data.address, data.city,
            data.postal_code, data.country, data.siret,
            data.tva_number, data.website, data.notes,
            existingClient.id
          ]);
          results.updated++;
        } else if (existingClient) {
          results.skipped++;
        } else {
          // Créer
          await db.query(`
            INSERT INTO customers (
              name, email, phone, address, city, postal_code,
              country, siret, tva_number, website, notes, organization_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `, [
            data.name, data.email, data.phone, data.address,
            data.city, data.postal_code, data.country || 'France',
            data.siret, data.tva_number, data.website, data.notes,
            organizationId
          ]);
          results.created++;
        }
      } catch (err: any) {
        results.errors.push({ row: i + 2, error: err.message });
        results.skipped++;
      }
    }

    res.json(results);
  } catch (err: any) {
    console.error('Erreur import clients:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// IMPORT PRODUITS
// ==========================================

// Template pour import produits
router.get('/products/template', authenticateToken, (req: AuthRequest, res: Response) => {
  const template = 'name;sku;description;price;cost_price;tax_rate;category;unit;stock_quantity;stock_min_alert\n' +
    'Produit Exemple;SKU001;Description du produit;99.99;50.00;20;Catégorie A;unité;100;10\n';

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=template_produits.csv');
  res.send(template);
});

// Import produits
router.post('/products', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    if (!req.file) {
      res.status(400).json({ error: 'Fichier CSV requis' });
      return;
    }

    const { delimiter = ';', update_existing = 'false' } = req.body;
    const updateExisting = update_existing === 'true';

    const content = req.file.buffer.toString('utf-8');
    const { headers, rows } = parseCSV(content, delimiter);

    const columnMap: { [key: string]: string } = {
      'name': 'name', 'nom': 'name', 'designation': 'name', 'libelle': 'name',
      'sku': 'sku', 'reference': 'sku', 'ref': 'sku', 'code': 'sku',
      'description': 'description',
      'price': 'price', 'prix': 'price', 'prix_vente': 'price', 'prix_ht': 'price',
      'cost_price': 'cost_price', 'prix_achat': 'cost_price', 'cout': 'cost_price',
      'tax_rate': 'tax_rate', 'tva': 'tax_rate', 'taux_tva': 'tax_rate',
      'category': 'category', 'categorie': 'category', 'famille': 'category',
      'unit': 'unit', 'unite': 'unit',
      'stock_quantity': 'stock_quantity', 'stock': 'stock_quantity', 'quantite': 'stock_quantity',
      'stock_min_alert': 'stock_min_alert', 'stock_min': 'stock_min_alert', 'alerte_stock': 'stock_min_alert'
    };

    const results = {
      total: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as { row: number, error: string }[]
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const data: any = {};

        headers.forEach((header, index) => {
          const mappedColumn = columnMap[header] || header;
          if (row[index]) {
            data[mappedColumn] = row[index].replace(/^"|"$/g, '');
          }
        });

        if (!data.name) {
          results.errors.push({ row: i + 2, error: 'Nom requis' });
          results.skipped++;
          continue;
        }

        // Convertir les valeurs numériques
        const price = parseFloat(data.price?.replace(',', '.') || '0');
        const costPrice = data.cost_price ? parseFloat(data.cost_price.replace(',', '.')) : null;
        const taxRate = data.tax_rate ? parseFloat(data.tax_rate.replace(',', '.')) : 20;
        const stockQty = data.stock_quantity ? parseFloat(data.stock_quantity.replace(',', '.')) : 0;
        const stockMin = data.stock_min_alert ? parseFloat(data.stock_min_alert.replace(',', '.')) : 0;

        // Vérifier si le produit existe (par SKU)
        let existingProduct = null;
        if (data.sku) {
          const existing = await db.query(
            'SELECT id FROM products WHERE sku = $1 AND organization_id = $2',
            [data.sku, organizationId]
          );
          if (existing.rows.length > 0) existingProduct = existing.rows[0];
        }

        if (existingProduct && updateExisting) {
          await db.query(`
            UPDATE products SET
              name = COALESCE($1, name),
              description = COALESCE($2, description),
              price = COALESCE($3, price),
              cost_price = COALESCE($4, cost_price),
              tax_rate = COALESCE($5, tax_rate),
              category = COALESCE($6, category),
              unit = COALESCE($7, unit),
              stock_quantity = COALESCE($8, stock_quantity),
              stock_min_alert = COALESCE($9, stock_min_alert),
              track_stock = CASE WHEN $8 IS NOT NULL THEN true ELSE track_stock END,
              updated_at = NOW()
            WHERE id = $10
          `, [
            data.name, data.description, price, costPrice, taxRate,
            data.category, data.unit, stockQty, stockMin, existingProduct.id
          ]);
          results.updated++;
        } else if (existingProduct) {
          results.skipped++;
        } else {
          await db.query(`
            INSERT INTO products (
              name, sku, description, price, cost_price, tax_rate,
              category, unit, stock_quantity, stock_min_alert,
              track_stock, organization_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `, [
            data.name, data.sku, data.description, price, costPrice, taxRate,
            data.category, data.unit || 'unité', stockQty, stockMin,
            stockQty > 0, organizationId
          ]);
          results.created++;
        }
      } catch (err: any) {
        results.errors.push({ row: i + 2, error: err.message });
        results.skipped++;
      }
    }

    res.json(results);
  } catch (err: any) {
    console.error('Erreur import produits:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// IMPORT CONTACTS
// ==========================================

// Template pour import contacts
router.get('/contacts/template', authenticateToken, (req: AuthRequest, res: Response) => {
  const template = 'first_name;last_name;email;phone;mobile;company;position;address;city;postal_code;type;source;notes\n' +
    'Jean;Dupont;jean.dupont@exemple.fr;01 23 45 67 89;06 12 34 56 78;Société XYZ;Directeur;123 Rue Exemple;Paris;75001;lead;website;Prospect intéressé\n';

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=template_contacts.csv');
  res.send(template);
});

// Import contacts
router.post('/contacts', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    if (!req.file) {
      res.status(400).json({ error: 'Fichier CSV requis' });
      return;
    }

    const { delimiter = ';', update_existing = 'false' } = req.body;
    const updateExisting = update_existing === 'true';

    const content = req.file.buffer.toString('utf-8');
    const { headers, rows } = parseCSV(content, delimiter);

    const columnMap: { [key: string]: string } = {
      'first_name': 'first_name', 'prenom': 'first_name', 'firstname': 'first_name',
      'last_name': 'last_name', 'nom': 'last_name', 'lastname': 'last_name',
      'email': 'email', 'mail': 'email',
      'phone': 'phone', 'telephone': 'phone', 'tel': 'phone',
      'mobile': 'mobile', 'portable': 'mobile',
      'company': 'company', 'societe': 'company', 'entreprise': 'company',
      'position': 'position', 'poste': 'position', 'fonction': 'position',
      'address': 'address', 'adresse': 'address',
      'city': 'city', 'ville': 'city',
      'postal_code': 'postal_code', 'code_postal': 'postal_code', 'cp': 'postal_code',
      'type': 'type',
      'source': 'source',
      'notes': 'notes', 'commentaire': 'notes'
    };

    const results = {
      total: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as { row: number, error: string }[]
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const data: any = {};

        headers.forEach((header, index) => {
          const mappedColumn = columnMap[header] || header;
          if (row[index]) {
            data[mappedColumn] = row[index].replace(/^"|"$/g, '');
          }
        });

        if (!data.first_name && !data.last_name && !data.email) {
          results.errors.push({ row: i + 2, error: 'Au moins un nom ou email requis' });
          results.skipped++;
          continue;
        }

        // Vérifier si le contact existe (par email)
        let existingContact = null;
        if (data.email) {
          const existing = await db.query(
            'SELECT id FROM contacts WHERE email = $1 AND organization_id = $2',
            [data.email, organizationId]
          );
          if (existing.rows.length > 0) existingContact = existing.rows[0];
        }

        if (existingContact && updateExisting) {
          await db.query(`
            UPDATE contacts SET
              first_name = COALESCE($1, first_name),
              last_name = COALESCE($2, last_name),
              phone = COALESCE($3, phone),
              mobile = COALESCE($4, mobile),
              company = COALESCE($5, company),
              position = COALESCE($6, position),
              address = COALESCE($7, address),
              city = COALESCE($8, city),
              postal_code = COALESCE($9, postal_code),
              type = COALESCE($10, type),
              source = COALESCE($11, source),
              notes = COALESCE($12, notes),
              updated_at = NOW()
            WHERE id = $13
          `, [
            data.first_name, data.last_name, data.phone, data.mobile,
            data.company, data.position, data.address, data.city,
            data.postal_code, data.type || 'lead', data.source || 'import',
            data.notes, existingContact.id
          ]);
          results.updated++;
        } else if (existingContact) {
          results.skipped++;
        } else {
          await db.query(`
            INSERT INTO contacts (
              first_name, last_name, email, phone, mobile,
              company, position, address, city, postal_code,
              type, source, notes, organization_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          `, [
            data.first_name, data.last_name, data.email, data.phone, data.mobile,
            data.company, data.position, data.address, data.city, data.postal_code,
            data.type || 'lead', data.source || 'import', data.notes, organizationId
          ]);
          results.created++;
        }
      } catch (err: any) {
        results.errors.push({ row: i + 2, error: err.message });
        results.skipped++;
      }
    }

    res.json(results);
  } catch (err: any) {
    console.error('Erreur import contacts:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
