# Draft Random

Мультиплеерный драфт Dota 2 в режиме Captains Mode.

## Локальный запуск

```bash
npm install
npm run dev
```

- Web: http://localhost:3000
- Socket: http://localhost:3002

Скопируй `.env.example` в `.env.local` при необходимости.

## Деплой (Render)

Репозиторий содержит `render.yaml` — два web-сервиса (Next.js + Socket.IO).

После деплоя проверь `NEXT_PUBLIC_SOCKET_URL` у web-сервиса и при необходимости пересобери.
