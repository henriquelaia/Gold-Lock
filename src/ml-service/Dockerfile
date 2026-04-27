FROM python:3.12-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependências Python primeiro (cache layer)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fonte
COPY . .

# Porta da API Flask
EXPOSE 5000

# Comando de desenvolvimento
CMD ["python", "-m", "flask", "run", "--host=0.0.0.0", "--port=5000", "--reload"]
