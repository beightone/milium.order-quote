// hooks/useTotalizers.ts
import { useState, useEffect } from 'react'
import { Totalizers } from '../types'

export const useTotalizers = (initialTotalizers: Totalizers[], items: any) => {
  const [totalizers, setTotalizers] = useState<Totalizers[]>(initialTotalizers)

  useEffect(() => {
    const subtotal = items.reduce(
      (acc: number, item: any) => acc + item.sellingPrice * item.quantity,
      0
    )
    setTotalizers(prev => [
      ...prev.filter(t => t.id !== 'Items' && t.id !== 'Total'),
      { id: 'Items', name: 'Subtotal', value: subtotal },
    ])
  }, [items])

  return totalizers
}
