# serverless-crawler

## goals

- language agnostic web crawler
- crawl javascript pages

## technologies

- browserless
- redis (queue/semaphore)

## features

- scalable
  - volume based scale up/down
- job contract
- distributed
  - job heartbeat
  - job timeout
  - global depth
  - duplicate skip
  - release delay
- proxy requests
- support for login flows
- locally run
  - single jobs (no redis, chrome dependencies)
  - multiple jobs (with redis and chrome)
- run on any cloud function provider (AWS lambda, GCP function, openfaas)