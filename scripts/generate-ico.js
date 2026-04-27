/* eslint-disable no-undef */
/**
 * Windows ICO 图标生成脚本
 * 使用 png-to-ico 库从多个尺寸的 PNG 生成 ICO 文件
 * 
 * 使用方法:
 * node scripts/generate-ico.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PREVIEW_DIR = path.join(__dirname, '..', 'build', 'preview');
const OUTPUT_FILE = path.join(__dirname, '..', 'build', 'icon.ico');

/**
 * 生成 Windows ICO 文件
 */
async function generateIco() {
  console.log('🪟 开始生成 Windows ICO 图标...\n');
  
  // 检查预览目录是否存在
  if (!fs.existsSync(PREVIEW_DIR)) {
    console.error('❌ 错误: 预览目录不存在');
    console.log('💡 请先运行: npm run generate-icons\n');
    process.exit(1);
  }
  
  // 检查所需的 PNG 文件
  const requiredSizes = [16, 32, 48, 64, 128, 256];
  const pngFiles = [];
  
  for (const size of requiredSizes) {
    const pngPath = path.join(PREVIEW_DIR, `icon-${size}x${size}.png`);
    if (!fs.existsSync(pngPath)) {
      console.error(`❌ 错误: 缺少 ${size}x${size} 尺寸的图标`);
      console.log('💡 请先运行: npm run generate-icons\n');
      process.exit(1);
    }
    pngFiles.push(pngPath);
  }
  
  console.log('✅ 所有尺寸的 PNG 文件已找到');
  
  try {
    // 动态导入 png-to-ico
    const pngToIco = (await import('png-to-ico')).default;
    
    console.log('🔄 正在生成 ICO 文件...');
    
    const icoBuffer = await pngToIco(pngFiles);
    fs.writeFileSync(OUTPUT_FILE, icoBuffer);
    
    console.log(`✅ Windows ICO 图标已生成: ${OUTPUT_FILE}`);
    
    // 显示文件信息
    const stats = fs.statSync(OUTPUT_FILE);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`📊 文件大小: ${sizeKB} KB`);
    console.log(`📐 包含尺寸: ${requiredSizes.join(', ')} px\n`);
    
    console.log('✨ 完成！现在可以构建 Windows 应用了:');
    console.log('   npm run build:win\n');
    
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      console.error('❌ 错误: 缺少 png-to-ico 依赖');
      console.log('\n💡 请安装依赖:');
      console.log('   cnpm install --save-dev png-to-ico\n');
    } else {
      console.error('❌ 生成失败:', error.message);
    }
    process.exit(1);
  }
}

// 主函数
generateIco();
