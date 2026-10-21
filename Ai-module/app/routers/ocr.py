from fastapi import APIRouter, HTTPException
from app.schemas.receipt import OcrRequest, OcrResult
from app.services import gemini_service

router = APIRouter()


@router.post("", response_model=OcrResult)
def read_receipt (request: OcrRequest):
    try:
        return gemini_service.ocr_receipt(request.image_url)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Lỗi OCR: {str(error)}")
