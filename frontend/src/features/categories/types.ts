export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string | null;
  isDefault: boolean;
  userId: string | null;
  createdAt: string;
}

export interface CreateCategoryDto {
  name: string;
  type: 'income' | 'expense';
  icon?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  icon?: string;
}
