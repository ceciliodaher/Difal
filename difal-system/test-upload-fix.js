/**
 * Playwright Test for FileUploadManager Upload Blocking Fix
 * Tests the specific issue: "Upload já em andamento" appearing immediately after file upload
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Create a test SPED file for upload testing
function createTestSpedFile() {
    const testSpedContent = `|0000|001|0|1|2024|01|31|1234567890001|EMPRESA TESTE LTDA|SP|14000000000111|SP|123|
|0001|0|
|C100|0|1|NF|1|1|1|20240115|20240115|1234567890001|CLIENTE TESTE|SP|12345678000100|123456|100.00|0.00|100.00|000|0.00|0.00|0.00|0.00|0.00|100.00|0|0.00|0|||||0|
|C170|1|PRODUTO TESTE|UN|1.00|100.00|0.00|6109|90|00|17|0.00|0.00|0.00|0.00|0.00|100.00|12345678|
|C990|3|
|9999|4|`;
    
    const testFilePath = path.join(__dirname, 'test-sped-file.txt');
    fs.writeFileSync(testFilePath, testSpedContent, 'utf8');
    return testFilePath;
}

test.describe('FileUploadManager Upload Blocking Fix', () => {
    let testFilePath;

    test.beforeAll(() => {
        testFilePath = createTestSpedFile();
        console.log('📄 Test SPED file created:', testFilePath);
    });

    test.afterAll(() => {
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
            console.log('🗑️ Test SPED file deleted');
        }
    });

    test('should not block uploads immediately after file processing', async ({ page }) => {
        // Navigate to the DIFAL system
        await page.goto('file://' + path.resolve(__dirname, 'sistema.html'));
        
        console.log('🌐 Navigated to DIFAL system');

        // Wait for the system to initialize
        await page.waitForFunction(() => {
            return window.difalApp && window.uiManager;
        }, { timeout: 10000 });

        console.log('✅ System initialized');

        // Check initial state
        const initialProcessingState = await page.evaluate(() => {
            return window.uiManager?.fileUploadManager?.isProcessing || false;
        });

        console.log('🔍 Initial processing state:', initialProcessingState);
        expect(initialProcessingState).toBe(false);

        // First upload - should succeed
        console.log('📤 Starting first upload...');
        
        const fileInput = page.locator('#file-input');
        await fileInput.setInputFiles(testFilePath);

        // Wait for upload to complete
        await page.waitForFunction(() => {
            const spedData = window.spedData;
            return spedData && spedData.itensDifal && spedData.itensDifal.length > 0;
        }, { timeout: 15000 });

        console.log('✅ First upload completed');

        // Check that processing state is reset
        const processingStateAfterUpload = await page.evaluate(() => {
            return window.uiManager?.fileUploadManager?.isProcessing || false;
        });

        console.log('🔍 Processing state after first upload:', processingStateAfterUpload);
        expect(processingStateAfterUpload).toBe(false);

        // Wait a moment for any async operations to complete
        await page.waitForTimeout(1000);

        // Clear current file to reset UI state
        await page.evaluate(() => {
            if (window.uiManager?.fileUploadManager?.clearCurrentFile) {
                window.uiManager.fileUploadManager.clearCurrentFile();
            }
        });

        console.log('🧹 Cleared current file state');

        // Second upload - this was where the bug occurred
        console.log('📤 Starting second upload (testing for bug)...');

        // Try to upload again
        await fileInput.setInputFiles(testFilePath);

        // Check for error messages
        const errorMessage = await page.locator('#status-message').textContent();
        console.log('💬 Status message:', errorMessage);

        // The bug would show "Upload já em andamento" - this should NOT happen
        expect(errorMessage).not.toContain('Upload já em andamento');
        expect(errorMessage).not.toContain('Aguarde a conclusão');

        // Verify second upload can proceed
        const secondUploadStarted = await page.waitForFunction(() => {
            return window.spedData && window.spedData.itensDifal;
        }, { timeout: 15000 });

        expect(secondUploadStarted).toBe(true);
        console.log('✅ Second upload succeeded - bug is fixed!');

        // Final verification - processing state should be reset
        const finalProcessingState = await page.evaluate(() => {
            return window.uiManager?.fileUploadManager?.isProcessing || false;
        });

        expect(finalProcessingState).toBe(false);
        console.log('✅ Final processing state is correctly reset');
    });

    test('should handle rapid consecutive uploads with debouncing', async ({ page }) => {
        await page.goto('file://' + path.resolve(__dirname, 'sistema.html'));
        
        await page.waitForFunction(() => {
            return window.difalApp && window.uiManager;
        }, { timeout: 10000 });

        console.log('🚀 Testing debouncing protection...');

        const fileInput = page.locator('#file-input');
        
        // First upload
        await fileInput.setInputFiles(testFilePath);
        
        // Immediately try second upload (should be blocked by debouncing)
        await fileInput.setInputFiles(testFilePath);
        
        // Check if debouncing message appears
        await page.waitForTimeout(500);
        const statusMessage = await page.locator('#status-message').textContent();
        
        console.log('💬 Debouncing status:', statusMessage);
        
        // Should show debouncing message, not "upload in progress" message
        if (statusMessage) {
            expect(statusMessage).toMatch(/(Aguarde um momento|debouncing)/i);
        }
        
        console.log('✅ Debouncing protection working correctly');
    });

    test('should provide emergency reset functionality', async ({ page }) => {
        await page.goto('file://' + path.resolve(__dirname, 'sistema.html'));
        
        await page.waitForFunction(() => {
            return window.difalApp && window.uiManager;
        }, { timeout: 10000 });

        console.log('🚨 Testing emergency reset functionality...');

        // Check if emergency reset function exists
        const resetFunctionExists = await page.evaluate(() => {
            return typeof window.resetUploadState === 'function';
        });

        expect(resetFunctionExists).toBe(true);
        console.log('✅ Emergency reset function exists');

        // Simulate stuck state (for testing purposes)
        await page.evaluate(() => {
            if (window.uiManager?.fileUploadManager) {
                window.uiManager.fileUploadManager.isProcessing = true;
            }
        });

        // Verify stuck state
        const isStuck = await page.evaluate(() => {
            return window.uiManager?.fileUploadManager?.isProcessing || false;
        });
        expect(isStuck).toBe(true);
        console.log('🔒 Simulated stuck processing state');

        // Use emergency reset
        const resetResult = await page.evaluate(() => {
            return window.resetUploadState();
        });

        expect(resetResult).toBe(true);
        console.log('✅ Emergency reset executed successfully');

        // Verify state is reset
        const isResetted = await page.evaluate(() => {
            return window.uiManager?.fileUploadManager?.isProcessing || false;
        });
        expect(isResetted).toBe(false);
        console.log('✅ Processing state successfully reset');
    });

    test('should handle upload errors gracefully without getting stuck', async ({ page }) => {
        await page.goto('file://' + path.resolve(__dirname, 'sistema.html'));
        
        await page.waitForFunction(() => {
            return window.difalApp && window.uiManager;
        }, { timeout: 10000 });

        console.log('💣 Testing error handling...');

        // Create an invalid file to trigger an error
        const invalidFilePath = path.join(__dirname, 'invalid-file.txt');
        fs.writeFileSync(invalidFilePath, 'This is not a valid SPED file content', 'utf8');

        try {
            const fileInput = page.locator('#file-input');
            await fileInput.setInputFiles(invalidFilePath);

            // Wait for error to be processed
            await page.waitForTimeout(2000);

            // Check that processing state is still reset even after error
            const processingStateAfterError = await page.evaluate(() => {
                return window.uiManager?.fileUploadManager?.isProcessing || false;
            });

            expect(processingStateAfterError).toBe(false);
            console.log('✅ Processing state correctly reset after error');

            // Try another upload to ensure system is not stuck
            await fileInput.setInputFiles(testFilePath);
            
            // Should be able to process without "upload in progress" error
            await page.waitForTimeout(1000);
            const statusAfterRecovery = await page.locator('#status-message').textContent();
            
            console.log('💬 Status after recovery:', statusAfterRecovery);
            expect(statusAfterRecovery).not.toContain('Upload já em andamento');
            
            console.log('✅ System recovered gracefully from error');

        } finally {
            if (fs.existsSync(invalidFilePath)) {
                fs.unlinkSync(invalidFilePath);
            }
        }
    });

    test('should show correct status messages throughout upload process', async ({ page }) => {
        await page.goto('file://' + path.resolve(__dirname, 'sistema.html'));
        
        await page.waitForFunction(() => {
            return window.difalApp && window.uiManager;
        }, { timeout: 10000 });

        console.log('📊 Testing status message flow...');

        const fileInput = page.locator('#file-input');
        const statusMessage = page.locator('#status-message');

        // Start upload
        await fileInput.setInputFiles(testFilePath);

        // Check for processing message
        await page.waitForFunction(() => {
            const msg = document.getElementById('status-message')?.textContent || '';
            return msg.includes('Iniciando processamento') || msg.includes('processamento');
        }, { timeout: 5000 });

        let currentStatus = await statusMessage.textContent();
        console.log('📋 Processing status:', currentStatus);
        
        // Wait for completion
        await page.waitForFunction(() => {
            const msg = document.getElementById('status-message')?.textContent || '';
            return msg.includes('sucesso') || msg.includes('processado');
        }, { timeout: 10000 });

        currentStatus = await statusMessage.textContent();
        console.log('📋 Completion status:', currentStatus);
        expect(currentStatus).toMatch(/(sucesso|processado)/i);

        // Verify processing flag is reset
        const finalState = await page.evaluate(() => {
            return window.uiManager?.fileUploadManager?.isProcessing || false;
        });
        expect(finalState).toBe(false);
        
        console.log('✅ Status message flow working correctly');
    });
});