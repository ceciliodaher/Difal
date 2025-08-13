/**
 * Análise automatizada do sistema multi-período usando Playwright
 * Este teste verifica o estado atual da implementação multi-período
 */

const { test, expect } = require('@playwright/test');

test('Análise completa do sistema multi-período', async ({ page }) => {
    console.log('🔍 INICIANDO ANÁLISE MULTI-PERÍODO COM PLAYWRIGHT');

    // === ETAPA 1: ANÁLISE DA INTERFACE ===
    console.log('\n📊 === ETAPA 1: ANÁLISE DA INTERFACE ===');
    
    await page.goto('file://' + __dirname + '/sistema.html');
    await page.waitForTimeout(2000);

    // Verificar elementos multi-período na página
    const multiPeriodElements = await page.evaluate(() => {
        return {
            // Seções multi-período
            multiUploadSection: !!document.getElementById('multi-upload-section'),
            multiPeriodsSection: !!document.getElementById('multi-periods-section'),  
            multiAnalyticsSection: !!document.getElementById('multi-analytics-section'),
            multiReportsSection: !!document.getElementById('multi-reports-section'),
            
            // Botões de navegação multi-período
            multiNavButtons: document.querySelectorAll('.nav-btn.mode-multi').length,
            
            // Upload elements
            multiDropZone: !!document.getElementById('multi-period-drop-zone'),
            multiFileInput: !!document.getElementById('multi-period-file-input'),
            
            // Export buttons
            multiExportExcel: !!document.getElementById('multi-export-excel'),
            multiExportPdf: !!document.getElementById('multi-export-pdf'),
            
            // Company info elements
            multiCompanyInfo: !!document.getElementById('multi-current-company-info'),
            multiCompanyName: !!document.getElementById('multi-current-company-name'),
            multiCompanyUf: !!document.getElementById('multi-current-company-uf'),
        };
    });

    console.log('🏗️ Elementos de Interface Multi-Período:', multiPeriodElements);

    // === ETAPA 2: VERIFICAR MÓDULOS JAVASCRIPT ===
    console.log('\n📚 === ETAPA 2: VERIFICAR MÓDULOS JAVASCRIPT ===');
    
    const jsModules = await page.evaluate(() => {
        return {
            // Managers principais
            multiPeriodManager: !!window.MultiPeriodManager,
            analyticsManager: !!window.AnalyticsManager,
            paretoAnalyzer: !!window.ParetoAnalyzer,
            chartsManager: !!window.ChartsManager,
            
            // Instances no DifalApp
            difalApp: !!window.difalApp,
            multiPeriodInstance: window.difalApp?.multiPeriodManager ? 'initialized' : 'not_found',
            analyticsInstance: window.difalApp?.analyticsManager ? 'initialized' : 'not_found',
            chartsInstance: window.difalApp?.chartsManager ? 'initialized' : 'not_found',
            
            // Core modules
            stateManager: !!window.stateManager,
            modeManager: !!window.modeManager,
            
            // File upload
            fileUploadManager: window.difalApp?.fileUploadManager ? 'initialized' : 'not_found',
            
            // Calculator
            difalCalculator: window.difalApp?.difalCalculator ? 'initialized' : 'not_found'
        };
    });

    console.log('🔧 Módulos JavaScript Disponíveis:', jsModules);

    // === ETAPA 3: TESTAR SELEÇÃO MODO MULTI-PERÍODO ===
    console.log('\n🎯 === ETAPA 3: TESTAR SELEÇÃO MODO MULTI-PERÍODO ===');
    
    await page.click('#multi-period-btn');
    await page.waitForTimeout(1500);

    const modeSelectionResult = await page.evaluate(() => {
        return {
            activeMode: window.modeManager?.activeMode || 'unknown',
            navigationVisible: !document.getElementById('main-navigation')?.classList.contains('hidden'),
            modeSelectionHidden: document.getElementById('mode-selection-section')?.classList.contains('hidden'),
            multiUploadActive: document.getElementById('multi-upload-section')?.classList.contains('active'),
            multiNavButtonsVisible: document.querySelectorAll('.nav-btn.mode-multi:not(.hidden)').length,
            singleNavButtonsHidden: document.querySelectorAll('.nav-btn.mode-single.hidden').length
        };
    });

    console.log('🔄 Resultado da Seleção Multi-Período:', modeSelectionResult);

    // === ETAPA 4: ANÁLISE DE FUNCIONALIDADES MULTI-PERÍODO ===
    console.log('\n⚙️ === ETAPA 4: ANÁLISE DE FUNCIONALIDADES MULTI-PERÍODO ===');
    
    // Verificar se MultiPeriodManager está funcional
    const multiPeriodCapabilities = await page.evaluate(() => {
        const manager = window.difalApp?.multiPeriodManager;
        if (!manager) return { error: 'MultiPeriodManager not found' };
        
        return {
            hasAddPeriodMethod: typeof manager.addPeriod === 'function',
            hasGetConsolidatedItemsMethod: typeof manager.getConsolidatedItems === 'function',
            hasGetConsolidatedStatsMethod: typeof manager.getConsolidatedStats === 'function',
            canAddMorePeriods: typeof manager.canAddMorePeriods === 'function' ? manager.canAddMorePeriods() : 'unknown',
            currentCompany: manager.getCurrentCompany ? manager.getCurrentCompany() : null,
            hasPeriods: manager.hasPeriods ? manager.hasPeriods() : false,
            maxPeriods: manager.config?.maxPeriods || 'unknown'
        };
    });

    console.log('📅 Capacidades do MultiPeriodManager:', multiPeriodCapabilities);

    // Verificar AnalyticsManager
    const analyticsCapabilities = await page.evaluate(() => {
        const analytics = window.difalApp?.analyticsManager;
        if (!analytics) return { error: 'AnalyticsManager not found' };
        
        return {
            hasProcessAllAnalyticsMethod: typeof analytics.processAllAnalytics === 'function',
            hasConfig: !!analytics.config,
            paretoThreshold: analytics.config?.paretoThreshold || 'unknown',
            minItemsForAnalysis: analytics.config?.minItemsForAnalysis || 'unknown',
            topNCMsLimit: analytics.config?.topNCMsLimit || 'unknown'
        };
    });

    console.log('📊 Capacidades do AnalyticsManager:', analyticsCapabilities);

    // === ETAPA 5: ANÁLISE DE INTEGRAÇÃO COM DIFAL CALCULATOR ===
    console.log('\n🧮 === ETAPA 5: ANÁLISE INTEGRAÇÃO DIFAL CALCULATOR ===');
    
    const calculatorIntegration = await page.evaluate(() => {
        const calculator = window.difalApp?.difalCalculator;
        if (!calculator) return { error: 'DifalCalculator not found' };
        
        return {
            hasCarregarItensMethod: typeof calculator.carregarItens === 'function',
            hasCalcularTodosMethod: typeof calculator.calcularTodos === 'function',
            currentItens: calculator.itens?.length || 0,
            hasResultados: !!calculator.resultados,
            hasTotalizadores: !!calculator.totalizadores,
            
            // Verificar se suporta metadados de período
            supportsPeridMetadata: 'needs_investigation' // Será verificado na implementação
        };
    });

    console.log('🔧 Integração com DifalCalculator:', calculatorIntegration);

    // === ETAPA 6: ANÁLISE DE EXPORT MANAGER ===
    console.log('\n📤 === ETAPA 6: ANÁLISE EXPORT MANAGER ===');
    
    const exportCapabilities = await page.evaluate(() => {
        const exportManager = window.difalApp?.exportManager;
        if (!exportManager) return { error: 'ExportManager not found' };
        
        return {
            hasExportExcelMethod: typeof exportManager.exportToExcel === 'function',
            hasExportPdfMethod: typeof exportManager.exportToPDF === 'function',
            hasMultiPeriodButtons: {
                excel: !!document.getElementById('multi-export-excel'),
                pdf: !!document.getElementById('multi-export-pdf')
            },
            dependencies: {
                xlsxPopulate: !!window.XlsxPopulate,
                jsPDF: !!window.jsPDF
            }
        };
    });

    console.log('📋 Capacidades do ExportManager:', exportCapabilities);

    // === ETAPA 7: NAVEGAR PELAS SEÇÕES MULTI-PERÍODO ===
    console.log('\n🧭 === ETAPA 7: NAVEGAÇÃO ENTRE SEÇÕES MULTI-PERÍODO ===');
    
    const navigationResults = [];

    // Testar navegação para Periods
    await page.click('[data-section="multi-periods-section"]');
    await page.waitForTimeout(1000);
    
    let sectionState = await page.evaluate(() => ({
        section: 'multi-periods-section',
        active: document.getElementById('multi-periods-section')?.classList.contains('active'),
        visible: !document.getElementById('multi-periods-section')?.classList.contains('hidden')
    }));
    navigationResults.push(sectionState);

    // Testar navegação para Analytics  
    await page.click('[data-section="multi-analytics-section"]');
    await page.waitForTimeout(1000);
    
    sectionState = await page.evaluate(() => ({
        section: 'multi-analytics-section',
        active: document.getElementById('multi-analytics-section')?.classList.contains('active'),
        visible: !document.getElementById('multi-analytics-section')?.classList.contains('hidden')
    }));
    navigationResults.push(sectionState);

    // Testar navegação para Reports
    await page.click('[data-section="multi-reports-section"]');
    await page.waitForTimeout(1000);
    
    sectionState = await page.evaluate(() => ({
        section: 'multi-reports-section', 
        active: document.getElementById('multi-reports-section')?.classList.contains('active'),
        visible: !document.getElementById('multi-reports-section')?.classList.contains('hidden')
    }));
    navigationResults.push(sectionState);

    console.log('🗺️ Resultados de Navegação:', navigationResults);

    // === ETAPA 8: DIAGNÓSTICO FINAL ===
    console.log('\n🎯 === ETAPA 8: DIAGNÓSTICO FINAL ===');
    
    const finalDiagnosis = {
        interfaceMultiPeriod: {
            sectionsImplemented: multiPeriodElements.multiUploadSection && multiPeriodElements.multiPeriodsSection,
            navigationWorking: navigationResults.every(r => r.active && r.visible),
            exportButtonsPresent: multiPeriodElements.multiExportExcel && multiPeriodElements.multiExportPdf
        },
        
        jsModulesMultiPeriod: {
            managersAvailable: jsModules.multiPeriodManager && jsModules.analyticsManager,
            instancesInitialized: jsModules.multiPeriodInstance === 'initialized' && jsModules.analyticsInstance === 'initialized',
            calculatorAvailable: jsModules.difalCalculator === 'initialized'
        },
        
        functionalityGaps: {
            calculatorIntegration: calculatorIntegration.supportsPeridMetadata === 'needs_investigation',
            exportIntegration: 'needs_verification',
            uiOrchestration: 'needs_implementation'
        },

        readyComponents: [
            'MultiPeriodManager', 'AnalyticsManager', 'ParetoAnalyzer', 'ChartsManager', 'Interface HTML'
        ],
        
        needsAdaptation: [
            'DifalCalculator', 'ResultsRenderer', 'ExportManager workflows', 'UI-Manager orchestration'
        ]
    };

    console.log('\n📋 === DIAGNÓSTICO FINAL ===');
    console.log('✅ Componentes Prontos:', finalDiagnosis.readyComponents);
    console.log('🔄 Precisam Adaptação:', finalDiagnosis.needsAdaptation);
    console.log('🎯 Análise Completa:', finalDiagnosis);

    // Assertions para validar descobertas
    expect(multiPeriodElements.multiUploadSection).toBe(true);
    expect(multiPeriodElements.multiPeriodsSection).toBe(true);
    expect(multiPeriodElements.multiAnalyticsSection).toBe(true);
    expect(jsModules.multiPeriodManager).toBe(true);
    expect(jsModules.analyticsManager).toBe(true);
    expect(modeSelectionResult.activeMode).toBe('multi');
    expect(navigationResults.every(r => r.active && r.visible)).toBe(true);

    console.log('\n✅ ANÁLISE MULTI-PERÍODO CONCLUÍDA COM SUCESSO!');
});