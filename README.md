# 🍇 Crônicas & Linhagens — Sistema de Árvore Genealógica de Fantasia

Aplicação web leve, sem dependências externas (HTML5 + CSS3 + JavaScript ES6 puro), projetada sob medida para construção de mundos de fantasia, árvores genealógicas em formato de **cachos de uva**, leis de sucessão real, grimório de criações e rascunho de mapa interativo.

## 🚀 Como Usar e Hospedar
- **Uso Local Imediato:** Basta abrir o arquivo `index.html` em qualquer navegador moderno (Chrome, Edge, Firefox, Safari). Todos os dados ficam salvos automaticamente no navegador (`localStorage`) e podem ser exportados/importados em `.json`.
- **Hospedagem Gratuita e Leve:** Por ser construído em HTML/CSS/JS puro e modular, pode ser hospedado gratuitamente arrastando a pasta para **Netlify Drop**, **GitHub Pages** ou **Vercel**, sem necessidade de servidor de banco de dados ou compilação.

## ✨ Funcionalidades Implementadas
1. **Árvore Genealógica em "Cachos de Uva" (De Cima para Baixo)**:
   - Cada personagem é uma esfera com botão **`📜 Perfil`** dentro do círculo (exibindo História, Aparência, Como Morreu e Onde Viveu) e, embaixo da esfera, seu **Nome** e **Data de Nascimento e Falecimento**.
   - **Linhas Vermelhas:** Ligações de sangue (pais, filhos, irmãos, gêmeos e tios).
   - **Linhas Azuis:** Casamentos (marido e mulher).
   - **Linhas Azul e Ouro:** Destaque visual para casamentos entre **Tios e Sobrinhos** (tradição avuncular, como na *Casa Solárius*).
   - **Botão Alternador no Topo (`Linhagem` vs `Território`):** Alterna as cores ao redor das esferas entre a linhagem de sangue natal e o território/casa oficial pós-casamento.
2. **Regras de Casamento e Assimilação da Mulher**:
   - Ao casar-se com um **Lorde, Príncipe ou Rei**, a mulher passa a pertencer oficialmente à Casa do marido (Casa A), unindo a história seguinte a partir do ano do casamento (com opção de marcar **exceções** para eventos que não a envolveram).
   - O histórico anterior de quando pertencia à Casa natal (Casa X) fica preservado e aparece na aba **"História"** dentro de seu perfil.
   - Casamentos entre **civis e guardas** não alteram a casa dinástica.
3. **Bastardos, Criaturas Míticas e Avisos de Inconsistência**:
   - Filhos de nobres/reis com mulheres fora dos padrões nobres (civil, fazendeira, prostituta, etc.) são marcados como **Bastardos** e excluídos da casa e herança — com opção de **Exceção da Autora** que mantém o aviso permanente de *Lembrança de Bastardo*.
   - Criaturas míticas (bruxos, elfos, sereias, caçadores) e inconsistências cronológicas/consanguíneas disparam um **Aviso de Inconsistência** explicando onde está a interferência, por que não seria permitido e oferecendo o campo para registrar a justificativa da autora.
4. **Sucessão Real e Regência**:
   - Prioridade dos **irmãos do rei** (ao assumirem, sua esposa e filhos tornam-se a Família Real ativa e novos herdeiros, e a família do rei falecido passa a ser familiares da família real).
   - O príncipe primogênito só herda aos **18 anos**; caso não haja irmãos do rei e o príncipe seja menor de 18 anos, a **Rainha (esposa do rei)** governa como **Rainha Regente** até a maioridade.
   - A **princesa** só herda na ausência total de sucessores homens (irmãos do rei ou príncipes).
5. **Verificação de Exclusão, Campo Vazio, Reversão de Esposas e Histórico Separado (`Linhagem`, `Casa`, `Território`)**:
   - Excluir apenas o personagem mantém um **Campo Vazio** na árvore sem apagar filhos ou irmãos.
   - Excluir toda a árvore seguinte exige dupla confirmação, faz as esposas retomarem sua **Casa de Nascimento** (registrando no perfil que estiveram ligadas a uma linhagem excluída) e grava tudo no **Histórico de Alterações** com botão de **Reversão**.
6. **Grimório (`Magias, Poções, Encantamentos e Criações`) & Rascunho do Mapa Interativo**:
   - Aba dedicada para cadastrar magias, poções, encantamentos e novas categorias livres.
   - Estúdio de rascunho de mapa onde é possível desenhar continentes/rios/montanhas e clicar no nome de cada **Cidade/Província** para ver quem viveu ali e quem passou por ali deixando uma marca (histórica ou não).
