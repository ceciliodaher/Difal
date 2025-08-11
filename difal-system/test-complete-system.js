/**
 * Teste Playwright Completo do Sistema DIFAL
 * Testa todo o fluxo: Upload → Análise → Configuração → Cálculo → Exportação
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Criar arquivo SPED de teste completo
function createCompleteTestSpedFile() {
    const testSpedContent = `|0000|001|0|1|2024|01|31|12345678000195|EMPRESA TESTE DIFAL LTDA|SP|14000000000111|SP|123|
|0001|0|
|0100|EMPRESA TESTE DIFAL LTDA|12345678000195|SP|Rua Teste, 123|Bairro Teste|14000000|São Paulo|1611|11999998888|SP|MATRIZ|
|0150|12345678000195|EMPRESA TESTE DIFAL LTDA|SP|IE1234567890|IM12345|
|0200|01|PRODUTO TESTE USO CONSUMO|UN|12345678|82011000|A|
|0200|02|PRODUTO TESTE ATIVO IMOBILIZADO|UN|12345679|84716090|A|
|0200|03|PRODUTO TESTE SEM NCM|UN|12345680||A|
|C100|0|1|NF|55|1|123|20240115|20240115|12345678000195|CLIENTE INTERESTADUAL|RJ|98765432000110|IE9876543210|1500.00|0.00|1500.00|000|0.00|0.00|0.00|0.00|0.00|1500.00|0|0.00|0||||||0|
|C170|01|PRODUTO TESTE USO CONSUMO|UN|5.00|200.00|0.00|6108|60|00|17|0.00|0.00|0.00|0.00|0.00|1000.00|82011000|
|C170|02|PRODUTO TESTE ATIVO IMOBILIZADO|UN|2.00|250.00|0.00|1551|00|00|17|0.00|0.00|0.00|0.00|0.00|500.00|84716090|
|C100|0|1|NF|55|1|124|20240116|20240116|12345678000195|CLIENTE INTERESTADUAL 2|MG|11111111000111|IE1111111111|2000.00|0.00|2000.00|000|0.00|0.00|0.00|0.00|0.00|2000.00|0|0.00|0||||||0|
|C170|01|PRODUTO TESTE USO CONSUMO|UN|10.00|200.00|0.00|6108|60|00|17|0.00|0.00|0.00|0.00|0.00|2000.00|82011000|
|C100|0|1|NF|55|1|125|20240117|20240117|12345678000195|CLIENTE INTERESTADUAL 3|RS|22222222000122|IE2222222222|800.00|0.00|800.00|000|0.00|0.00|0.00|0.00|0.00|800.00|0|0.00|0||||||0|
|C170|03|PRODUTO TESTE SEM NCM|UN|4.00|200.00|0.00|6108|60|00|17|0.00|0.00|0.00|0.00|0.00|800.00||
|C990|8|
|9999|10|`;
    
    const testFilePath = path.join(__dirname, 'sped-test-completo.txt');
    fs.writeFileSync(testFilePath, testSpedContent, 'utf8');
    return testFilePath;
}

test.describe('Sistema DIFAL - Teste Completo End-to-End', () => {
    let testFilePath;

    test.beforeAll(() => {
        testFilePath = createCompleteTestSpedFile();
        console.log('📄 Arquivo SPED de teste criado:', testFilePath);
    });

    test.afterAll(() => {
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
            console.log('🗑️ Arquivo SPED de teste deletado');
        }
    });

    test('Fluxo Completo: Upload → Análise → Configuração → Cálculo → Exportação', async ({ page }) => {
        console.log('🚀 === INICIANDO TESTE COMPLETO DO SISTEMA DIFAL ===');

        // === FASE 1: INICIALIZAÇÃO DO SISTEMA ===
        console.log('🔧 FASE 1: Inicializando sistema...');
        
        await page.goto('file://' + path.resolve(__dirname, 'sistema.html'));
        
        // Aguardar inicialização completa
        await page.waitForFunction(() => {
            return window.difalApp && 
                   window.uiManager && 
                   window.EventBus && 
                   window.StateManager &&
                   window.DifalCalculator;
        }, { timeout: 15000 });

        console.log('✅ Sistema inicializado com sucesso');

        // Verificar se está na seção de upload
        const uploadSection = page.locator('#upload-section');
        await expect(uploadSection).toHaveClass(/active/);

        // === FASE 2: UPLOAD DO ARQUIVO SPED ===
        console.log('📤 FASE 2: Realizando upload do arquivo SPED...');

        const fileInput = page.locator('#file-input');
        await fileInput.setInputFiles(testFilePath);

        // Aguardar processamento do upload
        await page.waitForFunction(() => {
            return window.spedData && window.spedData.itensDifal && window.spedData.itensDifal.length > 0;
        }, { timeout: 20000 });

        // Verificar dados processados
        const spedData = await page.evaluate(() => window.spedData);
        expect(spedData.itensDifal.length).toBeGreaterThan(0);
        
        console.log(`✅ Upload concluído: ${spedData.itensDifal.length} itens DIFAL identificados`);
        console.log(`📊 Empresa: ${spedData.dadosEmpresa.razaoSocial} (${spedData.dadosEmpresa.uf})`);

        // Verificar se o botão de prosseguir apareceu
        const proceedBtn = page.locator('#proceed-calculation');
        await expect(proceedBtn).toBeVisible();

        // === FASE 3: NAVEGAÇÃO PARA ANÁLISE ===
        console.log('🔍 FASE 3: Navegando para análise dos dados...');

        await proceedBtn.click();
        await page.waitForTimeout(1000);

        // Verificar se mudou para seção de análise
        const analysisSection = page.locator('#analysis-section');
        await expect(analysisSection).toHaveClass(/active/);

        // Verificar informações da empresa
        const companyName = page.locator('#company-name');
        await expect(companyName).toContainText('EMPRESA TESTE DIFAL LTDA');

        const companyUF = page.locator('#company-uf');
        await expect(companyUF).toContainText('SP');

        // Verificar se tabela de itens foi criada
        const itemsTable = page.locator('#difal-items-table table');
        await expect(itemsTable).toBeVisible();

        console.log('✅ Análise dos dados exibida corretamente');

        // === FASE 4: CONFIGURAÇÃO E CÁLCULO DIFAL ===
        console.log('⚙️ FASE 4: Abrindo configuração e realizando cálculo...');

        const calculateBtn = page.locator('#calculate-difal');
        await calculateBtn.click();

        // Aguardar modal de configuração abrir
        await page.waitForTimeout(1000);
        const configModal = page.locator('#config-modal');
        await expect(configModal).not.toHaveClass(/hidden/);

        console.log('🎯 Modal de configuração aberto');

        // Configurar metodologia
        const metodologiaAuto = page.locator('input[name="metodologia"][value="auto"]');
        await metodologiaAuto.check();

        // Configurar benefício global de teste (carga efetiva)
        const cargaEfetiva = page.locator('#carga-efetiva');
        await cargaEfetiva.fill('4.0');

        // Verificar percentual destinatário
        const percentualDestinatario = page.locator('#percentual-destinatario');
        await expect(percentualDestinatario).toHaveValue('100');

        console.log('⚙️ Configurações definidas: Metodologia Auto, Carga Efetiva 4%');

        // Calcular sem configuração individual
        const calcularSemConfig = page.locator('button[onclick="calcularSemConfiguracaoItens()"]');
        await calcularSemConfig.click();

        // Aguardar modal fechar
        await expect(configModal).toHaveClass(/hidden/);

        // Aguardar cálculo ser processado
        console.log('🔄 Processando cálculo DIFAL...');
        
        await page.waitForFunction(() => {
            return window.difalResults && 
                   window.difalResults.resultados && 
                   window.difalResults.resultados.length > 0;
        }, { timeout: 30000 });

        const results = await page.evaluate(() => window.difalResults);
        expect(results.resultados.length).toBeGreaterThan(0);

        console.log(`✅ Cálculo concluído: ${results.resultados.length} itens calculados`);
        console.log(`💰 DIFAL Total: R$ ${results.totalizadores?.totalDifal?.toFixed(2) || '0.00'}`);
        console.log(`💸 FCP Total: R$ ${results.totalizadores?.totalFcp?.toFixed(2) || '0.00'}`);

        // === FASE 5: VERIFICAÇÃO DOS RESULTADOS ===
        console.log('📊 FASE 5: Verificando resultados do cálculo...');

        // Verificar se seção de resultados está visível
        const calculationResults = page.locator('#calculation-results');
        await expect(calculationResults).not.toHaveClass(/hidden/);

        // Verificar resumo dos resultados
        const resultsSummary = page.locator('#results-summary');
        await expect(resultsSummary).toBeVisible();

        // Verificar detalhes dos resultados
        const resultsDetail = page.locator('#results-detail');
        await expect(resultsDetail).toBeVisible();

        // Verificar botões de exportação
        const exportExcel = page.locator('#export-excel');
        const exportPdf = page.locator('#export-pdf');
        await expect(exportExcel).toBeVisible();
        await expect(exportPdf).toBeVisible();

        console.log('✅ Interface de resultados carregada corretamente');

        // === FASE 6: TESTE DE FUNCIONALIDADES AVANÇADAS ===
        console.log('🔬 FASE 6: Testando funcionalidades avançadas...');

        // Testar memória de cálculo (se disponível)
        const memoriaCalculo = await page.evaluate(() => {
            const firstResult = window.difalResults?.resultados?.[0];
            return firstResult ? firstResult.memoriaCalculo : null;
        });

        if (memoriaCalculo) {
            console.log('✅ Memória de cálculo disponível');
        }

        // Verificar estado do sistema
        const systemState = await page.evaluate(() => ({
            spedLoaded: !!window.spedData,
            itemCount: window.spedData?.itensDifal?.length || 0,
            resultsAvailable: !!window.difalResults,
            calculatedItemsCount: window.difalResults?.resultados?.length || 0,
            uploadManagerReady: !!window.uiManager?.fileUploadManager,
            isProcessing: window.uiManager?.fileUploadManager?.isProcessing || false
        }));

        console.log('🔍 Estado do sistema:', systemState);

        expect(systemState.spedLoaded).toBe(true);
        expect(systemState.itemCount).toBeGreaterThan(0);
        expect(systemState.resultsAvailable).toBe(true);
        expect(systemState.calculatedItemsCount).toBeGreaterThan(0);
        expect(systemState.uploadManagerReady).toBe(true);
        expect(systemState.isProcessing).toBe(false);

        console.log('✅ Estado do sistema verificado');

        // === FASE 7: TESTE DE EXPORTAÇÃO ===
        console.log('📥 FASE 7: Testando funcionalidade de exportação...');

        // Simular download (não vamos fazer download real, mas verificar se função existe)
        const exportFunctionExists = await page.evaluate(() => {
            return typeof window.uiManager?.exportManager?.exportToExcel === 'function';
        });

        expect(exportFunctionExists).toBe(true);
        console.log('✅ Funcionalidades de exportação disponíveis');

        // === FASE 8: TESTE DE NAVEGAÇÃO ===
        console.log('🧭 FASE 8: Testando navegação entre seções...');

        // Navegar de volta para upload
        const navUpload = page.locator('.nav-btn[data-section="upload-section"]');
        await navUpload.click();
        await page.waitForTimeout(500);

        const uploadSectionAgain = page.locator('#upload-section');
        await expect(uploadSectionAgain).toHaveClass(/active/);

        // Navegar para análise
        const navAnalysis = page.locator('.nav-btn[data-section="analysis-section"]');
        await navAnalysis.click();
        await page.waitForTimeout(500);

        await expect(analysisSection).toHaveClass(/active/);

        // Navegar para cálculo
        const navCalculation = page.locator('.nav-btn[data-section="calculation-section"]');
        await navCalculation.click();
        await page.waitForTimeout(500);

        const calculationSection = page.locator('#calculation-section');
        await expect(calculationSection).toHaveClass(/active/);

        console.log('✅ Navegação entre seções funcionando');

        // === RELATÓRIO FINAL ===
        console.log('🎉 === TESTE COMPLETO FINALIZADO COM SUCESSO ===');
        console.log('📋 RESUMO DO TESTE:');
        console.log(`   ✅ Sistema inicializado corretamente`);
        console.log(`   ✅ Upload SPED processado (${systemState.itemCount} itens)`);
        console.log(`   ✅ Análise dos dados exibida`);
        console.log(`   ✅ Configuração e cálculo realizados`);
        console.log(`   ✅ Resultados calculados (${systemState.calculatedItemsCount} itens)`);
        console.log(`   ✅ Interface de exportação disponível`);
        console.log(`   ✅ Navegação entre seções funcional`);
        console.log(`   ✅ Estado do sistema consistente`);
    });

    test('Teste de Estresse: Múltiplos Uploads Consecutivos', async ({ page }) => {
        console.log('💪 === TESTE DE ESTRESSE: MÚLTIPLOS UPLOADS ===');

        await page.goto('file://' + path.resolve(__dirname, 'sistema.html'));
        
        await page.waitForFunction(() => {
            return window.difalApp && window.uiManager;
        }, { timeout: 15000 });

        const fileInput = page.locator('#file-input');

        for (let i = 1; i <= 3; i++) {
            console.log(`📤 Upload ${i}/3...`);

            // Limpar estado anterior
            await page.evaluate(() => {
                if (window.uiManager?.fileUploadManager?.clearCurrentFile) {
                    window.uiManager.fileUploadManager.clearCurrentFile();
                }
            });

            await fileInput.setInputFiles(testFilePath);

            await page.waitForFunction(() => {
                return window.spedData && window.spedData.itensDifal;
            }, { timeout: 15000 });

            const uploadState = await page.evaluate(() => ({
                itemCount: window.spedData?.itensDifal?.length || 0,
                isProcessing: window.uiManager?.fileUploadManager?.isProcessing || false
            }));

            expect(uploadState.itemCount).toBeGreaterThan(0);
            expect(uploadState.isProcessing).toBe(false);

            console.log(`   ✅ Upload ${i} concluído (${uploadState.itemCount} itens)`);
            
            await page.waitForTimeout(1000);
        }

        console.log('✅ Teste de estresse concluído com sucesso');
    });

    test('Teste de Recuperação de Erro', async ({ page }) => {
        console.log('🚨 === TESTE DE RECUPERAÇÃO DE ERRO ===');

        await page.goto('file://' + path.resolve(__dirname, 'sistema.html'));
        
        await page.waitForFunction(() => {
            return window.difalApp && window.uiManager;
        }, { timeout: 15000 });

        // Criar arquivo inválido
        const invalidFilePath = path.join(__dirname, 'invalid-sped.txt');
        fs.writeFileSync(invalidFilePath, 'ARQUIVO INVÁLIDO SEM FORMATO SPED', 'utf8');

        try {
            const fileInput = page.locator('#file-input');
            await fileInput.setInputFiles(invalidFilePath);

            // Aguardar erro ser processado
            await page.waitForTimeout(3000);

            // Verificar que o sistema não travou
            const systemState = await page.evaluate(() => ({
                isProcessing: window.uiManager?.fileUploadManager?.isProcessing || false,
                hasError: document.getElementById('status-message')?.textContent?.includes('Erro') || false
            }));

            expect(systemState.isProcessing).toBe(false);
            console.log('✅ Sistema não travou após erro');

            // Tentar upload válido após erro
            await page.evaluate(() => {
                if (window.uiManager?.fileUploadManager?.clearCurrentFile) {
                    window.uiManager.fileUploadManager.clearCurrentFile();
                }
            });

            await fileInput.setInputFiles(testFilePath);

            await page.waitForFunction(() => {
                return window.spedData && window.spedData.itensDifal;
            }, { timeout: 15000 });

            const recoveryState = await page.evaluate(() => ({
                itemCount: window.spedData?.itensDifal?.length || 0,
                isProcessing: window.uiManager?.fileUploadManager?.isProcessing || false
            }));

            expect(recoveryState.itemCount).toBeGreaterThan(0);
            expect(recoveryState.isProcessing).toBe(false);

            console.log('✅ Sistema se recuperou do erro com sucesso');

        } finally {
            if (fs.existsSync(invalidFilePath)) {
                fs.unlinkSync(invalidFilePath);
            }
        }
    });

    test('Teste de Estados e Funcionalidades Modulares', async ({ page }) => {
        console.log('🧩 === TESTE DE MÓDULOS E ESTADOS ===');

        await page.goto('file://' + path.resolve(__dirname, 'sistema.html'));
        
        await page.waitForFunction(() => {
            return window.difalApp && window.uiManager;
        }, { timeout: 15000 });

        // Verificar módulos carregados
        const modulesStatus = await page.evaluate(() => ({
            eventBus: !!window.EventBus,
            stateManager: !!window.StateManager,
            fileUploadManager: !!window.uiManager?.fileUploadManager,
            exportManager: !!window.uiManager?.exportManager,
            modalManager: !!window.uiManager?.modalManager,
            resultsRenderer: !!window.uiManager?.resultsRenderer,
            navigationManager: !!window.uiManager?.navigationManager,
            progressManager: !!window.uiManager?.progressManager,
            configurationManager: !!window.uiManager?.configManager,
            spedParser: !!window.SpedParser,
            difalCalculator: !!window.DifalCalculator,
            utils: !!window.Utils
        }));

        console.log('📋 Status dos módulos:', modulesStatus);

        // Verificar que todos os módulos essenciais estão carregados
        Object.entries(modulesStatus).forEach(([module, loaded]) => {
            expect(loaded).toBe(true);
            console.log(`   ✅ ${module}: carregado`);
        });

        // Testar função de reset de emergência
        const resetFunctionExists = await page.evaluate(() => {
            return typeof window.resetUploadState === 'function';
        });
        expect(resetFunctionExists).toBe(true);
        console.log('   ✅ Função de reset de emergência disponível');

        // Testar EventBus
        const eventBusWorking = await page.evaluate(() => {
            let eventReceived = false;
            window.EventBus.on('TEST_EVENT', () => {
                eventReceived = true;
            });
            window.EventBus.emit('TEST_EVENT');
            return eventReceived;
        });
        expect(eventBusWorking).toBe(true);
        console.log('   ✅ EventBus funcionando');

        console.log('✅ Todos os módulos testados com sucesso');
    });
});