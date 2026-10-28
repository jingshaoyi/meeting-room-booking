function toUser(record) {
  return {
    id: record._id,
    name: record.name || '微信用户',
    role: record.role || 'user',
    createdAt: record.createdAt || 0,
    updatedAt: record.updatedAt || record.createdAt || 0
  }
}

function createHandler({ db, getOpenId, now = Date.now }) {
  return async function main(event) {
    const openid = getOpenId()
    if (!openid) return { code: 401, message: '请先登录' }

    try {
      const { data: currentUser } = await db.collection('users').doc(openid).get()
      if (currentUser.role !== 'admin') return { code: 403, message: '仅管理员可访问' }

      if (event.action === 'list') {
        const { data } = await db.collection('users').orderBy('createdAt', 'desc').limit(200).get()
        const keyword = typeof event.keyword === 'string' ? event.keyword.trim().toLowerCase() : ''
        const users = data.filter(user => !keyword || `${user.name} ${user._id}`.toLowerCase().includes(keyword))
        return { code: 0, data: { users: users.map(toUser) } }
      }

      if (event.action !== 'set-role') return { code: 400, message: '不支持的用户操作' }
      if (typeof event.userId !== 'string' || !event.userId) return { code: 400, message: '用户编号无效' }
      if (!['user', 'admin'].includes(event.role)) return { code: 400, message: '用户角色无效' }
      if (event.userId === openid && event.role !== 'admin') {
        return { code: 403, message: '不能取消自己的管理员权限' }
      }

      let target
      try {
        const result = await db.collection('users').doc(event.userId).get()
        target = result.data
      } catch (error) {
        return { code: 404, message: '用户不存在' }
      }

      if (target.role === 'admin' && event.role === 'user') {
        const { total } = await db.collection('users').where({ role: 'admin' }).count()
        if (total <= 1) return { code: 403, message: '至少需要保留一名管理员' }
      }

      await db.collection('users').doc(event.userId).update({ data: { role: event.role, updatedAt: now() } })
      return { code: 0, data: { user: toUser({ ...target, role: event.role, updatedAt: now() }) } }
    } catch (error) {
      if (error && error.message === 'document not found') return { code: 403, message: '仅管理员可访问' }
      console.error('admin-users failed', error)
      return { code: 500, message: '用户权限操作失败，请稍后重试' }
    }
  }
}

module.exports = { createHandler }
