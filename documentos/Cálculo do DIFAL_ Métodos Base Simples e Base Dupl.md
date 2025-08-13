<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Cálculo do DIFAL: Métodos Base Simples e Base Dupla

O **Diferencial de Alíquota do ICMS (DIFAL)** é um mecanismo tributário que equilibra a arrecadação entre estados quando há operações interestaduais. Para o item de **R\$ 2.362,00** na operação São Paulo → Goiás, apresento os cálculos detalhados considerando os dois métodos principais.[^1][^2]

### Situação 1: Sem Redução da Base de Cálculo

**Alíquotas:**

- Origem (São Paulo): 7%
- Destino (Goiás): 19%


#### Método Base Simples (Base Única)

O método base simples utiliza uma única base de cálculo para ambos os impostos.[^1][^3]

**Fórmula:** DIFAL = Valor da Operação × (Alíquota Destino - Alíquota Origem)

- Valor da operação: R\$ 2.362,00
- ICMS Origem (7%): R\$ 165,34
- ICMS Destino (19%): R\$ 448,78
- **DIFAL = R\$ 283,44**


#### Método Base Dupla

O método base dupla utiliza duas bases de cálculo diferentes, sendo mais complexo mas também mais oneroso.[^2][^1]

**Passo a passo:**

1. **ICMS Interestadual:** R\$ 2.362,00 × 7% = **R\$ 165,34**
2. **Base de Cálculo 1 (exclusão do ICMS):** R\$ 2.362,00 - R\$ 165,34 = **R\$ 2.196,66**
3. **Base de Cálculo 2 (inclusão por dentro):** R\$ 2.196,66 ÷ (1 - 0,19) = **R\$ 2.711,93**
4. **ICMS Interno:** R\$ 2.711,93 × 19% = **R\$ 515,27**
5. **DIFAL:** R\$ 515,27 - R\$ 165,34 = **R\$ 349,93**

### Situação 2: Com Redução da Base de Cálculo para 10%

Quando há redução da base de cálculo, a carga tributária final deve ser de 10% ao invés dos 19% originais.[^2][^4]

**Cálculo da redução:**

- Percentual da base após redução: 10% ÷ 19% = 52,63%
- Redução da base de cálculo: 47,37%


#### Método Base Simples com Redução

- Base reduzida: R\$ 2.362,00 × 0,5263 = **R\$ 1.243,16**
- ICMS Destino sobre base reduzida: R\$ 1.243,16 × 19% = **R\$ 236,20**
- ICMS Origem: **R\$ 165,34**
- **DIFAL = R\$ 70,86**


#### Método Base Dupla com Redução

Seguindo os mesmos passos iniciais da base dupla:

1. Base de Cálculo 2: **R\$ 2.711,93**
2. **Base Reduzida:** R\$ 2.711,93 × 0,5263 = **R\$ 1.427,33**
3. **ICMS Interno:** R\$ 1.427,33 × 19% = **R\$ 271,19**
4. **DIFAL:** R\$ 271,19 - R\$ 165,34 = **R\$ 105,85**

### Resumo Comparativo

![Comparação dos valores de DIFAL calculados pelos métodos de base simples e base dupla, com e sem redução da base de cálculo](https://ppl-ai-code-interpreter-files.s3.amazonaws.com/web/direct-files/d708e09401d8a4d93bdac26b3329e0cb/5d3abda4-c10e-4780-98dd-05d04e114c92/daa719ca.png)

Comparação dos valores de DIFAL calculados pelos métodos de base simples e base dupla, com e sem redução da base de cálculo

**Situação 1 - Sem redução:**

- Base Simples: **R\$ 283,44**
- Base Dupla: **R\$ 349,93**
- Diferença: R\$ 66,49

**Situação 2 - Com redução para 10%:**

- Base Simples: **R\$ 70,86**
- Base Dupla: **R\$ 105,85**
- Diferença: R\$ 34,99


### Considerações Importantes

**Diferenças entre os métodos:**

- O método **base dupla** resulta sempre em valor **mais alto** de DIFAL[^1][^2]
- O **base simples** é mais direto e utiliza apenas uma base de cálculo[^3][^5]
- Goiás adota o método **base dupla** para contribuintes do ICMS[^2][^5]

**Redução da base de cálculo:**

- A redução beneficia significativamente o contribuinte, reduzindo o DIFAL em aproximadamente **75%**[^4][^2]
- É aplicada após o cálculo da base de cálculo do DIFAL[^6][^2]
- Deve ser observada a legislação específica de cada benefício fiscal[^7][^6]

O **método base dupla** é mais complexo pois considera que o ICMS compõe sua própria base de cálculo, resultando em maior onerosidade tributária. A **redução da base de cálculo** representa um benefício fiscal significativo, diminuindo substancialmente o valor do DIFAL devido.

<div style="text-align: center">⁂</div>

[^1]: https://tributei.net/blog/como-calcular-o-difal-por-dentro-por-fora/

[^2]: https://appasp.economia.go.gov.br/pareceres/arquivos/Benefício Fiscal/Redução de BC concedida por prazo determinado - Art. 9°/I/P_265_2023_SEI.docx

[^3]: https://ajuda.bling.com.br/hc/pt-br/articles/360039416194-Como-calcular-ICMS-DIFAL-para-não-contribuinte

[^4]: http://www.informef.com.br/paginas/mef36968.htm

[^5]: https://ajuda.calimaerp.com/pt/article/estados-que-possuem-calculo-difal-com-base-dupla-ou-base-simples-qfw4s2/

[^6]: https://app1.sefaz.mt.gov.br/sistema/legislacao/respostaconsulta.nsf/5540d90afcacd4f204257057004b655c/2ecfea84e4c50b4a03258c2e0062fdde?OpenDocument

[^7]: https://goias.gov.br/economia/esclarecimento-sobre-difal-2/

[^8]: https://facil123.com.br/blog/difal-diferencial-de-aliquota-icms/

[^9]: https://www.legisweb.com.br/legislacao/?id=462441

[^10]: https://www.contabilizei.com.br/contabilidade-online/difal-icms-aliquota/

[^11]: https://blog.synchro.com.br/base-de-calculo-do-difal-st/

[^12]: https://flux-it.com.br/icms-difal-2025/

[^13]: https://portalservicos.sefaz.ce.gov.br/norma-de-execucao-n-01-2024-calculo-do-difal+66fc7ca6f546dd472e7ed727

[^14]: https://www.econeteditora.com.br/boletim_icms/bo-icms-pa/pa-10/boletim21/icms_pa_diferencial_aliquotas.php

[^15]: https://simtax.com.br/fundo-combate-pobreza-fcp/

[^16]: https://noticias.iob.com.br/difal-do-icms-sp-adota-base-dupla-para-contribuinte/

[^17]: https://www.youtube.com/watch?v=t825VCs_JyI

[^18]: https://www.taxgroup.com.br/intelligence/tabela-icms-atualizada/

[^19]: https://www.youtube.com/watch?v=TKtY1EfQ79k

[^20]: https://legislacao.fazenda.sp.gov.br/Paginas/RC25889_2022.aspx

