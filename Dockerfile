FROM node:14

WORKDIR /app/

COPY . .

RUN npm install

RUN npm build

EXPOSE 80

ENV NODE_ENV=production   

CMD [ "npm", "start"]