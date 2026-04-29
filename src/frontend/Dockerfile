FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
USER appuser
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
