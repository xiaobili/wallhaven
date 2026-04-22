import { ipcMain, IpcMainEvent } from 'electron'

// 示例：处理来自渲染进程的请求
ipcMain.on('toMain', (event: IpcMainEvent, data: any) => {
  console.log('Received from renderer:', data)
  
  // 可以回复渲染进程
  event.reply('fromMain', { message: 'Hello from main process!' })
})

// 示例：获取应用版本
ipcMain.handle('get-app-version', () => {
  return '1.0.0'
})

// 示例：打开外部链接
ipcMain.handle('open-external', async (_event: any, url: string) => {
  const { shell } = await import('electron')
  await shell.openExternal(url)
  return true
})
