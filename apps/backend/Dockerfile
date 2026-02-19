FROM alpine:3.18

# Minimal deps
RUN apk add --no-cache ca-certificates wget unzip bash

WORKDIR /srv/pocketbase

# PocketBase version can be overridden at build-time
ARG VERSION=0.36.2
ENV VERSION=${VERSION}

# Download pocketbase binary and make executable
RUN wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}/pocketbase_${VERSION}_linux_amd64.zip" -O /tmp/pb.zip \
  && unzip -o /tmp/pb.zip -d /srv/pocketbase \
  && rm /tmp/pb.zip \
  && chmod +x /srv/pocketbase/pocketbase || true

# Copy hooks and migrations into the image (mounted at runtime by compose as read-only)
COPY pb_hooks ./pb_hooks
COPY pb_migrations ./pb_migrations

RUN mkdir -p /srv/pocketbase/pb_data
VOLUME ["/srv/pocketbase/pb_data"]

EXPOSE 8090

ENV POCKETBASE_DIR=/srv/pocketbase/pb_data

# Workdir and serve
WORKDIR /srv/pocketbase
CMD ["./pocketbase", "serve", "--http", "0.0.0.0:8090", "--dir", "/srv/pocketbase/pb_data"]
