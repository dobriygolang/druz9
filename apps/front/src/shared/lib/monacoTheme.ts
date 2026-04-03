export const APP_MONACO_THEME = 'druz9-dark';

export function configureAppMonacoTheme(monaco: any) {
  if (!monaco?.editor?.defineTheme) {
    return;
  }

  monaco.editor.defineTheme(APP_MONACO_THEME, {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#141821',
      'editorGutter.background': '#141821',
      'editorLineNumber.background': '#141821',
      'editor.lineHighlightBackground': '#1b2130',
      'editorLineNumber.foreground': '#6b7280',
      'editorCursor.foreground': '#c7d2fe',
      'editor.selectionBackground': '#2a3250',
      'editor.inactiveSelectionBackground': '#21283d',
      'scrollbarSlider.background': '#2c344a88',
      'scrollbarSlider.hoverBackground': '#39425f',
      'scrollbarSlider.activeBackground': '#4a567d',
    },
  });
}
