// Use the global supabase client already initialized in home.html
const supabase = window.supabase;

// Attach functions to the window object for global access
window.utils = {
  showScreen: function(screenId) {
    // Hide all screens
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("active");
    });

    // Show the selected screen
    document.getElementById(screenId).classList.add("active");

    // Update active nav item
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active");
    });

    // Find and activate the corresponding nav item
    const navMap = {
      "home-screen": 0,
      "groups-screen": 1,
      "profile-screen": 2,
    };

    if (screenId in navMap) {
      document.querySelectorAll(".nav-item")[navMap[screenId]].classList.add("active");
    }
  },

  hideModal: function(modalId) {
    document.getElementById(modalId).classList.remove("active");
  }
};
