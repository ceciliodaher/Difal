/**
 * Teste de upload de arquivo multi-período
 */

const { chromium } = require('playwright');
const path = require('path');

async function testUploadMultiPeriod() {
    console.log('🚀 Teste de upload multi-período');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 2000
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Capturar erros
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.error(`❌ [Browser Error]: ${msg.text()}`);
        } else {
            console.log(`📝 [Browser]: ${msg.text()}`);
        }
    });
    
    try {
        const baseUrl = `file://${path.resolve(__dirname, 'sistema.html')}`;
        const spedFile = path.resolve(__dirname, '../documentos/13158698000110-106379704-20241001-20241031-0-2E48C31D567EF8BF13FF576A9F29777019947826-SPED-EFD.txt');
        
        console.log('\n📌 Carregando página...');
        await page.goto(baseUrl);
        await page.waitForTimeout(3000);
        
        console.log('\n📌 Selecionando modo Multi-Period...');
        await page.click('[data-mode="multi"]');
        await page.waitForTimeout(2000);
        
        console.log('\n📌 Indo para seção upload...');
        await page.click('[data-section="multi-upload-section"]');
        await page.waitForTimeout(1000);
        
        console.log('\n📌 Fazendo upload do arquivo SPED...');
        
        // Encontrar input de arquivo
        const fileInput = await page.$('#multi-file-input, input[type="file"]');
        if (fileInput) {
            await fileInput.setInputFiles(spedFile);
            console.log('✅ Arquivo enviado');
            
            // Aguardar processamento
            await page.waitForTimeout(5000);
            
            // Verificar se elementos apareceram após upload
            const companyInfo = await page.isVisible('#multi-current-company-info');
            console.log(`✅ Company info visível após upload: ${companyInfo}`);
            
        } else {
            console.error('❌ Input de arquivo não encontrado');
        }
        
        console.log('\n📌 Indo para seção períodos...');
        await page.click('[data-section="multi-periods-section"]');
        await page.waitForTimeout(2000);
        
        // Verificar elementos na seção períodos
        const periodsList = await page.isVisible('#multi-periods-list');
        console.log(`✅ Lista de períodos visível: ${periodsList}`);
        
        await page.screenshot({ path: 'test-upload-multi.png' });
        
    } catch (error) {
        console.error('\n❌ ERRO:', error.message);
        await page.screenshot({ path: 'test-upload-error.png' });
        
    } finally {
        await page.waitForTimeout(5000);
        await browser.close();
    }
}

testUploadMultiPeriod()
    .then(() => console.log('\n✅ Teste de upload concluído'))
    .catch(error => console.error('\n❌ Teste falhou:', error));