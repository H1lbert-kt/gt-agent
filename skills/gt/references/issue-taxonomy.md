# Issue template and label taxonomy

Use the [stage issue template](../../../.github/ISSUE_TEMPLATE/stage.md) for one coherent unit of work. Keep the original request, problem/context, observable result, included/excluded scope, and verifiable acceptance criteria distinct. Do not put a detailed implementation plan in the initial issue body.

## Classification rules

- `stage` identifies lifecycle/workflow membership and is applied by the stage template. `planned` and `skipped` are lifecycle labels controlled by their own operations; do not use them as type, priority, or completion labels.
- Select at most one supported type, one area, and one priority when each dimension is clear from the request and repository evidence. Omit unknown dimensions; do not infer priority from issue order, labels on similar issues, or an agent's estimate.
- Reuse the existing labels below. Do not add a second label for information already represented by GitHub state (for example, open/closed state), and do not bulk-reclassify existing issues.
- Color is a visual aid only; label names and descriptions carry the meaning. Use the documented family colors consistently. A future label is proposed only for a distinct, recurring classification need not covered here.

## Type

| Label | Description | Color |
| --- | --- | --- |
| `bug` | Correção de comportamento incorreto | `D73A4A` (red) |
| `enhancement` | Nova funcionalidade ou melhoria | `A2EEEF` (teal) |
| `documentation` | Alteração ou adição de documentação | `0075CA` (blue) |

These existing GitHub labels are the supported type vocabulary for now. Do not create `type:*` duplicates.

## Area

All area labels use the same blue family color `1D76DB`; their distinct names and descriptions identify the area.

| Label | Description | Color |
| --- | --- | --- |
| `area:interaction` | Interação em linguagem natural, contexto e resolução de intenção | `1D76DB` |
| `area:planning` | Planos, critérios, revisão e publicação de planejamento | `1D76DB` |
| `area:issues` | Estrutura, classificação e organização de issues | `1D76DB` |
| `area:relationships` | Hierarquia e dependências entre issues | `1D76DB` |
| `area:workflow` | Fluxo operacional, decisões e recuperação | `1D76DB` |
| `area:quality` | Testes, avaliações e qualidade do agente | `1D76DB` |

## Priority

| Label | Description | Color |
| --- | --- | --- |
| `priority:p1` | Prioridade alta explicitamente definida pelo responsável | `B60205` (red) |
| `priority:p2` | Prioridade normal explicitamente definida pelo responsável | `FBCA04` (yellow) |

Only use a priority when the responsible request states one or supplies an unambiguous ordering/urgency. No priority label means unspecified; do not manufacture a default. Add another level only when a concrete workflow requires it.

## Examples

- A requested defect in planning behavior may use `bug`, `area:planning`, and the explicitly stated priority, plus `stage` when created as a stage.
- A requested improvement to issue templates may use `enhancement`, `area:issues`, and `stage`; omit priority unless the request specifies it.
- A documentation-only stage may use `documentation` and its clearly relevant area. Do not infer a priority from the fact that another stage is earlier or marked `priority:p1`.

Examples show the classification rule, not permission to edit labels on existing issues. Preserve existing assignments unless a separate request specifically authorizes reclassification.
