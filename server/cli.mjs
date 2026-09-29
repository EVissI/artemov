// Управление админкой из консоли:
//   node server/cli.mjs info                 - где админка
//   node server/cli.mjs password <новый>     - сменить пароль (все сессии сбрасываются)
//   node server/cli.mjs path [<новый-путь>]  - сменить секретный путь (без аргумента - случайный)
import crypto from 'node:crypto';
import * as S from './store.mjs';

const [cmd, arg] = process.argv.slice(2);
const { config, firstRun } = S.loadConfig();
const resetSecret = () => crypto.randomBytes(32).toString('hex');

if (cmd === 'password') {
  if (!arg || arg.length < 10) { console.error('Пароль - минимум 10 символов: npm run admin:password -- <пароль>'); process.exit(1); }
  S.saveConfig({ passwordHash: S.hashPassword(arg), secret: resetSecret() });
  console.log('Пароль обновлён, старые сессии закрыты. Перезапусти сервер.');
} else if (cmd === 'path') {
  const next = S.normalizeAdminPath(arg || 'kabinet-' + crypto.randomBytes(8).toString('hex').slice(0, 10));
  S.saveConfig({ adminPath: next });
  console.log(`Новый путь админки: ${next}/  (перезапусти сервер)`);
} else {
  console.log(`Админка: ${config.adminPath}/`);
  console.log(`Данные:  ${S.DATA}`);
  if (firstRun) console.log(`Пароль (первый запуск): ${firstRun.password}`);
  if (process.env.ADMIN_PATH || process.env.ADMIN_PASSWORD) console.log('Внимание: ADMIN_PATH / ADMIN_PASSWORD из окружения перекрывают data/config.json');
}
