/* HW3 Commit 4 — Form State Machine + UI */

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

const contactForm = document.querySelector("#contact-form");
const submitButton = document.querySelector("#submit-button");
const formStatus = document.querySelector("#form-status");

function transitionTo(nextState) {
  const allowedTransitions =
    VALID_TRANSITIONS[formState] || [];

  if (!allowedTransitions.includes(nextState)) {
    return false;
  }

  formState = nextState;
  renderFormState();

  return true;
}

function getFormState() {
  return formState;
}

function renderFormState() {
  if (!contactForm || !submitButton || !formStatus) {
    return;
  }

  switch (formState) {
    case FORM_STATES.IDLE:
      submitButton.disabled = false;
      submitButton.textContent = "Submit";
      formStatus.textContent = "";
      break;

    case FORM_STATES.SUBMITTING:
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
      formStatus.textContent = "Submitting your message...";
      break;

    case FORM_STATES.SUCCESS:
      submitButton.disabled = true;
      submitButton.textContent = "Submitted";
      formStatus.textContent = "Your message was submitted successfully.";
      break;

    case FORM_STATES.ERROR:
      submitButton.disabled = false;
      submitButton.textContent = "Try again";
      formStatus.textContent = "Something went wrong. Please try again.";
      break;
  }
}

function simulateSubmission() {
  return new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });
}

async function handleFormSubmit(event) {
  event.preventDefault();

  if (getFormState() !== FORM_STATES.IDLE) {
    return;
  }

  transitionTo(FORM_STATES.SUBMITTING);

  try {
    await simulateSubmission();

    transitionTo(FORM_STATES.SUCCESS);
  } catch (error) {
    transitionTo(FORM_STATES.ERROR);
  }
}

contactForm?.addEventListener(
  "submit",
  handleFormSubmit
);

renderFormState();