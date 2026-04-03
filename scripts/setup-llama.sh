#!/bin/bash
#
# Downloads llama.cpp source into modules/on-device-llm/llama.cpp/
# Run this once before building: npm run setup:llama
#

set -e

LLAMA_VERSION="b4920"  # Pinned release — update as needed
LLAMA_DIR="$(dirname "$0")/../modules/on-device-llm/llama.cpp"

if [ -f "$LLAMA_DIR/CMakeLists.txt" ]; then
    echo "[setup-llama] llama.cpp already present at $LLAMA_DIR"
    echo "[setup-llama] To re-download, delete the directory and run again."
    exit 0
fi

echo "[setup-llama] Downloading llama.cpp $LLAMA_VERSION..."

# Clean up any partial download
rm -rf "$LLAMA_DIR"
mkdir -p "$LLAMA_DIR"

# Download and extract
TARBALL_URL="https://github.com/ggml-org/llama.cpp/archive/refs/tags/$LLAMA_VERSION.tar.gz"
echo "[setup-llama] URL: $TARBALL_URL"

curl -L --fail "$TARBALL_URL" | tar xz --strip-components=1 -C "$LLAMA_DIR"

if [ -f "$LLAMA_DIR/CMakeLists.txt" ]; then
    echo "[setup-llama] Success! llama.cpp $LLAMA_VERSION extracted to $LLAMA_DIR"
else
    echo "[setup-llama] ERROR: Download/extract failed."
    echo "[setup-llama] You can manually clone: git clone --depth 1 --branch $LLAMA_VERSION https://github.com/ggml-org/llama.cpp.git $LLAMA_DIR"
    exit 1
fi
