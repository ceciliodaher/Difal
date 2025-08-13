/**
 * Testes Playwright para validar a interface de configuração DIFAL
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

// Configuração base
const BASE_URL = `file://${path.resolve(__dirname, '../sistema.html')}`;
const SPED_FILE_PATH = path.resolve(__dirname, '../documentos/13158698000110-106379704-20250401-20250430-1-03D99627A94945C9AF64C38A3A038FCC8EF950DF-SPED-EFD.txt');

test.describe('Sistema DIFAL - Configuração de Itens', () => {
    
    test.beforeEach(async ({ page }) => {
        // Navegar para a página
        await page.goto(BASE_URL);
        
        // Aguardar carregamento inicial
        await page.waitForSelector('.app-container', { timeout: 5000 });
    });

    test('Estrutura da tabela de configuração deve ter colunas corretas', async ({ page }) => {
        // Fazer upload do arquivo SPED primeiro
        const fileInput = await page.locator('#file-input');
        await fileInput.setInputFiles(SPED_FILE_PATH);
        
        // Aguardar processamento
        await page.waitForSelector('#proceed-calculation:not(.hidden)', { timeout: 10000 });
        
        // Navegar para análise
        await page.click('#proceed-calculation');
        
        // Clicar em Configurar e Calcular DIFAL
        await page.click('#calculate-difal');
        
        // Aguardar modal de configuração
        await page.waitForSelector('#config-modal:not(.hidden)', { timeout: 5000 });
        
        // Clicar em Configurar Itens Individualmente
        await page.click('button:has-text("Configurar Itens Individualmente")');
        
        // Aguardar modal de configuração de itens
        await page.waitForSelector('#item-config-modal:not(.hidden)', { timeout: 5000 });
        
        // Verificar cabeçalhos da tabela
        const headers = await page.$$eval('#tabela-configuracao-itens thead th', 
            elements => elements.map(el => el.textContent.trim())
        );
        
        expect(headers).toEqual([
            'Item',
            'NCM',
            'Descrição',
            'CFOP',
            'Valor Base',
            'Benefício',
            'Configuração',
            'FCP (%)',
            'Ações'
        ]);
    });

    test('Botões de ação devem estar na coluna correta', async ({ page }) => {
        // Setup similar ao teste anterior
        const fileInput = await page.locator('#file-input');
        await fileInput.setInputFiles(SPED_FILE_PATH);
        await page.waitForSelector('#proceed-calculation:not(.hidden)', { timeout: 10000 });
        await page.click('#proceed-calculation');
        await page.click('#calculate-difal');
        await page.waitForSelector('#config-modal:not(.hidden)', { timeout: 5000 });
        await page.click('button:has-text("Configurar Itens Individualmente")');
        await page.waitForSelector('#item-config-modal:not(.hidden)', { timeout: 5000 });
        
        // Verificar se os botões estão na última coluna
        const firstRow = await page.locator('#tabela-configuracao-itens tbody tr').first();
        const lastCell = await firstRow.locator('td').last();
        
        // Verificar presença dos botões NCM e ×
        const ncmButton = await lastCell.locator('button:has-text("NCM")');
        const clearButton = await lastCell.locator('button:has-text("×")');
        
        expect(await ncmButton.isVisible()).toBeTruthy();
        expect(await clearButton.isVisible()).toBeTruthy();
    });

    test('FCP deve mostrar valor percentual padrão', async ({ page }) => {
        // Setup
        const fileInput = await page.locator('#file-input');
        await fileInput.setInputFiles(SPED_FILE_PATH);
        await page.waitForSelector('#proceed-calculation:not(.hidden)', { timeout: 10000 });
        await page.click('#proceed-calculation');
        await page.click('#calculate-difal');
        await page.waitForSelector('#config-modal:not(.hidden)', { timeout: 5000 });
        await page.click('button:has-text("Configurar Itens Individualmente")');
        await page.waitForSelector('#item-config-modal:not(.hidden)', { timeout: 5000 });
        
        // Verificar se a coluna FCP mostra percentual
        const firstRow = await page.locator('#tabela-configuracao-itens tbody tr').first();
        const fcpCell = await firstRow.locator('td').nth(7); // 8ª coluna (index 7)
        
        const fcpText = await fcpCell.textContent();
        expect(fcpText).toContain('%');
    });

    test('Função formatarBeneficios deve renderizar corretamente', async ({ page }) => {
        // Fazer upload e navegar até cálculo
        const fileInput = await page.locator('#file-input');
        await fileInput.setInputFiles(SPED_FILE_PATH);
        await page.waitForSelector('#proceed-calculation:not(.hidden)', { timeout: 10000 });
        await page.click('#proceed-calculation');
        
        // Clicar em Configurar e Calcular DIFAL
        await page.click('#calculate-difal');
        await page.waitForSelector('#config-modal:not(.hidden)', { timeout: 5000 });
        
        // Calcular sem configuração individual
        await page.click('button:has-text("Calcular Sem Configuração Individual")');
        
        // Aguardar resultados
        await page.waitForSelector('#calculation-results:not(.hidden)', { timeout: 10000 });
        
        // Verificar se a tabela de resultados foi renderizada
        const resultsTable = await page.locator('.data-table');
        expect(await resultsTable.isVisible()).toBeTruthy();
        
        // Verificar se não há erro de formatarBeneficios
        const errorMessage = await page.locator('text=this.formatarBeneficios is not a function');
        expect(await errorMessage.count()).toBe(0);
    });

    test('Campos de configuração devem estar alinhados corretamente', async ({ page }) => {
        // Setup
        const fileInput = await page.locator('#file-input');
        await fileInput.setInputFiles(SPED_FILE_PATH);
        await page.waitForSelector('#proceed-calculation:not(.hidden)', { timeout: 10000 });
        await page.click('#proceed-calculation');
        await page.click('#calculate-difal');
        await page.waitForSelector('#config-modal:not(.hidden)', { timeout: 5000 });
        await page.click('button:has-text("Configurar Itens Individualmente")');
        await page.waitForSelector('#item-config-modal:not(.hidden)', { timeout: 5000 });
        
        // Selecionar um benefício para testar campos dinâmicos
        const firstRow = await page.locator('#tabela-configuracao-itens tbody tr').first();
        const beneficioSelect = await firstRow.locator('select');
        await beneficioSelect.selectOption('reducao-base');
        
        // Verificar se o campo de configuração apareceu
        const configField = await firstRow.locator('input[placeholder*="Carga efetiva"]');
        expect(await configField.isVisible()).toBeTruthy();
        
        // Verificar se está na coluna correta (Configuração - 7ª coluna)
        const configCell = await firstRow.locator('td').nth(6);
        const configFieldInCell = await configCell.locator('input');
        expect(await configFieldInCell.count()).toBeGreaterThan(0);
    });

    test('Checkbox "Configurar benefícios por item" deve estar marcado por padrão', async ({ page }) => {
        // Setup
        const fileInput = await page.locator('#file-input');
        await fileInput.setInputFiles(SPED_FILE_PATH);
        await page.waitForSelector('#proceed-calculation:not(.hidden)', { timeout: 10000 });
        await page.click('#proceed-calculation');
        await page.click('#calculate-difal');
        await page.waitForSelector('#config-modal:not(.hidden)', { timeout: 5000 });
        
        // Verificar checkbox
        const checkbox = await page.locator('#configurar-beneficios');
        expect(await checkbox.isChecked()).toBeTruthy();
    });

    test('Memória de cálculo deve estar disponível após cálculo', async ({ page }) => {
        // Setup e cálculo
        const fileInput = await page.locator('#file-input');
        await fileInput.setInputFiles(SPED_FILE_PATH);
        await page.waitForSelector('#proceed-calculation:not(.hidden)', { timeout: 10000 });
        await page.click('#proceed-calculation');
        await page.click('#calculate-difal');
        await page.waitForSelector('#config-modal:not(.hidden)', { timeout: 5000 });
        await page.click('button:has-text("Calcular Sem Configuração Individual")');
        await page.waitForSelector('#calculation-results:not(.hidden)', { timeout: 10000 });
        
        // Verificar se botão de memória está presente
        const memoriaButton = await page.locator('button:has-text("📋 Memória")').first();
        expect(await memoriaButton.isVisible()).toBeTruthy();
        
        // Clicar no botão e verificar modal
        await memoriaButton.click();
        await page.waitForSelector('.modal:has-text("Memória de Cálculo")', { timeout: 5000 });
        
        // Verificar conteúdo da memória
        const memoriaContent = await page.locator('.memoria-calculo pre');
        const content = await memoriaContent.textContent();
        expect(content).toContain('MEMÓRIA DE CÁLCULO DIFAL');
        expect(content).toContain('BASE DE CÁLCULO');
    });
});

// Teste de responsividade
test.describe('Responsividade da tabela', () => {
    test('Tabela deve ser responsiva em diferentes tamanhos de tela', async ({ page }) => {
        // Testar em diferentes viewports
        const viewports = [
            { width: 1920, height: 1080, name: 'Desktop' },
            { width: 1366, height: 768, name: 'Laptop' },
            { width: 768, height: 1024, name: 'Tablet' },
        ];
        
        for (const viewport of viewports) {
            await page.setViewportSize(viewport);
            await page.goto(BASE_URL);
            
            // Verificar se elementos principais estão visíveis
            const container = await page.locator('.app-container');
            expect(await container.isVisible()).toBeTruthy();
            
            // Verificar se não há overflow horizontal
            const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
            const windowWidth = await page.evaluate(() => window.innerWidth);
            expect(bodyWidth).toBeLessThanOrEqual(windowWidth);
        }
    });
});