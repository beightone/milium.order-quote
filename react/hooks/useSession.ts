import { useState, useEffect } from 'react'
import { getSession } from '../modules/session'

export const useSessionResponse = () => {
  const [session, setSession] = useState<any>()
  const sessionPromise = getSession()

  useEffect(() => {
    if (!sessionPromise) return

    sessionPromise.then(({ response }) => setSession(response))
  }, [sessionPromise])

  return session
}
