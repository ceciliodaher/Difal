/**
 * @fileoverview Periods Manager - Gerenciamento de múltiplos períodos SPED
 * @module PeriodsManager
 * @description Responsável por gerenciar múltiplos arquivos SPED da mesma empresa,
 * validando períodos distintos e CNPJ consistente.
 * 
 * @author Sistema DIFAL
 * @version 1.0.0
 * @since 2025-01-11
 */

/**
 * @class PeriodsManager
 * @classdesc Gerencia múltiplos períodos SPED de uma empresa
 */
class PeriodsManager {
    /**
     * @constructor
     * @param {StateManager} stateManager - Instância do gerenciador de estado
     * @param {EventBus} eventBus - Instância do barramento de eventos
     */
    constructor(stateManager, eventBus) {
        this.stateManager = stateManager;
        this.eventBus = eventBus;
        
        // Configurações
        this.config = {
            maxPeriods: 12, // Máximo 12 períodos por empresa
            requiredSameCNPJ: true,
            allowOverlapPeriods: false
        };
        
        // Estado interno
        this.currentCompany = null; // { cnpj, razaoSocial }
        this.periods = new Map(); // periodId -> periodData
        
        console.log('📅 PeriodsManager inicializado');
    }

    /**
     * Adiciona novo período SPED
     * @param {Object} spedData - Dados do SPED processado
     * @returns {Promise<Object>} Resultado da validação e adição
     */
    async addPeriod(spedData) {
        try {
            console.log('📅 Adicionando período:', spedData.metadata?.fileName);
            
            // Validar dados básicos
            if (!spedData.dadosEmpresa) {
                throw new Error('Dados da empresa não encontrados no SPED');
            }
            
            const empresa = spedData.dadosEmpresa;
            const periodId = this.generatePeriodId(empresa.dtInicio, empresa.dtFim);
            
            // Validar empresa (CNPJ deve ser consistente)
            if (this.currentCompany && this.currentCompany.cnpj !== empresa.cnpj) {
                throw new Error(`CNPJ inconsistente. Esperado: ${this.currentCompany.cnpj}, Recebido: ${empresa.cnpj}`);
            }
            
            // Primeira empresa - definir como atual
            if (!this.currentCompany) {
                this.currentCompany = {
                    cnpj: empresa.cnpj,
                    razaoSocial: empresa.razaoSocial,
                    uf: empresa.uf,
                    ie: empresa.ie
                };
                console.log('🏢 Empresa definida:', this.currentCompany.razaoSocial);
            }
            
            // Validar se período já existe
            if (this.periods.has(periodId)) {
                throw new Error(`Período ${periodId} já foi carregado`);
            }
            
            // Validar limite de períodos
            if (this.periods.size >= this.config.maxPeriods) {
                throw new Error(`Máximo de ${this.config.maxPeriods} períodos permitido`);
            }
            
            // Validar sobreposição de períodos
            const novoPeriodo = {
                inicio: this.parseDate(empresa.dtInicio),
                fim: this.parseDate(empresa.dtFim)
            };
            
            if (!this.config.allowOverlapPeriods && this.hasOverlap(novoPeriodo)) {
                throw new Error('Período sobrepõe com período já existente');
            }
            
            // Criar dados do período
            const periodData = {
                id: periodId,
                fileName: spedData.metadata?.fileName || 'arquivo.txt',
                periodo: {
                    inicio: empresa.dtInicio,
                    fim: empresa.dtFim,
                    inicioDate: novoPeriodo.inicio,
                    fimDate: novoPeriodo.fim,
                    label: this.formatPeriodLabel(novoPeriodo.inicio, novoPeriodo.fim)
                },
                empresa: { ...empresa },
                estatisticas: {
                    totalItens: spedData.itensDifal?.length || 0,
                    totalLinhas: spedData.estatisticas?.totalLinhas || 0,
                    ncmsUnicos: this.countUniqueNCMs(spedData.itensDifal)
                },
                dados: {
                    itensDifal: spedData.itensDifal || [],
                    registros: spedData.registros || {},
                    catalogoProdutos: spedData.catalogoProdutos || {}
                },
                adicionadoEm: new Date(),
                processado: false // Será true após cálculo DIFAL
            };
            
            // Adicionar período
            this.periods.set(periodId, periodData);
            
            // Atualizar StateManager
            await this.updateStateManager();
            
            // Emitir evento
            this.eventBus?.emit('PERIOD_ADDED', {
                periodId,
                company: this.currentCompany,
                totalPeriods: this.periods.size,
                periodo: periodData.periodo
            });
            
            console.log(`✅ Período ${periodId} adicionado com sucesso`);
            
            return {
                success: true,
                periodId,
                periodLabel: periodData.periodo.label,
                totalPeriods: this.periods.size,
                canAddMore: this.periods.size < this.config.maxPeriods
            };
            
        } catch (error) {
            console.error('❌ Erro ao adicionar período:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Remove período
     * @param {string} periodId - ID do período
     * @returns {boolean} Sucesso na remoção
     */
    removePeriod(periodId) {
        try {
            if (!this.periods.has(periodId)) {
                throw new Error(`Período ${periodId} não encontrado`);
            }
            
            const periodData = this.periods.get(periodId);
            this.periods.delete(periodId);
            
            // Se não há mais períodos, resetar empresa
            if (this.periods.size === 0) {
                this.currentCompany = null;
            }
            
            // Atualizar StateManager
            this.updateStateManager();
            
            // Emitir evento
            this.eventBus?.emit('PERIOD_REMOVED', {
                periodId,
                periodLabel: periodData.periodo.label,
                totalPeriods: this.periods.size
            });
            
            console.log(`✅ Período ${periodId} removido`);
            return true;
            
        } catch (error) {
            console.error('❌ Erro ao remover período:', error);
            return false;
        }
    }

    /**
     * Limpa todos os períodos
     */
    clearAllPeriods() {
        const totalRemoved = this.periods.size;
        this.periods.clear();
        this.currentCompany = null;
        
        this.updateStateManager();
        
        this.eventBus?.emit('ALL_PERIODS_CLEARED', {
            totalRemoved
        });
        
        console.log(`🧹 ${totalRemoved} períodos removidos`);
    }

    /**
     * Obtém todos os períodos consolidados para cálculo
     * @returns {Array} Itens DIFAL de todos os períodos
     */
    getConsolidatedItems() {
        const allItems = [];
        
        for (const [periodId, periodData] of this.periods) {
            const items = periodData.dados.itensDifal.map(item => ({
                ...item,
                _periodId: periodId,
                _periodo: periodData.periodo.label,
                _fileName: periodData.fileName
            }));
            
            allItems.push(...items);
        }
        
        console.log(`📊 ${allItems.length} itens consolidados de ${this.periods.size} períodos`);
        return allItems;
    }

    /**
     * Obtém estatísticas consolidadas
     * @returns {Object} Estatísticas de todos os períodos
     */
    getConsolidatedStats() {
        let totalItens = 0;
        let totalLinhas = 0;
        const ncmsSet = new Set();
        const cfopsSet = new Set();
        const periodos = [];
        
        for (const [periodId, periodData] of this.periods) {
            totalItens += periodData.estatisticas.totalItens;
            totalLinhas += periodData.estatisticas.totalLinhas;
            
            // NCMs únicos
            periodData.dados.itensDifal.forEach(item => {
                if (item.ncm) ncmsSet.add(item.ncm);
                if (item.cfop) cfopsSet.add(item.cfop);
            });
            
            periodos.push({
                id: periodId,
                label: periodData.periodo.label,
                itens: periodData.estatisticas.totalItens
            });
        }
        
        return {
            totalPeriods: this.periods.size,
            totalItens,
            totalLinhas,
            ncmsUnicos: ncmsSet.size,
            cfopsUnicos: cfopsSet.size,
            periodos: periodos.sort((a, b) => a.label.localeCompare(b.label)),
            empresa: this.currentCompany
        };
    }

    // ========== MÉTODOS PRIVADOS ==========

    /**
     * Gera ID único do período
     * @private
     */
    generatePeriodId(dtInicio, dtFim) {
        // Formato: YYYYMM-YYYYMM
        const inicio = dtInicio.replace(/(\d{2})(\d{2})(\d{4})/, '$3$2');
        const fim = dtFim.replace(/(\d{2})(\d{2})(\d{4})/, '$3$2');
        return `${inicio}-${fim}`;
    }

    /**
     * Converte data string para objeto Date
     * @private
     */
    parseDate(dateString) {
        // Formato: DDMMYYYY -> YYYY-MM-DD
        const day = dateString.substring(0, 2);
        const month = dateString.substring(2, 4);
        const year = dateString.substring(4, 8);
        return new Date(`${year}-${month}-${day}`);
    }

    /**
     * Formata label do período
     * @private
     */
    formatPeriodLabel(inicio, fim) {
        const formatDate = date => date.toLocaleDateString('pt-BR', {
            month: '2-digit',
            year: 'numeric'
        });
        
        return `${formatDate(inicio)} a ${formatDate(fim)}`;
    }

    /**
     * Verifica sobreposição de períodos
     * @private
     */
    hasOverlap(novoPeriodo) {
        for (const [_, periodData] of this.periods) {
            const periodoExistente = {
                inicio: periodData.periodo.inicioDate,
                fim: periodData.periodo.fimDate
            };
            
            // Verificar sobreposição
            if (novoPeriodo.inicio <= periodoExistente.fim && 
                novoPeriodo.fim >= periodoExistente.inicio) {
                return true;
            }
        }
        return false;
    }

    /**
     * Conta NCMs únicos
     * @private
     */
    countUniqueNCMs(itens) {
        const ncms = new Set();
        itens?.forEach(item => {
            if (item.ncm) ncms.add(item.ncm);
        });
        return ncms.size;
    }

    /**
     * Atualiza StateManager com dados dos períodos
     * @private
     */
    async updateStateManager() {
        try {
            // Converter Map para Array para serialização
            const periodsArray = Array.from(this.periods.entries()).map(([id, data]) => ({
                id,
                ...data
            }));
            
            this.stateManager.updatePeriodsState({
                currentCompany: this.currentCompany,
                periods: periodsArray,
                totalPeriods: this.periods.size,
                consolidated: this.getConsolidatedStats()
            });
            
        } catch (error) {
            console.error('❌ Erro ao atualizar StateManager:', error);
        }
    }

    // ========== MÉTODOS PÚBLICOS DE CONSULTA ==========

    /**
     * Obtém período por ID
     */
    getPeriod(periodId) {
        return this.periods.get(periodId);
    }

    /**
     * Lista todos os períodos
     */
    getAllPeriods() {
        return Array.from(this.periods.values());
    }

    /**
     * Verifica se há períodos carregados
     */
    hasPeriods() {
        return this.periods.size > 0;
    }

    /**
     * Obtém empresa atual
     */
    getCurrentCompany() {
        return this.currentCompany;
    }

    /**
     * Verifica se pode adicionar mais períodos
     */
    canAddMorePeriods() {
        return this.periods.size < this.config.maxPeriods;
    }
}

// Exportar globalmente
if (typeof window !== 'undefined') {
    window.PeriodsManager = PeriodsManager;
}

// Exportar se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PeriodsManager;
}