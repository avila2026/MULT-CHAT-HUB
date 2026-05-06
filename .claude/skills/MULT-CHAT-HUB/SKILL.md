```markdown
# MULT-CHAT-HUB Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the MULT-CHAT-HUB TypeScript codebase. It covers file organization, code style, commit practices, and testing approaches to ensure consistency and maintainability. While the repository does not use a specific framework, it follows clear coding standards and conventional commit messages.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `chatManager.ts`, `userProfile.ts`

### Import Style
- Use **relative imports** for modules within the project.
  - Example:
    ```typescript
    import chatService from './chatService';
    ```

### Export Style
- Use **default exports** for modules.
  - Example:
    ```typescript
    const chatManager = { /* ... */ };
    export default chatManager;
    ```

### Commit Messages
- Follow the **Conventional Commits** format.
- Use the `feat` prefix for new features.
  - Example:
    ```
    feat: add support for multi-user chat rooms
    ```

## Workflows

### Creating a New Feature
**Trigger:** When adding a new capability or module  
**Command:** `/new-feature`

1. Create a new TypeScript file using camelCase naming.
2. Implement the feature, using relative imports for dependencies.
3. Export the main object or function as default.
4. Write corresponding test files named as `featureName.test.ts`.
5. Commit changes with a message like:  
   `feat: brief description of the new feature`

### Running Tests
**Trigger:** When verifying code correctness  
**Command:** `/run-tests`

1. Identify test files matching the pattern `*.test.*`.
2. Use the project's testing tool (framework unknown; check project docs or package.json).
3. Run the test command (e.g., `npm test` or equivalent).

### Refactoring Code
**Trigger:** When improving or restructuring existing code  
**Command:** `/refactor`

1. Update code following camelCase file naming and relative import conventions.
2. Ensure all exports remain default.
3. Update or add tests as necessary.
4. Commit with a message like:  
   `feat: refactor [module] for improved readability`

## Testing Patterns

- Test files are named using the pattern `*.test.*` (e.g., `chatManager.test.ts`).
- The specific testing framework is not detected; refer to project documentation for details.
- Place tests alongside or near the module they cover.
- Example test file:
  ```typescript
  import chatManager from './chatManager';

  test('should create a new chat room', () => {
    // test implementation
  });
  ```

## Commands
| Command        | Purpose                                  |
|----------------|------------------------------------------|
| /new-feature   | Scaffold and commit a new feature module |
| /run-tests     | Run all test files in the project        |
| /refactor      | Refactor code following conventions      |
```
