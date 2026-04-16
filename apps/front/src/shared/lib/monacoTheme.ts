import type * as Monaco from 'monaco-editor'

export function registerDarkTheme(monaco: typeof Monaco) {
  monaco.editor.defineTheme('druzya-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '475569', fontStyle: 'italic' },
      { token: 'keyword', foreground: '7c3aed' },
      { token: 'string', foreground: '22c55e' },
      { token: 'number', foreground: 'f59e0b' },
    ],
    colors: {
      'editor.background': '#0B1210',
      'editor.foreground': '#e2e8f0',
      'editorLineNumber.foreground': '#1E4035',
      'editorLineNumber.activeForeground': '#64748b',
      'editor.selectionBackground': '#1e3a5f',
      'editor.lineHighlightBackground': '#0f1f3d',
      'editorCursor.foreground': '#059669',
      'editorIndentGuide.background': '#1e293b',
      'editorIndentGuide.activeBackground': '#1E4035',
    },
  })
}
