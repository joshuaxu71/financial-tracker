#!/bin/bash

if [ "$1" = "a" ]; then
    npx expo run:android
elif [ "$1" = "i" ]; then
    npx expo run:ios
elif [ "$1" = "w" ]; then
    npx expo start --web
elif [ "$1" = "d" ]; then
    npx expo start
elif [ "$1" = "dc" ]; then
    npx expo start --clear
elif [ "$1" = "t" ]; then
    npx expo --tunnel
elif [ "$1" = "bd" ]; then
    eas build --profile development --platform all
elif [ "$1" = "bpv" ]; then
    eas build --profile preview --platform all
elif [ "$1" = "bpva" ]; then
    eas build --profile preview --platform android
elif [ "$1" = "bpvi" ]; then
    eas build --profile preview --platform ios
elif [ "$1" = "bpd" ]; then
    eas build --profile production --platform all
elif [ "$1" = "bpda" ]; then
    eas build --profile production --platform android
elif [ "$1" = "bpdi" ]; then
    eas build --profile production --platform ios
elif [ "$1" = "si" ]; then
    eas submit --platform ios
elif [ "$1" = "sa" ]; then
    eas submit --platform android
elif [ "$1" = "u" ]; then
    eas update --branch preview
else
    npx expo run:ios
fi