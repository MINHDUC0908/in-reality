from fastapi import APIRouter, HTTPException
from app.schemas.receipt import OcrRequest, AnalyzeResult
from app.services import gemini_service

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResult)
def analyze_receipt (request: OcrRequest):
    """OCR hóa đơn rồi phân loại category trong 1 lần gọi - NestJS chỉ cần gọi endpoint này"""
    try:
        ocr = gemini_service.ocr_receipt(request.image_url)

        # Ghép tên cửa hàng + các món để có ngữ cảnh phân loại tốt hơn
        item_names = ", ".join(item.name for item in ocr.items)
        description = f"{ocr.merchant_name or ''} {item_names}".strip() or ocr.raw_text

        classification = gemini_service.classify_transaction(description)

        return AnalyzeResult(ocr=ocr, classification=classification)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Lỗi phân tích hóa đơn: {str(error)}")
