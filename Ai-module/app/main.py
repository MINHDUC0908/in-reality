from fastapi import FastAPI
from app.routers import ocr, classify, receipt, anomaly

app = FastAPI(title="Expense Tracker AI Service")

app.include_router(ocr.router, prefix="/ocr", tags=["OCR"])
app.include_router(classify.router, prefix="/classify", tags=["Classify"])
app.include_router(receipt.router, prefix="/receipt", tags=["Receipt"])
app.include_router(anomaly.router, prefix="/anomaly", tags=["Anomaly Detection"])


@app.get("/health")
def health_check ():
    return {"status": "ok"}
