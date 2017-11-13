const redis = require('redis')
const PUBSUB_CHANNEL_NAME = 'redisqueue'
const REDIS_HASH_STATUS = 'jobsstatus'
const REDIS_HASH_PROCESSABLE = 'jobsprocessable'
const REDIS_HASH_DONE = 'jobsdone'

// to keep tracks of the current timeout, so we can remove it if necessary
let timer

/**
 * Generates a more or less unique id for a job
 * @return String
 */
const generateId = () => Math.round(Math.random() * 999999999)

/**
 * This is how often a new insert will occur
 * @return Integer ms
 */
const delayBetweenInserts = () => 1500 + (Math.random() * 1000)

/**
 * A very dumb way to produce some random data.
 *
 * It's important to use some random garbage, so nothing will try to optimize it.
 *
 * @param  Integer length  Length of the randomized string that simulates the data
 * @return String
 */
const generateRandomData = (length) => {
  const arr = []
  for (let i = 0; i < length; i++) {
    arr.push(Math.round(Math.random() * 10))
  }
  return arr.join('')
}

// redis config
const config = {
  redis: {
    host: process.env.REDIS_HOSTS
  }
}

// we'll create two connections: one for querying (client) and one to handle
// the pubsub events (pub, see below)
const client = redis.createClient({
  host: config.redis.host
})

client.on('error', function(err) {
  console.log('Redis Error: ' + err)
})





const pub = client.duplicate()

/**
 * Adds a new entry to redis
 *
 * @return undefined
 */
const publishNewEntry = () => {
  const id = generateId()
  client.hset([REDIS_HASH_STATUS, id, JSON.stringify({ new: new Date })], () => {
    client.rpush([REDIS_HASH_PROCESSABLE, JSON.stringify({ id: id, data: generateRandomData(512 * 1024) })], () => {
      pub.publish(PUBSUB_CHANNEL_NAME, `A new job was inserted.`)
      console.log(new Date(), `A new job (#${id}) was inserted into ${REDIS_HASH_PROCESSABLE}`)
      timer = setTimeout(publishNewEntry, delayBetweenInserts())
    })
  })
}

timer = setTimeout(publishNewEntry, delayBetweenInserts())

pub.on('error', function(err) {
  console.log('Redis Error: ' + err)
})

// Graceful exit, closing the connections, killing the timeouts
process.on('SIGTERM', function () {
  clearTimeout(timer)
  client.quit()
  pub.quit()
})
