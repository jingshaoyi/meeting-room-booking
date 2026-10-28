const test = require('node:test')
const assert = require('node:assert/strict')
const { createDb } = require('./mock-db')
const { createHandler } = require('../cloudfunctions/room-list/handler')

test('room-list 返回按 sort 排序的启用会议室', async () => {
  const db = createDb({
    rooms: [
      { _id: 'r2', name: '湖畔厅', location: 'A 座 8F', capacity: 10, facilities: ['白板'], status: 'active', sort: 2, requiresApproval: false },
      { _id: 'r1', name: '云顶厅', location: 'A 座 12F', capacity: 20, facilities: ['投影'], status: 'active', sort: 1, requiresApproval: true },
      { _id: 'r3', name: '停用厅', location: 'B 座 1F', capacity: 8, facilities: [], status: 'inactive', sort: 3 }
    ]
  })
  const main = createHandler({ db })
  const result = await main({})

  assert.equal(result.code, 0)
  assert.deepEqual(result.data.rooms.map(room => room.id), ['r1', 'r2'])
  assert.equal(result.data.rooms[0].requiresApproval, true)
  assert.equal(Object.hasOwn(result.data.rooms[0], '_id'), false)
})

test('room-list 在空集合中初始化六间会议室', async () => {
  const db = createDb({ rooms: [] })
  const main = createHandler({ db, now: () => 123456 })
  const result = await main({})

  assert.equal(result.code, 0)
  assert.equal(result.data.rooms.length, 6)
  assert.equal(db._collections.rooms.length, 6)
  assert.equal(db._collections.rooms[0].createdAt, 123456)
})
