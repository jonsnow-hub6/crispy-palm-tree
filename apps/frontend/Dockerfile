FROM node:18-alpine AS builder

WORKDIR /app

# Install base deps
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy repository and build frontend
COPY . .

# Build the frontend app (uses nx). Falls back to full workspace build if needed.
RUN npx nx build frontend --configuration=production

FROM nginx:stable-alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Add custom nginx config
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
