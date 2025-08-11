/**
 * @fileoverview Charts Manager - Geração de gráficos dinâmicos para análises
 * @module ChartsManager
 * @description Responsável por gerar gráficos interativos para visualização
 * de análises estatísticas, Pareto e dados consolidados de múltiplos períodos.
 * 
 * @author Sistema DIFAL
 * @version 1.0.0
 * @since 2025-01-11
 */

/**
 * @class ChartsManager
 * @classdesc Gerencia criação de gráficos para análises DIFAL
 */
class ChartsManager {
    /**
     * @constructor
     * @param {Object} options - Opções de configuração
     */
    constructor(options = {}) {
        // Configurações de gráficos
        this.config = {
            defaultTheme: options.theme || 'modern',
            defaultColors: options.colors || [
                '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
                '#8B5CF6', '#EC4899', '#6B7280', '#14B8A6',
                '#F97316', '#84CC16', '#06B6D4', '#8B5CF6'
            ],
            paretoColors: {
                pareto: '#10B981',     // Verde para itens Pareto
                remaining: '#94A3B8',   // Cinza para restantes
                cumulative: '#EF4444'   // Vermelho para linha cumulativa
            },
            chartDefaults: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { usePointStyle: true }
                    }
                }
            }
        };
        
        // Cache de gráficos
        this.charts = new Map();
        
        console.log('📈 ChartsManager inicializado');
    }

    /**
     * Cria gráfico de Pareto por NCM
     * @param {string} containerId - ID do container do gráfico
     * @param {Object} paretoData - Dados da análise de Pareto
     * @returns {Object} Instância do gráfico
     */
    createParetoChart(containerId, paretoData) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container ${containerId} não encontrado`);
            }

            // Preparar dados
            const paretoItems = paretoData.paretoItems || [];
            const remainingItems = paretoData.remainingItems || [];
            const allItems = [...paretoItems, ...remainingItems.slice(0, 20)]; // Limitar para visualização
            
            const labels = allItems.map(item => item.key);
            const values = allItems.map(item => item.value);
            const cumulativePercentages = allItems.map(item => item.accumulatedPercentage);
            
            // Cores baseadas se é Pareto ou não
            const backgroundColors = allItems.map(item => 
                paretoItems.includes(item) 
                    ? this.config.paretoColors.pareto 
                    : this.config.paretoColors.remaining
            );

            // Configuração do gráfico
            const config = {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            type: 'bar',
                            label: 'Valor Individual',
                            data: values,
                            backgroundColor: backgroundColors,
                            borderWidth: 1,
                            yAxisID: 'y'
                        },
                        {
                            type: 'line',
                            label: '% Cumulativo',
                            data: cumulativePercentages,
                            borderColor: this.config.paretoColors.cumulative,
                            backgroundColor: 'transparent',
                            borderWidth: 3,
                            pointBackgroundColor: this.config.paretoColors.cumulative,
                            pointRadius: 4,
                            yAxisID: 'y1',
                            tension: 0.1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Análise de Pareto por NCM (80/20)',
                            font: { size: 16, weight: 'bold' }
                        },
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: (context) => {
                                    if (context.datasetIndex === 0) {
                                        return `Valor: ${this.formatCurrency(context.raw)}`;
                                    } else {
                                        return `Cumulativo: ${context.raw.toFixed(1)}%`;
                                    }
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            title: { display: true, text: 'NCM' },
                            ticks: {
                                maxRotation: 45,
                                callback: function(value, index) {
                                    // Mostrar apenas alguns labels para evitar sobreposição
                                    return index % 3 === 0 ? this.getLabelForValue(value) : '';
                                }
                            }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: { display: true, text: 'Valor (R$)' },
                            ticks: {
                                callback: (value) => this.formatCurrency(value)
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: { display: true, text: 'Percentual Cumulativo (%)' },
                            min: 0,
                            max: 100,
                            grid: { drawOnChartArea: false },
                            ticks: {
                                callback: (value) => `${value}%`
                            }
                        }
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false
                    }
                }
            };

            // Criar gráfico com Chart.js (assumindo que está disponível)
            const chart = this.createChartInstance(container, config);
            this.charts.set(containerId, chart);
            
            return chart;
            
        } catch (error) {
            console.error('❌ Erro ao criar gráfico de Pareto:', error);
            this.showChartError(containerId, 'Erro ao carregar gráfico de Pareto');
            return null;
        }
    }

    /**
     * Cria gráfico de pizza para top NCMs
     * @param {string} containerId - ID do container
     * @param {Array} topNCMs - Top NCMs para exibir
     * @param {number} limit - Limite de itens
     * @returns {Object} Instância do gráfico
     */
    createTopNCMsPieChart(containerId, topNCMs, limit = 10) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container ${containerId} não encontrado`);
            }

            const limitedNCMs = topNCMs.slice(0, limit);
            const labels = limitedNCMs.map(ncm => ncm.ncm || ncm.key);
            const values = limitedNCMs.map(ncm => ncm.totalValue || ncm.value);
            const percentages = limitedNCMs.map(ncm => ncm.valuePercentage || ncm.individualPercentage);

            const config = {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: this.config.defaultColors,
                        borderWidth: 2,
                        borderColor: '#ffffff',
                        hoverBorderWidth: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: `Top ${limit} NCMs por Valor`,
                            font: { size: 16, weight: 'bold' }
                        },
                        legend: {
                            position: 'right',
                            labels: {
                                generateLabels: (chart) => {
                                    const data = chart.data;
                                    return data.labels.map((label, i) => ({
                                        text: `${label}: ${percentages[i]?.toFixed(1) || '0'}%`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        strokeStyle: data.datasets[0].borderColor,
                                        lineWidth: data.datasets[0].borderWidth
                                    }));
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const percentage = percentages[context.dataIndex];
                                    return `${context.label}: ${this.formatCurrency(context.raw)} (${percentage?.toFixed(1) || '0'}%)`;
                                }
                            }
                        }
                    },
                    cutout: '60%'
                }
            };

            const chart = this.createChartInstance(container, config);
            this.charts.set(containerId, chart);
            
            return chart;
            
        } catch (error) {
            console.error('❌ Erro ao criar gráfico de pizza:', error);
            this.showChartError(containerId, 'Erro ao carregar gráfico de distribuição');
            return null;
        }
    }

    /**
     * Cria gráfico de linha temporal por período
     * @param {string} containerId - ID do container
     * @param {Object} periodAnalysis - Análise por período
     * @returns {Object} Instância do gráfico
     */
    createTimeSeriesChart(containerId, periodAnalysis) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container ${containerId} não encontrado`);
            }

            const periods = periodAnalysis.periods || [];
            const labels = periods.map(p => p.period);
            const values = periods.map(p => p.totalValue);
            const itemCounts = periods.map(p => p.itemCount);

            const config = {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Valor Total (R$)',
                            data: values,
                            borderColor: this.config.defaultColors[0],
                            backgroundColor: this.config.defaultColors[0] + '20',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.1,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Quantidade de Itens',
                            data: itemCounts,
                            borderColor: this.config.defaultColors[1],
                            backgroundColor: this.config.defaultColors[1] + '20',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.1,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Evolução Temporal por Período',
                            font: { size: 16, weight: 'bold' }
                        },
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            title: { display: true, text: 'Período' }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: { display: true, text: 'Valor (R$)' },
                            ticks: {
                                callback: (value) => this.formatCurrency(value)
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: { display: true, text: 'Quantidade' },
                            grid: { drawOnChartArea: false }
                        }
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false
                    }
                }
            };

            const chart = this.createChartInstance(container, config);
            this.charts.set(containerId, chart);
            
            return chart;
            
        } catch (error) {
            console.error('❌ Erro ao criar gráfico temporal:', error);
            this.showChartError(containerId, 'Erro ao carregar gráfico temporal');
            return null;
        }
    }

    /**
     * Cria gráfico de barras para análise de CFOP
     * @param {string} containerId - ID do container
     * @param {Object} cfopAnalysis - Análise por CFOP
     * @returns {Object} Instância do gráfico
     */
    createCFOPChart(containerId, cfopAnalysis) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container ${containerId} não encontrado`);
            }

            const topCFOPs = cfopAnalysis.top10 || [];
            const labels = topCFOPs.map(cfop => `${cfop.cfop}`);
            const values = topCFOPs.map(cfop => cfop.totalValue);
            const frequencies = topCFOPs.map(cfop => cfop.frequency);

            const config = {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Valor Total (R$)',
                            data: values,
                            backgroundColor: this.config.defaultColors[2],
                            borderColor: this.config.defaultColors[2],
                            borderWidth: 1,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Frequência',
                            data: frequencies,
                            backgroundColor: this.config.defaultColors[3] + '60',
                            borderColor: this.config.defaultColors[3],
                            borderWidth: 1,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Análise por CFOP - Top 10',
                            font: { size: 16, weight: 'bold' }
                        },
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                title: (tooltipItems) => `CFOP: ${tooltipItems[0].label}`,
                                label: (context) => {
                                    if (context.datasetIndex === 0) {
                                        return `Valor: ${this.formatCurrency(context.raw)}`;
                                    } else {
                                        return `Frequência: ${context.raw} itens`;
                                    }
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            title: { display: true, text: 'CFOP' }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: { display: true, text: 'Valor (R$)' },
                            ticks: {
                                callback: (value) => this.formatCurrency(value)
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: { display: true, text: 'Frequência' },
                            grid: { drawOnChartArea: false }
                        }
                    }
                }
            };

            const chart = this.createChartInstance(container, config);
            this.charts.set(containerId, chart);
            
            return chart;
            
        } catch (error) {
            console.error('❌ Erro ao criar gráfico de CFOP:', error);
            this.showChartError(containerId, 'Erro ao carregar gráfico de CFOP');
            return null;
        }
    }

    /**
     * Cria dashboard completo de análises
     * @param {string} containerId - ID do container principal
     * @param {Object} analyticsData - Dados completos das análises
     * @returns {Object} Conjunto de gráficos criados
     */
    createAnalyticsDashboard(containerId, analyticsData) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container ${containerId} não encontrado`);
            }

            // Limpar container
            container.innerHTML = '';

            // Criar estrutura HTML para os gráficos
            const dashboardHTML = `
                <div class="analytics-dashboard">
                    <div class="dashboard-header">
                        <h2>📊 Dashboard de Análises DIFAL</h2>
                        <div class="dashboard-summary">
                            <div class="summary-item">
                                <span class="summary-label">Total de Itens:</span>
                                <span class="summary-value">${analyticsData.totalItems?.toLocaleString() || 0}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Valor Total:</span>
                                <span class="summary-value">${this.formatCurrency(analyticsData.totalValue || 0)}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">NCMs Únicos:</span>
                                <span class="summary-value">${analyticsData.ncmAnalysis?.uniqueNCMs || 0}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="dashboard-charts">
                        <div class="chart-row">
                            <div class="chart-container large">
                                <canvas id="${containerId}-pareto"></canvas>
                            </div>
                        </div>
                        
                        <div class="chart-row">
                            <div class="chart-container medium">
                                <canvas id="${containerId}-pie"></canvas>
                            </div>
                            <div class="chart-container medium">
                                <canvas id="${containerId}-cfop"></canvas>
                            </div>
                        </div>
                        
                        <div class="chart-row">
                            <div class="chart-container large">
                                <canvas id="${containerId}-timeline"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            container.innerHTML = dashboardHTML;

            // Criar gráficos individuais
            const charts = {};
            
            if (analyticsData.paretoAnalysis) {
                charts.pareto = this.createParetoChart(
                    `${containerId}-pareto`, 
                    analyticsData.paretoAnalysis.defaultAnalysis
                );
            }

            if (analyticsData.ncmAnalysis?.top10) {
                charts.pie = this.createTopNCMsPieChart(
                    `${containerId}-pie`, 
                    analyticsData.ncmAnalysis.top10
                );
            }

            if (analyticsData.cfopAnalysis) {
                charts.cfop = this.createCFOPChart(
                    `${containerId}-cfop`, 
                    analyticsData.cfopAnalysis
                );
            }

            if (analyticsData.periodAnalysis) {
                charts.timeline = this.createTimeSeriesChart(
                    `${containerId}-timeline`, 
                    analyticsData.periodAnalysis
                );
            }

            // Adicionar CSS para o dashboard se necessário
            this.injectDashboardCSS();

            console.log('✅ Dashboard de análises criado com sucesso');
            return charts;
            
        } catch (error) {
            console.error('❌ Erro ao criar dashboard:', error);
            this.showChartError(containerId, 'Erro ao carregar dashboard de análises');
            return {};
        }
    }

    // ========== MÉTODOS UTILITÁRIOS ==========

    /**
     * Cria instância de gráfico
     * @private
     * @param {HTMLElement} container - Container do gráfico
     * @param {Object} config - Configuração do gráfico
     * @returns {Object} Instância do gráfico
     */
    createChartInstance(container, config) {
        // Verificar se Chart.js está disponível
        if (typeof Chart === 'undefined') {
            throw new Error('Chart.js não está disponível. Inclua a biblioteca Chart.js.');
        }

        // Criar canvas se necessário
        let canvas = container.querySelector('canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            container.appendChild(canvas);
        }

        // Criar gráfico
        return new Chart(canvas, config);
    }

    /**
     * Mostra mensagem de erro no container
     * @private
     * @param {string} containerId - ID do container
     * @param {string} message - Mensagem de erro
     */
    showChartError(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="chart-error">
                    <div class="error-icon">⚠️</div>
                    <div class="error-message">${message}</div>
                    <div class="error-details">Verifique os dados e tente novamente</div>
                </div>
            `;
        }
    }

    /**
     * Formata valor como moeda brasileira
     * @private
     * @param {number} value - Valor
     * @returns {string} Valor formatado
     */
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    }

    /**
     * Injeta CSS básico para o dashboard
     * @private
     */
    injectDashboardCSS() {
        if (document.getElementById('charts-dashboard-css')) return;

        const css = `
            <style id="charts-dashboard-css">
                .analytics-dashboard {
                    width: 100%;
                    padding: 20px;
                    font-family: 'Inter', sans-serif;
                }
                
                .dashboard-header {
                    margin-bottom: 30px;
                    text-align: center;
                }
                
                .dashboard-summary {
                    display: flex;
                    justify-content: center;
                    gap: 30px;
                    margin-top: 15px;
                    flex-wrap: wrap;
                }
                
                .summary-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 10px 20px;
                    background: #f8fafc;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                }
                
                .summary-label {
                    font-size: 0.875rem;
                    color: #64748b;
                    font-weight: 500;
                }
                
                .summary-value {
                    font-size: 1.25rem;
                    color: #1e293b;
                    font-weight: 700;
                    margin-top: 4px;
                }
                
                .dashboard-charts {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                
                .chart-row {
                    display: flex;
                    gap: 20px;
                    flex-wrap: wrap;
                }
                
                .chart-container {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
                }
                
                .chart-container.large {
                    flex: 1;
                    min-width: 600px;
                    height: 400px;
                }
                
                .chart-container.medium {
                    flex: 1;
                    min-width: 300px;
                    height: 300px;
                }
                
                .chart-error {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 200px;
                    color: #ef4444;
                    text-align: center;
                }
                
                .error-icon {
                    font-size: 2rem;
                    margin-bottom: 10px;
                }
                
                .error-message {
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin-bottom: 5px;
                }
                
                .error-details {
                    font-size: 0.875rem;
                    color: #64748b;
                }
                
                @media (max-width: 768px) {
                    .chart-container.large,
                    .chart-container.medium {
                        min-width: 100%;
                    }
                    
                    .dashboard-summary {
                        gap: 15px;
                    }
                    
                    .summary-item {
                        padding: 8px 16px;
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', css);
    }

    /**
     * Remove gráfico específico
     * @param {string} containerId - ID do container
     */
    removeChart(containerId) {
        if (this.charts.has(containerId)) {
            const chart = this.charts.get(containerId);
            chart.destroy();
            this.charts.delete(containerId);
            console.log(`📈 Gráfico ${containerId} removido`);
        }
    }

    /**
     * Remove todos os gráficos
     */
    removeAllCharts() {
        this.charts.forEach((chart, containerId) => {
            chart.destroy();
            console.log(`📈 Gráfico ${containerId} removido`);
        });
        this.charts.clear();
        console.log('🧹 Todos os gráficos removidos');
    }

    /**
     * Redimensiona todos os gráficos
     */
    resizeAllCharts() {
        this.charts.forEach(chart => {
            chart.resize();
        });
    }

    /**
     * Obtém estatísticas dos gráficos criados
     * @returns {Object} Estatísticas
     */
    getStatistics() {
        return {
            totalCharts: this.charts.size,
            chartIds: Array.from(this.charts.keys()),
            theme: this.config.defaultTheme
        };
    }
}

// Exportar globalmente
if (typeof window !== 'undefined') {
    window.ChartsManager = ChartsManager;
}

// Exportar se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartsManager;
}