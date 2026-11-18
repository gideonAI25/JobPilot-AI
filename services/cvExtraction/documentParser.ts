import mammoth from 'mammoth';

export interface ParsedDocument {
  rawText: string;
  charCount: number;
  mimeType: string;
  originalFilename: string;
}

// Ensure DOMMatrix and browser canvas primitives are safely polyfilled in Node.js
if (typeof globalThis !== 'undefined') {
  if (!globalThis.DOMMatrix) {
    class NodeDOMMatrix {
      a = 1;
      b = 0;
      c = 0;
      d = 1;
      e = 0;
      f = 0;
      m11 = 1;
      m12 = 0;
      m13 = 0;
      m14 = 0;
      m21 = 0;
      m22 = 1;
      m23 = 0;
      m24 = 0;
      m31 = 0;
      m32 = 0;
      m33 = 1;
      m34 = 0;
      m41 = 0;
      m42 = 0;
      m43 = 0;
      m44 = 1;
      is2D = true;
      isIdentity = true;

      constructor(init?: number[] | string | Record<string, number>) {
        if (Array.isArray(init)) {
          if (init.length >= 6) {
            this.a = this.m11 = init[0] ?? 1;
            this.b = this.m12 = init[1] ?? 0;
            this.c = this.m21 = init[2] ?? 0;
            this.d = this.m22 = init[3] ?? 1;
            this.e = this.m41 = init[4] ?? 0;
            this.f = this.m42 = init[5] ?? 0;
          }
        }
      }

      translate(_tx = 0, _ty = 0) {
        return this;
      }
      scale(_sx = 1, _sy = _sx) {
        return this;
      }
      multiply(_other: unknown) {
        return this;
      }
      multiplySelf(_other: unknown) {
        return this;
      }
      preMultiplySelf(_other: unknown) {
        return this;
      }
      invertSelf() {
        return this;
      }
      transformPoint(point: unknown) {
        return point;
      }
    }

    (globalThis as unknown as { DOMMatrix: typeof NodeDOMMatrix }).DOMMatrix = NodeDOMMatrix;
  }

  if (!(globalThis as unknown as { ImageData?: unknown }).ImageData) {
    class NodeImageData {
      width: number;
      height: number;
      data: Uint8ClampedArray;
      constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.data = new Uint8ClampedArray(width * height * 4);
      }
    }
    (globalThis as unknown as { ImageData: typeof NodeImageData }).ImageData = NodeImageData;
  }
}

/**
 * Extracts raw textual content from uploaded PDF or DOCX file buffers.
 */
export async function parseDocumentBuffer(
  buffer: Buffer,
  filename: string,
  declaredMimeType?: string
): Promise<ParsedDocument> {
  const ext = filename.split('.').pop()?.toLowerCase();

  let text = '';
  let resolvedMime = declaredMimeType || 'application/octet-stream';

  if (ext === 'pdf' || declaredMimeType === 'application/pdf') {
    resolvedMime = 'application/pdf';

    let extractionError: Error | null = null;

    // Primary: unpdf (Node & serverless native extractor without canvas/DOM requirements)
    try {
      const { extractText } = await import('unpdf');
      const result = await extractText(new Uint8Array(buffer), { mergePages: true });
      text = typeof result.text === 'string' ? result.text : String(result.text || '');
    } catch (unpdfErr) {
      console.warn('unpdf parser encountered an issue, trying pdf-parse fallback:', unpdfErr);
      extractionError = unpdfErr instanceof Error ? unpdfErr : new Error(String(unpdfErr));
    }

    // Fallback: pdf-parse with DOMMatrix polyfill
    if (!text) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { PDFParse } = require('pdf-parse');
        const parser = new PDFParse({ data: buffer });
        const parsed = await parser.getText();
        text = parsed?.text || '';
        if (typeof parser.destroy === 'function') {
          await parser.destroy();
        }
      } catch (pdfParseErr) {
        console.error('pdf-parse fallback also failed:', pdfParseErr);
        throw new Error(
          `Failed to parse PDF document: ${
            extractionError?.message ||
            (pdfParseErr instanceof Error
              ? pdfParseErr.message
              : 'Corrupted or unreadable PDF file')
          }`
        );
      }
    }
  } else if (
    ext === 'docx' ||
    declaredMimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    resolvedMime =
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    try {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || '';
    } catch (docxErr) {
      console.error('Error parsing DOCX buffer:', docxErr);
      throw new Error(
        `Failed to parse DOCX document: ${
          docxErr instanceof Error ? docxErr.message : 'Corrupted or unreadable DOCX file'
        }`
      );
    }
  } else {
    throw new Error(
      `Unsupported document format (.${ext}). Only PDF (.pdf) and DOCX (.docx) documents are supported.`
    );
  }

  // Normalize line endings and clean up excessive whitespace
  const sanitizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // remove control chars
    .trim();

  if (!sanitizedText || sanitizedText.length < 20) {
    throw new Error(
      'The uploaded document contains insufficient or unreadable text. Please ensure it is not a scanned image without OCR.'
    );
  }

  return {
    rawText: sanitizedText,
    charCount: sanitizedText.length,
    mimeType: resolvedMime,
    originalFilename: filename,
  };
}
