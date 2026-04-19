from fastapi import FastAPI, File, UploadFile
import tensorflow as tf
import numpy as np
from PIL import Image
import io

app = FastAPI()

model = tf.keras.models.load_model("./cat_model.keras")

breeds = [
    'Abyssinian',
    'Bengal', 'Birman', 'Bombay', 'British_Shorthair',
    'Egyptian_Mau',
    'Maine_Coon',
    'Persian',
    'Ragdoll', 'Russian_Blue',
    'Siamese', 'Sphynx'
]

def preprocess(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).resize((224, 224))
    img = np.array(img) / 255.0
    return np.expand_dims(img, axis=0)

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    image_bytes = await file.read()
    img = preprocess(image_bytes)
    preds = model.predict(img)
    pred_class = breeds[np.argmax(preds)]
    return {"breed": pred_class}