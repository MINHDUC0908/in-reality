import { Module } from '@nestjs/common';
import { WalletsService } from './wallets.service.js';
import { WalletsController } from './wallets.controller.js';
import { Wallet } from './entities/wallet.entity.js';
import { Transaction } from '../transactions/entities/transaction.entity.js';
import { Category } from '../categories/entities/category.entity.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, Transaction, Category]),
    AuthModule,
  ],
  controllers: [WalletsController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule { }

