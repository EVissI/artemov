# artemov - сайт Артема Артемова

- Установить: `npm install` (нужен Node 20+).
- Собрать: `npm run build` (или `bash scripts/build-site.sh`).
- Запустить: `npm start` → сайт на http://127.0.0.1:3000/. При первом запуске в консоли будут адрес админки и пароль - сохрани их.
- Админка: `npm run admin:info` - где она, `npm run admin:password -- <новый пароль>` - сменить пароль.
- Живые данные (контент, заявки, загрузки) - в `data/`, их и нужно бэкапить.
- Исходный контент для первого запуска: `content/content.json`.
- Контекст проекта для Claude Code: `CLAUDE.md`.

На сервере: `HOST=0.0.0.0` или nginx перед Node с `TRUST_PROXY=1` и https (тогда cookie сессии уходит с флагом Secure).
