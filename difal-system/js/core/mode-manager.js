/**
 * @fileoverview ModeManager - Coordenador Central de Modos do Sistema DIFAL
 * @module ModeManager
 * @description Gerencia a separação modular entre modos Single-Period e Multi-Period,
 * coordenando o estado, navegação e workflows específicos de cada modo.
 * 
 * @author Sistema DIFAL
 * @version 1.0.0
 * @since 2025-01-11
 */

/**
 * @class ModeManager
 * @classdesc Coordenador central que gerencia a separação entre os modos
 * Single-Period (período único) e Multi-Period (múltiplos períodos)
 */
class ModeManager {
    /**
     * @constructor
     * @param {EventBus} eventBus - Instância do barramento de eventos
     */
    constructor(eventBus) {
        this.eventBus = eventBus;
        
        // Estado do modo ativo - iniciar sem modo selecionado
        this.activeMode = null; // null | 'single' | 'multi'
        
        // Gerenciadores específicos por modo
        this.singleManager = null;
        this.multiManager = null;
        
        // Configurações
        this.config = {
            persistMode: true,          // Salvar modo no localStorage
            confirmModeSwitch: true,    // Confirmar mudança de modo
            clearOnSwitch: true         // Limpar dados ao mudar modo
        };
        
        // Estado interno
        this.initialized = false;
        this.modeHistory = [];
        
        console.log('🎛️ ModeManager inicializado');
    }

    /**
     * Inicializa o ModeManager com os gerenciadores específicos
     * @param {Object} managers - Objeto com os gerenciadores
     * @param {SinglePeriodManager} managers.single - Gerenciador de período único
     * @param {MultiPeriodManager} managers.multi - Gerenciador de múltiplos períodos
     */
    initialize(managers) {
        this.singleManager = managers.single;
        this.multiManager = managers.multi;
        
        // Recuperar modo salvo
        if (this.config.persistMode) {
            const savedMode = localStorage.getItem('difal_active_mode');
            if (savedMode && ['single', 'multi'].includes(savedMode)) {
                this.activeMode = savedMode;
            }
        }
        
        this.initialized = true;
        console.log(`🎛️ ModeManager inicializado no modo: ${this.activeMode}`);
        
        // Emitir evento de inicialização
        this.eventBus.emit('mode:initialized', {
            activeMode: this.activeMode,
            managers: { single: this.singleManager, multi: this.multiManager }
        });
    }

    /**
     * Define o modo ativo do sistema
     * @param {string} mode - Modo a ser ativado ('single' | 'multi')
     * @param {boolean} force - Forçar mudança sem confirmação
     * @returns {Promise<boolean>} True se a mudança foi bem-sucedida
     */
    async setMode(mode, force = false) {
        if (!['single', 'multi'].includes(mode)) {
            throw new Error(`Modo inválido: ${mode}. Use 'single' ou 'multi'.`);
        }

        if (mode === this.activeMode && this.isInitialized) {
            console.log(`🎛️ Modo ${mode} já está ativo`);
            return Promise.resolve(true);
        }

        // Verificar se há dados que serão perdidos
        const hasData = this.hasActiveData();
        
        if (hasData && !force && this.config.confirmModeSwitch) {
            const confirmed = await this.confirmModeSwitch(mode);
            if (!confirmed) {
                console.log('🎛️ Mudança de modo cancelada pelo usuário');
                return false;
            }
        }

        const previousMode = this.activeMode;
        
        try {
            // Limpar dados do modo anterior se necessário
            if (this.config.clearOnSwitch) {
                await this.clearModeData(this.activeMode);
            }
            
            // Atualizar modo ativo
            this.activeMode = mode;
            this.modeHistory.push({ from: previousMode, to: mode, timestamp: new Date() });
            
            // Persistir modo
            if (this.config.persistMode) {
                localStorage.setItem('difal_active_mode', mode);
            }
            
            console.log(`🎛️ Modo alterado: ${previousMode} → ${mode}`);
            
            // Emitir evento de mudança
            this.eventBus.emit('mode:changed', {
                previousMode,
                activeMode: mode,
                managers: this.getManagers()
            });
            
            // Marcar como inicializado após primeira mudança de modo
            if (!this.isInitialized) {
                this.isInitialized = true;
                console.log('🎛️ ModeManager marcado como inicializado');
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Erro ao alterar modo:', error);
            this.activeMode = previousMode; // Reverter
            throw error;
        }
    }

    /**
     * Obtém o modo ativo atual
     * @returns {string} Modo ativo ('single' | 'multi')
     */
    getActiveMode() {
        return this.activeMode;
    }

    /**
     * Obtém o gerenciador do modo ativo
     * @returns {SinglePeriodManager|MultiPeriodManager|null} Gerenciador ativo ou null se nenhum modo selecionado
     */
    getActiveManager() {
        if (!this.initialized) {
            throw new Error('ModeManager não foi inicializado. Chame initialize() primeiro.');
        }
        
        if (!this.activeMode) {
            return null; // Nenhum modo selecionado
        }
        
        return this.activeMode === 'single' ? this.singleManager : this.multiManager;
    }

    /**
     * Obtém todos os gerenciadores
     * @returns {Object} Objeto com todos os gerenciadores
     */
    getManagers() {
        return {
            single: this.singleManager,
            multi: this.multiManager,
            active: this.getActiveManager()
        };
    }

    /**
     * Verifica se o modo especificado está ativo
     * @param {string} mode - Modo a verificar
     * @returns {boolean} True se o modo está ativo
     */
    isMode(mode) {
        return this.activeMode === mode;
    }

    /**
     * Verifica se nenhum modo está selecionado
     * @returns {boolean} True se está na seleção de modo
     */
    isInModeSelection() {
        return this.activeMode === null;
    }

    /**
     * Verifica se há dados ativos no modo atual
     * @returns {boolean} True se há dados
     */
    hasActiveData() {
        try {
            if (!this.activeMode) {
                return false; // Nenhum modo ativo, sem dados
            }
            
            const activeManager = this.getActiveManager();
            if (!activeManager) {
                return false;
            }
            
            if (this.activeMode === 'single') {
                const state = activeManager.getState();
                return !!(state && state.dados && state.dados.itensDifal && state.dados.itensDifal.length > 0);
            } else {
                return activeManager.hasData && activeManager.hasData();
            }
        } catch (error) {
            console.warn('⚠️ Erro ao verificar dados ativos:', error);
            return false;
        }
    }

    /**
     * Limpa dados do modo especificado
     * @param {string} mode - Modo para limpar dados
     * @private
     */
    async clearModeData(mode) {
        try {
            if (mode === 'single' && this.singleManager) {
                if (typeof this.singleManager.clearAllData === 'function') {
                    this.singleManager.clearAllData();
                }
            } else if (mode === 'multi' && this.multiManager) {
                if (typeof this.multiManager.clearAllPeriods === 'function') {
                    this.multiManager.clearAllPeriods();
                }
            }
            
            console.log(`🧹 Dados do modo ${mode} limpos`);
        } catch (error) {
            console.error(`❌ Erro ao limpar dados do modo ${mode}:`, error);
        }
    }

    /**
     * Solicita confirmação do usuário para mudança de modo
     * @param {string} newMode - Novo modo
     * @returns {Promise<boolean>} True se confirmado
     * @private
     */
    async confirmModeSwitch(newMode) {
        return new Promise((resolve) => {
            const modeNames = {
                single: 'Período Único',
                multi: 'Múltiplos Períodos',
                selection: 'Seleção de Modo'
            };
            
            const message = newMode === 'selection' 
                ? 'Você está prestes a voltar para a seleção de modo.\n\n' +
                  'ATENÇÃO: Todos os dados do modo atual serão perdidos!\n\n' +
                  'Deseja continuar?'
                : `Você está prestes a mudar para o modo "${modeNames[newMode]}".\n\n` +
                  'ATENÇÃO: Todos os dados do modo atual serão perdidos!\n\n' +
                  'Deseja continuar?';
            
            const confirmed = confirm(message);
            
            resolve(confirmed);
        });
    }

    /**
     * Obtém informações de estado do ModeManager
     * @returns {Object} Informações de estado
     */
    getState() {
        return {
            activeMode: this.activeMode,
            initialized: this.initialized,
            hasData: this.hasActiveData(),
            config: { ...this.config },
            history: [...this.modeHistory]
        };
    }

    /**
     * Obtém estatísticas de uso dos modos
     * @returns {Object} Estatísticas
     */
    getStats() {
        const singleSessions = this.modeHistory.filter(h => h.to === 'single').length;
        const multiSessions = this.modeHistory.filter(h => h.to === 'multi').length;
        
        return {
            totalSwitches: this.modeHistory.length,
            singleSessions,
            multiSessions,
            currentMode: this.activeMode,
            lastSwitch: this.modeHistory.length > 0 ? 
                this.modeHistory[this.modeHistory.length - 1] : null
        };
    }

    /**
     * Retorna para a seleção de modo (reset para estado não selecionado)
     * @param {boolean} clearData - Limpar dados atuais
     * @returns {Promise<boolean>} True se bem-sucedida
     */
    async returnToModeSelection(clearData = true) {
        if (!this.activeMode) {
            console.log('🎛️ Já está na seleção de modo');
            return true;
        }

        if (clearData && this.hasActiveData()) {
            const confirmed = await this.confirmModeSwitch('selection');
            if (!confirmed) {
                console.log('🎛️ Retorno à seleção de modo cancelado pelo usuário');
                return false;
            }
            
            // Limpar dados do modo atual
            await this.clearModeData(this.activeMode);
        }

        const previousMode = this.activeMode;
        this.activeMode = null;

        // Salvar no localStorage
        if (this.config.persistMode) {
            localStorage.removeItem('difal_active_mode');
        }

        // Adicionar ao histórico
        this.modeHistory.push({
            from: previousMode,
            to: null,
            timestamp: Date.now()
        });

        console.log(`🎛️ Retornando à seleção de modo (de: ${previousMode})`);

        // Emitir evento
        this.eventBus.emit('mode:return_to_selection', {
            previousMode,
            timestamp: Date.now()
        });

        return true;
    }

    /**
     * Handler para botão "Trocar Modo" - retorna à seleção de modo
     * @returns {Promise<boolean>} True se bem-sucedida
     */
    async handleModeSwitch() {
        console.log('🔄 Handler "Trocar Modo" acionado');
        return await this.returnToModeSelection(true);
    }

    /**
     * Reseta o ModeManager para estado inicial
     */
    reset() {
        this.activeMode = null;
        this.modeHistory = [];
        this.initialized = false;
        
        if (this.config.persistMode) {
            localStorage.removeItem('difal_active_mode');
        }
        
        console.log('🎛️ ModeManager resetado');
        
        this.eventBus.emit('mode:reset', {
            timestamp: new Date()
        });
    }
}

// Expor globalmente
if (typeof window !== 'undefined') {
    window.ModeManager = ModeManager;
}

// Exportar para uso modular
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModeManager;
}