# Burilka — виртуальный тренажёр буровой

Подготовительный каркас веб-платформы: Next.js кабинет, Go API/worker, PostgreSQL, WordPress-маркетинг и Docker Compose.

## Адреса

- Production: `https://burilka.com/` — WordPress; `https://burilka.com/app/` — приложение.
- Вход: `/app/auth/login`; регистрация: `/app/auth/register`; администрирование: `/app/admin/` (закрыто до реализации аутентификации и RBAC).
- Health: `/app/health`; API status: `/app/api/v1/status`.
- Домен/IP — текущая конфигурация проекта; перед выпуском сертификата обязательно проверить DNS и доступность портов.

## Локальный запуск

Требуются Git, Docker Engine/Desktop и Docker Compose v2. Для `make` установите GNU Make; Windows-пользователям удобнее WSL2.

```sh
make
make setup
make up
```

Локальные сервисы доступны через `http://localhost/` (WordPress) и `http://localhost/app/` (приложение). Не используйте sample credentials из `.env.example` в production.

## Первый production deploy

Полная пошаговая инструкция: [`docs/deploy/first-deploy.md`](docs/deploy/first-deploy.md).

Вкратце: настроить DNS `burilka.com → 95.163.244.138`, установить Docker/Compose v2 и GNU Make на Ubuntu, безопасно подготовить `.env`, выпустить бесплатный Let’s Encrypt сертификат через HTTP-01 webroot командой `make ssl-init`, запустить `make prod`, затем интерактивно создать суперадмина. Серверный deployment нужно запускать только после проверки и согласования DNS/секретов.

## Текущее состояние

- Начальная оболочка и routing scaffold, а не готовый учебный продукт.
- Формы входа/регистрации пока демонстрационные, кнопки отключены.
- Авторизация, полноценный кабинет/роли, сценовый API, 3D-ассеты, учебный контент и оценивание ещё предстоит реализовать.
- `/app/admin/` перенаправляется на вход до появления проверяемой авторизации и серверной проверки platform-superadmin.
- Файлы инфраструктуры не доказывают поддержку 300 одновременных сессий; это потребует отдельного нагрузочного и браузерного acceptance-тестирования.

## Структура

- `frontend/` — Next.js, локали `ru/en/zh/de/ar`, маршруты портала.
- `backend/` — Go API/worker, миграции PostgreSQL и bootstrap-команда.
- `nginx/` — HTTP ACME bootstrap и production TLS/path routing.
- `wordpress/` — WordPress и отдельный MySQL через Compose; bootstrap скрипт.
- `.cursor/rules/` — архитектура, продуктовые, deployment, i18n и UI contracts.