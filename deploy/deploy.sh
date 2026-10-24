#!/bin/sh
# Выкатка на прод: свежий main из GitHub -> пересборка и перезапуск контейнеров.
# Запускается из GitHub Actions (.github/workflows/deploy.yml) по SSH: ключ деплоя в authorized_keys root
# привязан к одной команде (command= в authorized_keys): cd /opt/artemov && git pull --ff-only && sh deploy/deploy.sh -
# другие команды по нему не выполнить; pull перед запуском - чтобы всегда работала свежая версия этого скрипта.
# Вручную на сервере: sh /opt/artemov/deploy/deploy.sh
# Всё тело - в функции: sh разбирает её целиком до запуска, поэтому git pull, обновляющий этот файл, не ломает текущий прогон.
main() {
  set -eu
  cd /opt/artemov
  # один деплой за раз: второй пуш подождёт первый (до 15 минут)
  exec 9>/tmp/artemov-deploy.lock
  flock -w 900 9 || { echo "deploy: занято другим деплоем" >&2; exit 1; }
  echo "deploy: было $(git rev-parse --short HEAD)"
  # только перемотка вперёд: если на сервере правили файлы руками - упадёт, а не затрёт
  git pull --ff-only --quiet origin main
  echo "deploy: стало $(git rev-parse --short HEAD) $(git log -1 --format=%s)"
  # данные (том aa-data) не трогаются; если сборка упадёт, старые контейнеры продолжают работать
  docker compose up -d --build --remove-orphans
  docker image prune -f >/dev/null
  echo "deploy: готово"
}
main "$@"
