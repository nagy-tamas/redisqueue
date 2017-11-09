# What's this?

A simple demonstration of how Redis can work as a queue with multiple producer and consumer instances, where every job is processed only once. Implemented in Node.js.


# How it works?

There's 3 types of containers in this project (check *docker-compose.yml*):

* Redis: a local Redis copy we use.
* Producer: an app that periodically puts data in the *jobsprocessable* Redis list, and sends message about.
* Consumer: an app that listens to these messages, and does some work on the data.

Full flow example:

* **Redis** starts with an empty db.
* **Producer#1** starts, inserts an item in the *jobsprocessable* list (size: 0→1). It also sends an event about the insert, but no one listens.
* **Producer#2** starts, inserts an item in the *jobsprocessable* list (size: 1→2). It also sends an event about the insert, but no one listens.
* **Producer#1** inserts an other item in the *jobsprocessable* list (size: 2→3). It also sends an event about the insert, but no one listens.
* **Consumer#1** starts, starts listening. It also tries to get an item from the *jobsprocessable* list. It gets one, starts to do some work on it.  (size: 3→2)
* **Consumer#2** starts, starts listening. It also tries to get an item from the *jobsprocessable* list. It gets one, starts to do some work on it.  (size: 2→1)
* **Producer#2** inserts an other item in the *jobsprocessable* list (size: 1→2). It also sends an event about the insert, but both consumers are busy, so the item stays in the list.
* **Consumer#2** finishes the job, it puts it in the *jobsdone* hash, and automatically gets the next item from the *jobsprocessable*. There are items so it's a success (size: 2→1), so it starts working on it.
* **Consumer#1** finishes the job, it puts it in the *jobsdone* hash, and automatically gets the next item from the *jobsprocessable*. There are items so it's a success (size: 1→0), so it starts working on it.
* **Consumer#1** finishes the job, it puts it in the *jobsdone* hash, and automatically gets the next item from the *jobsprocessable*. There are no more items (size: 0), so it won't do anything.
* **Consumer#2** finishes the job, it puts it in the *jobsdone* hash, and automatically gets the next item from the *jobsprocessable*. There are no more items (size: 0), so it won't do anything.
* **Producer#2** inserts a new item in the *jobsprocessable* list (size: 0→1). It also sends an event about the insert.
* **Consumer#1** gets the event, fetches the first item from the *jobsprocessable* list (size: 1→0), and starts working on it.
* **Consumer#2** gets the event, fetches the first item from the *jobsprocessable* list (size: 0). It doesn't find anything, so it keeps listening for future events.
* ...

> Please note: there's also a *jobsstatus* hash where you can track the jobs: when was it inserted, when someone started to work on it, or when was it finished. I left it out from the example above for keep it simple.


# How to use?

Just run these commands (in this example with 2 producers and 3 consumers), watch the logs, and see what's happening.
```
docker-compose build

docker-compose up --force-recreate --scale redisqueue_producer=2 --scale redisqueue_consumer=3
```

[redis-commander](https://github.com/joeferner/redis-commander) is also included, visit `localhost:8081` to check the contents of the local Redis.


## Advanced use

Check the source files, they're pretty straightforward. Edit the delays between the inserts, or the length of the contents, and see how it affects the performance of the app. Run *docker stats* in a different terminal to see the memory, cpu and network I/O statistics.



## Requisites

Everything is dockerized so all you'll need is Docker & docker-compose.
