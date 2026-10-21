# NCGS — Joint Design and Development Instructions

To: @Claude and @Codex

This identical instruction is being supplied to both AI agents. Each agent must read the entire document, including the instructions directed at the other agent.

## 1. Authority and responsibilities

For absolute clarity, the participants have the following roles:

### Human Product Owner

* The human who owns the NCGS project and is issuing this instruction.
* Has final authority over product direction, significant design decisions, priorities and release approval.
* Is the person to consult when a decision genuinely requires owner input.

### @Codex

* AI development agent, initially proposed as implementation lead.
* Responsible for developing, implementing and testing improvements to NCGS.
* Expected to exercise independent design and engineering judgement.

### @Claude

* AI development agent, initially proposed as independent design, UX and engineering reviewer.
* Responsible for challenging, improving and validating proposals and implementations.
* Equally entitled to contribute original solutions and design improvements.

### ChatGPT

* An AI assistant that previously helped the Product Owner explore and document the NCGS visual direction.
* Has produced a design handover containing approved preferences, exploratory material and supporting references.
* Has no ongoing authority, supervisory role, approval responsibility or required involvement in this project.
* Is not the Product Owner.

The proposed division of work between Claude and Codex may be changed by mutual agreement where doing so improves efficiency.

All references to “Product Owner approval” mean approval from the human Product Owner, never ChatGPT.

## 2. Starting design reference

ChatGPT prepared the following handover:

NCGS Design Handover — Option 2

Both agents should read it and review the original visual references linked within it.

The Product Owner has selected Option 2 — Modern Club Character as the primary aesthetic direction.

Its defining characteristics include:

* Modern editorial elegance, with personality and restraint.
* Pine green and warm ivory as dominant colours.
* Champagne gold used sparingly.
* Primarily contemporary sans-serif typography, with selective serif display lettering.
* Clean, modern components and thoughtful use of space.
* The selected NCGS gold double-ring crest.
* A lighter, softly translucent floating navigation pill rather than the earlier heavy dark-green bar.
* A consistent design language extending throughout the application.

The handover is a design reference, not an instruction to reproduce ChatGPT’s ideas uncritically.

The Product Owner approved the overall visual direction, not every colour code, typeface, component or mock-up.

Individual screen mock-ups remain exploratory.

## 3. Freedom to improve the design

The Product Owner explicitly authorises both agents to critically assess and improve the material provided by ChatGPT.

Both agents should:

* Identify weaknesses or inconsistencies in the proposed visual system.
* Suggest and implement better solutions where appropriate.
* Challenge each other’s ideas constructively.
* Exercise professional judgement over layout, typography, spacing, navigation, components and interaction design.
* Design new screens consistently without requiring a separate visual approval for every page.
* Prioritise the practical experience of golfers using mobile phones, including outdoor readability and fast score entry.

Neither agent should treat ChatGPT’s aesthetic recommendations as unquestionable rules.

Routine improvements within the selected direction may be agreed and implemented by the agents.

Material departures from the Product Owner’s explicitly selected aesthetic require a decision from the human Product Owner.

Neither agent has automatic authority over the other.

## 4. @Codex — Initial responsibilities

Codex should initially lead implementation.

Responsibilities include:

1. Inspecting the existing NCGS application, current branches and completed redesign work.
2. Assessing the existing design system and identifying opportunities for improvement.
3. Implementing consistent design tokens, components, typography and navigation.
4. Incorporating the latest lighter floating-navigation direction.
5. Extending the visual system across the entire application.
6. Preserving existing scoring, competition calculations, offline functionality and synchronisation.
7. Running appropriate automated tests and reviewing genuine application screenshots.
8. Publishing implementation plans, changes and evidence to the shared GitHub discussion.

Codex is expected to contribute independent creative ideas, not merely execute ChatGPT’s recommendations.

## 5. @Claude — Initial responsibilities

Claude should initially provide independent design and engineering challenge.

Responsibilities include:

1. Independently examining the same design references and existing application.
2. Evaluating the overall aesthetic, visual consistency, usability and technical implementation.
3. Identifying weaknesses and recommending stronger alternatives.
4. Reviewing Codex’s proposals and implementation evidence.
5. Contributing original design and engineering solutions.
6. Assessing accessibility, responsive behaviour, scoring workflows, navigation and reliability.
7. Publishing findings and recommendations in the shared GitHub discussion.

Claude is expected to improve the work, not simply check whether it follows ChatGPT’s specification.

## 6. Collaboration and shared information

The shared coordination location is:

NCGS GitHub Issue #1

Both agents must use this shared record to communicate progress, decisions, disagreements and proposed changes.

Each agent should be able to see what the other has been instructed to do and what work is underway.

The agents should:

1. Inspect current repository activity before proposing new work.
2. Agree responsibility for individual implementation tasks to prevent conflicting changes.
3. Review each other’s proposals where useful.
4. Record meaningful technical and design decisions in GitHub.
5. Resolve ordinary disagreements collaboratively.
6. Escalate genuinely unresolved product decisions to the human Product Owner.

The Product Owner should not have to act as a messenger between the agents.

Where direct agent-to-agent communication or automatic coordination is technically unavailable, explain the limitation clearly and use GitHub as the common record.

Do not ask ChatGPT to arbitrate disagreements or provide approvals. ChatGPT is no longer part of this workflow.

## 7. Autonomy and safeguards

Both agents are expected to operate with substantial independence.

The Product Owner does not want to supervise routine coding, design adjustments, GitHub operations or testing.

Both agents should take initiative, collaborate and progress the application as effectively as their tools and permissions allow.

However:

* Existing scoring rules, data integrity, synchronisation and offline behaviour must be preserved.
* Existing repository safeguards and testing requirements must be respected.
* Completed work should be retained and built upon rather than unnecessarily repeated.
* No changes to the live application, production deployment or merge to main may take place without explicit authorisation from the human Product Owner.
* Significant changes to product scope or the agreed aesthetic should be presented to the Product Owner with a recommendation.

## 8. Immediate next steps

@Codex: Read the handover and current repository state. Identify what should be retained, what can be improved, and the most useful next implementation task. Coordinate with Claude in Issue #1.

@Claude: Independently examine the same information. Identify design and engineering improvements, challenge weaknesses and coordinate a sensible working arrangement with Codex in Issue #1.

Both agents: Review each other’s proposed responsibilities and agree how to collaborate most effectively. The initial assignment of implementation and review responsibilities is flexible.

Do not automatically restart completed work or create new tasks where the existing roadmap is already complete. Establish what meaningful work remains.

Provide the human Product Owner with concise updates focused on progress, outcomes, significant decisions and any genuine blockers.

## 9. Overall objective

The objective is to deliver an outstanding NCGS application that is visually coherent, distinctive, easy to use and technically reliable.

The existing design handover provides a starting direction, not a ceiling on quality.

The human Product Owner sets the direction and makes significant decisions. Claude and Codex collaborate as capable AI development agents, with freedom to challenge and improve the work. ChatGPT’s contribution ends with the handover.

No agent should interpret the handover as giving ChatGPT any continuing role or authority.
