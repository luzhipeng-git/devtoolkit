#!/bin/bash
# Tauri Docker Build Script
# Usage:
#   ./docker-build.sh check    - Verify Rust compilation
#   ./docker-build.sh dev      - Start Tauri dev mode (needs X11 forwarding)
#   ./docker-build.sh build    - Build production Tauri app
set -e

IMAGE_NAME="tauri-builder"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Build Docker image if not exists
if ! docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
    echo "Building Tauri builder Docker image..."
    docker build -t "$IMAGE_NAME" - <<'DOCKERFILE'
FROM fedora:40

RUN dnf install -y \
    gcc gcc-c++ make \
    openssl-devel glib2-devel gtk3-devel \
    webkit2gtk4.1-devel libsoup3-devel \
    libappindicator-gtk3-devel \
    && dnf clean all

# Install Rust
RUN curl https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install Node.js 20
RUN dnf install -y nodejs npm && dnf clean all
RUN npm install -g pnpm

WORKDIR /app
DOCKERFILE
    echo "Docker image built: $IMAGE_NAME"
fi

COMMAND="${1:-check}"

case "$COMMAND" in
    check)
        echo "Running cargo check..."
        docker run --rm \
            -v "$SCRIPT_DIR:/app" \
            -v tauri-cargo-registry:/root/.cargo/registry \
            -w /app/src-tauri \
            "$IMAGE_NAME" \
            cargo check
        ;;
    build)
        echo "Building Tauri app..."
        docker run --rm \
            -v "$SCRIPT_DIR:/app" \
            -v tauri-cargo-registry:/root/.cargo/registry \
            -v tauri-pnpm-store:/root/.local/share/pnpm \
            -w /app \
            "$IMAGE_NAME" \
            bash -c "pnpm install && pnpm build && cd src-tauri && cargo build --release"
        ;;
    dev)
        echo "Starting Tauri dev (requires X11 forwarding)..."
        docker run --rm -it \
            -v "$SCRIPT_DIR:/app" \
            -v tauri-cargo-registry:/root/.cargo/registry \
            -v /tmp/.X11-unix:/tmp/.X11-unix \
            -e DISPLAY="$DISPLAY" \
            -w /app \
            "$IMAGE_NAME" \
            bash -c "pnpm install && pnpm tauri dev"
        ;;
    *)
        echo "Usage: $0 {check|build|dev}"
        exit 1
        ;;
esac
