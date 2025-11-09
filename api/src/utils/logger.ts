/**
 * Logger backend pour monitorer les requêtes et opérations
 */

import { Request, Response } from 'express';

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
  private maxLogs = 5000;

  private colors = {
    info: '\x1b[36m',      // Cyan
    warn: '\x1b[33m',      // Yellow
    error: '\x1b[31m',     // Red
    debug: '\x1b[35m',     // Magenta
    success: '\x1b[32m',   // Green
    reset: '\x1b[0m',      // Reset
  };

  private emojis = {
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    debug: '🔍',
    success: '✅',
  };

  log(level: LogLevel, category: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const entry: LogEntry = { timestamp, level, category, message, data };

    // Ajouter au tableau
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Afficher dans la console avec couleurs
    const color = this.colors[level];
    const emoji = this.emojis[level];
    const timeStr = new Date().toLocaleTimeString('fr-FR');

    console.log(
      `${color}${emoji} [${timeStr}] ${category.toUpperCase()}${this.colors.reset} - ${message}`
    );
    if (data !== undefined) {
      console.log(`${color}Data:${this.colors.reset}`, JSON.stringify(data, null, 2));
    }
  }

  info(categoryOrMessage: string, message?: string, data?: any) {
    if (message === undefined) {
      this.log('info', 'General', categoryOrMessage);
    } else {
      this.log('info', categoryOrMessage, message, data);
    }
  }

  warn(categoryOrMessage: string, message?: string, data?: any) {
    if (message === undefined) {
      this.log('warn', 'General', categoryOrMessage);
    } else {
      this.log('warn', categoryOrMessage, message, data);
    }
  }

  error(categoryOrMessage: string, message?: string, data?: any) {
    if (message === undefined) {
      this.log('error', 'General', categoryOrMessage);
    } else {
      this.log('error', categoryOrMessage, message, data);
    }
  }

  debug(categoryOrMessage: string, message?: string, data?: any) {
    if (message === undefined) {
      this.log('debug', 'General', categoryOrMessage);
    } else {
      this.log('debug', categoryOrMessage, message, data);
    }
  }

  success(categoryOrMessage: string, message?: string, data?: any) {
    if (message === undefined) {
      this.log('success', 'General', categoryOrMessage);
    } else {
      this.log('success', categoryOrMessage, message, data);
    }
  }

  // Middleware pour logger les requêtes HTTP
  httpMiddleware() {
    return (req: Request, res: Response, next: Function) => {
      const start = Date.now();
      const { method, url, body, query, params } = req;

      this.info('HTTP', `${method} ${url}`, {
        query: Object.keys(query).length > 0 ? query : undefined,
        params: Object.keys(params).length > 0 ? params : undefined,
        body: Object.keys(body || {}).length > 0 ? body : undefined,
      });

      // Log de la réponse
      const originalSend = res.send;
      res.send = function (data: any) {
        const duration = Date.now() - start;
        const level = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'error';

        logger.log(
          level,
          'HTTP',
          `${method} ${url} - ${res.statusCode} (${duration}ms)`,
          res.statusCode >= 400 ? { response: data } : undefined
        );

        return originalSend.call(this, data);
      };

      next();
    };
  }

  // Logs spécifiques pour la base de données
  dbQuery(query: string, params?: any) {
    this.debug('DB', 'Query executed', { query, params });
  }

  dbResult(query: string, rowCount: number, duration?: number) {
    this.success('DB', `Query completed - ${rowCount} rows`, {
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      duration: duration ? `${duration}ms` : undefined,
    });
  }

  dbError(query: string, error: any) {
    this.error('DB', 'Query failed', {
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      error: error.message,
      stack: error.stack,
    });
  }

  // Logs pour les opérations CRUD
  create(entity: string, id: any, data?: any) {
    this.success('CRUD', `Created ${entity}`, { id, data });
  }

  update(entity: string, id: any, data?: any) {
    this.success('CRUD', `Updated ${entity}`, { id, data });
  }

  delete(entity: string, id: any) {
    this.success('CRUD', `Deleted ${entity}`, { id });
  }

  read(entity: string, count: number) {
    this.info('CRUD', `Read ${count} ${entity}(s)`);
  }

  // Récupérer les logs
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByCategory(category: string): LogEntry[] {
    return this.logs.filter((log) => log.category === category);
  }

  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter((log) => log.level === level);
  }

  // Export en JSON
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Résumé
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

  clear() {
    this.logs = [];
    this.info('LOGGER', 'Logs cleared');
  }
}

const logger = new Logger();
export default logger;
