#!/bin/bash

# Change working directory to script location
cd "$(dirname "$0")"

# Ensure html directory exists
mkdir -p html

# Build english html files
po2html -i _locales/en-US -t ../ -o html/en
