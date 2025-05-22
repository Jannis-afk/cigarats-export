// Avatar upload functionality using ImageKit
;(() => {
  // Import ImageKitClient
  const ImageKitClient = window.ImageKitClient

  // Initialize ImageKit with your public key
  const imagekit = new ImageKitClient({
    publicKey: "public_8RWXmk++FmJDvd1lMrknFMl95Mg=",
    urlEndpoint: "https://ik.imagekit.io/cigarats",
    authenticationEndpoint: "/auth-imagekit", // We'll create this endpoint
  })

  // DOM elements
  let avatarElement = null
  let fileInput = null

  // Declare showLoading, showSuccess, and showError functions
  function showLoading(isLoading) {
    const loadingElement = document.querySelector(".loading")
    if (loadingElement) {
      loadingElement.style.display = isLoading ? "block" : "none"
    }
  }

  function showSuccess(message) {
    const successElement = document.querySelector(".success")
    if (successElement) {
      successElement.textContent = message
      successElement.style.display = "block"
      setTimeout(() => {
        successElement.style.display = "none"
      }, 3000)
    }
  }

  function showError(message) {
    const errorElement = document.querySelector(".error")
    if (errorElement) {
      errorElement.textContent = message
      errorElement.style.display = "block"
      setTimeout(() => {
        errorElement.style.display = "none"
      }, 3000)
    }
  }

  // Initialize avatar upload functionality
  function initAvatarUpload() {
    // Find the avatar element in the profile section
    avatarElement = document.querySelector(".profile-avatar")

    if (!avatarElement) {
      console.error("Avatar element not found")
      return
    }

    // Make the avatar clickable
    avatarElement.style.cursor = "pointer"

    // Create a file input element
    fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.accept = "image/*"
    fileInput.style.display = "none"
    document.body.appendChild(fileInput)

    // Add click event to avatar
    avatarElement.addEventListener("click", () => {
      fileInput.click()
    })

    // Add change event to file input
    fileInput.addEventListener("change", handleFileSelection)

    // Add a tooltip to indicate the avatar is clickable
    const tooltip = document.createElement("div")
    tooltip.textContent = "Tap to change avatar"
    tooltip.style.position = "absolute"
    tooltip.style.backgroundColor = "rgba(0, 0, 0, 0.7)"
    tooltip.style.color = "white"
    tooltip.style.padding = "5px 10px"
    tooltip.style.borderRadius = "5px"
    tooltip.style.fontSize = "12px"
    tooltip.style.opacity = "0"
    tooltip.style.transition = "opacity 0.3s"
    tooltip.style.pointerEvents = "none"
    tooltip.style.zIndex = "1000"

    avatarElement.style.position = "relative"
    avatarElement.appendChild(tooltip)

    avatarElement.addEventListener("mouseenter", () => {
      tooltip.style.opacity = "1"
    })

    avatarElement.addEventListener("mouseleave", () => {
      tooltip.style.opacity = "0"
    })
  }

  // Handle file selection
  async function handleFileSelection(event) {
    const file = event.target.files[0]
    if (!file) return

    try {
      // Show loading state
      showLoading(true)

      // Upload the file to ImageKit
      const result = await uploadFileToImageKit(file)

      // Update the avatar in Supabase
      await updateUserAvatar(result.url)

      // Update the avatar in the UI
      updateAvatarUI(result.url)

      // Show success message
      showSuccess("Avatar updated successfully!")
    } catch (error) {
      console.error("Error uploading avatar:", error)
      showError("Failed to upload avatar. Please try again later.")
    } finally {
      // Hide loading state
      showLoading(false)
    }
  }

  // Upload file to ImageKit
  async function uploadFileToImageKit(file) {
    return new Promise((resolve, reject) => {
      const userId = window.dataService.getCurrentUserId()
      const fileName = `avatar_${userId}_${Date.now()}`

      imagekit.upload(
        {
          file: file,
          fileName: fileName,
          folder: "/avatars",
          useUniqueFileName: true,
          tags: ["avatar", "user"],
          responseFields: ["url", "fileId", "name"],
          isPrivateFile: false,
        },
        (err, result) => {
          if (err) {
            reject(err)
          } else {
            resolve(result)
          }
        },
      )
    })
  }

  // Update user avatar in Supabase
  async function updateUserAvatar(avatarUrl) {
    try {
      const userId = await window.dataService.getCurrentUserId()
      await window.dataService.setAvatarUrl(userId, avatarUrl)
    } catch (error) {
      console.error("Error updating avatar in database:", error)
      throw error
    }
  }

  // Update avatar in UI
  function updateAvatarUI(avatarUrl) {
    // Update all avatar instances in the UI
    const avatars = document.querySelectorAll(".profile-avatar")
    avatars.forEach((avatar) => {
      const img = avatar.querySelector("img") || document.createElement("img")
      img.src = avatarUrl
      img.alt = "User Avatar"
      img.style.width = "100%"
      img.style.height = "100%"
      img.style.borderRadius = "50%"
      img.style.objectFit = "cover"

      if (!avatar.contains(img)) {
        avatar.innerHTML = ""
        avatar.appendChild(img)
      }
    })
  }

  // Initialize when DOM is loaded
  document.addEventListener("DOMContentLoaded", initAvatarUpload)

  // Also initialize when profile screen is shown
  const originalShowScreen = window.showScreen
  window.showScreen = (screenId) => {
    originalShowScreen(screenId)
    if (screenId === "profile-screen") {
      setTimeout(initAvatarUpload, 100)
    }
  }
})()
