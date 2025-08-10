/**
 * DIFAL Calculator - Motor de cálculo do Diferencial de Alíquota do ICMS
 * Implementa Base Única e Base Dupla conforme EC 87/2015
 */

class DifalCalculator {
    constructor() {
        this.itensDifal = [];
        this.resultadosCalculos = [];
        this.configuracao = {
            ufOrigem: '',
            ufDestino: '',
            percentualDestinatario: 100, // Para 2025, 100% para destinatário
            metodologiaForcada: null, // 'base-unica', 'base-dupla' ou null (automática)
            beneficios: null, // Configurações de benefícios
            fcp: null // Configurações de FCP
        };
    }

    /**
     * Configura UFs de origem e destino para os cálculos
     * @param {string} ufOrigem 
     * @param {string} ufDestino 
     */
    configurarUFs(ufOrigem, ufDestino) {
        this.configuracao.ufOrigem = ufOrigem.toUpperCase();
        this.configuracao.ufDestino = ufDestino.toUpperCase();
        
        console.log(`Configuração UFs: ${ufOrigem} → ${ufDestino}`);
    }
    
    /**
     * Configura benefícios fiscais e FCP
     * @param {Object} configuracoes - Configurações do modal
     */
    configurarBeneficios(configuracoes) {
        this.configuracao.beneficios = configuracoes.beneficio;
        this.configuracao.fcp = configuracoes.fcp;
        
        console.log('🎁 Benefícios configurados:', configuracoes);
    }
    
    /**
     * Aplica configurações por item nos cálculos
     * @param {Object} item - Item para cálculo
     * @param {Object} calculo - Cálculo base (sem benefícios)
     * @returns {Object} Cálculo com benefícios aplicados
     */
    aplicarConfiguracoesPorItem(item, calculo) {
        const itemId = item.codItem;
        const config = window.difalConfiguracoesItens?.[itemId];
        
        if (!config) {
            return calculo; // Sem configurações específicas
        }
        
        let calculoComBeneficios = { ...calculo };
        const observacoes = [];
        
        // Aplicar benefício fiscal se configurado
        if (config.beneficio) {
            calculoComBeneficios = this.aplicarBeneficioFiscal(item, calculoComBeneficios, config);
            observacoes.push(`Benefício: ${this.formatarTipoBeneficio(config.beneficio)}`);
        }
        
        // Aplicar FCP manual se configurado
        if (config.fcpManual !== undefined && config.fcpManual !== null) {
            calculoComBeneficios = this.aplicarFcpManual(calculoComBeneficios, config.fcpManual);
            observacoes.push(`FCP manual: ${config.fcpManual}%`);
        }
        
        // Recalcular total a recolher
        calculoComBeneficios.totalRecolher = Math.max(0, calculoComBeneficios.difal) + calculoComBeneficios.fcp;
        
        // Adicionar observações sobre configurações aplicadas
        if (observacoes.length > 0) {
            const obsExistentes = calculoComBeneficios.observacoes ? [calculoComBeneficios.observacoes] : [];
            calculoComBeneficios.observacoes = [...obsExistentes, ...observacoes].join('; ');
        }
        
        return calculoComBeneficios;
    }
    
    /**
     * Aplica benefício fiscal específico
     * @param {Object} item - Item original
     * @param {Object} calculo - Cálculo base
     * @param {Object} config - Configuração do item
     * @returns {Object} Cálculo com benefício aplicado
     */
    aplicarBeneficioFiscal(item, calculo, config) {
        const calculoComBeneficio = { ...calculo };
        
        switch (config.beneficio) {
            case 'reducao-base':
                return this.aplicarReducaoBase(calculoComBeneficio, config.cargaEfetivaDesejada);
                
            case 'reducao-aliquota-origem':
                return this.aplicarReducaoAliquotaOrigem(calculoComBeneficio, config.aliqOrigemEfetiva);
                
            case 'reducao-aliquota-destino':
                return this.aplicarReducaoAliquotaDestino(calculoComBeneficio, config.aliqDestinoEfetiva);
                
            case 'isencao':
                return this.aplicarIsencao(calculoComBeneficio);
                
            default:
                console.warn(`Tipo de benefício desconhecido: ${config.beneficio}`);
                return calculoComBeneficio;
        }
    }
    
    /**
     * Aplica redução de base de cálculo
     */
    aplicarReducaoBase(calculo, cargaEfetivaDesejada) {
        console.log(`🎯 aplicarReducaoBase: cargaEfetivaDesejada=${cargaEfetivaDesejada}`);
        
        if (!cargaEfetivaDesejada || cargaEfetivaDesejada <= 0) {
            console.log(`🚫 Redução de base rejeitada: valor inválido (${cargaEfetivaDesejada})`);
            return calculo;
        }
        
        console.log(`✅ Aplicando redução de base com carga efetiva: ${cargaEfetivaDesejada}%`);
        
        const calculoReduzido = { ...calculo };
        
        if (calculo.metodologia === 'base-unica') {
            // Para Base Única: calcular redução necessária para atingir carga efetiva
            const aliqNominal = calculo.aliqDestino;
            const percentualReducao = this.calcularPercentualReducaoBase(aliqNominal, cargaEfetivaDesejada);
            
            if (percentualReducao > 0) {
                calculoReduzido.baseOriginal = calculo.base;
                calculoReduzido.base = calculo.base * (1 - percentualReducao / 100);
                calculoReduzido.percentualReducaoBase = percentualReducao;
                
                // Recalcular com base reduzida
                calculoReduzido.icmsOrigem = (calculoReduzido.base * calculo.aliqOrigem) / 100;
                calculoReduzido.icmsDestino = (calculoReduzido.base * calculo.aliqDestino) / 100;
                calculoReduzido.difal = Math.max(0, calculoReduzido.icmsDestino - calculoReduzido.icmsOrigem);
                
                // Recalcular FCP com base reduzida
                calculoReduzido.fcp = (calculoReduzido.base * calculo.aliqFcp) / 100;
                
                // Recalcular total a recolher
                calculoReduzido.totalRecolher = Math.max(0, calculoReduzido.difal) + calculoReduzido.fcp;
            }
        } else {
            // Para Base Dupla: aplicar redução diretamente
            const aliqNominal = calculo.diferencaAliq;
            const percentualReducao = this.calcularPercentualReducaoBase(aliqNominal, cargaEfetivaDesejada);
            
            if (percentualReducao > 0) {
                calculoReduzido.baseOriginal = calculo.base;
                calculoReduzido.base = calculo.base * (1 - percentualReducao / 100);
                calculoReduzido.percentualReducaoBase = percentualReducao;
                
                // Recalcular DIFAL com base reduzida
                calculoReduzido.difal = (calculoReduzido.base * calculo.diferencaAliq * calculo.percentualDestinatario) / 10000;
                
                // Recalcular FCP com base reduzida
                calculoReduzido.fcp = (calculoReduzido.base * calculo.aliqFcp * calculo.percentualDestinatario) / 10000;
                
                // Recalcular total a recolher
                calculoReduzido.totalRecolher = Math.max(0, calculoReduzido.difal) + calculoReduzido.fcp;
            }
        }
        
        return calculoReduzido;
    }
    
    /**
     * Aplica redução de alíquota na origem
     */
    aplicarReducaoAliquotaOrigem(calculo, aliqOrigemEfetiva) {
        console.log(`🎯 aplicarReducaoAliquotaOrigem: aliqOrigemEfetiva=${aliqOrigemEfetiva}`);
        
        if (!aliqOrigemEfetiva || aliqOrigemEfetiva < 0) {
            console.log(`🚫 Redução de alíquota origem rejeitada: valor inválido (${aliqOrigemEfetiva})`);
            return calculo;
        }
        
        console.log(`✅ Aplicando redução de alíquota origem: ${aliqOrigemEfetiva}%`);
        
        const calculoReduzido = { ...calculo };
        
        if (calculo.metodologia === 'base-unica') {
            calculoReduzido.aliqOrigemOriginal = calculo.aliqOrigem;
            calculoReduzido.aliqOrigem = aliqOrigemEfetiva;
            
            // Recalcular com alíquota origem reduzida
            calculoReduzido.icmsOrigem = (calculo.base * aliqOrigemEfetiva) / 100;
            calculoReduzido.difal = Math.max(0, calculo.icmsDestino - calculoReduzido.icmsOrigem);
        } else {
            // Para Base Dupla, alíquota origem não afeta diretamente o DIFAL
            console.warn('Redução de alíquota origem não aplicável para Base Dupla');
        }
        
        return calculoReduzido;
    }
    
    /**
     * Aplica redução de alíquota no destino
     */
    aplicarReducaoAliquotaDestino(calculo, aliqDestinoEfetiva) {
        console.log(`🎯 aplicarReducaoAliquotaDestino: aliqDestinoEfetiva=${aliqDestinoEfetiva}`);
        
        if (!aliqDestinoEfetiva || aliqDestinoEfetiva < 0) {
            console.log(`🚫 Redução de alíquota destino rejeitada: valor inválido (${aliqDestinoEfetiva})`);
            return calculo;
        }
        
        console.log(`✅ Aplicando redução de alíquota destino: ${aliqDestinoEfetiva}%`);
        
        const calculoReduzido = { ...calculo };
        
        if (calculo.metodologia === 'base-unica') {
            calculoReduzido.aliqDestinoOriginal = calculo.aliqDestino;
            calculoReduzido.aliqDestino = aliqDestinoEfetiva;
            
            // Recalcular com alíquota destino reduzida
            calculoReduzido.icmsDestino = (calculo.base * aliqDestinoEfetiva) / 100;
            calculoReduzido.difal = Math.max(0, calculoReduzido.icmsDestino - calculo.icmsOrigem);
        } else {
            calculoReduzido.aliqDestinoOriginal = calculo.aliqDestino;
            calculoReduzido.aliqDestino = aliqDestinoEfetiva;
            
            // Recalcular diferença e DIFAL
            calculoReduzido.diferencaAliq = aliqDestinoEfetiva - calculo.aliqInterestadual;
            calculoReduzido.difal = Math.max(0, (calculo.base * calculoReduzido.diferencaAliq * calculo.percentualDestinatario) / 10000);
        }
        
        return calculoReduzido;
    }
    
    /**
     * Aplica isenção (zera DIFAL)
     */
    aplicarIsencao(calculo) {
        console.log(`🎯 aplicarIsencao: aplicando isenção total do DIFAL`);
        console.log(`✅ DIFAL antes da isenção: R$ ${calculo.difal.toFixed(2)}`);
        
        const calculoIsento = { ...calculo };
        calculoIsento.difalOriginal = calculo.difal;
        calculoIsento.difal = 0;
        calculoIsento.isento = true;
        
        console.log(`✅ Isenção aplicada: DIFAL zerado (economia de R$ ${calculoIsento.difalOriginal.toFixed(2)})`);
        
        return calculoIsento;
    }
    
    /**
     * Aplica FCP manual
     */
    aplicarFcpManual(calculo, fcpManual) {
        const calculoComFcp = { ...calculo };
        
        calculoComFcp.aliqFcpOriginal = calculo.aliqFcp;
        calculoComFcp.aliqFcp = fcpManual;
        
        if (calculo.metodologia === 'base-dupla') {
            calculoComFcp.fcp = (calculo.base * fcpManual * calculo.percentualDestinatario) / 10000;
        } else {
            calculoComFcp.fcp = (calculo.base * fcpManual) / 100;
        }
        
        return calculoComFcp;
    }
    
    /**
     * Formata tipo de benefício para exibição
     */
    formatarTipoBeneficio(tipo) {
        const tipos = {
            'reducao-base': 'Redução de Base',
            'reducao-aliquota-origem': 'Redução Alíquota Origem',
            'reducao-aliquota-destino': 'Redução Alíquota Destino',
            'isencao': 'Isenção'
        };
        return tipos[tipo] || tipo;
    }
    
    /**
     * Formata descrição principal do item (prioriza cadastral)
     */
    formatarDescricaoPrincipal(item) {
        const cadastral = item.descricaoCadastral || '';
        const complementar = item.descrCompl || '';
        
        // Priorizar descrição cadastral (0200)
        if (cadastral && cadastral !== 'PRODUTO NÃO CADASTRADO' && cadastral !== 'SEM DADOS NA ORIGEM') {
            return cadastral;
        }
        
        // Fallback para complementar
        return complementar || cadastral || 'SEM DESCRIÇÃO';
    }
    
    /**
     * Formata descrição complementar do item (do C170)
     */
    formatarDescricaoComplementar(item) {
        const cadastral = item.descricaoCadastral || '';
        const complementar = item.descrCompl || '';
        
        // Se as descrições são diferentes, retorna complementar
        if (complementar && complementar !== cadastral) {
            return complementar;
        }
        
        return null; // Não há descrição complementar diferente
    }
    
    /**
     * Calcula o percentual de redução de base necessário para atingir carga efetiva desejada
     * @param {number} aliquotaNominal - Alíquota nominal em %
     * @param {number} cargaEfetivaDesejada - Carga efetiva desejada em %
     * @returns {number} Percentual de redução da base
     */
    calcularPercentualReducaoBase(aliquotaNominal, cargaEfetivaDesejada) {
        if (!aliquotaNominal || !cargaEfetivaDesejada || cargaEfetivaDesejada >= aliquotaNominal) {
            return 0;
        }
        
        // Fórmula: Redução% = (AliqNominal - CargaEfetiva) / AliqNominal * 100
        const percentualReducao = ((aliquotaNominal - cargaEfetivaDesejada) / aliquotaNominal) * 100;
        
        return Math.round(percentualReducao * 100) / 100; // Arredondar para 2 casas decimais
    }

    /**
     * Carrega itens DIFAL para cálculo
     * @param {Array} itensDifal - Array de itens do SpedParser
     */
    carregarItens(itensDifal) {
        this.itensDifal = [...itensDifal];
        console.log(`Carregados ${this.itensDifal.length} itens DIFAL`);
    }

    /**
     * Obtém informações de um estado
     * @param {string} uf 
     * @returns {Object|null}
     */
    obterInfoEstado(uf) {
        if (!window.EstadosUtil) {
            console.error('EstadosUtil não disponível');
            return null;
        }
        
        // Se a UF for XX ou inválida, usar uma UF genérica para cálculos interestaduais
        if (uf === 'XX' || uf === 'OUT' || !uf) {
            // Retornar um estado genérico para operações interestaduais
            return {
                uf: uf || 'XX',
                nome: 'Interestadual',
                aliqInterna: 17, // Alíquota padrão interestadual
                fcp: 0,
                metodologia: 'base-dupla',
                regiao: 'Interestadual'
            };
        }
        
        return window.EstadosUtil.obterPorUF(uf);
    }

    /**
     * Calcula alíquota interestadual
     * @param {string} ufOrigem 
     * @param {string} ufDestino 
     * @returns {number}
     */
    obterAliquotaInterestadual(ufOrigem, ufDestino) {
        if (!window.EstadosUtil) {
            return 12; // Padrão
        }
        return window.EstadosUtil.obterAliquotaInterestadual(ufOrigem, ufDestino);
    }

    /**
     * Calcula DIFAL por Base Única
     * Fórmula: DIFAL = (Base × AliqDestino/100) - (Base × AliqOrigem/100)
     * @param {Object} item 
     * @param {Object} estadoOrigem 
     * @param {Object} estadoDestino 
     * @returns {Object}
     */
    calcularBaseUnica(item, estadoOrigem, estadoDestino) {
        const base = item.baseCalculoDifal;
        const aliqOrigem = estadoOrigem.aliqInterna;
        const aliqDestino = estadoDestino.aliqInterna;
        
        // Cálculo DIFAL Base Única
        const icmsOrigem = (base * aliqOrigem) / 100;
        const icmsDestino = (base * aliqDestino) / 100;
        const difal = icmsDestino - icmsOrigem;
        
        // Cálculo FCP (Fundo de Combate à Pobreza)
        const aliqFcp = estadoDestino.fcp || 0;
        const fcp = (base * aliqFcp) / 100;
        
        return {
            metodologia: 'base-unica',
            base: base,
            aliqOrigem: aliqOrigem,
            aliqDestino: aliqDestino,
            aliqFcp: aliqFcp,
            icmsOrigem: icmsOrigem,
            icmsDestino: icmsDestino,
            difal: Math.max(0, difal), // DIFAL não pode ser negativo
            fcp: fcp,
            totalRecolher: Math.max(0, difal) + fcp,
            observacoes: difal < 0 ? 'DIFAL negativo - sem recolhimento' : null
        };
    }

    /**
     * Calcula DIFAL por Base Dupla
     * Fórmula: DIFAL = Base × ((AliqDestino - AliqInterestadual) × %Destinatario/100)
     * @param {Object} item 
     * @param {Object} estadoOrigem 
     * @param {Object} estadoDestino 
     * @returns {Object}
     */
    calcularBaseDupla(item, estadoOrigem, estadoDestino) {
        const base = item.baseCalculoDifal;
        const aliqDestino = estadoDestino.aliqInterna;
        const aliqInterestadual = this.obterAliquotaInterestadual(
            estadoOrigem.uf, 
            estadoDestino.uf
        );
        const percentualDest = this.configuracao.percentualDestinatario;
        
        // Cálculo DIFAL Base Dupla
        const diferencaAliq = aliqDestino - aliqInterestadual;
        const difal = (base * diferencaAliq * percentualDest) / 10000; // /100 para % e /100 para alíquota
        
        // Cálculo FCP
        const aliqFcp = estadoDestino.fcp || 0;
        const fcp = (base * aliqFcp * percentualDest) / 10000;
        
        // ICMS Interestadual (para referência)
        const icmsInterestadual = (base * aliqInterestadual) / 100;
        
        return {
            metodologia: 'base-dupla',
            base: base,
            aliqDestino: aliqDestino,
            aliqInterestadual: aliqInterestadual,
            aliqFcp: aliqFcp,
            percentualDestinatario: percentualDest,
            diferencaAliq: diferencaAliq,
            icmsInterestadual: icmsInterestadual,
            difal: Math.max(0, difal),
            fcp: fcp,
            totalRecolher: Math.max(0, difal) + fcp,
            observacoes: difal < 0 ? 'DIFAL negativo - sem recolhimento' : null
        };
    }

    /**
     * Calcula DIFAL para um item específico
     * @param {Object} item 
     * @returns {Object|null}
     */
    calcularItem(item) {
        const { ufOrigem, ufDestino } = this.configuracao;
        
        if (!ufOrigem || !ufDestino) {
            throw new Error('UFs de origem e destino devem ser configuradas');
        }

        // Se UF origem for XX ou OUT, é sempre interestadual
        if (ufOrigem !== 'XX' && ufOrigem !== 'OUT' && ufOrigem === ufDestino) {
            return {
                item: item,
                erro: 'Operação não é interestadual - não há DIFAL a calcular',
                difal: 0,
                fcp: 0,
                totalRecolher: 0
            };
        }

        const estadoOrigem = this.obterInfoEstado(ufOrigem);
        const estadoDestino = this.obterInfoEstado(ufDestino);

        if (!estadoOrigem || !estadoDestino) {
            return {
                item: item,
                erro: 'UF de origem ou destino inválida',
                difal: 0,
                fcp: 0,
                totalRecolher: 0
            };
        }

        // Determinar metodologia: forçada ou baseada no estado de destino
        let metodologia;
        if (this.configuracao.metodologiaForcada) {
            metodologia = this.configuracao.metodologiaForcada;
            console.log(`🔄 Metodologia forçada: ${metodologia}`);
        } else {
            metodologia = estadoDestino.metodologia || 'base-dupla';
            console.log(`🤖 Metodologia automática: ${metodologia} (baseada em ${estadoDestino.nome})`);
        }
        
        let calculo;
        if (metodologia === 'base-unica') {
            calculo = this.calcularBaseUnica(item, estadoOrigem, estadoDestino);
        } else {
            calculo = this.calcularBaseDupla(item, estadoOrigem, estadoDestino);
        }

        // Aplicar configurações por item (benefícios, FCP manual, etc.)
        const calculoComBeneficios = this.aplicarConfiguracoesPorItem(item, calculo);

        const resultado = {
            item: item,
            ufOrigem: ufOrigem,
            ufDestino: ufDestino,
            estadoOrigem: estadoOrigem,
            estadoDestino: estadoDestino,
            ...calculoComBeneficios,
            calculoBase: calculo, // Manter cálculo original para referência
            memoriaCalculo: this.gerarMemoriaCalculo(item, calculoComBeneficios, estadoOrigem, estadoDestino, calculo)
        };

        return resultado;
    }

    /**
     * Gera memória de cálculo detalhada
     * @param {Object} item 
     * @param {Object} calculo - Cálculo com benefícios aplicados
     * @param {Object} estadoOrigem 
     * @param {Object} estadoDestino 
     * @param {Object} calculoBase - Cálculo original sem benefícios (opcional)
     * @returns {Array}
     */
    gerarMemoriaCalculo(item, calculo, estadoOrigem, estadoDestino, calculoBase = null) {
        const memoria = [];
        
        memoria.push(`=== MEMÓRIA DE CÁLCULO DIFAL ===`);
        // Usar descrição cadastral como principal, complementar como secundária
        const descricaoPrincipal = this.formatarDescricaoPrincipal(item);
        const descricaoComplementar = this.formatarDescricaoComplementar(item);
        
        memoria.push(`Item: ${item.codItem} - ${descricaoPrincipal}`);
        if (descricaoComplementar && descricaoComplementar !== descricaoPrincipal) {
            memoria.push(`Descrição Complementar: ${descricaoComplementar}`);
        }
        memoria.push(`CFOP: ${item.cfop} - ${item.destinacao}`);
        memoria.push(`NCM: ${item.ncm}`);
        memoria.push(`UF Origem: ${estadoOrigem.uf} - ${estadoOrigem.nome}`);
        memoria.push(`UF Destino: ${estadoDestino.uf} - ${estadoDestino.nome}`);
        memoria.push(`Metodologia: ${calculo.metodologia.toUpperCase()}`);
        memoria.push('');
        
        // Base de cálculo
        memoria.push(`=== BASE DE CÁLCULO ===`);
        memoria.push(`Valor do Item: R$ ${item.vlItem.toFixed(2)}`);
        memoria.push(`(-) Desconto: R$ ${item.vlDesc.toFixed(2)}`);
        memoria.push(`(+) IPI: R$ ${item.vlIpi.toFixed(2)}`);
        memoria.push(`Base DIFAL: R$ ${calculo.base.toFixed(2)}`);
        memoria.push('');
        
        if (calculo.metodologia === 'base-unica') {
            memoria.push(`=== CÁLCULO BASE ÚNICA ===`);
            memoria.push(`Alíquota ${estadoOrigem.nome}: ${calculo.aliqOrigem}%`);
            memoria.push(`Alíquota ${estadoDestino.nome}: ${calculo.aliqDestino}%`);
            memoria.push(`ICMS Origem: R$ ${calculo.base.toFixed(2)} × ${calculo.aliqOrigem}% = R$ ${calculo.icmsOrigem.toFixed(2)}`);
            memoria.push(`ICMS Destino: R$ ${calculo.base.toFixed(2)} × ${calculo.aliqDestino}% = R$ ${calculo.icmsDestino.toFixed(2)}`);
            memoria.push(`DIFAL: R$ ${calculo.icmsDestino.toFixed(2)} - R$ ${calculo.icmsOrigem.toFixed(2)} = R$ ${calculo.difal.toFixed(2)}`);
        } else {
            memoria.push(`=== CÁLCULO BASE DUPLA ===`);
            memoria.push(`Alíquota ${estadoDestino.nome}: ${calculo.aliqDestino}%`);
            memoria.push(`Alíquota Interestadual: ${calculo.aliqInterestadual}%`);
            memoria.push(`% Destinatário (2025): ${calculo.percentualDestinatario}%`);
            memoria.push(`Diferença Alíquotas: ${calculo.aliqDestino}% - ${calculo.aliqInterestadual}% = ${calculo.diferencaAliq}%`);
            memoria.push(`DIFAL: R$ ${calculo.base.toFixed(2)} × ${calculo.diferencaAliq}% × ${calculo.percentualDestinatario}% = R$ ${calculo.difal.toFixed(2)}`);
        }
        
        memoria.push('');
        memoria.push(`=== FCP (FUNDO COMBATE POBREZA) ===`);
        memoria.push(`Alíquota FCP ${estadoDestino.nome}: ${calculo.aliqFcp}%`);
        if (calculo.metodologia === 'base-dupla') {
            memoria.push(`FCP: R$ ${calculo.base.toFixed(2)} × ${calculo.aliqFcp}% × ${calculo.percentualDestinatario}% = R$ ${calculo.fcp.toFixed(2)}`);
        } else {
            memoria.push(`FCP: R$ ${calculo.base.toFixed(2)} × ${calculo.aliqFcp}% = R$ ${calculo.fcp.toFixed(2)}`);
        }
        
        // Seção de benefícios aplicados (se houver)
        const itemId = item.codItem;
        const config = window.difalConfiguracoesItens?.[itemId];
        
        if (config && (config.beneficio || config.fcpManual !== undefined)) {
            memoria.push('');
            memoria.push(`=== BENEFÍCIOS FISCAIS ===`);
            
            // Verificar se benefício foi configurado mas rejeitado
            const beneficioRejeitado = this.verificarBeneficioRejeitado(config, calculo);
            
            if (beneficioRejeitado) {
                memoria.push('');
                memoria.push(`⚠️ BENEFÍCIO REJEITADO:`);
                memoria.push(`Tipo configurado: ${this.formatarTipoBeneficio(config.beneficio)}`);
                memoria.push(`Motivo da rejeição: ${beneficioRejeitado.motivo}`);
                memoria.push(`Valor informado: ${beneficioRejeitado.valor}`);
                memoria.push(`Status: ❌ NÃO APLICADO`);
            } else {
                memoria.push(`Status: ✅ APLICADO COM SUCESSO`);
            }
            
            if (config.beneficio) {
                memoria.push(`Tipo: ${this.formatarTipoBeneficio(config.beneficio)}`);
                
                switch (config.beneficio) {
                    case 'reducao-base':
                        if (calculo.percentualReducaoBase) {
                            memoria.push(`Carga Efetiva Desejada: ${config.cargaEfetivaDesejada}%`);
                            memoria.push(`Base Original: R$ ${calculo.baseOriginal?.toFixed(2) || calculo.base.toFixed(2)}`);
                            memoria.push(`Redução Aplicada: ${calculo.percentualReducaoBase.toFixed(2)}%`);
                            memoria.push(`Base Reduzida: R$ ${calculo.base.toFixed(2)}`);
                        }
                        break;
                    case 'reducao-aliquota-origem':
                        if (calculo.aliqOrigemOriginal) {
                            memoria.push(`Alíquota Origem Original: ${calculo.aliqOrigemOriginal}%`);
                            memoria.push(`Alíquota Origem Efetiva: ${calculo.aliqOrigem}%`);
                        }
                        break;
                    case 'reducao-aliquota-destino':
                        if (calculo.aliqDestinoOriginal) {
                            memoria.push(`Alíquota Destino Original: ${calculo.aliqDestinoOriginal}%`);
                            memoria.push(`Alíquota Destino Efetiva: ${calculo.aliqDestino}%`);
                        }
                        break;
                    case 'isencao':
                        if (calculo.difalOriginal) {
                            memoria.push(`DIFAL Original: R$ ${calculo.difalOriginal.toFixed(2)}`);
                            memoria.push(`DIFAL com Isenção: R$ ${calculo.difal.toFixed(2)}`);
                        }
                        break;
                }
            }
            
            if (config.fcpManual !== undefined) {
                memoria.push(`FCP Manual Configurado: ${config.fcpManual}%`);
                if (calculo.aliqFcpOriginal !== undefined) {
                    memoria.push(`FCP Original: ${calculo.aliqFcpOriginal}%`);
                }
            }
        }
        
        memoria.push('');
        memoria.push(`=== RESULTADO FINAL ===`);
        
        // Mostrar comparação se há cálculo base
        if (calculoBase && (calculoBase.difal !== calculo.difal || calculoBase.fcp !== calculo.fcp)) {
            memoria.push(`--- SEM BENEFÍCIOS ---`);
            memoria.push(`DIFAL Base: R$ ${calculoBase.difal.toFixed(2)}`);
            memoria.push(`FCP Base: R$ ${calculoBase.fcp.toFixed(2)}`);
            memoria.push(`Total Base: R$ ${calculoBase.totalRecolher.toFixed(2)}`);
            memoria.push('');
            memoria.push(`--- COM BENEFÍCIOS ---`);
        }
        
        memoria.push(`DIFAL: R$ ${calculo.difal.toFixed(2)}`);
        memoria.push(`FCP: R$ ${calculo.fcp.toFixed(2)}`);
        memoria.push(`TOTAL A RECOLHER: R$ ${calculo.totalRecolher.toFixed(2)}`);
        
        // Mostrar economia se houver
        if (calculoBase && calculoBase.totalRecolher > calculo.totalRecolher) {
            const economia = calculoBase.totalRecolher - calculo.totalRecolher;
            const percentualEconomia = ((economia / calculoBase.totalRecolher) * 100);
            memoria.push('');
            memoria.push(`💰 ECONOMIA: R$ ${economia.toFixed(2)} (${percentualEconomia.toFixed(1)}%)`);
        }
        
        if (calculo.observacoes) {
            memoria.push('');
            memoria.push(`Obs: ${calculo.observacoes}`);
        }
        
        return memoria;
    }

    /**
     * Calcula DIFAL para todos os itens carregados
     * @returns {Array}
     */
    calcularTodos() {
        console.log('Iniciando cálculo DIFAL para todos os itens...');
        this.resultadosCalculos = [];
        
        for (const item of this.itensDifal) {
            try {
                // Se o item tem UF própria, usar ela ao invés da configuração global
                if (item.ufOrigem) {
                    const ufOriginalOrigem = this.configuracao.ufOrigem;
                    this.configuracao.ufOrigem = item.ufOrigem;
                    const resultado = this.calcularItem(item);
                    this.configuracao.ufOrigem = ufOriginalOrigem;
                    this.resultadosCalculos.push(resultado);
                } else {
                    const resultado = this.calcularItem(item);
                    this.resultadosCalculos.push(resultado);
                }
            } catch (error) {
                console.error(`Erro ao calcular item ${item.codItem}:`, error);
                this.resultadosCalculos.push({
                    item: item,
                    erro: error.message,
                    difal: 0,
                    fcp: 0,
                    totalRecolher: 0
                });
            }
        }
        
        console.log(`Cálculo concluído: ${this.resultadosCalculos.length} itens processados`);
        return this.resultadosCalculos;
    }

    /**
     * Obtém totalizadores dos cálculos
     * @returns {Object}
     */
    obterTotalizadores() {
        if (this.resultadosCalculos.length === 0) {
            return {
                totalItens: 0,
                totalBase: 0,
                totalDifal: 0,
                totalFcp: 0,
                totalRecolher: 0,
                itensSemDifal: 0,
                itensComErro: 0
            };
        }
        
        return this.resultadosCalculos.reduce((acc, resultado) => {
            acc.totalItens++;
            
            if (resultado.erro) {
                acc.itensComErro++;
            } else {
                acc.totalBase += resultado.base || 0;
                acc.totalDifal += resultado.difal || 0;
                acc.totalFcp += resultado.fcp || 0;
                acc.totalRecolher += resultado.totalRecolher || 0;
                
                // Calcular economia total se houver cálculo base
                if (resultado.calculoBase && resultado.calculoBase.totalRecolher > resultado.totalRecolher) {
                    acc.economiaTotal += (resultado.calculoBase.totalRecolher - resultado.totalRecolher);
                }
                
                if ((resultado.difal || 0) === 0) {
                    acc.itensSemDifal++;
                }
                
                // Contar benefícios aplicados
                const itemId = resultado.item?.codItem;
                const config = window.difalConfiguracoesItens?.[itemId];
                if (config) {
                    if (config.beneficio) {
                        acc.itensComBeneficio++;
                    }
                    if (config.fcpManual !== undefined) {
                        acc.itensComFcpManual++;
                    }
                }
            }
            
            return acc;
        }, {
            totalItens: 0,
            totalBase: 0,
            totalDifal: 0,
            totalFcp: 0,
            totalRecolher: 0,
            itensSemDifal: 0,
            itensComErro: 0,
            itensComBeneficio: 0,
            itensComFcpManual: 0,
            economiaTotal: 0
        });
    }

    /**
     * Filtra resultados por critérios
     * @param {Object} filtros 
     * @returns {Array}
     */
    filtrarResultados(filtros = {}) {
        let resultados = [...this.resultadosCalculos];
        
        if (filtros.destinacao) {
            resultados = resultados.filter(r => 
                r.item && r.item.destinacao === filtros.destinacao
            );
        }
        
        if (filtros.cfop) {
            resultados = resultados.filter(r => 
                r.item && r.item.cfop === filtros.cfop
            );
        }
        
        if (filtros.apenasComDifal) {
            resultados = resultados.filter(r => 
                !r.erro && (r.difal || 0) > 0
            );
        }
        
        if (filtros.valorMinimoBase) {
            resultados = resultados.filter(r => 
                !r.erro && (r.base || 0) >= filtros.valorMinimoBase
            );
        }
        
        return resultados;
    }

    /**
     * Exporta resultados para Excel (dados preparados)
     * @returns {Object}
     */
    prepararDadosExcel() {
        const dadosExcel = this.resultadosCalculos.map(resultado => {
            const item = resultado.item || {};
            
            return {
                // Identificação
                'Código Item': item.codItem || '',
                'Descrição Cadastral (0200)': item.descricaoCadastral || '',
                'Descrição Complementar (C170)': item.descrCompl || '',
                'Descrição Principal': this.formatarDescricaoPrincipal(item),
                'NCM': item.ncm || '',
                'CFOP': item.cfop || '',
                'Destinação': item.destinacao || '',
                
                // Valores base
                'Quantidade': item.qtd || 0,
                'Valor Item': item.vlItem || 0,
                'Valor Desconto': item.vlDesc || 0,
                'Valor IPI': item.vlIpi || 0,
                'Base DIFAL': resultado.base || 0,
                
                // UFs e alíquotas
                'UF Origem': resultado.ufOrigem || '',
                'UF Destino': resultado.ufDestino || '',
                'Metodologia': resultado.metodologia || '',
                'Alíq. Origem %': resultado.aliqOrigem || 0,
                'Alíq. Destino %': resultado.aliqDestino || 0,
                'Alíq. Interestadual %': resultado.aliqInterestadual || 0,
                'Alíq. FCP %': resultado.aliqFcp || 0,
                
                // Resultados
                'DIFAL': resultado.difal || 0,
                'FCP': resultado.fcp || 0,
                'Total a Recolher': resultado.totalRecolher || 0,
                
                // Benefícios aplicados
                'Benefício Aplicado': this.formatarBeneficioExcel(item.codItem),
                'FCP Manual': this.formatarFcpManualExcel(item.codItem),
                'Base Original': resultado.baseOriginal || '',
                'DIFAL Original': resultado.calculoBase?.difal || '',
                'Economia': this.calcularEconomiaExcel(resultado),
                
                // Status
                'Status': resultado.erro ? 'ERRO' : (resultado.difal > 0 ? 'COM DIFAL' : 'SEM DIFAL'),
                'Observações': resultado.observacoes || resultado.erro || ''
            };
        });
        
        return {
            dados: dadosExcel,
            totalizadores: this.obterTotalizadores(),
            configuracao: this.configuracao
        };
    }
    
    /**
     * Formata benefício para exportação Excel
     */
    formatarBeneficioExcel(itemId) {
        const config = window.difalConfiguracoesItens?.[itemId];
        if (!config || !config.beneficio) {
            return '';
        }
        
        let detalhes = this.formatarTipoBeneficio(config.beneficio);
        
        switch (config.beneficio) {
            case 'reducao-base':
                if (config.cargaEfetivaDesejada) {
                    detalhes += ` (${config.cargaEfetivaDesejada}%)`;
                }
                break;
            case 'reducao-aliquota-origem':
                if (config.aliqOrigemEfetiva) {
                    detalhes += ` (${config.aliqOrigemEfetiva}%)`;
                }
                break;
            case 'reducao-aliquota-destino':
                if (config.aliqDestinoEfetiva) {
                    detalhes += ` (${config.aliqDestinoEfetiva}%)`;
                }
                break;
        }
        
        return detalhes;
    }
    
    /**
     * Formata FCP manual para exportação Excel
     */
    formatarFcpManualExcel(itemId) {
        const config = window.difalConfiguracoesItens?.[itemId];
        if (!config || config.fcpManual === undefined) {
            return '';
        }
        return `${config.fcpManual}%`;
    }
    
    /**
     * Calcula economia para exportação Excel
     */
    calcularEconomiaExcel(resultado) {
        if (!resultado.calculoBase || !resultado.calculoBase.totalRecolher) {
            return '';
        }
        
        const economia = resultado.calculoBase.totalRecolher - resultado.totalRecolher;
        if (economia > 0) {
            return economia.toFixed(2);
        }
        
        return '';
    }

    /**
     * Limpa resultados e reinicia calculadora
     */
    limpar() {
        this.itensDifal = [];
        this.resultadosCalculos = [];
        this.configuracao = {
            ufOrigem: '',
            ufDestino: '',
            percentualDestinatario: 100,
            metodologiaForcada: null,
            beneficios: null,
            fcp: null
        };
        console.log('Calculadora DIFAL limpa');
    }

    /**
     * Verifica se um benefício foi configurado mas rejeitado durante o cálculo
     */
    verificarBeneficioRejeitado(config, calculo) {
        if (!config.beneficio) {
            return null;
        }

        switch (config.beneficio) {
            case 'reducao-base':
                // Se foi configurado mas há problemas na configuração
                if (config.cargaEfetivaDesejada === undefined || config.cargaEfetivaDesejada === null || config.cargaEfetivaDesejada <= 0) {
                    return {
                        motivo: 'Carga efetiva não informada ou inválida (deve ser > 0)',
                        valor: config.cargaEfetivaDesejada || 'vazio'
                    };
                }
                // Se foi configurado corretamente mas não aplicado no cálculo
                if (config.cargaEfetivaDesejada > 0 && !calculo.percentualReducaoBase) {
                    return {
                        motivo: 'Erro no processamento - benefício válido não foi aplicado',
                        valor: config.cargaEfetivaDesejada
                    };
                }
                break;
                
            case 'reducao-aliquota-origem':
                // Se foi configurado mas há problemas na configuração
                if (config.aliqOrigemEfetiva === undefined || config.aliqOrigemEfetiva === null || config.aliqOrigemEfetiva < 0) {
                    return {
                        motivo: 'Alíquota origem não informada ou inválida (deve ser >= 0)',
                        valor: config.aliqOrigemEfetiva || 'vazio'
                    };
                }
                // Se foi configurado corretamente mas não aplicado
                if (config.aliqOrigemEfetiva >= 0 && !calculo.aliqOrigemOriginal) {
                    return {
                        motivo: 'Erro no processamento - benefício válido não foi aplicado',
                        valor: config.aliqOrigemEfetiva
                    };
                }
                break;
                
            case 'reducao-aliquota-destino':
                // Se foi configurado mas há problemas na configuração
                if (config.aliqDestinoEfetiva === undefined || config.aliqDestinoEfetiva === null || config.aliqDestinoEfetiva < 0) {
                    return {
                        motivo: 'Alíquota destino não informada ou inválida (deve ser >= 0)',
                        valor: config.aliqDestinoEfetiva || 'vazio'
                    };
                }
                // Se foi configurado corretamente mas não aplicado
                if (config.aliqDestinoEfetiva >= 0 && !calculo.aliqDestinoOriginal) {
                    return {
                        motivo: 'Erro no processamento - benefício válido não foi aplicado',
                        valor: config.aliqDestinoEfetiva
                    };
                }
                break;
                
            case 'isencao':
                // Isenção sempre é aplicada se configurada (não precisa verificar)
                break;
        }
        
        return null;
    }
}

// Exportar classe para uso global
if (typeof window !== 'undefined') {
    window.DifalCalculator = DifalCalculator;
}

// Para módulos Node.js se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DifalCalculator;
}