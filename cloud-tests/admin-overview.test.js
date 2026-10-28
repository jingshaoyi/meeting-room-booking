const test = require('node:test')
const assert = require('node:assert/strict')
const { createDb } = require('./mock-db')
const { createHandler } = require('../cloudfunctions/admin-overview/handler')

function setup(openid = 'admin-1') {
  const db = createDb({
    users: [
      { _id: 'admin-1', role: 'admin' },
      { _id: 'user-1', role: 'user' }
    ],
    rooms: [
      { _id: 'r1', status: 'active' },
      { _id: 'r2', status: 'inactive' }
    ],
    bookings: [
      { _id: 'b1', status: 'pending', createdAt: 30, topic: '产品评审', userName: '张三', roomName: '云顶厅', date: '2026-10-28', timeLabel: '09:00-10:00' },
      { _id: 'b2', status: 'approved', date: '2026-10-28', createdAt: 20 },
      { _id: 'b3', status: 'approved', date: '2026-10-29', createdAt: 10 },
      { _id: 'b4', status: 'cancelled', date: '2026-10-28', createdAt: 5 }
    ]
  })
  const main = createHandler({ db, getOpenId: () => openid, today: () => '2026-10-28' })
  return { main }
}

test('admin-overview 拒绝普通用户查看统计数据', async () => {
  const { main } = setup('user-1')
  const result = await main({})
  assert.equal(result.code, 403)
})

test('admin-overview 返回待审批、今日会议和启用会议室统计', async () => {
  const { main } = setup()
  const result = await main({})

  assert.equal(result.code, 0)
  assert.deepEqual(result.data.stats, { pendingCount: 1, todayCount: 1, activeRoomCount: 1 })
  assert.equal(result.data.pendingBookings.length, 1)
  assert.equal(result.data.pendingBookings[0].id, 'b1')
})
