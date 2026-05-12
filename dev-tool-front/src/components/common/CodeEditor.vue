<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { EditorView, keymap, lineNumbers, highlightActiveLine, placeholder as cmPlaceholder } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import { json } from '@codemirror/lang-json'
import { javascript } from '@codemirror/lang-javascript'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { xml } from '@codemirror/lang-xml'
import { yaml } from '@codemirror/lang-yaml'

const props = withDefaults(defineProps<{
  modelValue?: string
  language?: 'json' | 'javascript' | 'html' | 'css' | 'xml' | 'yaml' | 'text'
  readonly?: boolean
  placeholder?: string
  lineNumbers?: boolean
  minHeight?: string
  maxHeight?: string
  dark?: boolean
}>(), {
  modelValue: '',
  language: 'text',
  readonly: false,
  placeholder: '',
  lineNumbers: true,
  minHeight: '120px',
  maxHeight: '400px',
  dark: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorRef = ref<HTMLDivElement>()
let editorView: EditorView | null = null

function getLanguageExtension() {
  switch (props.language) {
    case 'json': return json()
    case 'javascript': return javascript()
    case 'html': return html()
    case 'css': return css()
    case 'xml': return xml()
    case 'yaml': return yaml()
    default: return []
  }
}

onMounted(() => {
  if (!editorRef.value) return

  const extensions = [
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    highlightActiveLine(),
    EditorView.updateListener.of(update => {
      if (update.docChanged && !props.readonly) {
        emit('update:modelValue', update.state.doc.toString())
      }
    }),
    EditorView.theme({
      '&': { minHeight: props.minHeight, maxHeight: props.maxHeight },
      '.cm-scroller': { overflow: 'auto' },
      '.cm-content': { fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace", fontSize: '13px' },
      '.cm-gutters': { fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace" },
    }),
  ]

  if (props.lineNumbers) {
    extensions.unshift(lineNumbers())
  }

  if (props.readonly) {
    extensions.push(EditorState.readOnly.of(true))
  }

  if (props.placeholder) {
    extensions.push(cmPlaceholder(props.placeholder))
  }

  const langExt = getLanguageExtension()
  if (langExt) {
    extensions.push(langExt)
  }

  if (props.dark) {
    extensions.push(oneDark)
  }

  editorView = new EditorView({
    state: EditorState.create({
      doc: props.modelValue,
      extensions,
    }),
    parent: editorRef.value,
  })
})

onBeforeUnmount(() => {
  editorView?.destroy()
})

watch(() => props.modelValue, (newVal) => {
  if (editorView && newVal !== editorView.state.doc.toString()) {
    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: newVal,
      },
    })
  }
})
</script>

<template>
  <div class="code-editor" ref="editorRef"></div>
</template>

<style scoped>
.code-editor {
  border: 1px solid var(--border-input);
  border-radius: 6px;
  overflow: hidden;
}
.code-editor :deep(.cm-editor) {
  height: 100%;
}
.code-editor :deep(.cm-focused) {
  outline: none;
}
.code-editor :deep(.cm-gutters) {
  background: var(--bg-line-number, #f8fafc);
  border-right: 1px solid var(--border-light);
  color: var(--text-placeholder);
}
</style>
