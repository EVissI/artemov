# Запуск на сервере в Docker

Два контейнера: `app` (Node-сервер сайта с ffmpeg) и `nginx` перед ним. Живые данные (пароль админки, контент, заявки, загрузки) лежат в томе `aa-data`.

## Первый запуск

```bash
docker compose up -d --build
```

Сайт откроется по `http://<адрес сервера>/`. Путь админки и пароль печатаются при первом запуске:

```bash
docker compose logs app
```

Позже путь можно посмотреть так, а пароль сменить следующей командой:

```bash
docker compose exec app node server/cli.mjs info
```

```bash
docker compose exec app node server/cli.mjs password НОВЫЙ_ПАРОЛЬ
```

Порты по умолчанию 80 и 443. Если они заняты, задать свои: `HTTP_PORT=8080 HTTPS_PORT=8443 docker compose up -d`.

## HTTPS (Let's Encrypt)

Домен уже должен указывать на сервер, сайт - открываться по http.

1. Получить сертификат (подставить домен и почту):

```bash
docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d example.ru -d www.example.ru --email you@example.ru --agree-tos --no-eff-email
```

2. Скопировать `deploy/nginx/site-https.conf.example` в `deploy/nginx/conf.d/site.conf` (вместо старого). Он настроен на `temak1n-portfolio.xyz`: http и www редиректятся (301) на `https://temak1n-portfolio.xyz`. Для другого домена - заменить его в файле и `SITE_URL` в `docker-compose.yml`.

3. Перечитать конфиг:

```bash
docker compose exec nginx nginx -s reload
```

Сертификат живёт 90 дней. Продление (поставить в cron раз в неделю):

```bash
docker compose run --rm certbot renew && docker compose exec nginx nginx -s reload
```

## Обновление сайта

```bash
git pull && docker compose up -d --build
```

Данные в томе при этом не трогаются.

## Бэкап данных

Архив тома `aa-data` в текущую папку:

```bash
docker run --rm -v artemov_aa-data:/data -v "$PWD":/backup alpine tar czf /backup/aa-data-$(date +%F).tar.gz -C /data .
```

Имя тома - `<папка проекта>_aa-data` (проверить: `docker volume ls`). В архиве персональные данные из заявок - хранить его на сервере в России и не выкладывать в гит.

## Заметки

- `TRUST_PROXY=1` уже задан: сервер берёт IP посетителя и https из заголовков nginx (нужно для лимита заявок и входа в админку).
- Загрузка видео в админке - до 1024 МБ (`client_max_body_size` в `deploy/nginx/conf.d/proxy.inc` и `MAX_UPLOAD_MB`).
- Медиа по умолчанию (видео и логотип hero) при первом запуске копируются из `content/uploads/` в том.
