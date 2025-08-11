/**
 * Configuration Manager - Gerenciamento de configurações por item
 * Extraído do ui-manager.js para modularização
 * Responsável por: configuração de benefícios fiscais, localStorage, validações
 */

class ConfigurationManager {
    constructor(eventBus, stateManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        
        // Estado interno
        this.filteredItems = [];
        this.currentPage = 1;
        this.pageSize = 25;
        this.totalPages = 1;
        
        console.log('⚙️ Configuration Manager initialized');
        this.init();
    }

    /**
     * Inicializa o gerenciador de configurações
     */
    init() {
        this.setupGlobalFunctions();
        this.initializeConfigurationSystem();
    }

    /**
     * Inicializa sistema de configurações
     */
    initializeConfigurationSystem() {
        if (!window.difalConfiguracoesItens) {
            window.difalConfiguracoesItens = {};
        }
        
        // Carregar configurações salvas
        this.carregarTodasConfiguracaoLocalStorage();
        console.log('🔄 Configurações carregadas do localStorage:', window.difalConfiguracoesItens);
    }

    /**
     * Configura funções globais que serão acessadas pelos event handlers do HTML
     */
    setupGlobalFunctions() {
        const self = this;

        // Função para configurar benefício de um item
        window.configurarBeneficioItem = function(itemId, beneficio) {
            self.configurarBeneficioItem(itemId, beneficio);
        };

        // Função para configurar carga efetiva
        window.configurarCargaEfetiva = function(itemId, valor) {
            self.configurarCargaEfetiva(itemId, valor);
        };

        // Função para configurar alíquota origem
        window.configurarAliqOrigem = function(itemId, valor) {
            self.configurarAliqOrigem(itemId, valor);
        };

        // Função para configurar alíquota destino
        window.configurarAliqDestino = function(itemId, valor) {
            self.configurarAliqDestino(itemId, valor);
        };

        // Função para configurar FCP manual
        window.configurarFcpItem = function(itemId, valor) {
            self.configurarFcpItem(itemId, valor);
        };

        // Função para salvar configurações
        window.salvarConfiguracoesItens = function() {
            self.salvarConfiguracoesItens();
        };

        // Função para limpar todas as configurações
        window.limparTodasConfiguracoes = function() {
            self.limparTodasConfiguracoes();
        };

        // Função para aplicar configuração por NCM
        window.aplicarPorNCM = function(ncm, itemIdOrigem) {
            self.aplicarPorNCM(ncm, itemIdOrigem);
        };

        // Função para limpar configuração de um item
        window.limparConfigItem = function(itemId) {
            self.limparConfigItem(itemId);
        };

        // Função para calcular com configurações de itens
        window.calcularComConfiguracoesItens = function() {
            self.calcularComConfiguracoesItens();
        };

        // Funções de filtros (chamadas pelos event handlers do HTML)
        window.aplicarFiltros = function() {
            self.aplicarFiltros();
        };

        window.limparFiltros = function() {
            self.limparFiltros();
        };
    }

    /**
     * Configura benefício de um item
     * @param {string} itemId - ID do item
     * @param {string} beneficio - Tipo de benefício
     */
    configurarBeneficioItem(itemId, beneficio) {
        console.log(`🎯 configurarBeneficioItem: itemId=${itemId}, beneficio="${beneficio}"`);
        
        if (!window.difalConfiguracoesItens[itemId]) {
            window.difalConfiguracoesItens[itemId] = {};
        }
        
        if (beneficio) {
            window.difalConfiguracoesItens[itemId].beneficio = beneficio;
            
            // Validar se o benefício tem os campos obrigatórios preenchidos
            const validacao = this.validarBeneficioConfiguracao(itemId, beneficio, window.difalConfiguracoesItens[itemId]);
            if (!validacao.valido) {
                console.log(`⚠️ Benefício configurado mas incompleto: ${validacao.mensagem}`);
                // Benefício será salvo mesmo incompleto para permitir configuração posterior
            }
        } else {
            delete window.difalConfiguracoesItens[itemId].beneficio;
            delete window.difalConfiguracoesItens[itemId].cargaEfetivaDesejada;
            delete window.difalConfiguracoesItens[itemId].aliqOrigemEfetiva;
            delete window.difalConfiguracoesItens[itemId].aliqDestinoEfetiva;
        }
        
        // Atualizar campos dinâmicos
        const fieldsDiv = document.getElementById(`beneficio-fields-${itemId}`);
        if (fieldsDiv) {
            fieldsDiv.innerHTML = this.createBeneficioFields(itemId, window.difalConfiguracoesItens[itemId]);
            fieldsDiv.className = `beneficio-fields-inline ${beneficio ? 'show' : ''}`;
        }
        
        // Atualizar classe da linha
        const row = document.querySelector(`tr[data-item="${itemId}"]`);
        if (row) {
            row.className = `item-row ${beneficio ? 'with-benefit' : ''} ${window.difalConfiguracoesItens[itemId].fcpManual ? 'with-fcp' : ''}`;
        }
        
        this.updateSummary();
    }

    /**
     * Configura carga efetiva de um item
     * @param {string} itemId - ID do item
     * @param {string} valor - Valor da carga efetiva
     */
    configurarCargaEfetiva(itemId, valor) {
        console.log(`🎯 configurarCargaEfetiva: itemId=${itemId}, valor="${valor}"`);
        
        if (!window.difalConfiguracoesItens[itemId]) {
            window.difalConfiguracoesItens[itemId] = {};
        }
        
        // Validação adequada: só salva se for número válido > 0, senão remove a propriedade
        if (valor && !isNaN(parseFloat(valor)) && parseFloat(valor) > 0) {
            const valorNumerico = parseFloat(valor);
            window.difalConfiguracoesItens[itemId].cargaEfetivaDesejada = valorNumerico;
            console.log(`✅ Carga efetiva configurada: ${valorNumerico}%`);
        } else {
            // Remove a propriedade se valor é inválido ou vazio
            delete window.difalConfiguracoesItens[itemId].cargaEfetivaDesejada;
            console.log(`🚫 Carga efetiva removida (valor inválido: "${valor}")`);
        }
        
        // Salvar no localStorage
        this.salvarConfiguracaoLocalStorage(itemId);
    }

    /**
     * Configura alíquota origem de um item
     * @param {string} itemId - ID do item
     * @param {string} valor - Valor da alíquota origem
     */
    configurarAliqOrigem(itemId, valor) {
        console.log(`🎯 configurarAliqOrigem: itemId=${itemId}, valor="${valor}"`);
        
        if (!window.difalConfiguracoesItens[itemId]) {
            window.difalConfiguracoesItens[itemId] = {};
        }
        
        // Validação adequada: só salva se for número válido >= 0, senão remove a propriedade
        if (valor !== "" && !isNaN(parseFloat(valor)) && parseFloat(valor) >= 0) {
            const valorNumerico = parseFloat(valor);
            window.difalConfiguracoesItens[itemId].aliqOrigemEfetiva = valorNumerico;
            console.log(`✅ Alíquota origem configurada: ${valorNumerico}%`);
        } else {
            // Remove a propriedade se valor é inválido ou vazio
            delete window.difalConfiguracoesItens[itemId].aliqOrigemEfetiva;
            console.log(`🚫 Alíquota origem removida (valor inválido: "${valor}")`);
        }
        
        // Salvar no localStorage
        this.salvarConfiguracaoLocalStorage(itemId);
    }

    /**
     * Configura alíquota destino de um item
     * @param {string} itemId - ID do item
     * @param {string} valor - Valor da alíquota destino
     */
    configurarAliqDestino(itemId, valor) {
        console.log(`🎯 configurarAliqDestino: itemId=${itemId}, valor="${valor}"`);
        
        if (!window.difalConfiguracoesItens[itemId]) {
            window.difalConfiguracoesItens[itemId] = {};
        }
        
        // Validação adequada: só salva se for número válido >= 0, senão remove a propriedade
        if (valor !== "" && !isNaN(parseFloat(valor)) && parseFloat(valor) >= 0) {
            const valorNumerico = parseFloat(valor);
            window.difalConfiguracoesItens[itemId].aliqDestinoEfetiva = valorNumerico;
            console.log(`✅ Alíquota destino configurada: ${valorNumerico}%`);
        } else {
            // Remove a propriedade se valor é inválido ou vazio
            delete window.difalConfiguracoesItens[itemId].aliqDestinoEfetiva;
            console.log(`🚫 Alíquota destino removida (valor inválido: "${valor}")`);
        }
        
        // Salvar no localStorage
        this.salvarConfiguracaoLocalStorage(itemId);
    }

    /**
     * Configura FCP manual de um item
     * @param {string} itemId - ID do item
     * @param {string} valor - Valor do FCP
     */
    configurarFcpItem(itemId, valor) {
        if (!window.difalConfiguracoesItens[itemId]) {
            window.difalConfiguracoesItens[itemId] = {};
        }
        
        if (valor) {
            window.difalConfiguracoesItens[itemId].fcpManual = parseFloat(valor);
        } else {
            delete window.difalConfiguracoesItens[itemId].fcpManual;
        }
        
        // Atualizar classe da linha
        const row = document.querySelector(`tr[data-item="${itemId}"]`);
        if (row) {
            const hasBenefit = window.difalConfiguracoesItens[itemId].beneficio;
            const hasFcp = window.difalConfiguracoesItens[itemId].fcpManual;
            row.className = `item-row ${hasBenefit ? 'with-benefit' : ''} ${hasFcp ? 'with-fcp' : ''}`;
        }
        
        this.updateSummary();
    }

    /**
     * Aplica configuração para todos os itens com o mesmo NCM
     * @param {string} ncm - NCM a aplicar
     * @param {string} itemIdOrigem - ID do item origem da configuração
     */
    aplicarPorNCM(ncm, itemIdOrigem) {
        if (!ncm || ncm === 'N/A') {
            alert('NCM não disponível para este item');
            return;
        }
        
        const configOrigem = window.difalConfiguracoesItens[itemIdOrigem] || {};
        
        if (!configOrigem.beneficio && !configOrigem.fcpManual) {
            alert('Este item não possui configuração para aplicar');
            return;
        }
        
        const spedData = this.stateManager.getSpedData();
        if (!spedData || !spedData.itensDifal) {
            alert('Dados SPED não disponíveis');
            return;
        }
        
        const itensComMesmoNCM = spedData.itensDifal.filter(item => item.ncm === ncm);
        const count = itensComMesmoNCM.length;
        
        if (confirm(`Aplicar configuração deste item para ${count} item(ns) com NCM ${ncm}?`)) {
            itensComMesmoNCM.forEach(item => {
                const itemId = item.codItem;
                
                if (!window.difalConfiguracoesItens[itemId]) {
                    window.difalConfiguracoesItens[itemId] = {};
                }
                
                // Copiar configuração
                Object.assign(window.difalConfiguracoesItens[itemId], configOrigem);
            });
            
            // Re-renderizar tabela usando método próprio
            this.renderItemConfigTable();
            
            alert(`Configuração aplicada para ${count} item(ns) com NCM ${ncm}`);
        }
    }

    /**
     * Limpa configuração de um item específico
     * @param {string} itemId - ID do item
     */
    limparConfigItem(itemId) {
        if (window.difalConfiguracoesItens[itemId]) {
            delete window.difalConfiguracoesItens[itemId];
            
            // Re-renderizar linha usando método próprio
            const row = document.querySelector(`tr[data-item="${itemId}"]`);
            if (row) {
                const spedData = this.stateManager.getSpedData();
                if (spedData && spedData.itensDifal) {
                    const item = spedData.itensDifal.find(i => i.codItem === itemId);
                    if (item) {
                        row.outerHTML = this.createItemConfigRow(item);
                    }
                }
            }
            
            this.updateSummary();
        }
    }

    /**
     * Salva todas as configurações
     */
    salvarConfiguracoesItens() {
        const count = Object.keys(window.difalConfiguracoesItens).length;
        
        if (count === 0) {
            alert('Nenhuma configuração para salvar');
            return;
        }
        
        // Salvar todas as configurações no localStorage
        Object.keys(window.difalConfiguracoesItens).forEach(itemId => {
            this.salvarConfiguracaoLocalStorage(itemId);
        });
        
        console.log('💾 Configurações salvas:', window.difalConfiguracoesItens);
        alert(`${count} configuração(ões) de item salva(s) com sucesso!`);
        
        // Emitir evento para notificar outros módulos
        this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.CONFIG_SAVED, {
            count,
            configs: window.difalConfiguracoesItens
        });
    }

    /**
     * Limpa todas as configurações
     */
    limparTodasConfiguracoes() {
        const memoryCount = Object.keys(window.difalConfiguracoesItens).length;
        const storageCount = this.countLocalStorageConfigs();
        
        if (memoryCount === 0 && storageCount === 0) {
            alert('Não há configurações para limpar');
            return;
        }
        
        const confirmacao = confirm(`Tem certeza que deseja limpar todas as configurações?\n\nNa memória: ${memoryCount} item(ns)\nNo localStorage: ${storageCount} item(ns)\n\nEsta ação não pode ser desfeita.`);
        
        if (confirmacao) {
            // Limpar configurações na memória
            window.difalConfiguracoesItens = {};
            
            // Limpar localStorage
            this.limparConfiguracoesLocalStorage();
            
            // Recarregar a tabela para refletir as mudanças
            this.renderItemConfigTable();
            
            // Atualizar estatísticas na interface
            this.updateStorageStats();
            
            console.log('🧹 Todas as configurações foram limpas');
            alert(`Configurações limpas com sucesso!\n${memoryCount + storageCount} item(ns) removido(s)`);
            
            // Emitir evento para notificar outros módulos
            this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.CONFIG_CHANGED, {
                action: 'cleared',
                count: memoryCount + storageCount
            });
        }
    }

    /**
     * Inicia cálculo com configurações de itens
     */
    calcularComConfiguracoesItens() {
        const configCount = Object.keys(window.difalConfiguracoesItens).length;
        const spedData = this.stateManager.getSpedData();
        const totalItems = spedData?.itensDifal?.length || 0;
        
        console.log(`🧮 Calculando DIFAL com ${configCount} configuração(ões) de item`);
        
        // Fechar modal se estiver aberto
        if (window.closeItemConfigModal) {
            window.closeItemConfigModal();
        }
        
        // Calcular com configurações usando sistema modular
        if (window.difalApp && window.difalApp.calculateDifal) {
            const configGeral = window.difalConfiguracaoGeral || {};
            window.difalApp.calculateDifal(configGeral);
        }
        
        // Emitir evento para notificar outros módulos
        this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.CALCULATION_STARTED, {
            configCount,
            totalItems
        });
    }

    // === FUNÇÕES DE localStorage ===

    /**
     * Salva configuração de item no localStorage
     * @param {string} itemId - ID do item
     */
    salvarConfiguracaoLocalStorage(itemId) {
        try {
            const chave = `difal_config_${itemId}`;
            const config = window.difalConfiguracoesItens[itemId] || {};
            localStorage.setItem(chave, JSON.stringify(config));
            console.log(`💾 Configuração salva no localStorage: ${chave}`, config);
        } catch (error) {
            console.error('❌ Erro ao salvar configuração no localStorage:', error);
        }
    }

    /**
     * Carrega configuração de item do localStorage
     * @param {string} itemId - ID do item
     * @returns {Object|null} - Configuração ou null se não encontrada
     */
    carregarConfiguracaoLocalStorage(itemId) {
        try {
            const chave = `difal_config_${itemId}`;
            const configSalva = localStorage.getItem(chave);
            if (configSalva) {
                const config = JSON.parse(configSalva);
                console.log(`📂 Configuração carregada do localStorage: ${chave}`, config);
                return config;
            }
        } catch (error) {
            console.error('❌ Erro ao carregar configuração do localStorage:', error);
        }
        return null;
    }

    /**
     * Carrega todas as configurações do localStorage
     */
    carregarTodasConfiguracaoLocalStorage() {
        try {
            console.log('📂 Carregando todas as configurações do localStorage...');
            let configuracoesCarregadas = 0;
            
            // Percorrer todas as chaves do localStorage procurando por configurações DIFAL
            for (let i = 0; i < localStorage.length; i++) {
                const chave = localStorage.key(i);
                if (chave && chave.startsWith('difal_config_')) {
                    const itemId = chave.replace('difal_config_', '');
                    const config = this.carregarConfiguracaoLocalStorage(itemId);
                    if (config && Object.keys(config).length > 0) {
                        if (!window.difalConfiguracoesItens[itemId]) {
                            window.difalConfiguracoesItens[itemId] = {};
                        }
                        Object.assign(window.difalConfiguracoesItens[itemId], config);
                        configuracoesCarregadas++;
                    }
                }
            }
            
            if (configuracoesCarregadas > 0) {
                console.log(`✅ ${configuracoesCarregadas} configurações carregadas do localStorage`);
                
                // Emitir evento para notificar outros módulos
                this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.CONFIG_LOADED, {
                    count: configuracoesCarregadas,
                    configs: window.difalConfiguracoesItens
                });
            } else {
                console.log('ℹ️ Nenhuma configuração encontrada no localStorage');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar configurações do localStorage:', error);
        }
    }

    /**
     * Limpa todas as configurações do localStorage
     */
    limparConfiguracoesLocalStorage() {
        try {
            console.log('🧹 Limpando configurações do localStorage...');
            const chavesRemover = [];
            
            // Coletar chaves que começam com 'difal_config_'
            for (let i = 0; i < localStorage.length; i++) {
                const chave = localStorage.key(i);
                if (chave && chave.startsWith('difal_config_')) {
                    chavesRemover.push(chave);
                }
            }
            
            // Remover as chaves
            chavesRemover.forEach(chave => {
                localStorage.removeItem(chave);
                console.log(`🗑️ Removida configuração: ${chave}`);
            });
            
            console.log(`✅ ${chavesRemover.length} configurações removidas do localStorage`);
        } catch (error) {
            console.error('❌ Erro ao limpar configurações do localStorage:', error);
        }
    }

    /**
     * Conta quantas configurações existem no localStorage
     * @returns {number} - Número de configurações
     */
    countLocalStorageConfigs() {
        try {
            let count = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('difal_config_')) {
                    count++;
                }
            }
            return count;
        } catch (error) {
            console.error('❌ Erro ao contar configurações do localStorage:', error);
            return 0;
        }
    }

    /**
     * Atualiza estatísticas de armazenamento na interface
     */
    updateStorageStats() {
        try {
            const storageCountEl = document.getElementById('configs-localstorage');
            const statusEl = document.getElementById('storage-status');
            
            if (storageCountEl) {
                const count = this.countLocalStorageConfigs();
                storageCountEl.textContent = count;
            }
            
            if (statusEl) {
                const count = this.countLocalStorageConfigs();
                const memoryCount = Object.keys(window.difalConfiguracoesItens || {}).length;
                
                if (count > 0) {
                    statusEl.innerHTML = `<small>💾 ${count} config(s) salva(s) • ${memoryCount} na memória</small>`;
                } else {
                    statusEl.innerHTML = `<small>🆕 Nenhuma configuração salva • ${memoryCount} na memória</small>`;
                }
            }
        } catch (error) {
            console.error('❌ Erro ao atualizar estatísticas:', error);
        }
    }

    // === FUNÇÕES DE VALIDAÇÃO E UTILIDADES ===

    /**
     * Valida se um benefício está configurado corretamente
     * @param {string} itemId - ID do item
     * @param {string} tipoBeneficio - Tipo de benefício
     * @param {Object} config - Configuração do item
     * @returns {Object} - Resultado da validação
     */
    validarBeneficioConfiguracao(itemId, tipoBeneficio, config) {
        switch (tipoBeneficio) {
            case 'reducao-base':
                if (!config.cargaEfetivaDesejada || config.cargaEfetivaDesejada <= 0) {
                    return {
                        valido: false,
                        mensagem: 'Carga efetiva deve ser informada e maior que 0'
                    };
                }
                break;
                
            case 'reducao-aliquota-origem':
                if (config.aliqOrigemEfetiva === undefined || config.aliqOrigemEfetiva < 0) {
                    return {
                        valido: false,
                        mensagem: 'Alíquota origem efetiva deve ser informada e >= 0'
                    };
                }
                break;
                
            case 'reducao-aliquota-destino':
                if (config.aliqDestinoEfetiva === undefined || config.aliqDestinoEfetiva < 0) {
                    return {
                        valido: false,
                        mensagem: 'Alíquota destino efetiva deve ser informada e >= 0'
                    };
                }
                break;
                
            case 'isencao':
                // Isenção não precisa de valores adicionais
                return { valido: true };
                
            default:
                return {
                    valido: false,
                    mensagem: 'Tipo de benefício desconhecido'
                };
        }
        
        return { valido: true };
    }

    /**
     * Cria campos dinâmicos de benefício
     * @param {string} itemId - ID do item
     * @param {Object} config - Configuração do item
     * @returns {string} - HTML dos campos
     */
    createBeneficioFields(itemId, config) {
        const beneficio = config.beneficio;
        
        switch (beneficio) {
            case 'reducao-base':
                return `
                    <input type="number" min="0" max="100" step="0.01" 
                           value="${config.cargaEfetivaDesejada || ''}" 
                           placeholder="Carga efetiva desejada (%)"
                           onchange="configurarCargaEfetiva('${itemId}', this.value)">
                `;
            case 'reducao-aliquota-origem':
                return `
                    <input type="number" min="0" max="25" step="0.1" 
                           value="${config.aliqOrigemEfetiva || ''}" 
                           placeholder="Alíquota origem efetiva (%)"
                           onchange="configurarAliqOrigem('${itemId}', this.value)">
                `;
            case 'reducao-aliquota-destino':
                return `
                    <input type="number" min="0" max="25" step="0.1" 
                           value="${config.aliqDestinoEfetiva || ''}" 
                           placeholder="Alíquota destino efetiva (%)"
                           onchange="configurarAliqDestino('${itemId}', this.value)">
                `;
            case 'isencao':
                return '<small class="text-green-600">Item isento de DIFAL</small>';
            default:
                return '';
        }
    }

    /**
     * Atualiza resumo da configuração
     */
    updateSummary() {
        const totalItens = this.filteredItems.length;
        const itensComBeneficio = Object.keys(window.difalConfiguracoesItens).length;
        const valorTotalBase = this.filteredItems.reduce((sum, item) => sum + (item.baseCalculoDifal || 0), 0);
        
        const totalItensEl = document.getElementById('total-itens-config');
        const itensComBeneficioEl = document.getElementById('itens-com-beneficio');
        const valorTotalBaseEl = document.getElementById('valor-total-base');

        if (totalItensEl) totalItensEl.textContent = `${totalItens} itens`;
        if (itensComBeneficioEl) itensComBeneficioEl.textContent = `${itensComBeneficio} com benefício`;
        if (valorTotalBaseEl && window.Utils) {
            valorTotalBaseEl.textContent = `${window.Utils.formatarMoeda(valorTotalBase)} base total`;
        }
    }

    /**
     * Define itens filtrados (usado pelo UI Manager)
     * @param {Array} items - Array de itens filtrados
     */
    setFilteredItems(items) {
        this.filteredItems = items || [];
        this.updateSummary();
    }

    /**
     * Obtém estatísticas das configurações
     * @returns {Object} - Estatísticas
     */
    getConfigurationStats() {
        const memoryConfigs = Object.keys(window.difalConfiguracoesItens || {}).length;
        const storageConfigs = this.countLocalStorageConfigs();
        
        const beneficioTypes = {};
        const fcpConfigs = 0;
        
        // Contar tipos de benefícios
        for (const config of Object.values(window.difalConfiguracoesItens || {})) {
            if (config.beneficio) {
                beneficioTypes[config.beneficio] = (beneficioTypes[config.beneficio] || 0) + 1;
            }
        }

        return {
            memory: memoryConfigs,
            storage: storageConfigs,
            total: memoryConfigs + storageConfigs,
            beneficioTypes,
            totalWithBenefits: Object.values(window.difalConfiguracoesItens || {}).filter(c => c.beneficio).length,
            totalWithFcp: Object.values(window.difalConfiguracoesItens || {}).filter(c => c.fcpManual).length
        };
    }

    /**
     * Exporta configurações para JSON
     * @returns {Object} - Configurações em formato JSON
     */
    exportConfigurations() {
        return {
            version: window.DIFAL_CONSTANTS?.VERSION || '3.0.0',
            timestamp: new Date().toISOString(),
            configurations: window.difalConfiguracoesItens || {},
            stats: this.getConfigurationStats()
        };
    }

    /**
     * Importa configurações de JSON
     * @param {Object} data - Dados das configurações
     * @returns {boolean} - Sucesso da importação
     */
    importConfigurations(data) {
        try {
            if (!data || !data.configurations) {
                throw new Error('Dados de configuração inválidos');
            }

            // Limpar configurações existentes
            window.difalConfiguracoesItens = {};
            this.limparConfiguracoesLocalStorage();

            // Importar configurações
            window.difalConfiguracoesItens = data.configurations;

            // Salvar no localStorage
            Object.keys(window.difalConfiguracoesItens).forEach(itemId => {
                this.salvarConfiguracaoLocalStorage(itemId);
            });

            console.log('📥 Configurações importadas com sucesso:', data);
            
            // Emitir evento
            this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.CONFIG_LOADED, {
                count: Object.keys(window.difalConfiguracoesItens).length,
                configs: window.difalConfiguracoesItens,
                imported: true
            });

            return true;
        } catch (error) {
            console.error('❌ Erro ao importar configurações:', error);
            return false;
        }
    }

    // === FUNÇÕES DE RENDERIZAÇÃO E UI ===

    /**
     * Renderiza tabela de configuração de itens - MÉTODO CRÍTICO
     */
    renderItemConfigTable() {
        console.log('🎯 renderItemConfigTable called');
        
        // Obter dados via StateManager (versão modular)
        const spedData = this.stateManager.getSpedData();
        if (!spedData || !spedData.itensDifal) {
            console.error('❌ Nenhum dado SPED disponível para renderização');
            this.renderEmptyTable();
            return;
        }

        // Inicializar itens filtrados
        this.filteredItems = [...spedData.itensDifal];
        this.currentPage = 1;
        this.totalPages = Math.ceil(this.filteredItems.length / this.pageSize);

        console.log(`📊 Renderizando tabela com ${this.filteredItems.length} itens DIFAL`);

        // Renderizar tabela
        this.renderTableContent();
        
        // Atualizar componentes auxiliares
        this.setupFilters();
        this.updateSummary();
        this.updatePagination();
        this.updateStorageStats();
    }

    /**
     * Renderiza conteúdo da tabela
     */
    renderTableContent() {
        const tbody = document.querySelector('#tabela-configuracao-itens tbody');
        if (!tbody) {
            console.error('❌ Tbody da tabela não encontrado');
            return;
        }

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageItems = this.filteredItems.slice(startIndex, endIndex);

        tbody.innerHTML = pageItems.map(item => this.createItemConfigRow(item)).join('');
    }

    /**
     * Renderiza tabela vazia
     */
    renderEmptyTable() {
        const tbody = document.querySelector('#tabela-configuracao-itens tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center text-gray-500">Nenhum item DIFAL disponível</td></tr>';
        }
        
        // Zerar estatísticas
        const elements = {
            'total-itens-config': '0',
            'itens-com-beneficio': '0', 
            'valor-total-base': 'R$ 0,00',
            'configs-localstorage': '0'
        };

        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });
    }

    /**
     * Cria linha de configuração para um item
     */
    createItemConfigRow(item) {
        const itemId = item.codItem;
        const config = window.difalConfiguracoesItens[itemId] || {};
        
        return `
            <tr class="item-row ${config.beneficio ? 'with-benefit' : ''} ${config.fcpManual ? 'with-fcp' : ''}" data-item="${itemId}">
                <td class="font-mono">${item.codItem}</td>
                <td class="font-mono">${item.ncm || 'N/A'}</td>
                <td class="descricao-cell" title="${this.formatarDescricaoCompleta(item)}">${this.formatarDescricaoExibicao(item, 30)}</td>
                <td class="font-mono">${item.cfop}</td>
                <td class="text-right">${window.Utils?.formatarMoeda(item.baseCalculoDifal) || item.baseCalculoDifal}</td>
                <td>
                    <select onchange="configurarBeneficioItem('${itemId}', this.value)">
                        <option value="" ${!config.beneficio ? 'selected' : ''}>Nenhum</option>
                        <option value="reducao-base" ${config.beneficio === 'reducao-base' ? 'selected' : ''}>Redução Base</option>
                        <option value="reducao-aliquota-origem" ${config.beneficio === 'reducao-aliquota-origem' ? 'selected' : ''}>Redução Alíq. Origem</option>
                        <option value="reducao-aliquota-destino" ${config.beneficio === 'reducao-aliquota-destino' ? 'selected' : ''}>Redução Alíq. Destino</option>
                        <option value="isencao" ${config.beneficio === 'isencao' ? 'selected' : ''}>Isenção</option>
                    </select>
                </td>
                <td>
                    <div id="beneficio-fields-${itemId}" class="beneficio-fields-inline ${config.beneficio ? 'show' : ''}">
                        ${this.createBeneficioFields(itemId, config)}
                    </div>
                </td>
                <td class="text-center">
                    <input type="number" min="0" max="4" step="0.1" 
                           value="${config.fcpManual || ''}" 
                           placeholder="2.0"
                           onchange="configurarFcpItem('${itemId}', this.value)"
                           style="width: 60px;">
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-mini apply-ncm" 
                                onclick="aplicarPorNCM('${item.ncm}', '${itemId}')"
                                title="Aplicar para todos os itens deste NCM">
                            NCM
                        </button>
                        <button class="btn-mini clear" 
                                onclick="limparConfigItem('${itemId}')"
                                title="Limpar configuração">
                            ×
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Configura filtros dos selects
     */
    setupFilters() {
        const spedData = this.stateManager.getSpedData();
        if (!spedData || !spedData.itensDifal) return;

        // Filtro CFOP
        const cfopSelect = document.getElementById('filtro-cfop');
        if (cfopSelect) {
            const cfopsUnicos = [...new Set(spedData.itensDifal.map(item => item.cfop))].sort();
            cfopSelect.innerHTML = '<option value="">Todos</option>' + 
                cfopsUnicos.map(cfop => `<option value="${cfop}">${cfop}</option>`).join('');
        }

        // Filtro NCM
        const ncmSelect = document.getElementById('filtro-ncm');
        if (ncmSelect) {
            const ncmsUnicos = [...new Set(spedData.itensDifal.map(item => item.ncm).filter(Boolean))].sort();
            ncmSelect.innerHTML = '<option value="">Todos</option>' + 
                ncmsUnicos.map(ncm => `<option value="${ncm}">${ncm}</option>`).join('');
        }
    }

    /**
     * Atualiza paginação
     */
    updatePagination() {
        const infoPagina = document.getElementById('info-pagina');
        if (infoPagina) {
            infoPagina.textContent = `Página ${this.currentPage} de ${this.totalPages}`;
        }
    }

    /**
     * Formata descrição completa do item
     */
    formatarDescricaoCompleta(item) {
        return item.descricaoItem || `Item ${item.codItem} - NCM ${item.ncm}`;
    }

    /**
     * Formata descrição para exibição (truncada)
     */
    formatarDescricaoExibicao(item, maxLength = 30) {
        const desc = this.formatarDescricaoCompleta(item);
        return desc.length > maxLength ? desc.substring(0, maxLength) + '...' : desc;
    }

    /**
     * Aplicar filtros nos itens
     */
    aplicarFiltros() {
        const spedData = this.stateManager.getSpedData();
        if (!spedData || !spedData.itensDifal) return;

        const cfopFiltro = document.getElementById('filtro-cfop')?.value;
        const ncmFiltro = document.getElementById('filtro-ncm')?.value;
        const valorMinFiltro = parseFloat(document.getElementById('filtro-valor-min')?.value) || 0;
        const buscaFiltro = document.getElementById('busca-item')?.value.toLowerCase();

        this.filteredItems = spedData.itensDifal.filter(item => {
            const matchCfop = !cfopFiltro || item.cfop === cfopFiltro;
            const matchNcm = !ncmFiltro || item.ncm === ncmFiltro;
            const matchValor = !valorMinFiltro || (parseFloat(item.baseCalculoDifal) || 0) >= valorMinFiltro;
            const matchBusca = !buscaFiltro || 
                item.codItem.toLowerCase().includes(buscaFiltro) ||
                (item.descricaoItem || '').toLowerCase().includes(buscaFiltro) ||
                (item.ncm || '').toLowerCase().includes(buscaFiltro);

            return matchCfop && matchNcm && matchValor && matchBusca;
        });

        this.currentPage = 1;
        this.totalPages = Math.ceil(this.filteredItems.length / this.pageSize);
        this.renderTableContent();
        this.updateSummary();
        this.updatePagination();
    }

    /**
     * Limpar filtros
     */
    limparFiltros() {
        document.getElementById('filtro-cfop').value = '';
        document.getElementById('filtro-ncm').value = '';
        document.getElementById('filtro-valor-min').value = '';
        document.getElementById('busca-item').value = '';
        
        this.aplicarFiltros();
    }
}

// Expor globalmente para uso no browser
if (typeof window !== 'undefined') {
    window.ConfigurationManager = ConfigurationManager;
}

// Exportar classe para uso se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigurationManager;
}