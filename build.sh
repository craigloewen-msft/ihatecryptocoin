#!/usr/bin/env bash

npm install;

if [[ -f "./node_modules/.bin/concurrently" ]]; then
    echo "Concurrently found"
else 
    echo "Concurrently not found"
fi

cd backend;
npm install --production;
cd ..;

cd frontend;
npm install;
npm run build;
cd ..;

cp -r ./frontend/dist ./backend/