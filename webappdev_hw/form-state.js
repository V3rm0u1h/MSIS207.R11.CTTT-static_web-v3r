/* HW3 Commit 3 — Form State Machine */

const FORM_STATES = Object.freeze({
  IDLE: "Idle",
  SUBMITTING: "Submitting",
  SUCCESS: "Success",
  ERROR: "Error"
});

const VALID_TRANSITIONS = Object.freeze({
  [FORM_STATES.IDLE]: [
    FORM_STATES.SUBMITTING
  ],

  [FORM_STATES.SUBMITTING]: [
    FORM_STATES.SUCCESS,
    FORM_STATES.ERROR
  ],

  [FORM_STATES.SUCCESS]: [
    FORM_STATES.IDLE
  ],

  [FORM_STATES.ERROR]: [
    FORM_STATES.IDLE
  ]
});

let formState = FORM_STATES.IDLE;

function transitionTo(nextState) {
  const allowedTransitions =
    VALID_TRANSITIONS[formState] || [];

  if (!allowedTransitions.includes(nextState)) {
    return false;
  }

  formState = nextState;
  return true;
}

function getFormState() {
  return formState;
}