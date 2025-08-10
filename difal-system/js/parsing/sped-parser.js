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
        
        // Processar itens para DIFAL
        await this.processarItensDifal();

        return {
            nomeArquivo: 'sped_processado.txt',
            dadosEmpresa: this.dadosEmpresa,
            registros: this.registros,
            itensDifal: this.itensDifal,
            estatisticas: {
                totalLinhas: linhas.length,
                linhasProcessadas: processadas,
                linhasIgnoradas: ignoradas,
                totalRegistros: Object.keys(this.registros).length,
                itensDifal: this.itensDifal.length
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
            this.dadosEmpresa = {
                cnpj: campos[2] || '',
                razaoSocial: campos[3] || '',
                uf: campos[8] || '',
                ie: campos[9] || ''
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

            // *** CORREÇÃO CRÍTICA DO NCM ***
            // Campo 3 = COD_ITEM (código interno do item)
            // Campo 2 = NCM (Nomenclatura Comum do Mercosul) <- POSIÇÃO CORRETA
            const codigoItem = campos[3] || "";     // NUM_ITEM/COD_ITEM
            const ncm = campos[2] || "N/A";         // NCM na posição correta
            
            const item = {
                tipoRegistro: 'C170',
                linha: numeroLinha,
                codItem: codigoItem,
                ncm: ncm,                           // NCM corrigido
                cfop: campos[7] || "",
                unidade: campos[4] || "",
                quantidade: parseFloat(campos[5]) || 0,
                valorItem: parseFloat(campos[6]) || 0,
                desconto: parseFloat(campos[8]) || 0,
                indMov: campos[9] || "",
                cstIcms: campos[10] || "",
                baseIcms: parseFloat(campos[12]) || 0,
                aliqIcms: parseFloat(campos[13]) || 0,
                valorIcms: parseFloat(campos[14]) || 0,
                
                // Campos calculados
                valorLiquido: 0,
                baseCalculoDifal: 0,
                ufOrigem: this.dadosEmpresa?.uf || '',
                
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
     * Processa registro 0200 (tabela de itens)
     */
    processarRegistro0200(campos) {
        if (campos.length >= 8) {
            const codigoItem = campos[1] || "";
            const descricaoItem = campos[2] || "";
            const ncm = campos[7] || "N/A";
            
            // Atualizar descrição nos itens DIFAL já processados
            this.itensDifal.forEach(item => {
                if (item.codItem === codigoItem) {
                    item.descricaoItem = descricaoItem;
                    
                    // Se o NCM não foi capturado no C170, usar o do 0200
                    if (!item.ncm || item.ncm === 'N/A') {
                        item.ncm = ncm;
                    }
                }
            });
        }
    }

    /**
     * Processa e filtra itens relevantes para DIFAL
     */
    async processarItensDifal() {
        console.log('🎯 Processando itens para cálculo DIFAL...');
        
        const itensOriginais = this.itensDifal.length;
        
        // Filtrar apenas itens relevantes para DIFAL
        this.itensDifal = this.itensDifal.filter(item => {
            // Filtrar por CFOP (interestaduais de entrada)
            const cfop = parseInt(item.cfop);
            const isInterestadualEntrada = cfop >= 1000 && cfop <= 1999;
            
            // Filtrar por valor mínimo
            const temValor = item.baseCalculoDifal > 0;
            
            // Filtrar por situação tributária (não isentos/suspensos)
            const cstValida = !['40', '41', '50', '51', '60', '90'].includes(item.cstIcms);
            
            return isInterestadualEntrada && temValor && cstValida;
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
}

// Exportar classe para uso se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpedParserModular;
}