const assistantHost = document.createElement("div");
assistantHost.className = "chat-assistant";
assistantHost.dataset.chatAssistant = "";
assistantHost.innerHTML = `
  <section class="chat-panel" id="black-r-chat" aria-label="Black R website assistant" hidden>
    <header class="chat-header">
      <span class="chat-avatar" aria-hidden="true">R</span>
      <div class="chat-identity">
        <strong>Ask Black R</strong>
        <span>AI website assistant</span>
      </div>
      <button class="chat-close" type="button" aria-label="Close assistant" data-chat-close>&times;</button>
    </header>
    <div class="chat-messages" aria-live="polite" aria-relevant="additions text" data-chat-messages></div>
    <div class="chat-suggestions" aria-label="Suggested questions" data-chat-suggestions>
      <button class="chat-suggestion" type="button" data-chat-prompt="What does Black R do?">What is Black R?</button>
      <button class="chat-suggestion" type="button" data-chat-prompt="Help me register a school.">Register a school</button>
      <button class="chat-suggestion" type="button" data-chat-prompt="How can parents join?">Parent onboarding</button>
    </div>
    <form class="chat-form" data-chat-form>
      <label class="sr-only" for="black-r-chat-input">Message the Black R assistant</label>
      <textarea class="chat-input" id="black-r-chat-input" rows="1" maxlength="600" placeholder="Ask about Black R..." data-chat-input></textarea>
      <button class="chat-send" type="submit" aria-label="Send message" data-chat-send>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 3.1 18 8.1a.9.9 0 0 1 0 1.6l-18 8.1a.9.9 0 0 1-1.2-1l1.8-6.2 9.2-1.7-9.2-1.7-1.8-6.2a.9.9 0 0 1 1.2-1Z"/></svg>
      </button>
      <p class="chat-disclaimer">AI can make mistakes. Do not share IDs, banking details, passwords, or documents here.</p>
    </form>
  </section>
  <button class="chat-launcher" type="button" aria-expanded="false" aria-controls="black-r-chat" data-chat-open>
    <span class="chat-launcher-mark" aria-hidden="true">R</span>
    <span>Ask Black R</span>
  </button>`;
document.body.append(assistantHost);

const panel = assistantHost.querySelector(".chat-panel");
const launcher = assistantHost.querySelector("[data-chat-open]");
const closeButton = assistantHost.querySelector("[data-chat-close]");
const messagesElement = assistantHost.querySelector("[data-chat-messages]");
const suggestions = assistantHost.querySelector("[data-chat-suggestions]");
const form = assistantHost.querySelector("[data-chat-form]");
const input = assistantHost.querySelector("[data-chat-input]");
const sendButton = assistantHost.querySelector("[data-chat-send]");
const history = [];
let isWaiting = false;

function scrollMessages() {
  messagesElement.scrollTop = messagesElement.scrollHeight;
}

function addMessage(role, content, action = null) {
  const wrapper = document.createElement("div");
  wrapper.className = `chat-message chat-message-${role}`;
  const bubble = document.createElement("p");
  bubble.className = "chat-bubble";
  bubble.textContent = content;
  wrapper.append(bubble);
  messagesElement.append(wrapper);

  if (action?.label && action?.href) {
    const isSafeHref = action.href.startsWith("/") ||
      action.href.startsWith("mailto:") || action.href.startsWith("tel:") ||
      action.href.startsWith("https://wa.me/");
    if (isSafeHref) {
      const link = document.createElement("a");
      link.className = "chat-action";
      link.href = action.href;
      link.textContent = `${action.label}  →`;
      if (action.href.startsWith("https://")) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
      messagesElement.append(link);
    }
  }
  scrollMessages();
}

function addTypingIndicator() {
  const wrapper = document.createElement("div");
  wrapper.className = "chat-message chat-typing";
  wrapper.dataset.chatTyping = "";
  wrapper.innerHTML = '<span class="chat-bubble" aria-label="Black R is replying"><i></i><i></i><i></i></span>';
  messagesElement.append(wrapper);
  scrollMessages();
}

function setOpen(isOpen) {
  panel.hidden = !isOpen;
  launcher.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) {
    if (!messagesElement.children.length) {
      addMessage("assistant", "Hello — I’m R, Black R’s website assistant. I can explain the platform, guide school or parent onboarding, and help you contact the team.");
    }
    window.setTimeout(() => input.focus(), 0);
  }
}

function requestHistory() {
  const recent = history.slice(-8);
  while (recent.reduce((total, message) => total + message.content.length, 0) > 4000) {
    recent.shift();
  }
  return recent;
}

async function sendMessage(content) {
  if (isWaiting) return;
  const cleanContent = content.trim();
  if (!cleanContent) return;

  isWaiting = true;
  input.value = "";
  input.style.height = "auto";
  sendButton.disabled = true;
  suggestions.hidden = true;
  addMessage("user", cleanContent);
  history.push({role: "user", content: cleanContent});
  addTypingIndicator();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({messages: requestHistory()}),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "The assistant is unavailable right now.");
    const reply = String(result.reply || "").trim();
    if (!reply) throw new Error("The assistant is unavailable right now.");
    messagesElement.querySelector("[data-chat-typing]")?.remove();
    addMessage("assistant", reply, result.action);
    history.push({role: "assistant", content: reply});
  } catch (error) {
    messagesElement.querySelector("[data-chat-typing]")?.remove();
    addMessage("assistant", error.message || "The assistant is unavailable right now. Please try again.");
  } finally {
    isWaiting = false;
    sendButton.disabled = false;
    input.focus();
  }
}

launcher.addEventListener("click", () => setOpen(panel.hidden));
closeButton.addEventListener("click", () => {
  setOpen(false);
  launcher.focus();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(input.value);
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 104)}px`;
});

suggestions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-chat-prompt]");
  if (button) sendMessage(button.dataset.chatPrompt);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !panel.hidden) {
    setOpen(false);
    launcher.focus();
  }
});
