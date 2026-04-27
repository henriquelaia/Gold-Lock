FROM node:20-alpine

WORKDIR /app

# Instalar dependências primeiro (cache layer)
COPY package*.json ./
RUN npm ci

# Copiar código fonte
COPY . .

# Porta do Vite dev server
EXPOSE 3000

# Comando de desenvolvimento com hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
