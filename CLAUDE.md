# Sistema DIFAL - Documentação Técnica

## Correção do Cálculo de Alíquota Efetiva por CST

### Problema Identificado
O sistema estava calculando incorretamente a alíquota de origem para itens com CST que envolvem redução de base de cálculo (CST 20/70), resultando em valores de DIFAL incorretos.

### Solução Implementada
Implementação de cálculo de alíquota efetiva baseado no CST (Código de Situação Tributária) conforme documento oficial CST-CSOSN.pdf.

### Mapeamento CST → Cálculo de Alíquota

#### CST 00/90 - Tributação Normal/Outras
- **Método**: Usar alíquota nominal (ALIQ_ICMS)
- **Fórmula**: `aliqOrigem = ALIQ_ICMS`

#### CST 10/30/60 - Substituição Tributária
- **Método**: Alíquota zero (ST substitui o recolhimento)
- **Fórmula**: `aliqOrigem = 0`

#### CST 20/70 - Com Redução de Base de Cálculo
- **Método**: Calcular alíquota efetiva baseada nos valores reais
- **Fórmula**: `aliqOrigem = (VL_ICMS / VL_ITEM) × 100`
- **Exemplo**: VL_ITEM: R$ 1.000, VL_ICMS: R$ 90 → aliqOrigem = 9%

#### CST 40/41/50/51 - Isento/Suspenso/Diferido
- **Método**: Alíquota zero
- **Fórmula**: `aliqOrigem = 0`

### Implementação Técnica

#### Localização: `difal-system/js/calculation/difal-calculator.js`

```javascript
/**
 * Calcula alíquota efetiva baseada no CST
 */
calcularAliquotaEfetiva(cst, vlItem, vlIcms, aliqNominal) {
    // Validações de segurança
    if (!cst || vlItem <= 0) return 0;
    
    // Normalizar CST (remover origem)
    const cstNormalizado = cst.toString().slice(-2);
    
    switch (cstNormalizado) {
        case '00': case '90': 
            return aliqNominal;  // Tributação normal
            
        case '10': case '30': case '60': 
            return 0;  // Substituição tributária
            
        case '20': case '70': 
            return vlIcms > 0 ? (vlIcms / vlItem) * 100 : 0;  // Alíquota efetiva
            
        case '40': case '41': case '50': case '51': 
            return 0;  // Isento/suspenso
            
        default: 
            return aliqNominal;  // Fallback
    }
}
```

#### Integração no Fluxo de Cálculo
A função é chamada automaticamente pelo método `obterAliquotaOrigem()` durante o processamento dos itens DIFAL.

### Campos SPED Utilizados
- **CST_ICMS** (posição 9): Código de Situação Tributária
- **VL_ITEM** (posição 6): Valor do item
- **VL_ICMS** (posição 14): Valor do ICMS pago
- **ALIQ_ICMS** (posição 13): Alíquota nominal

### Validações Implementadas
- VL_ITEM deve ser maior que zero
- CST deve estar presente
- VL_ICMS é tratado como 0 se não informado
- CSTs não mapeados usam alíquota nominal como fallback

### Logs de Auditoria
O sistema registra todos os cálculos realizados:
```
🎯 Item PROD001: CST 20 → Alíquota efetiva 9%
📊 CST 20: Alíquota efetiva calculada 9.00% (VL_ICMS: 90 / VL_ITEM: 1000)
```

### Casos de Teste Validados
- ✅ CST 00: Alíquota nominal preservada (12% → 12%)
- ✅ CST 20: Alíquota efetiva calculada (90/1000 = 9%)
- ✅ CST 40: Alíquota zero aplicada (0%)
- ✅ CST 70: Redução BC + ST calculada corretamente

### Referências
- **Documento Oficial**: `documentos/CST-CSOSN.pdf`
- **Layout SPED**: Registro C170 (Itens de Documentos Fiscais)
- **Conversa de Implementação**: `ultima.rtf` (linhas 1600-1673)