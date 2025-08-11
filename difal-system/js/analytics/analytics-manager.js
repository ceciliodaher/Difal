/**
 * @fileoverview Analytics Manager - Processamento estatístico de dados DIFAL
 * @module AnalyticsManager
 * @description Responsável por processar dados consolidados de múltiplos períodos SPED,
 * gerando análises estatísticas, incluindo análise de Pareto (80/20) por NCM.
 * 
 * @author Sistema DIFAL
 * @version 1.0.0
 * @since 2025-01-11
 */

/**
 * @class AnalyticsManager
 * @classdesc Gerencia análises estatísticas de dados DIFAL consolidados
 */
class AnalyticsManager {
    /**
     * @constructor
     * @param {StateManager} stateManager - Instância do gerenciador de estado
     * @param {EventBus} eventBus - Instância do barramento de eventos
     */
    constructor(stateManager, eventBus) {
        this.stateManager = stateManager;
        this.eventBus = eventBus;
        
        // Cache de análises
        this.cache = {
            lastUpdate: null,
            analyses: null,
            pareto: null,
            ncmStats: null,
            timeSeriesStats: null
        };
        
        // Configurações de análise
        this.config = {
            paretoThreshold: 80,        // Percentual Pareto (80%)
            minItemsForAnalysis: 10,    // Mínimo de itens para análise válida
            cacheExpiryMinutes: 15,     // Cache expira em 15 minutos
            topNCMsLimit: 50,           // Top 50 NCMs por análise
            minValueThreshold: 1.00     // Valor mínimo para considerar na análise
        };
        
        console.log('📊 AnalyticsManager inicializado');
    }

    /**
     * Processa todos os dados consolidados e gera análises completas
     * @returns {Promise<Object>} Análises completas
     */
    async processAllAnalytics() {
        try {
            console.log('🔄 Iniciando processamento analítico completo...');
            
            // Verificar se há dados consolidados
            const consolidatedItems = this.stateManager.getConsolidatedItems();
            if (!consolidatedItems || consolidatedItems.length === 0) {
                throw new Error('Nenhum dado consolidado encontrado para análise');
            }

            // Validar dados mínimos
            if (consolidatedItems.length < this.config.minItemsForAnalysis) {
                console.warn(`⚠️ Poucos itens para análise robusta: ${consolidatedItems.length}`);
            }

            // Preparar dados para análise
            const validItems = this.prepareDataForAnalysis(consolidatedItems);
            console.log(`📊 ${validItems.length} itens válidos para análise de ${consolidatedItems.length} totais`);

            // Executar todas as análises
            const analyses = {
                timestamp: new Date().toISOString(),
                totalItems: validItems.length,
                totalValue: this.calculateTotalValue(validItems),
                
                // Análises por NCM
                ncmAnalysis: await this.analyzeByNCM(validItems),
                
                // Análise de Pareto
                paretoAnalysis: await this.generateParetoAnalysis(validItems),
                
                // Análises por período
                periodAnalysis: await this.analyzeByPeriod(validItems),
                
                // Análises por CFOP
                cfopAnalysis: await this.analyzeByCFOP(validItems),
                
                // Estatísticas de concentração
                concentrationStats: await this.calculateConcentrationStats(validItems),
                
                // Análise de tendências
                trendsAnalysis: await this.analyzeTrends(validItems)
            };

            // Atualizar cache
            this.updateCache(analyses);
            
            // Armazenar no StateManager
            this.stateManager.setAnalytics(analyses);
            
            // Emitir evento
            this.eventBus?.emit('ANALYTICS_COMPLETED', {
                totalItems: analyses.totalItems,
                totalValue: analyses.totalValue,
                topNCMs: analyses.ncmAnalysis.top10,
                paretoNCMs: analyses.paretoAnalysis.paretoNCMs.length
            });

            console.log('✅ Análises completas geradas:', {
                totalItems: analyses.totalItems,
                totalValue: analyses.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                uniqueNCMs: analyses.ncmAnalysis.uniqueNCMs,
                paretoNCMs: analyses.paretoAnalysis.paretoNCMs.length
            });

            return analyses;
            
        } catch (error) {
            console.error('❌ Erro no processamento analítico:', error);
            throw error;
        }
    }

    /**
     * Prepara dados para análise (limpeza e validação)
     * @private
     * @param {Array} items - Itens brutos
     * @returns {Array} Itens preparados
     */
    prepareDataForAnalysis(items) {
        return items.filter(item => {
            // Filtrar itens válidos
            const hasValidValue = item.valorItem > this.config.minValueThreshold;
            const hasValidNCM = item.ncm && item.ncm !== 'N/A' && item.ncm.trim() !== '';
            const hasValidCFOP = item.cfop && !isNaN(parseInt(item.cfop));
            const hasValidPeriod = item._periodId && item._periodo;
            
            return hasValidValue && hasValidNCM && hasValidCFOP && hasValidPeriod;
        }).map(item => ({
            ...item,
            // Normalizar valores
            valorItem: parseFloat(item.valorItem) || 0,
            valorLiquido: parseFloat(item.valorLiquido) || parseFloat(item.valorItem) || 0,
            baseCalculoDifal: parseFloat(item.baseCalculoDifal) || parseFloat(item.valorItem) || 0,
            // Normalizar NCM (remover pontos e espaços)
            ncm: item.ncm.replace(/[.\s]/g, '').trim(),
            // Normalizar CFOP
            cfop: parseInt(item.cfop) || 0
        }));
    }

    /**
     * Calcula valor total dos itens
     * @private
     * @param {Array} items - Itens
     * @returns {number} Valor total
     */
    calculateTotalValue(items) {
        return items.reduce((sum, item) => sum + item.baseCalculoDifal, 0);
    }

    /**
     * Análise detalhada por NCM
     * @private
     * @param {Array} items - Itens preparados
     * @returns {Object} Análise por NCM
     */
    async analyzeByNCM(items) {
        const ncmStats = new Map();
        const totalValue = this.calculateTotalValue(items);

        // Agrupar por NCM
        items.forEach(item => {
            const ncm = item.ncm;
            if (!ncmStats.has(ncm)) {
                ncmStats.set(ncm, {
                    ncm,
                    items: [],
                    totalValue: 0,
                    totalQuantity: 0,
                    avgValue: 0,
                    periods: new Set(),
                    cfops: new Set(),
                    descriptions: new Set()
                });
            }
            
            const stats = ncmStats.get(ncm);
            stats.items.push(item);
            stats.totalValue += item.baseCalculoDifal;
            stats.totalQuantity += item.quantidade || 1;
            stats.periods.add(item._periodo);
            stats.cfops.add(item.cfop);
            if (item.descricaoItem) {
                stats.descriptions.add(item.descricaoItem.substring(0, 100)); // Limitar tamanho
            }
        });

        // Calcular métricas finais e converter para array
        const ncmArray = Array.from(ncmStats.values()).map(stats => ({
            ...stats,
            avgValue: stats.totalValue / stats.items.length,
            valuePercentage: (stats.totalValue / totalValue) * 100,
            periods: Array.from(stats.periods),
            cfops: Array.from(stats.cfops),
            descriptions: Array.from(stats.descriptions),
            frequency: stats.items.length
        }));

        // Ordenar por valor decrescente
        ncmArray.sort((a, b) => b.totalValue - a.totalValue);

        return {
            uniqueNCMs: ncmArray.length,
            totalValue,
            averageValuePerNCM: totalValue / ncmArray.length,
            top10: ncmArray.slice(0, 10),
            top50: ncmArray.slice(0, this.config.topNCMsLimit),
            all: ncmArray,
            distribution: {
                above1000: ncmArray.filter(ncm => ncm.totalValue >= 1000).length,
                above10000: ncmArray.filter(ncm => ncm.totalValue >= 10000).length,
                above100000: ncmArray.filter(ncm => ncm.totalValue >= 100000).length
            }
        };
    }

    /**
     * Gera análise de Pareto (80/20) por NCM
     * @private
     * @param {Array} items - Itens preparados
     * @returns {Object} Análise de Pareto
     */
    async generateParetoAnalysis(items) {
        const totalValue = this.calculateTotalValue(items);
        const targetValue = totalValue * (this.config.paretoThreshold / 100);

        // Obter análise por NCM ordenada por valor
        const ncmAnalysis = await this.analyzeByNCM(items);
        const sortedNCMs = ncmAnalysis.all;

        // Encontrar NCMs que representam 80% do valor
        let accumulatedValue = 0;
        let paretoNCMs = [];
        let paretoIndex = 0;

        for (let i = 0; i < sortedNCMs.length; i++) {
            accumulatedValue += sortedNCMs[i].totalValue;
            paretoNCMs.push({
                ...sortedNCMs[i],
                accumulatedValue,
                accumulatedPercentage: (accumulatedValue / totalValue) * 100,
                position: i + 1
            });

            if (accumulatedValue >= targetValue && paretoIndex === 0) {
                paretoIndex = i + 1;
            }
        }

        // NCMs restantes (20% que representam poucos % do valor)
        const remainingNCMs = sortedNCMs.slice(paretoIndex);
        const remainingValue = totalValue - accumulatedValue;

        return {
            threshold: this.config.paretoThreshold,
            paretoNCMs: paretoNCMs.slice(0, paretoIndex),
            remainingNCMs: remainingNCMs,
            statistics: {
                paretoNCMsCount: paretoIndex,
                remainingNCMsCount: remainingNCMs.length,
                paretoValue: accumulatedValue,
                remainingValue: remainingValue,
                paretoPercentage: (accumulatedValue / totalValue) * 100,
                remainingPercentage: (remainingValue / totalValue) * 100,
                concentrationRatio: parseFloat((paretoIndex / sortedNCMs.length * 100).toFixed(2))
            },
            insights: {
                is8020Rule: paretoIndex / sortedNCMs.length <= 0.3, // Até 30% dos NCMs = 80% do valor
                highConcentration: paretoIndex <= 10, // Top 10 NCMs já atingem 80%
                veryHighConcentration: paretoIndex <= 5 // Top 5 NCMs já atingem 80%
            }
        };
    }

    /**
     * Análise por período
     * @private
     * @param {Array} items - Itens preparados
     * @returns {Object} Análise temporal
     */
    async analyzeByPeriod(items) {
        const periodStats = new Map();
        
        items.forEach(item => {
            const period = item._periodo;
            if (!periodStats.has(period)) {
                periodStats.set(period, {
                    period,
                    items: [],
                    totalValue: 0,
                    uniqueNCMs: new Set(),
                    uniqueCFOPs: new Set()
                });
            }
            
            const stats = periodStats.get(period);
            stats.items.push(item);
            stats.totalValue += item.baseCalculoDifal;
            stats.uniqueNCMs.add(item.ncm);
            stats.uniqueCFOPs.add(item.cfop);
        });

        const periodArray = Array.from(periodStats.values()).map(stats => ({
            ...stats,
            avgValuePerItem: stats.totalValue / stats.items.length,
            uniqueNCMs: stats.uniqueNCMs.size,
            uniqueCFOPs: stats.uniqueCFOPs.size,
            itemCount: stats.items.length
        }));

        // Ordenar cronologicamente
        periodArray.sort((a, b) => a.period.localeCompare(b.period));

        return {
            totalPeriods: periodArray.length,
            periods: periodArray,
            trends: {
                avgGrowth: this.calculateGrowthTrend(periodArray),
                mostActive: periodArray.reduce((max, p) => p.itemCount > max.itemCount ? p : max),
                highestValue: periodArray.reduce((max, p) => p.totalValue > max.totalValue ? p : max)
            }
        };
    }

    /**
     * Análise por CFOP
     * @private
     * @param {Array} items - Itens preparados
     * @returns {Object} Análise por CFOP
     */
    async analyzeByCFOP(items) {
        const cfopStats = new Map();
        
        items.forEach(item => {
            const cfop = item.cfop;
            if (!cfopStats.has(cfop)) {
                cfopStats.set(cfop, {
                    cfop,
                    items: [],
                    totalValue: 0,
                    uniqueNCMs: new Set(),
                    periods: new Set()
                });
            }
            
            const stats = cfopStats.get(cfop);
            stats.items.push(item);
            stats.totalValue += item.baseCalculoDifal;
            stats.uniqueNCMs.add(item.ncm);
            stats.periods.add(item._periodo);
        });

        const cfopArray = Array.from(cfopStats.values()).map(stats => ({
            ...stats,
            avgValuePerItem: stats.totalValue / stats.items.length,
            uniqueNCMs: stats.uniqueNCMs.size,
            uniquePeriods: stats.periods.size,
            frequency: stats.items.length
        }));

        cfopArray.sort((a, b) => b.totalValue - a.totalValue);

        return {
            uniqueCFOPs: cfopArray.length,
            cfops: cfopArray,
            top10: cfopArray.slice(0, 10),
            distribution: {
                imports: cfopArray.filter(c => c.cfop >= 3000 && c.cfop < 4000),
                sales: cfopArray.filter(c => c.cfop >= 5000 && c.cfop < 6000),
                interstate: cfopArray.filter(c => c.cfop >= 6000 && c.cfop < 7000)
            }
        };
    }

    /**
     * Calcula estatísticas de concentração
     * @private
     * @param {Array} items - Itens preparados
     * @returns {Object} Estatísticas de concentração
     */
    async calculateConcentrationStats(items) {
        const ncmAnalysis = await this.analyzeByNCM(items);
        const sortedNCMs = ncmAnalysis.all;
        const totalValue = ncmAnalysis.totalValue;

        // Índice de Concentração de Herfindahl-Hirschman (HHI)
        const hhi = sortedNCMs.reduce((sum, ncm) => {
            const marketShare = ncm.valuePercentage / 100;
            return sum + (marketShare * marketShare);
        }, 0);

        // Razões de concentração
        const cr4 = Math.min(4, sortedNCMs.length);
        const cr8 = Math.min(8, sortedNCMs.length);
        const cr20 = Math.min(20, sortedNCMs.length);

        const cr4Value = sortedNCMs.slice(0, cr4).reduce((sum, ncm) => sum + ncm.totalValue, 0);
        const cr8Value = sortedNCMs.slice(0, cr8).reduce((sum, ncm) => sum + ncm.totalValue, 0);
        const cr20Value = sortedNCMs.slice(0, cr20).reduce((sum, ncm) => sum + ncm.totalValue, 0);

        return {
            herfindahlIndex: parseFloat((hhi * 10000).toFixed(2)), // HHI em pontos (0-10000)
            concentrationRatios: {
                cr4: parseFloat((cr4Value / totalValue * 100).toFixed(2)),
                cr8: parseFloat((cr8Value / totalValue * 100).toFixed(2)),
                cr20: parseFloat((cr20Value / totalValue * 100).toFixed(2))
            },
            interpretation: {
                hhi: hhi < 0.15 ? 'Baixa concentração' : 
                     hhi < 0.25 ? 'Concentração moderada' : 'Alta concentração',
                marketStructure: hhi < 0.01 ? 'Competição perfeita' :
                                hhi < 0.15 ? 'Mercado competitivo' :
                                hhi < 0.25 ? 'Concentração moderada' :
                                'Mercado concentrado'
            }
        };
    }

    /**
     * Analisa tendências dos dados
     * @private
     * @param {Array} items - Itens preparados
     * @returns {Object} Análise de tendências
     */
    async analyzeTrends(items) {
        // Agrupar por NCM e período para análise temporal
        const ncmPeriodMap = new Map();
        
        items.forEach(item => {
            const key = `${item.ncm}_${item._periodo}`;
            if (!ncmPeriodMap.has(key)) {
                ncmPeriodMap.set(key, {
                    ncm: item.ncm,
                    period: item._periodo,
                    totalValue: 0,
                    itemCount: 0
                });
            }
            
            const entry = ncmPeriodMap.get(key);
            entry.totalValue += item.baseCalculoDifal;
            entry.itemCount += 1;
        });

        // Identificar NCMs com crescimento/decréscimo
        const ncmTrends = new Map();
        
        Array.from(ncmPeriodMap.values()).forEach(entry => {
            if (!ncmTrends.has(entry.ncm)) {
                ncmTrends.set(entry.ncm, []);
            }
            ncmTrends.get(entry.ncm).push({
                period: entry.period,
                value: entry.totalValue,
                count: entry.itemCount
            });
        });

        // Calcular tendências
        const trends = [];
        ncmTrends.forEach((periods, ncm) => {
            if (periods.length > 1) {
                periods.sort((a, b) => a.period.localeCompare(b.period));
                const firstValue = periods[0].value;
                const lastValue = periods[periods.length - 1].value;
                const growth = ((lastValue - firstValue) / firstValue) * 100;
                
                trends.push({
                    ncm,
                    periods: periods.length,
                    firstValue,
                    lastValue,
                    growth: parseFloat(growth.toFixed(2)),
                    trend: growth > 10 ? 'Crescimento' : 
                           growth < -10 ? 'Declínio' : 'Estável'
                });
            }
        });

        trends.sort((a, b) => Math.abs(b.growth) - Math.abs(a.growth));

        return {
            totalNCMsWithTrends: trends.length,
            topGrowing: trends.filter(t => t.growth > 0).slice(0, 10),
            topDeclining: trends.filter(t => t.growth < 0).slice(0, 10),
            stable: trends.filter(t => Math.abs(t.growth) <= 10).length,
            volatile: trends.filter(t => Math.abs(t.growth) > 50).length
        };
    }

    /**
     * Calcula tendência de crescimento
     * @private
     * @param {Array} periodArray - Array de períodos
     * @returns {number} Taxa de crescimento média
     */
    calculateGrowthTrend(periodArray) {
        if (periodArray.length < 2) return 0;
        
        const growthRates = [];
        for (let i = 1; i < periodArray.length; i++) {
            const prevValue = periodArray[i - 1].totalValue;
            const currValue = periodArray[i].totalValue;
            if (prevValue > 0) {
                growthRates.push(((currValue - prevValue) / prevValue) * 100);
            }
        }
        
        return growthRates.length > 0 
            ? parseFloat((growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length).toFixed(2))
            : 0;
    }

    /**
     * Atualiza cache das análises
     * @private
     * @param {Object} analyses - Análises geradas
     */
    updateCache(analyses) {
        this.cache = {
            lastUpdate: new Date(),
            analyses,
            pareto: analyses.paretoAnalysis,
            ncmStats: analyses.ncmAnalysis,
            timeSeriesStats: analyses.periodAnalysis
        };
    }

    /**
     * Verifica se o cache ainda é válido
     * @returns {boolean} True se cache válido
     */
    isCacheValid() {
        if (!this.cache.lastUpdate || !this.cache.analyses) {
            return false;
        }
        
        const now = new Date();
        const diffMinutes = (now - this.cache.lastUpdate) / (1000 * 60);
        return diffMinutes < this.config.cacheExpiryMinutes;
    }

    /**
     * Obtém análises (do cache se válido, senão gera novas)
     * @returns {Promise<Object>} Análises
     */
    async getAnalytics() {
        if (this.isCacheValid()) {
            console.log('📊 Retornando análises do cache');
            return this.cache.analyses;
        }
        
        console.log('🔄 Cache expirado, gerando novas análises...');
        return await this.processAllAnalytics();
    }

    /**
     * Obtém apenas análise de Pareto
     * @returns {Promise<Object>} Análise de Pareto
     */
    async getParetoAnalysis() {
        const analytics = await this.getAnalytics();
        return analytics.paretoAnalysis;
    }

    /**
     * Obtém estatísticas por NCM
     * @returns {Promise<Object>} Estatísticas por NCM
     */
    async getNCMAnalysis() {
        const analytics = await this.getAnalytics();
        return analytics.ncmAnalysis;
    }

    /**
     * Limpa cache das análises
     */
    clearCache() {
        this.cache = {
            lastUpdate: null,
            analyses: null,
            pareto: null,
            ncmStats: null,
            timeSeriesStats: null
        };
        console.log('🧹 Cache de análises limpo');
    }

    /**
     * Obtém insights resumidos para dashboard
     * @returns {Promise<Object>} Insights resumidos
     */
    async getDashboardInsights() {
        try {
            const analytics = await this.getAnalytics();
            
            return {
                totalValue: analytics.totalValue,
                totalItems: analytics.totalItems,
                uniqueNCMs: analytics.ncmAnalysis.uniqueNCMs,
                topNCM: analytics.ncmAnalysis.top10[0] || null,
                paretoNCMsCount: analytics.paretoAnalysis.paretoNCMs.length,
                concentrationLevel: analytics.concentrationStats.interpretation.marketStructure,
                growthTrend: analytics.trendsAnalysis.topGrowing.length > 0 ? 'Crescimento' : 'Estável',
                periodsAnalyzed: analytics.periodAnalysis.totalPeriods
            };
            
        } catch (error) {
            console.error('❌ Erro ao gerar insights:', error);
            return null;
        }
    }
}

// Exportar globalmente
if (typeof window !== 'undefined') {
    window.AnalyticsManager = AnalyticsManager;
}

// Exportar se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsManager;
}