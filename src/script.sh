#!/bin/bash

# Force to run as root
[[ $UID == 0 ]] || { echo "You must be root to run this."; exit 1; }

ACTION=$1

case $ACTION in

  getKeys)
    PRIVATE_KEY=$(wg genkey)
    PUBLIC_KEY=$(wg pubkey <<< $PRIVATE_KEY)
    printf '{"privateKey":"%s","publicKey":"%s"}' $PRIVATE_KEY $PUBLIC_KEY
    ;;

  genPublicKey)
    PRIVATE_KEY=$2
    PUBLIC_KEY=$(wg pubkey <<< $PRIVATE_KEY)
    printf '{"privateKey":"%s","publicKey":"%s"}' $PRIVATE_KEY $PUBLIC_KEY
    ;;

  getActiveInterface)
    printf $(wg)
    ;;

  deactivateInterface)
    INTERFACE_NAME=$2
    printf $(wg-quick down $INTERFACE_NAME)
    ;;

  activateInterface)
    INTERFACE_NAME=$2
    printf $(wg-quick up $INTERFACE_NAME)
    ;;

  writeConfigFile)
    FILENAME=$2
    CONFIG=$3
    printf $CONFIG >> /etc/wireguard/$FILENAME

esac