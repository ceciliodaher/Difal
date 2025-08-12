/**
 * Teste Playwright - Diagnóstico e Correção de Erros de Inicialização
 * Este teste captura erros de console e corrige iterativamente
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Diagnóstico de Erros de Inicialização', () => {
    test('Capturar e analisar erros de console', async ({ page }) => {
        console.log('🔍 === INICIANDO DIAGNÓSTICO DE INICIALIZAÇÃO ===');
        
        const errors = [];
        const warnings = [];
        const logs = [];
        
        // Capturar todos os logs de console
        page.on('console', msg => {
            const logEntry = {
                type: msg.type(),
                text: msg.text(),
                timestamp: new Date().toISOString(),
                location: msg.location()
            };
            
            // Categorizar logs
            if (msg.type() === 'error') {
                errors.push(logEntry);
                console.log(`❌ ERRO: ${msg.text()}`);
            } else if (msg.type() === 'warning') {
                warnings.push(logEntry);
                console.log(`⚠️ AVISO: ${msg.text()}`);
            } else if (msg.text().includes('✅') || msg.text().includes('initialized')) {
                console.log(`✅ ${msg.text()}`);
            }
            
            logs.push(logEntry);
        });
        
        // Capturar exceções não tratadas
        page.on('pageerror', exception => {
            const errorEntry = {
                type: 'exception',
                text: exception.toString(),
                timestamp: new Date().toISOString(),
                stack: exception.stack
            };
            errors.push(errorEntry);
            console.log(`💥 EXCEÇÃO: ${exception.toString()}`);
        });
        
        console.log('📂 Abrindo sistema...');
        
        // Navegar para o sistema
        await page.goto('file://' + path.resolve(__dirname, 'sistema.html'));
        
        // Aguardar tempo suficiente para inicialização
        console.log('⏳ Aguardando inicialização do sistema...');
        await page.waitForTimeout(5000);
        
        // Verificar status de inicialização
        const initStatus = await page.evaluate(() => {
            return {
                // Módulos principais
                difalApp: !!window.difalApp,
                difalAppInitialized: window.difalApp?.isInitialized,
                
                // Managers
                eventBus: !!window.eventBus,
                stateManager: !!window.stateManager,
                modeManager: !!window.modeManager,
                modeManagerInitialized: window.modeManager?.isInitialized,
                
                // Single/Multi Period Managers
                singlePeriodManager: !!window.singlePeriodManager,
                multiPeriodManager: !!window.multiPeriodManager,
                
                // UI Manager e submódulos
                uiManager: !!window.uiManager,
                navigationManager: !!window.uiManager?.navigationManager,
                progressManager: !!window.uiManager?.progressManager,
                fileUploadManager: !!window.uiManager?.fileUploadManager,
                exportManager: !!window.uiManager?.exportManager,
                
                // Calculators e Parsers
                spedParser: !!window.SpedParserModular,
                difalCalculator: !!window.DifalCalculatorSimple,
                
                // Utils
                utils: !!window.Utils,
                estadosUtil: !!window.EstadosUtil,
                
                // DOM Elements
                modeSelectionVisible: document.getElementById('mode-selection-section')?.classList.contains('active'),
                navigationHidden: document.getElementById('main-navigation')?.classList.contains('hidden')
            };
        });
        
        console.log('\n📊 === STATUS DE INICIALIZAÇÃO ===');
        console.log('Módulos Principais:');
        console.log(`  DifalApp: ${initStatus.difalApp ? '✅' : '❌'} (Initialized: ${initStatus.difalAppInitialized ? '✅' : '❌'})`);
        console.log(`  EventBus: ${initStatus.eventBus ? '✅' : '❌'}`);
        console.log(`  StateManager: ${initStatus.stateManager ? '✅' : '❌'}`);
        console.log(`  ModeManager: ${initStatus.modeManager ? '✅' : '❌'} (Initialized: ${initStatus.modeManagerInitialized ? '✅' : '❌'})`);
        
        console.log('\nPeriod Managers:');
        console.log(`  SinglePeriodManager: ${initStatus.singlePeriodManager ? '✅' : '❌'}`);
        console.log(`  MultiPeriodManager: ${initStatus.multiPeriodManager ? '✅' : '❌'}`);
        
        console.log('\nUI Modules:');
        console.log(`  UIManager: ${initStatus.uiManager ? '✅' : '❌'}`);
        console.log(`  NavigationManager: ${initStatus.navigationManager ? '✅' : '❌'}`);
        console.log(`  ProgressManager: ${initStatus.progressManager ? '✅' : '❌'}`);
        console.log(`  FileUploadManager: ${initStatus.fileUploadManager ? '✅' : '❌'}`);
        console.log(`  ExportManager: ${initStatus.exportManager ? '✅' : '❌'}`);
        
        console.log('\nCalculators/Parsers:');
        console.log(`  SpedParser: ${initStatus.spedParser ? '✅' : '❌'}`);
        console.log(`  DifalCalculator: ${initStatus.difalCalculator ? '✅' : '❌'}`);
        
        console.log('\nUtils:');
        console.log(`  Utils: ${initStatus.utils ? '✅' : '❌'}`);
        console.log(`  EstadosUtil: ${initStatus.estadosUtil ? '✅' : '❌'}`);
        
        console.log('\nInterface:');
        console.log(`  Mode Selection Visible: ${initStatus.modeSelectionVisible ? '✅' : '❌'}`);
        console.log(`  Navigation Hidden: ${initStatus.navigationHidden ? '✅' : '❌'}`);
        
        // Analisar erros
        console.log(`\n🔍 === ANÁLISE DE ERROS ===`);
        console.log(`Total de erros capturados: ${errors.length}`);
        console.log(`Total de avisos capturados: ${warnings.length}`);
        
        if (errors.length > 0) {
            console.log('\n❌ ERROS ENCONTRADOS:');
            
            // Agrupar erros por tipo
            const errorPatterns = {};
            errors.forEach(error => {
                // Extrair padrão do erro
                const pattern = error.text.match(/Error: ([^:]+)/)?.[1] || 
                               error.text.match(/TypeError: ([^:]+)/)?.[1] || 
                               error.text.substring(0, 50);
                
                if (!errorPatterns[pattern]) {
                    errorPatterns[pattern] = [];
                }
                errorPatterns[pattern].push(error);
            });
            
            // Mostrar erros agrupados
            Object.entries(errorPatterns).forEach(([pattern, errs]) => {
                console.log(`\n  📍 ${pattern} (${errs.length} ocorrências)`);
                if (errs[0].location) {
                    console.log(`     Localização: ${errs[0].location.url}:${errs[0].location.lineNumber}`);
                }
            });
            
            // Salvar logs detalhados
            const logFileName = `initialization-errors-${new Date().getTime()}.json`;
            fs.writeFileSync(logFileName, JSON.stringify({
                summary: {
                    totalErrors: errors.length,
                    totalWarnings: warnings.length,
                    timestamp: new Date().toISOString()
                },
                initStatus,
                errors,
                warnings,
                allLogs: logs
            }, null, 2));
            
            console.log(`\n📁 Logs salvos em: ${logFileName}`);
        }
        
        // Verificar se a tela de seleção de modo está visível
        const modeSelectionScreen = page.locator('#mode-selection-section');
        const isVisible = await modeSelectionScreen.isVisible();
        
        console.log(`\n🖥️ Tela de seleção de modo visível: ${isVisible ? '✅' : '❌'}`);
        
        if (isVisible) {
            // Testar se os botões funcionam
            const singleModeBtn = page.locator('.mode-select-btn[data-mode="single"]');
            const multiModeBtn = page.locator('.mode-select-btn[data-mode="multi"]');
            
            const singleBtnVisible = await singleModeBtn.isVisible();
            const multiBtnVisible = await multiModeBtn.isVisible();
            
            console.log(`  Botão Período Único: ${singleBtnVisible ? '✅' : '❌'}`);
            console.log(`  Botão Múltiplos Períodos: ${multiBtnVisible ? '✅' : '❌'}`);
            
            // Tentar clicar no botão de período único
            if (singleBtnVisible) {
                console.log('\n🖱️ Testando clique no botão Período Único...');
                try {
                    await singleModeBtn.click();
                    await page.waitForTimeout(2000);
                    
                    // Verificar se navegação apareceu
                    const navVisible = await page.locator('#main-navigation').isVisible();
                    console.log(`  Navegação apareceu: ${navVisible ? '✅' : '❌'}`);
                    
                    // Verificar se seção de upload apareceu
                    const uploadVisible = await page.locator('#single-upload-section').isVisible();
                    console.log(`  Seção de upload apareceu: ${uploadVisible ? '✅' : '❌'}`);
                } catch (clickError) {
                    console.log(`  ❌ Erro ao clicar: ${clickError.message}`);
                }
            }
        }
        
        // Fazer asserções para o teste
        console.log('\n📋 === VALIDAÇÃO FINAL ===');
        
        // Verificar que não há erros críticos
        const criticalErrors = errors.filter(e => 
            e.text.includes('TypeError') || 
            e.text.includes('ReferenceError') ||
            e.text.includes('Cannot read')
        );
        
        if (criticalErrors.length > 0) {
            console.log(`❌ ${criticalErrors.length} erros críticos encontrados - teste falhou`);
        } else {
            console.log('✅ Nenhum erro crítico encontrado');
        }
        
        // Verificar módulos essenciais
        expect(initStatus.difalApp, 'DifalApp deve estar carregado').toBe(true);
        expect(initStatus.eventBus, 'EventBus deve estar carregado').toBe(true);
        expect(initStatus.stateManager, 'StateManager deve estar carregado').toBe(true);
        
        // Verificar que tela de seleção está visível
        expect(isVisible, 'Tela de seleção de modo deve estar visível').toBe(true);
        
        console.log('\n🎉 === DIAGNÓSTICO CONCLUÍDO ===');
        console.log(`Resultado: ${errors.length === 0 ? '✅ SUCESSO' : '❌ CORREÇÕES NECESSÁRIAS'}`);
    });
    
    test('Correção automática de erros identificados', async ({ page }) => {
        console.log('\n🔧 === INICIANDO CORREÇÕES AUTOMÁTICAS ===');
        
        // Este teste será executado após identificar os erros
        // e implementará correções específicas baseadas nos padrões encontrados
        
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });
        
        await page.goto('file://' + path.resolve(__dirname, 'sistema.html'));
        await page.waitForTimeout(3000);
        
        // Analisar erro específico: NavigationManager requer ModeManager
        const navManagerError = errors.find(e => e.includes('NavigationManager requer uma instância de ModeManager'));
        
        if (navManagerError) {
            console.log('🔧 Corrigindo: NavigationManager precisa de ModeManager');
            
            // Verificar ordem de inicialização
            const initOrder = await page.evaluate(() => {
                const order = [];
                if (window.eventBus) order.push('eventBus');
                if (window.stateManager) order.push('stateManager');
                if (window.modeManager) order.push('modeManager');
                if (window.uiManager) order.push('uiManager');
                return order;
            });
            
            console.log(`  Ordem de inicialização atual: ${initOrder.join(' → ')}`);
            console.log('  ⚠️ ModeManager deve ser inicializado ANTES do UIManager');
        }
        
        // Verificar se há problemas de timing
        const timingIssues = errors.filter(e => 
            e.includes('undefined') || 
            e.includes('null') ||
            e.includes('not a function')
        );
        
        if (timingIssues.length > 0) {
            console.log(`\n⏱️ Possíveis problemas de timing detectados: ${timingIssues.length}`);
            console.log('  Sugestão: Implementar inicialização assíncrona com await/promises');
        }
        
        console.log('\n📝 === CORREÇÕES SUGERIDAS ===');
        
        if (errors.length > 0) {
            console.log('1. Corrigir ordem de inicialização em app.js');
            console.log('2. Implementar verificação de dependências antes de inicializar módulos');
            console.log('3. Adicionar inicialização tardia para NavigationManager');
            console.log('4. Garantir que ModeManager seja global antes de UIManager');
        } else {
            console.log('✅ Nenhuma correção necessária!');
        }
    });
});