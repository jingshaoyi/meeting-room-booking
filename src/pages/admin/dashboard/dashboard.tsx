import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { getAdminOverview } from '../../../utils/store'
import type { AdminOverview } from '../../../utils/store'
import '../admin.scss'

const EMPTY_DATA: AdminOverview = {
  stats: { pendingCount: 0, todayCount: 0, activeRoomCount: 0 },
  pendingBookings: []
}

export default function Dashboard() {
  const [data, setData] = useState<AdminOverview>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setData(await getAdminOverview())
    } catch (err) {
      setError(err instanceof Error ? err.message : '管理数据加载失败')
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    load()
  })

  const go = (url: string) => {
    Taro.navigateTo({ url })
  }

  return (
    <View className='admin-page'>
      <View className='stats-grid'>
        <View className='stat-card' onClick={() => go('/pages/admin/bookings/bookings?status=pending')}>
          <Text className='stat-value stat-value-accent'>{data.stats.pendingCount}</Text>
          <Text className='stat-label'>待审批</Text>
        </View>
        <View className='stat-card' onClick={() => go('/pages/admin/bookings/bookings')}>
          <Text className='stat-value'>{data.stats.todayCount}</Text>
          <Text className='stat-label'>今日会议</Text>
        </View>
        <View className='stat-card' onClick={() => go('/pages/admin/rooms/rooms')}>
          <Text className='stat-value'>{data.stats.activeRoomCount}</Text>
          <Text className='stat-label'>启用会议室</Text>
        </View>
      </View>

      <View className='menu-grid'>
        <View className='menu-item' onClick={() => go('/pages/admin/bookings/bookings')}>
          <Text className='menu-title'>预约管理</Text>
          <Text className='menu-sub'>筛选、审批与取消预约</Text>
          <Text className='menu-arrow'>›</Text>
        </View>
        <View className='menu-item' onClick={() => go('/pages/admin/rooms/rooms')}>
          <Text className='menu-title'>会议室管理</Text>
          <Text className='menu-sub'>新增、编辑与启停会议室</Text>
          <Text className='menu-arrow'>›</Text>
        </View>
        <View className='menu-item' onClick={() => go('/pages/admin/users/users')}>
          <Text className='menu-title'>用户权限</Text>
          <Text className='menu-sub'>设置或取消管理员</Text>
          <Text className='menu-arrow'>›</Text>
        </View>
      </View>

      <View className='section-head'>
        <Text className='section-title'>最近待审批</Text>
        <Text className='section-link' onClick={() => go('/pages/admin/bookings/bookings?status=pending')}>全部预约</Text>
      </View>

      {loading && data.pendingBookings.length === 0 ? (
        <View className='state'><Text className='state-text'>正在加载管理数据...</Text></View>
      ) : error && data.pendingBookings.length === 0 ? (
        <View className='state' onClick={load}>
          <Text className='state-text'>加载失败，点击重试</Text>
          <Text className='state-sub'>{error}</Text>
        </View>
      ) : data.pendingBookings.length === 0 ? (
        <View className='empty'>暂无待审批预约</View>
      ) : (
        data.pendingBookings.map(booking => (
          <View
            key={booking.id}
            className='booking-card'
            onClick={() => go(`/pages/admin/detail/detail?id=${booking.id}`)}
          >
            <View className='card-head'>
              <Text className='card-title'>{booking.roomName}</Text>
              <Text className='status status-pending'>待审批</Text>
            </View>
            <Text className='card-topic'>{booking.topic}</Text>
            <Text className='card-meta'>{booking.userName} · {booking.date} · {booking.timeLabel}</Text>
            <Text className='detail-link'>查看并处理</Text>
          </View>
        ))
      )}
    </View>
  )
}
