/**
 * @fileoverview File Upload Manager - Módulo de gerenciamento de upload de arquivos SPED
 * @module FileUploadManager
 * @description Responsável por gerenciar upload de arquivos SPED incluindo drag & drop,
 * validação, parsing e integração com StateManager. Fornece feedback visual e
 * notificações via EventBus para uma experiência de usuário aprimorada.
 * 
 * @author Sistema DIFAL
 * @version 1.0.0
 * @since 2025-01-10
 */

/**
 * @class FileUploadManager
 * @classdesc Gerencia todas as operações de upload e processamento de arquivos SPED
 */
class FileUploadManager {
    /**
     * @constructor
     * @param {StateManager} stateManager - Instância do gerenciador de estado
     * @param {EventBus} eventBus - Instância do barramento de eventos
     */
    constructor(stateManager, eventBus) {
        // SINGLETON PATTERN: Garantir que apenas uma instância existe
        if (FileUploadManager.instance) {
            console.log('⚠️ FileUploadManager: Instância singleton já existe, retornando existente');
            return FileUploadManager.instance;
        }
        
        if (!stateManager) {
            throw new Error('FileUploadManager requer uma instância de StateManager');
        }
        
        this.stateManager = stateManager;
        this.eventBus = eventBus;
        
        // Configurações de upload
        this.config = {
            allowedExtensions: ['.txt'],
            maxFileSize: 100 * 1024 * 1024, // 100MB
            supportedEncodings: ['UTF-8', 'ISO-8859-1', 'WINDOWS-1252'],
            progressUpdateInterval: 100,
            chunkSize: 64 * 1024 // 64KB para processamento em chunks
        };
        
        // Estado interno
        this.currentFile = null;
        this.isProcessing = false;
        this.uploadStartTime = null;
        
        // Estado multi-períodos
        this.periodsManager = null;
        this.multiPeriodMode = false;
        
        this.init();
        
        // Armazenar referência singleton
        FileUploadManager.instance = this;
        console.log('🏗️ FileUploadManager: Nova instância singleton criada');
    }

    /**
     * Inicializa o File Upload Manager
     * @private
     */
    init() {
        this.setupEventListeners();
        this.setupFileUploadElements();
        this.checkDependencies();
        console.log('📂 FileUploadManager inicializado com sucesso');
    }

    /**
     * Configura listeners de eventos globais
     * @private
     */
    setupEventListeners() {
        // Listener para eventos do EventBus
        if (this.eventBus) {
            this.eventBus.on('FILE_UPLOAD_REQUESTED', (data) => {
                this.handleFileUploadRequest(data);
            });
            
            this.eventBus.on('FILE_CLEAR_REQUESTED', () => {
                this.clearCurrentFile();
            });
        }
    }

    /**
     * Configura elementos de upload de arquivo no DOM
     * @private
     */
    setupFileUploadElements() {
        const fileInput = document.getElementById('file-input');
        const dropZone = document.getElementById('drop-zone');
        
        if (fileInput) {
            this.setupFileInputListener(fileInput);
        }
        
        if (dropZone) {
            this.setupDropZone(dropZone);
        }
        
        console.log('📁 Elementos de upload configurados');
    }

    /**
     * Configura listener para input de arquivo
     * @private
     * @param {HTMLInputElement} fileInput - Elemento input de arquivo
     */
    setupFileInputListener(fileInput) {
        // Remover listeners anteriores para evitar duplicação
        fileInput.removeEventListener('change', this.handleFileInputChange);
        
        // Criar bound function para poder remover depois
        this.handleFileInputChange = (event) => {
            const files = event.target.files;
            if (files && files.length > 0) {
                // CORREÇÃO: Chamar UIManager.handleFileUpload() em vez do próprio
                if (window.uiManager && window.uiManager.handleFileUpload) {
                    window.uiManager.handleFileUpload(files[0]);
                } else {
                    console.warn('⚠️ UIManager não disponível, usando fallback');
                    this.handleFileUpload(files[0]);
                }
            }
        };
        
        // Adicionar o listener
        fileInput.addEventListener('change', this.handleFileInputChange);
    }

    /**
     * Configura zona de drag & drop
     * @private
     * @param {HTMLElement} dropZone - Elemento da zona de drop
     */
    setupDropZone(dropZone) {
        // Eventos de drag & drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        // Feedback visual para drag over
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('dragover');
                this.showDropZoneFeedback(true);
            }, false);
        });

        // Remover feedback visual
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('dragover');
                this.showDropZoneFeedback(false);
            }, false);
        });

        // Processar arquivo dropado
        dropZone.addEventListener('drop', (event) => {
            const files = event.dataTransfer.files;
            if (files && files.length > 0) {
                // CORREÇÃO: Chamar UIManager.handleFileUpload() em vez do próprio
                if (window.uiManager && window.uiManager.handleFileUpload) {
                    window.uiManager.handleFileUpload(files[0]);
                } else {
                    console.warn('⚠️ UIManager não disponível, usando fallback');
                    this.handleFileUpload(files[0]);
                }
            }
        });
    }

    /**
     * Previne comportamentos padrão dos eventos
     * @private
     * @param {Event} e - Evento
     */
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * Mostra feedback visual da zona de drop
     * @private
     * @param {boolean} show - Se deve mostrar o feedback
     */
    showDropZoneFeedback(show) {
        const dropZone = document.getElementById('drop-zone');
        if (!dropZone) return;
        
        if (show) {
            dropZone.setAttribute('data-drag-active', 'true');
        } else {
            dropZone.removeAttribute('data-drag-active');
        }
    }

    // ========== UPLOAD E PROCESSAMENTO ==========

    /**
     * Define PeriodsManager para modo multi-período (sem ativar automaticamente)
     * @param {PeriodsManager} periodsManager - Instância do PeriodsManager
     */
    setPeriodsManager(periodsManager) {
        this.periodsManager = periodsManager;
        // NÃO ativar automaticamente multiPeriodMode - deve ser controlado pelo usuário
        console.log('📅 PeriodsManager configurado (modo controlado pelo usuário)');
    }

    /**
     * Define modo de processamento baseado na seleção do usuário
     * @param {string} mode - 'single' ou 'multiple'
     */
    setProcessingMode(mode) {
        const isMultiple = mode === 'multiple';
        this.multiPeriodMode = isMultiple;
        console.log(`🔧 Modo de processamento definido: ${mode} (multiPeriodMode: ${this.multiPeriodMode})`);
    }

    /**
     * Obtém modo selecionado pelo usuário na interface
     * @returns {string} 'single' ou 'multiple'
     */
    getUserSelectedMode() {
        const selectedRadio = document.querySelector('input[name="processing-mode"]:checked');
        return selectedRadio ? selectedRadio.value : 'single';
    }

    /**
     * Processa upload de arquivo SPED
     * @public
     * @param {File} file - Arquivo para upload
     * @returns {Promise<Object>} Dados processados do arquivo
     * @throws {Error} Se arquivo inválido ou erro no processamento
     */
    async handleFileUpload(file) {
        // Verificação robusta de processamento com debouncing
        if (this.isProcessing) {
            console.warn('⚠️ Upload bloqueado - processamento já em andamento');
            this.notifyError('Upload já em andamento. Aguarde a conclusão.');
            return;
        }
        
        // Debouncing: evitar uploads múltiplos em sequência rápida  
        const now = Date.now();
        if (this.uploadStartTime && (now - this.uploadStartTime) < 2000) {
            console.warn('⚠️ Upload bloqueado - debouncing de 2 segundos');
            this.notifyError('Aguarde um momento antes de fazer outro upload.');
            return;
        }

        // Configurar modo baseado na seleção do usuário
        const userMode = this.getUserSelectedMode();
        this.setProcessingMode(userMode);
        
        // Marcar como processando APÓS validações iniciais
        this.uploadStartTime = now;
        this.isProcessing = true;
        this.currentFile = file;

        try {
            console.log('📁 Iniciando upload do arquivo:', file.name);
            
            // Validar arquivo
            this.validateFile(file);
            
            // Mostrar informações do arquivo
            this.showFileInfo(file);
            
            // Notificar início
            this.notifyProgress('Iniciando processamento...', 5);
            this.eventBus?.emit('FILE_UPLOAD_STARTED', {
                fileName: file.name,
                fileSize: file.size,
                timestamp: this.uploadStartTime
            });
            
            // Processar arquivo com SpedParser - COM PROTEÇÃO ROBUSTA
            let resultado;
            try {
                resultado = await this.processFileWithParser(file);
            } catch (parserError) {
                console.error('❌ Erro específico no parser:', parserError);
                // Garantir que a exceção do parser não quebra o fluxo
                throw new Error(`Erro no processamento SPED: ${parserError.message || parserError}`);
            }
            
            // Validar resultado básico
            if (!resultado) {
                throw new Error('Parser não retornou dados válidos');
            }
            
            // Armazenar dados
            try {
                if (this.multiPeriodMode && this.periodsManager) {
                    // Modo multi-período: adicionar ao PeriodsManager
                    const addResult = await this.periodsManager.addPeriod(resultado);
                    if (!addResult.success) {
                        throw new Error(addResult.error);
                    }
                    console.log('📅 Período adicionado ao PeriodsManager:', addResult.periodLabel);
                } else {
                    // Modo único: armazenar no StateManager
                    this.stateManager.setSpedData(resultado);
                    console.log('✅ Dados SPED armazenados no StateManager');
                }
            } catch (stateError) {
                console.error('❌ Erro ao armazenar dados:', stateError);
                throw new Error(`Erro ao armazenar dados: ${stateError.message}`);
            }
            
            // Atualizar informações do arquivo com dados do SPED processados
            this.showFileInfo(file, resultado);
            
            // Notificar sucesso
            const processingTime = Date.now() - this.uploadStartTime;
            this.notifyProgress('Arquivo processado com sucesso!', 100);
            this.notifyUploadSuccess(file, resultado, processingTime);
            
            console.log(`✅ Upload concluído em ${processingTime}ms:`, resultado);
            
            return resultado;
            
        } catch (error) {
            console.error('❌ Erro no upload do arquivo:', error);
            this.notifyError(`Erro ao processar arquivo: ${error.message || error}`);
            
            // Re-throw para manter compatibilidade
            throw error;
        } finally {
            // GARANTIA ABSOLUTA: sempre resetar flag de processamento
            this.isProcessing = false;
            console.log('🔄 Flag isProcessing resetada para false');
            
            // Emitir evento de conclusão
            this.eventBus?.emit('FILE_UPLOAD_COMPLETED', {
                fileName: file?.name || 'unknown',
                success: !this.isProcessing, // sempre true aqui
                timestamp: Date.now()
            });
        }
    }

    /**
     * Valida arquivo antes do upload
     * @private
     * @param {File} file - Arquivo para validação
     * @throws {Error} Se arquivo inválido
     */
    validateFile(file) {
        // Verificar extensão
        const fileName = file.name.toLowerCase();
        const isValidExtension = this.config.allowedExtensions.some(ext => 
            fileName.endsWith(ext)
        );
        
        if (!isValidExtension) {
            throw new Error(`Arquivo deve ter uma das extensões: ${this.config.allowedExtensions.join(', ')}`);
        }
        
        // Verificar tamanho
        if (file.size > this.config.maxFileSize) {
            const maxSizeMB = this.config.maxFileSize / (1024 * 1024);
            throw new Error(`Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`);
        }
        
        // Verificar se arquivo não está vazio
        if (file.size === 0) {
            throw new Error('Arquivo está vazio');
        }
        
        console.log('✅ Arquivo validado:', {
            name: file.name,
            size: `${(file.size / 1024).toFixed(2)} KB`,
            type: file.type || 'text/plain'
        });
    }

    /**
     * Processa arquivo com SpedParser
     * @private
     * @param {File} file - Arquivo para processamento
     * @returns {Promise<Object>} Dados processados
     */
    async processFileWithParser(file) {
        if (!window.SpedParser && !window.SpedParserModular) {
            throw new Error('SpedParser não está disponível. Verifique se o módulo foi carregado.');
        }
        
        // Usar SpedParserModular se disponível, senão usar SpedParser
        const ParserClass = window.SpedParserModular || window.SpedParser;
        const parser = new ParserClass(this.eventBus, this.stateManager);
        
        // Configurar callback de progresso se suportado
        if (parser.setProgressCallback) {
            parser.setProgressCallback((progress, message) => {
                this.notifyProgress(message, progress);
            });
        }
        
        this.notifyProgress('Analisando registros SPED...', 20);
        
        const resultado = await parser.processarArquivo(file);
        
        // Validar resultado
        if (!resultado || !resultado.itensDifal) {
            throw new Error('Arquivo SPED processado mas não contém dados válidos para DIFAL');
        }
        
        this.notifyProgress('Extraindo itens DIFAL...', 80);
        
        // Adicionar metadados do processamento
        resultado.metadata = {
            fileName: file.name,
            fileSize: file.size,
            processedAt: new Date().toISOString(),
            processingTime: Date.now() - this.uploadStartTime,
            parser: ParserClass.name
        };
        
        return resultado;
    }

    /**
     * Exibe informações do período e do arquivo SPED
     * @private
     * @param {File} file - Arquivo selecionado
     * @param {Object} [spedData] - Dados processados do SPED (se disponível)
     */
    showFileInfo(file, spedData = null) {
        const fileInfo = document.getElementById('file-info');
        const fileDetails = document.getElementById('file-details');
        
        if (!fileInfo || !fileDetails) return;
        
        const fileSizeFormatted = this.formatFileSize(file.size);
        
        // Se temos dados do SPED, priorizar informações do período
        if (spedData && spedData.empresa) {
            const empresa = spedData.empresa;
            const periodoInicial = empresa.DT_INI ? this.formatDate(empresa.DT_INI) : '-';
            const periodoFinal = empresa.DT_FIN ? this.formatDate(empresa.DT_FIN) : '-';
            const periodoFormatado = (periodoInicial !== '-' && periodoFinal !== '-') 
                ? `${periodoInicial} a ${periodoFinal}` 
                : `${periodoInicial}${periodoFinal !== '-' ? ' a ' + periodoFinal : ''}`;
            
            fileDetails.innerHTML = `
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="summary-value">${periodoFormatado}</div>
                        <div class="summary-label">📅 Período de Apuração</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${empresa.NOME || 'Nome não informado'}</div>
                        <div class="summary-label">🏢 Empresa</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${empresa.CNPJ || 'CNPJ não informado'}</div>
                        <div class="summary-label">🆔 CNPJ</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${fileSizeFormatted}</div>
                        <div class="summary-label">📁 Tamanho do Arquivo</div>
                    </div>
                </div>
            `;
        } else {
            // Fallback para quando ainda não temos dados do SPED
            const lastModifiedFormatted = new Date(file.lastModified).toLocaleString('pt-BR');
            
            fileDetails.innerHTML = `
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="summary-value">Processando...</div>
                        <div class="summary-label">📅 Período de Apuração</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${file.name}</div>
                        <div class="summary-label">📁 Nome do Arquivo</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${fileSizeFormatted}</div>
                        <div class="summary-label">📏 Tamanho</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${lastModifiedFormatted}</div>
                        <div class="summary-label">🕒 Última Modificação</div>
                    </div>
                </div>
            `;
        }
        
        fileInfo.classList.remove('hidden');
        console.log('📋 Informações do período exibidas');
    }
    
    /**
     * Formatar data para exibição
     * @private
     * @param {string} dateString - Data no formato DDMMAAAA
     * @returns {string} - Data formatada DD/MM/AAAA
     */
    formatDate(dateString) {
        if (!dateString || dateString.length !== 8) return '-';
        
        const day = dateString.substring(0, 2);
        const month = dateString.substring(2, 4);
        const year = dateString.substring(4, 8);
        
        return `${day}/${month}/${year}`;
    }

    // ========== NOTIFICAÇÕES E FEEDBACK ==========

    /**
     * Notifica progresso do upload
     * @private
     * @param {string} message - Mensagem de status
     * @param {number} percentage - Progresso em porcentagem (0-100)
     */
    notifyProgress(message, percentage) {
        // Atualizar UI de progresso
        const progressSection = document.getElementById('progress-section');
        const progressBar = document.getElementById('progress-bar');
        const statusMessage = document.getElementById('status-message');
        
        if (progressSection) {
            progressSection.classList.remove('hidden');
        }
        
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
            progressBar.textContent = `${Math.round(percentage)}%`;
        }
        
        if (statusMessage) {
            statusMessage.textContent = message;
            statusMessage.className = 'status-message';
        }
        
        // Notificar via EventBus
        this.eventBus?.emit('UPLOAD_PROGRESS', {
            message,
            percentage,
            timestamp: Date.now()
        });
        
        console.log(`📊 Progresso: ${percentage}% - ${message}`);
    }

    /**
     * Notifica sucesso no upload
     * @private
     * @param {File} file - Arquivo processado
     * @param {Object} resultado - Dados processados
     * @param {number} processingTime - Tempo de processamento em ms
     */
    notifyUploadSuccess(file, resultado, processingTime) {
        const message = `Arquivo "${file.name}" processado com sucesso!`;
        const stats = {
            fileName: file.name,
            fileSize: file.size,
            totalItens: resultado.itensDifal?.length || 0,
            empresa: resultado.dadosEmpresa?.razaoSocial || 'N/A',
            processingTime: `${(processingTime / 1000).toFixed(2)}s`
        };
        
        console.log('✅ Upload realizado com sucesso:', stats);
        
        // Notificar via EventBus
        this.eventBus?.emit('UPLOAD_SUCCESS', {
            file,
            resultado,
            stats,
            timestamp: Date.now()
        });
        
        // Notificar UI se disponível
        if (window.uiManager && window.uiManager.showSuccess) {
            window.uiManager.showSuccess(message);
        }
    }

    /**
     * Notifica erro no upload
     * @private
     * @param {string} errorMessage - Mensagem de erro
     */
    notifyError(errorMessage) {
        const fullMessage = `Erro no upload: ${errorMessage}`;
        
        // Atualizar UI de status
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.textContent = fullMessage;
            statusMessage.className = 'status-message error';
        }
        
        console.error('❌ Erro no upload:', errorMessage);
        
        // Notificar via EventBus
        this.eventBus?.emit('UPLOAD_ERROR', {
            message: errorMessage,
            timestamp: Date.now(),
            file: this.currentFile?.name
        });
        
        // Mostrar erro na UI
        if (window.uiManager && window.uiManager.showError) {
            window.uiManager.showError(fullMessage);
        } else {
            alert(fullMessage);
        }
    }

    // ========== MÉTODOS UTILITÁRIOS ==========

    /**
     * Formata tamanho do arquivo
     * @private
     * @param {number} bytes - Tamanho em bytes
     * @returns {string} Tamanho formatado
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Verifica dependências necessárias
     * @private
     * @returns {Object} Status das dependências
     */
    checkDependencies() {
        const dependencies = {
            spedParser: !!(window.SpedParser || window.SpedParserModular),
            utils: !!window.Utils,
            stateManager: !!this.stateManager,
            eventBus: !!this.eventBus
        };
        
        console.log('📋 Dependências do FileUploadManager:', dependencies);
        
        const missingDeps = Object.entries(dependencies)
            .filter(([key, value]) => !value)
            .map(([key]) => key);
            
        if (missingDeps.length > 0) {
            console.warn('⚠️ Dependências ausentes:', missingDeps);
        }
        
        return dependencies;
    }

    /**
     * Limpa arquivo atual
     * @public
     */
    clearCurrentFile() {
        console.log('🧹 Iniciando limpeza completa do arquivo atual');
        
        // Reset de estado SEMPRE
        this.currentFile = null;
        this.isProcessing = false;
        this.uploadStartTime = null;
        
        // Limpar UI
        const fileInfo = document.getElementById('file-info');
        const progressSection = document.getElementById('progress-section');
        const fileInput = document.getElementById('file-input');
        const statusMessage = document.getElementById('status-message');
        
        if (fileInfo) {
            fileInfo.classList.add('hidden');
        }
        
        if (progressSection) {
            progressSection.classList.add('hidden');
        }
        
        if (fileInput) {
            fileInput.value = '';
        }
        
        // Limpar mensagens de status
        if (statusMessage) {
            statusMessage.textContent = '';
            statusMessage.className = 'status-message';
        }
        
        console.log('🧹 Arquivo atual limpo - isProcessing resetado para false');
        
        this.eventBus?.emit('FILE_CLEARED', { 
            timestamp: Date.now(),
            processingReset: true
        });
    }

    /**
     * Trata requisição de upload via EventBus
     * @private
     * @param {Object} data - Dados da requisição
     */
    async handleFileUploadRequest(data) {
        if (data && data.file) {
            try {
                await this.handleFileUpload(data.file);
            } catch (error) {
                console.error('❌ Erro ao processar requisição de upload:', error);
            }
        }
    }

    /**
     * Obtém status atual do manager
     * @public
     * @returns {Object} Status atual
     */
    getStatus() {
        return {
            isProcessing: this.isProcessing,
            hasFile: !!this.currentFile,
            currentFile: this.currentFile ? {
                name: this.currentFile.name,
                size: this.currentFile.size,
                type: this.currentFile.type
            } : null,
            config: this.config,
            uploadStartTime: this.uploadStartTime
        };
    }

    /**
     * Obtém estatísticas do manager
     * @public
     * @returns {Object} Estatísticas
     */
    getStatistics() {
        return {
            isInitialized: true,
            dependencies: this.checkDependencies(),
            currentFile: this.currentFile?.name || null,
            isProcessing: this.isProcessing,
            supportedExtensions: this.config.allowedExtensions,
            maxFileSize: this.formatFileSize(this.config.maxFileSize)
        };
    }

    /**
     * Força reset do estado de processamento (método de emergência)
     * @public
     * @returns {boolean} Se o reset foi realizado
     */
    forceResetProcessingState() {
        const wasProcessing = this.isProcessing;
        
        // Reset forçado
        this.isProcessing = false;
        this.currentFile = null;
        this.uploadStartTime = null;
        
        console.log('🚨 RESET FORÇADO do estado de processamento:', {
            wasProcessing,
            nowProcessing: this.isProcessing,
            timestamp: new Date().toISOString()
        });
        
        // Emitir evento de reset
        this.eventBus?.emit('PROCESSING_STATE_RESET', {
            wasProcessing,
            timestamp: Date.now()
        });
        
        return wasProcessing;
    }
}

// ========== EXPORTAÇÃO DO MÓDULO ==========

// Registrar globalmente
if (typeof window !== 'undefined') {
    window.FileUploadManager = FileUploadManager;
    
    // Função global de emergência para reset do estado de upload
    window.resetUploadState = function() {
        console.log('🚨 Reset de emergência solicitado pelo usuário');
        
        if (window.uiManager && window.uiManager.fileUploadManager) {
            const wasReset = window.uiManager.fileUploadManager.forceResetProcessingState();
            if (wasReset) {
                alert('✅ Estado de upload resetado com sucesso! Tente fazer upload novamente.');
            } else {
                alert('ℹ️ Estado de upload já estava normal.');
            }
            return wasReset;
        } else {
            console.error('❌ FileUploadManager não encontrado');
            alert('❌ Não foi possível resetar o estado. Recarregue a página.');
            return false;
        }
    };
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileUploadManager;
}