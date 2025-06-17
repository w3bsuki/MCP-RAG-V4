# Pattern Library

## Categories

### Architecture Patterns
- System design templates
- Component organization
- Service boundaries
- API design patterns

### Implementation Patterns
- Code structure templates
- Error handling patterns
- State management patterns
- Testing patterns

### Testing Patterns
- Unit test templates
- Integration test patterns
- E2E test strategies
- Performance test approaches

### Deployment Patterns
- CI/CD configurations
- Environment setup
- Container patterns
- Monitoring setup

## Usage

Agents should query these patterns via RAG before implementing new solutions:

```typescript
// Example: Architect querying for patterns
rag_query({
  query: "React component testing patterns",
  tags: ["testing", "react", "frontend"]
});

// Example: Builder storing a successful pattern
rag_store({
  pattern: "React Hook Form with Zod validation",
  description: "Type-safe form handling with validation",
  tags: ["forms", "validation", "react", "typescript"],
  code: "See implementation in project3/src/components/forms/"
});
```

## Pattern Metadata

Each pattern includes:
- **id**: Unique identifier
- **agent**: Which agent created it
- **timestamp**: When it was created
- **tags**: Searchable categories
- **content**: The actual pattern
- **success_metrics**: How well it worked

## Contributing

After successfully implementing a solution, agents should:
1. Extract the reusable pattern
2. Document the context and constraints
3. Store it using the `rag_store` tool
4. Tag appropriately for future discovery