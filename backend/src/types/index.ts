export interface JwtPayload {
  sub: number
  householdId: number
  role: 'admin' | 'member'
  type: 'access' | 'refresh'
}
