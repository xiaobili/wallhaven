<template>
  <nav class="pagination">
    <!-- 分页按钮组 -->
    <ul class="pagination-buttons">
      <!-- 上一页按钮 -->
      <li :class="{ disabled: props.currentPage <= 1 || props.loading }">
        <a
          v-if="props.currentPage > 1 && !props.loading"
          href="#"
          @click.prevent="handlePageClick(props.currentPage - 1)"
        >
          上一页
        </a>
        <span v-else>上一页</span>
      </li>

      <!-- 首页 -->
      <li
        v-if="props.totalPages > 1"
        :class="{ active: props.currentPage === 1 }"
      >
        <a
          href="#"
          @click.prevent="handlePageClick(1)"
        >1</a>
      </li>

      <!-- 左侧省略号 -->
      <li
        v-if="showStartEllipsis"
        class="ellipsis"
      >
        <span>...</span>
      </li>

      <!-- 中间页码 -->
      <li
        v-for="page in visiblePages"
        v-show="page !== 1 && page !== props.totalPages"
        :key="page"
        :class="{ active: page === props.currentPage }"
      >
        <a
          href="#"
          @click.prevent="handlePageClick(page)"
        >{{ page }}</a>
      </li>

      <!-- 右侧省略号 -->
      <li
        v-if="showEndEllipsis"
        class="ellipsis"
      >
        <span>...</span>
      </li>

      <!-- 末页 -->
      <li
        v-if="props.totalPages > 1"
        :class="{ active: props.currentPage === props.totalPages }"
      >
        <a
          href="#"
          @click.prevent="handlePageClick(props.totalPages)"
        >
          {{ props.totalPages }}
        </a>
      </li>

      <!-- 下一页按钮 -->
      <li :class="{ disabled: props.currentPage >= props.totalPages || props.loading }">
        <a
          v-if="props.currentPage < props.totalPages && !props.loading"
          href="#"
          @click.prevent="handlePageClick(props.currentPage + 1)"
        >
          下一页
        </a>
        <span v-else>下一页</span>
      </li>
    </ul>

    <!-- 页码跳转 -->
    <div class="pagination-jump">
      <label for="page-input">跳转</label>
      <input
        id="page-input"
        v-model.number="inputPage"
        type="number"
        :min="1"
        :max="props.totalPages"
        :disabled="props.loading"
        @keyup.enter="handleJumpToPage"
        @blur="handleInputBlur"
      >
    </div>

    <!-- 总条目数 -->
    <span class="pagination-notice">
      共 {{ formatCount(props.totalCount) }} 张
    </span>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * PaginationBar 组件
 *
 * 分页导航组件，采用毛玻璃极简风格
 * 显示 5 个页码按钮（当前页左右各 2 个），支持省略号显示
 * 支持页码输入框快速跳转
 */

interface Props {
  currentPage: number // 当前页码（1-based）
  totalPages: number // 总页数
  totalCount: number // 总条目数
  loading?: boolean // 加载状态
}

interface Emits {
  (e: 'go-to-page', page: number): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<Emits>()

// 页码输入框的值
const inputPage = ref<number>(props.currentPage)

// 监听 currentPage 变化，同步更新输入框
watch(
  () => props.currentPage,
  (newPage) => {
    inputPage.value = newPage
  }
)

/**
 * 计算可见的页码列表
 * 显示 5 个页码按钮（当前页左右各 2 个）
 * 边界自适应：当前页靠近边界时扩展另一侧
 */
const visiblePages = computed(() => {
  if (props.totalPages <= 5) {
    // 总页数 ≤ 5，全部显示
    return Array.from({ length: props.totalPages }, (_, i) => i + 1)
  }

  // 计算显示范围
  let start = Math.max(1, props.currentPage - 2)
  let end = Math.min(props.totalPages, props.currentPage + 2)

  // 边界自适应
  if (props.currentPage <= 3) {
    end = 5
  } else if (props.currentPage >= props.totalPages - 2) {
    start = props.totalPages - 4
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

/**
 * 是否显示左侧省略号
 */
const showStartEllipsis = computed(() => {
  return props.totalPages > 5 && props.currentPage > 3
})

/**
 * 是否显示右侧省略号
 */
const showEndEllipsis = computed(() => {
  return props.totalPages > 5 && props.currentPage < props.totalPages - 2
})

/**
 * 格式化总条目数（添加千分位）
 */
function formatCount(count: number): string {
  return count.toLocaleString('zh-CN')
}

/**
 * 处理页码点击
 */
function handlePageClick(page: number): void {
  if (props.loading || page === props.currentPage) return
  emit('go-to-page', page)
}

/**
 * 处理页码跳转（Enter键触发）
 */
function handleJumpToPage(): void {
  const page = inputPage.value

  // 验证页码范围
  if (!page || page < 1 || page > props.totalPages) {
    // 超出范围，重置为当前页
    inputPage.value = props.currentPage
    return
  }

  // 如果输入的是当前页，不做跳转
  if (page === props.currentPage) return

  // 触发跳转
  emit('go-to-page', page)
}

/**
 * 处理输入框失焦
 * 验证并修正输入值
 */
function handleInputBlur(): void {
  const page = inputPage.value

  // 如果输入无效，重置为当前页
  if (!page || page < 1 || page > props.totalPages) {
    inputPage.value = props.currentPage
  }
}
</script>

<style scoped>
/* ===== 分页容器 - 毛玻璃效果 ===== */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 20px;
  margin: 1.5em auto;
  max-width: fit-content;
  background-color: rgba(40, 40, 40, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

/* ===== 分页按钮组 ===== */
.pagination-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pagination-buttons li {
  display: inline-block;
}

.pagination-buttons li a,
.pagination-buttons li span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  min-width: 40px;
  padding: 0 12px;
  color: #ddd;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  text-align: center;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  font-weight: 500;
  user-select: none;
}

/* 普通按钮 - 半透明纯色 */
.pagination-buttons li a {
  background-color: rgba(255, 255, 255, 0.08);
}

.pagination-buttons li a:hover {
  background-color: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.1);
}

.pagination-buttons li a:active {
  background-color: rgba(255, 255, 255, 0.12);
  transform: scale(0.98);
}

/* 激活状态 - 青绿色半透明 */
.pagination-buttons li.active a,
.pagination-buttons li.active span {
  background-color: rgba(100, 200, 180, 0.25);
  border: 1px solid rgba(100, 200, 180, 0.4);
  color: #fff;
  font-weight: 600;
  cursor: default;
}

/* 禁用状态 */
.pagination-buttons li.disabled a,
.pagination-buttons li.disabled span {
  background-color: rgba(255, 255, 255, 0.03);
  color: #666;
  cursor: default;
  opacity: 0.5;
}

/* 省略号 */
.pagination-buttons li.ellipsis span {
  background: transparent;
  color: #888;
  cursor: default;
  min-width: 40px;
}

/* ===== 页码跳转 ===== */
.pagination-jump {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 4px;
}

.pagination-jump label {
  color: #aaa;
  font-size: 0.9em;
  font-weight: 500;
  white-space: nowrap;
}

.pagination-jump input[type='number'] {
  width: 50px;
  height: 36px;
  padding: 0 8px;
  background-color: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #ddd;
  font-size: 0.95em;
  text-align: center;
  transition: all 0.2s ease;
  outline: none;
  -moz-appearance: textfield;
}

.pagination-jump input[type='number']::-webkit-outer-spin-button,
.pagination-jump input[type='number']::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.pagination-jump input[type='number']:hover {
  background-color: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.15);
}

.pagination-jump input[type='number']:focus {
  background-color: rgba(255, 255, 255, 0.15);
  border-color: rgba(100, 200, 180, 0.4);
  box-shadow: 0 0 0 2px rgba(100, 200, 180, 0.1);
}

.pagination-jump input[type='number']:disabled {
  background-color: rgba(255, 255, 255, 0.03);
  color: #666;
  cursor: default;
  opacity: 0.5;
}

/* ===== 总条目数 ===== */
.pagination-notice {
  color: #aaa;
  font-weight: 500;
  font-size: 0.95em;
  margin-left: 8px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
}
</style>
