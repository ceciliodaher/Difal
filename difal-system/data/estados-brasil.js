/* Estados Brasileiros - Configuração para Cálculo DIFAL 2025 */

const ESTADOS_BRASIL = [
    {
        uf: 'AC',
        nome: 'Acre',
        aliqInterna: 19.0,
        fcp: 0, // Não possui FCP
        metodologia: 'base-dupla',
        regiao: 'Norte'
    },
    {
        uf: 'AL',
        nome: 'Alagoas',
        aliqInterna: 20.0, // 19% + 1% FECOEP
        fcp: 1, // Faixa 1-2%, adotando limite inferior
        fcpMax: 2,
        metodologia: 'base-dupla',
        regiao: 'Nordeste'
    },
    {
        uf: 'AP',
        nome: 'Amapá',
        aliqInterna: 18.0,
        fcp: 0, // Não possui FCP
        metodologia: 'base-dupla',
        regiao: 'Norte'
    },
    {
        uf: 'AM',
        nome: 'Amazonas',
        aliqInterna: 20.0,
        fcp: 1.5, // Faixa 1.5-2%, adotando limite inferior
        fcpMax: 2,
        metodologia: 'base-dupla',
        regiao: 'Norte'
    },
    {
        uf: 'BA',
        nome: 'Bahia',
        aliqInterna: 20.5,
        fcp: 2,
        metodologia: 'base-dupla',
        regiao: 'Nordeste'
    },
    {
        uf: 'CE',
        nome: 'Ceará',
        aliqInterna: 20.0,
        fcp: 2,
        metodologia: 'base-dupla',
        regiao: 'Nordeste'
    },
    {
        uf: 'DF',
        nome: 'Distrito Federal',
        aliqInterna: 20.0,
        fcp: 2,
        metodologia: 'base-dupla',
        regiao: 'Centro-Oeste'
    },
    {
        uf: 'ES',
        nome: 'Espírito Santo',
        aliqInterna: 17.0,
        fcp: 2,
        metodologia: 'base-dupla',
        regiao: 'Sudeste'
    },
    {
        uf: 'GO',
        nome: 'Goiás',
        aliqInterna: 19.0,
        fcp: 0, // Não cobra FCP atualmente
        metodologia: 'base-dupla',
        regiao: 'Centro-Oeste'
    },
    {
        uf: 'MA',
        nome: 'Maranhão',
        aliqInterna: 23.0,
        fcp: 2,
        metodologia: 'base-dupla',
        regiao: 'Nordeste'
    },
    {
        uf: 'MT',
        nome: 'Mato Grosso',
        aliqInterna: 17.0,
        fcp: 0, // "Até 2%" = faixa 0-2%, adotando limite inferior
        fcpMax: 2,
        metodologia: 'base-dupla',
        regiao: 'Centro-Oeste'
    },
    {
        uf: 'MS',
        nome: 'Mato Grosso do Sul',
        aliqInterna: 17.0,
        fcp: 0, // "Até 2%" = faixa 0-2%, adotando limite inferior
        fcpMax: 2,
        metodologia: 'base-dupla',
        regiao: 'Centro-Oeste'
    },
    {
        uf: 'MG',
        nome: 'Minas Gerais',
        aliqInterna: 18.0,
        fcp: 2,
        metodologia: 'base-dupla',
        regiao: 'Sudeste'
    },
    {
        uf: 'PA',
        nome: 'Pará',
        aliqInterna: 19.0,
        fcp: 0, // Não possui FCP
        metodologia: 'base-unica',
        regiao: 'Norte'
    },
    {
        uf: 'PB',
        nome: 'Paraíba',
        aliqInterna: 20.0,
        fcp: 2,
        metodologia: 'base-dupla',
        regiao: 'Nordeste'
    },
    {
        uf: 'PR',
        nome: 'Paraná',
        aliqInterna: 19.5,
        fcp: 2,
        metodologia: 'base-dupla',
        regiao: 'Sul'
    },
    {
        uf: 'PE',
        nome: 'Pernambuco',
        aliqInterna: 20.5,
        fcp: 2,
        metodologia: 'base-dupla',
        regiao: 'Nordeste'
    },
    {
        uf: 'PI',
        nome: 'Piauí',
        aliqInterna: 22.5,
        fcp: 2,
        metodologia: 'base-dupla',
        regiao: 'Nordeste'
    },
    {
        uf: 'RJ',
        nome: 'Rio de Janeiro',
        aliqInterna: 22.0, // 20% + 2% FECP
        fcp: 0, // "Até 4%" = faixa 0-4%, adotando limite inferior
        fcpMax: 4,
        metodologia: 'base-dupla',
        regiao: 'Sudeste'
    },
    {
        uf: 'RN',
        nome: 'Rio Grande do Norte',
        aliqInterna: 20.0,
        fcp: 2,
        metodologia: 'base-dupla',
        regiao: 'Nordeste'
    },
    {
        uf: 'RS',
        nome: 'Rio Grande do Sul',
        aliqInterna: 17.0,
        fcp: 2,
        metodologia: 'base-dupla',
        regiao: 'Sul'
    },
    {
        uf: 'RO',
        nome: 'Rondônia',
        aliqInterna: 19.5,
        fcp: 2,
        metodologia: 'base-unica',
        regiao: 'Norte'
    },
    {
        uf: 'RR',
        nome: 'Roraima',
        aliqInterna: 20.0,
        fcp: 0, // "Até 2%" = faixa 0-2%, adotando limite inferior
        fcpMax: 2,
        metodologia: 'base-dupla',
        regiao: 'Norte'
    },
    {
        uf: 'SC',
        nome: 'Santa Catarina',
        aliqInterna: 17.0,
        fcp: 0, // Não possui FCP
        metodologia: 'base-dupla',
        regiao: 'Sul'
    },
    {
        uf: 'SP',
        nome: 'São Paulo',
        aliqInterna: 18.0,
        fcp: 1,
        metodologia: 'base-dupla',
        regiao: 'Sudeste'
    },
    {
        uf: 'SE',
        nome: 'Sergipe',
        aliqInterna: 20.0, // 19% + 1% FECOEP
        fcp: 1, // Faixa 1-2%, adotando limite inferior
        fcpMax: 2,
        metodologia: 'base-dupla',
        regiao: 'Nordeste'
    },
    {
        uf: 'TO',
        nome: 'Tocantins',
        aliqInterna: 20.0,
        fcp: 2,
        metodologia: 'base-unica',
        regiao: 'Norte'
    }
];

/* Alíquotas Interestaduais ICMS */
const ALIQUOTAS_INTERESTADUAIS = {
    // Alíquotas padrão para operações interestaduais
    'padrao': 12, // Para a maioria das operações
    'sul-sudeste': 12, // Entre estados do Sul e Sudeste
    'norte-nordeste-co': 7 // De/para Norte, Nordeste e Centro-Oeste
};

/* CFOPs DIFAL - Apenas operações interestaduais SEM substituição tributária */
const CFOPS_DIFAL = {
    'uso-consumo': [
        '2556'  // Compra de material para uso ou consumo (interestadual)
    ],
    'ativo-imobilizado': [
        '2551'  // Compra de bem para o ativo imobilizado (interestadual)
    ]
};

/* Funções de Utilidade */
const EstadosUtil = {
    /**
     * Busca informações de um estado pela UF
     */
    obterPorUF(uf) {
        return ESTADOS_BRASIL.find(estado => estado.uf === uf.toUpperCase());
    },

    /**
     * Busca informações de um estado pelo nome
     */
    obterPorNome(nome) {
        return ESTADOS_BRASIL.find(estado => 
            estado.nome.toLowerCase().includes(nome.toLowerCase())
        );
    },

    /**
     * Retorna todos os estados de uma região
     */
    obterPorRegiao(regiao) {
        return ESTADOS_BRASIL.filter(estado => estado.regiao === regiao);
    },

    /**
     * Verifica se um CFOP é DIFAL
     */
    isCFOPDifal(cfop) {
        const todosCfops = [
            ...CFOPS_DIFAL['uso-consumo'],
            ...CFOPS_DIFAL['ativo-imobilizado']
        ];
        return todosCfops.includes(cfop.toString());
    },

    /**
     * Determina a destinação baseada no CFOP
     */
    obterDestinacaoCFOP(cfop) {
        if (CFOPS_DIFAL['uso-consumo'].includes(cfop.toString())) {
            return 'uso-consumo';
        }
        if (CFOPS_DIFAL['ativo-imobilizado'].includes(cfop.toString())) {
            return 'ativo-imobilizado';
        }
        return null;
    },

    /**
     * Determina a alíquota interestadual baseada na origem e destino
     */
    obterAliquotaInterestadual(ufOrigem, ufDestino) {
        const estadoOrigem = this.obterPorUF(ufOrigem);
        const estadoDestino = this.obterPorUF(ufDestino);
        
        if (!estadoOrigem || !estadoDestino) {
            return ALIQUOTAS_INTERESTADUAIS.padrao;
        }

        // Regras específicas para alíquotas interestaduais
        const regioesSulSudeste = ['Sul', 'Sudeste'];
        const regioesNorteNordesteCO = ['Norte', 'Nordeste', 'Centro-Oeste'];
        
        // Se origem for Sul/Sudeste para Norte/Nordeste/CO ou vice-versa
        if (
            (regioesSulSudeste.includes(estadoOrigem.regiao) && 
             regioesNorteNordesteCO.includes(estadoDestino.regiao)) ||
            (regioesNorteNordesteCO.includes(estadoOrigem.regiao) && 
             regioesSulSudeste.includes(estadoDestino.regiao))
        ) {
            return ALIQUOTAS_INTERESTADUAIS['norte-nordeste-co'];
        }
        
        return ALIQUOTAS_INTERESTADUAIS.padrao;
    },

    /**
     * Lista de UFs para preenchimento de selects
     */
    obterListaUFs() {
        return ESTADOS_BRASIL.map(estado => ({
            value: estado.uf,
            text: `${estado.uf} - ${estado.nome}`
        }));
    },

    /**
     * Valida se operação é interestadual
     */
    isOperacaoInterestadual(ufOrigem, ufDestino) {
        return ufOrigem && ufDestino && ufOrigem !== ufDestino;
    }
};

/* Exportar para uso global */
if (typeof window !== 'undefined') {
    window.ESTADOS_BRASIL = ESTADOS_BRASIL;
    window.CFOPS_DIFAL = CFOPS_DIFAL;
    window.ALIQUOTAS_INTERESTADUAIS = ALIQUOTAS_INTERESTADUAIS;
    window.EstadosUtil = EstadosUtil;
}

/* Para uso em Node.js se necessário */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ESTADOS_BRASIL,
        CFOPS_DIFAL,
        ALIQUOTAS_INTERESTADUAIS,
        EstadosUtil
    };
}