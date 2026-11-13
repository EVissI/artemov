#!/bin/sh
# Выкатка на прод: свежий main из GitHub -> пересборка и перезапуск контейнеров.
# Запускается из GitHub Actions по SSH с ключом, привязанным к этой команде.
# Вручную: sh /srv/temak1n-portfolio.xyz/repo/deploy/deploy.sh
# Всё тело - в функции: sh разбирает её целиком до запуска, поэтому git pull, обновляющий этот файл, не ломает текущий прогон.
main() {
  set -eu
  base=/srv/temak1n-portfolio.xyz
  # один деплой за раз: второй пуш подождёт первый (до 15 минут)
  exec 9>"$base/.deploy.lock"
  flock -w 900 9 || { echo "deploy: занято другим деплоем" >&2; exit 1; }
  cd "$base/repo"
  test "$(git branch --show-current)" = main || { echo "deploy: нужна ветка main" >&2; exit 1; }
  test -z "$(git status --porcelain)" || { echo "deploy: чекаут содержит локальные изменения" >&2; exit 1; }
  echo "deploy: было $(git rev-parse --short HEAD)"
  # только перемотка вперёд: если на сервере правили файлы руками - упадёт, а не затрёт
  git pull --ff-only --quiet origin main
  echo "deploy: стало $(git rev-parse --short HEAD) $(git log -1 --format=%s)"
  # Сборка проходит до пересоздания контейнера. Compose подключает существующий каталог данных.
  docker compose -f "$base/compose.yaml" up -d --build --wait app
  echo "deploy: готово"
}
main "$@"
