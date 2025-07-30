import { type NextRequest, NextResponse } from "next/server";

// Types for API responses
type ValidationResponse = {
  session_id: string;
  filled_prompt_preview: string;
  message: string;
};

type EvaluationResult = Record<string, unknown> | string;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case "validate":
        return await handleValidation(data);
      case "evaluate":
        return await handleEvaluation(data);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function handleValidation(data: {
  evaluationType: string;
  prompt: string;
  selectedItems: string[];
  selectedTrace: any;
  uploadedJson?: any;
}) {
  const { evaluationType, prompt, selectedItems, selectedTrace, uploadedJson } =
    data;

  const formData = new FormData();

  // Determine the API endpoint based on evaluation type
  const isQualityEval = evaluationType === "autox-agent-quality";
  const endpoint = isQualityEval
    ? "http://10.0.0.141:8000/process-and-preview-quality"
    : "http://10.0.0.141:8000/process-and-preview-performance";

  // Add prompt template
  formData.append("prompt_template", prompt);

  // Add selected variables
  formData.append("selected_vars", JSON.stringify(selectedItems));

  if (isQualityEval) {
    // For quality evaluation - need both current and default trace
    if (!uploadedJson) {
      return NextResponse.json(
        { error: "Please upload a default trace file for quality evaluation" },
        { status: 400 },
      );
    }

    // Create current trace file
    const currentTraceFile = new Blob([JSON.stringify(selectedTrace)], {
      type: "application/json",
    });
    formData.append(
      "current_trace_file",
      currentTraceFile,
      "current_trace.json",
    );

    // Create default trace file from uploaded JSON
    const defaultTraceFile = new Blob([JSON.stringify(uploadedJson)], {
      type: "application/json",
    });
    formData.append(
      "default_trace_file",
      defaultTraceFile,
      uploadedJson.fileName || "default_trace.json",
    );
  } else {
    // For performance evaluation - only need trace file
    const traceFile = new Blob([JSON.stringify(selectedTrace)], {
      type: "application/json",
    });
    formData.append("trace_file", traceFile, "trace.json");
    formData.append("selected_variables", JSON.stringify(selectedItems));
  }

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `HTTP error! status: ${response.status}, message: ${errorText}`,
    );
  }

  const validationResponse: ValidationResponse = await response.json();
  return NextResponse.json(validationResponse);
}

async function handleEvaluation(data: {
  evaluationType: string;
  sessionId: string;
}) {
  const { evaluationType, sessionId } = data;

  // Determine the API endpoint based on evaluation type
  const isQualityEval = evaluationType === "autox-agent-quality";
  const endpoint = isQualityEval
    ? "http://10.0.0.141:8000/evaluate-quality"
    : "http://10.0.0.141:8000/evaluate-performance";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: sessionId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `HTTP error! status: ${response.status}, message: ${errorText}`,
    );
  }

  const evaluationResult: EvaluationResult = await response.json();
  return NextResponse.json(evaluationResult);
}
