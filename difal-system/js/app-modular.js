/**
 * App Modular - Aplicação principal do Sistema DIFAL
 * Orquestra todos os módulos modulares integrados com StateManager
 */

class DifalAppModular {
    constructor() {
        // Infraestrutura modular
        this.eventBus = null;
        this.stateManager = null;
        this.configurationManager = null;
        
        // Módulos modulares
        this.spedParser = null;
        this.difalCalculator = null;
        this.uiManager = null;
        
        // Estado da aplicação
        this.currentData = null;
        this.isInitialized = false;
        
        console.log('🚀 DIFAL App Modular criada');
    }

    /**
     * Inicializa a aplicação modular
     */
    async init() {
        try {
            console.log('🔧 Inicializando Sistema DIFAL Modular...');
            
            // Verificar dependências modulares
            this.checkModularDependencies();
            
            // Aguardar DOM ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // Inicializar infraestrutura modular
            this.eventBus = window.eventBus;
            this.stateManager = new StateManager(this.eventBus);
            this.stateManager.init();
            
            // Inicializar ConfigurationManager
            this.configurationManager = new ConfigurationManager(this.eventBus, this.stateManager);
            
            // Inicializar módulos modulares
            this.spedParser = new SpedParserModular(this.eventBus, this.stateManager);
            this.difalCalculator = new DifalCalculatorModular(this.eventBus, this.stateManager);
            
            // Inicializar UI Manager modular (será criado em seguida)
            this.initializeUIManager();
            
            // Configurar event listeners globais
            this.setupModularEventListeners();
            
            // Expor globalmente para compatibilidade
            window.stateManager = this.stateManager;
            window.configurationManager = this.configurationManager;
            window.spedParserModular = this.spedParser;
            window.difalCalculatorModular = this.difalCalculator;
            
            this.isInitialized = true;
            console.log('✅ Sistema DIFAL Modular inicializado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar aplicação modular:', error);
            this.showCriticalError('Erro ao inicializar aplicação', error);
        }
    }

    /**
     * Verifica dependências modulares
     */
    checkModularDependencies() {
        const requiredModular = [
            'StateManager',
            'ConfigurationManager',
            'SpedParserModular',
            'DifalCalculatorModular',
            'Utils',
            'EstadosUtil'
        ];
        
        const missingDependencies = requiredModular.filter(className => !window[className]);
        
        if (missingDependencies.length > 0) {
            throw new Error(`Dependências modulares não encontradas: ${missingDependencies.join(', ')}`);
        }
        
        console.log('✅ Dependências modulares verificadas');
    }

    /**
     * Inicializa UI Manager modular (simplificado)
     */
    initializeUIManager() {
        // Por enquanto, usar funções básicas de UI
        this.setupBasicUIHandlers();
    }

    /**
     * Configura handlers básicos de UI
     */
    setupBasicUIHandlers() {
        // Upload de arquivo
        const fileInput = document.getElementById('file-input');
        const dropZone = document.getElementById('drop-zone');
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.processFile(e.target.files[0]);
                }
            });
        }
        
        if (dropZone) {
            dropZone.addEventListener('click', () => {
                fileInput?.click();
            });
            
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });
            
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('drag-over');
            });
            
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.processFile(files[0]);
                }
            });
        }

        // Navegação
        this.setupNavigation();
        
        // Botões de ação
        this.setupActionButtons();
    }

    /**
     * Configura navegação entre seções
     */
    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        const sections = document.querySelectorAll('.section');
        
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetSection = btn.dataset.section;
                
                // Atualizar navegação
                navButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Mostrar seção
                sections.forEach(section => {
                    section.classList.remove('active');
                });
                
                const target = document.getElementById(targetSection);
                if (target) {
                    target.classList.add('active');
                }
            });
        });
    }

    /**
     * Configura botões de ação
     */
    setupActionButtons() {
        // Botão "Prosseguir para Análise"
        const proceedBtn = document.getElementById('proceed-calculation');
        if (proceedBtn) {
            proceedBtn.addEventListener('click', () => {
                this.showAnalysisSection();
            });
        }

        // Botão "Configurar e Calcular DIFAL"
        const calculateBtn = document.getElementById('calculate-difal');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => {
                this.openConfigModal();
            });
        }

        // Botão "Prosseguir para Cálculo"
        const proceedCalcBtn = document.getElementById('proceed-to-calculation');
        if (proceedCalcBtn) {
            proceedCalcBtn.addEventListener('click', () => {
                this.showCalculationSection();
            });
        }
    }

    /**
     * Configura event listeners modulares
     */
    setupModularEventListeners() {
        // Eventos do parsing
        this.eventBus.on(window.DIFAL_CONSTANTS?.EVENTS?.PARSING_COMPLETED, (data) => {
            this.onParsingCompleted(data);
        });

        // Eventos de cálculo
        this.eventBus.on(window.DIFAL_CONSTANTS?.EVENTS?.CALCULATION_COMPLETED, (data) => {
            this.onCalculationCompleted(data);
        });

        // Eventos de configuração
        this.eventBus.on(window.DIFAL_CONSTANTS?.EVENTS?.CONFIG_CHANGED, (data) => {
            this.onConfigurationChanged(data);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardShortcuts(event);
        });
    }

    /**
     * Processa arquivo SPED
     */
    async processFile(file) {
        if (!this.isInitialized) {
            throw new Error('Aplicação não inicializada');
        }

        try {
            console.log(`📂 Processando arquivo: ${file.name}`);
            
            // Mostrar progresso
            this.showProgress('Processando arquivo SPED...');
            
            // Processar com parser modular
            const resultado = await this.spedParser.processarArquivo(file);
            
            // Armazenar no StateManager
            this.stateManager.setSpedData(resultado);
            this.currentData = resultado;
            
            // Atualizar interface
            this.updateFileInfo(file, resultado);
            this.updateSpedSummary(resultado);
            
            // Mostrar botão para prosseguir
            this.showProceedButton();
            
            this.hideProgress();
            
            console.log('✅ Arquivo processado com sucesso:', resultado);
            
        } catch (error) {
            this.hideProgress();
            console.error('❌ Erro ao processar arquivo:', error);
            this.showError('Erro ao processar arquivo', error.message);
        }
    }

    /**
     * Executa cálculo DIFAL
     */
    async calculateDifal(configGeral = {}) {
        if (!this.currentData || !this.currentData.itensDifal) {
            throw new Error('Nenhum dado SPED disponível para cálculo');
        }

        try {
            console.log('🧮 Iniciando cálculo DIFAL...');
            
            // Mostrar progresso
            this.showProgress('Calculando DIFAL...');
            
            // Determinar UFs
            const ufOrigem = this.currentData.dadosEmpresa?.uf || 'SP';
            const ufDestino = configGeral.ufDestino || ufOrigem;
            
            // Armazenar configuração global
            this.stateManager.setGlobalConfiguration(configGeral);
            
            // Configurar calculadora
            this.difalCalculator.configurarUFs(ufOrigem, ufDestino);
            this.difalCalculator.carregarItens(this.currentData.itensDifal);
            
            // Executar cálculos
            const resultados = this.difalCalculator.calcularTodos();
            const totalizadores = this.difalCalculator.obterTotalizadores();
            
            // Armazenar resultados
            this.stateManager.setCalculationResults({
                resultados,
                totalizadores,
                ufOrigem,
                ufDestino
            });
            
            // Atualizar interface
            this.updateCalculationResults(resultados, totalizadores);
            
            this.hideProgress();
            
            console.log('✅ Cálculo DIFAL concluído:', totalizadores);
            
            return { resultados, totalizadores };
            
        } catch (error) {
            this.hideProgress();
            console.error('❌ Erro no cálculo DIFAL:', error);
            this.showError('Erro no cálculo', error.message);
            throw error;
        }
    }

    // === HANDLERS DE EVENTOS ===

    /**
     * Handler para parsing completo
     */
    onParsingCompleted(data) {
        console.log('📊 Parsing concluído:', data);
    }

    /**
     * Handler para cálculo completo
     */
    onCalculationCompleted(data) {
        console.log('🎯 Cálculo concluído:', data);
    }

    /**
     * Handler para mudança de configuração
     */
    onConfigurationChanged(data) {
        console.log('⚙️ Configuração alterada:', data);
    }

    // === FUNÇÕES DE INTERFACE ===

    /**
     * Mostra seção de análise
     */
    showAnalysisSection() {
        const navBtn = document.querySelector('[data-section="analysis-section"]');
        if (navBtn) {
            navBtn.click();
            
            // Atualizar informações da empresa
            this.updateCompanyInfo();
            
            // Renderizar tabela de itens
            this.renderItemsTable();
        }
    }

    /**
     * Mostra seção de cálculo
     */
    showCalculationSection() {
        const navBtn = document.querySelector('[data-section="calculation-section"]');
        if (navBtn) {
            navBtn.click();
        }
    }

    /**
     * Abre modal de configuração
     */
    openConfigModal() {
        if (window.openConfigModal) {
            window.openConfigModal();
        }
    }

    /**
     * Atualiza informações do arquivo
     */
    updateFileInfo(file, resultado) {
        const fileInfo = document.getElementById('file-info');
        const fileDetails = document.getElementById('file-details');
        
        if (fileInfo && fileDetails) {
            fileDetails.innerHTML = `
                <div class="file-detail-item">
                    <strong>Nome:</strong> ${file.name}
                </div>
                <div class="file-detail-item">
                    <strong>Tamanho:</strong> ${(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
                <div class="file-detail-item">
                    <strong>Empresa:</strong> ${resultado.dadosEmpresa?.razaoSocial || 'N/A'}
                </div>
                <div class="file-detail-item">
                    <strong>CNPJ:</strong> ${resultado.dadosEmpresa?.cnpj || 'N/A'}
                </div>
            `;
            
            fileInfo.classList.remove('hidden');
        }
    }

    /**
     * Atualiza resumo SPED
     */
    updateSpedSummary(resultado) {
        const spedSummary = document.getElementById('sped-summary');
        const summaryGrid = spedSummary?.querySelector('.summary-grid');
        
        if (summaryGrid) {
            summaryGrid.innerHTML = `
                <div class="summary-item">
                    <strong>Registros Processados:</strong> ${resultado.estatisticas?.totalRegistros || 0}
                </div>
                <div class="summary-item">
                    <strong>Itens DIFAL:</strong> ${resultado.itensDifal?.length || 0}
                </div>
                <div class="summary-item">
                    <strong>Tipos de Registro:</strong> ${resultado.estatisticas?.tiposRegistros || 0}
                </div>
            `;
            
            spedSummary.classList.remove('hidden');
        }
    }

    /**
     * Mostra botão para prosseguir
     */
    showProceedButton() {
        const proceedBtn = document.getElementById('proceed-calculation');
        if (proceedBtn) {
            proceedBtn.classList.remove('hidden');
        }
    }

    /**
     * Atualiza informações da empresa
     */
    updateCompanyInfo() {
        const empresa = this.currentData?.dadosEmpresa;
        
        const companyName = document.getElementById('company-name');
        const companyUf = document.getElementById('company-uf');
        
        if (companyName && empresa) {
            companyName.textContent = empresa.razaoSocial || 'N/A';
        }
        
        if (companyUf && empresa) {
            companyUf.textContent = empresa.uf || 'N/A';
        }
    }

    /**
     * Renderiza tabela de itens (simplificada)
     */
    renderItemsTable() {
        const tableContainer = document.getElementById('difal-items-table');
        
        if (!tableContainer || !this.currentData?.itensDifal) {
            return;
        }

        const itens = this.currentData.itensDifal.slice(0, 100); // Limitar para performance
        
        tableContainer.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>NCM</th>
                        <th>Descrição</th>
                        <th>CFOP</th>
                        <th>Base Cálculo</th>
                    </tr>
                </thead>
                <tbody>
                    ${itens.map(item => `
                        <tr>
                            <td>${item.codItem || 'N/A'}</td>
                            <td>${item.ncm || 'N/A'}</td>
                            <td>${(item.descricaoItem || 'Sem descrição').substring(0, 50)}...</td>
                            <td>${item.cfop || 'N/A'}</td>
                            <td>${window.Utils?.formatarMoeda(item.baseCalculoDifal) || item.baseCalculoDifal}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${this.currentData.itensDifal.length > 100 ? `<p class="text-sm text-gray-600 mt-2">Mostrando primeiros 100 de ${this.currentData.itensDifal.length} itens</p>` : ''}
        `;
    }

    // === FUNÇÕES DE PROGRESSO E ERRO ===

    showProgress(message) {
        const progressSection = document.getElementById('progress-section');
        const statusMessage = document.getElementById('status-message');
        
        if (progressSection) {
            progressSection.classList.remove('hidden');
        }
        
        if (statusMessage) {
            statusMessage.textContent = message;
        }
    }

    hideProgress() {
        const progressSection = document.getElementById('progress-section');
        if (progressSection) {
            progressSection.classList.add('hidden');
        }
    }

    showError(title, message) {
        alert(`${title}: ${message}`);
    }

    /**
     * Atalhos de teclado
     */
    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + O - Abrir arquivo
        if ((event.ctrlKey || event.metaKey) && event.key === 'o') {
            event.preventDefault();
            const fileInput = document.getElementById('file-input');
            if (fileInput) {
                fileInput.click();
            }
        }
    }

    /**
     * Mostra erro crítico
     */
    showCriticalError(titulo, error) {
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: white; padding: 2rem; border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 9999;
                max-width: 500px; text-align: center;
            ">
                <h2 style="color: #dc2626; margin-bottom: 1rem;">❌ ${titulo}</h2>
                <p style="margin-bottom: 1rem; color: #374151;">${error.message}</p>
                <button onclick="location.reload()" style="
                    background: #FF1744; color: white; border: none;
                    padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;
                ">Recarregar Página</button>
            </div>
            <div style="
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); z-index: 9998;
            "></div>
        `;
        
        document.body.appendChild(errorDiv);
    }

    /**
     * Atualiza resultados do cálculo
     */
    updateCalculationResults(resultados, totalizadores) {
        const resultsSection = document.getElementById('calculation-results');
        const resultsSummary = document.getElementById('results-summary');
        
        if (resultsSection) {
            resultsSection.classList.remove('hidden');
        }
        
        if (resultsSummary) {
            resultsSummary.innerHTML = `
                <div class="summary-stats">
                    <div class="stat-item">
                        <strong>Total de Itens:</strong> ${totalizadores.totalItens}
                    </div>
                    <div class="stat-item">
                        <strong>Itens com DIFAL:</strong> ${totalizadores.itensComDifal}
                    </div>
                    <div class="stat-item">
                        <strong>Total DIFAL:</strong> ${window.Utils?.formatarMoeda(totalizadores.totalDifal) || totalizadores.totalDifal}
                    </div>
                    <div class="stat-item">
                        <strong>Total FCP:</strong> ${window.Utils?.formatarMoeda(totalizadores.totalFcp) || totalizadores.totalFcp}
                    </div>
                </div>
            `;
        }
    }

    /**
     * Limpa dados da aplicação
     */
    clearData() {
        this.currentData = null;
        this.stateManager?.clearAllData();
        
        console.log('🗑️ Dados da aplicação modular limpos');
    }

    /**
     * Obtém versão da aplicação
     */
    getVersion() {
        return window.DIFAL_CONSTANTS?.VERSION || '3.0.0-modular';
    }
}

// Criar e expor aplicação globalmente
if (typeof window !== 'undefined') {
    window.DifalAppModular = DifalAppModular;
}

// Exportar classe para uso se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DifalAppModular;
}