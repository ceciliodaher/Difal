/**
 * UI Manager - Gerenciamento da interface do usuário
 * Controla navegação, feedback, logs e interações
 */

class UIManager {
    constructor() {
        this.currentSection = 'upload-section';
        this.progressCallback = null;
        this.statusCallback = null;
        
        this.init();
    }

    /**
     * Inicializa o gerenciador de interface
     */
    init() {
        this.setupEventListeners();
        this.setupFileUpload();
        this.setupNavigation();
        this.showSection('upload-section');
        
        console.log('UI Manager inicializado');
        
        // Configurar modal e expor funções globais
        this.setupModalFunctions();
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Proceed to calculation
        const proceedBtn = document.getElementById('proceed-calculation');
        if (proceedBtn) {
            proceedBtn.addEventListener('click', () => this.proceedToCalculation());
        }

        // Calculate DIFAL
        const calculateBtn = document.getElementById('calculate-difal');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => this.calculateDifal());
        }

        // Export buttons
        const exportExcel = document.getElementById('export-excel');
        if (exportExcel) {
            exportExcel.addEventListener('click', () => this.exportToExcel());
        }

        const exportPdf = document.getElementById('export-pdf');
        if (exportPdf) {
            exportPdf.addEventListener('click', () => this.exportToPdf());
        }
    }

    /**
     * Configura upload de arquivos
     */
    setupFileUpload() {
        const fileInput = document.getElementById('file-input');
        const dropZone = document.getElementById('drop-zone');

        if (fileInput) {
            fileInput.addEventListener('change', (event) => {
                const files = event.target.files;
                if (files.length > 0) {
                    this.handleFileUpload(files[0]);
                }
            });
        }

        if (dropZone) {
            // Drag and drop events
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, this.preventDefaults, false);
                document.body.addEventListener(eventName, this.preventDefaults, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
            });

            dropZone.addEventListener('drop', (event) => {
                const files = event.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFileUpload(files[0]);
                }
            });
        }
    }

    /**
     * Previne comportamentos padrão dos eventos
     * @param {Event} e 
     */
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * Configura navegação entre seções
     */
    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.getAttribute('data-section');
                this.showSection(section);
            });
        });
    }



    /**
     * Mostra seção específica
     * @param {string} sectionId 
     */
    showSection(sectionId) {
        // Esconder todas as seções
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Mostrar seção especificada
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionId;
        }

        // Atualizar botões de navegação
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-section') === sectionId) {
                btn.classList.add('active');
            }
        });

        // Debug: verificar se seção tem conteúdo
        if (sectionId === 'analysis-section') {
            const summaryDiv = document.getElementById('sped-summary');
            console.log('Analysis section - summary div:', summaryDiv, 'innerHTML length:', summaryDiv?.innerHTML.length);
        }
    }

    /**
     * Processa upload de arquivo SPED
     * @param {File} file 
     */
    async handleFileUpload(file) {
        if (!file.name.toLowerCase().endsWith('.txt')) {
            this.showError('Por favor, selecione um arquivo .txt (SPED)');
            return;
        }

        this.showProgress('Processando arquivo SPED...', 10);
        
        try {
            // Mostrar informações do arquivo
            this.showFileInfo(file);
            
            // Processar com SpedParser
            if (!window.SpedParser) {
                throw new Error('SpedParser não disponível');
            }

            const parser = new window.SpedParser();
            this.showProgress('Analisando registros SPED...', 30);
            
            const resultado = await parser.processarArquivo(file);
            
            this.showProgress('Extraindo itens DIFAL...', 60);
            
            // Armazenar dados globalmente
            window.spedData = resultado;
            
            this.showProgress('Processamento concluído!', 100);
            
            // Mostrar análise
            this.showSpedAnalysis(resultado);
            this.showSection('analysis-section');
            
        } catch (error) {
            console.error('Erro ao processar arquivo:', error);
            this.showError(`Erro ao processar arquivo: ${error.message}`);
        }
    }

    /**
     * Mostra informações do arquivo selecionado
     * @param {File} file 
     */
    showFileInfo(file) {
        const fileInfo = document.getElementById('file-info');
        const fileDetails = document.getElementById('file-details');
        
        if (fileInfo && fileDetails) {
            fileDetails.innerHTML = `
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="summary-value">${file.name}</div>
                        <div class="summary-label">Nome do Arquivo</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${Utils.formatarNumero(file.size)} bytes</div>
                        <div class="summary-label">Tamanho</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${new Date(file.lastModified).toLocaleDateString('pt-BR')}</div>
                        <div class="summary-label">Última Modificação</div>
                    </div>
                </div>
            `;
            fileInfo.classList.remove('hidden');
        }
    }

    /**
     * Mostra análise dos dados SPED
     * @param {Object} spedData 
     */
    showSpedAnalysis(spedData) {
        const summaryDiv = document.getElementById('sped-summary');
        const tableDiv = document.getElementById('difal-items-table');
        
        if (summaryDiv) {
            const stats = spedData.estatisticasDifal || {};
            summaryDiv.innerHTML = `
                <div class="summary-item">
                    <h3>Arquivo Processado</h3>
                    <div class="summary-value">${spedData.fileName}</div>
                    <div class="summary-label">Arquivo SPED</div>
                </div>
                <div class="summary-item">
                    <h3>Empresa</h3>
                    <div class="summary-value">${spedData.headerInfo.nomeEmpresa}</div>
                    <div class="summary-label">CNPJ: ${Utils.formatarCNPJ(spedData.headerInfo.cnpj)}</div>
                </div>
                <div class="summary-item">
                    <h3>Período</h3>
                    <div class="summary-value">${spedData.headerInfo.periodo}</div>
                    <div class="summary-label">UF: ${spedData.headerInfo.uf}</div>
                </div>
                <div class="summary-item">
                    <h3>Registros Totais</h3>
                    <div class="summary-value">${Utils.formatarNumero(spedData.totalRegistros)}</div>
                    <div class="summary-label">${spedData.tiposRegistros.length} tipos</div>
                </div>
                <div class="summary-item">
                    <h3>Itens DIFAL</h3>
                    <div class="summary-value">${Utils.formatarNumero(stats.totalItens || 0)}</div>
                    <div class="summary-label">CFOPs DIFAL identificados</div>
                </div>
                <div class="summary-item">
                    <h3>Valor Total</h3>
                    <div class="summary-value">${Utils.formatarMoeda(stats.estatisticasValores?.totalValorItem || 0)}</div>
                    <div class="summary-label">Base para cálculo DIFAL</div>
                </div>
            `;
        }
        
        if (tableDiv && spedData.itensDifal && spedData.itensDifal.length > 0) {
            this.createDifalTable(tableDiv, spedData.itensDifal.slice(0, 10)); // Mostrar apenas 10 primeiros
        }
    }

    /**
     * Cria tabela de itens DIFAL
     * @param {HTMLElement} container 
     * @param {Array} items 
     */
    createDifalTable(container, items) {
        const table = document.createElement('table');
        table.className = 'data-table';
        
        // Cabeçalho
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Código Item</th>
                    <th>Descrição</th>
                    <th>CFOP</th>
                    <th>Destinação</th>
                    <th>CST</th>
                    <th>Benefícios Fiscais</th>
                    <th>NCM</th>
                    <th>Valor Item</th>
                    <th>Base DIFAL</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                    <tr>
                        <td class="font-mono">${item.codItem}</td>
                        <td title="${this.formatarDescricaoCompleta(item)}">${this.formatarDescricaoExibicao(item, 30)}</td>
                        <td class="font-mono">${item.cfop}</td>
                        <td>
                            <span class="badge ${item.destinacao === 'uso-consumo' ? 'badge-blue' : 'badge-green'}">
                                ${item.destinacao === 'uso-consumo' ? 'Uso e Consumo' : 'Ativo Imobilizado'}
                            </span>
                        </td>
                        <td class="font-mono text-center">${item.cstIcms || 'N/A'}</td>
                        <td>
                            ${item.beneficiosFiscais ? `
                                <div class="beneficios-fiscais">
                                    <span class="badge ${item.beneficiosFiscais.temBeneficio ? 'badge-orange' : 'badge-gray'}">
                                        ${item.beneficiosFiscais.temBeneficio ? 'COM BENEFÍCIO' : 'NORMAL'}
                                    </span>
                                    <div class="text-xs text-gray-600 mt-1">${Utils.truncarTexto(item.beneficiosFiscais.descricao, 25)}</div>
                                    ${item.beneficiosFiscais.percentualReducao > 0 ? `<div class="text-xs font-medium">Redução: ${item.beneficiosFiscais.percentualReducao}%</div>` : ''}
                                </div>
                            ` : 'N/A'}
                        </td>
                        <td class="font-mono">${item.ncm || 'N/A'}</td>
                        <td class="text-right">${Utils.formatarMoeda(item.vlItem)}</td>
                        <td class="text-right font-bold">${Utils.formatarMoeda(item.baseCalculoDifal)}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        
        container.innerHTML = '';
        container.appendChild(table);
        
        // Adicionar badge CSS se não existe
        if (!document.querySelector('#badge-styles')) {
            const style = document.createElement('style');
            style.id = 'badge-styles';
            style.textContent = `
                .badge {
                    display: inline-block;
                    padding: 0.25rem 0.5rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                    border-radius: 0.375rem;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                }
                .badge-blue { background: #dbeafe; color: #1e40af; }
                .badge-green { background: #dcfce7; color: #166534; }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Prossegue para cálculo DIFAL
     */
    proceedToCalculation() {
        if (!window.spedData || !window.spedData.itensDifal || window.spedData.itensDifal.length === 0) {
            this.showError('Nenhum item DIFAL encontrado para calcular');
            return;
        }
        
        this.showSection('calculation-section');
        
        // Atualizar informações da empresa na seção de cálculo
        this.updateCompanyInfo();
    }

    /**
     * Atualiza informações da empresa na seção de cálculo
     */
    updateCompanyInfo() {
        if (!window.spedData || !window.spedData.headerInfo) return;
        
        const companyUf = document.getElementById('company-uf');
        const companyName = document.getElementById('company-name');
        
        if (companyUf) {
            companyUf.textContent = window.spedData.headerInfo.uf || '-';
        }
        
        if (companyName) {
            const name = window.spedData.headerInfo.nomeEmpresa || '-';
            companyName.textContent = Utils.truncarTexto(name, 40);
        }
    }

    /**
     * Executa cálculo DIFAL
     */
    async calculateDifal() {
        if (!window.spedData || !window.spedData.itensDifal) {
            this.showError('Dados SPED não disponíveis');
            return;
        }

        if (!window.spedData.headerInfo.uf) {
            this.showError('UF da empresa não identificada no SPED');
            return;
        }

        const ufDestino = window.spedData.headerInfo.uf; // UF da empresa
        console.log(`Calculando DIFAL para empresa em ${ufDestino}`);
        
        this.showProgress('Calculando DIFAL...', 20);
        
        try {
            // Inicializar calculadora
            if (!window.DifalCalculator) {
                throw new Error('DifalCalculator não disponível');
            }
            
            const calculator = new window.DifalCalculator();
            // Para CFOPs interestaduais (2551, 2556), usamos uma UF origem genérica
            calculator.configurarUFs('OUT', ufDestino); // OUT = origem interestadual
            
            // Configurar benefícios se existirem
            if (window.difalConfiguracoes) {
                calculator.configurarBeneficios(window.difalConfiguracoes);
            }
            
            calculator.carregarItens(window.spedData.itensDifal);
            
            this.showProgress('Processando cálculos...', 60);
            
            const resultados = calculator.calcularTodos();
            const totalizadores = calculator.obterTotalizadores();
            
            this.showProgress('Cálculo concluído!', 100);
            
            // Armazenar resultados
            window.difalResults = {
                resultados,
                totalizadores,
                calculator
            };
            
            // Mostrar resultados
            this.showCalculationResults(resultados, totalizadores);
            
        } catch (error) {
            console.error('Erro no cálculo DIFAL:', error);
            this.showError(`Erro no cálculo: ${error.message}`);
        }
    }

    /**
     * Mostra resultados do cálculo
     * @param {Array} resultados 
     * @param {Object} totalizadores 
     */
    showCalculationResults(resultados, totalizadores) {
        const resultsDiv = document.getElementById('calculation-results');
        const summaryDiv = document.getElementById('results-summary');
        const detailDiv = document.getElementById('results-detail');
        
        if (resultsDiv) {
            resultsDiv.classList.remove('hidden');
        }
        
        if (summaryDiv) {
            summaryDiv.innerHTML = `
                <div class="results-summary">
                    <div class="result-item">
                        <div class="result-value">${Utils.formatarNumero(totalizadores.totalItens)}</div>
                        <div class="result-label">Total de Itens</div>
                    </div>
                    <div class="result-item">
                        <div class="result-value">${Utils.formatarMoeda(totalizadores.totalBase)}</div>
                        <div class="result-label">Base Total</div>
                    </div>
                    <div class="result-item">
                        <div class="result-value">${Utils.formatarMoeda(totalizadores.totalDifal)}</div>
                        <div class="result-label">DIFAL Total</div>
                    </div>
                    <div class="result-item">
                        <div class="result-value">${Utils.formatarMoeda(totalizadores.totalFcp)}</div>
                        <div class="result-label">FCP Total</div>
                    </div>
                    <div class="result-item">
                        <div class="result-value">${Utils.formatarMoeda(totalizadores.totalRecolher)}</div>
                        <div class="result-label">Total a Recolher</div>
                    </div>
                    ${totalizadores.itensComBeneficio > 0 ? `
                    <div class="result-item">
                        <div class="result-value">${totalizadores.itensComBeneficio}</div>
                        <div class="result-label">Itens com Benefício</div>
                    </div>
                    ` : ''}
                    ${totalizadores.economiaTotal > 0 ? `
                    <div class="result-item">
                        <div class="result-value" style="color: #059669;">${Utils.formatarMoeda(totalizadores.economiaTotal)}</div>
                        <div class="result-label">💰 Economia Total</div>
                    </div>
                    ` : ''}
                </div>
            `;
        }
        
        if (detailDiv && resultados.length > 0) {
            // Mostrar apenas itens com DIFAL > 0
            const itensComDifal = resultados.filter(r => !r.erro && r.difal > 0).slice(0, 15);
            
            if (itensComDifal.length > 0) {
                this.createResultsTable(detailDiv, itensComDifal);
            } else {
                detailDiv.innerHTML = '<p class="text-center text-gray-600">Nenhum item com DIFAL a recolher</p>';
            }
        }
        
        // Usuário fica na tela de resultados para análise antes de exportar
        // this.showSection('reports-section');
    }

    /**
     * Cria tabela de resultados
     * @param {HTMLElement} container 
     * @param {Array} resultados 
     */
    createResultsTable(container, resultados) {
        const table = document.createElement('table');
        table.className = 'data-table';
        
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Item</th>
                    <th>CFOP</th>
                    <th>Base</th>
                    <th>Metodologia</th>
                    <th>DIFAL</th>
                    <th>FCP</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${resultados.map(resultado => `
                    <tr>
                        <td>
                            <div class="font-mono text-sm">${resultado.item.codItem}</div>
                            <div class="text-xs text-gray-600" title="${this.formatarDescricaoCompleta(resultado.item)}">${this.formatarDescricaoExibicao(resultado.item, 30)}</div>
                        </td>
                        <td class="font-mono">${resultado.item.cfop}</td>
                        <td class="text-right">${Utils.formatarMoeda(resultado.base)}</td>
                        <td class="text-center">
                            <span class="badge ${resultado.metodologia === 'base-unica' ? 'badge-blue' : 'badge-green'}">
                                ${resultado.metodologia === 'base-unica' ? 'Base Única' : 'Base Dupla'}
                            </span>
                        </td>
                        <td class="text-right">${Utils.formatarMoeda(resultado.difal)}</td>
                        <td class="text-right">${Utils.formatarMoeda(resultado.fcp)}</td>
                        <td class="text-right font-bold">${Utils.formatarMoeda(resultado.totalRecolher)}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        
        container.innerHTML = '';
        container.appendChild(table);
    }

    /**
     * Exporta para Excel
     */
    async exportToExcel() {
        if (!window.difalResults) {
            this.showError('Nenhum cálculo disponível para exportar');
            return;
        }
        
        
        try {
            const dadosExcel = window.difalResults.calculator.prepararDadosExcel();
            
            // Usar XlsxPopulate se disponível
            if (window.XlsxPopulate) {
                const workbook = await window.XlsxPopulate.fromBlankAsync();
                const sheet = workbook.sheet(0);
                
                // Adicionar cabeçalhos
                const headers = Object.keys(dadosExcel.dados[0] || {});
                headers.forEach((header, index) => {
                    sheet.cell(1, index + 1).value(header);
                });
                
                // Adicionar dados
                dadosExcel.dados.forEach((linha, rowIndex) => {
                    headers.forEach((header, colIndex) => {
                        sheet.cell(rowIndex + 2, colIndex + 1).value(linha[header]);
                    });
                });
                
                const data = await workbook.outputAsync();
                const blob = new Blob([data], { 
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
                });
                
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `DIFAL_${dadosExcel.configuracao.ufOrigem}_${dadosExcel.configuracao.ufDestino}_${new Date().getTime()}.xlsx`;
                link.click();
                
            } else {
                // Fallback para CSV
                const csv = Utils.arrayParaCsv(dadosExcel.dados);
                Utils.downloadArquivo(csv, 'difal_resultados.csv', 'text/csv');
            }
            
        } catch (error) {
            console.error('Erro na exportação:', error);
            this.showError(`Erro na exportação: ${error.message}`);
        }
    }

    /**
     * Exporta para PDF
     */
    async exportToPdf() {
        this.showError('Exportação PDF será implementada em breve');
    }

    /**
     * Mostra progresso
     * @param {string} message 
     * @param {number} percentage 
     */
    showProgress(message, percentage) {
        const progressSection = document.getElementById('progress-section');
        const progressBar = document.getElementById('progress-bar');
        const statusMessage = document.getElementById('status-message');
        
        if (progressSection) {
            progressSection.classList.remove('hidden');
        }
        
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
            progressBar.textContent = `${percentage}%`;
        }
        
        if (statusMessage) {
            statusMessage.textContent = message;
            statusMessage.className = 'status-message';
        }
        
    }

    /**
     * Mostra erro
     * @param {string} message 
     */
    showError(message) {
        const statusMessage = document.getElementById('status-message');
        
        if (statusMessage) {
            statusMessage.textContent = message;
            statusMessage.className = 'status-message error';
        }
        
        // Alert como fallback
        alert(message);
        
    }

    /**
     * Configura eventos do modal
     */
    setupModalEvents() {
        // Configurar eventos da metodologia
        const metodologiaInputs = document.querySelectorAll('input[name="metodologia"]');
        metodologiaInputs.forEach(input => {
            input.addEventListener('change', this.onMetodologiaChange.bind(this));
        });
        
        // Configurar eventos dos checkboxes
        const configurarBeneficios = document.getElementById('configurar-beneficios');
        if (configurarBeneficios) {
            configurarBeneficios.addEventListener('change', this.onBeneficiosToggle.bind(this));
        }
    }
    
    /**
     * Manipula mudança na metodologia
     */
    onMetodologiaChange(event) {
        const metodologia = event.target.value;
        console.log(`Metodologia selecionada: ${metodologia}`);
        
        // Pode adicionar lógica adicional aqui se necessário
    }
    
    /**
     * Manipula toggle dos benefícios
     */
    onBeneficiosToggle(event) {
        const configurarBeneficios = event.target.checked;
        console.log(`Configurar benefícios: ${configurarBeneficios}`);
        
        // Pode adicionar lógica adicional aqui se necessário
    }
    
    
    /**
     * Configura funções globais do modal
     */
    setupModalFunctions() {
        const self = this; // Preservar contexto
        
        // Função para abrir modal
        window.openConfigModal = function() {
            const modal = document.getElementById('config-modal');
            if (modal) {
                modal.classList.remove('hidden');
                self.setupModalEvents();
            }
        };
        
        // Função para fechar modal
        window.closeConfigModal = function() {
            const modal = document.getElementById('config-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
        };
        
        // Função para prosseguir para configuração de itens
        window.prosseguirParaConfiguracaoItens = function() {
            const configuracaoGeral = self.coletarConfiguracaoGeralModal();
            
            console.log('⚙️ Configuração geral aplicada:', configuracaoGeral);
            
            // Armazenar configuração geral
            window.difalConfiguracaoGeral = configuracaoGeral;
            
            // Fechar modal atual
            window.closeConfigModal();
            
            // Se não deve configurar benefícios, calcular diretamente
            if (!configuracaoGeral.configurarBeneficios) {
                self.calculateDifalComConfiguracao(configuracaoGeral);
                return;
            }
            
            // Caso contrário, abrir tela de configuração por item
            self.openItemConfigModal();
        };
        
        // Função para calcular sem configuração de itens
        window.calcularSemConfiguracaoItens = function() {
            const configuracaoGeral = self.coletarConfiguracaoGeralModal();
            configuracaoGeral.configurarBeneficios = false;
            configuracaoGeral.fcpManual = false;
            
            console.log('📊 Calculando com configuração simples:', configuracaoGeral);
            
            // Armazenar configuração
            window.difalConfiguracaoGeral = configuracaoGeral;
            
            // Fechar modal e calcular
            window.closeConfigModal();
            self.calculateDifalComConfiguracao(configuracaoGeral);
        };
        
        // Funções globais para o modal de configuração por item
        window.closeItemConfigModal = function() {
            self.closeItemConfigModal();
        };
        
        window.aplicarFiltros = function() {
            self.aplicarFiltros();
        };
        
        window.limparFiltros = function() {
            self.limparFiltros();
        };
        
        window.paginaAnterior = function() {
            self.paginaAnterior();
        };
        
        window.proximaPagina = function() {
            self.proximaPagina();
        };
        
        // Função para configurar benefício de um item
        window.configurarBeneficioItem = function(itemId, beneficio) {
            if (!window.difalConfiguracoesItens[itemId]) {
                window.difalConfiguracoesItens[itemId] = {};
            }
            
            if (beneficio) {
                window.difalConfiguracoesItens[itemId].beneficio = beneficio;
            } else {
                delete window.difalConfiguracoesItens[itemId].beneficio;
                delete window.difalConfiguracoesItens[itemId].cargaEfetivaDesejada;
                delete window.difalConfiguracoesItens[itemId].aliqOrigemEfetiva;
                delete window.difalConfiguracoesItens[itemId].aliqDestinoEfetiva;
            }
            
            // Atualizar campos dinâmicos
            const fieldsDiv = document.getElementById(`beneficio-fields-${itemId}`);
            if (fieldsDiv) {
                fieldsDiv.innerHTML = self.createBeneficioFields(itemId, window.difalConfiguracoesItens[itemId]);
                fieldsDiv.className = `beneficio-fields-inline ${beneficio ? 'show' : ''}`;
            }
            
            // Atualizar classe da linha
            const row = document.querySelector(`tr[data-item="${itemId}"]`);
            if (row) {
                row.className = `item-row ${beneficio ? 'with-benefit' : ''} ${window.difalConfiguracoesItens[itemId].fcpManual ? 'with-fcp' : ''}`;
            }
            
            self.updateSummary();
        };
        
        // Função para configurar carga efetiva
        window.configurarCargaEfetiva = function(itemId, valor) {
            if (!window.difalConfiguracoesItens[itemId]) {
                window.difalConfiguracoesItens[itemId] = {};
            }
            window.difalConfiguracoesItens[itemId].cargaEfetivaDesejada = parseFloat(valor) || null;
        };
        
        // Função para configurar alíquota origem
        window.configurarAliqOrigem = function(itemId, valor) {
            if (!window.difalConfiguracoesItens[itemId]) {
                window.difalConfiguracoesItens[itemId] = {};
            }
            window.difalConfiguracoesItens[itemId].aliqOrigemEfetiva = parseFloat(valor) || null;
        };
        
        // Função para configurar alíquota destino
        window.configurarAliqDestino = function(itemId, valor) {
            if (!window.difalConfiguracoesItens[itemId]) {
                window.difalConfiguracoesItens[itemId] = {};
            }
            window.difalConfiguracoesItens[itemId].aliqDestinoEfetiva = parseFloat(valor) || null;
        };
        
        // Função para configurar FCP manual
        window.configurarFcpItem = function(itemId, valor) {
            if (!window.difalConfiguracoesItens[itemId]) {
                window.difalConfiguracoesItens[itemId] = {};
            }
            
            if (valor) {
                window.difalConfiguracoesItens[itemId].fcpManual = parseFloat(valor);
            } else {
                delete window.difalConfiguracoesItens[itemId].fcpManual;
            }
            
            // Atualizar classe da linha
            const row = document.querySelector(`tr[data-item="${itemId}"]`);
            if (row) {
                const hasBenefit = window.difalConfiguracoesItens[itemId].beneficio;
                const hasFcp = window.difalConfiguracoesItens[itemId].fcpManual;
                row.className = `item-row ${hasBenefit ? 'with-benefit' : ''} ${hasFcp ? 'with-fcp' : ''}`;
            }
            
            self.updateSummary();
        };
        
        // Função para aplicar configuração por NCM
        window.aplicarPorNCM = function(ncm, itemIdOrigem) {
            if (!ncm || ncm === 'N/A') {
                alert('NCM não disponível para este item');
                return;
            }
            
            const configOrigem = window.difalConfiguracoesItens[itemIdOrigem] || {};
            
            if (!configOrigem.beneficio && !configOrigem.fcpManual) {
                alert('Este item não possui configuração para aplicar');
                return;
            }
            
            const itensComMesmoNCM = window.spedData.itensDifal.filter(item => item.ncm === ncm);
            const count = itensComMesmoNCM.length;
            
            if (confirm(`Aplicar configuração deste item para ${count} item(ns) com NCM ${ncm}?`)) {
                itensComMesmoNCM.forEach(item => {
                    const itemId = item.codItem;
                    
                    if (!window.difalConfiguracoesItens[itemId]) {
                        window.difalConfiguracoesItens[itemId] = {};
                    }
                    
                    // Copiar configuração
                    Object.assign(window.difalConfiguracoesItens[itemId], configOrigem);
                });
                
                // Re-renderizar tabela
                self.renderItemConfigTable();
                
                alert(`Configuração aplicada para ${count} item(ns) com NCM ${ncm}`);
            }
        };
        
        // Função para limpar configuração de um item
        window.limparConfigItem = function(itemId) {
            if (window.difalConfiguracoesItens[itemId]) {
                delete window.difalConfiguracoesItens[itemId];
                
                // Re-renderizar linha
                const row = document.querySelector(`tr[data-item="${itemId}"]`);
                if (row) {
                    const item = window.spedData.itensDifal.find(i => i.codItem === itemId);
                    if (item) {
                        row.outerHTML = self.createItemConfigRow(item);
                    }
                }
                
                self.updateSummary();
            }
        };
        
        // Função para salvar configurações
        window.salvarConfiguracoesItens = function() {
            const count = Object.keys(window.difalConfiguracoesItens).length;
            
            if (count === 0) {
                alert('Nenhuma configuração para salvar');
                return;
            }
            
            // Aqui poderia implementar salvamento em localStorage ou servidor
            console.log('💾 Configurações salvas:', window.difalConfiguracoesItens);
            
            alert(`${count} configuração(ões) de item salva(s) com sucesso!`);
        };
        
        // Função para calcular com configurações de itens
        window.calcularComConfiguracoesItens = function() {
            const configCount = Object.keys(window.difalConfiguracoesItens).length;
            const totalItems = window.spedData.itensDifal.length;
            
            console.log(`🧮 Calculando DIFAL com ${configCount} configuração(ões) de item`);
            
            // Fechar modal
            self.closeItemConfigModal();
            
            // Calcular com configurações
            self.calculateDifalComConfiguracao(window.difalConfiguracaoGeral);
        };
    }
    
    /**
     * Coleta configuração geral do modal
     */
    coletarConfiguracaoGeralModal() {
        return {
            metodologia: document.querySelector('input[name="metodologia"]:checked')?.value || 'auto',
            configurarBeneficios: document.getElementById('configurar-beneficios')?.checked || false,
            fcpManual: document.getElementById('configurar-fcp-manual')?.checked || false,
            percentualDestinatario: parseFloat(document.getElementById('percentual-destinatario')?.value) || 100
        };
    }
    
    /**
     * Calcula DIFAL com configuração aplicada
     * @param {Object} configuracao 
     */
    async calculateDifalComConfiguracao(configuracao) {
        if (!window.spedData || !window.spedData.itensDifal) {
            this.showError('Dados SPED não disponíveis');
            return;
        }

        const ufDestino = window.spedData.headerInfo.uf;
        console.log(`Calculando DIFAL para empresa em ${ufDestino} com metodologia: ${configuracao.metodologia}`);
        
        this.showProgress('Configurando cálculo DIFAL...', 20);
        
        try {
            // Inicializar calculadora
            if (!window.DifalCalculator) {
                throw new Error('DifalCalculator não disponível');
            }
            
            const calculator = new window.DifalCalculator();
            
            // Configurar metodologia
            if (configuracao.metodologia !== 'auto') {
                // Forçar metodologia especificada
                calculator.configuracao.metodologiaForcada = configuracao.metodologia;
            }
            
            // Configurar percentual destinatário
            calculator.configuracao.percentualDestinatario = configuracao.percentualDestinatario;
            
            // Para CFOPs interestaduais, usamos origem genérica
            calculator.configurarUFs('OUT', ufDestino);
            
            // Armazenar configuração global
            window.difalConfiguracaoGeral = configuracao;
            
            calculator.carregarItens(window.spedData.itensDifal);
            
            this.showProgress('Processando cálculos...', 60);
            
            const resultados = calculator.calcularTodos();
            const totalizadores = calculator.obterTotalizadores();
            
            this.showProgress('Cálculo concluído!', 100);
            
            // Armazenar resultados
            window.difalResults = {
                resultados,
                totalizadores,
                calculator,
                configuracao
            };
            
            // Mostrar resultados
            this.showCalculationResults(resultados, totalizadores);
            
        } catch (error) {
            console.error('Erro no cálculo DIFAL:', error);
            this.showError(`Erro no cálculo: ${error.message}`);
        }
    }

    // ========== CONFIGURAÇÃO POR ITEM ==========
    
    /**
     * Abre modal de configuração por item
     */
    openItemConfigModal() {
        if (!window.spedData || !window.spedData.itensDifal) {
            this.showError('Dados SPED não disponíveis');
            return;
        }
        
        console.log('🎯 Abrindo configuração por item');
        
        // Inicializar dados de configuração por item
        this.initItemConfiguration();
        
        // Mostrar modal
        const modal = document.getElementById('item-config-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.renderItemConfigTable();
            this.setupItemConfigEvents();
        }
    }
    
    /**
     * Fecha modal de configuração por item
     */
    closeItemConfigModal() {
        const modal = document.getElementById('item-config-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    /**
     * Inicializa dados de configuração por item
     */
    initItemConfiguration() {
        if (!window.difalConfiguracoesItens) {
            window.difalConfiguracoesItens = {};
        }
        
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.filteredItems = [...window.spedData.itensDifal];
        this.totalPages = Math.ceil(this.filteredItems.length / this.itemsPerPage);
        
        console.log(`Inicializando configuração para ${this.filteredItems.length} itens`);
    }
    
    /**
     * Configura eventos do modal de configuração por item
     */
    setupItemConfigEvents() {
        // Eventos de filtro
        const filtroCfop = document.getElementById('filtro-cfop');
        const filtroNcm = document.getElementById('filtro-ncm');
        const filtroValorMin = document.getElementById('filtro-valor-min');
        const buscaItem = document.getElementById('busca-item');
        
        [filtroCfop, filtroNcm, filtroValorMin, buscaItem].forEach(element => {
            if (element) {
                element.addEventListener('input', this.debounce(() => {
                    this.aplicarFiltros();
                }, 300));
            }
        });
    }
    
    /**
     * Debounce function para evitar muitas chamadas
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * Aplica filtros na lista de itens
     */
    aplicarFiltros() {
        const filtroCfop = document.getElementById('filtro-cfop')?.value || '';
        const filtroNcm = document.getElementById('filtro-ncm')?.value || '';
        const filtroValorMin = parseFloat(document.getElementById('filtro-valor-min')?.value) || 0;
        const buscaItem = document.getElementById('busca-item')?.value.toLowerCase() || '';
        
        this.filteredItems = window.spedData.itensDifal.filter(item => {
            // Filtro CFOP
            if (filtroCfop && item.cfop !== filtroCfop) return false;
            
            // Filtro NCM
            if (filtroNcm && !item.ncm?.includes(filtroNcm)) return false;
            
            // Filtro valor mínimo
            if (filtroValorMin > 0 && item.baseCalculoDifal < filtroValorMin) return false;
            
            // Busca em código, descrições (ambas) ou NCM
            if (buscaItem) {
                const searchText = (
                    (item.codItem || '') + ' ' +
                    (item.descrCompl || '') + ' ' +
                    (item.descricaoCadastral || '') + ' ' +
                    (item.ncm || '')
                ).toLowerCase();
                
                if (!searchText.includes(buscaItem)) return false;
            }
            
            return true;
        });
        
        this.currentPage = 1;
        this.totalPages = Math.ceil(this.filteredItems.length / this.itemsPerPage);
        this.renderItemConfigTable();
        this.updateSummary();
    }
    
    /**
     * Limpa filtros
     */
    limparFiltros() {
        document.getElementById('filtro-cfop').value = '';
        document.getElementById('filtro-ncm').value = '';
        document.getElementById('filtro-valor-min').value = '';
        document.getElementById('busca-item').value = '';
        
        this.aplicarFiltros();
    }
    
    /**
     * Renderiza tabela de configuração de itens
     */
    renderItemConfigTable() {
        const tbody = document.querySelector('#tabela-configuracao-itens tbody');
        if (!tbody) return;
        
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageItems = this.filteredItems.slice(startIndex, endIndex);
        
        tbody.innerHTML = pageItems.map(item => this.createItemConfigRow(item)).join('');
        
        this.updatePagination();
        this.updateSummary();
    }
    
    /**
     * Cria linha de configuração para um item
     */
    createItemConfigRow(item) {
        const itemId = item.codItem;
        const config = window.difalConfiguracoesItens[itemId] || {};
        const fcpManualEnabled = window.difalConfiguracaoGeral?.fcpManual || false;
        
        return `
            <tr class="item-row ${config.beneficio ? 'with-benefit' : ''} ${config.fcpManual ? 'with-fcp' : ''}" data-item="${itemId}">
                <td class="font-mono">${item.codItem}</td>
                <td class="descricao-cell" title="${this.formatarDescricaoCompleta(item)}">${this.formatarDescricaoExibicao(item, 30)}</td>
                <td class="font-mono">${item.ncm || 'N/A'}</td>
                <td class="font-mono">${item.cfop}</td>
                <td class="text-right">${Utils.formatarMoeda(item.baseCalculoDifal)}</td>
                <td>
                    <select onchange="configurarBeneficioItem('${itemId}', this.value)">
                        <option value="" ${!config.beneficio ? 'selected' : ''}>Nenhum</option>
                        <option value="reducao-base" ${config.beneficio === 'reducao-base' ? 'selected' : ''}>Redução Base</option>
                        <option value="reducao-aliquota-origem" ${config.beneficio === 'reducao-aliquota-origem' ? 'selected' : ''}>Redução Alíq. Origem</option>
                        <option value="reducao-aliquota-destino" ${config.beneficio === 'reducao-aliquota-destino' ? 'selected' : ''}>Redução Alíq. Destino</option>
                        <option value="isencao" ${config.beneficio === 'isencao' ? 'selected' : ''}>Isenção</option>
                    </select>
                    <div id="beneficio-fields-${itemId}" class="beneficio-fields-inline ${config.beneficio ? 'show' : ''}">
                        ${this.createBeneficioFields(itemId, config)}
                    </div>
                </td>
                <td>
                    ${fcpManualEnabled ? `
                        <input type="number" min="0" max="4" step="0.1" 
                               value="${config.fcpManual || ''}" 
                               placeholder="Auto"
                               onchange="configurarFcpItem('${itemId}', this.value)">
                    ` : '<span class="text-gray-500">Auto</span>'}
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-mini apply-ncm" 
                                onclick="aplicarPorNCM('${item.ncm}', '${itemId}')"
                                title="Aplicar para todos os itens deste NCM">
                            NCM
                        </button>
                        <button class="btn-mini clear" 
                                onclick="limparConfigItem('${itemId}')"
                                title="Limpar configuração">
                            ×
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    /**
     * Cria campos dinâmicos de benefício
     */
    createBeneficioFields(itemId, config) {
        const beneficio = config.beneficio;
        
        switch (beneficio) {
            case 'reducao-base':
                return `
                    <input type="number" min="0" max="100" step="0.01" 
                           value="${config.cargaEfetivaDesejada || ''}" 
                           placeholder="Carga efetiva desejada (%)"
                           onchange="configurarCargaEfetiva('${itemId}', this.value)">
                `;
            case 'reducao-aliquota-origem':
                return `
                    <input type="number" min="0" max="25" step="0.1" 
                           value="${config.aliqOrigemEfetiva || ''}" 
                           placeholder="Alíquota origem efetiva (%)"
                           onchange="configurarAliqOrigem('${itemId}', this.value)">
                `;
            case 'reducao-aliquota-destino':
                return `
                    <input type="number" min="0" max="25" step="0.1" 
                           value="${config.aliqDestinoEfetiva || ''}" 
                           placeholder="Alíquota destino efetiva (%)"
                           onchange="configurarAliqDestino('${itemId}', this.value)">
                `;
            case 'isencao':
                return '<small class="text-green-600">Item isento de DIFAL</small>';
            default:
                return '';
        }
    }
    
    /**
     * Atualiza resumo da configuração
     */
    updateSummary() {
        const totalItens = this.filteredItems.length;
        const itensComBeneficio = Object.keys(window.difalConfiguracoesItens).length;
        const valorTotalBase = this.filteredItems.reduce((sum, item) => sum + item.baseCalculoDifal, 0);
        
        document.getElementById('total-itens-config').textContent = `${totalItens} itens`;
        document.getElementById('itens-com-beneficio').textContent = `${itensComBeneficio} com benefício`;
        document.getElementById('valor-total-base').textContent = `${Utils.formatarMoeda(valorTotalBase)} base total`;
    }
    
    /**
     * Atualiza controles de paginação
     */
    updatePagination() {
        const paginacao = document.getElementById('paginacao-config');
        const infoPagina = document.getElementById('info-pagina');
        
        if (this.totalPages <= 1) {
            paginacao?.classList.add('hidden');
        } else {
            paginacao?.classList.remove('hidden');
            if (infoPagina) {
                infoPagina.textContent = `Página ${this.currentPage} de ${this.totalPages}`;
            }
        }
    }
    
    /**
     * Navega para página anterior
     */
    paginaAnterior() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderItemConfigTable();
        }
    }
    
    /**
     * Navega para próxima página
     */
    proximaPagina() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.renderItemConfigTable();
        }
    }
    
    /**
     * Formata descrição completa para tooltip (ambas as descrições)
     */
    formatarDescricaoCompleta(item) {
        const cadastral = item.descricaoCadastral || '';
        const complementar = item.descrCompl || '';
        
        if (cadastral && complementar && cadastral !== complementar) {
            return `${cadastral} | ${complementar}`;
        }
        
        return cadastral || complementar || 'SEM DESCRIÇÃO';
    }
    
    /**
     * Formata descrição para exibição (prioriza cadastral)
     */
    formatarDescricaoExibicao(item, maxLength = 30) {
        const cadastral = item.descricaoCadastral || '';
        const complementar = item.descrCompl || '';
        
        let descricaoPrincipal = '';
        let origem = '';
        
        // Priorizar descrição cadastral (0200)
        if (cadastral && cadastral !== 'PRODUTO NÃO CADASTRADO' && cadastral !== 'SEM DADOS NA ORIGEM') {
            descricaoPrincipal = cadastral;
            origem = cadastral !== complementar && complementar ? 'Cadastral' : '';
        } else if (complementar) {
            descricaoPrincipal = complementar;
            origem = 'NF';
        } else {
            descricaoPrincipal = cadastral || 'SEM DESCRIÇÃO';
            origem = '';
        }
        
        const descricaoTruncada = Utils.truncarTexto(descricaoPrincipal, maxLength);
        
        if (origem) {
            return `${descricaoTruncada}<span class="descricao-origem">(${origem})</span>`;
        }
        
        return descricaoTruncada;
    }

}

// Exportar classe para uso global
if (typeof window !== 'undefined') {
    window.UIManager = UIManager;
}

// Para módulos Node.js se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}