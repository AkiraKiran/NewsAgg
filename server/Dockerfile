# server/Dockerfile
FROM node:22-bookworm-slim

# Perbarui sistem Debian dan hapus package usang untuk mengurangi vulnerability
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends python3 python3-pip python3-venv && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy deps dan install
COPY package*.json ./
RUN npm ci --omit=dev

# Copy all source
COPY . .

EXPOSE 3000

# Jalankan server
CMD ["npm", "start"]
