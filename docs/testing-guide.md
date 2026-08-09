# Testing Guide

## Overview

This project uses multiple testing strategies:

- **Unit Tests**: Jest (backend), Vitest (frontend)
- **E2E Tests**: Jest (backend API)
- **Integration Tests**: Supertest (backend)
- **Lighthouse CI**: Performance audits (frontend)

---

## Test Commands

```bash
# Run all tests
npm test

# Backend unit tests
npm run test -w backend

# Frontend unit tests
npm run test -w frontend

# Backend E2E tests
npm run test:e2e

# Tests with coverage
npm run test:cov

# Frontend tests with UI
npm run test:ui -w frontend

# Frontend tests in watch mode
npm run test:watch -w frontend
```

---

## Backend Testing

### Unit Tests

Backend unit tests use **Jest** with **ts-jest**.

**Configuration**: `backend/package.json` (jest section)

**Coverage thresholds**:

- Lines: 70%
- Functions: 70%
- Branches: 60%
- Statements: 70%

**Running**:

```bash
# All unit tests
npm run test -w backend

# With coverage
npm run test:cov -w backend

# Specific file
npm run test -w backend -- --testPathPattern=auth.service

# Watch mode
npm run test:watch -w backend
```

### E2E Tests

Backend E2E tests use Jest with a real PostgreSQL and Redis instance.

**Configuration**: `backend/test/jest-e2e.json`

**Services required**:

- PostgreSQL (test database)
- Redis

**Running**:

```bash
# Start test databases
docker compose -f docker-compose.dev.yml up postgres redis -d

# Run E2E tests
npm run test:e2e

# Run with force exit
npm run test:e2e -- --forceExit
```

### Test Structure

```
backend/
├── src/
│   └── *.spec.ts          # Unit tests (co-located with source)
└── test/
    ├── app.e2e-spec.ts    # Main E2E test
    └── jest-e2e.json      # E2E configuration
```

---

## Frontend Testing

### Unit Tests

Frontend unit tests use **Vitest** with **React Testing Library**.

**Configuration**: `frontend/vitest.config.ts`

**Coverage**:

- Provider: V8
- Reporters: text, lcov, html, json-summary
- Thresholds: 70% lines, 70% functions, 65% branches, 70% statements

**Running**:

```bash
# All tests
npm run test -w frontend

# With coverage
npm run test:cov -w frontend

# UI mode
npm run test:ui -w frontend

# Watch mode
npm run test:watch -w frontend
```

### Test Setup

Test setup is configured in `frontend/src/test/setup.ts`:

```typescript
// Sets up testing environment
// Configures mocks for browser APIs
```

### Test Structure

```
frontend/
└── src/
    ├── test/
    │   └── setup.ts       # Global test setup
    └── **/*.test.tsx       # Tests (co-located with components)
```

---

## Lighthouse CI

### Configuration

Lighthouse CI is configured in `.lighthouserc.json`:

- **Runs**: 3 (median score)
- **Preset**: `lighthouse:no-pwa`
- **Assertions**: See CI documentation

### Running Locally

```bash
# Build frontend first
npm run build -w frontend

# Run Lighthouse CI
npm run lhci
```

### Performance Budgets

| Metric                   | Threshold |
| ------------------------ | --------- |
| Performance score        | ≥0.85     |
| Accessibility score      | ≥0.95     |
| Best Practices score     | ≥0.90     |
| SEO score                | ≥0.85     |
| First Contentful Paint   | ≤1800ms   |
| Largest Contentful Paint | ≤2500ms   |
| Total Blocking Time      | ≤200ms    |
| Cumulative Layout Shift  | ≤0.1      |
| Speed Index              | ≤2000ms   |

---

## CI Integration

### GitHub Actions

Tests run automatically on every push and pull request:

```yaml
# ci.yml workflow
backend-test:
  - 3-way Jest shard matrix
  - Coverage upload

backend-e2e:
  - Requires PostgreSQL + Redis services
  - Runs after backend-lint and backend-test

frontend-test:
  - Vitest with coverage
  - Thresholds set to 0 in CI (full thresholds in config)

frontend-prod-assessment:
  - Lighthouse CI
  - Bundle size check
```

---

## Writing Tests

### Backend Unit Test Example

```typescript
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();

    service = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### Frontend Unit Test Example

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDefined();
  });
});
```

---

## Best Practices

1. **Test behavior, not implementation**: Focus on what the code does, not how it does it
2. **Use descriptive test names**: Test names should explain the expected behavior
3. **Keep tests isolated**: Each test should set up its own state
4. **Mock external dependencies**: Database, Redis, external APIs
5. **Test edge cases**: Empty inputs, boundary values, error conditions
6. **Maintain coverage**: Don't lower thresholds without reason

---

## Troubleshooting

### Common Issues

**Tests fail due to missing environment variables**:

```bash
# Ensure .env is configured
cp backend/.env.example backend/.env
```

**E2E tests fail due to database connection**:

```bash
# Start test databases
docker compose -f docker-compose.dev.yml up -d
```

**Lighthouse CI fails due to missing build**:

```bash
# Build frontend first
npm run build -w frontend
```

**Coverage not collected**:

```bash
# Ensure coverage reporters are configured
npm run test:cov
```
