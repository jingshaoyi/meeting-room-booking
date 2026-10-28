function toBooking(record) {
  return {
    id: record._id,
    roomId: record.roomId,
    roomName: record.roomName,
    date: record.date,
    slotIds: record.slotIds || [],
    timeLabel: record.timeLabel,
    topic: record.topic,
    attendees: record.attendees,
    status: record.status,
    userId: record.userId,
    userName: record.userName || '微信用户',
    approverId: record.approverId || '',
    approvedAt: record.approvedAt || 0,
    rejectReason: record.rejectReason || '',
    createdAt: record.createdAt,
    updatedAt: record.updatedAt || record.createdAt
  }
}

function createHandler({ db, getOpenId }) {
  return async function main(event) {
    try {
      if (event.type === 'availability') {
        if (!event.roomId || !/^\d{4}-\d{2}-\d{2}$/.test(event.date || '')) {
          return { code: 400, message: '会议室或日期无效' }
        }
        const { data } = await db.collection('bookings')
          .where({
            roomId: event.roomId,
            date: event.date,
            status: db.command.in(['pending', 'approved'])
          })
          .get()
        const slotIds = [...new Set(data.reduce((ids, booking) => ids.concat(booking.slotIds || []), []))]
        return { code: 0, data: { slotIds } }
      }

      if (event.type === 'mine') {
        const openid = getOpenId()
        if (!openid) return { code: 401, message: '请先登录' }
        const { data } = await db.collection('bookings')
          .where({ userId: openid })
          .orderBy('createdAt', 'desc')
          .limit(100)
          .get()
        return { code: 0, data: { bookings: data.map(toBooking) } }
      }

      return { code: 400, message: '不支持的查询类型' }
    } catch (error) {
      console.error('booking-list failed', error)
      return { code: 500, message: '预约数据加载失败，请稍后重试' }
    }
  }
}

module.exports = { createHandler }
