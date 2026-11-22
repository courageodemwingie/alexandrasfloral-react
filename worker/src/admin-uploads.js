
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

function hasValidImageSignature(bytes, type) {
  if (type === 'image/jpeg') {
    return (
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    )
  }

  if (type === 'image/png') {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10]
    return signature.every((value, index) => bytes[index] === value)
  }

  if (type === 'image/gif') {
    const header = String.fromCharCode(...bytes.slice(0, 6))
    return header === 'GIF87a' || header === 'GIF89a'
  }

  if (type === 'image/webp') {
    const riff = String.fromCharCode(...bytes.slice(0, 4))
    const webp = String.fromCharCode(...bytes.slice(8, 12))
    return riff === 'RIFF' && webp === 'WEBP'
  }

  return false
}

export async function uploadAdminImage(request, env) {
  if (!env.PRODUCT_IMAGES) {
    return {
      status: 503,
      data: {
        success: false,
        message: 'Image storage is not configured.',
      },
    }
  }

  const contentType = request.headers.get('Content-Type') || ''

  if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
    return {
      status: 415,
      data: {
        success: false,
        message: 'Please upload an image using a file form.',
      },
    }
  }

  const contentLength = Number(request.headers.get('Content-Length'))

  if (contentLength > MAX_IMAGE_SIZE + 1024 * 1024) {
    return {
      status: 413,
      data: {
        success: false,
        message: 'The image must not exceed 5 MB.',
      },
    }
  }

  let formData

  try {
    formData = await request.formData()
  } catch {
    return {
      status: 400,
      data: {
        success: false,
        message: 'Unable to read the uploaded file.',
      },
    }
  }

  const file = formData.get('file')

  if (
    !file ||
    typeof file.arrayBuffer !== 'function' ||
    typeof file.size !== 'number'
  ) {
    return {
      status: 400,
      data: {
        success: false,
        message: 'Please select an image to upload.',
      },
    }
  }

  if (file.size === 0 || file.size > MAX_IMAGE_SIZE) {
    return {
      status: 413,
      data: {
        success: false,
        message: 'The image must be between 1 byte and 5 MB.',
      },
    }
  }

  const extension = ALLOWED_IMAGE_TYPES[file.type]

  if (!extension) {
    return {
      status: 415,
      data: {
        success: false,
        message: 'Only JPEG, PNG, WebP and GIF images are allowed.',
      },
    }
  }

  const signature = new Uint8Array(
    await file.slice(0, 12).arrayBuffer()
  )

  if (!hasValidImageSignature(signature, file.type)) {
    return {
      status: 415,
      data: {
        success: false,
        message: 'The selected file is not a valid image format.',
      },
    }
  }

  const imageKey = `products/${crypto.randomUUID()}.${extension}`

  await env.PRODUCT_IMAGES.put(imageKey, file.stream(), {
    httpMetadata: {
      contentType: file.type,
    },
  })

  return {
    status: 201,
    data: {
      success: true,
      message: 'Image uploaded successfully.',
      imageKey,
    },
  }
}
