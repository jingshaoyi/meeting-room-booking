const DEFAULT_ROOMS = [
  { _id: 'r1', name: '云顶厅', location: 'A 座 12F', capacity: 20, facilities: ['投影', '视频会议', '白板'], sort: 1 },
  { _id: 'r2', name: '湖畔厅', location: 'A 座 8F', capacity: 10, facilities: ['投影', '白板'], sort: 2 },
  { _id: 'r3', name: '山海厅', location: 'B 座 5F', capacity: 30, facilities: ['投影', '视频会议', '音响'], sort: 3 },
  { _id: 'r4', name: '星空厅', location: 'B 座 15F', capacity: 6, facilities: ['白板'], sort: 4 },
  { _id: 'r5', name: '晨曦厅', location: 'C 座 3F', capacity: 12, facilities: ['投影', '视频会议'], sort: 5 },
  { _id: 'r6', name: '望岳厅', location: 'C 座 9F', capacity: 16, facilities: ['投影', '白板', '音响'], sort: 6 }
]

function toRoom(record) {
  return {
    id: record._id,
    name: record.name,
    location: record.location,
    capacity: record.capacity,
    facilities: record.facilities || [],
    requiresApproval: Boolean(record.requiresApproval)
  }
}

function createHandler({ db, now = Date.now }) {
  return async function main() {
    try {
      const { total } = await db.collection('rooms').count()
      if (total === 0) {
        const timestamp = now()
        await Promise.all(DEFAULT_ROOMS.map(room => {
          const { _id, ...fields } = room
          return db.collection('rooms').doc(_id).set({
            data: {
              ...fields,
              status: 'active',
              requiresApproval: false,
              createdAt: timestamp,
              updatedAt: timestamp
            }
          })
        }))
      }
      const { data } = await db.collection('rooms')
        .where({ status: 'active' })
        .orderBy('sort', 'asc')
        .get()
      return { code: 0, data: { rooms: data.map(toRoom) } }
    } catch (error) {
      console.error('room-list failed', error)
      return { code: 500, message: '会议室加载失败，请稍后重试' }
    }
  }
}

module.exports = { createHandler }
