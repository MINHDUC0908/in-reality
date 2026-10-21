from fastapi import APIRouter, HTTPException
from app.schemas.anomaly import AnomalyDetectRequest, AnomalyDetectResult
from app.services import anomaly_service

router = APIRouter()


@router.post("/detect", response_model=AnomalyDetectResult)
def detect_anomaly(request: AnomalyDetectRequest):
    """
    Phát hiện giao dịch chi tiêu bất thường bằng mô hình Machine Learning (Isolation Forest)
    Đánh giá độ rủi ro và đưa ra lý do + gợi ý tài chính
    """
    try:
        return anomaly_service.detect_transaction_anomaly(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi phân tích bất thường: {str(e)}")
