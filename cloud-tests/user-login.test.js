const test = require('node:test')
const assert = require('node:assert/strict')
const { createDb } = require('./mock-db')
const { createHandler } = require('../cloudfunctions/user-login/handler')

test('user-login 首次登录创建普通用户', async () => {
  const db = createDb({ users: [] })
  const main = createHandler({ db, getOpenId: () => 'openid-1', now: () => 1000 })
  const result = await main({})

  assert.equal(result.code, 0)
  assert.deepEqual(result.data.user, { id: 'openid-1', name: '微信用户', role: 'user' })
  assert.equal(db._collections.users[0].createdAt, 1000)
})

test('user-login 保留已有用户的姓名和管理员角色', async () => {
  const db = createDb({
    users: [{ _id: 'admin-1', name: '会议管理员', role: 'admin', createdAt: 1000 }]
  })
  const main = createHandler({ db, getOpenId: () => 'admin-1', now: () => 2000 })
  const result = await main({})

  assert.equal(result.code, 0)
  assert.deepEqual(result.data.user, { id: 'admin-1', name: '会议管理员', role: 'admin' })
  assert.equal(db._collections.users.length, 1)
})

test('user-login 返回云端写入失败原因以定位部署问题', async () => {
  const db = {
    collection: () => ({
      doc: () => ({
        get: async () => { throw new Error('document not found') },
        set: async () => { throw new Error('collection users does not exist') }
      })
    })
  }
  const main = createHandler({ db, getOpenId: () => 'openid-1' })
  const result = await main({})

  assert.equal(result.code, 500)
  assert.match(result.message, /collection users does not exist/)
})
