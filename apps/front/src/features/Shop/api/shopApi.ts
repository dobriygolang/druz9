import { apiClient } from '@/shared/api/base'
import type {
  ShopItem,
  ShopCategoryInfo,
  OwnedItem,
  ListItemsResponse,
  PurchaseResponse,
} from '../model/types'
import { ItemCategory, ItemRarity } from '../model/types'

export const shopApi = {
  listCategories: async (): Promise<ShopCategoryInfo[]> => {
    const { data } = await apiClient.get<{ categories?: ShopCategoryInfo[] }>('/api/v1/shop/categories')
    return data.categories ?? []
  },

  listItems: async (params?: {
    category?: ItemCategory
    rarity?: ItemRarity
    limit?: number
    offset?: number
  }): Promise<ListItemsResponse> => {
    const { data } = await apiClient.get<ListItemsResponse>('/api/v1/shop/items', {
      params: {
        category: params?.category ?? ItemCategory.UNSPECIFIED,
        rarity: params?.rarity ?? ItemRarity.UNSPECIFIED,
        limit: params?.limit ?? 50,
        offset: params?.offset ?? 0,
      },
    })
    return { items: data.items ?? [], total: data.total ?? 0 }
  },

  getItem: async (itemId: string): Promise<{ item: ShopItem; owned: boolean }> => {
    const { data } = await apiClient.get<{ item: ShopItem; owned: boolean }>(`/api/v1/shop/items/${itemId}`)
    return { item: data.item, owned: data.owned ?? false }
  },

  getInventory: async (): Promise<OwnedItem[]> => {
    const { data } = await apiClient.get<{ items?: OwnedItem[] }>('/api/v1/shop/inventory')
    return data.items ?? []
  },

  purchase: async (itemId: string): Promise<PurchaseResponse> => {
    const { data } = await apiClient.post<PurchaseResponse>('/api/v1/shop/purchase', { itemId })
    return data
  },
}
