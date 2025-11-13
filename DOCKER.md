# Docker Guide for MCP SSH Server

This guide covers running the MCP SSH Server in Docker Desktop.

## Prerequisites

- Docker Desktop installed and running
- SSH keys configured (if using key-based authentication)
- Claude Desktop installed

## Quick Start

### 1. Build the Docker Image

```bash
# Using the helper script (recommended)
./docker-run.sh

# Or manually
docker build -t mcp-ssh-server:latest .
```

### 2. Configure Claude Desktop

Update your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ssh": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "--network=host",
        "-v", "/Users/yourname/.ssh:/root/.ssh:ro",
        "mcp-ssh-server:latest"
      ]
    }
  }
}
```

**Important**:
- Replace `/Users/yourname/.ssh` with your actual SSH directory path
- On Windows, use: `C:\\Users\\YourName\\.ssh:/root/.ssh:ro`
- On Linux, use: `/home/yourname/.ssh:/root/.ssh:ro`

### 3. Restart Claude Desktop

Restart Claude Desktop to load the new configuration.

## Configuration Options

### Mounting SSH Keys

Mount your entire SSH directory (recommended):
```bash
-v ~/.ssh:/root/.ssh:ro
```

Or mount specific keys:
```bash
-v ~/.ssh/id_ed25519:/root/.ssh/id_ed25519:ro \
-v ~/.ssh/id_rsa:/root/.ssh/id_rsa:ro \
-v ~/.ssh/known_hosts:/root/.ssh/known_hosts:rw
```

### Network Configuration

Use host networking to access remote SSH servers:
```bash
--network=host
```

Or use bridge networking with specific DNS:
```bash
--network=bridge --dns=8.8.8.8
```

### Resource Limits

Limit CPU and memory usage:
```bash
--cpus=1.0 --memory=512m
```

## Using Docker Compose

### Start the Service

```bash
docker-compose up -d
```

### View Logs

```bash
docker-compose logs -f
```

### Stop the Service

```bash
docker-compose down
```

### Rebuild After Changes

```bash
docker-compose up -d --build
```

## Claude Desktop Configuration with Docker Compose

If using docker-compose, you need to execute commands in the running container:

```json
{
  "mcpServers": {
    "ssh": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "mcp-ssh-server",
        "node",
        "/app/dist/index.js"
      ]
    }
  }
}
```

**Note**: The container must be running first via `docker-compose up -d`

## Platform-Specific Instructions

### macOS

```json
{
  "mcpServers": {
    "ssh": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "--network=host",
        "-v", "/Users/yourname/.ssh:/root/.ssh:ro",
        "mcp-ssh-server:latest"
      ]
    }
  }
}
```

### Windows (PowerShell format)

```json
{
  "mcpServers": {
    "ssh": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "--network=host",
        "-v", "C:\\Users\\YourName\\.ssh:/root/.ssh:ro",
        "mcp-ssh-server:latest"
      ]
    }
  }
}
```

### Linux

```json
{
  "mcpServers": {
    "ssh": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "--network=host",
        "-v", "/home/yourname/.ssh:/root/.ssh:ro",
        "mcp-ssh-server:latest"
      ]
    }
  }
}
```

## Testing the Container

### Test 1: Verify Image Build

```bash
docker images | grep mcp-ssh-server
```

Expected output:
```
mcp-ssh-server   latest   <image-id>   <time>   <size>
```

### Test 2: Run Container Manually

```bash
docker run --rm -i --network=host -v ~/.ssh:/root/.ssh:ro mcp-ssh-server:latest
```

The container should start and wait for stdio input (MCP protocol).

### Test 3: Inspect Container

```bash
docker run --rm -it --entrypoint /bin/sh mcp-ssh-server:latest
```

Then inside the container:
```sh
ls -la /app
node --version
ssh -V
```

## Troubleshooting

### Container Won't Start

**Check Docker Desktop is running:**
```bash
docker info
```

**Check for image:**
```bash
docker images mcp-ssh-server
```

**Rebuild the image:**
```bash
docker build --no-cache -t mcp-ssh-server:latest .
```

### SSH Keys Not Working

**Verify key permissions on host:**
```bash
ls -la ~/.ssh/
# Private keys should be 600
chmod 600 ~/.ssh/id_ed25519
```

**Verify keys are mounted:**
```bash
docker run --rm -it \
  -v ~/.ssh:/root/.ssh:ro \
  --entrypoint /bin/sh \
  mcp-ssh-server:latest \
  -c "ls -la /root/.ssh"
```

### Network Connection Issues

**Test network connectivity:**
```bash
docker run --rm -i --network=host mcp-ssh-server:latest
# Try to connect to a server from Claude
```

**Check firewall settings:**
- Ensure Docker Desktop has network access
- Check if outbound SSH (port 22) is allowed

### Claude Desktop Can't Connect

**Verify configuration path:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Check JSON syntax:**
```bash
# macOS/Linux
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python -m json.tool

# Windows (PowerShell)
Get-Content "$env:APPDATA\Claude\claude_desktop_config.json" | ConvertFrom-Json
```

**Verify Docker command:**
```bash
# Copy the command from config and test it manually
docker run --rm -i --network=host -v ~/.ssh:/root/.ssh:ro mcp-ssh-server:latest
```

### Permission Denied Errors

**On Linux, Docker might need sudo:**
```bash
sudo usermod -aG docker $USER
newgrp docker
```

**Or use docker without sudo by adding to docker group**

### Container Performance Issues

**Check resource usage:**
```bash
docker stats mcp-ssh-server
```

**Increase limits in docker-compose.yml:**
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 1G
```

## Security Considerations

### Best Practices

1. **Read-only SSH keys**: Always mount with `:ro` flag
   ```bash
   -v ~/.ssh:/root/.ssh:ro
   ```

2. **Use specific keys**: Mount only required keys
   ```bash
   -v ~/.ssh/id_ed25519:/root/.ssh/id_ed25519:ro
   ```

3. **Network isolation**: Use `--network=bridge` if possible

4. **Resource limits**: Always set CPU/memory limits

5. **No root**: Consider running as non-root user
   ```dockerfile
   USER node
   ```

6. **Minimal base image**: Alpine Linux reduces attack surface

7. **Regular updates**: Rebuild images regularly
   ```bash
   docker build --pull --no-cache -t mcp-ssh-server:latest .
   ```

### Security Scanning

Scan the image for vulnerabilities:

```bash
# Using Docker Scout (built into Docker Desktop)
docker scout cves mcp-ssh-server:latest

# Using Trivy
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image mcp-ssh-server:latest
```

## Advanced Configuration

### Custom Entrypoint

Run with custom script:
```bash
docker run --rm -i \
  -v ~/.ssh:/root/.ssh:ro \
  -v $(pwd)/custom-script.sh:/custom-script.sh \
  --entrypoint /custom-script.sh \
  mcp-ssh-server:latest
```

### Environment Variables

Pass environment variables:
```json
{
  "mcpServers": {
    "ssh": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "--network=host",
        "-e", "DEBUG=true",
        "-v", "~/.ssh:/root/.ssh:ro",
        "mcp-ssh-server:latest"
      ]
    }
  }
}
```

### Multi-platform Build

Build for multiple architectures:
```bash
docker buildx build --platform linux/amd64,linux/arm64 -t mcp-ssh-server:latest .
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build Docker Image

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t mcp-ssh-server:latest .

      - name: Test Docker image
        run: docker run --rm mcp-ssh-server:latest node --version
```

## Maintenance

### Cleanup

Remove old images:
```bash
docker image prune -a
```

Remove stopped containers:
```bash
docker container prune
```

Full cleanup:
```bash
docker system prune -a --volumes
```

### Updates

Update dependencies:
```bash
docker build --pull --no-cache -t mcp-ssh-server:latest .
```

## Performance Optimization

### Build Cache

Use build cache for faster builds:
```bash
docker build --build-arg BUILDKIT_INLINE_CACHE=1 -t mcp-ssh-server:latest .
```

### Layer Optimization

The Dockerfile uses multi-stage builds to minimize final image size.

Current image size:
```bash
docker images mcp-ssh-server:latest --format "{{.Size}}"
```

## Support

For Docker-specific issues:
1. Check Docker Desktop logs
2. Verify Docker version: `docker --version`
3. Check Docker Desktop resources (CPU, Memory)
4. Review container logs: `docker logs <container-id>`

For MCP SSH Server issues, see the main [README.md](README.md)
