// Announcement bar: hide before first paint for readers who closed it (no flash). Loaded in <head>, no inline script.
try { if (localStorage.getItem("fim-announce-dismissed") === "steps-app-1") document.documentElement.classList.add("announce-off"); } catch (e) {}
