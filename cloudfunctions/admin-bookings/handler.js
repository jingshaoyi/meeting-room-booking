const STATUSES = ['pending', 'approved', 'rejected', 'cancelled']

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

function createHandler({ db, getOpenId, now = Date.now }) {
  return async function main(event) {
    const openid = getOpenId()
    if (!openid) return { code: 401, message: '请先登录' }

    try {
      const { data: user } = await db.collection('users').doc(openid).get()
      if (user.role !== 'admin') return { code: 403, message: '仅管理员可访问' }

      if (event.action === 'list') {
        if (event.status && !STATUSES.includes(event.status)) return { code: 400, message: '预约状态无效' }
        if (event.date && !/^\d{4}-\d{2}-\d{2}$/.test(event.date)) return { code: 400, message: '日期无效' }
        const query = {}
        if (event.status) query.status = event.status
        if (event.date) query.date = event.date
        if (typeof event.roomId === 'string' && event.roomId) query.roomId = event.roomId
        const { data } = await db.collection('bookings').where(query).orderBy('createdAt', 'desc').limit(100).get()
        const keyword = typeof event.keyword === 'string' ? event.keyword.trim().toLowerCase() : ''
        const bookings = data.filter(booking => !keyword || `${booking.topic} ${booking.userName} ${booking.roomName}`.toLowerCase().includes(keyword))
        return { code: 0, data: { bookings: bookings.map(toBooking) } }
      }

      if (event.action === 'detail') {
        if (typeof event.id !== 'string' || !event.id) return { code: 400, message: '预约编号无效' }
        try {
          const { data } = await db.collection('bookings').doc(event.id).get()
          return { code: 0, data: { booking: toBooking(data) } }
        } catch (error) {
          return { code: 404, message: '预约不存在' }
        }
      }

      if (!['approve', 'reject', 'cancel'].includes(event.action)) {
        return { code: 400, message: '不支持的预约操作' }
      }
      if (typeof event.id !== 'string' || !event.id) return { code: 400, message: '预约编号无效' }
      const reason = typeof event.reason === 'string' ? event.reason.trim() : ''
      if (event.action === 'reject' && (!reason || reason.length > 200)) {
        return { code: 400, message: '驳回原因需为 1-200 个字符' }
      }

      return await db.runTransaction(async transaction => {
        let booking
        try {
          const result = await transaction.collection('bookings').doc(event.id).get()
          booking = result.data
        } catch (error) {
          return { code: 404, message: '预约不存在' }
        }

        const timestamp = now()
        if (event.action === 'approve') {
          if (booking.status !== 'pending') return { code: 400, message: '仅待审批预约可通过' }
          const { data: existing } = await transaction.collection('bookings')
            .where({ roomId: booking.roomId, date: booking.date, status: 'approved' })
            .get()
          const conflict = existing.some(item => item._id !== booking._id && (item.slotIds || []).some(id => (booking.slotIds || []).includes(id)))
          if (conflict) return { code: 409, message: '该时段已有通过的预约，不能审批通过' }
          await transaction.collection('bookings').doc(event.id).update({
            data: { status: 'approved', approverId: openid, approvedAt: timestamp, rejectReason: '', updatedAt: timestamp }
          })
          return { code: 0, data: { id: event.id, status: 'approved' } }
        }

        if (event.action === 'reject') {
          if (booking.status !== 'pending') return { code: 400, message: '仅待审批预约可驳回' }
          await transaction.collection('bookings').doc(event.id).update({
            data: { status: 'rejected', approverId: openid, approvedAt: 0, rejectReason: reason, updatedAt: timestamp }
          })
          return { code: 0, data: { id: event.id, status: 'rejected', rejectReason: reason } }
        }

        if (!['pending', 'approved'].includes(booking.status)) {
          return { code: 400, message: '当前状态不可取消' }
        }
        await transaction.collection('bookings').doc(event.id).update({
          data: { status: 'cancelled', approverId: openid, updatedAt: timestamp }
        })
        return { code: 0, data: { id: event.id, status: 'cancelled' } }
      })
    } catch (error) {
      if (error && error.message === 'document not found') return { code: 403, message: '仅管理员可访问' }
      console.error('admin-bookings failed', error)
      return { code: 500, message: '预约管理操作失败，请稍后重试' }
    }
  }
}

module.exports = { createHandler }
