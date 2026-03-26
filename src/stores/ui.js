import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    isLoading: false,
    _pending: 0,
    _timer: null,
  }),
  actions: {
    startLoading() {
      // Increment pending operations and start with a slight delay to avoid flicker
      this._pending++
      if (this._timer) return
      this._timer = setTimeout(() => {
        this.isLoading = true
      }, 150)
    },
    stopLoading() {
      // Decrement and clear when all pending operations are done
      this._pending = Math.max(0, this._pending - 1)
      if (this._pending === 0) {
        clearTimeout(this._timer)
        this._timer = null
        // small grace to ensure smooth fade-out
        setTimeout(() => { this.isLoading = false }, 100)
      }
    },
    resetLoading() {
      this._pending = 0
      clearTimeout(this._timer)
      this._timer = null
      this.isLoading = false
    }
  }
})
