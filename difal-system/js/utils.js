/**
 * Utilities - Funções utilitárias para formatação e helpers
 */

const Utils = {
    /**
     * Formata valor monetário brasileiro
     * @param {number} valor 
     * @returns {string}
     */
    formatarMoeda(valor) {
        if (valor === null || valor === undefined || isNaN(valor)) {
            return 'R$ 0,00';
        }
        
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(valor);
    },

    /**
     * Formata número com separador de milhares
     * @param {number} numero 
     * @param {number} decimais 
     * @returns {string}
     */
    formatarNumero(numero, decimais = 0) {
        if (numero === null || numero === undefined || isNaN(numero)) {
            return '0';
        }
        
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: decimais,
            maximumFractionDigits: decimais
        }).format(numero);
    },

    /**
     * Formata porcentagem
     * @param {number} valor 
     * @param {number} decimais 
     * @returns {string}
     */
    formatarPorcentagem(valor, decimais = 2) {
        if (valor === null || valor === undefined || isNaN(valor)) {
            return '0%';
        }
        
        return new Intl.NumberFormat('pt-BR', {
            style: 'percent',
            minimumFractionDigits: decimais,
            maximumFractionDigits: decimais
        }).format(valor / 100);
    },

    /**
     * Formata data brasileira
     * @param {string|Date} data 
     * @returns {string}
     */
    formatarData(data) {
        if (!data) return '';
        
        let dataObj;
        
        // Se for string no formato DDMMAAAA
        if (typeof data === 'string' && data.length === 8) {
            const dia = data.substring(0, 2);
            const mes = data.substring(2, 4);
            const ano = data.substring(4, 8);
            dataObj = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        } else if (typeof data === 'string') {
            dataObj = new Date(data);
        } else {
            dataObj = data;
        }
        
        if (isNaN(dataObj.getTime())) {
            return data.toString();
        }
        
        return dataObj.toLocaleDateString('pt-BR');
    },

    /**
     * Formata CNPJ
     * @param {string} cnpj 
     * @returns {string}
     */
    formatarCNPJ(cnpj) {
        if (!cnpj) return '';
        
        const numeros = cnpj.replace(/\D/g, '');
        
        if (numeros.length !== 14) {
            return cnpj;
        }
        
        return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    },

    /**
     * Trunca texto com ellipsis
     * @param {string} texto 
     * @param {number} tamanho 
     * @returns {string}
     */
    truncarTexto(texto, tamanho = 50) {
        if (!texto) return '';
        
        if (texto.length <= tamanho) {
            return texto;
        }
        
        return texto.substring(0, tamanho - 3) + '...';
    },

    /**
     * Debounce para eventos
     * @param {Function} func 
     * @param {number} delay 
     * @returns {Function}
     */
    debounce(func, delay = 300) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },

    /**
     * Cria elemento HTML com atributos
     * @param {string} tag 
     * @param {Object} atributos 
     * @param {string|Array} conteudo 
     * @returns {HTMLElement}
     */
    criarElemento(tag, atributos = {}, conteudo = '') {
        const elemento = document.createElement(tag);
        
        // Definir atributos
        Object.entries(atributos).forEach(([chave, valor]) => {
            if (chave === 'className') {
                elemento.className = valor;
            } else if (chave === 'onClick') {
                elemento.addEventListener('click', valor);
            } else {
                elemento.setAttribute(chave, valor);
            }
        });
        
        // Definir conteúdo
        if (Array.isArray(conteudo)) {
            conteudo.forEach(item => {
                if (typeof item === 'string') {
                    elemento.appendChild(document.createTextNode(item));
                } else {
                    elemento.appendChild(item);
                }
            });
        } else if (typeof conteudo === 'string') {
            elemento.textContent = conteudo;
        } else if (conteudo instanceof HTMLElement) {
            elemento.appendChild(conteudo);
        }
        
        return elemento;
    },

    /**
     * Gera ID único
     * @returns {string}
     */
    gerarId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Converte CSV para array de objetos
     * @param {string} csvText 
     * @param {string} separator 
     * @returns {Array}
     */
    csvParaArray(csvText, separator = ',') {
        const linhas = csvText.trim().split('\n');
        if (linhas.length < 2) return [];
        
        const cabecalhos = linhas[0].split(separator).map(h => h.trim());
        const dados = [];
        
        for (let i = 1; i < linhas.length; i++) {
            const valores = linhas[i].split(separator);
            const objeto = {};
            
            cabecalhos.forEach((cabecalho, index) => {
                objeto[cabecalho] = valores[index] ? valores[index].trim() : '';
            });
            
            dados.push(objeto);
        }
        
        return dados;
    },

    /**
     * Converte array de objetos para CSV
     * @param {Array} dados 
     * @param {string} separator 
     * @returns {string}
     */
    arrayParaCsv(dados, separator = ',') {
        if (!dados || dados.length === 0) return '';
        
        const cabecalhos = Object.keys(dados[0]);
        const linhas = [cabecalhos.join(separator)];
        
        dados.forEach(item => {
            const valores = cabecalhos.map(cabecalho => {
                let valor = item[cabecalho];
                
                // Tratar valores que podem conter o separador
                if (typeof valor === 'string' && valor.includes(separator)) {
                    valor = `"${valor}"`;
                }
                
                return valor || '';
            });
            
            linhas.push(valores.join(separator));
        });
        
        return linhas.join('\n');
    },

    /**
     * Download de arquivo
     * @param {string} conteudo 
     * @param {string} nomeArquivo 
     * @param {string} mimeType 
     */
    downloadArquivo(conteudo, nomeArquivo, mimeType = 'text/plain') {
        const blob = new Blob([conteudo], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    },

    /**
     * Copia texto para clipboard
     * @param {string} texto 
     * @returns {Promise<boolean>}
     */
    async copiarTexto(texto) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(texto);
                return true;
            } else {
                // Fallback para navegadores mais antigos
                const textArea = document.createElement('textarea');
                textArea.value = texto;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const resultado = document.execCommand('copy');
                document.body.removeChild(textArea);
                return resultado;
            }
        } catch (error) {
            console.error('Erro ao copiar texto:', error);
            return false;
        }
    },

    /**
     * Valida CNPJ
     * @param {string} cnpj 
     * @returns {boolean}
     */
    validarCNPJ(cnpj) {
        if (!cnpj) return false;
        
        const numeros = cnpj.replace(/\D/g, '');
        
        if (numeros.length !== 14) return false;
        if (/^(\d)\1{13}$/.test(numeros)) return false; // Todos iguais
        
        // Validação dos dígitos verificadores
        let soma = 0;
        let peso = 2;
        
        // Primeiro dígito
        for (let i = 11; i >= 0; i--) {
            soma += parseInt(numeros.charAt(i)) * peso;
            peso = peso === 9 ? 2 : peso + 1;
        }
        
        const resto = soma % 11;
        const digito1 = resto < 2 ? 0 : 11 - resto;
        
        if (parseInt(numeros.charAt(12)) !== digito1) return false;
        
        // Segundo dígito
        soma = 0;
        peso = 2;
        
        for (let i = 12; i >= 0; i--) {
            soma += parseInt(numeros.charAt(i)) * peso;
            peso = peso === 9 ? 2 : peso + 1;
        }
        
        const resto2 = soma % 11;
        const digito2 = resto2 < 2 ? 0 : 11 - resto2;
        
        return parseInt(numeros.charAt(13)) === digito2;
    },

    /**
     * Agrupa array por propriedade
     * @param {Array} array 
     * @param {string|Function} propriedade 
     * @returns {Object}
     */
    agruparPor(array, propriedade) {
        return array.reduce((grupos, item) => {
            const chave = typeof propriedade === 'function' 
                ? propriedade(item) 
                : item[propriedade];
                
            if (!grupos[chave]) {
                grupos[chave] = [];
            }
            
            grupos[chave].push(item);
            return grupos;
        }, {});
    },

    /**
     * Remove acentos de texto
     * @param {string} texto 
     * @returns {string}
     */
    removerAcentos(texto) {
        if (!texto) return '';
        
        return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    },

    /**
     * Busca fuzzy em array de objetos
     * @param {Array} dados 
     * @param {string} termo 
     * @param {Array} campos 
     * @returns {Array}
     */
    buscarFuzzy(dados, termo, campos = []) {
        if (!termo || !dados) return dados;
        
        const termoLimpo = this.removerAcentos(termo.toLowerCase());
        
        return dados.filter(item => {
            // Se campos não especificados, buscar em todas as strings
            if (campos.length === 0) {
                return Object.values(item).some(valor => {
                    if (typeof valor === 'string') {
                        return this.removerAcentos(valor.toLowerCase()).includes(termoLimpo);
                    }
                    return false;
                });
            }
            
            // Buscar apenas nos campos especificados
            return campos.some(campo => {
                const valor = item[campo];
                if (typeof valor === 'string') {
                    return this.removerAcentos(valor.toLowerCase()).includes(termoLimpo);
                }
                return false;
            });
        });
    },

    /**
     * Throttle para eventos
     * @param {Function} func 
     * @param {number} limit 
     * @returns {Function}
     */
    throttle(func, limit = 100) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.Utils = Utils;
}

// Para módulos Node.js se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}