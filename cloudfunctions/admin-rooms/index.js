const cloud = require('wx-server-sdk')
const { createHandler } = require('./handler')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const handler = createHandler({ db, getOpenId: () => cloud.getWXContext().OPENID })
const collectionsReady = Promise.all(
  ['users', 'rooms', 'bookings'].map(name => db.createCollection(name).catch(() => {}))
)

exports.main = async (event, context) => {
  await collectionsReady
  return handler(event, context)
}
