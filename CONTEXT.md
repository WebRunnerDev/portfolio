# CONTEXT — портфолио WebRunner

Глоссарий домена. Используйте эти термины в коде, issues и тестах.

| Термин | Значение | Не путать / избегать |
|---|---|---|
| **Lang** | Один из 5 поддерживаемых языков: `en` (fallback), `ru`, `kk`, `es`, `de`. Всегда первый сегмент URL. | «locale» — не используем |
| **Translation** | Строка `*_translation` с переводимыми полями сущности на конкретном Lang. | |
| **Fallback** | Показ EN-перевода, когда перевода на текущий Lang нет; сопровождается плашкой «доступно на EN». | |
| **Profile** | Данные о владельце: имя, заголовок, о себе, контакты. | |
| **CV** | Резюме, собранное из Profile и CV-разделов. Две формы: **Web CV** (дизайнерская) и **Print CV** (`/{lang}/cv/print`, A4). | |
| **CV PDF** | PDF, сгенерированный из Print CV через Browser Rendering и сохранённый в R2. | «загруженное резюме» |
| **CV Section** | Раздел CV (Experience, Projects, Technologies, Education, Certifications, Languages) с порядком и флагами `show_web` / `show_pdf`. | |
| **Technology** | Запись справочника технологий (имя, группа, иконка). Раздел CV называется **Technologies**. | «skill», «навык» |
| **Project** | Пет-проект: карточка на странице «Проекты», опционально **Case Study** и попадание в CV (`in_cv`, `cv_bullets`). | |
| **Featured** | Флаг проекта для показа на главной. | |
| **Post** | Запись блога; статус `draft` / `published`; тело — Markdown. | «статья», «article» |
| **Tag** | Метка поста. | |
| **Album** | Группа фото в галерее. | |
| **Photo** | Изображение в R2, принадлежит Album, с опциональной переводимой подписью. | |
| **Track** | Аудиотрек плейлиста в R2 с полем источника/лицензии. | |
| **Hero Tier** | Уровень hero-анимации: `full` (WebGL), `lite` (CSS/SVG ромбы), `static` (картинка). | |
| **Admin** | Lazy-маршрут `/admin` за Cloudflare Access. | «CMS», «панель» |
| **Meta Injection** | Подстановка `<title>`/OG/hreflang в HTML на Worker через HTMLRewriter. | «SSR» — у нас его нет |
