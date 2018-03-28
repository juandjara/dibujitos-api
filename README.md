# Dibujitos-api

This project uses Docker and docker-compose to manage the parts of the application.

Run `docker-compose build` once to build the docker images and then run `docker-compose up` to start the redis container and the node container.

You can start a development version that listens for changes in the files with the command `docker-compose -f docker-compose.dev.yml`. In order for this to work, a `.env` file must be located in the root of the project with at least the content of the `.env.prod` file.