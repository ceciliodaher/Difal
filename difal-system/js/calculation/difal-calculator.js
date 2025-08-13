/**
 * DIFAL Calculator - Versão Modular
 * Integração completa com StateManager e ConfigurationManager
 * Corrige aplicação de benefícios fiscais
 */

class DifalCalculatorModular {
    constructor(eventBus, stateManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        
        // Estados da calculadora
        this.ufOrigem = null;
        this.ufDestino = null;
        this.itens = [];
        this.resultados = [];
        this.totalizadores = null;
        
        // Cache de dados de alíquotas
        this.aliquotasCache = new Map();
        
        console.log('🧮 DIFAL Calculator Modular initialized');
        this.init();
    }

    init() {
        // Verificar dependências críticas
        if (!window.EstadosUtil) {
            console.error('❌ CRÍTICO: window.EstadosUtil não disponível! Verificar carregamento de estados-brasil.js');
            throw new Error('EstadosUtil não disponível - sistema não pode calcular DIFAL');
        } else {
            console.log('✅ window.EstadosUtil disponível');
        }
        
        // Event listeners
        this.eventBus?.on(window.DIFAL_CONSTANTS?.EVENTS?.CONFIG_CHANGED, (data) => {
            this.onConfigurationChanged(data);
        });
        
        // *** REMOVIDO AUTO-CÁLCULO ***
        // O cálculo deve ser chamado explicitamente pelo usuário, não automaticamente
        // this.eventBus?.on(window.DIFAL_CONSTANTS?.EVENTS?.CALCULATION_REQUESTED, (data) => {
        //     this.executeCalculation(data);
        // });
    }

    /**
     * Configura UFs de origem e destino
     */
    configurarUFs(origem, destino) {
        this.ufOrigem = origem;
        this.ufDestino = destino;
        
        console.log(`🎯 UFs configuradas: ${origem} → ${destino}`);
    }

    /**
     * Carrega itens para cálculo (suporte single/multi-period)
     */
    carregarItens(itens, periodMetadata = null) {
        this.itens = itens || [];
        this.periodMetadata = periodMetadata; // Metadados do período para análise multi-período
        console.log(`📦 ${this.itens.length} itens carregados para cálculo${periodMetadata ? ` (período: ${periodMetadata.periodo})` : ''}`);
        
        // Se há metadados de período, adicionar aos itens para rastreabilidade
        if (periodMetadata && this.itens.length > 0) {
            this.itens = this.itens.map(item => ({
                ...item,
                periodMetadata: {
                    periodo: periodMetadata.periodo,
                    empresa: periodMetadata.empresa,
                    cnpj: periodMetadata.cnpj,
                    dataInicial: periodMetadata.dataInicial,
                    dataFinal: periodMetadata.dataFinal
                }
            }));
            console.log(`🏷️ Metadados de período adicionados aos ${this.itens.length} itens`);
        }
    }

    /**
     * Executa cálculo DIFAL para todos os itens
     */
    calcularTodos() {
        console.log('🚀 Iniciando cálculos DIFAL...');
        
        if (!this.itens || this.itens.length === 0) {
            throw new Error('Nenhum item disponível para cálculo');
        }

        this.resultados = [];
        let totalDifal = 0;
        let totalFcp = 0;
        let totalBase = 0;
        let totalItens = 0;
        let itensComDifal = 0;

        this.itens.forEach((item, index) => {
            try {
                const resultado = this.calcularItem(item);
                this.resultados.push(resultado);
                
                totalDifal += resultado.valorDifal || 0;
                totalFcp += resultado.valorFcp || 0;
                totalBase += resultado.baseCalculo || 0;
                totalItens++;
                
                if ((resultado.valorDifal || 0) > 0) {
                    itensComDifal++;
                }
            } catch (error) {
                console.error(`❌ Erro ao calcular item ${item.codItem}:`, error);
                this.resultados.push({
                    ...item,
                    erro: error.message,
                    valorDifal: 0,
                    valorFcp: 0,
                    baseCalculo: 0
                });
            }
        });

        const totalRecolher = totalDifal + totalFcp;

        this.totalizadores = {
            totalItens,
            itensComDifal,
            totalDifal,
            totalFcp,
            totalBase,
            totalRecolher,
            percentualComDifal: totalItens > 0 ? (itensComDifal / totalItens) * 100 : 0,
            // Metadados do período para análise multi-período
            periodMetadata: this.periodMetadata || null
        };

        console.log('✅ Cálculos concluídos:', this.totalizadores);
        return this.resultados;
    }

    /**
     * Retorna resultados formatados para análise multi-período
     */
    getResultadosParaMultiPeriodo() {
        return {
            resultados: this.resultados,
            totalizadores: this.totalizadores,
            periodMetadata: this.periodMetadata,
            timestamp: new Date().toISOString(),
            isMultiPeriod: !!this.periodMetadata
        };
    }

    /**
     * Calcula DIFAL para um item específico usando métodos Base Única/Base Dupla
     */
    calcularItem(item) {
        const itemId = item.codItem;
        const config = this.stateManager?.getItemConfiguration(itemId) || {};
        
        console.log(`🧮 Calculando item ${itemId} com método ${this.getMetodoCalculo(this.ufDestino)}:`, { item, config });

        // Base de cálculo
        let baseCalculo = item.baseCalculoDifal || 0;
        
        // Obter alíquotas
        const aliqOrigem = this.obterAliquotaOrigem(item, config);
        const aliqDestino = this.obterAliquotaDestino(item, config);
        const aliqFcp = this.obterAliquotaFcp(item, config);
        
        // Debug das alíquotas obtidas
        console.log(`🔍 DEBUG Alíquotas para item ${itemId}:`, {
            aliqOrigem, 
            aliqDestino, 
            aliqFcp,
            ufOrigem: this.ufOrigem,
            ufDestino: this.ufDestino,
            cfop: item.cfop
        });

        let calculo = {
            ...item,
            baseCalculoOriginal: baseCalculo,
            baseCalculo,
            aliqOrigem,
            aliqDestino, 
            aliqFcp,
            valorDifal: 0,
            valorFcp: 0,
            beneficioAplicado: null,
            memoriaCalculo: [],
            metodoCalculo: this.getMetodoCalculo(this.ufDestino)
        };

        // Log inicial
        calculo.memoriaCalculo.push(`=== MEMÓRIA DE CÁLCULO - ITEM ${item.codItem} ===`);
        calculo.memoriaCalculo.push(`Método: ${calculo.metodoCalculo.toUpperCase()}`);
        calculo.memoriaCalculo.push(`Base original: ${window.Utils?.formatarMoeda(baseCalculo) || baseCalculo}`);
        calculo.memoriaCalculo.push(`UFs: ${this.ufOrigem} → ${this.ufDestino}`);
        calculo.memoriaCalculo.push(`CFOP: ${item.cfop} (DIFAL: ${item.cfop === '2551' || item.cfop === '2556' ? 'SIM' : 'NÃO'})`);
        calculo.memoriaCalculo.push(`Alíquotas: Origem ${aliqOrigem}% | Destino ${aliqDestino}% | FCP ${aliqFcp}%`);

        // Aplicar benefícios na configuração para os métodos
        const configCalculoComBeneficios = this.prepararConfiguracaoBeneficios(config);

        // Calcular DIFAL apenas se não houver isenção
        if (config.beneficio !== 'isencao') {
            // Determinar método de cálculo
            if (calculo.metodoCalculo === 'base-unica') {
                calculo.valorDifal = this.calcularDifalBaseUnica(
                    baseCalculo, 
                    aliqOrigem, 
                    aliqDestino, 
                    configCalculoComBeneficios
                );
                calculo.memoriaCalculo.push(`DIFAL (Base Única): ${window.Utils?.formatarMoeda(calculo.valorDifal) || calculo.valorDifal}`);
            } else {
                const resultadoBaseDupla = this.calcularDifalBaseDupla(
                    baseCalculo, 
                    aliqOrigem, 
                    aliqDestino, 
                    configCalculoComBeneficios
                );
                calculo.valorDifal = resultadoBaseDupla.difal;
                
                // Adicionar detalhes do cálculo Base Dupla à memória
                const detalhes = resultadoBaseDupla.detalhes;
                calculo.memoriaCalculo.push(`1. Valor c/ benefício origem: ${window.Utils?.formatarMoeda(detalhes.valorComBeneficioOrigem) || detalhes.valorComBeneficioOrigem}`);
                calculo.memoriaCalculo.push(`2. ICMS Interestadual: ${window.Utils?.formatarMoeda(detalhes.icmsInterestadual) || detalhes.icmsInterestadual}`);
                calculo.memoriaCalculo.push(`3. Base de Cálculo 1: ${window.Utils?.formatarMoeda(detalhes.baseCalculo1) || detalhes.baseCalculo1}`);
                calculo.memoriaCalculo.push(`4. Nova Base: ${window.Utils?.formatarMoeda(detalhes.novaBase) || detalhes.novaBase}`);
                calculo.memoriaCalculo.push(`5. Base de Cálculo 2: ${window.Utils?.formatarMoeda(detalhes.baseCalculo2) || detalhes.baseCalculo2}`);
                calculo.memoriaCalculo.push(`6. ICMS Interno: ${window.Utils?.formatarMoeda(detalhes.icmsInterno) || detalhes.icmsInterno}`);
                calculo.memoriaCalculo.push(`7. DIFAL: ${window.Utils?.formatarMoeda(calculo.valorDifal) || calculo.valorDifal}`);
            }
            
            // FCP (sempre calculado da mesma forma)
            if (calculo.aliqFcp > 0) {
                calculo.valorFcp = (calculo.baseCalculo * calculo.aliqFcp) / 100;
                calculo.memoriaCalculo.push(`FCP: ${window.Utils?.formatarMoeda(calculo.valorFcp) || calculo.valorFcp} (${calculo.baseCalculo} × ${calculo.aliqFcp}%)`);
            }
            
        } else {
            calculo.memoriaCalculo.push('ISENÇÃO: Item isento de DIFAL e FCP');
        }

        // Finalizar memória de cálculo
        const totalRecolher = (calculo.valorDifal || 0) + (calculo.valorFcp || 0);
        calculo.memoriaCalculo.push(`----------------------------------------`);
        calculo.memoriaCalculo.push(`RESULTADO FINAL:`);
        calculo.memoriaCalculo.push(`DIFAL: ${window.Utils?.formatarMoeda(calculo.valorDifal) || calculo.valorDifal}`);
        calculo.memoriaCalculo.push(`FCP: ${window.Utils?.formatarMoeda(calculo.valorFcp) || calculo.valorFcp}`);
        calculo.memoriaCalculo.push(`TOTAL A RECOLHER: ${window.Utils?.formatarMoeda(totalRecolher) || totalRecolher}`);
        calculo.memoriaCalculo.push(`========================================`);

        console.log(`✅ Item ${itemId} calculado (${calculo.metodoCalculo}):`, {
            valorDifal: calculo.valorDifal,
            valorFcp: calculo.valorFcp,
            beneficio: config.beneficio,
            baseOriginal: baseCalculo,
            baseFinal: calculo.baseCalculo,
            memoriaLength: calculo.memoriaCalculo.length
        });

        return calculo;
    }

    /**
     * Prepara configuração de benefícios no formato esperado pelos métodos
     */
    prepararConfiguracaoBeneficios(config) {
        const configBeneficios = {};
        
        // Mapear benefícios para formato esperado pelos métodos
        if (config.beneficio === 'reducao-aliquota-origem') {
            configBeneficios.beneficioOrigem = 'reducao-aliquota';
            configBeneficios.aliqOrigemEfetiva = config.aliqOrigemEfetiva;
        } else if (config.beneficio === 'reducao-base' && config.origem === 'origem') {
            configBeneficios.beneficioOrigem = 'reducao-base';
            configBeneficios.aliqOrigemEfetiva = config.aliqOrigemEfetiva;
        }
        
        if (config.beneficio === 'reducao-aliquota-destino') {
            configBeneficios.beneficioDestino = 'reducao-aliquota';
            configBeneficios.aliqDestinoEfetiva = config.aliqDestinoEfetiva;
        } else if (config.beneficio === 'reducao-base' && config.destino === 'destino') {
            configBeneficios.beneficioDestino = 'reducao-base';
            configBeneficios.aliqDestinoEfetiva = config.aliqDestinoEfetiva;
        }
        
        return configBeneficios;
    }

    /**
     * Aplica benefício fiscal ao item
     */
    aplicarBeneficio(calculo, config) {
        const beneficio = config.beneficio;
        console.log(`🎁 Aplicando benefício: ${beneficio} para item ${calculo.codItem}`);

        switch (beneficio) {
            case 'reducao-base':
                return this.aplicarReducaoBase(calculo, config.cargaEfetivaDesejada);
                
            case 'reducao-aliquota-origem':
                return this.aplicarReducaoAliquotaOrigem(calculo, config.aliqOrigemEfetiva);
                
            case 'reducao-aliquota-destino': 
                return this.aplicarReducaoAliquotaDestino(calculo, config.aliqDestinoEfetiva);
                
            case 'isencao':
                return this.aplicarIsencao(calculo);
                
            default:
                console.log(`⚠️ Benefício desconhecido: ${beneficio}`);
                return calculo;
        }
    }

    /**
     * Aplica redução de base de cálculo
     */
    aplicarReducaoBase(calculo, cargaEfetivaDesejada) {
        if (!cargaEfetivaDesejada || cargaEfetivaDesejada <= 0) {
            console.log(`🚫 Redução de base rejeitada: valor inválido (${cargaEfetivaDesejada})`);
            return calculo;
        }

        const baseOriginal = calculo.baseCalculo;
        const aliqDestino = calculo.aliqDestino;
        
        // Calcular base necessária para atingir carga efetiva desejada
        const baseNecessaria = (baseOriginal * cargaEfetivaDesejada) / aliqDestino;
        const percentualReducao = ((baseOriginal - baseNecessaria) / baseOriginal) * 100;
        
        calculo.baseCalculo = baseNecessaria;
        calculo.beneficioAplicado = {
            tipo: 'reducao-base',
            cargaEfetivaDesejada,
            baseOriginal,
            baseNova: baseNecessaria,
            percentualReducao: Math.round(percentualReducao * 100) / 100
        };

        calculo.memoriaCalculo.push(`🎁 REDUÇÃO BASE: ${window.Utils?.formatarMoeda(baseOriginal)} → ${window.Utils?.formatarMoeda(baseNecessaria)} (${percentualReducao.toFixed(2)}% redução)`);
        calculo.memoriaCalculo.push(`   Carga efetiva desejada: ${cargaEfetivaDesejada}%`);

        console.log(`✅ Redução de base aplicada: ${percentualReducao.toFixed(2)}%`, calculo.beneficioAplicado);
        return calculo;
    }

    /**
     * Aplica redução de alíquota origem
     */
    aplicarReducaoAliquotaOrigem(calculo, aliqOrigemEfetiva) {
        if (aliqOrigemEfetiva === undefined || aliqOrigemEfetiva < 0) {
            console.log(`🚫 Redução alíquota origem rejeitada: valor inválido (${aliqOrigemEfetiva})`);
            return calculo;
        }

        const aliqOriginal = calculo.aliqOrigem;
        calculo.aliqOrigem = aliqOrigemEfetiva;
        
        calculo.beneficioAplicado = {
            tipo: 'reducao-aliquota-origem',
            aliqOriginal,
            aliqNova: aliqOrigemEfetiva,
            reducao: aliqOriginal - aliqOrigemEfetiva
        };

        calculo.memoriaCalculo.push(`🎁 REDUÇÃO ALÍQ. ORIGEM: ${aliqOriginal}% → ${aliqOrigemEfetiva}%`);

        console.log(`✅ Redução alíquota origem aplicada: ${aliqOriginal}% → ${aliqOrigemEfetiva}%`);
        return calculo;
    }

    /**
     * Aplica redução de alíquota destino
     */
    aplicarReducaoAliquotaDestino(calculo, aliqDestinoEfetiva) {
        if (aliqDestinoEfetiva === undefined || aliqDestinoEfetiva < 0) {
            console.log(`🚫 Redução alíquota destino rejeitada: valor inválido (${aliqDestinoEfetiva})`);
            return calculo;
        }

        const aliqOriginal = calculo.aliqDestino;
        calculo.aliqDestino = aliqDestinoEfetiva;
        
        calculo.beneficioAplicado = {
            tipo: 'reducao-aliquota-destino',
            aliqOriginal,
            aliqNova: aliqDestinoEfetiva,
            reducao: aliqOriginal - aliqDestinoEfetiva
        };

        calculo.memoriaCalculo.push(`🎁 REDUÇÃO ALÍQ. DESTINO: ${aliqOriginal}% → ${aliqDestinoEfetiva}%`);

        console.log(`✅ Redução alíquota destino aplicada: ${aliqOriginal}% → ${aliqDestinoEfetiva}%`);
        return calculo;
    }

    /**
     * Aplica isenção
     */
    aplicarIsencao(calculo) {
        calculo.valorDifal = 0;
        calculo.valorFcp = 0;
        calculo.beneficioAplicado = {
            tipo: 'isencao'
        };

        calculo.memoriaCalculo.push(`🎁 ISENÇÃO: Item isento de DIFAL e FCP`);

        console.log(`✅ Isenção aplicada ao item ${calculo.codItem}`);
        return calculo;
    }

    /**
     * Obtém alíquota de origem (interestadual)
     */
    obterAliquotaOrigem(item, config) {
        // 1. Configuração manual tem prioridade
        if (config.aliqOrigemEfetiva !== undefined && config.aliqOrigemEfetiva >= 0) {
            return config.aliqOrigemEfetiva;
        }
        
        // 2. Configuração global
        const configGlobal = this.stateManager?.getState('calculation.settings') || {};
        if (configGlobal.aliqOrigemEfetiva !== undefined && configGlobal.aliqOrigemEfetiva >= 0) {
            return configGlobal.aliqOrigemEfetiva;
        }
        
        // 3. Usar alíquota interestadual padrão
        // Para operações interestaduais: 4% (importados), 7% ou 12% (nacionais)
        if (this.ufOrigem !== this.ufDestino) {
            // Se tem alíquota definida no item (do SPED), usar ela
            // Parser salva em aliqOrigemNota (posição 13 do C170)
            if (item.aliqOrigemNota && item.aliqOrigemNota > 0) {
                console.log(`🎯 Usando alíquota origem do SPED para item ${item.codItem}: ${item.aliqOrigemNota}%`);
                return item.aliqOrigemNota;
            }
            
            // Fallback para aliqInterestadual (compatibilidade)
            if (item.aliqInterestadual && item.aliqInterestadual > 0) {
                return item.aliqInterestadual;
            }
            
            // Verificar se é produto importado (4%)
            // Critérios para identificar importação: CFOP específicos ou indicadores
            const cfopsImportacao = ['3000', '3001', '3002', '3949', '3556', '3551'];
            if (cfopsImportacao.includes(item.cfop)) {
                return 4; // Importados = 4%
            }
            
            // Lógica de alíquotas interestaduais para produtos nacionais
            const ufsSulSudeste = ['SP', 'RJ', 'MG', 'ES', 'PR', 'SC', 'RS'];
            const ufsNorteNordesteCO = ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO', 'MA', 'PI', 'CE', 'RN', 'PE', 'PB', 'SE', 'AL', 'BA', 'MT', 'MS', 'GO', 'DF'];
            
            const origemSulSudeste = ufsSulSudeste.includes(this.ufOrigem);
            const destinoSulSudeste = ufsSulSudeste.includes(this.ufDestino);
            
            // Regras DIFAL para produtos nacionais:
            // - Norte/Nordeste/CO para Sul/Sudeste: 12%
            // - Demais operações nacionais: 7%
            
            if (!origemSulSudeste && destinoSulSudeste) {
                return 12; // Norte/Nordeste/CO para Sul/Sudeste = 12%
            } else {
                return 7;  // Demais casos nacionais = 7%
            }
        }
        
        return 0; // Operação interna não tem DIFAL
    }

    /**
     * Obtém alíquota de destino
     */
    obterAliquotaDestino(item, config) {
        // Prioridade: configuração individual > configuração global > alíquota padrão
        if (config.aliqDestinoEfetiva !== undefined) {
            return config.aliqDestinoEfetiva;
        }
        
        const configGlobal = this.stateManager?.getState('calculation.settings') || {};
        if (configGlobal.aliqDestinoEfetiva !== undefined) {
            return configGlobal.aliqDestinoEfetiva;
        }
        
        return this.obterAliquotaPadrao(this.ufDestino);
    }

    /**
     * Obtém alíquota de FCP
     */
    obterAliquotaFcp(item, config) {
        // Prioridade: configuração individual > configuração global > alíquota padrão
        if (config.fcpManual !== undefined) {
            return config.fcpManual;
        }
        
        return this.obterAliquotaFcpPadrao(this.ufDestino);
    }

    /**
     * Obtém alíquota padrão para um estado
     */
    obterAliquotaPadrao(uf) {
        if (!uf) {
            console.error(`❌ UF não fornecida para obterAliquotaPadrao`);
            return null;
        }
        
        if (!window.EstadosUtil) {
            console.error(`❌ window.EstadosUtil não disponível - verificar carregamento de estados-brasil.js`);
            return null;
        }
        
        const estado = window.EstadosUtil.obterPorUF(uf);
        if (!estado) {
            console.error(`❌ Estado não encontrado: ${uf}`);
            return null;
        }
        
        console.log(`✅ Alíquota obtida para ${uf}: ${estado.aliqInterna}%`);
        return estado.aliqInterna;
    }

    /**
     * Obtém alíquota FCP padrão para um estado  
     * Segue a lógica estabelecida:
     * - Faixas (1% a 2%): usar limite MÍNIMO
     * - "Até x%": usar ZERO
     * - Fixo: usar valor FIXO
     */
    obterAliquotaFcpPadrao(uf) {
        if (!uf || !window.DIFAL_CONSTANTS) return 0;
        
        // Usar as constantes FCP definidas no constants.js (já corrigidas conforme documentação oficial)
        return window.DIFAL_CONSTANTS.DIFAL.FCP_DEFAULT[uf.toUpperCase()] || 0;
    }

    /**
     * Handler para mudança de configuração
     */
    onConfigurationChanged(data) {
        console.log('📝 Configuração alterada, invalidando cache:', data);
        this.aliquotasCache.clear();
    }

    /**
     * Executa cálculo via evento
     */
    executeCalculation(data) {
        try {
            this.configurarUFs(data.ufOrigem, data.ufDestino);
            this.carregarItens(data.itens);
            
            const resultados = this.calcularTodos();
            
            // Notificar resultados
            this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.CALCULATION_COMPLETED, {
                resultados,
                totalizadores: this.totalizadores
            });
            
        } catch (error) {
            console.error('❌ Erro no cálculo:', error);
            this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.CALCULATION_ERROR, {
                error: error.message
            });
        }
    }

    /**
     * Prepara dados para exportação Excel
     */
    prepararDadosExcel() {
        const cabecalhos = [
            'Código Item',
            'NCM',
            'Descrição',
            'CFOP', 
            'Base Cálculo Original',
            'Base Cálculo Final',
            'Alíq. Origem (%)',
            'Alíq. Destino (%)',
            'Alíq. FCP (%)',
            'Valor DIFAL',
            'Valor FCP',
            'Benefício',
            'Observações'
        ];

        const dados = this.resultados.map(item => [
            item.codItem || '',
            item.ncm || 'N/A',
            item.descricaoItem || '',
            item.cfop || '',
            item.baseCalculoOriginal || 0,
            item.baseCalculo || 0,
            item.aliqOrigem || 0,
            item.aliqDestino || 0,
            item.aliqFcp || 0,
            item.valorDifal || 0,
            item.valorFcp || 0,
            item.beneficioAplicado?.tipo || '',
            item.memoriaCalculo ? item.memoriaCalculo.join(' | ') : ''
        ]);

        return { cabecalhos, dados };
    }

    /**
     * Obtém totalizadores
     */
    obterTotalizadores() {
        return this.totalizadores;
    }


    /**
     * Determina método de cálculo baseado no estado de destino
     */
    getMetodoCalculo(ufDestino) {
        // Estados que usam Base Dupla (tributação "por dentro")
        const baseDupla = ['AL','BA','GO','MA','MS','MG','PA','PB','PR','PE','PI','RJ','RS','SC','SP','SE','TO'];
        
        // Estados que usam Base Única (tributação "por fora")
        // AC, AP, AM, CE, DF, ES, MT, RN, RO, RR
        
        return baseDupla.includes(ufDestino) ? 'base-dupla' : 'base-unica';
    }

    /**
     * Calcula DIFAL usando método Base Única (por fora)
     */
    calcularDifalBaseUnica(baseCalculo, aliqOrigem, aliqDestino, config = {}) {
        let baseFinal = baseCalculo;
        let aliqOrigemFinal = aliqOrigem;
        let aliqDestinoFinal = aliqDestino;
        
        // Aplicar benefício na ORIGEM
        if (config.beneficioOrigem === 'reducao-aliquota') {
            aliqOrigemFinal = config.aliqOrigemEfetiva || aliqOrigem;
        } else if (config.beneficioOrigem === 'reducao-base') {
            const percentualBeneficio = ((aliqOrigem - (config.aliqOrigemEfetiva || 0)) / aliqOrigem) * 100;
            baseFinal = baseCalculo * (percentualBeneficio / 100);
        }
        
        // Aplicar benefício no DESTINO
        if (config.beneficioDestino === 'reducao-aliquota') {
            aliqDestinoFinal = config.aliqDestinoEfetiva || aliqDestino;
        } else if (config.beneficioDestino === 'reducao-base') {
            const percentualBeneficio = ((aliqDestino - (config.aliqDestinoEfetiva || 0)) / aliqDestino) * 100;
            aliqDestinoFinal = aliqDestino * (percentualBeneficio / 100);
        }
        
        // Cálculo DIFAL = Base × (Alíquota Destino - Alíquota Origem)
        const diferenca = aliqDestinoFinal - aliqOrigemFinal;
        return diferenca > 0 ? baseFinal * (diferenca / 100) : 0;
    }

    /**
     * Calcula DIFAL usando método Base Dupla (por dentro) - 8 passos
     */
    calcularDifalBaseDupla(baseCalculo, aliqOrigem, aliqDestino, config = {}) {
        // Passo 1: Aplicar benefício na ORIGEM
        let valorComBeneficio = baseCalculo;
        let aliqOrigemFinal = aliqOrigem;
        
        if (config.beneficioOrigem === 'reducao-aliquota') {
            aliqOrigemFinal = config.aliqOrigemEfetiva || aliqOrigem;
        } else if (config.beneficioOrigem === 'reducao-base') {
            const percentualBeneficio = ((aliqOrigem - (config.aliqOrigemEfetiva || 0)) / aliqOrigem) * 100;
            valorComBeneficio = baseCalculo * (percentualBeneficio / 100);
        }
        
        // Passo 2: ICMS Interestadual
        const icmsInterestadual = valorComBeneficio * (aliqOrigemFinal / 100);
        
        // Passo 3: Base de Cálculo 1 (Exclusão do ICMS Interestadual)
        const baseCalculo1 = valorComBeneficio - icmsInterestadual;
        
        // Passo 4: Determinar alíquota para Nova Base
        let aliqDestinoFinal = aliqDestino;
        if (config.beneficioDestino === 'reducao-aliquota') {
            aliqDestinoFinal = config.aliqDestinoEfetiva || aliqDestino;
        }
        
        // Passo 5: Nova Base (Reintrodução do ICMS)
        const novaBase = baseCalculo1 / (1 - aliqDestinoFinal / 100);
        
        // Passo 6: Aplicar benefício final no DESTINO (se redução de base)
        let baseCalculo2 = novaBase;
        if (config.beneficioDestino === 'reducao-base') {
            const percentualBeneficio = ((aliqDestino - (config.aliqDestinoEfetiva || 0)) / aliqDestino) * 100;
            baseCalculo2 = novaBase * (percentualBeneficio / 100);
        }
        
        // Passo 7: ICMS Interno
        const icmsInterno = baseCalculo2 * (aliqDestinoFinal / 100);
        
        // Passo 8: DIFAL
        const difal = icmsInterno - icmsInterestadual;
        
        return {
            difal: difal > 0 ? difal : 0,
            detalhes: {
                valorComBeneficioOrigem: valorComBeneficio,
                icmsInterestadual,
                baseCalculo1,
                novaBase,
                baseCalculo2,
                icmsInterno,
                aliqOrigemFinal,
                aliqDestinoFinal
            }
        };
    }

    /**
     * Limpa dados da calculadora
     */
    limpar() {
        this.ufOrigem = null;
        this.ufDestino = null;
        this.itens = [];
        this.resultados = [];
        this.totalizadores = null;
        this.aliquotasCache.clear();
        
        console.log('🧹 Calculator modular limpa');
    }

    /**
     * Obtém estatísticas de debug
     */
    getDebugInfo() {
        return {
            ufOrigem: this.ufOrigem,
            ufDestino: this.ufDestino,
            totalItens: this.itens.length,
            totalResultados: this.resultados.length,
            totalizadores: this.totalizadores,
            cacheSize: this.aliquotasCache.size
        };
    }
}

// Expor globalmente para compatibilidade
if (typeof window !== 'undefined') {
    window.DifalCalculatorModular = DifalCalculatorModular;
    // Alias para compatibilidade com código existente
    window.DifalCalculator = DifalCalculatorModular;
}

// Exportar classe para uso se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DifalCalculatorModular;
}