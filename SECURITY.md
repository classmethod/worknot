# Security Policy

## Supported Versions

Worknot follows a rolling release model on the `master` branch. Only the latest version is supported with security updates.

| Version | Supported |
| ------- | --------- |
| Latest `master` | Yes |
| Older commits | No |

## Scope

Worknot is a web-based tool that generates Cloudflare Worker scripts to proxy Notion pages on custom domains. Security concerns include:

- **Generated Worker code**: XSS, injection, or SSRF vulnerabilities in the output
- **Frontend application**: Vulnerabilities in the React UI that could affect users
- **Dependencies**: Known vulnerabilities in third-party packages

### Out of Scope

- Notion's own security (report to [Notion](https://www.notion.so/Security))
- Cloudflare Workers platform (report to [Cloudflare](https://www.cloudflare.com/disclosure/))
- User-provided custom scripts/CSS (injected intentionally by the site owner)

## Reporting a Vulnerability

If you discover a security vulnerability in Worknot, please report it responsibly:

1. **Open a GitHub Security Advisory** at [https://github.com/classmethod/worknot/security/advisories/new](https://github.com/classmethod/worknot/security/advisories/new)
2. Include a clear description of the vulnerability and steps to reproduce
3. Allow reasonable time for a fix before public disclosure

### What to Expect

- **Acknowledgment**: Within 5 business days
- **Status update**: Within 10 business days
- **Fix timeline**: Depends on severity; critical issues are prioritized

We appreciate responsible disclosure and will credit reporters (unless anonymity is preferred).
