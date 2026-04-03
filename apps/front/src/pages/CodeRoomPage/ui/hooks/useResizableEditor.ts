import { useEffect, useRef, useState } from 'react';

export function useResizableEditor() {
  const [editorWidth, setEditorWidth] = useState(50);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const isResizing = useRef(false);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing.current) {
        return;
      }

      const minEditor = 10;
      const maxEditor = 90;
      const container = editorContainerRef.current;
      if (!container) {
        return;
      }
      const rect = container.getBoundingClientRect();
      const next = ((event.clientX - rect.left) / rect.width) * 100;
      setEditorWidth(Math.min(maxEditor, Math.max(minEditor, next)));
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  const startResize = () => {
    if (window.innerWidth <= 768) {
      return;
    }
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return {
    editorWidth,
    editorContainerRef,
    startResize,
  };
}
