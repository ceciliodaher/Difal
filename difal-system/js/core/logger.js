/**
 * Sistema de Logs Estruturados para Debug
 * Facilita o troubleshooting e monitoramento do sistema DIFAL
 */
class Logger {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000; // Máximo de logs na memória
        this.enabled = true;
        this.levels = {
            ERROR: 'ERROR',
            WARN: 'WARN', 
            INFO: 'INFO',
            DEBUG: 'DEBUG',
            TRACE: 'TRACE'
        };
        this.colors = {
            ERROR: '#ff4757',
            WARN: '#ffa502',
            INFO: '#3742fa',
            DEBUG: '#2ed573',
            TRACE: '#747d8c'
        };
    }

    /**
     * Cria entrada de log estruturada
     */
    createLogEntry(level, message, data = null, module = null) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data,
            module,
            id: this.generateLogId()
        };
        
        // Adicionar à coleção
        this.logs.push(entry);
        
        // Manter limite de logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
        
        // Log no console com formatação
        this.logToConsole(entry);
        
        return entry;
    }

    /**
     * Gera ID único para o log
     */
    generateLogId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Formata e exibe no console
     */
    logToConsole(entry) {
        if (!this.enabled) return;

        const { timestamp, level, message, data, module } = entry;
        const time = new Date(timestamp).toLocaleTimeString();
        const moduleStr = module ? `[${module}] ` : '';
        const color = this.colors[level] || '#000000';
        
        const logMessage = `%c${time} ${level} ${moduleStr}${message}`;
        const style = `color: ${color}; font-weight: ${level === 'ERROR' ? 'bold' : 'normal'}`;
        
        if (data) {
            console.log(logMessage, style, data);
        } else {
            console.log(logMessage, style);
        }
    }

    // Métodos de conveniência
    error(message, data = null, module = null) {
        return this.createLogEntry(this.levels.ERROR, message, data, module);
    }

    warn(message, data = null, module = null) {
        return this.createLogEntry(this.levels.WARN, message, data, module);
    }

    info(message, data = null, module = null) {
        return this.createLogEntry(this.levels.INFO, message, data, module);
    }

    debug(message, data = null, module = null) {
        return this.createLogEntry(this.levels.DEBUG, message, data, module);
    }

    trace(message, data = null, module = null) {
        return this.createLogEntry(this.levels.TRACE, message, data, module);
    }

    /**
     * Log específico para operações DIFAL
     */
    difal(operation, message, data = null) {
        return this.info(`DIFAL ${operation}: ${message}`, data, 'DIFAL');
    }

    /**
     * Log específico para UI
     */
    ui(action, message, data = null) {
        return this.debug(`UI ${action}: ${message}`, data, 'UI');
    }

    /**
     * Log específico para cálculos
     */
    calc(operation, message, data = null) {
        return this.info(`CALC ${operation}: ${message}`, data, 'CALC');
    }

    /**
     * Log específico para SPED
     */
    sped(operation, message, data = null) {
        return this.info(`SPED ${operation}: ${message}`, data, 'SPED');
    }

    /**
     * Log específico para configurações
     */
    config(action, message, data = null) {
        return this.debug(`CONFIG ${action}: ${message}`, data, 'CONFIG');
    }

    /**
     * Obtém logs filtrados
     */
    getLogs(filters = {}) {
        let filteredLogs = [...this.logs];

        if (filters.level) {
            filteredLogs = filteredLogs.filter(log => log.level === filters.level);
        }

        if (filters.module) {
            filteredLogs = filteredLogs.filter(log => log.module === filters.module);
        }

        if (filters.since) {
            const sinceTime = new Date(filters.since).getTime();
            filteredLogs = filteredLogs.filter(log => new Date(log.timestamp).getTime() >= sinceTime);
        }

        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filteredLogs = filteredLogs.filter(log => 
                log.message.toLowerCase().includes(searchTerm)
            );
        }

        return filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    /**
     * Exporta logs como texto
     */
    exportLogs(filters = {}) {
        const logs = this.getLogs(filters);
        return logs.map(log => {
            const time = new Date(log.timestamp).toLocaleString();
            const moduleStr = log.module ? `[${log.module}] ` : '';
            const dataStr = log.data ? ` | Data: ${JSON.stringify(log.data)}` : '';
            return `${time} ${log.level} ${moduleStr}${log.message}${dataStr}`;
        }).join('\n');
    }

    /**
     * Limpa logs
     */
    clear() {
        this.logs = [];
        console.clear();
        this.info('Logs limpos', null, 'LOGGER');
    }

    /**
     * Habilita/desabilita logs
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        this.info(`Logs ${enabled ? 'habilitados' : 'desabilitados'}`, null, 'LOGGER');
    }

    /**
     * Obtém estatísticas dos logs
     */
    getStats() {
        const stats = {
            total: this.logs.length,
            byLevel: {},
            byModule: {},
            lastHour: 0
        };

        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

        this.logs.forEach(log => {
            // Por nível
            stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
            
            // Por módulo
            if (log.module) {
                stats.byModule[log.module] = (stats.byModule[log.module] || 0) + 1;
            }
            
            // Última hora
            if (new Date(log.timestamp) >= hourAgo) {
                stats.lastHour++;
            }
        });

        return stats;
    }
}

// Criar instância global
const logger = new Logger();

// Funções globais de conveniência
window.logError = (message, data, module) => logger.error(message, data, module);
window.logWarn = (message, data, module) => logger.warn(message, data, module);
window.logInfo = (message, data, module) => logger.info(message, data, module);
window.logDebug = (message, data, module) => logger.debug(message, data, module);

// Funções específicas do domínio
window.logDifal = (operation, message, data) => logger.difal(operation, message, data);
window.logUI = (action, message, data) => logger.ui(action, message, data);
window.logCalc = (operation, message, data) => logger.calc(operation, message, data);
window.logSped = (operation, message, data) => logger.sped(operation, message, data);
window.logConfig = (action, message, data) => logger.config(action, message, data);

// Funções utilitárias
window.showLogs = (filters) => {
    const logs = logger.getLogs(filters);
    console.table(logs);
    return logs;
};

window.exportLogs = (filters) => {
    const logsText = logger.exportLogs(filters);
    console.log(logsText);
    
    // Criar download se possível
    if (typeof document !== 'undefined') {
        const blob = new Blob([logsText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `difal-logs-${new Date().toISOString().slice(0, 19)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    return logsText;
};

window.clearLogs = () => logger.clear();
window.logStats = () => {
    const stats = logger.getStats();
    console.log('📊 Estatísticas de Logs:', stats);
    return stats;
};

// Expor globalmente para uso no browser
if (typeof window !== 'undefined') {
    window.Logger = Logger;
    window.logger = logger;
}

// Para módulos Node.js se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Logger, logger };
}