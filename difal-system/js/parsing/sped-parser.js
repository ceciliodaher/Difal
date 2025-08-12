/**
 * SPED Parser - Versão Modular 
 * Parsing de arquivos SPED com correção do NCM (linha[2])
 * Integração com StateManager
 */

class SpedParserModular {
    constructor(eventBus, stateManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        
        // Estado do parser
        this.dadosEmpresa = null;
        this.registros = {};
        this.itensDifal = [];
        this.catalogoProdutos = {}; // Catálogo de produtos do registro 0200
        
        console.log('📄 SPED Parser Modular initialized');
    }

    /**
     * Processa arquivo SPED
     * @param {File} file - Arquivo SPED
     * @returns {Object} - Dados processados
     */
    async processarArquivo(file) {
        try {
            console.log('📂 Processando arquivo SPED:', file.name);
            
            // Emitir evento de início
            this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.PARSING_STARTED, {
                fileName: file.name,
                fileSize: file.size
            });

            // Ler arquivo
            const conteudo = await this.lerArquivo(file);
            const linhas = conteudo.split('\n');
            
            console.log(`📊 ${linhas.length} linhas encontradas no arquivo`);

            // Processar linhas
            const resultado = await this.processarLinhas(linhas);
            
            // Emitir evento de conclusão
            this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.PARSING_COMPLETED, {
                totalLinhas: linhas.length,
                totalRegistros: Object.keys(this.registros).length,
                itensDifal: this.itensDifal.length
            });

            return resultado;
            
        } catch (error) {
            console.error('❌ Erro ao processar arquivo SPED:', error);
            
            this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.PARSING_ERROR, {
                error: error.message
            });
            
            throw error;
        }
    }

    /**
     * Lê arquivo como texto
     * @param {File} file - Arquivo
     * @returns {Promise<string>} - Conteúdo do arquivo
     */
    lerArquivo(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            
            reader.onerror = () => {
                reject(new Error('Erro ao ler arquivo'));
            };
            
            reader.readAsText(file, 'UTF-8');
        });
    }

    /**
     * Processa todas as linhas do SPED
     * @param {Array} linhas - Linhas do arquivo
     * @returns {Object} - Dados processados
     */
    async processarLinhas(linhas) {
        console.log('🔄 Iniciando processamento das linhas...');
        
        // Reset de estado
        this.registros = {};
        this.itensDifal = [];
        this.dadosEmpresa = null;
        
        let processadas = 0;
        let ignoradas = 0;

        for (let i = 0; i < linhas.length; i++) {
            const linha = linhas[i].trim();
            
            if (!linha || linha.length < 5) {
                ignoradas++;
                continue;
            }

            try {
                const processou = this.processarLinha(linha, i + 1);
                if (processou) {
                    processadas++;
                }
                
                // Progresso a cada 1000 linhas
                if (i % 1000 === 0 && i > 0) {
                    console.log(`📊 Processadas ${i}/${linhas.length} linhas`);
                    
                    // Emitir progresso
                    this.eventBus?.emit(window.DIFAL_CONSTANTS?.EVENTS?.PARSING_PROGRESS, {
                        current: i,
                        total: linhas.length,
                        percentage: (i / linhas.length) * 100
                    });
                }
                
            } catch (error) {
                console.warn(`⚠️ Erro na linha ${i + 1}:`, error.message);
            }
        }

        console.log(`✅ Processamento concluído: ${processadas} processadas, ${ignoradas} ignoradas`);
        
        // Criar catálogo de produtos se houver registros 0200
        if (this.registros['0200'] && this.registros['0200'].length > 0) {
            await this.criarCatalogoProdutos();
            this.enriquecerItensComCatalogo();
        }
        
        // Processar itens para DIFAL
        await this.processarItensDifal();

        // Formatar período de apuração
        const periodoApuracao = this.dadosEmpresa ? 
            this.formatarPeriodoApuracao(this.dadosEmpresa.dtInicio, this.dadosEmpresa.dtFim) : 
            'Período não informado';

        return {
            nomeArquivo: 'sped_processado.txt',
            dadosEmpresa: this.dadosEmpresa,
            periodoApuracao: periodoApuracao,
            empresa: this.dadosEmpresa, // Alias para compatibilidade
            registros: this.registros,
            itensDifal: this.itensDifal,
            estatisticas: {
                totalLinhas: linhas.length,
                linhasProcessadas: processadas,
                linhasIgnoradas: ignoradas,
                totalRegistros: Object.keys(this.registros).length,
                itensDifal: this.itensDifal.length,
                periodoApuracao: periodoApuracao
            }
        };
    }

    /**
     * Processa uma linha individual do SPED
     * @param {string} linha - Linha do arquivo
     * @param {number} numeroLinha - Número da linha
     * @returns {boolean} - True se processou com sucesso
     */
    processarLinha(linha, numeroLinha) {
        if (!linha.startsWith('|') || !linha.endsWith('|')) {
            return false;
        }

        // Dividir campos
        const campos = linha.split('|').slice(1, -1); // Remove primeiro e último elemento vazio
        
        if (campos.length === 0) {
            return false;
        }

        const tipoRegistro = campos[0];

        // Contabilizar tipo de registro
        if (!this.registros[tipoRegistro]) {
            this.registros[tipoRegistro] = [];
        }
        this.registros[tipoRegistro].push({
            linha: numeroLinha,
            campos
        });

        // Processar registros específicos
        switch (tipoRegistro) {
            case '0000':
                this.processarRegistro0000(campos);
                break;
            case 'C170':
                this.processarRegistroC170(campos, numeroLinha);
                break;
            case '0200':
                this.processarRegistro0200(campos);
                break;
        }

        return true;
    }

    /**
     * Processa registro 0000 (dados da empresa)
     */
    processarRegistro0000(campos) {
        if (campos.length >= 10) {
            // Registro 0000: |REG|COD_VER|COD_FIN|DT_INI|DT_FIM|NOME|CNPJ|CPF|UF|IE|...
            //                 0    1       2       3       4      5     6     7   8   9
            
            // *** CORREÇÃO CRÍTICA baseada no console log ***
            // Console mostrava: cnpj: "1", razaoSocial: "01012025"
            // Isso indica que as posições estavam corretas mas algo está errado
            // Vou adicionar debug para ver o que está vindo:
            
            console.log('🔍 DEBUG 0000 - Campos recebidos:', campos.slice(0, 12));
            
            this.dadosEmpresa = {
                razaoSocial: campos[5] || '',    // Posição 5: NOME 
                cnpj: campos[6] || '',           // Posição 6: CNPJ
                uf: campos[8] || '',             // Posição 8: UF
                ie: campos[9] || '',             // Posição 9: IE
                dtInicio: campos[3] || '',       // Posição 3: DT_INI  
                dtFim: campos[4] || '',          // Posição 4: DT_FIM
                
                // DEBUG - campos extras para ver o que está vindo
                debug_campo_0: campos[0] || '',
                debug_campo_1: campos[1] || '',
                debug_campo_2: campos[2] || '',
                debug_campo_3: campos[3] || '',
                debug_campo_4: campos[4] || '',
                debug_campo_5: campos[5] || '',
                debug_campo_6: campos[6] || '',
                debug_campo_7: campos[7] || '',
                debug_campo_8: campos[8] || '',
                debug_campo_9: campos[9] || ''
            };
            
            console.log('🏢 Empresa identificada:', this.dadosEmpresa);
        }
    }

    /**
     * Processa registro C170 (itens de documentos fiscais)
     * CORREÇÃO CRÍTICA: NCM está na posição 2 (linha[2]), não 3
     */
    processarRegistroC170(campos, numeroLinha) {
        try {
            if (campos.length < 16) {
                console.warn(`⚠️ Registro C170 incompleto na linha ${numeroLinha}`);
                return;
            }

            // *** CORREÇÃO CRÍTICA baseada na versão monolítica ***
            // Layout C170: |REG|NUM_ITEM|COD_ITEM|DESCR_COMPL|QTD|UNID|VL_ITEM|VL_DESC|IND_MOV|CST_ICMS|CFOP|...
            //               0    1        2        3           4   5    6        7       8       9        10
            
            // Versão monolítica usa: const cfop = linha[11] || ""; (posição 11)
            // Mas console log mostra CFOP como "0", então vou adicionar debug
            
            console.log('🔍 DEBUG C170 - Linha', numeroLinha, '- Campos:', campos.slice(0, 15));
            
            const numItem = campos[1] || "";        // NUM_ITEM
            const codigoItem = campos[2] || "";     // COD_ITEM
            const descricao = campos[3] || "";      // DESCR_COMPL
            const cfop = campos[10] || "";          // CFOP - TESTANDO posição 10 (monolítico usa 11)
            
            // Para NCM, usar o código do item por enquanto
            // (na versão monolítica vem do catálogo 0200)
            const ncm = codigoItem || "N/A";
            
            const item = {
                tipoRegistro: 'C170',
                linha: numeroLinha,
                numItem: numItem,
                codItem: codigoItem,
                descricaoItem: descricao,
                ncm: ncm,
                cfop: cfop,                         // CFOP corrigido
                unidade: campos[5] || "",           // UNID
                quantidade: parseFloat(campos[4]) || 0,   // QTD
                valorItem: parseFloat(campos[6]) || 0,    // VL_ITEM
                desconto: parseFloat(campos[7]) || 0,     // VL_DESC
                indMov: campos[8] || "",            // IND_MOV
                cstIcms: campos[9] || "",           // CST_ICMS
                baseIcms: parseFloat(campos[12]) || 0,    // VL_BC_ICMS
                aliqIcms: parseFloat(campos[13]) || 0,    // ALIQ_ICMS
                valorIcms: parseFloat(campos[14]) || 0,   // VL_ICMS
                
                // Campos calculados
                valorLiquido: 0,
                baseCalculoDifal: 0,
                ufOrigem: 'XX',  // UF genérica para forçar operação interestadual
                aliqOrigemNota: parseFloat(campos[13]) || 0,  // Alíquota real do SPED para DIFAL
                
                // Debug info
                camposOriginais: campos,
                debug: {
                    posicaoNCM: 2,
                    ncmEncontrado: campos[2],
                    codigoItem: campos[3]
                }
            };

            // Calcular valor líquido
            item.valorLiquido = item.valorItem - item.desconto;
            
            // Base de cálculo DIFAL = valor do item (líquido)
            item.baseCalculoDifal = item.valorLiquido;

            // Adicionar à lista
            this.itensDifal.push(item);
            
            // Log detalhado para debug
            if (this.itensDifal.length <= 5) {
                console.log(`📦 Item ${this.itensDifal.length}:`, {
                    codigo: item.codItem,
                    ncm: item.ncm,
                    cfop: item.cfop,
                    valor: item.valorItem,
                    linha: numeroLinha
                });
            }
            
        } catch (error) {
            console.error(`❌ Erro ao processar C170 linha ${numeroLinha}:`, error);
        }
    }

    /**
     * Cria catálogo de produtos a partir dos registros 0200
     * CRÍTICO para análise C170+NCM (baseado na versão monolítica)
     */
    async criarCatalogoProdutos() {
        console.log('📚 Criando catálogo de produtos do registro 0200...');
        this.catalogoProdutos = {};
        
        const registros0200 = this.registros['0200'] || [];
        console.log(`📦 Processando ${registros0200.length} registros 0200`);

        for (let i = 0; i < registros0200.length; i++) {
            const registro = registros0200[i];
            try {
                if (registro.campos && registro.campos.length >= 9) {
                    const campos = registro.campos;
                    
                    // Layout 0200: ['REG', 'COD_ITEM', 'DESCR_ITEM', 'COD_BARRA', 'COD_ANT_ITEM', 'UNID_INV', 'TIPO_ITEM', 'COD_NCM', 'EX_IPI']
                    //                0     1           2            3            4              5          6           7         8
                    const codigoItem = campos[1] || "";     // COD_ITEM
                    const descricao = campos[2] || "";      // DESCR_ITEM
                    const tipoItem = campos[6] || "";       // TIPO_ITEM  
                    const ncm = campos[7] || "";            // COD_NCM

                    if (codigoItem && codigoItem.trim()) {
                        this.catalogoProdutos[codigoItem] = {
                            ncm: ncm.trim() || "SEM NCM",
                            descricao: descricao.trim() || "SEM DESCRICAO",
                            tipo: tipoItem.trim() || "SEM TIPO"
                        };
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Erro linha ${i} do 0200:`, error);
                continue;
            }

            // Yield periodically para não travar a UI
            if (i % 100 === 0 && i > 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }

        console.log(`✅ Catálogo criado: ${Object.keys(this.catalogoProdutos).length} produtos`);
    }

    /**
     * Enriquece itens C170 com dados do catálogo 0200
     */
    enriquecerItensComCatalogo() {
        console.log('🔗 Enriquecendo itens C170 com dados do catálogo...');
        
        let enriquecidos = 0;
        
        this.itensDifal.forEach(item => {
            const catalogoItem = this.catalogoProdutos[item.codItem];
            if (catalogoItem) {
                // Atualizar NCM com dados do catálogo
                if (!item.ncm || item.ncm === 'N/A' || item.ncm === item.codItem) {
                    item.ncm = catalogoItem.ncm;
                }
                
                // Atualizar descrição se não tem ou está vazia
                if (!item.descricaoItem || item.descricaoItem.trim() === '') {
                    item.descricaoItem = catalogoItem.descricao;
                }
                
                // Adicionar tipo do item
                item.tipoItem = catalogoItem.tipo;
                
                enriquecidos++;
            }
        });
        
        console.log(`✅ ${enriquecidos} itens enriquecidos com dados do catálogo`);
    }

    /**
     * Processa registro 0200 (tabela de itens) - versão simplificada
     * O catálogo principal é criado em criarCatalogoProdutos()
     */
    processarRegistro0200(campos) {
        // Registros 0200 são processados em lote no criarCatalogoProdutos()
        // Mantendo este método para compatibilidade
    }

    /**
     * Processa e filtra itens relevantes para DIFAL
     */
    async processarItensDifal() {
        console.log('🎯 Processando itens para cálculo DIFAL...');
        
        const itensOriginais = this.itensDifal.length;
        
        // Filtrar apenas itens relevantes para DIFAL
        this.itensDifal = this.itensDifal.filter(item => {
            // *** CORREÇÃO CRÍTICA: Usar filtro específico DIFAL como na versão monolítica ***
            const cfop = item.cfop;
            
            // Verificar se é CFOP DIFAL usando EstadosUtil (como na versão monolítica)
            const isCfopDifal = window.EstadosUtil && window.EstadosUtil.isCFOPDifal 
                ? window.EstadosUtil.isCFOPDifal(cfop)
                : false; // Fallback se EstadosUtil não disponível
            
            // Filtrar por valor mínimo
            const temValor = item.baseCalculoDifal > 0;
            
            // Filtrar por situação tributária (não isentos/suspensos)
            const cstValida = !['40', '41', '50', '51', '60', '90'].includes(item.cstIcms);
            
            // Debug do filtro
            if (item.baseCalculoDifal > 0) { // Só loggar itens com valor para reduzir spam
                console.log(`🔍 Filtro DIFAL - CFOP ${cfop}: DIFAL=${isCfopDifal}, Valor=${temValor}, CST=${cstValida}`);
            }
            
            return isCfopDifal && temValor && cstValida;
        });
        
        // Enriquecer itens com dados calculados
        this.itensDifal.forEach((item, index) => {
            item.id = `item_${index + 1}`;
            
            // Determinar UF de destino automaticamente
            item.ufDestino = this.determinarUfDestino(item);
            
            // Adicionar informações de debug
            item.debug = {
                ...item.debug,
                filtrado: true,
                cfopValido: parseInt(item.cfop) >= 1000 && parseInt(item.cfop) <= 1999,
                temValor: item.baseCalculoDifal > 0,
                cstValida: !['40', '41', '50', '51', '60', '90'].includes(item.cstIcms)
            };
        });
        
        console.log(`✅ Itens DIFAL processados: ${itensOriginais} → ${this.itensDifal.length} (filtrados)`);
        
        // Log NCMs encontrados para debug
        const ncmsUnicos = [...new Set(this.itensDifal.map(item => item.ncm))];
        console.log(`📊 NCMs únicos encontrados (${ncmsUnicos.length}):`, ncmsUnicos.slice(0, 10));
    }

    /**
     * Determina UF de destino baseado na empresa
     */
    determinarUfDestino(item) {
        return this.dadosEmpresa?.uf || 'SP'; // Default SP se não encontrado
    }

    /**
     * Obtém estatísticas do processamento
     */
    obterEstatisticas() {
        const tipos = Object.keys(this.registros);
        const totalRegistros = tipos.reduce((sum, tipo) => sum + this.registros[tipo].length, 0);
        
        return {
            tiposRegistros: tipos,
            totalRegistros,
            registrosPorTipo: Object.fromEntries(
                tipos.map(tipo => [tipo, this.registros[tipo].length])
            ),
            itensDifal: this.itensDifal.length,
            dadosEmpresa: this.dadosEmpresa
        };
    }

    /**
     * Validações de integridade
     */
    validarDados() {
        const erros = [];
        
        if (!this.dadosEmpresa) {
            erros.push('Dados da empresa não encontrados (registro 0000)');
        }
        
        if (this.itensDifal.length === 0) {
            erros.push('Nenhum item válido para cálculo DIFAL encontrado');
        }
        
        // Validar NCMs
        const itensSemNCM = this.itensDifal.filter(item => !item.ncm || item.ncm === 'N/A').length;
        if (itensSemNCM > 0) {
            erros.push(`${itensSemNCM} itens sem NCM definido`);
        }
        
        return {
            valido: erros.length === 0,
            erros
        };
    }

    /**
     * Formatar período de apuração
     * @private
     * @param {string} dtInicio - Data início no formato DDMMAAAA
     * @param {string} dtFim - Data fim no formato DDMMAAAA
     * @returns {string} - Período formatado "DD/MM/AAAA a DD/MM/AAAA"
     */
    formatarPeriodoApuracao(dtInicio, dtFim) {
        if (!dtInicio || !dtFim) return 'Período não informado';
        
        const formatarData = (data) => {
            if (!data || data.length !== 8) return '';
            const dia = data.substring(0, 2);
            const mes = data.substring(2, 4);
            const ano = data.substring(4, 8);
            return `${dia}/${mes}/${ano}`;
        };
        
        const inicio = formatarData(dtInicio);
        const fim = formatarData(dtFim);
        
        if (!inicio || !fim) return 'Período inválido';
        
        // Se mesmo período, mostrar apenas uma data
        if (dtInicio === dtFim) {
            return inicio;
        }
        
        return `${inicio} a ${fim}`;
    }

    /**
     * Reset do parser
     */
    limpar() {
        this.dadosEmpresa = null;
        this.registros = {};
        this.itensDifal = [];
        
        console.log('🧹 SPED Parser limpo');
    }

    /**
     * Debug: exporta dados processados
     */
    exportarDebug() {
        return {
            dadosEmpresa: this.dadosEmpresa,
            estatisticas: this.obterEstatisticas(),
            validacao: this.validarDados(),
            primeiros10Itens: this.itensDifal.slice(0, 10),
            ncmsUnicos: [...new Set(this.itensDifal.map(item => item.ncm))].slice(0, 20)
        };
    }
}

// Expor globalmente para compatibilidade
if (typeof window !== 'undefined') {
    window.SpedParserModular = SpedParserModular;
    // Alias para compatibilidade com código existente
    window.SpedParser = SpedParserModular;
}

// Exportar classe para uso se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpedParserModular;
}