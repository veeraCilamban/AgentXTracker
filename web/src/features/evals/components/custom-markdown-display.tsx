import React from "react";

// Simple markdown renderer for basic markdown elements
const renderMarkdown = (text) => {
  if (!text) return "";

  // Split by lines and process each line
  const lines = text.split("\n");
  const elements = [];
  let currentIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headers - remove markdown symbols
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={currentIndex++} className="mb-2 text-lg font-semibold">
          {line.substring(4).replace(/\*\*/g, "")}
        </h3>,
      );
    } else if (line.startsWith("#### ")) {
      elements.push(
        <h4 key={currentIndex++} className="mb-1 mt-3 text-base font-medium">
          {line.substring(5).replace(/\*\*/g, "")}
        </h4>,
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1 key={currentIndex++} className="mb-3 mt-4 text-xl font-bold">
          {line.substring(2).replace(/\*\*/g, "")}
        </h1>,
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={currentIndex++} className="mb-2 mt-4 text-lg font-semibold">
          {line.substring(3).replace(/\*\*/g, "")}
        </h2>,
      );
    }
    // Horizontal rule
    else if (line.trim() === "---") {
      elements.push(<hr key={currentIndex++} className="my-4 border-border" />);
    }
    // Bold text (simple **text** format) - remove stars and make bold
    else if (line.includes("**")) {
      const parts = line.split("**");
      const processedParts = parts.map((part, index) => {
        if (index % 2 === 1) {
          return (
            <strong key={index} className="font-semibold">
              {part}
            </strong>
          );
        }
        return part;
      });
      elements.push(
        <p key={currentIndex++} className="mb-2">
          {processedParts}
        </p>,
      );
    }
    // Empty line
    else if (line.trim() === "") {
      elements.push(<div key={currentIndex++} className="h-1"></div>);
    }
    // Regular paragraph
    else if (line.trim()) {
      elements.push(
        <p key={currentIndex++} className="mb-2">
          {line}
        </p>,
      );
    }
  }

  return elements;
};

export const MarkdownResultsDisplay = ({ result }) => {
  if (!result) return null;

  // Extract markdown content from the result
  let markdownContent = "";

  if (typeof result === "string") {
    markdownContent = result;
  } else if (result && typeof result === "object" && result.evaluation) {
    // Extract the evaluation string and process escape characters
    markdownContent = result.evaluation.replace(/\\n/g, "\n");
  } else {
    // Fallback to JSON display
    markdownContent = JSON.stringify(result, null, 2);
  }

  return (
    <div className="mt-5">
      <div className="rounded-md border p-4">
        <div className="prose prose-sm max-w-none">
          {renderMarkdown(markdownContent)}
        </div>
      </div>
    </div>
  );
};
