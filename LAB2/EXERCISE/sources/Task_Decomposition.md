# Mini-React — Resilient Async Data Component

## 1. Objective

Implement a resilient asynchronous data component using the existing Mini-React architecture.

The component must support exactly four UI states: `IDLE`, `LOADING`, `SUCCESS`, and `ERROR`.

It must provide CSS skeleton feedback, safe data rendering, accessible error recovery, stale-response protection, and lifecycle cleanup.

## 2. Git Milestone

**Required commit:**

`feat(ui): implement multi-state data component with skeleton feedback`

All subtasks below belong to this single feature commit. Do not include unrelated refactoring or changes to previous milestones.

## 3. Existing Architecture

Reuse the following modules where available:

- `createElement.js` — creates VNodes.
- `renderToDOM.js` — converts VNodes into real DOM nodes.
- `state.js` and `useState.js` — existing state engine, if compatible with the component contract.
- `events.js` — existing root event delegation system.

Before implementation, inspect the actual function signatures, state update behavior, event registration contract, and cleanup behavior. Adapt the component to the existing APIs instead of creating duplicate infrastructure.

## 4. Work Breakdown Structure

### T-01 — Architecture Inspection and Contract Definition

**Objective:** Establish compatibility with the existing Mini-React modules.

Tasks:
- Inspect the VNode factory and renderer APIs.
- Inspect the state engine and event delegation APIs.
- Define the data-source interface and expected response shape.
- Document the four-state finite state machine.
- Define request invalidation and disposal behavior.

Acceptance criteria:
- Existing APIs and their limitations are documented.
- No parallel renderer, event system, or UI framework is introduced.
- The response contract and state-transition rules are explicit.

Deliverable:
- Architecture and component contract documented in this file.

### T-02 — Finite State Machine and Transition Validation

**Objective:** Implement one source of truth for the component's UI state.

Tasks:
- Define `IDLE`, `LOADING`, `SUCCESS`, and `ERROR`.
- Implement a central transition function.
- Reject invalid states and disallowed transitions.
- Ensure each request enters `LOADING` before its result is displayed.
- Define behavior for refresh, retry, failure, and cancellation.

Acceptance criteria:
- Only the four documented states are accepted.
- State changes pass through the central transition mechanism.
- Loading, success, and error are not represented by independent boolean flags.
- Invalid transitions fail predictably.

Suggested commit scope: part of the final feature commit.

### T-03 — CSS Loading Skeleton and Accessibility

**Objective:** Provide accessible loading feedback with stable layout dimensions.

Tasks:
- Create CSS placeholder shapes that resemble the expected data layout.
- Add a subtle skeleton animation.
- Reserve suitable space to minimize layout shifts.
- Add an accessible loading status region.
- Hide decorative skeleton elements from assistive technology.
- Respect `prefers-reduced-motion: reduce`.
- Preserve visible keyboard focus indicators.

Acceptance criteria:
- The skeleton appears only during `LOADING`.
- Animation is implemented in CSS.
- Reduced-motion preferences disable or reduce animation.
- Loading status is accessible without relying on color alone.
- No JavaScript animation loops or unmanaged timers are introduced.

Deliverable:
- `asyncDataComponent.css`

### T-04 — Safe Success Rendering and Response Validation

**Objective:** Render validated asynchronous data using the existing VNode pipeline.

Tasks:
- Define the accepted response schema.
- Validate response data before accessing its fields.
- Render valid items with semantic HTML.
- Handle empty but valid responses.
- Render server-provided text using VNodes and safe text nodes.
- Reject malformed response data without exposing internal details.

Acceptance criteria:
- Valid data renders in `SUCCESS`.
- Empty valid data displays an appropriate empty-state message.
- HTML-like strings are displayed literally.
- No `innerHTML` assignment is used for server-provided content.
- No unnecessary wrapper elements are introduced.

### T-05 — Error State and Accessible Retry

**Objective:** Provide a recoverable error state.

Tasks:
- Display a human-readable error message.
- Avoid exposing stack traces or sensitive response details.
- Add a semantic button labeled **Retry Connection**.
- Connect the button through the existing event delegation system.
- Make retry start a fresh request.
- Prevent uncontrolled overlapping retries.

Acceptance criteria:
- Failed requests transition to `ERROR`.
- The error message is understandable and safe.
- Retry is keyboard accessible and has a clear accessible name.
- Activating retry transitions to `LOADING` and invokes the data source again.
- A successful retry can recover to `SUCCESS` without reloading the page.

### T-06 — Request Identity and Race-Condition Protection

**Objective:** Ensure that only the latest valid request can update the component.

Tasks:
- Assign each request a unique, monotonically increasing identifier.
- Invalidate previous requests when a new request starts.
- Ignore successful responses from outdated requests.
- Ignore failures from outdated requests.
- Abort previous requests when practical.
- Do not rely on aborting alone for correctness.

Acceptance criteria:
- A slower older request cannot overwrite a newer result.
- An outdated rejection cannot replace a newer success or error state.
- Completion of an older request cannot reset the current request's state.
- Repeated retry actions cannot create uncontrolled concurrent requests.

### T-07 — Lifecycle Cleanup and Disposal

**Objective:** Prevent updates after the component is disposed.

Tasks:
- Provide a cleanup or disposal method.
- Invalidate the active request during disposal.
- Abort the active request when supported.
- Remove component-specific event registrations where required by the existing event system.
- Prevent asynchronous callbacks from updating disposed UI.
- Avoid duplicate native listeners and unmanaged timers.

Acceptance criteria:
- Disposed components ignore late responses.
- Cleanup is safe to invoke according to the documented lifecycle contract.
- Existing shared event delegation remains intact.
- No new event system is introduced.

### T-08 — Automated Tests

**Objective:** Verify state transitions, asynchronous behavior, security, and accessibility-related rendering.

Tasks:
- Test all valid state transitions and invalid state assignments.
- Test successful, failed, and empty responses.
- Use controlled promises to test out-of-order request completion.
- Test stale success and stale failure handling.
- Test retry recovery.
- Test disposal during an active request.
- Test literal HTML-like text rendering.
- Test skeleton, error message, retry button, and semantic DOM structure.

Acceptance criteria:
- Tests are deterministic and do not depend on a live backend.
- Race-condition tests prove that stale responses are ignored.
- Security tests confirm that HTML-like text is not interpreted as markup.
- Existing factory and renderer tests continue to pass.

Deliverable:
- `asyncDataComponent.test.js`

### T-09 — Demo, Browser Audit, and Completion Evidence

**Objective:** Verify the integrated feature in a real browser.

Tasks:
- Create a demo using a controllable mock data source.
- Inspect the loading skeleton in Chrome DevTools.
- Capture the success state.
- Capture the error state and retry button.
- Verify retry recovery.
- Inspect the Elements panel for semantic structure and unexpected nodes.
- Verify reduced-motion behavior.
- Record the automated test results.

Acceptance criteria:
- Loading, success, and error states can be demonstrated.
- Retry recovers from a failed request.
- The Elements panel confirms the expected DOM hierarchy.
- No executable script element is created from untrusted text.
- Required screenshots and test output are recorded.

Deliverable:
- `asyncDataComponent.demo.html`
- Completion evidence for the feature.

## 5. Implementation Order and Dependencies

1. **T-01:** Inspect existing architecture and define contracts.
2. **T-02:** Implement the state machine.
3. **T-03:** Implement skeleton styling and loading accessibility.
4. **T-04:** Implement response validation and safe success rendering.
5. **T-05:** Implement error presentation and retry.
6. **T-06:** Add request identity and stale-response protection.
7. **T-07:** Implement disposal and cleanup.
8. **T-08:** Add and run automated tests.
9. **T-09:** Complete the browser audit and capture evidence.

T-02 through T-07 form the component implementation. T-08 verifies the complete implementation, and T-09 verifies it in the browser.

## 6. Expected Files

- `asyncDataComponent.js`
- `asyncDataComponent.css`
- `asyncDataComponent.test.js`
- `asyncDataComponent.demo.html`
- `TASK_DECOMPOSITION.md`

The task decomposition file should be updated before implementation if the actual repository APIs require changes to the proposed contracts.

## 7. Out of Scope

- React or React DOM integration.
- A parallel renderer or event delegation system.
- Virtual DOM diffing or reconciliation.
- Backend or database development.
- Authentication or persistent browser storage.
- Unrelated refactoring of the existing Mini-React core.

## 8. Final Verification Checklist

- [ ] Exactly four UI states are defined.
- [ ] State transitions are validated centrally.
- [ ] CSS skeleton and reduced-motion support work.
- [ ] Response data is validated before rendering.
- [ ] Server-provided text is rendered safely.
- [ ] Retry invokes a fresh request.
- [ ] Stale successes and failures are ignored.
- [ ] Disposed components cannot be updated by late responses.
- [ ] Existing event delegation is reused.
- [ ] Factory, renderer, and component tests pass.
- [ ] Loading, success, and error screenshots are captured.
- [ ] Chrome DevTools confirms the expected DOM hierarchy.
- [ ] Only feature-related files are included in the commit.

## 9. Required Git Commit

`feat(ui): implement multi-state data component with skeleton feedback`
