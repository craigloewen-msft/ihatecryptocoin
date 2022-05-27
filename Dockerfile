FROM node:14

WORKDIR /app/

COPY . .

RUN npm install

RUN cd backend && npm install && cd ..

RUN cd frontend && npm install && cd ..

RUN npm build

ENV NODE_ENV=production   

CMD [ "npm", "start"]