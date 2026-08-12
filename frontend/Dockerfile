FROM node:24-alpine AS builder

RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm install --no-audit --no-fund

COPY . .

ENV NODE_ENV=production
RUN npm run build

FROM nginx:1.27-alpine AS production

RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache curl

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid

USER nginx
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
