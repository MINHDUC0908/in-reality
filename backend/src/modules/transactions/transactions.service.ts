import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    Inject,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { TransactionsRepository } from './transactions.repository.js';
import { CreateTransactionDto } from './dto/create.transaction.js';
import { Transaction } from './entities/transaction.entity.js';
import { Wallet } from '../wallets/entities/wallet.entity.js';
import { Category } from '../categories/entities/category.entity.js';
import { UpdateTransactionDto } from './dto/update.transaction.js';
import { FilterTransactionDto } from './dto/filter-transaction.dto.js';
import { PaginatedResult } from '../../common/dto/pagination.dto.js';
import * as XLSX from 'xlsx';
import { AiIntegrationService } from '../ai-integration/ai-integration.service.js';
import { CheckAnomalyDto } from './dto/check-anomaly.dto.js';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class TransactionsService {
    constructor (
        private readonly dataSource: DataSource,
        private readonly transactionsRepository: TransactionsRepository,
        private readonly aiIntegrationService: AiIntegrationService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) {}

    // Tạo cache key cho summary dựa trên userId và các bộ lọc
    private getSummaryCacheKey(userId: string, suffix: string): string {
        return `summary:${userId}:${suffix}`;
    }

    // Xóa toàn bộ cache summary của một user khi có thay đổi giao dịch
    private async invalidateSummaryCache(userId: string): Promise<void> {
        // Xóa các cache key phổ biến nhất
        const keysToDelete = [
            this.getSummaryCacheKey(userId, 'week'),
            this.getSummaryCacheKey(userId, 'month'),
            this.getSummaryCacheKey(userId, 'year'),
        ];
        await Promise.all(keysToDelete.map(k => this.cacheManager.del(k)));
    }

    async create (
        userId: string,
        dto: CreateTransactionDto,
        externalManager?: EntityManager,
    ): Promise<Transaction> {
        const execute = async (manager: EntityManager) => {
            // Kiểm tra wallet và khoá dòng với Pessimistic Write Lock để chống Race Condition (Lost Update)
            const wallet = await manager.findOne(Wallet, {
                where: { id: dto.walletId },
                lock: { mode: 'pessimistic_write' },
            });

            if (!wallet || wallet.userId !== userId) {
                throw new ForbiddenException('Ví không hợp lệ');
            }

            // Kiểm tra category hợp lệ (mặc định hoặc của chính user)
            const category = await manager.findOne(Category, {
                where: { id: dto.categoryId },
            });

            if (!category || (!category.isDefault && category.userId !== userId)) {
                throw new BadRequestException('Category không hợp lệ');
            }

            if (category.type !== dto.type) {
                throw new BadRequestException(
                    'Loại giao dịch không khớp với loại category',
                );
            }

            // Tạo transaction
            const transaction = manager.create(Transaction, {
                ...dto,
                userId,
            });
            await manager.save(transaction);

            // Cập nhật balance: expense trừ, income cộng
            const delta =
                dto.type === 'expense' ? -dto.amount : dto.amount;
            wallet.balance = Number(wallet.balance) + delta;
            await manager.save(wallet);

            return transaction;
        };

        if (externalManager) {
            return execute(externalManager);
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const transaction = await execute(queryRunner.manager);
            await queryRunner.commitTransaction();
            // Xóa cache summary để phản ánh giao dịch mới
            await this.invalidateSummaryCache(userId);
            return transaction;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async findAll (
        userId: string,
        filter: FilterTransactionDto,
    ): Promise<PaginatedResult<Transaction>> {
        const page = filter.page ?? 1;
        const limit = filter.limit ?? 10;
        const { data, total } = await this.transactionsRepository.findAllByFilter(userId, filter);
        const totalPages = Math.ceil(total / limit) || 1;

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        };
    }

    async findOne (userId: string, id: string): Promise<Transaction> {
        const transaction = await this.transactionsRepository.findById(id);

        if (!transaction) {
            throw new NotFoundException('Không tìm thấy giao dịch');
        }

        if (transaction.userId !== userId) {
            throw new ForbiddenException('Bạn không có quyền truy cập giao dịch này');
        }

        return transaction;
    }

    async update (
        userId: string,
        id: string,
        dto: UpdateTransactionDto,
    ): Promise<Transaction> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const oldTransaction = await queryRunner.manager.findOne(Transaction, {
                where: { id },
            });

            if (!oldTransaction) {
                throw new NotFoundException('Không tìm thấy giao dịch');
            }

            if (oldTransaction.userId !== userId) {
                throw new ForbiddenException('Bạn không có quyền sửa giao dịch này');
            }

            // Hoàn tác tác động cũ lên wallet cũ - khoá dòng wallet để đảm bảo an toàn số dư
            const oldWallet = await queryRunner.manager.findOne(Wallet, {
                where: { id: oldTransaction.walletId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!oldWallet) {
                throw new NotFoundException('Ví của giao dịch cũ không tồn tại');
            }
            const oldDelta =
                oldTransaction.type === 'expense'
                    ? oldTransaction.amount
                    : -oldTransaction.amount;
            oldWallet.balance = Number(oldWallet.balance) + Number(oldDelta);
            await queryRunner.manager.save(oldWallet);

            // Áp dữ liệu mới (có thể đổi wallet, amount, type)
            const newWalletId = dto.walletId ?? oldTransaction.walletId;
            const newAmount = dto.amount ?? oldTransaction.amount;
            const newType = dto.type ?? oldTransaction.type;

            const newWallet =
                newWalletId === oldWallet.id
                    ? oldWallet
                    : await queryRunner.manager.findOne(Wallet, {
                          where: { id: newWalletId },
                          lock: { mode: 'pessimistic_write' },
                      });

            if (!newWallet || newWallet.userId !== userId) {
                throw new ForbiddenException('Ví không hợp lệ');
            }

            const newDelta = newType === 'expense' ? -newAmount : newAmount;
            newWallet.balance = Number(newWallet.balance) + Number(newDelta);
            await queryRunner.manager.save(newWallet);

            Object.assign(oldTransaction, dto);
            await queryRunner.manager.save(oldTransaction);

            await queryRunner.commitTransaction();
            // Xóa cache summary sau khi cập nhật giao dịch
            await this.invalidateSummaryCache(userId);

            return oldTransaction;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async remove (userId: string, id: string): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const transaction = await queryRunner.manager.findOne(Transaction, {
                where: { id },
            });

            if (!transaction) {
                throw new NotFoundException('Không tìm thấy giao dịch');
            }

            if (transaction.userId !== userId) {
                throw new ForbiddenException('Bạn không có quyền xóa giao dịch này');
            }

            // Hoàn tác tác động lên wallet trước khi xóa - khoá dòng wallet với pessimistic_write
            const wallet = await queryRunner.manager.findOne(Wallet, {
                where: { id: transaction.walletId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!wallet) {
                throw new NotFoundException('Ví của giao dịch không tồn tại');
            }
            const delta =
                transaction.type === 'expense'
                    ? transaction.amount
                    : -transaction.amount;
            wallet.balance = Number(wallet.balance) + Number(delta);
            await queryRunner.manager.save(wallet);

            await queryRunner.manager.remove(transaction);

            await queryRunner.commitTransaction();
            // Xóa cache summary sau khi xóa giao dịch
            await this.invalidateSummaryCache(userId);
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async getSummary(userId: string, options: {
        month?: number;
        year?: number;
        period?: 'week' | 'month' | 'year';
        walletId?: string;
        from?: string;
        to?: string;
    }) {
        // Tạo cache key từ tổ hợp tất cả các bộ lọc
        const period = options.period ?? 'month';
        const walletPart = options.walletId ? `:wallet=${options.walletId}` : '';
        const fromPart = options.from ? `:from=${options.from}` : '';
        const toPart = options.to ? `:to=${options.to}` : '';
        const monthPart = options.month ? `:m=${options.month}` : '';
        const yearPart = options.year ? `:y=${options.year}` : '';
        const cacheKey = this.getSummaryCacheKey(
            userId,
            `${period}${walletPart}${fromPart}${toPart}${monthPart}${yearPart}`,
        );

        const cached = await this.cacheManager.get(cacheKey);
        if (cached) return cached;

        const result = await this.transactionsRepository.getSummary(userId, options);
        // Cache 2 phút — đủ nhanh để phản ánh giao dịch mới, đủ nhẹ cho DB
        await this.cacheManager.set(cacheKey, result, 2 * 60 * 1000);
        return result;
    }

    async getMonthlySummary (userId: string, month: number, year: number) {
        return this.getSummary(userId, { month, year, period: 'month' });
    }

    async exportExcel(userId: string, filter: FilterTransactionDto): Promise<Buffer> {
        const { data } = await this.transactionsRepository.findAllByFilter(userId, {
            ...filter,
            page: 1,
            limit: 10000,
        });

        const rows = data.map((t, idx) => ({
            STT: idx + 1,
            'Mã giao dịch': t.id,
            'Ngày giao dịch': t.transactionDate ? new Date(t.transactionDate).toISOString().slice(0, 10) : '',
            'Loại': t.type === 'expense' ? 'Chi tiêu' : 'Thu nhập',
            'Số tiền (VNĐ)': Number(t.amount),
            'Danh mục': t.category?.name || 'Chưa phân loại',
            'Ví thanh toán': t.wallet?.name || 'Ví mặc định',
            'Ghi chú': t.description || '',
            'Ngày tạo': t.createdAt ? new Date(t.createdAt).toISOString() : '',
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);

        ws['!cols'] = [
            { wch: 6 },
            { wch: 38 },
            { wch: 15 },
            { wch: 12 },
            { wch: 18 },
            { wch: 22 },
            { wch: 20 },
            { wch: 30 },
            { wch: 22 },
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Giao dịch');
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }

    /**
     * Kiểm tra giao dịch bất thường bằng mô hình AI Machine Learning (Isolation Forest)
     */
    async checkAnomaly(userId: string, dto: CheckAnomalyDto) {
        let categoryName = dto.categoryName || 'Khác';
        let avgAmount: number | undefined = undefined;
        let maxAmount: number | undefined = undefined;

        if (dto.categoryId) {
            const category = await this.dataSource.getRepository(Category).findOne({
                where: { id: dto.categoryId },
            });
            if (category) {
                categoryName = category.name;
            }

            // Tính toán mức chi tiêu trung bình và lớn nhất của user trong danh mục này
            const stats = await this.dataSource
                .getRepository(Transaction)
                .createQueryBuilder('tx')
                .select('AVG(tx.amount)', 'avgAmount')
                .addSelect('MAX(tx.amount)', 'maxAmount')
                .where('tx.userId = :userId', { userId })
                .andWhere('tx.categoryId = :categoryId', { categoryId: dto.categoryId })
                .getRawOne();

            if (stats && stats.avgAmount) {
                avgAmount = parseFloat(stats.avgAmount);
                maxAmount = parseFloat(stats.maxAmount);
            }
        }

        return this.aiIntegrationService.detectAnomaly({
            amount: dto.amount,
            category_id: dto.categoryId,
            category_name: categoryName,
            transaction_date: dto.transactionDate,
            avg_category_amount: avgAmount,
            max_category_amount: maxAmount,
        });
    }
}