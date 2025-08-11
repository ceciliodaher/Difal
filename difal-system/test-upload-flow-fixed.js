/**
 * Teste para verificar se o fluxo de upload corrigido funciona
 * Teste específico para correção da exibição automática após importação SPED
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Sistema DIFAL - Fluxo de Upload Corrigido', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('file://' + path.join(__dirname, 'sistema.html'));
        await page.waitForLoadState('networkidle');
        
        // Aguardar inicialização completa dos módulos
        await page.waitForFunction(() => {
            return window.uiManager && 
                   window.uiManager.fileUploadManager && 
                   window.difalApp && 
                   window.difalApp.isInitialized;
        }, { timeout: 10000 });
    });

    test('Deve navegar automaticamente e abrir modal após upload SPED', async ({ page }) => {
        // Preparar arquivo SPED de teste
        const spedContent = `|0000|1|0|${new Date().toISOString().slice(0, 7).replace('-', '')}|31|35|123456789000100|EMPRESA TESTE|SP|SP|1234567|5555|N|N|
|0001|0|
|C001|0|
|C100|0|1|1|55|00|123456789000100|06|001|000001|000001|${new Date().toISOString().slice(0, 10).replace(/-/g, '')}|${new Date().toISOString().slice(0, 10).replace(/-/g, '')}|1000,00|0|1000,00|5102|98765432100|SP|5555|1234567|1000,00|0,00|0,00|0,00|1000,00|N|
|C170|001|6403.99.90|1000000000||UN|1,000|1000,00|0,00|5102|0|00||||||
|C190|000|1000,00|0,00|0,00|0,00|1000,00|0,00|
|9001|1|
|9999|3|`;
        
        // Simular upload do arquivo
        await page.setInputFiles('#file-input', {
            name: 'teste.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from(spedContent)
        });

        // Aguardar processamento
        console.log('🧪 Aguardando processamento do arquivo...');
        await page.waitForFunction(() => {
            return window.spedData && window.spedData.itensDifal && window.spedData.itensDifal.length > 0;
        }, { timeout: 15000 });

        // Verificar se navegou automaticamente para seção de análise
        console.log('🧪 Verificando navegação automática...');
        const analysisSection = page.locator('#analysis-section');
        await expect(analysisSection).toBeVisible({ timeout: 5000 });
        await expect(analysisSection).toHaveClass(/active/);

        // Verificar se informações da empresa foram atualizadas
        console.log('🧪 Verificando informações da empresa...');
        await expect(page.locator('#company-name')).not.toHaveText('-');
        await expect(page.locator('#company-uf')).not.toHaveText('-');

        // Verificar se tabela de itens DIFAL foi criada
        console.log('🧪 Verificando tabela de itens...');
        const difalTable = page.locator('#difal-items-table table');
        await expect(difalTable).toBeVisible({ timeout: 3000 });
        
        const tableRows = difalTable.locator('tbody tr');
        await expect(tableRows).toHaveCount(1); // Esperamos 1 item DIFAL

        // VERIFICAÇÃO PRINCIPAL: Modal deve abrir automaticamente
        console.log('🧪 Aguardando abertura automática do modal...');
        await page.waitForTimeout(1500); // Aguardar timeout de 1s + margem

        const configModal = page.locator('#config-modal');
        await expect(configModal).toBeVisible({ timeout: 3000 });
        await expect(configModal).not.toHaveClass(/hidden/);

        // Verificar conteúdo do modal
        console.log('🧪 Verificando conteúdo do modal...');
        await expect(page.locator('#config-modal h2')).toContainText('Configuração Geral do DIFAL');
        
        // Verificar campos de metodologia
        await expect(page.locator('input[name="metodologia"][value="auto"]')).toBeChecked();
        
        // Verificar campos de benefícios
        await expect(page.locator('#carga-efetiva')).toBeVisible();
        await expect(page.locator('#aliq-origem-efetiva')).toBeVisible();
        await expect(page.locator('#aliq-destino-efetiva')).toBeVisible();

        console.log('✅ Fluxo de upload corrigido funcionando perfeitamente!');
        console.log('✅ Modal aberto automaticamente após importação');
        console.log('✅ Usuário pode configurar método de cálculo e benefícios');
    });

    test('Deve mostrar log correto do fluxo de correção', async ({ page }) => {
        let logs = [];
        page.on('console', msg => {
            if (msg.type() === 'log') {
                logs.push(msg.text());
            }
        });

        // Simular upload
        const spedContent = `|0000|1|0|${new Date().toISOString().slice(0, 7).replace('-', '')}|31|35|123456789000100|EMPRESA TESTE|SP|SP|1234567|5555|N|N|
|C100|0|1|1|55|00|123456789000100|06|001|000001|000001|${new Date().toISOString().slice(0, 10).replace(/-/g, '')}|${new Date().toISOString().slice(0, 10).replace(/-/g, '')}|1000,00|0|1000,00|5102|98765432100|SP|5555|1234567|1000,00|0,00|0,00|0,00|1000,00|N|
|C170|001|6403.99.90|1000000000||UN|1,000|1000,00|0,00|5102|0|00||||||`;
        
        await page.setInputFiles('#file-input', {
            name: 'teste.txt',
            mimeType: 'text/plain', 
            buffer: Buffer.from(spedContent)
        });

        // Aguardar e verificar logs
        await page.waitForTimeout(2000);
        
        const relevantLogs = logs.filter(log => 
            log.includes('🎯 Abrindo modal de configuração automaticamente') ||
            log.includes('Upload concluído') ||
            log.includes('Navegando para página')
        );

        expect(relevantLogs.length).toBeGreaterThan(0);
        console.log('✅ Logs de correção funcionando:', relevantLogs);
    });

    test('Deve funcionar com drag & drop também', async ({ page }) => {
        // Simular drag & drop
        const spedContent = `|0000|1|0|${new Date().toISOString().slice(0, 7).replace('-', '')}|31|35|123456789000100|EMPRESA TESTE|SP|SP|1234567|5555|N|N|
|C100|0|1|1|55|00|123456789000100|06|001|000001|000001|${new Date().toISOString().slice(0, 10).replace(/-/g, '')}|${new Date().toISOString().slice(0, 10).replace(/-/g, '')}|1000,00|0|1000,00|5102|98765432100|SP|5555|1234567|1000,00|0,00|0,00|0,00|1000,00|N|
|C170|001|6403.99.90|1000000000||UN|1,000|1000,00|0,00|5102|0|00||||||`;
        
        const dropZone = page.locator('#drop-zone');
        
        // Simular drop de arquivo
        const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
        const file = new File([spedContent], 'teste.txt', { type: 'text/plain' });
        await dataTransfer.evaluate((dt, file) => {
            dt.items.add(file);
        }, file);

        await dropZone.dispatchEvent('drop', { dataTransfer });

        // Aguardar processamento e verificar modal
        await page.waitForTimeout(2000);
        
        const configModal = page.locator('#config-modal');
        await expect(configModal).toBeVisible({ timeout: 5000 });
        
        console.log('✅ Drag & drop também funciona com correção!');
    });

});