const test = require('node:test')
const assert = require('node:assert/strict')
const { createDb } = require('./mock-db')
const { createHandler } = require('../cloudfunctions/booking-cancel/handler')

function setup(booking) {
  const db = createDb({ bookings: [booking] })
  const main = createHandler({ db, getOpenId: () => 'user-1', now: () => 2000 })
  return { db, main }
}

test('booking-cancel 允许预约人取消待审批预约', async () => {
  const { db, main } = setup({ _id: 'b1', userId: 'user-1', status: 'pending' })
  const result = await main({ id: 'b1' })

  assert.equal(result.code, 0)
  assert.equal(result.data.status, 'cancelled')
  assert.equal(db._collections.bookings[0].status, 'cancelled')
  assert.equal(db._collections.bookings[0].updatedAt, 2000)
})

test('booking-cancel 拒绝取消其他用户的预约', async () => {
  const { db, main } = setup({ _id: 'b1', userId: 'user-2', status: 'approved' })
  const result = await main({ id: 'b1' })

  assert.equal(result.code, 403)
  assert.equal(db._collections.bookings[0].status, 'approved')
})

test('booking-cancel 拒绝重复取消已取消预约', async () => {
  const { main } = setup({ _id: 'b1', userId: 'user-1', status: 'cancelled' })
  const result = await main({ id: 'b1' })

  assert.equal(result.code, 400)
  assert.match(result.message, /当前状态/)
})
