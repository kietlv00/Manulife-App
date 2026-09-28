import * as mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import JSZip from "jszip";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const MAMMOTH_OPTIONS = {
  ignoreEmptyParagraphs: true,
  styleMap: [
    "u => u",
    "r[style*='yellow'] => mark",
    "r[style*='highlight'] => mark",
    "highlight => mark",
    "r[style*='color'] => span.styled-color",
    "p[style*='color'] => span.styled-color"
  ]
};

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const XML_NS = { w: W_NS };

function xmlParser() {
  return new DOMParser();
}

function getXmlAttr(node, name) {
  return node?.getAttributeNS?.(W_NS, name) ?? node?.getAttribute?.(`w:${name}`) ?? "";
}

function firstElement(parent, selector) {
  return parent?.querySelector?.(selector) || null;
}

function parseNumberingDefinitions(numberingXml) {
  const doc = xmlParser().parseFromString(numberingXml, "application/xml");
  const definitions = new Map();
  const abstracts = new Map();

  doc.querySelectorAll("abstractNum").forEach((abstractNum) => {
    const abstractId = getXmlAttr(abstractNum, "abstractNumId");
    const levels = new Map();

    abstractNum.querySelectorAll(":scope > lvl").forEach((lvl) => {
      const ilvl = getXmlAttr(lvl, "ilvl");
      const numFmtNode = firstElement(lvl, "numFmt");
      const lvlTextNode = firstElement(lvl, "lvlText");

      levels.set(ilvl, {
        format: getXmlAttr(numFmtNode, "val"),
        text: getXmlAttr(lvlTextNode, "val")
      });
    });

    abstracts.set(abstractId, levels);
  });

  doc.querySelectorAll("num").forEach((num) => {
    const numId = getXmlAttr(num, "numId");
    const abstractIdNode = firstElement(num, "abstractNumId");
    const abstractId = getXmlAttr(abstractIdNode, "val");
    definitions.set(numId, abstracts.get(abstractId) || new Map());
  });

  return definitions;
}

function getParagraphNumbering(paragraph, numberingDefinitions) {
  const numPr = firstElement(paragraph, "pPr > numPr");
  if (!numPr) return null;

  const ilvlNode = firstElement(numPr, "ilvl");
  const numIdNode = firstElement(numPr, "numId");
  const ilvl = getXmlAttr(ilvlNode, "val") || "0";
  const numId = getXmlAttr(numIdNode, "val");

  if (!numId) return null;

  const level = numberingDefinitions.get(numId)?.get(ilvl);

  return {
    numId,
    level: Number(ilvl),
    format: level?.format || "",
    markerPattern: level?.text || ""
  };
}

function getParagraphText(paragraph) {
  let text = "";
  paragraph.querySelectorAll("t, tab, br, cr").forEach((node) => {
    const name = node.localName;
    if (name === "tab") text += "\t";
    else if (name === "br" || name === "cr") text += "\n";
    else text += node.textContent || "";
  });
  return text.replace(/\s+/g, " ").trim();
}

function paragraphHasCorrectMark(paragraph) {
  // Support the same signals as the previous HTML parser:
  // red font, highlight/underline.
  for (const run of paragraph.querySelectorAll("r")) {
    const color = firstElement(run, "rPr > color");
    const highlight = firstElement(run, "rPr > highlight");
    const underline = firstElement(run, "rPr > u");

    const colorValue = getXmlAttr(color, "val").toLowerCase();
    const highlightValue = getXmlAttr(highlight, "val").toLowerCase();

    if (
      ["red", "ff0000", "e53935", "d32f2f", "c62828", "b71c1c", "fe0000"].includes(colorValue) ||
      /red|ff0000/.test(colorValue) ||
      !!highlight ||
      !!underline && getXmlAttr(underline, "val") !== "none"
    ) {
      return true;
    }
  }

  return false;
}

async function extractDocxItems(arrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const documentXml = await zip.file("word/document.xml")?.async("string");
  const numberingXml = await zip.file("word/numbering.xml")?.async("string");

  if (!documentXml) {
    throw new Error("File Word không chứa word/document.xml hợp lệ.");
  }

  const document = xmlParser().parseFromString(documentXml, "application/xml");
  const numberingDefinitions = numberingXml
    ? parseNumberingDefinitions(numberingXml)
    : new Map();

  const body = firstElement(document, "body");
  if (!body) return [];

  const items = [];
  body.childNodes.forEach((node) => {
    if (node.nodeType !== 1 || node.localName !== "p") return;

    const text = getParagraphText(node);
    if (!text) return;

    const numbering = getParagraphNumbering(node, numberingDefinitions);
    const styleNode = firstElement(node, "pPr > pStyle");
    const styleId = getXmlAttr(styleNode, "val");

    items.push({
      text,
      isCorrect: paragraphHasCorrectMark(node),
      numbering,
      styleId,
      source: "docx"
    });
  });

  return items;
}

export async function extractTextFromFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();

  if (extension === "docx") {
    const arrayBuffer = await file.arrayBuffer();

    // Read the DOCX structure directly so Word numbering (1., A., etc.)
    // is not lost before the exam parser sees it.
    const items = await extractDocxItems(arrayBuffer);

    return { type: "items", items };
  }

  if (extension === "pdf") {
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
  }

  throw new Error("Chỉ hỗ trợ file .docx hoặc .pdf");
}

// Bắt màu đỏ ở mọi thuộc tính HTML (giữ cho PDF/HTML fallback).
function checkRedColor(node) {
  if (!node) return false;
  const html = node.outerHTML || "";
  const style = node.getAttribute ? (node.getAttribute("style") || "") : "";
  const color = node.getAttribute ? (node.getAttribute("color") || "") : "";

  const redRegex = /(red|#f00|#ff0000|#e53935|#d32f2f|#c62828|#b71c1c|#fe0000|rgb\(\s*(2[0-5][0-5]|1\d\d|[1-9]?\d)\s*,\s*0\s*,\s*0\s*\))/i;

  return redRegex.test(html) || redRegex.test(style) || redRegex.test(color);
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

// Explicit question markers: Câu 1:, Question 1:, 1., 1), 1:, ...
const questionRegex = /^(?:câu\s*)?\d+\s*[\.\:\)]\s+/i;
const questionWordRegex = /^(?:câu\s+\d+|question\s+\d+)\b\s*[:\.\)\/\-]?\s*/i;

// Explicit answer markers: A., A), A:, A/ ...
const optionPrefixRegex = /^\s*\*?\s*([a-z])\s*[\.\:\)\/\-]\s+(.*)$/i;

function isExplicitQuestion(text) {
  return questionRegex.test(text) || questionWordRegex.test(text);
}

function isExplicitOption(text) {
  return optionPrefixRegex.test(text);
}

function stripQuestionPrefix(text) {
  return normalizeText(
    text
      .replace(questionWordRegex, "")
      .replace(questionRegex, "")
  );
}

function stripOptionPrefix(text) {
  const match = normalizeText(text).match(optionPrefixRegex);
  return match ? normalizeText(match[2]) : normalizeText(text).replace(/^\*\s*/, "");
}

function createQuestion(text) {
  return {
    id: "q_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    text: normalizeText(text),
    options: [],
    answer: 0
  };
}

function pushCurrentQuestion(questions, currentQ) {
  if (!currentQ || !currentQ.text) return;

  // A valid imported question needs at least two choices.
  if (currentQ.options.length >= 2) {
    questions.push(currentQ);
  }
}

function styleLooksLikeQuestion(item) {
  const style = String(item.styleId || "").toLowerCase();
  return /cauhoi|cau-hoi|câu hỏi|question/.test(style);
}

function styleLooksLikeOption(item) {
  const style = String(item.styleId || "").toLowerCase();
  return style === "listparagraph" || style.includes("dapan") || style.includes("dap-an") || style.includes("option");
}

function numberingLooksLikeQuestion(item) {
  const numbering = item.numbering;
  if (!numbering) return false;

  // Word's decimal list is the natural representation for question numbers.
  if (numbering.format === "decimal") return true;

  // A few documents use a decimal marker but leave the format metadata incomplete.
  return /^%\d+\.?$/.test(numbering.markerPattern || "");
}

function numberingLooksLikeOption(item) {
  const numbering = item.numbering;
  if (!numbering) return false;

  return [
    "upperLetter",
    "lowerLetter"
  ].includes(numbering.format);
}

function buildRawItemsFromHtml(html) {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  const nodes = tempDiv.querySelectorAll("p, li, h1, h2, h3, tr");
  const rawItems = [];

  nodes.forEach((node) => {
    const text = normalizeText(node.innerText || node.textContent || "");
    if (!text) return;

    const isRed = checkRedColor(node) || Array.from(node.querySelectorAll("*")).some(checkRedColor);
    const isMark = node.querySelector("mark, u") !== null;

    rawItems.push({
      text,
      isCorrect: isRed || isMark,
      numbering: null,
      source: "html"
    });
  });

  return rawItems;
}

function buildRawItems(fileData) {
  if (fileData.type === "items") {
    return fileData.items.map((item) => ({
      ...item,
      text: normalizeText(item.text)
    })).filter((item) => item.text);
  }

  if (fileData.type === "html") {
    return buildRawItemsFromHtml(fileData.content);
  }

  const lines = fileData.content
    .split("\n")
    .map(normalizeText)
    .filter(Boolean);

  return lines.map((text) => ({
    text,
    isCorrect: text.startsWith("*") || text.endsWith("*"),
    numbering: null,
    source: "text"
  }));
}

export function parseExamContent(fileData) {
  const rawItems = buildRawItems(fileData);

  if (rawItems.length === 0) {
    return { title: "", questions: [] };
  }

  let titleFromContent = "";
  let startIndex = 0;

  // A short first line that is not a question is treated as the exam title.
  if (
    rawItems[0] &&
    !isExplicitQuestion(rawItems[0].text) &&
    !numberingLooksLikeQuestion(rawItems[0]) &&
    rawItems[0].text.length < 100 &&
    (!styleLooksLikeQuestion(rawItems[0]) || /^đề\b/i.test(rawItems[0].text))
  ) {
    titleFromContent = rawItems[0].text;
    startIndex = 1;
  }

  const questions = [];
  let currentQ = null;
  let hasSeenAnyQuestion = false;

  for (let i = startIndex; i < rawItems.length; i++) {
    const item = rawItems[i];
    const text = item.text;

    const isOptionLine =
      isExplicitOption(text) ||
      numberingLooksLikeOption(item) ||
      styleLooksLikeOption(item);

    const isQuestionLine =
      !isOptionLine &&
      (isExplicitQuestion(text) ||
        numberingLooksLikeQuestion(item) ||
        styleLooksLikeQuestion(item));

    // IMPORTANT: answer detection has priority.
    // Some valid answers start with a number/date, e.g. "1 tỷ đồng."
    // or "29/04/2024". They must never become a new question.
    if (isQuestionLine) {
      pushCurrentQuestion(questions, currentQ);

      currentQ = createQuestion(stripQuestionPrefix(text));
      hasSeenAnyQuestion = true;
      continue;
    }

    // If the document has not exposed a question marker at all, keep the
    // old behaviour as a fallback: the first non-title line becomes a question.
    if (!currentQ && !hasSeenAnyQuestion) {
      currentQ = createQuestion(text);
      hasSeenAnyQuestion = true;
      continue;
    }

    if (!currentQ) continue;

    if (isOptionLine) {
      const optionText = stripOptionPrefix(text);
      if (!optionText) continue;

      currentQ.options.push(optionText);
      if (item.isCorrect) {
        currentQ.answer = currentQ.options.length - 1;
      }
      continue;
    }

    // Continuation line:
    // - Before the first option, it belongs to the question text.
    // - After options have started, it is a wrapped option line.
    if (currentQ.options.length === 0) {
      currentQ.text = normalizeText(`${currentQ.text} ${text}`);
    } else {
      const lastIndex = currentQ.options.length - 1;
      currentQ.options[lastIndex] = normalizeText(`${currentQ.options[lastIndex]} ${text}`);
    }
  }

  pushCurrentQuestion(questions, currentQ);

  return {
    title: titleFromContent || "Đề thi Import",
    questions
  };
}
