<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Como extrair NCM's das notas fiscais de entrada para uso e consumo e imobilizado do SPED EFD ICMS-IPI (Lista Completa)

Você está correto sobre os CFOP's 1406 e 1407 serem específicos para substituição tributária. Vou apresentar a **lista completa** dos CFOP's para extração adequada dos bens de uso e consumo e ativo imobilizado.

## CFOP's Completos para Bens de Ativo Imobilizado

### **Dentro do Estado (1xxx):**

- **1551**: Compra de bem para o ativo imobilizado[^1][^2][^3]
- **1552**: Transferência de bem do ativo imobilizado[^3][^4]
- **1553**: Devolução de venda de bem do ativo imobilizado[^2][^3]
- **1554**: Retorno de bem do ativo imobilizado remetido para uso fora do estabelecimento[^2][^3]
- **1555**: Entrada de bem do ativo imobilizado de terceiro, remetido para uso no estabelecimento[^3][^2]


### **Outros Estados (2xxx):**

- **2551**: Compra de bem para o ativo imobilizado[^5][^6][^3]
- **2552**: Transferência de bem do ativo imobilizado[^6][^3]
- **2553**: Devolução de venda de bem do ativo imobilizado[^6][^3]
- **2554**: Retorno de bem do ativo imobilizado remetido para uso fora do estabelecimento[^6][^3]
- **2555**: Entrada de bem do ativo imobilizado de terceiro, remetido para uso no estabelecimento[^3][^6]


### **Exterior (3xxx):**

- **3551**: Compra de bem para o ativo imobilizado[^7][^8][^3]
- **3553**: Devolução de venda de bem do ativo imobilizado[^7][^3]


### **Substituição Tributária:**

- **1406**: Compra de bem para o ativo imobilizado sujeito ao regime de ST (dentro do estado)[^9][^10][^1]
- **2406**: Compra de bem para o ativo imobilizado sujeito ao regime de ST (outros estados)[^6]


## CFOP's Completos para Bens de Uso e Consumo

### **Dentro do Estado (1xxx):**

- **1556**: Compra de material para uso ou consumo[^11][^1][^2]
- **1557**: Transferência de material para uso ou consumo[^2][^3]


### **Outros Estados (2xxx):**

- **2556**: Compra de material para uso ou consumo[^12][^11][^6]
- **2557**: Transferência de material para uso ou consumo[^3][^6]


### **Exterior (3xxx):**

- **3556**: Compra de material para uso ou consumo[^13][^14][^15]


### **Substituição Tributária:**

- **1407**: Compra de mercadoria para uso ou consumo sujeita ao regime de ST (dentro do estado)[^1][^9]
- **2407**: Compra de mercadoria para uso ou consumo sujeita ao regime de ST (outros estados)[^6]


## Lista Consolidada dos CFOP's

Para filtrar corretamente no SPED, use estes **21 códigos CFOP**:

**1406, 1407, 1551, 1552, 1553, 1554, 1555, 1556, 1557, 2406, 2407, 2551, 2552, 2553, 2554, 2555, 2556, 2557, 3551, 3553, 3556**

## Observações Importantes sobre DIFAL

Como você mencionou corretamente:

**CFOP's com Substituição Tributária (SEM DIFAL):**

- 1406 e 2406: Ativo imobilizado sujeito à ST
- 1407 e 2407: Uso e consumo sujeito à ST

Quando há substituição tributária, **não há incidência de DIFAL**, pois o imposto já foi recolhido antecipadamente pelo substituto tributário.[^16][^17]

**CFOP's com possível DIFAL:**

- Todos os códigos **2xxx** (outros estados) **exceto** 2406 e 2407
- Aplica-se quando: alíquota interna do estado de destino > alíquota interestadual[^18][^16]


## Processo de Extração Atualizado

1. **Filtre pelas notas de entrada** no registro C100 onde IND_OPER = 0
2. **Use TODOS os 21 CFOP's listados** no registro C170
3. **Cruze com registro 0200** para obter o NCM
4. **Considere o DIFAL** apenas para CFOP's 2xxx (exceto 2406 e 2407)

Esta lista completa garante que você capture **todas** as operações de entrada de bens destinados ao ativo imobilizado e uso/consumo, incluindo transferências, devoluções, importações e operações com substituição tributária.

<div style="text-align: center">⁂</div>

[^1]: https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=v5+r0ZIuBKk%3D

[^2]: https://www.contadores.cnt.br/cfop/1550-operacoes-com-bens-de-ativo-imobilizado-e-materiais-para-uso-ou-consumo.html

[^3]: https://professor.pucgoias.edu.br/sitedocente/admin/arquivosUpload/17474/material/TABELAS EPC2.xlsx

[^4]: https://www.contabilidadeoc.com.br/cfop

[^5]: https://taxpratico.com.br/cfop/2550

[^6]: https://idealsoftwares.com.br/notas/tabela_cfop.pdf

[^7]: https://www.fazcomex.com.br/npi/cfop-na-importacao/

[^8]: https://taxpratico.com.br/cfop/3551/2

[^9]: https://www.sefaz.pe.gov.br/legislacao/tributaria/documents/legislacao/tabelas/cfop.htm

[^10]: https://taxpratico.com.br/cfop/1406/5

[^11]: https://webmaissistemas.com.br/blog/cfop-1556/

[^12]: https://app1.sefaz.mt.gov.br/sistema/legislacao/respostaconsulta.nsf/766feae0478e62780325673c0049468e/e75ddf233e9c77ad042589eb006af4c0?OpenDocument\&Highlight=0%2CUNERC

[^13]: https://www.contadores.cnt.br/cfop/3556-compra-de-material-para-uso-ou-consumo.html

[^14]: https://taxpratico.com.br/cfop/3556/2

[^15]: https://tabelas.maino.com.br/cfop/3556-compra-de-material-para-uso-ou-consumo

[^16]: https://www.portaltributario.com.br/artigos/diferencialaliquotasicms.htm

[^17]: https://www.contabeis.com.br/forum/tributos-estaduais-municipais/173000/difal-diferencial-de-aliquotas-para-venda-a-consumidor-final/31

[^18]: https://suporte.dominioatendimento.com/central/faces/solucao.html?codigo=1648

[^19]: https://webmaissistemas.com.br/blog/cfop-1949/

[^20]: https://www.h2asol.com.br/cfop-credito-piscofins/

[^21]: https://taxpratico.com.br/cfop/1949/4

[^22]: https://www.contadores.cnt.br/cfop/1401-compra-para-industrializacao-em-operacao-com-mercadoria-sujeita-ao-regime-de-substituicao-tributaria.html

[^23]: https://www.contabilizei.com.br/contabilidade-online/tabela-cfop-completa/

[^24]: https://www.lefisc.com.br/perguntasRespostas/resposta/13851

[^25]: https://www.contabeis.com.br/forum/tributos-estaduais-municipais/186377/escrituracao-das-entradas-de-produtos-e-cfop-de-entrada/

[^26]: https://guiatributario.net/cfop-5-550/

[^27]: https://www.contabilizei.com.br/contabilidade-online/difal-icms-aliquota/

[^28]: https://www.contadores.cnt.br/cfop/1403-compra-para-comercializacao-em-operacao-com-mercadoria-sujeita-ao-regime-de-substituicao-tributaria.html

[^29]: https://focusnfe.com.br/blog/cfop-de-entrada/

[^30]: https://www.contadores.cnt.br/cfop/3550-operacoes-com-bens-de-ativo-imobilizado-e-materiais-para-uso-ou-consumo.html

[^31]: https://www.contadores.cnt.br/cfop/5550-operacoes-com-bens-de-ativo-imobilizado-e-materiais-para-uso-ou-consumo.html

[^32]: https://codigocfop.com.br/categorias/1550-operacoes-com-bens-do-ativo-imobilizado-e-materiais-para-uso-ou-consumo/

[^33]: https://www.contadores.cnt.br/cfop/3551-compra-de-bem-para-o-ativo-imobilizado.html

[^34]: https://www.gov.br/siscomex/pt-br/informacoes/tratamento-administrativos/tratamento-administrativo-de-exportacao-1/cfop.xlsx

[^35]: https://www.contadorperito.com/html/cfop.htm

[^36]: https://taxpratico.com.br/cfop/1550/5

[^37]: https://codigocfop.com.br/categorias/3550-operacoes-com-bens-do-ativo-imobilizado-e-materiais-para-uso-ou-consumo/

