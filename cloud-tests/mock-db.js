function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function matches(record, query) {
  return Object.entries(query).every(([key, expected]) => {
    if (expected && Array.isArray(expected.__in)) {
      return expected.__in.includes(record[key])
    }
    return record[key] === expected
  })
}

function createDb(initial = {}) {
  const collections = {}
  for (const [name, records] of Object.entries(initial)) {
    collections[name] = clone(records)
  }

  const db = {
    command: {
      in: values => ({ __in: values })
    },
    createCollection: async name => {
      if (!collections[name]) collections[name] = []
    },
    runTransaction: async callback => callback(db),
    collection(name) {
      if (!collections[name]) collections[name] = []
      const records = collections[name]

      function makeQuery(query = {}, order = null, max = null) {
        return {
          where(nextQuery) {
            return makeQuery({ ...query, ...nextQuery }, order, max)
          },
          orderBy(field, direction) {
            return makeQuery(query, { field, direction }, max)
          },
          limit(nextMax) {
            return makeQuery(query, order, nextMax)
          },
          async count() {
            return { total: records.filter(record => matches(record, query)).length }
          },
          async get() {
            let result = records.filter(record => matches(record, query))
            if (order) {
              result = result.slice().sort((a, b) => {
                const diff = a[order.field] > b[order.field] ? 1 : a[order.field] < b[order.field] ? -1 : 0
                return order.direction === 'desc' ? -diff : diff
              })
            }
            if (max !== null) result = result.slice(0, max)
            return { data: clone(result) }
          }
        }
      }

      return {
        where: query => makeQuery(query),
        orderBy: (field, direction) => makeQuery({}, { field, direction }),
        count: async () => ({ total: records.length }),
        async add({ data }) {
          const record = { _id: data._id || `generated-${records.length + 1}`, ...clone(data) }
          records.push(record)
          return { _id: record._id }
        },
        doc(id) {
          return {
            async get() {
              const record = records.find(item => item._id === id)
              if (!record) throw new Error('document not found')
              return { data: clone(record) }
            },
            async set({ data }) {
              const index = records.findIndex(item => item._id === id)
              const record = { ...clone(data), _id: id }
              if (index >= 0) records[index] = record
              else records.push(record)
              return { _id: id }
            },
            async update({ data }) {
              const record = records.find(item => item._id === id)
              if (!record) throw new Error('document not found')
              Object.assign(record, clone(data))
              return { stats: { updated: 1 } }
            },
            async remove() {
              const index = records.findIndex(item => item._id === id)
              if (index < 0) throw new Error('document not found')
              records.splice(index, 1)
              return { stats: { removed: 1 } }
            }
          }
        }
      }
    }
  }

  db._collections = collections
  return db
}

module.exports = { createDb }
