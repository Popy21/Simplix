import { Router, Request, Response } from 'express';
import logger from '../utils/logger';

const router = Router();

// GET /api/logs - Récupérer tous les logs
router.get('/', (req: Request, res: Response) => {
  try {
    const logs = logger.getLogs();
    res.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error: any) {
    logger.error('LOGS', 'Failed to get logs', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/logs/summary - Résumé des logs
router.get('/summary', (req: Request, res: Response) => {
  try {
    const summary = logger.summary();
    res.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    logger.error('LOGS', 'Failed to get summary', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/logs/category/:category - Logs par catégorie
router.get('/category/:category', (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const logs = logger.getLogsByCategory(category);
    res.json({
      success: true,
      category,
      count: logs.length,
      logs,
    });
  } catch (error: any) {
    logger.error('LOGS', 'Failed to get logs by category', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/logs/level/:level - Logs par niveau
router.get('/level/:level', (req: Request, res: Response) => {
  try {
    const { level } = req.params as { level: 'info' | 'warn' | 'error' | 'debug' | 'success' };
    const logs = logger.getLogsByLevel(level);
    res.json({
      success: true,
      level,
      count: logs.length,
      logs,
    });
  } catch (error: any) {
    logger.error('LOGS', 'Failed to get logs by level', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/logs - Vider les logs
router.delete('/', (req: Request, res: Response) => {
  try {
    logger.clear();
    res.json({
      success: true,
      message: 'Logs cleared',
    });
  } catch (error: any) {
    logger.error('LOGS', 'Failed to clear logs', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/logs/export - Exporter les logs
router.get('/export', (req: Request, res: Response) => {
  try {
    const logsJson = logger.exportLogs();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=logs-${Date.now()}.json`);
    res.send(logsJson);
  } catch (error: any) {
    logger.error('LOGS', 'Failed to export logs', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
