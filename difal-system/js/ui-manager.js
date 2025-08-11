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
        this.showSection('upload-section');
        
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
                this.showSection('calculation-section');
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
                this.showSection('analysis-section');
                this.updateCompanyInfo();
                
                // CORREÇÃO: Abrir modal de configuração automaticamente
                console.log('🎯 Abrindo modal de configuração automaticamente após análise');
                setTimeout(() => {
                    this.openConfigModal();
                }, 1000); // Delay de 1s para permitir carregamento da seção
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
            const stats = spedData.estatisticasDifal || {};
            summaryDiv.innerHTML = `
                <div class="summary-item">
                    <h3>Arquivo Processado</h3>
                    <div class="summary-value">${spedData.fileName}</div>
                    <div class="summary-label">Arquivo SPED</div>
                </div>
                <div class="summary-item">
                    <h3>Empresa</h3>
                    <div class="summary-value">${spedData.headerInfo.nomeEmpresa}</div>
                    <div class="summary-label">CNPJ: ${Utils.formatarCNPJ(spedData.headerInfo.cnpj)}</div>
                </div>
                <div class="summary-item">
                    <h3>Período</h3>
                    <div class="summary-value">${spedData.headerInfo.periodo}</div>
                    <div class="summary-label">UF: ${spedData.headerInfo.uf}</div>
                </div>
                <div class="summary-item">
                    <h3>Registros Totais</h3>
                    <div class="summary-value">${Utils.formatarNumero(spedData.totalRegistros)}</div>
                    <div class="summary-label">${spedData.tiposRegistros.length} tipos</div>
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
        
        if (tableDiv && spedData.itensDifal && spedData.itensDifal.length > 0) {
            this.createDifalTable(tableDiv, spedData.itensDifal.slice(0, 10)); // Mostrar apenas 10 primeiros
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
        
        this.showSection('calculation-section');
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
        if (!window.spedData || !window.spedData.itensDifal) {
            this.showError('Dados SPED não disponíveis');
            return;
        }

        if (!window.spedData.headerInfo.uf) {
            this.showError('UF da empresa não identificada no SPED');
            return;
        }

        const ufDestino = window.spedData.headerInfo.uf;
        console.log(`Calculando DIFAL para empresa em ${ufDestino}`);
        console.log('Configurações recebidas para cálculo:', config);
        
        this.showProgress('Calculando DIFAL...', 20);
        
        try {
            // Inicializar calculadora
            if (!window.DifalCalculator) {
                throw new Error('DifalCalculator não disponível');
            }
            
            const calculator = new window.DifalCalculator();
            calculator.configurarUFs('OUT', ufDestino);
            
            // Aplicar configurações do modal
            if (config.metodologia && config.metodologia !== 'auto') {
                calculator.configuracao.metodologiaForcada = config.metodologia;
                console.log('🎯 Metodologia forçada:', config.metodologia);
            }
            
            if (config.percentualDestinatario !== undefined) {
                calculator.configuracao.percentualDestinatario = config.percentualDestinatario;
                console.log('📊 Percentual destinatário:', config.percentualDestinatario);
            }
            
            // Configurar benefícios globais se definidos
            this.configurarBeneficiosGlobais(config.beneficiosGlobais, window.spedData.itensDifal);
            
            // Configurar benefícios se existirem
            if (window.difalConfiguracoes) {
                calculator.configurarBeneficios(window.difalConfiguracoes);
            }
            
            calculator.carregarItens(window.spedData.itensDifal);
            
            this.showProgress('Processando cálculos...', 60);
            
            const resultados = calculator.calcularTodos();
            const totalizadores = calculator.obterTotalizadores();
            
            this.showProgress('Cálculo concluído!', 100);
            
            // Armazenar resultados
            window.difalResults = {
                resultados,
                totalizadores,
                calculator
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
        if (!window.spedData || !window.spedData.itensDifal) {
            this.showError('Dados SPED não disponíveis');
            return;
        }

        const ufDestino = window.spedData.headerInfo.uf;
        console.log(`Calculando DIFAL para empresa em ${ufDestino} com metodologia: ${configuracao.metodologia}`);
        
        this.showProgress('Configurando cálculo DIFAL...', 20);
        
        try {
            if (!window.DifalCalculator) {
                throw new Error('DifalCalculator não disponível');
            }
            
            const calculator = new window.DifalCalculator();
            
            if (configuracao.metodologia !== 'auto') {
                calculator.configuracao.metodologiaForcada = configuracao.metodologia;
            }
            
            calculator.configuracao.percentualDestinatario = configuracao.percentualDestinatario;
            calculator.configurarUFs('OUT', ufDestino);
            
            window.difalConfiguracaoGeral = configuracao;
            
            calculator.carregarItens(window.spedData.itensDifal);
            
            this.showProgress('Processando cálculos...', 60);
            
            const resultados = calculator.calcularTodos();
            const totalizadores = calculator.obterTotalizadores();
            
            this.showProgress('Cálculo concluído!', 100);
            
            window.difalResults = {
                resultados,
                totalizadores,
                calculator,
                configuracao
            };
            
            this.showCalculationResults(resultados, totalizadores);
            
        } catch (error) {
            console.error('Erro no cálculo DIFAL:', error);
            this.showError(`Erro no cálculo: ${error.message}`);
        }
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