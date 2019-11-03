#!/bin/bash

if [ ! -d flattened ]; then
    echo "Making a new dir";
    mkdir flattened;
fi

for file in $(ls contracts); do
    echo "Flattening $file"
    flatten_name=$(basename ${file} .sol)Flattened.sol
    truffle-flattener contracts/$file > flattened/$flatten_name
    echo "Flattened into $flatten_name"
done
