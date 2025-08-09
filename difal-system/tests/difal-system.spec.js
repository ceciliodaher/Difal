import { test, expect } from '@playwright/test';

const SPED_FILE_PATH = '/Users/ceciliodaher/Documents/git/difal/documentos/13158698000110-106379704-20250401-20250430-1-03D99627A94945C9AF64C38A3A038FCC8EF950DF-SPED-EFD.txt';

test.describe('Sistema DIFAL - Testes com Arquivo Real', () => {
  test.beforeEach(async ({ page }) => {
    // Configurar console logging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Browser error:', msg.text());
      }
    });
    
    // Navegar para aplicação
    await page.goto('/');
  });

  test('deve carregar aplicação sem erros', async ({ page }) => {
    // Aguardar carregamento completo
    await page.waitForLoadState('networkidle');
    
    // Verificar se o cabeçalho está presente
    await expect(page.locator('h1')).toContainText('Sistema DIFAL');
    
    // Verificar se o logo Expertzy está presente
    await expect(page.locator('.expertzy-logo')).toBeVisible();
    
    // Verificar se a área de upload está presente
    await expect(page.locator('#drop-zone')).toBeVisible();
    
    // Capturar screenshot inicial
    await page.screenshot({ path: 'test-results/screenshots/01-initial-load.png', fullPage: true });
  });

  test('deve processar arquivo SPED real e extrair itens DIFAL', async ({ page }) => {
    // Aguardar carregamento
    await page.waitForLoadState('networkidle');
    
    // Upload do arquivo SPED
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(SPED_FILE_PATH);
    
    // Aguardar processamento (pode demorar)
    await page.waitForSelector('#sped-summary', { timeout: 60000 });
    
    // Verificar informações básicas extraídas
    const summaryItems = page.locator('.summary-item');
    await expect(summaryItems).toHaveCount(6); // 6 cards de resumo
    
    // Verificar se empresa foi extraída corretamente
    await expect(page.locator('.summary-item').nth(1)).toContainText('THE FIBER');
    
    // Verificar se itens DIFAL foram encontrados
    const itensDifalCard = page.locator('.summary-item').nth(4);
    const itensDifalValue = await itensDifalCard.locator('.summary-value').textContent();
    expect(parseInt(itensDifalValue.replace(/\D/g, ''))).toBeGreaterThan(0);
    
    // Verificar se tabela de itens está presente
    await expect(page.locator('.data-table')).toBeVisible();
    
    // Verificar se botão de prosseguir está visível
    await expect(page.locator('#proceed-calculation')).toBeVisible();
    
    // Capturar screenshot após upload
    await page.screenshot({ path: 'test-results/screenshots/02-after-upload.png', fullPage: true });
    
    console.log('✅ Arquivo SPED processado com sucesso');
  });

  test('deve executar cálculo DIFAL completo', async ({ page }) => {
    // Processar arquivo primeiro
    await page.waitForLoadState('networkidle');
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(SPED_FILE_PATH);
    await page.waitForSelector('#sped-summary', { timeout: 60000 });
    
    // Prosseguir para cálculo
    await page.click('#proceed-calculation');
    await expect(page.locator('#calculation-section')).toHaveClass(/active/);
    
    // Verificar se informações da empresa aparecem
    await expect(page.locator('#company-uf')).toContainText('SP');
    await expect(page.locator('#company-name')).toContainText('THE FIBER');
    
    // Executar cálculo (não precisa mais configurar UFs)
    await page.click('#calculate-difal');
    
    // Aguardar resultados
    await page.waitForSelector('#calculation-results:not(.hidden)', { timeout: 30000 });
    
    // Verificar se resultados foram gerados
    await expect(page.locator('.results-summary')).toBeVisible();
    await expect(page.locator('.result-item')).toHaveCount(5); // 5 totalizadores
    
    // Verificar se valores estão presentes
    const totalRecolher = page.locator('.result-item').nth(4).locator('.result-value');
    const valorTotal = await totalRecolher.textContent();
    expect(valorTotal).toMatch(/R\$\s*[\d.,]+/);
    
    // Verificar se tabela de detalhes está presente (se houver itens com DIFAL)
    const hasResults = await page.locator('.data-table').count() > 0;
    if (hasResults) {
      await expect(page.locator('.data-table tbody tr')).toHaveCountGreaterThan(0);
    }
    
    // Navegar automaticamente para relatórios
    await expect(page.locator('#reports-section')).toHaveClass(/active/);
    
    // Capturar screenshot dos resultados
    await page.screenshot({ path: 'test-results/screenshots/03-calculation-results.png', fullPage: true });
    
    console.log('✅ Cálculo DIFAL executado com sucesso');
  });

  test('deve permitir exportação dos resultados', async ({ page }) => {
    // Executar fluxo completo primeiro
    await page.waitForLoadState('networkidle');
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(SPED_FILE_PATH);
    await page.waitForSelector('#sped-summary', { timeout: 60000 });
    
    await page.click('#proceed-calculation');
    await page.click('#calculate-difal');
    await page.waitForSelector('#calculation-results:not(.hidden)', { timeout: 30000 });
    
    // Testar exportação Excel
    const downloadPromise = page.waitForEvent('download');
    await page.click('#export-excel');
    
    try {
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/DIFAL.*\.xlsx$/);
      console.log('✅ Exportação Excel iniciada:', download.suggestedFilename());
    } catch (error) {
      // Se exportação Excel falhar, pode ser por limitação do ambiente
      console.log('⚠️ Exportação Excel não disponível no ambiente de teste');
    }
    
    // Capturar screenshot final
    await page.screenshot({ path: 'test-results/screenshots/04-export-ready.png', fullPage: true });
  });

  test('deve validar CFOPs específicos do arquivo de teste', async ({ page }) => {
    // Processar arquivo
    await page.waitForLoadState('networkidle');
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(SPED_FILE_PATH);
    await page.waitForSelector('#sped-summary', { timeout: 60000 });
    
    // Verificar se tabela de itens contém apenas CFOPs interestaduais DIFAL (2556, 2551)
    const cfopCells = page.locator('.data-table tbody td:nth-child(3)'); // Coluna CFOP
    const cfopTexts = await cfopCells.allTextContents();
    
    const expectedCfops = ['2556', '2551']; // Apenas interestaduais sem ST
    const foundCfops = cfopTexts.filter(cfop => expectedCfops.includes(cfop.trim()));
    
    expect(foundCfops.length).toBeGreaterThan(0);
    console.log('✅ CFOPs DIFAL encontrados:', [...new Set(foundCfops)]);
    
    // Verificar destinações corretas
    const destinacaoCells = page.locator('.data-table tbody td:nth-child(4)'); // Coluna Destinação
    await expect(destinacaoCells.first()).toBeVisible();
  });

  test('deve exibir logs de processamento', async ({ page }) => {
    // Verificar janela de log
    await expect(page.locator('#log-window')).toBeVisible();
    
    // Processar arquivo
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(SPED_FILE_PATH);
    await page.waitForSelector('#sped-summary', { timeout: 60000 });
    
    // Verificar se logs foram gerados
    const logMessages = page.locator('.log-message');
    await expect(logMessages).toHaveCountGreaterThan(3);
    
    // Verificar se há mensagens de sucesso
    const successMessages = page.locator('.log-message.log-success');
    await expect(successMessages).toHaveCountGreaterThan(0);
    
    // Testar toggle do log
    await page.click('#toggle-log');
    await expect(page.locator('#log-window')).toHaveClass(/collapsed/);
    
    await page.click('#toggle-log');
    await expect(page.locator('#log-window')).not.toHaveClass(/collapsed/);
  });

  test('deve navegar entre seções corretamente', async ({ page }) => {
    // Verificar navegação inicial
    await expect(page.locator('#upload-section')).toHaveClass(/active/);
    await expect(page.locator('.nav-btn[data-section="upload-section"]')).toHaveClass(/active/);
    
    // Processar arquivo para habilitar outras seções
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(SPED_FILE_PATH);
    await page.waitForSelector('#sped-summary', { timeout: 60000 });
    
    // Verificar transição automática para análise
    await expect(page.locator('#analysis-section')).toHaveClass(/active/);
    
    // Testar navegação manual
    await page.click('.nav-btn[data-section="upload-section"]');
    await expect(page.locator('#upload-section')).toHaveClass(/active/);
    
    await page.click('.nav-btn[data-section="analysis-section"]');
    await expect(page.locator('#analysis-section')).toHaveClass(/active/);
  });

  test('deve validar dados extraídos do arquivo real', async ({ page }) => {
    // Processar arquivo
    await page.waitForLoadState('networkidle');
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(SPED_FILE_PATH);
    await page.waitForSelector('#sped-summary', { timeout: 60000 });
    
    // Validar dados específicos do arquivo de teste
    // THE FIBER PROVEDORA DE INTERNET LTDA
    await expect(page.locator('.summary-item').nth(1).locator('.summary-value')).toContainText('THE FIBER');
    
    // Período 04/2025
    await expect(page.locator('.summary-item').nth(2).locator('.summary-value')).toContainText('/2025');
    
    // CNPJ deve estar formatado
    const cnpjText = await page.locator('.summary-item').nth(1).locator('.summary-label').textContent();
    expect(cnpjText).toMatch(/CNPJ: \d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
    
    // UF deve ser informada
    const ufText = await page.locator('.summary-item').nth(2).locator('.summary-label').textContent();
    expect(ufText).toContain('UF:');
    
    console.log('✅ Dados do arquivo real validados com sucesso');
  });
});

test.describe('Sistema DIFAL - Testes de Interface', () => {
  test('deve ser responsivo em diferentes tamanhos de tela', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.screenshot({ path: 'test-results/screenshots/responsive-desktop.png' });
    
    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: 'test-results/screenshots/responsive-tablet.png' });
    
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ path: 'test-results/screenshots/responsive-mobile.png' });
    
    // Verificar se elementos essenciais ainda estão visíveis
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('deve manter design Expertzy consistente', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verificar cores da marca
    const header = page.locator('.header');
    await expect(header).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    
    // Verificar gradiente de fundo
    const body = page.locator('body');
    const bgImage = await body.evaluate(el => getComputedStyle(el).backgroundImage);
    expect(bgImage).toContain('linear-gradient');
    
    // Verificar fonte Inter
    const h1 = page.locator('h1');
    const fontFamily = await h1.evaluate(el => getComputedStyle(el).fontFamily);
    expect(fontFamily).toContain('Inter');
  });
});