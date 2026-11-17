# ============================================================================
# DOCKERFILE - Deploy do FamilyTree no Render (Node.js 20 Alpine + MongoDB Atlas)
# Ultraleve: ~45MB de RAM, ideal para o plano gratuito do Render (512 MB de RAM)
# ============================================================================

FROM node:20-alpine

WORKDIR /app

# Instalação de dependências
COPY package*.json ./
RUN npm install --omit=dev

# Código-fonte
COPY . .

EXPOSE 8000
ENV PORT=8000
ENV NODE_ENV=production

CMD ["node", "server.js"]
