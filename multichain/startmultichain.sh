#!/usr/bin/env bash

if [[ ! -d ./.multichain ]]
then
    cp -r ./multichain-dev-original ./.multichain
fi

if [[ ! -z "${MULTICHAIN_CONNECT_ADDRESS}" ]]; then
    echo "Connecting to server remotely";
    ./multichaind $MULTICHAIN_CONNECT_ADDRESS
else
    echo "Running server directly";
    ./multichaind ihatecryptocoin -datadir=./.multichain
fi
