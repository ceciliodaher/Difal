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
     * LÓGICA SIMPLES baseada no sistema original
     */
    calcularItem(item) {
        const itemId = item.codItem;
        console.log(`🧮 Calculando item ${itemId} simples...`);

        // Base de cálculo = valor líquido do item
        const baseCalculo = item.baseCalculoDifal || item.valorLiquido || item.valorItem || 0;
        
        // Obter alíquotas de forma SIMPLES
        const aliqOrigem = this.obterAliquotaOrigemSimples(item);
        const aliqDestino = this.obterAliquotaDestinoSimples();
        const aliqFcp = 0; // GO não tem FCP
        
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
            baseCalculoOriginal: baseCalculo,
            baseCalculo,
            aliqOrigem,
            aliqDestino, 
            aliqFcp,
            valorDifal: 0,
            valorFcp: 0,
            memoriaCalculo: [],
            metodoCalculo: 'base-dupla' // GO usa base dupla
        };

        // Iniciar memória de cálculo
        calculo.memoriaCalculo.push(`=== MEMÓRIA DE CÁLCULO - ITEM ${item.codItem} ===`);
        calculo.memoriaCalculo.push(`Método: BASE DUPLA`);
        calculo.memoriaCalculo.push(`Base de cálculo: R$ ${this.formatarMoeda(baseCalculo)}`);
        calculo.memoriaCalculo.push(`UFs: ${this.ufOrigem} → ${this.ufDestino}`);
        calculo.memoriaCalculo.push(`CFOP: ${item.cfop}`);
        calculo.memoriaCalculo.push(`Alíquotas: Origem ${aliqOrigem}% | Destino ${aliqDestino}% | FCP ${aliqFcp}%`);

        // Calcular DIFAL apenas se houver diferença de alíquotas
        if (aliqOrigem !== null && aliqDestino !== null && aliqDestino > aliqOrigem) {
            
            // Método Base Dupla simples (como no sistema original)
            const resultado = this.calcularDifalBaseDupla(baseCalculo, aliqOrigem, aliqDestino);
            calculo.valorDifal = resultado.difal;
            
            // Adicionar detalhes à memória
            calculo.memoriaCalculo.push(`1. ICMS Interestadual: R$ ${this.formatarMoeda(resultado.detalhes.icmsInterestadual)}`);
            calculo.memoriaCalculo.push(`2. Base de Cálculo 1: R$ ${this.formatarMoeda(resultado.detalhes.baseCalculo1)}`);
            calculo.memoriaCalculo.push(`3. Nova Base: R$ ${this.formatarMoeda(resultado.detalhes.novaBase)}`);
            calculo.memoriaCalculo.push(`4. ICMS Interno: R$ ${this.formatarMoeda(resultado.detalhes.icmsInterno)}`);
            calculo.memoriaCalculo.push(`5. DIFAL: R$ ${this.formatarMoeda(calculo.valorDifal)}`);
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
     * Calcula DIFAL Base Dupla SIMPLES
     */
    calcularDifalBaseDupla(baseCalculo, aliqOrigem, aliqDestino) {
        // Implementação simples baseada no sistema original
        const icmsInterestadual = baseCalculo * (aliqOrigem / 100);
        const baseCalculo1 = baseCalculo - icmsInterestadual;
        const novaBase = baseCalculo1 / (1 - aliqDestino / 100);
        const icmsInterno = novaBase * (aliqDestino / 100);
        const difal = icmsInterno - icmsInterestadual;
        
        return {
            difal: difal > 0 ? difal : 0,
            detalhes: {
                icmsInterestadual,
                baseCalculo1,
                novaBase,
                icmsInterno
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