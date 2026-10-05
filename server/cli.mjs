// Управление админкой из консоли:
//   node server/cli.mjs info                 - где админка
//   node server/cli.mjs password [<новый>]   - сменить пароль (без аргумента - случайный, печатается один раз; все сессии сбрасываются)
//   node server/cli.mjs path [<новый-путь>]  - сменить секретный путь (без аргумента - случайный)
import crypto from 'node:crypto';
import fs from 'node:fs';
import * as S from './store.mjs';

const [cmd, arg] = process.argv.slice(2);
const { config } = S.loadConfig();
const resetSecret = () => crypto.randomBytes(32).toString('hex');

if (cmd === 'password') {
  const pass = arg || crypto.randomBytes(12).toString('base64url');
  if (pass.length < 10) { console.error('Пароль - минимум 10 символов: npm run admin:password -- <пароль>'); process.exit(1); }
  S.saveConfig({ passwordHash: S.hashPassword(pass), secret: resetSecret() });
  fs.rmSync(S.PASSWORD_FILE(), { force: true });
  if (!arg) console.log(`Новый пароль: ${pass}\nСохрани его - больше он нигде не показывается.`);
  console.log('Пароль обновлён, старые сессии закрыты. Перезапусти сервер.');
} else if (cmd === 'path') {
  const next = S.normalizeAdminPath(arg || 'kabinet-' + crypto.randomBytes(8).toString('hex').slice(0, 10));
  S.saveConfig({ adminPath: next });
  console.log(`Новый путь админки: ${next}/  (перезапусти сервер)`);
} else {
  console.log(`Админка: ${config.adminPath}/`);
  console.log(`Данные:  ${S.DATA}`);
  if (fs.existsSync(S.PASSWORD_FILE())) console.log(`Пароль первого запуска - в файле ${S.PASSWORD_FILE()} (удалится при смене пароля)`);
  if (process.env.ADMIN_PATH || process.env.ADMIN_PASSWORD) console.log('Внимание: ADMIN_PATH / ADMIN_PASSWORD из окружения перекрывают data/config.json');
}
