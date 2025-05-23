// Group functionality for CigaRats app
document.addEventListener("DOMContentLoaded", () => {
  try {
    if (!window.supabase) {
      throw new Error("Supabase client not found")
    }

    const supabase = window.supabase
    console.log("Supabase instance:", supabase) // Debug line

    // Global variables
    let currentUserId = null
    let lastCigaretteTime = null

    // Function to show toast messages
    
        function showToast(message, type = 'success') {
            // Check if toast container exists
            let toastContainer = document.getElementById('toast-container');
            
            // Create toast container if it doesn't exist
            if (!toastContainer) {
                toastContainer = document.createElement('div');
                toastContainer.id = 'toast-container';
                document.body.appendChild(toastContainer);
            }
            
            // Create toast element
            const toast = document.createElement('div');
            toast.className = `toast-${type}`;
            toast.textContent = message;
            
            // Add toast to container
            toastContainer.appendChild(toast);
            
            // Remove toast after 3 seconds
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => {
                    if (toastContainer.contains(toast)) {
                        toastContainer.removeChild(toast);
                    }
                }, 300);
            }, 3000);
        }
        

    // Function to show cigarette details in modal
    function showCigaretteDetails(cigarette, brand, isGroupCigarette = false) {
      console.log("Opening cigarette details modal", cigarette) // Debug log

      // Set title
      document.getElementById("cig-detail-title").textContent = "Cigarette Details"

      // Format date and time
      const date = new Date(cigarette.created_at)
      const formattedDate = date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      const formattedTime = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      })

      // Set cigarette info
      document.getElementById("cig-detail-brand").textContent = brand || "Cigarette"
      document.getElementById("cig-detail-date").textContent = formattedDate
      document.getElementById("cig-detail-time").textContent = formattedTime

      // Set notes (or default message if no notes)
      const notesEl = document.getElementById("cig-detail-notes")
      notesEl.textContent = cigarette.notes || "No notes added"

      // Handle user info for group cigarettes
      const userInfoSection = document.getElementById("cig-detail-user")
      if (isGroupCigarette && cigarette.profiles) {
        userInfoSection.style.display = "block"

        // Set username
        document.getElementById("cig-detail-username").textContent = cigarette.profiles.username || "Unknown User"

        // Set avatar
        const avatarContainer = document.getElementById("cig-detail-avatar")
        avatarContainer.innerHTML = cigarette.profiles.avatar_url
          ? `<img src="${cigarette.profiles.avatar_url}" alt="User Avatar" onerror="this.src='/placeholder.svg?height=50&width=50'">`
          : `<img src="/placeholder.svg?height=50&width=50" alt="User Avatar">`
      } else {
        userInfoSection.style.display = "none"
      }

      // Handle image
      const imageContainer = document.getElementById("cig-detail-image-container")
      const imageEl = document.getElementById("cig-detail-image")

      if (cigarette.pic_url) {
        imageContainer.style.display = "block"
        imageEl.innerHTML = `<img src="${cigarette.pic_url}" alt="Cigarette Photo" onerror="this.parentNode.innerHTML='No image available'">`
      } else {
        imageContainer.style.display = "none"
        imageEl.innerHTML = ""
      }

      // Show modal
      if (typeof window.showModal === "function") {
        window.showModal("cigarette-detail-modal")
      } else {
        // Fallback if showModal function is not available
        const modal = document.getElementById("cigarette-detail-modal")
        if (modal) {
          modal.style.display = "flex"
        } else {
          console.error("Modal element not found")
        }
      }
    }

    // Initialize the application
    async function initApp() {
      try {
        console.log("Initializing app...") // Debug line

        // Hide the log button until initialization is complete
        const logButton = document.querySelector(".log-button-container")
        if (logButton) {
          logButton.style.display = "none"
          // Add a loading indicator in its place
          const loadingIndicator = document.createElement("div")
          loadingIndicator.className = "log-button-loading"
          loadingIndicator.innerHTML = `
    <div style="text-align: center; padding: 18px; color: var(--text-secondary);">
      <div class="loading-spinner" style="width: 24px; height: 24px; margin: 0 auto 10px;"></div>
      <div>Initializing...</div>
    </div>
  `
          logButton.parentNode.insertBefore(loadingIndicator, logButton)
        }

        // 1. Check authentication
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error) throw error
        if (!user) {
          window.location.href = "login.html"
          return
        }

        currentUserId = user.id
        console.log("User ID:", currentUserId) // Debug line

        // 2. Load initial data
        await Promise.all([loadUserData(), loadHomeScreenData()])

        // Start the smoke-free timer
        updateSmokeFreeDuration()

        // 3. Initialize event listeners
        initEventListeners()

        // 4. Initialize avatar upload
        if (window.avatarUpload && window.avatarUpload.init) {
          window.avatarUpload.init()
        }

        // Initialize cigarette photo upload
        if (window.cigarettePhotoUpload && window.cigarettePhotoUpload.init) {
          window.cigarettePhotoUpload.init()
          console.log("Cigarette photo upload initialized")
        } else {
          console.error("Cigarette photo upload module not found")
        }

        // Show the log button after initialization is complete
        const logButtonFinal = document.querySelector(".log-button-container")
        const loadingIndicatorFinal = document.querySelector(".log-button-loading")
        if (logButtonFinal) {
          logButtonFinal.style.display = "block"
          if (loadingIndicatorFinal) {
            loadingIndicatorFinal.remove()
          }
          console.log("Log button is now visible - initialization complete")
        }
      } catch (error) {
        console.error("Initialization error:", error)
        showError(error.message || "Failed to initialize app")
      }
    }

    // Load user profile data
    async function loadUserData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          console.log("User is logged in:", user)
        }

        // Get user profile
        const profile = await window.dataService.getUserProfile(currentUserId)

        // Update profile information
        document.querySelectorAll(".profile-name").forEach((el) => {
          if (el) el.textContent = profile.username || "User"
        })

        // Display join date if available
        const joinDateEl = document.getElementById("join-date")
        if (joinDateEl && profile.created_at) {
          const joinDate = new Date(profile.created_at)
          const options = { year: "numeric", month: "long", day: "numeric" }
          joinDateEl.textContent = joinDate.toLocaleDateString("en-US", options)
        }

        // Update avatar if available
        if (profile.avatar_url) {
          const avatarImages = document.querySelectorAll(".profile-avatar img")
          avatarImages.forEach((img) => {
            img.src = profile.avatar_url
          })
        }

        // Safely update settings form inputs if they exist
        const usernameInput = document.querySelector('#settings-tab input[type="text"]')
        const brandInput = document.querySelector('#settings-tab input[placeholder="Cigarette Brand"]')
        const priceInput = document.querySelector('#settings-tab input[placeholder="Price per Pack"]')
        const cigsInput = document.querySelector('#settings-tab input[type="number"]')

        if (usernameInput) usernameInput.value = profile.username || ""
        if (brandInput) brandInput.value = profile.cigarette_brand || ""
        if (priceInput) priceInput.value = profile.price_per_pack ? `$${profile.price_per_pack.toFixed(2)}` : ""
        if (cigsInput) cigsInput.value = profile.cigs_per_pack || 20

        // Safely update log cigarette form
        const logBrandInput = document.querySelector('#log-modal input[type="text"]')
        if (logBrandInput) logBrandInput.value = profile.cigarette_brand || ""

        // Get last cigarette time
        try {
          lastCigaretteTime = await window.dataService.getLastCigaretteTime(currentUserId)
          console.log("Last cigarette time:", lastCigaretteTime)

          // Ensure we have a valid date
          if (lastCigaretteTime) {
            // Make sure it's a Date object or a valid date string
            const testDate = new Date(lastCigaretteTime)
            if (isNaN(testDate.getTime())) {
              console.error("Invalid date returned from getLastCigaretteTime:", lastCigaretteTime)
              lastCigaretteTime = null
            }
          }

          // Update the timer
          updateSmokeFreeDuration()
        } catch (timeError) {
          console.error("Error getting last cigarette time:", timeError)
          lastCigaretteTime = null

          const timerEl = document.getElementById("smoke-free-timer")
          if (timerEl) {
            timerEl.textContent = "Error loading timer"
          }
        }
      } catch (error) {
        console.error("Error loading user data:", error)
        showError("Failed to load user data. Please try again later.")
      }
    }

    // Load home screen data
    async function loadHomeScreenData() {
      try {
        // Load stats
        await loadStats()

        // Load recent cigarettes
        await loadRecentCigarettes()

        // Load groups
        await loadGroups()

        // Load profile stats
        await loadProfileStats()

        // Note: We're removing the loadCigaretteHistory call here
        // It will be loaded on demand when the history tab is clicked
      } catch (error) {
        console.error("Error loading home screen data:", error)
        showError("Failed to load data. Please try again later.")
      }
    }

    // Load user stats
    async function loadStats() {
      try {
        // Get today's cigarette count
        const todayCount = await window.dataService.getTodayCigaretteCount(currentUserId)

        // Get this week's cigarette count
        const weekCount = await window.dataService.getWeekCigaretteCount(currentUserId)

        // Get user profile for price and cigarettes per pack
        const profile = await window.dataService.getUserProfile(currentUserId)

        // Calculate money spent
        const moneySpent = window.dataService.calculateMoneySpent(
          weekCount,
          profile.price_per_pack || 0,
          profile.cigs_per_pack || 20,
        )

        // Calculate time spent
        const timeSpent = window.dataService.calculateTimeSpent(weekCount)

        // Update stats in UI
        const statValues = document.querySelectorAll(".stat-value")
        statValues[0].textContent = todayCount
        statValues[1].textContent = weekCount
        statValues[2].textContent = `$${moneySpent}`
        statValues[3].textContent = timeSpent
      } catch (error) {
        console.error("Error loading stats:", error)
        showError("Failed to load stats. Please try again later.")
      }
    }

    // Load recent cigarettes
    async function loadRecentCigarettes() {
      try {
        // Get last 5 cigarettes
        const recentCigarettes = await window.dataService.getLastCigarettes(currentUserId, 5)

        // Get user profile for cigarette brand
        const profile = await window.dataService.getUserProfile(currentUserId)

        // Clear existing list
        const recentList = document.querySelector(".recent-list")
        recentList.innerHTML = ""

        // Add cigarettes to list
        recentCigarettes.forEach((cigarette) => {
          const date = new Date(cigarette.created_at)
          const relativeDate = window.dataService.formatRelativeDate(date)
          const timeString = window.dataService.formatDate(date)

          // Create icon element - either photo or emoji
          let iconHtml = '<div class="recent-icon">🚬</div>'

          // If there's a photo URL, use it instead of the emoji
          if (cigarette.pic_url) {
            iconHtml = `
              <div class="recent-icon" style="width: 40px; height: 40px; min-width: 40px; overflow: hidden; border-radius: 5px;">
                <img src="${cigarette.pic_url}" 
                     alt="Cigarette Photo" 
                     style="width: 100%; height: 100%; object-fit: cover;"
                     onerror="this.style.display='none'; this.parentNode.innerHTML='🚬'">
              </div>
            `
          }

          const listItem = document.createElement("li")
          listItem.className = "recent-item"
          listItem.style.alignItems = "flex-start" // Align items to the top
          listItem.innerHTML = `
  <div class="recent-info" style="flex: 1; min-width: 0;">
      <div class="recent-brand">${profile.cigarette_brand || "Cigarette"}</div>
      <div class="recent-meta" style="word-wrap: break-word;">${relativeDate}, ${timeString} • ${cigarette.notes || ""}</div>
  </div>
  ${iconHtml}
`

          recentList.appendChild(listItem)
        })

        // If no cigarettes, show message
        if (recentCigarettes.length === 0) {
          const listItem = document.createElement("li")
          listItem.className = "recent-item"
          listItem.innerHTML = `
                      <div class="recent-info">
                          <div class="recent-brand">No cigarettes logged yet</div>
                          <div class="recent-meta">Use the "Log a Cigarette" button to get started</div>
                      </div>
                      <div class="recent-icon">🚬</div>
                  `

          recentList.appendChild(listItem)
        }
      } catch (error) {
        console.error("Error loading recent cigarettes:", error)
        showError("Failed to load recent cigarettes. Please try again later.")
      }
    }

    // Load user groups
    async function loadGroups() {
      try {
        // Get user groups
        const groups = await window.dataService.getUserGroups(currentUserId)

        // Clear existing list
        const groupList = document.querySelector(".group-list")
        groupList.innerHTML = ""

        // Add groups to list
        for (const group of groups) {
          // Get group members
          const members = await window.dataService.getGroupMembers(group.id)

          // Get week cigarette count for all members
          let weekCigarettes = 0
          for (const member of members) {
            const count = await window.dataService.getWeekCigaretteCount(member.id)
            weekCigarettes += count
          }

          const listItem = document.createElement("li")
          listItem.className = "group-item"
          listItem.setAttribute("data-group-id", group.id)
          listItem.innerHTML = `
                      <div class="group-info">
                          <div class="group-name">${group.name}</div>
                          <div class="group-meta">${members.length} members • ${weekCigarettes} cigarettes this week</div>
                      </div>
                      <div>›</div>
                  `

          listItem.addEventListener("click", () => showGroupDetails(group.id))

          groupList.appendChild(listItem)
        }

        // If no groups, show message
        if (groups.length === 0) {
          const listItem = document.createElement("li")
          listItem.className = "group-item"
          listItem.innerHTML = `
                      <div class="group-info">
                          <div class="group-name">No groups yet</div>
                          <div class="group-meta">Join or create a group to get started</div>
                      </div>
                      <div>›</div>
                  `

          groupList.appendChild(listItem)
        }
      } catch (error) {
        console.error("Error loading groups:", error)
        showError("Failed to load groups. Please try again later.")
      }
    }

    // Show group details
    async function showGroupDetails(groupId) {
      try {
        // Show loading state
        showLoading(true)

        // Get group details
        const group = await window.dataService.getGroupById(groupId)

        // Update group name
        document.getElementById("group-details-name").textContent = group.name

        // Display group description if available
        const descriptionEl = document.getElementById("group-description")
        if (descriptionEl) {
          descriptionEl.textContent = group.description || "No description available"
          descriptionEl.style.display = group.description ? "block" : "none"
        }

        // Get group invite code
        const inviteCode = await window.dataService.getGroupInviteCode(groupId)
        document.getElementById("group-code").textContent = inviteCode

        // Load scoreboard
        await loadGroupScoreboard(groupId)

        // Load members
        await loadGroupMembers(groupId)

        // Load activity
        await loadGroupActivity(groupId)

        // Store group ID for later use
        document.getElementById("group-details-screen").setAttribute("data-group-id", groupId)

        // Show group details screen
        window.showScreen("group-details-screen")

        // Hide loading state
        showLoading(false)
      } catch (error) {
        console.error("Error showing group details:", error)
        showError("Failed to load group details. Please try again later.")

        // Hide loading state
        showLoading(false)
      }
    }

    // Load group scoreboard
    async function loadGroupScoreboard(groupId) {
      try {
        // Get group scoreboard
        const scoreboard = await window.dataService.getGroupScoreboard(groupId)

        // Clear existing list
        const scoreboardList = document.querySelector("#scoreboard-tab .scoreboard")
        scoreboardList.innerHTML = ""

        // Add members to scoreboard
        scoreboard.forEach((member, index) => {
          const isCurrentUser = member.userId === currentUserId

          const listItem = document.createElement("li")
          listItem.className = "scoreboard-item"

          // Create avatar element with proper image handling and fallback
          const avatarHtml = `
          <div class="scoreboard-avatar">
            <img src="${member.avatarUrl || "/placeholder.svg?height=30&width=30"}" 
                 alt="User Avatar" 
                 onerror="this.src='/placeholder.svg?height=30&width=30'">
          </div>`

          listItem.innerHTML = `
          <div class="scoreboard-rank">${index + 1}</div>
          <div class="scoreboard-user">
              ${avatarHtml}
              <div class="scoreboard-name">${isCurrentUser ? "You" : member.username}</div>
          </div>
          <div class="scoreboard-score">${member.count}</div>
        `

          scoreboardList.appendChild(listItem)
        })
      } catch (error) {
        console.error("Error loading group scoreboard:", error)
        showError("Failed to load group scoreboard. Please try again later.")
      }
    }

    // Load group members
    async function loadGroupMembers(groupId) {
      try {
        // Get group members
        const members = await window.dataService.getGroupMembers(groupId)

        // Get group details
        const group = await window.dataService.getGroupById(groupId)

        // Clear existing list
        const membersList = document.querySelector("#members-tab .member-list")
        membersList.innerHTML = ""

        // Add members to list
        for (const member of members) {
          const isAdmin = member.id === group.created_by
          const isCurrentUser = member.id === currentUserId

          // Get week cigarette count
          const weekCount = await window.dataService.getWeekCigaretteCount(member.id)

          // Create avatar element with proper image handling and fallback
          const avatarHtml = `
          <div class="member-avatar">
            <img src="${member.avatar_url || "/placeholder.svg?height=40&width=40"}" 
                 alt="Member Avatar" 
                 onerror="this.src='/placeholder.svg?height=40&width=40'">
          </div>`

          const listItem = document.createElement("li")
          listItem.className = "member-item"
          listItem.innerHTML = `
          ${avatarHtml}
          <div class="member-info">
              <div class="member-name">${isCurrentUser ? "You" : member.username}</div>
              <div class="member-status">${isAdmin ? "Admin • " : ""}${weekCount} cigarettes this week</div>
          </div>
        `

          membersList.appendChild(listItem)
        }
      } catch (error) {
        console.error("Error loading group members:", error)
        showError("Failed to load group members. Please try again later.")
      }
    }

    // Load group activity
    async function loadGroupActivity(groupId) {
      try {
        // Clear the activity tab content first to prevent duplicates
        const activityTab = document.getElementById("activity-tab")

        // Preserve the chart element which should be the first child
        const chartElement = activityTab.querySelector(".chart-container")
        const statsElement = activityTab.querySelector(".stats-container")

        // Clear everything else
        activityTab.innerHTML = ""

        // Re-add the chart and stats elements
        if (chartElement) activityTab.appendChild(chartElement)
        if (statsElement) activityTab.appendChild(statsElement)

        // Get group activity
        const activity = await window.dataService.getGroupActivity(groupId)

        // Get max value for scaling
        const maxValue = Math.max(...activity, 1)

        // Update chart bars
        const chartBars = document.querySelectorAll("#activity-tab .chart-bar")
        const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

        activity.forEach((count, index) => {
          const height = (count / maxValue) * 100
          chartBars[index].style.height = `${height}%`

          // Update label
          const labelEl = document.querySelectorAll("#activity-tab .chart-label")[index]
          labelEl.textContent = dayLabels[index]
        })

        // Get group members
        const members = await window.dataService.getGroupMembers(groupId)

        // Calculate total cigarettes
        const totalCigarettes = activity.reduce((sum, count) => sum + count, 0)

        // Calculate average per person
        const avgPerPerson = members.length > 0 ? (totalCigarettes / members.length).toFixed(1) : "0"

        // Calculate money spent
        let totalMoneySpent = 0
        for (const member of members) {
          const weekStart = new Date()
          weekStart.setDate(weekStart.getDate() - 6) // Last 7 days

          const today = new Date()

          const moneySpent = await window.dataService.getMoneySpent(member.id, weekStart, today)
          totalMoneySpent += Number.parseFloat(moneySpent)
        }

        // Calculate time spent
        const timeSpent = window.dataService.calculateTimeSpent(totalCigarettes)

        // Update stats
        const statValues = document.querySelectorAll("#activity-tab .stat-value")
        statValues[0].textContent = totalCigarettes
        statValues[1].textContent = avgPerPerson
        statValues[2].textContent = `$${totalMoneySpent.toFixed(0)}`
        statValues[3].textContent = timeSpent

        // Remove existing cigarette list if it exists
        const existingHeader = document.querySelector("#activity-tab h3")
        if (existingHeader) {
          // Find and remove the header and the list that follows it
          const existingList = document.querySelector("#activity-tab .group-cigs-list")
          if (existingList) {
            existingList.remove()
          }
          existingHeader.remove()
        }

        // Get last 10 cigarettes smoked by group members
        const { data: groupCigs, error: groupCigsError } = await window.supabase
          .from("cigarette_logs")
          .select(`
            *,
            profiles (id, username, avatar_url)
          `)
          .in(
            "user_id",
            members.map((m) => m.id),
          )
          .order("created_at", { ascending: false })
          .limit(10)

        if (groupCigsError) {
          console.error("Error loading group cigarettes:", groupCigsError)
        } else {
          console.log("Group cigarettes loaded:", groupCigs) // Debug log

          // Create a section header for the cigarette list
          const cigListHeader = document.createElement("h3")
          cigListHeader.textContent = "Last Cigarettes"
          cigListHeader.style.marginTop = "30px"
          cigListHeader.style.marginBottom = "15px"
          document.getElementById("activity-tab").appendChild(cigListHeader)

          // Create the list container
          const cigList = document.createElement("div")
          cigList.className = "group-cigs-list"

          // Add cigarettes to the list
          if (!groupCigs || groupCigs.length === 0) {
            const emptyMessage = document.createElement("div")
            emptyMessage.style.textAlign = "center"
            emptyMessage.style.padding = "15px"
            emptyMessage.style.color = "var(--text-secondary)"
            emptyMessage.textContent = "No cigarettes logged by group members yet"
            cigList.appendChild(emptyMessage)
          } else {
            groupCigs.forEach((cig) => {
              const date = new Date(cig.created_at)
              const relativeTime = window.dataService.formatRelativeDate(date)
              const timeString = window.dataService.formatDate(date)

              const cigItem = document.createElement("div")
              cigItem.className = "group-item"
              cigItem.style.marginBottom = "10px"
              cigItem.style.alignItems = "flex-start" // Align items to the top

              // Create user avatar and info
              const avatarHtml = `
                <div style="width: 40px; height: 40px; min-width: 40px; border-radius: 50%; overflow: hidden; margin-right: 10px;">
                  <img src="${cig.profiles?.avatar_url || "/placeholder.svg?height=40&width=40"}" 
                       alt="User Avatar" 
                       style="width: 100%; height: 100%; object-fit: cover;"
                       onerror="this.src='/placeholder.svg?height=40&width=40'">
                </div>
              `

              // Create cigarette image if available
              let cigImageHtml = ""
              if (cig.pic_url) {
                cigImageHtml = `
                  <div style="width: 50px; height: 50px; min-width: 50px; border-radius: 5px; overflow: hidden; margin-left: 10px;">
                    <img src="${cig.pic_url}" 
                         alt="Cigarette Photo" 
                         style="width: 100%; height: 100%; object-fit: cover;"
                         onerror="this.style.display='none'; this.parentNode.innerHTML='🚬'">
                  </div>
                `
              } else {
                cigImageHtml = `<div style="margin-left: 10px; min-width: 24px; font-size: 24px;">🚬</div>`
              }

              cigItem.innerHTML = `
  <div style="display: flex; align-items: flex-start; flex: 1; min-width: 0;">
    ${avatarHtml}
    <div style="flex: 1; min-width: 0;">
      <div style="font-weight: bold;">${cig.profiles?.username || "Unknown User"}</div>
      <div style="font-size: 12px; color: var(--text-secondary);">${relativeTime}, ${timeString}</div>
      ${cig.notes ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px; word-wrap: break-word;">${cig.notes}</div>` : ""}
    </div>
  </div>
  <div style="flex-shrink: 0; margin-left: 10px;">
    ${cigImageHtml}
  </div>
`
              // Add click event to show details
              cigItem.addEventListener("click", () => {
                // Get the brand from the user's profile if available
                const memberProfile = members.find((m) => m.id === cig.user_id)
                const brand = memberProfile?.cigarette_brand || "Cigarette"

                showCigaretteDetails(cig, brand, true)
              })

              cigList.appendChild(cigItem)
            })
          }

          // Append the list to the activity tab
          document.getElementById("activity-tab").appendChild(cigList)
        }
      } catch (error) {
        console.error("Error loading group activity:", error)
        showError("Failed to load group activity. Please try again later.")
      }
    }

    // Load profile stats
    async function loadProfileStats() {
      try {
        // Get today's cigarette count
        const todayCount = await window.dataService.getTodayCigaretteCount(currentUserId)

        // Get this week's cigarette count
        const weekCount = await window.dataService.getWeekCigaretteCount(currentUserId)

        // Get user profile for price and cigarettes per pack
        const profile = await window.dataService.getUserProfile(currentUserId)

        // Calculate money spent
        const moneySpent = window.dataService.calculateMoneySpent(
          weekCount,
          profile.price_per_pack || 0,
          profile.cigs_per_pack || 20,
        )

        // Calculate time spent
        const timeSpent = window.dataService.calculateTimeSpent(weekCount)

        // Update stats in UI
        const statValues = document.querySelectorAll("#stats-tab .stat-value")
        statValues[0].textContent = todayCount
        statValues[1].textContent = weekCount
        statValues[2].textContent = `$${moneySpent}`
        statValues[3].textContent = timeSpent

        // Get weekly cigarette data
        const weeklyData = await window.dataService.getWeeklyCigaretteData(currentUserId)

        // Get max value for scaling
        const maxValue = Math.max(...weeklyData, 1)

        // Update chart bars
        const chartBars = document.querySelectorAll("#stats-tab .chart-bar")
        const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

        weeklyData.forEach((count, index) => {
          const height = (count / maxValue) * 100
          chartBars[index].style.height = `${height}%`

          // Update label
          const labelEl = document.querySelectorAll("#stats-tab .chart-label")[index]
          labelEl.textContent = dayLabels[index]
        })

        // Load insights
        const insights = await window.dataService.getUserInsights(currentUserId)

        // Update insights list
        const insightsList = document.querySelector("#stats-tab ul")
        insightsList.innerHTML = ""

        insights.forEach((insight) => {
          const listItem = document.createElement("li")
          listItem.style.marginBottom = "10px"
          listItem.textContent = insight

          insightsList.appendChild(listItem)
        })

        // If no insights, show message
        if (insights.length === 0) {
          const listItem = document.createElement("li")
          listItem.style.marginBottom = "10px"
          listItem.textContent = "Log more cigarettes to see insights about your smoking habits"

          insightsList.appendChild(listItem)
        }
      } catch (error) {
        console.error("Error loading profile stats:", error)
        showError("Failed to load profile stats. Please try again later.")
      }
    }

    // Load cigarette history
    async function loadCigaretteHistory() {
      try {
        // Get all cigarette logs with a limit of 20
        const logs = await window.dataService.getUserCigaretteLogs(currentUserId, 20)

        // Get user profile for cigarette brand
        const profile = await window.dataService.getUserProfile(currentUserId)

        // Clear existing history
        const historyTab = document.getElementById("history-tab")
        historyTab.innerHTML = ""

        // Add cigarettes to history
        logs.forEach((log) => {
          const date = new Date(log.created_at)
          const relativeDate = window.dataService.formatRelativeDate(date)
          const timeString = window.dataService.formatDate(date)

          // Create icon element - either photo or emoji
          let iconHtml = "🚬"

          // If there's a photo URL, use it instead of the emoji
          if (log.pic_url) {
            iconHtml = `
          <div style="width: 40px; height: 40px; min-width: 40px; overflow: hidden; border-radius: 5px;">
            <img src="${log.pic_url}" 
                 alt="Cigarette Photo" 
                 style="width: 100%; height: 100%; object-fit: cover;"
                 onerror="this.parentNode.innerHTML='🚬'">
          </div>
        `
          }

          const item = document.createElement("div")
          item.className = "recent-item"
          item.style.alignItems = "flex-start"
          item.style.marginBottom = "10px"
          item.innerHTML = `
        <div class="recent-info" style="flex: 1; min-width: 0;">
            <div class="recent-brand">${profile.cigarette_brand || "Cigarette"}</div>
            <div class="recent-meta" style="word-wrap: break-word;">${relativeDate}, ${timeString} • ${log.notes || ""}</div>
        </div>
        <div style="flex-shrink: 0;">${iconHtml}</div>
      `

          historyTab.appendChild(item)
        })

        // Add load more button if there are exactly 20 logs (indicating there might be more)
        if (logs.length === 20) {
          const loadMoreBtn = document.createElement("button")
          loadMoreBtn.className = "btn btn-block"
          loadMoreBtn.style.marginTop = "20px"
          loadMoreBtn.textContent = "Load More"
          loadMoreBtn.addEventListener("click", () => loadMoreHistorySimple(20))

          historyTab.appendChild(loadMoreBtn)
        }

        // If no logs, show message
        if (logs.length === 0) {
          const message = document.createElement("div")
          message.style.textAlign = "center"
          message.style.padding = "20px"
          message.style.color = "#ccc"
          message.textContent = "No cigarettes logged yet"

          historyTab.appendChild(message)
        }

        historyTab.setAttribute("data-loaded", "true")
      } catch (error) {
        console.error("Error loading cigarette history:", error)
        showError("Failed to load cigarette history. Please try again later.")
      }
    }

    // Load more history (simplified version)
    async function loadMoreHistorySimple(currentCount) {
      try {
        // Get next batch of cigarette logs
        const logs = await window.dataService.getUserCigaretteLogs(currentUserId, currentCount + 20)

        // Get only the new logs (skip the ones we already have)
        const newLogs = logs.slice(currentCount)

        // Get user profile for cigarette brand
        const profile = await window.dataService.getUserProfile(currentUserId)

        // Get history tab
        const historyTab = document.getElementById("history-tab")

        // Remove load more button
        const loadMoreBtn = historyTab.querySelector(".btn")
        if (loadMoreBtn) {
          historyTab.removeChild(loadMoreBtn)
        }

        // Add new cigarettes to history
        newLogs.forEach((log) => {
          const date = new Date(log.created_at)
          const relativeDate = window.dataService.formatRelativeDate(date)
          const timeString = window.dataService.formatDate(date)

          // Create icon element - either photo or emoji
          let iconHtml = "🚬"

          // If there's a photo URL, use it instead of the emoji
          if (log.pic_url) {
            iconHtml = `
          <div style="width: 40px; height: 40px; min-width: 40px; overflow: hidden; border-radius: 5px;">
            <img src="${log.pic_url}" 
                 alt="Cigarette Photo" 
                 style="width: 100%; height: 100%; object-fit: cover;"
                 onerror="this.parentNode.innerHTML='🚬'">
          </div>
        `
          }

          const item = document.createElement("div")
          item.className = "recent-item"
          item.style.alignItems = "flex-start"
          item.style.marginBottom = "10px"
          item.innerHTML = `
        <div class="recent-info" style="flex: 1; min-width: 0;">
            <div class="recent-brand">${profile.cigarette_brand || "Cigarette"}</div>
            <div class="recent-meta" style="word-wrap: break-word;">${relativeDate}, ${timeString} • ${log.notes || ""}</div>
        </div>
        <div style="flex-shrink: 0;">${iconHtml}</div>
      `

          historyTab.appendChild(item)
        })

        // Add load more button if there are more logs
        if (logs.length === currentCount + 20) {
          const newLoadMoreBtn = document.createElement("button")
          newLoadMoreBtn.className = "btn btn-block"
          newLoadMoreBtn.style.marginTop = "20px"
          newLoadMoreBtn.textContent = "Load More"
          newLoadMoreBtn.addEventListener("click", () => loadMoreHistorySimple(currentCount + 20))

          historyTab.appendChild(newLoadMoreBtn)
        }
      } catch (error) {
        console.error("Error loading more history:", error)
        showError("Failed to load more history. Please try again later.")
      }
    }

    // Initialize event listeners
    function initEventListeners() {
      // Log cigarette form
      document.querySelector("#log-modal form").addEventListener("submit", async (event) => {
        event.preventDefault()

        // Don't hide modal immediately - we'll do it after upload completes
        try {
          showLoading(true)

          // Get form values
          const brand = document.querySelector('#log-modal input[type="text"]').value
          const notes = document.querySelector("#log-modal textarea").value

          // Update user's cigarette brand if it's different
          const profile = await window.dataService.getUserProfile(currentUserId)
          if (brand && brand !== profile.cigarette_brand) {
            await window.dataService.setCigaretteBrand(currentUserId, brand)
          }

          // Get the selected photo from cigarettePhotoUpload
          let photoUrl = null
          if (window.cigarettePhotoUpload && window.cigarettePhotoUpload.getSelectedPhoto()) {
            try {
              // Upload the photo to ImageKit
              photoUrl = await window.cigarettePhotoUpload.uploadPhoto(window.cigarettePhotoUpload.getSelectedPhoto())
              console.log("Photo uploaded successfully:", photoUrl)
            } catch (uploadError) {
              console.error("Error uploading photo:", uploadError)
              // Continue without photo if upload fails
            }
          }

          // Log cigarette with photo URL
          await window.dataService.addCigaretteSmoked(currentUserId, notes, photoUrl)

          // Reset photo upload
          if (window.cigarettePhotoUpload && window.cigarettePhotoUpload.reset) {
            window.cigarettePhotoUpload.reset()
          }

          // Update UI
          await loadHomeScreenData()

          // Update last cigarette time
          lastCigaretteTime = new Date()
          updateSmokeFreeDuration()

          // Hide modal after everything is done
          window.hideModal("log-modal")

          // Show success message
          showToast("Cigarette logged successfully!")
        } catch (error) {
          console.error("Error logging cigarette:", error)
          showToast("Failed to log cigarette. Please try again later.", "error")

          // Hide modal on error too
          window.hideModal("log-modal")
        } finally {
          showLoading(false)
        }
      })

      // Create group form
      document.querySelector("#create-group-modal form").addEventListener("submit", async (event) => {
        event.preventDefault()

        // Hide modal immediately when button is pressed
        window.hideModal("create-group-modal")

        try {
          // Get form values
          const name = document.querySelector('#create-group-modal input[type="text"]').value
          const description = document.querySelector("#create-group-modal textarea").value

          // Create group
          await window.dataService.createGroup(currentUserId, name, description)

          // Update UI
          await loadGroups()

          // Show success message
          showToast("Group created successfully!")
        } catch (error) {
          console.error("Error creating group:", error)
          showToast("Failed to create group. Please try again later.", "error")
        }
      })

      // Join group form
      document.querySelector("#join-group-modal form").addEventListener("submit", async (event) => {
        event.preventDefault()

        try {
          // Get form values
          const code = document.querySelector("#group-code-input").value.trim().toUpperCase()

          // Join group
          const groupId = await window.dataService.joinGroupWithCode(currentUserId, code)

          // Get group details
          const group = await window.dataService.getGroupById(groupId)

          // Update UI
          await loadGroups()

          // Show success message
          document.getElementById("joined-group-name").textContent = group.name
          document.getElementById("join-success-message").style.display = "flex"

          // Hide modal after delay
          setTimeout(() => {
            window.hideModal("join-group-modal")

            // Show group details
            showGroupDetails(groupId)
          }, 2000)
        } catch (error) {
          console.error("Error joining group:", error)
          showToast("Failed to join group: " + error.message, "error")
        }
      })

      // Leave group button
      document.querySelector(".group-actions .btn").addEventListener("click", async () => {
        try {
          // Get group ID
          const groupId = document.getElementById("group-details-screen").getAttribute("data-group-id")

          // Get group name
          const groupName = document.getElementById("group-details-name").textContent

          // Confirm leave
          if (confirm(`Are you sure you want to leave the "${groupName}" group?`)) {
            // Leave group
            await window.dataService.leaveGroup(currentUserId, groupId)

            // Update UI
            await loadGroups()

            // Show groups screen
            window.showScreen("groups-screen")

            // Show success message
            showToast(`You have left the "${groupName}" group.`)
          }
        } catch (error) {
          console.error("Error leaving group:", error)
          showToast("Failed to leave group. Please try again later.", "error")
        }
      })

      // Settings form
      document.querySelector("#settings-tab form").addEventListener("submit", async (event) => {
        event.preventDefault()

        try {
          // Get form values
          const username = document.querySelector('#settings-tab input[type="text"]').value
          //const email = document.querySelector('#settings-tab input[type="email"]').value;
          const brand = document.querySelector('#settings-tab input[placeholder="Cigarette Brand"]').value
          const priceStr = document.querySelector('#settings-tab input[placeholder="Price per Pack"]').value
          const cigsPerPack = Number.parseInt(document.querySelector('#settings-tab input[type="number"]').value)

          // Parse price (remove $ and convert to number)
          const price = Number.parseFloat(priceStr.replace("$", ""))

          // Get current profile
          const profile = await window.dataService.getUserProfile(currentUserId)

          // Update profile if values changed
          if (username !== profile.username) {
            await window.dataService.setUsername(currentUserId, username)
          }

          //if (email !== profile.email) {
          //  await dataService.setEmail(currentUserId, email);
          //}

          if (brand !== profile.cigarette_brand) {
            await window.dataService.setCigaretteBrand(currentUserId, brand)
          }

          if (price !== profile.price_per_pack) {
            await window.dataService.setPricePerPack(currentUserId, price)
          }

          if (cigsPerPack !== profile.cigs_per_pack) {
            await window.dataService.setCigsPerPack(currentUserId, cigsPerPack)
          }

          // Update UI
          await loadUserData()
          await loadHomeScreenData()

          // Show success message
          showToast("Settings saved successfully!")
        } catch (error) {
          console.error("Error saving settings:", error)
          showToast("Failed to save settings. Please try again later.", "error")
        }
      })

      // Logout button
      document.querySelector("#settings-tab .btn-outline").addEventListener("click", async () => {
        try {
          // Sign out
          await supabase.auth.signOut()

          // Redirect to login page
          window.location.href = "login.html"
        } catch (error) {
          console.error("Error logging out:", error)
          showToast("Failed to log out. Please try again later.", "error")
        }
      })

      // Add event listener for the history tab
      const historyTabButton = document.querySelectorAll("#profile-screen .tab")[1]
      if (historyTabButton) {
        historyTabButton.addEventListener("click", () => {
          const historyTab = document.getElementById("history-tab")
          if (historyTab && historyTab.getAttribute("data-loaded") !== "true") {
            loadCigaretteHistory()
          }
        })
      }
    }

    // Update smoke-free duration
    function updateSmokeFreeDuration() {
      const timerEl = document.getElementById("smoke-free-timer")
      if (!timerEl) return // Exit if element not found

      if (!lastCigaretteTime) {
        timerEl.textContent = "No cigarettes logged"
        return
      }

      try {
        const now = new Date()
        const lastCigDate = new Date(lastCigaretteTime)

        // Check if date is valid
        if (isNaN(lastCigDate.getTime())) {
          console.error("Invalid lastCigaretteTime:", lastCigaretteTime)
          timerEl.textContent = "No cigarettes logged"
          return
        }

        const diffMs = now - lastCigDate

        // Convert to hours and minutes
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

        // Update the timer display
        timerEl.textContent = `${diffHrs}h ${diffMins}m`

        // Update every minute
        setTimeout(updateSmokeFreeDuration, 60000)
      } catch (error) {
        console.error("Error updating smoke-free timer:", error)
        timerEl.textContent = "Error calculating time"
      }
    }

    // Show loading state
    function showLoading(isLoading) {
      const loadingOverlay = document.getElementById("loading-overlay")
      if (loadingOverlay) {
        loadingOverlay.style.display = isLoading ? "flex" : "none"
      }
    }

    // Show error message
    function showError(message) {
      showToast(message, "error")
    }

    // Start the app
    initApp()
  } catch (error) {
    console.error("Fatal error:", error)
    alert("Critical application error")
  }
})

// Update the getGroupScoreboard function in dataService to include avatar_url
window.dataService.getGroupScoreboard = async (groupId) => {
  const { data: members, error: membersError } = await window.supabase
    .from("group_members")
    .select(`user_id, profiles (id, username, avatar_url)`)
    .eq("group_id", groupId)

  if (membersError) throw membersError

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const scoreboard = await Promise.all(
    members.map(async (member) => {
      const { data, error } = await window.supabase
        .from("cigarette_logs")
        .select("*", { count: "exact" })
        .eq("user_id", member.user_id)
        .gte("created_at", weekStart.toISOString())

      if (error) throw error

      return {
        userId: member.user_id,
        username: member.profiles.username,
        avatarUrl: member.profiles.avatar_url,
        count: data.length,
      }
    }),
  )

  return scoreboard.sort((a, b) => a.count - b.count)
}

// Add this function to ensure the log cigarette modal is properly initialized
function ensureLogModalInitialized() {
  // Check if the modal elements exist
  const logModal = document.getElementById("log-modal")
  const photoUploadArea = document.getElementById("cigarette-photo-upload")
  const photoInput = document.getElementById("cigarette-photo-input")

  if (!logModal || !photoUploadArea || !photoInput) {
    console.error("Log modal elements not found, cannot initialize")
    return false
  }

  // Initialize cigarette photo upload if it exists but hasn't been initialized
  if (window.cigarettePhotoUpload && typeof window.cigarettePhotoUpload.init === "function") {
    window.cigarettePhotoUpload.init()
    console.log("Cigarette photo upload initialized from ensureLogModalInitialized")
  }

  return true
}

// Modify the showModal function to ensure initialization when opening the log modal
if (typeof window.showModal !== "function") {
  window.showModal = (modalId) => {
    const modal = document.getElementById(modalId)
    if (modal) {
      // If opening the log modal, ensure it's initialized first
      if (modalId === "log-modal") {
        if (!ensureLogModalInitialized()) {
          console.error("Cannot open log modal - required elements not found")
          //showToast("App is still initializing. Please try again in a moment.", "error")
          return
        }
      }

      modal.style.display = "flex"
    }
  }
}

// Add this function at the end of the file, outside any other functions
// Ensure we have a hideModal function if it doesn't exist
if (typeof window.hideModal !== "function") {
  window.hideModal = (modalId) => {
    const modal = document.getElementById(modalId)
    if (modal) {
      modal.style.display = "none"
    }
  }
}

// Ensure we have a showModal function if it doesn't exist
if (typeof window.showModal !== "function") {
  window.showModal = (modalId) => {
    const modal = document.getElementById(modalId)
    if (modal) {
      modal.style.display = "flex"
    }
  }
}