FROM ubuntu:17.04

RUN apt-get update && \
  apt-get install -y curl mc wget sudo && \
  rm -rf /var/lib/apt/lists/*

RUN curl -sL https://deb.nodesource.com/setup_9.x | bash -
RUN apt-get install -y nodejs

RUN useradd --user-group --create-home --shell /bin/false producer
ENV HOME=/home/producer
WORKDIR $HOME
ENV TERM xterm-256color
RUN mkdir app
WORKDIR $HOME/app

COPY producer/package.json .

# everything copied as root, let's fix it
RUN chown -R producer:producer $HOME/*

USER producer

RUN npm install

EXPOSE 3000

CMD [ "npm", "run", "start" ]
