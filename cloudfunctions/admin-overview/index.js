const cloud = require('wx-server-sdk')
const { createHandler } = require('./handler')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function chinaToday() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

const handler = createHandler({ db, getOpenId: () => cloud.getWXContext().OPENID, today: chinaToday })
const collectionsReady = Promise.all(
  ['users', 'rooms', 'bookings'].map(name => db.createCollection(name).catch(() => {}))
)

exports.main = async (event, context) => {
  await collectionsReady
  return handler(event, context)
}
