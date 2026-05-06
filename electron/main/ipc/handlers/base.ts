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
 * Get image dimensions using sharp library
 * Supports JPEG, PNG, GIF, WebP, AVIF, TIFF, BMP and more
 */
export async function getImageDimensions(
  filePath: string,
): Promise<{ width: number; height: number }> {
  try {
    const metadata = await sharp(filePath).metadata()
    return {
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
    }
  } catch (error) {
    // Parse error, return default values
    return { width: 0, height: 0 }
  }
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
