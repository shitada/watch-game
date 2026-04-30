---
name: create-specification
description: "Create a new specification file for the solution, optimized for Generative AI consumption. Use when asked to write specs, define requirements, or document system design."
---

# Create Specification

Your goal is to create a new specification file in the `spec/` directory.

The specification file must define the requirements, constraints, and interfaces for the solution components in a manner that is clear, unambiguous, and structured for effective use by Generative AIs.

## Best Practices for AI-Ready Specifications

- Use precise, explicit, and unambiguous language
- Clearly distinguish between requirements, constraints, and recommendations
- Use structured formatting (headings, lists, tables) for easy parsing
- Avoid idioms, metaphors, or context-dependent references
- Define all acronyms and domain-specific terms
- Include examples and edge cases where applicable
- Ensure the document is self-contained

## File Naming Convention

```
spec/spec-[purpose]-[name].md
```

Where purpose is one of: `architecture`, `design`, `process`, `schema`, `tool`, `data`, `infrastructure`

## Template

Use the template structure from the existing spec files in `spec/`:

1. Purpose & Scope
2. Definitions
3. Requirements, Constraints & Guidelines (REQ-xxx, CON-xxx, GUD-xxx, SEC-xxx)
4. Interfaces & Data Contracts
5. Acceptance Criteria (AC-xxx, Given-When-Then)
6. Test Automation Strategy
7. Rationale & Context
8. Dependencies & External Integrations
9. Examples & Edge Cases
10. Validation Criteria
11. Related Specifications
