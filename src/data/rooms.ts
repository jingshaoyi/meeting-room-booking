export interface Room {
  id: string
  name: string
  location: string
  capacity: number
  facilities: string[]
  requiresApproval: boolean
}

export interface TimeSlot {
  id: string
  start: string
  end: string
}

export const TIME_SLOTS: TimeSlot[] = [
  { id: 't09', start: '09:00', end: '10:00' },
  { id: 't10', start: '10:00', end: '11:00' },
  { id: 't11', start: '11:00', end: '12:00' },
  { id: 't12', start: '12:00', end: '13:00' },
  { id: 't13', start: '13:00', end: '14:00' },
  { id: 't14', start: '14:00', end: '15:00' },
  { id: 't15', start: '15:00', end: '16:00' },
  { id: 't16', start: '16:00', end: '17:00' },
  { id: 't17', start: '17:00', end: '18:00' },
  { id: 't18', start: '18:00', end: '19:00' },
  { id: 't19', start: '19:00', end: '20:00' },
  { id: 't20', start: '20:00', end: '21:00' }
]

export interface DayOption {
  value: string
  label: string
  weekday: string
}

export function formatDate(d: Date): string {
  const pad = (n: number) => (n < 10 ? '0' + n : String(n))
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function getNextDays(count: number): DayOption[] {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const out: DayOption[] = []
  const today = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    out.push({
      value: formatDate(d),
      label: i === 0 ? '今天' : i === 1 ? '明天' : `${d.getMonth() + 1}/${d.getDate()}`,
      weekday: weekdays[d.getDay()]
    })
  }
  return out
}
