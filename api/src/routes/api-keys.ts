import express from 'express';
import { authenticate } from '../middleware/auth';
import { ApiKeyService } from '../services/api-keys/api-key.service';

const router = express.Router();
const apiKeyService = new ApiKeyService();

// Liste des clés API
router.get('/', authenticate, async (req, res) => {
  try {
    const keys = await apiKeyService.listKeys(req.user!.organizationId);
    res.json({ success: true, data: keys });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Créer une nouvelle clé API
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, scopes, rateLimit, expiresAt, environment } = req.body;

    const { key, keyId } = await apiKeyService.createKey(
      req.user!.organizationId,
      req.user!.id,
      name,
      { scopes, rateLimit, expiresAt, environment }
    );

    res.status(201).json({
      success: true,
      data: {
        id: keyId,
        key, // IMPORTANT: shown only once
        message: 'Save this key securely. It will not be shown again.'
      }
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Révoquer une clé API
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await apiKeyService.revokeKey(
      req.params.id,
      req.user!.id,
      req.body.reason || 'Revoked by user'
    );

    res.json({ success: true, message: 'API key revoked successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
