/**
 * StateManager - Gerenciamento de estado centralizado
 * Implementa padrão State com EventBus para sincronização
 */

class StateManager {
    constructor(eventBus) {
        this.eventBus = eventBus || window.eventBus;
        this.state = {
            // Estado da aplicação
            app: {
                initialized: false,
                currentSection: 'upload-section',
                version: window.DIFAL_CONSTANTS?.VERSION || '3.0.0'
            },
            
            // Estado dos dados SPED
            sped: {
                file: null,
                data: null,
                processed: false,
                summary: null
            },
            
            // Estado de múltiplos períodos
            periods: {
                currentCompany: null,      // { cnpj, razaoSocial, uf, ie }
                periods: [],               // Array de períodos carregados
                totalPeriods: 0,
                consolidated: null,        // Estatísticas consolidadas
                analytics: null            // Análises estatísticas (Pareto, etc.)
            },
            
            // Estado do cálculo DIFAL
            calculation: {
                inProgress: false,
                completed: false,
                results: null,
                totals: null,
                settings: {
                    metodologia: 'auto',
                    cargaEfetiva: null,
                    aliqOrigemEfetiva: null,
                    aliqDestinoEfetiva: null,
                    percentualDestinatario: 100
                }
            },
            
            // Estado da configuração por itens
            itemConfigs: new Map(),
            
            // Estado da UI
            ui: {
                activeModals: [],
                progress: {
                    visible: false,
                    value: 0,
                    message: ''
                },
                filters: {
                    cfop: '',
                    ncm: '', 
                    valorMin: null,
                    busca: ''
                },
                pagination: {
                    page: 1,
                    pageSize: 25,
                    total: 0
                }
            }
        };
        
        this.listeners = new Map();
        this.history = [];
        this.maxHistorySize = 50;
        
        console.log('🏪 StateManager initialized');
    }

    /**
     * Inicializa o gerenciador de estado
     */
    init() {
        this.setupEventListeners();
        this.loadFromStorage();
        this.setState({ app: { initialized: true } });
        
        console.log('✅ StateManager ready');
    }

    /**
     * Configura listeners de eventos
     */
    setupEventListeners() {
        // Auto-salvar configurações quando mudarem
        this.addEventListener('itemConfigs', () => {
            this.saveToStorage();
        });

        // Limpar progresso quando cálculo terminar
        this.addEventListener('calculation.completed', (completed) => {
            if (completed) {
                this.setState({ ui: { progress: { visible: false, value: 100 } } });
            }
        });
    }

    /**
     * Define estado (merge profundo)
     * @param {Object} newState - Novo estado parcial
     * @param {boolean} silent - Se true, não emite eventos
     */
    setState(newState, silent = false) {
        const oldState = this.cloneState(this.state);
        
        // Merge profundo do estado
        this.deepMerge(this.state, newState);
        
        // Adicionar ao histórico
        this.addToHistory(oldState, newState);
        
        if (!silent) {
            // Emitir eventos para propriedades alteradas
            this.emitStateChanges(oldState, this.state, newState);
        }

        return this.state;
    }

    /**
     * Obtém estado atual ou propriedade específica
     * @param {string} path - Caminho da propriedade (ex: 'sped.data')
     * @returns {*}
     */
    getState(path = null) {
        if (!path) {
            return this.cloneState(this.state);
        }

        return this.getNestedProperty(this.state, path);
    }

    /**
     * Adiciona listener para mudanças de estado
     * @param {string} path - Caminho a observar
     * @param {Function} callback - Callback para mudanças
     * @returns {string} - ID do listener
     */
    addEventListener(path, callback) {
        const listenerId = `state_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        if (!this.listeners.has(path)) {
            this.listeners.set(path, new Map());
        }
        
        this.listeners.get(path).set(listenerId, callback);
        
        return listenerId;
    }

    /**
     * Remove listener
     * @param {string} listenerId - ID do listener
     */
    removeEventListener(listenerId) {
        for (const [path, listeners] of this.listeners) {
            if (listeners.has(listenerId)) {
                listeners.delete(listenerId);
                if (listeners.size === 0) {
                    this.listeners.delete(path);
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Define dados SPED (alias para loadSpedData)
     * @param {Object} data - Dados processados
     */
    setSpedData(data) {
        this.setState({
            sped: {
                file: data.nomeArquivo ? { name: data.nomeArquivo } : null,
                data: data,
                processed: true,
                timestamp: Date.now()
            }
        });

        // Emitir evento
        this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.SPED_LOADED, data);
        console.log('📊 SPED Data stored in StateManager:', data);
    }

    /**
     * Carrega arquivo SPED
     * @param {File} file - Arquivo SPED
     * @param {Object} data - Dados processados
     */
    loadSpedData(file, data) {
        this.setState({
            sped: {
                file: {
                    name: file.name,
                    size: file.size,
                    lastModified: file.lastModified
                },
                data,
                processed: true,
                summary: this.generateSpedSummary(data)
            }
        });

        this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.DATA_LOADED, {
            file,
            data
        });
    }

    /**
     * Configura cálculo DIFAL
     * @param {Object} settings - Configurações do cálculo
     */
    configureCalculation(settings) {
        this.setState({
            calculation: {
                settings: { ...this.state.calculation.settings, ...settings }
            }
        });
    }

    /**
     * Inicia cálculo DIFAL
     */
    startCalculation() {
        this.setState({
            calculation: {
                inProgress: true,
                completed: false,
                results: null,
                totals: null
            },
            ui: {
                progress: {
                    visible: true,
                    value: 0,
                    message: 'Iniciando cálculos...'
                }
            }
        });

        this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.CALCULATION_STARTED);
    }

    /**
     * Atualiza progresso do cálculo
     * @param {number} progress - Progresso (0-100)
     * @param {string} message - Mensagem de status
     */
    updateCalculationProgress(progress, message) {
        this.setState({
            ui: {
                progress: {
                    visible: true,
                    value: progress,
                    message
                }
            }
        });

        this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.CALCULATION_PROGRESS, {
            progress,
            message
        });
    }

    /**
     * Completa cálculo DIFAL
     * @param {Object} results - Resultados do cálculo
     * @param {Object} totals - Totalizadores
     */
    completeCalculation(results, totals) {
        this.setState({
            calculation: {
                inProgress: false,
                completed: true,
                results,
                totals
            },
            ui: {
                progress: {
                    visible: false,
                    value: 100,
                    message: 'Cálculos concluídos!'
                }
            }
        });

        this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.CALCULATION_COMPLETED, {
            results,
            totals
        });
    }

    /**
     * Configura item individual
     * @param {string} itemId - ID do item
     * @param {Object} config - Configuração do item
     */
    setItemConfig(itemId, config) {
        const newConfigs = new Map(this.state.itemConfigs);
        newConfigs.set(itemId, config);
        
        this.setState({ itemConfigs: newConfigs });
    }

    /**
     * Obtém configuração de item
     * @param {string} itemId - ID do item
     * @returns {Object|null}
     */
    getItemConfig(itemId) {
        return this.state.itemConfigs.get(itemId) || null;
    }

    /**
     * Obtém configuração de item (alias para compatibilidade com DifalCalculator)
     * @param {string} itemId - ID do item
     * @returns {Object} - Configuração do item ou objeto vazio
     */
    getItemConfiguration(itemId) {
        // Primeiro tenta buscar nas configurações do StateManager
        const stateConfig = this.state.itemConfigs.get(itemId);
        if (stateConfig) {
            return stateConfig;
        }

        // Se não encontrou, busca nas configurações globais (localStorage)
        return window.difalConfiguracoesItens?.[itemId] || {};
    }

    /**
     * Remove configuração de item
     * @param {string} itemId - ID do item
     */
    removeItemConfig(itemId) {
        const newConfigs = new Map(this.state.itemConfigs);
        newConfigs.delete(itemId);
        
        this.setState({ itemConfigs: newConfigs });
    }

    /**
     * Limpa todas as configurações de itens
     */
    clearItemConfigs() {
        this.setState({ itemConfigs: new Map() });
    }

    /**
     * Navega para seção
     * @param {string} section - Nome da seção
     */
    navigateToSection(section) {
        this.setState({ 
            app: { currentSection: section },
            ui: { activeModals: [] } // Fecha modais ao navegar
        });

        this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.SECTION_CHANGED, section);
    }

    /**
     * Abre modal
     * @param {string} modalId - ID do modal
     */
    openModal(modalId) {
        const activeModals = [...this.state.ui.activeModals];
        if (!activeModals.includes(modalId)) {
            activeModals.push(modalId);
        }
        
        this.setState({ ui: { activeModals } });
        this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.MODAL_OPENED, modalId);
    }

    /**
     * Fecha modal
     * @param {string} modalId - ID do modal
     */
    closeModal(modalId) {
        const activeModals = this.state.ui.activeModals.filter(id => id !== modalId);
        
        this.setState({ ui: { activeModals } });
        this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.MODAL_CLOSED, modalId);
    }

    /**
     * Limpa todos os dados
     */
    clearData() {
        this.setState({
            sped: {
                file: null,
                data: null,
                processed: false,
                summary: null
            },
            calculation: {
                inProgress: false,
                completed: false,
                results: null,
                totals: null
            },
            itemConfigs: new Map()
        });

        this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.DATA_CLEARED);
    }

    /**
     * Salva estado no localStorage
     */
    saveToStorage() {
        try {
            const storageData = {
                itemConfigs: Array.from(this.state.itemConfigs.entries()),
                calculationSettings: this.state.calculation.settings,
                timestamp: Date.now()
            };

            localStorage.setItem(
                window.DIFAL_CONSTANTS?.STORAGE?.KEYS?.SETTINGS || 'difal_settings',
                JSON.stringify(storageData)
            );
        } catch (error) {
            console.error('❌ Erro ao salvar no localStorage:', error);
        }
    }

    /**
     * Carrega estado do localStorage
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(
                window.DIFAL_CONSTANTS?.STORAGE?.KEYS?.SETTINGS || 'difal_settings'
            );

            if (stored) {
                const data = JSON.parse(stored);
                const ttl = window.DIFAL_CONSTANTS?.STORAGE?.CACHE_TTL || (24 * 60 * 60 * 1000);

                // Verificar se não expirou
                if (Date.now() - data.timestamp < ttl) {
                    this.setState({
                        itemConfigs: new Map(data.itemConfigs || []),
                        calculation: {
                            settings: { ...this.state.calculation.settings, ...data.calculationSettings }
                        }
                    }, true); // Silent = true para não emitir eventos na inicialização

                    console.log('📥 Estado carregado do localStorage');
                }
            }
        } catch (error) {
            console.error('❌ Erro ao carregar do localStorage:', error);
        }
    }

    /**
     * Obtém estatísticas do estado
     * @returns {Object}
     */
    getStatistics() {
        return {
            sped: {
                hasFile: !!this.state.sped.file,
                hasData: !!this.state.sped.data,
                processed: this.state.sped.processed
            },
            calculation: {
                inProgress: this.state.calculation.inProgress,
                completed: this.state.calculation.completed,
                hasResults: !!this.state.calculation.results
            },
            itemConfigs: {
                count: this.state.itemConfigs.size,
                items: Array.from(this.state.itemConfigs.keys())
            },
            history: {
                count: this.history.length,
                maxSize: this.maxHistorySize
            },
            listeners: {
                paths: this.listeners.size,
                total: Array.from(this.listeners.values()).reduce((sum, map) => sum + map.size, 0)
            }
        };
    }

    // Métodos auxiliares privados

    /**
     * Merge profundo de objetos
     * @param {Object} target - Objeto alvo
     * @param {Object} source - Objeto fonte
     */
    deepMerge(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && !(source[key] instanceof Map)) {
                if (!target[key] || typeof target[key] !== 'object') {
                    target[key] = {};
                }
                this.deepMerge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }

    /**
     * Clona estado profundamente
     * @param {Object} obj - Objeto a clonar
     * @returns {Object}
     */
    cloneState(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Map) return new Map(obj);
        if (obj instanceof Date) return new Date(obj);
        if (Array.isArray(obj)) return obj.map(item => this.cloneState(item));
        
        const cloned = {};
        for (const key in obj) {
            cloned[key] = this.cloneState(obj[key]);
        }
        return cloned;
    }

    /**
     * Obtém propriedade aninhada
     * @param {Object} obj - Objeto
     * @param {string} path - Caminho (ex: 'a.b.c')
     * @returns {*}
     */
    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Emite eventos para mudanças de estado
     * @param {Object} oldState - Estado anterior
     * @param {Object} newState - Estado atual
     * @param {Object} changedPaths - Caminhos alterados
     */
    emitStateChanges(oldState, newState, changedPaths) {
        const paths = this.getChangedPaths('', oldState, newState, changedPaths);
        
        for (const path of paths) {
            if (this.listeners.has(path)) {
                const newValue = this.getNestedProperty(newState, path);
                const listeners = this.listeners.get(path);
                
                for (const callback of listeners.values()) {
                    try {
                        callback(newValue, this.getNestedProperty(oldState, path));
                    } catch (error) {
                        console.error(`❌ StateManager: Erro no listener para '${path}':`, error);
                    }
                }
            }
        }
    }

    /**
     * Obtém caminhos alterados
     * @param {string} prefix - Prefixo do caminho
     * @param {Object} oldObj - Objeto antigo
     * @param {Object} newObj - Objeto novo
     * @param {Object} changed - Objeto de mudanças
     * @returns {Array<string>}
     */
    getChangedPaths(prefix, oldObj, newObj, changed) {
        const paths = [];
        
        for (const key in changed) {
            const currentPath = prefix ? `${prefix}.${key}` : key;
            paths.push(currentPath);
            
            if (changed[key] && typeof changed[key] === 'object' && !Array.isArray(changed[key]) && !(changed[key] instanceof Map)) {
                paths.push(...this.getChangedPaths(currentPath, oldObj?.[key], newObj?.[key], changed[key]));
            }
        }
        
        return paths;
    }

    /**
     * Adiciona ao histórico
     * @param {Object} oldState - Estado anterior
     * @param {Object} changes - Mudanças
     */
    addToHistory(oldState, changes) {
        this.history.push({
            timestamp: Date.now(),
            changes,
            state: this.cloneState(oldState)
        });

        // Manter tamanho do histórico
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    /**
     * Gera resumo dos dados SPED
     * @param {Object} data - Dados SPED
     * @returns {Object}
     */
    generateSpedSummary(data) {
        if (!data || !data.itensDifal) return null;

        return {
            totalItens: data.itensDifal.length,
            valorTotal: data.itensDifal.reduce((sum, item) => sum + (parseFloat(item.valorBase) || 0), 0),
            cfopsUnicos: [...new Set(data.itensDifal.map(item => item.cfop))].length,
            ncmsUnicos: [...new Set(data.itensDifal.map(item => item.ncm))].length,
            periodoApuracao: data.periodoApuracao || null
        };
    }

    /**
     * Configura configuração global do cálculo
     * @param {Object} config - Configuração global
     */
    setGlobalConfiguration(config) {
        this.setState({
            calculation: {
                settings: {
                    ...this.state.calculation.settings,
                    ...config
                }
            }
        });

        this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.CONFIG_CHANGED, config);
        console.log('⚙️ Global configuration updated:', config);
    }

    /**
     * Armazena resultados do cálculo
     * @param {Object} results - Resultados do cálculo
     */
    setCalculationResults(results) {
        this.setState({
            calculation: {
                completed: true,
                results: results.resultados || results,
                totals: results.totalizadores || results.totals,
                ufOrigem: results.ufOrigem,
                ufDestino: results.ufDestino
            }
        });

        this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.CALCULATION_COMPLETED, results);
        console.log('📊 Calculation results stored:', results);
    }

    /**
     * Obtém dados SPED completos
     * @returns {Object|null}
     */
    getSpedData() {
        return this.getState('sped.data');
    }

    /**
     * Obtém itens DIFAL dos dados SPED
     * @returns {Array}
     */
    getDifalItems() {
        const spedData = this.getSpedData();
        return spedData?.itensDifal || [];
    }

    /**
     * Limpa todos os dados
     */
    clearAllData() {
        this.setState({
            sped: {
                file: null,
                data: null,
                processed: false,
                summary: null
            },
            periods: {
                currentCompany: null,
                periods: [],
                totalPeriods: 0,
                consolidated: null,
                analytics: null
            },
            calculation: {
                inProgress: false,
                completed: false,
                results: null,
                totals: null,
                settings: {
                    metodologia: 'auto',
                    cargaEfetiva: null,
                    aliqOrigemEfetiva: null,
                    aliqDestinoEfetiva: null,
                    percentualDestinatario: 100
                }
            },
            itemConfigs: new Map()
        });

        console.log('🗑️ All data cleared');
    }

    /**
     * Atualiza estado de múltiplos períodos
     * @param {Object} periodsData - Dados dos períodos do PeriodsManager
     */
    updatePeriodsState(periodsData) {
        this.setState({
            periods: {
                ...this.state.periods,
                ...periodsData
            }
        });

        this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.PERIODS_UPDATED, periodsData);
        console.log('📅 Periods state updated:', periodsData);
    }

    /**
     * Define dados da empresa atual para múltiplos períodos
     * @param {Object} company - Dados da empresa
     */
    setCurrentCompany(company) {
        this.setState({
            periods: {
                currentCompany: company
            }
        });
        
        console.log('🏢 Current company set:', company);
    }

    /**
     * Obtém dados da empresa atual
     * @returns {Object|null}
     */
    getCurrentCompany() {
        return this.state.periods.currentCompany;
    }

    /**
     * Obtém todos os períodos carregados
     * @returns {Array}
     */
    getAllPeriods() {
        return this.state.periods.periods || [];
    }

    /**
     * Obtém período por ID
     * @param {string} periodId - ID do período
     * @returns {Object|null}
     */
    getPeriodById(periodId) {
        const periods = this.getAllPeriods();
        return periods.find(period => period.id === periodId) || null;
    }

    /**
     * Obtém estatísticas consolidadas dos períodos
     * @returns {Object|null}
     */
    getConsolidatedStats() {
        return this.state.periods.consolidated;
    }
    
    /**
     * Obtém todo o estado de períodos
     * @returns {Object}
     */
    getPeriodsState() {
        return this.state.periods;
    }
    
    /**
     * Obtém estado das análises estatísticas
     * @returns {Object|null}
     */
    getAnalyticsState() {
        return this.state.periods.analytics;
    }

    /**
     * Define análises estatísticas (Pareto, etc.)
     * @param {Object} analytics - Dados das análises
     */
    setAnalytics(analytics) {
        this.setState({
            periods: {
                analytics
            }
        });

        this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.ANALYTICS_UPDATED, analytics);
        console.log('📊 Analytics updated:', analytics);
    }

    /**
     * Obtém análises estatísticas
     * @returns {Object|null}
     */
    getAnalytics() {
        return this.state.periods.analytics;
    }

    /**
     * Verifica se há períodos carregados
     * @returns {boolean}
     */
    hasPeriods() {
        return this.state.periods.totalPeriods > 0;
    }

    /**
     * Obtém itens consolidados de todos os períodos
     * @returns {Array}
     */
    getConsolidatedItems() {
        const allItems = [];
        
        // Primeiro, verificar se há períodos (modo multi-período)
        const periods = this.getAllPeriods();
        if (periods && periods.length > 0) {
            for (const period of periods) {
                if (period.dados && period.dados.itensDifal) {
                    const periodItems = period.dados.itensDifal.map(item => ({
                        ...item,
                        _periodId: period.id,
                        _periodo: period.periodo.label,
                        _fileName: period.fileName
                    }));
                    allItems.push(...periodItems);
                }
            }
        } else {
            // Se não há períodos, verificar dados single (modo período único)
            const singleData = this.getState();
            if (singleData && singleData.dados && singleData.dados.itensDifal) {
                const singleItems = singleData.dados.itensDifal.map(item => ({
                    ...item,
                    _periodId: 'single',
                    _periodo: 'Período Único',
                    _fileName: singleData.fileName || 'arquivo.txt'
                }));
                allItems.push(...singleItems);
            }
        }
        
        return allItems;
    }
}

// Expor globalmente para uso no browser
if (typeof window !== 'undefined') {
    window.StateManager = StateManager;
}

// Exportar classe para uso se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateManager;
}