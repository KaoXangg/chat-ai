# ==========================================
# Stage 1: Build Frontend Assets with Vite
# ==========================================
FROM node:22-alpine AS builder
WORKDIR /app

# Build arguments for Vite environment
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Copy package descriptors and install dependencies
COPY package*.json ./
RUN npm ci

# Copy frontend source code and build production bundle
COPY . .
RUN npm run build

# ==========================================
# Stage 2: Serve via Nginx
# ==========================================
FROM nginx:1.27-alpine AS runner

# Copy custom Nginx SPA configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy Vite build output to Nginx web root
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
