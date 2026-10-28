function createHandler({ db, getOpenId, now = Date.now }) {
  return async function main(event) {
    const openid = getOpenId()
    if (!openid) return { code: 401, message: '请先登录' }
    if (!event.id || typeof event.id !== 'string') return { code: 400, message: '预约编号无效' }

    try {
      return await db.runTransaction(async transaction => {
        let booking
        try {
          const result = await transaction.collection('bookings').doc(event.id).get()
          booking = result.data
        } catch (error) {
          return { code: 404, message: '预约不存在' }
        }

        if (booking.userId !== openid) return { code: 403, message: '无权取消该预约' }
        if (!['pending', 'approved'].includes(booking.status)) {
          return { code: 400, message: '当前状态不可取消' }
        }

        await transaction.collection('bookings').doc(event.id).update({
          data: { status: 'cancelled', updatedAt: now() }
        })
        return { code: 0, data: { id: event.id, status: 'cancelled' } }
      })
    } catch (error) {
      console.error('booking-cancel failed', error)
      return { code: 500, message: '取消预约失败，请稍后重试' }
    }
  }
}

module.exports = { createHandler }
