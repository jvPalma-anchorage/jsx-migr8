#!/bin/bash
# Simple wrapper to start development environment

# Check if we're in Termux
if [ -d "/data/data/com.termux" ]; then
    echo "🤖 Detected Termux environment"
    exec ./termux-quickstart.sh
else
    echo "💻 Starting standard development environment"
    # Check if yarn is installed
    if ! command -v yarn >/dev/null 2>&1; then
        echo "❌ Yarn is not installed. Please install it first:"
        echo "   npm install -g yarn"
        exit 1
    fi
    
    # Use the standard dev:all script
    yarn dev:all
fi