import { ref } from 'vue'

export function useClipboard() {
  const feedbackVisible = ref(false)

  async function copy(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      return true
    } catch {
      return false
    }
  }

  async function copyWithFeedback(text: string): Promise<boolean> {
    const result = await copy(text)
    if (result) {
      feedbackVisible.value = true
      setTimeout(() => {
        feedbackVisible.value = false
      }, 1200)
    }
    return result
  }

  return { copy, copyWithFeedback, feedbackVisible }
}
