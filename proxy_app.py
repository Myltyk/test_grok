"""
Обёртка Gradio: принимает картинку и проксирует запрос
к модели на share-ссылке.

Запуск:
  pip install gradio gradio_client
  python proxy_app.py

После запуска можно снова сделать share=True и получить новую ссылку.
"""

import gradio as gr
from gradio_client import Client, handle_file

# ← меняйте при новой ссылке
REMOTE = "https://cc69d162143324ac08.gradio.live"

client = Client(REMOTE)


def predict(img):
    if img is None:
        return None
    # img — путь к временному файлу Gradio
    result = client.predict(handle_file(img), api_name="/predict")
    return result


demo = gr.Interface(
    fn=predict,
    inputs=gr.Image(type="filepath", label="img"),
    outputs=gr.Label(label="output"),
    title="Классификатор изображений",
    description="Прокси к модели на Gradio share-ссылке",
    allow_flagging="never",
)

if __name__ == "__main__":
    demo.launch(share=True)
