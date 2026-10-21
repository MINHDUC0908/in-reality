import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../modules/users/entities/user.entity.js';
import { Wallet } from '../modules/wallets/entities/wallet.entity.js';
import { Category } from '../modules/categories/entities/category.entity.js';
import { Transaction } from '../modules/transactions/entities/transaction.entity.js';
import { Budget } from '../modules/budgets/entities/budget.entity.js';
import { Receipt } from '../modules/receipts/entities/receipts.entity.js';
import { TransactionAiMeta } from '../modules/receipts/entities/transaction-ai-meta.entity.js';

export default registerAs(
    'database',
    (): TypeOrmModuleOptions => ({
        type: 'mysql',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '3306', 10),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,

        entities: [User, Wallet, Category, Transaction, Budget, Receipt, TransactionAiMeta],

        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV === 'development',
        retryAttempts: 5,
        retryDelay: 3000,
        charset: 'utf8mb4',

        // Cấu hình Connection Pool cho MySQL (tối ưu xử lý song song & chống nghẽn)
        extra: {
            connectionLimit: 20,      // Cho phép tối đa 20 kết nối đồng thời
            waitForConnections: true, // Xếp hàng chờ khi hết kết nối rảnh thay vì báo lỗi
            queueLimit: 0,            // Không giới hạn số lượng request trong hàng đợi
            connectTimeout: 10000,    // Hết hạn kết nối sau 10 giây nếu MySQL không phản hồi
        },
    }),
);