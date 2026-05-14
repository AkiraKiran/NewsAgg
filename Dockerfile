FROM node:22-bookworm-slim

WORKDIR /app

# Build backend image from repository root.
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev

COPY server/ .

EXPOSE 3000

CMD ["npm", "start"]
