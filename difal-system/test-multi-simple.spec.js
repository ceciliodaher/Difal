/**
 * Teste simplificado do sistema multiperíodos DIFAL
 */

const { chromium } = require('playwright');
const path = require('path');

async function testMultiPeriodSimple() {
    console.log('🚀 Teste simplificado - Sistema multiperíodos DIFAL');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1000 // Slower execution
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Capturar logs do console - apenas erros
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.error(`❌ [Browser Error]: ${msg.text()}`);
        }
    });
    
    try {
        const baseUrl = `file://${path.resolve(__dirname, 'sistema.html')}`;
        
        // === ETAPA 1: CARREGAR PÁGINA ===
        console.log('\n📌 Carregando página...');
        await page.goto(baseUrl);
        await page.waitForTimeout(3000); // Aguardar inicialização
        
        // === ETAPA 2: SELECIONAR MODO MULTI ===
        console.log('\n📌 Selecionando modo Multi-Period...');
        await page.click('[data-mode="multi"]');
        await page.waitForTimeout(2000);
        
        // === ETAPA 3: VERIFICAR ELEMENTOS MULTI ===
        console.log('\n📌 Verificando elementos multi-período...');
        
        // Verificar se navegação está visível
        const navVisible = await page.isVisible('#main-navigation');
        console.log(`✅ Navegação visível: ${navVisible}`);
        
        // Verificar botões multi
        const multiUploadBtn = await page.isVisible('[data-section="multi-upload-section"]');
        const multiPeriodsBtn = await page.isVisible('[data-section="multi-periods-section"]');
        const multiAnalyticsBtn = await page.isVisible('[data-section="multi-analytics-section"]');
        
        console.log('📊 Botões multi-período:', {
            upload: multiUploadBtn,
            periods: multiPeriodsBtn,
            analytics: multiAnalyticsBtn
        });
        
        // === ETAPA 4: TESTAR NAVEGAÇÃO ===
        console.log('\n📌 Testando navegação entre seções...');
        
        // Ir para períodos
        await page.click('[data-section="multi-periods-section"]');
        await page.waitForTimeout(1000);
        
        const periodsSection = await page.isVisible('#multi-periods-section');
        console.log(`✅ Seção períodos visível: ${periodsSection}`);
        
        // Ir para analytics  
        await page.click('[data-section="multi-analytics-section"]');
        await page.waitForTimeout(1000);
        
        const analyticsSection = await page.isVisible('#multi-analytics-section');
        console.log(`✅ Seção analytics visível: ${analyticsSection}`);
        
        // === ETAPA 5: VERIFICAR ELEMENTOS DOM ===
        console.log('\n📌 Verificando elementos DOM...');
        
        // Verificar IDs corrigidos
        const elements = {
            'multi-current-company-info': await page.isVisible('#multi-current-company-info'),
            'multi-current-company-name': await page.isVisible('#multi-current-company-name'),
            'multi-periods-list': await page.isVisible('#multi-periods-list'),
            'multi-consolidated-total-items': await page.isVisible('#multi-consolidated-total-items')
        };
        
        console.log('🔍 Elementos DOM encontrados:', elements);
        
        // Contar elementos corrigidos
        const foundElements = Object.values(elements).filter(Boolean).length;
        console.log(`✅ ${foundElements}/4 elementos DOM encontrados`);
        
        if (foundElements === 4) {
            console.log('\n🎉 SUCESSO: Sistema multi-período funcionando!');
        } else {
            console.log('\n⚠️ PARCIAL: Alguns elementos ainda não encontrados');
        }
        
        await page.screenshot({ path: 'test-multi-simple.png' });
        
    } catch (error) {
        console.error('\n❌ ERRO:', error.message);
        await page.screenshot({ path: 'test-multi-error.png' });
        
    } finally {
        await page.waitForTimeout(3000); // Observar resultado
        await browser.close();
    }
}

// Executar teste
testMultiPeriodSimple()
    .then(() => console.log('\n✅ Teste concluído'))
    .catch(error => console.error('\n❌ Teste falhou:', error));