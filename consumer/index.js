const redis = require('redis')
const PUBSUB_CHANNEL_NAME = 'redisqueue'
const REDIS_HASH_STATUS = 'jobsstatus'
const REDIS_HASH_PROCESSABLE = 'jobsprocessable'
const REDIS_HASH_DONE = 'jobsdone'

let processing = false

const delayBetweenProcessings = () => 5000 + (Math.random() * 1000)

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
  processing = true

  client.lpop(REDIS_HASH_PROCESSABLE, (err, recordJSONStr) => {
    if (err) {
      processing = false
      return
    }

    if (recordJSONStr === null) {
      console.log(new Date, `Nothing to process, ${REDIS_HASH_PROCESSABLE} is empty`)
      processing = false
      return
    }

    const record = JSON.parse(recordJSONStr)
    console.log(new Date, `Job #${record.id} is ready to be processed.`)

    client.hget(REDIS_HASH_STATUS, record.id, (err, statusJSONStr) => {
      const status = JSON.parse(statusJSONStr)
      status.processing = new Date

      client.hset([REDIS_HASH_STATUS, record.id, JSON.stringify(status)], () =>
        // do the computations here

        // !! set back the processing flag to false when the external
        // process timeouts / run on error!
        setTimeout(() => {
          client.hset([REDIS_HASH_DONE, record.id, record.data], () => {
            status.processed = new Date
            client.hset([REDIS_HASH_STATUS, record.id, JSON.stringify(status)])
            console.log(new Date, `Job #${record.id} was processed.`)
            console.log(new Date, `Let's find out if the queue is empty already`)
            processing = false
            processNext()
          })
        }, delayBetweenProcessings())
      )

    })
  })
}

sub.on('message', function (channel, message) {
  if (processing) {
    console.log(new Date, 'Message received, but the consumer is busy')
    return
  }

  console.log(new Date, 'Message received, time to query the db')
  processNext()
})

sub.subscribe(PUBSUB_CHANNEL_NAME)

// initial query
processNext()

sub.on('error', function(err) {
  console.log('Error ' + err)
})



process.on('SIGTERM', function () {
  client.quit()
  sub.quit()
})
