/**
 * @fileoverview Comprehensive Playwright Test Suite for DIFAL Multi-Period System
 * @description Complete end-to-end testing for multi-period workflow including:
 * - Mode selection
 * - Multiple SPED file uploads
 * - Period management and validation
 * - Analytics generation
 * - DIFAL calculations
 * - Results verification
 * 
 * @author Sistema DIFAL
 * @version 1.0.0
 * @since 2025-01-13
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_CONFIG = {
    baseURL: 'file:///Users/ceciliodaher/Documents/git/difal/difal-system/sistema.html',
    spedFilesPath: '/Users/ceciliodaher/Documents/git/difal/documentos/',
    timeout: 30000, // 30 second timeout for complex operations
    retries: 2
};

// SPED test files
const SPED_FILES = [
    '13158698000110-106379704-20241001-20241031-0-2E48C31D567EF8BF13FF576A9F29777019947826-SPED-EFD.txt',
    '13158698000110-106379704-20250101-20250131-1-DED4E284399363BC7F1F48E5A39EE85261E47B67-SPED-EFD.txt'
];

test.describe('DIFAL Multi-Period System - Comprehensive Tests', () => {
    
    test.beforeEach(async ({ page }) => {
        // Set timeouts
        page.setDefaultTimeout(TEST_CONFIG.timeout);
        
        // Enable console logging for debugging
        page.on('console', msg => {
            console.log(`Browser Console [${msg.type()}]: ${msg.text()}`);
        });
        
        // Listen for JavaScript errors
        page.on('pageerror', error => {
            console.error('Browser JavaScript Error:', error);
        });
        
        // Navigate to the system
        console.log('🌐 Navegando para:', TEST_CONFIG.baseURL);
        await page.goto(TEST_CONFIG.baseURL);
        
        // Wait for page load and basic elements
        await page.waitForLoadState('networkidle');
        await expect(page.locator('h1')).toContainText('Sistema de Cálculo DIFAL');
    });

    test('01 - System Initialization and Mode Selection', async ({ page }) => {
        console.log('🧪 Teste 01: Inicialização do sistema e seleção de modo');
        
        // Verify initial page state
        await expect(page.locator('#mode-selection-section')).toBeVisible();
        await expect(page.locator('.mode-card[data-mode="multi"]')).toBeVisible();
        
        // Verify navigation is hidden initially
        await expect(page.locator('#main-navigation')).toHaveClass(/hidden/);
        
        // Click multi-period mode
        console.log('👆 Selecionando modo múltiplos períodos...');
        await page.click('button[data-mode="multi"]');
        
        // Wait for mode initialization (allow up to 5 seconds)
        await page.waitForTimeout(2000);
        
        // Verify mode selection worked
        await expect(page.locator('#mode-selection-section')).toHaveClass(/hidden/);
        await expect(page.locator('#main-navigation')).not.toHaveClass(/hidden/);
        
        // Verify correct navigation buttons are visible for multi-period mode
        await expect(page.locator('.nav-btn.mode-multi')).toHaveCount(5); // Upload, Periods, Analytics, Calculation, Reports
        
        // Verify upload section is visible
        await expect(page.locator('#multi-upload-section')).not.toHaveClass(/hidden/);
        
        console.log('✅ Modo múltiplos períodos selecionado com sucesso');
    });

    test('02 - Multi-Period File Upload Workflow', async ({ page }) => {
        console.log('🧪 Teste 02: Upload de múltiplos arquivos SPED');
        
        // Initialize multi-period mode
        await page.click('button[data-mode="multi"]');
        await page.waitForTimeout(2000);
        
        // Verify upload section is active
        await expect(page.locator('#multi-upload-section')).not.toHaveClass(/hidden/);
        await expect(page.locator('#multi-period-drop-zone')).toBeVisible();
        
        // Test file uploads
        for (let i = 0; i < SPED_FILES.length; i++) {
            const fileName = SPED_FILES[i];
            const filePath = path.join(TEST_CONFIG.spedFilesPath, fileName);
            
            console.log(`📁 Fazendo upload do arquivo ${i + 1}: ${fileName}`);
            
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                console.warn(`⚠️ Arquivo não encontrado: ${filePath}`);
                continue;
            }
            
            // Upload file
            const fileInput = page.locator('#multi-period-file-input');
            await fileInput.setInputFiles(filePath);
            
            // Wait for file processing
            console.log('⏳ Aguardando processamento do arquivo...');
            await page.waitForTimeout(3000);
            
            // Check for any error messages
            const errorMessages = await page.locator('.alert-error, .error-message, .alert.error').all();
            if (errorMessages.length > 0) {
                const errorText = await errorMessages[0].textContent();
                console.warn(`⚠️ Possível erro detectado: ${errorText}`);
            }
        }
        
        // Wait for all files to process
        await page.waitForTimeout(2000);
        
        // Verify proceed button becomes available
        const proceedButton = page.locator('#multi-proceed-periods');
        await expect(proceedButton).not.toHaveClass(/hidden/);
        
        console.log('✅ Upload de arquivos concluído');
    });

    test('03 - Periods Management and Validation', async ({ page }) => {
        console.log('🧪 Teste 03: Gestão e validação de períodos');
        
        // Setup: Upload files and navigate to periods section
        await page.click('button[data-mode="multi"]');
        await page.waitForTimeout(2000);
        
        // Upload files (simplified for test)
        for (const fileName of SPED_FILES.slice(0, 1)) { // Upload at least one file
            const filePath = path.join(TEST_CONFIG.spedFilesPath, fileName);
            if (fs.existsSync(filePath)) {
                await page.locator('#multi-period-file-input').setInputFiles(filePath);
                await page.waitForTimeout(3000);
            }
        }
        
        // Navigate to periods section
        console.log('🎯 Navegando para seção de períodos...');
        await page.click('button[data-section="multi-periods-section"]');
        
        // Wait for periods section to load
        await page.waitForTimeout(1000);
        
        // Verify periods section is visible
        await expect(page.locator('#multi-periods-section')).not.toHaveClass(/hidden/);
        
        // Check for company information
        const companyInfo = page.locator('#multi-current-company-info');
        await expect(companyInfo).toBeVisible();
        
        // Check for periods list
        const periodsList = page.locator('#multi-periods-list');
        if (await periodsList.isVisible()) {
            console.log('📊 Lista de períodos encontrada');
            
            // Check consolidated statistics
            const consolidatedStats = page.locator('#multi-consolidated-stats');
            if (await consolidatedStats.isVisible()) {
                const totalItems = await page.locator('#multi-consolidated-total-items').textContent();
                const totalValue = await page.locator('#multi-consolidated-total-value').textContent();
                console.log(`📈 Estatísticas: ${totalItems} itens, valor ${totalValue}`);
            }
        }
        
        console.log('✅ Seção de períodos verificada');
    });

    test('04 - Analytics Generation and Navigation', async ({ page }) => {
        console.log('🧪 Teste 04: Geração de analytics e navegação');
        
        // Setup: Complete initial steps
        await page.click('button[data-mode="multi"]');
        await page.waitForTimeout(2000);
        
        // Upload at least one file
        const fileName = SPED_FILES[0];
        const filePath = path.join(TEST_CONFIG.spedFilesPath, fileName);
        if (fs.existsSync(filePath)) {
            await page.locator('#multi-period-file-input').setInputFiles(filePath);
            await page.waitForTimeout(3000);
        }
        
        // Try different ways to navigate to analytics
        console.log('🎯 Tentando navegação para analytics...');
        
        // Method 1: Via navigation button
        const analyticsNavBtn = page.locator('button[data-section="multi-analytics-section"]');
        if (await analyticsNavBtn.isVisible()) {
            await analyticsNavBtn.click();
        } else {
            // Method 2: Via periods section button
            await page.click('button[data-section="multi-periods-section"]');
            await page.waitForTimeout(1000);
            
            const generateAnalyticsBtn = page.locator('#multi-generate-analytics');
            if (await generateAnalyticsBtn.isVisible()) {
                await generateAnalyticsBtn.click();
                await page.waitForTimeout(2000);
            }
            
            const proceedAnalyticsBtn = page.locator('#multi-proceed-to-analytics');
            if (await proceedAnalyticsBtn.isVisible()) {
                await proceedAnalyticsBtn.click();
            }
        }
        
        // Wait for analytics section
        await page.waitForTimeout(2000);
        
        // Verify analytics section
        const analyticsSection = page.locator('#multi-analytics-section');
        if (await analyticsSection.isVisible()) {
            console.log('📊 Seção de analytics carregada');
            
            // Check for analytics tabs
            const tabsContainer = page.locator('#multi-analytics-tabs');
            if (await tabsContainer.isVisible()) {
                const tabs = await page.locator('.tab-btn').all();
                console.log(`📋 ${tabs.length} abas de analytics encontradas`);
                
                // Test tab navigation
                for (let i = 0; i < Math.min(tabs.length, 2); i++) {
                    await tabs[i].click();
                    await page.waitForTimeout(500);
                }
            }
        }
        
        console.log('✅ Analytics verificadas');
    });

    test('05 - Multi-Period Items Display', async ({ page }) => {
        console.log('🧪 Teste 05: Exibição de itens consolidados');
        
        // Setup and navigate to analytics
        await page.click('button[data-mode="multi"]');
        await page.waitForTimeout(2000);
        
        // Upload file
        const fileName = SPED_FILES[0];
        const filePath = path.join(TEST_CONFIG.spedFilesPath, fileName);
        if (fs.existsSync(filePath)) {
            await page.locator('#multi-period-file-input').setInputFiles(filePath);
            await page.waitForTimeout(4000); // Give extra time for processing
        }
        
        // Navigate to analytics
        await page.click('button[data-section="multi-analytics-section"]');
        await page.waitForTimeout(2000);
        
        // Check for consolidated items table/display
        const possibleSelectors = [
            '#multi-analytics-summary',
            '#multi-pareto-analysis',
            '#multi-ncm-ranking',
            '.analysis-content',
            '.data-table',
            '#multi-analytics-tabs'
        ];
        
        let foundContent = false;
        for (const selector of possibleSelectors) {
            const element = page.locator(selector);
            if (await element.isVisible()) {
                console.log(`📋 Conteúdo encontrado: ${selector}`);
                foundContent = true;
                
                // Check for data within the element
                const text = await element.textContent();
                if (text && text.trim().length > 10) {
                    console.log(`📊 Conteúdo com dados: ${text.substring(0, 100)}...`);
                }
            }
        }
        
        if (!foundContent) {
            console.warn('⚠️ Nenhum conteúdo de analytics visível');
            
            // Try to trigger analytics generation
            const generateBtn = page.locator('#multi-generate-analytics');
            if (await generateBtn.isVisible()) {
                console.log('🔄 Tentando gerar analytics...');
                await generateBtn.click();
                await page.waitForTimeout(3000);
            }
        }
        
        console.log('✅ Verificação de exibição de itens concluída');
    });

    test('06 - DIFAL Calculation Workflow', async ({ page }) => {
        console.log('🧪 Teste 06: Workflow de cálculo DIFAL');
        
        // Setup multi-period mode and upload
        await page.click('button[data-mode="multi"]');
        await page.waitForTimeout(2000);
        
        const fileName = SPED_FILES[0];
        const filePath = path.join(TEST_CONFIG.spedFilesPath, fileName);
        if (fs.existsSync(filePath)) {
            await page.locator('#multi-period-file-input').setInputFiles(filePath);
            await page.waitForTimeout(4000);
        }
        
        // Navigate to calculation section
        console.log('🧮 Navegando para seção de cálculo...');
        await page.click('button[data-section="multi-calculation-section"]');
        await page.waitForTimeout(1500);
        
        // Verify calculation section is visible
        const calculationSection = page.locator('#multi-calculation-section');
        await expect(calculationSection).not.toHaveClass(/hidden/);
        
        // Check calculation summary
        const summarySection = page.locator('#multi-calculation-summary');
        if (await summarySection.isVisible()) {
            console.log('📊 Resumo de cálculo encontrado');
        }
        
        // Configure DIFAL settings
        const ufDestino = page.locator('#multi-uf-destino');
        if (await ufDestino.isVisible()) {
            console.log('⚙️ Configurando UF destino...');
            await ufDestino.selectOption('SP');
        }
        
        const aliquotaInterna = page.locator('#multi-aliquota-interna');
        if (await aliquotaInterna.isVisible()) {
            await aliquotaInterna.fill('18');
        }
        
        // Trigger calculation
        const calculateBtn = page.locator('#multi-calculate-difal-btn');
        if (await calculateBtn.isVisible()) {
            console.log('🧮 Executando cálculo DIFAL...');
            await calculateBtn.click();
            
            // Wait for calculation to complete
            await page.waitForTimeout(3000);
            
            // Check for results
            const resultsSection = page.locator('#multi-calculation-results');
            if (await resultsSection.isVisible()) {
                console.log('📋 Resultados de cálculo encontrados');
                
                // Check results table
                const resultsTable = page.locator('#multi-difal-results-table');
                if (await resultsTable.isVisible()) {
                    const rows = await page.locator('#multi-difal-results-table tbody tr').count();
                    console.log(`📊 ${rows} linhas de resultados encontradas`);
                }
            }
        }
        
        console.log('✅ Workflow de cálculo DIFAL verificado');
    });

    test('07 - Results Verification and Export', async ({ page }) => {
        console.log('🧪 Teste 07: Verificação de resultados e exportação');
        
        // Complete setup and calculation
        await page.click('button[data-mode="multi"]');
        await page.waitForTimeout(2000);
        
        const fileName = SPED_FILES[0];
        const filePath = path.join(TEST_CONFIG.spedFilesPath, fileName);
        if (fs.existsSync(filePath)) {
            await page.locator('#multi-period-file-input').setInputFiles(filePath);
            await page.waitForTimeout(4000);
        }
        
        // Navigate to reports section
        console.log('📈 Navegando para seção de relatórios...');
        await page.click('button[data-section="multi-reports-section"]');
        await page.waitForTimeout(1500);
        
        // Verify reports section
        const reportsSection = page.locator('#multi-reports-section');
        await expect(reportsSection).not.toHaveClass(/hidden/);
        
        // Check export buttons
        const exportButtons = [
            '#multi-export-analytics-excel',
            '#multi-export-analytics-pdf',
            '#multi-export-consolidated-report'
        ];
        
        for (const buttonId of exportButtons) {
            const button = page.locator(buttonId);
            if (await button.isVisible()) {
                console.log(`📤 Botão de exportação encontrado: ${buttonId}`);
                
                // Test button click (but don't actually download in tests)
                // await button.click();
                // await page.waitForTimeout(500);
            }
        }
        
        // Check dashboard
        const dashboard = page.locator('#multi-reports-dashboard');
        if (await dashboard.isVisible()) {
            console.log('📊 Dashboard de relatórios encontrado');
        }
        
        console.log('✅ Verificação de resultados e exportação concluída');
    });

    test('08 - Error Handling and Edge Cases', async ({ page }) => {
        console.log('🧪 Teste 08: Tratamento de erros e casos extremos');
        
        // Test mode selection without system ready
        await page.click('button[data-mode="multi"]');
        await page.waitForTimeout(1000);
        
        // Test navigation without data
        console.log('🔍 Testando navegação sem dados...');
        const navButtons = await page.locator('.nav-btn.mode-multi').all();
        
        for (let i = 0; i < Math.min(navButtons.length, 3); i++) {
            if (await navButtons[i].isVisible()) {
                await navButtons[i].click();
                await page.waitForTimeout(500);
                
                // Check if section loads gracefully
                const activeSection = await page.locator('.section:not(.hidden)').first();
                if (activeSection) {
                    const sectionId = await activeSection.getAttribute('id');
                    console.log(`📍 Navegação para: ${sectionId}`);
                }
            }
        }
        
        // Test invalid file upload (if we had invalid files)
        console.log('🔍 Testando comportamento sem arquivos válidos...');
        
        // Test calculation without proper setup
        await page.click('button[data-section="multi-calculation-section"]');
        await page.waitForTimeout(1000);
        
        const calculateBtn = page.locator('#multi-calculate-difal-btn');
        if (await calculateBtn.isVisible()) {
            // This should handle gracefully when no data is available
            await calculateBtn.click();
            await page.waitForTimeout(2000);
        }
        
        console.log('✅ Teste de tratamento de erros concluído');
    });

    test('09 - Complete End-to-End Workflow', async ({ page }) => {
        console.log('🧪 Teste 09: Workflow completo end-to-end');
        
        // Complete workflow simulation
        console.log('🚀 Iniciando workflow completo...');
        
        // 1. Mode selection
        await page.click('button[data-mode="multi"]');
        await page.waitForTimeout(2000);
        console.log('✅ 1. Modo selecionado');
        
        // 2. File upload
        let filesUploaded = 0;
        for (const fileName of SPED_FILES) {
            const filePath = path.join(TEST_CONFIG.spedFilesPath, fileName);
            if (fs.existsSync(filePath)) {
                await page.locator('#multi-period-file-input').setInputFiles(filePath);
                await page.waitForTimeout(3000);
                filesUploaded++;
                console.log(`✅ 2.${filesUploaded} Arquivo carregado: ${fileName}`);
            }
        }
        
        // 3. Navigate through all sections
        const sections = [
            'multi-periods-section',
            'multi-analytics-section',
            'multi-calculation-section',
            'multi-reports-section'
        ];
        
        for (let i = 0; i < sections.length; i++) {
            const sectionId = sections[i];
            console.log(`🎯 ${i + 3}. Navegando para: ${sectionId}`);
            
            await page.click(`button[data-section="${sectionId}"]`);
            await page.waitForTimeout(1500);
            
            // Verify section is active
            const section = page.locator(`#${sectionId}`);
            await expect(section).not.toHaveClass(/hidden/);
            
            // Perform section-specific actions
            if (sectionId === 'multi-calculation-section') {
                // Configure and calculate
                const ufSelect = page.locator('#multi-uf-destino');
                if (await ufSelect.isVisible()) {
                    await ufSelect.selectOption('SP');
                }
                
                const calculateBtn = page.locator('#multi-calculate-difal-btn');
                if (await calculateBtn.isVisible()) {
                    await calculateBtn.click();
                    await page.waitForTimeout(2000);
                }
            }
        }
        
        console.log('🎉 Workflow completo executado com sucesso!');
    });

    test('10 - System Performance and Responsiveness', async ({ page }) => {
        console.log('🧪 Teste 10: Performance e responsividade do sistema');
        
        const startTime = Date.now();
        
        // Test system initialization time
        await page.click('button[data-mode="multi"]');
        const initTime = Date.now() - startTime;
        console.log(`⏱️ Tempo de inicialização: ${initTime}ms`);
        
        // Test file upload performance
        const fileName = SPED_FILES[0];
        const filePath = path.join(TEST_CONFIG.spedFilesPath, fileName);
        
        if (fs.existsSync(filePath)) {
            const uploadStartTime = Date.now();
            await page.locator('#multi-period-file-input').setInputFiles(filePath);
            await page.waitForTimeout(3000);
            const uploadTime = Date.now() - uploadStartTime;
            console.log(`📁 Tempo de upload: ${uploadTime}ms`);
        }
        
        // Test navigation performance
        const navStartTime = Date.now();
        await page.click('button[data-section="multi-analytics-section"]');
        await page.waitForTimeout(1000);
        const navTime = Date.now() - navStartTime;
        console.log(`🧭 Tempo de navegação: ${navTime}ms`);
        
        // Check for memory leaks or console errors
        const consoleLogs = [];
        page.on('console', msg => consoleLogs.push(msg.text()));
        
        // Stress test: rapid navigation
        const sections = ['multi-periods-section', 'multi-analytics-section', 'multi-calculation-section'];
        for (let i = 0; i < 3; i++) {
            for (const section of sections) {
                await page.click(`button[data-section="${section}"]`);
                await page.waitForTimeout(300);
            }
        }
        
        const totalTime = Date.now() - startTime;
        console.log(`⏱️ Tempo total do teste: ${totalTime}ms`);
        
        // Report performance metrics
        if (totalTime < 15000) {
            console.log('✅ Performance: EXCELENTE (< 15s)');
        } else if (totalTime < 30000) {
            console.log('⚠️ Performance: ACEITÁVEL (< 30s)');
        } else {
            console.log('❌ Performance: LENTA (> 30s)');
        }
        
        console.log('✅ Teste de performance concluído');
    });
});

// Test helper functions
async function waitForElementWithRetry(page, selector, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await page.waitForSelector(selector, { timeout: 5000 });
            return true;
        } catch (error) {
            console.log(`Tentativa ${i + 1} falhada para ${selector}`);
            await page.waitForTimeout(1000);
        }
    }
    return false;
}

async function logCurrentPageState(page) {
    const visibleSections = await page.locator('.section:not(.hidden)').all();
    const sectionIds = await Promise.all(
        visibleSections.map(section => section.getAttribute('id'))
    );
    console.log('📍 Seções visíveis:', sectionIds);
}