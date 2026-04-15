import * as Y from 'yjs'
import { createMutex } from 'lib0/mutex'
import { unexpectedCase } from 'lib0/error'
import type * as Monaco from 'monaco-editor'

type RelativeSelection = {
  start: Y.RelativePosition
  end: Y.RelativePosition
  direction: Monaco.SelectionDirection
}

function createRelativeSelection(
  editor: Monaco.editor.IStandaloneCodeEditor,
  monacoModel: Monaco.editor.ITextModel,
  type: Y.Text,
): RelativeSelection | null {
  const selection = editor.getSelection()
  if (!selection) return null

  const start = Y.createRelativePositionFromTypeIndex(type, monacoModel.getOffsetAt(selection.getStartPosition()))
  const end = Y.createRelativePositionFromTypeIndex(type, monacoModel.getOffsetAt(selection.getEndPosition()))

  return {
    start,
    end,
    direction: selection.getDirection(),
  }
}

function createMonacoSelectionFromRelativeSelection(
  monaco: typeof Monaco,
  editor: Monaco.editor.IStandaloneCodeEditor,
  type: Y.Text,
  relativeSelection: RelativeSelection,
  doc: Y.Doc,
): Monaco.Selection | null {
  const start = Y.createAbsolutePositionFromRelativePosition(relativeSelection.start, doc)
  const end = Y.createAbsolutePositionFromRelativePosition(relativeSelection.end, doc)

  if (!start || !end || start.type !== type || end.type !== type) {
    return null
  }

  const model = editor.getModel()
  if (!model) return null

  const startPosition = model.getPositionAt(start.index)
  const endPosition = model.getPositionAt(end.index)

  return monaco.Selection.createWithDirection(
    startPosition.lineNumber,
    startPosition.column,
    endPosition.lineNumber,
    endPosition.column,
    relativeSelection.direction,
  )
}

export class MonacoBinding {
  private readonly doc: Y.Doc
  private readonly yText: Y.Text
  private readonly monaco: typeof Monaco
  private readonly monacoModel: Monaco.editor.ITextModel
  private readonly editors: Set<Monaco.editor.IStandaloneCodeEditor>
  private readonly mutex = createMutex()
  private savedSelections = new Map<Monaco.editor.IStandaloneCodeEditor, RelativeSelection>()
  private readonly beforeTransaction: () => void
  private readonly yTextObserver: (event: Y.YTextEvent) => void
  private readonly monacoChangeHandler: Monaco.IDisposable
  private readonly monacoDisposeHandler: Monaco.IDisposable
  private readonly onRemoteChangeStart?: () => void
  private readonly onRemoteChangeEnd?: () => void

  constructor(
    monaco: typeof Monaco,
    yText: Y.Text,
    monacoModel: Monaco.editor.ITextModel,
    editors: Set<Monaco.editor.IStandaloneCodeEditor> = new Set(),
    opts: {
      onRemoteChangeStart?: () => void
      onRemoteChangeEnd?: () => void
    } = {},
  ) {
    if (!yText.doc) {
      throw new Error('Y.Text must belong to a Y.Doc')
    }

    this.doc = yText.doc
    this.yText = yText
    this.monaco = monaco
    this.monacoModel = monacoModel
    this.editors = editors
    this.onRemoteChangeStart = opts.onRemoteChangeStart
    this.onRemoteChangeEnd = opts.onRemoteChangeEnd

    this.beforeTransaction = () => {
      this.mutex(() => {
        this.savedSelections = new Map()
        this.editors.forEach(editor => {
          if (editor.getModel() !== this.monacoModel) return
          const selection = createRelativeSelection(editor, this.monacoModel, this.yText)
          if (selection) {
            this.savedSelections.set(editor, selection)
          }
        })
      })
    }

    this.yTextObserver = event => {
      this.mutex(() => {
        this.onRemoteChangeStart?.()
        try {
          let index = 0

          event.delta.forEach(op => {
            if (op.retain !== undefined) {
              index += op.retain
              return
            }

            if (op.insert !== undefined) {
              const position = this.monacoModel.getPositionAt(index)
              const range = new this.monaco.Selection(
                position.lineNumber,
                position.column,
                position.lineNumber,
                position.column,
              )
              this.monacoModel.applyEdits([{ range, text: op.insert as string }])
              index += (op.insert as string).length
              return
            }

            if (op.delete !== undefined) {
              const start = this.monacoModel.getPositionAt(index)
              const end = this.monacoModel.getPositionAt(index + op.delete)
              const range = new this.monaco.Selection(
                start.lineNumber,
                start.column,
                end.lineNumber,
                end.column,
              )
              this.monacoModel.applyEdits([{ range, text: '' }])
              return
            }

            unexpectedCase()
          })

          this.savedSelections.forEach((selection, editor) => {
            const nextSelection = createMonacoSelectionFromRelativeSelection(
              this.monaco,
              editor,
              this.yText,
              selection,
              this.doc,
            )

            if (nextSelection) {
              editor.setSelection(nextSelection)
            }
          })
        } finally {
          this.onRemoteChangeEnd?.()
        }
      })
    }

    this.doc.on('beforeAllTransactions', this.beforeTransaction)
    this.yText.observe(this.yTextObserver)

    const yTextValue = this.yText.toString()
    if (this.monacoModel.getValue() !== yTextValue) {
      this.monacoModel.setValue(yTextValue)
    }

    this.monacoChangeHandler = this.monacoModel.onDidChangeContent(event => {
      this.mutex(() => {
        this.doc.transact(() => {
          ;[...event.changes]
            .sort((left, right) => right.rangeOffset - left.rangeOffset)
            .forEach(change => {
              this.yText.delete(change.rangeOffset, change.rangeLength)
              this.yText.insert(change.rangeOffset, change.text)
            })
        }, this)
      })
    })

    this.monacoDisposeHandler = this.monacoModel.onWillDispose(() => {
      this.destroy()
    })
  }

  destroy() {
    this.monacoChangeHandler.dispose()
    this.monacoDisposeHandler.dispose()
    this.yText.unobserve(this.yTextObserver)
    this.doc.off('beforeAllTransactions', this.beforeTransaction)
  }
}
