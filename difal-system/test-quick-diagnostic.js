/**
 * Diagnóstico Rápido do Sistema DIFAL
 * Teste simplificado para identificar problemas de inicialização
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

test('Diagnóstico Rápido do Sistema DIFAL', async ({ page }) => {
    console.log('🔍 === DIAGNÓSTICO DO SISTEMA DIFAL ===');

    // Capturar logs do console
    page.on('console', msg => {
        console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
    });

    // Capturar erros
    page.on('pageerror', error => {
        console.error(`[PAGE ERROR] ${error.message}`);
    });

    // Navegar para o sistema
    await page.goto('http://localhost:8000/sistema.html');
    console.log('🌐 Navegou para sistema.html');

    // Aguardar um pouco para carregamento
    await page.waitForTimeout(5000);

    // Verificar estrutura básica
    const basicStructure = await page.evaluate(() => {
        return {
            hasTitle: !!document.title,
            hasUploadSection: !!document.getElementById('upload-section'),
            hasAnalysisSection: !!document.getElementById('analysis-section'),
            hasCalculationSection: !!document.getElementById('calculation-section'),
            hasFileInput: !!document.getElementById('file-input'),
            hasDropZone: !!document.getElementById('drop-zone')
        };
    });

    console.log('🏗️ Estrutura HTML:', basicStructure);

    // Verificar scripts carregados
    const scriptsLoaded = await page.evaluate(() => {
        const scripts = Array.from(document.scripts);
        return scripts.map(script => ({
            src: script.src ? script.src.split('/').pop() : 'inline',
            loaded: script.src ? true : script.textContent.length > 0
        }));
    });

    console.log('📜 Scripts carregados:');
    scriptsLoaded.forEach(script => {
        console.log(`   - ${script.src}: ${script.loaded ? '✅' : '❌'}`);
    });

    // Verificar objetos globais
    const globalObjects = await page.evaluate(() => {
        return {
            // Core
            EventBus: typeof window.EventBus,
            StateManager: typeof window.StateManager,
            Logger: typeof window.Logger,
            
            // Parsers e Calculators
            SpedParser: typeof window.SpedParser,
            DifalCalculator: typeof window.DifalCalculator,
            
            // Utilities
            Utils: typeof window.Utils,
            
            // UI
            UIManager: typeof window.UIManager,
            
            // App
            DifalAppModular: typeof window.DifalAppModular,
            
            // Managers
            ConfigurationManager: typeof window.ConfigurationManager,
            
            // Módulos
            FileUploadManager: typeof window.FileUploadManager,
            ExportManager: typeof window.ExportManager,
            ModalManager: typeof window.ModalManager,
            ResultsRenderer: typeof window.ResultsRenderer,
            NavigationManager: typeof window.NavigationManager,
            ProgressManager: typeof window.ProgressManager,
            
            // Instâncias
            difalApp: typeof window.difalApp,
            uiManager: typeof window.uiManager,
            eventBus: typeof window.eventBus,
            stateManager: typeof window.stateManager
        };
    });

    console.log('🌍 Objetos Globais:');
    Object.entries(globalObjects).forEach(([name, type]) => {
        const status = type !== 'undefined' ? '✅' : '❌';
        console.log(`   ${status} ${name}: ${type}`);
    });

    // Verificar se há erros de console
    const consoleErrors = await page.evaluate(() => {
        return window.__consoleErrors || [];
    });

    if (consoleErrors.length > 0) {
        console.log('❌ Erros encontrados:');
        consoleErrors.forEach(error => console.log(`   - ${error}`));
    } else {
        console.log('✅ Nenhum erro de console detectado');
    }

    // Tentar inicializar manualmente se necessário
    const manualInit = await page.evaluate(() => {
        try {
            if (typeof window.DifalAppModular === 'undefined') {
                return { error: 'DifalAppModular não encontrado' };
            }
            
            if (!window.difalApp) {
                window.difalApp = new window.DifalAppModular();
                return { action: 'Instância DifalApp criada' };
            }
            
            return { status: 'DifalApp já existe' };
        } catch (error) {
            return { error: error.message };
        }
    });

    console.log('🔧 Inicialização manual:', manualInit);

    // Status final
    const finalStatus = await page.evaluate(() => {
        return {
            difalAppExists: !!window.difalApp,
            uiManagerExists: !!window.uiManager,
            canCreateSpedParser: typeof window.SpedParser === 'function',
            canCreateDifalCalculator: typeof window.DifalCalculator === 'function',
            systemReady: !!(window.difalApp && window.uiManager)
        };
    });

    console.log('🏁 Status Final:', finalStatus);
    console.log('🔍 === DIAGNÓSTICO CONCLUÍDO ===');
});

test('Teste de Upload Simplificado', async ({ page }) => {
    console.log('📤 === TESTE DE UPLOAD SIMPLIFICADO ===');

    // Capturar logs
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.error(`[ERROR] ${msg.text()}`);
        }
    });

    await page.goto('http://localhost:8000/sistema.html');
    
    // Aguardar sistema carregar
    await page.waitForTimeout(5000);

    // Verificar se FileUploadManager existe
    const fileUploadReady = await page.evaluate(() => {
        return {
            hasFileInput: !!document.getElementById('file-input'),
            hasDropZone: !!document.getElementById('drop-zone'),
            hasUiManager: !!window.uiManager,
            hasFileUploadManager: !!(window.uiManager && window.uiManager.fileUploadManager),
            fileUploadManagerType: typeof window.uiManager?.fileUploadManager
        };
    });

    console.log('📋 Estado do FileUpload:', fileUploadReady);

    if (!fileUploadReady.hasFileUploadManager) {
        console.log('❌ FileUploadManager não disponível');
        return;
    }

    // Criar arquivo de teste simples
    const fs = require('fs');
    const testFile = path.join(__dirname, 'test-simple.txt');
    fs.writeFileSync(testFile, '|0000|001|0|1|2024|01|31|12345678000195|EMPRESA TESTE|SP|\n|9999|1|', 'utf8');

    try {
        const fileInput = page.locator('#file-input');
        await fileInput.setInputFiles(testFile);
        
        console.log('📤 Arquivo enviado, aguardando processamento...');
        
        // Aguardar processamento ou erro
        await page.waitForTimeout(3000);
        
        const uploadResult = await page.evaluate(() => {
            return {
                spedDataExists: !!window.spedData,
                isProcessing: window.uiManager?.fileUploadManager?.isProcessing || false,
                statusMessage: document.getElementById('status-message')?.textContent || '',
                hasError: document.getElementById('status-message')?.className?.includes('error') || false
            };
        });

        console.log('📊 Resultado do upload:', uploadResult);

        if (uploadResult.spedDataExists) {
            console.log('✅ Upload bem-sucedido!');
        } else if (uploadResult.hasError) {
            console.log(`❌ Erro no upload: ${uploadResult.statusMessage}`);
        } else if (uploadResult.isProcessing) {
            console.log('⏳ Ainda processando...');
        } else {
            console.log('❓ Estado indefinido do upload');
        }

    } finally {
        if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
        }
    }

    console.log('📤 === TESTE DE UPLOAD CONCLUÍDO ===');
});