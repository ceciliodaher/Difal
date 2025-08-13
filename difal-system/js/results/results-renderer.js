/**
 * @fileoverview Results Renderer - Módulo de renderização de resultados DIFAL
 * @module ResultsRenderer
 * @description Responsável pela renderização e exibição de resultados do cálculo DIFAL
 * em diversos formatos, incluindo tabelas, modais e exportações, com integração
 * completa ao EventBus e StateManager do sistema.
 * 
 * @author Sistema DIFAL
 * @version 1.0.0
 * @since 2025-01-10
 */

/**
 * @class ResultsRenderer
 * @classdesc Gerencia a renderização e exibição de resultados do cálculo DIFAL
 */
class ResultsRenderer {
    /**
     * @constructor
     * @param {StateManager} stateManager - Instância do gerenciador de estado
     * @param {EventBus} eventBus - Instância do barramento de eventos
     * @param {ExportManager} exportManager - Instância do gerenciador de exportações
     */
    constructor(stateManager, eventBus, exportManager) {
        if (!stateManager) {
            throw new Error('ResultsRenderer requer uma instância de StateManager');
        }
        
        this.stateManager = stateManager;
        this.eventBus = eventBus;
        this.exportManager = exportManager;
        
        // Configurações de renderização
        this.config = {
            table: {
                maxItemsPerPage: 15,
                sortColumn: null,
                sortDirection: 'asc',
                filters: {
                    showOnlyWithDifal: false, // Exibir todos para auditoria
                    showOnlyBenefited: false,
                    minValue: 0
                }
            },
            display: {
                currencyDecimals: 2,
                percentDecimals: 2,
                maxDescriptionLength: 30,
                showTooltips: true
            },
            modals: {
                memoryCalculationModal: null,
                activeModals: []
            }
        };
        
        this.init();
    }

    /**
     * Inicializa o Results Renderer
     * @private
     */
    init() {
        try {
            this.setupEventListeners();
            this.bindGlobalFunctions();
            console.log('📊 ResultsRenderer inicializado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao inicializar ResultsRenderer:', error);
            throw error;
        }
    }

    /**
     * Configura listeners de eventos
     * @private
     */
    setupEventListeners() {
        if (this.eventBus) {
            // Escutar eventos de cálculo completado
            this.eventBus.on('CALCULATION_COMPLETED', (data) => {
                this.handleCalculationCompleted(data);
            });

            // Escutar eventos de configuração alterada
            this.eventBus.on('ITEM_CONFIG_CHANGED', () => {
                this.refreshResults();
            });

            // Escutar eventos de filtros alterados
            this.eventBus.on('RESULTS_FILTER_CHANGED', (filters) => {
                this.applyFilters(filters);
            });
        }
    }

    /**
     * Vincula funções globais para compatibilidade
     * @private
     */
    bindGlobalFunctions() {
        // Manter compatibilidade com código existente
        window.mostrarMemoriaCalculo = (itemId) => this.showMemoryCalculation(itemId);
        window.copiarMemoriaCalculo = (itemId) => this.copyMemoryCalculation(itemId);
        window.exportarMemoriaCalculo = (itemId) => this.exportMemoryCalculation(itemId);
    }

    /**
     * Manipula evento de cálculo completado
     * @private
     * @param {Object} data - Dados do cálculo
     */
    handleCalculationCompleted(data) {
        if (data.results && data.totals) {
            this.showCalculationResults(data.results, data.totals);
        }
    }

    /**
     * Mostra resultados do cálculo DIFAL
     * @public
     * @param {Array} resultados - Array com resultados do cálculo
     * @param {Object} totalizadores - Objeto com totalizadores
     */
    showCalculationResults(resultados, totalizadores) {
        try {
            console.log('🎯 ResultsRenderer.showCalculationResults chamado:', { 
                resultados: resultados?.length || 0, 
                totalizadores: totalizadores || 'undefined',
                itensComDifal: resultados?.filter(r => (r.valorDifal || 0) > 0).length || 0,
                itensSemDifal: resultados?.filter(r => (r.valorDifal || 0) === 0).length || 0
            });
            
            // Suporte a IDs genéricos e específicos por modo
            const resultsDiv = document.getElementById('calculation-results') ||
                             document.getElementById('single-calculation-results') ||
                             document.getElementById('multi-calculation-results');
            
            const summaryDiv = document.getElementById('results-summary') ||
                             document.getElementById('single-results-summary') ||
                             document.getElementById('multi-results-summary');
            
            const detailDiv = document.getElementById('results-detail') ||
                            document.getElementById('single-results-detail') ||
                            document.getElementById('multi-results-detail');
            
            console.log('🔍 Elementos DOM encontrados:', {
                resultsDiv: !!resultsDiv,
                resultsDivId: resultsDiv?.id || 'not found',
                summaryDiv: !!summaryDiv,
                summaryDivId: summaryDiv?.id || 'not found',
                detailDiv: !!detailDiv,
                detailDivId: detailDiv?.id || 'not found'
            });
            
            // Mostrar seção de resultados
            if (resultsDiv) {
                resultsDiv.classList.remove('hidden');
                console.log(`✅ Classe "hidden" removida de #${resultsDiv.id}`);
            } else {
                console.error('❌ Elemento de resultados não encontrado (testou: #calculation-results, #single-calculation-results, #multi-calculation-results)');
            }
            
            // Renderizar resumo
            if (summaryDiv) {
                console.log('📊 Renderizando resumo:', totalizadores);
                this.renderResultsSummary(summaryDiv, totalizadores);
            }
            
            // Renderizar detalhes
            if (detailDiv && resultados.length > 0) {
                console.log('📋 Renderizando detalhes para', resultados.length, 'resultados');
                this.renderResultsDetail(detailDiv, resultados);
            } else if (detailDiv) {
                console.log('⚠️ Nenhum resultado para renderizar detalhes');
            }
            
            // Popular containers de resultados baseado no modo ativo
            this.renderModeSpecificResults(totalizadores, resultados);
            
            // Emitir evento de resultados exibidos
            if (this.eventBus) {
                this.eventBus.emit('RESULTS_DISPLAYED', { resultados, totalizadores });
            }
            
            console.log('📊 Resultados exibidos com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao exibir resultados:', error);
            this.handleError('Erro ao exibir resultados', error);
        }
    }

    /**
     * Renderiza resultados específicos do modo (single/multi-period)
     * @private
     */
    renderModeSpecificResults(totalizadores, resultados) {
        const activeMode = window.modeManager?.activeMode || 'single';
        
        if (activeMode === 'single') {
            this.renderSinglePeriodResults(totalizadores, resultados);
        } else {
            this.renderMultiPeriodResults(totalizadores, resultados);
        }
    }

    /**
     * Renderiza resultados para modo período único
     * @private
     */
    renderSinglePeriodResults(totalizadores, resultados) {
        const finalResultsDiv = document.getElementById('single-final-results');
        if (finalResultsDiv && totalizadores) {
            const simpleHTML = `
                <div class="simple-results">
                    <h3>💰 Resumo do Cálculo DIFAL</h3>
                    <div class="total-difal">
                        <strong>Total DIFAL a Recolher: R$ ${this.formatCurrency(totalizadores.totalRecolher || 0)}</strong>
                    </div>
                    <p>Cálculo realizado para ${totalizadores.totalItens || 0} itens (${totalizadores.itensComDifal || 0} com DIFAL)</p>
                </div>
            `;
            finalResultsDiv.innerHTML = simpleHTML;
            console.log('✅ Resultados single-period renderizados na aba Results');
        }
    }

    /**
     * Renderiza resultados para modo múltiplos períodos
     * @private
     */
    renderMultiPeriodResults(totalizadores, resultados) {
        // Renderizar na seção de Analytics multi-período
        const analyticsDiv = document.getElementById('multi-analytics-content');
        if (analyticsDiv && totalizadores) {
            let periodInfo = '';
            if (totalizadores.periodMetadata) {
                periodInfo = `
                    <div class="period-info">
                        <h4>📅 Período: ${totalizadores.periodMetadata.periodo}</h4>
                        <p>Empresa: ${totalizadores.periodMetadata.empresa} (CNPJ: ${totalizadores.periodMetadata.cnpj})</p>
                        <p>Data: ${totalizadores.periodMetadata.dataInicial} a ${totalizadores.periodMetadata.dataFinal}</p>
                    </div>
                `;
            }

            const multiHTML = `
                <div class="multi-period-results">
                    <h3>📊 Resultados DIFAL - Período Individual</h3>
                    ${periodInfo}
                    
                    <div class="results-grid">
                        <div class="result-card">
                            <span class="result-value">${this.formatCurrency(totalizadores.totalRecolher || 0)}</span>
                            <span class="result-label">Total a Recolher</span>
                        </div>
                        <div class="result-card">
                            <span class="result-value">${this.formatNumber(totalizadores.totalItens || 0)}</span>
                            <span class="result-label">Total de Itens</span>
                        </div>
                        <div class="result-card">
                            <span class="result-value">${this.formatNumber(totalizadores.itensComDifal || 0)}</span>
                            <span class="result-label">Itens com DIFAL</span>
                        </div>
                        <div class="result-card">
                            <span class="result-value">${this.formatCurrency(totalizadores.totalDifal || 0)}</span>
                            <span class="result-label">DIFAL Total</span>
                        </div>
                    </div>

                    <div class="multi-period-notice">
                        <p>💡 Este resultado será consolidado com outros períodos para análise integrada</p>
                        <p>📈 Navegue para <strong>Relatórios</strong> para ver análise consolidada completa</p>
                    </div>
                </div>
            `;
            analyticsDiv.innerHTML = multiHTML;
            console.log('✅ Resultados multi-period renderizados na seção Analytics');
        }
    }

    /**
     * Renderiza resumo dos resultados
     * @private
     * @param {HTMLElement} container - Container do resumo
     * @param {Object} totalizadores - Totalizadores do cálculo
     */
    renderResultsSummary(container, totalizadores) {
        const summaryHTML = `
            <div class="results-summary">
                <div class="result-item">
                    <div class="result-value">${this.formatNumber(totalizadores.totalItens)}</div>
                    <div class="result-label">Total de Itens</div>
                </div>
                <div class="result-item">
                    <div class="result-value">${this.formatCurrency(totalizadores.totalBase)}</div>
                    <div class="result-label">Base Total</div>
                </div>
                <div class="result-item">
                    <div class="result-value">${this.formatCurrency(totalizadores.totalDifal)}</div>
                    <div class="result-label">DIFAL Total</div>
                </div>
                <div class="result-item">
                    <div class="result-value">${this.formatCurrency(totalizadores.totalFcp)}</div>
                    <div class="result-label">FCP Total</div>
                </div>
                <div class="result-item">
                    <div class="result-value">${this.formatCurrency(totalizadores.totalRecolher)}</div>
                    <div class="result-label">Total a Recolher</div>
                </div>
                ${this.renderOptionalSummaryItems(totalizadores)}
            </div>
        `;
        
        container.innerHTML = summaryHTML;
    }

    /**
     * Renderiza itens opcionais do resumo
     * @private
     * @param {Object} totalizadores - Totalizadores do cálculo
     * @returns {string} HTML dos itens opcionais
     */
    renderOptionalSummaryItems(totalizadores) {
        let optionalItems = '';
        
        if (totalizadores.itensComBeneficio > 0) {
            optionalItems += `
                <div class="result-item">
                    <div class="result-value">${totalizadores.itensComBeneficio}</div>
                    <div class="result-label">Itens com Benefício</div>
                </div>
            `;
        }
        
        if (totalizadores.economiaTotal > 0) {
            optionalItems += `
                <div class="result-item">
                    <div class="result-value" style="color: #059669;">
                        ${this.formatCurrency(totalizadores.economiaTotal)}
                    </div>
                    <div class="result-label">💰 Economia Total</div>
                </div>
            `;
        }
        
        return optionalItems;
    }

    /**
     * Renderiza detalhes dos resultados
     * @private
     * @param {HTMLElement} container - Container dos detalhes
     * @param {Array} resultados - Array com resultados do cálculo
     */
    renderResultsDetail(container, resultados) {
        // Filtrar apenas itens com erro (manter todos os calculados para auditoria)
        const itensCalculados = resultados
            .filter(r => !r.erro) // Remove apenas itens com erro, mantém DIFAL=0 para auditoria
            .slice(0, this.config.table.maxItemsPerPage);
        
        if (itensCalculados.length > 0) {
            console.log(`📋 Exibindo ${itensCalculados.length} itens calculados (incluindo DIFAL=0 para auditoria)`);
            this.createResultsTable(container, itensCalculados);
        } else {
            container.innerHTML = '<p class="text-center text-gray-600">Nenhum item calculado disponível</p>';
        }
    }

    /**
     * Cria tabela de resultados com funcionalidades avançadas
     * @public
     * @param {HTMLElement} container - Container da tabela
     * @param {Array} resultados - Array com resultados do cálculo
     */
    createResultsTable(container, resultados) {
        try {
            const table = document.createElement('table');
            table.className = 'data-table';
            
            table.innerHTML = `
                <thead>
                    <tr>
                        <th class="sortable" data-column="item">Item</th>
                        <th class="sortable" data-column="cfop">CFOP</th>
                        <th class="sortable" data-column="base">Base</th>
                        <th class="sortable" data-column="metodologia">Metodologia</th>
                        <th class="sortable" data-column="difal">DIFAL</th>
                        <th class="sortable" data-column="fcp">FCP (%)</th>
                        <th class="sortable" data-column="total">Total</th>
                        <th>Benefícios</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${resultados.map(resultado => this.renderTableRow(resultado)).join('')}
                </tbody>
            `;
            
            container.innerHTML = '';
            container.appendChild(table);
            
            // Adicionar funcionalidades de ordenação
            this.addTableSortingListeners(table);
            
        } catch (error) {
            console.error('❌ Erro ao criar tabela de resultados:', error);
            container.innerHTML = '<p class="text-center text-red-600">Erro ao carregar resultados</p>';
        }
    }

    /**
     * Renderiza uma linha da tabela de resultados
     * @private
     * @param {Object} resultado - Resultado individual do cálculo
     * @returns {string} HTML da linha da tabela
     */
    renderTableRow(resultado) {
        const totalRecolher = (resultado.valorDifal || 0) + (resultado.valorFcp || 0);
        
        return `
            <tr data-item-id="${resultado.codItem}">
                <td>
                    <div class="font-mono text-sm">${resultado.codItem}</div>
                    <div class="text-xs text-gray-600" 
                         title="${this.formatCompleteDescription(resultado)}">
                        ${this.formatDisplayDescription(resultado)}
                    </div>
                </td>
                <td class="font-mono">${resultado.cfop}</td>
                <td class="text-right">${this.formatCurrency(resultado.baseCalculo)}</td>
                <td class="text-center">
                    <span class="badge ${this.getMethodologyBadgeClass(resultado.metodoCalculo)}">
                        ${this.getMethodologyDisplayName(resultado.metodoCalculo)}
                    </span>
                </td>
                <td class="text-right">${this.formatCurrency(resultado.valorDifal)}</td>
                <td class="text-center">
                    <span class="badge badge-gray">${resultado.aliqFcp || 0}%</span>
                    <div class="text-xs text-gray-600">${this.formatCurrency(resultado.valorFcp)}</div>
                </td>
                <td class="text-right font-bold">${this.formatCurrency(totalRecolher)}</td>
                <td class="text-center">${this.formatBenefits(resultado)}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline" 
                            onclick="window.mostrarMemoriaCalculo('${resultado.codItem}')">
                        📋 Memória
                    </button>
                </td>
            </tr>
        `;
    }

    /**
     * Formata benefícios aplicados para exibição
     * @public
     * @param {Object} resultado - Resultado do cálculo
     * @returns {string} HTML formatado dos benefícios
     */
    formatBenefits(resultado) {
        try {
            const itemId = resultado.codItem;
            const config = this.stateManager.getState().itemConfigs.get(itemId);
            
            if (!config || !config.beneficio) {
                return '<span class="text-gray-500">-</span>';
            }
            
            const benefitTypes = {
                'reducao-base': 'Redução Base',
                'reducao-aliquota-origem': 'Red. Alíq. Origem',
                'reducao-aliquota-destino': 'Red. Alíq. Destino',
                'isencao': 'Isenção'
            };
            
            let details = benefitTypes[config.beneficio] || config.beneficio;
            let badgeClass = 'badge-success';
            
            // Adicionar detalhes específicos baseados no tipo de benefício
            switch (config.beneficio) {
                case 'reducao-base':
                    if (config.cargaEfetivaDesejada) {
                        details += ` (${config.cargaEfetivaDesejada}%)`;
                    }
                    break;
                case 'reducao-aliquota-origem':
                    if (config.aliqOrigemEfetiva) {
                        details += ` (${config.aliqOrigemEfetiva}%)`;
                    }
                    break;
                case 'reducao-aliquota-destino':
                    if (config.aliqDestinoEfetiva) {
                        details += ` (${config.aliqDestinoEfetiva}%)`;
                    }
                    break;
                case 'isencao':
                    badgeClass = 'badge-warning';
                    break;
            }
            
            return `<span class="badge ${badgeClass}">${details}</span>`;
            
        } catch (error) {
            console.error('❌ Erro ao formatar benefícios:', error);
            return '<span class="text-red-500">Erro</span>';
        }
    }

    /**
     * Exibe modal com memória de cálculo
     * @public
     * @param {string} itemId - ID do item
     */
    showMemoryCalculation(itemId) {
        try {
            const state = this.stateManager.getState();
            // Corrigir acesso aos dados: results é o array direto, não results.resultados
            const resultados = state.calculation.results || [];
            const resultado = resultados.find(r => r.codItem === itemId);
            
            if (!resultado || !resultado.memoriaCalculo) {
                this.handleError('Memória de cálculo não disponível para este item');
                return;
            }
            
            const modal = this.createMemoryCalculationModal(itemId, resultado.memoriaCalculo);
            document.body.appendChild(modal);
            
            // Registrar modal ativo
            this.config.modals.activeModals.push(modal);
            this.config.modals.memoryCalculationModal = modal;
            
            // Emitir evento
            if (this.eventBus) {
                this.eventBus.emit('MEMORY_CALCULATION_MODAL_OPENED', { itemId });
            }
            
        } catch (error) {
            console.error('❌ Erro ao exibir memória de cálculo:', error);
            this.handleError('Erro ao exibir memória de cálculo', error);
        }
    }

    /**
     * Cria modal de memória de cálculo
     * @private
     * @param {string} itemId - ID do item
     * @param {Array} memoriaCalculo - Array com linhas da memória de cálculo
     * @returns {HTMLElement} Elemento do modal
     */
    createMemoryCalculationModal(itemId, memoriaCalculo) {
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
                            <pre style="white-space: pre-wrap; font-family: monospace; font-size: 14px; 
                                       line-height: 1.5; background: #f8f9fa; padding: 20px; 
                                       border-radius: 8px; overflow-x: auto;">
${memoriaCalculo.join('\n')}
                            </pre>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                            Fechar
                        </button>
                        <button class="btn btn-primary" 
                                onclick="window.copiarMemoriaCalculo('${itemId}')">
                            📋 Copiar
                        </button>
                        <button class="btn btn-info" 
                                onclick="window.exportarMemoriaCalculo('${itemId}')">
                            💾 Exportar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Adicionar listener para fechar ao clicar no overlay
        modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeModal(modal);
            }
        });
        
        return modal;
    }

    /**
     * Copia memória de cálculo para clipboard
     * @public
     * @param {string} itemId - ID do item
     */
    async copyMemoryCalculation(itemId) {
        try {
            const state = this.stateManager.getState();
            const resultados = state.calculation.results || [];
            const resultado = resultados.find(r => r.codItem === itemId);
            
            if (!resultado || !resultado.memoriaCalculo) {
                this.handleError('Memória de cálculo não disponível');
                return;
            }
            
            const texto = resultado.memoriaCalculo.join('\n');
            
            try {
                await navigator.clipboard.writeText(texto);
                this.showSuccess('Memória de cálculo copiada para a área de transferência!');
            } catch (clipboardError) {
                // Fallback para navegadores que não suportam clipboard API
                this.fallbackCopyToClipboard(texto);
            }
            
            // Emitir evento
            if (this.eventBus) {
                this.eventBus.emit('MEMORY_CALCULATION_COPIED', { itemId });
            }
            
        } catch (error) {
            console.error('❌ Erro ao copiar memória de cálculo:', error);
            this.handleError('Erro ao copiar memória de cálculo', error);
        }
    }

    /**
     * Exporta memória de cálculo para arquivo
     * @public
     * @param {string} itemId - ID do item
     */
    exportMemoryCalculation(itemId) {
        try {
            const state = this.stateManager.getState();
            const resultados = state.calculation.results || [];
            const resultado = resultados.find(r => r.codItem === itemId);
            
            if (!resultado || !resultado.memoriaCalculo) {
                this.handleError('Memória de cálculo não disponível');
                return;
            }
            
            const texto = resultado.memoriaCalculo.join('\n');
            const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            
            link.href = URL.createObjectURL(blob);
            link.download = `memoria_calculo_${itemId}_${new Date().getTime()}.txt`;
            link.click();
            
            URL.revokeObjectURL(link.href);
            
            // Emitir evento
            if (this.eventBus) {
                this.eventBus.emit('MEMORY_CALCULATION_EXPORTED', { itemId });
            }
            
            this.showSuccess('Memória de cálculo exportada com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao exportar memória de cálculo:', error);
            this.handleError('Erro ao exportar memória de cálculo', error);
        }
    }

    // Métodos auxiliares de formatação e utilitários

    /**
     * Formata número para exibição
     * @private
     * @param {number} value - Valor a ser formatado
     * @returns {string} Número formatado
     */
    formatNumber(value) {
        return Utils?.formatarNumero ? Utils.formatarNumero(value) : value.toLocaleString('pt-BR');
    }

    /**
     * Formata moeda para exibição
     * @private
     * @param {number} value - Valor a ser formatado
     * @returns {string} Moeda formatada
     */
    formatCurrency(value) {
        return Utils?.formatarMoeda ? Utils.formatarMoeda(value) : 
               new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }

    /**
     * Formata descrição completa do item
     * @private
     * @param {Object} item - Item do SPED
     * @returns {string} Descrição completa
     */
    formatCompleteDescription(resultado) {
        return resultado.descricaoItem || resultado.descItem || `Item ${resultado.codItem}`;
    }

    /**
     * Formata descrição para exibição limitada
     * @private
     * @param {Object} item - Item do SPED
     * @returns {string} Descrição limitada
     */
    formatDisplayDescription(resultado) {
        const description = this.formatCompleteDescription(resultado);
        const maxLength = this.config.display.maxDescriptionLength;
        return description.length > maxLength ? 
               `${description.substring(0, maxLength)}...` : description;
    }

    /**
     * Obtém classe CSS para badge de metodologia
     * @private
     * @param {string} metodologia - Tipo de metodologia
     * @returns {string} Classe CSS
     */
    getMethodologyBadgeClass(metodologia) {
        return metodologia === 'base-unica' ? 'badge-blue' : 'badge-green';
    }

    /**
     * Obtém nome de exibição da metodologia
     * @private
     * @param {string} metodologia - Tipo de metodologia
     * @returns {string} Nome de exibição
     */
    getMethodologyDisplayName(metodologia) {
        return metodologia === 'base-unica' ? 'Base Única' : 'Base Dupla';
    }

    /**
     * Fallback para copiar texto em navegadores antigos
     * @private
     * @param {string} text - Texto a ser copiado
     */
    fallbackCopyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        this.showSuccess('Memória de cálculo copiada para a área de transferência!');
    }

    /**
     * Fecha modal e limpa referências
     * @private
     * @param {HTMLElement} modal - Modal a ser fechado
     */
    closeModal(modal) {
        modal.remove();
        this.config.modals.activeModals = this.config.modals.activeModals.filter(m => m !== modal);
        if (this.config.modals.memoryCalculationModal === modal) {
            this.config.modals.memoryCalculationModal = null;
        }
    }

    /**
     * Adiciona listeners de ordenação à tabela
     * @private
     * @param {HTMLElement} table - Elemento da tabela
     */
    addTableSortingListeners(table) {
        const sortableHeaders = table.querySelectorAll('th.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.column;
                this.sortTable(table, column);
            });
        });
    }

    /**
     * Ordena tabela por coluna
     * @private
     * @param {HTMLElement} table - Elemento da tabela
     * @param {string} column - Coluna para ordenação
     */
    sortTable(table, column) {
        // Implementação da ordenação seria adicionada aqui
        console.log(`Ordenando tabela por coluna: ${column}`);
    }

    /**
     * Aplica filtros aos resultados
     * @private
     * @param {Object} filters - Filtros a serem aplicados
     */
    applyFilters(filters) {
        this.config.table.filters = { ...this.config.table.filters, ...filters };
        this.refreshResults();
    }

    /**
     * Atualiza exibição dos resultados
     * @private
     */
    refreshResults() {
        const state = this.stateManager.getState();
        if (state.calculation.results && state.calculation.totals) {
            this.showCalculationResults(
                state.calculation.results.resultados,
                state.calculation.totals
            );
        }
    }

    /**
     * Exibe mensagem de sucesso
     * @private
     * @param {string} message - Mensagem de sucesso
     */
    showSuccess(message) {
        // Implementação da notificação seria integrada aqui
        alert(message); // Fallback temporário
    }

    /**
     * Manipula e exibe erros
     * @private
     * @param {string} message - Mensagem de erro
     * @param {Error} [error] - Objeto de erro opcional
     */
    handleError(message, error = null) {
        console.error('❌ ResultsRenderer Error:', message, error);
        
        if (this.eventBus) {
            this.eventBus.emit('RESULTS_ERROR', { message, error });
        }
        
        // Fallback para exibição de erro
        alert(message);
    }
}

// Exportar classe para uso global
if (typeof window !== 'undefined') {
    window.ResultsRenderer = ResultsRenderer;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResultsRenderer;
}