const test = require('node:test')
const assert = require('node:assert/strict')
const { createDb } = require('./mock-db')
const { createHandler } = require('../cloudfunctions/admin-bookings/handler')

const pending = {
  _id: 'b1', roomId: 'r1', roomName: '云顶厅', date: '2026-10-28', slotIds: ['t09'],
  timeLabel: '09:00-10:00', topic: '产品评审', attendees: 8, status: 'pending',
  userId: 'user-1', userName: '张三', createdAt: 100, updatedAt: 100
}

function setup({ openid = 'admin-1', bookings = [pending] } = {}) {
  const db = createDb({
    users: [{ _id: 'admin-1', role: 'admin' }, { _id: 'user-1', role: 'user' }],
    bookings
  })
  const main = createHandler({ db, getOpenId: () => openid, now: () => 2000 })
  return { db, main }
}

test('admin-bookings 拒绝普通用户读取全部预约', async () => {
  const { main } = setup({ openid: 'user-1' })
  const result = await main({ action: 'list' })
  assert.equal(result.code, 403)
})

test('admin-bookings 按状态、日期和关键词筛选预约', async () => {
  const other = { ...pending, _id: 'b2', topic: '技术分享', userName: '李四', createdAt: 200 }
  const { main } = setup({ bookings: [pending, other] })
  const result = await main({ action: 'list', status: 'pending', date: '2026-10-28', keyword: '技术' })

  assert.equal(result.code, 0)
  assert.equal(result.data.bookings.length, 1)
  assert.equal(result.data.bookings[0].id, 'b2')
})

test('admin-bookings 通过待审批预约并记录审批人', async () => {
  const { db, main } = setup()
  const result = await main({ action: 'approve', id: 'b1' })

  assert.equal(result.code, 0)
  assert.equal(db._collections.bookings[0].status, 'approved')
  assert.equal(db._collections.bookings[0].approverId, 'admin-1')
  assert.equal(db._collections.bookings[0].approvedAt, 2000)
})

test('admin-bookings 审批前发现时段冲突则拒绝通过', async () => {
  const conflict = { ...pending, _id: 'b2', status: 'approved' }
  const { db, main } = setup({ bookings: [pending, conflict] })
  const result = await main({ action: 'approve', id: 'b1' })

  assert.equal(result.code, 409)
  assert.equal(db._collections.bookings[0].status, 'pending')
})

test('admin-bookings 驳回预约必须填写原因', async () => {
  const { main } = setup()
  const result = await main({ action: 'reject', id: 'b1', reason: '  ' })
  assert.equal(result.code, 400)
})

test('admin-bookings 驳回预约并保存原因', async () => {
  const { db, main } = setup()
  const result = await main({ action: 'reject', id: 'b1', reason: ' 请调整会议时间 ' })

  assert.equal(result.code, 0)
  assert.equal(db._collections.bookings[0].status, 'rejected')
  assert.equal(db._collections.bookings[0].rejectReason, '请调整会议时间')
  assert.equal(db._collections.bookings[0].approverId, 'admin-1')
})

test('admin-bookings 管理员可以取消已通过预约', async () => {
  const approved = { ...pending, status: 'approved' }
  const { db, main } = setup({ bookings: [approved] })
  const result = await main({ action: 'cancel', id: 'b1' })

  assert.equal(result.code, 0)
  assert.equal(db._collections.bookings[0].status, 'cancelled')
})

test('admin-bookings 操作详情返回完整预约', async () => {
  const { main } = setup()
  const result = await main({ action: 'detail', id: 'b1' })

  assert.equal(result.code, 0)
  assert.equal(result.data.booking.id, 'b1')
  assert.equal(result.data.booking.topic, '产品评审')
})
