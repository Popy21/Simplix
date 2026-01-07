import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import puppeteer from 'puppeteer';

const router = express.Router();

// ==========================================
// CATALOGUE PRODUITS
// ==========================================

// Générer le catalogue PDF
router.get('/pdf', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { category_id, include_prices, include_stock, format } = req.query;

    // Récupérer le profil entreprise
    const companyResult = await db.query(`
      SELECT * FROM company_profiles WHERE organization_id = $1
    `, [organizationId]);
    const company = companyResult.rows[0] || {};

    // Récupérer les produits
    let productQuery = `
      SELECT
        p.*,
        pc.name as category_name,
        u.name as unit_name,
        u.symbol as unit_symbol
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      LEFT JOIN units u ON p.unit_id = u.id
      WHERE p.organization_id = $1 AND p.deleted_at IS NULL AND p.is_active = true
    `;
    const params: any[] = [organizationId];

    if (category_id) {
      params.push(category_id);
      productQuery += ` AND p.category_id = $${params.length}`;
    }

    productQuery += ' ORDER BY pc.name NULLS LAST, p.name';

    const productsResult = await db.query(productQuery, params);

    // Récupérer les catégories pour le sommaire
    const categoriesResult = await db.query(`
      SELECT pc.*, COUNT(p.id) as product_count
      FROM product_categories pc
      LEFT JOIN products p ON p.category_id = pc.id AND p.deleted_at IS NULL AND p.is_active = true
      WHERE pc.organization_id = $1
      GROUP BY pc.id
      ORDER BY pc.display_order, pc.name
    `, [organizationId]);

    // Générer le HTML
    const html = generateCatalogHTML({
      company,
      products: productsResult.rows,
      categories: categoriesResult.rows,
      options: {
        includePrices: include_prices !== 'false',
        includeStock: include_stock === 'true',
        format: format as string || 'grid' // 'grid' ou 'list'
      }
    });

    // Générer le PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=catalogue-${new Date().toISOString().split('T')[0]}.pdf`);
    res.send(pdf);
  } catch (err: any) {
    console.error('Erreur génération catalogue:', err);
    res.status(500).json({ error: err.message });
  }
});

// Aperçu HTML du catalogue
router.get('/preview', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { category_id, include_prices, include_stock, format } = req.query;

    // Récupérer le profil entreprise
    const companyResult = await db.query(`
      SELECT * FROM company_profiles WHERE organization_id = $1
    `, [organizationId]);
    const company = companyResult.rows[0] || {};

    // Récupérer les produits
    let productQuery = `
      SELECT
        p.*,
        pc.name as category_name,
        u.name as unit_name,
        u.symbol as unit_symbol
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      LEFT JOIN units u ON p.unit_id = u.id
      WHERE p.organization_id = $1 AND p.deleted_at IS NULL AND p.is_active = true
    `;
    const params: any[] = [organizationId];

    if (category_id) {
      params.push(category_id);
      productQuery += ` AND p.category_id = $${params.length}`;
    }

    productQuery += ' ORDER BY pc.name NULLS LAST, p.name';

    const productsResult = await db.query(productQuery, params);

    // Récupérer les catégories
    const categoriesResult = await db.query(`
      SELECT pc.*, COUNT(p.id) as product_count
      FROM product_categories pc
      LEFT JOIN products p ON p.category_id = pc.id AND p.deleted_at IS NULL AND p.is_active = true
      WHERE pc.organization_id = $1
      GROUP BY pc.id
      ORDER BY pc.display_order, pc.name
    `, [organizationId]);

    // Générer le HTML
    const html = generateCatalogHTML({
      company,
      products: productsResult.rows,
      categories: categoriesResult.rows,
      options: {
        includePrices: include_prices !== 'false',
        includeStock: include_stock === 'true',
        format: format as string || 'grid'
      }
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export JSON du catalogue
router.get('/export', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    // Récupérer le profil entreprise
    const companyResult = await db.query(`
      SELECT company_name, logo_url, phone, email, website FROM company_profiles WHERE organization_id = $1
    `, [organizationId]);

    // Récupérer les catégories avec leurs produits
    const categoriesResult = await db.query(`
      SELECT * FROM product_categories
      WHERE organization_id = $1 AND is_active = true
      ORDER BY display_order, name
    `, [organizationId]);

    const productsResult = await db.query(`
      SELECT
        p.id, p.name, p.reference, p.description, p.price, p.vat_rate,
        p.image_url, p.category_id, p.stock_quantity,
        u.name as unit_name, u.symbol as unit_symbol
      FROM products p
      LEFT JOIN units u ON p.unit_id = u.id
      WHERE p.organization_id = $1 AND p.deleted_at IS NULL AND p.is_active = true
      ORDER BY p.name
    `, [organizationId]);

    // Structurer par catégorie
    const catalog: any = {
      company: companyResult.rows[0] || {},
      generated_at: new Date().toISOString(),
      categories: categoriesResult.rows.map((cat: any) => ({
        ...cat,
        products: productsResult.rows.filter((p: any) => p.category_id === cat.id)
      })),
      uncategorized: productsResult.rows.filter((p: any) => !p.category_id)
    };

    res.json(catalog);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Fonction pour générer le HTML du catalogue
function generateCatalogHTML(data: {
  company: any;
  products: any[];
  categories: any[];
  options: {
    includePrices: boolean;
    includeStock: boolean;
    format: string;
  };
}): string {
  const { company, products, categories, options } = data;
  const baseUrl = process.env.APP_URL || 'https://app.simplix.fr';

  // Grouper les produits par catégorie
  const productsByCategory: { [key: string]: any[] } = { 'Sans catégorie': [] };
  categories.forEach(cat => productsByCategory[cat.name] = []);

  products.forEach(product => {
    const catName = product.category_name || 'Sans catégorie';
    if (!productsByCategory[catName]) productsByCategory[catName] = [];
    productsByCategory[catName].push(product);
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
  };

  const gridStyle = options.format === 'grid' ? `
    .products-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    .product-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    .product-image {
      width: 100%;
      height: 150px;
      object-fit: contain;
      margin-bottom: 10px;
    }
  ` : `
    .products-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .product-row {
      display: flex;
      align-items: center;
      gap: 15px;
      border-bottom: 1px solid #e5e7eb;
      padding: 10px 0;
    }
    .product-image-small {
      width: 60px;
      height: 60px;
      object-fit: contain;
    }
  `;

  let html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Catalogue - ${company.company_name || 'Entreprise'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', sans-serif;
      color: #1f2937;
      line-height: 1.5;
    }

    .cover {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      text-align: center;
      page-break-after: always;
    }

    .cover-logo {
      max-width: 200px;
      max-height: 100px;
      margin-bottom: 40px;
    }

    .cover h1 {
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 20px;
    }

    .cover p {
      font-size: 20px;
      opacity: 0.9;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 0;
      border-bottom: 2px solid #3b82f6;
      margin-bottom: 30px;
    }

    .header-logo {
      max-height: 50px;
    }

    .header-info {
      text-align: right;
      font-size: 12px;
      color: #6b7280;
    }

    .toc {
      page-break-after: always;
    }

    .toc h2 {
      font-size: 24px;
      margin-bottom: 20px;
      color: #3b82f6;
    }

    .toc-list {
      list-style: none;
    }

    .toc-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px dotted #e5e7eb;
    }

    .category-section {
      page-break-before: always;
    }

    .category-title {
      font-size: 24px;
      color: #3b82f6;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }

    ${gridStyle}

    .product-name {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 5px;
    }

    .product-ref {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 5px;
    }

    .product-description {
      font-size: 12px;
      color: #4b5563;
      margin-bottom: 10px;
    }

    .product-price {
      font-size: 16px;
      font-weight: 700;
      color: #3b82f6;
    }

    .product-unit {
      font-size: 12px;
      color: #6b7280;
    }

    .product-stock {
      font-size: 11px;
      color: #10b981;
    }

    .product-stock.low {
      color: #f59e0b;
    }

    .product-stock.out {
      color: #ef4444;
    }

    .no-image {
      width: 100%;
      height: 150px;
      background: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
      font-size: 12px;
      border-radius: 4px;
      margin-bottom: 10px;
    }

    .footer {
      position: fixed;
      bottom: 10mm;
      left: 15mm;
      right: 15mm;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #9ca3af;
      border-top: 1px solid #e5e7eb;
      padding-top: 10px;
    }

    @media print {
      .cover { page-break-after: always; }
      .toc { page-break-after: always; }
      .category-section { page-break-before: always; }
    }
  </style>
</head>
<body>
  <!-- Page de couverture -->
  <div class="cover">
    ${company.logo_url ? `<img src="${baseUrl}${company.logo_url}" class="cover-logo" alt="Logo">` : ''}
    <h1>Catalogue Produits</h1>
    <p>${company.company_name || ''}</p>
    <p style="margin-top: 40px; font-size: 14px;">Édition ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
  </div>

  <!-- Table des matières -->
  <div class="toc">
    <div class="header">
      ${company.logo_url ? `<img src="${baseUrl}${company.logo_url}" class="header-logo" alt="Logo">` : `<span>${company.company_name || ''}</span>`}
      <div class="header-info">
        ${company.phone ? `Tél: ${company.phone}<br>` : ''}
        ${company.email || ''}
      </div>
    </div>

    <h2>Sommaire</h2>
    <ul class="toc-list">
      ${categories.filter(c => parseInt(c.product_count) > 0).map(cat => `
        <li class="toc-item">
          <span>${cat.name}</span>
          <span>${cat.product_count} produit${parseInt(cat.product_count) > 1 ? 's' : ''}</span>
        </li>
      `).join('')}
      ${productsByCategory['Sans catégorie'].length > 0 ? `
        <li class="toc-item">
          <span>Autres produits</span>
          <span>${productsByCategory['Sans catégorie'].length} produit${productsByCategory['Sans catégorie'].length > 1 ? 's' : ''}</span>
        </li>
      ` : ''}
    </ul>
  </div>
`;

  // Générer les pages de produits par catégorie
  Object.entries(productsByCategory).forEach(([categoryName, categoryProducts]) => {
    if (categoryProducts.length === 0) return;

    html += `
  <div class="category-section">
    <div class="header">
      ${company.logo_url ? `<img src="${baseUrl}${company.logo_url}" class="header-logo" alt="Logo">` : `<span>${company.company_name || ''}</span>`}
      <div class="header-info">${categoryName}</div>
    </div>

    <h2 class="category-title">${categoryName}</h2>

    <div class="${options.format === 'grid' ? 'products-grid' : 'products-list'}">
`;

    categoryProducts.forEach(product => {
      const imageUrl = product.image_url ? `${baseUrl}${product.image_url}` : null;

      if (options.format === 'grid') {
        html += `
      <div class="product-card">
        ${imageUrl ? `<img src="${imageUrl}" class="product-image" alt="${product.name}">` : `<div class="no-image">Pas d'image</div>`}
        <div class="product-name">${product.name}</div>
        ${product.reference ? `<div class="product-ref">Réf: ${product.reference}</div>` : ''}
        ${product.description ? `<div class="product-description">${product.description.substring(0, 100)}${product.description.length > 100 ? '...' : ''}</div>` : ''}
        ${options.includePrices ? `
          <div class="product-price">${formatPrice(product.price)}</div>
          <div class="product-unit">${product.unit_symbol || 'unité'}</div>
        ` : ''}
        ${options.includeStock ? `
          <div class="product-stock ${product.stock_quantity <= 0 ? 'out' : product.stock_quantity <= 5 ? 'low' : ''}">
            ${product.stock_quantity <= 0 ? 'Rupture' : `Stock: ${product.stock_quantity}`}
          </div>
        ` : ''}
      </div>
`;
      } else {
        html += `
      <div class="product-row">
        ${imageUrl ? `<img src="${imageUrl}" class="product-image-small" alt="${product.name}">` : `<div style="width: 60px; height: 60px; background: #f3f4f6;"></div>`}
        <div style="flex: 1;">
          <div class="product-name">${product.name}</div>
          ${product.reference ? `<div class="product-ref">Réf: ${product.reference}</div>` : ''}
        </div>
        ${options.includePrices ? `
          <div style="text-align: right;">
            <div class="product-price">${formatPrice(product.price)}</div>
            <div class="product-unit">/ ${product.unit_symbol || 'unité'}</div>
          </div>
        ` : ''}
      </div>
`;
      }
    });

    html += `
    </div>
  </div>
`;
  });

  html += `
  <div class="footer">
    <span>${company.company_name || ''} - Catalogue ${new Date().getFullYear()}</span>
    <span>Généré le ${new Date().toLocaleDateString('fr-FR')}</span>
  </div>
</body>
</html>
`;

  return html;
}

export default router;
