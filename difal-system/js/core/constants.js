/**
 * Constants - Constantes globais do sistema DIFAL
 * Centralizadas para facilitar manutenção e configuração
 */

window.DIFAL_CONSTANTS = {
    
    // Versão do sistema
    VERSION: '3.0.0',
    
    // Eventos do sistema
    EVENTS: {
        // Eventos de dados
        DATA_LOADED: 'data:loaded',
        DATA_PROCESSED: 'data:processed',
        DATA_CLEARED: 'data:cleared',
        
        // Eventos de cálculo
        CALCULATION_STARTED: 'calculation:started',
        CALCULATION_PROGRESS: 'calculation:progress',
        CALCULATION_COMPLETED: 'calculation:completed',
        CALCULATION_ERROR: 'calculation:error',
        
        // Eventos de UI
        SECTION_CHANGED: 'ui:section:changed',
        MODAL_OPENED: 'ui:modal:opened',
        MODAL_CLOSED: 'ui:modal:closed',
        PROGRESS_UPDATED: 'ui:progress:updated',
        
        // Eventos de configuração
        CONFIG_CHANGED: 'config:changed',
        CONFIG_SAVED: 'config:saved',
        CONFIG_LOADED: 'config:loaded',
        
        // Eventos de arquivo
        FILE_SELECTED: 'file:selected',
        FILE_UPLOADED: 'file:uploaded',
        FILE_PROCESSED: 'file:processed',
        
        // Eventos de exportação
        EXPORT_STARTED: 'export:started',
        EXPORT_COMPLETED: 'export:completed',
        EXPORT_ERROR: 'export:error'
    },

    // Configurações DIFAL
    DIFAL: {
        // Percentuais por ano (EC 87/2015)
        PERCENTUAL_DESTINATARIO: {
            2016: 40,
            2017: 60, 
            2018: 80,
            2019: 100,
            2020: 100,
            2021: 100,
            2022: 100,
            2023: 100,
            2024: 100,
            2025: 100
        },
        
        // Metodologias de cálculo
        METODOLOGIAS: {
            AUTO: 'auto',
            BASE_UNICA: 'base-unica', 
            BASE_DUPLA: 'base-dupla'
        },

        // Alíquotas padrão FCP por UF
        FCP_DEFAULT: {
            'AC': 0,    // Acre
            'AL': 0,    // Alagoas  
            'AP': 0,    // Amapá
            'AM': 0,    // Amazonas
            'BA': 2,    // Bahia
            'CE': 2,    // Ceará
            'DF': 0,    // Distrito Federal
            'ES': 1,    // Espírito Santo
            'GO': 0,    // Goiás
            'MA': 2,    // Maranhão
            'MT': 0,    // Mato Grosso
            'MS': 0,    // Mato Grosso do Sul
            'MG': 0,    // Minas Gerais
            'PA': 2,    // Pará
            'PB': 2,    // Paraíba
            'PR': 0,    // Paraná
            'PE': 2,    // Pernambuco
            'PI': 2,    // Piauí
            'RJ': 2,    // Rio de Janeiro
            'RN': 2,    // Rio Grande do Norte
            'RS': 0,    // Rio Grande do Sul
            'RO': 0,    // Rondônia
            'RR': 0,    // Roraima
            'SC': 0,    // Santa Catarina
            'SP': 0,    // São Paulo
            'SE': 2,    // Sergipe
            'TO': 0     // Tocantins
        },

        // Alíquotas interestaduais padrão ICMS  
        ALIQUOTAS_INTERESTADUAIS: {
            DEFAULT: 12,
            SUL_SUDESTE_PARA_NORTE_NORDESTE: 7,
            CONTRIBUINTE_PARA_NAO_CONTRIBUINTE: 12
        }
    },

    // CFOPs relevantes para DIFAL
    CFOPS: {
        // CFOPs de entrada para uso/consumo
        USO_CONSUMO: [
            1124, // Industrialização efetuada por terceiros
            1152, // Transferência de mercadoria adquirida ou recebida de terceiros
            1407, // Compra de mercadoria sujeita ao regime de substituição tributária
            1556, // Compra de material para uso ou consumo
            2124, // Industrialização efetuada por terceiros (interestadual)
            2152, // Transferência de mercadoria adquirida ou recebida de terceiros (interestadual)
            2407, // Compra de mercadoria sujeita ao regime de substituição tributária (interestadual)  
            2556  // Compra de material para uso ou consumo (interestadual)
        ],

        // CFOPs de entrada para ativo imobilizado
        ATIVO_IMOBILIZADO: [
            1551, // Compra de bem para o ativo imobilizado
            2551  // Compra de bem para o ativo imobilizado (interestadual)
        ]
    },

    // Configurações de UI
    UI: {
        // Cores do tema
        COLORS: {
            PRIMARY: '#4F46E5',
            SECONDARY: '#6B7280', 
            SUCCESS: '#10B981',
            WARNING: '#F59E0B',
            ERROR: '#EF4444',
            INFO: '#3B82F6'
        },

        // Tamanhos de página para tabelas
        PAGE_SIZES: [10, 25, 50, 100, 500],
        DEFAULT_PAGE_SIZE: 25,

        // Timeouts em milissegundos
        TIMEOUTS: {
            TOAST: 5000,
            PROGRESS: 1000,
            AUTOSAVE: 2000
        }
    },

    // Configurações de arquivo
    FILE: {
        // Tamanhos máximos em bytes
        MAX_SIZE: 50 * 1024 * 1024, // 50MB
        MAX_LINES: 1000000, // 1M linhas
        
        // Extensões permitidas
        ALLOWED_EXTENSIONS: ['.txt'],
        
        // Encoding
        ENCODING: 'utf-8'
    },

    // Configurações de localStorage
    STORAGE: {
        KEYS: {
            CONFIGS: 'difal_item_configs',
            SETTINGS: 'difal_settings', 
            CACHE: 'difal_cache',
            SESSION: 'difal_session'
        },
        
        // Tempo de expiração do cache (ms)
        CACHE_TTL: 24 * 60 * 60 * 1000 // 24 horas
    },

    // Mensagens padrão
    MESSAGES: {
        SUCCESS: {
            FILE_LOADED: 'Arquivo SPED carregado com sucesso!',
            CALCULATION_COMPLETED: 'Cálculo DIFAL concluído com sucesso!',
            EXPORT_COMPLETED: 'Arquivo exportado com sucesso!',
            CONFIG_SAVED: 'Configurações salvas com sucesso!'
        },
        
        ERROR: {
            FILE_INVALID: 'Arquivo inválido ou corrompido',
            CALCULATION_FAILED: 'Erro durante o cálculo do DIFAL',
            EXPORT_FAILED: 'Erro durante a exportação',
            NETWORK_ERROR: 'Erro de conexão',
            GENERIC: 'Ocorreu um erro inesperado'
        },

        WARNING: {
            NO_DATA: 'Nenhum dado disponível',
            UNSAVED_CHANGES: 'Você possui alterações não salvas',
            OVERWRITE: 'Esta ação irá sobrescrever dados existentes'
        },

        INFO: {
            PROCESSING: 'Processando dados...',
            LOADING: 'Carregando...',
            SAVING: 'Salvando configurações...'
        }
    },

    // Expressões regulares úteis
    REGEX: {
        CNPJ: /^\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}$|^\d{14}$/,
        CPF: /^\d{3}\.\d{3}\.\d{3}\-\d{2}$|^\d{11}$/,
        NCM: /^\d{8}$/,
        CFOP: /^\d{4}$/,
        UF: /^[A-Z]{2}$/,
        NUMERIC: /^[0-9]+(\.[0-9]+)?$/,
        PERCENTAGE: /^(100(\.0+)?|[0-9]{1,2}(\.[0-9]+)?)$/
    },

    // Formatação
    FORMAT: {
        CURRENCY: {
            locale: 'pt-BR',
            options: {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        },
        
        PERCENTAGE: {
            locale: 'pt-BR', 
            options: {
                style: 'percent',
                minimumFractionDigits: 2,
                maximumFractionDigits: 4
            }
        },

        NUMBER: {
            locale: 'pt-BR',
            options: {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        }
    }
};

// Freeze constants to prevent modification
Object.freeze(window.DIFAL_CONSTANTS.EVENTS);
Object.freeze(window.DIFAL_CONSTANTS.DIFAL);
Object.freeze(window.DIFAL_CONSTANTS.CFOPS);
Object.freeze(window.DIFAL_CONSTANTS.UI);
Object.freeze(window.DIFAL_CONSTANTS.FILE);
Object.freeze(window.DIFAL_CONSTANTS.STORAGE);
Object.freeze(window.DIFAL_CONSTANTS.MESSAGES);
Object.freeze(window.DIFAL_CONSTANTS.REGEX);
Object.freeze(window.DIFAL_CONSTANTS.FORMAT);
Object.freeze(window.DIFAL_CONSTANTS);

console.log('📋 DIFAL Constants loaded successfully');