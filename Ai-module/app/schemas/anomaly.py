from typing import Optional
from pydantic import BaseModel, Field


class AnomalyDetectRequest(BaseModel):
    amount: float = Field(..., description="Số tiền giao dịch (VNĐ)")
    category_id: Optional[str] = Field(None, description="ID danh mục")
    category_name: Optional[str] = Field("Khác", description="Tên danh mục (ví dụ: Ăn uống, Mua sắm...)")
    transaction_date: Optional[str] = Field(None, description="Thời gian giao dịch dạng ISO hoặc YYYY-MM-DD HH:mm:ss")
    avg_category_amount: Optional[float] = Field(None, description="Mức chi tiêu trung bình của user trong danh mục này")
    max_category_amount: Optional[float] = Field(None, description="Khoản chi lớn nhất trước đây trong danh mục này")


class AnomalyDetectResult(BaseModel):
    is_anomaly: bool = Field(..., description="Có phải giao dịch bất thường không")
    risk_score: float = Field(..., description="Điểm rủi ro từ 0.0 (an toàn) đến 1.0 (rất bất thường)")
    risk_level: str = Field(..., description="Mức độ rủi ro: NORMAL, MEDIUM, HIGH")
    anomaly_type: Optional[str] = Field(None, description="Loại bất thường: AMOUNT_SPIKE, UNUSUAL_HOUR, EXCESSIVE_DEVIATION")
    reason: str = Field(..., description="Giải thích chi tiết bằng tiếng Việt lý do cảnh báo")
    suggestion: str = Field(..., description="Lời khuyên quản lý tài chính")
