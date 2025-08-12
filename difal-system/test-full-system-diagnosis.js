const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Arquivo SPED real para teste
const SPED_FILE_PATH = '/Users/ceciliodaher/Documents/git/difal/documentos/13158698000110-106379704-20250101-20250131-1-DED4E284399363BC7F1F48E5A39EE85261E47B67-SPED-EFD.txt';

// Diretório para screenshots e logs
const TEST_RESULTS_DIR = path.join(__dirname, 'test-results', `diagnosis-${Date.now()}`);

// Criar diretório de resultados
if (!fs.existsSync(TEST_RESULTS_DIR)) {
    fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

// Logger especializado para diagnóstico
class DiagnosticLogger {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            issues: [],
            successes: [],
            screenshots: [],
            consoleLogs: [],
            errors: [],
            summary: {
                totalIssues: 0,
                criticalIssues: 0,
                systemStatus: 'unknown'
            }
        };
        this.logFile = path.join(TEST_RESULTS_DIR, 'diagnostic-report.json');
    }

    logIssue(severity, component, issue, details = {}) {
        const entry = {
            severity, // 'critical', 'major', 'minor'
            component, // 'navigation', 'upload', 'processing', etc.
            issue,
            details,
            timestamp: new Date().toISOString()
        };
        
        this.results.issues.push(entry);
        if (severity === 'critical') this.results.summary.criticalIssues++;
        this.results.summary.totalIssues++;
        
        console.log(`❌ [${severity.toUpperCase()}] ${component}: ${issue}`);
    }

    logSuccess(component, test, details = {}) {
        const entry = {
            component,
            test,
            details,
            timestamp: new Date().toISOString()
        };
        
        this.results.successes.push(entry);
        console.log(`✅ ${component}: ${test}`);
    }

    logScreenshot(name, description) {
        this.results.screenshots.push({ name, description });
    }

    logConsole(type, message) {
        this.results.consoleLogs.push({
            type,
            message,
            timestamp: new Date().toISOString()
        });
    }

    logError(error, context) {
        this.results.errors.push({
            error: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        });
    }

    generateSummary() {
        const totalTests = this.results.issues.length + this.results.successes.length;
        const successRate = totalTests > 0 ? (this.results.successes.length / totalTests) * 100 : 0;
        
        this.results.summary.systemStatus = 
            this.results.summary.criticalIssues === 0 && successRate > 80 ? 'functional' :
            this.results.summary.criticalIssues > 0 ? 'broken' :
            'partially-functional';
        
        this.results.summary.successRate = successRate;
        this.results.summary.totalTests = totalTests;
    }

    save() {
        this.generateSummary();
        fs.writeFileSync(this.logFile, JSON.stringify(this.results, null, 2));
        console.log(`\n📊 Relatório de diagnóstico salvo em: ${this.logFile}`);
        
        // Sumário no console
        console.log('\n=== SUMÁRIO DO DIAGNÓSTICO ===');
        console.log(`Status do Sistema: ${this.results.summary.systemStatus}`);
        console.log(`Taxa de Sucesso: ${this.results.summary.successRate.toFixed(1)}%`);
        console.log(`Problemas Críticos: ${this.results.summary.criticalIssues}`);
        console.log(`Total de Problemas: ${this.results.summary.totalIssues}`);
    }
}

async function runFullSystemDiagnosis() {
    const logger = new DiagnosticLogger();
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1000 // Mais lento para observar comportamento
    });
    
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Limpar localStorage para teste limpo
    await page.addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
    
    // Capturar logs do console
    page.on('console', msg => {
        logger.logConsole(msg.type(), msg.text());
    });
    
    // Capturar erros da página
    page.on('pageerror', error => {
        logger.logError(error, 'page-error');
    });

    try {
        // ========== TESTE 1: CARREGAMENTO INICIAL ==========
        console.log('\n🔍 TESTE 1: Carregamento inicial da aplicação');
        
        await page.goto('file://' + path.resolve(__dirname, 'sistema.html'));
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        const screenshotPath = path.join(TEST_RESULTS_DIR, '01-initial-load.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        logger.logScreenshot('01-initial-load.png', 'Estado inicial da aplicação');

        // ========== TESTE 2: TELA DE SELEÇÃO DE MODO ==========
        console.log('\n🔍 TESTE 2: Verificação da tela de seleção de modo');
        
        const modeSelectionVisible = await page.locator('#mode-selection-section').isVisible();
        if (modeSelectionVisible) {
            logger.logSuccess('mode-selection', 'Tela de seleção visível na inicialização');
        } else {
            logger.logIssue('critical', 'mode-selection', 'Tela de seleção não aparece na inicialização');
            
            // Verificar qual seção está ativa
            const activeSections = await page.locator('.section.active, .section[style*="block"]').all();
            const activeSectionIds = [];
            for (const section of activeSections) {
                const id = await section.getAttribute('id');
                if (id) activeSectionIds.push(id);
            }
            logger.logIssue('major', 'mode-selection', 'Seções ativas encontradas', { activeSections: activeSectionIds });
        }

        // ========== TESTE 3: NAVEGAÇÃO INICIAL ==========
        console.log('\n🔍 TESTE 3: Verificação da navegação');
        
        const navigationVisible = await page.locator('#main-navigation').isVisible();
        if (navigationVisible) {
            logger.logSuccess('navigation', 'Navegação visível');
        } else {
            logger.logIssue('critical', 'navigation', 'Navegação não está visível');
        }
        
        const navButtons = await page.locator('.nav-btn').count();
        if (navButtons > 0) {
            logger.logSuccess('navigation', `${navButtons} botões de navegação encontrados`);
        } else {
            logger.logIssue('critical', 'navigation', 'Nenhum botão de navegação encontrado');
        }

        // ========== TESTE 4: SELEÇÃO DE MODO (se disponível) ==========
        console.log('\n🔍 TESTE 4: Teste de seleção de modo');
        
        if (modeSelectionVisible) {
            const singleModeCard = page.locator('#single-mode-card');
            const cardVisible = await singleModeCard.isVisible();
            
            if (cardVisible) {
                logger.logSuccess('mode-selection', 'Card single-period visível');
                await singleModeCard.click();
                await page.waitForTimeout(1000);
                
                const screenshotPath2 = path.join(TEST_RESULTS_DIR, '02-mode-selected.png');
                await page.screenshot({ path: screenshotPath2, fullPage: true });
                logger.logScreenshot('02-mode-selected.png', 'Após seleção do modo single-period');
                
                // Verificar se navegação apareceu
                const navVisibleAfterMode = await page.locator('#main-navigation').isVisible();
                if (navVisibleAfterMode) {
                    logger.logSuccess('navigation', 'Navegação aparece após seleção de modo');
                } else {
                    logger.logIssue('critical', 'navigation', 'Navegação não aparece após seleção de modo');
                }
            } else {
                logger.logIssue('major', 'mode-selection', 'Card single-period não está visível');
            }
        }

        // ========== TESTE 5: SEÇÃO DE UPLOAD ==========
        console.log('\n🔍 TESTE 5: Verificação da seção de upload');
        
        const uploadSectionVisible = await page.locator('#single-upload-section').isVisible();
        if (uploadSectionVisible) {
            logger.logSuccess('upload', 'Seção de upload single-period visível');
        } else {
            logger.logIssue('critical', 'upload', 'Seção de upload não está visível');
        }
        
        const fileInput = page.locator('#file-input');
        const fileInputExists = await fileInput.count() > 0;
        if (fileInputExists) {
            logger.logSuccess('upload', 'Input de arquivo existe');
        } else {
            logger.logIssue('critical', 'upload', 'Input de arquivo não encontrado');
        }
        
        const dropZone = page.locator('#drop-zone');
        const dropZoneVisible = await dropZone.isVisible();
        if (dropZoneVisible) {
            logger.logSuccess('upload', 'Zona de drop visível');
        } else {
            logger.logIssue('major', 'upload', 'Zona de drop não está visível');
        }

        // ========== TESTE 6: UPLOAD DE ARQUIVO ==========
        console.log('\n🔍 TESTE 6: Teste de upload de arquivo');
        
        if (fileInputExists) {
            try {
                await fileInput.setInputFiles(SPED_FILE_PATH);
                await page.waitForTimeout(3000); // Aguardar processamento
                
                const screenshotPath3 = path.join(TEST_RESULTS_DIR, '03-file-uploaded.png');
                await page.screenshot({ path: screenshotPath3, fullPage: true });
                logger.logScreenshot('03-file-uploaded.png', 'Após upload do arquivo SPED');
                
                logger.logSuccess('upload', 'Arquivo SPED enviado com sucesso');
            } catch (error) {
                logger.logIssue('critical', 'upload', 'Falha no upload do arquivo', { error: error.message });
            }
        }

        // ========== TESTE 7: DADOS EXTRAÍDOS ==========
        console.log('\n🔍 TESTE 7: Verificação dos dados extraídos');
        
        const summarySection = page.locator('#sped-summary');
        const summaryVisible = await summarySection.isVisible();
        if (summaryVisible) {
            logger.logSuccess('processing', 'Seção de resumo SPED visível');
        } else {
            logger.logIssue('critical', 'processing', 'Seção de resumo SPED não aparece');
        }
        
        const companyInfo = page.locator('.summary-item').filter({ hasText: 'Empresa' });
        const companyInfoVisible = await companyInfo.count() > 0;
        if (companyInfoVisible) {
            const companyText = await companyInfo.first().textContent();
            logger.logSuccess('processing', 'Informações da empresa extraídas', { text: companyText });
        } else {
            logger.logIssue('critical', 'processing', 'Informações da empresa não foram extraídas');
        }

        // ========== TESTE 8: NAVEGAÇÃO ENTRE SEÇÕES ==========
        console.log('\n🔍 TESTE 8: Teste de navegação entre seções');
        
        const analysisButton = page.locator('[data-section="single-analysis-section"]');
        const analysisButtonVisible = await analysisButton.isVisible();
        if (analysisButtonVisible) {
            logger.logSuccess('navigation', 'Botão de análise visível');
            
            try {
                await analysisButton.click();
                await page.waitForTimeout(1000);
                
                const analysisSectionVisible = await page.locator('#single-analysis-section').isVisible();
                if (analysisSectionVisible) {
                    logger.logSuccess('navigation', 'Navegação para seção de análise funciona');
                } else {
                    logger.logIssue('major', 'navigation', 'Navegação para análise não funciona');
                }
                
                const screenshotPath4 = path.join(TEST_RESULTS_DIR, '04-analysis-section.png');
                await page.screenshot({ path: screenshotPath4, fullPage: true });
                logger.logScreenshot('04-analysis-section.png', 'Seção de análise');
                
            } catch (error) {
                logger.logIssue('major', 'navigation', 'Erro ao clicar no botão de análise', { error: error.message });
            }
        } else {
            logger.logIssue('critical', 'navigation', 'Botão de análise não está visível');
        }

        // ========== TESTE 9: SEÇÃO DE CÁLCULO ==========
        console.log('\n🔍 TESTE 9: Teste da seção de cálculo');
        
        const calculationButton = page.locator('[data-section="single-calculation-section"]');
        const calculationButtonVisible = await calculationButton.isVisible();
        if (calculationButtonVisible) {
            logger.logSuccess('navigation', 'Botão de cálculo visível');
            
            try {
                await calculationButton.click();
                await page.waitForTimeout(1000);
                
                const calculationSectionVisible = await page.locator('#single-calculation-section').isVisible();
                if (calculationSectionVisible) {
                    logger.logSuccess('navigation', 'Navegação para seção de cálculo funciona');
                    
                    const calculateButton = page.locator('#calculate-difal');
                    const calculateButtonVisible = await calculateButton.isVisible();
                    if (calculateButtonVisible) {
                        logger.logSuccess('calculation', 'Botão calcular DIFAL visível');
                    } else {
                        logger.logIssue('major', 'calculation', 'Botão calcular DIFAL não está visível');
                    }
                } else {
                    logger.logIssue('major', 'navigation', 'Navegação para cálculo não funciona');
                }
                
                const screenshotPath5 = path.join(TEST_RESULTS_DIR, '05-calculation-section.png');
                await page.screenshot({ path: screenshotPath5, fullPage: true });
                logger.logScreenshot('05-calculation-section.png', 'Seção de cálculo');
                
            } catch (error) {
                logger.logIssue('major', 'navigation', 'Erro ao navegar para cálculo', { error: error.message });
            }
        } else {
            logger.logIssue('critical', 'navigation', 'Botão de cálculo não está visível');
        }

        // ========== TESTE 10: SCREENSHOT FINAL ==========
        const finalScreenshot = path.join(TEST_RESULTS_DIR, '06-final-state.png');
        await page.screenshot({ path: finalScreenshot, fullPage: true });
        logger.logScreenshot('06-final-state.png', 'Estado final do sistema');

        console.log('\n✅ Diagnóstico completo finalizado!');
        
    } catch (error) {
        logger.logError(error, 'system-diagnosis');
        console.error('❌ Erro durante diagnóstico:', error);
        
        const errorScreenshot = path.join(TEST_RESULTS_DIR, 'error-state.png');
        await page.screenshot({ path: errorScreenshot, fullPage: true });
        logger.logScreenshot('error-state.png', 'Estado de erro');
    } finally {
        logger.save();
        await browser.close();
        
        console.log(`\n📁 Resultados completos em: ${TEST_RESULTS_DIR}`);
        
        // Determinar próximos passos baseado nos resultados
        if (logger.results.summary.criticalIssues > 0) {
            console.log('\n🚨 PROBLEMAS CRÍTICOS ENCONTRADOS - Sistema precisa de correções urgentes');
            console.log('Próximos passos sugeridos:');
            logger.results.issues
                .filter(i => i.severity === 'critical')
                .forEach(issue => {
                    console.log(`  - ${issue.component}: ${issue.issue}`);
                });
        } else if (logger.results.summary.successRate < 80) {
            console.log('\n⚠️ Sistema parcialmente funcional - Algumas correções necessárias');
        } else {
            console.log('\n✅ Sistema funcionando adequadamente!');
        }
    }
}

// Executar diagnóstico
runFullSystemDiagnosis()
    .then(() => {
        console.log('\n🔍 DIAGNÓSTICO COMPLETO FINALIZADO!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 FALHA NO DIAGNÓSTICO:', error.message);
        console.log('Verifique os logs para mais detalhes.');
        process.exit(1);
    });