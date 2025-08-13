const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Sistema DIFAL Multi-Período - Teste de Correção', () => {
    test('Verificar correção do erro processWithSpedParser', async ({ page }) => {
        // Capturar erros do console
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        // Navegar para o sistema
        const filePath = path.join(__dirname, '..', 'sistema.html');
        await page.goto(`file://${filePath}`);
        await page.waitForTimeout(2000);

        // Selecionar modo multi-período
        await page.click('#select-multi');
        await page.waitForTimeout(1000);

        // Verificar se estamos na seção de upload multi-período
        const uploadSection = await page.isVisible('#multi-upload-section');
        expect(uploadSection).toBeTruthy();

        // Preparar arquivos de teste
        const testFiles = [
            '../data/13158698000110-106379704-20240901-20240930-1-492D53B928CC7307791135D5EA5E3F09EF76768D-SPED-EFD.txt',
            '../data/13158698000110-107057404-20241001-20241031-1-2A29438C3DE0FE6E99B90468797A96FC87D2B8D6-SPED-EFD.txt'
        ];

        // Fazer upload dos arquivos
        const fileInput = await page.locator('#multi-period-file-input');
        const filePaths = testFiles.map(file => path.join(__dirname, file));
        
        // Verificar se os arquivos existem
        const fs = require('fs');
        for (const filePath of filePaths) {
            if (fs.existsSync(filePath)) {
                console.log(`✅ Arquivo encontrado: ${path.basename(filePath)}`);
            } else {
                console.log(`⚠️ Arquivo não encontrado: ${filePath}`);
                console.log('Continuando teste sem arquivos reais...');
                break;
            }
        }

        // Se os arquivos existirem, fazer upload
        if (filePaths.every(fp => fs.existsSync(fp))) {
            await fileInput.setInputFiles(filePaths);
            await page.waitForTimeout(3000);

            // Verificar se houve erro
            const hasProcessWithSpedParserError = errors.some(error => 
                error.includes('processWithSpedParser is not a function')
            );

            // Verificar resultados
            if (hasProcessWithSpedParserError) {
                console.log('❌ ERRO AINDA PRESENTE: processWithSpedParser is not a function');
                console.log('Erros capturados:', errors);
            } else {
                console.log('✅ CORREÇÃO FUNCIONOU: Nenhum erro de processWithSpedParser');
                
                // Verificar se os períodos foram carregados
                const periodsSection = await page.locator('#multi-periods-section');
                if (await periodsSection.isVisible()) {
                    console.log('✅ Seção de períodos visível');
                    
                    // Verificar se há períodos carregados
                    const periodCards = await page.locator('.period-card').count();
                    console.log(`📊 Períodos carregados: ${periodCards}`);
                }
            }

            // Asserção final
            expect(hasProcessWithSpedParserError).toBeFalsy();
        }

        // Listar todos os erros encontrados
        if (errors.length > 0) {
            console.log('\n📋 Todos os erros do console:');
            errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
            });
        } else {
            console.log('\n✅ Nenhum erro no console!');
        }
    });

    test('Testar modo single-period continua funcionando', async ({ page }) => {
        // Capturar erros do console
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        // Navegar para o sistema
        const filePath = path.join(__dirname, '..', 'sistema.html');
        await page.goto(`file://${filePath}`);
        await page.waitForTimeout(2000);

        // Selecionar modo single-período
        await page.click('#select-single');
        await page.waitForTimeout(1000);

        // Verificar se estamos na seção de upload single-período
        const uploadSection = await page.isVisible('#single-upload-section');
        expect(uploadSection).toBeTruthy();

        // Verificar arquivo de teste
        const testFile = '../data/13158698000110-106379704-20240901-20240930-1-492D53B928CC7307791135D5EA5E3F09EF76768D-SPED-EFD.txt';
        const fileFullPath = path.join(__dirname, testFile);
        
        const fs = require('fs');
        if (fs.existsSync(fileFullPath)) {
            // Fazer upload do arquivo
            const fileInput = await page.locator('#file-input');
            await fileInput.setInputFiles(fileFullPath);
            await page.waitForTimeout(3000);

            // Verificar se houve erro
            expect(errors.length).toBe(0);

            // Verificar se a análise foi carregada
            const analysisSection = await page.locator('#single-analysis-section');
            if (await analysisSection.isVisible()) {
                console.log('✅ Single-period funcionando corretamente');
            }
        } else {
            console.log('⚠️ Arquivo de teste não encontrado, pulando teste de upload');
        }

        // Verificar que não há erros
        if (errors.length > 0) {
            console.log('❌ Erros encontrados no single-period:', errors);
        } else {
            console.log('✅ Single-period sem erros');
        }
    });
});