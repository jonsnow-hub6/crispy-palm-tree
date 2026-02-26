FROM alpine:latest

ARG PB_VERSION=0.36.2

WORKDIR /pb

COPY ./apps/backend/pocketbase ./pocketbase
COPY ./apps/backend/pb_migrations ./pb_migrations
COPY ./apps/backend/pb_hooks ./pb_hooks

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]