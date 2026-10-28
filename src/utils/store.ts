import type { Room } from '../data/rooms'
import { callCloud } from './cloud'

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface Booking {
  id: string
  roomId: string
  roomName: string
  date: string
  slotIds: string[]
  timeLabel: string
  topic: string
  attendees: number
  status: BookingStatus
  userId: string
  userName: string
  approverId: string
  approvedAt: number
  rejectReason: string
  createdAt: number
  updatedAt: number
}

export interface CreateBookingInput {
  roomId: string
  date: string
  slotIds: string[]
  topic: string
  attendees: number
}

export interface User {
  id: string
  name: string
  role: 'user' | 'admin'
}

export interface AdminRoom extends Room {
  status: 'active' | 'inactive'
  sort: number
  createdAt: number
  updatedAt: number
}

export interface RoomInput {
  name: string
  location: string
  capacity: number
  facilities: string[]
  requiresApproval: boolean
  sort: number
}

export interface AdminUser extends User {
  createdAt: number
  updatedAt: number
}

export interface AdminOverview {
  stats: {
    pendingCount: number
    todayCount: number
    activeRoomCount: number
  }
  pendingBookings: Booking[]
}

export interface AdminBookingFilters {
  status?: BookingStatus
  date?: string
  roomId?: string
  keyword?: string
}

export function login(): Promise<{ user: User }> {
  return callCloud<{ user: User }>('user-login')
}

export async function getRooms(): Promise<Room[]> {
  const data = await callCloud<{ rooms: Room[] }>('room-list')
  return data.rooms
}

export async function getBookings(): Promise<Booking[]> {
  const data = await callCloud<{ bookings: Booking[] }>('booking-list', { type: 'mine' })
  return data.bookings
}

export async function getBookedSlotIds(roomId: string, date: string): Promise<string[]> {
  const data = await callCloud<{ slotIds: string[] }>('booking-list', {
    type: 'availability',
    roomId,
    date
  })
  return data.slotIds
}

export async function addBooking(input: CreateBookingInput): Promise<Booking> {
  const data = await callCloud<{ booking: Booking }>('booking-create', { ...input })
  return data.booking
}

export async function removeBooking(id: string): Promise<void> {
  await callCloud<{ id: string; status: 'cancelled' }>('booking-cancel', { id })
}

export async function getAdminOverview(): Promise<AdminOverview> {
  return callCloud<AdminOverview>('admin-overview')
}

export async function getAdminRooms(keyword = ''): Promise<AdminRoom[]> {
  const data = await callCloud<{ rooms: AdminRoom[] }>('admin-rooms', { action: 'list', keyword })
  return data.rooms
}

export async function createAdminRoom(input: RoomInput): Promise<AdminRoom> {
  const data = await callCloud<{ room: AdminRoom }>('admin-rooms', { action: 'create', ...input })
  return data.room
}

export async function updateAdminRoom(id: string, input: Partial<RoomInput> & { status?: 'active' | 'inactive' }): Promise<AdminRoom> {
  const data = await callCloud<{ room: AdminRoom }>('admin-rooms', { action: 'update', id, ...input })
  return data.room
}

export async function removeAdminRoom(id: string): Promise<{ removed: boolean; status?: 'inactive' }> {
  return callCloud<{ removed: boolean; status?: 'inactive' }>('admin-rooms', { action: 'remove', id })
}

export async function getAdminBookings(filters: AdminBookingFilters = {}): Promise<Booking[]> {
  const data = await callCloud<{ bookings: Booking[] }>('admin-bookings', { action: 'list', ...filters })
  return data.bookings
}

export async function getAdminBooking(id: string): Promise<Booking> {
  const data = await callCloud<{ booking: Booking }>('admin-bookings', { action: 'detail', id })
  return data.booking
}

export async function operateAdminBooking(id: string, action: 'approve' | 'reject' | 'cancel', reason = ''): Promise<void> {
  await callCloud<{ id: string; status: BookingStatus }>('admin-bookings', { action, id, reason })
}

export async function getAdminUsers(keyword = ''): Promise<AdminUser[]> {
  const data = await callCloud<{ users: AdminUser[] }>('admin-users', { action: 'list', keyword })
  return data.users
}

export async function setAdminUserRole(userId: string, role: 'user' | 'admin'): Promise<AdminUser> {
  const data = await callCloud<{ user: AdminUser }>('admin-users', { action: 'set-role', userId, role })
  return data.user
}

/** 已通过微信登录的预约时间状态：upcoming 未开始 / ongoing 进行中 / past 已结束 */
export function bookingStatus(booking: Booking): 'upcoming' | 'ongoing' | 'past' {
  const d = new Date()
  const pad = (n: number) => (n < 10 ? '0' + n : String(n))
  const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const now = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const parts = booking.timeLabel.split('-')
  const start = parts[0]
  const end = parts[1]
  if (booking.date > today) return 'upcoming'
  if (booking.date < today) return 'past'
  if (now < start) return 'upcoming'
  if (now >= end) return 'past'
  return 'ongoing'
}
