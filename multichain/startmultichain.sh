#!/usr/bin/env bash

if [[ ! -z "${MULTICHAIN_CONNECT_ADDRESS}" ]]; then
    echo "Connecting to server remotely";
    if [[ ! -d ./.multichain ]]
    then
        cp -r ./multichain-prod ./.multichain
    fi
    ./multichaind ihatecryptocoin@$(dig +short $MULTICHAIN_CONNECT_ADDRESS | tail -n1):$MULTICHAIN_CONNECT_PORT -datadir=./.multichain
else
    if [[ ! -d ./.multichain ]]
    then
        cp -r ./multichain-dev-original ./.multichain
        cp -r ./multichain-dev-node2 ./.multichain2
    fi
    echo "Running server directly";
    ./multichaind ihatecryptocoin -datadir=./.multichain & ./multichaind ihatecryptocoin@127.0.0.1:7181 -datadir=./.multichain2 -listen=0
fi
