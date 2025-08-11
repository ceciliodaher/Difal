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
     * Carrega itens para cálculo
     */
    carregarItens(itens) {
        this.itens = itens || [];
        console.log(`📦 ${this.itens.length} itens carregados para cálculo`);
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
        let totalItens = 0;
        let itensComDifal = 0;

        this.itens.forEach((item, index) => {
            try {
                const resultado = this.calcularItem(item);
                this.resultados.push(resultado);
                
                totalDifal += resultado.valorDifal || 0;
                totalFcp += resultado.valorFcp || 0;
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
                    valorFcp: 0
                });
            }
        });

        this.totalizadores = {
            totalItens,
            itensComDifal,
            totalDifal,
            totalFcp,
            percentualComDifal: totalItens > 0 ? (itensComDifal / totalItens) * 100 : 0
        };

        console.log('✅ Cálculos concluídos:', this.totalizadores);
        return this.resultados;
    }

    /**
     * Calcula DIFAL para um item específico
     */
    calcularItem(item) {
        const itemId = item.codItem;
        const config = this.stateManager?.getItemConfiguration(itemId) || {};
        
        console.log(`🧮 Calculando item ${itemId}:`, { item, config });

        // Base de cálculo
        let baseCalculo = item.baseCalculoDifal || 0;
        
        // Obter alíquotas
        const aliqOrigem = this.obterAliquotaOrigem(item, config);
        const aliqDestino = this.obterAliquotaDestino(item, config);
        const aliqFcp = this.obterAliquotaFcp(item, config);

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
            memoriaCalculo: []
        };

        // Log inicial
        calculo.memoriaCalculo.push(`Base original: ${window.Utils?.formatarMoeda(baseCalculo) || baseCalculo}`);
        calculo.memoriaCalculo.push(`Alíquotas: Origem ${aliqOrigem}% | Destino ${aliqDestino}% | FCP ${aliqFcp}%`);

        // Aplicar benefícios ANTES do cálculo
        if (config.beneficio) {
            calculo = this.aplicarBeneficio(calculo, config);
        }

        // Calcular DIFAL apenas se não houver isenção
        if (config.beneficio !== 'isencao') {
            // ICMS Origem
            const icmsOrigem = (calculo.baseCalculo * calculo.aliqOrigem) / 100;
            
            // ICMS Destino
            const icmsDestino = (calculo.baseCalculo * calculo.aliqDestino) / 100;
            
            // DIFAL
            calculo.valorDifal = Math.max(0, icmsDestino - icmsOrigem);
            
            // FCP
            if (calculo.aliqFcp > 0) {
                calculo.valorFcp = (calculo.baseCalculo * calculo.aliqFcp) / 100;
            }

            calculo.memoriaCalculo.push(`ICMS Origem: ${window.Utils?.formatarMoeda(icmsOrigem) || icmsOrigem} (${calculo.baseCalculo} × ${calculo.aliqOrigem}%)`);
            calculo.memoriaCalculo.push(`ICMS Destino: ${window.Utils?.formatarMoeda(icmsDestino) || icmsDestino} (${calculo.baseCalculo} × ${calculo.aliqDestino}%)`);
            calculo.memoriaCalculo.push(`DIFAL: ${window.Utils?.formatarMoeda(calculo.valorDifal) || calculo.valorDifal}`);
            
            if (calculo.valorFcp > 0) {
                calculo.memoriaCalculo.push(`FCP: ${window.Utils?.formatarMoeda(calculo.valorFcp) || calculo.valorFcp} (${calculo.baseCalculo} × ${calculo.aliqFcp}%)`);
            }
        } else {
            calculo.memoriaCalculo.push('ISENÇÃO: Item isento de DIFAL e FCP');
        }

        console.log(`✅ Item ${itemId} calculado:`, {
            valorDifal: calculo.valorDifal,
            valorFcp: calculo.valorFcp,
            beneficio: config.beneficio,
            baseOriginal: baseCalculo,
            baseFinal: calculo.baseCalculo
        });

        return calculo;
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
     * Obtém alíquota de origem
     * SEMPRE usa alíquota do SPED, calculada com base no CST para casos especiais
     */
    obterAliquotaOrigem(item, config) {
        console.log(`🔍 obterAliquotaOrigem - Item ${item.codItem}: CST=${item.cstIcms}, VL_ITEM=${item.valorItem}, VL_ICMS=${item.valorIcms}, ALIQ=${item.aliqIcms}`);
        // 1. Apenas configuração manual individual sobrescreve SPED
        if (config.aliqOrigemEfetiva !== undefined) {
            return config.aliqOrigemEfetiva;
        }
        
        // 2. Apenas configuração global sobrescreve SPED
        const configGlobal = this.stateManager?.getState('calculation.settings') || {};
        if (configGlobal.aliqOrigemEfetiva !== undefined) {
            return configGlobal.aliqOrigemEfetiva;
        }
        
        // 3. ✅ NOVA LÓGICA: Calcular alíquota efetiva baseada em CST
        if (item.cstIcms && item.valorItem > 0) {
            console.log(`📌 Chamando calcularAliquotaEfetiva para item ${item.codItem}`);
            const aliqEfetiva = this.calcularAliquotaEfetiva(
                item.cstIcms,           // CST
                item.valorItem,         // VL_ITEM
                item.valorIcms || 0,    // VL_ICMS
                item.aliqIcms || 0      // ALIQ_ICMS (nominal)
            );
            
            console.log(`🎯 Item ${item.codItem}: CST ${item.cstIcms} → Alíquota efetiva ${aliqEfetiva}%`);
            return aliqEfetiva;
        }
        
        // 4. Fallback: usar alíquota nominal se disponível
        if (item.aliqOrigemNota !== undefined && item.aliqOrigemNota >= 0) {
            console.log(`⚠️ Item ${item.codItem}: Usando alíquota nominal ${item.aliqOrigemNota}% (fallback)`);
            return item.aliqOrigemNota;
        }
        
        // 5. Erro: dados insuficientes
        console.warn(`⚠️ Item ${item.codItem}: alíquota não pode ser calculada - CST: ${item.cstIcms}, VL_ITEM: ${item.valorItem}`);
        return 0;
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
        if (!uf || !window.EstadosUtil) return 18; // Alíquota padrão
        
        const estado = window.EstadosUtil.obterPorUF(uf);
        return estado?.aliquotaInterna || 18;
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
     * Calcula alíquota efetiva baseada no CST (Código de Situação Tributária)
     * @param {string} cst - Código de Situação Tributária
     * @param {number} vlItem - Valor do item (VL_ITEM)
     * @param {number} vlIcms - Valor do ICMS (VL_ICMS)
     * @param {number} aliqNominal - Alíquota nominal (ALIQ_ICMS)
     * @returns {number} - Alíquota efetiva calculada
     */
    calcularAliquotaEfetiva(cst, vlItem, vlIcms, aliqNominal) {
        // Validações de segurança
        if (!cst || vlItem <= 0) {
            console.warn(`⚠️ Dados insuficientes para cálculo de alíquota: CST=${cst}, VL_ITEM=${vlItem}`);
            return 0;
        }

        const cstStr = cst.toString();
        
        // CSOSN (100-900) - Simples Nacional (3 dígitos)
        if (cstStr.length === 3) {
            const origem = cstStr.charAt(0);  // Primeiro dígito = origem
            const csosn = cstStr.substring(1); // Últimos 2 dígitos = CSOSN
            
            console.log(`📊 CSOSN ${cst}: Origem=${origem}, CSOSN=${csosn} - Simples Nacional`);
            
            // Casos especiais com alíquota zero
            if (['300', '400', '500'].includes(csosn)) {
                console.log(`📊 CSOSN ${csosn}: Alíquota zero (Imune/Não tributado/ST anterior)`);
                return 0;
            }
            
            // Tributados pelo Simples Nacional (101-103, 201-203, 900)
            if (['101','102','103','201','202','203','900'].includes(csosn)) {
                // Para DIFAL, usar alíquota que empresa normal pagaria
                // Importado (origem 1,2,6,7) = 4%
                // Nacional (origem 0,3,4,5) = 7% (ou 12% conforme região)
                if (['1','2','6','7'].includes(origem)) {
                    console.log(`📊 CSOSN ${csosn}: Produto importado → Alíquota 4%`);
                    return 4;
                } else {
                    console.log(`📊 CSOSN ${csosn}: Produto nacional → Alíquota 7%`);
                    return 7; // TODO: Ajustar para 12% conforme região/produto
                }
            }
            
            // CSOSN não mapeado
            console.warn(`⚠️ CSOSN ${csosn} não mapeado, usando alíquota zero`);
            return 0;
        }
        
        // CST Normal (2 dígitos) - Regime normal
        const cstNormalizado = cstStr.slice(-2);
        
        console.log(`🔍 Calculando alíquota efetiva - CST: ${cst} (${cstNormalizado}), VL_ITEM: ${vlItem}, VL_ICMS: ${vlIcms}, ALIQ_NOMINAL: ${aliqNominal}`);

        switch (cstNormalizado) {
            case '00': // Tributada integralmente
            case '90': // Outras
                // Usar alíquota nominal
                console.log(`📊 CST ${cstNormalizado}: Usando alíquota nominal ${aliqNominal}%`);
                return aliqNominal;

            case '10': // Tributada com ST
            case '30': // Isenta com ST  
            case '60': // ICMS cobrado anteriormente por ST
                // Alíquota zero (ST substitui)
                console.log(`📊 CST ${cstNormalizado}: Alíquota zero (Substituição Tributária)`);
                return 0;

            case '20': // Com redução da BC
            case '70': // Com redução da BC e cobrança do ICMS por ST
                // Calcular alíquota efetiva: (VL_ICMS / VL_ITEM) * 100
                const aliqEfetiva = vlIcms > 0 ? (vlIcms / vlItem) * 100 : 0;
                console.log(`📊 CST ${cstNormalizado}: Alíquota efetiva calculada ${aliqEfetiva.toFixed(2)}% (VL_ICMS: ${vlIcms} / VL_ITEM: ${vlItem})`);
                return parseFloat(aliqEfetiva.toFixed(4));

            case '40': // Isenta
            case '41': // Não tributada
            case '50': // Com suspensão
            case '51': // Com diferimento
                // Alíquota zero
                console.log(`📊 CST ${cstNormalizado}: Alíquota zero (Isento/Suspenso/Diferido)`);
                return 0;

            default:
                // CST não mapeado - usar alíquota nominal como fallback
                console.warn(`⚠️ CST ${cstNormalizado} não mapeado, usando alíquota nominal ${aliqNominal}%`);
                return aliqNominal;
        }
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