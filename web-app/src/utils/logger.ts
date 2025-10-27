/**
 * Logger utilitaire pour monitorer l'application
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private enabled = true;

  private colors = {
    info: '#2196F3',
    warn: '#FF9800',
    error: '#F44336',
    debug: '#9C27B0',
    success: '#4CAF50',
  };

  private emojis = {
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    debug: '🔍',
    success: '✅',
  };

  log(level: LogLevel, category: string, message: string, data?: any) {
    if (!this.enabled) return;

    const timestamp = new Date().toISOString();
    const entry: LogEntry = { timestamp, level, category, message, data };

    // Ajouter au tableau de logs
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Afficher dans la console avec style
    const color = this.colors[level];
    const emoji = this.emojis[level];
    const timeStr = new Date().toLocaleTimeString('fr-FR');

    console.groupCollapsed(
      `%c${emoji} [${timeStr}] ${category.toUpperCase()} %c${message}`,
      `color: ${color}; font-weight: bold`,
      'color: inherit'
    );
    if (data !== undefined) {
      console.log('Data:', data);
    }
    console.trace('Stack trace');
    console.groupEnd();
  }

  info(category: string, message: string, data?: any) {
    this.log('info', category, message, data);
  }

  warn(category: string, message: string, data?: any) {
    this.log('warn', category, message, data);
  }

  error(category: string, message: string, data?: any) {
    this.log('error', category, message, data);
  }

  debug(category: string, message: string, data?: any) {
    this.log('debug', category, message, data);
  }

  success(category: string, message: string, data?: any) {
    this.log('success', category, message, data);
  }

  // Logs spécifiques pour le drag and drop
  dragStart(component: string, payload: any) {
    this.info('DRAG', `${component} - Drag started`, payload);
  }

  dragEnd(component: string, payload: any) {
    this.info('DRAG', `${component} - Drag ended`, payload);
  }

  dragEnter(component: string, target: any) {
    this.debug('DRAG', `${component} - Drag enter`, target);
  }

  dragLeave(component: string, target: any) {
    this.debug('DRAG', `${component} - Drag leave`, target);
  }

  drop(component: string, payload: any, target: any) {
    this.success('DRAG', `${component} - Drop`, { payload, target });
  }

  // Logs pour les clics
  click(component: string, element: string, data?: any) {
    this.info('CLICK', `${component} - ${element}`, data);
  }

  // Logs pour les API calls
  apiRequest(method: string, url: string, data?: any) {
    this.info('API', `${method} ${url}`, data);
  }

  apiResponse(method: string, url: string, status: number, data?: any) {
    const level = status >= 200 && status < 300 ? 'success' : 'error';
    this.log(level, 'API', `${method} ${url} - ${status}`, data);
  }

  apiError(method: string, url: string, error: any) {
    this.error('API', `${method} ${url} - ERROR`, error);
  }

  // Récupérer tous les logs
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  // Récupérer les logs par catégorie
  getLogsByCategory(category: string): LogEntry[] {
    return this.logs.filter((log) => log.category === category);
  }

  // Récupérer les logs par niveau
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter((log) => log.level === level);
  }

  // Exporter les logs en JSON
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Afficher un résumé des logs
  summary() {
    const summary = {
      total: this.logs.length,
      byLevel: {
        info: this.logs.filter((l) => l.level === 'info').length,
        warn: this.logs.filter((l) => l.level === 'warn').length,
        error: this.logs.filter((l) => l.level === 'error').length,
        debug: this.logs.filter((l) => l.level === 'debug').length,
        success: this.logs.filter((l) => l.level === 'success').length,
      },
      byCategory: {} as Record<string, number>,
    };

    this.logs.forEach((log) => {
      summary.byCategory[log.category] = (summary.byCategory[log.category] || 0) + 1;
    });

    console.table(summary.byLevel);
    console.table(summary.byCategory);
    return summary;
  }

  // Vider les logs
  clear() {
    this.logs = [];
    console.clear();
    this.info('LOGGER', 'Logs cleared');
  }

  // Activer/désactiver le logger
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.info('LOGGER', enabled ? 'Logger enabled' : 'Logger disabled');
  }
}

// Instance singleton
const logger = new Logger();

// Exposer globalement pour le debug
if (typeof window !== 'undefined') {
  (window as any).logger = logger;
}

export default logger;
