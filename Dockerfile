FROM node:8
ADD . /home/node/app
WORKDIR /home/node/app
RUN npm install --no-cache
CMD [ "npm", "run", "app" ]
