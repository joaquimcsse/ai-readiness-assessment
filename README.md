## **Framework para autoavaliação de prontidão para a adoção de ferramentas e processos baseados em IA por pequenas e média empresas (PMEs)**

## Explicitação da metodologia utilizada

### Dimensões
##### Nos baseamos em 6 dimensões para definir claramente os diferentes aspectos de pequenas e médias empresas que determinam sua prontidão para a adoção de ferramentas baseadas em IA. Essas dimensões norteiram o cálculo da avaliação. São elas:
- Capacidade digital básica - considerada fundamental.
- Dados - disponibilidade e qualidade de dados.
- Estratégia e processos - Clareza, perspectivas e capacidades. 
- Pessoas e cultura - Letramento em IA, atribuição de responsábilidades bem definida e abertura à mudanças. Nota: a literatura identifica uma lacuna crônica entre percepção positiva e capacitação real! 
- Governança ética e responsábilidade - Políticas de uso, supervisão humana e conformidade com a legislação. 
- Ecossistema e ambiente - Percepção de pressão competitiva, exigências de clientes/parceiros e disponibilidade de fornecedores (prontidão isolada não é suficiente).
#### Dimensões críticas
- Vale destacar que, neste modelo, as dimensões "Capacidade digital básica", "Pessoas e cultura", "Governança, ética e conformidade" e "Ecossistema e ambiente" foram selêcionadas como críticas e portanto recebem um peso maior no calculo da pontuação. O presente projeto foca em lacunas específicas obeservadas durante a revisão da literatura. Por isso, selecionamos os aspectos de PMEs nos quais optamos por direcionar nosso foco e, portanto, montamos o sistema de pesos dessa maneira.

### O Formulário
- 30 questões ordinais.
- 5 alternativas para cada uma das seis dimensões descritas acima. 

### Mecânismo de pontuação

- Para cada questão existem 5 alternativas ordinais: as escolhas do usuário são normalizadas e assumem um valor entre 0 e 100. 
- Um valor fixo discreto fixo é utilizado para garantir que as dimensões consideradas críticas terão sempre maior peso no resultado final.
- O cálculo está implementado no código em /src/score.ts
