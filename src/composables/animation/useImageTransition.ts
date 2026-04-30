/**
 * Image Transition Animation State Management
 *
 * Provides animation state management for image transitions.
 * Includes reduced-motion detection and direction handling.
 *
 * @example
 * ```typescript
 * const { slideDirection, transitionName, setDirection } = useImageTransition()
 *
 * // Set direction on navigation
 * setDirection('prev')  // slide-left
 * setDirection('next')  // slide-right
 *
 * // Use in Vue Transition
 * // <Transition :name="transitionName" mode="out-in">
 * ```
 */

import { ref, computed, onMounted, onUnmounted, type Ref, type ComputedRef } from 'vue'

/* ===== Type Definitions ===== */

/**
 * Slide animation direction (matches CSS class names)
 */
export type SlideDirection = 'slide-left' | 'slide-right'

/**
 * Navigation direction (user action)
 */
export type NavigationDirection = 'prev' | 'next'

/**
 * useImageTransition return type interface
 */
export interface UseImageTransitionReturn {
  /** Current slide animation direction */
  slideDirection: Ref<SlideDirection>
  /** Whether an animation is in progress */
  isAnimating: Ref<boolean>
  /** User's reduced-motion preference */
  reducedMotion: ComputedRef<boolean>
  /** Computed transition name (respects reduced-motion) */
  transitionName: ComputedRef<string>
  /** Set direction based on navigation action */
  setDirection: (direction: NavigationDirection) => void
  /** Mark animation as started */
  startAnimation: () => void
  /** Mark animation as ended (call from @after-enter/@after-leave) */
  endAnimation: () => void
}

/* ===== Implementation ===== */

/**
 * Create image transition animation state
 *
 * Uses manual reduced-motion detection via window.matchMedia
 * since VueUse is not installed in this project.
 *
 * @returns Animation state and control methods
 */
export function useImageTransition(): UseImageTransitionReturn {
  // Animation state
  const slideDirection = ref<SlideDirection>('slide-left')
  const isAnimating = ref<boolean>(false)

  // Reduced motion detection
  const reducedMotion = ref<boolean>(false)
  let mediaQuery: MediaQueryList | null = null

  /**
   * Check reduced-motion preference
   */
  const checkReducedMotion = (): void => {
    if (typeof window === 'undefined') {
      reducedMotion.value = false
      return
    }
    reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  /**
   * Handle media query change event
   */
  const handleMediaChange = (event: MediaQueryListEvent): void => {
    reducedMotion.value = event.matches
  }

  // Setup and cleanup lifecycle
  onMounted(() => {
    checkReducedMotion()
    mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    mediaQuery.addEventListener('change', handleMediaChange)
  })

  onUnmounted(() => {
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', handleMediaChange)
    }
  })

  // Computed transition name based on reduced-motion preference
  const transitionName = computed<string>(() => {
    return reducedMotion.value ? 'fade' : slideDirection.value
  })

  /**
   * Set slide direction based on navigation action
   * - 'prev' → 'slide-left' (new image enters from left)
   * - 'next' → 'slide-right' (new image enters from right)
   */
  const setDirection = (direction: NavigationDirection): void => {
    slideDirection.value = direction === 'prev' ? 'slide-left' : 'slide-right'
  }

  /**
   * Mark animation as started
   */
  const startAnimation = (): void => {
    isAnimating.value = true
  }

  /**
   * Mark animation as ended
   * Call from Vue Transition @after-enter or @after-leave event
   */
  const endAnimation = (): void => {
    isAnimating.value = false
  }

  return {
    slideDirection,
    isAnimating,
    reducedMotion: computed(() => reducedMotion.value),
    transitionName,
    setDirection,
    startAnimation,
    endAnimation,
  }
}
