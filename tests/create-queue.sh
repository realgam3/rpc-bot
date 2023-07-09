#!/usr/bin/env bash

docker run --rm -d -p5672:5672 --name queue rabbitmq:3.11-alpine
