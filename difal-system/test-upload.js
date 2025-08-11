const { chromium } = require('playwright');

async function testFileUpload() {
    console.log('🧪 Testando upload de arquivo SPED real...');
    
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    // Interceptar console logs
    page.on('console', msg => {
        const text = msg.text();
        console.log(`🖥️ CONSOLE: ${text}`);
        
        // Verificar singleton
        if (text.includes('DifalAppModular: Instância singleton já existe')) {
            console.log('✅ Singleton funcionando corretamente!');
        }
        
        // Verificar erro de upload
        if (text.includes('Upload já em andamento')) {
            console.log('❌ Erro de upload ainda presente!');
        }
    });
    
    // Navegar para o sistema
    console.log('📂 Abrindo sistema.html...');
    await page.goto('file://' + process.cwd() + '/sistema.html');
    
    // Aguardar carregamento
    await page.waitForTimeout(3000);
    
    // Verificar se há apenas uma inicialização
    const logs = await page.evaluate(() => {
        return window.console._logs || [];
    });
    
    // Fazer upload do arquivo SPED
    const fileInput = page.locator('input[type="file"]');
    const filePath = '/Users/ceciliodaher/Documents/git/difal/documentos/13158698000110-106379704-20250401-20250430-1-03D99627A94945C9AF64C38A3A038FCC8EF950DF-SPED-EFD.txt';
    
    console.log('📤 Fazendo upload do arquivo SPED...');
    await fileInput.setInputFiles(filePath);
    
    // Aguardar processamento
    await page.waitForTimeout(5000);
    
    // Verificar se upload foi bem sucedido
    const uploadSuccess = await page.evaluate(() => {
        return window.spedData && window.spedData.itensDifal && window.spedData.itensDifal.length > 0;
    });
    
    if (uploadSuccess) {
        console.log('✅ Upload realizado com sucesso!');
        
        // Verificar quantos itens foram processados
        const itemCount = await page.evaluate(() => window.spedData.itensDifal.length);
        console.log(`📊 Itens DIFAL processados: ${itemCount}`);
        
    } else {
        console.log('❌ Falha no upload!');
    }
    
    // Manter browser aberto por 10 segundos para observar
    console.log('⏰ Aguardando 10 segundos para observar o sistema...');
    await page.waitForTimeout(10000);
    
    await browser.close();
    console.log('🏁 Teste concluído!');
}

testFileUpload().catch(console.error);