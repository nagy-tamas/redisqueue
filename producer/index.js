const redis = require('redis')
const PUBSUB_CHANNEL_NAME = 'redisqueue'
const REDIS_HASH_STATUS = 'jobsstatus'
const REDIS_HASH_PROCESSABLE = 'jobsprocessable'
const REDIS_HASH_DONE = 'jobsdone'

let timer

const generateId = () => Math.round(Math.random() * 999999999)
const generateData = (length) => new Array(length).fill(0).join('')
const delayBetweenInserts = () => 1500 + (Math.random() * 1000)

const config = {
  redis: {
    host: process.env.REDIS_HOSTS
  }
}

const client = redis.createClient({
  host: config.redis.host
})

client.on('error', function(err) {
  console.log('Error ' + err)
})





const pub = client.duplicate()

const publishNewEntry = () => {
  const id = generateId()
  client.hset([REDIS_HASH_STATUS, id, JSON.stringify({ new: new Date })], () => {
    client.rpush([REDIS_HASH_PROCESSABLE, JSON.stringify({ id: id, data: generateData(5000) })], () => {
      pub.publish(PUBSUB_CHANNEL_NAME, `A new job was inserted.`)
      console.log(new Date(), `A new job (#${id}) was inserted into ${REDIS_HASH_PROCESSABLE}`)
      timer = setTimeout(publishNewEntry, delayBetweenInserts())
    })
  })
}

timer = setTimeout(publishNewEntry, delayBetweenInserts())


process.on('SIGTERM', function () {
  client.quit()
  pub.quit()
})
