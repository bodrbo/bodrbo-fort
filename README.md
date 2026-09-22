# Бодрый Боцман — экскурсии по фортам Кронштадта

Сайт морских экскурсий `bodrbo-fort.ru`, подготовленный для размещения на Beget. Основные страницы статические; собственный модуль онлайн-записи использует небольшой PHP-прокси и серверный API «Бодрого Бизнеса».

## Локальный просмотр

Откройте `index.html` в браузере или запустите любой статический HTTP-сервер в корне проекта.

## Публикация на Beget

Репозиторий можно клонировать непосредственно в `public_html`:

```bash
git clone --branch main --single-branch git@github.com:bodrbo/bodrbo-fort.git public_html.git-new
```

После первичного развёртывания обновление выполняется из папки сайта:

```bash
git pull --ff-only origin main
```

Также можно подготовить ZIP-сборку:

```bash
chmod +x build-release.sh
./build-release.sh
```

Архив появится в папке `release/`.

## Основные ссылки

- Telegram: `https://t.me/bodrbo_fort`;
- WhatsApp: `https://wa.me/79633246627`;
- Яндекс Карты: `https://yandex.ru/maps/org/bodry_botsman/31053959127/`.

## Подключение онлайн-записи

1. В окружении «Бодрого Бизнеса» задайте `EXCURSION_SITE_BOOKING_SECRET` — случайную строку длиной не менее 32 символов — и разверните версию приложения с API `/api/integrations/excursion-booking`.
2. На Beget скопируйте пример конфигурации за пределы публичной папки:

```bash
cd ~/bodrbo-fort.ru
cp public_html/booking-config.example.php booking-config.php
chmod 600 booking-config.php
```

3. В `booking-config.php` укажите тот же секрет. Файл должен находиться рядом с `public_html`, а не внутри неё:

```php
return [
    'endpoint' => 'https://business.bodrbo.ru/api/integrations/excursion-booking',
    'secret' => 'ОДИН_И_ТОТ_ЖЕ_ДЛИННЫЙ_СЕКРЕТ',
];
```

4. Проверьте наличие cURL в PHP:

```bash
php -r 'echo extension_loaded("curl") ? "curl=yes\n" : "curl=no\n";'
```

Секрет никогда не попадает в JavaScript: браузер обращается к `booking-api.php` на своём домене, а PHP добавляет авторизацию при запросе к корпоративной системе.
