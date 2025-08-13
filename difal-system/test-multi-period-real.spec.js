const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Sistema DIFAL Multi-Período - Teste com Arquivos SPED Reais', () => {
    test('Upload e processamento end-to-end com arquivos reais', async ({ page }) => {
        console.log('🧪 TESTE END-TO-END COM ARQUIVOS SPED REAIS\n');
        
        // Capturar todos os logs do console
        const consoleLogs = [];
        page.on('console', msg => {
            const text = msg.text();
            consoleLogs.push({
                type: msg.type(),
                text: text,
                timestamp: new Date().toISOString()
            });
            
            // Mostrar erros em tempo real
            if (msg.type() === 'error') {
                console.log(`❌ [${new Date().toLocaleTimeString()}] ${text}`);
            }
        });
        
        // Navegar para o sistema
        const systemPath = path.join(__dirname, '..', 'sistema.html');
        console.log(`📍 Carregando sistema: ${systemPath}`);
        await page.goto(`file://${systemPath}`);
        await page.waitForTimeout(3000);
        
        // Selecionar modo multi-período
        console.log('🎯 Selecionando modo multi-período...');
        const selectMulti = await page.locator('#select-multi');
        if (await selectMulti.isVisible()) {
            await selectMulti.click();
            await page.waitForTimeout(2000);
            console.log('✅ Modo multi-período selecionado');
        } else {
            console.log('⚠️ Botão de seleção não encontrado');
        }
        
        // Verificar se estamos na seção multi-upload
        const multiUploadSection = await page.locator('#multi-upload-section');
        expect(await multiUploadSection.isVisible()).toBeTruthy();
        console.log('✅ Seção multi-upload visível');
        
        // Localizar arquivos SPED reais
        const spedFiles = [
            '/Users/ceciliodaher/Documents/git/difal/documentos/13158698000110-106379704-20241001-20241031-0-2E48C31D567EF8BF13FF576A9F29777019947826-SPED-EFD.txt',
            '/Users/ceciliodaher/Documents/git/difal/documentos/13158698000110-106379704-20250101-20250131-1-DED4E284399363BC7F1F48E5A39EE85261E47B67-SPED-EFD.txt'
        ];
        
        // Verificar quais arquivos existem
        const existingFiles = spedFiles.filter(file => fs.existsSync(file));
        console.log(`📁 Arquivos SPED encontrados: ${existingFiles.length}/${spedFiles.length}`);
        existingFiles.forEach(file => {
            console.log(`  ✅ ${path.basename(file)}`);
        });
        
        if (existingFiles.length === 0) {
            console.log('❌ Nenhum arquivo SPED encontrado para teste');
            expect(existingFiles.length).toBeGreaterThan(0);
            return;
        }
        
        // Fazer upload dos arquivos
        console.log('\n📤 Iniciando upload dos arquivos SPED...');
        const fileInput = await page.locator('#multi-period-file-input');
        await fileInput.setInputFiles(existingFiles);
        
        // Aguardar processamento (tempo generoso)
        console.log('⏳ Aguardando processamento...');
        await page.waitForTimeout(10000);
        
        // Verificar erros específicos
        const criticalErrors = consoleLogs.filter(log => 
            log.type === 'error' && (
                log.text.includes('period.itensDifal is undefined') ||
                log.text.includes('processWithSpedParser is not a function') ||
                log.text.includes('TypeError') ||
                log.text.includes('ReferenceError')
            )
        );
        
        console.log('\n🔍 ANÁLISE DE ERROS:');
        if (criticalErrors.length > 0) {
            console.log(`❌ ${criticalErrors.length} erro(s) crítico(s) encontrado(s):`);
            criticalErrors.forEach((err, idx) => {
                console.log(`  ${idx + 1}. [${err.timestamp}] ${err.text}`);
            });
        } else {
            console.log('✅ Nenhum erro crítico encontrado!');
        }
        
        // Verificar se a tabela de períodos foi renderizada
        console.log('\n📊 VERIFICANDO RENDERIZAÇÃO:');
        const periodsTable = await page.locator('#periods-table');
        const isTableVisible = await periodsTable.isVisible();
        console.log(`📋 Tabela de períodos: ${isTableVisible ? '✅ Visível' : '❌ Não visível'}`);
        
        if (isTableVisible) {
            // Contar linhas da tabela
            const tableRows = await page.locator('#periods-table tbody tr').count();
            console.log(`📊 Períodos na tabela: ${tableRows}`);
            
            // Verificar se há dados nas células
            if (tableRows > 0) {
                const firstRowData = await page.locator('#periods-table tbody tr:first-child td').allTextContents();
                console.log('📋 Primeira linha da tabela:', firstRowData);
            }
        }
        
        // Verificar navegação para outras seções
        console.log('\n🧭 TESTANDO NAVEGAÇÃO:');
        const analyticsBtn = await page.locator('button[data-section="multi-analytics-section"]');
        if (await analyticsBtn.isVisible()) {
            await analyticsBtn.click();
            await page.waitForTimeout(1000);
            
            const analyticsSection = await page.locator('#multi-analytics-section');
            const isAnalyticsVisible = await analyticsSection.isVisible();
            console.log(`📈 Seção Analytics: ${isAnalyticsVisible ? '✅ Visível' : '❌ Não visível'}`);
        }
        
        // Verificar estado do sistema
        const systemState = await page.evaluate(() => {
            return {
                difalApp: !!window.difalApp,
                modeManager: !!window.difalApp?.modeManager,
                currentMode: window.difalApp?.modeManager?.currentMode,
                periodsManager: !!window.difalApp?.periodsManager,
                stateManager: !!window.difalApp?.stateManager,
                periodsCount: window.difalApp?.stateManager?.getState()?.periods?.totalPeriods || 0
            };
        });
        
        console.log('\n📊 ESTADO DO SISTEMA:');
        console.log('  DifalApp:', systemState.difalApp ? '✅' : '❌');
        console.log('  ModeManager:', systemState.modeManager ? '✅' : '❌');
        console.log('  PeriodsManager:', systemState.periodsManager ? '✅' : '❌');
        console.log('  StateManager:', systemState.stateManager ? '✅' : '❌');
        console.log('  Modo Atual:', systemState.currentMode || 'N/A');
        console.log('  Períodos Carregados:', systemState.periodsCount);
        
        // Verificar logs de sucesso
        const successLogs = consoleLogs.filter(log => 
            log.text.includes('✅') && (
                log.text.includes('Período adicionado') ||
                log.text.includes('processado para multi-período') ||
                log.text.includes('períodos processados com sucesso')
            )
        );
        
        console.log(`\n✅ Logs de sucesso: ${successLogs.length}`);
        
        // Salvar logs para análise
        const logContent = consoleLogs.map(log => 
            `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.text}`
        ).join('\n');
        
        const logPath = path.join(__dirname, '..', `test-results-${Date.now()}.log`);
        fs.writeFileSync(logPath, logContent);
        console.log(`📋 Logs salvos em: ${path.basename(logPath)}`);
        
        // Asserções finais
        expect(criticalErrors.length).toBe(0);
        expect(systemState.difalApp).toBeTruthy();
        expect(systemState.currentMode).toBe('multi');
        
        console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!');
    });
    
    test('Verificar funcionalidade de exportação', async ({ page }) => {
        console.log('🧪 TESTE DE EXPORTAÇÃO MULTI-PERÍODO');
        
        // Preparar sistema (versão simplificada)
        const systemPath = path.join(__dirname, '..', 'sistema.html');
        await page.goto(`file://${systemPath}`);
        await page.waitForTimeout(2000);
        
        // Verificar botões de exportação
        const exportButtons = await page.locator('button[id*="export"]').count();
        console.log(`📤 Botões de exportação encontrados: ${exportButtons}`);
        
        // Verificar se botões estão configurados
        const excelBtn = await page.locator('#multi-export-analytics-excel');
        const pdfBtn = await page.locator('#multi-export-analytics-pdf');
        
        if (await excelBtn.isVisible()) {
            console.log('✅ Botão Excel visível');
        }
        if (await pdfBtn.isVisible()) {
            console.log('✅ Botão PDF visível');
        }
        
        expect(exportButtons).toBeGreaterThan(0);
    });
});