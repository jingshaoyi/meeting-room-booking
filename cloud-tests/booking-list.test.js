const test = require('node:test')
const assert = require('node:assert/strict')
const { createDb } = require('./mock-db')
const { createHandler } = require('../cloudfunctions/booking-list/handler')

const bookings = [
  { _id: 'b1', userId: 'user-1', roomId: 'r1', roomName: '云顶厅', date: '2099-01-02', slotIds: ['t09'], timeLabel: '09:00-10:00', topic: '评审', attendees: 5, status: 'approved', createdAt: 1000 },
  { _id: 'b2', userId: 'user-2', roomId: 'r1', roomName: '云顶厅', date: '2099-01-02', slotIds: ['t10'], timeLabel: '10:00-11:00', topic: '他人会议', attendees: 4, status: 'approved', createdAt: 2000 },
  { _id: 'b3', userId: 'user-1', roomId: 'r1', roomName: '云顶厅', date: '2099-01-02', slotIds: ['t11'], timeLabel: '11:00-12:00', topic: '复盘', attendees: 3, status: 'pending', createdAt: 3000 }
]

test('booking-list 仅返回当前用户的预约并按创建时间倒序', async () => {
  const db = createDb({ bookings })
  const main = createHandler({ db, getOpenId: () => 'user-1' })
  const result = await main({ type: 'mine' })

  assert.equal(result.code, 0)
  assert.deepEqual(result.data.bookings.map(booking => booking.id), ['b3', 'b1'])
  assert.equal(result.data.bookings[0].topic, '复盘')
})

test('booking-list 占用查询只返回有效预约时段且不泄露会议信息', async () => {
  const db = createDb({
    bookings: [
      ...bookings,
      { _id: 'b4', userId: 'user-3', roomId: 'r1', date: '2099-01-02', slotIds: ['t12'], status: 'cancelled' }
    ]
  })
  const main = createHandler({ db, getOpenId: () => 'user-1' })
  const result = await main({ type: 'availability', roomId: 'r1', date: '2099-01-02' })

  assert.equal(result.code, 0)
  assert.deepEqual(result.data.slotIds.sort(), ['t09', 't10', 't11'])
  assert.equal(Object.hasOwn(result.data, 'bookings'), false)
})
