import type * as Monaco from 'monaco-editor'

/**
 * Formats the document in the given editor.
 * Uses Monaco's built-in formatting if a provider is registered for the language,
 * otherwise falls back to a basic re-indentation pass.
 */
export async function formatEditorCode(
  editor: Monaco.editor.IStandaloneCodeEditor,
  _monaco: typeof Monaco,
): Promise<void> {
  const model = editor.getModel()
  if (!model) return

  // Try built-in format action first (works for JS/TS/JSON/HTML/CSS).
  const formatAction = editor.getAction('editor.action.formatDocument')
  if (formatAction) {
    try {
      await formatAction.run()
      return
    } catch {
      // No formatting provider registered — fall through to basic formatter.
    }
  }

  // Fallback: basic re-indentation.
  const language = model.getLanguageId()
  const text = model.getValue()
  const formatted = basicReindent(text, language)
  if (formatted !== text) {
    editor.executeEdits('format', [
      {
        range: model.getFullModelRange(),
        text: formatted,
      },
    ])
  }
}

/**
 * Registers Shift+Alt+F keyboard shortcut for formatting.
 */
export function registerFormatKeybinding(
  editor: Monaco.editor.IStandaloneCodeEditor,
  monaco: typeof Monaco,
): Monaco.IDisposable {
  return editor.addAction({
    id: 'druzya-format-document',
    label: 'Format Document',
    keybindings: [
      monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
    ],
    run: () => formatEditorCode(editor, monaco),
  })
}

function basicReindent(text: string, language: string): string {
  const lines = text.split('\n')
  const indent = language === 'python' ? '    ' : '  '
  const openers = /[{(\[]\s*$/
  const closers = /^\s*[})\]]/

  let level = 0
  const result: string[] = []

  for (const raw of lines) {
    const trimmed = raw.trim()
    if (trimmed === '') {
      result.push('')
      continue
    }

    if (closers.test(trimmed)) {
      level = Math.max(0, level - 1)
    }

    result.push(indent.repeat(level) + trimmed)

    if (openers.test(trimmed)) {
      level++
    }
  }

  return result.join('\n')
}
