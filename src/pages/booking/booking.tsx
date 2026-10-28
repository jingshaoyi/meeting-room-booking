import { View, Text, Input, ScrollView, Button } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { TIME_SLOTS, getNextDays } from '../../data/rooms'
import type { DayOption, Room } from '../../data/rooms'
import { addBooking, getBookedSlotIds, getRooms } from '../../utils/store'
import './booking.scss'

export default function Booking() {
  const router = useRouter()
  const roomId = router.params.roomId || ''
  const days: DayOption[] = getNextDays(7)
  const today = days[0].value

  const [room, setRoom] = useState<Room | null>(null)
  const [date, setDate] = useState(today)
  const [selected, setSelected] = useState<number[]>([])
  const [bookedIds, setBookedIds] = useState<string[]>([])
  const [topic, setTopic] = useState('')
  const [attendees, setAttendees] = useState('')
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [availabilityVersion, setAvailabilityVersion] = useState(0)
  const [availabilityError, setAvailabilityError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    getRooms()
      .then(rooms => {
        if (!active) return
        const target = rooms.find(item => item.id === roomId)
        setRoom(target || null)
        setError(target ? '' : '会议室不存在或已停用')
      })
      .catch(err => {
        if (active) setError(err instanceof Error ? err.message : '会议室加载失败')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [roomId])

  useEffect(() => {
    if (!room) return
    let active = true
    setSlotsLoading(true)
    setAvailabilityError('')
    setBookedIds([])
    getBookedSlotIds(room.id, date)
      .then(ids => {
        if (active) setBookedIds(ids)
      })
      .catch(err => {
        if (active) setAvailabilityError(err instanceof Error ? err.message : '时段加载失败')
      })
      .finally(() => {
        if (active) setSlotsLoading(false)
      })
    return () => {
      active = false
    }
  }, [room, date, availabilityVersion])

  const nowHour = new Date().getHours()

  const slotState = (index: number): 'occupied' | 'past' | 'free' => {
    const slot = TIME_SLOTS[index]
    if (bookedIds.includes(slot.id)) return 'occupied'
    if (date === today && Number(slot.start.slice(0, 2)) <= nowHour) return 'past'
    return 'free'
  }

  const toggleSlot = (index: number) => {
    if (slotsLoading || availabilityError || slotState(index) !== 'free') return
    setSelected(prev => {
      if (prev.includes(index)) return prev.filter(i => i !== index)
      const next = [...prev, index].sort((a, b) => a - b)
      for (let i = 1; i < next.length; i++) {
        if (next[i] !== next[i - 1] + 1) return [index]
      }
      return next
    })
  }

  const changeDate = (value: string) => {
    setDate(value)
    setSelected([])
  }

  const submit = async () => {
    if (!room || submitting) return
    if (slotsLoading || availabilityError) {
      Taro.showToast({ title: '请先等待时段加载成功', icon: 'none' })
      return
    }
    if (selected.length === 0) {
      Taro.showToast({ title: '请选择预约时段', icon: 'none' })
      return
    }
    if (!topic.trim()) {
      Taro.showToast({ title: '请填写会议主题', icon: 'none' })
      return
    }
    const count = Number(attendees)
    if (!Number.isInteger(count) || count <= 0) {
      Taro.showToast({ title: '请填写正确的参会人数', icon: 'none' })
      return
    }
    if (count > room.capacity) {
      Taro.showToast({ title: `超出该会议室容量 ${room.capacity} 人`, icon: 'none' })
      return
    }

    setSubmitting(true)
    try {
      const booking = await addBooking({
        roomId: room.id,
        date,
        slotIds: selected.map(i => TIME_SLOTS[i].id),
        topic: topic.trim(),
        attendees: count
      })
      Taro.showToast({
        title: booking.status === 'pending' ? '已提交，待审批' : '预约成功',
        icon: 'success',
        duration: 1500
      })
      setTimeout(() => Taro.navigateBack(), 1500)
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '预约提交失败', icon: 'none' })
      setAvailabilityVersion(version => version + 1)
    } finally {
      setSubmitting(false)
    }
  }

  const timeSummary = selected.length
    ? `${TIME_SLOTS[selected[0]].start} - ${TIME_SLOTS[selected[selected.length - 1]].end}`
    : ''

  if (loading) {
    return <View className='page'><View className='page-state'><Text>正在加载会议室...</Text></View></View>
  }
  if (!room) {
    return (
      <View className='page'>
        <View className='page-state'>
          <Text>{error || '会议室不存在'}</Text>
          <Button className='state-btn' onClick={() => Taro.navigateBack()}>返回</Button>
        </View>
      </View>
    )
  }

  return (
    <View className='page'>
      <View className='room-banner'>
        <View className='banner-badge'>
          <Text className='banner-badge-text'>{room.name.slice(0, 1)}</Text>
        </View>
        <View className='banner-info'>
          <Text className='banner-name'>{room.name}</Text>
          <Text className='banner-desc'>
            {room.location} · 容纳 {room.capacity} 人 · {room.facilities.join(' / ')}
          </Text>
          {room.requiresApproval && <Text className='banner-approval'>该会议室提交后需管理员审批</Text>}
        </View>
      </View>

      <View className='block'>
        <Text className='block-title'>选择日期</Text>
        <ScrollView scrollX className='date-scroll'>
          <View className='date-row'>
            {days.map(d => (
              <View
                key={d.value}
                className={`date-chip ${date === d.value ? 'date-chip-active' : ''}`}
                onClick={() => changeDate(d.value)}
              >
                <Text className={`date-chip-day ${date === d.value ? 'date-chip-day-active' : ''}`}>{d.label}</Text>
                <Text className={`date-chip-week ${date === d.value ? 'date-chip-week-active' : ''}`}>{d.weekday}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View className='block'>
        <View className='block-title-row'>
          <Text className='block-title'>选择时段</Text>
          <Text className='block-title-sub' onClick={() => availabilityError && setAvailabilityVersion(v => v + 1)}>
            {availabilityError ? '加载失败，点击重试' : slotsLoading ? '正在查询占用...' : '可连续选择多个时段'}
          </Text>
        </View>
        <View className='slot-grid'>
          {TIME_SLOTS.map((slot, index) => {
            const state = slotState(index)
            const isSelected = selected.includes(index)
            const cls = [
              'slot',
              state === 'occupied' ? 'slot-occupied' : '',
              state === 'past' ? 'slot-past' : '',
              isSelected ? 'slot-selected' : ''
            ].filter(Boolean).join(' ')
            const sub = state === 'occupied' ? '已占用' : state === 'past' ? '已过期' : isSelected ? '已选' : '可选'
            return (
              <View key={slot.id} className={cls} onClick={() => toggleSlot(index)}>
                <Text className='slot-text'>{slot.start}</Text>
                <Text className='slot-sub'>{sub}</Text>
              </View>
            )
          })}
        </View>
      </View>

      <View className='block'>
        <Text className='block-title'>会议信息</Text>
        <View className='form'>
          <View className='form-item'>
            <Text className='form-label'>主题</Text>
            <Input
              className='form-input'
              placeholder='请输入会议主题'
              placeholderClass='form-placeholder'
              value={topic}
              maxlength={20}
              onInput={e => setTopic(e.detail.value)}
            />
          </View>
          <View className='form-item'>
            <Text className='form-label'>人数</Text>
            <Input
              className='form-input'
              type='number'
              placeholder='请输入参会人数'
              placeholderClass='form-placeholder'
              value={attendees}
              onInput={e => setAttendees(e.detail.value)}
            />
          </View>
        </View>
      </View>

      <View className='footer'>
        <View className='footer-summary'>
          {timeSummary ? <Text className='footer-time'>{timeSummary}</Text> : <Text className='footer-hint'>未选择时段</Text>}
          <Text className='footer-room'>{room.name} · {date}</Text>
        </View>
        <Button className='submit-btn' loading={submitting} disabled={submitting || slotsLoading} onClick={submit}>
          {submitting ? '提交中' : '提交预约'}
        </Button>
      </View>
    </View>
  )
}
