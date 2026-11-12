# Первый деплой Burilka на Ubuntu

Текущая цель: `burilka.com` → `129.101.94.58`. Владелец сообщил, что домен сейчас делегируется на этот IP; дождитесь завершения делегирования и проверьте DNS, прежде чем запускать ACME или production deployment. Руководство готовит инфраструктуру, но само по себе не запускает деплой. Не публикуйте `.env`, пароли, приватные ключи или дампы.

## 1. DNS и сервер

1. У регистратора создайте/проверьте A-запись `burilka.com` → `129.101.94.58`.
2. Не добавляйте `www` и AAAA, пока эти имена/адреса реально не настроены и не проверены.
3. Дождитесь распространения DNS и проверьте, что порт 80 и 443 доступны извне. HTTP-01 проверка Let’s Encrypt требует входящий TCP/80.
4. Для production предполагается поддерживаемый Ubuntu LTS. Откройте SSH и TCP 80/443 в firewall сервера и панели провайдера.

## 2. Docker Engine, Compose v2 и Make

Установите Docker Engine и Compose v2 plugin по официальной инструкции Docker для используемой версии Ubuntu, Git, GNU Make и curl. Не предполагайте, что один и тот же пакет Docker Compose есть в репозиториях всех версий Ubuntu.

```sh
sudo apt update
sudo apt install -y ca-certificates curl git make
# Установить Docker Engine + Compose plugin из официального Docker apt repository:
# https://docs.docker.com/engine/install/ubuntu/
sudo systemctl enable --now docker
docker --version
docker compose version
make --version
```

Добавление пользователя в группу `docker` фактически даёт root-доступ. Если это необходимо, выполните `sudo usermod -aG docker "$USER"`, затем заново войдите в систему.

## 3. Checkout и production environment

```sh
sudo mkdir -p /opt/burilka
sudo chown "$USER":"$USER" /opt/burilka
git clone https://github.com/n8node/burilka.git /opt/burilka
cd /opt/burilka
cp .env.production.example .env
chmod 600 .env
```

Отредактируйте `.env` защищённым редактором и замените все `REPLACE_WITH_*` уникальными случайными паролями. Используйте парольный менеджер/секреты хост-системы; не вводите секреты как аргументы команд и не публикуйте содержимое `.env`. Укажите рабочий адрес для ACME и WordPress admin email. Проверяйте наличие значений, не выводя их в публичный лог.

Создайте нужные каталоги и убедитесь, что `.env` остаётся untracked:

```sh
make setup
git status --short
```

## 4. Бесплатный TLS-сертификат Let's Encrypt

Первый HTTP-only ACME responder временно занимает TCP/80 и отдаёт только challenge-файлы. До выпуска сертификата production HTTPS Nginx запускать нельзя.

```sh
cd /opt/burilka
make ssl-init DOMAIN=burilka.com ACME_EMAIL=ваш-рабочий-email@example.com
```

Target запускает отдельный `nginx-acme`, выпускает HTTP-01 сертификат только для `burilka.com` и кладёт ACME state в локальный защищённый каталог `letsencrypt/`. Порт 80 должен быть открыт, A-запись должна указывать на сервер, на хосте не должен конкурировать другой listener на 80.

Проверьте существование `letsencrypt/live/burilka.com/fullchain.pem` и `privkey.pem` без публикации приватного ключа. Не копируйте сертификаты в Git или Docker images.

## 5. Старт production Compose и WordPress

```sh
make prod
make ps
make verify-release
```

`make prod` требует уже существующий TLS cert, запускает отдельные сервисы Nginx, frontend, backend, worker, PostgreSQL, WordPress и WordPress-only MySQL, применяет goose migrations, выполняет идемпотентный `make wp-install-prod`, а затем проверяет публичный edge.

Первый WordPress bootstrap читает admin password только из защищённого `.env`. Если сайт уже установлен, повторный bootstrap ничего не переустанавливает и не сбрасывает.

## 6. Первый platform superadmin

Bootstrap ожидает email `erman.ai@yandex.ru` и пароль, введённый скрыто в интерактивном TTY. Не передавайте пароль аргументом, через чат, shell history, Compose YAML или общий файл.

```sh
cd /opt/burilka
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml exec -it backend \
  /app/burilka-api superadmin-bootstrap erman.ai@yandex.ru
```

Команда не должна reset-ить существующий аккаунт; повторный запуск для существующего email завершится без изменения роли/пароля. На текущем scaffold у приложения ещё нет полноценной auth-системы: созданная запись не означает, что вход в админку уже работает. `/app/admin/` остаётся закрытым до реализации login/session, смены пароля и серверного RBAC.

## 7. Автоматическое обновление сертификата

Установите подготовленные systemd units; service работает как root для Docker socket, не читает пароль из командной строки и не выводит секреты:

```sh
sudo cp docs/deploy/burilka-certbot-renew.service /etc/systemd/system/
sudo cp docs/deploy/burilka-certbot-renew.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now burilka-certbot-renew.timer
sudo systemctl list-timers burilka-certbot-renew.timer
```

Сервис запускает `make ssl-renew` из `/opt/burilka`. Для ручной проверки:

```sh
cd /opt/burilka
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml --profile acme run --rm certbot renew --dry-run --webroot -w /var/www/certbot
```

После реального обновления Nginx должен безопасно перечитать сертификат. Мониторьте expiry/renew failure; не выполняйте частые реальные issuance-запросы во время разработки (используйте ACME staging).

## 8. Проверка маршрутов и эксплуатация

- `https://burilka.com/` → WordPress.
- `https://burilka.com/app/` → Next.js scaffold.
- `/app/auth/login`, `/app/auth/register` → demo forms; регистрация/вход ещё не подключены к API.
- `/app/admin/` → redirect на login до готовности auth/RBAC.
- `/app/health` и `/app/api/v1/status` → Go API status.
- `http://burilka.com/...` → HTTPS redirect, кроме ACME challenge.

Проверки статуса и логи:

```sh
make ps
make logs SERVICE=nginx
make logs SERVICE=backend
make logs SERVICE=frontend
```

Перед production readiness дополнительно нужны backup/restore PostgreSQL + MySQL + WordPress uploads, security review, работающие auth/role flows и end-to-end/performance acceptance. Наличие Compose конфигурации не подтверждает готовность продукта или вместимость 300 студентов.