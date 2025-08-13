# **Análise dos Módulos Existentes**

    🔍 **Módulos Identificados para Reutilização:**

    **1. Parser SPED Base** (/sped/script.js - 1.224 linhas):

    - detectAndRead() - detecção automática UTF-8/ISO-8859-1 

    - lerArquivoSpedCompleto() - parser completo SPED

    - isLinhaValida() - validação linha SPED

    - extrairInformacoesHeader() - extração empresa/período

    - obterLayoutRegistro() - layouts 15+ registros SPED

    - Sistema drag & drop completo

    - Sistema logging avançado

    - UI feedback (progress, status)

    **2. Parser C170 Especializado** (/sped/C170/script.js - 1.555 linhas):

    - criarCatalogoProdutos() - indexa registros 0200 (produtos)

    - processarC170() - vincula C170 com NCM do catálogo 0200

    - criarAbaAnaliseC170NCM() - análise C170+NCM para Excel

    - Tratamento robusto de índices SPED

    - Funcionalidades específicas para extração produtos

    **3. Sistema DIFAL Base** (/sistema-difal-expertzy.html):

    - Interface completa com tabs

    - Calculadora DIFAL implementada

    - Formatação monetária brasileira

    - Design Expertzy (gradiente red/pink)

    **🏗️ Arquitetura Proposta**

    /difal-system/

    ├── index.html              # Landing page + sistema integrado

    ├── css/

    │   ├── main.css            # Estilos base

    │   ├── components.css      # Componentes UI

    │   └── expertzy-theme.css  # Tema Expertzy

    ├── js/

    │   ├── app.js              # Orquestrador principal

    │   ├── sped-parser.js      # Parser SPED (do /sped/script.js)

    │   ├── c170-analyzer.js    # Extração C170 (do /C170/script.js) 

    │   ├── difal-calculator.js # Motor cálculo DIFAL

    │   ├── ui-manager.js       # Gerenciamento interface

    │   └── utils.js            # Utilitários gerais

    └── data/

        └── estados-brasil.js   # Configuração 27 estados

    **🚀 Plano de Implementação**

    **Fase 1: Estrutura Base (30min)**

    1. **Criar estrutura modular** baseada no PRD

    2. **Extrair tema Expertzy** do sistema atual

    3. **Setup ambiente** para testes Firefox/Playwright

    **Fase 2: Extração Parser SPED (45min)**

    4. **Modularizar** **/sped/script.js**:

      - Extrair funções core: detectAndRead, lerArquivoSpedCompleto, isLinhaValida

      - Manter sistema drag & drop

      - Preservar logging avançado

    5. **Modularizar** **/sped/C170/script.js**:

      - Extrair criarCatalogoProdutos (indexação 0200)  

      - Extrair processarC170 (vinculação C170+NCM)

      - Adaptar para foco DIFAL (CFOPs específicos)

    **Fase 3: Motor DIFAL (60min)**

    6. **Filtrar registros DIFAL** dos dados SPED:

      - C170 com CFOPs: 1551, 1556, 2551, 2556, 1406, 1407, 2406, 2407

      - Vincular C100 (cabeçalho nota) com C170 (itens)

      - Identificar operações interestaduais

    7. **Implementar calculadora DIFAL**:

      - Base única vs Base dupla por estado

      - Cálculo FCP automático

      - Detecção origem/destino UF

      - Memória de cálculo detalhada

    **Fase 4: Interface Integrada (75min)**

    8. **Adaptar UI existente**:

      - Manter design do /sistema-difal-expertzy.html

      - Integrar drag & drop do parser SPED

      - Fluxo: Upload → Parse → Filter → Calculate → Export

    9. **Componentes especializados**:

      - Upload com preview SPED

      - Tabela itens DIFAL filtrados  

      - Calculadora interativa

      - Relatórios consolidados

    **Fase 5: Testes & Validação (45min)**

    10. **Configurar Playwright para Firefox**:

      - Testes upload arquivo real: 13158698000110-*-SPED-EFD.txt

      - Validação extração CFOPs corretos

      - Verificação cálculos DIFAL precisos

    **🎯 Funcionalidades Principais**

    **Parser SPED Híbrido:**

    - **Encoding automático** (UTF-8/ISO-8859-1)

    - **Indexação 0200** para produtos/NCM

    - **Extração C170** com vinculação NCM

    - **Filtro DIFAL** por CFOP específicos

    - **Validação robusta** de registros

    **Calculadora DIFAL:**

    - **Base única**: DIFAL = (Base × AliqDestino) - (Base × AliqOrigem)  

    - **Base dupla**: DIFAL = Base × ((AliqDestino - AliqInterestadual) × %Destinatario/100)

    - **FCP automático**: FCP = Base × AliqFCP

    - **27 estados** configurados corretamente

    **Interface Expertzy:**

    - **Design consistente** com gradiente red/pink

    - **Drag & drop** para arquivos SPED

    - **Tabelas interativas** com filtros

    - **Export Excel** com análises detalhadas

    - **Logging em tempo real**

    **🔧 Tecnologias & Compatibilidade**

    **Stack Técnico:**

    - **HTML5/CSS3** puro, sem frameworks

    - **JavaScript ES6+** modular

    - **FileReader API** (compatível Firefox)

    - **XlsxPopulate** para Excel (já integrado)

    **Firefox Otimização:**

    - **Drag & drop** testado especificamente

    - **File processing** com chunks para performance

    - **Encoding detection** robusto

    - **Memory management** otimizado

    **✅ Entregáveis Finais**

    1. **Sistema DIFAL completo** em HTML/CSS/JS vanilla

    2. **Parser SPED híbrido** (base + C170 especializado)  

    3. **Calculadora DIFAL** precisa (base única/dupla)

    4. **Interface Expertzy** responsiva e moderna

    5. **Testes Playwright** automatizados para Firefox

    6. **Validação** com arquivo SPED real fornecido

    **Vantagem-chave**: Reutilizamos **2.779 linhas** de código JavaScript já testado e funcional, garantindo rapidez na implementação e confiabilidade nas funcionalidades core de parsing SPED.
