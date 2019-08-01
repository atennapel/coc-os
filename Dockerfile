FROM mhart/alpine-node:12
COPY build /usr/local/build
CMD node /usr/local/build/src/cli
