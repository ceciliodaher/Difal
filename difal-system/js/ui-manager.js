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
            this.navigationManager = new NavigationManager(this.stateManager, this.eventBus);
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
            
            console.log('🎯 Módulos especializados inicializados com sucesso');
        } catch (error) {
            console.error('❌ Erro ao inicializar módulos:', error);
            throw error;
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
        this.navigationManager.navigateToSection('upload-section');
        
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
        this.setupMultiPeriodsEventListeners();
        
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

        // Calculate DIFAL - abre modal de configuração primeiro
        const calculateBtn = document.getElementById('calculate-difal');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => {
                if (typeof openConfigModal === 'function') {
                    openConfigModal();
                } else {
                    this.calculateDifal();
                }
            });
        }

        // Botão Prosseguir para Cálculo - navega sem calcular
        const proceedToCalcBtn = document.getElementById('proceed-to-calculation');
        if (proceedToCalcBtn) {
            proceedToCalcBtn.addEventListener('click', () => {
                this.navigationManager.navigateToSection('calculation-section');
                this.updateCompanyInfo();
                console.log('📍 Navegado para seção de cálculo sem executar cálculo');
            });
        }

        // Export buttons - DELEGADOS para ExportManager
        const exportExcel = document.getElementById('export-excel');
        if (exportExcel) {
            exportExcel.addEventListener('click', () => this.exportToExcel());
        }

        const exportPdf = document.getElementById('export-pdf');
        if (exportPdf) {
            exportPdf.addEventListener('click', () => this.exportToPdf());
        }
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
        const summaryDiv = document.getElementById('sped-summary');
        const tableDiv = document.getElementById('difal-items-table');
        
        if (summaryDiv) {
            // Verificar se estamos em modo multi-período
            let displayData = spedData;
            let isMultiPeriod = false;
            
            // Se não há dados ou é multi-período, tentar obter do PeriodsManager
            if (!spedData || !spedData.dadosEmpresa) {
                const periodsState = this.stateManager?.getPeriodsState();
                if (periodsState && periodsState.periods && periodsState.periods.length > 0) {
                    isMultiPeriod = true;
                    const firstPeriod = periodsState.periods[0];
                    displayData = firstPeriod.dados;
                    console.log('📅 Usando dados do modo multi-período para análise');
                }
            }
            
            // Remover classe hidden e mostrar o div
            summaryDiv.classList.remove('hidden');
            
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
    
    /**
     * Configura event listeners para múltiplos períodos
     * @private
     */
    setupMultiPeriodsEventListeners() {
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
            clearPeriodsBtn.addEventListener('click', () => this.clearAllPeriods());
        }
        
        const generateAnalyticsBtn = document.getElementById('generate-analytics');
        if (generateAnalyticsBtn) {
            generateAnalyticsBtn.addEventListener('click', () => this.generateAnalytics());
        }
        
        const proceedToAnalyticsBtn = document.getElementById('proceed-to-analytics');
        if (proceedToAnalyticsBtn) {
            proceedToAnalyticsBtn.addEventListener('click', () => this.proceedToAnalytics());
        }
    }
    
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
     * Atualiza exibição dos períodos
     * @private
     */
    updatePeriodsDisplay() {
        const periodsState = this.stateManager.getPeriodsState();
        
        // Atualizar informações da empresa atual
        const currentCompanyInfo = document.getElementById('current-company-info');
        if (currentCompanyInfo && periodsState.currentCompany) {
            currentCompanyInfo.classList.remove('hidden');
            
            document.getElementById('current-company-name').textContent = periodsState.currentCompany.razaoSocial || '-';
            document.getElementById('current-company-cnpj').textContent = periodsState.currentCompany.cnpj || '-';
            document.getElementById('current-company-uf').textContent = periodsState.currentCompany.uf || '-';
            document.getElementById('current-company-periods').textContent = periodsState.totalPeriods;
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
        const periodsTable = document.getElementById('periods-table');
        const periodsList = document.getElementById('periods-list');
        
        if (!periodsTable || !periodsList) return;
        
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
            const totalValue = period.itensDifal.reduce((sum, item) => sum + (item.valor || 0), 0);
            
            tableHTML += `
                <tr>
                    <td>${period.dtInicio}-${period.dtFim}</td>
                    <td>${this.formatDate(period.dtInicio)}</td>
                    <td>${this.formatDate(period.dtFim)}</td>
                    <td>${period.itensDifal.length}</td>
                    <td>${this.formatCurrency(totalValue)}</td>
                    <td><span class="status-badge status-success">✅ Processado</span></td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="window.uiManager.viewPeriodDetails('${period.dtInicio}-${period.dtFim}')">
                            👁️ Ver
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.uiManager.removePeriod('${period.dtInicio}-${period.dtFim}')">
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
        
        document.getElementById('consolidated-total-items').textContent = stats.totalItems || 0;
        document.getElementById('consolidated-total-value').textContent = this.formatCurrency(stats.totalValue || 0);
        document.getElementById('consolidated-unique-ncms').textContent = stats.uniqueNCMs || 0;
        document.getElementById('consolidated-periods-count').textContent = periodsState.totalPeriods || 0;
        
        const consolidatedStats = document.getElementById('consolidated-stats');
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
        
        ncmAnalysis.forEach((ncm, index) => {
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
     * Configura seletor de modo de processamento
     * @private
     */
    setupModeSelector() {
        const modeOptions = document.querySelectorAll('input[name="processing-mode"]');
        
        if (modeOptions.length === 0) {
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