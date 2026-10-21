import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class TransferWalletDto {
    @IsUUID('4', { message: 'fromWalletId phải là UUID hợp lệ' })
    fromWalletId: string;

    @IsUUID('4', { message: 'toWalletId phải là UUID hợp lệ' })
    toWalletId: string;

    @Type(() => Number)
    @IsNumber({}, { message: 'amount phải là số' })
    @Min(1, { message: 'Số tiền chuyển tối thiểu là 1' })
    amount: number;

    @IsOptional()
    @IsString({ message: 'note phải là chuỗi ký tự' })
    note?: string;

    @IsOptional()
    @IsDateString({}, { message: 'date phải là định dạng YYYY-MM-DD' })
    date?: string;
}
