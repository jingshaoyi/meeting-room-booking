const test = require('node:test')
const assert = require('node:assert/strict')
const { createDb } = require('./mock-db')
const { createHandler } = require('../cloudfunctions/booking-create/handler')

const room = {
  _id: 'r1',
  name: '云顶厅',
  location: 'A 座 12F',
  capacity: 10,
  facilities: ['投影'],
  status: 'active',
  requiresApproval: false
}
const input = {
  roomId: 'r1',
  date: '2099-01-02',
  slotIds: ['t09', 't10'],
  topic: '产品评审',
  attendees: 8
}

function setup({ rooms = [room], bookings = [] } = {}) {
  const db = createDb({ rooms, bookings })
  const main = createHandler({ db, getOpenId: () => 'user-1', now: () => 1000 })
  return { db, main }
}

test('booking-create 创建无需审批的已通过预约', async () => {
  const { db, main } = setup()
  const result = await main(input)

  assert.equal(result.code, 0)
  assert.equal(result.data.booking.status, 'approved')
  assert.equal(result.data.booking.timeLabel, '09:00-11:00')
  assert.equal(result.data.booking.userId, 'user-1')
  assert.equal(db._collections.bookings.length, 1)
})

test('booking-create 对需要审批的会议室创建待审批预约', async () => {
  const { main } = setup({ rooms: [{ ...room, requiresApproval: true }] })
  const result = await main(input)

  assert.equal(result.code, 0)
  assert.equal(result.data.booking.status, 'pending')
})

test('booking-create 拒绝不连续的预约时段', async () => {
  const { db, main } = setup()
  const result = await main({ ...input, slotIds: ['t09', 't11'] })

  assert.equal(result.code, 400)
  assert.match(result.message, /连续/)
  assert.equal(db._collections.bookings.length, 0)
})

test('booking-create 拒绝与待审批或已通过预约冲突的时段', async () => {
  const { db, main } = setup({
    bookings: [{ _id: 'b1', roomId: 'r1', date: input.date, slotIds: ['t10'], status: 'pending' }]
  })
  const result = await main(input)

  assert.equal(result.code, 409)
  assert.match(result.message, /已被预约/)
  assert.equal(db._collections.bookings.length, 1)
})

test('booking-create 拒绝超过会议室容量的预约', async () => {
  const { main } = setup()
  const result = await main({ ...input, attendees: 11 })

  assert.equal(result.code, 400)
  assert.match(result.message, /容量/)
})
