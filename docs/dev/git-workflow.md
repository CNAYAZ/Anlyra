---
title: Anlyra · Git Workflow
audience: developer
status: operativo
last_updated: 2026-05-27
---

# Git Workflow

> Convenzioni Git per il progetto Anlyra. Rispettare queste regole garantisce una cronologia
> leggibile e branch protection funzionante.

**Documenti correlati**: [`coding-standards.md`](coding-standards.md),
[`deployment-runbook.md`](deployment-runbook.md),
[`../CONTRIBUTING.md`](../../CONTRIBUTING.md).

---

## 1. Branch naming

| Tipo | Pattern | Esempio |
|---|---|---|
| Feature | `claude/feat-{descrizione-kebab}` | `claude/feat-psd2-banking` |
| Bug fix | `claude/fix-{descrizione-kebab}` | `claude/fix-button-aschild-bug` |
| Documentazione | `claude/docs-{descrizione-kebab}` | `claude/docs-security-checklist` |
| Hotfix urgente | `claude/hotfix-{descrizione-kebab}` | `claude/hotfix-auth-500` |
| Sperimentale | `claude/exp-{descrizione-kebab}` | `claude/exp-forecast-model` |

**Branch principale**: `claude/merge-repos-nextjs-rOZU3` — nessun push diretto.

---

## 2. Commit message — Conventional Commits

```
<type>(<scope>): <descrizione breve in minuscolo>

[corpo opzionale: spiega il PERCHÉ, non il cosa]

[footer: link issue/PR opzionale]
```

**Tipi validi**:

| Tipo | Quando usarlo |
|---|---|
| `feat` | Nuova funzionalità |
| `fix` | Bug fix |
| `docs` | Solo documentazione |
| `refactor` | Refactoring senza feature/bug |
| `style` | Formattazione, no logic |
| `test` | Aggiunta/modifica test |
| `chore` | Manutenzione (deps, config) |
| `perf` | Miglioramento performance |

**Esempi validi**:
```
feat(auth): add TOTP 2FA setup flow
fix(button): prevent React.Children.only crash when asChild=true
docs(security): add 51-item pre-production checklist
chore(deps): upgrade stripe to v15
```

---

## 3. PR process

### Template PR minimo
```
## Cosa cambia
- [bullet con le modifiche principali]

## Come testare
- [ ] Step 1
- [ ] Step 2

## Checklist
- [ ] tsc --noEmit clean
- [ ] lint clean
- [ ] test smoke eseguito
```

### Review
- Ogni PR: review da almeno 1 persona (anche AI-assisted per repository single-dev).
- Nessun merge di PR con TypeScript errors o lint errors.
- Self-review prima di richiedere external review.

### Merge
- **Sempre `--no-ff`**: `git merge origin/claude/feat-xxx --no-ff`.
- Il merge commit documenta l'integrazione del branch.
- Delete branch post-merge.

---

## 4. Main branch protection

- **Nessun push diretto** a `claude/merge-repos-nextjs-rOZU3`.
- Ogni modifica passa per un feature branch + merge `--no-ff`.
- Verifica finale con `git ls-remote origin claude/merge-repos-nextjs-rOZU3` per confermare SHA.

---

## 5. Comandi ricorrenti

```bash
# Setup nuovo branch
git fetch origin --prune
git checkout claude/merge-repos-nextjs-rOZU3
git pull origin claude/merge-repos-nextjs-rOZU3
git checkout -b claude/feat-mia-feature

# Push e merge
git push -u origin claude/feat-mia-feature
git checkout claude/merge-repos-nextjs-rOZU3
git merge origin/claude/feat-mia-feature --no-ff -m "merge: feat mia feature"
git push origin claude/merge-repos-nextjs-rOZU3

# Verifica
git ls-remote origin claude/merge-repos-nextjs-rOZU3
```

---

**Status**: operativo.  
**Last updated**: 2026-05-27.
