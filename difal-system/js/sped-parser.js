/**
 * SPED Parser Completo - Preserva toda funcionalidade dos códigos originais
 * Baseado na análise completa de /sped/script.js e /sped/C170/script.js
 * + Extração específica de dados DIFAL
 */

class SpedParser {
    constructor() {
        this.content = '';
        this.fileName = '';
        this.encoding = '';
        this.headerInfo = {};
        this.registros = {};
        this.catalogoProdutos = {};
        this.dadosResultadoC170 = [];
        this.contadorEncontrados = 0;
        this.contadorNaoEncontrados = 0;
        this.todasColunas = [];
        this.itensDifal = [];
        this.notasFiscais = new Map();
        this.participantes = new Map(); // Chave: codPart -> dados 0150 (fornecedores)
    }

    /**
     * Detecta encoding e lê o conteúdo do arquivo
     * @param {ArrayBuffer} arrayBuffer 
     * @returns {Object} {encoding, content}
     */
    async detectAndRead(arrayBuffer) {
        const decoders = [
            { encoding: 'UTF-8', decoder: new TextDecoder('utf-8', { fatal: true }) },
            { encoding: 'ISO-8859-1', decoder: new TextDecoder('iso-8859-1') }
        ];

        for (const { encoding, decoder } of decoders) {
            try {
                const content = decoder.decode(arrayBuffer);
                console.log(`Arquivo lido com sucesso usando ${encoding}`);
                return { encoding, content };
            } catch (e) {
                console.warn(`Falha ao decodificar como ${encoding}:`, e.message);
            }
        }

        // Fallback UTF-8 não-fatal
        try {
            const content = new TextDecoder('utf-8').decode(arrayBuffer);
            console.warn('Decodificado como UTF-8 com possíveis erros (fallback).');
            return { encoding: 'UTF-8 (fallback)', content };
        } catch (e) {
            console.error('Falha final ao decodificar o ArrayBuffer:', e);
            throw new Error('Não foi possível decodificar o arquivo com os encodings suportados.');
        }
    }

    /**
     * Valida uma linha SPED
     * @param {string} linha 
     * @returns {boolean}
     */
    isLinhaValida(linha) {
        linha = linha.trim();
        if (!linha) return false;
        if (!linha.startsWith('|') || !linha.endsWith('|')) return false;

        const campos = linha.split('|');
        if (campos.length < 3) return false;

        const regCode = campos[1];
        if (!regCode) return false;

        // Regex para códigos SPED (0000, C100, M210, 1990, etc.)
        const padraoRegistro = /^[A-Z0-9]?\d{3,4}$/;
        return padraoRegistro.test(regCode);
    }

    /**
     * Lê arquivo SPED completo e organiza registros por tipo
     * @param {string} fileContent 
     * @returns {Object} registros organizados por tipo
     */
    lerArquivoSpedCompleto(fileContent) {
        const registros = {};
        const lines = fileContent.split('\n');

        for (const rawLine of lines) {
            const linha = rawLine.trim();
            if (this.isLinhaValida(linha)) {
                const campos = linha.split('|');
                const tipoRegistro = campos[1];
                const dadosRegistro = campos; // Mantém estrutura completa

                if (!registros[tipoRegistro]) {
                    registros[tipoRegistro] = [];
                }
                registros[tipoRegistro].push(dadosRegistro);
            }
        }

        console.log(`SPED Completo Lido. Tipos de registros: ${Object.keys(registros).length}`);
        return registros;
    }

    /**
     * Extrai informações do cabeçalho SPED (registro 0000)
     * @param {Object} registros 
     * @returns {Object} {nomeEmpresa, periodo, cnpj, uf, ie}
     */
    extrairInformacoesHeader(registros) {
        let nomeEmpresa = "Empresa";
        let periodo = "";
        let cnpj = "";
        let uf = "";
        let ie = "";

        if (registros['0000'] && registros['0000'].length > 0) {
            const reg0000 = registros['0000'][0];
            
            // Layout completo 0000: REG(0), COD_VER(1), COD_FIN(2), DT_INI(3), DT_FIN(4), NOME(5), CNPJ(6), CPF(7), UF(8), IE(9)
            if (reg0000.length > 6) nomeEmpresa = reg0000[6] || "Empresa";
            if (reg0000.length > 7) cnpj = reg0000[7] || "";
            if (reg0000.length > 9) uf = reg0000[9] || "";
            if (reg0000.length > 10) ie = reg0000[10] || "";

            // Data inicial para período
            if (reg0000.length > 4) {
                const dataInicial = reg0000[4];
                if (dataInicial && dataInicial.length === 8) {
                    periodo = `${dataInicial.substring(0, 2)}/${dataInicial.substring(2, 4)}/${dataInicial.substring(4, 8)}`;
                }
            }
        }
        
        return { nomeEmpresa, periodo, cnpj, uf, ie };
    }

    /**
     * Layout completo de registros SPED - TODOS os tipos suportados
     * @param {string} tipoRegistro 
     * @returns {Array|null}
     */
    obterLayoutRegistro(tipoRegistro) {
        const layouts = {
            // Block 0 - Abertura/Identificação
            '0000': ['REG', 'COD_VER', 'COD_FIN', 'DT_INI', 'DT_FIN', 'NOME', 'CNPJ', 'CPF', 'UF', 'IE', 'COD_MUN', 'IM', 'SUFRAMA', 'IND_PERFIL', 'IND_ATIV'],
            '0150': ['REG', 'COD_PART', 'NOME', 'COD_PAIS', 'CNPJ', 'CPF', 'IE', 'COD_MUN', 'SUFRAMA', 'END', 'NUM', 'COMPL', 'BAIRRO'], // Participantes (fornecedores)
            '0200': ['REG', 'COD_ITEM', 'DESCR_ITEM', 'COD_BARRA', 'COD_ANT_ITEM', 'UNID_INV', 'TIPO_ITEM', 'COD_NCM', 'EX_IPI', 'COD_GEN', 'COD_LST', 'ALIQ_ICMS'], // CRÍTICO para análise C170+NCM
            
            // Block C - Documentos Fiscais (Entradas e Saídas)
            'C100': ['REG', 'IND_OPER', 'IND_EMIT', 'COD_PART', 'COD_MOD', 'COD_SIT', 'SER', 'NUM_DOC', 'CHV_NFE', 'DT_DOC', 'DT_E_S', 'VL_DOC', 'IND_PGTO', 'VL_DESC', 'VL_ABAT_NT', 'VL_MERC', 'IND_FRT', 'VL_FRT', 'VL_SEG', 'VL_OUT_DA', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_IPI', 'VL_PIS', 'VL_COFINS', 'VL_PIS_ST', 'VL_COFINS_ST'],
            'C170': ['REG', 'NUM_ITEM', 'COD_ITEM', 'DESCR_COMPL', 'QTD', 'UNID', 'VL_ITEM', 'VL_DESC', 'IND_MOV', 'CST_ICMS', 'CFOP', 'COD_NAT', 'VL_BC_ICMS', 'ALIQ_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'ALIQ_ST', 'VL_ICMS_ST', 'IND_APUR', 'CST_IPI', 'COD_ENQ', 'VL_BC_IPI', 'ALIQ_IPI', 'VL_IPI', 'CST_PIS', 'VL_BC_PIS', 'ALIQ_PIS', 'QUANT_BC_PIS', 'ALIQ_PIS_QUANT', 'VL_PIS', 'CST_COFINS', 'VL_BC_COFINS', 'ALIQ_COFINS', 'QUANT_BC_COFINS', 'ALIQ_COFINS_QUANT', 'VL_COFINS', 'COD_CTA'],
            'C190': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC', 'VL_IPI', 'COD_OBS'],
            'C197': ['REG', 'COD_AJ', 'DESCR_COMPL_AJ', 'COD_ITEM', 'VL_BC_ICMS', 'ALIQ_ICMS', 'VL_ICMS', 'VL_OUTROS'],
            'C500': ['REG', 'IND_OPER', 'IND_EMIT', 'COD_PART', 'COD_MOD', 'COD_SIT', 'SER', 'SUB', 'COD_CONS', 'NUM_DOC', 'DT_DOC', 'DT_E_S', 'VL_DOC', 'VL_DESC', 'VL_FORN', 'VL_SERV_NT', 'VL_TERC', 'VL_DA', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'COD_INF', 'VL_PIS', 'VL_COFINS'],
            'C590': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC', 'COD_OBS'],
            
            // Block D - Documentos de Serviços
            'D100': ['REG', 'IND_OPER', 'IND_EMIT', 'COD_PART', 'COD_MOD', 'COD_SIT', 'SER', 'SUB', 'NUM_DOC', 'CHV_CTE', 'DT_DOC', 'DT_A_P', 'TP_CT-e', 'CHV_CTE_REF', 'VL_DOC', 'VL_DESC', 'IND_FRT', 'VL_SERV', 'VL_BC_ICMS', 'VL_ICMS', 'VL_NT', 'COD_INF', 'COD_CTA', 'COD_MUN_ORIG', 'COD_MUN_DEST'],
            'D190': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_RED_BC', 'COD_OBS'],
            'D197': ['REG', 'COD_AJ', 'DESCR_COMPL_AJ', 'COD_ITEM', 'VL_BC_ICMS', 'ALIQ_ICMS', 'VL_ICMS', 'VL_OUTROS'],
            'D500': ['REG', 'IND_OPER', 'IND_EMIT', 'COD_PART', 'COD_MOD', 'COD_SIT', 'SER', 'SUB', 'NUM_DOC', 'DT_DOC', 'DT_A_P', 'VL_DOC', 'VL_DESC', 'VL_SERV', 'VL_SERV_NT', 'VL_TERC', 'VL_DA', 'VL_BC_ICMS', 'VL_ICMS', 'COD_INF', 'VL_PIS', 'VL_COFINS', 'COD_CTA', 'TP_ASSINANTE'],
            'D590': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC', 'COD_OBS'],
            
            // Block E - Apuração do ICMS e do IPI
            'E100': ['REG', 'DT_INI', 'DT_FIN'],
            'E110': ['REG', 'VL_TOT_DEBITOS', 'VL_AJ_DEBITOS', 'VL_TOT_AJ_DEBITOS', 'VL_ESTORNOS_CRED', 'VL_TOT_CREDITOS', 'VL_AJ_CREDITOS', 'VL_TOT_AJ_CREDITOS', 'VL_ESTORNOS_DEB', 'VL_SLD_CREDOR_ANT', 'VL_SLD_APURADO', 'VL_TOT_DED', 'VL_ICMS_RECOLHER', 'VL_SLD_CREDOR_TRANSPORTAR', 'DEB_ESP'],
            'E111': ['REG', 'COD_AJ_APUR', 'DESCR_COMPL_AJ', 'VL_AJ_APUR'],
            'E200': ['REG', 'UF', 'DT_INI', 'DT_FIN'],
            'E210': ['REG', 'IND_MOV_ST', 'VL_SLD_CRED_ANT_ST', 'VL_DEVOL_ST', 'VL_RESSARC_ST', 'VL_OUT_CRED_ST', 'VL_AJ_CREDITOS_ST', 'VL_RETENCAO_ST', 'VL_OUT_DEB_ST', 'VL_AJ_DEBITOS_ST', 'VL_SLD_DEV_ANT_ST', 'VL_DEDUCOES_ST', 'VL_ICMS_RECOL_ST', 'VL_SLD_CRED_ST_TRANSPORTAR', 'DEB_ESP_ST'],
            'E500': ['REG', 'IND_APUR', 'DT_INI', 'DT_FIN'],
            'E510': ['REG', 'CFOP', 'CST_IPI', 'VL_CONT_IPI', 'VL_BC_IPI', 'VL_IPI'],
            'E520': ['REG', 'VL_SD_ANT_IPI', 'VL_DEB_IPI', 'VL_CRED_IPI', 'VL_OD_IPI', 'VL_OC_IPI', 'VL_SC_IPI', 'VL_SD_IPI']
        };
        
        return layouts[tipoRegistro] || null;
    }

    /**
     * Cria catálogo de produtos a partir dos registros 0200
     * CRÍTICO para análise C170+NCM
     * @param {Object} registros 
     */
    async criarCatalogoProdutos(registros) {
        console.log('=== INICIANDO CRIAÇÃO DO CATÁLOGO DE PRODUTOS ===');
        this.catalogoProdutos = {};
        const registros0200 = registros['0200'] || [];
        console.log(`Processando ${registros0200.length} registros 0200`);

        for (let i = 0; i < registros0200.length; i++) {
            const linha0200 = registros0200[i];
            try {
                if (linha0200.length >= 9) {
                    // Layout 0200: ['', 'REG', 'COD_ITEM', 'DESCR_ITEM', 'COD_BARRA', 'COD_ANT_ITEM', 'UNID_INV', 'TIPO_ITEM', 'COD_NCM', 'EX_IPI']
                    const codigoItem = linha0200[2] || "";     // COD_ITEM (índice 2)
                    const descricao = linha0200[3] || "";      // DESCR_ITEM (índice 3)
                    const tipoItem = linha0200[7] || "";       // TIPO_ITEM (índice 7)  
                    const ncm = linha0200[8] || "";            // COD_NCM (índice 8)

                    if (codigoItem && codigoItem.trim()) {
                        this.catalogoProdutos[codigoItem] = {
                            ncm: ncm.trim() || "SEM DADOS NA ORIGEM",
                            descricao: descricao.trim() || "SEM DADOS NA ORIGEM",
                            tipo: tipoItem.trim() || "SEM DADOS NA ORIGEM"
                        };
                    }
                }
            } catch (error) {
                console.warn(`Erro linha ${i} do 0200:`, error);
                continue;
            }

            if (i % 100 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }

        console.log(`Catálogo criado: ${Object.keys(this.catalogoProdutos).length} produtos`);
    }

    /**
     * Identifica benefícios fiscais baseado no CST ICMS
     * @param {string} cstIcms - Código CST ICMS 
     * @param {number} aliqIcms - Alíquota ICMS aplicada
     * @param {number} vlBcIcms - Base de cálculo ICMS
     * @param {number} vlItem - Valor do item
     * @returns {Object} Informações sobre benefícios fiscais
     */
    identificarBeneficiosFiscais(cstIcms, aliqIcms, vlBcIcms, vlItem) {
        const cst = (cstIcms || "").toString().padStart(2, '0');
        
        const beneficio = {
            temBeneficio: false,
            tipoBeneficio: '',
            percentualReducao: 0,
            aliquotaEfetiva: aliqIcms || 0,
            descricao: ''
        };
        
        switch (cst) {
            case '00':
                beneficio.descricao = 'Tributada integralmente';
                break;
            case '10':
                beneficio.descricao = 'Tributada e com cobrança do ICMS por substituição tributária';
                break;
            case '20':
                beneficio.temBeneficio = true;
                beneficio.tipoBeneficio = 'REDUCAO_BASE';
                beneficio.descricao = 'Com redução de base de cálculo';
                // Calcular percentual de redução: (VL_ITEM - VL_BC_ICMS) / VL_ITEM * 100
                if (vlItem > 0 && vlBcIcms >= 0) {
                    beneficio.percentualReducao = Math.round(((vlItem - vlBcIcms) / vlItem) * 100 * 100) / 100;
                }
                break;
            case '30':
                beneficio.temBeneficio = true;
                beneficio.tipoBeneficio = 'ISENCAO';
                beneficio.descricao = 'Isenta ou não tributada e com cobrança do ICMS por ST';
                break;
            case '40':
                beneficio.temBeneficio = true;
                beneficio.tipoBeneficio = 'ISENCAO';
                beneficio.descricao = 'Isenta';
                break;
            case '41':
                beneficio.temBeneficio = true;
                beneficio.tipoBeneficio = 'NAO_TRIBUTADA';
                beneficio.descricao = 'Não tributada';
                break;
            case '50':
                beneficio.temBeneficio = true;
                beneficio.tipoBeneficio = 'SUSPENSAO';
                beneficio.descricao = 'Suspensão';
                break;
            case '51':
                beneficio.temBeneficio = true;
                beneficio.tipoBeneficio = 'DIFERIMENTO';
                beneficio.descricao = 'Diferimento';
                break;
            case '60':
                beneficio.descricao = 'ICMS cobrado anteriormente por substituição tributária';
                break;
            case '70':
                beneficio.temBeneficio = true;
                beneficio.tipoBeneficio = 'REDUCAO_BASE';
                beneficio.descricao = 'Com redução de base de cálculo e cobrança do ICMS por ST';
                if (vlItem > 0 && vlBcIcms >= 0) {
                    beneficio.percentualReducao = Math.round(((vlItem - vlBcIcms) / vlItem) * 100 * 100) / 100;
                }
                break;
            case '90':
                beneficio.descricao = 'Outras';
                // Para CST 90, verificar se há benefício pela alíquota aplicada
                if (aliqIcms < 18) { // Assumindo 18% como alíquota padrão
                    beneficio.temBeneficio = true;
                    beneficio.tipoBeneficio = 'REDUCAO_ALIQUOTA';
                }
                break;
            default:
                beneficio.descricao = `CST ${cst} não mapeado`;
        }
        
        return beneficio;
    }

    /**
     * Indexa notas fiscais (C100) para vincular com itens C170
     * @param {Object} registros 
     */
    indexarNotasFiscais(registros) {
        console.log('=== INDEXANDO NOTAS FISCAIS C100 ===');
        this.notasFiscais.clear();
        
        const registrosC100 = registros['C100'] || [];
        console.log(`Processando ${registrosC100.length} registros C100`);
        
        for (const linha of registrosC100) {
            if (linha.length >= 12) {
                // Layout C100: chave única é SER(6) + NUM_DOC(7)
                const serie = linha[7] || "";
                const numero = linha[8] || "";
                const chaveNota = `${serie}-${numero}`;
                
                this.notasFiscais.set(chaveNota, {
                    indOper: linha[2],      // IND_OPER (0=entrada, 1=saída)
                    indEmit: linha[3],      // IND_EMIT (0=emissão própria, 1=terceiros)
                    codPart: linha[4],      // COD_PART (código participante)
                    codMod: linha[5],       // COD_MOD (código modelo documento)
                    codSit: linha[6],       // COD_SIT (situação documento)
                    serie: serie,           // SER
                    numDoc: numero,         // NUM_DOC
                    chvNfe: linha[9],       // CHV_NFE
                    dtDoc: linha[10],       // DT_DOC
                    dtES: linha[11],        // DT_E_S
                    vlDoc: parseFloat(linha[12]) || 0,      // VL_DOC
                    vlDesc: parseFloat(linha[14]) || 0,     // VL_DESC (desconto da nota)
                    vlAbatNt: parseFloat(linha[15]) || 0,   // VL_ABAT_NT
                    vlMerc: parseFloat(linha[16]) || 0,     // VL_MERC
                    indFrt: linha[17] || "0",               // IND_FRT (0=por conta emissor, 1=por conta destinatário)
                    vlFrt: parseFloat(linha[18]) || 0,      // VL_FRT (frete)
                    vlSeg: parseFloat(linha[19]) || 0,      // VL_SEG (seguro)
                    vlOutDa: parseFloat(linha[20]) || 0,    // VL_OUT_DA (outras despesas acessórias)
                    vlBcIcms: parseFloat(linha[21]) || 0,   // VL_BC_ICMS
                    vlIcms: parseFloat(linha[22]) || 0,     // VL_ICMS
                    vlIpi: parseFloat(linha[25]) || 0       // VL_IPI
                });
            }
        }
        
        console.log(`Notas fiscais indexadas: ${this.notasFiscais.size}`);
    }

    /**
     * Calcula rateio proporcional dos valores da nota fiscal para um item
     * @param {Object} notaFiscal - Dados da nota fiscal C100
     * @param {number} valorItem - Valor do item C170
     * @param {number} valorTotalMercadorias - Valor total de mercadorias da nota
     * @returns {Object} Valores rateados para o item
     */
    calcularRateioItem(notaFiscal, valorItem, valorTotalMercadorias) {
        if (!valorTotalMercadorias || valorTotalMercadorias === 0) {
            return {
                freteRateado: 0,
                seguroRateado: 0,
                outrasRateado: 0,
                percentualItem: 0
            };
        }

        const percentualItem = valorItem / valorTotalMercadorias;
        
        return {
            freteRateado: Math.round((notaFiscal.vlFrt * percentualItem) * 100) / 100,
            seguroRateado: Math.round((notaFiscal.vlSeg * percentualItem) * 100) / 100,
            outrasRateado: Math.round((notaFiscal.vlOutDa * percentualItem) * 100) / 100,
            percentualItem: Math.round(percentualItem * 10000) / 100 // Percentual com 2 decimais
        };
    }

    /**
     * Extrai dados DIFAL específicos dos registros C170
     * Foca nos CFOPs DIFAL e enriquece com dados NCM e NF
     * @param {Object} registros 
     */
    async extrairDadosDifal(registros) {
        console.log('=== EXTRAINDO DADOS DIFAL ===');
        this.itensDifal = [];
        
        const registrosC170 = registros['C170'] || [];
        const registrosC100 = registros['C100'] || [];
        console.log(`Analisando ${registrosC170.length} registros C170 para DIFAL`);
        console.log(`Notas fiscais disponíveis: ${registrosC100.length} registros C100`);
        
        // Processar todos os registros em ordem para manter hierarquia C100 -> C170
        const todosRegistros = [];
        
        // Combinar registros C100 e C170 mantendo ordem original do arquivo
        Object.entries(registros).forEach(([tipo, linhas]) => {
            if (tipo === 'C100' || tipo === 'C170') {
                linhas.forEach(linha => {
                    todosRegistros.push({ tipo, linha });
                });
            }
        });
        
        // Ordenar registros para manter ordem hierárquica do SPED
        todosRegistros.sort((a, b) => {
            const ordemTipos = { 'C100': 0, 'C170': 1 };
            return ordemTipos[a.tipo] - ordemTipos[b.tipo];
        });
        
        let notaAtual = null;
        let contadorDifal = 0;
        
        for (const registro of todosRegistros) {
            if (registro.tipo === 'C100') {
                // Atualizar nota atual
                const linha = registro.linha;
                if (linha.length >= 12) {
                    const serie = linha[7] || "";
                    const numero = linha[8] || "";
                    const chaveNota = `${serie}-${numero}`;
                    notaAtual = this.notasFiscais.get(chaveNota) || null;
                }
            } else if (registro.tipo === 'C170' && notaAtual) {
                const linha = registro.linha;
                if (linha.length >= 12) {
                    const cfop = linha[11] || "";  // CFOP (índice 11)
                    
                    // Verificar se é CFOP DIFAL
                    if (window.EstadosUtil && window.EstadosUtil.isCFOPDifal(cfop)) {
                    const codigoItem = linha[3] || "";
                    const destinacao = window.EstadosUtil.obterDestinacaoCFOP(cfop);
                    
                    // Extrair valores do C170
                    const vlItem = parseFloat(linha[7]) || 0;
                    const vlDesc = parseFloat(linha[8]) || 0;
                    const cstIcms = linha[10] || "";
                    const vlBcIcms = parseFloat(linha[13]) || 0;
                    const aliqIcms = parseFloat(linha[14]) || 0;
                    const vlIpi = parseFloat(linha[24]) || 0;
                    
                    // Identificar benefícios fiscais baseado no CST ICMS
                    const beneficiosFiscais = this.identificarBeneficiosFiscais(cstIcms, aliqIcms, vlBcIcms, vlItem);
                    
                    // Dados básicos do item C170
                    const itemDifal = {
                        // Identificação
                        numItem: linha[2] || "",
                        codItem: codigoItem,
                        descrCompl: linha[4] || "",
                        cfop: cfop,
                        destinacao: destinacao,
                        
                        // Quantidades e valores
                        qtd: parseFloat(linha[5]) || 0,
                        unid: linha[6] || "",
                        vlItem: vlItem,
                        vlDesc: vlDesc,
                        vlBcIcms: vlBcIcms,
                        aliqIcms: aliqIcms,
                        vlIcms: parseFloat(linha[15]) || 0,
                        vlIpi: vlIpi,
                        
                        // Valores rateados da nota fiscal (serão preenchidos)
                        freteRateado: 0,
                        seguroRateado: 0,
                        outrasRateado: 0,
                        percentualRateio: 0,
                        
                        // Classificação fiscal
                        cstIcms: cstIcms,
                        
                        // Benefícios fiscais identificados
                        beneficiosFiscais: beneficiosFiscais,
                        
                        // Dados enriquecidos (serão preenchidos)
                        ncm: "",
                        descricaoCadastral: "",
                        tipoItem: "",
                        statusVinculacao: "NÃO PROCESSADO",
                        
                        // Dados da nota fiscal (serão preenchidos)
                        notaFiscal: null,
                        chaveNota: "", // Para vincular com C100
                        
                        // Campos calculados DIFAL  
                        baseCalculoDifal: 0,
                        ufOrigem: "OUT", // Origem interestadual genérica
                        ufDestino: this.headerInfo.uf || "",
                        
                        // Controle
                        linhaOriginal: linha
                    };
                    
                    // Enriquecer com dados do catálogo de produtos (0200)
                    if (this.catalogoProdutos[codigoItem]) {
                        const produto = this.catalogoProdutos[codigoItem];
                        itemDifal.ncm = produto.ncm;
                        itemDifal.descricaoCadastral = produto.descricao;
                        itemDifal.tipoItem = produto.tipo;
                        itemDifal.statusVinculacao = "ENCONTRADO";
                    } else {
                        itemDifal.ncm = "NCM NÃO ENCONTRADO";
                        itemDifal.descricaoCadastral = "PRODUTO NÃO CADASTRADO";
                        itemDifal.tipoItem = "TIPO DESCONHECIDO";
                        itemDifal.statusVinculacao = "NÃO ENCONTRADO";
                    }
                    
                    // Vincular com nota fiscal atual e calcular rateio
                    if (notaAtual && notaAtual.vlMerc > 0) {
                        const rateio = this.calcularRateioItem(notaAtual, vlItem, notaAtual.vlMerc);
                        itemDifal.freteRateado = rateio.freteRateado;
                        itemDifal.seguroRateado = rateio.seguroRateado;
                        itemDifal.outrasRateado = rateio.outrasRateado;
                        itemDifal.ufOrigem = notaAtual.ufOrigem || 'XX';
                        itemDifal.fornecedor = notaAtual.nomeParticipante;
                        itemDifal.percentualRateio = rateio.percentualItem;
                        itemDifal.notaFiscal = notaAtual;
                        itemDifal.chaveNota = `${notaAtual.serie}-${notaAtual.numDoc}`;
                    }
                    
                    // Calcular base de cálculo DIFAL correta
                    // Base = Valor Item + IPI + Frete Rateado + Seguro Rateado + Outras Rateadas - Desconto Item
                    itemDifal.baseCalculoDifal = vlItem + vlIpi + itemDifal.freteRateado + 
                                                itemDifal.seguroRateado + itemDifal.outrasRateado - vlDesc;
                    
                    // Adicionar à lista
                    this.itensDifal.push(itemDifal);
                    contadorDifal++;
                    }
                }
            }
        }
        
        console.log(`Itens DIFAL extraídos: ${contadorDifal}`);
        console.log(`Distribuição por destinação:`, this.obterDistribuicaoDestinacao());
        
        return this.itensDifal;
    }

    /**
     * Obtém distribuição dos itens DIFAL por destinação
     * @returns {Object}
     */
    obterDistribuicaoDestinacao() {
        const distribuicao = {
            'uso-consumo': 0,
            'ativo-imobilizado': 0,
            total: this.itensDifal.length
        };
        
        this.itensDifal.forEach(item => {
            if (item.destinacao) {
                distribuicao[item.destinacao] = (distribuicao[item.destinacao] || 0) + 1;
            }
        });
        
        return distribuicao;
    }

    /**
     * Obtém estatísticas dos valores DIFAL
     * @returns {Object}
     */
    obterEstatisticasValores() {
        if (this.itensDifal.length === 0) {
            return { totalItems: 0, totalBase: 0, totalIcms: 0, totalIpi: 0 };
        }
        
        const stats = this.itensDifal.reduce((acc, item) => {
            acc.totalItems += 1;
            acc.totalBase += item.baseCalculoDifal;
            acc.totalIcms += item.vlIcms;
            acc.totalIpi += item.vlIpi;
            acc.totalValorItem += item.vlItem;
            return acc;
        }, { 
            totalItems: 0, 
            totalBase: 0, 
            totalIcms: 0, 
            totalIpi: 0,
            totalValorItem: 0
        });
        
        return stats;
    }

    /**
     * Filtra itens DIFAL por CFOP específicos
     * @param {Array<string>} cfops 
     * @returns {Array}
     */
    filtrarPorCFOPs(cfops) {
        return this.itensDifal.filter(item => cfops.includes(item.cfop));
    }

    /**
     * Filtra itens DIFAL por destinação
     * @param {string} destinacao - 'uso-consumo' ou 'ativo-imobilizado'
     * @returns {Array}
     */
    filtrarPorDestinacao(destinacao) {
        return this.itensDifal.filter(item => item.destinacao === destinacao);
    }

    /**
     * Processa arquivo SPED completo com análise C170+NCM e extração DIFAL
     * @param {File} file 
     * @returns {Promise<Object>}
     */
    async processarArquivo(file) {
        try {
            this.fileName = file.name;
            
            // Ler arquivo
            const arrayBuffer = await file.arrayBuffer();
            const { encoding, content } = await this.detectAndRead(arrayBuffer);
            this.content = content;
            this.encoding = encoding;

            // Ler registros completos
            this.registros = this.lerArquivoSpedCompleto(content);
            
            // Extrair header
            this.headerInfo = this.extrairInformacoesHeader(this.registros);

            // Indexar notas fiscais para enriquecimento
            this.indexarNotasFiscais(this.registros);

            // Processar C170+NCM se houver registros necessários
            const temC170 = this.registros['C170'] && this.registros['C170'].length > 0;
            const tem0200 = this.registros['0200'] && this.registros['0200'].length > 0;

            if (temC170 && tem0200) {
                console.log('Iniciando análise C170+NCM...');
                await this.criarCatalogoProdutos(this.registros);
                
                // Extrair dados DIFAL específicos
                await this.extrairDadosDifal(this.registros);
            } else {
                console.log('Análise C170+NCM não realizada - registros insuficientes');
                if (temC170) {
                    // Mesmo sem 0200, extrai dados DIFAL básicos
                    await this.extrairDadosDifal(this.registros);
                }
            }

            return {
                fileName: this.fileName,
                encoding: this.encoding,
                headerInfo: this.headerInfo,
                registros: this.registros,
                totalRegistros: Object.values(this.registros).reduce((sum, arr) => sum + arr.length, 0),
                tiposRegistros: Object.keys(this.registros),
                catalogoProdutos: this.catalogoProdutos,
                itensDifal: this.itensDifal,
                notasFiscais: Array.from(this.notasFiscais.entries()),
                estatisticasDifal: {
                    totalItens: this.itensDifal.length,
                    distribuicaoDestinacao: this.obterDistribuicaoDestinacao(),
                    estatisticasValores: this.obterEstatisticasValores(),
                    ncmEncontrados: this.itensDifal.filter(i => i.statusVinculacao === 'ENCONTRADO').length,
                    ncmNaoEncontrados: this.itensDifal.filter(i => i.statusVinculacao === 'NÃO ENCONTRADO').length
                }
            };

        } catch (error) {
            console.error('Erro ao processar arquivo SPED:', error);
            throw error;
        }
    }

    /**
     * Obtém estatísticas completas do arquivo processado
     * @returns {Object}
     */
    obterEstatisticas() {
        if (!this.registros || Object.keys(this.registros).length === 0) {
            return {
                totalRegistros: 0,
                tiposRegistros: 0,
                registrosPorTipo: {},
                difal: null
            };
        }

        const registrosPorTipo = {};
        Object.entries(this.registros).forEach(([tipo, lista]) => {
            registrosPorTipo[tipo] = lista.length;
        });

        return {
            totalRegistros: Object.values(this.registros).reduce((sum, arr) => sum + arr.length, 0),
            tiposRegistros: Object.keys(this.registros).length,
            registrosPorTipo,
            difal: {
                totalItens: this.itensDifal.length,
                distribuicaoDestinacao: this.obterDistribuicaoDestinacao(),
                estatisticasValores: this.obterEstatisticasValores(),
                produtosNoCatalogo: Object.keys(this.catalogoProdutos).length,
                notasFiscaisIndexadas: this.notasFiscais.size
            }
        };
    }
}

// Exportar classe para uso global
if (typeof window !== 'undefined') {
    window.SpedParser = SpedParser;
}

// Para módulos Node.js se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpedParser;
}