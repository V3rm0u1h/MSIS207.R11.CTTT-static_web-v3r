/**
 * Polyphonic Piano Engine — T-02D render tracker (test-only, never imported by the app)
 *
 * An automated stand-in for the React DevTools Profiler. DevTools works by
 * installing `__REACT_DEVTOOLS_GLOBAL_HOOK__` before React loads; React then
 * calls hook.onCommitFiberRoot(rendererID, root) after every commit. This
 * tracker installs a minimal hook of its own and, like the Profiler, decides
 * per fiber whether it rendered in that commit from React's PerformedWork
 * flag (the check DevTools' didFiberRender uses for function components).
 *
 * A fiber that bails out is either cloned (flags reset, so no PerformedWork)
 * or reused untouched from an earlier commit (same object, same
 * memoizedProps). The tracker remembers which props object it last counted
 * for each fiber, so a reused fiber still flagged from an older commit is not
 * counted twice.
 *
 * Call as installRenderTracker("PianoKey") (Playwright: page.addInitScript(installRenderTracker, "PianoKey")).
 * After every commit, target.__renders gets one entry: the `pianoKey.midi`
 * (or the props, for other components) of every `componentName` fiber that
 * actually rendered. The function is self-contained so Playwright can
 * serialise it into page.addInitScript.
 */
export function installRenderTracker(componentName, target = globalThis) {
    const PERFORMED_WORK = 1;
    const counted = new WeakMap();
    target.__renders = [];
    target.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
        supportsFiber: true,
        isDisabled: false,
        renderers: new Map(),
        inject(internals) {
            const id = this.renderers.size + 1;
            this.renderers.set(id, internals);
            return id;
        },
        checkDCE() {},
        onScheduleFiberRoot() {},
        onCommitFiberUnmount() {},
        onPostCommitFiberRoot() {},
        setStrictMode() {},
        onCommitFiberRoot(rendererID, root) {
            const rendered = [];
            const stack = [root.current];
            while (stack.length > 0) {
                const fiber = stack.pop();
                if (typeof fiber.type === "function" && fiber.type.name === componentName
                    && (fiber.flags & PERFORMED_WORK) !== 0 && counted.get(fiber) !== fiber.memoizedProps) {
                    counted.set(fiber, fiber.memoizedProps);
                    rendered.push(fiber.memoizedProps?.pianoKey?.midi ?? fiber.memoizedProps);
                }
                if (fiber.sibling) stack.push(fiber.sibling);
                if (fiber.child) stack.push(fiber.child);
            }
            target.__renders.push(rendered.sort((a, b) => a - b));
        }
    };
}

export default installRenderTracker;
