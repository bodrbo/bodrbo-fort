# Бодрый Боцман — экскурсии по фортам Кронштадта

Статический сайт морских экскурсий `bodrbo-fort.ru`, подготовленный для размещения на Beget.

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

- бронирование: `https://n1058248.yclients.com`;
- Telegram: `https://t.me/bodrbo_fort`;
- WhatsApp: `https://wa.me/79633246627`;
- Яндекс Карты: `https://yandex.ru/maps/org/bodry_botsman/31053959127/`.
