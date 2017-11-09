const redis = require('redis')
const PUBSUB_CHANNEL_NAME = 'redisqueue'
const REDIS_HASH_STATUS = 'jobsstatus'
const REDIS_HASH_PROCESSABLE = 'jobsprocessable'
const REDIS_HASH_DONE = 'jobsdone'

// a flag to check if this instance is able to receive new jobs
let processing = false

/**
 * The consumer will simulate calculations for that much period of time
 *
 * @return Integer ms
 */
const delayBetweenProcessings = () => 5000 + (Math.random() * 1000)

// redis config
const config = {
  redis: {
    host: process.env.REDIS_HOSTS
  }
}

// we'll create two connections: one for querying (client) and one to handle
// the pubsub events (sub, see below)
const client = redis.createClient({
  host: config.redis.host
})

client.on('error', function(err) {
  console.log('Redis Error: ' + err)
})






const sub = client.duplicate()

/**
 * Gets the next job from the list, works on it, and inserts it back
 *
 * @return undefined
 */
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
        // do some computations here, simulated with a setTimeout
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

// We're waiting for the message that tells there's some work to do.
sub.on('message', function (channel, message) {
  // This consumer is working on a job asynchronously, so it still receives
  // events. We only work on one job in one time though.
  if (processing) {
    console.log(new Date, 'Message received, but the consumer is busy')
    return
  }

  console.log(new Date, 'Message received, time to query the db')
  processNext()
})

// Let's listen to this channel
sub.subscribe(PUBSUB_CHANNEL_NAME)

// initial query - probably there's some data in the jobsprocessable list already
processNext()

sub.on('error', function(err) {
  console.log('Redis Error: ' + err)
})


// Graceful exit, closing the connections
process.on('SIGTERM', function () {
  client.quit()
  sub.quit()
})
