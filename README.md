# Draft Random

Мультиплеерный онлайн-драфт **Dota 2** в режиме **Captains Mode** — комнаты, лобби, таймеры, серия карт и чат в реальном времени.

## Возможности

- **Комнаты и лобби** — создание комнаты, список открытых лобби, вход по паролю
- **Captains Mode** — 14 фаз, 7 героев на атрибут (Strength / Agility / Intelligence / Universal)
- **Два капитана + зрители** — хост управляет настройками, может стать капитаном
- **Таймер драфта** — основное время и резерв (1 мин на команду), случайный пик при таймауте
- **Серия карт (BO1–BO5)** — счёт, смена сторон Radiant/Dire на каждой новой карте
- **Пул героев** — баны остаются видимыми (затемнены), пики исключаются из следующих карт серии
- **Чат и участники** — список игроков, чат в комнате, хост может замутить игрока
- **Solo-режим** — локальный драфт на `/draft` для теста без второго игрока

## Стек

- **Next.js 16** + React 19 + TypeScript
- **Socket.IO** — отдельный Node-сервер для комнат и драфта в реальном времени
- Портреты героев с CDN Steam

## Локальный запуск

```bash
npm install
npm run dev
```

- Web: http://localhost:3000  
- Socket: http://localhost:3002  

При необходимости скопируй `.env.example` в `.env.local`.

## Деплой (Render)

В репозитории есть `render.yaml` — Blueprint создаёт два web-сервиса:

| Сервис | Назначение |
|--------|------------|
| `draft-random-web` | Next.js (фронт) |
| `draft-random-socket` | Socket.IO (комнаты, драфт) |

### Ручной деплой (без Blueprint)

**1. Socket-сервис** `draft-random-socket`  
Build: `npm install` · Start: `npm run start:socket` · Health: `/health`

**2. Web-сервис** `draft-random-web`  
Build: `npm install && npm run build` · Start: `npm run start`

### Переменные окружения (обязательно)

| Сервис | Переменная | Значение |
|--------|------------|----------|
| **web** | `SOCKET_SERVER_URL` | URL сокета, напр. `https://draft-random-socket.onrender.com` |
| **web** | `NEXT_PUBLIC_SOCKET_URL` | тот же URL (для сборки) |
| **socket** | `CLIENT_URL` | URL сайта, напр. `https://draft-random-web.onrender.com` |

> Без слэша в конце URL. После смены env на **web** — **Manual Deploy → Clear build cache & deploy**.  
> После смены `CLIENT_URL` на **socket** — **Manual Deploy**.

### «Сервер офлайн» на Render

1. Проверь `SOCKET_SERVER_URL` и `NEXT_PUBLIC_SOCKET_URL` у web-сервиса  
2. Проверь `CLIENT_URL` у socket-сервиса (точный URL фронта)  
3. Открой сокет в браузере: `https://…-socket.onrender.com/health` → должно быть `ok`  
4. Пересобери web с очисткой кэша

## CI/CD

- **GitHub Actions** (`.github/workflows/ci.yml`) — typecheck + build на каждый push в `main`
- **Render** — auto-deploy при push, если репозиторий подключён к сервисам
- Опционально: Deploy Hooks в Render → GitHub Secrets `RENDER_DEPLOY_HOOK_WEB` / `RENDER_DEPLOY_HOOK_SOCKET`

Репозиторий: https://github.com/human-suit/Draft_Random

## Структура

```
app/          — страницы Next.js
server/       — Socket.IO сервер и хранилище комнат
src/features/ — драфт, комнаты, UI
render.yaml   — конфиг деплоя на Render
```
