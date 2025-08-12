/**
 * Teste de Diagnóstico - Sistema Congelado na Tela Inicial
 * Identifica problemas que impedem a interação com o sistema
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Diagnóstico de Congelamento do Sistema', () => {
    test('Detectar problemas de interação e congelamento', async ({ page }) => {
        console.log('🔍 === DIAGNÓSTICO DE CONGELAMENTO ===');
        
        // Configurar timeout maior para detectar congelamentos
        page.setDefaultTimeout(30000);
        
        // Capturar console logs
        const logs = [];
        page.on('console', msg => {
            const text = msg.text();
            logs.push({
                type: msg.type(),
                text: text,
                time: new Date().toISOString()
            });
            
            // Log em tempo real
            if (msg.type() === 'error') {
                console.log(`❌ ${text}`);
            } else if (text.includes('🎯') || text.includes('🔧') || text.includes('✅')) {
                console.log(text);
            }
        });
        
        // Capturar erros de página
        page.on('pageerror', error => {
            console.log(`💥 Erro de página: ${error.message}`);
        });
        
        console.log('📂 Abrindo sistema...');
        await page.goto('file://' + path.resolve(__dirname, 'sistema.html'));
        
        // Aguardar um pouco para inicialização
        await page.waitForTimeout(3000);
        
        // 1. VERIFICAR SE A TELA DE SELEÇÃO ESTÁ VISÍVEL
        console.log('\n🖥️ Verificando tela de seleção...');
        const modeSelection = page.locator('#mode-selection-section');
        const isSelectionVisible = await modeSelection.isVisible();
        console.log(`  Tela de seleção visível: ${isSelectionVisible ? '✅' : '❌'}`);
        
        if (!isSelectionVisible) {
            console.log('❌ PROBLEMA: Tela de seleção não está visível!');
            
            // Verificar qual seção está ativa
            const activeSections = await page.$$eval('.section.active', sections => 
                sections.map(s => s.id)
            );
            console.log(`  Seções ativas: ${activeSections.join(', ') || 'NENHUMA'}`);
            
            // Verificar se há overlay bloqueando
            const overlays = await page.$$eval('div[style*="position: fixed"]', els => 
                els.map(el => ({
                    html: el.outerHTML.substring(0, 100),
                    zIndex: el.style.zIndex || 'auto'
                }))
            );
            if (overlays.length > 0) {
                console.log(`  ⚠️ Overlays encontrados: ${overlays.length}`);
                overlays.forEach(o => console.log(`    - z-index: ${o.zIndex}`));
            }
        }
        
        // 2. VERIFICAR SE OS BOTÕES ESTÃO ACESSÍVEIS
        console.log('\n🖱️ Verificando botões de seleção...');
        const singleBtn = page.locator('.mode-select-btn[data-mode="single"]');
        const multiBtn = page.locator('.mode-select-btn[data-mode="multi"]');
        
        const singleVisible = await singleBtn.isVisible();
        const multiVisible = await multiBtn.isVisible();
        
        console.log(`  Botão Período Único visível: ${singleVisible ? '✅' : '❌'}`);
        console.log(`  Botão Múltiplos Períodos visível: ${multiVisible ? '✅' : '❌'}`);
        
        if (singleVisible) {
            // Verificar se o botão está habilitado
            const singleEnabled = await singleBtn.isEnabled();
            console.log(`  Botão Período Único habilitado: ${singleEnabled ? '✅' : '❌'}`);
            
            // Verificar se há elementos sobrepondo o botão
            const boundingBox = await singleBtn.boundingBox();
            if (boundingBox) {
                console.log(`  Posição do botão: x=${boundingBox.x}, y=${boundingBox.y}`);
                
                // Tentar clicar no centro do botão
                const centerX = boundingBox.x + boundingBox.width / 2;
                const centerY = boundingBox.y + boundingBox.height / 2;
                
                console.log('\n🖱️ Tentando clicar no botão Período Único...');
                
                try {
                    // Método 1: Click direto
                    await singleBtn.click({ timeout: 5000 });
                    console.log('  ✅ Click direto funcionou!');
                } catch (error1) {
                    console.log(`  ❌ Click direto falhou: ${error1.message}`);
                    
                    // Método 2: Force click
                    try {
                        await singleBtn.click({ force: true, timeout: 5000 });
                        console.log('  ✅ Force click funcionou!');
                    } catch (error2) {
                        console.log(`  ❌ Force click falhou: ${error2.message}`);
                        
                        // Método 3: JavaScript click
                        try {
                            await page.evaluate(() => {
                                const btn = document.querySelector('.mode-select-btn[data-mode="single"]');
                                if (btn) {
                                    btn.click();
                                    return true;
                                }
                                return false;
                            });
                            console.log('  ✅ JavaScript click funcionou!');
                        } catch (error3) {
                            console.log(`  ❌ JavaScript click falhou: ${error3.message}`);
                        }
                    }
                }
                
                // Aguardar para ver se algo mudou
                await page.waitForTimeout(2000);
                
                // Verificar se a navegação apareceu
                const navVisible = await page.locator('#main-navigation').isVisible();
                console.log(`\n  Navegação apareceu: ${navVisible ? '✅' : '❌'}`);
                
                // Verificar se ainda está na tela de seleção
                const stillOnSelection = await modeSelection.isVisible();
                console.log(`  Ainda na tela de seleção: ${stillOnSelection ? '❌' : '✅'}`);
            }
        }
        
        // 3. VERIFICAR ELEMENTOS BLOQUEADORES
        console.log('\n🔍 Procurando elementos bloqueadores...');
        
        // Verificar se há elementos com z-index alto
        const highZIndexElements = await page.$$eval('*', elements => {
            return elements
                .filter(el => {
                    const style = window.getComputedStyle(el);
                    const zIndex = parseInt(style.zIndex);
                    return !isNaN(zIndex) && zIndex > 1000;
                })
                .map(el => ({
                    tag: el.tagName,
                    id: el.id,
                    class: el.className,
                    zIndex: window.getComputedStyle(el).zIndex,
                    display: window.getComputedStyle(el).display,
                    visibility: window.getComputedStyle(el).visibility
                }));
        });
        
        if (highZIndexElements.length > 0) {
            console.log(`  ⚠️ Elementos com z-index alto encontrados:`);
            highZIndexElements.forEach(el => {
                console.log(`    - ${el.tag}#${el.id || 'sem-id'} (z-index: ${el.zIndex})`);
            });
        } else {
            console.log(`  ✅ Nenhum elemento com z-index alto bloqueando`);
        }
        
        // 4. VERIFICAR LOOPS INFINITOS OU ERROS RECORRENTES
        console.log('\n📊 Analisando logs para padrões de erro...');
        
        // Contar erros repetidos
        const errorCounts = {};
        logs.filter(l => l.type === 'error').forEach(log => {
            const key = log.text.substring(0, 50);
            errorCounts[key] = (errorCounts[key] || 0) + 1;
        });
        
        const repeatedErrors = Object.entries(errorCounts).filter(([_, count]) => count > 2);
        if (repeatedErrors.length > 0) {
            console.log('  ⚠️ Erros repetidos detectados:');
            repeatedErrors.forEach(([error, count]) => {
                console.log(`    - "${error}..." repetido ${count} vezes`);
            });
        }
        
        // 5. VERIFICAR ESTADO DOS MANAGERS
        console.log('\n🔧 Verificando estado dos managers...');
        const managerStates = await page.evaluate(() => {
            return {
                modeManager: {
                    exists: !!window.modeManager,
                    activeMode: window.modeManager?.activeMode,
                    isInitialized: window.modeManager?.isInitialized
                },
                navigationManager: {
                    exists: !!window.uiManager?.navigationManager,
                    currentSection: window.uiManager?.navigationManager?.navigationState?.currentSection,
                    transitionInProgress: window.uiManager?.navigationManager?.navigationState?.transitionInProgress
                },
                uiManager: {
                    exists: !!window.uiManager,
                    currentSection: window.uiManager?.currentSection
                },
                eventHandlers: {
                    modeButtons: document.querySelectorAll('.mode-select-btn').length,
                    hasClickHandlers: (() => {
                        const btn = document.querySelector('.mode-select-btn[data-mode="single"]');
                        // Não podemos verificar diretamente, mas podemos tentar
                        return btn ? 'presente' : 'ausente';
                    })()
                }
            };
        });
        
        console.log('  ModeManager:');
        console.log(`    - Existe: ${managerStates.modeManager.exists ? '✅' : '❌'}`);
        console.log(`    - Modo ativo: ${managerStates.modeManager.activeMode || 'nenhum'}`);
        console.log(`    - Inicializado: ${managerStates.modeManager.isInitialized ? '✅' : '❌'}`);
        
        console.log('  NavigationManager:');
        console.log(`    - Existe: ${managerStates.navigationManager.exists ? '✅' : '❌'}`);
        console.log(`    - Seção atual: ${managerStates.navigationManager.currentSection || 'nenhuma'}`);
        console.log(`    - Transição em progresso: ${managerStates.navigationManager.transitionInProgress ? '⚠️' : '✅'}`);
        
        console.log('  Event Handlers:');
        console.log(`    - Botões de modo: ${managerStates.eventHandlers.modeButtons}`);
        console.log(`    - Handlers de click: ${managerStates.eventHandlers.hasClickHandlers}`);
        
        // 6. TENTAR FORÇAR MUDANÇA DE MODO VIA CONSOLE
        console.log('\n🔧 Tentando forçar mudança de modo via JavaScript...');
        const forceModeResult = await page.evaluate(async () => {
            try {
                if (window.modeManager) {
                    const result = await window.modeManager.setMode('single');
                    return { success: true, result };
                } else {
                    return { success: false, error: 'ModeManager não encontrado' };
                }
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
        
        if (forceModeResult.success) {
            console.log(`  ✅ Modo forçado com sucesso: ${forceModeResult.result}`);
            
            // Verificar se a interface mudou
            await page.waitForTimeout(1000);
            const navNowVisible = await page.locator('#main-navigation').isVisible();
            console.log(`  Navegação visível após forçar: ${navNowVisible ? '✅' : '❌'}`);
        } else {
            console.log(`  ❌ Falha ao forçar modo: ${forceModeResult.error}`);
        }
        
        // 7. CAPTURAR SCREENSHOT PARA ANÁLISE
        await page.screenshot({ 
            path: 'diagnostic-screenshot.png',
            fullPage: true 
        });
        console.log('\n📸 Screenshot salvo como diagnostic-screenshot.png');
        
        // RESUMO FINAL
        console.log('\n📋 === RESUMO DO DIAGNÓSTICO ===');
        
        const issues = [];
        
        if (!isSelectionVisible) issues.push('Tela de seleção não visível');
        if (!singleVisible) issues.push('Botões não visíveis');
        if (highZIndexElements.length > 0) issues.push('Elementos bloqueadores detectados');
        if (repeatedErrors.length > 0) issues.push('Erros recorrentes no console');
        if (!managerStates.modeManager.exists) issues.push('ModeManager não inicializado');
        
        if (issues.length === 0) {
            console.log('✅ Nenhum problema crítico detectado');
        } else {
            console.log('❌ Problemas encontrados:');
            issues.forEach(issue => console.log(`  - ${issue}`));
        }
        
        // Fazer asserções para o teste
        expect(isSelectionVisible, 'Tela de seleção deve estar visível').toBe(true);
        expect(managerStates.modeManager.exists, 'ModeManager deve existir').toBe(true);
    });
});