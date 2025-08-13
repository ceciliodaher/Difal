/**
 * DIFAL Calculator - Versão Simples
 * Baseado na lógica do sistema original que funciona
 * Sem complexidade desnecessária
 */

class DifalCalculatorSimple {
    constructor(eventBus, stateManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        
        // Estados simples
        this.ufOrigem = null;
        this.ufDestino = null;
        this.itens = [];
        this.resultados = [];
        this.totalizadores = null;
        
        console.log('🧮 DIFAL Calculator Simple initialized');
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
            percentualComDifal: totalItens > 0 ? (itensComDifal / totalItens) * 100 : 0
        };

        console.log('✅ Cálculos concluídos:', this.totalizadores);
        return this.resultados;
    }

    /**
     * Calcula DIFAL para um item específico
     * LÓGICA SIMPLES baseada no sistema original + BENEFÍCIOS FISCAIS
     */
    calcularItem(item) {
        const itemId = item.codItem;
        console.log(`🧮 Calculando item ${itemId} simples...`);

        // Verificar se há configuração de benefício para este item
        const configuracaoItem = window.difalConfiguracoesItens?.[itemId] || null;
        
        if (configuracaoItem) {
            console.log(`🎯 Configuração encontrada para item ${itemId}:`, configuracaoItem);
        }

        // Base de cálculo = valor líquido do item
        let baseCalculo = item.baseCalculoDifal || item.valorLiquido || item.valorItem || 0;
        const baseCalculoOriginal = baseCalculo;
        
        // Obter alíquotas de forma SIMPLES
        let aliqOrigem = this.obterAliquotaOrigemSimples(item);
        let aliqDestino = this.obterAliquotaDestinoSimples();
        let aliqFcp = 0; // GO não tem FCP
        
        // APLICAR BENEFÍCIOS CONFIGURADOS (exceto redução de base que é aplicada depois)
        let configBeneficio = null;
        if (configuracaoItem?.beneficio) {
            configBeneficio = this.aplicarBeneficio(
                configuracaoItem, 
                baseCalculo, 
                aliqOrigem, 
                aliqDestino, 
                itemId
            );
            
            // Aplicar mudanças de alíquotas imediatamente
            aliqOrigem = configBeneficio.aliqOrigem;
            aliqDestino = configBeneficio.aliqDestino;
            // baseCalculo mantém valor original - redução será aplicada no momento correto
        }
        
        console.log(`🔍 Alíquotas calculadas para item ${itemId}:`, {
            aliqOrigem, 
            aliqDestino, 
            aliqFcp,
            baseCalculo,
            ufOrigem: this.ufOrigem,
            ufDestino: this.ufDestino
        });

        let calculo = {
            ...item,
            baseCalculoOriginal: baseCalculoOriginal,
            baseCalculo,
            aliqOrigem,
            aliqDestino, 
            aliqFcp,
            valorDifal: 0,
            valorFcp: 0,
            memoriaCalculo: [],
            metodoCalculo: 'base-dupla', // GO usa base dupla
            configuracaoItem // Incluir configuração aplicada
        };

        // Iniciar memória de cálculo
        calculo.memoriaCalculo.push(`=== MEMÓRIA DE CÁLCULO - ITEM ${item.codItem} ===`);
        calculo.memoriaCalculo.push(`Método: BASE DUPLA`);
        calculo.memoriaCalculo.push(`Base de cálculo original: R$ ${this.formatarMoeda(baseCalculoOriginal)}`);
        
        // Mostrar benefício aplicado se houver
        if (configuracaoItem?.beneficio) {
            calculo.memoriaCalculo.push(`🎯 BENEFÍCIO APLICADO: ${this.obterDescricaoBeneficio(configuracaoItem.beneficio)}`);
            if (baseCalculo !== baseCalculoOriginal) {
                calculo.memoriaCalculo.push(`Base de cálculo após benefício: R$ ${this.formatarMoeda(baseCalculo)}`);
            }
        }
        
        calculo.memoriaCalculo.push(`UFs: ${this.ufOrigem} → ${this.ufDestino}`);
        calculo.memoriaCalculo.push(`CFOP: ${item.cfop}`);
        calculo.memoriaCalculo.push(`Alíquotas: Origem ${aliqOrigem}% | Destino ${aliqDestino}% | FCP ${aliqFcp}%`);

        // Calcular DIFAL apenas se houver diferença de alíquotas
        if (aliqOrigem !== null && aliqDestino !== null && aliqDestino > aliqOrigem) {
            
            // Preparar redução de base se necessário
            let baseReduzida = null;
            if (configBeneficio?.temReducaoBase && configBeneficio.cargaEfetivaDesejada) {
                if (calculo.metodoCalculo === 'base-simples') {
                    // Para Base Simples: aplicar redução diretamente na base original
                    baseReduzida = this.calcularReducaoBase(
                        baseCalculo, 
                        configBeneficio.cargaEfetivaDesejada, 
                        aliqDestino, 
                        itemId, 
                        'base-simples'
                    );
                } else {
                    // Para Base Dupla: calcular Base de Cálculo 2 primeiro, depois aplicar redução
                    const icmsInterestadual = baseCalculo * (aliqOrigem / 100);
                    const baseCalculo1 = baseCalculo - icmsInterestadual;
                    const baseCalculo2 = baseCalculo1 / (1 - aliqDestino / 100);
                    
                    baseReduzida = this.calcularReducaoBase(
                        baseCalculo2, 
                        configBeneficio.cargaEfetivaDesejada, 
                        aliqDestino, 
                        itemId, 
                        'base-dupla'
                    );
                }
            }
            
            // Escolher método de cálculo (GO usa Base Dupla)
            const resultado = calculo.metodoCalculo === 'base-simples' 
                ? this.calcularDifalBaseSimples(baseCalculo, aliqOrigem, aliqDestino, baseReduzida)
                : this.calcularDifalBaseDupla(baseCalculo, aliqOrigem, aliqDestino, baseReduzida);
                
            calculo.valorDifal = resultado.difal;
            
            // Adicionar detalhes à memória conforme método
            if (calculo.metodoCalculo === 'base-simples') {
                calculo.memoriaCalculo.push(`1. ICMS Origem: R$ ${this.formatarMoeda(resultado.detalhes.icmsOrigem)}`);
                if (baseReduzida) {
                    calculo.memoriaCalculo.push(`2. Base Reduzida: R$ ${this.formatarMoeda(resultado.detalhes.baseEfetiva)}`);
                }
                calculo.memoriaCalculo.push(`3. ICMS Destino: R$ ${this.formatarMoeda(resultado.detalhes.icmsDestino)}`);
                calculo.memoriaCalculo.push(`4. DIFAL: R$ ${this.formatarMoeda(calculo.valorDifal)}`);
            } else {
                // Base Dupla
                calculo.memoriaCalculo.push(`1. ICMS Interestadual: R$ ${this.formatarMoeda(resultado.detalhes.icmsInterestadual)}`);
                calculo.memoriaCalculo.push(`2. Base de Cálculo 1: R$ ${this.formatarMoeda(resultado.detalhes.baseCalculo1)}`);
                calculo.memoriaCalculo.push(`3. Base de Cálculo 2: R$ ${this.formatarMoeda(resultado.detalhes.baseCalculo2)}`);
                if (baseReduzida) {
                    calculo.memoriaCalculo.push(`4. Base Reduzida: R$ ${this.formatarMoeda(resultado.detalhes.baseEfetiva)}`);
                }
                calculo.memoriaCalculo.push(`5. ICMS Interno: R$ ${this.formatarMoeda(resultado.detalhes.icmsInterno)}`);
                calculo.memoriaCalculo.push(`6. DIFAL: R$ ${this.formatarMoeda(calculo.valorDifal)}`);
            }
        } else {
            calculo.memoriaCalculo.push('DIFAL = 0 (sem diferença de alíquotas ou dados inválidos)');
        }

        // FCP (GO não cobra)
        calculo.valorFcp = 0;
        calculo.memoriaCalculo.push(`FCP: R$ ${this.formatarMoeda(calculo.valorFcp)}`);

        // Finalizar memória
        const totalRecolher = (calculo.valorDifal || 0) + (calculo.valorFcp || 0);
        calculo.memoriaCalculo.push(`----------------------------------------`);
        calculo.memoriaCalculo.push(`RESULTADO FINAL:`);
        calculo.memoriaCalculo.push(`DIFAL: R$ ${this.formatarMoeda(calculo.valorDifal)}`);
        calculo.memoriaCalculo.push(`FCP: R$ ${this.formatarMoeda(calculo.valorFcp)}`);
        calculo.memoriaCalculo.push(`TOTAL A RECOLHER: R$ ${this.formatarMoeda(totalRecolher)}`);
        calculo.memoriaCalculo.push(`========================================`);

        console.log(`✅ Item ${itemId} calculado:`, {
            valorDifal: calculo.valorDifal,
            valorFcp: calculo.valorFcp,
            baseCalculo: calculo.baseCalculo
        });

        return calculo;
    }

    /**
     * Obtém alíquota origem de forma SIMPLES
     */
    obterAliquotaOrigemSimples(item) {
        console.log(`🔍 Obtendo alíquota origem para item ${item.codItem}:`, {
            aliqIcms: item.aliqIcms,
            aliqOrigemNota: item.aliqOrigemNota,
            cstIcms: item.cstIcms,
            cfop: item.cfop
        });

        // 1. Verificar se é produto IMPORTADO pelo CST
        if (this.isProdutoImportado(item.cstIcms)) {
            console.log(`🎯 Produto importado (CST ${item.cstIcms}) - usando 4%`);
            return 4;
        }

        // 2. Usar alíquota do SPED se disponível
        if (item.aliqIcms && item.aliqIcms > 0) {
            console.log(`🎯 Usando alíquota do SPED: ${item.aliqIcms}%`);
            return item.aliqIcms;
        }

        // 3. Usar alíquota padrão SP→GO = 7%
        console.log(`🎯 Usando alíquota padrão SP→GO: 7%`);
        return 7;
    }

    /**
     * Obtém alíquota destino de forma SIMPLES
     */
    obterAliquotaDestinoSimples() {
        // GO = 19% (hardcoded, simples como no sistema original)
        console.log(`🎯 Alíquota destino GO: 19%`);
        return 19;
    }

    /**
     * Verifica se produto é importado pelo CST
     */
    isProdutoImportado(cst) {
        if (!cst) return false;
        
        // CSTs de produtos importados
        const cstsImportados = ['100', '200', '201', '202', '203'];
        const cstLimpo = cst.toString().replace(/^[0-9]/, ''); // Remove primeiro dígito (origem)
        
        return cstsImportados.includes(cst.toString()) || cstsImportados.includes(cstLimpo);
    }

    /**
     * Calcula DIFAL Base Simples (Base Única)
     * Conforme documento oficial: DIFAL = Valor × (Alíquota Destino - Alíquota Origem)
     */
    calcularDifalBaseSimples(baseCalculo, aliqOrigem, aliqDestino, baseReduzida = null) {
        const baseEfetiva = baseReduzida || baseCalculo;
        
        const icmsOrigem = baseCalculo * (aliqOrigem / 100);
        const icmsDestino = baseEfetiva * (aliqDestino / 100);
        const difal = icmsDestino - icmsOrigem;
        
        return {
            difal: difal > 0 ? difal : 0,
            detalhes: {
                baseCalculo,
                baseEfetiva,
                icmsOrigem,
                icmsDestino,
                diferecaAliquotas: aliqDestino - aliqOrigem
            }
        };
    }

    /**
     * Calcula DIFAL Base Dupla CORRIGIDO
     * Conforme documento oficial com suporte a redução
     */
    calcularDifalBaseDupla(baseCalculo, aliqOrigem, aliqDestino, baseReduzida = null) {
        // Passo 1: ICMS Interestadual
        const icmsInterestadual = baseCalculo * (aliqOrigem / 100);
        
        // Passo 2: Base de Cálculo 1 (exclusão do ICMS)
        const baseCalculo1 = baseCalculo - icmsInterestadual;
        
        // Passo 3: Base de Cálculo 2 (inclusão por dentro)
        const baseCalculo2 = baseCalculo1 / (1 - aliqDestino / 100);
        
        // Passo 4: Aplicar redução se houver (conforme documento: reduzir a Base de Cálculo 2)
        const baseEfetiva = baseReduzida || baseCalculo2;
        
        // Passo 5: ICMS Interno
        const icmsInterno = baseEfetiva * (aliqDestino / 100);
        
        // Passo 6: DIFAL
        const difal = icmsInterno - icmsInterestadual;
        
        return {
            difal: difal > 0 ? difal : 0,
            detalhes: {
                icmsInterestadual,
                baseCalculo1,
                baseCalculo2,
                baseEfetiva,
                icmsInterno,
                reducaoAplicada: baseReduzida ? true : false
            }
        };
    }

    /**
     * Formatar moeda simples
     */
    formatarMoeda(valor) {
        if (window.Utils && window.Utils.formatarMoeda) {
            return window.Utils.formatarMoeda(valor);
        }
        return new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
        }).format(valor || 0);
    }

    /**
     * Obter totalizadores
     */
    obterTotalizadores() {
        return this.totalizadores;
    }

    /**
     * Aplica benefício fiscal configurado
     * @param {Object} configuracao - Configuração do benefício
     * @param {number} baseCalculo - Base de cálculo original
     * @param {number} aliqOrigem - Alíquota origem
     * @param {number} aliqDestino - Alíquota destino
     * @param {string} itemId - ID do item para logs
     * @returns {Object} {baseCalculo, aliqOrigem, aliqDestino}
     */
    aplicarBeneficio(configuracao, baseCalculo, aliqOrigem, aliqDestino, itemId) {
        const beneficio = configuracao.beneficio;
        console.log(`💰 Aplicando benefício "${beneficio}" para item ${itemId}`);
        
        // IMPORTANTE: Para redução de base, retornamos apenas a configuração
        // O cálculo será feito no momento correto dentro do método DIFAL
        let configBeneficio = {
            baseCalculo: baseCalculo,
            aliqOrigem: aliqOrigem,
            aliqDestino: aliqDestino,
            temReducaoBase: false,
            baseReduzida: null,
            cargaEfetivaDesejada: null
        };
        
        switch (beneficio) {
            case 'reducao-base':
                if (configuracao.cargaEfetivaDesejada) {
                    // NÃO calculamos a redução aqui, apenas marcamos que deve ser aplicada
                    configBeneficio.temReducaoBase = true;
                    configBeneficio.cargaEfetivaDesejada = configuracao.cargaEfetivaDesejada;
                    console.log(`🎯 Redução de base marcada: ${configuracao.cargaEfetivaDesejada}% (será aplicada no momento correto)`);
                }
                break;
                
            case 'reducao-aliquota-origem':
                if (configuracao.aliqOrigemEfetiva !== undefined) {
                    configBeneficio.aliqOrigem = configuracao.aliqOrigemEfetiva;
                    console.log(`📊 Alíquota origem alterada de ${aliqOrigem}% para ${configuracao.aliqOrigemEfetiva}%`);
                }
                break;
                
            case 'reducao-aliquota-destino':
                if (configuracao.aliqDestinoEfetiva !== undefined) {
                    configBeneficio.aliqDestino = configuracao.aliqDestinoEfetiva;
                    console.log(`📊 Alíquota destino alterada de ${aliqDestino}% para ${configuracao.aliqDestinoEfetiva}%`);
                }
                break;
                
            case 'isencao':
                // Zerar alíquotas para resultar em DIFAL = 0
                configBeneficio.aliqOrigem = 0;
                configBeneficio.aliqDestino = 0;
                console.log(`🎯 Item ${itemId} isento - DIFAL será zero`);
                break;
                
            default:
                console.warn(`⚠️ Benefício "${beneficio}" não reconhecido`);
        }
        
        return configBeneficio;
    }
    
    /**
     * Calcula redução de base de cálculo baseada na carga efetiva desejada
     * CORRIGIDO conforme documento oficial DIFAL
     * @param {number} baseCalculo - Base de cálculo (pode ser original ou base dupla)
     * @param {number} cargaEfetivaDesejada - Carga efetiva desejada em %
     * @param {number} aliqDestino - Alíquota de destino (19% GO)
     * @param {string} itemId - ID do item para logs
     * @param {string} metodo - 'base-simples' ou 'base-dupla'
     * @returns {number} Base reduzida
     */
    calcularReducaoBase(baseCalculo, cargaEfetivaDesejada, aliqDestino, itemId, metodo = 'base-dupla') {
        if (aliqDestino <= 0) {
            console.warn(`⚠️ Não é possível calcular redução: alíquota destino é ${aliqDestino}%`);
            return baseCalculo;
        }
        
        // FÓRMULA CORRETA conforme documento:
        // Percentual da base após redução = carga efetiva desejada ÷ alíquota destino
        // Base reduzida = Base original × (carga efetiva ÷ alíquota destino)
        const percentualBase = cargaEfetivaDesejada / aliqDestino;
        const baseReduzida = baseCalculo * percentualBase;
        const reducaoPercentual = ((baseCalculo - baseReduzida) / baseCalculo) * 100;
        
        console.log(`🧮 Redução de base CORRIGIDA para item ${itemId} (${metodo}):`, {
            baseOriginal: baseCalculo,
            cargaEfetivaDesejada: `${cargaEfetivaDesejada}%`,
            aliqDestino: `${aliqDestino}%`,
            percentualBase: percentualBase,
            baseReduzida,
            reducaoPercentual: `${reducaoPercentual.toFixed(2)}%`
        });
        
        return baseReduzida;
    }
    
    /**
     * Obtém descrição legível do benefício
     * @param {string} beneficio - Tipo de benefício
     * @returns {string} Descrição do benefício
     */
    obterDescricaoBeneficio(beneficio) {
        const descricoes = {
            'reducao-base': 'Redução de Base de Cálculo',
            'reducao-aliquota-origem': 'Redução de Alíquota Origem',
            'reducao-aliquota-destino': 'Redução de Alíquota Destino',
            'isencao': 'Isenção Completa'
        };
        
        return descricoes[beneficio] || beneficio;
    }

    /**
     * Limpar dados
     */
    limpar() {
        this.ufOrigem = null;
        this.ufDestino = null;
        this.itens = [];
        this.resultados = [];
        this.totalizadores = null;
        console.log('🧹 Calculator simples limpo');
    }
}

// Expor globalmente
if (typeof window !== 'undefined') {
    window.DifalCalculatorSimple = DifalCalculatorSimple;
}

// Exportar se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DifalCalculatorSimple;
}