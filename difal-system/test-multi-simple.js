// Teste simples para verificar correção do erro multi-período
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function testMultiPeriod() {
    console.log('🧪 TESTE MULTI-PERÍODO - VERIFICAÇÃO DE CORREÇÃO\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 100,
        devtools: true
    });
    
    const page = await browser.newPage();
    
    // Capturar logs do console
    const consoleLogs = [];
    page.on('console', msg => {
        const text = msg.text();
        consoleLogs.push({
            type: msg.type(),
            text: text
        });
        
        // Mostrar apenas erros em tempo real
        if (msg.type() === 'error') {
            console.log('❌ ERRO CAPTURADO:', text);
        }
    });
    
    try {
        // Navegar para o sistema
        const systemPath = path.join(__dirname, 'sistema.html');
        console.log('📍 Navegando para:', systemPath);
        await page.goto(`file://${systemPath}`, { waitUntil: 'networkidle0' });
        
        // Aguardar carregamento
        await page.waitForTimeout(3000);
        
        // Verificar se a tela de seleção está visível
        const selectMulti = await page.$('#select-multi');
        if (selectMulti) {
            console.log('✅ Botão de seleção multi encontrado');
            await selectMulti.click();
            await page.waitForTimeout(2000);
        } else {
            console.log('⚠️ Botão select-multi não encontrado, tentando alternativa...');
            // Tentar clicar diretamente no modo multi se já estiver disponível
        }
        
        // Verificar se estamos no modo multi
        const isMultiMode = await page.evaluate(() => {
            const modeManager = window.difalApp?.modeManager;
            return modeManager?.currentMode === 'multi';
        });
        
        console.log(`📊 Modo atual: ${isMultiMode ? 'MULTI' : 'OUTRO'}`);
        
        // Tentar fazer upload de arquivo
        console.log('\n📁 Tentando upload de arquivo...');
        
        // Procurar input de arquivo multi-período
        const fileInput = await page.$('#multi-period-file-input');
        if (fileInput) {
            console.log('✅ Input de arquivo multi-período encontrado');
            
            // Procurar arquivo de teste
            const testFile = path.join(__dirname, 'data', '13158698000110-106379704-20240901-20240930-1-492D53B928CC7307791135D5EA5E3F09EF76768D-SPED-EFD.txt');
            
            if (fs.existsSync(testFile)) {
                console.log('📄 Arquivo de teste encontrado:', path.basename(testFile));
                await fileInput.uploadFile(testFile);
                await page.waitForTimeout(3000);
            } else {
                console.log('⚠️ Arquivo de teste não encontrado');
            }
        } else {
            console.log('⚠️ Input de arquivo multi-período não encontrado');
        }
        
        // Verificar erros específicos
        console.log('\n🔍 ANÁLISE DE ERROS:');
        
        const processWithSpedParserError = consoleLogs.find(log => 
            log.type === 'error' && log.text.includes('processWithSpedParser is not a function')
        );
        
        if (processWithSpedParserError) {
            console.log('\n❌ ERRO CRÍTICO AINDA PRESENTE:');
            console.log('   "processWithSpedParser is not a function"');
            console.log('   CORREÇÃO NÃO FUNCIONOU!\n');
        } else {
            console.log('\n✅ SUCESSO! Erro "processWithSpedParser" NÃO encontrado!');
            console.log('   Correção aplicada com sucesso!\n');
        }
        
        // Listar todos os erros encontrados
        const errors = consoleLogs.filter(log => log.type === 'error');
        if (errors.length > 0) {
            console.log('📋 Lista de todos os erros:');
            errors.forEach((err, idx) => {
                console.log(`   ${idx + 1}. ${err.text.substring(0, 100)}...`);
            });
        } else {
            console.log('✅ Nenhum erro JavaScript detectado!');
        }
        
        // Verificar estado do sistema
        const systemState = await page.evaluate(() => {
            return {
                difalApp: !!window.difalApp,
                modeManager: !!window.difalApp?.modeManager,
                fileUploadManager: !!window.difalApp?.fileUploadManager,
                currentMode: window.difalApp?.modeManager?.currentMode,
                stateManager: !!window.difalApp?.stateManager
            };
        });
        
        console.log('\n📊 Estado do Sistema:');
        console.log('   DifalApp:', systemState.difalApp ? '✅' : '❌');
        console.log('   ModeManager:', systemState.modeManager ? '✅' : '❌');
        console.log('   FileUploadManager:', systemState.fileUploadManager ? '✅' : '❌');
        console.log('   StateManager:', systemState.stateManager ? '✅' : '❌');
        console.log('   Modo Atual:', systemState.currentMode || 'N/A');
        
    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
    }
    
    console.log('\n🎯 Teste concluído. Navegador permanecerá aberto para inspeção.');
    console.log('   Pressione Ctrl+C para encerrar.\n');
    
    // Manter navegador aberto para inspeção
    // await browser.close();
}

// Executar teste
testMultiPeriod().catch(console.error);