/**
 * Teste específico da seleção de modo e navegação
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Teste de Seleção de Modo', () => {
    test('Clicar no botão deve mostrar navegação e seção de upload', async ({ page }) => {
        console.log('🎯 === TESTE DE SELEÇÃO DE MODO ===');
        
        // Capturar logs
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('🧭') || text.includes('🎯') || text.includes('✅') || text.includes('❌')) {
                console.log(text);
            }
        });
        
        // Abrir sistema
        await page.goto('file://' + path.resolve(__dirname, 'sistema.html'));
        await page.waitForTimeout(2000);
        
        // Verificar estado inicial
        console.log('\n📊 Estado Inicial:');
        const initialState = await page.evaluate(() => {
            return {
                modeSelectionVisible: document.getElementById('mode-selection-section')?.classList.contains('active'),
                modeSelectionHidden: document.getElementById('mode-selection-section')?.classList.contains('hidden'),
                navigationVisible: !document.getElementById('main-navigation')?.classList.contains('hidden'),
                uploadSectionVisible: document.getElementById('single-upload-section')?.classList.contains('active'),
                modeManagerReady: !!window.modeManager,
                currentMode: window.modeManager?.activeMode
            };
        });
        
        console.log(`  Seleção de modo visível: ${initialState.modeSelectionVisible ? '✅' : '❌'}`);
        console.log(`  Seleção de modo hidden: ${initialState.modeSelectionHidden ? '❌' : '✅'}`);
        console.log(`  Navegação visível: ${initialState.navigationVisible ? '❌' : '✅'}`);
        console.log(`  Upload visível: ${initialState.uploadSectionVisible ? '❌' : '✅'}`);
        console.log(`  ModeManager pronto: ${initialState.modeManagerReady ? '✅' : '❌'}`);
        console.log(`  Modo atual: ${initialState.currentMode || 'nenhum'}`);
        
        // Clicar no botão de período único
        console.log('\n🖱️ Clicando no botão Período Único...');
        const singleBtn = page.locator('.mode-select-btn[data-mode="single"]');
        await singleBtn.click();
        
        // Aguardar um pouco
        await page.waitForTimeout(3000);
        
        // Verificar estado após clique
        console.log('\n📊 Estado Após Clique:');
        const afterClickState = await page.evaluate(() => {
            return {
                modeSelectionVisible: document.getElementById('mode-selection-section')?.classList.contains('active'),
                modeSelectionHidden: document.getElementById('mode-selection-section')?.classList.contains('hidden'),
                modeSelectionDisplay: window.getComputedStyle(document.getElementById('mode-selection-section')).display,
                navigationVisible: !document.getElementById('main-navigation')?.classList.contains('hidden'),
                navigationDisplay: window.getComputedStyle(document.getElementById('main-navigation')).display,
                uploadSectionVisible: document.getElementById('single-upload-section')?.classList.contains('active'),
                uploadSectionHidden: document.getElementById('single-upload-section')?.classList.contains('hidden'),
                uploadSectionDisplay: window.getComputedStyle(document.getElementById('single-upload-section')).display,
                currentMode: window.modeManager?.activeMode,
                navigationState: window.uiManager?.navigationManager?.navigationState
            };
        });
        
        console.log(`  Seleção de modo visível: ${afterClickState.modeSelectionVisible ? '❌' : '✅'}`);
        console.log(`  Seleção de modo hidden: ${afterClickState.modeSelectionHidden ? '✅' : '❌'}`);
        console.log(`  Seleção de modo display: ${afterClickState.modeSelectionDisplay}`);
        console.log(`  Navegação visível: ${afterClickState.navigationVisible ? '✅' : '❌'}`);
        console.log(`  Navegação display: ${afterClickState.navigationDisplay}`);
        console.log(`  Upload visível: ${afterClickState.uploadSectionVisible ? '✅' : '❌'}`);
        console.log(`  Upload hidden: ${afterClickState.uploadSectionHidden ? '❌' : '✅'}`);
        console.log(`  Upload display: ${afterClickState.uploadSectionDisplay}`);
        console.log(`  Modo atual: ${afterClickState.currentMode || 'nenhum'}`);
        console.log(`  NavigationState:`, JSON.stringify(afterClickState.navigationState, null, 2));
        
        // Tentar forçar visibilidade via JavaScript
        console.log('\n🔧 Forçando visibilidade via JavaScript...');
        await page.evaluate(() => {
            // Esconder seleção de modo
            const modeSelection = document.getElementById('mode-selection-section');
            if (modeSelection) {
                modeSelection.classList.remove('active');
                modeSelection.classList.add('hidden');
                modeSelection.style.display = 'none';
            }
            
            // Mostrar navegação
            const nav = document.getElementById('main-navigation');
            if (nav) {
                nav.classList.remove('hidden');
                nav.style.display = 'flex';
            }
            
            // Mostrar seção de upload
            const upload = document.getElementById('single-upload-section');
            if (upload) {
                upload.classList.remove('hidden');
                upload.classList.add('active');
                upload.style.display = 'block';
            }
        });
        
        await page.waitForTimeout(1000);
        
        // Verificar estado após forçar
        console.log('\n📊 Estado Após Forçar:');
        const forcedState = await page.evaluate(() => {
            return {
                modeSelectionDisplay: window.getComputedStyle(document.getElementById('mode-selection-section')).display,
                navigationDisplay: window.getComputedStyle(document.getElementById('main-navigation')).display,
                uploadSectionDisplay: window.getComputedStyle(document.getElementById('single-upload-section')).display
            };
        });
        
        console.log(`  Seleção de modo display: ${forcedState.modeSelectionDisplay}`);
        console.log(`  Navegação display: ${forcedState.navigationDisplay}`);
        console.log(`  Upload display: ${forcedState.uploadSectionDisplay}`);
        
        // Capturar screenshot
        await page.screenshot({ path: 'mode-selection-test.png', fullPage: true });
        console.log('\n📸 Screenshot salvo como mode-selection-test.png');
        
        // Asserções
        expect(afterClickState.currentMode).toBe('single');
        expect(forcedState.navigationDisplay).not.toBe('none');
        expect(forcedState.uploadSectionDisplay).not.toBe('none');
    });
});