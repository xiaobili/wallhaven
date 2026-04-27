/* eslint-disable no-undef */
/**
 * 应用图标生成脚本
 * 使用 sharp 库从源图片生成各平台所需的图标格式
 * 
 * 使用方法:
 * node scripts/generate-icons.js [source-image-path]
 * 
 * 示例:
 * node scripts/generate-icons.js ./build/source-icon.svg
 * node scripts/generate-icons.js ./build/source-icon.png
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置 - 默认使用 SVG 源文件
const SOURCE_IMAGE = process.argv[2] || './build/source-icon.svg';
const OUTPUT_DIR = path.join(__dirname, '..', 'build');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * 生成 Windows ICO 图标
 * 包含多种尺寸以适应不同场景
 */
async function generateWindowsIcon() {
  console.log('🪟 生成 Windows ICO 图标...');
  
  const sizes = [16, 32, 48, 64, 128, 256];
  const buffers = [];
  
  for (const size of sizes) {
    const buffer = await sharp(SOURCE_IMAGE)
      .resize(size, size)
      .png()
      .toBuffer();
    buffers.push(buffer);
  }
  
  // sharp 不直接支持 ICO 格式，需要安装 ico-endcode 或使用其他工具
  // 这里先生成 PNG，用户可以手动转换为 ICO
  const pngPath = path.join(OUTPUT_DIR, 'icon-256.png');
  await sharp(SOURCE_IMAGE)
    .resize(256, 256)
    .png()
    .toFile(pngPath);
  
  console.log(`✅ Windows PNG 图标已生成: ${pngPath}`);
  console.log('⚠️  请使用在线工具将 PNG 转换为 ICO 格式，或安装 ico-endcode 包');
  console.log('   推荐工具: https://icoconvert.com/');
  
  return pngPath;
}

/**
 * 生成 macOS ICNS 图标
 * 注意：sharp 不直接支持 ICNS，需要借助 iconutil 工具
 */
async function generateMacOSIcon() {
  console.log('🍎 生成 macOS 图标资源...');
  
  // macOS 需要的图标尺寸
  const macSizes = [
    { name: 'icon_16x16.png', size: 16 },
    { name: 'icon_32x32.png', size: 32 },
    { name: 'icon_128x128.png', size: 128 },
    { name: 'icon_256x256.png', size: 256 },
    { name: 'icon_512x512.png', size: 512 },
    { name: 'icon_1024x1024.png', size: 1024 },
  ];
  
  const iconsetDir = path.join(OUTPUT_DIR, 'icon.iconset');
  
  if (!fs.existsSync(iconsetDir)) {
    fs.mkdirSync(iconsetDir, { recursive: true });
  }
  
  for (const { name, size } of macSizes) {
    const outputPath = path.join(iconsetDir, name);
    await sharp(SOURCE_IMAGE)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`  ✓ ${name}`);
  }
  
  console.log(`✅ macOS 图标资源已生成到: ${iconsetDir}`);
  console.log('💡 在 macOS 上运行以下命令生成 .icns 文件:');
  console.log(`   iconutil -c icns "${iconsetDir}" -o "${path.join(OUTPUT_DIR, 'icon.icns')}"`);
  
  return iconsetDir;
}

/**
 * 生成 Linux PNG 图标
 */
async function generateLinuxIcon() {
  console.log('🐧 生成 Linux PNG 图标...');
  
  const outputPath = path.join(OUTPUT_DIR, 'icon.png');
  
  await sharp(SOURCE_IMAGE)
    .resize(512, 512)
    .png({ quality: 95 })
    .toFile(outputPath);
  
  console.log(`✅ Linux PNG 图标已生成: ${outputPath}`);
  
  return outputPath;
}

/**
 * 生成所有尺寸的预览图（用于测试）
 */
async function generatePreviewSizes() {
  console.log('👁️  生成预览尺寸图标...');
  
  const previewSizes = [16, 32, 48, 64, 128, 256, 512];
  const previewDir = path.join(OUTPUT_DIR, 'preview');
  
  if (!fs.existsSync(previewDir)) {
    fs.mkdirSync(previewDir, { recursive: true });
  }
  
  for (const size of previewSizes) {
    const outputPath = path.join(previewDir, `icon-${size}x${size}.png`);
    await sharp(SOURCE_IMAGE)
      .resize(size, size)
      .png()
      .toFile(outputPath);
  }
  
  console.log(`✅ 预览图标已生成到: ${previewDir}`);
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始生成应用图标...\n');
  console.log(`源图片: ${SOURCE_IMAGE}\n`);
  
  // 检查源图片是否存在
  if (!fs.existsSync(SOURCE_IMAGE)) {
    console.error(`❌ 错误: 源图片不存在: ${SOURCE_IMAGE}`);
    console.log('\n💡 请先准备一个高质量的 PNG 或 SVG 源图片');
    console.log('   建议尺寸: 至少 1024x1024 像素');
    console.log('   默认位置: build/source-icon.svg\n');
    console.log('   已提供示例 SVG 文件，可直接使用或修改');
    process.exit(1);
  }
  
  try {
    // 生成各平台图标
    await generateWindowsIcon();
    console.log();
    
    await generateMacOSIcon();
    console.log();
    
    await generateLinuxIcon();
    console.log();
    
    await generatePreviewSizes();
    console.log();
    
    console.log('✨ 图标生成完成！\n');
    console.log('📋 下一步:');
    console.log('1. Windows: 将 build/icon-256.png 转换为 .ico 格式');
    console.log('   使用在线工具: https://icoconvert.com/');
    console.log('2. macOS: 在 macOS 系统上运行 iconutil 命令生成 .icns');
    console.log('3. Linux: build/icon.png 已就绪');
    console.log('4. 更新 electron-builder.yml 中的图标配置（已完成）');
    console.log('\n📖 详细说明请查看:');
    console.log('   - ICON_SETUP_GUIDE.md (快速开始)');
    console.log('   - build/README_ICONS.md (详细文档)\n');
    
  } catch (error) {
    console.error('❌ 图标生成失败:', error);
    process.exit(1);
  }
}

main();
