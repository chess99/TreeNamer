import { diff_match_patch } from 'diff-match-patch';
import { useEffect, useState } from 'react';

interface DiffViewerProps {
  original: string;
  modified: string;
}

interface DiffLine {
  text: string;
  type: 'add' | 'delete' | 'equal';
}

const DiffViewer = ({ original, modified }: DiffViewerProps) => {
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);

  useEffect(() => {
    const dmp = new diff_match_patch();
    const diffs = dmp.diff_main(original, modified);
    dmp.diff_cleanupSemantic(diffs);

    // Convert diff to lines
    const lines: DiffLine[] = [];
    
    diffs.forEach((diff) => {
      const [type, text] = diff;
      const diffType = type === -1 ? 'delete' : type === 1 ? 'add' : 'equal';
      
      // Split text into lines
      const textLines = text.split('\n');
      textLines.forEach((line: string, index: number) => {
        // Add newline character back except for the last line
        const lineText = index < textLines.length - 1 ? line + '\n' : line;
        if (lineText.length > 0) {
          lines.push({ text: lineText, type: diffType });
        }
      });
    });

    setDiffLines(lines);
  }, [original, modified]);

  return (
    <div className="diff-viewer">
      <pre>
        {diffLines.map((line, index) => (
          <div 
            key={index} 
            className={`diff-line ${line.type === 'add' ? 'diff-add' : line.type === 'delete' ? 'diff-del' : ''}`}
          >
            {line.type === 'add' ? '+ ' : line.type === 'delete' ? '- ' : '  '}
            {line.text}
          </div>
        ))}
      </pre>
    </div>
  );
};

export default DiffViewer; 