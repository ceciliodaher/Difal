/**
 * Configuração do Playwright para testes do Sistema DIFAL
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir: '.',
    testMatch: ['test-final-functionality.js', 'test-mode-selection.js', 'test-freeze-diagnostic.js', 'test-initialization-errors.js', 'test-complete-system.js', 'test-upload-fix.js', 'test-quick-diagnostic.js', 'test-singleton-initialization.js', 'test-complete-single-workflow.js', 'multi-period-analysis.spec.js', 'test-multi-period-workflows.spec.js', 'multi-period-comprehensive.spec.js'],
    
    // Tempo máximo para cada teste (aumentado para testes completos)
    timeout: 60 * 1000,
    
    // Configuração de expectativas
    expect: {
        timeout: 5000
    },
    
    // Falhar o build se deixar test.only no código
    forbidOnly: !!process.env.CI,
    
    // Retry em caso de falha
    retries: process.env.CI ? 2 : 0,
    
    // Número de workers paralelos
    workers: process.env.CI ? 1 : undefined,
    
    // Reporter
    reporter: 'html',
    
    // Configurações compartilhadas
    use: {
        // Capturar screenshot em caso de falha
        screenshot: 'only-on-failure',
        
        // Gravar vídeo em caso de falha
        video: 'retain-on-failure',
        
        // Trace para debug
        trace: 'on-first-retry',
        
        // Base URL para os testes
        baseURL: 'file://' + __dirname,
        
        // Timeout para ações
        actionTimeout: 10000,
    },
    
    // Configurar projetos para diferentes navegadores
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },
        
        // Testes mobile
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
        },
        
        {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 12'] },
        },
    ],
    
    // Servidor web local (não necessário para file://)
    webServer: null,
});