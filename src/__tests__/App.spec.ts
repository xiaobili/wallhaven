import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from '../App.vue'

// 创建测试用的 router 实例
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/online', component: { template: '<div>Online</div>' } },
    { path: '/switch', component: { template: '<div>Switch</div>' } },
    { path: '/download', component: { template: '<div>Download</div>' } },
    { path: '/setting', component: { template: '<div>Setting</div>' } },
  ],
})

describe('App', () => {
  it('mounts renders properly', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    // 等待路由初始化
    await router.isReady()

    expect(wrapper.exists()).toBe(true)
  })
})
