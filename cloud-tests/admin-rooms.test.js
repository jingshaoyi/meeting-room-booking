const test = require('node:test')
const assert = require('node:assert/strict')
const { createDb } = require('./mock-db')
const { createHandler } = require('../cloudfunctions/admin-rooms/handler')

function setup({ openid = 'admin-1', rooms = [], bookings = [] } = {}) {
  const db = createDb({
    users: [{ _id: 'admin-1', role: 'admin' }, { _id: 'user-1', role: 'user' }],
    rooms,
    bookings
  })
  const main = createHandler({ db, getOpenId: () => openid, now: () => 2000 })
  return { db, main }
}

const input = {
  name: ' 云顶厅 ',
  location: ' A 座 12F ',
  capacity: 20,
  facilities: ['投影', '白板'],
  requiresApproval: true,
  sort: 1
}

test('admin-rooms 拒绝普通用户管理会议室', async () => {
  const { main } = setup({ openid: 'user-1' })
  const result = await main({ action: 'list' })
  assert.equal(result.code, 403)
})

test('admin-rooms 创建会议室并返回完整字段', async () => {
  const { db, main } = setup()
  const result = await main({ action: 'create', ...input })

  assert.equal(result.code, 0)
  assert.equal(result.data.room.name, '云顶厅')
  assert.equal(result.data.room.location, 'A 座 12F')
  assert.equal(result.data.room.status, 'active')
  assert.equal(result.data.room.requiresApproval, true)
  assert.equal(db._collections.rooms[0].createdAt, 2000)
})

test('admin-rooms 拒绝无效容量', async () => {
  const { main } = setup()
  const result = await main({ action: 'create', ...input, capacity: 0 })
  assert.equal(result.code, 400)
})

test('admin-rooms 编辑会议室资料与启停状态', async () => {
  const { db, main } = setup({ rooms: [{ _id: 'r1', ...input, status: 'active' }] })
  const result = await main({ action: 'update', id: 'r1', name: '湖畔厅', status: 'inactive' })

  assert.equal(result.code, 0)
  assert.equal(db._collections.rooms[0].name, '湖畔厅')
  assert.equal(db._collections.rooms[0].status, 'inactive')
  assert.equal(db._collections.rooms[0].updatedAt, 2000)
})

test('admin-rooms 删除没有预约记录的会议室', async () => {
  const { db, main } = setup({ rooms: [{ _id: 'r1', ...input, status: 'active' }] })
  const result = await main({ action: 'remove', id: 'r1' })

  assert.equal(result.code, 0)
  assert.equal(result.data.removed, true)
  assert.equal(db._collections.rooms.length, 0)
})

test('admin-rooms 有历史预约时停用而不是删除', async () => {
  const { db, main } = setup({
    rooms: [{ _id: 'r1', ...input, status: 'active' }],
    bookings: [{ _id: 'b1', roomId: 'r1', status: 'cancelled' }]
  })
  const result = await main({ action: 'remove', id: 'r1' })

  assert.equal(result.code, 0)
  assert.equal(result.data.removed, false)
  assert.equal(db._collections.rooms[0].status, 'inactive')
})
