const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Arquivo SPED real para teste
const SPED_FILE_PATH = '/Users/ceciliodaher/Documents/git/difal/documentos/13158698000110-106379704-20250101-20250131-1-DED4E284399363BC7F1F48E5A39EE85261E47B67-SPED-EFD.txt';

// Diretório para screenshots e logs
const TEST_RESULTS_DIR = path.join(__dirname, 'test-results', `run-${Date.now()}`);

// Criar diretório de resultados
if (!fs.existsSync(TEST_RESULTS_DIR)) {
    fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

// Logger para capturar todos os eventos
class TestLogger {
    constructor(logFile) {
        this.logFile = path.join(TEST_RESULTS_DIR, logFile);
        this.logs = [];
    }

    log(type, message, details = {}) {
        const entry = {
            timestamp: new Date().toISOString(),
            type,
            message,
            details
        };
        this.logs.push(entry);
        console.log(`[${type}] ${message}`, details);
        
        // Salvar incrementalmente
        fs.appendFileSync(this.logFile, JSON.stringify(entry) + '\n');
    }

    save() {
        fs.writeFileSync(
            this.logFile.replace('.log', '-complete.json'),
            JSON.stringify(this.logs, null, 2)
        );
    }
}

async function runSinglePeriodWorkflowTest() {
    const logger = new TestLogger('test-execution.log');
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 500 // Slow down for visibility
    });
    
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Capturar logs do console
    page.on('console', msg => {
        logger.log('console', msg.text(), { type: msg.type() });
    });
    
    // Capturar erros da página
    page.on('pageerror', error => {
        logger.log('error', 'Page error detected', { 
            message: error.message,
            stack: error.stack 
        });
    });
    
    // Capturar requisições de rede (para debug)
    page.on('requestfailed', request => {
        logger.log('network', 'Request failed', {
            url: request.url(),
            failure: request.failure()
        });
    });

    try {
        // ========== ETAPA 1: CARREGAR APLICAÇÃO ==========
        logger.log('step', '1. Carregando aplicação');
        await page.goto('file://' + path.resolve(__dirname, 'sistema.html'));
        await page.waitForLoadState('networkidle');
        await page.screenshot({ 
            path: path.join(TEST_RESULTS_DIR, '01-initial-load.png'),
            fullPage: true 
        });
        
        // Verificar se a tela de seleção de modo está visível
        const modeSelectionVisible = await page.locator('#mode-selection-section').isVisible();
        logger.log('check', 'Tela de seleção de modo visível', { visible: modeSelectionVisible });
        
        if (!modeSelectionVisible) {
            throw new Error('Tela de seleção de modo não está visível');
        }

        // ========== ETAPA 2: SELECIONAR MODO PERÍODO ÚNICO ==========
        logger.log('step', '2. Selecionando modo período único');
        
        // Clicar no card de período único
        const singleModeCard = page.locator('#single-mode-card');
        await singleModeCard.waitFor({ state: 'visible', timeout: 5000 });
        await singleModeCard.click();
        
        // Aguardar um momento para processar
        await page.waitForTimeout(1000);
        
        // Verificar se botão de confirmação apareceu
        const confirmButton = page.locator('#confirm-mode-btn');
        if (await confirmButton.isVisible()) {
            logger.log('action', 'Confirmando seleção de modo');
            await confirmButton.click();
        }
        
        await page.screenshot({ 
            path: path.join(TEST_RESULTS_DIR, '02-mode-selected.png'),
            fullPage: true 
        });
        
        // Aguardar navegação para seção de upload
        await page.waitForTimeout(2000);
        
        // ========== ETAPA 3: VERIFICAR NAVEGAÇÃO PARA UPLOAD ==========
        logger.log('step', '3. Verificando navegação para seção de upload');
        
        // Verificar se a seção single-upload está visível
        const uploadSection = page.locator('#single-upload-section');
        const uploadVisible = await uploadSection.isVisible();
        logger.log('check', 'Seção single-upload visível', { visible: uploadVisible });
        
        if (!uploadVisible) {
            // Tentar encontrar qual seção está ativa
            const allSections = await page.locator('.section').all();
            for (const section of allSections) {
                const id = await section.getAttribute('id');
                const isVisible = await section.isVisible();
                if (isVisible) {
                    logger.log('debug', `Seção visível: ${id}`);
                }
            }
        }
        
        await page.screenshot({ 
            path: path.join(TEST_RESULTS_DIR, '03-upload-section.png'),
            fullPage: true 
        });

        // ========== ETAPA 4: FAZER UPLOAD DO ARQUIVO SPED ==========
        logger.log('step', '4. Fazendo upload do arquivo SPED');
        
        // Localizar input de arquivo
        const fileInput = page.locator('#file-input');
        if (await fileInput.count() === 0) {
            logger.log('error', 'Input de arquivo não encontrado');
            throw new Error('Input de arquivo #file-input não encontrado');
        }
        
        // Fazer upload
        await fileInput.setInputFiles(SPED_FILE_PATH);
        logger.log('action', 'Arquivo SPED enviado', { file: SPED_FILE_PATH });
        
        // Aguardar processamento
        await page.waitForTimeout(5000);
        
        await page.screenshot({ 
            path: path.join(TEST_RESULTS_DIR, '04-file-uploaded.png'),
            fullPage: true 
        });
        
        // ========== ETAPA 5: VERIFICAR PROCESSAMENTO ==========
        logger.log('step', '5. Verificando processamento do arquivo');
        
        // Procurar por indicadores de sucesso
        const summaryExists = await page.locator('#sped-summary').count() > 0;
        const progressExists = await page.locator('.progress-bar').count() > 0;
        
        logger.log('check', 'Elementos de feedback', {
            summary: summaryExists,
            progress: progressExists
        });
        
        // ========== ETAPA 6: NAVEGAR PARA ANÁLISE ==========
        logger.log('step', '6. Navegando para seção de análise');
        
        const analysisButton = page.locator('[data-section="single-analysis-section"]');
        if (await analysisButton.isVisible()) {
            await analysisButton.click();
            await page.waitForTimeout(1000);
        }
        
        await page.screenshot({ 
            path: path.join(TEST_RESULTS_DIR, '05-analysis-section.png'),
            fullPage: true 
        });
        
        // ========== ETAPA 7: NAVEGAR PARA CÁLCULO ==========
        logger.log('step', '7. Navegando para seção de cálculo');
        
        // Usar seletor mais específico para evitar duplicação
        const calculationButton = page.locator('.nav-btn[data-section="single-calculation-section"]').first();
        if (await calculationButton.isVisible()) {
            await calculationButton.click();
            await page.waitForTimeout(1000);
        }
        
        await page.screenshot({ 
            path: path.join(TEST_RESULTS_DIR, '06-calculation-section.png'),
            fullPage: true 
        });
        
        // ========== ETAPA 8: EXECUTAR CÁLCULO ==========
        logger.log('step', '8. Executando cálculo DIFAL');
        
        const calculateButton = page.locator('#calculate-difal');
        if (await calculateButton.isVisible()) {
            await calculateButton.click();
            await page.waitForTimeout(3000);
        }
        
        await page.screenshot({ 
            path: path.join(TEST_RESULTS_DIR, '07-calculation-done.png'),
            fullPage: true 
        });
        
        // ========== ETAPA 9: NAVEGAR PARA RESULTADOS ==========
        logger.log('step', '9. Navegando para seção de resultados');
        
        const resultsButton = page.locator('[data-section="single-results-section"]');
        if (await resultsButton.isVisible()) {
            await resultsButton.click();
            await page.waitForTimeout(1000);
        }
        
        await page.screenshot({ 
            path: path.join(TEST_RESULTS_DIR, '08-results-section.png'),
            fullPage: true 
        });
        
        // ========== ETAPA 10: TESTAR EXPORTAÇÃO ==========
        logger.log('step', '10. Testando exportação');
        
        const exportButton = page.locator('#export-excel');
        if (await exportButton.isVisible()) {
            logger.log('action', 'Botão de exportação encontrado');
            // Não clicar realmente para evitar download
        }
        
        await page.screenshot({ 
            path: path.join(TEST_RESULTS_DIR, '09-export-ready.png'),
            fullPage: true 
        });
        
        logger.log('success', '✅ Teste concluído com sucesso!');
        
    } catch (error) {
        logger.log('error', '❌ Erro durante teste', {
            message: error.message,
            stack: error.stack
        });
        
        // Screenshot de erro
        await page.screenshot({ 
            path: path.join(TEST_RESULTS_DIR, 'error-state.png'),
            fullPage: true 
        });
        
        throw error;
    } finally {
        logger.save();
        await browser.close();
        
        console.log('\n📁 Resultados salvos em:', TEST_RESULTS_DIR);
        console.log('📸 Screenshots capturados');
        console.log('📝 Logs completos salvos');
    }
}

// Executar teste
runSinglePeriodWorkflowTest()
    .then(() => {
        console.log('\n✅ TESTE COMPLETADO COM SUCESSO!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ TESTE FALHOU:', error.message);
        console.log('\nVerifique os logs e screenshots em:', TEST_RESULTS_DIR);
        process.exit(1);
    });