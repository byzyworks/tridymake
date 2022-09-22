#!/bin/bash

if [ $EUID -eq 0 ]; then
    unlink "/usr/local/bin/tridy";
else
    unlink "$HOME/.local/bin/tridy";
fi

echo "> Tridymake was successfully uninstalled."
echo;
