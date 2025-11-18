# 🤝 Contributing to DevSecOps Security Pipeline

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors.

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community

**Unacceptable behavior includes:**
- Harassment, trolling, or discriminatory comments
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

---

## Getting Started

### Prerequisites

- Node.js 18+
- Git
- Code editor (VS Code recommended)
- Basic knowledge of TypeScript, React, and Next.js

### Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/devsecops-pipeline.git
cd devsecops-pipeline

# Add upstream remote
git remote add upstream https://github.com/original/devsecops-pipeline.git
```

### Install Dependencies

```bash
npm install
```

### Create Branch

```bash
git checkout -b feature/your-feature-name
```

---

## Development Workflow

### 1. Make Changes

- Write clean, readable code
- Follow existing code style
- Add comments for complex logic
- Update tests as needed

### 2. Test Locally

```bash
# Run development server
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Type check
npm run type-check
```

### 3. Commit Changes

```bash
git add .
git commit -m "feat: add amazing feature"
```

### 4. Push to Fork

```bash
git push origin feature/your-feature-name
```

### 5. Create Pull Request

- Go to GitHub
- Click "New Pull Request"
- Fill out the PR template
- Wait for review

---

## Coding Standards

### TypeScript

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  return fetch(`/api/users/${id}`).then(res => res.json());
}

// ❌ Bad
function getUser(id: any): any {
  return fetch(`/api/users/${id}`).then(res => res.json());
}
```

### React Components

```typescript
// ✅ Good - Functional component with TypeScript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {label}
    </button>
  );
}

// ❌ Bad - No types, unclear props
export function Button(props) {
  return <button onClick={props.onClick}>{props.label}</button>;
}
```

### File Naming

- Components: `PascalCase.tsx` (e.g., `SecurityScanner.tsx`)
- Utilities: `kebab-case.ts` (e.g., `security-scanner.ts`)
- Tests: `*.test.ts` or `*.spec.ts`
- Types: `types.ts` or `*.types.ts`

### Code Organization

```
src/
├── app/              # Next.js app router
├── components/       # React components
│   ├── ui/          # Reusable UI components
│   └── dashboard/   # Feature-specific components
├── lib/             # Utilities and helpers
├── store/           # State management
└── types/           # TypeScript types
```

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes
- `perf`: Performance improvements

### Examples

```bash
# Feature
git commit -m "feat(scanner): add Trivy integration"

# Bug fix
git commit -m "fix(api): handle null response from OSV API"

# Documentation
git commit -m "docs: update installation instructions"

# Breaking change
git commit -m "feat(api)!: change scan result format

BREAKING CHANGE: Scan results now return array instead of object"
```

---

## Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Documentation updated if needed
- [ ] Commit messages follow convention

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How to test these changes

## Screenshots (if applicable)
Add screenshots here

## Checklist
- [ ] Tests pass
- [ ] Linting passes
- [ ] Documentation updated
```

### Review Process

1. Automated checks run (CI/CD)
2. Code review by maintainers
3. Address feedback
4. Approval and merge

---

## Testing

### Unit Tests

```typescript
// Example test
import { calculateSecurityScore } from './security-scanner';

describe('calculateSecurityScore', () => {
  it('should return 100 for no vulnerabilities', () => {
    const score = calculateSecurityScore([]);
    expect(score).toBe(100);
  });

  it('should deduct points for critical vulnerabilities', () => {
    const vulns = [{ severity: 'critical' }];
    const score = calculateSecurityScore(vulns);
    expect(score).toBe(90);
  });
});
```

### E2E Tests

```typescript
// Example Playwright test
import { test, expect } from '@playwright/test';

test('should start a security scan', async ({ page }) => {
  await page.goto('/scan');
  await page.fill('[name="repoUrl"]', 'https://github.com/test/repo');
  await page.click('button:has-text("Start Scan")');
  await expect(page.locator('.scan-status')).toContainText('running');
});
```

---

## Documentation

### Code Comments

```typescript
/**
 * Calculates the security score based on vulnerability severity.
 * 
 * @param vulnerabilities - Array of vulnerabilities
 * @returns Security score from 0-100
 * 
 * @example
 * const score = calculateSecurityScore([
 *   { severity: 'critical' },
 *   { severity: 'high' }
 * ]);
 * // Returns: 85
 */
export function calculateSecurityScore(vulnerabilities: Vulnerability[]): number {
  // Implementation
}
```

### README Updates

When adding features, update:
- Feature list
- Usage examples
- API documentation
- Configuration options

---

## Questions?

- Open a [GitHub Discussion](https://github.com/yourusername/devsecops-pipeline/discussions)
- Join our [Discord](https://discord.gg/devsecops)
- Email: contribute@yourdomain.com

---

Thank you for contributing! 🎉
