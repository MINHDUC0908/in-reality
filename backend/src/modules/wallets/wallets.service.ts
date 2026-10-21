import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Wallet } from './entities/wallet.entity.js';
import { DataSource, Repository } from 'typeorm';
import { CreateWalletDto } from './dto/create.wallet.dto.js';
import { UpdateWalletDto } from './dto/update.wallet.dto.js';
import { TransferWalletDto } from './dto/transfer.wallet.dto.js';
import { Transaction } from '../transactions/entities/transaction.entity.js';
import { Category } from '../categories/entities/category.entity.js';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class WalletsService {
    constructor(
        @InjectRepository(Wallet)
        private readonly walletRepository: Repository<Wallet>,
        private readonly dataSource: DataSource,
    ) { }

    async create(userId: string, dto: CreateWalletDto): Promise<Wallet> {
        const wallet = this.walletRepository.create({
            ...dto,
            userId,
        });

        return this.walletRepository.save(wallet);
    }

    // Chỉ lấy ví của user đang login
    async findAll(userId: string): Promise<Wallet[]> {
        return this.walletRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(userId: string, id: string): Promise<Wallet> {
        const wallet = await this.walletRepository.findOne({
            where: { id },
        });

        if (!wallet) {
            throw new NotFoundException('Không tìm thấy ví');
        }

        // Chặn xem ví của người khác dù biết id
        if (wallet.userId !== userId) {
            throw new ForbiddenException('Bạn không có quyền truy cập ví này');
        }

        return wallet;
    }

    async update(
        userId: string,
        id: string,
        dto: UpdateWalletDto,
    ): Promise<Wallet> {
        const wallet = await this.findOne(userId, id); // đã check quyền sở hữu

        Object.assign(wallet, dto);

        return this.walletRepository.save(wallet);
    }

    async remove(userId: string, id: string): Promise<void> {
        const wallet = await this.findOne(userId, id); // đã check quyền sở hữu

        await this.walletRepository.remove(wallet);
    }

    async transfer(userId: string, dto: TransferWalletDto) {
        if (dto.fromWalletId === dto.toWalletId) {
            throw new BadRequestException('Ví nguồn và ví đích không được trùng nhau');
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Sắp xếp ID để khoá hàng theo thứ tự cố định, tránh Deadlock
            const [firstId, secondId] =
                dto.fromWalletId < dto.toWalletId
                    ? [dto.fromWalletId, dto.toWalletId]
                    : [dto.toWalletId, dto.fromWalletId];

            const firstWallet = await queryRunner.manager.findOne(Wallet, {
                where: { id: firstId },
                lock: { mode: 'pessimistic_write' },
            });
            const secondWallet = await queryRunner.manager.findOne(Wallet, {
                where: { id: secondId },
                lock: { mode: 'pessimistic_write' },
            });

            if (!firstWallet || !secondWallet) {
                throw new NotFoundException('Không tìm thấy ví chuyển hoặc ví nhận');
            }

            if (firstWallet.userId !== userId || secondWallet.userId !== userId) {
                throw new ForbiddenException('Bạn không sở hữu cả hai ví này');
            }

            const fromWallet = firstWallet.id === dto.fromWalletId ? firstWallet : secondWallet;
            const toWallet = firstWallet.id === dto.toWalletId ? firstWallet : secondWallet;

            if (Number(fromWallet.balance) < Number(dto.amount)) {
                throw new BadRequestException('Số dư ví nguồn không đủ để thực hiện chuyển tiền');
            }

            // Tìm hoặc tạo category chuyển tiền
            let expenseCat = await queryRunner.manager.findOne(Category, {
                where: [
                    { name: 'Chuyển tiền', type: 'expense', userId },
                    { name: 'Chuyển tiền', type: 'expense', isDefault: true },
                ],
            });
            if (!expenseCat) {
                expenseCat = queryRunner.manager.create(Category, {
                    name: 'Chuyển tiền',
                    type: 'expense',
                    userId,
                    icon: 'swap-horizontal',
                    isDefault: false,
                });
                await queryRunner.manager.save(expenseCat);
            }

            let incomeCat = await queryRunner.manager.findOne(Category, {
                where: [
                    { name: 'Nhận chuyển tiền', type: 'income', userId },
                    { name: 'Nhận chuyển tiền', type: 'income', isDefault: true },
                ],
            });
            if (!incomeCat) {
                incomeCat = queryRunner.manager.create(Category, {
                    name: 'Nhận chuyển tiền',
                    type: 'income',
                    userId,
                    icon: 'swap-horizontal',
                    isDefault: false,
                });
                await queryRunner.manager.save(incomeCat);
            }

            const txDate = dto.date || new Date().toISOString().slice(0, 10);
            const noteText = dto.note ? ` - ${dto.note}` : '';

            // Tạo giao dịch trừ tiền ở ví nguồn
            const txExpense = queryRunner.manager.create(Transaction, {
                userId,
                walletId: fromWallet.id,
                categoryId: expenseCat.id,
                amount: dto.amount,
                type: 'expense',
                description: `Chuyển sang ${toWallet.name}${noteText}`,
                transactionDate: new Date(txDate),
            });
            await queryRunner.manager.save(txExpense);

            // Tạo giao dịch nhận tiền ở ví đích
            const txIncome = queryRunner.manager.create(Transaction, {
                userId,
                walletId: toWallet.id,
                categoryId: incomeCat.id,
                amount: dto.amount,
                type: 'income',
                description: `Nhận từ ${fromWallet.name}${noteText}`,
                transactionDate: new Date(txDate),
            });
            await queryRunner.manager.save(txIncome);

            // Cập nhật số dư 2 ví
            fromWallet.balance = Number(fromWallet.balance) - Number(dto.amount);
            toWallet.balance = Number(toWallet.balance) + Number(dto.amount);
            await queryRunner.manager.save(fromWallet);
            await queryRunner.manager.save(toWallet);

            await queryRunner.commitTransaction();

            return {
                message: 'Chuyển tiền thành công',
                fromWallet,
                toWallet,
                expenseTransactionId: txExpense.id,
                incomeTransactionId: txIncome.id,
            };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}
