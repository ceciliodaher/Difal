/**
 * App.js - Sistema DIFAL Modular - Orquestrador Limpo
 * Baseado na arquitetura app.js original (426 linhas) → Refatorado para ~150 linhas
 * RESPONSABILIDADE: Apenas orquestração, inicialização e delegação
 */

class DifalAppModular {
    constructor() {
        // SINGLETON PATTERN: Garantir que apenas uma instância existe
        if (DifalAppModular.instance) {
            console.log('⚠️ DifalAppModular: Instância singleton já existe, retornando existente');
            return DifalAppModular.instance;
        }
        
        // Infraestrutura modular
        this.eventBus = null;
        this.modeManager = null;
        this.stateManager = null;
        // REMOVIDO: singlePeriodManager e multiPeriodManager (duplicações deletadas)
        // this.singlePeriodManager = null; // Era duplicação do StateManager
        // this.multiPeriodManager = null;  // Era duplicação do PeriodsManager
        this.configurationManager = null;
        
        // Módulos modulares especializados
        this.uiManager = null;
        this.spedParser = null;
        this.difalCalculator = null;
        
        // Estado mínimo
        this.currentData = null;
        this.isInitialized = false;
        
        // Armazenar instância singleton
        DifalAppModular.instance = this;
        
        console.log('🚀 DifalAppModular - Orquestrador Limpo (Singleton)');
    }

    /**
     * Inicializa a aplicação modular
     */
    async init() {
        try {
            console.log('🔧 Inicializando Sistema DIFAL Modular...');
            
            await this.waitForDOM();
            await this.checkModularDependencies();
            
            // Inicializar infraestrutura modular
            this.initializeInfrastructure();
            
            // Inicializar módulos especializados
            this.initializeModules();
            
            // Expor globalmente para compatibilidade
            this.exposeGlobally();
            
            // Configurar coordenação de eventos
            this.setupEventCoordination();
            
            this.isInitialized = true;
            console.log('✅ Sistema DIFAL Modular pronto!');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar aplicação modular:', error);
            this.showCriticalError('Erro ao inicializar aplicação', error);
        }
    }

    /**
     * Aguarda DOM ready
     */
    async waitForDOM() {
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
    }

    /**
     * Inicializa infraestrutura modular
     */
    initializeInfrastructure() {
        this.eventBus = window.eventBus;
        
        // Inicializar StateManager primeiro
        this.stateManager = new StateManager(this.eventBus);
        this.stateManager.init();
        
        // ARQUITETURA LIMPA: Removidos gerenciadores duplicados
        // singlePeriodManager era duplicação do StateManager
        // multiPeriodManager era duplicação do PeriodsManager
        
        // Inicializar ModeManager como coordenador central
        this.modeManager = new ModeManager(this.eventBus);
        this.modeManager.initialize({
            single: this.stateManager,  // StateManager unificado
            multi: this.stateManager    // StateManager unificado  
        });
        
        // IMPORTANTE: Expor ModeManager globalmente ANTES de inicializar UIManager
        window.modeManager = this.modeManager;
        window.stateManager = this.stateManager;
        // REMOVIDO: window.singlePeriodManager e window.multiPeriodManager
        // Agora usamos apenas StateManager unificado
        
        this.configurationManager = new ConfigurationManager(this.eventBus, this.stateManager);
        window.configurationManager = this.configurationManager;
    }

    /**
     * Inicializa módulos especializados
     */
    initializeModules() {
        // UI Manager (responsável por toda interface) - usa StateManager
        this.uiManager = new UIManager(this.eventBus, this.stateManager);
        
        // Periods Manager (gerenciamento de múltiplos períodos)
        this.periodsManager = new PeriodsManager(this.stateManager, this.eventBus);
        
        // Parsers e Calculators modulares
        this.spedParser = new SpedParserModular(this.eventBus, this.modeManager);
        this.difalCalculator = new DifalCalculatorSimple(this.eventBus, this.modeManager);
    }

    /**
     * Expõe módulos globalmente para compatibilidade
     */
    exposeGlobally() {
        // ModeManager e StateManager já foram expostos em initializeInfrastructure
        // Aqui apenas adicionamos UIManager e PeriodsManager após sua criação
        window.uiManager = this.uiManager;
        window.periodsManager = this.periodsManager;
    }

    /**
     * Configura coordenação de eventos entre módulos
     */
    setupEventCoordination() {
        // Eventos de parsing
        this.eventBus?.on(window.DIFAL_CONSTANTS?.EVENTS?.PARSING_COMPLETED, (data) => {
            this.onParsingCompleted(data);
        });

        // Eventos de cálculo
        this.eventBus?.on(window.DIFAL_CONSTANTS?.EVENTS?.CALCULATION_COMPLETED, (data) => {
            this.onCalculationCompleted(data);
        });

        // Keyboard shortcuts globais
        document.addEventListener('keydown', (event) => {
            this.handleGlobalKeyboardShortcuts(event);
        });
    }

    /**
     * Verifica dependências modulares necessárias com retry
     */
    async checkModularDependencies(maxRetries = 10, retryDelay = 100) {
        const required = [
            'StateManager', 'Utils', 'EstadosUtil'
        ];
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const missing = required.filter(className => !window[className]);
            
            if (missing.length === 0) {
                console.log('✅ Dependências modulares verificadas');
                return;
            }
            
            console.log(`🔄 Tentativa ${attempt}/${maxRetries} - Dependências faltando:`, missing);
            
            if (attempt === maxRetries) {
                throw new Error(`Dependências modulares não encontradas após ${maxRetries} tentativas: ${missing.join(', ')}`);
            }
            
            // Aguardar um pouco antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }

    // === MÉTODOS DE ORQUESTRAÇÃO (DELEGAÇÃO) ===

    /**
     * Processa arquivo SPED (DELEGADO para SpedParserModular)
     */
    async processFile(file) {
        if (!this.isInitialized) {
            throw new Error('Aplicação não inicializada');
        }

        console.log(`📂 Orquestrando processamento: ${file.name}`);
        const resultado = await this.spedParser.processarArquivo(file);
        this.stateManager.setSpedData(resultado);
        this.currentData = resultado;
        return resultado;
    }

    /**
     * Executa cálculo DIFAL (DELEGADO para DifalCalculatorModular)
     */
    async calculateDifal(configGeral = {}) {
        const spedData = this.stateManager.getSpedData();
        if (!spedData || !spedData.itensDifal) {
            throw new Error('Nenhum dado SPED disponível para cálculo');
        }

        console.log('🧮 Orquestrando cálculo DIFAL...');
        
        // CORRETO: Empresa do SPED = DESTINO (onde chega a mercadoria)
        const ufDestino = spedData.dadosEmpresa?.uf || 'GO';
        // Origem = de onde vem a mercadoria (fornecedor) - deve ser diferente para gerar DIFAL
        const ufOrigem = configGeral.ufOrigem || (ufDestino === 'SP' ? 'MG' : 'SP');
        
        this.stateManager.setGlobalConfiguration(configGeral);
        
        this.difalCalculator.configurarUFs(ufOrigem, ufDestino);
        this.difalCalculator.carregarItens(spedData.itensDifal);
        
        const resultados = this.difalCalculator.calcularTodos();
        const totalizadores = this.difalCalculator.obterTotalizadores();
        
        this.stateManager.setCalculationResults({
            resultados, totalizadores, ufOrigem, ufDestino
        });
        
        return { resultados, totalizadores };
    }

    // === HANDLERS DE EVENTOS MODULARES ===

    onParsingCompleted(data) {
        console.log('📊 Parsing concluído (evento coordenado):', data);
    }

    onCalculationCompleted(data) {
        console.log('🎯 Cálculo concluído (evento coordenado):', data);
    }

    // === NAVEGAÇÃO (DELEGADA PARA UI MANAGER) ===

    showAnalysisSection() {
        const navBtn = document.querySelector('[data-section="analysis-section"]');
        if (navBtn) navBtn.click();
    }

    showCalculationSection() {
        const navBtn = document.querySelector('[data-section="calculation-section"]');
        if (navBtn) navBtn.click();
    }

    // === ATALHOS DE TECLADO GLOBAIS ===

    handleGlobalKeyboardShortcuts(event) {
        // Ctrl/Cmd + O - Abrir arquivo
        if ((event.ctrlKey || event.metaKey) && event.key === 'o') {
            event.preventDefault();
            const fileInput = document.getElementById('file-input');
            if (fileInput) fileInput.click();
        }

        // F5 - Atualizar (com confirmação se houver dados)
        if (event.key === 'F5' && this.currentData) {
            event.preventDefault();
            if (confirm('Atualizar a página irá perder os dados processados. Continuar?')) {
                location.reload();
            }
        }
    }

    // === UTILITÁRIOS ===

    showCriticalError(titulo, error) {
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                        background: white; padding: 2rem; border-radius: 8px;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 9999;">
                <h2 style="color: #dc2626; margin-bottom: 1rem;">❌ ${titulo}</h2>
                <p style="margin-bottom: 1rem;">${error.message}</p>
                <button onclick="location.reload()" style="background: #dc2626; color: white; border: none; 
                        padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">Recarregar</button>
            </div>
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.5); z-index: 9998;"></div>
        `;
        document.body.appendChild(errorDiv);
    }
}

// Inicializar aplicação modular
(async () => {
    try {
        const difalApp = new DifalAppModular();
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => difalApp.init());
        } else {
            await difalApp.init();
        }
        
        // Expor aplicação globalmente
        window.difalApp = difalApp;
        
    } catch (error) {
        console.error('❌ Falha crítica na inicialização:', error);
    }
})();

// Exportar classe
if (typeof window !== 'undefined') {
    window.DifalAppModular = DifalAppModular;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DifalAppModular;
}