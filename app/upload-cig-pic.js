// Cigarette photo upload functionality for CigaRats
;(() => {
  // Configuration
  const IMAGEKIT_PUBLIC_KEY = "public_8RWXmk++FmJDvd1lMrknFMl95Mg="
  const IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/cigarats"

  // Image dimensions
  const IMAGE_SIZE = 192

  // DOM elements
  let photoUploadArea = null
  let photoInput = null
  let selectedPhoto = null
  let currentUserId = null

  // Initialize cigarette photo upload functionality
  async function initCigarettePhotoUpload() {
    try {
      // Get current user ID
      const {
        data: { user },
        error,
      } = await window.supabase.auth.getUser()
      if (error) throw error
      if (!user) return

      currentUserId = user.id

      // Find photo upload elements
      photoUploadArea = document.getElementById("cigarette-photo-upload")
      photoInput = document.getElementById("cigarette-photo-input")

      if (!photoUploadArea || !photoInput) {
        console.log("Cigarette photo upload elements not found")
        return
      }

      // Make photo upload area clickable
      photoUploadArea.addEventListener("click", () => {
        photoInput.click()
      })

      // Add change event to photo input
      photoInput.addEventListener("change", handlePhotoSelection)

      console.log("Cigarette photo upload initialized")
    } catch (error) {
      console.error("Error initializing cigarette photo upload:", error)
    }
  }

  // Handle photo selection
  function handlePhotoSelection(event) {
    const file = event.target.files[0]
    if (!file) return

    // Store the selected photo
    selectedPhoto = file

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => {
      photoUploadArea.innerHTML = `
        <div style="width: 100px; height: 100px; margin: 0 auto; overflow: hidden;">
          <img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;" alt="Preview">
        </div>
        <div class="photo-text" style="margin-top: 10px;">Photo selected</div>
      `
    }
    reader.readAsDataURL(file)
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

    return `cig_${currentUserId}_${uuid}_${Date.now()}`
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
    console.log("Fresh auth data received for cigarette photo:", authData)

    if (!authData.token || !authData.signature || !authData.expire) {
      throw new Error("Invalid authentication data received from server")
    }

    return authData
  }

  // Upload photo to ImageKit
  async function uploadCigarettePhoto(file) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!file) {
          resolve(null) // No photo to upload
          return
        }

        // Resize and crop image before upload
        const processedFile = await resizeAndCropImage(file)

        // Get fresh auth parameters
        const authData = await getAuthParams()

        // Create FormData for the upload
        const formData = new FormData()
        formData.append("file", processedFile)
        formData.append("publicKey", IMAGEKIT_PUBLIC_KEY)

        // Use a unique filename with UUID to prevent collisions
        const uniqueFilename = generateUniqueFilename()
        formData.append("fileName", uniqueFilename)

        formData.append("useUniqueFileName", "true")
        formData.append("folder", "/cigs") // Save in cigs folder

        // Add authentication parameters
        formData.append("token", authData.token)
        formData.append("expire", authData.expire)
        formData.append("signature", authData.signature)

        // Upload to ImageKit API
        const uploadResponse = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
          method: "POST",
          body: formData,
        })

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text()
          throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`)
        }

        const result = await uploadResponse.json()
        console.log("Cigarette photo upload successful:", result)

        if (result.url) {
          resolve(result.url)
        } else {
          throw new Error("No URL in upload response")
        }
      } catch (error) {
        console.error("Error uploading cigarette photo:", error)
        reject(error)
      }
    })
  }

  // Reset photo upload area
  function resetPhotoUpload() {
    if (photoUploadArea) {
      photoUploadArea.innerHTML = `
        <div class="photo-icon">📸</div>
        <div class="photo-text">Take a photo or upload from gallery</div>
      `
    }
    if (photoInput) {
      photoInput.value = ""
    }
    selectedPhoto = null
  }

  // Initialize when DOM is loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCigarettePhotoUpload)
  } else {
    initCigarettePhotoUpload()
  }

  // Expose functions for use in other scripts
  window.cigarettePhotoUpload = {
    init: initCigarettePhotoUpload,
    getSelectedPhoto: () => selectedPhoto,
    uploadPhoto: uploadCigarettePhoto,
    reset: resetPhotoUpload,
  }
})()
