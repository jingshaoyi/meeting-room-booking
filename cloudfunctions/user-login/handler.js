function toUser(record) {
  return {
    id: record._id,
    name: record.name || '微信用户',
    role: record.role || 'user'
  }
}

function createHandler({ db, getOpenId, now = Date.now }) {
  return async function main() {
    const openid = getOpenId()
    if (!openid) return { code: 401, message: '未获取到用户身份' }

    try {
      const existing = await db.collection('users').doc(openid).get()
      return { code: 0, data: { user: toUser(existing.data) } }
    } catch (error) {
      try {
        const timestamp = now()
        const user = { name: '微信用户', role: 'user', createdAt: timestamp, updatedAt: timestamp }
        await db.collection('users').doc(openid).set({ data: user })
        return { code: 0, data: { user: toUser({ _id: openid, ...user }) } }
      } catch (createError) {
        console.error('user-login failed', createError)
        const detail = createError && (createError.errMsg || createError.message)
        return { code: 500, message: detail ? `登录失败：${detail}` : '登录失败，请稍后重试' }
      }
    }
  }
}

module.exports = { createHandler }
