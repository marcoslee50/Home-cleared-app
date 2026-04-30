// Photo storage using Vercel Blob
// Handles before/after photo upload, retrieval, and deletion
// Photos keyed by: jobDate/clientName/before|after/timestamp.jpg

export interface JobPhoto {
  url: string
  blobUrl: string
  type: 'before' | 'after'
  clientName: string
  jobDate: string
  uploadedAt: string
  size: number
}

export interface JobPhotoSet {
  jobId: string
  clientName: string
  jobDate: string
  before: JobPhoto[]
  after: JobPhoto[]
}

// -- Upload a photo to Vercel Blob --------------------------------------------

export async function uploadJobPhoto(
  file: File,
  clientName: string,
  jobDate: string,
  type: 'before' | 'after'
): Promise<JobPhoto> {
  const timestamp = Date.now()
  const safeName = clientName.toLowerCase().replace(/[^a-z0-9]/g, '-')
  const pathname = `jobs/${jobDate}/${safeName}/${type}/${timestamp}.jpg`

  const formData = new FormData()
  formData.append('file', file)
  formData.append('pathname', pathname)
  formData.append('clientName', clientName)
  formData.append('jobDate', jobDate)
  formData.append('type', type)

  const res = await fetch('/api/photos/upload', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Photo upload failed')
  }

  return res.json()
}

// -- Get photos for a job -----------------------------------------------------

export async function getJobPhotos(
  clientName: string,
  jobDate: string
): Promise<JobPhotoSet | null> {
  const safeName = clientName.toLowerCase().replace(/[^a-z0-9]/g, '-')
  const res = await fetch(`/api/photos?client=${encodeURIComponent(safeName)}&date=${jobDate}`)
  if (!res.ok) return null
  return res.json()
}

// -- Compress image in browser before upload ---------------------------------

export async function compressImage(
  file: File,
  maxWidthPx = 1200,
  qualityPct = 0.82
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      const scale = Math.min(1, maxWidthPx / img.width)
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        blob => {
          if (!blob) return reject(new Error('Canvas toBlob failed'))
          resolve(new File([blob], file.name, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        qualityPct
      )
    }
    img.onerror = reject
    img.src = url
  })
}

// -- Format file size ---------------------------------------------------------

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
