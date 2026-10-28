import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import type { Room } from '../../data/rooms'
import { getBookings, getRooms } from '../../utils/store'
import './index.scss'

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export default function Index() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [bookingCount, setBookingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [roomList, bookings] = await Promise.all([getRooms(), getBookings()])
      setRooms(roomList)
      setBookingCount(bookings.filter(item => ['pending', 'approved'].includes(item.status)).length)
    } catch (err) {
      setError(err instanceof Error ? err.message : '数据加载失败')
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    loadData()
  })

  const now = new Date()
  const dateLabel = `${now.getMonth() + 1}月${now.getDate()}日 ${WEEKDAYS[now.getDay()]}`

  const goBooking = (roomId: string) => {
    Taro.navigateTo({ url: `/pages/booking/booking?roomId=${roomId}` })
  }

  const goMy = () => {
    Taro.navigateTo({ url: '/pages/my/my' })
  }

  return (
    <View className='page'>
      <View className='hero'>
        <View className='hero-top'>
          <View className='hero-left'>
            <Text className='hero-title'>会议室预约</Text>
            <Text className='hero-sub'>今天是 {dateLabel}</Text>
          </View>
          <View className='hero-my' onClick={goMy}>
            <Text className='hero-my-text'>
              我的预约{bookingCount > 0 ? ` (${bookingCount})` : ''}
            </Text>
          </View>
        </View>
        <View className='hero-stats'>
          <View className='stat'>
            <Text className='stat-num'>{rooms.length}</Text>
            <Text className='stat-label'>会议室</Text>
          </View>
          <View className='stat-divider' />
          <View className='stat'>
            <Text className='stat-num'>{bookingCount}</Text>
            <Text className='stat-label'>我的预约</Text>
          </View>
        </View>
      </View>

      <View className='section-title'>
        <Text className='section-title-text'>全部会议室</Text>
        <Text className='section-title-sub'>点击卡片选择时段</Text>
      </View>

      {loading && rooms.length === 0 && (
        <View className='state'><Text className='state-text'>正在加载真实会议室数据...</Text></View>
      )}
      {!loading && error && rooms.length === 0 && (
        <View className='state' onClick={loadData}>
          <Text className='state-text'>加载失败，点击重试</Text>
          <Text className='state-sub'>{error}</Text>
        </View>
      )}
      {!loading && !error && rooms.length === 0 && (
        <View className='state'><Text className='state-text'>暂无可用会议室</Text></View>
      )}

      <View className='room-list'>
        {rooms.map(room => (
          <View key={room.id} className='room-card' onClick={() => goBooking(room.id)}>
            <View className='room-badge'>
              <Text className='room-badge-text'>{room.name.slice(0, 1)}</Text>
            </View>
            <View className='room-info'>
              <View className='room-name-row'>
                <Text className='room-name'>{room.name}</Text>
                <Text className='room-loc'>{room.location}</Text>
              </View>
              <Text className='room-cap'>容纳 {room.capacity} 人</Text>
              <View className='room-tags'>
                {room.facilities.map(f => (
                  <Text key={f} className='room-tag'>{f}</Text>
                ))}
                {room.requiresApproval && <Text className='room-tag'>需审批</Text>}
              </View>
            </View>
            <View className='room-cta'>
              <Text className='room-cta-text'>预约</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
