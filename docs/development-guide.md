# Development

Guide to get local development environment setup to build and run the project

## Setup

1. Install dependencies
    * node (suggest using a version manager such as [nvm](https://github.com/creationix/nvm))
    * [docker](https://docs.docker.com/install/)
1. Start redis
    ```sh
    docker run -p 6379:6379 redis
    ```