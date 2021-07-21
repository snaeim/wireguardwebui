ACTION=$1

case $ACTION in

    getKeys)
    PRIVATE_KEY=Iuw29m/LR9+63ViF7IER2VtjuQPUdRuQVcFwLr/ZM1M=
    PUBLIC_KEY=ZUgb9IdFkfjfMIOJMBOWTcQbntIV3CQjka/fhVktSDw=
    printf '{"privateKey":"%s","publicKey":"%s"}' $PRIVATE_KEY $PUBLIC_KEY
    ;;

    genPublicKey)
    PRIVATE_KEY=$2
    PUBLIC_KEY=ZUgb9IdFkfjfMIOJMBOWTcQbntIV3CQjka/fhVktSDw=
    printf '{"privateKey":"%s","publicKey":"%s"}' $PRIVATE_KEY $PUBLIC_KEY
    ;;

    getActiveInterface)
    printf "interface: wg0
  public key: P6ScWAHgnB7X5rkQj7dIBti8/NmoY3EYmaZvtc1gRx8=
  private key: (hidden)
  listening port: 6619

peer: QtYQt8XpvTOCeXSETBBaEpytWsTfT2C3x/WsM0IsHVw=
  allowed ips: 10.8.240.10/32

peer: z9uy0Jf2gCETRZuYiLjWCcb2sSwbPcpHa8Lm13ek5Xc=
  allowed ips: 10.8.240.25/32

interface: wg3
  public key: P6ScWAHgnB7X5rkQj7dIBti8/NmoY3EYmaZvtc1gRx8=
  private key: (hidden)
  listening port: 51820

peer: +zzLpw80JgBbWfUe7LMGrFNZA8eZin80mjW9Rscv93A=
  endpoint: 5.74.219.25:59049
  allowed ips: 10.10.7.64/32
  latest handshake: 3 seconds ago
  transfer: 372.17 MiB received, 5.18 GiB sent

peer: 6DttPj4xNE6uYESZqYNVSsRzobGNh8VOOx+Y3+rGJxM=
  endpoint: 5.125.128.171:2382
  allowed ips: 10.10.7.53/32
  latest handshake: 6 seconds ago
  transfer: 187.62 MiB received, 1.26 GiB sent

peer: C17eTjcmmxnFC/rWhNFJc8qnQYlQzZlNnFssnLjfw14=
  allowed ips: 10.10.7.83/32

peer: j/DlrE8Imw1c3hzVpEaKUALjTtczEy8+MYwCuvz8nig=
  allowed ips: 10.10.7.84/32"
  ;;

  deactivateInterface)
  INTERFACE_NAME=$2
  printf '[#] ip link delete dev wg1'
  ;;

  activateInterface)
  INTERFACE_NAME=$2
  printf "[#] ip link add wg1 type wireguard
[#] wg setconf wg1 /dev/fd/63
[#] ip -4 address add 10.8.240.1/25 dev wg1
[#] ip link set mtu 1420 up dev wg1"
  ;;

  restartInterface)
  INTERFACE_NAME=$2
  printf "[#] ip link delete dev wg1
[#] ip link add wg1 type wireguard
[#] wg setconf wg1 /dev/fd/63
[#] ip -4 address add 10.8.240.1/25 dev wg1
[#] ip link set mtu 1420 up dev wg1"
  ;;

esac