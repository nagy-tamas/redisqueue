const redis = require('redis')
const PUBSUB_CHANNEL_NAME = 'redisqueue'
const REDIS_HASH_STATUS = 'jobsstatus'
const REDIS_HASH_PROCESSABLE = 'jobsprocessable'
const REDIS_HASH_DONE = 'jobsdone'

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






const sub = client.duplicate()

const processNext = function() {
  client.lpop(REDIS_HASH_PROCESSABLE, (err, data) => {
    if (err) {
      return
    }

    if (data === null) {
      console.log(new Date, `Nothing to process, ${REDIS_HASH_PROCESSABLE} is empty`)
      return
    }

    const record = JSON.parse(data)
    client.hset([REDIS_HASH_STATUS, record.id, 'processing'])
    client.hset([REDIS_HASH_DONE, record.id, record.data], () => {
      client.hset([REDIS_HASH_STATUS, record.id, 'processed'])
      console.log(new Date, `Job #${record.id} was processed.`);
      console.log(new Date, `Let's find out if the queue is empty already`);
      processNext();
    })
  })
}

sub.on('message', function (channel, message) {
  console.log(new Date, 'Message received, time to query the db')
  processNext()
})

sub.subscribe(PUBSUB_CHANNEL_NAME)

sub.on('error', function(err) {
  console.log('Error ' + err)
})



process.on('SIGTERM', function () {
  client.quit()
  sub.quit()
})
