/**
 * Polyphonic Piano Engine — T-02C FIFO task queue
 *
 * First in, first out: tasks leave in exactly the order they arrived. This
 * is the PRD's suggested AudioTaskQueue with a head index instead of
 * Array#shift(), so dequeue is O(1) rather than O(n): the slot at the head
 * is cleared (so the task can be garbage-collected) and the index moves on.
 * When more than half of the backing array is spent, the live tail is
 * compacted into a fresh array, so memory stays proportional to `size`.
 *
 * `null` is the "empty" signal of dequeue() and peek(), so null and
 * undefined are rejected as tasks (Project Rule 2).
 */

const COMPACT_AFTER = 32;

export class AudioTaskQueue {
    #tasks = [];
    #head = 0;

    /** @param {Iterable} [tasks] optional initial tasks, enqueued in iteration order */
    constructor(tasks = []) {
        if (tasks === null || typeof tasks[Symbol.iterator] !== "function") {
            throw new TypeError("AudioTaskQueue: initial tasks must be iterable");
        }
        for (const task of tasks) this.enqueue(task);
    }

    enqueue(task) {
        if (task === null || task === undefined) {
            throw new TypeError("AudioTaskQueue: a task cannot be null or undefined");
        }
        this.#tasks.push(task);
        return this.size;
    }

    /** Removes and returns the oldest task, or null when the queue is empty. */
    dequeue() {
        if (this.#head >= this.#tasks.length) return null;
        const task = this.#tasks[this.#head];
        this.#tasks[this.#head] = undefined;
        this.#head += 1;
        if (this.#head === this.#tasks.length) {
            this.#tasks = [];
            this.#head = 0;
        } else if (this.#head >= COMPACT_AFTER && this.#head * 2 >= this.#tasks.length) {
            this.#tasks = this.#tasks.slice(this.#head);
            this.#head = 0;
        }
        return task;
    }

    /** The oldest task without removing it, or null when empty. */
    peek() {
        return this.#head < this.#tasks.length ? this.#tasks[this.#head] : null;
    }

    clear() {
        this.#tasks = [];
        this.#head = 0;
    }

    get size() {
        return this.#tasks.length - this.#head;
    }

    /** A copy of the queued tasks, oldest first; the queue is not changed. */
    toArray() {
        return this.#tasks.slice(this.#head);
    }
}

export default AudioTaskQueue;
