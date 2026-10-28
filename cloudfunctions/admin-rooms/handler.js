function toRoom(record) {
  return {
    id: record._id,
    name: record.name,
    location: record.location,
    capacity: record.capacity,
    facilities: record.facilities || [],
    status: record.status || 'active',
    requiresApproval: Boolean(record.requiresApproval),
    sort: record.sort || 0,
    createdAt: record.createdAt || 0,
    updatedAt: record.updatedAt || record.createdAt || 0
  }
}

function normalizeRoom(event, current = {}) {
  return {
    name: typeof event.name === 'string' ? event.name.trim() : current.name || '',
    location: typeof event.location === 'string' ? event.location.trim() : current.location || '',
    capacity: event.capacity === undefined ? current.capacity : Number(event.capacity),
    facilities: Array.isArray(event.facilities)
      ? event.facilities.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean)
      : current.facilities || [],
    requiresApproval: event.requiresApproval === undefined ? Boolean(current.requiresApproval) : Boolean(event.requiresApproval),
    sort: event.sort === undefined ? (current.sort || 0) : Number(event.sort),
    status: event.status || current.status || 'active'
  }
}

function validateRoom(room) {
  if (!room.name || room.name.length > 20) return '会议室名称需为 1-20 个字符'
  if (!room.location || room.location.length > 50) return '会议室位置需为 1-50 个字符'
  if (!Number.isInteger(room.capacity) || room.capacity < 1 || room.capacity > 500) return '容纳人数需为 1-500 的整数'
  if (room.facilities.length > 10 || room.facilities.some(item => item.length > 20)) return '设施信息无效'
  if (!Number.isInteger(room.sort) || room.sort < 0) return '排序值无效'
  if (!['active', 'inactive'].includes(room.status)) return '会议室状态无效'
  return ''
}

function createHandler({ db, getOpenId, now = Date.now }) {
  return async function main(event) {
    const openid = getOpenId()
    if (!openid) return { code: 401, message: '请先登录' }

    try {
      const { data: user } = await db.collection('users').doc(openid).get()
      if (user.role !== 'admin') return { code: 403, message: '仅管理员可访问' }

      if (event.action === 'list') {
        const { data } = await db.collection('rooms').orderBy('sort', 'asc').limit(100).get()
        const keyword = typeof event.keyword === 'string' ? event.keyword.trim().toLowerCase() : ''
        const rooms = data.filter(room => !keyword || `${room.name} ${room.location}`.toLowerCase().includes(keyword))
        return { code: 0, data: { rooms: rooms.map(toRoom) } }
      }

      if (event.action === 'create') {
        const room = normalizeRoom(event)
        const validationError = validateRoom(room)
        if (validationError) return { code: 400, message: validationError }
        const timestamp = now()
        const record = { ...room, createdAt: timestamp, updatedAt: timestamp }
        const { _id } = await db.collection('rooms').add({ data: record })
        return { code: 0, data: { room: toRoom({ _id, ...record }) } }
      }

      if (event.action === 'update') {
        if (typeof event.id !== 'string' || !event.id) return { code: 400, message: '会议室编号无效' }
        let current
        try {
          const result = await db.collection('rooms').doc(event.id).get()
          current = result.data
        } catch (error) {
          return { code: 404, message: '会议室不存在' }
        }
        const room = normalizeRoom(event, current)
        const validationError = validateRoom(room)
        if (validationError) return { code: 400, message: validationError }
        await db.collection('rooms').doc(event.id).update({ data: { ...room, updatedAt: now() } })
        return { code: 0, data: { room: toRoom({ ...current, ...room, updatedAt: now() }) } }
      }

      if (event.action === 'remove') {
        if (typeof event.id !== 'string' || !event.id) return { code: 400, message: '会议室编号无效' }
        try {
          await db.collection('rooms').doc(event.id).get()
        } catch (error) {
          return { code: 404, message: '会议室不存在' }
        }
        const { total } = await db.collection('bookings').where({ roomId: event.id }).count()
        if (total > 0) {
          await db.collection('rooms').doc(event.id).update({ data: { status: 'inactive', updatedAt: now() } })
          return { code: 0, data: { id: event.id, removed: false, status: 'inactive' } }
        }
        await db.collection('rooms').doc(event.id).remove()
        return { code: 0, data: { id: event.id, removed: true } }
      }

      return { code: 400, message: '不支持的会议室操作' }
    } catch (error) {
      if (error && error.message === 'document not found') return { code: 403, message: '仅管理员可访问' }
      console.error('admin-rooms failed', error)
      return { code: 500, message: '会议室管理操作失败，请稍后重试' }
    }
  }
}

module.exports = { createHandler }
