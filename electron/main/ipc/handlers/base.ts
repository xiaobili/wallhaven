/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * IPC Handler Base Utilities
 * Shared utilities for IPC handlers
 */

import * as fs from 'fs'
import * as path from 'path'
import { pipeline } from 'stream'
import { promisify } from 'util'
import sharp from 'sharp'

const streamPipeline = promisify(pipeline)

/**
 * Get image dimensions using simple file header parsing
 * Supports JPEG, PNG, GIF, WebP, BMP formats
 */
export function getImageDimensions(filePath: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const buffer = Buffer.alloc(24)
    const fd = fs.openSync(filePath, 'r')

    fs.read(fd, buffer, 0, 24, 0, (err, bytesRead) => {
      fs.closeSync(fd)

      if (err || bytesRead < 24) {
        // Read failed, return default values instead of throwing error
        resolve({ width: 0, height: 0 })
        return
      }

      try {
        let width = 0
        let height = 0

        // JPEG
        if (buffer[0] === 0xff && buffer[1] === 0xd8) {
          let offset = 2
          while (offset < bytesRead - 9) {
            if (buffer[offset] !== 0xff) {
              offset++
              continue
            }
            const marker = buffer[offset + 1]
            if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
              height = buffer.readUInt16BE(offset + 5)
              width = buffer.readUInt16BE(offset + 7)
              break
            }
            const segmentLength = buffer.readUInt16BE(offset + 2)
            if (segmentLength < 2) break
            offset += 2 + segmentLength
          }
        }
        // PNG
        else if (
          buffer[0] === 0x89 &&
          buffer[1] === 0x50 &&
          buffer[2] === 0x4e &&
          buffer[3] === 0x47
        ) {
          width = buffer.readUInt32BE(16)
          height = buffer.readUInt32BE(20)
        }
        // GIF
        else if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
          width = buffer.readUInt16LE(6)
          height = buffer.readUInt16LE(8)
        }
        // WebP
        else if (
          buffer[0] === 0x52 &&
          buffer[1] === 0x49 &&
          buffer[2] === 0x46 &&
          buffer[3] === 0x46
        ) {
          // WebP needs more bytes, simply return 0
          width = 0
          height = 0
        }
        // BMP
        else if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
          width = buffer.readInt32LE(18)
          height = Math.abs(buffer.readInt32LE(22))
        }

        // If parsing succeeded and dimensions are valid, return result
        if (width > 0 && height > 0) {
          resolve({ width, height })
        } else {
          // Unable to parse or dimensions are 0, return default values
          resolve({ width: 0, height: 0 })
        }
      } catch (e) {
        // Parse error, return default values instead of rejecting
        resolve({ width: 0, height: 0 })
      }
    })
  })
}

/**
 * Generate image thumbnail
 * @param imagePath Original image path
 * @param dirPath Directory path
 * @param fileName File name
 * @returns Thumbnail path
 */
export async function generateThumbnail(
  imagePath: string,
  dirPath: string,
  fileName: string,
): Promise<string> {
  try {
    // Create thumbnail cache directory
    const cacheDir = path.join(dirPath, '.thumbnails')
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }

    // Generate thumbnail file name (use original file name hash + extension)
    const ext = path.extname(fileName).toLowerCase()
    const baseName = path.basename(fileName, ext)
    const thumbnailFileName = `${baseName}_thumb.jpg` // Convert to jpg format
    const thumbnailFilePath = path.join(cacheDir, thumbnailFileName)

    // If thumbnail already exists, return directly
    if (fs.existsSync(thumbnailFilePath)) {
      return thumbnailFilePath
    }

    // Use sharp to generate thumbnail
    await sharp(imagePath)
      .resize(300, 200, {
        fit: 'cover', // Crop and fill, maintain aspect ratio
        position: 'center', // Crop from center
      })
      .jpeg({ quality: 80 }) // Convert to JPEG, 80% quality
      .toFile(thumbnailFilePath)

    return thumbnailFilePath
  } catch (error) {
    // On failure, return empty string, frontend will use original image
    return ''
  }
}

/**
 * Log handler activity
 * @param handlerName Handler name for identification
 * @param message Log message
 * @param level Log level (info, error, warn)
 */
export function logHandler(
  handlerName: string,
  message: string,
  level: 'info' | 'error' | 'warn' = 'info',
): void {
  const timestamp = new Date().toISOString()
  console[level](`[${timestamp}][${handlerName}] ${message}`)
}

export { streamPipeline }
