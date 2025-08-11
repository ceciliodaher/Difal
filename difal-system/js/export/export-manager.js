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
            
            // Escolher método de exportação
            if (window.XlsxPopulate) {
                await this.exportWithXlsxPopulate(exportData);
            } else {
                console.warn('⚠️ XlsxPopulate não disponível, usando fallback CSV');
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