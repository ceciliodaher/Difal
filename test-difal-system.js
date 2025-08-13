/**
 * Teste Automatizado do Sistema DIFAL
 * Utiliza Playwright para testes de interface web
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class DifalSystemTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            totalTests: 0,
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    async init() {
        console.log('🚀 Iniciando testes do Sistema DIFAL...');
        
        this.browser = await chromium.launch({ 
            headless: false, // Mostrar navegador para debug
            slowMo: 1000 // Delay entre ações
        });
        
        this.page = await this.browser.newPage();
        
        // Configurar listeners para erros
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('❌ Console Error:', msg.text());
                this.results.errors.push(`Console: ${msg.text()}`);
            } else if (msg.type() === 'log' && msg.text().includes('✅')) {
                console.log('✅', msg.text());
            }
        });
        
        this.page.on('pageerror', error => {
            console.error('❌ Page Error:', error.message);
            this.results.errors.push(`Page: ${error.message}`);
        });
    }

    async runTest(testName, testFunction) {
        this.results.totalTests++;
        console.log(`\n🧪 Teste: ${testName}`);
        
        try {
            await testFunction();
            this.results.passed++;
            console.log(`✅ ${testName} - PASSOU`);
        } catch (error) {
            this.results.failed++;
            console.error(`❌ ${testName} - FALHOU:`, error.message);
            this.results.errors.push(`${testName}: ${error.message}`);
        }
    }

    async loadSystemPage() {
        const htmlPath = path.join(__dirname, 'difal-system', 'sistema.html');
        
        if (!fs.existsSync(htmlPath)) {
            throw new Error(`Arquivo sistema.html não encontrado: ${htmlPath}`);
        }
        
        await this.page.goto(`file://${htmlPath}`);
        await this.page.waitForLoadState('networkidle');
        
        // Aguardar inicialização dos módulos
        await this.page.waitForTimeout(2000);
    }

    async testModuleLoading() {
        // Verificar se os módulos foram carregados
        const modules = await this.page.evaluate(() => {
            return {
                StateManager: !!window.StateManager,
                EventBus: !!window.eventBus,
                UIManager: !!window.UIManager,
                SpedParser: !!window.SpedParser,
                DifalCalculator: !!window.DifalCalculator,
                ExportManager: !!window.ExportManager,
                FileUploadManager: !!window.FileUploadManager,
                ModalManager: !!window.ModalManager,
                ResultsRenderer: !!window.ResultsRenderer,
                NavigationManager: !!window.NavigationManager,
                ProgressManager: !!window.ProgressManager,
                Utils: !!window.Utils,
                EstadosUtil: !!window.EstadosUtil
            };
        });

        const missingModules = Object.entries(modules)
            .filter(([name, loaded]) => !loaded)
            .map(([name]) => name);

        if (missingModules.length > 0) {
            throw new Error(`Módulos não carregados: ${missingModules.join(', ')}`);
        }

        console.log('✅ Todos os módulos carregados com sucesso');
    }

    async testNavigation() {
        // Testar navegação entre seções
        const sections = ['upload-section', 'analysis-section', 'calculation-section'];
        
        for (const sectionId of sections) {
            await this.page.evaluate((id) => {
                if (window.showSection) {
                    window.showSection(id);
                } else {
                    throw new Error('Função showSection não disponível');
                }
            }, sectionId);
            
            await this.page.waitForTimeout(500);
            
            const isVisible = await this.page.isVisible(`#${sectionId}.active`);
            if (!isVisible) {
                throw new Error(`Seção ${sectionId} não foi ativada corretamente`);
            }
        }

        console.log('✅ Navegação entre seções funcionando');
    }

    async testFileUpload() {
        // Simular upload de arquivo SPED (se houver arquivo de teste)
        const testFilePath = path.join(__dirname, 'documentos', '13158698000110-106379704-20250401-20250430-1-03D99627A94945C9AF64C38A3A038FCC8EF950DF-SPED-EFD.txt');
        
        if (!fs.existsSync(testFilePath)) {
            console.log('⚠️ Arquivo de teste SPED não encontrado, pulando teste de upload');
            return;
        }

        // Navegar para seção de upload
        await this.page.evaluate(() => window.showSection('upload-section'));
        
        // Fazer upload do arquivo
        const fileInput = await this.page.locator('#file-input');
        await fileInput.setInputFiles(testFilePath);
        
        // Aguardar processamento
        await this.page.waitForTimeout(5000);
        
        // Verificar se dados SPED foram carregados
        const spedData = await this.page.evaluate(() => {
            return {
                hasSpedData: !!window.spedData,
                hasItems: !!(window.spedData?.itensDifal?.length > 0),
                itemCount: window.spedData?.itensDifal?.length || 0,
                hasCompanyInfo: !!(window.spedData?.headerInfo?.nomeEmpresa)
            };
        });

        if (!spedData.hasSpedData) {
            throw new Error('Dados SPED não foram carregados');
        }

        if (!spedData.hasItems) {
            throw new Error('Nenhum item DIFAL foi encontrado');
        }

        console.log(`✅ Upload processado: ${spedData.itemCount} itens DIFAL encontrados`);
    }

    async testModalFunctions() {
        // Testar abertura e fechamento de modal de configuração
        await this.page.evaluate(() => {
            if (window.openConfigModal) {
                window.openConfigModal();
            } else {
                throw new Error('Função openConfigModal não disponível');
            }
        });

        await this.page.waitForTimeout(1000);

        const modalVisible = await this.page.isVisible('#config-modal:not(.hidden)');
        if (!modalVisible) {
            throw new Error('Modal de configuração não foi aberto');
        }

        // Fechar modal
        await this.page.evaluate(() => {
            if (window.closeConfigModal) {
                window.closeConfigModal();
            }
        });

        await this.page.waitForTimeout(500);

        const modalHidden = await this.page.isVisible('#config-modal.hidden') || 
                           !await this.page.isVisible('#config-modal');
        
        if (!modalHidden) {
            throw new Error('Modal de configuração não foi fechado');
        }

        console.log('✅ Sistema de modais funcionando');
    }

    async testProgressAndNotifications() {
        // Testar sistema de progresso e notificações
        await this.page.evaluate(() => {
            if (window.showProgress) {
                window.showProgress('Teste de progresso...', 50);
            } else {
                throw new Error('Função showProgress não disponível');
            }
        });

        await this.page.waitForTimeout(1000);

        const progressVisible = await this.page.isVisible('#progress-section:not(.hidden)');
        if (!progressVisible) {
            throw new Error('Barra de progresso não foi exibida');
        }

        // Testar notificação de erro
        await this.page.evaluate(() => {
            if (window.showError) {
                window.showError('Teste de erro');
            }
        });

        await this.page.waitForTimeout(1000);

        console.log('✅ Sistema de progresso e notificações funcionando');
    }

    async testDifalCalculation() {
        // Verificar se é possível calcular DIFAL (se dados estão disponíveis)
        const canCalculate = await this.page.evaluate(() => {
            return !!(window.spedData?.itensDifal?.length > 0);
        });

        if (!canCalculate) {
            console.log('⚠️ Sem dados SPED para teste de cálculo');
            return;
        }

        // Simular cálculo DIFAL
        await this.page.evaluate(() => {
            if (window.uiManager && window.uiManager.calculateDifal) {
                return window.uiManager.calculateDifal({
                    metodologia: 'auto',
                    configurarBeneficios: false,
                    percentualDestinatario: 100
                });
            } else {
                throw new Error('Função de cálculo DIFAL não disponível');
            }
        });

        await this.page.waitForTimeout(3000);

        // Verificar se resultados foram gerados
        const hasResults = await this.page.evaluate(() => {
            return !!(window.difalResults?.resultados?.length > 0);
        });

        if (!hasResults) {
            throw new Error('Cálculo DIFAL não gerou resultados');
        }

        console.log('✅ Cálculo DIFAL funcionando');
    }

    async generateReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(__dirname, `teste-difal-${timestamp}.json`);
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.results.totalTests,
                passed: this.results.passed,
                failed: this.results.failed,
                successRate: `${((this.results.passed / this.results.totalTests) * 100).toFixed(1)}%`
            },
            errors: this.results.errors
        };

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log('\n📊 RELATÓRIO DE TESTES');
        console.log('========================');
        console.log(`Total de testes: ${report.summary.total}`);
        console.log(`✅ Passou: ${report.summary.passed}`);
        console.log(`❌ Falhou: ${report.summary.failed}`);
        console.log(`📈 Taxa de sucesso: ${report.summary.successRate}`);
        
        if (this.results.errors.length > 0) {
            console.log('\n❌ ERROS ENCONTRADOS:');
            this.results.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
            });
        }
        
        console.log(`\n📄 Relatório salvo em: ${reportPath}`);
    }

    async runAllTests() {
        try {
            await this.init();
            
            await this.runTest('Carregar página do sistema', () => this.loadSystemPage());
            await this.runTest('Carregar módulos', () => this.testModuleLoading());
            await this.runTest('Navegação entre seções', () => this.testNavigation());
            await this.runTest('Funções de modal', () => this.testModalFunctions());
            await this.runTest('Progresso e notificações', () => this.testProgressAndNotifications());
            await this.runTest('Upload de arquivo SPED', () => this.testFileUpload());
            await this.runTest('Cálculo DIFAL', () => this.testDifalCalculation());
            
            await this.generateReport();
            
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }
}

// Executar testes
const tester = new DifalSystemTester();
tester.runAllTests().then(() => {
    console.log('\n🏁 Testes finalizados!');
    process.exit(0);
}).catch(error => {
    console.error('💥 Erro fatal nos testes:', error);
    process.exit(1);
});