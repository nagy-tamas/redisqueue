const redis = require('redis')
const bluebird = require('bluebird')

// make redis to use promises instead of callbacks
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const client = redis.createClient({
  host: 'redisqueue_redis'
})

client.on('error', function(err) {
  console.log('Error ' + err)
})

client.set('string key', 'string val', redis.print)
client.hset('hash key', 'hashtest 1', 'some value', redis.print)
client.hset(['hash key', 'hashtest 2', 'some other value'], redis.print)
client.hkeys('hash key', function (err, replies) {
  console.log(replies.length + ' replies:')
  replies.forEach(function (reply, i) {
    console.log('    ' + i + ': ' + reply)
  })
  client.quit()
})
