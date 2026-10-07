# Общая часть для HTTP и HTTPS: всё уходит в Node-сервер (он сам ставит кэш-заголовки, ETag и отдаёт Range для видео).

# загрузки из админки: видео до 1024 МБ (MAX_UPLOAD_MB), файл идёт в сервер потоком, без буфера на диске nginx
client_max_body_size 1100m;
proxy_request_buffering off;

gzip on;
gzip_comp_level 5;
gzip_min_length 1024;
gzip_proxied any;
gzip_types text/css text/javascript application/javascript application/json image/svg+xml application/wasm application/octet-stream; # octet-stream - WAD пасхалки Doom (/assets/doom/doom1.wad), видео и картинки идут своими типами

location / {
    proxy_pass http://app:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    # сервер (TRUST_PROXY=1) берёт IP и схему из последнего значения этих заголовков - подменить их с клиента нельзя
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_read_timeout 600s;
    proxy_send_timeout 600s;
}
