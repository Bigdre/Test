# Security Guidelines for MCP SSH Server

## Overview

The MCP SSH Server provides powerful remote access capabilities. This document outlines critical security considerations and best practices.

## Threat Model

### Potential Risks

1. **Unauthorized Access**: Improper authentication could allow unauthorized system access
2. **Credential Exposure**: Passwords or keys exposed in logs or prompts
3. **Privilege Escalation**: Commands executed with excessive privileges
4. **Data Exfiltration**: Sensitive data accessed or transferred
5. **System Compromise**: Malicious commands executed on remote systems
6. **Network Exposure**: Connections over insecure networks

## Security Controls

### Authentication

**DO:**
- Use SSH key-based authentication whenever possible
- Protect private keys with passphrases
- Use ed25519 or RSA keys (minimum 2048-bit for RSA)
- Rotate keys regularly
- Store keys with proper permissions (600 for private keys)

**DON'T:**
- Use weak passwords
- Share credentials across multiple systems
- Store passwords in plaintext
- Commit credentials to version control

### Authorization

**DO:**
- Use dedicated service accounts with minimal privileges
- Implement principle of least privilege
- Use sudo only when absolutely necessary
- Restrict SSH access to specific IP ranges
- Monitor and audit all access

**DON'T:**
- Use root accounts for routine operations
- Grant unnecessary sudo privileges
- Allow password-based root login
- Use shared accounts

### Network Security

**DO:**
- Use VPN for remote access
- Restrict SSH to trusted networks
- Use non-standard SSH ports if appropriate
- Enable SSH rate limiting
- Monitor connection attempts

**DON'T:**
- Expose SSH directly to the internet without protection
- Use unencrypted channels
- Disable firewall rules

### Operational Security

**DO:**
- Log all SSH operations
- Review logs regularly
- Monitor for suspicious activity
- Keep systems and dependencies updated
- Test in isolated environments first
- Disconnect sessions when finished
- Use connection timeouts

**DON'T:**
- Ignore security alerts
- Run untrusted commands
- Disable logging or auditing
- Use the same credentials everywhere

## Configuration Hardening

### Remote SSH Server Configuration

Edit `/etc/ssh/sshd_config` on remote hosts:

```
# Disable password authentication (use keys only)
PasswordAuthentication no
ChallengeResponseAuthentication no

# Disable root login
PermitRootLogin no

# Use strong cryptography
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org

# Limit authentication attempts
MaxAuthTries 3

# Set idle timeout
ClientAliveInterval 300
ClientAliveCountMax 2

# Allow specific users only
AllowUsers deployuser serviceaccount

# Disable unnecessary features
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no
PermitTunnel no
```

### MCP Server Security

- Run the MCP server with minimal privileges
- Use dedicated user accounts
- Implement connection limits
- Set appropriate timeouts
- Validate all inputs
- Sanitize command parameters

## Credential Management

### Storing Credentials

**Recommended Approaches:**

1. **SSH Agent**: Use ssh-agent for key management
```bash
eval $(ssh-agent)
ssh-add ~/.ssh/id_ed25519
```

2. **Environment Variables**: For automation contexts
```bash
export SSH_KEY_PATH=/secure/path/to/key
```

3. **Secrets Management**: Use dedicated secrets management tools
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault

**Avoid:**
- Hardcoding credentials
- Storing in configuration files
- Passing in command-line arguments (visible in process lists)
- Committing to version control

## Audit and Monitoring

### What to Log

- All connection attempts (successful and failed)
- Commands executed
- Files accessed or modified
- Authentication events
- Errors and exceptions
- Disconnection events

### Monitoring Strategy

1. **Real-time Monitoring**
   - Failed authentication attempts
   - Unusual command patterns
   - High-privilege operations
   - File modifications in sensitive directories

2. **Regular Review**
   - Access patterns
   - Command history
   - User activity
   - System changes

3. **Alerting**
   - Multiple failed login attempts
   - Root access usage
   - Sensitive file access
   - Unusual time-of-day access

## Incident Response

### If Credentials are Compromised

1. Immediately revoke the compromised credentials
2. Remove public keys from authorized_keys
3. Disable affected accounts
4. Review audit logs for unauthorized activity
5. Rotate all related credentials
6. Investigate the compromise source
7. Document the incident

### If Unauthorized Access Detected

1. Disconnect active sessions
2. Block the source IP address
3. Review and preserve logs
4. Assess damage and data exposure
5. Implement additional controls
6. Report per organizational policy

## Compliance Considerations

### Regulatory Requirements

Depending on your use case, consider:

- **PCI DSS**: If handling payment card data
- **HIPAA**: If accessing health information
- **SOC 2**: For service organizations
- **GDPR**: If processing EU personal data
- **ISO 27001**: Information security management

### Documentation Requirements

Maintain documentation of:
- Who has access and why
- What systems are accessed
- When access was granted/revoked
- How access is monitored
- Security controls in place

## Testing and Validation

### Security Testing

1. **Authentication Testing**
   - Verify key-based auth works
   - Test password auth is disabled (if applicable)
   - Validate passphrase protection

2. **Authorization Testing**
   - Confirm least privilege is enforced
   - Test sudo restrictions
   - Validate file permissions

3. **Network Testing**
   - Verify firewall rules
   - Test from unauthorized networks
   - Validate encryption in transit

4. **Error Handling**
   - Test with invalid credentials
   - Verify secure error messages
   - Confirm no information leakage

## Development Security

### Secure Coding Practices

- Validate and sanitize all inputs
- Use parameterized commands when possible
- Implement proper error handling
- Avoid shell injection vulnerabilities
- Use security-focused linters
- Keep dependencies updated

### Dependency Management

```bash
# Regular security audits
npm audit

# Update dependencies
npm update

# Check for vulnerable packages
npm audit fix
```

## Emergency Procedures

### Disable the MCP Server

1. Stop Claude Desktop
2. Remove MCP server from configuration
3. Kill any running server processes
4. Review access logs

### Revoke All Access

```bash
# On remote systems
# Remove public key from authorized_keys
sed -i '/comment-identifying-key/d' ~/.ssh/authorized_keys

# Disable account temporarily
sudo usermod -L username
```

## Questions and Concerns

If you have security questions or concerns:

1. Review this documentation thoroughly
2. Consult your organization's security team
3. Perform a security assessment before deployment
4. Consider hiring external security consultants
5. Report vulnerabilities responsibly

## Resources

- [OpenSSH Security Best Practices](https://www.openssh.com/security.html)
- [NIST SSH Guidelines](https://nvlpubs.nist.gov/nistpubs/ir/2015/NIST.IR.7966.pdf)
- [CIS SSH Benchmark](https://www.cisecurity.org/benchmark/distribution_independent_linux)

## Disclaimer

This security guide provides general recommendations. Your specific security requirements may vary based on:
- Regulatory environment
- Organizational policies
- Risk tolerance
- Use case specifics

Always consult with qualified security professionals for your specific situation.
