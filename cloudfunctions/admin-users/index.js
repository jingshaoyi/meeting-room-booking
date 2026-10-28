const cloud = require('wx-server-sdk')
const { createHandler } = require('./handler')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const handler = createHandler({ db, getOpenId: () => cloud.getWXContext().OPENID })
const collectionReady = db.createCollection('users').catch(() => {})

exports.main = async (event, context) => {
  await collectionReady
  return handler(event, context)
}
