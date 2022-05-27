#!/usr/bin/env bash

if [[ ! -d ./.multichain ]]
then
    cp -r ./multichain-dev-original ./.multichain
fi

echo "Checking if multichain is alredy running";
ps -aux | grep -i multichain;
echo "Done check!";

if [[ ! -z "${MULTICHAIN_CONNECT_ADDRESS}" ]]; then
    echo "Connecting to server remotely";
    ./multichaind $MULTICHAIN_CONNECT_ADDRESS -datadir=./.multichain
else
    echo "Running server directly";
    ./multichaind ihatecryptocoin -datadir=./.multichain
fi
