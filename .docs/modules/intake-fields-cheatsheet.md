# Шпаргалка: поля форм и приём лидов (для разработчика)

> Одностраничная карта «имя поля в форме → куда попадает в `Lead` → какой скрипт/константа это читает». Нужна, когда добавляешь новый источник, распознаёшь новое поле или объясняешь клиенту, что положить в форму.
>
> Связанные файлы: `.docs/modules/leads-intake.md` (полная спецификация приёма), `.docs/modules/integrations.md` (подключение источников + клиентская инструкция по `yclid`/`client_id`), `.docs/database.md` (`Lead`).

---

## Главный принцип

**Лид нельзя потерять.** Любое неизвестное поле не отбрасывается — оно уходит в `Lead.customFields` (JSONB) с оригинальным именем. Распознавание — это только «поднять» известные поля в стандартные колонки/бакеты; всё остальное сохраняется как есть.

Единственная точка нормализации — `lib/intake/normalizeLead.ts`, управляется таблицами из `constants/fieldAliases.ts`. **Все три вебхука идут через неё** — отдельной логики разбора полей на источник нет.

---

## Поток приёма (одинаков для всех источников)

```
POST /api/webhooks/tilda/[companyId]      ┐
POST /api/webhooks/wordpress/[companyId]  ├─→ parseBody(request)          lib/intake/parseBody.ts
POST /api/webhooks/leads  (+ X-Api-Key)   ┘        │                       (JSON и form-urlencoded — авто)
                                                   ▼
                                          createLead(body, source, …)      lib/intake/createLead.ts
                                                   │
                                                   ├─ normalizeLead(raw)    lib/intake/normalizeLead.ts
                                                   │      читает таблицы    constants/fieldAliases.ts
                                                   │      → раскладывает по бакетам (см. таблицу ниже)
                                                   │
                                                   ├─ flagPossibleDuplicates(…)   пометка, НЕ блокировка
                                                   ▼
                                          Lead создан в БД
                                                   │
                                                   ▼ (fire-and-forget, не блокирует ответ)
                                          enrichYandexLead(lead.id, …)      lib/intake/yandex.ts
                                                 читает макросы             constants/yandexMacros.ts
```

Универсальный webhook дополнительно проходит `verifyApiKey()` (`lib/intake/verifyApiKey.ts`) и передаёт `sourceLabel`.

---

## Куда попадает каждое поле

`normalizeLead` идёт по полям формы в таком порядке (первое совпадение выигрывает):

| Приоритет | Условие на имя поля (lowercase) | Куда попадает | Источник правила |
| --- | --- | --- | --- |
| 1 | начинается с `utm_` | `Lead.utm` (оригинальное имя) | `normalizeLead.ts` (хардкод-префикс) |
| 2 | входит в `MARKETING_FIELDS` | `Lead.marketing` | `constants/fieldAliases.ts` → `MARKETING_FIELDS` |
| 3 | входит в `LAST_NAME_ALIASES` | дописывается к `Lead.name` (фамилия) | `constants/fieldAliases.ts` → `LAST_NAME_ALIASES` |
| 4 | есть в `FIELD_ALIASES` | стандартное поле `name`/`phone`/`email`/`comment` | `constants/fieldAliases.ts` → `FIELD_ALIASES` |
| 5 | всё остальное | `Lead.customFields` (оригинальное имя, регистр сохраняется) | — |

После прохода — два «спасательных» шага (чтобы не потерять контакт при незнакомых именах полей):
- **По форме значения:** если `email`/`phone` ещё пусты, но в `customFields` лежит значение, похожее на email/телефон — оно забирается в стандартное поле (`claimByValueShape`).
- **Единственное имя:** если `name` пуст и остался ровно один неметаданный кандидат в `customFields` — он становится именем (`isNameCandidate`, исключения — `NON_NAME_META_FIELDS` + технические ключи `_*`, `*_id`, `nonce`, `referer`).

Вложенные объекты (обёртки плагинов вроде Fluent Forms `{fields:{…}}`) разворачиваются до глубины 4 перед разбором (`flattenFields`) — алиасы срабатывают на любой вложенности.

---

## Точные имена полей, которые распознаются

Из `constants/fieldAliases.ts` (сравнение всегда по lowercase; можно и русскими именами):

**→ `Lead.name`** (`FIELD_ALIASES`):
`name`, `имя`, `фио`, `название`, `full_name`, `fullname`, `contact_name`, `contact-name`, `клиент`, `заявитель`, `first_name`, `firstname`, `first-name`, `fname`, `your-name` (Contact Form 7)

**→ фамилия, дописывается к `name`** (`LAST_NAME_ALIASES`):
`last_name`, `lastname`, `last-name`, `lname`, `фамилия`, `surname`

**→ `Lead.phone`**:
`phone`, `телефон`, `tel`, `тел`, `telephone`, `mobile`, `phone_number`, `phonenumber`, `phone-number`, `мобильный`, `your-tel`, `your-phone`

**→ `Lead.email`**:
`email`, `e-mail`, `почта`, `mail`, `email_address`, `emailaddress`, `email-address`, `your-email`

**→ `Lead.comment`**:
`comment`, `комментарий`, `comments`, `message`, `сообщение`, `text`, `текст`, `question`, `вопрос`, `заявка`, `описание`, `description`, `your-message`, `your-subject`

**→ `Lead.marketing`** (`MARKETING_FIELDS`):
`gclid`, `yclid`, `fbclid`, `msclkid`, `pixel_id`, `fb_pixel`, `_ga`, `roistat`, `roistat_visit`, `ymuid`, `metrika_id`, `yaclid`, `_ym_uid`, `_ym_d`, `calltouch_session`, `calltracking_id`, `comagic_session`

---

## Скрытые поля, которые кладёт сайт клиента (для интеграций)

Это поля, которые не вводит человек — их подставляет скрипт на сайте в скрытые `<input>`. Наш код их не «настраивает», он их **читает по фиксированным именам**.

| Имя поля в форме | Куда ложится при приёме | Какой скрипт потом читает | Зачем |
| --- | --- | --- | --- |
| `yclid` | `Lead.marketing.yclid` (правило 2) | `enrichYandexLead` (Директ) + `metrikaExport` (Метрика) | клик по рекламе Директа |
| `campaign_id` | `Lead.customFields.campaign_id` | `enrichYandexLead` → `marketing.yandex.campaignName` | ID кампании Директа |
| `gbid` | `Lead.customFields.gbid` | `enrichYandexLead` → `adGroupName` | ID группы объявлений |
| `keyword` | `Lead.customFields.keyword` | `enrichYandexLead` → `keyword` | ключевая фраза |
| `device_type` | `Lead.customFields.device_type` | `enrichYandexLead` → `deviceType` | тип устройства |
| `region_name` | `Lead.customFields.region_name` | `enrichYandexLead` → `regionName` | регион показа |
| `client_id` | `Lead.customFields.client_id` | `metrikaExport` (офлайн-конверсии) | `ClientID` Метрики |

Имена макросов Директа — `constants/yandexMacros.ts` (`YANDEX_MACRO_FIELDS`): имя поля = имя макроса без фигурных скобок (`{campaign_id}` → поле `campaign_id`).

**Ключевое:** имена менять нельзя — код ищет ровно эти строки (lowercase). `yclid` в `YANDEX_MACRO_FIELDS` **не входит** намеренно: он распознаётся раньше, на шаге `MARKETING_FIELDS`, и уходит в `marketing`, а не в `customFields`.

Готовую пошаговую инструкцию **для владельца сайта** (скрытые поля + JS-сниппет + проверка) не дублируй — она уже есть: `.docs/modules/integrations.md` → «Как добавить поля `yclid` и `client_id` в формы на сайте».

---

## Универсальный сборщик меток на стороне сайта

Наивный сниппет (`document.querySelectorAll('input[name=…]')` + заполнение **на `load`**) закрывает только простой случай: статичная форма уже в DOM на момент загрузки, поле именуемо, `window.ym` готов. Он молча промахивается на: поздних/динамических формах (попап, квиз, многошаговые, AJAX-подгрузка), SPA-навигации без перезагрузки, конструкторах, где на `<input>` нельзя повесить `name`/класс, и на гонке `getClientID` при быстрой отправке.

Универсальная версия — обёртка `setupLeadTracking(counterId)`, которая вместо разового заполнения:

1. кэширует метки при инициализации (`yclid` из `location.search` → cookie; `client_id` — по готовности `window.ym`, с поллингом);
2. вешает **делегированный `submit`-listener на `document` в capture-фазе** — срабатывает для любой формы, в т.ч. смонтированной позже;
3. на каждой отправке находит/создаёт `input[name="yclid"]` и `input[name="client_id"]` в отправляемой форме и проставляет значение из кэша.

Ключи на выходе — ровно `yclid` и `client_id`, поэтому дальше они проходят штатный `normalizeLead` → `yclid` в `Lead.marketing` (правило `MARKETING_FIELDS`), `client_id` в `Lead.customFields` (см. таблицу выше).

### Код функции

```html
<script>
/**
 * Универсальный сборщик рекламных меток yclid / client_id.
 * Вызвать один раз, передав номер счётчика Метрики (см. блок ниже).
 */
function setupLeadTracking(counterId) {
  var store = { yclid: '', client_id: '' };

  // 1. yclid из адреса → cookie на 90 дней (переживает переходы по сайту)
  var fromUrl = new URLSearchParams(window.location.search).get('yclid');
  if (fromUrl) setCookie('lk_yclid', fromUrl);
  store.yclid = fromUrl || getCookie('lk_yclid');

  // 2. client_id — у Метрики, как только window.ym готов (+ кэш из cookie)
  store.client_id = getCookie('lk_client_id');
  whenYmReady(function (ym) {
    ym(counterId, 'getClientID', function (id) {
      if (id) { store.client_id = id; setCookie('lk_client_id', id); }
    });
  });

  // 3. Делегированный submit (capture) — ловит ЛЮБУЮ форму, в т.ч. позднюю.
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form || form.tagName !== 'FORM') return;
    ['yclid', 'client_id'].forEach(function (name) {
      if (!store[name]) return;
      var input = form.querySelector('input[name="' + name + '"]');
      if (!input) { // поля нет — инжектим сами
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        form.appendChild(input);
      }
      input.value = store[name];
    });
  }, true);

  function setCookie(name, value) {
    document.cookie = name + '=' + encodeURIComponent(value) + ';path=/;max-age=7776000';
  }
  function getCookie(name) {
    var m = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
    return m ? decodeURIComponent(m[1]) : '';
  }
  function whenYmReady(cb) {
    var tries = 0;
    (function check() {
      if (window.ym) return cb(window.ym);
      if (tries++ < 40) setTimeout(check, 500); // до ~20 сек
    })();
  }
}
</script>
```

### Где вызвать

Функция только объявлена — вызвать её нужно один раз, ниже определения (тем же `<script>`), в подвале страницы, после счётчика Метрики:

```html
<script>
  setupLeadTracking(106945257); // ← номер счётчика Метрики (тот же, что в /admin/integrations)
</script>
```

Порядок относительно счётчика некритичен: `whenYmReady` поллит `window.ym`, а `submit`-делегат навешивается на `document` (существует сразу). Скрытые поля в форме добавлять **не обязательно** — функция инжектит их сама.

### Остаточное ограничение

Что не чинится на клиенте: конструкторы, которые сериализуют payload **из собственной модели поля**, а не из DOM (контролируемые `<input>` в React — Elementor Pro и подобные). Прямая установка `input.value` не обновляет их внутренний state, а инжектированный `<input>` игнорируется при отправке. Обход — добавить настоящее hidden-поле средствами конструктора (имя/класс `yclid`, `client_id`): функция его найдёт и заполнит. Финальная проверка — всегда по факту приёма (поле `client_id` в карточке лида).

---

## Какие скрипты читают эти поля

| Файл | Что читает | Когда |
| --- | --- | --- |
| `lib/intake/parseBody.ts` | сырое тело запроса (JSON / form-urlencoded) | на входе каждого вебхука |
| `lib/intake/normalizeLead.ts` | все поля формы, раскладывает по таблице выше | внутри `createLead` |
| `constants/fieldAliases.ts` | *(данные)* `FIELD_ALIASES`, `LAST_NAME_ALIASES`, `MARKETING_FIELDS`, `NON_NAME_META_FIELDS` | их читает `normalizeLead` |
| `lib/intake/createLead.ts` | нормализованный лид → запись в БД | тело обработчика вебхука |
| `lib/intake/yandex.ts` (`enrichYandexLead`) | `utm` + `customFields` (макросы Директа), `marketing.yclid` | пост-коммит, только `yandexMode === "FULL"` + кабинет подключён |
| `constants/yandexMacros.ts` | *(данные)* `YANDEX_MACRO_FIELDS` | их читает `enrichYandexLead` |
| `lib/integrations/yandex/metrikaExport.ts` | `customFields.client_id` + `marketing.yclid` | cron-экспорт `QUALIFIED`-лидов в Метрику |
| `lib/intake/verifyApiKey.ts` | `X-Api-Key` заголовок | только универсальный webhook `/api/webhooks/leads` |

---

## Как добавить новое распознаваемое поле (для разработчика)

1. **Стандартное поле** (ещё один синоним для имени/телефона/…) → добавь строку в нужную группу `FIELD_ALIASES` (`constants/fieldAliases.ts`), lowercase. Больше ничего — `normalizeLead` подхватит.
2. **Новый маркетинговый трекер** (в `Lead.marketing`, не в `customFields`) → добавь имя в `MARKETING_FIELDS`.
3. **Новый макрос Директа** → добавь в `YANDEX_MACRO_FIELDS` (`constants/yandexMacros.ts`) **и** в чтение внутри `enrichYandexLead` (`lib/intake/yandex.ts`).
4. **Не нужно ничего распознавать** — не трогай ничего: незнакомое поле само уедет в `customFields` без потерь.
5. После правки алиасов прогоняй `lib/intake/normalizeLead.test.ts` — там закреплено поведение раскладки.

**Чего не делать:** не добавляй отдельный парсинг полей в сам обработчик вебхука (`app/api/webhooks/**`) — вся раскладка централизована в `normalizeLead`; дублирование там разъедется между источниками.
