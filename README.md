# Классификатор изображений (Gradio → GitHub Pages)

Веб-сайт: загружаете картинку → модель определяет класс.

Подключается к временному Gradio share-URL (модель крутится на Colab/локальной машине автора).

## Демо

После пуша на GitHub включите **Pages**:

Settings → Pages → Source: **Deploy from a branch** → branch `main` / folder `/ (root)`.

Сайт откроется по адресу:

`https://<username>.github.io/<repo-name>/`

## Как запустить локально

Просто откройте `index.html` в браузере **или**:

```bash
npx serve .
# или
python -m http.server 8080
```

## Смена share-ссылки

В файле `app.js` измените константу:

```js
const GRADIO_URL = "https://НОВАЯ_ССЫЛКА.gradio.live";
```

Share-ссылки Gradio живут ~72 часа. Когда старая умрёт — вставьте новую.

## Важно

Это **прокси-фронтенд**. Сама модель не лежит в репозитории.

Чтобы сайт работал постоянно, нужен один из вариантов:

1. Код + веса модели → выложить на [Hugging Face Spaces](https://huggingface.co/spaces) (рекомендуется)
2. Задеплоить Gradio-приложение на свой сервер / Railway / Render
3. Конвертировать модель в ONNX / TensorFlow.js и гонять прямо в браузере

Если пришлёте `app.py` / веса модели — можно сделать полноценный постоянный деплой.

## Структура

```
├── index.html   # страница
├── style.css    # стили
├── app.js       # логика + вызов Gradio API
└── README.md
```

## API модели

- **Вход:** изображение (`Image`)
- **Выход:** `Label` — `{ label, confidences: [{ label, confidence }, ...] }`
- **Эндпоинт:** `POST /gradio_api/call/predict`
