#!/usr/bin/env bash

npm install;

cd backend;
npm install --production;
cd ..;

cd frontend;
npm install;
npm run build;
cd ..;

cp -r ./frontend/dist ./backend/