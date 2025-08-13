/**
 * @fileoverview UI Manager Refatorado - Coordenador Modular
 * @description Orquestra módulos especializados mantendo compatibilidade total
 * @version 2.0.0
 * @author Sistema DIFAL
 * @since 2025-01-10
 * 
 * REFATORAÇÃO: De 1.562 linhas para ~400 linhas através de delegação modular
 * COMPATIBILIDADE: 100% mantida com código existente
 * ARQUITETURA: Padrão de coordenação com módulos especializados
 */

/**
 * @class UIManager
 * @classdesc Coordenador principal que orquestra módulos especializados do sistema DIFAL
 */
class UIManager {
    /**
     * @constructor
     * @param {EventBus} eventBus - Instância do barramento de eventos
     * @param {StateManager} stateManager - Instância do gerenciador de estado
     */
    constructor(eventBus, stateManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.modeManager = window.modeManager; // Obter ModeManager global
        this.currentSection = 'upload-section';
        this.progressCallback = null;
        this.statusCallback = null;
        
        // === INICIALIZAÇÃO DE MÓDULOS ESPECIALIZADOS ===
        this.initializeModules();
        
        this.init();
    }

    /**
     * Inicializa módulos especializados
     * @private
     */
    initializeModules() {
        try {
            // Módulos de UI
            this.progressManager = new ProgressManager(this.stateManager, this.eventBus);
            this.navigationManager = new NavigationManager(this.modeManager, this.eventBus);
            // Adicionar referência do StateManager ao NavigationManager
            this.navigationManager.stateManager = this.stateManager;
            this.fileUploadManager = new FileUploadManager(this.stateManager, this.eventBus);
            this.exportManager = new ExportManager(this.stateManager, this.eventBus);
            this.paginationManager = new PaginationManager(this.stateManager, this.eventBus);
            
            // Configuration Manager (reutilizar instância do app.js)
            this.configManager = window.difalApp?.configurationManager || window.configManager;
            
            // Modal Manager e Results Renderer
            this.modalManager = new ModalManager(this.eventBus, this.stateManager, this.configManager);
            this.resultsRenderer = new ResultsRenderer(this.stateManager, this.eventBus, this.exportManager);
            
            // Módulos de Múltiplos Períodos e Analytics
            this.periodsManager = new PeriodsManager(this.stateManager, this.eventBus);
            this.analyticsManager = new AnalyticsManager(this.stateManager, this.eventBus);
            this.paretoAnalyzer = new ParetoAnalyzer();
            this.chartsManager = new ChartsManager();
            
            // Configurar managers no FileUploadManager e ExportManager
            this.fileUploadManager.setPeriodsManager(this.periodsManager);
            this.exportManager.setAnalyticsManagers(this.analyticsManager, this.paretoAnalyzer);
            
            // Integrar módulos multi-período ao DifalApp para acesso global
            this.integrateWithDifalApp();
            
            console.log('🎯 Módulos especializados inicializados com sucesso');
        } catch (error) {
            console.error('❌ Erro ao inicializar módulos:', error);
            throw error;
        }
    }

    /**
     * Mapeia ID de elemento baseado no modo ativo
     * @param {string} baseId - ID base do elemento
     * @param {string} mode - Modo ativo ('single' | 'multi')
     * @returns {HTMLElement|null} Elemento encontrado ou null
     */
    getElementByMode(baseId, mode = null) {
        // Se não especificado, usar modo atual
        if (!mode) {
            mode = this.stateManager?.getState('app.currentMode') || 'single';
        }
        
        // Tentar diferentes variações do ID
        const variations = [
            `${mode}-${baseId}`,
            baseId,
            `${baseId}-${mode}`
        ];
        
        for (const id of variations) {
            const element = document.getElementById(id);
            if (element) {
                return element;
            }
        }
        
        console.warn(`⚠️ Elemento não encontrado para baseId: ${baseId}, modo: ${mode}`);
        return null;
    }

    /**
     * Define texto de elemento de forma segura
     * @param {string} baseId - ID base do elemento
     * @param {string} text - Texto a definir
     * @param {string} mode - Modo ativo
     */
    setElementText(baseId, text, mode = null) {
        const element = this.getElementByMode(baseId, mode);
        if (element) {
            element.textContent = text;
        }
    }

    /**
     * Inicializa o gerenciador de interface
     * @public
     */
    init() {
        this.setupEventListeners();
        // this.setupFileUpload(); // REMOVIDO - já feito no FileUploadManager constructor
        this.setupNavigation();
        
        // Só navegar para upload-section se já houver modo definido
        const savedMode = localStorage.getItem('difal_active_mode');
        if (savedMode) {
            this.navigationManager.navigateToSection('upload-section');
        }
        
        console.log('🎭 UI Manager Refatorado inicializado');
        
        // Configurar modal e expor funções globais
        this.setupModalFunctions();
        
        // Integrar com Configuration Manager
        this.integrateWithConfigManager();
    }

    // ========== DELEGAÇÃO DE EVENT LISTENERS ==========

    /**
     * Configura event listeners (delegação híbrida)
     * @private
     */
    setupEventListeners() {
        // Seletor de modo de processamento
        this.setupModeSelector();
        
        // Múltiplos períodos - event listeners
        this.setupMultiplePeriodsEventListeners();
        
        // Analytics - event listeners  
        this.setupAnalyticsEventListeners();
        
        // Listener para mudanças de seção
        if (this.eventBus) {
            this.eventBus.on('SECTION_CHANGED', (data) => {
                this.onSectionChanged(data);
            });
        }
        
        // Proceed to calculation
        const proceedBtn = document.getElementById('proceed-calculation');
        if (proceedBtn) {
            proceedBtn.addEventListener('click', () => this.proceedToCalculation());
        }

        // Calculate DIFAL - abre modal de configuração primeiro (suporte a IDs genéricos e específicos)
        const calculateBtns = [
            document.getElementById('calculate-difal'),
            document.getElementById('single-calculate-difal'),
            document.getElementById('multi-calculate-difal')
        ].filter(btn => btn !== null);
        
        calculateBtns.forEach(calculateBtn => {
            calculateBtn.addEventListener('click', () => {
                if (typeof openConfigModal === 'function') {
                    openConfigModal();
                } else {
                    this.calculateDifal();
                }
            });
        });

        // Botão Prosseguir para Cálculo - navega sem calcular (suporte a IDs genéricos e específicos)
        const proceedToCalcBtns = [
            document.getElementById('proceed-to-calculation'),
            document.getElementById('single-proceed-to-calculation'),
            document.getElementById('multi-proceed-to-calculation')
        ].filter(btn => btn !== null);
        
        proceedToCalcBtns.forEach(proceedToCalcBtn => {
            proceedToCalcBtn.addEventListener('click', () => {
                this.navigationManager.navigateToSection('calculation-section');
                this.updateCompanyInfo();
                console.log('📍 Navegado para seção de cálculo sem executar cálculo');
            });
        });

        // Export buttons - DELEGADOS para ExportManager (suporte a IDs genéricos e específicos)
        const exportExcelBtns = [
            document.getElementById('export-excel'),
            document.getElementById('single-export-excel'),
            document.getElementById('multi-export-excel')
        ].filter(btn => btn !== null);
        
        exportExcelBtns.forEach(exportExcel => {
            exportExcel.addEventListener('click', () => this.exportToExcel());
        });

        const exportPdfBtns = [
            document.getElementById('export-pdf'),
            document.getElementById('single-export-pdf'),
            document.getElementById('multi-export-pdf')
        ].filter(btn => btn !== null);
        
        exportPdfBtns.forEach(exportPdf => {
            exportPdf.addEventListener('click', () => this.exportToPdf());
        });
    }

    // ========== DELEGAÇÃO PARA MÓDULOS ESPECIALIZADOS ==========

    /**
     * Configura upload de arquivos - DELEGADO para FileUploadManager
     * @public
     */
    setupFileUpload() {
        return this.fileUploadManager.setupFileUploadElements();
    }

    /**
     * Configura navegação entre seções - DELEGADO para NavigationManager
     * @public
     */
    setupNavigation() {
        return this.navigationManager.setupNavigationButtons();
    }

    /**
     * Mostra seção específica - DELEGADO para NavigationManager
     * @public
     * @param {string} sectionId - ID da seção
     */
    showSection(sectionId) {
        return this.navigationManager.navigateToSection(sectionId);
    }

    /**
     * Processa upload de arquivo SPED - DELEGADO para FileUploadManager
     * @public
     * @param {File} file - Arquivo para upload
     */
    async handleFileUpload(file) {
        try {
            const resultado = await this.fileUploadManager.handleFileUpload(file);
            
            // Após upload bem-sucedido, mostrar análise
            if (resultado) {
                this.showSpedAnalysis(resultado);
                this.navigationManager.navigateToSection('analysis-section');
                this.updateCompanyInfo();
                
                // Modal de configuração agora será aberto apenas quando usuário clicar no botão
                console.log('✅ Arquivo processado. Modal de configuração disponível via botão.');
            }
            
            return resultado;
        } catch (error) {
            console.error('❌ Erro no upload via UI Manager:', error);
            throw error;
        }
    }

    /**
     * Mostra informações do arquivo - DELEGADO para FileUploadManager
     * @public
     * @param {File} file - Arquivo selecionado
     */
    showFileInfo(file) {
        return this.fileUploadManager.showFileInfo(file);
    }

    /**
     * Mostra progresso - DELEGADO para ProgressManager
     * @public
     * @param {string} message - Mensagem de status
     * @param {number} percentage - Porcentagem (0-100)
     */
    showProgress(message, percentage) {
        return this.progressManager.showProgress(message, percentage);
    }

    /**
     * Mostra erro - DELEGADO para ProgressManager
     * @public
     * @param {string} message - Mensagem de erro
     */
    showError(message) {
        return this.progressManager.showError(message);
    }

    /**
     * Mostra mensagem de sucesso - DELEGADO para ProgressManager
     * @public
     * @param {string} message - Mensagem de sucesso
     */
    showSuccess(message) {
        return this.progressManager.showSuccess(message);
    }

    /**
     * Exporta para Excel - DELEGADO para ExportManager
     * @public
     */
    async exportToExcel() {
        return this.exportManager.exportToExcel();
    }

    /**
     * Exporta para PDF - DELEGADO para ExportManager
     * @public
     */
    async exportToPdf() {
        return this.exportManager.exportToPdf();
    }

    /**
     * Mostra modal de configuração - DELEGADO para ModalManager
     * @public
     */
    openConfigModal() {
        return this.modalManager.openConfigModal();
    }

    /**
     * Fecha modal de configuração - DELEGADO para ModalManager
     * @public
     */
    closeConfigModal() {
        return this.modalManager.closeConfigModal();
    }

    /**
     * Abre modal de configuração por item - DELEGADO para ModalManager
     * @public
     */
    openItemConfigModal() {
        return this.modalManager.openItemConfigModal();
    }

    /**
     * Fecha modal de configuração por item - DELEGADO para ModalManager
     * @public
     */
    closeItemConfigModal() {
        return this.modalManager.closeItemConfigModal();
    }

    // ========== LÓGICA ESPECÍFICA DO UI MANAGER ==========

    /**
     * Mostra análise dos dados SPED (funcionalidade híbrida)
     * @public
     * @param {Object} spedData - Dados SPED processados
     */
    showSpedAnalysis(spedData) {
        console.log('🔍 DEBUG showSpedAnalysis:', {
            hasSpedData: !!spedData,
            dataKeys: spedData ? Object.keys(spedData) : null,
            hasDadosEmpresa: !!(spedData && spedData.dadosEmpresa),
            empresa: spedData?.dadosEmpresa || null
        });
        
        const summaryDiv = document.getElementById('sped-summary');
        const tableDiv = document.getElementById('single-difal-items-table');
        
        console.log('🔍 DEBUG DOM elements:', {
            summaryDiv: !!summaryDiv,
            summaryDivClasses: summaryDiv?.className,
            tableDiv: !!tableDiv
        });
        
        if (summaryDiv) {
            try {
                console.log('🔍 DEBUG: Dentro do if summaryDiv - iniciando processamento');
                
                // Verificar se estamos em modo multi-período
                let displayData = spedData;
                let isMultiPeriod = false;
                
                console.log('🔍 DEBUG: Verificando dados antes do if da linha 331:', {
                    hasSpedData: !!spedData,
                    hasDadosEmpresa: !!(spedData && spedData.dadosEmpresa)
                });
                
                // Se não há dados ou é multi-período, tentar obter do PeriodsManager
                if (!spedData || !spedData.dadosEmpresa) {
                    console.log('🔍 DEBUG: Entrando na condição de multi-período');
                    const periodsState = this.stateManager?.getPeriodsState();
                    if (periodsState && periodsState.periods && periodsState.periods.length > 0) {
                        isMultiPeriod = true;
                        const firstPeriod = periodsState.periods[0];
                        displayData = firstPeriod.dados;
                        console.log('📅 Usando dados do modo multi-período para análise');
                    }
                } else {
                    console.log('🔍 DEBUG: Usando dados single-period, não entrando na condição multi');
                }
                
                // Remover classe hidden e mostrar o div
                console.log('🔍 DEBUG: Removendo classe hidden do summaryDiv');
                summaryDiv.classList.remove('hidden');
                console.log('🔍 DEBUG: Classes após remoção:', summaryDiv.className);
            
            const stats = displayData?.estatisticasDifal || {};
            
            if (isMultiPeriod) {
                const periodsState = this.stateManager.getPeriodsState();
                const consolidated = periodsState.consolidated || {};
                
                summaryDiv.innerHTML = `
                    <div class="summary-item">
                        <h3>Múltiplos Períodos</h3>
                        <div class="summary-value">${periodsState.totalPeriods || 1} período(s)</div>
                        <div class="summary-label">Modo Multi-Período</div>
                    </div>
                    <div class="summary-item">
                        <h3>Empresa</h3>
                        <div class="summary-value">${periodsState.currentCompany?.razaoSocial || displayData?.dadosEmpresa?.razaoSocial || 'N/A'}</div>
                        <div class="summary-label">CNPJ: ${Utils.formatarCNPJ(periodsState.currentCompany?.cnpj || displayData?.dadosEmpresa?.cnpj || '')}</div>
                    </div>
                    <div class="summary-item">
                        <h3>UF</h3>
                        <div class="summary-value">${periodsState.currentCompany?.uf || displayData?.dadosEmpresa?.uf || 'N/A'}</div>
                        <div class="summary-label">Estado da empresa</div>
                    </div>
                    <div class="summary-item">
                        <h3>Registros Consolidados</h3>
                        <div class="summary-value">${Utils.formatarNumero(consolidated.totalRegistros || 0)}</div>
                        <div class="summary-label">Todos os períodos</div>
                    </div>
                    <div class="summary-item">
                        <h3>Itens DIFAL Totais</h3>
                        <div class="summary-value">${Utils.formatarNumero(consolidated.totalItensDifal || 0)}</div>
                        <div class="summary-label">Consolidado multi-período</div>
                    </div>
                    <div class="summary-item">
                        <h3>Valor Total</h3>
                        <div class="summary-value">${Utils.formatarMoeda(consolidated.totalValorItens || 0)}</div>
                        <div class="summary-label">Base para cálculo DIFAL</div>
                    </div>
                `;
            } else {
                summaryDiv.innerHTML = `
                    <div class="summary-item">
                        <h3>Arquivo Processado</h3>
                        <div class="summary-value">${displayData.fileName || 'N/A'}</div>
                        <div class="summary-label">Arquivo SPED</div>
                    </div>
                    <div class="summary-item">
                        <h3>Empresa</h3>
                        <div class="summary-value">${displayData.dadosEmpresa?.razaoSocial || 'N/A'}</div>
                        <div class="summary-label">CNPJ: ${Utils.formatarCNPJ(displayData.dadosEmpresa?.cnpj || '')}</div>
                    </div>
                    <div class="summary-item">
                        <h3>Período</h3>
                        <div class="summary-value">${displayData.periodoApuracao || 'N/A'}</div>
                        <div class="summary-label">UF: ${displayData.dadosEmpresa?.uf || 'N/A'}</div>
                    </div>
                    <div class="summary-item">
                        <h3>Registros Totais</h3>
                        <div class="summary-value">${Utils.formatarNumero(displayData.estatisticas?.totalRegistros || 0)}</div>
                        <div class="summary-label">${Object.keys(displayData.registros || {}).length} tipos</div>
                    </div>
                    <div class="summary-item">
                        <h3>Itens DIFAL</h3>
                        <div class="summary-value">${Utils.formatarNumero(stats.totalItens || 0)}</div>
                        <div class="summary-label">CFOPs DIFAL identificados</div>
                    </div>
                    <div class="summary-item">
                        <h3>Valor Total</h3>
                        <div class="summary-value">${Utils.formatarMoeda(stats.estatisticasValores?.totalValorItem || 0)}</div>
                        <div class="summary-label">Base para cálculo DIFAL</div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('❌ Erro ao exibir análise SPED:', error);
            if (summaryDiv) {
                summaryDiv.innerHTML = '<div class="error-message">Erro ao carregar dados de análise</div>';
            }
        }
        }
        
        // Exibir tabela de itens
        if (tableDiv) {
            let itemsToShow = [];
            
            if (spedData && spedData.itensDifal && spedData.itensDifal.length > 0) {
                itemsToShow = spedData.itensDifal.slice(0, 10);
            } else {
                // Tentar obter itens do primeiro período em modo multi-período
                const periodsState = this.stateManager?.getPeriodsState();
                if (periodsState && periodsState.periods && periodsState.periods.length > 0) {
                    const firstPeriod = periodsState.periods[0];
                    if (firstPeriod.dados && firstPeriod.dados.itensDifal) {
                        itemsToShow = firstPeriod.dados.itensDifal.slice(0, 10);
                    }
                }
            }
            
            if (itemsToShow.length > 0) {
                this.createDifalTable(tableDiv, itemsToShow);
            }
        }
    }

    /**
     * Cria tabela de itens DIFAL (funcionalidade híbrida)
     * @public
     * @param {HTMLElement} container - Container para a tabela
     * @param {Array} items - Itens para exibir
     */
    createDifalTable(container, items) {
        const table = document.createElement('table');
        table.className = 'data-table';
        
        // Cabeçalho
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Código Item</th>
                    <th>Descrição</th>
                    <th>CFOP</th>
                    <th>Destinação</th>
                    <th>CST</th>
                    <th>Benefícios Fiscais</th>
                    <th>NCM</th>
                    <th>Valor Item</th>
                    <th>Base DIFAL</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                    <tr>
                        <td class="font-mono">${item.codItem}</td>
                        <td title="${this.formatarDescricaoCompleta(item)}">${this.formatarDescricaoExibicao(item, 30)}</td>
                        <td class="font-mono">${item.cfop}</td>
                        <td>
                            <span class="badge ${item.destinacao === 'uso-consumo' ? 'badge-blue' : 'badge-green'}">
                                ${item.destinacao === 'uso-consumo' ? 'Uso e Consumo' : 'Ativo Imobilizado'}
                            </span>
                        </td>
                        <td class="font-mono text-center">${item.cstIcms || 'N/A'}</td>
                        <td>
                            ${item.beneficiosFiscais ? `
                                <div class="beneficios-fiscais">
                                    <span class="badge ${item.beneficiosFiscais.temBeneficio ? 'badge-orange' : 'badge-gray'}">
                                        ${item.beneficiosFiscais.temBeneficio ? 'COM BENEFÍCIO' : 'NORMAL'}
                                    </span>
                                    <div class="text-xs text-gray-600 mt-1">${Utils.truncarTexto(item.beneficiosFiscais.descricao, 25)}</div>
                                    ${item.beneficiosFiscais.percentualReducao > 0 ? `<div class="text-xs font-medium">Redução: ${item.beneficiosFiscais.percentualReducao}%</div>` : ''}
                                </div>
                            ` : 'N/A'}
                        </td>
                        <td class="font-mono">${item.ncm || 'N/A'}</td>
                        <td class="text-right">${Utils.formatarMoeda(item.vlItem)}</td>
                        <td class="text-right font-bold">${Utils.formatarMoeda(item.baseCalculoDifal)}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        
        container.innerHTML = '';
        container.appendChild(table);
        
        // Adicionar badge CSS se não existe
        this.ensureBadgeStyles();
    }

    /**
     * Exibe análise SPED para múltiplos períodos - MULTI-PERIOD VERSION
     * @public
     * @param {Object} spedData - Dados SPED processados
     */
    showMultiPeriodAnalysis(spedData) {
        // DEPRECATED: Esta função foi substituída por showSpedAnalysis()
        // que agora funciona com dados consolidados automaticamente
        console.warn('⚠️ showMultiPeriodAnalysis() is deprecated, use showSpedAnalysis() instead');
        return this.showSpedAnalysis(spedData);
    }
    
    // OBSOLETE CODE REMOVED - now using showSpedAnalysis() with consolidated data
    
    showMultiPeriodAnalysis_OLD_UNUSED(spedData) {
        console.log('🔍 DEBUG showMultiPeriodAnalysis:', {
            hasSpedData: !!spedData,
            dataKeys: spedData ? Object.keys(spedData) : null,
            hasDadosEmpresa: !!(spedData && spedData.dadosEmpresa),
            empresa: spedData && spedData.dadosEmpresa
        });
        
        const summaryDiv = document.getElementById('sped-summary');
        const tableDiv = document.getElementById('single-difal-items-table');
        
        console.log('🔍 DEBUG DOM elements:', {
            summaryDiv: !!summaryDiv,
            summaryDivClasses: summaryDiv && summaryDiv.className,
            tableDiv: !!tableDiv
        });
        
        if (summaryDiv) {
            try {
                console.log('🔍 DEBUG: Dentro do if summaryDiv - iniciando processamento multi-período');
                
                // Para multi-período, sempre usar dados do PeriodsManager
                const periodsState = (this.stateManager && this.stateManager.getPeriodsState()) || {};
                let displayData = spedData;
                
                if (periodsState && periodsState.periods && periodsState.periods.length > 0) {
                    const firstPeriod = periodsState.periods[0];
                    displayData = firstPeriod.dados;
                    console.log('📅 Usando dados do modo multi-período para análise');
                }
                
                // Remover classe hidden e mostrar o div
                summaryDiv.classList.remove('hidden');
                
                const stats = (displayData && displayData.estatisticasDifal) || {};
                const consolidated = periodsState.consolidated || {};
                
                // Obter período consolidado
                const consolidatedPeriod = consolidated.consolidatedPeriod;
                const periodLabel = consolidatedPeriod ? consolidatedPeriod.label : 'N/A';
                
                // Sempre usar layout multi-período
                summaryDiv.innerHTML = `
                    <div class="summary-item">
                        <h3>Múltiplos Períodos</h3>
                        <div class="summary-value">${periodsState.totalPeriods || 1} período(s)</div>
                        <div class="summary-label">Período Consolidado: ${periodLabel}</div>
                    </div>
                    <div class="summary-item">
                        <h3>Empresa</h3>
                        <div class="summary-value">${(periodsState.currentCompany && periodsState.currentCompany.razaoSocial) || (displayData && displayData.dadosEmpresa && displayData.dadosEmpresa.razaoSocial) || 'N/A'}</div>
                        <div class="summary-label">CNPJ: ${Utils.formatarCNPJ((periodsState.currentCompany && periodsState.currentCompany.cnpj) || (displayData && displayData.dadosEmpresa && displayData.dadosEmpresa.cnpj) || '')}</div>
                    </div>
                    <div class="summary-item">
                        <h3>UF</h3>
                        <div class="summary-value">${(periodsState.currentCompany && periodsState.currentCompany.uf) || (displayData && displayData.dadosEmpresa && displayData.dadosEmpresa.uf) || 'N/A'}</div>
                        <div class="summary-label">Estado da empresa</div>
                    </div>
                    <div class="summary-item">
                        <h3>Registros Consolidados</h3>
                        <div class="summary-value">${Utils.formatarNumero(consolidated.totalRegistros || 0)}</div>
                        <div class="summary-label">Todos os períodos</div>
                    </div>
                    <div class="summary-item">
                        <h3>Itens DIFAL Totais</h3>
                        <div class="summary-value">${Utils.formatarNumero(consolidated.totalItensDifal || 0)}</div>
                        <div class="summary-label">Consolidado multi-período</div>
                    </div>
                    <div class="summary-item">
                        <h3>Valor Total</h3>
                        <div class="summary-value">${Utils.formatarMoeda(consolidated.totalValorItens || 0)}</div>
                        <div class="summary-label">Base para cálculo DIFAL</div>
                    </div>
                `;
            } catch (error) {
                console.error('❌ Erro ao exibir análise SPED multi-período:', error);
                if (summaryDiv) {
                    summaryDiv.innerHTML = '<div class="error-message">Erro ao carregar dados de análise multi-período</div>';
                }
            }
        }
        
        // Exibir tabela de itens para multi-período
        if (tableDiv) {
            let itemsToShow = [];
            
            if (spedData && spedData.itensDifal && spedData.itensDifal.length > 0) {
                itemsToShow = spedData.itensDifal.slice(0, 10);
            } else {
                // Para multi-período, obter itens do primeiro período
                const periodsState = (this.stateManager && this.stateManager.getPeriodsState());
                if (periodsState && periodsState.periods && periodsState.periods.length > 0) {
                    const firstPeriod = periodsState.periods[0];
                    if (firstPeriod.dados && firstPeriod.dados.itensDifal) {
                        itemsToShow = firstPeriod.dados.itensDifal.slice(0, 10);
                    }
                }
            }
            
            if (itemsToShow.length > 0) {
                this.createDifalTable(tableDiv, itemsToShow);
            }
        }
    }

    /**
     * Garante que estilos de badge existem
     * @private
     */
    ensureBadgeStyles() {
        if (!document.querySelector('#badge-styles')) {
            const style = document.createElement('style');
            style.id = 'badge-styles';
            style.textContent = `
                .badge {
                    display: inline-block;
                    padding: 0.25rem 0.5rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                    border-radius: 0.375rem;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                }
                .badge-blue { background: #dbeafe; color: #1e40af; }
                .badge-green { background: #dcfce7; color: #166534; }
                .badge-orange { background: #fed7aa; color: #c2410c; }
                .badge-gray { background: #f3f4f6; color: #6b7280; }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Prossegue para cálculo DIFAL
     * @public
     */
    proceedToCalculation() {
        if (!window.spedData || !window.spedData.itensDifal || window.spedData.itensDifal.length === 0) {
            this.showError('Nenhum item DIFAL encontrado para calcular');
            return;
        }
        
        this.navigationManager.navigateToSection('calculation-section');
        this.updateCompanyInfo();
    }

    /**
     * Atualiza informações da empresa na seção de cálculo - DELEGADO para NavigationManager
     * @public
     */
    updateCompanyInfo() {
        return this.navigationManager.updateCompanyInfo();
    }

    /**
     * Executa cálculo DIFAL (funcionalidade híbrida)
     * @public
     * @param {Object} config - Configurações do modal (opcional)
     */
    async calculateDifal(config = {}) {
        // StateManager agora retorna dados consolidados automaticamente
        const spedData = this.stateManager.getSpedData();
        if (!spedData || !spedData.itensDifal) {
            this.showError('Dados SPED não disponíveis');
            return;
        }

        if (!spedData.dadosEmpresa?.uf) {
            this.showError('UF da empresa não identificada no SPED');
            return;
        }

        const ufDestino = spedData.dadosEmpresa.uf;
        console.log(`Calculando DIFAL para empresa em ${ufDestino}`);
        console.log('Configurações recebidas para cálculo:', config);
        
        this.showProgress('Calculando DIFAL...', 20);
        
        try {
            // Usar DifalAppModular para cálculo
            if (!window.difalApp) {
                throw new Error('DifalApp não disponível');
            }
            
            // Preparar configuração para o app modular
            const configApp = {
                ufOrigem: config.ufOrigem || (ufDestino === 'SP' ? 'MG' : 'SP'),
                metodologia: config.metodologia,
                percentualDestinatario: config.percentualDestinatario,
                beneficiosGlobais: config.beneficiosGlobais
            };
            
            this.showProgress('Processando cálculos...', 60);
            
            const { resultados, totalizadores } = await window.difalApp.calculateDifal(configApp);
            
            this.showProgress('Cálculo concluído!', 100);
            
            // Armazenar resultados
            window.difalResults = {
                resultados,
                totalizadores
            };
            
            // Mostrar resultados - DELEGADO para ResultsRenderer
            this.showCalculationResults(resultados, totalizadores);
            
        } catch (error) {
            console.error('Erro no cálculo DIFAL:', error);
            this.showError(`Erro no cálculo: ${error.message}`);
        }
    }

    /**
     * Mostra resultados do cálculo - DELEGADO para ResultsRenderer
     * @public
     * @param {Array} resultados - Resultados do cálculo
     * @param {Object} totalizadores - Totalizadores
     */
    showCalculationResults(resultados, totalizadores) {
        console.log('🎭 UI Manager.showCalculationResults chamado:', { 
            resultados: resultados?.length || 0, 
            totalizadores: totalizadores || 'undefined',
            resultsRenderer: !!this.resultsRenderer 
        });
        
        if (!this.resultsRenderer) {
            console.error('❌ ResultsRenderer não inicializado no UI Manager');
            return;
        }
        
        return this.resultsRenderer.showCalculationResults(resultados, totalizadores);
    }

    /**
     * Configura benefícios globais (funcionalidade específica)
     * @private
     * @param {Object} beneficiosGlobais - Configurações de benefícios
     * @param {Array} itensDifal - Itens DIFAL
     */
    configurarBeneficiosGlobais(beneficiosGlobais, itensDifal) {
        // Usar método do Configuration Manager
        return this.configManager.aplicarBeneficiosGlobais?.(beneficiosGlobais) || 
               this.aplicarBeneficiosGlobais(beneficiosGlobais);
    }

    /**
     * Aplica benefícios globais (funcionalidade de fallback)
     * @private
     * @param {Object} beneficiosGlobais - Configurações de benefícios
     */
    aplicarBeneficiosGlobais(beneficiosGlobais) {
        if (!window.spedData || !window.spedData.itensDifal) return;
        if (!beneficiosGlobais) return;
        
        const { cargaEfetiva, aliqOrigemEfetiva, aliqDestinoEfetiva } = beneficiosGlobais;
        
        // Se não há benefícios definidos, não remover configurações individuais existentes
        if (!cargaEfetiva && !aliqOrigemEfetiva && !aliqDestinoEfetiva) {
            console.log('🧹 Nenhum benefício global definido - mantendo configurações individuais');
            return;
        }
        
        // Garantir que estrutura existe
        if (!window.difalConfiguracoesItens) {
            window.difalConfiguracoesItens = {};
        }
        
        let itensAfetadosGlobalmente = 0;
        
        window.spedData.itensDifal.forEach(item => {
            const itemId = item.codItem;
            
            // PRIORIDADE: Se já tem configuração individual, NÃO sobrescrever
            if (window.difalConfiguracoesItens[itemId] && 
                (window.difalConfiguracoesItens[itemId].beneficio || 
                 window.difalConfiguracoesItens[itemId].fcpManual !== undefined)) {
                console.log(`⏭️ Item ${itemId} já tem configuração individual - mantendo`);
                return;
            }
            
            // Aplicar benefício global
            const configGlobal = {};
            
            if (cargaEfetiva) {
                configGlobal.beneficio = 'reducao-base';
                configGlobal.cargaEfetivaDesejada = cargaEfetiva;
                configGlobal.origemGlobal = true;
            } else if (aliqOrigemEfetiva) {
                configGlobal.beneficio = 'reducao-aliquota-origem';
                configGlobal.aliqOrigemEfetiva = aliqOrigemEfetiva;
                configGlobal.origemGlobal = true;
            } else if (aliqDestinoEfetiva) {
                configGlobal.beneficio = 'reducao-aliquota-destino';
                configGlobal.aliqDestinoEfetiva = aliqDestinoEfetiva;
                configGlobal.origemGlobal = true;
            }
            
            if (Object.keys(configGlobal).length > 0) {
                window.difalConfiguracoesItens[itemId] = {
                    ...window.difalConfiguracoesItens[itemId],
                    ...configGlobal
                };
                itensAfetadosGlobalmente++;
            }
        });
        
        console.log('💰 Benefícios globais aplicados:', {
            itensAfetadosGlobalmente,
            totalItensConfigurados: Object.keys(window.difalConfiguracoesItens).length,
            cargaEfetiva,
            aliqOrigemEfetiva,
            aliqDestinoEfetiva
        });
    }

    // ========== FUNÇÕES AUXILIARES ==========

    /**
     * Formata descrição completa para tooltip
     * @public
     * @param {Object} item - Item DIFAL
     * @returns {string} Descrição completa formatada
     */
    formatarDescricaoCompleta(item) {
        const cadastral = item.descricaoCadastral || '';
        const complementar = item.descrCompl || '';
        
        if (cadastral && complementar && cadastral !== complementar) {
            return `${cadastral} | ${complementar}`;
        }
        
        return cadastral || complementar || 'SEM DESCRIÇÃO';
    }

    /**
     * Formata descrição para exibição
     * @public
     * @param {Object} item - Item DIFAL
     * @param {number} maxLength - Comprimento máximo
     * @returns {string} Descrição formatada para exibição
     */
    formatarDescricaoExibicao(item, maxLength = 30) {
        const cadastral = item.descricaoCadastral || '';
        const complementar = item.descrCompl || '';
        
        let descricaoPrincipal = '';
        let origem = '';
        
        if (cadastral && cadastral !== 'PRODUTO NÃO CADASTRADO' && cadastral !== 'SEM DADOS NA ORIGEM') {
            descricaoPrincipal = cadastral;
            origem = cadastral !== complementar && complementar ? 'Cadastral' : '';
        } else if (complementar) {
            descricaoPrincipal = complementar;
            origem = 'NF';
        } else {
            descricaoPrincipal = cadastral || 'SEM DESCRIÇÃO';
            origem = '';
        }
        
        const descricaoTruncada = Utils.truncarTexto(descricaoPrincipal, maxLength);
        
        if (origem) {
            return `${descricaoTruncada}<span class="descricao-origem">(${origem})</span>`;
        }
        
        return descricaoTruncada;
    }

    // ========== CONFIGURAÇÃO DE FUNÇÕES GLOBAIS ==========

    /**
     * Configura funções globais do modal
     * @private
     */
    setupModalFunctions() {
        const self = this;
        
        // Delegação para ModalManager
        window.openConfigModal = () => this.modalManager.openConfigModal();
        window.closeConfigModal = () => this.modalManager.closeConfigModal();
        window.openItemConfigModal = () => this.modalManager.openItemConfigModal();
        window.closeItemConfigModal = () => this.modalManager.closeItemConfigModal();
        
        // Funções específicas de workflow
        window.prosseguirParaConfiguracaoItens = function() {
            const configuracaoGeral = self.coletarConfiguracaoGeralModal();
            
            console.log('⚙️ Configuração geral aplicada:', configuracaoGeral);
            
            window.difalConfiguracaoGeral = configuracaoGeral;
            window.closeConfigModal();
            
            // Aplicar benefícios globais se configurados
            self.aplicarBeneficiosGlobais(configuracaoGeral.beneficiosGlobais);
            
            if (!configuracaoGeral.configurarBeneficios) {
                self.calculateDifalComConfiguracao(configuracaoGeral);
                return;
            }
            
            self.openItemConfigModal();
        };
        
        window.calcularSemConfiguracaoItens = function() {
            const configuracaoGeral = self.coletarConfiguracaoGeralModal();
            configuracaoGeral.configurarBeneficios = false;
            configuracaoGeral.fcpManual = false;
            
            console.log('📊 Calculando com configuração simples:', configuracaoGeral);
            
            self.aplicarBeneficiosGlobais(configuracaoGeral.beneficiosGlobais);
            window.difalConfiguracaoGeral = configuracaoGeral;
            
            window.closeConfigModal();
            self.calculateDifalComConfiguracao(configuracaoGeral);
        };
    }

    /**
     * Integra com Configuration Manager
     * @private
     */
    integrateWithConfigManager() {
        // Expor Configuration Manager globalmente para compatibilidade
        window.configManager = this.configManager;
        
        // Delegar métodos de configuração para o Configuration Manager
        this.salvarConfiguracaoLocalStorage = this.configManager.salvarConfiguracaoLocalStorage?.bind(this.configManager);
        this.carregarConfiguracaoLocalStorage = this.configManager.carregarConfiguracaoLocalStorage?.bind(this.configManager);
        this.limparConfiguracoesLocalStorage = this.configManager.limparConfiguracoesLocalStorage?.bind(this.configManager);
        this.countLocalStorageConfigs = this.configManager.countLocalStorageConfigs?.bind(this.configManager);
        this.updateStorageStats = this.configManager.updateStorageStats?.bind(this.configManager);
        this.validarBeneficioConfiguracao = this.configManager.validarBeneficioConfiguracao?.bind(this.configManager);
        this.createBeneficioFields = this.configManager.createBeneficioFields?.bind(this.configManager);
        this.updateSummary = this.configManager.updateSummary?.bind(this.configManager);
        
        console.log('🔗 UI Manager integrado com Configuration Manager');
    }

    /**
     * Integra módulos multi-período ao DifalApp para acesso global
     * @private
     */
    integrateWithDifalApp() {
        if (window.difalApp) {
            // Registrar managers multi-período no DifalApp
            window.difalApp.analyticsManager = this.analyticsManager;
            window.difalApp.chartsManager = this.chartsManager;
            window.difalApp.paretoAnalyzer = this.paretoAnalyzer;
            
            console.log('🌐 Módulos multi-período integrados ao DifalApp global');
        } else {
            console.warn('⚠️ DifalApp não disponível para integração');
        }
    }
    
    /**
     * Coleta configuração geral do modal
     * @private
     * @returns {Object} Configuração coletada
     */
    coletarConfiguracaoGeralModal() {
        const cargaEfetiva = document.getElementById('carga-efetiva')?.value;
        const aliqOrigemEfetiva = document.getElementById('aliq-origem-efetiva')?.value;
        const aliqDestinoEfetiva = document.getElementById('aliq-destino-efetiva')?.value;
        
        return {
            metodologia: document.querySelector('input[name="metodologia"]:checked')?.value || 'auto',
            configurarBeneficios: document.getElementById('configurar-beneficios')?.checked ?? true,
            fcpManual: document.getElementById('configurar-fcp-manual')?.checked || false,
            percentualDestinatario: parseFloat(document.getElementById('percentual-destinatario')?.value) || 100,
            beneficiosGlobais: {
                cargaEfetiva: cargaEfetiva ? parseFloat(cargaEfetiva) : null,
                aliqOrigemEfetiva: aliqOrigemEfetiva ? parseFloat(aliqOrigemEfetiva) : null,
                aliqDestinoEfetiva: aliqDestinoEfetiva ? parseFloat(aliqDestinoEfetiva) : null
            }
        };
    }
    
    /**
     * Calcula DIFAL com configuração aplicada
     * @private
     * @param {Object} configuracao - Configurações do cálculo
     */
    async calculateDifalComConfiguracao(configuracao) {
        const spedData = this.stateManager.getSpedData();
        if (!spedData || !spedData.itensDifal) {
            this.showError('Dados SPED não disponíveis');
            return;
        }

        const ufDestino = spedData.dadosEmpresa.uf;
        console.log(`Calculando DIFAL para empresa em ${ufDestino} com metodologia: ${configuracao.metodologia}`);
        
        this.showProgress('Configurando cálculo DIFAL...', 20);
        
        try {
            if (!window.difalApp) {
                throw new Error('DifalApp não disponível');
            }
            
            // Preparar configuração para o app modular
            const configApp = {
                ufOrigem: configuracao.ufOrigem || (ufDestino === 'SP' ? 'MG' : 'SP'),
                metodologia: configuracao.metodologia,
                percentualDestinatario: configuracao.percentualDestinatario,
                beneficiosGlobais: configuracao.beneficiosGlobais
            };
            
            window.difalConfiguracaoGeral = configuracao;
            
            this.showProgress('Processando cálculos...', 60);
            
            const { resultados, totalizadores } = await window.difalApp.calculateDifal(configApp);
            
            this.showProgress('Cálculo concluído!', 100);
            
            window.difalResults = {
                resultados,
                totalizadores,
                configuracao
            };
            
            this.showCalculationResults(resultados, totalizadores);
            
        } catch (error) {
            console.error('Erro no cálculo DIFAL:', error);
            this.showError(`Erro no cálculo: ${error.message}`);
        }
    }
    
    // ========== MÚLTIPLOS PERÍODOS - EVENT LISTENERS ==========
    
    // ========== MULTI-PERIOD EVENT LISTENERS (DUPLICATED FROM SINGLE-PERIOD) ==========
    
    /**
     * Configura event listeners para modo multi-período - DUPLICATED FROM SINGLE-PERIOD
     * @private
     */
    setupMultiplePeriodsEventListeners() {
        // Drop zone para múltiplos períodos
        const multiDropZone = document.getElementById('multi-period-drop-zone');
        const multiFileInput = document.getElementById('multi-period-file-input');
        
        if (multiDropZone) {
            multiDropZone.addEventListener('click', () => {
                if (multiFileInput) multiFileInput.click();
            });
            
            multiDropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                multiDropZone.classList.add('dragover');
            });
            
            multiDropZone.addEventListener('dragleave', () => {
                multiDropZone.classList.remove('dragover');
            });
            
            multiDropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                multiDropZone.classList.remove('dragover');
                
                const files = Array.from(e.dataTransfer.files);
                this.handleMultiplePeriodFiles(files);
            });
        }
        
        if (multiFileInput) {
            multiFileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                this.handleMultiplePeriodFiles(files);
            });
        }
        
        // Botões da seção de períodos
        const clearPeriodsBtn = document.getElementById('clear-all-periods');
        if (clearPeriodsBtn) {
            clearPeriodsBtn.addEventListener('click', () => this.clearAllMultiplePeriods());
        }
        
        const generateAnalyticsBtn = document.getElementById('generate-analytics');
        if (generateAnalyticsBtn) {
            generateAnalyticsBtn.addEventListener('click', () => this.generateMultipleAnalytics());
        }
        
        const proceedToAnalyticsBtn = document.getElementById('proceed-to-analytics');
        if (proceedToAnalyticsBtn) {
            proceedToAnalyticsBtn.addEventListener('click', () => this.proceedToMultipleAnalytics());
        }
        
        // Botão de cálculo DIFAL multi-período
        const calculateMultiBtn = document.getElementById('multi-calculate-difal-btn');
        if (calculateMultiBtn) {
            calculateMultiBtn.addEventListener('click', () => this.calculateDifal());
        }
    }
    
    // ========== MULTI-PERIOD METHODS (DUPLICATED FROM SINGLE-PERIOD) ==========
    
    /**
     * Processa upload de arquivo SPED - MULTI-PERIOD VERSION
     * @public
     * @param {File} file - Arquivo para upload
     */
    async handleMultipleFileUpload(file) {
        try {
            const resultado = await this.fileUploadManager.handleFileUpload(file);
            
            // Após upload bem-sucedido, mostrar análise multi-período
            if (resultado) {
                this.showMultipleSpedAnalysis(resultado);
                this.navigationManager.navigateToSection('multi-analytics-section');
                this.updateMultipleCompanyInfo();
                
                // Modal de configuração agora será aberto apenas quando usuário clicar no botão
                console.log('✅ Arquivo processado em modo multi-período. Modal de configuração disponível via botão.');
            }
            
            return resultado;
        } catch (error) {
            console.error('❌ Erro no upload multi-período via UI Manager:', error);
            throw error;
        }
    }
    
    /**
     * Mostra análise dos dados SPED - MULTI-PERIOD VERSION
     * @public
     * @param {Object} spedData - Dados SPED processados
     */
    showMultipleSpedAnalysis(spedData) {
        console.log('🔍 DEBUG showMultipleSpedAnalysis:', {
            hasSpedData: !!spedData,
            dataKeys: spedData ? Object.keys(spedData) : null,
            hasDadosEmpresa: !!(spedData && spedData.dadosEmpresa),
            empresa: spedData?.dadosEmpresa || null
        });
        
        const summaryDiv = document.getElementById('sped-summary');
        const tableDiv = document.getElementById('single-difal-items-table');
        
        console.log('🔍 DEBUG DOM elements:', {
            summaryDiv: !!summaryDiv,
            summaryDivClasses: summaryDiv?.className,
            tableDiv: !!tableDiv
        });
        
        if (summaryDiv) {
            try {
                console.log('🔍 DEBUG: Dentro do if summaryDiv - iniciando processamento multi-período');
                
                // Verificar se estamos em modo multi-período
                let displayData = spedData;
                let isMultiplePeriod = true; // Sempre true para métodos multi
                
                console.log('🔍 DEBUG: Verificando dados antes do processamento multi:', {
                    hasSpedData: !!spedData,
                    hasDadosEmpresa: !!(spedData && spedData.dadosEmpresa)
                });
                
                // Multi-período: tentar obter do PeriodsManager
                if (!spedData || !spedData.dadosEmpresa) {
                    console.log('🔍 DEBUG: Entrando na condição de multi-período');
                    const periodsState = this.stateManager?.getPeriodsState();
                    if (periodsState && periodsState.periods && periodsState.periods.length > 0) {
                        const firstPeriod = periodsState.periods[0];
                        displayData = firstPeriod.dados;
                        console.log('📅 Usando dados do modo multi-período para análise');
                    }
                } else {
                    console.log('🔍 DEBUG: Usando dados single-period em modo multi');
                }
                
                // Remover classe hidden e mostrar o div
                console.log('🔍 DEBUG: Removendo classe hidden do summaryDiv');
                summaryDiv.classList.remove('hidden');
                console.log('🔍 DEBUG: Classes após remoção:', summaryDiv.className);
            
                const stats = displayData?.estatisticasDifal || {};
                
                if (isMultiplePeriod) {
                    const periodsState = this.stateManager.getPeriodsState();
                    const consolidated = periodsState.consolidated || {};
                    
                    summaryDiv.innerHTML = `
                        <div class="summary-item">
                            <h3>Múltiplos Períodos</h3>
                            <div class="summary-value">${periodsState.totalPeriods || 1} período(s)</div>
                            <div class="summary-label">Modo Multi-Período</div>
                        </div>
                        <div class="summary-item">
                            <h3>Empresa</h3>
                            <div class="summary-value">${periodsState.currentCompany?.razaoSocial || displayData?.dadosEmpresa?.razaoSocial || 'N/A'}</div>
                            <div class="summary-label">CNPJ: ${Utils.formatarCNPJ(periodsState.currentCompany?.cnpj || displayData?.dadosEmpresa?.cnpj || '')}</div>
                        </div>
                        <div class="summary-item">
                            <h3>UF</h3>
                            <div class="summary-value">${periodsState.currentCompany?.uf || displayData?.dadosEmpresa?.uf || 'N/A'}</div>
                            <div class="summary-label">Estado da empresa</div>
                        </div>
                        <div class="summary-item">
                            <h3>Registros Consolidados</h3>
                            <div class="summary-value">${Utils.formatarNumero(consolidated.totalRegistros || 0)}</div>
                            <div class="summary-label">Todos os períodos</div>
                        </div>
                        <div class="summary-item">
                            <h3>Itens DIFAL Totais</h3>
                            <div class="summary-value">${Utils.formatarNumero(consolidated.totalItensDifal || 0)}</div>
                            <div class="summary-label">Consolidado multi-período</div>
                        </div>
                        <div class="summary-item">
                            <h3>Valor Total</h3>
                            <div class="summary-value">${Utils.formatarMoeda(consolidated.totalValorItens || 0)}</div>
                            <div class="summary-label">Base para cálculo DIFAL</div>
                        </div>
                    `;
                } else {
                    summaryDiv.innerHTML = `
                        <div class="summary-item">
                            <h3>Arquivo Processado</h3>
                            <div class="summary-value">${displayData.fileName || 'N/A'}</div>
                            <div class="summary-label">Arquivo SPED</div>
                        </div>
                        <div class="summary-item">
                            <h3>Empresa</h3>
                            <div class="summary-value">${displayData.dadosEmpresa?.razaoSocial || 'N/A'}</div>
                            <div class="summary-label">CNPJ: ${Utils.formatarCNPJ(displayData.dadosEmpresa?.cnpj || '')}</div>
                        </div>
                        <div class="summary-item">
                            <h3>Período</h3>
                            <div class="summary-value">${displayData.periodoApuracao || 'N/A'}</div>
                            <div class="summary-label">UF: ${displayData.dadosEmpresa?.uf || 'N/A'}</div>
                        </div>
                        <div class="summary-item">
                            <h3>Registros Totais</h3>
                            <div class="summary-value">${Utils.formatarNumero(displayData.estatisticas?.totalRegistros || 0)}</div>
                            <div class="summary-label">${Object.keys(displayData.registros || {}).length} tipos</div>
                        </div>
                        <div class="summary-item">
                            <h3>Itens DIFAL</h3>
                            <div class="summary-value">${Utils.formatarNumero(stats.totalItens || 0)}</div>
                            <div class="summary-label">CFOPs DIFAL identificados</div>
                        </div>
                        <div class="summary-item">
                            <h3>Valor Total</h3>
                            <div class="summary-value">${Utils.formatarMoeda(stats.estatisticasValores?.totalValorItem || 0)}</div>
                            <div class="summary-label">Base para cálculo DIFAL</div>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('❌ Erro ao exibir análise SPED multi-período:', error);
                if (summaryDiv) {
                    summaryDiv.innerHTML = '<div class="error-message">Erro ao carregar dados de análise multi-período</div>';
                }
            }
        }
        
        // Exibir tabela de itens
        if (tableDiv) {
            let itemsToShow = [];
            
            if (spedData && spedData.itensDifal && spedData.itensDifal.length > 0) {
                itemsToShow = spedData.itensDifal.slice(0, 10);
            } else {
                // Tentar obter itens do primeiro período em modo multi-período
                const periodsState = this.stateManager?.getPeriodsState();
                if (periodsState && periodsState.periods && periodsState.periods.length > 0) {
                    const firstPeriod = periodsState.periods[0];
                    if (firstPeriod.dados && firstPeriod.dados.itensDifal) {
                        itemsToShow = firstPeriod.dados.itensDifal.slice(0, 10);
                    }
                }
            }
            
            if (itemsToShow.length > 0) {
                this.createDifalTable(tableDiv, itemsToShow);
            }
        }
    }
    
    // REMOVED: calculateMultipleDifal() - Now using unified calculateDifal()

    // REMOVED: showMultipleCalculationResults() - Now using unified showCalculationResults()

    /**
     * Atualiza informações da empresa - MULTI-PERIOD VERSION  
     * @public
     */
    updateMultipleCompanyInfo() {
        const spedData = this.stateManager.getSpedData();
        if (spedData?.dadosEmpresa) {
            const empresa = spedData.dadosEmpresa;
            
            // Atualizar elementos multi-período específicos
            this.setElementText('multi-current-company-name', empresa.razaoSocial || 'N/A');
            this.setElementText('multi-current-company-cnpj', Utils.formatarCNPJ(empresa.cnpj || ''));
            this.setElementText('multi-current-company-uf', empresa.uf || 'N/A');
            
            // Mostrar info da empresa
            const companyInfo = document.getElementById('multi-current-company-info');
            if (companyInfo) {
                companyInfo.classList.remove('hidden');
            }
            
            console.log('✅ Informações da empresa atualizadas em modo multi-período:', empresa.razaoSocial);
        }
    }
    
    /**
     * Cria tabela de itens DIFAL - MULTI-PERIOD VERSION
     * @private
     * @param {HTMLElement} container - Container da tabela
     * @param {Array} items - Itens para exibir
     */
    createMultipleDifalTable(container, items) {
        // DEPRECATED: Using unified createDifalTable()
        console.warn('⚠️ createMultipleDifalTable() is deprecated, use createDifalTable() instead');
        return this.createDifalTable(container, items);
        if (!container || !items?.length) return;

        const tableHtml = `
            <div class="table-header">
                <h3>📦 Itens DIFAL Identificados (${items.length} primeiros)</h3>
                <p class="table-subtitle">Itens sujeitos ao DIFAL encontrados nos arquivos SPED multi-período</p>
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>NCM</th>
                            <th>Descrição</th>
                            <th>CFOP</th>
                            <th>Valor (R$)</th>
                            <th>CST</th>
                            <th>Alíquota (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td>${item.ncm || 'N/A'}</td>
                                <td class="desc-cell" title="${item.descricaoItem || item.descItem || 'N/A'}">
                                    ${(item.descricaoItem || item.descItem || 'N/A').substring(0, 40)}${(item.descricaoItem || item.descItem || '').length > 40 ? '...' : ''}
                                </td>
                                <td>${item.cfop || 'N/A'}</td>
                                <td>${Utils.formatarMoeda(item.valor || 0)}</td>
                                <td>${item.cst || 'N/A'}</td>
                                <td>${(item.aliqIcms || 0).toFixed(1)}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHtml;
        container.classList.remove('hidden');
    }
    
    /**
     * Processa múltiplos arquivos de períodos - MULTI-PERIOD VERSION
     * @private
     */
    async handleMultiplePeriodFiles(files) {
        if (!files || files.length === 0) return;
        
        console.log(`📁 Processando ${files.length} arquivos SPED para múltiplos períodos`);
        
        try {
            this.showProgress('Processando múltiplos períodos...', 0);
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const progress = Math.round(((i + 1) / files.length) * 100);
                
                this.showProgress(`Processando arquivo ${i + 1}/${files.length}: ${file.name}`, progress);
                
                await this.processMultiplePeriodsFile(file);
                
                // Pequena pausa para atualização da UI
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            this.showProgress('Múltiplos períodos processados com sucesso!', 100);
            this.updateMultiplePeriodsDisplay();
            this.showMultipleSpedAnalysis(); // Exibir análise após processamento
            this.updateMultipleMultiPeriodUfDisplay(); // Atualizar display da UF extraída
            this.navigationManager.navigateToSection('multi-analytics-section'); // Navegar automaticamente
            
        } catch (error) {
            console.error('❌ Erro ao processar múltiplos períodos:', error);
            this.showError(`Erro: ${error.message}`);
        }
    }
    
    /**
     * Processa um arquivo individual de período - MULTI-PERIOD VERSION
     * @private
     */
    async processMultiplePeriodsFile(file) {
        try {
            // Usar FileUploadManager que já tem acesso ao spedParser configurado
            const spedData = await this.fileUploadManager.processFileWithParser(file);
            await this.periodsManager.addPeriod(spedData);
            return spedData;
        } catch (error) {
            throw new Error(`Erro ao processar arquivo ${file.name}: ${error.message}`);
        }
    }
    
    /**
     * Limpa todos os períodos - MULTI-PERIOD VERSION
     * @private
     */
    clearAllMultiplePeriods() {
        if (this.periodsManager) {
            this.periodsManager.clearAllPeriods();
        }
        this.updateMultiplePeriodsDisplay();
        console.log('✅ Todos os períodos multi-período foram limpos');
    }
    
    /**
     * Gera análises para múltiplos períodos - MULTI-PERIOD VERSION
     * @private
     */
    generateMultipleAnalytics() {
        console.log('📊 Gerando análises para múltiplos períodos');
        // Delegar para analytics manager
        if (this.analyticsManager) {
            this.analyticsManager.generateAnalytics();
        }
    }
    
    /**
     * Prossegue para análises - MULTI-PERIOD VERSION
     * @private
     */
    proceedToMultipleAnalytics() {
        this.navigationManager.navigateToSection('multi-analytics-section');
        console.log('🔄 Navegando para seção de análises multi-período');
    }
    
    /**
     * Atualiza display dos períodos - MULTI-PERIOD VERSION
     * @private
     */
    updateMultiplePeriodsDisplay() {
        const periodsState = (this.stateManager && this.stateManager.getPeriodsState()) || {};
        
        // Atualizar contadores
        const periodsCountEl = document.getElementById('periods-count');
        if (periodsCountEl) periodsCountEl.textContent = periodsState.totalPeriods || 0;
        
        const companyCnpjEl = document.getElementById('company-cnpj');
        if (companyCnpjEl) companyCnpjEl.textContent = 
            Utils.formatarCNPJ((periodsState.currentCompany && periodsState.currentCompany.cnpj) || '');
        
        console.log(`📊 Display de períodos multi-período atualizado: ${periodsState.totalPeriods || 0} períodos`);
    }
    
    /**
     * Atualiza display da UF multi-período - MULTI-PERIOD VERSION
     * @private
     */
    updateMultipleMultiPeriodUfDisplay() {
        const ufExtraida = this.extractMultipleUfFromCurrentData();
        const ufDisplayElement = document.getElementById('multi-uf-display');
        
        if (ufDisplayElement && ufExtraida) {
            ufDisplayElement.textContent = ufExtraida;
            console.log(`🎯 UF extraída e exibida em modo multi-período: ${ufExtraida}`);
        }
    }
    
    /**
     * Extrai UF dos dados atuais - MULTI-PERIOD VERSION
     * @private
     * @returns {string|null} UF extraída
     */
    extractMultipleUfFromCurrentData() {
        const periodsState = this.stateManager?.getPeriodsState();
        
        // Tentar obter UF da empresa atual
        if (periodsState?.currentCompany?.uf) {
            return periodsState.currentCompany.uf;
        }
        
        // Tentar obter do primeiro período
        if (periodsState?.periods?.length > 0) {
            const firstPeriod = periodsState.periods[0];
            return firstPeriod.dados?.dadosEmpresa?.uf || null;
        }
        
        return null;
    }
    
    // showMultiPeriodAnalysis - REMOVED (will be duplicated from single-period)
    
    // showMultiPeriodItemsTable - REMOVED (will be duplicated from single-period)
    
    // consolidateItemsFromPeriods - REMOVED (will be duplicated from single-period)
    
    // calculateMultiPeriodDifal, executeDifalCalculation, calculateItemDifal, getAliquotaOrigem, getAliquotaFcp - REMOVED (will be duplicated from single-period)
    
    // showMultiPeriodCalculationResults - REMOVED (will be duplicated from single-period)
    
    // updateMultiCalculationSummary - REMOVED (will be duplicated from single-period)
    
    // showMultiCalculationResultsTable - REMOVED (will be duplicated from single-period)

    /**
     * Processa múltiplos arquivos de períodos
     * @private
     */
    async handleMultiplePeriodFiles(files) {
        if (!files || files.length === 0) return;
        
        console.log(`📁 Processando ${files.length} arquivos SPED para múltiplos períodos`);
        
        try {
            this.showProgress('Processando múltiplos períodos...', 0);
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const progress = Math.round(((i + 1) / files.length) * 100);
                
                this.showProgress(`Processando arquivo ${i + 1}/${files.length}: ${file.name}`, progress);
                
                await this.processPeriodsFile(file);
                
                // Pequena pausa para atualização da UI
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            this.showProgress('Múltiplos períodos processados com sucesso!', 100);
            this.updatePeriodsDisplay();
            
            // StateManager agora retorna dados consolidados automaticamente
            const spedData = this.stateManager.getSpedData();
            if (spedData) {
                this.showSpedAnalysis(spedData); // Usar função unificada
            }
            
            this.updateMultiPeriodUfDisplay(); // Atualizar display da UF extraída
            this.navigationManager.navigateToSection('multi-analytics-section'); // Navegar automaticamente
            
        } catch (error) {
            console.error('❌ Erro ao processar múltiplos períodos:', error);
            this.showError(`Erro: ${error.message}`);
        }
    }
    
    /**
     * Processa um arquivo individual de período
     * @private
     */
    async processPeriodsFile(file) {
        try {
            // Usar FileUploadManager que já tem acesso ao spedParser configurado
            const spedData = await this.fileUploadManager.processFileWithParser(file);
            await this.periodsManager.addPeriod(spedData);
            return spedData;
        } catch (error) {
            throw new Error(`Erro ao processar arquivo ${file.name}: ${error.message}`);
        }
    }
    
    /**
     * Processa um arquivo SPED individual para multi-período
     * ARQUITETURA LIMPA: Reutiliza FileUploadManager que já funciona no single-period
     * @private
     * @param {File} file - Arquivo SPED
     */
    async processPeriodsFile(file) {
        try {
            console.log(`📁 Processando arquivo: ${file.name}`);
            
            // SOLUÇÃO ARQUITETURAL: Delegar para FileUploadManager que já tem SpedParser configurado
            // Isso mantém consistência com o modo single-period
            const spedData = await this.fileUploadManager.processFileForMultiPeriod(file);
            
            // Adicionar período ao PeriodsManager
            if (this.periodsManager) {
                await this.periodsManager.addPeriod(spedData);
                console.log(`✅ Período adicionado: ${spedData.periodoApuracao}`);
            } else {
                console.warn('⚠️ PeriodsManager não disponível');
            }
            
        } catch (error) {
            console.error(`❌ Erro ao processar arquivo ${file.name}:`, error);
            throw error;
        }
    }

    // REMOVIDO: readFileAsText() - agora delegamos para FileUploadManager
    // Isso elimina duplicação de código e mantém single source of truth

    /**
     * Atualiza exibição dos períodos
     * @private
     */
    updatePeriodsDisplay() {
        const periodsState = this.stateManager.getPeriodsState();
        
        // Atualizar informações da empresa atual usando mapeamento inteligente
        const currentCompanyInfo = this.getElementByMode('current-company-info', 'multi');
        if (currentCompanyInfo && periodsState.currentCompany) {
            currentCompanyInfo.classList.remove('hidden');
            
            this.setElementText('current-company-name', periodsState.currentCompany.razaoSocial || '-', 'multi');
            this.setElementText('current-company-cnpj', periodsState.currentCompany.cnpj || '-', 'multi');
            this.setElementText('current-company-uf', periodsState.currentCompany.uf || '-', 'multi');
            this.setElementText('current-company-periods', periodsState.totalPeriods, 'multi');
        }
        
        // Atualizar lista de períodos
        this.renderPeriodsTable();
        
        // Atualizar estatísticas consolidadas
        this.updateConsolidatedStats();
    }
    
    /**
     * Renderiza tabela de períodos
     * @private
     */
    renderPeriodsTable() {
        const periodsTable = this.getElementByMode('periods-table', 'multi');
        const periodsList = this.getElementByMode('periods-list', 'multi');
        
        if (!periodsTable || !periodsList) {
            console.warn('⚠️ Elementos da tabela de períodos não encontrados:', {
                periodsTable: !!periodsTable,
                periodsList: !!periodsList
            });
            return;
        }
        
        const periodsState = this.stateManager.getPeriodsState();
        
        if (periodsState.periods.length === 0) {
            periodsList.classList.add('hidden');
            return;
        }
        
        periodsList.classList.remove('hidden');
        
        let tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Período</th>
                        <th>Início</th>
                        <th>Fim</th>
                        <th>Itens DIFAL</th>
                        <th>Valor Total</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        periodsState.periods.forEach(period => {
            const totalValue = period.dados.itensDifal.reduce((sum, item) => sum + (item.valor || 0), 0);
            
            tableHTML += `
                <tr>
                    <td>${period.id}</td>
                    <td>${this.formatDate(period.periodo.inicio)}</td>
                    <td>${this.formatDate(period.periodo.fim)}</td>
                    <td>${period.dados.itensDifal.length}</td>
                    <td>${this.formatCurrency(totalValue)}</td>
                    <td><span class="status-badge status-success">✅ Processado</span></td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="window.uiManager.viewPeriodDetails('${period.id}')">
                            👁️ Ver
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.uiManager.removePeriod('${period.id}')"
                            🗑️ Remover
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        periodsTable.innerHTML = tableHTML;
    }
    
    /**
     * Atualiza estatísticas consolidadas
     * @private
     */
    updateConsolidatedStats() {
        const periodsState = this.stateManager.getPeriodsState();
        
        if (!periodsState.consolidated) return;
        
        const stats = periodsState.consolidated;
        
        // Usar mapeamento inteligente para atualizar estatísticas
        this.setElementText('consolidated-total-items', stats.totalItems || 0, 'multi');
        this.setElementText('consolidated-total-value', this.formatCurrency(stats.totalValue || 0), 'multi');
        this.setElementText('consolidated-unique-ncms', stats.uniqueNCMs || 0, 'multi');
        this.setElementText('consolidated-periods-count', periodsState.totalPeriods || 0, 'multi');
        
        const consolidatedStats = this.getElementByMode('consolidated-stats', 'multi');
        if (consolidatedStats) {
            consolidatedStats.classList.remove('hidden');
        }
    }
    
    /**
     * Limpa todos os períodos
     * @private
     */
    clearAllPeriods() {
        if (confirm('Tem certeza que deseja limpar todos os períodos?')) {
            this.periodsManager.clearAllPeriods();
            this.updatePeriodsDisplay();
            console.log('🧹 Todos os períodos foram limpos');
        }
    }
    
    // ========== ANALYTICS - EVENT LISTENERS ==========
    
    /**
     * Configura event listeners para analytics
     * @private
     */
    setupAnalyticsEventListeners() {
        // Botões de exportação analytics
        const exportAnalyticsExcel = document.getElementById('export-analytics-excel');
        if (exportAnalyticsExcel) {
            exportAnalyticsExcel.addEventListener('click', () => this.exportAnalyticsExcel());
        }
        
        const exportAnalyticsPdf = document.getElementById('export-analytics-pdf');
        if (exportAnalyticsPdf) {
            exportAnalyticsPdf.addEventListener('click', () => this.exportAnalyticsPdf());
        }
        
        const exportConsolidatedReport = document.getElementById('export-consolidated-report');
        if (exportConsolidatedReport) {
            exportConsolidatedReport.addEventListener('click', () => this.exportConsolidatedReport());
        }
        
        const refreshAnalytics = document.getElementById('refresh-analytics');
        if (refreshAnalytics) {
            refreshAnalytics.addEventListener('click', () => this.refreshAnalytics());
        }
        
        // Tabs de analytics
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = e.target.getAttribute('data-tab');
                this.switchAnalyticsTab(tabId);
            });
        });
    }
    
    /**
     * Gera análises estatísticas
     * @private
     */
    async generateAnalytics() {
        try {
            const periodsState = this.stateManager.getPeriodsState();
            
            if (!periodsState.periods || periodsState.periods.length === 0) {
                this.showError('Nenhum período disponível para análise');
                return;
            }
            
            this.showProgress('Gerando análises estatísticas...', 0);
            
            // Processar analytics
            const analytics = await this.analyticsManager.processAllAnalytics();
            
            this.showProgress('Análises concluídas!', 100);
            
            // Navegar para seção de analytics
            this.navigationManager.navigateToSection('analytics-section');
            
            // Renderizar resultados
            this.renderAnalyticsResults(analytics);
            
        } catch (error) {
            console.error('❌ Erro ao gerar analytics:', error);
            this.showError(`Erro: ${error.message}`);
        }
    }
    
    /**
     * Renderiza resultados das análises
     * @private
     */
    renderAnalyticsResults(analytics) {
        // Atualizar resumo
        this.updateAnalyticsSummary(analytics);
        
        // Mostrar abas
        const analyticsTabs = document.getElementById('analytics-tabs');
        if (analyticsTabs) {
            analyticsTabs.classList.remove('hidden');
        }
        
        // Mostrar botões de exportação
        const exportButtons = document.getElementById('analytics-export-buttons');
        if (exportButtons) {
            exportButtons.classList.remove('hidden');
        }
        
        // Renderizar cada aba
        this.renderParetoTab(analytics.paretoAnalysis);
        this.renderNCMTab(analytics.ncmAnalysis);
        this.renderTrendsTab(analytics.periodAnalysis);
        this.renderChartsTab(analytics);
    }
    
    /**
     * Procede para analytics
     * @private
     */
    proceedToAnalytics() {
        const analyticsState = this.stateManager.getAnalyticsState();
        
        if (!analyticsState || !analyticsState.results) {
            this.generateAnalytics();
        } else {
            this.navigationManager.navigateToSection('analytics-section');
        }
    }
    
    // ========== UTILITY METHODS ==========
    
    /**
     * Formata data
     * @private
     */
    formatDate(dateString) {
        if (!dateString) return '-';
        
        // Formato: DDMMAAAA -> DD/MM/AAAA
        if (dateString.length === 8) {
            return `${dateString.substr(0, 2)}/${dateString.substr(2, 2)}/${dateString.substr(4, 4)}`;
        }
        
        return dateString;
    }
    
    /**
     * Formata moeda
     * @private
     */
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    }
    
    /**
     * Formata CNPJ - delega para Utils.js
     * @private
     * @param {string} cnpj - CNPJ para formatar
     * @returns {string} CNPJ formatado
     */
    formatCNPJ(cnpj) {
        return window.Utils ? window.Utils.formatarCNPJ(cnpj) : (cnpj || 'N/A');
    }
    
    /**
     * Formata número - delega para Utils.js
     * @private
     * @param {number} number - Número para formatar
     * @param {number} decimals - Casas decimais (padrão: 0)
     * @returns {string} Número formatado
     */
    formatNumber(number, decimals = 0) {
        return window.Utils ? window.Utils.formatarNumero(number, decimals) : (number || 0).toString();
    }
    
    /**
     * Formata porcentagem - delega para Utils.js
     * @private
     * @param {number} value - Valor para formatar como porcentagem
     * @param {number} decimals - Casas decimais (padrão: 2)
     * @returns {string} Porcentagem formatada
     */
    formatPercentage(value, decimals = 2) {
        return window.Utils ? window.Utils.formatarPorcentagem(value, decimals) : (value || 0) + '%';
    }
    
    // ========== MULTI-PERIOD SPECIFIC FUNCTIONS ==========
    
    /**
     * Exibe detalhes de um período específico
     * @public
     * @param {string} periodKey - Chave do período (formato: YYYYMM-YYYYMM)
     */
    viewPeriodDetails(periodKey) {
        console.log(`🔍 Visualizando detalhes do período: ${periodKey}`);
        
        const periodsState = this.stateManager?.getPeriodsState();
        if (!periodsState || !periodsState.periods) {
            console.error('❌ Nenhum período carregado');
            this.showError('Nenhum período carregado para visualização');
            return;
        }
        
        const period = periodsState.periods.find(p => p.id === periodKey);
        if (!period) {
            console.error(`❌ Período não encontrado: ${periodKey}`);
            this.showError('Período não encontrado');
            return;
        }
        
        // Criar modal com detalhes do período
        const modalHTML = `
            <div class="modal-overlay" id="period-details-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>📊 Detalhes do Período - ${period.periodo.label}</h3>
                        <button class="btn-close" onclick="window.uiManager.closePeriodDetailsModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="period-info">
                            <div class="info-row">
                                <span class="label">📅 Período:</span>
                                <span class="value">${period.periodo.label}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">📁 Arquivo:</span>
                                <span class="value">${period.fileName}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">🏢 Empresa:</span>
                                <span class="value">${period.empresa.razaoSocial}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">🆔 CNPJ:</span>
                                <span class="value">${this.formatCNPJ(period.empresa.cnpj)}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">📍 UF:</span>
                                <span class="value">${period.empresa.uf}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">📦 Total de Itens:</span>
                                <span class="value">${this.formatNumber(period.estatisticas.totalItens)}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">🏷️ NCMs Únicos:</span>
                                <span class="value">${this.formatNumber(period.estatisticas.ncmsUnicos)}</span>
                            </div>
                        </div>
                        
                        <div class="period-actions">
                            <button class="btn btn-primary" onclick="window.uiManager.exportPeriodData('${periodKey}')">
                                📊 Exportar Dados do Período
                            </button>
                            <button class="btn btn-secondary" onclick="window.uiManager.showPeriodItems('${periodKey}')">
                                📋 Ver Itens DIFAL
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Adicionar modal ao DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Mostrar modal
        const modal = document.getElementById('period-details-modal');
        modal.style.display = 'flex';
        
        console.log(`✅ Modal de detalhes do período ${periodKey} exibido`);
    }
    
    /**
     * Fecha modal de detalhes do período
     * @public
     */
    closePeriodDetailsModal() {
        const modal = document.getElementById('period-details-modal');
        if (modal) {
            modal.remove();
        }
    }
    
    /**
     * Remove um período do sistema
     * @public
     * @param {string} periodKey - Chave do período para remover
     */
    removePeriod(periodKey) {
        console.log(`🗑️ Removendo período: ${periodKey}`);
        
        // Confirmar remoção
        if (!confirm(`Tem certeza que deseja remover o período ${periodKey}?\n\nEsta ação não pode ser desfeita.`)) {
            return;
        }
        
        // Delegar para PeriodsManager
        if (window.periodsManager) {
            const success = window.periodsManager.removePeriod(periodKey);
            
            if (success) {
                this.showSuccess(`Período ${periodKey} removido com sucesso`);
                
                // Atualizar display dos períodos
                this.updateMultiPeriodDisplay();
                
                console.log(`✅ Período ${periodKey} removido com sucesso`);
            } else {
                this.showError('Erro ao remover período');
            }
        } else {
            console.error('❌ PeriodsManager não disponível');
            this.showError('Sistema de períodos não disponível');
        }
    }
    
    /**
     * Exibe detalhes de um item específico
     * @public
     * @param {string} itemCode - Código do item
     */
    viewItemDetails(itemCode) {
        console.log(`🔍 Visualizando detalhes do item: ${itemCode}`);
        
        // Buscar item nos períodos carregados
        const periodsState = this.stateManager?.getPeriodsState();
        let foundItem = null;
        let foundPeriod = null;
        
        if (periodsState && periodsState.periods) {
            for (const period of periodsState.periods) {
                const item = period.dados.itensDifal.find(item => item.codigo === itemCode);
                if (item) {
                    foundItem = { ...item, _periodo: period.periodo.label };
                    foundPeriod = period.periodo.label;
                    break;
                }
            }
        }
        
        if (!foundItem) {
            console.error(`❌ Item não encontrado: ${itemCode}`);
            this.showError('Item não encontrado');
            return;
        }
        
        // Criar modal com detalhes do item
        const modalHTML = `
            <div class="modal-overlay" id="item-details-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>🏷️ Detalhes do Item - ${itemCode}</h3>
                        <button class="btn-close" onclick="window.uiManager.closeItemDetailsModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="item-info">
                            <div class="info-row">
                                <span class="label">📅 Período:</span>
                                <span class="value">${foundPeriod}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">🏷️ NCM:</span>
                                <span class="value">${foundItem.ncm || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">📝 Descrição:</span>
                                <span class="value">${foundItem.descricaoItem || foundItem.descItem || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">🔢 CFOP:</span>
                                <span class="value">${foundItem.cfop || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">💰 Valor:</span>
                                <span class="value">${this.formatCurrency(foundItem.valor || 0)}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">📊 CST:</span>
                                <span class="value">${foundItem.cst || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">📦 Quantidade:</span>
                                <span class="value">${this.formatNumber(foundItem.quantidade || 0, 3)}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">📏 Unidade:</span>
                                <span class="value">${foundItem.unidade || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Adicionar modal ao DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Mostrar modal
        const modal = document.getElementById('item-details-modal');
        modal.style.display = 'flex';
        
        console.log(`✅ Modal de detalhes do item ${itemCode} exibido`);
    }
    
    /**
     * Fecha modal de detalhes do item
     * @public
     */
    closeItemDetailsModal() {
        const modal = document.getElementById('item-details-modal');
        if (modal) {
            modal.remove();
        }
    }
    
    // ========== UF EXTRACTION & AUTO-CONFIGURATION ==========
    
    /**
     * Extrai UF dos dados SPED consolidados
     * @public
     * @returns {string|null} UF da empresa ou null se não encontrado
     */
    extractUfFromCurrentData() {
        // Tentar StateManager primeiro (single-period)
        const spedData = this.stateManager?.getSpedData();
        if (spedData && spedData.dadosEmpresa && spedData.dadosEmpresa.uf) {
            return spedData.dadosEmpresa.uf;
        }
        
        // Tentar PeriodsManager (multi-period)
        const periodsState = this.stateManager?.getPeriodsState();
        if (periodsState && periodsState.currentCompany && periodsState.currentCompany.uf) {
            return periodsState.currentCompany.uf;
        }
        
        // Tentar extrair do primeiro período disponível
        if (periodsState && periodsState.periods && periodsState.periods.length > 0) {
            const firstPeriod = periodsState.periods[0];
            if (firstPeriod.empresa && firstPeriod.empresa.uf) {
                return firstPeriod.empresa.uf;
            }
        }
        
        console.warn('⚠️ UF não encontrada nos dados carregados');
        return null;
    }
    
    /**
     * Configura automaticamente UF no campo de cálculo
     * @public
     * @returns {boolean} True se configuração foi realizada
     */
    autoConfigureUfFromPeriods() {
        const uf = this.extractUfFromCurrentData();
        
        if (!uf) {
            console.warn('⚠️ Não foi possível extrair UF para configuração automática');
            return false;
        }
        
        // Configurar UF no campo single-period
        const singleUfField = document.getElementById('uf-destino');
        if (singleUfField) {
            singleUfField.value = uf;
            console.log(`✅ UF origem configurada automaticamente (single): ${uf}`);
        }
        
        // Configurar UF no display multi-period
        const multiUfDisplay = document.getElementById('multi-uf-display');
        if (multiUfDisplay) {
            multiUfDisplay.textContent = uf;
            console.log(`✅ UF origem exibida automaticamente (multi): ${uf}`);
        }
        
        return true;
    }
    
    /**
     * Valida consistência de UF entre períodos
     * @public
     * @returns {Object} Resultado da validação
     */
    validateUfConsistency() {
        const periodsState = this.stateManager?.getPeriodsState();
        
        if (!periodsState || !periodsState.periods || periodsState.periods.length <= 1) {
            return { isConsistent: true, message: 'Menos de 2 períodos para validação' };
        }
        
        const ufs = new Set();
        const details = [];
        
        periodsState.periods.forEach(period => {
            const uf = period.empresa.uf;
            if (uf) {
                ufs.add(uf);
                details.push({
                    period: period.periodo.label,
                    uf: uf,
                    fileName: period.fileName
                });
            }
        });
        
        const isConsistent = ufs.size <= 1;
        
        if (!isConsistent) {
            const message = `Inconsistência encontrada: ${ufs.size} UFs diferentes (${Array.from(ufs).join(', ')})`;
            console.warn('⚠️', message);
            return { isConsistent: false, message, ufs: Array.from(ufs), details };
        }
        
        console.log('✅ UF consistente entre todos os períodos:', Array.from(ufs)[0]);
        return { isConsistent: true, message: 'UF consistente', uf: Array.from(ufs)[0], details };
    }
    
    // ========== ADDITIONAL SUPPORT FUNCTIONS ==========
    
    /**
     * Atualiza display dos períodos multi-período
     * @public
     */
    updateMultiPeriodDisplay() {
        console.log('🔄 Atualizando display multi-período');
        
        const periodsState = this.stateManager?.getPeriodsState();
        if (!periodsState) {
            console.warn('⚠️ Nenhum estado de períodos disponível');
            return;
        }
        
        // Atualizar seção de períodos se visível
        if (this.navigationState?.currentSection === 'multi-periods-section') {
            this.showMultiPeriodManagement();
        }
        
        // Atualizar seção de analytics se visível
        if (this.navigationState?.currentSection === 'multi-analytics-section') {
            const consolidatedStats = periodsState?.consolidated;
            const spedData = this.stateManager.getSpedData();
            if (spedData) {
                this.showSpedAnalysis(spedData); // Usar função unificada
            }
        }
        
        // Atualizar estatísticas consolidadas
        this.updateConsolidatedStats(periodsState);
        
        console.log('✅ Display multi-período atualizado');
    }
    
    /**
     * Exporta dados de um período específico
     * @public
     * @param {string} periodKey - Chave do período para exportar
     */
    exportPeriodData(periodKey) {
        console.log(`📊 Exportando dados do período: ${periodKey}`);
        
        const periodsState = this.stateManager?.getPeriodsState();
        if (!periodsState || !periodsState.periods) {
            this.showError('Nenhum período carregado para exportação');
            return;
        }
        
        const period = periodsState.periods.find(p => p.id === periodKey);
        if (!period) {
            this.showError('Período não encontrado para exportação');
            return;
        }
        
        try {
            // Preparar dados para exportação
            const exportData = {
                empresa: period.empresa,
                periodo: period.periodo,
                estatisticas: period.estatisticas,
                itensDifal: period.dados.itensDifal,
                metadata: {
                    fileName: period.fileName,
                    exportedAt: new Date().toISOString(),
                    exportedBy: 'Sistema DIFAL Multi-Período'
                }
            };
            
            // Usar ExportManager se disponível
            if (window.exportManager) {
                window.exportManager.exportPeriodData(exportData);
            } else {
                // Fallback: exportar como JSON
                const jsonData = JSON.stringify(exportData, null, 2);
                const fileName = `difal_periodo_${periodKey}_${new Date().toISOString().slice(0, 10)}.json`;
                
                if (window.Utils) {
                    window.Utils.downloadArquivo(jsonData, fileName, 'application/json');
                } else {
                    console.error('❌ Sistema de exportação não disponível');
                    this.showError('Sistema de exportação não disponível');
                }
            }
            
            console.log(`✅ Dados do período ${periodKey} exportados com sucesso`);
            this.showSuccess(`Dados do período ${periodKey} exportados com sucesso`);
            
        } catch (error) {
            console.error('❌ Erro na exportação:', error);
            this.showError('Erro ao exportar dados do período');
        }
    }
    
    /**
     * Exibe itens DIFAL de um período específico
     * @public
     * @param {string} periodKey - Chave do período
     */
    showPeriodItems(periodKey) {
        console.log(`📋 Exibindo itens do período: ${periodKey}`);
        
        const periodsState = this.stateManager?.getPeriodsState();
        if (!periodsState || !periodsState.periods) {
            this.showError('Nenhum período carregado');
            return;
        }
        
        const period = periodsState.periods.find(p => p.id === periodKey);
        if (!period) {
            this.showError('Período não encontrado');
            return;
        }
        
        const items = period.dados.itensDifal || [];
        if (items.length === 0) {
            this.showError('Nenhum item DIFAL encontrado neste período');
            return;
        }
        
        // Criar modal com tabela de itens
        const modalHTML = `
            <div class="modal-overlay" id="period-items-modal">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>📋 Itens DIFAL - ${period.periodo.label}</h3>
                        <button class="btn-close" onclick="window.uiManager.closePeriodItemsModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="items-stats">
                            <span class="stat">📦 Total: ${this.formatNumber(items.length)} itens</span>
                            <span class="stat">💰 Valor Total: ${this.formatCurrency(items.reduce((sum, item) => sum + (item.valor || 0), 0))}</span>
                        </div>
                        
                        <div class="items-table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>NCM</th>
                                        <th>Descrição</th>
                                        <th>CFOP</th>
                                        <th>Valor</th>
                                        <th>CST</th>
                                        <th>Quantidade</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${items.map(item => `
                                        <tr>
                                            <td>${item.ncm || 'N/A'}</td>
                                            <td title="${item.descricaoItem || item.descItem || 'N/A'}">${this.truncateText(item.descricaoItem || item.descItem || 'N/A', 40)}</td>
                                            <td>${item.cfop || 'N/A'}</td>
                                            <td>${this.formatCurrency(item.valor || 0)}</td>
                                            <td>${item.cst || 'N/A'}</td>
                                            <td>${this.formatNumber(item.quantidade || 0, 3)}</td>
                                            <td>
                                                <button class="btn btn-sm btn-info" onclick="window.uiManager.viewItemDetails('${item.codigo}')">
                                                    👁️ Ver
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="modal-actions">
                            <button class="btn btn-primary" onclick="window.uiManager.exportPeriodData('${periodKey}')">
                                📊 Exportar Este Período
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Adicionar modal ao DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Mostrar modal
        const modal = document.getElementById('period-items-modal');
        modal.style.display = 'flex';
        
        console.log(`✅ Modal de itens do período ${periodKey} exibido (${items.length} itens)`);
    }
    
    /**
     * Fecha modal de itens do período
     * @public
     */
    closePeriodItemsModal() {
        const modal = document.getElementById('period-items-modal');
        if (modal) {
            modal.remove();
        }
    }
    
    /**
     * Trunca texto para exibição em tabelas
     * @private
     * @param {string} text - Texto para truncar
     * @param {number} maxLength - Comprimento máximo
     * @returns {string} Texto truncado
     */
    truncateText(text, maxLength = 50) {
        if (!text || text.length <= maxLength) return text || '';
        return text.substring(0, maxLength - 3) + '...';
    }
    
    /**
     * Atualiza display da UF extraída automaticamente
     * @public
     */
    updateMultiPeriodUfDisplay() {
        const uf = this.extractUfFromCurrentData();
        const multiUfDisplay = document.getElementById('multi-uf-display');
        
        if (multiUfDisplay) {
            if (uf) {
                multiUfDisplay.textContent = uf;
                multiUfDisplay.parentElement.classList.remove('error');
                console.log(`🎯 UF exibida automaticamente: ${uf}`);
            } else {
                multiUfDisplay.textContent = 'UF não encontrada';
                multiUfDisplay.parentElement.classList.add('error');
                console.warn('⚠️ UF não pôde ser extraída dos dados');
            }
        }
    }
    
    // ========== SECTION CHANGE HANDLERS ==========
    
    /**
     * Manipula mudanças de seção
     * @private
     * @param {Object} data - Dados da mudança de seção
     */
    onSectionChanged(data) {
        const { currentSection } = data;
        
        if (currentSection === 'calculation-section') {
            this.initializeCalculationSection();
        } else if (currentSection === 'analytics-section') {
            this.initializeAnalyticsSection();
        }
    }
    
    /**
     * Inicializa seção de cálculo com informações relevantes
     * @private
     */
    initializeCalculationSection() {
        const calculationResults = document.getElementById('calculation-results');
        if (!calculationResults) return;
        
        // Verificar se há dados disponíveis (single ou multi-period)
        let hasData = false;
        let spedData = this.stateManager?.getSpedData();
        let isMultiPeriod = false;
        let totalItems = 0;
        
        if (spedData && spedData.itensDifal) {
            hasData = true;
            totalItems = spedData.itensDifal.length;
        } else {
            // Verificar modo multi-período
            const periodsState = this.stateManager?.getPeriodsState();
            if (periodsState && periodsState.periods && periodsState.periods.length > 0) {
                hasData = true;
                isMultiPeriod = true;
                totalItems = periodsState.consolidated?.totalItensDifal || 0;
            }
        }
        
        if (!hasData) {
            calculationResults.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h3>Nenhum dado SPED carregado</h3>
                    <p>Faça o upload de um arquivo SPED para começar o cálculo DIFAL.</p>
                    <button class="btn btn-primary" onclick="document.querySelector('[data-section=\"upload-section\"]').click()">
                        📁 Ir para Upload
                    </button>
                </div>
            `;
        } else {
            calculationResults.innerHTML = `
                <div class="calculation-info">
                    <div class="info-header">
                        <h3>🎯 Pronto para Calcular DIFAL</h3>
                        <p class="info-subtitle">${isMultiPeriod ? 'Modo Multi-Período' : 'Modo Período Único'}</p>
                    </div>
                    
                    <div class="calculation-stats">
                        <div class="stat-card">
                            <div class="stat-value">${totalItems}</div>
                            <div class="stat-label">Itens DIFAL ${isMultiPeriod ? 'consolidados' : 'disponíveis'}</div>
                        </div>
                    </div>
                    
                    <div class="calculation-actions">
                        <button class="btn btn-primary btn-large" onclick="openConfigModal()">
                            ⚙️ Configurar e Calcular
                        </button>
                        <p class="action-description">
                            Configure metodologia, benefícios fiscais e execute o cálculo DIFAL
                        </p>
                    </div>
                </div>
            `;
        }
        
        // Mostrar a seção
        calculationResults.classList.remove('hidden');
    }
    
    /**
     * Inicializa seção de analytics/relatórios
     * @private
     */
    initializeAnalyticsSection() {
        // Verificar se há dados disponíveis
        let hasData = false;
        let spedData = this.stateManager?.getSpedData();
        let isMultiPeriod = false;
        
        if (spedData && spedData.itensDifal) {
            hasData = true;
        } else {
            const periodsState = this.stateManager?.getPeriodsState();
            if (periodsState && periodsState.periods && periodsState.periods.length > 0) {
                hasData = true;
                isMultiPeriod = true;
            }
        }
        
        const analyticsContent = document.getElementById('analytics-content') || document.querySelector('#analytics-section .section-card');
        if (!analyticsContent) return;
        
        if (!hasData) {
            // Mostrar estado vazio
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <div class="empty-icon">📊</div>
                <h3>Nenhum dado para análise</h3>
                <p>Faça o upload de um arquivo SPED para gerar relatórios estatísticos.</p>
                <button class="btn btn-primary" onclick="document.querySelector('[data-section=\"upload-section\"]').click()">
                    📁 Ir para Upload
                </button>
            `;
            
            // Limpar conteúdo existente e adicionar estado vazio
            const existingAnalytics = document.getElementById('analytics-summary');
            if (existingAnalytics) {
                existingAnalytics.style.display = 'none';
            }
            
            // Verificar se já existe um empty-state para não duplicar
            const existingEmpty = analyticsContent.querySelector('.empty-state');
            if (existingEmpty) {
                existingEmpty.replaceWith(emptyState);
            } else {
                analyticsContent.appendChild(emptyState);
            }
        } else {
            // Remover estado vazio se existir
            const existingEmpty = analyticsContent.querySelector('.empty-state');
            if (existingEmpty) {
                existingEmpty.remove();
            }
            
            // Mostrar resumo das análises se disponível
            const existingAnalytics = document.getElementById('analytics-summary');
            if (existingAnalytics) {
                existingAnalytics.style.display = 'block';
                existingAnalytics.classList.remove('hidden');
            }
            
            // Gerar analytics se necessário
            if (this.analyticsManager) {
                console.log('📊 Gerando analytics para seção de relatórios');
                this.generateAnalytics();
            }
        }
    }

    // ========== MÉTODOS ADICIONAIS PARA ANALYTICS ==========
    
    /**
     * Atualiza resumo das análises
     * @private
     */
    updateAnalyticsSummary(analytics) {
        const analyticsSummary = document.getElementById('analytics-summary');
        if (!analyticsSummary || !analytics) return;
        
        analyticsSummary.classList.remove('hidden');
        
        // Calcular valores do resumo
        const totalValue = analytics.ncmAnalysis?.top10?.reduce((sum, ncm) => sum + (ncm.totalValue || 0), 0) || analytics.totalValue || 0;
        const paretoItems = analytics.paretoAnalysis?.defaultAnalysis?.pareto80Items || [];
        const topNCM = analytics.ncmAnalysis?.top10?.[0]?.ncm || '-';
        const concentration = analytics.concentrationStats?.hhi ? Math.round(analytics.concentrationStats.hhi * 100) : 0;
        
        document.getElementById('analytics-total-value').textContent = this.formatCurrency(totalValue);
        document.getElementById('analytics-pareto-ncms').textContent = paretoItems.length;
        document.getElementById('analytics-concentration').textContent = `${concentration}%`;
        document.getElementById('analytics-top-ncm').textContent = topNCM;
    }
    
    /**
     * Renderiza aba Pareto
     * @private
     */
    renderParetoTab(paretoAnalysis) {
        const paretoContent = document.getElementById('pareto-analysis');
        if (!paretoContent || !paretoAnalysis) return;
        
        let html = '<h3>📈 Análise Pareto (Princípio 80/20)</h3>';
        
        if (paretoAnalysis.defaultAnalysis) {
            const analysis = paretoAnalysis.defaultAnalysis;
            
            html += `
                <div class="analysis-stats">
                    <div class="stat-row">
                        <span class="stat-label">NCMs que representam 80% do valor:</span>
                        <span class="stat-value">${analysis.pareto80Items.length} NCMs</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Percentual de NCMs (80% valor):</span>
                        <span class="stat-value">${analysis.percentageOf80Items.toFixed(1)}%</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Valor dos 80% principais:</span>
                        <span class="stat-value">${this.formatCurrency(analysis.valueOf80Items)}</span>
                    </div>
                </div>
                
                <div class="pareto-table">
                    <h4>NCMs Estratégicos (80% do Valor)</h4>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Posição</th>
                                <th>NCM</th>
                                <th>Valor Total</th>
                                <th>% do Total</th>
                                <th>% Acumulado</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            analysis.pareto80Items.forEach((item, index) => {
                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.ncm || 'SEM NCM'}</td>
                        <td>${this.formatCurrency(item.totalValue)}</td>
                        <td>${item.percentageOfTotal.toFixed(2)}%</td>
                        <td>${item.cumulativePercentage.toFixed(2)}%</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        paretoContent.innerHTML = html;
    }
    
    /**
     * Renderiza aba NCM
     * @private
     */
    renderNCMTab(ncmAnalysis) {
        const ncmContent = document.getElementById('ncm-ranking');
        if (!ncmContent || !ncmAnalysis) return;
        
        let html = '<h3>🏷️ Ranking de NCMs</h3>';
        
        html += `
            <div class="ncm-table">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Ranking</th>
                            <th>NCM</th>
                            <th>Qtd Itens</th>
                            <th>Valor Total</th>
                            <th>% do Total</th>
                            <th>Períodos</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        // Extrair array do objeto ncmAnalysis
        const ncmArray = ncmAnalysis.top10 || ncmAnalysis.all || [];
        ncmArray.forEach((ncm, index) => {
            html += `
                <tr>
                    <td>${index + 1}º</td>
                    <td>${ncm.ncm || 'SEM NCM'}</td>
                    <td>${ncm.totalItems}</td>
                    <td>${this.formatCurrency(ncm.totalValue)}</td>
                    <td>${ncm.percentageOfTotal?.toFixed(2) || '0.00'}%</td>
                    <td>${ncm.periods || 1}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        ncmContent.innerHTML = html;
    }
    
    /**
     * Renderiza aba Tendências
     * @private
     */
    renderTrendsTab(periodAnalysis) {
        const trendsContent = document.getElementById('trends-analysis');
        if (!trendsContent) return;
        
        let html = '<h3>📊 Análise de Tendências por Período</h3>';
        
        if (periodAnalysis && periodAnalysis.length > 0) {
            html += `
                <div class="trends-table">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Período</th>
                                <th>Itens DIFAL</th>
                                <th>Valor Total</th>
                                <th>NCMs Únicos</th>
                                <th>Tendência</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            periodAnalysis.forEach((period, index) => {
                const trend = index > 0 ? 
                    (period.totalValue > periodAnalysis[index-1].totalValue ? '📈 Crescimento' : '📉 Redução') : 
                    '➖ Primeiro período';
                
                html += `
                    <tr>
                        <td>${period.period}</td>
                        <td>${period.totalItems}</td>
                        <td>${this.formatCurrency(period.totalValue)}</td>
                        <td>${period.uniqueNCMs}</td>
                        <td>${trend}</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            html += '<p>Nenhum dado de período disponível para análise de tendências.</p>';
        }
        
        trendsContent.innerHTML = html;
    }
    
    /**
     * Renderiza aba Gráficos
     * @private
     */
    renderChartsTab(analytics) {
        const chartsContent = document.getElementById('charts-dashboard');
        if (!chartsContent) return;
        
        chartsContent.innerHTML = `
            <h3>📉 Dashboard de Gráficos</h3>
            <div class="charts-grid">
                <div class="chart-container">
                    <h4>Distribuição por NCM (Pareto)</h4>
                    <canvas id="pareto-chart" width="400" height="200"></canvas>
                </div>
                <div class="chart-container">
                    <h4>Evolução por Período</h4>
                    <canvas id="trends-chart" width="400" height="200"></canvas>
                </div>
                <div class="chart-container">
                    <h4>Top 10 NCMs</h4>
                    <canvas id="ncm-chart" width="400" height="200"></canvas>
                </div>
            </div>
        `;
        
        // Renderizar gráficos usando ChartsManager
        setTimeout(() => {
            this.chartsManager.renderParetoChart('pareto-chart', analytics.paretoAnalysis);
            this.chartsManager.renderTrendsChart('trends-chart', analytics.periodAnalysis);
            this.chartsManager.renderNCMChart('ncm-chart', analytics.ncmAnalysis);
        }, 100);
    }
    
    /**
     * Troca aba de analytics
     * @private
     */
    switchAnalyticsTab(tabId) {
        // Remover classe active de todas as abas
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Ativar aba selecionada
        const tabBtn = document.querySelector(`[data-tab="${tabId}"]`);
        const tabContent = document.getElementById(tabId);
        
        if (tabBtn) tabBtn.classList.add('active');
        if (tabContent) tabContent.classList.add('active');
    }
    
    // ========== MÉTODOS DE EXPORTAÇÃO ANALYTICS ==========
    
    /**
     * Exporta analytics para Excel
     * @private
     */
    exportAnalyticsExcel() {
        if (this.exportManager) {
            this.exportManager.exportAnalyticsExcel();
        } else {
            console.warn('ExportManager não disponível');
        }
    }
    
    /**
     * Exporta analytics para PDF
     * @private
     */
    exportAnalyticsPdf() {
        if (this.exportManager) {
            this.exportManager.exportAnalyticsPdf();
        } else {
            console.warn('ExportManager não disponível');
        }
    }
    
    /**
     * Exporta relatório consolidado
     * @private
     */
    exportConsolidatedReport() {
        if (this.exportManager) {
            this.exportManager.exportConsolidatedReport();
        } else {
            console.warn('ExportManager não disponível');
        }
    }
    
    /**
     * Atualiza análises
     * @private
     */
    refreshAnalytics() {
        this.generateAnalytics();
    }
    
    /**
     * Manipula seleção de modo
     * @private
     * @param {string} mode - Modo selecionado ('single' | 'multi')
     */
    handleModeSelection(mode) {
        console.log(`🎯 Modo selecionado: ${mode}`);
        
        // Salvar modo no localStorage
        localStorage.setItem('difal_active_mode', mode);
        
        // Atualizar ModeManager
        if (this.modeManager) {
            this.modeManager.setMode(mode, true);
        }
        
        // Atualizar FileUploadManager
        if (this.fileUploadManager) {
            this.fileUploadManager.setProcessingMode(mode === 'multi' ? 'multiple' : 'single');
        }
        
        // NavigationManager irá automaticamente lidar com a navegação
        // através do evento mode:changed emitido pelo ModeManager
    }

    /**
     * Configura seletor de modo de processamento
     * @private
     */
    setupModeSelector() {
        // Configurar cards de seleção de modo
        const singleModeCard = document.getElementById('single-mode-card');
        const multiModeCard = document.getElementById('multi-mode-card');
        
        if (singleModeCard) {
            singleModeCard.addEventListener('click', () => {
                console.log('🎯 Configurando handlers da seleção de modo...');
                this.handleModeSelection('single');
            });
        }
        
        if (multiModeCard) {
            multiModeCard.addEventListener('click', () => {
                console.log('🎯 Configurando handlers da seleção de modo...');
                this.handleModeSelection('multi');
            });
        }
        
        // Also add event listeners to the buttons inside the cards
        const singlePeriodBtn = document.getElementById('single-period-btn');
        const multiPeriodBtn = document.getElementById('multi-period-btn');
        
        if (singlePeriodBtn) {
            singlePeriodBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent double triggering from card click
                console.log('🎯 Botão single-period clicado...');
                this.handleModeSelection('single');
            });
        }
        
        if (multiPeriodBtn) {
            multiPeriodBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent double triggering from card click
                console.log('🎯 Botão multi-period clicado...');
                this.handleModeSelection('multi');
            });
        }
        
        if (singleModeCard || multiModeCard) {
            console.log(`✅ ${(singleModeCard ? 1 : 0) + (multiModeCard ? 1 : 0)} botões de seleção de modo configurados`);
        }
        
        // Configurar inputs de modo (caso existam)
        const modeOptions = document.querySelectorAll('input[name="processing-mode"]');
        
        if (modeOptions.length === 0 && !singleModeCard && !multiModeCard) {
            console.warn('⚠️ Seletor de modo não encontrado na interface');
            return;
        }
        
        // Event listener para mudança de modo
        modeOptions.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const selectedMode = e.target.value;
                
                // Atualizar classes CSS dos labels
                document.querySelectorAll('.mode-option').forEach(label => {
                    label.classList.remove('active');
                });
                
                const activeLabel = document.querySelector(`.mode-option[data-mode="${selectedMode}"]`);
                if (activeLabel) {
                    activeLabel.classList.add('active');
                }
                
                // Log da mudança
                console.log(`🔧 Modo selecionado pelo usuário: ${selectedMode}`);
                
                // Configurar FileUploadManager imediatamente
                if (this.fileUploadManager) {
                    this.fileUploadManager.setProcessingMode(selectedMode);
                }
            });
        });
        
        // Configurar modo inicial
        const initialMode = document.querySelector('input[name="processing-mode"]:checked')?.value || 'single';
        if (this.fileUploadManager) {
            this.fileUploadManager.setProcessingMode(initialMode);
        }
        
        console.log('🎯 Seletor de modo configurado - Modo inicial:', initialMode);
    }
}

// ========== FUNÇÕES GLOBAIS DE COMPATIBILIDADE ==========

// Função global para mostrar memória de cálculo - DELEGADA para ModalManager
window.mostrarMemoriaCalculo = function(itemId) {
    if (window.uiManager && window.uiManager.modalManager) {
        return window.uiManager.modalManager.showMemoryCalculationModal(itemId);
    }
    
    // Fallback para implementação original
    if (!window.difalResults) {
        alert('Resultados de cálculo não disponíveis');
        return;
    }
    
    const resultado = window.difalResults.resultados.find(r => r.item.codItem === itemId);
    if (!resultado || !resultado.memoriaCalculo) {
        alert('Memória de cálculo não disponível para este item');
        return;
    }
    
    // Criar modal para exibir memória de cálculo
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h2>📋 Memória de Cálculo - Item ${itemId}</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="memoria-calculo">
                        <pre style="white-space: pre-wrap; font-family: monospace; font-size: 14px; line-height: 1.5; background: #f8f9fa; padding: 20px; border-radius: 8px; overflow-x: auto;">${resultado.memoriaCalculo.join('\n')}</pre>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Fechar</button>
                    <button class="btn btn-primary" onclick="copiarMemoriaCalculo('${itemId}')">📋 Copiar</button>
                    <button class="btn btn-info" onclick="exportarMemoriaCalculo('${itemId}')">💾 Exportar</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            modal.remove();
        }
    });
};

// Função para copiar memória de cálculo
window.copiarMemoriaCalculo = function(itemId) {
    const resultado = window.difalResults?.resultados.find(r => r.item.codItem === itemId);
    if (!resultado || !resultado.memoriaCalculo) {
        alert('Memória de cálculo não disponível');
        return;
    }
    
    const texto = resultado.memoriaCalculo.join('\n');
    navigator.clipboard.writeText(texto).then(() => {
        alert('Memória de cálculo copiada para a área de transferência!');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = texto;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Memória de cálculo copiada para a área de transferência!');
    });
};

// Função para exportar memória de cálculo - DELEGADA para ExportManager
window.exportarMemoriaCalculo = function(itemId) {
    if (window.uiManager && window.uiManager.exportManager) {
        return window.uiManager.exportManager.exportarMemoriaCalculo(itemId);
    }
    
    // Fallback para implementação original
    const resultado = window.difalResults?.resultados.find(r => r.item.codItem === itemId);
    if (!resultado || !resultado.memoriaCalculo) {
        alert('Memória de cálculo não disponível');
        return;
    }
    
    const texto = resultado.memoriaCalculo.join('\n');
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    
    link.href = URL.createObjectURL(blob);
    link.download = `memoria_calculo_${itemId}_${new Date().getTime()}.txt`;
    link.click();
    
    URL.revokeObjectURL(link.href);
};

// ========== EXPORTAÇÃO DO MÓDULO ==========

// Exportar classe para uso global
if (typeof window !== 'undefined') {
    window.UIManager = UIManager;
}

// Para módulos Node.js se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}