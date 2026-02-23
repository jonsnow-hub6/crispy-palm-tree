FROM alpine:latest

ARG PB_VERSION=0.36.2

WORKDIR /pb

COPY pocketbase ./pocketbase
COPY pb_migrations ./pb_migrations
COPY pb_hooks ./pb_hooks

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]