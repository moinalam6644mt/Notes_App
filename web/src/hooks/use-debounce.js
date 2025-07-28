"use client"

import { useCallback, useRef } from "react"

export function useDebounce(callback, delay) {
  const timeoutRef = useRef()

  const debouncedCallback = useCallback(
    (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay],
  )

  return debouncedCallback
}
