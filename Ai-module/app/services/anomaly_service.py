import os
import joblib
import numpy as np
from datetime import datetime
from app.schemas.anomaly import AnomalyDetectRequest, AnomalyDetectResult

MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "anomaly_detector.joblib")
_model_bundle = None


def get_model_bundle():
    global _model_bundle
    if _model_bundle is None:
        if not os.path.exists(MODEL_PATH):
            from app.ml.train_anomaly_model import train_and_save_model
            train_and_save_model()
        _model_bundle = joblib.load(MODEL_PATH)
    return _model_bundle


def format_currency_vi(amount: float) -> str:
    return f"{int(amount):,} ₫".replace(",", ".")


def detect_transaction_anomaly(req: AnomalyDetectRequest) -> AnomalyDetectResult:
    """
    Chạy mô hình Isolation Forest để kiểm tra bất thường và đánh giá mức độ rủi ro
    """
    bundle = get_model_bundle()
    model = bundle['model']
    scaler = bundle['scaler']

    hour = datetime.now().hour
    is_weekend = 1 if datetime.now().weekday() >= 5 else 0

    if req.transaction_date:
        try:
            clean_date = req.transaction_date.replace('Z', '').split('.')[0]
            if 'T' in clean_date:
                dt = datetime.fromisoformat(clean_date)
            else:
                dt = datetime.strptime(clean_date[:19], '%Y-%m-%d %H:%M:%S')
            hour = dt.hour
            is_weekend = 1 if dt.weekday() >= 5 else 0
        except Exception:
            pass

    is_night = 1 if (hour >= 23 or hour <= 5) else 0

    avg_amt = req.avg_category_amount if (req.avg_category_amount and req.avg_category_amount > 0) else None
    if avg_amt:
        amount_ratio = req.amount / avg_amt
    else:
        amount_ratio = 1.0

    safe_amount = max(float(req.amount), 1000.0)
    log_amount = np.log10(safe_amount)

    features = np.array([[log_amount, hour, is_night, amount_ratio, is_weekend]])
    features_scaled = scaler.transform(features)

    raw_score = -model.score_samples(features_scaled)[0]
    is_outlier = bool(model.predict(features_scaled)[0] == -1)

    risk_score = float(np.clip((raw_score - 0.35) / 0.4, 0.05, 0.98))

    if amount_ratio >= 4.0 or (is_night and req.amount >= 2000000):
        risk_score = max(risk_score, 0.78)
        is_outlier = True
    elif amount_ratio >= 2.5:
        risk_score = max(risk_score, 0.58)

    if risk_score >= 0.72:
        risk_level = 'HIGH'
        if amount_ratio >= 3.0:
            anomaly_type = 'AMOUNT_SPIKE'
        elif is_night:
            anomaly_type = 'UNUSUAL_HOUR'
        else:
            anomaly_type = 'EXCESSIVE_DEVIATION'
    elif risk_score >= 0.5:
        risk_level = 'MEDIUM'
        anomaly_type = 'ELEVATED_SPENDING'
    else:
        risk_level = 'NORMAL'
        anomaly_type = None

    formatted_amount = format_currency_vi(req.amount)
    reasons = []

    if amount_ratio >= 3.0 and avg_amt:
        reasons.append(
            f"Khoản chi {formatted_amount} cao gấp {amount_ratio:.1f} lần so với mức trung bình ({format_currency_vi(avg_amt)}) của danh mục '{req.category_name}'."
        )
    elif req.amount >= 5000000:
        reasons.append(f"Khoản chi {formatted_amount} có giá trị lớn đột biến so với dải chi tiêu thông thường.")

    if is_night:
        reasons.append(f"Giao dịch phát sinh vào khung giờ đêm khuya ({hour:02d}:00).")

    if not reasons:
        reasons.append(f"Khoản chi {formatted_amount} nằm trong dải chi tiêu ổn định và an toàn.")

    reason_str = " ".join(reasons)

    if risk_level == 'HIGH':
        suggestion = "Hãy kiểm tra kỹ biên lai hoặc sao kê ngân hàng để đảm bảo bạn không bị tính nhầm tiền hoặc phát sinh giao dịch ngoài ý muốn!"
    elif risk_level == 'MEDIUM':
        suggestion = "Khoản chi này hơi cao hơn thường lệ. Bạn nên cân nhắc hạn mức ngân sách tháng để tránh thâm hụt tài chính."
    else:
        suggestion = "Giao dịch hoàn toàn hợp lệ và an toàn theo thói quen chi tiêu của bạn."

    return AnomalyDetectResult(
        is_anomaly=is_outlier,
        risk_score=round(risk_score, 2),
        risk_level=risk_level,
        anomaly_type=anomaly_type,
        reason=reason_str,
        suggestion=suggestion
    )
