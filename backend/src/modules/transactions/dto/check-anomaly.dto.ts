import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CheckAnomalyDto {
    @ApiProperty({ description: 'Số tiền giao dịch', example: 1500000 })
    @IsNotEmpty({ message: 'Số tiền không được để trống' })
    @IsNumber({}, { message: 'Số tiền phải là số' })
    @IsPositive({ message: 'Số tiền phải lớn hơn 0' })
    amount: number;

    @ApiPropertyOptional({ description: 'ID danh mục' })
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiPropertyOptional({ description: 'Tên danh mục', example: 'Ăn uống' })
    @IsOptional()
    @IsString()
    categoryName?: string;

    @ApiPropertyOptional({ description: 'Thời gian giao dịch', example: '2026-10-18T14:30:00Z' })
    @IsOptional()
    @IsString()
    transactionDate?: string;
}
