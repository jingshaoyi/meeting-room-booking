const TIME_SLOTS = [
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

function chinaNow(timestamp) {
  const shifted = new Date(timestamp + 8 * 60 * 60 * 1000)
  return { date: shifted.toISOString().slice(0, 10), time: shifted.toISOString().slice(11, 16) }
}

function createHandler({ db, getOpenId, now = Date.now }) {
  return async function main(event) {
    const openid = getOpenId()
    if (!openid) return { code: 401, message: '请先登录' }

    const roomId = typeof event.roomId === 'string' ? event.roomId : ''
    const date = typeof event.date === 'string' ? event.date : ''
    const topic = typeof event.topic === 'string' ? event.topic.trim() : ''
    const attendees = Number(event.attendees)
    const slotIds = Array.isArray(event.slotIds) ? event.slotIds : []

    if (!roomId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { code: 400, message: '会议室或日期无效' }
    }
    if (!topic || topic.length > 20) return { code: 400, message: '会议主题需为 1-20 个字符' }
    if (!Number.isInteger(attendees) || attendees <= 0) return { code: 400, message: '参会人数无效' }

    const indices = slotIds.map(id => TIME_SLOTS.findIndex(slot => slot.id === id))
    if (indices.length === 0 || indices.some(index => index < 0)) {
      return { code: 400, message: '预约时段无效' }
    }
    indices.sort((a, b) => a - b)
    if (new Set(indices).size !== indices.length || indices.some((index, i) => i > 0 && index !== indices[i - 1] + 1)) {
      return { code: 400, message: '预约时段必须连续且不能重复' }
    }

    const current = chinaNow(now())
    if (date < current.date || (date === current.date && TIME_SLOTS[indices[0]].start <= current.time)) {
      return { code: 400, message: '不能预约已过期时段' }
    }

    try {
      const { data: room } = await db.collection('rooms').doc(roomId).get()
      if (room.status !== 'active') return { code: 404, message: '会议室不存在或已停用' }
      if (attendees > room.capacity) return { code: 400, message: `超出该会议室容量 ${room.capacity} 人` }

      let userName = '微信用户'
      try {
        const { data: user } = await db.collection('users').doc(openid).get()
        userName = user.name || userName
      } catch (error) {
        // 用户资料尚未创建时使用默认昵称，不阻止预约。
      }

      return await db.runTransaction(async transaction => {
        const { data: existing } = await transaction.collection('bookings')
          .where({ roomId, date, status: db.command.in(['pending', 'approved']) })
          .get()
        const selectedIds = indices.map(index => TIME_SLOTS[index].id)
        const conflict = existing.some(booking => booking.slotIds.some(id => selectedIds.includes(id)))
        if (conflict) return { code: 409, message: '所选时段已被预约，请重新选择' }

        const timestamp = now()
        const status = room.requiresApproval ? 'pending' : 'approved'
        const first = TIME_SLOTS[indices[0]]
        const last = TIME_SLOTS[indices[indices.length - 1]]
        const booking = {
          roomId,
          roomName: room.name,
          date,
          slotIds: selectedIds,
          timeLabel: `${first.start}-${last.end}`,
          topic,
          attendees,
          status,
          userId: openid,
          userName,
          approverId: '',
          approvedAt: status === 'approved' ? timestamp : 0,
          rejectReason: '',
          createdAt: timestamp,
          updatedAt: timestamp
        }
        const { _id } = await transaction.collection('bookings').add({ data: booking })
        return { code: 0, data: { booking: { id: _id, ...booking } } }
      })
    } catch (error) {
      console.error('booking-create failed', error)
      return { code: 500, message: '预约提交失败，请稍后重试' }
    }
  }
}

module.exports = { createHandler }
