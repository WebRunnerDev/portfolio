# Cloudflare: защиты зоны webrunner.dev

Настройки на уровне зоны, которые действуют для всех проектов на webrunner.dev. Их делает владелец в дашборде Cloudflare (#41). Worker их не дублирует.

## Планы

- Зона **webrunner.dev** на плане **Free**.
- На аккаунте подключён **Workers Paid**. Это подписка аккаунта на платформу разработчика, план зоны она не повышает.
- Всё ниже рассчитано на Free. Pro (платный план зоны) не покупаем.

## WAF → Managed rules

- **Cloudflare Free Managed Ruleset** включён по умолчанию для всех Free-зон и не настраивается.
- Полный *Cloudflare Managed Ruleset* (выбор правил, смена действий, OWASP) требует Pro, поэтому не используем.
- *Account-level WAF* (страница аккаунта с кнопкой «Purchase add-on») — Enterprise-продукт, к нашей задаче не относится.

## WAF → Custom rules

На Free доступно 5 правил, занято 2. Regex (`matches`) на Free недоступен, поэтому в выражениях используются `starts_with`/`ends_with`.

| Правило | Действие | Выражение |
| --- | --- | --- |
| `Block scanner paths` | Block | `starts_with(lower(http.request.uri.path), "/wp-admin") or starts_with(lower(http.request.uri.path), "/.env") or starts_with(lower(http.request.uri.path), "/.git") or ends_with(lower(http.request.uri.path), ".php")` |
| `Block empty UA on API` | Block | `starts_with(http.request.uri.path, "/api/") and http.user_agent eq ""` |

`/wp-login.php` и `/xmlrpc.php` ловит `.php`.

Что сознательно не делаем:

- **Geo-правило** — только если появится реальная причина.
- **Блокировку ASN хостингов и прокси** — Admin API и так закрыт Access, публичный API только читает, а Browser Rendering (CV PDF) ходит с адресов Cloudflare и попал бы под правило.
- **Managed Challenge на `/admin*`** — Access уже требует вход, а challenge поверх него ломает редирект логина и запросы SPA к `/api/admin/*`.

Проверено: `/.env` и `/wp-admin` отдают `403`, событие видно в Security → Analytics → Events.

## Rate limiting

На Free доступно одно правило. Счёт идёт только по IP, период 10 с, блокировка на 10 с.

| Правило | Условие | Порог | Действие |
| --- | --- | --- | --- |
| `API flood guard` | URI Path `/api/*` | 100 запросов / 10 с на IP | Block на 10 с |

Это грубая защита от флуда. Основные лимиты держит Worker (`worker/README.md` › Rate limits, самый мягкий — 100 / 60 с на IP + путь): у него единый формат ошибки и `Retry-After`. Порог на краю специально выше, чтобы Worker срабатывал первым.

## Bots

**Bot Fight Mode** включён, JS Detections включены.

На Free Bot Fight Mode нельзя обойти skip-правилом WAF. Что он затрагивает:

- **Workers Builds** и **Lighthouse CI** — нет: сборка в зону не ходит, Lighthouse проверяет сборку локально в CI, а не webrunner.dev.
- **Verified Bots** (превью ссылок в Telegram, поисковики) пропускаются. Проверено: превью `https://webrunner.dev/en` в Telegram строится.
- **Browser Rendering** (CV PDF, этап 3) Cloudflare помечает как бот, поэтому его запросы к зоне могут блокироваться. Для этапа 3: Worker передаёт HTML в `page.setContent()`, а не открывает `webrunner.dev/{lang}/cv/print`, и запрос не проходит через зону. Если всё же нужен переход по URL и он блокируется — выключить Bot Fight Mode и записать это здесь.

Проверено после включения: сайт, `/api/health`, `/api/public/{lang}/*` и вход в `/admin` через Access работают.

## SSL/TLS и HSTS

| Настройка | Значение |
| --- | --- |
| Encryption mode | Full (strict) — у Worker на custom domain нет внешнего origin, режим нужен на случай, если origin появится |
| Always Use HTTPS | On |
| Minimum TLS Version | 1.2 |
| TLS 1.3 | On |
| HSTS | `max-age` 6 месяцев (15552000), без `includeSubDomains`, без `preload`, No-Sniff off (`nosniff` ставят Worker и `public/_headers`) |

`includeSubDomains` включать, только если все поддомены webrunner.dev отдаются по HTTPS, сейчас и в будущем. Откатить HSTS до истечения `max-age` нельзя: браузеры его запомнили.

Проверено: `http://` → `301` на `https://`, TLS 1.0 и 1.1 отклоняются, TLS 1.2 работает, на ответе есть `Strict-Transport-Security: max-age=15552000`.

## Security Events и уведомления

_TODO_
