# 📦 GESTION AVANCÉE D'INVENTAIRE

## 🎯 Objectif
Système complet de gestion d'inventaire : stocks, bons de commande, livraison, fabrication, seuils d'alerte.

## 📋 Fonctionnalités

### 1. Gestion Stocks Multi-Emplacements
- Entrepôts multiples
- Transferts inter-entrepôts
- Traçabilité lots/séries
- Inventaire physique

### 2. Bons de Commande Fournisseurs
- Création BC
- Workflow validation
- Réception partielle
- Rapprochement factures

### 3. Bons de Livraison
- Génération automatique
- Scan codes-barres
- Signature électronique
- Suivi transporteurs

### 4. Alertes & Automatisation
- Seuils min/max
- Réapprovisionnement auto
- Prévisions besoins
- ABC analysis

## 🗄️ Schéma BDD

```sql
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  address TEXT,
  city VARCHAR(255),
  country VARCHAR(255),
  
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS product_stock_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  
  quantity DECIMAL(15, 3) DEFAULT 0,
  reserved_quantity DECIMAL(15, 3) DEFAULT 0,
  available_quantity DECIMAL(15, 3) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  
  min_threshold DECIMAL(15, 3),
  max_threshold DECIMAL(15, 3),
  reorder_point DECIMAL(15, 3),
  reorder_quantity DECIMAL(15, 3),
  
  last_count_date DATE,
  
  UNIQUE(product_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  po_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  warehouse_id UUID REFERENCES warehouses(id),
  
  order_date DATE NOT NULL,
  expected_delivery_date DATE,
  
  status VARCHAR(20) DEFAULT 'DRAFT',
  
  subtotal DECIMAL(15, 2),
  tax_amount DECIMAL(15, 2),
  total_amount DECIMAL(15, 2),
  
  notes TEXT,
  
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  
  quantity DECIMAL(15, 3) NOT NULL,
  received_quantity DECIMAL(15, 3) DEFAULT 0,
  unit_price DECIMAL(15, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  
  line_total DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE TABLE IF NOT EXISTS delivery_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  dn_number VARCHAR(50) UNIQUE NOT NULL,
  sale_id UUID REFERENCES sales(id),
  customer_id UUID REFERENCES companies(id),
  warehouse_id UUID REFERENCES warehouses(id),
  
  delivery_date DATE NOT NULL,
  delivery_address TEXT,
  
  carrier VARCHAR(255),
  tracking_number VARCHAR(255),
  
  status VARCHAR(20) DEFAULT 'PENDING',
  
  signed_at TIMESTAMP,
  signature_file TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delivery_note_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_note_id UUID REFERENCES delivery_notes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  
  quantity DECIMAL(15, 3) NOT NULL,
  serial_numbers TEXT[]
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  
  movement_type VARCHAR(50) NOT NULL,
  quantity DECIMAL(15, 3) NOT NULL,
  
  reference_type VARCHAR(50),
  reference_id UUID,
  
  notes TEXT,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at DESC);
```

## 🔧 Stock Management Service

```typescript
class StockService {
  async moveStock(
    productId: string,
    warehouseId: string,
    quantity: number,
    movementType: string,
    reference?: { type: string; id: string }
  ): Promise<void> {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Enregistrer le mouvement
      await client.query(
        `INSERT INTO stock_movements
         (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [productId, warehouseId, movementType, quantity, reference?.type, reference?.id]
      );
      
      // Mettre à jour le stock
      await client.query(
        `UPDATE product_stock_locations
         SET quantity = quantity + $1
         WHERE product_id = $2 AND warehouse_id = $3`,
        [quantity, productId, warehouseId]
      );
      
      // Vérifier seuil d'alerte
      await this.checkStockThresholds(productId, warehouseId);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  async checkStockThresholds(productId: string, warehouseId: string): Promise<void> {
    const stock = await db.query(
      `SELECT * FROM product_stock_locations
       WHERE product_id = $1 AND warehouse_id = $2`,
      [productId, warehouseId]
    );
    
    if (!stock.rows[0]) return;
    
    const { available_quantity, reorder_point, reorder_quantity } = stock.rows[0];
    
    if (available_quantity <= reorder_point) {
      await this.createReorderAlert(productId, warehouseId, reorder_quantity);
    }
  }
  
  async createReorderAlert(productId: string, warehouseId: string, quantity: number): Promise<void> {
    // Créer notification ou BC automatique
  }
}
```

## ✅ Checklist
- [ ] Stocks multi-emplacements
- [ ] Bons de commande
- [ ] Bons de livraison
- [ ] Traçabilité mouvements
- [ ] Alertes seuils
- [ ] Réappro automatique
- [ ] Inventaire physique
- [ ] Code-barres/QR
