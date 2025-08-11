/**
 * @fileoverview Export Manager - Módulo de gerenciamento de exportações
 * @module ExportManager
 * @description Responsável por exportar resultados do cálculo DIFAL para diversos formatos
 * incluindo Excel (XLSX), PDF e CSV, com formatação profissional e tratamento de erros robusto.
 * 
 * @author Sistema DIFAL
 * @version 1.0.0
 * @since 2025-01-10
 */

/**
 * @class ExportManager
 * @classdesc Gerencia todas as operações de exportação de dados do sistema DIFAL
 */
class ExportManager {
    /**
     * @constructor
     * @param {StateManager} stateManager - Instância do gerenciador de estado
     * @param {EventBus} eventBus - Instância do barramento de eventos
     */
    constructor(stateManager, eventBus) {
        if (!stateManager) {
            throw new Error('ExportManager requer uma instância de StateManager');
        }
        
        this.stateManager = stateManager;
        this.eventBus = eventBus;
        
        // Configurações de exportação
        this.config = {
            excel: {
                maxRows: 1048576, // Limite do Excel
                maxCols: 16384,
                defaultSheetName: 'Resultados DIFAL',
                headerStyle: {
                    bold: true,
                    fill: 'E0E0E0',
                    border: true,
                    fontSize: 12
                }
            },
            pdf: {
                maxItemsPerPage: 30,
                pageOrientation: 'landscape',
                margins: { top: 20, right: 15, bottom: 20, left: 15 }
            },
            csv: {
                delimiter: ';',
                encoding: 'UTF-8',
                includeBOM: true // Para Excel reconhecer UTF-8
            }
        };
        
        this.init();
    }

    /**
     * Inicializa o Export Manager
     * @private
     */
    init() {
        this.setupEventListeners();
        this.checkDependencies();
        console.log('📤 ExportManager inicializado com sucesso');
    }

    /**
     * Configura listeners de eventos
     * @private
     */
    setupEventListeners() {
        // Listener para botões de exportação
        const exportExcelBtn = document.getElementById('export-excel');
        const exportPdfBtn = document.getElementById('export-pdf');
        
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', () => this.exportToExcel());
        }
        
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => this.exportToPdf());
        }
        
        // Listener para eventos do EventBus
        if (this.eventBus) {
            this.eventBus.on('EXPORT_REQUESTED', (data) => {
                this.handleExportRequest(data);
            });
        }
    }

    /**
     * Verifica dependências necessárias
     * @private
     * @returns {Object} Status das dependências
     */
    checkDependencies() {
        const dependencies = {
            xlsxPopulate: !!window.XlsxPopulate,
            jsPDF: !!(window.jspdf && window.jspdf.jsPDF),
            jsPDFAutoTable: !!(window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.prototype.autoTable),
            utils: !!window.Utils
        };
        
        console.log('📊 Dependências de exportação:', dependencies);
        return dependencies;
    }

    // ========== EXPORTAÇÃO PARA EXCEL ==========

    /**
     * Exporta resultados para Excel (XLSX)
     * @async
     * @public
     * @returns {Promise<void>}
     * @throws {Error} Se não houver dados para exportar
     */
    async exportToExcel() {
        try {
            console.log('📊 Iniciando exportação para Excel...');
            
            // Validar dados
            const results = this.getCalculationResults();
            if (!results || !results.resultados) {
                throw new Error('Nenhum resultado de cálculo disponível para exportar');
            }
            
            // Preparar dados
            const exportData = this.prepareExcelData(results);
            
            // Verificar dependências e escolher método
            console.log('📊 Verificando biblioteca XlsxPopulate...', !!window.XlsxPopulate);
            
            if (window.XlsxPopulate && typeof window.XlsxPopulate.fromBlankAsync === 'function') {
                console.log('✅ XlsxPopulate disponível, usando biblioteca principal');
                await this.exportWithXlsxPopulate(exportData);
            } else {
                console.warn('⚠️ XlsxPopulate indisponível ou incompatível, usando fallback CSV');
                console.log('🔍 Debug XlsxPopulate:', {
                    exists: !!window.XlsxPopulate,
                    hasFromBlank: !!(window.XlsxPopulate?.fromBlankAsync),
                    type: typeof window.XlsxPopulate
                });
                this.exportAsCSV(exportData);
            }
            
            // Notificar sucesso
            this.notifyExportSuccess('Excel', exportData.totalRows);
            
        } catch (error) {
            this.handleExportError('Excel', error);
        }
    }

    /**
     * Prepara dados para exportação Excel
     * @private
     * @param {Object} results - Resultados do cálculo
     * @returns {Object} Dados formatados para Excel
     */
    prepareExcelData(results) {
        const { resultados, totalizadores } = results;
        const spedData = this.stateManager.getSpedData();
        
        // Cabeçalho com informações da empresa
        const header = {
            empresa: spedData?.dadosEmpresa?.razaoSocial || 'N/A',
            cnpj: this.formatCNPJ(spedData?.dadosEmpresa?.cnpj),
            periodo: spedData?.periodoApuracao || 'N/A',
            ufOrigem: spedData?.dadosEmpresa?.uf || 'N/A',
            dataExportacao: new Date().toLocaleString('pt-BR')
        };
        
        // Dados detalhados
        const dados = resultados
            .filter(r => r && !r.erro)
            .map(r => ({
                'Item': r.item?.codItem || '',
                'NCM': r.item?.ncm || 'N/A',
                'Descrição': this.truncateText(r.item?.descricaoItem || r.item?.descrCompl || '', 50),
                'CFOP': r.item?.cfop || '',
                'CST': r.item?.cstIcms || '',
                'Valor Item': this.formatNumber(r.item?.vlItem),
                'Base Cálculo': this.formatNumber(r.base),
                'Alíq. Origem (%)': this.formatNumber(r.aliqOrigem),
                'Alíq. Destino (%)': this.formatNumber(r.aliqDestino),
                'DIFAL': this.formatNumber(r.difal),
                'FCP (%)': this.formatNumber(r.aliqFcp),
                'Valor FCP': this.formatNumber(r.fcp),
                'Total a Recolher': this.formatNumber(r.totalRecolher),
                'Metodologia': r.metodologia || 'N/A',
                'Benefício': r.beneficio || 'Nenhum',
                'Status': r.status || 'Calculado'
            }));
        
        // Totalizadores
        const totais = {
            'Total de Itens': totalizadores?.totalItens || 0,
            'Total Base Cálculo': this.formatNumber(totalizadores?.totalBase),
            'Total DIFAL': this.formatNumber(totalizadores?.totalDifal),
            'Total FCP': this.formatNumber(totalizadores?.totalFcp),
            'Total a Recolher': this.formatNumber(totalizadores?.totalRecolher),
            'Itens com Benefício': totalizadores?.itensComBeneficio || 0,
            'Economia Total': this.formatNumber(totalizadores?.economiaTotal)
        };
        
        return {
            header,
            dados,
            totais,
            totalRows: dados.length,
            configuracao: {
                ufOrigem: spedData?.dadosEmpresa?.uf || 'BR',
                ufDestino: results.ufDestino || 'BR'
            }
        };
    }

    /**
     * Exporta usando biblioteca XlsxPopulate
     * @private
     * @async
     * @param {Object} exportData - Dados preparados para exportação
     */
    async exportWithXlsxPopulate(exportData) {
        const workbook = await window.XlsxPopulate.fromBlankAsync();
        const sheet = workbook.sheet(0);
        sheet.name(this.config.excel.defaultSheetName);
        
        let currentRow = 1;
        
        // === CABEÇALHO DA EMPRESA ===
        sheet.cell(currentRow, 1).value('RELATÓRIO DE CÁLCULO DIFAL').style({ bold: true, fontSize: 16 });
        currentRow += 2;
        
        sheet.cell(currentRow, 1).value('Empresa:');
        sheet.cell(currentRow, 2).value(exportData.header.empresa);
        currentRow++;
        
        sheet.cell(currentRow, 1).value('CNPJ:');
        sheet.cell(currentRow, 2).value(exportData.header.cnpj);
        currentRow++;
        
        sheet.cell(currentRow, 1).value('Período:');
        sheet.cell(currentRow, 2).value(exportData.header.periodo);
        currentRow++;
        
        sheet.cell(currentRow, 1).value('Data Exportação:');
        sheet.cell(currentRow, 2).value(exportData.header.dataExportacao);
        currentRow += 2;
        
        // === DADOS DETALHADOS ===
        if (exportData.dados.length > 0) {
            const headers = Object.keys(exportData.dados[0]);
            
            // Cabeçalhos da tabela
            headers.forEach((header, index) => {
                const cell = sheet.cell(currentRow, index + 1);
                cell.value(header);
                cell.style({
                    bold: true,
                    fill: '4472C4',
                    fontColor: 'FFFFFF',
                    border: true,
                    horizontalAlignment: 'center'
                });
            });
            currentRow++;
            
            // Dados
            exportData.dados.forEach(linha => {
                headers.forEach((header, colIndex) => {
                    const cell = sheet.cell(currentRow, colIndex + 1);
                    cell.value(linha[header]);
                    cell.style({ 
                        border: true,
                        horizontalAlignment: this.isNumericColumn(header) ? 'right' : 'left'
                    });
                });
                currentRow++;
            });
            
            // Ajustar largura das colunas
            this.adjustColumnWidths(sheet, headers);
        }
        
        currentRow += 2;
        
        // === TOTALIZADORES ===
        sheet.cell(currentRow, 1).value('TOTALIZADORES').style({ bold: true, fontSize: 14 });
        currentRow++;
        
        Object.entries(exportData.totais).forEach(([label, value]) => {
            sheet.cell(currentRow, 1).value(label + ':');
            sheet.cell(currentRow, 2).value(value).style({ bold: true });
            currentRow++;
        });
        
        // Gerar arquivo
        const blob = await workbook.outputAsync('blob');
        this.downloadFile(blob, this.generateExcelFilename(exportData), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    /**
     * Ajusta largura das colunas baseado no conteúdo
     * @private
     * @param {Object} sheet - Planilha XlsxPopulate
     * @param {Array} headers - Cabeçalhos das colunas
     */
    adjustColumnWidths(sheet, headers) {
        const widthMap = {
            'Item': 10,
            'NCM': 12,
            'Descrição': 40,
            'CFOP': 8,
            'CST': 8,
            'Valor Item': 15,
            'Base Cálculo': 15,
            'Alíq. Origem (%)': 12,
            'Alíq. Destino (%)': 12,
            'DIFAL': 15,
            'FCP (%)': 10,
            'Valor FCP': 15,
            'Total a Recolher': 15,
            'Metodologia': 15,
            'Benefício': 20,
            'Status': 12
        };
        
        headers.forEach((header, index) => {
            const width = widthMap[header] || 15;
            sheet.column(index + 1).width(width);
        });
    }

    // ========== EXPORTAÇÃO PARA PDF ==========

    /**
     * Exporta resultados para PDF
     * @async
     * @public
     * @returns {Promise<void>}
     */
    async exportToPdf() {
        try {
            console.log('📄 Iniciando exportação para PDF...');
            
            // Verificar dependências
            if (!window.jspdf || !window.jspdf.jsPDF) {
                throw new Error('jsPDF não está carregado. Inclua a biblioteca jsPDF no HTML.');
            }
            
            const results = this.getCalculationResults();
            if (!results || !results.resultados) {
                throw new Error('Nenhum resultado disponível para exportar');
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: this.config.pdf.pageOrientation,
                unit: 'mm',
                format: 'a4'
            });
            
            await this.buildPdfDocument(doc, results);
            
            // Salvar PDF
            doc.save(this.generatePDFFilename());
            
            this.notifyExportSuccess('PDF', results.resultados.length);
            
        } catch (error) {
            this.handleExportError('PDF', error);
        }
    }

    /**
     * Constrói documento PDF
     * @private
     * @param {jsPDF} doc - Instância do jsPDF
     * @param {Object} results - Resultados do cálculo
     */
    async buildPdfDocument(doc, results) {
        const spedData = this.stateManager.getSpedData();
        let yPosition = 20;
        
        // === CABEÇALHO ===
        doc.setFontSize(18);
        doc.setTextColor(44, 62, 80);
        doc.text('RELATÓRIO DE CÁLCULO DIFAL', 105, yPosition, { align: 'center' });
        yPosition += 15;
        
        // Informações da empresa
        doc.setFontSize(10);
        doc.setTextColor(52, 73, 94);
        
        if (spedData?.dadosEmpresa) {
            doc.text(`Empresa: ${spedData.dadosEmpresa.razaoSocial}`, 20, yPosition);
            yPosition += 6;
            doc.text(`CNPJ: ${this.formatCNPJ(spedData.dadosEmpresa.cnpj)}`, 20, yPosition);
            yPosition += 6;
            doc.text(`UF: ${spedData.dadosEmpresa.uf}`, 20, yPosition);
            yPosition += 6;
            doc.text(`Período: ${spedData.periodoApuracao || 'N/A'}`, 20, yPosition);
            yPosition += 10;
        }
        
        // === TOTALIZADORES ===
        doc.setFillColor(240, 240, 240);
        doc.rect(15, yPosition - 5, 180, 30, 'F');
        
        doc.setFontSize(12);
        doc.setTextColor(44, 62, 80);
        doc.text('TOTALIZADORES', 20, yPosition);
        yPosition += 7;
        
        doc.setFontSize(10);
        const totalizadores = results.totalizadores;
        doc.text(`Total de Itens: ${totalizadores.totalItens}`, 20, yPosition);
        doc.text(`Total DIFAL: ${this.formatCurrency(totalizadores.totalDifal)}`, 70, yPosition);
        doc.text(`Total FCP: ${this.formatCurrency(totalizadores.totalFcp)}`, 120, yPosition);
        yPosition += 6;
        doc.text(`Total a Recolher: ${this.formatCurrency(totalizadores.totalRecolher)}`, 20, yPosition);
        doc.text(`Itens com Benefício: ${totalizadores.itensComBeneficio || 0}`, 70, yPosition);
        doc.text(`Economia: ${this.formatCurrency(totalizadores.economiaTotal || 0)}`, 120, yPosition);
        yPosition += 15;
        
        // === TABELA DE RESULTADOS ===
        if (doc.autoTable) {
            const tableData = this.preparePdfTableData(results.resultados);
            
            doc.autoTable({
                startY: yPosition,
                head: [['Item', 'NCM', 'CFOP', 'Base Cálculo', 'DIFAL', 'FCP', 'Total']],
                body: tableData,
                theme: 'grid',
                styles: { 
                    fontSize: 8,
                    cellPadding: 2
                },
                headStyles: { 
                    fillColor: [68, 114, 196],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                columnStyles: {
                    0: { cellWidth: 20 },
                    1: { cellWidth: 25 },
                    2: { cellWidth: 15 },
                    3: { cellWidth: 30, halign: 'right' },
                    4: { cellWidth: 30, halign: 'right' },
                    5: { cellWidth: 30, halign: 'right' },
                    6: { cellWidth: 30, halign: 'right' }
                }
            });
        }
        
        // Rodapé
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(
                `Página ${i} de ${pageCount} - Gerado em ${new Date().toLocaleString('pt-BR')}`,
                105, 
                doc.internal.pageSize.height - 10,
                { align: 'center' }
            );
        }
    }

    /**
     * Prepara dados da tabela para PDF
     * @private
     * @param {Array} resultados - Resultados do cálculo
     * @returns {Array} Dados formatados para tabela
     */
    preparePdfTableData(resultados) {
        return resultados
            .filter(r => r && !r.erro && r.difal > 0)
            .slice(0, this.config.pdf.maxItemsPerPage)
            .map(r => [
                r.item?.codItem || '',
                r.item?.ncm || 'N/A',
                r.item?.cfop || '',
                this.formatCurrency(r.base),
                this.formatCurrency(r.difal),
                this.formatCurrency(r.fcp),
                this.formatCurrency(r.totalRecolher)
            ]);
    }

    // ========== EXPORTAÇÃO PARA CSV ==========

    /**
     * Exporta dados como CSV (fallback quando Excel não disponível)
     * @private
     * @param {Object} exportData - Dados preparados para exportação
     */
    exportAsCSV(exportData) {
        console.log('📝 Exportando como CSV...');
        
        try {
            const csvContent = this.buildCSVContent(exportData);
            const blob = new Blob([csvContent], { 
                type: `text/csv;charset=${this.config.csv.encoding};` 
            });
            
            this.downloadFile(blob, this.generateCSVFilename(), 'text/csv');
            this.notifyExportSuccess('CSV', exportData.totalRows);
            
        } catch (error) {
            this.handleExportError('CSV', error);
        }
    }

    /**
     * Constrói conteúdo CSV
     * @private
     * @param {Object} exportData - Dados para exportação
     * @returns {string} Conteúdo CSV formatado
     */
    buildCSVContent(exportData) {
        const delimiter = this.config.csv.delimiter;
        const lines = [];
        
        // BOM para UTF-8
        if (this.config.csv.includeBOM) {
            lines.push('\uFEFF');
        }
        
        // Cabeçalho
        lines.push(`Sistema DIFAL - Relatório de Cálculo`);
        lines.push(`Empresa${delimiter}${exportData.header.empresa}`);
        lines.push(`CNPJ${delimiter}${exportData.header.cnpj}`);
        lines.push(`Data Exportação${delimiter}${exportData.header.dataExportacao}`);
        lines.push(''); // Linha vazia
        
        // Dados
        if (exportData.dados.length > 0) {
            const headers = Object.keys(exportData.dados[0]);
            lines.push(headers.join(delimiter));
            
            exportData.dados.forEach(row => {
                const values = headers.map(header => {
                    const value = row[header];
                    // Escapar valores que contêm o delimitador
                    if (String(value).includes(delimiter)) {
                        return `"${String(value).replace(/"/g, '""')}"`;
                    }
                    return value;
                });
                lines.push(values.join(delimiter));
            });
        }
        
        // Totalizadores
        lines.push(''); // Linha vazia
        lines.push('TOTALIZADORES');
        Object.entries(exportData.totais).forEach(([label, value]) => {
            lines.push(`${label}${delimiter}${value}`);
        });
        
        return lines.join('\r\n');
    }

    // ========== EXPORTAÇÃO DE MEMÓRIA DE CÁLCULO ==========

    /**
     * Exporta memória de cálculo de um item específico
     * @public
     * @param {string} itemId - ID do item
     */
    exportarMemoriaCalculo(itemId) {
        try {
            const results = this.getCalculationResults();
            if (!results || !results.resultados) {
                throw new Error('Resultados não disponíveis');
            }
            
            const resultado = results.resultados.find(r => r.item?.codItem === itemId);
            if (!resultado || !resultado.memoriaCalculo) {
                throw new Error(`Memória de cálculo não disponível para o item ${itemId}`);
            }
            
            const content = this.formatMemoriaCalculo(resultado);
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const filename = `memoria_calculo_${itemId}_${Date.now()}.txt`;
            
            this.downloadFile(blob, filename, 'text/plain');
            console.log(`✅ Memória de cálculo exportada: ${filename}`);
            
        } catch (error) {
            this.handleExportError('Memória de Cálculo', error);
        }
    }

    /**
     * Formata memória de cálculo para exportação
     * @private
     * @param {Object} resultado - Resultado do cálculo
     * @returns {string} Memória formatada
     */
    formatMemoriaCalculo(resultado) {
        const lines = [
            '='.repeat(80),
            'MEMÓRIA DE CÁLCULO DIFAL',
            '='.repeat(80),
            '',
            `Item: ${resultado.item.codItem}`,
            `NCM: ${resultado.item.ncm || 'N/A'}`,
            `Descrição: ${resultado.item.descricaoItem || resultado.item.descrCompl || 'N/A'}`,
            `CFOP: ${resultado.item.cfop}`,
            '',
            '-'.repeat(80),
            'DETALHAMENTO DO CÁLCULO',
            '-'.repeat(80),
            ''
        ];
        
        if (resultado.memoriaCalculo && Array.isArray(resultado.memoriaCalculo)) {
            lines.push(...resultado.memoriaCalculo);
        }
        
        lines.push(
            '',
            '-'.repeat(80),
            'RESULTADO FINAL',
            '-'.repeat(80),
            `Base de Cálculo: ${this.formatCurrency(resultado.base)}`,
            `DIFAL: ${this.formatCurrency(resultado.difal)}`,
            `FCP: ${this.formatCurrency(resultado.fcp)}`,
            `Total a Recolher: ${this.formatCurrency(resultado.totalRecolher)}`,
            '',
            `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
            '='.repeat(80)
        );
        
        return lines.join('\n');
    }

    // ========== MÉTODOS UTILITÁRIOS ==========

    /**
     * Obtém resultados do cálculo
     * @private
     * @returns {Object|null} Resultados do cálculo
     */
    getCalculationResults() {
        // Primeiro tenta do StateManager
        const stateCalc = this.stateManager?.getState('calculation');
        if (stateCalc && stateCalc.results) {
            return {
                resultados: stateCalc.results,
                totalizadores: stateCalc.totals,
                ufOrigem: stateCalc.ufOrigem,
                ufDestino: stateCalc.ufDestino,
                calculator: window.difalResults?.calculator
            };
        }
        
        // Fallback para window.difalResults
        return window.difalResults;
    }

    /**
     * Realiza download do arquivo
     * @private
     * @param {Blob} blob - Conteúdo do arquivo
     * @param {string} filename - Nome do arquivo
     * @param {string} mimeType - Tipo MIME
     */
    downloadFile(blob, filename, mimeType) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        }, 100);
    }

    /**
     * Gera nome do arquivo Excel
     * @private
     * @param {Object} exportData - Dados de exportação
     * @returns {string} Nome do arquivo
     */
    generateExcelFilename(exportData) {
        const timestamp = new Date().toISOString().slice(0, 10);
        const uf = exportData.configuracao.ufOrigem;
        return `DIFAL_${uf}_${timestamp}.xlsx`;
    }

    /**
     * Gera nome do arquivo PDF
     * @private
     * @returns {string} Nome do arquivo
     */
    generatePDFFilename() {
        const timestamp = new Date().toISOString().slice(0, 10);
        return `DIFAL_Relatorio_${timestamp}.pdf`;
    }

    /**
     * Gera nome do arquivo CSV
     * @private
     * @returns {string} Nome do arquivo
     */
    generateCSVFilename() {
        const timestamp = new Date().toISOString().slice(0, 10);
        return `DIFAL_Dados_${timestamp}.csv`;
    }

    /**
     * Formata número para exibição
     * @private
     * @param {number} value - Valor numérico
     * @param {number} decimals - Casas decimais
     * @returns {string} Número formatado
     */
    formatNumber(value, decimals = 2) {
        if (value === null || value === undefined) return '';
        if (typeof value !== 'number') return value;
        
        return value.toLocaleString('pt-BR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    /**
     * Formata valor monetário
     * @private
     * @param {number} value - Valor monetário
     * @returns {string} Valor formatado como moeda
     */
    formatCurrency(value) {
        if (typeof value !== 'number') return 'R$ 0,00';
        
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    /**
     * Formata CNPJ
     * @private
     * @param {string} cnpj - CNPJ sem formatação
     * @returns {string} CNPJ formatado
     */
    formatCNPJ(cnpj) {
        if (!cnpj) return 'N/A';
        
        const cleaned = String(cnpj).replace(/\D/g, '');
        if (cleaned.length !== 14) return cnpj;
        
        return cleaned.replace(
            /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
            '$1.$2.$3/$4-$5'
        );
    }

    /**
     * Trunca texto longo
     * @private
     * @param {string} text - Texto original
     * @param {number} maxLength - Comprimento máximo
     * @returns {string} Texto truncado
     */
    truncateText(text, maxLength = 50) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * Verifica se coluna é numérica
     * @private
     * @param {string} columnName - Nome da coluna
     * @returns {boolean} True se coluna contém valores numéricos
     */
    isNumericColumn(columnName) {
        const numericColumns = [
            'Valor Item', 'Base Cálculo', 'DIFAL', 'Valor FCP',
            'Total a Recolher', 'Alíq. Origem (%)', 'Alíq. Destino (%)',
            'FCP (%)'
        ];
        return numericColumns.includes(columnName);
    }

    /**
     * Notifica sucesso na exportação
     * @private
     * @param {string} format - Formato exportado
     * @param {number} itemCount - Quantidade de itens
     */
    notifyExportSuccess(format, itemCount) {
        const message = `✅ Exportação ${format} concluída: ${itemCount} itens exportados`;
        console.log(message);
        
        // Notificar via EventBus
        if (this.eventBus) {
            this.eventBus.emit('EXPORT_SUCCESS', {
                format,
                itemCount,
                timestamp: Date.now()
            });
        }
        
        // Notificar UI se disponível
        if (window.uiManager && window.uiManager.showSuccess) {
            window.uiManager.showSuccess(message);
        }
    }

    /**
     * Trata erros de exportação
     * @private
     * @param {string} format - Formato tentado
     * @param {Error} error - Erro ocorrido
     */
    handleExportError(format, error) {
        const message = `❌ Erro na exportação ${format}: ${error.message}`;
        console.error(message, error);
        
        // Notificar via EventBus
        if (this.eventBus) {
            this.eventBus.emit('EXPORT_ERROR', {
                format,
                error: error.message,
                timestamp: Date.now()
            });
        }
        
        // Mostrar erro na UI
        if (window.uiManager && window.uiManager.showError) {
            window.uiManager.showError(message);
        } else {
            alert(message);
        }
    }

    /**
     * Trata requisições de exportação via EventBus
     * @private
     * @param {Object} data - Dados da requisição
     */
    handleExportRequest(data) {
        const { format, options } = data;
        
        switch (format?.toLowerCase()) {
            case 'excel':
            case 'xlsx':
                this.exportToExcel(options);
                break;
            case 'pdf':
                this.exportToPdf(options);
                break;
            case 'csv':
                this.exportAsCSV(options);
                break;
            case 'memoria':
                if (options?.itemId) {
                    this.exportarMemoriaCalculo(options.itemId);
                }
                break;
            default:
                console.warn(`Formato de exportação não suportado: ${format}`);
        }
    }

    /**
     * Obtém resultados de cálculo do StateManager
     * @private
     * @returns {Object|null} Resultados do cálculo
     */
    getCalculationResults() {
        try {
            const state = this.stateManager.getState();
            if (!state.calculation || !state.calculation.results) {
                return null;
            }

            return {
                resultados: state.calculation.results,
                totalizadores: state.calculation.totals
            };
        } catch (error) {
            console.error('❌ Erro ao obter resultados de cálculo:', error);
            return null;
        }
    }

    /**
     * Prepara dados para exportação Excel
     * @private
     * @param {Object} results - Resultados do cálculo
     * @returns {Object} Dados formatados para Excel
     */
    prepareExcelData(results) {
        const cabecalhos = [
            'Código Item',
            'Descrição',
            'NCM',
            'CFOP',
            'Base Cálculo',
            'Metodologia',
            'Alíq. Origem (%)',
            'Alíq. Destino (%)',
            'Alíq. FCP (%)',
            'Valor DIFAL',
            'Valor FCP',
            'Total a Recolher',
            'Benefício Aplicado'
        ];

        const dados = results.resultados.map(item => [
            item.codItem || '',
            item.descricaoItem || item.descItem || '',
            item.ncm || 'N/A',
            item.cfop || '',
            item.baseCalculo || 0,
            item.metodoCalculo || '',
            item.aliqOrigem || 0,
            item.aliqDestino || 0,
            item.aliqFcp || 0,
            item.valorDifal || 0,
            item.valorFcp || 0,
            (item.valorDifal || 0) + (item.valorFcp || 0),
            item.beneficioAplicado?.tipo || ''
        ]);

        return {
            cabecalhos,
            dados,
            totalRows: dados.length,
            totalizadores: results.totalizadores
        };
    }

    /**
     * Prepara dados para exportação PDF
     * @private
     * @param {Object} results - Resultados do cálculo
     * @returns {Object} Dados formatados para PDF
     */
    preparePDFData(results) {
        console.log('📄 Preparando dados para PDF...');
        
        if (!results || !results.resultados) {
            throw new Error('Dados de resultados não disponíveis');
        }

        const dadosPDF = results.resultados.map(item => [
            item.codItem || '', // Código
            item.descricaoItem || item.descItem || '', // Descrição
            item.cfop || '', // CFOP
            item.ncm || '', // NCM
            this.formatCurrency(item.baseCalculo || 0), // Valor Base
            this.formatCurrency(item.valorDifal || 0), // DIFAL
            this.formatCurrency(item.valorFcp || 0), // FCP
            item.configuracaoItem ? 'S' : 'N' // Benefício aplicado
        ]);

        console.log(`📄 PDF preparado: ${dadosPDF.length} itens`);

        return {
            cabecalhos: ['Código', 'Descrição', 'CFOP', 'NCM', 'Valor Base', 'DIFAL', 'FCP', 'Benefício'],
            dados: dadosPDF,
            totalRows: dadosPDF.length,
            totalizadores: results.totalizadores
        };
    }

    /**
     * Exporta usando XlsxPopulate (se disponível)
     * @private
     * @param {Object} exportData - Dados preparados
     */
    async exportWithXlsxPopulate(exportData) {
        if (!window.XlsxPopulate) {
            throw new Error('XlsxPopulate não está disponível');
        }

        const workbook = await window.XlsxPopulate.fromBlankAsync();
        const sheet = workbook.sheet(0);

        // Adicionar cabeçalhos
        exportData.cabecalhos.forEach((header, index) => {
            sheet.cell(1, index + 1).value(header);
        });

        // Adicionar dados
        exportData.dados.forEach((row, rowIndex) => {
            row.forEach((value, colIndex) => {
                sheet.cell(rowIndex + 2, colIndex + 1).value(value);
            });
        });

        // Gerar arquivo
        const filename = this.generateExcelFilename();
        const blob = await workbook.outputAsync();
        
        // Download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([blob]));
        link.download = filename;
        link.click();
        
        URL.revokeObjectURL(link.href);
    }

    /**
     * Exporta como CSV (fallback)
     * @private
     * @param {Object} exportData - Dados preparados
     */
    exportAsCSV(exportData) {
        let csvContent = '';
        
        // Cabeçalhos
        csvContent += exportData.cabecalhos.join(';') + '\n';
        
        // Dados
        exportData.dados.forEach(row => {
            csvContent += row.join(';') + '\n';
        });

        // Download
        const filename = this.generateCSVFilename();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        
        URL.revokeObjectURL(link.href);
    }

    /**
     * Exporta memória de cálculo para arquivo
     * @public
     * @param {string} itemId - ID do item
     */
    exportarMemoriaCalculo(itemId) {
        try {
            const state = this.stateManager.getState();
            const resultados = state.calculation.results || [];
            const resultado = resultados.find(r => r.codItem === itemId);
            
            if (!resultado || !resultado.memoriaCalculo) {
                throw new Error('Memória de cálculo não disponível para este item');
            }
            
            const texto = resultado.memoriaCalculo.join('\n');
            const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            
            link.href = URL.createObjectURL(blob);
            link.download = `memoria_calculo_${itemId}_${new Date().getTime()}.txt`;
            link.click();
            
            URL.revokeObjectURL(link.href);
            
            console.log(`✅ Memória de cálculo exportada para item ${itemId}`);
            
        } catch (error) {
            console.error('❌ Erro ao exportar memória de cálculo:', error);
            if (this.progressManager) {
                this.progressManager.showError(`Erro ao exportar memória: ${error.message}`);
            }
        }
    }

    /**
     * Exporta resultados para PDF
     * @async
     * @public
     * @returns {Promise<void>}
     * @throws {Error} Se não houver dados para exportar
     */
    async exportToPdf() {
        try {
            console.log('📄 Iniciando exportação para PDF...');
            
            // Validar dados
            const results = this.getCalculationResults();
            if (!results || !results.resultados) {
                throw new Error('Nenhum resultado de cálculo disponível para exportar');
            }
            
            // Preparar dados
            const exportData = this.preparePDFData(results);
            
            // Verificar se jsPDF está disponível
            if (!window.jspdf || !window.jspdf.jsPDF) {
                throw new Error('jsPDF não está disponível');
            }
            
            // Criar PDF
            await this.generatePDF(exportData);
            
            // Notificar sucesso
            this.notifyExportSuccess('PDF', exportData.totalRows);
            
        } catch (error) {
            this.handleExportError('PDF', error);
        }
    }

    /**
     * Gera arquivo PDF profissional
     * @private
     * @param {Object} exportData - Dados preparados
     */
    async generatePDF(exportData) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape', 'mm', 'a4');

        let currentY = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;

        // ========== CABEÇALHO PROFISSIONAL ==========
        this.addPDFHeader(doc, exportData, currentY, pageWidth, margin);
        currentY = 60;

        // ========== RESUMO EXECUTIVO EM CARDS ==========
        if (exportData.totalizadores) {
            currentY = this.addPDFSummaryCards(doc, exportData.totalizadores, currentY, pageWidth, margin);
            currentY += 15;
        }

        // ========== TABELA DE RESULTADOS ==========
        if (window.jspdf && window.jspdf.jsPDF && doc.autoTable) {
            this.addPDFTable(doc, exportData, currentY);
        } else {
            this.addPDFTableFallback(doc, exportData, currentY, margin);
        }

        // ========== RODAPÉ COM INFORMAÇÕES LEGAIS ==========
        this.addPDFFooter(doc, exportData);

        // Salvar arquivo
        const filename = this.generatePDFFilename();
        doc.save(filename);
        
        console.log(`✅ PDF profissional exportado: ${filename}`);
    }

    /**
     * Adiciona cabeçalho profissional ao PDF
     * @private
     */
    addPDFHeader(doc, exportData, y, pageWidth, margin) {
        // Fundo do cabeçalho
        doc.setFillColor(45, 55, 72); // Cor azul escura
        doc.rect(0, 0, pageWidth, 45, 'F');

        // Título principal
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont(undefined, 'bold');
        doc.text('RELATÓRIO DIFAL', pageWidth/2, 20, { align: 'center' });

        // Subtítulo
        doc.setFontSize(14);
        doc.setFont(undefined, 'normal');
        doc.text('Diferencial de Alíquota do ICMS', pageWidth/2, 30, { align: 'center' });

        // Data de geração
        const agora = new Date().toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        doc.setFontSize(12);
        doc.text(`Gerado em: ${agora}`, pageWidth - margin, 38, { align: 'right' });

        // Informações da empresa (se disponíveis)
        const state = this.stateManager?.getState();
        if (state?.sped?.dadosEmpresa) {
            const empresa = state.sped.dadosEmpresa;
            doc.setFontSize(10);
            doc.text(`${empresa.razaoSocial}`, margin, 38);
            if (empresa.cnpj) {
                doc.text(`CNPJ: ${empresa.cnpj}`, margin, 42);
            }
        }

        // Reset cor do texto
        doc.setTextColor(0, 0, 0);
    }

    /**
     * Adiciona cards de resumo profissionais
     * @private
     */
    addPDFSummaryCards(doc, totals, y, pageWidth, margin) {
        const cardWidth = (pageWidth - 2 * margin - 30) / 4;
        const cardHeight = 25;
        const startX = margin;

        // Dados dos cards
        const cards = [
            { label: 'Total Itens', value: totals.totalItens.toString(), color: [52, 152, 219] },
            { label: 'DIFAL', value: this.formatCurrency(totals.totalDifal), color: [231, 76, 60] },
            { label: 'FCP', value: this.formatCurrency(totals.totalFcp), color: [155, 89, 182] },
            { label: 'A Recolher', value: this.formatCurrency(totals.totalRecolher), color: [46, 204, 113] }
        ];

        cards.forEach((card, index) => {
            const x = startX + index * (cardWidth + 10);
            
            // Fundo do card
            doc.setFillColor(card.color[0], card.color[1], card.color[2]);
            doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'F');

            // Label
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(card.label, x + cardWidth/2, y + 8, { align: 'center' });

            // Valor
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(card.value, x + cardWidth/2, y + 18, { align: 'center' });
        });

        doc.setTextColor(0, 0, 0);
        return y + cardHeight + 10;
    }

    /**
     * Adiciona tabela de dados profissional
     * @private
     */
    addPDFTable(doc, exportData, startY) {
        doc.autoTable({
            startY: startY,
            head: [['Código', 'Descrição', 'CFOP', 'NCM', 'Valor Base', 'DIFAL', 'FCP', 'Observações']],
            body: exportData.dados.map(row => [
                row[0] || '', // Código
                this.truncateText(row[1] || '', 25), // Descrição truncada
                row[2] || '', // CFOP  
                row[3] || '', // NCM
                row[4] || '', // Valor Base
                row[5] || '', // DIFAL
                row[6] || '', // FCP
                row[7] ? 'Benefício aplicado' : '' // Observações
            ]),
            styles: {
                fontSize: 9,
                cellPadding: 3,
                lineColor: [200, 200, 200],
                lineWidth: 0.1
            },
            headStyles: {
                fillColor: [45, 55, 72],
                textColor: 255,
                fontSize: 10,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 25 }, // Código
                1: { cellWidth: 50 }, // Descrição
                2: { cellWidth: 20 }, // CFOP
                3: { cellWidth: 25 }, // NCM
                4: { cellWidth: 25, halign: 'right' }, // Valor Base
                5: { cellWidth: 25, halign: 'right' }, // DIFAL
                6: { cellWidth: 20, halign: 'right' }, // FCP
                7: { cellWidth: 35 } // Observações
            },
            alternateRowStyles: {
                fillColor: [248, 249, 250]
            },
            margin: { left: 20, right: 20 },
            didParseCell: function(data) {
                // Destacar valores de DIFAL > 0
                if (data.column.index === 5 && parseFloat(data.cell.raw) > 0) {
                    data.cell.styles.textColor = [231, 76, 60]; // Vermelho
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });
    }

    /**
     * Adiciona tabela simples como fallback
     * @private
     */
    addPDFTableFallback(doc, exportData, startY, margin) {
        let y = startY;
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        
        // Cabeçalho
        doc.text('Código', margin, y);
        doc.text('CFOP', margin + 40, y);
        doc.text('Valor DIFAL', margin + 80, y);
        doc.text('Valor FCP', margin + 130, y);
        
        y += 10;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        
        // Dados (limitados)
        exportData.dados.slice(0, 25).forEach(row => {
            if (y > 180) return;
            
            doc.text(row[0] || '', margin, y);
            doc.text(row[2] || '', margin + 40, y);
            doc.text(row[5] || '', margin + 80, y);
            doc.text(row[6] || '', margin + 130, y);
            y += 8;
        });
        
        if (exportData.dados.length > 25) {
            doc.setFontSize(8);
            doc.text(`... e mais ${exportData.dados.length - 25} itens`, margin, y + 10);
        }
    }

    /**
     * Adiciona rodapé informativo
     * @private
     */
    addPDFFooter(doc, exportData) {
        const pageHeight = doc.internal.pageSize.getHeight();
        const y = pageHeight - 30;
        
        // Linha separadora
        doc.setDrawColor(200, 200, 200);
        doc.line(20, y - 5, doc.internal.pageSize.getWidth() - 20, y - 5);
        
        // Informações legais
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('Este relatório foi gerado automaticamente pelo Sistema DIFAL.', 20, y);
        doc.text('Confira sempre os valores com sua contabilidade antes do recolhimento.', 20, y + 8);
        
        // Número da página
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.getWidth() - 40, y + 8);
        }
        
        doc.setTextColor(0, 0, 0);
    }

    /**
     * Trunca texto para caber na célula
     * @private
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
}

// ========== EXPORTAÇÃO DO MÓDULO ==========

// Registrar globalmente
if (typeof window !== 'undefined') {
    window.ExportManager = ExportManager;
    
    // Registrar função global para compatibilidade
    window.exportarMemoriaCalculo = function(itemId) {
        if (window.exportManager) {
            window.exportManager.exportarMemoriaCalculo(itemId);
        } else {
            console.error('ExportManager não inicializado');
        }
    };
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExportManager;
}