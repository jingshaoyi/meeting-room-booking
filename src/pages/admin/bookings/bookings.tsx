import { View, Text, Input, Button, Picker, Textarea } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { useState } from 'react'
import { getAdminBookings, getAdminRooms, operateAdminBooking } from '../../../utils/store'
import type { AdminBookingFilters, AdminRoom, Booking, BookingStatus } from '../../../utils/store'
import '../admin.scss'

const STATUS_TEXT: Record<BookingStatus, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
  cancelled: '已取消'
}

const STATUS_OPTIONS: Array<{ value: BookingStatus | ''; label: string }> = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待审批' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已驳回' },
  { value: 'cancelled', label: '已取消' }
]

export default function Bookings() {
  const router = useRouter()
  const initialStatus = STATUS_OPTIONS.some(item => item.value === router.params.status)
    ? router.params.status as BookingStatus
    : ''
  const [status, setStatus] = useState<BookingStatus | ''>(initialStatus)
  const [date, setDate] = useState('')
  const [roomId, setRoomId] = useState('')
  const [keyword, setKeyword] = useState('')
  const [rooms, setRooms] = useState<AdminRoom[]>([])
  const [list, setList] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rejectingId, setRejectingId] = useState('')
  const [rejectReason, setRejectReason] = useState('')

  const load = async (filters: AdminBookingFilters) => {
    setLoading(true)
    setError('')
    try {
      setList(await getAdminBookings(filters))
    } catch (err) {
      setError(err instanceof Error ? err.message : '预约加载失败')
    } finally {
      setLoading(false)
    }
  }

  const currentFilters = (): AdminBookingFilters => ({
    status: status || undefined,
    date: date || undefined,
    roomId: roomId || undefined,
    keyword: keyword.trim() || undefined
  })

  useDidShow(() => {
    getAdminRooms().then(setRooms).catch(() => {})
    load({ status: initialStatus || undefined })
  })

  const changeStatus = (value: BookingStatus | '') => {
    setStatus(value)
    load({ ...currentFilters(), status: value || undefined })
  }

  const changeDate = (value: string) => {
    setDate(value)
    load({ ...currentFilters(), date: value || undefined })
  }

  const changeRoom = (index: number) => {
    const value = index < 0 ? '' : rooms[index].id
    setRoomId(value)
    load({ ...currentFilters(), roomId: value || undefined })
  }

  const goDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/admin/detail/detail?id=${id}` })
  }

  const runAction = async (booking: Booking, action: 'approve' | 'reject' | 'cancel', reason = '') => {
    try {
      await operateAdminBooking(booking.id, action, reason)
      await load(currentFilters())
      Taro.showToast({ title: action === 'approve' ? '已通过' : action === 'reject' ? '已驳回' : '已取消', icon: 'none' })
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '操作失败', icon: 'none' })
    }
  }

  const approve = (booking: Booking) => {
    Taro.showModal({
      title: '通过预约',
      content: `确定通过「${booking.topic}」吗？系统将再次检查时段冲突。`,
      success: res => {
        if (res.confirm) runAction(booking, 'approve')
      }
    })
  }

  const reject = (booking: Booking) => {
    setRejectingId(booking.id)
    setRejectReason('')
  }

  const submitReject = (booking: Booking) => {
    if (!rejectReason.trim()) {
      Taro.showToast({ title: '请填写驳回原因', icon: 'none' })
      return
    }
    setRejectingId('')
    runAction(booking, 'reject', rejectReason.trim())
  }

  const cancel = (booking: Booking) => {
    Taro.showModal({
      title: '取消预约',
      content: `确定取消「${booking.topic}」吗？`,
      confirmColor: '#e5484d',
      success: res => {
        if (res.confirm) runAction(booking, 'cancel')
      }
    })
  }

  const roomIndex = rooms.findIndex(room => room.id === roomId)

  return (
    <View className='admin-page'>
      <View className='filter-chips'>
        {STATUS_OPTIONS.map(item => (
          <View key={item.value || 'all'} className={`filter-chip ${status === item.value ? 'filter-chip-active' : ''}`} onClick={() => changeStatus(item.value)}>
            {item.label}
          </View>
        ))}
      </View>

      <View className='filter-panel'>
        <View className='picker-row'>
          <Picker mode='date' value={date} onChange={e => changeDate(e.detail.value)}>
            <View className='picker'>{date || '选择日期'}</View>
          </Picker>
          {date && <Text className='picker-clear' onClick={() => changeDate('')}>清除</Text>}
          <Picker mode='selector' range={rooms} rangeKey='name' value={roomIndex} onChange={e => changeRoom(Number(e.detail.value))}>
            <View className='picker'>{roomIndex >= 0 ? rooms[roomIndex].name : '全部会议室'}</View>
          </Picker>
          {roomId && <Text className='picker-clear' onClick={() => changeRoom(-1)}>清除</Text>}
        </View>
        <View className='search-bar search-bar-inner'>
          <Input className='search-input' placeholder='搜索主题、预约人或会议室' value={keyword} confirmType='search' onInput={e => setKeyword(e.detail.value)} onConfirm={() => load(currentFilters())} />
          <Button className='search-btn' onClick={() => load(currentFilters())}>搜索</Button>
        </View>
      </View>

      {loading && list.length === 0 ? (
        <View className='state'><Text className='state-text'>正在加载预约...</Text></View>
      ) : error && list.length === 0 ? (
        <View className='state' onClick={() => load(currentFilters())}>
          <Text className='state-text'>加载失败，点击重试</Text>
          <Text className='state-sub'>{error}</Text>
        </View>
      ) : list.length === 0 ? (
        <View className='empty'>没有符合筛选条件的预约</View>
      ) : (
        list.map(booking => (
          <View key={booking.id} className='booking-card'>
            <View className='card-head'>
              <Text className='card-title'>{booking.roomName}</Text>
              <Text className={`status status-${booking.status}`}>{STATUS_TEXT[booking.status]}</Text>
            </View>
            <Text className='card-topic'>{booking.topic}</Text>
            <Text className='card-meta'>{booking.userName} · {booking.attendees} 人</Text>
            <Text className='card-meta'>{booking.date} · {booking.timeLabel}</Text>
            {booking.status === 'rejected' && booking.rejectReason && <Text className='reason-text'>驳回原因：{booking.rejectReason}</Text>}
            {rejectingId === booking.id && (
              <View className='rejection-editor'>
                <Textarea className='reason-input' maxlength={200} value={rejectReason} placeholder='请输入驳回原因（必填）' onInput={e => setRejectReason(e.detail.value)} />
                <View className='rejection-actions'>
                  <Button className='btn btn-plain' onClick={() => setRejectingId('')}>取消</Button>
                  <Button className='btn btn-danger' onClick={() => submitReject(booking)}>确认驳回</Button>
                </View>
              </View>
            )}
            <View className='card-actions'>
              <Button className='btn btn-plain' onClick={() => goDetail(booking.id)}>详情</Button>
              {booking.status === 'pending' && <Button className='btn btn-primary' onClick={() => approve(booking)}>通过</Button>}
              {booking.status === 'pending' && <Button className='btn btn-danger-plain' onClick={() => reject(booking)}>驳回</Button>}
              {booking.status === 'approved' && <Button className='btn btn-danger-plain' onClick={() => cancel(booking)}>取消预约</Button>}
            </View>
          </View>
        ))
      )}
    </View>
  )
}
