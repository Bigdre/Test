# Quick Start Guide

Get started with the MCP SSH Server in 5 minutes.

## Prerequisites

- Node.js 18 or higher
- SSH access to a remote server
- Claude Desktop installed

## Installation

1. Clone or download this repository:
```bash
cd /path/to/mcp-ssh-server
npm install
npm run build
```

2. Configure Claude Desktop:

Edit your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

Add the SSH server:

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

**Important**: Replace `/absolute/path/to/mcp-ssh-server` with the actual path!

3. Restart Claude Desktop

## First Connection

In Claude, try these commands:

### Connect to a Server

```
Please connect to my server using ssh_connect with:
- host: example.com
- username: myuser
- password: mypassword
```

Or with SSH keys:

```
Please connect to my server using ssh_connect with:
- host: example.com
- username: myuser
- privateKeyPath: /home/user/.ssh/id_ed25519
```

### Run a Command

```
Execute the command "uname -a" on the server
```

### Read a File

```
Read the file /etc/hostname
```

### List a Directory

```
List the contents of /var/log
```

### Write a File

```
Create a file at /tmp/test.txt with the content "Hello from Claude!"
```

### Check Status

```
Check the status of SSH connections
```

### Disconnect

```
Disconnect from the server
```

## Example Session

Here's a complete example session:

```
You: Connect to my development server at dev.example.com using username "deploy" and my SSH key at ~/.ssh/id_rsa

Claude: [Connects using ssh_connect]

You: Check the current working directory

Claude: [Executes: pwd]

You: List the files in /var/www/html

Claude: [Uses ssh_list_directory]

You: Read the nginx configuration file

Claude: [Reads /etc/nginx/nginx.conf]

You: Create a backup of the config

Claude: [Reads the file, then writes it to /tmp/nginx.conf.backup]

You: Disconnect

Claude: [Uses ssh_disconnect]
```

## Troubleshooting

### "Connection refused"
- Verify the hostname is correct
- Check if SSH port 22 is open
- Ensure firewall allows connections

### "Authentication failed"
- Double-check username and password
- For key auth, verify the key path is correct
- Check key permissions (should be 600)
- Ensure your public key is in `~/.ssh/authorized_keys` on the server

### "Tool not found"
- Restart Claude Desktop
- Verify the MCP server is configured correctly
- Check that the path in config is absolute, not relative

### Commands timeout
- Increase the timeout parameter
- Check if the server is responding slowly
- Verify the command isn't waiting for input

## Security Reminders

- Only connect to servers you own or have permission to access
- Use SSH keys instead of passwords when possible
- Never share your private keys
- Disconnect when you're done
- Monitor access logs on your servers

## Next Steps

- Read the full [README.md](README.md) for all features
- Review [SECURITY.md](SECURITY.md) for security best practices
- Explore advanced features like multiple connections
- Set up proper SSH key authentication

## Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review the full documentation in README.md
3. Verify your server's SSH configuration
4. Check Claude Desktop logs for errors

## Common Use Cases

### Deploy Code
```
1. Connect to production server
2. Navigate to app directory
3. Pull latest code from git
4. Restart services
5. Verify deployment
```

### System Monitoring
```
1. Connect to server
2. Check disk space (df -h)
3. Check memory usage (free -h)
4. Review recent logs (tail /var/log/syslog)
5. Check running processes (ps aux)
```

### File Management
```
1. Connect to server
2. List directory contents
3. Read configuration files
4. Update settings
5. Backup important files
```

### Database Operations
```
1. Connect to database server
2. Execute database commands
3. Export data
4. Create backups
5. Verify integrity
```

Happy automating!
