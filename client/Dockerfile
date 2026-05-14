# client/Dockerfile

# --- STAGE 1: Build Aplikasi ---
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependensi dan jalankan install
COPY package*.json ./
RUN npm ci

# Copy source dan jalankan kompresi untuk production
COPY . .
RUN npm run build

# --- STAGE 2: Server Nginx ---
FROM nginx:alpine

# Konfigurasi custom untuk Nginx (Caching dan Kompresi Gzip)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy hasil file compress Vite (dist) ke direktori server Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port (Nginx by default pakai 80)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]