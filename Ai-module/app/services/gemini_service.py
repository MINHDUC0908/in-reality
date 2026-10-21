import json
import re
import requests
from google import genai
from google.genai import types
from app.config import settings
from app.schemas.receipt import OcrResult, ReceiptItem, ClassifyResult

client = genai.Client(api_key=settings.GEMINI_API_KEY)

# Danh sách category mặc định - khớp với seed data bên NestJS
DEFAULT_CATEGORIES = [
    "Ăn uống",
    "Di chuyển",
    "Mua sắm",
    "Giải trí",
    "Hóa đơn & Tiện ích",
    "Sức khỏe",
    "Giáo dục",
    "Khác",
]

MODEL_NAME = settings.GEMINI_MODEL


def _extract_json (text: str) -> dict:
    """Gemini đôi khi trả JSON kèm markdown ```json - hàm này bóc ra JSON thuần"""
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"Không tìm thấy JSON trong response: {text}")
    return json.loads(match.group())


def ocr_receipt (image_url: str) -> OcrResult:
    """Tải ảnh từ URL, gửi cho Gemini đọc và trích xuất thông tin hóa đơn"""
    image_response = requests.get(image_url, timeout=10)
    image_response.raise_for_status()
    image_bytes = image_response.content

    prompt = """
Đọc hóa đơn trong ảnh này và trả về CHÍNH XÁC theo format JSON sau,
không thêm bất kỳ chữ nào khác ngoài JSON:

{
  "merchant_name": "tên cửa hàng",
  "total_amount": số tiền tổng (chỉ số, không có ký tự tiền tệ),
  "transaction_date": "YYYY-MM-DD",
  "items": [
    {"name": "tên món", "price": giá, "quantity": số lượng}
  ],
  "raw_text": "toàn bộ text đọc được từ ảnh"
}

Nếu không đọc được trường nào thì để null, không được bịa số liệu.
"""

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=[
            prompt,
            types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
        ],
    )

    data = _extract_json(response.text)

    items = [ReceiptItem(**item) for item in data.get("items", [])]

    return OcrResult(
        merchant_name=data.get("merchant_name"),
        total_amount=data.get("total_amount"),
        transaction_date=data.get("transaction_date"),
        items=items,
        raw_text=data.get("raw_text", ""),
    )


def classify_transaction (description: str) -> ClassifyResult:
    """Phân loại mô tả giao dịch vào 1 trong các category mặc định"""
    categories_str = ", ".join(DEFAULT_CATEGORIES)

    prompt = f"""
Phân loại giao dịch chi tiêu sau vào ĐÚNG MỘT trong các category này: {categories_str}

Mô tả giao dịch: "{description}"

Trả về CHÍNH XÁC theo format JSON, không thêm chữ nào khác:
{{
  "category": "tên category được chọn (phải khớp chính xác với danh sách trên)",
  "confidence_score": số từ 0 đến 1 thể hiện độ tự tin
}}
"""

    response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
    data = _extract_json(response.text)

    return ClassifyResult(
        category=data.get("category", "Khác"),
        confidence_score=float(data.get("confidence_score", 0.5)),
        source="gemini",
    )
