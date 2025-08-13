/**
 * @fileoverview Progress Manager - Módulo de gerenciamento de progresso e status
 * @module ProgressManager
 * @description Responsável por exibir barras de progresso, mensagens de status,
 * indicadores de carregamento, notificações de erro/sucesso e gerenciamento de filas de mensagens.
 * 
 * @author Sistema DIFAL
 * @version 1.0.0
 * @since 2025-01-10
 */

/**
 * @class ProgressManager
 * @classdesc Gerencia todas as operações de progresso e status do sistema DIFAL
 */
class ProgressManager {
    /**
     * @constructor
     * @param {StateManager} stateManager - Instância do gerenciador de estado
     * @param {EventBus} eventBus - Instância do barramento de eventos
     */
    constructor(stateManager, eventBus) {
        if (!stateManager) {
            throw new Error('ProgressManager requer uma instância de StateManager');
        }
        
        this.stateManager = stateManager;
        this.eventBus = eventBus;
        
        // Estado do progresso
        this.progressState = {
            visible: false,
            value: 0,
            message: '',
            indeterminate: false,
            currentOperation: null
        };
        
        // Fila de mensagens
        this.messageQueue = {
            messages: [],
            maxMessages: 10,
            currentMessage: null,
            defaultDisplayDuration: 5000
        };
        
        // Configurações
        this.config = {
            progress: {
                animationDuration: 300,
                smoothTransition: true,
                autoHide: {
                    enabled: true,
                    delay: 1500
                }
            },
            messages: {
                types: ['info', 'success', 'warning', 'error'],
                positions: ['top', 'bottom', 'center'],
                defaultPosition: 'top',
                fadeInDuration: 200,
                fadeOutDuration: 300
            },
            notifications: {
                autoHide: {
                    info: 3000,
                    success: 4000,
                    warning: 6000,
                    error: 0 // Não esconde automaticamente
                }
            }
        };
        
        this.init();
    }

    /**
     * Inicializa o Progress Manager
     * @private
     */
    init() {
        this.setupEventListeners();
        this.initializeProgressElements();
        this.initializeNotificationSystem();
        console.log('📊 ProgressManager inicializado com sucesso');
    }

    /**
     * Configura listeners de eventos
     * @private
     */
    setupEventListeners() {
        // Listeners do EventBus
        if (this.eventBus) {
            this.eventBus.on('PROGRESS_UPDATE', (data) => {
                this.handleProgressUpdate(data);
            });
            
            this.eventBus.on('SHOW_MESSAGE', (data) => {
                this.handleShowMessage(data);
            });
            
            this.eventBus.on('OPERATION_STARTED', (data) => {
                this.onOperationStarted(data);
            });
            
            this.eventBus.on('OPERATION_COMPLETED', (data) => {
                this.onOperationCompleted(data);
            });
        }
        
        // Listeners do StateManager
        if (this.stateManager) {
            this.stateManager.addEventListener('ui.progress', (progressData) => {
                this.syncWithStateManager(progressData);
            });
            
            this.stateManager.addEventListener('calculation.inProgress', (inProgress) => {
                if (inProgress) {
                    this.showIndeterminateProgress('Calculando DIFAL...');
                }
            });
        }
    }

    /**
     * Inicializa elementos de progresso no DOM
     * @private
     */
    initializeProgressElements() {
        try {
            // Verificar elementos de progresso existentes
            const progressSection = document.getElementById('progress-section');
            const progressBar = document.getElementById('progress-bar');
            const statusMessage = document.getElementById('status-message');
            
            if (!progressSection) {
                console.warn('⚠️ Elemento progress-section não encontrado');
            }
            if (!progressBar) {
                console.warn('⚠️ Elemento progress-bar não encontrado');
            }
            if (!statusMessage) {
                console.warn('⚠️ Elemento status-message não encontrado');
            }
            
            // Inicializar estado
            this.hideProgress();
            
        } catch (error) {
            console.error('❌ Erro ao inicializar elementos de progresso:', error);
        }
    }

    /**
     * Inicializa sistema de notificações
     * @private
     */
    initializeNotificationSystem() {
        try {
            // Criar container de notificações se não existir
            this.ensureNotificationContainer();
            
            // Limpar mensagens antigas
            this.clearAllMessages();
            
        } catch (error) {
            console.error('❌ Erro ao inicializar sistema de notificações:', error);
        }
    }

    // ========== MÉTODOS DE PROGRESSO ==========

    /**
     * Exibe barra de progresso com porcentagem
     * @public
     * @param {string} message - Mensagem de status
     * @param {number} percentage - Porcentagem (0-100)
     * @param {Object} options - Opções adicionais
     */
    showProgress(message, percentage, options = {}) {
        try {
            const {
                animate = true,
                operation = null,
                updateState = true
            } = options;
            
            // Validar entrada
            const validPercentage = Math.max(0, Math.min(100, percentage || 0));
            const validMessage = message || 'Processando...';
            
            // Atualizar estado interno
            this.progressState = {
                visible: true,
                value: validPercentage,
                message: validMessage,
                indeterminate: false,
                currentOperation: operation
            };
            
            // Atualizar elementos do DOM
            const progressSection = document.getElementById('progress-section');
            const progressBar = document.getElementById('progress-bar');
            const statusMessage = document.getElementById('status-message');
            
            if (progressSection) {
                progressSection.classList.remove('hidden');
                progressSection.style.display = 'block';
            }
            
            if (progressBar) {
                if (animate && this.config.progress.smoothTransition) {
                    progressBar.style.transition = `width ${this.config.progress.animationDuration}ms ease-out`;
                } else {
                    progressBar.style.transition = '';
                }
                
                progressBar.style.width = `${validPercentage}%`;
                progressBar.textContent = `${Math.round(validPercentage)}%`;
                progressBar.setAttribute('aria-valuenow', validPercentage);
            }
            
            if (statusMessage) {
                statusMessage.textContent = validMessage;
                statusMessage.className = 'status-message';
            }
            
            // Atualizar StateManager
            if (updateState && this.stateManager) {
                this.stateManager.setState({
                    ui: {
                        progress: {
                            visible: true,
                            value: validPercentage,
                            message: validMessage
                        }
                    }
                });
            }
            
            // Auto-hide quando chegar a 100%
            if (validPercentage === 100 && this.config.progress.autoHide.enabled) {
                setTimeout(() => {
                    this.hideProgress();
                }, this.config.progress.autoHide.delay);
            }
            
            // Emitir evento
            this.eventBus?.emit('PROGRESS_SHOWN', {
                message: validMessage,
                percentage: validPercentage,
                operation
            });
            
            console.log(`📊 Progresso: ${validPercentage}% - ${validMessage}`);
            
        } catch (error) {
            console.error('❌ Erro ao exibir progresso:', error);
        }
    }

    /**
     * Exibe progresso indeterminado (spinner)
     * @public
     * @param {string} message - Mensagem de status
     * @param {Object} options - Opções adicionais
     */
    showIndeterminateProgress(message, options = {}) {
        try {
            const {
                operation = null,
                updateState = true
            } = options;
            
            const validMessage = message || 'Carregando...';
            
            // Atualizar estado interno
            this.progressState = {
                visible: true,
                value: 0,
                message: validMessage,
                indeterminate: true,
                currentOperation: operation
            };
            
            // Atualizar elementos do DOM
            const progressSection = document.getElementById('progress-section');
            const progressBar = document.getElementById('progress-bar');
            const statusMessage = document.getElementById('status-message');
            
            if (progressSection) {
                progressSection.classList.remove('hidden');
                progressSection.style.display = 'block';
            }
            
            if (progressBar) {
                progressBar.style.width = '100%';
                progressBar.textContent = '';
                progressBar.classList.add('indeterminate');
                progressBar.removeAttribute('aria-valuenow');
            }
            
            if (statusMessage) {
                statusMessage.textContent = validMessage;
                statusMessage.className = 'status-message loading';
            }
            
            // Atualizar StateManager
            if (updateState && this.stateManager) {
                this.stateManager.setState({
                    ui: {
                        progress: {
                            visible: true,
                            value: -1, // -1 indica indeterminado
                            message: validMessage
                        }
                    }
                });
            }
            
            // Emitir evento
            this.eventBus?.emit('INDETERMINATE_PROGRESS_SHOWN', {
                message: validMessage,
                operation
            });
            
            console.log(`🔄 Progresso indeterminado: ${validMessage}`);
            
        } catch (error) {
            console.error('❌ Erro ao exibir progresso indeterminado:', error);
        }
    }

    /**
     * Oculta barra de progresso
     * @public
     * @param {Object} options - Opções adicionais
     */
    hideProgress(options = {}) {
        try {
            const {
                animate = true,
                updateState = true
            } = options;
            
            // Atualizar estado interno
            this.progressState = {
                visible: false,
                value: 0,
                message: '',
                indeterminate: false,
                currentOperation: null
            };
            
            // Atualizar elementos do DOM
            const progressSection = document.getElementById('progress-section');
            const progressBar = document.getElementById('progress-bar');
            
            if (progressSection) {
                if (animate) {
                    progressSection.style.opacity = '0';
                    setTimeout(() => {
                        progressSection.classList.add('hidden');
                        progressSection.style.display = 'none';
                        progressSection.style.opacity = '1';
                    }, this.config.progress.animationDuration);
                } else {
                    progressSection.classList.add('hidden');
                    progressSection.style.display = 'none';
                }
            }
            
            if (progressBar) {
                progressBar.style.width = '0%';
                progressBar.textContent = '';
                progressBar.classList.remove('indeterminate');
                progressBar.style.transition = '';
            }
            
            // Atualizar StateManager
            if (updateState && this.stateManager) {
                this.stateManager.setState({
                    ui: {
                        progress: {
                            visible: false,
                            value: 0,
                            message: ''
                        }
                    }
                });
            }
            
            // Emitir evento
            this.eventBus?.emit('PROGRESS_HIDDEN');
            
        } catch (error) {
            console.error('❌ Erro ao ocultar progresso:', error);
        }
    }

    // ========== MÉTODOS DE MENSAGENS DE STATUS ==========

    /**
     * Exibe mensagem de erro
     * @public
     * @param {string} message - Mensagem de erro
     * @param {Object} options - Opções adicionais
     */
    showError(message, options = {}) {
        this.showMessage(message, 'error', {
            persist: true,
            showAlert: true,
            ...options
        });
    }

    /**
     * Exibe mensagem de sucesso
     * @public
     * @param {string} message - Mensagem de sucesso
     * @param {Object} options - Opções adicionais
     */
    showSuccess(message, options = {}) {
        this.showMessage(message, 'success', {
            duration: this.config.notifications.autoHide.success,
            ...options
        });
    }

    /**
     * Exibe mensagem de aviso
     * @public
     * @param {string} message - Mensagem de aviso
     * @param {Object} options - Opções adicionais
     */
    showWarning(message, options = {}) {
        this.showMessage(message, 'warning', {
            duration: this.config.notifications.autoHide.warning,
            ...options
        });
    }

    /**
     * Exibe mensagem informativa
     * @public
     * @param {string} message - Mensagem informativa
     * @param {Object} options - Opções adicionais
     */
    showInfo(message, options = {}) {
        this.showMessage(message, 'info', {
            duration: this.config.notifications.autoHide.info,
            ...options
        });
    }

    /**
     * Exibe mensagem genérica
     * @public
     * @param {string} message - Mensagem
     * @param {string} type - Tipo da mensagem (info, success, warning, error)
     * @param {Object} options - Opções adicionais
     */
    showMessage(message, type = 'info', options = {}) {
        try {
            const {
                duration = null,
                persist = false,
                showAlert = false,
                position = this.config.messages.defaultPosition,
                updateStatusElement = true
            } = options;
            
            // Validar tipo
            const validType = this.config.messages.types.includes(type) ? type : 'info';
            const validMessage = message || 'Mensagem vazia';
            
            // Atualizar elemento de status se solicitado
            if (updateStatusElement) {
                this.updateStatusMessage(validMessage, validType);
            }
            
            // Adicionar à fila de mensagens
            this.addToMessageQueue({
                message: validMessage,
                type: validType,
                timestamp: Date.now(),
                duration: duration || this.config.notifications.autoHide[validType],
                persist,
                position
            });
            
            // Exibir notificação visual
            this.displayNotification(validMessage, validType, {
                duration: duration || this.config.notifications.autoHide[validType],
                position
            });
            
            // Mostrar alert como fallback para erros críticos
            if (showAlert && validType === 'error') {
                setTimeout(() => alert(validMessage), 100);
            }
            
            // Emitir evento
            this.eventBus?.emit('MESSAGE_SHOWN', {
                message: validMessage,
                type: validType,
                timestamp: Date.now()
            });
            
            console.log(`${this.getLogIcon(validType)} ${validMessage}`);
            
        } catch (error) {
            console.error('❌ Erro ao exibir mensagem:', error);
            // Fallback para alert em caso de erro crítico
            alert(message || 'Erro desconhecido');
        }
    }

    /**
     * Atualiza elemento de status message no DOM
     * @private
     * @param {string} message - Mensagem
     * @param {string} type - Tipo da mensagem
     */
    updateStatusMessage(message, type) {
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.textContent = message;
            statusMessage.className = `status-message ${type}`;
        }
    }

    // ========== SISTEMA DE NOTIFICAÇÕES ==========

    /**
     * Exibe notificação visual
     * @private
     * @param {string} message - Mensagem
     * @param {string} type - Tipo da notificação
     * @param {Object} options - Opções
     */
    displayNotification(message, type, options = {}) {
        try {
            const {
                duration = 3000,
                position = 'top'
            } = options;
            
            // Criar elemento de notificação
            const notification = this.createNotificationElement(message, type);
            
            // Obter container
            const container = this.getNotificationContainer(position);
            if (!container) return;
            
            // Adicionar notificação ao container
            container.appendChild(notification);
            
            // Animar entrada
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);
            
            // Auto-remover se não for persistente
            if (duration > 0) {
                setTimeout(() => {
                    this.removeNotification(notification);
                }, duration);
            }
            
            // Adicionar evento de clique para fechar
            notification.addEventListener('click', () => {
                this.removeNotification(notification);
            });
            
        } catch (error) {
            console.error('❌ Erro ao exibir notificação:', error);
        }
    }

    /**
     * Cria elemento de notificação
     * @private
     * @param {string} message - Mensagem
     * @param {string} type - Tipo
     * @returns {HTMLElement} Elemento de notificação
     */
    createNotificationElement(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" aria-label="Fechar">×</button>
            </div>
        `;
        
        // Event listener para botão fechar
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeNotification(notification);
        });
        
        return notification;
    }

    /**
     * Remove notificação
     * @private
     * @param {HTMLElement} notification - Elemento de notificação
     */
    removeNotification(notification) {
        if (!notification || !notification.parentNode) return;
        
        notification.classList.remove('show');
        notification.classList.add('hiding');
        
        setTimeout(() => {
            notification.parentNode?.removeChild(notification);
        }, this.config.messages.fadeOutDuration);
    }

    /**
     * Garante que container de notificações existe
     * @private
     */
    ensureNotificationContainer() {
        const existingContainer = document.querySelector('.notifications-container');
        if (existingContainer) return;
        
        const container = document.createElement('div');
        container.className = 'notifications-container';
        container.innerHTML = `
            <div class="notifications notifications-top"></div>
            <div class="notifications notifications-bottom"></div>
            <div class="notifications notifications-center"></div>
        `;
        
        document.body.appendChild(container);
    }

    /**
     * Obtém container de notificações por posição
     * @private
     * @param {string} position - Posição (top, bottom, center)
     * @returns {HTMLElement|null} Container
     */
    getNotificationContainer(position = 'top') {
        return document.querySelector(`.notifications-${position}`);
    }

    // ========== GERENCIAMENTO DE FILA DE MENSAGENS ==========

    /**
     * Adiciona mensagem à fila
     * @private
     * @param {Object} messageData - Dados da mensagem
     */
    addToMessageQueue(messageData) {
        this.messageQueue.messages.push(messageData);
        
        // Limitar tamanho da fila
        if (this.messageQueue.messages.length > this.messageQueue.maxMessages) {
            this.messageQueue.messages.shift();
        }
        
        this.messageQueue.currentMessage = messageData;
    }

    /**
     * Limpa todas as mensagens
     * @public
     */
    clearAllMessages() {
        this.messageQueue.messages = [];
        this.messageQueue.currentMessage = null;
        
        // Remover notificações do DOM
        document.querySelectorAll('.notification').forEach(notification => {
            this.removeNotification(notification);
        });
    }

    /**
     * Obtém histórico de mensagens
     * @public
     * @returns {Array} Histórico de mensagens
     */
    getMessageHistory() {
        return [...this.messageQueue.messages];
    }

    // ========== EVENT HANDLERS ==========

    /**
     * Manipula atualização de progresso via EventBus
     * @private
     * @param {Object} data - Dados de progresso
     */
    handleProgressUpdate(data) {
        const { message, percentage, indeterminate = false, operation = null } = data;
        
        if (indeterminate) {
            this.showIndeterminateProgress(message, { operation });
        } else {
            this.showProgress(message, percentage, { operation });
        }
    }

    /**
     * Manipula exibição de mensagem via EventBus
     * @private
     * @param {Object} data - Dados da mensagem
     */
    handleShowMessage(data) {
        const { message, type = 'info', options = {} } = data;
        this.showMessage(message, type, options);
    }

    /**
     * Manipula início de operação
     * @private
     * @param {Object} data - Dados da operação
     */
    onOperationStarted(data) {
        const { operation, message } = data;
        this.showIndeterminateProgress(message || `Iniciando ${operation}...`, { operation });
    }

    /**
     * Manipula conclusão de operação
     * @private
     * @param {Object} data - Dados da operação
     */
    onOperationCompleted(data) {
        const { operation, success, message } = data;
        
        this.hideProgress();
        
        if (success) {
            this.showSuccess(message || `${operation} concluída com sucesso!`);
        } else {
            this.showError(message || `Erro em ${operation}`);
        }
    }

    /**
     * Sincroniza com mudanças do StateManager
     * @private
     * @param {Object} progressData - Dados de progresso
     */
    syncWithStateManager(progressData) {
        if (!progressData) return;
        
        const { visible, value, message } = progressData;
        
        if (visible && value !== undefined && message) {
            if (value < 0) {
                this.showIndeterminateProgress(message, { updateState: false });
            } else {
                this.showProgress(message, value, { updateState: false });
            }
        } else if (!visible) {
            this.hideProgress({ updateState: false });
        }
    }

    // ========== MÉTODOS UTILITÁRIOS ==========

    /**
     * Obtém ícone para log baseado no tipo
     * @private
     * @param {string} type - Tipo da mensagem
     * @returns {string} Ícone
     */
    getLogIcon(type) {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        return icons[type] || 'ℹ️';
    }

    /**
     * Obtém ícone para notificação baseado no tipo
     * @private
     * @param {string} type - Tipo da notificação
     * @returns {string} Ícone
     */
    getNotificationIcon(type) {
        const icons = {
            info: '💡',
            success: '✓',
            warning: '⚠',
            error: '✕'
        };
        return icons[type] || '💡';
    }

    /**
     * Obtém estado atual do progresso
     * @public
     * @returns {Object} Estado do progresso
     */
    getProgressState() {
        return { ...this.progressState };
    }

    /**
     * Verifica se progresso está visível
     * @public
     * @returns {boolean} True se visível
     */
    isProgressVisible() {
        return this.progressState.visible;
    }

    /**
     * Obtém operação atual
     * @public
     * @returns {string|null} Operação atual
     */
    getCurrentOperation() {
        return this.progressState.currentOperation;
    }

    /**
     * Redefine estado do progresso
     * @public
     */
    resetProgress() {
        this.hideProgress();
        this.clearAllMessages();
        console.log('🔄 Estado de progresso redefinido');
    }
}

// ========== EXPORTAÇÃO DO MÓDULO ==========

// Registrar globalmente
if (typeof window !== 'undefined') {
    window.ProgressManager = ProgressManager;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgressManager;
}