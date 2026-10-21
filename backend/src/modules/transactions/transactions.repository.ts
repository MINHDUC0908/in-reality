import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity.js';
import { FilterTransactionDto } from './dto/filter-transaction.dto.js';

@Injectable()
export class TransactionsRepository {
    constructor (
        @InjectRepository(Transaction)
        private readonly repository: Repository<Transaction>,
    ) {}

    async findAllByFilter (
        userId: string,
        filter: FilterTransactionDto,
    ): Promise<{ data: Transaction[]; total: number }> {
        const page = filter.page ?? 1;
        const limit = filter.limit ?? 10;
        const skip = (page - 1) * limit;

        const query = this.repository
            .createQueryBuilder('transaction')
            .leftJoinAndSelect('transaction.category', 'category')
            .leftJoinAndSelect('transaction.wallet', 'wallet')
            .where('transaction.userId = :userId', { userId });

        if (filter.walletId) {
            query.andWhere('transaction.walletId = :walletId', {
                walletId: filter.walletId,
            });
        }

        if (filter.type) {
            query.andWhere('transaction.type = :type', { type: filter.type });
        }

        if (filter.categoryId) {
            query.andWhere('transaction.categoryId = :categoryId', {
                categoryId: filter.categoryId,
            });
        }

        if (filter.keyword) {
            query.andWhere('transaction.description LIKE :keyword', {
                keyword: `%${filter.keyword}%`,
            });
        }

        if (filter.from && filter.to) {
            query.andWhere(
                'transaction.transactionDate BETWEEN :from AND :to',
                { from: filter.from, to: filter.to },
            );
        } else if (filter.from) {
            query.andWhere('transaction.transactionDate >= :from', { from: filter.from });
        } else if (filter.to) {
            query.andWhere('transaction.transactionDate <= :to', { to: filter.to });
        }

        const [data, total] = await query
            .orderBy('transaction.transactionDate', 'DESC')
            .addOrderBy('transaction.createdAt', 'DESC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        return { data, total };
    }

    findById (id: string): Promise<Transaction | null> {
        return this.repository.findOne({
            where: { id },
            relations: { category: true, wallet: true },
        });
    }

    // Tổng thu/chi group theo category - hỗ trợ lọc linh hoạt theo Tuần, Tháng, Năm, Khoảng ngày, và Ví
    async getSummary(userId: string, options: {
        month?: number;
        year?: number;
        period?: 'week' | 'month' | 'year';
        walletId?: string;
        from?: string;
        to?: string;
    }) {
        const now = new Date();
        let formattedStart: string;
        let formattedEnd: string;

        if (options.from && options.to) {
            formattedStart = options.from;
            const toDate = new Date(options.to);
            toDate.setDate(toDate.getDate() + 1);
            formattedEnd = toDate.toISOString().slice(0, 10);
        } else if (options.period === 'week') {
            const day = now.getDay();
            const diffToMonday = day === 0 ? -6 : 1 - day;
            const monday = new Date(now);
            monday.setDate(now.getDate() + diffToMonday);
            formattedStart = monday.toISOString().slice(0, 10);

            const nextMonday = new Date(monday);
            nextMonday.setDate(monday.getDate() + 7);
            formattedEnd = nextMonday.toISOString().slice(0, 10);
        } else if (options.period === 'year') {
            const targetYear = options.year ?? now.getFullYear();
            formattedStart = `${targetYear}-01-01`;
            formattedEnd = `${targetYear + 1}-01-01`;
        } else {
            // Mặc định hoặc period === 'month'
            const targetYear = options.year ?? now.getFullYear();
            const targetMonth = options.month ?? (now.getMonth() + 1);
            formattedStart = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
            const nextYear = targetMonth === 12 ? targetYear + 1 : targetYear;
            const nextMonth = targetMonth === 12 ? 1 : targetMonth + 1;
            formattedEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
        }

        const qb = this.repository
            .createQueryBuilder('transaction')
            .select('transaction.categoryId', 'categoryId')
            .addSelect('category.name', 'categoryName')
            .addSelect('transaction.type', 'type')
            .addSelect('SUM(transaction.amount)', 'total')
            .leftJoin('transaction.category', 'category')
            .where('transaction.userId = :userId', { userId })
            .andWhere('transaction.transactionDate >= :startDate', { startDate: formattedStart })
            .andWhere('transaction.transactionDate < :endDate', { endDate: formattedEnd });

        if (options.walletId && options.walletId !== 'all') {
            qb.andWhere('transaction.walletId = :walletId', { walletId: options.walletId });
        }

        return qb
            .groupBy('transaction.categoryId')
            .addGroupBy('category.name')
            .addGroupBy('transaction.type')
            .getRawMany();
    }

    // Tương thích ngược: Tổng thu/chi group theo category trong 1 tháng
    async getMonthlySummary (userId: string, month: number, year: number) {
        return this.getSummary(userId, { month, year, period: 'month' });
    }
}