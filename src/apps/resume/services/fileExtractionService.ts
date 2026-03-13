import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

function normalizeLetterSpacing(text: string): string {
  return text.replace(
    /^([A-Z](?:\s[A-Z]){2,}(?:\s{2,}[A-Z](?:\s[A-Z]){2,})*)$/gm,
    (match) => {
      return match
        .split(/\s{2,}/)
        .map(word => word.replace(/\s/g, ''))
        .join(' ');
    }
  );
}

const extractPdfText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const textItems = textContent.items.filter(
      (item): item is import('pdfjs-dist/types/src/display/api').TextItem => 'str' in item
    );
    if (textItems.length === 0) continue;

    const lineChunks: string[] = [];
    let lastY: number | null = null;
    let lastX: number | null = null;
    let lastWidth: number | null = null;

    for (const item of textItems) {
      const currentY = item.transform[5];
      const currentX = item.transform[4];

      if (lastY !== null && Math.abs(currentY - lastY) > item.height * 0.3) {
        lineChunks.push('\n');
        lastX = null;
        lastWidth = null;
      } else if (lastX !== null && lastWidth !== null) {
        const gap = currentX - (lastX + lastWidth);
        const spaceThreshold = item.height * 0.25;
        if (gap > spaceThreshold) {
          lineChunks.push(' ');
        }
      }

      lineChunks.push(item.str);

      lastY = currentY;
      lastX = currentX;
      lastWidth = item.width;

      if (item.hasEOL) {
        lineChunks.push('\n');
        lastX = null;
        lastWidth = null;
      }
    }
    pageTexts.push(lineChunks.join(''));
  }
  return normalizeLetterSpacing(pageTexts.join('\n\n'));
};

const extractDocxText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

const getFileExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toLowerCase() || '';
};

export const fileExtractionService = {
  async extractText(file: File): Promise<string> {
    const extension = getFileExtension(file.name);

    switch (extension) {
      case 'pdf': {
        const arrayBuffer = await readFileAsArrayBuffer(file);
        return extractPdfText(arrayBuffer);
      }
      case 'docx':
      case 'doc': {
        const arrayBuffer = await readFileAsArrayBuffer(file);
        return extractDocxText(arrayBuffer);
      }
      case 'txt': {
        return readFileAsText(file);
      }
      default:
        throw new Error(`Unsupported file type: .${extension}. Please upload a PDF, DOCX, or TXT file.`);
    }
  },
};
