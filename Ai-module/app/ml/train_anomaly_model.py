import os
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


def generate_synthetic_data(n_samples: int = 2500):
    np.random.seed(42)

    # 1. log_amount: phần lớn giao dịch chi tiêu từ 30.000 đến 500.000 đ
    normal_amounts = np.random.exponential(scale=150000, size=n_samples) + 20000
    normal_amounts = np.clip(normal_amounts, 10000, 2000000)
    log_amounts = np.log10(normal_amounts)

    # 2. hour: chủ yếu 7h đến 22h
    hours = np.random.normal(loc=14, scale=4, size=n_samples)
    hours = np.clip(hours, 0, 23).astype(int)

    # 3. is_night: đêm từ 23h đến 5h
    is_night = np.array([1 if (h >= 23 or h <= 5) else 0 for h in hours])

    # 4. amount_ratio: tỷ lệ so với chi tiêu trung bình của danh mục (thường 0.5 - 1.5)
    amount_ratio = np.random.gamma(shape=2.0, scale=0.5, size=n_samples)
    amount_ratio = np.clip(amount_ratio, 0.2, 2.5)

    # 5. is_weekend: 0 hoặc 1
    is_weekend = np.random.binomial(n=1, p=0.28, size=n_samples)

    # Thêm 5% mẫu ngoại lai (giao dịch bất thường: tiền lớn ban đêm, tỉ lệ vượt 5-10 lần)
    n_outliers = int(n_samples * 0.05)
    outlier_amounts = np.random.uniform(5000000, 50000000, size=n_outliers)
    outlier_log = np.log10(outlier_amounts)
    outlier_hours = np.random.choice([0, 1, 2, 3, 4, 23], size=n_outliers)
    outlier_night = np.ones(n_outliers, dtype=int)
    outlier_ratio = np.random.uniform(4.0, 12.0, size=n_outliers)
    outlier_weekend = np.random.binomial(n=1, p=0.3, size=n_outliers)

    X_normal = np.column_stack([log_amounts, hours, is_night, amount_ratio, is_weekend])
    X_outlier = np.column_stack([outlier_log, outlier_hours, outlier_night, outlier_ratio, outlier_weekend])

    return np.vstack([X_normal, X_outlier])


def train_and_save_model():
    print("Bắt đầu huấn luyện mô hình Isolation Forest phát hiện giao dịch bất thường...")
    X = generate_synthetic_data()

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(
        n_estimators=150,
        contamination=0.05,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_scaled)

    model_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "anomaly_detector.joblib")

    bundle = {
        "model": model,
        "scaler": scaler,
        "feature_names": ["log_amount", "hour", "is_night", "amount_ratio", "is_weekend"],
        "version": "1.0.0",
    }
    joblib.dump(bundle, model_path)
    print(f"Đã lưu mô hình thành công tại: {model_path}")
    return bundle


if __name__ == "__main__":
    train_and_save_model()
