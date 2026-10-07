const events = [];

const recorder = {
  record(event) {
    if (!event || !event.key || !event.sound) {
      return;
    }

    const recordedEvent = {
      key: event.key,
      sound: event.sound,
      timestamp: performance.now()
    };

    events.push(recordedEvent);
  },

  getEvents() {
    return [...events];
  },

  clear() {
    events.length = 0;
  },

  dequeue() {
    return events.shift();
  },

  size() {
    return events.length;
  }
};