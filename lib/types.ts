export type StokvelType = 'rotational' | 'grocery' | 'burial' | 'investment' | 'savings'
export type Role = 'admin' | 'treasurer' | 'chairperson' | 'member'

export interface Stokvel {
  id: string
  name: string
  type: StokvelType
  contribution_amount: number
  frequency: 'weekly' | 'fortnightly' | 'monthly'
  created_at: string
}

export interface Member {
  id: string
  stokvel_id: string
  user_id: string
  role: Role
  status: string
  joined_at: string
  profiles?: { full_name: string; phone: string }
}

export interface Contribution {
  id: string
  stokvel_id: string
  member_id: string
  amount: number
  due_date: string
  paid_date: string | null
  status: 'pending' | 'paid' | 'late' | 'missed'
}