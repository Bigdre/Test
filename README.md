# MCP SSH Server

An MCP (Model Context Protocol) server that provides SSH capabilities, allowing Claude to connect to remote systems and execute commands, transfer files, and manage remote operations.

## ⚠️ SECURITY WARNING

**This tool provides full SSH access to remote systems. Use with extreme caution!**

- Only use in authorized environments
- Never expose credentials in prompts or logs
- Use SSH keys instead of passwords when possible
- Restrict to trusted networks and systems
- Monitor all operations and audit logs
- Follow the principle of least privilege
- Do not use in production without proper security review

## Features

- **SSH Connection Management**: Connect to remote hosts with password or key-based authentication
- **Command Execution**: Execute any command on remote systems with full output capture
- **File Operations**: Read and write files using SFTP
- **Directory Listing**: Browse remote file systems
- **Multiple Connections**: Manage multiple simultaneous SSH connections
- **Error Handling**: Comprehensive error reporting and timeout controls

## Installation

```bash
npm install
npm run build
```

## Configuration

### Claude Desktop Configuration

Add the following to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ssh": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-ssh-server/dist/index.js"]
    }
  }
}
```

### Environment Setup

For key-based authentication, ensure your SSH keys are properly configured:

```bash
# Generate SSH key if needed
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy public key to remote server
ssh-copy-id user@hostname
```

## Usage

Once configured, Claude can use the following tools:

### 1. Connect to a Remote Host

```
Use ssh_connect to connect to a server:
- host: example.com
- username: myuser
- password: mypassword (or use privateKeyPath)
```

### 2. Execute Commands

```
Use ssh_execute to run commands:
- command: ls -la /home/user
```

### 3. Read Files

```
Use ssh_read_file to read remote files:
- remotePath: /etc/hostname
```

### 4. Write Files

```
Use ssh_write_file to create or update files:
- remotePath: /tmp/test.txt
- content: Hello World
```

### 5. List Directories

```
Use ssh_list_directory to browse directories:
- remotePath: /var/log
```

### 6. Check Status

```
Use ssh_status to see active connections
```

### 7. Disconnect

```
Use ssh_disconnect to close a connection
```

## Available Tools

| Tool | Description |
|------|-------------|
| `ssh_connect` | Establish SSH connection with password or key authentication |
| `ssh_execute` | Execute commands and capture output (stdout, stderr, exit code) |
| `ssh_read_file` | Read file contents via SFTP |
| `ssh_write_file` | Write or create files via SFTP |
| `ssh_list_directory` | List directory contents with file details |
| `ssh_disconnect` | Close SSH connection |
| `ssh_status` | View active connection status |

## Authentication Methods

### Password Authentication

```typescript
{
  host: "example.com",
  username: "user",
  password: "password"
}
```

### Key-based Authentication

```typescript
{
  host: "example.com",
  username: "user",
  privateKeyPath: "/home/user/.ssh/id_ed25519"
}
```

### Key with Passphrase

```typescript
{
  host: "example.com",
  username: "user",
  privateKeyPath: "/home/user/.ssh/id_rsa",
  passphrase: "key_passphrase"
}
```

## Multiple Connections

You can maintain multiple SSH connections simultaneously using connection IDs:

```typescript
// Connect to server 1
ssh_connect({ connectionId: "server1", host: "host1.com", username: "user1" })

// Connect to server 2
ssh_connect({ connectionId: "server2", host: "host2.com", username: "user2" })

// Execute on server 1
ssh_execute({ connectionId: "server1", command: "hostname" })

// Execute on server 2
ssh_execute({ connectionId: "server2", command: "uptime" })
```

## Security Best Practices

1. **Use SSH Keys**: Prefer key-based authentication over passwords
2. **Restrict Access**: Only connect to authorized systems
3. **Audit Regularly**: Monitor and log all SSH operations
4. **Network Security**: Use VPN or restrict to trusted networks
5. **Least Privilege**: Use accounts with minimal necessary permissions
6. **Keep Updated**: Regularly update dependencies for security patches
7. **Secure Storage**: Never commit credentials to version control
8. **Session Management**: Always disconnect when finished

## Error Handling

The server provides detailed error messages for:
- Connection failures
- Authentication errors
- Command execution timeouts
- File operation failures
- Invalid parameters

All errors are returned in a structured format with clear descriptions.

## Timeouts

Commands have a default timeout of 30 seconds. You can customize this:

```typescript
ssh_execute({
  command: "long-running-script.sh",
  timeout: 300000  // 5 minutes
})
```

## Limitations

- Binary file transfers are supported but may have encoding limitations for very large files
- Interactive commands (requiring user input) are not supported
- X11 forwarding is not available
- Port forwarding is not implemented

## Troubleshooting

### Connection Refused
- Verify the host is reachable
- Check firewall settings
- Ensure SSH service is running on remote host

### Authentication Failed
- Verify username and password/key
- Check SSH key permissions (should be 600)
- Ensure public key is in authorized_keys on remote host

### Command Timeout
- Increase timeout parameter
- Check if command is hanging or waiting for input
- Verify system resources on remote host

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode for development
npm run watch
```

## License

MIT

## Contributing

This is a powerful tool that requires careful security consideration. Please review all changes thoroughly and follow security best practices.

## Disclaimer

This tool provides system-level access to remote machines. Users are responsible for:
- Ensuring they have authorization to access remote systems
- Complying with all applicable security policies
- Protecting credentials and sensitive data
- Monitoring and auditing all operations
- Any actions performed using this tool

The authors assume no liability for misuse or unauthorized access.
