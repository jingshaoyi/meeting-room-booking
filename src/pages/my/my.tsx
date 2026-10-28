import { View, Text, Button } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { bookingStatus, getBookings, login, removeBooking } from '../../utils/store'
import type { Booking } from '../../utils/store'
import './my.scss'

type DisplayStatus = 'pending' | 'rejected' | 'cancelled' | 'upcoming' | 'ongoing' | 'past'

const STATUS_TEXT: Record<DisplayStatus, string> = {
  pending: '待审批',
  rejected: '已驳回',
  cancelled: '已取消',
  upcoming: '未开始',
  ongoing: '进行中',
  past: '已结束'
}

export default function My() {
  const [list, setList] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      const [bookings, { user }] = await Promise.all([getBookings(), login()])
      setList(bookings)
      setIsAdmin(user.role === 'admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : '预约数据加载失败')
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    refresh()
  })

  const cancel = (booking: Booking) => {
    Taro.showModal({
      title: '取消预约',
      content: `确定取消「${booking.topic}」吗？`,
      confirmColor: '#2f54eb',
      success: async res => {
        if (!res.confirm) return
        try {
          await removeBooking(booking.id)
          await refresh()
          Taro.showToast({ title: '已取消', icon: 'none' })
        } catch (err) {
          Taro.showToast({ title: err instanceof Error ? err.message : '取消失败', icon: 'none' })
        }
      }
    })
  }

  const goHome = () => {
    Taro.reLaunch({ url: '/pages/index/index' })
  }

  const goAdmin = () => {
    Taro.navigateTo({ url: '/pages/admin/dashboard/dashboard' })
  }

  return (
    <View className='page'>
      {isAdmin && (
        <View className='admin-entry' onClick={goAdmin}>
          <View className='admin-entry-main'>
            <Text className='admin-entry-title'>会议室管理</Text>
            <Text className='admin-entry-sub'>审批预约、会议室与权限管理</Text>
          </View>
          <Text className='admin-entry-arrow'>›</Text>
        </View>
      )}
      {loading && list.length === 0 ? (
        <View className='empty'><Text className='empty-text'>正在加载我的预约...</Text></View>
      ) : error && list.length === 0 ? (
        <View className='empty' onClick={refresh}>
          <Text className='empty-text'>加载失败，点击重试</Text>
          <Text className='empty-sub'>{error}</Text>
        </View>
      ) : list.length === 0 ? (
        <View className='empty'>
          <View className='empty-icon' />
          <Text className='empty-text'>暂无会议预约</Text>
          <Button className='empty-btn' onClick={goHome}>去预约会议室</Button>
        </View>
      ) : (
        <View className='list'>
          {list.map(booking => {
            const timeStatus = bookingStatus(booking)
            const status: DisplayStatus = booking.status === 'approved' ? timeStatus : booking.status
            const canCancel = ['pending', 'approved'].includes(booking.status) && timeStatus !== 'past'
            return (
              <View key={booking.id} className='card'>
                <View className='card-top'>
                  <Text className='card-room'>{booking.roomName}</Text>
                  <Text className={`card-status card-status-${status}`}>{STATUS_TEXT[status]}</Text>
                </View>
                <Text className='card-topic'>{booking.topic}</Text>
                <View className='card-meta'>
                  <Text className='card-meta-item'>{booking.date}</Text>
                  <Text className='card-meta-item'>{booking.timeLabel}</Text>
                  <Text className='card-meta-item'>{booking.attendees} 人</Text>
                </View>
                {booking.status === 'rejected' && booking.rejectReason && (
                  <Text className='card-reason'>驳回原因：{booking.rejectReason}</Text>
                )}
                {canCancel && (
                  <View className='card-actions'>
                    <Button className='cancel-btn' onClick={() => cancel(booking)}>取消预约</Button>
                  </View>
                )}
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}
