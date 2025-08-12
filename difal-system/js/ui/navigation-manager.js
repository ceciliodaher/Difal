/**
 * @fileoverview Navigation Manager - Módulo de gerenciamento de navegação
 * @module NavigationManager
 * @description Responsável por controlar a navegação entre seções, estados de botões,
 * transições de interface e sincronização de informações da empresa durante a navegação.
 * 
 * @author Sistema DIFAL
 * @version 1.0.0
 * @since 2025-01-10
 */

/**
 * @class NavigationManager
 * @classdesc Gerencia todas as operações de navegação do sistema DIFAL
 */
class NavigationManager {
    /**
     * @constructor
     * @param {ModeManager} modeManager - Instância do gerenciador de modo
     * @param {EventBus} eventBus - Instância do barramento de eventos
     */
    constructor(modeManager, eventBus) {
        if (!modeManager) {
            throw new Error('NavigationManager requer uma instância de ModeManager');
        }
        
        this.modeManager = modeManager;
        this.eventBus = eventBus;
        
        // Estado da navegação
        this.navigationState = {
            currentSection: 'single-upload-section', // Start with single mode
            previousSection: null,
            history: [],
            transitionInProgress: false,
            maxHistorySize: 20,
            activeMode: 'single'
        };
        
        // Configurações de navegação por modo
        this.config = {
            singleSections: [
                'single-upload-section',
                'single-analysis-section', 
                'single-calculation-section',
                'single-results-section'
            ],
            multiSections: [
                'multi-upload-section',
                'multi-periods-section',
                'multi-analytics-section',
                'multi-reports-section'
            ],
            transitions: {
                duration: 300,
                easing: 'ease-in-out'
            },
            breadcrumbs: {
                enabled: true,
                showSectionNames: true
            }
        };
        
        this.init();
    }

    /**
     * Inicializa o Navigation Manager
     * @private
     */
    init() {
        this.setupEventListeners();
        this.setupNavigationButtons();
        this.setupModeChangeListener();
        this.initializeCurrentSection();
        this.updateNavigationForMode('single'); // Initialize with single mode
        this.setupBreadcrumbs();
        console.log('🧭 NavigationManager inicializado com sucesso');
    }

    /**
     * Configura listener para mudanças de modo
     * @private
     */
    setupModeChangeListener() {
        if (this.eventBus) {
            this.eventBus.on('mode:changed', (data) => {
                this.handleModeChange(data.activeMode, data.previousMode);
            });
        }
    }

    /**
     * Manipula mudança de modo
     * @param {string} newMode - Novo modo ('single' | 'multi')
     * @param {string} previousMode - Modo anterior
     * @private
     */
    handleModeChange(newMode, previousMode) {
        console.log(`🧭 Mudança de modo detectada: ${previousMode} → ${newMode}`);
        
        // Atualizar estado interno
        this.navigationState.activeMode = newMode;
        
        // IMPORTANTE: Esconder tela de seleção de modo primeiro
        const modeSelectionSection = document.getElementById('mode-selection-section');
        if (modeSelectionSection) {
            modeSelectionSection.classList.remove('active');
            modeSelectionSection.classList.add('hidden');
            modeSelectionSection.style.display = 'none';
            console.log('🧭 Tela de seleção de modo escondida');
        }
        
        // Mostrar navegação
        const navigation = document.getElementById('main-navigation');
        if (navigation) {
            navigation.classList.remove('hidden');
            navigation.style.display = '';
            console.log('🧭 Navegação mostrada');
        }
        
        // Atualizar navegação para o novo modo
        this.updateNavigationForMode(newMode);
        
        // Navegar para primeira seção do novo modo
        const firstSection = newMode === 'single' ? 
            this.config.singleSections[0] : 
            this.config.multiSections[0];
        
        console.log(`🧭 Navegando para primeira seção: ${firstSection}`);
        this.navigateToSection(firstSection);
    }

    /**
     * Atualiza navegação baseada no modo ativo
     * @param {string} mode - Modo ativo ('single' | 'multi')
     */
    updateNavigationForMode(mode) {
        const singleTabs = document.querySelectorAll('.nav-btn.mode-single');
        const multiTabs = document.querySelectorAll('.nav-btn.mode-multi');
        
        const singleSections = document.querySelectorAll('.section.mode-single');
        const multiSections = document.querySelectorAll('.section.mode-multi');
        
        if (mode === 'single') {
            // Mostrar tabs single-period
            singleTabs.forEach(tab => {
                tab.classList.remove('hidden');
                tab.style.display = '';
            });
            
            // Esconder tabs multi-period
            multiTabs.forEach(tab => {
                tab.classList.add('hidden');
                tab.style.display = 'none';
            });
            
            // Mostrar seções single-period
            singleSections.forEach(section => {
                section.classList.remove('hidden');
                section.style.display = '';
            });
            
            // Esconder seções multi-period
            multiSections.forEach(section => {
                section.classList.add('hidden');
                section.style.display = 'none';
            });
            
        } else if (mode === 'multi') {
            // Esconder tabs single-period
            singleTabs.forEach(tab => {
                tab.classList.add('hidden');
                tab.style.display = 'none';
            });
            
            // Mostrar tabs multi-period
            multiTabs.forEach(tab => {
                tab.classList.remove('hidden');
                tab.style.display = '';
            });
            
            // Esconder seções single-period
            singleSections.forEach(section => {
                section.classList.add('hidden');
                section.style.display = 'none';
            });
            
            // Mostrar seções multi-period
            multiSections.forEach(section => {
                section.classList.remove('hidden');
                section.style.display = '';
            });
        }
        
        console.log(`🧭 Interface atualizada para modo: ${mode}`);
    }

    /**
     * Configura listeners de eventos
     * @private
     */
    setupEventListeners() {
        // Listeners do EventBus
        if (this.eventBus) {
            this.eventBus.on('SECTION_CHANGE_REQUESTED', (data) => {
                this.handleSectionChangeRequest(data);
            });
            
            this.eventBus.on('DATA_LOADED', () => {
                this.onDataLoaded();
            });
            
            this.eventBus.on('CALCULATION_COMPLETED', () => {
                this.onCalculationCompleted();
            });
        }
        
        // Listener do StateManager para mudanças de seção
        if (this.stateManager) {
            this.stateManager.addEventListener('app.currentSection', (newSection) => {
                this.syncWithStateManager(newSection);
            });
        }
    }

    /**
     * Configura botões de navegação
     * @private
     */
    setupNavigationButtons() {
        try {
            const navButtons = document.querySelectorAll('.nav-btn, [data-section]');
            
            navButtons.forEach(btn => {
                // Remove listeners existentes
                btn.removeEventListener('click', this.handleNavButtonClick);
                
                // Adiciona novo listener
                btn.addEventListener('click', (e) => this.handleNavButtonClick(e));
            });
            
            console.log(`📍 ${navButtons.length} botões de navegação configurados`);
        } catch (error) {
            console.error('❌ Erro ao configurar botões de navegação:', error);
        }
    }

    /**
     * Inicializa seção atual
     * @private
     */
    initializeCurrentSection() {
        // Verificar seção ativa no DOM
        const activeSection = document.querySelector('.section.active');
        if (activeSection) {
            this.navigationState.currentSection = activeSection.id;
        }
        
        // Sincronizar com StateManager
        const stateSection = this.stateManager?.getState('app.currentSection');
        if (stateSection) {
            this.navigationState.currentSection = stateSection;
        }
        
        // Garantir que a seção atual está visível
        this.showSection(this.navigationState.currentSection, false);
    }

    /**
     * Configura sistema de breadcrumbs
     * @private
     */
    setupBreadcrumbs() {
        if (!this.config.breadcrumbs.enabled) return;
        
        try {
            const breadcrumbContainer = document.querySelector('.breadcrumb, #navigation-breadcrumb');
            if (breadcrumbContainer) {
                this.updateBreadcrumbs();
            }
        } catch (error) {
            console.warn('⚠️ Breadcrumbs não configurados:', error.message);
        }
    }

    // ========== MÉTODOS DE NAVEGAÇÃO ==========

    /**
     * Navega para uma seção específica
     * @public
     * @param {string} sectionId - ID da seção de destino
     * @param {Object} options - Opções de navegação
     * @returns {Promise<boolean>} True se navegação foi bem-sucedida
     */
    async navigateToSection(sectionId, options = {}) {
        try {
            const {
                updateHistory = true,
                skipValidation = false,
                animate = true,
                updateCompanyInfo = true
            } = options;
            
            // Validar seção
            if (!skipValidation && !this.validateSectionNavigation(sectionId)) {
                console.error(`❌ Navegação bloqueada para: ${sectionId}`);
                return false;
            }
            
            console.log(`🧭 Navegando para: ${sectionId}`);
            
            // Marcar transição em progresso
            this.navigationState.transitionInProgress = true;
            
            // Atualizar histórico
            if (updateHistory) {
                this.addToHistory(this.navigationState.currentSection, sectionId);
            }
            
            // Executar navegação
            const success = await this.showSection(sectionId, animate);
            
            if (success) {
                // Atualizar estado
                this.navigationState.previousSection = this.navigationState.currentSection;
                this.navigationState.currentSection = sectionId;
                
                // Atualizar StateManager
                this.stateManager?.navigateToSection(sectionId);
                
                // Atualizar informações da empresa se necessário
                if (updateCompanyInfo) {
                    this.updateCompanyInfo();
                }
                
                // Atualizar breadcrumbs
                this.updateBreadcrumbs();
                
                // Emitir evento
                this.eventBus?.emit('SECTION_CHANGED', {
                    currentSection: sectionId,
                    previousSection: this.navigationState.previousSection,
                    timestamp: Date.now()
                });
                
                console.log(`✅ Navegação para ${sectionId} concluída`);
            }
            
            // Limpar flag de transição
            this.navigationState.transitionInProgress = false;
            
            return success;
            
        } catch (error) {
            console.error('❌ Erro na navegação:', error);
            this.navigationState.transitionInProgress = false;
            return false;
        }
    }

    /**
     * Mostra seção específica com transição
     * @private
     * @param {string} sectionId - ID da seção
     * @param {boolean} animate - Se deve animar a transição
     * @returns {Promise<boolean>} True se bem-sucedida
     */
    async showSection(sectionId, animate = true) {
        try {
            // Verificar se seção existe
            const targetSection = document.getElementById(sectionId);
            if (!targetSection) {
                console.error(`❌ Seção não encontrada: ${sectionId}`);
                return false;
            }
            
            // Esconder todas as seções
            const allSections = document.querySelectorAll('.section');
            
            if (animate) {
                // Animação de saída
                allSections.forEach(section => {
                    if (section.classList.contains('active')) {
                        section.style.opacity = '0';
                        setTimeout(() => {
                            section.classList.remove('active');
                            section.classList.add('hidden');
                        }, this.config.transitions.duration / 2);
                    }
                });
                
                // Aguardar animação de saída
                await this.delay(this.config.transitions.duration / 2);
            } else {
                allSections.forEach(section => {
                    section.classList.remove('active');
                    section.classList.add('hidden');
                });
            }
            
            // Mostrar seção alvo
            targetSection.classList.remove('hidden');
            targetSection.classList.add('active');
            targetSection.style.display = 'block';
            
            if (animate) {
                // Animação de entrada
                targetSection.style.opacity = '0';
                requestAnimationFrame(() => {
                    targetSection.style.transition = `opacity ${this.config.transitions.duration}ms ${this.config.transitions.easing}`;
                    targetSection.style.opacity = '1';
                });
                
                // Aguardar animação de entrada
                await this.delay(this.config.transitions.duration);
                
                // Limpar estilos de transição
                targetSection.style.transition = '';
            }
            
            // Atualizar botões de navegação
            this.updateNavigationButtons(sectionId);
            
            // Debug: verificar conteúdo da seção
            this.debugSectionContent(sectionId);
            
            return true;
            
        } catch (error) {
            console.error('❌ Erro ao mostrar seção:', error);
            return false;
        }
    }

    /**
     * Atualiza estado dos botões de navegação
     * @private
     * @param {string} activeSectionId - ID da seção ativa
     */
    updateNavigationButtons(activeSectionId) {
        try {
            const navButtons = document.querySelectorAll('.nav-btn, [data-section]');
            
            navButtons.forEach(btn => {
                btn.classList.remove('active', 'current');
                
                const btnSection = btn.getAttribute('data-section');
                if (btnSection === activeSectionId) {
                    btn.classList.add('active', 'current');
                }
            });
        } catch (error) {
            console.error('❌ Erro ao atualizar botões de navegação:', error);
        }
    }

    /**
     * Atualiza informações da empresa nas seções
     * @public
     */
    updateCompanyInfo() {
        try {
            // Tentar StateManager primeiro (período único)
            let spedData = this.stateManager?.getSpedData();
            let isMultiPeriod = false;
            
            // Se não encontrou no StateManager, tentar no PeriodsManager (múltiplos períodos)
            if (!spedData || !spedData.dadosEmpresa) {
                const periodsState = this.stateManager?.getPeriodsState();
                if (periodsState && periodsState.periods && periodsState.periods.length > 0) {
                    isMultiPeriod = true;
                    // Usar dados da empresa consolidados
                    spedData = {
                        dadosEmpresa: periodsState.currentCompany || periodsState.periods[0].dados.dadosEmpresa,
                        periodoApuracao: `${periodsState.totalPeriods} período(s)`
                    };
                    console.log('📅 Usando dados do PeriodsManager para atualização da empresa');
                }
            }
            
            if (!spedData || !spedData.dadosEmpresa) {
                console.log('📍 Dados SPED não disponíveis para atualização da empresa');
                return;
            }
            
            // Elementos de UF da empresa
            const companyUfElements = document.querySelectorAll('#company-uf, .company-uf');
            companyUfElements.forEach(element => {
                if (element) {
                    element.textContent = spedData.dadosEmpresa.uf || '-';
                }
            });
            
            // Elementos de nome da empresa
            const companyNameElements = document.querySelectorAll('#company-name, .company-name');
            companyNameElements.forEach(element => {
                if (element) {
                    const name = spedData.dadosEmpresa.razaoSocial || '-';
                    element.textContent = this.truncateText(name, 40);
                    element.title = name; // Tooltip com nome completo
                }
            });
            
            // Elementos de CNPJ da empresa
            const companyCnpjElements = document.querySelectorAll('#company-cnpj, .company-cnpj');
            companyCnpjElements.forEach(element => {
                if (element) {
                    const cnpj = spedData.dadosEmpresa.cnpj;
                    element.textContent = cnpj ? this.formatCNPJ(cnpj) : '-';
                }
            });
            
            // Elementos de período
            const periodElements = document.querySelectorAll('#company-period, .company-period');
            periodElements.forEach(element => {
                if (element) {
                    element.textContent = spedData.periodoApuracao || '-';
                }
            });
            
            console.log('✅ Informações da empresa atualizadas');
            
        } catch (error) {
            console.error('❌ Erro ao atualizar informações da empresa:', error);
        }
    }

    // ========== GERENCIAMENTO DE HISTÓRICO ==========

    /**
     * Adiciona navegação ao histórico
     * @private
     * @param {string} fromSection - Seção de origem
     * @param {string} toSection - Seção de destino
     */
    addToHistory(fromSection, toSection) {
        this.navigationState.history.push({
            from: fromSection,
            to: toSection,
            timestamp: Date.now()
        });
        
        // Limitar tamanho do histórico
        if (this.navigationState.history.length > this.navigationState.maxHistorySize) {
            this.navigationState.history.shift();
        }
    }

    /**
     * Navega para seção anterior no histórico
     * @public
     * @returns {boolean} True se navegação foi possível
     */
    navigateBack() {
        if (this.navigationState.history.length === 0) {
            console.log('📍 Histórico de navegação vazio');
            return false;
        }
        
        const lastEntry = this.navigationState.history[this.navigationState.history.length - 1];
        return this.navigateToSection(lastEntry.from, { updateHistory: false });
    }

    // ========== BREADCRUMBS ==========

    /**
     * Atualiza breadcrumbs de navegação
     * @private
     */
    updateBreadcrumbs() {
        if (!this.config.breadcrumbs.enabled) return;
        
        try {
            const breadcrumbContainer = document.querySelector('.breadcrumb, #navigation-breadcrumb');
            if (!breadcrumbContainer) return;
            
            const sectionNames = this.getSectionNames();
            const currentSectionName = sectionNames[this.navigationState.currentSection] || this.navigationState.currentSection;
            
            breadcrumbContainer.innerHTML = `
                <span class="breadcrumb-item">Sistema DIFAL</span>
                <span class="breadcrumb-separator">›</span>
                <span class="breadcrumb-item active">${currentSectionName}</span>
            `;
        } catch (error) {
            console.error('❌ Erro ao atualizar breadcrumbs:', error);
        }
    }

    /**
     * Obtém nomes amigáveis das seções
     * @private
     * @returns {Object} Mapeamento de IDs para nomes
     */
    getSectionNames() {
        return {
            'upload-section': 'Upload de Arquivo',
            'analysis-section': 'Análise dos Dados',
            'calculation-section': 'Configuração de Cálculo',
            'results-section': 'Resultados',
            'reports-section': 'Relatórios'
        };
    }

    // ========== EVENT HANDLERS ==========

    /**
     * Manipula clique em botão de navegação
     * @private
     * @param {Event} event - Evento de clique
     */
    handleNavButtonClick(event) {
        event.preventDefault();
        
        const button = event.currentTarget;
        const sectionId = button.getAttribute('data-section');
        
        if (!sectionId) {
            console.warn('⚠️ Botão de navegação sem data-section');
            return;
        }
        
        this.navigateToSection(sectionId);
    }

    /**
     * Manipula requisição de mudança de seção via EventBus
     * @private
     * @param {Object} data - Dados da requisição
     */
    handleSectionChangeRequest(data) {
        const { section, options = {} } = data;
        this.navigateToSection(section, options);
    }

    /**
     * Manipula carregamento de dados
     * @private
     */
    onDataLoaded() {
        // Navegar automaticamente para análise após carregamento
        setTimeout(() => {
            this.navigateToSection('analysis-section');
        }, 500);
    }

    /**
     * Manipula conclusão de cálculo
     * @private
     */
    onCalculationCompleted() {
        // Manter na seção atual para análise dos resultados
        this.updateCompanyInfo();
    }

    // ========== VALIDAÇÃO E UTILITÁRIOS ==========

    /**
     * Valida se navegação para seção é permitida
     * @private
     * @param {string} sectionId - ID da seção
     * @returns {boolean} True se navegação é válida
     */
    validateSectionNavigation(sectionId) {
        const activeMode = this.navigationState.activeMode;
        const validSections = activeMode === 'single' ? 
            this.config.singleSections : 
            this.config.multiSections;
        
        // Verificar se seção existe no modo ativo
        if (!validSections.includes(sectionId)) {
            console.warn(`⚠️ Seção não registrada para modo ${activeMode}: ${sectionId}`);
            return false;
        }
        
        // Debug: log validation attempts
        console.log(`🧭 Validando navegação para: ${sectionId} (modo: ${activeMode})`);
        
        // Validações específicas por seção - MODO PERMISSIVO
        switch (sectionId) {
            case 'analysis-section':
                const hasData = this.hasSpedData();
                console.log(`📊 Analysis section - hasSpedData: ${hasData}`);
                // PERMISSIVO: Permitir acesso mesmo sem dados para debug
                if (!hasData) {
                    console.log('⚠️ Permitindo acesso à Analysis sem dados SPED (modo debug)');
                }
                return true; // Sempre permitir para debug
            case 'calculation-section':
                const hasSpedAndItems = this.hasSpedData() && this.hasDifalItems();
                console.log(`🧮 Calculation section - hasSpedData && hasDifalItems: ${hasSpedAndItems}`);
                // PERMISSIVO: Permitir acesso mesmo sem dados para debug
                if (!hasSpedAndItems) {
                    console.log('⚠️ Permitindo acesso ao Calculation sem dados completos (modo debug)');
                }
                return true; // Sempre permitir para debug
            case 'results-section':
                return this.hasCalculationResults();
            case 'reports-section':
                return this.hasCalculationResults();
            default:
                return true;
        }
    }

    /**
     * Verifica se há dados SPED carregados
     * @private
     * @returns {boolean}
     */
    hasSpedData() {
        // Tentar StateManager primeiro (período único)
        const spedData = this.stateManager?.getSpedData();
        if (spedData && spedData.dadosEmpresa) {
            return true;
        }
        
        // Tentar PeriodsManager (múltiplos períodos)
        const periodsState = this.stateManager?.getPeriodsState();
        if (periodsState && periodsState.periods && periodsState.periods.length > 0) {
            const firstPeriod = periodsState.periods[0];
            return !!(firstPeriod.dados && firstPeriod.dados.itensDifal);
        }
        
        return false;
    }

    /**
     * Verifica se há itens DIFAL
     * @private
     * @returns {boolean}
     */
    hasDifalItems() {
        // Tentar StateManager primeiro (período único)
        const spedData = this.stateManager?.getSpedData();
        if (spedData && spedData.itensDifal && spedData.itensDifal.length > 0) {
            return true;
        }
        
        // Tentar PeriodsManager (múltiplos períodos)
        const periodsState = this.stateManager?.getPeriodsState();
        if (periodsState && periodsState.periods && periodsState.periods.length > 0) {
            const firstPeriod = periodsState.periods[0];
            return !!(firstPeriod.dados && firstPeriod.dados.itensDifal && firstPeriod.dados.itensDifal.length > 0);
        }
        
        return false;
    }

    /**
     * Verifica se há resultados de cálculo
     * @private
     * @returns {boolean}
     */
    hasCalculationResults() {
        const calculationState = this.stateManager?.getState('calculation');
        return !!(calculationState && calculationState.completed && calculationState.results);
    }

    /**
     * Sincroniza com mudanças do StateManager
     * @private
     * @param {string} newSection - Nova seção
     */
    syncWithStateManager(newSection) {
        if (newSection !== this.navigationState.currentSection) {
            this.showSection(newSection, false);
            this.navigationState.currentSection = newSection;
            this.updateNavigationButtons(newSection);
        }
    }

    /**
     * Debug: verifica conteúdo da seção
     * @private
     * @param {string} sectionId - ID da seção
     */
    debugSectionContent(sectionId) {
        if (sectionId === 'analysis-section') {
            const summaryDiv = document.getElementById('sped-summary');
            if (summaryDiv) {
                console.log(`📊 Analysis section - summary content: ${summaryDiv.innerHTML.length} chars`);
            }
        }
    }

    // ========== MÉTODOS UTILITÁRIOS ==========

    /**
     * Trunca texto longo
     * @private
     * @param {string} text - Texto original
     * @param {number} maxLength - Comprimento máximo
     * @returns {string} Texto truncado
     */
    truncateText(text, maxLength = 50) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * Formata CNPJ
     * @private
     * @param {string} cnpj - CNPJ sem formatação
     * @returns {string} CNPJ formatado
     */
    formatCNPJ(cnpj) {
        if (!cnpj) return 'N/A';
        
        const cleaned = String(cnpj).replace(/\D/g, '');
        if (cleaned.length !== 14) return cnpj;
        
        return cleaned.replace(
            /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
            '$1.$2.$3/$4-$5'
        );
    }

    /**
     * Delay helper para animações
     * @private
     * @param {number} ms - Milissegundos para aguardar
     * @returns {Promise}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ========== MÉTODOS PÚBLICOS DE STATUS ==========

    /**
     * Obtém estado atual da navegação
     * @public
     * @returns {Object} Estado atual
     */
    getNavigationState() {
        return {
            ...this.navigationState,
            isTransitioning: this.navigationState.transitionInProgress
        };
    }

    /**
     * Obtém histórico de navegação
     * @public
     * @returns {Array} Histórico de navegação
     */
    getNavigationHistory() {
        return [...this.navigationState.history];
    }

    /**
     * Limpa histórico de navegação
     * @public
     */
    clearNavigationHistory() {
        this.navigationState.history = [];
        console.log('🗑️ Histórico de navegação limpo');
    }

    /**
     * Redefine navegação para estado inicial
     * @public
     */
    resetNavigation() {
        // Determinar seção inicial baseada no modo
        const activeMode = this.modeManager?.getActiveMode() || 'single';
        const initialSection = activeMode === 'single' ? 
            'single-upload-section' : 
            'multi-upload-section';
            
        this.clearNavigationHistory();
        this.navigationState.currentSection = initialSection;
        this.navigationState.activeMode = activeMode;
        
        this.navigateToSection(initialSection, { updateHistory: false });
        console.log('🔄 Navegação redefinida');
    }
}

// ========== EXPORTAÇÃO DO MÓDULO ==========

// Registrar globalmente
if (typeof window !== 'undefined') {
    window.NavigationManager = NavigationManager;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationManager;
}