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

esac