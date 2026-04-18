export enum ItemCategory {
  UNSPECIFIED = 0,
  DECOR = 1,
  COSMETICS = 2,
  AMBIENT = 3,
  PETS = 4,
  GUILD = 5,
  SEASONAL = 6,
}

export enum ItemRarity {
  UNSPECIFIED = 0,
  COMMON = 1,
  UNCOMMON = 2,
  RARE = 3,
  EPIC = 4,
  LEGENDARY = 5,
}

export enum ItemCurrency {
  UNSPECIFIED = 0,
  GOLD = 1,
  GEMS = 2,
  SHARDS = 3,
}

export interface ShopItem {
  id: string
  slug: string
  name: string
  description: string
  category: ItemCategory
  rarity: ItemRarity
  currency: ItemCurrency
  price: number
  iconRef: string
  accentColor: string
  isActive: boolean
  isSeasonal: boolean
  rotatesAt?: string
}

export interface ShopCategoryInfo {
  category: ItemCategory
  name: string
  itemCount: number
}

export interface OwnedItem {
  item: ShopItem
  acquiredAt: string
  equipped: boolean
}

export interface ListItemsResponse {
  items: ShopItem[]
  total: number
}

export interface PurchaseResponse {
  item: OwnedItem
  remainingGold: number
  remainingGems: number
}

export const rarityLabel: Record<ItemRarity, string> = {
  [ItemRarity.UNSPECIFIED]: 'common',
  [ItemRarity.COMMON]: 'common',
  [ItemRarity.UNCOMMON]: 'uncommon',
  [ItemRarity.RARE]: 'rare',
  [ItemRarity.EPIC]: 'epic',
  [ItemRarity.LEGENDARY]: 'legendary',
}

export const categoryLabel: Record<ItemCategory, string> = {
  [ItemCategory.UNSPECIFIED]: 'misc',
  [ItemCategory.DECOR]: 'decor',
  [ItemCategory.COSMETICS]: 'cosmetics',
  [ItemCategory.AMBIENT]: 'ambient',
  [ItemCategory.PETS]: 'pets',
  [ItemCategory.GUILD]: 'guild',
  [ItemCategory.SEASONAL]: 'seasonal',
}
