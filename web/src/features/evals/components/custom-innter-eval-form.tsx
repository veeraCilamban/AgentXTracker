import { useState, useEffect } from "react";
import { api } from "@/src/utils/api";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Textarea } from "@/src/components/ui/textarea";
import { Label } from "@/src/components/ui/label";
import { Badge } from "@/src/components/ui/badge";
import { X, Check, FileText } from "lucide-react";
import { TracesTable } from "./custom-trace-table";

interface AutoXEvalFormProps {
  projectId: string;
  id?: string;
}

type UploadedJson = (Record<string, unknown> & { fileName?: string }) | null;
type EvaluationResult = Record<string, unknown> | string | null;

type Trace = {
  id: string;
  timestamp: string;
  input: string;
  output: string;
  [key: string]: any;
};

type DropdownItem = {
  category: string;
  options: string[];
};

type ValidationResponse = {
  session_id: string;
  filled_prompt_preview: string;
  message: string;
};

export const AutoXEvalForm = ({ projectId, id }: AutoXEvalFormProps) => {
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [uploadedJson, setUploadedJson] = useState<UploadedJson>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<EvaluationResult>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationData, setValidationData] = useState<ValidationResponse | null>(null);

  const dropdownOptions: Record<string, DropdownItem> = {
    "autox-agent-quality": {
      category: "Agent Quality",
      options: ["input", "output", "current_trace", "default_trace"],
    },
    "autox-agent-performance": {
      category: "Agent Performance", 
      options: ["input", "output", "current_trace"],
    },
  };

  const currentDropdown = id ? dropdownOptions[id] : null;

  // Get basic traces list with IDs only
  const tracesQuery = api.traces.all.useQuery(
    {
      projectId,
      filter: [],
      searchQuery: null,
      searchType: ["id", "content"] as ("id" | "content")[],
      page: 0,
      limit: 50,
      orderBy: {
        column: "timestamp",
        order: "DESC" as "ASC" | "DESC",
      },
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  // Extract trace IDs
  const traceIds = tracesQuery.data?.traces?.map(trace => trace.id) || [];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result as string) as Record<
          string,
          unknown
        >;
        setUploadedJson({
          ...content,
          fileName: file.name,
        });
      } catch (error) {
        console.error("Invalid JSON file");
        setError("The uploaded file is not valid JSON");
      }
    };
    reader.readAsText(file);
  };

  const handleTraceSelection = (trace: Trace) => {
    setSelectedTrace(trace);
  };

  const handleItemSelect = (value: string) => {
    if (!selectedItems.includes(value)) {
      setSelectedItems([...selectedItems, value]);
    }
  };

  const handleItemRemove = (itemToRemove: string) => {
    setSelectedItems(selectedItems.filter((item) => item !== itemToRemove));
  };

  const validateEvaluation = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt for the evaluation");
      return;
    }

    if (!selectedTrace) {
      setError("Please select a trace to evaluate");
      return;
    }

    if (selectedItems?.length === 0) {
      setError("Please select at least one item to evaluate");
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const formData = new FormData();

      // Determine the API endpoint based on evaluation type
      const isQualityEval = id === "autox-agent-quality";
      const endpoint = isQualityEval 
        ? "http://10.0.0.141:8000/process_and_preview_quality"
        : "http://10.0.0.141:8000/process_and_preview_performance";

      // Add prompt template
      formData.append("prompt_template", prompt);

      // Add selected variables
      formData.append("selected_vars", JSON.stringify(selectedItems));

      if (isQualityEval) {
        // For quality evaluation - need both current and default trace
        if (!uploadedJson) {
          setError("Please upload a default trace file for quality evaluation");
          return;
        }

        // Create current trace file
        const currentTraceFile = new Blob([JSON.stringify(selectedTrace)], {
          type: "application/json",
        });
        formData.append("current_trace_file", currentTraceFile, "current_trace.json");

        // Create default trace file from uploaded JSON
        const defaultTraceFile = new Blob([JSON.stringify(uploadedJson)], {
          type: "application/json",
        });
        formData.append("default_trace_file", defaultTraceFile, uploadedJson.fileName || "default_trace.json");
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
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const validationResponse = (await response.json()) as ValidationResponse;
      setValidationData(validationResponse);
      setPrompt(validationResponse.filled_prompt_preview);
    } catch (err) {
      console.error("Validation failed:", err);
      setError(`There was an error validating the evaluation: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsValidating(false);
    }
  };

  const executeEvaluation = async () => {
    if (!validationData) {
      setError("Please validate first before executing");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Determine the API endpoint based on evaluation type
      const isQualityEval = id === "autox-agent-quality";
      const endpoint = isQualityEval 
        ? "http://10.0.0.141:8000/evaluate_quality"
        : "http://10.0.0.141:8000/evaluate_performance";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: validationData.session_id,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const evaluationResult = (await response.json()) as EvaluationResult;
      setResult(evaluationResult);
    } catch (err) {
      console.error("Evaluation failed:", err);
      setError(`There was an error executing the evaluation: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="">
      {/* 1. Upload Golden Traces Button */}
      {id === "autox-agent-quality" && (
        <div className="mt-5 flex flex-col items-start gap-2">
          <Button variant="outline" asChild>
            <label className="flex cursor-pointer items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="text-primary">Upload Default Trace</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </Button>
          {uploadedJson && (
            <div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm">
              <Check className="h-4 w-4 text-primary" />
              <div className="flex flex-col">
                <span className="font-medium">Default trace uploaded</span>
                <span className="text-muted-foreground">
                  {uploadedJson.fileName || "default_trace.json"}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Available Traces Table */}
      <div className="mt-5">
        <span className="text-sm font-medium leading-none">
          Preview sample matched traces
        </span>
        <p className="text-sm text-muted-foreground">
          Sample over the last 24 hours that match these filters
        </p>
        
        {/* Conditional rendering - only render TracesTable if we have trace IDs */}
        {tracesQuery.isLoading ? (
          <div className="mt-1 rounded-md border p-8 text-center">
            Loading traces...
          </div>
        ) : tracesQuery.error ? (
          <div className="mt-1 rounded-md border p-8 text-center text-destructive">
            Error: Failed to load traces
          </div>
        ) : traceIds.length === 0 ? (
          <div className="mt-1 rounded-md border p-8 text-center">
            No traces found
          </div>
        ) : (
          <TracesTable
            traceIds={traceIds}
            projectId={projectId}
            selectedTrace={selectedTrace}
            onTraceSelect={handleTraceSelection}
          />
        )}
      </div>

      {/* 3. Action Row */}
      <div className="mt-5">
        <div className="flex flex-row justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {currentDropdown && (
              <Select onValueChange={handleItemSelect}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Variable Prompts" />
                </SelectTrigger>
                <SelectContent>
                  {currentDropdown.options.map((item) => (
                    <SelectItem
                      key={item}
                      value={item}
                      className="text-primary"
                      disabled={selectedItems.includes(item)}
                    >
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex flex-1 flex-wrap items-center gap-2">
              {selectedItems.map((item) => (
                <Badge
                  key={item}
                  variant="outline"
                  className="flex items-center gap-1 pr-1"
                >
                  <span className="text-sm">{item}</span>
                  <button
                    onClick={() => handleItemRemove(item)}
                    className="rounded-full p-0.5 hover:bg-accent"
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-row gap-4">
            <Button
              onClick={validateEvaluation}
              disabled={isValidating}
              variant="outline"
            >
              {isValidating ? "Processing..." : "Process & Preview"}
            </Button>
            <Button
              onClick={executeEvaluation}
              disabled={isLoading || !validationData}
            >
              {isLoading ? "Evaluating..." : "Evaluate"}
            </Button>
          </div>
        </div>
      </div>

      {/* 4. Prompt Textbox */}
      <div className="mt-5">
        <Label htmlFor="prompt-input">
          {validationData ? "Filled Prompt Preview" : "Evaluation Prompt Template"}
        </Label>
        <Textarea
          id="prompt-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your evaluation prompt template..."
          rows={6}
          className="mt-2"
          readOnly={!!validationData}
        />
      </div>

      {/* 5. Validation Message */}
      {validationData && (
        <Card className="mt-5">
          <div className="p-4">
            <Label>Processing Status</Label>
            <div className="mt-2 text-sm text-green-600">
              {validationData.message}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Session ID: {validationData.session_id}
            </div>
          </div>
        </Card>
      )}

      {/* 6. Results Textbox */}
      {result && (
        <Card className="mt-5">
          <div className="p-4">
            <Label>Evaluation Results</Label>
            <Textarea
              readOnly
              value={
                typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2)
              }
              rows={10}
              className="mt-2 font-mono text-sm"
            />
          </div>
        </Card>
      )}

      {/* Error display */}
      {error && (
        <div className="mt-4 rounded-md bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}
    </div>
  );
};
