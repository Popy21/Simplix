import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ==========================================
// TARIFS DE LIVRAISON
// ==========================================

// Liste des tarifs
router.get('/rates', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      SELECT * FROM shipping_rates
      WHERE organization_id = $1 AND is_active = true
      ORDER BY is_default DESC, name
    `, [organizationId]);

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Créer un tarif
router.post('/rates', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const {
      name, carrier, description, calculation_type,
      fixed_rate, rate_per_kg, min_weight, max_weight,
      rate_percent, free_above_amount,
      delivery_days_min, delivery_days_max, is_default
    } = req.body;

    // Si c'est le tarif par défaut, retirer le flag des autres
    if (is_default) {
      await db.query(
        'UPDATE shipping_rates SET is_default = false WHERE organization_id = $1',
        [organizationId]
      );
    }

    const result = await db.query(`
      INSERT INTO shipping_rates (
        organization_id, name, carrier, description, calculation_type,
        fixed_rate, rate_per_kg, min_weight, max_weight,
        rate_percent, free_above_amount,
        delivery_days_min, delivery_days_max, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      organizationId, name, carrier, description, calculation_type || 'fixed',
      fixed_rate, rate_per_kg, min_weight, max_weight,
      rate_percent, free_above_amount,
      delivery_days_min, delivery_days_max, is_default || false
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour un tarif
router.put('/rates/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const {
      name, carrier, description, calculation_type,
      fixed_rate, rate_per_kg, min_weight, max_weight,
      rate_percent, free_above_amount,
      delivery_days_min, delivery_days_max, is_default, is_active
    } = req.body;

    if (is_default) {
      await db.query(
        'UPDATE shipping_rates SET is_default = false WHERE organization_id = $1 AND id != $2',
        [organizationId, id]
      );
    }

    const result = await db.query(`
      UPDATE shipping_rates SET
        name = COALESCE($1, name),
        carrier = $2,
        description = $3,
        calculation_type = COALESCE($4, calculation_type),
        fixed_rate = $5,
        rate_per_kg = $6,
        min_weight = $7,
        max_weight = $8,
        rate_percent = $9,
        free_above_amount = $10,
        delivery_days_min = $11,
        delivery_days_max = $12,
        is_default = COALESCE($13, is_default),
        is_active = COALESCE($14, is_active),
        updated_at = NOW()
      WHERE id = $15 AND organization_id = $16
      RETURNING *
    `, [
      name, carrier, description, calculation_type,
      fixed_rate, rate_per_kg, min_weight, max_weight,
      rate_percent, free_above_amount,
      delivery_days_min, delivery_days_max, is_default, is_active,
      id, organizationId
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Tarif non trouvé' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un tarif
router.delete('/rates/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      UPDATE shipping_rates SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING id
    `, [id, organizationId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Tarif non trouvé' });
      return;
    }

    res.json({ message: 'Tarif désactivé' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Calculer les frais de port
router.post('/calculate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { rate_id, order_amount, total_weight } = req.body;

    let rate;

    if (rate_id) {
      const rateResult = await db.query(
        'SELECT * FROM shipping_rates WHERE id = $1 AND organization_id = $2',
        [rate_id, organizationId]
      );
      rate = rateResult.rows[0];
    } else {
      // Utiliser le tarif par défaut
      const defaultResult = await db.query(
        'SELECT * FROM shipping_rates WHERE organization_id = $1 AND is_default = true AND is_active = true',
        [organizationId]
      );
      rate = defaultResult.rows[0];
    }

    if (!rate) {
      res.json({
        shipping_cost: 0,
        message: 'Aucun tarif de livraison configuré'
      });
      return;
    }

    let shippingCost = 0;
    let message = '';

    switch (rate.calculation_type) {
      case 'fixed':
        shippingCost = parseFloat(rate.fixed_rate || 0);
        message = `Frais de port fixes: ${shippingCost}€`;
        break;

      case 'weight':
        if (total_weight) {
          shippingCost = total_weight * parseFloat(rate.rate_per_kg || 0);
          message = `${total_weight} kg × ${rate.rate_per_kg}€/kg`;
        }
        break;

      case 'amount':
        shippingCost = order_amount * (parseFloat(rate.rate_percent || 0) / 100);
        message = `${rate.rate_percent}% du montant`;
        break;

      case 'free_above':
        if (order_amount >= parseFloat(rate.free_above_amount || 0)) {
          shippingCost = 0;
          message = `Livraison gratuite (commande > ${rate.free_above_amount}€)`;
        } else {
          shippingCost = parseFloat(rate.fixed_rate || 0);
          message = `Frais de port: ${shippingCost}€ (gratuit à partir de ${rate.free_above_amount}€)`;
        }
        break;
    }

    res.json({
      rate_id: rate.id,
      rate_name: rate.name,
      carrier: rate.carrier,
      shipping_cost: parseFloat(shippingCost.toFixed(2)),
      delivery_days_min: rate.delivery_days_min,
      delivery_days_max: rate.delivery_days_max,
      message
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
