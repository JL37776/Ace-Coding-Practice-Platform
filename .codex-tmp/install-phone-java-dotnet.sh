#!/usr/bin/env bash
set -eu

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y openjdk-21-jdk dotnet-sdk-8.0

java -version
javac -version
dotnet --version
