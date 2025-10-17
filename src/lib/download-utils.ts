/**
 * Download utility functions for automatic file downloads with progress tracking
 */

export interface DownloadProgress {
  loaded: number
  total: number
  percentage: number
}

/**
 * Downloads a file from URL with progress tracking
 * @param url - The URL to download from
 * @param filename - The filename for the downloaded file
 * @param onProgress - Optional callback for progress updates
 * @returns Promise that resolves when download is complete
 */
export async function downloadFile(
  url: string,
  filename: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
  try {
    console.log(`[Download] Starting download: ${filename}`)
    console.log(`[Download] Original URL: ${url}`)
    
    // Use proxy API to avoid CORS issues
    const proxyUrl = `/api/proxy-download?url=${encodeURIComponent(url)}`
    console.log(`[Download] Proxy URL: ${proxyUrl}`)
    
    // Start the download through proxy
    const response = await fetch(proxyUrl)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Download] Proxy error: ${response.status} ${response.statusText}`)
      throw new Error(`Download failed: ${response.status} ${response.statusText} - ${errorText}`)
    }
    
    // Get content length from response headers
    const contentLength = response.headers.get('content-length')
    const total = contentLength ? parseInt(contentLength, 10) : 0
    
    console.log(`[Download] Content-Length: ${total} bytes`)
    
    // Check if we can read the response body
    if (!response.body) {
      throw new Error('Response body is not available')
    }
    
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let loaded = 0
    
    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        chunks.push(value)
        loaded += value.length
        
        // Update progress if callback provided
        if (onProgress) {
          const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0
          onProgress({
            loaded,
            total,
            percentage
          })
        }
      }
      
      // Create blob from chunks
      const blob = new Blob(chunks)
      
      // Create download link and trigger download
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      link.style.display = 'none'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up the object URL
      URL.revokeObjectURL(downloadUrl)
      
      console.log(`[Download] Successfully downloaded: ${filename} (${loaded} bytes)`)
      
    } finally {
      reader.releaseLock()
    }
    
  } catch (error) {
    console.error(`[Download] Error downloading ${filename}:`, error)
    
    // Check if it's a network error and fallback to window.open
    if (error instanceof TypeError && (
      error.message.includes('Failed to fetch') || 
      error.message.includes('NetworkError') ||
      error.message.includes('proxy error')
    )) {
      console.log(`[Download] Network/Proxy error detected, falling back to window.open for: ${filename}`)
      // Fallback to opening in new tab
      window.open(url, '_blank')
      return
    }
    
    // Re-throw other errors
    throw error
  }
}

/**
 * Sanitizes a filename by removing invalid characters
 * @param filename - The filename to sanitize
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove or replace invalid characters for filenames
  return filename
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()
    .substring(0, 200) // Limit length to prevent issues
}

/**
 * Generates a filename from video title and format
 * @param title - Video title
 * @param format - File format (mp4, mp3, etc.)
 * @returns Generated filename
 */
export function generateFilename(title: string, format: string): string {
  const sanitizedTitle = sanitizeFilename(title)
  const extension = format.toLowerCase()
  return `${sanitizedTitle}.${extension}`
}

/**
 * Formats file size in human readable format
 * @param bytes - File size in bytes
 * @returns Formatted size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}


