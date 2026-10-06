import { useEffect, useState } from 'react'
import { load, save } from './persist'

// useState that survives a reload, kept in localStorage under `key`.
export function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => load(key, initial))
  useEffect(() => save(key, value), [key, value])
  return [value, setValue] as const
}
