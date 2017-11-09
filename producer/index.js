const redis = require('redis')
const PUBSUB_CHANNEL_NAME = 'redisqueue'
const REDIS_HASH_STATUS = 'jobsstatus'
const REDIS_HASH_PROCESSABLE = 'jobsprocessable'
const REDIS_HASH_DONE = 'jobsdone'

let timer

const generateId = () => Math.round(Math.random() * 999999999)
const delayBetweenInserts = () => 1500 + (Math.random() * 1000)
const generateRandomData = (length) => {
  const arr = []
  for (let i = 0; i < length; i++) {
    arr.push(Math.round(Math.random() * 10))
  }
  return arr.join('')
}

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
    client.rpush([REDIS_HASH_PROCESSABLE, JSON.stringify({ id: id, data: generateRandomData(512) })], () => {
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
