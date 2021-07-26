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
    echo $(wg)
    ;;

  deactivateInterface)
    INTERFACE_NAME=$2
    echo $(wg-quick down $INTERFACE_NAME)
    ;;

  activateInterface)
    INTERFACE_NAME=$2
    echo $(wg-quick up $INTERFACE_NAME)
    ;;

  enableInterface)
    INTERFACE_NAME=$2
    echo $(systemctl enable wg-quick@$INTERFACE_NAME)
    ;;

  disableInterface)
    INTERFACE_NAME=$2
    echo $(systemctl disable wg-quick@$INTERFACE_NAME)
    ;;

  moveFile)
    SOURCE=$2
    DESTINSTION=$3
    echo $(cp $2 $3)
    echo $(rm $2)
    ;;

  deleteFile)
    FILENAME=$2
    echo $(rm $2)
    ;;

  addPeerToActiveInterface)
    PRIVATE_KEY=$(wg genkey)
    PUBLIC_KEY=$(wg pubkey <<< $PRIVATE_KEY)
    INTERFACE_NAME=$2
    ADDRESS=$3
    wg set $INTERFACE_NAME peer $PUBLIC_KEY allowed-ips $ADDRESS
    printf '\nPublicKey = %s\nAllowedIPs = %s\n' $PUBLIC_KEY $ADDRESS >> /etc/wireguard/$INTERFACE_NAME.conf
    printf '{"privateKey":"%s","publicKey":"%s"}' $PRIVATE_KEY $PUBLIC_KEY
    ;;
  
  addPeerToDeactiveInterface)
    PRIVATE_KEY=$(wg genkey)
    PUBLIC_KEY=$(wg pubkey <<< $PRIVATE_KEY)
    INTERFACE_NAME=$2
    ADDRESS=$3
    printf '\nPublicKey = %s\nAllowedIPs = %s\n' $PUBLIC_KEY $ADDRESS >> /etc/wireguard/$INTERFACE_NAME.conf
    printf '{"privateKey":"%s","publicKey":"%s"}' $PRIVATE_KEY $PUBLIC_KEY
    ;;


esac