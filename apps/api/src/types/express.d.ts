export type AuthUser = {
  id: string
  username: string
  name: string
  role: 'admin' | 'imp'
  customerId: string | null
  modules: string[]
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export {}
