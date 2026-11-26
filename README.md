# 🍇 Crônicas & Linhagens — Sistema de Árvore Genealógica de Fantasia

Aplicação web completa e responsiva para construção de mundos de fantasia, árvores genealógicas em formato de **cachos de uva**, cronologia histórica expansiva, leis de sucessão real, grimório de criações e cartografia com modelagem de continentes.

Todos os dados são persistidos diretamente no **MongoDB Atlas** através de uma camada de API moderna em **Node.js / Express**, com baixíssimo consumo de memória (ideal para o plano gratuito do Render).

---

## 🗄️ Arquitetura de Banco de Dados & Backend Node.js

- **Banco de Dados:** MongoDB Atlas
  - **Cluster:** `familytree.lhbb3e2.mongodb.net`
  - **Database:** `familytree`
  - **Coleções (Compatíveis com Multi-Usuário):**
    - `users`: Contas de acesso individuais (`name`, `email` único, `passwordHash` com Scrypt, `mustChangePassword` e controle de sessão).
    - `world_state`: Estado consolidado de cada história vinculado ao `ownerId` do usuário.
    - `worlds_index`: Catálogo e estatísticas das histórias de cada usuário (`ownerId`).
    - `worlds`, `characters`, `houses`, `territories`, `settlements`, `timeline_events`, `creations`: Coleções individuais estruturadas com isolamento por `owner_id` e `world_id`.
- **Backend / Camada de Servidor:** Node.js v18+ com Express e o driver oficial `mongodb`
  - `server.js`: Servidor unificado que entrega tanto os arquivos estáticos (HTML/CSS/JS) quanto os endpoints da API REST `/api` (com alias `/api.php` para retrocompatibilidade).
  - `package.json`: Dependências leves (`express`, `mongodb`, `cors`, `dotenv`).
  - `.env`: Configuração das variáveis de ambiente (`MONGODB_URI` e `PORT`).


### Passo 1: Enviar as alterações para o GitHub
No terminal do seu projeto:
```bash
git add .
git commit -m "feat: migracao da API para Node.js e MongoDB Atlas"
git push origin main
```

### Passo 2: Criar o Web Service no Render
1. Acesse **[dashboard.render.com](https://dashboard.render.com)** e faça login com seu GitHub.
2. Clique no botão azul **`New +`** no topo e selecione **`Web Service`**.
3. Escolha a opção **`Build and deploy from a Git repository`** e clique em **Next**.
4. Conecte sua conta do GitHub e selecione o repositório **`familyTree`**.

### Passo 3: Configurar o Serviço no Render
- **Name:** `familytree` (ou o nome que preferir para a sua URL)
- **Region:** `Oregon (US West)` ou a mais próxima de você
- **Branch:** `main`
- **Runtime:** `Node` (ou `Docker`)
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Instance Type:** Selecione **`Free`** ($0/mês).

### Passo 4: Variável de Ambiente
Em **Environment Variables**, adicione:
- **Key:** `MONGODB_URI`
- **Value:** `mongodb+srv://kauarsamtos0_db_user:vM8h0GYWkFoy4H6L@familytree.lhbb3e2.mongodb.net/familytree?retryWrites=true&w=majority`

### Passo 5: Criar e Publicar
Clique no botão **`Deploy Web Service`**.

Pronto! Seu site e sua API em Node.js estarão 100% online conectados diretamente ao seu cluster MongoDB Atlas.

---

## 🚀 Como Executar o Projeto Localmente

### Opção 1: Inicialização em 1 Clique (Recomendado no Windows)
Dê um duplo clique no arquivo **`start-server.bat`** (ou execute no PowerShell via `./start-server.ps1`).

O script irá:
1. Detectar o Node.js.
2. Iniciar o servidor em `http://localhost:8000`.
3. Abrir o seu navegador padrão automaticamente conectado ao MongoDB Atlas.

### Opção 2: Linha de Comando Manual
```bash
npm install
npm start
```
Depois, acesse `http://localhost:8000` no seu navegador.

---

## ✨ Funcionalidades Principais

1. **Árvore Genealógica em Cachos de Uva:**
   - Visualização de linhagens reais, laços de sangue (vermelho), casamentos (azul) e casamentos avunculares tio-sobrinho (dourado e azul).
   - Alternador dinâmico de cores: Linhagem de Sangue vs Feudo/Casa Oficial.
2. **Sucessão Real e Regência Dinástica:**
   - Regras de primogenitura e prioridade fraterna (irmãos do rei).
   - Regência da rainha até a maioridade do príncipe aos 18 anos.
3. **Casamento e Assimilação:**
   - Mulheres assimiladas à casa do nobre com histórico natal preservado.
4. **Bastardos & Criaturas Míticas:**
   - Avisos de inconsistência genealógica ou biológica com justificativa da autora.
5. **Grimório Arcano:**
   - Registro de magias, poções, encantamentos e relíquias vinculados a personagens e feudos.
6. **Cartografia Interativa:**
   - Modelagem de continentes, cálculo de pontos de borda, adição de cidades e capitais.
7. **Sincronização em Tempo Real:**
   - Indicador visual no topo da tela (`MongoDB Atlas`), sincronização automática em background e suporte a modo offline via `localStorage`.
