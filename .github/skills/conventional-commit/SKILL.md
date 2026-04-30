---
name: conventional-commit
description: "Prompt and workflow for generating conventional commit messages. Use when committing changes, writing commit messages, or asked to commit code."
---

# Conventional Commit

Generate standardized commit messages following the Conventional Commits specification.

## Workflow

1. Run `git status` to review changed files
2. Run `git diff --cached` to inspect staged changes
3. Stage changes with `git add <file>`
4. Construct commit message using the format below
5. Run `git commit -m "type(scope): description"`

## Commit Message Format

```
type(scope): description
```

### Types

| Type | Usage |
|------|-------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `build` | Build system or dependencies |
| `ci` | CI configuration |
| `chore` | Other changes that don't modify src or test |

### Scopes (for this project)

| Scope | Area |
|-------|------|
| `clock` | Clock3D entity, ClockController |
| `scene` | Scene files (TitleScene, QuizPlayScene, etc.) |
| `audio` | AudioManager, BGMGenerator, SFXGenerator |
| `ui` | HUD, ChoiceButtons, HomeButton, etc. |
| `quiz` | QuizGenerator, TimeValidator |
| `save` | SaveManager, localStorage |
| `effect` | CorrectEffect, IncorrectEffect, FireworkEffect |
| `config` | GameSettings, LevelConfig, DailySchedule |
| `deploy` | GitHub Actions, Vite config |

### Examples

```
feat(scene): add DailyPlayScene for daily challenge mode
fix(clock): correct minute hand angle calculation
test(quiz): add edge case tests for QuizGenerator
refactor(ui): extract shared button styles to helper
chore: update Three.js to v0.171
```

### Validation

- **type**: Required. Must be one of the allowed types
- **scope**: Optional but recommended for clarity
- **description**: Required. Use imperative mood ("add", not "added")
