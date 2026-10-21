from pydantic import BaseModel
from typing import Optional


class ReceiptItem(BaseModel):
    name: str
    price: float
    quantity: Optional[int] = 1


class OcrResult(BaseModel):
    merchant_name: Optional[str] = None
    total_amount: Optional[float] = None
    transaction_date: Optional[str] = None
    items: list[ReceiptItem] = []
    raw_text: str


class OcrRequest(BaseModel):
    image_url: str


class ClassifyRequest(BaseModel):
    description: str


class ClassifyResult(BaseModel):
    category: str
    confidence_score: float
    source: str  # "gemini" hoặc "phobert" - phân biệt model nào trả lời


class AnalyzeResult(BaseModel):
    ocr: OcrResult
    classification: ClassifyResult
