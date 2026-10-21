import { ForbiddenException, Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { UpdateCategoryDto } from './dto/update.category.js';
import { CreateCategoryDto } from './dto/create.category.js';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CategoriesService {
    constructor(
        @InjectRepository(Category)
        private readonly categoryRepository: Repository<Category>,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) {}

    private getCategoryCacheKey(userId: string) {
        return `categories:${userId}`;
    }

    async create (userId: string, dto: CreateCategoryDto): Promise<Category> {
        const category = this.categoryRepository.create({
            ...dto,
            userId,
            isDefault: false, // user thường không được tự tạo category mặc định
        });

        const result = await this.categoryRepository.save(category);
        // Xóa cache của user này để lần sau lấy dữ liệu mới từ DB
        await this.cacheManager.del(this.getCategoryCacheKey(userId));
        return result;
    }

    // Trả về category mặc định (userId null) + category riêng của user này
    // Cache 10 phút - category hiếm khi thay đổi
    async findAll (userId: string): Promise<Category[]> {
        const cacheKey = this.getCategoryCacheKey(userId);
        const cached = await this.cacheManager.get<Category[]>(cacheKey);
        if (cached) return cached;

        const categories = await this.categoryRepository
            .createQueryBuilder('category')
            .where('category.isDefault = true')
            .orWhere('category.userId = :userId', { userId })
            .orderBy('category.isDefault', 'DESC')
            .addOrderBy('category.name', 'ASC')
            .getMany();

        // Cache 10 phút (600.000ms) vì danh mục ít thay đổi
        await this.cacheManager.set(cacheKey, categories, 10 * 60 * 1000);
        return categories;
    }

    async findOne (userId: string, id: string): Promise<Category> {
        const category = await this.categoryRepository.findOne({
            where: { id },
        });

        if (!category) {
            throw new NotFoundException('Không tìm thấy category');
        }

        // Cho xem nếu là mặc định hoặc do chính user tạo
        if (!category.isDefault && category.userId !== userId) {
            throw new ForbiddenException('Bạn không có quyền truy cập category này');
        }

        return category;
    }

    // Tìm category theo tên (case-insensitive) thuộc về user hoặc mặc định
    // Dùng cho AI matchCategory — query thẾ́ng DB thay vì load hết rồi filter trong memory
    findByName (userId: string, name: string, type?: 'income' | 'expense'): Promise<Category | null> {
        const qb = this.categoryRepository
            .createQueryBuilder('category')
            .where('(category.isDefault = true OR category.userId = :userId)', { userId })
            .andWhere('LOWER(category.name) = LOWER(:name)', { name: name.trim() });

        if (type) {
            qb.andWhere('category.type = :type', { type });
        }

        return qb.getOne();
    }

    async update (
        userId: string,
        id: string,
        dto: UpdateCategoryDto,
    ): Promise<Category> {
        const category = await this.findOne(userId, id);

        if (category.isDefault) {
            throw new ForbiddenException('Không thể sửa category mặc định');
        }

        Object.assign(category, dto);

        const result = await this.categoryRepository.save(category);
        // Xóa cache để phản ánh thay đổi
        await this.cacheManager.del(this.getCategoryCacheKey(userId));
        return result;
    }

    async remove (userId: string, id: string): Promise<void> {
        const category = await this.findOne(userId, id);

        if (category.isDefault) {
            throw new ForbiddenException('Không thể xóa category mặc định');
        }

        await this.categoryRepository.remove(category);
        // Xóa cache sau khi xóa category
        await this.cacheManager.del(this.getCategoryCacheKey(userId));
    }
}

