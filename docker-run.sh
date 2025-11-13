#!/bin/bash

# Script to run the MCP SSH Server in Docker
# This is useful for testing the container locally

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}MCP SSH Server - Docker Runner${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    echo "Please start Docker Desktop and try again"
    exit 1
fi

# Build the image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t mcp-ssh-server:latest .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker image built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build Docker image${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Image built successfully!${NC}"
echo ""
echo "To use with Claude Desktop, update your config file:"
echo ""
echo "macOS: ~/Library/Application Support/Claude/claude_desktop_config.json"
echo "Windows: %APPDATA%/Claude/claude_desktop_config.json"
echo "Linux: ~/.config/Claude/claude_desktop_config.json"
echo ""
echo "Add this configuration:"
echo ""
echo '{'
echo '  "mcpServers": {'
echo '    "ssh": {'
echo '      "command": "docker",'
echo '      "args": ['
echo '        "run",'
echo '        "--rm",'
echo '        "-i",'
echo '        "--network=host",'
echo '        "-v", "'"$HOME"'/.ssh:/root/.ssh:ro",'
echo '        "mcp-ssh-server:latest"'
echo '      ]'
echo '    }'
echo '  }'
echo '}'
echo ""
echo -e "${YELLOW}Note: Adjust the SSH key volume mount path as needed${NC}"
echo ""
echo "Test the container by running:"
echo "  docker run --rm -i --network=host -v ~/.ssh:/root/.ssh:ro mcp-ssh-server:latest"
echo ""
