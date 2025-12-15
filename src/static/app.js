document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        activityCard.dataset.activity = name;

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        // Participants section
        const participantsSection = document.createElement("div");
        participantsSection.className = "participants";

        const participantsHeader = document.createElement("h5");
        participantsHeader.textContent = `Participants (${details.participants.length})`;
        participantsSection.appendChild(participantsHeader);

        if (details.participants && details.participants.length > 0) {
          const ul = document.createElement("ul");
          ul.className = "participants-list";
          details.participants.forEach((p) => {
            const li = document.createElement("li");
            li.className = "participant-item";
            const span = document.createElement("span");
            span.className = "participant-email";
            span.textContent = p;

            const btn = document.createElement("button");
            btn.className = "participant-delete";
            btn.dataset.email = p;
            btn.type = "button";
            btn.title = `Unregister ${p}`;
            btn.textContent = "✖";
            btn.addEventListener("click", async (e) => {
              e.preventDefault();
              await handleUnregister(name, p, li, activityCard);
            });

            li.appendChild(span);
            li.appendChild(btn);
            ul.appendChild(li);
          });
          participantsSection.appendChild(ul);
        } else {
          const none = document.createElement("div");
          none.className = "none";
          none.textContent = "No participants yet.";
          participantsSection.appendChild(none);
        }

        activityCard.appendChild(participantsSection);
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Helper to find activity card element by activity name
  function findActivityCard(activityName) {
    const cards = document.querySelectorAll(".activity-card");
    return Array.from(cards).find((c) => c.dataset.activity === activityName);
  }

  // Update activity card UI after participants change
  function updateActivityCardUI(activityName, participants, maxParticipants) {
    const card = findActivityCard(activityName);
    if (!card) return;

    // Update participants header / list
    const participantsSection = card.querySelector(".participants");
    let ul = participantsSection.querySelector("ul.participants-list");
    const header = participantsSection.querySelector("h5");

    if (!participants || participants.length === 0) {
      if (ul) ul.remove();
      let none = participantsSection.querySelector(".none");
      if (!none) {
        none = document.createElement("div");
        none.className = "none";
        participantsSection.appendChild(none);
      }
      none.textContent = "No participants yet.";
      header.textContent = `Participants (0)`;
    } else {
      // Ensure no "none" message
      const none = participantsSection.querySelector(".none");
      if (none) none.remove();

      if (!ul) {
        ul = document.createElement("ul");
        ul.className = "participants-list";
        participantsSection.appendChild(ul);
      }

      // Rebuild list
      ul.innerHTML = "";
      participants.forEach((p) => {
        const li = document.createElement("li");
        li.className = "participant-item";
        const span = document.createElement("span");
        span.className = "participant-email";
        span.textContent = p;

        const btn = document.createElement("button");
        btn.className = "participant-delete";
        btn.dataset.email = p;
        btn.type = "button";
        btn.title = `Unregister ${p}`;
        btn.textContent = "✖";
        btn.addEventListener("click", async (e) => {
          e.preventDefault();
          await handleUnregister(activityName, p, li, card);
        });

        li.appendChild(span);
        li.appendChild(btn);
        ul.appendChild(li);
      });

      header.textContent = `Participants (${participants.length})`;
    }

    // Update availability
    const availability = card.querySelector(".availability");
    if (availability) {
      const spotsLeft = maxParticipants - (participants ? participants.length : 0);
      availability.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;
    }
  }

  // Handle unregister click
  async function handleUnregister(activityName, email, liElement, cardElement) {
    try {
      const resp = await fetch(
        `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        alert(err.detail || err.message || "Failed to unregister participant");
        return;
      }

      const data = await resp.json();

      // Remove the list item from DOM or rebuild UI
      if (liElement && liElement.parentElement) {
        liElement.remove();
      }

      updateActivityCardUI(activityName, data.participants, data.max_participants);
    } catch (error) {
      console.error("Error unregistering:", error);
      alert("Failed to unregister participant. Please try again.");
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Update the UI for the activity without full page refresh
        if (result.participants) {
          updateActivityCardUI(activity, result.participants, result.max_participants);
        }
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
