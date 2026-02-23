FROM registry-1.docker.io/library/node:24 AS base

WORKDIR /app
ADD ./app

# Add certificates


FROM base AS builder
RUN npm i --legacy-peer-deps
RUN npm run build

FROM registry-1.docker.io/library/nginx:1.27.1 AS final

COPY ./apps/frontend/nginx/nginx.conf.template /nginxtemplate/nginx.conf.template
COPY --from=builder /app/dist/apps/frontend/ /etc/nginx/html

EXPOSE 80

CMD ["/bin/sh", "-c", "envsubst ' \
$$SERVER_URL \
'< /nginxtemplate/nginx.conf.template \
> /etc/nginx/nginx.conf \
&& nginx -g 'daemon off;'"]
