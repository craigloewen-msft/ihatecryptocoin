#!/usr/bin/env bash

rm -rf ./.multichain

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
    fi
    echo "Running server directly";
    ./multichaind ihatecryptocoin -datadir=./.multichain
fi
