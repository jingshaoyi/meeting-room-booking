import { View, Text, Button, Textarea } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { useState } from 'react'
import { getAdminBooking, operateAdminBooking } from '../../../utils/store'
import type { Booking, BookingStatus } from '../../../utils/store'
import '../admin.scss'

const STATUS_TEXT: Record<BookingStatus, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
  cancelled: '已取消'
}

function formatTime(timestamp: number): string {
  if (!timestamp) return '—'
  const d = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Detail() {
  const router = useRouter()
  const id = router.params.id || ''
  const [booking, setBooking] = useState<Booking | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [operating, setOperating] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    if (!id) {
      setError('预约编号无效')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      setBooking(await getAdminBooking(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : '预约详情加载失败')
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    load()
  })

  const operate = async (action: 'approve' | 'reject' | 'cancel') => {
    if (!booking) return
    if (action === 'reject' && !reason.trim()) {
      Taro.showToast({ title: '请填写驳回原因', icon: 'none' })
      return
    }
    setOperating(true)
    try {
      await operateAdminBooking(booking.id, action, reason.trim())
      await load()
      Taro.showToast({ title: action === 'approve' ? '已通过' : action === 'reject' ? '已驳回' : '已取消', icon: 'none' })
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '操作失败', icon: 'none' })
    } finally {
      setOperating(false)
    }
  }

  const confirm = (action: 'approve' | 'cancel') => {
    if (!booking) return
    Taro.showModal({
      title: action === 'approve' ? '通过预约' : '取消预约',
      content: action === 'approve' ? '确定通过该预约吗？系统将再次检查时段冲突。' : '确定取消该预约吗？',
      confirmColor: action === 'cancel' ? '#e5484d' : '#2f54eb',
      success: res => {
        if (res.confirm) operate(action)
      }
    })
  }

  if (loading && !booking) {
    return <View className='admin-page'><View className='state'><Text className='state-text'>正在加载预约详情...</Text></View></View>
  }

  if (!booking) {
    return (
      <View className='admin-page'>
        <View className='state' onClick={load}>
          <Text className='state-text'>{error || '预约不存在'}</Text>
          <Text className='state-sub'>点击重试</Text>
        </View>
      </View>
    )
  }

  return (
    <View className='admin-page'>
      <View className='detail-card'>
        <View className='card-head'>
          <Text className='detail-title'>{booking.topic}</Text>
          <Text className={`status status-${booking.status}`}>{STATUS_TEXT[booking.status]}</Text>
        </View>
        <View className='detail-row'><Text className='detail-label'>会议室</Text><Text className='detail-value'>{booking.roomName}</Text></View>
        <View className='detail-row'><Text className='detail-label'>预约人</Text><Text className='detail-value'>{booking.userName}</Text></View>
        <View className='detail-row'><Text className='detail-label'>日期</Text><Text className='detail-value'>{booking.date}</Text></View>
        <View className='detail-row'><Text className='detail-label'>时段</Text><Text className='detail-value'>{booking.timeLabel}</Text></View>
        <View className='detail-row'><Text className='detail-label'>参会人数</Text><Text className='detail-value'>{booking.attendees} 人</Text></View>
        <View className='detail-row'><Text className='detail-label'>提交时间</Text><Text className='detail-value'>{formatTime(booking.createdAt)}</Text></View>
        <View className='detail-row'><Text className='detail-label'>审批时间</Text><Text className='detail-value'>{formatTime(booking.approvedAt)}</Text></View>
        {booking.approverId && <View className='detail-row'><Text className='detail-label'>操作人</Text><Text className='detail-value detail-value-id'>{booking.approverId}</Text></View>}
        {booking.rejectReason && <View className='reason-box'>驳回原因：{booking.rejectReason}</View>}
      </View>

      {booking.status === 'pending' && (
        <View className='operation-card'>
          <Text className='form-title'>审批操作</Text>
          <Textarea
            className='reason-input'
            maxlength={200}
            value={reason}
            placeholder='驳回时必填原因；通过时无需填写'
            onInput={e => setReason(e.detail.value)}
          />
          <View className='operation-actions'>
            <Button className='btn btn-danger-plain' disabled={operating} onClick={() => operate('reject')}>驳回</Button>
            <Button className='btn btn-primary' loading={operating} disabled={operating} onClick={() => confirm('approve')}>通过预约</Button>
          </View>
        </View>
      )}

      {booking.status === 'approved' && (
        <Button className='btn btn-danger operation-full' loading={operating} disabled={operating} onClick={() => confirm('cancel')}>取消该预约</Button>
      )}
    </View>
  )
}
