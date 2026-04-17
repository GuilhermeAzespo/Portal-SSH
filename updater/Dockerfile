FROM alpine:latest

# Install docker CLI, docker-compose plugin, and git
RUN apk add --no-cache docker-cli docker-cli-compose git tzdata

WORKDIR /app

COPY run.sh /run.sh
RUN chmod +x /run.sh

ENTRYPOINT ["/run.sh"]
