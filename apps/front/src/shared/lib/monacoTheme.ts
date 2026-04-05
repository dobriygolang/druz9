import type * as Monaco from 'monaco-editor'

export function registerDarkTheme(monaco: typeof Monaco) {
  monaco.editor.defineTheme('lunaris-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '475569', fontStyle: 'italic' },
      { token: 'keyword', foreground: '7c3aed' },
      { token: 'string', foreground: '22c55e' },
      { token: 'number', foreground: 'f59e0b' },
    ],
    colors: {
      'editor.background': '#0f172a',
      'editor.foreground': '#e2e8f0',
      'editorLineNumber.foreground': '#334155',
      'editorLineNumber.activeForeground': '#64748b',
      'editor.selectionBackground': '#1e3a5f',
      'editor.lineHighlightBackground': '#0f1f3d',
      'editorCursor.foreground': '#FF8400',
      'editorIndentGuide.background': '#1e293b',
      'editorIndentGuide.activeBackground': '#334155',
    },
  })
}
