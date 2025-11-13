# Testing Guide for MCP SSH Server

This guide covers testing the MCP SSH Server in both native and Docker environments.

## Prerequisites for Testing

- Node.js 18+ (for native testing)
- Docker Desktop (for Docker testing)
- Access to a test SSH server
- SSH keys configured

## Unit Testing

Currently, the project focuses on integration testing. To add unit tests:

```bash
npm install --save-dev jest @types/jest ts-jest
```

Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
};
```

## Integration Testing

### Test 1: Build Verification

#### Native
```bash
npm run build
ls -la dist/
file dist/index.js
```

Expected: JavaScript files in `dist/` directory

#### Docker
```bash
docker build -t mcp-ssh-server:test .
docker images mcp-ssh-server:test
```

Expected: Image built successfully, size around 150-200MB

### Test 2: Basic Functionality

Create a test SSH server or use an existing one.

#### Test Connection (Manual)

1. Start the MCP server:
```bash
# Native
node dist/index.js

# Docker
docker run --rm -i --network=host mcp-ssh-server:test
```

2. Send MCP protocol messages (JSON-RPC 2.0 format):

**List Tools:**
```json
{"jsonrpc":"2.0","id":1,"method":"tools/list"}
```

**Connect to SSH:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "ssh_connect",
    "arguments": {
      "host": "test.example.com",
      "username": "testuser",
      "password": "testpass"
    }
  }
}
```

**Execute Command:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "ssh_execute",
    "arguments": {
      "command": "echo Hello"
    }
  }
}
```

### Test 3: Claude Desktop Integration

1. Configure Claude Desktop with the MCP server
2. Restart Claude Desktop
3. In Claude, try:

```
Please connect to my test server at test.example.com using username "testuser"
```

Expected: Connection success message

```
Execute the command "hostname" on the server
```

Expected: Hostname output

```
List the contents of /tmp
```

Expected: Directory listing

### Test 4: Error Handling

Test invalid scenarios:

```
Connect to an invalid host: invalid.nonexistent.server
```

Expected: Error message about connection failure

```
Execute a command before connecting
```

Expected: Error message about no active connection

```
Read a non-existent file
```

Expected: Error message about file not found

## Docker-Specific Tests

### Test 1: Multi-stage Build

Verify both stages work:
```bash
# Build and inspect
docker build --target builder -t mcp-ssh-server:builder .
docker images mcp-ssh-server:builder

docker build -t mcp-ssh-server:latest .
docker images mcp-ssh-server:latest
```

Compare sizes - production image should be smaller.

### Test 2: SSH Client Installation

Verify OpenSSH client is installed:
```bash
docker run --rm mcp-ssh-server:test ssh -V
```

Expected: OpenSSH version output

### Test 3: Volume Mounts

Test SSH key mounting:
```bash
# Create test key
mkdir -p /tmp/test-ssh
ssh-keygen -t ed25519 -f /tmp/test-ssh/test_key -N ""

# Mount and verify
docker run --rm \
  -v /tmp/test-ssh:/root/.ssh:ro \
  --entrypoint /bin/sh \
  mcp-ssh-server:test \
  -c "ls -la /root/.ssh && cat /root/.ssh/test_key.pub"
```

Expected: Key files visible in container

### Test 4: Network Connectivity

Test network access from container:
```bash
docker run --rm --network=host mcp-ssh-server:test \
  ssh -V
```

### Test 5: Resource Limits

Test with resource constraints:
```bash
docker run --rm -i \
  --cpus=0.5 \
  --memory=256m \
  --network=host \
  mcp-ssh-server:test
```

Monitor with:
```bash
docker stats
```

## Security Testing

### Test 1: Vulnerability Scanning

Using Docker Scout:
```bash
docker scout cves mcp-ssh-server:latest
```

Using Trivy:
```bash
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image mcp-ssh-server:latest
```

Expected: No HIGH or CRITICAL vulnerabilities

### Test 2: File Permissions

Check permissions in container:
```bash
docker run --rm --entrypoint /bin/sh mcp-ssh-server:test -c "
  ls -la /app &&
  ls -la /root/.ssh 2>/dev/null || echo 'No SSH keys mounted'
"
```

### Test 3: User Context

Verify running process:
```bash
docker run --rm --entrypoint /bin/sh mcp-ssh-server:test -c "
  id &&
  whoami
"
```

### Test 4: Capability Check

Check Linux capabilities:
```bash
docker run --rm --entrypoint /bin/sh mcp-ssh-server:test -c "
  apk add --no-cache libcap &&
  capsh --print
"
```

## Performance Testing

### Test 1: Command Execution Speed

Measure latency of command execution:
```bash
time docker run --rm -i --network=host mcp-ssh-server:test <<EOF
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "ssh_execute",
    "arguments": {
      "command": "echo test"
    }
  }
}
EOF
```

### Test 2: File Transfer Speed

Test SFTP operations with large files:
```bash
# Create 10MB test file
dd if=/dev/urandom of=/tmp/test-10mb bs=1M count=10

# Time the transfer (via Claude or manual testing)
```

### Test 3: Multiple Connections

Test concurrent connections to different servers:
```bash
# Connect to server1 with connectionId "server1"
# Connect to server2 with connectionId "server2"
# Execute commands on both simultaneously
```

## Continuous Integration Testing

The project includes a GitHub Actions workflow (`.github/workflows/docker-build.yml`) that:

1. Builds the Docker image
2. Tests basic functionality
3. Scans for vulnerabilities
4. Validates container structure

Run locally using `act`:
```bash
act -j docker-build
```

## Automated Testing Script

Create `test.sh`:
```bash
#!/bin/bash

set -e

echo "Running MCP SSH Server Tests..."

# Test 1: Build
echo "Test 1: Building Docker image..."
docker build -t mcp-ssh-server:test . || exit 1
echo "✓ Build successful"

# Test 2: Image exists
echo "Test 2: Checking image..."
docker images mcp-ssh-server:test --format "{{.Repository}}:{{.Tag}}" || exit 1
echo "✓ Image exists"

# Test 3: Node version
echo "Test 3: Checking Node.js..."
docker run --rm mcp-ssh-server:test node --version || exit 1
echo "✓ Node.js working"

# Test 4: SSH client
echo "Test 4: Checking SSH client..."
docker run --rm mcp-ssh-server:test ssh -V || exit 1
echo "✓ SSH client installed"

# Test 5: File structure
echo "Test 5: Checking file structure..."
docker run --rm --entrypoint /bin/sh mcp-ssh-server:test -c "
  test -f /app/dist/index.js &&
  test -d /root/.ssh
" || exit 1
echo "✓ File structure correct"

echo ""
echo "All tests passed! ✓"
```

Make executable and run:
```bash
chmod +x test.sh
./test.sh
```

## Troubleshooting Tests

### Build Fails

Check Node version:
```bash
node --version  # Should be 18+
```

Check dependencies:
```bash
npm install
npm audit
```

### Container Won't Start

Check logs:
```bash
docker logs <container-id>
```

Inspect container:
```bash
docker inspect mcp-ssh-server:test
```

### SSH Connection Fails

Test from host:
```bash
ssh user@hostname
```

Check network:
```bash
docker run --rm --network=host alpine ping -c 3 hostname
```

### Permission Errors

Check volume mounts:
```bash
docker run --rm -v ~/.ssh:/root/.ssh:ro --entrypoint /bin/sh \
  mcp-ssh-server:test -c "ls -la /root/.ssh"
```

## Test Checklist

Before release:

- [ ] Native build completes without errors
- [ ] Docker build completes without errors
- [ ] All tools listed correctly in MCP protocol
- [ ] SSH connection works (password auth)
- [ ] SSH connection works (key auth)
- [ ] Command execution returns correct output
- [ ] File read operations work
- [ ] File write operations work
- [ ] Directory listing works
- [ ] Multiple connections work
- [ ] Error handling works correctly
- [ ] Timeouts work as expected
- [ ] Docker image passes security scan
- [ ] Resource limits are respected
- [ ] Documentation is accurate
- [ ] Claude Desktop integration works

## Reporting Issues

When reporting issues, include:

1. Environment (Native/Docker, OS, versions)
2. Steps to reproduce
3. Expected vs actual behavior
4. Relevant logs/errors
5. Configuration used

Example:
```
Environment: Docker on macOS 13.5, Docker Desktop 4.24
Steps:
1. Built image: docker build -t mcp-ssh-server:latest .
2. Configured Claude Desktop with docker run command
3. Attempted connection to test.example.com

Expected: Successful connection
Actual: Timeout after 30 seconds

Error: Connection timeout
```

## Next Steps

Consider implementing:
- Automated integration tests with test SSH server
- Unit tests for individual functions
- Load testing for performance benchmarks
- Fuzzing for security testing
- Mock MCP client for testing
