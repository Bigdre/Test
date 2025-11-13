#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { Client, ClientChannel, ConnectConfig } from "ssh2";
import { promisify } from "util";
import { readFile } from "fs/promises";

// SSH connection manager
class SSHConnectionManager {
  private connections: Map<string, Client> = new Map();
  private execChannels: Map<string, ClientChannel> = new Map();

  async connect(
    connectionId: string,
    config: ConnectConfig
  ): Promise<string> {
    // Disconnect existing connection if any
    if (this.connections.has(connectionId)) {
      await this.disconnect(connectionId);
    }

    return new Promise((resolve, reject) => {
      const client = new Client();

      client.on("ready", () => {
        this.connections.set(connectionId, client);
        resolve(`Successfully connected to ${config.host}`);
      });

      client.on("error", (err) => {
        reject(new Error(`SSH connection failed: ${err.message}`));
      });

      client.connect(config);
    });
  }

  async disconnect(connectionId: string): Promise<string> {
    const client = this.connections.get(connectionId);
    if (!client) {
      return "No active connection found";
    }

    client.end();
    this.connections.delete(connectionId);
    this.execChannels.delete(connectionId);
    return "Connection closed successfully";
  }

  async executeCommand(
    connectionId: string,
    command: string,
    timeout: number = 30000
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const client = this.connections.get(connectionId);
    if (!client) {
      throw new Error("Not connected. Please connect first using ssh_connect.");
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Command execution timed out after ${timeout}ms`));
      }, timeout);

      client.exec(command, (err, channel) => {
        if (err) {
          clearTimeout(timeoutId);
          reject(new Error(`Failed to execute command: ${err.message}`));
          return;
        }

        let stdout = "";
        let stderr = "";
        let exitCode = 0;

        channel.on("data", (data: Buffer) => {
          stdout += data.toString();
        });

        channel.stderr.on("data", (data: Buffer) => {
          stderr += data.toString();
        });

        channel.on("close", (code: number) => {
          clearTimeout(timeoutId);
          exitCode = code;
          resolve({ stdout, stderr, exitCode });
        });

        channel.on("error", (err: Error) => {
          clearTimeout(timeoutId);
          reject(new Error(`Channel error: ${err.message}`));
        });
      });
    });
  }

  async readFile(connectionId: string, remotePath: string): Promise<string> {
    const client = this.connections.get(connectionId);
    if (!client) {
      throw new Error("Not connected. Please connect first using ssh_connect.");
    }

    return new Promise((resolve, reject) => {
      client.sftp((err: Error | undefined, sftp: any) => {
        if (err) {
          reject(new Error(`SFTP initialization failed: ${err.message}`));
          return;
        }

        const readStream = sftp.createReadStream(remotePath);
        let content = "";

        readStream.on("data", (chunk: Buffer) => {
          content += chunk.toString();
        });

        readStream.on("end", () => {
          sftp.end();
          resolve(content);
        });

        readStream.on("error", (err: Error) => {
          sftp.end();
          reject(new Error(`Failed to read file: ${err.message}`));
        });
      });
    });
  }

  async writeFile(
    connectionId: string,
    remotePath: string,
    content: string
  ): Promise<string> {
    const client = this.connections.get(connectionId);
    if (!client) {
      throw new Error("Not connected. Please connect first using ssh_connect.");
    }

    return new Promise((resolve, reject) => {
      client.sftp((err: Error | undefined, sftp: any) => {
        if (err) {
          reject(new Error(`SFTP initialization failed: ${err.message}`));
          return;
        }

        const writeStream = sftp.createWriteStream(remotePath);

        writeStream.on("close", () => {
          sftp.end();
          resolve(`Successfully wrote ${content.length} bytes to ${remotePath}`);
        });

        writeStream.on("error", (err: Error) => {
          sftp.end();
          reject(new Error(`Failed to write file: ${err.message}`));
        });

        writeStream.write(content);
        writeStream.end();
      });
    });
  }

  async listDirectory(connectionId: string, remotePath: string): Promise<any[]> {
    const client = this.connections.get(connectionId);
    if (!client) {
      throw new Error("Not connected. Please connect first using ssh_connect.");
    }

    return new Promise((resolve, reject) => {
      client.sftp((err: Error | undefined, sftp: any) => {
        if (err) {
          reject(new Error(`SFTP initialization failed: ${err.message}`));
          return;
        }

        sftp.readdir(remotePath, (err: Error | undefined, list: any) => {
          sftp.end();
          if (err) {
            reject(new Error(`Failed to list directory: ${err.message}`));
            return;
          }
          resolve(list);
        });
      });
    });
  }

  getConnectionStatus(connectionId: string): string {
    return this.connections.has(connectionId) ? "connected" : "disconnected";
  }

  listConnections(): string[] {
    return Array.from(this.connections.keys());
  }
}

// Initialize connection manager
const sshManager = new SSHConnectionManager();

// Define available tools
const tools: Tool[] = [
  {
    name: "ssh_connect",
    description:
      "Establish an SSH connection to a remote host. Supports password and key-based authentication. Connection is maintained for subsequent operations.",
    inputSchema: {
      type: "object",
      properties: {
        connectionId: {
          type: "string",
          description: "Unique identifier for this connection (default: 'default')",
        },
        host: {
          type: "string",
          description: "Hostname or IP address of the remote server",
        },
        port: {
          type: "number",
          description: "SSH port (default: 22)",
        },
        username: {
          type: "string",
          description: "Username for authentication",
        },
        password: {
          type: "string",
          description: "Password for authentication (optional if using key)",
        },
        privateKeyPath: {
          type: "string",
          description: "Path to private key file for key-based authentication",
        },
        passphrase: {
          type: "string",
          description: "Passphrase for encrypted private key",
        },
      },
      required: ["host", "username"],
    },
  },
  {
    name: "ssh_execute",
    description:
      "Execute a command on the remote system via SSH. Returns stdout, stderr, and exit code. Supports any shell command.",
    inputSchema: {
      type: "object",
      properties: {
        connectionId: {
          type: "string",
          description: "Connection identifier (default: 'default')",
        },
        command: {
          type: "string",
          description: "Command to execute on the remote system",
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds (default: 30000)",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "ssh_read_file",
    description:
      "Read the contents of a file from the remote system using SFTP.",
    inputSchema: {
      type: "object",
      properties: {
        connectionId: {
          type: "string",
          description: "Connection identifier (default: 'default')",
        },
        remotePath: {
          type: "string",
          description: "Absolute path to the file on the remote system",
        },
      },
      required: ["remotePath"],
    },
  },
  {
    name: "ssh_write_file",
    description:
      "Write content to a file on the remote system using SFTP. Creates or overwrites the file.",
    inputSchema: {
      type: "object",
      properties: {
        connectionId: {
          type: "string",
          description: "Connection identifier (default: 'default')",
        },
        remotePath: {
          type: "string",
          description: "Absolute path where the file should be written",
        },
        content: {
          type: "string",
          description: "Content to write to the file",
        },
      },
      required: ["remotePath", "content"],
    },
  },
  {
    name: "ssh_list_directory",
    description:
      "List contents of a directory on the remote system using SFTP.",
    inputSchema: {
      type: "object",
      properties: {
        connectionId: {
          type: "string",
          description: "Connection identifier (default: 'default')",
        },
        remotePath: {
          type: "string",
          description: "Absolute path to the directory to list",
        },
      },
      required: ["remotePath"],
    },
  },
  {
    name: "ssh_disconnect",
    description: "Close an SSH connection.",
    inputSchema: {
      type: "object",
      properties: {
        connectionId: {
          type: "string",
          description: "Connection identifier (default: 'default')",
        },
      },
    },
  },
  {
    name: "ssh_status",
    description:
      "Check the status of SSH connections. Returns list of active connections.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// Create MCP server
const server = new Server(
  {
    name: "mcp-ssh-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool list requests
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    return {
      content: [{ type: "text", text: "Error: Missing arguments" }],
      isError: true,
    };
  }

  try {
    switch (name) {
      case "ssh_connect": {
        const connectionId = (args.connectionId as string) || "default";
        const config: ConnectConfig = {
          host: args.host as string,
          port: (args.port as number) || 22,
          username: args.username as string,
        };

        // Add authentication
        if (args.password) {
          config.password = args.password as string;
        }

        if (args.privateKeyPath) {
          try {
            const privateKey = await readFile(args.privateKeyPath as string, "utf8");
            config.privateKey = privateKey;
            if (args.passphrase) {
              config.passphrase = args.passphrase as string;
            }
          } catch (err) {
            throw new Error(
              `Failed to read private key: ${(err as Error).message}`
            );
          }
        }

        const result = await sshManager.connect(connectionId, config);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "ssh_execute": {
        const connectionId = (args.connectionId as string) || "default";
        const command = args.command as string;
        const timeout = (args.timeout as number) || 30000;

        const result = await sshManager.executeCommand(
          connectionId,
          command,
          timeout
        );

        const output = [
          `Command: ${command}`,
          `Exit Code: ${result.exitCode}`,
          "",
          "STDOUT:",
          result.stdout || "(empty)",
          "",
          "STDERR:",
          result.stderr || "(empty)",
        ].join("\n");

        return {
          content: [{ type: "text", text: output }],
        };
      }

      case "ssh_read_file": {
        const connectionId = (args.connectionId as string) || "default";
        const remotePath = args.remotePath as string;

        const content = await sshManager.readFile(connectionId, remotePath);
        return {
          content: [
            {
              type: "text",
              text: `Contents of ${remotePath}:\n\n${content}`,
            },
          ],
        };
      }

      case "ssh_write_file": {
        const connectionId = (args.connectionId as string) || "default";
        const remotePath = args.remotePath as string;
        const content = args.content as string;

        const result = await sshManager.writeFile(
          connectionId,
          remotePath,
          content
        );
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "ssh_list_directory": {
        const connectionId = (args.connectionId as string) || "default";
        const remotePath = args.remotePath as string;

        const list = await sshManager.listDirectory(connectionId, remotePath);
        const formatted = list
          .map((item: any) => {
            const type = item.attrs.isDirectory() ? "DIR " : "FILE";
            const size = item.attrs.size.toString().padStart(10);
            return `${type} ${size} ${item.filename}`;
          })
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: `Contents of ${remotePath}:\n\n${formatted}`,
            },
          ],
        };
      }

      case "ssh_disconnect": {
        const connectionId = (args.connectionId as string) || "default";
        const result = await sshManager.disconnect(connectionId);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "ssh_status": {
        const connections = sshManager.listConnections();
        const status =
          connections.length > 0
            ? `Active connections: ${connections.join(", ")}`
            : "No active connections";
        return {
          content: [{ type: "text", text: status }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP SSH Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
