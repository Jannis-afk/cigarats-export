// Avatar upload functionality for CigaRats
;(() => {
  // Configuration
  const SUPABASE_URL = "https://unbjsogmvwzfjitccfft.supabase.co"
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmpzb2dtdnd6ZmppdGNjZmZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NzU1NjgsImV4cCI6MjA2MzI1MTU2OH0.JQX-4mJ_IEtS-CGwYIGEcVsFLWeQjO1PQSm9jhbi-0Y"
  const IMAGEKIT_PUBLIC_KEY = "public_8RWXmk++FmJDvd1lMrknFMl95Mg="
  const IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/cigarats"

  // Image dimensions
  const IMAGE_SIZE = 192

  // Import Supabase client
  const { createClient } = window.supabase

  // Initialize Supabase client if not already initialized
  if (!window.supabase) {
    window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }

  // DOM elements
  let avatarElements = []
  let fileInput = null
  let currentUserId = null
  let authCache = null
  let lastAuthTime = 0

  // Initialize avatar upload functionality
  async function initAvatarUpload() {
    try {
      // Get current user ID
      const {
        data: { user },
        error,
      } = await window.supabase.auth.getUser()
      if (error) throw error
      if (!user) return

      currentUserId = user.id

      // Find all avatar elements
      avatarElements = document.querySelectorAll(".profile-avatar")

      if (avatarElements.length === 0) {
        console.log("Avatar elements not found, will try again later")
        return
      }

      // Create file input if it doesn't exist
      if (!fileInput) {
        fileInput = document.createElement("input")
        fileInput.type = "file"
        fileInput.accept = "image/*"
        fileInput.style.display = "none"
        document.body.appendChild(fileInput)

        // Add change event to file input
        fileInput.addEventListener("change", handleFileSelection)
      }

      // Make avatars clickable
      avatarElements.forEach((avatar) => {
        // Skip if already initialized
        if (avatar.dataset.initialized) return

        // Mark as initialized
        avatar.dataset.initialized = "true"

        // Add click event
        avatar.style.cursor = "pointer"
        avatar.addEventListener("click", () => {
          fileInput.click()
        })

        // Add overlay if it doesn't exist
        if (!avatar.querySelector(".avatar-overlay")) {
          const overlay = document.createElement("div")
          overlay.className = "avatar-overlay"
          overlay.innerHTML = "<span>Change</span>"
          avatar.appendChild(overlay)
        }
      })

      // Load current avatar
      await loadCurrentAvatar()
    } catch (error) {
      console.error("Error initializing avatar upload:", error)
    }
  }

  // Load current avatar from Supabase
  async function loadCurrentAvatar() {
    try {
      if (!currentUserId) return

      const { data, error } = await window.supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", currentUserId)
        .single()

      if (error) throw error

      if (data && data.avatar_url) {
        updateAvatarUI(data.avatar_url)
      }
    } catch (error) {
      console.error("Error loading avatar:", error)
    }
  }

  // Handle file selection
  async function handleFileSelection(event) {
    const file = event.target.files[0]
    if (!file) return

    try {
      // Show loading state
      showLoading(true)

      // Resize and crop image before upload
      const processedFile = await resizeAndCropImage(file)

      // Upload file to ImageKit
      const imageKitUrl = await uploadToImageKit(processedFile)

      // Update avatar in database
      await updateUserAvatar(imageKitUrl)

      // Update UI
      updateAvatarUI(imageKitUrl)

      // Show success message
      showToast("Avatar updated successfully!")
    } catch (error) {
      console.error("Error uploading avatar:", error)
      showToast("Failed to upload avatar. Please try again.", "error")
    } finally {
      // Hide loading state
      showLoading(false)

      // Reset file input
      event.target.value = ""
    }
  }

  // Resize and crop image to 192x192
  async function resizeAndCropImage(file) {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image()
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        // Set canvas size to our target dimensions
        canvas.width = IMAGE_SIZE
        canvas.height = IMAGE_SIZE

        img.onload = () => {
          // Calculate dimensions for center crop
          let sourceX = 0
          let sourceY = 0
          let sourceWidth = img.width
          let sourceHeight = img.height

          // If image is wider than tall, crop the sides
          if (img.width > img.height) {
            sourceWidth = img.height
            sourceX = (img.width - img.height) / 2
          }
          // If image is taller than wide, crop the top and bottom
          else if (img.height > img.width) {
            sourceHeight = img.width
            sourceY = (img.height - img.width) / 2
          }

          // Draw the cropped image on the canvas
          ctx.drawImage(
            img,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight, // Source rectangle
            0,
            0,
            IMAGE_SIZE,
            IMAGE_SIZE, // Destination rectangle
          )

          // Convert canvas to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Canvas to Blob conversion failed"))
                return
              }

              // Create a new file from the blob
              const resizedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              })

              resolve(resizedFile)
            },
            "image/jpeg",
            0.9,
          ) // JPEG at 90% quality
        }

        img.onerror = () => {
          reject(new Error("Failed to load image"))
        }

        // Load image from file
        img.src = URL.createObjectURL(file)
      } catch (error) {
        console.error("Error resizing image:", error)
        reject(error)
      }
    })
  }

  // Generate a unique filename with UUID-like string
  function generateUniqueFilename() {
    // Generate a UUID v4-like string
    const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === "x" ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })

    return `avatar_${currentUserId}_${uuid}_${Date.now()}`
  }

  // Get fresh authentication parameters
  async function getAuthParams() {
    // Generate a unique nonce
    const nonce = Math.random().toString(36).substring(2, 15) + Date.now().toString(36)

    // Get authentication parameters from server
    const response = await fetch(`/auth-imagekit?nonce=${nonce}`)
    if (!response.ok) {
      throw new Error(`Auth endpoint error: ${response.status} ${response.statusText}`)
    }

    const authData = await response.json()
    console.log("Fresh auth data received:", authData)

    if (!authData.token || !authData.signature || !authData.expire) {
      throw new Error("Invalid authentication data received from server")
    }

    // Cache the auth data and timestamp
    authCache = authData
    lastAuthTime = Date.now()

    return authData
  }

  // Upload file to ImageKit
  async function uploadToImageKit(file) {
    return new Promise(async (resolve, reject) => {
      try {
        // Always get fresh auth parameters for each upload
        const authData = await getAuthParams()

        // Create FormData for the upload
        const formData = new FormData()
        formData.append("file", file)
        formData.append("publicKey", IMAGEKIT_PUBLIC_KEY)

        // Use a unique filename with UUID to prevent collisions
        const uniqueFilename = generateUniqueFilename()
        formData.append("fileName", uniqueFilename)

        formData.append("useUniqueFileName", "true")
        formData.append("folder", "/avatars")

        // Add authentication parameters
        formData.append("token", authData.token)
        formData.append("expire", authData.expire)
        formData.append("signature", authData.signature)

        // Upload to ImageKit API directly
        const uploadResponse = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
          method: "POST",
          body: formData,
        })

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text()
          throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`)
        }

        const result = await uploadResponse.json()
        console.log("Upload successful:", result)

        if (result.url) {
          resolve(result.url)
        } else {
          throw new Error("No URL in upload response")
        }
      } catch (error) {
        console.error("Error in uploadToImageKit:", error)
        reject(error)
      }
    })
  }

  // Update user avatar in database
  async function updateUserAvatar(avatarUrl) {
    const { error } = await window.supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", currentUserId)

    if (error) throw error
  }

  // Update avatar in UI
  function updateAvatarUI(avatarUrl) {
    avatarElements.forEach((avatar) => {
      let img = avatar.querySelector("img")

      if (!img) {
        img = document.createElement("img")
        img.alt = "User Avatar"
        img.style.width = "100%"
        img.style.height = "100%"
        img.style.borderRadius = "50%"
        img.style.objectFit = "cover"

        // Clear avatar content and append image
        avatar.innerHTML = ""
        avatar.appendChild(img)

        // Re-add overlay
        const overlay = document.createElement("div")
        overlay.className = "avatar-overlay"
        overlay.innerHTML = "<span>Change</span>"
        avatar.appendChild(overlay)
      }

      // Set image source
      img.src = avatarUrl
    })

    // Also update scoreboard and member avatars if they exist
    updateGroupAvatars(avatarUrl)
  }

  // Update avatars in group sections
  function updateGroupAvatars(avatarUrl) {
    // Update scoreboard avatars
    const scoreboardAvatars = document.querySelectorAll(".scoreboard-avatar")
    scoreboardAvatars.forEach((avatar) => {
      // Only update current user's avatar
      const scoreboardItem = avatar.closest(".scoreboard-item")
      const nameElement = scoreboardItem?.querySelector(".scoreboard-name")
      if (nameElement && nameElement.textContent === "You") {
        let img = avatar.querySelector("img")
        if (!img) {
          img = document.createElement("img")
          img.alt = "User Avatar"
          avatar.appendChild(img)
        }
        img.src = avatarUrl
      }
    })

    // Update member avatars
    const memberAvatars = document.querySelectorAll(".member-avatar")
    memberAvatars.forEach((avatar) => {
      // Only update current user's avatar
      const memberItem = avatar.closest(".member-item")
      const nameElement = memberItem?.querySelector(".member-name")
      if (nameElement && nameElement.textContent === "You") {
        let img = avatar.querySelector("img")
        if (!img) {
          img = document.createElement("img")
          img.alt = "User Avatar"
          avatar.appendChild(img)
        }
        img.src = avatarUrl
      }
    })
  }

  // Show loading state
  function showLoading(isLoading) {
    const loadingOverlay = document.getElementById("loading-overlay")
    if (loadingOverlay) {
      loadingOverlay.style.display = isLoading ? "flex" : "none"
    }
  }

  // Show toast message
  function showToast(message, type = "success") {
    if (window.showToast) {
      window.showToast(message, type)
    } else {
      // Fallback if global showToast is not available
      alert(message)
    }
  }

  // Initialize when DOM is loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAvatarUpload)
  } else {
    initAvatarUpload()
  }

  // Re-initialize when screens change
  const originalShowScreen = window.showScreen
  if (originalShowScreen) {
    window.showScreen = (screenId) => {
      originalShowScreen(screenId)
      if (screenId === "profile-screen") {
        setTimeout(initAvatarUpload, 100)
      }
    }
  }

  // Set up a mutation observer to detect when the avatar elements are added to the DOM
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length) {
        const hasProfileAvatar = Array.from(mutation.addedNodes).some((node) => {
          return (
            node.nodeType === 1 &&
            (node.classList?.contains("profile-avatar") || node.querySelector?.(".profile-avatar"))
          )
        })

        if (hasProfileAvatar) {
          initAvatarUpload()
        }
      }
    }
  })

  // Start observing the document body
  observer.observe(document.body, { childList: true, subtree: true })

  // Expose functions for testing
  window.avatarUpload = {
    init: initAvatarUpload,
    update: updateAvatarUI,
  }
})()
