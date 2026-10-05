# Сайт Артема Артемова: Node-сервер без зависимостей + ffmpeg для сжатия загрузок.
# Сборка в два этапа: в первом esbuild собирает site/ и site-admin/, во второй попадает только то, что нужно серверу.

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
# ffmpeg: фото -> WebP, видео -> WebM + MP4 (server/media.mjs); tini корректно передаёт сигналы остановки
RUN apk add --no-cache ffmpeg tini
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATA_DIR=/data
COPY --from=build /app/package.json ./
COPY --from=build /app/server ./server
COPY --from=build /app/content ./content
COPY --from=build /app/site ./site
COPY --from=build /app/site-admin ./site-admin
# живые данные (пароль, контент, заявки, загрузки) - только в томе, в образ не попадают
RUN mkdir -p /data && chown node:node /data
VOLUME /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:3000/api/content || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/server.mjs"]
