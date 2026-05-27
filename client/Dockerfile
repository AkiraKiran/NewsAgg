# --- STAGE 1: Build Aplikasi ---
# 使用 node 22 alpine 作為基礎鏡像
FROM node:22-alpine AS builder

# 設定工作目錄
WORKDIR /app

# 先複製 package.json 和 package-lock.json (若有)
COPY package*.json ./

# 安裝所有套件 (包含開發時需要的 build 工具)
# 使用 install 確保根據容器內的 Linux 環境重新編譯套件
RUN npm install

# 複製其餘所有原始碼
COPY . .

# 執行編譯 (產出 dist 資料夾)
RUN npm run build

# --- STAGE 2: Server Nginx ---
# 使用輕量級的 Nginx 鏡像
FROM nginx:alpine

# 複製自定義的 Nginx 設定 (處理路由與壓縮)
# 注意：請確保你的 client 資料夾下有 nginx.conf 檔案
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 從 builder 階段把編譯好的靜態檔案 (dist) 複製到 Nginx 目錄
COPY --from=builder /app/dist /usr/share/nginx/html

# 告知 Docker 此容器會使用 80 port
EXPOSE 80

# 啟動 Nginx
CMD ["nginx", "-g", "daemon off;"]