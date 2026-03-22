import { createContext, useRef } from 'react'

type RefreshRef = React.MutableRefObject<() => void>

const noop = () => {}

export const CollectionRefreshContext = createContext<RefreshRef>({
  current: noop,
})

export const CollectionRefreshProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const refreshRef = useRef<() => void>(noop)
  return (
    <CollectionRefreshContext.Provider value={refreshRef}>
      {children}
    </CollectionRefreshContext.Provider>
  )
}
