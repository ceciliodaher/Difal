/**
 * @fileoverview Pagination Manager - Gerenciamento de paginação para tabelas
 * @description Módulo especializado para controlar navegação e paginação de itens
 * 
 * @author Sistema DIFAL
 * @version 1.0.0
 * @since 2025-08-10
 */

/**
 * @class PaginationManager
 * @classdesc Gerencia paginação e navegação entre itens
 */
class PaginationManager {
    /**
     * @param {StateManager} stateManager - Gerenciador de estado
     * @param {EventBus} eventBus - Sistema de eventos
     */
    constructor(stateManager, eventBus) {
        this.stateManager = stateManager;
        this.eventBus = eventBus;
        
        // Configurações de paginação
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalItems = 0;
        this.totalPages = 0;
        
        this.init();
    }

    /**
     * Inicializa o PaginationManager
     * @private
     */
    init() {
        this.setupGlobalFunctions();
        console.log('📄 PaginationManager inicializado com sucesso');
    }

    /**
     * Configura funções globais de paginação
     * @private
     */
    setupGlobalFunctions() {
        window.paginaAnterior = () => this.paginaAnterior();
        window.proximaPagina = () => this.proximaPagina();
    }

    /**
     * Navega para a página anterior
     * @public
     */
    paginaAnterior() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePage();
            console.log(`📄 Navegando para página ${this.currentPage}`);
        } else {
            console.log('📄 Já está na primeira página');
        }
    }

    /**
     * Navega para a próxima página
     * @public
     */
    proximaPagina() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePage();
            console.log(`📄 Navegando para página ${this.currentPage}`);
        } else {
            console.log('📄 Já está na última página');
        }
    }

    /**
     * Atualiza a exibição da página atual
     * @private
     */
    updatePage() {
        this.updatePaginationInfo();
        this.updateTableDisplay();
        
        // Emitir evento para outros módulos
        if (this.eventBus) {
            this.eventBus.emit('pagination:changed', {
                currentPage: this.currentPage,
                totalPages: this.totalPages,
                itemsPerPage: this.itemsPerPage
            });
        }
    }

    /**
     * Atualiza informações de paginação na UI
     * @private
     */
    updatePaginationInfo() {
        const paginationInfo = document.querySelector('.pagination-info');
        if (paginationInfo) {
            const startItem = ((this.currentPage - 1) * this.itemsPerPage) + 1;
            const endItem = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
            
            paginationInfo.textContent = `Página ${this.currentPage} de ${this.totalPages} (${startItem}-${endItem} de ${this.totalItems} itens)`;
        }

        // Atualizar estado dos botões
        const btnAnterior = document.querySelector('.btn-pagina-anterior');
        const btnProxima = document.querySelector('.btn-proxima-pagina');
        
        if (btnAnterior) {
            btnAnterior.disabled = this.currentPage === 1;
        }
        
        if (btnProxima) {
            btnProxima.disabled = this.currentPage === this.totalPages;
        }
    }

    /**
     * Atualiza exibição da tabela com itens da página atual
     * @private
     */
    updateTableDisplay() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        
        // Buscar dados do estado
        const spedData = this.stateManager.getState('spedData');
        if (spedData && spedData.itensDifal) {
            const pageItems = spedData.itensDifal.slice(startIndex, endIndex);
            
            // Emitir evento com itens da página atual
            if (this.eventBus) {
                this.eventBus.emit('pagination:items-updated', {
                    items: pageItems,
                    startIndex,
                    endIndex,
                    currentPage: this.currentPage
                });
            }
        }
    }

    /**
     * Configura paginação para um conjunto de itens
     * @public
     * @param {Array} items - Array de itens para paginar
     * @param {number} itemsPerPage - Itens por página (opcional)
     */
    setupPagination(items, itemsPerPage = 10) {
        this.totalItems = items ? items.length : 0;
        this.itemsPerPage = itemsPerPage;
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.currentPage = 1;
        
        this.updatePage();
        
        console.log(`📄 Paginação configurada: ${this.totalItems} itens, ${this.totalPages} páginas`);
    }

    /**
     * Vai para uma página específica
     * @public
     * @param {number} pageNumber - Número da página
     */
    goToPage(pageNumber) {
        if (pageNumber >= 1 && pageNumber <= this.totalPages) {
            this.currentPage = pageNumber;
            this.updatePage();
            console.log(`📄 Navegando para página ${pageNumber}`);
        } else {
            console.warn(`📄 Página ${pageNumber} inválida. Páginas disponíveis: 1-${this.totalPages}`);
        }
    }

    /**
     * Obter informações da paginação atual
     * @public
     * @returns {Object} Informações de paginação
     */
    getPaginationInfo() {
        return {
            currentPage: this.currentPage,
            totalPages: this.totalPages,
            itemsPerPage: this.itemsPerPage,
            totalItems: this.totalItems,
            startIndex: (this.currentPage - 1) * this.itemsPerPage,
            endIndex: Math.min(this.currentPage * this.itemsPerPage, this.totalItems)
        };
    }
}

// Expor a classe globalmente
window.PaginationManager = PaginationManager;