import * as mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const MAMMOTH_OPTIONS = {
  styleMap: [
    "u => u", // Giữ lại gạch chân <u>
    "b => b", // Giữ lại in đậm <b>
    "r[style*='yellow'] => mark", // Giữ lại highlight vàng <mark>
    "r[style*='highlight'] => mark",
    "highlight => mark",
  ],
};

export async function extractTextFromFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();

  if (extension === "docx") {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      MAMMOTH_OPTIONS,
    );

    // DEBUG: In ra HTML thô để kiểm tra
    console.log("=== [DEBUG] RAW HTML FROM DOCX ===");
    console.log(result.value);

    return { type: "html", content: result.value };
  } else if (extension === "pdf") {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join("\n");
      fullText += pageText + "\n";
    }
    return { type: "text", content: fullText };
  } else {
    throw new Error("Chỉ hỗ trợ file .docx hoặc .pdf");
  }
}

function isCorrectElement(el) {
  if (!el) return false;
  const tag = el.tagName ? el.tagName.toUpperCase() : "";
  const style = el.getAttribute("style") || "";

  const isMark = tag === "MARK";
  const isUnderline = tag === "U";
  const isBold = tag === "B" || tag === "STRONG";
  const isRed =
    /color\s*:\s*(red|#f00|#ff0000|rgb\(\s*255\s*,\s*0\s*,\s*0\s*\))/i.test(
      style,
    );

  return isMark || isUnderline || isBold || isRed;
}

export function parseExamContent(fileData) {
  let titleFromContent = "";
  let rawBlocks = [];

  if (fileData.type === "html") {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = fileData.content;

    // Đánh dấu [CORRECT] nếu phần tử có Highlight/Gạch chân/Red/Bold
    tempDiv
      .querySelectorAll("mark, u, b, strong, span, p, li")
      .forEach((el) => {
        if (isCorrectElement(el)) {
          el.textContent = `[CORRECT]${el.textContent}[/CORRECT]`;
        }
      });

    // Lấy danh sách các dòng bao gồm cả danh sách <li> từ Numbering
    const nodes = tempDiv.querySelectorAll("p, li, h1, h2, h3, div");
    if (nodes.length > 0) {
      nodes.forEach((node) => {
        const text = node.innerText ? node.innerText.trim() : "";
        if (text) rawBlocks.push(text);
      });
    } else {
      rawBlocks = tempDiv.innerText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    }
  } else {
    rawBlocks = fileData.content
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  }

  console.log("=== [DEBUG] PARSED RAW BLOCKS ===", rawBlocks);

  if (rawBlocks.length === 0) {
    return { title: "", questions: [] };
  }

  const questionRegex = /^(câu\s*\d+|question\s*\d+|\d+[\.\:\)])/i;
  let startIndex = 0;

  // Nếu dòng 1 không phải "Câu X" -> Đặt làm Tiêu đề
  if (!questionRegex.test(rawBlocks[0])) {
    titleFromContent = rawBlocks[0].replace(/\[\/?CORRECT\]/g, "").trim();
    startIndex = 1;
  }

  const questions = [];
  let currentQ = null;

  const optionRegex = /^([\*]*)\s*([a-d])[\.\:\)\/]\s*(.*)/i;

  for (let i = startIndex; i < rawBlocks.length; i++) {
    const line = rawBlocks[i];

    // Phát hiện Bắt đầu Câu hỏi mới
    if (questionRegex.test(line)) {
      if (currentQ && currentQ.text && currentQ.options.length >= 2) {
        questions.push(currentQ);
      }

      const cleanText = line
        .replace(/^(câu\s*\d+|question\s*\d+|\d+)[\.\:\)]\s*/i, "")
        .replace(/\[\/?CORRECT\]/g, "")
        .trim();

      currentQ = {
        id: "q_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        text: cleanText,
        options: [],
        answer: 0,
      };
      continue;
    }

    if (!currentQ) continue;

    // Phân tích dòng Phương án
    const isCorrectMarked = line.includes("[CORRECT]");
    const isStarred = line.startsWith("*");

    let cleanOptionText = line
      .replace(/\[\/?CORRECT\]/g, "")
      .replace(/^\*\s*/, "")
      .trim();

    // Loại bỏ chữ cái A., B., C., D. ở đầu nếu có
    const optMatch = cleanOptionText.match(optionRegex);
    if (optMatch) {
      cleanOptionText = optMatch[3].trim();
    }

    if (cleanOptionText.length > 0) {
      currentQ.options.push(cleanOptionText);

      // Nếu chứa dấu hiệu đáp án đúng -> Nhận diện câu này đúng
      if (isCorrectMarked || isStarred) {
        currentQ.answer = currentQ.options.length - 1;
      }
    }
  }

  if (currentQ && currentQ.text && currentQ.options.length >= 2) {
    questions.push(currentQ);
  }

  console.log("=== [DEBUG] FINAL QUESTIONS RESULT ===", questions);

  return {
    title: titleFromContent,
    questions: questions,
  };
}
