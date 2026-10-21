import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    Res,
    UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TransactionsService } from './transactions.service.js';
import { CreateTransactionDto } from './dto/create.transaction.js';
import { UpdateTransactionDto } from './dto/update.transaction.js';
import { FilterTransactionDto } from './dto/filter-transaction.dto.js';
import { CurrentUser, type AuthenticatedUser } from '../../common/index.js';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
    constructor(private readonly transactionsService: TransactionsService) {}

    @Post()
    create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTransactionDto) {
        return this.transactionsService.create(user.id, dto);
    }

    @Post('check-anomaly')
    checkAnomaly(
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: any,
    ) {
        return this.transactionsService.checkAnomaly(user.id, dto);
    }

    @Get()
    findAll(
        @CurrentUser() user: AuthenticatedUser,
        @Query() filter: FilterTransactionDto,
    ) {
        return this.transactionsService.findAll(user.id, filter);
    }

    @Get('summary')
    getSummary(
        @CurrentUser() user: AuthenticatedUser,
        @Query('month') month?: string,
        @Query('year') year?: string,
        @Query('period') period?: 'week' | 'month' | 'year',
        @Query('walletId') walletId?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.transactionsService.getSummary(user.id, {
            month: month ? parseInt(month, 10) : undefined,
            year: year ? parseInt(year, 10) : undefined,
            period,
            walletId,
            from,
            to,
        });
    }

    @Get('export/excel')
    async exportExcel(
        @CurrentUser() user: AuthenticatedUser,
        @Query() filter: FilterTransactionDto,
        @Res() res: Response,
    ) {
        const buffer = await this.transactionsService.exportExcel(user.id, filter);
        const filename = `bao-cao-giao-dich-${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${filename}"`,
        );
        res.setHeader('Content-Length', buffer.length);
        return res.end(buffer);
    }

    @Get(':id')
    findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
        return this.transactionsService.findOne(user.id, id);
    }

    @Patch(':id')
    update(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id') id: string,
        @Body() dto: UpdateTransactionDto,
    ) {
        return this.transactionsService.update(user.id, id, dto);
    }

    @Delete(':id')
    remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
        return this.transactionsService.remove(user.id, id);
    }
}