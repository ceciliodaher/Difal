/**
 * App.js - Aplicação principal do Sistema DIFAL
 * Orquestra todos os módulos e inicializa o sistema
 */

class DifalApp {
    constructor() {
        this.uiManager = null;
        this.parser = null;
        this.calculator = null;
        this.currentData = null;
        this.isInitialized = false;
    }

    /**
     * Inicializa a aplicação
     */
    async init() {
        try {
            console.log('🚀 Inicializando Sistema DIFAL...');
            
            // Verificar dependências
            this.checkDependencies();
            
            // Aguardar DOM ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // Inicializar UI Manager
            this.uiManager = new UIManager();
            
            // Configurar event listeners globais
            this.setupGlobalEventListeners();
            
            // Inicializar módulos
            this.parser = new SpedParser();
            this.calculator = new DifalCalculator();
            
            this.isInitialized = true;
            console.log('✅ Sistema DIFAL inicializado com sucesso!');
            
            // Log inicial
            
        } catch (error) {
            console.error('❌ Erro ao inicializar aplicação:', error);
            this.showCriticalError('Erro ao inicializar aplicação', error);
        }
    }

    /**
     * Verifica dependências necessárias
     */
    checkDependencies() {
        const requiredClasses = [
            'SpedParser',
            'DifalCalculator', 
            'UIManager',
            'Utils',
            'EstadosUtil'
        ];
        
        const missingDependencies = requiredClasses.filter(className => !window[className]);
        
        if (missingDependencies.length > 0) {
            throw new Error(`Dependências não encontradas: ${missingDependencies.join(', ')}`);
        }
        
        // Verificar bibliotecas externas
        const externalLibs = ['XlsxPopulate'];
        const missingLibs = externalLibs.filter(lib => !window[lib]);
        
        if (missingLibs.length > 0) {
            console.warn(`⚠️ Bibliotecas externas não encontradas: ${missingLibs.join(', ')}`);
        }
        
        console.log('✅ Verificação de dependências concluída');
    }

    /**
     * Configura event listeners globais
     */
    setupGlobalEventListeners() {
        // Tratar erros não capturados
        window.addEventListener('error', (event) => {
            console.error('Erro global capturado:', event.error);
        });

        // Tratar promises rejeitadas
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Promise rejeitada:', event.reason);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardShortcuts(event);
        });

        // Prevent page unload with unsaved data
        window.addEventListener('beforeunload', (event) => {
            if (this.currentData && this.currentData.itensDifal && this.currentData.itensDifal.length > 0) {
                event.preventDefault();
                event.returnValue = 'Você tem dados processados que podem ser perdidos. Deseja realmente sair?';
            }
        });
    }

    /**
     * Gerencia atalhos de teclado
     * @param {KeyboardEvent} event 
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

        // Ctrl/Cmd + S - Exportar Excel
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            if (window.difalResults) {
                this.uiManager?.exportToExcel();
            }
        }

        // Escape - Limpar logs ou fechar modals
        if (event.key === 'Escape') {
            // Implementar lógica de escape se necessário
        }

        // F5 - Atualizar (com confirmação se houver dados)
        if (event.key === 'F5' && this.currentData) {
            event.preventDefault();
            if (confirm('Atualizar a página irá perder os dados processados. Continuar?')) {
                location.reload();
            }
        }
    }

    /**
     * Processa arquivo SPED
     * @param {File} file 
     */
    async processFile(file) {
        if (!this.isInitialized) {
            throw new Error('Aplicação não inicializada');
        }

        try {
            
            // Processar arquivo
            const resultado = await this.parser.processarArquivo(file);
            
            // Armazenar dados
            this.currentData = resultado;
            window.spedData = resultado; // Para compatibilidade
            
            
            return resultado;
            
        } catch (error) {
            throw error;
        }
    }

    /**
     * Executa cálculo DIFAL
     * @param {string} ufOrigem 
     * @param {string} ufDestino 
     */
    async calculateDifal(ufOrigem, ufDestino) {
        if (!this.currentData || !this.currentData.itensDifal) {
            throw new Error('Nenhum dado SPED disponível para cálculo');
        }

        try {
            
            // Configurar calculadora
            this.calculator.configurarUFs(ufOrigem, ufDestino);
            this.calculator.carregarItens(this.currentData.itensDifal);
            
            // Executar cálculos
            const resultados = this.calculator.calcularTodos();
            const totalizadores = this.calculator.obterTotalizadores();
            
            // Armazenar resultados
            window.difalResults = {
                resultados,
                totalizadores,
                calculator: this.calculator
            };
            
            
            return { resultados, totalizadores };
            
        } catch (error) {
            throw error;
        }
    }

    /**
     * Exporta resultados
     * @param {string} formato - 'excel' ou 'csv'
     */
    async exportResults(formato = 'excel') {
        if (!window.difalResults) {
            throw new Error('Nenhum resultado disponível para exportar');
        }

        try {
            
            if (formato === 'excel') {
                await this.uiManager.exportToExcel();
            } else if (formato === 'csv') {
                const dadosExcel = this.calculator.prepararDadosExcel();
                const csv = Utils.arrayParaCsv(dadosExcel.dados);
                Utils.downloadArquivo(csv, 'difal_resultados.csv', 'text/csv');
            } else {
                throw new Error(`Formato não suportado: ${formato}`);
            }
            
        } catch (error) {
            throw error;
        }
    }

    /**
     * Obtém estatísticas do sistema
     */
    getStatistics() {
        const stats = {
            sistema: {
                versao: this.getVersion(),
                inicializado: this.isInitialized,
                tempoInicializacao: Date.now()
            },
            dados: {
                arquivoCarregado: !!this.currentData,
                totalRegistros: this.currentData?.totalRegistros || 0,
                tiposRegistros: this.currentData?.tiposRegistros?.length || 0,
                itensDifal: this.currentData?.itensDifal?.length || 0
            },
            calculos: {
                calculoExecutado: !!window.difalResults,
                totalItens: window.difalResults?.totalizadores?.totalItens || 0,
                totalDifal: window.difalResults?.totalizadores?.totalDifal || 0,
                totalFcp: window.difalResults?.totalizadores?.totalFcp || 0
            },
            logs: {
                totalMensagens: this.uiManager?.logMessages?.length || 0,
                erros: this.uiManager?.logMessages?.filter(m => m.type === 'error')?.length || 0
            }
        };
        
        return stats;
    }

    /**
     * Limpa todos os dados
     */
    clearData() {
        this.currentData = null;
        window.spedData = null;
        window.difalResults = null;
        
        if (this.calculator) {
            this.calculator.limpar();
        }
        
        if (this.uiManager) {
        }
        
        console.log('🗑️ Dados da aplicação limpos');
    }

    /**
     * Reinicia aplicação
     */
    async restart() {
        
        this.clearData();
        this.isInitialized = false;
        
        await this.init();
    }

    /**
     * Obtém versão da aplicação
     */
    getVersion() {
        return '1.0.0';
    }

    /**
     * Mostra erro crítico
     * @param {string} titulo 
     * @param {Error} error 
     */
    showCriticalError(titulo, error) {
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 9999;
                max-width: 500px;
                text-align: center;
            ">
                <h2 style="color: #dc2626; margin-bottom: 1rem;">❌ ${titulo}</h2>
                <p style="margin-bottom: 1rem; color: #374151;">${error.message}</p>
                <button onclick="location.reload()" style="
                    background: #FF1744;
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    cursor: pointer;
                ">Recarregar Página</button>
            </div>
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 9998;
            "></div>
        `;
        
        document.body.appendChild(errorDiv);
    }

    /**
     * Obtém informações de debug
     */
    getDebugInfo() {
        return {
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            statistics: this.getStatistics(),
            dependencies: {
                SpedParser: !!window.SpedParser,
                DifalCalculator: !!window.DifalCalculator,
                UIManager: !!window.UIManager,
                Utils: !!window.Utils,
                EstadosUtil: !!window.EstadosUtil,
                XlsxPopulate: !!window.XlsxPopulate
            }
        };
    }
}

// Inicializar aplicação quando o script for carregado
let difalApp;

// Auto-inicialização
(async () => {
    try {
        difalApp = new DifalApp();
        
        // Aguardar DOM ready se necessário
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                difalApp.init();
            });
        } else {
            await difalApp.init();
        }
        
        // Expor aplicação globalmente para debug
        window.difalApp = difalApp;
        
        // Modal será configurado pelo UIManager
        
    } catch (error) {
        console.error('❌ Falha crítica na inicialização:', error);
        
        // Mostrar erro básico se UI Manager não estiver disponível
        document.addEventListener('DOMContentLoaded', () => {
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = `
                <div style="background: #fee2e2; border: 1px solid #fecaca; color: #dc2626; padding: 1rem; margin: 1rem; border-radius: 4px;">
                    <h3>❌ Erro de Inicialização</h3>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" style="margin-top: 0.5rem; background: #dc2626; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
                        Recarregar
                    </button>
                </div>
            `;
            document.body.insertBefore(errorDiv, document.body.firstChild);
        });
    }
})();
  // Exportar classe para uso se necessário
  if (typeof module !== 'undefined' && module.exports) {
      module.exports = DifalApp;
  }