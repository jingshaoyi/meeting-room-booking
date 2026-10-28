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

function createHandler({ db, getOpenId, today }) {
  return async function main() {
    const openid = getOpenId()
    if (!openid) return { code: 401, message: '请先登录' }

    try {
      const { data: user } = await db.collection('users').doc(openid).get()
      if (user.role !== 'admin') return { code: 403, message: '仅管理员可访问' }

      const [pending, todayMeetings, activeRooms, pendingList] = await Promise.all([
        db.collection('bookings').where({ status: 'pending' }).count(),
        db.collection('bookings').where({ status: 'approved', date: today() }).count(),
        db.collection('rooms').where({ status: 'active' }).count(),
        db.collection('bookings').where({ status: 'pending' }).orderBy('createdAt', 'desc').limit(5).get()
      ])
      return {
        code: 0,
        data: {
          stats: {
            pendingCount: pending.total,
            todayCount: todayMeetings.total,
            activeRoomCount: activeRooms.total
          },
          pendingBookings: pendingList.data.map(toBooking)
        }
      }
    } catch (error) {
      if (error && error.message === 'document not found') return { code: 403, message: '仅管理员可访问' }
      console.error('admin-overview failed', error)
      return { code: 500, message: '管理数据加载失败，请稍后重试' }
    }
  }
}

module.exports = { createHandler }
