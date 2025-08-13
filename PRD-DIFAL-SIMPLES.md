# PRD - Sistema DIFAL Simples

## 1. Visão Geral

Sistema web para cálculo automatizado de DIFAL (Diferencial de Alíquota do ICMS) a partir da importação de arquivos SPED, utilizando tecnologias web nativas (HTML, CSS, JavaScript) sem frameworks complexos.

## 2. Objetivos

- **Simplicidade**: HTML puro, CSS modular, JavaScript vanilla
- **Funcionalidade**: Importar SPED, extrair itens DIFAL, calcular impostos
- **Performance**: Processamento local no navegador
- **Confiabilidade**: Dados reais, sem simulações

## 3. Arquitetura Técnica

### 3.1 Stack Tecnológico
- **Frontend**: HTML5, CSS3 (módulos), JavaScript ES6+
- **Processamento**: JavaScript vanilla para parsing SPED
- **Design**: CSS Grid/Flexbox, variáveis CSS customizadas
- **Dados**: LocalStorage para persistência temporária

### 3.2 Estrutura de Arquivos
```
difal-system/
├── index.html              # Página principal
├── css/
│   ├── main.css            # Estilos principais
│   ├── components.css      # Componentes reutilizáveis  
│   └── expertzy-theme.css  # Tema Expertzy
├── js/
│   ├── app.js              # Aplicação principal
│   ├── sped-parser.js      # Parser SPED
│   ├── difal-calculator.js # Calculadora DIFAL
│   └── utils.js            # Utilitários
├── data/
│   └── estados.js          # Dados dos estados brasileiros
└── assets/
    └── logo-expertzy.svg   # Logo da empresa
```

## 4. Funcionalidades Principais

### 4.1 Upload e Processamento SPED
- Drag & drop de arquivos .txt
- Detecção automática de encoding (UTF-8, ISO-8859-1)
- Extração de registros C100 (notas) e C170 (itens)
- Filtro por CFOPs DIFAL: 1551, 1556, 2551, 2556, 1406, 1407, 2406, 2407

### 4.2 Cálculo DIFAL
- **Base Única**: Estados que não adotaram EC 87/2015
- **Base Dupla**: Estados que adotaram EC 87/2015  
- Cálculo automático de FCP (Fundo de Combate à Pobreza)
- Detalhamento passo-a-passo dos cálculos

### 4.3 Relatórios
- Resumo executivo por arquivo SPED
- Detalhamento por item com memória de cálculo
- Exportação para PDF (usando jsPDF)
- Consolidação multi-arquivos

### 4.4 Interface do Usuário
- **Página Inicial**: Upload de arquivos
- **Dashboard**: Resumo consolidado  
- **Cálculos**: Detalhamento por item
- **Relatórios**: Exportação e visualização

## 5. Dados e Configurações

### 5.1 Estados Brasileiros
```javascript
const ESTADOS = [
  { uf: 'AC', nome: 'Acre', aliqInterna: 17, fcp: 2, metodologia: 'base-unica' },
  { uf: 'AL', nome: 'Alagoas', aliqInterna: 18, fcp: 2, metodologia: 'base-dupla' },
  // ... todos os 27 estados
];
```

### 5.2 CFOPs DIFAL
```javascript
const CFOPS_DIFAL = {
  'uso-consumo': ['1556', '2556', '1407', '2407'],
  'ativo-imobilizado': ['1551', '2551', '1406', '2406']
};
```

## 6. Processamento SPED

### 6.1 Estrutura de Dados
```javascript
const spedData = {
  arquivo: 'nome-arquivo.txt',
  empresa: 'RAZAO SOCIAL LTDA',
  periodo: '04/2025',
  cnpj: '12.345.678/0001-90',
  notas: [], // Array de NotaFiscal
  itens: [], // Array de ItemDIFAL
  stats: {
    totalNotas: 0,
    totalItens: 0,
    valorTotal: 0
  }
};
```

### 6.2 Parser SPED
- Leitura linha por linha
- Identificação de registros por tipo
- Extração de campos específicos
- Validação de dados obrigatórios

## 7. Cálculo DIFAL

### 7.1 Fórmulas Base Única
```
DIFAL = (Base × AliqDestino) - (Base × AliqOrigem)
FCP = Base × AliqFCP
```

### 7.2 Fórmulas Base Dupla  
```
DIFAL = Base × ((AliqDestino - AliqInterestadual) × %Destinatario/100)
FCP = Base × AliqFCP × (%Destinatario/100)  
```

## 8. Design System Expertzy

### 8.1 Cores
```css
:root {
  --expertzy-red: #FF1744;
  --expertzy-pink: #E91E63;
  --expertzy-dark: #1a1a1a;
  --expertzy-gray: #6b7280;
  --expertzy-light: #f9fafb;
}
```

### 8.2 Tipografia
```css
:root {
  --font-primary: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

## 9. Validação e Testes

### 9.1 Arquivo de Teste
- **Arquivo**: `13158698000110-106379704-20250401-20250430-1-03D99627A94945C9AF64C38A3A038FCC8EF950DF-SPED-EFD.txt`
- **Empresa**: THE FIBER PROVEDORA DE INTERNET LTDA
- **CFOPs Esperados**: 1556, 2556, 2551

### 9.2 Critérios de Sucesso
- [ ] Upload do arquivo SPED sem erros
- [ ] Extração correta de notas fiscais
- [ ] Filtro preciso dos itens DIFAL
- [ ] Cálculo matemático correto
- [ ] Geração de relatório em PDF
- [ ] Interface responsiva funcionando

## 10. Entregáveis

1. **Sistema Funcional**: Aplicação web completa
2. **Documentação**: Manual de uso e código
3. **Testes**: Validação com arquivo real
4. **Deploy**: Sistema pronto para produção

## 11. Cronograma de Implementação

1. **Fase 1**: Estrutura HTML e CSS base
2. **Fase 2**: Parser SPED JavaScript  
3. **Fase 3**: Calculadora DIFAL
4. **Fase 4**: Interface de usuário
5. **Fase 5**: Relatórios e exportação
6. **Fase 6**: Testes e validação

---

**Objetivo**: Sistema DIFAL simples, funcional e confiável usando tecnologias web nativas.