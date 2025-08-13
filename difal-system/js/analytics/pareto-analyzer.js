/**
 * @fileoverview Pareto Analyzer - Análise específica do Princípio 80/20
 * @module ParetoAnalyzer
 * @description Implementa análise detalhada do Princípio de Pareto (80/20) para 
 * identificar NCMs estratégicos que representam a maior parte do valor DIFAL.
 * 
 * @author Sistema DIFAL
 * @version 1.0.0
 * @since 2025-01-11
 */

/**
 * @class ParetoAnalyzer
 * @classdesc Especializado em análises do Princípio de Pareto (80/20)
 */
class ParetoAnalyzer {
    /**
     * @constructor
     * @param {Object} options - Opções de configuração
     */
    constructor(options = {}) {
        // Configurações flexíveis de Pareto
        this.config = {
            defaultThreshold: options.paretoThreshold || 80,
            alternativeThresholds: options.alternativeThresholds || [70, 75, 80, 85, 90],
            minItemsForAnalysis: options.minItemsForAnalysis || 5,
            maxParetoItems: options.maxParetoItems || 100,
            decimalPrecision: options.decimalPrecision || 2
        };
        
        console.log('📈 ParetoAnalyzer inicializado com thresholds:', this.config.alternativeThresholds);
    }

    /**
     * Executa análise de Pareto completa com múltiplos thresholds
     * @param {Array} items - Itens para análise
     * @param {string} groupBy - Campo para agrupamento ('ncm', 'cfop', 'periodo')
     * @param {string} valueField - Campo de valor ('baseCalculoDifal', 'valorItem')
     * @returns {Object} Análise completa de Pareto
     */
    analyzePareto(items, groupBy = 'ncm', valueField = 'baseCalculoDifal') {
        try {
            console.log(`📊 Iniciando análise de Pareto por ${groupBy}...`);
            
            if (!items || items.length < this.config.minItemsForAnalysis) {
                throw new Error(`Mínimo de ${this.config.minItemsForAnalysis} itens necessário para análise`);
            }

            // Agrupar e calcular valores
            const groupedData = this.groupAndCalculate(items, groupBy, valueField);
            const totalValue = groupedData.reduce((sum, item) => sum + item.value, 0);
            
            if (totalValue <= 0) {
                throw new Error('Valor total deve ser maior que zero');
            }

            // Analisar múltiplos thresholds
            const multiThresholdAnalysis = this.analyzeMultipleThresholds(groupedData, totalValue);
            
            // Análise padrão (80%)
            const defaultAnalysis = this.calculateParetoForThreshold(
                groupedData, 
                totalValue, 
                this.config.defaultThreshold
            );

            // Insights estratégicos
            const strategicInsights = this.generateStrategicInsights(groupedData, totalValue, defaultAnalysis);
            
            // Classificação de itens
            const itemClassification = this.classifyItems(groupedData, defaultAnalysis);

            return {
                metadata: {
                    totalItems: items.length,
                    uniqueGroups: groupedData.length,
                    totalValue: totalValue,
                    groupBy: groupBy,
                    valueField: valueField,
                    analyzedAt: new Date().toISOString()
                },
                defaultThreshold: this.config.defaultThreshold,
                defaultAnalysis: defaultAnalysis,
                multiThresholdAnalysis: multiThresholdAnalysis,
                strategicInsights: strategicInsights,
                itemClassification: itemClassification,
                recommendations: this.generateRecommendations(defaultAnalysis, strategicInsights)
            };
            
        } catch (error) {
            console.error('❌ Erro na análise de Pareto:', error);
            throw error;
        }
    }

    /**
     * Agrupa itens e calcula valores
     * @private
     * @param {Array} items - Itens
     * @param {string} groupBy - Campo de agrupamento
     * @param {string} valueField - Campo de valor
     * @returns {Array} Dados agrupados e ordenados
     */
    groupAndCalculate(items, groupBy, valueField) {
        const groups = new Map();
        
        items.forEach(item => {
            const key = item[groupBy];
            if (!key) return; // Ignorar itens sem o campo de agrupamento
            
            const value = parseFloat(item[valueField]) || 0;
            if (value <= 0) return; // Ignorar itens sem valor
            
            if (!groups.has(key)) {
                groups.set(key, {
                    key: key,
                    value: 0,
                    count: 0,
                    items: [],
                    periods: new Set(),
                    avgValue: 0
                });
            }
            
            const group = groups.get(key);
            group.value += value;
            group.count += 1;
            group.items.push(item);
            
            // Adicionar período se disponível
            if (item._periodo) {
                group.periods.add(item._periodo);
            }
        });

        // Converter para array e calcular médias
        const result = Array.from(groups.values()).map(group => ({
            ...group,
            avgValue: group.value / group.count,
            periods: Array.from(group.periods),
            periodsCount: group.periods.size
        }));

        // Ordenar por valor decrescente
        result.sort((a, b) => b.value - a.value);
        
        return result;
    }

    /**
     * Analisa múltiplos thresholds de Pareto
     * @private
     * @param {Array} groupedData - Dados agrupados
     * @param {number} totalValue - Valor total
     * @returns {Array} Análises para diferentes thresholds
     */
    analyzeMultipleThresholds(groupedData, totalValue) {
        return this.config.alternativeThresholds.map(threshold => {
            const analysis = this.calculateParetoForThreshold(groupedData, totalValue, threshold);
            return {
                threshold: threshold,
                ...analysis,
                efficiency: this.calculateEfficiency(analysis, groupedData.length)
            };
        });
    }

    /**
     * Calcula Pareto para um threshold específico
     * @private
     * @param {Array} groupedData - Dados agrupados
     * @param {number} totalValue - Valor total
     * @param {number} threshold - Threshold (ex: 80)
     * @returns {Object} Análise para o threshold
     */
    calculateParetoForThreshold(groupedData, totalValue, threshold) {
        const targetValue = totalValue * (threshold / 100);
        let accumulatedValue = 0;
        let paretoItems = [];
        let paretoIndex = 0;

        // Encontrar itens que atingem o threshold
        for (let i = 0; i < groupedData.length; i++) {
            const item = groupedData[i];
            accumulatedValue += item.value;
            
            paretoItems.push({
                ...item,
                position: i + 1,
                accumulatedValue: accumulatedValue,
                accumulatedPercentage: this.round((accumulatedValue / totalValue) * 100),
                individualPercentage: this.round((item.value / totalValue) * 100),
                isPareto: accumulatedValue <= targetValue
            });
            
            if (accumulatedValue >= targetValue && paretoIndex === 0) {
                paretoIndex = i + 1;
            }
        }

        const paretoItemsFiltered = paretoItems.slice(0, paretoIndex);
        const remainingItems = paretoItems.slice(paretoIndex);
        const paretoValue = paretoItemsFiltered.reduce((sum, item) => sum + item.value, 0);

        return {
            paretoItems: paretoItemsFiltered,
            remainingItems: remainingItems,
            statistics: {
                paretoCount: paretoIndex,
                remainingCount: groupedData.length - paretoIndex,
                paretoValue: paretoValue,
                remainingValue: totalValue - paretoValue,
                paretoPercentage: this.round((paretoValue / totalValue) * 100),
                remainingPercentage: this.round(((totalValue - paretoValue) / totalValue) * 100),
                concentrationRatio: this.round((paretoIndex / groupedData.length) * 100),
                averageParetoValue: paretoIndex > 0 ? this.round(paretoValue / paretoIndex) : 0
            },
            validation: {
                achievesThreshold: paretoIndex > 0 && (paretoValue / totalValue) >= (threshold / 100),
                isValidPareto: paretoIndex > 0 && paretoIndex < groupedData.length,
                concentrationLevel: this.classifyConcentration(paretoIndex, groupedData.length)
            }
        };
    }

    /**
     * Calcula eficiência de um threshold
     * @private
     * @param {Object} analysis - Análise do threshold
     * @param {number} totalGroups - Total de grupos
     * @returns {Object} Métricas de eficiência
     */
    calculateEfficiency(analysis, totalGroups) {
        const stats = analysis.statistics;
        
        return {
            focusEfficiency: stats.paretoCount > 0 ? 
                this.round(stats.paretoPercentage / stats.concentrationRatio) : 0,
            valueConcentration: this.round(stats.paretoValue / stats.paretoCount),
            managementComplexity: this.round((stats.paretoCount / totalGroups) * 100),
            strategicImpact: stats.paretoPercentage >= 70 ? 'Alto' : 
                           stats.paretoPercentage >= 50 ? 'Médio' : 'Baixo'
        };
    }

    /**
     * Gera insights estratégicos
     * @private
     * @param {Array} groupedData - Dados agrupados
     * @param {number} totalValue - Valor total
     * @param {Object} defaultAnalysis - Análise padrão
     * @returns {Object} Insights estratégicos
     */
    generateStrategicInsights(groupedData, totalValue, defaultAnalysis) {
        const stats = defaultAnalysis.statistics;
        const paretoItems = defaultAnalysis.paretoItems;
        
        // Análise de distribuição de valor
        const valueDistribution = this.analyzeValueDistribution(paretoItems);
        
        // Identificar padrões
        const patterns = this.identifyPatterns(paretoItems);
        
        // Calcular métricas de risco
        const riskMetrics = this.calculateRiskMetrics(paretoItems, stats);

        return {
            keyFindings: {
                topPerformer: paretoItems[0] || null,
                concentrationLevel: this.classifyConcentration(stats.paretoCount, groupedData.length),
                valueDistribution: valueDistribution,
                managementFocus: `${stats.paretoCount} itens (${stats.concentrationRatio}%) = ${stats.paretoPercentage}% do valor`
            },
            patterns: patterns,
            riskAssessment: riskMetrics,
            opportunities: this.identifyOpportunities(paretoItems, defaultAnalysis.remainingItems),
            benchmarks: {
                isClassicPareto: stats.concentrationRatio <= 20 && stats.paretoPercentage >= 80,
                concentrationScore: this.round((100 - stats.concentrationRatio) * (stats.paretoPercentage / 100))
            }
        };
    }

    /**
     * Analisa distribuição de valor nos itens Pareto
     * @private
     * @param {Array} paretoItems - Itens Pareto
     * @returns {Object} Análise de distribuição
     */
    analyzeValueDistribution(paretoItems) {
        if (!paretoItems.length) return null;
        
        const values = paretoItems.map(item => item.value);
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        
        // Calcular desvio padrão
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        // Coeficiente de variação
        const coefficientOfVariation = mean > 0 ? (stdDev / mean) * 100 : 0;

        return {
            mean: this.round(mean),
            median: this.round(this.calculateMedian(values)),
            standardDeviation: this.round(stdDev),
            coefficientOfVariation: this.round(coefficientOfVariation),
            range: {
                min: Math.min(...values),
                max: Math.max(...values),
                ratio: Math.max(...values) / Math.min(...values)
            },
            distribution: coefficientOfVariation < 50 ? 'Homogênea' :
                         coefficientOfVariation < 100 ? 'Moderadamente heterogênea' :
                         'Altamente heterogênea'
        };
    }

    /**
     * Identifica padrões nos itens Pareto
     * @private
     * @param {Array} paretoItems - Itens Pareto
     * @returns {Object} Padrões identificados
     */
    identifyPatterns(paretoItems) {
        if (!paretoItems.length) return {};

        // Padrão de dominância (quanto o #1 representa do total Pareto)
        const totalParetoValue = paretoItems.reduce((sum, item) => sum + item.value, 0);
        const topItemDominance = paretoItems.length > 0 ? 
            (paretoItems[0].value / totalParetoValue) * 100 : 0;

        // Padrão de queda (diferença entre top e bottom Pareto)
        const paretoRange = paretoItems.length > 1 ?
            (paretoItems[0].value / paretoItems[paretoItems.length - 1].value) : 1;

        return {
            dominancePattern: {
                topItemDominance: this.round(topItemDominance),
                isDominant: topItemDominance > 30,
                level: topItemDominance > 50 ? 'Extrema' :
                       topItemDominance > 30 ? 'Alta' :
                       topItemDominance > 15 ? 'Moderada' : 'Baixa'
            },
            falloffPattern: {
                paretoRange: this.round(paretoRange),
                falloffType: paretoRange > 10 ? 'Steep' :
                            paretoRange > 3 ? 'Moderate' : 'Gradual'
            },
            consistency: {
                hasMultiplePeriods: paretoItems.some(item => item.periodsCount > 1),
                avgPeriodsPerItem: this.round(
                    paretoItems.reduce((sum, item) => sum + item.periodsCount, 0) / paretoItems.length
                )
            }
        };
    }

    /**
     * Calcula métricas de risco
     * @private
     * @param {Array} paretoItems - Itens Pareto
     * @param {Object} stats - Estatísticas
     * @returns {Object} Métricas de risco
     */
    calculateRiskMetrics(paretoItems, stats) {
        // Risco de concentração
        const concentrationRisk = stats.concentrationRatio < 10 ? 'Alto' :
                                 stats.concentrationRatio < 20 ? 'Médio' : 'Baixo';

        // Risco de dependência do top item
        const topItemRisk = paretoItems.length > 0 && paretoItems[0].individualPercentage > 25 ? 'Alto' :
                           paretoItems.length > 0 && paretoItems[0].individualPercentage > 15 ? 'Médio' : 'Baixo';

        return {
            concentrationRisk: concentrationRisk,
            topItemDependencyRisk: topItemRisk,
            diversificationLevel: stats.paretoCount >= 20 ? 'Alta' :
                                 stats.paretoCount >= 10 ? 'Média' : 'Baixa',
            overallRiskLevel: concentrationRisk === 'Alto' || topItemRisk === 'Alto' ? 'Alto' :
                             concentrationRisk === 'Médio' || topItemRisk === 'Médio' ? 'Médio' : 'Baixo',
            recommendations: this.generateRiskRecommendations(concentrationRisk, topItemRisk, stats.paretoCount)
        };
    }

    /**
     * Identifica oportunidades
     * @private
     * @param {Array} paretoItems - Itens Pareto
     * @param {Array} remainingItems - Itens restantes
     * @returns {Object} Oportunidades identificadas
     */
    identifyOpportunities(paretoItems, remainingItems) {
        // Itens próximos ao threshold que podem se tornar estratégicos
        const nearThreshold = remainingItems.slice(0, 10).filter(item => 
            item.individualPercentage >= 1.0 // Pelo menos 1% do total
        );

        // Itens com potencial baseado em múltiplos períodos
        const growthCandidates = remainingItems.filter(item => 
            item.periodsCount > 1 && item.avgValue > 1000
        );

        return {
            nearThresholdItems: nearThreshold,
            growthCandidates: growthCandidates.slice(0, 5),
            optimizationOpportunities: {
                focusTop: Math.min(5, paretoItems.length),
                monitorGrowing: growthCandidates.length,
                potentialNew: nearThreshold.length
            }
        };
    }

    /**
     * Classifica itens em categorias estratégicas
     * @private
     * @param {Array} groupedData - Dados agrupados
     * @param {Object} defaultAnalysis - Análise padrão
     * @returns {Object} Classificação de itens
     */
    classifyItems(groupedData, defaultAnalysis) {
        const paretoKeys = new Set(defaultAnalysis.paretoItems.map(item => item.key));
        const stats = defaultAnalysis.statistics;

        const classification = {
            strategic: [], // Top Pareto itens
            important: [], // Outros Pareto itens
            monitoring: [], // Próximos ao threshold
            lowPriority: [] // Restantes
        };

        groupedData.forEach((item, index) => {
            const isPareto = paretoKeys.has(item.key);
            
            if (isPareto) {
                if (index < 5) { // Top 5
                    classification.strategic.push({...item, category: 'Estratégico'});
                } else {
                    classification.important.push({...item, category: 'Importante'});
                }
            } else {
                if (item.individualPercentage >= 1.0 || item.periodsCount > 1) {
                    classification.monitoring.push({...item, category: 'Monitoramento'});
                } else {
                    classification.lowPriority.push({...item, category: 'Baixa Prioridade'});
                }
            }
        });

        return {
            strategic: classification.strategic,
            important: classification.important,
            monitoring: classification.monitoring,
            lowPriority: classification.lowPriority,
            summary: {
                strategic: classification.strategic.length,
                important: classification.important.length,
                monitoring: classification.monitoring.length,
                lowPriority: classification.lowPriority.length
            }
        };
    }

    /**
     * Gera recomendações baseadas na análise
     * @private
     * @param {Object} defaultAnalysis - Análise padrão
     * @param {Object} strategicInsights - Insights estratégicos
     * @returns {Array} Lista de recomendações
     */
    generateRecommendations(defaultAnalysis, strategicInsights) {
        const recommendations = [];
        const stats = defaultAnalysis.statistics;
        const risk = strategicInsights.riskAssessment;

        // Recomendações baseadas em concentração
        if (stats.concentrationRatio < 10) {
            recommendations.push({
                type: 'warning',
                title: 'Alta Concentração Detectada',
                description: `Apenas ${stats.paretoCount} itens representam ${stats.paretoPercentage}% do valor`,
                action: 'Implementar estratégias de diversificação e monitoramento de risco'
            });
        }

        // Recomendações sobre item dominante
        if (defaultAnalysis.paretoItems.length > 0 && 
            defaultAnalysis.paretoItems[0].individualPercentage > 25) {
            recommendations.push({
                type: 'critical',
                title: 'Dependência Crítica',
                description: `Item ${defaultAnalysis.paretoItems[0].key} representa ${defaultAnalysis.paretoItems[0].individualPercentage}% do valor total`,
                action: 'Desenvolver planos de contingência e alternativas'
            });
        }

        // Recomendações de otimização
        if (strategicInsights.opportunities.nearThresholdItems.length > 0) {
            recommendations.push({
                type: 'opportunity',
                title: 'Oportunidades de Crescimento',
                description: `${strategicInsights.opportunities.nearThresholdItems.length} itens próximos ao threshold estratégico`,
                action: 'Analisar potencial de crescimento destes itens'
            });
        }

        // Recomendação de gestão
        recommendations.push({
            type: 'info',
            title: 'Foco de Gestão',
            description: `Concentre 80% dos esforços nos ${stats.paretoCount} itens estratégicos`,
            action: `Estabelecer KPIs específicos para os itens Pareto`
        });

        return recommendations;
    }

    // ========== MÉTODOS UTILITÁRIOS ==========

    /**
     * Classifica nível de concentração
     * @private
     * @param {number} paretoCount - Número de itens Pareto
     * @param {number} totalCount - Total de itens
     * @returns {string} Nível de concentração
     */
    classifyConcentration(paretoCount, totalCount) {
        const ratio = (paretoCount / totalCount) * 100;
        
        if (ratio <= 5) return 'Extremamente Alta';
        if (ratio <= 10) return 'Muito Alta';
        if (ratio <= 20) return 'Alta';
        if (ratio <= 30) return 'Moderada';
        return 'Baixa';
    }

    /**
     * Calcula mediana de um array
     * @private
     * @param {Array} values - Valores
     * @returns {number} Mediana
     */
    calculateMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        
        return sorted.length % 2 !== 0 
            ? sorted[mid] 
            : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    /**
     * Gera recomendações de risco
     * @private
     * @param {string} concentrationRisk - Risco de concentração
     * @param {string} topItemRisk - Risco do item top
     * @param {number} paretoCount - Número de itens Pareto
     * @returns {Array} Recomendações
     */
    generateRiskRecommendations(concentrationRisk, topItemRisk, paretoCount) {
        const recommendations = [];
        
        if (concentrationRisk === 'Alto') {
            recommendations.push('Diversificar portfolio de produtos/NCMs');
        }
        
        if (topItemRisk === 'Alto') {
            recommendations.push('Desenvolver alternativas ao item dominante');
        }
        
        if (paretoCount < 5) {
            recommendations.push('Expandir base de itens estratégicos');
        }
        
        return recommendations;
    }

    /**
     * Arredonda número com precisão configurável
     * @private
     * @param {number} value - Valor
     * @returns {number} Valor arredondado
     */
    round(value) {
        const factor = Math.pow(10, this.config.decimalPrecision);
        return Math.round(value * factor) / factor;
    }

    /**
     * Exporta análise para diferentes formatos
     * @param {Object} paretoAnalysis - Análise de Pareto
     * @param {string} format - Formato ('summary', 'detailed', 'strategic')
     * @returns {Object} Dados formatados
     */
    exportAnalysis(paretoAnalysis, format = 'summary') {
        switch (format) {
            case 'summary':
                return {
                    totalItems: paretoAnalysis.metadata.totalItems,
                    paretoItems: paretoAnalysis.defaultAnalysis.statistics.paretoCount,
                    concentration: paretoAnalysis.defaultAnalysis.statistics.concentrationRatio,
                    topItem: paretoAnalysis.defaultAnalysis.paretoItems[0]?.key || null
                };
                
            case 'strategic':
                return {
                    strategic: paretoAnalysis.itemClassification.strategic,
                    important: paretoAnalysis.itemClassification.important,
                    recommendations: paretoAnalysis.recommendations,
                    riskLevel: paretoAnalysis.strategicInsights.riskAssessment.overallRiskLevel
                };
                
            case 'detailed':
            default:
                return paretoAnalysis;
        }
    }
}

// Exportar globalmente
if (typeof window !== 'undefined') {
    window.ParetoAnalyzer = ParetoAnalyzer;
}

// Exportar se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ParetoAnalyzer;
}