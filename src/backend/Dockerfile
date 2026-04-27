FROM node:20-alpine

WORKDIR /app

# Instalar dependências primeiro (cache layer)
COPY package*.json ./
RUN npm ci

# Copiar código fonte
COPY . .

# Porta da API
EXPOSE 4000

# Comando de desenvolvimento com hot reload
CMD ["npm", "run", "dev"]
