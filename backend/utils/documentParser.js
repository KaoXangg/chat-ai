import zlib from "node:zlib";

const MAX_EXTRACTED_CHARS = 28_000;

function decodeXmlEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
}

/**
 * Bóc tách văn bản từ file .docx (ZIP chứa word/document.xml) bằng node:zlib tích hợp sẵn.
 */
export function extractDocxText(buffer) {
  let offset = 0;
  const chunks = [];

  while (offset + 30 <= buffer.length) {
    const signature = buffer.readUInt32LE(offset);
    if (signature !== 0x04034b50) {
      offset += 1;
      continue;
    }

    const compressionMethod = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraFieldLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + fileNameLength + extraFieldLength;

    if (dataStart > buffer.length) break;
    const fileName = buffer.subarray(nameStart, nameStart + fileNameLength).toString("utf8");

    let nextOffset = dataStart + compressedSize;
    if (compressedSize === 0 && fileName === "word/document.xml") {
      // Nếu dùng Data Descriptor, tìm PK header tiếp theo
      const nextSig = buffer.indexOf(Buffer.from([0x50, 0x4b]), dataStart);
      if (nextSig !== -1) nextOffset = nextSig;
    }

    if (fileName === "word/document.xml") {
      const rawSlice = buffer.subarray(dataStart, Math.min(buffer.length, nextOffset));
      let xml = "";
      if (compressionMethod === 0) {
        xml = rawSlice.toString("utf8");
      } else if (compressionMethod === 8) {
        try {
          xml = zlib.inflateRawSync(rawSlice).toString("utf8");
        } catch {
          // Thử cắt ngắn nếu có data descriptor ở cuối
          for (let trim = 1; trim <= 24 && rawSlice.length > trim; trim++) {
            try {
              xml = zlib.inflateRawSync(rawSlice.subarray(0, rawSlice.length - trim)).toString("utf8");
              break;
            } catch {
              // continue
            }
          }
        }
      }

      if (xml) {
        const cleaned = decodeXmlEntities(
          xml
            .replace(/<\/w:p>/g, "\n")
            .replace(/<w:br[^>]*\/>/g, "\n")
            .replace(/<w:tab[^>]*\/>/g, "\t")
            .replace(/<[^>]+>/g, "")
        )
          .replace(/\r\n/g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
        chunks.push(cleaned);
      }
      break;
    }

    offset = Math.max(offset + 4, nextOffset);
  }

  return chunks.join("\n\n").slice(0, MAX_EXTRACTED_CHARS);
}

function decodePdfLiteralString(raw) {
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

function decodePdfHexString(hex) {
  const clean = hex.replace(/\s+/g, "");
  if (!clean) return "";
  const buf = Buffer.from(clean.length % 2 === 0 ? clean : clean + "0", "hex");
  // Kiểm tra UTF-16BE BOM (FE FF)
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const chars = [];
    for (let i = 2; i + 1 < buf.length; i += 2) {
      chars.push(String.fromCharCode(buf.readUInt16BE(i)));
    }
    return chars.join("");
  }
  return buf.toString("latin1");
}

function extractTextFromPdfContentStream(streamText) {
  const parts = [];
  const btBlocks = streamText.match(/BT[\s\S]*?ET/g) || [streamText];

  for (const block of btBlocks) {
    // 1. Mảng TJ: [(...) -20 (...) <...>] TJ
    const tjArrays = block.matchAll(/\[([\s\S]*?)\]\s*TJ/g);
    for (const match of tjArrays) {
      const inner = match[1];
      const tokens = inner.matchAll(/\((?:\\.|[^\\)])*\)|<([0-9A-Fa-f\s]+)>/g);
      let line = "";
      for (const tok of tokens) {
        if (tok[0].startsWith("(")) {
          line += decodePdfLiteralString(tok[0].slice(1, -1));
        } else if (tok[1]) {
          line += decodePdfHexString(tok[1]);
        }
      }
      if (line.trim()) parts.push(line);
    }

    // 2. Chuỗi đơn (...) Tj hoặc ' hoặc "
    const singleTj = block.matchAll(/\(((?:\\.|[^\\)])*)\)\s*(?:Tj|'|")/g);
    for (const match of singleTj) {
      const decoded = decodePdfLiteralString(match[1]);
      if (decoded.trim()) parts.push(decoded);
    }

    // 3. Chuỗi hex <...> Tj
    const hexTj = block.matchAll(/<([0-9A-Fa-f\s]+)>\s*Tj/g);
    for (const match of hexTj) {
      const decoded = decodePdfHexString(match[1]);
      if (decoded.trim()) parts.push(decoded);
    }
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Bóc tách văn bản từ file .pdf bằng cách giải nén các FlateDecode stream và đọc toán tử văn bản PDF.
 */
export function extractPdfText(buffer) {
  const rawLatin1 = buffer.toString("latin1");
  const extractedSections = [];

  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  while ((match = streamRegex.exec(rawLatin1)) !== null) {
    const startIdx = match.index + match[0].indexOf("\n") + 1;
    const endIdx = match.index + match[0].lastIndexOf("endstream");
    let slice = buffer.subarray(startIdx, endIdx);
    if (slice.length > 0 && slice[slice.length - 1] === 0x0a) slice = slice.subarray(0, slice.length - 1);
    if (slice.length > 0 && slice[slice.length - 1] === 0x0d) slice = slice.subarray(0, slice.length - 1);

    let contentStr = "";
    try {
      contentStr = zlib.inflateSync(slice).toString("latin1");
    } catch {
      try {
        contentStr = zlib.inflateRawSync(slice).toString("latin1");
      } catch {
        contentStr = slice.toString("latin1");
      }
    }

    if (contentStr && (contentStr.includes("Tj") || contentStr.includes("TJ"))) {
      const text = extractTextFromPdfContentStream(contentStr);
      if (text) extractedSections.push(text);
    }
  }

  const combined = extractedSections.join("\n").trim();
  if (combined) return combined.slice(0, MAX_EXTRACTED_CHARS);

  // Fallback nếu PDF lưu chuỗi trực tiếp không qua stream nén
  const fallback = extractTextFromPdfContentStream(rawLatin1);
  return fallback.slice(0, MAX_EXTRACTED_CHARS);
}

/**
 * Bóc tách văn bản từ tệp tải lên (base64) dựa theo phần mở rộng / mimeType.
 */
export function extractDocumentContent({ fileName = "", mimeType = "", base64Data = "" }) {
  if (!base64Data || typeof base64Data !== "string") {
    throw new Error("Dữ liệu tệp đính kèm trống.");
  }

  const cleanBase64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data.trim();
  const buffer = Buffer.from(cleanBase64, "base64");
  if (buffer.length > 8 * 1024 * 1024) {
    throw new Error("Tệp đính kèm quá lớn (tối đa 8MB).");
  }

  const ext = String(fileName).split(".").pop()?.toLowerCase() || "";
  const mime = String(mimeType).toLowerCase();

  let content = "";
  if (ext === "docx" || mime.includes("officedocument.wordprocessingml.document")) {
    content = extractDocxText(buffer);
    if (!content) {
      throw new Error("Không tìm thấy nội dung văn bản trong tệp DOCX này.");
    }
  } else if (ext === "pdf" || mime === "application/pdf") {
    content = extractPdfText(buffer);
    if (!content) {
      throw new Error("Không trích xuất được chữ từ tệp PDF (có thể là PDF dạng ảnh quét/scan). Hãy chụp ảnh trang tài liệu để dùng tính năng Vision.");
    }
  } else {
    content = buffer.toString("utf8").replace(/\u0000/g, "").trim();
  }

  const truncated = content.length > MAX_EXTRACTED_CHARS;
  const sliced = content.slice(0, MAX_EXTRACTED_CHARS);
  return {
    fileName,
    charCount: content.length,
    truncated,
    content: sliced,
    text: sliced,
  };
}
