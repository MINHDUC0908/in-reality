import {
    BadGatewayException,
    GatewayTimeoutException,
    Injectable,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AiAnalyzeResult {
    ocr: {
        merchant_name: string | null;
        total_amount: number | null;
        transaction_date: string | null;
        items: { name: string; price: number; quantity: number }[];
        raw_text: string;
    };
    classification: {
        category: string;
        confidence_score: number;
        source: string;
    };
}

export interface UserCategoryHint {
    id: string;
    name: string;
}

@Injectable()
export class AiIntegrationService {
    private readonly logger = new Logger(AiIntegrationService.name);

    constructor(private readonly configService: ConfigService) { }

    async analyzeReceipt(
        imageUrl: string,
        categories?: UserCategoryHint[],
    ): Promise<AiAnalyzeResult> {
        const baseUrl = this.configService.get<string>('aiService.url');
        const timeout = this.configService.get<number>('aiService.timeout') ?? 30000;

        const startTime = Date.now();
        this.logger.log(`Bắt đầu gửi ảnh sang AI service: ${imageUrl}`);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(`${baseUrl}/receipt/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_url: imageUrl,
                    user_categories: categories ?? [],
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const detail = await response.text();
                this.logger.error(`AI service phản hồi lỗi [${response.status}]: ${detail}`);
                throw new BadGatewayException(`AI service lỗi: ${detail}`);
            }

            const data = (await response.json()) as AiAnalyzeResult;
            const duration = Date.now() - startTime;
            this.logger.log(`AI service xử lý thành công trong ${duration}ms`);

            return data;
        } catch (error: any) {
            if (error instanceof BadGatewayException) {
                throw error;
            }

            // Phân biệt Timeout (504) và Lỗi kết nối (502)
            if (error.name === 'AbortError') {
                this.logger.error(`AI service timeout sau ${timeout}ms`);
                throw new GatewayTimeoutException(
                    `AI service phản hồi quá lâu (vượt quá ${timeout / 1000}s)`,
                );
            }

            this.logger.error(`Không thể kết nối đến AI service: ${error.message}`);
            throw new BadGatewayException('Không thể kết nối đến AI service');
        } finally {
            clearTimeout(timer);
        }
    }

    /**
     * Gọi AI Service để phát hiện chi tiêu bất thường dựa trên mô hình Machine Learning
     * Có fallback an toàn: Nếu AI service bận hoặc mất kết nối thì tự động trả về kết quả an toàn (NORMAL)
     * để không làm gián đoạn trải nghiệm của người dùng.
     */
    async detectAnomaly(payload: {
        amount: number;
        category_id?: string;
        category_name?: string;
        transaction_date?: string;
        avg_category_amount?: number;
        max_category_amount?: number;
    }): Promise<{
        is_anomaly: boolean;
        risk_score: number;
        risk_level: 'NORMAL' | 'MEDIUM' | 'HIGH';
        anomaly_type: string | null;
        reason: string;
        suggestion: string;
    }> {
        const baseUrl = this.configService.get<string>('aiService.url');
        const timeout = 6000; // Timeout nhanh 6s để không ảnh hưởng UX

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(`${baseUrl}/anomaly/detect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });

            if (!response.ok) {
                const detail = await response.text();
                this.logger.warn(`AI Anomaly check phản hồi mã [${response.status}]: ${detail}`);
                return this.getFallbackAnomalyResult(payload.amount);
            }

            const data = await response.json();
            return data;
        } catch (error: any) {
            this.logger.warn(`Không thể kết nối đến AI Anomaly service (${error.message}). Dùng fallback an toàn.`);
            return this.getFallbackAnomalyResult(payload.amount);
        } finally {
            clearTimeout(timer);
        }
    }

    /**
     * Cơ chế Fallback an toàn dựa trên heuristic đơn giản khi AI service chưa sẵn sàng
     */
    private getFallbackAnomalyResult(amount: number) {
        // Nếu số tiền >= 15 triệu, cảnh báo nhẹ để người dùng chú ý
        if (amount >= 15000000) {
            return {
                is_anomaly: true,
                risk_score: 0.75,
                risk_level: 'HIGH' as const,
                anomaly_type: 'AMOUNT_SPIKE',
                reason: `Khoản chi ${amount.toLocaleString('vi-VN')} ₫ có giá trị lớn đột biến.`,
                suggestion: 'Hãy kiểm tra kỹ thông tin giao dịch để đảm bảo độ chính xác.',
            };
        }

        if (amount >= 5000000) {
            return {
                is_anomaly: false,
                risk_score: 0.55,
                risk_level: 'MEDIUM' as const,
                anomaly_type: 'ELEVATED_SPENDING',
                reason: `Khoản chi ${amount.toLocaleString('vi-VN')} ₫ hơi cao so với mức thông thường.`,
                suggestion: 'Bạn nên cân nhắc hạn mức ngân sách tháng để tránh thâm hụt tài chính.',
            };
        }

        return {
            is_anomaly: false,
            risk_score: 0.1,
            risk_level: 'NORMAL' as const,
            anomaly_type: null,
            reason: 'Giao dịch an toàn và phù hợp với thói quen chi tiêu thông thường.',
            suggestion: 'Giao dịch hoàn toàn hợp lệ.',
        };
    }
}
