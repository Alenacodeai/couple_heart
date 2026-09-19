# Нажми на Сердце ❤️

Готовый статический сайт для GitHub Pages + Supabase.

## Что умеет
- заставка с картинкой «Мой / Моя»;
- два пользователя: Он и Она;
- вход по magic link на e-mail;
- каждому можно отправить только 1 сердечко раз в 30 минут;
- отдельные счетчики «Он → Она» и «Она → Он»;
- анимация полета сердечка: для Него — Ханчжоу → Москва, для Нее — Москва → Ханчжоу;
- ограничение 30 минут проверяется на сервере Supabase, а не только в браузере.

## 1. Создайте Supabase
1. Зарегистрируйтесь на supabase.com.
2. Создайте новый проект.
3. Откройте SQL Editor.
4. Вставьте содержимое `supabase.sql`.
5. В самом SQL замените два e-mail и выполните `insert` для вашей пары.

## 2. Настройте вход
Supabase -> Authentication -> URL Configuration:
- Site URL: `https://ВАШ-ЛОГИН.github.io/ИМЯ-РЕПОЗИТОРИЯ/`
- Redirect URLs: добавьте тот же адрес.

## 3. Вставьте ключи
Supabase -> Project Settings -> API:
- Project URL
- anon public key

В `app.js` замените:
- `PASTE_SUPABASE_URL_HERE`
- `PASTE_SUPABASE_ANON_KEY_HERE`

## 4. Загрузите на GitHub
Создайте репозиторий и загрузите:
- index.html
- style.css
- app.js
- supabase.sql
- assets/cover.png

## 5. Включите GitHub Pages
Repository -> Settings -> Pages:
- Source: Deploy from a branch
- Branch: main
- Folder: /root

Через минуту сайт будет доступен по адресу:
`https://ВАШ-ЛОГИН.github.io/ИМЯ-РЕПОЗИТОРИЯ/`

## Важно
Если репозиторий публичный, код сайта будет виден. Это нормально: секретных ключей в нем нет. `anon key` Supabase специально предназначен для браузера. Доступ к отправке сердечек защищается входом по e-mail + функциями Supabase.
