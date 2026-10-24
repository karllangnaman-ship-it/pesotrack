import {
  DEFAULT_GROCERY_CATEGORIES,
  GroceryCategory,
  GroceryItem,
} from '../types/finance';
import { addPHP, fromCentavos, roundPHP, toCentavos } from './currency';

export interface GrocerySummary {
  estimatedTotal: number;
  totalCount: number;
  checkedCount: number;
  checkedPercent: number;
  purchasedTotal: number;
  remainingEstimatedCost: number;
  recordedAsExpenseCount: number;
  unrecordedPurchasedCount: number;
  unrecordedPurchasedTotal: number;
}

export interface CategorySummaryItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  isCustom?: boolean;
  itemCount: number;
  totalCost: number;
  purchasedCount: number;
}

export const DEFAULT_GROCERY_ITEMS: GroceryItem[] = [
  {
    id: 'groc_rice',
    name: 'Rice',
    category: 'Grains',
    quantity: 5,
    unit: 'kg',
    estimatedPrice: 50,
    estimatedTotal: 250,
    isPurchased: true,
    purchasedDate: '2026-10-15',
    createdAt: '2026-10-15T08:00:00.000Z',
    updatedAt: '2026-10-15T08:00:00.000Z',
  },
  {
    id: 'groc_eggs',
    name: 'Eggs',
    category: 'Dairy',
    quantity: 1,
    unit: 'tray',
    estimatedPrice: 180,
    estimatedTotal: 180,
    isPurchased: true,
    purchasedDate: '2026-10-15',
    createdAt: '2026-10-15T08:05:00.000Z',
    updatedAt: '2026-10-15T08:05:00.000Z',
  },
  {
    id: 'groc_milk',
    name: 'Milk',
    category: 'Dairy',
    quantity: 1,
    unit: 'liter',
    estimatedPrice: 120,
    estimatedTotal: 120,
    isPurchased: false,
    createdAt: '2026-10-15T08:10:00.000Z',
    updatedAt: '2026-10-15T08:10:00.000Z',
  },
  {
    id: 'groc_chicken',
    name: 'Chicken',
    category: 'Meat',
    quantity: 1,
    unit: 'kg',
    estimatedPrice: 250,
    estimatedTotal: 250,
    isPurchased: true,
    purchasedDate: '2026-10-15',
    createdAt: '2026-10-15T08:15:00.000Z',
    updatedAt: '2026-10-15T08:15:00.000Z',
  },
  {
    id: 'groc_broccoli',
    name: 'Broccoli',
    category: 'Vegetables',
    quantity: 500,
    unit: 'g',
    estimatedPrice: 0.18,
    estimatedTotal: 90,
    isPurchased: false,
    createdAt: '2026-10-15T08:20:00.000Z',
    updatedAt: '2026-10-15T08:20:00.000Z',
  },
  {
    id: 'groc_tomatoes',
    name: 'Tomatoes',
    category: 'Vegetables',
    quantity: 1,
    unit: 'kg',
    estimatedPrice: 60,
    estimatedTotal: 60,
    isPurchased: false,
    createdAt: '2026-10-15T08:25:00.000Z',
    updatedAt: '2026-10-15T08:25:00.000Z',
  },
  {
    id: 'groc_bananas',
    name: 'Bananas',
    category: 'Fruits',
    quantity: 1,
    unit: 'kg',
    estimatedPrice: 80,
    estimatedTotal: 80,
    isPurchased: true,
    purchasedDate: '2026-10-15',
    createdAt: '2026-10-15T08:30:00.000Z',
    updatedAt: '2026-10-15T08:30:00.000Z',
  },
  {
    id: 'groc_cooking_oil',
    name: 'Cooking Oil',
    category: 'Condiments',
    quantity: 1,
    unit: 'bottle',
    estimatedPrice: 220,
    estimatedTotal: 220,
    isPurchased: false,
    createdAt: '2026-10-15T08:35:00.000Z',
    updatedAt: '2026-10-15T08:35:00.000Z',
  },
];

export function getCategoryIcon(
  categoryName: string,
  categories: GroceryCategory[] = DEFAULT_GROCERY_CATEGORIES
): string {
  const match = categories.find(
    (c) => c.name.toLowerCase() === categoryName.trim().toLowerCase()
  );
  if (match?.icon) return match.icon;

  const defaultMatch = DEFAULT_GROCERY_CATEGORIES.find(
    (c) => c.name.toLowerCase() === categoryName.trim().toLowerCase()
  );
  if (defaultMatch?.icon) return defaultMatch.icon;

  // Keyword-based fallback
  const lower = categoryName.toLowerCase();
  if (lower.includes('fruit') || lower.includes('apple') || lower.includes('banana')) return '🍎';
  if (lower.includes('veg') || lower.includes('salad') || lower.includes('carrot')) return '🥦';
  if (lower.includes('meat') || lower.includes('pork') || lower.includes('beef') || lower.includes('chicken')) return '🥩';
  if (lower.includes('dairy') || lower.includes('milk') || lower.includes('cheese') || lower.includes('egg')) return '🥛';
  if (lower.includes('grain') || lower.includes('rice') || lower.includes('bread') || lower.includes('pasta')) return '🍚';
  if (lower.includes('condiment') || lower.includes('sauce') || lower.includes('oil') || lower.includes('spice')) return '🧂';
  if (lower.includes('snack') || lower.includes('chip') || lower.includes('cookie') || lower.includes('candy')) return '🍿';
  if (lower.includes('drink') || lower.includes('beverage') || lower.includes('juice') || lower.includes('soda') || lower.includes('water')) return '🥤';
  if (lower.includes('house') || lower.includes('clean') || lower.includes('soap') || lower.includes('tissue')) return '🧼';

  return '📦';
}

export function calculateEstimatedItemTotal(quantity: number, estimatedPrice: number): number {
  const q = Math.max(0, Number(quantity) || 0);
  const p = Math.max(0, Number(estimatedPrice) || 0);
  // Accurate centavos rounding to avoid float imprecision
  const total = (toCentavos(p) * q) / 100;
  return roundPHP(total);
}

export function calculateGrocerySummary(items: GroceryItem[]): GrocerySummary {
  const activeItems = items.filter((i) => !i.isDeleted);
  let totalCentavos = 0;
  let purchasedCentavos = 0;
  let remainingCentavos = 0;
  let unrecordedPurchasedCentavos = 0;

  let checkedCount = 0;
  let recordedCount = 0;
  let unrecordedPurchasedCount = 0;

  for (const item of activeItems) {
    const itemTotalCentavos = toCentavos(item.estimatedTotal);
    totalCentavos += itemTotalCentavos;

    if (item.isPurchased) {
      checkedCount++;
      purchasedCentavos += itemTotalCentavos;
      if (item.isRecordedAsExpense) {
        recordedCount++;
      } else {
        unrecordedPurchasedCount++;
        unrecordedPurchasedCentavos += itemTotalCentavos;
      }
    } else {
      remainingCentavos += itemTotalCentavos;
    }
  }

  const totalCount = activeItems.length;
  const checkedPercent = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  return {
    estimatedTotal: fromCentavos(totalCentavos),
    totalCount,
    checkedCount,
    checkedPercent: Math.min(100, Math.round(checkedPercent)),
    purchasedTotal: fromCentavos(purchasedCentavos),
    remainingEstimatedCost: fromCentavos(remainingCentavos),
    recordedAsExpenseCount: recordedCount,
    unrecordedPurchasedCount,
    unrecordedPurchasedTotal: fromCentavos(unrecordedPurchasedCentavos),
  };
}

export function calculateCategorySummaries(
  categories: GroceryCategory[],
  items: GroceryItem[]
): CategorySummaryItem[] {
  const activeItems = items.filter((i) => !i.isDeleted);

  // Map of category name to items
  const itemsByCategory = new Map<string, GroceryItem[]>();
  for (const item of activeItems) {
    const key = item.category.trim();
    const existing = itemsByCategory.get(key) || [];
    existing.push(item);
    itemsByCategory.set(key, existing);
  }

  // Combine user categories and any orphaned custom category strings that exist in items
  const allCategoryNames = new Set(categories.map((c) => c.name));
  for (const key of itemsByCategory.keys()) {
    allCategoryNames.add(key);
  }

  const summaries: CategorySummaryItem[] = [];

  for (const cat of categories) {
    const catItems = itemsByCategory.get(cat.name) || [];
    const totalCentavos = catItems.reduce(
      (sum, item) => sum + toCentavos(item.estimatedTotal),
      0
    );
    const purchased = catItems.filter((i) => i.isPurchased).length;

    summaries.push({
      id: cat.id,
      name: cat.name,
      icon: cat.icon || getCategoryIcon(cat.name, categories),
      description: cat.description || `${cat.name} grocery items`,
      isCustom: cat.isCustom,
      itemCount: catItems.length,
      totalCost: fromCentavos(totalCentavos),
      purchasedCount: purchased,
    });
  }

  // Any non-registered category found in items
  for (const key of itemsByCategory.keys()) {
    if (!categories.some((c) => c.name.toLowerCase() === key.toLowerCase())) {
      const catItems = itemsByCategory.get(key) || [];
      const totalCentavos = catItems.reduce(
        (sum, item) => sum + toCentavos(item.estimatedTotal),
        0
      );
      summaries.push({
        id: `custom_${key.toLowerCase().replace(/\s+/g, '_')}`,
        name: key,
        icon: getCategoryIcon(key, categories),
        description: `Custom category: ${key}`,
        isCustom: true,
        itemCount: catItems.length,
        totalCost: fromCentavos(totalCentavos),
        purchasedCount: catItems.filter((i) => i.isPurchased).length,
      });
    }
  }

  return summaries;
}
