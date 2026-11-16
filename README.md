# 🍇 Crônicas & Linhagens — Sistema de Árvore Genealógica de Fantasia

Aplicação web completa e responsiva para construção de mundos de fantasia, árvores genealógicas em formato de **cachos de uva**, leis de sucessão real, grimório de criações e rascunho de mapa interativo.

Todos os dados mocados foram removidos para início de trabalho com dados reais, com persistência direta no **MongoDB Atlas** através de uma camada de API em **PHP**.

---

## 🗄️ Arquitetura de Banco de Dados & Backend PHP

- **Banco de Dados:** MongoDB Atlas
  - **Cluster:** `familytree.lhbb3e2.mongodb.net`
  - **Database:** `familytree`
  - **Coleções:**
    - `world_state`: Estado consolidado do mundo para sincronização rápida e atômica.
    - `characters`: Coleção individual de personagens para consultas e relatórios.
    - `houses`: Casas e dinastias cadastradas.
    - `territories`: Províncias, continentes e coordenadas geográficas.
    - `timeline`: Marcos cronológicos e eventos históricos.
    - `creations`: Grimório de magias, poções, artefatos e relíquias.
- **Backend / Camada de Comunicação:** PHP 8.3 com a extensão oficial `ext-mongodb`
  - `config.php`: Credenciais seguras e pooling de conexão com o MongoDB Atlas.
  - `db.php`: Classe de serviço `FamilyTreeDB` com métodos para ping, carga, salvamento e estatísticas.
  - `api.php`: Endpoint REST / JSON com suporte a CORS para comunicação com o frontend.

---

## ☁️ Como Subir no Render (Passo a Passo Completo)

O projeto já inclui um [Dockerfile](file:///c:/projetos/familyTree/Dockerfile) e um [render.yaml](file:///c:/projetos/familyTree/render.yaml) configurados para o Render compilar o **PHP 8.3 + Apache + ext-mongodb** automaticamente.

### Passo 1: Enviar as alterações para o GitHub
No terminal do seu projeto:
```bash
git add .
git commit -m "feat: configuracao para deploy no Render com PHP e MongoDB"
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
- **Runtime:** O Render detectará automaticamente **Docker**.
- **Instance Type:** Selecione **`Free`** ($0/mês).

### Passo 4: Variável de Ambiente (Opcional, pois já está no config.php)
Se desejar reforçar a variável de ambiente:
- Em **Environment Variables**, adicione:
  - **Key:** `MONGODB_URI`
  - **Value:** `mongodb+srv://kauarsamtos0_db_user:vM8h0GYWkFoy4H6L@familytree.lhbb3e2.mongodb.net/familytree?retryWrites=true&w=majority`

### Passo 5: Criar e Publicar
Clique no botão **`Deploy Web Service`**.

O Render irá:
1. Baixar o código do GitHub;
2. Montar a imagem Docker com PHP 8.3 e compilar o driver do MongoDB;
3. Subir o servidor Apache com o frontend e o backend;
4. Gerar sua URL pública gratuita com HTTPS (ex: `https://familytree-xxxx.onrender.com`).

Pronto! Seu site e sua API em PHP estarão 100% online conectados diretamente ao seu MongoDB Atlas.

---

## 🚀 Como Executar o Projeto Localmente

### Opção 1: Inicialização em 1 Clique (Recomendado no Windows)
Dê um duplo clique no arquivo **`start-server.bat`** (ou execute no PowerShell via `./start-server.ps1`).

O script irá:
1. Detectar o interpretador do PHP 8.3 com o driver do MongoDB.
2. Iniciar o servidor web embutido em `http://localhost:8000`.
3. Abrir o seu navegador padrão automaticamente conectado ao banco de dados.

### Opção 2: Linha de Comando Manual
```powershell
php -S localhost:8000
```
Depois, acesse `http://localhost:8000` no seu navegador.

---

## 📡 Endpoints da API PHP

- `GET /api.php?action=ping`: Testa a conexão com o MongoDB Atlas e retorna o status.
- `GET /api.php?action=load`: Carrega o mundo salvo no MongoDB Atlas.
- `POST /api.php?action=save`: Salva o estado completo no MongoDB (atualiza `world_state` e as coleções individuais).
- `POST /api.php?action=reset`: Reseta o banco para um estado limpo em branco.
- `GET /api.php?action=stats`: Retorna as contagens de documentos no MongoDB.

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
