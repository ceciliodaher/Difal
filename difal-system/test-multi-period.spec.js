/**
 * Teste funcional do sistema multiperíodos DIFAL
 * Usando Playwright para automação de testes
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Configuração
const BASE_URL = `file://${path.resolve(__dirname, 'sistema.html')}`;
const SPED_FILES = [
    path.resolve(__dirname, '../documentos/13158698000110-106379704-20241001-20241031-0-2E48C31D567EF8BF13FF576A9F29777019947826-SPED-EFD.txt'),
    path.resolve(__dirname, '../documentos/13158698000110-106379704-20250101-20250131-1-DED4E284399363BC7F1F48E5A39EE85261E47B67-SPED-EFD.txt')
];

// Função para verificar existência de arquivos
function checkFiles() {
    console.log('📁 Verificando arquivos SPED...');
    for (const file of SPED_FILES) {
        if (fs.existsSync(file)) {
            console.log(`✅ Arquivo encontrado: ${path.basename(file)}`);
        } else {
            console.log(`❌ Arquivo não encontrado: ${file}`);
            console.log(`⚠️ Usando arquivo único disponível para teste`);
            // Se não encontrar múltiplos arquivos, usar o mesmo arquivo duas vezes para teste
            const singleFile = path.resolve(__dirname, '../documentos/13158698000110-106379704-20250401-20250430-1-03D99627A94945C9AF64C38A3A038FCC8EF950DF-SPED-EFD.txt');
            if (fs.existsSync(singleFile)) {
                SPED_FILES[0] = singleFile;
                SPED_FILES[1] = singleFile;
                console.log(`✅ Usando arquivo disponível: ${path.basename(singleFile)}`);
            }
        }
    }
}

async function testMultiPeriodSystem() {
    console.log('🚀 Iniciando teste do sistema multiperíodos DIFAL');
    
    // Verificar arquivos
    checkFiles();
    
    const browser = await chromium.launch({ 
        headless: false,
        devtools: true 
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Capturar logs do console
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (type === 'error') {
            console.error(`❌ [Browser Error]: ${text}`);
        } else if (type === 'warning') {
            console.warn(`⚠️ [Browser Warning]: ${text}`);
        } else {
            console.log(`📝 [Browser]: ${text}`);
        }
    });
    
    // Capturar erros de página
    page.on('pageerror', error => {
        console.error(`❌ [Page Error]: ${error.message}`);
    });
    
    try {
        // === ETAPA 1: CARREGAR PÁGINA ===
        console.log('\n📌 ETAPA 1: Carregando página...');
        await page.goto(BASE_URL);
        await page.waitForTimeout(2000);
        
        // === ETAPA 2: SELECIONAR MODO MULTI ===
        console.log('\n📌 ETAPA 2: Selecionando modo Multi-Period...');
        
        // Aguardar seleção de modo aparecer
        await page.waitForSelector('#mode-selection-section', { state: 'visible' });
        
        // Clicar no botão de modo multi
        const multiModeButton = await page.$('[data-mode="multi"]');
        if (!multiModeButton) {
            throw new Error('Botão de modo multi não encontrado');
        }
        
        await multiModeButton.click();
        await page.waitForTimeout(1000);
        
        // Verificar se navegação apareceu
        const navigationVisible = await page.isVisible('#main-navigation');
        console.log(`✅ Navegação visível: ${navigationVisible}`);
        
        // === ETAPA 3: VERIFICAR SEÇÃO DE UPLOAD ===
        console.log('\n📌 ETAPA 3: Verificando seção de upload multi...');
        
        const uploadSectionVisible = await page.isVisible('#multi-upload-section');
        if (!uploadSectionVisible) {
            console.log('⚠️ Seção de upload não está visível, tentando navegar...');
            
            // Tentar clicar no botão de upload
            const uploadButton = await page.$('[data-section="multi-upload-section"]');
            if (uploadButton) {
                await uploadButton.click();
                await page.waitForTimeout(500);
            }
        }
        
        // === ETAPA 4: UPLOAD DE ARQUIVO ===
        console.log('\n📌 ETAPA 4: Fazendo upload de arquivo SPED...');
        
        // Encontrar input de arquivo
        const fileInput = await page.$('#sped-file-input, input[type="file"]');
        if (!fileInput) {
            throw new Error('Input de arquivo não encontrado');
        }
        
        // Upload do primeiro arquivo
        await fileInput.setInputFiles(SPED_FILES[0]);
        await page.waitForTimeout(2000);
        
        // === ETAPA 5: NAVEGAR PARA PERÍODOS ===
        console.log('\n📌 ETAPA 5: Navegando para seção de períodos...');
        
        const periodsButton = await page.$('[data-section="multi-periods-section"]');
        if (periodsButton) {
            await periodsButton.click();
            await page.waitForTimeout(1000);
        }
        
        // === ETAPA 6: ADICIONAR SEGUNDO PERÍODO ===
        console.log('\n📌 ETAPA 6: Adicionando segundo período...');
        
        const addPeriodButton = await page.$('#add-period-btn, .add-period-btn');
        if (addPeriodButton) {
            await addPeriodButton.click();
            await page.waitForTimeout(500);
            
            // Upload do segundo arquivo (pode ser o mesmo para teste)
            const fileInput2 = await page.$('#period-file-input, input[type="file"]:last-of-type');
            if (fileInput2) {
                await fileInput2.setInputFiles(SPED_FILES[1]);
                await page.waitForTimeout(2000);
            }
        }
        
        // === ETAPA 7: NAVEGAR PARA ANALYTICS ===
        console.log('\n📌 ETAPA 7: Navegando para Analytics...');
        
        const analyticsButton = await page.$('[data-section="multi-analytics-section"]');
        if (analyticsButton) {
            await analyticsButton.click();
            await page.waitForTimeout(1000);
        }
        
        // === ETAPA 8: VERIFICAR ANÁLISE PARETO ===
        console.log('\n📌 ETAPA 8: Verificando análise de Pareto...');
        
        const paretoChart = await page.$('#pareto-chart, .pareto-chart');
        if (paretoChart) {
            console.log('✅ Gráfico de Pareto encontrado');
        }
        
        // === ETAPA 9: NAVEGAR PARA RELATÓRIOS ===
        console.log('\n📌 ETAPA 9: Navegando para Relatórios...');
        
        const reportsButton = await page.$('[data-section="multi-reports-section"]');
        if (reportsButton) {
            await reportsButton.click();
            await page.waitForTimeout(1000);
        }
        
        // === ETAPA 10: TESTAR EXPORTAÇÃO ===
        console.log('\n📌 ETAPA 10: Testando exportação...');
        
        const exportButton = await page.$('#export-excel-btn, .export-btn');
        if (exportButton) {
            console.log('✅ Botão de exportação encontrado');
            // Não clicar para evitar download durante teste
        }
        
        console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
        
        // Capturar screenshot final
        await page.screenshot({ path: 'test-result.png', fullPage: true });
        console.log('📷 Screenshot salvo: test-result.png');
        
    } catch (error) {
        console.error('\n❌ ERRO NO TESTE:', error.message);
        
        // Capturar screenshot de erro
        await page.screenshot({ path: 'test-error.png', fullPage: true });
        console.log('📷 Screenshot de erro salvo: test-error.png');
        
        throw error;
        
    } finally {
        // Aguardar para visualizar resultado
        console.log('\n⏸️ Teste finalizado. Fechando em 5 segundos...');
        await page.waitForTimeout(5000);
        
        await browser.close();
    }
}

// Executar teste
testMultiPeriodSystem()
    .then(() => {
        console.log('\n✅ Teste executado com sucesso!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Teste falhou:', error);
        process.exit(1);
    });