FROM node:24.14.0-alpine3.23

WORKDIR /app
COPY server.mjs ./server.mjs

USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
