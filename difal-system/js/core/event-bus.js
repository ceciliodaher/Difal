/**
 * EventBus - Sistema de comunicação entre módulos
 * Implementa padrão Observer para comunicação desacoplada
 */

class EventBus {
    constructor() {
        this.events = new Map();
        this.listeners = new Map();
        this.maxListeners = 100;
        this.debugMode = false;
        
        this.log('EventBus initialized');
    }

    /**
     * Registra um listener para um evento
     * @param {string} eventName - Nome do evento
     * @param {Function} callback - Função callback
     * @param {Object} context - Contexto de execução (opcional)
     */
    on(eventName, callback, context = null) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }

        const listeners = this.events.get(eventName);
        
        // Verificar limite de listeners
        if (listeners.length >= this.maxListeners) {
            console.warn(`⚠️ EventBus: Muitos listeners para '${eventName}' (${listeners.length})`);
        }

        const listener = {
            callback,
            context,
            id: this.generateId()
        };

        listeners.push(listener);
        this.listeners.set(listener.id, { eventName, listener });

        this.log(`Listener added for '${eventName}' (ID: ${listener.id})`);
        return listener.id;
    }

    /**
     * Remove um listener específico
     * @param {string} listenerId - ID do listener retornado por on()
     */
    off(listenerId) {
        if (!this.listeners.has(listenerId)) {
            console.warn(`⚠️ EventBus: Listener ${listenerId} não encontrado`);
            return false;
        }

        const { eventName, listener } = this.listeners.get(listenerId);
        const listeners = this.events.get(eventName);
        
        if (listeners) {
            const index = listeners.findIndex(l => l.id === listenerId);
            if (index !== -1) {
                listeners.splice(index, 1);
                this.listeners.delete(listenerId);
                this.log(`Listener removed for '${eventName}' (ID: ${listenerId})`);
                return true;
            }
        }

        return false;
    }

    /**
     * Remove todos os listeners de um evento
     * @param {string} eventName - Nome do evento
     */
    removeAllListeners(eventName) {
        if (this.events.has(eventName)) {
            const listeners = this.events.get(eventName);
            listeners.forEach(listener => {
                this.listeners.delete(listener.id);
            });
            this.events.delete(eventName);
            this.log(`All listeners removed for '${eventName}'`);
        }
    }

    /**
     * Emite um evento
     * @param {string} eventName - Nome do evento
     * @param {*} data - Dados do evento
     */
    emit(eventName, data = null) {
        this.log(`Event '${eventName}' emitted with data:`, data);

        if (!this.events.has(eventName)) {
            this.log(`No listeners for '${eventName}'`);
            return;
        }

        const listeners = this.events.get(eventName);
        const results = [];

        listeners.forEach(listener => {
            try {
                const result = listener.context 
                    ? listener.callback.call(listener.context, data)
                    : listener.callback(data);
                results.push(result);
            } catch (error) {
                console.error(`❌ EventBus: Erro no listener para '${eventName}':`, error);
            }
        });

        return results;
    }

    /**
     * Registra um listener que será executado apenas uma vez
     * @param {string} eventName - Nome do evento
     * @param {Function} callback - Função callback
     * @param {Object} context - Contexto de execução (opcional)
     */
    once(eventName, callback, context = null) {
        const listenerId = this.on(eventName, (data) => {
            this.off(listenerId);
            if (context) {
                callback.call(context, data);
            } else {
                callback(data);
            }
        });

        return listenerId;
    }

    /**
     * Verifica se há listeners para um evento
     * @param {string} eventName - Nome do evento
     * @returns {boolean}
     */
    hasListeners(eventName) {
        return this.events.has(eventName) && this.events.get(eventName).length > 0;
    }

    /**
     * Obtém o número de listeners para um evento
     * @param {string} eventName - Nome do evento
     * @returns {number}
     */
    listenerCount(eventName) {
        return this.events.has(eventName) ? this.events.get(eventName).length : 0;
    }

    /**
     * Obtém lista de todos os eventos registrados
     * @returns {Array<string>}
     */
    eventNames() {
        return Array.from(this.events.keys());
    }

    /**
     * Limpa todos os eventos e listeners
     */
    clear() {
        this.events.clear();
        this.listeners.clear();
        this.log('EventBus cleared');
    }

    /**
     * Ativa/desativa modo debug
     * @param {boolean} enabled
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Obtém estatísticas do EventBus
     * @returns {Object}
     */
    getStats() {
        return {
            totalEvents: this.events.size,
            totalListeners: this.listeners.size,
            eventBreakdown: Array.from(this.events.entries()).map(([eventName, listeners]) => ({
                eventName,
                listenerCount: listeners.length
            }))
        };
    }

    /**
     * Gera um ID único para listeners
     * @returns {string}
     */
    generateId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Log interno
     * @param {string} message
     * @param {*} data
     */
    log(message, data = null) {
        if (this.debugMode) {
            if (data !== null) {
                console.log(`📡 EventBus: ${message}`, data);
            } else {
                console.log(`📡 EventBus: ${message}`);
            }
        }
    }
}

// Criar instância global
window.eventBus = new EventBus();

// Expor globalmente para uso no browser
if (typeof window !== 'undefined') {
    window.EventBus = EventBus;
}

// Exportar classe para uso se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventBus;
}