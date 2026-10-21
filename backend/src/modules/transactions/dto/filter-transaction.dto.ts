import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export class FilterTransactionDto extends PaginationDto {
    @IsOptional()
    @IsUUID('4', { message: 'walletId phải là UUID hợp lệ' })
    walletId?: string;

    @IsOptional()
    @IsEnum(['income', 'expense'], { message: 'type phải là income hoặc expense' })
    type?: 'income' | 'expense';

    @IsOptional()
    @IsUUID('4', { message: 'categoryId phải là UUID hợp lệ' })
    categoryId?: string;

    @IsOptional()
    @IsString({ message: 'keyword phải là chuỗi ký tự' })
    keyword?: string;

    @IsOptional()
    @IsDateString({}, { message: 'from phải là định dạng ngày hợp lệ (YYYY-MM-DD)' })
    from?: string;

    @IsOptional()
    @IsDateString({}, { message: 'to phải là định dạng ngày hợp lệ (YYYY-MM-DD)' })
    to?: string;
}
