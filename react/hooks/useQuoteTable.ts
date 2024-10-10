import { useState, useEffect } from 'react'
import { OrderFormItem } from '../types'

export const useQuoteTable = (initialItems: OrderFormItem[]) => {
  const [items, setItems] = useState<OrderFormItem[]>([])

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const updatePrice = (itemId: string, newPrice: number) => {
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, sellingPrice: newPrice } : item
    )
    setItems(updatedItems)
  }

  return { items, updatePrice }
}
