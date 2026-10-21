from fastapi import APIRouter, HTTPException
from app.schemas.receipt import ClassifyRequest, ClassifyResult
from app.services import gemini_service

router = APIRouter()


@router.post("", response_model=ClassifyResult)
def classify (request: ClassifyRequest):
    try:
        return gemini_service.classify_transaction(request.description)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Lỗi phân loại: {str(error)}")
