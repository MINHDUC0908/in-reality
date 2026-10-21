import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    # Model đọc từ .env để đổi được khi Google ngừng/đổi tên model
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
    PORT: int = int(os.getenv("PORT", 8000))
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", 0.7))


settings = Settings()

if not settings.GEMINI_API_KEY:
    raise RuntimeError(
        "Thiếu GEMINI_API_KEY trong .env - lấy key tại https://aistudio.google.com/apikey"
    )
