const test = require('node:test')
const assert = require('node:assert/strict')
const { createDb } = require('./mock-db')
const { createHandler } = require('../cloudfunctions/admin-users/handler')

function setup(openid = 'admin-1') {
  const db = createDb({
    users: [
      { _id: 'admin-1', name: '管理员', role: 'admin', createdAt: 100 },
      { _id: 'admin-2', name: '第二管理员', role: 'admin', createdAt: 200 },
      { _id: 'user-1', name: '张三', role: 'user', createdAt: 300 }
    ]
  })
  const main = createHandler({ db, getOpenId: () => openid, now: () => 2000 })
  return { db, main }
}

test('admin-users 拒绝普通用户查看用户列表', async () => {
  const { main } = setup('user-1')
  const result = await main({ action: 'list' })
  assert.equal(result.code, 403)
})

test('admin-users 返回用户及角色列表', async () => {
  const { main } = setup()
  const result = await main({ action: 'list' })

  assert.equal(result.code, 0)
  assert.equal(result.data.users.length, 3)
  assert.equal(result.data.users[0].id, 'user-1')
})

test('admin-users 可以设置和取消其他管理员', async () => {
  const { db, main } = setup()
  const promoted = await main({ action: 'set-role', userId: 'user-1', role: 'admin' })
  const demoted = await main({ action: 'set-role', userId: 'admin-2', role: 'user' })

  assert.equal(promoted.code, 0)
  assert.equal(demoted.code, 0)
  assert.equal(db._collections.users.find(user => user._id === 'user-1').role, 'admin')
  assert.equal(db._collections.users.find(user => user._id === 'admin-2').role, 'user')
})

test('admin-users 禁止取消自己的管理员权限', async () => {
  const { db, main } = setup()
  const result = await main({ action: 'set-role', userId: 'admin-1', role: 'user' })

  assert.equal(result.code, 403)
  assert.equal(db._collections.users[0].role, 'admin')
})

test('admin-users 禁止移除最后一个管理员', async () => {
  const db = createDb({ users: [{ _id: 'admin-1', role: 'admin' }] })
  const main = createHandler({ db, getOpenId: () => 'admin-1' })
  const result = await main({ action: 'set-role', userId: 'admin-1', role: 'user' })

  assert.equal(result.code, 403)
  assert.equal(db._collections.users[0].role, 'admin')
})
