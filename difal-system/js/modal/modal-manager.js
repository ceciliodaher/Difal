/**
 * @fileoverview Modal Manager - Módulo de gerenciamento de modais
 * @module ModalManager
 * @description Responsável por gerenciar todas as interações com modais no sistema DIFAL,
 * incluindo modal de configuração geral, configuração por item, exibição de memória de cálculo,
 * modais de mensagem e controle de workflow entre modais.
 * 
 * @author Sistema DIFAL
 * @version 1.0.0
 * @since 2025-01-10
 */

/**
 * @class ModalManager
 * @classdesc Gerencia todas as operações modais do sistema DIFAL
 */
class ModalManager {
    /**
     * @constructor
     * @param {EventBus} eventBus - Instância do barramento de eventos
     * @param {StateManager} stateManager - Instância do gerenciador de estado
     * @param {ConfigurationManager} configManager - Instância do gerenciador de configuração
     */
    constructor(eventBus, stateManager, configManager) {
        if (!eventBus) {
            throw new Error('ModalManager requer uma instância de EventBus');
        }
        if (!stateManager) {
            throw new Error('ModalManager requer uma instância de StateManager');
        }
        if (!configManager) {
            throw new Error('ModalManager requer uma instância de ConfigurationManager');
        }

        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.configManager = configManager;

        // Stack de modais abertos para controle de z-index e fechamento
        this.modalStack = [];
        
        // Configurações do modal manager
        this.config = {
            baseZIndex: 1000,
            animationDuration: 300,
            closeOnEscape: true,
            closeOnOverlayClick: true,
            stackLimit: 5 // Máximo de modais empilhados
        };

        // Estados de configuração por item
        this.itemConfigState = {
            currentPage: 1,
            itemsPerPage: 20,
            filteredItems: [],
            totalPages: 1
        };

        this.init();
    }

    /**
     * Inicializa o Modal Manager
     * @private
     */
    init() {
        this.setupGlobalModalFunctions();
        this.setupKeyboardListeners();
        this.setupEventListeners();
        console.log('🎭 ModalManager inicializado com sucesso');
    }

    /**
     * Configura event listeners globais
     * @private
     */
    setupEventListeners() {
        // Listener para eventos do EventBus
        if (this.eventBus) {
            this.eventBus.on('MODAL_OPEN_REQUEST', (data) => {
                this.handleModalOpenRequest(data);
            });

            this.eventBus.on('MODAL_CLOSE_REQUEST', (data) => {
                this.handleModalCloseRequest(data);
            });
        }
    }

    /**
     * Configura listeners de teclado globais
     * @private
     */
    setupKeyboardListeners() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.config.closeOnEscape) {
                this.closeTopModal();
            }
        });
    }

    // ========== MODAL DE CONFIGURAÇÃO GERAL ==========

    /**
     * Abre modal de configuração geral
     * @public
     * @returns {boolean} True se modal foi aberto com sucesso
     */
    openConfigModal() {
        try {
            const modal = document.getElementById('config-modal');
            if (!modal) {
                throw new Error('Modal de configuração não encontrado');
            }

            this.showModal(modal, 'config-modal');
            this.setupConfigModalEvents();
            
            // Notificar via EventBus
            this.eventBus?.emit('CONFIG_MODAL_OPENED', {
                modalId: 'config-modal',
                timestamp: Date.now()
            });

            console.log('⚙️ Modal de configuração aberto');
            return true;

        } catch (error) {
            this.handleModalError('Erro ao abrir modal de configuração', error);
            return false;
        }
    }

    /**
     * Fecha modal de configuração geral
     * @public
     * @returns {boolean} True se modal foi fechado com sucesso
     */
    closeConfigModal() {
        try {
            const modal = document.getElementById('config-modal');
            if (!modal) {
                return false;
            }

            this.hideModal(modal, 'config-modal');
            
            // Notificar via EventBus
            this.eventBus?.emit('CONFIG_MODAL_CLOSED', {
                modalId: 'config-modal',
                timestamp: Date.now()
            });

            console.log('⚙️ Modal de configuração fechado');
            return true;

        } catch (error) {
            this.handleModalError('Erro ao fechar modal de configuração', error);
            return false;
        }
    }

    /**
     * Configura eventos específicos do modal de configuração
     * @private
     */
    setupConfigModalEvents() {
        // Event listeners para metodologia
        const metodologiaInputs = document.querySelectorAll('input[name="metodologia"]');
        metodologiaInputs.forEach(input => {
            input.addEventListener('change', (event) => {
                this.onMetodologiaChange(event.target.value);
            });
        });

        // Event listener para benefícios
        const configurarBeneficios = document.getElementById('configurar-beneficios');
        if (configurarBeneficios) {
            configurarBeneficios.addEventListener('change', (event) => {
                this.onBeneficiosToggle(event.target.checked);
            });
        }
    }

    /**
     * Manipula mudança na metodologia
     * @private
     * @param {string} metodologia - Metodologia selecionada
     */
    onMetodologiaChange(metodologia) {
        console.log(`📊 Metodologia selecionada: ${metodologia}`);
        
        // Notificar via EventBus
        this.eventBus?.emit('METODOLOGIA_CHANGED', {
            metodologia,
            timestamp: Date.now()
        });
    }

    /**
     * Manipula toggle de benefícios
     * @private
     * @param {boolean} configurarBeneficios - Estado do checkbox
     */
    onBeneficiosToggle(configurarBeneficios) {
        console.log(`💰 Configurar benefícios: ${configurarBeneficios}`);
        
        // Notificar via EventBus
        this.eventBus?.emit('BENEFICIOS_TOGGLE', {
            configurarBeneficios,
            timestamp: Date.now()
        });
    }

    // ========== MODAL DE CONFIGURAÇÃO POR ITEM ==========

    /**
     * Abre modal de configuração por item
     * @public
     * @returns {boolean} True se modal foi aberto com sucesso
     */
    openItemConfigModal() {
        try {
            // Tentar buscar dados do StateManager primeiro (período único)
            let spedData = this.stateManager.getSpedData();
            
            // Se não encontrou no StateManager, tentar no PeriodsManager (múltiplos períodos)
            if (!spedData || !spedData.itensDifal) {
                const periodsState = this.stateManager.getPeriodsState();
                if (periodsState && periodsState.periods && periodsState.periods.length > 0) {
                    // Usar dados do primeiro período disponível
                    const firstPeriod = periodsState.periods[0];
                    if (firstPeriod.dados && firstPeriod.dados.itensDifal) {
                        spedData = firstPeriod.dados;
                        console.log('📅 Usando dados do PeriodsManager para modal de configuração');
                    }
                }
            }
            
            if (!spedData || !spedData.itensDifal) {
                throw new Error('Dados SPED não disponíveis nem no período único nem nos múltiplos períodos');
            }

            const modal = document.getElementById('item-config-modal');
            if (!modal) {
                throw new Error('Modal de configuração de itens não encontrado');
            }

            // Inicializar estado da configuração por item
            this.initItemConfigurationState(spedData.itensDifal);
            
            this.showModal(modal, 'item-config-modal');
            this.renderItemConfigTable();
            this.setupItemConfigEvents();

            // Notificar via EventBus
            this.eventBus?.emit('ITEM_CONFIG_MODAL_OPENED', {
                modalId: 'item-config-modal',
                totalItems: spedData.itensDifal.length,
                timestamp: Date.now()
            });

            console.log('🎯 Modal de configuração por item aberto');
            return true;

        } catch (error) {
            this.handleModalError('Erro ao abrir modal de configuração por item', error);
            return false;
        }
    }

    /**
     * Fecha modal de configuração por item
     * @public
     * @returns {boolean} True se modal foi fechado com sucesso
     */
    closeItemConfigModal() {
        try {
            const modal = document.getElementById('item-config-modal');
            if (!modal) {
                return false;
            }

            this.hideModal(modal, 'item-config-modal');
            
            // Notificar via EventBus
            this.eventBus?.emit('ITEM_CONFIG_MODAL_CLOSED', {
                modalId: 'item-config-modal',
                timestamp: Date.now()
            });

            console.log('🎯 Modal de configuração por item fechado');
            return true;

        } catch (error) {
            this.handleModalError('Erro ao fechar modal de configuração por item', error);
            return false;
        }
    }

    /**
     * Inicializa estado da configuração por item
     * @private
     * @param {Array} itensDifal - Itens DIFAL do SPED
     */
    initItemConfigurationState(itensDifal) {
        // Integrar com Configuration Manager
        this.configManager.initializeConfigurationSystem();
        
        this.itemConfigState = {
            currentPage: 1,
            itemsPerPage: 20,
            filteredItems: [...itensDifal],
            totalPages: Math.ceil(itensDifal.length / 20)
        };
    }

    /**
     * Configura eventos do modal de configuração por item
     * @private
     */
    setupItemConfigEvents() {
        // Eventos de filtro com debounce
        const filterElements = [
            'filtro-cfop',
            'filtro-ncm', 
            'filtro-valor-min',
            'busca-item'
        ];

        filterElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.addEventListener('input', this.debounce(() => {
                    this.configManager.aplicarFiltros();
                }, 300));
            }
        });
    }

    /**
     * Renderiza tabela de configuração de itens
     * @private
     */
    renderItemConfigTable() {
        try {
            const tbody = document.querySelector('#tabela-configuracao-itens tbody');
            if (!tbody) {
                throw new Error('Tabela de configuração de itens não encontrada');
            }

            const { currentPage, itemsPerPage, filteredItems } = this.itemConfigState;
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const pageItems = filteredItems.slice(startIndex, endIndex);

            tbody.innerHTML = pageItems.map(item => this.configManager.createItemConfigRow(item)).join('');
            
            this.configManager.updatePagination();
            this.configManager.updateSummary();
            this.configManager.updateStorageStats();

        } catch (error) {
            this.handleModalError('Erro ao renderizar tabela de configuração', error);
        }
    }

    // ========== MODAL DE MEMÓRIA DE CÁLCULO ==========

    /**
     * Mostra modal de memória de cálculo
     * @public
     * @param {string} itemId - ID do item
     * @returns {boolean} True se modal foi exibido com sucesso
     */
    showMemoryCalculationModal(itemId) {
        try {
            const results = this.getCalculationResults();
            if (!results || !results.resultados) {
                throw new Error('Resultados de cálculo não disponíveis');
            }

            const resultado = results.resultados.find(r => r.item?.codItem === itemId);
            if (!resultado || !resultado.memoriaCalculo) {
                throw new Error(`Memória de cálculo não disponível para o item ${itemId}`);
            }

            // Criar modal dinâmico
            const modal = this.createMemoryModal(itemId, resultado);
            document.body.appendChild(modal);
            
            this.showModal(modal, `memory-modal-${itemId}`);

            // Notificar via EventBus
            this.eventBus?.emit('MEMORY_MODAL_OPENED', {
                modalId: `memory-modal-${itemId}`,
                itemId,
                timestamp: Date.now()
            });

            console.log(`📋 Modal de memória de cálculo aberto para item ${itemId}`);
            return true;

        } catch (error) {
            this.handleModalError('Erro ao mostrar memória de cálculo', error);
            return false;
        }
    }

    /**
     * Cria modal dinâmico para memória de cálculo
     * @private
     * @param {string} itemId - ID do item
     * @param {Object} resultado - Resultado do cálculo
     * @returns {HTMLElement} Elemento modal criado
     */
    createMemoryModal(itemId, resultado) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = `memory-modal-${itemId}`;
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content modal-large">
                    <div class="modal-header">
                        <h2>📋 Memória de Cálculo - Item ${itemId}</h2>
                        <button class="modal-close" data-action="close-modal">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="memoria-calculo">
                            <pre style="white-space: pre-wrap; font-family: monospace; font-size: 14px; line-height: 1.5; background: #f8f9fa; padding: 20px; border-radius: 8px; overflow-x: auto;">${resultado.memoriaCalculo.join('\n')}</pre>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-action="close-modal">Fechar</button>
                        <button class="btn btn-primary" data-action="copy-memory" data-item="${itemId}">📋 Copiar</button>
                        <button class="btn btn-info" data-action="export-memory" data-item="${itemId}">💾 Exportar</button>
                    </div>
                </div>
            </div>
        `;

        // Configurar eventos do modal
        this.setupMemoryModalEvents(modal, itemId);
        
        return modal;
    }

    /**
     * Configura eventos do modal de memória de cálculo
     * @private
     * @param {HTMLElement} modal - Elemento modal
     * @param {string} itemId - ID do item
     */
    setupMemoryModalEvents(modal, itemId) {
        // Delegação de eventos usando data-action
        modal.addEventListener('click', (event) => {
            const action = event.target.getAttribute('data-action');
            
            switch (action) {
                case 'close-modal':
                    this.hideModal(modal, `memory-modal-${itemId}`);
                    modal.remove();
                    break;
                case 'copy-memory':
                    this.copyMemoryCalculation(itemId);
                    break;
                case 'export-memory':
                    this.exportMemoryCalculation(itemId);
                    break;
            }
        });

        // Fechar modal ao clicar no overlay
        const overlay = modal.querySelector('.modal-overlay');
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                this.hideModal(modal, `memory-modal-${itemId}`);
                modal.remove();
            }
        });
    }

    // ========== MODAIS DE MENSAGEM ==========

    /**
     * Exibe modal de sucesso
     * @public
     * @param {string} message - Mensagem de sucesso
     * @param {Object} options - Opções do modal
     */
    showSuccessModal(message, options = {}) {
        this.showMessageModal(message, 'success', options);
    }

    /**
     * Exibe modal de erro
     * @public
     * @param {string} message - Mensagem de erro
     * @param {Object} options - Opções do modal
     */
    showErrorModal(message, options = {}) {
        this.showMessageModal(message, 'error', options);
    }

    /**
     * Exibe modal de informação
     * @public
     * @param {string} message - Mensagem informativa
     * @param {Object} options - Opções do modal
     */
    showInfoModal(message, options = {}) {
        this.showMessageModal(message, 'info', options);
    }

    /**
     * Exibe modal de mensagem genérico
     * @private
     * @param {string} message - Mensagem
     * @param {string} type - Tipo do modal (success, error, info)
     * @param {Object} options - Opções do modal
     */
    showMessageModal(message, type = 'info', options = {}) {
        const modal = this.createMessageModal(message, type, options);
        document.body.appendChild(modal);
        
        this.showModal(modal, `message-modal-${Date.now()}`);

        // Auto fechar se especificado
        if (options.autoClose) {
            setTimeout(() => {
                this.hideModal(modal, modal.id);
                modal.remove();
            }, options.autoClose);
        }
    }

    // ========== MÉTODOS UTILITÁRIOS ==========

    /**
     * Mostra modal com animação
     * @private
     * @param {HTMLElement} modal - Elemento modal
     * @param {string} modalId - ID do modal
     */
    showModal(modal, modalId) {
        // Adicionar à stack
        this.modalStack.push({ element: modal, id: modalId });
        
        // Definir z-index
        const zIndex = this.config.baseZIndex + this.modalStack.length;
        modal.style.zIndex = zIndex;
        
        // Mostrar modal
        modal.classList.remove('hidden');
        
        // Animação de entrada
        requestAnimationFrame(() => {
            modal.classList.add('modal-enter');
        });

        // Bloquear scroll do body se for o primeiro modal
        if (this.modalStack.length === 1) {
            document.body.classList.add('modal-open');
        }
    }

    /**
     * Esconde modal com animação
     * @private
     * @param {HTMLElement} modal - Elemento modal
     * @param {string} modalId - ID do modal
     */
    hideModal(modal, modalId) {
        // Animação de saída
        modal.classList.add('modal-exit');
        
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('modal-enter', 'modal-exit');
            
            // Remover da stack
            this.modalStack = this.modalStack.filter(m => m.id !== modalId);
            
            // Restaurar scroll do body se não há mais modais
            if (this.modalStack.length === 0) {
                document.body.classList.remove('modal-open');
            }
        }, this.config.animationDuration);
    }

    /**
     * Fecha modal no topo da stack
     * @private
     */
    closeTopModal() {
        if (this.modalStack.length > 0) {
            const topModal = this.modalStack[this.modalStack.length - 1];
            this.hideModal(topModal.element, topModal.id);
        }
    }

    /**
     * Debounce function para evitar chamadas excessivas
     * @private
     * @param {Function} func - Função para debounce
     * @param {number} wait - Tempo de espera em ms
     * @returns {Function} Função com debounce aplicado
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Obtém resultados do cálculo
     * @private
     * @returns {Object|null} Resultados do cálculo
     */
    getCalculationResults() {
        // Primeiro tenta do StateManager
        const stateResults = this.stateManager?.getState('calculation');
        if (stateResults && stateResults.results) {
            return {
                resultados: stateResults.results,
                totalizadores: stateResults.totals
            };
        }

        // Fallback para window.difalResults
        return window.difalResults;
    }

    /**
     * Copia memória de cálculo para clipboard
     * @private
     * @param {string} itemId - ID do item
     */
    copyMemoryCalculation(itemId) {
        try {
            const results = this.getCalculationResults();
            const resultado = results?.resultados.find(r => r.item?.codItem === itemId);
            
            if (!resultado?.memoriaCalculo) {
                throw new Error('Memória de cálculo não disponível');
            }

            const texto = resultado.memoriaCalculo.join('\n');
            navigator.clipboard.writeText(texto).then(() => {
                this.showSuccessModal('Memória de cálculo copiada!', { autoClose: 2000 });
            });

        } catch (error) {
            this.showErrorModal(`Erro ao copiar: ${error.message}`);
        }
    }

    /**
     * Exporta memória de cálculo
     * @private
     * @param {string} itemId - ID do item
     */
    exportMemoryCalculation(itemId) {
        // Delegar para Export Manager se disponível
        if (window.exportManager && window.exportManager.exportarMemoriaCalculo) {
            window.exportManager.exportarMemoriaCalculo(itemId);
        } else {
            console.warn('Export Manager não disponível');
        }
    }

    /**
     * Trata erros modais
     * @private
     * @param {string} context - Contexto do erro
     * @param {Error} error - Erro ocorrido
     */
    handleModalError(context, error) {
        const message = `${context}: ${error.message}`;
        console.error(message, error);
        
        // Notificar via EventBus
        this.eventBus?.emit('MODAL_ERROR', {
            context,
            error: error.message,
            timestamp: Date.now()
        });

        // Mostrar erro na UI
        if (typeof alert !== 'undefined') {
            alert(message);
        }
    }

    /**
     * Configura funções globais para compatibilidade
     * @private
     */
    setupGlobalModalFunctions() {
        // Funções globais para compatibilidade com código existente
        window.openConfigModal = () => this.openConfigModal();
        window.closeConfigModal = () => this.closeConfigModal();
        window.openItemConfigModal = () => this.openItemConfigModal();
        window.closeItemConfigModal = () => this.closeItemConfigModal();
        window.mostrarMemoriaCalculo = (itemId) => this.showMemoryCalculationModal(itemId);
        
        // Workflow functions
        window.prosseguirParaConfiguracaoItens = () => this.handleConfigWorkflow();
        window.calcularSemConfiguracaoItens = () => this.handleSimpleCalculation();
    }

    /**
     * Manipula workflow de configuração
     * @private
     */
    handleConfigWorkflow() {
        try {
            const configuracaoGeral = this.coletarConfiguracaoGeralModal();
            
            // Armazenar configuração no StateManager
            this.stateManager.setState('configuration', configuracaoGeral);
            
            this.closeConfigModal();
            
            if (configuracaoGeral.configurarBeneficios) {
                this.openItemConfigModal();
            } else {
                this.executeCalculation(configuracaoGeral);
            }

        } catch (error) {
            this.handleModalError('Erro no workflow de configuração', error);
        }
    }

    /**
     * Manipula cálculo simples sem configuração de itens
     * @private
     */
    handleSimpleCalculation() {
        try {
            const configuracaoGeral = this.coletarConfiguracaoGeralModal();
            configuracaoGeral.configurarBeneficios = false;
            
            this.stateManager.setState('configuration', configuracaoGeral);
            this.closeConfigModal();
            this.executeCalculation(configuracaoGeral);

        } catch (error) {
            this.handleModalError('Erro no cálculo simples', error);
        }
    }

    /**
     * Coleta configuração do modal geral
     * @private
     * @returns {Object} Configuração coletada
     */
    coletarConfiguracaoGeralModal() {
        return {
            metodologia: document.querySelector('input[name="metodologia"]:checked')?.value || 'auto',
            configurarBeneficios: document.getElementById('configurar-beneficios')?.checked ?? true,
            fcpManual: document.getElementById('configurar-fcp-manual')?.checked || false,
            percentualDestinatario: parseFloat(document.getElementById('percentual-destinatario')?.value) || 100,
            beneficiosGlobais: this.coletarBeneficiosGlobais()
        };
    }

    /**
     * Coleta benefícios globais do modal
     * @private
     * @returns {Object} Benefícios globais configurados
     */
    coletarBeneficiosGlobais() {
        const cargaEfetiva = document.getElementById('carga-efetiva')?.value;
        const aliqOrigemEfetiva = document.getElementById('aliq-origem-efetiva')?.value;
        const aliqDestinoEfetiva = document.getElementById('aliq-destino-efetiva')?.value;
        
        return {
            cargaEfetiva: cargaEfetiva ? parseFloat(cargaEfetiva) : null,
            aliqOrigemEfetiva: aliqOrigemEfetiva ? parseFloat(aliqOrigemEfetiva) : null,
            aliqDestinoEfetiva: aliqDestinoEfetiva ? parseFloat(aliqDestinoEfetiva) : null
        };
    }

    /**
     * Executa cálculo DIFAL
     * @private
     * @param {Object} configuracao - Configurações do cálculo
     */
    executeCalculation(configuracao) {
        // Notificar via EventBus para iniciar cálculo
        this.eventBus?.emit('START_CALCULATION', {
            configuration: configuracao,
            timestamp: Date.now()
        });
    }
}

// ========== EXPORTAÇÃO DO MÓDULO ==========

// Registrar globalmente
if (typeof window !== 'undefined') {
    window.ModalManager = ModalManager;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalManager;
}