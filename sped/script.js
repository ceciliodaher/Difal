// script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const spedFileButtonLabel = document.querySelector('label[for="spedFile"]');
    const spedFileInput = document.getElementById('spedFile');
    const selectedSpedFileText = document.getElementById('selectedSpedFile');
    const excelFileNameInput = document.getElementById('excelFileName');
    const progressBar = document.getElementById('progressBar');
    const statusMessage = document.getElementById('statusMessage');
    const convertButton = document.getElementById('convertButton');
    const dropZone = document.getElementById('dropZone');
    const logWindow = document.getElementById('logWindow'); // Added logWindow

    // --- Global/Shared Variables ---
    let spedFile = null;
    let spedFileContent = '';
    let sharedNomeEmpresa = "Empresa"; // For sharing extracted header info
    let sharedPeriodo = "";

    // --- Event Listeners ---
    // spedFileButtonLabel.addEventListener('click', () => { // This is handled by <label for="spedFile">
    //     spedFileInput.click(); 
    // });

    // convertButton listener remains
    convertButton.addEventListener('click', iniciarConversao);

    // Drag and Drop Event Listeners for dropZone
    if (dropZone) {
        // For the drop zone itself
        dropZone.addEventListener('dragenter', handleDragEnter, false);
        dropZone.addEventListener('dragover', handleDragOver, false);
        dropZone.addEventListener('dragleave', handleDragLeave, false);
        dropZone.addEventListener('drop', handleFileDrop, false); // Renamed from handleDrop to avoid conflict if any

        // For the document body - to prevent browser default behavior for unhandled drops / drags
        document.body.addEventListener('dragover', function(e) {
            e.preventDefault(); // Only prevent default to allow drop cursor, don't highlight body
            e.stopPropagation();
        }, false);
        document.body.addEventListener('drop', function(e) {
            e.preventDefault(); // Prevent browser opening file if dropped outside zone
            e.stopPropagation();
        }, false);
    }

    // --- Functions --- (New/Modified Drag and Drop handlers)

    // Keep preventDefaults as a general utility if needed elsewhere, or inline its logic
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleDragEnter(e) {
        preventDefaults(e);
        highlight(e); // Existing highlight function
    }

    function handleDragOver(e) {
        preventDefaults(e);
        highlight(e); // Keep highlighted if dragging over
    }

    function handleDragLeave(e) {
        preventDefaults(e);
        if (!dropZone.contains(e.relatedTarget)) {
          unhighlight(e); 
        }
    }
    
    function highlight(e) {
        // preventDefaults(e); // Called by specific handlers
        dropZone.classList.add('highlight');
        dropZone.classList.add('dragover');
        // addLog("Arquivo detectado sobre a área de soltar.", "info"); // Optional: can be verbose
    }

    function unhighlight(e) {
        // preventDefaults(e); // Called by specific handlers
        dropZone.classList.remove('highlight');
        dropZone.classList.remove('dragover');
        // addLog("Detecção de arquivo sobre a área removida.", "info"); // Optional: can be verbose
    }

    function handleFileDrop(e) { 
        preventDefaults(e); 
        unhighlight(e);

        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            const fileToProcess = files[0]; 
            addLog(`Arquivo "${fileToProcess.name}" solto na área.`, "info");
            if (fileToProcess.name.toLowerCase().endsWith('.txt')) {
                processSpedFile(fileToProcess); 
            } else {
                addLog(`Tipo de arquivo "${fileToProcess.name}" não suportado. Use .txt.`, 'error');
                showError("Por favor, solte apenas arquivos .txt (SPED).");
                // updateStatus is called by showError
            }
        } else {
            addLog("Nenhum arquivo foi solto.", 'warn');
        }
    }


    // Refactor existing file selection logic
    // Old: spedFileInput.addEventListener('change', handleSpedFileSelect);
    // New:
    spedFileInput.addEventListener('change', (event) => {
        const files = event.target.files;
        if (files.length > 0) {
            processSpedFile(files[0]);
        }
    });


    // New function to process the file, whether from input or drop
    async function processSpedFile(fileToProcess) {
        clearLogs(); // Clear logs for new file processing
        addLog(`Processando arquivo: ${fileToProcess.name}`, "info");

        if (!fileToProcess) {
            selectedSpedFileText.textContent = 'Nenhum arquivo selecionado';
            excelFileNameInput.value = '';
            spedFile = null;
            spedFileContent = '';
            addLog("Nenhum arquivo para processar.", "warn");
            return;
        }

        spedFile = fileToProcess; 
        selectedSpedFileText.textContent = `Arquivo selecionado: ${spedFile.name}`;
        updateStatus('Analisando arquivo...', 5);
        // addLog('Analisando arquivo...', 'info'); // Redundant with updateStatus if it also logs

        try {
            updateStatus('Lendo arquivo SPED...', 10);
            addLog('Lendo arquivo SPED...', 'info');
            const arrayBuffer = await spedFile.arrayBuffer(); 
            const { encoding, content } = await detectAndRead(arrayBuffer);
            spedFileContent = content; 
            addLog(`Encoding detectado: ${encoding}`, 'info');

            if (!spedFileContent) {
                addLog('Falha ao ler o conteúdo do arquivo.', 'error');
                showError('Não foi possível ler o conteúdo do arquivo. Tente UTF-8 ou Latin-1.');
                // updateStatus is called by showError
                return;
            }

            updateStatus('Extraindo informações do cabeçalho...', 30);
            addLog('Extraindo informações do cabeçalho...', 'info');
            const registrosHeader = lerArquivoSpedParaHeader(spedFileContent); 
            const { nomeEmpresa, periodo } = extrairInformacoesHeader(registrosHeader);
            sharedNomeEmpresa = nomeEmpresa; // Assign to shared variable
            sharedPeriodo = periodo;       // Assign to shared variable
            addLog(`Cabeçalho: Empresa "${nomeEmpresa}", Período "${periodo}"`, 'info');

            const suggestedExcelName = processarNomeArquivo(nomeEmpresa, periodo, spedFile.name);
            excelFileNameInput.value = suggestedExcelName;
            addLog(`Nome de arquivo Excel sugerido: ${suggestedExcelName}`, 'info');

            updateStatus('Pronto para converter.', 0);
            addLog('Arquivo analisado e pronto para conversão.', 'info');
            // console.log(...) // console logs can be replaced by addLog if desired

        } catch (error) {
            // console.error(...)
            addLog(`Erro ao processar arquivo: ${error.message}`, 'error');
            showError(`Erro ao processar arquivo: ${error.message}`);
            selectedSpedFileText.textContent = 'Erro ao ler o arquivo.';
            excelFileNameInput.value = '';
            // updateStatus is called by showError
            spedFile = null;
            spedFileContent = '';
        }
    }
    
    /**
     * Tries to detect encoding (UTF-8 or Latin-1) and read file content.
     * More sophisticated detection would require a library.
     */
    async function detectAndRead(arrayBuffer) {
        const decoders = [
            { encoding: 'UTF-8', decoder: new TextDecoder('utf-8', { fatal: true }) },
            { encoding: 'ISO-8859-1', decoder: new TextDecoder('iso-8859-1') } // Latin-1
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
        // Fallback if specific error handling for decoding is needed
        try {
            // Try UTF-8 with non-fatal to get at least some content if possible,
            // but this might lead to mojibake for other encodings.
            const content = new TextDecoder('utf-8').decode(arrayBuffer);
            console.warn('Decodificado como UTF-8 com possíveis erros (fallback).');
            return { encoding: 'UTF-8 (fallback)', content };
        } catch (e) {
            console.error('Falha final ao decodificar o ArrayBuffer:', e);
            throw new Error('Não foi possível decodificar o arquivo com os encodings suportados.');
        }
    }


    /**
     * Placeholder for SPED file reading for header.
     * A more complete version will parse all lines.
     */
    function lerArquivoSpedParaHeader(fileContent) {
        const registros = { '0000': [] }; // Using an object for defaultdict-like behavior
        const lines = fileContent.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (isLinhaValida(trimmedLine)) {
                const campos = trimmedLine.split('|');
                if (campos.length > 1 && campos[1] === '0000') {
                     // Remove empty first and last element if they exist due to split('|')
                    registros['0000'].push(campos.slice(1, -1));
                }
                if (registros['0000'].length > 0) break; // Found 0000, no need to parse further for header
            }
        }
        return registros;
    }


    /**
     * Extracts header information from SPED records (specifically '0000').
     * Mimics `extrair_informacoes_header` from Python.
     */
    function extrairInformacoesHeader(registros) {
        let nomeEmpresa = "Empresa";
        let periodo = "";

        if (registros['0000'] && registros['0000'].length > 0) {
            const reg0000 = registros['0000'][0]; // reg0000 is already without the initial/final pipe chars
            // Python code: nome_empresa = reg_0000[6] if len(reg_0000) > 6 else "Empresa"
            // Python code: data_inicial = reg_0000[4] if len(reg_0000) > 4 else ""
            // Indexes need to be adjusted because Python's split('|') results in an empty string at the start and end.
            // ['','REG','COD_VER', ..., 'NOME', ..., ''] for a line |REG|COD_VER|...|NOME|...|
            // So, in Python, after `campos = linha.split('|')`, `campos[1]` is REG.
            // `reg_0000` in Python was `registros['0000'][0]` which is `campos`.
            // So `reg_0000[6]` (NOME) and `reg_0000[4]` (DT_INI).

            // Our `reg0000` is `campos.slice(1, -1)` from `lerArquivoSpedParaHeader`
            // So, `reg0000[0]` is REG, `reg0000[1]` is COD_VER etc.
            // DT_INI is at index 3 (original index 4, minus 1)
            // NOME is at index 5 (original index 6, minus 1)

            const dtIniIndex = 3; // Corresponds to reg_0000[4] in Python's full split
            const nomeIndex = 5;  // Corresponds to reg_0000[6] in Python's full split

            if (reg0000.length > nomeIndex) {
                nomeEmpresa = reg0000[nomeIndex] || "Empresa";
            }
            if (reg0000.length > dtIniIndex) {
                const dataInicial = reg0000[dtIniIndex];
                if (dataInicial && dataInicial.length === 8) {
                    periodo = `${dataInicial.substring(0, 2)}/${dataInicial.substring(2, 4)}/${dataInicial.substring(4, 8)}`;
                }
            }
        }
        return { nomeEmpresa, periodo };
    }

    /**
     * Processes the Excel filename based on company name and period.
     * Mimics `processar_nome_arquivo` from Python.
     */
    function processarNomeArquivo(nomeEmpresa, periodo, originalSpedName = "SPED_convertido") {
        try {
            const primeiroNome = nomeEmpresa.split(' ')[0].trim() || "Empresa";
            if (periodo) {
                const partesData = periodo.split('/');
                if (partesData.length === 3) {
                    const mes = partesData[1];
                    const ano = partesData[2];
                    return `${primeiroNome}_SPED_${mes}_${ano}.xlsx`;
                }
            }
            // Fallback using original SPED name if company/period processing fails
            const baseName = originalSpedName.substring(0, originalSpedName.lastIndexOf('.')) || primeiroNome + "_SPED";
            return `${baseName}.xlsx`;

        } catch (error) {
            console.error("Erro ao processar nome do arquivo:", error);
            const baseName = originalSpedName.substring(0, originalSpedName.lastIndexOf('.')) || "SPED_convertido";
            return `${baseName}.xlsx`;
        }
    }

    /**
     * Validates a SPED line.
     * Mimics `is_linha_valida` from Python.
     */
    function isLinhaValida(linha) {
        linha = linha.trim();
        if (!linha) return false;
        if (!linha.startsWith('|') || !linha.endsWith('|')) return false;

        const campos = linha.split('|');
        if (campos.length < 3) return false; // Must have at least |REG|FIELD|

        const regCode = campos[1];
        if (!regCode) return false;

        // Regex for SPED record codes (e.g., 0000, C100, M210, 1990)
        const padraoRegistro = /^[A-Z0-9]?\d{3,4}$/; // Adjusted to include alphanumeric prefix like 'M'
        return padraoRegistro.test(regCode);
    }


    /**
     * Initiates the conversion process.
     * Mimics `iniciar_conversao` from Python.
     */
    async function iniciarConversao() {
        if (!validarEntrada()) { // validarEntrada might call showError, which calls updateStatus
            addLog("Validação de entrada falhou.", "warn");
            return;
        }
        addLog("Validação de entrada bem-sucedida.", "info");

        const outputFileName = excelFileNameInput.value.trim();
        let fullOutputFileName = outputFileName;
        if (!fullOutputFileName.toLowerCase().endsWith('.xlsx')) {
            fullOutputFileName += '.xlsx';
        }

        convertButton.disabled = true;
        updateStatus('Convertendo...', 0, false, true); // Start indeterminate progress
        addLog(`Iniciando conversão para: ${fullOutputFileName}`, 'info');

        try {
            await new Promise(resolve => setTimeout(resolve, 50)); 
            await converter(fullOutputFileName);
        } catch (error) {
            // This catch might be redundant if 'converter' calls conversaoConcluida itself
            // console.error('Erro ao iniciar conversão (nível iniciarConversao):', error);
            // conversaoConcluida(false, error.message); // conversaoConcluida will log
        }
    }

    /**
     * Validates user inputs.
     * Mimics `validar_entrada` from Python.
     */
    function validarEntrada() {
        if (!spedFile) {
            showError("Selecione o arquivo SPED");
            return false;
        }
        if (!excelFileNameInput.value.trim()) {
            showError("Digite um nome para o arquivo Excel");
            return false;
        }
        // File existence is implicitly true if spedFile object exists from input
        return true;
    }

    /**
     * Main conversion function (placeholder for actual SPED to Excel logic).
     * Mimics `converter` from Python.
     */
    async function converter(caminhoExcel) {
        // console.log(`Iniciando conversão para: ${caminhoExcel}`); // Already logged by iniciarConversao
        try {
            updateStatus('Processando arquivo SPED...', 10);
            // addLog('Processando arquivo SPED...', 'info'); // Covered by processarSpedParaExcel logs
            await new Promise(resolve => setTimeout(resolve, 200));

            await processarSpedParaExcel(spedFileContent, caminhoExcel); // This function will call gerarExcel

            // Success is handled by gerarExcel calling conversaoConcluida(true)
            // console.log("Conversão (simulada) concluída."); // Logged by conversaoConcluida
        } catch (error) {
            // console.error('Erro durante a conversão (nível converter):', error);
            // conversaoConcluida will be called by processarSpedParaExcel or gerarExcel's catch block
            // If error bubbles up to here without conversaoConcluida being called, then call it:
            if (!statusMessage.textContent.includes("Erro na conversão") && !statusMessage.textContent.includes("sucesso")) {
                 conversaoConcluida(false, error.message);
            }
        }
    }

    /**
     * Processes the SPED file content and generates the Excel file.
     * This function will be expanded significantly.
     * Mimics `processar_sped_para_excel` from Python.
     */
    async function processarSpedParaExcel(fileContent, caminhoSaidaExcel) {
        updateStatus('Lendo e normalizando registros SPED...', 20);
        addLog('Lendo e normalizando todos os registros SPED...', 'info');
        await new Promise(resolve => setTimeout(resolve, 100)); 

        const registros = lerArquivoSpedCompleto(fileContent); // Assuming this is synchronous for now
        addLog(`Total de ${Object.keys(registros).length} tipos de registros lidos.`, 'info');
        // const { nomeEmpresa, periodo } = extrairInformacoesHeader(registros); // Already done in processSpedFile

        updateStatus('Gerando arquivo Excel...', 50);
        addLog('Iniciando geração do arquivo Excel...', 'info');
        await new Promise(resolve => setTimeout(resolve, 100)); 

        try {
            // Pass nomeEmpresa and periodo from the global scope if they are set there by processSpedFile
            await gerarExcel(registros, sharedNomeEmpresa, sharedPeriodo, caminhoSaidaExcel);
        } catch (e) {
            // console.error("Falha em processarSpedParaExcel:", e);
            conversaoConcluida(false, `Falha na geração do Excel: ${e.message}`); // Will log error
        }
    }

    /**
     * Reads the entire SPED file and organizes records.
     * Mimics `ler_arquivo_sped` from Python (more complete version).
     */
    function lerArquivoSpedCompleto(fileContent) {
        const registros = {}; // Using an object like defaultdict(list)
        const lines = fileContent.split('\n'); // Ensure consistent line splitting

        for (const rawLine of lines) {
            const linha = rawLine.trim();
            if (isLinhaValida(linha)) {
                const campos = linha.split('|');
                // campos[0] is empty, campos[1] is REG, ..., campos[campos.length-1] is empty
                const tipoRegistro = campos[1];
                const dadosRegistro = campos; // Keep the raw split including empty start/end

                if (!registros[tipoRegistro]) {
                    registros[tipoRegistro] = [];
                }
                registros[tipoRegistro].push(dadosRegistro);
            }
        }
        console.log("SPED Completo Lido e Estruturado. Contagem de Tipos:", Object.keys(registros).length);
        return registros;
    }


    // --- Excel Generation Functions (Placeholders - to be implemented) ---
    /**
     * Generates the Excel file using xlsx-populate.
     * Mimics `gerar_excel` from Python.
     */
    async function gerarExcel(registros, nomeEmpresa, periodo, caminhoSaida) {
        // console.log("Iniciando geração do Excel com XlsxPopulate..."); // Logged by caller
        updateStatus('Preparando dados para Excel...', 60);
        // addLog('Preparando dados para Excel...', 'info'); // Redundant with updateStatus

        try {
            const workbook = await XlsxPopulate.fromBlankAsync();
            addLog('Novo workbook Excel criado.', 'info');
            
            // Pass necessary global/state variables or objects
            const context = {
                registros, 
                workbook,
                writer: workbook, 
                obterLayoutRegistro, 
                logger: { 
                    info: (msg) => addLog(msg, 'info'), // Route logger to addLog
                    error: (msg) => addLog(msg, 'error'),
                    warn: (msg) => addLog(msg, 'warn')
                },
                ajustarColunas: _ajustarColunas, 
                formatarPlanilha: _formatarPlanilha, 
                nomeEmpresa, // Pass already received nomeEmpresa
                periodo,   // Pass already received periodo
                addLog     // Pass addLog itself if sub-functions need more granular logging not covered by logger
            };


            updateStatus('Processando registros principais...', 70);
            addLog('Processando registros principais para abas individuais...', 'info');
            await _processarRegistros(context); 
            addLog('Registros principais processados.', 'info');

            updateStatus('Criando aba consolidada...', 80);
            addLog('Criando aba consolidada...', 'info');
            await _criarAbaConsolidada(context);
            addLog('Aba consolidada criada.', 'info');

            updateStatus('Processando outras obrigações...', 85);
            addLog('Processando outras obrigações (C197/D197)...', 'info');
            await _processarOutrasObrigacoes(context);
            addLog('Outras obrigações processadas.', 'info');
            
            /**if (!context.e110E111Processado) {
                 updateStatus('Processando E110/E111...', 88);
                 addLog('Processando registros E110/E111...', 'info');
                 await _processarRegistrosE110E111(context);
                 addLog('Registros E110/E111 processados.', 'info');
            }*/
            
            // Remove a aba padrão criada automaticamente
            try {
                const defaultSheet = workbook.sheet(0); // Primeira aba (Sheet1)
                if (defaultSheet && (defaultSheet.name() === 'Sheet1' || defaultSheet.name() === 'Sheet')) {
                    workbook.deleteSheet(defaultSheet);
                }
            } catch (e) {
                // Se não conseguir deletar, apenas continua
            }

            updateStatus('Finalizando arquivo Excel...', 95);
            addLog('Gerando blob do arquivo Excel...', 'info');
            const excelData = await workbook.outputAsync(); 
            const blob = new Blob([excelData], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

            addLog('Iniciando download do arquivo Excel...', 'info');
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = caminhoSaida;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href); 

            // console.log("Arquivo Excel gerado e download iniciado."); // Logged by conversaoConcluida
            conversaoConcluida(true, caminhoSaida); // This will call addLog for success

        } catch (error) {
            // console.error("Erro em gerarExcel:", error);
            conversaoConcluida(false, `Erro ao gerar Excel: ${error.message}`); // This will call addLog for error
        }
    }

    /**
     * Mimics Python's _processar_registros
     * context: { registros, writer, formatarData, obterLayoutRegistro, logger, ajustarColunas, formatarPlanilha, nomeEmpresa, periodo }
     */
    async function _processarRegistros(context) {
        const { registros, writer, obterLayoutRegistro, logger, ajustarColunas, formatarPlanilha } = context;
        
        const ordemBlocos = ['0', 'B', 'C', 'D', 'E', 'G', 'H', 'K', '1', '9'];
        let registrosOrdenados = [];

        for (const bloco of ordemBlocos) {
            let registrosBloco = Object.entries(registros)
                .filter(([k, v]) => k.startsWith(bloco))
                .sort(([ka], [kb]) => ka.localeCompare(kb));
            registrosOrdenados.push(...registrosBloco);
        }

        let outrosRegistros = Object.entries(registros)
            .filter(([k, v]) => !ordemBlocos.some(b => k.startsWith(b)))
            .sort(([ka], [kb]) => ka.localeCompare(kb));
        registrosOrdenados.push(...outrosRegistros);
        
        context.e110E111Processado = false; // Initialize flag

        for (const [tipoRegistro, linhas] of registrosOrdenados) {
            /**if (tipoRegistro === 'E110' || tipoRegistro === 'E111') {
                // These are handled by _processarRegistrosE110E111, typically called after E100 or at the end
                continue;
            }*/
            if (!linhas || linhas.length === 0) continue;

            try {
                // Python: df = pd.DataFrame(linhas)
                // Python: df = df.iloc[:, 1:-1]
                // JS: map `linhas` (which are arrays of strings from split('|'))
                // Each `linha` in `linhas` is like: ['', 'REG', 'FIELD1', ..., 'FIELDN', '']
                const dadosParaDf = linhas.map(linhaCompleta => linhaCompleta.slice(1, -1));
                
                if (dadosParaDf.length === 0 || dadosParaDf[0].length === 0) continue;

                let colunasNomes = obterLayoutRegistro(tipoRegistro);
                if (colunasNomes) {
                    colunasNomes = ajustarColunas(dadosParaDf[0].length, colunasNomes); // Pass df width and layout
                } else {
                    colunasNomes = Array.from({ length: dadosParaDf[0].length }, (_, i) => `Campo_${i + 1}`);
                }

                const sheetName = tipoRegistro.substring(0, 31);
                const worksheet = writer.addSheet(sheetName);

                // Header style
                const headerStyle = { bold: true, fill: "D7E4BC", border: true }; // Simplified
                colunasNomes.forEach((colName, colIdx) => {
                    worksheet.cell(1, colIdx + 1).value(colName).style(headerStyle);
                });

                // Data
                dadosParaDf.forEach((row, rowIdx) => {
                    row.forEach((cellValue, colIdx) => {
                        // Attempt to convert to number if applicable based on column name or content
                        let finalValue = cellValue;
                        const isNumericField = colunasNomes[colIdx] && (colunasNomes[colIdx].startsWith('VL_') || colunasNomes[colIdx].startsWith('ALIQ_') || colunasNomes[colIdx].startsWith('QTD'));
                        if (isNumericField && typeof cellValue === 'string' && cellValue.trim() !== '') {
                            const num = parseFloat(cellValue.replace(',', '.'));
                            if (!isNaN(num)) {
                                finalValue = num;
                            }
                        }
                        worksheet.cell(rowIdx + 2, colIdx + 1).value(finalValue);
                    });
                });
                
                formatarPlanilha(worksheet, colunasNomes, dadosParaDf);


                // Store data for consolidated sheet if needed (this was handled differently in Python)
                // For JS, _criarAbaConsolidada will pull directly from context.registros

                /**if (tipoRegistro === 'E100' && !context.e110E111Processado) {
                    logger.info("Registro E100 encontrado, processando E110/E111...");
                    await _processarRegistrosE110E111(context);
                    context.e110E111Processado = true;
                }*/

            } catch (e) {
                logger.error(`Erro ao processar registro ${tipoRegistro} em _processarRegistros: ${e.message}`);
                console.error(e); // Log stack
            }
        }
        logger.info(`Registros processados (JS): ${registrosOrdenados.map(r => r[0]).join(', ')}`);
    }


    /**
     * Mimics Python's _ajustar_colunas
     * dfWidth: number of columns in the data
     * colunas: array of layout column names
     */
    function _ajustarColunas(dfWidth, colunasOriginal) {
        let colunas = [...colunasOriginal]; // Create a copy
        if (colunas.length > dfWidth) {
            return colunas.slice(0, dfWidth);
        } else if (colunas.length < dfWidth) {
            for (let i = colunas.length; i < dfWidth; i++) {
                colunas.push(`Campo_${i + 1}`);
            }
        }
        return colunas;
    }

    /**
     * Mimics Python's _formatar_planilha
     * worksheet: XlsxPopulate worksheet object
     * columns: array of column names (headers)
     * data: array of arrays representing rows of data
     */
    function _formatarPlanilha(worksheet, columns, data) {
        columns.forEach((colName, colIdx) => {
            let maxLength = colName.length;
            data.forEach(row => {
                const cellValue = row[colIdx];
                if (cellValue !== null && cellValue !== undefined) {
                    const cellLength = String(cellValue).length;
                    if (cellLength > maxLength) {
                        maxLength = cellLength;
                    }
                }
            });
            // xlsx-populate uses different column width units than xlsxwriter.
            // A rough approximation: Excel's character width unit is complex.
            // xlsx-populate's `columnWidth` is in "average characters"
            // Let's try maxLength + a small buffer. Max 50 like in Python.
            worksheet.column(colIdx + 1).width(Math.min(maxLength + 5, 50));
        });
    }


    /**
     * Placeholder for _criar_aba_consolidada
     * context: { registros, writer, formatarData, obterLayoutRegistro, logger, nomeEmpresa, periodo }
     */
    async function _criarAbaConsolidada(context) {
        const { registros, writer, logger, nomeEmpresa, periodo, obterLayoutRegistro } = context; // Ensure obterLayoutRegistro is in context
        logger.info("Iniciando _criarAbaConsolidada (JS)...");

        try {
            const worksheet = writer.addSheet('Consolidado_Fiscal');
            
            const mainHeaderStyle = { bold: true, horizontalAlignment: "center", fill: "D7E4BC", border: true };
            const headerStyle = { bold: true, fill: "D7E4BC", border: true };
            const numStyle = { numberFormat: "#,##0.00", border: true };
            const codeStyle = { numberFormat: "0", border: true };
            const dateStyle = { numberFormat: "dd/mm/yyyy", border: true }; // XlsxPopulate expects JS Date for date styles
            const cellStyle = { border: true };

            let cnpj = "";
            if (registros['0000'] && registros['0000'][0] && registros['0000'][0].length > 7 + 1) {
                cnpj = registros['0000'][0][7];
            }
            const empresaCnpj = cnpj ? `${nomeEmpresa} - CNPJ: ${cnpj}` : nomeEmpresa;
            worksheet.range("A1:L1").merged(true).value(empresaCnpj).style(mainHeaderStyle);

            const colunasOrdem = ['Data', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS',
                                 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC', 'VL_IPI',
                                 'COD_OBS', 'Tipo_Registro'];

            colunasOrdem.forEach((colName, idx) => {
                worksheet.cell(3, idx + 1).value(colName).style(headerStyle);
            });

            let dataSped = null;
            if (registros['0000'] && registros['0000'][0] && registros['0000'][0].length > 4 + 1) {
                const dataStr = registros['0000'][0][4]; 
                if (dataStr && dataStr.length === 8) {
                    // Converter para objeto Date (formato: DDMMAAAA -> AAAA-MM-DD)
                    const dia = dataStr.substring(0, 2);
                    const mes = dataStr.substring(2, 4);
                    const ano = dataStr.substring(4, 8);
                    dataSped = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia)); // mes - 1 porque Date usa 0-11
                }
            }

            let currentRow = 4;
            const registrosDadosConsolidados = []; 

            const tiposRegConsolidado = ['C190', 'C590', 'D190', 'D590'];
            tiposRegConsolidado.forEach(tipoReg => {
                if (registros[tipoReg]) {
                    const layout = obterLayoutRegistro(tipoReg);
                    if (!layout) {
                        logger.warn(`Layout não encontrado para o registro ${tipoReg} na aba consolidada.`);
                        return;
                    }
                    
                    // Helper to get value from dados by field name, returns default if not found or field empty
                    const getValue = (dadosRegistro, fieldName, defaultValue = 0, isNumeric = true) => {
                        const index = layout.indexOf(fieldName);
                        if (index === -1 || index >= dadosRegistro.length || dadosRegistro[index] === '') {
                            return defaultValue;
                        }
                        const val = dadosRegistro[index];
                        if (isNumeric) {
                            const num = parseFloat(String(val).replace(',', '.'));
                            return isNaN(num) ? defaultValue : num;
                        }
                        return val; // For non-numeric like COD_OBS
                    };
                    
                    const getMinLength = (regLayout) => {
                        // Determine a reasonable minimum length, e.g., up to VL_ICMS or a key field
                        const keyFields = ['VL_ICMS', 'VL_OPR'];
                        let minIdx = 0;
                        keyFields.forEach(kf => {
                            let idx = regLayout.indexOf(kf);
                            if (idx > minIdx) minIdx = idx;
                        });
                        return minIdx + 1; // +1 because indexOf is 0-based and length is 1-based
                    };

                    const minExpectedDadosLength = getMinLength(layout);

                    registros[tipoReg].forEach(linhaCompleta => {
                        const dados = linhaCompleta.slice(1, -1); // Data fields for the current record

                        if (dados.length < minExpectedDadosLength) { // Basic check
                            // logger.warn(`Registro ${tipoReg} com menos campos (${dados.length}) que o esperado (${minExpectedDadosLength}). Linha: ${linhaCompleta.join('|')}`);
                            // continue; // Skip this line or handle as per requirements
                        }

                        const registroConsolidado = {
                            'Data': dataSped,
                            'CST_ICMS': parseInt(getValue(dados, 'CST_ICMS', '0', false)) || 0, // CST is not float
                            'CFOP': parseInt(getValue(dados, 'CFOP', '0', false)) || 0, // CFOP is not float
                            'ALIQ_ICMS': getValue(dados, 'ALIQ_ICMS', 0),
                            'VL_OPR': getValue(dados, 'VL_OPR', 0),
                            'VL_BC_ICMS': getValue(dados, 'VL_BC_ICMS', 0),
                            'VL_ICMS': getValue(dados, 'VL_ICMS', 0),
                            'VL_BC_ICMS_ST': getValue(dados, 'VL_BC_ICMS_ST', 0),
                            'VL_ICMS_ST': getValue(dados, 'VL_ICMS_ST', 0),
                            'VL_RED_BC': getValue(dados, 'VL_RED_BC', 0),
                            'VL_IPI': getValue(dados, 'VL_IPI', 0),
                            'COD_OBS': getValue(dados, 'COD_OBS', '', false),
                            'Tipo_Registro': tipoReg
                        };
                        registrosDadosConsolidados.push(registroConsolidado);

                        worksheet.cell(currentRow, 1).value(registroConsolidado.Data).style(dateStyle);
                        worksheet.cell(currentRow, 2).value(registroConsolidado.CST_ICMS).style(codeStyle);
                        worksheet.cell(currentRow, 3).value(registroConsolidado.CFOP).style(codeStyle);
                        worksheet.cell(currentRow, 4).value(registroConsolidado.ALIQ_ICMS).style(numStyle);
                        worksheet.cell(currentRow, 5).value(registroConsolidado.VL_OPR).style(numStyle);
                        worksheet.cell(currentRow, 6).value(registroConsolidado.VL_BC_ICMS).style(numStyle);
                        worksheet.cell(currentRow, 7).value(registroConsolidado.VL_ICMS).style(numStyle);
                        worksheet.cell(currentRow, 8).value(registroConsolidado.VL_BC_ICMS_ST).style(numStyle);
                        worksheet.cell(currentRow, 9).value(registroConsolidado.VL_ICMS_ST).style(numStyle);
                        worksheet.cell(currentRow, 10).value(registroConsolidado.VL_RED_BC).style(numStyle);
                        worksheet.cell(currentRow, 11).value(registroConsolidado.VL_IPI).style(numStyle);
                        worksheet.cell(currentRow, 12).value(registroConsolidado.COD_OBS).style(cellStyle);
                        worksheet.cell(currentRow, 13).value(registroConsolidado.Tipo_Registro).style(cellStyle);
                        currentRow++;
                    });
                }
            });

            // Tabela de Conferência (using registrosDadosConsolidados)
            const ultimaColunaDados = colunasOrdem.length;
            const inicioConferenciaCol = ultimaColunaDados + 2;
            const linhaInicioConferencia = 3;

            worksheet.cell(linhaInicioConferencia, inicioConferenciaCol).value("Tipo de Registro").style(headerStyle);
            worksheet.cell(linhaInicioConferencia, inicioConferenciaCol + 1).value("Registros na Origem").style(headerStyle);
            worksheet.cell(linhaInicioConferencia, inicioConferenciaCol + 2).value("Registros Consolidados").style(headerStyle);
            worksheet.cell(linhaInicioConferencia, inicioConferenciaCol + 3).value("Status").style(headerStyle);

            const statusOkStyle = { border: true, fill: "C6EFCE", fontColor: "006100", bold: true };
            const statusDivergenteStyle = { border: true, fill: "FFC7CE", fontColor: "9C0006", bold: true };
            const intStyle = { numberFormat: "#,##0", border: true };

            let linhaAtualConf = linhaInicioConferencia + 1;
            tiposRegConsolidado.forEach(tipoReg => { // Iterate again for the conference table
                const qtdOrigem = registros[tipoReg] ? registros[tipoReg].length : 0;
                const qtdConsolidado = registrosDadosConsolidados.filter(r => r.Tipo_Registro === tipoReg).length;
                const status = (qtdOrigem === qtdConsolidado) ? "OK" : "DIVERGENTE";
                const statusStyleToApply = (status === "OK") ? statusOkStyle : statusDivergenteStyle;

                worksheet.cell(linhaAtualConf, inicioConferenciaCol).value(tipoReg).style(cellStyle);
                worksheet.cell(linhaAtualConf, inicioConferenciaCol + 1).value(qtdOrigem).style(intStyle);
                worksheet.cell(linhaAtualConf, inicioConferenciaCol + 2).value(qtdConsolidado).style(intStyle);
                worksheet.cell(linhaAtualConf, inicioConferenciaCol + 3).value(status).style(statusStyleToApply);
                linhaAtualConf++;
            });

            for (let i = 1; i <= ultimaColunaDados; i++) worksheet.column(i).width(15);
            worksheet.column(inicioConferenciaCol).width(20);
            worksheet.column(inicioConferenciaCol + 1).width(20);
            worksheet.column(inicioConferenciaCol + 2).width(22);
            worksheet.column(inicioConferenciaCol + 3).width(15);

            logger.info("_criarAbaConsolidada (JS) concluída.");
        } catch (e) {
            logger.error(`Erro em _criarAbaConsolidada (JS): ${e.message}`);
            console.error(e); 
            throw e;
        }
    }


    /**
     * Placeholder for _processarOutrasObrigacoes (C197, D197)
     * context: { registros, writer, logger }
     */
    async function _processarOutrasObrigacoes(context) {
        const { registros, writer, logger } = context;
        logger.info("Iniciando _processarOutrasObrigacoes (JS)...");

        try {
            const layout197 = ['REG', 'COD_AJ', 'DESCR_COMPL_AJ', 'COD_ITEM',
                               'VL_BC_ICMS', 'ALIQ_ICMS', 'VL_ICMS', 'VL_OUTROS'];
            const registros197Data = [];

            ['C197', 'D197'].forEach(tipoReg => {
                if (registros[tipoReg]) {
                    registros[tipoReg].forEach(linhaCompleta => {
                        const registro = linhaCompleta.slice(1, -1); // Remove leading/trailing empty strings
                        // Pad if necessary
                        const paddedRegistro = [...registro];
                        while (paddedRegistro.length < layout197.length) {
                            paddedRegistro.push('');
                        }
                        registros197Data.push(paddedRegistro.slice(0, layout197.length)); // Ensure correct length
                    });
                }
            });

            if (registros197Data.length > 0) {
                const worksheet = writer.addSheet('Outras_Obrigacoes_197');
                const headerStyle = { bold: true, fill: "D7E4BC", border: true, wrapText: true, verticalAlignment: 'top' };
                const numStyle = { numberFormat: "#,##0.00", border: true };
                const defaultCellStyle = { border: true };

                layout197.forEach((header, idx) => {
                    worksheet.cell(1, idx + 1).value(header).style(headerStyle);
                });

                const camposNumericosIndices = [4, 5, 6, 7]; // Indices in layout197

                registros197Data.forEach((row, rowIdx) => {
                    row.forEach((value, colIdx) => {
                        let cellValue = value;
                        // Determine the style: numeric gets numStyle, others get defaultCellStyle.
                        let currentStyle = defaultCellStyle; // Default for non-numeric cells with border

                        if (camposNumericosIndices.includes(colIdx)) {
                            // Attempt to convert to number only if it's a numeric column
                            if (String(value).trim() !== '') {
                                const num = parseFloat(String(value).replace(',', '.'));
                                cellValue = isNaN(num) ? 0 : num; // Use 0 if parsing fails, or original string? Python used fillna(0)
                            } else {
                                cellValue = 0; // Or null, depending on desired output for empty numeric strings
                            }
                            currentStyle = numStyle; // Apply numeric style
                        }
                        // Apply the determined style
                        worksheet.cell(rowIdx + 2, colIdx + 1).value(cellValue).style(currentStyle);
                    });
                });
                
                // Auto width
                layout197.forEach((col, i) => worksheet.column(i + 1).width(Math.max(col.length, 15) + 2));


                // Tabela Resumo 197
                await _criarTabelaResumo197(registros197Data, layout197, writer, logger);
            }

            logger.info("_processarOutrasObrigacoes (JS) concluída.");
        } catch (e) {
            logger.error(`Erro em _processarOutrasObrigacoes (JS): ${e.message}`);
            console.error(e);
            throw e;
        }
    }

    /**
     * Helper for _processarOutrasObrigacoes to create summary table.
     * df197Data: array of arrays (data for C197/D197)
     * layout197: column headers for df197Data
     */
    async function _criarTabelaResumo197(df197Data, layout197, writer, logger) {
        logger.info("Iniciando _criarTabelaResumo197 (JS)...");
        try {
            const vlIcmsIndex = layout197.indexOf('VL_ICMS');
            if (vlIcmsIndex === -1) {
                logger.error("Coluna VL_ICMS não encontrada no layout para resumo 197.");
                return;
            }

            const resumoMap = new Map(); // Key: "REG|COD_AJ|DESCR_COMPL_AJ", Value: { REG, COD_AJ, DESCR_COMPL_AJ, VL_ICMS_SUM }

            df197Data.forEach(row => {
                const reg = row[layout197.indexOf('REG')];
                const codAj = row[layout197.indexOf('COD_AJ')];
                const descrComplAj = row[layout197.indexOf('DESCR_COMPL_AJ')];
                let vlIcms = row[vlIcmsIndex];

                if (typeof vlIcms === 'string' && vlIcms.trim() !== '') {
                    vlIcms = parseFloat(vlIcms.replace(',', '.'));
                    if (isNaN(vlIcms)) vlIcms = 0;
                } else if (typeof vlIcms !== 'number') {
                    vlIcms = 0;
                }
                
                const key = `${reg}|${codAj}|${descrComplAj}`;
                if (!resumoMap.has(key)) {
                    resumoMap.set(key, { REG: reg, COD_AJ: codAj, DESCR_COMPL_AJ: descrComplAj, VL_ICMS_SUM: 0 });
                }
                resumoMap.get(key).VL_ICMS_SUM += vlIcms;
            });

            const resumoArray = Array.from(resumoMap.values());

            if (resumoArray.length > 0) {
                const worksheet = writer.addSheet('Resumo_Outras_Obrigacoes');
                const headerStyle = { bold: true, fill: "D7E4BC", border: true, wrapText: true, verticalAlignment: 'top' };
                const numStyle = { numberFormat: "#,##0.00", border: true };
                const defaultCellStyle = { border: true }; // Defined locally for clarity
                const headersResumo = ['REG', 'COD_AJ', 'DESCR_COMPL_AJ', 'VL_ICMS'];

                headersResumo.forEach((header, idx) => {
                    worksheet.cell(1, idx + 1).value(header).style(headerStyle);
                });

                resumoArray.forEach((row, rowIdx) => {
                    worksheet.cell(rowIdx + 2, 1).value(row.REG).style(defaultCellStyle);
                    worksheet.cell(rowIdx + 2, 2).value(row.COD_AJ).style(defaultCellStyle);
                    worksheet.cell(rowIdx + 2, 3).value(row.DESCR_COMPL_AJ).style(defaultCellStyle);
                    worksheet.cell(rowIdx + 2, 4).value(row.VL_ICMS_SUM).style(numStyle);
                });

                worksheet.column(1).width(15); // REG
                worksheet.column(2).width(20); // COD_AJ
                worksheet.column(3).width(50); // DESCR_COMPL_AJ
                worksheet.column(4).width(15); // VL_ICMS
            }
            logger.info("_criarTabelaResumo197 (JS) concluída.");
        } catch (e) {
            logger.error(`Erro em _criarTabelaResumo197 (JS): ${e.message}`);
            console.error(e);
            throw e;
        }
    }


    /**
     * Placeholder for _processar_registros_e110_e111
     * context: { registros, writer, logger }
     */
    async function _processarRegistrosE110E111(context) {
        const { registros, writer, logger } = context;
        logger.info("Iniciando _processarRegistrosE110E111 (JS)...");

        try {
            const layoutE110 = ['REG', 'VL_TOT_DEBITOS', 'VL_AJ_DEBITOS', 'VL_TOT_AJ_DEBITOS',
                                'VL_ESTORNOS_CRED', 'VL_TOT_CREDITOS', 'VL_AJ_CREDITOS',
                                'VL_TOT_AJ_CREDITOS', 'VL_ESTORNOS_DEB', 'VL_SLD_CREDOR_ANT',
                                'VL_SLD_APURADO', 'VL_TOT_DED', 'VL_ICMS_RECOLHER',
                                'VL_SLD_CREDOR_TRANSPORTAR', 'DEB_ESP'];
            const layoutE111 = ['REG', 'COD_AJ_APUR', 'DESCR_COMPL_AJ', 'VL_AJ_APUR'];

            const headerStyle = { bold: true, fill: "D7E4BC", border: true, wrapText: true, verticalAlignment: 'top' };
            const numStyle = { numberFormat: "#,##0.00", border: true };
            const defaultCellStyle = { border: true }; // Define default style for cells

            // Process E110
            if (registros['E110'] && registros['E110'].length > 0) {
                const sheetE110 = writer.sheet('E110') || writer.addSheet('E110');
                // Write headers only if it's a new sheet (or first time writing)
                if (sheetE110.cell(1,1).value() === null) { // Check if header is already written
                    layoutE110.forEach((header, idx) => {
                        sheetE110.cell(1, idx + 1).value(header).style(headerStyle);
                        sheetE110.column(idx + 1).width(Math.max(header.length, 15) + 2);
                    });
                }
                
                let e110RowOffset = sheetE110.usedRange() ? sheetE110.usedRange().endCell().rowNumber() : 1;
                if (e110RowOffset === 1 && sheetE110.cell(1,1).value() !== null) e110RowOffset = 1; // Header exists, start data at row 2
                else if (sheetE110.cell(1,1).value() === null) e110RowOffset = 0; // No header, start header at 1, data at 2
                
                registros['E110'].forEach(linhaCompleta => {
                    const dados = linhaCompleta.slice(1, -1);
                    dados.forEach((value, colIdx) => {
                        let cellValue = value;
                        let currentStyle = defaultCellStyle; // Start with default style
                        const colName = layoutE110[colIdx];

                        if (colName && (colName.startsWith('VL_') || colName.startsWith('DEB_'))) {
                            if (String(value).trim() !== '') {
                                const num = parseFloat(String(value).replace(',', '.'));
                                cellValue = isNaN(num) ? 0 : num;
                            } else {
                                cellValue = 0; // Default for empty numeric fields
                            }
                            currentStyle = numStyle; // Apply numeric style
                        }
                        sheetE110.cell(e110RowOffset + 1, colIdx + 1).value(cellValue).style(currentStyle);
                    });
                    e110RowOffset++;
                });
            }

            // Process E111
            if (registros['E111'] && registros['E111'].length > 0) {
                const sheetE111 = writer.sheet('E111') || writer.addSheet('E111');
                if (sheetE111.cell(1,1).value() === null) {
                    layoutE111.forEach((header, idx) => {
                        sheetE111.cell(1, idx + 1).value(header).style(headerStyle);
                        sheetE111.column(idx + 1).width(Math.max(header.length, 20) + 2);
                    });
                }

                let e111RowOffset = sheetE111.usedRange() ? sheetE111.usedRange().endCell().rowNumber() : 1;
                 if (e111RowOffset === 1 && sheetE111.cell(1,1).value() !== null) e111RowOffset = 1;
                 else if (sheetE111.cell(1,1).value() === null) e111RowOffset = 0;


                registros['E111'].forEach(linhaCompleta => {
                    const dados = linhaCompleta.slice(1, -1);
                    dados.forEach((value, colIdx) => {
                        let cellValue = value;
                        let currentStyle = defaultCellStyle; // Start with default style

                        if (layoutE111[colIdx] === 'VL_AJ_APUR') {
                            if (String(value).trim() !== '') {
                                const num = parseFloat(String(value).replace(',', '.'));
                                cellValue = isNaN(num) ? 0 : num;
                            } else {
                                cellValue = 0; // Default for empty numeric field
                            }
                            currentStyle = numStyle; // Apply numeric style
                        }
                        sheetE111.cell(e111RowOffset + 1, colIdx + 1).value(cellValue).style(currentStyle);
                    });
                    e111RowOffset++;
                });
            }
            context.e110E111Processado = true; // Mark as processed
            logger.info("_processarRegistrosE110E111 (JS) concluída.");
        } catch (e) {
            logger.error(`Erro em _processarRegistrosE110E111 (JS): ${e.message}`);
        console.error(e); // Log stack for debugging
            throw e;
        }
    }


    /**
     * Provides SPED record layouts (column names).
     * Mimics `obter_layout_registro` from Python.
     */
    function obterLayoutRegistro(tipoRegistro) {
        const layouts = {
            '0000': ['REG', 'COD_VER', 'COD_FIN', 'DT_INI', 'DT_FIN', 'NOME', 'CNPJ', 'CPF', 'UF', 'IE', 'COD_MUN', 'IM', 'SUFRAMA', 'IND_PERFIL', 'IND_ATIV'],
            'C100': ['REG', 'IND_OPER', 'IND_EMIT', 'COD_PART', 'COD_MOD', 'COD_SIT', 'SER', 'NUM_DOC', 'CHV_NFE', 'DT_DOC', 'DT_E_S', 'VL_DOC', 'IND_PGTO', 'VL_DESC', 'VL_ABAT_NT', 'VL_MERC', 'IND_FRT', 'VL_FRT', 'VL_SEG', 'VL_OUT_DA', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_IPI', 'VL_PIS', 'VL_COFINS', 'VL_PIS_ST', 'VL_COFINS_ST'],
            'C170': ['REG', 'NUM_ITEM', 'COD_ITEM', 'DESCR_COMPL', 'QTD', 'UNID', 'VL_ITEM', 'VL_DESC', 'IND_MOV', 'CST_ICMS', 'CFOP', 'COD_NAT', 'VL_BC_ICMS', 'ALIQ_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'ALIQ_ST', 'VL_ICMS_ST', 'IND_APUR', 'CST_IPI', 'COD_ENQ', 'VL_BC_IPI', 'ALIQ_IPI', 'VL_IPI', 'CST_PIS', 'VL_BC_PIS', 'ALIQ_PIS', 'QUANT_BC_PIS', 'VL_PIS', 'CST_COFINS', 'VL_BC_COFINS', 'ALIQ_COFINS', 'QUANT_BC_COFINS', 'VL_COFINS', 'COD_CTA', 'VL_ABAT_NT'],
            'C190': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC', 'VL_IPI', 'COD_OBS'],
            'C500': ['REG', 'IND_OPER', 'IND_EMIT', 'COD_PART', 'COD_MOD', 'COD_SIT', 'SER', 'SUB', 'COD_CONS', 'NUM_DOC', 'DT_DOC', 'DT_E_S', 'VL_DOC', 'VL_DESC', 'VL_FORN', 'VL_SERV_NT', 'VL_TERC', 'VL_DA', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'COD_INF', 'VL_PIS', 'VL_COFINS'],
            'C590': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC', 'COD_OBS'],
            'D100': ['REG', 'IND_OPER', 'IND_EMIT', 'COD_PART', 'COD_MOD', 'COD_SIT', 'SER', 'SUB', 'NUM_DOC', 'CHV_CTE', 'DT_DOC', 'DT_A_P', 'TP_CT-e', 'CHV_CTE_REF', 'VL_DOC', 'VL_DESC', 'IND_FRT', 'VL_SERV', 'VL_BC_ICMS', 'VL_ICMS', 'VL_NT', 'COD_INF', 'COD_CTA', 'COD_MUN_ORIG', 'COD_MUN_DEST'],
            'D190': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_RED_BC', 'COD_OBS'],
            'D500': ['REG', 'IND_OPER', 'IND_EMIT', 'COD_PART', 'COD_MOD', 'COD_SIT', 'SER', 'SUB', 'NUM_DOC', 'DT_DOC', 'DT_A_P', 'VL_DOC', 'VL_DESC', 'VL_SERV', 'VL_SERV_NT', 'VL_TERC', 'VL_DA', 'VL_BC_ICMS', 'VL_ICMS', 'COD_INF', 'VL_PIS', 'VL_COFINS', 'COD_CTA', 'TP_ASSINANTE'],
            'D590': ['REG', 'CST_ICMS', 'CFOP', 'ALIQ_ICMS', 'VL_OPR', 'VL_BC_ICMS', 'VL_ICMS', 'VL_BC_ICMS_ST', 'VL_ICMS_ST', 'VL_RED_BC', 'COD_OBS'],
            'E100': ['REG', 'DT_INI', 'DT_FIN'],
            'E110': ['REG', 'VL_TOT_DEBITOS', 'VL_AJ_DEBITOS', 'VL_TOT_AJ_DEBITOS', 'VL_ESTORNOS_CRED', 'VL_TOT_CREDITOS', 'VL_AJ_CREDITOS', 'VL_TOT_AJ_CREDITOS', 'VL_ESTORNOS_DEB', 'VL_SLD_CREDOR_ANT', 'VL_SLD_APURADO', 'VL_TOT_DED', 'VL_ICMS_RECOLHER', 'VL_SLD_CREDOR_TRANSPORTAR', 'DEB_ESP'],
            'E111': ['REG', 'COD_AJ_APUR', 'DESCR_COMPL_AJ', 'VL_AJ_APUR'],
            'E200': ['REG', 'UF', 'DT_INI', 'DT_FIN'],
            'E210': ['REG', 'IND_MOV_ST', 'VL_SLD_CRED_ANT_ST', 'VL_DEVOL_ST', 'VL_RESSARC_ST', 'VL_OUT_CRED_ST', 'VL_AJ_CREDITOS_ST', 'VL_RETENCAO_ST', 'VL_OUT_DEB_ST', 'VL_AJ_DEBITOS_ST', 'VL_SLD_DEV_ANT_ST', 'VL_DEDUCOES_ST', 'VL_ICMS_RECOL_ST', 'VL_SLD_CRED_ST_TRANSPORTAR', 'DEB_ESP_ST'],
            'E500': ['REG', 'IND_APUR', 'DT_INI', 'DT_FIN'],
            'E510': ['REG', 'CFOP', 'CST_IPI', 'VL_CONT_IPI', 'VL_BC_IPI', 'VL_IPI'],
            'E520': ['REG', 'VL_SD_ANT_IPI', 'VL_DEB_IPI', 'VL_CRED_IPI', 'VL_OD_IPI', 'VL_OC_IPI', 'VL_SC_IPI', 'VL_SD_IPI']
            // Add other layouts as needed from the Python script
        };
        return layouts[tipoRegistro] || null;
    }

    // --- UI Update Functions ---
    function updateStatus(message, progressPercent = -1, error = false, indeterminate = false) {
        statusMessage.textContent = message;
        if (error) {
            statusMessage.style.color = ''; // Remove direct style if CSS class handles it
            statusMessage.classList.add('error'); // Add error class
            progressBar.style.backgroundColor = '#ff8a80'; // Error color for progress bar (can also be class-based)
            // For progress bar container border, if you want to change it too:
            // if (progressBar.parentElement.classList.contains('progress-bar-container-style')) {
            //     progressBar.parentElement.style.borderColor = '#ff8a80'; 
            // }
        } else {
            statusMessage.style.color = ''; // Remove direct style
            statusMessage.classList.remove('error'); // Remove error class
            progressBar.style.backgroundColor = ''; // Revert to CSS default or specific color
            // Revert progress bar container border if changed for error
            // if (progressBar.parentElement.classList.contains('progress-bar-container-style')) {
            //    progressBar.parentElement.style.borderColor = ''; // Revert to CSS default
            // }
        }
        
        // Update progress text inside the bar
        if (progressPercent >= 0 && !indeterminate) {
            progressBar.textContent = `${Math.round(progressPercent)}%`;
        } else if (indeterminate) {
             progressBar.textContent = ''; // No text for indeterminate
        } else if (error) {
            progressBar.textContent = 'Erro!';
        }


        if (indeterminate) {
            progressBar.classList.add('indeterminate');
            progressBar.style.width = '100%'; 
        } else {
            progressBar.classList.remove('indeterminate');
            if (progressPercent >= 0) {
                progressBar.style.width = `${progressPercent}%`;
            } else {
                progressBar.style.width = '0%'; // Reset on error if no specific progress
            }
        }
    }

    function showError(message) {
        console.error("Interface Error:", message);
        addLog(`ERRO UI: ${message}`, 'error'); // Log the UI error
        updateStatus(`Erro: ${message}`, -1, true); 
    }

    /**
     * Finalizes the conversion process UI-wise.
     * Mimics `conversao_concluida` from Python.
     */
    function conversaoConcluida(sucesso, mensagemOuErro = "") {
        progressBar.classList.remove('indeterminate');
        progressBar.style.width = sucesso ? '100%' : progressBar.style.width; 
        convertButton.disabled = false;

        if (sucesso) {
            updateStatus("Conversão concluída com sucesso!", 100);
            addLog(`Arquivo Excel "${mensagemOuErro}" gerado com sucesso.`, 'success');
            addLog("Log encerrado com sucesso.", 'success'); // Final success log
            // console.log("Sucesso! Arquivo Excel gerado: " + mensagemOuErro);
        } else {
            updateStatus(`Erro na conversão: ${mensagemOuErro}`, -1, true); // updateStatus adds .error class
            addLog(`ERRO NA CONVERSÃO: ${mensagemOuErro}`, 'error');
            addLog("Log encerrado com falha.", 'error'); // Final error log
            // console.error(`Erro na conversão: ${mensagemOuErro}`);
        }
    }

    // --- New Logging Function ---
    function addLog(message, type = 'info') {
        if (!logWindow) return;

        const logEntry = document.createElement('div'); // Or 'p'
        logEntry.classList.add('log-message');
        logEntry.classList.add(`log-${type}`); // e.g., log-info, log-error, log-success, log-warn
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        logWindow.appendChild(logEntry);
        logWindow.scrollTop = logWindow.scrollHeight; // Auto-scroll to bottom
    }

    // --- Function to clear logs ---
    function clearLogs() {
        if (logWindow) {
            logWindow.innerHTML = '';
        }
        addLog("Log inicializado. Aguardando ação...", "info");
    }


    // Initialize UI
    // updateStatus("Aguardando arquivo SPED..."); // Initial status is now set by clearLogs
    excelFileNameInput.placeholder = "NomeDoArquivoModerno.xlsx"; // From new HTML
    clearLogs(); // Initialize log area and set initial status message via addLog

}); // End DOMContentLoaded
