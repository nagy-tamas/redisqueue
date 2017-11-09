# What's this?

A simple demonstration of Redis as a queue with node.


# How to use?

Run `docker-compose up` and watch the logs.

Visit `localhost:8081` to check redis via [redis-commander](https://github.com/joeferner/redis-commander).


docker-compose up --force-recreate --scale redisqueue_producer=2 --scale redisqueue_consumer=3


## Requisites

* Docker & docker-compose
