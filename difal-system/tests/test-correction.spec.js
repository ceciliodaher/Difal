const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verificar correção do erro processWithSpedParser', async ({ page }) => {
    console.log('🧪 TESTE DE CORREÇÃO MULTI-PERÍODO\n');
    
    // Capturar erros do console
    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            const text = msg.text();
            errors.push(text);
            console.log('❌ Erro capturado:', text.substring(0, 100));
        }
    });
    
    // Navegar para o sistema
    const systemPath = path.join(__dirname, '..', 'sistema.html');
    await page.goto(`file://${systemPath}`);
    await page.waitForTimeout(3000);
    
    // Tentar selecionar modo multi-período
    const selectMulti = await page.locator('#select-multi');
    if (await selectMulti.isVisible()) {
        console.log('✅ Botão multi-período encontrado');
        await selectMulti.click();
        await page.waitForTimeout(2000);
    }
    
    // Verificar modo atual
    const currentMode = await page.evaluate(() => {
        return window.difalApp?.modeManager?.currentMode;
    });
    console.log(`📊 Modo atual: ${currentMode || 'N/A'}`);
    
    // Verificar se há o erro crítico
    const hasProcessError = errors.some(err => 
        err.includes('processWithSpedParser is not a function')
    );
    
    if (hasProcessError) {
        console.log('\n❌ FALHA: Erro "processWithSpedParser" ainda presente!');
    } else {
        console.log('\n✅ SUCESSO: Erro "processWithSpedParser" corrigido!');
    }
    
    // Listar todos os erros
    if (errors.length > 0) {
        console.log('\n📋 Erros encontrados:');
        errors.forEach((err, idx) => {
            console.log(`  ${idx + 1}. ${err.substring(0, 150)}`);
        });
    } else {
        console.log('\n✅ Nenhum erro JavaScript!');
    }
    
    // Asserção
    expect(hasProcessError).toBeFalsy();
});