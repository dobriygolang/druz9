import type * as Monaco from 'monaco-editor'
import { createContext, type FormatterContext } from '@dprint/formatter'
import initGoFmt, { format as formatGoWithWasm } from '@wasm-fmt/gofmt/vite'
import ruffWasmUrl from '@dprint/ruff/plugin.wasm?url'
import sqlWasmUrl from '@dprint/sql/plugin.wasm?url'

let gofmtInitPromise: Promise<void> | null = null
let pythonFormatterContext: FormatterContext | null = null
let sqlFormatterContext: FormatterContext | null = null
let ruffPluginBufferPromise: Promise<ArrayBuffer> | null = null
let sqlPluginBufferPromise: Promise<ArrayBuffer> | null = null

/**
 * Formats the document in the given editor using language-native formatters.
 * Supported languages: Go, Python, SQL.
 */
export async function formatEditorCode(
  editor: Monaco.editor.IStandaloneCodeEditor,
  _monaco: typeof Monaco,
): Promise<void> {
  const model = editor.getModel()
  if (!model) return

  const language = model.getLanguageId()
  const formatter = getFormatter(language)
  if (!formatter) return

  const source = model.getValue()
  const formatted = await formatter(source)
  if (formatted === source) return

  editor.executeEdits('format', [
    {
      range: model.getFullModelRange(),
      text: formatted,
    },
  ])
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

type AsyncFormatter = (source: string) => Promise<string>

function getFormatter(language: string): AsyncFormatter | null {
  switch (language) {
    case 'go':
      return formatGo
    case 'python':
      return formatPython
    case 'sql':
      return formatSql
    default:
      return null
  }
}

async function formatGo(source: string): Promise<string> {
  if (!gofmtInitPromise) {
    gofmtInitPromise = initGoFmt().then(() => {})
  }
  await gofmtInitPromise
  return formatGoWithWasm(source)
}

async function formatPython(source: string): Promise<string> {
  if (!pythonFormatterContext) {
    pythonFormatterContext = createContext({
      lineWidth: 88,
      useTabs: false,
      newLineKind: 'lf',
    })
    pythonFormatterContext.addPlugin(await getRuffPluginBuffer())
  }
  return pythonFormatterContext.formatText({
    filePath: 'main.py',
    fileText: source,
  })
}

async function formatSql(source: string): Promise<string> {
  if (!sqlFormatterContext) {
    sqlFormatterContext = createContext({
      indentWidth: 2,
      useTabs: false,
      newLineKind: 'lf',
    })
    sqlFormatterContext.addPlugin(await getSqlPluginBuffer())
  }
  return sqlFormatterContext.formatText({
    filePath: 'query.sql',
    fileText: source,
  })
}

async function getRuffPluginBuffer(): Promise<ArrayBuffer> {
  if (!ruffPluginBufferPromise) {
    ruffPluginBufferPromise = fetch(ruffWasmUrl).then(response => response.arrayBuffer())
  }
  return ruffPluginBufferPromise
}

async function getSqlPluginBuffer(): Promise<ArrayBuffer> {
  if (!sqlPluginBufferPromise) {
    sqlPluginBufferPromise = fetch(sqlWasmUrl).then(response => response.arrayBuffer())
  }
  return sqlPluginBufferPromise
}
