/**
 * MultiPeriodManager - Gerenciador de múltiplos períodos SPED
 * Duplicated from SinglePeriodManager pattern following user instructions
 * @version 2.0.0
 */
class MultiPeriodManager {
    constructor(eventBus, stateManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.periods = [];
        this.maxPeriods = 12;
        this.currentCompany = null;
        
        console.log('📅 MultiPeriodManager initialized');
        this.init();
    }
    
    init() {
        console.log('🚀 Initializing MultiPeriodManager');
        
        // Event listeners for multi-period operations
        if (this.eventBus) {
            this.eventBus.on('period-added', this.handlePeriodAdded.bind(this));
            this.eventBus.on('period-removed', this.handlePeriodRemoved.bind(this));
        }
    }
    
    /**
     * Add a period to the multi-period analysis
     * @param {Object} spedData - SPED data for the period
     */
    async addPeriod(spedData) {
        if (!spedData) {
            throw new Error('Dados SPED inválidos');
        }
        
        // Validate company consistency
        if (this.currentCompany && this.currentCompany.cnpj !== spedData.dadosEmpresa?.cnpj) {
            throw new Error(`CNPJ inconsistente. Esperado: ${this.currentCompany.cnpj}, Recebido: ${spedData.dadosEmpresa?.cnpj}`);
        }
        
        // Check max periods limit
        if (this.periods.length >= this.maxPeriods) {
            throw new Error(`Limite máximo de ${this.maxPeriods} períodos atingido`);
        }
        
        // Set current company if first period
        if (!this.currentCompany && spedData.dadosEmpresa) {
            this.currentCompany = {
                cnpj: spedData.dadosEmpresa.cnpj,
                razaoSocial: spedData.dadosEmpresa.razaoSocial,
                uf: spedData.dadosEmpresa.uf
            };
        }
        
        // Create period object
        const period = {
            id: `period_${Date.now()}`,
            dados: spedData,
            periodo: {
                label: spedData.periodoApuracao || 'N/A',
                dataInicial: spedData.dataInicial,
                dataFinal: spedData.dataFinal
            },
            addedAt: new Date()
        };
        
        this.periods.push(period);
        
        // Update state manager
        if (this.stateManager) {
            this.stateManager.updatePeriodsState({
                periods: this.periods,
                currentCompany: this.currentCompany,
                totalPeriods: this.periods.length
            });
        }
        
        // Emit event
        if (this.eventBus) {
            this.eventBus.emit('period-added', period);
        }
        
        console.log(`✅ Período adicionado: ${period.periodo.label}. Total: ${this.periods.length} períodos`);
        return period;
    }
    
    /**
     * Remove a period
     * @param {string} periodId - Period ID to remove
     */
    removePeriod(periodId) {
        const index = this.periods.findIndex(p => p.id === periodId);
        if (index === -1) {
            throw new Error('Período não encontrado');
        }
        
        const removedPeriod = this.periods.splice(index, 1)[0];
        
        // Update state manager
        if (this.stateManager) {
            this.stateManager.updatePeriodsState({
                periods: this.periods,
                currentCompany: this.currentCompany,
                totalPeriods: this.periods.length
            });
        }
        
        // Emit event
        if (this.eventBus) {
            this.eventBus.emit('period-removed', removedPeriod);
        }
        
        console.log(`🗑️ Período removido: ${removedPeriod.periodo.label}. Total: ${this.periods.length} períodos`);
        return removedPeriod;
    }
    
    /**
     * Clear all periods
     */
    clearAllPeriods() {
        const count = this.periods.length;
        this.periods = [];
        this.currentCompany = null;
        
        // Update state manager
        if (this.stateManager) {
            this.stateManager.updatePeriodsState({
                periods: [],
                currentCompany: null,
                totalPeriods: 0
            });
        }
        
        console.log(`🧹 ${count} períodos removidos. MultiPeriodManager limpo.`);
    }
    
    /**
     * Get consolidated items from all periods
     */
    getConsolidatedItems() {
        const consolidatedItems = [];
        
        this.periods.forEach(period => {
            const items = period.dados?.itensDifal || [];
            items.forEach(item => {
                consolidatedItems.push({
                    ...item,
                    _periodo: period.periodo.label,
                    _periodId: period.id
                });
            });
        });
        
        return consolidatedItems;
    }
    
    /**
     * Get consolidated statistics
     */
    getConsolidatedStats() {
        const consolidatedItems = this.getConsolidatedItems();
        const totalValue = consolidatedItems.reduce((sum, item) => sum + (item.valor || 0), 0);
        
        return {
            totalPeriods: this.periods.length,
            totalItems: consolidatedItems.length,
            totalValue: totalValue,
            company: this.currentCompany
        };
    }
    
    /**
     * Check if more periods can be added
     */
    canAddMorePeriods() {
        return this.periods.length < this.maxPeriods;
    }
    
    /**
     * Get current company
     */
    getCurrentCompany() {
        return this.currentCompany;
    }
    
    /**
     * Check if has periods
     */
    hasPeriods() {
        return this.periods.length > 0;
    }
    
    /**
     * Handle period added event
     */
    handlePeriodAdded(period) {
        console.log(`📅 Period added event: ${period.periodo.label}`);
    }
    
    /**
     * Handle period removed event
     */
    handlePeriodRemoved(period) {
        console.log(`📅 Period removed event: ${period.periodo.label}`);
    }
    
    /**
     * Get debug info
     */
    getDebugInfo() {
        return {
            periodsCount: this.periods.length,
            maxPeriods: this.maxPeriods,
            currentCompany: this.currentCompany,
            periods: this.periods.map(p => ({
                id: p.id,
                label: p.periodo.label,
                itemsCount: p.dados?.itensDifal?.length || 0
            }))
        };
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.MultiPeriodManager = MultiPeriodManager;
}

// Node.js support
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiPeriodManager;
}